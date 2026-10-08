"use strict";
const WEALTH = require("../wealth");
const GEOPHYS = require("../geophys");
const {
  CATALYST_ID,
  FAUNA_BLOCKS,
  FAUNA_REACTIONS,
  FAUNA_VARIANTS,
  FISSURE_BLOCKS,
  FLORA_BLOCKS,
  FLORA_REACTIONS,
  FLORA_VARIANTS,
  GEOLOGY_BLOCKS,
  GEOLOGY_REACTIONS,
  GEOLOGY_VARIANTS,
  REACTION_COST,
  RUINS_BLOCKS,
  RUINS_REACTIONS,
  RUINS_VARIANTS,
  WEATHER_BLOCKS,
  WEATHER_REACTIONS,
  WEATHER_VARIANTS,
} = require("./data/matter");

const BUILTIN_BLOCKS = [
  ...GEOLOGY_BLOCKS,
  ...FLORA_BLOCKS,
  ...FAUNA_BLOCKS,
  ...RUINS_BLOCKS,
  ...WEATHER_BLOCKS,
  ...FISSURE_BLOCKS,
  ...WEALTH.MATTER_BLOCKS,
  ...GEOPHYS.MATTER_BLOCKS,
];

const BUILTIN_REACTIONS = [
  ...GEOLOGY_REACTIONS,
  ...FLORA_REACTIONS,
  ...FAUNA_REACTIONS,
  ...RUINS_REACTIONS,
  ...WEATHER_REACTIONS,
];

const BUILTIN_VARIANTS = Object.entries({
  ...GEOLOGY_VARIANTS,
  ...FLORA_VARIANTS,
  ...FAUNA_VARIANTS,
  ...RUINS_VARIANTS,
  ...WEATHER_VARIANTS,
}).map(([e, o]) => ({ base: e, variant: o, catalyst: CATALYST_ID }));

function builtinLibrary() {
  return { blocks: BUILTIN_BLOCKS, reactions: BUILTIN_REACTIONS, variants: BUILTIN_VARIANTS };
}

const EMPTY_LIBRARY = { blocks: [], reactions: [], variants: [] };

let activeLibrary = EMPTY_LIBRARY;

const allBlocks = [];

const allReactions = [];

const variantsByCatalyst = new Map();

const recipeOf = new Map();

const baseOfVariant = new Map();

const blockList = allBlocks;

const blockById = new Map();

const writableIds = new Set();

const pairKey = (a, b) => [a, b].sort().join("+");

function rebuildRegistry() {
  let library = activeLibrary,
    customBlocks = new Map(library.blocks.map((block) => [block.id, block])),
    builtinIds = new Set(BUILTIN_BLOCKS.map((block) => block.id));
  allBlocks.length = 0;
  for (let block of BUILTIN_BLOCKS) allBlocks.push(customBlocks.get(block.id) ?? block);
  for (let block of customBlocks.values()) builtinIds.has(block.id) || allBlocks.push(block);
  let customPairs = new Set(library.reactions.map((reaction) => pairKey(reaction.a, reaction.b)));
  allReactions.length = 0;
  for (let reaction of BUILTIN_REACTIONS)
    customPairs.has(pairKey(reaction.a, reaction.b)) || allReactions.push(reaction);
  allReactions.push(...library.reactions);
  let variantMap = new Map();
  for (let variant of [...BUILTIN_VARIANTS, ...library.variants])
    variantMap.set(`${variant.catalyst}|${variant.base}`, variant);
  (variantsByCatalyst.clear(), baseOfVariant.clear());
  for (let variant of variantMap.values())
    (variantsByCatalyst.has(variant.catalyst) || variantsByCatalyst.set(variant.catalyst, {}),
      (variantsByCatalyst.get(variant.catalyst)[variant.base] = variant.variant),
      baseOfVariant.set(variant.variant, variant.base));
  recipeOf.clear();
  for (let reaction of allReactions)
    recipeOf.has(reaction.result) || recipeOf.set(reaction.result, [reaction.a, reaction.b]);
  (blockById.clear(), writableIds.clear());
  for (let block of allBlocks) (blockById.set(block.id, block), block.writable && writableIds.add(block.id));
}

function setLibrary(library) {
  ((activeLibrary = library ?? EMPTY_LIBRARY), rebuildRegistry());
}

function getLibrary() {
  return activeLibrary;
}

rebuildRegistry();

function reactMatter(ids) {
  let written = [...new Set(ids)],
    present = new Set(written),
    reactions = [],
    findVariant = (base) => {
      for (let catalyst of written) {
        let variant = variantsByCatalyst.get(catalyst)?.[base];
        if (variant) return variant;
      }
    };
  for (let pass = 0; pass < 10; pass++) {
    let changed = !1;
    for (let reaction of allReactions)
      if (present.has(reaction.a) && present.has(reaction.b) && !present.has(reaction.result)) {
        present.add(reaction.result);
        let shownVariant = findVariant(reaction.result);
        (reactions.push({
          a: reaction.a,
          b: reaction.b,
          result: reaction.result,
          shown: shownVariant ?? reaction.result,
          type: reaction.type,
          verbs: reaction.verbs,
          cost: reaction.cost,
          catalyzed: shownVariant !== void 0,
        }),
          (changed = !0));
      }
    if (!changed) break;
  }
  let costByAxis = {},
    addCost = (axis, amount) => {
      costByAxis[axis] = (costByAxis[axis] ?? 0) + amount;
    };
  for (let id of written) {
    let block = blockById.get(id);
    block && addCost(block.axis, block.weight);
  }
  for (let reaction of reactions) {
    let block = blockById.get(reaction.result);
    block &&
      addCost(block.axis, (reaction.cost ?? REACTION_COST[reaction.type]) + (block.stabilityBonus ?? 0));
  }
  return { written: written, reactions: reactions, costByAxis: costByAxis };
}

const AXES = ["cosmological", "geological", "metaphysical", "weather", "ecological"];

const REACTION_TYPES = Object.keys(REACTION_COST);

const DEFAULT_CATALYST = "strange_stone";

const DEFAULT_WEIGHT = 0.03;

module.exports = {
  AXES,
  BUILTIN_BLOCKS,
  BUILTIN_REACTIONS,
  BUILTIN_VARIANTS,
  DEFAULT_CATALYST,
  DEFAULT_WEIGHT,
  EMPTY_LIBRARY,
  REACTION_TYPES,
  WEALTH,
  allBlocks,
  allReactions,
  baseOfVariant,
  blockById,
  blockList,
  builtinLibrary,
  getLibrary,
  pairKey,
  reactMatter,
  rebuildRegistry,
  recipeOf,
  setLibrary,
  variantsByCatalyst,
  writableIds,
};
