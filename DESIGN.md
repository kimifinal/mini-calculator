# DESIGN.md — mini-calculator (Material Design 3, dark baseline)

Frozen visual SSOT for the calculator UI. Coder + Designer consume these tokens;
never hand-edit colors in component CSS — reference a token here. Values are the
MD3 *baseline dark* scheme from <https://m3.material.io/foundations/color/baseline>
(fetched 2026-10).

## Overview

Minimal instrument surface. Tonal dark canvas, single purple accent, expressive
rounded-square keys, soft elevation. No gradients, no glass. The display is the
hero; buttons recede.

## Colors

| Token | Hex | Role |
|---|---|---|
| `--md-primary` | `#d0bcff` | Accent (equals focus, chevron, selection) |
| `--md-on-primary` | `#381e72` | Text/icon on primary |
| `--md-primary-container` | `#4f378b` | `=` filled button bg |
| `--md-on-primary-container` | `#eaddff` | `=` button text |
| `--md-secondary-container` | `#4a4458` | operator (`+ − × ÷ % ± ( )`) bg |
| `--md-on-secondary-container` | `#e8def8` | operator button text |
| `--md-error-container` | `#8c1d18` | `AC` destructive button bg |
| `--md-on-error-container` | `#f9dedc` | `AC` button text |
| `--md-surface` | `#141218` | base surface |
| `--md-on-surface` | `#e6e0e9` | primary text / number key text |
| `--md-surface-variant` | `#49454f` | dividers |
| `--md-on-surface-variant` | `#cac4d0` | secondary text / labels |
| `--md-outline` | `#938f99` | outline |
| `--md-outline-variant` | `#49454f` | subtle dividers |
| `--md-sc-lowest` | `#0f0d13` | page backdrop (`body`) |
| `--md-sc-low` | `#1d1b20` | calculator shell bg |
| `--md-sc` | `#211f26` | — |
| `--md-sc-high` | `#2b2930` | elevated controls / clear pill |
| `--md-sc-highest` | `#36343b` | number keys + history panel bg |

## Typography

Family: `Roboto / Google Sans` (system fallback). Display: 54px weight 300,
tabular-nums. Buttons: 26px. Accent emphasis: weight 500–600.

## Shapes (corner radius)

- Calculator shell: **36px** (large)
- Keys + keys: **26px** (expressive rounded square, *not* full circle)
- History panel: **28px**
- Icon toggle / clear: circle / pill

## Elevation

MD3 standard shadows on the shell and panel:
`0 1px 2px rgba(0,0,0,.6), 0 8px 24px 4px rgba(0,0,0,.5), 0 24px 48px 12px rgba(0,0,0,.45)`.

## Components

| Component | Token mapping |
|---|---|
| Number / dot / backspace key | bg `--md-sc-highest`, text `--md-on-surface`, radius 26 |
| Operator key (`+ − × ÷ % ± ( )`) | bg `--md-secondary-container`, text `--md-on-secondary-container` |
| `=` key | bg `--md-primary-container`, text `--md-on-primary-container` |
| `AC` key | bg `--md-error-container`, text `--md-on-error-container` |
| Clock toggle | bg `--md-secondary-container`, text `--md-on-secondary-container`, circle |
| History panel | bg `--md-sc-highest`, radius 28, elevation shadow |
| History selection | `rgba(208,188,255,.14)` bg + `1.5px` primary inset border |
| Current-expression bar | bg `rgba(208,188,255,.10)`, value `--md-on-primary-container` |
| Fold toggle (icon chevron) | 28px circle, bg `rgba(208,188,255,.12)` (hover `.22`), icon `--md-primary` stroke 2.2 |
| Memory key (`M+ M- MR MC`) | bg `--md-primary-container`, text `--md-on-primary-container` (purple) |
| Science key (`x² √ 1/x xʸ`) | bg `--md-secondary-container`, text `--md-on-secondary-container`, radius 26 |

## Memory keys + fold toggle (issue #14)

