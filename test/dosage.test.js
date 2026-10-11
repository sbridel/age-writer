"use strict";
// Le dosage selon les lois (claude/LOIS-DE-L-ECRITURE-DNI.md, lois 4 à 6 ; claude/RIGUEUR-ET-STATUT-D-ECRIVAIN.md) :
// l'étendue (dose × taille du monde × biomes) adoucit ou aggrave les contradictions, le temps qui s'enchaîne n'est plus puni,
// la richesse a un budget par axe. Selon la rigueur : en doux, jamais un Âge moins stable ; en équilibré, la moitié ; en strict, plein.
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
const RG = require("../src/rigor");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const run = (level, ...lines) => { const src = lines.join("\n"); return AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById, { weights: RG.weightsOf({ rigor: level }), size: DS.worldSize(src) }); };
const base = (...lines) => analyseAgeBase(lines.join("\n"), { seed: "S" });
const gentle = (...l) => run("gentle", ...l), balanced = (...l) => run("balanced", ...l), strict = (...l) => run("strict", ...l);

// 1. la dose adoucit les contradictions (peu = 0,4) ; en doux elle n'aggrave jamais
const dw = gentle("desert_world", "water"), dwFew = gentle("desert_world", "water", "few: water"), dwMany = gentle("desert_world", "water", "many: water");
assert.ok(dw.stability < 75, "désert + eau normale : instable");
assert.ok(dwFew.stability >= 75, "désert + peu d'eau (une mare) : stable");
assert.strictEqual(dwMany.stability, dw.stability, "doux : beaucoup d'eau n'aggrave pas le clash");
assert.ok(balanced("desert_world", "water", "many: water").stability < dw.stability, "équilibré : beaucoup d'eau est pire que l'eau normale");
assert.ok(strict("desert_world", "water", "many: water").stability < balanced("desert_world", "water", "many: water").stability, "strict : plus que la moitié");
const dr = gentle("desert_world", "rain"), drFew = gentle("desert_world", "rain", "few: rain");
assert.ok(drFew.stability > dr.stability && drFew.stability < 75, "un peu de pluie clashe encore dans un désert");
const lw = gentle("lava_world", "water"), lwFew = gentle("lava_world", "water", "few: water");
assert.ok(lwFew.stability >= lw.stability, "un monde de lave encaisse un peu d'eau");
// la syntaxe « bloc : quantité »
assert.strictEqual(gentle("desert_world", "water", "water: few").stability, dwFew.stability, "`water: few` = `few: water`");
assert.deepStrictEqual(AM.parseAmounts("rain, fog: many\nwater: peu"), { rain: 2, fog: 2, water: 0.4 }, "plusieurs blocs, français");
assert.ok(AM.AMOUNT_RE.test("water: few") && AM.AMOUNT_RE.test("few: water") && !AM.AMOUNT_RE.test("rain: sometimes, dawn") && !AM.AMOUNT_RE.test("seed: 12"), "AMOUNT_RE : les deux ordres, pas les autres lignes");
// les règles de fissure et du ciel seul ne sont pas dosées
assert.strictEqual(gentle("fissure", "few: fissure").stability, base("fissure").stability, "une quantité ne change pas la règle de fissure");

// 2. la taille du monde et les biomes (étendue)
assert.strictEqual(DS.worldSize("desert_world\nsize: large"), "large");
assert.strictEqual(DS.worldSize("desert_world"), "medium", "taille moyenne par défaut");
assert.ok(DS.WORLD_SIZE_RE.test("size: small") && !DS.WORLD_SIZE_RE.test("window_size: large") && !DS.WORLD_SIZE_RE.test("size: huge"), "la ligne `size`, pas `window_size`");
assert.ok(gentle("desert_world", "water", "size: small").stability > dw.stability, "un petit monde adoucit le clash, même en doux");
assert.strictEqual(gentle("desert_world", "water", "size: large").stability, dw.stability, "doux : un grand monde n'aggrave pas");
assert.ok(balanced("desert_world", "water", "size: large").stability < dw.stability, "équilibré : un grand monde aggrave le clash");
assert.ok(strict("desert_world", "water", "size: large").stability < balanced("desert_world", "water", "size: large").stability, "strict : plein coût");
assert.ok(Math.abs(DS.extent(0.4, "medium", 1) - 0.4) < 1e-9 && Math.abs(DS.extent(1, "large", 1) - 1.5) < 1e-9 && Math.abs(DS.extent(1, "small", 1) - 0.6) < 1e-9, "dose × taille");
assert.ok(Math.abs(DS.biomeFactor(1) - 1) < 1e-9 && Math.abs(DS.biomeFactor(4) - 1.45) < 1e-9, "+15 % par biome au-delà du premier (quatre biomes : ×1,45)");
assert.strictEqual(DS.biomeCount(["sand", "water", "lava", "great_tree", "stone"]), 5, "cinq familles de sol, cinq biomes");
assert.strictEqual(DS.biomeCount(["sand", "desert_world"]), 1, "deux blocs de la même famille : un seul biome");
assert.strictEqual(DS.biomeCount([]), 1, "au moins un biome");

