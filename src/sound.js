"use strict";
/**
 * Paysages sonores synthétisés avec l'API Web Audio (aucun fichier) : vent, pins, eau, cascade,
 * pluie, bourdon grave, résonance métallique, feu, grillons, tonnerre. Chaque Âge choisit ses
 * couches selon ce qu'il contient ; les pages du Relto nomment les leurs (ambiance_audio).
 * Le son ne démarre que sur un clic (règle des navigateurs).
 */
const { rng, fnv } = require("./util");

// Gammes : chaque paysage prend la sienne (d'après l'Âge et ses couches), donc deux Âges ne sonnent pas pareil.
const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], hirajoshi: [0, 2, 3, 7, 8], pentatonic: [0, 3, 5, 7, 10], whole: [0, 2, 4, 6, 8, 10],
};
const MODE_NAMES = Object.keys(MODES);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Couches d'un préréglage nommé -> { couche: gain 0..1 }. Un nom inconnu renvoie null. */
const PRESETS = {
  wind: { wind: 0.7, whistle: 0.12 },
  wind_in_pines: { pines: 0.8, wind: 0.2, pluck: 0.4 },
  waterfall: { waterfall: 0.8, chimes: 0.35 },
  river: { water: 0.7, pluck: 0.3 },
  soft_rain: { rain: 0.7, pad: 0.4 },
  night_crickets: { crickets: 0.6, wind: 0.1, chimes: 0.2 },
  deep_hum: { drone: 0.8, choir: 0.35 },
  fire_crackle: { fire: 0.7, pad: 0.25 },
  metal_chimes: { metal: 0.6, chimes: 0.4 },
  thunder: { thunder: 0.7, rain: 0.4 },
  fireworks: { pops: 0.9, crickets: 0.2, wind: 0.08 },
  mountain_air: { whistle: 0.5, wind: 0.35, drone: 0.2, pad: 0.2 },
  stone_choir: { choir: 0.6, drone: 0.3, metal: 0.2 },
  steam_engine: { pulse: 0.7, organ: 0.2 },
  hearth: { hearth: 0.75, pad: 0.18 },
  static: { static: 0.7 },
};

/** Couches d'après les éléments d'un monde (Set d'identifiants). */
function layersForWorld(has) {
  const h = (...ids) => ids.some((i) => has.has(i));
  const L = {};
  if (h("wind", "storm", "thunderstorm", "dust_storm", "ash_cloud", "whispering_storm")) L.wind = h("storm", "thunderstorm", "dust_storm") ? 0.7 : 0.45;
  if (h("great_tree", "grove", "ironwood")) { L.pines = 0.4; }
  if (h("water", "brine", "meltwater", "marsh_mist", "submarine_fissure")) L.water = 0.45;
  if (h("rain", "storm", "thunderstorm", "hail")) L.rain = h("storm", "thunderstorm") ? 0.7 : 0.45;
  else if (h("drizzle", "acid_rain", "crystal_rain", "ash_rain")) L.rain = 0.22; // bruine : un murmure de pluie
  if (h("tornado")) L.wind = 0.75;
  if (h("crystal_rain")) L.chimes = 0.4;
  if (h("lightning", "thunderstorm", "waiting_thunder")) L.thunder = 0.5;
  if (h("lava", "heat", "steam", "wildfire", "obsidian")) { L.fire = h("wildfire") ? 0.6 : 0.3; L.drone = 0.35; }
  if (h("crystal", "humming_shard", "singing_glass", "charged_crystal", "strange_stone", "singing_lichen")) L.metal = 0.5;
  if (h("deep_cold", "pressure", "starless", "humming_warren", "fissure", "cave_fissure")) L.drone = Math.max(L.drone || 0, 0.5);
  if (h("moth", "lantern_moths", "whispering_moths", "fern", "spore", "glowvine") && !h("storm", "thunderstorm")) L.crickets = 0.3;
  if (h("crystal", "singing_glass", "humming_shard", "clouded_diamond", "ice", "black_ice")) L.chimes = 0.4;
  if (h("great_tree", "grove", "sapling", "fern", "vine") && !h("storm", "thunderstorm", "wildfire")) L.pluck = 0.3;
  if (h("steam", "heat", "iron", "rust")) L.pulse = 0.3;
  if (h("starless", "deep_cold", "pressure", "strange_stone")) L.choir = 0.3;
  if (h("tablet", "worn_tablet", "speaking_tablet", "door", "sealed_door", "bridge", "fallen_bridge")) L.pad = 0.3;
  if (h("auroras", "permanent_veil")) L.pad = Math.max(L.pad || 0, 0.4);
  if (h("wind") && !h("storm", "thunderstorm")) L.whistle = 0.15;
  if (!Object.keys(L).length) L.wind = 0.25, L.drone = 0.2, L.pad = 0.2;
  return L;
}

/** Couches d'après les mécanismes présents (identifiants de mech.js). */
function layersForMechs(ids) {
  const M = {
    steam_powered_elevator: { pulse: 0.5 }, steam_generator: { pulse: 0.6, drone: 0.2 }, water_valve: { water: 0.3 }, tide_gate: { water: 0.35, pulse: 0.2 },
    telescope: { whistle: 0.12, chimes: 0.2 }, sound_lock: { chimes: 0.5 }, frequency_array: { chimes: 0.3, drone: 0.25 }, holofatic_imager: { choir: 0.3, chimes: 0.2 },
    orrery: { pad: 0.35, chimes: 0.25 }, wind_organ: { organ: 0.5, wind: 0.3 }, lens_array: { pad: 0.25, whistle: 0.1 },
  };
  let L = {}; for (const id of ids || []) if (M[id]) L = mergeLayers(L, M[id]); return L;
}

const mergeLayers = (a, b) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k]); return o; };

function layersForNames(names) {
  let L = {}; for (const n of names) { if (PRESETS[n]) L = mergeLayers(L, PRESETS[n]); } return L;
}

/**
 * Le Relto est un refuge : peu de couches, douces, sans rythme ni éclat. On garde les
 * textures (vent, eau, pluie, feu de cheminée…) et la musique lente (nappe, carillon),
 * on transforme ou on retire le reste, on plafonne les gains et le nombre de couches.
 */
const ZEN_KEEP = ["wind", "pines", "water", "waterfall", "rain", "drone", "pad", "chimes", "hearth", "fire", "crickets"];
const ZEN_MAP = { thunder: ["rain", 0.5], whistle: ["wind", 0.6], choir: ["pad", 0.7], metal: ["chimes", 0.6], pluck: ["chimes", 0.5], fire: ["hearth", 1] };
const ZEN_CAP = { wind: 0.4, pines: 0.4, water: 0.25, waterfall: 0.16, rain: 0.22, drone: 0.12, pad: 0.4, chimes: 0.35, hearth: 0.5, crickets: 0.25 };
// « minimal » : presque rien — une nappe ou un carillon, une texture très basse. Pas de cascade.
const MIN_KEEP = ["pad", "hearth", "chimes", "wind", "water", "crickets", "rain"];
const MIN_MAP = { ...ZEN_MAP, waterfall: ["water", 0.5], pines: ["wind", 0.6], drone: ["pad", 1] };
const MIN_CAP = { pad: 0.3, hearth: 0.28, chimes: 0.28, wind: 0.14, water: 0.1, crickets: 0.12, rain: 0.1 };
/** level : "zen" (4 couches douces) ou "minimal" (2 couches très légères). */
function zenify(layers, level = "zen") {
  const min = level === "minimal", keep = min ? MIN_KEEP : ZEN_KEEP, map = min ? MIN_MAP : ZEN_MAP, caps = min ? MIN_CAP : ZEN_CAP, max = min ? 2 : 4;
  const L = {};
  for (const [k, g] of Object.entries(layers || {})) {
    const m = map[k]; const name = m ? m[0] : k, v = m ? g * m[1] : g;
    if (!keep.includes(name)) continue;
    L[name] = Math.max(L[name] || 0, Math.min(caps[name] == null ? 0.3 : caps[name], v));
  }
  // minimal : on privilégie la musique et le feu, puis la texture la plus douce
  const prio = min ? MIN_KEEP : null;
  let names = Object.keys(L).sort((a, b) => (prio ? prio.indexOf(a) - prio.indexOf(b) : L[b] - L[a]));
  if (names.length > max) { const kept = names.slice(0, max); if (!min && L.pad && !kept.includes("pad")) kept[max - 1] = "pad"; names = kept; }
  const out = {}; for (const n of names) out[n] = L[n];
  if (!Object.keys(out).length) { if (min) out.pad = 0.25; else { out.wind = 0.3; out.pad = 0.25; } }
  else if (!out.pad && !out.chimes && Object.keys(out).length < max) out.pad = min ? 0.22 : 0.2;
  const tot = Object.values(out).reduce((a, b) => a + b, 0), lim = min ? 0.45 : 0.9, f = tot > lim ? lim / tot : 1;
  for (const n in out) out[n] = Math.round(out[n] * f * 1000) / 1000;
  // la nappe et le carillon sont synthétisés très bas : on les relève pour qu'ils portent la musique
  if (out.pad) out.pad = Math.round(out.pad * 1.8 * 1000) / 1000; if (out.chimes) out.chimes = Math.round(out.chimes * 1.5 * 1000) / 1000;
  return out;
}

