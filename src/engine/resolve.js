"use strict";
const { hooks } = require("./hooks");
const { DEFAULTED_SLOT_COST, PULL_STRENGTH, drawOpenSlots } = require("./draw");
const { COHERENCE_BONUS, SKY_DEFAULTS, SKY_ENTRIES, UNKNOWN_LINE_COST } = require("./data/sky");
const { reactMatter, writableIds } = require("./registry");
const { CONTRADICTION_COST, findContradictions } = require("./rules");

let drawSettings = { draw: !0, pull: PULL_STRENGTH.moderate, amount: 1 };

function setDrawSettings(settings) {
  drawSettings = { ...drawSettings, ...settings };
}

function linkTarget(text) {
  return (
    text
      .trim()
      .replace(/^!/, "")
      .replace(/^\[\[/, "")
      .replace(/\]\]$/, "")
      .split("|")[0]
      .split("#")[0]
      .trim() || void 0
  );
}

const skyEntryById = new Map(SKY_ENTRIES.map((e) => [e.id, e]));

function emptyAxes() {
  return { cosmological: 0, geological: 0, metaphysical: 0, weather: 0, ecological: 0 };
}

function resolveAge(source, options = {}) {
  let drawEnabled = options.draw ?? drawSettings.draw,
    pull = options.pull ?? drawSettings.pull,
    amount = options.amount ?? drawSettings.amount,
    lines = [],
    categories = new Set(),
    writtenIds = [],
    links = [],
    returnTo,
    panel,
    seedLine;
  for (let rawLine of source.split(`
`)) {
    let line = rawLine.trim();
    if (line === "" || line.startsWith("#") || hooks.skip(line)) continue;
    line = hooks.norm(line);
    let seedMatch = line.match(/^seed\s*:\s*(.*)$/i);
    if (seedMatch) {
      seedMatch[1].trim() && (seedLine = seedMatch[1].trim());
      continue;
    }
    let linkMatch = line.match(/^(link|return|panel)\s*:\s*(.*)$/i);
    if (linkMatch) {
      let target = linkTarget(linkMatch[2]);
      if (target) {
        let kind = linkMatch[1].toLowerCase();
        kind === "return"
          ? (returnTo = target)
          : kind === "panel"
            ? (panel = target)
            : links.includes(target) || links.push(target);
      }
      continue;
    }
    let entry = skyEntryById.get(line);
    entry
      ? (lines.push({ raw: line, entry, unknown: !1, autoFilled: !1 }), categories.add(entry.category))
      : writableIds.has(line)
        ? writtenIds.push(line)
        : lines.push({ raw: line, unknown: !0, autoFilled: !1 });
  }
  let drawn = [],
    drawnMatterIds = [];
  if (drawEnabled) {
    let presentIds = new Set([
        ...lines.filter((line) => line.entry).map((line) => line.entry.id),
        ...writtenIds,
      ]),
      picks = drawOpenSlots({
        written: hooks.written(presentIds),
        seed: `${options.seed ?? ""}#${seedLine ?? ""}`,
        pull,
        amount,
      });
    for (let pick of picks) {
      let pickEntry = skyEntryById.get(pick.id);
      (pickEntry
        ? lines.push({
            raw: pick.id,
            entry: pickEntry,
            unknown: !1,
            autoFilled: !0,
            chance: pick.chance,
            slot: pick.slot,
          })
        : drawnMatterIds.push(pick.id),
        drawn.push(pick));
    }
  } else {
    let onlyMatter = lines.length === 0 && writtenIds.length > 0;
    for (let [category, defaultId] of Object.entries(SKY_DEFAULTS))
      if (!onlyMatter && !categories.has(category)) {
        let defaultEntry = skyEntryById.get(defaultId);
        defaultEntry && lines.push({ raw: defaultId, entry: defaultEntry, unknown: !1, autoFilled: !0 });
      }
  }
  let matter = reactMatter([...writtenIds, ...drawnMatterIds]),
    matterIds = new Set(matter.written);
  for (let reaction of matter.reactions) matterIds.add(reaction.result);
  let skyIds = new Set(lines.filter((line) => line.entry).map((line) => line.entry.id)),
    triggered = findContradictions(skyIds, matterIds),
    costByAxis = emptyAxes(),
    unknownCount = 0,
    defaultedCount = 0,
    nonDefaultCount = 0;
  for (let line of lines) {
    if (line.unknown) {
      (unknownCount++, (costByAxis.cosmological += UNKNOWN_LINE_COST));
      continue;
    }
    let entry = line.entry;
    ((costByAxis[entry.axis] += entry.weight),
      line.autoFilled &&
        line.slot === void 0 &&
        (defaultedCount++, (costByAxis[entry.axis] += DEFAULTED_SLOT_COST)),
      (entry.category === "stars" && entry.id === "single_sun") ||
        (entry.category === "cycle" && entry.id === "steady_cycle") ||
        nonDefaultCount++);
  }
  for (let contradiction of triggered)
    costByAxis[contradiction.axis ?? "cosmological"] += CONTRADICTION_COST[contradiction.severity];
  let coherent =
    unknownCount === 0 && defaultedCount === 0 && nonDefaultCount === 0 && triggered.length === 0;
  coherent && (costByAxis.cosmological = Math.max(0, costByAxis.cosmological - COHERENCE_BONUS));
  for (let [axis, delta] of Object.entries(matter.costByAxis))
    costByAxis[axis] = Math.max(0, costByAxis[axis] + delta);
  return {
    lines: lines,
    triggered: triggered,
    costByAxis: costByAxis,
    coherenceBonusApplied: coherent,
    matter: matter,
    links: links,
    returnTo: returnTo,
    panel: panel,
    seed: seedLine,
    drawn: drawn,
  };
}

module.exports = { emptyAxes, linkTarget, resolveAge, setDrawSettings, skyEntryById };
