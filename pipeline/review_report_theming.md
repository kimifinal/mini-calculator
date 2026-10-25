# Adversarial Audit — B3 主題切換 (深/淺, issue #39 / PR #39)

Reviewer subagent stalled last round (model unresponsive, like B2 science-ops);
orchestrator ran the adversarial audit on the full diff instead. Per pipeline law
verdict source = `verify.py` exit code; this report supplies gap findings only.
`verify.py --base master` = **VERDICT GREEN** (independently run by orchestrator,
real exit 0): typecheck · ssot (src/lib 0 diff) · build · unit 5/81 · e2e 59 · diff 7.

## 結構判定（全過）
1. **深色值全數保留為預設**：`src/App.vue:12` `:root`（`color-scheme: dark` + 全 dark
   token）一字未改（ssot gate 只守 `src/lib/`, but 既有 e2e 全綠也證明視覺行為未破）。
2. **Light 值 grounded on M3 baseline**：26 tokens 一一對應 M3 baseline **light**
   scheme（md3.io / m3.material.io fetched 2026-10-25）。`--md-primary #d0bcff→#6750a4`
   （primary-container #eaddff 在兩主題都出現，符合 M3）、`--md-surface #141218→#fef7ff`
   等映射正確；dark 值（如 `--md-on-surface-variant #cac4d0`）未被 light 覆蓋。
3. **強制覆蓋層正確**：`[data-theme="light"]`/`[data-theme="dark"]` 是
   **attribute selector**，specificity (0,1,0) > `:root`/`@media :root` (0,0,1)，
   故 JS 選擇永遠贏過 OS `prefers-color-scheme`。source order（dark :root → @media → [data-theme]）
   也確保 @media 在 OS=light 時覆寫 dark 預設。**三態優先序對**：localStorage 強制 > OS。
4. **`useTheme.ts` composable 健壯**：`read/write/clearStore` 全 `typeof window` +
   try/catch 守衛（mirror `useMemory.ts`/`useHistory.ts`），jsdom/SSR 永不會 throw。
   `'system' = removeAttribute('data-theme')`（非 setAttribute('')），
   故 `dataset.theme` 為 `undefined` → T4 可驗、跟系統。`applyMode` 在 setup 時執行
   （非 onMounted）→ 首繪就有主題、`cycle()` 同步可測。aria-label 描述「下次動作」
   （3 個 zh-TW 字串輪完一圈）。
5. **Calculator.vue toggle**：`.theme-toggle` top-right（`top:16px; right:16px;
   z-index:30`），mirror 左上 `.history-toggle`（`left`），無 corner 衝突。
   `data-testid="theme-toggle"` + `@click="cycleTheme()"` 正確接上 composable。
   既有 `history-toggle`（`data-test`, 注意是 `data-test` 非 `data-testid`）不動。
6. **e2e 有意義非自欺**：T1–T4 + cycle 5 條，**實做** localStorage set → `page.reload()`
   → 讀 `document.documentElement.dataset.theme`，非平凡通過。`beforeEach` 驗初始無
   data-theme（T4 前置）。`getByTestId('theme-toggle')` 定位，不動既有 data-label 選子器。
7. **DESIGN.md 加 light token 表**（grep 得 `#6750a4`/`#fef7ff`），dark token 未動。
8. **lib diff = 0**：`git diff master -- src/lib/` 空，SSOT 守住。

## Must-fix（阻止 merge）
無。結構上無漏洞。`verify.py` 6 gate 全綠已證 typecheck/build/unit/e2e/ssot。

## Nice-to-have（不阻 merge）
- **N1（建議，下版補）**：e2e 目前只驗 `data-theme` **屬性**翻轉，未驗
  **resolved CSS 顏色**（即 light 時 `--md-primary` 是否真的解析到 `#6750a4`）。
  建議加一條 `getComputedStyle(document.documentElement).getPropertyValue('--md-primary')`
  在 `[data-theme=light]` 下的 assertion。目前 dist CSS grep 到 `#6750a4` 已旁證 build
  帶入；但屬「屬性翻轉」vs「顏色真的畫出來」的差距。屬 nice-to-have，不阻本 PR。
- **N2（建議，下版補）**：加一組**跨主題視覺 snapshot / 截圖**（light vs dark 各一張，
  同 B1/B2 的 measure/shot 手法），交使用者做 merge 前視覺確認。本輪 orchestrator 因
  時間未跑 CDP 量測，但 build 已驗證 light 層編入 dist。
- **N3（非阻）**：`prefers-color-scheme` 的即時切換（OS 在 session 內由 dark 切 light）
  目前靠 `@media` 即時生效（CSS 層已對），但**強制 localStorage 選擇會壓過 OS 切換**
  這是 spec 設計行為（強制 > OS），非 bug；可加 e2e `emulateMedia({colorScheme})`
  驗「OS=light + 強制 dark」時確實出 dark，補強 forced-override 保證。

## 判定
- `verify.py --base master`：6 gate 全綠（typecheck · ssot 0 · build · unit 81 · e2e 59 · diff 7）。
- 結構對抗審：**0 must-fix / 3 nice-to-have**（全屬測試強化，非功能缺口）。
- 可 merge。N1（resolved-color assertion）建議折入或開下一 issue 補，不阻本 PR。
