#!/usr/bin/env node
"use strict";
/**
 * Construit le plugin à partir des sources (src/).
 *   npm run build   → dist/    version LISIBLE (non minifiée) : celle qu'on lit, débogue et dont on suit les erreurs
 *                   → release/ version MINIFIÉE : celle qu'on installe ou publie
 * Les deux contiennent exactement le même code ; main.js, styles.css, manifest.json (version reprise de package.json).
 *   node build.js [dossier de sortie dist] [dossier de sortie release]
 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { bundle } = require("./tools/bundle");
const here = __dirname;

/** Prototypes présents dans src/ mais pas encore branchés : hors du plugin livré (voir docs/DESIGN-physique.md). */
const NOT_SHIPPED = [];

function assemble(srcDir = here) {
  const code = bundle(path.join(srcDir, "src"), "main", { exclude: NOT_SHIPPED });
  return `"use strict";\n/* Age Writer — moteur (src/engine) + extension (src/*), assemblés par build.js. */\nmodule.exports = ${code};\n`;
}

function minify(js) {
  let esbuild;
  try { esbuild = require("esbuild"); } catch (e) { return null; }
  return esbuild.transformSync(js, { minify: true, target: "es2020", legalComments: "none" }).code;
}

function writeAll(dir, js, version) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "main.js"), js);
  fs.writeFileSync(path.join(dir, "styles.css"), fs.readFileSync(path.join(here, "src", "styles.css"), "utf8") + "\n" + fs.readFileSync(path.join(here, "src", "styles.ext.css"), "utf8"));
  const man = JSON.parse(fs.readFileSync(path.join(here, "manifest.json"), "utf8")); man.version = version;
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(man, null, 2) + "\n");
}

/**
 * Le manifest à la racine du dépôt (celui que lit le catalogue des plugins communautaires) suit la version de package.json,
 * et versions.json garde, pour chaque version, la version minimale d'Obsidian demandée.
 */
function syncManifest(version) {
  const mp = path.join(here, "manifest.json"), man = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (man.version !== version) { man.version = version; fs.writeFileSync(mp, JSON.stringify(man, null, 2) + "\n"); }
  const vp = path.join(here, "versions.json"), versions = fs.existsSync(vp) ? JSON.parse(fs.readFileSync(vp, "utf8")) : {};
  if (versions[version] !== man.minAppVersion) { versions[version] = man.minAppVersion; fs.writeFileSync(vp, JSON.stringify(versions, null, 2) + "\n"); }
}

if (require.main === module) {
  const [, , dist = path.join(here, "dist"), release = path.join(here, "release")] = process.argv;
  const version = JSON.parse(fs.readFileSync(path.join(here, "package.json"), "utf8")).version;
  try {
    const js = assemble();
    new vm.Script(js, { filename: "main.js" }); // erreur de syntaxe ⇒ arrêt
    writeAll(dist, js, version);
    syncManifest(version);
    console.log(`dist/    main.js ${(js.length / 1024).toFixed(0)} Ko (lisible)`);
    const min = minify(js);
    if (min) { new vm.Script(min, { filename: "main.min.js" }); writeAll(release, min, version); console.log(`release/ main.js ${(min.length / 1024).toFixed(0)} Ko (minifié) — v${version}`); }
    else console.log("release/ ignoré : esbuild n'est pas installé (npm install).");
  } catch (e) { console.error("\nÉCHEC : " + e.message); process.exit(1); }
}
module.exports = { assemble, minify };
