"use strict";
// La mutation et la symbiose (src/mutation.js) : sur des Âges tirés au hasard, simulés jour après jour.
// Pas systématique (22 oct.) : un Âge sur trois sait muter ; pression pleine, une chance sur quinze ; rongé, une sur quatre par jour.
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
let stableMut = 0, rareSeen = 0, born = 0, unstable = 0, tensionOk = 0, maxSupport = 0, maxList = 0, lowered = 0, unableMut = 0;
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
      if (!s.rare && !MUT.capable(name)) unableMut++;
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
ok(unableMut === 0, `un Âge qui ne sait pas muter ne mute pas (hors événement rarissime) : ${unableMut}`);
{ let c = 0; for (let i = 0; i < 3000; i++) if (MUT.capable("Cap " + i)) c++; ok(c > 850 && c < 1150, `un Âge sur trois sait muter : ${c} / 3000`); }
ok(tensionOk === born, `chaque union fait baisser la tension (${tensionOk} / ${born})`);
ok(maxSupport <= MUT.CAP + 1e-9, `le plafond tient : ${maxSupport}`);
ok(maxList <= 4, "la suite est finie (quatre unions au plus)");
ok(lowered === 0, "une union ne fait jamais baisser un Âge");

// un cas écrit à la main : un soleil noir et de la mousse (le vivant sans lumière), sous 75
const lines = ["black_sun", "steady_cycle", "water", "moss", "fern", "lava"];
const r = analyseAgeBase(lines.join("\n"), { seed: "Couple", draw: false });
ok(r.stability < 75 && MUT.bindable(r).length > 0, `le cas a une contradiction à nouer (stabilité ${r.stability})`);
// ne sait pas muter : jamais, même pression pleine des mois durant (sauf l'événement rarissime, coupé ici)
const UN = ["Couple", "Couple 2", "Couple 3", "Couple 4", "Couple 5"].find((x) => !MUT.capable(x)), CAN = Array.from({ length: 40 }, (_, i) => "Couple " + i).find(MUT.capable);
{ const u = { mut: { pressure: 0, at: 0, list: [], rare: 1, rareDay: -1 } }; let got = null; for (let d = 0; d <= 200 && !got; d += 0.5) got = MUT.tick(u, r, UN, T0 + d * DAY); ok(!got, `${UN} ne sait pas muter : rien en 200 jours`); }
// sait muter : en moyenne environ deux mois (une chance sur quinze à chaque remplissage), jamais en quelques jours à coup sûr
{ const delays = []; for (let i = 0; i < 400; i++) { const nm = "Lent " + i; if (!MUT.capable(nm)) continue; const u = { mut: { pressure: 0, at: 0, list: [], rare: 1, rareDay: -1 } }; let d = 0, got = null; for (; d <= 720 && !got; d += 1) got = MUT.tick(u, r, nm, T0 + d * DAY); delays.push(got ? d : 720); }
  const mean = delays.reduce((x, y) => x + y, 0) / delays.length, early = delays.filter((x) => x <= 8).length / delays.length;
  ok(mean > 35 && mean < 110, `un Âge qui sait muter, sans danger : en moyenne ${mean.toFixed(0)} jours`); ok(early < 0.25, `rarement en une semaine : ${(early * 100).toFixed(0)} %`); }
// en danger (une fissure le ronge) : le monde se défend, une chance sur quatre par jour
{ let saved = 0, total = 0; for (let i = 0; i < 400; i++) { const nm = "Ronge " + i; if (!MUT.capable(nm)) continue; total++; const u = { mut: { pressure: 0, at: 0, list: [], rare: 1, rareDay: -1 } }; let got = null; for (let d = 0; d <= 5 && !got; d += 1) got = MUT.tick(u, r, nm, T0 + d * DAY, { danger: true }); if (got) saved++; }
  ok(saved / total > 0.6 && saved / total < 0.9, `en danger, muté en cinq jours : ${(saved / total * 100).toFixed(0)} %`); }
// la commande d'essai force, même un Âge qui ne sait pas muter
const a = {}; MUT.stateOf(a).pressure = 1; a.mut.force = true; a.mut.rare = 1;
const s = MUT.tick(a, MUT.applySymbioses(r, a, T0), UN, T0);
ok(s && s.type === "symbiosis" && [s.a, s.b].includes(s.keystone), `l'essai noue une union : ${s && s.a} et ${s && s.b}, tenue par ${s && s.keystone}`);
ok(CAN && MUT.capable(CAN), "il existe des Âges qui savent muter");
// une paire du catalogue passe avant une plus chère
{ const fake = { resolved: { drawn: [], triggered: [{ a: "black_sun", b: "moss", severity: "strong", axis: "ecological" }], matter: { reactions: [{ a: "water", b: "lava", type: "violent", cost: 0.1, result: "obsidian" }] } } };
  const pk = MUT.pickPair(fake, {}); ok(pk && pk.a === "water" && pk.b === "lava", `le catalogue d'abord : ${pk && pk.a} + ${pk && pk.b}`); }
const held = MUT.applySymbioses(r, a, T0 + 6 * DAY); void CAN;
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
