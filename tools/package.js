"use strict";
// Construit le plugin puis les deux archives dans release/ :
//   age-writer-<version>.zip      → main.js, styles.css, manifest.json (à copier dans .obsidian/plugins/age-writer/)
//   age-writer-<version>-src.zip  → les sources du projet (sans node_modules, dist, release)
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), v = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const rel = path.join(root, "release"); fs.mkdirSync(rel, { recursive: true });
execFileSync(process.execPath, [path.join(root, "build.js")], { stdio: "inherit", cwd: root });
const zip = (out, files, cwd) => { const p = path.join(rel, out); fs.rmSync(p, { force: true }); execFileSync("zip", ["-qr", p, ...files], { cwd }); return p; };
try {
  const a = zip(`age-writer-${v}.zip`, ["main.js", "styles.css", "manifest.json"], path.join(root, "dist"));
  const b = zip(`age-writer-${v}-src.zip`, [".", "-x", "node_modules/*", "dist/*", "release/*", "test/visual/out/*"], root);
  console.log(`\narchives : ${path.relative(root, a)}, ${path.relative(root, b)}`);
} catch (e) { console.error("zip introuvable : installez-le, ou copiez dist/ à la main."); process.exit(1); }
