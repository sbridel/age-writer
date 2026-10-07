"use strict";
// Lance tous les tests. --real : le test d'intégration tourne aussi sur le vrai main.js (base/main.js).
const { spawnSync } = require("child_process"), path = require("path");
const real = process.argv.includes("--real");
const runs = [["law.test.js"], ["i18n.test.js"], ["zen.test.js"], ["gen.test.js"], ["sound.test.js"], ["sound-open.test.js"], ["cover.test.js"], ["integration.js"]];
if (real) runs.push(["integration.js", { MAINJS: path.join(__dirname, "..", "base", "main.js") }]);
let bad = 0;
for (const [f, env] of runs) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { env: { ...process.env, ...(env || {}) }, encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || ""), failed = r.status !== 0 || /\bKO\b|FAIL/.test(out);
  console.log(`${failed ? "✗" : "✓"} ${f}${env ? " (vrai main.js)" : ""}`);
  if (failed) { bad++; console.log(out.split("\n").filter((l) => /KO|FAIL|Error|MANQUE|at /.test(l)).slice(0, 20).join("\n")); }
}
console.log(bad ? `\n${bad} échec(s)` : "\ntout passe"); process.exit(bad ? 1 : 0);
