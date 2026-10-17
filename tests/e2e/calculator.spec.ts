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
  // "(" enters expression mode; all subsequent input builds one expression.
  await press(page, '(');
  await press(page, '1');
  await press(page, '+');
  await press(page, '2');
  await press(page, ')');
  await press(page, '*');
  await press(page, '(');
  await press(page, '3');
  await press(page, '+');
  await press(page, '4');
  await press(page, ')');
  await expect(display(page)).toHaveText('(1+2)*(3+4)');
  await press(page, '=');
  await expect(display(page)).toHaveText('21');
});

test('expression mode: (2+3*4) = 14 (precedence)', async ({ page }) => {
  await press(page, '(');
  await press(page, '2');
  await press(page, '+');
  await press(page, '3');
  await press(page, '*');
  await press(page, '4');
  await press(page, ')');
  await press(page, '=');
  await expect(display(page)).toHaveText('14');
});

test('AC leaves expression mode', async ({ page }) => {
  await press(page, '(');
  await press(page, '9');
  await expect(display(page)).toHaveText('(9');
  await press(page, 'AC');
  await expect(display(page)).toHaveText('0');
});
