# Feature Spec: Calculation History (issue #13)

**Status:** approved (four-role pipeline, #2 of the backlog)
**Roles exercised:** Architect -> Coder -> Reviewer -> Tester
**Branch:** `feature/history` (off master `a097feb`)
**Source of truth (SSOT):** this file.
**Reference component:** `src/components/Calculator.vue` (read it fully first).

## 1. Goal
After the user presses `=`, the completed calculation is stored in a **history**
list. The list is shown in a collapsible panel, persisted in `localStorage`
(survives reload), each entry is clickable to reload its result, and the list
can be cleared. Pure UI feature — no change to the arithmetic modules.

## 2. Behaviour (requirements, testable)
- **Record on `=`**: only on a *successful* result (never on `Error`). Both
  evaluation paths must record:
  - expression mode: store a human-readable line, e.g. `2+3*4 = 14`
    (the expression string entered + ` = ` + the formatted result).
  - legacy mode: store `<first> <op> <second> = <result>`, e.g. `5 + 3 = 8`.
- **Newest first**: each new entry appears at the TOP of the list.
- **Click to reload**: clicking an entry loads its *result* into the display and
  starts a fresh calc (next digit replaces, does not append — i.e. the same
  effect as just-pressed `=`).
- **Clear**: a "clear history" control empties the list AND the
  `localStorage` copy.
- **Persistence**: the list is reloaded from `localStorage` on mount, and
  written on every record / clear. Key is namespaced: `calc-history-v1`.
- **Cap**: keep at most **50** entries; oldest is dropped when exceeded.
- **Toggle**: the panel is hidden by default; a toggle button shows/hides it.

## 3. Constraints
- **UI-only**: do NOT modify `src/lib/calculator.ts` or `src/lib/expression.ts`
  (SSOT). All history state lives in `Calculator.vue` (or a new small
  `src/composables/useHistory.ts` if cleaner — but keep the public
  `result-calculated` emit and existing `data-test`/`data-label` hooks intact).
- Do not regress the 4x5 round-button layout or the existing 51 unit / 12 e2e
  tests. New controls get their own `data-test`/`data-label` so existing
  selectors are unaffected.
- Keep the iOS visual style (black bg, round buttons, sage/cream accents);
  the history panel may be a simple overlay/scoped style, no new dependency.
- `localStorage` access must be guarded so it never throws in a node/jsdom test
  env that lacks `window` (wrap in a try/catch or `typeof window` check).
- No new third-party dependency.

## 4. Tests (add, do not delete existing)
- **Unit** (`tests/unit/Calculator.spec.ts`, extend with `data-test` selectors):
  1. after `5 + 3 =`, a history entry `5 + 3 = 8` is recorded.
  2. clicking that history entry loads `8` into the display.
  3. `Error` result (e.g. `10 / 0 =`) is NOT recorded.
  4. clear history empties the list; after clear the `localStorage` value is
     gone/empty.
  5. (persistence) loading the component picks up an entry that was already in
     `localStorage` before mount.
  6. (cap) inserting 51 entries leaves exactly 50 (oldest dropped).
- **E2E** (`tests/e2e/calculator.spec.ts`):
  1. compute `5 + 3 = 8`, assert `5 + 3 = 8` visible in the history panel;
     click it, assert the display shows `8`.
- Add a `data-test="history-toggle"`, `data-test="history-panel"`
  (`data-testid="history-list"` on the list), each entry
  `data-test="history-entry"` carrying its text, and `data-test="history-clear"`.

## 5. Definition of done
- `vue-tsc --noEmit` clean
- `vitest run` all pass (existing 51 + new history tests)
- `vitest run` history unit coverage; `playwright test` history e2e pass
- `git --no-pager diff master -- src/lib/` is empty (SSOT untouched)
- review_report.md verdict PASS

## 6. Acceptance examples
| Action | Expected history |
|--------|------------------|
| `5 + 3 =` | list = [ `5 + 3 = 8` ] |
| click that entry | display = `8`, next digit starts fresh |
| `10 / 0 =` | list unchanged (Error not recorded) |
| clear | list empty, localStorage cleared |
| reload page | previous list restored |
| 51 records | list length 50 (oldest dropped) |