const LAYERS = ["wind", "pines", "water", "waterfall", "rain", "drone", "metal", "fire", "crickets", "thunder", "pad", "chimes", "pluck", "choir", "pulse", "organ", "whistle", "hearth", "static", "pops"];

class Soundscape {
  constructor(getVolume) { this.getVolume = getVolume || (() => 0.35); this.ctx = null; this.master = null; this.playing = false; this.timers = []; this.nodes = []; this.gen = 0; }

  async start(layers, opts = {}) {
    this.stop(true);
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    const gen = ++this.gen, c = new AC(); this.ctx = c;
    if (c.state === "suspended") { try { await c.resume(); } catch (e) { /* ignore */ } }
    if (gen !== this.gen) { try { c.close(); } catch (e) { /* ignore */ } return false; } // arrêté ou relancé pendant l'attente
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.master.gain.linearRampToValueAtTime(this.getVolume(), c.currentTime + 2.5);
    this.noise = this.makeNoise(); this.r = rng(Date.now() & 0xffffffff);
    // tonalité propre à l'Âge : la même graine donne toujours la même gamme et la même fondamentale
    const h = fnv(String(opts.seed || this.seed || "") + "|" + Object.keys(layers).sort().join(","));
    this.mode = MODES[MODE_NAMES[h % MODE_NAMES.length]]; this.root = 36 + ((h >>> 5) % 10); this.modeName = MODE_NAMES[h % MODE_NAMES.length]; this._rev = null;
    this.playing = true;
    // pas de pic : les couches se partagent la place ; une couche à 0 ne joue pas
    const live = Object.entries(layers).filter(([name, g]) => g > 0 && typeof this[name] === "function" && LAYERS.includes(name));
    const total = live.reduce((a, [, g]) => a + g, 0) || 1, scale = Math.min(1, 1.6 / total);
    for (const [name, g] of live) { try { this[name](g * scale); } catch (e) { console.warn("[Age Writer ext] sound layer " + name, e); } }
    return true;
  }

