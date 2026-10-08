"use strict";
// Notes de version automatiques (tools/release-notes.js) : titre = description courte, corps = journal des changements.
const assert = require("assert");
const fs = require("fs"), path = require("path"), os = require("os"), { spawnSync } = require("child_process");
const { build, sectionOf, shortOf } = require("../tools/release-notes");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const history = [
  "# Journal", "",
  "## 1.16.0 — physique des Âges (8 oct. 2026, nuit ; branche `physique`)", "", "- Couche physique.", "- Trois modes.", "",
  "## 1.17.6 — politique de contenu (8 oct. 2026)", "", "- Avertissement.", "",
  "## 1.18.0", "", "- Sans description.", "",
].join("\n");

// section et titre court
ok(sectionOf(history, "1.16.0").body === "- Couche physique.\n- Trois modes.", "le corps s'arrête à la section suivante");
ok(sectionOf(history, "1.17.6").body === "- Avertissement.", "dernière section avant une autre");
ok(sectionOf(history, "1.1") === null && sectionOf(history, "9.9.9") === null, "une version n'en prend pas une autre (1.1 ≠ 1.16.0)");
ok(shortOf("## 1.16.0 — physique des Âges (8 oct. 2026, nuit ; branche `physique`)", "1.16.0") === "physique des Âges", "titre court : sans date ni parenthèse");
ok(shortOf("## 1.18.0", "1.18.0") === "" && shortOf("## 1.2.0 - tiret simple", "1.2.0") === "tiret simple", "sans description / tiret simple");

// avec section : titre « version — description », corps = la section, sans pied de page
const a = build({ version: "1.16.0", history, subjects: ["ignoré"] });
ok(a.title === "1.16.0 — physique des Âges", "titre : version et description courte");
ok(a.body === "- Couche physique.\n- Trois modes.\n", "corps : exactement la section, rien d'ajouté (les commits sont ignorés)");

// section sans description : le titre vient du dernier commit
const b = build({ version: "1.18.0", history, subjects: ["Merge branch 'x'", "Add terrain blocks and places", "Fix lint"] });
ok(b.title === "1.18.0 — Add terrain blocks and places" && b.body.startsWith("- Sans description."), "section sans description : titre d'après le dernier commit");

// sans section : liste des commits (merges et doublons exclus)
const c = build({ version: "2.0.0", history, subjects: ["Merge pull request #1", "Add river", "Add river", "Fix lint"] });
ok(c.title === "2.0.0 — Add river" && c.body === "## Changements\n\n- Add river\n- Fix lint\n", "sans section : changements d'après les commits, sans pied de page");
ok(c.body.split("- Add river").length === 2, "doublons retirés");
ok(build({ version: "2.0.0", history, subjects: [] }).title === "2.0.0" && build({ version: "2.0.0", history, subjects: [] }).body === "Version 2.0.0.\n", "rien du tout : version seule");
ok(build({ version: "2.0.0", history: "", subjects: ["x".repeat(200)] }).title.length <= "2.0.0 — ".length + 72, "titre borné");

// le vrai journal du dépôt : toute version publiée a un titre lisible
const real = fs.readFileSync(path.join(__dirname, "../docs/NOTES-historique.md"), "utf8");
const v = require("../package.json").version, r = build({ version: v, history: real, subjects: [] });
ok(sectionOf(real, v) && /^\d+\.\d+\.\d+ — \S/.test(r.title), `la version courante (${v}) a une section et un titre : « ${r.title} »`);
ok(!r.body.includes("## ") && r.body.length > 80 && !/Installation|Cyan/.test(r.body.split("\n").slice(-3).join("\n")), "corps du journal courant non vide, sans pied de page");

// en ligne de commande : les deux fichiers sont écrits
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relnotes-"));
const cli = spawnSync(process.execPath, [path.join(__dirname, "../tools/release-notes.js"), v], { cwd: dir, encoding: "utf8" });
ok(cli.status === 0 && fs.readFileSync(path.join(dir, "release-title.txt"), "utf8").trim() === r.title && fs.readFileSync(path.join(dir, "release-notes.md"), "utf8") === r.body, "ligne de commande : titre et notes écrits, identiques");
console.log(`release-notes.test.js : ${n} vérifications, tout passe`);
