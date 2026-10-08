"use strict";
/**
 * Ciel étendu : corps célestes et couleurs de soleil (blocs de cosmologie du moteur), durée du jour et de l'année (lignes de valeurs).
 *
 * Les BLOCS entrent dans le moteur à la construction (build.js les ajoute à sa liste de blocs de ciel, à ses règles ciel↔vivant et à
 * sa banque de phrases) : ils pèsent donc sur la stabilité, ont des contradictions et une phrase de description, mais ne sont JAMAIS
 * tirés au sort (ils ne figurent dans aucune case du tirage) : les mondes déjà tirés ne changent pas.
 * Les LIGNES (`day_length:`, `year_length:`) ne changent que le rendu de la fenêtre.
 */

const { parseAmounts } = require("./amounts");

const HUES = { green_sun: [150, 255, 150], red_sun: [255, 110, 80], white_sun: [250, 250, 255], blue_sun: [140, 190, 255], orange_sun: [255, 170, 80], violet_sun: [200, 140, 255] };
const HUE_IDS = Object.keys(HUES);

/** Mondes-types : un seul mot pour dire « ici, tout est de glace ». Pèsent sur la stabilité, jamais tirés au sort. */
const WORLD_IDS = ["frozen_world", "lava_world", "desert_world", "ocean_world", "jungle_world"];
const WORLD_LABEL = { frozen_world: "A frozen world", lava_world: "A world of lava", desert_world: "A desert world", ocean_world: "An ocean world", jungle_world: "A jungle world" };

const star = (id, label, weight, tag) => ({ id, category: "hue", label, axis: "cosmological", weight, proseTag: "#" + tag + "#" });
/** Deux couleurs de soleil écrites ensemble ne s'accordent que s'il y a deux soleils. */
const hueClash = (id) => HUE_IDS.filter((h) => h !== id).map((h) => ({ with: h, severity: "medium", condition: "stars<2" }));

const SKY_BLOCKS = [
  { id: "asteroid_belt", category: "belt", label: "Asteroid belt", axis: "cosmological", weight: 0.07, proseTag: "#asteroid_belt#",
    contradictions: [{ with: "starless", severity: "light", condition: "stars<1" }] },
  { id: "asteroid_field", category: "belt", label: "Asteroid field", axis: "cosmological", weight: 0.09, proseTag: "#asteroid_field#",
    contradictions: [{ with: "starless", severity: "light", condition: "stars<1" }, { with: "asteroid_belt", severity: "light" }] },
  { id: "planet_rings", category: "belt", label: "Ringed planet", axis: "cosmological", weight: 0.02, proseTag: "#planet_rings#",
    contradictions: [{ with: "starless", severity: "light", condition: "stars<1" }] },
  { id: "comet", category: "belt", label: "A comet", axis: "cosmological", weight: 0.04, proseTag: "#comet#" },
  star("green_sun", "A green sun", 0.03, "green_sun"), star("red_sun", "A red sun", 0.03, "red_sun"), star("white_sun", "A white sun", 0.02, "white_sun"),
  star("blue_sun", "A blue sun", 0.04, "blue_sun"), star("orange_sun", "An orange sun", 0.02, "orange_sun"), star("violet_sun", "A violet sun", 0.05, "violet_sun"),
  ...WORLD_IDS.map((id) => ({ id, category: "world", label: WORLD_LABEL[id], axis: "cosmological", weight: 0.02, proseTag: "#" + id + "#",
    contradictions: WORLD_IDS.filter((o) => o !== id).map((o) => ({ with: o, severity: "strong" })) })),
].map((b) => (HUES[b.id] ? { ...b, contradictions: [{ with: "starless", severity: "strong" }, ...hueClash(b.id)] } : b));

