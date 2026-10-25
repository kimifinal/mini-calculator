# ROADMAP.md — mini-calculator

功能藍圖。跟 `DESIGN.md`（視覺 SSOT）與 `spec.md`（行為 spec）互參，記錄「下一步做什麼」。
**更新時間**：2026-10-24（#14 merged at `53e0fd6`）。

## 常規（先看）

- **Issue-first**：任何 bug / feature 先開 GitHub issue、再動 code。
  `~/.hermes/scripts/github_issue_flow.py` 負責 `new` / `mark` / `resolve`。
  修復早於 tracking issue 補建時，用一個空 commit 帶 `Closes #N` 建立雙向連結。
- **SSOT**：`src/lib/`（`calculator.ts` / `expression.ts`）是核心，擴功能原則上加
  **純函数到 lib + composable 到 `src/composables/`**，組件層只接 UI。
- **四角色 pipeline**：Coder / Reviewer 走 `delegate_task` subagent，verdict 只取
  `verify.py` 的 exit code（不信 subagent 自陳）。
- **驗證**：每輪跑 `python3 ~/.hermes/scripts/verify.py typecheck build unit e2e`
  六門全綠、且 `src/lib/` 0 檔未動。

## 現況快照（2026-10-23，master 綠）

核心運算全在 `src/lib/`：`parseExpression` / `isOperator` / `calculate` / `percentage`。

| 項目 | 狀態 | ref |
|---|---|---|
| 四則 + 括號運算式 | ✅ | #1, #3(% 取餘) |
| 變號 ± / 退格 ⌫ / AC | ✅ | #8, #10 |
| 歷史面板（localStorage 持久、點回重用、全清） | ✅ | #13, #17 |
| PWA：離線 + 可安裝 | ✅ | #15 |
| 複製結果（長按 / 鍵盤，手機 PWA 友好） | ✅ | #25 |
| 雙列顯示（運算式 + 即時結果，iOS 風格） | ✅ | #22 |
| a11y（WAI-ARIA / 螢幕閱讀器 / 鍵盤 / focus-visible） | ✅ | #27 |
| MD3 dark 視覺 | ✅ | #20, `DESIGN.md` |
| 記憶鍵 M+ / M- / MR / MC（摺疊鍵簇 + 持久化） | ✅ | #14, `useMemory.ts` |
| SW autoUpdate（部署後自動更新，不卡舊版） | ✅ | #29 已關 |

### 已知技術注意（已修，防回歸）
- 手機長按複製要加 `user-select:none / -webkit-touch-callout:none`（headless e2e 假綠，
  真機原生選取會搶跑）。護欄：`tests/e2e/copy.spec.ts` A8。見 skill `pwa-mobile-false-greens`。
- vite-plugin-pwa 用 `registerType: 'autoUpdate'`（非 `workbox.updateStrategy`、非
  `injectRegister:'autoUpdate'`，那兩個是錯的 key）。部署後確認 `sw.js` 含 `skipWaiting`。

---

## 待辦（按 實益 × 風險 排序）

### A. 先收掉（#14 已完成，見下）
| # | 項目 | 狀態 |
|---|---|---|
| **#14** | 記憶鍵 M+ / M- / MR / MC | ✅ merged `53e0fd6`：`useMemory.ts` composable + 摺疊鍵簇 + localStorage（fold + value 各持久）；4 行為 + 展開/摺疊 e2e 全綠。 |

> ✅ A3 已完成（PR #38 `decbcfd`）：`pipeline/` 審查紀錄 + `scripts/` 量測腳本已打包進 repo。

### B. 高實益 / 低風險
1. **浮點精確度 e2e 護欄**：✅ merged（PR #35）`tests/e2e/float.spec.ts` 四筆護欄
   （`0.1+0.2=0.3`、`2/3`、`1/3`、除零）+ 負結果 / 百分比護欄。
