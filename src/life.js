"use strict";
/**
 * La vie et le sol (claude/DESIGN-energie-echelles-de-vie.md, DESIGN-faune-par-milieu.md, LOIS-DE-L-ECRITURE-DNI.md sections 4 et 5) :
 *   1. les BLOCS : micro-vie, mycélium, arbustes, faune par milieu, sols (comme `sea.js`, ils ne sont jamais tirés au sort) ;
 *   2. les RÔLES de la chaîne vivante (producteur, herbivore, carnivore, nécrophage, décomposeur, butineur), avec des rôles secondaires tenus moins bien ;
 *   3. les LOIS : la boucle vie ↔ mort doit se refermer, chaque échelle repose sur celle du dessous, le sol porte ou non ce qu'on pose dessus,
 *      l'énergie vient de plusieurs sources. Chaque loi dit une phrase ; elle ne coûte de la stabilité qu'à proportion du poids des familles « vie » et « sol »
 *      de la rigueur (src/rigor.js) : en doux, rien ne coûte. Fonctions pures.
 */
const BLOCKS = [
  // micro-vie
  { id: "plankton", d: ["teeming", "green", "tiny"], w: 0.02, axis: "ecological", p: "plankton clouds the water, green and teeming, too small to be seen one by one" },
  { id: "microbial_mat", d: ["slick", "layered", "warm"], w: 0.02, axis: "ecological", p: "a slick, layered mat of microbes lives on the warm bottom, feeding on heat and stone" },
  { id: "mycelium", d: ["threading", "hidden", "fine"], w: 0.02, axis: "ecological", p: "a fine mycelium threads the ground out of sight, carrying the dead back to the soil" },
  // arbustes : trois sortes, pour que la succession ait des étapes lisibles
  { id: "berry_shrub", d: ["bearing", "low", "sweet"], w: 0.02, axis: "ecological", p: "low shrubs bear sweet berries in the shelter of the older growth" },
  { id: "thorn_bush", d: ["thorny", "dense", "stubborn"], w: 0.02, axis: "ecological", p: "thorn bushes cling to poor ground, dense and stubborn" },
  { id: "heath_shrub", d: ["wiry", "wind-bent", "purple"], w: 0.02, axis: "ecological", p: "wiry heath bends in the wind, purple over thin soil" },
  // faune par milieu : `hunter` reste le carnivore généraliste
  { id: "shoal", d: ["silvery", "darting", "shy"], w: 0.03, axis: "ecological", p: "a silvery shoal darts through the water and scatters at a shadow" },
  { id: "raptor", d: ["keen", "circling", "distant"], w: 0.04, axis: "ecological", p: "a keen shape circles high above, distant and patient" },
  { id: "deep_hunter", d: ["sleek", "cold", "restless"], w: 0.05, axis: "ecological", p: "something sleek and cold hunts the deep water, never quite at rest" },
  { id: "cave_stalker", d: ["pale", "blind", "patient"], w: 0.05, axis: "ecological", p: "a pale, blind stalker waits in the dark of the caves" },
  { id: "carrion_beetle", d: ["dark", "dutiful", "buried"], w: 0.02, axis: "ecological", p: "dark beetles bury what dies, dutiful under the leaves" },
  { id: "bee", d: ["golden", "humming", "busy"], w: 0.03, axis: "ecological", p: "golden bees hum from flower to flower, busy all the day" },
  // sols qui naissent de la vie (on peut aussi les écrire sur un monde assez vieux)
  { id: "earth", d: ["loose", "brown", "warm"], w: 0.02, axis: "geological", p: "loose brown earth lies over the stone, warm where the light reaches" },
  { id: "humus", d: ["dark", "rich", "crumbling"], w: 0.01, axis: "geological", p: "dark humus crumbles under the roots, rich with everything that died here" },
  { id: "peat", d: ["spongy", "dark", "damp"], w: 0.03, axis: "geological", p: "spongy black peat holds the marsh together, and holds its water" },
];
// la caverne : l'algue qui s'éclaire seule, et la capsule de nutriments (un amendement qui se dose)
BLOCKS.push(
  { id: "glow_algae", d: ["luminous", "slimy", "cold"], w: 0.02, axis: "ecological", p: "a cold, slimy algae glows in the water, the only lamp for a long way" },
  { id: "pellet", d: ["compact", "dull", "dense"], w: 0.02, axis: "ecological", p: "a dull, dense pellet of nutrients lies in the ground, waiting to be dissolved" },
);
const MATTER_BLOCKS = BLOCKS.map((b) => ({ id: b.id, descriptors: b.d, weight: b.w, axis: b.axis, writable: true, presence: b.p }));
/** Ce qui naît de la rencontre : jamais écrit, toujours produit (poids 0). */
const PRODUCED = [
  { id: "mushroom", d: ["capped", "damp", "quiet"], axis: "ecological", p: "mushrooms rise where the mycelium has found enough water, capped and quiet" },
  { id: "aeroplankton", d: ["airborne", "faint", "glittering"], axis: "ecological", p: "a faint life drifts in the mist itself, glittering where the light catches it" },
  { id: "soil_bacteria", d: ["unseen", "tireless", "ancient"], axis: "ecological", p: "unseen bacteria work the silt, tireless and ancient" },
  { id: "humming_blooms", d: ["golden", "humming", "open"], axis: "ecological", p: "the flowers hum with bees, each one opening for a visitor" },
  { id: "glowing_mushroom", d: ["luminous", "cool", "patient"], axis: "ecological", p: "mushrooms glow in the dark, cool and patient, lighting nothing but themselves" },
  { id: "singing_mushroom", d: ["singing", "thin", "clear"], axis: "ecological", p: "the mushrooms sing, thin and clear, a note for each cap" },
].map((b) => ({ id: b.id, descriptors: b.d, weight: 0, axis: b.axis, writable: false, presence: b.p }));
MATTER_BLOCKS.push(...PRODUCED);
const REACTIONS = [
  { a: "mycelium", b: "water", result: "mushroom", type: "growing" },
  { a: "spore_cloud", b: "fog", result: "aeroplankton", type: "soothing" }, // le vent porte les spores, la brume les garde : la seconde étape de la chaîne
  { a: "spore", b: "silt", result: "soil_bacteria", type: "feeding" },
  { a: "lichen", b: "soil_bacteria", result: "earth", type: "growing" },
  { a: "earth", b: "mycelium", result: "humus", type: "growing" },
  { a: "moss", b: "marsh", result: "peat", type: "growing" },
  { a: "bee", b: "flowers", result: "humming_blooms", type: "growing" },
];
/** Les variantes rares du champignon : lumineux avec `strange_stone` (comme toutes les variantes du moteur), chantant avec un cristal. */
const VARIANTS = [
  { base: "mushroom", variant: "glowing_mushroom", catalyst: "strange_stone" },
  { base: "mushroom", variant: "singing_mushroom", catalyst: "crystal" },
];
const IDS = [...BLOCKS.map((b) => b.id), ...PRODUCED.map((b) => b.id)];

