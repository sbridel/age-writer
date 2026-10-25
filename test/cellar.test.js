"use strict";
// La cave sous la machine (src/cellar.js) : la récolte rangée par saison, le tamis, le compost, le monte-charge, l'ordre de la trémie.
const assert = require("assert");
const C = require("../src/cellar");
const H = require("../src/harvest");
const O = require("../src/oven");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* ranger : chaque mesure dans le bocal de sa saison, riche ou pauvre, mêlées */
const ext = {};
C.store(ext, "ash", "winter", true); C.store(ext, "ash", "winter", false); C.store(ext, "ash", "winter", false); C.store(ext, "ash", "summer", true); C.store(ext, "peat", null, true);
const J = C.stateOf(ext).jars;
ok(J.ash.winter.n === 3 && J.ash.winter.rich === 1 && J.ash.summer.n === 1 && J.peat.none.n === 1, "chaque mesure dans le bocal de sa saison ; sans saison, le bocal « sans saison »");
ok(!C.store(ext, "gold", "winter", true) && C.jarOf(ext, "ash", "spring").n === 0, "une matière inconnue ne se range pas");
ok(C.totals(ext).ash === 4 && C.totals(ext).peat === 1, "le total de la cave");
ok(!ext.harvest || !ext.harvest.stock || ext.harvest.stock.ash === 0, "ranger ne touche pas les trémies");

/* le tamis : le bon grain au bocal scellé, le mauvais au compost ; trois mauvais font un terreau */
let r = C.sieve(ext, "ash", "winter");
ok(r && r.good === 1 && r.bad === 2 && r.humus === 0 && J.ash.winter.n === 0 && J.ash.good.n === 1 && C.stateOf(ext).compost === 2, "le tamis : un bon grain, deux au compost (pas encore de terreau)");
C.store(ext, "silt", "autumn", false); r = C.sieve(ext, "silt", "autumn");
ok(r.good === 0 && r.bad === 1 && r.humus === 1 && J.humus.none.n === 1 && J.humus.none.rich === 0 && C.stateOf(ext).compost === 0, "le troisième mauvais grain : le compost donne une mesure de terreau, pauvre, sans saison");
ok(C.sieve(ext, "ash", "winter") === null && C.sieve(ext, "ash", "good") === null, "un bocal vide, ou le bon grain : le tamis n'a rien à faire");
r = C.toCompost(ext, "ash", "summer");
ok(r && r.n === 1 && J.ash.summer.n === 0 && C.stateOf(ext).compost === 1, "jeter un bocal au compost, même du bon");

/* l'ordre d'un bocal mêlé : riches et pauvres répartis, comme ils sont venus */
const ord = C.orderOf(5, 2);
ok(ord.length === 5 && ord.filter(Boolean).length === 2 && ord[0] === false, "un bocal mêlé se verse mêlé (" + ord.join(",") + ")");
ok(C.orderOf(4, 4).every(Boolean) && C.orderOf(3, 0).every((x) => !x), "tout riche, tout pauvre");

/* le monte-charge : le bocal monte dans sa trémie ; la trémie verse ce qui vient d'en bas dans l'ordre */
const e2 = {}; C.store(e2, "ash", "winter", false); C.store(e2, "ash", "winter", true); C.store(e2, "ash", "winter", false);
ok(C.lift(e2, "ash", "winter") === 3 && H.stateOf(e2).stock.ash === 3 && H.stateOf(e2).rich.ash === 1 && C.jarOf(e2, "ash", "winter").n === 0, "le monte-charge vide le bocal dans la trémie");
const take = () => H.take(e2, "ash");
ok([take(), take(), take()].join() === C.orderOf(3, 1).join() && H.stateOf(e2).stock.ash === 0 && H.stateOf(e2).rich.ash === 0, "ce qui monte de la cave se verse dans l'ordre : la trémie ne trie plus");
const e3 = { harvest: { stock: { ash: 2, humus: 0, silt: 0, peat: 0 }, rich: { ash: 1, humus: 0, silt: 0, peat: 0 } } };
C.store(e3, "ash", "good", true); J.ash; C.stateOf(e3).jars.ash.good.n = 2; C.lift(e3, "ash", "good");
ok(H.stateOf(e3).stock.ash === 4 && H.stateOf(e3).queue.ash.length === 2, "d'avant la cave, deux mesures ; montées, deux de bon grain");
ok([H.take(e3, "ash"), H.take(e3, "ash"), H.take(e3, "ash"), H.take(e3, "ash")].join() === "true,false,true,true", "le stock d'avant se verse d'abord, riches d'abord ; puis la file de la cave");
ok(C.lift(e3, "ash", "good") === null, "un bocal vide ne monte pas");

/* la machine : une mesure prise puis reversée revient en tête de file */
const e4 = {}; C.store(e4, "ash", "summer", true); C.store(e4, "ash", "summer", false); C.lift(e4, "ash", "summer");
const o4 = C.orderOf(2, 1); O.set(e4, "add", 0, 0); ok(e4.oven.colRich[0] === o4[0] && H.stateOf(e4).queue.ash.length === 1, "la machine prend la première mesure de la file");
O.set(e4, "empty", null, 0); ok(H.stateOf(e4).queue.ash.join() === o4.join() && H.stateOf(e4).stock.ash === 2, "la colonne reversée : la mesure revient en tête");

