"use strict";
// Météo vivante : lignes `rain: sometimes, dawn`, tirage reproductible (graine de l'Âge + jour + moment), nouveaux blocs.
const assert = require("assert");
const WX = require("../src/weather"), DT = require("../src/dnitime"), G = require("../src/genscene");
const { hooks } = require("../src/engine/hooks");
const { analyseAgeBase } = require("../src/engine/analysis");
const { describeAge } = require("../src/engine/prose");
const { glyphShapes, glyphSvg } = require("../src/engine/glyphs");
const { blockById, writableIds } = require("../src/engine/registry");
const { writtenLines, removeLine } = require("../src/engine/age-text");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- 1. lecture des lignes ------------------------------------------------------------------------------------
const P = (l) => WX.parseLine(l);
ok(P("rain: sometimes, dawn").id === "rain" && P("rain: sometimes, dawn").freq === 0.4 && same(P("rain: sometimes, dawn").slots, ["dawn"]), "rain: sometimes, dawn");
ok(P("rain: always").freq === 1 && P("drizzle: often").freq === 0.7 && P("fog: rarely").freq === 0.15, "always / often / rarely");
ok(P("fog: 1/10").freq === 0.1 && P("fog: 1 / 4").freq === 0.25 && P("snow: 30%").freq === 0.3 && P("snow: 30 %").freq === 0.3, "fraction et pourcentage");
ok(P("fog: 1/10").slots === null, "sans moment : à toute heure");
ok(same(P("drizzle: often, dusk, dawn").slots, ["dawn", "dusk"]), "plusieurs moments, dans l'ordre du jour");
ok(same(P("wind: rarely, at dusk and night").slots, ["dusk", "night"]) && P("rain: at dawn").freq === 1, "petits mots ignorés ; un moment sans fréquence = toujours à ce moment");
ok(same(P("rain: souvent, à l'aube").slots, ["dawn"]) && P("rain: souvent, à l'aube").freq === 0.7 && same(P("pluie: parfois") , null), "alias français (valeurs) ; la clé reste l'identifiant du bloc");
ok(same(P("rain: morning, noon, afternoon, evening, night, sunrise").slots, ["dawn", "morning", "noon", "afternoon", "dusk", "night"]), "les six moments et leurs alias");
ok(P("Rain: Sometimes, DAWN").id === "rain" && P("Rain: Sometimes, DAWN").freq === 0.4, "majuscules");
ok(P("rain: so").freq === 1 && same(P("rain: so").unknown, ["so"]), "ligne en cours de frappe : reste de la pluie");
ok(P("rain: 3/2").freq === 1 && P("rain: 1/0").freq === 1 && P("rain: 150%").freq === 1 && P("rain: often rarely").freq === 0.7, "valeurs impossibles ou en double ignorées");
ok(P("seed: 4") === null && P("link: [[rain]]") === null && P("water: 3") === null && P("stone: sometimes") === null && P("nimbus: often") === null, "seulement les blocs de météo que l'on écrit");
ok(P("storm: often") === null && P("rainbow: rarely, dusk").id === "rainbow" && P("tornado: 1/20").freq === 0.05, "un produit (storm) ne se programme pas ; les nouveaux blocs oui");
ok(WX.normalize("rain: sometimes, dawn") === "rain" && WX.normalize("rain") === "rain" && WX.normalize("water: 3") === "water: 3" && WX.normalize("fx: tv") === "fx: tv", "normalize : la ligne devient son bloc, le reste ne bouge pas");

// programme d'un bloc
ok(WX.parseWeather("rain\nwater") === null, "rien de programmé : null (la fenêtre d'avant)");
ok(WX.parseWeather("rain: always") === null && WX.parseWeather("rain: always, any") === null, "`rain: always` = `rain`");
ok(WX.parseWeather("rain\nrain: sometimes, dawn") === null, "une ligne nue l'emporte : toujours là");
const sch = WX.parseWeather("drizzle: often, dawn\nrain: rarely, night\nrain: 1/2, noon\n# snow: often\nfog");
ok(same(Object.keys(sch).sort(), ["drizzle", "rain"]) && sch.rain.length === 2 && sch.drizzle[0].freq === 0.7, "plusieurs lignes s'additionnent ; commentaires ignorés");

