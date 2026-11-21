"use strict";
// 2.10.12 : quelle liaison jouer selon le réglage (src/sound.js, `linkPick`), et le nom du fichier lu dans les réglages (src/entry.js).
const assert = require("assert"), fs = require("fs"), path = require("path");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
global.window = undefined;
const { linkPick } = require("../src/sound");
const draws = (mode, has) => new Set(Array.from({ length: 30 }, (_, i) => linkPick(mode, has, (i + 0.5) / 30)));
ok([...draws("classic", true)].join() === "classic", "classique : toujours le classique");
ok([...draws("new", true)].join() === "new", "à l'ancienne : toujours la nouvelle synthèse");
ok(draws("both", true).size === 2 && !draws("both", true).has("file"), "les deux : classique ou à l'ancienne, jamais le fichier");
ok([...draws("file", true)].join() === "file", "mon fichier : le fichier quand il est chargé");
ok([...draws("file", false)].join() === "new", "mon fichier, pas chargé : la nouvelle synthèse");
const all = draws("all", true); ok(all.has("classic") && all.has("new") && all.has("file"), "les trois : les trois sortent");
ok(!draws("all", false).has("file") && draws("all", false).size === 2, "les trois sans fichier : les deux synthèses");
// le nom du fichier : la même expression que dans src/entry.js
const src = fs.readFileSync(path.join(__dirname, "../src/entry.js"), "utf8"), m = src.match(/const linkFileName = (\(v\) => [^\n]+);/);
ok(m, "linkFileName est défini dans entry.js"); const linkFileName = eval(m[1]);
for (const [v, want] of [["son.mp3", "son.mp3"], ["[[son.mp3]]", "son.mp3"], ["![[Sons/liaison.mp3]]", "Sons/liaison.mp3"], ["[[Sons/liaison.mp3|ma liaison]]", "Sons/liaison.mp3"], ["  [[a.ogg#x]] ", "a.ogg"], ["", ""]]) ok(linkFileName(v) === want, `nom du fichier : ${JSON.stringify(v)} → ${want}`);
console.log(`linksound : ${n} OK`);
