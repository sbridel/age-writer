"use strict";
/**
 * Le télescope du Relto (étape 1) : le Great Zero caché et le signal « chaud / froid ».
 *
 * Système de coordonnées du Great Zero (GZCS, celui du KI) :
 *  - Torahn (aussi écrit Toran) : l'angle, compté dans le sens horaire depuis la ligne d'origine du Great Zero, en
 *    torantee (singulier torant) ; un tour = 62 500 torantee ;
 *  - Distance : distance horizontale au centre du cylindre du Great Zero, en shahfeetee (singulier shahfee) ;
 *  - Élévation : distance verticale au plan de référence du Great Zero, en shahfeetee. Le KI affiche NÉGATIVES les
 *    valeurs au-dessus du plan (`kiElev`) ; ici, `elevation` / `elev` gardent la hauteur vraie (au-dessus = positif).
 * Le télescope vise en Torahn et en Élévation ; la distance est tirée elle aussi. L'étape 2 (situer le système d'étoile d'un
 * Âge) est dans src/starsystem.js.
 *
 * Chaque Relto a son Great Zero, tiré de son nom et de sa graine : reproductible, rien n'est stocké ; seul le fait de
 * l'avoir trouvé (et la visée du joueur) est gardé, par Relto (`keyOf`). Aucune coordonnée terrestre ici.
 *
 * Molettes : un cran fin (moyeu) = 100 torantee ou 1 shahfee ; la couronne avance de 25 crans (2 500 torantee,
 * 25 shahfeetee). Un tour = 625 crans. L'élévation visée va de −124 à +124 shahfeetee (hauteur vraie).
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/telescope.test.js. Le dessin est dans src/relto-telescope.js.
 */
const { rng, fnv } = require("./util");

const TURN = 62500;        // un tour de Torahn, en torantee
const NOTCH = 100;         // un cran fin de Torahn, en torantee (625 crans par tour)
const STEP = { torahn: { hub: NOTCH, rim: 25 * NOTCH }, elev: { hub: 1, rim: 25 } }; // ce dont avancent moyeu et couronne
const ELEV_MAX = 124;      // butée de l'élévation visée, en shahfeetee (de −124 à +124)
const ZERO_ELEV = 100;     // le Zéro caché reste entre −100 et +100 shahfeetee : jamais contre une butée
const DIST_MAX = 15624;    // distance tirée de 1 à 15 624 shahfeetee (trois chiffres D'ni) — étape 2
const TOL = { torahn: 2 * NOTCH, elev: 2 }; // trouvé : à 200 torantee et 2 shahfeetee près (deux crans fins sur chaque axe)
const BROAD = 120, SHARP = 12; // portées du signal, en crans : une pente large (de loin) et un pic étroit (de près)
/**
 * Seuils du signal (0 à 1) entre les paliers de mots : vide, faible, lointain, proche, tout près, au bord. En écart
 * (crans), à peu près : au-delà de 220, 220–62, 62–22, 22–9, 9–3,5, puis le bord de l'anneau.
 */
const BANDS = [0.08, 0.3, 0.5, 0.7, 0.86];

const int = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };
const mod = (v, m) => ((v % m) + m) % m;
const clampE = (v) => Math.max(-ELEV_MAX, Math.min(ELEV_MAX, v)) || 0; // || 0 : jamais de −0
/** Nom d'axe : « torahn » (ou « toran », l'autre graphie), « elev » (ou « elevation »). */
const axisOf = (a) => { const s = String(a || "").toLowerCase(); return s === "torahn" || s === "toran" ? "torahn" : s === "elev" || s === "elevation" ? "elev" : null; };

/** Identité d'un Relto pour le télescope : nom (insensible à la casse) + graine. Changer l'un ou l'autre déplace le Zéro. */
function keyOf(name, seed) { return `${String(name == null || name === "" ? "Relto" : name).trim().toLowerCase()}#${int(seed) >>> 0}`; }

/**
 * Le Great Zero d'un Relto : { torahn (torantee, 0–62 499), elevation (shahfeetee, hauteur vraie, −100–100), distance
 * (shahfeetee, 1–15 624) }. Même nom + même graine = même Zéro.
 */
function greatZero(name, seed) {
  const r = rng((fnv(keyOf(name, seed)) ^ 0x5eed2e70) >>> 0); r(); r();
  const notch = Math.floor(r() * (TURN / NOTCH)) % (TURN / NOTCH);
  const elevation = Math.round((r() * 2 - 1) * ZERO_ELEV) || 0;
  const distance = 1 + Math.floor(r() * DIST_MAX);
  const torahn = notch * NOTCH + Math.floor(r() * NOTCH); // le Zéro tombe entre deux crans : on l'encadre, on ne le touche pas
  return { torahn, elevation, distance };
}

/** Élévation telle que le KI l'affiche : au-dessus du plan, le chiffre est négatif. */
function kiElev(e) { return -int(e) || 0; }

/** Une visée valide (Torahn sur un tour, élévation dans ses butées) ; `toran` est lu comme `torahn`. Absente ou abîmée : origine, plan zéro. */
function normAim(a) {
  const o = a && typeof a === "object" ? a : {};
  return { torahn: mod(int(o.torahn != null ? o.torahn : o.toran), TURN), elev: clampE(int(o.elev)) };
}

