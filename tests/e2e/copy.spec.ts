/**
 * End-to-end tests for the LONG-PRESS-TO-COPY feature.
 *
 * Entry point (by design): a LONG press on the MAIN display div (data-testid=
 * "display"). It is NOT a new key — the 5x4 keypad is untouched. Press the main
 * line for >400ms and its current value is written to the clipboard; the small
 * preview line (data-testid="display-preview") briefly shows "已複製" as
 * feedback. A short tap/click must NOT copy.
 *
 * The clipboard is mocked per context (navigator.clipboard.writeText records to
 * window.__copied and resolves), so the suite is deterministic and works
 * headless AND offline (a6 below). The long press is driven by real PointerEvents
 * (dispatched via evaluate) because Playwright's mouse -> Chromium pointer-event
 * synthesis can miss the handler; the component wires @pointerdown/@pointerup/
 * @pointerleave/@pointercancel exactly the way a real gesture fires.
 *
 * Acceptance coverage:
 *   A1 — long-press copies the just-computed result (5+3=8 -> "8").
 *   A2 — a short tap/click does NOT copy.
 *   A4 — after a copy the preview shows "已複製", then it fades out (~1.2s).
 *   A6 — long-press copy still works while OFFLINE (PWA boots, no crash).
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const display = (page: Page) => page.getByTestId('display');
const preview = (page: Page) => page.getByTestId('display-preview');

// Click an on-screen key by its data-label (same helper the main e2e uses), so
// we can build a result (5 + 3 =) before copying it.
async function press(page: Page, label: string) {
  await page.locator(`button[data-label="${label}"]`).first().click();
}

// Build "5+3" then press "8" path: 5, +, 3, =
async function computeEight(page: Page) {
  await press(page, '5');
  await press(page, '+');
  await press(page, '3');
  await press(page, '=');
  await expect(display(page)).toHaveText('8');
}

// Long-press the main display. Dispatch a real pointerdown, hold 550ms (> the
// 400ms threshold so the copy timer fires), then pointerup (which cancels the,
// now-fired, timer). Returns after the gesture.
async function longPressDisplay(page: Page) {
  await page.evaluate(() =>
    new Promise<void>((resolve) => {
      const el = document.querySelector('[data-testid="display"]') as HTMLElement;
      el.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
      setTimeout(() => {
        el.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, cancelable: true }),
        );
        resolve();
      }, 550);
    }),
  );
}

// A SHORT tap on the display: pointerdown then immediate pointerup (< 400ms), so
// the copy timer is cancelled and nothing is copied.
async function tapDisplay(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="display"]') as HTMLElement;
    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    el.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, cancelable: true }),
    );
  });
}

/**
 * Record every clipboard.writeText call on window.__copied and make it resolve
 * regardless of network/permission. Installed on the context BEFORE the first
 * navigation so it is present at load. It shadows navigator.clipboard with an
 * OWN instance property, which wins over the (readonly) prototype getter even in
 * a secure context where the native clipboard exists.
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
      // Fallback if the own-property definition is somehow blocked.
      (navigator as unknown as { clipboard: unknown }).clipboard = recorder;
    }
  });
}

test.beforeEach(async ({ context, page }) => {
  await installClipboardMock(context);
  await page.goto('/');
  await expect(display(page)).toHaveText('0');
});

// --- A1: long-press copies the just-computed -------------------------
test('A1: long-press the display copies the just-computed result (5+3=8 -> "8")', async ({
  page,
}) => {
  await computeEight(page);
  // Sanity: before the press, nothing has been copied.
  expect(await page.evaluate(() => (window as any).__copied as string[])).toEqual([]);

  await longPressDisplay(page);
  // Give the writeText promise + the flash a beat.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  // A copy must have happened, and the most recently copied value is exactly the
  // main display's value. (Assert length first, then the last entry — popping
  // the value before checking the length is what tripped the previous run.)
  expect(copied.length).toBeGreaterThan(0);
  expect(copied[copied.length - 1]).toBe('8');
});

// --- A2: a SHORT tap must NOT copy -----------------------------------
test('A2: a short tap/click on the display does NOT copy', async ({ page }) => {
  await computeEight(page);

  await tapDisplay(page);
  // Allow a tick in case a too-granule implementation would have queued a copy.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied).toEqual([]);
});

// --- A3: "Error" / empty are skipped (defensive) ---------------------
test('A3: long-press does NOT copy an "Error" display', async ({ page }) => {
  // 10 / 0 -> Error
  await press(page, '1');
  await press(page, '0');
  await press(page, '/');
  await press(page, '0');
  await press(page, '=');
  await expect(display(page)).toHaveText('Error');

  await longPressDisplay(page);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied).toEqual([]);
});

// --- A4: feedback "已複製" appears then fades -----------------------
test('A4: after a copy the preview shows "已複製" then it fades out', async ({
  page,
}) => {
  await computeEight(page);
  await longPressDisplay(page);

  // Right after the copy, the feedback text is on the preview line.
  await expect(preview(page)).toContainText('已複製');

  // After the ~1.2s window it is gone (the component clears it at 1200ms).
  await page.waitForTimeout(1300);
  await expect(preview(page)).not.toContainText('已複製');
});

// --- A6: long-press copy still works OFFLINE (PWA) -------------------
test('A6: long-press copy still works while OFFLINE (no crash)', async ({
  context,
  page,
}) => {
  // Compute a result online first.
  await computeEight(page);

  // Make the browser offline; the PWA service worker must serve the cached app
  // shell so the reloaded page still boots (the "no crash" half of a6).
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // The cached app booted: the display is present and interactive.
  await expect(display(page)).toBeVisible();

  // The clipboard mock re-runs on reload, so __copied was reset to []. Build a
  // fresh result and copy it while offline — the copy path needs no network
  // because the clipboard is mocked.
  await expect(display(page)).toHaveText('0');
  await computeEight(page);
  await longPressDisplay(page);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  // Offline copy still recorded, and the app did not crash.
  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied).toContain('8');
  await expect(display(page)).toBeVisible();

  await context.setOffline(false);
});

// --- A7: "0" is still copyable (the skip rule is only Error/empty) ---
test('A7: long-press copies a genuine "0" (only Error/empty are skipped)', async ({
  page,
}) => {
  // Fresh display is "0" on every new load.
  await expect(display(page)).toHaveText('0');
  await longPressDisplay(page);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));

  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied.length).toBeGreaterThan(0);
  expect(copied[copied.length - 1]).toBe('0');
});

// --- A8: REGRESSION GUARD — the display must block NATIVE text selection so a
// --- real mobile long-press does NOT trigger the browser's "Copy/Share/Search"
// --- callout. That callout emits pointercancel before our 400ms copyTimer fires,
// --- silencing copyValue() — the EXACT bug that passed here in headless Chromium
// --- (synthetic pointer events never fire the native text-selection path) yet
// --- failed on a real phone. This test asserts the CSS that prevents it, so a
// --- future change cannot silently reintroduce the regression.
// ---
// NOTE: `user-select: none` is the DECISIVE property — every modern engine AND
// iOS Safari honor it to block text selection on the touch target, so we HARD
// assert it. `-webkit-touch-callout` is an iOS-Safari-only property that the
// CSSOM does NOT expose in Chromium, so we only SOFT-check it: if the built
// stylesheet declares it, it must be none; absence (Chromium) is expected and
// not a failure.
test('A8: the display blocks native mobile text selection (no long-press callout)', async ({
  page,
}) => {
  const guard = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="display"]') as HTMLElement;
    const cs = getComputedStyle(el);
    const userSelect = cs.getPropertyValue('user-select').trim();
    // Scan rendered stylesheets for the callout rule (the iOS-only property is
    // not reflected in getComputedStyle under Chromium; read the source).
    let callout = '';
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin / blocked stylesheet
      }
      for (const rule of Array.from(rules)) {
        const r = rule as CSSStyleRule;
        if (r.selectorText && r.selectorText.includes('.display') && r.cssText) {
          const m = r.cssText.match(/-webkit-touch-callout\s*:\s*(\w+)/i);
          if (m) callout = m[1];
        }
      }
    }
    return { userSelect, callout };
  });
  console.log('A8 guard:', JSON.stringify(guard));
  // Decisive, cross-engine guard: text is non-selectable on the display.
  expect(
    guard.userSelect,
    `user-select must block selection (got ${guard.userSelect})`,
  ).toBe('none');
  // Soft guard: if the engine/stylesheet exposes the iOS callout property, it
  // must be none. Absence under Chromium is expected — not a failure.
  if (guard.callout) {
    expect(
      guard.callout.toLowerCase(),
      `-webkit-touch-callout must be none when present (got "${guard.callout}")`,
    ).toBe('none');
  }
});
