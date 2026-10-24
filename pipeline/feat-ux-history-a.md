# Spec: #17 — History UX 修正(A 案)

## 問題
打開歷史時 `.history-panel` 蓋在顯示區上(`position:absolute; top:0; left:0; right:0`),
擋住大數字。左上角是「歷史」長條按鈕,不符合 iOS 風格。

## 目標(只做 A 案,輕量、無新依賴)
1. **左上角 SVG 時鐘 icon** 取代「歷史」長條按鈕(淡色、不搶眼)
2. 歷史面板改為 **bottom-sheet** 式:鍵盤縮小、歷史從底部長出,顯示區永遠在最頂端
3. **顯示區大數字固定顯示在最頂端**,不受面板展開影響
4. 點擊歷史列 → 載入結果 + 面板自動收折(保留 `justEvaluated=true` 語意)
5. chevron 指示(展開/收折)

## 不做(B 案,下輪)
- 時間分組(「4 天前」)、動畫過渡、⋮ 選單

## 驗收
- `verify.py --ssot diff` GREEN:`src/lib/` 完全不動
- 所有現有 unit/e2e 不回歸
- `npm run build` 通過
- 點擊歷史列 → 結果載入到 display、面板收回、鍵盤正常

## 改動範圍(預估,精確以最終 diff 為準)
- `src/components/Calculator.vue` — 歷史 UI 重構(按鈕 → SVG icon、面板 bottom-sheet 化)
- `tests/unit/Calculator.spec.ts` — 歷史測試選擇器更新(按鈕 data-test、面板結構),不新增測試數
- `tests/e2e/calculator.spec.ts` — 歷史場景選擇器更新,15/15 不回歸
- 新增 `src/composables/useHistoryToggle.ts`(可選:抽離展開/收折狀態機)
- 不加任何 npm 依賴

## 關鍵約束
- `src/lib/` 完全不動(SSOT)
- 歷史錄入邏輯(legacy + expression、50 上限、localStorage)不動
- `loadHistoryEntry` 語意不動(載入結果 + `justEvaluated=true` + 回 legacy mode)
