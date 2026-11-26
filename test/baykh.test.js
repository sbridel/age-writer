"use strict";
// Baykh, le jeu des routes du salon (src/baykh.js) — les règles, la route, la fin, l'adversaire.
const assert = require("assert");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const B = require("../src/baykh");
const mul = (s) => { let x = s >>> 0; return () => ((x = Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9 >>> 0) % 100000) / 100000; };
const P = (i, k = "f") => ({ t: "p", i, k });
let G = B.newGame(5);
ok(G.res[0].s === 21 && G.res[0].c === 1 && B.newGame(3).res[1].c === 0 && B.newGame(8).res[0].s === 50 && B.newGame(9).n === 8, "les réserves selon la taille");
ok(B.moves(G).every((m) => m.t === "p" && m.k === "f") && B.moves(G).length === 25, "premier tour : seulement des Voies, partout");
G = B.apply(G, P(0)); ok(G.board[0][0].p === 1 && G.res[1].s === 20 && G.turn === 1, "premier tour : on pose une Voie de l'autre");
G = B.apply(G, P(24)); ok(G.board[24][0].p === 0 && G.res[0].s === 20 && G.turn === 0, "et l'autre une des nôtres");
ok(B.moves(G).some((m) => m.k === "w") && B.moves(G).some((m) => m.k === "c"), "ensuite : Verrous et Clef");
ok(B.moves(G).some((m) => m.t === "m" && m.i === 24), "on déplace une pile dont on tient le sommet");
ok(!B.moves(G).some((m) => m.t === "m" && m.i === 0), "pas celle de l'autre");
/* une route claire en ligne : 0 pose sur la ligne 2, 1 pose ailleurs */
G = B.newGame(5); G = B.apply(G, P(0)); G = B.apply(G, P(4));
const lineB = [20, 21, 22, 23]; let k = 0;
for (const i of [10, 11, 12, 13]) { G = B.apply(G, P(i)); ok(!G.end, "pas encore de route"); G = B.apply(G, P(lineB[k++])); }
G = B.apply(G, P(14)); ok(G.end && G.end.win === 0 && G.end.by === "road" && G.end.path.length === 5, "cinq Voies d'un bord à l'autre : la route");
/* un Verrou ne compte pas pour la route */
G = B.newGame(3); G = B.apply(G, P(0)); G = B.apply(G, P(8)); G = B.apply(G, P(3)); G = B.apply(G, P(6)); G = B.apply(G, P(4, "w")); G = B.apply(G, P(2));
G = B.apply(G, P(5)); ok(!B.road(G, 0), "un Verrou au milieu : pas de route");
/* déplacer : on sème par le bas de ce qu'on porte, au moins une par case */
G = B.newGame(5); G.ply = 2; G.board[12] = [{ p: 1, k: "f" }, { p: 0, k: "f" }, { p: 1, k: "f" }, { p: 0, k: "f" }];
const mv = B.moves(G).find((m) => m.t === "m" && m.i === 12 && m.d === 1 && m.drops.join() === "2,1");
ok(mv, "une pile de quatre : en prendre trois, en laisser deux puis une"); G = B.apply(G, mv);
ok(G.board[12].length === 1 && G.board[13].map((x) => x.p).join() === "0,1" && G.board[14].map((x) => x.p).join() === "0", "les pièces semées par le bas");
/* rien sur un Verrou, sauf la Clef seule qui l'écrase */
G = B.newGame(5); G.ply = 2; G.board[12] = [{ p: 0, k: "c" }]; G.board[13] = [{ p: 1, k: "w" }]; G.board[11] = [{ p: 0, k: "f" }]; G.board[10] = [{ p: 1, k: "w" }];
const intoW = B.moves(G).filter((m) => m.t === "m" && m.i === 11 && m.d === 3); ok(intoW.length === 0, "une Voie ne va pas sur un Verrou");
const crush = B.moves(G).find((m) => m.t === "m" && m.i === 12 && m.d === 1); ok(crush, "la Clef va sur le Verrou");
G = B.apply(G, crush); ok(G.board[13].map((x) => x.k).join() === "f,c" && G.board[13][0].p === 1, "le Verrou écrasé redevient une Voie, la Clef dessus");
G = B.newGame(5); G.ply = 2; G.board[12] = [{ p: 1, k: "f" }, { p: 0, k: "c" }]; G.board[13] = [{ p: 1, k: "w" }];
ok(!B.moves(G).some((m) => m.t === "m" && m.i === 12 && m.d === 1 && m.drops.length === 1 && m.drops[0] === 2), "la Clef n'écrase qu'en arrivant seule");
ok(B.moves(G).some((m) => m.t === "m" && m.i === 12 && m.d === 1 && m.drops.join() === "1"), "seule, oui");
/* la fin aux Voies : réserve vide */
G = B.newGame(3); G.ply = 2; G.res[0].s = 1; G.board[0] = [{ p: 1, k: "f" }]; G.board[8] = [{ p: 1, k: "f" }];
G = B.apply(G, P(4)); ok(G.end && G.end.by === "flats" && G.end.win === 1 && G.end.count.join() === "1,2", "réserve vide : on compte les Voies au sommet");
/* deux routes à la fois : celle du joueur qui vient de jouer */
G = B.newGame(3); const F = (p) => [{ p, k: "f" }]; G.board = [F(0), F(0), F(0), F(1), F(1), F(1), [], [], []];
ok(B.verdict(G, 1).win === 1 && B.verdict(G, 0).win === 0, "deux routes : celle de qui joue");
/* l'adversaire : il prend une route offerte, il barre une route à un coup */
G = B.newGame(5); G.ply = 2; G.turn = 1; for (const i of [10, 11, 12, 13]) G.board[i] = [{ p: 1, k: "f" }];
let m = B.think(G, "easy", mul(1)); ok(B.apply(G, m).end.win === 1, "même facile, il prend la route offerte");
G = B.newGame(5); G.ply = 2; G.turn = 1; for (const i of [10, 11, 12, 13]) G.board[i] = [{ p: 0, k: "f" }]; G.board[0] = [{ p: 1, k: "f" }];
for (const lv of ["mid", "hard"]) { m = B.think(G, lv, mul(2)); const H = B.apply(G, m); ok(!B.moves(H).some((x) => { const K = B.apply(H, x); return K.end && K.end.win === 0; }), lv + " : il barre la route à un coup"); }
/* des parties entières, machine contre machine, finissent proprement */
for (let s = 0; s < 12; s++) { const r = mul(50 + s); let g = B.newGame(3 + (s % 4)), guard = 0;
  while (!g.end && guard++ < 400) { const lv = ["easy", "mid"][s % 2], mv2 = B.think(g, lv, r); ok(B.legal(g, mv2), "un coup légal (" + s + ")"); g = B.apply(g, mv2); }
  ok(g.end, "la partie finit (graine " + s + ")"); }