// ---- 2. le moteur : rétrocompatibilité ----------------------------------------------------------------------
const A = (src, seed = "Wx") => analyseAgeBase(src, { seed });
const before = A("single_sun\nrain\nwater"), unknownBefore = A("single_sun\nrain: sometimes, dawn\nwater");
const OLD = ["starless\nrain", "desert_world\nrain\nfog", "frozen_world\nheat", "lava_world\nwater", "fog\nwater", "wind\nrain\nlightning", "single_sun\nrain\nwind\nseed: 3"];
const legacy = new Map(OLD.map((src) => [src, A(src)])); // sans le crochet : le moteur tel qu'il lit ces Âges
ok(unknownBefore.resolved.lines.some((l) => l.unknown), "sans le crochet (moteur d'origine), la ligne serait un symbole inconnu");
hooks.norm = WX.normalize; // ce que fait src/entry.js
try {
  const plain = A("single_sun\nrain\nwater"), timed = A("single_sun\nrain: sometimes, dawn\nwater");
  ok(same(plain, before), "un `rain` nu : exactement comme avant (analyse identique)");
  ok(!timed.resolved.lines.some((l) => l.unknown) && timed.resolved.matter.written.includes("rain"), "`rain: sometimes, dawn` : pas de symbole inconnu, c'est de la pluie");
  ok(timed.stability === plain.stability && same(timed.axisStability, plain.axisStability) && same(timed.resolved.matter, plain.resolved.matter), "même stabilité, mêmes réactions qu'un `rain` nu");
  ok(same(timed.resolved.drawn, plain.resolved.drawn), "même tirage des pages ouvertes");
  ok(describeAge(timed.resolved, { seed: "Wx" }) === describeAge(plain.resolved, { seed: "Wx" }), "même description (pas d'étape 2 ici)");
  const text = "# n\n```age\nsingle_sun\nrain: sometimes, dawn\n```\n";
  ok(writtenLines(text).has("rain"), "la palette du livre voit la pluie écrite");
  ok(removeLine(text, "rain") === "# n\n```age\nsingle_sun\n```\n", "retirer `rain` dans la palette retire la ligne programmée");

  // ---- 3. nouveaux blocs : reconnus, pesés, réagissent, ont un glyphe et une phrase ---------------------------
  const NEW = ["drizzle", "snow", "rainbow", "tornado", "flowers"];
  for (const id of NEW) {
    const a = A("single_sun\n" + id);
    ok(writableIds.has(id) && !a.resolved.lines.some((l) => l.unknown) && a.resolved.matter.written.includes(id), id + " : reconnu (pas un symbole inconnu)");
    const w0 = analyseAgeBase("single_sun\nstone", { seed: "W", draw: false }), w1 = analyseAgeBase("single_sun\nstone\n" + id, { seed: "W", draw: false });
    const lost = Object.keys(w1.axisStability).reduce((s, ax) => s + ((w0.axisStability[ax] ?? 100) - w1.axisStability[ax]), 0);
    ok(lost > 0 && lost <= 6, id + " : pèse un peu sur la stabilité (" + lost + " points)");
    ok(glyphShapes(id).length >= 3 && /<line|<polygon|<polyline/.test(glyphSvg(id, 0, 0, 40)), id + " : glyphe dessiné");
    ok(describeAge(w1.resolved, { seed: "W" }).toLowerCase().includes(blockById.get(id).presence.slice(0, 18)), id + " : phrase de description");
  }
  ok(P("drizzle: often, dawn").id === "drizzle" && !A("single_sun\ndrizzle: often, dawn").resolved.lines.some((l) => l.unknown), "drizzle programmée : reconnue");
  const born = (src) => A(src).resolved.matter.reactions.map((r) => r.result);
  ok(born("fog\nflowers").includes("scented_mist"), "brume + fleurs = brume parfumée");
  ok(born("wind\nflowers").includes("petal_rain"), "vent + fleurs = pluie de pétales");
  ok(born("drizzle\ndeep_cold").includes("glaze"), "bruine + grand froid = verglas");
  ok(born("drizzle\ncrystal").includes("crystal_rain") && born("drizzle\nash").includes("ash_rain") && born("drizzle\nacid").includes("acid_rain"), "pluie de cristal, de cendre, acide");
  ok(born("snow\nheat").includes("meltwater") && born("snow\nlava").includes("steam"), "la neige fond, la lave la fait siffler");
  for (const id of ["scented_mist", "petal_rain", "glaze", "crystal_rain", "ash_rain", "acid_rain"]) {
    ok(blockById.get(id) && !blockById.get(id).writable && glyphShapes(id).length > 0, id + " : produit, glyphe composé de ses parents");
  }
  ok(/scented mist/.test(describeAge(A("single_sun\nfog\nflowers").resolved, { seed: "S" })), "la réaction se raconte");
  ok(A("starless\nrainbow").resolved.triggered.some((t) => t.b === "rainbow" && t.severity === "medium"), "un arc-en-ciel sans soleil : tension");
  ok(A("desert_world\ndrizzle").stability < A("desert_world").stability && A("lava_world\nsnow").resolved.triggered.some((t) => t.b === "snow" && t.severity === "strong"), "mondes-types : bruine au désert, neige sur la lave");
  // ce qui existait ne change pas avec le crochet (la non-régression complète contre l'ancien build : tools/equiv.js)
  for (const src of OLD) ok(same(A(src), legacy.get(src)), "inchangé : " + src.replace(/\n/g, " + "));
  ok(!A("starless\nrain").resolved.triggered.some((t) => t.b === "drizzle" || t.b === "rainbow"), "les règles nouvelles ne touchent que les blocs nouveaux");
} finally { hooks.norm = (line) => line; }

