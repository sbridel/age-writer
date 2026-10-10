"use strict";
/**
 * L'Imageur du Relto (1.17) — trois réglages, comme la machine de Rime :
 *   I.   les CRISTAUX : la résonance de l'Âge, ses pages écrites, dans l'ordre du livre (jusqu'à quatre) ;
 *   II.  les LENTILLES : rouge, verte, bleue, pour retrouver la couleur de la lumière de son étoile, et l'iris, selon le flux reçu ;
 *   III. l'ATMOSPHÈRE : la synchronisation sur le ciel de l'Âge (ci-dessous).
 *
 * Une machine du Relto qui, réglée sur un Âge, en fait apparaître une vue dans son cristal. Le réglage n'est pas une
 * combinaison arbitraire : il vient du ciel de l'Âge visé, tel que la couche physique le calcule.
 *   fréquence  ← durée du jour (rotation)          amplitude ← pression de l'air
 *   harmonique ← aurores et champ magnétique        polarité  ← sens du champ (graine)
 *   phase      ← dérive avec l'horloge, au rythme du jour de l'Âge (un monde figé ne dérive presque pas)
 * Toutes les valeurs vont de 0 à 24 : elles s'affichent en chiffres D'ni (base 25).
 * Module pur (sans DOM ni Obsidian) : testé dans test/imager.test.js.
 */
const { fnv, clamp } = require("./util");
const { pageList } = require("./engine/analysis");
const SKY = require("./sky");
const { blackbody } = require("./genscene");

const MAX = 24, TURN = 25; // la phase tourne sur 25 (un tour = un jour de l'Âge)

/** Ce que l'analyse d'un Âge dit de son ciel ; `name` = nom de la note (graine). */
function targetsOf(analysis, name = "") {
  const w = analysis && analysis.physics && analysis.physics.w;
  const ids = new Set();
  const res = analysis && analysis.resolved;
  if (res) {
    for (const l of res.lines || []) if (l.entry) ids.add(l.entry.id);
    for (const id of (res.matter && res.matter.written) || []) ids.add(id);
  }
  const has = (id) => ids.has(id), cycle = has("frozen_cycle") ? "frozen" : has("erratic_cycle") ? "erratic" : "steady";
  // durée du jour en heures (rotation) : la physique, sinon le cycle écrit
  let hours = w && Number.isFinite(w.rotation) && w.rotation > 0 ? w.rotation : cycle === "frozen" ? 24 * 365 : 24;
  if (w && w.locked) hours = Math.max(hours, 24 * 30);
  const P = w && Number.isFinite(w.P) ? w.P : has("thin_air") ? 0.3 : has("thick_air") ? 3 : 1;
  const field = w && Number.isFinite(w.field) ? w.field : has("dead_core") ? 0 : 1;
  const auroras = has("auroras");
  const freq = Math.round(clamp(12 + 6 * Math.log2(24 / hours), 0, MAX));
  const amp = P <= 0.002 ? 0 : Math.round(clamp(12 + 4 * Math.log2(P), 0, MAX));
  const harm = Math.round(clamp((auroras ? 8 : 0) + 6 * clamp(field, 0, 2), 0, MAX));
  const pol = fnv(name + "|imageur-polarite") % 2 ? 1 : -1;
  const phase0 = fnv(name + "|imageur-phase") % TURN;
  // dérive : un tour par jour de l'Âge, exprimée en unités par heure réelle ; très lente pour un monde figé
  const drift = cycle === "frozen" || (w && w.locked) ? 0.02 : TURN / clamp(hours, 2, 24 * 365);
  return { freq, amp, harm, pol, phase0, drift, erratic: cycle === "erratic", hours, P, field, auroras, name, lens: lensOf(w, ids), crystals: crystalsOf(analysis, name) };
}

/**
 * II. Les lentilles : la couleur de la lumière de l'étoile (une couleur de soleil écrite d'abord, sinon la température
 * calculée par la physique ; une naine brune, sans presque de visible, tire vers le rouge sombre ; sans étoile, la lueur
 * froide du ciel nocturne), ramenée à trois crans de 0 à 24 (la plus forte composante à 24). L'iris : plus le flux
 * reçu est fort, plus il se ferme.
 */
