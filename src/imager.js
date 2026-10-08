"use strict";
/**
 * L'Imageur du Relto (1.17) — étape 1 : la synchronisation atmosphérique.
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
  return { freq, amp, harm, pol, phase0, drift, erratic: cycle === "erratic", hours, P, field, auroras, name };
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

/** Battements entendus : ce qu'on perçoit de l'écart de fréquence (clé i18n). */
function beatsOf(s, t, now = Date.now()) {
  if (s.pol !== t.pol) return "opposed";
  const df = Math.abs(s.freq - t.freq);
  if (df === 0) return phaseGap(s.phase, phaseAt(t, now)) < 0.06 ? "unison" : "slow";
  return df < 3 ? "slow" : df < 7 ? "fast" : "hiss";
}

/** Réglage de départ : au milieu, polarité « + ». */
const START = Object.freeze({ pol: 1, freq: 12, amp: 12, harm: 6, phase: 0 });
function normalize(s) {
  const o = { ...START, ...(s || {}) };
  return { pol: o.pol < 0 ? -1 : 1, freq: Math.round(clamp(+o.freq || 0, 0, MAX)), amp: Math.round(clamp(+o.amp || 0, 0, MAX)), harm: Math.round(clamp(+o.harm || 0, 0, MAX)), phase: ((Math.round((+o.phase || 0) * 2) / 2) % TURN + TURN) % TURN };
}
/** Tourner une commande : `key` (freq, amp, harm, phase) de `delta` crans ; la polarité bascule. */
function turn(s, key, delta) {
  const o = normalize(s);
  if (key === "pol") o.pol = -o.pol;
  else if (key === "phase") o.phase = ((o.phase + delta * 0.5) % TURN + TURN) % TURN;
  else if (key in o) o[key] = Math.round(clamp(o[key] + delta, 0, MAX));
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
  return {
    line: fr ? `Le ciel de cet Âge bourdonne ${pitch}, ${loud}, ${over} ; ${pole}.` : `The sky of this Age hums ${pitch}, ${loud}, ${over}; ${pole}.`,
    values: { freq: t.freq, amp: t.amp, harm: t.harm, pol: t.pol },
  };
}

module.exports = { MAX, TURN, START, targetsOf, phaseAt, phaseGap, sharpness, beatsOf, normalize, turn, hints };