// ---- 4. tirage reproductible --------------------------------------------------------------------------------
const rules = [{ freq: 0.4, slots: ["dawn"] }], key = WX.seedKey("Jardin", "7");
ok(WX.activeIn(key, "rain", rules, 1234, "dawn") === WX.activeIn(key, "rain", rules, 1234, "dawn"), "même Âge, même jour, même moment : même temps");
ok(!WX.activeIn(key, "rain", rules, 1234, "noon") && !WX.activeIn(key, "rain", rules, 1234, "night"), "jamais en dehors des moments écrits");
const days = Array.from({ length: 400 }, (_, d) => WX.activeIn(key, "rain", rules, d, "dawn"));
const rate = days.filter(Boolean).length / days.length;
ok(rate > 0.32 && rate < 0.48, "« sometimes » ≈ 40 % des jours (" + rate.toFixed(2) + ")");
ok(new Set(days.slice(0, 20)).size === 2, "les jours varient");
const other = Array.from({ length: 400 }, (_, d) => WX.activeIn(WX.seedKey("Verger", "7"), "rain", rules, d, "dawn"));
ok(!same(days, other), "un autre Âge, un autre calendrier");
ok(!same(days, Array.from({ length: 400 }, (_, d) => WX.activeIn(WX.seedKey("Jardin", "8"), "rain", rules, d, "dawn"))), "une autre ligne seed:, un autre calendrier");
ok(Array.from({ length: 50 }, (_, d) => WX.activeIn(key, "fog", [{ freq: 1, slots: null }], d, WX.SLOTS[d % 6])).every(Boolean), "always : toujours");
// plus fréquent = les mêmes jours, et d'autres en plus (le dé est le même)
const r1 = Array.from({ length: 300 }, (_, d) => WX.activeIn(key, "rain", [{ freq: 0.15, slots: null }], d, "noon")), r2 = Array.from({ length: 300 }, (_, d) => WX.activeIn(key, "rain", [{ freq: 0.7, slots: null }], d, "noon"));
ok(r1.every((x, i) => !x || r2[i]) && r2.filter(Boolean).length > r1.filter(Boolean).length * 2, "rarely ⊂ often");
ok(same(WX.drawDay(key, { rain: rules, drizzle: [{ freq: 0.7, slots: ["dawn", "dusk"] }] }, 99), WX.drawDay(key, { rain: rules, drizzle: [{ freq: 0.7, slots: ["dawn", "dusk"] }] }, 99)), "drawDay reproductible");
const many = new Set(Array.from({ length: 30 }, (_, d) => JSON.stringify(WX.drawDay(key, { drizzle: [{ freq: 0.5, slots: ["dawn", "dusk", "night"] }] }, d))));
ok(many.size > 3, "d'un jour à l'autre, le temps change (" + many.size + " journées différentes sur 30)");