function lensOf(w, ids) {
  const hue = [...ids].find((id) => SKY.HUES[id] && id !== "black_sun");
  let rgb;
  if (hue) rgb = SKY.HUES[hue];
  else if ((w && w.blackSun) || ids.has("black_sun")) rgb = blackbody(1500);
  else if ((w && w.stars === 0) || ids.has("starless")) rgb = [60, 70, 120];
  else rgb = blackbody(w && w.starTemps && Number.isFinite(w.starTemps[0]) ? w.starTemps[0] : w && Number.isFinite(w.starTemp) ? w.starTemp : 5772);
  const m = Math.max(1, ...rgb), S = w && Number.isFinite(w.S) ? w.S : ids.has("starless") ? 0 : 1;
  const [r, g, b] = rgb.map((c) => Math.round(clamp((24 * c) / m, 0, MAX)));
  return { r, g, b, iris: Math.round(clamp(12 - 5 * Math.log2(Math.max(S, 1e-3)), 0, MAX)), rgb: rgb.map(Math.round) };
}

/** Cristaux leurres : des pages courantes, pour qu'on ait à choisir. */
const DECOYS = ["water", "stone", "fern", "wind", "fog", "lava", "sand", "great_tree", "moth", "door", "lamp", "crystal", "rain", "salt", "iron", "seed", "grazer", "tablet", "bridge", "auroras", "single_sun", "steady_cycle"];
/**
 * I. Les cristaux : les pages écrites de l'Âge, dans l'ordre du livre (sans doublon, sans tache), les quatre premières ;
 * s'il n'en a aucune d'écrite, les premières tirées. Les choix : ces pages et des leurres, huit en tout, mêlés par la graine.
 */
