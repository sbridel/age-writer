"use strict";
// Le corpus de référence : des Âges FIGÉS (texte + graine) dont on garde le verdict, pas le pourcentage.
// Une règle qui change un verdict doit le dire : on régénère (node test/corpus/make.js --update) dans le même commit
// que la règle, avec une ligne dans le CHANGELOG. Le moteur seul est évalué : la couche physique (plugin) n'y est pas.
// Pour ajouter un Âge de joueur réel : une entrée { id, why, seed, lines }.
const A = (id, why, lines, seed) => ({ id, why, seed: seed || id, lines });
module.exports = [
  // les chapitres de l'histoire
  A("story-rest", "chapitre 1 : une seule page", ["water"]),
  A("story-mend-start", "chapitre 2 : le monde abîmé", ["single_sun", "steady_cycle", "water", "lava"]),
  A("story-mend-fixed", "chapitre 2 : le remède", ["single_sun", "steady_cycle", "water"]),
  A("story-laws", "chapitre lois : sel", ["single_sun", "steady_cycle", "water", "salt"]),
  A("story-weather", "chapitre météo : pluie", ["single_sun", "steady_cycle", "water", "rain"]),
  A("story-alter", "chapitre modifier", ["single_sun", "steady_cycle", "water", "sand", "fern"]),
  A("story-hard-start", "chapitre difficile : départ", ["single_sun", "steady_cycle"]),
  A("story-hard-ref", "chapitre difficile : le monde qui répond", ["single_sun", "steady_cycle", "water", "sand", "fern", "grass", "rain", "fog"]),
  A("story-strange-start", "chapitre étrange : départ", ["steady_cycle", "water"]),
  A("story-strange-ref", "chapitre étrange : le monde du maître", ["violet_sun", "steady_cycle", "strange_stone", "tablet", "rain", "drizzle", "deep_cold"]),
  A("empty", "page vide : tout vient du tirage", []),
  // un monde de chaque type
  A("type-frozen", "monde gelé", ["frozen_world", "single_sun", "steady_cycle", "snow", "deep_cold"]),
  A("type-lava", "monde de lave", ["lava_world", "single_sun", "steady_cycle", "lava", "heat"]),
  A("type-lava-moss", "lave et fougère : clash", ["lava_world", "single_sun", "steady_cycle", "fern"]),
  A("type-desert", "désert", ["desert_world", "single_sun", "steady_cycle", "sand", "wind"]),
  A("type-desert-rain", "désert et pluie : clash écrit", ["desert_world", "single_sun", "steady_cycle", "sand", "rain"]),
  A("type-ocean", "océan", ["ocean_world", "single_sun", "steady_cycle", "water", "kelp", "plankton"]),
  A("type-jungle", "jungle", ["jungle_world", "single_sun", "steady_cycle", "water", "great_tree", "fern", "vine", "rain"]),
  A("type-cavern", "caverne", ["cavern_world", "starless", "steady_cycle", "stone", "water", "mycelium"]),
  A("type-cavern-algae", "caverne et algues lumineuses", ["cavern_world", "starless", "steady_cycle", "stone", "water", "glow_algae"]),
  // la richesse, la quantité, les cicatrices
  A("rich-modest", "modeste : peu de blocs", ["single_sun", "steady_cycle", "water", "sand", "grass", "rain"]),
  A("rich-coherent", "riche et cohérent", ["single_sun", "steady_cycle", "plains", "river", "water", "sand", "stone", "humus", "grass", "flowers", "bee", "berry_shrub", "fern", "great_tree", "rain", "fog", "moth", "grazer", "hunter", "mycelium", "wind"]),
  A("rich-heavy", "très riche : la capacité déborde", ["single_sun", "steady_cycle", "plains", "river", "water", "sand", "stone", "humus", "grass", "flowers", "bee", "berry_shrub", "fern", "great_tree", "vine", "heath_shrub", "thorn_bush", "rain", "fog", "drizzle", "wind", "moth", "grazer", "hunter", "burrower", "raptor", "spiders", "mycelium", "glow_algae", "kelp"]),
  A("rich-clash", "riche avec un clash écrit", ["single_sun", "steady_cycle", "desert_world", "water", "sand", "grass", "flowers", "great_tree", "rain", "snow", "hunter", "grazer"]),
  A("wealth-gold", "or seul", ["single_sun", "steady_cycle", "stone", "gold"]),
  A("wealth-gold-scar", "or et surface calcinée : allègement", ["single_sun", "steady_cycle", "stone", "gold", "scorched_surface"]),
  A("wealth-gems-scars", "gemmes et deux cicatrices", ["single_sun", "steady_cycle", "stone", "gems", "scorched_surface", "barren_soil"]),
  A("scar-only", "cicatrices sans richesse", ["single_sun", "steady_cycle", "stone", "ashen_sky", "held_rain"]),
  // cicatrices tirées (graine choisie : le tirage apporte un clash moyen)
  A("drawn-scar-lava", "lave et eau : cicatrice légère tirée", ["lava_world", "single_sun", "steady_cycle", "water"], "s0"),
  A("drawn-scar-desert", "désert et pluie : cicatrice légère tirée, stable", ["desert_world", "single_sun", "steady_cycle", "rain"], "s0"),
  A("drawn-scar-desert-weak", "désert et pluie : cicatrice tirée, monde instable côté temps", ["desert_world", "single_sun", "steady_cycle", "rain"], "s21"),
  // la maladie du vivant (src/life.js) : un rôle qui nourrit, tenu par une seule espèce, et des consommateurs qui en dépendent
  A("blight-grass", "herbe seule et brouteurs : malade (tirée en équilibrée avec cette graine)", ["single_sun", "steady_cycle", "water", "grass", "grazer", "carrion_beetle"], "xe"),
  A("blight-cured", "le remède : une seconde plante", ["single_sun", "steady_cycle", "water", "grass", "fern", "grazer", "carrion_beetle"], "xe"),
  A("blight-mycelium", "mycélium seul à rendre les morts : malade en stricte", ["single_sun", "steady_cycle", "water", "grass", "fern", "grazer", "mycelium"], "g"),
  // des mondes insolites et des clashs franchement forts
  A("clash-strong", "lave et eau écrites", ["single_sun", "steady_cycle", "lava", "water", "acid", "stone"]),
  A("strange-mix", "étrange : plusieurs soleils et un trou noir", ["twin_suns", "chaotic_orbit", "black_hole", "close_orbit", "tablet", "strange_stone"]),
  A("dark-ruins", "ruines sous un soleil noir", ["black_sun", "frozen_cycle", "ruined_library", "door", "bridge", "tablet", "lamp", "deep_cold"]),
];
