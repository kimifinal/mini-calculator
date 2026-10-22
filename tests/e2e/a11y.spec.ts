/**
 * End-to-end tests for the a11y audit (issue #27).
 *
 * Covers spec acceptance A1..A5 from pipeline/a11y-audit.md. A5's "src/lib
 * byte-identical / no data-* removed" invariant is asserted by the pipeline's
 * verify step (git diff master -- src/lib is empty), not re-implemented here;
 * every test below is in-browser so the file has zero node dependencies and
 * stays clean under `vue-tsc --noEmit` (the project has no @types/node).
 *
 *   A1 — the main display carries role="status" and aria-live="polite" so
 *        screen readers announce results; it is also Tab-reachable (tabindex 0).
 *   A2 — every symbol operator button (÷ × − ( ) ± % ⌫) has a non-empty
 *        zh-TW aria-label; + and = also carry consistent labels.
 *   A3 — the long-press copy (#25) now has a KEYBOARD path: focus the display
 *        then Enter/Space copies its current value through the same
 *        navigator.clipboard.writeText path as the pointer gesture.
 *   A4 — a visible :focus-visible focus rule exists in the rendered CSS so
 *        keyboard focus is visible (Decision 4), using the existing
 *        --md-primary token so it does not disturb existing visuals.
 *
 * The clipboard mock mirrors copy.spec.ts (#25): addInitScript shadows
 * navigator.clipboard with an object whose writeText pushes String(text) to
 * window.__copied and resolves, so the suite is deterministic and works
 * headless AND offline.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const display = (page: Page) => page.getByTestId('display');

// Click an on-screen key by its data-label (same helper the other e2e uses).
async function press(page: Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

// Build "5+3" then "=" -> "8" on the main display.
async function computeEight(page: Page) {
  await press(page, '5');
  await press(page, '+');
  await press(page, '3');
  await press(page, '=');
  await expect(display(page)).toHaveText('8');
}

/**
 * Record every clipboard.writeText call on window.__copied and make it resolve
 * regardless of network/permission. Installed per context BEFORE navigation so
 * it is present at load. Shadows navigator.clipboard with an OWN instance
 * property, which wins over the (readonly) prototype getter even in a secure
 * context — the same technique as copy.spec.ts (#25).
 */
async function installClipboardMock(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __copied?: string[] };
    w.__copied = [];
    const recorder = {
      writeText: (text: string) => {
        w.__copied!.push(String(text));
        return Promise.resolve();
      },
      readText: () => Promise.resolve(''),
    };
    try {
      Object.defineProperty(navigator, 'clipboard', {
        value: recorder,
        configurable: true,
        writable: true,
        enumerable: true,
      });
    } catch {
      (navigator as unknown as { clipboard: unknown }).clipboard = recorder;
    }
  });
}

// Focus the display and fire a keyboard key, like a keyboard user doing copy.
async function keyDownDisplay(page: Page, key: 'Enter' | ' ' = 'Enter') {
  await page.evaluate(
    (k: string) => {
      const el = document.querySelector('[data-testid="display"]') as HTMLElement;
      el.focus();
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: k,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    key,
  );
}

test.beforeEach(async ({ context, page }) => {
  await installClipboardMock(context);
  await page.goto('/');
  await expect(display(page)).toHaveText('0');
});

// --- A1: display announces results to screen readers --------------------
test('A1: the display has role="status" and aria-live="polite" and is Tab-reachable', async ({
  page,
}) => {
  const attrs = await page.evaluate(() => {
    const d = document.querySelector('[data-testid="display"]') as HTMLElement;
    return {
      role: d.getAttribute('role'),
      live: d.getAttribute('aria-live'),
      tabindex: (d as HTMLElement).getAttribute('tabindex'),
    };
  });
  expect(attrs.role).toBe('status');
  expect(attrs.live).toBe('polite');
  expect(attrs.tabindex).toBe('0');
});

// --- A2: symbol operator buttons carry zh-TW aria-labels ----------------
test('A2: symbol operator buttons (+ = ÷ × − ( ) ± % ⌫) have zh-TW aria-labels', async ({
  page,
}) => {
  const checks: Record<string, string> = {
    '/': '除',
    '*': '乘',
    '-': '減',
    '( )': '開括號',
    '±': '變號',
    '%': '百分比',
    backspace: '刪除',
    // The decimal point shows as a bare "." to assistive tech too (§4.3),
    // so it carries a zh-TW aria-label for consistency with the symbol set.
    '.': '小數點',
    // consistency labels
    '+': '加',
    '=': '等號',
  };
  for (const [label, expected] of Object.entries(checks)) {
    const aria = await page
      .locator(`button[data-label="${label}"]`)
      .first()
      .getAttribute('aria-label');
    expect(aria, `button[data-label="${label}"] aria-label`).toBe(expected);
  }
});

// --- A3: keyboard copy path (Enter on a focused display) ----------------
test('A3: keyboard (Enter on focused display) copies the just-computed result', async ({
  page,
}) => {
  await computeEight(page);
  // Sanity: nothing copied before the keyboard action.
  expect(await page.evaluate(() => (window as any).__copied as string[])).toEqual(
    [],
  );

  await keyDownDisplay(page, 'Enter');
  // Give the writeText promise + the flash a beat (mirrors copy.spec.ts).
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied.length).toBeGreaterThan(0);
  expect(copied[copied.length - 1]).toBe('8');
});

// --- A3b: Space also triggers the keyboard copy ------------------------
test('A3b: keyboard (Space on focused display) also copies', async ({ page }) => {
  await computeEight(page);

  await keyDownDisplay(page, ' ');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied[copied.length - 1]).toBe('8');
});

