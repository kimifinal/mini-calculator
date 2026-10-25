<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { percentage, type Operator } from '../lib/calculator';
import { parseExpression } from '../lib/expression';
import { useHistory } from '../composables/useHistory';
import { useMemory } from '../composables/useMemory';
import { useTheme } from '../composables/useTheme';

// The component emits an event whenever a result is computed, so a parent
// app / test harness can observe calculation outcomes.
const emit = defineEmits<{
  (e: 'result-calculated', value: string): void;
}>();

// --- Decision 1.B semantics -------------------------------------------------
// The MAIN column always reads the whole running expression (iOS style):
// type 9, then +, then 9 and the main line shows "9+9". A SMALLER second
// column under it shows the live budget/preview result ("18"). Pressing "="
// promotes the result to the main column ("18") and the preview then empties.
//
// A pure-number expression string is the only model the UI now understands:
// `displayValue` IS the expression itself, evaluated by the shunting-yard
// parser (the arithmetic SSOT in src/lib/expression.ts) at "=". No legacy
// two-step machine remains, so the main line can never fall behind the
// expression the user sees.
const displayValue = ref('0');
// After "=" the next digit / decimal starts a fresh expression instead of
// appending to the just-computed result string (iOS behaviour), and loading a
// history entry sets the same flag.
const justEvaluated = ref(false);
// A parser error (e.g. 10 / 0) latches the display to "Error" until cleared.
const hasError = ref(false);

// --- calculation history (UI-only; see src/composables/useHistory.ts) ---
const { entries: historyEntries, record: recordHistory, clear: clearHistory } =
  useHistory();
// The history panel is hidden by default and toggled by its button.
const historyVisible = ref(false);

// --- Theme switch: light -> dark -> system (issue B3 / #39) ----------------
// Pure CSS-variable flip (see useTheme + the App.vue light layers). It never
// touches src/lib/*. The button cycles the 3-state mode, persists it to
// localStorage, and reflects it on <html data-theme>.
const { mode: themeMode, cycle: cycleTheme, ariaLabel: themeAriaLabel } =
  useTheme();

function toggleHistory() {
  historyVisible.value = !historyVisible.value;
}

function closeHistory() {
  historyVisible.value = false;
}

// --- memory keys M+ / M- / MR / MC (UI-only; see src/composables/useMemory.ts) ---
const {
  addMem: addMemory,
  subMem: subMemory,
  recallMem: recallMemory,
  clearMem: clearMemory,
  isFolded,
  toggleFold,
} = useMemory();

/**
 * The numeric value currently on the display. The display is the whole running
 * expression, so M+/M- evaluate it with the SAME SSOT parser (parseExpression)
 * the calculator uses. A bare number or an unevaluated chain both collapse to a
 * single number; a value that cannot evaluate (e.g. "Error" or empty)
 * contributes 0 so a memory op never corrupts the stored value.
 */
function currentNumericValue(): number {
  const v = displayValue.value;
  if (v === 'Error' || v === '') return 0;
  const r = parseExpression(v);
  return typeof r === 'number' ? r : 0;
}

// M+ : mem += current display value. After accumulating, start a fresh number
// (justEvaluated) so "5 M+ 10 M+" reads 5 then 10 (not "510"), mirroring MR.
function handleMemPlus() {
  addMemory(currentNumericValue());
  justEvaluated.value = true;
  hasError.value = false;
}

// M- : mem -= current display value (fresh number next, like M+).
function handleMemMinus() {
  subMemory(currentNumericValue());
  justEvaluated.value = true;
  hasError.value = false;
}

// MR : load the stored memory into the display, exactly like loadHistoryEntry —
// set hasError=false + justEvaluated=true so the NEXT digit starts a fresh
// expression instead of appending to the recalled value.
function handleMemRecall() {
  const n = recallMemory();
  displayValue.value = String(n);
  hasError.value = false;
  justEvaluated.value = true;
}

// MC : clear the memory to 0.
function handleMemClear() {
  clearMemory();
}

/**
 * The live "preview" line under the main expression. While the user is typing
 * an expression that still contains an operator, this shows its computed
 * value (e.g. "9+9" -> "18"). Once "=" promotes the result to the main column
 * the expression reduces to a single number, so the preview naturally
 * empties and the `v-if` hides the line.
 */
