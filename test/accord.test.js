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
// le degré : plein, bien, frotte, dissone
ok([0, 1, 2, 3, 4, 5, 6].map((r) => GI.accordOf({ freq: 6 }, { freq: 6 + r }).degree).join() === "full,rub,good,clash,good,rub,full", "degrés : unisson plein, seconde frotte, tierce bien, triton dissone, sixte bien, septième frotte, octave plein");
// la phrase : des mots, jamais de chiffre, dans les deux langues
const { makeT } = require("../src/i18n"), X = require("../src/ui-extras");
for (const lang of ["en", "fr"]) {
  const t = makeT(() => lang);
  for (const r of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const ac = GI.accordOf({ freq: 6, pol: 1 }, { freq: 6 + r, pol: r === 6 ? -1 : 1 }), line = X.twoVoicesLine(t, "Brume", "Cendre", ac);
    ok(line.includes("Brume") && line.includes("Cendre") && !/\d/.test(line) && !/two\./.test(line), `${lang} : « ${line} »`);
  }
}
const S = require("../src/sound"); ok(typeof S.twoVoices === "function" && S.twoVoices(12, 14, "good", 0.3) === false, "sans contexte audio, deux voix se tait sans erreur");
/* le diapason retient un monde (26 oct. 2026) : le Livre dans la fente revient sur la machine avec ses réglages d'alors ; l'étouffoir seul le fait oublier */
{ const { ReltoRenderer } = require("../src/relto-render"), R = ReltoRenderer.prototype, IM = require("../src/imager");
  const ages = [{ name: "Brume", path: "Ages/Brume.md" }, { name: "Cendre", path: "Ages/Cendre.md" }, { name: "Givre", path: "Ages/Givre.md" }];
  const easy = { idx: 0, age: ages[0], settings: IM.normalize({ freq: 7, amp: 3 }) }, saved = {};
  const me = { scene: { ages }, opts: { imagerSet: (k, v) => { saved[k] = v; } }, running: true, imager: easy, imagerState() { return this.imager; }, imagerLoad(i) { easy.idx = i; easy.age = ages[i]; easy.settings = IM.normalize(null); }, imagerSave: R.imagerSave };
  me.forkHeld = { name: "Brume", path: ages[0].path, snap: R.forkSnap.call(me, easy) };
  me.imagerLoad(2); easy.settings = IM.normalize({ freq: 1 }); /* on cherche un troisième monde */
  R.forkRecall.call(me);
  ok(easy.age.path === ages[0].path && easy.settings.freq === 7 && easy.settings.amp === 3 && saved[ages[0].path].freq === 7, "rappel : Brume revient sur le lutrin, réglée comme quand le diapason l'a retenue");
  ok(me.forkHeld && me.forkHeld.name === "Brume", "le diapason la retient toujours après le rappel");
  const g = { guild: true, gkey: "guild:x", settings: IM.normalize({ freq: 9, phase: 2 }), g: { cry: ["a", "b", null, "c"], page: 0 } }, found = [];
  const mg = { scene: { ages }, opts: {}, running: true, imager: g, imagerState() { return this.imager; }, imagerFind() { found.push(this.imager.g.cry.join()); }, imagerSave() {}, forkSig: R.forkSig };
  mg.forkHeld = { name: "Brume", snap: R.forkSnap.call(mg, g) };
  g.settings = IM.normalize({ freq: 2 }); g.g = { ...g.g, cry: [null, null, null, null] }; /* les cristaux ôtés, les boutons tournés */
  R.forkRecall.call(mg);
  ok(g.settings.freq === 9 && g.settings.phase === 2 && g.g.cry.join() === "a,b,,c" && found.length === 1, "Guilde : le rappel remet les quatre cristaux et chaque bouton, l'image se reforme");
  ok(g.recall && g.recall.sig === R.forkSig(g), "Guilde : le Livre rappelé garde son étoile, tant qu'on ne touche à rien");
}
console.log(`accord.test.js ok (${n} vérifications)`);
