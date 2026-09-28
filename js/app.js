import { BIRTHDAY, HER, INTRO_LETTER, GIFTS, FINALE, NO_PEEKING } from './config.js';
import { SEALED } from './sealed.js';
import { unseal } from './unseal.js';
import {
  parseGifts, journey, formatCountdown, measureClockOffset, chooseOffset,
} from './timelock.js';
import { confetti, fireworks, chime, melody, buzz, typewrite, setSound } from './fx.js';
import { listenForBlow } from './candles.js';
import { sprite } from './sprites.js';

const $ = (sel) => document.querySelector(sel);
const gifts = parseGifts(GIFTS);

// ---------- persistence (namespaced per birthday so next year starts fresh) ----------
const KEY = `sweetie:${BIRTHDAY.date}`;
const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  },
  save(patch) {
    state = { ...state, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  },
};

let state = store.load();
const opened = new Set(state.opened || []);
// Gifts already unsealed on this phone (their key has been published, so keeping them is safe).
const content = new Map(Object.entries(state.unsealed || {}));

// ---------- clock ----------
// The display follows the server's clock. The real lock is cryptographic: see unseal.js.
let serverOffset = chooseOffset(null, state.clockOffset);
const now = () => Date.now() + serverOffset;

async function syncClock() {
  if (location.protocol === 'file:') return;
  const measured = await measureClockOffset(fetch.bind(window), location.href);
  if (measured === null) return;
  serverOffset = chooseOffset(measured, null);
  store.save({ clockOffset: serverOffset });
  // Phone clock set more than 5 minutes into the future? Busted.
  if (serverOffset < -5 * 60_000 && !state.caughtCheating) {
    store.save({ caughtCheating: true });
    toast('Did you just change your clock? The cat checks the real time.');
  }
  update();
}

// ---------- small helpers ----------
function fill() {
  document.querySelectorAll('[data-name]').forEach((el) => { el.textContent = HER.name; });
  document.querySelectorAll('[data-from]').forEach((el) => { el.textContent = HER.from; });
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('hidden', s.id !== id));
  window.scrollTo(0, 0);
}

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: BIRTHDAY.timeZone });
function fmtWhen(ms) {
  const sameDay = dayKey.format(now()) === dayKey.format(ms);
  const opts = sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(undefined, { ...opts, hourCycle: 'h23', timeZone: BIRTHDAY.timeZone }).format(ms);
}

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- intro ----------
function initIntro() {
  const env = $('#envelope');
  env.addEventListener('click', async () => {
    if (env.classList.contains('open')) return;
    env.classList.add('open');
    buzz(20);
    chime(1046, 0.15);
    await new Promise((r) => setTimeout(r, 900));
    $('#intro-caption').classList.add('hidden');
    $('#letter').classList.remove('hidden');
    await typewrite($('#typed'), INTRO_LETTER);
    $('#letter-actions').classList.remove('hidden');
  });

  const yes = $('#yes-btn');
  const no = $('#no-btn');
  const noLines = ['Sure?', 'Really?', 'Cat is sad', 'Last chance', 'YES!'];
  let dodges = 0;

  const dodge = (e) => {
    if (no.dataset.turned) return;
    e?.preventDefault();
    dodges++;
    buzz(15);
    if (dodges >= noLines.length) {
      no.dataset.turned = '1';
      no.textContent = noLines.at(-1);
      no.classList.replace('no', 'yes');
      no.style.transform = '';
      return;
    }
    no.textContent = noLines[dodges - 1];
    const r = no.getBoundingClientRect();
    const maxX = innerWidth - r.width - 16;
    const maxY = innerHeight - r.height - 16;
    const tx = 16 + Math.random() * maxX - r.left + (parseFloat(no.dataset.tx) || 0);
    const ty = 16 + Math.random() * maxY - r.top + (parseFloat(no.dataset.ty) || 0);
    no.dataset.tx = tx; no.dataset.ty = ty;
    no.style.transform = `translate(${Math.round(tx / 4) * 4}px, ${Math.round(ty / 4) * 4}px)`;
  };
  no.addEventListener('pointerdown', dodge);
  // Hover-dodging only on real mouse devices; on phones it runs on touch.
  if (matchMedia('(hover: hover)').matches) {
    no.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(e); });
  }

  const start = (e) => {
    if (e.currentTarget === no && !no.dataset.turned) return;
    const r = e.currentTarget.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.top });
    chime(784); buzz([30, 40, 30]);
    store.save({ introSeen: true });
    askNotify(); // YES is a tap, so the permission prompt is allowed here
    setTimeout(enterMap, 900);
  };
  yes.addEventListener('click', start);
  no.addEventListener('click', start);
}

