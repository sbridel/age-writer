"use strict";
// Livre du Relto (src/relto-book.js) : ordre des Reltos, dernier visité, « dernière visite », bouton du ruban,
// et l'ouverture d'un Relto sans second onglet (src/ui-relto.js, openHubFile).
const assert = require("assert"), Module = require("module");
class TFile { constructor(p) { this.path = p; this.basename = p.replace(/^.*\//, "").replace(/\.md$/, ""); this.extension = "md"; } }
const notices = [];
const real = Module._load; Module._load = function (r, ...a) { return r === "obsidian" ? { Modal: class {}, FuzzySuggestModal: class {}, Notice: class { constructor(m) { notices.push(m); } }, TFile, ItemView: class {}, MarkdownRenderChild: class {}, PluginSettingTab: class {}, Setting: class {} } : real.call(this, r, ...a); };
const RBK = require("../src/relto-book"), R = require("../src/ui-relto");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const files = [new TFile("Story/Relto Story Mode 1.md"), new TFile("Ages/Relto.md"), new TFile("Ages/Lune.md"), new TFile("Ages/Autre refuge.md")];
const fm = { "Story/Relto Story Mode 1.md": { age_type: "personal_hub", relto_mode: "story" }, "Ages/Relto.md": { age_type: "personal_hub" }, "Ages/Autre refuge.md": { age_type: "personal_hub" } };
const leaves = [];
const mkLeaf = (path) => { const l = { view: path ? { file: files.find((f) => f.path === path) } : {}, detached: false, detach() { this.detached = true; leaves.splice(leaves.indexOf(this), 1); }, async openFile(f) { this.view = { file: f }; this.opened = f.path; } }; leaves.push(l); return l; };
let active = null;
const app = {
  vault: { getMarkdownFiles: () => files },
  metadataCache: { getFileCache: (f) => ({ frontmatter: fm[f.path] }) },
  workspace: { getLeavesOfType: (t) => (t === "markdown" ? leaves.filter((l) => l.view && l.view.file) : []), setActiveLeaf(l) { active = l; }, async revealLeaf() {}, getLeaf: () => mkLeaf(null) },
};
let saved = 0;
const plugin = { app, ext: {}, live: new Set(), saveExt() { saved++; }, t: (k) => k };

const hubs = RBK.hubsOf(plugin).map((f) => f.path);
ok(hubs.join("|") === "Ages/Autre refuge.md|Ages/Relto.md|Story/Relto Story Mode 1.md", "les Reltos : les refuges (par chemin), puis l'histoire ; une note ordinaire n'en est pas");
ok(RBK.lastHub(plugin) === null, "aucune visite : pas de dernier Relto");
RBK.noteVisit(plugin, files[0]); plugin.ext.reltoVisits["Ages/Relto.md"] = 1;
ok(RBK.lastHub(plugin).path === "Story/Relto Story Mode 1.md" && saved === 1, "le dernier Relto visité est gardé");
plugin.ext.reltoVisits["Gone.md"] = Date.now() + 99;
ok(RBK.lastHub(plugin).path === "Story/Relto Story Mode 1.md", "un Relto disparu du coffre n'est jamais le dernier visité");

const now = new Date(2026, 9, 18, 21, 0).getTime(), t = (k, p) => k + (p ? JSON.stringify(p) : "");
ok(RBK.visitText(t, 0, now) === "rbook.never", "jamais visité");
ok(RBK.visitText(t, new Date(2026, 9, 18, 14, 2).getTime(), now) === 'rbook.today{"h":"14:02"}', "aujourd'hui, avec l'heure");
ok(RBK.visitText(t, new Date(2026, 9, 17, 23, 0).getTime(), now) === "rbook.yesterday", "hier");
ok(RBK.visitText(t, new Date(2026, 9, 14, 9, 0).getTime(), now) === 'rbook.days{"n":4}', "il y a quelques jours");

RBK.toggleRibbon(plugin); ok(plugin.ext.reltoRibbon === "last" && notices.pop() === "rbook.ribbon.last", "la commande : le bouton mène au dernier Relto");
RBK.toggleRibbon(plugin); ok(plugin.ext.reltoRibbon === "book" && notices.pop() === "rbook.ribbon.book", "… puis de nouveau au livre");

(async () => {
  // pas d'onglet ouvert : le Relto s'ouvre dans l'onglet donné (celui du livre)
  const book = mkLeaf(null); await R.openHubFile(plugin, files[1], book);
  ok(book.opened === "Ages/Relto.md" && leaves.length === 1, "le livre laisse sa place au Relto");
  // un onglet le montre déjà : on s'y rend, sans en ouvrir un second ; le livre se ferme
  const book2 = mkLeaf(null); await R.openHubFile(plugin, files[1], book2);
  ok(active === book && book2.detached && leaves.length === 1, "le Relto déjà ouvert est rejoint : jamais deux onglets");
  await R.openHubFile(plugin, files[1]);
  ok(active === book && leaves.length === 1, "le bouton recliqué depuis une autre note : même onglet");
  ok(plugin.reltoFullArm && plugin.reltoFullArm.path === "Ages/Relto.md", "le plein écran est réarmé");
  // un onglet d'arrière-plan pas encore chargé (vue différée) se reconnaît à son état
  const deferred = { view: {}, getViewState: () => ({ state: { file: "Ages/Autre refuge.md" } }) };
  ok(R.leafShowing({ workspace: { getLeavesOfType: () => [deferred] } }, "Ages/Autre refuge.md") === deferred, "un onglet différé qui montre la note compte");
  console.log(`relto-book.test.js : ${n} vérifications, tout passe`);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
