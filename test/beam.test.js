"use strict";
// Le rahnfee (src/beam.js, invention de fan) : 1 rahnfee = 25³ = 15 625 shahfeetee de faisceau, le trajet du pouls en un
// prorahn. Conversions, chiffres D'ni après le point, lecture du retard, portée (aucune étoile au-delà), puis le rendu :
// molette du retard, plaque de l'étoile, carte des étoiles (chiffres finis, rien ne déborde des plaques).
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
const BEAM = require("../src/beam"), SS = require("../src/starsystem"), T = require("../src/telescope"), PB = require("../src/perturbers"), MAP = require("../src/starmap");
const M = require("../src/relto-model"), { ReltoRenderer } = require("../src/relto-render"), TL = require("../src/relto-telescope"), { Dni, fromBase25 } = require("../src/dni"), { D, makeT } = require("../src/i18n");

// ---- 1. l'unité et ses chiffres -------------------------------------------------------------------------------------
ok(BEAM.RAHNFEE === 15625 && BEAM.RAHNFEE === 25 * 25 * 25, "1 rahnfee = 25³ = 15 625 shahfeetee de faisceau");
ok(BEAM.rahnfeeOf(15625) === 1 && BEAM.shahfeeteeOf(1) === 15625 && BEAM.rahnfeeOf(7812.5) === 0.5 && BEAM.rahnfeeOf(NaN) === 0, "conversions dans les deux sens (non fini → 0)");
ok(JSON.stringify(BEAM.digitsOf(0)) === "[0,0,0,0]" && JSON.stringify(BEAM.digitsOf(625)) === "[0,1,0,0]" && JSON.stringify(BEAM.digitsOf(25)) === "[0,0,1,0]" && JSON.stringify(BEAM.digitsOf(1)) === "[0,0,0,1]", "un 25ᵉ = 625, un 625ᵉ = 25, un 15 625ᵉ = 1 shahfee");
ok(JSON.stringify(BEAM.digitsOf(7812)) === "[0,12,12,12]", "un demi-rahnfee : 0·12 12 12 (7 812 shahfeetee)");
ok(JSON.stringify(BEAM.digitsOf(15625, 3, { clamp: false })) === "[1,0,0,0]" && JSON.stringify(BEAM.digitsOf(15625)) === "[0,24,24,24]", "un rahnfee entier : 1·0 0 0 ; borné, la lecture s'arrête juste dessous");
{ // trois places : le même entier que la valeur en shahfeetee, lu après le point
  let same = true; for (let sf = 0; sf < BEAM.RAHNFEE; sf += 37) { const d = BEAM.digitsOf(sf); if (d[0] !== 0 || fromBase25(d.slice(1)) !== sf || BEAM.fromDigits(d) !== sf || d.some((x) => x < 0 || x > 24 || !Number.isInteger(x))) same = false; }
  ok(same, "sous un rahnfee, « 0·abc » est exactement l'entier en shahfeetee écrit en base 25 (aller-retour)");
}
ok(JSON.stringify(BEAM.digitsOf(12.4)) === "[0,0,0,12]" && JSON.stringify(BEAM.digitsOf(12.6)) === "[0,0,0,13]" && JSON.stringify(BEAM.digitsOf(-5)) === "[0,0,0,0]" && JSON.stringify(BEAM.digitsOf(Infinity)) === "[0,0,0,0]" && JSON.stringify(BEAM.digitsOf("x")) === "[0,0,0,0]", "arrondi au shahfee ; négatif, non fini, illisible : zéro, jamais hors des chiffres");
ok(JSON.stringify(BEAM.digitsOf(7800, 1)) === "[0,12]" && JSON.stringify(BEAM.digitsOf(7900, 1)) === "[0,13]" && JSON.stringify(BEAM.digitsOf(312, 2)) === "[0,0,12]" && JSON.stringify(BEAM.digitsOf(313, 2)) === "[0,0,13]", "moins de places : arrondi au dernier chiffre (25ᵉ, 625ᵉ)");
ok(BEAM.clamp(20000) === BEAM.REACH && BEAM.clamp(-3) === 0 && BEAM.within(15624) && !BEAM.within(15625) && !BEAM.within(NaN), "portée : de 0 à juste sous un rahnfee");

