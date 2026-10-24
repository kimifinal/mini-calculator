# Review Report — B1 float-precision e2e guard (issue #34 / SSOT: pipeline/float-guard.md)

## Summary

- **libUntouched: YES** — `git diff master -- src/lib/` and `git diff master -- src/` both returned empty; `git status --porcelain` confirms only `pipeline/float-guard.md` and `tests/e2e/float.spec.ts` are untracked. No production code was touched. ✓
- **mustFixCount: 0** — No SSOT violation, no trivially-always-true assertion in the acceptance-critical path, all 4 tests pass against a fresh `dist` build confirmed by actual execution.
- **niceToHaveCount: 4** — Non-critical coverage gaps that do NOT make any current test wrong.
- 4/4 real tests PASS (confirmed by actual `npx playwright test tests/e2e/float.spec.ts` against fresh build).

---

## Per-Requirement PASS/FAIL (line refs in tests/e2e/float.spec.ts)

| # | Spec acceptance | Test location | Assertion (line) | Verdict | Notes |
|---|---|---|---|---|---|
| A1 | `0 . 1 + 0 . 2 =` → `0.3` | `test()` at **:38** | `toHaveText('0.3')` at **:53** | **PASS** | Real green confirmed. Empirical probe: non-exact `toHaveText('0.3')` REJECTS `'0.30000000000000004'` (17-digit regression) — this is the correct behavior. Intermediate `toHaveText('0.1+')` at :45 passes because `handleOp` produces exact string `'0.1+'`. |
| A2 | `2 / 3 =` → `0.666666666667` | `test()` at **:58** | `toHaveText('0.666666666667')` at **:66** | **PASS** | Real green. Non-exact substring match — catches any DIFFERENT final value (e.g. 1e6 regression: `'0.666667'` ≠ `'0.666666666667'` → RED) but won't catch a longer prefix-compatible string (non-realistic). |
| A3 | `1 / 3 =` → `0.333333333333` | `test()` at **:70** | `toHaveText('0.333333333333')` at **:78** | **PASS** | Same as A2. |
| A4 | `10 / 0 =` → `Error` | `test()` at **:82** | `toHaveText('Error')` at **:92** + `toHaveText('')` on preview at **:94** | **PASS** | Main-display assertion: non-exact `toHaveText('Error')` would also tolerate future `'Error: ...'` message variants (see NTH-1). Line :94 extra assertion: trivially-always-true (see NTH-2). |

---

## Must-Fix Items

**None.** All 4 acceptance requirements are met. No product code was changed (src/ and src/lib/ both clean in `git diff master`). No assertion is trivially always-true on the acceptance-critical path. No wrong-direction assertion. Real execution confirmed 4/4 green on fresh build.

---

## Nice-to-Have Items

### NTH-1: `toHaveText('Error')` in A4 is non-exact — a future `'Error: div by zero'` message would still pass
**Location**: `float.spec.ts:92` — `await expect(display(page)).toHaveText('Error')`
**Risk**: Empirically confirmed (probe): `toHaveText('Error')` non-exact passes for the string `'Error: divide by zero'`. If someone later changes the error message to include context, this guard silently passes.
**Fix**: `await expect(display(page)).toHaveText('Error', { exact: true })`
**Test to add**: `test('A4-exact: 10/0 exact Error text', ...) { press '1','0','/','0','='; await expect(display).toHaveText('Error', {exact:true}); }`

### NTH-2: A4 `toHaveText('')` on `display-preview` at line :94 is trivially always-true
**Location**: `float.spec.ts:94` — `await expect(preview(page)).toHaveText('')`
**Risk**: Empty string is a substring of any string; non-exact `toHaveText('')` passes even if the preview shows `'Error'` or `'0.3'` after a regression. This assertion provides ZERO protection against a non-cleared preview.
**Fix**: Add `{ exact: true }`: `await expect(preview(page)).toHaveText('', { exact: true })`
**Test to add**: Keep it in A4, but verify `{ exact: true }` passes on the current green (it does — the preview IS genuinely empty when `hasError` is true: `displayPreview` computed returns `''` for `hasError` state).

### NTH-3: No negative-result rounding guard
**Gap**: The 4 tests are all non-negative. A regression that breaks negative rounding (e.g. `Math.round` applied to `Math.abs(x)` then sign-stamped) would not be caught by any of the current 4 cases.
**Example**: `press '1','/','3','-','1','='` should yield `-0.333333333333` (verified by node: `Math.round((1/3-1+EPS)*1e12)/1e12 = -0.333333333333`).
**Test to add**: `test('negative: 1/3-1 = -0.333333333333') { press 1,/,3,-,1,=; expect display '−0.333333333333' }`.

