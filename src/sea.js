"use strict";
/**
 * Blocs de mer et d'acide (1.16.1) : `kelp` (forêt de varech), `coral` (récif), `acid` (acide qui ronge).
 * Nés de l'essai d'un Âge sous-marin (Ethanoic, Âge de récolte des Chimistes dans le lore des fans) où ces mots manquaient.
 * Comme tous les blocs ajoutés par l'extension, ils ne sont jamais tirés au sort ; ils ont leurs phrases, leurs réactions,
 * leurs exigences physiques (src/physics/blocks.js) et leur dessin dans la fenêtre générative (src/genscene.js).
 */
const BLOCKS = [
  { id: "kelp", d: ["swaying", "green", "tall"], w: 0.02, axis: "ecological", p: "kelp forests sway in the deep water, tall as towers and twice as patient" },
  { id: "coral", d: ["branching", "bright", "slow"], w: 0.03, axis: "ecological", p: "coral builds its slow, bright cities in the warm shallows" },
  { id: "acid", d: ["sour", "clear", "biting"], w: 0.05, axis: "geological", p: "an acid pools in the hollows, and the stone softens wherever it lies" },
];
const MATTER_BLOCKS = BLOCKS.map((b) => ({ id: b.id, descriptors: b.d, weight: b.w, axis: b.axis, writable: true, presence: b.p }));
/** Ce que l'acide ronge : la pierre se creuse, le fer rouille, l'eau devient amère, le corail blanchit en calcaire nu (sel). */
const REACTIONS = [
  { a: "acid", b: "stone", result: "hollowed_ground", type: "corrosive" },
  { a: "acid", b: "iron", result: "rust", type: "corrosive" },
  { a: "acid", b: "water", result: "bitter_water", type: "corrosive" },
  { a: "acid", b: "coral", result: "salt", type: "corrosive" },
];
const IDS = BLOCKS.map((b) => b.id);

module.exports = { MATTER_BLOCKS, REACTIONS, IDS };