console.log("baykh : " + n + " OK");

/* la vue : la partie se garde et reprend ; elle s'habille sans que rien ne bouge ; le carnet s'écrit */
{
  const { JSDOM } = require("jsdom"); const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
  global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern" ? () => grad : k === "canvas" ? { width: 640, height: 360 } : k === "getImageData" ? () => ({ data: new Uint8ClampedArray(4) }) : () => {}), set: () => true });
  dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
  const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), BK = require("../src/relto-baykh");
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  let mem = {};
  const make = (dis) => { const pages = dis ? [dis] : []; const relto = M.parseRelto({ seed: 7, structures: ["hut"], relto_pages_active: pages, relto_mode: "sandbox" }); relto.zeroFound = true;
    const own = pages.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), sc = M.buildScene(relto, [...own, ...M.builtinPages({})], []);
    const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { t: (k) => k, baykhState: () => mem, onBaykh: (v) => { mem = v; }, reducedMotion: true });
    r.nowOverride = 1.8e12; r.setScene(sc); r.setHour(15); r.view = "baykh"; r.draw(3); return r; };
  const zones = (r) => JSON.stringify(r.hot.map((h) => ({ x: Math.round(h.x), y: Math.round(h.y), w: Math.round(h.w), h: Math.round(h.h), b: h.baykh && h.baykh.id, go: h.go })));
  const A = make(null); ok(A.hot.some((h) => h.baykh && h.baykh.cell === 12) && A.hot.some((h) => h.baykh && h.baykh.side === 0), "la vue : les cases et les réserves se touchent");
  ok(zones(A) === zones(make("page_castle")) && zones(A) === zones(make("page_glasshouse")), "les habits ne déplacent aucune zone");
  /* une partie jouée à la main : premier tour, puis la machine ; on revient : tout est là */
  const st = BK.state(A); st.G = B.apply(B.apply(st.G, P(0)), P(24)); st.started = true; /* premier tour joué : à moi */
  BK.act(A, { cell: 7 }); const kept = mem.game; ok(kept && kept.ply === 3 && kept.board.length === 25 && kept.board[7].length === 1, "après un coup, la partie est gardée");
  const R2 = make(null); ok(JSON.stringify(R2.bk.G.board) === JSON.stringify(kept.board) && R2.bk.G.ply === kept.ply, "on revient : la partie reprend telle quelle");
  mem = { ...mem, game: { n: 5, board: [[{ p: 9, k: "x" }]], res: [], turn: 0, ply: 3 } }; const R3 = make(null); ok(R3.bk.G.ply === 0, "une partie gardée abîmée : on repart à zéro");
  /* le carnet : une partie finie s'écrit */
  mem = {}; const R4 = make(null), s4 = BK.state(R4); let g = B.newGame(3); g.ply = 2; g.board[0] = [{ p: 0, k: "f" }]; g.board[1] = [{ p: 0, k: "f" }]; s4.G = g; s4.started = true;
  BK.act(R4, { cell: 2 }); ok(mem.log && mem.log.length === 1 && mem.log[0].won && mem.log[0].by === "road" && mem.rank === 1, "une route gagnée : le carnet l'écrit, le rang monte");
  BK.act(R4, { ledger: true }); R4.hot = []; R4.draw(4); ok(R4.hot.some((h) => h.baykh && h.baykh.id === "ledgerIn"), "le carnet s'ouvre");
  /* la table de 2.11.2 : plus d'ambre ni de bronze ; la réserve d'en face passe la main ; le tiroir ; le bois de la vue de dessus */
  mem = {}; const R5 = make(null), s5 = BK.state(R5); let g5 = B.newGame(5); g5.ply = 2; g5.board[12] = [{ p: 0, k: "f" }]; s5.G = g5; s5.started = true;
  ok(!R5.hot.some((h) => h.baykh && (h.baykh.confirm || h.baykh.cancel)), "plus de boutons d'ambre ni de bronze");
  BK.act(R5, { cell: 12 }); BK.act(R5, { cell: 13 }); ok(s5.hand && s5.hand.drops.join() === "1", "on sème la pile");
  BK.act(R5, { side: 0 }); ok(s5.G.ply === 2, "sa propre réserve ne joue pas le coup"); s5.sel = null; BK.act(R5, { cell: 12 }); BK.act(R5, { cell: 13 });
  BK.act(R5, { side: 1 }); ok(!s5.hand && s5.G.ply === 3 && s5.G.board[13].length === 1 && !s5.G.board[12].length, "la réserve d'en face : on passe la main, le coup est joué");
  mem = {}; const R6 = make(null), s6 = BK.state(R6); let g6 = B.newGame(5); g6.ply = 2; g6.board[12] = [{ p: 0, k: "f" }, { p: 0, k: "f" }]; s6.G = g6; s6.started = true;
  BK.act(R6, { cell: 12 }); BK.act(R6, { cell: 13 }); BK.act(R6, { side: 1 }); ok(s6.hand && s6.G.ply === 2, "pile pas toute semée : la réserve d'en face ne joue rien");
  BK.act(R6, { cell: 12 }); ok(!s6.hand && s6.G.ply === 2, "revenir à la pile de départ repose tout");
  R6.hot = []; R6.draw(4); ok(R6.hot.some((h) => h.baykh && h.baykh.drawer), "le tiroir se touche");
  BK.act(R6, { drawer: true }); R6.hot = []; R6.draw(4); ok(R6.hot.some((h) => h.baykh && h.baykh.id === "drawerIn") && R6.hot.some((h) => h.baykh && h.baykh.fresh), "le tiroir s'ouvre : une partie neuve");
  ok(!R6.hot.some((h) => h.baykh && (h.baykh.dial || h.baykh.level != null)), "pendant une partie, ni la taille ni le niveau ne se touchent");
  BK.act(R6, { boxClose: true }); ok(!s6.drawer, "toucher hors du tiroir le referme");
  mem = { top: true }; const R7 = make(null); ok(R7.hot.some((h) => h.baykh && h.baykh.wood) && !R7.hot.some((h) => h.baykh && (h.baykh.topView || h.baykh.box || h.baykh.ledger || h.baykh.drawer)), "vue de dessus : aucun bouton, le bois");
  BK.act(R7, { wood: true }); ok(mem.top === false, "toucher le bois : on se rassoit");
}
console.log("baykh (vue) : " + n + " OK");
