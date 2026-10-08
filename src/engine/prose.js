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

function capitalize(text) {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

const PROSE_GRAMMAR = { ...SKY_PROSE_GRAMMAR, ...MATTER_PROSE_GRAMMAR };

function spaced(text) {
  return text.replace(/_/g, " ");
}

function descriptorsFor(blockId) {
  let pool = [...(blockById.get(blockId)?.descriptors ?? [])],
    picked = [];
  for (; picked.length < 2 && pool.length;)
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return picked.join(", ");
}

function describeAge(resolved) {
  let grammar = tracery.createGrammar(PROSE_GRAMMAR);
  grammar.addModifiers(tracery.baseEngModifiers);
  let sentences = [],
    drawLeadDone = !1;
  for (let line of resolved.lines) {
    if (line.unknown) {
      sentences.push(grammar.flatten("#ink_blot#"));
      continue;
    }
    let entry = line.entry;
    if (line.autoFilled && line.slot !== void 0) {
      let text = grammar.flatten(entry.proseTag);
      (sentences.push(drawLeadDone ? text : grammar.flatten("#drawn_lead#") + text), (drawLeadDone = !0));
    } else if (line.autoFilled) {
      let defaultTag = entry.category === "stars" ? "default_stars" : "default_cycle";
      sentences.push(grammar.flatten(`#${defaultTag}#`));
    } else sentences.push(grammar.flatten(entry.proseTag));
  }
  if (sentences.length === 0) {
    let matterOnly = matterSentences(resolved, grammar);
    return matterOnly.length ? matterOnly.join(" ") : "The page holds no readable symbol yet.";
  }
  let mainText =
      sentences
        .map((sentence, index) => (index === 0 ? capitalize(sentence) : grammar.flatten("#link#") + sentence))
        .join(". ") + ".",
    contradictionSentences = resolved.triggered
      .filter((c, i, all) => !c.note || all.findIndex((o) => o.note === c.note) === i) // une phrase par note, même si plusieurs règles la partagent
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
      .map((contradiction) =>
        contradiction.note
          ? capitalize(contradiction.note[Math.floor(Math.random() * contradiction.note.length)]) + "."
          : capitalize(grammar.flatten(`#${contradiction.severity}_contradiction#`)) + ".",
      ),
    matterLines = matterSentences(resolved, grammar),
    drawnNote = resolved.drawn.some((pick) => blockById.has(pick.id))
      ? [capitalize(grammar.flatten("#drawn_matter_note#"))]
      : [];
  return [mainText, ...contradictionSentences, ...matterLines, ...drawnNote].join(" ");
}

function matterSentences(resolved, grammar) {
  let sentences = [],
    used = new Set();
  for (let reaction of resolved.matter.reactions) {
    (used.add(reaction.a), used.add(reaction.b));
    let verb = reaction.verbs
      ? reaction.verbs[Math.floor(Math.random() * reaction.verbs.length)]
      : grammar.flatten(`#verb_${reaction.type}#`);
    sentences.push(
      capitalize(
        `${descriptorsFor(reaction.a)} ${spaced(reaction.a)} ${grammar.flatten("#meets#")} ${descriptorsFor(reaction.b)} ${spaced(reaction.b)} and ${verb} ${spaced(reaction.shown)}.`,
      ),
    );
  }
  for (let id of resolved.matter.written) {
    if (used.has(id)) continue;
    let text =
      blockById.get(id)?.presence ??
      grammar.flatten("#nearby#").replace("{d}", descriptorsFor(id)).replace("{n}", spaced(id));
    sentences.push(capitalize(text) + ".");
  }
  return sentences;
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
