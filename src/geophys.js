"use strict";
/**
 * Blocs de géophysique (1.16) : des mots pour écrire la physique d'un monde sans chiffres.
 *   - CIEL (cosmologique) : orbite serrée ou lointaine, monde jeune ou ancien, monde lourd ou léger ;
 *   - MATIÈRE (géologique) : noyau en fusion ou mort, geysers, failles, air épais ou mince, océan sous la glace.
 * Ils entrent dans le moteur comme les ciels étendus et les richesses : ils pèsent sur la stabilité, ont leurs
 * contradictions et leurs phrases, mais ne sont JAMAIS tirés au sort (les mondes déjà écrits ne changent pas).
 * La couche physique (src/physics/blocks.js) dit ce que chacun fixe et exige.
 */

const sky = (id, label, weight, clash) => ({ id, category: "body", label, axis: "cosmological", weight, proseTag: "#" + id + "#", contradictions: clash.map((w) => ({ with: w, severity: "strong" })) });

const SKY_BLOCKS = [
  sky("close_orbit", "A close orbit", 0.05, ["distant_orbit"]),
  sky("distant_orbit", "A distant orbit", 0.05, ["close_orbit"]),
  sky("young_world", "A young world", 0.06, ["ancient_world"]),
  sky("ancient_world", "An ancient world", 0.04, ["young_world"]),
  sky("heavy_world", "A heavy world", 0.05, ["light_world"]),
  sky("light_world", "A light world", 0.04, ["heavy_world"]),
];

const SKY_PROSE = {
  close_orbit: ["the sun is large and fierce here, and the noon is long and white", "the star hangs close and wide, and summer is the season it knows best", "close to its star, the world takes its light in great hot measures"],
  distant_orbit: ["the sun is small and far, a hard bright coin in a dark blue sky", "the year is long, and the sun gives light more than warmth", "far from its star, the world keeps its own slow and careful seasons"],
  young_world: ["the world is young, and the ground has not finished deciding its shape", "everything here is new: the mountains are sharp and the rocks still warm", "a young world, restless underfoot, where nothing has had time to wear down"],
  ancient_world: ["the world is old, its mountains worn round by more years than can be counted", "an ancient world, quiet to its core, where even the stones seem tired", "the hills are low and soft here, sanded down by deep time"],
  heavy_world: ["the world is heavy, and every step is an argument with the ground", "gravity presses hard here: the hills are low and the trees broad", "a heavy world, where nothing climbs high and everything stands squat and strong"],
  light_world: ["the world is light, and a stone thrown up takes its time coming down", "gravity is gentle here: the peaks are tall and the strides long", "a light world, where cliffs rise impossibly high and dust hangs in the air"],
};

const GEO = [
  { id: "molten_core", d: ["deep", "turning", "molten"], w: 0.03, p: "far below, the core still turns molten, and every compass agrees on north" },
  { id: "dead_core", d: ["cold", "still", "solid"], w: 0.04, p: "the heart of this world has cooled and stopped; no compass finds its north" },
  { id: "geysers", d: ["hissing", "hot", "sudden"], w: 0.04, p: "hot springs steam in the hollows, and now and then a geyser throws water at the sky" },
  { id: "rifts", d: ["split", "trembling", "deep"], w: 0.05, p: "long rifts split the ground, and the land trembles as its plates slide past each other" },
  { id: "thick_air", d: ["heavy", "dense", "warm"], w: 0.03, p: "the air is thick enough to lean on, and sound carries far in it" },
  { id: "thin_air", d: ["thin", "cold", "clear"], w: 0.04, p: "the air is thin and sharp, and the sky above is almost black at noon" },
  { id: "subsurface_ocean", d: ["hidden", "dark", "deep"], w: 0.04, p: "beneath the ice lies a hidden ocean, warmed from below, that has never seen the sky" },
];
const MATTER_BLOCKS = GEO.map((b) => ({ id: b.id, descriptors: b.d, weight: b.w, axis: "geological", writable: true, presence: b.p }));
const IDS = [...SKY_BLOCKS.map((b) => b.id), ...GEO.map((b) => b.id)];

module.exports = { SKY_BLOCKS, SKY_PROSE, MATTER_BLOCKS, IDS };
