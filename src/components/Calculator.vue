<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { calculate, percentage, type Operator } from '../lib/calculator';
import { parseExpression } from '../lib/expression';
import { useHistory } from '../composables/useHistory';

// The component emits an event whenever a result is computed, so a parent
// app / test harness can observe calculation outcomes.
const emit = defineEmits<{
  (e: 'result-calculated', value: string): void;
}>();

// Two modes:
//  - 'legacy': the two-step state machine (a -> op -> b -> =), unchanged.
//  - 'expression': free-form entry of a full expression string, evaluated
//    by the shunting-yard parser when '=' is pressed. Pressing "( )" flips to
//    expression mode; AC returns to legacy mode.
type Mode = 'legacy' | 'expression';

// --- reactive state (mirrors the legacy index.html behaviour) ---
const displayValue = ref('0');
const firstOperand = ref<number | null>(null);
const operator = ref<Operator | null>(null);
const waitingForSecondOperand = ref(false);
const hasError = ref(false);
const mode = ref<Mode>('legacy');
// Set after '=' so the next digit starts a fresh calc instead of appending
// to the result string (the two-step legacy chain keeps going via the op).
const justEvaluated = ref(false);

// --- calculation history (UI-only; see src/composables/useHistory.ts) ---
const { entries: historyEntries, record: recordHistory, clear: clearHistory } =
  useHistory();
// The history panel is hidden by default and toggled by its button.
const historyVisible = ref(false);

function toggleHistory() {
  historyVisible.value = !historyVisible.value;
}

/**
 * Clicking a history entry loads its RESULT into the display and starts a
 * fresh calc — exactly the effect of a just-pressed '=': the next digit
 * replaces the display instead of appending. We also return to legacy mode so
 * the two-step chain behaves like a normal post-equal state.
 */
function loadHistoryEntry(entry: string) {
  const result = entry.split('=')[entry.split('=').length - 1].trim();
  displayValue.value = result;
  firstOperand.value = null;
  operator.value = null;
  waitingForSecondOperand.value = false;
  hasError.value = false;
  justEvaluated.value = true;
  mode.value = 'legacy';
}

function handleNumber(num: string) {
  if (mode.value === 'expression') {
    displayValue.value += num;
    return;
  }
  if (hasError.value) {
    displayValue.value = num;
    hasError.value = false;
    return;
  }
  if (displayValue.value === '0' || waitingForSecondOperand.value || justEvaluated.value) {
    displayValue.value = num;
    waitingForSecondOperand.value = false;
    justEvaluated.value = false;
  } else {
    displayValue.value += num;
  }
}

function handleDecimal() {
  if (mode.value === 'expression') {
    displayValue.value += '.';
    return;
  }
  if (hasError.value) {
    displayValue.value = '0.';
    hasError.value = false;
    return;
  }
  if (!displayValue.value.includes('.')) {
    displayValue.value += '.';
  }
}

function handleBackspace() {
  if (mode.value === 'expression') {
    displayValue.value = displayValue.value.slice(0, -1);
    return;
  }
  if (hasError.value) {
    displayValue.value = '0';
    hasError.value = false;
    return;
  }
  if (displayValue.value.length > 1) {
    displayValue.value = displayValue.value.slice(0, -1);
    if (displayValue.value === '-') {
      displayValue.value = '0';
    }
  } else {
    displayValue.value = '0';
  }
}

function handlePercentage() {
  if (hasError.value) {
    displayValue.value = '0';
    hasError.value = false;
    return;
  }
  displayValue.value = percentage(parseFloat(displayValue.value)).toString();
}

/**
 * "±" sign toggle. Flips the sign of the currently-displayed value, matching
 * the iOS calculator. A no-op when the display is '0' (so we never render
 * '-0') or 'Error' (where parseFloat would otherwise yield NaN).
 *
 * In expression mode we only toggle when the whole display is a bare number
 * (optionally already signed); a partial expression like "5+3-" is ambiguous
 * so we leave it untouched.
 */
function handleNegate() {
  if (hasError.value) return; // 'Error' stays 'Error'
  if (displayValue.value === '0') return; // 0 -> 0 is a no-op

  if (mode.value === 'expression') {
    const s = displayValue.value;
    if (/^[-+]?\d+(\.\d+)?$/.test(s)) {
      displayValue.value = s.startsWith('-') ? s.slice(1) : `-${s}`;
    }
    return;
  }

  displayValue.value = String(-parseFloat(displayValue.value));
}

function handleOp(op: Operator) {
  // In expression mode operators just append to the expression string,
  // letting the parser resolve precedence at '='.
  if (mode.value === 'expression') {
    displayValue.value += op;
    justEvaluated.value = false;
    return;
  }
  if (hasError.value) return;
  // Chaining after '=': the displayed result becomes the firstOperand.
  firstOperand.value = parseFloat(displayValue.value);
  operator.value = op;
  waitingForSecondOperand.value = true;
  justEvaluated.value = false;
}

