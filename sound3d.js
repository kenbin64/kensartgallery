// The sounds of the gallery: the din of a crowd, your own footsteps on the
// marble, children laughing, water falling in the fountains, the custodian's
// broom, and the cynic's remarks.
//
// NOTHING HERE IS A RECORDING. There are no sound files to download. Every
// sound is made on the spot by the browser from hiss and simple tones, shaped
// to sound like the thing:
//   the din        hiss passed through a few narrow filters at the pitch of
//                  voices, each swelling and fading several times a second,
//                  the way talk does when you cannot make out the words
//   a footstep     a short low thud and a click, as a heel on stone
//   a laugh        a run of quick falling notes at a child's pitch
//   water          steady bright hiss
//   the broom      a soft swish
//   the cynic      the browser's own speaking voice, reading his line
// All of it goes through an echo made to sound like a hard, high room.
// Made sounds are plainer than recordings. They are here to give the rooms
// some life, and they can be replaced with recordings later.
//
// SOUND STARTS OFF. A browser will not let a page make sound until the visitor
// has pressed something, and a gallery should not surprise anyone. The Sound
// button turns it on and off.
//
// hall3d.js calls level() every moment with how near the crowd, the children
// and the water are (each from 0, out of hearing, to 1, beside you), and calls
// step(), sweep() and say() when those things happen.

