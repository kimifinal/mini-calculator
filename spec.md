# 專案概述
開發一個基於 Vue.js 的簡易計算機組件，支援基本四則運算。

## 技術棧
- Framework: Vue.js 3 (Composition API)
- Styling: CSS3 (Standard)

## 組件架構
- `Calculator.vue`: 核心組件。
    - `Props`: 無
    - `Emits`: `result-calculated`
    - `Internal State`: `displayValue` (String), `firstOperand` (Number), `operator` (String).

## 邏輯與約束
- 支援加 (+)、減 (-)、乘 (*)、除 (/)。
- **錯誤處理**：當除數為 `0` 時，必須將顯示值設為 `"Error"`。

## 測試需求
- 驗證加法：`5 + 3 = 8`
- 驗證除法（正常）：`10 / 2 = 5`
- 驗證除法（異常）：`10 / 0 = "Error"`
