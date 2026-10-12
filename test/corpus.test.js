"use strict";
// Corpus de référence : les verdicts figés ne bougent pas sans que la règle le dise (voir test/corpus/ages.js).
const fs = require("fs"), path = require("path"), assert = require("assert");
const ages = require("./corpus/ages"), { evaluate } = require("./corpus/run-one");
const LEVELS = ["gentle", "balanced", "strict", "extreme"];
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, "corpus", "expected.json"), "utf8"));
assert.ok(ages.length >= 25, "le corpus compte au moins 25 Âges");
assert.strictEqual(new Set(ages.map((a) => a.id)).size, ages.length, "identifiants uniques");
const diffs = [];
for (const a of ages) {
  assert.ok(expected[a.id], `${a.id} : absent de expected.json (node test/corpus/make.js --update)`);
  for (const l of LEVELS) {
    const got = JSON.stringify(evaluate(a, l)), want = JSON.stringify(expected[a.id][l]);
    if (got !== want) diffs.push(`${a.id} @ ${l} : attendu ${want}, obtenu ${got}`);
  }
}
for (const k of Object.keys(expected)) assert.ok(ages.some((a) => a.id === k), `${k} : dans expected.json mais plus dans le corpus`);
assert.ok(!diffs.length, `KO ${diffs.length} verdict(s) du corpus ont changé (règle voulue ? node test/corpus/make.js --update + ligne CHANGELOG) :\n` + diffs.slice(0, 12).join("\n"));
// le corpus doit couvrir tous les cas, sinon il ne protège rien
const flat = Object.values(expected).flatMap((o) => Object.values(o));
for (const v of ["stable", "unstable", "dying"]) assert.ok(flat.some((x) => x.verdict === v), `verdict ${v} couvert`);
for (const d of ["deep", "held", "thread"]) if (!flat.some((x) => x.depth === d)) console.log(`(note : profondeur ${d} non couverte)`);
assert.ok(flat.some((x) => x.scars.length), "au moins une cicatrice couverte");
console.log(`corpus.test.js ok (${ages.length} Âges × ${LEVELS.length} rigueurs)`);
