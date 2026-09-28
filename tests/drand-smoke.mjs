// Live check of the real unlock path, run in CI before every deploy (needs internet).
// Seals a message to a beacon round from a minute ago, then opens it in Chromium
// with the shipped js/unseal.js against the live drand network.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
import { seal } from '../scripts/seal.mjs';

const payload = { hello: 'drand', at: Date.now() };
const ciphertext = await seal(Date.now() - 60_000, payload);

const server = await serve(0);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  const opened = await page.evaluate(async (ct) => (await import('/js/unseal.js')).unseal(ct), ciphertext);
  assert.deepEqual(opened, payload);

  // And a message sealed an hour ahead must refuse to open.
  const future = await seal(Date.now() + 3_600_000, payload);
  const early = await page.evaluate(async (ct) => {
    try { await (await import('/js/unseal.js')).unseal(ct); return 'opened'; } catch (e) { return String(e.message); }
  }, future);
  assert.match(early, /too early/i);
  console.log('drand smoke test passed: past round opens, future round refuses');
} finally {
  await browser.close();
  server.close();
}
