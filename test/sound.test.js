"use strict";
// Cycle de vie des ambiances avec un faux AudioContext : arrêt en fondu, relance, minuteries, niveau 0.
const assert = require("assert");
const contexts = [];
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
function node(ctx, kind) {
  const n = { kind, ctx, connected: [], gain: param(), frequency: param(), detune: param(), Q: param(), pan: param(), delayTime: param(), stopped: false,
    connect(x) { if (x && x.ctx && x.ctx !== ctx) throw new Error("connexion entre contextes"); this.connected.push(x); return x; }, disconnect() {}, start() {}, stop() { this.stopped = true; } };
  ctx.nodes.push(n); return n;
}
class FakeAC {
  constructor() { this.state = FakeAC.startState || "running"; this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.closed = false; this.destination = { ctx: this }; contexts.push(this); }
  resume() { return Promise.resolve(); } close() { this.closed = true; this.state = "closed"; return Promise.resolve(); }
  createGain() { return node(this, "gain"); } createOscillator() { return node(this, "osc"); } createBufferSource() { return node(this, "src"); }
  createBiquadFilter() { return node(this, "filter"); } createConvolver() { return node(this, "conv"); } createStereoPanner() { return node(this, "pan"); } createDelay() { return node(this, "delay"); }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: (i) => d[i] }; }
}
global.window = { AudioContext: FakeAC };
const S = require("../src/sound");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const sc = new S.Soundscape(() => 0.5);
  await sc.start({ wind: 0.5, metal: 0.4, chimes: 0.3 });
  const a = contexts[contexts.length - 1];
  sc.stop(); // fondu
  await sc.start({ wind: 0.5, pad: 0.3 });
  const b = contexts[contexts.length - 1];
  assert(a !== b, "nouveau contexte");
  await wait(2100);
  assert(a.closed, "l'ancien contexte est fermé après le fondu");
  assert(!b.closed && !b.nodes.some((n) => n.stopped && n.kind === "src"), "le fondu de l'ancien son ne coupe pas le nouveau");
  // relance rapide : les minuteries « later » de l'ancien démarrage ne jouent pas dans le nouveau contexte
  await sc.start({ metal: 0.5, thunder: 0.5 }); await sc.start({ wind: 0.3 }); await wait(1700);
  assert(sc.playing, "toujours en lecture après relance (aucune erreur de connexion entre contextes)");
  sc.setVolume(); sc.stop(true); sc.setVolume(); // ne doit pas lever après l'arrêt
  assert(!sc.playing && contexts.every((c) => c === contexts[contexts.length - 1] || c.closed || c === b) , "contextes fermés");
  // couche à 0 : ne joue pas
  await sc.start({ chimes: 0, pad: 0.4 }); const d = contexts[contexts.length - 1];
  assert(sc.playing && d.nodes.length > 0, "démarre avec pad"); sc.stop(true);
  // stop pendant le démarrage (contexte suspendu) : pas de contexte qui reste ouvert
  FakeAC.prototype.resume = function () { this.state = "running"; return wait(50); }; FakeAC.startState = "suspended";
  const p = sc.start({ wind: 0.4 }); const e = contexts[contexts.length - 1]; sc.stop(true); FakeAC.startState = "running"; assert((await p) === false && e.closed, "arrêt pendant resume");
  // effets ponctuels : un seul contexte partagé
  const before = contexts.length; S.linkSound(0.3); S.bookOpen(0.3); S.staticBurst(0.3); S.linkSound(0.3); S.telescopeSfx("tick", 0.2); S.telescopeSfx("ping", 0.7); S.telescopeSfx("found", 1);
  assert(S.telescopeSfx("ping", 0.05) === false, "télescope : dans le vide, le pouls ne s'entend pas");
  assert(S.telescopeSfx("metronome", 1) !== false && S.telescopeSfx("falsebeat", 0.6) !== false && S.telescopeSfx("falsebeat", 0) === false, "télescope : le tic du métronome, le faux pouls");
  assert(contexts.length - before <= 1, "effets ponctuels : un seul contexte (" + (contexts.length - before) + ")");
  console.log("sound ok"); process.exit(0);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
