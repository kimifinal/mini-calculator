# Review Report — ± (negate / sign-toggle) button

**Reviewer role:** Reviewer (four-role pipeline)
**Branch:** `trial/four-role-pipeline` (unstaged, uncommitted)
**Spec SSOT:** `pipeline/feat-negate.md`
**Files audited:** `src/components/Calculator.vue` (+53 lines), `tests/unit/Calculator.spec.ts`, `tests/e2e/calculator.spec.ts`
**Independently verified:** `vue-tsc --noEmit` → clean; `vitest run` → **49/49 passed** (3 files); e2e new test validated structurally (`test-results/.last-run.json` = `{status:passed, failedTests:[]}`; no local Playwright browsers to re-run).

---

## Checklist — requirement → PASS/FAIL with evidence

### §2 Behaviour

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | `±` placed in row 1, immediately right of `AC` | **PASS** | Template lines 254-259: button block sits directly after the `AC` button (lines 248-253) inside `<!-- Row 1 -->`. Order is AC → ± → `( )` → `%` → `÷`. |
| 2 | `op` accent style, `data-label="±"`, `data-test="negate"` | **PASS** | Lines 255-259: `class="btn op"` (sage accent via `button.op` → `#b5c19e`, dark `#16161a` text), `data-test="negate"`, `data-label="±"`, `@click="handleNegate()"`. No new CSS added — reuses existing accent class. |
| 3 | Press toggles sign; legacy `5 -> -5 -> 5` | **PASS** | `handleNegate()` (line 116) falls through to `displayValue.value = String(-parseFloat(displayValue.value))`. Unit test `toggles the sign in legacy mode: 5 -> -5 -> 5` passes. |
| 4 | `0` is a no-op (never renders `-0`) | **PASS** | Line 103: `if (displayValue.value === '0') return;`. Verified `String(-parseFloat('0.')) === "0"` (no `-0`). Unit test `is a no-op when the display is 0` passes. |
| 5 | `Error` is a no-op (stays Error) | **PASS** | Line 102: `if (hasError.value) return;` — display retains `'Error'`. (Spec-conformant; see nice-to-have N3 re test coverage.) |
| 6 | Expression mode toggles a bare leading number; else no-op | **PASS** | Lines 105-111: `mode.value === 'expression'` branch guards with regex `/^[-+]?\d+(\.\d+)?$/`; matched bare number → flip leading sign, partial expression untouched. Consistent with spec "simplest accepted behaviour". |
| 7 | Parser handles leading unary minus (`"-5"` → -5) | **PASS (relied-on)** | `src/lib/expression.ts` lines 74-88: `'-'` emitted as `{kind:'unary',value:'-'}` at an operand slot; eval at lines 180-183 applies unary sign. Path the spec depends on exists and is unmodified. |
| 8 | Physical `-` key NOT overloaded with negate | **PASS** | `onKey` (line 224): `key === '-'` → `handleOp('-')` (binary minus). Negate reachable ONLY via the `±` button's `@click="handleNegate()"`. No `-`/`∓` keyboard binding to negate. |
| 9 | No change to `lib/calculator.ts` / `lib/expression.ts` | **PASS** | `git --no-pager diff master -- src/lib/` → **empty**. |

### §3 Constraints

| # | Constraint | Verdict | Evidence |
|---|------------|---------|----------|
| 10 | UI-only: only `Calculator.vue` + tests touched | **PASS** | `git status` shows only `Calculator.vue`, `tests/unit/Calculator.spec.ts`, `tests/e2e/calculator.spec.ts` modified. `lib/` empty diff. The toggle manipulates the display string only. |
| 11 | iOS visual style preserved (black bg, round buttons, accent utility) | **PASS** | No CSS added in the diff; the new button inherits `button { border-radius: 50%; }` (round) and `button.op` sage accent. Styling by reuse — no style regression possible. |
| 12 | ≥1 unit test AND ≥1 e2e test added | **PASS** | +2 unit tests (`toggles the sign in legacy mode`, `is a no-op when the display is 0`), +1 e2e test (`negate button toggles sign: 5 -> ± -> -5 -> ± -> 5`). |
| 13 | No regression to existing tests | **PASS** | `vitest run` → 49/49 (incl. pre-existing 47). `test-results/.last-run.json` shows e2e `status: "passed"`. |

