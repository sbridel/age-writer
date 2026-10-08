"use strict";
/**
 * Couche physique : les EXIGENCES. Chacune dit ce qu'un bloc demande au monde, comment le vérifier
 * sur l'état calculé (`w`, voir solve.js), ce que l'on dit à l'auteur quand ce n'est pas le cas
 * (`why`), et comment s'en sortir.
 *
 *   test(w)   vrai si le monde satisfait l'exigence
 *   axis      axe de stabilité touché en mode strict
 *   sev       gravité par défaut (light / medium / strong) ; le bloc peut la changer
 *   law       la loi de model.js en jeu (L1…L8), pour la fiche et la doc
 *   search    paramètres que l'on peut faire varier pour satisfaire l'exigence : solve.js cherche la
 *             valeur la plus proche qui marche, et la fiche la propose comme ligne à écrire
 *             (« insolation: 1,4 ») — c'est le monde qui dit à l'auteur ce qu'il faudrait écrire
 *   fix(w)    pistes qui ne sont pas des nombres (un bloc à ajouter, à retirer…)
 *
 * Les textes existent en français et en anglais.
 */
const { HEAT, WATER_TRIPLE_BAR, FIELD_SHIELD, boilingPoint } = require("./model");
const { FLORA, PREY, SOIL, BUILDERS } = require("./blocks");

const has = (w, list) => list.some((id) => w.ids.has(id));
const tip = (fr, en) => ({ fr, en });

