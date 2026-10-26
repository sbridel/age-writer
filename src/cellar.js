"use strict";
/*
 * La cave sous la machine (choix de l'auteur, 25–26 oct. 2026 ; claude/DESIGN-cave-de-la-machine.md) : la récolte y descend, rangée par
 * saison ; c'est le joueur qui sépare le bon grain du mauvais, et les sortes entre elles. Pur.
 *
 * - **Les bocaux de saison** : un par matière (cendres, terreau, limon, tourbe) et par saison de récolte (hiver, printemps, été, automne,
 *   « sans saison » pour un Âge qui n'en a pas). Riches et pauvres, et les sortes d'une même matière, y sont **mêlés** : rien ne dit
 *   combien de chaque (`by` les compte, le joueur ne les voit qu'en veines).
 * - **Les bocaux scellés** : un par sorte (« good:volcanic »…) : la cendre volcanique ou de foyer, le limon de quartz ou volcanique,
 *   le terreau, la tourbe (src/harvest.js, la genèse).
 * - **Le tamis** : un bocal de saison y passe ; chaque mesure riche va au bocal scellé de sa sorte, les pauvres tombent au compost.
 * - **Le compost** : trois mesures pauvres donnent une mesure de terreau, pauvre, rangée dans le bocal de terreau sans saison.
 * - **Le monte-charge** : un bocal y est posé, il monte se vider dans la trémie de sa matière, chaque mesure avec sa sorte et sa qualité,
 *   dans l'ordre où elles sont venues (mêlées) : la trémie ne trie plus d'elle-même ce qui vient d'en bas.
 *
 * État : `ext.cellar = { jars: { [matière]: { winter…none: { n, rich, by: { [sorte]: { n, rich } } }, "good:<sorte>": { n } } }, compost }`,
 * dans la réserve du Relto (bac à sable / Relto histoire), comme la récolte.
 */
const H = require("./harvest");
const SEASONS = ["winter", "spring", "summer", "autumn", "none"];
/** Les sortes de chaque matière, selon sa genèse (déduite de l'Âge, jamais écrite) : la cendre volcanique ou de foyer, le limon de quartz ou volcanique. */
const SORTS = { ash: ["volcanic", "hearth"], humus: ["humus"], silt: ["quartz", "volcanic"], peat: ["peat"] };
/** Un bocal plein : douze mesures (au-delà, il déborde à l'œil, rien ne se perd). */
const JAR_FULL = 12;
/** Le compost : trois mesures pauvres font une mesure de terreau. */
const COMPOST_PER = 3;
const int = (v) => Math.max(0, Math.floor(Number(v) || 0));
const sealOf = (sort) => "good:" + sort;
const sortOfSlot = (slot) => (String(slot).startsWith("good:") ? String(slot).slice(5) : null);

