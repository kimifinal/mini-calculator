# Review report — B2 科學運算鍵 x² √ 1/x xʸ (issue #36 / ROADMAP B2)

> 產出方式：本輪 adversarial Reviewer 子代理因 model 端 stall（qwen 連續 5 次
> 無回應 ~3h）未出產出。改由 orchestrator（我）就完整 diff 做 gap 審計——
> 依 pipeline 鐵律，verdict 來源是 `verify.py` 的 exit code，非 reviewer 主觀；
> reviewer 只供應 gap findings，而 gap hunt 我已就實際 diff 完成。
>
> `verify.py --base master --allow-lib` = **GREEN**（typecheck·build·unit 76·e2e 54·diff）。

## 變動範圍（vs master）
- `src/lib/calculator.ts`：新增 `square` / `sqrtOp` / `reciprocal`；`Operator` 擴 `^`；
  `calculate()` 加 `case '^': Math.pow(first, second)`。
- `src/lib/expression.ts`：`OPERATORS` + `PRECEDENCE['^']=4` + token union 加 `^`；
  `toRPN` 右結合 `currentLeftAssoc = kind==='op' && value!=='^'`；`evalRPN` 加 `^`。
- `src/components/Calculator.vue`：4 個 handler + `.sci-row`（4 鍵，置於 `.buttons` 上方）
  + `^` 加入 `displayPreview` / `calculateExpression` 兩個 regex + `onKey('^')`。
- `DESIGN.md`：sci row 佈局 + component token。
- 新 `tests/e2e/science.spec.ts`：7 筆 S1–S7。
- **`git diff master -- src/lib/` = 僅 calculator.ts + expression.ts 兩檔（OK，--allow-lib 唯一理由）。**

## 逐項驗收（線為 science.spec.ts 證據）
| ID | 預期 | 證據行 | 判 |
|----|------|--------|----|
| S1 `9 x²` | `81` | L43–48 | PASS |
| S2 `9 √`  | `3`  | L51–56 | PASS |
| S3 負域 `5-9= → √` | `Error` | L63–71 | PASS（spec 已自「0 √」更正為負值 -4，因 √0=0 非 Error） |
| S4 `5 1/x` | `0.2` | L74–79 | PASS |
| S5 `0 1/x`  | `Error` | L82–87 | PASS |
| S6 `2 xʸ 3 =` | `8` | L90–99 | PASS |
| S7 `2 xʸ 3 xʸ 2 =` | `512` | L103–111 | PASS（右結合護欄，唯一區分 512 vs 64） |

## 對抗式 gap 審計
- **(a) 右結合真實性**：`toRPN` 彈棧 `pop = topPrec>cur || (top===cur && leftAssoc)`，
  `^` 設 `leftAssoc=false`（prec 4）。`2^3^2` 推第二個 `^` 時 top=第一個 `^`(4),
  `4>4` 假、`(4===4 && false)` 假 → 不彈、第二個 `^` 壓在上 → RPN `2 3 2 ^ ^`
  → `3^2=9 → 2^9=512` ✓。若誤改為左結合會得 `(2^3)^2=64`，S7 釘 512 故任何
  左右結合翻轉都會破 S7 → **真護欄，OK**。
- **(b) unary 邊界**：負 radicand（S3）、除零（S5）已護。`√0=0`、`x²(0)=0`、
  `1/x(0.1)=10` **未測**（nice-to-have，非 must-fix，本輪不強制）。三 handler 對
  NaN/empty 都有防護（`|| 0` 或 `Number.isNaN` 檢查）。hasError 時提前 return（Error 凍結）。OK。
- **(c) regex 改動安全**：`^` 加進 `displayPreview` 與 `calculateExpression` 的兩個 regex。
  對**不含** `^` 的既有表達式，`/[+\-*/^()]/` 與舊 `/[+\-*/()]/` 行為**完全相同** →
  不破任何既有 e2e。`'2^'` 這種懸浮 op：`parseExpression('2^')` 回 `'Error'`（dangling
  operator，既有 parser 既定行為）→ 可接受，非回歸。OK。
- **(d) .sci-row 不破舊 e2e**：`grep` 全 `tests/e2e/*.ts` 無 `count()`/`nth()`/
  `getBoundingClientRect`/`queryAll` 任一 → 舊 47 筆全用 `data-label` 選擇器、位置無關，
  新行不會 shift；`sci-row` 用獨立測試 id `sci-row` 與 `sci-square/…`，不衝突。
  54 = 47 + 7 佐證。OK。
- **(e) handlePower 邊界**：`'2' → xʸ → '2^'`；再按 xʸ 時 `/[+\-*/^]$/` 命中尾端 `^` →
  替換而非堆疊 → `'2^'`（非 `'2^^'`）✓。OK。

## MUST-FIX
（無）

## NICE-TO-HAVE（非本輪 blocker，記錄即可）
- NTH-1 補 `√0 = 0` 護欄（防日後誤改 `√0` 成 Error，與 1/x(0)=Error 混淆）。
- NTH-2 補 `0 1/x = 0` 之外、`0.1 1/x = 10` 的浮點規整護欄（`1/0.1` 原始 9.999… → 10）。
- NTH-3 補懸浮 `2^ =` → `Error` 的 e2e，鎖定 dangling-power 行為。
- NTH-4 sci-row 的 4 鍵 aria-label 可補 `role=button` 的 a11y 語意確認（現已帶 aria-label）。

## 結論
- must-fix：0 　 nice-to-have：4（皆非 blocker）
- `src/lib/` 僅 calculator.ts + expression.ts 兩檔改動：是
- e2e 54 / unit 76 / verify.py `--allow-lib` GREEN。
- （verdict 由 verify.py 負責，此報告僅列 gap；依 pipeline 鐵律。）
