"use strict";
// La mesure du portage (claude/DESIGN-art-bahro.md §12.3) : sur le corpus de référence, chaque Âge stable porte le ciel (puis un lieu)
// de chaque autre Âge ; on compte, pour chaque degré de l'accord, combien de mondes portés tiennent encore (≥ 75).
//   node tools/carry-measure.js
// Le moteur seul (sans la couche physique ni les blocs de l'extension) : l'ordre de grandeur, pas le dernier mot.
const { analyseAgeBase } = require("../src/engine/analysis");
const { blockById } = require("../src/engine/registry");
const { SKY_ENTRIES } = require("../src/engine/data/sky");
const C = require("../src/carry");
const corpus = require("../test/corpus/ages");
const SKY = new Map(SKY_ENTRIES.map((e) => [e.id, e.axis]));
const axis = (id) => { const b = blockById.get(id); return b ? b.axis : SKY.get(id) || null; };
const A = (text, seed) => analyseAgeBase(text, { seed, draw: false });
const ages = corpus.filter((a) => a.lines.length).map((a) => ({ ...a, text: a.lines.join("\n"), an: A(a.lines.join("\n"), a.seed) }));
const receivers = ages.filter((a) => a.an.stability >= 75);
const DEG = ["full", "good", "rub", "clash"], NAME = { full: "unisson / octave", good: "tierce / sixte", rub: "seconde / septième", clash: "triton (avant le 17)" };
function run(kind) {
  const hold = Object.fromEntries(DEG.map((d) => [d, 0])), loss = Object.fromEntries(DEG.map((d) => [d, []])); let n = 0, before = 0;
  for (const r of receivers) for (const s of ages) {
    if (s === r) continue;
    const what = kind === "sky" ? "sky" : C.PLACES.find((f) => C.fragmentOf(s.an, f, axis).length);
    if (!what) continue;
    const ids = C.fragmentOf(s.an, what, axis, { life: true }); if (!ids.length) continue;
    const a = A(C.expandText(r.text, [{ index: -1, what, ids }], axis), r.seed); n++;
    if (a.stability >= 75) before++;
    for (const d of DEG) { const st = C.applyCosts(a, [{ what, degree: d, srcStability: s.an.stability }]).stability; if (st >= 75) hold[d]++; loss[d].push(r.an.stability - st); }
  }
  const med = (xs) => { const v = xs.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  console.log(`\n${kind === "sky" ? "Porter un ciel" : "Porter un lieu"} : ${n} paires (receveurs stables : ${receivers.length}) ; ${Math.round((100 * before) / n)} % tiennent avant tout prix (fragment seul)`);
  console.log("| degré | tiennent (≥ 75) | perte médiane |\n|---|---|---|");
  for (const d of DEG) console.log(`| ${NAME[d]} | ${Math.round((100 * hold[d]) / n)} % | ${med(loss[d])} points |`);
}
console.log(`Coefficients : couture ${C.SEAM}, dissonance ${C.DISSONANCE} (× 0 / 0,25 / 1 / 1), source malade × ${C.SICK_SHARE}`);
run("sky"); run("place");