// ---- les rôles -------------------------------------------------------------------------------------------------------------
const ROLES = {
  producer: ["seed", "sapling", "fern", "vine", "great_tree", "grove", "ironwood", "grass", "meadow", "flowers", "kelp", "coral", "glowvine", "cinderbloom", "plankton", "glow_algae", "microbial_mat", "berry_shrub", "thorn_bush", "heath_shrub", "moss", "lichen", "singing_lichen"],
  herbivore: ["grazer", "burrower", "drifter", "shoal", "herd", "watching_herd"],
  carnivore: ["hunter", "stalking_pack", "spiders", "raptor", "deep_hunter", "cave_stalker"],
  scavenger: ["carrion_beetle"],
  decomposer: ["pale_fungus", "mycelium", "mushroom", "soil_bacteria"],
  pollinator: ["bee", "moth", "lantern_moths", "whispering_moths"],
};
/** Les rôles secondaires : l'espèce les tient, moins bien (polyvalents). */
const SECONDARY = { moth: ["scavenger"], hunter: ["scavenger"], burrower: ["decomposer"], raptor: ["scavenger"], cave_stalker: ["decomposer"] };
// ---- les échelles : micro < macro < géant (le géant viendra avec le catalogue de Catherine) --------------------------------
const MICRO = ["spore", "spore_cloud", "pale_fungus", "lichen", "singing_lichen", "moss", "plankton", "glow_algae", "microbial_mat", "mycelium", "mushroom", "soil_bacteria", "aeroplankton", "earth", "humus", "peat", "silt",
  // l'eau porte ses microbes : un monde mouillé n'est jamais sans petite vie
  "water", "brine", "meltwater", "marsh", "lake", "river", "delta", "fog", "marsh_mist", "rain"];