// moments sur le trajet du soleil : l'aube entoure le lever (phase 0), la nuit suit le coucher (0,7)
ok(WX.slotOf(0) === "dawn" && WX.slotOf(0.97) === "dawn" && WX.slotOf(0.1) === "morning" && WX.slotOf(0.35) === "noon" && WX.slotOf(0.5) === "afternoon" && WX.slotOf(0.68) === "dusk" && WX.slotOf(0.85) === "night", "moments et soleil");
// fondus : la présence varie par petits pas, et vaut 0 ou 1 au cœur d'un moment
const dawnOnly = [{ freq: 1, slots: ["dawn"] }];
let maxStep = 0, prev = null;
for (let i = 0; i <= 2000; i++) { const v = WX.levelAt(key, "rain", dawnOnly, i / 2000, 5, false); ok(v >= 0 && v <= 1, "présence dans [0, 1]"); if (prev != null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; }
ok(maxStep < 0.05, "pas de coupure franche : la météo arrive et s'en va en fondu (pas max " + maxStep.toFixed(3) + ")");
ok(WX.levelAt(key, "rain", dawnOnly, 0, 5, false) === 1 && WX.levelAt(key, "rain", dawnOnly, 0.35, 5, false) === 0, "à l'aube : là ; à midi : partie");
// jours de l'Âge (day_length) : l'aube d'avant minuit appartient au lendemain
const tomorrow = (d) => WX.activeIn(key, "rain", rules, d + 1, "dawn");
for (let d = 0; d < 40; d++) ok((WX.levelAt(key, "rain", rules, 0.97, d, true) > 0.5) === tomorrow(d), "l'aube qui commence avant minuit est celle du lendemain");

// numéro du jour : D'ni par défaut, jour de l'Âge avec day_length
ok(DT.dayNumber(DT.REF) === 0 && DT.dayNumber(DT.REF + DT.MS_PER_HAHR) === 290 && DT.dayNumber(DT.REF + DT.MS_PER_HAHR / 290 + 1000) === 1, "jour D'ni : 290 yahr par hahr");
const T = Date.UTC(2026, 9, 9, 12);
ok(WX.dayOf({}, T).day === DT.dayNumber(T) && !WX.dayOf({}, T).ageDays, "sans day_length : le jour D'ni, le même pour tout le monde");
ok(WX.dayOf({ dayLen: 40 }, T).day === Math.floor(T / 2400000) && WX.dayOf({ dayLen: 40 }, T).ageDays, "avec day_length : le jour de l'Âge");

// ---- 5. la fenêtre ----------------------------------------------------------------------------------------------
function fakeCtx(log) {
  const grad = { addColorStop() {} }, chk = (x) => { if (typeof x === "number") assert(Number.isFinite(x), "valeur non finie : " + x); };
  return new Proxy({}, {
    get: (_, k) => (k === "canvas" ? { width: 320, height: 192 } : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => { a.forEach(chk); log.push(k + ":" + a.map((x) => (typeof x === "number" ? x.toFixed(2) : typeof x === "string" ? x : "")).join(",")); }),
    set: (_, k, v) => { log.push("=" + String(k) + ":" + (typeof v === "number" ? v.toFixed(2) : String(v))); return true; },
  });
}
const an = (written, reactions = [], weather = null, seedLine) => ({ verdict: "stable", stability: 90, weather, resolved: { seed: seedLine, lines: [{ entry: { id: "single_sun" } }], matter: { written, reactions } } });
const sig = (S, t, o = {}) => { const l = []; G.paint(fakeCtx(l), G.build(S, 320, 192), t, o); return l; };
// sans programme : présence 1 pour tout ce qui est écrit (la fenêtre d'avant)
const plainS = G.sceneOf(an(["rain", "fog", "wind"]), "A");
ok(G.WX_FLAGS.every((f) => G.weatherLevels(G.build(plainS, 320, 192), 0.3)[f] === (plainS[f] ? 1 : 0)), "sans ligne programmée : tout ce qui est écrit est là, tout le temps");
// les nouveaux temps : lus, dessinés, à des valeurs finies, de jour comme de nuit
const kinds = [["drizzle"], ["snow"], ["rainbow", "rain"], ["tornado", "wind"], ["flowers"], ["fog", "flowers", "scented_mist"], ["wind", "flowers", "petal_rain"], ["drizzle", "deep_cold", "glaze"], ["drizzle", "crystal", "crystal_rain"], ["drizzle", "ash", "ash_rain"], ["drizzle", "acid", "acid_rain"]];
const bare = sig(G.sceneOf(an([]), "K"), 0.3).length;
for (const ids of kinds) {
  const S = G.sceneOf(an(ids), "K"); ok(ids.every((id) => G.KNOWN.has(id) || ["crystal", "ash", "acid", "deep_cold"].includes(id)) && !S.extras.some((e) => G.KNOWN.has(e.id)), ids.join("+") + " : connu du peintre (pas de dessin générique)");
  for (const t of [0.02, 0.3, 0.6, 0.9]) ok(sig(S, t).length > 20, "dessine " + ids.join("+") + " à " + t);
  ok(Math.max(...[0.2, 0.3, 0.45].map((t) => sig(S, t).length)) > bare, ids.join("+") + " : ajoute quelque chose à l'image");
}
ok(G.sceneOf(an(["drizzle"]), "K").drizzle && G.sceneOf(an(["snow"]), "K").snow && G.sceneOf(an(["fog", "flowers", "scented_mist"]), "K").scent, "sceneOf lit les nouveaux blocs");
// un Âge programmé : la pluie vient à l'aube (certains jours), part à midi ; un produit suit son parent
const wxRain = { rain: [{ freq: 1, slots: ["dawn"] }] }, S1 = G.sceneOf(an(["rain", "wind"], [{ a: "rain", b: "wind", result: "storm" }], wxRain), "Jardin");
ok(S1.weather === wxRain && S1.wxKey === WX.seedKey("Jardin", undefined), "sceneOf garde le programme et la graine");
const m1 = G.build({ ...S1, storm: true, wxSrc: { ...S1.wxSrc, storm: ["storm"] } }, 320, 192), L0 = G.weatherLevels(m1, 0), Lnoon = G.weatherLevels(m1, 0.35);
ok(L0.rain === 1 && Lnoon.rain === 0 && L0.wind === 1 && Lnoon.wind === 1, "pluie de l'aube : là à l'aube, partie à midi ; le vent (non programmé) reste");
ok(L0.storm === 1 && Lnoon.storm === 0, "l'orage né de la pluie part avec elle");
const S2 = G.sceneOf(an(["drizzle"], [], { drizzle: [{ freq: 0.5, slots: null }] }), "Verger"), m2 = G.build(S2, 320, 192);
const at = (now) => G.weatherLevels(m2, 0.3, { now }).drizzle, D0 = DT.REF + 5000 * (DT.MS_PER_HAHR / 290) + 1000;
ok(at(D0) === at(D0 + 3600000), "même jour D'ni : même temps (pour tout le monde)");
ok(new Set(Array.from({ length: 30 }, (_, k) => at(D0 + k * (DT.MS_PER_HAHR / 290)))).size === 2, "d'un jour D'ni à l'autre, la bruine vient ou non");
ok(sig(S2, 0.3, { now: D0 }).join() === sig(S2, 0.3, { now: D0 }).join(), "dessin reproductible");
const S3 = G.sceneOf(an(["single_sun", "snow"], [], { snow: [{ freq: 1, slots: ["night"] }] }), "Givre");
ok(sig(S3, 0.3).length < sig({ ...S3, weather: null }, 0.3).length, "neige de nuit : pas de neige à midi");
ok(sig(S3, 0.9).length === sig({ ...S3, weather: null }, 0.9).length, "… et la nuit, la neige tombe");

// ---- 6. phrases (étape 2) -----------------------------------------------------------------------------------------
ok(same(WX.sentences({ drizzle: [{ freq: 0.7, slots: ["dawn"] }] }), ["At dawn, more often than not, a fine drizzle falls."]), "« a fine drizzle falls at dawn »");
ok(same(WX.sentences({ rain: [{ freq: 1, slots: ["dusk", "night"] }] }), ["Every day at dusk and at night, rain falls."]) && same(WX.sentences({ fog: [{ freq: 0.1, slots: null }] }), ["Once in a while, fog gathers."]), "toujours / sans moment");
ok(WX.sentences({ nimbus: [{ freq: 0.4, slots: ["noon"] }] })[0] === "At midday, some days, nimbus comes." && WX.sentences(null).length === 0, "bloc de bibliothèque sans phrase ; rien sans programme");
ok(WX.sentences({ rain: Array(9).fill({ freq: 0.4, slots: null }) }).length === 4, "au plus quatre phrases");
hooks.norm = WX.normalize;
try {
  const src = "single_sun\nstone\ndrizzle: often, dawn\nflowers", r = analyseAgeBase(src, { seed: "Jardin" }).resolved, plain = analyseAgeBase(src, { seed: "Jardin" }).resolved;
  r.weather = WX.parseWeather(src); // ce que fait hooks.adjust (src/entry.js)
  const said = describeAge(r, { seed: "Jardin" }), before2 = describeAge(plain, { seed: "Jardin" });
  ok(/At dawn, more often than not, a fine drizzle/.test(said) && said === describeAge(r, { seed: "Jardin" }), "la description dit quand il bruine, toujours pareil");
  const pres = blockById.get("drizzle").presence.toLowerCase();
  ok(!said.toLowerCase().includes(pres) && before2.toLowerCase().includes(pres), "la phrase datée remplace la phrase de présence, pas les deux");
} finally { hooks.norm = (line) => line; }

console.log(`weather : ${n} vérifications, tout passe`);