// ---- 2. le retard de la molette, en rahnfee -----------------------------------------------------------------------------
{
  let okd = true; for (let d = 0; d <= SS.DELAY_MAX; d++) { const g = BEAM.delayDigits(d, SS.DELAY_UNIT); if (g.length !== 3 || g[0] !== 0 || g[1] * 25 + g[2] !== d || BEAM.fromDigits(g) !== d * SS.DELAY_UNIT) okd = false; }
  ok(okd, "les 625 crans de la molette : 0·a b, a·25 + b = crans (un cran = un 625ᵉ de rahnfee = 25 shahfeetee)");
  ok(SS.DELAY_UNIT * 625 === BEAM.RAHNFEE && SS.DELAY_MAX * SS.DELAY_UNIT < BEAM.RAHNFEE, "la molette tient sous un rahnfee : 624 crans au plus");
  ok(BEAM.lateOf(312.5) === 0.5 && BEAM.lateOf(0) === 0 && Math.abs(BEAM.lateOf(SS.DELAY_MAX) - 624 / 625) < 1e-12, "le retard en fraction de battement");
  const sys = SS.position("single_sun@rf1"), c = SS.zeroSeenFrom(sys);
  ok(Math.abs(BEAM.fromDigits(BEAM.delayDigits(c.delay)) - Math.hypot(sys.distance, sys.elevation)) <= SS.DELAY_UNIT / 2, "la lecture de la molette (juste) redit le trajet du pouls, à un demi-cran près");
  const words = D.en["beam.late"].split("|"), wf = D.fr["beam.late"].split("|");
  ok(words.length === BEAM.BANDS && wf.length === BEAM.BANDS && D.en["beam.far"].split("|").length === BEAM.BANDS && D.fr["beam.far"].split("|").length === BEAM.BANDS, "mêmes listes de mots dans les deux langues");
  ok(words[BEAM.fracBand(BEAM.lateOf(312))] === "about half a beat after" && words[BEAM.fracBand(BEAM.lateOf(208))] === "about a third of a beat after" && words[BEAM.fracBand(0)] === "almost with" && words[BEAM.fracBand(BEAM.lateOf(620))] === "almost a whole beat after", "en mots : un demi-battement, un tiers, presque avec, presque un battement entier");
  let mono = true, last = -1; for (let d = 0; d <= SS.DELAY_MAX; d++) { const b = BEAM.fracBand(BEAM.lateOf(d)); if (b < last) mono = false; last = b; } ok(mono, "plus de retard, jamais moins de mots");
  // les mots de l'arpenteur : paliers inchangés, et cohérents avec la fraction de battement qu'ils nomment
  ok(JSON.stringify(SS.DELAY_AT) === "[40,120,250,400]", "paliers de l'arpenteur inchangés");
  const sd = D.en["sys.delay"].split("|"); ok(/third of a beat/.test(sd[2]) && /half a beat/.test(sd[3]) && Math.abs(BEAM.lateOf(185) - 1 / 3) < 0.1 && Math.abs(BEAM.lateOf(325) - 1 / 2) < 0.1, "l'arpenteur : « about a third / half a beat late » au milieu de ces paliers");
}

