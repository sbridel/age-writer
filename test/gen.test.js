"use strict";
// Fenêtre génératrice et dégâts procéduraux : géométrie, déterminisme, valeurs finies, bornes.
const assert = require("assert");
const G = require("../src/genscene"), D = require("../src/damagefx"), M = require("../src/mech"), { rng } = require("../src/util");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

/** Faux contexte 2D : enregistre les appels, vérifie que tout nombre est fini. */
function fakeCtx(log) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get: (_, k) => {
      if (k === "canvas") return { width: 320, height: 192 };
      if (k === "createLinearGradient" || k === "createRadialGradient") return (...a) => { a.forEach(chk); return grad; };
      return (...a) => { a.forEach(chk); log.push(k + ":" + a.map((x) => (typeof x === "number" ? x.toFixed(2) : typeof x === "string" ? x : "")).join(",")); };
    },
    set: (_, k, v) => { log.push("=" + String(k) + ":" + (typeof v === "number" ? v.toFixed(2) : String(v))); return true; },
  });
  function chk(x) { if (typeof x === "number") assert(Number.isFinite(x), "valeur non finie : " + x); }
}

// sceneOf : lit les identifiants résolus
const an = (ids, st = 90) => ({ verdict: "stable", stability: st, resolved: { lines: ids.map((id) => ({ entry: { id } })), matter: { written: [], reactions: [] } } });
const s1 = G.sceneOf(an(["single_sun", "water", "storm", "cave_fissure"]), "A");
ok(s1.suns === 1 && s1.water && s1.storm && s1.rain && s1.wind && s1.fissure === "cave", "sceneOf lit le contenu");
ok(G.sceneOf(an(["water", "fissure"]), "A").fissure === "submarine" && G.sceneOf(an(["fissure"]), "A").fissure === "open", "fissure sous l'eau / à l'air");
ok(G.sceneOf(an(["water", "no_fissure"]), "A").fissure === null, "no_fissure");
ok(G.sceneOf(null) === null && G.sceneOf({ verdict: "stable" }) === null, "analyse inconnue → null (rendu classique)");
ok(G.sceneOf(an(["tree"]), "A").seed !== G.sceneOf(an(["tree"]), "B").seed, "le nom change la graine");
ok(Math.abs(G.sceneOf(an([], 40)).unrest - 0.6) < 1e-9, "instabilité");

// build + paint sur des scènes variées : aucune erreur, aucun nombre infini, aucun NaN
const flags = ["moon", "chaos", "veil", "auroras", "eclipses", "starfall", "rain", "storm", "wind", "fog", "lightning", "heat", "hail", "steam", "dust", "ash", "lava", "water", "ice", "sand", "burnt", "fire", "moths", "glow", "eyes", "lampLit", "tabletAwake"];
const r = rng(7); let calls = 0;
for (let i = 0; i < 60; i++) {
  const S = G.sceneOf(an(["single_sun"]), "x" + i); for (const f of flags) if (r() < 0.3) S[f] = true;
  S.suns = Math.floor(r() * 3); S.trees = [0, 3, 5][i % 3]; S.cycle = ["steady", "frozen", "erratic"][i % 3]; S.skyStated = i % 2 === 0;
  S.ruins = ["door", "bridge", "tablet", "lamp"].filter(() => r() < 0.4); S.fissure = [null, "open", "cave", "submarine"][i % 4]; S.seed = (i * 2654435761) >>> 0;
  const W = 240 + (i % 3) * 40, H = Math.round(W * 0.6), m = G.build(S, W, H);
  for (const t of [0, 0.13, 0.5, 0.99, 1.37]) { const log = []; G.paint(fakeCtx(log), m, t); calls += log.length; ok(log.length > 20, "dessine quelque chose"); }
}
ok(calls > 5000, "beaucoup d'appels contrôlés : " + calls);

// déterminisme : même scène + même phase → mêmes appels ; autre graine → autre dessin
const base = G.sceneOf(an(["single_sun", "grove", "water"]), "Marais"), sig = (S, t) => { const l = []; G.paint(fakeCtx(l), G.build(S, 320, 192), t); return l.join("|"); };
ok(sig(base, 0.3) === sig(base, 0.3), "déterministe");
ok(sig(base, 0.3) !== sig({ ...base, seed: base.seed + 1 }, 0.3), "autre graine, autre paysage");
ok(sig(base, 0.3) !== sig(base, 0.6), "le temps anime");

// soleils : un seul à la fois sur le trajet, aucun la nuit
const m1 = G.build({ ...base, suns: 1, cycle: "steady" }, 320, 192);
ok(G.suns(m1, 0.2).length === 1 && G.suns(m1, 0.9).length === 0, "jour / nuit");

// blocs inconnus (bibliothèque) : peints d'après l'axe et les adjectifs
const lib = new Map([["books", { id: "books", descriptors: ["closed", "rich"], axis: "geological" }], ["moonmilk", { id: "moonmilk", descriptors: ["pale", "thick", "patient"], axis: "geological" }],
  ["halo", { id: "halo", descriptors: ["vast", "humming"], axis: "cosmological" }], ["reeds", { id: "reeds", descriptors: ["thin", "swift"], axis: "ecological" }],
  ["veil", { id: "veil", descriptors: ["pale", "slow"], axis: "meteorological" }], ["echo", { id: "echo", descriptors: ["wrong", "listening"], axis: "metaphysical" }]]);
