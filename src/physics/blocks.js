"use strict";
/**
 * Couche physique : ce que chaque BLOC dit de la physique du monde.
 *
 *   set    ce que le bloc fixe ou déplace dans les paramètres (avant le tirage sous contraintes)
 *   needs  les exigences physiques du bloc (identifiants de REQUIREMENTS, voir rules.js),
 *          avec une gravité propre au bloc : [id, gravité] ; la gravité par défaut est celle de l'exigence.
 *
 * Un bloc absent de cette table est « neutre » : la physique ne dit rien sur lui (ruines, fissures,
 * matières étranges). C'est voulu : l'Art d'écrire n'a pas à tout justifier.
 */

/** Couleurs de soleil → plage de masse (Soleil = 1). Vert et violet n'existent pas pour une vraie étoile. */
const HUE_MASS = {
  red_sun: [0.15, 0.5],
  orange_sun: [0.6, 0.9],
  white_sun: [1.1, 1.6],
  blue_sun: [3, 12],
  green_sun: [0.85, 1.15], // une étoile de type solaire dont l'Art teinte la lumière
  violet_sun: [1.4, 2.4], // lue comme une étoile chaude, riche en ultraviolets
  black_sun: [0.04, 0.075], // naine brune : voir model.brownDwarf
};

const B = {};
const def = (ids, spec) => { for (const id of [].concat(ids)) { const o = B[id] || {}; B[id] = { ...o, ...spec, set: spec.set || o.set ? { ...(o.set || {}), ...(spec.set || {}) } : undefined, needs: [...(o.needs || []), ...(spec.needs || [])] }; } };

// ---- ciel ---------------------------------------------------------------------------------------
def("single_sun", { set: { stars: 1 } });
def("twin_suns", { set: { stars: 2 } });
def("starless", { set: { stars: 0 } });
def("companion_moon", { set: { moon: true } });
def("frozen_cycle", { set: { locked: true }, needs: [["lockPlausible"]] });
def("erratic_cycle", { set: { chaoticAxis: true }, needs: [["axisChaos"]] });
def("auroras", { needs: [["magneticField"]] });
def("permanent_veil", { set: { veil: 0.3, albedoAdd: 0.15 } });
def("planet_rings", { set: { giantHost: true } }); // le ciel montre une géante annelée toute proche : ce monde est l'une de ses lunes
def("close_binary_orbit", { set: { binary: "S" } });
def("wide_binary_orbit", { set: { binary: "P" } });
for (const [hue, range] of Object.entries(HUE_MASS)) def(hue, { set: { hue, starMassRange: range } });
def("black_sun", { set: { blackSun: true } });
def(["green_sun", "violet_sun"], { needs: [["realStar"]] });

// ---- mondes-types ------------------------------------------------------------------------------
def("frozen_world", { set: { albedoAdd: 0.25 }, needs: [["frozenSurface", "medium"]] });
def("lava_world", { set: { water: 0.05 }, needs: [["magmaOcean", "strong"]] });
def("desert_world", { set: { water: 0.02 }, needs: [["dryClimate", "medium"], ["notFurnace", "medium"]] });
def("ocean_world", { set: { water: 3 }, needs: [["deepOcean", "strong"]] });
def("jungle_world", { set: { water: 1.5 }, needs: [["liquidWater", "medium"], ["warmClimate", "medium"], ["sunlight", "medium"], ["oldEnoughComplex", "medium"]] });

// ---- géologie -----------------------------------------------------------------------------------
def("water", { set: { water: 1 }, needs: [["liquidWater", "light"]] });
def(["brine", "silt"], { set: { water: 1 }, needs: [["liquidWater", "light"]] });
def("meltwater", { set: { water: 1 }, needs: [["thawing", "light"]] });
def("lava", { needs: [["volcanism", "medium"]] });
def(["ash", "obsidian", "whispering_obsidian", "crying_obsidian", "glass", "singing_glass"], { needs: [["volcanism", "light"]] });
def("iron", { set: { coreAdd: 0.12 } });
def("deep_cold", { needs: [["coldSomewhere", "light"]] });
def("sand", { needs: [["erosion", "light"]] });
def("kelp", { needs: [["liquidWater", "medium"], ["sunlight", "light"], ["oldEnoughSimple", "light"]] });
def("coral", { needs: [["liquidWater", "medium"], ["warmClimate", "light"], ["sunlight", "light"], ["oldEnoughSimple", "light"]] });
def("acid", { needs: [["volcanism", "light"]] });
def("pearls", { needs: [["liquidWater", "medium"], ["oldEnoughSimple", "light"]] });
def(["gold", "silver", "copper"], { needs: [["hydrothermalPast", "light"]] });
def(["poisoned_air", "ashen_sky"], { needs: [["volcanism", "light"]] });
def("scorched_surface", { needs: [["scorching", "light"]] });

