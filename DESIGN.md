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

## Do's and Don'ts

- Do reference `--md-*` tokens; don't hard-code hex in component CSS.
- Do keep keys as rounded squares (26px); don't revert to full circles.
- Don't add gradients or glassmorphism (removed from history panel).
- The `AC` red is intentional (MD3 destructive convention) — don't silently
  recolor without a confirmed design change.

## Layout (real, 21 keys, 6 rows × 4 cols)

```
AC   ±    ( )   %
÷    7    8    9
×    4    5    6
−    1    2    3
+    0    .    ⌫
=
```
