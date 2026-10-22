// Dependency-free PNG icon generator for the PWA manifest.
//
// Why this exists: the host has no ImageMagick / rsvg-convert / PIL, and
// sips cannot rasterize SVG. We emit valid 32-bit RGBA PNGs straight from a
// small scene so the icons are reproducible and commit-able (no heavy dep).
//
// Usage: node scripts/gen-icon.mjs
// Writes: public/icons/icon-192x192.png, icon-512x512.png,
//         icon-maskable-512x512.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- Minimal PNG encoder (RGBA, 8-bit, no interlace) ------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function encodePNG(width, height, pixel) {
  // pixel(x, y) -> [r, g, b, a]
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (rowBytes + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

// --- Scene: an on-brand MD3 calculator --------------------------------------
// Colors from DESIGN.md / App.vue frozen SSOT (not read, just mirrored here so
// the icon matches the app; src/lib is untouched).
const C = {
  bg: ['#0f', '0d', '13'],             // --md-sc-lowest  body backdrop
  body: ['#2b', '29', '30'],          // --md-sc-high    calculator body
  key: ['#49', '45', '4f'],           // --md-surface-variant  keys
  accent: ['#d0', 'bc', 'ff'],        // --md-primary    display + "="
};

function hexPair(h) {
  return h.map((s) => parseInt(s, 16));
}
const BG = hexPair(C.bg);
const BODY = hexPair(C.body);
const KEY = hexPair(C.key);
const ACC = hexPair(C.accent);

// Rounded-rect fill test (anti-aliased 1px, fine at 512 scale).
function inRoundRect(x, y, sx, sy, w, h, r) {
  if (x < sx || x >= sx + w || y < sy || y >= sy + h) return false;
  const cx = x < sx + r ? sx + r : x >= sx + w - r ? sx + w - r : x;
  const cy = y < sy + r ? sy + r : y >= sy + h - r ? sy + h - r : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function dist(a, b) {
  return [
    Math.round(((a[0] & 0xff) * b[3] + (a[0] & 0xff) * 0) / 1) & 0xff, // placeholder
  ][0];
}
// Simple blend helper (over transparent).
function blend(back, front) {
  const [r, g, b, a] = front;
  const fa = a / 255;
  return [
    Math.round(r * fa + back[0] * (1 - fa)),
    Math.round(g * fa + back[1] * (1 - fa)),
    Math.round(b * fa + back[2] * (1 - fa)),
    255,
  ];
}

// Build a calculator scene at any size. opts.pad = maskable safe-zone padding.
function scene(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.12 : size * 0.08;
  const x0 = pad, y0 = pad, w = size - pad * 2, h = size - pad * 2;
  const r = Math.min(w, h) * 0.16;

  return (px, py) => {
    let px_ = [BG[0], BG[1], BG[2], 255];

    // Calculator body (rounded).
    const bodyIn = { x: x0, y: y0, w, h, r };
    let onBody = inRoundRect(px, py, x0, y0, w, h, r);
    if (onBody) px_ = blend(px_, [BODY[0], BODY[1], BODY[2], 255]);

    if (!onBody) return px_;

    // Top display bar (accent).
    const dispH = h * 0.16;
    const dispX = x0 + w * 0.08;
    const dispW = w * 0.84;
    const dispY = y0 + h * 0.08;
    const dispR = dispH * 0.35;
    if (inRoundRect(px, py, dispX, dispY, dispW, dispH, dispR)) {
      px_ = blend(px_, [ACC[0], ACC[1], ACC[2], 255]);
      return px_;
    }

    // 3x4 grid of keys below the display.
    const gridX = x0 + w * 0.08;
    const gridW = w * 0.84;
    const gridY = y0 + h * 0.32;
    const gridH = y0 + h * 0.84 - gridY;
    const cols = 3, rows = 4;
    const gap = Math.min(gridW, gridH) * 0.06;
    const kw = (gridW - gap * (cols - 1)) / cols;
    const kh = (gridH - gap * (rows - 1)) / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const kx = gridX + col * (kw + gap);
        const ky = gridY + row * (kh + gap);
        if (inRoundRect(px, py, kx, ky, kw, kh, kw * 0.28)) {
          // Bottom-right key is the "=" (accent), others are neutral.
          const isEquals = row === rows - 1 && col === cols - 1;
          const c = isEquals ? ACC : KEY;
          px_ = blend(px_, [c[0], c[1], c[2], 255]);
        }
      }
    }
    return px_;
  };
}

// Render.
const sizes = [192, 512];
for (const s of sizes) {
  const png = encodePNG(s, s, scene(s));
  writeFileSync(join(OUT, `icon-${s}x${s}.png`), png);
  console.log(`wrote public/icons/icon-${s}x${s}.png (${png.length} bytes)`);
}
const maskable = encodePNG(512, 512, scene(512, { maskable: true }));
writeFileSync(join(OUT, 'icon-maskable-512x512.png'), maskable);
console.log(`wrote public/icons/icon-maskable-512x512.png (${maskable.length} bytes)`);
console.log('OK: all PWA icons generated');
