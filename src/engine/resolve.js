"use strict";
const { hooks } = require("./hooks");
const { DEFAULTED_SLOT_COST, PULL_STRENGTH, drawOpenSlots } = require("./draw");
const { COHERENCE_BONUS, SKY_DEFAULTS, SKY_ENTRIES, UNKNOWN_LINE_COST } = require("./data/sky");
const { reactMatter, writableIds } = require("./registry");
const { CONTRADICTION_COST, findContradictions } = require("./rules");

let drawSettings = { draw: !0, pull: PULL_STRENGTH.moderate };

function setDrawSettings(e) {
  drawSettings = { ...drawSettings, ...e };
}

function linkTarget(e) {
  return (
    e.trim().replace(/^!/, "").replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0].split("#")[0].trim() ||
    void 0
  );
}

const skyEntryById = new Map(SKY_ENTRIES.map((e) => [e.id, e]));

function emptyAxes() {
  return { cosmological: 0, geological: 0, metaphysical: 0, weather: 0, ecological: 0 };
}

function resolveAge(e, o = {}) {
  let t = o.draw ?? drawSettings.draw,
    i = o.pull ?? drawSettings.pull,
    r = [],
    s = new Set(),
    n = [],
    a = [],
    c,
    g,
    h;
  for (let M of e.split(`
`)) {
    let T = M.trim();
    if (T === "" || T.startsWith("#") || hooks.skip(T)) continue;
    let p = T.match(/^seed\s*:\s*(.*)$/i);
    if (p) {
      p[1].trim() && (h = p[1].trim());
      continue;
    }
    let y = T.match(/^(link|return|panel)\s*:\s*(.*)$/i);
    if (y) {
      let v = linkTarget(y[2]);
      if (v) {
        let _ = y[1].toLowerCase();
        _ === "return" ? (c = v) : _ === "panel" ? (g = v) : a.includes(v) || a.push(v);
      }
      continue;
    }
    let b = skyEntryById.get(T);
    b
      ? (r.push({ raw: T, entry: b, unknown: !1, autoFilled: !1 }), s.add(b.category))
      : writableIds.has(T)
        ? n.push(T)
        : r.push({ raw: T, unknown: !0, autoFilled: !1 });
  }
  let u = [],
    l = [];
  if (t) {
    let M = new Set([...r.filter((p) => p.entry).map((p) => p.entry.id), ...n]),
      T = drawOpenSlots({ written: hooks.written(M), seed: `${o.seed ?? ""}#${h ?? ""}`, pull: i });
    for (let p of T) {
      let y = skyEntryById.get(p.id);
      (y
        ? r.push({ raw: p.id, entry: y, unknown: !1, autoFilled: !0, chance: p.chance, slot: p.slot })
        : l.push(p.id),
        u.push(p));
    }
  } else {
    let M = r.length === 0 && n.length > 0;
    for (let [T, p] of Object.entries(SKY_DEFAULTS))
      if (!M && !s.has(T)) {
        let y = skyEntryById.get(p);
        y && r.push({ raw: p, entry: y, unknown: !1, autoFilled: !0 });
      }
  }
  let d = reactMatter([...n, ...l]),
    f = new Set(d.written);
  for (let M of d.reactions) f.add(M.result);
  let m = new Set(r.filter((M) => M.entry).map((M) => M.entry.id)),
    k = findContradictions(m, f),
    w = emptyAxes(),
    x = 0,
    A = 0,
    $ = 0;
  for (let M of r) {
    if (M.unknown) {
      (x++, (w.cosmological += UNKNOWN_LINE_COST));
      continue;
    }
    let T = M.entry;
    ((w[T.axis] += T.weight),
      M.autoFilled && M.slot === void 0 && (A++, (w[T.axis] += DEFAULTED_SLOT_COST)),
      (T.category === "stars" && T.id === "single_sun") ||
        (T.category === "cycle" && T.id === "steady_cycle") ||
        $++);
  }
  for (let M of k) w[M.axis ?? "cosmological"] += CONTRADICTION_COST[M.severity];
  let F = x === 0 && A === 0 && $ === 0 && k.length === 0;
  F && (w.cosmological = Math.max(0, w.cosmological - COHERENCE_BONUS));
  for (let [M, T] of Object.entries(d.costByAxis)) w[M] = Math.max(0, w[M] + T);
  return {
    lines: r,
    triggered: k,
    costByAxis: w,
    coherenceBonusApplied: F,
    matter: d,
    links: a,
    returnTo: c,
    panel: g,
    seed: h,
    drawn: u,
  };
}

module.exports = { emptyAxes, linkTarget, resolveAge, setDrawSettings, skyEntryById };
