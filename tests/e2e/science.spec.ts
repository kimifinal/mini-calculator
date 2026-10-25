/**
 * 科學運算鍵 e2e 護欄 (issue #36 / B2)。
 *
 * 新增一列 sci row：x² √ 1/x xʸ。前三個是一元、即時作用於目前數字（像 %，
 * 不需要的 "="），xʸ 則把右結合的指數運算子 '^' 接進運算式。這些測試沿用
 * float.spec.ts 的 press()/display()/preview() helper 風格，透過 Playwright +
 * Vite preview 點按螢幕按鈕，走的是使用者實際的操作路徑。
 *
 * EXACT 期望字串（已 node 驗證，勿更動）：
 *   S1  9·9   = 81
 *   S2  √9    = 3
 *   S3  neg-domain √ = 'Error'
 *   S4  1/5   = 0.2
 *   S5  1/0   = 'Error'
 *   S6  2^3   = 8
 *   S7  2^(3^2) = 512   （右結合）
 */
import { test, expect } from '@playwright/test';

// 主顯示列 (testid='display')。
const display = (page: import('@playwright/test').Page) =>
  page.getByTestId('display');

// 預覽列 (testid='display-preview')，顯示運算式目前的即時結果。
const preview = (page: import('@playwright/test').Page) =>
  page.getByTestId('display-preview');

// 按 data-label 對應的螢幕按鈕 (與 float.spec.ts 同款 helper)。
async function press(page: import('@playwright/test').Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 重新載入後顯示應為 0。
  await expect(display(page)).toHaveText('0');
});

// --- 科學運算鍵 護欄 -------------------------------------------------------

// S1: x² 是「一元、即時」——按完 9 再按 x² 即刻得 81，不需 '='。
// justEvaluated=true 使隨後殘留的 '=' 成為 no-op，故此處不補 '='。
test('S1: x² 即平方 — 9 x² = 81', async ({ page }) => {
  await press(page, '9');
  await expect(display(page)).toHaveText('9');
  await press(page, 'x²');
  await expect(display(page)).toHaveText('81');
});

// S2: √ 一元即時，√9 = 3。
test('S2: √ 即平方根 — 9 √ = 3', async ({ page }) => {
  await press(page, '9');
  await expect(display(page)).toHaveText('9');
  await press(page, '√');
  await expect(display(page)).toHaveText('3');
});

// S3: 負域（negative radicand）即時回 'Error'。護欄鎖的是「負數開根號 → Error」
// 這條路徑，因此必須餵一個真正為負的底。sci row 沒有變號鍵，故用既有的減號按鈕
// 先算出一個負值（5 - 9 = -4），再按 √。√(0) 在數學上 = 0（非 Error），故不能用
// 純 '0' 來觸發 Error——若以 0 為底只會得 0，護欄便形同虛設。最後一步是 √，一元
// 即時，故不補 '='。
test('S3: √ 負域即時回 Error — 5 - 9 = 再 √ = Error', async ({ page }) => {
  await press(page, '5');
  await press(page, '-');
  await press(page, '9');
  await press(page, '=');
  await expect(display(page)).toHaveText('-4');
  await press(page, '√');
  await expect(display(page)).toHaveText('Error');
});

// S4: 1/x 一元即時，1/5 = 0.2。
test('S4: 1/x 即倒數 — 5 1/x = 0.2', async ({ page }) => {
  await press(page, '5');
  await expect(display(page)).toHaveText('5');
  await press(page, '1/x');
  await expect(display(page)).toHaveText('0.2');
});

// S5: 1/0 即時回 'Error'（除零），一元，不補 '='。
test('S5: 1/x 除零即時回 Error — 0 1/x = Error', async ({ page }) => {
  await press(page, '0');
  await expect(display(page)).toHaveText('0');
  await press(page, '1/x');
  await expect(display(page)).toHaveText('Error');
});

// S6: xʸ 把右結合的 '^' 接進運算式，2^3 = 8。
test('S6: xʸ 接指數 — 2 xʸ 3 = 8', async ({ page }) => {
  await press(page, '2');
  await expect(display(page)).toHaveText('2');
  await press(page, 'xʸ');
  await expect(display(page)).toHaveText('2^');
  await press(page, '3');
  await expect(display(page)).toHaveText('2^3');
  await press(page, '=');
  await expect(display(page)).toHaveText('8');
});

// S7: 右結合護欄 — 2 xʸ 3 xʸ 2 = 2^(3^2) = 512，而非 (2^3)^2 = 64。
// 這是唯一能區分左/右結合的用例，護欄不容弱化。
test('S7: ^ 右結合 — 2 xʸ 3 xʸ 2 = 2^(3^2) = 512', async ({ page }) => {
  await press(page, '2');
  await press(page, 'xʸ');
  await press(page, '3');
  await press(page, 'xʸ');
  await press(page, '2');
  await expect(display(page)).toHaveText('2^3^2');
  await press(page, '=');
  await expect(display(page)).toHaveText('512');
});
