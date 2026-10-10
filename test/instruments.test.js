"use strict";
// Le réglage des instruments (facile / l'Art de la Guilde) et le métronome de l'observatoire : modèle pur, puis l'observatoire
// rendu dans jsdom (faux contexte 2D qui garde les textes écrits), sons comptés battement par battement.
const assert = require("assert"), Module = require("module");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let bad = 0, texts = [];
const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "fillText" ? (s, ...a) => { texts.push(String(s)); a.forEach(chk); } : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => a.forEach(chk)), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
// settings-ui demande « obsidian » : un faux module suffit pour lire DEFAULTS et isGuild
const load0 = Module._load; Module._load = function (req, ...rest) { return req === "obsidian" ? { Setting: class {} } : load0.call(this, req, ...rest); };
const INS = require("../src/instruments"), MET = require("../src/metronome"), SET = require("../src/settings-ui");
const T = require("../src/telescope"), SS = require("../src/starsystem"), PB = require("../src/perturbers"), DT = require("../src/dnitime");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), TL = require("../src/relto-telescope"), { Dni } = require("../src/dni"), { D, makeT } = require("../src/i18n");
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const t0 = 1.8e12;

// ---- 1. le réglage -------------------------------------------------------------------------------------------------
ok(SET.DEFAULTS.instrumentsMode === "easy", "réglage : facile par défaut");
ok(INS.isGuild({ instrumentsMode: "guild" }) && !INS.isGuild({ instrumentsMode: "easy" }) && !INS.isGuild({}) && !INS.isGuild(null) && !INS.isGuild({ instrumentsMode: "n'importe" }), "isGuild : seul « guild » demande l'Art de la Guilde ; absent ou inconnu : facile");
ok(SET.isGuild === INS.isGuild && INS.modeOf("guild") === "guild" && INS.modeOf(undefined) === "easy" && INS.MODES.join() === "easy,guild", "le même assistant, exporté par les réglages ; modeOf lit une chaîne ou un objet");

// ---- 2. le modèle en mode facile ---------------------------------------------------------------------------------------
{
  const z = { torahn: 30000, elevation: 0, distance: 1 }, far = { torahn: 10000, elev: 0 }, sg = T.signal(far, z);
  let easy = 0, guild = 0; for (let b = 0; b < 200; b++) { easy = Math.max(easy, Math.abs(T.observe(sg, b, 0, T.SCINT.easy).s - sg.s)); guild = Math.max(guild, Math.abs(T.observe(sg, b).s - sg.s)); }
  ok(easy < guild * 0.3 && easy > 0, `facile : la scintillation est bien plus faible (${easy.toFixed(3)} contre ${guild.toFixed(3)})`);
  ok(JSON.stringify(T.observe(sg, 4)) === JSON.stringify(T.observe(sg, 4, 0, 1)), "Guilde : la perception de la 1.19, inchangée");
  const old = SS.oldLine(z, "relto#1"), onOld = { torahn: old.torahn, elev: old.elevation };
  const gL = SS.lineSignals(onOld, z, old), eL = SS.lineSignals(onOld, z, old, { easy: true });
  ok(gL.best.line === old.L && gL.old.found, "Guilde : sur la ligne ancienne, l'anneau s'y ferme");
  ok(eL.best.line === 0 && !eL.old.found && eL.old.hidden && eL.old.s === 0 && !eL.best.found, "facile : la ligne de Me'erta n'apparaît jamais");
  // étoiles mortes : ni faux pouls, ni direction courbée, ni retard faussé
  const find = (f) => { for (let i = 0; i < 5000; i++) { const p = SS.placeSystem("single_sun@t" + i, []), fx = PB.effects(p.near, p.key, SS.delayOf(p.pos), SS.DELAY_MAX); if (f(fx)) return { key: p.key, pos: p.pos, near: p.near, fx }; } return null; };
  for (const [kind, f] of [["trou noir", (fx) => fx.deflect], ["pulsar / étoile à neutrons", (fx) => fx.beat]]) {
    const s = find(f), v = SS.perceive(s), sys = { ...s, ...v }, seenDial = { torahn: v.seen.torahn, elev: v.seen.elevation, delay: v.seen.delay }, trueDial = { torahn: v.clue.torahn, elev: v.clue.elevation, delay: v.clue.delay };
    const g = SS.scope(seenDial, sys), e = SS.scope(seenDial, sys, { easy: true }), et = SS.scope(trueDial, sys, { easy: true });
    ok((g.bend || g.beat) && !e.bend && !e.beat && !e.lure && !e.falseLock && e.blur === 1 && e.echoDd === e.m.dd, `facile, ${kind} : ni leurre ni faux pouls, un léger flou seulement`);
    ok(et.m.located && et.shown.found, `facile, ${kind} : le vrai réglage situe l'étoile`);
    ok(JSON.stringify(SS.surveyed(sys, false)) === JSON.stringify(v.clue) && JSON.stringify(SS.surveyed(sys, true)) === JSON.stringify(v.seen), `${kind} : l'arpenteur note le vrai en facile, le perçu dans la Guilde`);
    const we = SS.words(SS.surveyed(sys, false), "en", { fx: s.fx, easy: true }), wg = SS.words(SS.surveyed(sys, true), "en", { fx: s.fx });
    ok(we.pert === D.en["sys.pert.blur"] && we.values.beats == null && /pulsar|neutron|bent/.test(wg.pert), `${kind} : les notes faciles disent un léger flou, sans faux battement ni lumière courbée`);
  }
}

