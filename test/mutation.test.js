"use strict";
// La mutation et la symbiose (src/mutation.js) : sur des Âges tirés au hasard, simulés jour après jour.
// Un Âge stable ne mute pas (sauf l'événement rarissime, une fois) ; chaque union fait baisser la tension ; le plafond tient ;
// la suite est finie ; une union ne fait jamais baisser un Âge ; la clef de voûte retirée, l'union tombe ; rien ne s'use avec le temps.
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { BUILTIN_BLOCKS } = require("../src/engine/registry");
const MUT = require("../src/mutation");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const DAY = MUT.DAY, T0 = Date.UTC(2026, 9, 1);
const writable = BUILTIN_BLOCKS.filter((b) => b.writable && b.weight > 0).map((b) => b.id);
let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const SKY = ["single_sun", "twin_suns", "red_sun\nsingle_sun", "black_sun", "no_sun"], CYC = ["steady_cycle", "frozen_cycle", "erratic_cycle"];
const N = +(process.env.MUT_N || 1500);
let stableMut = 0, rareSeen = 0, born = 0, unstable = 0, tensionOk = 0, maxSupport = 0, maxList = 0, lowered = 0;
for (let i = 0; i < N; i++) {
  const lines = [SKY[i % SKY.length], CYC[Math.floor(rnd() * 3)], ...Array.from({ length: 2 + Math.floor(rnd() * 5) }, () => writable[Math.floor(rnd() * writable.length)])];
  const name = "Mut " + i, r = analyseAgeBase(lines.join("\n"), { seed: name, draw: false }), a = {};
  if (r.stability < 75) unstable++;
  for (let d = 0; d <= 40; d += 0.5) {
    const now = T0 + d * DAY, r2 = MUT.applySymbioses(r, a, now);
    if (r2.stability < r.stability) lowered++;
    const before = MUT.tensionOf(r, a), s = MUT.tick(a, r2, name, now);
    if (s) {
      born++;
      if (r.stability >= 75) { if (s.rare) rareSeen++; else stableMut++; }
      if (MUT.tensionOf(r, a) < before) tensionOk++;
    }
    const sup = (MUT.applySymbioses(r, a, now).symbioses || []).reduce((x, y) => x + y.support, 0);
    maxSupport = Math.max(maxSupport, sup); maxList = Math.max(maxList, ((a.mut && a.mut.list) || []).length);
  }
  ok(!(a.mut && a.mut.rare) || a.mut.list.filter((x) => x.rare).length <= 1, `${name} : l'événement rarissime, une fois au plus`);
}
console.log(`  ${N} Âges (${unstable} instables), ${born} unions nouées, dont ${rareSeen} par l'événement rarissime ; soutien maximal ${(maxSupport * 100).toFixed(1)} points ; au plus ${maxList} unions`);
ok(born > 0 && unstable > 0, "la simulation noue des unions");
ok(stableMut === 0, `un Âge stable ne mute pas (hors événement rarissime) : ${stableMut}`);
ok(tensionOk === born, `chaque union fait baisser la tension (${tensionOk} / ${born})`);
ok(maxSupport <= MUT.CAP + 1e-9, `le plafond tient : ${maxSupport}`);
ok(maxList <= 4, "la suite est finie (quatre unions au plus)");
ok(lowered === 0, "une union ne fait jamais baisser un Âge");

// un cas écrit à la main : un soleil noir et de la mousse (le vivant sans lumière), sous 75, pendant cinq jours
const lines = ["black_sun", "steady_cycle", "water", "moss", "fern", "lava"];
const r = analyseAgeBase(lines.join("\n"), { seed: "Couple", draw: false }), a = {};
ok(r.stability < 75 && MUT.bindable(r).length > 0, `le cas a une contradiction à nouer (stabilité ${r.stability})`);
let s = null; for (let d = 0; d <= 6 && !s; d += 0.5) s = MUT.tick(a, MUT.applySymbioses(r, a, T0 + d * DAY), "Couple", T0 + d * DAY);
ok(s && s.type === "symbiosis" && [s.a, s.b].includes(s.keystone), `la pression pleine noue une union : ${s && s.a} et ${s && s.b}, tenue par ${s && s.keystone}`);
const held = MUT.applySymbioses(r, a, T0 + 6 * DAY);
ok(held.stability > r.stability && held.symbioses[0].active, `l'union soutient le monde : ${r.stability} → ${held.stability}`);
// la fragilité : sans sa clef de voûte, l'union tombe
const without = analyseAgeBase(lines.filter((x) => x !== s.keystone).join("\n"), { seed: "Couple", draw: false });
const fell = MUT.applySymbioses(without, a, T0 + 6 * DAY);
ok(fell.symbioses[0].active === false && fell.stability === without.stability, "la clef de voûte retirée, l'union tombe");
// rien ne s'use : un an plus tard, le même soutien
const old = MUT.applySymbioses(r, a, s.at + 365 * DAY);
ok(old.symbioses[0].active && Math.abs(old.symbioses[0].support - held.symbioses[0].support) < 1e-9, "un an plus tard, l'union tient pareil : rien à entretenir");
// sans état, rien ne change : les corpus et l'empreinte de rendu restent les mêmes
ok(MUT.applySymbioses(r, {}, T0) === r && MUT.applySymbioses(r, null, T0) === r, "sans union, l'analyse est rendue telle quelle");
console.log(`mutation.test.js ok (${n} vérifications)`);
