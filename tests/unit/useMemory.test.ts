import { describe, it, expect, beforeEach } from 'vitest';
import { useMemory } from '../../src/composables/useMemory';

// The unit suite is the behavioural contract for the memory + fold state in
// src/composables/useMemory.ts. The composable persists to the namespaced
// localStorage keys 'calc-mem-v1' / 'calc-mem-fold-v1' and loads them at setup
// time, so we clean both keys before every test for isolation.

beforeEach(() => {
  window.localStorage.removeItem('calc-mem-v1');
  window.localStorage.removeItem('calc-mem-fold-v1');
});

describe('useMemory() — memory value', () => {
  it('starts at 0 with an empty store', () => {
    const m = useMemory();
    expect(m.getMem()).toBe(0);
    expect(m.recallMem()).toBe(0);
  });

  it('M+ accumulates: 5 then 10 => 15', () => {
    const m = useMemory();
    m.addMem(5);
    m.addMem(10);
    expect(m.getMem()).toBe(15);
  });

  it('M- subtracts: from 15 remove 10 => 5', () => {
    const m = useMemory();
    m.addMem(15);
    m.subMem(10);
    expect(m.getMem()).toBe(5);
  });

  it('M- floors at 0: subtracting past zero stays 0, never negative', () => {
    const m = useMemory();
    // Empty memory: M- must not drive it negative ("0 when empty" holds).
    m.subMem(7);
    expect(m.getMem()).toBe(0);
    expect(window.localStorage.getItem('calc-mem-v1')).toBe('0');
    // M- more than what is stored floors at 0, not negative.
    m.addMem(3);
    m.subMem(10);
    expect(m.getMem()).toBe(0);
    expect(window.localStorage.getItem('calc-mem-v1')).toBe('0');
  });

  it('M+ trims floating-point noise: 3x M+ 0.1 persists "0.3"', () => {
    const m = useMemory();
    m.addMem(0.1);
    m.addMem(0.1);
    m.addMem(0.1);
    expect(window.localStorage.getItem('calc-mem-v1')).toBe('0.3');
  });

  it('MC clears to 0', () => {
    const m = useMemory();
    m.addMem(42);
    m.clearMem();
    expect(m.getMem()).toBe(0);
  });

  it('ignores a non-finite addition (never corrupts the value)', () => {
    const m = useMemory();
    m.addMem(10);
    m.addMem(NaN);
    m.addMem(Infinity);
    expect(m.getMem()).toBe(10);
  });
});

describe('useMemory() — persistence', () => {
  it('persists the memory value to calc-mem-v1', () => {
    useMemory().addMem(15);
    expect(window.localStorage.getItem('calc-mem-v1')).toBe('15');
  });

  it('a fresh useMemory() re-reads the persisted value at setup', () => {
    useMemory().addMem(15);
    // A new instance (a new "mount") must see 15 without touching the store again.
    expect(useMemory().getMem()).toBe(15);
  });

  it('clearMem wipes the persisted copy', () => {
    const m = useMemory();
    m.addMem(7);
    expect(window.localStorage.getItem('calc-mem-v1')).toBe('7');
    m.clearMem();
    expect(window.localStorage.getItem('calc-mem-v1')).toBeNull();
  });

  it('recovers a corrupt persisted value back to 0', () => {
    window.localStorage.setItem('calc-mem-v1', 'not-a-number');
    expect(useMemory().getMem()).toBe(0);
  });
});

describe('useMemory() — fold state', () => {
  it('defaults to folded when nothing is stored', () => {
    const m = useMemory();
    expect(m.isFolded.value).toBe(true);
  });

  it('toggleFold flips the state and persists it', () => {
    const m = useMemory();
    expect(m.isFolded.value).toBe(true);
    m.toggleFold();
    expect(m.isFolded.value).toBe(false);
    expect(window.localStorage.getItem('calc-mem-fold-v1')).toBe('1');
    m.toggleFold();
    expect(m.isFolded.value).toBe(true);
    expect(window.localStorage.getItem('calc-mem-fold-v1')).toBe('0');
  });

  it('a fresh useMemory() re-reads an expanded fold state at setup', () => {
    useMemory().toggleFold(); // expanded => '1'
    expect(useMemory().isFolded.value).toBe(false);
  });
});
