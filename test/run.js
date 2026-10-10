"use strict";
// Lance tous les tests (intégration sur la version lisible, puis sur la version minifiée).
const { spawnSync } = require("child_process"), path = require("path");
const runs = [["law.test.js"], ["terrain.test.js"], ["fullscreen.test.js"], ["release-notes.test.js"], ["i18n.test.js"], ["zen.test.js"], ["gen.test.js"], ["sound.test.js"], ["sound-open.test.js"], ["cover.test.js"], ["draw-amount.test.js"], ["books.test.js"], ["meow-seg.test.js"], ["relto-pages.test.js"], ["relto-scenes.test.js"], ["relto-comet.test.js"], ["sky-glyphs.test.js"], ["world-clash.test.js"], ["physics.test.js"], ["prose.test.js"], ["markup.test.js"], ["imager.test.js"], ["ageseed.test.js"], ["polish.test.js"], ["reference.test.js"], ["weather.test.js"], ["telescope.test.js"], ["dniclock.test.js"], ["starsystem.test.js"], ["beam.test.js"], ["perturbers.test.js"], ["instruments.test.js"], ["imager-guild.test.js"], ["unwritten.test.js"], ["integration.js"]];
runs.push(["integration.js", { MINIFIED: "1" }]); // la même chose sur la version minifiée (release/)
let bad = 0;
for (const [f, env] of runs) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { env: { ...process.env, ...(env || {}) }, encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || ""), failed = r.status !== 0 || /\bKO\b|FAIL/.test(out);
  console.log(`${failed ? "✗" : "✓"} ${f}${env ? " (minifié)" : ""}`);
  if (failed) { bad++; console.log(out.split("\n").filter((l) => /KO|FAIL|Error|MANQUE|at /.test(l)).slice(0, 20).join("\n")); }
}
console.log(bad ? `\n${bad} échec(s)` : "\ntout passe"); process.exit(bad ? 1 : 0);