const displayPreview = computed(() => {
  const expr = displayValue.value;

  // On an error or right after "=", the preview line clears: the result is now
  // the main display, so a second line would just repeat it.
  if (hasError.value || justEvaluated.value) return '';

  // Trim any dangling trailing operator (e.g. "9+9+" right after a second "+")
  // and evaluate the last *valid* fragment, so the preview stays STICKY instead
  // of vanishing the moment an operator is appended. "9+9+" -> "9+9" -> 18.
  const trimmed = expr.replace(/[+\-*/^]+$/, '');
  // A lone number (or empty) has no budget to show under it.
  if (!/[+\-*/^]/.test(trimmed)) return '';

  try {
    const r = parseExpression(trimmed);
    if (r === 'Error' || typeof r !== 'number') return '';
    // Guard against absurd-length intermediate results.
    if (!Number.isFinite(r) || Math.abs(r) > 9.999e15) return '';
    // Trim floating-point noise (0.1 + 0.2 -> 0.3, not 0.30000000000000004).
    const rounded = Math.round((r + Number.EPSILON) * 1e12) / 1e12;
    return String(rounded);
  } catch {
    return '';
  }
});

/**
 * Tapping a history line loads its RESULT into the display and starts a
 * fresh calc — exactly the effect of a just-pressed "=": the next digit
 * replaces the display instead of appending. We also collapse the panel back
 * to the keyboard (iOS behaviour).
 */
function loadHistoryEntry(entry: string) {
  const parts = entry.split('=');
  const result = parts[parts.length - 1].trim();
  displayValue.value = result;
  hasError.value = false;
  justEvaluated.value = true;
  // iOS behaviour: after picking a result the panel slides away and the
  // keyboard returns so the user can immediately continue.
  closeHistory();
}

// The trailing operand being typed: everything after the last operator or
// parenthesis. Used to decide whether another decimal point is allowed in the
// *current* number, so "1.5+2." is valid but "1.5.5" is not.
function currentOperand(): string {
  const s = displayValue.value;
  let start = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if ('+-*/()'.includes(s[i])) {
      start = i + 1;
      break;
    }
  }
  return s.slice(start);
}

function handleNumber(num: string) {
  if (hasError.value) {
    displayValue.value = num;
    hasError.value = false;
    justEvaluated.value = false;
    return;
  }
  if (justEvaluated.value) {
    // Start a fresh expression instead of appending to the old result.
    displayValue.value = num;
    justEvaluated.value = false;
    return;
  }
  if (displayValue.value === '0') {
    displayValue.value = num;
    return;
  }
  displayValue.value += num;
}

function handleDecimal() {
  if (hasError.value) {
    displayValue.value = '0.';
    hasError.value = false;
    justEvaluated.value = false;
    return;
  }
  if (justEvaluated.value) {
    displayValue.value = '0.';
    justEvaluated.value = false;
    return;
  }
  // Only one decimal point per *operand* (the check is on the trailing number).
  if (currentOperand().includes('.')) return;
  if (displayValue.value === '') displayValue.value = '0';
  displayValue.value += '.';
}

function handleBackspace() {
  if (hasError.value) {
    displayValue.value = '0';
    hasError.value = false;
    justEvaluated.value = false;
    return;
  }
  justEvaluated.value = false;
  if (displayValue.value.length > 1) {
    const s = displayValue.value.slice(0, -1);
    // Never leave a lone operand sign such as "-".
    displayValue.value = s === '-' ? '0' : s;
  } else {
    displayValue.value = '0';
  }
}

function handlePercentage() {
  if (hasError.value) {
    displayValue.value = '0';
    hasError.value = false;
    justEvaluated.value = false;
    return;
  }
  displayValue.value = percentage(parseFloat(displayValue.value)).toString();
  // A percentage result behaves like a just-computed value.
  justEvaluated.value = true;
}

// --- Science operations (issue #36 / B2) -----------------------------------
// The three unary ops (x² √ 1/x) apply immediately to the CURRENT bare number
// on the display — exactly like '%' — rounding through the same 1e12 guard the
// main '=' path uses, and latching justEvaluated=true so the next digit (and a
// stray '=') behave like a fresh result. A domain error (√ of a negative, 1/x of
// 0) latches the display to 'Error'. xʸ appends the power operator instead.

function handleSquare() {
  if (hasError.value) return;
  const n = parseFloat(displayValue.value) || 0;
  displayValue.value = String(Math.round((n * n + Number.EPSILON) * 1e12) / 1e12);
  justEvaluated.value = true;
  hasError.value = false;
}

function handleSqrtOp() {
  if (hasError.value) return;
  const n = parseFloat(displayValue.value);
  if (Number.isNaN(n)) {
    displayValue.value = '0';
    hasError.value = false;
    justEvaluated.value = false;
    return;
  }
  if (n < 0) {
    displayValue.value = 'Error';
    hasError.value = true;
    return;
  }
  displayValue.value = String(
    Math.round((Math.sqrt(n) + Number.EPSILON) * 1e12) / 1e12,
  );
  justEvaluated.value = true;
  hasError.value = false;
}

function handleReciprocal() {
  if (hasError.value) return;
  const n = parseFloat(displayValue.value);
  if (n === 0 || Number.isNaN(n)) {
    displayValue.value = 'Error';
    hasError.value = true;
    return;
  }
  displayValue.value = String(Math.round((1 / n + Number.EPSILON) * 1e12) / 1e12);
  justEvaluated.value = true;
  hasError.value = false;
}

