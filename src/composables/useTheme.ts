/**
 * useTheme.ts — the light / dark / system theme switch, kept out of the
 * arithmetic modules (calculator.ts / expression.ts are the SSOT and stay
 * untouched). This composable owns a single 3-state mode —
 * 'light' | 'dark' | 'system' — persisted to localStorage under
 * 'calc-theme-v1' and reflected onto document.documentElement.dataset.theme.
 *
 * Priority (spec): localStorage('calc-theme-v1') in {'light','dark'} is a
 * FORCED override that beats the OS prefers-color-scheme; an ABSENT key means
 * "follow the system". The CSS layers that consume it (in App.vue) are ordered
 * so an attribute-selector [data-theme="..."] (specificity 0,1,0) out-specifies
 * the bare :root (0,0,1) and the @media (prefers-color-scheme: light) :root
 * (0,0,1), so a stored/forced choice always wins over the system preference.
 *
 * 'system' is represented by REMOVING the data-theme attribute (NOT setting it
 * to ''), so dataset.theme reads `undefined` and the @media / dark-default layer
 * applies. Persistence is cleared on entry to 'system' so a later refresh also
 * follows the OS.
 *
 * localStorage access is fully guarded (a `typeof window` check plus a
 * try/catch everywhere) so it never throws in a node/jsdom environment that
 * lacks a real storage — mirroring useHistory.ts / useMemory.ts. The mode is
 * LOADED at setup time (not onMounted) so the first render already reflects the
 * restored choice and `cycle()` is available synchronously for tests.
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

// Namespaced persistence key, per spec.
export const THEME_KEY = 'calc-theme-v1';

// --- guarded storage (mirror useHistory.ts / useMemory.ts exactly) ----------

/** Read a key without ever throwing; null when absent or storage unavailable. */
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

/**
 * Reflect a mode onto document.documentElement.dataset.theme. 'light'/'dark'
 * FORCE a scheme (setAttribute), 'system' removes the attribute so the OS
 * preference / dark default applies. Guarded so jsdom / SSR never throw.
 */
function applyMode(mode: ThemeMode): void {
  try {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
    } else {
      // 'system' => remove the attribute (NOT set to ''), so
      // document.documentElement.dataset.theme is `undefined`.
      root.removeAttribute('data-theme');
    }
  } catch {
    /* ignore */
  }
}

export interface Theme {
  /** Current mode; 'system' when nothing is persisted (follows the OS). */
  mode: Ref<ThemeMode>;
  /** Advance light -> dark -> system -> light; persists and applies the next. */
  cycle(): void;
  /** aria-label for the toggle button, describing the NEXT action (zh-TW). */
  ariaLabel: ComputedRef<string>;
}

export function useTheme(): Theme {
  // Load the persisted mode up-front; an absent or corrupt value => 'system'
  // (follow the OS, no forced attribute).
  const raw = readStore(THEME_KEY);
  const initial: ThemeMode = raw === 'light' || raw === 'dark' ? raw : 'system';
  const mode = ref<ThemeMode>(initial);

  // Apply the persisted choice immediately (setup, not onMounted) so the first
  // render reflects it with no flash — and, for 'system', clears any stale
  // attribute left by a previous session.
  applyMode(initial);

  // The aria-label reads as the ACTION the next click performs, so all three
  // zh-TW strings appear across the cycle and a screen-reader user hears what
  // the button will do.
  const ariaLabel = computed(() => {
    switch (mode.value) {
      case 'light':
        return '切換為深色';
      case 'dark':
        return '跟隨系統主題';
      default:
        // 'system' — the next click forces light.
        return '切換為淺色';
    }
  });

  // Rotate light -> dark -> system -> light. On entry to 'system' the persisted
  // key is cleared so a refresh also follows the OS (spec: system = unset).
  function cycle(): void {
    const next: ThemeMode =
      mode.value === 'light'
        ? 'dark'
        : mode.value === 'dark'
          ? 'system'
          : 'light';
    mode.value = next;
    if (next === 'system') {
      clearStore(THEME_KEY);
    } else {
      writeStore(THEME_KEY, next);
    }
    applyMode(next);
  }

  return { mode, cycle, ariaLabel };
}