/**
 * Smart parenthesis button ("( )"). Appends ')' when there is an unmatched
 * '(' to close, otherwise '"(''. A digit at the end cannot open a new group
 * (that would be malformed `5(...)`), so in that case we leave the display
 * untouched. First use flips the calculator into expression mode, so the
 * shunting-yard parser takes over precedence at '='.
 */
function handleSmartParen() {
  if (hasError.value) return;
  if (mode.value === 'legacy') mode.value = 'expression';

  const s = displayValue.value;
  if (s === '0' || s === '') {
    displayValue.value = '(';
    return;
  }

  // A digit or a closing paren at the end can only be *closed*.
  if (/[0-9.)]$/.test(s)) {
    const opens = s.split('(').length - 1;
    const closes = s.split(')').length - 1;
    if (opens > closes) {
      displayValue.value = s + ')';
    }
    return; // a bare number end can't open a new group
  }

  // Ends in an operator or an opening paren: open another group.
  displayValue.value = s + '(';
}

function calculateExpression() {
  if (hasError.value) return;

  if (mode.value === 'expression') {
    const expression = displayValue.value;
    const result = parseExpression(expression);
    if (result === 'Error') {
      displayValue.value = 'Error';
      hasError.value = true;
      emit('result-calculated', displayValue.value);
      return;
    }
    displayValue.value = String(Math.round((result + Number.EPSILON) * 1e12) / 1e12);
    // Record the expression line, e.g. "2+3*4 = 14", in expression mode.
    recordHistory(`${expression} = ${displayValue.value}`);
    mode.value = 'legacy';
    firstOperand.value = null;
    operator.value = null;
    waitingForSecondOperand.value = false;
    justEvaluated.value = true;
    emit('result-calculated', displayValue.value);
    return;
  }

  if (operator.value === null || firstOperand.value === null) return;

  const secondOperand = parseFloat(displayValue.value);
  const result = calculate(firstOperand.value, secondOperand, operator.value);

  if (result === 'Error') {
    displayValue.value = 'Error';
    hasError.value = true;
    firstOperand.value = null;
    operator.value = null;
    emit('result-calculated', displayValue.value);
    return;
  }

  // Trim float noise so 0.1 + 0.2 renders "0.3", not "0.30000000000000004".
  displayValue.value = String(Math.round((result + Number.EPSILON) * 1e12) / 1e12);
  // Record the legacy line, e.g. "5 + 3 = 8", BEFORE resetting the operands.
  recordHistory(
    `${firstOperand.value} ${operator.value} ${secondOperand} = ${displayValue.value}`,
  );
  firstOperand.value = null;
  operator.value = null;
  waitingForSecondOperand.value = false;
  justEvaluated.value = true;
  emit('result-calculated', displayValue.value);
}

function reset() {
  displayValue.value = '0';
  firstOperand.value = null;
  operator.value = null;
  waitingForSecondOperand.value = false;
  hasError.value = false;
  justEvaluated.value = false;
  mode.value = 'legacy';
}

