"use strict";
/**
 * Banc physique des Âges : une page HTML autonome qui fait tourner le vrai code de src/physics (et l'analyse du moteur)
 * dans le navigateur. Écrit test/visual/out/banc-physique.html.   node tools/physics-bench.js
 */
const fs = require("fs"), path = require("path"), os = require("os");
const { bundle } = require("./bundle");
const root = path.join(__dirname, ".."), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aw-bench-"));
const NEED = ["engine/analysis", "engine/resolve", "engine/hooks", "engine/draw", "engine/registry", "engine/rules", "engine/data/sky", "engine/data/matter", "sky", "amounts", "wealth"];
for (const f of NEED) { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(root, "src", f + ".js"), path.join(tmp, f + ".js")); }
fs.mkdirSync(path.join(tmp, "physics"));
for (const f of fs.readdirSync(path.join(root, "src", "physics"))) fs.copyFileSync(path.join(root, "src", "physics", f), path.join(tmp, "physics", f));
fs.writeFileSync(path.join(tmp, "entry.js"), `const { analyseAgeBase } = require("./engine/analysis");
const P = require("./physics/index");
const { PHYS_RE } = require("./physics/solve");
require("./engine/hooks").hooks.skip = (line) => PHYS_RE.test(line);
module.exports = { analyseAgeBase, P, PHYS_RE };
`);
const code = "window.AW=" + bundle(tmp, "entry", { outerRequire: 'function(n){throw new Error("require "+n)}' }) + ";";
const html = fs.readFileSync(path.join(__dirname, "physics-bench.template.html"), "utf8").replace("/*AW_BUNDLE*/", () => code);
const out = path.join(root, "test", "visual", "out", "banc-physique.html");
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`écrit ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} Ko)`);
