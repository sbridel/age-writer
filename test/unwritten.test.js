"use strict";
// Les mondes jamais écrits (Imageur au livre vierge, mode « L'Art de la Guilde ») : src/unwritten.js, puis dans le Relto.
// Déterminisme, un Âge écrit l'emporte toujours, fréquence dans la plage voulue, bloc sans tache d'encre, peinture sans nombre
// non fini, transcription aller-retour, noms (déterministes, sans collision, jamais un Âge des jeux), textes en/fr.
const assert = require("assert");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
let bad = 0;
const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; };
const grad = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 30 }) : k === "canvas" ? { width: 300, height: 176 } : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => a.forEach(chk)), set: () => true });
dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
const SS = require("../src/starsystem"), CAL = require("../src/calibration"), IM = require("../src/imager"), GI = require("../src/imager-guild"), SKY = require("../src/sky"), UW = require("../src/unwritten"), G = require("../src/genscene");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), { D, makeT } = require("../src/i18n");
const { analyseAgeBase, extractAge, pageList } = require("../src/engine/analysis"), { describeAge } = require("../src/engine/prose");
const P = require("../src/physics"), { hooks } = require("../src/engine/hooks"), { rng } = require("../src/util");
const skip0 = hooks.skip; hooks.skip = (l) => P.isPhysicsLine(l) || SKY.DAY_RE.test(l) || SKY.YEAR_RE.test(l) || SS.SYSTEM_RE.test(l);
const A = (src, name) => { const a = analyseAgeBase(src, { seed: name }); return P.applyPhysics(a, P.physicsOf(a, src, name), "easy"); };
const scene = (a, name, text) => { const S = G.sceneOf(a, name); if (!S) return null; Object.assign(S, SKY.parseSky(text)); return G.build(S, 300, 176); };
const dep = { analyse: A, prose: describeAge, scene };
const t0 = 1.8e12;

const GLY = ["water", "stone", "fern", "wind", "fog", "lava", "sand", "great_tree", "moth", "door", "lamp", "crystal", "rain", "salt", "iron", "seed", "grazer", "tablet", "bridge", "auroras", "single_sun", "steady_cycle", "orange_sun", "red_sun", "twin_suns", "deep_cold", "heat", "vine", "spore", "companion_moon"];
const randomSettings = (r, onStar = true) => {
  const st = UW.STARS[Math.floor(r() * UW.STARS.length)], j = () => Math.round((r() - 0.5) * 4);
  const lens = onStar ? { r: st.rgb[0] + j(), g: st.rgb[1] + j(), b: st.rgb[2] + j() } : { r: Math.floor(r() * 25), g: Math.floor(r() * 25), b: Math.floor(r() * 25) };
  return IM.normalize({ ...lens, iris: Math.floor(r() * 25), freq: Math.floor(r() * 25), amp: Math.floor(r() * 25), harm: Math.floor(r() * 25), phase: Math.floor(r() * 25), pol: r() < 0.5 ? 1 : -1 });
};
const randomCry = (r) => { const pool = GLY.slice(), c = []; for (let j = 0; j < 4; j++) c.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return c; };

