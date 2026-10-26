"use strict";
/*
 * Porter (claude/DESIGN-art-bahro.md §12 ; DESIGN-accord-trois-ecritures.md §4.1–4.6), modèle pur. Une ligne du bloc `age` :
 *     carry: sky from Ash Tower        un ciel : les pages de ciel écrites de la source
 *     carry: forest from Glass Marsh   un lieu : une famille de sol (src/dosage.js, BIOMES) et ce qui en dépend
 * Le fragment n'est pas réécrit : il est relu dans la source à chaque lecture (il « respire »), au plus deux niveaux, sans cycle.
 * Ce module ne lit rien du coffre : la couche d'extension lui donne les analyses (src/entry.js, carryExpand / carryAdjust).
 */
const { BIOMES } = require("./dosage");

const PLACES = Object.keys(BIOMES); /* desert, ice, water, fire, stone, forest, salt */
const WHATS = ["sky", ...PLACES];
const CARRY_RE = /^\s*carry\s*:\s*(\S+)\s+from\s+(.+?)\s*$/i;
const AS_SKY_RE = /\s+as\s+sky$/i;
/** La profondeur permise : un Âge porté peut porter d'un Âge porté, pas plus loin (§12.4). */
const MAX_DEPTH = 2;

/* ---- le prix (§12.3) : la forme est arrêtée, les nombres se règlent sur la mesure (tools/carry-measure.js) ---- */
/** La couture : une cicatrice de bordure, légère, qui ne guérit jamais ; côté Âge porté, et (plus petite) côté source. */
const SEAM = 0.08, SEAM_SOURCE = 0.03; /* plus dur, choix de l'auteur sur la mesure du 25 oct. */
/** La dissonance : un clash de la famille de l'axe porté, gradué par le degré de l'accord (src/imager-guild.js, accordOf). */
const DISSONANCE = 0.18;
const DEGREE_FACTOR = { full: 0, good: 0.25, rub: 1, clash: 1 };
/** Une source qui ne tient pas (< 75) se porte quand même pendant la contrainte cachée : le manque se paie, à moitié. */
const SICK_SHARE = 0.5;
const STABLE_AT = 75;
/** Les cases du tirage qui font le ciel : fermées sous une terre renversée (hooks.closedSlots). */
const SKY_SLOTS = ["stars", "cycle", "moon", "phenomena"];
/** Les cases que le tirage n'ouvre pas pour cet Âge : le ciel, quand un lieu est porté à contre-sens (et qu'aucun ciel n'est porté). */
function closedSlots(info) {
  const fr = (info && info.fragments) || []; if (!fr.some((f) => f.contra) || fr.some((f) => f.what === "sky")) return null;
  return SKY_SLOTS;
}

/** L'axe que touche un fragment : le ciel pour un ciel, le sol pour un lieu. */
const axisOf = (what) => (what === "sky" ? "cosmological" : "geological");

/** Une ligne `carry:` → { what, from, contra, raw } (what : sky ou une famille ; contra : « as sky », un lieu posé à la place du ciel), ou null. */
function parseLine(line) {
  const m = CARRY_RE.exec(String(line || "")); if (!m) return null;
  let from = m[2], contra = false;
  if (AS_SKY_RE.test(from)) { contra = true; from = from.replace(AS_SKY_RE, ""); }
  const what = m[1].toLowerCase();
  return { what, from: from.trim(), contra, raw: String(line).trim(), known: WHATS.includes(what) };
}
/** Une source porte-t-elle depuis cet Âge ? (la boucle : deux Âges qui se portent l'un l'autre, la forme de Torus) */
const carriesFrom = (srcText, name) => parseAll(srcText).some((l) => l.from.toLowerCase() === String(name || "").toLowerCase());
/** Toutes les lignes `carry:` d'un bloc, avec leur numéro de ligne. */
function parseAll(text) {
  const out = [];
  String(text || "").split("\n").forEach((l, i) => { const c = parseLine(l); if (c) out.push({ ...c, index: i }); });
  return out;
}
const isCarryLine = (line) => CARRY_RE.test(String(line || ""));

/**
 * Le fragment : les blocs que la source porte vers l'autre Âge.
 * @param src     l'analyse de la source ({ resolved: { lines, matter: { written, reactions } } })
 * @param what    "sky" ou une famille de sol
 * @param axisOf  (id) → l'axe d'un bloc (cosmological, geological, ecological…)
 * @param o.life  vrai pour le premier lieu porté depuis cette source : la chaîne vivante l'accompagne (loi 13 : elle ne se coupe pas)
 * @returns la liste des identifiants, triée, sans doublon
 */
