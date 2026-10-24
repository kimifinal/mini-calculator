# Review report — memory-fold (issue #14)

Reviewer role, **adversarial**. Per `four-role-dev-pipeline`: this file lists **GAP
findings only**. The pass/fail **verdict is `verify.py`'s exit code, not my opinion.**
I do NOT emit a verdict here.

Scope audited: NEW `src/composables/useMemory.ts`, NEW `tests/unit/useMemory.test.ts`,
NEW `tests/e2e/memory.spec.ts`, EDIT `src/components/Calculator.vue`, EDIT `DESIGN.md`
vs `master` (branch `feat/memory-fold`, unstaged). `src/lib/calculator.ts` +
`src/lib/expression.ts` are in-scope **only as an invariant to confirm untouched**.

Independent re-run (ignoring the Coder's self-report) — `python3 verify.py --base master`:

| Gate | My result | Note |
|---|---|---|
| typecheck | **PASS** | `vue-tsc --noEmit` clean |
| ssot | **PASS** | `git diff master -- src/lib/` EMPTY (0 files) |
| build | **PASS** | `npm run build` |
| unit | **PASS** | 74 passed |
| e2e | **PASS** | 40 passed (35 existing + 5 new in `memory.spec.ts`; 4 files) |
| diff | **PASS** | 2 tracked files vs `master`: `DESIGN.md`, `Calculator.vue` |

**The Coder's "40 e2e / 74 unit" claim was TRUE this time — I reproduced it.**
`verify.py` = GREEN. The 3 NEW files are present as untracked + the 2 edits as unstaged
(no `git clean` was run; `pipeline/` intact). **The zh-TW `記憶` slip was prose-only** —
`s2t.py` (OpenCC s2tw + TW terms) on all 3 new files + `DESIGN.md` + `Calculator.vue`
returned **byte-identical** (no simplified chars, no TW-term drift). All new UI
Chinese is correct traditional (`展開/收合/加入/從…减…/調出/清除記憶`).

---

## 0. Invariant gates

| Check | Result | Evidence |
|---|---|---|
| `src/lib/` byte-untouched (spec §Architecture) | **PASS** | `git diff master -- src/lib/` empty; verify `ssot` green |
| New files = exactly the 3 expected | **PASS** | `useMemory.ts`, `tests/unit/useMemory.test.ts`, `tests/e2e/memory.spec.ts` (+ `pipeline/memory-fold.md`) untracked; no deletes |
| `data-test`/`data-label` byte-stable for existing keys | **PASS** | diff to existing keypad is purely additive; no existing `data-*` line changed |
| No new deps | **PASS** | `package.json` unchanged; composable + scoped CSS + template only |
| `useMemory.ts` mirrors `useHistory.ts` (guarded `typeof window`+try/catch, namespaced key, load-at-setup) | **PASS** | `readStore/writeStore/clearStore` guarded; `readMem`@58 + `isFolded=ref(readFolded())`@102 seed at setup |

---

## 1. Acceptance mapping (spec §Acceptance → code → test)

| # | Requirement | Code | Test | Status |
|---|---|---|---|---|
| 1 | `5 M+ 10 M+`→MR=15; after MC, MR=0 | `handleMemPlus/Minus/Recall/Clear` `Calculator.vue:51-66`; `useMemory.addMem/subMem/recallMem/clearMem` | `memory.spec.ts` M1 (`:66-86`, asserts storage `15`→null, display `15`→`0`), M2 (`:89-114`) | **PASS** |
| 2 | Memory persists across reload | `writeMem`@63 + `readMem` re-seed@98 | `memory.spec.ts` M3 (`:117-137`, `page.reload()`) unit `:57-61` | **PASS** |
| 3 | Fold state persists across reload | `writeFolded`@75 + `isFolded` seed@102 | `memory.spec.ts` M4 (`:140-153`, `aria-expanded` survives reload) unit `:94-97` | **PASS** |
| 4 | Folded default == current layout (35 e2e green) | `.memory-row{max-height:0;overflow:hidden}` `:931-940` | verify e2e 35 existing + new all green | **PASS** |
| 5 | New e2e for M+/M-/MR/MC | — | `memory.spec.ts` M1–M5 cover all 4 keys | **PASS** |
| 6 | Toggle flips chevron 180°; `aria-expanded` syncs | `.fold-toggle--open .chevron{rotate(180deg)}` `:923`; `:aria-expanded="!isFolded"` `:559` | `memory.spec.ts` M5 (`:156-169`, both directions) | **PASS** |
| 7 | `src/lib/` 0 files changed | — | verify `ssot` green | **PASS** |

**All seven acceptance rows PASS.** The change satisfies the spec completely.

---

## 2. Adversarial hunts (untested branches / edge cases)

### 2.1 `M-` on empty memory can store a **negative persisted value** — UNTESTED
`subMem(n)` = `mem -= n` (`useMemory.ts:115`). If the user taps `M-` while `mem===0`,
`mem` becomes a negative number and is persisted as `String(n)` (e.g. `"-3"`). The
composable comment (line 80) says "0 when empty", but `subMem` has no floor — a real user
can leave `mem` negative and it survives reload. No test covers this. The spec only defines
`M-` as `mem -= current`, so this is arguably **spec-permitted**, but the "0 when empty"
contract is now false. Low priority.

### 2.2 **Float-noise persists through MR** (quality, not a crash) — UNTESTED
`M+`/`M-` accumulate into `mem` via raw arithmetic and persist `String(value)`
(`:110,115,64`); `MR` shows `String(n)` (`Calculator.vue:60`). `parseExpression` rounds
each *operand* to 1e12 (`expression.ts:218`), so a single MR of a clean value is fine, but
repeated `M+` of a non-terminating decimal **dirties the stored value**: 3× `M+ 0.1`
persist `"0.30000000000000004"`. This violates the exact "trim floating-point noise"
principle that `expression.ts` already enforces. No test. Low priority, but it is the one
spot a "trim like the rest of the codebase" reviewer would flag. (Not a verify gate.)

### 2.3 Folded memory keys stay **in the tab order** — a11y, UNTESTED
`.memory-row` when folded is `max-height:0; opacity:0; overflow:hidden` (`:931-938`) but has
**NO `pointer-events:none` / `visibility:hidden` / `display:none`** (confirmed — only the
toast + a hidden layer use `pointer-events:none`, `:841`/`:1076`). So while folded, the 4
`M+/M-/MR/MC` buttons are `0px` (not clickable) yet **still real DOM focus stops**. The
`copy-toast` precedent already uses `pointer-events:none` for an invisible element; the
memory row does not. `a11y.spec.ts` does **not** assert "no hidden focusable", so this
slips through. `§4.2` (30-Tab walk) won't catch it — it stops at the first operator. Not a
verify gate; no existing regression. Nice-to-have a11y hardening.

### 2.4 Memory keys share the `=` color (`--md-primary-container`/`--md-on-primary-container`)
`Calculator.vue:701` (`.btn.eq`) and `:950` (`.btn.mem`) resolve to the **same** tokens.
The spec/design **explicitly chose** `--md-primary-container` for the memory keys, so this
is **by-design, not a deviation** — but it means the memory cluster is visually identical to
the `=` key. A screen-reader user already disambiguates via the zh-TW `aria-label`s
(`加入記憶`/`從記憶減去`/`調出記憶`/`清除記憶`, all present `:608/615/622/629`); a sighted user
might not. Purely informational.

### 2.5 `M+`/`M-` on a non-numeric display are a **silent no-op** — by design, untested
`currentNumericValue()` returns `0` for `'Error'`/`''`/unparseable display
(`Calculator.vue:51-56`). So `M+` on `"Error"` doesn't corrupt `mem` (good — the guard
works), but it also doesn't signal "nothing was added". `useMemory` guards `Number.isFinite`
too (`:109,114`). No test exercises the error-display + M+ path. Nice-to-have.

