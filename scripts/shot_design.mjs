import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 860, height: 720 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.goto('file:///Users/hermes-agent/.hermes/cache/scratch/design/memory-fold-v1.html');
await page.waitForTimeout(300);
// full-page capture
await page.screenshot({ path: '/Users/hermes-agent/.hermes/cache/scratch/design/memory-fold-v1.png', fullPage: true });
console.log('console errors:', errs.length ? errs : 'none');
console.log('PNG saved');
await b.close();
