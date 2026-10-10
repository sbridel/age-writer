"use strict";
/**
 * Télescope, étape 2 : situer le SYSTÈME D'ÉTOILE d'un Âge par rapport au Great Zero.
 *
 * Deux échelles (décision du 10 oct.) : le télescope situe l'étoile de l'Âge (ce module) ; l'Imageur trouve ensuite la
 * planète dans son système (src/calibration.js).
 *
 * Position GZCS de l'étoile : tirée de sa CLÉ D'ÉTOILE (`starKey`) : les blocs d'étoile de l'Âge (nombre d'étoiles,
 * couleurs, orbite binaire) + une graine d'étoile. La graine d'étoile est la ligne `system: Kerath` si l'Âge en a une,
 * sinon le nom de la note et sa ligne `seed:` (chaque Âge a alors sa propre étoile). Deux Âges qui écrivent la même étoile
 * et le même `system:` partagent un système : ils sont situés ensemble. Changer l'étoile change le système (réécrire
 * déplace le monde).
 *
 * Conventions (celles de l'étape 1) : le télescope vise OÙ APPARAÎT le Great Zero vu de l'observateur. Torahn en
 * torantee (sens horaire, 62 500 au tour), hauteur vraie en shahfeetee (au-dessus = positif ; le KI l'affiche négative),
 * distance horizontale en shahfeetee. Le Zéro d'un Relto (`T.greatZero`) est donc le vecteur Relto → Zéro.
 *   - Le système est en S (coordonnées GZCS de l'étoile) ; vu de l'Âge, le Zéro est en −S : son Torahn est celui de S plus
 *     un demi-tour, sa hauteur −z, et son pouls arrive en retard de |S| (le RETARD, en crans de 25 shahfeetee de trajet).
 *   - Le joueur reporte ces indices sur les molettes (visée + molette du retard) ; l'instrument calcule lui-même
 *     (Relto → Zéro) − (Âge → Zéro) = S − R, la position du système vue du Relto, et S, sa position GZCS.
 *
 * Étape 3 (pas ici) : `sources()` rend une liste de sources de signal avec leur période (le Zéro bat au prorahn) ; les
 * perturbateurs (pulsar, étoile à neutrons, trou noir) s'y ajouteront. `lineOffset` (0 par défaut) décale la ligne
 * d'origine perçue : la fausse ligne de Me'erta.
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/starsystem.test.js. Le dessin est dans src/relto-telescope.js.
 */
const { rng, fnv } = require("./util");
const T = require("./telescope");
const { makeT } = require("./i18n");

const DELAY_UNIT = 25;     // un cran de la molette du retard = 25 shahfeetee de trajet du pouls
const DELAY_MAX = 624;     // la molette du retard va de 0 à 624 crans (deux chiffres D'ni)
const STEP_DELAY = { hub: 1, rim: 25 };
const TOL = { torahn: T.TOL.torahn, elev: T.TOL.elev, delay: 1 }; // situé : à 200 torantee, 2 shahfeetee et 1 cran de retard près
const SYS_ELEV = 100;      // hauteur de l'étoile : de −100 à +100 shahfeetee (vue de l'Âge, le Zéro reste dans les butées du télescope)
const SYS_DIST = [200, 15000]; // distance horizontale de l'étoile au Zéro, en shahfeetee
/** Blocs du ciel qui disent l'étoile : combien, quelle couleur, quelle orbite binaire (la lune n'en est pas). */
const STAR_CATS = new Set(["stars", "hue"]), STAR_EXTRA = new Set(["close_binary_orbit", "wide_binary_orbit"]), NOT_STAR = new Set(["companion_moon"]);
/** `system: Kerath` (ou `star_system:`, `système:`) : la graine d'étoile partagée. */
const SYSTEM_RE = /^\s*(?:star[ _]?system|system|syst[eè]me)\s*[:=]\s*(.+?)\s*$/i;

const mod = T.mod, TAU = Math.PI * 2;
const int = (v, d = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : d; };

