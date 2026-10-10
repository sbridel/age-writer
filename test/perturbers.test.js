"use strict";
// Télescope, étape 3 : perturbateurs (existence, écriture, faux pouls, lumière courbée), triangulation par balises, fausse
// ligne de Me'erta (décalage, détection, correction), carte des étoiles, dérive liée au nord magnétique. Modèles purs, puis
// l'observatoire et la carte (rendu dans jsdom, avec un faux contexte 2D).
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
const T = require("../src/telescope"), SS = require("../src/starsystem"), PB = require("../src/perturbers"), CAL = require("../src/calibration"), MAP = require("../src/starmap"), SKY = require("../src/sky"), G = require("../src/genscene");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), TL = require("../src/relto-telescope"), { Dni } = require("../src/dni"), { D, makeT } = require("../src/i18n");
const { analyseAgeBase } = require("../src/engine/analysis"), { describeAge } = require("../src/engine/prose"), { glyphShapes } = require("../src/engine/glyphs");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
hooks.skip = (l) => P.isPhysicsLine(l) || SKY.DAY_RE.test(l) || SKY.YEAR_RE.test(l) || SS.SYSTEM_RE.test(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const sysOf = (src, name) => SS.systemOf(A(src, name), src, name);
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const DAY = 86400000, t0 = 1.8e12;
const angle = (a, b) => { let d = Math.abs(((a - b) % T.TURN + T.TURN) % T.TURN); return Math.min(d, T.TURN - d); };
/** La première clé d'étoile (sans rien écrire) dont les perturbateurs vérifient `f`. */
const findKey = (f, pre = "single_sun@t") => { for (let i = 0; i < 5000; i++) { const k = pre + i, p = SS.placeSystem(k, []), fx = PB.effects(p.near, p.key, SS.delayOf(p.pos), SS.DELAY_MAX); if (f(p, fx)) return { key: k, p, fx }; } return null; };

// ---- 1. les perturbateurs existent dans la région, écrits ou non ---------------------------------------------------
{
  ok(JSON.stringify(PB.cellBodies(3, -2)) === JSON.stringify(PB.cellBodies(3, -2)) && JSON.stringify(PB.near({ torahn: 1234, distance: 9000, elevation: 5 })) === JSON.stringify(PB.near({ torahn: 1234, distance: 9000, elevation: 5 })), "déterministe : même case, même région, mêmes perturbateurs");
  let perturbed = 0, kinds = { pulsar: 0, neutron_star: 0, black_hole: 0 }; const N = 2000;
  for (let i = 0; i < N; i++) { const near = PB.near(SS.position("single_sun@p" + i)); if (near.length) perturbed++; for (const p of near) kinds[p.kind]++; }
  ok(perturbed > N * 0.08 && perturbed < N * 0.3, `une chance modeste par étoile (${(100 * perturbed / N).toFixed(1)} % des étoiles en ressentent un)`);
  ok(kinds.pulsar > kinds.black_hole && kinds.neutron_star > 0 && kinds.black_hole > 0, `les trois genres existent, le trou noir est le plus rare (${JSON.stringify(kinds)})`);
  // le cœur calme : rien près du Zéro (le premier Âge, souvent proche, reste mesurable)
  let core = 0; for (let i = 0; i < 400; i++) { const d = 200 + (i * 7) % 1800; if (PB.near({ torahn: (i * 977) % T.TURN, distance: d, elevation: 0 }).length) core++; }
  ok(core === 0, "le cœur calme : aucun perturbateur ne se fait sentir à moins de 2 000 shahfeetee du Zéro");
  // des voisines partagent le même
  const f = findKey((p) => p.near.length > 0); ok(f, "une étoile perturbée sans rien écrire");
  const id = f.p.near[0].id, pp = f.p.near[0]; let shared = 0;
  for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2, x = pp.x + Math.cos(a) * pp.reach * 0.5, y = pp.y + Math.sin(a) * pp.reach * 0.5, pos = { torahn: Math.round(((Math.atan2(x, y) / (Math.PI * 2)) * T.TURN + T.TURN) % T.TURN), distance: Math.round(Math.hypot(x, y)), elevation: pp.z }; if (PB.near(pos).some((q) => q.id === id)) shared++; }
  ok(shared >= 38, `les étoiles voisines partagent le même perturbateur (${shared}/40)`);
  // indépendants de l'écriture : la matière d'un Âge ne change rien à son ciel
  const sysA = sysOf("single_sun\nwater\nsystem: Vael", "Un"), sysB = sysOf("single_sun\nstone\nfern\nlava\nsystem: vael", "Deux");
  ok(sysA.key === sysB.key && JSON.stringify(sysA.near) === JSON.stringify(sysB.near), "deux Âges du même système : les mêmes perturbateurs, quoi qu'ils écrivent d'autre");
}

