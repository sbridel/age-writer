"use strict";
const EXTRA_SKY = require("../sky");
const WEATHER = require("../weather");
const { blockById } = require("./registry");
const { SEVERITY_ORDER } = require("./rules");
const { hooks } = require("./hooks");

const tracery = require("./vendor/tracery");

const SKY_PROSE_GRAMMAR = {
  ...EXTRA_SKY.SKY_PROSE,
  lone_star: [
    "a single star holds the sky, unrivaled",
    "one sun traces its familiar course",
    "a single light, and no rival to it",
  ],
  twin_star: [
    "two stars answer each other overhead",
    "a double sun casts twinned shadows",
    "two suns vie for the sky, never quite merging",
  ],
  no_star: [
    "no light pierces the veil above",
    "the sky stays empty, unreadable",
    "nothing up there gives warmth",
  ],
  companion_moon: [
    "a pale companion follows the sun",
    "a quiet moon keeps its distance",
    "a second, colder body rides alongside",
  ],
  steady_cycle: [
    "day yields to night without surprise",
    "the days come and go as they always have",
    "an old rhythm, never once broken",
  ],
  erratic_cycle: [
    "day and night jostle with no logic",
    "the days hesitate, as if unsure of their turn",
    "night comes when it likes, and day as well",
  ],
  frozen_cycle: [
    "the sky never changes, caught in its moment",
    "the light never moves, and no shadow turns",
    "time seems to have stopped, somewhere overhead",
  ],
  stable_orbit: [
    "the stars keep an old, steady round",
    "the year turns the same way, every year",
    "the seasons keep their order",
  ],
  shifting_orbit: [
    "the sky drifts a little from one year to the next",
    "no two years begin under the same sky",
    "the stars' round shifts with time",
  ],
  chaotic_orbit: [
    "the stars move by no rule at all",
    "no almanac would last a year here",
    "a celestial disorder, almost hypnotic",
  ],
  close_binary_orbit: [
    "the planet holds close to one star, the other kept at a wary distance",
    "one sun claims it outright, its rival watching from far off",
    "a single, near light governs here, the second star merely a witness",
  ],
  wide_binary_orbit: [
    "the planet rides far out, circling both stars as a single, distant pair",
    "seen from here, the two suns nearly merge into one wide light",
    "it keeps its distance from the twin dance below, and so endures",
  ],
  auroras: [
    "coloured veils ripple, high in the sky",
    "an aurora hangs at the edge of night, faint and green",
    "shifting lights tint the horizon",
  ],
  recurring_eclipses: [
    "now and then a shadow crosses the sun, and noon goes dark",
    "the stars cross paths at regular intervals",
    "a darkening marks the passage of time",
  ],
  permanent_veil: [
    "a lid of cloud never lifts",
    "one senses more than sees, here",
    "the sky stays overcast, its details only ever reported",
  ],
  starfall: [
    "trails of light fall, without warning",
    "a rain of shooting stars crosses the night",
    "brief flares streak the sky, now and then",
  ],
  ink_blot: [
    "an unreadable fragment, like an ink blot on the page",
    "something was written here without finding meaning",
    "a malformed word, taking root nowhere",
  ],
  strong_contradiction: [
    "the world contradicts itself, openly",
    "something here cannot coexist, and yet does",
    "the world argues with itself, and neither side gives way",
  ],
  medium_contradiction: [
    "a quiet strain runs through the place, like a held breath",
    "two truths rub against each other here, never quite agreeing",
    "something is off, though it's hard to say what",
  ],
  light_contradiction: [
    "a minor oddity, almost charming",
    "a slight mismatch, lending the place its character",
    "something small is out of place, and the eye keeps returning to it",
  ],
  link: [
    "Beyond that, ",
    "One also senses that ",
    "Furthermore, ",
    "It's worth adding that ",
    "Not far off, ",
  ],
  default_stars: [
    "nothing was written of the sky, so a sun rose anyway",
    "the sky filled its own silence with a sun",
  ],
  default_cycle: [
    "no rhythm was written, and the days found one of their own",
    "time chose its own cadence, unwritten",
  ],
  drawn_lead: [
    "left open by the book: ",
    "the book was silent here, and the dark chose: ",
    "unwritten, it was drawn from the dark: ",
  ],
  drawn_matter_note: [
    "the book said nothing of what lies beneath it, and the place had answers of its own.",
    "what the pages left unwritten, the place supplied.",
    "the rest was not written; it was simply what this place held.",
  ],
};

const MATTER_PROSE_GRAMMAR = {
  meets: ["meets", "touches", "runs into", "settles against"],
  verb_violent: ["shatters into", "cracks and hardens into", "erupts, then freezes into"],
  verb_crystallizing: ["slowly settles into", "locks into", "gathers itself into"],
  verb_corrosive: ["wears away into", "gnaws toward", "slowly turns to"],
  verb_soothing: ["dissolves into", "yields to", "softens into"],
  verb_transmuting: ["turns into", "quietly becomes", "is changed into"],
  nearby: ["{d} {n} lingers nearby", "{d} {n} waits at the edge of it", "{d} {n} rests close by"],
  verb_growing: ["takes root as", "creeps into being as", "slowly becomes"],
  verb_feeding: ["gathers into", "settles into", "falls into step as"],
  verb_decaying: ["rots into", "crumbles into", "fades into"],
  verb_awakening: ["stirs, and becomes", "wakes as", "opens into"],
};

