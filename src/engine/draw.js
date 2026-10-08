"use strict";
const { hooks } = require("./hooks");
const { SKY_ENTRIES } = require("./data/sky");
const { reactMatter } = require("./registry");
const { CONTRADICTION_COST, findContradictions } = require("./rules");
const { REACTION_COST } = require("./data/matter");

const slot = (id, weight, when) => ({ id: id, weight: weight, ...(when ? { when: when } : {}) });

const DRAW_SLOTS = [
  {
    name: "stars",
    pick: "one",
    options: [slot("single_sun", 60), slot("twin_suns", 25), slot("starless", 15)],
  },
  {
    name: "cycle",
    pick: "one",
    options: [slot("steady_cycle", 65), slot("erratic_cycle", 20), slot("frozen_cycle", 15)],
  },
  { name: "moon", pick: "each", options: [slot("companion_moon", 0.3)] },
  {
    name: "phenomena",
    pick: "each",
    options: [
      slot("auroras", 0.14),
      slot("recurring_eclipses", 0.06),
      slot("permanent_veil", 0.1),
      slot("starfall", 0.1),
    ],
  },
  {
    name: "ground",
    pick: "one",
    options: [
      slot("water", 28),
      slot("stone", 22),
      slot("sand", 16),
      slot("deep_cold", 6),
      slot("lava", 5),
      slot(null, 23),
    ],
  },
  {
    name: "minerals",
    pick: "each",
    options: [slot("salt", 0.08), slot("ash", 0.06), slot("iron", 0.08), slot("crystal", 0.08)],
  },
  {
    name: "weather",
    pick: "each",
    options: [
      slot("wind", 0.25),
      slot("rain", 0.2),
      slot("fog", 0.12),
      slot("lightning", 0.06),
      slot("heat", 0.1),
    ],
  },
  {
    name: "flora",
    pick: "each",
    options: [
      slot("spore", 0.2),
      slot("seed", 0.1),
      slot("fern", 0.12),
      slot("vine", 0.08),
      slot("great_tree", 0.06),
    ],
  },
  {
    name: "fauna",
    pick: "each",
    options: [
      slot("moth", 0.1),
      slot("grazer", 0.1),
      slot("burrower", 0.06),
      slot("hunter", 0.04),
      slot("drifter", 0.04),
    ],
  },
  {
    name: "ruins",
    pick: "each",
    options: [
      slot("tablet", 0.06),
      slot("lamp", 0.04),
      slot("bridge", 0.04),
      slot("door", 0.05),
      slot("book", 0.04),
    ],
  },
  {
    name: "fissure",
    pick: "one",
    options: [
      slot(null, 50),
      slot("fissure", 30, "dry"),
      slot("submarine_fissure", 30, "water"),
      slot("cave_fissure", 20),
    ],
    answeredBy: ["no_fissure"],
  },
];

const PULL_STRENGTH = { none: 0, gentle: 3, moderate: 6, strong: 12 };

// How much the book draws at all: 1 = as before. Below 1, whole slots are skipped and each-slot chances shrink;
// above 1, each-slot chances grow (capped at certainty). Never changes which dice are rolled, so a seed stays stable.
const DRAW_AMOUNT = { few: 0.35, normal: 1, many: 1.6 };

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 1831565813) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    return (
      (mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed),
      ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    );
  };
}

const skyIds = new Set(SKY_ENTRIES.map((e) => e.id));

function clashCost(ids) {
  let skyIdSet = new Set(),
    matterIds = [];
  for (let id of ids) skyIds.has(id) ? skyIdSet.add(id) : matterIds.push(id);
  return clashCostFor(skyIdSet, matterIds);
}

function clashCostFor(skyIdSet, matterIds) {
  let matter = reactMatter(matterIds),
    allMatterIds = new Set(matter.written);
  for (let reaction of matter.reactions) allMatterIds.add(reaction.result);
  let cost = 0;
  for (let contradiction of findContradictions(skyIdSet, allMatterIds, { onePerNote: true }))
    cost += CONTRADICTION_COST[contradiction.severity];
  for (let reaction of matter.reactions) cost += Math.max(0, reaction.cost ?? REACTION_COST[reaction.type]);
  return cost;
}

function marginalClash(ids, addedId) {
  let withAdded = new Set(ids);
  return (withAdded.add(addedId), Math.max(0, clashCost(withAdded) - clashCost(ids)));
}

function drawOpenSlots(params) {
  let { written, seed, pull, amount = 1 } = params,
    taken = new Set(written),
    drawn = [];
  for (let slotDef of DRAW_SLOTS) {
    let random = rng(hashSeed(`${seed}|${slotDef.name}`)),
      others = new Set(taken);
    for (let option of slotDef.options) option.id !== null && others.delete(option.id);
    let clashFactor = (optionId) =>
      optionId === null ? 1 : Math.exp(-pull * marginalClash(others, optionId));
    if (slotDef.pick === "one") {
      if (amount < 1 && rng(hashSeed(`${seed}|${slotDef.name}|skip`))() >= amount) continue;
      if (
        slotDef.options.some((item) => item.id !== null && written.has(item.id)) ||
        slotDef.answeredBy?.some((item) => written.has(item))
      )
        continue;
      let hasWater = others.has("water"),
        allowed = (option) => !(option.when === "water" && !hasWater) && !(option.when === "dry" && hasWater),
        weights = slotDef.options.map((option) =>
          allowed(option) ? hooks.w(slotDef.name, option) * clashFactor(option.id) : 0,
        ),
        total = weights.reduce((sum, weight) => sum + weight, 0),
        randoms = slotDef.options.map(() => random()),
        bestIndex = -1,
        bestKey = 1 / 0;
      weights.forEach((weight, index) => {
        if (weight <= 0) return;
        let key = -Math.log(Math.max(randoms[index], 1e-12)) / weight;
        key < bestKey && ((bestKey = key), (bestIndex = index));
      });
      let chosenId = slotDef.options[bestIndex].id;
      chosenId !== null &&
        (taken.add(chosenId),
        drawn.push({ id: chosenId, slot: slotDef.name, chance: weights[bestIndex] / total }));
    } else
      for (let option of slotDef.options) {
        let roll = random();
        if (taken.has(option.id)) continue;
        let chance = Math.min(1, hooks.w(slotDef.name, option) * clashFactor(option.id) * amount);
        roll < chance &&
          (taken.add(option.id), drawn.push({ id: option.id, slot: slotDef.name, chance: chance }));
      }
  }
  return drawn;
}

const DEFAULTED_SLOT_COST = 0.05;

module.exports = {
  DEFAULTED_SLOT_COST,
  DRAW_SLOTS,
  PULL_STRENGTH,
  DRAW_AMOUNT,
  clashCost,
  clashCostFor,
  drawOpenSlots,
  hashSeed,
  marginalClash,
  rng,
  skyIds,
  slot,
};