### NTH-4: No percentage-precision guard
**Gap**: `Calculator.vue` calls `percentage(parseFloat(displayValue.value)).toString()` (line :229) with no rounding, and the spec lists `src/lib/expression.ts:219` AND `src/components/Calculator.vue:128` as the two rounding sites. A percentage case would guard the `src/lib/calculator.ts` path too, but that's out-of-scope per the spec. The spec's A1-A4 don't include percentage — but it's the weakest link not covered by any test.
**Test to add**: `test('percentage: 20% = 0.2') { press '2','0',%,=; expect '0.2' }` — verify `percentage(20)=0.2` (likely `percentage(n) = n/100`).

### BONUS (not in NTH count): EPSILON-blindness observation
**Observation**: node probe confirmed `Math.round(x*1e12)/1e12` (WITHOUT `+ Number.EPSILON`) gives IDENTICAL output to `Math.round((x+EPS)*1e12)/1e12` for ALL 4 acceptance test values (`0.1+0.2`, `2/3`, `1/3`). The EPSILON refinement is currently invisible to the test suite. If someone removes the `+ EPS` term from `expression.ts:219` or `Calculator.vue:128`, no test would red. This is NOT a must-fix (current formula still produces correct display strings; EPS only matters for the rare boundary case `0.30149801585549996` found empirically), but it's worth documenting as a known limit of the 4 guards.

---

## Rounding-path verification (src/lib/expression.ts:219, src/components/Calculator.vue:128)

- `expression.ts:219`: `return Math.round((result + Number.EPSILON) * 1e12) / 1e12;` — formula confirmed present. The value this returns feeds into `Calculator.vue:341` `String(Math.round(...))` → `displayValue.value = rounded`. Confirmed.
- `Calculator.vue:128`: `const rounded = Math.round((r + Number.EPSILON) * 1e12) / 1e12;` → `return String(rounded)` — this is the PREVIEW path. The `=` path uses `expression.ts:219` (via `calculateExpression → parseExpression → evalRPN`). Both use the identical formula. Confirmed.
- Node computation confirmed: `0.1+0.2` → `0.3` ✓; `2/3` → `0.666666666667` ✓; `1/3` → `0.333333333333` ✓; `10/0` → `Infinity` → `!isFinite` → `'Error'` ✓ (no rounding path — caught earlier by `evalRPN` line :217 `Number.isFinite` check). All 4 expected strings match the formula's real output.

---

## Test quality audit

| Assertion line | Type | Exactness | Trivially-true? | Direction correct? |
|---|---|---|---|---|
| :41 `toHaveText('0.')` | intermediate | non-exact | No — '0.' is 2 chars, '0.1' would also pass BUT fires before next press so display is genuinely '0.' at time-of-check | ✓ |
| :45 `toHaveText('0.1+')` | intermediate | non-exact | No — same | ✓ |
| :47 `toHaveText('0.1+0')` | intermediate | non-exact | No — same | ✓ |
| :49 `toHaveText('0.1+0.')` | intermediate | non-exact | No — same | ✓ |
| :51 `toHaveText('0.1+0.2')` | intermediate | non-exact | No — same | ✓ |
| :53 `toHaveText('0.3')` | **A1 final** | **non-exact (but empirically REJECTS 17-digit string)** | **No** — empirically confirmed real guard | ✓ |
| :66 `toHaveText('0.666666666667')` | **A2 final** | non-exact | No | ✓ |
| :78 `toHaveText('0.333333333333')` | **A3 final** | non-exact | No | ✓ |
| :92 `toHaveText('Error')` | **A4 final** | non-exact | No for current 'Error' string; non-exact = passes for 'Error:...' variants (NTH-1) | ✓ but weak |
| :94 `toHaveText('')` | A4 extra | non-exact | **Yes — trivially always-true** | NTH-2 |

**Key finding**: `toHaveText('0.3')` (non-exact) empirically REJECTS `'0.30000000000000004'` — this contradicts the general expectation that non-exact `toHaveText` is a substring guard. This is Playwright's "trim and exact-compare whitespace" behavior on single-text-node elements. The A1 guard IS real. A2/A3 guards also reject their expected regression targets.

**EPSILON-blind**: confirmed by node — dropping `+ EPSILON` from `evalRPN` line :219 does not change any of the 4 test outputs. Current tests are structurally sound but don't specifically protect the EPSILON refinement. Not a regression risk for current code, but a future-guard weakness.
