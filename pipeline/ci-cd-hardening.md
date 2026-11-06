# Spec — C9: CI/CD 加固（issue #54）
## 目標
補上三項 CI/CD 職缺必備：
1. **master required status checks**（CI 綠了才能 merge——真正 gate，不是資訊）
2. **ESLint** 加入 lint gate（style + static check，補 vue-tsc 的 type-check 缺口）
3. **Coverage 門檻 gate**（v8 覆蓋率低于設定的 4 個數值時 `test:coverage` 變 RED）

## 變動摘要
| 檔 | 改動 |
|---|---|
| 無程式碼變更 | `master` branch protection（required status checks），**API 端**（HTTP 200 verified；`required_status_checks: [Lint + Unit + E2E]`）；公開 repo 可透過 classic `PUT /branches/master/protection` 設置 |
| `eslint.config.js`（新）| ESLint 9 flat config + `tseslint.config()` + `vue-eslint-parser` → TS parser for `.vue`；ignore `tests/`；silence 4 條壓縮網格風格 rule |
| `package.json` | 新增 4 個 devDeps（eslint, @eslint/js, typescript-eslint, eslint-plugin-vue）；`lint` 改為 `vue-tsc --noEmit && eslint .`；新增 `lint:eslint` script |
| `vite.config.ts` | `coverage.thresholds` = `{statements:80, branches:80, functions:65, lines:80}`；all set below current baseline (80.71/84.04/70.19/80.71) |
| `.github/workflows/ci.yml` | 新增 `Lint (ESLint)` step (visible gate)；重命名 `Coverage report` → `Coverage gate`；更新 C7→C9 註解 |
| `src/components/Calculator.vue` | eslint `--fix` 自動修正 2 行 style（0 functional change） |

## 判定
- `verify.py --base master` 全綠：typecheck · ssot · build · unit 81 · e2e 73 · diff 5/6
- `npm run test:coverage` exit 0（覆蓋率門檻 80/80/65/80 all passed）
- `npm run lint` = `vue-tsc --noEmit && eslint .` 全綠（0 errors, 0 warnings）
- master required status checks API 端已 verified HTTP 200（`/branches/master/protection` GET 回傳 200、含 `checks: [{context: Lint + Unit + E2E}]`）

### 為什麼這三項不是「多餘」
- **Required checks**：不加的話 CI 綠只是資訊，不阻止 merge；加之後 master 只接受綠的 PR。
- **ESLint**：`vue-tsc` 只管 type；ESLint 補 style/lint 缺口（unused vars, console.log, etc.）。
- **Coverage gate**：C7 只顯示覆蓋率，C9 讓覆蓋率**低於門檻 = RED**。`functions: 65` 是最敏感的（70.19% baseline），任何 regressions 都會擋。

## 版本
Variant B（orchestrator 自實，純 infra + small CSS fix；reviewer 可審 eslint config 與 coverage thresholds 是否合理）。