const BIG_TREES = ["great_tree", "grove", "ironwood"];
// ---- le sol : solidité, fertilité, humidité (0 nulle ou basse … 3 forte) -------------------------------------------------
const SOIL = {
  stone: { sol: 3, fer: 0, hum: 1 }, sand: { sol: 1, fer: 1, hum: 0 }, salt: { sol: 2, fer: 0, hum: 0 }, ash: { sol: 1, fer: 3, hum: 1 }, silt: { sol: 2, fer: 3, hum: 3 },
  earth: { sol: 2, fer: 2, hum: 2 }, humus: { sol: 3, fer: 3, hum: 2 }, peat: { sol: 1, fer: 2, hum: 3 }, iron: { sol: 3, fer: 0, hum: 1 }, crystal: { sol: 3, fer: 0, hum: 0 },
};
// ---- l'énergie : plusieurs sources ----------------------------------------------------------------------------------------
const VAULT = require("./vault");
const LIGHT = ["single_sun", "twin_suns", "red_sun", "orange_sun", "white_sun", "blue_sun", "green_sun", "violet_sun", "glowvine", "glow_algae"];
const HEAT = ["lava", "lava_world", "molten_core", "geysers", "rifts", "ash"];
const CHEM = ["acid", "brine", "iron", "bitter_water"];

const COST = { openLoop: 0.05, thinLoop: 0.02, noMicro: 0.03, weakGround: 0.06, noEarth: 0.04, noLight: 0.03, noHeat: 0.03, noPollinator: 0.02, overdose: 0.05, tiredVault: 0.05 };
const TEXT = {
  openLoop: ["nothing returns the dead to the soil: the loop is open", "rien ne rend les morts au sol : la boucle est ouverte"],
  thinLoop: ["the loop closes, but thinly: the dead are returned by a side-job", "la boucle se referme, mais mal : les morts reviennent au sol par un rôle d'appoint"],
  noMicro: ["the large lives on nothing small: no microbe, no mould, nothing to start from", "le grand vit sur rien de petit : ni microbe, ni moisissure, rien d'où partir"],
  weakGround: ["the ground is too loose to bear such a tree", "le sol est trop meuble pour porter un tel arbre"],
  noEarth: ["roots find no earth here, and nothing is making any", "les racines ne trouvent pas de terre ici, et rien n'en fait"],
  noLight: ["the plankton has no light to live on", "le plancton n'a pas de lumière pour vivre"],
  noHeat: ["the mat feeds on heat or chemistry, and there is none", "le tapis se nourrit de chaleur ou de chimie, et il n'y en a pas"],
  overdose: ["too much pellet: it burns the roots it was meant to feed", "trop de granulés : ils brûlent les racines qu'ils devaient nourrir"],
  fedPellet: ["the pellet dissolves slowly and feeds what grows around it", "le granulé se dissout lentement et nourrit ce qui pousse autour"],
  vaultStrong: [VAULT.TEXT.strong[0], VAULT.TEXT.strong[1]], vaultMedium: [VAULT.TEXT.medium[0], VAULT.TEXT.medium[1]], vaultWeak: [VAULT.TEXT.weak[0], VAULT.TEXT.weak[1]],
  tiredVault: [VAULT.TEXT.tired[0], VAULT.TEXT.tired[1]],
  noPollinator: ["the flowers have no one to carry them from bloom to bloom", "les fleurs n'ont personne pour les porter d'une corolle à l'autre"],
};