/** La ligne `system:` d'un bloc `age` (minuscules, espaces réduits), ou null. */
function parseSystem(src) {
  for (const line of String(src || "").split("\n")) { const m = line.match(SYSTEM_RE); if (m && m[1].trim()) return m[1].trim().toLowerCase().replace(/\s+/g, " "); }
  return null;
}

/** Les blocs d'étoile d'une analyse (écrits ou tirés : c'est le ciel réel de l'Âge), triés. */
function starIds(analysis) {
  const ids = new Set(), lines = (analysis && analysis.resolved && analysis.resolved.lines) || [];
  for (const l of lines) { const e = l.entry; if (!e || NOT_STAR.has(e.id)) continue; if (STAR_CATS.has(e.category) || STAR_EXTRA.has(e.id)) ids.add(e.id); }
  return [...ids].sort();
}

/**
 * La clé d'étoile d'un Âge : `blocs@graine`. `name` = nom de la note ; la graine d'étoile est la ligne `system:`, sinon
 * le nom et la ligne `seed:` (la même graine que le tirage des pages).
 */
function starKey(analysis, src, name) {
  const ids = starIds(analysis), sys = parseSystem(src);
  const seedLine = analysis && analysis.resolved && analysis.resolved.seed != null ? analysis.resolved.seed : "";
  return `${ids.length ? ids.join("+") : "single_sun"}@${sys != null ? "sys:" + sys : String(name || "").trim().toLowerCase() + "#" + seedLine}`;
}

/** La position GZCS du système d'une clé d'étoile : { torahn, distance, elevation } (entiers). Même clé, même position. */
function position(key) {
  const r = rng((fnv("etoile|" + key) ^ 0x57a25e7) >>> 0); r(); r();
  const torahn = Math.floor(r() * (T.TURN / T.NOTCH)) * T.NOTCH + Math.floor(r() * T.NOTCH);
  const elevation = Math.round((r() * 2 - 1) * SYS_ELEV) || 0;
  const distance = Math.round(SYS_DIST[0] * Math.exp(r() * Math.log(SYS_DIST[1] / SYS_DIST[0]))); // log-uniforme : des voisins et des lointains
  return { torahn: mod(torahn, T.TURN), distance, elevation };
}

/** Du cylindre GZCS au repère cartésien (x vers le quart de tour, y le long de la ligne du Zéro, z la hauteur). */
function cart(p) { const a = (TAU * p.torahn) / T.TURN, d = p.distance || 0; return { x: d * Math.sin(a), y: d * Math.cos(a), z: p.elevation || 0 }; }
function cyl(v) { return { torahn: mod(Math.round((Math.atan2(v.x, v.y) / TAU) * T.TURN), T.TURN), distance: Math.round(Math.hypot(v.x, v.y)), elevation: Math.round(v.z) || 0 }; }
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const neg = (a) => ({ x: -a.x, y: -a.y, z: -a.z });

/** Le retard du pouls pour une position (en crans de la molette) : la longueur du trajet, sur 25 shahfeetee. */
function delayOf(p) { return Math.max(0, Math.min(DELAY_MAX, Math.round(Math.hypot(p.distance || 0, p.elevation || 0) / DELAY_UNIT))); }
/** L'éclat du pouls (0 à 1) : il pâlit avec la distance (le carré). */
function strengthOf(delay) { return 1 / (1 + Math.pow(delay / 150, 2)); }

/**
 * Le Great Zero vu depuis le système en `pos` : Torahn (où il apparaît), hauteur, retard, éclat. `lineOffset` (étape 3,
 * 0 par défaut) : la ligne d'origine perçue est décalée d'autant de torantee (fausse ligne).
 */
function zeroSeenFrom(pos, { lineOffset = 0 } = {}) {
  const delay = delayOf(pos);
  return { torahn: mod(pos.torahn + T.TURN / 2 + int(lineOffset), T.TURN), elevation: -(pos.elevation || 0) || 0, delay, strength: strengthOf(delay) };
}