// ---- 1. la clé, le jugement, le hasard ---------------------------------------------------------------------------
let sample = null; // un monde trouvé, pour la suite
{
  ok(UW.keyOf(["water", "fern", null, null], IM.START) === null && UW.keyOf(["water", "water", "fern", "stone"], IM.START) === null, "moins de quatre cristaux (ou deux fois le même) : pas de clé");
  ok(UW.STARS.every((s) => UW.starOf({ r: s.rgb[0], g: s.rgb[1], b: s.rgb[2] }) >= 0) && UW.starOf({ r: 0, g: 24, b: 0 }) === -1, "la palette d'étoiles : chaque étoile se reconnaît ; une lumière verte franche, aucune");
  ok(!UW.plausible(UW.parseKey(UW.keyOf(["water", "fern", "stone", "wind"], { r: 0, g: 24, b: 0, iris: 12, freq: 12, amp: 12 }))), "aucune étoile reconnue : pas plausible");
  ok(!UW.plausible(UW.parseKey(UW.keyOf(["water", "fern", "stone", "wind"], { r: UW.STARS[5].rgb[0], g: UW.STARS[5].rgb[1], b: UW.STARS[5].rgb[2], iris: 12, freq: 2, amp: 12 }))), "un jour figé (fréquence au plus bas) : pas plausible");
  // un monde trouvé ; les mêmes réglages le redonnent ; phase, harmonique et polarité ne le changent pas
  const r = rng(2026);
  for (let i = 0; i < 4000 && !sample; i++) { const cry = randomCry(r), s = randomSettings(r); const w = UW.find(cry, s, dep); if (w && w.data.model) sample = { cry, s, w }; }
  ok(sample, "des réglages qui tombent sur un monde jamais écrit");
  const { cry, s, w } = sample, u = w.unwritten;
  const again = UW.find(cry.slice(), { ...s }, dep);
  ok(again && again.unwritten.key === u.key && again.unwritten.seed === u.seed && again.unwritten.name === u.name && again.unwritten.text === u.text, "mêmes réglages : le même monde (clé, graine, nom, bloc)");
  const other = UW.find(cry, { ...s, phase: (s.phase + 7) % 25, harm: (s.harm + 9) % 25, pol: -s.pol }, dep);
  ok(other && other.unwritten.key === u.key, "la phase, l'harmonique, la polarité s'accordent ensuite : le monde ne change pas");
  ok(w.age.unwritten && w.planet === undefined && w.data.target.crystals.ids.join() === cry.join(), "ses premières pages : ces cristaux, dans cet ordre");
  ok(UW.keyOf(cry, { ...w.data.target.lens, freq: w.data.target.freq, amp: w.data.target.amp }) === u.key, "accordé sur son propre ciel, on reste sur lui");
  ok(UW.find([cry[1], cry[0], cry[2], cry[3]], s, dep) === null || UW.find([cry[1], cry[0], cry[2], cry[3]], s, dep).unwritten.key !== u.key, "l'ordre des cristaux compte");
  // déterminisme de la réponse « rien »
  const r2 = rng(77); let same = 0;
  for (let i = 0; i < 200; i++) { const c = randomCry(r2), x = randomSettings(r2), a = UW.find(c, x, dep), b = UW.find(c, x, dep); if ((!a && !b) || (a && b && a.unwritten.key === b.unwritten.key)) same++; }
  ok(same === 200, "deux cent réglages au hasard : chaque fois la même réponse (un monde, ou rien)");
}

// ---- 2. la fréquence ----------------------------------------------------------------------------------------------
{
  const r = rng(424242); let tried = 0, plaus = 0, alive = 0, lucky = 0, shown = 0, shownAll = 0, total = 0;
  for (let i = 0; i < 1500; i++) {
    const cry = randomCry(r), s = randomSettings(r), key = UW.keyOf(cry, s), k = UW.parseKey(key); tried++;
    if (!UW.plausible(k)) continue; plaus++;
    if (!UW.judge(key, dep)) continue; alive++;
    if (UW.lucky(key)) { lucky++; if (UW.find(cry, s, dep)) shown++; }
  }
  const rate = lucky / alive;
  ok(alive > 100 && rate >= 0.3 && rate <= 0.42, `parmi les réglages cohérents et vivants, ${(100 * rate).toFixed(1)} % tombent sur un monde (visé : 30–40 %)`);
  ok(shown === lucky, "le jugement et le hasard : toujours un monde quand les deux disent oui");
  const r3 = rng(99); // des réglages tout à fait au hasard (lumière quelconque) : rare
  for (let i = 0; i < 1500; i++) { total++; if (UW.find(randomCry(r3), randomSettings(r3, false), dep)) shownAll++; }
  ok(shownAll / total < 0.06, `réglages tout à fait au hasard : ${(100 * shownAll / total).toFixed(1)} % seulement (peu courant)`);
  ok(plaus / tried > 0.2 && alive / plaus < 0.6, `cohérents : ${(100 * plaus / tried).toFixed(0)} % des essais sur une étoile ; vivants : ${(100 * alive / plaus).toFixed(0)} % de ceux-là`);
}

