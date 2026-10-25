# Spec — C5 鍵盤輸入 e2e 鎖定 (issue #47)

## 實情（實測,非 ROADMAP 舊描述）
`window.addEventListener('keydown', onKey)`（`src/components/Calculator.vue:429`）**已實作鍵盤輸入**：
`0–9`（regex `'0'..'9'`）、`.`、`+ - * /`、`%`、`^`、`(` `)`、`Enter`/`=`、`Backspace`、`Escape`
全部路由到既有 handler。故 **鍵盤輸入功能本已存在**,ROADMAP C5「現在只認螢幕鍵+長按」是
2026-10-24 的陳舊文案。C5 的真正缺口：**鍵盤路徑零 e2e 護欄**（code line 428 自承
"best-effort, not part of the e2e suite"）。

## 實測 expected（orchestrator 已量,勿重推、勿弱化）
以 `page.keyboard` 打整組 key、讀 `[data-testid="display"]`：
| case | 鍵序 | expected | 量測出 |
|---|---|---|---|
| K1 乘法 | `7 * 8 Enter` | `56` | ✓ |
| K2 加法 | `5 + 3 Enter` | `8` | ✓ |
| K3 括號 | `( 1 + 2 ) * ( 3 + 4 ) Enter` | `21` | ✓ |
| K4 幂(右結合) | `2 ^ 3 Enter` | `8` | ✓ |
| K5 連續小數 | `1 . 5 + 1 . 5 Enter` | `3` | ✓ |
| K6 退格 | `1 2 3 Backspace 4` | `124` | ✓ |
| K7 百分比 | `5 0 %` | `0.5` | ✓ |
| K8 除零錯誤 | `1 0 / 0 Enter` | `Error` | ✓ |

**鐵律**：以上值是 orchestrator 實測,Coder **照抄,不得重算、不得放寬**（guard-rail 的價值就在
邊界值嚴格）。每條 case 用 `Escape` 重置（`Escape` 路由到 `reset()`）後再打下一組。

## 範圍（test-only,不碰 product / src/lib）
- 新增 `tests/e2e/keyboard.spec.ts`：8 條 case（K1–K8）如上,讀
  `getByTestId('display')` 的 `textContent`。
- **不**加任何 product 鍵盤功能——現有路徑已足夠,**只加護欄**。
- **不**改 `src/lib/*`（ssot gate、0 diff）。
- **不**改既有 `data-testid`/`data-label` 選子器 → 全數既有 e2e 維持綠。
- 校正 `ROADMAP.md` C5 行：原「實機電腦打 7*8= 就能算（現在只認螢幕鍵+長按）」→
  改為「鍵盤輸入 `onKey` 已實作（0-9 / 運算子 / 括號 / ^ / Enter / Backspace / Escape）
  並由 `tests/e2e/keyboard.spec.ts` 鎖定;補 a11y 鍵盤尾巴。」

## 驗收（verify.py --base master 全綠）
- typecheck · ssot(src/lib 0 diff,不需 --allow-lib) · build · unit(不增) ·
  **e2e(62 + 8 = 70,含 K1–K8)** · diff(≤3 檔:keyboard.spec.ts + ROADMAP.md + 本 spec)。
- 62 既有 e2e 全維持綠（無 geometry/selector 改動）。

## 版本
Variant B（單一 Coder + 單一 Reviewer + verify.py）。test-only,不觸 product 路徑。
