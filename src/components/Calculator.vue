<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { calculate, percentage, type Operator } from '../lib/calculator';
import { parseExpression } from '../lib/expression';

// The component emits an event whenever a result is computed, so a parent
// app / test harness can observe calculation outcomes.
const emit = defineEmits<{
  (e: 'result-calculated', value: string): void;
}>();

// Two modes:
//  - 'legacy': the two-step state machine (a -> op -> b -> =), unchanged.
//  - 'expression': free-form entry of a full expression string, evaluated
//    by the shunting-yard parser when '=' is pressed. Entering '(' flips to
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
    if (displayValue.value === '') {
      displayValue.value = '';
    }
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

function handleParen() {
  // Opening paren. When building an expression, just append another '(' so
  // nested expressions like (1+2)*(3+4) work. When entering from legacy mode,
  // start a fresh expression string instead of appending to a stale "0".
  if (mode.value === 'expression' && !hasError.value) {
    displayValue.value += '(';
    return;
  }
  displayValue.value = '(';
  hasError.value = false;
  mode.value = 'expression';
}

function handleParenClose() {
  // A closing paren only applies while building an expression.
  if (mode.value === 'expression' && !hasError.value) {
    displayValue.value += ')';
  }
}

function calculateExpression() {
  if (hasError.value) return;

  if (mode.value === 'expression') {
    const result = parseExpression(displayValue.value);
    if (result === 'Error') {
      displayValue.value = 'Error';
      hasError.value = true;
      emit('result-calculated', displayValue.value);
      return;
    }
    displayValue.value = String(Math.round((result + Number.EPSILON) * 1e12) / 1e12);
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
  else if (key === '(') handleParen();
  else if (key === ')') handleParenClose();
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
    <div class="glow"></div>
    <div class="calculator" data-testid="calculator">
      <div class="display" data-testid="display">{{ displayValue }}</div>
      <div class="buttons">
        <!-- Row 1: utilities + parentheses -->
        <button
          class="ac"
          data-test="ac"
          data-label="AC"
          @click="reset"
        >AC</button>
        <button
          class="operator paren"
          data-test="op"
          data-label="("
          @click="handleParen()"
        >(</button>
        <button
          class="operator paren"
          data-test="op"
          data-label=")"
          @click="handleParenClose()"
        >)</button>
        <button
          class="operator"
          data-test="op"
          data-label="/"
          @click="handleOp('/')"
        >÷</button>

        <!-- Row 2 -->
        <button class="num" data-test="num" data-label="7" @click="handleNumber('7')">7</button>
        <button class="num" data-test="num" data-label="8" @click="handleNumber('8')">8</button>
        <button class="num" data-test="num" data-label="9" @click="handleNumber('9')">9</button>
        <button
          class="operator"
          data-test="op"
          data-label="*"
          @click="handleOp('*')"
        >×</button>

        <!-- Row 3 -->
        <button class="num" data-test="num" data-label="4" @click="handleNumber('4')">4</button>
        <button class="num" data-test="num" data-label="5" @click="handleNumber('5')">5</button>
        <button class="num" data-test="num" data-label="6" @click="handleNumber('6')">6</button>
        <button
          class="operator"
          data-test="op"
          data-label="-"
          @click="handleOp('-')"
        >−</button>

        <!-- Row 4 -->
        <button class="num" data-test="num" data-label="1" @click="handleNumber('1')">1</button>
        <button class="num" data-test="num" data-label="2" @click="handleNumber('2')">2</button>
        <button class="num" data-test="num" data-label="3" @click="handleNumber('3')">3</button>
        <button
          class="operator"
          data-test="op"
          data-label="+"
          @click="handleOp('+')"
        >+</button>

        <!-- Row 5 -->
        <button class="num wide" data-test="num" data-label="0" @click="handleNumber('0')">0</button>
        <button class="num" data-test="decimal" data-label="." @click="handleDecimal()">.</button>
        <button
          class="equals"
          data-test="equals"
          data-label="="
          @click="calculateExpression()"
        >=</button>
        <button
          class="operator"
          data-test="op"
          data-label="%"
          @click="handlePercentage()"
        >%</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --bg-indigo: oklch(45% 0.15 260);
  --bg-purple: oklch(50% 0.18 300);
  --bg-teal: oklch(65% 0.12 180);
  --glass-bg: oklch(98% 0.01 260 / 0.12);
  --glass-border: oklch(100% 0 0 / 0.15);
  --text-main: oklch(98% 0.01 260);
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

.calculator-container {
  position: relative;
  z-index: 1;
}

.calculator {
  position: relative;
  z-index: 10;
  width: 320px;
  padding: 25px;
  background: var(--glass-bg);
  backdrop-filter: blur(30px) saturate(160%);
  -webkit-backdrop-filter: blur(30px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 40px;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.4);
}

.glow {
  position: absolute;
  width: 250px;
  height: 250px;
  background: var(--bg-teal);
  filter: blur(100px);
  border-radius: 50%;
  z-index: 0;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.3;
  pointer-events: none;
}

.display {
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-main);
  padding: 25px;
  text-align: right;
  font-size: 2.8rem;
  font-weight: 300;
  border-radius: 24px;
  margin-bottom: 25px;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: inset 0 2px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

button {
  aspect-ratio: 1;
  font-size: 1.3rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
}

button:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
}

button:active {
  transform: translateY(0) scale(0.95);
}

button.operator {
  background: oklch(85% 0.12 150 / 0.2);
  color: oklch(85% 0.15 150);
  font-weight: 500;
}

button.operator:hover {
  background: oklch(85% 0.15 150 / 0.4);
}

button.operator.paren {
  background: oklch(80% 0.08 260 / 0.18);
  color: oklch(85% 0.1 260);
}

button.operator.paren:hover {
  background: oklch(80% 0.12 260 / 0.35);
}

button.num.wide {
  grid-column: span 1;
}

button.equals {
  background: var(--text-main);
  color: #000;
  font-weight: 700;
}

button.ac {
  background: oklch(60% 0.2 25 / 0.2);
  color: oklch(65% 0.2 25);
}
</style>
