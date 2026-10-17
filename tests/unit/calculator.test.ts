import { describe, it, expect } from 'vitest';
import { calculate, isOperator, percentage, type Operator } from '../../src/lib/calculator';

// The unit suite is the behavioural contract for the arithmetic in
// src/lib/calculator.ts, which is the single source of truth for every layer.

describe('calculate()', () => {
  it('adds two numbers (spec: 5 + 3 = 8)', () => {
    expect(calculate(5, 3, '+')).toBe(8);
  });

  it('subtracts two numbers', () => {
    expect(calculate(10, 4, '-')).toBe(6);
  });

  it('multiplies two numbers', () => {
    expect(calculate(4, 3, '*')).toBe(12);
  });

  it('divides two numbers (spec: 10 / 2 = 5)', () => {
    expect(calculate(10, 2, '/')).toBe(5);
  });

  it('returns "Error" on division by zero (spec: 10 / 0 = Error)', () => {
    expect(calculate(10, 0, '/')).toBe('Error');
  });

  it('rejects an unknown operator with "Error"', () => {
    expect(calculate(5, 3, 'x' as Operator)).toBe('Error');
  });
});

describe('percentage()', () => {
  it('returns a fraction of a hundred (50 -> 0.5)', () => {
    expect(percentage(50)).toBe(0.5);
  });

  it('handles 0 (0 -> 0)', () => {
    expect(percentage(0)).toBe(0);
  });

  it('handles decimals (12.5 -> 0.125)', () => {
    expect(percentage(12.5)).toBe(0.125);
  });
});

describe('isOperator()', () => {
  it('recognises the four supported operators', () => {
    expect(isOperator('+')).toBe(true);
    expect(isOperator('-')).toBe(true);
    expect(isOperator('*')).toBe(true);
    expect(isOperator('/')).toBe(true);
  });

  it('rejects non-operators (including "%", which is unary, not binary)', () => {
    expect(isOperator('%')).toBe(false);
    expect(isOperator('x')).toBe(false);
    expect(isOperator('')).toBe(false);
  });
});
