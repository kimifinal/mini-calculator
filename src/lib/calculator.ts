/**
 * calculator.ts — single source of truth for arithmetic logic.
 *
 * Every layer (the Vue component, the unit tests, and the e2e tests)
 * derives its expected behaviour from this module. Fixing a bug here fixes
 * it everywhere; the UI and the tests must never re-implement arithmetic.
 */

export type Operator = '+' | '-' | '*' | '/';

export type CalcResult = number | 'Error';

const OPERATORS: readonly Operator[] = ['+', '-', '*', '/'];

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