2. **科學運算鍵 `x²`/`√`/`1/x`/`xʸ`**：✅ merged（PR #37）4 鍵 `.sci-row` 置於 keypad
   上方，`^` 進 shunting-yard（右結合 `2^3^2=512`）；7 筆 e2e。
3. **主題切換（深/淺/跟系統）**：✅ merged（PR #40）`f61bee4`：`useTheme.ts`
   三態 composable（light→dark→system）+ `localStorage('calc-theme-v1')` 記憶 +
   `@media (prefers-color-scheme)` 跟 OS + `[data-theme]` 強制覆蓋層（specificity
   0,1,0 壓過 0,0,1）；右上角 `.theme-toggle`（mirror 左上歷史鈕）；light token
   grounded on M3 baseline light（`--md-primary #6750a4`/`--md-surface #fef7ff`）。
   **不進 lib**（ssot 0 diff）；12 筆新 e2e（T1–T4 + 週期 + N1 resolved-color +
   N3 forced>OS）。
4. **歷史面板增強**：現只有「點回重用 + 全清」。加 **匯出 CSV**、搜尋、時間戳。
   對專業工作流實益高。

### C. 體驗 / 專業感（加分項）
5. **鍵盤輸入**：✅ `onKey`（window keydown，`Calculator.vue:429`）已實作
   `0–9 / . / + - * / / % / ^ / ( ) / Enter(=) / Backspace / Escape`，並由
   `tests/e2e/keyboard.spec.ts`（K1–K8）鎖定（issue #47）。原「只認螢幕鍵+長按」為
   陳舊描述——鍵盤輸入早已支援，缺口只是無 e2e 護欄，#47 補上。補 a11y 鍵盤尾巴。
6. **動畫 / 過渡（MD3 motion）**：✅ 動畫其實早已存在（`panel-in` 0.3s 等，
   `_motion_probe` 實測 opacity 0→0.97 真跑）；原「現在瞬間」為陳舊描述。真正補的是
   **`prefers-reduced-motion` a11y 護欄**（#51，`App.vue` cascade-zero + M1/M2 e2e）——
   OS「減少動態」時動畫解析 0s。
7. **測試覆蓋儀表板**：✅ v8 coverage 進 CI、baseline lib 94.9 % / 全 80.7%（#49, PR #50）。
8. **自訂 accent 色**：⏳ 暫緩（#53 / issue open）；M3 調色盤 + localStorage 待設計確認後實做。

### D. 收尾（無功能變更，建議最後做）
- **A3 把審查/量測 artifact 打包進 repo**：`pipeline/*.md`（spec + review report + run log）
  與 `scripts/measure_fold.mjs`、`shot_gapfix.mjs` 等仍為 untracked。開一個
  `chore/pipeline-artifacts` 小 PR 收進 repo，不進 feature diff gate
  （`verify.py` 的 diff/ssot 只看 tracked 變更）。

---

## 建議執行順序
`B3 主題切換` ✅ → 下一項 `B4 歷史匯出（CSV/搜尋/時間戳）` → C 類（體驗）→
（自訂主題色 #8 可當 B3 延伸）。
**已完成**：A 類 #14（`53e0fd6`）、A3 pipeline artifact（PR #38 `decbcfd`）、
B1 浮點護欄（PR #35）、B2 科學運算（PR #37）、**B3 主題切換（PR #40 `f61bee4`）**。

## 建議與文件的對應
- 任何視覺變更 → 改 `DESIGN.md` token、再改 CSS（不 hard-code hex）。
- 任何行為變更 → 改 `spec.md`、再改 `src/lib/`。
- 新 feature → 開 issue（A/B/C 任一）→ 四角色 pipeline → `verify.py` 綠 → merge。
- ~~`spec.md` 仍寫 `glassmorphism`，但 `DESIGN.md` 已標移除——下次行為變更時一併校正 `spec.md`。~~
  ✅ 已校正（#45）：`spec.md` styling 行同步為 MD3 solid tonal（no glass/gradients）。
