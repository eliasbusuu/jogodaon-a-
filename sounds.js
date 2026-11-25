// Sons sintetizados com WebAudio (sem arquivos de áudio).
let ctx = null;
let on = true;

const SEQ = {
  select: [[660, 0, 0.07, 'sine']],
  move: [[300, 0, 0.08, 'triangle'], [420, 0.07, 0.09, 'triangle']],
  capture: [[220, 0, 0.14, 'sawtooth'], [140, 0.1, 0.22, 'sawtooth'], [90, 0.25, 0.25, 'square']],
  invalid: [[150, 0, 0.16, 'square']],
  win: [[523, 0, 0.16, 'sine'], [659, 0.15, 0.16, 'sine'], [784, 0.3, 0.16, 'sine'], [1047, 0.45, 0.4, 'sine']],
  lose: [[392, 0, 0.22, 'triangle'], [330, 0.22, 0.22, 'triangle'], [262, 0.44, 0.4, 'triangle']],
  join: [[520, 0, 0.12, 'sine'], [780, 0.12, 0.2, 'sine']],
};

export const Sound = {
  setEnabled(v) { on = !!v; },
  play(name) {
    if (!on || !SEQ[name]) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      for (const [f, st, d, type] of SEQ[name]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + st);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + st + d);
        o.connect(g).connect(ctx.destination);
        o.start(t0 + st); o.stop(t0 + st + d + 0.05);
      }
    } catch (e) { /* áudio indisponível */ }
  },
};
