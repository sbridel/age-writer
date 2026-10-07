"use strict";
const EXTRA_SKY = require("../../sky");

const SKY_ENTRIES = [
  {
    id: "single_sun",
    category: "stars",
    label: "A single sun",
    axis: "cosmological",
    weight: 0.05,
    proseTag: "#lone_star#",
  },
  {
    id: "twin_suns",
    category: "stars",
    label: "Twin suns",
    axis: "cosmological",
    weight: 0.1,
    proseTag: "#twin_star#",
  },
  {
    id: "starless",
    category: "stars",
    label: "Starless",
    axis: "cosmological",
    weight: 0.1,
    proseTag: "#no_star#",
  },
  {
    id: "companion_moon",
    category: "stars",
    label: "A companion moon",
    axis: "cosmological",
    weight: -0.03,
    proseTag: "#companion_moon#",
  },
  {
    id: "steady_cycle",
    category: "cycle",
    label: "Steady cycle",
    axis: "cosmological",
    weight: 0.05,
    proseTag: "#steady_cycle#",
  },
  {
    id: "erratic_cycle",
    category: "cycle",
    label: "Erratic cycle",
    axis: "cosmological",
    weight: 0.08,
    contradictions: [{ with: "stable_orbit", severity: "light" }],
    proseTag: "#erratic_cycle#",
  },
  {
    id: "frozen_cycle",
    category: "cycle",
    label: "Frozen cycle",
    axis: "cosmological",
    weight: 0.1,
    contradictions: [
      { with: "stable_orbit", severity: "strong" },
      { with: "shifting_orbit", severity: "strong" },
      { with: "chaotic_orbit", severity: "strong" },
    ],
    proseTag: "#frozen_cycle#",
  },
  {
    id: "stable_orbit",
    category: "orbit",
    label: "Stable orbit",
    axis: "cosmological",
    weight: 0.05,
    contradictions: [
      { with: "starless", severity: "medium", condition: "stars<2" },
      { with: "single_sun", severity: "medium", condition: "stars<2" },
      {
        with: "twin_suns",
        severity: "medium",
        condition: "stars==2 && !has(close_binary_orbit) && !has(wide_binary_orbit)",
      },
    ],
    proseTag: "#stable_orbit#",
  },
  {
    id: "shifting_orbit",
    category: "orbit",
    label: "Shifting orbit",
    axis: "cosmological",
    weight: 0.08,
    contradictions: [
      { with: "starless", severity: "medium", condition: "stars<2" },
      { with: "single_sun", severity: "medium", condition: "stars<2" },
    ],
    proseTag: "#shifting_orbit#",
  },
  {
    id: "chaotic_orbit",
    category: "orbit",
    label: "Chaotic orbit",
    axis: "cosmological",
    weight: 0.1,
    contradictions: [
      { with: "frozen_cycle", severity: "strong" },
      { with: "starless", severity: "strong" },
      { with: "single_sun", severity: "medium", condition: "stars<2" },
    ],
    proseTag: "#chaotic_orbit#",
  },
  {
    id: "close_binary_orbit",
    category: "orbit",
    label: "Close binary orbit (single-star)",
    axis: "cosmological",
    weight: 0.05,
    contradictions: [
      { with: "starless", severity: "medium", condition: "stars<2" },
      { with: "single_sun", severity: "medium", condition: "stars<2" },
    ],
    proseTag: "#close_binary_orbit#",
  },
  {
    id: "wide_binary_orbit",
    category: "orbit",
    label: "Wide binary orbit (circumbinary)",
    axis: "cosmological",
    weight: 0.05,
    contradictions: [
      { with: "starless", severity: "medium", condition: "stars<2" },
      { with: "single_sun", severity: "medium", condition: "stars<2" },
    ],
    proseTag: "#wide_binary_orbit#",
  },
  {
    id: "auroras",
    category: "phenomenon",
    label: "Auroras",
    axis: "cosmological",
    weight: 0.05,
    proseTag: "#auroras#",
  },
  {
    id: "recurring_eclipses",
    category: "phenomenon",
    label: "Recurring eclipses",
    axis: "cosmological",
    weight: 0.07,
    contradictions: [
      { with: "single_sun", severity: "medium", condition: "stars<2 && !has(companion_moon)" },
      { with: "starless", severity: "medium", condition: "stars<2" },
    ],
    proseTag: "#recurring_eclipses#",
  },
  {
    id: "permanent_veil",
    category: "phenomenon",
    label: "Permanent veil",
    axis: "cosmological",
    weight: 0.06,
    proseTag: "#permanent_veil#",
  },
  {
    id: "starfall",
    category: "phenomenon",
    label: "Starfall",
    axis: "cosmological",
    weight: 0.05,
    proseTag: "#starfall#",
  },
  ...EXTRA_SKY.SKY_BLOCKS,
];

const SKY_DEFAULTS = { stars: "single_sun", cycle: "steady_cycle" };

const UNKNOWN_LINE_COST = 0.1;

const COHERENCE_BONUS = 0.05;

module.exports = { COHERENCE_BONUS, EXTRA_SKY, SKY_DEFAULTS, SKY_ENTRIES, UNKNOWN_LINE_COST };
