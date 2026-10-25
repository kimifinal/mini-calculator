# Spec — B3 主題切換（深/淺，issue 待 GitHub 編號）

## 目標
目前 only MD3 dark baseline。加 **light 主題**：① 跟系統 `prefers-color-scheme`
自動切換；② 按鈕可在 light/dark/system 三態切換；③ 選擇 localStorage 記憶。
**純 CSS 變數切換，不動 `src/lib/`（ssot gate 保持，不需 `--allow-lib`）**。

## 關鍵：token 映射（grounded on M3 baseline）
現在全部 token 在 `src/App.vue:12` 的 `:root`（dark baseline）。**深色值全數保留為
預設**（維持現有行為）；加 light 值。app 的 `--md-*` 是舊版 MD3 命名，各映射到 M3
baseline **light** 對應 role（深色 → 淺色）：

| Token（app 舊名） | role | dark（現值，保留為預設）| **light（新增）** |
|---|---|---|---|
| `--md-primary` | primary | `#d0bcff` | `#6750a4` |
| `--md-on-primary` | on-primary | `#381e72` | `#ffffff` |
| `--md-primary-container` | primary-container | `#4f378b` | `#eaddff` |
| `--md-on-primary-container` | on-primary-container | `#eaddff` | `#21005d` |
| `--md-secondary` | secondary | `#ccc2dc` | `#625b71` |
| `--md-on-secondary` | on-secondary | `#332d41` | `#ffffff` |
| `--md-secondary-container` | secondary-container | `#4a4458` | `#e8def8` |
| `--md-on-secondary-container` | on-secondary-container | `#e8def8` | `#1d192b` |
| `--md-tertiary` | tertiary | `#efb8c8` | `#7d5260` |
| `--md-on-tertiary` | on-tertiary | `#492532` | `#ffffff` |
| `--md-error` | error | `#f2b8b5` | `#b3261e` |
| `--md-on-error` | on-error | `#601410` | `#ffffff` |
| `--md-error-container` | error-container | `#8c1d18` | `#f9dedc` |
| `--md-on-error-container` | on-error-container | `#f9dedc` | `#410e0b` |
| `--md-surface` | surface | `#141218` | `#fef7ff` |
| `--md-on-surface` | on-surface | `#e6e0e9` | `#1d1b20` |
| `--md-surface-variant` | surface-variant | `#49454f` | `#e7e0ec` |
| `--md-on-surface-variant` | on-surface-variant | `#cac4d0` | `#49454f` |
| `--md-outline` | outline | `#938f99` | `#79747e` |
| `--md-outline-variant` | outline-variant | `#49454f` | `#cac4d0` |
| `--md-sc-lowest` | sc-container-lowest（body 底）| `#0f0d13` | `#ffffff` |
| `--md-sc-low` | sc-container-low（shell）| `#1d1b20` | `#f7f2fa` |
| `--md-sc` | sc-container | `#211f26` | `#f3edf7` |
| `--md-sc-high` | sc-container-high | `#2b2930` | `#ece6f0` |
| `--md-sc-highest` | sc-container-highest（數字鍵/歷史面板）| `#36343b` | `#e6e0e9` |
| `--md-sc-bright` | sc-bright | `#3b383e` | `#fef7ff` |

（light 值來源：M3 baseline light scheme，md3.io / m3.material.io，已 fetched 2026-10-25。）

## 架構決策
1. **深色為預設**：`:root { color-scheme: dark; …現值 }` 保持不變（現有 e2e 行為不動）。
2. **跟系統**：`@media (prefers-color-scheme: light)` 覆蓋 `:root` 為上表的 light 值
   （`color-scheme: light`）。
3. **強制覆蓋層**：加 `[data-theme="light"]` 與 `[data-theme="dark"]` 在 `:root` 上，
   兩者優先級高於 `@media`，讓 JS toggle 能覆蓋系統。三態優先：
   `localStorage('calc-theme-v1')` = `'light'|'dark'`（強制）> 系統 `prefers-color-scheme`。
4. **toggle 按鈕**：頂端一圓形 icon 按鈕（同 `history-toggle` 樣式），置於
   **右上角**（現有 `history-toggle` 在左上），`data-testid="theme-toggle"`、
   `data-label="theme"`、`aria-label` 隨狀態切換（`'切換為淺色'`/`'切換為深色'`/
   `'跟隨系統主題'`）；icon 用 ☀ / ☾ / A 或文字。點擊 cycle：light → dark → system（或
   兩態 light/dark，依 coder 判定，需 e2e 能斷言翻轉 + 持久）。
5. **setup 時讀 localStorage**：`main.ts` 或 `App.vue` setup 加 `:root` 的
   `data-theme` 屬性 + 讀 `localStorage('calc-theme-v1')`；無則不設（跟系統）。

## 約束
- **不動 `src/lib/`**（純 CSS + 一個 composable/inline 邏輯；ssot gate 保持，不需要
  `--allow-lib`）。
- 不改既有 `data-label` 選子器（e2e 全用 data-label/text，主題切換不影響既有断言）。
- 所有新文案 zh-TW，過 `s2t.py`（無簡體殘留）。
- 不動 `DESIGN.md` 的深色值；只**新增** light token 表 + toggle 說明。

## 驗收表 (acceptance)
| ID | 行為 | 斷言方式 | gate |
|----|------|---------|------|
| T1 | 點 toggle 後 `document.documentElement` 的 `data-theme` 翻轉 | 讀 `dataset.theme` | e2e |
| T2 | 切換後 localStorage `calc-theme-v1` 有對應值 | 讀 localStorage | e2e |
| T3 | 載入時若 localStorage 設了 `'light'`，根元素 `data-theme==='light'` | `localStorage.setItem` + `reload()` 後斷言 | e2e |
| T4 | 無 localStorage 時根元素無 `data-theme`（跟系統，不強制） | 清 localStorage + reload 後 `dataset.theme` 為 undefined | e2e |
| T5 | 舊 e2e 全綠（主題不影響既有 text/行為斷言） | 47（+B1 4 + B2 7）| e2e |
| T6 | DESIGN.md 加 light token 表 | grep 含 `#6750a4`/`#fef7ff` | manual |
| T7 | `git diff master -- src/lib/` 為空 | ssot gate（verify.py 不加 `--allow-lib`）| ssot |

## 判定
- `verify.py --base master`（**不加 `--allow-lib`**）全綠：typecheck · ssot · build ·
  unit · e2e · diff。
- 視覺確認：Coder 建置後由 orchestrator 用 `prefers-color-scheme` 模擬截圖交使用者確認
  （merge 前的非強制視覺 gate）。

## 版本
- Variant B（單一 Coder + 單 Reviewer + verify.py）。
