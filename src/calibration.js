"use strict";
/**
 * Calibration d'un Âge (étape 2) : une fois son système d'étoile situé au télescope (src/starsystem.js), l'Imageur gagne une
 * molette de SYNCHRO (un micromètre) qui trouve la PLANÈTE dans ce système : sa place sur son orbite. Une fois synchronisé :
 *   - l'image est plus nette (un bonus : sans calibration, l'Imageur marche exactement comme avant) ;
 *   - l'HEURE LOCALE de l'Âge est connue (« là-bas, c'est l'aube », et en chiffres D'ni) : le temps se gagne en se situant ;
 *   - ses coordonnées KIPS s'affichent, comme sur un KI.
 * La calibration DÉRIVE : intacte sept jours réels, puis elle se dégrade peu à peu jusqu'au quatorzième jour (l'image
 * s'adoucit, l'heure redevient incertaine, la lecture du micromètre s'écarte). Resynchroniser la rend neuve.
 *
 * Le micromètre se lit de 0 à 24,5 par demi-crans (un tour = une orbite), comme la phase de l'Imageur. La planète avance
 * sur son orbite au rythme de son année : la physique (`w.periodDays`, en jours réels), ou `year_length` × `day_length`
 * si l'Âge les écrit (le même temps que sa fenêtre générative).
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/starsystem.test.js.
 */
const { fnv, clamp } = require("./util");
const WX = require("./weather");
const { makeT } = require("./i18n");

const TURN = 25;                  // un tour de micromètre = une orbite
const SYNC_TOL = 0.5;             // synchronisé : à un demi-cran près
const DAY = 86400000, H = 3600000;
const DRIFT_START = 7 * DAY;      // intacte une semaine réelle…
const DRIFT_FULL = 14 * DAY;      // …puis perdue peu à peu, tout à fait au bout de deux
const CERTAIN_AT = 0.5;           // en dessous, l'heure locale redevient incertaine

const wrap = (v) => ((v % TURN) + TURN) % TURN;
const half = (v) => wrap(Math.round(v * 2) / 2);
/** Écart signé sur le cercle du micromètre (b − a), de −12,5 à 12,5. */
function diff(a, b) { let d = wrap(b - a); if (d > TURN / 2) d -= TURN; return d; }

/**
 * L'orbite et le jour d'un Âge : { phase0, periodMs, dayMs, err } (ms réelles). `sky` : SKY.parseSky(src) (day_length,
 * year_length), facultatif. `name` : nom de la note (la graine).
 */
function orbitOf(analysis, name = "", sky = null) {
  const w = analysis && analysis.physics && analysis.physics.w;
  let dayMs = w && Number.isFinite(w.rotation) && w.rotation > 0 ? w.rotation * H : 24 * H;
  let periodMs = w && Number.isFinite(w.periodDays) && w.periodDays > 0 ? w.periodDays * DAY : 365 * DAY;
  if (sky && sky.dayLen > 0) { dayMs = sky.dayLen * 60000; if (sky.yearLen > 0) periodMs = sky.yearLen * dayMs; }
  const e = fnv(name + "|calibration-derive");
  return { phase0: (fnv(name + "|orbite") % 1000) / 1000 * TURN, periodMs: Math.max(periodMs, H), dayMs: Math.max(dayMs, 12000), err: (e % 2 ? 1 : -1) * (2 + (e % 1000) / 500) };
}

/** Où est la planète sur son orbite à l'instant `now` (0 à 25). */
function orbitAt(o, now = Date.now()) { return wrap(o.phase0 + (now / o.periodMs) * TURN); }

/** Qualité de la calibration (0 à 1) selon le temps écoulé depuis la synchro `at` : 1 sept jours, puis elle décroît jusqu'à 0. */
function quality(at, now = Date.now()) {
  if (!Number.isFinite(at)) return 0;
  const age = now - at; if (age < 0) return 1;
  return age <= DRIFT_START ? 1 : clamp(1 - (age - DRIFT_START) / (DRIFT_FULL - DRIFT_START), 0, 1);
}

/** Le réglage du micromètre dans les réglages de l'Imageur : { sync, syncAt } (absents des anciens réglages : non synchronisé). */
function syncOf(s) { const o = s || {}; return { sync: half(Number.isFinite(+o.sync) ? +o.sync : 12), at: Number.isFinite(+o.syncAt) && o.syncAt != null ? +o.syncAt : null }; }

