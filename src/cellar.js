"use strict";
/*
 * La cave sous la machine (choix de l'auteur, 25 oct. 2026, soir) : la récolte y descend, rangée par saison ; c'est le joueur
 * qui sépare le bon grain du mauvais. Pur.
 *
 * - **Les bocaux** : un par matière (cendres, terreau, limon, tourbe) et par saison de récolte (hiver, printemps, été, automne,
 *   et « sans saison » pour un Âge qui n'en a pas), plus un bocal scellé de **bon grain** par matière. Dans un bocal de saison,
 *   riches et pauvres sont **mêlés** : rien ne dit combien de chaque.
 * - **Le tamis** : un bocal mêlé y passe ; ses mesures riches vont au bocal de bon grain, les pauvres tombent au compost.
 * - **Le compost** : trois mesures pauvres donnent une mesure de terreau, pauvre, rangée dans le bocal de terreau sans saison.
 * - **Le monte-charge** : un bocal y est posé, il monte se vider dans la trémie de sa matière. Ce qui monte de la cave se verse
 *   **dans l'ordre où on l'a mis** (`harvest.js`, la file de la trémie) : la trémie ne trie plus d'elle-même ce qui vient d'en bas.
 *
 * État : `ext.cellar = { jars: { [matière]: { winter, spring, summer, autumn, none: { n, rich }, good: { n } } }, compost }`,
 * dans la réserve du Relto (bac à sable / Relto histoire), comme la récolte.
 */
const H = require("./harvest");
const SEASONS = ["winter", "spring", "summer", "autumn", "none"];
/** Un bocal plein : douze mesures (au-delà, il déborde à l'œil, rien ne se perd). */
const JAR_FULL = 12;
/** Le compost : trois mesures pauvres font une mesure de terreau. */
const COMPOST_PER = 3;
const int = (v) => Math.max(0, Math.floor(Number(v) || 0));

/** L'état de la cave (créé à la demande, nettoyé). */
function stateOf(ext) {
  const c = ext.cellar && typeof ext.cellar === "object" ? ext.cellar : (ext.cellar = {});
  if (!c.jars || typeof c.jars !== "object") c.jars = {};
  for (const id of H.INGREDIENTS) {
    const row = c.jars[id] && typeof c.jars[id] === "object" ? c.jars[id] : (c.jars[id] = {});
    for (const s of SEASONS) { const j = row[s] && typeof row[s] === "object" ? row[s] : (row[s] = {}); j.n = int(j.n); j.rich = Math.min(j.n, int(j.rich)); }
    const g = row.good && typeof row.good === "object" ? row.good : (row.good = {}); g.n = int(g.n);
  }
  c.compost = int(c.compost) % COMPOST_PER;
  return c;
}
const slotOk = (s) => SEASONS.includes(s) || s === "good";
/** Le bocal (matière, saison ou "good"), ou null. */
function jarOf(ext, id, slot) { if (!H.INGREDIENTS.includes(id) || !slotOk(slot)) return null; return stateOf(ext).jars[id][slot]; }
/** Une mesure récoltée descend à la cave, dans le bocal de sa saison (null : sans saison). */
function store(ext, id, season, rich) {
  const j = jarOf(ext, id, SEASONS.includes(season) ? season : "none"); if (!j) return false;
  j.n += 1; if (rich) j.rich += 1; return true;
}
/** Le compost reçoit `n` mesures pauvres ; renvoie le nombre de mesures de terreau qu'il vient de donner. */
function compost(ext, n) {
  const c = stateOf(ext), tot = c.compost + int(n), made = Math.floor(tot / COMPOST_PER);
  c.compost = tot % COMPOST_PER; c.jars.humus.none.n += made; return made;
}
/** Le tamis : un bocal de saison se sépare ; renvoie { good, bad, humus } ou null (bocal vide, ou déjà trié). */
function sieve(ext, id, slot) {
  if (!SEASONS.includes(slot)) return null;
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const good = j.rich, bad = j.n - j.rich, row = stateOf(ext).jars[id];
  j.n = 0; j.rich = 0; row.good.n += good;
  return { good, bad, humus: compost(ext, bad) };
}
/** Jeter tout un bocal au compost (même du bon grain) ; renvoie { n, humus } ou null. */
function toCompost(ext, id, slot) {
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const n = j.n; j.n = 0; if ("rich" in j) j.rich = 0;
  return { n, humus: compost(ext, n) };
}
/**
 * L'ordre dans lequel un bocal se verse : ses mesures riches et pauvres réparties au long du bocal (mêlées, comme elles sont
 * venues), tout riche pour le bon grain. Pur, reproductible.
 */
function orderOf(n, rich) {
  const out = []; for (let k = 0; k < n; k++) out.push(Math.floor(((k + 1) * rich) / n) > Math.floor((k * rich) / n));
  return out;
}
/** Le monte-charge : le bocal monte se vider dans la trémie de sa matière ; renvoie le nombre de mesures montées, ou null. */
function lift(ext, id, slot) {
  const j = jarOf(ext, id, slot); if (!j || !j.n) return null;
  const n = j.n, rich = slot === "good" ? n : j.rich; j.n = 0; if ("rich" in j) j.rich = 0;
  H.pour(ext, id, orderOf(n, rich));
  return n;
}
/** Ce que la cave contient en tout (pour l'appentis et les essais). */
function totals(ext) {
  const c = stateOf(ext), out = {};
  for (const id of H.INGREDIENTS) out[id] = [...SEASONS, "good"].reduce((s, k) => s + c.jars[id][k].n, 0);
  return out;
}

module.exports = { SEASONS, JAR_FULL, COMPOST_PER, stateOf, jarOf, store, compost, sieve, toCompost, orderOf, lift, totals };
