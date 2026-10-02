import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localTime, parseGifts, giftState, journey, formatCountdown, splitDuration,
  measureClockOffset, chooseOffset,
} from '../../js/timelock.js';
import { GIFTS, FINALE, BIRTHDAY } from '../../js/config.js';
import { SPRITES, PALETTE, sprite } from '../../js/sprites.js';
import { SEALED } from '../../js/sealed.js';
import { roundFor } from '../../scripts/seal.mjs';
import { defaultChainInfo } from 'tlock-js';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Plaintext content exists only on the owner's machine (gitignored).
const secretsPath = new URL('../../secrets/content.json', import.meta.url);
const secrets = existsSync(secretsPath) ? JSON.parse(readFileSync(secretsPath, 'utf8')) : null;

test('localTime converts wall clock in an offset to an absolute instant', () => {
  assert.equal(localTime('2026-09-28', '19:00', '+02:00'), Date.parse('2026-09-28T17:00:00Z'));
  assert.equal(localTime('2026-09-28', '00:00', '+03:00'), Date.parse('2026-09-27T21:00:00Z'));
  assert.equal(localTime('2026-09-28', '09:30', '-05:00'), Date.parse('2026-09-28T14:30:00Z'));
});

test('localTime dayOffset rolls across month end', () => {
  assert.equal(localTime('2026-09-30', '10:00', '+00:00', 1), Date.parse('2026-10-01T10:00:00Z'));
});

test('localTime rejects malformed specs', () => {
  assert.throws(() => localTime('28-09-2026', '19:00', '+02:00'));
  assert.throws(() => localTime('2026-09-28', '7pm', '+02:00'));
  assert.throws(() => localTime('2026-09-28', '19:00', 'CET'));
});

test('parseGifts sorts by time and validates', () => {
  const out = parseGifts([
    { id: 'b', unlockAt: '2026-09-28T12:00:00Z' },
    { id: 'a', unlockAt: 1000 },
  ]);
  assert.deepEqual(out.map((g) => g.id), ['a', 'b']);
  assert.throws(() => parseGifts([]), /at least one/);
  assert.throws(() => parseGifts([{ id: 'x', unlockAt: 1 }, { id: 'x', unlockAt: 2 }]), /Duplicate/);
  assert.throws(() => parseGifts([{ id: 'x', unlockAt: 'soon' }]), /invalid unlockAt/);
  assert.throws(() => parseGifts([{ unlockAt: 1 }]), /needs an id/);
});

test('a gift can never be opened before its unlock time', () => {
  const g = { id: 'g', unlockAt: 1000 };
  assert.equal(giftState(g, 999, new Set(['g'])), 'locked');
  assert.equal(giftState(g, 1000, new Set()), 'ready');
  assert.equal(giftState(g, 5000, new Set(['g'])), 'opened');
});

test('journey reports next gift, cat position and completion', () => {
  const gifts = parseGifts([
    { id: 'a', unlockAt: 100 }, { id: 'b', unlockAt: 200 }, { id: 'c', unlockAt: 300 },
  ]);
  let j = journey(gifts, 50, new Set());
  assert.equal(j.next.id, 'a');
  assert.equal(j.catIndex, -1);
  assert.equal(j.msToNext, 50);

  j = journey(gifts, 250, new Set(['a']));
  assert.equal(j.next.id, 'c');
  assert.equal(j.catIndex, 1);
  assert.equal(j.unlocked, 2);
  assert.equal(j.opened, 1);
  assert.equal(j.allOpened, false);

  j = journey(gifts, 400, new Set(['a', 'b', 'c']));
  assert.equal(j.next, null);
  assert.equal(j.msToNext, 0);
  assert.equal(j.allOpened, true);
});

test('countdown formatting', () => {
  assert.equal(formatCountdown(0), '00:00:00');
  assert.equal(formatCountdown(-5000), '00:00:00');
  assert.equal(formatCountdown(3_723_000), '01:02:03');
  assert.equal(formatCountdown(90_061_000), '1d 01:01:01');
  assert.deepEqual(splitDuration(59_999), { d: 0, h: 0, m: 0, s: 59 });
});

test('measureClockOffset uses the server Date header', async () => {
  const serverNow = Date.parse('2026-09-28T17:00:00Z');
  let t = serverNow - 3_600_000; // phone is an hour behind
  const fakeFetch = async () => {
    t += 100; // 100ms round trip
    return { headers: new Map([['date', new Date(serverNow).toUTCString()]]) };
  };
  const offset = await measureClockOffset(fakeFetch, '/', () => t);
  assert.ok(Math.abs(offset - 3_600_000) < 1_000, `offset ${offset}`);
});

test('measureClockOffset returns null offline or without header', async () => {
  assert.equal(await measureClockOffset(async () => { throw new Error('offline'); }, '/'), null);
  assert.equal(await measureClockOffset(async () => ({ headers: new Map() }), '/'), null);
});

