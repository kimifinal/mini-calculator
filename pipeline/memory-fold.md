# Pipeline spec — memory-fold (#14)

## Goal
Add memory keys M+ / M- / MR / MC to the calculator, shown in a FOLDABLE cluster.
Default = folded (basic keypad only, identical to current app). A small icon-only
chevron toggle (below the preview line, left-aligned) expands one row of 4 memory
keys above the keypad. Memory value + fold state persist to localStorage.

## Confirmed design (DESIGN.md tokens, v4 — user confirmed 2026-10-23)
- **Fold toggle**: circular icon button, 28px (smaller than the 36px history
  toggle = "secondary"), bg `rgba(208,188,255,.12)` (hover .22). Chevron SVG
  stroke 2.2, `--md-primary` color.
  - Folded (default): chevron points DOWN; `transform: rotate(0deg)`.
  - Expanded: chevron rotated 180° (points UP). `transition: transform 0.25s ease`.
  - `aria-label` follows state ('展開記憶鍵' / '收合記憶鍵'); `aria-expanded` synced.
  - NO hint dot (dropped per user).
  - Position: own row `.fold-row` between `.display-preview` and `.keyboard`, left-aligned.
- **Memory row**: `.memory-row` grid `repeat(4,1fr)`, gap 10px, slides in via
  `max-height`/`opacity` transition 0.25s. Keys = M+ / M- / MR / MC, each
  `--md-primary-container` bg / `--md-on-primary-container` text (purple, distinct
  from basic keys). data-label exactly "M+", "M-", "MR", "MC".
- **Fold state persisted**: `localStorage['calc-mem-fold-v1']` = '1' (expanded) /
  absent or '0' (folded). Load at setup (like useHistory) so no flash.
- History toggle (top-left) UNCHANGED. Folded state == current app layout exactly.

## Memory semantics
- `M+`: mem += numeric value of current displayValue (parse the expression;
  if it evaluates to a number use that, else the literal number).
- `M-`: mem -= current displayValue.
- `MR`: load `mem` into displayValue (like loadHistoryEntry: set justEvaluated=true,
  hasError=false so next digit starts fresh).
- `MC`: mem = 0.
- mem persisted to `localStorage['calc-mem-v1']`.

## Architecture rule (SSOT)
- Put the memory value + fold-state logic in a NEW composable
  `src/composables/useMemory.ts` (mirror useHistory.ts exactly: guarded localStorage
  with typeof-window + try/catch, namespaced keys, load at setup).
  `addMem(n) / subMem(n) / recallMem() / clearMem() / getMem()` +
  fold state: `isFolded` ref + `toggleFold()`, persisted.
- Calculator.vue wires the new keys + toggle to the composable.
- DO NOT touch `src/lib/calculator.ts` or `src/lib/expression.ts` (SSOT, verify.py
  ssot gate fails RED if they change).
- DO NOT delete untracked files / DO NOT run `git clean`.

## Acceptance (each becomes a test)
1. `5` M+ `10` M+ → MR shows 15; after MC, MR shows 0.
2. Memory persists: reload → MR still 15.
3. Fold state persists: expand → reload → still expanded.
4. Folded default: all existing e2e (35) stay green (keyboard layout unchanged
   when .memory-row is hidden and .fold-row collapsed).
5. New e2e for M+ / M- / MR / MC (4 behaviors).
6. Toggle flips chevron 180° between states; aria-expanded syncs.
7. `src/lib/` 0 files changed.

## Constraints
- zh-TW aria-labels only (s2t check: no simplified chars).
- Pure-CSS + composable + template wiring; no new deps.
- Keep data-testid / data-label attributes stable where keys already exist; add
  `data-label="M+"` etc for the new memory buttons and `data-testid="fold-toggle"`
  for the toggle so e2e can target them.
- Guard all localStorage (jsdom/node safe, like useHistory).
- verify.py gates: typecheck, ssot(src/lib diff empty), build, unit, e2e.

## Files to change (expected)
- NEW: src/composables/useMemory.ts
- EDIT: src/components/Calculator.vue (template toggle+memory row, script wiring,
  scoped CSS for .fold-row/.fold-btn/.chevron/.memory-row/.btn.mem)
- NEW: tests/e2e/memory.spec.ts (or append to calculator.spec.ts)
- UPDATE: DESIGN.md (add the fold-toggle + memory-key tokens/layout block)