const sx = G.sceneOf(an(["single_sun", "water", "books", "moonmilk", "halo", "reeds", "veil", "echo", "mystere_sans_fiche"]), "L", lib);
ok(sx.extras.length === 7 && !sx.extras.some((e) => e.id === "water" || e.id === "single_sun"), "seuls les blocs inconnus du peintre sont génériques");
ok(sx.extras.find((e) => e.id === "books").axis === "geological" && sx.extras.find((e) => e.id === "books").words.join() === "closed,rich", "axe et adjectifs lus dans la bibliothèque");
const nf = sx.extras.find((e) => e.id === "mystere_sans_fiche"); ok(nf && ["cosmological", "geological", "meteorological", "ecological", "metaphysical"].includes(nf.axis) && nf.words.join() === "mystere,sans,fiche", "sans fiche : axe tiré du nom, mots du nom");
ok(G.sceneOf(an(["books"]), "L").extras.length === 1, "sans registre : pas d'erreur");
ok(G.sceneOf(an(Array.from({ length: 20 }, (_, i) => "inconnu_" + i)), "L").extras.length === 8, "au plus 8 blocs génériques");
ok(G.sceneOf(an(["?xyz"]), "L").extras.length === 0, "un symbole inconnu du moteur n'est pas un bloc");
ok([...G.KNOWN].every((id) => /^[a-z_]+$/.test(id)), "liste des identifiants connus");
// traits : déterministes, lexique prioritaire, mots libres acceptés
const t1 = G.traits(["closed", "rich"]), t2 = G.traits(["closed", "rich"]);
ok(JSON.stringify(t1) === JSON.stringify(t2), "traits déterministes");
ok(t1.h === 44 && t1.v < 0.3, "« rich » = or, « closed » = immobile");
ok(G.traits(["pale"]).l > G.traits(["dark"]).l && G.traits(["vast"]).z > G.traits(["tiny"]).z && G.traits(["swift"]).v > G.traits(["slow"]).v, "lexique : clair/sombre, grand/petit, vif/lent");
ok(G.traits(["humming"]).p && G.traits(["sharp"]).sp, "pulsation, arêtes");
const tz = G.traits(["zzyzx", "qwfp"]); ok(tz.h >= 0 && tz.h < 360 && tz.z === 1 && tz.v === 1, "mot libre : teinte par hachage, reste neutre");
ok(JSON.stringify(G.traits(["gris"])) !== JSON.stringify(G.traits(["bleu"])), "deux mots libres : deux teintes");
for (const w of [[], ["a"], ["vast", "immense", "giant", "huge"], ["tiny", "tiny", "tiny"]]) { const q = G.traits(w); ok(q.z >= 0.4 && q.z <= 2.2 && q.l >= 0.2 && q.l <= 0.9 && q.v >= 0.1 && q.v <= 2.5, "traits bornés"); }
// peinture avec blocs génériques : tous les axes, valeurs finies, visible dans le dessin, propre à la graine
{
  const sig2 = (S, t) => { const l = []; G.paint(fakeCtx(l), G.build(S, 320, 192), t); return l; };
  const none = sig2({ ...sx, extras: [] }, 0.4), all = sig2(sx, 0.4);
  ok(all.length > none.length + 40, "les blocs génériques ajoutent des éléments au dessin");
  for (const ax of ["cosmological", "geological", "ecological", "meteorological", "metaphysical"]) { const one = sig2({ ...sx, extras: [{ id: "u", axis: ax, words: ["pale", "humming"] }] }, 0.4); ok(one.length > none.length, "axe " + ax + " dessiné"); }
  ok(all.join() !== sig2({ ...sx, seed: sx.seed + 3 }, 0.4).join(), "propre à l'Âge (graine)");
  ok(sig2({ ...sx, extras: [{ id: "u", axis: "geological", words: ["sharp"] }] }, 0.4).join() !== sig2({ ...sx, extras: [{ id: "u", axis: "geological", words: ["thick"] }] }, 0.4).join(), "adjectifs : aiguilles ou dômes");
  for (let i = 0; i < 20; i++) sig2({ ...sx, seed: i * 977 }, i / 20);
}