  setVolume() { if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.getVolume(), this.ctx.currentTime, 0.2); }

  /** Arrête tout. `now` : coupure nette ; sinon fondu de ~1,5 s sur l'ancien contexte (n'affecte pas un son relancé ensuite). */
  stop(now) {
    this.gen++; this.playing = false;
    for (const t of this.timers) { clearInterval(t); clearTimeout(t); } this.timers = [];
    const c = this.ctx, master = this.master; this.ctx = null; this.master = null; this.nodes = []; this._rev = null;
    if (!c) return;
    const close = () => { try { c.close(); } catch (e) { /* déjà fermé */ } };
    if (now || !master) return close();
    try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(0, c.currentTime, 0.4); } catch (e) { /* ignore */ }
    setTimeout(close, 1800);
  }

  // ---- briques --------------------------------------------------------------------------
  makeNoise() {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0);
    let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + 0.02 * w) / 1.02; d[i] = w * 0.6 + l * 3.5 * 0.4; }
    return b;
  }
  src() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.start(0, Math.random() * 2); this.nodes.push(s); return s; }
  osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); this.nodes.push(o); return o; }
  filt(type, f, q = 1) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; }
  gain(v, to = this.master) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(to); return g; }
  lfo(rate, depth, param) { const o = this.osc("sine", rate), g = this.ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); }
  /** minuteries liées à ce démarrage : ignorées dès que le son est arrêté ou relancé */
  every(ms, fn) { const g = this.gen; this.timers.push(setInterval(() => { if (this.playing && g === this.gen) fn(); }, ms)); }
  later(ms, fn) { const g = this.gen; this.timers.push(setTimeout(() => { if (this.playing && g === this.gen) fn(); }, ms)); }

  // ---- musique : notes de la gamme de l'Âge, réverbération partagée ----------------------
  /** degré (entier, peut dépasser la gamme) + octaves → fréquence */
  note(deg, oct = 0) { const m = this.mode, n = m.length, o = Math.floor(deg / n); return midi(this.root + 12 * (oct + o) + m[((deg % n) + n) % n]); }
  rev() {
    if (this._rev) return this._rev;
    const c = this.ctx, len = Math.floor(c.sampleRate * 3.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    const cv = c.createConvolver(); cv.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.8; cv.connect(wet); wet.connect(this.master);
    return (this._rev = cv);
  }
  /** note à enveloppe : { type, dur, att, vol, send (0..1 de réverb), lp } */
  tone(f, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0), osc = c.createOscillator(), e = c.createGain(), dur = o.dur || 2, att = o.att || 0.01;
    osc.type = o.type || "sine"; osc.frequency.value = f; if (o.detune) osc.detune.value = o.detune;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(o.vol ?? 0.1, t + att); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = osc; if (o.lp) { const lp = this.filt("lowpass", o.lp, 0.6); osc.connect(lp); last = lp; }
    last.connect(e); const dry = c.createGain(); dry.gain.value = 1 - (o.send || 0) * 0.6; e.connect(dry); dry.connect(this.master);
    if (o.send) { const s = c.createGain(); s.gain.value = o.send; e.connect(s); s.connect(this.rev()); }
    osc.start(t); osc.stop(t + dur + 0.1); osc.onended = () => { try { osc.disconnect(); e.disconnect(); } catch (x) { /* ignore */ } };
  }

  // ---- couches --------------------------------------------------------------------------
  wind(g) {
    const n = this.src(), bp = this.filt("bandpass", 520, 0.7), out = this.gain(g * 0.9);
    n.connect(bp); bp.connect(out);
    this.lfo(0.07, 220, bp.frequency); this.lfo(0.11, g * 0.35, out.gain);
    this.every(5000, () => { const t = this.ctx.currentTime, f = 350 + this.r() * 700; bp.frequency.setTargetAtTime(f, t, 2); out.gain.setTargetAtTime(g * (0.5 + this.r() * 0.7), t, 1.8); });
  }
  pines(g) {
    const n = this.src(), lp = this.filt("lowpass", 900, 0.5), hp = this.filt("highpass", 2600, 0.7), mid = this.gain(g * 0.7), hi = this.gain(g * 0.12);
    n.connect(lp); lp.connect(mid); n.connect(hp); hp.connect(hi);
    this.lfo(0.09, g * 0.3, mid.gain); this.lfo(0.17, g * 0.06, hi.gain);
  }
  water(g) {
    const n = this.src(), bp = this.filt("bandpass", 700, 0.9), out = this.gain(g * 0.6); n.connect(bp); bp.connect(out); this.lfo(0.3, 180, bp.frequency);
    this.every(180, () => { if (this.r() < 0.6) this.blip(g * 0.25); });
  }
  blip(v) {
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), e = c.createGain(), f = 500 + this.r() * 900;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.07);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(v * 0.15, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    o.connect(e); e.connect(this.master); o.start(t); o.stop(t + 0.13);
  }
  waterfall(g) {
    const n = this.src(), lp = this.filt("lowpass", 3200, 0.4), hp = this.filt("highpass", 300, 0.4), out = this.gain(g * 0.8); n.connect(hp); hp.connect(lp); lp.connect(out);
    this.lfo(0.2, g * 0.08, out.gain);
  }
  rain(g) {
    const n = this.src(), hp = this.filt("highpass", 1800, 0.6), out = this.gain(g * 0.55); n.connect(hp); hp.connect(out);
    this.every(90, () => { if (this.r() < 0.5) this.blip(g * 0.12); });
  }
  drone(g) {
    const out = this.gain(g * 0.16), lp = this.filt("lowpass", 160, 0.7); lp.connect(out);
    for (const [f, d] of [[55, 0], [55, 0.5], [82.4, -0.3], [27.5, 0]]) { const o = this.osc("sawtooth", f + d); o.connect(lp); }
    this.lfo(0.05, g * 0.1, out.gain);
  }
  metal(g) {
    const ratios = [1, 2.76, 5.4, 8.93], c = this.ctx;
    const strike = () => {
      const t = c.currentTime, base = 180 + this.r() * 420, out = c.createGain(); out.gain.value = g * 0.2; out.connect(this.master);
      ratios.forEach((r, i) => { const o = c.createOscillator(), e = c.createGain(); o.frequency.value = base * r; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1 / (i + 1), t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 7 - i * 1.2); o.connect(e); e.connect(out); o.start(t); o.stop(t + 8); });
    };
    this.every(9000, strike); this.later(1500, strike);
  }
  fire(g) {
    const n = this.src(), lp = this.filt("lowpass", 400, 0.5), out = this.gain(g * 0.35); n.connect(lp); lp.connect(out);
    this.every(120, () => { if (this.r() < 0.5) { const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), e = c.createGain(), b = this.filt("bandpass", 1500 + this.r() * 3000, 2); s.buffer = this.noise; e.gain.setValueAtTime(g * 0.4, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(b); b.connect(e); e.connect(this.master); s.start(t, this.r() * 2, 0.06); } });
  }
  crickets(g) {
    const o = this.osc("sine", 4300), a = this.ctx.createGain(), out = this.gain(g * 0.14); a.gain.value = 0; o.connect(a); a.connect(out);
    const chirp = () => { const t = this.ctx.currentTime; for (let i = 0; i < 4; i++) { a.gain.setValueAtTime(1, t + i * 0.07); a.gain.setValueAtTime(0, t + i * 0.07 + 0.035); } };
    this.every(900, () => { if (this.r() < 0.8) chirp(); });
  }
  thunder(g) {
    const c = this.ctx, roll = () => { const t = c.currentTime, s = c.createBufferSource(), lp = this.filt("lowpass", 160, 0.7), e = c.createGain(); s.buffer = this.noise; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * 0.7, t + 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + 5); s.connect(lp); lp.connect(e); e.connect(this.master); s.start(t, this.r() * 1.5, 5.5); };
    this.every(14000, () => { if (this.r() < 0.7) roll(); }); this.later(4000, roll);
  }

  // ---- couches musicales / rythmiques -------------------------------------------------------
  /** nappe lente : accords de la gamme qui se fondent l'un dans l'autre */
  pad(g) {
    const play = () => {
      const base = [0, 1, 3, 4, 5][Math.floor(this.r() * 5)], voices = [0, 2, 4, 6].slice(0, 3 + Math.floor(this.r() * 2));
      voices.forEach((v, i) => this.tone(this.note(base + v, 1 + (i > 2 ? 1 : 0)), { type: "triangle", dur: 17, att: 5.5, vol: g * 0.1, send: 0.7, lp: 1100, detune: (i % 2 ? 5 : -5) }));
    };
    play(); this.every(11000, play);
  }
  /** carillon de verre : notes éparses, longue résonance */
  chimes(g) {
    const ring = () => {
      const d = Math.floor(this.r() * 10), f = this.note(d, 3 - (this.r() < 0.3 ? 1 : 0));
      this.tone(f, { type: "sine", dur: 5, att: 0.005, vol: g * 0.17, send: 0.85 });
      this.tone(f * 2.76, { type: "sine", dur: 2.4, att: 0.005, vol: g * 0.03, send: 0.85 });
      if (this.r() < 0.25) this.tone(this.note(d + 2, 3), { type: "sine", dur: 4, att: 0.005, vol: g * 0.07, send: 0.85, delay: 0.35 });
    };
    this.every(2300, () => { if (this.r() < 0.5) ring(); }); this.later(800, ring);
  }
  /** kalimba / harpe : une phrase de huit notes, rejouée puis modifiée */
  pluck(g) {
    let phrase = [], step = 0, pos = Math.floor(this.r() * 5);
    const make = () => { phrase = []; for (let i = 0; i < 8; i++) { pos = Math.max(-2, Math.min(9, pos + Math.floor(this.r() * 5) - 2)); phrase.push(this.r() < 0.25 ? null : pos); } };
    make();
    this.every(520, () => {
      if (step % 16 === 0 && step) make(); else if (step % 8 === 0 && step) { const i = Math.floor(this.r() * 8); phrase[i] = phrase[i] == null ? pos : null; }
      const d = phrase[step % 8]; step++;
      if (d != null) this.tone(this.note(d, 2), { type: "triangle", dur: 1.3, att: 0.004, vol: g * 0.21, send: 0.35, lp: 2600 });
    });
  }
  /** chœur de pierre : voyelles qui se transforment (formants) */
  choir(g) {
    const c = this.ctx, out = this.gain(g * 0.11), V = [[800, 1150], [450, 800], [325, 700], [600, 1000]];
    const bands = [this.filt("bandpass", 800, 6), this.filt("bandpass", 1150, 6)];
    bands.forEach((b) => { b.connect(out); const w = c.createGain(); w.gain.value = 0.5; b.connect(w); w.connect(this.rev()); });
    [0, 4, 7].forEach((d, i) => { const o = this.osc("sawtooth", this.note(d + (i === 2 ? 0 : 0), 1) * (i === 1 ? 1.5 : 1)); o.detune.value = (i - 1) * 7; o.connect(bands[0]); o.connect(bands[1]); });
    this.lfo(0.08, g * 0.05, out.gain);
    this.every(6500, () => { const v = V[Math.floor(this.r() * V.length)], t = c.currentTime; bands[0].frequency.setTargetAtTime(v[0], t, 1.6); bands[1].frequency.setTargetAtTime(v[1], t, 1.6); });
  }
  /** machine : battement grave, souffle, cliquetis */
  pulse(g) {
    const c = this.ctx, bpm = 52 + Math.floor(this.r() * 22); let beat = 0;
    this.every(60000 / bpm / 2, () => {
      const t = c.currentTime, on = beat % 2 === 0; beat++;
      if (on) { const o = c.createOscillator(), e = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); e.gain.setValueAtTime(g * 0.5, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(e); e.connect(this.master); o.start(t); o.stop(t + 0.32); }
      else { const s = c.createBufferSource(), hp = this.filt("highpass", 3500, 0.5), e = c.createGain(); s.buffer = this.noise; e.gain.setValueAtTime(g * 0.18, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); s.connect(hp); hp.connect(e); e.connect(this.master); s.start(t, this.r() * 2, 0.3); }
      if (beat % 16 === 0) for (let i = 0; i < 5; i++) this.tone(1800 + i * 90, { type: "square", dur: 0.04, att: 0.002, vol: g * 0.04, delay: i * 0.055 });
    });
  }
  /** orgue à vent : accord soutenu avec souffle */
  organ(g) {
    const c = this.ctx, out = this.gain(g * 0.04), lp = this.filt("lowpass", 760, 0.7); lp.connect(out); out.connect(this.rev());
    const vs = [0, 2, 4].map((d, i) => this.osc("square", this.note(d, 1) * (i === 2 ? 1 : 1))); vs.forEach((o) => { o.detune.value = (Math.random() - 0.5) * 12; o.connect(lp); });
    const n = this.src(), bp = this.filt("bandpass", 1400, 1.2), br = this.gain(g * 0.03); n.connect(bp); bp.connect(br); br.connect(this.master);
    this.lfo(5.2, g * 0.012, out.gain); this.lfo(0.06, g * 0.04, out.gain);
    this.every(10000, () => { const base = [0, 2, 3, 4][Math.floor(this.r() * 4)], t = c.currentTime; vs.forEach((o, i) => o.frequency.setTargetAtTime(this.note(base + i * 2, 1), t, 0.8)); });
  }
  /** sifflement du vent en altitude */
  whistle(g) {
    const n = this.src(), bp = this.filt("bandpass", 900, 38), out = this.gain(g * 0.85); n.connect(bp); bp.connect(out);
    this.lfo(0.13, g * 0.4, out.gain);
    this.every(4200, () => bp.frequency.setTargetAtTime(500 + this.r() * 1500, this.ctx.currentTime, 1.5));
  }
  /** feu de cheminée : souffle grave, braises qui craquent doucement, rares éclats de bûche */
  hearth(g) {
    const n = this.src(), lp = this.filt("lowpass", 260, 0.5), out = this.gain(g * 0.5); n.connect(lp); lp.connect(out);
    this.lfo(0.23, g * 0.12, out.gain);
    const crack = (v, f, dur) => { const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), e = c.createGain(), b = this.filt("bandpass", f, 1.6), send = c.createGain(); s.buffer = this.noise; e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); send.gain.value = 0.25; s.connect(b); b.connect(e); e.connect(this.master); e.connect(send); send.connect(this.rev()); s.start(t, this.r() * 2, dur + 0.02); };
    this.every(140, () => { if (this.r() < 0.28) crack(g * (0.12 + this.r() * 0.18), 900 + this.r() * 1800, 0.025 + this.r() * 0.03); });
    this.every(2600, () => { if (this.r() < 0.45) { crack(g * 0.4, 380 + this.r() * 300, 0.09); crack(g * 0.18, 1400 + this.r() * 800, 0.05); } });
  }
  /** parasites : neige de télévision, grésillement à coupures irrégulières, bourdonnement de secteur */
  static(g) {
    const c = this.ctx, n = this.src(), hp = this.filt("highpass", 900, 0.4), lp = this.filt("lowpass", 7000, 0.4), out = this.gain(g * 0.3), gate = c.createGain();
    gate.gain.value = 1; n.connect(hp); hp.connect(lp); lp.connect(gate); gate.connect(out);
    const b = this.osc("sawtooth", 50), bl = this.filt("lowpass", 380, 0.8), bg = this.gain(g * 0.035); b.connect(bl); bl.connect(bg);
    this.lfo(0.4, g * 0.1, out.gain);
    this.every(230, () => { const t = c.currentTime; if (this.r() < 0.3) { gate.gain.setValueAtTime(0.1, t); gate.gain.linearRampToValueAtTime(1, t + 0.05 + this.r() * 0.25); } });
    this.every(1700, () => { if (this.r() < 0.5) { const t = c.currentTime; hp.frequency.setTargetAtTime(500 + this.r() * 3000, t, 0.05); } });
  }
  /** feux d'artifice lointains : sifflement, détonation, crépitement */
  pops(g) {
    const c = this.ctx, burst = () => {
      const t = c.currentTime, pan = c.createStereoPanner ? c.createStereoPanner() : null, bus = this.gain(1); if (pan) { pan.pan.value = this.r() * 2 - 1; bus.connect(pan); pan.connect(this.master); bus.disconnect(this.master); } 
      const o = c.createOscillator(), e = c.createGain(); o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(2100, t + 0.8); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * 0.04, t + 0.2); e.gain.linearRampToValueAtTime(0, t + 0.8); o.connect(e); e.connect(bus); o.start(t); o.stop(t + 0.85);
      const b = t + 0.85, s = c.createBufferSource(), lp = this.filt("lowpass", 220, 0.8), eb = c.createGain(); s.buffer = this.noise; eb.gain.setValueAtTime(0, b); eb.gain.linearRampToValueAtTime(g * 1.8, b + 0.012); eb.gain.exponentialRampToValueAtTime(0.0001, b + 0.9); s.connect(lp); lp.connect(eb); eb.connect(bus); s.start(b, this.r() * 2, 1);
      for (let i = 0; i < 14; i++) { const tt = b + 0.1 + this.r() * 1.3, k = c.createBufferSource(), bp = this.filt("bandpass", 2500 + this.r() * 3500, 3), ek = c.createGain(); k.buffer = this.noise; ek.gain.setValueAtTime(g * 0.12, tt); ek.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); k.connect(bp); bp.connect(ek); ek.connect(bus); k.start(tt, this.r() * 2, 0.05); }
    };
    this.every(1700, () => { if (this.r() < 0.35) burst(); }); this.later(1200, burst);
  }
}

