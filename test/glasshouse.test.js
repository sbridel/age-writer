"use strict";
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern" ? () => grad : k === "canvas" ? undefined : k === "getImageData" ? () => ({ data: new Uint8ClampedArray(4) }) : () => {}), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
// La Verrière (page_glasshouse) : un déguisement de la cabane, jamais de ce qu'on y clique (claude/DESIGN-verriere-art-nouveau.md).
// Pour chaque vue habillée : les zones cliquables sont les mêmes, avec et sans la page (place, taille, clés).
const make = (glass, mode = "sandbox", view = "island", hour = 22) => {
  const pages = ["page_chimney", "page_pine_trees", "page_mountain", ...(glass ? ["page_glasshouse"] : [])];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: pages, relto_mode: mode });
  const own = pages.filter((id) => !M.BUILTIN_PAGES.includes(id)).map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
  const sc = M.buildScene(relto, [...own, ...M.builtinPages({ story: mode === "story" })], []);
  const c = dom.window.document.createElement("canvas"), r = new ReltoRenderer(c, dni, { t: (k) => k });
  r.setScene(sc); r.setHour(hour); r.view = view; r.draw(3); return r;
};
const zones = (r) => JSON.stringify(r.hot.map((h) => Object.fromEntries(Object.entries(h).filter(([, v]) => typeof v !== "function").map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 100) / 100 : v]))));
ok(M.PAGE_PRESETS.page_glasshouse && M.EFFECT_TYPES.includes("glasshouse"), "la page et son effet existent");
ok(M.builtinPages().some((p) => p.id === "page_glasshouse") && !M.builtinPages({ story: true }).some((p) => p.id === "page_glasshouse"), "bac à sable : la page est au livre des pages ; histoire : non");
ok(make(true).glassOn() && !make(false).glassOn(), "attachée : la Verrière ; détachée : la cabane");
ok(!make(true, "story").glassOn(), "Relto d'histoire : jamais de Verrière");
for (const view of ["island", "global"]) for (const hour of [13, 22]) {
  const a = zones(make(false, "sandbox", view, hour)), b = zones(make(true, "sandbox", view, hour));
  ok(a === b, `${view}, ${hour} h : les zones cliquables sont identiques avec et sans la Verrière`);
}
console.log(`✓ glasshouse.test.js (${n} contrôles)`);
