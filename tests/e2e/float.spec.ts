/**
 * 浮點精度 e2e 護欄 (issue #34 / B1)。
 *
 * 產品端已對結果做 `Math.round((x + Number.EPSILON) * 1e12) / 1e12` 規整
 * (見 src/lib/expression.ts 與 src/components/Calculator.vue)，故 0.1 + 0.2
 * 顯示 0.3 而非 0.30000000000000004。此檔補邊界護欄：若日後有人動到取整
 * 邏輯導致浮點雜訊爆回 17 位長尾，這些測試會先紅下。
 *
 * 這些測試沿用 calculator.spec.ts 的 press()/display() helper 風格，透過
 * Playwright + Vite preview (見 playwright.config.ts webServer) 點按螢幕按鈕，
 * 走的是使用者實際的操作路徑。
 */
import { test, expect } from '@playwright/test';

// 主顯示列 (testid='display')。
const display = (page: import('@playwright/test').Page) =>
  page.getByTestId('display');

// 預覽列 (testid='display-preview')，顯示運算式目前的即時結果。
const preview = (page: import('@playwright/test').Page) =>
  page.getByTestId('display-preview');

// 按 data-label 對應的螢幕按鈕 (與 calculator.spec.ts 同款 helper)。
async function press(page: import('@playwright/test').Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 重新載入後顯示應為 0。
  await expect(display(page)).toHaveText('0');
});

// --- 浮點精度護欄 ---------------------------------------------------------

// A1: 浮點雜訊被規整。0.1 + 0.2 在浮點下是 0.30000000000000004，
// 但取整後主顯示應為 0.3 (非 17 位長尾)。
test('浮點雜訊被規整: 0.1 + 0.2 = 0.3', async ({ page }) => {
  await press(page, '0');
  await press(page, '.');
  await expect(display(page)).toHaveText('0.');
  await press(page, '1');
  await expect(display(page)).toHaveText('0.1');
  await press(page, '+');
  await expect(display(page)).toHaveText('0.1+');
  await press(page, '0');
  await expect(display(page)).toHaveText('0.1+0');
  await press(page, '.');
  await expect(display(page)).toHaveText('0.1+0.');
  await press(page, '2');
  await expect(display(page)).toHaveText('0.1+0.2');
  await press(page, '=');
  await expect(display(page)).toHaveText('0.3');
});

// A2: 循環小數 2/3。12 位長尾 0.666666666667 是可接受行為，
// 護欄只鎖「不爆成 17 位浮點雜訊」。
test('循環小數 2/3: 2 / 3 = 0.666666666667', async ({ page }) => {
  await press(page, '2');
  await expect(display(page)).toHaveText('2');
  await press(page, '/');
  await expect(display(page)).toHaveText('2/');
  await press(page, '3');
  await expect(display(page)).toHaveText('2/3');
  await press(page, '=');
  await expect(display(page)).toHaveText('0.666666666667');
});

// A3: 循環小數 1/3。12 位長尾 0.333333333333 是可接受行為。
test('循環小數 1/3: 1 / 3 = 0.333333333333', async ({ page }) => {
  await press(page, '1');
  await expect(display(page)).toHaveText('1');
  await press(page, '/');
  await expect(display(page)).toHaveText('1/');
  await press(page, '3');
  await expect(display(page)).toHaveText('1/3');
  await press(page, '=');
  await expect(display(page)).toHaveText('0.333333333333');
});

// A4: 除零。10 / 0 應顯示 Error (parser 對 divisor 0 回傳 'Error')。
test('除零: 10 / 0 = Error', async ({ page }) => {
  await press(page, '1');
  await expect(display(page)).toHaveText('1');
  await press(page, '0');
  await expect(display(page)).toHaveText('10');
  await press(page, '/');
  await expect(display(page)).toHaveText('10/');
  await press(page, '0');
  await expect(display(page)).toHaveText('10/0');
  await press(page, '=');
  // toHaveText(string) is already an EXACT full-string match, so this pins the
  // display to precisely "Error" and rejects any future "Error: div by zero"
  // variant; the empty-string check pins that the preview truly cleared.
  await expect(display(page)).toHaveText('Error');
  await expect(preview(page)).toHaveText('');
});

// NTH-3: negative-result rounding guard. All A1-A4 use non-negative inputs;
// a sign-stamped rounding regression (e.g. round(Math.abs(x)) then negate)
// would go undetected. 1 - 4/3 = -0.333333333333 (verified via node:
// Math.round((1 - 4/3 + Number.EPSILON) * 1e12) / 1e12).
test('負結果仍走 12 位 rounding: 1 - 4/3 = -0.333333333333', async ({ page }) => {
  await press(page, '1');
  await press(page, '-');
  await press(page, '4');
  await press(page, '/');
  await press(page, '3');
  await press(page, '=');
  await expect(display(page)).toHaveText('-0.333333333333');
});

// NTH-4: percentage regression guard. percentage() is NOT rounded, so 5.678 / 100
// = 0.05678 (exact under the current formula) — pins the percentage path so a
// future addition of rounding is caught as a reviewed change, not a silent one.
test('百分比路徑不爆浮點尾: 5.678 % = 0.05678', async ({ page }) => {
  await press(page, '5');
  await press(page, '.');
  await press(page, '6');
  await press(page, '7');
  await press(page, '8');
  await press(page, '%');
  await expect(display(page)).toHaveText('0.05678');
});
