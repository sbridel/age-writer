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
const mix = draws("mix", true); ok(mix.size === 2 && mix.has("classic") && mix.has("file"), "classique ou mon fichier : les deux sortent, jamais la nouvelle synthèse");
ok([...draws("mix", false)].join() === "classic", "classique ou mon fichier, sans fichier : le classique");
// le nom du fichier : la même expression que dans src/entry.js
const src = fs.readFileSync(path.join(__dirname, "../src/entry.js"), "utf8"), m = src.match(/const linkFileName = (\(v\) => [^\n]+);/);
ok(m, "linkFileName est défini dans entry.js"); const linkFileName = eval(m[1]);
for (const [v, want] of [["son.mp3", "son.mp3"], ["[[son.mp3]]", "son.mp3"], ["![[Sons/liaison.mp3]]", "Sons/liaison.mp3"], ["[[Sons/liaison.mp3|ma liaison]]", "Sons/liaison.mp3"], ["  [[a.ogg#x]] ", "a.ogg"], ["", ""]]) ok(linkFileName(v) === want, `nom du fichier : ${JSON.stringify(v)} → ${want}`);
// retrouver le fichier : lien, chemin, nom seul, sans extension, majuscules
{ const AUDIO = src.match(/const AUDIO_EXTS = [^\n]+\n/)[0], fn = src.match(/function findAudioFile\(app, n\) \{[\s\S]*?\n\}\n/)[0];
  class TFile { constructor(p) { this.path = p; this.name = p.split("/").pop(); this.extension = this.name.includes(".") ? this.name.split(".").pop() : ""; this.basename = this.name.replace(/\.[^.]+$/, ""); } }
  const obsidian = { TFile }, files = ["Notes/liaison.md", "Sons/Liaison Myst.mp3", "Sons/autre.wav"].map((p) => new TFile(p));
  const app = { metadataCache: { getFirstLinkpathDest: (l) => files.find((f) => f.path === l || f.name === l || (f.extension === "md" && f.basename === l)) || null }, vault: { getAbstractFileByPath: (p) => files.find((f) => f.path === p) || null, getFiles: () => files } };
  const find = eval("(() => { " + AUDIO + fn + " return findAudioFile; })()");
  for (const [v, want] of [["Sons/Liaison Myst.mp3", "Sons/Liaison Myst.mp3"], ["Liaison Myst.mp3", "Sons/Liaison Myst.mp3"], ["Liaison Myst", "Sons/Liaison Myst.mp3"], ["sons/liaison myst", "Sons/Liaison Myst.mp3"], ["/Sons/autre.wav", "Sons/autre.wav"], ["autre", "Sons/autre.wav"]]) { const f = find(app, v); ok(f && f.path === want, `retrouver ${JSON.stringify(v)} → ${want}`); }
  ok(find(app, "liaison") === null, "une note du même nom n'est pas un son"); ok(find(app, "rien") === null, "introuvable : null"); }
console.log(`linksound : ${n} OK`);
