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
    "a steady light, without competition",
  ],
  twin_star: [
    "two stars answer each other overhead",
    "a double sun casts twinned shadows",
    "two lights vie, never quite merging",
  ],
  no_star: [
    "no light pierces the veil above",
    "the sky stays empty, unreadable",
    "no source warms this place",
  ],
  companion_moon: [
    "a pale companion trails the main star",
    "a quiet moon keeps its distance",
    "a second, colder body rides alongside",
  ],
  steady_cycle: [
    "day yields to night without surprise",
    "time passes here with quiet regularity",
    "an old rhythm, never once broken",
  ],
  erratic_cycle: [
    "day and night jostle with no logic",
    "time seems to hesitate, more than elsewhere",
    "the alternation surprises, resists habit",
  ],
  frozen_cycle: [
    "the sky never changes, caught in its moment",
    "a motionless light bathes the place, endlessly",
    "time seems to have stopped, somewhere overhead",
  ],
  stable_orbit: [
    "the stars keep an old, steady round",
    "their dance never varies, predictable",
    "a sure orbit binds them together",
  ],
  shifting_orbit: [
    "their position drifts, slow and noticeable",
    "eclipses return, each one different",
    "the stars' round shifts with time",
  ],
  chaotic_orbit: [
    "the stars move by no rule at all",
    "their round defies any prediction",
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
    "colored veils ripple, high in the sky",
    "an aurora lingers, faint but real",
    "shifting lights tint the horizon",
  ],
  recurring_eclipses: [
    "a shadow returns, periodically, to veil the light",
    "the stars cross paths at regular intervals",
    "a darkening marks the passage of time",
  ],
  permanent_veil: [
    "a constant veil hides what happens above",
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
    "the sky contradicts itself, openly",
    "something here cannot coexist, and yet does",
    "a blatant incoherence cracks the description",
  ],
  medium_contradiction: [
    "a quiet tension troubles this sky's coherence",
    "two truths rub against each other here, never quite agreeing",
    "something is off, though it's hard to say what",
  ],
  light_contradiction: [
    "a minor oddity, almost charming",
    "a slight mismatch, lending the place its character",
    "an irregularity barely noticed",
  ],
  link: [
    "Beyond that, ",
    "One also senses that ",
    "Furthermore, ",
    "It's worth adding that ",
    "Not far off, ",
  ],
  default_stars: [
    "lacking any stated choice, a star imposed itself",
    "the sky filled its own silence with a sun",
  ],
  default_cycle: [
    "lacking any written rhythm, a cycle settled in on its own",
    "time chose its own cadence, unwritten",
  ],
  drawn_lead: [
    "left open by the book: ",
    "the book was silent here, and the dark chose: ",
    "unwritten, it was drawn from the dark: ",
  ],
  drawn_matter_note: [
    "the book said nothing of what lies beneath it, and the place had answers of its own.",
    "what the pages left unsaid, the place supplied.",
    "the rest was not written; it was simply what this place held.",
  ],
};

