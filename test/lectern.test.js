"use strict";
// Le lutrin du Relto : un même Âge, cinq titres, de plus en plus de couches ; aucun chiffre avant le Grand Maître.
const assert = require("assert");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const reg = require("../src/engine/registry");
const AM = require("../src/amounts");
const DS = require("../src/dosage");
const RG = require("../src/rigor");
const LC = require("../src/lectern");
hooks.skip = (l) => AM.AMOUNT_RE.test(l) || DS.WORLD_SIZE_RE.test(l);
const an = (...lines) => { const src = lines.join("\n"); return AM.applyAmounts(analyseAgeBase(src, { seed: "S" }), AM.parseAmounts(src), reg.blockById, { weights: RG.weightsOf({ rigor: "strict" }), size: DS.worldSize(src) }); };
const a = an("starless", "cavern_world", "sand", "size: large", "rain", "lightning", "mycelium", "grazer", "fern", "pellet", "many: pellet", "water", "xyzzy");
const read = (tier, extra) => LC.readOut(a, { tier, fr: false, prose: "A world under rock.", dosage: "Dosage · extent: x −2", depth: "It holds by a thread.", ...extra });
const kinds = (r) => r.lines.map((l) => l.kind);

const r0 = read(0), r1 = read(1), r2 = read(2), r3 = read(3), r4 = read(4);
assert.ok(a.stability < 75, "l'Âge d'essai tombe");
assert.strictEqual(r0.verdict, LC.VERDICT.en[a.verdict], "verdict en mots");
assert.strictEqual(r0.prose, "A world under rock.", "la description est toujours là");
assert.ok(r0.glyphs.includes("cavern_world") && !r0.glyphs.includes("xyzzy"), "glyphes reconnus seulement");
assert.strictEqual(r0.lines.length, 1, "Apprenti : une seule alerte");
assert.deepStrictEqual(kinds(r0), ["alert"], "Apprenti : rien d'autre");
assert.strictEqual(r0.lines[0].text, LC.alertsOf(a, false)[0].text, "c'est la plus grave");
assert.ok(LC.alertsOf(a, false)[0].rank >= LC.alertsOf(a, false).slice(-1)[0].rank, "triées de la plus grave à la moins grave");
assert.ok(r1.lines.filter((l) => l.kind === "alert").length > 1 && kinds(r1).includes("unknown"), "Scribe : toutes les alertes et les lignes inconnues");
assert.ok(!kinds(r1).includes("dose") && !kinds(r1).includes("depth"), "Scribe : pas encore de dosage ni de profondeur");
assert.ok(kinds(r2).includes("dose") && kinds(r2).includes("depth"), "Seltahn aguerri : dosage et profondeur");
assert.ok(r2.lines.every((l) => l.fam === undefined), "pas de famille avant le Maître");
assert.ok(r3.lines.some((l) => l.fam === "physics") && r3.lines.some((l) => l.fam === "life"), "Maître : la famille de chaque alerte");
assert.ok(!kinds(r3).includes("cost") && kinds(r4).includes("cost"), "les coûts en points: seulement le Grand Maître");
assert.ok(!/\d/.test(r0.lines.map((l) => l.text).join(" ")), "aucun chiffre pour l'Apprenti");
assert.ok(!r3.lines.some((l) => /−\d/.test(l.text) && l.kind === "cost"), "pas de coût en points au Maître");
// chaque titre voit au moins ce que voit le précédent
for (const [lo, hi] of [[r0, r1], [r1, r2], [r2, r3], [r3, r4]]) assert.ok(hi.lines.length >= lo.lines.length, "cumulatif");
// un Âge sans alerte : rien d'inventé, et l'Apprenti n'est jamais bloqué sans explication quand il y en a une
const calm = LC.readOut(an("single_sun", "water", "fern"), { tier: 0, fr: true, prose: "Un monde." });
assert.ok(calm && calm.lines.length <= 1, "Âge calme : au plus une ligne");
assert.strictEqual(LC.readOut(null, { tier: 0 }), null, "rien à lire sans analyse");
assert.ok(/tient|vacille|meurt/.test(LC.readOut(a, { tier: 0, fr: true }).verdict), "verdict en français");
console.log("lectern.test.js : tout passe");
