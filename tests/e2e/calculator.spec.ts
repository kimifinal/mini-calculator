/**
 * End-to-end tests.
 *
 * These drive the *production* preview build (see playwright.config.ts
 * webServer) in a real Chromium browser, clicking the on-screen buttons —
 * the exact path a user takes. They mirror spec.md and add the modulo and
 * reset regressions so a UI regression anywhere in the chain fails loudly.
 */
import { test, expect } from '@playwright/test';

const display = (page: import('@playwright/test').Page) =>
  page.getByTestId('display');

async function press(page: import('@playwright/test').Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // The display should start at 0 on a fresh load.
  await expect(display(page)).toHaveText('0');
});

test('adds two numbers: 5 + 3 = 8', async ({ page }) => {
  await press(page, '5');
  await press(page, '+');
  await press(page, '3');
  await press(page, '=');
  await expect(display(page)).toHaveText('8');
});

test('subtracts two numbers: 9 - 4 = 5', async ({ page }) => {
  await press(page, '9');
  await press(page, '-');
  await press(page, '4');
  await press(page, '=');
  await expect(display(page)).toHaveText('5');
});

test('divides two numbers: 10 / 2 = 5', async ({ page }) => {
  await press(page, '1');
  await press(page, '0');
  await press(page, '/');
  await press(page, '2');
  await press(page, '=');
  await expect(display(page)).toHaveText('5');
});

test('shows Error on division by zero: 10 / 0 = Error', async ({ page }) => {
  await press(page, '1');
  await press(page, '0');
  await press(page, '/');
  await press(page, '0');
  await press(page, '=');
  await expect(display(page)).toHaveText('Error');
});

test('resets to 0 after a division-by-zero error', async ({ page }) => {
  await press(page, '1');
  await press(page, '0');
  await press(page, '/');
  await press(page, '0');
  await press(page, '=');
  await expect(display(page)).toHaveText('Error');
  await page.locator('button[data-test="ac"]').click();
  await expect(display(page)).toHaveText('0');
});

test('computes percentage: 50 % = 0.5', async ({ page }) => {
  await press(page, '5');
  await press(page, '0');
  await press(page, '%');
  await expect(display(page)).toHaveText('0.5');
});

test('expression mode: (1+2)*(3+4) = 21', async ({ page }) => {
  // The single "()" button auto-inserts '(' or ')' based on context, so each
  // paren character maps to the same button.
  const paren = () => page.locator('button[data-paren="1"]').first().click();
  await paren();
  await press(page, '1');
  await press(page, '+');
  await press(page, '2');
  await paren();
  await press(page, '*');
  await paren();
  await press(page, '3');
  await press(page, '+');
  await press(page, '4');
  await paren();
  await expect(display(page)).toHaveText('(1+2)*(3+4)');
  await press(page, '=');
  await expect(display(page)).toHaveText('21');
});

test('expression mode: (2+3*4) = 14 (precedence)', async ({ page }) => {
  const paren = () => page.locator('button[data-paren="1"]').first().click();
  await paren();
  await press(page, '2');
  await press(page, '+');
  await press(page, '3');
  await press(page, '*');
  await press(page, '4');
  await paren();
  await press(page, '=');
  await expect(display(page)).toHaveText('14');
});

test('AC leaves expression mode', async ({ page }) => {
  await page.locator('button[data-paren="1"]').first().click();
  await press(page, '9');
  await expect(display(page)).toHaveText('(9');
  await press(page, 'AC');
  await expect(display(page)).toHaveText('0');
});

test('backspace deletes one character: 123 -> 12', async ({ page }) => {
  await press(page, '1');
  await press(page, '2');
  await press(page, '3');
  await expect(display(page)).toHaveText('123');
  await press(page, 'backspace');
  await expect(display(page)).toHaveText('12');
});

test('backspace works in expression mode: (1+2 -> (1+', async ({ page }) => {
  await page.locator('button[data-paren="1"]').first().click();
  await press(page, '1');
  await press(page, '+');
  await press(page, '2');
  await expect(display(page)).toHaveText('(1+2');
  await press(page, 'backspace');
  await expect(display(page)).toHaveText('(1+');
});

test('negate button toggles sign: 5 -> ± -> -5 -> ± -> 5', async ({ page }) => {
  await press(page, '5');
  await expect(display(page)).toHaveText('5');
  await press(page, '±');
  await expect(display(page)).toHaveText('-5');
  // A second toggle returns the display to the original value.
  await press(page, '±');
  await expect(display(page)).toHaveText('5');
});

test('history records a calculation and reloading it restores the result', async ({
  page,
}) => {
  // Compute 5 + 3 = 8.
  await press(page, '5');
  await press(page, '+');
  await press(page, '3');
  await press(page, '=');
  await expect(display(page)).toHaveText('8');

  // Open the history panel via its toggle button.
  await page.locator('button[data-test="history-toggle"]').click();
  const list = page.locator('[data-testid="history-list"]');
  await expect(list).toBeVisible();

  // The recorded line "5 + 3 = 8" is visible in the panel.
  const entry = page.locator('[data-test="history-entry"]');
  await expect(entry.first()).toHaveText('5 + 3 = 8');

  // Click it: its result (8) loads back into the display.
  await entry.first().click();
  await expect(display(page)).toHaveText('8');
});

test('clicking a history entry auto-collapses the panel back to the keyboard', async ({
  page,
}) => {
  // Compute 3 + 8 = 11 so a history line actually gets recorded.
  await press(page, '3');
  await press(page, '+');
  await press(page, '8');
  await press(page, '=');
  // Open the history panel via its toggle button.
  await page.locator('button[data-test="history-toggle"]').click();
  const list = page.locator('[data-testid="history-list"]');
  await expect(list).toBeVisible();
  // Tapping a history line auto-collapses the panel and returns the keyboard.
  await page.locator('[data-test="history-entry"]').first().click();
  await expect(list).toBeHidden();
});
