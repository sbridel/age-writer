"use strict";
// L'Imageur au livre vierge (mode « L'Art de la Guilde », réglage instrumentsMode = "guild") : le modèle (src/imager-guild.js),
// puis le rendu : pas de choix de livre, comparateur nourri par le télescope, cristaux = glyphes connus, planète verrouillée,
// station III éveillée, Âges d'une même étoile départagés, image formée et nom inscrit, aucun monde → fenêtre noire.
// Et le mode facile, inchangé.
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
const SS = require("../src/starsystem"), CAL = require("../src/calibration"), IM = require("../src/imager"), GI = require("../src/imager-guild"), SKY = require("../src/sky");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), { D, makeT } = require("../src/i18n");
const TL = require("../src/relto-telescope");
const { analyseAgeBase, pageList } = require("../src/engine/analysis");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
const skip0 = hooks.skip; hooks.skip = (l) => P.isPhysicsLine(l) || SKY.DAY_RE.test(l) || SKY.YEAR_RE.test(l) || SS.SYSTEM_RE.test(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const t0 = 1.8e12;

// Quatre Âges : Brume et Cendre partagent l'étoile (system: Kerath) ET leurs premières pages ; Roc la même étoile, d'autres
// pages ; Seul a son étoile. Un cinquième, Plume, n'a qu'une page écrite.
const srcs = {
  "Ages/Brume.md": ["single_sun\norange_sun\nwater\nfern\nrotation: 24\nsystem: Kerath", "Brume"],
  "Ages/Cendre.md": ["single_sun\norange_sun\nwater\nfern\nrotation: 60\nsystem: Kerath", "Cendre"],
  "Ages/Roc.md": ["single_sun\norange_sun\nstone\nsystem: Kerath", "Roc"],
  "Ages/Seul.md": ["single_sun\nred_sun\nwater", "Seul"],
};
const data = {};
for (const [p, [src, name]] of Object.entries(srcs)) { const a = A(src, name); data[p] = { a, target: IM.targetsOf(a, name), model: null, system: SS.systemOf(a, src, name), orbit: CAL.orbitOf(a, name, SKY.parseSky(src)) }; }
const ages = Object.keys(srcs).map((p) => ({ name: srcs[p][1], path: p, verdict: "stable", stability: 90, glyphs: [...new Set(pageList(data[p].a).filter((g) => g.written).map((g) => g.id))] }));
const cands = ages.map((age) => ({ age, data: data[age.path] }));
const K = data["Ages/Brume.md"].system.key, ids = (p) => data[p].target.crystals.ids;
const tune = (tg, phaseAt = t0) => ({ pol: tg.pol, freq: tg.freq, amp: tg.amp, harm: tg.harm, phase: IM.phaseAt(tg, phaseAt), r: tg.lens.r, g: tg.lens.g, b: tg.lens.b, iris: tg.lens.iris });

// ---- 1. le modèle pur ----------------------------------------------------------------------------------------------
{
  ok(data["Ages/Cendre.md"].system.key === K && data["Ages/Roc.md"].system.key === K && data["Ages/Seul.md"].system.key !== K, "Brume, Cendre, Roc : une étoile (Kerath) ; Seul : la sienne");
  ok(JSON.stringify(ids("Ages/Brume.md")) === JSON.stringify(ids("Ages/Cendre.md")), "Brume et Cendre : mêmes premières pages (seule l'atmosphère les départage)");
  const rack = GI.rackOf(ages, cands), known = new Set([...ages.flatMap((a) => a.glyphs), ...cands.flatMap((c) => ids(c.age.path))]);
  ok(rack.length === known.size && rack.every((id) => known.has(id)), `le râtelier : les glyphes connus et les pages des mondes de l'étagère (${rack.join(", ")})`);
  ok(!rack.includes("lava") && !rack.some((id) => IM.DECOYS.includes(id) && !known.has(id)), "aucun leurre inventé : seulement ce que l'étagère écrit");
  ok(GI.rackOf([], []).length === 0, "étagère vide : râtelier vide");
  const many = Array.from({ length: 19 }, (_, i) => "g" + String(i).padStart(2, "0"));
  ok(GI.pages(many) === 3 && GI.rackPage(many, 2).length === 3 && GI.rackPage(many, 0).length === GI.RACK, "plus de huit glyphes : des rangées de huit");
  // les cristaux justes identifient le monde
  const empty = GI.normCry(null); ok(empty.length === 4 && empty.every((x) => x === null), "quatre logements vides au départ");
  ok(GI.choose(cands, empty, IM.START, t0).world === null, "aucun cristal : aucun monde, fenêtre noire");
  const roc = GI.normCry(ids("Ages/Roc.md")), r1 = GI.choose(cands, roc, IM.START, t0);
  ok(r1.world && r1.world.age.name === "Roc" && r1.planet, "les pages de Roc dans l'ordre : Roc, planète verrouillée");
  const seul = GI.normCry(ids("Ages/Seul.md")); ok(GI.choose(cands, seul, IM.START, t0).world.age.name === "Seul", "les pages de Seul : Seul");
  { const w = GI.choose(cands, seul, IM.START, t0, K); ok(!w.planet && (!w.world || w.world.age.name !== "Seul"), "le télescope tient Kerath : Seul (une autre étoile) ne peut pas répondre"); }
  const swapped = GI.normCry([ids("Ages/Roc.md")[1], ids("Ages/Roc.md")[0], ids("Ages/Roc.md")[2]]), r2 = GI.choose(cands, swapped, IM.START, t0);
  ok(r2.world && !r2.planet && r2.score > 0 && r2.score < 1, "deux cristaux intervertis : un monde approché, pas tenu (image dédoublée)");
  { const bad = GI.normCry([...ids("Ages/Roc.md").slice(0, 3), "zzz_wrong"]); ok(!GI.choose(cands, bad, IM.START, t0).planet && GI.score(bad, ids("Ages/Roc.md")) < 0.75, "un cristal faux à la place d'une page : pas tenu, et il brouille"); }
  ok(GI.choose(cands, GI.normCry(["zzz_unknown"]), IM.START, t0).world === null && GI.unwritten(["zzz_unknown"], null) === null, "aucun monde écrit : null (le crochet des mondes jamais écrits)");
  // même étoile, mêmes pages : l'atmosphère départage
  const bc = GI.normCry(ids("Ages/Brume.md"));
  const onB = GI.choose(cands, bc, { ...IM.START, ...tune(data["Ages/Brume.md"].target) }, t0, K), onC = GI.choose(cands, bc, { ...IM.START, ...tune(data["Ages/Cendre.md"].target) }, t0, K);
  ok(onB.world.age.name === "Brume" && onC.world.age.name === "Cendre" && onB.planet && onC.planet, "mêmes cristaux, même lumière : l'atmosphère choisit Brume ou Cendre");
  // la lumière renvoyée
  ok(GI.lightOf(cands, null) === null && JSON.stringify(GI.lightOf(cands, K)) === JSON.stringify(data["Ages/Brume.md"].target.lens), "la lumière : rien sans étoile tenue ; celle de Kerath sinon");
  // les gestes du râtelier
  let h = GI.place(empty, null, { rack: "water" }); ok(h.cry[0] === "water" && !h.hand, "un clic au râtelier : le cristal va dans le premier logement libre");
  h = GI.place(h.cry, null, { rack: "stone" }); ok(h.cry[1] === "stone", "puis le suivant");
  let h2 = GI.place(h.cry, null, { slot: 0 }); ok(h2.cry[0] === null && h2.cry[1] === "stone", "un clic sur un logement : il se vide");
  h2 = GI.place(h.cry, null, { rack: "stone" }); ok(h2.cry[1] === null, "un clic sur un cristal posé : il revient au râtelier");
  ok(GI.place(["a", "b", "c", "d"], null, { rack: "e" }).full, "logements pleins : rien ne bouge");
  const rocIds = ids("Ages/Roc.md"); ok(GI.exact(GI.normCry([...rocIds].reverse()), rocIds) && GI.score(GI.normCry([...rocIds].reverse()), rocIds) === 1, "l'ordre ne compte pas : les pages de Roc à l'envers tiennent Roc");
  ok(JSON.stringify(GI.normCry(["water", "water", "x"])) === JSON.stringify(["water", null, "x", null]), "un cristal n'est qu'à un endroit");
  // l'état gardé
  const g = GI.normalize({ ...IM.START, gcry: ["water", null, "fern"], seen: ["Roc", "Roc", "Brume"], lock: true, lockOn: "Ages/Roc.md" });
  ok(g.cry[0] === "water" && g.cry[2] === "fern" && g.seen.join() === "Brume,Roc" && g.lockOn === "Ages/Roc.md", "état relu : logements, mémoire du livre, monde tenu");
  const sv = GI.saved(IM.normalize({ lock: true }), g); ok(sv.lock && sv.lockOn === "Ages/Roc.md" && sv.gcry.length === 4 && IM.normalize(sv).lock, "état gardé : le réglage commun et celui du livre vierge");
  ok(IM.crystalScore(IM.START, { crystals: { ids: ["a"], options: ["b"] }, cryScore: 0.4 }) === 0.4, "la cible porte la justesse des cristaux du mode Guilde");
  ok(IM.crystalScore({ cry: [0, 1, 2, 3] }, { crystals: { ids: ["a"], options: ["a"] } }) === 1, "mode facile : la justesse d'avant");
}

// ---- 2. dans le Relto ----------------------------------------------------------------------------------------------
const tick = () => new Promise((res) => setTimeout(res, 0));
const relDone = (async () => {
  const pages = ["page_telescope", "page_mountain", "page_imager"];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages });
  const sc = M.buildScene(relto, [...pages.filter((id) => id !== "page_telescope").map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), ...M.builtinPages()], ages);
  sc.ages = ages;
  const store = {}, tunings = {}, sounds = [];
  let mode = "guild";
  const ageData = (age) => { const d = data[age.path]; return { target: d.target, model: null, system: d.system, orbit: d.orbit }; };
  const opts = (extra = {}) => ({ instrumentsMode: () => mode, telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, onImagerAge: ageData, imagerGet: (p) => tunings[p] || null, imagerSet: (p, v) => { tunings[p] = JSON.parse(JSON.stringify(v)); }, onImagerSound: (k) => sounds.push(k), ...extra });
  const mk = (extra) => { const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts(extra)); r.nowOverride = t0; r.setScene(sc); return r; };
  const clickOn = (r, f, why) => { const h = r.hot.find((x) => x.imager && f(x.imager)); ok(h, "zone cliquable : " + why); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); r.draw(2); return h; };

  // le télescope : Zéro trouvé, Kerath située
  const tr = mk(); tr.setView("telescope"); tr.draw(1);
  const ts = TL.state(tr); ts.found = true; ts.at = { torahn: ts.zero.torahn, elev: ts.zero.elevation };
  const sysK = data["Ages/Brume.md"].system, c = sysK.clue;
  ts.systems = { [K]: SS.record(sysK, ts.zero, { torahn: c.torahn, elev: c.elevation, delay: c.delay }, t0, { ages: ["Brume"] }) };
  TL.act(tr, { axis: "torahn", delta: 0 }); // garde l'état (aucun livre : rien de tenu)
  ok(store[ts.key] && !store[ts.key].aimedAt, "télescope sans livre : il ne tient aucune étoile");

  // l'Imageur au livre vierge
  const ri = mk(); ri.setView("imager"); ri.draw(1); await tick(); ri.draw(1.1);
  const st = ri.imager;
  ok(st.guild && st.cands.length === 4, "mode Guilde : l'appareil a lu les Âges de l'étagère");
  ok(!ri.hot.some((h) => h.imager && h.imager.book != null) && ri.hot.some((h) => /blank book/.test(h.tip)), "pas de ‹ › : un seul livre, vierge");
  ok(!st.world && !st.target && ri.hot.some((h) => /window is black/.test(h.tip)), "fenêtre noire tant qu'aucun monde ne répond");
  // II. le comparateur, sans télescope
  clickOn(ri, (a) => a.station === "lens", "poste II"); ri.draw(2);
  ok(!st.light && ri.hot.some((h) => /left side dark/.test(h.tip)), "sans étoile tenue : le comparateur est sombre à gauche");
  clickOn(ri, (a) => a.station === null, "reculer");
  // III. dort
  clickOn(ri, (a) => a.station === "atmo", "poste III"); ri.draw(2);
  ok(ri.hot.some((h) => /appears once the crystals hold a world/.test(h.tip)), "station III : le tube n'a pas de trace");
  const f0 = st.settings.freq; clickOn(ri, (a) => a.key === "freq" && a.delta > 0, "fréquence +");
  ok(st.settings.freq === f0 && sounds[sounds.length - 1] === "jam" && /regulator sleeps/.test(ri.flash.text), "station III endormie : les boutons ne tournent pas");
  clickOn(ri, (a) => a.station === null, "reculer");

  // le télescope tient Kerath : un livre de Kerath sur le lutrin, molettes sur ses indices
  TL.act(tr, { book: 1 }); await tick(); tr.draw(3);
  ok(tr.telescope.book.age.name === "Brume", "Brume sur le lutrin de l'observatoire");
  tr.telescope.dial = SS.normDial({ torahn: c.torahn, elev: c.elevation, delay: c.delay }); TL.act(tr, { axis: "torahn", delta: 0 });
  ok(store[ts.key].aimedAt === K && store[ts.key].book === "Ages/Brume.md", "molettes sur Kerath : le télescope tient l'étoile, c'est gardé");
  tr.draw(4); ok(true, "dessin de l'observatoire qui tient l'étoile");
  ri.draw(3); ok(st.star === K && st.light && st.light.r === data["Ages/Brume.md"].target.lens.r, "l'Imageur reçoit la lumière de Kerath");
  clickOn(ri, (a) => a.station === "lens", "poste II"); ri.draw(3);
  ok(ri.hot.some((h) => /light the telescope sends/.test(h.tip)), "le comparateur s'allume à gauche");
  clickOn(ri, (a) => a.station === null, "reculer");
  { // relu par un autre rendu (le télescope n'est pas ouvert) : la cible tient toujours
    const r2 = mk(); r2.setView("imager"); r2.draw(1); await tick(); r2.draw(1.1); ok(r2.imager.star === K, "relu : la cible du télescope est gardée");
  }

  // I. les cristaux : le râtelier offre les glyphes connus
  clickOn(ri, (a) => a.station === "cry", "poste I"); ri.draw(4);
  const rackIds = ri.hot.filter((h) => h.imager && typeof h.imager.rack === "string").map((h) => h.imager.rack), known = GI.rackOf(ages, st.cands);
  ok(ri.hot.filter((h) => h.imager && h.imager.slot != null).length === 4, "quatre logements");
  ok(rackIds.length === Math.min(GI.RACK, known.length) && rackIds.every((id) => known.includes(id)), `le râtelier : les glyphes connus (${rackIds.join(", ")})`);
  if (known.length > GI.RACK) ok(ri.hot.some((h) => h.imager && h.imager.rackPage === 1), "plus de huit : on change de rangée");
  // les pages de Roc dans l'ordre
  const put = (id) => { let pg = 0; while (!ri.hot.some((h) => h.imager && h.imager.rack === id) && pg++ < 5) clickOn(ri, (a) => a.rackPage === 1, "rangée suivante"); clickOn(ri, (a) => a.rack === id, "cristal " + id); }; // un clic : il va dans le premier logement libre
  const roc = ids("Ages/Roc.md"); put(roc[2]); put(roc[0]); put(roc[3]);
  ok(!st.planet, "trois cristaux sur quatre : pas encore de planète");
  put(roc[1]);
  ok(st.planet && st.world.age.name === "Roc" && sounds.includes("lock") && /regulator wakes/.test(ri.flash.text), "les pages de Roc, dans n'importe quel ordre : la planète est tenue, la station III s'éveille");
  ok(tunings[ri.imagerGuildKey()] && tunings[ri.imagerGuildKey()].gcry.slice().sort().join() === [...roc].sort().join(), "les logements sont gardés (état du livre vierge, à part)");
  ok(!tunings["Ages/Roc.md"], "le mode Guilde n'écrit pas dans le réglage de l'Âge (mode facile)");
  clickOn(ri, (a) => a.station === null, "reculer");
  clickOn(ri, (a) => a.station === "atmo", "poste III"); ri.draw(5);
  ok(!ri.hot.some((h) => /appears once the crystals/.test(h.tip)), "station III : la trace du ciel est là");
  clickOn(ri, (a) => a.station === null, "reculer");

  // même étoile : Brume et Cendre (mêmes cristaux), l'atmosphère départage
  clickOn(ri, (a) => a.station === "cry", "poste I");
  for (let i = 3; i >= 0; i--) clickOn(ri, (a) => a.slot === i, "vider le logement " + (i + 1)); // un clic : le cristal revient
  ok(st.g.cry.every((x) => !x) && !st.world, "logements vidés : fenêtre noire");
  const bc = ids("Ages/Brume.md"); bc.forEach((id) => put(id));
  ok(st.planet && ["Brume", "Cendre"].includes(st.world.age.name), "les pages de Brume et Cendre : un des deux mondes");
  st.settings = IM.normalize({ ...st.settings, ...tune(data["Ages/Cendre.md"].target) }); ri.draw(6);
  ok(st.world.age.name === "Cendre", "l'atmosphère de Cendre : Cendre");
  st.settings = IM.normalize({ ...st.settings, ...tune(data["Ages/Brume.md"].target), phase: IM.phaseAt(data["Ages/Brume.md"].target, t0) + 4 });
  ri.imagerAct({ key: "phase", delta: -8 }); ri.draw(7);
  ok(st.world.age.name === "Brume", "l'atmosphère de Brume : Brume");
  ok(ri.imagerClarity().total > 0.97 && st.g.seen.includes("Brume") && /book remembers — Brume/.test(ri.flash.text), "les trois réglages justes : l'image se forme, le livre se souvient de Brume");
  clickOn(ri, (a) => a.station === null, "reculer"); ri.draw(8);
  ok(ri.hot.some((h) => /The blank book remembers: Brume/.test(h.tip)) && ri.hot.some((h) => h.tip === "Brume"), "le nom inscrit sur la page ; l'écran le dit");
  // le verrou et le périscope comme avant
  clickOn(ri, (a) => a.lock, "verrou"); ok(st.settings.lock && st.g.lockOn === "Ages/Brume.md" && tunings[ri.imagerGuildKey()].lockOn === "Ages/Brume.md", "le verrou prend et tient Brume");
  ri.nowOverride = t0 + 6 * 3600000; ri.draw(9); ok(st.world.age.name === "Brume" && ri.imagerClarity().total > 0.97, "six heures plus tard : la machine a suivi Brume");
  clickOn(ri, (a) => a.key === "az" && a.delta > 0, "manivelle"); ok(st.settings.az === 1, "le périscope tourne");
  // étape 2 : la synchro trouve la planète dans son système
  ok(ri.imagerCal() && ri.hot.some((h) => h.imager && h.imager.sync != null), "Kerath située : le micromètre de synchro");
  let k = 0; while (!ri.imagerCal().synced && k++ < 80) { const g = ri.imagerCal().gap, d = Math.abs(g) > 5 ? 10 : 1; ri.imagerAct({ sync: Math.sign(g || 1) * d }); }
  ok(ri.imagerCal().synced && ri.imagerCal().lt.known && st.g.syncFor === "Ages/Brume.md", `synchronisé (${k} gestes) : l'heure là-bas`);
  ok(tunings["Ages/Brume.md"] && tunings["Ages/Brume.md"].syncAt === ri.nowOverride, "la synchro est aussi écrite pour Brume (son onglet Détails dit l'heure)");
  ri.draw(10); ok(ri.hot.some((h) => /KIPS/.test(h.tip)), "les coordonnées KIPS");
  clickOn(ri, (a) => a.lock, "relâcher"); ok(!st.settings.lock, "relâché");

  // relu : le livre se souvient
  { const r3 = mk(); r3.nowOverride = ri.nowOverride; r3.setView("imager"); r3.draw(1); await tick(); r3.draw(1.1); ok(r3.imager.g.seen.includes("Brume") && r3.imager.world && r3.imager.world.age.name === "Brume", "relu : les logements et la mémoire du livre"); }

  // le télescope lâche l'étoile : plus de lumière, et Roc / Seul redeviennent possibles à l'aveugle
  TL.act(tr, { book: 1 }); await tick(); ok(tr.telescope.book.age.name === "Cendre" && store[ts.key].aimedAt === K, "Cendre sur le lutrin (même étoile, mêmes indices) : Kerath reste tenue");
  TL.act(tr, { book: 2 }); await tick(); ok(tr.telescope.book.age.name === "Seul" && !store[ts.key].aimedAt, "Seul sur le lutrin (étoile non située) : le télescope ne tient plus Kerath");
  ri.draw(11); ok(!st.light, "comparateur sombre à nouveau");

  // aucun monde : fenêtre noire
  clickOn(ri, (a) => a.station === "cry", "poste I");
  for (let i = 3; i >= 0; i--) clickOn(ri, (a) => a.slot === i, "vider");
  put("water", 0); put("stone", 1); put("fern", 2); put("orange_sun", 3);
  ok(st.world && !st.planet, "des cristaux mêlés : un monde approché, jamais tenu");
  for (let i = 3; i >= 0; i--) clickOn(ri, (a) => a.slot === i, "vider");
  ok(!st.world && !st.target && ri.imagerClarity().total === 0, "aucun cristal : aucun monde, fenêtre noire");
  ok(bad === 0, "aucun nombre non fini");

  // en français
  const rf = mk({ t: makeT(() => "fr") }); rf.setView("imager"); rf.draw(1); await tick(); rf.draw(1.1);
  ok(rf.hot.some((h) => /livre vierge/.test(h.tip)), "en français : le livre vierge");

  // ---- 3. le mode facile : inchangé ----
  mode = "easy";
  const re = mk(); re.setView("imager"); re.draw(1); await tick(); re.draw(1.1);
  ok(!re.imager.guild && re.imager.age.name === "Brume" && re.hot.some((h) => h.imager && h.imager.book === 1), "mode facile : le lutrin et ‹ ›, comme en 1.19");
  ok(re.hot.some((h) => /Comparator|Crystal rack/.test(h.tip)) && !re.hot.some((h) => /blank book/.test(h.tip)), "mode facile : pas de livre vierge");
  ok(re.imager.settings.syncAt === tunings["Ages/Brume.md"].syncAt, "mode facile : le réglage gardé par Âge se relit");
  { const r4 = mk(); r4.setView("telescope"); r4.draw(1); TL.act(r4, { book: 1 }); await tick(); r4.telescope.dial = SS.normDial({ torahn: c.torahn, elev: c.elevation, delay: c.delay }); TL.act(r4, { axis: "torahn", delta: 0 }); ok(!store[ts.key].aimedAt, "mode facile : le télescope ne garde rien de plus"); }
  mode = "guild"; ri.draw(12); ok(ri.imager.guild, "retour au mode Guilde : l'état du livre vierge est là");
})();

relDone.then(() => {
  ok(Object.keys(D.en).filter((k) => k.startsWith("guild.")).every((k) => D.fr[k]) && Object.keys(D.fr).filter((k) => k.startsWith("guild.")).every((k) => D.en[k]), "textes du livre vierge en anglais et en français");
  hooks.skip = skip0;
  console.log(`✓ imager-guild.test.js (${n} contrôles)`);
}).catch((e) => { console.error(e); console.log("FAIL"); process.exit(1); });