A foldable cluster of 4 memory keys sits ABOVE the keypad and is the ONLY
visual change when *expanded*; when **folded** the keypad layout is identical to
the baseline (zero change to existing keys/positions). State is persisted to
`localStorage` (`calc-mem-v1` value, `calc-mem-fold-v1` fold), reloaded in the
composable at setup — no flash. Logic lives in `src/composables/useMemory.ts`
(the arithmetic SSOT `src/lib/*` is untouched).

- **Fold toggle** — a circular, icon-only chevron on its own row (`.fold-row`)
  *between* the preview line and the keyboard, **left-aligned**.
  - Size **28px** (smaller than the 40px history toggle = "secondary"); it never
    grows the folded layout.
  - Background `rgba(208,188,255,.12)` (a tonal tint of `--md-primary`
    `#d0bcff`); hover `.22`. Icon = `--md-primary`, stroke-width **2.2**.
  - **Folded** (default): chevron points DOWN, `transform: rotate(0deg)`.
    **Expanded**: chevron **rotates 180°** (points UP), `transition:
    transform 0.25s ease`.
  - `aria-label` follows state — `'展開記憶鍵'` (folded) / `'收合記憶鍵'`
    (expanded); `aria-expanded` synced (`false` folded / `true` expanded).
    **No hint dot** (dropped).
- **Memory row** (`.memory-row`) — grid `repeat(4, 1fr)`, gap 10px (matches the
  keypad). Slides in via `max-height` + `opacity`, **0.25s**. Collapsed (folded)
  => 0 height / `opacity 0`, so the folded layout is unchanged.
  - Keys **M+ / M- / MR / MC**, each `--md-primary-container` bg /
    `--md-on-primary-container` text (purple, distinct from numbered keys and
    operators).
  - `data-label` exactly `M+`, `M-`, `MR`, `MC`; the toggle carries
    `data-testid="fold-toggle"`.
- **Semantics** — `M+`/`M-` add/subtract the *current display value* (evaluated
  through the `parseExpression` SSOT); `MR` loads memory into the display like a
  history tap (`justEvaluated=true`, fresh next digit); `MC` sets memory to 0.

## Science keys (issue #36 / B2)

A permanent 4-key row `x² √ 1/x xʸ` sits **above** the keypad (same width/grid
as the keypad, `--md-secondary-container` bg / `--md-on-secondary-container`
text), so folding or the existing 21-key layout stay byte-identical. The three
unary ops **apply immediately** to the current number on the display — no
trailing `=` needed — mirroring `%`: each result is round-tripped through the
same `Math.round((x + Number.EPSILON) * 1e12) / 1e12` guard the main `=` path
uses, latching `justEvaluated=true` so the next digit (and any stray `=`) starts
fresh. A domain error latches the display to `Error` instead: `√` of a negative
radicand and `1/x` of `0`. `xʸ` does **not** evaluate — it **appends the
RIGHT-ASSOCIATIVE binary power operator `^`** into the expression string. The
shunting-yard parser (`src/lib/expression.ts`) treats `^` as right-associative
with precedence above `* /` (4, just below the unary tier 3), so `2^3^2` groups
as `2^(3^2) = 512`, not `(2^3)^2 = 64`. `^` flows through `calculate()`
(`Math.pow`) and the parser's `evalRPN`, so the whole expression — including
mixed `+ − × ÷ ^` and parentheses — still evaluates on `=`.

## Do's and Don'ts

- Do reference `--md-*` tokens; don't hard-code hex in component CSS.
- Do keep keys as rounded squares (26px); don't revert to full circles.
- Don't add gradients or glassmorphism (removed from history panel).
- The `AC` red is intentional (MD3 destructive convention) — don't silently
  recolor without a confirmed design change.

## Layout (real, 25 keys — science row + 21-key, 7 rows × 4 cols)

```
x²   √    1/x   xʸ
AC   ±    ( )   %
÷    7    8    9
×    4    5    6
−    1    2    3
+    0    .    ⌫
=
```
