"use strict";
// Dessine le Relto (vue de l'île et vue globale) avec chaque page et chaque combinaison courante : aucune exception, aucun nombre non fini,
// zones cliquables cohérentes, bascule de vue.
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let bad = 0, calls = 0;
const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, {
  get: (_, k) => {
    if (k === "canvas") return { width: 640, height: 360 };
    if (k === "measureText") return () => ({ width: 30 });
    if (k === "createLinearGradient" || k === "createRadialGradient") return (...a) => { a.forEach(chk); return grad; };
    return (...a) => { calls++; a.forEach(chk); };
  },
  set: () => true,
});
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const ids = Object.keys(M.PAGE_PRESETS);
const mkScene = (pages, extra = {}) => {
  const relto = M.parseRelto({ seed: 7, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: pages, ...extra });
  const defs = pages.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
  return M.buildScene(relto, defs, [{ name: "A", path: "A.md", verdict: "stable", stability: 90, returnTo: "Relto" }]);
};
const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni);
for (const view of ["island", "global"]) {
  r.view = view;
  for (const hour of [3, 7, 13, 19.5, 23]) {
    for (const set of [[], ids.slice(0, 11), ids.slice(11, 22), ids.slice(22), ids]) {
      r.setScene(mkScene(set)); r.setHour(hour); r.draw(1.7);
    }
  }
}
ok(calls > 1000 && bad === 0, `${calls} appels de dessin, aucun nombre non fini (${bad})`);
// chaque page seule, dans les deux vues
r.view = "island";
for (const id of ids) { r.setScene(mkScene([id])); r.setHour(12); r.draw(2.2); r.view = "global"; r.draw(2.2); r.view = "island"; }
ok(bad === 0, "chaque page seule se dessine dans les deux vues");
// bascule et zones cliquables
r.setScene(mkScene(["page_islets", "page_calendar", "page_dock", "page_bench", "page_koi", "page_cat"])); r.setHour(12);
r.draw(1); ok(r.hot.some((h) => h.tip === "Dock") && r.hot.some((h) => h.tip === "Bench") && r.hot.some((h) => /^Calendar pinnacle/.test(h.tip)) && r.hot.some((h) => h.tip === "Islet"), "zones : ponton, banc, pinacle, îlot");
let seen = null; r.opts.onView = (v) => { seen = v; };
r.setView("global"); ok(r.view === "global" && seen === "global", "setView global prévient l'interface");
ok(r.hot.some((h) => h.go === "island") && r.hot.some((h) => /^Calendar pinnacle/.test(h.tip)), "vue globale : l'île ramène à la vue de l'île, pinacle du calendrier présent");
const target = r.hot.find((h) => h.go === "island"); r.toLogical = () => [target.x + 3, target.y + 3]; r.onClick({}); ok(r.view === "island" && seen === "island", "clic sur l'île = retour à la vue de l'île");
r.setView("nimporte"); ok(r.view === "island", "vue inconnue = île");
// pages en bibliothèque
const lib = M.parseReltoLibrary("page pluie: Pluie | rain 0.9, birds 0.4 | audio=soft_rain\npage fleurs: Fleurs | flowers 0.8 red");
ok(!lib.problems.length && M.libraryPage(lib.pages[1]).additions[0].asset === "red", "bibliothèque : effets rain/birds/flowers et asset de fleur");
console.log(`✓ relto-scenes.test.js (${n} contrôles)`);
