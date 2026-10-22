"use strict";
// Mesure de l'accord de deux Âges (src/imager-guild.js, `accordOf`) : sur le corpus de référence et sur des Âges tirés
// au hasard (les lignes courantes d'un joueur, sans rotation écrite : c'est la graine qui fixe le jour). Dit la part de
// paires qui sonnent ensemble, avec et sans l'exigence d'un cristal partagé. Usage : node tools/accord-measure.js [n]
const { analyseAgeBase } = require("../src/engine/analysis");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
const I = require("../src/imager"), GI = require("../src/imager-guild");
hooks.skip = (l) => P.isPhysicsLine(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const voice = (lines, name) => I.targetsOf(A(lines.join("\n"), name), name);
const N = +process.argv[2] || 300;
const SUNS = ["single_sun", "single_sun", "single_sun", "red_sun\nsingle_sun", "twin_suns", "orange_sun\nsingle_sun"];
const LANDS = [["water", "sand"], ["water", "fern", "grass"], ["stone", "moss"], ["water", "rain", "fog"], ["ice", "snow"], ["lava", "stone"], ["water", "coral"], ["sand", "cactus"]];
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sets = {
  corpus: require("../test/corpus/ages").map((a) => voice(a.lines, a.seed)),
  hasard: Array.from({ length: N }, (_, i) => voice([pick(SUNS), "steady_cycle", ...pick(LANDS), ...pick(LANDS).slice(0, 1)], "Monde " + i)),
};
for (const [k, vs] of Object.entries(sets)) {
  const hist = {}; for (const v of vs) hist[v.freq] = (hist[v.freq] || 0) + 1;
  let pairs = 0, cons = 0, consShared = 0; const by = {};
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const ac = GI.accordOf(vs[i], vs[j]); pairs++; by[ac.name] = (by[ac.name] || 0) + 1;
    if (ac.consonant) { cons++; if (ac.shared.length) consShared++; }
  }
  const pc = (x) => (100 * x / pairs).toFixed(1) + " %";
  console.log(`\n${k} : ${vs.length} Âges, ${pairs} paires`);
  console.log("  voix (freq : nombre d'Âges) " + Object.keys(hist).sort((a, b) => a - b).map((f) => `${f}:${hist[f]}`).join(" "));
  console.log("  intervalles " + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${pc(c)}`).join(" · "));
  console.log(`  consonantes : ${pc(cons)} ; consonantes avec un cristal partagé : ${pc(consShared)}`);
}
