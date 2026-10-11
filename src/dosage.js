"use strict";
/**
 * Le dosage, selon les lois de l'écriture (claude/LOIS-DE-L-ECRITURE-DNI.md, lois 4 à 6) :
 * on peut écrire un Âge souple et complexe, à condition de doser. Trois effets sur l'analyse du moteur :
 *  1. l'ÉTENDUE (loi 4) : un clash entre le ciel et la matière coûte en proportion du contact entre les éléments,
 *       étendue = dose × taille du monde × biomes
 *     dose : `few` 0,4 · normal 1 · `many` 2 (la ligne de quantité) ; taille : `size: small | medium | large` (0,6 · 1 · 1,5) ;
 *     biomes : +15 % par famille de sol écrite au-delà de la première. Moins de 1 : le clash est adouci ; plus de 1 : il est aggravé.
 *  2. l'ENCHAÎNEMENT (loi 6) : le temps qui s'enchaîne (pluie + vent → orage) et les transformations banales (rouille) ne sont plus punis ;
 *  3. la MESURE (loi 5) : la richesse a un budget par axe ; au-delà, chaque charge de plus coûte davantage (pente douce).
 * Selon la rigueur (src/rigor.js), seuls les COÛTS EN PLUS comptent à proportion du poids de la famille « étendue » ;
 * ce qui allège un Âge (peu d'eau, orage naturel) compte toujours : en doux, le dosage ne rend jamais un Âge moins stable.
 * Fonctions pures : elles rendent des déplacements de coût par axe, que `amounts.applyAmounts` applique avec le reste.
 */
const { REACTION_COST } = require("./engine/data/matter");

/** Coût des réactions « naturelles », par résultat (le moteur les compte plus cher : violent 0,1, corrosif 0,1). */
// (l'obsidienne reste violente : le chapitre 2 du mode histoire s'appuie sur eau + lave pour montrer un monde abîmé)
const NATURAL = { storm: 0.02, thunderstorm: 0.02, rust: 0.03 };

// ---- taille du monde ----------------------------------------------------------------------------------------------
/** `size: small | medium | large` (taille du monde ; la taille de la fenêtre est `window_size`). */
const WORLD_SIZE_RE = /^\s*size\s*[:=]\s*(small|medium|large)\s*$/i;
const SIZE_FACTOR = { small: 0.6, medium: 1, large: 1.5 };
function worldSize(src) {
  let size = "medium";
  for (const line of String(src || "").split("\n")) { const m = line.match(WORLD_SIZE_RE); if (m) size = m[1].toLowerCase(); }
  return size;
}

// ---- biomes : une famille de sol écrite = un biome ----------------------------------------------------------------
const BIOME_STEP = 0.15;
const BIOMES = {
  desert: ["sand", "desert_world", "scorched_surface"],
  ice: ["deep_cold", "snow", "frozen_world"],
  water: ["water", "ocean_world", "kelp", "coral", "subsurface_ocean", "bitter_water", "submarine_fissure", "river", "delta", "lake", "marsh"],
  fire: ["lava", "lava_world", "molten_core", "geysers", "ash"],
  stone: ["stone", "iron", "crystal", "strange_stone", "hollowed_ground", "mountains", "canyon", "cavern_world"],
  forest: ["great_tree", "vine", "fern", "grass", "flowers", "garden", "jungle_world"],
  salt: ["salt"],
};
/** Nombre de biomes d'un Âge : les familles distinctes parmi ce qui est écrit (au moins 1). */
function biomeCount(written) {
  const w = new Set(written || []); let n = 0;
  for (const ids of Object.values(BIOMES)) if (ids.some((id) => w.has(id))) n++;
  return Math.max(1, n);
}
const biomeFactor = (n) => 1 + BIOME_STEP * (Math.max(1, n) - 1);

/** L'étendue d'un clash : dose × taille × biomes. */
const extent = (dose, size, biomes) => dose * (SIZE_FACTOR[size] || 1) * biomeFactor(biomes);

// ---- budget de richesse -------------------------------------------------------------------------------------------
/** Charge au-delà de CAPACITY par axe → coût EXTRA_LINEAR × e + EXTRA_QUAD × e². */
const CAPACITY = 6, EXTRA_LINEAR = 0.02, EXTRA_QUAD = 0.01;
const richnessCost = (load) => { const e = Math.max(0, load - CAPACITY); return EXTRA_LINEAR * e + EXTRA_QUAD * e * e; };

/**
 * @param r      l'analyse du moteur
 * @param factor (id) → facteur de quantité du bloc (1 sans ligne de quantité)
 * @param get    (id) → bloc du moteur
 * @param opts   { weight: poids de la famille « étendue » (0, 0,5 ou 1 ; 1 par défaut), size: "small" | "medium" | "large" }
 * @returns { delta: {axe: coût}, softened: [...], natural: [...], richness: {axe: {load, extra}}, extent: {size, biomes} }
 */
