"use strict";
// La cave sous la machine (src/cellar.js) : la récolte rangée par saison, le tamis, le compost, le monte-charge, l'ordre de la trémie.
const assert = require("assert");
const C = require("../src/cellar");
const H = require("../src/harvest");
const O = require("../src/oven");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/* ranger : chaque mesure dans le bocal de sa saison, avec sa sorte, riches et pauvres mêlés */
const ext = {};
C.store(ext, "ash", "winter", true, "volcanic"); C.store(ext, "ash", "winter", false, "volcanic"); C.store(ext, "ash", "winter", false, "hearth"); C.store(ext, "ash", "summer", true, "hearth"); C.store(ext, "peat", null, true);
const J = C.stateOf(ext).jars;
ok(J.ash.winter.n === 3 && J.ash.winter.rich === 1 && J.ash.winter.by.volcanic.n === 2 && J.ash.winter.by.hearth.n === 1 && J.ash.summer.by.hearth.rich === 1 && J.peat.none.n === 1, "chaque mesure dans le bocal de sa saison, avec sa sorte ; sans saison, le bocal « sans saison »");
ok(!C.store(ext, "gold", "winter", true) && C.jarOf(ext, "ash", "spring").n === 0 && C.jarOf(ext, "ash", "good") === null && C.jarOf(ext, "ash", "good:quartz") === null && C.jarOf(ext, "silt", "good:quartz"), "une matière ou un bocal inconnu : rien ; chaque matière a les scellés de ses sortes");
C.store(ext, "ash", "autumn", true, "marble"); ok(C.jarOf(ext, "ash", "autumn").by.volcanic.n === 1, "une sorte inconnue tombe dans la première sorte"); C.toCompost(ext, "ash", "autumn");
ok(C.totals(ext).ash === 4 && C.totals(ext).peat === 1, "le total de la cave");
ok(!ext.harvest || !ext.harvest.stock || ext.harvest.stock.ash === 0, "ranger ne touche pas les trémies");

/* le tamis : le bon grain au scellé de sa sorte, le mauvais au compost ; trois mauvais font un terreau */
const c0 = C.stateOf(ext).compost; let r = C.sieve(ext, "ash", "winter");
ok(r && r.good === 1 && r.bad === 2 && r.sorts.volcanic === 1 && !r.sorts.hearth && J.ash.winter.n === 0 && J.ash["good:volcanic"].n === 1 && J.ash["good:hearth"].n === 0, "le tamis : le bon grain volcanique dans son scellé, rien dans celui de foyer");
ok(C.stateOf(ext).compost === (c0 + 2) % 3 && r.humus === Math.floor((c0 + 2) / 3), "le mauvais grain au compost");
r = C.sieve(ext, "ash", "summer"); ok(r.sorts.hearth === 1 && J.ash["good:hearth"].n === 1, "le bon grain de foyer dans son scellé");
const e1 = {}; for (let i = 0; i < 3; i++) C.store(e1, "silt", "autumn", false, "quartz"); r = C.sieve(e1, "silt", "autumn");
ok(r.good === 0 && r.bad === 3 && r.humus === 1 && C.jarOf(e1, "humus", "none").n === 1 && C.jarOf(e1, "humus", "none").rich === 0 && C.stateOf(e1).compost === 0, "trois mauvaises mesures : une mesure de terreau, pauvre, sans saison");
ok(C.sieve(e1, "silt", "autumn") === null && C.sieve(ext, "ash", "good:volcanic") === null, "un bocal vide, ou un scellé : le tamis n'a rien à faire");
r = C.toCompost(ext, "ash", "good:hearth"); ok(r && r.n === 1 && J.ash["good:hearth"].n === 0, "jeter un scellé au compost, même du bon");

/* l'ordre d'un bocal mêlé : riches et pauvres répartis, les sortes tour à tour */
const ord = C.orderOf(5, 2);
ok(ord.length === 5 && ord.filter(Boolean).length === 2 && ord[0] === false, "un bocal mêlé se verse mêlé (" + ord.join(",") + ")");
ok(C.orderOf(4, 4).every(Boolean) && C.orderOf(3, 0).every((x) => !x), "tout riche, tout pauvre");
const e2 = {}; C.store(e2, "ash", "winter", true, "volcanic"); C.store(e2, "ash", "winter", true, "volcanic"); C.store(e2, "ash", "winter", false, "hearth");
const po = C.pourOf("ash", "winter", C.jarOf(e2, "ash", "winter")); ok(po.map((m) => m.s).join() === "volcanic,hearth,volcanic", "les sortes d'un bocal de saison se versent tour à tour (" + po.map((m) => m.s).join() + ")");

