"use strict";
const assert = require("assert");
const S = require("../src/sound"), F = require("../src/linkfx"), M = require("../src/mech"), R = require("../src/relto-model");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// zen : tout un Relto chargé reste doux
const all = S.layersForNames(Object.keys(S.PRESETS));
const z = S.zenify(all);
ok(Object.keys(z).length <= 5, "≤ 5 couches (pad/chimes relevés)");
for (const bad of ["pulse", "organ", "thunder", "pops", "pluck", "choir", "metal", "whistle", "static"]) ok(!(bad in z), bad + " retiré");
ok(z.pad || z.chimes, "musique douce gardée");
ok(Object.keys(S.zenify({ hearth: 0.75, pad: 0.18 })).join() === "hearth,pad", "cheminée gardée");
ok(Object.keys(S.zenify({ pulse: 1, organ: 1 })).length >= 1, "jamais vide");
// fx
ok(["classic", "static", "ripple", "sweep"].includes(F.resolveMode("random", "A")), "random résolu");
ok(F.resolveMode("random", "A") === F.resolveMode("random", "A"), "random stable");
ok(new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((x) => F.resolveMode("random", x))).size > 1, "random varie selon l'Âge");
ok(F.resolveMode("ripple", "A") === "ripple", "mode fixe inchangé");
ok(F.fxParams(0.1, [], "tv").tv, "tv params");
ok(F.fxParams(0.8, [], "classic", 1, { uncertain: true }).dropP > 0 && F.fxParams(0.1, [], "classic", 1, { uncertain: true }).dropP === 0, "coupures si abîmé");
// liaison incertaine
ok(F.rollLink(0.1, 0.01, 3).kind === "ok", "sain: toujours ok");
ok(F.rollLink(0.9, 0.01, 3).kind === "flicker", "abîmé: vacille");
ok(F.rollLink(0.9, 0.6, 3).kind === "astray", "abîmé: égare");
ok(F.rollLink(0.9, 0.6, 0).kind === "ok", "sans autre livre: pas d'égarement");
let bad = 0; for (let i = 0; i < 1000; i++) if (F.rollLink(0.85, i / 1000, 2).kind !== "ok") bad++; ok(bad > 300 && bad < 800, "taux raisonnable " + bad);
// yaml
ok(M.parseFx("name: x\nfx: Static\nseed: 1") === "static", "fx: lu");
ok(M.parseFx("link_fx: random") === "random" && M.parseFx("fx: nope") === null, "valeurs");
ok(M.FX_RE.test("  fx: tv ") && !M.FX_RE.test("fx: a b"), "FX_RE");
// page cheminée
const r = R.parseReltoLibrary("page campfire: Feu | chimney 0.8 | audio=hearth");
ok(!r.problems.length && r.pages[0].effects.canvas_additions[0].type === "chimney", "chimney dans relto-library");
ok(R.PAGE_PRESETS.page_chimney, "preset page_chimney");
console.log("zen/fx ok (" + n + ")");
// niveaux
const mn = S.zenify(all, "minimal");
ok(Object.keys(mn).length <= 3, "minimal: peu de couches " + JSON.stringify(mn));
ok(!("waterfall" in mn) && !("pulse" in mn), "minimal: ni cascade ni rythme");
ok(Object.keys(S.zenify({ waterfall: 0.8, chimes: 0.35 }, "minimal")).join() !== "waterfall", "cascade adoucie en eau");
ok((S.zenify({ waterfall: 0.8 }).waterfall || 0) <= 0.16 + 1e-9, "zen: cascade plafonnée");
// livres
const A = [{ name: "Marsh", path: "Ages/Mondes/Marsh.md" }, { name: "Tower", path: "Ages/Mondes/Tower.md" }, { name: "Test1", path: "Ages/Test/Test1.md" }, { name: "Root", path: "Root.md" }];
ok(R.filterAges(A, {}).shown.length === 4, "tout par défaut");
ok(R.filterAges(A, { folders: "Ages/Mondes" }).shown.map((a) => a.name).join() === "Marsh,Tower", "folders");
ok(R.filterAges(A, { exclude: "Ages/Test, [[Root]]" }).shown.length === 3, "exclude (dossier)");
ok(R.filterAges(A, { books: "[[Marsh]], tower" }).shown.map((a) => a.name).join() === "Marsh,Tower", "books liste blanche");
ok(R.filterAges(A, { folders: "Ages", books: ["Test1", "Root"] }).shown.map((a) => a.name).join() === "Test1", "dossier ∩ liste blanche");
ok(R.filterAges(A, { folders: "Ages/Mondes" }).candidates.length === 2, "candidats");
console.log("niveaux/livres ok");
// livre-piège déclaré
ok(M.parseTrap("name: x\ntrap book\nlink: [[A]]") && M.parseTrap("trap_book") && M.parseTrap("trap: true") && M.parseTrap("livre piège"), "trap book reconnu");
ok(!M.parseTrap("trap: false") && !M.parseTrap("link: [[trap]]") && !M.parseTrap(""), "pas de faux positifs");
ok(M.TRAP_RE.test("trap book") && M.TRAP_RE.test("trap: no"), "TRAP_RE (ligne ignorée par le parseur)");
ok(!M.TRAP_RE.test("trap") && !M.TRAP_RE.test("trapped") && !M.parseTrap("trap\ntrapped"), "un mot isolé « trap » n'est pas un piège");
ok(M.parseMechanismLines("mechanism: Water Valve, telescope\npuzzle: nope").ids.join() === "water_valve,telescope" && M.parseMechanismLines("puzzle: nope").unknown[0] === "nope", "mécanismes : espaces, majuscules, virgules");
ok(M.parseDamage("damaged: 1000").damaged === 99, "pages : plafonné à 99");
ok(M.parseCover("cover: sober") === 0.7 && M.parseCover("cover: ornate") === 0.05 && M.parseCover("couverture: sobre") === 0.7 && M.parseCover("sobriety: 0.4") === 0.4 && M.parseCover("sobriété: 1") === 1 && M.parseCover("cover = plain") === 1, "cover: niveaux nommés et nombres");
ok(M.parseCover("name: x") === null && M.parseCover("cover: red") === null && M.parseCover("cover: 7") === null && !M.COVER_RE.test("panel: [[cover]]"), "cover: valeurs inconnues ignorées, pas de faux positifs");
console.log("trap ok");