/**
 * @param present   l'ensemble des blocs présents (écrits ou produits)
 * @param o.weights { life, soil } : les poids des familles de la rigueur (0 en doux)
 * @param o.factor   (id) → facteur de quantité du bloc (`few` 0,4, `many` 2) ; o.size : la taille du monde (la voûte)
 * @returns null s'il n'y a rien à dire, sinon { delta: { axe: coût }, notes: [{ id, cost }] } ; `delta` est en proportion du poids de la famille
 */
function laws(present, o) {
  const has = (list) => list.some((id) => present.has(id)), hasRole = (role) => ROLES[role].some((id) => present.has(id));
  const wl = o && o.weights ? o.weights.life || 0 : 0, ws = o && o.weights ? o.weights.soil || 0 : 0;
  const notes = [], add = (id, w) => notes.push({ id, cost: COST[id] * w });
  const consumers = hasRole("herbivore") || hasRole("carnivore"), macro = consumers || has(BIG_TREES) || hasRole("pollinator") || present.has("flowers");
  // 1. la boucle vie ↔ mort : un décomposeur ou un nécrophage rend les morts au sol ; un rôle secondaire le fait moins bien
  if (consumers) {
    if (!hasRole("decomposer") && !hasRole("scavenger")) {
      const side = Object.entries(SECONDARY).some(([id, rs]) => present.has(id) && rs.some((r) => r === "scavenger" || r === "decomposer"));
      add(side ? "thinLoop" : "openLoop", wl);
    }
  }
  // 2. chaque échelle repose sur celle du dessous : du grand sans rien de petit
  if (macro && !has(MICRO)) add("noMicro", wl);
  // 3. les butineurs et les fleurs vont par deux
  if (present.has("flowers") && !hasRole("pollinator")) add("noPollinator", wl);
  // 4. le sol porte (ou non) ce qu'on pose dessus : seulement s'il est ÉCRIT (rien d'écrit : pas de faute)
  const soils = Object.keys(SOIL).filter((id) => present.has(id));
  if (has(BIG_TREES) && soils.length) {
    if (Math.max(...soils.map((id) => SOIL[id].sol)) < 2 && !present.has("stone")) add("weakGround", ws);
    else if (soils.every((id) => SOIL[id].fer <= 0) && !has(["earth", "humus", "lichen", "moss", "mycelium", "singing_lichen", "pale_fungus", "pellet"])) add("noEarth", ws);
  }
  // 5. l'énergie : chaque source nourrit ses producteurs
  if (present.has("plankton") && !has(LIGHT)) add("noLight", wl);
  if (present.has("microbial_mat") && !has([...HEAT, ...CHEM])) add("noHeat", wl);
  // 6. la capsule de nutriments : bien dosée elle nourrit, trop dosée elle brûle ; elle ne fait rien si rien ne pousse
  if (present.has("pellet")) {
    const f = o && o.factor ? o.factor("pellet") : 1, grows = hasRole("producer");
    if (f > 1 && grows) add("overdose", wl); else if (grows) notes.push({ id: "fedPellet", cost: 0 });
  }
  // 7. la voûte de la caverne : une phrase sur sa solidité ; seule une voûte faible sous un monde vaste fatigue (famille sol)
  const vault = VAULT.vaultOf(present, o && o.size);
  if (vault) { notes.unshift({ id: "vault" + vault.strength[0].toUpperCase() + vault.strength.slice(1), cost: 0 }); if (VAULT.tired(vault)) add("tiredVault", ws); }
  if (!notes.length) return null;
  const delta = {};
  for (const n of notes) { const axis = n.id === "weakGround" || n.id === "noEarth" || n.id === "tiredVault" ? "geological" : "ecological"; delta[axis] = (delta[axis] || 0) + n.cost; }
  return { delta, notes };
}

/** La ligne du panneau (au plus deux phrases) ; vide s'il n'y a rien à dire. */
function note(l, fr) {
  if (!l || !l.notes || !l.notes.length) return "";
  return (fr ? "Vie · " : "Life · ") + l.notes.slice(0, 2).map((n) => TEXT[n.id][fr ? 1 : 0]).join(fr ? " · " : " · ");
}

module.exports = { MATTER_BLOCKS, REACTIONS, VARIANTS, IDS, ROLES, SECONDARY, MICRO, SOIL, COST, TEXT, laws, note };
