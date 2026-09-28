// End-to-end tests on an Android-sized Chromium.
// The real gifts are time-lock sealed with drand (unreachable here and impossible
// to open early by design), so these tests swap in stand-in content and a stub unsealer
// that, like drand, refuses to open anything before its time.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { serve } from '../serve.mjs';
import { GIFTS, FINALE, BIRTHDAY } from '../../js/config.js';
import { parseGifts } from '../../js/timelock.js';

const gifts = parseGifts(GIFTS);
const KEY = `sweetie:${BIRTHDAY.date}`;

const CONTENT = {
  midnight: { title: 'Test Letter', icon: 'letter', letter: ['Dear tester,', 'First paragraph.', 'Last paragraph.'], signoff: ['Yours,', 'Koko'] },
  'papyrus-1': { title: 'Test Scroll', icon: 'scroll', clue: 'Test clue one.' },
  'papyrus-2': { title: 'Test Cat', icon: 'bastet', clue: 'Test clue two.' },
  vinyl: { title: 'Test Vinyl', icon: 'vinyl', clue: 'Test clue three.' },
  friend: { title: 'Test Memories', icon: 'heartsparkle', clue: 'Test clue four.' },
  finale: { letter: ['Cake letter line.', 'Cake letter end.'] },
};
const unlockOf = (id) => (id === 'finale' ? FINALE.unlockAt : GIFTS.find((g) => g.id === id).unlockAt);
const SEALED_FIXTURE = `export const SEALED = ${JSON.stringify(Object.fromEntries(
  Object.entries(CONTENT).map(([id, c]) => [id, `TEST:${unlockOf(id)}:${encodeURIComponent(JSON.stringify(c))}`]),
))};`;
const UNSEAL_STUB = `export async function unseal(sealed) {
  if (window.__offline) throw new Error('offline');
  const [, at, body] = sealed.split(':');
  if (Date.now() < Number(at)) throw new Error("It's too early to decrypt the ciphertext");
  return JSON.parse(decodeURIComponent(body));
}`;

let server, browser, base;
before(async () => {
  server = await serve(0);
  base = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

/**
 * Open the app with the phone's clock at `at`. The server's Date header follows `serverAt`
 * (defaults to the same moment), which is what the app trusts.
 */
async function openApp({ at = Date.now(), serverAt = at, saved, reducedMotion = 'reduce', offline = false } = {}) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], reducedMotion, timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const started = Date.now();
  await page.route('**/*', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path.endsWith('/js/sealed.js')) return route.fulfill({ contentType: 'text/javascript', body: SEALED_FIXTURE });
    if (path.endsWith('/js/unseal.js')) return route.fulfill({ contentType: 'text/javascript', body: UNSEAL_STUB });
    if (req.method() === 'HEAD') {
      return route.fulfill({ status: 200, headers: { date: new Date(serverAt + Date.now() - started).toUTCString() } });
    }
    return route.continue();
  });
  await page.clock.install({ time: at });
  await page.addInitScript(([k, v, off]) => {
    window.__offline = off;
    if (v && !sessionStorage.getItem('seeded')) {
      localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  }, [KEY, saved ? JSON.stringify(saved) : null, offline]);
  await page.goto(base);
  return { page, ctx, errors };
}

const nodeFor = (page, i) => page.locator('.node').nth(i + 1); // node 0 is "start"