// reflets, premier plan, détail habité, brume
{
  const W = 320, H = 192, mk = (o, seed = 5) => G.build({ ...G.sceneOf(an(["single_sun"]), "R"), seed, ...o }, W, H);
  const rec = (m, t = 0.3) => { const l = []; G.paint(fakeCtx(l), m, t); return l; };
  const dr = (l) => l.filter((x) => x.startsWith("drawImage")).length;
  const rows = Math.floor(H - H * 0.7);
  ok(dr(rec(mk({ water: true }))) >= rows - 2, "reflets : une bande par ligne d'eau");
  ok(dr(rec(mk({ water: false, ice: false }))) === 0, "pas d'eau, pas de reflet");
  ok(dr(rec(mk({ ice: true }))) >= rows - 2, "la glace reflète aussi (moins)");
  // reflets : l'opacité diminue avec la profondeur
  const al = []; const g0 = fakeCtx([]); const gp = new Proxy(g0, { set: (t, k, v) => { if (k === "globalAlpha") al.push(v); return true; }, get: (t, k) => t[k] });
  G.paint(gp, mk({ water: true }), 0.3); const ra = al.filter((x) => x < 0.5 && x > 0); ok(ra.length > 20 && ra[2] > ra[ra.length - 2], "reflets : de plus en plus fondus");
  // variété : premier plan et détail dépendent de la graine
  const fgs = new Set(), dets = new Set(); for (let i = 0; i < 60; i++) { const m = mk({}, i * 7919 + 1); fgs.add(m.fg.kind); dets.add(m.det.kind); }
  ok(fgs.size >= 6, "premiers plans variés : " + [...fgs]);
  // 1.16.1 : le premier plan suit l'Âge, et la branche est générée
  const kinds = (o) => { const k = new Set(); for (let i = 0; i < 200; i++) k.add(mk(o, i * 104729 + 3).fg.kind); return k; };
  ok(!kinds({ water: false, ice: false }).has("reeds") && kinds({ water: true }).has("reeds"), "roseaux seulement au bord de l'eau");
  ok(!kinds({ ice: false }).has("icicles") && kinds({ ice: true }).has("icicles"), "glaçons seulement s'il gèle");
  const shapes = new Set(); let nb = 0;
  for (let i = 0; i < 300 && nb < 25; i++) { const m = mk({ trees: 3 }, i * 15485863 + 11); if (m.fg.kind !== "branches") continue; nb++; const sg = m.fg.branch.segs; ok(sg.length >= 4 && sg.every((x) => [x.x, x.y, x.cx, x.cy, x.x2, x.y2, x.w].every(Number.isFinite)), "branche : segments finis"); shapes.add(sg.length + ":" + Math.round(sg[sg.length - 1].x2)); }
  ok(nb >= 10 && shapes.size >= nb - 2, `branches : une forme par Âge (${shapes.size}/${nb})`); ok(dets.size === 5, "cinq détails : " + [...dets]);
  // déterministe
  ok(JSON.stringify(mk({}, 9).det) === JSON.stringify(mk({}, 9).det) && JSON.stringify(mk({}, 9).fg) === JSON.stringify(mk({}, 9).fg), "premier plan et détail déterministes");
  // le détail est posé loin des ruines et des arbres
  let far = 0; for (let i = 0; i < 40; i++) { const m = mk({ ruins: ["door", "tablet", "lamp"], trees: 5 }, i * 131 + 7); const xs = [...m.ruins.map((q) => q.x), ...m.trees.map((q) => q.x)]; if (Math.min(...xs.map((q) => Math.abs(q - m.det.x))) > W * 0.04) far++; }
  ok(far >= 36, "détail dégagé (" + far + "/40)");
  // chaque détail et chaque premier plan se dessine (valeurs finies, plusieurs phases)
  const byKind = {}; // un Âge pour chaque premier plan (graines au hasard, contenus qui les permettent tous)
  for (let i = 0; i < 600 && Object.keys(byKind).length < 9; i++) { const m = mk(i % 2 ? { water: true, trees: 3, ruins: ["door"], fog: true } : { ice: true, ruins: ["door"] }, i * 7 + 1); byKind[m.fg.kind] = byKind[m.fg.kind] || i; }
  ok(Object.keys(byKind).length === 9, "neuf premiers plans possibles : " + Object.keys(byKind));
  for (const kind of ["pylon", "ring", "stair", "dish", "piers"]) for (const [fk, i] of Object.entries(byKind)) for (const side of [-1, 1]) {
    const m = mk(i % 2 ? { water: true, trees: 3, ruins: ["door"], fog: true } : { ice: true, ruins: ["door"] }, i * 7 + 1); m.det.kind = kind; m.fg.side = side;
    for (const t of [0, 0.4, 0.8]) ok(rec(m, t).length > 100, "dessine " + kind + "/" + fk);
  }
  { const m = mk({}); m.det.kind = "ring"; ok(rec(m, 0.5).some((x) => x.startsWith("clip")), "l'anneau est coupé à l'horizon (à demi enfoui)"); m.det.kind = "pylon"; ok(!rec(m, 0.5).some((x) => x.startsWith("clip")), "pas de découpe pour un pylône"); }
}

