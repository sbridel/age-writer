"use strict";
// Les fresques, le cartouche et la dalle (src/fresco.js, étape 4c) : l'ordre de la paroi, ce que la lumière montre, le code du Relto.
const assert = require("assert");
const F = require("../src/fresco");
const FR = require("../src/relto-fresco");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const D = F.DAY, NOW = Date.UTC(2026, 9, 24, 18);

/* le signe d'un Âge : de ce qu'il a écrit, puis de son nom ; toujours deux à quatre éléments connus */
const s1 = F.ageSign({ name: "Glass Marsh", glyphs: ["water", "fern", "hills", "orange_sun"] });
ok(s1[0] === "water" && s1.includes("tree") && s1.includes("mountain") && s1.length <= 4, "l'eau d'abord, puis la fougère (arbre), les collines (montagne)");
for (const nm of ["Rust Choir", "A", "Ëlia", ""]) { const s = F.ageSign({ name: nm, glyphs: [] }); ok(s.length >= 2 && s.length <= 4 && s.every((e) => F.ELEMENTS.includes(e)) && new Set(s).size === s.length, "un Âge sans bloc reconnu : deux à quatre éléments tirés de son nom (" + nm + ")"); }
ok(JSON.stringify(F.ageSign({ name: "Rust Choir" })) === JSON.stringify(F.ageSign({ name: "Rust Choir" })), "le même Âge, le même signe");

/* l'ordre : le plus récent près de l'eau (bande 0), le plus ancien en haut */
const ages = Array.from({ length: 10 }, (_, i) => ({ name: "Age " + i, born: NOW - (20 - i) * D }));
const items = F.itemsOf(ages, { mosaic: { at: NOW - D }, petal_rain: { at: NOW - 30 * D }, nothing_known: { at: NOW } });
ok(items.length === 12 && items[0].id === "petal_rain" && items[items.length - 1].id === "mosaic", "les merveilles connues y entrent, à leur date ; une inconnue non");
const bands = F.bandsOf(items);
ok(bands.length === F.PLAYER_BANDS && bands[0][0].id === "mosaic" && bands[1][bands[1].length - 1].id === "petal_rain", "bande du bas : le plus récent ; le plus ancien monte");
const many = F.itemsOf(Array.from({ length: 80 }, (_, i) => ({ name: "A" + i, born: NOW - (100 - i) * D })), {});
const mb = F.bandsOf(many), flat = mb.flat();
ok(flat.length === F.PLAYER_BANDS * F.PER_BAND && flat[0].id === "A79" && flat[flat.length - 1].id === "A0", "au-delà de trente-cinq, la paroi resserre : le premier et le dernier restent");

/* le lac : des degrés ; la lumière : une bande par révélation */
ok(F.lakeDegree(0, NOW, NOW) === 0 && F.lakeDegree(1, NOW - 9 * D, NOW) === 1 && F.lakeDegree(40, NOW - D, NOW) === 2 && F.lakeDegree(40, NOW - 9 * D, NOW) === 1 && F.lakeDegree(220, NOW - D, NOW) === 3, "degrés 0 à 3 : nombre et fraîcheur");
ok(F.bandsLit(0, 0, false) === 0 && F.bandsLit(3, 1, false) === 0 && F.bandsLit(3, 2, false) === 1 && F.bandsLit(3, 3, false) === 3 && F.bandsLit(9, 0, true) === F.BANDS && F.bandsLit(2, 0, true) === 2, "sans éclair : le lac décide ; avec : les révélations, six au plus");
ok(F.glyphsFound(0) === 0 && F.glyphsFound(1) === 2 && F.glyphsFound(3) === 6 && F.glyphsFound(8) === 6, "deux glyphes par révélation, six en trois descentes");

/* le code : six glyphes distincts, propres au Relto */
const c1 = F.codeOf("Relto", 19991118), c2 = F.codeOf("Relto", 19991119), c3 = F.codeOf("relto ", 19991118);
ok(c1.length === 6 && new Set(c1).size === 6 && c1.every((i) => i >= 0 && i < F.ELEMENTS.length), "six glyphes distincts");
ok(JSON.stringify(c1) !== JSON.stringify(c2) && JSON.stringify(c1) === JSON.stringify(c3), "chacun son code (graine) ; le nom se lit comme la clé du télescope");

/* la dalle : fermée au départ, chaque pierre a son cran juste, six justes l'ouvrent */
const closed = F.slabOf("Relto", 19991118, null);
ok(!closed.right && closed.stones.every((s, i) => s !== closed.code[i]), "au départ, aucune pierre n'est juste");
const turns = closed.code.map((g, i) => { for (let t = 0; t < F.RING; t++) { const tt = [0, 0, 0, 0, 0, 0]; tt[i] = t; if (F.slabOf("Relto", 19991118, tt).stones[i] === g) return t; } return -1; });
ok(turns.every((t) => t > 0 && t < F.RING), "chaque pierre a un cran juste sur son anneau");
ok(F.slabOf("Relto", 19991118, turns).right && !F.slabOf("Relto", 19991118, turns.map((t, i) => (i === 3 ? t + 1 : t))).right, "les six justes ouvrent ; une de travers, non");
ok(F.slabOf("Relto", 19991118, turns.map((t) => t + F.RING)).right, "un tour complet revient au même cran");

/* la planche : chaque signe de la paroi a son dessin */
for (const id of [...F.ELEMENTS, ...F.WONDER_SCENES, ...F.BAHRO_ROW]) ok(typeof FR.SIGNS[id] === "function", "un dessin pour " + id);
for (const parts of Object.values(F.WRITTEN_SIGNS)) ok(parts.every((p) => F.ELEMENTS.includes(p)), "les merveilles écrites se peignent en éléments");

console.log(`fresco : ${n} contrôles ✓`);
