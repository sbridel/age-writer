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

// ---- à la souris : glisser et roulette ----
{
  let big = false; const r = make({ wheelOk: () => big }), hub = zone(r, (q) => q.tel && q.tel.axis === "elev" && Math.abs(q.tel.delta) === 1), wc = hub.wc, rr = 8;
  const e0 = TL.state(r).aim.elev;
  r.onDown({ ...ev(wc.x + rr, wc.y), button: 0 }); ok(r.drag && r.drag.fine, "souris : presser le moyeu commence à le tourner, sans le lire d'abord");
  for (let d = 5; d <= 30; d += 5) { const q = (d * Math.PI) / 180; r.onDragMove(ev(wc.x + Math.cos(q) * rr, wc.y + Math.sin(q) * rr)); }
  ok(TL.state(r).aim.elev - e0 === 3, "souris : 30° au moyeu, trois crans");
  r.drag = null; const e1 = TL.state(r).aim.elev; r.onClick(ev(wc.x + rr, wc.y)); ok(TL.state(r).aim.elev === e1, "le clic qui termine le glissement ne compte pas");
  { r.drag = null; r.dragged = false; const e9 = TL.state(r).aim.elev; r.onDown({ ...ev(wc.x + 2, wc.y), button: 0 }); for (const [dx, dy] of [[1, 1], [-1, 2], [2, -1], [-2, -2], [1, 0]]) r.onDragMove(ev(wc.x + 2 + dx, wc.y + dy));
    ok(TL.state(r).aim.elev === e9 && !r.dragged, "un clic qui tremble près du centre du moyeu ne tourne rien");
    r.onDown({ ...ev(wc.x + 9, wc.y), button: 0 }); r.onDragMove(ev(wc.x + 9, wc.y + 1)); r.onDragMove(ev(wc.x + 8.5, wc.y + 2)); ok(TL.state(r).aim.elev === e9, "un petit écart au bord du moyeu non plus"); r.drag = null; r.dragged = false; }
  r.onDown({ ...ev(...centre(hub)), button: 0 }); r.drag = null; r.onClick(ev(...centre(hub))); ok(TL.state(r).aim.elev !== e1, "un clic simple sur ± agit toujours");
  let prevented = 0; const wev = (dy, shift) => ({ ...ev(wc.x, wc.y), deltaY: dy, deltaMode: 0, shiftKey: !!shift, preventDefault: () => prevented++ });
  const e2 = TL.state(r).aim.elev; r.onWheel(wev(-100)); ok(TL.state(r).aim.elev === e2 && prevented === 0, "dans une note : la roulette laisse défiler la note");
  big = true; r.onWheel(wev(-100)); ok(TL.state(r).aim.elev === e2 + 1 && prevented === 1, "grande vue : un cran de roulette vers le haut, un cran fin de plus");
  r.onWheel(wev(100, true)); ok(TL.state(r).aim.elev === e2 + 1 - 25, "Maj : un gros cran");
  r.onWheel(wev(30)); r.onWheel(wev(30)); ok(TL.state(r).aim.elev === e2 - 24, "un pavé tactile : les petits pas s'additionnent avant de tourner");
  r.onWheel({ ...ev(630, 4), deltaY: -100, deltaMode: 0, preventDefault: () => prevented++ }); ok(prevented === 4, "hors d'une molette : la roulette n'est pas prise");
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

// ---- l'Imageur au doigt : un rail se lit une fois, puis on y glisse le doigt ----
{
  const r = make({ touch: true }), acts = []; r.imagerAct = (a) => acts.push(a.value); r.draw = () => {};
  r.hot = Array.from({ length: 25 }, (_, q) => ({ x: 78 + q * 20 - 10, y: 180, w: 20, h: 50, tip: "Red glass", imager: { key: "r", value: q } }));
  ok(r.holdKey(r.hot[3]) === r.holdKey(r.hot[17]), "les crans d'un rail forment une seule zone tenue");
  r.onDown(ev(78 + 60, 200)); r.onClick(ev(78 + 60, 200)); ok(acts.length === 0 && r.held, "premier toucher sur le rail : on lit");
  r.onDown(ev(78 + 100, 200)); r.onClick(ev(78 + 100, 200)); ok(acts.join() === "5", "second toucher, ailleurs sur le même rail : le verre y va");
  r.onDown(ev(78 + 100, 200)); ok(r.slide && r.slide.key === "r", "poser le doigt sur un rail lu : on glisse");
  for (let q = 6; q <= 9; q++) r.onDragMove(ev(78 + q * 20, 200));
  ok(acts.slice(1).join() === "6,7,8,9", `le verre suit le doigt cran par cran (${acts.join()})`);
  r.onClick(ev(78 + 180, 200)); ok(acts.length === 5, "le clic de fin de glissement ne compte pas");
}

{ // la souris glisse aussi un verre le long de son rail
  const r = make(), acts = []; r.imagerAct = (a) => acts.push(a.value); r.draw = () => {};
  r.hot = Array.from({ length: 25 }, (_, q) => ({ x: 78 + q * 20 - 10, y: 180, w: 20, h: 50, tip: "Red glass", imager: { key: "r", value: q } }));
  r.onDown({ ...ev(78 + 40, 200), button: 0 }); for (let q = 3; q <= 5; q++) r.onDragMove(ev(78 + q * 20, 200));
  ok(acts.join() === "3,4,5", `souris : le verre suit le glissement (${acts.join()})`);
}

// ---- plein écran mobile en portrait : l'image couchée d'un quart de tour (sens horaire) ----
{
  let rot = true; const r = make({ touch: true, rotated: () => rot });
  r.canvas.getBoundingClientRect = () => ({ left: 0, top: 48, right: 390, width: 390, height: 693 }); // l'image couchée : 390 de large, 693 de haut à l'écran
  const [x, y] = r.toLogical({ clientX: 390 - 390 * (90 / 360), clientY: 48 + 693 * (160 / 640) });
  ok(Math.abs(x - 160) < 0.5 && Math.abs(y - 90) < 0.5, `couchée : le doigt se lit dans l'image redressée (${x.toFixed(1)}, ${y.toFixed(1)})`);
  rot = false; r.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, right: 640, width: 640, height: 360 });
  const [x2, y2] = r.toLogical({ clientX: 160, clientY: 90 }); ok(x2 === 160 && y2 === 90, "debout : inchangé");
}

