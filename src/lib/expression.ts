/**
 * expression.ts — shunting-yard expression parser for the expression mode
 * of the calculator UI. Zero dependencies, pure functions only.
 *
 * Supported grammar:
 *   expr   := term (('+'|'-') term)*
 *   term   := factor (('*'|'/') factor)*
 *   factor := number | '(' expr ')'
 * A leading unary minus is allowed (e.g. "-5").
 *
 * Returns 'Error' for malformed input or any division by zero.
 */

import type { CalcResult } from './calculator';

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
};

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'unary'; value: '-' | '+' }
  | { kind: 'paren'; open: boolean };

// Unary operators bind tighter than their binary neighbours.
const UNARY_PRECEDENCE = 3;

const OPERATORS = new Set(['+', '-', '*', '/']);

/** Tokenise a raw expression string. Returns [] if malformed. */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const chars = [...input];
  let i = 0;

  const pushNumber = (raw: string): boolean => {
    if ((raw.match(/\./g) ?? []).length > 1) return false; // >1 decimal point
    const n = Number(raw);
    if (Number.isNaN(n)) return false;
    tokens.push({ kind: 'num', value: n });
    return true;
  };

  while (i < chars.length) {
    const c = chars[i];

    if (c === ' ') {
      i++;
      continue;
    }

    if ((c >= '0' && c <= '9') || c === '.') {
      let raw = '';
      while (chars[i] && ((chars[i] >= '0' && chars[i] <= '9') || chars[i] === '.')) {
        raw += chars[i];
        i++;
      }
      if (!pushNumber(raw)) return [];
      continue;
    }

    if (c === '(' || c === ')') {
      tokens.push({ kind: 'paren', open: c === '(' });
      i++;
      continue;
    }

    if (OPERATORS.has(c)) {
      const prev = tokens[tokens.length - 1];
      // A '-' is a unary sign when it starts an operand slot: at the start,
      // or immediately after another operator / an opening paren.
      const atOperandPos =
        !prev || prev.kind === 'op' || (prev.kind === 'paren' && prev.open);

      if (c === '-' && atOperandPos) {
        // A leading '-' is a unary minus: emit it as a standalone high-
        // precedence, right-associative operator. The next token (a number
        // or an opening paren) is its operand.
        tokens.push({ kind: 'unary', value: '-' });
        i++;
        continue;
      }

      tokens.push({ kind: 'op', value: c as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }

    return []; // any other character (letters, '%', etc.) is not in the grammar
  }

  return tokens;
}

/** Convert tokens to Reverse Polish Notation. Returns null if malformed. */
function toRPN(tokens: Token[]): Token[] | null {
  const output: Token[] = [];
  const ops: Token[] = [];

  for (const t of tokens) {
    if (t.kind === 'num') {
      output.push(t);
      continue;
    }

    if (t.kind === 'paren') {
      if (t.open) {
        ops.push(t);
        continue;
      }
      // closing paren: pop until matching '('
      let found = false;
      while (ops.length > 0) {
        const top = ops.pop() as Token;
        if (top.kind === 'paren' && top.open) {
          found = true;
          break;
        }
        output.push(top);
      }
      if (!found) return null; // no matching '('
      continue;
    }

    // Binary operator (left-associative) and unary minus/plus
    // (right-associative, higher precedence). Use a single pop rule that
    // considers the precedence of WHATEVER is on top (op or unary).
    const currentPrec =
      t.kind === 'unary' ? UNARY_PRECEDENCE : PRECEDENCE[t.value];
    const currentLeftAssoc = t.kind === 'op';

    while (ops.length > 0) {
      const top = ops[ops.length - 1];
      if (top.kind === 'paren') break; // '(' blocks popping
      const topPrec =
        top.kind === 'op' ? PRECEDENCE[top.value] : UNARY_PRECEDENCE;
      const pop =
        topPrec > currentPrec ||
        (topPrec === currentPrec && currentLeftAssoc);
      if (!pop) break;
      output.push(ops.pop() as Token);
    }
    ops.push(t);
  }

  while (ops.length > 0) {
    const top = ops.pop() as Token;
    if (top.kind === 'paren') return null; // dangling '('
    output.push(top);
  }

  return output;
}

/** Evaluate a Reverse Polish Notation token list. Returns 'Error' on bad shape. */
function evalRPN(rpn: Token[]): CalcResult {
  if (rpn.length === 0) return 'Error';

  // Validate the operand/operator shape. A binary operator consumes 2 and
  // yields 1 (net -1); a unary plus/minus consumes 1 and yields 1 (net 0);
  // a number yields 1 (net +1). A valid single-value expression nets to +1.
  let balance = 0;
  for (const t of rpn) {
    balance += t.kind === 'num' ? 1 : t.kind === 'op' ? -1 : 0;
    if (balance < 0) return 'Error'; // more operators than operands so far
  }
  if (balance !== 1) return 'Error'; // did not collapse to a single value

  const stack: number[] = [];
  for (const t of rpn) {
    if (t.kind === 'num') {
      stack.push(t.value);
      continue;
    }

    if (t.kind === 'unary') {
      if (stack.length < 1) return 'Error';
      const a = stack.pop() as number;
      stack.push(t.value === '-' ? -a : a);
      continue;
    }

    // t.kind === 'op' (binary). A paren can never appear in RPN output,
    // but narrow the type so `t.value` type-checks.
    if (t.kind === 'op') {
      if (stack.length < 2) return 'Error';
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      let r: number;
      switch (t.value) {
        case '+':
          r = a + b;
          break;
        case '-':
          r = a - b;
          break;
        case '*':
          r = a * b;
          break;
        case '/':
          if (b === 0) return 'Error';
          r = a / b;
          break;
        default:
          return 'Error';
      }
      stack.push(r);
    }
  }

  if (stack.length !== 1) return 'Error';
  const result = stack[0];
  if (!Number.isFinite(result)) return 'Error';
  // Trim floating-point noise: 0.1 + 0.2 -> 0.3 not 0.30000000000000004
  return Math.round((result + Number.EPSILON) * 1e12) / 1e12;
}

/**
 * Parse and evaluate a fully-formed arithmetic expression string.
 * Returns 'Error' for malformed input or a division by zero.
 */
export function parseExpression(input: string): CalcResult {
  const tokens = tokenize(input);
  if (tokens.length === 0) return 'Error';
  const rpn = toRPN(tokens);
  if (rpn === null) return 'Error';
  return evalRPN(rpn);
}
