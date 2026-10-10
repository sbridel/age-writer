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
  const distinct = new Set(zs.map((z) => `${z.torahn}/${z.elevation}`)).size;
  ok(distinct >= 395, `400 graines : des Zéros presque tous distincts (${distinct})`);
  ok(T.TURN === 62500, "un tour de Torahn = 62 500 torantee");
  ok(zs.every((z) => Number.isInteger(z.torahn) && z.torahn >= 0 && z.torahn < T.TURN && Number.isInteger(z.elevation) && Math.abs(z.elevation) <= T.ZERO_ELEV && Number.isInteger(z.distance) && z.distance >= 1 && z.distance <= T.DIST_MAX), "Torahn en torantee sur un tour, élévation (shahfeetee) loin des butées, distance en shahfeetee");
  ok(zs.some((z) => z.torahn % T.NOTCH !== 0), "le Zéro tombe entre deux crans : on l'encadre");
  const q = [0, 0, 0, 0]; for (const z of zs) q[Math.floor(z.torahn / (T.TURN / 4))]++;
  ok(q.every((c) => c > 60), `Torahn réparti sur tout le tour (${q.join(", ")})`);
  ok(zs.some((z) => z.elevation > 50) && zs.some((z) => z.elevation < -50), "élévation au-dessus et au-dessous du plan zéro");
}

// ---- visée et molettes ------------------------------------------------------------------------------
ok(T.turn({ torahn: 62000, elev: 0 }, "torahn", 1000).torahn === 500 && T.turn({ torahn: 300, elev: 0 }, "torahn", -2500).torahn === 60300, "le Torahn fait le tour (en torantee)");
ok(T.turn({ torahn: 100, elev: 0 }, "toran", 100).torahn === 200 && T.normAim({ toran: 4200, elev: 3 }).torahn === 4200 && T.axisOf("Toran") === "torahn", "l'ancienne graphie « Toran » est acceptée (axe et visée gardée)");
ok(T.turn({ torahn: 0, elev: 120 }, "elev", 25).elev === T.ELEV_MAX && T.turn({ torahn: 0, elev: -120 }, "elevation", -25).elev === -T.ELEV_MAX, "l'élévation s'arrête aux butées");
ok(JSON.stringify(T.normAim(null)) === JSON.stringify({ torahn: 0, elev: 0 }) && T.normAim({ torahn: "x", elev: 999 }).elev === T.ELEV_MAX, "visée absente ou abîmée : valeurs sûres");
ok(T.gap({ torahn: 62000, elev: 0 }, { torahn: 400, elevation: 0 }).dt === 900 && T.gap({ torahn: 400, elev: 0 }, { torahn: 62000, elevation: 0 }).dt === -900, "écart de Torahn au plus court sur le cercle");
ok(T.kiElev(40) === -40 && T.kiElev(-12) === 12 && Object.is(T.kiElev(0), 0), "KI : au-dessus du plan, l'élévation s'affiche négative");
ok(T.STEP.torahn.hub === 100 && T.STEP.torahn.rim === 2500 && T.STEP.elev.hub === 1 && T.STEP.elev.rim === 25, "moyeu : 100 torantee ou 1 shahfee ; couronne : 25 crans");