const NOTES = {
  rock_belt: ["the old stones have been struck before, and will be again", "a sky of broken rock watches over everything built here"],
  rock_field: ["one of the great stones overhead is a little closer each season", "something large drifts above, and the ground below has no say in where it lands"],
  rock_life: ["the green things grow in the shadow of falling stone", "the roots hold on beneath a sky that sometimes drops rock"],
  rock_lamp: ["a lamp still burns beneath a sky of falling stone"],
  rock_sea: ["the water keeps the shape of every stone the sky has thrown into it"],  frozen_world: ["the cold here is older than anything written beside it", "a frozen world does not thaw for what is written upon it"],
  lava_world: ["the ground is still being made here, and will not wait for what stands on it", "a world of fire gives little thought to what it burns"],
  desert_world: ["the dry world has no patience for anything that wants to be wet", "the sand keeps its own counsel, and drinks what is spilled upon it"],
  ocean_world: ["a world of water has no shore to hold what is dry", "the sea claims what it can reach, and it can reach everything"],
  jungle_world: ["the green world is hungry, and it takes what does not belong to it", "everything here grows, and grows over what is not alive"],
};
const FRAGILE = ["tablet", "lamp", "bridge", "door", "book", "lit_lamp", "worn_tablet", "speaking_tablet", "fallen_bridge", "sealed_door"];
const LIFE = ["great_tree", "grove", "ironwood", "sapling", "fern", "vine", "moss"];
const rule = (sky, withId, severity, axis, note) => ({ sky, with: withId, severity, axis, note });
/** Ce que chaque monde-type ne supporte pas : [id, gravité, axe]. */
const WORLD_CLASH = {
  frozen_world: [["lava", "strong", "geological"], ["heat", "medium", "weather"], ["wildfire", "medium", "ecological"], ["steam", "light", "weather"], ["sand", "light", "geological"], ["dust_storm", "light", "weather"]],
  lava_world: [["ice", "strong", "geological"], ["deep_cold", "strong", "weather"], ["black_ice", "medium", "geological"], ["hail", "medium", "weather"], ["rime", "medium", "weather"], ["meltwater", "light", "geological"], ["water", "light", "geological"]],
  desert_world: [["water", "medium", "geological"], ["ice", "medium", "geological"], ["deep_cold", "light", "weather"], ["rain", "medium", "weather"], ["marsh_mist", "medium", "weather"], ["fog", "light", "weather"]],
  ocean_world: [["sand", "medium", "geological"], ["lava", "medium", "geological"], ["dust_storm", "medium", "weather"], ["wildfire", "medium", "ecological"], ["glass", "light", "geological"]],
  jungle_world: [["sand", "medium", "geological"], ["ice", "medium", "geological"], ["deep_cold", "medium", "weather"], ["lava", "medium", "geological"], ["dust_storm", "medium", "weather"], ["wildfire", "strong", "ecological"], ["ash_cloud", "light", "weather"]],
};
/** Vie fragile selon le monde (gravité de la tension avec chaque bloc vivant). */
const WORLD_LIFE = { frozen_world: "light", lava_world: "medium", desert_world: "light" };
const SKY_RULES = [
  ...FRAGILE.map((w) => rule("asteroid_belt", w, "light", "geological", "rock_belt")),
  ...FRAGILE.map((w) => rule("asteroid_field", w, w === "bridge" || w === "fallen_bridge" ? "strong" : "medium", "geological", "rock_field")),
  ...LIFE.map((w) => rule("asteroid_belt", w, "light", "ecological", "rock_life")),
  ...LIFE.map((w) => rule("asteroid_field", w, "medium", "ecological", "rock_life")),
  rule("asteroid_belt", "lit_lamp", "light", "metaphysical", "rock_lamp"),
  ...["water", "brine", "meltwater"].map((w) => rule("asteroid_field", w, "light", "geological", "rock_sea")),
  ...Object.entries(WORLD_CLASH).flatMap(([world, list]) => [...list.map(([w, sev, ax]) => rule(world, w, sev, ax, world)), ...(WORLD_LIFE[world] ? LIFE.map((w) => rule(world, w, WORLD_LIFE[world], "ecological", world)) : [])]),
];