/* la récolte peut descendre ailleurs que dans la trémie */
const e5 = {}; H.gather(e5, "Vallon", ["ash", "peat"], 1e12, { ash: true, peat: false }, (id, rich) => C.store(e5, id, "autumn", rich));
ok(H.stateOf(e5).stock.ash === 0 && C.jarOf(e5, "ash", "autumn").rich === 1 && C.jarOf(e5, "peat", "autumn").n === 1 && C.jarOf(e5, "peat", "autumn").rich === 0, "la récolte descend à la cave, par saison, avec sa qualité");
ok(H.gatheredToday(e5, "Vallon", 1e12), "et compte comme donnée aujourd'hui");

/* l'état se nettoie */
const e6 = { cellar: { jars: { ash: { winter: { n: "4", rich: 9 } } }, compost: 7 } };
ok(C.jarOf(e6, "ash", "winter").n === 4 && C.jarOf(e6, "ash", "winter").rich === 4 && C.stateOf(e6).compost === 1, "un état abîmé se répare (riches ≤ total, compost < 3)");
/* la vue : elle se dessine sans NaN, chaque bocal a sa zone ; la main (relto-render, cellarClick) */
const CV = require("../src/relto-cellar");
const chk = (x) => { if (typeof x === "number" && !Number.isFinite(x)) throw new Error("NaN dans le rendu"); };
const grad = { addColorStop: (o, c) => { chk(o); if (/NaN/.test(c)) throw new Error("couleur NaN"); } };
let calls = 0;
const ctx = new Proxy({}, { get: (_, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : k === "measureText" ? () => ({ width: 1 }) : (...a) => { a.forEach(chk); calls++; }), set: (_, k, v) => { if (/NaN/.test(String(v))) throw new Error("NaN : " + String(k)); return true; } });
const ve = {}; C.store(ve, "ash", "winter", true); C.store(ve, "ash", "winter", false); C.store(ve, "humus", "spring", true); C.stateOf(ve).jars.peat.good.n = 3;
const said = [];
const R = { hot: [], opts: { cellarState: () => C.stateOf(ve), onCellar: (act, id, slot) => { said.push(act + ":" + id + ":" + slot); return act === "take" ? null : act === "sieve" ? (C.sieve(ve, id, slot) ? "tamisé" : "vide") : act === "lift" ? (C.lift(ve, id, slot) ? "monté" : "vide") : (C.toCompost(ve, id, slot) ? "composté" : "vide"); } }, imagerTr: () => (k) => k, view: "cellar", running: true };
CV.drawCellar(R, ctx, {}, { night: 0, ambient: 1 }, 0.3);
ok(calls > 400, "la cave se dessine (" + calls + " appels)");
const zones = R.hot.filter((h) => h.cellar === "take");
const zonesOf = (sk) => { const rr = { ...R, hot: [], glassOn: () => sk === "glass", castleOn: () => sk === "castle" }; calls = 0; CV.drawCellar(rr, ctx, {}, { night: 0, ambient: 1 }, 0.3); ok(calls > 400, sk + " : la cave se dessine (" + calls + " appels)"); return JSON.stringify(rr.hot.map((h) => [h.x, h.y, h.w, h.h, h.cellar || h.go || ""])); };
const zPlain = zonesOf("plain"); ok(zonesOf("glass") === zPlain && zonesOf("castle") === zPlain, "trois habits, les mêmes zones cliquables");
ok(zones.length === 3 && zones.some((h) => h.id === "ash" && h.slot === "winter") && zones.some((h) => h.id === "peat" && h.slot === "good"), "seuls les bocaux pleins se prennent");
ok(R.hot.some((h) => h.go === "oven"), "l'échelle remonte à la machine");
const { ReltoRenderer } = require("../src/relto-render");
const click = (h) => ReltoRenderer.prototype.cellarClick.call(R, h, 100, 100);
ok(click(zones.find((h) => h.id === "ash")) && R.jarHeld && R.jarHeld.slot === "winter", "un clic sur un bocal le prend en main");
R.hot = []; CV.drawCellar(R, ctx, {}, { night: 0, ambient: 1 }, 0.3);
ok(R.hot.some((h) => h.cellar === "sieve") && R.hot.some((h) => h.cellar === "lift") && R.hot.some((h) => h.cellar === "compost") && R.hot.every((h) => h.cellar !== "take"), "bocal en main : le tamis, le monte-charge, le compost répondent ; les bocaux ne se prennent plus");
ok(click(R.hot.find((h) => h.cellar === "sieve")) && !R.jarHeld && C.jarOf(ve, "ash", "good").n === 1 && R.flash && R.flash.text === "tamisé", "posé au tamis : trié, la main vide, une phrase");
click(R.hot.find((h) => h.cellar === "take" && h.id === "peat") || { cellar: "take", id: "peat", slot: "good" }); ok(R.jarHeld && R.jarHeld.id === "peat", "le bon grain se prend aussi");
ok(click(null) && !R.jarHeld && R.flash.text === "cellar.said.back", "un clic ailleurs : le bocal retourne à sa place");
click({ cellar: "take", id: "peat", slot: "good" }); ok(click({ go: "oven" }) === false && !R.jarHeld, "l'échelle : on remonte, le bocal reste en bas");
console.log(`cellar.test: ${n} vérifications`);