const MATTER_PROSE_GRAMMAR = {
  meets: ["meets", "touches", "runs into", "settles against"],
  verb_violent: ["shatters into", "flash-hardens into", "erupts, then freezes into"],
  verb_crystallizing: ["slowly settles into", "locks into", "gathers itself into"],
  verb_corrosive: ["eats away into", "gnaws toward", "slowly turns to"],
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
const SKY_LINKS = {
  world: ["All around, ", "Everywhere you look, "],
  stars: ["Overhead, ", "High above, ", "In the sky, ", "Above it all, "],
  body: ["Here, ", "In this place, ", "For this world, "],
  orbit: ["Further out, ", "Far overhead, ", "Out in the dark, ", "Above, "],
  cycle: ["Here, ", "Meanwhile, ", "Down below, ", "Through it all, "],
  belt: ["Further out, ", "Across the sky, ", "Higher still, "],
  phenomenon: ["Higher still, ", "Above, ", "At the edge of sight, ", "Across the sky, "],
  unknown: ["Somewhere in the text, ", "Between the lines, "],
};
SKY_LINKS.hue = SKY_LINKS.stars;

/** Un connecteur qui répète un mot de la phrase (« Above, … high above ») sonne faux : on l'écarte. */
const LINK_STOP = new Set(["the", "it", "all", "in", "at", "you", "for", "this", "of", "to"]);
function echoes(link, text) {
  const words = new Set(text.toLowerCase().match(/[a-z]+/g) || []);
  return (link.toLowerCase().match(/[a-z]+/g) || []).some((w) => !LINK_STOP.has(w) && words.has(w));
}

function skySentences(resolved, grammar, teller) {
  const lines = resolved.lines.map((line, index) => ({ line, index }));
  const familyOf = (line) => (line.unknown ? "unknown" : line.entry.category in SKY_ORDER ? line.entry.category : "phenomenon");
  const rank = (line) => (line.unknown ? 9 : SKY_ORDER[line.entry.category] ?? 7);
  lines.sort((a, b) => rank(a.line) - rank(b.line) || a.index - b.index);
  // une couleur de soleil écrite dit déjà « un soleil » : l'étoile unique ajoutée d'office ne se répète pas
  const hasHue = lines.some(({ line }) => !line.unknown && line.entry.category === "hue");
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
    } else items.push({ family: familyOf(line), text: grammar.flatten(entry.proseTag) });
  }
  const out = [];
  let glued = false;
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
    const link = teller.random() < 0.55 ? teller.fresh((SKY_LINKS[item.family] || SKY_LINKS.phenomenon).filter((l) => !echoes(l, item.text))) : null;
    out.push(link ? link + item.text : capitalize(item.text));
  });
  return out.map((s) => s + ".");
}

// ---- la matière ------------------------------------------------------------------------------------------
const MEETS = ["meets", "touches", "runs into", "settles against"];
const MEETING = { meets: "meeting", touches: "touching", "runs into": "running into", "settles against": "settling against" };
const AGAINST = ["Touched by", "Against", "In contact with"];
/** Tournures d'une réaction : A, B, le verbe (3e personne), le résultat. Celles qui disent « it » refusent un verbe qui le dit déjà. */
const REACTION_FORMS = [
  { id: "and", make: (A, B, v, C, t) => `${A} ${t.pick(MEETS)} ${B} and ${v} ${C}` },
  { id: "where", noIt: true, make: (A, B, v, C, t) => `where ${A} ${t.pick(MEETS)} ${B}, it ${v} ${C}` },
  { id: "meeting", make: (A, B, v, C, t) => `${A}, ${MEETING[t.pick(MEETS)]} ${B}, ${v} ${C}` },
  { id: "against", make: (A, B, v, C, t) => `${t.pick(AGAINST)} ${B}, ${A} ${v} ${C}` },
];
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