// ---- la carte des étoiles : noms au survol, loupe, régions, échelle adaptative ----
{
  const MAP = require("../src/starmap"), SM = require("../src/relto-starmap"), SS = require("../src/starsystem");
  const map = { scale: 10000, d0: 150 };
  ok(MAP.radial(map, 0) === 0 && Math.abs(MAP.radial(map, 10000) - 1) < 1e-9, "échelle adaptative : le Zéro au centre, la plus lointaine au bord");
  ok(MAP.radial(map, 500) > Math.sqrt(500 / 10000), "les étoiles proches s'écartent davantage qu'en racine carrée");
  const r = make(); const st = TL.state(r); st.found = true;
  const sys = (k, tor, d) => ({ at: 1, torahn: tor, distance: d, elevation: 5, ages: [] });
  st.systems = { a: sys("Alpha", 1000, 900), b: sys("Beta", 1300, 1100), c: sys("Gamma", 32000, 7000) };
  r.setView("starmap"); r.draw(1);
  const star = r.hot.find((h) => h.starKey === "a"); ok(star, "chaque étoile a sa zone (son nom au survol)");
  const names = r.hot.find((h) => h.mapAct && h.mapAct.names); ok(names && /hover|survol/i.test(names.tip), "un bouton pour les noms : au survol par défaut");
  SM.act(r, { names: true }); ok(r.mapNames === true, "un clic : tous les noms"); SM.act(r, { names: true }); ok(!r.mapNames, "un autre : au survol de nouveau");
  SM.act(r, { zoomAt: true }, 300, 160); ok(r.mapZoom && r.mapZoom.k === 2, "la loupe : ×2 au point touché");
  r.draw(2); SM.act(r, { zoomAt: true }, 300, 160); ok(r.mapZoom.k === 4, "encore : ×4");
  r.draw(3); SM.act(r, { zoomAt: true }, 300, 160); ok(r.mapZoom === null, "au plus fort, un clic rend toute la carte");
  r.draw(4); SM.act(r, { region: 0 }); ok(r.mapZoom && r.mapZoom.region === 0 && r.mapZoom.k > 1, "le nord du ciel : la loupe sur ses étoiles");
  SM.act(r, { region: 0 }); ok(r.mapZoom === null, "un second clic : tout le ciel");
  SM.act(r, { region: 2 }); SM.act(r, { all: true }); ok(r.mapZoom === null, "◎ : tout le ciel");
  r.setView("telescope"); r.setView("starmap"); ok(!r.mapZoom, "en quittant la carte, la loupe se range");
  void SS;
}

console.log(`✓ touch.test.js (${n} contrôles)`);
