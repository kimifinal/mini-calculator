# REVIEW — PR `copy-result` (long-press → copy display value)

Role: **adversarial Reviewer** (Variant B). Gate-driven verdict belongs to `verify.py`
(exit code); this file reports **GAPs only**, not a pass/fail. The change was found
functionally correct against the SSOT `pipeline/copy-result.md`. Findings below are
coverage / hygiene gaps, not spec violations.

---

## 0. Independent re-verification (re-ran myself, not trusted from other agents)

| Check | Result |
|---|---|
| `git diff master -- src/lib/` | **EMPTY** (exit 0) — `calculator.ts` / `expression.ts` untouched ✅ |
| `git diff --name-only master` | only `src/components/Calculator.vue` (modified) ✅ |
| Untracked new test file | `tests/e2e/copy.spec.ts` (correct, the only new test file) ✅ |
| `git status` | branch `feature/copy-result`, **no commit / no push** ✅ |
| `npx vue-tsc --noEmit` | **exit 0** (typecheck green; no `noUnusedLocals` in tsconfig) ✅ |
| `npx vitest run` | **62 passed** (3 files: calculator 11, expression 18, Calculator.spec 33) ✅ |
| e2e new file | **6** `test()` blocks (A1,A2,A3,A4,A6,A7) ✅ |
| e2e pre-existing (`calculator.spec.ts`) | **20** `test()` blocks, **byte-identical to master** ✅ |
| Total e2e | 26 (matches orchestrator's "26 e2e passed") |

Note: spec **A7 says "existing 17 e2e"** but the pre-existing e2e count is **20**
(`calculator.spec.ts` on master). The "17" is a stale/aspirational number in the
spec, not a code defect — A7's real requirement ("≥1 new e2e + existing + unit
green") is satisfied 20 + 6 = 26. No action needed.

---

## 1. Keyboard 5×4 layout / `data-label` / `data-test` — UNCHANGED ✅

`diff <(master grep data-label=) <(HEAD grep data-label=)` → **DATA-LABEL IDENTICAL**.
Template diff vs master touches **only** the `.display` and `.display-preview` divs
(hunks at diff lines ~107–136). All 5 keypad rows, 10 numeric `data-label`s
(`0`–`9`), `AC`/`±`/`( )`/`%`/`/`/`*`/`-`/`+`/`=`/`⌫`/`.` and every `data-test`
attribute are byte-for-byte master-identical. No new key, no operator/`=`/`±`/
paren/history mutation. ✅

---

## 2. Acceptance-table mapping (A1–A7), with line evidence

| # | Requirement | Status | Evidence |
|---|---|---|---|
| **A1** | long-press ≥400ms → `writeText` called, arg = display value | **PASS** | `copyValue()` `Calculator.vue:357` writes `displayValue.value`; A1 test `copy.spec.ts:116–133` asserts `__copied.length>0` **and** `__copied[last]==='8'` (pop-then-length, robust to accumulation). `setTimeout(copyValue,400)` at `:390`; test holds 550ms > 400ms. |
| **A2** | <400ms tap → NOT copy | **PASS** | `tapDisplay` `copy.spec.ts:65` fires pointerdown+pointerup synchronously; `@pointerup="clearLongPress()"` `Calculator.vue:442` cancels timer before 400ms → no `copyValue`. Test asserts `__copied` `toEqual([])` (`:139–145`). |
| **A3** | display `Error` → skip | **PASS** | `copyValue` guard `if (v === '' \|\| v === 'Error') return;` `:359`. A3 test `:148–162` drives `10/0=Error`, long-press, asserts `__copied` `toEqual([])`. ✅ |
| **A4** | preview shows `已複製`, fades ~1.2s | **PASS** | `copiedFlash` ref set in `writeText().then` `:365`; `setTimeout(...,1200)` re-cleared `:367–371`; template `{{ copiedFlash \|\| displayPreview }}` `:459`; `.display--copied` flash class `:440`/`:636`. A4 test `:165–177` asserts `toContainText('已複製')` then `waitForTimeout(1300)` + `not.toContainText`. Window is 1200ms; test waits 1300 — passes with margin. ✅ |
| **A5** | pure `0` copyable; empty-string skip | **PASS (partial)** | `"0"` path: test `copy.spec.ts:211–221` (A7) long-presses fresh `'0'`, asserts copied `'0'` ✅. **Empty-string** half: guard `v === ''` at `:359` is **defensive but UNREACHABLE via the UI** — `displayValue` is init `'0'` and every handler floors it to non-empty (`handleNumber`/`handleDecimal`: `if (displayValue.value==='') ... = '0'` at `:125`,`:146`; `reset()`: `'0'` `:295`). Not exercised by any test. See U3. |
| **A6** | offline: `setOffline(true)`+reload → copy still works, no crash | **PASS** | A6 test `:180–208`: computes online, `context.setOffline(true)`, `reload({waitUntil:'domcontentloaded'})`, asserts display visible (`:192`), recomputes `5+3=8`, long-press, asserts `__copied` contains `'8'` (`:204`). Mock re-installed on reload (`addInitScript` `:85` resets `__copied=[]`). Copy path is network-free (mocked), so offline-safe. ✅ |
| **A7** | ≥1 new e2e + existing+unit green | **PASS** | 6 new e2e (A1/A2/A3/A4/A6/A7 tests) ✅. Existing 20 e2e green + 62 unit green (re-ran above). Spec's "17" is stale (real=20); see §0. |

---

## 3. Adversarial branch hunt → UNTESTED paths & edge cases

All wired branches were traced by inspection; the **implementation is correct**, the
gaps are **test coverage**.

### U1 (HIGH-priority for coverage, not a defect): `pointerleave` / `pointercancel` mid-press cancel — wired but UNTESTED
`Calculator.vue:443–444` wire `@pointerleave="clearLongPress()"` and
`@pointercancel="clearLongPress()"`. By inspection correct: a leave/cancel before 400ms
clears `copyTimer` → `copyValue` never fires. **But `copy.spec.ts` dispatches only
`pointerup`** (inside `longPressDisplay`/`tapDisplay`) — 0 occurrences of
`pointerleave`/`pointercancel` in any test. The two early-release cancel paths are
uncovered.
→ **Add:** two e2e (or component) tests: pointerdown → wait ~150ms → dispatch
`pointerleave` (and separately `pointercancel`) → assert `__copied` stays `[]` AND
no `已複製` flash appears.

### U2 (MED): second copy within 1.2s — timer **reset** wired but UNTESTED
`copyValue` `:366` does `if (copiedFlashTimer !== undefined) clearTimeout(copiedFlashTimer)` before re-arming the 1200ms window (`:367–371`). Correct by inspection: a 2nd copy inside the window cancels the pending fade and restarts the 1.2s; after the window the callback already set the handle to `undefined` (`:369`) so the guard is skipped and a fresh timer arms. **Not tested.**
→ **Add:** test firing two long-presses ~400ms apart; assert flash still visible ~500ms after the 2nd and gone only ~1.3s after the 2nd (proves reset, proves it does NOT fade at the 1st copy's schedule).

### U3 (LOW): empty-display skip — branch unreachable via UI
Guard `v === ''` (`:359`) is dead through normal UI (displayValue floored to `'0'`).
Defensive & harmless. → Optional: a **unit** test mounting the component and forcing
`displayValue=''` then invoking the pointer handler, asserting no writeText. Or just
document it as unreachable. Do not block on it.

### U4 (NOTE, not a defect): `onBeforeUnmount` clears timers but not the refs
`:397–401` clears both `copyTimer` (via `clearLongPress`) and `copiedFlashTimer` —
so no orphan `setTimeout` leaks / no state-update-after-unmount. It does **not** reset
`justCopied`/`copiedFlash` refs, but the component instance is discarded on unmount so
that is correct and safe. No action. (Flagged so a future reviewer doesn't "fix" it.)

### N1 (cleanup, recommended): unused `watch` import
`Calculator.vue:2` was changed to `import { ref, computed, watch, onMounted, onBeforeUnmount }`
but **`watch` is never used** (grep: import-line only). It passes `vue-tsc` because
tsconfig has no `noUnusedLocals` (confirmed exit 0). Dead import.
→ **Fix:** drop `watch` from the import. Becomes a MUST-FIX automatically if a strict
lint gate (eslint `no-unused-vars` / vue-tsc `noUnusedLocals`) is ever added.

### N2 (coverage, minor): copy of a LIVE expression (pre-`=`) is untested
All copy tests copy a post-`= result (`5+3=8`→'8') or `'0'`/`Error`. Copying a live
expression (e.g. `9+9` with displayValue `'9+9'`) also calls `writeText('9+9')` and
would flip `copiedFlash`, then — after 1.2s — the `copiedFlash || displayPreview`
`:459` reverts to the computed preview `'18'`. This interaction is untested.
→ Optional: one test asserting flash-then-revert-on-a-typing-expression.

### Verified-correct adversarial questions (no finding)
- **Fast tap really doesn't copy:** A2 + `onDisplayPointerDown`/`clearLongPress`
  logic. pointerup before 400ms cancels the only `copyTimer` → no fire. ✅
- **`writeText` resolves but flash never shows (the race the coder worried about):**
  flash is set **inside** `writeText().then` (`:363–371`), so it appears only on
  success; a rejection hits `.catch` (`:373`) → silent, no crash, no flash — matches
  spec "writeText 失敗不 crash、靜默無操作". No resolve-without-flash race. ✅
- **Silent-catch / non-secure-context fallback:** `navigator.clipboard?.writeText(v)
  ?.then().catch()` — optional chaining short-circuits the whole chain if clipboard is
  `undefined` (jsdom / non-secure ctx) → no throw; outer `try/catch` (`:360`/`:376`)
  is belt-and-suspenders. This is the spec's "OR" fallback (writeText-fail-silent),
  not the `execCommand` branch — compliant. ✅
- **`navigator`/`writeText` availability guards** don't crash; confirmed.
- **No duplicate `onMounted`/`onBeforeUnmount`:** the diff *replaced* the original
  single-line ones with the new multi-line versions that re-`addEventListener('keydown')`
  / `removeEventListener` exactly once — balanced, no double-registration. ✅
- **`copyTimer`/`copiedFlashTimer` are setup-scope `let`** (`:329`/`:331`): per-instance
  in Vue 3 `<script setup>`, no cross-instance leakage. ✅
- **`justEvaluated` path:** post-`=` displayValue is the promoted result (`'8'`) while
  `displayPreview` returns `''` (`:58`) — long-press copies the right value and the
  preview line is free to show `已複製` without clash. ✅
- **jsdom/unit copy path never exercised** — only e2e (which uses Chromium). Acceptable;
  e2e is the spec's chosen vehicle. Note: not a gap worth blocking.

---

## 4. src/lib hard boundary — CONFIRMED clean
`git diff master -- src/lib/` → **empty**. `calculator.ts` (SSOT `percentage`/`Operator`)
and `expression.ts` (`parseExpression`) unchanged. No arithmetic/display-semantic/
`=`/paren/percentage/history/`±` mutation — purely additive. ✅

---

## 5. Checklist summary
- [x] Only `Calculator.vue` modified + `copy.spec.ts` added (matches Coder scope).
- [x] `src/lib/**` empty diff (SSOT respected).
- [x] Keyboard 5×4 / `data-label` / `data-test` identical to master.
- [x] 400ms threshold; tap no-op; Error/empty skip; pure-`0` copyable.
- [x] `已複製` flash ~1.2s then fade; preview always rendered (no `v-if`).
- [x] Offline copy path safe; no crash.
- [x] Re-ran `vue-tsc` (0) + `vitest` (62 pass) myself; green.
- [ ] (NICE) unused `watch` import (N1).
- [ ] (NICE) untested: pointerleave/pointercancel cancel (U1), timer-reset on 2nd copy (U2), live-expression copy (N2).
- [ ] (NOTE) empty-display branch unreachable via UI (U3); unmount ref reset cosmetic (U4).

---

## 6. Tally
- **MUST-FIX: 0** — no functional or spec-violating defect; all acceptance rows
  satisfy and re-verified gates are green.
- **NICE-TO-HAVE: 4** — N1 (drop unused `watch`), U1 (test leave/cancel cancel),
  U2 (test 2nd-copy timer reset), N2 (test live-expression copy). U3/U4 are notes only.
- **src/lib untouched: YES (empty diff)**
- **Keyboard 5×4 layout unchanged: YES (data-label identical to master)**

Recommended action order (all non-blocking): N1 first (one-line cleanup, prevents a
future lint-gate regression), then U1+U2 tests. Do **not** commit/push.
