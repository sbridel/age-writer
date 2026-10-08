"use strict";
// 1.15.3 : les tensions des mondes-types sur le temps qu'il fait comptent (axe "weather", et non "meteorological"
// que le moteur ne connaissait pas), et TOUTES les règles ciel ↔ matière comptent, pas une seule par phrase.
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { drawOpenSlots } = require("../src/engine/draw");
const { SKY_RULES } = require("../src/sky");
const A = (src) => analyseAgeBase(src, { seed: "Clash", draw: false });

assert.ok(SKY_RULES.every((r) => ["cosmological", "geological", "weather", "ecological", "metaphysical"].includes(r.axis)), "toutes les règles du ciel sur un axe connu");
const base = A("desert_world"), rain = A("desert_world\nrain");
assert.ok(rain.axisStability.weather < 100 && Number.isFinite(rain.resolved.costByAxis.weather) && !("meteorological" in rain.resolved.costByAxis), "désert + pluie coûte sur la météo");
assert.ok(rain.stability < base.stability, "désert + pluie : moins stable que le désert seul");
assert.ok(A("frozen_world\nheat").axisStability.weather < 100, "monde gelé + chaleur coûte");
const two = A("desert_world\nrain\nfog"), one = A("desert_world\nrain");
assert.ok(two.resolved.triggered.length === 2 && two.axisStability.weather < one.axisStability.weather, "pluie ET brouillard dans un désert : deux pénalités");
const dark = A("starless\nfern\nseed\ngreat_tree");
assert.strictEqual(dark.resolved.triggered.length, 3, "sans étoile, chaque plante verte compte");
// la description ne répète pas une phrase de la même famille pour deux règles qui la partagent
const { describeAge } = require("../src/engine/prose");
const { NOTES } = require("../src/sky");
const desertNotes = NOTES.desert_world.map((n) => n.toLowerCase());
for (let i = 0; i < 20; i++) {
  const text = describeAge(two.resolved).toLowerCase();
  assert.strictEqual(desertNotes.filter((n) => text.includes(n)).length, 1, "une seule phrase du désert, pas deux");
}
// le tirage des pages ne change pas : il garde l'ancien décompte (une règle par phrase)
const picks = (written) => JSON.stringify(drawOpenSlots({ written: new Set(written), seed: "S", pull: 6 }));
assert.strictEqual(picks(["starless", "fern"]), picks(["starless", "fern"]), "tirage déterministe");
console.log("world-clash.test.js : tout passe");
