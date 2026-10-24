import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
// measure real geometry: shell + every button rect
const geo = await p.evaluate(() => {
  const shell = document.querySelector('[data-testid="calculator"]');
  const s = shell.getBoundingClientRect();
  const btns = [...document.querySelectorAll('.btn')].map(el => {
    const r = el.getBoundingClientRect();
    return { label: el.dataset.label, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) };
  });
  return { shell: { x:s.x, y:s.y, w:s.width, h:s.height }, count: btns.length, btns };
});
console.log(JSON.stringify(geo, null, 1));
await p.screenshot({ path: '/Users/hermes-agent/.hermes/cache/scratch/live_basic.png', fullPage: false });
console.log('SHOT saved');
await b.close();