/**
 * Effets ponctuels (ouverture d'un livre, liaison, parasites) : un seul contexte audio partagé,
 * créé au premier effet — jamais un par effet, les navigateurs limitent les contextes ouverts.
 */
let sfx = null;
function sfxCtx() {
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext); if (!AC) return null;
  if (!sfx || sfx.state === "closed") sfx = new AC();
  if (sfx.state === "suspended") sfx.resume().catch(() => {});
  return sfx;
}
function oneShot(dur, build) {
  let c; try { c = sfxCtx(); } catch (e) { return false; } if (!c) return false;
  try {
    const out = c.createGain(); out.connect(c.destination);
    const noise = (len) => { const b = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; return s; };
    build(c, out, noise);
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* ignore */ } }, dur * 1000 + 400);
    return true;
  } catch (e) { console.warn("[Age Writer ext] sfx", e); return false; }
}
/** Brève rafale de parasites (liaison qui échoue), indépendante de l'ambiance en cours. */
function staticBurst(volume = 0.3, dur = 0.7) {
  return oneShot(dur, (c, out) => {
    const len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let gate = 1; for (let i = 0; i < len; i++) { if (i % 900 === 0) gate = Math.random() < 0.35 ? 0.05 : 1; d[i] = (Math.random() * 2 - 1) * gate * (1 - i / len); }
    const s = c.createBufferSource(), bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2500; bp.Q.value = 0.3; out.gain.value = volume * 0.5;
    s.buffer = b; s.connect(bp); bp.connect(out); s.start();
  });
}
/** Livre qu'on ouvre : craquement de cuir, bruissement de pages, puis quelques clics de fermoir (nombre, timbre et rythme tirés au hasard). */
function bookOpen(volume = 0.3, { clicks = true, book = true } = {}) {
  const n = clicks ? 2 + Math.floor(Math.random() * 4) : 0; // 2 à 5 clics
  if (!book && !n) return false;
  return oneShot((book ? 1.4 : 0.2) + (n ? 1 : 0), (c, out, noise) => {
    out.gain.value = volume;
    const t = c.currentTime;
    if (book) {
      const th = c.createOscillator(), te = c.createGain(); th.frequency.setValueAtTime(110, t); th.frequency.exponentialRampToValueAtTime(48, t + 0.18); te.gain.setValueAtTime(0.7, t); te.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); th.connect(te); te.connect(out); th.start(t); th.stop(t + 0.3);
      const cr = noise(0.5), bp = c.createBiquadFilter(), ce = c.createGain(); bp.type = "bandpass"; bp.Q.value = 2.5; bp.frequency.setValueAtTime(500, t + 0.05); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.45);
      ce.gain.setValueAtTime(0, t + 0.05); ce.gain.linearRampToValueAtTime(0.22, t + 0.2); ce.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); cr.connect(bp); bp.connect(ce); ce.connect(out); cr.start(t + 0.05);
      for (let i = 0; i < 7; i++) { const tt = t + 0.4 + i * 0.07 + Math.random() * 0.03, nz = noise(0.08), hp = c.createBiquadFilter(), e = c.createGain(); hp.type = "highpass"; hp.frequency.value = 2400; e.gain.setValueAtTime(0.12 * (1 - i / 9), tt); e.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07); nz.connect(hp); hp.connect(e); e.connect(out); nz.start(tt); }
    }
    // clics de fermoir : un claquement sec (bruit filtré) sur un petit « toc » grave, au rythme irrégulier
    let tt = t + (book ? 1.05 : 0.05) + Math.random() * 0.12; const f0 = 1800 + Math.random() * 2200, tock = 150 + Math.random() * 140;
    for (let i = 0; i < n; i++) {
      const k = noise(0.03), kb = c.createBiquadFilter(), ke = c.createGain(); kb.type = "bandpass"; kb.frequency.value = f0 * (0.85 + Math.random() * 0.35); kb.Q.value = 4;
      ke.gain.setValueAtTime(0.0001, tt); ke.gain.exponentialRampToValueAtTime(Math.max(0.12, 0.5 - i * 0.05), tt + 0.002); ke.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03); k.connect(kb); kb.connect(ke); ke.connect(out); k.start(tt);
      const ob = c.createOscillator(), og = c.createGain(); ob.frequency.setValueAtTime(tock * (0.9 + Math.random() * 0.2), tt); ob.frequency.exponentialRampToValueAtTime(60, tt + 0.05);
      og.gain.setValueAtTime(0.0001, tt); og.gain.exponentialRampToValueAtTime(0.28, tt + 0.002); og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06); ob.connect(og); og.connect(out); ob.start(tt); ob.stop(tt + 0.08);
      tt += 0.07 + Math.random() * 0.11;
    }
  });
}
// page tournée : un froissement de papier (bruit filtré qui monte puis retombe) et un léger « fff » de fin
function pageTurn(volume = 0.3) {
  return oneShot(0.6, (c, out, noise) => {
    out.gain.value = volume; const t = c.currentTime, f = 1500 + Math.random() * 1200;
    const a = noise(0.5), bp = c.createBiquadFilter(), e = c.createGain(); bp.type = "bandpass"; bp.Q.value = 0.9; bp.frequency.setValueAtTime(f * 0.6, t); bp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.22);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.3, t + 0.07); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.34); a.connect(bp); bp.connect(e); e.connect(out); a.start(t);
    for (let i = 0; i < 3; i++) { const tt = t + 0.08 + i * (0.05 + Math.random() * 0.04), k = noise(0.04), hp = c.createBiquadFilter(), ke = c.createGain(); hp.type = "highpass"; hp.frequency.value = 3000; ke.gain.setValueAtTime(0.09, tt); ke.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); k.connect(hp); hp.connect(ke); ke.connect(out); k.start(tt); }
    const b = noise(0.3), lp = c.createBiquadFilter(), be = c.createGain(); lp.type = "lowpass"; lp.frequency.value = 1100; be.gain.setValueAtTime(0.0001, t + 0.25); be.gain.linearRampToValueAtTime(0.1, t + 0.3); be.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); b.connect(lp); lp.connect(be); be.connect(out); b.start(t + 0.25);
  });
}
/**
 * Liaison. Mesuré sur des enregistrements du son de liaison de Myst : 60–75 % de l'énergie sous 150 Hz,
 * un peigne d'harmoniques d'un fondamental ≈ 57–60 Hz, montée de ~1,3 s jusqu'au pic, puis longue
 * décroissance (3–5 s) où les aigus (jusqu'à ~3 kHz, présents au pic) meurent les premiers ;
 * parfois un filet de voix ≈ 550–600 Hz en fin de course.
 */
