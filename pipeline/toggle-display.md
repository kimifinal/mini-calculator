# Spec — fix toggle-over-display (issue #43)

## 問題
B3 加的主题切換鈕 `.theme-toggle` 是 `position:absolute; top:16px;right:16px`，
和 in-flow 的 `.display` 佔同一 16px 上半帶。因 display 字右對齊，右上鈕壓在
display 文字上（使用者圈圖 `img_009400dfcd1b.jpg`）。左上歷史鈕因左對齊、display
文字在右，故未明顯壓到。

量測 BEFORE（`scripts/measure_toggle.mjs`，viewport 400x820）：
- `.theme-toggle` top=57.8 bottom=97.8；`.display` top=57.8 bottom=147.8
  → **hOverlap=40, vOverlap=40, overlaps_display=true**（完全重合）。

## 修法（選 A，min diff + 不動選子器）
把兩個 toggle 收進 in-flow `.top-row`（`flex; justify-content:space-between;
margin-bottom:10px`），兩顆鈕去掉 `position:absolute`，靠 `space-between` 分置左右。
`.display` 在 `.top-row` 之後自然往下流 → 重疊消失。
**data-testid / data-label / aria-label 全數保留**（既有 e2e 全用這些選子器，
不 break）。

## 幾何驗證（修後，同量測腳本）
- `.theme-toggle`/`.history-toggle` top=32.8 bottom=72.8；`.display` top=82.8
- **vOverlap=-10px, overlaps_display=false**（10px 空檔，互不重疊）
- 視覺（`afters_fix.png`，淺色主題）：兩鈕同排對稱、display 數字/keypad 正常。

## 判定（verify.py --base master，GREEN exit 0）
- typecheck · ssot（src/lib 0 diff，純 template+CSS）· build · unit 81 · e2e 62 · diff 1
- e2e 全綠（62 = 54 既有 + B3 12 新主題測），無 geometry-sensitive assertion 被破。

## 驗收（e2e 新增一條護欄）
- A1：`getBoundingClientRect` 驗 `.theme-toggle`.bottom < `.display`.top
  （toggle 不與 display 重疊），放 tests/e2e/toggle.spec.ts 或塞進 theme.spec.ts。
