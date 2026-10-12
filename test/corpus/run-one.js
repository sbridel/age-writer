"use strict";
// Évalue un Âge du corpus à un niveau de rigueur : verdict, profondeur, cicatrices, axe le plus faible. Jamais le pourcentage.
const { hooks } = require("../../src/engine/hooks");
const { analyseAgeBase } = require("../../src/engine/analysis");
const reg = require("../../src/engine/registry");
const AM = require("../../src/amounts"), DS = require("../../src/dosage"), RG = require("../../src/rigor"), DEPTH = require("../../src/depth");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const verdictOf = (s) => (s >= 75 ? "stable" : s >= 40 ? "unstable" : "dying");
function evaluate(age, rigor) {
  const src = age.lines.join("\n"), weights = RG.weightsOf({ rigor });
  const run = (text, draw) => AM.applyAmounts(analyseAgeBase(text, { seed: age.seed, draw }), AM.parseAmounts(text), reg.blockById, { weights });
  const r = run(src, true);
  const axes = r.axisStability || {}, weakest = Object.keys(axes).sort((a, b) => (axes[a] - axes[b]) || a.localeCompare(b))[0] || null;
  const d = DEPTH.depthOf(src, (t) => run(t, false), (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l));
  return {
    verdict: verdictOf(r.stability),
    depth: d ? d.state : null,
    scars: ((r.scars) || (r.resolved && r.resolved.scars) || []).map((s) => `${s.id}:${s.level}`).sort(),
    weakest: verdictOf(r.stability) === "stable" ? null : weakest,
  };
}
module.exports = { evaluate, verdictOf };
