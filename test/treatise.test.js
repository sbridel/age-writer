"use strict";
// Le Traité de l'Art : un gros volume sous un fermoir de laiton, sur la longue table de l'étage ; en bac à sable seulement ;
// le fermoir ne cède qu'au Grand Maître, et le livre ouvre alors le guide complet (habillé en livre).
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
const loft = (tier, mode) => {
  const relto = M.parseRelto({ seed: 77, structures: ["hut", "bookshelves"], relto_pages_active: ["page_atelier"], relto_mode: mode });
  const atelier = M.parsePage(M.pageFrontmatter("page_atelier", M.PAGE_PRESETS.page_atelier), "atelier.md"), sc = M.buildScene(relto, [atelier, ...M.builtinPages()], []);
  const c = dom.window.document.createElement("canvas"), r = new ReltoRenderer(c, dni, { t: (k) => k, statusState: () => ({ tier, korfah: false, title: "" }) });
  r.setScene(sc); r.setHour(14); r.view = "loft"; r.draw(1); return r;
};
{ const r = loft(0, "sandbox"), h = r.hot.find((z) => z.clasp || z.special === "treatise");
  ok(h && h.clasp && !h.special && h.flash === "atelier.loft.treatise.clasp", "apprenti : le volume est là, le fermoir ne cède pas (une phrase, pas le guide)"); }
{ const r = loft(3, "sandbox"), h = r.hot.find((z) => z.clasp || z.special === "treatise"); ok(h && h.clasp, "maître : le fermoir tient encore"); }
{ const r = loft(4, "sandbox"), h = r.hot.find((z) => z.clasp || z.special === "treatise");
  ok(h && h.special === "treatise" && !h.clasp && h.tip === "atelier.loft.treatise", "Grand Maître : le fermoir est ouvert, le livre ouvre le Traité");
  let clasped = 0; r.opts.onClasp = () => clasped++; let special = null; r.opts.onSpecial = (k) => { special = k; };
  r.onClick({ clientX: 0, clientY: 0, target: r.canvas }); // un clic hors de tout : rien
  r.hit = () => h; r.onClick({ clientX: 0, clientY: 0, target: r.canvas }); ok(special === "treatise" && clasped === 0, "un clic sur le livre ouvert : le Traité, sans clic de fermoir"); }
{ const r = loft(0, "sandbox"), h = r.hot.find((z) => z.clasp); let clasped = 0; r.opts.onClasp = () => clasped++; r.hit = () => h; r.onClick({ clientX: 0, clientY: 0, target: r.canvas }); ok(clasped === 1 && r.flash && r.flash.text === h.flash, "un clic sur le fermoir : un clic sec et la phrase"); }
{ const r = loft(4, "story"); ok(!r.hot.some((z) => z.clasp || z.special === "treatise"), "mode histoire : pas de Traité (le mentor tient ce rôle)"); }
console.log(`✓ treatise.test.js (${n} contrôles)`);
