"use strict";
/**
 * La capacité par axe : la cohérence achète de la richesse (claude/DESIGN-capacite-et-coherence.md, lois 5 et 10).
 *   capacité d'un axe = 6 + 2 par loi de cet axe qui S'APPLIQUE et qui TIENT, au plus 16.
 * Une loi ne compte que si l'Âge l'engage (pas de grand arbre : « le sol porte » ne donne rien) ; elle ne compte que si elle tient
 * (la boucle de la vie est fermée, le grand repose sur du petit…). Rien n'est gratuit : ce qui fait tenir une loi s'écrit, et coûte déjà ses points.
 * Fonction pure : elle rend les capacités et la liste des lois tenues ; le coût du budget (dosage.js) s'en sert.
 *   ÉCOLOGIQUE  la boucle vie ↔ mort, les échelles, les butineurs et les fleurs, l'énergie du plancton et du tapis, le granulé bien dosé
 *   GÉOLOGIQUE  le sol porte l'arbre qu'on pose dessus
 *   MÉTÉO       le temps s'enchaîne (pluie + vent → orage, rouille) au lieu de se heurter
 *   COSMOLOGIQUE le ciel s'accorde avec lui-même (au moins deux blocs de ciel, aucune contradiction). (La seconde loi du ciel, la physique qui tient,
 *               arrive après le dosage : voir le document de conception.)
 *   MÉTAPHYSIQUE aucune loi pour l'instant.
 */
const LF = require("./life");

const BASE = 6, STEP = 2, MAX = 16;

/**
 * @param present  l'ensemble des blocs présents (écrits ou produits)
 * @param o        { factor: (id) → facteur de quantité, natural: nombre de réactions naturelles, sky: { blocks, clashes } }
 * @returns { caps: { axe: capacité }, held: [{ axis, id }] } ; seuls les axes qui gagnent quelque chose figurent dans `held`
 */
// Loi 16, Œuvres : aucune entrée pour l'axe métaphysique, il garde sa base (ruines et objets n'achètent rien).
function capacities(present, o) {
  const has = (list) => list.some((id) => present.has(id)), role = (r) => LF.ROLES[r].some((id) => present.has(id));
  // les lois de la vie et du sol, lues avec leur plein poids : une loi qui s'applique et dont la phrase d'échec n'est pas dite tient
  const failing = new Set(((LF.laws(present, { weights: { life: 1, soil: 1 }, factor: o && o.factor }) || {}).notes || []).filter((n) => n.cost > 0).map((n) => n.id));
  const consumers = role("herbivore") || role("carnivore");
  const macro = consumers || has(LF.BIG_TREES) || role("pollinator") || present.has("flowers");
  const soils = Object.keys(LF.SOIL).filter((id) => present.has(id));
  const list = [
    ["ecological", "loop", consumers, !failing.has("openLoop") && !failing.has("thinLoop")],
    ["ecological", "scales", macro, !failing.has("noMicro")],
    ["ecological", "pollinator", present.has("flowers"), !failing.has("noPollinator")],
    ["ecological", "energy", present.has("plankton") || present.has("microbial_mat"), !failing.has("noLight") && !failing.has("noHeat")],
    ["ecological", "pellet", present.has("pellet") && role("producer"), !failing.has("overdose")],
    ["geological", "ground", has(LF.BIG_TREES) && soils.length > 0, !failing.has("weakGround") && !failing.has("noEarth")],
    ["weather", "chain", !!(o && o.natural > 0), true],
    ["cosmological", "sky", !!(o && o.sky && o.sky.blocks >= 2), !!(o && o.sky && o.sky.clashes === 0)],
  ];
  const caps = {}, held = [];
  for (const [axis, id, applies, holds] of list) if (applies && holds) { held.push({ axis, id }); caps[axis] = Math.min(MAX, (caps[axis] || BASE) + STEP); }
  return { caps, held };
}

/** La capacité d'un axe : 6 sans loi tenue. */
const capacityOf = (caps, axis) => (caps && caps[axis]) || BASE;

module.exports = { BASE, STEP, MAX, capacities, capacityOf };
