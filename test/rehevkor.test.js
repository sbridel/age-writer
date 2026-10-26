"use strict";
// Le Rehevkor (src/rehevkor.js ; claude/POEMES-rehevkor.md) : vingt-cinq pages, dix-huit lues, trois entendues selon les chapitres, le fahsee.
const assert = require("assert");
const RK = require("../src/rehevkor");
const LB = require("../src/relto-lawbook");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

ok(RK.NAMES.length === 25 && RK.NAMES[0] === "fah" && RK.NAMES[24] === "fahsee" && RK.NAMES[18] === "heegator" && RK.NAMES[19] === "rish" && RK.NAMES[20] === "rigafah", "les nombres D'ni, de fah à fahsee");
for (const L of ["fr", "en"]) ok(RK.VERSES[L].length === 21 && RK.TITLES[L].length === 21 && RK.VERSES[L].every((v) => v.length > 20), `${L} : vingt et un versets et titres (dix-huit lus, trois entendus)`);
for (const L of ["fr", "en"]) { const li = RK.lien(L); ok(li.length === 5 && li.every((s) => s.length === 5) && /^Shorah/.test(li[0][0]) && /Shorah\.$/.test(li[4][4]), `${L} : le fahsee, cinq strophes de cinq vers, Shorah ouvre et ferme`); }
{ const li = RK.lien("fr"), last = (s) => s[4].replace(/[^a-zà-ÿ]+$/i, "").split(/\s+/).pop().toLowerCase(), first = (s) => s[0].split(/\s+/)[0].replace(/[^a-zà-ÿ]/gi, "").toLowerCase();
  ok([0, 1, 2, 3].every((i) => first(li[i + 1]).startsWith(last(li[i]).slice(0, 4))), "le mot de lien : le dernier mot d'une strophe ouvre la suivante"); }

/* ce que le joueur en sait */
const none = RK.pagesOf([], "fr");
ok(none.length === 25 && none.filter((p) => p.kind === "read").length === 18 && none.filter((p) => p.kind === "closed").length === 3 && none.filter((p) => p.kind === "blank").length === 4, "sans la seconde série : dix-huit lues, trois fermées, quatre blanches");
ok(none[18].verse === "" && none[18].sign === "link" && /heegator à fahsee/.test(RK.blankLine([], "fr")), "une page entendue pas encore retrouvée est blanche pour lui ; les blanches commencent à heegator");
const d14 = ["hear"], d16 = ["hear", "carry", "accord"];
ok(RK.heardOf(d14).join() === "21" && RK.pagesOf(d14, "fr")[20].kind === "heard" && RK.pagesOf(d14, "fr")[20].sign === "sun" && /le jour d'un monde est sa note/.test(RK.pagesOf(d14, "fr")[20].verse), "le 14 retrouve rigafah (21), marquée du soleil");
ok(RK.heardOf(d16).join() === "19,20,21" && /rigabree à fahsee/.test(RK.blankLine(d16, "fr")) && /trois/.test(RK.blankLine(d16, "fr")) && /three have been heard/.test(RK.blankLine(d16, "en")), "les trois entendues : les blanches commencent à rigabree");
ok(/une/.test(RK.blankLine(d14, "fr")) && /one has been heard/.test(RK.blankLine(d14, "en")), "une seule entendue : la phrase le compte");
ok(RK.pagesOf(d16, "fr")[19].sign === "hand" && RK.pagesOf(d16, "fr")[18].mirror === 2 && RK.pagesOf(d16, "fr")[19].mirror === 3 && RK.pagesOf(d16, "fr")[20].mirror === 1, "rish porte la main ; chaque page entendue est le miroir d'une lue");
ok(RK.pagesOf(d16, "xx")[0].title === RK.TITLES.en[0], "une langue inconnue : l'anglais");
/* rien du lore ni des secrets dans ce que le joueur lit */
const all = [...RK.VERSES.fr, ...RK.VERSES.en, ...RK.lien("fr").flat(), ...RK.lien("en").flat(), RK.open("fr"), RK.close("en")].join(" ");
ok(!/Bahro|serpent|Catherine|Esher|Yeesha|ardoise|slate|Torus/i.test(all), "les versets ne nomment ni les Bahro, ni le serpent, ni personne du lore");

/* les feuillets du livre */
const sh = LB.sheetsOf(d16, "fr");
ok(sh[0].kind === "front" && sh[1].kind === "lien" && sh[sh.length - 1].kind === "close" && sh.filter((s) => s.kind === "laws").length < 13 && sh.filter((s) => s.kind === "laws").reduce((n, s) => n + s.laws.length, 0) === 25 && sh.every((s) => s.kind !== "laws" || (s.laws.length >= 1 && s.laws.length <= 4)), "les feuillets : titre, fahsee, les vingt-cinq lois en feuillets de une à quatre (plus de deux par page), la fermeture");
const ctx = { font: "", measureText: (s) => ({ width: s.length * 5 }) };
ok(LB.wrap(ctx, "un deux trois quatre cinq six", 60).length >= 2 && LB.wrap(ctx, "court", 60).join() === "court", "le texte se coupe en lignes qui tiennent");

console.log(`rehevkor.test.js : ${n} vérifications ok`);
