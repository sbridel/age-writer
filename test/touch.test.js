"use strict";
// Le mode tactile du Relto (téléphone, tablette) : le premier toucher montre, le second agit ; une molette lue agit ensuite à
// chaque toucher ; les petites cibles s'élargissent ; une molette se tourne en glissant autour de son centre ; la carte
// d'infobulle ; l'oculaire agrandi. À la souris, rien ne change.
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" ? () => grad : k === "canvas" ? undefined : () => {}), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), TL = require("../src/relto-telescope"), { Dni } = require("../src/dni");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;

const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: ["page_telescope", "page_mountain"] });
const sc = M.buildScene(relto, [M.parsePage(M.pageFrontmatter("page_mountain", M.PAGE_PRESETS.page_mountain), "m.md"), ...M.builtinPages()], [{ name: "Brume", path: "Ages/Brume.md", verdict: "stable", stability: 90 }]);
const make = (extra = {}) => {
  const store = {}, canvas = dom.window.document.createElement("canvas");
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 });
  const r = new ReltoRenderer(canvas, dni, { instrumentsMode: "guild", telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, ...extra });
  r.setScene(sc); r.setView("telescope"); r.nowOverride = 1.8e12; r.draw(1); return r;
};
const ev = (x, y) => ({ clientX: x, clientY: y, pointerId: 1 });
const zone = (r, f) => r.hot.find(f);
const centre = (h) => [h.x + h.w / 2, h.y + h.h / 2];

// ---- à la souris : rien ne change ----
{
  const r = make(), h = zone(r, (q) => q.tel && q.tel.axis === "torahn" && q.tel.delta > 0 && q.tel.delta < 1000);
  const before = TL.state(r).aim.torahn; r.onClick(ev(...centre(h))); r.draw(2);
  ok(TL.state(r).aim.torahn !== before, "souris : un clic agit aussitôt");
  ok(r.hit(h.x - 10, h.y - 10) === null || r.hit(h.x - 10, h.y - 10) !== h, "souris : pas de cible élargie");
  ok(!r.touch, "souris : pas de mode tactile");
}

// ---- au doigt ----
{
  const tips = [], r = make({ touch: true, onTip: (t) => tips.push(t) });
  ok(r.touch && r.opts.tipDelay === 0, "tactile : l'infobulle sans attente");
  const plus = zone(r, (q) => q.tel && q.tel.axis === "torahn" && q.tel.delta > 0 && q.tel.delta < 1000), minus = zone(r, (q) => q.tel && q.tel.axis === "torahn" && q.tel.delta < 0 && q.tel.delta > -1000);
  ok(plus.wc && minus.wc && r.holdKey(plus) === r.holdKey(minus), "les zones d'une molette forment une seule zone tenue");
  const a0 = TL.state(r).aim.torahn;
  r.onClick(ev(...centre(plus))); r.draw(2);
  ok(TL.state(r).aim.torahn === a0 && r.held === r.holdKey(plus), "premier toucher : la molette est tenue, rien ne tourne");
  ok(tips.some((t) => t && /Torahn/.test(t)), "la carte d'infobulle dit ce qu'on tient");
  r.onClick(ev(...centre(plus))); r.draw(3);
  const a1 = TL.state(r).aim.torahn; ok(a1 !== a0, "second toucher : la molette tourne");
  r.onClick(ev(...centre(minus))); r.draw(4);
  ok(TL.state(r).aim.torahn === a0, "l'autre moitié de la même molette agit tout de suite");
  // le vide relâche
  r.onClick(ev(630, 4)); r.draw(5); ok(r.held === null || r.held !== r.holdKey(plus), "toucher ailleurs relâche la molette");
  // cible élargie : à 8 unités du bord d'une zone, elle répond ; à 30, non
  const back = zone(r, (q) => q.go === "island");
  ok(r.hit(back.x + back.w / 2, back.y + back.h + 8) === back, "au doigt : une zone à quelques unités répond");
  ok(r.hit(back.x + back.w / 2, back.y + back.h + 30) === null, "trop loin : rien");
  // glisser : tourner le moyeu de 30° fait trois crans fins
  const hub = zone(r, (q) => q.tel && q.tel.axis === "elev" && Math.abs(q.tel.delta) === 1);
  r.onClick(ev(...centre(hub))); r.draw(6); // tenue
  const e0 = TL.state(r).aim.elev, wc = hub.wc, rr = 8;
  r.onDown(ev(wc.x + rr, wc.y)); ok(r.drag && r.drag.fine, "poser le doigt au moyeu : on tourne fin");
  for (let d = 5; d <= 30; d += 5) { const q = (d * Math.PI) / 180; r.onDragMove(ev(wc.x + Math.cos(q) * rr, wc.y + Math.sin(q) * rr)); }
  ok(TL.state(r).aim.elev - e0 === 3, `30° au moyeu : trois crans (${TL.state(r).aim.elev - e0})`);
  ok(r.dragged, "après un glissement, le clic qui suit est ignoré");
  const e1 = TL.state(r).aim.elev; r.onClick(ev(wc.x + rr, wc.y)); ok(TL.state(r).aim.elev === e1 && !r.dragged, "le clic de fin de glissement ne compte pas");
  // à la couronne : un gros cran tous les 20°
  const RING = wc.hub + 10; r.onDown(ev(wc.x + RING, wc.y)); ok(r.drag && !r.drag.fine, "à la couronne : on tourne gros");
  for (let d = -5; d >= -40; d -= 5) { const q = (d * Math.PI) / 180; r.onDragMove(ev(wc.x + Math.cos(q) * RING, wc.y + Math.sin(q) * RING)); }
  ok(TL.state(r).aim.elev - e1 === -50, `−40° à la couronne : deux tours de couronne (${TL.state(r).aim.elev - e1})`);
  // les passages agissent au premier toucher
  r.draw(7); r.onDown(ev(...centre(back))); // un nouveau toucher : le glissement précédent est oublié
  r.onClick(ev(...centre(back))); ok(r.view === "island" || r.view == null, "redescendre : au premier toucher");
}

// ---- l'oculaire agrandi ----
{
  const r = make({ touch: true }), eye = zone(r, (q) => q.tel && q.tel.eyeZoom);
  ok(eye, "au doigt : l'oculaire s'agrandit d'un toucher");
  r.onClick(ev(...centre(eye))); ok(r.eyeZoom === true, "agrandi");
  r.draw(2); r.onClick(ev(100, 100)); ok(r.eyeZoom === false, "un toucher le rend");
  const m = make(); ok(!zone(m, (q) => q.tel && q.tel.eyeZoom), "à la souris : pas d'agrandissement");
}

console.log(`✓ touch.test.js (${n} contrôles)`);
