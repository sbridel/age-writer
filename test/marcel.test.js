"use strict";
// Marcel : une page cachée (« page_marcel ») qui ne s'ouvre qu'à un chat noir nommé Marcel ; il dort sur le livre de l'Âge qui va
// le plus mal (un vide reste sur l'étagère) ; dans le fauteuil de l'atelier, il prend la couleur du cuir, et une onde de noir le
// parcourt ; la nuit, c'est un chat noir.
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

const catPage = (name, color) => { const fm = M.pageFrontmatter("page_cat", M.PAGE_PRESETS.page_cat); fm.cat_name = name; fm.cat_color = color; return M.parsePage(fm, "cat.md"); };
const atelier = M.parsePage(M.pageFrontmatter("page_atelier", M.PAGE_PRESETS.page_atelier), "atelier.md");
const ages = [
  { name: "Glass Marsh", path: "Ages/Glass Marsh.md", verdict: "stable", stability: 92 },
  { name: "Ash Tower", path: "Ages/Ash Tower.md", verdict: "unstable", stability: 44 },
  { name: "Dead Orchard", path: "Ages/Dead Orchard.md", verdict: "dying", stability: 22 },
  { name: "Moth Hall", path: "Ages/Moth Hall.md", verdict: "stable", stability: 80, sick: true },
];
const scene = (name, color, active = ["page_cat", "page_atelier"], list = ages) => {
  const relto = M.parseRelto({ seed: 77, structures: ["hut", "bookshelves"], relto_pages_active: active });
  return M.buildScene(relto, [catPage(name, color), atelier, ...M.builtinPages()], list);
};
const marcelState = (sc) => (sc.pages.find((p) => p.id === "page_marcel") || {}).state;

// ---- la page : invisible, puis offerte à Marcel seul ----
ok(!marcelState(scene("Mochi", "orange")), "un autre chat : la page n'existe nulle part (ni verrouillée, ni nommée)");
ok(!marcelState(scene("Marcel", "orange")), "un Marcel roux : rien");
ok(!marcelState(scene("Mochi", "black")), "un chat noir qui ne s'appelle pas Marcel : rien");
ok(marcelState(scene("Marcel", "black")) === "available", "un chat noir nommé Marcel : la page se montre, disponible");
ok(marcelState(scene("  marcel ", "black")) === "available", "le nom sans façon (casse, espaces)");
const on = scene("Marcel", "black", ["page_cat", "page_atelier", "page_marcel"]);
ok(marcelState(on) === "active" && on.additions.some((a) => a.type === "marcel"), "posée : Marcel est là");
const renamed = scene("Mochi", "black", ["page_cat", "page_atelier", "page_marcel"]);
ok(marcelState(renamed) === "locked" && !renamed.additions.some((a) => a.type === "marcel"), "le chat renommé : la page reste (on peut la retirer), Marcel s'en va");
ok(!Object.prototype.hasOwnProperty.call(M.PAGE_PRESETS.page_marcel, "secret") || M.PAGE_PRESETS.page_marcel.secret === true, "la page est marquée secrète");

