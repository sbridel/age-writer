"use strict";
// La machine du Relto (src/oven.js, étape 4a′) : les recettes, la cuisson en vrai temps, l'étagère.
const assert = require("assert");
const O = require("../src/oven");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const R = (levers, time, temp, press) => O.resultOf({ levers, time, temp, press });
const kind = (...a) => (R(...a) || {}).kind;
// les recettes
ok(kind([2, 0, 1, 0], 40, 20, 44) === "white", "blanc : 2 cendres, 1 limon, 40-20, pressé fort");
ok(kind([3, 0, 2, 0], 41, 19, 50) === "white", "blanc : 3 et 2, un cran à côté : la tolérance");
ok(kind([2, 0, 1, 0], 40, 20, 30) === "grey", "blanc pas assez pressé (il ne coulerait pas) : gris");
ok(kind([2, 0, 1, 0], 44, 20, 44) === "grey", "blanc, temps à trois crans : gris");
ok(kind([1, 0, 1, 0], 40, 20, 44) === "grey", "autant de limon que de cendres : gris");
ok(kind([2, 1, 1, 0], 40, 20, 44) === "grey", "du terreau dans le blanc : gris");
ok(kind([0, 2, 0, 1], 30, 30, 15) === "amber", "ambré : 2 terreau, 1 tourbe, 30-30, pressé peu");
ok(kind([0, 2, 0, 1], 30, 30, 40) === "grey", "ambré trop pressé (il coulerait sans nourrir) : gris");
ok(kind([0, 3, 0, 2], 1, 50, 15) === "amber", "ambré rapide : une fournée pleine, temps 1, température 50");
ok(kind([0, 2, 0, 1], 1, 50, 15) === "grey", "rapide mais pas une fournée pleine : gris");
ok(kind([2, 0, 1, 0], 40, 20, 4) === "dust", "pas pressé : il s'effrite");
ok(R([0, 0, 0, 0], 40, 20, 44) === null && R([2, 0, 1, 0], 0, 20, 44) === null, "rien dans le four, ou pas de temps : rien");
ok(R([2, 0, 1, 0], 40, 20, 44).n === 3, "une mesure, une capsule");
// la colonne de mélange
const ext = {}, T = Date.UTC(2026, 9, 24, 12);
ok(O.set(ext, "add", 0, T) === "none:ash", "trémie vide : rien ne tombe");
ext.harvest = { stock: { ash: 2, humus: 4, silt: 3, peat: 0 }, last: {} };
O.set(ext, "add", 0, T); O.set(ext, "add", 2, T); O.set(ext, "add", 0, T);
ok(ext.oven.column.join() === "ash,silt,ash" && ext.oven.levers.join() === "2,0,1,0", "un clic, une mesure dans la colonne, dans l'ordre");
ok(ext.harvest.stock.ash === 0 && ext.harvest.stock.silt === 2, "la mesure quitte la trémie");
O.set(ext, "add", 1, T); O.set(ext, "add", 1, T);
ok(O.set(ext, "add", 1, T) === "full" && ext.oven.column.length === 5, "cinq au plus");
ok(O.set(ext, "empty", null, T) === true && ext.oven.column.length === 0 && ext.harvest.stock.ash === 2 && ext.harvest.stock.humus === 4, "vider la colonne : tout retourne aux trémies");
O.set(ext, "add", 1, T); O.set(ext, "add", 1, T); O.set(ext, "add", 1, T);
ok(O.set(ext, "add", 1, T) === "max", "trois d'un même ingrédient au plus");
O.set(ext, "empty", null, T);
O.set(ext, "add", 0, T); O.set(ext, "add", 0, T); O.set(ext, "add", 2, T);
O.set(ext, "time", 40, T); O.set(ext, "temp", 20, T); O.set(ext, "press", 99, T);
ok(ext.oven.press === 50, "les curseurs vont de 0 à 50");
// la cuisson
ok(O.start(ext, T) === null && ext.oven.column.length === 0 && ext.oven.batch.layers.join() === "ash,ash,silt", "la porte se ferme : la colonne se vide dans le four");
ok(O.phaseOf(ext.oven, T + 60000).phase === "cooking" && O.phaseOf(ext.oven, T + 60000).left === 40 * O.STEP_MS - 60000, "temps 40 : dix minutes en vrai temps");
ok(O.set(ext, "time", 10, T + 1000) === false && O.start(ext, T + 1000) === "busy", "pendant la cuisson, rien ne se règle");
ok(O.collect(ext, T + 60000) === null, "on ne prend pas une fournée qui cuit");
const got = O.collect(ext, T + 40 * O.STEP_MS);
ok(got && got.kind === "white" && got.n === 3 && ext.pellets.white === 3 && ext.oven.batch === null, "fini : trois capsules blanches sur l'étagère");
ok(O.start(ext, T + 40 * O.STEP_MS) === "empty", "la colonne est vide : rien à cuire");
console.log(`oven.test.js ok (${n} vérifications)`);
