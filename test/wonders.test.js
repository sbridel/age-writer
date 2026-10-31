"use strict";
// Le catalogue des merveilles (src/wonders.js) : chaque paire du catalogue fait naître son composite ; aucun composite ne
// s'écrit ; une union fait apparaître le composite dans l'analyse et la description ; sans union, rien ne change ; la
// fenêtre dessine chaque merveille sans planter, et un Âge sans merveille garde exactement son image.
const assert = require("assert");
const CAT = require("../src/wonders");
const MUT = require("../src/mutation");
const { blockById } = require("../src/engine/registry");
const { analyseAgeBase } = require("../src/engine/analysis");
const G = require("../src/genscene");
const MEM = require("../src/relto-memories");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const PAIRS = [["water", "lava", "breathing_mirrors"], ["heavy_world", "light_world", "visiting_weight"], ["wind", "sand", "wind_learned"], ["drizzle", "acid", "reading_rain"],
  ["cavern_world", "ocean_world", "ceiling_sea"], ["jungle_world", "desert_world", "ringed_ground"], ["great_tree", "lava", "drinking_roots"], ["gold", "fern", "drinking_roots"],
  ["frozen_world", "flowers", "blooming_ice"], ["bridge", "rust", "rust_held_bridge"], ["grazer", "lava_world", "many_one"], ["cavern_world", "thunderstorm", "early_echo"],
  ["ancient_world", "young_world", "unfinished_horizon"], ["moth", "heat", "fit_through_moths"], ["auroras", "ash_cloud", "day_aurora"], ["black_sun", "red_sun", "orphan_colour"], ["flowers", "blight", "mosaic"]];
for (const [a, b, id] of PAIRS) { ok(CAT.compositeOf({ a, b }) === id && CAT.compositeOf({ a: b, b: a }) === id, `${a} + ${b} → ${id}`); }
ok(CAT.compositeOf({ a: "rain", b: "wind" }) === null, "une paire hors catalogue ne fait rien naître");
for (const c of CAT.COMPOSITES) { const b = blockById.get(c.id); ok(b && b.writable === false && b.weight === 0 && b.descriptors.length === 3, `${c.id} : non écrivable, trois mots`); ok(c.en && c.fr, `${c.id} : un nom en anglais et en français`); }
ok(CAT.COMPOSITES.length === 19, "19 composites (la revue du 22 oct., et l'eau suspendue de la 2.5)");
// la face écrite : la Brume vivante se lit dans les réactions
{ const r = analyseAgeBase("single_sun\nfog\nspore", { seed: "Brume", draw: false }); ok((r.resolved.matter.reactions || []).some((x) => x.result === "living_mist"), "brume + spores → la Brume vivante (face écrite)"); ok(CAT.wondersOf(r).includes("living_mist"), "la Brume vivante est une merveille vue"); }
// une union du catalogue : le composite apparaît dans l'analyse et la description
{ const r = analyseAgeBase("single_sun\nwater\nlava", { seed: "Miroirs", draw: false }), a = {}; MUT.stateOf(a).force = true;
  const s = MUT.tick(a, r, "Miroirs", Date.UTC(2026, 9, 22)); ok(s && CAT.compositeOf(s) === "breathing_mirrors", "l'essai noue eau + lave");
  const h = MUT.applySymbioses(r, a, Date.UTC(2026, 9, 23)); ok(h.composites && h.composites[0].id === "breathing_mirrors" && h.resolved.wonders.includes("breathing_mirrors"), "les Miroirs qui respirent sont là, et la description les dit");
  const without = analyseAgeBase("single_sun\nwater", { seed: "Miroirs", draw: false }), f = MUT.applySymbioses(without, a, Date.UTC(2026, 9, 23));
  ok(!f.composites && !(f.resolved && f.resolved.wonders), "sans la lave, l'union tombe et le composite s'en va"); }
// sans union : l'analyse est rendue telle quelle (rien n'est ajouté)
{ const r = analyseAgeBase("single_sun\nwater\nlava", { seed: "Rien", draw: false }); ok(MUT.applySymbioses(r, {}, 0) === r && !r.composites, "sans union, pas de composite"); }
// la fenêtre : chaque merveille se dessine ; un Âge sans merveille n'a pas de géométrie de merveille
const base = { verdict: "unstable", unrest: 0.3, suns: 1, skyStated: true, cycle: "steady", ruins: ["bridge"], extras: [], sunHues: [], riches: [], scars: [], trees: 3, seed: 7, name: "W" };
const fake = () => { const g = new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => { o[k] = v; return true; } }); return g; };
for (const id of [...CAT.COMPOSITES.map((c) => c.id)]) {
  const S = { ...base, ...MEM.LOOK[id], name: "W" + id, seed: 7 }; const m = G.build(S, 320, 192);
  ok(m.won && m.won.has.has(id), `${id} : géométrie construite`);
  let err = null; try { G.paint(fake(), m, 0.3, { day: 0.4, clock: 12 }); G.paint(fake(), m, 0.7, { day: 0.95, clock: 2 }); } catch (e) { err = e; } ok(!err, `${id} : se peint de jour et de nuit${err ? " (" + err.message + ")" : ""}`);
}
ok(G.build({ ...base, wonders: [] }, 320, 192).won === null, "un Âge sans merveille n'a pas de géométrie de merveille");
// la chambre des souvenirs : un orbe par merveille vue, dans l'ordre ; rien pour une merveille inconnue
{ const r = { opts: { wonders: () => ({ mosaic: { at: 2, age: "B" }, breathing_mirrors: { at: 1, age: "A" }, nope: { at: 0 } }) } };
  const g = MEM.memoriesOf({ opts: { wonders: () => ({ mosaic: { at: 1, age: "X", gone: true } }) } }); ok(g[0].gone === true, "un monde qui n'est plus : l'orbe le sait");
  const L = MEM.memoriesOf(r); ok(L.length === 2 && L[0].id === "breathing_mirrors" && L[1].id === "mosaic", "la chambre : deux orbes, dans l'ordre où on les a vus"); }
console.log(`wonders.test.js ok (${n} vérifications)`);
