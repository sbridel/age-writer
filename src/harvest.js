"use strict";
/**
 * La récolte (claude/DESIGN-reve-et-caverne-bahro.md, section 2, étape 4a′). Pur.
 *
 * Les Âges ne donnent pas de granulés : ils donnent des **ingrédients**, que la machine du Relto cuit. Seuls certains
 * Âges donnent ce qu'il faut : les quatre sols les plus fertiles, comme les quatre silos d'Er'cana. Un Âge lu donne
 * **une mesure de chaque ingrédient qu'il a écrit**, une fois par jour, **si quelque chose y pousse** (un sol mort ne
 * donne rien). Jamais rétroactif : un jour sans lecture ne donne rien. Le tiré ne compte pas : la recette commence dans
 * l'écriture.
 *
 * Les granulés cuits (la machine) vivent dans `ext.pellets` : { white, amber, grey }.
 */
const LF = require("./life");
const DAY = 86400000;
/** Les quatre ingrédients, dans l'ordre des trémies : cendres, terreau, limon, tourbe. */
const INGREDIENTS = ["ash", "humus", "silt", "peat"];
const KINDS = ["white", "amber", "grey"];

/**
 * Ce qu'un Âge donne : les ingrédients écrits **ou nés d'une réaction** (le limon ne s'écrit pas : il naît de l'eau sur
 * les cendres ; loi 11, ce qui découle de l'écrit), si quelque chose pousse. `present` : tous ses blocs, tirés compris ;
 * `made` : les produits de ses réactions.
 */
function givesOf(written, present, made) {
  const w = new Set([...(written || []), ...(made || [])]), p = present || w;
  if (!LF.ROLES.producer.some((id) => p.has(id))) return [];
  return INGREDIENTS.filter((id) => w.has(id));
}

/** L'état de la récolte (créé à la demande) : { stock: { ash, humus, silt, peat }, last: { [Âge]: jour } }. */
function stateOf(ext) {
  const h = ext.harvest && typeof ext.harvest === "object" ? ext.harvest : (ext.harvest = {});
  if (!h.stock || typeof h.stock !== "object") h.stock = {};
  for (const id of INGREDIENTS) h.stock[id] = Math.max(0, Math.floor(Number(h.stock[id]) || 0));
  if (!h.last || typeof h.last !== "object") h.last = {};
  return h;
}

/** Un Âge est lu (pas un essai) : s'il donne et n'a pas déjà donné aujourd'hui, ses mesures vont aux trémies. Renvoie la liste donnée, ou null. */
function gather(ext, age, list, now) {
  if (!age || !list || !list.length) return null;
  const h = stateOf(ext), day = Math.floor(now / DAY);
  if (h.last[age] === day) return null;
  h.last[age] = day; for (const id of list) h.stock[id] += 1;
  return list.slice();
}
/** A-t-il donné aujourd'hui ? (la ligne de l'onglet Détails) */
function gatheredToday(ext, age, now) { const h = ext && ext.harvest; return !!(h && h.last && h.last[age] === Math.floor(now / DAY)); }

/** Les granulés cuits (créés à la demande) : { white, amber, grey }. Reprend l'étagère de l'ancienne étape 4a (good → white, bad → grey). */
function pelletsOf(ext) {
  const p = ext.pellets && typeof ext.pellets === "object" ? ext.pellets : (ext.pellets = {});
  if ("good" in p || "bad" in p || "last" in p) { p.white = (p.white || 0) + (p.good || 0); p.grey = (p.grey || 0) + (p.bad || 0); delete p.good; delete p.bad; delete p.last; }
  for (const k of KINDS) p[k] = Math.max(0, Math.floor(Number(p[k]) || 0));
  return p;
}

module.exports = { INGREDIENTS, KINDS, DAY, givesOf, stateOf, gather, gatheredToday, pelletsOf };