// ---- 3. portée : aucune étoile au-delà d'un rahnfee ---------------------------------------------------------------------
{
  let far = 0, okp = true; for (let i = 0; i < 3000; i++) { const p = SS.position("single_sun@reach" + i); far = Math.max(far, p.distance); if (!BEAM.within(Math.hypot(p.distance, p.elevation)) || SS.delayOf(p) * SS.DELAY_UNIT >= BEAM.RAHNFEE) okp = false; }
  ok(okp && far < BEAM.RAHNFEE && SS.SYS_DIST[1] < BEAM.RAHNFEE, `3 000 étoiles : toutes sous un rahnfee (la plus lointaine à ${far})`);
  let okw = true; for (const kinds of [["pulsar"], ["black_hole"], ["neutron_star"], ["pulsar", "black_hole"]]) for (let i = 0; i < 12; i++) { const s = SS.placeSystem("single_sun@w" + kinds.join() + i, kinds); if (!BEAM.within(s.pos.distance) || s.near.some((q) => !BEAM.within(q.d))) okw = false; }
  ok(okw, "écrire des étoiles mortes ne pousse aucune étoile au-delà d'un rahnfee ; leurs distances non plus");
  ok(T.DIST_MAX < BEAM.RAHNFEE, "le Zéro d'un Relto reste sous un rahnfee (DIST_MAX 15 624)");
}

// ---- 4. les chiffres à virgule de Dni ----------------------------------------------------------------------------------
const dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
{
  const s = dni.fractionSvg([0, 12, 3, 24], { size: 16 });
  ok(/^<svg/.test(s) && !/NaN|undefined|Infinity/.test(s) && (s.match(/<g /g) || []).length === 3 && (s.match(/<rect /g) || []).length === 3, "SVG : trois chiffres, chacun dans sa lucarne ; ni zéro entier ni virgule");
  const big = dni.fractionSvg([1, 2], { size: 16 }); ok((big.match(/<g /g) || []).length === 2 && (big.match(/<rect /g) || []).length === 1, "un entier non nul s'écrit à nu, avant les lucarnes");
  ok(dni.fractionWidth([0, 1, 2, 3], 10) > dni.widthOf(0, 10) * 3 && Number.isFinite(dni.fractionWidth(null, 10)), "largeur : trois lucarnes ; sans chiffres, finie");
  const log = []; const lc = new Proxy({}, { get: (_, k) => (...a) => { log.push([k, ...a]); a.forEach(chk); }, set: () => true });
  const w = dni.drawFraction(lc, [0, 24, 24, 24], 10, 5, 12, "#000"); ok(Math.abs(w - dni.fractionWidth([0, 24, 24, 24], 12)) < 1e-9 && log.filter((l) => l[0] === "strokeRect").length === 3, "le dessin occupe la largeur annoncée, trois lucarnes");
}