// ---------- reminders ----------
// A notification 10 seconds before each surprise. Web apps can only do this while
// the app is open or recently in the background; there is no server to push from.
const notifyOK = () => 'Notification' in window && Notification.permission === 'granted';

async function askNotify() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  try { await Notification.requestPermission(); } catch { /* old API */ }
  refreshNotifyBtn();
  if (notifyOK()) toast('I will ping you 10 seconds before each surprise.');
}

function refreshNotifyBtn() {
  const btn = $('#notify-btn');
  btn.classList.toggle('hidden', !('Notification' in window) || Notification.permission !== 'default');
}

async function remind(g) {
  const notified = state.notified || {};
  if (notified[g.id]) return;
  store.save({ notified: { ...notified, [g.id]: true } });
  if (!notifyOK()) return;
  const title = 'A surprise opens in 10 seconds';
  const opts = { body: g.teaser, icon: 'icons/icon-192.png', tag: g.id, vibrate: [200, 100, 200], renotify: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch { /* notifications blocked */ }
}

// ---------- time-lock unsealing ----------
const pending = new Set();
const retryAt = new Map();
let offlineWarned = false;

async function tryUnseal(id) {
  if (content.has(id) || pending.has(id) || (retryAt.get(id) || 0) > Date.now()) return;
  pending.add(id);
  try {
    content.set(id, await unseal(SEALED[id]));
    store.save({ unsealed: Object.fromEntries(content) });
    retryAt.delete(id);
    lastSignature = '';
    if (dialogGiftId === id) dialogState = null;
    update();
  } catch (e) {
    // Too early (phone clock ahead of the real time) or no internet: try again shortly.
    retryAt.set(id, Date.now() + 4000);
    if (!navigator.onLine && !offlineWarned) {
      offlineWarned = true;
      toast('Connect to the internet to open your surprise.');
    }
  } finally {
    pending.delete(id);
  }
}

const reveal = (g) => ({ ...g, ...content.get(g.id) });

// ---------- the star map ----------
let lastSignature = '';
let points = [];

function enterMap() {
  show('map');
  lastSignature = '';
  update();
}

function layout() {
  const wrap = $('#path-wrap');
  const W = wrap.clientWidth;
  const n = gifts.length + 2; // start + gifts + finale
  const gap = 150;
  points = Array.from({ length: n }, (_, i) => {
    const swing = i === 0 || i === n - 1 ? 0 : (i % 2 ? -1 : 1) * (0.27 + 0.05 * Math.sin(i * 1.7));
    return { x: W * (0.5 + swing), y: 70 + i * gap };
  });
  const H = points.at(-1).y + 110;
  wrap.style.height = `${H}px`;
  const svg = $('#path-svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  $('#path-bg').setAttribute('d', pathD(points));
  $('#path-fg').setAttribute('d', pathD(points));
}

function pathD(pts) {
  return pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const q = pts[i - 1];
    const dy = (p.y - q.y) / 2;
    return `${d} C${q.x},${q.y + dy} ${p.x},${p.y - dy} ${p.x},${p.y}`;
  }, '');
}

