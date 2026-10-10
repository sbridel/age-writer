"use strict";
// Effet `comet` du Relto : lu dans une ligne de relto-library, présent dans la scène, passages déterministes (graine + temps),
// fréquence selon la densité, visible la nuit et presque effacé le jour, dessin sans nombre non fini (vue de l'île et vue globale).
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let bad = 0, curves = 0;
const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; };
const grad = { addColorStop: (...a) => a.forEach(chk) };
const ctx = new Proxy({}, {
  get: (_, k) => {
    if (k === "canvas") return { width: 640, height: 360 };
    if (k === "measureText") return () => ({ width: 30 });
    if (k === "createLinearGradient" || k === "createRadialGradient") return (...a) => { a.forEach(chk); return grad; };
    if (k === "quadraticCurveTo") return (...a) => { curves++; a.forEach(chk); };
    return (...a) => { a.forEach(chk); };
  },
  set: (_, k, v) => { chk(v); return true; },
});
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), SC = require("../src/relto-scenery"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni");

// ---- 1. lecture --------------------------------------------------------------------------------------------------
ok(M.EFFECT_TYPES.includes("comet"), "comet est un type d'effet");
const lib = M.parseReltoLibrary("page page_comets: Comètes | comet 0.5, mist 0.3");
ok(!lib.problems.length, "la ligne de bibliothèque se lit sans problème");
const lp = lib.pages[0];
ok(lp.id === "page_comets" && lp.label === "Comètes", "id et étiquette");
ok(lp.effects.canvas_additions.some((a) => a.type === "comet" && a.density === 0.5), "comet 0.5 est un effet");
ok(!lp.effects.canvas_additions.some((a) => a.type === "aurora"), "plus d'aurore à la place de la comète");
const relto = M.parseRelto({ seed: 1234, relto_pages_active: ["page_comets"] });
const scene = M.buildScene(relto, [M.libraryPage(lp)], []);
ok(scene.additions.some((a) => a.type === "comet" && a.density === 0.5), "la comète entre dans les ajouts de la scène");
ok(M.PAGE_PRESETS.page_comets && M.PAGE_PRESETS.page_comets.effects.canvas_additions[0].type === "comet", "préréglage page_comets");
const fm = M.pageFrontmatter("page_comets", M.PAGE_PRESETS.page_comets);
ok(M.parsePage(fm, "c.md").additions[0].type === "comet", "une note de page comète se relit");

// ---- 2. passages -------------------------------------------------------------------------------------------------
const passes = (seed, d, T) => { const seen = new Set(); let first = null; for (let t = 0; t < T; t += 1) { const c = SC.cometAt(seed, t, d); if (c) { seen.add(c.k); if (first == null) first = t; } } return { n: seen.size, first }; };
const lo = passes(1234, 0, 3600), hi = passes(1234, 1, 3600);
ok(lo.n >= 5 && lo.n <= 9, `densité 0 : quelques passages par heure (${lo.n})`);
ok(hi.n >= 40, `densité 1 : environ un passage par minute (${hi.n})`);
ok(hi.n > lo.n * 4, "plus de densité, plus de passages");
// durée d'un passage : 40 à 60 s
{ let t = hi.first, k = SC.cometAt(1234, t, 1).k, len = 0; while (SC.cometAt(1234, t, 1) && SC.cometAt(1234, t, 1).k === k) { len++; t++; } ok(len >= 39 && len <= 61, `un passage dure 40 à 60 s (${len})`); }
// déterministe : mêmes entrées, même comète ; une autre graine, un autre ciel
const at = hi.first + 20, c1 = SC.cometAt(1234, at, 1), c2 = SC.cometAt(1234, at, 1);
ok(c1 && JSON.stringify(c1) === JSON.stringify(c2), "déterministe (graine + temps)");
const other = []; for (let t = 0; t < 600; t++) other.push(JSON.stringify(SC.cometAt(1234, t, 0.6)) === JSON.stringify(SC.cometAt(98765, t, 0.6)));
ok(other.some((x) => !x), "une autre graine donne d'autres passages");
// la queue s'éloigne de la direction : la tête avance dans le sens (dx, dy)
const c3 = SC.cometAt(1234, at + 1, 1); ok(Math.sign(c3.x - c1.x) === Math.sign(c1.dx) && Math.abs(Math.hypot(c1.dx, c1.dy) - 1) < 1e-9, "la tête avance dans sa direction, la queue est derrière");
ok(c1.y > 0 && c1.y < 200, "dans le ciel, au-dessus de l'île");
// mouvement réduit : une comète immobile
ok(SC.cometAt(1234, 0, 0.5, true) && JSON.stringify(SC.cometAt(1234, 0, 0.5, true)) === JSON.stringify(SC.cometAt(1234, 999, 0.5, true)), "mouvement réduit : comète immobile");

// ---- 3. jour et nuit ---------------------------------------------------------------------------------------------
const vN = SC.cometVis(M.skyAt(1)), vD = SC.cometVis(M.skyAt(13)), vT = SC.cometVis(M.skyAt(20.5));
ok(vN > 0.95, `nuit : pleinement visible (${vN.toFixed(2)})`);
ok(vD < 0.1, `plein jour : presque effacée (${vD.toFixed(2)})`);
ok(vT > vD && vT <= vN, "crépuscule : entre les deux");

// ---- 4. dessin ---------------------------------------------------------------------------------------------------
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni);
const sceneHi = M.buildScene(M.parseRelto({ seed: 1234, relto_pages_active: ["page_comets"] }), [M.libraryPage({ id: "page_comets", label: "C", effects: { canvas_additions: [{ type: "comet", density: 1 }] } })], []);
for (const view of ["island", "global"]) {
  r.setScene(sceneHi); r.view = view;
  for (const hour of [1, 6, 13, 20.5, 23]) for (const t of [0, at, at + 7.3, 333.3]) { r.setHour(hour); r.draw(t); }
}
ok(bad === 0, `dessin sans nombre non fini (${bad})`);
// la comète dessine bien sa queue de nuit (courbes en plus), rien de plus le jour hors passage
const count = (hour, t, sc) => { r.setScene(sc); r.view = "island"; r.setHour(hour); curves = 0; r.draw(t); return curves; };
const sceneNone = M.buildScene(M.parseRelto({ seed: 1234, relto_pages_active: [] }), [], []);
ok(count(1, at, sceneHi) - count(1, at, sceneNone) === 3, "nuit, en plein passage : la queue est dessinée (trois voiles)");
const gap = (() => { for (let t = 0; t < 600; t++) if (!SC.cometAt(1234, t, 1)) return t; })();
ok(count(1, gap, sceneHi) === count(1, gap, sceneNone), "entre deux passages : rien");
r.opts.reducedMotion = true; ok(count(1, 0, sceneHi) - count(1, 0, sceneNone) === 3, "mouvement réduit : la comète reste, immobile"); r.opts.reducedMotion = false;

console.log(`relto-comet : ${n} vérifications OK`);
