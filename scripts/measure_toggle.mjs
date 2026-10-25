import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4199/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const geo = await p.evaluate(() => {
  const shell = document.querySelector('[data-testid="calculator"]');
  const theme = document.querySelector('.theme-toggle');
  const hist = document.querySelector('.history-toggle');
  const disp = document.querySelector('.display');
  const prev = document.querySelector('.display-preview');
  const r = el => el ? (x => ({ x:+x.x.toFixed(1), y:+x.y.toFixed(1), w:+x.width.toFixed(1), h:+x.height.toFixed(1), top:+x.y.toFixed(1), bottom:+(x.y+x.height).toFixed(1), left:+x.x.toFixed(1), right:+(x.x+x.width).toFixed(1) }))(el.getBoundingClientRect()) : null;
  const shellR = r(shell), themeR = r(theme), dispR = r(disp);
  // overlap test: theme rect vs display rect (AABB)
  const overlap = (a, b2, axis) => {
    const a1 = axis === 'v' ? a.y : a.x, a2 = axis === 'v' ? a.bottom : a.right;
    const b1 = axis === 'v' ? b2.y : b2.x, b2b = axis === 'v' ? b2.bottom : b2.right;
    const lo = Math.max(a1, b1), hi = Math.min(a2, b2b);
    return hi - lo; // >0 means overlap on that axis
  };
  const ox = overlap(themeR, dispR, 'h'), oy = overlap(themeR, dispR, 'v');
  return { shell: shellR, theme: themeR, history: r(hist), display: dispR, preview: r(prev),
    hOverlap: +ox.toFixed(1), vOverlap: +oy.toFixed(1),
    overlaps_display: (ox > 0 && oy > 0) };
});
console.log('GEOMETRY=' + JSON.stringify(geo));
// screenshot showing the overlap (BEFORE fix)
await p.screenshot({ path: '/Users/hermes-agent/.hermes/cache/scratch/before_overlap.png', fullPage: false });
console.log('BEFORE screenshot saved');
await b.close();
