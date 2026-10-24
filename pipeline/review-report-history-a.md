# Reviewer audit — #17 history UX 修正 (A 案)

Reviewer: orchestrator (qwen Coder subagent 連續 3 次幻覺，orchestrator 接手為
Reviewer，直接審 diff，不採用任何 subagent 自報數字)。
基線: master `43fdb1d` (59 unit / 13 e2e)。
分支: `feature/ux-history-a`。

## Verdict: PASS
必须改動 (must-fix): 0
可選 (nice-to-have): 2 (N1, N2，不阻擋)

## 驗收表 (逐點對照 pipeline/feat-ux-history-a.md)

| # | Spec 要求 | 狀態 | 證據 (檔案:行為) |
|---|-----------|------|--------------------|
| 1 | 左上角 SVG 時鐘 icon | PASS | `Calculator.vue` `.history-toggle` SVG (circle + 2 line)，32x32、淡 sage |
| 2 | 顯示永遠在頂端、不被面板蓋 | PASS | `.calculator` flex column；panel 作 `.input-area` 的 flow child、絕非 overlay |
| 3 | 鍵盤 ↔ 面板 swap（同一區） | PASS | `.buttons` `v-show="!historyVisible"`、`history-panel` `v-show="historyVisible"`，同屬 `.input-area` |
| 4 | 點歷史列 → 載入結果 + 自收折 | PASS | `loadHistoryEntry` 末加 `historyVisible.value = false`；e2e #14 驗證 `toBeHidden()` |
| 5 | 歷史錄入邏輯不動 | PASS | `git diff master -- src/composables/useHistory.ts` 空、`src/lib/` 空 |
| 6 | 無新依賴 | PASS | `package.json` / `package-lock.json` 不在 diff |
| 7 | 50-cap / 最新在上 / localStorage 守衛 | PASS | `useHistory.ts` 未被 touches，既有 10 筆 unit 歷史測試仍過 |
| 8 | 不回歸既有測試 | PASS | unit 59/59、e2e 由 13→14 (多 1 筆自收折) |

## 改動範圍
`src/components/Calculator.vue` (~295 行改、全在 template + style，script 僅
`loadHistoryEntry` 加 1 行自收折) + `tests/e2e/calculator.spec.ts` (+1 測試)。
`src/lib/` / `useHistory.ts` / `package*.json` 完全未動。

## 測試實證 (orchestrator 親跑，非 subagent 自報)
- typecheck: 0
- unit: 59/59 (3 files)
- e2e: 14/14
- build: 通過
- **verify.py --json: 6/6 GREEN** (typecheck·ssot·build·unit·e2e·diff)

## 踩到的坑 (已修)
- 第一次新 e2e 寫 `3 8 =` 是 legacy 模式無運算元，`= `因 `operator===null` 而
  return、不記錄歷史 → 測試的 `toBeVisible` 失敗。修正為 `3 + 8 =` 才記歷史。
  这是**測試 bug、不是組件事故**，已修正並確認 14/14。

## nice-to-have (不阻擋，留 B 案)
- **N1 iOS 精確度**: A 案是 bottom-sheet (歷史長在鍵盤位)，非 iOS 的「鍵盤整片
  退讓、歷史佔上方」+ 滑入動畫。使用者要求精確貼 iOS 時走 B 案。
- **N2 可達性**: 時鐘 icon 目前靠 `aria-label` (已加)，但缺 keyboard 觸發
  (Enter/Space on the icon button) — 未來補 `@keydown`。

## 結論
**PASS，0 must-fix**，可開 PR 交使用者 merge。