### 2.6 `max-height: 96px` on `.memory-row` is a latent clip risk
Keypad buttons are `aspect-ratio:1` squares sized off the live container; `96px` is a magic
number. e2e is green at the default viewport so it doesn't clip **today**, but a narrow
container would clip the row. Low priority.

### 2.7 Wiring is not wired-tested (inherent)
`useMemory.test.ts` drives the **composable** directly; `memory.spec.ts` drives the UI.
The 4 handler functions (`handleMemPlus/Minus/Recall/Clear`, `Calculator.vue:51-66`) are
exercised only e2e — no unit test of the component wiring. Inherent to the split; e2e covers
behavior. Informational.

**Branch coverage:** the composable's own branches (NaN/Infinity guard `:109/114`,
corrupt-payload→0 `:60`, fold default `:72`) ARE unit-tested (`:42-48, :71-74, :78-81`).
The gaps above are all at the **integration/edge** layer, none at the core composable.

---

## 3. Findings

### MUST-FIX (block a clean "done" until closed)

**MF-1 — `DESIGN.md` Components table corrupted by an extra `|` on 4 rows.**
The diff re-prepended `|` to two **previously-correct** rows and carried the same bug into
the two new ones (`DESIGN.md:65-68`):
```
-| History selection | ...            →  +|| History selection | ...
-| Current-expression bar | ...       →  +|| Current-expression bar | ...
+| Fold toggle (icon chevron) | ...   →  +|| Fold toggle ... | ...   (new)
+| Memory key (`M+ M- MR MC`) | ...   →  +|| Memory key ... | ...    (new)
```
All four now have **3 `|`s (4 columns)** while the rest of the table has 2 — the table
renders broken in markdown (the last row overflows, and rows 2–3 of the "Components" block
are now mis-aligned). This is a real defect introduced *this diff* (not pre-existing), and it
corrupts the very SSOT doc the change is supposed to extend. **Fix:** drop the leading `|`
on the 4 rows so every row is `| Component | Token mapping |`. **Test:** a lint/markdown
check (or a grep that every Components-table row has exactly 2 pipes).