/** L'état de la cave (créé à la demande, nettoyé ; la cave d'avant les sortes est reprise sans rien perdre). */
function stateOf(ext) {
  const c = ext.cellar && typeof ext.cellar === "object" ? ext.cellar : (ext.cellar = {});
  if (!c.jars || typeof c.jars !== "object") c.jars = {};
  for (const id of H.INGREDIENTS) {
    const row = c.jars[id] && typeof c.jars[id] === "object" ? c.jars[id] : (c.jars[id] = {}), first = SORTS[id][0];
    for (const s of SEASONS) {
      const j = row[s] && typeof row[s] === "object" ? row[s] : (row[s] = {});
      if (!j.by || typeof j.by !== "object") { j.by = {}; const n0 = int(j.n); if (n0) j.by[first] = { n: n0, rich: Math.min(n0, int(j.rich)) }; } /* un bocal d'avant les sortes : sa première sorte */
      let n = 0, rich = 0;
      for (const k of Object.keys(j.by)) { if (!SORTS[id].includes(k)) { delete j.by[k]; continue; } const b = j.by[k]; b.n = int(b && b.n); b.rich = Math.min(b.n, int(b && b.rich)); if (!b.n) { delete j.by[k]; continue; } n += b.n; rich += b.rich; }
      j.n = n; j.rich = rich;
    }
    if (row.good && typeof row.good === "object") { const g = row[sealOf(first)] || (row[sealOf(first)] = { n: 0 }); g.n = int(g.n) + int(row.good.n); } delete row.good; /* le bocal scellé d'avant les sortes */
    for (const so of SORTS[id]) { const g = row[sealOf(so)] && typeof row[sealOf(so)] === "object" ? row[sealOf(so)] : (row[sealOf(so)] = {}); g.n = int(g.n); }
  }
  c.compost = int(c.compost) % COMPOST_PER;
  return c;
}
const slotOk = (id, s) => SEASONS.includes(s) || (sortOfSlot(s) && SORTS[id] && SORTS[id].includes(sortOfSlot(s)));
/** Le bocal (matière, saison ou « good:<sorte> »), ou null. */
function jarOf(ext, id, slot) { if (!H.INGREDIENTS.includes(id) || !slotOk(id, slot)) return null; return stateOf(ext).jars[id][slot]; }
/** Une mesure récoltée descend à la cave, dans le bocal de sa saison (null : sans saison), avec sa sorte (par défaut, la première). */
function store(ext, id, season, rich, sort = null) {
  const j = jarOf(ext, id, SEASONS.includes(season) ? season : "none"); if (!j) return false;
  const so = SORTS[id].includes(sort) ? sort : SORTS[id][0], b = j.by[so] || (j.by[so] = { n: 0, rich: 0 });
  b.n += 1; j.n += 1; if (rich) { b.rich += 1; j.rich += 1; } return true;
}
/** Le compost reçoit `n` mesures pauvres ; renvoie le nombre de mesures de terreau qu'il vient de donner. */
function compost(ext, n) {
  const c = stateOf(ext), tot = c.compost + int(n), made = Math.floor(tot / COMPOST_PER);
  c.compost = tot % COMPOST_PER; for (let k = 0; k < made; k++) store(ext, "humus", null, false, "humus");
  return made;
}
/** Vider un bocal de saison (remis à zéro). */
const clear = (j) => { j.by = {}; j.n = 0; j.rich = 0; };
/** Le tamis : un bocal de saison se sépare ; renvoie { good, bad, humus, sorts: { [sorte]: bon grain } } ou null (bocal vide, ou déjà trié). */
function sieve(ext, id, slot) {
  if (!SEASONS.includes(slot)) return null;
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const row = stateOf(ext).jars[id], sorts = {}; let good = 0, bad = 0;
  for (const [so, b] of Object.entries(j.by)) { row[sealOf(so)].n += b.rich; if (b.rich) sorts[so] = b.rich; good += b.rich; bad += b.n - b.rich; }
  clear(j);
  return { good, bad, sorts, humus: compost(ext, bad) };
}
/** Jeter tout un bocal au compost (même du bon) ; renvoie { n, humus } ou null. */
function toCompost(ext, id, slot) {
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const n = j.n; if (SEASONS.includes(slot)) clear(j); else j.n = 0;
  return { n, humus: compost(ext, n) };
}
/** L'ordre dans lequel `n` mesures dont `rich` riches se versent : réparties au long du bocal (mêlées, comme elles sont venues). Pur. */
function orderOf(n, rich) {
  const out = []; for (let k = 0; k < n; k++) out.push(Math.floor(((k + 1) * rich) / n) > Math.floor((k * rich) / n));
  return out;
}
/** Ce qu'un bocal verse, dans l'ordre : des mesures { r, s } ; les sortes d'un bocal de saison se mêlent tour à tour. */
function pourOf(id, slot, j) {
  const so = sortOfSlot(slot); if (so) return Array.from({ length: j.n }, () => ({ r: true, s: so }));
  const lanes = SORTS[id].filter((k) => j.by[k] && j.by[k].n > 0).map((k) => orderOf(j.by[k].n, j.by[k].rich).map((r) => ({ r, s: k }))), out = [];
  for (let i = 0; lanes.some((l) => i < l.length); i++) for (const l of lanes) if (i < l.length) out.push(l[i]);
  return out;
}
/** Le monte-charge : le bocal monte se vider dans la trémie de sa matière ; renvoie le nombre de mesures montées, ou null. */
function lift(ext, id, slot) {
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const order = pourOf(id, slot, j), n = order.length; if (SEASONS.includes(slot)) clear(j); else j.n = 0;
  H.pour(ext, id, order);
  return n;
}
/** Ce que la cave contient en tout (pour l'appentis et les essais). */
function totals(ext) {
  const c = stateOf(ext), out = {};
  for (const id of H.INGREDIENTS) out[id] = [...SEASONS, ...SORTS[id].map(sealOf)].reduce((s, k) => s + c.jars[id][k].n, 0);
  return out;
}

module.exports = { SORTS, SEASONS, JAR_FULL, COMPOST_PER, sealOf, sortOfSlot, stateOf, jarOf, store, compost, sieve, toCompost, orderOf, pourOf, lift, totals };
