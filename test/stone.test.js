"use strict";
// Le chapitre 17, « La pierre » (src/story-stone.js ; claude/DESIGN-art-bahro.md §15) : le chemin, l'accord, le commandement, et l'après.
const assert = require("assert");
const S = require("../src/story-stone");
const ST = require("../src/story");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const DAY = S.DAY, T0 = Date.UTC(2026, 9, 26, 12);
const B16 = ["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard", "strange", "give", "descend", "lake", "slab", "hear", "carry", "accord"];
const mk = () => ({ done: B16.slice(), seen: {}, notes: {} });

/* le chapitre */
const ch = ST.chapterById("stone");
ok(ch && ch.book === 3 && ch.page === null && ST.nextChapter(B16).id === "stone" && ST.CHAPTERS.slice(-1)[0].id === "stone" && ST.kindOf(ch) === "explore", "le 17 suit le 16 ; pas de page ; un chapitre d'exploration");
const n17 = ST.chapterNote(ch, "fr", "La pierre"), e17 = ST.chapterNote(ch, "en", "The stone");
ok(/Je ne dors pas/.test(n17) && /descends avec la pierre/.test(n17) && /I do not sleep/.test(e17), "la lettre du 17, en deux langues");
ok(!/Bahro|serpent|ardoise|slate|Catherine|Esher|Yeesha/i.test(n17 + e17), "la lettre du 17 ne nomme rien du lore, ni le serpent");
ok(!/rends-la|garde-la|give it back|keep it/i.test(n17 + e17), "elle ne dit pas quelle fin est la bonne");

/* avant le 17, rien */
const early = { done: B16.slice(0, -1), seen: {}, notes: {} };
ok(!S.current(early) && !S.canTake(early) && !S.watch(early, 3, T0) && !S.give(early, T0), "avant le 17 : la pierre ne s'emporte pas, le temps ne compte pas");

/* le chemin, puis le commandement un jour plus tard */
const a = mk();
ok(S.current(a) && S.canTake(a) && !S.watch(a, 1, T0) && !a.stone.pathAt, "le lac au degré 1 : le chemin reste fermé, rien ne compte");
ok(S.watch(a, 2, T0) && a.stone.pathAt === T0, "le lac au degré 2 : le chemin s'ouvre, le jour commence");
ok(!S.watch(a, 0, T0 + DAY - 1) && !S.endingOf(a), "le lac retombe : le chemin ouvert une fois compte ; pas encore un jour");
ok(S.watch(a, 0, T0 + DAY) && S.endingOf(a) === "command" && a.stone.endedAt === T0 + DAY, "un jour après le chemin, la pierre au bureau : le commandement");
ok(!S.canTake(a) && !S.give(a, T0 + DAY + 5), "après la fin, la pierre ne s'emporte plus");
ok(S.tellCommand(a) && !S.tellCommand(a), "le commandement se dit une seule fois");
ok(S.placeOf(a) === "desk" && S.chamberDark(a) && !S.tracesOn(a) && S.frescoCut(a) === T0 + DAY, "le commandement : la pierre posée sur le bureau, la chambre éteinte, plus une trace, plus une fresque nouvelle");

/* l'accord */
const b = mk(); S.watch(b, 2, T0);
ok(S.give(b, T0 + 3600000) && S.endingOf(b) === "accord" && !S.give(b, T0 + 7200000), "la pierre lâchée dans la fissure : l'accord, une fois");
ok(!S.watch(b, 2, T0 + 2 * DAY) && S.endingOf(b) === "accord" && !S.tellCommand(b), "l'accord ne devient jamais le commandement");
ok(S.placeOf(b) === "gone" && S.chamberDark(b) && S.tracesOn(b) && S.frescoCut(b) === null, "l'accord : la pierre partie, la chambre éteinte (ils lient ailleurs), les traces et les fresques continuent");

/* le chapitre se clôt par l'une ou l'autre fin */
ok(!ST.check(ch, { st: mk(), cave: { degree: 1 } }).ok && ST.check(ch, { st: mk(), cave: { degree: 1 } }).why === "stonepath" && ST.check(ch, { st: mk(), cave: { degree: 2 } }).why === "stone", "17 : sans fin, ce qui manque se dit (le chemin, puis la pierre)");
ok(ST.check(ch, { st: a }).ok && ST.check(ch, { st: b }).ok, "17 : les deux fins closent");
const I18N = require("../src/i18n"); ok(["en", "fr"].every((l) => { const t = I18N.makeT(() => l); return ["story.why.stone", "story.why.stonepath", "stone.gone", "stone.command", "fissure.give", "atelier.stone.carry", "carry.why.tritone", "carry.why.sick17", "carry.copied"].every((k) => t(k) !== k); }), "les phrases du 17, en deux langues");

console.log(`stone.test.js : ${n} vérifications ok`);
