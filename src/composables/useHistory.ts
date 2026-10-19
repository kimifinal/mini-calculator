/**
 * useHistory.ts — the calculation-history UI state, kept out of the
 * arithmetic modules (calculator.ts / expression.ts are the SSOT and stay
 * untouched). This composable owns the history list, its newest-first
 * ordering, the 50-entry cap, and a guarded `localStorage` mirror.
 *
 * `localStorage` access is fully guarded (a `typeof window` check plus a
 * try/catch everywhere) so it never throws in a node/jsdom environment that
 * lacks a real storage. When storage is unavailable the in-memory list still
 * works; it simply won't persist across reloads.
 */
import { ref, type Ref } from 'vue';

// Namespaced persistence key, per spec.
const STORAGE_KEY = 'calc-history-v1';

// Keep at most this many entries; the oldest is dropped when exceeded.
const MAX_ENTRIES = 50;

/** A single human-readable history line, e.g. "5 + 3 = 8". */
export type HistoryEntry = string;

/** Read the raw stored payload without ever throwing. */
function readStore(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Write the payload; a no-op (never throwing) when storage is unavailable. */
function writeStore(value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable or over quota — ignore */
  }
}

function clearStore(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Parse a stored payload back into a clean, capped entry list. */
function parsePayload(raw: string | null): HistoryEntry[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter(
      (x): x is HistoryEntry => typeof x === 'string',
    );
    return clean.slice(-MAX_ENTRIES);
  } catch {
    return []; // corrupt payload — start fresh
  }
}

export interface History {
  /** Newest-first list of recorded lines (reliable even if persistence fails). */
  entries: Ref<HistoryEntry[]>;
  /** Record a new line at the top and persist, capping at MAX_ENTRIES. */
  record(line: HistoryEntry): void;
  /** Empty the in-memory list and its persistent copy. */
  clear(): void;
}

export function useHistory(): History {
  const entries = ref<HistoryEntry[]>([]);

  // Load the previous list up-front (setup time, not onMounted) so the initial
  // render already shows the restored history — no empty-list flash, and the
  // value is available synchronously for tests that assert right after mount.
  // The guarded read returns [] when there is nothing (or storage is absent).
  entries.value = parsePayload(readStore());

  function record(line: HistoryEntry): void {
    // Prepend (newest first) then drop everything past the cap.
    entries.value = [line, ...entries.value].slice(0, MAX_ENTRIES);
    writeStore(JSON.stringify(entries.value));
  }

  function clear(): void {
    entries.value = [];
    clearStore();
  }

  return { entries, record, clear };
}

export { STORAGE_KEY, MAX_ENTRIES };
