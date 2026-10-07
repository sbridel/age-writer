// Vérifie que chaque clé t('…') des sources existe en en et fr.
const fs = require("fs"), path = require("path");
const { D } = require("../src/i18n");
const dir = path.join(__dirname, "../src"); const keys = new Set();
for (const f of fs.readdirSync(dir)) { if (!f.endsWith(".js") || f.startsWith("visual") || f === "i18n.js") continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of s.matchAll(/\bt\(\s*"([a-z]+\.[a-z.]+?)"/g)) keys.add(m[1]);
  for (const m of s.matchAll(/this\.t\(\s*"([a-z]+\.[a-z.]+?)"/g)) keys.add(m[1]); }
keys.delete("relto.state.");
for (const s of ["active", "available", "locked", "disabled", "missing"]) keys.add("relto.state." + s);
let bad = 0;
for (const k of keys) for (const l of ["en", "fr"]) if (!D[l][k]) { console.log("MANQUE", l, k); bad++; }
for (const l of ["en", "fr"]) for (const k of Object.keys(D[l])) if (!D[l === "en" ? "fr" : "en"][k]) { console.log("ASYM", l, k); bad++; }
console.log(bad ? "FAIL" : `ok (${keys.size} clés)`); process.exit(bad ? 1 : 0);
