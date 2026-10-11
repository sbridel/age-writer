"use strict";
// Le livre descriptif du Relto : la page libre ne laisse entrer que ce que le moteur comprend ; les lignes de réglage passent toujours.
const assert = require("assert"), Module = require("module");
const real = Module._load; Module._load = function (r, ...a) { return r === "obsidian" ? { ItemView: class {}, Modal: class {}, Notice: class {} } : real.call(this, r, ...a); }; // faux « obsidian »
const { hooks } = require("../src/engine/hooks");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const DB = require("../src/relto-descbook");

const text = "# Age\n\n```age\nsingle_sun\nwater\n```\n";
assert.ok(DB.understood(text, "fern").ok, "un glyphe connu entre");
assert.ok(!DB.understood(text, "xyzzy").ok, "un mot inconnu est refusé");
assert.ok(DB.understood(text, "many: water").ok && DB.understood(text, "size: large").ok && DB.understood(text, "seed: 12").ok, "les réglages passent");
assert.ok(DB.understood(text, "water").ok, "une ligne déjà écrite ne fait pas d'erreur");
assert.ok(DB.understood(DB.BLANK, "single_sun").ok && !DB.understood(DB.BLANK, "nope_nope").ok, "un livre vierge se juge de même");
assert.strictEqual(DB.understood("pas de bloc", "water").ok, false, "sans bloc age, rien à écrire");
const rows = DB.linesOf("single_sun\n# note\n\nxyzzy\nwater", { resolved: { lines: [{ raw: "xyzzy", unknown: true }, { raw: "water", unknown: false }] } });
assert.deepStrictEqual(rows, [{ text: "single_sun", unknown: false }, { text: "xyzzy", unknown: true }, { text: "water", unknown: false }], "lignes sans commentaires, avec les non comprises");
assert.ok(DB.LABEL.fr.free && DB.LABEL.en.free, "deux langues");
// le registre de l'Imageur : la lecture se demande une fois par Âge, puis se garde
const LG = require("../src/relto-ledger"); let calls = 0;
const rr = { opts: { onLedger: async (a) => { calls++; return { verdict: "It holds.", path: a.path }; } }, running: true, draw() {} };
assert.strictEqual(LG.ensureRead(rr, { path: "A.md" }), null, "pas encore lue");
setImmediate(() => {
  assert.strictEqual(LG.ensureRead(rr, { path: "A.md" }).verdict, "It holds.", "lue, puis gardée");
  assert.strictEqual(calls, 1, "une seule demande pour le même Âge");
  LG.ensureRead(rr, { path: "B.md" }); assert.strictEqual(calls, 2, "un autre Âge : une nouvelle demande");
  console.log("descbook.test.js : tout passe");
});