// ---- 3. le métronome : modèle --------------------------------------------------------------------------------------
{
  const P = MET.PRORAHN_MS, glowPeak = (ms) => { const b = (ms - DT.REF) / TL.PULSE_MS; return b - Math.floor(b); }; // 0 : la lueur du vrai pouls culmine (relto-telescope.js)
  ok(Math.abs(P - TL.PULSE_MS) < 1e-9, "le balancier bat le prorahn, comme le pouls du Zéro");
  let worst = 0; for (let k = 0; k < 60; k++) { const ms = MET.peakAt(1.3e9 + k); worst = Math.max(worst, Math.abs(Math.abs(MET.swing(ms)) - 1), Math.min(glowPeak(ms), 1 - glowPeak(ms))); }
  ok(worst < 1e-6, "chaque sommet du vrai pouls tombe sur une extrémité du balancier");
  ok(MET.sideOf(4) === 1 && MET.sideOf(5) === -1 && MET.sideOf(-1) === -1 && Math.sign(MET.swing(MET.peakAt(10))) === 1 && Math.sign(MET.swing(MET.peakAt(11))) === -1, "il frappe à droite puis à gauche, un côté par battement");
  ok(Math.abs(MET.swing(MET.peakAt(7) + P / 2)) < 1e-6, "entre deux battements, il passe au milieu");
  ok([0, 1, 5, 40, 400].every((k) => MET.slip(k, 1) === 0), "le vrai pouls ne glisse jamais");
  const sl = [...Array(9).keys()].map((k) => MET.slip(k, SS.OLD_LINE.period));
  ok(sl.every((v, i) => i === 0 || v > sl[i - 1]) && Math.abs(sl[8] - 0.48) < 1e-9, `la fausse ligne glisse, battement après battement (${sl.map((v) => v.toFixed(2)).join(" ")})`);
  const off = (per) => { let m = 0; for (let k = 1; k < 12; k++) m = Math.max(m, Math.abs(MET.slip(k, per))); return m; };
  ok(off(PB.PERIOD.pulsar[0]) > 0.2 && off(PB.PERIOD.neutron_star[0]) > 0.2, "un pulsar, une étoile à neutrons : nettement à côté du balancier");
}