// ---- 5. le rendu : molette du retard, plaque de l'étoile, carte ----------------------------------------------------------
(async () => {
  // un Dni qui note ce qu'il grave (x, largeur) : rien ne doit sortir de la plaque
  const marks = [], spy = new Dni({ getMode: () => "auto" }); spy.ready = true;
  const n0 = spy.drawNumber.bind(spy), f0 = spy.drawFraction.bind(spy);
  spy.drawNumber = (c, v, x, y, size, ...rest) => { const w = n0(c, v, x, y, size, ...rest); marks.push({ x, y, w, size, frac: false }); return w; };
  spy.drawFraction = (c, d, x, y, size, ...rest) => { const w = f0(c, d, x, y, size, ...rest); marks.push({ x, y, w, size, frac: true, d }); return w; };
  const pages = ["page_telescope", "page_mountain"], ages = [{ name: "Brume", path: "Ages/Brume.md", verdict: "stable", stability: 90 }];
  const relto = M.parseRelto({ seed: 777, structures: ["hut"], relto_pages_active: pages });
  const sc = M.buildScene(relto, [M.parsePage(M.pageFrontmatter("page_mountain", M.PAGE_PRESETS.page_mountain), "m.md"), ...M.builtinPages()], ages); sc.ages = ages;
  for (const [lang, dist] of [["en", 14999], ["fr", 9876], ["en", 200]]) {
    const pos = { torahn: 31250, distance: dist, elevation: -100 }, clue = SS.zeroSeenFrom(pos), sys = { key: "k" + dist, pos, near: [], fx: {}, clue, seen: clue, perturbed: false };
    const r = new ReltoRenderer(dom.window.document.createElement("canvas"), spy, { instrumentsMode: "easy", t: makeT(() => lang) });
    r.setScene(sc); r.setView("telescope"); r.nowOverride = 1.8e12; r.draw(1);
    const st = r.telescope; st.found = true; st.book = { idx: 0, age: ages[0], data: { system: sys }, loading: false };
    st.dial = { torahn: clue.torahn, elev: clue.elevation, delay: clue.delay };
    st.systems = { [sys.key]: { at: 1.8e12, torahn: pos.torahn, elevation: pos.elevation, distance: pos.distance, rel: { x: 0, y: 0, z: 0 } } };
    marks.length = 0; r.draw(2);
    const P = TL.SPLATE, plateMarks = marks.filter((m) => m.y >= P.y && m.y < P.y + P.h), fr = plateMarks.find((m) => m.frac);
    ok(fr && JSON.stringify(fr.d) === JSON.stringify(BEAM.digitsOf(dist)), `${lang} ${dist} : la plaque grave la distance en rahnfee (0·${BEAM.digitsOf(dist).slice(1).join(" ")})`);
    ok(plateMarks.length >= 2 && plateMarks.every((m) => m.x >= P.x + 4 && m.x + m.w <= P.x + P.w - 4 && m.y + m.size <= P.y + P.h), `${lang} ${dist} : tout tient sur la plaque de l'étoile`);
    const dm = marks.find((m) => m.frac && m.y > TL.DELAY.y && m.y < TL.DELAY.y + 60);
    ok(dm && JSON.stringify(dm.d) === JSON.stringify(BEAM.delayDigits(clue.delay)), `${lang} ${dist} : sous la molette, le retard en rahnfee (0·${BEAM.delayDigits(clue.delay).slice(1).join(" ")})`);
    ok(dm.x >= 374 && dm.x + dm.w <= 374 + 250, "la lecture du retard reste sur le panneau de l'instrument");
    const late = r.hot.find((h) => lang === "en" ? /^The pulse comes .* the pendulum\.$/.test(h.tip) : /^Le pouls arrive .* le balancier\.$/.test(h.tip));
    ok(late, `${lang} : la valeur du retard dit, en mots, le retard du pouls sur le balancier (${late && late.tip})`);
    ok(r.hot.some((h) => (lang === "en" ? /in rahnfee/ : /en rahnfee/).test(h.tip)), `${lang} : l'unité du retard nomme le rahnfee`);
    // la carte : l'infobulle de l'étoile dit la distance en mots et porte ses chiffres
    r.setView("starmap"); r.draw(3);
    const tip = r.hot.find((h) => h.frac); ok(tip && JSON.stringify(tip.frac) === JSON.stringify(BEAM.digitsOf(dist)) && (lang === "en" ? /from the Zero, along the beam/ : /du Zéro, le long du faisceau/).test(tip.tip), `${lang} : sur la carte, la distance en rahnfee (${tip && tip.tip})`);
    r.hover = tip; marks.length = 0; r.drawHover(ctx); ok(marks.some((m) => m.frac), "survolée : l'infobulle grave les chiffres");
  }
  ok(bad === 0, "rahnfee : aucun nombre non fini");
  ok(["beam.late", "beam.late.line", "beam.far", "beam.far.line", "beam.delay.tip", "beam.dist.tip"].every((k) => D.en[k] && D.fr[k]), "textes en anglais et en français");
  ok(!/km|kilom/i.test(Object.keys(D.en).filter((k) => k.startsWith("beam.")).map((k) => D.en[k] + D.fr[k]).join()), "aucune conversion en kilomètres");
  void PB; void MAP;
  console.log(`✓ beam.test.js (${n} contrôles)`);
})().catch((e) => { console.error(e); console.log("FAIL"); process.exit(1); });
