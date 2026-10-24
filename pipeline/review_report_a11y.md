# Review report — a11y audit (issue #27)

Reviewer role, adversarial. Per instructions: this file lists **GAP findings only**. The
pass/fail **verdict is `verify.py`'s exit code (GREEN — 6 gates, 31 e2e); not my opinion.**
Scope audited: `src/components/Calculator.vue` (+40/-3) and new `tests/e2e/a11y.spec.ts`
vs `master`. `src/lib/` is in-scope only as an invariant to confirm untouched.

Both orchestrator self-heals (copy/copy.spec.ts A1 pop()-then-length → length-first;
a11y/spec.ts A4 outline via longhand `getPropertyValue` on a `var()`-colored outline
shorthand → read `rule.cssText`) are accepted as **test-probe bugs, not product defects**.
Not re-flagged.

---

## 0. Invariant gates (spec §"邊界/不觸及", A5)

| Check | Result | Evidence |
|---|---|---|
| `src/lib/` byte-untouched | **PASS** | `git diff master -- src/lib/` is EMPTY (exit 0). |
| `data-test` / `data-label` / `data-paren` byte-identical | **PASS** | `diff <(master) <(worktree)` of sorted-unique `data-*` = empty (exit 0). |
| Pure addition, no functional change | **PASS** | diff is +40/-3: 3 deletions are whole-line button rewrites (old line removed, expanded line added), net additive. |
| Existing e2e untouched | **PASS** | `git diff master -- tests/` is EMPTY; only `tests/e2e/a11y.spec.ts` is new (untracked). `copy.spec.ts` etc. unchanged. |
| `--md-primary` token real (not invented) | **PASS** | Defined `src/App.vue:14` as `#d0bcff`; focus ring reuses it. |

---

## 1. Acceptance mapping (spec → code → test)

