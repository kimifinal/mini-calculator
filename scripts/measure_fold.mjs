import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
const bb = async (sel) => { const el = p.locator(sel); return (await el.count()) ? await el.first().boundingBox() : null; };
const gap = (a, b2, label) => console.log('  GAP', label, '=', b2 && a ? (b2.y - (a.y + a.height)).toFixed(1) + 'px' : 'n/a');

// FOLDED (default): chevron -> AC
let t = await bb('button[data-testid="fold-toggle"]');
let ac = await bb('button[data-label="AC"]');
console.log('FOLDED:'); gap(t, ac, 'chevron->AC');

// EXPANDED: chevron -> M+ -> AC  (RE-MEASURE AC after expanding — the earlier
// version cached the folded AC position and missed the memory-row -> AC gap)
await p.locator('button[data-testid="fold-toggle"]').first().click();
await p.waitForTimeout(400);
t = await bb('button[data-testid="fold-toggle"]');
let mp = await bb('button[data-label="M+"]');
ac = await bb('button[data-label="AC"]');   // RE-measured live
console.log('EXPANDED:'); gap(t, mp, 'chevron->M+'); gap(mp, ac, 'M+->AC (the gap you flagged)');
await b.close();