// xʸ appends the RIGHT-ASSOCIATIVE power operator '^'. It mirrors handleOp,
// replacing a trailing operator so we never get a malformed "5 +^"; otherwise it
// just appends. The shunting-yard parser (src/lib/expression.ts) treats '^' as
// right-associative, so 2^3^2 groups as 2^(3^2) = 512, not (2^3)^2 = 64.
function handlePower() {
  if (hasError.value) return;
  justEvaluated.value = false;
  const s = displayValue.value;
  if (/[+\-*/^]$/.test(s)) {
    displayValue.value = s.slice(0, -1) + '^';
    return;
  }
  displayValue.value = s + '^';
}

/**
 * "±" sign toggle. Flips the sign of the bare number on the display, matching
 * the iOS calculator. A no-op when the display is '0' (so we never render
 * '-0') or 'Error', and for a partial expression like "5+3-" where a sign
 * would be ambiguous.
 */
function handleNegate() {
  if (hasError.value) return; // 'Error' stays 'Error'
  if (displayValue.value === '0') return; // 0 -> 0 is a no-op
  const s = displayValue.value;
  // Only toggle when the whole display is a bare (optionally signed) number.
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    displayValue.value = s.startsWith('-') ? s.slice(1) : `-${s}`;
  }
}

function handleOp(op: Operator) {
  if (hasError.value) return;
  justEvaluated.value = false;
  const s = displayValue.value;
  // Replace a trailing operator with the new one (5 + -> 5 -) so we never get
  // a malformed "5 +-".
  if (/[+\-*/]$/.test(s)) {
    displayValue.value = s.slice(0, -1) + op;
    return;
  }
  displayValue.value = s + op;
}

/**
 * Smart parenthesis button ("( )"). Appends ")" when there is an unmatched
 * "(" to close, otherwise "(". A digit at the end cannot open a new group
 * (that would be the malformed "5(...)"), so in that case we leave the
 * display untouched. Parenthesised expressions are evaluated with the same
 * shunting-yard parser as everything else.
 */
function handleSmartParen() {
  if (hasError.value) return;
  const s = displayValue.value;
  if (s === '0' || s === '') {
    displayValue.value = '(';
    justEvaluated.value = false;
    return;
  }

  // A digit or a closing paren at the end can only *close* a group.
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
  justEvaluated.value = false;
}

/**
 * Render a history line from an expression string and its rounded result.
 * Parenthesised / multi-token expressions are recorded verbatim
 * ("(2+3*4) = 14"); plain binary operator chains get spaces around each
 * operator so they read like the legacy two-step recording ("5 + 3 = 8").
 */
function formatHistoryLine(expression: string, result: string): string {
  if (/[()]/.test(expression)) {
    return `${expression} = ${result}`;
  }
  const spaced = expression.replace(/([+\-*/])/g, ' $1 ');
  return `${spaced} = ${result}`;
}

/**
 * "=" — evaluate the whole expression string on the main column. The result is
 * promoted to the main display (the preview line then empties itself, which is
 * the 1.B "result up, preview clears" effect), and a history line is recorded.
 * Division by zero / parser errors show "Error" without writing history.
 */
function calculateExpression() {
  if (hasError.value) return;

  const expression = displayValue.value;
  // A bare number has nothing to evaluate; leave it on the display. A dangling
  // paren such as "(3" has no binary operator but is still malformed, so it is
  // parsed and reported as "Error" like the original parser did.
  if (!/[+\-*/^()]/.test(expression)) {
    justEvaluated.value = true;
    return;
  }

  let result: number | 'Error';
  try {
    result = parseExpression(expression);
  } catch {
    result = 'Error';
  }

  if (result === 'Error') {
    displayValue.value = 'Error';
    hasError.value = true;
    emit('result-calculated', displayValue.value);
    return;
  }

  // Trim float noise so 0.1 + 0.2 renders "0.3", not "0.30000000000000004".
  const rounded = String(Math.round((result + Number.EPSILON) * 1e12) / 1e12);
  // Record a human-friendly line (see formatHistoryLine) BEFORE promoting.
  recordHistory(formatHistoryLine(expression, rounded));
  // Promote the result to the main column; the preview then empties itself.
  displayValue.value = rounded;
  justEvaluated.value = true;
  emit('result-calculated', rounded);
}

function reset() {
  displayValue.value = '0';
  hasError.value = false;
  justEvaluated.value = false;
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
  else if (key === '^') handlePower();
  else if (key === '(' || key === ')') handleSmartParen();
  else if (key === 'Enter' || key === '=') {
    ev.preventDefault();
    calculateExpression();
  } else if (key === 'Backspace') handleBackspace();
  else if (key === 'Escape') reset();
}

