"use strict";
// Le télescope du Relto (étape 1) : Great Zero caché tiré de la graine, signal chaud/froid, Zéro trouvé gardé, page débloquée par le premier Âge.
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let bad = 0;
const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => a.forEach(chk)), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const T = require("../src/telescope"), M = require("../src/relto-model"), TL = require("../src/relto-telescope");
const { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), { D } = require("../src/i18n");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;

// ---- le Great Zero : reproductible, propre à chaque Relto -------------------------------------------
const z0 = T.greatZero("Relto", 19991118);
ok(JSON.stringify(z0) === JSON.stringify(T.greatZero("Relto", 19991118)), "même nom, même graine : même Zéro");
ok(JSON.stringify(z0) === JSON.stringify(T.greatZero(" relto ", "19991118")), "le nom ne dépend pas de la casse ni des espaces ; la graine peut être une chaîne");
ok(JSON.stringify(z0) !== JSON.stringify(T.greatZero("Relto", 19991119)), "graine voisine : un autre Zéro");
ok(JSON.stringify(z0) !== JSON.stringify(T.greatZero("Ma maison", 19991118)), "autre nom, même graine : un autre Zéro");
{
  const zs = []; for (let s = 1; s <= 400; s++) zs.push(T.greatZero("Relto", s));
  const distinct = new Set(zs.map((z) => `${z.toran}/${z.elevation}`)).size;
  ok(distinct >= 390, `400 graines : des Zéros presque tous distincts (${distinct})`);
  ok(zs.every((z) => Number.isInteger(z.toran) && z.toran >= 0 && z.toran < T.TURN && Number.isInteger(z.elevation) && Math.abs(z.elevation) <= T.ZERO_ELEV && z.distance >= 1 && z.distance <= 624), "Toran sur un tour, élévation loin des butées, distance de 1 à 624");
  const q = [0, 0, 0, 0]; for (const z of zs) q[Math.floor(z.toran / (T.TURN / 4))]++;
  ok(q.every((c) => c > 60), `Toran réparti sur tout le tour (${q.join(", ")})`);
  ok(zs.some((z) => z.elevation > 50) && zs.some((z) => z.elevation < -50), "élévation au-dessus et au-dessous du plan zéro");
}

// ---- visée et molettes ------------------------------------------------------------------------------
ok(T.turn({ toran: 620, elev: 0 }, "toran", 10).toran === 5 && T.turn({ toran: 3, elev: 0 }, "toran", -25).toran === 603, "le Toran fait le tour");
ok(T.turn({ toran: 0, elev: 120 }, "elev", 25).elev === T.ELEV_MAX && T.turn({ toran: 0, elev: -120 }, "elev", -25).elev === -T.ELEV_MAX, "l'élévation s'arrête aux butées");
ok(JSON.stringify(T.normAim(null)) === JSON.stringify({ toran: 0, elev: 0 }) && T.normAim({ toran: "x", elev: 999 }).elev === T.ELEV_MAX, "visée absente ou abîmée : valeurs sûres");
ok(T.gap({ toran: 620, elev: 0 }, { toran: 4, elevation: 0 }).dt === 9 && T.gap({ toran: 4, elev: 0 }, { toran: 620, elevation: 0 }).dt === -9, "écart de Toran au plus court sur le cercle");
{ const d = T.digits(-118); ok(d.neg && d.hi === 4 && d.lo === 18, "chiffres D'ni : signe, puis deux chiffres en base 25"); }

// ---- le signal : il croît strictement quand on approche ------------------------------------------------
{
  const z = { toran: 300, elevation: 40 };
  let mono = true, last = -1;
  for (let d = 312; d >= 0; d--) { const s = T.signal({ toran: 300 - d, elev: 40 }, z).s; if (!(s > last)) mono = false; last = s; }
  ok(mono, "en Toran seul : le signal croît à chaque cran gagné");
  last = -1; mono = true;
  for (let e = -T.ELEV_MAX; e <= 40; e++) { const s = T.signal({ toran: 300, elev: e }, z).s; if (!(s > last)) mono = false; last = s; }
  ok(mono, "en élévation seule : le signal croît à chaque cran gagné");
  // en diagonale (les deux axes), en passant par le zéro du Toran
  last = -1; mono = true; let bandsUp = true, lastBand = -1;
  // 2 × 150 = 300 crans de Toran : moins d'un demi-tour (au-delà, le plus court passe de l'autre côté)
  for (let k = 150; k >= 0; k--) { const g = T.signal({ toran: (z.toran - 2 * k + T.TURN * 2) % T.TURN, elev: 40 - k }, z); if (!(g.s > last)) mono = false; if (g.band < lastBand) bandsUp = false; last = g.s; lastBand = g.band; }
  ok(mono && bandsUp, "en diagonale : signal et paliers de mots ne reculent jamais");
  const far = T.signal({ toran: (z.toran + 312) % T.TURN, elev: -40 }, z), near = T.signal({ toran: 302, elev: 41 }, z), on = T.signal({ toran: 300, elev: 40 }, z);
  ok(far.band === 0 && far.s < 0.1 && !far.found, "à l'opposé : le vide");
  ok(near.found && near.band === 5 && on.s === 1, "à deux crans près : trouvé ; en plein dessus : signal 1");
  ok(!T.signal({ toran: 303, elev: 40 }, z).found && !T.signal({ toran: 300, elev: 43 }, z).found, "à trois crans : pas encore");
  ok([0, 1, 2, 3, 4, 5].every((b) => { for (let d = 0; d <= 312; d++) if (T.signal({ toran: (300 - d + T.TURN) % T.TURN, elev: 40 }, z).band === b) return true; return false; }), "les six paliers de mots se rencontrent en chemin");
}

