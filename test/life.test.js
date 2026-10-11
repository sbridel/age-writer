"use strict";
// La vie et le sol (claude/DESIGN-energie-echelles-de-vie.md, DESIGN-faune-par-milieu.md) : les blocs, ce qu'ils produisent, et les lois (boucle, échelles, sol, énergie).
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
const RG = require("../src/rigor");
const LF = require("../src/life");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const run = (level, ...lines) => AM.applyAmounts(analyseAgeBase(lines.join("\n"), { seed: "S" }), null, reg.blockById, { weights: RG.weightsOf({ rigor: level }), size: "medium" });
const set = (...ids) => new Set(ids);

// 1. les blocs : écrits ou produits, connus du moteur
for (const id of ["plankton", "microbial_mat", "mycelium", "berry_shrub", "thorn_bush", "heath_shrub", "shoal", "raptor", "deep_hunter", "cave_stalker", "carrion_beetle", "bee", "earth", "humus", "peat"]) assert.ok(reg.writableIds.has(id), id + " s'écrit");
for (const id of ["mushroom", "aeroplankton", "soil_bacteria", "humming_blooms"]) assert.ok(reg.blockById.has(id) && !reg.writableIds.has(id), id + " est un produit : il ne s'écrit pas");
const a = analyseAgeBase("water\nwind\nspore\nfog\nmycelium", { seed: "S" });
const made = new Set((a.resolved.matter.reactions || []).map((x) => (x && x.result) || x));
assert.ok(made.has("mushroom"), "mycélium + eau : le champignon naît");
assert.ok(made.has("spore_cloud") && made.has("aeroplankton"), "vent + spore → nuage de spores, puis + brume → aéroplancton : une chaîne de deux réactions");
assert.ok(analyseAgeBase("water\nash\nspore", { seed: "S" }).resolved.matter.reactions.some((x) => (x.result || x) === "soil_bacteria"), "spore + limon : les bactéries du sol");
assert.ok(analyseAgeBase("bee\nflowers", { seed: "S" }).resolved.matter.reactions.some((x) => (x.result || x) === "humming_blooms"), "abeille + fleurs : les fleurs bourdonnent");

// les variantes du champignon : lumineux avec une pierre étrange, chantant avec un cristal
const shown = (...ids) => analyseAgeBase(ids.join("\n"), { seed: "S" }).resolved.matter.reactions.filter((x) => x.result === "mushroom").map((x) => x.shown)[0];
assert.strictEqual(shown("mycelium", "water"), "mushroom", "sans catalyseur : le champignon ordinaire");
assert.strictEqual(shown("mycelium", "water", "strange_stone"), "glowing_mushroom", "avec la pierre étrange : il luit");
assert.strictEqual(shown("mycelium", "water", "crystal"), "singing_mushroom", "avec un cristal : il chante");
// 2. la boucle vie ↔ mort : un décomposeur ou un nécrophage la ferme ; un rôle d'appoint, moins bien
const open = LF.laws(set("grazer", "fern", "water"), { weights: { life: 1, soil: 1 } });
assert.ok(open && open.notes.some((n) => n.id === "openLoop") && open.delta.ecological > 0, "des animaux sans rien pour rendre les morts au sol : boucle ouverte");
assert.ok(!LF.laws(set("grazer", "fern", "water", "mycelium"), { weights: { life: 1 } }), "avec du mycélium la boucle se ferme");
assert.ok(!LF.laws(set("grazer", "fern", "water", "carrion_beetle"), { weights: { life: 1 } }), "avec un fossoyeur aussi");
const thin = LF.laws(set("hunter", "grazer", "fern", "water"), { weights: { life: 1 } });
assert.ok(thin.notes.some((n) => n.id === "thinLoop") && thin.notes[0].cost < open.notes[0].cost, "le chasseur charogne un peu : boucle fermée mais mince, moins chère que ouverte");
assert.ok(!LF.laws(set("fern", "water"), { weights: { life: 1 } }), "sans consommateur, rien à reboucler");

// 3. les échelles : le grand repose sur le petit ; un monde mouillé porte ses microbes
assert.ok(LF.laws(set("great_tree", "grazer", "mycelium", "sand"), { weights: { life: 1 } }) === null || !LF.laws(set("great_tree", "grazer", "mycelium", "sand"), { weights: { life: 1 } }).notes.some((n) => n.id === "noMicro"), "un mycélium est une base");
assert.ok(LF.laws(set("grazer", "carrion_beetle", "fern", "sand"), { weights: { life: 1 } }).notes.some((n) => n.id === "noMicro"), "du grand sur du sec sans rien de petit : sans base");
assert.ok(!(LF.laws(set("grazer", "carrion_beetle", "fern", "water"), { weights: { life: 1 } }) || { notes: [] }).notes.some((n) => n.id === "noMicro"), "l'eau porte ses microbes");

// 4. le sol : seulement s'il est écrit
assert.ok(!LF.laws(set("great_tree", "mycelium", "water"), { weights: { soil: 1, life: 1 } }), "aucun sol écrit : aucune faute");
assert.ok(LF.laws(set("great_tree", "sand", "mycelium", "water"), { weights: { soil: 1, life: 1 } }).notes.some((n) => n.id === "weakGround"), "un grand arbre sur du sable seul : sol trop meuble");
assert.ok(!(LF.laws(set("great_tree", "humus", "mycelium", "water"), { weights: { soil: 1, life: 1 } }) || { notes: [] }).notes.some((n) => n.id === "weakGround"), "l'humus porte");
assert.ok(LF.laws(set("great_tree", "salt", "water"), { weights: { soil: 1, life: 1 } }).notes.some((n) => n.id === "noEarth"), "du sel seul : pas de terre pour les racines");
assert.ok(!(LF.laws(set("great_tree", "salt", "lichen", "mycelium", "water"), { weights: { soil: 1, life: 1 } }) || { notes: [] }).notes.some((n) => n.id === "noEarth"), "un lichen en fait, de la terre");

// 5. l'énergie : le plancton veut de la lumière, le tapis de la chaleur ou de la chimie
assert.ok(LF.laws(set("plankton", "water"), { weights: { life: 1 } }).notes.some((n) => n.id === "noLight"), "plancton sans lumière");
assert.ok(!(LF.laws(set("plankton", "water", "single_sun"), { weights: { life: 1 } }) || { notes: [] }).notes.some((n) => n.id === "noLight"));
assert.ok(LF.laws(set("microbial_mat", "water"), { weights: { life: 1 } }).notes.some((n) => n.id === "noHeat"), "tapis sans chaleur ni chimie");
assert.ok(!(LF.laws(set("microbial_mat", "water", "lava"), { weights: { life: 1 } }) || { notes: [] }).notes.some((n) => n.id === "noHeat"), "la lave chauffe le tapis");

// 6. selon la rigueur : en doux, une phrase mais aucun coût ; ensuite, un coût
const g = run("gentle", "grazer", "fern", "water"), b = run("balanced", "grazer", "fern", "water"), s = run("strict", "grazer", "fern", "water");
assert.ok(g.life && LF.note(g.life, false) && /Vie/.test(LF.note(g.life, true)), "doux : la phrase est dite, en deux langues");
assert.strictEqual(g.stability, analyseAgeBase("grazer\nfern\nwater", { seed: "S" }).stability, "doux : la vie ne coûte rien");
assert.ok(b.stability <= g.stability && s.stability <= b.stability && s.stability < g.stability + 1, "équilibré et strict : un coût, croissant");
assert.strictEqual(LF.note(null, true), "", "rien à dire sans loi");
console.log("life.test.js : tout passe");
