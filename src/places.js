"use strict";
/**
 * Lieux et habitants (1.18.0) : quatre blocs nés de l'essai d'un jardin privé (Vespertine, dans la campagne fan « Unwritten »).
 *   - `library`, `ruined_library`, `garden` : des traces de bâtisseurs (axe métaphysique), la physique les lit comme des ruines ;
 *   - `spiders` : des tisseuses de soie, farouches devant la lumière (axe écologique), qui ont besoin de proies.
 * Comme tous les blocs ajoutés par l'extension, ils ne sont jamais tirés au sort ; un bloc de la bibliothèque personnelle
 * qui reprend leur identifiant les remplace.
 */
const BLOCKS = [
  { id: "ruined_library", d: ["ruined", "open", "poor"], w: 0.04, axis: "metaphysical", p: "a library with no roof, its shelves open to the sky" },
  { id: "library", d: ["rich", "closed", "hushed"], w: 0.03, axis: "metaphysical", p: "a library of linking books, shut and full" },
  { id: "garden", d: ["beautiful", "fragrant", "labyrinthine"], w: 0.03, axis: "metaphysical", p: "many kinds of flowers grow here, a good place to wander and lose oneself" },
  { id: "spiders", d: ["patient", "silken", "light-shy"], w: 0.03, axis: "ecological", p: "pale threads gather in the dark, and the light sends them away" },
];
const MATTER_BLOCKS = BLOCKS.map((b) => ({ id: b.id, descriptors: b.d, weight: b.w, axis: b.axis, writable: true, presence: b.p }));
const IDS = BLOCKS.map((b) => b.id);
/** Les trois lieux bâtis (la physique les lit comme des traces de bâtisseurs). */
const BUILT_IDS = ["ruined_library", "library", "garden"];

module.exports = { MATTER_BLOCKS, IDS, BUILT_IDS };