const segLenCache = new Map();
function lengthTo(k) {
  if (k <= 0) return 0;
  const key = `${k}:${points.at(-1).x}`;
  if (!segLenCache.has(key)) {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('d', pathD(points.slice(0, k + 1)));
    $('#path-svg').appendChild(tmp);
    segLenCache.set(key, tmp.getTotalLength());
    tmp.remove();
  }
  return segLenCache.get(key);
}

function finaleState(j) {
  if (!j.allOpened || now() < FINALE.unlockAt) return 'locked';
  return state.wished ? 'opened' : 'ready';
}

function renderNodes(j) {
  const list = $('#nodes');
  list.innerHTML = '';
  const fState = finaleState(j);
  const entries = [
    { kind: 'start', icon: 'sun', title: 'Your day begins', state: 'opened' },
    ...j.items.map((g) => ({ kind: 'gift', ...reveal(g), sealed: !content.has(g.id) })),
    { kind: 'finale', icon: 'cake', title: 'Make a wish', state: fState, unlockAt: FINALE.unlockAt },
  ];
  entries.forEach((e, i) => {
    const li = document.createElement('li');
    li.className = `node ${e.state} ${e.kind} ${i % 2 ? 'odd' : 'even'}`;
    li.style.left = `${points[i].x}px`;
    li.style.top = `${points[i].y}px`;
    li.style.setProperty('--i', i);
    const hidden = e.kind === 'gift' && (e.state === 'locked' || e.sealed);
    const label = e.kind === 'start' ? 'Start'
      : e.state === 'locked' ? fmtWhen(e.unlockAt)
      : hidden ? 'Unsealing…'
      : e.state === 'ready' ? 'Tap to open!' : 'Opened';
    const icon = hidden ? 'gift' : e.icon;
    const badge = e.state === 'locked' ? sprite('lock', 'badge') : '';
    li.innerHTML = `
      <button class="tile" aria-label="${esc(e.title)}: ${esc(label)}" ${e.kind === 'start' ? 'disabled' : ''}>
        ${sprite(icon, 'sp')}${badge}
      </button>
      <div class="node-label"><strong>${esc(hidden ? '???' : e.title)}</strong><span>${esc(label)}</span></div>`;
    if (e.kind === 'gift') li.querySelector('button').addEventListener('click', () => openGift(e.id));
    if (e.kind === 'finale') li.querySelector('button').addEventListener('click', () => {
      if (e.state === 'locked') {
        toast(j.allOpened ? `The cake is still baking until ${fmtWhen(FINALE.unlockAt)}` : 'Open every gift first, then the cake appears');
        buzz([20, 30, 20]);
      } else enterFinale();
    });
    list.appendChild(li);
  });
}

function renderProgress(j) {
  // Cat sits on the last reachable node; the glowing line creeps toward the next one in real time.
  const catNode = j.catIndex + 1 + (finaleState(j) !== 'locked' ? 1 : 0);
  let len = lengthTo(catNode);
  if (j.next && catNode + 1 < points.length) {
    const prevT = j.catIndex >= 0 ? j.items[j.catIndex].unlockAt : j.next.unlockAt - 12 * 3600_000;
    const frac = Math.min(1, Math.max(0, (now() - prevT) / (j.next.unlockAt - prevT)));
    len += (lengthTo(catNode + 1) - len) * frac;
  }
  const fg = $('#path-fg');
  const total = lengthTo(points.length - 1);
  fg.style.strokeDasharray = `${total}`;
  fg.style.strokeDashoffset = `${total - len}`;

  const p = points[catNode];
  const walker = $('#walker');
  const side = catNode % 2 ? 1 : -1;
  walker.style.transform = `translate(${Math.round(p.x - 20 + side * 62)}px, ${Math.round(p.y - 40)}px)`;
}

