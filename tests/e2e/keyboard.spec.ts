/**
 * 鍵盤輸入 e2e 護欄 (issue #47 / C5)。
 *
 * window keydown 的 onKey（src/components/Calculator.vue:429）已實作鍵盤輸入：
 * 0–9 / . / + - * / / % / ^ / ( ) / Enter(=) / Backspace / Escape(reset)。
 * 本檔用 page.keyboard 鎖住這條既有路徑——它先前「best-effort, not in e2e」
 * (code line 428 自承),C5 補的就是這層護欄。
 *
 * EXACT 期望字串（orchestrator 實測,勿更動、勿重推）：
 *   K1  7 * 8 =            = 56      四則:乘法
 *   K2  5 + 3 =            = 8       四則:加法
 *   K3  ( 1 + 2 ) * ( 3 + 4 ) = 21   運算式:括號
 *   K4  2 ^ 3 =            = 8       幂:接 ^ (右結合,見 S7)
 *   K5  1 . 5 + 1 . 5 =    = 3       小數連續輸入
 *   K6  1 2 3 <Backspace> 4      = 124  (未 Enter,驗 Backspace 退一)
 *   K7  5 0 %               = 0.5    百分比(÷100,一鍵)
 *   K8  1 0 / 0 =          = Error   除零錯誤
 *
 * 每組以 Escape(reset) 開頭,確保獨立。鍵盤路徑 = onKey 的 window keydown 分支。
 */
import { test, expect } from '@playwright/test';

const display = (page: import('@playwright/test').Page) =>
  page.getByTestId('display');

// 每組先 reset(清 justEvaluated + 歸零運算式),避免上一組殘留。
const reset = async (page: import('@playwright/test').Page) => {
  await page.keyboard.press('Escape');
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// --- K1: 鍵盤四則(乘法) ----------------------------------------------------
test('K1: 鍵盤 7*8 = 56', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('7');
  await expect(display(page)).toHaveText('7');
  await page.keyboard.press('*');
  await expect(display(page)).toHaveText('7*');
  await page.keyboard.press('8');
  await expect(display(page)).toHaveText('7*8');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('56');
});

// --- K2: 鍵盤四則(加法) ----------------------------------------------------
test('K2: 鍵盤 5+3 = 8', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('5');
  await page.keyboard.press('+');
  await page.keyboard.press('3');
  await expect(display(page)).toHaveText('5+3');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('8');
});

// --- K3: 鍵盤運算式(括號) --------------------------------------------------
test('K3: 鍵盤 (1+2)*(3+4) = 21', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('(');
  await page.keyboard.press('1');
  await page.keyboard.press('+');
  await page.keyboard.press('2');
  await page.keyboard.press(')');
  await page.keyboard.press('*');
  await page.keyboard.press('(');
  await page.keyboard.press('3');
  await page.keyboard.press('+');
  await page.keyboard.press('4');
  await page.keyboard.press(')');
  await expect(display(page)).toHaveText('(1+2)*(3+4)');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('21');
});

// --- K4: 鍵盤幂 ^ 接進運算式(= B2 xʸ 的鍵盤路徑) --------------------------
test('K4: 鍵盤 2^3 = 8', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('2');
  await page.keyboard.press('^');
  await expect(display(page)).toHaveText('2^');
  await page.keyboard.press('3');
  await expect(display(page)).toHaveText('2^3');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('8');
});

// --- K5: 鍵盤小數連續輸入 --------------------------------------------------
test('K5: 鍵盤 1.5+1.5 = 3', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('1');
  await page.keyboard.press('.');
  await page.keyboard.press('5');
  await page.keyboard.press('+');
  await page.keyboard.press('1');
  await page.keyboard.press('.');
  await page.keyboard.press('5');
  await expect(display(page)).toHaveText('1.5+1.5');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('3');
});

// --- K6: 鍵盤 Backspace 退一(未 Enter,驗即時運算式) ----------------------
test('K6: 鍵盤 123<Backspace>4 = 124', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.keyboard.press('3');
  await expect(display(page)).toHaveText('123');
  await page.keyboard.press('Backspace');
  await expect(display(page)).toHaveText('12');
  await page.keyboard.press('4');
  await expect(display(page)).toHaveText('124');
});

// --- K7: 鍵盤 % 一鍵(÷100,不需 =) -----------------------------------------
test('K7: 鍵盤 50% = 0.5', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('5');
  await page.keyboard.press('0');
  await expect(display(page)).toHaveText('50');
  await page.keyboard.press('%');
  await expect(display(page)).toHaveText('0.5');
});

// --- K8: 鍵盤除零 → Error (護欄鎖錯誤路徑) -------------------------------
test('K8: 鍵盤 10/0 = Error', async ({ page }) => {
  await reset(page);
  await page.keyboard.press('1');
  await page.keyboard.press('0');
  await page.keyboard.press('/');
  await page.keyboard.press('0');
  await expect(display(page)).toHaveText('10/0');
  await page.keyboard.press('Enter');
  await expect(display(page)).toHaveText('Error');
});