// ---- le signal : il croît strictement quand on approche ------------------------------------------------
{
  const Z = 30037, z = { torahn: Z, elevation: 40 }, at = (u) => ((Z - u) % T.TURN + T.TURN) % T.TURN; // at(u) : u torantee avant le Zéro
  let mono = true, last = -1;
  for (let d = 31200; d >= 0; d -= 50) { const s = T.signal({ torahn: at(d), elev: 40 }, z).s; if (!(s > last)) mono = false; last = s; }
  ok(mono, "en Torahn seul : le signal croît à chaque demi-cran gagné");
  last = -1; mono = true;
  for (let e = -T.ELEV_MAX; e <= 40; e++) { const s = T.signal({ torahn: Z, elev: e }, z).s; if (!(s > last)) mono = false; last = s; }
  ok(mono, "en élévation seule : le signal croît à chaque shahfee gagné");
  // en diagonale (les deux axes) ; 150 × 200 = 30 000 torantee : moins d'un demi-tour (au-delà, le plus court passe de l'autre côté)
  last = -1; mono = true; let bandsUp = true, lastBand = -1;
  for (let k = 150; k >= 0; k--) { const g = T.signal({ torahn: at(200 * k), elev: 40 - k }, z); if (!(g.s > last)) mono = false; if (g.band < lastBand) bandsUp = false; last = g.s; lastBand = g.band; }
  ok(mono && bandsUp, "en diagonale : signal et paliers de mots ne reculent jamais");
  const far = T.signal({ torahn: (Z + 31250) % T.TURN, elev: -40 }, z), near = T.signal({ torahn: Z + 200, elev: 42 }, z), on = T.signal({ torahn: Z, elev: 40 }, z);
  ok(far.band === 0 && far.s < 0.1 && !far.found, "à l'opposé : le vide");
  ok(near.found && near.band === 5 && on.s === 1, "à 200 torantee et 2 shahfeetee : trouvé ; en plein dessus : signal 1");
  ok(!T.signal({ torahn: Z + 201, elev: 40 }, z).found && !T.signal({ torahn: Z, elev: 43 }, z).found, "un peu au-delà : pas encore");
  ok([0, 1, 2, 3, 4, 5].every((b) => { for (let d = 0; d <= 31200; d += 25) if (T.signal({ torahn: at(d), elev: 40 }, z).band === b) return true; return false; }), "les six paliers de mots se rencontrent en chemin");
  { // avec les seules molettes (crans de 100 torantee), le Zéro, qui tombe entre deux crans, reste atteignable
    const zz = { torahn: 4250, elevation: 0 }; ok(T.signal({ torahn: 4200, elev: 0 }, zz).found && T.signal({ torahn: 4300, elev: 0 }, zz).found, "entre deux crans : les deux voisins sont dans l'anneau");
  }
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
  ok(tel.length === 8 && ["torahn", "elev"].every((a) => [-T.STEP[a].rim, -T.STEP[a].hub, T.STEP[a].hub, T.STEP[a].rim].every((d) => tel.some((h) => h.tel.axis === a && h.tel.delta === d))), "deux molettes, Torahn et Élévation : couronne (25 crans) et moyeu (un cran), dans les deux sens");
  ok(r.hot.some((h) => /Torahn, in torantee.*62,500/.test(h.tip)) && r.hot.some((h) => /shahfeetee.*KI.*negative/.test(h.tip)), "unités dans la fiction : torantee (62 500 au tour), shahfeetee, le sens du KI");
  ok(r.hot.some((h) => h.go === "island") && r.hot.some((h) => /blank/i.test(h.tip)), "redescendre ; plaque vierge");
  // le joueur cherche : à chaque geste, il garde celui qui avive le signal (chaud / froid), couronne puis moyeu
  const click = (axis, delta) => { r.draw(2); const h = r.hot.find((x) => x.tel && x.tel.axis === axis && x.tel.delta === delta); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); };
  // sans « il s'avive / il pâlit », le joueur compare ce qu'il voit sur quelques battements (la scintillation trompe un regard unique)
  const looks = (aim) => { let m = 0; for (let b = 0; b < 8; b++) m += T.observe(T.signal(aim, st.zero), steps * 31 + b).s; return m / 8; };
  let steps = 0, stalled = 0;
  while (!st.found && steps < 1500) {
    let moved = false;
    for (const axis of ["torahn", "elev"]) for (const step of [T.STEP[axis].rim, T.STEP[axis].hub]) for (const dir of [1, -1]) {
      if (moved) continue; const before = { ...st.aim }; click(axis, dir * step); steps++;
      if (looks(st.aim) > looks(before)) moved = true; else { st.aim = before; } // plus froid, à l'œil : on revient
    }
    if (!moved) stalled++; if (stalled > 60) break;
  }
  ok(st.found, `à l'œil, en regardant quelques battements, on trouve le Zéro (${steps} gestes)`);
  { // un seul regard ne suffit pas de loin (la scintillation), mais plusieurs battements tranchent
    const z = { torahn: 30000, elevation: 0, distance: 1 }, far = { torahn: 10000, elev: 0 }, closer = { torahn: 12500, elev: 0 };
    let single = 0, avg = 0;
    for (let b = 0; b < 200; b++) {
      if (T.observe(T.signal(closer, z), b).s > T.observe(T.signal(far, z), b + 7).s) single++;
      let m1 = 0, m0 = 0; for (let k = 0; k < 8; k++) { m1 += T.observe(T.signal(closer, z), b * 16 + k).s; m0 += T.observe(T.signal(far, z), b * 16 + 8 + k).s; } if (m1 > m0) avg++;
    }
    ok(single < 150 && avg > 155 && avg > single + 20, `de loin, un regard trompe parfois (${single / 2} % juste), huit battements presque jamais (${avg / 2} %)`);
    const sg = T.signal({ torahn: 30000, elev: 0 }, z); ok(T.observe(sg, 5).found && T.observe(sg, 5).band === 5, "dans l'anneau : la perception ne ment pas");
    ok(!T.observe(T.signal({ torahn: 30400, elev: 0 }, z), 3).found && [...Array(50).keys()].every((b) => T.observe(T.signal({ torahn: 30400, elev: 0 }, z), b).band < 5), "hors de l'anneau, jamais « au bord de l'anneau »");
    ok(JSON.stringify(T.observe(T.signal(far, z), 9)) === JSON.stringify(T.observe(T.signal(far, z), 9)), "même battement, même visée : même perception");
  }
  ok(sounds.some(([k]) => k === "found") && sounds.some(([k]) => k === "ping"), "sons : le pouls après chaque geste, la quinte du Zéro trouvé");
  const key = T.keyOf(sc.name, sc.seed);
  ok(store[key] && store[key].found === true && store[key].at && Math.abs(T.gap(store[key].at, zero).dt) <= T.TOL.torahn && "torahn" in store[key], "trouvé : gardé par Relto (en torantee), avec la visée du moment");
  r.draw(3); ok(r.hot.some((h) => h.tel && h.tel.setZero), "la plaque porte le Zéro, en chiffres D'ni");
  click("torahn", T.STEP.torahn.rim); click("torahn", T.STEP.torahn.rim); click("elev", -T.STEP.elev.rim);
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
  rf.setScene(sc); rf.setView("telescope"); rf.draw(1); ok(rf.hot.some((h) => /Torahn — couronne/.test(h.tip)), "en français : infobulles traduites");
  // mouvement réduit : pas d'animation, dessin à t = 0
  const rr = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { ...opts(), reducedMotion: true }); rr.setScene(other); rr.setView("telescope"); rr.draw(0); TL.act(rr, { axis: "toran", delta: T.STEP.torahn.hub }); rr.draw(0);
  ok(!rr.telescope.anim && bad === 0, "mouvement réduit : la visée saute, sans glissement");
  ok(bad === 0, "vue du télescope : aucun nombre non fini");
  // le pouls à l'oreille : une note par prorahn tant qu'on regarde ; loin, des battements manqués
  const listen = (aim) => { sounds.length = 0; const rp = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts()); rp.setScene(other); rp.setView("telescope"); rp.draw(0); rp.telescope.aim = aim;
    for (let i = 0; i < 120; i++) { rp.nowOverride = 1.8e12 + i * T2.PULSE_MS; rp.draw(i); } return sounds.filter(([k]) => k === "pulse"); };
  const T2 = require("../src/relto-telescope"), zo = T.greatZero(other.name, other.seed);
  const nearP = listen({ torahn: zo.torahn, elev: zo.elevation }), farP = listen({ torahn: (zo.torahn + 31250) % T.TURN, elev: zo.elevation > 0 ? -100 : 100 });
  ok(nearP.length >= 110 && farP.length < nearP.length - 15, `pouls : près, presque chaque battement (${nearP.length}/119) ; loin, il en manque (${farP.length})`);
  ok(Math.min(...nearP.map(([, v]) => v)) > Math.max(...farP.map(([, v]) => v)), "pouls : plus fort près que loin");
  // commande « oublier le Great Zero » : les vues ouvertes relisent l'état
  { let gen = 0; const st0 = { [T.keyOf(other.name, other.seed)]: { torahn: 100, elev: 0, found: true } };
    const rg = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { telescopeGen: () => gen, telescopeGet: (k) => st0[k] || null });
    rg.setScene(other); rg.setView("telescope"); rg.draw(0); ok(rg.telescope.found, "Zéro relevé");
    delete st0[T.keyOf(other.name, other.seed)]; gen++; rg.draw(1); ok(!rg.telescope.found && rg.telescope.aim.torahn === 0, "oublié : la vue ouverte repart de zéro"); }
}
ok(["tel.found", "tel.band.void", "tel.band.edge", "relto.v.telescope"].every((k) => D.en[k] && D.fr[k]), "textes en anglais et en français");
console.log(`✓ telescope.test.js (${n} contrôles)`);
