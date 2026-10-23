"use strict";
// Le ruban (src/ribbon-menu.js) : chaque commande du plugin est rangée dans l'un des deux menus, une seule fois, et
// aucun menu ne cite une commande qui n'existe pas. Une commande nouvelle fait échouer ce test tant qu'on ne l'a pas rangée.
const assert = require("assert"), fs = require("fs"), path = require("path");
const RM = require("../src/ribbon-menu");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const src = ["entry.js", "engine/plugin.js"].map((f) => fs.readFileSync(path.join(__dirname, "../src", f), "utf8")).join("\n");
const ids = new Set([...src.matchAll(/addCommand\(\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]));
const listed = [...RM.MAIN, ...RM.DEV].flat().map(([id]) => id);
ok(ids.size >= 30, `les commandes du plugin sont trouvées (${ids.size})`);
for (const id of ids) ok(listed.includes(id), `« ${id} » est rangée dans un menu du ruban`);
for (const id of listed) ok(ids.has(id), `le menu cite « ${id} », qui existe`);
ok(new Set(listed).size === listed.length, "aucune commande n'est rangée deux fois");
// les entrées : le nom de la palette sans préfixe, grisée si elle ne s'applique pas
const plugin = { manifest: { id: "aw" }, app: { commands: { commands: { "aw:open-relto": { name: "Age Writer: Open the Relto" }, "aw:save-age-cover": { name: "Age Writer: Save this Age's book cover (SVG)", checkCallback: () => false } } } } };
const E = RM.entriesOf(plugin, RM.MAIN).flat();
ok(E.find((e) => e.id === "aw:open-relto").title === "Open the Relto" && !E.find((e) => e.id === "aw:open-relto").disabled, "nom sans préfixe, commande active");
ok(E.find((e) => e.id === "aw:save-age-cover").disabled, "une commande qui ne s'applique pas ici est grisée");
console.log(`ribbon.test.js ok (${n} vérifications)`);
