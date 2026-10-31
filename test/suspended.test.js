"use strict";
// 2.5 (F) : l'eau suspendue (lois 1 et 2) — la Pluie qui reste, née de la physique ; l'Eau tenue, face écrite (eau + cristal chargé).
const assert = require("assert");
const CAT = require("../src/wonders"), R = require("../src/engine/registry");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const W = (g, P) => ({ g, P }), S = (...ids) => new Set(ids);
ok(CAT.lingeringOf(S("rain"), W(0.4, 3), ["rain", "mass: 0.15", "atmosphere: 3"]).id === "lingering_rain", "pluie, faible gravité, air épais : la Pluie qui reste");
ok(CAT.lingeringOf(S("drizzle"), W(0.5, 2.2), []) !== null, "la bruine aussi");
ok(CAT.lingeringOf(S("rain"), W(0.9, 3), []) === null && CAT.lingeringOf(S("rain"), W(0.4, 1), []) === null, "il faut les deux : gravité faible et air épais");
ok(CAT.lingeringOf(S("water"), W(0.4, 3), []) === null, "sans pluie écrite : rien");
ok(JSON.stringify(CAT.lingeringOf(S("rain"), W(0.4, 3), ["rain", "mass: 0.15", "atmosphere: 3"]).pillars) === JSON.stringify(["rain", "mass: 0.15", "atmosphere: 3"]), "ses piliers : la pluie et les lignes qui la tiennent");
ok(JSON.stringify(CAT.lingeringOf(S("rain", "light_world", "thick_air"), W(0.4, 3), []).pillars) === JSON.stringify(["rain", "light_world", "thick_air"]), "ou les blocs, s'ils sont écrits");
ok(/tient sur le fil : sans « rain », « mass: 0.15 » ou « atmosphere: 3 », l'eau tombe/.test(CAT.threadNote(["rain", "mass: 0.15", "atmosphere: 3"], true)), "la phrase dit toujours qu'il tient sur le fil");
ok(/holds by a thread/.test(CAT.threadNote(["water", "charged_crystal"], false)), "en anglais aussi");
ok(JSON.stringify(CAT.heldPillars(S("water", "lightning", "crystal"))) === JSON.stringify(["water", "lightning", "crystal"]), "l'Eau tenue : l'eau, et ce qui fait le cristal chargé");
ok(R.BUILTIN_REACTIONS.some((r) => r.a === "water" && r.b === "charged_crystal" && r.result === "held_water"), "la réaction de l'Eau tenue est au moteur");
console.log(`suspended.test.js : ${n} vérifications ok`);