/** Groupes nominaux : des descripteurs à la première mention seulement, « the … » ensuite ; un adjectif ne sert qu'une fois. */
function makeNamer(teller) {
  const seen = new Set(),
    adjectives = new Set();
  const name = (id, most = 2) => {
    const noun = spaced(id);
    if (seen.has(id)) return "the " + noun;
    seen.add(id);
    const pool = (blockById.get(id)?.descriptors ?? []).filter((d) => !adjectives.has(d));
    const count = Math.min(pool.length, most === 1 || teller.random() < 0.4 ? 1 : 2);
    const picked = [];
    while (picked.length < count) picked.push(pool.splice(Math.floor(teller.random() * pool.length), 1)[0]);
    picked.forEach((d) => adjectives.add(d));
    return picked.length ? `${picked.join(", ")} ${noun}` : noun;
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
const FAR_GEO = new Set(["fissure", "cave_fissure", "submarine_fissure", "no_fissure", "water", "lava", "geysers", "rifts", "basalt_columns", "karst", "subsurface_ocean", "ceiling_sea", "molten_core", "dead_core", "deep_cold", "pressure", "brine", "scorched_surface", "hollowed_ground", "ringed_ground", "breathing_mirrors", "acid", "bitter_water", "obsidian"]);
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
/** Où l'on arrive : le point de liaison de la fenêtre (src/genscene.js, viewOf), dit par la description. */
const PLACE_PROSE = {
  plain: ["you stand on open ground, the place laid out level before you", "the link sets you down on even ground, with nothing between you and the rest"],
  low: ["you arrive in a hollow, the land rising all around", "the link sets you down low, in a fold of the ground, the world above its rim"],
  high: ["you arrive on a height, the land spread out below", "the link sets you on a ledge of rock, and everything else lies beneath"],
  slope: ["you arrive on a slope, the ground falling away to one side", "the link sets you halfway up a hillside, the land tilting away"],
  cover: ["you arrive under cover, looking out from the shade", "the link sets you in the shelter of what stands around you, looking out"],
  cave: ["you arrive at the mouth of a cave, the light ahead", "the link sets you in the shadow of a cave mouth, looking out"],
};

function matterSentences(resolved, grammar, teller = makeTeller(Math.random), at = null) {
  const sentences = [],
    used = new Set(),
    name = makeNamer(teller);
  let last = null;
  for (const reaction of resolved.matter.reactions) {
    used.add(reaction.a);
    used.add(reaction.b);
    const verb = reaction.verbs ? teller.pick(reaction.verbs) : grammar.flatten(`#verb_${reaction.type}#`);
    const fits = REACTION_FORMS.filter((f) => f.id !== last && !(f.noIt && /\bit\b/.test(verb)));
    const fresh = fits.filter((f) => !teller.used.has("form:" + f.id));
    const form = teller.pick(fresh.length ? fresh : fits);
    teller.used.add("form:" + form.id);
    last = form.id;
    const A = name(reaction.a),
      B = name(reaction.b);
    sentences.push(capitalize(form.make(A, B, verb, spaced(reaction.shown), teller)) + ".");
    if (at) at.push(blockById.has(reaction.shown) ? stationOf(reaction.shown) : stationOf(reaction.a)); // une réaction se dit là où est son produit
    name.seen.add(reaction.shown); // le produit est nommé : la prochaine fois, « the … »
  }
  const loose = [];
  for (const id of resolved.matter.written) {
    if (used.has(id) || (resolved.weather && resolved.weather[id])) continue; // météo programmée : sa phrase datée la dit (describeAge)
    const presence = String((resolved.presence && resolved.presence[id]) ?? blockById.get(id)?.presence ?? "").trim();
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
  const groups = [];
  const byStation = at ? STATIONS.map((st) => loose.filter((id) => stationOf(id) === st)).filter((l) => l.length) : [loose]; // chaque reste à sa station
  for (const part of byStation)
    for (let i = 0; i < part.length;) {
      const rest = part.length - i,
        size = rest <= 3 ? rest : rest === 4 ? 2 : 3;
      groups.push(part.slice(i, i + size));
      i += size;
    }
  for (const group of groups) {
    const text =
      group.length === 1
        ? (teller.fresh(ALONE) || ALONE[0])(name(group[0], 1)) // un seul adjectif : les restes, rangés par station, sont plus souvent seuls
        : (teller.fresh(GROUPED) || GROUPED[0])(listOf(group.map((id) => name(id, 1))));
    sentences.push(capitalize(text) + ".");
    if (at) at.push(stationOf(group[0]));
  }
  return sentences;
}

/** Les deux premiers mots d'une phrase, pour repérer les débuts répétés. */
function startOf(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).slice(0, 2).join(" ");
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
    const sky = skySentences(resolved, grammar, teller);
    const at = [], matterLines = matterSentences(resolved, grammar, teller, at);
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
    const placeText = place && PLACE_PROSE[place] && sky.length ? capitalize(teller.pick(PLACE_PROSE[place])) + "." : null;
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
      if (own) by[c.with && blockById.has(c.with) ? stationOf(c.with) : "sky"].push(capitalize(unlike(own)) + ".");
      else if (!doubt) doubt = capitalize(unlike(SKY_PROSE_GRAMMAR[`${c.severity}_contradiction`] || SKY_PROSE_GRAMMAR.light_contradiction)) + ".";
    }
    // météo vivante : une phrase par ligne programmée (`drizzle: often, dawn`), au ciel
    if (resolved.weather) by.sky.push(...WEATHER.sentences(resolved.weather, teller.pick));
    if (resolved.drawn.some((pick) => blockById.has(pick.id))) by.hands.push(capitalize(unlike(SKY_PROSE_GRAMMAR.drawn_matter_note))); // ce que le livre n'a pas dit : après ce qu'on a vu
    if (doubt) by.doubt.push(doubt);
    const seen = new Set(); // une même phrase ne se dit pas deux fois (deux règles qui partagent une note sous deux formes)
    return STATIONS.flatMap((st) => by[st]).filter((x) => (seen.has(x) ? false : (seen.add(x), true))).join(" ");
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
