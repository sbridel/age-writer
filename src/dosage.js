"use strict";
/**
 * Le dosage : on peut écrire un Âge souple et complexe, à condition de doser.
 * Trois effets sur l'analyse du moteur (voir claude/DESIGN-dosage-et-stabilite.md) :
 *  1. la dose adoucit (`few:`) ou aggrave (`many:`) les contradictions de son bloc, selon sa portée :
 *     un élément local (eau, glace, arbres…) en petite quantité passe presque inaperçu, un élément global (pluie, brouillard, vent…)
 *     touche tout le ciel et clashe encore ;
 *  2. le temps qui s'enchaîne naturellement (pluie + vent → orage) et les transformations banales (rouille, obsidienne) ne sont plus punis ;
 *  3. la richesse a un budget par axe : au-delà, chaque charge de plus coûte davantage (pente douce).
 * Fonctions pures : elles rendent des déplacements de coût par axe, que `amounts.applyAmounts` applique avec le reste.
 */
const { REACTION_COST } = require("./engine/data/matter");

/** Coût des réactions « naturelles », par résultat (le moteur les compte plus cher : violent 0,1, corrosif 0,1). */
// (l'obsidienne reste violente : le chapitre 2 du mode histoire s'appuie sur eau + lave pour montrer un monde abîmé)
const NATURAL = { storm: 0.02, thunderstorm: 0.02, rust: 0.03 };

/** Un élément est global (touche tout le monde ou tout le ciel) s'il est de l'axe météo ; sinon local. */
const isGlobal = (block) => !!block && block.axis === "weather";

/**
 * Facteur de dose effectif d'une contradiction.
 *   f ≤ 1 (peu) : local f × 0,75 (0,4 → 0,3) ; global 1 − (1 − f) × 2/3 (0,4 → 0,6)
 *   f > 1 (beaucoup) : local 1 + (f − 1) / 2 (2 → 1,5) ; global f (2 → 2)
 */
function doseFactor(f, global) {
  if (f === 1) return 1;
  if (f < 1) return global ? 1 - (1 - f) * (2 / 3) : f * 0.75;
  return global ? f : 1 + (f - 1) / 2;
}

/** Budget de richesse : charge au-delà de CAPACITY par axe → coût EXTRA_LINEAR × e + EXTRA_QUAD × e². */
const CAPACITY = 6, EXTRA_LINEAR = 0.02, EXTRA_QUAD = 0.01;
const richnessCost = (load) => { const e = Math.max(0, load - CAPACITY); return EXTRA_LINEAR * e + EXTRA_QUAD * e * e; };

/**
 * @param r      l'analyse du moteur
 * @param factor (id) → facteur de quantité du bloc (1 sans ligne de quantité)
 * @param get    (id) → bloc du moteur
 * @returns { delta: {axe: coût}, softened: [...], natural: [...], richness: {axe: {load, extra}} }
 */
function dosage(r, factor, get) {
  const { CONTRADICTION_COST } = require("./engine/rules"); // à l'appel : rules.js lit sky.js, qui lit amounts.js, qui lit ce fichier
  const res = r && r.resolved; if (!res || !res.matter) return null;
  const reactions = res.matter.reactions || [], written = res.matter.written || [];
  const delta = {}, add = (axis, d) => { if (Math.abs(d) > 1e-9) delta[axis] = (delta[axis] || 0) + d; };

  // facteur d'un bloc dérivé : le produit de ses ingrédients ; local si l'un d'eux l'est (un peu d'eau fait un peu de brume)
  const by = new Map(reactions.map((x) => [x.result, x])), memo = new Map();
  const f = (id) => {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, 1); const re = by.get(id);
    const v = re ? Math.min(3, Math.max(0.1, f(re.a) * f(re.b))) : factor(id);
    memo.set(id, v); return v;
  };
  const global = (id) => { const re = by.get(id); return re ? global(re.a) && global(re.b) : isGlobal(get(id)); };

  // 2. réactions naturelles
  const natural = [];
  for (const re of reactions) {
    const nc = NATURAL[re.result]; if (nc == null) continue;
    const b = get(re.result); if (!b) continue;
    const old = re.cost != null ? re.cost : REACTION_COST[re.type];
    if (old !== nc) { add(b.axis, nc - old); natural.push({ id: re.result, axis: b.axis, from: old, to: nc }); }
  }

  // 1. la dose sur les contradictions de matière (règles ciel ↔ matière) ; les règles de fissure restent entières
  const softened = [];
  for (const c of res.triggered || []) {
    if (!c.note || !c.axis || c.a === "fissure" || /_fissure$/.test(c.a)) continue;
    const fb = f(c.b); if (fb === 1) continue;
    const base = CONTRADICTION_COST[c.severity]; if (!base) continue;
    const d = base * (doseFactor(fb, global(c.b)) - 1);
    add(c.axis, d); softened.push({ a: c.a, b: c.b, axis: c.axis, saved: -d });
  }

  // 3. budget de richesse : ce que le joueur a écrit lui-même (hors pages tirées)
  const drawn = new Set((res.drawn || []).map((p) => p.id)), load = {};
  for (const id of new Set(written)) {
    const b = get(id); if (!b || !(b.weight > 0) || drawn.has(id) || by.has(id)) continue;
    load[b.axis] = (load[b.axis] || 0) + factor(id);
  }
  const richness = {};
  for (const [axis, l] of Object.entries(load)) { const extra = richnessCost(l); if (extra > 0) { add(axis, extra); richness[axis] = { load: l, extra }; } }

  return { delta, softened, natural, richness };
}

/** La ligne du panneau : ce que le dosage a changé, en points de stabilité (« − » : l'Âge y gagne). */
function note(d, fr) {
  if (!d) return "";
  const pts = (x) => Math.round(x * 100), sgn = (n) => (n > 0 ? "+" : "\u2212") + Math.abs(n);
  const parts = [];
  const soft = new Map();
  for (const x of d.softened || []) soft.set(x.b, (soft.get(x.b) || 0) - pts(x.saved));
  const sf = [...soft].filter(([, v]) => v !== 0).map(([b, v]) => `${b} ${sgn(v)}`);
  if (sf.length) parts.push((fr ? "dosé : " : "dosed: ") + sf.join(", "));
  const nat = (d.natural || []).map((x) => `${x.id} ${sgn(pts(x.to - x.from))}`);
  if (nat.length) parts.push((fr ? "naturel : " : "natural: ") + nat.join(", "));
  const rich = Object.entries(d.richness || {}).map(([a, v]) => `${a} ${sgn(pts(v.extra))}`);
  if (rich.length) parts.push((fr ? "charge trop riche : " : "overloaded: ") + rich.join(", "));
  return parts.length ? (fr ? "Dosage \u00b7 " : "Dosage \u00b7 ") + parts.join(" \u00b7 ") : "";
}

module.exports = { NATURAL, CAPACITY, doseFactor, richnessCost, dosage, note };