// 3. le temps qui s'enchaîne : un allègement, il compte dans tous les modes
for (const f of [gentle, balanced, strict]) {
  const storm = f("rain", "wind", "lightning");
  assert.ok(storm.stability >= 75 && base("rain", "wind", "lightning").stability < 75, "pluie + vent + éclair : stable avec le dosage, instable avec le moteur seul");
  assert.ok(storm.dosage && storm.dosage.natural.some((x) => x.id === "storm") && storm.dosage.natural.some((x) => x.id === "thunderstorm"), "le panneau sait ce qui est devenu naturel");
}
assert.ok(gentle("water", "iron").stability >= base("water", "iron").stability, "la rouille coûte moins");
assert.ok(!((gentle("lightning", "great_tree").dosage || { natural: [] }).natural.some((x) => x.id === "wildfire")), "l'incendie reste une vraie destruction");
assert.ok(!((gentle("rain", "lava").dosage || { natural: [] }).natural.some((x) => x.id === "steam")), "la vapeur de lave reste coûteuse");

// 4. le budget de richesse : pente douce, une pénalité (nulle en doux)
assert.strictEqual(DS.richnessCost(DS.CAPACITY), 0, "pas de coût jusqu'à la capacité");
const c1 = DS.richnessCost(DS.CAPACITY + 1), c2 = DS.richnessCost(DS.CAPACITY + 2), c4 = DS.richnessCost(DS.CAPACITY + 4);
assert.ok(c1 > 0 && c2 - c1 > c1 && c4 > c2, "le coût croît de plus en plus vite : une pente, pas un mur");
assert.ok(c1 < 0.05, "un seul élément au-dessus de la capacité reste léger");
const geo = ["stone", "sand", "salt", "ash", "iron", "crystal", "gold", "silver", "gems"];
assert.ok(!gentle(...geo).dosage || !gentle(...geo).dosage.richness.geological, "doux : la richesse ne coûte rien de plus");
const rich = strict(...geo), richBal = balanced(...geo);
assert.ok(rich.dosage && rich.dosage.richness.geological && rich.dosage.richness.geological.extra > 0, "neuf blocs de géologie : au-delà du budget en strict");
assert.ok(richBal.stability > rich.stability, "équilibré : la moitié du coût de richesse");
assert.ok(!strict(...geo.slice(0, 6)).dosage || !strict(...geo.slice(0, 6)).dosage.richness.geological, "six blocs : dans le budget");

// 5. doux : le dosage ne rend jamais un Âge moins stable que le moteur seul
{
  let s = 7, rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const ids = [...reg.writableIds].filter((i) => !/fissure|damaged|trap|mechanism/.test(i));
  for (let i = 0; i < 400; i++) {
    const n = 2 + Math.floor(rnd() * 9), lines = []; for (let k = 0; k < n; k++) lines.push(ids[Math.floor(rnd() * ids.length)]);
    if (rnd() < 0.4) lines.push(["few", "many"][Math.floor(rnd() * 2)] + ": " + lines[Math.floor(rnd() * lines.length)]);
    if (rnd() < 0.3) lines.push("size: " + ["small", "large"][Math.floor(rnd() * 2)]);
    const src = lines.join("\n"), b = analyseAgeBase(src, { seed: "S" }), g = run("gentle", ...lines);
    // la quantité scalait déjà le poids du bloc avant le dosage (positive ou non) : on compare au même Âge sans le dosage
    const noDose = AM.applyAmounts(b, AM.parseAmounts(src), reg.blockById, { weights: { extent: 0 }, size: "medium" });
    assert.ok(g.stability >= noDose.stability, "doux : jamais moins stable sans le dosage — " + lines.join(" | ") + " (" + g.stability + " < " + noDose.stability + ")");
  }
}

// la ligne du panneau
assert.ok(/Dosage/.test(DS.note(dwFew.dosage, false)) && /étendue/.test(DS.note(dwFew.dosage, true)), "la ligne du panneau, en deux langues");
assert.strictEqual(DS.note(null, true), "", "rien à dire sans dosage");
assert.ok(!gentle("stone").dosage, "un Âge sans dosage n'a pas de ligne");
console.log("dosage.test.js : tout passe");
