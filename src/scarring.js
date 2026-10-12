"use strict";
/**
 * Le tiré et les cicatrices (claude/DESIGN-capacite-et-coherence.md, chantier 2 ; loi 3, Description).
 * Ce qui est tiré n'est pas une contrainte du joueur : c'est la part du monde qui cherche à se stabiliser au tirage.
 *  - un clash LÉGER qui touche une page tirée ne coûte rien ;
 *  - un clash MOYEN ou FORT qui touche une page tirée ne coûte plus son prix : le monde se génère quand même, mais garde une CICATRICE,
 *    une par axe, qui dit quelle incohérence a eu lieu ; elle coûte un peu (TAX, selon son intensité) ;
 *  - intensité : moyen → légère, fort → normale, plusieurs clashs forts sur le même axe → profonde ;
 *  - elle se soigne par l'écriture : écrire (ou retirer) ce qui fait le clash le fait disparaître, et la cicatrice avec.
 * Les clashs entre pages écrites restent entiers : c'est le choix de l'écrivain.
 * Fonction pure : elle rend des déplacements de coût par axe et les cicatrices produites.
 */
const LEVEL = { light: 0.4, normal: 1, deep: 2 }; // le facteur de quantité (`few` / normal / `many`) : la fenêtre dessine plus ou moins de marques
const TAX = { light: 0.05, normal: 0.1, deep: 0.2 }; // ce que coûte la cicatrice, au lieu du clash
const RELIEF = { light: 0.8, normal: 1, deep: 1.25 }; // l'allègement d'une cicatrice sur le coût des richesses, selon son intensité
const RANK = { light: 0, normal: 1, deep: 2 };

const FIRE = ["lava", "lava_world", "molten_core", "ash", "geysers", "rifts", "desert_world", "sand", "heat", "scorching"];
const WET = ["water", "ocean_world", "brine", "meltwater", "acid", "marsh", "lake", "river", "rain"];
/** La cicatrice d'un axe, selon la cause. */
function scarFor(axis, c) {
  const ids = [c.a, c.b];
  if (axis === "cosmological") return "ashen_sky";
  if (axis === "weather") return "held_rain";
  if (axis === "metaphysical") return "mute_ruins";
  if (axis === "ecological") return ids.some((id) => FIRE.includes(id)) ? "poisoned_air" : "barren_soil";
  return ids.some((id) => FIRE.includes(id)) ? "scorched_surface" : ids.some((id) => WET.includes(id)) ? "bitter_water" : "hollowed_ground";
}

/**
 * @param res  l'analyse résolue du moteur (`r.resolved`)
 * @param cost la table des coûts de contradiction (light, medium, strong)
 * @returns null si aucun clash ne touche une page tirée ; sinon { delta: { axe: coût }, scars: [{ id, axis, level, from: [{ a, b, severity }] }], forgiven: [{ a, b }] }
 */
function scarring(res, cost) {
  if (!res || !res.triggered || !res.drawn || !res.drawn.length) return null;
  const drawn = new Set(res.drawn.map((p) => p.id)), delta = {}, byAxis = {}, forgiven = [];
  const add = (axis, d) => { delta[axis] = (delta[axis] || 0) + d; };
  for (const c of res.triggered) {
    if (!drawn.has(c.a) && !drawn.has(c.b)) continue;
    const axis = c.axis || "cosmological", base = cost[c.severity]; if (!base) continue;
    add(axis, -base); // le clash ne coûte plus son prix
    if (c.severity === "light") { forgiven.push({ a: c.a, b: c.b }); continue; }
    (byAxis[axis] = byAxis[axis] || []).push(c);
  }
  const scars = [];
  for (const [axis, cs] of Object.entries(byAxis)) {
    const strong = cs.filter((c) => c.severity === "strong").length;
    const level = strong >= 2 ? "deep" : strong === 1 ? "normal" : "light";
    const worst = cs.find((c) => c.severity === "strong") || cs[0];
    scars.push({ id: scarFor(axis, worst), axis, level, from: cs.map((c) => ({ a: c.a, b: c.b, severity: c.severity })) });
    add(axis, TAX[level]);
  }
  if (!scars.length && !forgiven.length) return null;
  return { delta, scars, forgiven };
}

/** Deux cicatrices du même nom (deux axes, même cause) : on garde la plus profonde. */
function merge(scars) {
  const m = new Map();
  for (const s of scars) { const o = m.get(s.id); if (!o || RANK[s.level] > RANK[o.level]) m.set(s.id, o ? { ...s, from: [...o.from, ...s.from] } : s); }
  return [...m.values()];
}

module.exports = { LEVEL, TAX, RELIEF, scarFor, scarring, merge };
