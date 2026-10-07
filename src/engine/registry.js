"use strict";
const WEALTH = require("../wealth");
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

const pairKey = (e, o) => [e, o].sort().join("+");

function rebuildRegistry() {
  let e = activeLibrary,
    o = new Map(e.blocks.map((s) => [s.id, s])),
    t = new Set(BUILTIN_BLOCKS.map((s) => s.id));
  allBlocks.length = 0;
  for (let s of BUILTIN_BLOCKS) allBlocks.push(o.get(s.id) ?? s);
  for (let s of o.values()) t.has(s.id) || allBlocks.push(s);
  let i = new Set(e.reactions.map((s) => pairKey(s.a, s.b)));
  allReactions.length = 0;
  for (let s of BUILTIN_REACTIONS) i.has(pairKey(s.a, s.b)) || allReactions.push(s);
  allReactions.push(...e.reactions);
  let r = new Map();
  for (let s of [...BUILTIN_VARIANTS, ...e.variants]) r.set(`${s.catalyst}|${s.base}`, s);
  (variantsByCatalyst.clear(), baseOfVariant.clear());
  for (let s of r.values())
    (variantsByCatalyst.has(s.catalyst) || variantsByCatalyst.set(s.catalyst, {}),
      (variantsByCatalyst.get(s.catalyst)[s.base] = s.variant),
      baseOfVariant.set(s.variant, s.base));
  recipeOf.clear();
  for (let s of allReactions) recipeOf.has(s.result) || recipeOf.set(s.result, [s.a, s.b]);
  (blockById.clear(), writableIds.clear());
  for (let s of allBlocks) (blockById.set(s.id, s), s.writable && writableIds.add(s.id));
}

function setLibrary(e) {
  ((activeLibrary = e ?? EMPTY_LIBRARY), rebuildRegistry());
}

function getLibrary() {
  return activeLibrary;
}

rebuildRegistry();

function reactMatter(e) {
  let o = [...new Set(e)],
    t = new Set(o),
    i = [],
    r = (a) => {
      for (let c of o) {
        let g = variantsByCatalyst.get(c)?.[a];
        if (g) return g;
      }
    };
  for (let a = 0; a < 10; a++) {
    let c = !1;
    for (let g of allReactions)
      if (t.has(g.a) && t.has(g.b) && !t.has(g.result)) {
        t.add(g.result);
        let h = r(g.result);
        (i.push({
          a: g.a,
          b: g.b,
          result: g.result,
          shown: h ?? g.result,
          type: g.type,
          verbs: g.verbs,
          cost: g.cost,
          catalyzed: h !== void 0,
        }),
          (c = !0));
      }
    if (!c) break;
  }
  let s = {},
    n = (a, c) => {
      s[a] = (s[a] ?? 0) + c;
    };
  for (let a of o) {
    let c = blockById.get(a);
    c && n(c.axis, c.weight);
  }
  for (let a of i) {
    let c = blockById.get(a.result);
    c && n(c.axis, (a.cost ?? REACTION_COST[a.type]) + (c.stabilityBonus ?? 0));
  }
  return { written: o, reactions: i, costByAxis: s };
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
