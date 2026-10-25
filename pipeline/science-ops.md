# Spec — B2 科學運算鍵 x² / √ / 1/x / xʸ (issue #36, ROADMAP B2)

## 目標
加四個科學運算鍵，走現有 SSOT 架構，不動其他模塊。

## 決策（已與使用者確認）
- xʸ 走**路徑 A**：`^` 當 binary operator 進 shunting-yard（右結合，precedence
  高於 `* /`、低於/等同 unary tier 之下），不使用 flag hack。
- UI 走 **C1**：新增一列 `sci row`（`x² √ 1/x xʸ` 四鍵，永久顯示，非摺疊），
  放在 keypad 最上方、不動既有 21 鍵的任何位置 → 既有 e2e 全 backward-compat。

## 變動範圍
1. **`src/lib/calculator.ts`**（unary SSOT 三函式 + xʸ binary case）：
   ```ts
   // 同 percentage() 層，CalcResult 回傳
   export function square(n: number): CalcResult { ... }          // n*n
   export function sqrtOp(n: number): CalcResult { return n < 0 ? 'Error' : Math.sqrt(n); }
   export function reciprocal(n: number): CalcResult { return n === 0 ? 'Error' : 1/n; }
   // calculate() 加 case，Operator 擴為 '+|-'|'*'|'/'|^'
   case '^': return Math.pow(first, second);
   ```
2. **`src/lib/expression.ts`**（`^` grammar）：tokenize 認 `^`、`PRECEDENCE['^']`
   設定（右結合，precedence 高於 `* /`=2，如 3）、`toRPN` 右結合彈棧規則、
   `evalRPN` 的 `case '^'` 回傳 `Math.pow(a,b)`。`Operator`/`Token` 型別擴 `^`。
3. **`src/components/Calculator.vue`**：
   - `handleSquare/handleSqrtOp/handleReciprocal`：同 `handlePercentage` 模式
     （Error 時重設、結果走 `Math.round((x+EPS)*1e12)/1e12` 規整、justEvaluated=true）。
   - `handlePower()`：同 `handleOp` 但 append `^`（取代尾端運算子邏輯同 op）。
   - template：鍵盤 grid 上方新增 `.sci-row`（4 鍵；`data-label` 分別
     `x²`/`√`/`1/x`/`xʸ`；class `btn sci`；各帶 zh-TW `aria-label`；
     `@click` 綁上述 handler）。不動既有 21 鍵的 DOM/位置。
   - `onKey` 物理鍵盤：可選補 `^`（非 e2e 範圍，標為 nice-to-have）。
4. **`DESIGN.md`**：Layout 碼塊加 sci row、Components 表加 sci key token、
   一節說明（unary 即時作用、xʸ 為 binary `^`）。

## 約束
- 只改 `src/lib/{calculator,expression}.ts`、`Calculator.vue`、`DESIGN.md`、
  新 `tests/e2e/science.spec.ts`。不動 composables / history / memory / 既有 CSS
  token 值 / 既有 e2e。
- 浮點規整：unary 結果與 `^` 結果都走 `Math.round((x+EPS)*1e12)/1e12`（與現有
  percentage / 主路徑一致）。
- `src/lib/` 本輪**預期**變動，故 verify.py 加 `--allow-lib`（ssot gate 放行的
  唯一理由），Coder 需確認 lib 改動只限上述兩檔、無其他 lib 被動。

## 驗收表 (acceptance)
| ID | 輸入序列 | 期望主顯示 | gate |
|----|----------|-----------|------|
| S1 | `9 x² =` | `81` | e2e |
| S2 | `9 √ =` | `3` | e2e |
| S3 | `5 - 9 =` 再 `√` | `Error`（負域：`√(負數)` 無實根；注意 `√0 = 0` 非 Error，故須餵真負值 `-4`） | e2e |
| S4 | `5 1/x =` | `0.2` | e2e |
| S5 | `0 1/x =` | `Error` | e2e |
| S6 | `2 xʸ 3 =` | `8` | e2e |
| S7 | `2 xʸ 3 xʸ 2 =` | `512`（2^(3^2) 右結合） | e2e |
| S8 | 既有 47 筆 e2e 全綠（21→25 鍵不破壞既有用例） | — | e2e |

## 判定
- 綠 = `verify.py --base master --allow-lib` GREEN（typecheck·build·unit·e2e·diff；
  ssot 被 --allow-lib 跳過）。
- Coder 自陳數字忽略，以 verify.py exit code 為準。

## 版本
- Variant B（單一 Coder + 單 Reviewer + verify.py）。