// ---- la page : verrouillée sans Âge, débloquée par le premier ------------------------------------------
{
  const relto = M.parseRelto({ seed: 7, relto_pages_active: ["page_telescope"] });
  const bp = M.builtinPages(); ok(bp.length === 1 && bp[0].id === "page_telescope" && bp[0].unlock.agesCount === 1, "le télescope est une page présente d'office");
  const none = M.buildScene(relto, bp, []), one = M.buildScene(relto, bp, [{ name: "Premier", path: "Premier.md", verdict: "stable", stability: 80 }]);
  const p0 = none.pages.find((p) => p.id === "page_telescope"), p1 = one.pages.find((p) => p.id === "page_telescope");
  ok(p0.state === "locked" && /first Age/.test(p0.reason) && !none.additions.some((a) => a.type === "telescope"), "aucun Âge : page verrouillée, pas de télescope sur l'île");
  ok(p1.state === "active" && one.additions.some((a) => a.type === "telescope"), "un Âge : page active, le télescope est là");
  const free = M.buildScene(M.parseRelto({ seed: 7 }), bp, [{ name: "Premier", path: "Premier.md", verdict: "dying", stability: 5 }]);
  ok(free.pages[0].state === "available", "non attachée : disponible dès le premier Âge, même mourant");
  const fm = M.pageFrontmatter("page_telescope", M.PAGE_PRESETS.page_telescope);
  ok(fm.unlock && fm.unlock.ages_count === 1 && !("age" in fm.unlock), "note créée depuis le préréglage : unlock.ages_count = 1");
  ok(M.parsePage(fm, "t.md").unlock.agesCount === 1 && M.parsePage(fm, "t.md").additions[0].type === "telescope", "la note se relit : même déverrouillage, même effet");
  const fmLib = M.pageFrontmatter("page_x", { effects: { canvas_additions: [] }, unlock: { age: "Glass", minStability: 60 } });
  ok(fmLib.unlock.age === "[[Glass]]" && fmLib.unlock.min_stability === 60 && !("ages_count" in fmLib.unlock), "déverrouillage par un Âge (bibliothèque) : inchangé");
}

