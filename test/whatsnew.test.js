"use strict";
// Les nouveautés (src/whatsnew.js) : rien à l'installation, la fenêtre une fois après une mise à jour, jamais d'histoire.
const assert = require("assert");
const WN = require("../src/whatsnew");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
ok(WN.cmp("2.2.0", "2.1.0") === 1 && WN.cmp("2.1.0", "2.10.0") === -1 && WN.cmp("2.2.0", "2.2.0") === 0, "comparaison de versions");
ok(!WN.onStart(undefined, "2.2.0").show && WN.onStart(undefined, "2.2.0").seen === "2.2.0", "installation neuve : rien, on note la version");
ok(WN.onStart(undefined, "2.2.0", true).show && WN.onStart(undefined, "2.2.0", true).from === "0", "rien de noté mais des données d'avant : une mise à jour, la fenêtre");
ok(WN.onStart("2.1.0", "2.2.0").show && WN.onStart("2.1.0", "2.2.0").from === "2.1.0", "mise à jour : la fenêtre, depuis la version d'avant");
ok(!WN.onStart("2.2.0", "2.2.0").show, "même version : rien");
ok(!WN.onStart("2.2.0", "2.1.0").show, "retour en arrière : rien");
ok(WN.since("2.0.0", "2.2.0").map((x) => x.v).includes("2.2.0") && !WN.since("2.2.0", "2.2.0").length, "les nouveautés plus récentes que la version vue");
for (const e of WN.NEWS) for (const lang of ["fr", "en"]) {
  const d = e[lang]; ok(d && d.title && d.letter && d.sign && d.items.length >= 3, `${e.v} ${lang} : titre, lettre, signature, liste`);
  ok(!/Bahro|ardoise|slate|chapitre 1[4-7]|chapter 1[4-7]|story|histoire/i.test(JSON.stringify(d)), `${e.v} ${lang} : rien sur l'histoire`);
}
ok(WN.NEWS.every((e) => e.fr.items.length === e.en.items.length), "autant de nouveautés en français qu'en anglais");
console.log(`whatsnew.test.js : ${n} vérifications ok`);
