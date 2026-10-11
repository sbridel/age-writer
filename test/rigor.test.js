"use strict";
// Les niveaux de rigueur (claude/RIGUEUR-ET-STATUT-D-ECRIVAIN.md) : poids des familles de lois, selon le niveau et les familles cochées.
const assert = require("assert");
const RG = require("../src/rigor");

assert.deepStrictEqual(RG.LEVELS, ["gentle", "balanced", "strict", "extreme"], "quatre niveaux");
assert.deepStrictEqual(RG.FAMILIES, ["physics", "soil", "life", "extent", "balance"], "cinq familles");
assert.strictEqual(RG.levelOf({}), "gentle", "doux par défaut");
assert.strictEqual(RG.levelOf({ rigor: "nope" }), "gentle", "un niveau inconnu retombe sur doux");
assert.strictEqual(RG.levelOf({ rigor: "strict" }), "strict");
assert.deepStrictEqual(RG.familiesOf({}), RG.FAMILIES, "toutes cochées par défaut");
assert.deepStrictEqual(RG.familiesOf({ rigorFamilies: ["life", "bogus", "soil"] }), ["life", "soil"], "familles inconnues ignorées");

const all = (w) => RG.FAMILIES.every((f) => w[f] === w.physics);
const g = RG.weightsOf({ rigor: "gentle" }), b = RG.weightsOf({ rigor: "balanced" }), x = RG.weightsOf({ rigor: "extreme", rigorFamilies: [] });
assert.ok(all(g) && g.physics === 0, "doux : rien ne compte");
assert.ok(all(b) && b.physics === 0.5, "équilibré : la moitié, partout");
assert.ok(all(x) && x.physics === 1, "extrême : plein coût partout, quelles que soient les cases");
const s = RG.weightsOf({ rigor: "strict", rigorFamilies: ["physics", "extent"] });
assert.deepStrictEqual(s, { physics: 1, soil: 0.5, life: 0.5, extent: 1, balance: 0.5 }, "strict : plein sur les familles cochées, la moitié sur les autres");
assert.deepStrictEqual(RG.weightsOf({ rigor: "strict" }), { physics: 1, soil: 1, life: 1, extent: 1, balance: 1 }, "strict sans choix : tout est coché");

// le palier « Maître » : strict avec au moins trois familles sur cinq
assert.strictEqual(RG.TITLE_MIN_FAMILIES, 3);
assert.ok(RG.countsForStrictTitle({ rigor: "strict", rigorFamilies: ["physics", "life", "extent"] }), "trois familles : compte");
assert.ok(!RG.countsForStrictTitle({ rigor: "strict", rigorFamilies: ["physics", "life"] }), "deux familles : ne compte pas");
assert.ok(!RG.countsForStrictTitle({ rigor: "balanced" }) && !RG.countsForStrictTitle({ rigor: "extreme" }), "seul le strict est jugé par les familles");
console.log("rigor.test.js : tout passe");
