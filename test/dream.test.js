"use strict";
// Le Rêve (src/dream.js, étape 4d) : qui peut rêver, ce que le rêve montre (fautes mûries, possibles, merveilles), le guide.
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { blockById } = require("../src/engine/registry");
const MUT = require("../src/mutation");
const LF = require("../src/life");
const D = require("../src/dream");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const NOW = Date.UTC(2026, 9, 24, 21), day = D.dayOf(NOW);

/* la porte : la dalle, l'Âge verrouillé, un rêve par Âge et par jour */
ok(D.gate({ open: false, age: "A", day }) === "closed", "dalle fermée : les yeux ne s'ouvrent pas");
ok(D.gate({ open: true, age: null, day }) === "noage", "rien sur l'Imageur : les yeux ne s'ouvrent sur rien");
ok(D.gate({ open: true, age: "A", last: day, day }) === "done", "déjà rêvé aujourd'hui");
ok(D.gate({ open: true, age: "A", last: day - 1, day }) === null && D.gate({ open: true, age: "A", day }) === null, "hier, ou jamais : on rêve");
ok(D.dayOf(NOW, -120) === D.dayOf(NOW + 2 * 3600000), "le jour suit l'heure locale");

/* les tirages voisins : la graine de l'Âge, le Great Zero, le jour */
const s1 = D.altSeeds("Glass Marsh", 7, day), s2 = D.altSeeds("Glass Marsh", 7, day + 1), s3 = D.altSeeds("Glass Marsh", 8, day);
ok(s1.length === D.ALTS && new Set(s1).size === D.ALTS && s1.every((s) => s.startsWith("Glass Marsh~")), "deux graines voisines, distinctes");
ok(JSON.stringify(s1) === JSON.stringify(D.altSeeds("Glass Marsh", 7, day)), "le même jour, le même rêve");
ok(s1[0] !== s2[0] && s1[0] !== s3[0], "il change chaque jour, et d'un joueur à l'autre");

/* les possibles : un Âge peu écrit laisse le monde tirer ; un autre tirage choisit d'autres pages */
const axisOf = (id) => (blockById.get(id) || {}).axis;
let found = null;
for (let i = 0; i < 400 && !found; i++) {
  const text = ["single_sun", "steady_cycle", "water"].join("\n"), name = "Dream " + i, main = analyseAgeBase(text, { seed: name });
  const alts = D.altSeeds(name, 3, day).map((s) => analyseAgeBase(text, { seed: s }));
  const ps = D.possiblesIn(main, alts, axisOf);
  if (ps.length) found = { main, ps };
}
ok(found, "un Âge où le hasard a de la place donne des possibles");
const written = D.writtenOf(found.main), drawn = new Set(D.drawnOf(found.main));
ok(found.ps.every((p) => !written.has(p.id) && !drawn.has(p.id) && p.line.add === p.id && p.kind === "possible"), "un possible n'est ni écrit ni tiré ; l'adopter, c'est écrire son bloc");
ok(found.ps.length <= D.MAX.possible, "trois possibles au plus");

/* les fautes mûries : retirer la ligne écrite qui les cause */
const fake = { resolved: { matter: { written: ["water", "lava"] }, lines: [], scars: [{ id: "bitter_water", axis: "geological", level: "light", prose: "the water tastes of what it touched", from: [{ a: "water", b: "salt" }] }, { id: "deep_scar", axis: "geological", level: "normal", prose: "x", from: [{ a: "lava", b: "ice" }] }] } };
const fs = D.faultsIn(fake);
ok(fs.length === 1 && fs[0].text === "the water tastes of what it touched" && fs[0].line.remove === "water", "seules les fautes qui mûrissent, à leur cause ; on propose de retirer la ligne écrite");
const blight = { resolved: { matter: { written: [] }, lines: [], scars: [{ id: "blight", key: "blight", host: "fern", role: "producer", level: "light" }] } };
const bf = D.faultsIn(blight, LF.blightProse);
ok(bf.length === 1 && /wearing out/.test(bf[0].text) && bf[0].line === null, "la maladie : sa cause en clair, rien à retirer");

/* l'autre face des merveilles */
const wa = { composites: [{ id: "breathing_mirrors", a: "water", b: "lava" }], resolved: { matter: { reactions: [{ a: "flowers", b: "wind", result: "petal_rain" }, { a: "x", b: "y", result: "steam" }] } } };
const ws = D.wondersIn(wa, (c) => MUT.keystoneOf(c));
ok(ws.length === 2 && ws[0].id === "breathing_mirrors" && [ws[0].a, ws[0].b].includes(ws[0].keystone) && ws[1].id === "petal_rain" && ws.every((w) => w.line.face === w.id), "chaque merveille et son couple ; une réaction ordinaire n'en est pas une");

/* le contenu : placé, sans recouvrement */
const c = D.contentOf(found.main, [], { seed: "Dream", axisOf });
const all = D.contentOf({ ...fake, composites: wa.composites }, [], { seed: "S" }).items;
ok(all.every((it) => it.x >= 60 && it.x <= 580 && it.y >= 30 && it.y <= 320), "tout tient dans l'image");
ok(all.every((a, i) => all.every((b, j) => i === j || Math.abs(a.x - b.x) >= 60 || Math.abs(a.y - b.y) >= 34)), "deux choses ne se recouvrent pas");
ok(Array.isArray(c.items), "un Âge sans faute ni merveille rêve quand même");

/* le guide : un orbe du même Âge */
const W = { mosaic: { age: "Glass Marsh" }, petal_rain: { age: "Other" } };
ok(D.guided("mosaic", W, "Glass Marsh") && !D.guided("petal_rain", W, "Glass Marsh") && !D.guided(null, W, "Glass Marsh") && !D.guided("nope", W, "Glass Marsh"), "le guide ne rapporte que du monde où on l'a vécu");

/* les tirages glissent l'un dans l'autre, sans jamais effacer l'Âge */
const ws2 = Array.from({ length: 48 }, (_, i) => [D.altWeight(0, i), D.altWeight(1, i)]);
ok(ws2.every(([a, b]) => a >= 0 && a <= 0.6 && b >= 0 && b <= 0.6) && ws2.some(([a]) => a > 0.5) && ws2.some(([, b]) => b > 0.5), "chacun vient à son tour, jamais tout à fait");

console.log(`dream.test.js : ${n} vérifications OK`);
