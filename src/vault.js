"use strict";
/**
 * La voûte (claude/DESIGN-voute-de-la-caverne.md) : sous une carapace de roche, la caverne laisse entrer une part du froid, de la chaleur
 * et de la lumière du dehors, jamais la pluie, l'éclair ni le vent. Une seule notion : sa solidité (ce qui est écrit au sol) × la taille du monde.
 * Fonctions pures. L'atténuation est un allègement (elle compte à tous les niveaux de rigueur) ; seule la fatigue d'une voûte faible
 * et vaste coûte, au poids de la famille « sol ».
 */
const WORLD = "cavern_world";
/** Solidité de ce qui porte la voûte : 3 forte, 2 moyenne, 1 faible. */
const SOLID = { stone: 3, iron: 3, crystal: 3, obsidian: 3, ice: 2, salt: 2, earth: 2, humus: 2, sand: 1, ash: 1, silt: 1, peat: 1 };
/** Part du dehors qui passe (facteur du coût de la contradiction), par solidité puis par taille. */
const LETS_IN = {
  strong: { small: 1 / 4, medium: 1 / 3, large: 1 / 2 },
  medium: { small: 1 / 3, medium: 1 / 2, large: 3 / 4 },
  weak: { small: 1 / 2, medium: 3 / 4, large: 0.9 },
};
/** Ce que la voûte laisse passer en partie : le froid, la chaleur, la roche en fusion, les soleils. */
const SEEPS = ["deep_cold", "heat", "lava", "geysers", "single_sun", "twin_suns", "green_sun", "red_sun", "white_sun", "blue_sun", "orange_sun", "violet_sun", "black_sun"];
/** Ce qu'elle ne laisse jamais passer : le ciel ouvert. */
const SHUT_OUT = ["rain", "drizzle", "storm", "thunderstorm", "lightning", "whispering_storm", "waiting_thunder", "wind", "hail", "black_hail", "snow", "dust_storm", "ash_cloud"];

/** { world, strength: "strong"|"medium"|"weak", size, lets } ; null sans caverne. Rien d'écrit au sol : solidité moyenne. */
function vaultOf(present, size) {
  if (!present || !present.has(WORLD)) return null;
  const solid = Object.keys(SOLID).filter((id) => present.has(id)).map((id) => SOLID[id]);
  const top = solid.length ? Math.max(...solid) : 2, strength = top >= 3 ? "strong" : top === 2 ? "medium" : "weak";
  const sz = LETS_IN[strength][size] != null ? size : "medium";
  return { world: WORLD, strength, size: sz, lets: LETS_IN[strength][sz] };
}
/** Facteur du coût d'une contradiction caverne ↔ bloc : la part qui passe pour le froid, la chaleur, la lumière ; 1 pour le reste. */
const attenuation = (v, blockId) => (v && SEEPS.includes(blockId) ? v.lets : 1);
/** Une voûte faible sous un monde vaste fatigue : c'est le seul cas qui coûte. */
const tired = (v) => !!v && v.strength === "weak" && v.size === "large";

const TEXT = {
  strong: ["the vault is thick rock: the outside reaches in only as a rumour", "la voûte est de la roche épaisse : le dehors n'entre que comme une rumeur"],
  medium: ["the vault holds, but the outside is felt through it", "la voûte tient, mais on sent le dehors à travers"],
  weak: ["the vault is loose and thin: much of the outside gets in", "la voûte est meuble et mince : une bonne part du dehors entre"],
  tired: ["the vault is tired: too wide a roof for such loose ground", "la voûte fatigue : un toit trop large pour un sol si meuble"],
};

module.exports = { WORLD, SOLID, LETS_IN, SEEPS, SHUT_OUT, vaultOf, attenuation, tired, TEXT };
