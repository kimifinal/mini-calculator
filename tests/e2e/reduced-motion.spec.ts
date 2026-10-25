/**
 * prefers-reduced-motion 護欄 e2e 護欄 (issue #51 / C6)。
 *
 * 實測發現:動畫早已存在(.history-panel 的 panel-in 0.3s,逐格 opacity 0->0.97;
 * copy-toast/fold/chevron 皆 0.25s)。C6 補的是 a11y 尾巴——OS「減少動態」時,這些
 * 動畫仍照跑。App.vue 加了一個 @media (prefers-reduced-motion: reduce) 的 cascade-zero
 * 塊(transition/animation duration + delay -> 0s !important)。
 *
 * 護欄驗兩件事:
 *   M1 — 開啟 reduce 時,代表元素的 computed animation-duration 與 transition-duration
 *        都解析為 0s(護欄真的生效)。
 *   M2 — 常態(無 reduce)下,同元素是 0.25s / 0.3s 這種非零值(證明 M1 是「護欄把動畫
 *        關掉」,不是「本來沒動畫」)。
 *
 * 用永遠在 DOM 的動畫元素做探針:
 *   - .keyboard 永遠在 DOM, 有 transition:transform/opacity 0.3s -> 測 transition。
 *   - .history-panel (v-show, 永遠在 DOM) 有 animation: panel-in 0.3s -> 測 animation。
 * 註:selector 必須內聯進 page.evaluate,page.evaluate 跑在 page 端,看不到測試檔的
 *  module-level const(否則 ReferenceError)。
 */
import { test, expect } from '@playwright/test';

// 讀元素的 computed duration(s);selector 由 caller 傳進(不碰 page 端看不到的 const)。
const durations = (
  page: import('@playwright/test').Page,
) =>
  page.evaluate(
    () => {
      const get = (s: string) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const st = getComputedStyle(el);
        return {
          animationDuration: st.animationDuration,
          transitionDuration: st.transitionDuration,
        };
      };
      return {
        // 永遠在 DOM 的動畫要素
        anim: get('.history-panel'), // animation: panel-in 0.3s
        trn: get('.keyboard'), // transition: transform/opacity 0.3s
      };
    },
  );

// "0.3s" -> 0.3 (秒); "0s" -> 0; "0.25s, 0.06s, 0.12s" -> 最大分量。
// 全 0 ("0s, 0s, 0s") -> 0。元素缺(null) -> -1(測試會 loud-fail)。
const maxSec = (s: string | null): number => {
  if (s == null) return -1;
  const nums = s.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length === 0) return -1;
  return Math.max(...nums.map((n) => parseFloat(n)));
};

test('M1: prefers-reduced-motion=reduce 時,動畫/過渡 duration 解析為 0s', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const d = await durations(page);
  expect(d.anim, 'history-panel 應在 DOM').not.toBeNull();
  expect(d.trn, 'keyboard 應在 DOM').not.toBeNull();
  // reduce 下:動畫 + 過渡 都應 0s
  expect(maxSec(d.anim!.animationDuration)).toBe(0);
  expect(maxSec(d.trn!.transitionDuration)).toBe(0);
});

test('M2: 常態(無 reduce)下,動畫/過渡 duration 是非零值', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: null });
  await page.goto('/');
  const d = await durations(page);
  expect(d.anim, 'history-panel 應在 DOM').not.toBeNull();
  expect(d.trn, 'keyboard 應在 DOM').not.toBeNull();
  // 常態: panel-in 0.3s (animation), keyboard transition 0.3s —— 都非 0
  expect(maxSec(d.anim!.animationDuration)).toBeGreaterThan(0);
  expect(maxSec(d.trn!.transitionDuration)).toBeGreaterThan(0);
});
