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
const DS = require("./dosage");
const LF = require("./life");
const SC = require("./scarring");

const LEVELS = { many: 2, much: 2, lots: 2, plenty: 2, beaucoup: 2, few: 0.4, little: 0.4, peu: 0.4, normal: 1 };
const LV_SRC = "many|much|lots|plenty|beaucoup|few|little|peu|normal";
// `few: water` (la quantité d'abord) ou `water: few` (le bloc d'abord) ; plusieurs blocs : `few: water, rain` / `water, rain: few`
const AMOUNT_RE = new RegExp("^\\s*(?:(" + LV_SRC + ")\\s*[:=]\\s*(.+?)|([a-zé_][a-zé0-9_ ,;]*?)\\s*[:=]\\s*(" + LV_SRC + "))\\s*$", "i");
const ALIAS = { ruines: "ruins", arbres: "trees", arbre: "trees", eau: "water", pluie: "rain", brume: "fog", vent: "wind", nuages: "clouds", etoiles: "stars", étoiles: "stars", papillons: "moths", lueurs: "glow", richesses: "riches", cicatrices: "scars", ruine: "ruins" };
const GROUPS = {
  ruins: ["door", "sealed_door", "bridge", "fallen_bridge", "tablet", "worn_tablet", "speaking_tablet", "lamp", "lit_lamp"],
  trees: ["grove", "great_tree", "ironwood", "charred_grove"],
  water: ["water", "brine", "meltwater"],
  rain: ["rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder", "drizzle"],
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
    const level = LEVELS[(m[1] || m[4]).toLowerCase()], names = m[2] || m[3];
    for (const raw of names.split(/[,;]|\bet\b|\band\b/i)) {
      let k = raw.trim().toLowerCase().replace(/\s+/g, "_"); if (!k || !/^[a-zé_][a-zé0-9_]*$/.test(k)) continue;
      k = ALIAS[k] || k; (out = out || {})[k] = level;
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
 * @param opts   { weights: poids des familles de lois (src/rigor.js), size: taille du monde } ; sans lui, plein poids et monde moyen
 */
function applyAmounts(r, amt, blocks, opts) {
  if (!r || !r.axisStability || !r.resolved || !r.resolved.matter) return r;
  const written = r.resolved.matter.written || [], get = (id) => (blocks && blocks.get ? blocks.get(id) : null);
  const delta = {}, excess = []; let rich = 0, relief = 0;
  for (const id of new Set(written)) {
    const b = get(id); if (!b) continue;
    const f = factorOf(id, amt);
    if (b.weight > 0 && f !== 1) delta[b.axis] = (delta[b.axis] || 0) + b.weight * (f - 1);
    if (b.weight > 0 && f > 1) excess.push({ id, prose: `there is far too much ${id.replace(/_/g, " ")} here` }); // « many: X » coûte : la description le dit
    if (W.RICH_IDS.includes(id)) rich += b.weight * f;
    if (W.SCAR_IDS.includes(id)) relief += W.RELIEF_PER_SCAR * f;
  }
  // le tiré et les cicatrices (src/scarring.js) : un léger clash tiré ne coûte rien, une grosse incohérence tirée laisse une cicatrice
  const { CONTRADICTION_COST } = require("./engine/rules"); // à l'appel : rules.js lit sky.js, qui lit ce fichier
  const sc = SC.scarring(r.resolved, CONTRADICTION_COST), scars = sc ? SC.merge(sc.scars).filter((x) => !written.includes(x.id)) : [];
  if (sc) for (const [a, d] of Object.entries(sc.delta)) delta[a] = (delta[a] || 0) + d;
  for (const x of scars) relief += W.RELIEF_PER_SCAR * SC.RELIEF[x.level]; // l'allègement suit l'intensité (0,8 / 1 / 1,25)
  relief = Math.min(relief, rich * W.RELIEF_CAP);
  if (relief > 0) delta.geological = (delta.geological || 0) - relief;
  // le dosage selon les lois : étendue des contradictions, réactions naturelles, budget de richesse. `opts` : { weights (src/rigor.js), size }
  const dose = DS.dosage(r, (id) => factorOf(id, amt), get, { weight: opts && opts.weights ? opts.weights.extent : 1, size: opts && opts.size });
  if (dose) for (const [a, d] of Object.entries(dose.delta)) delta[a] = (delta[a] || 0) + d;
  // la vie et le sol : la boucle, les échelles, le sol, l'énergie. Une phrase toujours ; un coût selon le poids des familles « vie » et « sol »
  const present = new Set([...written, ...(r.resolved.matter.reactions || []).map((x) => (x && x.result) || x), ...(r.resolved.lines || []).map((l) => l.entry && l.entry.id).filter(Boolean)]);
  const life = LF.laws(present, { weights: opts && opts.weights, size: opts && opts.size, seed: opts && opts.seed, factor: (id) => factorOf(id, amt) });
  const bl = life && life.notes.find((n) => n.id === "blight");
  if (life) for (const [a, d] of Object.entries(life.delta)) { const own = bl && a === "ecological" ? bl.cost : 0; if (d - own > 0) delta[a] = (delta[a] || 0) + d - own; }
  // la maladie du vivant (src/life.js) : elle se montre comme une cicatrice (livre, fenêtre, description), sans alléger les richesses.
  // Son coût a un plancher : elle ne fait jamais passer sous 75 un monde qui tenait sans elle (stable), seulement s'enfoncer s'il était déjà instable
  if (bl) {
    const base = clamp(Math.round((r.axisStability.ecological == null ? 100 : r.axisStability.ecological) - (delta.ecological || 0) * 100), 0, 100);
    const room = base >= 75 ? (base - 75) / 100 : Infinity;
    const cost = Math.min(bl.cost, room);
    if (cost > 1e-9) delta.ecological = (delta.ecological || 0) + cost;
    bl.paid = cost;
  }
  if (bl) scars.push({ id: "blight", axis: "ecological", level: bl.level, role: bl.role, host: bl.host, key: bl.key, prose: LF.blightProse(bl), from: [] });
  if (!Object.keys(delta).length && !life && !scars.length && !excess.length) return r;
  const out = Object.keys(delta).length ? shift(r, delta) : { ...r }; if (rich > 0) out.compensation = { riches: rich, relief };
  if (scars.length) { out.scars = scars; out.resolved = { ...out.resolved, scars }; } // lues par la description, le livre et la fenêtre
  if (excess.length) { out.excess = excess; out.resolved = { ...out.resolved, excess }; } // lu par la description
  if (sc && sc.forgiven.length) out.forgiven = sc.forgiven;
  if (life) out.life = life;
  if (dose && (dose.softened.length || dose.natural.length || Object.keys(dose.richness).length)) out.dosage = { softened: dose.softened, natural: dose.natural, richness: dose.richness, capacity: dose.capacity };
  return out;
}

module.exports = { AMOUNT_RE, LEVELS, GROUPS, parseAmounts, factorOf, applyAmounts };