/* le monte-charge : le bocal monte dans sa trémie ; la trémie verse dans l'ordre, chaque mesure avec sa sorte */
ok(C.lift(e2, "ash", "winter") === 3 && H.stateOf(e2).stock.ash === 3 && H.stateOf(e2).rich.ash === 2 && C.jarOf(e2, "ash", "winter").n === 0, "le monte-charge vide le bocal dans la trémie");
const got = [H.takeOne(e2, "ash"), H.takeOne(e2, "ash"), H.takeOne(e2, "ash")];
ok(got.map((m) => m.sort + ":" + m.rich).join() === po.map((m) => m.s + ":" + m.r).join() && H.stateOf(e2).stock.ash === 0, "ce qui monte de la cave se verse dans l'ordre, avec sa sorte : la trémie ne trie plus");
const e3 = { harvest: { stock: { ash: 2, humus: 0, silt: 0, peat: 0 }, rich: { ash: 1, humus: 0, silt: 0, peat: 0 } } };
C.stateOf(e3).jars.ash["good:volcanic"].n = 2; C.lift(e3, "ash", "good:volcanic");
ok(H.stateOf(e3).stock.ash === 4 && H.stateOf(e3).queue.ash.length === 2, "d'avant la cave, deux mesures ; montées, deux de bon grain volcanique");
ok([1, 2, 3, 4].map(() => { const m = H.takeOne(e3, "ash"); return m.rich + ":" + m.sort; }).join() === "true:null,false:null,true:volcanic,true:volcanic", "le stock d'avant se verse d'abord, riches d'abord, sans sorte ; puis la file de la cave");
ok(C.lift(e3, "ash", "good:volcanic") === null, "un bocal vide ne monte pas");
const old = { cellar: { jars: { ash: { winter: { n: 3, rich: 1 }, good: { n: 2 } } } } };
ok(C.jarOf(old, "ash", "winter").by.volcanic.n === 3 && C.jarOf(old, "ash", "good:volcanic").n === 2 && !("good" in C.stateOf(old).jars.ash), "une cave d'avant les sortes est reprise sans rien perdre");

/* la machine : la sorte de chaque couche ; reprendre et reverser garde l'ordre */
const e4 = {}; C.store(e4, "ash", "summer", true, "volcanic"); C.store(e4, "ash", "summer", false, "hearth"); C.lift(e4, "ash", "summer");
const first = C.pourOf("ash", "summer", { by: { volcanic: { n: 1, rich: 1 }, hearth: { n: 1, rich: 0 } } })[0];
O.set(e4, "add", 0, 0); ok(e4.oven.colRich[0] === first.r && e4.oven.colSort[0] === first.s && H.stateOf(e4).queue.ash.length === 1, "la machine prend la première mesure de la file, avec sa sorte");
O.set(e4, "add", 0, 0); O.set(e4, "empty", null, 0); ok(H.stateOf(e4).queue.ash.map((m) => m.s).join() === "volcanic,hearth" && H.stateOf(e4).stock.ash === 2, "la colonne reversée : la file retrouve son ordre");

