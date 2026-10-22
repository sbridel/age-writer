"use strict";
// L'accord de deux Âges (src/imager-guild.js, `accordOf`) : la voix d'un Âge est son jour, six crans par octave.
// Trois Âges de référence, figés par leur rotation écrite : une tierce, un triton, une octave (le cas de Torus).
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
const I = require("../src/imager"), GI = require("../src/imager-guild");
hooks.skip = (l) => P.isPhysicsLine(l);
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const V = (lines, name) => I.targetsOf(A(lines.join("\n"), name), name);
const day = V(["single_sun", "steady_cycle", "water", "fern", "rotation: 24"], "Accord Jour");        // 12
const third = V(["single_sun", "steady_cycle", "water", "moss", "rotation: 19"], "Accord Tierce");     // 14
const trit = V(["single_sun", "steady_cycle", "sand", "rotation: 17"], "Accord Triton");              // 15
const oct = V(["single_sun", "steady_cycle", "stone", "ice", "rotation: 12"], "Accord Octave");       // 18
ok(day.freq === 12 && third.freq === 14 && trit.freq === 15 && oct.freq === 18, `voix des Âges de référence : ${[day, third, trit, oct].map((v) => v.freq)}`);
const t = GI.accordOf(day, third), x = GI.accordOf(day, trit), o = GI.accordOf(day, oct);
ok(t.name === "third" && t.consonant && !t.octave, "24 h et 19 h : une tierce, qui sonne");
ok(x.name === "tritone" && !x.consonant, "24 h et 17 h : un triton, qui dissone");
ok(o.name === "octave" && o.consonant && o.octave, "24 h et 12 h : l'octave, la clause de Torus");
ok(t.shared.includes("water") && !GI.accordOf(day, oct).shared.includes("water"), "les cristaux partagés : l'eau, quand les deux ciels l'ont");
ok(GI.accordOf(day, day).name === "unison" && GI.accordOf(third, day).name === "third", "unisson ; l'ordre ne compte pas");
// au-delà d'une octave, on compte le reste : 12 et 19 = une octave et une seconde
ok(GI.accordOf({ freq: 12 }, { freq: 19 }).name === "second" && GI.accordOf({ freq: 12 }, { freq: 19 }).octaves === 1, "octave et seconde");
ok(GI.accordOf({ freq: 0 }, { freq: 24 }).name === "octave", "quatre octaves : toujours l'octave");
ok(GI.accordOf(null, day) === null && GI.accordOf({ freq: NaN }, day) === null, "rien sans deux voix");
// les six intervalles, un pour chaque reste
ok(GI.INTERVALS.length === 6 && [0, 1, 2, 3, 4, 5].map((r) => GI.accordOf({ freq: 6 }, { freq: 6 + r }).consonant).join() === "true,false,true,false,true,false", "pairs consonants, impairs dissonants");
console.log(`accord.test.js ok (${n} vérifications)`);
