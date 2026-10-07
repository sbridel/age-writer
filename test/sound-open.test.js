"use strict";
// Ouverture d'un Âge (livre, clics, liaison) et variations de la liaison, avec un faux AudioContext.
const contexts = [];
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
function node(ctx, kind) {
  const n = { kind, ctx, connected: [], gain: param(), frequency: param(), detune: param(), Q: param(), pan: param(), delayTime: param(), stopped: false,
    connect(x) { this.connected.push(x); return x; }, disconnect() {}, start() {}, stop() { this.stopped = true; } };
  ctx.nodes.push(n); return n;
}
class FakeAC {
  constructor() { this.state = "running"; this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.destination = { ctx: this }; contexts.push(this); }
  resume() { return Promise.resolve(); } close() { this.state = "closed"; return Promise.resolve(); }
  createGain() { return node(this, "gain"); } createOscillator() { return node(this, "osc"); } createBufferSource() { return node(this, "src"); }
  createBiquadFilter() { return node(this, "filter"); } createStereoPanner() { return node(this, "pan"); } createDelay() { return node(this, "delay"); }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: (i) => d[i] }; }
}
global.window = { AudioContext: FakeAC };
const S = require("../src/sound");
const ok = (c, m) => { if (!c) { console.log("KO  " + m); process.exitCode = 1; } else console.log("ok  " + m); };
const count = (fn) => { const c0 = contexts[contexts.length - 1], before = c0 ? c0.nodes.length : 0; fn(); const c = contexts[contexts.length - 1]; return c.nodes.length - (c === c0 ? before : 0); };

// le livre avec clics a plus de nœuds que sans (les clics : bruit filtré + « toc » par clic)
let more = 0; for (let i = 0; i < 20; i++) { const a = count(() => S.bookOpen(0.3, { clicks: true })); const b = count(() => S.bookOpen(0.3, { clicks: false })); if (a > b) more++; }
ok(more === 20, "bookOpen : les clics s'ajoutent au livre");
ok(S.LINK_VARIANTS.length >= 10 && new Set(S.LINK_VARIANTS.map((v) => v.id)).size === S.LINK_VARIANTS.length, "au moins 10 variantes de liaison, identifiants distincts");
// même variante, tirage propre à chaque lecture : les graphes audio diffèrent
const sizes = new Set();
for (let i = 0; i < 80; i++) { const c = contexts[contexts.length - 1], before = c.nodes.length; S.linkBuild(c, c.createGain(), () => c.createBufferSource(), S.LINK_VARIANTS[0]); sizes.add(c.nodes.length - before); }
ok(sizes.size >= 4, "la liaison varie à chaque lecture (tailles de graphe : " + [...sizes].sort((a, b) => a - b).join(", ") + ")");
// séquence : « off » rien, « book » sans liaison, « full » liaison après le livre
const timers = []; const realSet = global.setTimeout, realClear = global.clearTimeout;
global.setTimeout = (f, ms) => { timers.push(ms); return timers.length; }; global.clearTimeout = () => {};
try {
  const linkTimers = () => timers.filter((ms) => ms >= 1300 && ms <= 1750).length;
  const all = { book: true, clasp: true, link: true };
  timers.length = 0; S.openSequence(0.3, { book: false, clasp: false, link: false }); ok(timers.length === 0, "tout coché off : aucun son");
  timers.length = 0; S.openSequence(0.3, { ...all, link: false }); ok(linkTimers() === 0, "sans liaison : rien de programmé");
  timers.length = 0; S.openSequence(0.3, all); ok(linkTimers() === 1, "tout : la liaison suit le livre et ses clics");
  timers.length = 0; S.openSequence(0.3, { book: false, clasp: false, link: true }); ok(linkTimers() === 0, "liaison seule : immédiate, sans délai");
} finally { global.setTimeout = realSet; global.clearTimeout = realClear; }