// ---- 4. l'observatoire ---------------------------------------------------------------------------------------------
{
  const ages = [{ name: "A", path: "A.md", verdict: "stable", stability: 90 }], pages = ["page_telescope", "page_mountain"];
  const sc = M.buildScene(M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages }), [M.parsePage(M.pageFrontmatter("page_mountain", M.PAGE_PRESETS.page_mountain), "m.md"), ...M.builtinPages()], ages);
  const store = {}, sounds = [];
  let mode = "easy";
  const mk = (extra = {}) => { const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, { instrumentsMode: () => mode, telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, onTelescopeSound: (k, s) => sounds.push([k, s, r.nowOverride]), ...extra }); r.setScene(sc); r.setView("telescope"); r.nowOverride = t0; r.draw(1); return r; };
  // facile : il s'avive, il pâlit
  const r = mk(), st = r.telescope, z = st.zero; st.aim = { torahn: (z.torahn + 4000) % T.TURN, elev: z.elevation };
  TL.act(r, { axis: "torahn", delta: -T.STEP.torahn.rim }); texts = []; r.draw(2);
  ok(texts.some((s) => / It brightens\.$/.test(s)), "facile : plus près, « It brightens. »");
  TL.act(r, { axis: "torahn", delta: T.STEP.torahn.rim }); texts = []; r.draw(3);
  ok(texts.some((s) => / It fades\.$/.test(s)), "facile : plus loin, « It fades. »");
  mode = "guild"; TL.act(r, { axis: "torahn", delta: T.STEP.torahn.rim }); texts = []; r.draw(4);
  ok(!texts.some((s) => /brightens|fades/.test(s)), "Guilde : aucun mot chaud / froid");
  mode = "easy";
  const rf = mk({ t: makeT(() => "fr") }); rf.telescope.aim = { ...st.aim }; TL.act(rf, { axis: "torahn", delta: -T.STEP.torahn.rim }); texts = []; rf.draw(2);
  ok(texts.some((s) => / Il s'avive\.$/.test(s)), "facile, en français : « Il s'avive. »");
  // facile : la ligne ancienne ne prend jamais l'instrument
  const ro = mk(), so = ro.telescope, old = so.old; so.aim = { torahn: (Math.round(old.torahn / 100) * 100 + 100) % T.TURN, elev: old.elevation };
  TL.act(ro, { axis: "torahn", delta: -T.STEP.torahn.hub });
  ok(!so.found && so.line === 0, "facile : dans l'anneau de la ligne ancienne, rien ne se cale");
  mode = "guild"; TL.act(ro, { axis: "torahn", delta: T.STEP.torahn.hub }); TL.act(ro, { axis: "torahn", delta: -T.STEP.torahn.hub });
  ok(so.found && so.line === old.L, "Guilde : la même visée cale l'instrument sur la ligne ancienne (comme en 1.19)");
  mode = "easy";
  // le métronome : visible (infobulle), en français aussi
  r.draw(5); const tip = r.hot.find((h) => /D'ni pendulum/.test(h.tip)); ok(tip && tip.tip === D.en["tel.metronome"], "le balancier : son infobulle");
  ok(!r.hot.some((h) => h !== tip && h.tel && h.x < tip.x + tip.w && h.x + h.w > tip.x && h.y < tip.y + tip.h && h.y + h.h > tip.y), "le balancier ne recouvre aucune commande");
  rf.draw(5); ok(rf.hot.some((h) => /balancier D'ni/.test(h.tip)), "le balancier, en français");
  // le tic et le pouls, battement par battement : le vrai pouls tombe avec le tic ; la ligne ancienne s'en sépare
  const listen = (aim, steps = 30 * 12) => { sounds.length = 0; const rl = mk(); rl.telescope.aim = aim; for (let i = 0; i <= steps; i++) { rl.nowOverride = t0 + i * (MET.PRORAHN_MS / 12); rl.draw(i); } return { ticks: sounds.filter(([k]) => k === "metronome").map((x) => x[2]), pulses: sounds.filter(([k]) => k === "pulse").map((x) => x[2]) }; };
  const tr = listen({ torahn: z.torahn, elev: z.elevation });
  ok(tr.ticks.length >= 28 && tr.pulses.length >= 26 && tr.pulses.every((ms) => tr.ticks.includes(ms)), `le vrai pouls : chaque note avec un tic (${tr.pulses.length} notes, ${tr.ticks.length} tics)`);
  mode = "guild";
  const ol = listen({ torahn: Math.round(old.torahn / 100) * 100 % T.TURN, elev: old.elevation });
  const gaps = ol.pulses.map((ms) => { const d = ms - ol.ticks.reduce((a, b) => (Math.abs(b - ms) < Math.abs(a - ms) ? b : a), -1e15); return Math.abs(d); });
  ok(ol.pulses.length >= 20 && gaps.filter((g) => g > 1).length >= gaps.length / 2, `Guilde, sur la ligne ancienne : la note s'écarte du tic (${gaps.filter((g) => g > 1).length}/${gaps.length} hors du tic)`);
  ok(Math.max(...gaps.slice(0, 15)) > MET.PRORAHN_MS * 0.3, "l'écart grandit, battement après battement, jusqu'à un tiers de prorahn et plus");
  // un pulsar : son faux pouls a sa note, à côté du tic
  const s3 = (() => { for (let i = 0; i < 5000; i++) { const p = SS.placeSystem("single_sun@t" + i, []), fx = PB.effects(p.near, p.key, SS.delayOf(p.pos), SS.DELAY_MAX); if (fx.beat && fx.beat.kind === "pulsar") return { key: p.key, pos: p.pos, near: p.near, fx }; } return null; })();
  const sys3 = { ...s3, perturbed: true, ...SS.perceive(s3) };
  const lp = (m) => { mode = m; sounds.length = 0; const rp = mk(); rp.telescope.found = true; rp.telescope.book = { idx: 0, age: ages[0], data: { system: sys3 }, loading: false }; rp.telescope.dial = { torahn: sys3.clue.torahn, elev: sys3.clue.elevation, delay: sys3.clue.delay };
    for (let i = 0; i <= 240; i++) { rp.nowOverride = t0 + i * (MET.PRORAHN_MS / 12); rp.draw(i); } return { fb: sounds.filter(([k]) => k === "falsebeat").map((x) => x[2]), ticks: sounds.filter(([k]) => k === "metronome").map((x) => x[2]) }; };
  const pg = lp("guild"), pe = lp("easy");
  ok(pg.fb.length > 20 && pg.fb.filter((ms) => !pg.ticks.includes(ms)).length > pg.fb.length / 2, `Guilde, un pulsar : un faux pouls à part, hors du tic (${pg.fb.length})`);
  ok(pe.fb.length === 0, "facile, un pulsar : aucun faux battement");
  texts = []; mode = "easy"; const re = mk(); re.telescope.found = true; re.telescope.book = { idx: 0, age: ages[0], data: { system: sys3 }, loading: false }; re.telescope.dial = { torahn: sys3.clue.torahn, elev: sys3.clue.elevation, delay: sys3.clue.delay }; re.draw(1);
  ok(!re.hot.some((h) => h.tel && h.tel.triangulate) && !texts.some((s) => /second beat/.test(s)), "facile : ni levier des balises, ni « second beat »");
  // mouvement réduit : pas de balancement, la lampe du battement
  const rr = mk({ reducedMotion: true }); rr.draw(0); ok(rr.hot.some((h) => /D'ni pendulum/.test(h.tip)), "mouvement réduit : le balancier est là (au repos, avec sa lampe)");
  ok(bad === 0, "observatoire : aucun nombre non fini");
}
ok(["tel.warmer", "tel.colder", "tel.metronome", "sys.pert.blur"].every((k) => D.en[k] && D.fr[k]) && D.fr["tel.warmer"] === "Il s'avive." && D.fr["tel.colder"] === "Il pâlit.", "textes en anglais et en français");
console.log(`✓ instruments.test.js (${n} contrôles)`);
