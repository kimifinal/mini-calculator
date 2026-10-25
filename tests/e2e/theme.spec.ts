/**
 * 主題切換 e2e 護欄 (B3 / issue #39): light / dark / system.
 *
 * 驗收 T1–T4 (pipeline/theming.md):
 *   T1 — 點 toggle 後 document.documentElement.dataset.theme 翻轉。
 *   T2 — 切換後 localStorage 'calc-theme-v1' 有對應值。
 *   T3 — 載入時若 localStorage 設 'light'，根元素 data-theme === 'light'。
 *   T4 — 無 localStorage 時根元素無 data-theme (跟系統，不強制)。
 *
 * 三個狀態: system -> light -> dark -> system。'system' 以「移除 data-theme 屬性」
 * 表示 (故 dataset.theme 為 undefined)。持久化 key 為 'calc-theme-v1'。
 *
 * 測試全程只讀 DOM / localStorage，不改任何既有 text/行為，故不影響 T5
 * (既有 e2e 全綠)。toggle 的 data-testid='theme-toggle'、data-label='theme'。
 */
import { test, expect } from '@playwright/test';

const KEY = 'calc-theme-v1';

// 讀 <html> 上的 data-theme (未設時 dataset.theme 為 undefined)。
const themeAttr = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme);

// 點右上角主題切換鈕 (由 data-testid 定位，與既有 data-label 選子器互不干擾)。
async function clickTheme(page: import('@playwright/test').Page) {
  await page.getByTestId('theme-toggle').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 全新情境：localStorage 空、無強制主題，根元素不應帶 data-theme。
  expect(await themeAttr(page)).toBeUndefined();
});

// --- T1: 點 toggle 令 data-theme 翻轉 --------------------------------------
// 從 system (未設) 點一次 -> 'light'：翻轉被直接觀察到。
test('T1: 點 toggle 令 document.documentElement.dataset.theme 翻轉', async ({
  page,
}) => {
  const before = await themeAttr(page);
  expect(before).toBeUndefined();

  await clickTheme(page);

  const after = await themeAttr(page);
  expect(after).toBe('light');
  expect(after).not.toBe(before);
});

// --- T2: 切換後 localStorage 有對應值 --------------------------------------
// 每次點擊持久化當下模式 (system 例外——移除 key)。連續點三次走完
// light -> dark -> system，逐步驗收 key 的值。
test('T2: 切換後 localStorage calc-theme-v1 有對應值', async ({ page }) => {
  // system -> light
  await clickTheme(page);
  expect(
    await page.evaluate((k) => window.localStorage.getItem(k), KEY),
  ).toBe('light');

  // light -> dark
  await clickTheme(page);
  expect(
    await page.evaluate((k) => window.localStorage.getItem(k), KEY),
  ).toBe('dark');

  // dark -> system：持久化被清除 (跟系統，不留強制選擇)
  await clickTheme(page);
  expect(await page.evaluate((k) => window.localStorage.getItem(k), KEY)).toBeNull();
});

// --- T3: 預設 localStorage='light' + 重新載入 -> data-theme='light' --------
test('T3: localStorage 設 light 後重新載入 -> data-theme=light', async ({
  page,
}) => {
  await page.evaluate((k) => window.localStorage.setItem(k, 'light'), KEY);
  await page.reload();

  await expect(page.getByTestId('theme-toggle')).toBeVisible();
  expect(await themeAttr(page)).toBe('light');
});

// --- T4: 無 localStorage + 重新載入 -> 根部無 data-theme (跟系統) ----------
test('T4: 無 localStorage 時重新載入 -> 根元素無 data-theme', async ({
  page,
}) => {
  // 先留一個強制值，證明這一步是「真正清除」後的結果、不是初始就沒設定。
  await page.evaluate((k) => window.localStorage.setItem(k, 'light'), KEY);
  await page.evaluate((k) => window.localStorage.removeItem(k), KEY);
  await page.reload();

  await expect(page.getByTestId('theme-toggle')).toBeVisible();
  expect(await themeAttr(page)).toBeUndefined();
});

// --- (補) 完整三態週期: system -> light -> dark -> system -------------------
// 加強 T1：證明 cycle 真的在三個狀態間滾動，而非只翻一次。
test('B3-cycle: system -> light -> dark -> system', async ({ page }) => {
  expect(await themeAttr(page)).toBeUndefined(); // system (undefined)
  await clickTheme(page);
  expect(await themeAttr(page)).toBe('light');
  await clickTheme(page);
  expect(await themeAttr(page)).toBe('dark');
  await clickTheme(page);
  expect(await themeAttr(page)).toBeUndefined(); // 回到 system
});

// --- N1 (hardening, from review_report_theming.md) -------------------------
// e2e 不只驗 data-theme 屬性翻轉，還驗 resolved CSS 色（getComputedStyle
// 真的解析到 light / dark token），證明「顏色真的畫出來」而不只是屬性。
const primaryOf = async (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--md-primary')
        .trim(),
  );

test('N1: forced light resolves --md-primary to baseline light value', async ({
  page,
}) => {
  await page.evaluate((k) => window.localStorage.setItem(k, 'light'), KEY);
  await page.reload();
  expect(await themeAttr(page)).toBe('light');
  expect(await primaryOf(page)).toBe('#6750a4');
});

test('N1: forced dark resolves --md-primary to baseline dark value', async ({
  page,
}) => {
  await page.evaluate((k) => window.localStorage.setItem(k, 'dark'), KEY);
  await page.reload();
  expect(await themeAttr(page)).toBe('dark');
  expect(await primaryOf(page)).toBe('#d0bcff');
});

// --- N3 (hardening) --------------------------------------------------------
// 強制 localStorage 選擇壓過 OS prefers-color-scheme：OS=light 但強制 dark 時，
// 真的出 dark token（證明 forced > OS）。
test('N3: forced dark beats OS prefers-color-scheme=light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate((k) => window.localStorage.setItem(k, 'dark'), KEY);
  await page.reload();
  expect(await themeAttr(page)).toBe('dark');
  expect(await primaryOf(page)).toBe('#d0bcff'); // dark 贏過 OS light
});

// --- A1 (regression guard, issue #43) -------------------------------------
// The theme toggle (top-right) must NOT overlap the display band below it: the
// toggle's bottom edge must sit ABOVE the display's top edge. This is the
// geometry guard for the bug where the absolute-positioned theme toggle rode on
// the display's top band (display text is right-aligned, so the right toggle
// covered it). Headless Chromium renders the toggle in-flow above the display
// after the .top-row fix, so toggle.bottom < display.top must hold.
test('A1: theme toggle does not overlap the display band', async ({ page }) => {
  const { toggleBottom, displayTop } = await page.evaluate(() => {
    const t = document.querySelector('.theme-toggle')?.getBoundingClientRect();
    const d = document.querySelector('.display')?.getBoundingClientRect();
    return { toggleBottom: t?.bottom ?? 0, displayTop: d?.top ?? 0 };
  });
  expect(toggleBottom).toBeLessThan(displayTop);
});
