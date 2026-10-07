"use strict";
const EXTRA_SKY = require("../sky");
const { blockById } = require("./registry");
const { SEVERITY_ORDER } = require("./rules");

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
    "left open by the book, ",
    "the book said nothing of it, so ",
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

function capitalize(e) {
  return e.length ? e[0].toUpperCase() + e.slice(1) : e;
}

const PROSE_GRAMMAR = { ...SKY_PROSE_GRAMMAR, ...MATTER_PROSE_GRAMMAR };

function spaced(e) {
  return e.replace(/_/g, " ");
}

function descriptorsFor(e) {
  let o = [...(blockById.get(e)?.descriptors ?? [])],
    t = [];
  for (; t.length < 2 && o.length;) t.push(o.splice(Math.floor(Math.random() * o.length), 1)[0]);
  return t.join(", ");
}

function describeAge(e) {
  let o = tracery.createGrammar(PROSE_GRAMMAR);
  o.addModifiers(tracery.baseEngModifiers);
  let t = [],
    i = !1;
  for (let g of e.lines) {
    if (g.unknown) {
      t.push(o.flatten("#ink_blot#"));
      continue;
    }
    let h = g.entry;
    if (g.autoFilled && g.slot !== void 0) {
      let u = o.flatten(h.proseTag);
      (t.push(i ? u : o.flatten("#drawn_lead#") + u), (i = !0));
    } else if (g.autoFilled) {
      let u = h.category === "stars" ? "default_stars" : "default_cycle";
      t.push(o.flatten(`#${u}#`));
    } else t.push(o.flatten(h.proseTag));
  }
  if (t.length === 0) {
    let g = matterSentences(e, o);
    return g.length ? g.join(" ") : "The page holds no readable symbol yet.";
  }
  let r = t.map((g, h) => (h === 0 ? capitalize(g) : o.flatten("#link#") + g)).join(". ") + ".",
    s = [...e.triggered]
      .sort((g, h) => SEVERITY_ORDER.indexOf(g.severity) - SEVERITY_ORDER.indexOf(h.severity))
      .map((g) =>
        g.note
          ? capitalize(g.note[Math.floor(Math.random() * g.note.length)]) + "."
          : capitalize(o.flatten(`#${g.severity}_contradiction#`)) + ".",
      ),
    n = matterSentences(e, o),
    c = e.drawn.some((g) => blockById.has(g.id)) ? [capitalize(o.flatten("#drawn_matter_note#"))] : [];
  return [r, ...s, ...n, ...c].join(" ");
}

function matterSentences(e, o) {
  let t = [],
    i = new Set();
  for (let r of e.matter.reactions) {
    (i.add(r.a), i.add(r.b));
    let s = r.verbs ? r.verbs[Math.floor(Math.random() * r.verbs.length)] : o.flatten(`#verb_${r.type}#`);
    t.push(
      capitalize(
        `${descriptorsFor(r.a)} ${spaced(r.a)} ${o.flatten("#meets#")} ${descriptorsFor(r.b)} ${spaced(r.b)} and ${s} ${spaced(r.shown)}.`,
      ),
    );
  }
  for (let r of e.matter.written) {
    if (i.has(r)) continue;
    let n =
      blockById.get(r)?.presence ??
      o.flatten("#nearby#").replace("{d}", descriptorsFor(r)).replace("{n}", spaced(r));
    t.push(capitalize(n) + ".");
  }
  return t;
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
  spaced,
};