// ---- 3. le bloc, l'analyse, la peinture ----------------------------------------------------------------------------
{
  const r = rng(5150); let found = 0, blots = 0, dying = 0, painted = 0;
  for (let i = 0; i < 3000 && found < 25; i++) {
    const w = UW.find(randomCry(r), randomSettings(r), dep); if (!w) continue; found++;
    const a = A(w.unwritten.text, w.unwritten.name);
    if (pageList(a, true).some((p) => p.blot) || a.resolved.lines.some((l) => l.unknown)) blots++;
    if (a.verdict === "dying") dying++;
    if (w.data.model) for (const tt of [0, 0.31, 0.77]) { G.paint(ctx, w.data.model, tt); painted++; }
  }
  ok(found >= 20 && blots === 0 && dying === 0, `${found} mondes jamais écrits : aucune tache d'encre, aucun mourant`);
  ok(painted >= 60 && bad === 0, `peints ${painted} fois : aucun nombre non fini`);
  const u = sample.w.unwritten;
  ok(u.lines.length === 8 && u.lines.slice(0, 4).join() === sample.cry.join() && u.lines.slice(4).every((l) => P.isPhysicsLine(l)), "le bloc : les quatre pages, puis l'étoile et le ciel en lignes de valeurs");
  ok(typeof u.words === "string" && u.words.length > 0 && u.words.split(/\s+/).length <= 7, `quelques mots de sa description : « ${u.words} »`);
}

// ---- 4. la transcription (aller-retour) ----------------------------------------------------------------------------
{
  const r = rng(31337); let trips = 0;
  for (let i = 0; i < 3000 && trips < 12; i++) {
    const cry = randomCry(r), s = randomSettings(r), w = UW.find(cry, s, dep); if (!w) continue; trips++;
    const u = w.unwritten, note = UW.noteOf(u, "intro"), src = extractAge(note.body), a = A(src, note.name), a0 = A(u.text, u.name);
    ok(note.name === u.name && note.body.startsWith("# " + u.name) && src.trim() === u.text, "la note : son nom, le bloc exact (les lignes et `seed:`)");
    ok(a.resolved.seed === String(u.seed) && IM.crystalsOf(a, "").ids.join() === cry.join(), "relu : même graine, mêmes premières pages");
    ok(JSON.stringify(pageList(a)) === JSON.stringify(pageList(a0)) && a.verdict === a0.verdict, "relu : mêmes pages, même tirage, même verdict");
    const tg = IM.targetsOf(a, note.name), tw = w.data.target;
    ok(tg.freq === tw.freq && tg.amp === tw.amp && JSON.stringify(tg.lens) === JSON.stringify(tw.lens) && tg.pol === tw.pol, "relu : le même ciel à l'Imageur");
    ok(G.sceneOf(a, note.name).seed === G.sceneOf(a0, u.name).seed, "relu : la même fenêtre générative");
  }
  ok(trips === 12, "douze transcriptions relues");
}

