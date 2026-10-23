"use strict";
/**
 * Le catalogue des merveilles (claude/CATALOGUE-merveilles.md, revue validée le 22 oct. 2026) : les composites, des blocs
 * jamais écrits. La plupart naissent d'une **union** nouée par la mutation (src/mutation.js) sur une paire qui se
 * contredit ; un seul (la Brume vivante) naît d'une paire qu'on écrit, comme la brume parfumée. Module pur.
 *
 * - `MATTER_BLOCKS` : les composites et les deux matières abîmées que demandent les règles nouvelles (phalènes roussies,
 *   végétation ternie) ; non écrivables, poids nul.
 * - `REACTIONS` : phalènes + chaleur (13), métal + flore (16 a), brume + spores (17, face écrite).
 * - `compositeOf(union)` : le composite d'une union, ou null (une union hors catalogue soutient le monde sans rien faire naître).
 */
const METALS = ["gold", "silver", "copper"], FLORA = ["great_tree", "fern", "flowers", "grass", "vine"];
const keyOf = (a, b) => [a, b].sort().join("|");

/** Les composites : id, numéro du catalogue, mots, axe, phrase de présence (anglais ; le français vient de i18n `cat.*`). */
const COMPOSITES = [
  { id: "unfinished_horizon", en: "the unfinished", fr: "l'Inachevé", n: 1, d: ["undecided", "half-drawn", "patient"], axis: "cosmological", p: "part of this world is not decided yet: the far hills end in a sketch, and a little more of them is inked each day" },
  { id: "orphan_colour", en: "the orphan colour", fr: "la Couleur orpheline", n: 4, d: ["sourceless", "even", "shadowless"], axis: "cosmological", p: "the sky has a colour and no source for it; nothing here casts a shadow" },
  { id: "breathing_mirrors", en: "breathing mirrors", fr: "les Miroirs qui respirent", n: 5, d: ["black", "slow", "breathing"], axis: "geological", p: "the obsidian has not finished cooling: its black mirrors rise and fall, slowly, like a chest" },
  { id: "visiting_weight", en: "the visiting weight", fr: "la Pesanteur en visite", n: 6, d: ["hourly", "drifting", "grounded"], axis: "cosmological", p: "weight is not a place here but an hour: the stones float while the light lasts and settle when it goes" },
  { id: "wind_learned", en: "what the wind learned", fr: "ce que le vent a appris", n: 8, d: ["remembering", "grooved", "walking"], axis: "weather", p: "the dunes keep the shape of whatever crossed them: a line of fresh steps walks on, with no one in them" },
  { id: "reading_rain", en: "the reading rain", fr: "la Pluie qui lit", n: 9, d: ["etching", "patient", "literate"], axis: "weather", p: "the rain only bites where something was once written, and leaves pale lines on the bare stone that no one can read" },
  { id: "ceiling_sea", en: "the ceiling sea", fr: "la Mer au plafond", n: 11, d: ["overhead", "still", "dripping"], axis: "geological", p: "the sea hangs from the roof of the world; the rain rises to fall into it" },
  { id: "fit_through_moths", en: "the ones that fit through", fr: "celles qui passent", n: 13, d: ["red-gold", "boneless", "squeezing"], axis: "ecological", p: "the moths have no fixed shape any more: they stretch like bubbles through the cracks in the rock, red and gold, and close again on the other side" },
  { id: "mosaic", en: "the mosaic", fr: "la Mosaïque", n: 14, d: ["broken", "flamed", "prized"], axis: "ecological", p: "the sickness no longer kills, it paints: the flowers are broken into flames and feathers of a second colour, and the sicker they are, the finer" },
  { id: "ringed_ground", en: "the rings", fr: "les Cernes", n: 15, d: ["grained", "ringed", "growing"], axis: "geological", p: "there is no earth and no rock here: the ground is one vast living wood, laid in rings like a trunk, and each year of the world adds one" },
  { id: "drinking_roots", en: "what the roots drank", fr: "ce que les racines ont bu", n: 16, d: ["gilded", "chiming", "drinking"], axis: "ecological", p: "the living things are made of what their roots drank: leaves of metal that chime in the wind" },
  { id: "living_mist", en: "the living mist", fr: "la Brume vivante", n: 17, d: ["drifting", "feeding", "parting"], axis: "weather", written: true, p: "the mist is a people: countless lives afloat, feeding on the light; it parts before a walker and closes behind, and does not follow the wind" },
  { id: "day_aurora", en: "the day aurora", fr: "l'Aurore de jour", n: 19, d: ["ashen", "lit", "rippling"], axis: "cosmological", p: "the aurora shows in full day, and it is the ash that carries it: the grey cloud lights green and violet from below" },
  { id: "blooming_ice", en: "the blooming ice", fr: "la Glace qui fleurit", n: 20, d: ["crystalline", "blooming", "brief"], axis: "ecological", p: "it is not flowers in the ice: it is the ice that flowers; the frost grows into petals every night and is gone by noon" },
  { id: "rust_held_bridge", en: "what the rust holds", fr: "ce que tient la rouille", n: 21, d: ["rusted", "woven", "holding"], axis: "metaphysical", p: "the rust no longer eats the bridge, it holds it: the deck has fallen, but threads of rust have grown like a web and keep it in the air" },
  { id: "many_one", en: "the many-one", fr: "l'Un-plusieurs", n: 23, d: ["single", "turning", "coiled"], axis: "ecological", p: "the herd has become a single beast: every head turns at once, it parts and joins again, and at night it lies down in one spiral" },
  { id: "early_echo", en: "the early echo", fr: "l'Écho d'avance", n: 26, d: ["early", "muffled", "rolling"], axis: "weather", p: "under the vault the storm is heard before it happens: the thunder rolls, and only then does the lightning cross the rock" },
];
const BY_ID = new Map(COMPOSITES.map((c) => [c.id, c]));