// --- physical keyboard support (best-effort, not part of the e2e suite) ---
function onKey(ev: KeyboardEvent) {
  const { key } = ev;
  if (key >= '0' && key <= '9') handleNumber(key);
  else if (key === '.') handleDecimal();
  else if (key === '+') handleOp('+');
  else if (key === '-') handleOp('-');
  else if (key === '*') handleOp('*');
  else if (key === '/') {
    ev.preventDefault();
    handleOp('/');
  } else if (key === '%') handlePercentage();
  else if (key === '(' || key === ')') handleSmartParen();
  else if (key === 'Enter' || key === '=') {
    ev.preventDefault();
    calculateExpression();
  } else if (key === 'Backspace') handleBackspace();
  else if (key === 'Escape') reset();
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="calculator-container">
    <div class="calculator" data-testid="calculator">
      <div class="display" data-testid="display">{{ displayValue }}</div>
      <div class="buttons">
        <!-- Row 1 -->
        <button
          class="btn ac"
          data-test="ac"
          data-label="AC"
          @click="reset"
        >AC</button>
        <button
          class="btn op"
          data-test="negate"
          data-label="±"
          @click="handleNegate()"
        >±</button>
        <button
          class="btn op"
          data-test="paren"
          data-paren="1"
          data-label="( )"
          @click="handleSmartParen()"
        >( )</button>
        <button
          class="btn op"
          data-test="op"
          data-label="%"
          @click="handlePercentage()"
        >%</button>
        <button
          class="btn op"
          data-test="op"
          data-label="/"
          @click="handleOp('/')"
        >÷</button>

        <!-- Row 2 -->
        <button class="btn num" data-test="num" data-label="7" @click="handleNumber('7')">7</button>
        <button class="btn num" data-test="num" data-label="8" @click="handleNumber('8')">8</button>
        <button class="btn num" data-test="num" data-label="9" @click="handleNumber('9')">9</button>
        <button class="btn op" data-test="op" data-label="*" @click="handleOp('*')">×</button>

        <!-- Row 3 -->
        <button class="btn num" data-test="num" data-label="4" @click="handleNumber('4')">4</button>
        <button class="btn num" data-test="num" data-label="5" @click="handleNumber('5')">5</button>
        <button class="btn num" data-test="num" data-label="6" @click="handleNumber('6')">6</button>
        <button class="btn op" data-test="op" data-label="-" @click="handleOp('-')">−</button>

        <!-- Row 4 -->
        <button class="btn num" data-test="num" data-label="1" @click="handleNumber('1')">1</button>
        <button class="btn num" data-test="num" data-label="2" @click="handleNumber('2')">2</button>
        <button class="btn num" data-test="num" data-label="3" @click="handleNumber('3')">3</button>
        <button class="btn op" data-test="op" data-label="+" @click="handleOp('+')">+</button>

        <!-- Row 5 -->
        <button class="btn num" data-test="num" data-label="0" @click="handleNumber('0')">0</button>
        <button class="btn num" data-test="decimal" data-label="." @click="handleDecimal()">.</button>
        <button
          class="btn"
          data-test="backspace"
          data-label="backspace"
          @click="handleBackspace()"
        >⌫</button>
        <button
          class="btn eq"
          data-test="equals"
          data-label="="
          @click="calculateExpression()"
        >=</button>
      </div>

      <!-- Calculation history: a collapsible overlay list. The toggle shows/hides
           the panel; each recorded entry is clickable to reload its result. -->
      <button
        class="btn history-toggle"
        data-test="history-toggle"
        data-label="history"
        @click="toggleHistory()"
      >
        歷史
      </button>

      <div
        class="history-panel"
        data-test="history-panel"
        v-show="historyVisible"
      >
        <div class="history-head">
          <span class="history-title">計算歷史</span>
          <button
            class="history-clear"
            data-test="history-clear"
            data-label="clear-history"
            @click="clearHistory()"
          >
            清除
          </button>
        </div>
        <ul class="history-list" data-testid="history-list">
          <li
            v-for="(entry, i) in historyEntries"
            :key="i"
            class="history-item"
            :data-test="'history-entry'"
            @click="loadHistoryEntry(entry)"
          >
            {{ entry }}
          </li>
        </ul>
        <div v-if="historyEntries.length === 0" class="history-empty">尚無紀錄</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calculator-container {
  position: relative;
  z-index: 1;
}

.calculator {
  position: relative;
  z-index: 10;
  width: 340px;
  padding: 12px;
  background: transparent;
}

/* Display */
.display {
  background: transparent;
  color: #fff;
  padding: 0 14px 18px 14px;
  text-align: right;
  font-size: 3.4rem;
  font-weight: 300;
  letter-spacing: 0.02em;
  min-height: 90px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  overflow: hidden;
}

/* Layout: 4 columns x 5 rows, all round buttons the same size. */
.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

button {
  aspect-ratio: 1;
  border-radius: 50%;
  font-size: 1.6rem;
  border: none;
  background: #333333;
  color: #fff;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: filter 0.12s ease, transform 0.06s ease;
}

button:hover {
  filter: brightness(1.25);
}

button:active {
  transform: scale(0.94);
}

/* operators + AC: sage accent with dark text */
button.op,
button.ac {
  background: #b5c19e;
  color: #16161a;
  font-weight: 500;
}

/* equals: cream */
button.eq {
  background: #f4efdc;
  color: #16161a;
  font-weight: 600;
}

button[data-label="( )"] {
  font-size: 1.35rem;
}

/* --- History panel (collapsible overlay, iOS-style accents) --- */
.history-toggle {
  position: absolute;
  top: 8px;
  left: 8px;
  width: auto;
  aspect-ratio: auto;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 0.8rem;
  background: rgba(181, 193, 158, 0.18);
  color: #b5c19e;
  border: 1px solid rgba(181, 193, 158, 0.35);
}

.history-panel {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  max-height: 60%;
  overflow-y: auto;
  margin: 0 8px;
  padding: 12px 14px;
  background: rgba(22, 22, 26, 0.96);
  border: 1px solid rgba(181, 193, 158, 0.25);
  border-radius: 14px;
  backdrop-filter: blur(8px);
  color: #f4efdc;
  font-size: 0.95rem;
  z-index: 20;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.history-title {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: #b5c19e;
}

.history-clear {
  width: auto;
  aspect-ratio: auto;
  border-radius: 999px;
  padding: 2px 12px;
  font-size: 0.75rem;
  background: transparent;
  color: #f4efdc;
  border: 1px solid rgba(244, 239, 220, 0.35);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.history-item {
  padding: 6px 4px;
  border-bottom: 1px solid rgba(244, 239, 220, 0.08);
  cursor: pointer;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.history-item:hover {
  background: rgba(181, 193, 158, 0.12);
  border-radius: 6px;
}

.history-empty {
  padding: 8px 4px;
  color: rgba(244, 239, 220, 0.5);
  text-align: center;
  font-size: 0.85rem;
}
</style>