const D = M.parseDamage("damaged_pages = 2\nremoved_pages: 3\nlink: [[A]]");
ok(D && D.damaged === 2 && D.removed === 3 && M.parseDamage("water") === null, "damaged_pages / removed_pages lus");
ok(M.parseDamage("damage_pages: 1").damaged === 1, "ancien nom accepté");
ok(M.DMG_RE.test("damaged_pages = 2") && M.DMG_RE.test("removed_pages: 3") && !M.DMG_RE.test("damaged_pages = x"), "DMG_RE");
const base = { axisStability: { cosmological: 100 }, stability: 100, verdict: "stable" };
const hurt = M.applyDamage(base, D);
ok(hurt.stability === 100 && hurt.verdict === "stable" && hurt.damage === D, "la stabilité de l'Âge ne change pas");
ok(Math.abs(F.unrestOf(hurt) - 0.61) < 1e-9 && F.unrestOf(base) === 0, "seule la liaison est altérée (2×0,08 + 3×0,15)");
ok(F.rollLink(0.1, 0.01, 2, { damaged: 2, removed: 0 }).kind === "flicker", "livre sain mais pages abîmées : peut vaciller");
ok(F.rollLink(0.1, 0.12, 2, { damaged: 0, removed: 2 }).kind === "astray", "pages arrachées : peut égarer");
console.log("damage ok");
// variantes du son de liaison
ok(S.LINK_VARIANTS.length >= 5, "plusieurs variantes de liaison");
let prev = null, seen = new Set(), rep = 0; for (let i = 0; i < 400; i++) { const v = S.pickLinkVariant(Math.random(), prev); if (v.id === prev) rep++; seen.add(v.id); prev = v.id; }
ok(rep === 0 && seen.size === S.LINK_VARIANTS.length, "jamais deux fois la même variante, toutes jouées");
console.log("liaison ok");
ok(R.filterAges(A, { books: [] }).shown.length === 0 && R.filterAges(A, { books: [] }).candidates.length === 4, "relto_books: [] = aucun livre");
ok(R.filterAges(A, { books: undefined }).shown.length === 4, "sans liste : tous");
console.log("livres ok");
