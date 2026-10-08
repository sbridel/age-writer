"use strict";
/**
 * Blocs de terrain (après la 1.17.6) : des mots pour dire la forme du pays que montre la fenêtre de liaison.
 *   - RELIEF : `plains`, `hills`, `mountains`, `canyon` règlent le nombre, la hauteur et l'allure (douce ou en arêtes) des chaînes
 *     de la fenêtre générative (src/genscene.js, `RELIEF`) ; ils se contredisent entre eux (plaines contre montagnes : forte).
 *   - EAU : `river`, `delta`, `lake`, `marsh` allument l'eau et le rivage de la fenêtre (le marais ajoute de la brume) ; ils jurent avec un
 *     monde de désert ou de lave.
 * Ce sont des blocs du registre de ciel (comme les mondes-types et la géophysique) : ils pèsent sur l'axe cosmologique, convention
 * de tous les blocs de ce registre, ont leurs contradictions, leurs phrases et leurs exigences physiques (src/physics/blocks.js),
 * mais ne sont JAMAIS tirés au sort : les mondes déjà tirés ne changent pas.
 * Le désert existe déjà : c'est `desert_world` (monde-type) ou `sand`.
 */

const clash = (list) => list.map(([w, severity, condition]) => ({ with: w, severity, ...(condition ? { condition } : {}) }));
const block = (id, label, weight, contradictions) => ({ id, category: "terrain", label, axis: "cosmological", weight, proseTag: "#" + id + "#", contradictions: clash(contradictions) });

const SKY_BLOCKS = [
  block("plains", "Plains", 0.02, [["mountains", "strong"], ["hills", "medium"], ["canyon", "light"]]),
  block("hills", "Rolling hills", 0.02, [["mountains", "medium"], ["plains", "medium"]]),
  block("mountains", "Mountains", 0.03, [["plains", "strong"], ["hills", "medium"], ["ocean_world", "medium"], ["delta", "light"]]),
  block("canyon", "A canyon", 0.03, [["plains", "light"], ["ocean_world", "medium"]]),
  block("river", "A river", 0.02, [["desert_world", "medium"], ["lava_world", "light"], ["frozen_world", "light"]]),
  block("delta", "A river delta", 0.03, [["desert_world", "medium"], ["lava_world", "light"], ["frozen_world", "light"]]),
  block("lake", "A lake", 0.02, [["desert_world", "medium"], ["lava_world", "light"]]),
  block("marsh", "A marsh", 0.02, [["desert_world", "medium"], ["lava_world", "medium"], ["frozen_world", "light"]]),
];

const IDS = SKY_BLOCKS.map((b) => b.id);

/** Allure du relief dans la fenêtre générative : nombre de chaînes, facteur d'amplitude, arêtes vives (true / false), ou null = tirage habituel. */
const RELIEF = {
  plains: { ridges: 2, amp: 0.3, ridged: false },
  hills: { ridges: 3, amp: 0.6, ridged: false },
  mountains: { ridges: 4, amp: 1.7, ridged: true },
  canyon: { ridges: 2, amp: 1.2, ridged: true },
};
const WATER_IDS = ["river", "delta", "lake", "marsh"];

const SKY_PROSE = {
  plains: ["the land lies wide and low, and the horizon is all there is to look at", "a plain runs flat to the edge of sight, and the wind has nothing to stop it", "everything here is open: a low, long country under a very large sky"],
  hills: ["soft hills roll away in long, unhurried waves", "the land swells and settles, hill after green hill", "low ridges fold into one another, none in a hurry to become mountains"],
  mountains: ["mountains stand tall and sharp, and the sky has to go around them", "great peaks hold the horizon, cold and patient", "the land climbs in ridges toward summits that keep their own weather"],
  canyon: ["a canyon cuts deep into the land, and its walls remember every flood", "the ground splits into a gorge, its layers laid bare like pages", "a deep, carved gorge runs through the stone, and the echo comes back late"],
  river: ["a river winds through the land, clear and in no hurry", "water finds its long way downhill, and a river follows it", "a slow river keeps a thread of light across the country"],
  delta: ["the river splits into a hundred channels before it reaches the sea", "silt fans out in braided streams, and the land is still being made", "the water spreads into a wide, patient delta of mud and green"],
  lake: ["a lake lies still in its hollow, holding the whole sky", "a deep, quiet lake keeps its own counsel", "the water gathers in a bowl of land and does not move on"],
  marsh: ["the ground is half water, and every step is a negotiation", "a marsh breathes mist and green, neither land nor lake", "reeds and standing water blur the line between earth and pool"],
};

module.exports = { SKY_BLOCKS, SKY_PROSE, IDS, RELIEF, WATER_IDS };