/** Les matières abîmées des règles nouvelles : ce que la symbiose renoue. */
const DAMAGED = [
  { id: "scorched_moths", d: ["singed", "brittle", "fallen"], axis: "ecological", p: "the heat has singed the moths; they fall more than they fly" },
  { id: "tarnished_growth", d: ["tarnished", "stunted", "metallic"], axis: "ecological", p: "metal in the ground stunts what grows over it, and the leaves come up tarnished" },
];

const MATTER_BLOCKS = [...COMPOSITES, ...DAMAGED].map((b) => ({ id: b.id, descriptors: b.d, weight: 0, axis: b.axis, writable: false, presence: b.p }));

const REACTIONS = [
  { a: "moth", b: "heat", result: "scorched_moths", type: "decaying", cost: 0.03, verbs: ["singes them into"] }, /* un petit coût : assez pour que la symbiose ait quelque chose à nouer, pas assez pour faire tomber un Âge */
  ...METALS.flatMap((m) => FLORA.map((f) => ({ a: m, b: f, result: "tarnished_growth", type: "decaying", cost: 0.02, verbs: ["poisons its roots into"] }))),
  { a: "fog", b: "spore", result: "living_mist", type: "soothing", verbs: ["fills with life and becomes"] },
];

/** La face écrite (rappel de l'auteur, 22 oct.) : nés d'une paire qu'on écrit ; ils entrent aussi dans la chambre des souvenirs. */
const WRITTEN = [
  ["petal_rain", "petal rain", "la pluie de pétales"], ["scented_mist", "scented mist", "la brume parfumée"], ["crystal_rain", "crystal rain", "la pluie de cristal"],
  ["spore_cloud", "spore cloud", "le nuage de spores"], ["glowvine", "glowvine", "la liane lumineuse"], ["lantern_moths", "lantern moths", "les phalènes-lanternes"],
  ["cinderbloom", "cinderbloom", "la fleur de cendre"], ["ironwood", "ironwood", "le bois de fer"], ["humming_shard", "humming shard", "l'éclat qui bourdonne"],
  ["singing_glass", "singing glass", "le verre qui chante"], ["speaking_tablet", "speaking tablet", "la tablette qui parle"], ["charged_crystal", "charged crystal", "le cristal chargé"],
  ["fulgurite", "fulgurite", "la fulgurite"], ["living_mist", "the living mist", "la Brume vivante"],
].map(([id, en, fr]) => ({ id, en, fr }));
const WRITTEN_BY_ID = new Map(WRITTEN.map((w) => [w.id, w]));

/** Les paires nouées : la clé triée → le composite. */
const PAIRS = new Map([
  ["water", "lava", "breathing_mirrors"], ["heavy_world", "light_world", "visiting_weight"], ["wind", "sand", "wind_learned"],
  ["drizzle", "acid", "reading_rain"], ["cavern_world", "ocean_world", "ceiling_sea"], ["jungle_world", "desert_world", "ringed_ground"],
  ["great_tree", "lava", "drinking_roots"], ["frozen_world", "flowers", "blooming_ice"], ["bridge", "rust", "rust_held_bridge"],
  ["grazer", "lava_world", "many_one"], ["cavern_world", "thunderstorm", "early_echo"], ["ancient_world", "young_world", "unfinished_horizon"],
  ["moth", "heat", "fit_through_moths"], ["auroras", "ash_cloud", "day_aurora"],
].map(([a, b, c]) => [keyOf(a, b), c]));
const COLOURED_SUNS = /^(red|orange|white|blue|green|violet)_sun$/;

/** Le composite d'une union ({ a, b }) : son id, ou null si la paire n'est pas au catalogue. */
function compositeOf(u) {
  if (!u || !u.a || !u.b) return null;
  const k = PAIRS.get(keyOf(u.a, u.b)); if (k) return k;
  if ((METALS.includes(u.a) && FLORA.includes(u.b)) || (METALS.includes(u.b) && FLORA.includes(u.a))) return "drinking_roots";
  if (u.a === "blight" || u.b === "blight") return "mosaic";
  const other = u.a === "black_sun" ? u.b : u.b === "black_sun" ? u.a : null;
  return other && COLOURED_SUNS.test(other) ? "orphan_colour" : null;
}
/** Le nom d'un composite dans la langue de l'interface (`fr` vrai : français). */
function nameOf(id, fr) { const c = BY_ID.get(id) || WRITTEN_BY_ID.get(id); return c ? (fr ? c.fr : c.en) : String(id || ""); }
/** Les merveilles d'une analyse : les composites noués (`r.composites`) et ceux de la face écrite (produits d'une réaction). */
function wondersOf(r) {
  const ids = new Set(((r && r.composites) || []).map((c) => c.id));
  for (const x of (r && r.resolved && r.resolved.matter && r.resolved.matter.reactions) || []) if (x && WRITTEN_BY_ID.has(x.result)) ids.add(x.result);
  return [...ids];
}
/** Le métal qu'un composite « ce que les racines ont bu » a bu (pour la teinte), d'après l'union et ce qui est écrit. */
function metalOf(u, present) {
  const m = [u && u.a, u && u.b].find((x) => METALS.includes(x)); if (m) return m;
  return METALS.find((x) => present && present.has && present.has(x)) || "iron";
}

module.exports = { COMPOSITES, BY_ID, DAMAGED, MATTER_BLOCKS, REACTIONS, METALS, FLORA, compositeOf, metalOf, nameOf, wondersOf, WRITTEN };
