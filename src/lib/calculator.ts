/**
 * calculator.ts — single source of truth for arithmetic logic.
 *
 * Every layer (the Vue component, the unit tests, and the e2e tests)
 * derives its expected behaviour from this module. Fixing a bug here fixes
 * it everywhere; the UI and the tests must never re-implement arithmetic.
 */

export type Operator = '+' | '-' | '*' | '/' | '^';

export type CalcResult = number | 'Error';

const OPERATORS: readonly Operator[] = ['+', '-', '*', '/', '^'];

export function isOperator(op: string): op is Operator {
  return (OPERATORS as readonly string[]).includes(op);
}

/**
 * Perform a binary operation between two operands.
 *
 * Division by zero returns the sentinel string "Error" (as required by
 * spec.md) instead of throwing. Unknown operators return "Error" as
 * well, so callers have a single non-number path.
 */
export function calculate(first: number, second: number, op: Operator): CalcResult {
  switch (op) {
    case '+':
      return first + second;
    case '-':
      return first - second;
    case '*':
      return first * second;
    case '/':
      if (second === 0) return 'Error';
      return first / second;
    case '^':
      return Math.pow(first, second);
    default:
      return 'Error';
  }
}

/**
 * Percentage of a value: n / 100.
 *
 * This is the unary operation behind the '%' button in the UI, separate
 * from the four binary operators above.
 */
export function percentage(n: number): number {
  return n / 100;
}

/**
 * Square of a value: n * n. The unary operation behind the "x²" button.
 */
export function square(n: number): CalcResult {
  return n * n;
}

/**
 * Square root of a value. The unary operation behind the "√" button.
 * A negative radicand has no real root, so it returns the "Error" sentinel.
 */
export function sqrtOp(n: number): CalcResult {
  return n < 0 ? 'Error' : Math.sqrt(n);
}

/**
 * Reciprocal of a value: 1 / n. The unary operation behind the "1/x" button.
 * Division by zero returns the "Error" sentinel, matching the binary divide.
 */
export function reciprocal(n: number): CalcResult {
  return n === 0 ? 'Error' : 1 / n;
}