// ---- 2. écrire un perturbateur le DÉCRIT, ne le crée pas ---------------------------------------------------------
{
  // une étoile qui en a déjà un : l'écrire ne change rien (ni clé, ni place)
  const f = findKey((p) => p.near.some((q) => q.kind === "pulsar"), "single_sun@w");
  const plain = SS.placeSystem(f.key, []), written = SS.placeSystem(f.key, ["pulsar"]);
  ok(written.key === plain.key && JSON.stringify(written.pos) === JSON.stringify(plain.pos) && !written.moved, "l'étoile a déjà un pulsar : l'écrire ne la déplace pas");
  // une étoile qui n'en a pas : le livre décrit une autre étoile, qui en a un ; jamais un monde sans
  let all = 0, fail = 0, moved = 0;
  for (const kinds of [["pulsar"], ["neutron_star"], ["black_hole"], ["pulsar", "black_hole"], ["pulsar", "neutron_star", "black_hole"]]) for (let i = 0; i < 60; i++) {
    const p = SS.placeSystem("single_sun@q" + i, kinds), have = new Set(p.near.map((q) => q.kind)); all++;
    if (!kinds.every((k) => have.has(k))) fail++; if (p.moved) moved++;
    if (p.pos.distance < SS.SYS_DIST[0] || p.pos.distance > SS.SYS_DIST[1] || Math.abs(p.pos.elevation) > SS.SYS_ELEV) fail++;
  }
  ok(fail === 0 && moved > all / 2, `écrit, il est toujours là (${all} essais, ${moved} étoiles choisies ailleurs, jamais un ciel qui le contredit)`);
  const w1 = sysOf("single_sun\nwater\nblack_hole", "Gouffre"), w2 = sysOf("single_sun\nwater\nblack_hole", "Gouffre");
  ok(w1.written.join() === "black_hole" && w1.near.some((q) => q.kind === "black_hole") && w1.key === w2.key && w1.fx.deflect, "un Âge qui écrit `black_hole` : un trou noir est près de son étoile, sa lumière est courbée (reproductible)");
  ok(sysOf("single_sun\nwater", "Gouffre").key !== w1.key || sysOf("single_sun\nwater", "Gouffre").near.some((q) => q.kind === "black_hole"), "sans la ligne, l'étoile d'origine (réécrire déplace le monde, comme changer de soleil)");
  // moteur : reconnus, coûts, jamais tirés, phrases, glyphes, contradiction
  const base = analyseAgeBase("single_sun", { seed: "Q" }).stability;
  ok(["pulsar", "neutron_star", "black_hole"].every((id) => { const a = analyseAgeBase("single_sun\n" + id, { seed: "Q" }); return !a.resolved.lines.some((l) => l.unknown) && a.stability < base; }), "moteur : les trois blocs sont reconnus et coûtent un peu de stabilité");
  ok((analyseAgeBase("single_sun\nblack_hole\nstable_orbit", { seed: "Q" }).resolved.triggered || []).some((t) => t.severity === "light"), "le trou noir trouble une orbite stable (légère)");
  ok((analyseAgeBase("single_sun\npulsar\nfern", { seed: "Q" }).resolved.triggered || []).length > 0, "le faisceau du pulsar pèse sur la vie (légère)");
  let leak = 0; for (let i = 0; i < 200; i++) { const a = analyseAgeBase("water", { seed: "w" + i }); if (a.resolved.lines.some((l) => l.entry && PB.KINDS.includes(l.entry.id))) leak++; } ok(leak === 0, "jamais tirés au sort");
  ok(["pulsar", "neutron_star", "black_hole"].every((id) => SKY.SKY_PROSE[id] && SKY.SKY_PROSE[id].some((s) => describeAge(analyseAgeBase(id + "\nwater", { seed: "Q" }).resolved).toLowerCase().includes(s.toLowerCase().slice(0, 30)))), "une phrase de description pour chacun");
  ok(["pulsar", "neutron_star", "black_hole"].every((id) => Array.isArray(glyphShapes(id)) && glyphShapes(id).length >= 4), "un glyphe dessiné pour chacun (même langage que le ciel)");
  // la fenêtre générative les montre
  const S = G.sceneOf(A("single_sun\nwater\npulsar\nblack_hole", "Ciel"), "Ciel"); ok(S.remnants.join() === "pulsar,black_hole", "fenêtre générative : les perturbateurs écrits");
  const m = G.build(S, 300, 176); ok(m.remn.length === 2 && m.remn.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), "fenêtre générative : leur place tirée de la graine");
  const g = dom.window.document.createElement("canvas").getContext("2d"); for (const t of [0, 0.3, 0.8]) G.paint(g, m, t); ok(bad === 0, "fenêtre générative : peinte sans nombre non fini");
}