// --- Copy-to-clipboard via LONG-PRESS on the main display ------------------
// Entry point is a long press on the main display div ONLY. We add no new key
// to the 5x4 keypad, no changes to '=', operators, ±, parentheses or history —
// the ONLY code added for this feature is below plus the display div's
// @pointer* wiring in the template. The arithmetic modules (src/lib/*) are
// never touched.
//
// copyTimer: the pending long-press (setTimeout) handle.
let copyTimer: ReturnType<typeof setTimeout> | undefined;
// copiedFlashTimer: hides the "已複製" feedback once its window elapses.
let copiedFlashTimer: ReturnType<typeof setTimeout> | undefined;
// The preview line shows this text while a copy just succeeded; otherwise the
// preview keeps rendering its live budget/preview (displayPreview) unchanged.
const copiedFlash = ref('');
// A copy that just succeeded, kept in sync with the display flash class.
const justCopied = ref(false);

function clearLongPress() {
  if (copyTimer !== undefined) {
    clearTimeout(copyTimer);
    copyTimer = undefined;
  }
}

/**
 * Copy whatever the MAIN display currently shows. The main line reads the
 * whole running expression and, after "=", the promoted result (the preview
 * budget then empties), so this IS the just-computed value — e.g. compute
 * 5+3=8, long-press, and "8" goes to the clipboard. Pure "Error" and an empty
 * string are skipped; a genuine "0" is copyable. Uses
 * navigator.clipboard.writeText with a silent failure so a denied/unavailable
 * clipboard never crashes the app. The "已複製" feedback is shown as an ASYNCHRONOUS
 * ref flip (in writeText's .then) so real Playwright/Chromium timers — which
 * fire on their own macrotask cycle, not interleaved with the test thread —
 * actually register the flash.
 */
function copyValue() {
  const v = displayValue.value;
  if (v === '' || v === 'Error') return;
  try {
    navigator.clipboard
      ?.writeText(v)
      ?.then(() => {
        justCopied.value = true;
        copiedFlash.value = '已複製';
        if (copiedFlashTimer !== undefined) clearTimeout(copiedFlashTimer);
        copiedFlashTimer = setTimeout(() => {
          copiedFlash.value = '';
          justCopied.value = false;
          copiedFlashTimer = undefined;
        }, 1200);
      })
      .catch(() => {
        /* clipboard write failed (denied/unavailable): silently ignore */
      });
  } catch {
    /* clipboard API not available (e.g. jsdom): no crash, no flash */
  }
}

/**
 * The long-press gesture. A SHORT tap/click must NOT copy: we start a 400ms
 * timer on pointerdown and only fire copyValue when it elapses. Releasing early
 * (pointerup/pointerleave/pointercancel) clears the timer, so a quick tap —
 * which never reaches 400ms — copies nothing. @contextmenu.prevent stops the
 * native menu; a plain click is left unwired (a natural no-op).
 */
function onDisplayPointerDown() {
  clearLongPress();
  copyTimer = setTimeout(copyValue, 400);
}

/**
 * Keyboard-accessible copy. The long-press gesture (#25) has no keyboard path,
 * so Enter / Space while the DISPLAY is focused copies its current value,
 * mirroring the pointer gesture and the existing "已複製" feedback.
 * preventDefault + stopPropagation stop the window-level "=" (Enter) handler in
 * onKey from ALSO evaluating a FOCUSED display; a NON-focused Enter (on the
 * body) still calculates via onKey exactly as before. Reuses copyValue().
 */
function onDisplayKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    ev.stopPropagation();
    copyValue();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  clearLongPress();
  if (copiedFlashTimer !== undefined) clearTimeout(copiedFlashTimer);
});
</script>