function dosage(r, factor, get, opts) {
  const { CONTRADICTION_COST } = require("./engine/rules"); // à l'appel : rules.js lit sky.js, qui lit amounts.js, qui lit ce fichier
  const res = r && r.resolved; if (!res || !res.matter) return null;
  const w = opts && opts.weight != null ? opts.weight : 1, size = (opts && opts.size) || "medium";
  const reactions = res.matter.reactions || [], written = res.matter.written || [];
  const delta = {}, add = (axis, d) => { if (Math.abs(d) > 1e-9) delta[axis] = (delta[axis] || 0) + d; };
  const biomes = biomeCount(written);
  const vault = require("./vault").vaultOf(new Set([...written, ...reactions.map((x) => x.result), ...(res.lines || []).map((l) => l.entry && l.entry.id).filter(Boolean)]), size); // la voûte de la caverne laisse passer une part du froid, de la chaleur et de la lumière

  // facteur de dose d'un bloc dérivé : le produit de ceux de ses ingrédients (un peu d'eau fait un peu de brume)
  const by = new Map(reactions.map((x) => [x.result, x])), memo = new Map();
  const f = (id) => {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, 1); const re = by.get(id);
    const v = re ? Math.min(3, Math.max(0.1, f(re.a) * f(re.b))) : factor(id);
    memo.set(id, v); return v;
  };

  // 2. enchaînement : les réactions naturelles coûtent moins (un allègement : il compte toujours)
  const natural = [];
  for (const re of reactions) {
    const nc = NATURAL[re.result]; if (nc == null) continue;
    const b = get(re.result); if (!b) continue;
    const old = re.cost != null ? re.cost : REACTION_COST[re.type];
    if (old !== nc) { add(b.axis, nc - old); natural.push({ id: re.result, axis: b.axis, from: old, to: nc }); }
  }

  // 1. étendue : les règles ciel ↔ matière ; les règles de fissure restent entières
  const softened = [];
  for (const c of res.triggered || []) {
    if (!c.note || !c.axis || c.a === "fissure" || /_fissure$/.test(c.a)) continue;
    const base = CONTRADICTION_COST[c.severity]; if (!base) continue;
    const e = extent(f(c.b), size, biomes) * (c.a === "cavern_world" ? require("./vault").attenuation(vault, c.b) : 1); if (e === 1) continue;
    const d = base * (e - 1) * (e < 1 ? 1 : w); // allègement : plein ; aggravation : au poids de la famille
    if (Math.abs(d) < 1e-9) continue;
    add(c.axis, d); softened.push({ a: c.a, b: c.b, axis: c.axis, saved: -d });
  }

  // 3. mesure : le budget de richesse (ce que le joueur a écrit lui-même, hors pages tirées) ; une pénalité, au poids de la famille
  const drawn = new Set((res.drawn || []).map((p) => p.id)), load = {};
  for (const id of new Set(written)) {
    const b = get(id); if (!b || !(b.weight > 0) || drawn.has(id) || by.has(id)) continue;
    load[b.axis] = (load[b.axis] || 0) + factor(id);
  }
  const richness = {};
  if (w > 0) for (const [axis, l] of Object.entries(load)) { const extra = richnessCost(l) * w; if (extra > 0) { add(axis, extra); richness[axis] = { load: l, extra }; } }

  return { delta, softened, natural, richness, extent: { size, biomes } };
}

/** La ligne du panneau : ce que le dosage a changé, en points de stabilité (« − » : l'Âge y gagne). */
function note(d, fr) {
  if (!d) return "";
  const pts = (x) => Math.round(x * 100), sgn = (n) => (n > 0 ? "+" : "−") + Math.abs(n);
  const parts = [];
  const soft = new Map();
  for (const x of d.softened || []) soft.set(x.b, (soft.get(x.b) || 0) - pts(x.saved));
  const sf = [...soft].filter(([, v]) => v !== 0).map(([b, v]) => `${b} ${sgn(v)}`);
  if (sf.length) parts.push((fr ? "étendue : " : "extent: ") + sf.join(", "));
  const nat = (d.natural || []).map((x) => `${x.id} ${sgn(pts(x.to - x.from))}`);
  if (nat.length) parts.push((fr ? "naturel : " : "natural: ") + nat.join(", "));
  const rich = Object.entries(d.richness || {}).map(([a, v]) => `${a} ${sgn(pts(v.extra))}`);
  if (rich.length) parts.push((fr ? "charge trop riche : " : "overloaded: ") + rich.join(", "));
  return parts.length ? "Dosage · " + parts.join(" · ") : "";
}

module.exports = { NATURAL, WORLD_SIZE_RE, SIZE_FACTOR, BIOMES, BIOME_STEP, CAPACITY, worldSize, biomeCount, biomeFactor, extent, richnessCost, dosage, note };
