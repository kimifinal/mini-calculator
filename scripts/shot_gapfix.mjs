import { chromium } from '@playwright/test';
const out = process.env.OUT || '/tmp';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
for (const k of ['9','*','9']) { await p.locator(`button[data-label="${k}"]`).first().click(); await p.waitForTimeout(80); }
await p.locator('button[data-label="="]').first().click();
await p.waitForTimeout(120);
await p.locator('button[data-testid="fold-toggle"]').first().click();
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/gapfix_expanded.png` });
await b.close();
console.log('shot written');
