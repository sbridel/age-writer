"use strict";
// Livres du Relto : livre des glyphes (calcul pur), modèles de notes, syntaxe relto-library (page lagon / page_lagon).
const assert = require("assert"), Module = require("module");
// faux module « obsidian » (le module des livres ne s'en sert qu'à l'exécution des fenêtres)
class TFile { constructor(p) { this.path = p; } }
const real = Module._load; Module._load = function (r, ...a) { return r === "obsidian" ? { Modal: class {}, FuzzySuggestModal: class {}, Notice: class {}, TFile } : real.call(this, r, ...a); };
const B = require("../src/relto-books"), M = require("../src/relto-model");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const ages = [
  { name: "A", path: "A.md", glyphs: ["water", "single_sun", "fern"] },
  { name: "B", path: "B.md", glyphs: ["water", "stone"] },
  { name: "C", path: "C.md" },
];
const g = B.glyphBook(ages);
ok(g[0].id === "water" && g[0].ages.join() === "A,B" && g[0].paths.join() === "A.md,B.md", "le glyphe le plus partagé vient en premier");
ok(g.length === 4 && g.map((x) => x.id).join() === "water,fern,single_sun,stone", "ordre : partage puis nom");
ok(g.find((x) => x.id === "single_sun").name === "single sun", "nom lisible");
ok(B.glyphBook([]).length === 0 && B.glyphBook(null).length === 0, "aucun Âge, aucun glyphe");
const lib = M.parseReltoLibrary("page lagon: Lagon | vegetation 0.5 palm\npage_marais: Marais | gold 0.6");
ok(lib.pages.map((p) => p.id).join() === "lagon,marais" && !lib.problems.length, "page id / page_id acceptés");
const tpl = M.parseReltoLibrary(B.RELTO_LIBRARY_TEMPLATE.match(/```relto-library\n([\s\S]*?)```/)[1]);
ok(!tpl.problems.length, "le bloc d'exemple de la note est valide (commentaires ignorés)");
const ex = B.RELTO_LIBRARY_TEMPLATE.match(/^# page (.*)$/m)[1];
ok(M.parseReltoLibrary("page " + ex).pages.length === 1, "la ligne d'exemple décommentée est une vraie page");
// openLibraryNote : crée la note avec l'exemple, ou rouvre l'existante
(async () => {
  const files = new Map(), opened = [];
  const app = {
    vault: { getMarkdownFiles: () => [...files.values()], getAbstractFileByPath: (p) => files.get(p) || null, create: async (p, body) => { const f = new TFile(p); f.body = body; files.set(p, f); return f; }, createFolder: async () => {}, cachedRead: async (f) => f.body },
    metadataCache: { getFileCache: () => null }, workspace: { getLeaf: () => ({ openFile: async (f) => opened.push(f.path) }) },
  };
  const plugin = { app, t: (k, v) => k + (v ? JSON.stringify(v) : ""), core: { libraryTemplate: "```age-library\n```" }, settings: { libraryFolder: "Lib" }, libraryPaths: new Set() };
  await B.openLibraryNote(plugin, "relto");
  ok(opened[0] === "Lib/Relto Library.md" && files.get("Lib/Relto Library.md").body.includes("```relto-library"), "crée la note du Relto avec l'exemple");
  await B.openLibraryNote(plugin, "relto");
  ok(opened[1] === "Lib/Relto Library.md" && files.size === 1, "la rouvre au lieu d'en créer une autre");
  files.set("ailleurs.md", Object.assign(new TFile("ailleurs.md"), { body: "```relto-library\npage x: X | snow\n```" })); files.delete("Lib/Relto Library.md");
  await B.openLibraryNote(plugin, "relto");
  ok(opened[2] === "ailleurs.md", "reprend une note relto-library déjà présente ailleurs");
  await B.openLibraryNote(plugin, "ages");
  ok(opened[3] === "Lib/Age Library.md", "crée la note age-library");
  plugin.libraryPaths.add("ailleurs.md"); await B.openLibraryNote(plugin, "ages");
  ok(opened[4] === "ailleurs.md", "rouvre la bibliothèque d'Âges existante");
  console.log(`✓ books.test.js (${n} contrôles)`);
})().catch((e) => { console.error("KO", e); process.exit(1); });
//.test.js (${n} contrôles)`);
