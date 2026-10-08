"use strict";
// Âges d'exemple : le tirage est déterministe, cohérent (jamais de contradiction du moteur, jamais « mourant »), et la note de bienvenue tient debout.
const assert = require("assert");
const S = require("../src/ageseed"), P = require("../src/physics"), { analyseAgeBase } = require("../src/engine/analysis");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const SPECIAL = /^(seed|moons):/;
const base = (lines) => lines.filter((l) => !SPECIAL.test(l)).join("\n");
const check = (lines, name) => analyseAgeBase(base(lines), { seed: name, draw: true }).verdict === "stable";

// déterminisme
const a1 = S.randomAge(42), a2 = S.randomAge(42), a3 = S.randomAge(43);
ok(JSON.stringify(a1) === JSON.stringify(a2), "même graine, même Âge");
ok(JSON.stringify(a1) !== JSON.stringify(a3), "graine différente, Âge différent");
ok(/^```age\n[\s\S]+\n```$/.test(a1.text) && /^seed: \d+$/.test(a1.lines[a1.lines.length - 1]), "bloc age bien formé, graine en dernière ligne");
ok(S.randomAge(42, "en").name !== a1.name && /of/.test(S.randomAge(42, "en").name), "nom anglais");

// cohérence : sans filtre, ce que l'archétype écrit ne se contredit jamais ; avec le moteur, tous stables
const kinds = new Set(); let moons = 0, rares = 0, names = new Set();
for (let i = 0; i < 600; i++) {
  const raw = S.randomAge(i * 7919 + 1, "fr");
  const an0 = analyseAgeBase(base(raw.lines), { seed: raw.name, draw: false });
  ok(an0.verdict === "stable", "écrit seul, jamais instable : " + raw.lines.join(","));
  ok(!(an0.resolved.lines || []).some((l) => l.unknown), "aucune page inconnue : " + raw.lines.join(","));
  ok(!(an0.resolved.triggered || []).length, "aucune contradiction : " + raw.lines.join(","));
  const a = S.randomAge(i * 7919 + 1, "fr", { check });
  const an = analyseAgeBase(base(a.lines), { seed: a.name, draw: true });
  ok(an.verdict === "stable", "avec le filtre du moteur, toujours stable (tirage compris) : " + a.name);
  ok(P.applyPhysics(an, P.physicsOf(an, base(a.lines), a.name), "strict").verdict !== "dying", "physique stricte : jamais mourant");
  kinds.add(a.kind); names.add(a.name); if (a.lines.some((l) => /^moons:/.test(l))) moons++; if (a.lines.some((l) => /auroras|kelp|coral|companion_moon|eclipses|starfall/.test(l))) rares++;
}
ok(kinds.size >= 5, "tous les archétypes sortent : " + [...kinds]);
ok(names.size > 40, "des noms variés : " + names.size);
ok(moons > 5 && rares > 100 && rares < 400, "raretés présentes mais pas systématiques : " + rares);

// noms déjà pris
const taken = new Set([S.randomAge(7).name]);
ok(!taken.has(S.randomAge(7, "fr", { taken: (x) => taken.has(x) }).name), "un nom déjà pris est évité");
const note = S.randomNote(9, "fr");
ok(note.body.startsWith("# " + note.name) && /```age/.test(note.body), "note complète");

// bienvenue
for (const lang of ["fr", "en"]) {
  const w = S.welcomeNote(lang), an = analyseAgeBase(base(w.lines), { seed: w.title, draw: true });
  ok(an.verdict === "stable" && !(an.resolved.lines || []).some((l) => l.unknown) && !(an.resolved.triggered || []).length, "l'Âge d'exemple est stable et propre : " + lang);
  for (const sfx of ["", " 2", " 3", " 4"]) ok(analyseAgeBase(base(w.lines), { seed: w.title + sfx, draw: true }).verdict === "stable", "stable même renommée par collision : " + w.title + sfx);
  ok(w.body.includes("```age\n" + w.lines.join("\n") + "\n```") && w.lines.includes("kelp") && w.lines.includes("auroras") && w.lines.includes("moons: 2") && w.body.includes("seed: 1118"), "contenu de l'exemple : " + lang);
}
console.log(`ageseed : ${n} vérifications, tout passe`);