// ---- 5. les noms --------------------------------------------------------------------------------------------------
{
  const names = new Set(); let dup = 0, res = 0, okLen = 0;
  for (let s = 1; s <= 3000; s++) { const nm = UW.nameOf(s); if (nm !== UW.nameOf(s)) dup = -1e9; if (names.has(nm)) dup++; names.add(nm); if (UW.reserved(nm)) res++; if (/^[A-Z][a-z']{3,11}$/.test(nm)) okLen++; }
  ok(dup >= 0, "même graine, même nom");
  ok(res === 0 && okLen === 3000, "jamais le nom d'un Âge des jeux ; un mot de 4 à 12 signes");
  ok(dup / 3000 < 0.05, `peu de noms en double sur 3000 graines (${dup})`);
  ok(["Riven", "Teledahn", "Kadish", "Myst", "Releeshahn", "Serenia"].every((x) => UW.reserved(x)), "les noms des jeux sont écartés");
  const first = UW.nameOf(42), taken = new Set([first]), second = UW.nameOf(42, (x) => taken.has(x));
  ok(second !== first && second === UW.nameOf(42, (x) => taken.has(x)), "un nom déjà pris : le suivant, toujours le même");
  const w = UW.find(sample.cry, sample.s, { ...dep, taken: (x) => x === sample.w.unwritten.name });
  ok(!w || (w.unwritten.name !== sample.w.unwritten.name && w.unwritten.key === sample.w.unwritten.key), "une note porte déjà son nom : le monde prend un autre nom (même clé)");
}

// ---- 6. dans le Relto ---------------------------------------------------------------------------------------------
const tick = () => new Promise((res) => setTimeout(res, 0));
const relDone = (async () => {
  const { cry, s, w } = sample, u = w.unwritten;
  // une étagère : un Âge sans rapport, et (plus tard) le monde transcrit
  const srcs = { "Ages/Roc.md": ["single_sun\norange_sun\nstone\nsystem: Kerath", "Roc"] }, data = {};
  const load = () => { for (const [p, [src, name]] of Object.entries(srcs)) if (!data[p]) { const a = A(src, name); data[p] = { a, target: IM.targetsOf(a, name), model: null, system: SS.systemOf(a, src, name), orbit: CAL.orbitOf(a, name, SKY.parseSky(src)) }; } };
  load();
  const shelf = () => Object.keys(srcs).map((p) => ({ name: srcs[p][1], path: p, verdict: "stable", stability: 90, glyphs: [...new Set(pageList(data[p].a).filter((g) => g.written).map((g) => g.id))] }));
  const pages = ["page_telescope", "page_mountain", "page_imager"];
  const relto = M.parseRelto({ seed: 4242, structures: ["hut"], relto_pages_active: pages });
  const mkScene = () => { const sc = M.buildScene(relto, [...pages.filter((id) => id !== "page_telescope").map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), ...M.builtinPages()], shelf()); sc.ages = shelf(); return sc; };
  const store = {}, tunings = {}, sounds = [], written = [];
  let mode = "guild", finds = 0;
  const opts = (extra = {}) => ({
    instrumentsMode: () => mode, telescopeGet: (k) => store[k] || null, telescopeSet: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    onImagerAge: (age) => { const d = data[age.path]; return d ? { target: d.target, model: null, system: d.system, orbit: d.orbit } : null; },
    imagerGet: (p) => tunings[p] || null, imagerSet: (p, v) => { tunings[p] = JSON.parse(JSON.stringify(v)); }, onImagerSound: (k) => sounds.push(k),
    unwrittenFind: (c, x) => { finds++; return UW.find(c, x, dep); },
    onTranscribe: (uu) => { const note = UW.noteOf(uu, "intro"); written.push(note); return note.name; },
    ...extra,
  });
  const mk = (extra) => { const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni, opts(extra)); r.nowOverride = t0; r.setScene(mkScene()); return r; };
  const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const clickOn = (r, f, why) => { const h = r.hot.find((x) => x.imager && f(x.imager)); ok(h, "zone cliquable : " + why); r.toLogical = () => [h.x + 1, h.y + 1]; r.onClick({}); r.draw(2); return h; };

  const ri = mk(); ri.setView("imager"); ri.draw(1); await tick(); ri.draw(1.1);
  const st = ri.imager; ok(st.guild && st.cands.length === 1, "mode Guilde : l'étagère est lue");
  // les régleurs : trois cristaux, le régulateur dort ; quatre, il cherche
  st.g = { ...st.g, cry: [cry[0], cry[1], cry[2], null] }; ri.draw(1.2);
  clickOn(ri, (a) => a.station === "atmo", "poste III");
  const f0 = st.settings.freq; clickOn(ri, (a) => a.key === "freq" && a.delta > 0, "fréquence + (trois cristaux)");
  ok(st.settings.freq === f0 && sounds[sounds.length - 1] === "jam", "trois cristaux : le régulateur dort");
  st.g = { ...st.g, cry: cry.slice() }; ri.draw(1.3);
  clickOn(ri, (a) => a.key === "freq" && a.delta > 0, "fréquence + (quatre cristaux)");
  ok(st.settings.freq === Math.min(24, f0 + 1), "quatre cristaux posés : le régulateur cherche, les boutons tournent");
  clickOn(ri, (a) => a.station === null, "reculer");
  // les réglages du monde : il apparaît, flou (la phase n'est pas juste)
  const tg = w.data.target;
  st.settings = IM.normalize({ ...st.settings, ...s, phase: (IM.phaseAt(tg, t0) + 9) % 25, pol: tg.pol }); ri.draw(2);
  ok(st.world && st.world.unwritten && st.world.unwritten.key === u.key && st.planet, "les réglages d'un monde jamais écrit : il répond, la planète est tenue");
  ok(!sounds.includes("unwritten") && ri.imagerClarity().total < IM.LOCK_AT, "encore flou : rien n'est annoncé");
  ok(!ri.hot.some((h) => h.imager && h.imager.transcribe), "pas encore de « Transcrire » tant que l'image ne tient pas");
  const finds0 = finds; ri.draw(2.1); ri.draw(2.2); ok(finds === finds0, "le monde est gardé en cache : on ne le recherche pas à chaque image");
  ri.imagerAct({ transcribe: true }); ok(sounds[sounds.length - 1] === "jam" && !written.length, "transcrire une image floue : rien");
  // on accorde : l'image se forme ; une note étrange, une ligne
  st.settings = IM.normalize({ ...st.settings, freq: tg.freq, amp: tg.amp, harm: tg.harm, phase: IM.phaseAt(tg, t0), r: tg.lens.r, g: tg.lens.g, b: tg.lens.b, iris: tg.lens.iris });
  ri.imagerAct({ key: "phase", delta: 0 }); ri.draw(3);
  ok(st.world.unwritten && ri.imagerClarity().total > 0.97, "tout accordé : l'image est nette");
  ok(sounds.filter((k) => k === "unwritten").length === 1 && /world no one has written/.test(ri.flash.text), "la note étrange et la ligne : « The book shows a world no one has written. »");
  ok(!st.g.seen.includes(u.name), "le livre ne retient pas de nom : personne ne l'a écrit");
  ri.draw(3.1); ok(sounds.filter((k) => k === "unwritten").length === 1, "annoncé une seule fois");
  ok(ri.hot.some((h) => /blank book shows a world no one has written/.test(h.tip)) && ri.hot.some((h) => h.tip === "A world no one has written") && !ri.hot.some((h) => h.tip === u.name), "le livre et l'écran : un monde que personne n'a écrit, sans nom");
  ok(bad === 0, "dessin du livre vierge : aucun nombre non fini");
  // le verrou tient aussi un monde jamais écrit
  clickOn(ri, (a) => a.lock, "verrou"); ok(st.settings.lock && st.world.unwritten, "le verrou prend");
  ri.nowOverride = t0 + 5 * 3600000; ri.draw(4); ok(st.world.unwritten && st.world.unwritten.key === u.key && ri.imagerClarity().total > 0.97, "cinq heures plus tard : la machine le suit");
  ok(!ri.imagerCal(), "pas de système situé : ni micromètre ni heure là-bas");
  // transcrire
  clickOn(ri, (a) => a.transcribe, "Transcrire ce monde"); await tick(); ri.draw(5);
  ok(written.length === 1 && written[0].name === u.name && extractAge(written[0].body).trim() === u.text, "transcrit : une note avec exactement son bloc");
  ok(/Transcribed — /.test(ri.flash.text) && ri.hot.some((h) => h.imager && h.imager.transcribe && /Transcribed — /.test(h.tip)), "« Transcrit » sur la plaque");
  // le monde rejoint l'étagère : il devient un Âge écrit, et c'est lui qui répond
  srcs["Ages/" + u.name + ".md"] = [extractAge(written[0].body), u.name]; load();
  clickOn(ri, (a) => a.lock, "relâcher");
  const r2 = mk(); r2.nowOverride = ri.nowOverride; r2.setView("imager"); r2.draw(1); await tick(); r2.draw(1.1);
  ok(r2.imager.world && !r2.imager.world.unwritten && r2.imager.world.age.name === u.name && r2.imager.planet, "transcrit, il est sur l'étagère : un Âge écrit répond aux mêmes cristaux");
  ok(JSON.stringify(r2.imager.target.lens) === JSON.stringify(tg.lens) && r2.imager.target.freq === tg.freq, "le même ciel");
  r2.imager.settings = IM.normalize({ ...r2.imager.settings, phase: IM.phaseAt(r2.imager.target, r2.nowOverride) }); r2.imagerAct({ key: "phase", delta: 0 });
  ok(r2.imager.g.seen.includes(u.name), "et le livre retient désormais son nom");

  // un Âge écrit l'emporte toujours, même quand le hasard dirait oui
  {
    const fake = { age: { name: "Zeta", path: "Ages/Zeta.md" }, data: { target: { ...tg, crystals: { ids: cry.slice(), options: cry.slice() } } } };
    const pick = GI.choose([fake], cry, s, t0, null, (c, x) => UW.find(c, x, dep));
    ok(pick.world === fake && pick.planet && !pick.unwritten, "un Âge écrit aux mêmes premières pages : c'est lui, jamais le monde non écrit");
    const pick2 = GI.choose([fake], cry, s, t0, data["Ages/Roc.md"].system.key, (c, x) => UW.find(c, x, dep));
    ok(!pick2.unwritten, "le télescope tient une étoile : pas de monde non écrit (la lumière est celle d'un Âge écrit)");
    ok(GI.choose([], cry, s, t0, null, null).world === null, "sans chercheur : la fenêtre reste noire");
  }

  // en français
  const rf = mk({ t: makeT(() => "fr") }); rf.setView("imager"); rf.draw(1); await tick();
  rf.imager.g = { ...rf.imager.g, cry: [cry[0], cry[3], cry[2], cry[1]] }; rf.draw(1.1); // (sur l'étagère, le monde est écrit : on en cherche un autre)
  { const r = rng(808); let hit = null; for (let i = 0; i < 4000 && !hit; i++) { const c = randomCry(r), x = randomSettings(r), ww = UW.find(c, x, dep); if (ww && ww.unwritten.key !== u.key) hit = { c, x, ww }; }
    const tt = hit.ww.data.target; rf.imager.g = { ...rf.imager.g, cry: hit.c }; rf.imager.settings = IM.normalize({ ...hit.x, harm: tt.harm, pol: tt.pol, phase: IM.phaseAt(tt, t0), r: tt.lens.r, g: tt.lens.g, b: tt.lens.b, iris: tt.lens.iris, freq: tt.freq, amp: tt.amp });
    rf.imagerAct({ key: "phase", delta: 0 }); rf.draw(2);
    ok(/Le livre montre un monde que personne n'a écrit/.test(rf.flash.text) && rf.hot.some((h) => h.imager && h.imager.transcribe && /Transcrire ce monde/.test(h.tip)), "en français : la ligne et « Transcrire ce monde »"); }

  // le mode facile : inchangé (aucune recherche)
  mode = "easy"; const fe = finds;
  const re = mk(); re.setView("imager"); re.draw(1); await tick(); re.draw(1.1);
  ok(!re.imager.guild && finds === fe && !re.hot.some((h) => h.imager && h.imager.transcribe), "mode facile : ni livre vierge, ni monde non écrit");
})();

relDone.then(() => {
  const keys = ["guild.unwritten.formed", "guild.unwritten.book", "guild.unwritten.screen", "guild.unwritten.tip", "guild.transcribe", "guild.transcribe.tip", "guild.transcribe.done", "guild.transcribe.blur", "guild.transcribed", "guild.transcribe.fail", "guild.tube.search", "guild.tube.search.tip", "unwritten.intro"];
  ok(keys.every((k) => D.en[k] && D.fr[k] && D.en[k] !== D.fr[k]), "les textes des mondes non écrits en anglais et en français");
  hooks.skip = skip0;
  console.log(`✓ unwritten.test.js (${n} contrôles)`);
}).catch((e) => { console.error(e); console.log("FAIL"); process.exit(1); });
