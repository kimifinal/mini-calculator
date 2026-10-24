/**
 * End-to-end tests for the FOLDABLE MEMORY row (issue #14).
 *
 * A new 4-key cluster (M+ / M- / MR / MC) lives in a memory row that slides in
 * ABOVE the keypad, toggled by a circular icon-only chevron (data-testid=
 * "fold-toggle") on its own row between the preview line and the keyboard.
 * Default = folded (the keypad layout is then identical to the original app);
 * the memory value + fold state both persist to localStorage.
 *
 * The memory row is COLLAPSED (0 height, not clickable) while folded, so every
 * key path below first expands the row by clicking the fold toggle — the real
 * user path. Memory is read back through MR (which loads the value into the
 * display) and cross-checked against localStorage['calc-mem-v1']; the fold state
 * is read through the toggle's aria-expanded and localStorage['calc-mem-fold-v1'].
 *
 * Acceptance coverage:
 *   M1 — 5 M+ 10 M+ then MR shows 15; after MC then MR shows 0.
 *   M2 — each of the 4 keys works (M+ / M- / MR / MC).
 *   M3 — memory value persists across page.reload().
 *   M4 — fold state (expanded) persists across page.reload().
 *   M5 — the fold toggle flips aria-expanded between the two states.
 *   M6 — M+ / M- on an "Error" display are a no-op that never touches memory.
 */
import { test, expect, type Page } from '@playwright/test';

const display = (page: Page) => page.getByTestId('display');
const toggle = (page: Page) => page.locator('button[data-testid="fold-toggle"]');

// Click an on-screen key by its data-label (same helper the other e2e uses).
async function press(page: Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

// Expand the memory row IF it is folded (the keys are not clickable while
// folded). Idempotent: if a reloaded page is already expanded (the fold state
// persisted), it leaves the row open instead of folding it.
async function ensureExpanded(page: Page) {
  if ((await ariaExpanded(page)) === 'false') {
    await toggle(page).click();
  }
  await expect(page.locator('[data-testid="memory-row"]')).toBeVisible();
}

// Read the persisted memory value from localStorage.
function memFromStorage(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('calc-mem-v1'));
}

// Read the persisted fold state ('1' expanded / '0' folded / null = folded).
function foldFromStorage(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('calc-mem-fold-v1'));
}

// Read the toggle's live aria-expanded.
async function ariaExpanded(page: Page): Promise<string | null> {
  return toggle(page).getAttribute('aria-expanded');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Fresh load: display 0, memory row folded (the toggle is collapsed).
  await expect(display(page)).toHaveText('0');
  await expect(await ariaExpanded(page)).toBe('false');
});

// --- M1: accumulate + recall + clear ----------------------------------
test('M1: 5 M+ 10 M+ then MR shows 15; MC then MR shows 0', async ({ page }) => {
  await ensureExpanded(page);
  await press(page, '5');
  await press(page, 'M+');
  await press(page, '1');
  await press(page, '0');
  await press(page, 'M+');
  // 5 + 10 = 15 is now in memory.
  await expect(await memFromStorage(page)).toBe('15');

  // MR loads memory into the display.
  await press(page, 'MR');
  await expect(display(page)).toHaveText('15');

  // MC clears memory (the key is removed, like clearing history); a subsequent
  // MR then reads 0 because the store is empty.
  await press(page, 'MC');
  expect(await memFromStorage(page)).toBeNull();
  await press(page, 'MR');
  await expect(display(page)).toHaveText('0');
});

// --- M2: each of the 4 keys works -------------------------------------
test('M2: M+ accumulates, M- subtracts, MR loads, MC clears', async ({
  page,
}) => {
  await ensureExpanded(page);

  // M+ : 30 -> memory 30
  await press(page, '3');
  await press(page, '0');
  await press(page, 'M+');
  expect(await memFromStorage(page)).toBe('30');

  // M- : 10 -> memory 20
  await press(page, '1');
  await press(page, '0');
  await press(page, 'M-');
  expect(await memFromStorage(page)).toBe('20');

  // MR : loads 20 into the display
  await press(page, 'MR');
  await expect(display(page)).toHaveText('20');

  // MC : clears to 0 (the key is removed; MR after this reads 0)
  await press(page, 'MC');
  expect(await memFromStorage(page)).toBeNull();
  expect(await ariaExpanded(page)).toBe('true'); // still expanded after the ops
});

// --- M3: memory value persists across a reload ------------------------
test('M3: the memory value persists across page.reload()', async ({ page }) => {
  await ensureExpanded(page);
  await press(page, '5');
  await press(page, 'M+');
  await press(page, '1');
  await press(page, '0');
  await press(page, 'M+'); // memory = 15
  expect(await memFromStorage(page)).toBe('15');

  // Reload the same context: localStorage survives, useMemory reloads it at
  // setup, so the value is restored.
  await page.reload();
  await expect(display(page)).toHaveText('0');
  expect(await memFromStorage(page)).toBe('15');

  // Ensure the row is open (the fold state may have persisted as expanded too)
  // and recalling still shows 15.
  await ensureExpanded(page);
  await press(page, 'MR');
  await expect(display(page)).toHaveText('15');
});

// --- M4: fold state persists across a reload --------------------------
test('M4: an expanded memory row stays expanded after a reload', async ({
  page,
}) => {
  await ensureExpanded(page);
  expect(await ariaExpanded(page)).toBe('true');
  expect(await foldFromStorage(page)).toBe('1');

  await page.reload();
  await expect(display(page)).toHaveText('0');

  // The fold state was restored from storage: still expanded.
  expect(await ariaExpanded(page)).toBe('true');
  await expect(page.locator('[data-testid="memory-row"]')).toBeVisible();
});

// --- M5: the fold toggle flips aria-expanded both ways ----------------
test('M5: the fold toggle flips aria-expanded between folded and expanded', async ({
  page,
}) => {
  // Folded by default.
  expect(await ariaExpanded(page)).toBe('false');
  // First click expands.
  await toggle(page).click();
  await expect(page.locator('[data-testid="memory-row"]')).toBeVisible();
  expect(await ariaExpanded(page)).toBe('true');
  // Second click folds it back.
  await toggle(page).click();
  expect(await ariaExpanded(page)).toBe('false');
  expect(await foldFromStorage(page)).toBe('0');
});

// --- M6: M+ / M- on an "Error" display are a no-op that never touches memory ----
// `currentNumericValue()` returns 0 for an 'Error' (or empty) display, so a
// memory op on a failed division must leave the stored value UNCHANGED — it must
// not clear or corrupt it. 10 / 0 -> "Error" (parseExpression returns 'Error').
test('M6: M+ / M- on an "Error" display do not change the stored memory', async ({
  page,
}) => {
  await ensureExpanded(page);
  await press(page, '7');
  await press(page, 'M+'); // memory = 7
  expect(await memFromStorage(page)).toBe('7');

  // 10 / 0 -> "Error" on the display.
  await press(page, '1');
  await press(page, '0');
  await press(page, '/');
  await press(page, '0');
  await press(page, '=');
  await expect(display(page)).toHaveText('Error');

  // M+ / M- read the (non-numeric) Error display as 0 → memory stays 7.
  await press(page, 'M+');
  expect(await memFromStorage(page), 'M+ on Error must not add').toBe('7');
  await press(page, 'M-');
  expect(await memFromStorage(page), 'M- on Error must not subtract').toBe('7');

  // Recalling still yields the original 7.
  await press(page, 'MR');
  await expect(display(page)).toHaveText('7');
});