function renderChip(j) {
  const label = $('#next-label');
  const cd = $('#next-countdown');
  const chip = $('#next-chip');
  const fState = finaleState(j);
  chip.classList.toggle('soon', !!j.next && j.msToNext < 60_000);
  if (j.next) {
    label.textContent = 'Next surprise in';
    cd.textContent = formatCountdown(j.msToNext);
  } else if (!j.allOpened) {
    label.textContent = 'All unlocked!';
    cd.textContent = `${j.items.length - j.opened} waiting`;
  } else if (fState === 'locked') {
    label.textContent = 'Grand finale in';
    cd.textContent = formatCountdown(FINALE.unlockAt - now());
  } else {
    label.textContent = fState === 'ready' ? 'Your cake is ready' : 'Wish made';
    cd.textContent = fState === 'ready' ? 'Tap the cake' : '<3';
  }
  $('#progress-text').textContent = `${j.opened} of ${j.items.length} surprises opened`;
}

function update() {
  const j = journey(gifts, now(), opened);
  j.items.forEach((g) => {
    if (g.state !== 'locked') tryUnseal(g.id);
    else if (g.unlockAt - now() <= 10_000) remind(g);
  });
  if (now() >= FINALE.unlockAt) tryUnseal('finale');
  const sig = j.items.map((g) => g.state[0] + (content.has(g.id) ? '1' : '0')).join('') + finaleState(j)[0];
  if (!$('#map').classList.contains('hidden')) {
    if (!points.length) layout();
    if (sig !== lastSignature) {
      const newlyUnlocked = lastSignature && [...sig].some((c, i) => lastSignature[i] === 'l' && c !== 'l');
      renderNodes(j);
      if (newlyUnlocked) {
        toast('A new surprise just unlocked!');
        chime(988); buzz([60, 60, 60]);
        confetti({ y: innerHeight * 0.3, count: 80 });
      }
      lastSignature = sig;
    }
    renderProgress(j);
    renderChip(j);
  }
  refreshDialog(j);
}

// ---------- gift dialog ----------
const dialog = () => $('#gift-dialog');
let dialogGiftId = null;
let dialogState = null;

function openGift(id) {
  dialogGiftId = id;
  dialogState = null;
  refreshDialog(journey(gifts, now(), opened));
  if (!dialog().open) {
    dialog().showModal();
    history.pushState({ dialog: true }, '');
  }
}

function refreshDialog(j) {
  if (!dialogGiftId) return;
  const g = reveal(j.items.find((x) => x.id === dialogGiftId));
  const key = g.state + (content.has(g.id) ? '+' : '-');
  if (dialogState === key) {
    const cd = $('#dlg-countdown');
    if (cd) cd.textContent = formatCountdown(g.unlockAt - now());
    return;
  }
  dialogState = key;
  const body = $('#gift-body');
  body.dataset.state = g.state;
  if (g.state === 'locked') {
    body.innerHTML = `
      <div class="lockbox" id="lockbox">${sprite('gift')}${sprite('lock', 'badge')}</div>
      <h2>Not yet…</h2>
      <p class="teaser script">“${esc(g.teaser)}”</p>
      <p class="dlg-sub">Opens ${esc(fmtWhen(g.unlockAt))}</p>
      <span class="countdown big" id="dlg-countdown">${formatCountdown(g.unlockAt - now())}</span>
      <button class="pxbtn no" id="peek-btn">Peek</button>`;
    $('#peek-btn').addEventListener('click', () => {
      const box = $('#lockbox');
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
      buzz([40, 30, 40]);
      toast(NO_PEEKING[(Math.random() * NO_PEEKING.length) | 0]);
    });
  } else if (!content.has(g.id)) {
    body.innerHTML = `
      <div class="lockbox unsealing">${sprite('gift')}${sprite('sparkle', 'badge')}</div>
      <h2>Unsealing…</h2>
      <p class="teaser script">It's time. The key is coming down from the stars.</p>
      <p class="dlg-sub">This needs the internet for a moment.</p>`;
  } else if (g.state === 'ready' && g.letter) {
    body.innerHTML = `
      <h2>${esc(g.title)}</h2>
      <p class="dlg-sub">Tap the heart seal to open it</p>
      <button class="gift-envelope" id="gift-envelope" aria-label="Break the seal">
        <img src="img/envelope.png" alt="" width="230" height="183" />
      </button>`;
    const env = $('#gift-envelope');
    env.addEventListener('click', () => {
      if (env.disabled) return;
      env.disabled = true;
      env.classList.add('open');
      chime(1046, 0.15); buzz([30, 40, 30]);
      markOpened(g);
      setTimeout(() => {
        confetti({ y: innerHeight * 0.35, count: 90 });
        dialogState = 'opened+';
        $('#gift-body').dataset.state = 'opened';
        $('#gift-body').innerHTML = clueHTML(g);
        typewrite($('#gift-letter'), g.letter, { speed: 24, pause: 350, follow: true });
        update();
      }, 1000);
    });
  } else if (g.state === 'ready') {
    body.innerHTML = `
      <h2>${esc(g.title)}</h2>
      <p class="dlg-sub" id="tap-hint">Tap the box 3 times to unwrap it</p>
      <button class="giftbox" id="giftbox" aria-label="Unwrap the gift">
        <span class="lid"><span class="bow">${sprite('bow')}</span></span>
        <span class="box"></span>
      </button>`;
    let taps = 0;
    const box = $('#giftbox');
    box.addEventListener('click', () => {
      taps++;
      box.classList.remove('wiggle'); void box.offsetWidth; box.classList.add('wiggle');
      box.style.setProperty('--power', taps);
      chime(523 + taps * 131, 0.12, 0.4);
      buzz(20 * taps);
      $('#tap-hint').textContent = taps < 3 ? `${3 - taps} more…` : 'Here it comes!';
      if (taps === 3) unwrap(g, box);
    });
  } else {
    body.innerHTML = clueHTML(g);
  }
}

