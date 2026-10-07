"use strict";
const EXTRA_SKY = require("../sky");
const { SKY_ENTRIES } = require("./data/sky");

const STARLESS_GROWTH_NOTES = [
  "green things keep growing under a sky that gives no light, and nothing explains why",
  "something here is growing without any sun to answer to",
];

const SKY_LIFE_RULES = [
  ...["seed", "vine", "fern", "great_tree", "moss", "grove", "sapling"].map((e) => ({
    sky: "starless",
    with: e,
    severity: "medium",
    axis: "ecological",
    note: STARLESS_GROWTH_NOTES,
  })),
  {
    sky: "starless",
    with: "moth",
    severity: "light",
    axis: "ecological",
    note: ["the moths circle a light that is not there", "pale wings beat toward a sky that never shines"],
  },
  {
    sky: "frozen_cycle",
    with: "seed",
    severity: "light",
    axis: "ecological",
    note: ["the seed waits for a season that cannot come, the sky being fixed in its hour"],
  },
  {
    sky: "erratic_cycle",
    with: "sapling",
    severity: "light",
    axis: "ecological",
    note: ["the sapling cannot count its seasons, they arrive in no order"],
  },
  {
    sky: "chaotic_orbit",
    with: "great_tree",
    severity: "light",
    axis: "ecological",
    note: ["the great tree has no year to measure itself against"],
  },
  {
    sky: "frozen_cycle",
    with: "lit_lamp",
    severity: "light",
    axis: "metaphysical",
    note: ["a lamp burns steadily under a sky that never marks the hour"],
  },
];

const FROZEN_STORM_NOTE = ["the storm cannot pass; the sky is fixed in its hour"];

const SKY_WEATHER_RULES = [
  {
    sky: "starless",
    with: "heat",
    severity: "light",
    axis: "weather",
    note: ["warmth rises here, though no sun ever gave it"],
  },
  {
    sky: "starless",
    with: "rain",
    severity: "light",
    axis: "weather",
    note: ["rain falls, though no sun ever lifted the water"],
  },
  { sky: "frozen_cycle", with: "storm", severity: "light", axis: "weather", note: FROZEN_STORM_NOTE },
  { sky: "frozen_cycle", with: "thunderstorm", severity: "light", axis: "weather", note: FROZEN_STORM_NOTE },
  {
    sky: "permanent_veil",
    with: "lightning",
    severity: "light",
    axis: "weather",
    note: ["the lightning is only ever reported, never seen"],
  },
];

SKY_LIFE_RULES.push(...SKY_WEATHER_RULES);
SKY_LIFE_RULES.push(
  ...EXTRA_SKY.SKY_RULES.map((r) => ({
    sky: r.sky,
    with: r.with,
    severity: r.severity,
    axis: r.axis,
    note: EXTRA_SKY.NOTES[r.note],
  })),
);

const FISSURE_RULES = [
  {
    id: "submarine_fissure",
    requiresAny: ["water", "brine", "meltwater"],
    severity: "medium",
    axis: "geological",
    note: [
      "a fissure beneath the water, and no water for it to lie beneath",
      "the crack lies under a sea that is not there",
    ],
  },
];

const CONTRADICTION_COST = { light: 0.1, medium: 0.2, strong: 0.35 };

const SEVERITY_ORDER = ["light", "medium", "strong"];

const skyById = new Map(SKY_ENTRIES.map((e) => [e.id, e]));

function starCount(e) {
  return e.has("twin_suns") ? 2 : e.has("starless") ? 0 : 1;
}

function conditionHolds(e, o) {
  let t = starCount(o);
  return e
    .split("&&")
    .map((i) => i.trim())
    .every((i) => {
      let r = i.match(/^!has\((\w+)\)$/);
      if (r) return !o.has(r[1]);
      let s = i.match(/^has\((\w+)\)$/);
      if (s) return o.has(s[1]);
      let n = i.match(/^stars(==|<|>|<=|>=)(\d+)$/);
      if (n) {
        let a = Number(n[2]);
        switch (n[1]) {
          case "==":
            return t === a;
          case "<":
            return t < a;
          case ">":
            return t > a;
          case "<=":
            return t <= a;
          case ">=":
            return t >= a;
        }
      }
      return !1;
    });
}

function findContradictions(e, o) {
  let t = [],
    i = new Set();
  for (let s of e) {
    let n = skyById.get(s);
    if (n?.contradictions)
      for (let a of n.contradictions) {
        if (!e.has(a.with) || (a.condition && !conditionHolds(a.condition, e))) continue;
        let c = [s, a.with].sort().join("|");
        i.has(c) || (i.add(c), t.push({ a: s, b: a.with, severity: a.severity }));
      }
  }
  let r = new Set();
  for (let s of SKY_LIFE_RULES)
    if (e.has(s.sky) && o.has(s.with)) {
      if (r.has(s.note)) continue;
      (r.add(s.note), t.push({ a: s.sky, b: s.with, severity: s.severity, axis: s.axis, note: s.note }));
    }
  for (let s of FISSURE_RULES)
    o.has(s.id) &&
      !s.requiresAny.some((n) => o.has(n)) &&
      t.push({ a: s.id, b: s.requiresAny[0], severity: s.severity, axis: s.axis, note: s.note });
  return t;
}

module.exports = {
  CONTRADICTION_COST,
  EXTRA_SKY,
  FISSURE_RULES,
  FROZEN_STORM_NOTE,
  SEVERITY_ORDER,
  SKY_LIFE_RULES,
  SKY_WEATHER_RULES,
  STARLESS_GROWTH_NOTES,
  conditionHolds,
  findContradictions,
  skyById,
  starCount,
};
