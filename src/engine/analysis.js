"use strict";
const { hooks } = require("./hooks");
const { blockById } = require("./registry");
const { resolveAge } = require("./resolve");

const SEVERITY_RANK = { light: 1, medium: 2, strong: 3 };

const SEVERITY_NAME = { 0: "none", 1: "light", 2: "medium", 3: "strong" };

function pageList(analysis, includeBlots = !1) {
  let resolved = analysis.resolved,
    severityById = new Map();
  for (let contradiction of resolved.triggered)
    for (let id of [contradiction.a, contradiction.b])
      severityById.set(id, Math.max(severityById.get(id) ?? 0, SEVERITY_RANK[contradiction.severity]));
  let drawnById = new Map(resolved.drawn.map((pick) => [pick.id, pick])),
    pages = [];
  for (let line of resolved.lines)
    line.entry &&
      pages.push({
        id: line.entry.id,
        born: !1,
        written: !line.autoFilled,
        drawn: line.autoFilled && line.slot !== void 0,
        chance: line.chance,
        severity: SEVERITY_NAME[severityById.get(line.entry.id) ?? 0],
        axis: line.entry.axis,
      });
  for (let id of resolved.matter.written) {
    let pick = drawnById.get(id);
    pages.push({
      id: id,
      born: !1,
      written: !pick,
      drawn: !!pick,
      chance: pick?.chance,
      severity: SEVERITY_NAME[severityById.get(id) ?? 0],
      axis: blockById.get(id)?.axis,
    });
  }
  for (let reaction of resolved.matter.reactions) {
    let baseSeverity =
      reaction.type === "violent" ? 2 : reaction.type === "corrosive" || reaction.type === "decaying" ? 1 : 0;
    pages.push({
      id: reaction.shown,
      born: !0,
      written: !1,
      drawn: !1,
      severity: SEVERITY_NAME[Math.max(baseSeverity, severityById.get(reaction.result) ?? 0)],
      axis: blockById.get(reaction.shown)?.axis,
    });
  }
  if (includeBlots)
    for (let line of resolved.lines)
      line.unknown &&
        pages.push({ id: "ink_blot", born: !1, written: !1, drawn: !1, severity: "none", blot: !0 });
  return pages;
}

function noteName(path) {
  return path.replace(/^.*\//, "").replace(/\.md$/i, "");
}

/** La graine d'un Âge : le nom de sa note, sauf si l'extension en connaît une autre (propriété `age_seed`, gardée au renommage). */
function seedName(path) {
  const v = hooks.seedName ? hooks.seedName(path) : null;
  return v ? String(v) : noteName(path);
}

const STABLE_AT = 75;

const UNSTABLE_AT = 40;

function extractAge(text) {
  let blocks = [...text.matchAll(/```age[ \t]*\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  return blocks.length
    ? blocks.join(`
`)
    : null;
}

function verdictOf(stability) {
  return stability >= STABLE_AT ? "stable" : stability >= UNSTABLE_AT ? "unstable" : "dying";
}

/** Analyse d'un bloc `age` : le moteur d'origine, puis le retraitement de l'extension (hooks.adjust). */
function analyseAge(source, options) {
  hooks.src = source;
  try {
    return hooks.adjust(analyseAgeBase(source, options), options, source);
  } finally {
    hooks.src = null;
  }
}

function analyseAgeBase(source, options) {
  let resolved = resolveAge(source, options),
    axisStability = {};
  for (let [axis, cost] of Object.entries(resolved.costByAxis))
    cost > 0 && (axisStability[axis] = Math.max(0, Math.min(100, Math.round(100 - cost * 100))));
  let matterIds = new Set(resolved.matter.written),
    hasWater = matterIds.has("water"),
    fissure = matterIds.has("no_fissure")
      ? null
      : matterIds.has("cave_fissure")
        ? "cave"
        : matterIds.has("submarine_fissure") || (matterIds.has("fissure") && hasWater)
          ? "submarine"
          : matterIds.has("fissure")
            ? "open"
            : null,
    values = Object.values(axisStability),
    stability = values.length ? Math.min(...values) : 100;
  return {
    resolved: resolved,
    verdict: verdictOf(stability),
    stability: stability,
    axisStability: axisStability,
    links: resolved.links,
    returnTo: resolved.returnTo,
    stranded: !resolved.returnTo,
    fissure: fissure,
    trapped: !resolved.returnTo && fissure === null,
    home: resolved.returnTo
      ? "book"
      : fissure === "cave"
        ? "cavern"
        : fissure === "submarine"
          ? "submarine"
          : fissure === "open"
            ? "fissure"
            : "none",
    discovered: [...new Set(resolved.matter.reactions.map((reaction) => reaction.shown))],
    drawn: resolved.drawn,
  };
}

const FRONTMATTER_KEYS = [
  "age_verdict",
  "age_stability",
  "age_axes",
  "age_return",
  "age_links",
  "age_discovered",
  "age_drawn",
  "age_home",
];

function frontmatterFor(analysis) {
  let wikilink = (name) => `[[${name}]]`;
  return {
    age_verdict: analysis.verdict,
    age_stability: analysis.stability,
    age_axes: Object.keys(analysis.axisStability).length ? analysis.axisStability : void 0,
    age_return: analysis.returnTo ? wikilink(analysis.returnTo) : void 0,
    age_links: analysis.links.length ? analysis.links.map(wikilink) : void 0,
    age_discovered: analysis.discovered.length ? analysis.discovered : void 0,
    age_drawn: analysis.drawn.length ? analysis.drawn.map((pick) => pick.id) : void 0,
    age_home: analysis.home,
  };
}

function homeMessage(analysis) {
  let fissureText =
    analysis.fissure === "cave"
      ? "a fissure deep in a cavern"
      : analysis.fissure === "submarine"
        ? "a fissure beneath the water"
        : "a fissure in the open";
  return analysis.trapped
    ? "No return book, and no fissure: nothing here leads home."
    : analysis.stranded
      ? `No return book is written, but ${fissureText} leads home.`
      : analysis.fissure
        ? `${fissureText.charAt(0).toUpperCase() + fissureText.slice(1)} leads home too.`
        : null;
}

module.exports = {
  FRONTMATTER_KEYS,
  SEVERITY_NAME,
  SEVERITY_RANK,
  STABLE_AT,
  UNSTABLE_AT,
  analyseAge,
  analyseAgeBase,
  extractAge,
  frontmatterFor,
  homeMessage,
  noteName,
  seedName,
  pageList,
  verdictOf,
};
