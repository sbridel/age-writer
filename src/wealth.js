"use strict";
/**
 * Richesses et cicatrices : douze blocs de matière ajoutés au moteur (build.js les ajoute à sa liste de blocs de matière).
 *  - RICHESSES (or, argent…) : un coût géologique important. Un monde riche est un monde convoité, donc fragile.
 *  - CICATRICES (surface calcinée, air empoisonné…) : aucun coût propre, mais elles COMPENSENT en partie celui des richesses :
 *    il en faut plusieurs pour racheter une seule richesse, et jamais plus de 75 % du total (voir amounts.js).
 * Comme tous les blocs ajoutés par l'extension, ils ne sont jamais tirés au sort.
 */
const RICH = [
  { id: "gold", d: ["heavy", "bright", "patient"], w: 0.09, p: "veins of gold run through the stone, and they are not as quiet as they look", c: [255, 205, 90] },
  { id: "silver", d: ["pale", "cold", "patient"], w: 0.06, p: "a pale metal threads the rock, cold even in sunlight", c: [215, 226, 242] },
  { id: "copper", d: ["warm", "dull", "heavy"], w: 0.03, p: "copper stains the stones green wherever the water has touched it", c: [214, 124, 72] },
  { id: "gems", d: ["hard", "bright", "scattered"], w: 0.07, p: "gemstones lie scattered like seeds that no one planted", c: [150, 230, 255] },
  { id: "pearls", d: ["pale", "round", "quiet"], w: 0.05, p: "pearls lie in the shallows, round and quietly lit", c: [255, 236, 240] },
  { id: "rare_ore", d: ["dense", "violet", "humming"], w: 0.08, p: "a dense ore hums in the dark, worth more than the ground can bear", c: [190, 140, 255] },
];
const SCARS = [
  { id: "scorched_surface", d: ["black", "brittle", "still"], p: "the ground is scorched, and quiet for it" },
  { id: "poisoned_air", d: ["thin", "sour", "still"], p: "the air is thin and sour, and nothing lingers in it" },
  { id: "barren_soil", d: ["pale", "cracked", "silent"], p: "the soil is barren, and keeps nothing it is given" },
  { id: "bitter_water", d: ["cold", "green", "bitter"], p: "the water is bitter, and no one has drunk it twice" },
  { id: "hollowed_ground", d: ["hollow", "dark", "echoing"], p: "the ground sounds hollow, as if something had already been taken from it" },
  { id: "ashen_sky", d: ["grey", "low", "falling"], p: "ash falls without wind, from a sky that has given up" },
];
const RICH_IDS = RICH.map((b) => b.id), SCAR_IDS = SCARS.map((b) => b.id);
/** Blocs de matière au format du moteur : { id, descriptors, weight, axis, writable, presence }. */
const MATTER_BLOCKS = [
  ...RICH.map((b) => ({ id: b.id, descriptors: b.d, weight: b.w, axis: "geological", writable: true, presence: b.p })),
  ...SCARS.map((b) => ({ id: b.id, descriptors: b.d, weight: 0, axis: "geological", writable: true, presence: b.p })),
];
const RICH_COLOR = Object.fromEntries(RICH.map((b) => [b.id, b.c]));
/** Compensation : ce que rachète chaque cicatrice (en coût), et part maximale du coût des richesses qu'on peut racheter. */
const RELIEF_PER_SCAR = 0.03, RELIEF_CAP = 0.75;

module.exports = { RICH_IDS, SCAR_IDS, MATTER_BLOCKS, RICH_COLOR, RELIEF_PER_SCAR, RELIEF_CAP };