// ---- 3. les effets : faux pouls, lumière courbée ---------------------------------------------------------------
{
  const ps = findKey((p, fx) => fx.beat && fx.beat.kind === "pulsar" && !fx.deflect), ns = findKey((p, fx) => fx.beat && fx.beat.kind === "neutron_star" && !fx.deflect), bh = findKey((p, fx) => !!fx.deflect && !fx.beat);
  ok(ps && ns && bh, "des étoiles à pulsar, à étoile à neutrons, à trou noir");
  ok(ps.fx.beat.period > 0 && ps.fx.beat.period < 1 && ns.fx.beat.period > 1 && ns.fx.beat.period >= PB.PERIOD.neutron_star[0] && ns.fx.beat.period <= PB.PERIOD.neutron_star[1], `faux pouls : le pulsar plus vite que le Zéro (${ps.fx.beat.period} prorahn), l'étoile à neutrons plus lentement (${ns.fx.beat.period})`);
  const sys = (f) => ({ key: f.p.key, pos: f.p.pos, near: f.p.near });
  const S1 = SS.systemOf(null, "", ""), src = SS.sources(ps.p.pos, { perturbers: [{ kind: "pulsar", period: ps.fx.beat.period }] });
  ok(src.length === 2 && src[0].period === 1 && src[1].period === ps.fx.beat.period && S1.sources[0].kind === "zero", "les sources : le Zéro au prorahn, le faux pouls à sa propre période");
  const vp = SS.perceive(sys(ps)); ok(vp.seen.delay !== vp.clue.delay && Math.abs(vp.seen.delay - vp.clue.delay) >= PB.DELAY_ERR[0] && vp.seen.torahn === vp.clue.torahn, `faux pouls : l'arpenteur lit un retard faux (${vp.seen.delay} au lieu de ${vp.clue.delay}), la direction reste juste`);
  const vb = SS.perceive(sys(bh)), dev = angle(vb.seen.torahn, vb.clue.torahn);
  ok(dev >= PB.DEFLECT.torahn[0] && dev <= PB.DEFLECT.torahn[1] && vb.seen.delay === vb.clue.delay, `trou noir : la direction est fausse de ${dev} torantee (${PB.DEFLECT.torahn.join(" à ")}), le retard reste juste`);
  ok(!SS.measure({ torahn: vb.seen.torahn, elev: vb.seen.elevation, delay: vb.seen.delay }, vb.clue).located, "reporter la direction déviée : pas situé");
  ok(!SS.measure({ torahn: vp.seen.torahn, elev: vp.seen.elevation, delay: vp.seen.delay }, vp.clue).located, "reporter le retard faussé : pas situé");
  // l'oculaire : le leurre ne tient jamais, le vrai point (pâle) situe
  const scB = SS.scope({ torahn: vb.seen.torahn, elev: vb.seen.elevation, delay: vb.clue.delay }, sys(bh));
  ok(scB.bend && scB.lure && scB.lure.band >= 4 && !scB.m.located && scB.bentLock && scB.shown === scB.lure, "trou noir : sur l'image déviée, une lueur brillante qui ne tient pas");
  const scB2 = SS.scope({ torahn: vb.clue.torahn, elev: vb.clue.elevation, delay: vb.clue.delay }, sys(bh));
  ok(scB2.m.located && scB2.true.found, "trou noir : au bout pâle de l'arc, le vrai point situe (dur, pas impossible)");
  const near = SS.scope({ torahn: (vb.clue.torahn + 800) % T.TURN, elev: vb.clue.elevation, delay: vb.clue.delay }, sys(bh)), plainNear = SS.measure({ torahn: (vb.clue.torahn + 800) % T.TURN, elev: vb.clue.elevation, delay: vb.clue.delay }, vb.clue);
  ok(near.true.s < plainNear.s, "trou noir : le vrai point est plus pâle qu'ailleurs");
  const scP = SS.scope({ torahn: vp.clue.torahn, elev: vp.clue.elevation, delay: vp.seen.delay }, sys(ps));
  ok(scP.beat && scP.falseLock && !scP.m.located, "faux pouls : l'écho s'accorde sur le faux battement, rien ne tient");
  ok(SS.scope({ torahn: vp.clue.torahn, elev: vp.clue.elevation, delay: vp.clue.delay }, sys(ps)).m.located, "faux pouls : au vrai retard, situé");
  // les mots de l'arpenteur
  const wp = SS.words(vp.seen, "en", { fx: ps.fx }), wpf = SS.words(vp.seen, "fr", { fx: ps.fx }), wn = SS.words(SS.perceive(sys(ns)).seen, "en", { fx: ns.fx }), wb = SS.words(vb.seen, "en", { fx: bh.fx });
  ok(/second, faster beat crosses the Zero's/.test(wp.pert) && /pulsar/.test(wp.pert) && /plus rapide/.test(wpf.pert), "les mots : « a second, faster beat crosses the Zero's » / « plus rapide »");
  ok(/slower beat/.test(wn.pert) && /neutron star/.test(wn.pert) && /bent, smeared into an arc/.test(wb.pert), "les mots : l'étoile à neutrons plus lente, la lumière courbée");
  ok(!/\d/.test(wp.pert) && wp.values.beats === Math.round(25 / ps.fx.beat.period) && !("beats" in wb.values), "aucun chiffre dans les mots ; « complètes » : les faux battements pour 25 prorahn");
  ok(!SS.words(SS.perceive({ key: "x", pos: SS.position("x"), near: [] }).seen, "en").pert, "sans perturbateur : rien de plus");
}

// ---- 4. la triangulation : deux balises voisines annulent déviation et faux pouls ------------------------------------
{
  const bh = findKey((p, fx) => !!fx.deflect), sys = { key: bh.p.key, pos: bh.p.pos, near: bh.p.near }, S = SS.cart(bh.p.pos);
  const beacon = (dx, dy, line = 0) => { const v = { x: S.x + dx, y: S.y + dy, z: S.z }, c = SS.cyl(v); return { at: t0, torahn: (c.torahn + line + T.TURN) % T.TURN, distance: c.distance, elevation: c.elevation, ...(line ? { line } : {}) }; };
  const one = { b1: beacon(800, 300) }, two = { b1: beacon(800, 300), b2: beacon(-1200, 900) }, far = { b1: beacon(800, 300), b2: beacon(9000, 0) };
  ok(!SS.beacons(sys, one).ok && SS.beacons(sys, two).ok && SS.beacons(sys, two).agree && !SS.beacons(sys, far).ok, `il faut deux étoiles situées à moins de ${SS.BEACON_RANGE} shahfeetee`);
  const v = SS.perceive(sys, { tri: true }); ok(v.tri && v.seen.torahn === v.clue.torahn && v.seen.delay === v.clue.delay && v.seen.elevation === v.clue.elevation, "triangulé : l'arpenteur lit juste");
  const sc = SS.scope({ torahn: v.clue.torahn, elev: v.clue.elevation, delay: v.clue.delay }, sys, { tri: true }); ok(!sc.lure && !sc.bend && sc.m.located && sc.true.s === sc.m.s, "triangulé : plus de leurre, le vrai point a tout son éclat");
  const ps = findKey((p, fx) => fx.beat), sp = { key: ps.p.key, pos: ps.p.pos, near: ps.p.near };
  ok(!SS.scope({ torahn: 0, elev: 0, delay: 0 }, sp, { tri: true }).beat, "triangulé : le faux pouls s'efface aussi");
  // des balises gravées sur une autre ligne ne s'accordent pas
  const mixed = { b1: beacon(800, 300), b2: beacon(-1200, 900, 2000) };
  ok(SS.beacons(sys, mixed).ok && !SS.beacons(sys, mixed).agree && SS.beacons(sys, mixed, 0).list.length === 2, "balises gravées sur des lignes différentes : elles se contredisent");
}

// ---- 5. la fausse ligne de Me'erta : un vrai piège, détectable, réparable --------------------------------------------
{
  const zero = T.greatZero("Relto", 77), key = T.keyOf("Relto", 77), old = SS.oldLine(zero, key);
  ok(JSON.stringify(old) === JSON.stringify(SS.oldLine(zero, key)) && Math.abs(old.L) >= SS.OLD_LINE.torahn[0] && Math.abs(old.L) <= SS.OLD_LINE.torahn[1] && old.period !== 1, `la ligne ancienne : à ${old.L} torantee de la vraie, un pouls à contretemps (${old.period})`);
  let oldL = 0; for (let s = 0; s < 100; s++) { const o = SS.oldLine(T.greatZero("R", s), T.keyOf("R", s)); if (Math.abs(o.L) > T.TOL.torahn * 4 && Math.abs(o.elevation) <= T.ELEV_MAX) oldL++; } ok(oldL === 100, "toujours bien distincte du vrai Zéro, dans les butées");
  const onOld = SS.lineSignals({ torahn: old.torahn, elev: old.elevation }, zero, old), onTrue = SS.lineSignals({ torahn: zero.torahn, elev: zero.elevation }, zero, old);
  ok(onOld.old.found && !onOld.true.found && onOld.best.line === old.L && onTrue.true.found && onTrue.best.line === 0, "dans l'anneau de l'une ou de l'autre : l'instrument sait laquelle");
  ok(onOld.old.s < onTrue.true.s, "la ligne ancienne est plus pâle que la vraie");
  // calibré sur elle, toute étoile située ensuite est décalée d'autant
  let shifted = 0, all = 0;
  for (let i = 0; i < 100; i++) {
    const sys = { key: "k" + i, pos: SS.position("k" + i), near: [] }, c = SS.zeroSeenFrom(sys.pos), dial = { torahn: c.torahn, elev: c.elevation, delay: c.delay };
    const good = SS.record(sys, zero, dial, t0), wrong = SS.record(sys, zero, dial, t0, { line: old.L }); all++;
    if (angle(wrong.torahn, good.torahn) === Math.abs(old.L) && wrong.distance === good.distance && wrong.line === old.L && !("line" in good) && SS.miss(good) === 0 && SS.miss(wrong) === Math.abs(old.L)) shifted++;
  }
  ok(shifted === all, `sur la ligne ancienne : chaque étoile gravée tourne de ${Math.abs(old.L)} torantee, et son trait manque le Zéro d'autant (${shifted}/${all})`);
  const sys = { key: "x", pos: SS.position("x"), near: [] }, c = SS.zeroSeenFrom(sys.pos), dial = { torahn: c.torahn, elev: c.elevation, delay: c.delay };
  const L1 = SS.locate(SS.believedZero(zero, old.L), dial).reltoAt, L0 = SS.locate(zero, dial).reltoAt; ok(angle(L1.torahn, L0.torahn) === Math.abs(old.L), "le Relto lui-même se croit ailleurs d'autant");
  // l'heure là-bas est fausse
  const o = CAL.orbitOf(null, "Heure"); ok(Math.abs(CAL.lineShift(o, old.L) - (old.L / T.TURN) * o.dayMs) < 1 && CAL.lineShift(o, 0) === 0, "gravée sur la ligne ancienne, l'heure locale est décalée d'autant");
  // les anciens états (étape 2) restent justes
  ok(SS.miss({ at: 1, torahn: 100, distance: 2, elevation: 0 }) === 0 && !SS.offLine({ at: 1, torahn: 100 }), "une étoile de l'étape 2 (sans `seen` ni `line`) ne trahit rien");
}

// ---- 6. la carte des étoiles ---------------------------------------------------------------------------------------
{
  const zero = T.greatZero("Carte", 5), recOf = (k, line = 0, ages = []) => { const sys = { key: k, pos: SS.position(k), near: PB.near(SS.position(k)) }, c = SS.zeroSeenFrom(sys.pos); return SS.record(sys, zero, { torahn: c.torahn, elev: c.elevation, delay: c.delay }, t0, { line, ages }); };
  const m0 = MAP.layout(zero, {}); ok(!m0.stars.length && Math.abs(Math.hypot(m0.relto.x, m0.relto.y) - zero.distance) < 1, "carte vide : le Zéro et le Relto (à sa distance)");
  const one = { "a@sys:kerath": recOf("a@sys:kerath", 0, ["Brume", "Cendre"]) }, m1 = MAP.layout(zero, one);
  ok(m1.stars.length === 1 && m1.anchored && m1.stars[0].ages.join() === "Brume,Cendre" && m1.stars[0].name === "Brume, Cendre" && m1.stars[0].miss === 0, "un seul Âge bien situé ancre la carte ; ses Âges en légende");
  // placement cohérent : sur la carte, l'étoile est là où l'instrument l'a calculée vue du Relto
  const rec = one["a@sys:kerath"], s = m1.stars[0]; ok(Math.hypot(s.x - m1.relto.x - rec.rel.x, s.y - m1.relto.y - rec.rel.y) < SS.DELAY_UNIT + 2, "placement : étoile − Relto = la position vue du Relto que l'instrument a gravée");
  ok(Math.abs(s.ray.x * -s.x + s.ray.y * -s.y - Math.hypot(s.x, s.y)) < Math.hypot(s.x, s.y) * 0.01, "le trait de l'étoile pointe le Zéro");
  // une étoile perturbée y porte son perturbateur
  let pk = null; for (let i = 0; i < 3000 && !pk; i++) if (PB.near(SS.position("p@" + i)).length) pk = "p@" + i;
  const mp = MAP.layout(zero, { [pk]: recOf(pk) }); ok(mp.stars[0].pert.length > 0 && mp.stars[0].pert.every((q) => Number.isFinite(q.x) && PB.KINDS.includes(q.kind)), "un système perturbé : son perturbateur sur la carte");
  // la fausse ligne : visible, et deux lignes se côtoient
  const old = SS.oldLine(zero, T.keyOf("Carte", 5)), mixed = { ...one, "b@x": recOf("b@x", old.L, ["Seul"]) }, mm = MAP.layout(zero, mixed);
  ok(mm.mixed && mm.offLine === 1 && mm.stars.find((q) => q.key === "b@x").miss === Math.abs(old.L) && mm.stars.find((q) => q.key === "b@x").offLine, "fausse ligne : l'étoile gravée dessus manque le Zéro, la carte ne se referme pas");
  const allOld = MAP.layout(zero, { "b@x": recOf("b@x", old.L) }, old.L); ok(!allOld.anchored && allOld.stars[0].miss > 0 && !allOld.mixed, "tout sur la ligne ancienne : la carte semble cohérente, mais les traits manquent le Zéro");
  const P = MAP.fit(mm, { x: 0, y: 0, w: 400, h: 300 }), pts = [P.at(0, 0), P.at(mm.relto.x, mm.relto.y), ...mm.stars.map((q) => P.at(q.x, q.y))];
  ok(pts.every(([x, y]) => x >= 0 && x <= 400 && y >= 0 && y <= 300), "projetée : tout tient dans le cadre");
  ok(JSON.stringify(P.at(0, 0)) === JSON.stringify([200, 150]) && P.at(0, 100)[1] < 150 && P.at(100, 0)[0] > 200, "le Zéro au centre, le nord en haut, l'est à droite");
}

// ---- 7. la dérive : nord magnétique et perturbateurs --------------------------------------------------------------
{
  ok(CAL.driftOf({ field: 1 }).rate === 1 && CAL.driftOf({}).rate === 1, "un vrai champ (ou inconnu) : la dérive d'une semaine");
  ok(CAL.driftOf({ field: 0 }).rate === 2 && CAL.driftOf({ field: 0 }).why.join() === "nofield" && CAL.driftOf({ field: 0.1 }).rate === 1.4, "sans dynamo : deux fois plus vite ; champ faible : 1,4");
  ok(CAL.driftOf({ field: 1, near: [{ kind: "black_hole" }] }).rate === 1.5 && CAL.driftOf({ field: 1, near: [{ kind: "pulsar" }] }).rate === 1.3, "près d'un trou noir : 1,5 ; d'un pulsar : 1,3");
  ok(CAL.driftOf({ field: 0, near: [{ kind: "black_hole" }, { kind: "pulsar" }] }).rate <= CAL.DRIFT_CAP, "plafonnée");
  ok(CAL.quality(t0, t0 + 3.5 * DAY, 2) === 1 && CAL.quality(t0, t0 + 4 * DAY, 2) < 1 && CAL.quality(t0, t0 + 5.25 * DAY, 2) === 0.5 && CAL.quality(t0, t0 + 7 * DAY, 2) === 0 && CAL.quality(t0, t0 + 10.5 * DAY) === 0.5, "sans nord : intacte 3,5 jours, perdue à 7 ; l'ancienne dérive inchangée par défaut");
  const dead = A("single_sun\nwater\ndead_core", "Mort"), live = A("single_sun\nwater\nmolten_core\nrotation: 24", "Vif"), od = CAL.orbitOf(dead, "Mort"), ol = CAL.orbitOf(live, "Vif");
  ok(dead.physics.w.field === 0 && od.drift === 2 && od.why.includes("nofield") && ol.drift === 1, "le modèle physique : noyau mort, pas de champ, dérive double ; noyau en fusion qui tourne : normale");
  const s = { sync: CAL.orbitAt(od, t0), syncAt: t0 }; ok(CAL.state(s, od, true, t0 + 5 * DAY).certain === true && CAL.state(s, od, true, t0 + 6 * DAY).certain === false && CAL.state(s, ol, true, t0 + 6 * DAY).certain, "l'heure là-bas se perd plus tôt sans nord magnétique");
  // la boussole de l'arpenteur
  ok(SS.compassOf(2) === 16 && SS.compassOf(0.1) === 8 && SS.compassOf(0) === 4 && SS.compassOf(null) === 16, "boussole : 16, 8 ou 4 directions selon le champ");
  const clue = { torahn: T.TURN / 8, elevation: 0, delay: 10, strength: 1 }, w16 = SS.words(clue, "en"), w4 = SS.words(clue, "en", { compass: 4 }), w8 = SS.words({ ...clue, torahn: 3 * T.TURN / 16 }, "en", { compass: 8 });
  ok(w16.parts.dir === "to the north-east" && /^somewhere to the (north|east)$/.test(w4.parts.dir) && /no compass finds north/i.test(w4.pert) && /^to the (north-east|east)$/.test(w8.parts.dir) && /wavers/.test(w8.pert), "sans nord, des relèvements grossiers ; l'arpenteur le dit");
  ok(D.en["sys.compass.four"].split("|").length === 4 && D.fr["sys.compass.four"].split("|").length === 4, "quatre points cardinaux dans les deux langues");
}

// ---- 8. dans l'observatoire : le piège, la carte, la triangulation, en jouant -------------------------------------
const relDone = (async () => {
  const bh = findKey((p, fx) => !!fx.deflect);
  const srcs = { "Ages/Brume.md": ["single_sun\norange_sun\nwater\nsystem: Kerath", "Brume"], "Ages/Cendre.md": ["single_sun\norange_sun\nstone\nsystem: Kerath", "Cendre"], "Ages/Seul.md": ["single_sun\nred_sun\nwater", "Seul"] };
  const ages = Object.keys(srcs).map((p) => ({ name: srcs[p][1], path: p, verdict: "stable", stability: 90 }));
  const ageData = (age) => { const [src, name] = srcs[age.path], a = A(src, name); return { target: null, model: null, system: SS.systemOf(a, src, name), orbit: CAL.orbitOf(a, name) }; };
  const pages = ["page_telescope", "page_mountain"];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages });
  const sc = M.buildScene(relto, [M.parsePage(M.pageFrontmatter("page_mountain", M.PAGE_PRESETS.page_mountain), "m.md"), ...M.builtinPages()], ages); sc.ages = ages;
  const store = {}, sounds = [];
  const opts = (extra = {}) => ({ telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, onTelescopeSound: (k) => sounds.push(k), onImagerAge: ageData, ...extra });
  const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts());
  r.setScene(sc); r.setView("telescope"); r.nowOverride = t0; r.draw(1);
  const tick = () => new Promise((res) => setTimeout(res, 0));
  const click = (f, why) => { r.draw(2); const h = r.hot.find((x) => x.tel && f(x.tel)); ok(h, "zone cliquable : " + why); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); return h; };
  const st = r.telescope, old = st.old;
  ok(old && old.L === SS.oldLine(st.zero, st.key).L, "l'observatoire connaît la ligne ancienne de ce Relto");
  // le joueur amène la lueur pâle dans l'anneau : la ligne ancienne
  const reach = (get, axis, target) => { const S = T.STEP[axis]; let k = 0; while (get() !== target && k++ < 900) { let d = target - get(); if (axis === "torahn") { d = ((d % T.TURN) + T.TURN) % T.TURN; if (d > T.TURN / 2) d -= T.TURN; } if (Math.abs(d) < S.hub) break; const step = Math.abs(d) >= S.rim ? S.rim : S.hub; click((a) => a.axis === axis && a.delta === Math.sign(d) * step && !a.book, axis); } };
  reach(() => st.aim.elev, "elev", old.elevation); reach(() => st.aim.torahn, "torahn", Math.round(old.torahn / 100) * 100 % T.TURN);
  ok(st.found && st.line === old.L && store[st.key].line === old.L && sounds.includes("found"), "dans l'anneau de la ligne ancienne : l'instrument s'y cale, et c'est gardé");
  r.draw(3); ok(r.hot.some((h) => /Great Zero, KI-style/.test(h.tip)) && JSON.stringify(TL.state(r).line) === String(old.L), "la plaque grave le Zéro tel que l'instrument le tient");
  // on situe Brume : gravée de travers
  click((a) => a.book === 1, "livre suivant"); await tick(); r.draw(4);
  const sysB = st.book.data.system, c = sysB.clue; st.dial = { torahn: (c.torahn + 300) % T.TURN, elev: c.elevation, delay: c.delay };
  click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1"); click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1"); click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1");
  const recB = st.systems[sysB.key]; ok(recB && recB.line === old.L && angle(recB.torahn, sysB.pos.torahn) === Math.abs(old.L) && recB.ages.includes("Brume"), "Brume située sur la ligne ancienne : gravée de travers, son nom noté");
  // la carte le montre
  click((a) => a.go === "starmap", "le rouleau de la carte"); ok(r.view === "starmap", "la carte s'ouvre depuis l'observatoire");
  r.draw(5); ok(r.hot.some((h) => /does not see the Zero where this star says/.test(h.tip)) && r.hot.some((h) => /^Brume/.test(h.tip)) && r.hot.some((h) => h.go === "telescope"), "sur la carte : le nom de Brume au survol, son trait manque le Zéro, ︾ ramène à l'observatoire");
  r.setView("telescope"); r.draw(6);
  // Cendre (même système) apparaît avec elle ; on revient sur le vrai Zéro
  click((a) => a.book === 1, "livre suivant"); await tick(); r.draw(7); ok(st.systems[sysB.key].ages.join() === "Brume,Cendre", "Cendre, même système : son nom s'ajoute");
  click((a) => a.book === 1, "Seul"); click((a) => a.book === 1, "lutrin vide"); r.draw(8); ok(!st.book, "lutrin vide");
  reach(() => st.aim.elev, "elev", st.zero.elevation); reach(() => st.aim.torahn, "torahn", Math.round(st.zero.torahn / 100) * 100 % T.TURN);
  ok(st.line === 0 && !("line" in store[st.key]) && st.at && T.signal(st.at, st.zero).found, "viser le vrai Zéro recale l'instrument (le piège se répare)");
  reach(() => st.aim.torahn, "torahn", Math.round(old.torahn / 100) * 100 % T.TURN); reach(() => st.aim.elev, "elev", old.elevation); ok(st.line === 0, "le vrai Zéro tenu, la ligne ancienne ne le reprend plus");
  r.setView("starmap"); r.draw(9); ok(r.hot.some((h) => /does not see the Zero/.test(h.tip)), "la carte : Brume encore gravée sur l'autre ligne");
  r.setView("telescope");
  click((a) => a.book === 1, "Brume"); await tick(); r.draw(10); ok(r.hot.some((h) => h.tel && h.tel.unchart), "sa plaque a un coin à gratter");
  // regraver en visant : la carte se referme
  st.dial = { torahn: (c.torahn + 300) % T.TURN, elev: c.elevation, delay: c.delay }; click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1"); click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1"); click((a) => a.axis === "torahn" && a.delta === -T.STEP.torahn.hub, "Torahn −1");
  ok(!("line" in st.systems[sysB.key]) && st.systems[sysB.key].torahn === sysB.pos.torahn && st.systems[sysB.key].ages.join() === "Brume,Cendre", "regravée sur la vraie ligne : juste, ses Âges gardés");
  ok(MAP.layout(st.zero, st.systems, st.line).stars.every((q) => q.miss === 0), "la carte se referme");
  click((a) => a.unchart, "gratter"); ok(!st.systems[sysB.key] && !(store[st.key].systems || {})[sysB.key], "gratter l'étoile : elle n'est plus située");
  ok(bad === 0, "observatoire (étape 3) : aucun nombre non fini");

  // un système perturbé : leurre, levier des balises, triangulation
  const rs = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts()); rs.setScene(sc); rs.setView("telescope"); rs.nowOverride = t0; rs.draw(1);
  const s2 = rs.telescope; s2.found = true; s2.line = 0;
  const pert = { key: bh.p.key, pos: bh.p.pos, near: bh.p.near, fx: bh.fx, perturbed: true, ...SS.perceive({ key: bh.p.key, pos: bh.p.pos, near: bh.p.near }) };
  s2.book = { idx: 0, age: ages[0], data: { system: pert }, loading: false }; s2.dial = { torahn: pert.seen.torahn, elev: pert.seen.elevation, delay: pert.seen.delay }; rs.draw(2);
  const lever = rs.hot.find((h) => h.tel && h.tel.triangulate); ok(lever && /Triangulate/.test(lever.tip), "un système perturbé : le levier des balises");
  TL.act(rs, { triangulate: true }); ok(s2.note === "sys.tri.few" && s2.triFor == null, "sans balises : trop peu d'étoiles voisines");
  const S = SS.cart(pert.pos), bc = (dx, dy) => { const v2 = SS.cyl({ x: S.x + dx, y: S.y + dy, z: S.z }); return { at: t0, torahn: v2.torahn, distance: v2.distance, elevation: v2.elevation }; };
  s2.systems = { b1: bc(700, 200), b2: bc(-900, 600) };
  TL.act(rs, { triangulate: true }); ok(s2.note === "sys.tri.agree" && s2.triFor === pert.key, "deux balises : « the charted stars agree »");
  rs.draw(3); ok(rs.hot.some((h) => h.tel && h.tel.triangulate && /Triangulated/.test(h.tip)), "le levier tiré");
  s2.dial = { torahn: (pert.clue.torahn + 100) % T.TURN, elev: pert.clue.elevation, delay: pert.clue.delay }; TL.act(rs, { axis: "torahn", delta: -100 });
  ok(s2.systems[pert.key] && s2.systems[pert.key].tri && s2.systems[pert.key].pert.some((q) => q.kind === "black_hole"), "triangulé et situé : la plaque garde son trou noir");
  rs.setView("starmap"); rs.draw(4); ok(rs.hot.some((h) => /a black hole/.test(h.tip)), "sur la carte : le trou noir, nommé au survol");
  ok(bad === 0, "carte et triangulation : aucun nombre non fini");
  // français
  const rf = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts({ t: makeT(() => "fr") })); rf.setScene(sc); rf.setView("starmap"); rf.draw(1);
  ok(rf.hot.some((h) => /Rouler la carte/.test(h.tip)) && rf.hot.some((h) => /Le Great Zero/.test(h.tip)), "en français : la carte");
  // un état de l'étape 2 se relit tel quel
  const st2 = { torahn: 4200, elev: 3, found: true, at: { torahn: 4200, elev: 3 }, systems: { k: { at: t0, torahn: 100, elevation: 2, distance: 900, rel: { x: 1, y: 2, z: 3 } } } };
  const r2 = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { telescopeGet: () => st2 }); r2.setScene(sc); r2.setView("starmap"); r2.draw(1);
  ok(r2.telescope.line === 0 && r2.telescope.found && MAP.layout(r2.telescope.zero, r2.telescope.systems).stars[0].miss === 0, "un état de l'étape 2 : sur la vraie ligne, ses étoiles justes sur la carte");
  ok(bad === 0, "étape 2 relue : aucun nombre non fini");
})();

relDone.then(() => {
  ok(["sys.pert.pulsar", "sys.tri.agree", "map.warn.old", "tel.found.old"].every((k) => D.en[k] && D.fr[k]), "textes en anglais et en français");
  console.log(`✓ perturbers.test.js (${n} contrôles)`);
}).catch((e) => { console.error(e); console.log("FAIL"); process.exit(1); });