/* les recettes et les sortes : le blanc net veut la cendre volcanique et le limon de quartz ; l'ambré accepte une mesure qui nourrit */
const brew = (layers, set) => { const s = { column: layers.map((l) => l[0]), colSort: layers.map((l) => l[1]), colRich: layers.map(() => true), time: 0, temp: 0, press: 0, ...set }; s.levers = H.INGREDIENTS.map((id) => s.column.filter((x) => x === id).length); return O.resultOf(s); };
const W1 = { time: 40, temp: 20, press: 40 }, A1 = { time: 30, temp: 30, press: 15 };
ok(brew([["ash", "volcanic"], ["ash", "volcanic"], ["silt", "quartz"]], W1).kind === "white" && brew([["ash", "volcanic"], ["ash", "volcanic"], ["silt", "quartz"]], W1).fine, "cendre volcanique et limon de quartz : un blanc net");
ok(brew([["ash", "hearth"], ["ash", "volcanic"], ["silt", "quartz"]], W1).kind === "white" && !brew([["ash", "hearth"], ["ash", "volcanic"], ["silt", "quartz"]], W1).fine, "une cendre de foyer : le blanc sort, approximatif");
ok(!brew([["ash", "volcanic"], ["ash", "volcanic"], ["silt", "volcanic"]], W1).fine, "un limon volcanique : approximatif aussi");
ok(brew([["ash", null], ["ash", null], ["silt", null]], W1).fine, "des mesures d'avant la cave, sans sorte : rien ne gêne");
ok(brew([["humus"], ["humus"], ["peat"]].map((l) => [l[0], l[0]]), A1).kind === "amber", "terreau et tourbe : l'ambré, comme avant");
ok(brew([["humus", "humus"], ["humus", "humus"], ["peat", "peat"], ["ash", "hearth"]], A1).kind === "amber", "une mesure de cendre de foyer : la potasse nourrit, l'ambré sort");
ok(brew([["humus", "humus"], ["humus", "humus"], ["peat", "peat"], ["silt", "volcanic"]], A1).kind === "amber", "une mesure de limon volcanique : l'argile nourrit");
ok(brew([["humus", "humus"], ["humus", "humus"], ["peat", "peat"], ["ash", "volcanic"]], A1).kind === "grey", "une cendre volcanique dans l'ambré : du minéral pur, il rate");
ok(brew([["humus", "humus"], ["humus", "humus"], ["peat", "peat"], ["ash", "hearth"], ["silt", "volcanic"]], A1).kind === "grey", "deux mesures qui nourrissent : trop de minéral, il rate");

/* la récolte peut descendre ailleurs que dans la trémie */
const e5 = {}; H.gather(e5, "Vallon", ["ash", "peat"], 1e12, { ash: true, peat: false }, (id, rich) => C.store(e5, id, "autumn", rich, id === "ash" ? "hearth" : id));
ok(H.stateOf(e5).stock.ash === 0 && C.jarOf(e5, "ash", "autumn").by.hearth.rich === 1 && C.jarOf(e5, "peat", "autumn").n === 1 && C.jarOf(e5, "peat", "autumn").rich === 0, "la récolte descend à la cave, par saison, avec sa sorte et sa qualité");
ok(H.gatheredToday(e5, "Vallon", 1e12), "et compte comme donnée aujourd'hui");

/* la genèse : déduite de l'Âge, jamais écrite */
const G = (ids) => H.genesisOf(new Set(ids));
ok(G(["lava", "ash"]).ash === "volcanic" && G(["lava", "ash"]).silt === "volcanic" && G(["lava"]).ashBorn, "de la lave : cendre et limon volcaniques");
ok(G(["wildfire", "ash"]).ash === "hearth" && G(["wildfire"]).ashBorn && G(["ash", "water"]).silt === "quartz", "un feu de forêt : cendre de foyer ; sans volcan, le limon est de quartz");
ok(!G(["ash", "fern"]).ashBorn, "une cendre sans volcan ni feu : pas de genèse");
ok(H.givesOf(["water", "stone", "fern"], new Set(["water", "stone", "fern"]), []).join() === "silt" && H.givesOf(["stone", "fern"], new Set(["stone", "fern"]), []).length === 0, "l'eau qui broie la roche écrite donne un limon ; la roche seule, rien");

/* l'état se nettoie */
const e6 = { cellar: { jars: { ash: { winter: { by: { volcanic: { n: "4", rich: 9 }, marble: { n: 2, rich: 2 } } } } }, compost: 7 } };
ok(C.jarOf(e6, "ash", "winter").n === 4 && C.jarOf(e6, "ash", "winter").rich === 4 && !C.jarOf(e6, "ash", "winter").by.marble && C.stateOf(e6).compost === 1, "un état abîmé se répare (riches ≤ total, sortes inconnues écartées, compost < 3)");

