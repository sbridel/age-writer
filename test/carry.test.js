"use strict";
// Porter (src/carry.js ; claude/DESIGN-art-bahro.md §12) : la ligne, le fragment, le texte développé, le prix, les cycles.
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { blockById } = require("../src/engine/registry");
const { SKY_ENTRIES } = require("../src/engine/data/sky");
const C = require("../src/carry");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const SKY = new Map(SKY_ENTRIES.map((e) => [e.id, e.axis]));
const axis = (id) => { const b = blockById.get(id); return b ? b.axis : SKY.get(id) || null; };
const A = (lines, name) => analyseAgeBase(lines.join("\n"), { seed: name, draw: false });

/* la ligne */
const p = C.parseLine("carry: sky from Ash Tower");
ok(p && p.what === "sky" && p.from === "Ash Tower" && !p.contra && p.known, "carry: sky from Ash Tower");
ok(C.parseLine("  Carry:  forest  from  Glass Marsh  ").from === "Glass Marsh" && C.parseLine("carry: forest from Glass Marsh").what === "forest", "espaces et majuscules");
ok(C.parseLine("carry: moor from Ash Tower as sky").contra && C.parseLine("carry: moor from Ash Tower as sky").from === "Ash Tower" && !C.parseLine("carry: moor from X").known, "à contre-sens (étape C), et un mot inconnu");
ok(!C.parseLine("water") && !C.parseLine("carry sky from X") && C.isCarryLine("carry: sky from X"), "le reste n'est pas une ligne de portage");
ok(C.parseAll("water\ncarry: sky from A\nfern\ncarry: water from B").map((x) => x.index).join() === "1,3", "toutes les lignes, avec leur rang");
ok(C.WHATS.join() === "sky,desert,ice,water,fire,stone,forest,salt", "un ciel, ou l'une des sept familles de sol");

/* le fragment */
const marsh = A(["single_sun", "steady_cycle", "water", "marsh", "grass", "fern", "stone"], "Glass Marsh");
const sky = C.fragmentOf(marsh, "sky", axis);
ok(sky.includes("single_sun") && sky.includes("steady_cycle") && !sky.includes("water"), "un ciel : les pages de ciel, rien d'autre (" + sky + ")");
const water = C.fragmentOf(marsh, "water", axis, { life: true });
ok(water.includes("water") && water.includes("marsh") && !water.includes("stone") && !water.includes("single_sun"), "un lieu : sa famille, pas une autre, jamais le ciel (" + water + ")");
ok(water.includes("fern") && water.includes("grass"), "le premier lieu emporte la chaîne vivante");
const stoneNoLife = C.fragmentOf(marsh, "stone", axis, { life: false });
ok(stoneNoLife.includes("stone") && !stoneNoLife.includes("fern"), "un second lieu de la même source : sans la vie (elle est déjà partie)");
ok(C.fragmentOf(marsh, "desert", axis).length === 0, "un lieu que la source n'a pas : rien");
const react = A(["single_sun", "steady_cycle", "water", "lava"], "Steam");
const fire = C.fragmentOf(react, "fire", axis);
ok(fire.includes("lava") && fire.includes("water"), "ce qui réagit avec le lieu vient avec lui (" + fire + ")");

/* le texte développé */
const txt = ["single_sun", "steady_cycle", "sand", "carry: sky from Glass Marsh", "carry: water from Glass Marsh"].join("\n");
const done = [{ index: 3, what: "sky", ids: ["twin_suns", "steady_cycle"] }, { index: 4, what: "water", ids: ["water", "marsh"] }];
const ex = C.expandText(txt, done, axis).split("\n");
ok(!ex.some((l) => /carry/.test(l)) && ex.includes("sand") && ex.includes("twin_suns") && ex.includes("marsh"), "les lignes comprises deviennent leurs fragments");
ok(!ex.includes("single_sun") && ex.filter((l) => l === "steady_cycle").length === 1, "un ciel porté remplace le ciel écrit, sans doublon");
ok(C.expandText(txt, [], axis) === txt, "rien de compris : le texte ne change pas");

/* le prix */
ok(C.costOf("full").dissonance === 0 && C.costOf("good").dissonance === C.DISSONANCE * 0.25 && C.costOf("rub").dissonance === C.DISSONANCE && C.costOf("clash").dissonance === C.DISSONANCE, "la dissonance graduée : rien, un quart, plein, plein");
ok(C.costOf("full").total === C.SEAM && C.costOf("full", 90).sick === 0 && C.costOf("full", 55).sick > 0, "la couture se paie toujours ; une source malade se paie en plus");
const base = { axisStability: { cosmological: 100, geological: 92 }, stability: 92, verdict: "stable" };
const r1 = C.applyCosts(base, [{ what: "sky", degree: "full", srcStability: 95 }]);
ok(r1.axisStability.cosmological === 92 && r1.stability === 92 && base.axisStability.cosmological === 100, "à l'octave, la couture seule ; l'analyse d'origine n'est pas touchée");
const r2 = C.applyCosts(base, [{ what: "water", degree: "rub", srcStability: 95 }]);
ok(r2.axisStability.geological === 66 && r2.verdict === "unstable", "à la seconde : couture et dissonance sur le sol, le monde tombe");
const r3 = C.applyCosts(base, [{ what: "water", degree: "rub" }, { what: "stone", degree: "clash" }]);
ok(r3.stability < 75 && r3.verdict === "unstable", "deux lieux qui frottent : le monde ne tient plus");
ok(C.applyCosts(base, [], { cosmological: 1 }).axisStability.cosmological === 97, "la source porte aussi une couture, plus petite");

/* à contre-sens (la clause de Torus) et la boucle */
const exc = C.expandText(["single_sun", "steady_cycle", "water", "carry: forest from Night as sky"].join("\n"), [{ index: 3, what: "forest", contra: true, ids: ["fern", "grass"] }], axis).split("\n");
ok(!exc.includes("single_sun") && exc.includes("water") && exc.includes("fern"), "un lieu à contre-sens prend la place du ciel");
ok(C.costOf("full", 90, true).seam === C.SEAM && C.costOf("full", 90, false).seam === C.SEAM, "à contre-sens, une seule couture : l'octave exigée est son prix");
const rc = C.applyCosts(base, [{ what: "forest", contra: true, degree: "full", srcStability: 90 }]);
ok(rc.axisStability.cosmological === 100 - Math.round(C.SEAM * 100) && rc.axisStability.geological === 92, "à contre-sens, le prix se paie sur le ciel");
ok(C.carriesFrom("water\ncarry: sky from Day Side", "day side") && !C.carriesFrom("water\ncarry: sky from Other", "Day Side"), "la boucle : la source porte-t-elle depuis cet Âge ?");

/* la pile */
ok(C.guardOf(["R"], "S") === "" && C.guardOf(["R", "S"], "X") === "" && C.guardOf(["R", "S", "X"], "Y") === "deep", "R porte de S qui porte de X ; X ne porte plus");
ok(C.guardOf(["R"], "r") === "cycle" && C.guardOf(["R", "S"], "R") === "cycle", "un monde ne se porte pas lui-même, même par un détour");

console.log(`carry.test.js : ${n} vérifications ok`);
