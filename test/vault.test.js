"use strict";
// La caverne et sa voûte (claude/DESIGN-voute-de-la-caverne.md) : une seule notion, solidité × taille ; le ciel ouvert n'entre jamais.
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
const RG = require("../src/rigor");
const V = require("../src/vault");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const run = (level, ...lines) => { const src = lines.join("\n"); return AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById, { weights: RG.weightsOf({ rigor: level }), size: DS.worldSize(src) }); };

// la solidité vient du sol écrit, la part qui passe de la solidité et de la taille
const set = (...i) => new Set(i);
assert.strictEqual(V.vaultOf(set("stone"), "medium"), null, "sans caverne, pas de voûte");
assert.strictEqual(V.vaultOf(set("cavern_world", "stone"), "small").strength, "strong");
assert.strictEqual(V.vaultOf(set("cavern_world", "sand", "stone"), "small").strength, "strong", "le sol le plus solide porte la voûte");
assert.strictEqual(V.vaultOf(set("cavern_world", "sand", "ash"), "medium").strength, "weak");
assert.strictEqual(V.vaultOf(set("cavern_world"), "medium").strength, "medium", "rien d'écrit au sol : voûte moyenne");
const lets = (s, z) => V.vaultOf(set("cavern_world", ...s), z).lets;
assert.ok(lets(["stone"], "small") < lets(["stone"], "medium") && lets(["stone"], "medium") < lets(["stone"], "large"), "plus le monde est grand, plus il en passe");
assert.ok(lets(["stone"], "large") < lets([], "large") && lets([], "large") < lets(["sand"], "large"), "plus la voûte est faible, plus il en passe");
assert.strictEqual(V.attenuation(V.vaultOf(set("cavern_world", "stone"), "small"), "rain"), 1, "le ciel ouvert n'est pas atténué");
assert.ok(V.tired(V.vaultOf(set("cavern_world", "sand"), "large")) && !V.tired(V.vaultOf(set("cavern_world", "sand"), "medium")) && !V.tired(V.vaultOf(set("cavern_world", "stone"), "large")), "seule une voûte faible et vaste fatigue");

// la pluie, l'éclair et le vent : contradictions fortes, à tous les niveaux
for (const w of ["rain", "lightning", "wind"]) {
  assert.ok(run("gentle", "starless", "cavern_world", "stone").stability >= 75 && run("gentle", "starless", "cavern_world", "stone", w).stability < 75, w + " sous la voûte : tension forte, l'Âge tombe");
}
// le froid passe en partie : une roche épaisse coûte moins qu'un sol meuble, et un petit monde moins qu'un grand, même en doux
const cold = (soil, size) => run("gentle", "starless", "cavern_world", soil, "deep_cold", "size: " + size).axisStability.weather;
assert.ok(cold("stone", "medium") > cold("sand", "medium"), "roche épaisse : moins de froid qu'un sol meuble");
assert.ok(cold("stone", "small") > cold("stone", "large"), "petit monde : moins de froid que grand");
// en doux, la voûte ne coûte jamais plus que sans elle : la fatigue seulement dite
const tiredSrc = ["starless", "cavern_world", "sand", "size: large"];
assert.ok(run("gentle", ...tiredSrc).stability >= run("gentle", "starless", "cavern_world", "sand").stability - 1, "doux : la fatigue ne coûte rien");
assert.ok(/fatigue|tired/.test(JSON.stringify(run("gentle", ...tiredSrc).life)), "dite en doux");
const geo = (lvl, ...l) => run(lvl, ...l).axisStability.geological;
assert.ok(geo("strict", ...tiredSrc) < geo("strict", "starless", "cavern_world", "sand"), "strict : la voûte fatiguée coûte");
assert.ok(geo("balanced", ...tiredSrc) >= geo("strict", ...tiredSrc) && geo("balanced", ...tiredSrc) < geo("gentle", ...tiredSrc), "équilibré : la moitié");
// la caverne se reconnaît, et une seule monde-type à la fois
assert.ok(!analyseAgeBase("cavern_world", { seed: "S" }).resolved.lines.some((l) => l.unknown), "cavern_world est reconnu");
assert.ok(analyseAgeBase("cavern_world\nfrozen_world", { seed: "S" }).stability < analyseAgeBase("cavern_world", { seed: "S" }).stability, "deux mondes se contredisent");
console.log("vault.test.js : tout passe");