/** Tourner une molette : `axis` Torahn (fait le tour, sens horaire = positif) ou élévation (butées), de `delta` torantee / shahfeetee. */
function turn(aim, axis, delta) {
  const a = normAim(aim), d = int(delta), ax = axisOf(axis);
  if (ax === "torahn") return { ...a, torahn: mod(a.torahn + d, TURN) };
  if (ax === "elev") return { ...a, elev: clampE(a.elev + d) };
  return a;
}

/** Écart signé de la visée au Zéro (Zéro − visée) : `dt` en torantee, au plus court sur le cercle ; `de` en shahfeetee. */
function gap(aim, zero) {
  const a = normAim(aim), zt = zero.torahn != null ? zero.torahn : zero.toran;
  let dt = mod(zt - a.torahn, TURN); if (dt > TURN / 2) dt -= TURN;
  return { dt, de: zero.elevation - a.elev };
}

/**
 * Le signal du Zéro dans le télescope : `s` de 0 (rien que le souffle du vide) à 1 (en plein dessus). Il ne dépend que de
 * l'écart `d` (en crans fins) et décroît strictement avec lui : une pente large, perceptible de loin, et un pic étroit qui
 * se précise dans les derniers crans. `band` : le palier de mots (0 à 5) ; `found` : dans la tolérance sur chaque axe.
 */
function signal(aim, zero) {
  const { dt, de } = gap(aim, zero), d = Math.hypot(dt / NOTCH, de / STEP.elev.hub), s = level(d);
  return { dt, de, d, s, band: bandOf(s), found: Math.abs(dt) <= TOL.torahn && Math.abs(de) <= TOL.elev };
}
/** La force du signal pour un écart `d` (en crans fins) : une pente large et un pic étroit (aussi pour l'étape 2, src/starsystem.js). */
function level(d) { return 0.5 * Math.exp(-d / BROAD) + 0.5 * Math.exp(-d / SHARP); }
/** Le palier de mots (0 à 5) d'un signal `s`. */
function bandOf(s) { let band = 0; while (band < BANDS.length && s >= BANDS[band]) band++; return band; }

/**
 * Ce que l'œil perçoit du signal à un battement donné (`beat` : le numéro du prorahn) : le vrai signal, troublé par une
 * scintillation qui change à chaque battement. Loin, elle est forte (un seul geste ne dit pas si l'on chauffe : il faut
 * regarder plusieurs battements) ; près, elle s'apaise. Même battement, même visée : même perception (reproductible).
 * `s` et `band` sont perçus ; `found` reste exact (l'anneau ne ment pas).
 */
const SCINT = { floor: 0.03, rel: 0.12, far: 0.3, easy: 0.2 }; // amplitude : un plancher, plus une part du signal, plus forte de loin ; `easy` : facteur du mode facile
/** `scale` : 1 pour l'Art de la Guilde ; `SCINT.easy` (bien plus faible) pour le mode facile (src/instruments.js). */
function observe(sig, beat, salt = 0, scale = 1) {
  const r = rng((fnv(`${beat | 0}:${Math.round(sig.d * 10)}`) ^ (salt >>> 0) ^ 0x7e1e5c09) >>> 0); r();
  const amp = (SCINT.floor + sig.s * (SCINT.rel + SCINT.far * (1 - sig.s))) * (Number.isFinite(scale) ? Math.max(0, scale) : 1), s = Math.max(0, Math.min(1, sig.s + amp * (r() * 2 - 1)));
  let band = 0; while (band < BANDS.length && s >= BANDS[band]) band++;
  if (!sig.found) band = Math.min(band, BANDS.length - 1); // le bord de l'anneau ne se voit que dans l'anneau
  return { ...sig, s: sig.found ? Math.max(s, sig.s) : s, band: sig.found ? sig.band : band };
}

/**
 * Un battement du pouls (`beat` : le numéro du prorahn), pour l'œil et pour l'oreille à la fois : loin, il en saute
 * souvent un et faiblit au hasard ; près, il bat sans faute. `skip` : battement manqué ; `amp` : sa force (0 à 1).
 */
function pulseOf(s, beat) {
  const n = rng(((beat | 0) ^ 0x2e70) >>> 0), jit = 1 - Math.max(0, Math.min(1, s));
  const skip = n() < jit * 0.55;
  return { skip, amp: skip ? 0.15 : 1 - jit * 0.6 * n() };
}

/**
 * Ce qu'on garde (par Relto) : la visée et, une fois trouvé, le Zéro reste trouvé (avec la visée du moment, `at`).
 * Étape 2 (src/starsystem.js) : `dial`, les molettes réglées sur les indices d'un Âge, et `systems`, les systèmes
 * d'étoiles situés (par clé d'étoile). Un état de l'étape 1 (sans ces champs) se relit tel quel.
 */
function saved(st) {
  const sys = st.systems && typeof st.systems === "object" && Object.keys(st.systems).length ? st.systems : null;
  return { torahn: st.aim.torahn, elev: st.aim.elev, found: !!st.found, ...(st.found && st.at ? { at: { torahn: st.at.torahn, elev: st.at.elev } } : {}),
    ...(st.dial ? { dial: { torahn: st.dial.torahn, elev: st.dial.elev, delay: st.dial.delay } } : {}), ...(sys ? { systems: JSON.parse(JSON.stringify(sys)) } : {}) };
}

module.exports = { TURN, NOTCH, STEP, ELEV_MAX, ZERO_ELEV, DIST_MAX, TOL, BANDS, SCINT, observe, pulseOf, axisOf, keyOf, greatZero, kiElev, normAim, turn, gap, signal, level, bandOf, saved, mod };
