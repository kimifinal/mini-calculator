# pipeline/a11y-audit.md — 無障礙(a11y)審計與改善(Spec SSOT, issue #27)

## 定位
對可安裝 PWA 做 a11y 改善:讓螢幕閱讀器 / 鍵盤使用者可用。**非視覺重設** →
依 pipeline,跳過 Designer mockup 門,直接 Architect→Coder。
**不改 src/lib/(SSOT)**;鍵盤 5×4 佈局、既有 `data-label`/`data-test`/`data-paren`、
全數既有 e2e 一律不動。所有改動**純加法**(加語意屬性、加樣式、加鍵盤途徑)。

## 設計決策(已定,低風險)
1. **結果可被朗讀**:主列顯示 `div[data-testid="display"]` 加 `role="status"`
   + `aria-live="polite"` → 螢幕閱讀器在結果變動時朗讀(計算機最核心的 a11y)。
2. **運算鈕語意化**:符號鈕 `÷ × − ( ) ± % ⌫` 現無 `aria-label`,螢幕閱讀器只讀符號。
   加 zh-TW `aria-label`(除/乘/減/開括號/變號/百分比/刪除)。`+`、`=`、數字、`.` 有
   明確文字,可不強制(建議補 `+`「加」、`=`「等號」以一致)。歷史鈕/清除鈕已有
   `aria-label`(維持)。
3. **鍵盤可達長按複製**(#25 只有 pointer 途徑,鍵盤使用者觸不到):
   主列顯示加 `tabindex="0"` + `role="button"` + `aria-label="結果,複製到剪貼簿"`,
   並在其 `@keydown`(Enter 或 Space,`preventDefault`+`stopPropagation`)呼叫現有的
   `copyValue()`——**stopPropagation** 確保不與 window 級的 `=`(Enter)計算重疊;
   非聚焦時 Enter 仍走 window 計算。提供鍵盤使用者對等複製途徑。
4. **鍵盤焦點可見**:新增 `:focus-visible` 樣式(focus 時可見邊框/環),
   用現有 MD3 token(`--md-primary` 類),不動既有視覺。

## 驗收(acceptance — 可e2e/可證)
| # | 驗收 | 驗證 |
|---|---|---|
| A1 | `display` 有 `role="status"` 與 `aria-live="polite"` | e2e: 屬性存在 |
| A2 | 符號運算鈕皆有 zh-TW `aria-label`(÷×−( )±%⌫) | e2e: 逐一 `getAttribute('aria-label')` 非空 |
| A3 | 長按複製有鍵盤途徑:聚焦 display + Enter/Space → 觸發複製(同 pointer 複製, 走 navigator.clipboard.writeText) | e2e: mock clipboard, 聚焦後 keydown 後 `__copied` 有值 |
| A4 | 鍵盤焦點有可見樣式(`:focus-visible`); 鍵盤 Tab 可聚焦到運算鈕與 display | e2e: `page.keyboard` Tab + `:focus` 檢查, 或至少 CSS 規則存在(Review 驗) |
| A5 | `src/lib/` 未動; 鍵盤 5×4 佈局 / 既有 `data-label`/`data-test`/`data-paren` byte-identical; 全數既有 e2e(20)+ 新增全綠 | verify.py + 比對 |

## 邊界 / 不觸及
- `src/lib/calculator.ts`、`src/lib/expression.ts`: 一字不改(SSOT)。
- 不改任何 `data-*`(e2e selector 依此)、不改鍵盤 5×4 佈局、不改既有功能行為。
- `aria-label` 用 **zh-TW**(與 UI 語言一致;`index.html` 已是 `lang="zh-TW"`)。
- 若 `role="button"` 與 `tabindex` 造成某 e2e selector 失配, 改用不破壞選子的
  方式(如 `role` 放在外層 wrapper)——但優先選不破壞現有 `data-testid="display"`。

## 測試
- 可新增 `tests/e2e/a11y.spec.ts`(mock clipboard 同 #25 的 `addInitScript` 手法)。
- 既有 20 e2e 必須全過(屬性為加法, 不應破壞)。

## Variant
**Variant B**(單 Coder + adversarial Reviewer + verify.py)。a11y 是明確的屬性/行為
補強, 無多個合理解 → 不需 Variant A。
