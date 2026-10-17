"use strict";
// Le Château (page_castle) : un second déguisement du Relto. Comme la Verrière, il n'habille que l'enveloppe : les zones cliquables
// sont les mêmes avec et sans lui, dans chaque vue et à trois heures. Un seul déguisement à la fois (attacher l'un détache l'autre) ;
// s'ils sont déjà tous deux attachés, le Château l'emporte. Jamais en mode histoire.
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern" ? () => grad : k === "canvas" ? undefined : () => {}), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const make = (disguise, mode = "sandbox", view = "island", hour = 22, extra = []) => {
  const pages = ["page_chimney", "page_pine_trees", "page_mountain", ...extra, ...(disguise === "castle" ? ["page_castle"] : disguise === "both" ? ["page_glasshouse", "page_castle"] : disguise === "glass" ? ["page_glasshouse"] : [])];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: pages, relto_mode: mode }); relto.zeroFound = true;
  const own = pages.filter((id) => !M.BUILTIN_PAGES.includes(id)).map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
  const sc = M.buildScene(relto, [...own, ...M.builtinPages({ story: mode === "story" })], [{ name: "Brume", path: "Ages/Brume.md", verdict: "stable", stability: 90 }]); // un Âge écrit : sans lui, le télescope (et ce qui en dépend) reste verrouillé et la vue retombe sur l'île
  const c = dom.window.document.createElement("canvas"), r = new ReltoRenderer(c, dni, { t: (k) => k });
  r.nowOverride = 1.8e12; r.setScene(sc); r.setHour(hour); r.view = view; r.draw(3); return r;
};
const zones = (r) => JSON.stringify(r.hot.filter((h) => h.go !== "telescope").map((h) => Object.fromEntries(Object.entries(h).filter(([, v]) => typeof v !== "function").map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 100) / 100 : v]))));

// la page, son effet, sa place
ok(M.PAGE_PRESETS.page_castle && M.EFFECT_TYPES.includes("castle") && M.PAGE_PRESETS.page_castle.sandbox, "la page Château et son effet existent, bac à sable seulement");
ok(M.builtinPages().some((p) => p.id === "page_castle") && !M.builtinPages({ story: true }).some((p) => p.id === "page_castle"), "bac à sable : au livre des pages ; histoire : non");
ok(make("castle").castleOn() && !make(null).castleOn() && !make("castle", "story").castleOn(), "attaché : le Château ; détaché : la cabane ; Relto d'histoire : jamais");

// un seul déguisement à la fois
ok(JSON.stringify(M.attachPage(["page_koi", "page_glasshouse"], "page_castle")) === JSON.stringify(["page_koi", "page_castle"]), "attacher le Château détache la Verrière");
ok(JSON.stringify(M.attachPage(["page_castle", "page_cat"], "page_glasshouse")) === JSON.stringify(["page_cat", "page_glasshouse"]), "attacher la Verrière détache le Château");
ok(JSON.stringify(M.attachPage(["page_glasshouse"], "page_koi")) === JSON.stringify(["page_glasshouse", "page_koi"]), "une autre page ne détache rien");
ok(JSON.stringify(M.attachPage(["page_castle"], "page_castle")) === JSON.stringify(["page_castle"]), "rattacher une page déjà là ne la double pas");
{ const B = make("both"); ok(B.castleOn() && !B.glassOn(), "les deux déjà attachés : le Château l'emporte, la Verrière se tait"); }
ok(make("glass").glassOn() && !make("glass").castleOn(), "la Verrière seule reste la Verrière");

