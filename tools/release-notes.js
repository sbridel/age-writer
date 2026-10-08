"use strict";
/**
 * Notes de version automatiques (utilisé par .github/workflows/release.yml).
 *
 *   node tools/release-notes.js <version> [tag précédent]
 *     → release-title.txt : « <version> — description courte »
 *     → release-notes.md  : le journal des changements de la version, puis l'installation
 *
 * Source, dans l'ordre :
 *   1. la section « ## <version> — description courte (date…) » de docs/NOTES-historique.md : l'en-tête donne le titre,
 *      le contenu donne le corps ;
 *   2. à défaut, les sujets des commits depuis la version précédente (merges exclus) : le titre est le plus récent.
 * Rien à écrire à la main, mais écrire la section donne de bien meilleures notes.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const FOOTER = "\n---\nInstallation : copier `main.js`, `manifest.json` et `styles.css` dans `<coffre>/.obsidian/plugins/age-writer/`.\nProjet de fan, sans lien avec Cyan Worlds.\n";
const MAX_SUBJECTS = 40, MAX_TITLE = 72;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** La section d'une version dans le journal : { heading, body } ou null. */
function sectionOf(history, version) {
  const lines = String(history || "").split(/\r?\n/), head = new RegExp("^## " + escapeRe(version) + "( |$)");
  const start = lines.findIndex((l) => head.test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return { heading: lines[start], body: lines.slice(start + 1, end).join("\n").trim() };
}

/** « ## 1.16.0 — physique des Âges (8 oct. 2026) » → « physique des Âges ». */
function shortOf(heading, version) {
  return String(heading || "").replace(new RegExp("^## " + escapeRe(version) + "\\s*[—–-]?\\s*"), "").replace(/\s*\(.*$/, "").replace(/[`*_]/g, "").trim();
}

const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

/** { title, body } d'après la version, le journal et les sujets de commits (du plus récent au plus ancien). */
function build({ version, history, subjects = [] }) {
  const clean = [...new Set(subjects.map((s) => String(s).trim()).filter((s) => s && !/^Merge\b/.test(s)))].slice(0, MAX_SUBJECTS);
  const sec = sectionOf(history, version);
  const short = (sec && shortOf(sec.heading, version)) || (clean[0] ? clip(clean[0], MAX_TITLE) : "");
  const title = short ? `${version} — ${short}` : version;
  let body;
  if (sec && sec.body) body = sec.body;
  else if (clean.length) body = "## Changements\n\n" + clean.map((s) => "- " + s).join("\n");
  else body = `Version ${version}.`;
  return { title, body: body + "\n" + FOOTER };
}

/** Les sujets de commits depuis le tag précédent (ou les derniers, sans tag). */
function gitSubjects(version, prev, cwd) {
  const git = (...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  try {
    const before = prev || git("tag", "--list", "--sort=-v:refname").split("\n").map((t) => t.trim()).filter((t) => t && t !== version)[0];
    const range = before ? [`${before}..HEAD`] : ["-n", String(MAX_SUBJECTS)];
    return git("log", "--no-merges", "--format=%s", ...range).split("\n");
  } catch {
    return [];
  }
}

if (require.main === module) {
  const version = process.argv[2], root = path.join(__dirname, "..");
  if (!version) { console.error("usage : node tools/release-notes.js <version> [tag précédent]"); process.exit(2); }
  const histFile = path.join(root, "docs", "NOTES-historique.md");
  const history = fs.existsSync(histFile) ? fs.readFileSync(histFile, "utf8") : "";
  const sec = sectionOf(history, version);
  const subjects = sec && sec.body ? [] : gitSubjects(version, process.argv[3], root);
  const { title, body } = build({ version, history, subjects });
  fs.writeFileSync("release-title.txt", title + "\n");
  fs.writeFileSync("release-notes.md", body);
  console.log(title);
}

module.exports = { build, sectionOf, shortOf, FOOTER };