/**
 * Variantes autour de la même idée (comme les enregistrements de référence : même grondement, durée,
 * montée et accent différents). rise/plat/end en secondes ; lp = ouverture du filtre grave au pic ;
 * air = souffle ; shim = éclat clair (à `shimAt`) ; tone = filet tonal { f0, f1, v, from }.
 */
const LINK_VARIANTS = [
  { id: "A", rise: 0.85, plat: 1.6, end: 4.8, lp: 620, lpEnd: 240, air: 0.03, shim: 0.045, shimAt: 2.05, body: 0.4, tone: { f0: 380, f1: 415, v: 0.07, from: 0 } },
  { id: "B", rise: 1.9, plat: 2.7, end: 6.0, lp: 520, lpEnd: 200, air: 0.012, shim: 0.012, shimAt: 3.0, body: 0.35, tone: { f0: 450, f1: 600, v: 0.1, from: 2.4 } },
  { id: "C", rise: 0.8, plat: 1.3, end: 4.2, lp: 780, lpEnd: 300, air: 0.045, shim: 0.03, shimAt: 1.6, body: 0.4, tone: { f0: 340, f1: 380, v: 0.05, from: 0 } },
  { id: "D", rise: 1.5, plat: 2.2, end: 7.2, lp: 560, lpEnd: 150, air: 0.015, shim: 0.015, shimAt: 2.6, body: 0.45, tone: { f0: 420, f1: 360, v: 0.06, from: 1 } },
  { id: "E", rise: 1.3, plat: 2.0, end: 5.8, lp: 700, lpEnd: 260, air: 0.035, shim: 0.07, shimAt: 2.4, body: 0.38, tone: { f0: 400, f1: 440, v: 0.05, from: 0.5 } },
  // caractères plus tranchés : abîme (très grave et long), verre (clair, court), vent, chœur (voix + quinte), houle (glisse vers le haut), éclair (bref)
  { id: "F", rise: 2.3, plat: 3.2, end: 8.0, lp: 420, lpEnd: 120, air: 0.008, shim: 0.006, shimAt: 3.4, body: 0.3, pitch: 0.82, tone: { f0: 300, f1: 260, v: 0.03, from: 2 }, echo: 0.7 },
  { id: "G", rise: 0.9, plat: 1.5, end: 3.6, lp: 900, lpEnd: 400, air: 0.05, shim: 0.09, shimAt: 1.4, body: 0.3, pitch: 1.12, tone: { f0: 700, f1: 880, v: 0.06, from: 0.4 }, trem: 0.1 },
  { id: "H", rise: 1.2, plat: 1.8, end: 5.4, lp: 560, lpEnd: 260, air: 0.085, shim: 0.02, shimAt: 2.2, body: 0.5, tone: { f0: 300, f1: 280, v: 0.03, from: 0.6 }, trem: 0.7 },
  { id: "I", rise: 1.6, plat: 2.4, end: 6.6, lp: 640, lpEnd: 220, air: 0.02, shim: 0.03, shimAt: 2.8, body: 0.35, tone: { f0: 480, f1: 520, v: 0.12, from: 1.2 }, chord: 1.5, echo: 0.6 },
  { id: "J", rise: 2.0, plat: 2.6, end: 5.0, lp: 700, lpEnd: 330, air: 0.03, shim: 0.05, shimAt: 2.7, body: 0.4, glide: 0.7, tone: { f0: 400, f1: 470, v: 0.05, from: 1.4 } },
  { id: "K", rise: 0.6, plat: 1.0, end: 3.0, lp: 820, lpEnd: 360, air: 0.04, shim: 0.04, shimAt: 1.1, body: 0.4, tone: { f0: 360, f1: 400, v: 0.05, from: 0 }, echo: 0.2 },
];
/** Tire une variante au hasard, jamais deux fois de suite la même. r ∈ [0,1[. */
function pickLinkVariant(r, lastId) {
  const pool = LINK_VARIANTS.filter((v) => v.id !== lastId);
  return pool[Math.floor(r * pool.length) % pool.length];
}
const PARTIALS = [[1, -9], [1, -3], [1, 0], [1, 3], [2, -4], [2, 2], [2, 7], [3, -3], [3, 4], [4, 0], [5, 3], [7, -2]];
/**
 * Une liaison = une variante + un tirage propre à chaque lecture : hauteur, partiels gardés, glissando, trémolo,
 * éclats clairs (1 à 3), deuxième voix, balance stéréo, écho. Deux liaisons de même variante ne sonnent pas pareil.
 */
function linkBuild(c, out, noise, V = LINK_VARIANTS[0]) {
  const R = Math.random, j = (x, k = 0.12) => x * (1 + (R() * 2 - 1) * k);
  const t = c.currentTime, rise = t + j(V.rise, 0.08), plat = t + V.plat * (rise - t) / V.rise, end = t + j(V.end, 0.05), T = end - t + 0.3;
  // enveloppe commune : montée, plateau, puis décroissance en deux temps
  const env = (g, v) => {
    g.gain.value = 0.0001; g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.25, t + (rise - t) * 0.35); g.gain.exponentialRampToValueAtTime(v, rise);
    g.gain.setValueAtTime(v, plat); g.gain.exponentialRampToValueAtTime(v * 0.4, plat + (end - plat) * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, end);
  };
  // sortie : balance stéréo et écho tirés au hasard
  const bus = c.createGain(); let tail = bus;
  if (c.createStereoPanner && R() < 0.7) { const p = c.createStereoPanner(); p.pan.value = (R() * 2 - 1) * 0.55; bus.connect(p); tail = p; }
  tail.connect(out);
  if (c.createDelay && R() < (V.echo == null ? 0.35 : V.echo)) {
    const d = c.createDelay(1.5), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = 0.22 + R() * 0.32; fb.gain.value = 0.22 + R() * 0.22; wet.gain.value = 0.22 + R() * 0.12;
    tail.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(out);
  }
  // 1. essaim grave : partiels serrés autour de 57 Hz et de leurs harmoniques (on en retire quelques-uns au hasard)
  const swarm = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.8; lp.frequency.setValueAtTime(380, t); lp.frequency.exponentialRampToValueAtTime(V.lp * j(1, 0.12), rise); lp.frequency.exponentialRampToValueAtTime(V.lpEnd, end);
  const base = j(57, 0.07) * (V.pitch || 1) * (0.9 + R() * 0.22), gs = V.glide != null ? V.glide : (R() < 0.3 ? 0.75 + R() * 0.5 : 1);
  PARTIALS.forEach(([m, d], i) => {
    if (i >= 6 && R() < 0.3) return;
    const o = c.createOscillator(), g = c.createGain(), f = base * m + d; o.type = i < 6 ? "sawtooth" : "triangle";
    o.frequency.setValueAtTime(f * gs, t); if (gs !== 1) o.frequency.exponentialRampToValueAtTime(f, rise);
    g.gain.value = 0.34 / Math.sqrt(m); o.connect(g); g.connect(swarm); o.start(t); o.stop(t + T);
  });
  const se = c.createGain(); env(se, j(0.6, 0.1)); swarm.connect(lp);
  if (R() < (V.trem == null ? 0.35 : V.trem)) { // trémolo lent : le grondement respire
    const tg = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); tg.gain.value = 1; lfo.frequency.value = 2 + R() * 5; lg.gain.value = 0.12 + R() * 0.25;
    lfo.connect(lg); lg.connect(tg.gain); lfo.start(t); lfo.stop(t + T); lp.connect(tg); tg.connect(se);
  } else lp.connect(se);
  se.connect(bus);
  // 2. corps : bruit médium (250–600 Hz)
  const m = noise(T), mb = c.createBiquadFilter(), me = c.createGain(); env(me, V.body); mb.type = "bandpass"; mb.frequency.value = j(380, 0.1); mb.Q.value = 1.1; m.connect(mb); mb.connect(me); me.connect(bus); m.start(t);
  // 3. air + éclats clairs
  const h = noise(T), hh = c.createBiquadFilter(), hl = c.createBiquadFilter(), he = c.createGain(); env(he, V.air); hh.type = "highpass"; hh.frequency.value = 1100; hl.type = "lowpass"; hl.frequency.setValueAtTime(2500, t); hl.frequency.exponentialRampToValueAtTime(6500, rise); hl.frequency.exponentialRampToValueAtTime(1800, end);
  h.connect(hh); hh.connect(hl); hl.connect(he); he.connect(bus); h.start(t);
  const nShim = 1 + (R() < 0.35 ? 1 : 0) + (R() < 0.15 ? 1 : 0);
  for (let k = 0; k < nShim; k++) {
    const sh = noise(T), sb = c.createBiquadFilter(), sg = c.createGain(), sa = t + j(V.shimAt, 0.1) + k * (0.5 + R() * 0.7), v = V.shim * (1 - k * 0.3); sb.type = "bandpass"; sb.frequency.value = j(2500, 0.18); sb.Q.value = 1.6;
    sg.gain.value = 0.0001; sg.gain.setValueAtTime(0.0001, sa - 0.5); sg.gain.exponentialRampToValueAtTime(v, sa); sg.gain.exponentialRampToValueAtTime(0.0001, sa + 0.95); sh.connect(sb); sb.connect(sg); sg.connect(bus); sh.start(t);
  }
  // 4. filet tonal, parfois doublé d'une deuxième voix (quinte, tierce ou octave)
  const tone = (f0, f1, v, ts) => {
    const vo = c.createOscillator(), vg = c.createGain(); vo.type = "sine"; vo.frequency.setValueAtTime(f0, ts); vo.frequency.linearRampToValueAtTime(f1, ts + (end - ts) * 0.5);
    vg.gain.value = 0.0001; vg.gain.setValueAtTime(0.0001, ts); vg.gain.exponentialRampToValueAtTime(v, ts + (end - ts) * 0.35); vg.gain.exponentialRampToValueAtTime(0.0001, end); vo.connect(vg); vg.connect(bus); vo.start(ts); vo.stop(end + 0.1);
  };
  const tn = V.tone, ts = t + tn.from * j(1, 0.2), f0 = j(tn.f0, 0.08), f1 = j(tn.f1, 0.08);
  tone(f0, f1, tn.v, ts);
  if (V.chord || R() < 0.3) { const ratio = V.chord || [1.5, 1.25, 2][Math.floor(R() * 3)]; tone(f0 * ratio, f1 * ratio, tn.v * 0.55, ts + 0.15 + R() * 0.4); }
}
let lastLink = null;
function linkSound(volume = 0.3) {
  const V = pickLinkVariant(Math.random(), lastLink); lastLink = V.id;
  return oneShot(V.end + 0.6, (c, out, noise) => { out.gain.value = volume * 0.8; linkBuild(c, out, noise, V); });
}

