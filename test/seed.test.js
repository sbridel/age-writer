"use strict";
// La graine d'un Âge (src/engine/analysis.js, `seedName`) : le nom de la note, sauf si l'extension en connaît une autre
// (propriété `age_seed`, posée au renommage). Renommer un Âge ne change alors ni son monde tiré, ni son étoile.
const assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const { analyseAge, seedName, noteName } = require("../src/engine/analysis");
const { hooks } = require("../src/engine/hooks");
const SS = require("../src/starsystem");

ok(seedName("Ages/Glass Marsh.md") === "Glass Marsh" && noteName("Ages/Glass Marsh.md") === "Glass Marsh", "sans crochet : la graine est le nom de la note (comme la 1.3.0)");
const src = "water\nrain\nfern";
const before = analyseAge(src, { seed: seedName("Ages/Glass Marsh.md") });
hooks.seedName = (p) => (p === "Ages/Salt Fen.md" ? "Glass Marsh" : null); // la note a été renommée : sa graine reste l'ancien nom
const after = analyseAge(src, { seed: seedName("Ages/Salt Fen.md") });
ok(seedName("Ages/Salt Fen.md") === "Glass Marsh" && seedName("Ages/Other.md") === "Other", "avec `age_seed` : l'ancien nom ; sinon le nom de la note");
ok(JSON.stringify(before.resolved.lines.map((l) => l.entry && l.entry.id)) === JSON.stringify(after.resolved.lines.map((l) => l.entry && l.entry.id)), "renommé, l'Âge garde exactement son monde tiré");
ok(SS.systemOf(before, src, "Glass Marsh").key === SS.systemOf(after, src, seedName("Ages/Salt Fen.md")).key, "et son étoile (même clé, même position)");
hooks.seedName = null;
console.log(`seed: ${n} vérifications`);
