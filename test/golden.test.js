"use strict";
// Garde-fou du rendu : sans la page Château, chaque vue dessine exactement la même chose qu'avant (empreinte de tous les appels
// au canvas : méthodes, arguments, couleurs, dégradés). Vingt-cinq vues, trois heures, avec et sans la Verrière.
// Régénérer l'empreinte (seulement quand un changement de dessin est voulu) : GOLDEN_WRITE=1 node test/golden.test.js
const assert = require("assert"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
const FIXED = 1.8e12; Date.now = () => FIXED; // l'heure figée : rien ne dépend de la machine
let seed = 1; Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let log = [];
const num = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : typeof v === "string" ? v : v && v.__id ? v.__id : typeof v === "object" && v ? "obj" : String(v));
let gid = 0;
const ctx = new Proxy({}, {
  get: (_, k) => {
    if (k === "canvas") return undefined;
    if (k === "measureText") return (t) => { log.push("mt:" + t); return { width: String(t).length * 6 }; };
    if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return (...a) => { const id = "g" + gid++; log.push(k + ":" + a.map(num).join(",")); return { __id: id, addColorStop: (o, c) => log.push("stop:" + id + ":" + num(o) + ":" + c) }; };
    if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
    if (k === "isPointInPath") return () => false;
    return (...a) => { log.push(String(k) + ":" + a.map(num).join(",")); };
  },
  set: (_, k, v) => { log.push("=" + String(k) + ":" + num(v)); return true; },
});
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;

const BASE = ["page_chimney", "page_pine_trees", "page_mountain", "page_waterfall", "page_koi", "page_cat", "page_flowers", "page_grass", "page_lanterns", "page_islets", "page_calendar", "page_comets", "page_moons", "page_pond_decor"];
const ROOMS = ["page_atelier", "page_imager", "page_telescope", "page_dni_clock"];
const make = (pages, view, hour) => {
  gid = 0; seed = 1;
  const relto = M.parseRelto({ seed: 4242, structures: ["hut", "bookshelves", "linking_pillars"], relto_pages_active: pages, relto_mode: "sandbox" }); relto.zeroFound = true;
  const own = pages.filter((id) => !M.BUILTIN_PAGES.includes(id)).map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md"));
  const sc = M.buildScene(relto, [...own, ...M.builtinPages()], [{ name: "Brume", path: "Ages/Brume.md", verdict: "stable", stability: 90 }]);
  const c = dom.window.document.createElement("canvas"), r = new ReltoRenderer(c, dni, { t: (k) => k });
  r.nowOverride = FIXED; r.setScene(sc); r.setHour(hour); r.view = view; return r;
};
const VIEWS = ["island", "global", "cabin", "atelier", "atelierback", "desk", "loft", "roundwindow", "flower", "vault", "hall", "imager", "telescope", "starmap", "clock", "calendar", "pond", "pondplus", "cat", "grove", "pillars"];
const STATIONS = ["cry", "lens", "atmo"];
const print = (glass, view, hour, station) => {
  const pages = [...BASE, ...ROOMS, ...(glass ? ["page_glasshouse"] : [])], r = make(pages, view, hour);
  if (station) { r.draw(2); if (r.imagerState) r.imagerState().station = station; }
  log = []; r.hot = []; r.draw(3.25);
  return crypto.createHash("sha1").update(log.join("\n")).digest("hex").slice(0, 16) + ":" + log.length;
};
const out = {};
for (const glass of [false, true]) for (const hour of [9, 16, 23]) {
  for (const view of VIEWS) { const k = `${glass ? "glass" : "plain"}/${view}/${hour}`; try { out[k] = print(glass, view, hour); } catch (e) { out[k] = "ERR " + e.message.slice(0, 60); } }
  for (const st of STATIONS) { const k = `${glass ? "glass" : "plain"}/imager-${st}/${hour}`; try { out[k] = print(glass, "imager", hour, st); } catch (e) { out[k] = "ERR " + e.message.slice(0, 60); } }
}
// la même empreinte deux fois de suite : sinon une vue dépend de l'ordre ou du hasard, et le garde-fou ne vaudrait rien
const again = {}; for (const k of Object.keys(out).slice(0, 12)) { const [g, v, h] = k.split("/"); again[k] = v.startsWith("imager-") ? print(g === "glass", "imager", +h, v.slice(7)) : print(g === "glass", v, +h); }
const FILE = path.join(__dirname, "golden.json");
if (process.env.GOLDEN_WRITE) { fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + "\n"); console.log(`golden.json écrit (${Object.keys(out).length} empreintes)`); process.exit(0); }
const ref = JSON.parse(fs.readFileSync(FILE, "utf8"));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
for (const k of Object.keys(again)) ok(again[k] === out[k], `${k} : rendu stable d'un dessin à l'autre`);
for (const k of Object.keys(ref)) ok(out[k] === ref[k], `${k} : le rendu a changé (${ref[k]} → ${out[k]})`);
console.log(`✓ golden.test.js (${n} contrôles)`);