// les zones cliquables : les mêmes avec et sans le Château, partout — sauf l'observatoire, qui suit le donjon au milieu de l'île
const ROOMS = [["island", []], ["global", []], ["cabin", []], ["cabin", ["page_atelier", "page_imager", "page_telescope", "page_cat", "page_endgame"]], ["imager", ["page_imager", "page_telescope"]], ["telescope", ["page_telescope"]], ["island", ["page_telescope"]], ["clock", ["page_telescope", "page_dni_clock"]], ["island", ["page_telescope", "page_dni_clock", "page_calendar", "page_islets"]], ["global", ["page_telescope", "page_calendar", "page_islets", "page_koi"]], ["atelier", ["page_atelier", "page_comets", "page_cat"]], ["loft", ["page_atelier", "page_imager"]], ["desk", ["page_atelier"]], ["atelierback", ["page_atelier", "page_cat"]], ["roundwindow", ["page_atelier"]], ["calendar", ["page_calendar"]], ["vault", []], ["flower", ["page_atelier"]], ["pond", ["page_koi", "page_cat"]], ["grove", ["page_pine_trees", "page_flowers"]]];
for (const [view, extra] of ROOMS) for (const hour of [9, 16, 23]) {
  const A = make(null, "sandbox", view, hour, extra), B = make("castle", "sandbox", view, hour, extra), a = zones(A), b = zones(B);
  ok(A.view === view && B.view === view, `${view} : la vue demandée est bien celle qui est dessinée`);
  ok(A.hot.length >= (view === "cabin" ? 8 : view === "grove" ? 0 : 1) && a === b, `${view}${extra.length ? " (" + extra.length + " pages)" : ""}, ${hour} h : les zones cliquables sont identiques avec et sans le Château`);
}
for (const station of ["cry", "lens", "atmo"]) {
  const zs = (d) => { const R = make(d, "sandbox", "imager", 15, ["page_imager", "page_telescope"]); R.imagerState().station = station; R.hot = []; R.draw(4); return { n: R.hot.length, z: zones(R) }; };
  const a2 = zs(null), b2 = zs("castle"); ok(a2.n >= 1 && a2.z === b2.z, `Imageur, poste ${station} : les zones cliquables sont identiques avec et sans le Château`);
}
// la lucarne, sous le Château : les vingt-cinq chiffres, 0 à 24, et un seul cliquable
{ const R = make("castle", "sandbox", "roundwindow", 14, ["page_atelier"]), seen = new Set(), orig = R.dni.drawNumber;
  R.dni.drawNumber = function (c2, v, ...rest) { seen.add(v); return orig.call(this, c2, v, ...rest); }; R.hot = []; R.draw(5); R.dni.drawNumber = orig;
  ok(seen.size === 25 && [...Array(25).keys()].every((v) => seen.has(v)) && R.hot.length === 1, "lucarne (Château) : les chiffres 0 à 24 et le seul retour"); }
// dehors : l'île devient le château ; le donjon porte l'observatoire (sa tour la plus haute), même sans la page Montagne
{ const A = make("castle", "sandbox", "island", 15, ["page_telescope"]); ok(A.lay.mount.tx != null && A.lay.mount.ty < 208 - A.lay.mount.h * 0.8, "l'observatoire est posé au sommet du donjon");
  const o = A.hot.find((h) => h.go === "telescope"); ok(A.lay.mount.x === 306 && o && Math.abs(o.x + o.w / 2 - A.lay.mount.tx) < 1, "le donjon est au milieu de l'île, et l'observatoire y est cliquable");
  const B = make("castle", "sandbox", "island", 15, ["page_koi", "page_waterfall", "page_islets", "page_calendar", "page_dni_clock", "page_dock", "page_bench", "page_pillars"]); ok(B.hot.some((h) => h.go === "calendar") && B.hot.filter((h) => h.tip === "Islet").length >= 2, "île sans montagne : le donjon est là, les cliquables aussi"); }
// la nuit rouge : le jour reste le jour ; la nuit, le ciel est couleur de sang (sans le Château, rien ne change : golden.test.js)
{ const CO = require("../src/relto-castle-out"), day = M.skyAt(13), night = M.skyAt(1.5), dusk = M.skyAt(19.4);
  ok(CO.redNight(day) === day && !day.red, "le jour, le Château ne touche pas au ciel");
  const n = CO.redNight(night); ok(n.red === 1 && n.bottom !== night.bottom && n.ambient === night.ambient, "la nuit, le ciel est rouge, et la lumière reste celle de la nuit");
  const d = CO.redNight(dusk); ok(d.red > 0 && d.red < 1, "au crépuscule, le ciel vire au rouge peu à peu"); }
console.log(`✓ castle.test.js (${n} contrôles)`);
