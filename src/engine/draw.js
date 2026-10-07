"use strict";
const { hooks } = require("./hooks");
const { SKY_ENTRIES } = require("./data/sky");
const { reactMatter } = require("./registry");
const { CONTRADICTION_COST, findContradictions } = require("./rules");
const { REACTION_COST } = require("./data/matter");

const slot = (e, o, t) => ({ id: e, weight: o, ...(t ? { when: t } : {}) });

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

function hashSeed(e) {
  let o = 2166136261;
  for (let t = 0; t < e.length; t++) o = Math.imul(o ^ e.charCodeAt(t), 16777619);
  return o >>> 0;
}

function rng(e) {
  let o = e >>> 0;
  return () => {
    o = (o + 1831565813) | 0;
    let t = Math.imul(o ^ (o >>> 15), 1 | o);
    return ((t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t), ((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

const skyIds = new Set(SKY_ENTRIES.map((e) => e.id));

function clashCost(e) {
  let o = new Set(),
    t = [];
  for (let i of e) skyIds.has(i) ? o.add(i) : t.push(i);
  return clashCostFor(o, t);
}

function clashCostFor(e, o) {
  let t = reactMatter(o),
    i = new Set(t.written);
  for (let s of t.reactions) i.add(s.result);
  let r = 0;
  for (let s of findContradictions(e, i)) r += CONTRADICTION_COST[s.severity];
  for (let s of t.reactions) r += Math.max(0, s.cost ?? REACTION_COST[s.type]);
  return r;
}

function marginalClash(e, o) {
  let t = new Set(e);
  return (t.add(o), Math.max(0, clashCost(t) - clashCost(e)));
}

function drawOpenSlots(e) {
  let { written: o, seed: t, pull: i } = e,
    r = new Set(o),
    s = [];
  for (let n of DRAW_SLOTS) {
    let a = rng(hashSeed(`${t}|${n.name}`)),
      c = new Set(r);
    for (let h of n.options) h.id !== null && c.delete(h.id);
    let g = (h) => (h === null ? 1 : Math.exp(-i * marginalClash(c, h)));
    if (n.pick === "one") {
      if (n.options.some((x) => x.id !== null && o.has(x.id)) || n.answeredBy?.some((x) => o.has(x)))
        continue;
      let h = c.has("water"),
        u = (x) => !(x.when === "water" && !h) && !(x.when === "dry" && h),
        l = n.options.map((x) => (u(x) ? hooks.w(n.name, x) * g(x.id) : 0)),
        d = l.reduce((x, A) => x + A, 0),
        f = n.options.map(() => a()),
        m = -1,
        k = 1 / 0;
      l.forEach((x, A) => {
        if (x <= 0) return;
        let $ = -Math.log(Math.max(f[A], 1e-12)) / x;
        $ < k && ((k = $), (m = A));
      });
      let w = n.options[m].id;
      w !== null && (r.add(w), s.push({ id: w, slot: n.name, chance: l[m] / d }));
    } else
      for (let h of n.options) {
        let u = a();
        if (r.has(h.id)) continue;
        let l = hooks.w(n.name, h) * g(h.id);
        u < l && (r.add(h.id), s.push({ id: h.id, slot: n.name, chance: l }));
      }
  }
  return s;
}

const DEFAULTED_SLOT_COST = 0.05;

module.exports = {
  DEFAULTED_SLOT_COST,
  DRAW_SLOTS,
  PULL_STRENGTH,
  clashCost,
  clashCostFor,
  drawOpenSlots,
  hashSeed,
  marginalClash,
  rng,
  skyIds,
  slot,
};
