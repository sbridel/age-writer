"use strict";

const REACTION_COST = {
  violent: 0.25,
  corrosive: 0.1,
  crystallizing: -0.03,
  soothing: -0.08,
  transmuting: 0.05,
  growing: -0.04,
  feeding: 0.02,
  decaying: 0.08,
  awakening: 0.06,
};

const GEOLOGY_BLOCKS = [
  { id: "water", descriptors: ["cold", "fluid", "clear"], weight: 0.03, axis: "geological", writable: !0 },
  {
    id: "lava",
    descriptors: ["searing", "slow", "incandescent"],
    weight: 0.06,
    axis: "geological",
    writable: !0,
  },
  { id: "stone", descriptors: ["dull", "heavy", "patient"], weight: 0.02, axis: "geological", writable: !0 },
  { id: "sand", descriptors: ["dry", "shifting", "fine"], weight: 0.02, axis: "geological", writable: !0 },
  {
    id: "salt",
    descriptors: ["bitter", "bright", "brittle"],
    weight: 0.03,
    axis: "geological",
    writable: !0,
  },
  { id: "ash", descriptors: ["soft", "grey", "weightless"], weight: 0.02, axis: "geological", writable: !0 },
  { id: "iron", descriptors: ["dark", "cold", "dense"], weight: 0.03, axis: "geological", writable: !0 },
  {
    id: "crystal",
    descriptors: ["sharp", "humming", "pale"],
    weight: 0.04,
    axis: "geological",
    writable: !0,
  },
  {
    id: "strange_stone",
    descriptors: ["wrong", "warm", "listening"],
    weight: 0.08,
    axis: "geological",
    writable: !0,
    presence: "a wrong, warm stone listens nearby",
  },
  {
    id: "deep_cold",
    descriptors: ["still", "hollow", "absolute"],
    weight: 0.05,
    axis: "geological",
    writable: !0,
  },
  {
    id: "pressure",
    descriptors: ["slow", "immense", "patient"],
    weight: 0.05,
    axis: "geological",
    writable: !0,
  },
  { id: "obsidian", descriptors: ["black", "glassy", "sharp"], weight: 0, axis: "geological", writable: !1 },
  { id: "ice", descriptors: ["pale", "blue", "brittle"], weight: 0, axis: "geological", writable: !1 },
  { id: "glass", descriptors: ["smooth", "clear", "ringing"], weight: 0, axis: "geological", writable: !1 },
  { id: "rust", descriptors: ["red", "flaking", "patient"], weight: 0, axis: "geological", writable: !1 },
  { id: "brine", descriptors: ["heavy", "bitter", "clear"], weight: 0, axis: "geological", writable: !1 },
  { id: "silt", descriptors: ["fine", "grey", "soft"], weight: 0, axis: "geological", writable: !1 },
  { id: "diamond", descriptors: ["hard", "bright", "cold"], weight: 0, axis: "geological", writable: !1 },
  {
    id: "humming_shard",
    descriptors: ["pale", "trembling", "bright"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
  {
    id: "crying_obsidian",
    descriptors: ["dark", "glistening", "mournful"],
    weight: 0,
    axis: "geological",
    writable: !1,
    stabilityBonus: -0.15,
  },
  {
    id: "whispering_obsidian",
    descriptors: ["black", "murmuring", "uneasy"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
  { id: "black_ice", descriptors: ["black", "silent", "deep"], weight: 0, axis: "geological", writable: !1 },
  {
    id: "singing_glass",
    descriptors: ["clear", "ringing", "fragile"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
  {
    id: "living_rust",
    descriptors: ["red", "creeping", "warm"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
  {
    id: "clouded_diamond",
    descriptors: ["milky", "patient", "bright"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
];

const GEOLOGY_REACTIONS = [
  { a: "water", b: "lava", result: "obsidian", type: "violent" },
  { a: "water", b: "deep_cold", result: "ice", type: "crystallizing" },
  { a: "sand", b: "lava", result: "glass", type: "crystallizing" },
  { a: "water", b: "iron", result: "rust", type: "corrosive" },
  { a: "water", b: "salt", result: "brine", type: "soothing" },
  { a: "water", b: "ash", result: "silt", type: "soothing" },
  { a: "ash", b: "pressure", result: "diamond", type: "crystallizing" },
  { a: "crystal", b: "strange_stone", result: "humming_shard", type: "transmuting" },
  {
    a: "salt",
    b: "obsidian",
    result: "crying_obsidian",
    type: "soothing",
    verbs: ["falls like tears, turning it into"],
  },
];

const CATALYST_ID = "strange_stone";

const GEOLOGY_VARIANTS = {
  obsidian: "whispering_obsidian",
  ice: "black_ice",
  glass: "singing_glass",
  rust: "living_rust",
  diamond: "clouded_diamond",
};

const FLORA_AXIS = "ecological";

const FLORA_BLOCKS = [
  { id: "spore", descriptors: ["pale", "drifting", "patient"], weight: 0.02, axis: FLORA_AXIS, writable: !0 },
  { id: "seed", descriptors: ["small", "hard", "waiting"], weight: 0.02, axis: FLORA_AXIS, writable: !0 },
  { id: "vine", descriptors: ["thin", "reaching", "restless"], weight: 0.03, axis: FLORA_AXIS, writable: !0 },
  { id: "fern", descriptors: ["green", "folded", "damp"], weight: 0.02, axis: FLORA_AXIS, writable: !0 },
  { id: "great_tree", descriptors: ["vast", "slow", "rooted"], weight: 0.05, axis: FLORA_AXIS, writable: !0 },
  { id: "moss", descriptors: ["soft", "green", "quiet"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  { id: "lichen", descriptors: ["grey", "crusted", "enduring"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  { id: "pale_fungus", descriptors: ["white", "damp", "silent"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  { id: "sapling", descriptors: ["thin", "bright", "hopeful"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  { id: "ironwood", descriptors: ["dark", "dense", "unyielding"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  { id: "cinderbloom", descriptors: ["red", "dry", "defiant"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  {
    id: "glowvine",
    descriptors: ["pale", "luminous", "creeping"],
    weight: 0,
    axis: FLORA_AXIS,
    writable: !1,
  },
  {
    id: "withered_fern",
    descriptors: ["brown", "brittle", "curled"],
    weight: 0,
    axis: FLORA_AXIS,
    writable: !1,
  },
  {
    id: "charred_grove",
    descriptors: ["black", "standing", "silent"],
    weight: 0,
    axis: FLORA_AXIS,
    writable: !1,
  },
  { id: "grove", descriptors: ["deep", "green", "sheltering"], weight: 0, axis: FLORA_AXIS, writable: !1 },
  {
    id: "singing_lichen",
    descriptors: ["grey", "ringing", "strange"],
    weight: 0,
    axis: FLORA_AXIS,
    writable: !1,
  },
  {
    id: "wrong_glowvine",
    descriptors: ["pale", "pulsing", "unsettling"],
    weight: 0,
    axis: FLORA_AXIS,
    writable: !1,
  },
  // météo vivante : des fleurs, pour la brume parfumée (fog + flowers) et la pluie de pétales (wind + flowers)
  {
    id: "flowers",
    descriptors: ["bright", "fragrant", "open"],
    weight: 0.02,
    axis: FLORA_AXIS,
    writable: !0,
    presence: "flowers open in every hollow, and the air remembers them",
  },
];

const FLORA_REACTIONS = [
  { a: "spore", b: "water", result: "moss", type: "growing" },
  { a: "moss", b: "deep_cold", result: "lichen", type: "growing" },
  { a: "spore", b: "ash", result: "pale_fungus", type: "growing" },
  { a: "seed", b: "water", result: "sapling", type: "growing" },
  { a: "sapling", b: "pressure", result: "ironwood", type: "transmuting" },
  { a: "seed", b: "lava", result: "cinderbloom", type: "transmuting" },
  { a: "vine", b: "crystal", result: "glowvine", type: "transmuting" },
  { a: "fern", b: "salt", result: "withered_fern", type: "decaying" },
  { a: "great_tree", b: "lava", result: "charred_grove", type: "violent" },
  { a: "great_tree", b: "water", result: "grove", type: "growing" },
];

const FLORA_VARIANTS = { lichen: "singing_lichen", glowvine: "wrong_glowvine" };

const FAUNA_AXIS = "ecological";

const FAUNA_BLOCKS = [
  { id: "moth", descriptors: ["pale", "soft", "drawn"], weight: 0.03, axis: FAUNA_AXIS, writable: !0 },
  { id: "grazer", descriptors: ["slow", "patient", "wary"], weight: 0.03, axis: FAUNA_AXIS, writable: !0 },
  { id: "burrower", descriptors: ["blind", "tireless", "low"], weight: 0.03, axis: FAUNA_AXIS, writable: !0 },
  { id: "hunter", descriptors: ["lean", "silent", "watchful"], weight: 0.05, axis: FAUNA_AXIS, writable: !0 },
  {
    id: "drifter",
    descriptors: ["weightless", "slow", "translucent"],
    weight: 0.04,
    axis: FAUNA_AXIS,
    writable: !0,
  },
  {
    id: "lantern_moths",
    descriptors: ["bright", "swirling", "gentle"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
  { id: "herd", descriptors: ["grey", "shifting", "calm"], weight: 0, axis: FAUNA_AXIS, writable: !1 },
  {
    id: "stalking_pack",
    descriptors: ["low", "patient", "hungry"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
  { id: "warren", descriptors: ["deep", "branching", "warm"], weight: 0, axis: FAUNA_AXIS, writable: !1 },
  {
    id: "still_drifter",
    descriptors: ["frozen", "glassy", "suspended"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
  {
    id: "whispering_moths",
    descriptors: ["pale", "murmuring", "uneasy"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
  {
    id: "watching_herd",
    descriptors: ["grey", "turned", "unblinking"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
  {
    id: "humming_warren",
    descriptors: ["deep", "droning", "warm"],
    weight: 0,
    axis: FAUNA_AXIS,
    writable: !1,
  },
];

const FAUNA_REACTIONS = [
  { a: "moth", b: "glowvine", result: "lantern_moths", type: "transmuting", verbs: ["gathers around it as"] },
  { a: "grazer", b: "moss", result: "herd", type: "feeding" },
  { a: "hunter", b: "herd", result: "stalking_pack", type: "feeding", verbs: ["circles it, becoming"] },
  { a: "burrower", b: "silt", result: "warren", type: "feeding" },
  { a: "drifter", b: "deep_cold", result: "still_drifter", type: "crystallizing" },
];

const FAUNA_VARIANTS = { lantern_moths: "whispering_moths", herd: "watching_herd", warren: "humming_warren" };

const RUINS_AXIS = "metaphysical";

const RUINS_BLOCKS = [
  { id: "tablet", descriptors: ["flat", "carved", "heavy"], weight: 0.03, axis: RUINS_AXIS, writable: !0 },
  { id: "lamp", descriptors: ["dark", "ornate", "waiting"], weight: 0.03, axis: RUINS_AXIS, writable: !0 },
  { id: "bridge", descriptors: ["narrow", "arched", "old"], weight: 0.03, axis: RUINS_AXIS, writable: !0 },
  { id: "door", descriptors: ["tall", "shut", "patient"], weight: 0.04, axis: RUINS_AXIS, writable: !0 },
  { id: "book", descriptors: ["bound", "dry", "unread"], weight: 0.04, axis: RUINS_AXIS, writable: !0 },
  {
    id: "worn_tablet",
    descriptors: ["smooth", "faded", "silent"],
    weight: 0,
    axis: RUINS_AXIS,
    writable: !1,
  },
  { id: "lit_lamp", descriptors: ["cold", "steady", "blue"], weight: 0, axis: RUINS_AXIS, writable: !1 },
  {
    id: "sealed_door",
    descriptors: ["fused", "seamless", "final"],
    weight: 0,
    axis: RUINS_AXIS,
    writable: !1,
  },
  {
    id: "blurred_book",
    descriptors: ["swollen", "pale", "illegible"],
    weight: 0,
    axis: RUINS_AXIS,
    writable: !1,
  },
  {
    id: "fallen_bridge",
    descriptors: ["broken", "red", "slumped"],
    weight: 0,
    axis: RUINS_AXIS,
    writable: !1,
  },
  {
    id: "speaking_tablet",
    descriptors: ["warm", "murmuring", "awake"],
    weight: 0,
    axis: RUINS_AXIS,
    writable: !1,
  },
];

const RUINS_REACTIONS = [
  { a: "tablet", b: "water", result: "worn_tablet", type: "decaying" },
  { a: "lamp", b: "crystal", result: "lit_lamp", type: "transmuting" },
  { a: "door", b: "pressure", result: "sealed_door", type: "crystallizing" },
  { a: "book", b: "water", result: "blurred_book", type: "decaying" },
  { a: "bridge", b: "rust", result: "fallen_bridge", type: "decaying" },
  { a: "tablet", b: "strange_stone", result: "speaking_tablet", type: "awakening" },
];

const RUINS_VARIANTS = {};

const WEATHER_AXIS = "weather";

const WEATHER_BLOCKS = [
  { id: "wind", descriptors: ["restless", "thin", "cold"], weight: 0.03, axis: WEATHER_AXIS, writable: !0 },
  { id: "rain", descriptors: ["steady", "grey", "soft"], weight: 0.03, axis: WEATHER_AXIS, writable: !0 },
  { id: "fog", descriptors: ["thick", "pale", "muffling"], weight: 0.03, axis: WEATHER_AXIS, writable: !0 },
  {
    id: "lightning",
    descriptors: ["white", "sudden", "jagged"],
    weight: 0.05,
    axis: WEATHER_AXIS,
    writable: !0,
  },
  { id: "heat", descriptors: ["heavy", "dry", "shimmering"], weight: 0.04, axis: WEATHER_AXIS, writable: !0 },
  { id: "storm", descriptors: ["churning", "dark", "loud"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  {
    id: "thunderstorm",
    descriptors: ["towering", "black", "booming"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  { id: "marsh_mist", descriptors: ["low", "pale", "drifting"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  {
    id: "dust_storm",
    descriptors: ["red", "scouring", "blind"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  { id: "ash_cloud", descriptors: ["grey", "vast", "slow"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "hail", descriptors: ["white", "hard", "stinging"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "steam", descriptors: ["rolling", "white", "scalding"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "rime", descriptors: ["white", "fine", "clinging"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "meltwater", descriptors: ["clear", "cold", "quick"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  {
    id: "spore_cloud",
    descriptors: ["pale", "drifting", "living"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  {
    id: "charged_crystal",
    descriptors: ["humming", "white", "taut"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  {
    id: "wildfire",
    descriptors: ["orange", "roaring", "hungry"],
    weight: 0,
    axis: "ecological",
    writable: !1,
  },
  {
    id: "fulgurite",
    descriptors: ["glassy", "branching", "fragile"],
    weight: 0,
    axis: "geological",
    writable: !1,
  },
  {
    id: "whispering_storm",
    descriptors: ["murmuring", "dark", "uneasy"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  {
    id: "waiting_thunder",
    descriptors: ["black", "patient", "still"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  {
    id: "watching_mist",
    descriptors: ["pale", "turned", "unblinking"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  { id: "black_hail", descriptors: ["black", "silent", "hard"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  // météo vivante (src/weather.js) : de nouveaux temps, et ce qu'ils deviennent au contact d'autres pages.
  // Toutes les réactions ci-dessous touchent un bloc nouveau : les Âges déjà écrits gardent leurs réactions et leur stabilité.
  {
    id: "drizzle",
    descriptors: ["fine", "silver", "hushed"],
    weight: 0.02,
    axis: WEATHER_AXIS,
    writable: !0,
    presence: "a fine drizzle comes and goes, too light to darken the stone",
  },
  {
    id: "snow",
    descriptors: ["white", "soundless", "slow"],
    weight: 0.03,
    axis: WEATHER_AXIS,
    writable: !0,
    presence: "snow falls without a sound, and keeps whatever it covers",
  },
  {
    id: "rainbow",
    descriptors: ["bright", "arched", "fleeting"],
    weight: 0.02,
    axis: WEATHER_AXIS,
    writable: !0,
    presence: "a rainbow stands over the far side of the land for a while, then is gone",
  },
  {
    id: "tornado",
    descriptors: ["spinning", "dark", "roaring"],
    weight: 0.06,
    axis: WEATHER_AXIS,
    writable: !0,
    presence: "far off, a funnel of wind walks the land and never quite comes closer",
  },
  {
    id: "scented_mist",
    descriptors: ["sweet", "pale", "lingering"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  { id: "petal_rain", descriptors: ["drifting", "pink", "soft"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "glaze", descriptors: ["glassy", "clear", "treacherous"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  {
    id: "crystal_rain",
    descriptors: ["glinting", "chiming", "sharp"],
    weight: 0,
    axis: WEATHER_AXIS,
    writable: !1,
  },
  { id: "ash_rain", descriptors: ["grey", "slow", "staining"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
  { id: "acid_rain", descriptors: ["sour", "yellow", "biting"], weight: 0, axis: WEATHER_AXIS, writable: !1 },
];

const WEATHER_REACTIONS = [
  {
    a: "rain",
    b: "wind",
    result: "storm",
    type: "violent",
    cost: 0.1,
    verbs: ["whips itself into", "gathers into"],
  },
  {
    a: "storm",
    b: "lightning",
    result: "thunderstorm",
    type: "violent",
    cost: 0.1,
    verbs: ["splits open as"],
  },
  { a: "fog", b: "water", result: "marsh_mist", type: "soothing" },
  { a: "wind", b: "sand", result: "dust_storm", type: "corrosive", verbs: ["scours itself into"] },
  { a: "wind", b: "ash", result: "ash_cloud", type: "transmuting" },
  { a: "rain", b: "deep_cold", result: "hail", type: "crystallizing" },
  { a: "rain", b: "lava", result: "steam", type: "violent", cost: 0.2, verbs: ["hisses into"] },
  { a: "heat", b: "water", result: "steam", type: "transmuting", verbs: ["lifts into"] },
  { a: "fog", b: "deep_cold", result: "rime", type: "crystallizing" },
  { a: "heat", b: "ice", result: "meltwater", type: "soothing" },
  { a: "wind", b: "spore", result: "spore_cloud", type: "transmuting" },
  { a: "lightning", b: "crystal", result: "charged_crystal", type: "awakening" },
  {
    a: "lightning",
    b: "great_tree",
    result: "wildfire",
    type: "violent",
    verbs: ["sets it alight, becoming"],
  },
  { a: "lightning", b: "sand", result: "fulgurite", type: "crystallizing", verbs: ["fuses it into"] },
  { a: "heat", b: "fern", result: "withered_fern", type: "decaying" },
  // météo vivante : chaque réaction touche un bloc nouveau (drizzle, snow, flowers)
  { a: "fog", b: "flowers", result: "scented_mist", type: "soothing", verbs: ["takes their scent and becomes", "softens into"] },
  { a: "wind", b: "flowers", result: "petal_rain", type: "transmuting", verbs: ["strips them into", "lifts them into"] },
  { a: "drizzle", b: "deep_cold", result: "glaze", type: "crystallizing", verbs: ["freezes where it lands into", "settles as"] },
  { a: "drizzle", b: "crystal", result: "crystal_rain", type: "transmuting", verbs: ["catches its light and falls as"] },
  { a: "drizzle", b: "ash", result: "ash_rain", type: "decaying", verbs: ["darkens into", "carries it down as"] },
  { a: "drizzle", b: "acid", result: "acid_rain", type: "corrosive", verbs: ["turns sour, falling as"] },
  { a: "snow", b: "heat", result: "meltwater", type: "soothing" },
  { a: "snow", b: "lava", result: "steam", type: "violent", cost: 0.2, verbs: ["hisses into"] },
];

const WEATHER_VARIANTS = {
  storm: "whispering_storm",
  thunderstorm: "waiting_thunder",
  marsh_mist: "watching_mist",
  hail: "black_hail",
};

const GEOLOGY_AXIS = "geological";

const FISSURE_BLOCKS = [
  {
    id: "fissure",
    descriptors: ["narrow", "bright", "humming"],
    weight: 0.02,
    axis: GEOLOGY_AXIS,
    writable: !0,
    presence: "a narrow crack in the ground hums faintly, and it leads home",
  },
  {
    id: "cave_fissure",
    descriptors: ["deep", "echoing", "luminous"],
    weight: 0.02,
    axis: GEOLOGY_AXIS,
    writable: !0,
    presence: "deep in a cavern, a luminous crack leads home",
  },
  {
    id: "submarine_fissure",
    descriptors: ["submerged", "pale", "patient"],
    weight: 0.02,
    axis: GEOLOGY_AXIS,
    writable: !0,
    presence: "beneath the water a crack glows, and the water does not run into it",
  },
  {
    id: "no_fissure",
    descriptors: ["sealed", "seamless", "silent"],
    weight: 0.02,
    axis: GEOLOGY_AXIS,
    writable: !0,
    presence: "no crack in this world leads home",
  },
];

module.exports = {
  CATALYST_ID,
  FAUNA_AXIS,
  FAUNA_BLOCKS,
  FAUNA_REACTIONS,
  FAUNA_VARIANTS,
  FISSURE_BLOCKS,
  FLORA_AXIS,
  FLORA_BLOCKS,
  FLORA_REACTIONS,
  FLORA_VARIANTS,
  GEOLOGY_AXIS,
  GEOLOGY_BLOCKS,
  GEOLOGY_REACTIONS,
  GEOLOGY_VARIANTS,
  REACTION_COST,
  RUINS_AXIS,
  RUINS_BLOCKS,
  RUINS_REACTIONS,
  RUINS_VARIANTS,
  WEATHER_AXIS,
  WEATHER_BLOCKS,
  WEATHER_REACTIONS,
  WEATHER_VARIANTS,
};
