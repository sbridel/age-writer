"use strict";
// Copie dist/ dans un coffre de test : AGE_VAULT=/chemin/du/coffre npm run deploy
// (puis, dans Obsidian : désactiver / réactiver le plugin, ou « Reload app without saving »)
const fs = require("fs"), path = require("path");
const vault = process.env.AGE_VAULT;
if (!vault) { console.error("AGE_VAULT=/chemin/du/coffre npm run deploy"); process.exit(2); }
const dest = path.join(vault, ".obsidian", "plugins", "age-writer"), src = path.join(__dirname, "..", "dist");
if (!fs.existsSync(path.join(vault, ".obsidian"))) { console.error("pas de dossier .obsidian dans " + vault); process.exit(1); }
fs.mkdirSync(dest, { recursive: true });
for (const f of ["main.js", "styles.css", "manifest.json"]) fs.copyFileSync(path.join(src, f), path.join(dest, f));
console.log("copié dans " + dest);