/**
 * Ouverture d'un Âge, trois sons indépendants : le livre (cuir, pages), les clics du fermoir, la liaison qui s'élève.
 * Ce qui est coupé est simplement omis ; la liaison attend la fin de ce qui la précède.
 */
let pendingLink = 0;
function openSequence(volume = 0.3, { book = true, clasp = true, link = true } = {}) {
  clearTimeout(pendingLink);
  const ok = bookOpen(volume, { clicks: clasp, book });
  const lead = book ? 1350 : clasp ? 550 : 0; // la liaison démarre pendant la fin du livre, ou juste après les clics
  if (link) { if (lead === 0) linkSound(volume); else if (typeof setTimeout === "function") pendingLink = setTimeout(() => { linkSound(volume); }, lead + Math.random() * 350); }
  return ok || link;
}

/**
 * Sons des vues rapprochées du Relto : ruisseau du bassin ; ronronnement et miaulements du chat. Synthétisés (aucun fichier), démarrés par le clic
 * qui entre dans la vue et arrêtés à la sortie. Un seul son de vue à la fois, sur le contexte audio partagé.
 */
/** Gain qui ramène un enregistrement fourni par l'utilisateur à un volume raisonnable (niveau efficace visé ~0,1). */
function bufferGain(buf) {
  if (buf.__gain != null) return buf.__gain;
  const d = buf.getChannelData(0), step = Math.max(1, Math.floor(d.length / 20000)); let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += step) { sum += d[i] * d[i]; n++; }
  const rms = Math.sqrt(sum / Math.max(1, n)) || 0.1; buf.__gain = Math.max(0.2, Math.min(4, 0.1 / rms)); return buf.__gain;
}
const room = { kind: null, out: null, nodes: [], timers: [] };
/** Accorde le bourdon de l'Imageur : battements selon l'atmosphère `k` (~9 Hz au pire, aucun à l'accord) ; la quinte cristalline quand l'image entière tient (`total`). */
function imagerTune(k, total = k, locked = false) {
  const im = room.kind === "imager" && room.imager; if (!im) return;
  try { const t = im.c.currentTime, kk = Math.max(0, Math.min(1, k || 0)); im.o2.frequency.setTargetAtTime(im.f0 + (1 - kk) * 4, t, 0.4); im.g.gain.setTargetAtTime(locked ? 0.025 : 0.1, t, 0.8); /* verrouillé : le bourdon s'efface presque, la machine suit seule */ const tt = Math.max(0, Math.min(1, total || 0)); im.g3.gain.setTargetAtTime(tt > 0.9 ? (locked ? 0.012 : 0.03) * (tt - 0.9) * 10 : 0, t, 0.6); } catch (e) { /* ignore */ }
}
function roomStop() {
  room.imager = null;
  for (const t of room.timers) clearTimeout(t); room.timers = [];
  const out = room.out, nodes = room.nodes; room.out = null; room.nodes = []; room.kind = null;
  if (!out) return;
  try { const c = out.context; out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(0, c.currentTime, 0.12); } catch (e) { /* ignore */ }
  setTimeout(() => { for (const n of nodes) { try { n.stop && n.stop(); } catch (e) { /* ignore */ } try { n.disconnect(); } catch (e) { /* ignore */ } } try { out.disconnect(); } catch (e) { /* ignore */ } }, 700);
}
function noiseBuf(c, secs) { const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = b.getChannelData(0); let y = 0; for (let i = 0; i < d.length; i++) { y = 0.97 * y + (Math.random() * 2 - 1) * 0.3; d[i] = y + (Math.random() * 2 - 1) * 0.15; } return b; }
/** Un miaulement : voix de gorge en dents de scie dont la hauteur monte puis redescend, formants qui glissent de « i » vers « a » puis « ou » ; parfois un court « mrrp ». */
/**
 * Découpe un enregistrement qui contient plusieurs sons (plusieurs miaulements) aux silences : enveloppe en fenêtres de 10 ms, seuil relatif
 * au niveau du fichier, silences de moins de 150 ms ignorés, segments de moins de 120 ms écartés. Renvoie [{ start, dur, peak }] en secondes.
 */
function segmentsOf(d, sr) {
  const win = Math.max(1, Math.floor(sr * 0.01)), n = Math.floor(d.length / win), env = new Float32Array(n);
  for (let i = 0; i < n; i++) { let m = 0; for (let k = i * win; k < (i + 1) * win; k++) { const v = Math.abs(d[k]); if (v > m) m = v; } env[i] = m; }
  const sorted = Array.from(env).sort((a, b) => a - b), ref = sorted[Math.floor(sorted.length * 0.95)] || 0, thr = Math.max(0.01, ref * 0.12);
  const raw = []; let cur = null, quiet = 0;
  for (let i = 0; i < n; i++) {
    if (env[i] > thr) { if (!cur) cur = { a: i, b: i }; cur.b = i; quiet = 0; }
    else if (cur && ++quiet > 15) { raw.push(cur); cur = null; quiet = 0; } // 150 ms de silence : le son est fini
  }
  if (cur) raw.push(cur);
  const out = [];
  for (const g of raw) {
    if (g.b - g.a < 12) continue; // trop court : un clic, pas un miaulement
    const a = Math.max(0, g.a - 4), b = Math.min(n - 1, g.b + 8); let peak = 0; for (let i = a; i <= b; i++) if (env[i] > peak) peak = env[i];
    out.push({ start: (a * win) / sr, dur: Math.min(4, ((b - a + 1) * win) / sr), peak: peak || 0.1 });
  }
  return out.length ? out : [{ start: 0, dur: Math.min(4, d.length / sr), peak: Math.max(0.1, ref) }];
}
/**
 * Un ronron bref (clic sur le chat endormi) : ~3 s, qui monte et s'éteint. Avec l'enregistrement de l'utilisateur
 * (réglage « Purr sound file »), un morceau du fichier ; sinon le même ronron synthétisé que la vue du chat.
 */
