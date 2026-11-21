/**
 * Tiny original chiptune-ish SFX via Web Audio.
 * Call unlock() from the title-screen tap so iOS can play later.
 */
export function createSfx() {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  }

  function unlock() {
    const audio = ensure();
    if (audio.state === "suspended") audio.resume();
  }

  function tone(freq, dur, type = "square", gain = 0.045, slide = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const api = {
    unlock,
    play(name) {
      if (!name) return;
      const fn = api[name];
      if (typeof fn === "function" && name !== "play" && name !== "unlock") fn();
    },
    tap: () => tone(520, 0.05),
    crack: () => {
      tone(180, 0.07, "square", 0.05, -80);
      tone(420, 0.04, "triangle", 0.03);
    },
    stir: () => tone(240, 0.03, "triangle", 0.02),
    drop: () => tone(360, 0.08, "square", 0.04, -40),
    sizzle: () => tone(90, 0.05, "sawtooth", 0.02),
    fold: () => tone(300, 0.1, "square", 0.04, 80),
    ok: () => {
      tone(520, 0.08, "square", 0.04);
      setTimeout(() => tone(780, 0.12, "square", 0.04), 80);
    },
    done: () => {
      tone(392, 0.12);
      setTimeout(() => tone(523, 0.12), 110);
      setTimeout(() => tone(659, 0.18), 220);
    },
    miss: () => tone(140, 0.08, "square", 0.03, -40),
  };
  return api;
}
