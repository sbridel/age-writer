"use strict";
/**
 * Mesure la qualité des descriptions d'Âges (onglet livre, panneau) : répétitions de connecteurs, de débuts de phrase,
 * de tournures, de descripteurs. Sert d'avant/après quand on touche à src/engine/prose.js.
 *   node tools/prose-report.js [nombre d'Âges = 300] [--samples N]
 * Les Âges sont tirés de façon déterministe (mêmes Âges à chaque lancement).
 */
const { analyseAgeBase } = require("../src/engine/analysis");
const prose = require("../src/engine/prose");

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a))) || 300;
const SAMPLES = args.includes("--samples") ? Number(args[args.indexOf("--samples") + 1]) || 4 : 0;

let s = 12345;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const STARS = ["single_sun", "twin_suns", "starless", "companion_moon"], CYCLES = ["steady_cycle", "erratic_cycle", "frozen_cycle"];
const ORBITS = ["stable_orbit", "shifting_orbit", "chaotic_orbit", "close_binary_orbit", "wide_binary_orbit"];
const PHEN = ["auroras", "recurring_eclipses", "permanent_veil", "starfall", "asteroid_belt", "planet_rings", "comet"];
const HUES = ["green_sun", "red_sun", "white_sun", "blue_sun", "orange_sun", "violet_sun", "black_sun"];
const WORLDS = ["frozen_world", "lava_world", "desert_world", "ocean_world", "jungle_world"];
const BODY = ["close_orbit", "distant_orbit", "young_world", "ancient_world", "heavy_world", "light_world"];
const MATTER = "water lava stone sand salt ash iron crystal deep_cold pressure spore seed vine fern great_tree moss moth grazer burrower hunter drifter tablet lamp bridge door book wind rain fog lightning heat gold silver gems molten_core geysers thin_air".split(" ");

function makeAge(i) {
  const L = [];
  if (rnd() < 0.5) L.push(pick(STARS));
  if (rnd() < 0.35) L.push(pick(HUES));
  if (rnd() < 0.25) L.push(pick(WORLDS));
  if (rnd() < 0.4) L.push(pick(CYCLES));
  if (rnd() < 0.3) L.push(pick(ORBITS));
  if (rnd() < 0.4) L.push(pick(PHEN));
  if (rnd() < 0.2) L.push(pick(BODY));
  const k = 2 + Math.floor(rnd() * 8);
  for (let j = 0; j < k; j++) L.push(pick(MATTER));
  return { name: "Age " + i, src: [...new Set(L)].join("\n") };
}

const words = (t) => t.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
const sentences = (t) => t.split(/(?<=[.;:!?])\s+/).filter(Boolean);
function metrics(text) {
  const st = sentences(text);
  const starts = st.map((x) => words(x).slice(0, 2).join(" "));
  const dupStart = starts.length - new Set(starts).size;
  const w = words(text), grams = new Map();
  for (let i = 0; i + 3 < w.length; i++) { const g = w.slice(i, i + 4).join(" "); grams.set(g, (grams.get(g) || 0) + 1); }
  const rep4 = [...grams.values()].filter((v) => v > 1).length;
  // « adjectif, adjectif nom » : la tournure à deux descripteurs, comptée par description
  const pairs = (text.match(/\b[A-Za-z]+, [a-z]+ [a-z_]+ (meets|touches|runs into|settles against|lingers|waits|rests)\b/g) || []).length;
  return { n: st.length, dupStart, rep4, pairs, len: w.length };
}

function run(describe) {
  const tot = { n: 0, dupStart: 0, rep4: 0, pairs: 0, len: 0, withDupStart: 0, withRep4: 0 }, samples = [];
  s = 12345;
  for (let i = 0; i < N; i++) {
    const { name, src } = makeAge(i);
    const a = analyseAgeBase(src, { seed: name });
    const text = describe(a.resolved, name);
    const m = metrics(text);
    for (const k of ["n", "dupStart", "rep4", "pairs", "len"]) tot[k] += m[k];
    if (m.dupStart) tot.withDupStart++;
    if (m.rep4) tot.withRep4++;
    if (samples.length < SAMPLES) samples.push({ src, text });
  }
  return { tot, samples };
}

const { tot, samples } = run((r, name) => prose.describeAge(r, { seed: name }));
const pct = (x) => Math.round((100 * x) / N) + " %";
console.log(`${N} Âges`);
console.log(`  phrases par description           ${(tot.n / N).toFixed(1)}  (mots : ${(tot.len / N).toFixed(0)})`);
console.log(`  descriptions avec un début répété  ${pct(tot.withDupStart)}  (${(tot.dupStart / N).toFixed(2)} par description)`);
console.log(`  descriptions avec une tournure de 4 mots répétée  ${pct(tot.withRep4)}  (${(tot.rep4 / N).toFixed(2)} par description)`);
console.log(`  tournures « adj, adj nom verbe »   ${(tot.pairs / N).toFixed(2)} par description`);
for (const x of samples) console.log("\n```age\n" + x.src + "\n```\n" + x.text);
