"use strict";
// Les avertissements du contrôle CSS d'Obsidian (revue des plugins), déjà rencontrés plusieurs fois : on les refuse ici, avant
// toute publication. `display: contents` n'est que partiellement pris en charge (Obsidian 1.4.5) ; `!important` : passer par la
// spécificité des sélecteurs ou des variables CSS.
const assert = require("assert"), fs = require("fs"), path = require("path");
let n = 0;
const RULES = [
  [/display\s*:\s*contents/i, "display: contents (partiellement pris en charge par Obsidian 1.4.5) : ranger les éléments autrement (grille directe)"],
  [/!\s*important/i, "!important : augmenter la spécificité du sélecteur, ou une variable CSS"],
];
for (const f of ["styles.css", "styles.ext.css"]) {
  const lines = fs.readFileSync(path.join(__dirname, "../src", f), "utf8").split("\n");
  lines.forEach((l, i) => { const code = l.replace(/\/\*.*?\*\//g, ""); for (const [re, why] of RULES) { assert(!re.test(code), `src/${f}:${i + 1} : ${why}`); n++; } });
}
/* l'onglet Détails ne masque que les chiffres bruts : la ligne « Porté », la vie et les dosages vivent dans le même bloc (26 oct. 2026 : le joueur ne voyait pas « Porté ») */
{ const ext = fs.readFileSync(path.join(__dirname, "../src/styles.ext.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert(!/\.age-panel--stab\s+\.age-panel__debug\s*\{[^}]*display\s*:\s*none/.test(ext), "le bloc des lignes du panneau reste visible dans Détails"); n++;
  assert(/\.age-panel--stab\s+\.age-panel__costs\s*\{[^}]*display\s*:\s*none/.test(ext), "seuls les chiffres bruts sont masqués"); n++; }
console.log(`css-rules.test.js : ${n} vérifications, tout passe`);
