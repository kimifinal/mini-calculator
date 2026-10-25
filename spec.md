# 專案概述
開發一個基於 Vue.js 的簡易計算機組件，支援基本四則運算，並提供運算式（括號優先級）模式。

## 技術棧
- Framework: Vue.js 3 (Composition API, TypeScript)
- Build: Vite + Vitest (unit) + Playwright (e2e)
- Styling: CSS3 (Material Design 3, solid tonal surfaces + elevation; no glass / gradients — see `DESIGN.md`)

## 組件架構
- `Calculator.vue`: 核心組件。
    - `Props`: 無
    - `Emits`: `result-calculated`
    - `Internal State`: `displayValue` (String), `firstOperand` (Number), `operator` (String), `mode` ('legacy' | 'expression')。
- `lib/calculator.ts`: 單值四則運算 SSOT（`calculate` / `percentage`）。
- `lib/expression.ts`: 運算式解析器（shunting-yard，支援 `+ - * /` 與括號、一元負號）。

## 邏輯與約束
- 支援加 (+)、減 (-)、乘 (*)、除 (/)。
- **錯誤處理**：當除數為 `0` 時，必須將顯示值設為 `"Error"`。
- **百分比**：`%` 鍵為百分比（÷100），非取餘。
- **運算式模式**：按 `(` 進入 expression mode，可輸入含括號的完整運算式（如 `(1+2)*(3+4)`），按 `=` 交由 shunting-yard 解析器依優先級求值；按 `AC` 返回 legacy mode 並歸零。

## 測試需求
- 驗證加法：`5 + 3 = 8`
- 驗證除法（正常）：`10 / 2 = 5`
- 驗證除法（異常）：`10 / 0 = "Error"`
- 驗證運算式：`(1+2)*(3+4) = 21`、`(2+3*4) = 14`
- 驗證百分比：`50 % = 0.5`