// ---- météo ----------------------------------------------------------------------------------------
def(["wind", "dust_storm"], { needs: [["someAir", "medium"]] });
def(["rain", "marsh_mist", "watching_mist"], { needs: [["rainCycle", "light"]] });
def(["fog"], { needs: [["moistAir", "light"]] });
def(["storm", "whispering_storm", "thunderstorm", "waiting_thunder", "hail", "black_hail"], { needs: [["convection", "light"]] });
def("lightning", { needs: [["convection", "light"]] });
def("heat", { needs: [["hotSomewhere", "light"]] });
def(["rime"], { needs: [["coldSomewhere", "light"]] });
def("ash_cloud", { set: { albedoAdd: 0.1, veil: 0.6 }, needs: [["volcanism", "light"]] });
// météo vivante : bruine et pluies étranges (cycle de l'eau), neige et verglas (du froid quelque part), arc-en-ciel (pluie et soleil),
// tornade (convection), brume parfumée (air humide), pétales (du vent)
def(["drizzle", "crystal_rain", "acid_rain"], { needs: [["rainCycle", "light"]] });
def("ash_rain", { needs: [["rainCycle", "light"], ["volcanism", "light"]] });
def(["snow", "glaze"], { needs: [["coldSomewhere", "light"]] });
def("rainbow", { needs: [["rainCycle", "light"], ["sunlight", "light"]] });
def("tornado", { needs: [["convection", "medium"], ["someAir", "medium"]] });
def("scented_mist", { needs: [["moistAir", "light"]] });
def("petal_rain", { needs: [["someAir", "light"]] });

// ---- vivant --------------------------------------------------------------------------------------
const PHOTO = ["seed", "sapling", "fern", "vine", "great_tree", "grove", "ironwood", "moss", "withered_fern", "cinderbloom", "flowers", "grass", "meadow"];
def(PHOTO, { needs: [["sunlight", "light"], ["breathableAir", "light"], ["temperateLife", "light"], ["oldEnoughSimple", "light"], ["uvShield", "light"]] });
def(["great_tree", "grove", "ironwood"], { needs: [["oldEnoughComplex", "light"], ["tallTrees", "light"]] });
def(["spore", "pale_fungus", "lichen", "singing_lichen"], { needs: [["oldEnoughSimple", "light"], ["hardyLife", "light"]] });
def(["grazer", "herd", "watching_herd"], { needs: [["foodPlants", "light"], ["oldEnoughComplex", "light"], ["breathableAir", "light"], ["temperateLife", "light"]] });
def(["hunter", "stalking_pack"], { needs: [["prey", "light"], ["oldEnoughComplex", "light"], ["breathableAir", "light"], ["temperateLife", "light"]] });
def(["burrower", "warren", "humming_warren"], { needs: [["soil", "light"], ["breathableAir", "light"], ["temperateLife", "light"]] });
def(["moth", "lantern_moths", "whispering_moths"], { needs: [["foodPlants", "light"]] });
def(["drifter"], { needs: [["buoyancy", "light"]] });

// ---- blocs de géophysique (src/geophys.js) : des mots à la place des chiffres -----------------------
def("close_orbit", { set: { sRange: [1.2, 2.6] } });
def("distant_orbit", { set: { sRange: [0.12, 0.6] } });
def("young_world", { set: { ageRange: [0.05, 0.8] } });
def("ancient_world", { set: { ageRange: [7, 12] }, needs: [["oldStar", "medium"]] });
def("heavy_world", { set: { massRange: [2.5, 8] } });
def("light_world", { set: { massRange: [0.06, 0.35] } });
def("molten_core", { set: { coreAdd: 0.05 }, needs: [["coreMolten", "medium"]] });
def("dead_core", { needs: [["coreDead", "medium"]] });
def("geysers", { set: { water: 1 }, needs: [["geothermal", "medium"]] });
def("rifts", { needs: [["plateTectonics", "medium"]] });
def("thick_air", { needs: [["airThick", "medium"]] });
def("thin_air", { needs: [["airThin", "medium"]] });
def("subsurface_ocean", { set: { water: 1 }, needs: [["iceOcean", "medium"]] });

// ---- terrains (src/terrain.js) et habitants (src/places.js) ----------------------------------------
def("mountains", { needs: [["plateTectonics", "light"]] });
def(["hills", "canyon"], { needs: [["erosion", "light"]] });
def(["river", "delta"], { set: { water: 1 }, needs: [["liquidWater", "medium"], ["rainCycle", "light"]] });
def("delta", { needs: [["erosion", "light"]] });
def("lake", { set: { water: 1 }, needs: [["liquidWater", "medium"]] });
def("marsh", { set: { water: 1 }, needs: [["liquidWater", "medium"], ["moistAir", "light"]] });
def("spiders", { needs: [["prey", "light"], ["breathableAir", "light"], ["temperateLife", "light"]] });

/** Groupes utiles aux exigences « écologiques » (chaîne alimentaire). */
const FLORA = ["seed", "sapling", "fern", "vine", "great_tree", "grove", "ironwood", "moss", "lichen", "singing_lichen", "pale_fungus", "spore", "glowvine", "wrong_glowvine", "cinderbloom", "withered_fern", "charred_grove", "flowers", "grass", "meadow"];
const PREY = ["grazer", "herd", "watching_herd", "burrower", "warren", "humming_warren", "drifter", "moth", "lantern_moths", "whispering_moths"];
const SOIL = ["sand", "silt", "stone", "ash", "salt"];
/** Bâtisseurs : leurs traces disent que quelqu'un a pu apporter ce que la nature n'aurait pas fait. */
const BUILDERS = ["tablet", "lamp", "bridge", "door", "book", "worn_tablet", "lit_lamp", "sealed_door", "blurred_book", "fallen_bridge", "speaking_tablet", ...require("../places").BUILT_IDS];

/** Mondes-types : en mode facile ils orientent le tirage, en strict ils sont seulement vérifiés. */
const WORLDS = ["frozen_world", "lava_world", "desert_world", "ocean_world", "jungle_world"];

module.exports = { WORLDS, BLOCKS: B, HUE_MASS, FLORA, PREY, SOIL, BUILDERS, PHOTO };
