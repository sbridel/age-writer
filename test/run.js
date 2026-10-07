"use strict";
// Lance tous les tests (intégration sur la version lisible, puis sur la version minifiée).
const { spawnSync } = require("child_process"), path = require("path");
const runs = [["law.test.js"], ["i18n.test.js"], ["zen.test.js"], ["gen.test.js"], ["sound.test.js"], ["sound-open.test.js"], ["cover.test.js"], ["draw-amount.test.js"], ["books.test.js"], ["meow-seg.test.js"], ["relto-pages.test.js"], ["relto-scenes.test.js"], ["integration.js"]];
runs.push(["integration.js", { MINIFIED: "1" }]); // la même chose sur la version minifiée (release/)
let bad = 0;
for (const [f, env] of runs) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { env: { ...process.env, ...(env || {}) }, encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || ""), failed = r.status !== 0 || /\bKO\b|FAIL/.test(out);
  console.log(`${failed ? "✗" : "✓"} ${f}${env ? " (minifié)" : ""}`);
  if (failed) { bad++; console.log(out.split("\n").filter((l) => /KO|FAIL|Error|MANQUE|at /.test(l)).slice(0, 20).join("\n")); }
}
console.log(bad ? `\n${bad} échec(s)` : "\ntout passe"); process.exit(bad ? 1 : 0);
