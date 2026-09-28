// Visual + audio + haptic effects. All optional: failures are silent.

const reduceMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let canvas, ctx, particles = [], raf = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}

const COLORS = ['#d76159', '#ca3935', '#e6c0cb', '#aed1a2', '#f0c35a', '#faf4e9', '#cd90ab'];

// 7x6 pixel heart, drawn cell by cell so it stays crisp.
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pixelHeart(c, size) {
  const cell = Math.max(2, Math.round(size / 7));
  HEART.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === 'X') c.fillRect((x - 3.5) * cell, (y - 3) * cell, cell, cell);
    }
  });
}

function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of particles) {
    p.vy += p.g;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    ctx.save();
    ctx.globalAlpha = p.life > 40 ? 1 : Math.round((p.life / 40) * 4) / 4;
    ctx.translate(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2);
    ctx.fillStyle = p.color;
    const sz = Math.round(p.size / 2) * 2;
    if (p.shape === 'heart') pixelHeart(ctx, sz);
    else ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }
  raf = particles.length ? requestAnimationFrame(tick) : 0;
}

/** Burst of confetti + hearts from (x, y). */
export function confetti({ x = innerWidth / 2, y = innerHeight / 2, count = 120, spread = 1 } = {}) {
  if (reduceMotion()) count = Math.min(count, 20);
  ensureCanvas();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (2 + Math.random() * 7) * spread;
    particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 4,
      g: 0.16,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 8,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() < 0.35 ? 'heart' : 'rect',
      life: 140 + Math.random() * 60,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

/** Fireworks: several bursts across the top of the screen. */
export function fireworks(rounds = 6, { quiet = false } = {}) {
  for (let i = 0; i < rounds; i++) {
    setTimeout(() => {
      ensureCanvas();
      const x = innerWidth * (0.15 + Math.random() * 0.7);
      const y = innerHeight * (0.15 + Math.random() * 0.3);
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      for (let j = 0; j < 60; j++) {
        const a = (j / 60) * Math.PI * 2;
        const v = 3 + Math.random() * 2.5;
        particles.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.05,
          size: 6, color, shape: 'rect', life: 90 + Math.random() * 30,
        });
      }
      if (!quiet) chime(660 + Math.random() * 440, 0.15);
      if (!raf) raf = requestAnimationFrame(tick);
    }, i * 450);
  }
}

let audio;
let soundOn = true;
export function setSound(on) { soundOn = on; }
function audioCtx() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** Tiny synthesized bell; no audio files needed. */
export function chime(freq = 880, volume = 0.2, dur = 0.9) {
  if (!soundOn) return;
  const a = audioCtx();
  if (!a) return;
  const t = a.currentTime;
  [1, 2.01, 3.02].forEach((mult, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume / (i + 1), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur);
  });
}

/** One music-box note on the audio clock. */
function note(a, freq, start, dur, vol, type = 'triangle') {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(a.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

// The whole song, all four lines: [note, beats]. G major, 3/4.
const N = { G3: 196, C4: 262, D4: 294, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784 };
const SONG = [
  ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', .75], ['G4', .25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', .75], ['G4', .25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', .75], ['F5', .25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
];
// Soft bass on the first beat of each bar (starts after the pickup).
const BASS = ['C4', 'G3', 'G3', 'C4', 'C4', 'C4', 'D4', 'C4'];

/** Full "Happy Birthday" with a bass line. Returns its length in ms. */
export function melody() {
  const beat = 0.5;
  const total = SONG.reduce((t, [, b]) => t + b, 0) * beat;
  if (!soundOn) return total * 1000;
  const a = audioCtx();
  if (!a) return total * 1000;
  let t = a.currentTime + 0.1;
  const start = t;
  for (const [n, b] of SONG) {
    note(a, N[n], t, b * beat + 0.35, 0.16);
    note(a, N[n] * 2, t, b * beat * 0.6, 0.03, 'sine'); // sparkle overtone
    t += b * beat;
  }
  BASS.forEach((n, i) => note(a, N[n] / 2, start + (1 + i * 3) * beat, 3 * beat, 0.07, 'sine'));
  // Final chord.
  ['C4', 'G4', 'C5', 'E5'].forEach((n) => note(a, N[n] || 330, t, 2.4, 0.07));
  return (total + 2) * 1000;
}

export function buzz(pattern = 30) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** Type lines into `el` one character at a time. Resolves when done. */
export function typewrite(el, lines, { speed = 38, pause = 450, follow = false } = {}) {
  if (reduceMotion()) speed = 0;
  el.textContent = '';
  // Tapping the text finishes it instantly.
  const skip = () => { speed = 0; pause = 0; };
  el.addEventListener('click', skip, { once: true });
  return new Promise((resolve) => {
    let li = 0, ci = 0, p;
    const next = () => {
      if (li >= lines.length) return resolve();
      if (ci === 0) {
        p = document.createElement('p');
        el.appendChild(p);
        // Long letters: keep the paragraph being typed in view.
        if (follow && speed) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      p.textContent = lines[li].slice(0, ++ci);
      if (ci >= lines[li].length) { li++; ci = 0; setTimeout(next, speed ? pause : 0); }
      else if (!speed) { ci = lines[li].length - 1; next(); }
      else setTimeout(next, speed);
    };
    next();
  });
}