const REQUIREMENTS = {
  // ---- L4 : intérieur ----------------------------------------------------------------------------
  volcanism: {
    law: "L4", axis: "geological", sev: "medium", search: ["age", "mass"],
    test: (w) => w.heat >= HEAT.volcanism || w.Ts >= 1200,
    why: {
      fr: (w, f) => `L'intérieur est trop froid pour nourrir des volcans (chaleur interne ${f(w.heat)} ; il faut au moins ${f(HEAT.volcanism)}).`,
      en: (w, f) => `The interior is too cold to feed volcanoes (internal heat ${f(w.heat)}; at least ${f(HEAT.volcanism)} is needed).`,
    },
    fix: (w) => (w.giantHost ? [] : [tip("une géante toute proche qui la pétrit par marée (planet_rings)", "a nearby giant kneading it by tides (planet_rings)")]),
  },
  magmaOcean: {
    law: "L4", axis: "geological", sev: "strong", search: ["age", "insolation", "mass"],
    test: (w) => w.heat >= HEAT.magmaOcean || w.Ts >= 1200,
    why: {
      fr: (w, f) => `Un monde de lave demande un océan de magma : une chaleur interne d'au moins ${f(HEAT.magmaOcean)} (ici ${f(w.heat)}) ou une surface à plus de 1 200 K (ici ${f(w.Ts, 0)} K).`,
      en: (w, f) => `A lava world needs a magma ocean: internal heat of at least ${f(HEAT.magmaOcean)} (here ${f(w.heat)}) or a surface above 1,200 K (here ${f(w.Ts, 0)} K).`,
    },
    fix: (w) => (w.giantHost ? [] : [tip("une géante voisine qui la chauffe par marée, comme Io (planet_rings)", "a neighbouring giant tide-heating it, like Io (planet_rings)")]),
  },
  hydrothermalPast: {
    law: "L4", axis: "geological", sev: "light",
    test: (w) => w.waterInv > 0 || w.heat >= 0.3,
    why: { fr: () => "Les filons de métal naissent de l'eau chaude qui circule dans la roche ; ici, ni eau ni chaleur.", en: () => "Metal veins are laid down by hot water moving through rock; here there is neither water nor heat." },
    fix: () => [tip("un peu d'eau (water)", "some water (water)")],
  },

  // ---- L4 : champ magnétique ----------------------------------------------------------------------
  magneticField: {
    law: "L4", axis: "cosmological", sev: "light", search: ["rotation", "age", "mass"],
    test: (w) => w.field > FIELD_SHIELD && w.stars > 0,
    why: {
      fr: (w, f) => (w.stars === 0
        ? "Sans étoile, il n'y a pas de vent stellaire pour allumer des aurores."
        : w.heat < HEAT.liquidCore
          ? `Le noyau s'est figé (chaleur interne ${f(w.heat)}) : pas de dynamo, donc des aurores faibles et diffuses, comme sur Mars.`
          : `La rotation est lente (${f(w.rotation, 0)} h) : la dynamo reste trop faible pour un vrai bouclier, et les aurores restent pâles.`),
      en: (w, f) => (w.stars === 0
        ? "Without a star there is no stellar wind to light auroras."
        : w.heat < HEAT.liquidCore
          ? `The core has frozen (internal heat ${f(w.heat)}): no dynamo, so auroras stay faint and patchy, as on Mars.`
          : `Rotation is slow (${f(w.rotation, 0)} h): the dynamo stays too weak for a real shield, and auroras stay pale.`),
    },
    fix: (w) => (w.stars === 0 ? [tip("une étoile (single_sun)", "a star (single_sun)")] : w.heat < HEAT.liquidCore ? [tip("plus de fer au cœur (iron)", "more iron at the core (iron)")] : []),
  },

  // ---- L2 : orbite et rotation --------------------------------------------------------------------
  lockPlausible: {
    law: "L2", axis: "cosmological", sev: "light", search: ["insolation"],
    test: (w) => w.giantHost || w.stars === 0 || w.lockTime <= w.age,
    why: {
      fr: (w, f) => `À ${f(w.a)} UA d'une étoile de ${f(w.starMass)} M☉, un monde met environ ${f(w.lockTime, 0)} Ga à cesser de tourner sur lui-même ; il n'a que ${f(w.age)} Ga.`,
      en: (w, f) => `At ${f(w.a)} AU from a ${f(w.starMass)} M☉ star, a world takes about ${f(w.lockTime, 0)} Gyr to stop spinning; it is only ${f(w.age)} Gyr old.`,
    },
    fix: () => [
      tip("un petit soleil rouge et une orbite serrée : la marée y fige vite la rotation (red_sun)", "a small red sun and a tight orbit: tides freeze the spin fast there (red_sun)"),
      tip("faire de ce monde la lune d'une géante, qui lui montre toujours la même face (planet_rings)", "make this world a giant's moon, always showing it the same face (planet_rings)"),
    ],
  },
  axisChaos: {
    law: "L2", axis: "cosmological", sev: "light",
    test: (w) => !w.moon,
    why: { fr: () => "Une grande lune stabilise l'axe d'un monde (c'est le cas de la Terre) : des saisons déréglées s'expliquent mal avec elle.", en: () => "A large moon steadies a world's axis (as it does Earth's): erratic seasons are hard to explain with one." },
    fix: () => [tip("retirer la lune (companion_moon), ou la dire petite et lointaine", "remove the moon (companion_moon), or call it small and distant")],
  },

  // ---- L1 : étoiles ---------------------------------------------------------------------------------
  realStar: {
    law: "L1", axis: "metaphysical", sev: "light",
    test: () => false,
    why: { fr: () => "Aucune étoile ne brille vert ou violet : une étoile qui émet surtout du vert nous paraît blanche. Ce ciel tient de l'Art, pas de la nature.", en: () => "No star shines green or violet: a star peaking in green looks white to us. This sky comes from the Art, not from nature." },
    fix: () => [tip("garder ce soleil, en connaissance de cause : il coûte un peu d'Art", "keep this sun knowingly: it costs a little Art")],
  },

  // ---- L5/L6 : température, eau, air -------------------------------------------------------------------
  liquidWater: {
    law: "L6", axis: "geological", sev: "light", search: ["insolation", "atmosphere", "water"],
    test: (w) => w.water === "liquid" || (w.water === "ice" && has(w, ["frozen_world", "deep_cold", "ice", "black_ice"])),
    why: {
      fr: (w, f) => (w.water === "ice"
        ? `À ${f(w.Ts, 0)} K en surface, l'eau est de la glace${w.P < WATER_TRIPLE_BAR ? " (et l'air est trop rare pour qu'elle coule jamais)" : ""}.`
        : w.water === "vapor"
          ? `À ${f(w.Ts, 0)} K sous ${f(w.P)} bar, l'eau bout (elle bout à ${f(boilingPoint(w.P), 0)} K) : elle reste en vapeur.`
          : "Il n'y a pas d'eau à la surface de ce monde."),
      en: (w, f) => (w.water === "ice"
        ? `At ${f(w.Ts, 0)} K at the surface, water is ice${w.P < WATER_TRIPLE_BAR ? " (and the air is too thin for it ever to flow)" : ""}.`
        : w.water === "vapor"
          ? `At ${f(w.Ts, 0)} K under ${f(w.P)} bar, water boils (it boils at ${f(boilingPoint(w.P), 0)} K): it stays vapour.`
          : "There is no water at this world's surface."),
    },
    fix: (w) => (w.water === "ice" ? [tip("ou assumer la glace : deep_cold, frozen_world", "or embrace the ice: deep_cold, frozen_world")] : []),
  },
  deepOcean: {
    law: "L6", axis: "geological", sev: "strong", search: ["water", "insolation"],
    test: (w) => w.water === "liquid" && w.waterInv >= 1,
    why: {
      fr: (w, f) => (w.water !== "liquid" ? REQUIREMENTS.liquidWater.why.fr(w, f) : "Un monde-océan demande assez d'eau pour noyer toutes les terres."),
      en: (w, f) => (w.water !== "liquid" ? REQUIREMENTS.liquidWater.why.en(w, f) : "An ocean world needs enough water to drown every shore."),
    },
    fix: (w) => (w.ids.has("desert_world") ? [tip("choisir entre l'océan et le désert", "choose between ocean and desert")] : []),
  },
  thawing: {
    law: "L6", axis: "geological", sev: "light", search: ["insolation"],
    test: (w) => w.Ts >= 250 && w.Ts <= 300 && w.P >= WATER_TRIPLE_BAR,
    why: { fr: (w, f) => `L'eau de fonte suppose une surface qui oscille autour du gel ; ici ${f(w.Ts, 0)} K.`, en: (w, f) => `Meltwater needs a surface hovering around freezing; here ${f(w.Ts, 0)} K.` },
  },
  frozenSurface: {
    law: "L5", axis: "cosmological", sev: "medium", search: ["insolation", "atmosphere"],
    test: (w) => w.Ts < 255,
    why: { fr: (w, f) => `Un monde gelé à ${f(w.Ts - 273.15, 0)} °C en moyenne ? Pour que tout reste pris, il faut rester sous −18 °C (255 K).`, en: (w, f) => `A frozen world averaging ${f(w.Ts - 273.15, 0)} °C? For everything to stay locked, it must stay below −18 °C (255 K).` },
  },
  warmClimate: {
    law: "L5", axis: "ecological", sev: "medium", search: ["insolation", "atmosphere"],
    test: (w) => w.Ts >= 283 && w.Ts <= 320,
    why: { fr: (w, f) => `Une jungle veut une surface chaude et humide (283–320 K) ; ici ${f(w.Ts, 0)} K.`, en: (w, f) => `A jungle wants a warm, wet surface (283–320 K); here ${f(w.Ts, 0)} K.` },
  },
  dryClimate: {
    law: "L6", axis: "geological", sev: "medium", search: ["water"],
    test: (w) => w.waterInv <= 0.1 || w.water !== "liquid",
    why: { fr: () => "Un désert avec autant d'eau liquide ?", en: () => "A desert with this much liquid water?" },
  },
  notFurnace: {
    law: "L5", axis: "geological", sev: "medium", search: ["insolation", "age"],
    test: (w) => w.Ts <= 340,
    why: {
      fr: (w, f) => `Un désert, pas une fournaise : ici ${f(w.Ts - 273.15, 0)} °C sous ${f(w.P)} bar${w.P > 10 ? ", comme sur Vénus" : ""}.`,
      en: (w, f) => `A desert, not a furnace: here ${f(w.Ts - 273.15, 0)} °C under ${f(w.P)} bar${w.P > 10 ? ", as on Venus" : ""}.`,
    },
    fix: () => [tip("ou l'assumer : lava_world, heat, scorched_surface", "or embrace it: lava_world, heat, scorched_surface")],
  },
  coldSomewhere: {
    law: "L5", axis: "weather", sev: "light", search: ["insolation"],
    test: (w) => w.Ts <= 300 || w.locked,
    why: { fr: (w, f) => `Un froid profond sur un monde à ${f(w.Ts, 0)} K : seulement au fond des grottes, ou sur les sommets.`, en: (w, f) => `Deep cold on a ${f(w.Ts, 0)} K world: only deep in caves, or on the peaks.` },
    fix: () => [tip("ou une face de nuit éternelle (frozen_cycle)", "or an eternal night side (frozen_cycle)")],
  },
  hotSomewhere: {
    law: "L5", axis: "weather", sev: "light", search: ["insolation", "atmosphere"],
    test: (w) => w.Ts >= 295 || w.heat >= HEAT.volcanism || w.locked,
    why: { fr: (w, f) => `Une chaleur lourde à ${f(w.Ts, 0)} K, sans volcan ni soleil fort pour la donner.`, en: (w, f) => `Heavy heat at ${f(w.Ts, 0)} K, with no volcano or strong sun to give it.` },
    fix: () => [tip("ou de la lave (lava)", "or some lava (lava)")],
  },
  scorching: {
    law: "L5", axis: "geological", sev: "light", search: ["insolation"],
    test: (w) => w.S >= 1.5 || w.heat >= HEAT.volcanism || w.Ts >= 320,
    why: { fr: () => "Une surface calcinée, sous un soleil doux et sur un sol froid ?", en: () => "A scorched surface, under a gentle sun, over cold ground?" },
    fix: () => [tip("ou un passé volcanique (ash, lava)", "or a volcanic past (ash, lava)")],
  },
  someAir: {
    law: "L5", axis: "weather", sev: "medium", search: ["mass", "atmosphere"],
    test: (w) => w.P >= 0.005,
    why: { fr: (w, f) => `Le vent demande de l'air ; il n'y en a presque pas (${f(w.P)} bar).`, en: (w, f) => `Wind needs air; there is almost none (${f(w.P)} bar).` },
    fix: () => [tip("un champ magnétique qui protège l'air (iron)", "a magnetic field to shield the air (iron)")],
  },
  moistAir: {
    law: "L6", axis: "weather", sev: "light", search: ["atmosphere", "water"],
    test: (w) => w.P >= 0.05 && (w.water === "liquid" || w.water === "vapor" || w.waterInv > 0.3),
    why: { fr: () => "La brume veut de l'air et de l'eau à évaporer.", en: () => "Fog needs air, and water to evaporate." },
  },
  rainCycle: {
    law: "L6", axis: "weather", sev: "light", search: ["insolation", "atmosphere", "water"],
    test: (w) => w.P >= 0.05 && (w.water === "liquid" || w.water === "vapor") && (w.S >= 0.05 || w.heat >= 2),
    why: {
      fr: (w, f) => (w.P < 0.05 ? `Trop peu d'air (${f(w.P)} bar) pour faire des nuages.` : w.water === "ice" ? "L'eau est gelée : il neige, il ne pleut pas." : w.water === "none" ? "Pas d'eau à évaporer : d'où viendrait la pluie ?" : "Rien ne soulève l'eau : ni soleil, ni chaleur du sol."),
      en: (w, f) => (w.P < 0.05 ? `Too little air (${f(w.P)} bar) to make clouds.` : w.water === "ice" ? "The water is frozen: it snows, it does not rain." : w.water === "none" ? "No water to evaporate: where would rain come from?" : "Nothing lifts the water: no sun, no warm ground."),
    },
  },
  convection: {
    law: "L5", axis: "weather", sev: "light", search: ["atmosphere", "insolation"],
    test: (w) => w.P >= 0.1 && (w.S >= 0.2 || w.heat >= 1.5),
    why: { fr: (w, f) => `Les orages naissent de l'air chaud qui monte ; ici ${f(w.P)} bar et peu d'énergie pour le soulever.`, en: (w, f) => `Storms are born of rising warm air; here ${f(w.P)} bar and little energy to lift it.` },
  },
  erosion: {
    law: "L5", axis: "geological", sev: "light", search: ["atmosphere"],
    test: (w) => w.P >= 0.005 || w.waterInv > 0,
    why: { fr: () => "Le sable naît de l'érosion par le vent ou l'eau ; ici, ni l'un ni l'autre. Seule la poussière des impacts.", en: () => "Sand comes from erosion by wind or water; here there is neither. Only impact dust." },
  },

  // ---- blocs de géophysique ----------------------------------------------------------------------------
  oldStar: {
    law: "L1", axis: "cosmological", sev: "medium", search: [],
    test: (w) => w.stars === 0 || w.starLife >= 7,
    why: { fr: (w, f) => `Un monde ancien autour d'une étoile qui ne vit que ${f(w.starLife)} Ga ?`, en: (w, f) => `An ancient world around a star that lives only ${f(w.starLife)} Gyr?` },
    fix: () => [tip("un soleil calme et durable (single_sun, orange_sun, red_sun)", "a calm, long-lived sun (single_sun, orange_sun, red_sun)")],
  },
  coreMolten: {
    law: "L4", axis: "geological", sev: "medium", search: ["age", "mass"],
    test: (w) => w.heat >= HEAT.liquidCore,
    why: { fr: (w, f) => `Un noyau en fusion, mais l'intérieur s'est refroidi (chaleur ${f(w.heat)} ; il faut ${f(HEAT.liquidCore)}).`, en: (w, f) => `A molten core, but the interior has cooled (heat ${f(w.heat)}; ${f(HEAT.liquidCore)} is needed).` },
    fix: (w) => (w.giantHost ? [] : [tip("ou une géante voisine qui la chauffe par marée (planet_rings)", "or a neighbouring giant heating it by tides (planet_rings)")]),
  },
  coreDead: {
    law: "L4", axis: "geological", sev: "medium", search: ["age", "mass"],
    test: (w) => w.heat < HEAT.liquidCore,
    why: { fr: (w, f) => `Un noyau mort, mais l'intérieur est encore chaud (chaleur ${f(w.heat)}).`, en: (w, f) => `A dead core, but the interior is still hot (heat ${f(w.heat)}).` },
    fix: () => [tip("ou un monde ancien et léger (ancient_world, light_world)", "or an ancient, light world (ancient_world, light_world)")],
  },
  geothermal: {
    law: "L4", axis: "geological", sev: "medium", search: ["age", "mass"],
    test: (w) => w.heat >= 0.35 && w.waterInv > 0.05 && w.P >= WATER_TRIPLE_BAR,
    why: {
      fr: (w, f) => (w.heat < 0.35 ? `Des geysers demandent une roche chaude sous l'eau ; ici, la chaleur interne n'est que de ${f(w.heat)}.` : "Des geysers sans eau ni air pour les porter ?"),
      en: (w, f) => (w.heat < 0.35 ? `Geysers need hot rock under water; here, internal heat is only ${f(w.heat)}.` : "Geysers with no water or air to carry them?"),
    },
  },
  plateTectonics: {
    law: "L4", axis: "geological", sev: "medium", search: ["age", "mass", "water"],
    test: (w) => w.tectonics,
    why: {
      fr: (w, f) => (w.M < 0.5 ? `Des failles et des plaques qui bougent demandent une planète assez grande ; celle-ci fait ${f(w.M)} M⊕.` : w.heat < HEAT.tectonics ? `Les plaques ne bougent plus : chaleur interne ${f(w.heat)} (il faut ${f(HEAT.tectonics)}).` : "Sans eau liquide pour lubrifier la croûte, les plaques restent soudées (comme sur Vénus)."),
      en: (w, f) => (w.M < 0.5 ? `Rifts and moving plates need a large enough planet; this one is ${f(w.M)} M⊕.` : w.heat < HEAT.tectonics ? `The plates no longer move: internal heat ${f(w.heat)} (${f(HEAT.tectonics)} needed).` : "Without liquid water to lubricate the crust, the plates stay welded (as on Venus)."),
    },
    fix: () => [tip("il faut à la fois un intérieur chaud, une planète assez grande et de l'eau liquide", "it takes a hot interior, a large enough planet and liquid water, all three")],
  },
  airThick: {
    law: "L5", axis: "weather", sev: "medium", search: ["mass", "atmosphere"],
    test: (w) => w.P >= 2,
    why: { fr: (w, f) => `Un air épais, mais la planète n'en retient que ${f(w.P)} bar.`, en: (w, f) => `Thick air, but the planet holds only ${f(w.P)} bar.` },
    fix: () => [tip("ou plus de volatils (volatiles: 3)", "or more volatiles (volatiles: 3)")],
  },
  airThin: {
    law: "L5", axis: "weather", sev: "medium", search: ["mass", "atmosphere"],
    test: (w) => w.P >= 0.005 && w.P < 0.3,
    why: { fr: (w, f) => (w.P < 0.005 ? `Un air mince ? Il n'y en a presque plus (${f(w.P)} bar).` : `Un air mince, mais la planète en garde ${f(w.P)} bar.`), en: (w, f) => (w.P < 0.005 ? `Thin air? There is almost none left (${f(w.P)} bar).` : `Thin air, but the planet keeps ${f(w.P)} bar.`) },
  },
  iceOcean: {
    law: "L6", axis: "geological", sev: "medium", search: ["insolation", "age"],
    test: (w) => w.water === "ice" && w.heat >= 0.2,
    why: {
      fr: (w, f) => (w.water !== "ice" ? `Un océan caché sous la glace, mais la surface n'est pas gelée (${f(w.Ts - 273.15, 0)} °C).` : `Un océan sous la glace demande un peu de chaleur venue d'en bas ; ici ${f(w.heat)}.`),
      en: (w, f) => (w.water !== "ice" ? `An ocean hidden under ice, but the surface is not frozen (${f(w.Ts - 273.15, 0)} °C).` : `An ocean under ice needs some heat from below; here ${f(w.heat)}.`),
    },
    fix: () => [tip("ou une géante qui la chauffe par marée, comme Europe (planet_rings)", "or a giant tide-heating it, like Europa (planet_rings)")],
  },

  // ---- L7 : vivant ------------------------------------------------------------------------------------
  sunlight: {
    law: "L7", axis: "ecological", sev: "light", search: ["insolation"],
    test: (w) => w.light >= 0.01 || (w.blackSun && w.S >= 0.2) || has(w, ["glowvine", "wrong_glowvine", "lit_lamp"]),
    why: { fr: () => "Les plantes vertes vivent de lumière, et il n'en arrive presque pas jusqu'au sol.", en: () => "Green plants live on light, and almost none reaches the ground." },
    fix: () => [tip("des champignons et des spores, qui vivent de chaleur (spore, pale_fungus)", "fungi and spores, which live on heat (spore, pale_fungus)"), tip("une lumière à elles (glowvine)", "a light of their own (glowvine)")],
  },
  temperateLife: {
    law: "L7", axis: "ecological", sev: "light", search: ["insolation", "atmosphere"],
    test: (w) => w.Ts >= 255 && w.Ts <= 325,
    why: {
      fr: (w, f) => (w.Ts > 325 ? `À ${f(w.Ts - 273.15, 0)} °C, la vie telle qu'on l'écrit cuit : au-delà de 50 °C, rien de vert ne tient.` : `À ${f(w.Ts - 273.15, 0)} °C, la sève gèle : rien de vert ne pousse à découvert.`),
      en: (w, f) => (w.Ts > 325 ? `At ${f(w.Ts - 273.15, 0)} °C, life as written cooks: above 50 °C nothing green survives.` : `At ${f(w.Ts - 273.15, 0)} °C, sap freezes: nothing green grows in the open.`),
    },
    fix: (w) => (w.Ts > 325 ? [] : [tip("ou une vie plus rude : lichen, mousse, champignons", "or hardier life: lichen, moss, fungi")]),
  },
  hardyLife: {
    law: "L7", axis: "ecological", sev: "light", search: ["insolation", "atmosphere"],
    test: (w) => (w.Ts >= 200 && w.Ts <= 360) || w.heat >= 1.5,
    why: { fr: (w, f) => `Même les spores et les champignons ont leurs limites ; ici ${f(w.Ts - 273.15, 0)} °C, sans source chaude où s'abriter.`, en: (w, f) => `Even spores and fungi have limits; here ${f(w.Ts - 273.15, 0)} °C, with no warm vents to shelter by.` },
  },
  uvShield: {
    law: "L7", axis: "ecological", sev: "light", search: ["atmosphere", "insolation"],
    test: (w) => w.uv <= 2,
    why: {
      fr: (w, f) => `L'étoile baigne le sol d'ultraviolets (${f(w.uv)} × la Terre) : à découvert, la vie brûle, faute d'un air assez épais pour la protéger.`,
      en: (w, f) => `The star bathes the ground in ultraviolet (${f(w.uv)} × Earth): life burns in the open, with no air thick enough to shield it.`,
    },
    fix: () => [tip("ou un champ magnétique et un air épais (iron, atmosphere: 2)", "or a magnetic field and thick air (iron, atmosphere: 2)")],
  },
  breathableAir: {
    law: "L7", axis: "ecological", sev: "light", search: ["mass", "atmosphere"],
    test: (w) => w.P >= 0.05,
    why: { fr: (w, f) => `Presque pas d'air (${f(w.P)} bar) : rien de vivant ne tient à découvert.`, en: (w, f) => `Almost no air (${f(w.P)} bar): nothing living survives in the open.` },
    fix: () => [tip("ou la vie sous l'eau, à l'abri", "or life under water, sheltered")],
  },
  oldEnoughSimple: {
    law: "L7", axis: "ecological", sev: "light", search: ["age"],
    test: (w) => w.age >= 0.3 || has(w, BUILDERS),
    why: { fr: (w, f) => `La vie la plus simple met quelques centaines de millions d'années à paraître ; ce monde a ${f(w.age)} Ga.`, en: (w, f) => `The simplest life takes a few hundred million years to appear; this world is ${f(w.age)} Gyr old.` },
    fix: () => [tip("ou des bâtisseurs qui l'ont semée (tablet, door…)", "or builders who seeded it (tablet, door…)")],
  },
  oldEnoughComplex: {
    law: "L7", axis: "ecological", sev: "medium", search: ["age"],
    test: (w) => w.age >= 1 || has(w, BUILDERS),
    why: {
      fr: (w, f) => (w.starLife < 1
        ? `Une étoile de ${f(w.starMass)} M☉ s'éteint en ${f(w.starLife * 1000)} millions d'années ; il en faut environ mille pour des arbres et des bêtes.`
        : `Arbres et bêtes demandent environ un milliard d'années d'évolution ; ce monde a ${f(w.age)} Ga.`),
      en: (w, f) => (w.starLife < 1
        ? `A ${f(w.starMass)} M☉ star burns out in ${f(w.starLife * 1000)} million years; trees and beasts need about a thousand.`
        : `Trees and beasts need about a billion years of evolution; this world is ${f(w.age)} Gyr old.`),
    },
    fix: (w) => [...(w.starLife < 1 ? [tip("un soleil moins ardent (orange_sun, single_sun)", "a gentler sun (orange_sun, single_sun)")] : []),
      tip("ou des bâtisseurs qui les ont apportés (tablet, door, bridge…)", "or builders who brought them (tablet, door, bridge…)")],
  },
  tallTrees: {
    law: "L3", axis: "ecological", sev: "light", search: ["mass"],
    test: (w) => w.g <= 2,
    why: { fr: (w, f) => `Sous ${f(w.g)} g, les grands arbres restent trapus : la sève monte mal, le bois casse.`, en: (w, f) => `Under ${f(w.g)} g, great trees stay squat: sap climbs poorly, wood snaps.` },
  },
  buoyancy: {
    law: "L3", axis: "ecological", sev: "light", search: ["atmosphere", "mass"],
    test: (w) => w.P / w.g >= 0.5 || w.water === "liquid",
    why: { fr: (w, f) => `Pour flotter, il faut un air épais et une gravité faible ; ici ${f(w.P)} bar sous ${f(w.g)} g.`, en: (w, f) => `To float you need thick air and low gravity; here ${f(w.P)} bar under ${f(w.g)} g.` },
    fix: () => [tip("ou une mer où dériver (water)", "or a sea to drift in (water)")],
  },
  foodPlants: {
    law: "L8", axis: "ecological", sev: "light",
    test: (w) => has(w, FLORA),
    why: { fr: () => "Qui mangent-ils ? Il n'y a rien de vert ici.", en: () => "What do they eat? Nothing green grows here." },
    fix: () => [tip("une flore (moss, fern, seed…)", "some flora (moss, fern, seed…)")],
  },
  prey: {
    law: "L8", axis: "ecological", sev: "light",
    test: (w) => has(w, PREY),
    why: { fr: () => "Un chasseur sans proie : la chaîne alimentaire s'arrête net.", en: () => "A hunter with no prey: the food chain stops dead." },
    fix: () => [tip("des proies (grazer, burrower, drifter)", "some prey (grazer, burrower, drifter)")],
  },
  soil: {
    law: "L8", axis: "ecological", sev: "light",
    test: (w) => has(w, SOIL),
    why: { fr: () => "Un fouisseur sans sol meuble où creuser.", en: () => "A burrower with no loose ground to dig in." },
    fix: () => [tip("du sable, du limon ou de la pierre (sand, silt, stone)", "sand, silt or stone (sand, silt, stone)")],
  },
};