**MF-2 — `M-` can persist a negative `mem`, breaking the "0 when empty" contract (§2.1).**
`subMem` has no floor, so `M-` on an empty memory (or oversubtraction) leaves a negative
value that persists and is recalled by `MR` (`-3`). The composable's documented contract
("0 when empty") becomes false. Either (a) floor at 0 (`mem = Math.max(0, mem - n)`), or
(b) document that negative memory is allowed and drop the "0 when empty" claim. **Fix + test:**
decide the contract and add a unit test for `subMem` past zero.

### NICE-TO-HAVE (quality/a11y hardening; not blocking)

- **NH-1 (§2.2):** trim float noise on the persisted value / on `MR` display, matching
  `expression.ts`'s 1e12 rounding. Add a unit test: repeated `M+ 0.1` should persist
  `"0.3"`, not `"0.30000000000000004"`.
- **NH-2 (§2.3):** give the folded `.memory-row` `pointer-events:none` (or `visibility:hidden`)
  so hidden buttons leave the tab order — match the `copy-toast` precedent; add an a11y e2e
  asserting no hidden focusable (mirror the pattern a11y.spec already uses for `:focus-visible`).
- **NH-3 (§2.4):** confirm with the user that memory keys sharing the `=` token is
  intentional; if it is, no code change — consider a tiny label/position nudge to de-confuse
  sighted users. (Screen-reader disambiguation already fine via aria-labels.)
- **NH-4 (§2.5):** add a test that `M+`/`M-` on an `"Error"` display are a no-op that leaves
  `mem` unchanged.
- **NH-5 (§2.6):** replace the magic `max-height: 96px` with a value that can't clip the
  square buttons on a narrow container, or make it content-driven.

---

## 4. Summary (counts only — NOT a verdict)

- **Must-fix: 2** — MF-1 (`DESIGN.md` 4-row `|` corruption), MF-2 (`M-` negative-memory
  contract). MF-1 is a doc-SSOT regression introduced this diff; MF-2 is a real edge-case
  behavior with a test gap.
- **Nice-to-have: 5** — NH-1 float trimming, NH-2 folded-row a11y, NH-3 `=`-color
  confirmation, NH-4 error-display M+ no-op test, NH-5 `max-height` magic number.
- **src/lib untouched: YES** (`git diff master -- src/lib/` empty; verify `ssot` green).

All 7 spec acceptance rows PASS; `verify.py` is GREEN (typecheck/ssot/build/unit 74/e2e 40/
diff) — reproduced independently, matching the Coder's numbers this once. The two must-fixes
are **outside** the verify.py gates (a broken SSOT table and a memory edge-behavior), which is
exactly why the adversarial layer exists.

---

## 5. Fixes applied (after audit; re-verified)

The orchestrator then closed the actionable findings and **re-ran `verify.py` = GREEN**
(unit **76** = 74 + 2 new; e2e 40; ssot clean). Fixes live in the working tree (untracked
new files + unstaged edits), so the feature still passes the full gate set.