function purr(volume = 0.3, buf = null) {
  const dur = 2.8 + Math.random() * 0.8;
  return oneShot(dur + 0.3, (c, out, noise) => {
    const t = c.currentTime, env = c.createGain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.5); env.gain.setValueAtTime(1, t + dur - 0.9); env.gain.linearRampToValueAtTime(0.0001, t + dur);
    env.connect(out);
    if (buf) { const s = c.createBufferSource(); s.buffer = buf; s.connect(env); out.gain.value = volume * bufferGain(buf); s.start(t, Math.random() * Math.max(0, buf.duration - dur), dur); return; }
    const ns = noise(dur + 0.2), bp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    bp.type = "bandpass"; bp.frequency.value = 130; bp.Q.value = 0.9; lp.type = "lowpass"; lp.frequency.value = 320;
    g.gain.value = 0.55; lfo.frequency.value = 22 + Math.random() * 5; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(g.gain);
    ns.connect(bp); bp.connect(lp); lp.connect(g); g.connect(env); out.gain.value = volume * 1.6;
    ns.start(t); lfo.start(t); lfo.stop(t + dur + 0.1);
  });
}
let lastMeowSeg = -1;
function meow(volume = 0.3, buf = null) {
  if (buf) { // enregistrement de l'utilisateur : un seul des sons du fichier est joué à chaque fois (jamais deux fois de suite le même), à vitesse légèrement variable
    if (!buf.__segs) buf.__segs = segmentsOf(buf.getChannelData(0), buf.sampleRate);
    const segs = buf.__segs; let k = Math.floor(Math.random() * segs.length);
    if (segs.length > 1 && k === lastMeowSeg) k = (k + 1 + Math.floor(Math.random() * (segs.length - 1))) % segs.length;
    lastMeowSeg = k; const sg = segs[k], rate = 0.94 + Math.random() * 0.12;
    return oneShot(sg.dur / rate + 0.5, (c, out) => {
      const t = c.currentTime, s = c.createBufferSource(), e = c.createGain(), len = sg.dur / rate; s.buffer = buf; s.playbackRate.value = rate;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + 0.012); e.gain.setValueAtTime(1, t + Math.max(0.02, len - 0.06)); e.gain.linearRampToValueAtTime(0, t + len);
      out.gain.value = Math.min(4, (volume * 0.6) / sg.peak); s.connect(e); e.connect(out); s.start(t, sg.start, sg.dur);
    });
  }
  const short = Math.random() < 0.3;
  return oneShot(1.6, (c, out, noise) => {
    const t = c.currentTime, dur = short ? 0.28 + Math.random() * 0.1 : 0.75 + Math.random() * 0.3, f0 = 560 + Math.random() * 90, pk = f0 * (short ? 1.25 : 1.55 + Math.random() * 0.15), end = f0 * (short ? 1.1 : 0.82);
    const o = c.createOscillator(), vib = c.createOscillator(), vg = c.createGain(), lp = c.createBiquadFilter(), env = c.createGain(), mix = c.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(pk, t + dur * (short ? 0.7 : 0.3)); o.frequency.linearRampToValueAtTime(end, t + dur);
    vib.frequency.value = 5.2; vg.gain.value = 10; vib.connect(vg); vg.connect(o.frequency);
    lp.type = "lowpass"; lp.frequency.value = 3600; o.connect(lp);
    const form = (f1, f2, f3, q, g) => { const b = c.createBiquadFilter(), gg = c.createGain(); b.type = "bandpass"; b.Q.value = q; b.frequency.setValueAtTime(f1, t); b.frequency.linearRampToValueAtTime(f2, t + dur * 0.4); b.frequency.linearRampToValueAtTime(f3, t + dur); gg.gain.value = g; lp.connect(b); b.connect(gg); gg.connect(mix); };
    if (short) { form(500, 800, 650, 5, 1); form(1700, 1900, 1500, 6, 0.5); } else { form(420, 950, 520, 5, 1); form(2500, 1700, 1000, 6, 0.55); form(3200, 2900, 2600, 8, 0.12); }
    // souffle de gorge très léger sous la voix
    const ns = noise(dur + 0.2), nb = c.createBiquadFilter(), ng = c.createGain(); nb.type = "bandpass"; nb.frequency.value = 1800; nb.Q.value = 0.8; ng.gain.value = 0.05; ns.connect(nb); nb.connect(ng); ng.connect(mix);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(volume * 0.5, t + 0.05); env.gain.setValueAtTime(volume * 0.5, t + dur * 0.55); env.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
    mix.connect(env); env.connect(out); out.gain.value = 1;
    o.start(t); vib.start(t); o.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
  });
}
/** Grelot de la balle du chat : trois petites notes aiguës qui s'éteignent vite. */
function jingle(volume = 0.3) {
  return oneShot(0.9, (c, out) => {
    const t = c.currentTime; out.gain.value = volume * 0.3;
    [2637, 3136, 2349].forEach((f, i) => { const o = c.createOscillator(), e = c.createGain(), t0 = t + i * 0.07; o.type = "sine"; o.frequency.value = f; e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(1, t0 + 0.005); e.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4); o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + 0.45); });
  });
}
/**
 * Les bruits de l'Imageur : le verrou (un choc sourd puis un tintement), le levier qui coince, le cristal qu'on soulève
 * ou qu'on pose (verre contre laiton), le verre qui glisse sur son rail, le cran d'un bouton, la manivelle (cliquet).
 */
function imagerSfx(kind, volume = 0.3) {
  return oneShot(1.2, (c, out, noise) => {
    const t = c.currentTime; out.gain.value = volume * 0.5;
    const thud = (t0, f, dur, g = 1) => { const o = c.createOscillator(), e = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + dur); e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + 0.004); e.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + dur + 0.05); };
    const tick = (t0, f, g = 0.6, dur = 0.03) => { const n = noise(dur + 0.02), bp = c.createBiquadFilter(), e = c.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 6; e.gain.setValueAtTime(g, t0); e.gain.exponentialRampToValueAtTime(0.001, t0 + dur); n.connect(bp); bp.connect(e); e.connect(out); n.start(t0); n.stop(t0 + dur + 0.02); };
    const bell = (t0, f, g = 0.25, dur = 0.8) => { const o = c.createOscillator(), e = c.createGain(); o.type = "sine"; o.frequency.value = f; e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + 0.005); e.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + dur + 0.05); };
    if (kind === "lock") { thud(t, 90, 0.35); tick(t, 900, 0.8, 0.05); bell(t + 0.12, 1318, 0.18); bell(t + 0.12, 1976, 0.1); }
    else if (kind === "unlock") { tick(t, 1200, 0.6, 0.04); thud(t + 0.05, 140, 0.2, 0.6); }
    else if (kind === "jam") { thud(t, 70, 0.25, 0.8); tick(t + 0.02, 400, 0.5, 0.08); }
    else if (kind === "lift") { bell(t, 2637, 0.12, 0.35); }
    else if (kind === "set") { tick(t, 2200, 0.5, 0.03); bell(t + 0.01, 3136, 0.1, 0.5); bell(t + 0.01, 2093, 0.08, 0.6); }
    else if (kind === "slide") { const n = noise(0.18), bp = c.createBiquadFilter(), e = c.createGain(); bp.type = "bandpass"; bp.frequency.setValueAtTime(1800, t); bp.frequency.linearRampToValueAtTime(2600, t + 0.15); bp.Q.value = 2; e.gain.setValueAtTime(0.25, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.16); n.connect(bp); bp.connect(e); e.connect(out); n.start(t); n.stop(t + 0.18); }
    else if (kind === "crank") { for (let i = 0; i < 6; i++) tick(t + i * 0.05, 1500 + (i % 2) * 300, 0.45); thud(t + 0.3, 110, 0.15, 0.4); }
    else if (kind === "lever") { tick(t, 700, 0.6, 0.05); thud(t + 0.03, 160, 0.15, 0.5); }
    else if (kind === "page") { tick(t, 3000, 0.25, 0.12); }
    else tick(t, 1700, 0.5, 0.025); // un cran
  });
}
/**
 * Les bruits du télescope : le cran fin du moyeu (« tick »), le cliquet de la couronne (« turn »), et, après chaque geste,
 * le pouls du Zéro (« ping ») : deux notes proches qui battent l'une contre l'autre ; `s` (0 à 1, le signal) les accorde :
 * loin, un murmure grave qui tremble ; près, une note claire et posée. « found » : le Zéro trouvé, une quinte qui reste.
 */
