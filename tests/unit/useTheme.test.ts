import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme, THEME_KEY } from '../../src/composables/useTheme';

// The unit suite is the behavioural contract for the light/dark/system theme
// switch in src/composables/useTheme.ts. The mode persists to
// localStorage 'calc-theme-v1' and loads at setup time, so we clean both the
// store key and the <html> data-theme attribute before every test for
// isolation (a previous test's cycle() may have left a forced attribute).

beforeEach(() => {
  window.localStorage.removeItem(THEME_KEY);
  document.documentElement.removeAttribute('data-theme');
});

describe('useTheme() — 3-state mode', () => {
  it('starts in system (no forced attribute) with an empty store', () => {
    const theme = useTheme();
    expect(theme.mode.value).toBe('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('restores a persisted "light" mode at setup and applies it', () => {
    window.localStorage.setItem(THEME_KEY, 'light');
    document.documentElement.removeAttribute('data-theme');
    const theme = useTheme();
    expect(theme.mode.value).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ignores a corrupt value and falls back to system', () => {
    window.localStorage.setItem(THEME_KEY, 'midnight');
    document.documentElement.removeAttribute('data-theme');
    const theme = useTheme();
    expect(theme.mode.value).toBe('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('cycles light -> dark -> system -> light, persisting each step', () => {
    const theme = useTheme();
    // system -> light
    theme.cycle();
    expect(theme.mode.value).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light');

    // light -> dark
    theme.cycle();
    expect(theme.mode.value).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');

    // dark -> system: the attribute is removed AND the key is cleared so a later
    // refresh also follows the OS.
    theme.cycle();
    expect(theme.mode.value).toBe('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();

    // system -> light again (the cycle closes the loop).
    theme.cycle();
    expect(theme.mode.value).toBe('light');
  });

  it('exposes an aria-label naming the NEXT action (zh-TW)', () => {
    const theme = useTheme();
    expect(theme.ariaLabel.value).toBe('切換為淺色'); // system -> forces light
    theme.cycle();
    expect(theme.ariaLabel.value).toBe('切換為深色'); // light -> forces dark
    theme.cycle();
    expect(theme.ariaLabel.value).toBe('跟隨系統主題'); // dark -> system
  });
});