/* la vue : elle se dessine sans NaN, chaque bocal a sa zone ; la main (relto-render, cellarClick) */
const CV = require("../src/relto-cellar");
const chk = (x) => { if (typeof x === "number" && !Number.isFinite(x)) throw new Error("NaN dans le rendu"); };
const grad = { addColorStop: (o, c) => { chk(o); if (/NaN/.test(c)) throw new Error("couleur NaN"); } };
let calls = 0;
const ctx = new Proxy({}, { get: (_, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : k === "measureText" ? () => ({ width: 1 }) : (...a) => { a.forEach(chk); calls++; }), set: (_, k, v) => { if (/NaN/.test(String(v))) throw new Error("NaN : " + String(k)); return true; } });
const ve = {}; C.store(ve, "ash", "winter", true, "volcanic"); C.store(ve, "ash", "winter", false, "hearth"); C.store(ve, "humus", "spring", true); C.stateOf(ve).jars.peat["good:peat"].n = 3;
const said = [];
const R = { hot: [], opts: { cellarState: () => C.stateOf(ve), onCellar: (act, id, slot) => { said.push(act + ":" + id + ":" + slot); return act === "take" ? null : act === "sieve" ? (C.sieve(ve, id, slot) ? "tamisé" : "vide") : act === "lift" ? (C.lift(ve, id, slot) ? "monté" : "vide") : (C.toCompost(ve, id, slot) ? "composté" : "vide"); } }, imagerTr: () => (k) => k, view: "cellar", running: true };
CV.drawCellar(R, ctx, {}, { night: 0, ambient: 1 }, 0.3);
ok(calls > 400, "la cave se dessine (" + calls + " appels)");
const zones = R.hot.filter((h) => h.cellar === "take");
const zonesOf = (sk) => { const rr = { ...R, hot: [], glassOn: () => sk === "glass", castleOn: () => sk === "castle" }; calls = 0; CV.drawCellar(rr, ctx, {}, { night: 0, ambient: 1 }, 0.3); ok(calls > 400, sk + " : la cave se dessine (" + calls + " appels)"); return JSON.stringify(rr.hot.map((h) => [h.x, h.y, h.w, h.h, h.cellar || h.go || ""])); };
const zPlain = zonesOf("plain"); ok(zonesOf("glass") === zPlain && zonesOf("castle") === zPlain, "trois habits, les mêmes zones cliquables");
ok(zones.length === 3 && zones.some((h) => h.id === "ash" && h.slot === "winter") && zones.some((h) => h.id === "peat" && h.slot === "good:peat"), "seuls les bocaux pleins se prennent");
ok(R.hot.some((h) => h.go === "oven"), "l'échelle remonte à la machine");
const { ReltoRenderer } = require("../src/relto-render");
const click = (h) => ReltoRenderer.prototype.cellarClick.call(R, h, 100, 100);
ok(click(zones.find((h) => h.id === "ash")) && R.jarHeld && R.jarHeld.slot === "winter", "un clic sur un bocal le prend en main");
R.hot = []; CV.drawCellar(R, ctx, {}, { night: 0, ambient: 1 }, 0.3);
ok(R.hot.some((h) => h.cellar === "sieve") && R.hot.some((h) => h.cellar === "lift") && R.hot.some((h) => h.cellar === "compost") && R.hot.every((h) => h.cellar !== "take"), "bocal en main : le tamis, le monte-charge, le compost répondent ; les bocaux ne se prennent plus");
ok(click(R.hot.find((h) => h.cellar === "sieve")) && !R.jarHeld && C.jarOf(ve, "ash", "good:volcanic").n === 1 && R.flash && R.flash.text === "tamisé", "posé au tamis : trié, la main vide, une phrase");
click(R.hot.find((h) => h.cellar === "take" && h.id === "peat") || { cellar: "take", id: "peat", slot: "good:peat" }); ok(R.jarHeld && R.jarHeld.id === "peat", "le bon grain se prend aussi");
ok(click(null) && !R.jarHeld && R.flash.text === "cellar.said.back", "un clic ailleurs : le bocal retourne à sa place");
click({ cellar: "take", id: "peat", slot: "good:peat" }); ok(click({ go: "oven" }) === false && !R.jarHeld, "l'échelle : on remonte, le bocal reste en bas");
console.log(`cellar.test: ${n} vérifications`);
