"use strict";
/**
 * Le télescope du Relto (étape 1) : le Great Zero caché et le signal « chaud / froid ».
 *
 * Trois axes (vocabulaire du lore) : Toran (direction, angle autour de l'axe central), Élévation (hauteur par rapport au
 * plan zéro), Distance (en parsecs depuis le Great Zero). Le télescope vise en Toran et en Élévation ; la distance est
 * tirée elle aussi (pour l'étape 2 : le retard des impulsions), mais il ne la mesure pas encore.
 *
 * Chaque Relto a son Great Zero, tiré de son nom et de sa graine : reproductible, rien n'est stocké ; seul le fait de
 * l'avoir trouvé (et la visée du joueur) est gardé, par Relto (`keyOf`). Aucune coordonnée terrestre ici.
 *
 * Unités (base 25, comme les chiffres D'ni) : un tour de Toran = 625 crans = deux chiffres D'ni (la couronne avance d'un
 * chiffre, le moyeu d'un cran). L'élévation va de −124 à +124 : un signe, puis deux chiffres (le premier de 0 à 4).
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/telescope.test.js. Le dessin est dans src/relto-telescope.js.
 */
const { rng, fnv } = require("./util");

const TURN = 625;          // un tour de Toran
const COARSE = 25;         // un chiffre D'ni : ce dont avance la couronne d'une molette
const ELEV_MAX = 124;      // butée de l'élévation (de −124 à +124)
const ZERO_ELEV = 100;     // le Zéro caché reste entre −100 et +100 : jamais contre une butée
const DIST_MAX = 624;      // distance tirée de 1 à 624 parsecs (deux chiffres D'ni) — étape 2
const TOL = 2;             // trouvé : à deux crans fins près, sur chaque axe
const BROAD = 120, SHARP = 12; // portées du signal : une pente large (de loin) et un pic étroit (de près)
/**
 * Seuils du signal (0 à 1) entre les paliers de mots : vide, faible, lointain, proche, tout près, au bord. En écart
 * angulaire (crans), à peu près : au-delà de 220, 220–62, 62–22, 22–9, 9–3,5, puis le bord de l'anneau.
 */
const BANDS = [0.08, 0.3, 0.5, 0.7, 0.86];

const int = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };
const mod = (v, m) => ((v % m) + m) % m;
const clampE = (v) => Math.max(-ELEV_MAX, Math.min(ELEV_MAX, v)) || 0; // || 0 : jamais de −0

/** Identité d'un Relto pour le télescope : nom (insensible à la casse) + graine. Changer l'un ou l'autre déplace le Zéro. */
function keyOf(name, seed) { return `${String(name == null || name === "" ? "Relto" : name).trim().toLowerCase()}#${int(seed) >>> 0}`; }

/** Le Great Zero d'un Relto : { toran (0–624), elevation (−100–100), distance (1–624) }. Même nom + même graine = même Zéro. */
function greatZero(name, seed) {
  const r = rng((fnv(keyOf(name, seed)) ^ 0x5eed2e70) >>> 0); r(); r();
  const toran = Math.floor(r() * TURN) % TURN;
  const elevation = Math.round((r() * 2 - 1) * ZERO_ELEV) || 0;
  const distance = 1 + Math.floor(r() * DIST_MAX);
  return { toran, elevation, distance };
}

/** Une visée valide (entiers, Toran sur un tour, élévation dans ses butées) ; absente ou abîmée : plein nord, à l'horizon. */
function normAim(a) {
  const o = a && typeof a === "object" ? a : {};
  return { toran: mod(int(o.toran), TURN), elev: clampE(int(o.elev)) };
}

/** Tourner une molette : `axis` « toran » (fait le tour) ou « elev » (s'arrête aux butées), de `delta` crans. */
function turn(aim, axis, delta) {
  const a = normAim(aim), d = int(delta);
  if (axis === "toran") return { ...a, toran: mod(a.toran + d, TURN) };
  if (axis === "elev") return { ...a, elev: clampE(a.elev + d) };
  return a;
}

/** Écart signé de la visée au Zéro (Zéro − visée) : `dt` au plus court sur le cercle (−312 à 312), `de` en élévation. */
function gap(aim, zero) {
  const a = normAim(aim);
  let dt = mod(zero.toran - a.toran, TURN); if (dt > TURN / 2) dt -= TURN;
  return { dt, de: zero.elevation - a.elev };
}

/**
 * Le signal du Zéro dans le télescope : `s` de 0 (rien que le souffle du vide) à 1 (en plein dessus). Il ne dépend que de
 * l'écart angulaire `d` et décroît strictement avec lui : une pente large, perceptible de loin, et un pic étroit qui se
 * précise dans les derniers crans. `band` : le palier de mots (0 à 5) ; `found` : à TOL crans près sur chaque axe.
 */
function signal(aim, zero) {
  const { dt, de } = gap(aim, zero), d = Math.hypot(dt, de);
  const s = 0.5 * Math.exp(-d / BROAD) + 0.5 * Math.exp(-d / SHARP);
  let band = 0; while (band < BANDS.length && s >= BANDS[band]) band++;
  return { dt, de, d, s, band, found: Math.abs(dt) <= TOL && Math.abs(de) <= TOL };
}

/** Une valeur en chiffres D'ni : signe et deux chiffres (Toran : 0–24, 0–24 ; élévation : 0–4, 0–24). */
function digits(v) { const n = Math.abs(int(v)); return { neg: int(v) < 0, hi: Math.floor(n / COARSE), lo: n % COARSE }; }

/** Ce qu'on garde (par Relto) : la visée et, une fois trouvé, le Zéro reste trouvé (avec la visée du moment, `at`, pour l'étape 2). */
function saved(st) { return { toran: st.aim.toran, elev: st.aim.elev, found: !!st.found, ...(st.found && st.at ? { at: { toran: st.at.toran, elev: st.at.elev } } : {}) }; }

module.exports = { TURN, COARSE, ELEV_MAX, ZERO_ELEV, TOL, BANDS, keyOf, greatZero, normAim, turn, gap, signal, digits, saved };
