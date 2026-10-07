"use strict";
// Point d'entrée UNIQUEMENT pour les tests visuels dans un navigateur (non inclus dans main.js).
const { Dni } = require("./dni");
const M = require("./relto-model");
const { ReltoRenderer } = require("./relto-render");
function renderMany(host, ages) {
  host = host || document.body;
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const variants = [
    { h: 15, t: 3.1, env: {}, pages: ["page_islets", "page_calendar", "page_dock", "page_bench", "page_pine_trees"], label: "ISLAND day / islets+calendar+dock+bench" },
    { h: 15, t: 3.1, env: {}, pages: ["page_islets", "page_calendar", "page_dock", "page_bench", "page_pine_trees", "page_koi", "page_cat"], view: "global", label: "GLOBAL day / islets+calendar" },
    { h: 21.5, t: 4.1, env: {}, pages: ["page_islets", "page_calendar", "page_moons", "page_ponderosa", "page_maples", "page_crystal_tree"], label: "ISLAND dusk / moons + trees" },
    { h: 21.5, t: 4.1, env: {}, pages: ["page_islets", "page_calendar", "page_moons", "page_storm"], view: "global", label: "GLOBAL dusk / storm" },
    { h: 13, t: 2.7, env: {}, pages: ["page_rain", "page_birds", "page_butterflies", "page_flowers", "page_grass"], label: "ISLAND day / rain birds butterflies flowers grass" },
    { h: 13, t: 2.7, env: {}, pages: [], view: "global", label: "GLOBAL base (aucune page)" },
    { h: 14, t: 3.7, env: {}, pages: ["page_pine_trees", "page_ferns", "page_koi", "page_cat"], label: "day / trees + koi + cat (rien ne masque)" },
    { h: 21, t: 6.2, env: {}, pages: ["page_pine_trees", "page_koi", "page_cat", "page_lanterns"], label: "dusk / trees + koi + cat" },
    { h: 14, t: 2.2, env: {}, pages: ["page_koi", "page_cat"], label: "day / koi + cat (orange)" },
    { h: 22, t: 5.1, env: {}, pages: ["page_koi", "page_cat"], tune: { color: "black", name: "Nuit" }, label: "night / koi + black cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_cat"], tune: { color: "calico", name: "Pixel" }, label: "day / calico cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_cat"], tune: { color: "siamese", name: "Lune" }, label: "day / siamese cat" },
    { h: 11, t: 3.3, env: {}, pages: ["page_koi"], tuneKoi: "platinum", label: "day / platinum koi" },
    { h: 11, t: 3.3, env: {}, pages: ["page_koi"], tuneKoi: "ghost", label: "day / ghost koi" },
    { h: 14, t: 2.2, env: {}, pages: ["page_gold", "page_silver", "page_gems"], label: "day / gold+silver+gems" },
    { h: 23, t: 4.4, env: {}, pages: ["page_gold", "page_silver", "page_gems"], label: "night / gold+silver+gems" },
    { h: 22, t: 3.1, env: {}, pages: ["page_chimney", "page_fireflies"], label: "night / chimney" },
    { h: 14, t: 5.2, env: {}, pages: ["page_chimney"], label: "day / chimney" },
    { h: 18.5, t: 7.7, env: {}, pages: ["page_chimney", "page_snow"], label: "dusk / chimney + snow" },
    { h: 22.5, t: 2.4, env: { surrounding: "ocean" }, pages: ["page_fireworks", "page_lanterns"], label: "night / ocean / fireworks t=2.4" },
    { h: 22.5, t: 6.3, env: { surrounding: "ocean" }, pages: ["page_fireworks"], label: "night / ocean / fireworks t=6.3" },
    { h: 23, t: 9.1, env: {}, pages: ["page_fireworks", "page_pillars"], label: "night / fireworks+pillars t=9.1" },
    { h: 11, env: { base_terrain: "mossy_plateau" }, pages: ["page_mountain", "page_pine_trees"], label: "day / mount+pines" },
    { h: 13, env: { base_terrain: "volcanic_plateau" }, pages: ["page_mountain"], label: "day / volcanic / mount only" },
    { h: 21.2, env: { base_terrain: "obsidian_plateau" }, pages: ["page_pillars", "page_mountain", "page_aurora"], label: "dusk-night / pillars+mountains+aurora" },
    { h: 6.8, env: { surrounding: "fog_sea" }, pages: ["page_mountain", "page_pillars", "page_mist"], label: "dawn / mountains+pillars+mist" },
    { h: 0.5, env: {}, pages: ["page_fireworks", "page_pillars", "page_fireflies"], label: "midnight / fireworks+pillars+fireflies" },
    { h: 15, env: { base_terrain: "glacier" }, pages: ["page_mountain", "page_snow"], label: "day / glacier / mountains+snow" },
  ];
  variants.forEach((v, i) => {
    const relto = M.parseRelto({ seed: 19991118, environment: v.env, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: v.pages });
    const pages = v.pages.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
    if (v.tune) for (const pg of pages) for (const a of pg.additions) if (a.type === "cat") Object.assign(a, v.tune);
    if (v.tuneKoi) for (const pg of pages) for (const a of pg.additions) if (a.type === "koi") a.rare = v.tuneKoi;
    const scene = M.buildScene(relto, pages, ages);
    const c = document.createElement("canvas"); const d = document.createElement("div"); d.textContent = v.label; host.appendChild(d); host.appendChild(c);
    c.style.width = "640px"; document.body.appendChild(host);
    const r = new ReltoRenderer(c, dni); r.setScene(scene); r.setHour(v.h); if (v.view) r.view = v.view; r.draw(v.t || 3.7);
  });
}
module.exports = { renderMany };