function telescopeSfx(kind, s = 0, volume = 0.3) {
  const k = Math.max(0, Math.min(1, Number(s) || 0));
  if (kind === "ping" && k < 0.15) return false; // le vide : rien qu'on entende
  if (kind === "pulse" && k < 0.02) return false;
  return oneShot(1.6, (c, out, noise) => {
    const t = c.currentTime; out.gain.value = volume * 0.45;
    const tone = (t0, f, g, dur) => { const o = c.createOscillator(), e = c.createGain(); o.type = "sine"; o.frequency.value = f; e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.001, t0 + dur); o.connect(e); e.connect(out); o.start(t0); o.stop(t0 + dur + 0.05); };
    const tick = (t0, f, g) => { const n = noise(0.05), bp = c.createBiquadFilter(), e = c.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = 7; e.gain.setValueAtTime(g, t0); e.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03); n.connect(bp); bp.connect(e); e.connect(out); n.start(t0); n.stop(t0 + 0.05); };
    if (kind === "tick") tick(t, 2400, 0.4);
    else if (kind === "turn") { for (let i = 0; i < 4; i++) tick(t + i * 0.035, 1500 + (i % 2) * 400, 0.45); }
    else if (kind === "ping") { const f = 196 + 196 * k, beat = (1 - k) * 9, g = 0.08 + 0.22 * k; tone(t + 0.06, f, g, 0.5 + 0.7 * k); tone(t + 0.06, f + beat, g * (1 - 0.6 * k), 0.5 + 0.7 * k); }
    else if (kind === "pulse") { // le pouls continu : loin, un souffle sourd et une note qui bat ; près, une note nette, brève et posée
      const f = 220 + 110 * k, g = 0.03 + 0.1 * k, dur = 0.18 + 0.3 * k; tone(t + 0.01, f, g, dur); tone(t + 0.01, f + (1 - k) * 6, g * (1 - 0.7 * k), dur);
      if (k < 0.6) { const n = noise(0.3), lp = c.createBiquadFilter(), e = c.createGain(); lp.type = "lowpass"; lp.frequency.value = 500; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.05 * (1 - k), t + 0.06); e.gain.exponentialRampToValueAtTime(0.001, t + 0.28); n.connect(lp); lp.connect(e); e.connect(out); n.start(t); n.stop(t + 0.3); }
    }
    else if (kind === "found") { tone(t, 392, 0.25, 1.4); tone(t + 0.12, 587.3, 0.18, 1.3); tone(t + 0.24, 784, 0.1, 1.2); }
  });
}
/** Couinement du jouet-souris. */
function squeak(volume = 0.3) {
  return oneShot(0.4, (c, out) => {
    const t = c.currentTime, o = c.createOscillator(), e = c.createGain(); out.gain.value = volume * 0.3;
    o.type = "square"; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(2600, t + 0.07); o.frequency.exponentialRampToValueAtTime(1900, t + 0.16);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.5, t + 0.01); e.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(e); e.connect(out); o.start(t); o.stop(t + 0.25);
  });
}
function roomStart(kind, volume = 0.3, bufs = {}) {
  roomStop();
  let c; try { c = sfxCtx(); } catch (e) { return false; } if (!c) return false;
  try {
    const out = c.createGain(); out.gain.value = 0; out.connect(c.destination); out.gain.setTargetAtTime(volume, c.currentTime, 0.4);
    room.out = out; room.kind = kind;
    const keep = (n) => { room.nodes.push(n); return n; };
    const fileLoop = (buf) => { const s = keep(c.createBufferSource()), g = keep(c.createGain()); s.buffer = buf; s.loop = true; g.gain.value = bufferGain(buf); s.connect(g); g.connect(out); s.start(0, Math.random() * buf.duration * 0.5); };
    const loop = (f) => { const s = keep(c.createBufferSource()); s.buffer = noiseBuf(c, 3); s.loop = true; f(s); s.start(); return s; };
    if (kind === "imager") {
      // l'Imageur : deux bourdons graves ; le second s'écarte du premier selon le désaccord, d'où des battements
      // qui ralentissent à mesure que l'on s'accorde, puis se fondent ; une quinte cristalline s'ajoute quand l'image tient
      const f0 = 98, lp = keep(c.createBiquadFilter()), g = keep(c.createGain()), o1 = keep(c.createOscillator()), o2 = keep(c.createOscillator()), o3 = keep(c.createOscillator()), g3 = keep(c.createGain());
      lp.type = "lowpass"; lp.frequency.value = 380; g.gain.value = 0.1; o1.type = "sine"; o2.type = "sine"; o1.frequency.value = f0; o2.frequency.value = f0 + 4;
      o3.type = "sine"; o3.frequency.value = f0 * 6; g3.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o3.connect(g3); g3.connect(out); o1.start(); o2.start(); o3.start();
      room.imager = { o2, g, g3, f0, c };
      imagerTune(bufs.k == null ? 0 : bufs.k, bufs.total == null ? 0 : bufs.total, !!bufs.locked);
      return true;
    }
    if (kind === "fire" && bufs.main) { fileLoop(bufs.main); } else if (kind === "fire") {
      // feu qui crépite : surtout les craquements du bois, sous un très léger grondement grave (pas de souffle d'air) ; crépitements (claquements brefs, parfois en rafale) et quelques gros « pop » de bûche
      const d = bufs.d == null ? 0.7 : bufs.d, nb = noiseBuf(c, 1);
      loop((s) => { const lp = keep(c.createBiquadFilter()), g = keep(c.createGain()), lfo = keep(c.createOscillator()), lg = keep(c.createGain()); lp.type = "lowpass"; lp.frequency.value = 200; g.gain.value = 0.05 + 0.04 * d; lfo.frequency.value = 0.23; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(lp); lp.connect(g); g.connect(out); });
      const click = (t, amp, lo, hi) => { const s = c.createBufferSource(), bp = c.createBiquadFilter(), e = c.createGain(), len = 0.004 + Math.random() * 0.012; s.buffer = nb; bp.type = "bandpass"; bp.frequency.value = lo + Math.random() * (hi - lo); bp.Q.value = 1 + Math.random() * 2.5; e.gain.setValueAtTime(amp, t); e.gain.exponentialRampToValueAtTime(0.0005, t + len); s.connect(bp); bp.connect(e); e.connect(out); s.start(t, Math.random() * 0.8, len + 0.01); };
      const pop = (t) => { for (let i = 0; i < 3; i++) click(t + i * 0.006, 0.45 - i * 0.1, 700 + i * 500, 1800 + i * 1500); }; // gros craquement : quelques claquements de bruit rapprochés (pas de note : un son tonal faisait « ploc »)
      const crackle = () => {
        if (room.kind !== "fire" || room.out !== out) return;
        const t = c.currentTime, r = Math.random();
        if (r < 0.07 * (0.5 + d)) pop(t); else { const n = r < 0.3 ? 2 + Math.floor(Math.random() * 4) : 1; for (let i = 0; i < n; i++) click(t + i * (0.004 + Math.random() * 0.014), Math.pow(Math.random(), 2) * 0.5 + 0.05, 1400, 6500); }
        room.timers.push(setTimeout(crackle, -Math.log(1 - Math.random()) * (230 - 150 * d) + 15));
      };
      crackle();
    } else if (kind === "water" && bufs.main) { fileLoop(bufs.main); } else if (kind === "water") {
      // clapotis très léger : un souffle d'eau à peine audible dans les aigus, et de petites gouttes irrégulières (« plic »)
      loop((s) => { const hp = keep(c.createBiquadFilter()), g = keep(c.createGain()); hp.type = "highpass"; hp.frequency.value = 3800; g.gain.value = 0.025; s.connect(hp); hp.connect(g); g.connect(out); });
      const drip = () => {
        if (room.kind !== "water" || room.out !== out) return;
        const t = c.currentTime, o = c.createOscillator(), e = c.createGain(), f = 700 + Math.random() * 1500, len = 0.05 + Math.random() * 0.06, a = 0.025 + Math.random() * 0.05;
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (1.5 + Math.random() * 0.8), t + len); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(a, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0005, t + len + 0.05); o.connect(e); e.connect(out); o.start(t); o.stop(t + len + 0.08);
        room.timers.push(setTimeout(drip, 160 + Math.random() * 900));
      };
      drip(); room.timers.push(setTimeout(drip, 420));
    } else if (kind === "cat") {
      // ronronnement doux : bruit grave filtré dont le volume pulse de façon irrégulière (~25 Hz qui dérive) et respire lentement ; miaulements espacés
      if (bufs.main) fileLoop(bufs.main); else loop((s) => {
        const bp = keep(c.createBiquadFilter()), lp = keep(c.createBiquadFilter()), g = keep(c.createGain()), lfo = keep(c.createOscillator()), lg = keep(c.createGain()), br = keep(c.createOscillator()), bg = keep(c.createGain());
        bp.type = "bandpass"; bp.frequency.value = 130; bp.Q.value = 0.9; lp.type = "lowpass"; lp.frequency.value = 320; g.gain.value = 0.55; lfo.frequency.value = 24; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(g.gain); br.frequency.value = 0.4; bg.gain.value = 0.2; br.connect(bg); bg.connect(g.gain);
        s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out); lfo.start(); br.start();
        const drift = () => { if (room.kind !== "cat" || room.out !== out) return; lfo.frequency.setTargetAtTime(21 + Math.random() * 7, c.currentTime, 0.3); room.timers.push(setTimeout(drift, 500 + Math.random() * 700)); }; drift();
      });
      const next = (first) => { room.timers.push(setTimeout(() => { if (room.kind !== "cat" || room.out !== out) return; meow(volume * 1.4, bufs.meow); next(false); }, first ? 3000 + Math.random() * 2000 : 9000 + Math.random() * 10000)); };
      next(true);
    }
    return true;
  } catch (e) { console.warn("[Age Writer ext] room sound", e); return false; }
}

module.exports = { segmentsOf, audioContext: sfxCtx, roomStart, roomStop, imagerTune, imagerSfx, telescopeSfx, meow, purr, jingle, squeak, LINK_VARIANTS, pickLinkVariant, linkBuild, bookOpen, pageTurn, openSequence, linkSound, zenify, staticBurst, PRESETS, MODES, layersForWorld, layersForMechs, layersForNames, mergeLayers, Soundscape };