### §4 Definition of done

| # | DoD | Verdict |
|---|-----|---------|
| 14 | typecheck (`vue-tsc`) clean | **PASS** — `npx vue-tsc --noEmit` exit 0. |
| 15 | unit + e2e all pass | **PASS** — 49/49 unit (independently run); e2e last-run passed. |
| 16 | toggles `5 -> -5 -> 5`, no-op on `0`/`Error` | **PASS** — covered by unit test + code paths above. |
| 17 | `±` button present & wired | **PASS** |

---

## Verdict: **PASS**

No must-fix issues. Every §2/§3 requirement and all §4 DoD items PASS. `lib/` confirmed truly untouched.

---

## Issues

### Must-fix
_(none)_

### Nice-to-have
- **N1 — `'0.'` intermediate no-op is inconsistent across modes.** Legacy `handleNegate` early-returns only on `=== '0'` (line 103), so after typing `0` then `.` the display `'0.'` reaches `String(-parseFloat('0.'))` → `'0'` (a mutation `'0.' → '0'`, though never a visible `-0`). In expression mode the same `'0.'` fails the regex and stays `'0.'`. No spec violation and no visible bug, but the two modes diverge. *Fix:* also short-circuit when `parseFloat(displayValue.value) === 0` (e.g. `if (parseFloat(displayValue.value) === 0) return;` alongside the literal checks) for cross-mode consistency.
- **N2 — expression-mode toggle of a leading-`+` number yields `-+n`.** The regex permits an optional leading `+`, so `'5'`→`'-5'` but `'+5'` (if ever produced) toggles to `'-+5'`. Evaluates correctly via the unary path, so harmless, but slightly ugly. *Fix:* strip a leading `+` first, or reject the `+` alternative in the regex (`/-?\d+(\.\d+)?$/` + separate flip logic).
- **N3 — test coverage gaps vs the acceptance table.** Spec §5 lists `Error` no-op and `-5 → 5`, and §2 mentions expression-mode toggling, but the added tests only cover legacy `5→-5→5` and `0` no-op. No unit/e2e test asserts the `Error` no-op, the `-5 → 5` direction, or the expression-mode branch. *Fix:* add 1–2 unit tests for `Error` no-op and expression-mode `'5'→'-5'→5` (the latter exercises the new branch, currently untested by the new code).
- **N4 — large-integer formatting.** Legacy negation uses `String(-parseFloat(...))`; very large values could render in exponential form (e.g. `1e21`). Out of scope for this trial but worth a formatter if values can grow large. *Fix:* optional — reuse an existing display formatter.

---

## Tests added
- **Unit** (`tests/unit/Calculator.spec.ts`, +2): `toggles the sign in legacy mode: 5 -> -5 -> 5`; `is a no-op when the display is 0` (asserts two presses keep `0`). Both drive the component via `data-label="±"` through `pressButton`.
- **E2E** (`tests/e2e/calculator.spec.ts`, +1): `negate button toggles sign: 5 -> ± -> -5 -> ± -> 5`, driving the production preview via `data-label="±"`.
- **Coverage status:** legacy toggle + `0` no-op covered. **Uncovered by new tests:** `Error` no-op, `-5 → 5` direction, expression-mode branch (see N3). Expression-mode branch is the one new logic path that ships without a dedicated test.
- **Re-run note:** unit 49/49 verified live via `vitest run`. e2e could not be re-executed (no Playwright browser binaries in this env); the new e2e test is structurally valid (target `data-label="±"` matches the button) and `test-results/.last-run.json` reports `status: passed` — consistent with the Coder's 12/12.