<template>
  <div class="calculator-container">
    <div class="calculator" data-testid="calculator">
      <!-- Clock icon toggle, top-left corner (iOS style). -->
      <button
        class="history-toggle"
        data-test="history-toggle"
        data-label="history"
        @click="toggleHistory()"
        :aria-label="historyVisible ? '關閉歷史' : '打開歷史'"
      >
        <svg
          class="history-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      <!--
        Theme toggle, top-right (mirrors the top-left history-toggle). A circular
        icon button cycling light -> dark -> system (B3 / #39). The glyph shows the
        CURRENT mode; the aria-label names the NEXT action (from useTheme). The
        choice is persisted to localStorage('calc-theme-v1') and applied as
        document.documentElement.dataset.theme — a pure CSS-variable flip that does
        not touch src/lib/*.
      -->
      <button
        class="theme-toggle"
        data-testid="theme-toggle"
        data-label="theme"
        @click="cycleTheme()"
        :aria-label="themeAriaLabel"
      >{{ themeMode === 'light' ? '☀' : themeMode === 'dark' ? '☾' : 'A' }}</button>

      <!--
        Copy-success toast: appears top-center of the calculator on a
        successful long-press copy.  Separate from display-preview so it
        does not interfere with the expression preview below.
      -->
      <div
        class="copy-toast"
        data-testid="copy-toast"
        :class="{ 'copy-toast--visible': copiedFlash }"
      >{{ copiedFlash }}</div>

      <!--
        Display: always fixed at the top, never covered. It is ALSO the copy
        entry point: a LONG-press on this div copies its current value to the
        clipboard (400ms threshold). A short tap/click is a no-op. The "flash"
        class (justCopied) briefly highlights the value as copy feedback.
      -->
      <div
        class="display"
        data-testid="display"
        role="status"
        aria-live="polite"
        tabindex="0"
        aria-label="結果, 複製到剪貼簿"
        :class="{ 'display--copied': justCopied }"
        @pointerdown="onDisplayPointerDown"
        @pointerup="clearLongPress()"
        @pointerleave="clearLongPress()"
        @pointercancel="clearLongPress()"
        @contextmenu.prevent
        @keydown="onDisplayKeydown"
      >{{ displayValue }}</div>

      <!--
        The "preview" line: ALWAYS rendered so its space is reserved (no layout
        jump when the budget appears/disappears). It shows the live result under
        the expression (e.g. "18" under "9+9"). The element stays in the DOM
        at all times — only its TEXT switches, so nothing is removed.
      -->
      <div
        class="display-preview"
        data-testid="display-preview"
      >{{ displayPreview }}</div>

      <!--
        Fold toggle (issue #14): a circular, icon-only chevron that expands/collapses
        the memory row. It sits on its OWN row between the preview line and the
        keyboard, left-aligned, so it never disturbs the folded keypad layout.
        Folded is the default; the chevron points DOWN (rotate(0)) when folded and
        rotates 180° (points UP) when expanded. aria-label + aria-expanded follow the
        state; NO hint dot. The state is persisted (see useMemory).
      -->
      <div class="fold-row">
        <button
          class="fold-toggle"
          data-testid="fold-toggle"
          :class="{ 'fold-toggle--open': !isFolded }"
          :aria-label="isFolded ? '展開記憶鍵' : '收合記憶鍵'"
          :aria-expanded="!isFolded"
          @click="toggleFold()"
        >
          <svg
            class="chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <!--
        The "stage" holds the keyboard and the history panel as overlapping
        absolutely-positioned layers of the same size. Opening history slides
        the keyboard down and fades it out while the panel slides up to take
        the same space — the iOS full-takeover feel. The display stays above
        the stage, so it is never obscured.
      -->
      <div class="stage">
        <div
          class="keyboard"
          :class="{ 'keyboard--hidden': historyVisible }"
        >
          <!--
            Memory row (issue #14): a 4-key cluster (M+ / M- / MR / MC) that slides
            in ABOVE the keypad when the fold toggle is open. It lives inside the
            keyboard so it is the same width; when folded it collapses to 0 height
            via max-height, so the folded keypad layout is byte-identical to the
            original. Keys use the MD3 primary-container tokens (purple, distinct
            from the numbered keys).
          -->
          <div
            class="memory-row"
            data-testid="memory-row"
            role="group"
            aria-label="記憶鍵"
            :class="{ 'memory-row--open': !isFolded }"
          >
            <button
              class="btn mem"
              data-test="mem-plus"
              data-label="M+"
              aria-label="加入記憶"
              @click="handleMemPlus()"
            >M+</button>
            <button
              class="btn mem"
              data-test="mem-minus"
              data-label="M-"
              aria-label="從記憶減去"
              @click="handleMemMinus()"
            >M−</button>
            <button
              class="btn mem"
              data-test="mem-recall"
              data-label="MR"
              aria-label="調出記憶"
              @click="handleMemRecall()"
            >MR</button>
            <button
              class="btn mem"
              data-test="mem-clear"
              data-label="MC"
              aria-label="清除記憶"
              @click="handleMemClear()"
            >MC</button>
          </div>

          <!--
            Science row (issue #36 / B2): a permanent 4-key cluster (x² √ 1/x xʸ)
            sitting ABOVE the keypad, same width/grid as the keypad. The three
            unary ops (x² √ 1/x) apply to the current number immediately, like
            '%'; xʸ appends the right-associative power operator '^'.
          -->
          <div
            class="sci-row"
            data-testid="sci-row"
            role="group"
            aria-label="科學運算鍵"
          >
            <button
              class="btn sci"
              data-test="sci-square"
              data-label="x²"
              aria-label="平方"
              @click="handleSquare()"
            >x²</button>
            <button
              class="btn sci"
              data-test="sci-sqrt"
              data-label="√"
              aria-label="平方根"
              @click="handleSqrtOp()"
            >√</button>
            <button
              class="btn sci"
              data-test="sci-recip"
              data-label="1/x"
              aria-label="倒數"
              @click="handleReciprocal()"
            >1/x</button>
            <button
              class="btn sci"
              data-test="sci-power"
              data-label="xʸ"
              aria-label="指數"
              @click="handlePower()"
            >xʸ</button>
          </div>

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
              aria-label="變號"
              @click="handleNegate()"
            >±</button>
            <button
              class="btn op"
              data-test="paren"
              data-paren="1"
              data-label="( )"
              aria-label="開括號"
              @click="handleSmartParen()"
            >( )</button>
            <button
              class="btn op"
              data-test="op"
              data-label="%"
              aria-label="百分比"
              @click="handlePercentage()"
            >%</button>
            <button
              class="btn op"
              data-test="op"
              data-label="/"
              aria-label="除"
              @click="handleOp('/')"
            >÷</button>

            <!-- Row 2 -->
            <button class="btn num" data-test="num" data-label="7" @click="handleNumber('7')">7</button>
            <button class="btn num" data-test="num" data-label="8" @click="handleNumber('8')">8</button>
            <button class="btn num" data-test="num" data-label="9" @click="handleNumber('9')">9</button>
            <button class="btn op" data-test="op" data-label="*" aria-label="乘" @click="handleOp('*')">×</button>

            <!-- Row 3 -->
            <button class="btn num" data-test="num" data-label="4" @click="handleNumber('4')">4</button>
            <button class="btn num" data-test="num" data-label="5" @click="handleNumber('5')">5</button>
            <button class="btn num" data-test="num" data-label="6" @click="handleNumber('6')">6</button>
            <button class="btn op" data-test="op" data-label="-" aria-label="減" @click="handleOp('-')">−</button>

            <!-- Row 4 -->
            <button class="btn num" data-test="num" data-label="1" @click="handleNumber('1')">1</button>
            <button class="btn num" data-test="num" data-label="2" @click="handleNumber('2')">2</button>
            <button class="btn num" data-test="num" data-label="3" @click="handleNumber('3')">3</button>
            <button class="btn op" data-test="op" data-label="+" aria-label="加" @click="handleOp('+')">+</button>

            <!-- Row 5 -->
            <button class="btn num" data-test="num" data-label="0" @click="handleNumber('0')">0</button>
            <button class="btn num" data-test="decimal" data-label="." aria-label="小數點" @click="handleDecimal()">.</button>
            <button
              class="btn"
              data-test="backspace"
              data-label="backspace"
              aria-label="刪除"
              @click="handleBackspace()"
            >⌫</button>
            <button
              class="btn eq"
              data-test="equals"
              data-label="="
              aria-label="等號"
              @click="calculateExpression()"
            >=</button>
          </div>
        </div>

        <!-- History panel: full-takeover overlay that slides up over the
             keyboard. Stays in the DOM (v-show) so existing tests can read
             the list without opening it. -->
        <div
          class="history-panel"
          data-test="history-panel"
          v-show="historyVisible"
          :class="{ 'history-panel--open': historyVisible }"
        >
          <div class="history-head">
            <button
              class="history-chevron"
              data-test="history-close"
              data-label="close-history"
              @click="closeHistory()"
              :aria-label="'收合歷史'"
            >
              ⌃
            </button>
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

          <!-- "目前的運算式" bar: the expression currently on the display. -->
          <div class="current-expr" data-test="current-expression">
            <span class="current-expr-label">目前的運算式</span>
            <span class="current-expr-value">{{ displayValue }}</span>
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
  padding: 16px;
  /* MD3 elevated shell on surface-container-low with a large shadow. */
  background: var(--md-sc-low);
  border-radius: 36px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6),
    0 8px 24px 4px rgba(0, 0, 0, 0.5),
    0 24px 48px 12px rgba(0, 0, 0, 0.45);
}

