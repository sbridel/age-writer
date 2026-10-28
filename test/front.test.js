"use strict";
// ESSAI (la météo dans la mise en scène) : l'orage a un côté, selon l'orientation du point de liaison ; une pluie écrite tombe parfois au loin.
const assert = require("assert");
const G = require("../src/genscene");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const mode = (S) => { const f = G.buildFront({ seed: 7, ...S }, 640, 384, 260); return f && f.mode; };
ok(mode({ storm: true, view: { face: "eq" } }) === "right", "face à l'équateur : l'orage vient de la droite (l'ouest)");
ok(mode({ storm: true, view: { face: "pole" } }) === "left", "face au pôle : de la gauche");
ok(mode({ storm: true, view: { face: "east" } }) === "over", "face au levant : il passe au-dessus (il vient de dans le dos)");
ok(mode({ storm: true, view: { face: "west" } }) === "ahead", "face au couchant : la muraille sur l'horizon");
ok(mode({ view: { face: "eq" } }) === null, "ni pluie ni orage : rien");
ok(mode({ storm: true, world: "cavern", view: { face: "eq" } }) === null && mode({ storm: true, loop: true, view: { face: "eq" } }) === null, "ni dans la caverne, ni sur l'anneau");
let far = 0; for (let s = 1; s <= 200; s++) if (G.buildFront({ seed: s, rain: true, view: { face: "eq" } }, 640, 384, 260)) far++;
ok(far > 70 && far < 130, `une pluie sans orage tombe au loin environ une fois sur deux (${far} / 200)`);
const a = G.buildFront({ seed: 42, storm: true, view: { face: "eq" } }, 640, 384, 260), b = G.buildFront({ seed: 42, storm: true, view: { face: "eq" } }, 640, 384, 260);
ok(JSON.stringify(a) === JSON.stringify(b), "même graine, même orage");
console.log(`front.test.js : ${n} vérifications ok`);