/**
 * Les sources de signal perçues depuis le système, chacune avec sa période (en prorahn) : le Great Zero bat au prorahn.
 * Étape 3 : les perturbateurs (`perturbers` : { kind, period, torahn, elevation, delay, strength }) s'ajoutent à la liste.
 */
function sources(pos, { lineOffset = 0, perturbers = [] } = {}) {
  return [{ kind: "zero", period: 1, ...zeroSeenFrom(pos, { lineOffset }) }, ...perturbers.map((p) => ({ period: 1, ...p }))];
}

/** Tout ce qu'il faut d'un Âge : sa clé d'étoile, la position de son système, ce qu'on y perçoit du Zéro. */
function systemOf(analysis, src, name, opts = {}) {
  const key = starKey(analysis, src, name), pos = position(key), src0 = sources(pos, opts);
  return { key, stars: starIds(analysis), shared: parseSystem(src), pos, sources: src0, clue: src0[0] };
}

// ---- la molette du retard et le réglage du joueur ------------------------------------------------------------
/** Le réglage reporté au télescope : { torahn, elev, delay } (visée où le Zéro apparaît vu de l'Âge, et retard). */
function normDial(d) { const a = T.normAim(d), o = d && typeof d === "object" ? d : {}; return { ...a, delay: Math.max(0, Math.min(DELAY_MAX, int(o.delay))) }; }
/** Tourner une molette du réglage : Torahn, élévation (comme à l'étape 1) ou retard (butées 0 et 624). */
function turnDial(dial, axis, delta) {
  const d = normDial(dial);
  if (String(axis).toLowerCase() === "delay") return { ...d, delay: Math.max(0, Math.min(DELAY_MAX, d.delay + int(delta))) };
  return { ...d, ...T.turn(d, axis, delta) };
}

/**
 * Ce que l'oculaire montre du réglage face aux indices : le signal de l'étape 1 (visée contre l'endroit où le Zéro apparaît
 * vu de l'Âge), plus l'écart de retard `dd` (réglage − vrai, en crans). `located` : dans la tolérance sur les trois axes.
 */
function measure(dial, clue) {
  const d = normDial(dial), sig = T.signal(d, { torahn: clue.torahn, elevation: clue.elevation }), dd = d.delay - clue.delay;
  return { ...sig, dd, delayOk: Math.abs(dd) <= TOL.delay, located: sig.found && Math.abs(dd) <= TOL.delay };
}

/**
 * Le décalage de l'écho dans l'oculaire, en fraction de battement : le pouls de l'Âge, corrigé du retard réglé, arrive
 * après (>0, réglage trop court) ou avant (<0, trop long) le battement de référence ; 0 quand le retard est juste.
 * Il s'écarte vite d'abord (quelques crans se voient), puis plafonne sous le demi-battement (jamais d'ambiguïté).
 */
function echoOffset(dd) { const a = Math.abs(dd); return a === 0 ? 0 : -Math.sign(dd) * 0.45 * (1 - Math.exp(-a / 10)); }
/** Le mot de l'écho (0 à 3) : ensemble, presque, en retard, en avance. */
function echoWord(dd) { const a = Math.abs(dd); return a <= TOL.delay ? "one" : a <= 4 ? "near" : dd < 0 ? "late" : "early"; }

/**
 * L'instrument calcule (pas de soustraction à la main) : le vecteur Âge → Zéro tiré du réglage (Torahn, hauteur, retard),
 * le vecteur Relto → Zéro tiré du Zéro trouvé, et leur différence. Renvoie `fromRelto` (le système vu du Relto,
 * cartésien et GZCS) et `gzcs` (sa position par rapport au Zéro). `zero` : T.greatZero du Relto (Relto → Zéro).
 */
function locate(zero, dial) {
  const d = normDial(dial), path = d.delay * DELAY_UNIT, h = d.elev, rho = Math.sqrt(Math.max(0, path * path - h * h));
  const ageToZero = cart({ torahn: d.torahn, distance: rho, elevation: h }), reltoToZero = cart({ torahn: zero.torahn, distance: zero.distance, elevation: zero.elevation });
  const rel = sub(reltoToZero, ageToZero); // (Relto → Zéro) − (Âge → Zéro) = S − R
  return { fromRelto: { ...rel, ...cyl(rel) }, gzcs: cyl(neg(ageToZero)), reltoAt: cyl(neg(reltoToZero)) };
}

