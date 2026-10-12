"use strict";
// La capacité par axe : la cohérence achète de la richesse (claude/DESIGN-capacite-et-coherence.md, lois 5 et 10).
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts"), DS = require("../src/dosage"), RG = require("../src/rigor"), CAP = require("../src/capacity");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const run = (level, lines) => { const src = lines.join("\n"); return AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById, { weights: RG.weightsOf({ rigor: level }), size: DS.worldSize(src) }); };
const set = (...ids) => new Set(ids);

// 1. une loi compte si elle s'applique ET si elle tient
assert.deepStrictEqual(CAP.capacities(set("water", "stone")).caps, {}, "rien d'engagé : capacité de base partout");
assert.strictEqual(CAP.capacityOf({}, "ecological"), 6);
assert.strictEqual(CAP.capacities(set("grazer", "mycelium")).caps.ecological, 10, "boucle fermée (+2) et grand sur du petit (+2)");
assert.strictEqual(CAP.capacities(set("grazer", "water")).caps.ecological, 8, "le petit vient de l'eau : l'échelle tient, la boucle reste ouverte");
assert.strictEqual(CAP.capacities(set("grazer", "water", "mycelium")).caps.ecological, 10);
assert.strictEqual(CAP.capacities(set("flowers", "bee", "mycelium", "water")).caps.ecological, 10, "fleurs + butineur : l’échelle et le butineur tiennent");
assert.ok(!CAP.capacities(set("flowers", "mycelium", "water")).held.some((h) => h.id === "pollinator"), "des fleurs sans butineur : la loi s'applique mais ne tient pas");
assert.strictEqual(CAP.capacities(set("grazer", "hunter", "moth", "water")).caps.ecological, 8, "un rôle d'appoint ne ferme pas la boucle");
// plafond
const all = CAP.capacities(set("flowers", "bee", "grazer", "mycelium", "plankton", "single_sun", "pellet", "fern", "water"), { factor: () => 1 });
assert.ok(all.caps.ecological <= CAP.MAX, "plafond 16");
assert.ok(CAP.capacities(set("pellet", "fern", "mycelium", "water"), { factor: () => 2 }).held.every((h) => h.id !== "pellet"), "trop de granulés : la loi ne tient pas");
// le sol qui porte
assert.strictEqual(CAP.capacities(set("great_tree", "earth", "water")).caps.geological, 8, "le sol porte l'arbre");
assert.strictEqual(CAP.capacities(set("great_tree", "sand")).caps.geological, undefined, "le sable ne porte pas un grand arbre");
assert.strictEqual(CAP.capacities(set("great_tree")).caps.geological, undefined, "pas de sol écrit : la loi ne s'applique pas");
// le temps qui s'enchaîne, le ciel
assert.strictEqual(CAP.capacities(set("rain"), { natural: 1 }).caps.weather, 8);
assert.strictEqual(CAP.capacities(set("rain")).caps.weather, undefined);
assert.strictEqual(CAP.capacities(set(), { sky: { blocks: 3, clashes: 0 } }).caps.cosmological, 8);
assert.strictEqual(CAP.capacities(set(), { sky: { blocks: 3, clashes: 1 } }).caps.cosmological, undefined, "un ciel qui se contredit n'achète rien");
assert.strictEqual(CAP.capacities(set(), { sky: { blocks: 1, clashes: 0 } }).caps.cosmological, undefined, "un seul bloc de ciel : rien à accorder");

// 2. le budget suit la capacité
assert.strictEqual(DS.richnessCost(10, 10), 0);
assert.ok(DS.richnessCost(10, 6) > DS.richnessCost(10, 8) && DS.richnessCost(10, 8) > 0, "plus de capacité, moins de coût");
assert.strictEqual(DS.richnessCost(8), DS.richnessCost(8, DS.CAPACITY), "sans capacité donnée : la base");

// 3. sur le vrai moteur : un monde riche et cohérent n'est plus puni
const rich = ["single_sun", "steady_cycle", "companion_moon", "water", "stone", "earth", "rain", "wind", "fog", "fern", "vine", "great_tree", "flowers", "bee", "grazer", "hunter", "mycelium", "moth", "plankton", "tablet", "bridge"];
const g = run("gentle", rich), b = run("balanced", rich), s = run("strict", rich), x = run("extreme", rich);
assert.ok(g.verdict === "stable" && b.stability === g.stability && s.stability === g.stability && x.stability === g.stability, "riche et cohérent : même stabilité à toutes les rigueurs");
assert.ok(!b.dosage || !b.dosage.richness.ecological, "la charge tient dans la capacité achetée");
assert.ok(b.dosage.capacity.caps.ecological >= 10, "la capacité écologique a été achetée par les lois");
// en doux, le budget ne coûte rien : le doux ne bouge pas
const gOld = run("gentle", rich.filter((id) => id !== "mycelium"));
assert.ok(!gOld.dosage || !gOld.dosage.richness.ecological, "doux : jamais de coût de richesse");

// 4. retirer ce qui fait tenir une loi fait retomber la capacité : le test par retrait le voit sans règle de plus
const heavy = [...rich, "berry_shrub", "thorn_bush", "heath_shrub", "raptor", "cave_stalker"];
const withLoop = run("strict", heavy), noLoop = run("strict", heavy.filter((id) => id !== "mycelium"));
assert.ok(noLoop.stability < withLoop.stability, "sans le mycélium, la boucle s'ouvre : la capacité retombe et l'Âge perd des points");
const capOf = (r) => (r.dosage && r.dosage.capacity && r.dosage.capacity.caps.ecological) || 6;
assert.ok(capOf(noLoop) < capOf(withLoop), "la capacité écologique baisse avec la loi");
// un monde pauvre ne gagne rien
const poor = run("strict", ["single_sun", "water", "fern", "grazer", "mycelium", "stone"]);
assert.ok(!poor.dosage || !poor.dosage.richness.ecological, "monde modeste : pas de coût");
// un monde très riche reste puni (loi 10, Mesure)
const huge = run("strict", [...heavy, "shoal", "deep_hunter", "carrion_beetle", "coral", "kelp", "grass", "berry_shrub", "microbial_mat", "glow_algae", "moss", "lichen", "grove", "ironwood", "seed", "sapling", "drifter", "burrower", "herd", "spiders"]);
assert.ok(huge.stability < 75, "beaucoup de tout reste impossible (loi 10, Mesure)");

console.log("capacity.test.js ok");
// le ciel écrit compte ses lignes (étoiles, cycle, lune) : trois lignes accordées achètent de la capacité
{
  const a = analyseAgeBase(["single_sun", "steady_cycle", "companion_moon", "stone"].join("\n"), { seed: "S" });
  const caps = DS.dosage(a, () => 1, (id) => reg.blockById.get(id), { weight: 1 }).capacity.caps;
  assert.strictEqual(caps.cosmological, 8, "un ciel écrit qui s'accorde : +2");
}
console.log("capacity.test.js ok (ciel)");