// ---- dans le Relto : vue, gestes, Zéro trouvé et gardé -----------------------------------------------
{
  const ages = [{ name: "A", path: "A.md", verdict: "stable", stability: 90 }];
  const mk = (pages, extra = {}) => { const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages, ...extra }); return M.buildScene(relto, [...pages.filter((id) => id !== "page_telescope").map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), ...M.builtinPages()], ages); };
  const store = {}, sounds = [];
  const opts = () => ({ telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, onTelescopeSound: (k, s) => sounds.push([k, s]) });
  const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts());
  r.setScene(mk([])); ok(!r.available().telescope, "page détachée : pas de vue du télescope");
  r.setView("telescope"); ok((r.view || "island") === "island", "vue demandée sans la page : l'île");
  const sc = mk(["page_telescope"]); r.setScene(sc); r.setHour(22);
  r.draw(1); const onIsle = r.hot.find((h) => h.go === "telescope"); ok(onIsle, "sur l'île : la lunette, au sommet, mène à sa vue");
  ok(bad === 0, "île : aucun nombre non fini (sans page Montagnes, la page apporte son rocher)");
  r.setScene(mk(["page_telescope", "page_mountain"])); r.draw(1.2); ok(r.hot.some((h) => h.go === "telescope") && bad === 0, "avec le mont : la lunette est à son sommet");
  r.setScene(sc); r.draw(1); r.toLogical = () => [onIsle.x + 2, onIsle.y + 2]; r.onClick({}); ok(r.view === "telescope", "clic : vue du télescope");
  r.nowOverride = 1.8e12; r.draw(1.5);
  const st = r.telescope, zero = T.greatZero(sc.name, sc.seed);
  ok(JSON.stringify(st.zero) === JSON.stringify(zero) && !st.found, "le Zéro du Relto (nom + graine), pas encore trouvé");
  const tel = r.hot.filter((h) => h.tel && h.tel.axis);
  ok(tel.length === 8 && ["toran", "elev"].every((a) => [-25, -1, 1, 25].every((d) => tel.some((h) => h.tel.axis === a && h.tel.delta === d))), "deux molettes : couronne (un chiffre D'ni) et moyeu (un cran), dans les deux sens");
  ok(r.hot.some((h) => h.go === "island") && r.hot.some((h) => /blank/i.test(h.tip)), "redescendre ; plaque vierge");
  // le joueur cherche : à chaque geste, il garde celui qui avive le signal (chaud / froid), couronne puis moyeu
  const click = (axis, delta) => { r.draw(2); const h = r.hot.find((x) => x.tel && x.tel.axis === axis && x.tel.delta === delta); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); };
  let steps = 0, lastS = T.signal(st.aim, st.zero).s, stalled = 0;
  while (!st.found && steps < 400) {
    let moved = false;
    for (const axis of ["toran", "elev"]) for (const step of [25, 1]) for (const dir of [1, -1]) {
      if (moved) continue; const before = { ...st.aim }; click(axis, dir * step); steps++;
      if (st.trend > 0) moved = true; else { st.aim = before; } // plus froid : on revient
    }
    const s = T.signal(st.aim, st.zero).s; if (s <= lastS) stalled++; lastS = s; if (stalled > 3) break;
  }
  ok(st.found, `chaud / froid suffit à trouver le Zéro (${steps} gestes)`);
  ok(sounds.some(([k]) => k === "found") && sounds.some(([k]) => k === "ping"), "sons : le pouls après chaque geste, la quinte du Zéro trouvé");
  const key = T.keyOf(sc.name, sc.seed);
  ok(store[key] && store[key].found === true && store[key].at && Math.abs(T.gap(store[key].at, zero).dt) <= T.TOL, "trouvé : gardé par Relto, avec la visée du moment");
  r.draw(3); ok(r.hot.some((h) => h.tel && h.tel.setZero), "la plaque porte le Zéro, en chiffres D'ni");
  click("toran", 25); click("toran", 25); click("elev", -25);
  ok(st.found && store[key].found && !T.signal(st.aim, st.zero).found, "on s'éloigne : le Zéro reste trouvé");
  const p = r.hot.find((h) => h.tel && h.tel.setZero); r.toLogical = () => [p.x + 2, p.y + 2]; r.onClick({});
  ok(T.signal(st.aim, st.zero).s === 1, "clic sur la plaque : les molettes reviennent au Zéro");
  // un nouveau rendu (note rouverte, Obsidian relancé) relit l'état
  const r2 = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts()); r2.setScene(sc); r2.setView("telescope"); r2.draw(1);
  ok(r2.telescope.found && r2.hot.some((h) => h.tel && h.tel.setZero), "relu : le Zéro est toujours trouvé");
  r2.setView("island"); r2.draw(1); ok(r2.hot.some((h) => h.go === "telescope" && /charted/.test(h.tip)), "sur l'île, la lunette le dit");
  // un autre Relto (autre graine) : un autre Zéro, à trouver
  const other = mk(["page_telescope"], { seed: 9 }); r2.setScene(other); r2.setView("telescope"); r2.draw(1);
  ok(!r2.telescope.found && JSON.stringify(r2.telescope.zero) !== JSON.stringify(zero), "autre graine : autre Zéro, pas trouvé");
  // français : la ligne de mots et les infobulles traduites
  const { makeT } = require("../src/i18n"), rf = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { ...opts(), t: makeT(() => "fr") });
  rf.setScene(sc); rf.setView("telescope"); rf.draw(1); ok(rf.hot.some((h) => /Toran — couronne/.test(h.tip)), "en français : infobulles traduites");
  // mouvement réduit : pas d'animation, dessin à t = 0
  const rr = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { ...opts(), reducedMotion: true }); rr.setScene(other); rr.setView("telescope"); rr.draw(0); TL.act(rr, { axis: "toran", delta: 1 }); rr.draw(0);
  ok(!rr.telescope.anim && bad === 0, "mouvement réduit : la visée saute, sans glissement");
  ok(bad === 0, "vue du télescope : aucun nombre non fini");
}
ok(["tel.found", "tel.band.void", "tel.band.edge", "relto.v.telescope"].every((k) => D.en[k] && D.fr[k]), "textes en anglais et en français");
console.log(`✓ telescope.test.js (${n} contrôles)`);
