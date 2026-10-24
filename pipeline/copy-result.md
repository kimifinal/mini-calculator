# pipeline/copy-result.md — 複製結果到剪貼簿(Spec SSOT, issue #25)

## Variant
**Variant B**: 一個 Coder + 一個 adversarial Reviewer + verify.py(gate exit code 為 verdict)。
簡單 UI 行為新功能、無多個合理解、無前例紅旗 → 不需 Variant A(多 Coder 並行)。

## 互動設計(已由 Designer 門跟阿陪確認,兩項)
1. **入口 = 長按主列顯示區(display)** → 複製。
   - 不新增鍵位、不新增獨立按鈕,**鍵盤 5×4 佈局完全不變**。
   - 不動 `=`、不動任何運算鍵。
   - 主列顯示區原本不是 button → 需變可觸發(加 pointerdown/pointerup 計時,
     用 `@pointerdown/@pointerup` + `@contextmenu.prevent`,點按主列為 no-op)。
2. **回饋 = 主列結果閃一下 + 小字(副列)顯示「已複製」約 1.2s 後淡出**。
   - 副列(`.display-preview`, `data-testid="display-preview"`)在 1.2s 窗口內顯示「已複製」,
     取代原本的 live preview;到點淡回。副列必須**始終渲染**(不加 v-if)。

## 長按判定
- **長按門檻 = 400ms**(pointerdown 持續)。低於門檻(點擊/快速觸控)不觸發複製。
- 觸發條件:主列 `displayValue` 非空、非純 `Error`;純 '0' 允許複製。

## 複製內容
- 複製 `displayValue.value` 的**字面值**(主列結果),非運算式。
- 用 `navigator.clipboard.writeText(text)`;需 fallback(非 secure context / 舊環境)
  用 `document.execCommand('copy')` 或 `writeText` 失敗不 crash、靜默無操作。

## 不觸及(硬邊界)
- `src/lib/calculator.ts` / `src/lib/expression.ts`: **一字不改**(SSOT, verify ssot gate RED if changed)。
- 運算 / 顯示語意、`=` 行為、括號、percentage、history、±: 不改,僅新增。
- 鍵盤 5×4 佈局、所有 `data-label`/`data-test` 既有鍵: 不改。
- `DESIGN.md` / `tasks.json` / `spec.md` 根: 本次不在 Coder 範圍。
- 副列必須始終渲染(不加 v-if,只改文字插值)。

## 驗收表(acceptance — Coder 必逐條滿足; e2e 用 mock navigator.clipboard)
| # | 驗收 | 驗證方式 |
|---|---|---|
| A1 | 長按 ≥400ms 主列顯示區 → `navigator.clipboard.writeText` 被呼叫一次,引數 = 主列當前值 | e2e: mock clipboard, assert 被呼叫 + 引數 |
| A2 | 短於 400ms(普通點擊)→ **不** 觸發 writeText | e2e: click 後 assert writeText 未被呼叫 |
| A3 | 主列為 `Error` → 不複製(skip) | e2e |
| A4 | 副列(`data-testid="display-preview"`)顯示「已複製」, 約 1.2s 後消失(淡回原樣) | e2e |
| A5 | 純 '0' 允許複製當前值; 空串 skip | e2e |
| A6 | 離線可用: `context.setOffline(true)` + reload 後長按複製不 crash、仍記錄 | e2e |
| A7 | 新增 ≥1 條 e2e 驗證上述; 現有 17 e2e + 全 unit 全綠 | verify.py e2e/unit green |

## 完成門檻(Coder 交付)
- 只改 `src/components/Calculator.vue` + 新增 `tests/e2e/copy.spec.ts`。
- verify.py 六門 green(typecheck/ssot/build/unit/e2e/diff)。
- git status: branch `feature/copy-result`, 未 commit/未 push。

## 備註
- Coder 自陳不可信;唯一算數的判定 = `verify.py` 的 exit code。
- (本檔曾被子代理的 `git clean -fdx` 刪除並已重建, 2026-10-22。)
