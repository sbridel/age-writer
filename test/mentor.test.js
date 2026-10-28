"use strict";
// ESSAI : l'Âge du mentor (src/story-mentor.js) ; les voix du journal (src/journal.js), inventées.
const assert = require("assert");
const MEN = require("../src/story-mentor"), J = require("../src/journal");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
for (const id of Object.keys(MEN.MENTOR)) for (const lang of ["fr", "en"]) {
  const s = MEN.section(id, lang, "after"), r = MEN.section(id, lang, "rescue");
  ok(s && r && s !== r && /Adrin Vesparath/.test(s), `${id} ${lang} : deux textes, signés`);
  ok(!/```age/.test(s + r), `${id} ${lang} : pas de bloc age (ne compte pas comme un Âge du dossier)`);
}
const st = {}, D = 86400000, t0 = 1e12;
MEN.track(st, "rest", [], t0, 120000);
ok(!MEN.rescueDue(st, "rest", t0), "rien à l'ouverture");
const ages = [1, 2, 3].map((i) => ({ path: "A" + i, born: t0 + i * 1000 }));
MEN.track(st, "rest", ages, t0 + 60000, 120000); ok(!MEN.rescueDue(st, "rest", t0 + 60000), "l'encre fraîche ne compte pas");
MEN.track(st, "rest", ages, t0 + D, 120000); ok(!MEN.rescueDue(st, "rest", t0 + D), "trois Livres mais un seul jour : pas encore");
ok(MEN.rescueDue(st, "rest", t0 + 2 * D + 1), "trois Livres secs et deux jours : le recours");
MEN.give(st, "rest", "rescue"); ok(!MEN.rescueDue(st, "rest", t0 + 3 * D) && MEN.given(st, "rest") === "rescue", "une seule fois");
const s2 = {}; ok(!MEN.askAgain(s2, "rest", false, false) && MEN.askAgain(s2, "rest", false, false), "sans indice : la seconde demande");
const s3 = {}; ok(!MEN.askAgain(s3, "strange", true, true) && MEN.askAgain(s3, "strange", false, true), "avec indices : redemandé après le dernier");
ok(!MEN.has("zero") && !MEN.has("give"), "seulement les chapitres où l'on écrit un monde");
ok(J.voiceOf("atrus") === "archivist" && J.voiceOf("Gehn") === "master" && J.voiceOf("miller") === "traveller" && J.voiceOf("?") === "archivist", "les anciens noms des journaux restent compris");
ok(!/atrus|gehn|miller/i.test(JSON.stringify(J.VOICES) + JSON.stringify(J.LABEL)), "aucun personnage des jeux dans les voix");
console.log(`mentor.test.js : ${n} vérifications ok`);
