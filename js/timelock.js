// Pure time-lock logic. No DOM here so it can be unit-tested in Node.

/**
 * Build an absolute timestamp from a wall-clock time in a fixed UTC offset.
 * localTime('2026-09-28', '19:00', '+02:00', 1) -> ms for 2026-09-29T19:00+02:00
 */
export function localTime(date, time, utcOffset, dayOffset = 0) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  const om = /^([+-])(\d{2}):(\d{2})$/.exec(utcOffset);
  if (!dm || !tm || !om) {
    throw new Error(`Bad time spec: ${date} ${time} ${utcOffset}`);
  }
  const offsetMin = (om[1] === '-' ? -1 : 1) * (Number(om[2]) * 60 + Number(om[3]));
  const utc = Date.UTC(+dm[1], +dm[2] - 1, +dm[3] + dayOffset, +tm[1], +tm[2]);
  return utc - offsetMin * 60_000;
}

/** Validate and normalise the gift list; sorted by unlock time. */
export function parseGifts(gifts) {
  if (!Array.isArray(gifts) || gifts.length === 0) {
    throw new Error('Config needs at least one gift');
  }
  const seen = new Set();
  return gifts
    .map((g) => {
      if (!g.id) throw new Error('Every gift needs an id');
      if (seen.has(g.id)) throw new Error(`Duplicate gift id: ${g.id}`);
      seen.add(g.id);
      const unlockAt = typeof g.unlockAt === 'number' ? g.unlockAt : Date.parse(g.unlockAt);
      if (!Number.isFinite(unlockAt)) throw new Error(`Gift ${g.id} has an invalid unlockAt`);
      return { ...g, unlockAt };
    })
    .sort((a, b) => a.unlockAt - b.unlockAt);
}

/** 'locked' | 'ready' | 'opened'. A gift can never be opened before its time. */
export function giftState(gift, now, openedIds) {
  if (now < gift.unlockAt) return 'locked';
  return openedIds.has(gift.id) ? 'opened' : 'ready';
}

/** Snapshot of the whole journey at `now`. */
export function journey(gifts, now, openedIds) {
  const items = gifts.map((g) => ({ ...g, state: giftState(g, now, openedIds) }));
  const next = items.find((g) => g.state === 'locked') || null;
  const unlocked = items.filter((g) => g.state !== 'locked').length;
  const opened = items.filter((g) => g.state === 'opened').length;
  // Where the cat sits: the last gift she can reach (-1 = start line).
  let catIndex = -1;
  items.forEach((g, i) => { if (g.state !== 'locked') catIndex = i; });
  return {
    items,
    next,
    unlocked,
    opened,
    catIndex,
    allOpened: opened === items.length,
    msToNext: next ? next.unlockAt - now : 0,
  };
}

export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function formatCountdown(ms) {
  const { d, h, m, s } = splitDuration(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

/**
 * Estimate (server time - device time) using the HTTP Date header of our own
 * host, so changing the phone clock doesn't unlock gifts early.
 * Returns null when offline or the header is missing.
 */
export async function measureClockOffset(fetchImpl, url, deviceNow = () => Date.now()) {
  try {
    const t0 = deviceNow();
    const res = await fetchImpl(url, { method: 'HEAD', cache: 'no-store' });
    const t1 = deviceNow();
    const header = res.headers.get('date');
    const server = header ? Date.parse(header) : NaN;
    if (!Number.isFinite(server)) return null;
    // Date header has 1s resolution; +500ms centres the estimate.
    return server + 500 + (t1 - t0) / 2 - t1;
  } catch {
    return null;
  }
}

/**
 * Only trust a server offset if it's meaningful. Small drift is ignored so
 * a gift doesn't flicker between states around its unlock second.
 */
export function chooseOffset(measured, cached) {
  const pick = measured ?? cached ?? 0;
  return Math.abs(pick) < 5_000 ? 0 : pick;
}