// ---- le livre sous Marcel ----
const make = (sc, hour) => { const c = dom.window.document.createElement("canvas"); const r = new ReltoRenderer(c, dni, { t: (k, v) => (k === "marcel.on" ? `Marcel dort sur ${v.name}` : k) }); r.setScene(sc); r.setHour(hour); return r; };
{
  const r = make(on, 23);
  ok(r.marcelOn(), "Marcel reconnu");
  ok(r.marcelBook().name === "Moth Hall", `il choisit l'Âge qui va le plus mal (malade du vivant d'abord) : ${r.marcelBook().name}`);
  const r2 = make(scene("Marcel", "black", ["page_cat", "page_atelier", "page_marcel"], ages.filter((a) => !a.sick)), 23);
  ok(r2.marcelBook().name === "Dead Orchard", "sans malade : la plus basse stabilité");
  r2.marcelKeep = "Ages/Ash Tower.md"; ok(r2.marcelBook().name === "Ash Tower", "il garde le livre qu'il a pris tant que l'Âge va mal (il ne papillonne pas)");
  const fine = make(scene("Marcel", "black", ["page_cat", "page_atelier", "page_marcel"], ages.filter((a) => a.stability >= 50 && !a.sick)), 23);
  ok(fine.marcelBook() === null, "tout va bien : aucun livre");
  ok(!make(scene("Mochi", "black"), 23).marcelBook(), "sans la page : rien ne bouge");
  // dans la cabane, la nuit : il dort sur le tapis, le livre sous lui, un vide sur l'étagère
  r.setView("cabin");
  let asleep = false; for (let h = 20; h < 30 && !asleep; h += 0.5) { r.setHour(h % 24); asleep = r.catAsleep(); }
  ok(asleep, "il dort, au moins à une heure de la nuit");
  r.draw(1);
  const shelf = r.hot.filter((h) => h.book && h.age && h.age.path === "Ages/Moth Hall.md");
  const catZone = r.hot.find((h) => h.purr);
  ok(catZone && /Marcel dort sur Moth Hall/.test(catZone.tip), "au survol du chat : sur quel livre il dort");
  ok(shelf.length === 1 && shelf[0].w < 30, "le livre n'est plus sur l'étagère : on ne touche que son coin, sous le chat");
  ok(r.hot.filter((h) => h.book && h.age && h.age.path === "Ages/Glass Marsh.md").length === 1, "les autres livres restent à leur place");
}

// ---- le camouflage ----
{
  const r = make(on, 13);
  let dayMax = 0, dayMin = 1;
  for (let t = 0; t < 120; t += 0.05) { const c = r.marcelCamo(t); for (const px of [-12, 0, 12]) { const d = c.dark(px); dayMax = Math.max(dayMax, d); dayMin = Math.min(dayMin, d); } }
  ok(dayMin === 0, "en plein jour, il a la couleur du cuir");
  ok(dayMax > 0.5 && dayMax < 0.75, `une onde de noir le parcourt, sans le révéler tout entier (${dayMax.toFixed(2)})`);
  ok([0, 3, 7.7, 50].every((t) => !("eyes" in r.marcelCamo(t))), "il dort : ses yeux restent fermés");
  // la durée : l'onde est longue
  let onFor = 0; for (let t = 0; t < 12.6; t += 0.05) if (r.marcelCamo(t).dark(0) > 0.05) onFor += 0.05;
  ok(onFor > 2.5, `l'onde se voit longtemps sur son flanc (${onFor.toFixed(1)} s par cycle)`);
  // la tête puis la queue
  let tHead = -1, tTail = -1; for (let t = 0; t < 12.6; t += 0.02) { const c = r.marcelCamo(t); if (tHead < 0 && c.dark(-12) > 0.3) tHead = t; if (tTail < 0 && c.dark(12) > 0.3) tTail = t; }
  ok(tHead >= 0 && tTail > tHead + 2, "l'onde va de la tête à la queue, lentement");
  r.setHour(23.5); ok(r.marcelCamo(3).dark(0) === 1, "la nuit : un chat noir");
  r.setHour(20.5); const dusk = r.marcelCamo(11).dark(0); ok(dusk > 0.3 && dusk < 1, "au crépuscule, le noir gagne");
}

// ---- la housse du fauteuil : une étoffe par jour ----
{
  const AT = require("../src/relto-atelier"), r = make(on, 13), D = 86400000, t0 = new Date(2026, 9, 13, 9).getTime();
  const c0 = AT.coverOf(r, t0); ok(AT.COVERS.includes(c0), "une housse de la palette");
  ok(AT.coverOf(r, t0 + 10 * 3600000) === c0, "la même toute la journée");
  const seen = new Set(); for (let d = 0; d < 30; d++) seen.add(AT.coverOf(r, t0 + d * D)); ok(seen.size >= 4, `elle change selon les jours (${seen.size} étoffes en un mois)`);
  ok(AT.COVERS.every((c) => c.camo && c.back && c.seat), "chaque étoffe dit la couleur que prend Marcel");
}

console.log(`✓ marcel.test.js (${n} contrôles)`);
