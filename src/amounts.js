"use strict";
/**
 * Quantités : « beaucoup / peu / normal » de ruines, d'arbres, d'eau, de pluie…
 *   many: ruins, trees          (aussi much, lots, plenty, beaucoup)
 *   few: rain                   (aussi little, peu)
 *   normal: water               (remet à la normale)
 * Cibles : un groupe (ruins, trees, water, rain, fog, wind, clouds, stars, moths, glow, riches, scars) ou n'importe quel identifiant de bloc (`many: gold`).
 * Effets : (1) le rendu de la fenêtre générative (plus ou moins de ruines, d'arbres, de gouttes…) ;
 *          (2) la stabilité : un bloc en grande quantité coûte le double de son poids, en petite quantité 40 % (poids positifs seulement) ;
 *          (3) richesses et cicatrices : voir applyAmounts.
 * Ne crée rien : une quantité ne fait que mettre à l'échelle ce qui est écrit.
 */
const W = require("./wealth");

const LEVELS = { many: 2, much: 2, lots: 2, plenty: 2, beaucoup: 2, few: 0.4, little: 0.4, peu: 0.4, normal: 1 };
const AMOUNT_RE = /^\s*(many|much|lots|plenty|beaucoup|few|little|peu|normal)\s*[:=]\s*(.+?)\s*$/i;
const ALIAS = { ruines: "ruins", arbres: "trees", arbre: "trees", eau: "water", pluie: "rain", brume: "fog", vent: "wind", nuages: "clouds", etoiles: "stars", étoiles: "stars", papillons: "moths", lueurs: "glow", richesses: "riches", cicatrices: "scars", ruine: "ruins" };
const GROUPS = {
  ruins: ["door", "sealed_door", "bridge", "fallen_bridge", "tablet", "worn_tablet", "speaking_tablet", "lamp", "lit_lamp"],
  trees: ["grove", "great_tree", "ironwood", "charred_grove"],
  water: ["water", "brine", "meltwater"],
  rain: ["rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder"],
  fog: ["fog", "marsh_mist", "rime", "watching_mist"],
  wind: ["wind", "dust_storm", "ash_cloud", "spore_cloud"],
  moths: ["moth", "lantern_moths", "whispering_moths"], glow: ["glowvine", "wrong_glowvine"],
  riches: W.RICH_IDS, scars: W.SCAR_IDS,
  clouds: [], stars: [], // visuels seulement
};

/** `{ ruins: 2, rain: 0.4, gold: 2 }` (facteurs) ; null si aucune ligne de quantité. */
function parseAmounts(src) {
  let out = null;
  for (const line of String(src || "").split("\n")) {
    const m = line.match(AMOUNT_RE); if (!m) continue;
    for (const raw of m[2].split(/[,;]|\bet\b|\band\b/i)) {
      let k = raw.trim().toLowerCase().replace(/\s+/g, "_"); if (!k || !/^[a-zé_][a-zé0-9_]*$/.test(k)) continue;
      k = ALIAS[k] || k; (out = out || {})[k] = LEVELS[m[1].toLowerCase()];
    }
  }
  return out;
}

/** Facteur d'un bloc : sa propre ligne d'abord, puis celle de son groupe ; 1 par défaut. */
function factorOf(id, amt) {
  if (!amt) return 1;
  if (amt[id] != null) return amt[id];
  for (const g of Object.keys(GROUPS)) if (amt[g] != null && GROUPS[g].includes(id)) return amt[g];
  return 1;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** Applique un déplacement de coût par axe (positif = plus d'instabilité). Recalcule stabilité et verdict comme le moteur. */
function shift(r, byAxis) {
  const ax = { ...r.axisStability };
  for (const [a, d] of Object.entries(byAxis)) if (Math.abs(d) > 1e-9) ax[a] = clamp(Math.round((ax[a] == null ? 100 : ax[a]) - d * 100), 0, 100);
  const min = Math.min(...Object.values(ax));
  return { ...r, axisStability: ax, stability: min, verdict: min >= 75 ? "stable" : min >= 40 ? "unstable" : "dying" };
}

/**
 * Quantités et compensation sur une analyse du moteur.
 *  1. chaque bloc écrit dont le facteur n'est pas 1 déplace le coût de weight × (facteur − 1) ;
 *  2. les cicatrices rachètent une part du coût des richesses : RELIEF_PER_SCAR chacune (× leur facteur), au plus RELIEF_CAP du coût total des richesses.
 * @param blocks la table des blocs du moteur (id → bloc)
 */
function applyAmounts(r, amt, blocks) {
  if (!r || !r.axisStability || !r.resolved || !r.resolved.matter) return r;
  const written = r.resolved.matter.written || [], get = (id) => (blocks && blocks.get ? blocks.get(id) : null);
  const delta = {}; let rich = 0, relief = 0;
  for (const id of new Set(written)) {
    const b = get(id); if (!b) continue;
    const f = factorOf(id, amt);
    if (b.weight > 0 && f !== 1) delta[b.axis] = (delta[b.axis] || 0) + b.weight * (f - 1);
    if (W.RICH_IDS.includes(id)) rich += b.weight * f;
    if (W.SCAR_IDS.includes(id)) relief += W.RELIEF_PER_SCAR * f;
  }
  relief = Math.min(relief, rich * W.RELIEF_CAP);
  if (relief > 0) delta.geological = (delta.geological || 0) - relief;
  if (!Object.keys(delta).length) return r;
  const out = shift(r, delta); if (rich > 0) out.compensation = { riches: rich, relief };
  return out;
}

module.exports = { AMOUNT_RE, LEVELS, GROUPS, parseAmounts, factorOf, applyAmounts };
