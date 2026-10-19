# Feature Spec: ± (negate / sign toggle) button

**Status:** approved for trial run (four-role pipeline smoke test)
**Roles exercised:** Architect -> Coder -> Reviewer -> Tester
**Source of truth (SSOT):** this file + `tasks.json`.

## 1. Goal
Add a `±` (sign-toggle / negate) button to the calculator UI so the user can
flip the sign of the current display value with one tap, matching the behaviour
of the iOS calculator.

## 2. Behaviour (requirements, testable)
- The `±` button is placed in row 1 (utilities row), to the right of `AC`, in
  the same accent style as `AC` / operators.
- Pressing `±` multiplies the current `displayValue` by -1.
  - legacy mode: `5 -> -5 -> 5`.
  - If the display is `0` or an `Error`, `±` is a no-op (0 negates to 0; on
    Error keep showing Error).
  - expression mode: append a leading `'-'` only when starting a fresh number
    is unambiguous; simplest accepted behaviour is to toggle sign of a plain
    leading integer when the expression is a bare number, otherwise no-op.
    (The parser in `lib/expression.ts` already handles a leading unary minus,
    so `"5"` toggled to `"-5"` and evaluated must yield -5.)
- Keyboard support: the physical `-` key already maps to binary minus; do NOT
  overload it. The `±` toggle is a UI-only button for this trial.
- No change to the arithmetic in `lib/calculator.ts` / `lib/expression.ts` —
  the toggle only manipulates the display string.

## 3. Constraints
- UI-only: touch `Calculator.vue` + tests only. Do NOT modify the parser or the
  SSOT arithmetic module.
- Keep the iOS visual style (black bg, round buttons, accent for utility keys).
- Add at least one unit test and one e2e test for the toggle.
- Must not regress existing tests.

## 4. Definition of done
- typecheck (`vue-tsc`) clean
- unit + e2e tests all pass
- `±` toggles `5 -> -5 -> 5` and is a no-op on `0`/`Error`
- review_report.md verdict PASS

## 5. Acceptance examples
| Start | Press ± | Expected |
|-------|---------|----------|
| 5     | ±       | -5       |
| -5    | ±       | 5        |
| 0     | ±       | 0 (no-op)|
| Error | ±       | Error (no-op) |