test('first visit: envelope, letter, runaway No button, then the map', async () => {
  const { page, ctx, errors } = await openApp({ at: gifts[0].unlockAt - 3_600_000, reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Open the envelope' }).click({ force: true });
  await page.locator('#letter').waitFor();
  await page.locator('#typed').click(); // tap skips the typing
  await page.locator('#letter-actions').waitFor({ timeout: 10_000 });
  assert.match(await page.locator('#typed').innerText(), /Tereza/);

  const no = page.locator('#no-btn');
  for (let i = 0; i < 4; i++) await no.dispatchEvent('pointerdown');
  assert.equal(await no.innerText(), 'LAST CHANCE');
  await no.dispatchEvent('pointerdown');
  assert.equal(await no.innerText(), 'YES!');
  await no.click();

  await page.locator('#map').waitFor();
  assert.equal(await page.locator('.node.locked').count(), gifts.length + 1);
  assert.match(await page.locator('#next-countdown').innerText(), /^\d\d:\d\d:\d\d$/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('locked gift shows teaser + countdown and nothing of the sealed content', async () => {
  const { page, ctx, errors } = await openApp({ at: gifts[0].unlockAt - 90_000, saved: { introSeen: true } });
  await nodeFor(page, 0).locator('button').click();
  const dlg = page.locator('#gift-dialog');
  await dlg.getByText('Not yet…').waitFor();
  await dlg.getByText(gifts[0].teaser).waitFor();
  assert.equal(await page.getByText(CONTENT.midnight.title).count(), 0, 'title must not leak while locked');
  assert.match(await page.locator('#dlg-countdown').innerText(), /^00:01:(2|3)\d$/);
  await page.getByRole('button', { name: 'Peek' }).click();
  await page.locator('#toast.show').waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('gift unlocks live when its time arrives', async () => {
  const { page, ctx } = await openApp({ at: gifts[0].unlockAt - 2_000, saved: { introSeen: true } });
  await page.locator('.node.locked').first().waitFor();
  await nodeFor(page, 0).and(page.locator('.ready')).waitFor({ timeout: 6_000 });
  await nodeFor(page, 0).getByText(CONTENT.midnight.title).waitFor();
  await page.locator('#toast', { hasText: 'new surprise' }).waitFor();
  await ctx.close();
});

test('unwrapping a ready gift reveals the clue and persists across reloads', async () => {
  const { page, ctx, errors } = await openApp({ at: gifts[2].unlockAt + 60_000, saved: { introSeen: true } });
  assert.equal(await page.locator('.gift .tile').count(), gifts.length);
  await page.waitForFunction(() => document.querySelectorAll('.node.gift.ready').length === 3);

  await nodeFor(page, 1).locator('button').click();
  const box = page.getByRole('button', { name: 'Unwrap the gift' });
  await box.click(); await box.click(); await box.click();
  await page.locator('#gift-dialog').getByText(CONTENT['papyrus-1'].clue).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
  assert.equal(await page.locator('#progress-text').innerText(), `1 of ${gifts.length} surprises opened`);
  await page.waitForFunction(() => !history.state?.dialog); // let the dialog's history.back() settle

  await page.reload();
  await nodeFor(page, 1).and(page.locator('.opened')).waitFor();
  await nodeFor(page, 1).locator('button').click();
  await page.locator('#gift-dialog').getByText(CONTENT['papyrus-1'].clue).waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('midnight letter: seal breaks, it types out, tap shows it all, signed Koko', async () => {
  const { page, ctx, errors } = await openApp({
    at: gifts[0].unlockAt - 1_500, saved: { introSeen: true }, reducedMotion: 'no-preference',
  });
  assert.match(await page.locator('#next-countdown').innerText(), /^00:00:0[01]$/);
  await nodeFor(page, 0).and(page.locator('.ready')).waitFor({ timeout: 5_000 });
  await nodeFor(page, 0).getByText(CONTENT.midnight.title).waitFor();
  await nodeFor(page, 0).locator('button').click();
  await page.getByRole('button', { name: 'Break the seal' }).click({ force: true });
  const paper = page.locator('#gift-letter');
  await paper.getByText('Dear').waitFor({ timeout: 10_000 });
  await paper.click();
  await paper.getByText(CONTENT.midnight.letter.at(-1)).waitFor({ timeout: 5_000 });
  assert.equal(await page.locator('.letter-paper .signature').innerText(), 'Yours,\nKoko');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('without internet a due gift waits on "Unsealing…" instead of opening', async () => {
  const { page, ctx } = await openApp({ at: gifts[0].unlockAt + 5_000, saved: { introSeen: true }, offline: true });
  await nodeFor(page, 0).getByText('Unsealing…').waitFor();
  await nodeFor(page, 0).locator('button').click();
  await page.locator('#gift-dialog').getByText('Unsealing…').waitFor();
  await page.evaluate(() => { window.__offline = false; });
  await page.getByRole('button', { name: 'Break the seal' }).waitFor({ timeout: 10_000 });
  await ctx.close();
});

test('Android back button closes the gift dialog instead of leaving the app', async () => {
  const { page, ctx } = await openApp({ at: gifts[0].unlockAt + 1000, saved: { introSeen: true } });
  await nodeFor(page, 0).locator('button').click();
  assert.equal(await page.locator('#gift-dialog').evaluate((d) => d.open), true);
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('#gift-dialog').open);
  assert.equal(await page.locator('#map').isVisible(), true);
  await ctx.close();
});

test('finale stays locked until every gift is opened', async () => {
  const { page, ctx } = await openApp({ at: FINALE.unlockAt + 1000, saved: { introSeen: true, opened: [gifts[0].id] } });
  await page.locator('.node.finale.locked').waitFor();
  await page.locator('.node.finale button').click();
  await page.locator('#toast', { hasText: 'Open every gift first' }).waitFor();
  await ctx.close();
});

test('finale: blow out the candles (tap fallback) and read the sealed cake letter', async () => {
  const { page, ctx, errors } = await openApp({
    at: FINALE.unlockAt + 1000,
    saved: { introSeen: true, opened: gifts.map((g) => g.id) },
  });
  await page.locator('.node.finale.ready button').click();
  await page.locator('#finale').waitFor();
  const candles = page.locator('.candle');
  const n = await candles.count();
  assert.ok(n > 0);
  for (let i = 0; i < n; i++) await candles.nth(i).click();
  await page.locator('#final-letter').waitFor({ timeout: 5_000 });
  await page.locator('#final-typed').getByText(CONTENT.finale.letter.at(-1)).waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: /Back to the map/ }).click();
  await page.locator('.node.finale.opened').waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('changing the phone clock does not unlock gifts early', async () => {
  const realNow = gifts[0].unlockAt - 3_600_000;
  const { page, ctx } = await openApp({ at: realNow + 30 * 86400_000, serverAt: realNow, saved: { introSeen: true } });
  await page.locator('#toast', { hasText: 'change your clock' }).waitFor({ timeout: 5_000 });
  await page.waitForFunction(() => document.querySelectorAll('.node.gift:not(.locked)').length === 0);
  await ctx.close();
});

test('sends a reminder 10 seconds before a surprise', async () => {
  const { page, ctx } = await openApp({ at: gifts[1].unlockAt - 12_000, saved: { introSeen: true, opened: ['midnight'] } });
  await page.evaluate(() => {
    window.__notes = [];
    window.Notification = class { constructor(t, o) { window.__notes.push([t, o.body]); } };
    window.Notification.permission = 'granted';
  });
  await page.waitForFunction(() => window.__notes.length === 1, null, { timeout: 8_000 });
  const [[title, body]] = await page.evaluate(() => window.__notes);
  assert.equal(title, 'A surprise opens in 10 seconds');
  assert.equal(body, gifts[1].teaser);
  await ctx.close();
});

test('installable: manifest and icons are served', async () => {
  const { page, ctx } = await openApp({ saved: { introSeen: true } });
  const manifest = await (await page.request.get(`${base}manifest.webmanifest`)).json();
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const res = await page.request.get(base + icon.src);
    assert.equal(res.status(), 200, icon.src);
  }
  await ctx.close();
});