/**
 * Ce que lit le micromètre : synchronisé, l'instrument suit la planète seul (comme le verrou suit la phase) ; la dérive l'en
 * écarte peu à peu. Non synchronisé : la position où le joueur l'a laissé.
 */
function reading(s, o, now = Date.now()) {
  const c = syncOf(s); if (c.at == null || !o) return c.sync;
  return half(orbitAt(o, now) + (1 - quality(c.at, now)) * o.err);
}

/**
 * État complet : `located` (le système de l'Âge est situé au télescope) ; `q` qualité (0 sans calibration) ; `synced`
 * (q > 0) ; `certain` (l'heure locale est sûre) ; `gap` (écart du micromètre à la planète, en crans).
 */
function state(s, o, located, now = Date.now()) {
  const c = syncOf(s), q = located && c.at != null ? quality(c.at, now) : 0, r = o ? reading(s, o, now) : c.sync;
  return { located: !!located, q, synced: q > 0, certain: q >= CERTAIN_AT, reading: r, gap: o ? diff(r, orbitAt(o, now)) : 0, at: c.at };
}

/**
 * Tourner le micromètre de `delta` demi-crans (ou le poser sur `value`). Sans système situé, il ne tourne pas (il n'est
 * même pas là). Arrivé à un demi-cran de la planète : synchronisé (`syncAt` = maintenant) ; écarté : la synchro est perdue.
 * Renvoie les réglages de l'Imageur mis à jour (les autres champs ne bougent pas) et `synced`.
 */
function turnSync(s, delta, o, located, now = Date.now(), value = null) {
  const base = s || {}; if (!located || !o) return { s: base, synced: false, moved: false };
  const v = value != null ? half(value) : half(reading(base, o, now) + delta * 0.5), ok = Math.abs(diff(orbitAt(o, now), v)) <= SYNC_TOL;
  return { s: { ...base, sync: v, syncAt: ok ? now : null }, synced: ok, moved: true };
}

/** Le moment du jour là-bas (aube, matin… comme la météo vivante), en fraction du jour de l'Âge. */
function dayPhase(o, now = Date.now()) { const p = (now / o.dayMs) % 1; return p < 0 ? p + 1 : p; }

/**
 * L'heure locale de l'Âge, telle qu'on peut la dire : `known` (calibré), `certain` (calibration fraîche) ; `slot` (le moment
 * du jour, mêmes moments que la météo vivante et le soleil de la fenêtre) ; `gahr` (0 à 4) et `tahvo` (0 à 24) : le jour de
 * l'Âge divisé comme un yahr D'ni, en chiffres D'ni.
 */
function localTime(o, st, now = Date.now()) {
  if (!o || !st || !st.synced) return { known: false, certain: false };
  const p = dayPhase(o, now), u = Math.floor(p * 125);
  return { known: true, certain: st.certain, phase: p, slot: WX.slotOf(p), gahr: Math.floor(u / 25), tahvo: u % 25 };
}

/** La phrase de l'heure locale (Détails, Imageur). */
function timeWords(lt, lang = "en") {
  const t = makeT(() => (lang === "fr" ? "fr" : "en"));
  if (!lt || !lt.known) return t("cal.time.unknown");
  const slot = { dawn: t("cal.slot.dawn"), morning: t("cal.slot.morning"), noon: t("cal.slot.noon"), afternoon: t("cal.slot.afternoon"), dusk: t("cal.slot.dusk"), night: t("cal.slot.night") }[lt.slot];
  return lt.certain ? t("cal.time.certain", { slot }) : t("cal.time.drift", { slot });
}

/**
 * La netteté vue à l'écran avec la calibration : un bonus qui comble une part de ce qui manque, d'autant plus que le réglage
 * est déjà bon (une image brouillée le reste : la calibration aiguise, elle ne règle pas à ta place ; rien sans calibration).
 */
function boost(k, q) { const x = clamp(k, 0, 1); return x + (1 - x) * x * clamp(q, 0, 1); }

module.exports = { TURN, SYNC_TOL, DRIFT_START, DRIFT_FULL, CERTAIN_AT, diff, orbitOf, orbitAt, quality, syncOf, reading, state, turnSync, dayPhase, localTime, timeWords, boost };