/** Banque de phrases : mêmes clés que `proseTag`. */
const SKY_PROSE = {
  asteroid_belt: ["a belt of broken rock circles overhead, glittering", "a river of stone drifts across the sky, never quite still", "a ring of debris keeps the heavens busy, and a little dangerous"],
  asteroid_field: ["great stones drift overhead, each with its own slow errand", "a field of wandering rock turns above, closer than it looks", "a few huge, patient bodies cross the sky, and nobody asked where they are headed"],
  planet_rings: ["a ringed world hangs in the sky, close enough to count the bands", "a pale planet wears its ring like a thin, bright road", "a banded giant rides high, its ring a line drawn across the dark"],
  comet: ["a comet trails its pale tail across the sky, in no hurry", "a long-haired star passes, and the night remembers it", "a slow streak of ice and light crosses overhead"],
  green_sun: ["the sun burns green, and the light has a leaf's patience", "a green star holds the sky, and everything under it is tinted", "a green sun, bright and strange, sets the colors of this place"],
  red_sun: ["a red sun hangs heavy, its light low and warm", "the sun burns red, and shadows lean long", "a swollen red star keeps a slow, embered watch"],
  white_sun: ["a white sun fills the sky with hard, clean light", "the sun burns white, leaving no corner kind", "a pale, steady star bleaches the hours"],
  blue_sun: ["a blue sun burns cold and bright overhead", "the sun is blue, and its warmth is only a rumor", "a hot, blue star colors the day with ice"],
  orange_sun: ["an orange sun sets the whole day to late afternoon", "the sun burns amber, kind to everything under it", "a gold-orange star keeps a gentle hour"],
  frozen_world: ["the whole world lies under ice, patient and bright", "a frozen world, where even the light moves slowly", "everything here has been still for a very long time, and the cold is its only memory"],
  lava_world: ["the world is a slow river of fire under a thin black crust", "a world of lava, where the ground itself is the weather", "molten rock glows under every step, and the sky is the color of embers"],
  desert_world: ["the world is dry to its bones, a wide and patient desert", "a desert world, where the horizon is the only thing that moves", "sand and silence, to the edge of what the sky can hold"],
  ocean_world: ["the world is water to the horizon, and the horizon is the only land", "an ocean world, deep and without a single shore", "everything here floats, or sinks, or waits beneath the surface"],
  jungle_world: ["the world is a single green hunger, dense and loud", "a jungle world, where every surface is alive with something", "leaf over leaf, to the edge of the sky, and nothing lies still beneath it"],
  violet_sun: ["a violet sun burns at the edge of what the eye can hold", "the sun is violet, and the day has the color of a bruise at dusk", "a violet star, strangely bright, tints the sky with dusk"],
};

/** Couleur de soleil écrite dans le bloc (les deux premières, dans l'ordre d'apparition). */
function sunColors(ids) { return ids.filter((i) => HUES[i]).slice(0, 2).map((i) => HUES[i]); }

// ---- lignes de valeurs -----------------------------------------------------------------------------------
const DAY_RE = /^\s*(?:day_length|day)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:min|mins|minutes?)?\s*$/i;
/** `window_size: large` (normal | large | xl) ou `window_width: 520` (pixels, 200 à 800) : taille de la fenêtre de liaison dans le bloc age. */
const SIZE_RE = /^\s*(?:window_size|window_width|window)\s*[:=]\s*(normal|small|large|big|xl|xxl|\d{3})(?:\s*px)?\s*$/i;
const YEAR_RE = /^\s*(?:year_length|year|revolution)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:days?|jours?)?\s*$/i;
/** `day_length: 40` (minutes réelles par jour, 0,2 à 1440) ; `year_length: 12` (jours par année, 1 à 365). Hors bornes : ignoré. */
function parseSky(src) {
  const out = {};
  for (const line of String(src || "").split("\n")) {
    let m = line.match(DAY_RE); if (m) { const v = Number(m[1].replace(",", ".")); if (v >= 0.2 && v <= 1440) out.dayLen = v; continue; }
    m = line.match(SIZE_RE); if (m) { const v = m[1].toLowerCase(); if (/^\d+$/.test(v)) { const px = Number(v); if (px >= 200 && px <= 800) out.size = px; } else out.size = v === "small" ? "normal" : v === "big" ? "large" : v === "xxl" ? "xl" : v; continue; }
    m = line.match(YEAR_RE); if (m) { const v = Number(m[1].replace(",", ".")); if (v >= 1 && v <= 365) out.yearLen = v; }
  }
  const amt = parseAmounts(src); if (amt) out.amt = amt; // quantités : beaucoup / peu / normal
  return out;
}

/** Phases réelles : jour (0..1) et saison (-1..1) à partir de l'horloge, ou null si la durée n'est pas écrite. */
function clockPhases(sky, now = Date.now()) {
  if (!sky || !sky.dayLen) return null;
  const day = (now / (sky.dayLen * 60000)) % 1, yr = sky.yearLen ? Math.sin(2 * Math.PI * (((now / (sky.dayLen * 60000)) / sky.yearLen) % 1)) : 0;
  return { day: day < 0 ? day + 1 : day, season: yr };
}

module.exports = { SIZE_RE, WORLD_IDS, HUES, HUE_IDS, SKY_BLOCKS, SKY_RULES, SKY_PROSE, NOTES, sunColors, DAY_RE, YEAR_RE, parseSky, clockPhases };
