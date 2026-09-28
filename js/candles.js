// "Blow out the candles" using the microphone, with a tap fallback.

/** Returns a stop() function. Calls onBlow once when a sustained loud breath is heard. */
export async function listenForBlow(onBlow, { threshold = 0.18, holdMs = 350 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let loudSince = 0, raf = 0, stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  };

  const loop = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    if (rms > threshold) {
      loudSince ||= now;
      if (now - loudSince > holdMs) { stop(); onBlow(); return; }
    } else {
      loudSince = 0;
    }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return stop;
}
