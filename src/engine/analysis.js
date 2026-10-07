"use strict";
const { hooks } = require("./hooks");
const { blockById } = require("./registry");
const { resolveAge } = require("./resolve");

const SEVERITY_RANK = { light: 1, medium: 2, strong: 3 };

const SEVERITY_NAME = { 0: "none", 1: "light", 2: "medium", 3: "strong" };

function pageList(e, o = !1) {
  let t = e.resolved,
    i = new Map();
  for (let n of t.triggered)
    for (let a of [n.a, n.b]) i.set(a, Math.max(i.get(a) ?? 0, SEVERITY_RANK[n.severity]));
  let r = new Map(t.drawn.map((n) => [n.id, n])),
    s = [];
  for (let n of t.lines)
    n.entry &&
      s.push({
        id: n.entry.id,
        born: !1,
        written: !n.autoFilled,
        drawn: n.autoFilled && n.slot !== void 0,
        chance: n.chance,
        severity: SEVERITY_NAME[i.get(n.entry.id) ?? 0],
        axis: n.entry.axis,
      });
  for (let n of t.matter.written) {
    let a = r.get(n);
    s.push({
      id: n,
      born: !1,
      written: !a,
      drawn: !!a,
      chance: a?.chance,
      severity: SEVERITY_NAME[i.get(n) ?? 0],
      axis: blockById.get(n)?.axis,
    });
  }
  for (let n of t.matter.reactions) {
    let a = n.type === "violent" ? 2 : n.type === "corrosive" || n.type === "decaying" ? 1 : 0;
    s.push({
      id: n.shown,
      born: !0,
      written: !1,
      drawn: !1,
      severity: SEVERITY_NAME[Math.max(a, i.get(n.result) ?? 0)],
      axis: blockById.get(n.shown)?.axis,
    });
  }
  if (o)
    for (let n of t.lines)
      n.unknown && s.push({ id: "ink_blot", born: !1, written: !1, drawn: !1, severity: "none", blot: !0 });
  return s;
}

function noteName(e) {
  return e.replace(/^.*\//, "").replace(/\.md$/i, "");
}

const STABLE_AT = 75;

const UNSTABLE_AT = 40;

function extractAge(e) {
  let o = [...e.matchAll(/```age[ \t]*\r?\n([\s\S]*?)```/g)].map((t) => t[1]);
  return o.length
    ? o.join(`
`)
    : null;
}

function verdictOf(e) {
  return e >= STABLE_AT ? "stable" : e >= UNSTABLE_AT ? "unstable" : "dying";
}

/** Analyse d'un bloc `age` : le moteur d'origine, puis le retraitement de l'extension (hooks.adjust). */
function analyseAge(e, o) {
  hooks.src = e;
  try {
    return hooks.adjust(analyseAgeBase(e, o), o, e);
  } finally {
    hooks.src = null;
  }
}

function analyseAgeBase(e, o) {
  let t = resolveAge(e, o),
    i = {};
  for (let [g, h] of Object.entries(t.costByAxis))
    h > 0 && (i[g] = Math.max(0, Math.min(100, Math.round(100 - h * 100))));
  let r = new Set(t.matter.written),
    s = r.has("water"),
    n = r.has("no_fissure")
      ? null
      : r.has("cave_fissure")
        ? "cave"
        : r.has("submarine_fissure") || (r.has("fissure") && s)
          ? "submarine"
          : r.has("fissure")
            ? "open"
            : null,
    a = Object.values(i),
    c = a.length ? Math.min(...a) : 100;
  return {
    resolved: t,
    verdict: verdictOf(c),
    stability: c,
    axisStability: i,
    links: t.links,
    returnTo: t.returnTo,
    stranded: !t.returnTo,
    fissure: n,
    trapped: !t.returnTo && n === null,
    home: t.returnTo
      ? "book"
      : n === "cave"
        ? "cavern"
        : n === "submarine"
          ? "submarine"
          : n === "open"
            ? "fissure"
            : "none",
    discovered: [...new Set(t.matter.reactions.map((g) => g.shown))],
    drawn: t.drawn,
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

function frontmatterFor(e) {
  let o = (t) => `[[${t}]]`;
  return {
    age_verdict: e.verdict,
    age_stability: e.stability,
    age_axes: Object.keys(e.axisStability).length ? e.axisStability : void 0,
    age_return: e.returnTo ? o(e.returnTo) : void 0,
    age_links: e.links.length ? e.links.map(o) : void 0,
    age_discovered: e.discovered.length ? e.discovered : void 0,
    age_drawn: e.drawn.length ? e.drawn.map((t) => t.id) : void 0,
    age_home: e.home,
  };
}

function homeMessage(e) {
  let o =
    e.fissure === "cave"
      ? "a fissure deep in a cavern"
      : e.fissure === "submarine"
        ? "a fissure beneath the water"
        : "a fissure in the open";
  return e.trapped
    ? "No return book, and no fissure: nothing here leads home."
    : e.stranded
      ? `No return book is written, but ${o} leads home.`
      : e.fissure
        ? `${o.charAt(0).toUpperCase() + o.slice(1)} leads home too.`
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
  pageList,
  verdictOf,
};
