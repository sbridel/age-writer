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
for (const view of ["island", "global", "cabin", "pillars", "pond", "pondplus", "cat", "grove"]) {
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
r.draw(1); ok(r.hot.some((h) => h.tip === "Bridge to the calendar pinnacle") && r.hot.some((h) => h.tip === "Bench") && r.hot.some((h) => /^Calendar pinnacle/.test(h.tip)) && r.hot.some((h) => h.tip === "Islet"), "zones : pont, banc, pinacle, îlot");
let seen = null; r.opts.onView = (v) => { seen = v; };
r.setView("global"); ok(r.view === "global" && seen === "global", "setView global prévient l'interface");
ok(r.hot.some((h) => h.go === "island") && r.hot.some((h) => /^Calendar pinnacle/.test(h.tip)), "vue globale : l'île ramène à la vue de l'île, pinacle du calendrier présent");
const target = r.hot.find((h) => h.go === "island"); r.toLogical = () => [target.x + 3, target.y + 3]; r.onClick({}); ok(r.view === "island" && seen === "island", "clic sur l'île = retour à la vue de l'île");
r.setView("nimporte"); ok(r.view === "island", "vue inconnue = île");
// sous-vues : cabane et piliers
r.setScene(mkScene(["page_chimney"])); r.setHour(21); r.setView("cabin");
ok(r.view === "cabin" && r.hot.some((h) => h.go === "island") && r.hot.some((h) => h.tip === "Fireplace") && r.hot.some((h) => h.book) && r.hot.some((h) => h.special === "glyphs") && r.hot.some((h) => h.special === "library"), "cabane : porte, cheminée, livres des Âges et deux livres à part");
r.setScene(mkScene([])); r.draw(1); ok(r.hot.some((h) => /^Cold hearth/.test(h.tip)), "cabane : âtre froid sans la page cheminée");
r.setView("island"); r.draw(1);
ok(r.hot.some((h) => h.go === "cabin") && !r.hot.some((h) => h.special) && !r.hot.some((h) => h.book), "île : la cabane est cliquable, étagère et gros livres sont à l'intérieur");
const hut = r.hot.find((h) => h.go === "cabin"); r.toLogical = () => [hut.x + 3, hut.y + 3]; r.onClick({}); ok(r.view === "cabin", "clic sur la cabane = intérieur");
const door = r.hot.find((h) => h.go === "island"); r.toLogical = () => [door.x + 3, door.y + 3]; r.onClick({}); ok(r.view === "island", "clic sur la porte = retour à l'île");
r.draw(1); const pil = r.hot.find((h) => h.go === "pillars"); r.toLogical = () => [pil.x + 2, pil.y + 2]; r.onClick({}); ok(r.view === "pillars" && r.hot.some((h) => /link back/.test(h.tip)), "clic sur les piliers = vue des piliers");
r.setView("island");
// sans cabane : l'étagère et les livres à part restent dehors
r.setScene(mkScene([], { structures: ["bookshelves"] })); r.draw(1); ok(r.hot.some((h) => h.book) && r.hot.some((h) => h.special), "sans cabane : étagère dehors comme avant");
// plan de l'île : aucun chevauchement entre gros éléments, tout posé dans l'île ; vues rapprochées
const FULL = ["page_chimney", "page_koi", "page_cat", "page_stalk_tree", "page_bench", "page_pillars", "page_mountain", "page_waterfall", "page_lanterns", "page_pine_trees", "page_flowers"];
const sceneFull = mkScene(FULL.filter((id) => M.PAGE_PRESETS[id])), lay = M.layoutIsland(sceneFull);
const boxes = Object.entries(lay.items).map(([id, b]) => [id, b.x0, b.x1]).sort((a, b) => a[1] - b[1]);
ok(boxes.every((b, i) => b[1] >= lay.x0 - 1 && b[2] <= lay.x1 + 1 && (!i || b[1] >= boxes[i - 1][2])), "plan : gros éléments dans l'île, sans chevauchement");
ok(M.layoutIsland(sceneFull).dropped.join() === lay.dropped.join() && JSON.stringify(M.layoutIsland(sceneFull)) === JSON.stringify(lay), "plan : déterministe");
const sceneBig = mkScene(["page_koi", "page_cat", "page_stalk_tree", "page_bench", "page_pillars"].filter((id) => M.PAGE_PRESETS[id]), { structures: ["hut", "bookshelves", "linking_pillars"] });
ok(M.layoutIsland(sceneBig).items.hut && M.layoutIsland(sceneBig).items.koi && M.layoutIsland(sceneBig).items.pillars, "plan : cabane, bassin et piliers jamais écartés");
const sceneDec = mkScene(["page_koi", "page_cat", "page_cat_toys", "page_pond_decor", "page_flowers"]);
r.setHour(12); // le chat dort parfois dans la cabane selon l'heure : midi fixe pour les vues rapprochées
for (const v of ["pond", "pondplus", "cat", "grove"]) { r.setScene(v === "pondplus" || v === "cat" ? sceneDec : sceneFull); r.setView("island"); r.setView(v); ok(r.view === v, `vue ${v} disponible`); r.draw(1.3); }
r.setScene(sceneDec); r.setView("cat"); r.draw(1); ok(["yarn", "mouse", "bell"].every((k) => r.hot.some((h) => h.toy === k)), "chat : jouets cliquables"); let toyed = null; r.opts.onToy = (k) => { toyed = k; }; const yz = r.hot.find((h) => h.toy === "bell"); r.toLogical = () => [yz.x + 3, yz.y + 3]; r.onClick({}); ok(toyed === "bell", "jouet : clic = son"); r.setView("pondplus"); r.draw(1); ok(r.hot.some((h) => h.tip === "Stone lantern") && r.hot.some((h) => h.flash), "bassin de près : décor et koï rare");
r.setScene(sceneFull); r.setView("pond"); ok(r.hot.some((h) => h.flash), "bassin : la koï rare est cliquable"); r.setView("cat"); ok(r.hot.some((h) => h.flash), "chat : cliquable pour son nom");
r.setScene(mkScene(["page_koi"])); r.setView("pondplus"); ok(r.view === "island", "sans la page de décor, pas de bassin de près");
r.setScene(mkScene([])); r.setView("pond"); ok(r.view === "island", "sans page de koï, pas de vue du bassin");
// le chat endormi au coin du feu (1.16.1)
{
  const night = mkScene(["page_cat", "page_chimney"]), alw = mkScene(["page_cat"]), nev = mkScene(["page_cat", "page_chimney"]);
  alw.additions.find((a) => a.type === "cat").sleep = "always"; nev.additions.find((a) => a.type === "cat").sleep = "never";
  const nights = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5].map((h) => { r.setScene(night); r.setHour(h); return r.catAsleep(); }).filter(Boolean).length;
  ok(nights >= 6, `la nuit, avec le feu, il dort le plus souvent (${nights}/10)`);
  const days = [9, 10, 11, 12, 13, 14, 15].map((h) => { r.setScene(night); r.setHour(h); return r.catAsleep(); }).filter(Boolean).length;
  ok(days <= 3, `en plein jour, il est surtout dehors (${days}/7)`);
  r.setScene(night); r.setHour(22.2); const a1 = r.catAsleep(); r.setHour(22.4); ok(a1 === r.catAsleep(), "le tirage tient une demi-heure (pas de clignotement)");
  r.setScene(alw); r.setHour(12); ok(r.catAsleep(), "sleep=always : toujours sur le tapis");
  r.setView("island"); r.draw(1); ok(!r.hot.some((h) => /cat/.test(h.tip || "") && !h.purr), "endormi : absent de l'île");
  r.setView("cat"); ok(r.view === "cabin", "vue du chat → la cabane, où il dort");
  r.draw(1); const z = r.hot.find((h) => h.purr); ok(z && /asleep/.test(z.tip), "dans la cabane : cliquable, « asleep »");
  let purred = false; r.opts.onPurr = () => { purred = true; }; r.toLogical = () => [z.x + 5, z.y + 5]; r.onClick({}); ok(purred, "clic sur le chat endormi : ronron");
  r.setScene(nev); r.setHour(23); ok(!r.catAsleep(), "sleep=never : jamais dans la cabane");
  r.setScene(mkScene(["page_cat"], { structures: ["bookshelves"] })); r.setHour(23); ok(!r.catAsleep(), "sans cabane, il dort dehors (reste visible)");
  const lib2 = M.parseReltoLibrary("page chat: Chat | cat color=black sleep=never");
  ok(M.libraryPage(lib2.pages[0]).additions[0].sleep === "never", "bibliothèque : option sleep=");
}
// l'Imageur (1.17)
const imagerDone = (async () => {
  const IM = require("../src/imager");
  const sc = mkScene(["page_imager"]); sc.ages = [{ name: "A", path: "A.md", verdict: "stable", stability: 90 }, { name: "B", path: "B.md", verdict: "dying", stability: 20 }];
  const store = {}, tgt = { freq: 9, amp: 13, harm: 6, pol: -1, phase0: 3, drift: 1, erratic: false, hours: 24, name: "A" };
  const ri = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { onImagerAge: (age) => ({ target: { ...tgt, name: age.name }, model: null }), imagerGet: (p) => store[p], imagerSet: (p, v) => { store[p] = v; } });
  ri.setScene(sc); ok(ri.available().imager, "page de l'Imageur : la vue existe");
  ri.setView("imager"); ok(ri.view === "imager", "vue de l'Imageur");
  ri.nowOverride = 1.8e12; ri.draw(1);
  await Promise.resolve();
  { ri.draw(1.2); const st = ri.imager;
    ok(st.age && st.age.name === "A" && st.target && st.target.freq === 9, "le livre posé sur le lutrin : le premier Âge de l'étagère");
    const plus = ri.hot.find((h) => h.imager && h.imager.key === "freq" && h.imager.delta > 0); ok(plus, "molette de fréquence cliquable");
    const f0 = st.settings.freq; ri.toLogical = () => [plus.x + 2, plus.y + 2]; ri.onClick({}); ok(st.settings.freq === f0 + 1 && store["A.md"] && store["A.md"].freq === f0 + 1, "un cran de plus, gardé pour cet Âge");
    const lever = ri.hot.find((h) => h.imager && h.imager.key === "pol"); ri.toLogical = () => [lever.x + 2, lever.y + 2]; ri.onClick({}); ok(st.settings.pol === -1, "levier de polarité");
    st.settings = { pol: -1, freq: 9, amp: 13, harm: 6, phase: IM.phaseAt(st.target, 1.8e12) }; ok(ri.imagerSharpness() > 0.97, "accordé : netteté");
    const next = ri.hot.find((h) => h.imager && h.imager.book === 1); ri.toLogical = () => [next.x + 2, next.y + 2]; ri.onClick({});
    await Promise.resolve(); { ok(ri.imager.age.name === "B" && ri.imager.settings.freq === IM.START.freq, "livre suivant : un autre Âge, son propre réglage");
      const empty = mkScene(["page_imager"]); empty.ages = []; ri.setScene(empty); ri.setView("imager"); ri.draw(2); ok(ri.imager.empty && ri.imagerSharpness() >= 0, "étagère vide : rien ne casse");
      const cab = mkScene(["page_imager"]); ri.setScene(cab); ri.setView("cabin"); ri.draw(1); ok(ri.hot.some((h) => h.go === "imager"), "dans la cabane, l'appareil mène à l'Imageur");
      ri.setScene(mkScene([])); ri.setView("imager"); ok(ri.view !== "imager", "sans la page, pas d'Imageur"); }
  }
})().catch((e) => { console.log("KO imageur : " + (e && e.stack || e)); process.exitCode = 1; });
// pages en bibliothèque
const lib = M.parseReltoLibrary("page pluie: Pluie | rain 0.9, birds 0.4 | audio=soft_rain\npage fleurs: Fleurs | flowers 0.8 red");
ok(!lib.problems.length && M.libraryPage(lib.pages[1]).additions[0].asset === "red", "bibliothèque : effets rain/birds/flowers et asset de fleur");
imagerDone.then(() => console.log(`✓ relto-scenes.test.js (${n} contrôles)`));