function capitalize(text) {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

const PROSE_GRAMMAR = { ...SKY_PROSE_GRAMMAR, ...MATTER_PROSE_GRAMMAR };

function spaced(text) {
  return text.replace(/_/g, " ");
}

/** Deux descripteurs tirés au hasard (ancienne forme, gardée pour les extensions). */
function descriptorsFor(blockId) {
  let pool = [...(blockById.get(blockId)?.descriptors ?? [])],
    picked = [];
  for (; picked.length < 2 && pool.length;)
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return picked.join(", ");
}

// ---- hasard reproductible ------------------------------------------------------------------------------
// Une description doit se relire à l'identique : même Âge, même texte. Le hasard (le nôtre et celui de Tracery)
// est donc tiré d'une graine : le nom de la note, la ligne `seed:` et le contenu.
function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(resolved, seed) {
  const ids = (resolved.lines || []).map((l) => (l.unknown ? "?" : l.entry && l.entry.id) + (l.autoFilled ? "*" : ""));
  const matter = resolved.matter ? [...(resolved.matter.written || []), "|", ...(resolved.matter.reactions || []).map((r) => r.shown)] : [];
  return hashText(`${seed ?? ""}|${resolved.seed ?? ""}|${ids.join(",")}|${matter.join(",")}`);
}
/** Tracery tire ses règles avec son propre générateur : on lui prête le nôtre le temps d'une description. */
function withRandom(random, fn) {
  tracery.setRng(random);
  try {
    return fn();
  } finally {
    tracery.setRng(() => Math.random());
  }
}

/** Petit sac de tirages sans remise : un connecteur, une tournure ne reviennent pas dans la même description. */
function makeTeller(random) {
  const used = new Set();
  const pick = (list) => list[Math.floor(random() * list.length)];
  const fresh = (list) => {
    const free = list.filter((x) => !used.has(x));
    if (!free.length) return null;
    const x = pick(free);
    used.add(x);
    return x;
  };
  return { random, pick, fresh, used };
}

// ---- le ciel ---------------------------------------------------------------------------------------------
/** Ordre de lecture : le monde, puis ses soleils, le corps, l'orbite, le temps, puis ce qui traverse le ciel. */
const SKY_ORDER = { world: 0, stars: 1, hue: 1, body: 2, terrain: 2, orbit: 3, cycle: 4, belt: 5, phenomenon: 6 };
/** Connecteurs par famille : tous adverbiaux, ils vont devant une proposition comme devant un groupe nominal. */
/* étape 2 (décision C) : plus de « Higher still », « Down below », « Meanwhile » tirés au hasard : un connecteur du ciel ne prétend pas monter ni descendre */
const SKY_LINKS = {
  world: ["All around, ", "Everywhere you look, "],
  stars: ["Overhead, ", "High above, ", "In the sky, ", "Above it all, "],
  body: ["Here, ", "In this place, ", "For this world, "],
  orbit: ["Far overhead, ", "Out in the dark, ", "Above, "],
  cycle: ["Here, ", "Through it all, "],
  belt: ["Across the sky, ", "Out in the dark, "],
  phenomenon: ["Above, ", "At the edge of sight, ", "Across the sky, "],
  unknown: ["Somewhere in the text, ", "Between the lines, "],
};
SKY_LINKS.hue = SKY_LINKS.stars;

/** Un connecteur qui répète un mot de la phrase (« Above, … high above ») sonne faux : on l'écarte. */
const LINK_STOP = new Set(["the", "it", "all", "in", "at", "you", "for", "this", "of", "to"]);
function echoes(link, text) {
  const words = new Set(text.toLowerCase().match(/[a-z]+/g) || []);
  return (link.toLowerCase().match(/[a-z]+/g) || []).some((w) => !LINK_STOP.has(w) && words.has(w));
}

/** Sans étoile, l'orbite se dit du monde lui-même (l'auteur : « starless, mais they move ? »). */
const DARK_ORBIT = {
  stable_orbit: ["the world keeps an old, steady round through the dark", "its path through the dark never varies"],
  shifting_orbit: ["the world's path through the dark drifts, slow and noticeable", "its round through the dark shifts with time"],
  chaotic_orbit: ["the world wanders through the dark by no rule at all", "its path through the dark defies any prediction"],
};
const LONE_ORBIT = {
  stable_orbit: ["the world keeps an old, steady round about its sun", "its round about the sun never varies"],
  shifting_orbit: ["the world's path about its sun drifts, slow and noticeable", "its round about the sun shifts with time"],
  chaotic_orbit: ["the world swings about its sun by no rule at all", "its path about the sun defies any prediction"],
};
/* 2.9 : le soleil vert d'une naine blanche nourrie de ses mondes : sa phrase remplace celle du soleil vert de l'Art */
const WD_PROSE = {
  salt: ["a small green star, fed on its own worlds, keeps a cold and patient light", "the sun is green because of what it has eaten: a white dwarf wearing the salt of its planets", "a green star holds the sky, the colour of a world digested long ago"],
  brine: ["a blue star, blue with the salt of its worlds, and cold for all that", "the sun looks hot and is not: a white dwarf so salted by its planets that only the blue gets out", "a cold blue sun, wearing the sea of a world it swallowed"],
  carbon: ["the sun is the colour of burnt worlds, a white dwarf red with their carbon", "a red star, small and close, dyed by the ash of its own planets", "the sun burns a dull red, the soot of worlds in its light"],
  young: ["the sun is blue with the heat of its own death, hard and new", "a young dead star, still blue from dying; its light is sharp and full of fire", "a blue point of a sun, fierce, the ember of a star that has only just gone out"],
  old: ["an old white dwarf, cooled to ochre, nearly out", "the sun is a dying ember, orange and small, older than most of the sky", "a dull orange star keeps this world, and has for longer than anything here"],
};
const WD_HUES = { green_sun: ["salt"], blue_sun: ["young", "brine"], red_sun: ["carbon"], orange_sun: ["old"] };
/* la phrase de la naine blanche elle-même, quand sa couleur n'est pas le blanc : elle ne dit plus « white » */
const WD_REBORN_PROSE = ["the dead star keeps a new world, gathered from the rubble of older ones it remembers", "the sun is a burnt-out star, and the ground under it is young: the wreck of the worlds it has eaten, put back together", "a white dwarf lights a world it broke and that formed again from the pieces, raw and young"];
const WD_REMNANT_PROSE = ["it is a white dwarf, the heart of a star that has already lived, and the world huddles near it", "the sun is a dead star's core, planet-sized and patient, that has outlasted its own fire", "this world keeps close to a burnt-out star, old beyond counting"];
function skySentences(resolved, grammar, teller, place) {
  const lines = resolved.lines.map((line, index) => ({ line, index }));
  const familyOf = (line) => (line.unknown ? "unknown" : line.entry.category in SKY_ORDER ? line.entry.category : "phenomenon");
  const rank = (line) => (line.unknown ? 9 : SKY_ORDER[line.entry.category] ?? 7);
  lines.sort((a, b) => rank(a.line) - rank(b.line) || a.index - b.index);
  // une couleur de soleil écrite dit déjà « un soleil » : l'étoile unique ajoutée d'office ne se répète pas
  const hasHue = lines.some(({ line }) => !line.unknown && line.entry.category === "hue");
  const has = (id) => lines.some(({ line }) => !line.unknown && line.entry.id === id);
  const dark = has("starless"), lone = !dark && !has("twin_suns") && !has("companion_moon"); // sans étoile, c'est le monde qui erre ; un seul soleil : le monde tourne autour de lui, pas « les étoiles »
  const items = [];
  let leadDone = false;
  for (const { line } of lines) {
    if (line.unknown) {
      items.push({ family: "unknown", text: teller.fresh(SKY_PROSE_GRAMMAR.ink_blot) || grammar.flatten("#ink_blot#") });
      continue;
    }
    const entry = line.entry;
    if (line.autoFilled && hasHue && entry.category === "stars" && entry.id === "single_sun") continue;
    if (line.autoFilled && line.slot !== void 0) {
      const text = grammar.flatten(entry.proseTag);
      items.push({ family: familyOf(line), text, lead: leadDone ? null : grammar.flatten("#drawn_lead#") });
      leadDone = true;
    } else if (line.autoFilled) {
      if (hasHue && entry.category === "stars") continue;
      items.push({ family: familyOf(line), text: grammar.flatten(`#${entry.category === "stars" ? "default_stars" : "default_cycle"}#`) });
    } else items.push({ family: familyOf(line), text: place && place.wdKind && WD_HUES[entry.id] && WD_HUES[entry.id].includes(place.wdKind) ? teller.pick(WD_PROSE[place.wdKind]) : entry.id === "white_dwarf" && place && place.reborn ? teller.pick(WD_REBORN_PROSE) : entry.id === "white_dwarf" && place && place.wdKind && place.wdKind !== "white" ? teller.pick(WD_REMNANT_PROSE) : dark && DARK_ORBIT[entry.id] ? teller.pick(DARK_ORBIT[entry.id]) : lone && LONE_ORBIT[entry.id] ? teller.pick(LONE_ORBIT[entry.id]) : grammar.flatten(entry.proseTag) });
  }
  const out = [];
  let glued = false, links = 0;
  items.forEach((item, i) => {
    if (i === 0) {
      out.push(capitalize((item.lead || "") + item.text));
      return;
    }
    if (item.lead) {
      out.push(capitalize(item.lead + item.text));
      glued = true; // rien ne s'accroche à la phrase du tirage : ce qui suit a été écrit
      return;
    }
    const prev = out[out.length - 1];
    // deux images courtes se lisent d'un souffle : « …; … »
    if (!glued && prev.length < 80 && item.text.length < 70 && teller.random() < 0.3) {
      out[out.length - 1] = prev + "; " + item.text;
      glued = true;
      return;
    }
    glued = false;
    const link = links < 1 && teller.random() < 0.4 ? teller.fresh((SKY_LINKS[item.family] || SKY_LINKS.phenomenon).filter((l) => !echoes(l, item.text))) : null;
    if (link) links++;
    out.push(link ? link + item.text : capitalize(item.text));
  });
  return out.map((s) => s + ".");
}

// ---- la matière ------------------------------------------------------------------------------------------
const MEETS = ["meets", "touches", "runs into", "settles against"];
const MEETING = { meets: "meeting", touches: "touching", "runs into": "running into", "settles against": "settling against" };
const AGAINST = ["Touched by", "Against", "In contact with"];
/** Tournures d'une réaction : A, B, le verbe (3e personne), le résultat. Celles qui disent « it » refusent un verbe qui le dit déjà. */
/** `pl` : le verbe accordé au sujet (pluriel : « lantern moths meet… and gather »), `it` : le pronom du sujet. */
const REACTION_FORMS = [
  { id: "and", make: (A, B, v, C, t, pl = (x) => x) => `${A} ${pl(t.pick(MEETS))} ${B} and ${pl(v)} ${C}` },
  { id: "where", noIt: true, make: (A, B, v, C, t, pl = (x) => x, it = "it") => `where ${A} ${pl(t.pick(MEETS))} ${B}, ${it} ${pl(v)} ${C}` },
  { id: "meeting", make: (A, B, v, C, t, pl = (x) => x) => `${A}, ${MEETING[t.pick(MEETS)]} ${B}, ${pl(v)} ${C}` },
  { id: "against", make: (A, B, v, C, t, pl = (x) => x) => `${t.pick(AGAINST)} ${B}, ${A} ${pl(v)} ${C}` },
];
/** Un nom déjà au pluriel (« lantern_moths », « flowers », « mute_ruins ») prend un verbe au pluriel. */
const pluralId = (id) => /s$/.test(id) && !/(ss|us)$/.test(id);
const IRREGULAR = { is: "are", has: "have", does: "do", goes: "go" };
/** Le verbe d'une réaction à la 3e personne du pluriel : chaque verbe conjugué de la tournure (« erupts, then freezes into » → « erupt, then freeze into »). */
function pluralVerb(phrase) {
  const one = (w) => IRREGULAR[w] || (/(ss|sh|ch|x|zz)es$/.test(w) ? w.slice(0, -2) : /[^aeiou]ies$/.test(w) ? w.slice(0, -3) + "y" : /[^s]s$/.test(w) ? w.slice(0, -1) : w);
  return phrase.replace(/(^|, then |, and | and |, )([a-z]+ly )?([a-z]+)/g, (m, lead, adv = "", w) => (lead === ", " && !/s$/.test(w) ? m : lead + adv + one(w))).replace(/\bitself\b/g, "themselves"); // « quietly becomes » → « quietly become »
}
/** Les grands blocs du lointain ont une phrase à eux quand le ciel ne les a pas déjà dits (la cible : « Lava runs through the lowland »). */
const SETTING = {
  lava: { said: /\b(lava|molten|fire)\b/, prose: ["lava runs through the lowland, glowing under its crust", "a slow flow of lava crawls across the low ground"] },
  water: { said: /\b(water|river|lake|sea|ocean|shore|lagoon|beach|delta|marsh|surface|waves?|tide|floats?)\b/, prose: ["water gathers in the low ground and holds the light", "there is water here, and the land bends toward it"] },
};
const ALONE = [
  (x) => `${x} lingers nearby`,
  (x) => `${x} waits at the edge of it all`,
  (x) => `${x} rests close by`,
  (x) => `not far away, ${x}`,
  (x) => `a little apart lies ${x}`,
];
const GROUPED = [
  (l) => `${l} wait at the edges`,
  (l) => `around it all: ${l}`,
  (l) => `further off lie ${l}`,
  (l) => `${l} keep their distance`,
  (l) => `here and there, ${l}`,
];

// ---- les accords (étape 3, décision D) -------------------------------------------------------------------
/** Ce qui se compte prend « a/an » ; une matière, un temps, une foule n'en prennent pas (« lava », « grey rain », « lantern moths »). */
const COUNT_WEATHER = new Set(["storm", "thunderstorm", "dust_storm", "ash_cloud", "spore_cloud", "rainbow", "tornado", "whispering_storm", "early_echo"]);
const MASS_LIFE = new Set(["spore", "moss", "lichen", "pale_fungus", "cinderbloom", "singing_lichen", "grass", "meadow", "wildfire", "kelp", "coral", "plankton", "microbial_mat", "mycelium", "glow_algae", "aeroplankton", "soil_bacteria", "blight", "tarnished_growth", "many_one", "blooming_ice", "drinking_roots", "mosaic", "heath_shrub"]);
const COUNT_GEO = new Set(["fissure", "cave_fissure", "submarine_fissure", "humming_shard", "geysers", "rifts", "fulgurite"]);
function countable(id) {
  const axis = String(blockById.get(id)?.axis || "");
  if (/s$/.test(id) && !/(ss|us)$/.test(id)) return false; // « flowers », « lantern_moths », « basalt_columns », « mute_ruins » : déjà un pluriel
  if (axis === "weather") return COUNT_WEATHER.has(id);
  if (axis === "geological") return COUNT_GEO.has(id);
  if (axis === "ecological") return !MASS_LIFE.has(id);
  return axis === "metaphysical" || axis === "cosmological" || !axis ? !/^(crystal|ash|stone|water)/.test(id) : false;
}
const articled = (id, phrase) => (countable(id) ? (/^[aeiou]/i.test(phrase) ? "an " : "a ") + phrase : phrase);

/** Groupes nominaux : un adjectif au plus, à la première mention, avec l'article ; « the … » ensuite ; un adjectif ne sert qu'une fois. */
/** « a drawn moth » se lit « une phalène tirée » (le tirage) et non « attirée » : ce descripteur reste aux glyphes, pas à la description. */
const AMBIGUOUS_ADJ = new Set(["drawn"]);
function makeNamer(teller, articles = false) {
  const seen = new Set(),
    adjectives = new Set();
  const name = (id, most = 2) => {
    const noun = spaced(id);
    if (seen.has(id)) return "the " + noun;
    seen.add(id);
    const pool = (blockById.get(id)?.descriptors ?? []).filter((d) => !adjectives.has(d) && !(articles && AMBIGUOUS_ADJ.has(d)));
    const count = Math.min(pool.length, articles ? (teller.random() < 0.75 ? 1 : 0) : most === 1 || teller.random() < 0.4 ? 1 : 2); // étape 3 : un adjectif (parfois aucun), plus jamais deux
    const picked = [];
    while (picked.length < count) picked.push(pool.splice(Math.floor(teller.random() * pool.length), 1)[0]);
    picked.forEach((d) => adjectives.add(d));
    const phrase = picked.length ? `${picked.join(", ")} ${noun}` : noun;
    return articles ? articled(id, phrase) : phrase;
  };
  name.seen = seen;
  return name;
}

function listOf(parts) {
  return parts.length < 2 ? parts.join("") : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

// ---- le parcours (claude/DESIGN-grammaire-de-la-description.md, décision A) --------------------------------
/** La description regarde le lieu comme la fenêtre : où l'on est, le ciel, le lointain, le proche, ce que des mains ont fait, le doute. */
const STATIONS = ["place", "sky", "far", "near", "hands", "doubt"];
const SKY_IDS = new Set(["thick_air", "thin_air", "ashen_sky", "poisoned_air", "raptor", "aeroplankton"]);
const LOW_WEATHER = new Set(["fog", "marsh_mist", "watching_mist", "living_mist", "scented_mist", "steam", "meltwater", "rime", "glaze", "held_water"]);
const FAR_GEO = new Set(["tides", "fissure", "cave_fissure", "submarine_fissure", "no_fissure", "water", "lava", "geysers", "rifts", "basalt_columns", "karst", "subsurface_ocean", "ceiling_sea", "molten_core", "dead_core", "deep_cold", "pressure", "brine", "scorched_surface", "hollowed_ground", "ringed_ground", "breathing_mirrors", "acid", "bitter_water", "obsidian"]);
const FAR_LIFE = new Set(["kelp", "coral", "shoal", "plankton", "deep_hunter", "glow_algae"]);
/** La station d'un bloc : d'après son axe, avec quelques exceptions (l'air est au ciel ; la brume, la mer et ses bêtes, la fissure qui ramène au loin). */
function stationOf(id) {
  if (SKY_IDS.has(id)) return "sky";
  const axis = String(blockById.get(id)?.axis || "");
  if (axis === "weather") return LOW_WEATHER.has(id) ? "far" : "sky";
  if (axis === "cosmological") return "sky";
  if (axis === "metaphysical") return "hands";
  if (axis === "geological") return FAR_GEO.has(id) ? "far" : "near";
  if (axis === "ecological") return FAR_LIFE.has(id) ? "far" : "near";
  return "near";
}
/** Où l'on arrive : le point de liaison de la fenêtre (src/genscene.js, viewOf), dit par la description, dans la matière du lieu (le sol que la fenêtre peint). */
const PLACE_PROSE = {
  plain: ["you stand on {open}, the place laid out level before you", "the link sets you down on {open}, with nothing to stop the eye"],
  low: ["you arrive in {hollow}, the land rising all around", "the link leaves you low, in {hollow}, the world above its rim"],
  high: ["you arrive on {height}, the land spread out below", "the link sets you on {height}, with the whole place at your feet"],
  slope: ["you arrive {slope}, the ground falling away to one side", "you come through {slope}, where the land leans and you lean with it"],
  cover: ["you arrive {cover}, looking out from the shade", "the link sets you {cover}, half hidden, the place bright beyond"],
  pier: ["you arrive at the end of a pier, the water moving under the boards", "the link sets you on the planks of a landing, the shore a short walk ahead"],
  cave: ["you arrive at the mouth of {cave}, the light ahead", "the link leaves you just inside {cave}, the dark at your back"],
};
const GROUND_WORDS = {
  open: { sand: "open sand", ice: "a flat of ice", lava: "a crust of cooled lava", grass: "open grass", rock: "bare, level rock" },
  hollow: { sand: "a hollow between dunes", ice: "a hollow of ice", lava: "a hollow of black rock", grass: "a grassy hollow", rock: "a hollow of the rock" },
  height: { sand: "the crest of a high dune", ice: "a ridge of ice", lava: "a height of black rock", grass: "a grassy height", rock: "a ledge of rock" },
  slope: { sand: "halfway up a dune", ice: "on a slope of ice", lava: "on a slope of cooled lava", grass: "on a grassy hillside", rock: "on a rocky slope" },
  cave: { sand: "a cave", ice: "an ice cave", lava: "a lava tube", grass: "a cave", rock: "a cave" },
};
/** `place` : une sorte (« slope ») ou { kind, ground, frame } (src/entry.js, hooks.place). */
function placeSentence(place, teller) {
  const P = typeof place === "string" ? { kind: place } : place || {}, list = PLACE_PROSE[P.kind];
  if (!list) return null;
  const ground = GROUND_WORDS.open[P.ground] ? P.ground : "rock", cover = P.frame === "trees" ? "under the trees" : "under an old arch";
  return capitalize(teller.pick(list).replace(/\{(\w+)\}/g, (_, k) => (k === "cover" ? cover : GROUND_WORDS[k][ground]))) + ".";
}

/** 2.8 : le moulin, selon le monde (src/genscene.js, millOf) : à eau, à vent, arrêté. */
const MILL_PROSE = {
  water: ["a mill stands on the river, and its wheel turns with the water", "a water mill leans over the current, its wheel patient and loud"],
  wind: ["a windmill turns on the high ground when the wind remembers to come", "a windmill keeps its sails to the wind, and creaks as they go round"],
  frozen: ["a mill stands on the frozen river, its wheel held fast in the ice", "the mill's wheel has stopped, ice hanging from its paddles"],
  broken: ["a mill stands still, one sail fallen at its foot, built for a wind that has gone", "a windmill with broken sails waits for a wind that no longer comes"],
};
/** 2.8 : les marées : avec une lune, sans lune (étale), avec le sel (les marais). */
const TIDE_PROSE = {
  moon: ["the sea comes and goes twice a day, and leaves the sand shining", "at low water the rocks stand bare, and the pools hold the sky"],
  salt: ["the sea comes and goes, and leaves the sand white with salt", "at low water the salt stays behind, in shallow pans that hold the sky"],
  still: ["the sea lies flat; nothing in the sky pulls at it", "the tides are written, but no moon rises to draw them"],
};
/** 2.8 : la mousson, selon la saison du jour : les pluies, le sec, l'entre-deux ; sans saisons (ou sur un monde froid), rien ne vient. */
const MONSOON_PROSE = {
  rains: ["the rains have come with the warm season, and the river forgets its banks", "it is the season of rain: the sky hangs low, and every hollow is full"],
  dry: ["these are the dry months; the river shrinks to a thread between its stones", "the rains are far off now, and the land waits, pale and thirsty"],
  between: ["the rains keep to their season here, and the rivers keep time with them", "the land is between rains, and remembers both"],
  rains_land: ["the rains have come with the warm season, and every hollow is full", "it is the season of rain: the sky hangs low, and the ground drinks"],
  dry_land: ["these are the dry months; the water has shrunk back into the lowest ground", "the rains are far off now, and the land waits, pale and thirsty"],
  between_land: ["the rains keep to their season here, and the land keeps time with them", "the land is between rains, and remembers both"],
  still: ["the rains are written, but the year has no season to bring them", "a season of rain is promised, and the sky never keeps it"],
};
/** 2.8 : l'oasis, selon le monde (src/genscene.js, oasisOf) : claire, saumâtre (le sel), bue par la chaleur. */
const OASIS_PROSE = {
  clear: ["water lies in a hollow of the sand, and palms stand around it like a secret kept", "everything alive for a day's walk knows where the oasis is"],
  salt: ["an oasis lies in the sand, its water brackish and its bank white with salt", "palms stand around a pool too salt to drink, and the bank shines white"],
  heat: ["an oasis shrinks under the heat, its old bank left in cracked mud", "the oasis has drawn back from its shore, and the palms stand a little further from the water"],
};
/** 2.9 : le gel de l'eau douce (src/genscene.js, freezeOf), au lointain : la rivière ou l'étang pris, ou la débâcle. */
const FREEZE_PROSE = {
  ice_river: ["a river lies held under its ice, grey and still", "a river has stopped in its bed, and lies there like a road of ice"], /* la phrase du ciel qui la fait couler se tait (describeAge) : la rivière est nommée ici */
  ice_pond: ["the pond is a plate of ice under the snow", "the water has closed over itself, white and hard"],
  thaw_river: ["the ice is breaking up, and its plates come down the dark river", "the river has woken, and carries its broken ice away"],
  thaw_pond: ["the ice is breaking up, and its plates drift on the dark water", "the last of the ice floats in pieces on the pond"],
};
/** 2.9 : la bête de la mer, dite seulement une fois qu'on l'a vue dans la fenêtre (src/entry.js, ext.seaSeen). */
const SEA_BEAST_PROSE = {
  spout: ["something large breathes out at sea, once, and is gone", "far out, a plume of breath rises from the water and drifts away"],
  serpent: ["far out, a long back rolls through the water, and rolls again", "something long moves offshore, in slow coils, and sinks"],
  ray: ["now and then, broad wingtips break the sea and slip back under", "out on the water, two dark tips rise like hands and fold away"],
  fin: ["a fin cuts the water offshore, unhurried", "a dark fin passes along the sea, and does not come closer"],
};
function matterSentences(resolved, grammar, teller = makeTeller(Math.random), at = null) {
  const sentences = [],
    used = new Set(),
    name = makeNamer(teller, !!at);
  let last = null, prev = null;
  if (at) for (const [id, S] of Object.entries(SETTING)) // la lave, l'eau : posées d'abord au lointain, puis « the lava » dans les réactions
    if ((resolved.matter.written || []).includes(id) && !S.said.test(at.skyText || "")) {
      sentences.push(capitalize(teller.pick(S.prose)) + ".");
      at.push("far");
      name.seen.add(id);
      used.add(id);
    }
  if (at && at.seaBeast && SEA_BEAST_PROSE[at.seaBeast]) { sentences.push(capitalize(teller.pick(SEA_BEAST_PROSE[at.seaBeast])) + "."); at.push("far"); } /* 2.9 */
  if (at && at.freeze && FREEZE_PROSE[at.freeze]) { sentences.push(capitalize(teller.pick(FREEZE_PROSE[at.freeze])) + "."); at.push("far"); } /* 2.9 */
  const stOf = (r) => STATIONS.indexOf(blockById.has(r.shown) ? stationOf(r.shown) : stationOf(r.a));
  const reactions = at ? resolved.matter.reactions.map((r, i) => [r, i]).sort((x, y) => stOf(x[0]) - stOf(y[0]) || x[1] - y[1]).map((x) => x[0]) : resolved.matter.reactions; // dans l'ordre du parcours : la première mention garde ses adjectifs, les suivantes disent « the … »
  for (const reaction of reactions) {
    used.add(reaction.a);
    used.add(reaction.b);
    const verb = reaction.verbs ? teller.pick(reaction.verbs) : grammar.flatten(`#verb_${reaction.type}#`);
    const fits = REACTION_FORMS.filter((f) => f.id !== last && !(f.noIt && /\bit\b/.test(verb)) && !(f.id === "and" && /\band\b/.test(verb))); // pas « …meets the spore and fills with life and becomes… »
    const fresh = fits.filter((f) => !teller.used.has("form:" + f.id));
    const form = teller.pick(fresh.length ? fresh : fits);
    teller.used.add("form:" + form.id);
    last = form.id;
    const A = name(reaction.a),
      B = name(reaction.b);
    const C = at ? (name.seen.has(reaction.shown) ? "the " + spaced(reaction.shown) : articled(reaction.shown, spaced(reaction.shown))) : spaced(reaction.shown),
      many = at && pluralId(reaction.a),
      said = form.make(A, B, verb, C, teller, many ? pluralVerb : undefined, many ? "they" : "it"), st = blockById.has(reaction.shown) ? stationOf(reaction.shown) : stationOf(reaction.a);
    // étape 2 : une chaîne (le produit de l'une entre dans la suivante) est une même histoire, dite d'une phrase
    const chained = at && prev && (reaction.a === prev.shown || reaction.b === prev.shown) && sentences[sentences.length - 1].length + said.length < 230;
    if (chained) sentences[sentences.length - 1] = sentences[sentences.length - 1].slice(0, -1) + ", and " + said + ".";
    else {
      sentences.push(capitalize(said) + ".");
      if (at) at.push(st); // une réaction se dit là où est son produit
    }
    prev = reaction;
    name.seen.add(reaction.shown); // le produit est nommé : la prochaine fois, « the … »
  }
  const loose = [];
  for (const id of resolved.matter.written) {
    if (used.has(id) || (resolved.weather && resolved.weather[id])) continue; // météo programmée : sa phrase datée la dit (describeAge)
    const own = id === "mill" && at && at.mill && MILL_PROSE[at.mill] ? teller.pick(MILL_PROSE[at.mill]) : id === "oasis" && at && at.oasis && OASIS_PROSE[at.oasis] ? teller.pick(OASIS_PROSE[at.oasis]) : id === "tides" && at && at.tides && TIDE_PROSE[at.tides] ? teller.pick(TIDE_PROSE[at.tides]) : id === "monsoon" && at && at.monsoon && MONSOON_PROSE[at.monsoon] ? teller.pick(MONSOON_PROSE[at.monsoon]) : null; // le moulin, l'oasis : leur phrase suit ce que le monde en a fait
    const presence = String(own ?? (resolved.presence && resolved.presence[id]) ?? blockById.get(id)?.presence ?? "").trim();
    if (presence) { sentences.push(capitalize(presence) + "."); if (at) at.push(stationOf(id)); }
    else loose.push(id);
  }
  for (const sc of resolved.scars || []) { // les cicatrices que le monde a gardées de son tirage (src/scarring.js)
    const presence = String(sc.prose || blockById.get(sc.id)?.presence || "").trim(); // `prose` : une phrase propre à l'Âge (la maladie, l'Observation)
    if (presence) { sentences.push(capitalize(presence) + "."); if (at) at.push(stationOf(sc.id)); }
  }
  for (const id of resolved.wonders || []) { // les merveilles nées d'une union (src/mutation.js, src/wonders.js)
    const presence = String(blockById.get(id)?.presence ?? "").trim();
    if (presence) { sentences.push(capitalize(presence) + "."); if (at) at.push(stationOf(id)); }
  }
  for (const x of resolved.excess || []) { sentences.push(capitalize(x.prose) + "."); if (at) at.push(stationOf(x.id)); } // un bloc écrit en grande quantité (`many: X`, src/amounts.js)
  for (const x of resolved.readings || []) { sentences.push(capitalize(x) + "."); if (at) at.push("near"); } // 2.5 (E) : la lecture du monde qui mûrit avec le temps (src/succession.js)
  // ce qui ne réagit pas : par petits groupes, pas une phrase chacun
  if (at) { // étape 2 (décision B) : plus de sac ; chaque reste rejoint sa station, nommé d'un adjectif, et describeAge l'accroche à une phrase voisine
    at.loose = {};
    for (const id of loose) (at.loose[stationOf(id)] = at.loose[stationOf(id)] || []).push(name(id, 1));
    return sentences;
  }
  const groups = [];
  for (let i = 0; i < loose.length;) {
    const rest = loose.length - i,
      size = rest <= 3 ? rest : rest === 4 ? 2 : 3;
    groups.push(loose.slice(i, i + size));
    i += size;
  }
  for (const group of groups) {
    const text =
      group.length === 1
        ? (teller.fresh(ALONE) || ALONE[0])(name(group[0]))
        : (teller.fresh(GROUPED) || GROUPED[0])(listOf(group.map((id) => name(id, 1))));
    sentences.push(capitalize(text) + ".");
  }
  return sentences;
}

/** Les deux premiers mots d'une phrase, pour repérer les débuts répétés. */
function startOf(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).slice(0, 2).join(" ");
}

// ---- les coutures (étape 2 : décisions B et C) -----------------------------------------------------------
/** Un reste s'accroche à la dernière phrase de sa station (« ; the air carries grey rain ») ; seul à sa station, il fait une phrase courte. */
const CLAUSE = {
  sky: ["the air carries {l}", "overhead there is {l}"],
  far: ["further off, {l}", "beyond, {l}", "and in the distance, {l}"],
  near: ["close by, {l}", "around it, {l}", "underfoot and around, {l}"],
  hands: ["here and there, {l}", "not far off, {l}"],
};
const CLAUSE_ONE = { hands: ["not far off, {l}", "nearby, {l}"] };
const ALONE_AT = {
  sky: ["the air carries {l}", "overhead there is {l}"],
  far: ["further off {v} {l}", "beyond {v} {l}", "in the distance {v} {l}"],
  near: ["close by {v} {l}", "around {v} {l}", "underfoot and around {v} {l}"],
  hands: ["here and there {w} {l}", "not far off {w} {l}"],
};
const ALONE_ONE = { hands: ["not far off {w} {l}", "nearby {w} {l}"] }; // une seule chose n'est pas « here and there »
/** Un connecteur à l'entrée d'une station, seulement si le regard y bouge vraiment ; trois connecteurs au plus dans tout le texte. */
const STATION_LINKS = { far: ["Further off, ", "In the distance, "], near: ["Closer, ", "Nearer at hand, "], hands: ["Among all this, ", "Not far from you, "] };
const LOCATIVE = /^(deep|far|further|in |under|high|over|close|here|there|around|beneath|below|above|across|at |out |outside|all around|everywhere|overhead|through|not far|a little|nearer|closer|among)/i;
const SKY_LINK_RE = new RegExp("^(" + Object.values(SKY_LINKS).flat().map((l) => l.replace(/[, ]+$/, "")).join("|") + "),");
function sew(by, loose, place, teller) {
  const opened = new Set(STATIONS.flatMap((st) => by[st]).flatMap((x) => x.split(/(?<=[.;:])\s+/)).map(startOf)); // les débuts déjà pris (phrases et propositions)
  const fresh = (list) => { const x = list.find((c) => !opened.has(startOf(c.replace(/\{\w\}\s*/g, "")))) || list[0]; opened.add(startOf(x.replace(/\{\w\}\s*/g, ""))); return x; };
  for (const st of ["sky", "far", "near", "hands"]) {
    const names = loose[st];
    if (!names || !names.length) continue;
    const parts = names.length > 4 ? [names.slice(0, 3), names.slice(3)] : [names];
    parts.forEach((part, k) => {
      const l = listOf(part), host = by[st][by[st].length - 1];
      if (k === 0 && host && host.length < 160 && !host.includes(";") && !/:/.test(host)) by[st][by[st].length - 1] = host.slice(0, -1) + "; " + fresh(part.length === 1 && CLAUSE_ONE[st] ? CLAUSE_ONE[st] : CLAUSE[st]).replace("{l}", l) + ".";
      else by[st].push(capitalize(fresh(part.length === 1 && ALONE_ONE[st] ? ALONE_ONE[st] : ALONE_AT[st]).replace("{l}", l).replace("{v}", part.length > 1 ? "lie" : "lies").replace("{w}", part.length > 1 ? "stand" : "stands")) + ".");
    });
  }
  let links = by.sky.filter((x) => SKY_LINK_RE.test(x)).length;
  const P = typeof place === "string" ? { kind: place } : place || {};
  if (P.kind === "cave" && by.place.length && by.sky.length && !LOCATIVE.test(by.sky[0])) { by.sky[0] = "Outside, " + by.sky[0][0].toLowerCase() + by.sky[0].slice(1); links++; } // de la grotte, on regarde dehors
  for (const st of ["far", "near", "hands"]) {
    const first = by[st][0];
    if (!first || links >= 3 || LOCATIVE.test(first) || teller.random() > 0.7) continue;
    const prevSt = STATIONS[STATIONS.indexOf(st) - 1];
    if (!by[prevSt] || !by[prevSt].length) continue; // le regard ne bouge que s'il venait d'ailleurs
    const choice = STATION_LINKS[st].filter((l) => !echoes(l, by[st].join(" ")) && !opened.has(startOf(l))); // pas « Further off, … ; further off, … »
    if (!choice.length) continue;
    by[st][0] = teller.pick(choice) + first[0].toLowerCase() + first.slice(1);
    links++;
  }
}

// ---- la description --------------------------------------------------------------------------------------
/**
 * Texte d'un Âge. `options.seed` : le nom de la note (même Âge, même texte). Sans graine, le contenu en tient lieu.
 */
function describeAge(resolved, options = {}) {
  const random = seededRandom(seedOf(resolved, options.seed));
  let place = options.place;
  if (place === undefined && options.analysis) try { place = hooks.place(options.analysis, options.seed); } catch (e) { place = null; } // le point de liaison de la fenêtre (src/entry.js)
  return withRandom(random, () => {
    const grammar = tracery.createGrammar(PROSE_GRAMMAR);
    grammar.addModifiers(tracery.baseEngModifiers);
    const teller = makeTeller(random);
    const sky0 = skySentences(resolved, grammar, teller, place), sky = place && place.freeze === "ice_river" ? sky0.filter((s) => !/\briver\b/i.test(s)) : sky0; /* 2.9 : la rivière prise ne coule plus dans le ciel du texte */
    const at = [];
    at.skyText = sky.join(" ").toLowerCase();
    at.mill = place && typeof place === "object" ? place.mill : null;
    at.oasis = place && typeof place === "object" ? place.oasis : null;
    at.tides = place && typeof place === "object" ? place.tides : null;
    at.monsoon = place && typeof place === "object" ? place.monsoon : null;
    at.freeze = place && typeof place === "object" ? place.freeze : null;
    at.seaBeast = place && typeof place === "object" ? place.seaBeast : null;
    const matterLines = matterSentences(resolved, grammar, teller, at);
    if (sky.length === 0 && !matterLines.length) return "The page holds no readable symbol yet.";
    // deux phrases qui commencent pareil (« The book… The book… ») : on prend une autre tournure quand il y en a une
    const starts = new Set(sky.map(startOf));
    matterLines.forEach((x) => starts.add(startOf(x)));
    const unlike = (list) => {
      const free = list.filter((x) => !starts.has(startOf(x)));
      const x = teller.pick(free.length ? free : list);
      starts.add(startOf(x));
      return x;
    };
    /* le parcours (décision A) : chaque phrase à sa station ; dans une station, l'ordre d'avant */
    const by = Object.fromEntries(STATIONS.map((st) => [st, []]));
    const placeText = place && sky.length ? placeSentence(place, teller) : null;
    if (placeText) by.place.push(placeText);
    by.sky.push(...sky);
    matterLines.forEach((x, i) => by[at[i] || "near"].push(x));
    // les contradictions : une note propre à un bloc se dit à sa station ; la plus grave des autres, une seule, ferme la description (le doute)
    const notes = resolved.triggered
      .filter((c, i, all) => !c.note || all.findIndex((o) => o.note === c.note) === i) // une phrase par note, même si plusieurs règles la partagent
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
    let doubt = null;
    for (const c of notes) {
      const own = Array.isArray(c.note) && c.note.length ? c.note : typeof c.note === "string" && c.note ? [c.note] : null;
      const host = [c.b, c.with, c.a].find((id) => id && blockById.has(id)); // la règle nomme le ciel (a) et la chose (b) : la note se dit avec la chose
      if (own) by[host ? stationOf(host) : "sky"].push(capitalize(unlike(own)) + ".");
      else if (!doubt) doubt = capitalize(unlike(SKY_PROSE_GRAMMAR[`${c.severity}_contradiction`] || SKY_PROSE_GRAMMAR.light_contradiction)) + ".";
    }
    // météo vivante : une phrase par ligne programmée (`drizzle: often, dawn`), au ciel
    if (resolved.weather) by.sky.push(...WEATHER.sentences(resolved.weather, teller.pick));
    const said = new Set(); // une même phrase ne se dit pas deux fois (deux règles qui partagent une note sous deux formes)
    for (const st of STATIONS) by[st] = by[st].filter((x) => (said.has(x) ? false : (said.add(x), true)));
    sew(by, at.loose || {}, place, teller);
    if (resolved.drawn.some((pick) => blockById.has(pick.id))) by.hands.push(capitalize(unlike(SKY_PROSE_GRAMMAR.drawn_matter_note))); // ce que le livre n'a pas dit : après ce qu'on a vu, rien ne s'y accroche
    if (doubt) by.doubt.push(doubt);
    return STATIONS.flatMap((st) => by[st]).join(" ");
  });
}

module.exports = {
  EXTRA_SKY,
  MATTER_PROSE_GRAMMAR,
  PROSE_GRAMMAR,
  SKY_PROSE_GRAMMAR,
  capitalize,
  describeAge,
  descriptorsFor,
  matterSentences,
  stationOf,
  PLACE_PROSE,
  spaced,
};
