"use strict";
// 1.16.1 : descriptions d'Âges sans redites (« Beyond that… Beyond that… »), reproductibles (même Âge, même texte).
const assert = require("assert");
const { analyseAgeBase } = require("../src/engine/analysis");
const { describeAge, SKY_PROSE_GRAMMAR } = require("../src/engine/prose");
const A = (src, seed = "Prose") => analyseAgeBase(src, { seed }).resolved;

// reproductible : même Âge, même nom → même texte, quel que soit Math.random
const src = "single_sun\nauroras\nwater\nstone\nfog\ndoor\nwind\nlamp\ncrystal";
const one = describeAge(A(src), { seed: "Marais" });
const saved = Math.random;
Math.random = () => 0.999;
const two = describeAge(A(src), { seed: "Marais" });
Math.random = saved;
assert.strictEqual(one, two, "même Âge, même nom : même texte");
assert.strictEqual(Math.random, saved, "Math.random rendu intact");
const names = new Set(["A", "B", "C", "D", "E", "F"].map((n) => describeAge(A(src), { seed: n })));
assert.ok(names.size > 1, "un autre nom peut donner une autre tournure");
assert.strictEqual(describeAge(A(src)), describeAge(A(src)), "sans nom : reproductible aussi");

// plus d'anciens connecteurs, plus de « so » ou « that » devant un groupe nominal
const many = [];
let s = 99;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const POOL = "single_sun twin_suns starless companion_moon steady_cycle erratic_cycle frozen_cycle stable_orbit chaotic_orbit auroras permanent_veil starfall green_sun white_sun frozen_world ocean_world water lava stone sand salt ash iron crystal spore seed vine fern great_tree moth grazer hunter drifter tablet lamp bridge door book wind rain fog lightning heat gold geysers".split(" ");
for (let i = 0; i < 200; i++) {
  const L = [];
  for (let k = 3 + Math.floor(rnd() * 10); k > 0; k--) L.push(POOL[Math.floor(rnd() * POOL.length)]);
  many.push(describeAge(A([...new Set(L)].join("\n"), "P" + i), { seed: "P" + i }));
}
const all = many.join("\n");
for (const old of ["Beyond that, ", "One also senses that ", "Furthermore, ", "It's worth adding that ", "Not far off, "]) assert.ok(!all.includes(old), "ancien connecteur disparu : " + old);
assert.ok(!/ so a |, so the /.test(all), "plus de « so » devant un groupe nominal");
assert.ok(!/;\s*;|\.\./.test(all), "ponctuation propre");
assert.ok(SKY_PROSE_GRAMMAR.drawn_lead.every((x) => /: $/.test(x)), "l'amorce du tirage se termine par deux-points (va devant tout)");

// redites : un même connecteur jamais deux fois ; peu de débuts de phrase répétés ; peu de tournures de 4 mots répétées
const LINKS = ["All around, ", "Everywhere you look, ", "Overhead, ", "High above, ", "In the sky, ", "Above it all, ", "Here, ", "In this place, ", "For this world, ", "Further out, ", "Far overhead, ", "Out in the dark, ", "Above, ", "Meanwhile, ", "Down below, ", "Through it all, ", "Across the sky, ", "Higher still, ", "At the edge of sight, "];
const words = (t) => t.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
let dupStart = 0, rep4 = 0;
for (const t of many) {
  for (const l of LINKS) assert.ok(t.split(". " + l).length <= 2, "connecteur répété « " + l + "» dans : " + t);
  const starts = t.split(/(?<=[.;:])\s+/).map((x) => words(x).slice(0, 2).join(" "));
  if (starts.length !== new Set(starts).size) dupStart++;
  const w = words(t), seen = new Set();
  let r = false;
  for (let i = 0; i + 3 < w.length; i++) { const g = w.slice(i, i + 4).join(" "); if (seen.has(g)) r = true; seen.add(g); }
  if (r) rep4++;
}
assert.ok(dupStart / many.length < 0.1, `débuts répétés : ${dupStart}/${many.length}`);
assert.ok(rep4 / many.length < 0.1, `tournures répétées : ${rep4}/${many.length}`);

// un nom n'a ses adjectifs qu'à la première mention, ensuite « the … »
const wet = describeAge(A("water\nsalt\niron\nspore\nseed"), { seed: "Eau" });
assert.ok((wet.match(/\b[a-z]+(, [a-z]+)? water\b/gi) || []).filter((x) => !/^the /i.test(x)).length <= 1, "l'eau : décrite une fois, puis « the water » : " + wet);

// une couleur de soleil écrite remplace l'étoile unique ajoutée d'office
const hue = describeAge(A("white_sun\nwater"), { seed: "Blanc" });
assert.ok(!SKY_PROSE_GRAMMAR.lone_star.some((x) => hue.toLowerCase().includes(x)), "soleil blanc : pas de « un seul soleil » en plus");
// rien d'écrit ne s'accroche à la phrase du tirage ; un produit de réaction n'a ses adjectifs qu'une fois ; pas deux taches d'encre identiques
for (let i = 0; i < 60; i++) {
  const t = describeAge(A("twin_suns\nheavy_world", "L" + i), { seed: "L" + i });
  const lead = t.split(/(?<=\.)\s/).find((x) => SKY_PROSE_GRAMMAR.drawn_lead.some((l) => x.toLowerCase().startsWith(l.trim().toLowerCase())));
  assert.ok(!lead || !lead.includes(";"), "phrase du tirage sans « ; » : " + t);
}
const obs = describeAge(A("water\nlava\nsalt", "O"), { seed: "O" });
assert.ok(/\bthe obsidian\b/i.test(obs), "obsidienne : « the obsidian » à la seconde mention : " + obs);
const ink = describeAge(A("zorgle\nblah\nfoo", "I"), { seed: "I" });
assert.ok(new Set(SKY_PROSE_GRAMMAR.ink_blot.filter((x) => ink.toLowerCase().includes(x))).size === SKY_PROSE_GRAMMAR.ink_blot.filter((x) => ink.toLowerCase().includes(x)).length && SKY_PROSE_GRAMMAR.ink_blot.every((x) => ink.toLowerCase().split(x).length <= 2), "taches d'encre toutes différentes : " + ink);
console.log("prose : ok");