export function createSound() {
  let ctx = null, out = null, room = null, hiss = null, on = false;
  let din = null, water = null, voices = [];
  let untilLaugh = 4;

  // One and a half seconds of plain hiss, used as the raw stuff of most of the sounds.
  function makeHiss() {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let n = 0; n < data.length; n++) data[n] = Math.random() * 2 - 1;
    return buffer;
  }
  // The echo of a hard, high room: hiss that dies away over about two seconds.
  function makeEcho() {
    const long = ctx.sampleRate * 2.2, buffer = ctx.createBuffer(2, long, ctx.sampleRate);
    for (let side = 0; side < 2; side++) { const data = buffer.getChannelData(side); for (let n = 0; n < long; n++) data[n] = (Math.random() * 2 - 1) * Math.pow(1 - n / long, 3.2); }
    const echo = ctx.createConvolver(); echo.buffer = buffer; return echo;
  }
  const gain = (value) => { const g = ctx.createGain(); g.gain.value = value; return g; };
  const filter = (type, pitch, sharp = 1) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = pitch; f.Q.value = sharp; return f; };
  const hissing = () => { const s = ctx.createBufferSource(); s.buffer = hiss; s.loop = true; s.start(); return s; };
  // Sends a sound to the ears: some of it straight, some of it by way of the room's echo.
  function toRoom(node, echoShare = 0.5) { node.connect(out); const send = gain(echoShare); node.connect(send); send.connect(room); }

  function begin() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = gain(0.9); out.connect(ctx.destination);
    hiss = makeHiss();
    room = makeEcho(); const back = gain(0.5); room.connect(back); back.connect(out);
    // The din: five bands of hiss at the pitches voices carry, each swelling and fading at its own pace.
    din = gain(0); toRoom(din, 0.9);
    for (const [pitch, pace] of [[320, 2.3], [520, 3.1], [860, 3.9], [1400, 4.7], [2300, 5.3]]) {
      const band = filter('bandpass', pitch, 2.4), level = gain(0.5), swell = ctx.createOscillator(), depth = gain(0.45);
      swell.frequency.value = pace; swell.start(); swell.connect(depth); depth.connect(level.gain);
      hissing().connect(band); band.connect(level); level.connect(din);
      voices.push({ level, next: 0 });
    }
    // Water: steady bright hiss with the low part taken out.
    water = gain(0);
    const bright = filter('highpass', 1100), body = filter('bandpass', 2600, 0.5);
    hissing().connect(bright); bright.connect(body); body.connect(water); toRoom(water, 0.6);
  }

  // A short burst of hiss through a filter, rising and dying away: the body of a footstep, a swish or a breath.
  function burst({ type, pitch, sharp = 1, loud, rise = 0.005, fall, echo = 0.5, when = 0 }) {
    const start = ctx.currentTime + when, f = filter(type, pitch, sharp), g = gain(0), s = ctx.createBufferSource();
    s.buffer = hiss; s.connect(f); f.connect(g); toRoom(g, echo);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(loud, start + rise); g.gain.exponentialRampToValueAtTime(0.0001, start + rise + fall);
    s.start(start, Math.random()); s.stop(start + rise + fall + 0.05);
  }
  // A short tone that slides from one pitch to another and dies away.
  function tone({ shape = 'sine', from, to, loud, fall, when = 0, through = null, echo = 0.5 }) {
    const start = ctx.currentTime + when, o = ctx.createOscillator(), g = gain(0);
    o.type = shape; o.frequency.setValueAtTime(from, start); o.frequency.exponentialRampToValueAtTime(to, start + fall);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(loud, start + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, start + fall);
    if (through) { o.connect(through); through.connect(g); } else o.connect(g);
    toRoom(g, echo); o.start(start); o.stop(start + fall + 0.05);
  }

  return {
    get on() { return on; },
    // Turns sound on or off. The first time it is turned on, the sounds are set up.
    set(want) {
      on = Boolean(want);
      if (on && !ctx) begin();
      if (ctx) (on ? ctx.resume() : ctx.suspend());
      if (!on && window.speechSynthesis) window.speechSynthesis.cancel();
      return on;
    },
    // How near things are, each 0 to 1. Called every moment.
    level({ crowd, kids, fountain, dt }) {
      if (!on) return;
      const now = ctx.currentTime;
      din.gain.setTargetAtTime(crowd * 0.5, now, 0.4);
      water.gain.setTargetAtTime(fountain * 0.16, now, 0.3);
      // Each band of the din also drifts louder and softer on its own, so it never settles into a pattern.
      for (const v of voices) if (now > v.next) { v.level.gain.setTargetAtTime(0.25 + Math.random() * 0.6, now, 0.25); v.next = now + 0.3 + Math.random() * 0.9; }
      // Children laugh every so often, while any are in hearing.
      untilLaugh -= dt;
      if (untilLaugh <= 0) { untilLaugh = 5 + Math.random() * 8; if (kids > 0.05) this.laugh(kids); }
    },
    // One of your own footsteps on the marble: a low thud, and the click of a heel.
    step(loud = 1) {
      if (!on) return;
      tone({ from: 120, to: 62, loud: 0.3 * loud, fall: 0.09, echo: 0.7 });
      burst({ type: 'lowpass', pitch: 700, loud: 0.16 * loud, fall: 0.07, echo: 0.8 });
      burst({ type: 'bandpass', pitch: 2400, sharp: 3, loud: 0.07 * loud, fall: 0.03, echo: 1 });
    },
    // A coin landing in the fountain: a small bright plink, then the plop of the water.
    coin(loud) {
      if (!on || loud < 0.03) return;
      tone({ from: 3100, to: 2500, loud: 0.09 * loud, fall: 0.12, echo: 0.9 });
      burst({ type: 'bandpass', pitch: 900, sharp: 2, loud: 0.1 * loud, fall: 0.12, when: 0.03, echo: 0.8 });
    },
    // One stroke of the broom.
    sweep(loud) {
      if (!on || loud < 0.03) return;
      burst({ type: 'bandpass', pitch: 3600, sharp: 0.8, loud: 0.11 * loud, rise: 0.09, fall: 0.28, echo: 0.4 });
    },
    // A child's laugh: a handful of quick notes, each falling, each a little lower than the last.
    laugh(loud) {
      if (!on) return;
      const notes = 4 + Math.floor(Math.random() * 4);
      let pitch = 640 + Math.random() * 240, when = 0;
      for (let n = 0; n < notes; n++) {
        tone({ shape: 'triangle', from: pitch * 1.3, to: pitch, loud: 0.11 * loud, fall: 0.11, when, through: filter('bandpass', 1150, 1.4), echo: 0.9 });
        burst({ type: 'bandpass', pitch: 2800, sharp: 1.5, loud: 0.02 * loud, fall: 0.06, when, echo: 0.9 });
        pitch *= 0.95; when += 0.13 + Math.random() * 0.05;
      }
    },
    // Someone speaks a line aloud, in the browser's own voice. Quieter the further off they are.
    say(text, loud) {
      if (!on || loud < 0.12 || !window.speechSynthesis) return;
      const line = new SpeechSynthesisUtterance(text);
      const english = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
      line.voice = english.find((v) => /david|george|daniel|mark|male/i.test(v.name)) || english[0] || null;
      line.pitch = 0.7; line.rate = 0.9; line.volume = Math.min(1, loud);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(line);
    },
  };
}
