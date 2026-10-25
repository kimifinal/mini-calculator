# Spec — C6 prefers-reduced-motion 護欄 (issue #51)

## 實情（實測,非記憶）
動畫**早已存在**（`_motion_probe.mjs` 實測）：
- `.history-panel` 有 `@keyframes panel-in`，opacity 逐格 0 → 0.8 → 0.97（0.3s）— animation 真跑。
- `.copy-toast` `transition: opacity/transform 0.25s`；`.fold-row`/`.memory-row` `0.25s`；chevron `0.25s`。
故 ROADMAP C6「歷史/toast 現在瞬間」是**陳舊描述**（同 C5 鍵盤、C7 coverage 一樣）。

真正缺口：**`@media (prefers-reduced-motion: reduce)` 計 0**——OS「減少動態」時動畫仍照跑，
非 a11y 完整。

## 變動（純 CSS + e2e，不進 src/lib/）
- `src/App.vue` 全球 style 加 `@media (prefers-reduced-motion: reduce)` 塊，cascade-zero
  `* / *::before / *::after` 的 `transition-duration` + `animation-duration` + 兩者 delay
  全 `0s !important`。
  - 選 cascade-zero 而非 per-element：一併覆蓋現有**與未來**動畫，不用每個新動畫重複記。
  - 必同時 zero `transition` **與** `animation`（`panel-in`/`display-copied` 是真 keyframe,
    只 zero transition 停不到它們）。
- `tests/e2e/reduced-motion.spec.ts`：
  - **M1**：`emulateMedia({reducedMotion:'reduce'})` 下，`.history-panel` animation-duration
    與 `.copy-toast` transition-duration 都解析 `0s`。
  - **M2**：常態（無 reduce）下同一元素 duration 是**非零**值（0.3s）——證明 M1 是「護欄關掉
    現有動畫」，不是「本來沒動畫」（反制 C6 陳舊描述的誤導）。

## 判定（verify.py --base master 全綠, report-only 不進 src/lib）
- 純加法,不改常態動畫行為（M2 鎖此不變量）。
- 既有 e2e 全維持綠（reduce 只在 `emulateMedia reduce` 場景生效,不碰其他 spec）。
- ssot `git diff master -- src/lib/` 空。

## 版本
Variant B（orchestrator 自實,純 CSS + e2e guard；reviewer 审 cascade-zero 覆蓋面 + M2 不變量）。
