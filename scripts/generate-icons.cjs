// One-off icon generator. Renders a flat "O" monogram with Playwright's Chromium.
// Usage: node scripts/generate-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BG = '#0b0b0e';
// scale: share of the canvas the ring occupies (maskable icons keep to the central safe zone)
const svg = (size, scale) => {
  const c = size / 2;
  const outer = (size * scale) / 2;
  const stroke = outer * 0.3;
  const r = outer - stroke / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${BG}"/>
<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#f4f4f6" stroke-width="${stroke}"/>
<circle cx="${c}" cy="${c}" r="${outer * 0.18}" fill="#f4f4f6"/>
</svg>`;
};

const targets = [
  { file: 'icon-192.png', size: 192, scale: 0.62 },
  { file: 'icon-512.png', size: 512, scale: 0.62 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.62 },
];

(async () => {
  const out = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
    await page.setContent(`<body style="margin:0">${svg(t.size, t.scale)}</body>`);
    await page.screenshot({ path: path.join(out, t.file), clip: { x: 0, y: 0, width: t.size, height: t.size } });
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'icon.svg'), svg(512, 0.62));
  await browser.close();
})();
