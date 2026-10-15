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
const make = (glass, mode = "sandbox", view = "island", hour = 22, extra = []) => {
  const pages = ["page_chimney", "page_pine_trees", "page_mountain", ...extra, ...(glass ? ["page_glasshouse"] : [])];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: pages, relto_mode: mode }); if (extra.includes("page_dni_clock")) relto.zeroFound = true; // l'horloge se débloque avec le Zéro
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
const ROOMS = [["calendar", ["page_calendar"]], ["roundwindow", ["page_atelier"]], ["island", []], ["global", []], ["cabin", []], ["cabin", ["page_atelier", "page_imager", "page_telescope", "page_cat", "page_endgame"]], ["imager", ["page_imager", "page_telescope"]], ["telescope", ["page_telescope"]], ["island", ["page_telescope"]], ["clock", ["page_telescope", "page_dni_clock"]], ["island", ["page_telescope", "page_dni_clock"]], ["atelier", ["page_atelier", "page_comets"]], ["loft", ["page_atelier"]], ["desk", ["page_atelier"]], ["atelierback", ["page_atelier"]]];
for (const [view, extra] of ROOMS) for (const hour of [9, 16, 23]) {
  const A = make(false, "sandbox", view, hour, extra), B = make(true, "sandbox", view, hour, extra), a = zones(A), b = zones(B);
  ok(A.hot.length >= (view === "cabin" ? 8 : 1) && a === b, `${view}${extra.length ? " (atelier, Imageur…)" : ""}, ${hour} h : les zones cliquables sont identiques avec et sans la Verrière`);
}
// les trois gros plans de l'Imageur
for (const station of ["cry", "lens", "atmo"]) {
  const zs = (glass) => { const R = make(glass, "sandbox", "imager", 15, ["page_imager", "page_telescope"]); R.imagerState().station = station; R.hot = []; R.draw(4); return zs2(R); }, zs2 = (R) => ({ n: R.hot.length, z: zones(R) });
  const a2 = zs(false), b2 = zs(true); ok(a2.n >= 1 && a2.z === b2.z, `Imageur, poste ${station} : les zones cliquables sont identiques avec et sans la Verrière`);
}
// la lucarne de l'atelier : un clic l'ouvre, avec ou sans la Verrière ; la bague porte les vingt-cinq chiffres D'ni, 0 à 24, et rien d'autre
for (const glass of [false, true]) {
  const A = make(glass, "sandbox", "atelier", 14, ["page_atelier"]);
  ok(A.hot.some((h) => h.go === "roundwindow"), `atelier${glass ? " (Verrière)" : ""} : la lucarne est cliquable`);
  const R = make(glass, "sandbox", "roundwindow", 14, ["page_atelier"]), seen = new Set(), orig = R.dni.drawNumber;
  R.dni.drawNumber = function (c2, v, ...rest) { seen.add(v); return orig.call(this, c2, v, ...rest); };
  R.hot = []; R.draw(5); R.dni.drawNumber = orig;
  ok(R.view === "roundwindow", "la vue existe");
  ok(seen.size === 25 && [...Array(25).keys()].every((v) => seen.has(v)), `lucarne${glass ? " (Verrière)" : ""} : les chiffres 0 à 24, tous et seulement eux`);
  ok(R.hot.length === 1 && R.hot[0].go === "atelier", "lucarne : un seul cliquable, le retour à l'atelier");
}
// le pilier du calendrier : cliquable depuis l'île et la vue globale, avec ou sans la Verrière ; un seul cliquable en dehors du retour (la pierre)
for (const glass of [false, true]) for (const view of ["island", "global"]) {
  const A = make(glass, "sandbox", view, 14, ["page_calendar", "page_islets"]);
  ok(A.hot.some((h) => h.go === "calendar"), `${view}${glass ? " (Verrière)" : ""} : le pilier du calendrier est cliquable`);
}
for (const glass of [false, true]) {
  const R = make(glass, "sandbox", "calendar", 14, ["page_calendar"]); R.calFrom = "global"; R.hot = []; R.draw(5);
  ok(R.view === "calendar" && R.hot.some((h) => h.go === "global") && R.hot.length === 2, `calendrier${glass ? " (Verrière)" : ""} : la pierre et le retour (d'où l'on vient)`);
}
console.log(`✓ glasshouse.test.js (${n} contrôles)`);
