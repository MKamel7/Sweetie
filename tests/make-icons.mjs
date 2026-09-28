// Render icons/icon.svg to the PNG sizes Android needs to offer "Install app".
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.12], // keep the art inside the maskable safe zone
];
for (const [name, size, pad] of shots) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  const art = pad ? svg.replace('rx="112"', '') : svg;
  await page.setContent(`<body style="margin:0;background:${pad ? '#f6e4e1' : 'transparent'};display:grid;place-items:center;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${art.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body>`);
  await page.screenshot({ path: new URL(`../icons/${name}`, import.meta.url).pathname, omitBackground: !pad });
}
await browser.close();
console.log('icons written');
