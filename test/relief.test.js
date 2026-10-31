"use strict";
// 2.5 (C) : le relief sort de l'intérieur (lois 5 et 12) — la forme vient de la chaleur, de l'âge, de l'air et de l'eau ; le lieu, lui, vient de la marque.
const assert = require("assert");
const M = require("../src/physics/model"), G = require("../src/genscene"), T = require("../src/physics/text");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const w = (o) => ({ heat: 1, age: 4.5, P: 1, water: "liquid", tectonics: false, ...o });
ok(M.reliefOf(w({ P: 0.001, water: "ice" })) === "craters", "ni air ni eau : cratères");
ok(M.reliefOf(w({ heat: 3 })) === "young" && M.reliefOf(w({ age: 0.6 })) === "young", "brûlant ou très jeune : arêtes");
ok(M.reliefOf(w({ tectonics: true })) === "plates", "les plaques bougent : chaînes");
ok(M.reliefOf(w({ age: 7, heat: 0.3 })) === "worn", "vieux et froid : croupes et plateaux");
ok(M.reliefOf(w({ age: 3, heat: 1 })) === "carved", "l'eau a eu le temps : vallées");
ok(M.reliefOf(w({ age: 1.2, heat: 1, P: 0.01 })) === null, "rien de marqué");
ok(M.reliefOf(null) === null, "sans physique : rien");
/* le monde usé n'a pas de surplomb, sauf s'il écrit son relief */
const base = { verdict: "stable", unrest: 0, suns: 1, ruins: [], trees: 0, soil: "stone" };
let high = 0, highT = 0; for (let s = 1; s <= 600; s++) { const seed = (s * 2654435761) >>> 0;
  if (G.viewOfForTest({ ...base, seed, phys: { relief: "worn", g: 1 } }, new Set(["stone"]), null).kind === "high") high++;
  if (G.viewOfForTest({ ...base, seed, terrain: "mountains", phys: { relief: "worn", g: 1 } }, new Set(["stone"]), null).kind === "high") highT++; }
ok(high === 0 && highT > 40, `usé : aucun surplomb (${high}) ; avec des montagnes écrites, le surplomb revient (${highT} / 600)`);
/* la fiche le dit en une phrase */
const say = (ww, lang) => T.facts({ stars: 1, starLife: 10, a: 1, liquidCore: true, field: 1, keep: 1, S: 1, Ts: 288, Teq: 288, g: 1, rotation: 24, winds: "earth", ...ww }, lang, (x) => String(x)).join(" ");
ok(/cratères restent/.test(say(w({ P: 0.001, water: "ice" }), "fr")) && /craters stay/.test(say(w({ P: 0.001, water: "ice" }), "en")), "la fiche dit les cratères (FR, EN)");
ok(/usées en croupes/.test(say(w({ age: 7, heat: 0.3 }), "fr")), "la fiche dit le monde usé");
console.log(`relief.test.js : ${n} vérifications ok`);
