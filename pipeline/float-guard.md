# Spec — B1 浮點 e2e 護欄 (issue #34)

## 目標

`src/lib/expression.ts:219` 與 `src/components/Calculator.vue:128` 已對結果做
`Math.round((x + Number.EPSILON) * 1e12) / 1e12` 規整，故 `0.1 + 0.2 → 0.3` 不爆長。
但缺 e2e 邊界護欄，日後若有人改 rounding 邏輯無測試攔下。本輪只補 e2e。

## 範圍與約束

- **純測試**：新增 e2e，**不改任何 `src/` 與 `src/lib/`**（SSOT 護欄：verify.py
  的 `ssot` gate 跑 `git diff master -- src/lib/`，非空即 RED）。
- 檔：僅新增 `tests/e2e/` 內（沿用既有 `calculator.spec.ts` 的
  `press()` / `display()` helper 風格；可新增獨立 `float.spec.ts` 或加進現有檔，
  以維持 e2e 既有綠為準，勿動既有測試）。
- 顯示端語意（已由 node 端同式 rounding 對照確認，照此寫斷言）：
  - `0.1+0.2=` → 主顯示 `0.3`
  - `2/3=` → `0.666666666667`
  - `1/3=` → `0.333333333333`
  - `10/0=` → `Error`
- `2/3`、`1/3` 的 12 位長尾是**可接受行為、非 bug**；護欄只鎖「不爆成 17 位浮點雜訊」。
- 顯示 0.3：主列是 `String(rounded)`，非 `toFixed`。

## 驗收表 (acceptance)

| # | 行為 | 輸入序列 | 期望主顯示 | gate |
|---|------|----------|-----------|------|
| A1 | 浮點雜訊被規整 | `0` `.` `1` `+` `0` `.` `2` `=` | `0.3` | e2e |
| A2 | 循環小數 2/3 | `2` `/` `3` `=` | `0.666666666667` | e2e |
| A3 | 循環小數 1/3 | `1` `/` `3` `=` | `0.333333333333` | e2e |
| A4 | 除零 | `1` `0` `/` `0` `=` | `Error` | e2e |

## 判定

- 綠 = `verify.py --base master` 6 gate 全綠（含 `ssot` 空、`e2e` 綠、`diff` 非空）。
- 不信任 subagent 自陳 test 數字；以 verify.py exit code 為準（pipeline 鐵律）。

## 版本

- 變體 B（單一 Coder + 單 Reviewer + verify.py）：純測試新增、風險低，不需 Variant A。
