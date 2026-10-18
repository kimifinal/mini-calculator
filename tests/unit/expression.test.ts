import { describe, it, expect } from 'vitest';
import { parseExpression } from '../../src/lib/expression';

// Behavioural contract for the expression parser (shunting-yard).
// These mirror the cases that a user is likely to type in expression mode.

describe('parseExpression()', () => {
  it('evaluates a simple addition (2+3=5)', () => {
    expect(parseExpression('2+3')).toBe(5);
  });

  it('respects operator precedence (2+3*4=14)', () => {
    expect(parseExpression('2+3*4')).toBe(14);
  });

  it('respects parentheses over precedence ((2+3)*4=20)', () => {
    expect(parseExpression('(2+3)*4')).toBe(20);
  });

  it('the spec.md motivating case: 2 + 3 * (4 - 5) = -1', () => {
    expect(parseExpression('2 + 3 * (4 - 5)')).toBe(-1);
  });

  it('handles nested parentheses', () => {
    expect(parseExpression('((2+3)*(4-1))')).toBe(15);
  });

  it('divides correctly', () => {
    expect(parseExpression('10/2')).toBe(5);
  });

  it('returns Error on division by zero anywhere in the expression', () => {
    expect(parseExpression('5/(3-3)')).toBe('Error');
  });

  it('handles a leading unary minus (-5+3=-2)', () => {
    expect(parseExpression('-5+3')).toBe(-2);
  });

  it('handles a unary minus before a grouped expression (- (2+3) = -5)', () => {
    expect(parseExpression('-(2+3)')).toBe(-5);
  });

  it('handles a unary minus multiplying a paren', () => {
    expect(parseExpression('2 * -3')).toBe(-6);
  });

  it('trims floating point noise (0.1+0.2=0.3)', () => {
    expect(parseExpression('0.1+0.2')).toBe(0.3);
  });

  it('handles whitespace anywhere', () => {
    expect(parseExpression('  10  /  4  ')).toBe(2.5);
  });

  it('returns Error on empty input', () => {
    expect(parseExpression('')).toBe('Error');
  });

  it('returns Error on a dangling operator (2+)', () => {
    expect(parseExpression('2+')).toBe('Error');
  });

  it('returns Error on mismatched parentheses (2+3))', () => {
    expect(parseExpression('2+3)')).toBe('Error');
  });

  it('returns Error on two operators in a row (2 ** 3)', () => {
    expect(parseExpression('2**3')).toBe('Error');
  });

  it('rejects characters not in the grammar (letters)', () => {
    expect(parseExpression('2+a')).toBe('Error');
  });

  it('rejects a lone decimal-point count of multiple dots (1.2.3)', () => {
    expect(parseExpression('1.2.3')).toBe('Error');
  });
});
