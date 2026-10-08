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

function starCount(skyIds) {
  return skyIds.has("twin_suns") ? 2 : skyIds.has("starless") ? 0 : 1;
}

function conditionHolds(condition, skyIds) {
  let stars = starCount(skyIds);
  return condition
    .split("&&")
    .map((clause) => clause.trim())
    .every((clause) => {
      let notMatch = clause.match(/^!has\((\w+)\)$/);
      if (notMatch) return !skyIds.has(notMatch[1]);
      let hasMatch = clause.match(/^has\((\w+)\)$/);
      if (hasMatch) return skyIds.has(hasMatch[1]);
      let starsMatch = clause.match(/^stars(==|<|>|<=|>=)(\d+)$/);
      if (starsMatch) {
        let limit = Number(starsMatch[2]);
        switch (starsMatch[1]) {
          case "==":
            return stars === limit;
          case "<":
            return stars < limit;
          case ">":
            return stars > limit;
          case "<=":
            return stars <= limit;
          case ">=":
            return stars >= limit;
        }
      }
      return !1;
    });
}

/**
 * Contradictions présentes. Chaque règle ciel ↔ matière compte (depuis la 1.15.3). Avant, une seule règle
 * par phrase de description était gardée : un désert avec pluie ET brouillard ne payait que la pluie.
 * `onePerNote` rend l'ancien comportement : le tirage des pages l'utilise, pour que les mondes déjà tirés
 * gardent exactement les mêmes pages (seule leur stabilité change).
 */
function findContradictions(skyIds, matterIds, { onePerNote = false } = {}) {
  let found = [],
    seenPairs = new Set();
  for (let skyId of skyIds) {
    let entry = skyById.get(skyId);
    if (entry?.contradictions)
      for (let contradiction of entry.contradictions) {
        if (
          !skyIds.has(contradiction.with) ||
          (contradiction.condition && !conditionHolds(contradiction.condition, skyIds))
        )
          continue;
        let pairKey = [skyId, contradiction.with].sort().join("|");
        seenPairs.has(pairKey) ||
          (seenPairs.add(pairKey),
          found.push({ a: skyId, b: contradiction.with, severity: contradiction.severity }));
      }
  }
  let seenNotes = new Set();
  for (let rule of SKY_LIFE_RULES)
    if (skyIds.has(rule.sky) && matterIds.has(rule.with)) {
      if (onePerNote && seenNotes.has(rule.note)) continue;
      (seenNotes.add(rule.note),
        found.push({ a: rule.sky, b: rule.with, severity: rule.severity, axis: rule.axis, note: rule.note }));
    }
  for (let fissureRule of FISSURE_RULES)
    matterIds.has(fissureRule.id) &&
      !fissureRule.requiresAny.some((matterId) => matterIds.has(matterId)) &&
      found.push({
        a: fissureRule.id,
        b: fissureRule.requiresAny[0],
        severity: fissureRule.severity,
        axis: fissureRule.axis,
        note: fissureRule.note,
      });
  return found;
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