| Finding | Status | Resolution |
|---|---|---|
| **MF-1** `DESIGN.md` 4-row `\|\|` corruption | **CLOSED** | Dropped the extra leading `\|` on all 4 rows; `DESIGN.md` Components table is now uniform 2-col (3 pipes/row); `grep -c '||' DESIGN.md` = 0. |
| **MF-2** `M-` persists negative `mem` | **CLOSED** | `subMem` now floors: `mem = round(Math.max(0, mem - n))` (`useMemory.ts`); docstrings updated to "0 while empty (M- floors at 0, never negative)". Locked by a new unit test (`M- floors at 0: subtracting past zero stays 0, never negative`). |
| **NH-1** float noise through MR | **CLOSED** | `addMem`/`subMem` round via a local `round(x)=Math.round((x+EPSILON)*1e12)/1e12`, matching `expression.ts`. Locked by new unit test (`3x M+ 0.1` persists `"0.3"`). |
| **NH-2** folded keys stay in tab order | **CLOSED** | `.memory-row` folded now `visibility:hidden` (transitions in on open) instead of opacity:0 alone — hidden keys leave tab order + AT, matching the `copy-toast` precedent. |
| **NH-3** memory keys share `=` color | **CLOSED** | Kept the spec's `--md-primary-container` token (a frozen DESIGN.md choice; the visible `M+/M−/MR/MC` text already reads as "memory" to a sighted user). Added the cluster a11y hardening: `.memory-row` now `role="group"` + `aria-label="記憶鍵"`, so screen readers group the 4 keys as one memory control. |
| **NH-4** error-display M+ no-op untested | **CLOSED** | New e2e **M6** in `memory.spec.ts`: `10 / 0 → "Error"`, then `M+`/`M-` on the Error display leave `mem` at `7` (verified via storage), then `MR` still shows `7`. Locks `currentNumericValue()`'s 0-on-error path at the integration layer. |
| **NH-5** `max-height:96px` magic constant | **CLOSED** | Documented the provenance in the CSS: `.calculator` is a fixed `340px` shell, `padding:16px`, so a square `1fr` cell is 70×70 px and one row (+10px gap) is ~80px — the 96px ceiling is clip-proof and provably viewport-independent (the keypad is fixed-size), not magic. Bump only if a 2nd row is added. |

**Outcome:** both must-fixes MF-1/MF-2 and all five nice-to-haves NH-1…NH-5 are
**closed and re-verified GREEN** by `verify.py --base master` (EXIT 0). Coverage grew to
unit **76** (+2: M- floor, float-noise) and e2e **41** (+1: M6 error-display no-op); a
structural slip from the e2e edit (M6 was nested inside M5's body) was caught and the spec
file was rewritten clean. `src/lib/` still byte-untouched; no deferred items remain.

## 6. Follow-on: fold-toggle / memory-row spacing (found on-device, 2026-10-23)

Two `getBoundingClientRect` layout passes after the audit, each driven by a
**user screenshot** — measured, not eyeballed (`scripts/measure_fold.mjs`):

- **GAP-A (reported by user):** `.fold-row` had no vertical spacing, so the
  chevron sat **0px** above AC (folded) and M+ (expanded).
  **Fix:** `margin-bottom:10px` on `.fold-row` (matches the keypad's row gap).
  Measured **0.0 → 10.0 px**.
- **GAP-B (reported by user — introduced by GAP-A's first fix):** the GAP-A
  attempt *removed* the open memory row's `margin-bottom` (my reasoning was
  wrong — I assumed `.fold-row`'s margin would also fill the gap below the
  memory row, but `.fold-row` sits ABOVE the chevron, so that margin never
  reached M+→AC). As a result M+/M−/MR/MC sat flush against AC in the expanded
  state. **Fix:** restore `margin-bottom:10px` on `.memory-row--open` and
  document that the two margins are separate (`.fold-row` separates
  chevron-from-above, `.memory-row--open` separates memory-row-to-AC-below).
  Measured **0.0 → 10.0 px**.

  **Lesson:** the measurement script had been caching the *folded* AC position
  and therefore never saw the expanded M+→AC gap — a self-inconsistent probe,
  exactly why the skill says "re-measure after each change, not trust one
  pass." Corrected the script to re-read AC *after* expanding.

All three live gaps now uniform **10px**:
| state | gap |
|---|---|
| FOLDED: chevron → AC | 10.0 px |
| EXPANDED: chevron → M+ | 10.0 px |
| EXPANDED: M+ → AC | 10.0 px |

`verify.py --base master` re-run GREEN after both fixes (unit 76, e2e 41,
`src/lib/` 0-changed). Tunnel rebuilds and re-serves the new `dist/`
(`index-0sOg9Wgg.js`) after each `npm run build`, so the user's URL reflects
the fix after a hard reload.