// ciel étendu : lignes, horloge, scène, peinture
{
  const K = require("../src/sky");
  ok(K.parseSky("day_length: 40\nyear_length: 12").dayLen === 40 && K.parseSky("day_length: 40\nyear_length: 12").yearLen === 12, "parseSky : jour et année");
  ok(K.parseSky("day = 2,5 min").dayLen === 2.5 && K.parseSky("revolution: 7 jours").yearLen === 7, "parseSky : variantes (alias, virgule, unités)");
  ok(Object.keys(K.parseSky("day_length: 0\nday_length: 99999\nyear_length: 0\nyear_length: 4000\nday_length: abc")).length === 0, "parseSky : valeurs hors bornes ou illisibles ignorées");
  ok(K.DAY_RE.test("day_length: 40") && !K.DAY_RE.test("daylight") && K.YEAR_RE.test("year_length: 3") && !K.YEAR_RE.test("year"), "regex de lignes");
  ok(K.clockPhases({}) === null && K.clockPhases(null) === null, "pas de durée : pas d'horloge");
  const T0 = 1700000000000, a0 = K.clockPhases({ dayLen: 40 }, T0), a1 = K.clockPhases({ dayLen: 40 }, T0 + 10 * 60000), a2 = K.clockPhases({ dayLen: 40 }, T0 + 40 * 60000);
  ok(a0.day >= 0 && a0.day < 1 && Math.abs(((a1.day - a0.day + 1) % 1) - 0.25) < 1e-6, "un quart de jour = 10 minutes pour un jour de 40");
  ok(Math.abs(a2.day - a0.day) < 1e-6, "le jour boucle");
  const y = [0, 3, 6, 9, 12].map((d) => K.clockPhases({ dayLen: 60, yearLen: 12 }, T0 + d * 60 * 60000).season);
  ok(y.every((v) => v >= -1 && v <= 1) && new Set(y.map((v) => v.toFixed(2))).size > 2, "la saison varie sur l'année");
  ok(K.clockPhases({ dayLen: 40 }, T0).season === 0, "sans année : pas de saison");
  ok(K.sunColors(["single_sun", "green_sun", "tablet", "red_sun", "blue_sun"]).length === 2 && K.sunColors(["tablet"]).length === 0, "deux couleurs au plus, dans l'ordre");
  ok(K.SKY_BLOCKS.every((b) => b.axis === "cosmological" && b.proseTag && K.SKY_PROSE[b.proseTag.replace(/#/g, "")]), "chaque bloc de ciel a sa phrase");
  ok(K.SKY_RULES.every((r) => K.NOTES[r.note] && ["light", "medium", "strong"].includes(r.severity)), "chaque règle a sa note et une gravité valide");
  ok(new Set(K.SKY_BLOCKS.map((b) => b.id)).size === K.SKY_BLOCKS.length, "identifiants uniques");
  ok(K.SKY_BLOCKS.every((b) => (b.contradictions || []).every((c) => K.SKY_BLOCKS.some((x) => x.id === c.with) || ["starless", "single_sun", "twin_suns"].includes(c.with))), "contradictions : cibles connues");
  // scène
  const sc = G.sceneOf(an(["single_sun", "asteroid_field", "planet_rings", "comet", "green_sun", "red_sun"]), "C");
  ok(sc.belt === "field" && sc.rings && sc.comet && sc.sunHues.length === 2 && sc.extras.length === 0, "sceneOf : corps célestes lus, pas peints en générique");
  ok(G.sceneOf(an(["asteroid_belt"]), "C").belt === "belt" && G.sceneOf(an(["asteroid_belt", "asteroid_field"]), "C").belt === "field", "ceinture / champ (le champ l'emporte)");
  // peinture : tout, à plusieurs heures du jour, saisons et horloges ; les corps célestes ajoutent des éléments
  const rc = (S, t, o) => { const l = []; G.paint(fakeCtx(l), G.build(S, 320, 192), t, o); return l; };
  const none = rc({ ...sc, belt: null, rings: false, comet: false, sunHues: [] }, 0.3, { clock: 10 });
  for (const clock of [0, 10, 37, 41, 95, 130, 5000]) { const all = rc(sc, 0.3, { clock }); ok(all.length >= none.length, "corps célestes à l'horloge " + clock); }
  ok(rc({ ...sc, rings: true, belt: null, comet: false }, 0.3, { clock: 10 }).length > none.length + 10, "planète à anneaux dessinée");
  ok(rc({ ...sc, belt: "belt", rings: false, comet: false }, 0.3, { clock: 10 }).length > none.length + 100, "ceinture : des centaines de rocs");
  ok(rc({ ...sc, belt: "field", rings: false, comet: false }, 0.3, { clock: 10 }).length > none.length + 30, "champ : gros blocs");
  { const fall = rc({ ...sc, belt: "field", rings: false, comet: false }, 0.3, { clock: 41 }), calm = rc({ ...sc, belt: "field", rings: false, comet: false }, 0.3, { clock: 10 }); ok(fall.length > calm.length, "champ : une chute toutes les 40 s"); }
  { const near = rc({ ...sc, comet: true, belt: null, rings: false }, 0.3, { clock: 30 }), far = rc({ ...sc, comet: true, belt: null, rings: false }, 0.3, { clock: 60 }); ok(near.length !== far.length || near.join() !== far.join(), "comète : elle passe, puis disparaît"); }
  const sig3 = (o) => rc(sc, 0.3, o).join("|");
  ok(sig3({ day: 0.1 }) !== sig3({ day: 0.5 }), "l'heure du jour change le ciel");
  ok(sig3({ day: 0.3, season: -1 }) !== sig3({ day: 0.3, season: 1 }), "la saison change la trajectoire du soleil");
  ok(sig3({ day: 0.3, clock: 1 }) !== sig3({ day: 0.3, clock: 2 }), "les astéroïdes dérivent avec l'horloge");
  ok(rc({ ...sc, sunHues: [[150, 255, 150]] }, 0.3, { day: 0.4 }).join() !== rc({ ...sc, sunHues: [] }, 0.3, { day: 0.4 }).join(), "soleil coloré : autre teinte");
  for (let i = 0; i < 40; i++) rc({ ...sc, seed: i * 31 + 5, suns: i % 3, cycle: ["steady", "frozen", "erratic"][i % 3] }, (i % 7) / 7, { day: (i % 11) / 11, season: ((i % 5) - 2) / 2, clock: i * 13.7 });
  ok(true, "40 scènes à jours, saisons et horloges variés : valeurs finies");
}

// dégâts : plan
const p1 = D.plan("Ages/A.md", { damaged: 4, removed: 3 }, 320, 192), p2 = D.plan("Ages/A.md", { damaged: 4, removed: 3 }, 320, 192);
ok(p1.zones.length === 4 && p1.holes.length === 3, "un dégât par page");
ok(JSON.stringify(p1) === JSON.stringify(p2), "plan déterministe");
ok(JSON.stringify(D.plan("Ages/B.md", { damaged: 4, removed: 3 }, 320, 192)) !== JSON.stringify(p1), "plan propre à chaque livre");
ok(D.plan("x", { damaged: 99, removed: 99 }, 320, 192).zones.length === 12 && D.plan("x", { damaged: 99, removed: 99 }, 320, 192).holes.length === 6, "plafonné (12 zones, 6 trous)");
ok(D.plan("x", null, 320, 192).zones.length === 0 && D.plan("x", { damaged: -3 }, 320, 192).zones.length === 0, "rien sans dégât");
ok(new Set(D.plan("x", { damaged: 4 }, 320, 192).zones.map((z) => z.kind)).size === 4, "quatre styles pour quatre pages");
for (const z of p1.zones) ok(z.y >= 0 && z.y + z.h <= 192 + 1e-6, "zone dans l'image");
for (const h of p1.holes) ok(h.x > 0 && h.x < 320 && h.y > 0 && h.y < 192 && h.radii.every((q) => q > 0.2 && q < 1.8), "trou dans l'image, bords sans pointes");

// dégâts : dessin sans erreur, toutes parties
for (const part of [undefined, "zones", "holes"]) { const l = []; D.drawDamage(fakeCtx(l), p1, {}, 240, 144, 320, 192, 1.7, {}, {}, part); ok(l.length > 5, "drawDamage " + part); }
{ const l = []; D.drawDamage(fakeCtx(l), p1, {}, 240, 144, 320, 192, 1.7, null, null); ok(l.length > 5, "sans image figée ni bruit"); }

// fractures ramifiées : bornées, déterministes, croissantes avec la révélation
const c1 = D.branchCracks(rng(5), 320, 192, 12), c2 = D.branchCracks(rng(5), 320, 192, 12);
ok(c1.length === 12 && JSON.stringify(c1) === JSON.stringify(c2), "fractures déterministes");
ok(c1.every((c) => c.length >= 1 && c.reduce((s, b) => s + b.pts.length, 0) <= 70 + c.length * 2), "fractures bornées");
ok(c1.some((c) => c.length > 1), "il y a des ramifications");
const lines = (reveal) => { const l = []; D.drawCracks(fakeCtx(l), c1, 6, reveal, 1); return l.filter((x) => x.startsWith("lineTo")).length; };
ok(lines(0.2) < lines(0.6) && lines(0.6) < lines(1), "plus d'instabilité = fractures plus longues");

// clé de bloc age : window_style / render
ok(M.parseStyle("water\nwindow_style: generative") === "gen" && M.parseStyle("render = gen") === "gen" && M.parseStyle("render: procedural") === "gen", "parseStyle gen");
ok(M.parseStyle("window_style: classic") === "classic" && M.parseStyle("water") === null, "parseStyle classic / absent");
ok(M.STYLE_RE.test("window_style: generative") && !M.STYLE_RE.test("water"), "STYLE_RE");

// mondes-types : un mot impose le décor, et chaque monde se dessine sans erreur
{
  const K = require("../src/sky");
  ok(K.WORLD_IDS.length === 5 && K.WORLD_IDS.every((id) => K.SKY_BLOCKS.some((b) => b.id === id && b.category === "world")), "cinq mondes-types");
  const F = (id) => G.sceneOf(an(["single_sun", id]), "W");
  ok(F("frozen_world").ice && F("frozen_world").world === "frozen" && !F("frozen_world").lava, "frozen_world : glace");
  ok(F("lava_world").lava && F("lava_world").heat && F("lava_world").ash && !F("lava_world").water, "lava_world : lave, chaleur, cendres");
  ok(F("desert_world").sand && F("desert_world").heat && !F("desert_world").water, "desert_world : sable et chaleur");
  ok(F("ocean_world").water && !F("ocean_world").sand, "ocean_world : eau");
  ok(F("jungle_world").trees === 5 && F("jungle_world").fog && F("jungle_world").rain && F("jungle_world").glow, "jungle_world : forêt dense, brume, pluie, lueurs");
  ok(G.sceneOf(an(["single_sun"]), "W").world === null, "sans monde-type : rien d'imposé");
  for (const id of K.WORLD_IDS) for (const t of [0, 0.3, 0.7]) for (const day of [0.05, 0.4, 0.9]) { const log = []; G.paint(fakeCtx(log), G.build(F(id), 320, 192), t, { day }); ok(log.length > 40, id + " se dessine"); }
  const sg = (id) => { const l = []; G.paint(fakeCtx(l), G.build(F(id), 320, 192), 0.3, { day: 0.4 }); return l.join("|"); };
  ok(new Set(K.WORLD_IDS.map(sg)).size === 5, "les cinq mondes ont cinq rendus différents");
}

// quantités (beaucoup / peu / normal) et richesses ↔ cicatrices
{
  const AM = require("../src/amounts"), WT = require("../src/wealth");
  const P = AM.parseAmounts;
  ok(P("many: ruins, trees\nfew: rain") && P("many: ruins, trees\nfew: rain").ruins === 2 && P("many: ruins, trees").trees === 2 && P("few: rain").rain === 0.4, "parseAmounts : many / few");
  ok(P("beaucoup: ruines et arbres").ruins === 2 && P("beaucoup: ruines et arbres").trees === 2 && P("peu: eau; pluie").water === 0.4 && P("peu: eau; pluie").rain === 0.4, "parseAmounts : français, « et », « ; »");
  ok(P("many: ruins\nnormal: ruins").ruins === 1 && P("much: gold").gold === 2, "parseAmounts : normal remet à 1 ; identifiant de bloc");
  ok(P("water\nstone") === null && P("") === null && P(null) === null, "parseAmounts : rien à lire");
  ok(AM.AMOUNT_RE.test("many: gold") && !AM.AMOUNT_RE.test("water") && !AM.AMOUNT_RE.test("manyfold"), "AMOUNT_RE");
  ok(AM.factorOf("door", { ruins: 2 }) === 2 && AM.factorOf("door", { door: 0.4, ruins: 2 }) === 0.4 && AM.factorOf("door", { trees: 2 }) === 1 && AM.factorOf("gold", { riches: 2 }) === 2 && AM.factorOf("gold", null) === 1, "factorOf : bloc, groupe, défaut");
  const blocks = new Map(WT.MATTER_BLOCKS.map((b) => [b.id, b])); blocks.set("door", { id: "door", weight: 0.03, axis: "metaphysical" });
  const mk = (written, geo = 98) => ({ stability: Math.min(95, geo), verdict: "stable", axisStability: { cosmological: 95, geological: geo }, resolved: { matter: { written } } });
  const geo = (written, amt, g0) => AM.applyAmounts(mk(written, g0), amt, blocks).axisStability.geological;
  ok(geo(["gold"], null, 89) === 89 && geo(["stone"], null) === 98, "sans quantité ni cicatrice : rien ne bouge");
  ok(geo(["gold", "scorched_surface"], null, 89) === 92 && geo(["gold", "scorched_surface", "poisoned_air"], null, 89) === 95, "chaque cicatrice rachète 3 points (coût 0,03)");
  ok(geo(["gold", "scorched_surface", "poisoned_air", "barren_soil"], null, 89) === 96 && geo(["gold", "scorched_surface", "poisoned_air", "barren_soil", "bitter_water", "ashen_sky"], null, 89) === 96, "compensation plafonnée à 75 % du coût des richesses");
  ok(geo(["scorched_surface", "poisoned_air"], null, 98) === 98, "cicatrices sans richesse : aucun effet");
  ok(geo(["gold"], { gold: 2 }, 89) === 80 && geo(["gold"], { gold: 0.4 }, 89) === 94, "beaucoup d'or coûte le double, peu d'or 40 %");
  ok(geo(["gold", "scorched_surface", "poisoned_air", "barren_soil"], { gold: 2 }, 89) === 89, "beaucoup d'or : il faut beaucoup plus de cicatrices");
  ok(AM.applyAmounts(mk(["door"], 98), { ruins: 2 }, blocks).axisStability.metaphysical === 97 && AM.applyAmounts(mk(["door"], 98), { ruins: 2 }, blocks).axisStability.geological === 98, "un groupe agit sur l'axe de ses blocs");
  const hi = AM.applyAmounts(mk(["gold", "silver"], 83), null, blocks); ok(hi === undefined || hi.stability <= 95, "analyse valide");
  ok(AM.applyAmounts(null, { gold: 2 }, blocks) === null && AM.applyAmounts({}, { gold: 2 }, blocks) !== undefined, "entrées invalides tolérées");
  ok(AM.applyAmounts(mk(["gold", "scorched_surface"], 89), null, blocks).compensation.relief > 0, "la compensation est exposée");
  ok(WT.MATTER_BLOCKS.length === 12 && WT.MATTER_BLOCKS.every((b) => b.writable && b.axis === "geological" && b.descriptors.length === 3 && b.presence) && WT.SCAR_IDS.every((id) => WT.MATTER_BLOCKS.find((b) => b.id === id).weight === 0) && WT.RICH_IDS.every((id) => WT.MATTER_BLOCKS.find((b) => b.id === id).weight > 0), "douze blocs : richesses payantes, cicatrices gratuites");

  const F = (ids, amt) => { const S = G.sceneOf(an(["single_sun", ...ids]), "Q"); if (amt) S.amt = amt; return S; };
  ok(F(["gold", "silver"]).riches.join() === "gold,silver" && F(["scorched_surface", "ashen_sky"]).scars.join() === "scorched_surface,ashen_sky", "sceneOf : richesses et cicatrices");
  ok(F(["scorched_surface"]).burnt && F(["ashen_sky"]).ash && F(["barren_soil", "great_tree"]).trees === 0 && G.sceneOf(an(["single_sun", "great_tree"]), "Q").trees === 3, "cicatrices : sol brûlé, cendres, sol stérile sans arbres");
  const mdl = (ids, amt, o = {}) => G.build({ ...F(ids, amt), ...o }, 320, 192);
  ok(mdl(["grove"], { trees: 2 }).trees.length === 10 && mdl(["grove"], { trees: 0.4 }).trees.length === 2 && mdl(["grove"]).trees.length === 5 && mdl([], { trees: 2 }).trees.length === 0, "arbres : beaucoup / peu / normal, sans rien inventer");
  ok(mdl(["door", "tablet", "lamp"], { ruins: 2 }).ruins.length === 6 && mdl(["door", "tablet", "lamp"], { ruins: 0.4 }).ruins.length === 1 && mdl(["door", "tablet", "lamp"]).ruins.length === 3, "ruines : beaucoup / peu / normal");
  ok(mdl(["rain"], { rain: 2 }).drops.length > mdl(["rain"]).drops.length && mdl(["rain"], { rain: 0.4 }).drops.length < mdl(["rain"]).drops.length, "pluie : plus ou moins de gouttes");
  ok(mdl([], { stars: 2 }).stars.length > mdl([]).stars.length && mdl([], { clouds: 2 }).clouds.length >= mdl([]).clouds.length && mdl([], { water: 2 }).water.lines.length > mdl([]).water.lines.length, "étoiles, nuages, eau");
  ok(mdl(["gold"], { gold: 2 }).rich[0].pts.length > mdl(["gold"]).rich[0].pts.length && mdl(["gold"]).rich[0].pts.length === 14, "or : plus d'éclats en grande quantité");
  const kinds = [["gold", "silver", "gems", "pearls", "copper", "rare_ore"], WT.SCAR_IDS, ["gold", ...WT.SCAR_IDS], ["water", "bitter_water", "gold"]];
  for (const ids of kinds) for (const day of [0.05, 0.4, 0.9]) for (const amt of [null, { riches: 2, scars: 0.4, fog: 2, glow: 2, wind: 2, moths: 0.4 }]) { const log = []; G.paint(fakeCtx(log), mdl(ids, amt, { fog: true, glow: true, wind: true }), 0.3, { day }); ok(log.length > 30, "richesses / cicatrices se dessinent : " + ids.join()); }
  const sg = (ids) => { const l = []; G.paint(fakeCtx(l), mdl(ids), 0.3, { day: 0.4 }); return l.join("|"); };
  ok(sg(["gold"]) !== sg([]) && sg(["scorched_surface"]) !== sg([]) && sg(["poisoned_air"]) !== sg([]) && sg(["barren_soil"]) !== sg([]) && sg(["hollowed_ground"]) !== sg([]) && sg(["bitter_water", "water"]) !== sg(["water"]), "chaque richesse et cicatrice change le rendu");
  const K = require("../src/sky"); ok(K.parseSky("window_size: large").size === "large" && K.parseSky("window_size = XL").size === "xl" && K.parseSky("window_size: small").size === "normal" && K.parseSky("window_width: 520").size === 520 && K.parseSky("window_width: 520px").size === 520, "parseSky : window_size / window_width");
  ok(K.parseSky("window_width: 100").size === undefined && K.parseSky("window_width: 9999").size === undefined && K.parseSky("window_size: huge").size === undefined, "parseSky : taille hors bornes ou inconnue ignorée");
  ok(K.SIZE_RE.test("window_size: large") && !K.SIZE_RE.test("window") && !K.SIZE_RE.test("water"), "SIZE_RE");
  ok(K.parseSky("day_length: 40\nmany: ruins").amt.ruins === 2 && K.parseSky("day_length: 40").amt === undefined, "parseSky transporte les quantités");
}

// heure D'ni : conversion de l'horloge, comme le KI
{
  const T = require("../src/dnitime"), at = (ms) => T.fromDate(T.REF + ms);
  const z = at(0); ok(z.hahr === 9647 && z.vailee === 1 && z.name === "Leefo" && z.yahr === 1 && z.gahrtahvo === 0 && z.tahvo === 0 && z.gorahn === 0 && z.prorahn === 0, "repère : 21 avril 1991, 16 h 54 UTC = début du hahr 9647");
  ok(at(T.MS_PER_HAHR).hahr === 9648 && at(T.MS_PER_HAHR - 1).hahr === 9647 && at(T.MS_PER_HAHR).vailee === 1 && at(T.MS_PER_HAHR - 1).vailee === 10, "un hahr = 31 556 925 216 ms ; le mois 10 finit l'année");
  const yahrMs = T.MS_PER_HAHR / 290; ok(at(yahrMs * 1.001).yahr === 2 && at(yahrMs * 29.001).vailee === 2 && at(yahrMs * 29.001).yahr === 1, "un yahr ≈ 30 h 14 min ; 29 yahr = un mois");
  const gMs = yahrMs / 5; ok(at(gMs * 1.001).gahrtahvo === 1 && at(gMs * 4.001).gahrtahvo === 4 && Math.abs(gMs / 60000 - 362.9) < 1, "5 gahrtahvo par yahr, ≈ 6 h 3 min");
  ok(Math.abs(T.MS_PER_HAHR / T.PRO_PER_HAHR - 1392.8) < 0.5 && T.PRO_PER_HAHR === 22656250, "un prorahn ≈ 1,39 s");
  for (const ms of [-9e11, -1, 0, 1, 1e9, 1.1e12, 1.8e12, 4e12]) { const d = at(ms); ok(d.vailee >= 1 && d.vailee <= 10 && d.yahr >= 1 && d.yahr <= 29 && d.gahrtahvo >= 0 && d.gahrtahvo <= 4 && d.tahvo >= 0 && d.tahvo <= 24 && d.gorahn >= 0 && d.gorahn <= 24 && d.prorahn >= 0 && d.prorahn <= 24 && Number.isInteger(d.hahr), "champs dans leurs bornes : " + ms); }
  ok(T.fromDate(new Date(Date.UTC(2026, 9, 7, 17, 0, 0))).hahr === 9682 && /^\d+ · Leef?[a-z]+ \d+ · \d:\d+:\d+:\d+$/.test(T.format(T.fromDate(new Date(Date.UTC(2026, 9, 7, 17, 0, 0))))), "octobre 2026 : hahr 9682, lecture simple");
  const ph = T.dayPhase(T.REF); ok(ph === 0 && T.dayPhase(T.REF + yahrMs * 0.5) > 0.49 && T.dayPhase(T.REF + yahrMs * 0.5) < 0.51 && T.dayPhase(T.REF + yahrMs * 0.999) < 1, "phase du jour D'ni : 0 → 1 sur un yahr");
  ok(T.VAILEE.length === 10 && new Set(T.VAILEE).size === 10, "dix mois");
}

// rivage (1.16.1) : eau + terre → une rive, dont la nature suit ce qui est écrit ; les mondes-types gardent leur décor
{
  const sh = (ids) => G.sceneOf(an(ids), "Rive").shore;
  ok(sh(["water", "sand"]) === "sand" && sh(["water", "lava"]) === "lava" && sh(["water", "ice"]) === "ice" && sh(["water", "stone"]) === "rock" && sh(["water", "door"]) === "rock" && sh(["water", "great_tree"]) === "grass", "nature de la rive");
  ok(sh(["water"]) === null && sh(["sand"]) === null, "eau seule ou terre seule : pas de rivage");
  ok(sh(["ocean_world", "water", "stone"]) === null && sh(["frozen_world", "water", "stone"]) === null, "monde-océan, monde gelé : pas de rivage");
  const modes = new Set(), kinds = ["sand", "lava", "ice", "stone", "great_tree"];
  for (let i = 0; i < 90; i++) {
    const S = G.sceneOf(an(["single_sun", "water", kinds[i % 5], i % 7 === 0 ? "fissure" : "fog"]), "Rive" + i), m = G.build(S, 320, 192);
    ok(m.shore && m.shore.line.length > 10 && m.shore.land.length > 3 && m.shore.wet.length > 3, "rive : ligne et polygones");
    ok(m.shore.line.every(([x, y]) => Number.isFinite(x) && y >= m.hz - 0.01 && y <= 192.01), "ligne d'eau sous l'horizon");
    modes.add(m.shore.mode);
    const m2 = G.build(S, 320, 192); ok(JSON.stringify(m2.shore) === JSON.stringify(m.shore), "rivage déterministe");
    for (const t of [0, 0.4, 0.9]) { const log = []; G.paint(fakeCtx(log), m, t, { day: (i % 10) / 10 }); ok(log.some((l) => l.startsWith("clip")), "eau et terre découpées"); }
  }
  ok(modes.size === 3, "trois cadrages : côté, rive lointaine, rive proche");
  const S0 = G.sceneOf(an(["single_sun", "water", "sand"]), "Rive1"), S1 = { ...S0, shore: null };
  ok(JSON.stringify({ ...G.build(S0, 320, 192), shore: null, S: null }) === JSON.stringify({ ...G.build(S1, 320, 192), shore: null, S: null }), "le rivage ne change rien d'autre dans l'image (graine propre)");
}

// physique visible (1.16.1) : la fenêtre suit le monde calculé quand la couche physique est active
{
  const anP = (ids, w, extra = []) => ({ ...an(ids), physics: { w }, resolved: { lines: [...ids.map((id) => ({ entry: { id } })), ...extra], matter: { written: [], reactions: [] } } });
  const W0 = { P: 1, g: 1, starTemps: [5772], L: 1, a: 1, locked: false, light: 1, Ts: 288 };
  ok(G.sceneOf(an(["single_sun"]), "P").phys === null, "sans physique : rien ne change");
  const red = G.sceneOf(anP(["single_sun"], { ...W0, starTemps: [3000] }), "P"), blue = G.sceneOf(anP(["single_sun"], { ...W0, starTemps: [15000] }), "P");
  ok(red.sunHues[0][0] > red.sunHues[0][2] + 80 && blue.sunHues[0][2] >= blue.sunHues[0][0], "couleur du soleil : naine rouge rougeâtre, étoile chaude bleutée");
  ok(G.sceneOf(anP(["single_sun", "blue_sun"], { ...W0, starTemps: [3000] }), "P").sunHues[0][2] > 200, "une couleur écrite passe avant la température");
  ok(G.sceneOf(anP(["single_sun"], { ...W0, locked: true }), "P").cycle === "frozen", "face figée par la marée : soleil immobile");
  ok(G.sceneOf(anP(["single_sun", "steady_cycle"], { ...W0, locked: true }, [{ entry: { id: "steady_cycle", category: "cycle" }, autoFilled: false }]), "P").cycle !== "frozen", "un cycle écrit passe avant la marée");
  const amp = (g) => { const S = G.sceneOf(anP(["single_sun"], { ...W0, g }), "Relief"); const m = G.build(S, 320, 192); return Math.max(...m.ridges.map((r) => Math.max(...r.xs) - Math.min(...r.xs))); };
  ok(amp(0.3) > amp(1) && amp(1) > amp(3), "relief : plus haut sur un monde léger, plus bas sur un monde lourd");
  const clouds = (P) => { const S = G.sceneOf(anP(["single_sun"], { ...W0, P }), "Air"); const l = []; G.paint(fakeCtx(l), G.build(S, 320, 192), 0.3, { day: 0.35 }); return l.filter((x) => x.startsWith("ellipse")).length; };
  ok(clouds(0.01) < clouds(1), "presque pas d'air : pas de nuages");
  for (const w of [{ ...W0, P: 0 }, { ...W0, P: 300, Ts: 700 }, { ...W0, light: 0.05 }, { ...W0, starTemps: [] }, { ...W0, blackSun: true, starTemps: [1500] }]) { const l = []; G.paint(fakeCtx(l), G.build(G.sceneOf(anP(["single_sun"], w), "Q"), 320, 192), 0.6); ok(l.length > 50, "physique extrême : rendu fini"); }
}

// la nuit propre à chaque Âge (1.16.1) : constellations, nébuleuse ou bande d'étoiles parfois, lunes
{
  const SK = require("../src/sky");
  const night = (o, name = "N") => G.build({ ...G.sceneOf(an(["single_sun"]), name), ...o }, 320, 192).night;
  ok(JSON.stringify(night({}, "Nuit")) === JSON.stringify(night({}, "Nuit")) && JSON.stringify(night({}, "Nuit")) !== JSON.stringify(night({}, "Autre")), "nuit : déterministe, propre à l'Âge");
  let neb = 0, band = 0; for (let i = 0; i < 200; i++) { const nn = night({}, "N" + i); neb += nn.nebula ? 1 : 0; band += nn.band ? 1 : 0; ok(nn.cons.length >= 2 && nn.cons.length <= 4, "deux à quatre constellations"); }
  ok(neb > 40 && neb < 100 && band > 50 && band < 110, `nébuleuses (${neb}) et bandes d'étoiles (${band}) : parfois`);
  ok(night({ moon: true }).moons.length === 1 && night({}).moons.length === 0 && night({ moons: 3 }).moons.length === 3 && night({ moon: true, moons: 0 }).moons.length === 0, "lunes : companion_moon ou moons: N");
  ok(SK.parseSky("moons: 3").moons === 3 && SK.parseSky("lunes: 2").moons === 2 && SK.parseSky("moons: 9").moons === undefined && SK.MOONS_RE.test("moons: 2"), "ligne moons: (0 à 5)");
  const l = []; G.paint(fakeCtx(l), G.build({ ...G.sceneOf(an(["single_sun"]), "N1"), moons: 4 }, 320, 192), 0.3, { day: 0.85 }); ok(l.filter((x) => x.startsWith("arc")).length > 8, "nuit : étoiles des constellations et lunes dessinées");
}

// varech, corail, acide (1.16.1)
{
  const { analyseAgeBase } = require("../src/engine/analysis");
  const a = analyseAgeBase("water\nkelp\ncoral\nacid\nstone\niron", { seed: "Mer" });
  ok(a.resolved.lines.every((l) => !l.unknown) && !a.resolved.matter.written.some((id) => id.startsWith("?")), "kelp, coral, acid : des blocs connus");
  const shown = a.resolved.matter.reactions.map((r) => r.a + ">" + r.shown);
  ok(shown.includes("acid>hollowed_ground") && shown.includes("acid>bitter_water"), "l'acide ronge la pierre et rend l'eau amère : " + shown);
  const S = G.sceneOf(an(["single_sun", "water", "kelp", "coral", "acid", "stone"]), "Mer"), m = G.build(S, 320, 192);
  ok(S.kelp && S.coral && S.acid && m.sea.kelp.length >= 7 && m.sea.coral.length >= 6 && m.sea.acid.length >= 3, "dessin : varech, corail, flaques");
  for (const t of [0, 0.5]) { const l = []; G.paint(fakeCtx(l), m, t, { day: 0.4 }); ok(l.length > 200, "varech, corail, acide : rendu fini"); }
  const P = require("../src/physics"), { hooks } = require("../src/engine/hooks"), skip0 = hooks.skip; hooks.skip = (l) => P.isPhysicsLine(l);
  const dark = analyseAgeBase("starless\nkelp\ncoral", { seed: "K" }), ph = P.physicsOf(dark, "starless\nkelp\ncoral", "K"); hooks.skip = skip0;
  const tn = ph.tensions.map((x) => x.id + ":" + x.ids.join(","));
  ok(tn.some((x) => x.startsWith("sunlight") && x.includes("kelp")) && tn.some((x) => x.startsWith("warmClimate") && x.includes("coral")), "physique : varech et corail demandent lumière (et chaleur pour le corail) : " + tn);
}

console.log(`gen.test.js : ${n} vérifications OK`);