| # | Requirement | Code (line) | Test | Status |
|---|---|---|---|---|
| A1 | display has `role="status"` + `aria-live="polite"` (+ Tab-reachable) | `Calculator.vue:456` role="status", `:457` aria-live="polite", `:458` tabindex="0" | `a11y.spec.ts:100-114` asserts `role==='status'`, `live==='polite'`, `tabindex==='0'` via `getAttribute` | **PASS** |
| A2 | every symbol op button (÷×−( )±%⌫) has non-empty zh-TW `aria-label` (+/=` suggested) | ÷ `:529`「除」× `:537`「乘」− `:543`「減」( ) `:515`「開括號」± `:507`「變號」% `:522`「百分比」⌫ `:558`「刪除」+ `:549`「加」= `:565`「等號」 | `a11y.spec.ts:117-139` loops all 9 and asserts exact `getAttribute('aria-label')` === expected zh-TW | **PASS** |
| A3 | keyboard copy on focused display via Enter/Space → `navigator.clipboard.writeText` (same path as pointer #25) | `onDisplayKeydown` `Calculator.vue:401-407` (Enter/`' '`/`Spacebar` → `preventDefault`+`stopPropagation`+`reuse copyValue()@357`); `@keydown` wired `:466` | `a11y.spec.ts:142-158` Enter; `:161-169` Space; both mock clipboard, assert `window.__copied` last === `'8'` after `computeEight` | **PASS** |
| A4 | visible `:focus-visible` style; keyboard Tab can reach op buttons + display | `.display:focus-visible, button:focus-visible { outline: 2px solid var(--md-primary); outline-offset: 2px }` `Calculator.vue:735-739` | `a11y.spec.ts:172-227` introspects CSSOM, matches a `:focus-visible` rule, asserts outline non-`none`, reads `cssText` | **PASS** |
| A5 | `src/lib/` untouched; 5×4 layout + `data-*` byte-identical; all e2e green | n/a (invariant) | orchestrator `verify.py` | **PASS** |

**All five acceptance rows PASS.** The change satisfies the spec completely.
`tabindex=0` on the display makes it a Tab stop; the bare `button:focus-visible` selector
also gives the focus ring to history-panel buttons (`history-chevron` :583, `history-clear` :592,
`history-toggle` :425) — confirmed, not a gap.

---

## 2. Adversarial hunts

### 2.1 `stopPropagation` vs window-level `onKey` — SEMANTICALLY CORRECT but UNTESTED ✓safe
`onKey` is a **window-bubble** listener (`onMounted`→`window.addEventListener('keydown', onKey)`,
`Calculator.vue:410`); `@keydown="onDisplayKeydown"` on the display is also a **bubble** listener
(`:466`). Dispatch order for a keydown *on the display*: target-phase handler on the display
runs and calls `ev.stopPropagation()` **before** the event can bubble up to `window`'s
`onKey`. So a focused-display Enter/Space copies (copyValue@357, focus-independent — reads
`displayValue.value`) and does **not** also re-trigger `calculateExpression()` (window's
Enter branch, `:314`). The "non-focused Enter still calculates via onKey" path is preserved
because the display handler is only attached to the display node; a keypress on `body` never
hits it. **Verdict: code is correct.**
- **GAP:** no test asserts the *negative* — that a focused-display Enter does NOT double-trigger
  `calculateExpression()`. A3 only asserts `__copied` gained `'8'`. The spec's *entire stated
  rationale* for `stopPropagation` (line 19: "stopPropagation 確保不與 window 級的 =(Enter)計算重疊")
  is therefore unverified. **This is the single most important untested branch of the change.**
- Note also: `' '` is the real key char from a `KeyboardEvent` (Space → `key: ' '`); `'Spacebar'`
  is a legacy/legacy-IE value that real `key` events don't emit. Including `'Spacebar'` is harmless
  dead code but not a real-world key. Minor.

### 2.2 Space scroll / preventDefault — present, not observably tested
`onDisplayKeydown` calls `ev.preventDefault()` for Enter/Space (`:403-404`), which on a focusable
(`tabindex=0`) div *does* suppress the default page-scroll that Space would otherwise cause.
Correct, but a headless short-viewport test cannot observe scroll-suppression; only the copy
side-effect is asserted. Acceptable given headless constraint.

### 2.3 role=status + tabindex — does NOT break any existing selector ✓
All e2e reference the display via `getByTestId('display')` / `data-testid="display"`
(`calculator.spec.ts:19`, `copy.spec.ts:25`, `a11y.spec.ts:28`) — a `data-*` attribute
selector. `role`, `tabindex`, `aria-label` are independent attributes and do not alter it.
No test inspects the display's tag or role for anything other than the new a11y assertions.
31/31 green confirms no selector breakage.

### 2.4 aria-label locale — NO simplified Chinese ✓
All 13 aria-label values scanned; **0 simplified-Chinese characters**. Confirmed the right
Traditional variants are used: 變 U+8B8A (not 变 U+53D8), 號 U+865F (not 号 U+53F7), 開 U+958B
(not 开 U+5F00), 減 U+6E1B (not 减 U+51CF), 複 U+8907, 刪 U+522A. Matches `lang="zh-TW"`.
Matches spec §"aria-label 用 zh-TW".

### 2.5 Button coverage — every symbol button labelled ✓
All 21 on-screen buttons: digits (readable), `AC`/`清除` (readable text), and every bare
**symbol** the spec names (÷×−( )±%⌫) plus +/=` all carry a non-empty zh-TW `aria-label`
(verified table 1). No symbol button is left with only a symbol and no text/label.
`history-chevron`⌃ has 「收合歷史」; `history-toggle` svg has dynamic 「打開/關閉歷史」.

### 2.6 Tab-reachability — asserted via attribute, not a real Tab keypress
A4 acceptance explicitly allows "or at least the CSS rule exists". The test asserts
`tabindex==='0'` (attribute present) + the CSS rule exists, but **never performs a real
`page.keyboard.press('Tab')`** to prove focus actually lands on the display. Attribute
presence is strong evidence but is not the same as a real tab-order traversal.

---

## 3. Spec-mandated minor a11y nuance (NOT a gap — flag only)

- `role="status"` makes `aria-live="polite"` **implicit**; `:457` repeating it is redundant
  but harmless and is what A1 requires. Leave it.
- `role="status"` + `aria-label="結果, 複製到剪貼簿"` (:459): the label names a *copy
  affordance*, but `role=status` is a non-actionable live region — a screen reader will not
  present it as "press to copy" (the copy happens via keydown, not via an activation
  semantics an AT conveys for `status`). This is the **spec-mandated text**, so it is not a
  violation; it only slightly over-codes the affordance. No change required for this scope.

---

## 4. Classification

### MUST-FIX
**None.** All five acceptance rows pass; invariants hold; no correctness defect in the change
itself.

### NICE-TO-HAVE (quality / coverage, not blocking)
1. **Test the `stopPropagation` negative (§2.1).** Assert that an *Enter on the focused display*
   copies **and does not also re-evaluate** — e.g. compute `5+3` (→ display shows `8`,
   expression cleared), focus display, press Enter, then assert the display/expression state
   did NOT change a second time (e.g. expression stays empty / no re-eval side effect).
   This is the only untested spec rationale.
2. **Real Tab-reach test (§2.6).** Add a `page.keyboard.press('Tab')` loop asserting
   `document.activeElement` reaches `[data-testid=display]` and at least one op button,
   satisfying A4's stronger reading.
3. **Decimal `.` button `aria-label="小數點"`** — consistency-only; the `.` shows as a bare dot
   to AT. Out of the mandated ÷×−( )±%⌫ set, so optional.
4. **Drop the legacy `'Spacebar'` branch** (`:402`) or keep it as explicit defense-in-depth;
   real `key` events never emit `'Spacebar'`. Cosmetic.
5. **(informational, no action needed)** `aria-live` redundancy and `status`+`aria-label`
   affordance nuance in §3 — spec-mandated, leave as-is.

### Extra tests I would add
- Focused-display **Enter** → `__copied` last == result **AND** no second calculation
  (couples §4.1). Focused-display **Space** → same (extends A3b assertion to guard scroll).
- **Tab reaches display**: press Tab N times, `activeElement.getAttribute('data-testid') ===
  'display'` and `.focus-visible` ring applied (pair with §4.2).
- **Non-focused Enter still calculates** (regression guard for the stopPropagation scoping):
  expression `9*9`, focus a *button*, press Enter on `body`, assert result `81` — proves
  onKey window path survived.
- **Empty/Error guard**: with display `0` / `Error`, focused-display Enter is a no-op
  (`copyValue` early-return at `:359`) and does not throw.
- **Focus ring on a history-panel button**: open history, Tab to `history-close`, assert
  `outline` non-`none` — proves the bare `button:focus-visible` selector reaches panel buttons.

---

## 5. Bottom-line metrics
- **must-fix: 0**
- **nice-to-have: 4 testable coverage/quality items** (+ 2 informational items in §3 that need
  no action).
- **`src/lib/` untouched: YES** (`git diff master -- src/lib/` empty).
- **`data-*` values byte-identical to master: YES** (sorted-unique diff empty, exit 0).

All spec acceptance rows A1–A5 PASS; the change is a clean pure addition. The one substantively
*untested* thread is the `stopPropagation` double-trigger-prevention (§2.1) — code-correct,
but unasserted; everything else is covered or spec-optional.
