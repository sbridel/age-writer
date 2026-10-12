"use strict";
// Loi 4, Observation (claude/DESIGN-observation.md, 3.1) : la phrase des fautes légères mûrit ; le coût, lui, ne bouge pas.
const assert = require("assert");
const OB = require("../src/observe");
const { Law } = require("../src/law");
const LEC = require("../src/lectern");
const LF = require("../src/life");
const D = OB.DAY;

// 1. l'horloge : la rigueur règle la vitesse, le titre accélère, le réglage double ou supprime les délais
const st = (days, o) => OB.stageOf(0, days * D, o);
assert.strictEqual(st(0, { rigor: "gentle" }), "cause", "doux : tout immédiat");
assert.deepStrictEqual([0, 0.9, 1, 2.9, 3].map((d) => st(d, { rigor: "balanced" })), ["sign", "sign", "symptom", "symptom", "cause"], "équilibré : 1 et 3 jours");
assert.deepStrictEqual([1.9, 2, 6.9, 7].map((d) => st(d, { rigor: "strict" })), ["sign", "symptom", "symptom", "cause"], "strict : 2 et 7 jours");
assert.deepStrictEqual([2.9, 3, 13.9, 14].map((d) => st(d, { rigor: "extreme" })), ["sign", "symptom", "symptom", "cause"], "extrême : 3 et 14 jours (le délai de condamnation)");
assert.deepStrictEqual([0, 6].map((d) => st(d, { rigor: "balanced", speed: "slow" })), ["sign", "cause"], "lente : délais doublés");
assert.strictEqual(st(1.9, { rigor: "balanced", speed: "slow" }), "sign");
assert.strictEqual(st(0, { rigor: "extreme", speed: "immediate" }), "cause", "immédiate : tout d'un coup");
assert.strictEqual(st(0, { rigor: "strict", tier: 3 }), "symptom", "un Maître saute le signe");
assert.strictEqual(st(6, { rigor: "strict", tier: 3 }), "symptom");
assert.strictEqual(st(2, { rigor: "strict", tier: 4 }), "cause", "un Grand Maître voit la cause au délai du symptôme");
assert.strictEqual(OB.stageOf(undefined, 5 * D, { rigor: "balanced" }), "sign", "une faute jamais vue commence au signe");

// 2. ce qui mûrit : la maladie et les cicatrices tirées légères ; jamais une cicatrice normale ou profonde
const blight = { id: "blight", axis: "ecological", level: "light", role: "producer", host: "grass", key: "blight:grass", prose: "x", from: [] };
const lightScar = { id: "scorched_surface", axis: "geological", level: "light", from: [{ a: "lava", b: "water", severity: "medium" }] };
const deepScar = { id: "ashen_sky", axis: "cosmological", level: "deep", from: [] };
const r = { stability: 80, verdict: "stable", axisStability: { ecological: 95 }, resolved: { scars: [blight, lightScar, deepScar] }, scars: [blight, lightScar, deepScar], life: { delta: { ecological: 0.05 }, notes: [{ id: "blight", cost: 0.05, role: "producer", host: "grass", level: "light", key: "blight:grass" }] } };
const keys = OB.faultsOf(r).map((f) => f.key);
assert.strictEqual(keys.length, 2, "la maladie et la cicatrice légère mûrissent, pas la profonde");
const atSign = OB.apply(r, {}, 0, { rigor: "balanced" });
assert.strictEqual(atSign.stability, 80, "la stabilité ne bouge pas");
assert.deepStrictEqual(atSign.axisStability, r.axisStability, "les coûts par axe non plus");
assert.strictEqual(atSign.scars[0].stage, "sign");
assert.ok(!/grass/.test(atSign.scars[0].prose) && !/grass/.test(LF.textOf(atSign.life.notes[0], false)), "au signe, ni la description ni le panneau ne nomment la plante");
assert.strictEqual(atSign.scars[1].prose, OB.SIGN.geological, "la cicatrice tirée dit sa famille, pas son nom");
assert.ok(!atSign.scars[2].stage && atSign.scars[2] === deepScar, "la cicatrice profonde est dite entière, tout de suite");
assert.strictEqual(atSign.resolved.scars, atSign.scars, "la description lit les mêmes cicatrices");
assert.ok(r.scars[0].stage === undefined && r.life.notes[0].stage === undefined, "l'analyse d'origine n'est pas modifiée");
const later = Object.fromEntries(keys.map((k) => [k, 0]));
const atCause = OB.apply(r, later, 3 * D, { rigor: "balanced" });
assert.ok(/grass/.test(atCause.scars[0].prose) && /grass/.test(LF.textOf(atCause.life.notes[0], true)), "à la cause, la plante est nommée");
assert.ok(!atCause.scars[1].prose, "à la cause, la cicatrice tirée reprend sa phrase de toujours");

// 3. le lutrin (Maître et au-dessus) : le signe ne nomme rien, le symptôme nomme la cicatrice, la cause dit d'où elle vient
const LV = { light: "light", normal: "normal", deep: "deep" };
assert.strictEqual(OB.scarLine({ ...lightScar, stage: "sign" }, LV), null);
assert.strictEqual(OB.scarLine({ ...lightScar, stage: "symptom" }, LV), "scorched_surface (light)");
assert.strictEqual(OB.scarLine(lightScar, LV), "scorched_surface (light) ← lava + water", "sans étape (doux, tests) : la cause");
assert.strictEqual(OB.scarLine({ ...blight, stage: "cause" }, LV), "blight (light) ← grass");
const lec = LEC.readOut({ ...atSign, resolved: { ...atSign.resolved, lines: [] } }, { tier: 3, fr: false });
const scarText = (lec.lines.find((l) => l.kind === "scar") || {}).text || "";
assert.ok(!/scorched_surface|blight/.test(scarText) && /ashen_sky/.test(scarText), "lutrin au signe : seule la cicatrice profonde est nommée");
assert.ok(lec.lines.some((l) => l.kind === "alert" && l.text === LF.blightText({ stage: "sign" }, false)), "lutrin au signe : la maladie dit sa famille");

// 4. l'état : la date de première apparition, rangée par graine ; une faute qui part est oubliée, qui revient repart de zéro
let now = 1000; const law = new Law({ ages: {} }, { dryMinutes: () => 15, healPerDay: () => 0.05, now: () => now });
let f = law.faults("A", ["k1"]); assert.ok(f.changed && f.seen.k1 === 1000, "première vue : maintenant");
now = 5000; f = law.faults("A", ["k1", "k2"]); assert.ok(f.changed && f.seen.k1 === 1000 && f.seen.k2 === 5000, "la vieille faute garde sa date");
f = law.faults("A", ["k1", "k2"]); assert.ok(!f.changed, "rien de neuf : rien à sauvegarder");
now = 9000; f = law.faults("A", ["k2"]); assert.ok(f.changed && !("k1" in f.seen), "réparée : oubliée");
f = law.faults("A", ["k1", "k2"]); assert.strictEqual(f.seen.k1, 9000, "revenue : une faute nouvelle");
law.faults("A", []); assert.ok(!law.state.faults.A, "plus de faute : plus d'entrée");
law.faults("B", ["k"]); law.forget("B"); assert.ok(!law.state.faults.B, "un Âge oublié oublie ses fautes");
console.log("observe.test.js : tout passe");