function crystalsOf(analysis, name) {
  let pages = [];
  try { pages = analysis && analysis.resolved ? pageList(analysis) : []; } catch (e) { pages = []; }
  const uniq = (list) => [...new Set(list.map((p) => p.id))];
  let ids = uniq(pages.filter((p) => p.written)).slice(0, 4);
  if (!ids.length) ids = uniq(pages).slice(0, 4);
  if (!ids.length) ids = ["water"];
  const pool = DECOYS.filter((d) => !ids.includes(d)), opts = [...ids];
  let h = fnv(name + "|imageur-cristaux");
  while (opts.length < 8 && pool.length) { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; opts.push(pool.splice(h % pool.length, 1)[0]); }
  for (let i = opts.length - 1; i > 0; i--) { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; const j = h % (i + 1); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { ids, options: opts };
}

/** Phase du ciel de l'Âge à l'instant `now` (ms) : elle avance ; un cycle erratique saute toutes les deux heures. */
function phaseAt(t, now = Date.now()) {
  const h = now / 3600000;
  let p = t.phase0 + t.drift * h;
  if (t.erratic) p += (fnv(t.name + "|saut|" + Math.floor(h / 2)) % 1000) / 1000 * TURN;
  return ((p % TURN) + TURN) % TURN;
}

/** Écart de phase sur le cercle, de 0 (alignées) à 1 (opposées). */
function phaseGap(a, b) {
  const d = Math.abs(a - b) % TURN;
  return Math.min(d, TURN - d) / (TURN / 2);
}

/**
 * Netteté de l'image (0 à 1) pour un réglage `s` = { pol, freq, amp, harm, phase } face au ciel `t` à l'instant `now`.
 * La fréquence pèse le plus, puis la phase, l'amplitude, l'harmonique ; une polarité inversée brouille presque tout.
 */
function sharpness(s, t, now = Date.now()) {
  const err = (2 * Math.abs(s.freq - t.freq)) / MAX + (1.2 * Math.abs(s.amp - t.amp)) / MAX + (0.8 * Math.abs(s.harm - t.harm)) / MAX + 1.4 * phaseGap(s.phase, phaseAt(t, now));
  let k = Math.max(0, 1 - err);
  if (s.pol !== t.pol) k *= 0.35;
  return k;
}

/** II. Justesse des lentilles (0 à 1) : écart des trois couleurs, puis de l'iris. */
function lensScore(s, t) {
  const L = t.lens; if (!L) return 1;
  return Math.max(0, 1 - (Math.abs(s.r - L.r) + Math.abs(s.g - L.g) + Math.abs(s.b - L.b)) / 40 - (0.7 * Math.abs(s.iris - L.iris)) / MAX);
}
/** I. Justesse des cristaux (0 à 1) : chaque emplacement juste compte ; une bonne page à la mauvaise place, un peu. */
function crystalScore(s, t) {
  if (t && Number.isFinite(t.cryScore)) return t.cryScore; // mode Guilde (src/imager-guild.js) : les cristaux sont des glyphes, la justesse vient avec la cible
  const C = t.crystals; if (!C || !C.ids.length) return 1;
  let k = 0;
  C.ids.forEach((id, i) => { const pick = C.options[(s.cry || [])[i]]; if (pick === id) k += 1; else if (C.ids.includes(pick)) k += 0.3; });
  return k / C.ids.length;
}
/** Les trois réglages et la netteté finale (leur produit) : il faut les trois pour voir l'Âge net. */
function clarity(s, t, now = Date.now()) {
  if (!t) return { cry: 0, lens: 0, atmo: 0, total: 0 };
  const e = effective(s, t, now), cry = crystalScore(e, t), lens = lensScore(e, t), atmo = sharpness(e, t, now);
  return { cry, lens, atmo, total: cry * lens * atmo };
}

/**
 * Le VERROU (1.17) : une fois l'image nette, on tire le levier ; la machine suit alors l'Âge toute seule (la phase qui
 * dérive, les sauts d'un cycle erratique). Verrouillé, le réglage est tenu : les commandes ne bougent plus, et le
 * périscope (azimut `az` 0 à 3, inclinaison `tilt` −1 sous l'eau, 0 horizon, 1 zénith) devient libre.
 */
const LOCK_AT = 0.9;
function effective(s, t, now = Date.now()) { return s && s.lock && t ? { ...s, phase: phaseAt(t, now) } : s; }
function canLock(s, t, now = Date.now()) { return !!t && clarity({ ...s, lock: false }, t, now).total >= LOCK_AT; }
/** Tirer le levier : verrouille si l'image est nette ; déverrouille sinon (la phase reste où le ciel était). */
function toggleLock(s, t, now = Date.now()) {
  const o = normalize(s);
  if (o.lock) { o.lock = false; o.phase = t ? Math.round(phaseAt(t, now) * 2) / 2 % TURN : o.phase; o.az = 0; o.tilt = 0; return { s: o, ok: true, locked: false }; }
  if (!canLock(o, t, now)) return { s: o, ok: false, locked: false };
  o.lock = true; return { s: o, ok: true, locked: true };
}

/**
 * I. Le râtelier : les cristaux sont des objets. On en prend un (au râtelier ou dans un logement), on le pose dans un
 * logement : celui qui y était retourne au râtelier, ou change de place si on a pris un cristal déjà posé.
 * `hand` = null | { opt, slot? } ; `target` = { slot } | { rack: opt }. Renvoie { s, hand }.
 */
function place(s, hand, target) {
  const o = normalize(s); if (o.lock || !target) return { s: o, hand: null };
  if (!hand) {
    if (target.slot != null) return { s: o, hand: { opt: o.cry[target.slot], slot: target.slot } };
    if (target.rack != null) { const at = o.cry.indexOf(target.rack); return { s: o, hand: at >= 0 ? { opt: target.rack, slot: at } : { opt: target.rack } }; }
    return { s: o, hand: null };
  }
  if (target.slot != null) {
    if (hand.slot === target.slot) return { s: o, hand: null }; // reposé où il était
    if (hand.slot != null) { const a = o.cry[hand.slot]; o.cry[hand.slot] = o.cry[target.slot]; o.cry[target.slot] = a; return { s: o, hand: null }; }
    const at = o.cry.indexOf(hand.opt); if (at >= 0) o.cry[at] = o.cry[target.slot]; // déjà posé ailleurs : on échange
    o.cry[target.slot] = hand.opt; return { s: o, hand: null };
  }
  if (target.rack != null) {
    if (target.rack === hand.opt) return { s: o, hand: null };
    if (hand.slot != null && !o.cry.includes(target.rack)) { o.cry[hand.slot] = target.rack; return { s: o, hand: null }; } // on rend le cristal, on prend l'autre à sa place
    const at = o.cry.indexOf(target.rack); return { s: o, hand: at >= 0 ? { opt: target.rack, slot: at } : { opt: target.rack } };
  }
  return { s: o, hand: null };
}

/** Battements entendus : ce qu'on perçoit de l'écart de fréquence (clé i18n). */
function beatsOf(s, t, now = Date.now()) {
  if (s.pol !== t.pol) return "opposed";
  const df = Math.abs(s.freq - t.freq);
  if (df === 0) return phaseGap(s.phase, phaseAt(t, now)) < 0.06 ? "unison" : "slow";
  return df < 3 ? "slow" : df < 7 ? "fast" : "hiss";
}

/** Réglage de départ : au milieu, polarité « + ». */
const START = Object.freeze({ pol: 1, freq: 12, amp: 12, harm: 6, phase: 0, r: 12, g: 12, b: 12, iris: 12, cry: Object.freeze([0, 1, 2, 3]), lock: false, az: 0, tilt: 0 });
const knob = (v, d) => Math.round(clamp(Number.isFinite(+v) ? +v : d, 0, MAX));
function normalize(s) {
  const o = { ...START, ...(s || {}) };
  const cry = (Array.isArray(o.cry) ? o.cry : START.cry).slice(0, 4).map((v) => Math.max(0, Math.floor(+v) || 0));
  for (let i = 0; i < cry.length; i++) if (cry.indexOf(cry[i]) < i) { let v = 0; while (cry.includes(v)) v++; cry[i] = v; } // un cristal n'est qu'à un endroit
  while (cry.length < 4) { let v = 0; while (cry.includes(v)) v++; cry.push(v); }
  return {
    pol: o.pol < 0 ? -1 : 1, freq: knob(o.freq, 12), amp: knob(o.amp, 12), harm: knob(o.harm, 6), phase: ((Math.round((+o.phase || 0) * 2) / 2) % TURN + TURN) % TURN,
    r: knob(o.r, 12), g: knob(o.g, 12), b: knob(o.b, 12), iris: knob(o.iris, 12), cry,
    lock: !!o.lock, az: ((Math.floor(+o.az) || 0) % 4 + 4) % 4, tilt: Math.max(-1, Math.min(1, Math.round(+o.tilt) || 0)),
    // étape 2 du télescope (src/calibration.js) : le micromètre de synchro et l'instant de la synchro ; absents des anciens réglages
    ...(o.sync != null && Number.isFinite(+o.sync) ? { sync: ((Math.round(+o.sync * 2) / 2) % TURN + TURN) % TURN } : {}),
    ...(o.syncAt != null && Number.isFinite(+o.syncAt) ? { syncAt: +o.syncAt } : {}),
    ...(typeof o.sysKey === "string" && o.sysKey ? { sysKey: o.sysKey } : {}), // la clé d'étoile au moment de la synchro : « le signal a changé »
  };
}
/** Tourner une commande : `key` (freq, amp, harm, phase) de `delta` crans ; la polarité bascule. */
function turn(s, key, delta, nOptions = 8) {
  const o = normalize(s);
  if (key === "az") { if (o.lock) o.az = (((o.az + delta) % 4) + 4) % 4; return o; } // le périscope ne tourne que verrouillé
  if (key === "tilt") { if (o.lock) o.tilt = Math.max(-1, Math.min(1, o.tilt + delta)); return o; }
  if (o.lock) return o; // verrouillé : le réglage est tenu
  const slot = /^cry([0-3])$/.exec(key || "");
  if (slot) { const i = +slot[1], n = Math.max(1, nOptions); o.cry[i] = (((o.cry[i] + delta) % n) + n) % n; return o; }
  if (key === "pol") o.pol = -o.pol;
  else if (key === "phase") o.phase = ((o.phase + delta * 0.5) % TURN + TURN) % TURN;
  else if (key in o) o[key] = Math.round(clamp(o[key] + delta, 0, MAX));
  return o;
}

/** Poser une commande à une valeur (un curseur sur son rail, l'iris sur son arc). */
function set(s, key, value) {
  const o = normalize(s); if (o.lock) return o;
  if (key === "tilt") return o;
  if (key in o && typeof o[key] === "number" && key !== "pol" && key !== "az") o[key] = key === "phase" ? ((Math.round(value * 2) / 2) % TURN + TURN) % TURN : Math.round(clamp(value, 0, MAX));
  return o;
}

/**
 * Indices pour les notes de l'arpenteur (onglet Détails) et le journal : ce que le ciel « chante », sans chiffres,
 * plus les trois valeurs fixes en clair (elles s'affichent en chiffres D'ni). La phase n'y est pas : elle dérive.
 */
function hints(t, lang = "en") {
  const fr = lang === "fr";
  const pitch = t.freq <= 6 ? (fr ? "très grave et très lent" : "very low and slow") : t.freq <= 10 ? (fr ? "grave" : "low") : t.freq <= 14 ? (fr ? "d'une voix moyenne" : "in a middle voice") : t.freq <= 19 ? (fr ? "aigu" : "high") : fr ? "très aigu, presque un sifflement" : "very high, almost a whistle";
  const loud = t.amp <= 4 ? (fr ? "à peine" : "barely") : t.amp <= 10 ? (fr ? "doucement" : "softly") : t.amp <= 15 ? (fr ? "clairement" : "clearly") : fr ? "à pleine voix" : "at full voice";
  const over = t.harm >= 12 ? (fr ? "et l'aurore chante par-dessus, en trois voix" : "and the aurora sings over it, in threes") : t.harm >= 5 ? (fr ? "avec une seconde voix ténue" : "with a faint second voice") : fr ? "d'une seule note nue" : "in a single bare note";
  const pole = t.pol > 0 ? (fr ? "le nord est au-dessus" : "north lies above") : fr ? "le nord est sous les pieds" : "north lies underfoot";
  const L = t.lens, warm = L ? L.r - L.b : 0, light = !L ? "" : L.r + L.g + L.b < 20 ? (fr ? "presque sans lumière" : "almost without light") : warm >= 14 ? (fr ? "rouge comme des braises" : "red as embers") : warm >= 6 ? (fr ? "orangée" : "orange") : warm >= 2 ? (fr ? "d'un blanc chaud" : "warm white") : warm > -4 ? (fr ? "blanche" : "white") : fr ? "d'un blanc bleuté" : "blue-white";
  const glare = !L ? "" : L.iris <= 6 ? (fr ? "et elle éblouit" : "and it dazzles") : L.iris >= 18 ? (fr ? "et elle est faible" : "and it is faint") : fr ? "et elle est franche" : "and it is plain";
  return {
    lightLine: L ? (fr ? `La lumière de son étoile est ${light}, ${glare}.` : `Its star's light is ${light}, ${glare}.`) : "",
    lensValues: L ? { r: L.r, g: L.g, b: L.b, iris: L.iris } : null,
    line: fr ? `Le ciel de cet Âge bourdonne ${pitch}, ${loud}, ${over} ; ${pole}.` : `The sky of this Age hums ${pitch}, ${loud}, ${over}; ${pole}.`,
    values: { freq: t.freq, amp: t.amp, harm: t.harm, pol: t.pol },
  };
}

module.exports = { MAX, TURN, START, DECOYS, LOCK_AT, effective, canLock, toggleLock, place, set, targetsOf, lensOf, crystalsOf, phaseAt, phaseGap, sharpness, lensScore, crystalScore, clarity, beatsOf, normalize, turn, hints };
