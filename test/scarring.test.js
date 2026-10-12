"use strict";
// Le tiré et les cicatrices (claude/DESIGN-capacite-et-coherence.md, chantier 2).
const assert = require("assert");
const SC = require("../src/scarring");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase, pageList } = require("../src/engine/analysis");
const { describeAge } = require("../src/engine/prose");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts"), DS = require("../src/dosage"), RG = require("../src/rigor"), G = require("../src/genscene");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const COST = { light: 0.1, medium: 0.2, strong: 0.35 };
const res = (triggered, drawn) => ({ triggered, drawn: drawn.map((id) => ({ id })) });

// 1. règles pures
assert.strictEqual(SC.scarring(res([{ a: "x", b: "y", severity: "strong", axis: "geological" }], []), COST), null, "rien de tiré : rien ne change");
assert.strictEqual(SC.scarring(res([{ a: "x", b: "y", severity: "strong", axis: "geological" }], ["z"]), COST), null, "un clash entre pages écrites reste entier");
const light = SC.scarring(res([{ a: "desert_world", b: "fog", severity: "light", axis: "weather" }], ["fog"]), COST);
assert.ok(Math.abs(light.delta.weather + 0.1) < 1e-9 && !light.scars.length && light.forgiven.length === 1, "léger clash tiré : gratuit, sans cicatrice");
const med = SC.scarring(res([{ a: "desert_world", b: "rain", severity: "medium", axis: "weather" }], ["rain"]), COST);
assert.deepStrictEqual(med.scars.map((s) => [s.id, s.level]), [["held_rain", "light"]], "clash moyen : cicatrice légère, celle de l'axe");
assert.ok(Math.abs(med.delta.weather - (-0.2 + SC.TAX.light)) < 1e-9, "elle coûte un peu, au lieu du clash");
const strong = SC.scarring(res([{ a: "lava", b: "water", severity: "strong", axis: "geological" }], ["water"]), COST);
assert.deepStrictEqual(strong.scars.map((s) => [s.id, s.level]), [["scorched_surface", "normal"]], "clash fort par le feu : sol calciné, normal");
const deep = SC.scarring(res([{ a: "lava", b: "water", severity: "strong", axis: "geological" }, { a: "acid", b: "stone", severity: "strong", axis: "geological" }], ["water", "stone"]), COST);
assert.strictEqual(deep.scars[0].level, "deep", "deux clashs forts sur le même axe : profonde");
assert.ok(-deep.delta.geological > 0.45, "le bilan : bien moins cher que les deux clashs");
assert.strictEqual(SC.scarFor("metaphysical", { a: "a", b: "b" }), "mute_ruins");
assert.strictEqual(SC.scarFor("cosmological", { a: "a", b: "b" }), "ashen_sky");
assert.ok(SC.TAX.light < COST.medium && SC.TAX.normal < COST.strong, "une cicatrice coûte toujours moins que son clash");
assert.ok(SC.RELIEF.light < SC.RELIEF.normal && SC.RELIEF.normal < SC.RELIEF.deep && SC.RELIEF.deep <= 1.25, "allègement 0,8 / 1 / 1,25");

// 2. sur le vrai moteur : un désert où le tirage apporte du froid et de la brume
const run = (src, level) => AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById, { weights: RG.weightsOf({ rigor: level || "gentle" }) });
const base = analyseAgeBase("desert_world\nrain", { seed: "S" }), r = run("desert_world\nrain");
assert.ok(base.resolved.drawn.some((p) => p.id === "fog"), "(le tirage apporte de la brume)");
assert.ok(r.stability > base.stability, "les légers clashs tirés ne coûtent plus");
assert.ok(r.forgiven && r.forgiven.some((f) => f.b === "fog"), "le pardon est exposé");
assert.ok(run("desert_world\nrain").stability < run("desert_world").stability, "la pluie écrite clashe toujours : c'est le choix de l'écrivain");

// 3. une cicatrice gardée : dans le livre, la description et la fenêtre
const fake = { ...base, resolved: { ...base.resolved, scars: [{ id: "held_rain", axis: "weather", level: "deep", from: [] }] } };
const pages = pageList(fake);
assert.ok(pages.some((p) => p.id === "held_rain" && p.born && !p.written && p.scar === "deep"), "le livre : une page née, jamais écrite");
assert.ok(/hold their rain/.test(describeAge(fake.resolved, { seed: "S" }) || describeAge(fake, { seed: "S" }) || ""), "la description dit la cicatrice");
const S = G.sceneOf(fake, "Q");
assert.ok(S.scars.includes("held_rain") && S.scarLevel.held_rain === "deep", "la fenêtre la connaît, avec son intensité");
// l'allègement suit l'intensité, dans la limite des 75 %
const W = require("../src/wealth");
assert.ok(W.SCAR_IDS.includes("held_rain") && W.SCAR_IDS.includes("mute_ruins"), "une cicatrice pour la météo et une pour les ruines");

console.log("scarring.test.js ok");
// un clash tiré n'est pas dosé une seconde fois (la quantité ne le change plus : c'est la cicatrice qui parle)
{
  const fakeDraw = (src) => { const b = analyseAgeBase(src, { seed: "S" }); return b; };
  const DSx = require("../src/dosage");
  const a = fakeDraw("desert_world\nrain");
  const d = DSx.dosage(a, (id) => (id === "fog" ? 0.4 : 1), (id) => reg.blockById.get(id), { weight: 1 });
  assert.ok(!d.softened.some((x) => x.b === "fog" || x.b === "deep_cold"), "le dosage ignore les clashs tirés");
}
console.log("scarring.test.js ok (dosage)");
