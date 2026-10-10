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
 * Étape 3 : les perturbateurs (src/perturbers.js) existent dans la région de l'étoile, écrits ou non ; un livre qui les ÉCRIT
 * décrit une étoile qui en a (la clé d'étoile prend un suffixe `~n` si l'étoile d'origine n'en a pas). `sys.clue` reste le
 * réglage VRAI (ce que l'instrument doit viser), `sys.seen` ce que l'arpenteur perçoit (dévié, faux retard). La TRIANGULATION
 * depuis deux étoiles situées voisines (`beacons`) annule ces effets. La FAUSSE LIGNE de Me'erta (`oldLine`) : une seconde
 * ligne d'origine, jamais décrétée, que le télescope du Relto peut prendre pour la vraie ; calibré dessus (`line` ≠ 0), tout
 * ce qu'il situe ensuite tourne d'autant autour du Zéro (`record`), et l'étoile gravée ne « regarde » plus le Zéro (`miss`).
 *
 * Module pur (sans DOM ni Obsidian) : testé dans test/starsystem.test.js. Le dessin est dans src/relto-telescope.js.
 */
const { rng, fnv } = require("./util");
const T = require("./telescope");
const { makeT } = require("./i18n");
const PB = require("./perturbers");
const BEAM = require("./beam");

const DELAY_UNIT = 25;     // un cran de la molette du retard = 25 shahfeetee de trajet du pouls
const DELAY_MAX = 624;     // la molette du retard va de 0 à 624 crans (deux chiffres D'ni)
const STEP_DELAY = { hub: 1, rim: 25 };
const TOL = { torahn: T.TOL.torahn, elev: T.TOL.elev, delay: 1 }; // situé : à 200 torantee, 2 shahfeetee et 1 cran de retard près
const SYS_ELEV = 100;      // hauteur de l'étoile : de −100 à +100 shahfeetee (vue de l'Âge, le Zéro reste dans les butées du télescope)
const SYS_DIST = [200, 15000]; // distance horizontale de l'étoile au Zéro, en shahfeetee
// Le rahnfee (src/beam.js, invention de fan) : le trajet du pouls en un prorahn, 15 625 shahfeetee de faisceau. Au-delà, le
// pouls se mêlerait au battement suivant : aucune étoile, aucun cran de retard n'y va (garde-fou, vérifié au chargement).
if (Math.hypot(SYS_DIST[1], SYS_ELEV) >= BEAM.RAHNFEE || DELAY_MAX * DELAY_UNIT >= BEAM.RAHNFEE) throw new Error("starsystem: au-delà d'un rahnfee");
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
  const distance = Math.min(SYS_DIST[1], Math.round(SYS_DIST[0] * Math.exp(r() * Math.log(SYS_DIST[1] / SYS_DIST[0])))); // log-uniforme : des voisins et des lointains (jamais au-delà d'un rahnfee)
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

/** Les perturbateurs ÉCRITS dans un Âge (lignes du bloc, jamais tirées). */
function writtenPerturbers(analysis) {
  const lines = (analysis && analysis.resolved && analysis.resolved.lines) || [];
  return [...new Set(lines.filter((l) => l.entry && !l.autoFilled && PB.KINDS.includes(l.entry.id)).map((l) => l.entry.id))].sort();
}

/**
 * Le système d'une clé d'étoile, perturbateurs compris : écrits (`kinds`), ils désignent une étoile qui en a (la clé
 * devient `clé~n` si l'étoile d'origine n'en a pas) ; non écrits, ce qui est là est là. Renvoie { key, pos, near, moved }.
 */
function placeSystem(key0, kinds = []) {
  const res = PB.placeFor((i) => position(i ? key0 + "~" + i : key0), kinds, key0), key = res.moved ? key0 + "~" + kinds.join("+") : key0;
  return { key, pos: res.pos, near: PB.near(res.pos), moved: res.moved };
}

/**
 * Ce que l'Âge perçoit du Zéro, perturbateurs compris : `clue` vrai (le réglage que l'instrument doit viser), `seen` (ce
 * que l'arpenteur note : dévié par un trou noir, retard faussé par un faux pouls). Triangulé (`tri`) : rien n'est faussé.
 */
function perceive(sys, { tri = false } = {}) {
  const clue = { kind: "zero", period: 1, ...zeroSeenFrom(sys.pos) }, fx = sys.fx || PB.effects(sys.near || [], sys.key, clue.delay, DELAY_MAX);
  const perturbed = !!(fx.deflect || fx.beat);
  if (tri || !perturbed) return { clue, seen: clue, fx, perturbed, tri: !!tri && perturbed };
  const seen = { ...clue };
  if (fx.deflect) { seen.torahn = mod(clue.torahn + fx.deflect.dt, T.TURN); seen.elevation = Math.max(-T.ELEV_MAX, Math.min(T.ELEV_MAX, clue.elevation + fx.deflect.de)) || 0; }
  if (fx.beat) seen.delay = Math.max(0, Math.min(DELAY_MAX, clue.delay + fx.beat.delayErr));
  return { clue, seen, fx, perturbed, tri: false };
}

/**
 * Tout ce qu'il faut d'un Âge : sa clé d'étoile, la position de son système, ses perturbateurs (`near`, effets `fx`,
 * `written`), ce qu'on y perçoit du Zéro (`clue` vrai, `seen` perçu) et les sources de signal (le Zéro, les faux pouls).
 */
function systemOf(analysis, src, name) {
  const key0 = starKey(analysis, src, name), written = writtenPerturbers(analysis), P = placeSystem(key0, written);
  const fx = PB.effects(P.near, P.key, delayOf(P.pos), DELAY_MAX), v = perceive({ key: P.key, pos: P.pos, near: P.near, fx });
  const beats = P.near.filter((p) => p.period).map((p) => ({ kind: p.kind, period: p.period, torahn: v.clue.torahn, elevation: v.clue.elevation, delay: v.clue.delay, strength: v.clue.strength * (0.4 + 0.5 * p.k) }));
  return { key: P.key, stars: starIds(analysis), shared: parseSystem(src), pos: P.pos, near: P.near, fx, written, moved: P.moved, sources: sources(P.pos, { perturbers: beats }), clue: v.clue, seen: v.seen, perturbed: v.perturbed };
}

// ---- la fausse ligne de Me'erta (jamais décrétée) -------------------------------------------------------------
const OLD_LINE = { torahn: [1500, 3500], elev: [5, 12], period: 1.06 };
/**
 * La fausse ligne d'origine d'un Relto (`key` : T.keyOf) : un second pouls, plus pâle, à `L` torantee de la vraie ligne
 * (et quelques shahfeetee plus haut ou plus bas), qui bat un peu à contretemps du prorahn. Déterministe ; rien n'est gardé.
 */
function oldLine(zero, key) {
  const r = rng((fnv("merta|" + key) ^ 0x3e47a) >>> 0); r();
  const L = (r() < 0.5 ? -1 : 1) * Math.round(OLD_LINE.torahn[0] + r() * (OLD_LINE.torahn[1] - OLD_LINE.torahn[0]));
  const e = (r() < 0.5 ? -1 : 1) * Math.round(OLD_LINE.elev[0] + r() * (OLD_LINE.elev[1] - OLD_LINE.elev[0]));
  const el = Math.max(-T.ELEV_MAX + 2, Math.min(T.ELEV_MAX - 2, zero.elevation + e));
  return { L, torahn: mod(zero.torahn + L, T.TURN), elevation: el, distance: zero.distance, period: OLD_LINE.period };
}
/** Le Zéro tel que l'instrument le croit, calibré sur la ligne `line` (0 : la vraie) : tourné de `line` torantee. */
function believedZero(zero, line = 0) { return { ...zero, torahn: mod(zero.torahn + int(line), T.TURN) }; }

/**
 * L'écart (torantee, 0 à 31 250) entre la direction où l'Âge voit vraiment le Zéro (`rec.seen`) et celle que donne l'étoile
 * gravée (son Torahn plus un demi-tour) : 0 pour une étoile bien située ; une étoile gravée sur la fausse ligne s'écarte de |line|.
 */
function miss(rec) {
  if (!rec || !Number.isFinite(rec.seen)) return 0;
  let d = mod(rec.seen - mod(rec.torahn + T.TURN / 2, T.TURN), T.TURN); if (d > T.TURN / 2) d = T.TURN - d; return d;
}
/** Une étoile gravée sur une autre ligne que la vraie : elle « ne regarde pas le Zéro » (anciens états : jamais). */
const offLine = (rec) => !!(rec && int(rec.line) !== 0);

// ---- les balises : trianguler depuis les étoiles déjà situées ------------------------------------------------------
const BEACON_RANGE = 6000; // une étoile située sert de balise à moins de 6 000 shahfeetee
/**
 * Les balises d'un système `sys` ({ key, pos }) parmi les systèmes situés `systems` (par clé) : les plus proches d'abord.
 * `ok` : au moins deux ; `agree` : toutes gravées sur la même ligne que l'instrument (`line`) — sinon les étoiles se
 * contredisent et la triangulation ne tient pas.
 */
function beacons(sys, systems, line = 0) {
  const S = cart(sys.pos), list = [];
  for (const [k, rec] of Object.entries(systems || {})) {
    if (k === sys.key || !rec || !Number.isFinite(rec.at) || !Number.isFinite(rec.torahn)) continue;
    const b = cart({ torahn: mod(rec.torahn - int(rec.line), T.TURN), distance: rec.distance, elevation: rec.elevation }), d = Math.hypot(b.x - S.x, b.y - S.y, b.z - S.z);
    if (d <= BEACON_RANGE) list.push({ key: k, d: Math.round(d), line: int(rec.line) });
  }
  list.sort((a, b) => a.d - b.d);
  const two = list.slice(0, 2);
  return { list, ok: list.length >= 2, agree: list.length >= 2 && two.every((b) => b.line === int(line)) };
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
 * Étape 3 : ce que l'oculaire montre d'un système perturbé, au réglage `dial`. `m` : la mesure VRAIE (seule elle situe :
 * l'anneau ne ment pas). Trou noir non triangulé (`bend`) : le vrai point pâlit (× `BEND_DIM`) et une image déviée, brillante
 * (`lure`), attire l'œil là où l'arpenteur l'a notée ; elle ne se fixe jamais. Pulsar ou étoile à neutrons (`beat`) : l'écho
 * s'accorde sur le FAUX pouls (`echoDd` contre le retard perçu) ; accordé sur lui, rien ne se fixe (`falseLock`). Triangulé
 * (`tri`) : la mesure de l'étape 2, sans leurre. `shown` : le signal qu'on voit le mieux (pour les mots et le son).
 */
const BEND_DIM = 0.45;
function scope(dial, sys, { tri = false, easy = false } = {}) {
  // mode facile (src/instruments.js) : les étoiles mortes ne trompent pas (ni leurre, ni faux pouls) ; elles brouillent seulement un peu l'image (`blur`)
  const v0 = perceive(sys, { tri: tri || easy }), v = easy && !tri ? { ...v0, tri: false } : v0, d = normDial(dial), m = measure(d, v.clue), bend = !!(v.fx.deflect && !v0.tri), beat = !!(v.fx.beat && !v0.tri);
  const dim = bend ? BEND_DIM : 1, tr = m.found ? m : { ...m, s: m.s * dim, band: Math.min(T.bandOf(m.s * dim), T.BANDS.length - 1) };
  let lure = null;
  if (bend) { const l = T.signal(d, { torahn: v.seen.torahn, elevation: v.seen.elevation }); lure = { ...l, found: false, band: Math.min(l.band, T.BANDS.length - 1) }; }
  const shown = lure && !m.found && lure.s > tr.s ? lure : tr, ddFalse = beat ? d.delay - v.seen.delay : null;
  return { ...v, m, true: tr, lure, shown, bend, beat, blur: easy && v.perturbed ? 1 : 0, echoDd: beat ? ddFalse : m.dd, falseLock: beat && Math.abs(ddFalse) <= TOL.delay && !m.delayOk, bentLock: !!(lure && lure.band >= 4 && !m.found) };
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

/**
 * Un système situé, tel qu'on le garde (par Relto, sous sa clé d'étoile) : la position GRAVÉE, le moment, la vue depuis le
 * Relto. Étape 3 (champs facultatifs, absents des états de l'étape 2) : `line` (≠ 0 : l'instrument était calibré sur la fausse
 * ligne ; tout tourne de `line` torantee autour du Zéro), `seen` (où l'Âge voit vraiment le Zéro, pour que la carte trahisse
 * l'erreur), `pert` (ses perturbateurs : genre et position GZCS gravée), `tri` (situé par triangulation), `ages` (noms).
 */
function record(sys, zero, dial, now = Date.now(), { line = 0, ages = null, tri = false } = {}) {
  const L = int(line), r = locate(believedZero(zero, L), dial).fromRelto;
  const out = { at: Math.round(now), torahn: mod(sys.pos.torahn + L, T.TURN), elevation: sys.pos.elevation, distance: sys.pos.distance, rel: { x: Math.round(r.x), y: Math.round(r.y), z: Math.round(r.z) } };
  if (sys.near) { out.seen = zeroSeenFrom(sys.pos).torahn; if (sys.near.length) out.pert = sys.near.map((p) => { const c = PB.cylOf(p); return { kind: p.kind, torahn: mod(c.torahn + L, T.TURN), distance: c.distance, elevation: c.elevation }; }); }
  if (L) out.line = L;
  if (tri) out.tri = true;
  if (ages && ages.length) out.ages = [...new Set(ages)].sort();
  return out;
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
 * Ce que l'arpenteur note d'un système `sys` (systemOf) : dans l'Art de la Guilde (`guild`), ce qu'il perçoit (`seen`,
 * faussé par les étoiles mortes) ; en mode facile, le vrai (`clue`). Passer aussi `{ easy: !guild }` à `words`.
 */
function surveyed(sys, guild) { return (guild && sys.seen) || sys.clue; }
/**
 * La phrase de l'arpenteur (notes de l'onglet Détails) : ce qu'on perçoit du Zéro depuis l'Âge, en mots seulement.
 * `values` : les trois réglages du télescope (Torahn, élévation au sens du KI, retard), pour le mode « complet ».
 * `opts.easy` (mode facile) : ni faux pouls ni lumière courbée dans les mots, seulement un léger brouillage.
 */
function words(clue, lang = "en", opts = {}) {
  const t = makeT(() => (lang === "fr" ? "fr" : "en")), n = opts.compass === 4 || opts.compass === 8 ? opts.compass : 16, sec = sectorOf(clue.torahn);
  const coarse = mod(Math.round((sec * n) / 16), n), dir = n === 16 ? list(t("sys.compass"))[sec] : n === 8 ? list(t("sys.compass"))[coarse * 2] : list(t("sys.compass.four"))[coarse];
  const parts = { dir, height: list(t("sys.height"))[heightBand(clue.elevation)], delay: list(t("sys.delay"))[delayBand(clue.delay)], faint: list(t("sys.faint"))[faintBand(clue.strength)] };
  const out = { line: t("sys.line", parts), parts, bands: { sector: sec, compass: n, height: heightBand(clue.elevation), delay: delayBand(clue.delay), faint: faintBand(clue.strength) }, values: { torahn: clue.torahn, elev: T.kiElev(clue.elevation), delay: clue.delay } };
  // étape 3 : ce que l'arpenteur remarque des perturbateurs (faux pouls, lumière courbée) et de sa boussole (sans nord, des relèvements grossiers)
  const fx = opts.fx, bits = [];
  if (opts.easy && fx && (fx.beat || fx.deflect)) bits.push(t("sys.pert.blur")); // mode facile : une étoile morte brouille seulement un peu l'image
  else if (fx && fx.beat) { bits.push(fx.beat.kind === "pulsar" ? t("sys.pert.pulsar") : t("sys.pert.neutron")); out.values.beats = PB.beatsPer25(fx.beat.period); }
  if (fx && fx.deflect && !opts.easy) bits.push(t("sys.pert.bend"));
  if (n === 4) bits.push(t("sys.compass.none")); else if (n === 8) bits.push(t("sys.compass.weak"));
  if (bits.length) out.pert = bits.join(" ");
  return out;
}

/**
 * La boussole de l'arpenteur selon le champ magnétique de l'Âge (`field` : w.field de la physique, Terre = 1) : un vrai
 * nord, 16 directions ; un champ faible, 8 ; pas de dynamo (noyau mort ou monde qui ne tourne pas), 4. Inconnu : 16.
 */
const FIELD_SHIELD = 0.2, FIELD_NONE = 0.02; // le seuil d'un vrai bouclier (src/physics/model.js) ; en dessous de 0,02 : pas de nord
function compassOf(field) { return field == null || !Number.isFinite(field) ? 16 : field <= FIELD_NONE ? 4 : field < FIELD_SHIELD ? 8 : 16; }

/**
 * Le Zéro et la fausse ligne vus dans l'oculaire, lutrin vide (étape 1, avec le piège de l'étape 3) : `true` (le vrai Zéro),
 * `old` (la ligne de Me'erta : un pouls plus pâle, `OLD_GAIN`), `best` (celui qu'on voit le mieux, avec `line` : 0 ou L).
 * `easy` (mode facile) : la fausse ligne reste invisible (`old.hidden`, signal nul), `best` est toujours le vrai Zéro.
 */
const OLD_GAIN = 0.82;
function lineSignals(aim, zero, old, { easy = false } = {}) {
  const a = T.signal(aim, zero);
  if (easy || !old) return { true: a, old: { ...a, s: 0, band: 0, found: false, hidden: true }, best: { ...a, line: 0 } }; // mode facile : la ligne de Me'erta n'apparaît jamais
  const o0 = T.signal(aim, { torahn: old.torahn, elevation: old.elevation }), s = o0.s * OLD_GAIN, o = { ...o0, s, band: o0.found ? o0.band : Math.min(T.bandOf(s), T.BANDS.length - 1) };
  const best = a.found || !o.found && a.s >= o.s ? { ...a, line: 0 } : { ...o, line: old.L };
  return { true: a, old: o, best };
}

module.exports = { surveyed, BEND_DIM, scope, OLD_LINE, OLD_GAIN, BEACON_RANGE, FIELD_NONE, writtenPerturbers, placeSystem, perceive, oldLine, believedZero, miss, offLine, beacons, compassOf, lineSignals, DELAY_UNIT, DELAY_MAX, STEP_DELAY, TOL, SYS_ELEV, SYS_DIST, SYSTEM_RE, HEIGHT_AT, DELAY_AT, FAINT_AT, parseSystem, starIds, starKey, position, cart, cyl, delayOf, strengthOf, zeroSeenFrom, sources, systemOf, normDial, turnDial, measure, echoOffset, echoWord, locate, record, isLocated, findLocated, sectorOf, heightBand, delayBand, faintBand, words };