function clueHTML(g) {
  if (g.letter) {
    return `
      <div class="letter-paper flip-in">
        <div class="typed script" id="gift-letter">${g.letter.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
        <p class="signature script">${(g.signoff || [`— ${HER.from}`]).map(esc).join('<br>')}</p>
      </div>`;
  }
  return `
    <div class="clue-icon pop">${sprite(g.icon)}</div>
    <h2>${esc(g.title)}</h2>
    <div class="clue flip-in"><p class="script">${esc(g.clue)}</p></div>
    ${g.where ? `<p class="where">${esc(g.where)}</p>` : ''}
    ${g.link ? `<a class="pxbtn yes" href="${esc(g.link)}" target="_blank" rel="noopener">${esc(g.linkLabel || 'Open')}</a>` : ''}`;
}

function markOpened(g) {
  opened.add(g.id);
  store.save({ opened: [...opened] });
}

function unwrap(g, box) {
  box.disabled = true;
  box.classList.add('open');
  markOpened(g);
  const r = box.getBoundingClientRect();
  setTimeout(() => {
    confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 160 });
    chime(1318, 0.2, 1.2); buzz([50, 50, 120]);
  }, 350);
  setTimeout(() => {
    dialogState = 'opened+';
    $('#gift-body').dataset.state = 'opened';
    $('#gift-body').innerHTML = clueHTML(g);
    update();
  }, 1100);
}

function initDialog() {
  const d = dialog();
  $('#close-btn').innerHTML = sprite('close');
  d.addEventListener('close', () => {
    dialogGiftId = null;
    dialogState = null;
    if (history.state?.dialog) history.back();
  });
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // backdrop tap
  addEventListener('popstate', () => {
    if (d.open) d.close();
    if (!$('#finale').classList.contains('hidden')) enterMap();
  });
}

// ---------- finale ----------
let stopMic = null;

