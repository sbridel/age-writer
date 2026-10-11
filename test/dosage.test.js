"use strict";
// Le dosage (claude/DESIGN-dosage-et-stabilite.md) : la dose adoucit les contradictions de son bloc selon sa portée, le temps qui s'enchaîne
// n'est plus puni, la richesse a un budget par axe (pente douce).
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
hooks.skip = (l) => AM.AMOUNT_RE.test(l);
const run = (...lines) => { const src = lines.join("\n"); return AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById); };
const base = (...lines) => analyseAgeBase(lines.join("\n"), { seed: "S" });

// 1. la dose adoucit les contradictions ; l'eau (locale) plus que la pluie (globale)
const dw = run("desert_world", "water"), dwFew = run("desert_world", "water", "few: water"), dwMany = run("desert_world", "water", "many: water");
assert.ok(dw.stability < 75, "désert + eau normale : instable");
assert.ok(dwFew.stability >= 75, "désert + peu d'eau (une mare) : stable");
assert.ok(dwMany.stability < dw.stability, "désert + beaucoup d'eau : pire que l'eau normale");
const dr = run("desert_world", "rain"), drFew = run("desert_world", "rain", "few: rain");
assert.ok(drFew.stability > dr.stability && drFew.stability < 75, "un peu de pluie clashe encore dans un désert (portée globale)");
assert.ok(dwFew.stability > drFew.stability, "peu d'eau passe mieux que peu de pluie");
const lw = run("lava_world", "water"), lwFew = run("lava_world", "water", "few: water");
assert.ok(lwFew.stability >= lw.stability, "un monde de lave encaisse un peu d'eau");
// la syntaxe « bloc : quantité »
assert.strictEqual(run("desert_world", "water", "water: few").stability, dwFew.stability, "`water: few` = `few: water`");
assert.deepStrictEqual(AM.parseAmounts("rain, fog: many\nwater: peu"), { rain: 2, fog: 2, water: 0.4 }, "plusieurs blocs, français");
assert.ok(AM.AMOUNT_RE.test("water: few") && AM.AMOUNT_RE.test("few: water") && !AM.AMOUNT_RE.test("rain: sometimes, dawn") && !AM.AMOUNT_RE.test("seed: 12"), "AMOUNT_RE : les deux ordres, pas les autres lignes");
// les règles de fissure et du ciel seul ne sont pas dosées
const fis = run("fissure", "few: fissure");
assert.strictEqual(fis.stability, base("fissure").stability, "une quantité ne change pas la règle de fissure");

// 2. le temps qui s'enchaîne
const storm = run("rain", "wind", "lightning");
assert.ok(storm.stability >= 75 && base("rain", "wind", "lightning").stability < 75, "pluie + vent + éclair : stable avec le dosage, instable avec le moteur seul");
assert.ok(storm.dosage && storm.dosage.natural.some((x) => x.id === "storm") && storm.dosage.natural.some((x) => x.id === "thunderstorm"), "le panneau sait ce qui est devenu naturel");
assert.ok(run("water", "iron").stability >= base("water", "iron").stability, "la rouille coûte moins");
assert.ok(!((run("lightning", "great_tree").dosage || { natural: [] }).natural.some((x) => x.id === "wildfire")), "l'incendie reste une vraie destruction");
assert.ok(!((run("rain", "lava").dosage || { natural: [] }).natural.some((x) => x.id === "steam")), "la vapeur de lave reste coûteuse");

// 3. le budget de richesse : pente douce
assert.strictEqual(DS.richnessCost(DS.CAPACITY), 0, "pas de coût jusqu'à la capacité");
const c1 = DS.richnessCost(DS.CAPACITY + 1), c2 = DS.richnessCost(DS.CAPACITY + 2), c4 = DS.richnessCost(DS.CAPACITY + 4);
assert.ok(c1 > 0 && c2 - c1 > c1 && c4 > c2, "le coût croît de plus en plus vite : une pente, pas un mur");
assert.ok(c1 < 0.05, "un seul élément au-dessus de la capacité reste léger");
const geo = ["stone", "sand", "salt", "ash", "iron", "crystal", "gold", "silver", "gems"];
const rich = run(...geo), richMany = run(...geo, "many: " + geo.join(", "));
assert.ok(rich.dosage && rich.dosage.richness.geological && rich.dosage.richness.geological.extra > 0, "neuf blocs de géologie : au-delà du budget");
assert.ok(richMany.stability < rich.stability, "beaucoup de tout est pire");
const few6 = run(...geo.slice(0, 6));
assert.ok(!few6.dosage || !few6.dosage.richness.geological, "six blocs : dans le budget");

// facteurs de dose
assert.strictEqual(DS.doseFactor(1, true), 1);
assert.ok(Math.abs(DS.doseFactor(0.4, false) - 0.3) < 1e-9 && Math.abs(DS.doseFactor(0.4, true) - 0.6) < 1e-9, "peu : 0,3 local, 0,6 global");
assert.ok(Math.abs(DS.doseFactor(2, false) - 1.5) < 1e-9 && DS.doseFactor(2, true) === 2, "beaucoup : 1,5 local, 2 global");

// la ligne du panneau
assert.ok(/Dosage/.test(DS.note(dwFew.dosage, false)) && /dosé/.test(DS.note(dwFew.dosage, true)), "la ligne du panneau, en deux langues");
assert.strictEqual(DS.note(null, true), "", "rien à dire sans dosage");
assert.ok(!run("stone").dosage, "un Âge sans dosage n'a pas de ligne");
console.log("dosage.test.js : tout passe");