/** Exigences qui valent pour tout monde, quels que soient les blocs (`applies` : quand les vérifier). */
const GLOBAL = {
  starAlive: {
    law: "L1", axis: "cosmological", sev: "medium", search: ["age"], applies: (w) => w.stars > 0,
    test: (w) => w.age <= w.starLife,
    why: {
      fr: (w, f) => `Une étoile de ${f(w.starMass)} M☉ ne vit que ${f(w.starLife)} Ga : ce monde ne peut pas en avoir ${f(w.age)}.`,
      en: (w, f) => `A ${f(w.starMass)} M☉ star lives only ${f(w.starLife)} Gyr: this world cannot be ${f(w.age)} Gyr old.`,
    },
    fix: () => [tip("ou un soleil plus calme (orange_sun, red_sun)", "or a calmer sun (orange_sun, red_sun)")],
  },
};

/** Exigences écrites en toutes lettres par l'auteur (`core: liquid`, `atmosphere: thin`…). */
const ASSERTIONS = {
  core_liquid: { law: "L4", axis: "geological", sev: "medium", search: ["age", "mass"], test: (w) => w.heat >= HEAT.liquidCore,
    why: { fr: (w, f) => `Tu as écrit un noyau liquide, mais il s'est figé (chaleur interne ${f(w.heat)}).`, en: (w, f) => `You wrote a liquid core, but it has frozen (internal heat ${f(w.heat)}).` } },
  core_solid: { law: "L4", axis: "geological", sev: "light", search: ["age", "mass"], test: (w) => w.heat < HEAT.liquidCore,
    why: { fr: () => "Tu as écrit un noyau figé, mais l'intérieur est encore chaud.", en: () => "You wrote a frozen core, but the interior is still hot." } },
  atmosphere_none: { law: "L5", axis: "weather", sev: "light", search: ["mass"], test: (w) => w.P < 0.01,
    why: { fr: (w, f) => `Tu as écrit « sans air », mais la planète en retient ${f(w.P)} bar.`, en: (w, f) => `You wrote "no air", but the planet holds ${f(w.P)} bar.` } },
  atmosphere_thin: { law: "L5", axis: "weather", sev: "light", search: ["mass"], test: (w) => w.P >= 0.005 && w.P < 0.5,
    why: { fr: (w, f) => `Une atmosphère mince ? Ici ${f(w.P)} bar.`, en: (w, f) => `A thin atmosphere? Here ${f(w.P)} bar.` } },
  atmosphere_dense: { law: "L5", axis: "weather", sev: "light", search: ["mass"], test: (w) => w.P >= 3,
    why: { fr: (w, f) => `Une atmosphère dense ? Ici ${f(w.P)} bar.`, en: (w, f) => `A dense atmosphere? Here ${f(w.P)} bar.` },
    fix: () => [tip("plus de volatils (volatiles: 3)", "more volatiles (volatiles: 3)")] },
};

/** Comment dire une ligne proposée par la recherche (clé → libellé, sens). */
const HINTS = {
  insolation: { up: tip("plus près de l'étoile", "closer to the star"), down: tip("plus loin de l'étoile", "further from the star") },
  orbit: { up: tip("plus loin de l'étoile", "further from the star"), down: tip("plus près de l'étoile", "closer to the star") },
  age: { up: tip("un monde plus vieux", "an older world"), down: tip("un monde plus jeune", "a younger world") },
  mass: { up: tip("une planète plus massive", "a more massive planet"), down: tip("une planète plus légère", "a lighter planet") },
  atmosphere: { up: tip("un air plus épais", "thicker air"), down: tip("un air plus mince", "thinner air") },
  water: { up: tip("plus d'eau", "more water"), down: tip("moins d'eau", "less water") },
  rotation: { up: tip("une rotation plus lente", "a slower spin"), down: tip("une rotation plus rapide", "a faster spin") },
};

module.exports = { REQUIREMENTS, ASSERTIONS, GLOBAL, HINTS };