function fragmentOf(src, what, blockAxis, o = {}) {
  const res = (src && src.resolved) || {}, lines = res.lines || [], mt = res.matter || {}, out = new Set();
  const written = new Set([...(mt.written || []), ...lines.filter((l) => l.entry).map((l) => l.entry.id)]); /* la matière écrite, et les pages écrites (rivière, marais…) */
  if (what === "sky") {
    for (const l of lines) if (l.entry && blockAxis(l.entry.id) === "cosmological") out.add(l.entry.id);
    return [...out].sort();
  }
  const fam = new Set(BIOMES[what] || []);
  for (const id of written) if (fam.has(id)) out.add(id);
  if (!out.size) return [];
  if (o.life) for (const id of written) if (blockAxis(id) === "ecological") out.add(id); /* la vie part avec le premier lieu */
  /* ce qui réagit avec le lieu vient avec lui : une réaction demande ses deux matières (loi 7) */
  for (const r of mt.reactions || []) {
    if (!r || !written.has(r.a) || !written.has(r.b)) continue;
    if (out.has(r.a) && blockAxis(r.b) !== "cosmological") out.add(r.b);
    else if (out.has(r.b) && blockAxis(r.a) !== "cosmological") out.add(r.a);
  }
  return [...out].sort();
}

/**
 * Le texte que lit le moteur : les lignes `carry:` comprises sont retirées et remplacées par leurs fragments ; un ciel porté remplace
 * le ciel écrit de l'Âge (ses propres pages de ciel tombent). Les lignes non comprises restent telles quelles (le moteur ne les comprend pas).
 * @param text   le bloc `age`
 * @param done   [{ index, what, ids }] : les lignes comprises
 * @param blockAxis (id) → axe ; `norm` (ligne) → identifiant (météo vivante, etc.)
 */
function expandText(text, done, blockAxis, norm = (l) => l.trim()) {
  /* un ciel porté remplace les pages de ciel écrites ; un lieu à contre-sens occupe la voûte seulement : les astres écrits restent, et rien ne se tire par-dessus (SKY_SLOTS ; 26 oct. 2026) */
  const lines = String(text || "").split("\n"), drop = new Set(done.map((d) => d.index)), sky = done.some((d) => d.what === "sky");
  const kept = lines.filter((l, i) => !drop.has(i) && !(sky && blockAxis(norm(l)) === "cosmological"));
  const add = [];
  for (const d of done) for (const id of d.ids) if (!add.includes(id)) add.push(id);
  return kept.concat(add).join("\n");
}

/** Le prix d'un fragment, sur son axe : la couture (deux à contre-sens : « une couture de plus »), la dissonance graduée, et le manque d'une source malade. */
function costOf(degree, srcStability, contra) {
  const dis = DISSONANCE * (DEGREE_FACTOR[degree] == null ? 1 : DEGREE_FACTOR[degree]), seam = SEAM; /* à contre-sens : une seule couture, l'octave exigée est son prix (26 oct. 2026 : deux coutures rendaient le chapitre 16 impossible) */
  const sick = Number.isFinite(srcStability) && srcStability < STABLE_AT ? ((STABLE_AT - srcStability) / 100) * SICK_SHARE : 0;
  return { seam, dissonance: dis, sick, total: seam + dis + sick };
}
/** L'axe que touche un fragment porté : un lieu à contre-sens est posé à la place du ciel. */
const axisOfFragment = (f) => (f && f.contra ? "cosmological" : axisOf(f && f.what));

/**
 * Applique les prix à une analyse (une copie) : chaque fragment retire de la stabilité sur son axe ; la stabilité et le verdict suivent.
 * @param r      l'analyse de l'Âge porté (texte déjà développé)
 * @param frags  [{ what, degree, srcStability }]
 * @param sourceSeams  nombre d'Âges qui portent depuis celui-ci, par axe : { cosmological: n, geological: n }
 */
function applyCosts(r, frags, sourceSeams) {
  if (!r || (!(frags && frags.length) && !sourceSeams)) return r;
  const ax = { ...(r.axisStability || {}) }, hit = (axis, c) => { ax[axis] = Math.max(0, Math.min(ax[axis] == null ? 100 : ax[axis], Math.round((ax[axis] == null ? 100 : ax[axis]) - c * 100))); };
  for (const f of frags || []) hit(axisOfFragment(f), costOf(f.degree, f.srcStability, f.contra).total);
  for (const [axis, n] of Object.entries(sourceSeams || {})) if (n > 0) hit(axis, SEAM_SOURCE * Math.min(3, n));
  const vals = Object.values(ax), stability = vals.length ? Math.min(...vals) : r.stability;
  return { ...r, axisStability: ax, stability, verdict: stability >= 75 ? "stable" : stability >= 40 ? "unstable" : "dying" };
}

/**
 * La chaîne de lecture : `chain` = les Âges en cours de lecture, du premier jusqu'à celui qui porte (inclus). Refuse un cycle (la source est
 * déjà dans la chaîne) et une profondeur au-delà de MAX_DEPTH (un Âge porté peut porter d'un Âge porté ; celui-là ne porte plus). "cycle", "deep" ou "".
 */
function guardOf(chain, name) {
  const n = String(name || "").toLowerCase();
  if ((chain || []).some((s) => String(s).toLowerCase() === n)) return "cycle";
  if ((chain || []).length > MAX_DEPTH) return "deep";
  return "";
}

module.exports = { PLACES, WHATS, SKY_SLOTS, closedSlots, CARRY_RE, MAX_DEPTH, SEAM, SEAM_SOURCE, DISSONANCE, DEGREE_FACTOR, SICK_SHARE, axisOf, axisOfFragment, parseLine, parseAll, carriesFrom, isCarryLine, fragmentOf, expandText, costOf, applyCosts, guardOf };
