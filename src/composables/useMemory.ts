/**
 * useMemory.ts — the memory keys (M+ / M- / MR / MC) and the foldable memory
 * row, kept out of the arithmetic modules (calculator.ts / expression.ts are
 * the SSOT and stay untouched). This composable owns the single memory value,
 * its guarded `localStorage` mirror, and the fold-state of the memory row.
 *
 * `localStorage` access is fully guarded (a `typeof window` check plus a
 * try/catch everywhere) so it never throws in a node/jsdom environment that
 * lacks a real storage. When storage is unavailable the in-memory value still
 * works; it simply won't persist across reloads.
 *
 * The memory value + fold state are LOADED at setup time (not onMounted) so the
 * initial render already reflects the restored state — no empty/fold flash, and
 * the values are available synchronously for tests that assert right after mount.
 */
import { ref, type Ref } from 'vue';

// Namespaced persistence keys, per spec.
const MEM_KEY = 'calc-mem-v1';
const FOLD_KEY = 'calc-mem-fold-v1';

// --- guarded storage (mirror useHistory.ts exactly) ----------------------

/** Read a key without ever throwing; null when absent or storage is unavailable. */
function readStore(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a key; a no-op (never throwing) when storage is unavailable. */
function writeStore(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or over quota — ignore */
  }
}

function clearStore(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// --- memory value --------------------------------------------------------

/** Read the stored memory value; 0 when absent or corrupt (start fresh). */
function readMem(): number {
  const raw = readStore(MEM_KEY);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0; // corrupt payload — start fresh
}

function writeMem(value: number): void {
  writeStore(MEM_KEY, String(value));
}

/**
 * The fold key persists '1' (expanded) / '0' (folded); an ABSENT key is folded.
 * So `readFolded` returns true (folded) unless an explicit '1' was stored.
 */
function readFolded(): boolean {
  return readStore(FOLD_KEY) !== '1';
}

function writeFolded(folded: boolean): void {
  writeStore(FOLD_KEY, folded ? '0' : '1');
}

export interface Memory {
  /** Current memory value; 0 while empty (M- floors at 0, never negative). */
  getMem(): number;
  /** mem += n, then persist. */
  addMem(n: number): void;
  /** mem -= n, then persist. */
  subMem(n: number): void;
  /** Current memory value; 0 while empty (M- floors at 0, never negative). */
  recallMem(): number;
  /** mem = 0, then persist. */
  clearMem(): void;
  /** True while the memory row is folded (hidden). Folded is the default. */
  isFolded: Ref<boolean>;
  /** Flip the fold state and persist it. */
  toggleFold(): void;
}

export function useMemory(): Memory {
  // Per-instance value, seeded from storage at setup time.
  let mem = readMem();

  // Load the fold state up-front (setup, not onMounted) so the first render
  // already reflects the restored state — no flash. Absent => folded.
  const isFolded = ref<boolean>(readFolded());

  function getMem(): number {
    return mem;
  }

  // Trim floating-point noise the same way expression.ts does (1e12 rounding), so
  // repeated M+/M- of a non-terminating decimal (0.1, 0.2, …) never leaves a dirty
  // value like "0.30000000000000004" in the store or on the display via MR.
  function round(x: number): number {
    return Math.round((x + Number.EPSILON) * 1e12) / 1e12;
  }

  function addMem(n: number): void {
    // M+ accumulates the current display value; round to trim float noise.
    if (Number.isFinite(n)) mem = round(mem + n);
    writeMem(mem);
  }

  function subMem(n: number): void {
    // M- subtracts the current display and FLOORS at 0. A calculator's memory is a
    // single "empty" state (0), so subtraction can never drive it negative — this
    // keeps "0 when empty" true even after M- on an empty/oversubtracted memory.
    if (Number.isFinite(n)) mem = round(Math.max(0, mem - n));
    writeMem(mem);
  }

  function recallMem(): number {
    return mem;
  }

  function clearMem(): void {
    mem = 0;
    clearStore(MEM_KEY);
  }

  function toggleFold(): void {
    isFolded.value = !isFolded.value;
    writeFolded(isFolded.value);
  }

  return { getMem, addMem, subMem, recallMem, clearMem, isFolded, toggleFold };
}

export { MEM_KEY, FOLD_KEY };
