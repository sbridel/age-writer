"use strict";
// Télescope, étape 2 : le système d'étoile d'un Âge (position GZCS, indices en mots, mesure au lutrin) et la calibration de
// l'Imageur (micromètre de synchro, heure locale, KIPS, dérive d'une semaine). Modèles purs, puis le rendu (Relto).
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
const T = require("../src/telescope"), SS = require("../src/starsystem"), CAL = require("../src/calibration"), IM = require("../src/imager"), SKY = require("../src/sky");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), { D, makeT } = require("../src/i18n");
const { analyseAgeBase } = require("../src/engine/analysis");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks");
const skip0 = hooks.skip; hooks.skip = (l) => P.isPhysicsLine(l) || SKY.DAY_RE.test(l) || SKY.YEAR_RE.test(l) || SS.SYSTEM_RE.test(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const sysOf = (src, name) => SS.systemOf(A(src, name), src, name);
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
const DAY = 86400000, H = 3600000, t0 = 1.8e12;

// ---- 1. la position du système : déterministe, partagée par les Âges d'une même étoile ----------------------------
{
  const a1 = sysOf("single_sun\norange_sun\nwater", "Brume"), a2 = sysOf("single_sun\norange_sun\nwater", "Brume");
  ok(a1.key === a2.key && JSON.stringify(a1.pos) === JSON.stringify(a2.pos), "même Âge : même clé d'étoile, même position");
  ok(Number.isInteger(a1.pos.torahn) && a1.pos.torahn >= 0 && a1.pos.torahn < T.TURN && Number.isInteger(a1.pos.distance) && a1.pos.distance >= SS.SYS_DIST[0] && a1.pos.distance <= SS.SYS_DIST[1] && Math.abs(a1.pos.elevation) <= SS.SYS_ELEV, "position GZCS : Torahn en torantee, distance et hauteur en shahfeetee");
  const other = sysOf("single_sun\norange_sun\nwater", "Cendre");
  ok(other.key !== a1.key && JSON.stringify(other.pos) !== JSON.stringify(a1.pos), "sans ligne `system:`, chaque Âge a sa propre étoile");
  const k1 = sysOf("single_sun\norange_sun\nwater\nsystem: Kerath", "Brume"), k2 = sysOf("single_sun\norange_sun\nstone\nfern\nsystem: kerath", "Cendre");
  ok(k1.key === k2.key && JSON.stringify(k1.pos) === JSON.stringify(k2.pos) && k1.shared === "kerath", "même étoile, même `system:` : un seul système, situé ensemble (la matière ne compte pas)");
  const red = sysOf("single_sun\nred_sun\nwater\nsystem: Kerath", "Brume");
  ok(red.key !== k1.key && JSON.stringify(red.pos) !== JSON.stringify(k1.pos), "changer l'étoile change le système (réécrire déplace le monde)");
  ok(sysOf("twin_suns\norange_sun\nwater\nsystem: Kerath", "Brume").key !== k1.key, "deux soleils au lieu d'un : un autre système");
  ok(sysOf("single_sun\norange_sun\nwater\nseed: 7", "Brume").key !== a1.key, "la ligne `seed:` fait partie de la graine d'étoile");
  ok(sysOf("single_sun\nwater\ncompanion_moon", "Lune").key === sysOf("single_sun\nwater", "Lune").key, "une lune n'est pas une étoile");
  ok(SS.parseSystem("water\nsystème :  Ker  Ath ") === "ker ath" && SS.parseSystem("water") === null, "`système:` (français) lu, espaces réduits");
  const ps = []; for (let i = 0; i < 300; i++) ps.push(SS.position("single_sun@n" + i));
  ok(new Set(ps.map((p) => p.torahn)).size > 290, "300 étoiles : 300 directions presque toutes distinctes");
  const q = [0, 0, 0, 0]; for (const p of ps) q[Math.floor(p.torahn / (T.TURN / 4))]++; ok(q.every((c) => c > 45), `réparties sur tout le tour (${q.join(", ")})`);
  ok(ps.some((p) => p.distance < 1000) && ps.some((p) => p.distance > 8000), "des voisines et des lointaines");
}

// ---- 2. les indices de l'arpenteur : en mots, cohérents avec les valeurs cachées -----------------------------------
{
  const sys = sysOf("single_sun\nwater", "Arpent"), clue = sys.clue;
  ok(clue.torahn === (sys.pos.torahn + T.TURN / 2) % T.TURN && clue.elevation === -sys.pos.elevation, "vu de l'Âge, le Zéro est à l'opposé de l'étoile (un demi-tour, hauteur inversée)");
  ok(clue.delay === SS.delayOf(sys.pos) && clue.delay === Math.round(Math.hypot(sys.pos.distance, sys.pos.elevation) / SS.DELAY_UNIT), "le retard est le trajet du pouls, en crans de 25 shahfeetee");
  const w = SS.words(clue, "en"), wf = SS.words(clue, "fr");
  ok(!/\d/.test(w.line) && !/\d/.test(wf.line) && /Great Zero/.test(w.line) && /Great Zero/.test(wf.line), "les mots ne disent aucun chiffre");
  ok(w.values.torahn === clue.torahn && w.values.elev === T.kiElev(clue.elevation) && w.values.delay === clue.delay, "« complètes » : les trois réglages du télescope (élévation au sens du KI)");
  // la direction : seize secteurs, comme une rose des vents ; nord = la ligne du Zéro, est = un quart de tour (sens horaire)
  const dir = (torahn) => SS.words({ torahn, elevation: 0, delay: 10, strength: 1 }, "en").parts.dir;
  ok(/^to the north,/.test(dir(0)) && dir(T.TURN / 4) === "to the east" && dir(T.TURN / 2) === "to the south" && dir((3 * T.TURN) / 4) === "to the west" && dir(T.TURN / 8) === "to the north-east", "direction : nord, est, sud, ouest, nord-est");
  ok(dir(T.TURN - 100).startsWith("to the north,"), "juste avant le tour : encore le nord");
  let coherent = true;
  for (let i = 0; i < 400; i++) {
    const c = SS.zeroSeenFrom(SS.position("x@" + i)), s = SS.sectorOf(c.torahn), d = Math.abs(((c.torahn - (s * T.TURN) / 16 + T.TURN / 2) % T.TURN + T.TURN) % T.TURN - T.TURN / 2);
    if (d > T.TURN / 32 + 1) coherent = false;
  }
  ok(coherent, "400 étoiles : le mot de direction est toujours à moins d'un demi-secteur de la vraie direction");
  const hw = (h) => SS.words({ torahn: 0, elevation: h, delay: 10, strength: 1 }, "en").parts.height;
  ok(hw(-80) === "far below the horizon" && hw(0) === "on the horizon" && hw(30) === "above the horizon" && hw(90) === "high above the horizon", "hauteur : sous, sur, au-dessus de l'horizon (hauteur vraie, pas celle du KI)");
  ok([0, 30, 100, 200, 300, 500].map((d) => SS.delayBand(d)).every((b, i, a) => i === 0 || b >= a[i - 1]), "plus loin, plus en retard (mots croissants)");
  ok(SS.strengthOf(0) === 1 && SS.strengthOf(100) > SS.strengthOf(400), "plus loin, plus faible");
  ok(SS.words({ torahn: 0, elevation: 0, delay: 600, strength: SS.strengthOf(600) }, "en").parts.faint === "at the very edge of sight", "très loin : à peine visible");
  // décalage de ligne d'origine (étape 3) : 0 par défaut, et la direction perçue tourne d'autant
  ok(SS.zeroSeenFrom(sys.pos, { lineOffset: 1000 }).torahn === (clue.torahn + 1000) % T.TURN && SS.sources(sys.pos).length === 1 && SS.sources(sys.pos)[0].period === 1 && SS.sources(sys.pos)[0].kind === "zero", "étape 3 prête : ligne d'origine décalable, liste de sources (le Zéro bat au prorahn)");
  ok(SS.sources(sys.pos, { perturbers: [{ kind: "pulsar", period: 0.37, torahn: 10, elevation: 0, delay: 3, strength: 0.5 }] }).length === 2, "un perturbateur s'ajoute à la liste des sources");
}

// ---- 3. le calcul de l'instrument : juste quand on reporte bien les indices, faux sinon ---------------------------
{
  let within = 0, all = 0;
  for (let i = 0; i < 200; i++) {
    const zero = T.greatZero("Relto", 1000 + i), sys = { key: "k" + i, pos: SS.position("k" + i) }, c = SS.zeroSeenFrom(sys.pos);
    const dial = { torahn: c.torahn, elev: c.elevation, delay: c.delay }, m = SS.measure(dial, c), L = SS.locate(zero, dial).gzcs;
    all++;
    let dt = Math.abs(L.torahn - sys.pos.torahn); dt = Math.min(dt, T.TURN - dt);
    if (m.located && dt <= T.TOL.torahn && Math.abs(L.elevation - sys.pos.elevation) <= 1 && Math.abs(L.distance - sys.pos.distance) <= SS.DELAY_UNIT + 2) within++;
  }
  ok(within === all, `indices bien reportés : situé, et la position calculée tombe dans la tolérance (${within}/${all})`);
  // la différence que fait l'instrument : (Relto → Zéro) − (Âge → Zéro), sans soustraction à la main
  const zero = T.greatZero("Relto", 42), pos = SS.position("diff"), c = SS.zeroSeenFrom(pos), L = SS.locate(zero, { torahn: c.torahn, elev: c.elevation, delay: c.delay });
  const R = SS.cart({ torahn: (zero.torahn + T.TURN / 2) % T.TURN, distance: zero.distance, elevation: -zero.elevation }), S = SS.cart(pos);
  ok(Math.hypot(L.fromRelto.x - (S.x - R.x), L.fromRelto.y - (S.y - R.y), L.fromRelto.z - (S.z - R.z)) < SS.DELAY_UNIT + 2, "l'instrument rend le système vu du Relto (S − R), à un cran de retard près");
  const R2 = L.reltoAt; ok(Math.abs(R2.distance - zero.distance) <= 1 && R2.elevation === -zero.elevation, "et la position du Relto lui-même, par rapport au Zéro");
  // reporter faux : pas situé, et la position calculée s'écarte
  const right = { torahn: c.torahn, elev: c.elevation, delay: c.delay };
  for (const [wrong, why] of [[{ ...right, torahn: (c.torahn + 300) % T.TURN }, "Torahn à 3 crans"], [{ ...right, elev: c.elevation + 3 }, "élévation à 3 shahfeetee"], [{ ...right, delay: c.delay + 2 }, "retard à 2 crans"], [{ ...right, torahn: (c.torahn + T.TURN / 2) % T.TURN }, "direction de l'étoile au lieu de celle du Zéro"]]) {
    const m = SS.measure(wrong, c); ok(!m.located, `reporté faux (${why}) : pas situé`);
  }
  ok(SS.measure({ ...right, delay: c.delay + 1 }, c).located && SS.measure({ ...right, torahn: (c.torahn + 200) % T.TURN, elev: c.elevation - 2 }, c).located, "tolérance : 200 torantee, 2 shahfeetee, 1 cran de retard");
  const far = SS.locate(zero, { ...right, delay: c.delay + 40 }).gzcs; ok(Math.abs(far.distance - pos.distance) > 500, "un retard faux : la distance calculée est fausse");
  // l'écho : en retard ou en avance selon le réglage, ensemble quand il est juste
  ok(SS.echoWord(0) === "one" && SS.echoWord(-10) === "late" && SS.echoWord(10) === "early" && SS.echoWord(3) === "near" && SS.echoOffset(0) === 0 && SS.echoOffset(-5) > 0 && SS.echoOffset(5) < 0 && Math.abs(SS.echoOffset(600)) < 0.5, "l'écho : en retard / en avance / ensemble, jamais au-delà d'un demi-battement");
  ok(SS.measure({ ...right, torahn: (c.torahn + 2500) % T.TURN }, c).s < SS.measure({ ...right, torahn: (c.torahn + 500) % T.TURN }, c).s, "le signal s'avive quand les molettes approchent des indices");
  // molette du retard : butées, couronne et moyeu
  ok(SS.turnDial({ delay: 620 }, "delay", 25).delay === SS.DELAY_MAX && SS.turnDial({ delay: 3 }, "delay", -25).delay === 0 && SS.turnDial({ torahn: 62400, elev: 0, delay: 9 }, "torahn", 200).torahn === 100 && SS.turnDial({ delay: 9 }, "elev", 5).delay === 9, "molette du retard : butées 0 et 624 ; les deux autres comme à l'étape 1");
  ok(JSON.stringify(SS.normDial(null)) === JSON.stringify({ torahn: 0, elev: 0, delay: 0 }) && SS.normDial({ delay: "x" }).delay === 0, "réglage absent ou abîmé : valeurs sûres");
  // gardé avec l'état du télescope ; un état de l'étape 1 se relit tel quel
  const old = { torahn: 4200, elev: 3, found: true, at: { torahn: 4200, elev: 3 } };
  ok(JSON.stringify(T.saved({ aim: T.normAim(old), found: true, at: old.at, systems: {} })) === JSON.stringify(old), "état de l'étape 1 : rien de plus n'est écrit tant qu'aucun système n'est situé");
  const rec = SS.record({ key: "k", pos }, zero, right, t0), sv = T.saved({ aim: T.normAim(old), found: true, at: old.at, dial: right, systems: { k: rec } });
  ok(sv.systems.k.at === t0 && sv.systems.k.torahn === pos.torahn && sv.dial.delay === c.delay && SS.isLocated(sv, "k") && !SS.isLocated({ ...sv, found: false }, "k"), "système situé : gardé par clé d'étoile, avec l'instant ; il faut le Zéro");
  ok(SS.findLocated({ a: { found: false, systems: { k: rec } }, b: sv }, "k").rec === sv.systems.k && !SS.findLocated({ a: { found: false, systems: { k: rec } } }, "k").zero, "Détails : le système situé depuis un Relto dont le Zéro est trouvé");
}

// ---- 4. la calibration : micromètre, heure locale, dérive d'une semaine ----------------------------------------------
{
  const earth = A("single_sun\nsteady_cycle\nwater\nrotation: 24", "Terre"), w = earth.physics.w, o = CAL.orbitOf(earth, "Terre");
  ok(Math.abs(o.dayMs - w.rotation * H) < 1 && Math.abs(o.periodMs - w.periodDays * DAY) < 1 && Math.abs(o.dayMs - 24 * H) < 1, "le jour de l'Âge vient de sa rotation, l'année de son orbite (physique)");
  const o2 = CAL.orbitOf(earth, "Terre", SKY.parseSky("day_length: 40\nyear_length: 12"));
  ok(o2.dayMs === 40 * 60000 && o2.periodMs === 12 * 40 * 60000, "`day_length` et `year_length` l'emportent (le temps de la fenêtre)");
  ok(Math.abs(CAL.diff(CAL.orbitAt(o2, t0), CAL.orbitAt(o2, t0 + o2.periodMs))) < 1e-6, "un tour du micromètre = une année de l'Âge");
  // sans système situé : rien (le micromètre n'est même pas là)
  ok(!CAL.turnSync({}, 3, o, false, t0).moved && !CAL.state({}, o, false, t0).synced, "système non situé : pas de micromètre, pas de synchro");
  // le joueur tourne le micromètre jusqu'à la planète
  let s = IM.normalize(null), steps = 0, res = null;
  while (steps < 60) { const st = CAL.state(s, o, true, t0); if (Math.abs(st.gap) <= CAL.SYNC_TOL) break; res = CAL.turnSync(s, Math.sign(st.gap) * (Math.abs(st.gap) > 5 ? 10 : 1), o, true, t0); s = IM.normalize(res.s); steps++; }
  if (!(s.syncAt > 0)) { res = CAL.turnSync(s, 0, o, true, t0); s = IM.normalize(res.s); }
  ok(s.syncAt === t0 && CAL.state(s, o, true, t0).synced && CAL.state(s, o, true, t0).certain, `synchronisé en ${steps} gestes : la date est gardée`);
  ok(IM.normalize(s).sync === s.sync && IM.normalize(s).syncAt === t0, "le réglage de l'Imageur garde le micromètre et l'instant");
  const off = CAL.turnSync(s, 6, o, true, t0); ok(!off.synced && off.s.syncAt === null, "on s'écarte de trois crans : la synchro est perdue");
  // l'heure locale
  const lt = CAL.localTime(o, CAL.state(s, o, true, t0), t0);
  ok(lt.known && lt.certain && ["dawn", "morning", "noon", "afternoon", "dusk", "night"].includes(lt.slot) && lt.gahr >= 0 && lt.gahr <= 4 && lt.tahvo >= 0 && lt.tahvo <= 24, "synchronisé : l'heure là-bas (un moment du jour, gahrtahvo : tahvo)");
  ok(!CAL.localTime(o, CAL.state(IM.normalize(null), o, true, t0), t0).known && CAL.timeWords({ known: false }, "fr") === "L'heure, là-bas, est incertaine.", "non synchronisé : l'heure reste incertaine");
  const later = CAL.localTime(o, CAL.state(s, o, true, t0 + 6 * H), t0 + 6 * H); ok(Math.abs((later.phase - lt.phase + 1) % 1 - 0.25) < 1e-6, "six heures plus tard, sur un jour de vingt-quatre : un quart de jour plus loin");
  ok(/^Over there, it is (dawn|morning|noon|afternoon|dusk|night)\.$/.test(CAL.timeWords(lt, "en")) && /^Là-bas, c'est /.test(CAL.timeWords(lt, "fr")), "« Over there, it is dawn » / « Là-bas, c'est l'aube »");
  const slots = new Set(); for (let h = 0; h < 24; h++) slots.add(CAL.localTime(o, CAL.state(s, o, true, t0 + h * H), t0 + h * H).slot); ok(slots.size === 6, "au fil du jour de l'Âge, les six moments passent");
  // la dérive : intacte sept jours, puis elle s'use jusqu'au quatorzième
  ok(CAL.quality(t0, t0 + 6.9 * DAY) === 1 && CAL.quality(t0, t0 + 7 * DAY) === 1 && CAL.quality(t0, t0 + 8 * DAY) < 1 && CAL.quality(t0, t0 + 10.5 * DAY) === 0.5 && CAL.quality(t0, t0 + 14 * DAY) === 0, "dérive : intacte une semaine, à moitié à dix jours et demi, perdue à deux semaines");
  let mono = true, last = 2; for (let d = 0; d <= 15; d += 0.25) { const q = CAL.quality(t0, t0 + d * DAY); if (q > last) mono = false; last = q; } ok(mono, "la qualité ne remonte jamais seule");
  const s8 = CAL.state(s, o, true, t0 + 8 * DAY), s12 = CAL.state(s, o, true, t0 + 12 * DAY), s15 = CAL.state(s, o, true, t0 + 15 * DAY);
  ok(s8.synced && s8.certain && s12.synced && !s12.certain && !s15.synced, "huit jours : encore sûr ; douze : l'heure redevient incertaine ; quinze : plus synchronisé");
  ok(Math.abs(CAL.state(s, o, true, t0 + 3 * DAY).gap) <= CAL.SYNC_TOL && Math.abs(s15.gap) > 1, "synchronisé, le micromètre suit la planète ; la dérive l'en écarte");
  ok(!CAL.localTime(o, s15, t0 + 15 * DAY).known && !CAL.localTime(o, s12, t0 + 12 * DAY).certain, "dérivé : l'heure là-bas se perd");
  const re = CAL.turnSync(s, 0, o, true, t0 + 15 * DAY, CAL.orbitAt(o, t0 + 15 * DAY)); ok(re.synced && CAL.state(IM.normalize(re.s), o, true, t0 + 15 * DAY).q === 1, "resynchroniser rend la calibration neuve");
  ok(CAL.boost(0.4, 0) === 0.4 && CAL.boost(0.95, 1) > 0.99 && CAL.boost(0.1, 1) < 0.2 && CAL.boost(0.8, 0.5) < CAL.boost(0.8, 1), "le bonus d'image : rien sans calibration, il aiguise une image déjà bonne, s'use avec la dérive");
}

// ---- 5. l'Imageur sans calibration : exactement comme avant -----------------------------------------------------
{
  const old = { pol: -1, freq: 7, amp: 12, harm: 6, phase: 1, r: 12, g: 12, b: 12, iris: 12, cry: [0, 1, 2, 3], lock: false, az: 0, tilt: 0 };
  ok(JSON.stringify(IM.normalize(old)) === JSON.stringify(old) && !("sync" in IM.normalize(old)) && !("syncAt" in IM.normalize(old)), "un ancien réglage se relit à l'identique (pas de champ de synchro ajouté)");
}

// ---- 6. dans le Relto : le lutrin de l'observatoire, le micromètre de l'Imageur ---------------------------------------
const relDone = (async () => {
  const srcs = { "Ages/Brume.md": ["single_sun\norange_sun\nwater\nrotation: 24\nsystem: Kerath", "Brume"], "Ages/Cendre.md": ["single_sun\norange_sun\nstone\nsystem: Kerath", "Cendre"], "Ages/Seul.md": ["single_sun\nred_sun\nwater", "Seul"] };
  const ages = Object.keys(srcs).map((p) => ({ name: srcs[p][1], path: p, verdict: "stable", stability: 90 }));
  const ageData = (age) => { const [src, name] = srcs[age.path], a = A(src, name); return { target: IM.targetsOf(a, name), model: null, system: SS.systemOf(a, src, name), orbit: CAL.orbitOf(a, name, SKY.parseSky(src)) }; };
  const pages = ["page_telescope", "page_mountain", "page_imager"];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages });
  const sc = M.buildScene(relto, [...pages.filter((id) => id !== "page_telescope").map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), ...M.builtinPages()], ages);
  sc.ages = ages;
  const store = {}, tunings = {}, sounds = [];
  const opts = (extra = {}) => ({ telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); }, onTelescopeSound: (k) => sounds.push(k), onImagerAge: ageData, imagerGet: (p) => tunings[p] || null, imagerSet: (p, v) => { tunings[p] = JSON.parse(JSON.stringify(v)); }, ...extra });
  const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts());
  r.setScene(sc); r.setView("telescope"); r.nowOverride = t0; r.draw(1);
  const tick = () => new Promise((res) => setTimeout(res, 0));
  const click = (f, why) => { r.draw(2); const h = r.hot.find((x) => x.tel && f(x.tel)); ok(h, "zone cliquable : " + why); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); return h; };
  ok(r.hot.some((h) => /lectern/i.test(h.tip)) && r.hot.filter((h) => h.tel && h.tel.book).length >= 2, "l'observatoire a un lutrin, avec ‹ ›");
  ok(r.hot.filter((h) => h.tel && h.tel.axis).length === 8, "lutrin vide : les deux molettes de l'étape 1, rien de plus");
  // un livre sur le lutrin, sans le Zéro : rien ne se mesure
  click((a) => a.book === 1, "livre suivant"); await tick(); r.draw(3);
  const st = r.telescope; ok(st.book && st.book.age.name === "Brume" && st.book.data && st.book.data.system, "Brume est sur le lutrin, son système chargé");
  ok(!r.hot.some((h) => h.tel && h.tel.axis === "delay") && r.hot.some((h) => /first find your Relto's Great Zero/.test(h.tip)), "sans le Great Zero : pas de molette du retard, le lutrin le dit");
  const sysB = st.book.data.system, clue = sysB.clue;
  for (let i = 0; i < 4; i++) click((a) => a.axis === "torahn" && a.delta === T.STEP.torahn.rim, "couronne");
  ok(!Object.keys(st.systems).length && st.dial.torahn === 0, "sans le Zéro, les molettes cherchent le Zéro du Relto : aucun système ne peut être situé");
  // le Zéro trouvé (comme à l'étape 1), on reporte les indices
  st.found = true; st.at = { torahn: st.zero.torahn, elev: st.zero.elevation }; r.draw(4);
  ok(r.hot.filter((h) => h.tel && h.tel.axis).length === 12 && r.hot.some((h) => h.tel && h.tel.axis === "delay" && h.tel.delta === SS.STEP_DELAY.rim), "Zéro trouvé, livre posé : trois molettes (Torahn, élévation, retard)");
  ok(r.hot.some((h) => /blank plate: it waits for the Age's star/.test(h.tip)) && r.hot.some((h) => /Delay of the pulse/.test(h.tip)), "plaque de l'étoile vierge ; unité du retard expliquée");
  // le joueur tourne les molettes jusqu'aux valeurs des notes « complètes »
  const reach = (axis, target, cur) => { const S = axis === "delay" ? SS.STEP_DELAY : T.STEP[axis]; let k = 0; while (cur() !== target && k++ < 900) { let d = target - cur(); if (axis === "torahn") { d = ((d % T.TURN) + T.TURN) % T.TURN; if (d > T.TURN / 2) d -= T.TURN; } const step = Math.abs(d) >= S.rim ? S.rim : S.hub; if (Math.abs(d) < S.hub) break; click((a) => a.axis === axis && a.delta === Math.sign(d) * step, axis); } };
  reach("torahn", Math.round(clue.torahn / 100) * 100 % T.TURN, () => st.dial.torahn);
  reach("elev", clue.elevation, () => st.dial.elev);
  ok(!st.systems[sysB.key], "direction et hauteur justes, retard faux : pas encore situé");
  r.draw(5); ok(r.hot.length > 0, "dessin pendant la mesure"); // la ligne de l'écho
  reach("delay", clue.delay, () => st.dial.delay);
  ok(st.systems[sysB.key] && store[st.key].systems[sysB.key] && sounds.includes("found"), "les trois indices reportés : le système est situé, gardé, avec la quinte");
  const rec = st.systems[sysB.key]; ok(rec.torahn === sysB.pos.torahn && rec.distance === sysB.pos.distance && rec.at === t0, "la plaque grave la position GZCS de l'étoile");
  r.draw(6); ok(r.hot.some((h) => h.tel && h.tel.setSystem), "la plaque de l'étoile est cliquable");
  // Cendre partage l'étoile de Brume : déjà située
  click((a) => a.book === 1, "livre suivant"); await tick(); r.draw(7);
  ok(st.book.age.name === "Cendre" && st.systems[st.book.data.system.key] && r.hot.some((h) => h.tel && h.tel.setSystem), "Cendre (même étoile, même `system:`) : déjà située, ensemble");
  click((a) => a.book === 1, "livre suivant"); await tick(); r.draw(8);
  ok(st.book.age.name === "Seul" && !st.systems[st.book.data.system.key], "Seul (une autre étoile) : à situer");
  click((a) => a.book === 1, "retour au lutrin vide"); r.draw(9); ok(!st.book && r.hot.some((h) => h.tel && h.tel.setZero), "lutrin vide : la plaque du Zéro revient");
  ok(bad === 0, "télescope (étape 2) : aucun nombre non fini");
  // relu : un nouveau rendu retrouve les systèmes situés
  const r2 = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts()); r2.setScene(sc); r2.setView("telescope"); r2.draw(1);
  ok(r2.telescope.found && r2.telescope.systems[sysB.key], "relu : Zéro trouvé et système situé");

  // l'Imageur : Seul (non situé) = exactement l'Imageur d'avant ; Brume (situé) = le micromètre
  const ri = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts()); ri.nowOverride = t0; ri.setScene(sc); ri.setView("imager"); ri.draw(1);
  const ist = ri.imagerState(); await tick(); ri.draw(1.1);
  ok(ist.age.name === "Brume" && ri.imagerCal() && !ri.imagerCal().synced, "Imageur, Brume : système situé, pas encore synchronisé");
  ok(ri.hot.filter((h) => h.imager && h.imager.sync != null).length === 4 && ri.hot.some((h) => /sync window/i.test(h.tip)), "le micromètre (couronne, moyeu) et sa fenêtre");
  ok(ri.hot.some((h) => /Sync the micrometer to learn the hour/.test(h.tip)), "l'heure là-bas : incertaine tant qu'on n'a pas synchronisé");
  ok(JSON.stringify(ri.imagerSeen()) === JSON.stringify(ri.imagerClarity()), "situé mais pas synchronisé : même netteté qu'avant");
  // tourner le micromètre jusqu'à la planète, en regardant la fenêtre
  let k = 0; while (!ri.imagerCal().synced && k++ < 80) { const g = ri.imagerCal().gap, d = Math.abs(g) > 5 ? 10 : 1; const h = ri.hot.find((x) => x.imager && x.imager.sync === Math.sign(g || 1) * d); ri.toLogical = () => [h.x + 1, h.y + 1]; ri.onClick({}); ri.draw(1.2 + k * 0.01); }
  const cal = ri.imagerCal(); ok(cal.synced && cal.certain && tunings["Ages/Brume.md"].syncAt === t0, `synchronisé (${k} gestes), gardé avec le réglage`);
  ok(cal.lt.known && ri.hot.some((h) => /KIPS/.test(h.tip)) && ri.hot.some((h) => /The Age's own hour/.test(h.tip)), "synchronisé : l'heure là-bas et les coordonnées KIPS sur l'écran");
  { const c0 = ri.imagerClarity(), s0 = ri.imagerSeen(); ok(c0.total === 0 || s0.total >= c0.total, "synchronisé : l'image ne perd rien, elle s'aiguise"); }
  ist.settings = IM.normalize({ ...ist.settings, pol: ist.target.pol, freq: ist.target.freq, amp: ist.target.amp, harm: ist.target.harm, phase: IM.phaseAt(ist.target, t0) + 1.5, r: ist.target.lens.r, g: ist.target.lens.g, b: ist.target.lens.b, iris: ist.target.lens.iris, cry: ist.target.crystals.ids.map((id) => ist.target.crystals.options.indexOf(id)).concat([7, 6, 5, 4]).slice(0, 4) });
  { const c0 = ri.imagerClarity(), s0 = ri.imagerSeen(); ok(c0.total > 0.5 && c0.total < 0.95 && s0.total > c0.total + 0.03, `presque réglé : la calibration aiguise l'image (${c0.total.toFixed(2)} → ${s0.total.toFixed(2)})`); }
  ri.nowOverride = t0 + 12 * DAY; ri.draw(2); ok(ri.imagerCal().synced && !ri.imagerCal().certain && ri.hot.some((h) => /drifting/.test(h.tip)), "douze jours plus tard : la calibration dérive, la fenêtre le dit");
  ri.nowOverride = t0 + 20 * DAY; ri.draw(2.1); ok(!ri.imagerCal().synced && JSON.stringify(ri.imagerSeen()) === JSON.stringify(ri.imagerClarity()), "vingt jours : plus de bonus, l'heure se perd");
  // Seul : pas de micromètre, Imageur inchangé
  const nb = ri.hot.find((h) => h.imager && h.imager.book === 1); ri.toLogical = () => [nb.x + 1, nb.y + 1]; ri.onClick({}); await tick(); ri.onClick({}); await tick(); ri.draw(3);
  ok(ist.age.name === "Seul" && !ri.imagerCal() && !ri.hot.some((h) => h.imager && h.imager.sync != null) && !ri.hot.some((h) => /KIPS/.test(h.tip)), "Seul (étoile non située) : ni micromètre ni cartouche, l'Imageur d'avant");
  { const before = JSON.stringify(ist.settings); ri.imagerAct({ sync: 1 }); ok(JSON.stringify(ist.settings) === before, "non situé : le micromètre ne bouge rien"); }
  // le Zéro oublié : le micromètre disparaît
  { const rz = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts({ telescopeGet: (kk) => (store[kk] ? { ...store[kk], found: false } : null) })); rz.nowOverride = t0; rz.setScene(sc); rz.setView("imager"); rz.draw(1); await tick(); rz.draw(1.1); ok(!rz.imagerCal(), "Great Zero oublié : plus de calibration"); }
  // français
  const rf = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts({ t: makeT(() => "fr") })); rf.nowOverride = t0; rf.setScene(sc); rf.setView("imager"); rf.draw(1); await tick(); rf.draw(1.1);
  ok(rf.hot.some((h) => /Micromètre de synchro/.test(h.tip)), "en français : le micromètre");
  rf.setView("telescope"); rf.draw(2); TL_act(rf, { book: 1 }); await tick(); rf.draw(3); ok(rf.hot.some((h) => /Étoile de l'Âge|Retard/.test(h.tip)), "en français : le lutrin et la molette du retard");
  ok(bad === 0, "Imageur (étape 2) : aucun nombre non fini");
})();
const TL_act = (r, a) => require("../src/relto-telescope").act(r, a);

relDone.then(() => {
  ok(["sys.line", "sys.compass", "sys.height", "sys.delay", "sys.faint", "cal.time.certain", "cal.micro", "sys.plate.title"].every((k) => D.en[k] && D.fr[k]), "textes en anglais et en français");
  ok(D.en["sys.compass"].split("|").length === 16 && D.fr["sys.compass"].split("|").length === 16 && D.en["sys.height"].split("|").length === 7 && D.fr["sys.height"].split("|").length === 7 && D.en["sys.delay"].split("|").length === 5 && D.fr["sys.delay"].split("|").length === 5 && D.en["sys.faint"].split("|").length === 4 && D.fr["sys.faint"].split("|").length === 4, "mêmes listes de mots dans les deux langues (16 directions, 7 hauteurs, 5 retards, 4 éclats)");
  hooks.skip = skip0;
  console.log(`✓ starsystem.test.js (${n} contrôles)`);
}).catch((e) => { console.error(e); console.log("FAIL"); process.exit(1); });
