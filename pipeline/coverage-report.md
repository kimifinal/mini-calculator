# Spec — C7 測試覆蓋儀表板 (issue #49)

## 目標
讓「哪條 `src/lib/` 路徑沒被 unit test 打到」可見（c8 / vitest v8 coverage
進 CI）。ROADMAP C7。

## 現況（實測,非記憶）
- `vitest` 已設（`vite.config.ts` test 段）、5 unit / 81 tests 全綠。
- `@vitest/coverage-v8` 在 `node_modules` 缺 → 裝 `^2.1.8`（解析到 2.1.9，與
  `vitest` 2.1.9 完全對齊，同一 major，無 major 落差風險）。
- registry 可達（nc 443 open），install 成功。

## 變動
- `package-dev` 裝 `@vitest/coverage-v8@^2.1.8`（`package-lock.json` 已收 3 refs）。
- `vite.config.ts` `test.coverage`: provider `v8`，reports `text/text-summary/
  json-summary/html`，`include` 聚焦 `src/lib/**` + `composables/**` +
  `Calculator.vue`。**無 threshold**（report-only，絕不讓 build 變紅；數值閘是
  後期 C 決）。
- `package.json` 加 `test:coverage: vitest run --coverage`。
- `.github/workflows/ci.yml` 加 **Coverage report** step（`npm run test:coverage`）
  + 上傳 `coverage/` artifact；`.gitignore` 加 `coverage/` report 不進 repo。

## 判定（real numbers, report 產得出）
`npx run test:coverage` baseline：
| 區 | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| **All** | 80.73 | 84.04 | 70.19 | 80.73 |
| `expression.ts` | **98.18** | 90.38 | 100 | 98.18 |
| `calculator.ts` | 78.78 | 90 | 50 | 78.78 |
| composables | 92.06 | 71.79 | 100 | 92.06 |

C7 的「未測路徑可見」已達成（`calculator.ts` 最弱 78%，`uncovered 38-59,66-67,74-75`
等列出；`expression.ts` 最強 98%）。數值 threshold 留待後期 C 決，本次不加。

- 純 test 基建，不進 `src/lib/`（ssot 0 diff）。
- `verify.py --base master` 應全綠（unit/e2e 不增，coverage report 非 verify.py
  的 gate，但 CI 多一個 step）。

## 版本
Variant B（orchestrator 自實，test 基建;reviewer 審 CI wiring + report 正確性）。