/** Un système situé, tel qu'on le garde (par Relto, sous sa clé d'étoile) : la position, le moment, la vue depuis le Relto. */
function record(sys, zero, dial, now = Date.now()) {
  const l = locate(zero, dial), r = l.fromRelto;
  return { at: Math.round(now), torahn: sys.pos.torahn, elevation: sys.pos.elevation, distance: sys.pos.distance, rel: { x: Math.round(r.x), y: Math.round(r.y), z: Math.round(r.z) } };
}
/** Le système est-il situé dans cet état du télescope (le Zéro du Relto doit être trouvé) ? */
function isLocated(telState, key) { return !!(telState && telState.found && telState.systems && telState.systems[key] && Number.isFinite(telState.systems[key].at)); }
/**
 * Hors du Relto (onglet Détails) : le système `key` situé depuis l'un des Reltos dont le Zéro est trouvé (`all` =
 * plugin.ext.telescope), ou null ; `zero` : vrai si au moins un Great Zero est trouvé.
 */
function findLocated(all, key) {
  let zero = false, rec = null;
  for (const st of Object.values(all || {})) { if (!st || !st.found) continue; zero = true; if (!rec && isLocated(st, key)) rec = st.systems[key]; }
  return { zero, rec };
}

// ---- les mots de l'arpenteur --------------------------------------------------------------------------------------------
const list = (s) => String(s).split("|");
/** Seize directions, comme une rose des vents ; le nord est la ligne d'origine du Great Zero, l'est un quart de tour plus loin (sens horaire). */
function sectorOf(torahn) { return mod(Math.round(mod(torahn, T.TURN) / (T.TURN / 16)), 16); }
const HEIGHT_AT = [-60, -25, -5, 5, 25, 60]; // bornes des sept hauteurs (shahfeetee)
function heightBand(h) { let i = 0; while (i < HEIGHT_AT.length && h >= HEIGHT_AT[i]) i++; return i; }
const DELAY_AT = [40, 120, 250, 400];
function delayBand(d) { let i = 0; while (i < DELAY_AT.length && d >= DELAY_AT[i]) i++; return i; }
const FAINT_AT = [0.6, 0.25, 0.08];
function faintBand(s) { let i = 0; while (i < FAINT_AT.length && s < FAINT_AT[i]) i++; return i; }

/**
 * La phrase de l'arpenteur (notes de l'onglet Détails) : ce qu'on perçoit du Zéro depuis l'Âge, en mots seulement.
 * `values` : les trois réglages du télescope (Torahn, élévation au sens du KI, retard), pour le mode « complet ».
 */
function words(clue, lang = "en") {
  const t = makeT(() => (lang === "fr" ? "fr" : "en"));
  const parts = { dir: list(t("sys.compass"))[sectorOf(clue.torahn)], height: list(t("sys.height"))[heightBand(clue.elevation)], delay: list(t("sys.delay"))[delayBand(clue.delay)], faint: list(t("sys.faint"))[faintBand(clue.strength)] };
  return { line: t("sys.line", parts), parts, bands: { sector: sectorOf(clue.torahn), height: heightBand(clue.elevation), delay: delayBand(clue.delay), faint: faintBand(clue.strength) }, values: { torahn: clue.torahn, elev: T.kiElev(clue.elevation), delay: clue.delay } };
}

module.exports = { DELAY_UNIT, DELAY_MAX, STEP_DELAY, TOL, SYS_ELEV, SYS_DIST, SYSTEM_RE, HEIGHT_AT, DELAY_AT, FAINT_AT, parseSystem, starIds, starKey, position, cart, cyl, delayOf, strengthOf, zeroSeenFrom, sources, systemOf, normDial, turnDial, measure, echoOffset, echoWord, locate, record, isLocated, findLocated, sectorOf, heightBand, delayBand, faintBand, words };