test('chooseOffset ignores small drift and falls back to cache', () => {
  assert.equal(chooseOffset(1200, null), 0);
  assert.equal(chooseOffset(-600_000, null), -600_000);
  assert.equal(chooseOffset(null, 90_000), 90_000);
  assert.equal(chooseOffset(null, null), 0);
});

test('shipped config is valid and the finale comes after every gift', () => {
  const gifts = parseGifts(GIFTS);
  assert.ok(gifts.length >= 1);
  for (const g of gifts) assert.ok(g.teaser, `${g.id} is missing a teaser`);
  assert.ok(FINALE.unlockAt >= gifts.at(-1).unlockAt, 'finale must not unlock before the last gift');
  assert.match(BIRTHDAY.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('the midnight letter opens at 00:00 on her birthday, in her timezone', () => {
  const letter = parseGifts(GIFTS).find((g) => g.id === 'midnight');
  assert.equal(letter.unlockAt, Date.parse('2026-09-29T00:00:00+02:00'));
});

test('meeting day: four clues on 2 Oct between 14:00 and 17:00 Berlin time, best friend last', () => {
  const g = parseGifts(GIFTS);
  assert.deepEqual(g.map((x) => x.id), ['midnight', 'papyrus-1', 'papyrus-2', 'vinyl', 'friend']);
  assert.deepEqual(
    g.slice(1).map((x) => new Date(x.unlockAt).toISOString()),
    ['2026-10-02T12:00:00.000Z', '2026-10-02T12:45:00.000Z', '2026-10-02T13:30:00.000Z', '2026-10-02T15:00:00.000Z'],
  );
});

test('every gift icon is a pixel sprite, and every sprite is a clean grid', () => {
  if (secrets) for (const [id, c] of Object.entries(secrets.gifts)) assert.ok(SPRITES[c.icon], `${id}: no sprite named "${c.icon}"`);
  for (const [name, grid] of Object.entries(SPRITES)) {
    grid.forEach((row, y) => {
      assert.equal(row.length, grid[0].length, `${name} row ${y} has the wrong width`);
      for (const ch of row) assert.ok(ch === '.' || PALETTE[ch], `${name} row ${y}: unknown colour "${ch}"`);
    });
  }
  assert.match(sprite('heart'), /^<svg class="px /);
  assert.throws(() => sprite('nope'), /Unknown sprite/);
});

/** Read the tlock stanza ("-> tlock <round> <chainHash>") from an armored age file. */
function stanza(armored) {
  const b64 = armored.split('\n').filter((l) => l && !l.startsWith('-----')).join('');
  const m = /-> tlock (\d+) ([0-9a-f]+)/.exec(Buffer.from(b64, 'base64').toString('latin1'));
  assert.ok(m, 'not a tlock ciphertext');
  return { round: Number(m[1]), chain: m[2] };
}
const roundTime = (r) => (defaultChainInfo.genesis_time + (r - 1) * defaultChainInfo.period) * 1000;

test('every gift and the cake letter are sealed to drand, never openable a second early', () => {
  const items = [...GIFTS.map((g) => [g.id, g.unlockAt, g.sealedAt]), ['finale', FINALE.unlockAt, FINALE.sealedAt]];
  assert.deepEqual(Object.keys(SEALED).sort(), items.map(([id]) => id).sort());
  for (const [id, at, sealedAt] of items) {
    const { round, chain } = stanza(SEALED[id]);
    assert.equal(chain, defaultChainInfo.hash, `${id} must use drand quicknet`);
    // A `sealedAt` marks a gift moved later without resealing: its key comes out early,
    // the app still waits for `unlockAt`. A fresh `npm run seal` (to `unlockAt`) also passes.
    const sealedFor = round === roundFor(at) || sealedAt === undefined ? at : sealedAt;
    if (sealedAt !== undefined) assert.ok(sealedAt <= at, `${id}: sealedAt must not be after unlockAt`);
    assert.equal(round, roundFor(sealedFor), `${id} sealed to the wrong round; run npm run seal`);
    assert.ok(roundTime(round) >= sealedFor, `${id} would open before its time`);
    assert.ok(roundTime(round) - sealedFor < defaultChainInfo.period * 1000, `${id} would open late`);
  }
});

test('midnight letter key is published at exactly 00:00:00 Berlin on 29 Sep', () => {
  assert.equal(new Date(roundTime(stanza(SEALED.midnight).round)).toISOString(), '2026-09-28T22:00:00.000Z');
});

test('no clue, title or letter text appears in any committed file', { skip: !secrets && 'secrets/content.json not present' }, () => {
  const strings = [];
  for (const c of [...Object.values(secrets.gifts), secrets.finale]) {
    for (const v of [c.title, c.clue, c.where, ...(c.letter || [])]) if (v && v.length > 12) strings.push(v);
  }
  const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' }).split('\n')
    .filter((f) => f && !f.startsWith('secrets/') && !/\.(png|gif|ico)$/.test(f));
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const str of strings) assert.ok(!text.includes(str), `${f} leaks: "${str.slice(0, 40)}…"`);
  }
});