function enterFinale() {
  show('finale');
  history.pushState({ finale: true }, '');
  const count = HER.age > 0 ? Math.min(HER.age, 30) : 5;
  $('#cake-age').textContent = HER.age > 0 ? HER.age : '';
  const candles = $('#candles');
  candles.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const c = document.createElement('button');
    c.className = 'candle';
    c.setAttribute('aria-label', 'Candle');
    c.style.setProperty('--h', `${36 + (i % 3) * 6}px`);
    c.innerHTML = `<span class="flame">${sprite('flame')}</span>`;
    c.addEventListener('click', () => blowOut(c));
    candles.appendChild(c);
  }
  $('#final-letter').classList.add('hidden');
  $('#wish-buttons').classList.remove('hidden');
  $('#blow-hint').textContent = 'Blow into your phone to blow out the candles';
}

function blowOut(c) {
  if (c.classList.contains('out')) return;
  c.classList.add('out');
  buzz(15);
  if ([...document.querySelectorAll('.candle')].every((x) => x.classList.contains('out'))) celebrate();
}

async function celebrate() {
  stopMic?.(); stopMic = null;
  store.save({ wished: true });
  $('#blow-hint').textContent = 'Your wish is on its way';
  $('#wish-buttons').classList.add('hidden');
  const songMs = melody();
  fireworks(Math.round(songMs / 450), { quiet: true }); // silent fireworks for the whole song
  buzz([100, 60, 100, 60, 200]);
  setTimeout(async () => {
    $('#final-letter').classList.remove('hidden');
    $('#final-letter').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // The cake letter is sealed too; wait for its key if it hasn't arrived yet.
    while (!content.has('finale')) {
      $('#final-typed').textContent = 'Your letter is on its way…';
      await tryUnseal('finale');
      if (!content.has('finale')) await new Promise((r) => setTimeout(r, 3000));
    }
    await typewrite($('#final-typed'), content.get('finale').letter, { speed: 45 });
  }, 1800);
}

function initFinale() {
  $('#mic-btn').addEventListener('click', async () => {
    try {
      $('#blow-hint').textContent = 'Listening… take a deep breath and blow!';
      stopMic?.();
      stopMic = await listenForBlow(() => {
        document.querySelectorAll('.candle').forEach((c, i) => setTimeout(() => blowOut(c), i * 70));
      });
    } catch {
      $('#blow-hint').textContent = 'No mic? Tap each flame instead';
    }
  });
  $('#tap-btn').addEventListener('click', () => {
    $('#blow-hint').textContent = 'Tap each flame to blow it out';
  });
  $('#back-to-map').addEventListener('click', () => history.back());
}

// ---------- boot ----------
function initNotify() {
  const btn = $('#notify-btn');
  btn.innerHTML = sprite('bell');
  btn.addEventListener('click', askNotify);
  refreshNotifyBtn();
}

function initSound() {
  const btn = $('#sound-btn');
  const apply = (on) => {
    setSound(on);
    btn.innerHTML = sprite(on ? 'sound' : 'mute');
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
  };
  apply(state.sound !== false);
  btn.addEventListener('click', () => {
    const on = state.sound === false;
    store.save({ sound: on });
    apply(on);
    if (on) chime();
  });
}

function floaties() {
  const box = $('#floaties');
  for (let i = 0; i < 12; i++) {
    const f = document.createElement('span');
    f.className = 'floatie';
    f.style.left = `${(i * 8.3 + Math.random() * 6) % 100}%`;
    f.style.setProperty('--s', `${12 + (i % 3) * 6}px`);
    f.style.setProperty('--d', `${14 + (i % 5) * 3}s`);
    f.style.setProperty('--delay', `${-i * 1.7}s`);
    f.innerHTML = sprite(i % 3 ? 'heart' : 'sparkle');
    box.appendChild(f);
  }
}

function boot() {
  fill();
  floaties();
  initIntro();
  initDialog();
  initFinale();
  initSound();
  initNotify();
  // Android fires resize when the URL bar hides; only re-layout on width changes.
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    points = []; segLenCache.clear(); lastSignature = ''; update();
  });
  if (state.introSeen) enterMap(); else show('intro');
  update();
  setInterval(update, 1000);
  syncClock();
  setInterval(syncClock, 5 * 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { syncClock(); update(); } });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