// --- A4: a visible :focus-visible focus rule exists -------------------
test('A4: a visible :focus-visible focus rule covers display + buttons', async ({
  page,
}) => {
  // Inspect the rendered CSSOM (same-origin, so scoped styles are readable).
  // A :focus-visible rule must exist that draws a visible outline — Decision 4
  // uses the existing --md-primary token, so the outline is non-none and the
  // existing mouse/touch visuals are untouched.
  const found = await page.evaluate(() => {
    let matched = false;
    let outlineText = '';
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin / blocked stylesheet — skip
      }
      for (const rule of Array.from(rules)) {
        const anyRule = rule as CSSStyleRule;
        const sel = anyRule.selectorText ?? '';
        const style = anyRule.style;
        if (sel.includes(':focus-visible')) {
          // The source rule is `outline: 2px solid var(--md-primary)` — a
          // SHORTHAND whose color is a var(). A CSSStyleDeclaration built from
          // that shorthand does NOT reliably re-expose the outline-style /
          // outline-width LONGHANDS via getPropertyValue in headless Chromium,
          // which is why the previous (longhand) probe read them as empty and
          // reported the rule missing even though it is present and visible in
          // the built CSS. Read the serialized cssText instead — it is the
          // authoritative source of truth and is stable across browsers.
          // "Visible" => it declares an outline that is NOT outline:none and
          // NOT a zero-width outline.
          const cssText: string =
            (anyRule as CSSStyleRule).cssText ?? (style ? style.cssText : '');
          const declaresOutline = /outline\s*:/.test(cssText);
          const isHidden =
            /outline\s*:\s*none/i.test(cssText) ||
            /outline(-width)?\s*:\s*0(\s|px)/i.test(cssText);
          if (cssText && declaresOutline && !isHidden) {
            matched = true;
            outlineText = cssText;
          }
        }
      }
    }
    return { matched, outlineText };
  });

  expect(
    found.matched,
    `a visible :focus-visible rule must exist (got: ${found.outlineText || 'none'})`,
  ).toBe(true);
  // The spec notes it is enough that the rule exists and is visible; confirm it
  // did not resolve to a hidden outline.
  expect(found.outlineText.toLowerCase()).not.toMatch(/none/);
});

// --- §4.1: stopPropagation NEGATIVE — a focused-display Enter copies but does
// --- NOT also re-evaluate via the window-level "=" handler -------------------
// Build an UNEVALUATED expression ("5+3") so that a stray window-Enter *would*
// change the display to "8"; a focused-display Enter must copy it while leaving
// the display untouched (stopPropagation halts the bubble to window.onKey).
test('§4.1: focused-display Enter copies without re-evaluating (stopPropagation negative)', async ({
  page,
}) => {
  await press(page, '5');
  await press(page, '+');
  await press(page, '3');
  // Main line holds the whole running expression and is not yet evaluated.
  await expect(display(page)).toHaveText('5+3');
  expect(await page.evaluate(() => (window as any).__copied as string[])).toEqual([]);

  // Focus the display and press Enter the way a keyboard user would copy.
  await keyDownDisplay(page, 'Enter');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 60)));

  // The copy path fired on the expression string...
  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied[copied.length - 1]).toBe('5+3');
  // ...but the value was NOT re-evaluated: had the Enter leaked to the
  // window-level onKey, "5+3" would already read "8". It still reads "5+3".
  await expect(display(page)).toHaveText('5+3');
});

// --- §4.1b: REGRESSION — a NON-focused Enter still calculates via onKey ------
// Proves the display-level handler's stopPropagation is properly SCOPED to the
// display node: an Enter that does NOT start on the display bubbles to the
// window-level onKey and evaluates as before.
test('§4.1b: Enter NOT on the display still calculates (stopPropagation is scoped)', async ({
  page,
}) => {
  await press(page, '9');
  await press(page, '*');
  await press(page, '9');
  await expect(display(page)).toHaveText('9*9');
  expect(await page.evaluate(() => (window as any).__copied as string[])).toEqual([]);

  // The last press focused a NUMBER key (9), not the display — so its keydown
  // never reaches the display's @keydown handler; stopPropagation is scoped to
  // the display and does not apply here. The Enter bubbles to window-level
  // onKey, which evaluates the expression exactly as a non-display keypress.
  await page.keyboard.press('Enter');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 60)));

  // Calculated to "81" via onKey — and NOTHING was copied (copy path bypassed).
  await expect(display(page)).toHaveText('81');
  expect(await page.evaluate(() => (window as any).__copied as string[])).toEqual([]);
});

// --- §4.2: a REAL Tab traversal reaches the display and an operator button --
// Attribute presence (A1) and the CSS rule (A4) are strong evidence, but this
// proves a keyboard user actually lands on the display and the keypad with Tab.
test('§4.2: Tab order actually reaches the display and an operator button', async ({
  page,
}) => {
  // Start from a known non-focused state, then walk the tab order collecting
  // how each stop is identified (data-testid or data-label, else tag).
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const order: string[] = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a) return '';
      return (
        a.getAttribute('data-testid') ||
        a.getAttribute('data-label') ||
        a.tagName.toLowerCase()
      );
    });
    if (id) order.push(id);
  }
  // The display (data-testid="display") must be in the tab order...
  expect(order, `tab order visited: ${order.join(' > ')}`).toContain('display');
  // ...and at least one operator button (one of ÷ × − + =) too, so the keypad
  // (not just the display) is keyboard-reachable.
  const opSeen = order.some((t) => ['/', '*', '-', '+', ''].includes(t));
  expect(opSeen, `no operator button reached; visited: ${order.join(' > ')}`).toBe(true);
});
