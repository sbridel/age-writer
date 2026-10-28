"use strict";
// ESSAI (Coriolis) : la rotation range les vents ; un tourbillon a besoin que le monde tourne.
const assert = require("assert");
const PH = require("../src/physics"), M = require("../src/physics/model");
const { analyseAgeBase } = require("../src/engine/analysis");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
ok(M.coriolis(24, false).regime === "earth" && M.coriolis(6, false).regime === "fast" && M.coriolis(200, false).regime === "slow" && M.coriolis(24, true).regime === "still", "les régimes de vent");
const sheetOf = (sp, extra = "") => { const t = "single_sun\nsteady_cycle\nwater\nrain\nwind\n" + extra + "spin: " + sp; const a = analyseAgeBase(t, { seed: "x", draw: false }); const r = PH.applyPhysics(a, PH.physicsOf(a, t, "x", "strict"), "strict"); return { r, s: PH.sheet(r.physics, "fr") }; };
ok(sheetOf(6).s.facts.some((f) => /Coriolis.*bandes/.test(f)), "un jour de 6 h : des vents en bandes, des cyclones");
ok(sheetOf(200).s.facts.some((f) => /une seule boucle/.test(f)), "un jour de 200 h : une seule boucle d'air");
ok(!sheetOf(24).s.facts.some((f) => /Coriolis|une seule boucle/.test(f)), "un jour terrestre : rien à dire");
const slow = sheetOf(200, "tornado\n"), fast = sheetOf(6, "tornado\n");
ok(slow.r.physics.tensions.some((x) => x.id === "spin" && x.ids.includes("tornado")) && !fast.r.physics.tensions.some((x) => x.id === "spin"), "la tornade : refusée sur un monde trop lent, pas sur un monde rapide");
ok(slow.r.stability < fast.r.stability, "le refus coûte");
console.log(`coriolis.test.js : ${n} vérifications ok`);