/* Display */
.display {
  background: transparent;
  color: var(--md-on-surface);
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
  font-variant-numeric: tabular-nums;
  /*
   * Prevent native text selection on mobile touch devices. Without this,
   * a 400+ ms long-press on the display value triggers the browser's built-in
   * text selection (iOS shows "Copy / Share / Search" callout, Android shows
   * the native selection toolbar) which emits pointercancel BEFORE our
   * copyTimer fires — so copyValue() never runs and the custom copy path
   * is silently bypassed. -webkit-touch-callout: none removes the callout
   * and user-select: none prevents text selection on the display.
   */
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Long-press feedback: briefly highlight the value as "copied". The class is
   driven by the justCopied ref and removed after ~1.2s, so the highlight fades. */
.display--copied {
  color: var(--md-primary);
  animation: display-copied 0.4s ease;
}

/*
 * Copy-success toast: top-center overlay of the calculator shell. It rides
 * on the .calculator (position: relative) as an absolute layer above the
 * display. Hidden by default (opacity:0, pointer-events:none) and toggled
 * visible via .copy-toast--visible while copiedFlash is non-empty — this
 * keeps it out of the layout flow so display-preview never jumps.
 */
.copy-toast {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  z-index: 20;
  background: var(--md-primary);
  color: var(--md-on-primary);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 6px 16px;
  border-radius: 999px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.copy-toast--visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@keyframes display-copied {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}

/* Preview line: smaller result under the main expression. */
.display-preview {
  background: transparent;
  color: var(--md-on-surface-variant);
  padding: 0 14px 8px 14px;
  /* Push the sub-line away from the keypad below for breathing room. */
  margin-bottom: 8px;
  text-align: right;
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 0.02em;
  min-height: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* --- Fold toggle (issue #14): icon-only chevron on its own row ----------
 * A circular, secondary (28px — smaller than the 40px history toggle =
 * "secondary") button that expands/collapses the memory row. It rides in a
 * left-aligned row between the preview line and the keyboard. The chevron
 * points DOWN when folded and rotates 180° (points UP) when the row is open,
 * animated with `transition: transform 0.25s ease`. */
.fold-row {
  display: flex;
  justify-content: flex-start;
  min-height: 0;
  /* Breathing room below the chevron, matching the keypad's row gap (10px).
     Without this the toggle sits flush (0px) against whatever is below it — the
     keypad when folded, the memory row when expanded — like the screenshot where
     the chevron hugged the AC key. */
  margin-bottom: 10px;
}

.fold-toggle {
  width: 28px;
  height: 28px;
  aspect-ratio: auto;
  border-radius: 50%;
  padding: 0;
  font-size: 0;
  /* Tonal secondary tint derived from --md-primary (#d0bcff) at low alpha. */
  background: rgba(208, 188, 255, 0.12);
  color: var(--md-primary);
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease;
}

.fold-toggle:hover {
  background: rgba(208, 188, 255, 0.22);
}

.chevron {
  display: block;
  color: var(--md-primary);
  transform: rotate(0deg);
  transition: transform 0.25s ease;
}

/* Expanded state: rotate the chevron 180° (points up). */
.fold-toggle--open .chevron {
  transform: rotate(180deg);
}

/* --- Memory row (issue #14): 4-key cluster that slides in above the keypad ---
 * Collapsed by default (folded => hidden) and slides in via max-height + opacity
 * when `.memory-row--open`. Collapsed => 0 height, so the folded keypad layout
 * is identical to the original. The grid matches the keypad (4 cols, 10px gap). */
.memory-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  /* Hidden when folded. Use `visibility:hidden` (not just opacity:0) so the 4
     folded keys leave the tab order AND assistive tech — opacity:0 buttons stay
     focusable. `visibility` flips AFTER the collapse finishes so the slide-out
     still animates, and back to visible instantly on open. */
  visibility: hidden;
  transition: max-height 0.25s ease, opacity 0.25s ease,
    visibility 0s linear 0.25s;
}

.memory-row--open {
  /* The shell (`.calculator`) is a fixed `width:340px` `padding:16px`, so a square
     `1fr` cell is 70×70 px and a single row of square keys is ~70px tall. The 96px
     ceiling therefore never clips the keys and is not viewport-dependent (the
     keyboard itself is fixed-size, so this is provable, not magic). Bump it only if
     a second row is ever added.
     margin-bottom:10px is the gap to the AC row below — it matches the keypad's
     own row gap so the row reads as one uniform grid. (`.fold-row`'s margin is a
     SEPARATE gap, above the chevron, so the two don't stack.) */
  max-height: 96px;
  opacity: 1;
  margin-bottom: 10px;
  visibility: visible;
  transition: max-height 0.25s ease, opacity 0.25s ease, visibility 0s;
}

/* Memory keys: MD3 primary-container (purple) — distinct from the numbered keys
 * (surface-container-highest) and operators (secondary-container). `.btn.mem`
 * (two classes) out-specifies the bare `button` rule, so this wins cleanly. */
.btn.mem {
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

/* --- Science row (issue #36 / B2): permanent 4-key cluster above the keypad ---
 * Same grid as the keypad (4 cols, 10px gap) and the same 10px margin to the AC
 * row, so it reads as one extra uniform row. The keys ride the MD3 tonal
 * secondary-container with on-secondary-container text — distinct from the
 * numbered keys (surface-container-highest) but in the same visual family as the
 * operator keys. `.btn.sci` (two classes) out-specifies the bare `button` rule. */
.sci-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

button.sci {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-weight: 500;
}

/* Layout: 4 columns x 5 rows, all round buttons the same size. */
.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

button {
  aspect-ratio: 1;
  /* MD3 medium/large corner radius (expressive rounded squares, not full circles). */
  border-radius: 26px;
  font-size: 1.6rem;
  border: none;
  /* Numbers sit on surface-container-highest. */
  background: var(--md-sc-highest);
  color: var(--md-on-surface);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: filter 0.12s ease, transform 0.06s ease, background 0.12s ease;
}

button:hover {
  filter: brightness(1.15);
}

button:active {
  transform: scale(0.94);
}

/* a11y: visible keyboard focus ring (Decision 4). :focus-visible means it shows
   only on keyboard navigation, so the existing mouse/touch visuals are UNCHANGED.
   Uses the existing MD3 --md-primary token; covers the focusable display div and
   every button so keyboard users see where focus is. */
.display:focus-visible,
button:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

/* Operators + AC: tonal secondary-container with on-secondary-container text. */
button.op,
button.ac {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-weight: 500;
}

/* AC (destructive clear): MD3 error-container. */
button.ac {
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

/* equals: filled primary container with on-primary-container text. */
button.eq {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 600;
}

button[data-label="( )"] {
  font-size: 1.35rem;
}

/* --- Clock icon toggle, top-left (MD3 tonal icon button) --- */
.history-toggle {
  position: absolute;
  /* Sit inside the shell padding so it aligns with the display row,
     not jammed in the corner. */
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  aspect-ratio: auto;
  border-radius: 50%;
  padding: 0;
  font-size: 0;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 30;
}

.history-toggle:hover {
  background: var(--md-sc-high);
}

.history-icon {
  display: block;
}

/* --- Theme toggle, top-right (mirror of the top-left .history-toggle) ---
 * A circular MD3 icon button that cycles light -> dark -> system. It reuses the
 * exact tonal look of .history-toggle but rides the shell's top-RIGHT corner so
 * the two toggles sit symmetrically. The glyph (☀ / ☾ / A) reflects the CURRENT
 * mode; the aria-label names the NEXT action (set on the element). */
.theme-toggle {
  position: absolute;
  /* Mirror of .history-toggle's top:16px, but right-aligned in the shell pad. */
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  aspect-ratio: auto;
  border-radius: 50%;
  padding: 0;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 30;
  /* The glyph carries the state icon; reset the keypad's big base font. */
  font-size: 1.1rem;
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease;
}

.theme-toggle:hover {
  background: var(--md-sc-high);
}

/* --- Stage: the keyboard sits in normal flow and defines the stage's height
     (so the shell background always covers all 6 button rows). The history
     panel overlays the same space while hidden/animating. Opening history
     fades the keyboard; the panel slides up on top. Display stays above the
     stage so it is never covered. --- */
.stage {
  position: relative;
  flex: 1;
}

.keyboard {
  /* In-flow (not absolute): the grid's 6 rows drive the stage height, so the
     background covers the `=` row and nothing overflows the shell. */
  position: relative;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.keyboard--hidden {
  transform: translateY(28px);
  opacity: 0;
  pointer-events: none;
}

.history-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  /* MD3 solid tonal surface with elevation (glass removed). */
  background: var(--md-sc-highest);
  border: none;
  border-radius: 28px;
  backdrop-filter: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 6px 16px 4px rgba(0, 0, 0, 0.4);
  color: var(--md-on-surface);
  font-size: 0.95rem;
  z-index: 20;
  /* Slide up + fade in whenever the panel appears (v-show reveals it). */
  animation: panel-in 0.3s ease both;
}

@keyframes panel-in {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.history-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--md-outline-variant);
}

/* Chevron collapse button on the left of the header. */
.history-chevron {
  width: auto;
  height: auto;
  aspect-ratio: auto;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 1.1rem;
  background: transparent;
  color: var(--md-primary);
  border: none;
  cursor: pointer;
}

.history-chevron:hover {
  background: rgba(208, 188, 255, 0.16);
}

.history-title {
  flex: 1;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--md-on-surface-variant);
  text-align: center;
}

.history-clear {
  width: auto;
  aspect-ratio: auto;
  border-radius: 999px;
  padding: 3px 14px;
  font-size: 0.78rem;
  background: var(--md-sc-high);
  color: var(--md-on-surface);
  border: none;
  cursor: pointer;
  font-family: inherit;
}

/* "目前的運算式" bar: shows the expression currently on the display. */
.current-expr {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
  margin-bottom: 6px;
  background: rgba(208, 188, 255, 0.10);
  border-radius: 12px;
}

.current-expr-label {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--md-on-surface-variant);
}

.current-expr-value {
  text-align: right;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  color: var(--md-on-primary-container);
  word-break: break-all;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 7px 4px;
  border-bottom: 1px solid var(--md-outline-variant);
  cursor: pointer;
  text-align: right;
  font-variant-numeric: tabular-nums;
  border-radius: 6px;
  transition: background 0.1s ease;
}

.history-item:hover {
  background: rgba(208, 188, 255, 0.12);
}

.history-empty {
  padding: 8px 4px;
  color: var(--md-on-surface-variant);
  text-align: center;
  font-size: 0.85rem;
}
</style>
