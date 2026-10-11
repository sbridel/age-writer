"use strict";
// La profondeur d'un équilibre par le test par retrait (claude/DESIGN-profondeur-d-equilibre.md).
const assert = require("assert");
const D = require("../src/depth");

// une analyse factice : la stabilité est 90 moins 5 par ligne « bad », et tombe à 40 si la ligne « pilier » manque
const fake = (needs) => (text) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let st = 90 - 5 * lines.filter((l) => l === "bad").length;
  for (const n of needs) if (!lines.includes(n)) st = Math.min(st, 40);
  return { stability: st };
};
const src = (...l) => l.join("\n");

// profond : aucun retrait ne le fait tomber
const deep = D.depthOf(src("a", "b", "c", "d", "e", "f"), fake([]));
assert.strictEqual(deep.state, "deep");
assert.ok(D.note(deep, false) && D.note(deep, true), "un Âge d'au moins cinq lignes, profond : une phrase");
assert.strictEqual(D.note(D.depthOf(src("a", "b"), fake([])), true), "", "un Âge de deux lignes n'est pas dit profond");

// sur le fil : une ligne le porte
const thread = D.depthOf(src("a", "pilier", "c"), fake(["pilier"]));
assert.strictEqual(thread.state, "thread");
assert.deepStrictEqual(thread.pillars.map((p) => p.line), ["pilier"]);
assert.ok(/pilier/.test(D.note(thread, true)) && /thread/.test(D.note(thread, false)) && /fil/.test(D.note(thread, true)), "la phrase nomme le pilier, en deux langues");
assert.ok(/quelques autres/.test(D.note(D.depthOf(src("p1", "p2", "c"), fake(["p1", "p2"])), true)), "plusieurs piliers : « et quelques autres »");

// tenu : un retrait fragilise (≥ 10 points) sans faire tomber
const held = D.depthOf(src("a", "bad", "bad2"), (text) => ({ stability: text.includes("bad2") ? 90 : 78 }));
assert.strictEqual(held.state, "held");

// un Âge instable n'a pas de profondeur ; les lignes de réglage et la graine ne se retirent pas
assert.strictEqual(D.depthOf(src("a", "bad", "bad", "bad", "bad", "bad", "bad", "bad"), fake([])), null, "instable : pas de profondeur");
const seen = []; D.depthOf(src("seed: 7", "a", "size: large", "# note", "b", ""), (t) => { seen.push(t); return { stability: 90 }; }, (l) => /^size:/.test(l));
assert.strictEqual(seen.length, 1 + 2, "l'Âge lui-même, puis un essai par ligne retirable (a et b seulement)");
assert.ok(seen.slice(1).every((t) => /seed: 7/.test(t) && /size: large/.test(t)), "les réglages restent dans chaque essai");
assert.ok(D.depthOf("", () => ({ stability: 90 })) === null, "rien à retirer : rien à dire");
console.log("depth.test.js : tout passe");
