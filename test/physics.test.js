"use strict";
// Couche physique (prototype, src/physics/) : lois calées, déterminisme, tirage sous contraintes, pistes chiffrées, modes.
const assert = require("assert");
const M = require("../src/physics/model");
const { derive, blockSettings, parsePhysics, solve, PHYS_RE } = require("../src/physics/solve");
const { BLOCKS } = require("../src/physics/blocks");
const { REQUIREMENTS } = require("../src/physics/rules");
const P = require("../src/physics");
const { analyseAgeBase } = require("../src/engine/analysis");
const { SKY_ENTRIES } = require("../src/engine/data/sky");
const { BUILTIN_BLOCKS } = require("../src/engine/registry");

let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; };
const near = (v, lo, hi, msg) => ok(v >= lo && v <= hi, `${msg} : ${v} hors de [${lo}, ${hi}]`);

// ---- 1. calage sur le système solaire ----------------------------------------------------------------
const planet = (q) => derive({ starMasses: [1], S: q.S, M: q.M, cmf: q.cmf, age: 4.5, rotation: q.rot, volatiles: 1, water: q.water, giantDays: 2, giantTides: 0 },
  blockSettings(new Set(["single_sun"])), { albedo: q.A, rotation: q.rot }, new Set());
const earth = planet({ M: 1, cmf: 0.33, S: 1, A: 0.3, rot: 24, water: 1 });
near(earth.Ts, 280, 295, "Terre : température de surface"); near(earth.P, 0.8, 1.2, "Terre : pression");
ok(earth.water === "liquid" && earth.field > 0.5 && earth.volcanism, "Terre : eau liquide, champ magnétique, volcans");
const mars = planet({ M: 0.107, cmf: 0.22, S: 0.43, A: 0.25, rot: 24.6, water: 0.3 });
ok(mars.field === 0 && mars.water === "ice" && mars.P < 0.1 && !mars.volcanism, "Mars : pas de champ, glace, air mince, volcans éteints");
near(mars.Ts, 195, 225, "Mars : température");
const venus = planet({ M: 0.815, cmf: 0.3, S: 1.91, A: 0.77, rot: 5832, water: 0.001 });
ok(venus.field < M.FIELD_SHIELD && venus.P > 20 && venus.Ts > 500 && !venus.tectonics, "Vénus : pas de vrai champ, serre emballée, pas de plaques (pas d’eau)");
const moon = planet({ M: 0.0123, cmf: 0.02, S: 1, A: 0.12, rot: 655, water: 0.01 });
ok(moon.P < 1e-3 && moon.heat < 0.1, "Lune : pas d'air, intérieur froid");

// ---- 2. lois élémentaires ------------------------------------------------------------------------------
near(M.starTemperature(1), 5777, 5779, "Soleil : 5 778 K"); near(M.starLifetime(1), 9.99, 10.01, "Soleil : 10 Ga");
ok([0.2, 0.5, 1, 2, 5].every((m, i, a) => i === 0 || (M.starLuminosity(m) > M.starLuminosity(a[i - 1]) && M.starLifetime(m) < M.starLifetime(a[i - 1]))), "plus lourde = plus lumineuse, vie plus courte");
ok(M.internalHeat(1, 1, 1) > M.internalHeat(1, 1, 4.5) && M.internalHeat(1, 1, 4.5) > M.internalHeat(1, 1, 9), "la chaleur décroît avec l'âge");
ok(M.internalHeat(3, M.planetRadius(3), 4.5) > M.internalHeat(0.3, M.planetRadius(0.3), 4.5), "un grand monde garde sa chaleur");
near(M.internalHeat(1, 1, 4.5), 0.999, 1.001, "Terre : chaleur interne 1");
near(M.boilingPoint(1.013), 373, 373.3, "l'eau bout à 373 K sous 1 atm"); ok(M.boilingPoint(10) > M.boilingPoint(1), "et plus haut sous pression");
near(M.ageForHeatLevel(1, 1, 1), 4.49, 4.51, "inverse de la chaleur : la Terre a 1 à 4,5 Ga");
ok(M.waterState(280, 0.001, 1) !== "liquid", "sous le point triple, l'eau ne coule pas");

// ---- 3. la table des blocs ne parle que de blocs et d'exigences qui existent --------------------------------
const known = new Set([...SKY_ENTRIES.map((e) => e.id), ...BUILTIN_BLOCKS.map((b) => b.id)]);
for (const id of Object.keys(BLOCKS)) ok(known.has(id), `bloc inconnu dans la table physique : ${id}`);
for (const [id, b] of Object.entries(BLOCKS)) for (const [req] of b.needs || []) ok(REQUIREMENTS[req], `exigence inconnue ${req} (bloc ${id})`);

// ---- 4. lignes de valeurs ------------------------------------------------------------------------------------
const lines = parsePhysics("mass: 2\nâge: 500 Ma\nrotation: 3 j\nnoyau: liquide\natmosphère: mince\ninsolation: 0,8\nwater");
ok(lines.params.mass === 2 && Math.abs(lines.params.age - 0.5) < 1e-9 && lines.params.rotation === 72 && lines.params.insolation === 0.8, "lignes : masse, âge (Ma), rotation (jours), virgule");
ok(lines.asserts.includes("core_liquid") && lines.asserts.includes("atmosphere_thin"), "lignes en mots : noyau liquide, air mince");
for (const other of ["water", "seed: 4", "day_length: 40", "normal: water", "fx: tv", "trap book", "link: [[A]]", "many: ruins", "window_size: xl"]) ok(!PHYS_RE.test(other), `ligne d'un autre module prise pour de la physique : ${other}`);

// ---- 5. déterminisme et tirage sous contraintes ---------------------------------------------------------------
const a1 = solve({ ids: ["single_sun", "water"], seed: "Marais" }), a2 = solve({ ids: ["single_sun", "water"], seed: "Marais" });
ok(JSON.stringify(a1.params) === JSON.stringify(a2.params), "même graine, même monde");
ok(JSON.stringify(a1.params) !== JSON.stringify(solve({ ids: ["single_sun", "water"], seed: "Lande" }).params), "autre graine, autre monde");
let held = 0; for (let i = 0; i < 40; i++) if (!solve({ ids: ["lava", "stone"], seed: "V" + i }).tensions.length) held++;
ok(held >= 38, `le tirage trouve presque toujours une physique qui tient la lave (${held}/40)`);
held = 0; for (let i = 0; i < 40; i++) if (!solve({ ids: ["water", "rain", "fern", "grazer"], seed: "W" + i }).tensions.length) held++;
ok(held >= 38, `… et un monde tempéré pour l'eau, la pluie, les fougères et les brouteurs (${held}/40)`);

// ---- 6. tensions et pistes chiffrées --------------------------------------------------------------------------------
const cold = solve({ ids: ["lava", "stone"], src: "mass: 0.2\nage: 9", seed: "X" });
const vt = cold.tensions.find((t) => t.id === "volcanism");
ok(vt && vt.severity === "medium" && vt.axis === "geological", "lave sur un petit monde vieux : tension géologique");
const ageHint = vt.hints.find((h) => h.key === "age");
ok(ageHint && ageHint.value < 9 && ageHint.dir === "down", "piste : un monde plus jeune");
ok(!solve({ ids: ["lava", "stone"], src: `mass: 0.2\nage: ${ageHint.value}`, seed: "X" }).tensions.some((t) => t.id === "volcanism"), "la piste proposée lève bien la tension");
ok(solve({ ids: ["blue_sun", "great_tree"], seed: "B" }).tensions.some((t) => t.id === "oldEnoughComplex"), "soleil bleu + grands arbres : trop jeune pour l'évolution");
ok(!solve({ ids: ["blue_sun", "great_tree", "tablet"], seed: "B" }).tensions.some((t) => t.id === "oldEnoughComplex"), "… sauf si des bâtisseurs les ont apportés");
ok(solve({ ids: ["single_sun", "frozen_cycle"], seed: "F" }).tensions.some((t) => t.id === "lockPlausible"), "face figée autour d'un soleil jaune : peu plausible");
ok(!solve({ ids: ["red_sun", "frozen_cycle"], seed: "F" }).tensions.some((t) => t.id === "lockPlausible"), "… naturel autour d'une naine rouge");

// ---- 7. modes : off / facile / strict ---------------------------------------------------------------------------------
const src = "lava\nstone\nmass: 0.2\nage: 9";
const an = analyseAgeBase(src, { seed: "Cendre", draw: false }), ph = P.physicsOf(an, src, "Cendre");
ok(P.applyPhysics(an, ph, "off") === an, "mode off : l'analyse est rendue telle quelle");
const easy = P.applyPhysics(an, ph, "easy");
ok(easy.stability === an.stability && easy.verdict === an.verdict && easy.physics === ph, "mode facile : la stabilité ne bouge pas, la fiche est jointe");
const strict = P.applyPhysics(an, ph, "strict");
ok(strict.axisStability.geological === an.axisStability.geological - 20 && strict.stability <= an.stability, "mode strict : une tension moyenne coûte 20 points sur son axe");
const dark = analyseAgeBase("starless\ngreat_tree", { seed: "N", draw: false }), darkS = P.applyPhysics(dark, P.physicsOf(dark, "starless\ngreat_tree", "N"), "strict");
ok(darkS.physics.tensions.some((t) => t.id === "sunlight" && !t.counted), "une tension déjà comptée par le moteur ne coûte pas deux fois");

// ---- 8. robustesse : 300 Âges tirés par le moteur, fiche lisible dans les deux langues -------------------------------------
for (let i = 0; i < 300; i++) {
  const s = i % 3 === 0 ? "water" : i % 3 === 1 ? "lava\nstone" : "starless";
  const a = analyseAgeBase(s, { seed: "R" + i }), p = P.physicsOf(a, s, "R" + i);
  for (const lang of ["fr", "en"]) {
    const sh = P.sheet(p, lang), text = JSON.stringify(sh);
    if (/NaN|undefined/.test(text) || sh.rows.length !== 7) assert.fail(`fiche illisible (R${i}, ${lang}) : ${text.slice(0, 300)}`);
  }
  if (!(p.w.Ts > 0 && isFinite(p.w.P))) assert.fail(`monde absurde (R${i})`);
}
n++;

// ---- 9. relecture indépendante (8 oct.) : cas limites et pistes qui tiennent après réécriture ------------------------------
const { plain } = require("../src/physics/text");
ok(solve({ ids: ["starless", "water"], src: "insolation: 0.8", seed: "N" }).w.S === 0, "sans étoile, une insolation écrite ne compte pas");
ok(!solve({ ids: ["starless", "frozen_cycle"], seed: "N" }).w.locked, "sans étoile, pas de face figée");
for (const bad of ["orbit: 0", "radius: 0\nage: 0", "mass: 0\nage: 0\ninsolation: 0", "mass: 1000\nage: 1000\ninsolation: 100000\nstar_mass: 100"]) {
  const r = solve({ ids: ["single_sun", "water"], src: bad, seed: "L" }), txt = JSON.stringify(P.sheet(r, "fr"));
  ok(!/NaN|undefined|∞/.test(txt) && isFinite(r.w.heat) && isFinite(r.w.a), `valeurs extrêmes sans NaN ni infini : ${JSON.stringify(bad)}`);
}
ok(solve({ ids: ["single_sun"], src: "mass: 1000", seed: "L" }).clamped.some((c) => c.key === "mass" && c.to === 20), "une valeur hors plage est ramenée, et signalée");
ok(solve({ ids: ["blue_sun", "fern"], src: "age: 5", seed: "B" }).tensions.some((t) => t.id === "starAlive"), "un monde plus vieux que son étoile : tension");
ok(solve({ ids: ["fern"], src: "age: 0.1", seed: "Y" }).tensions.some((t) => t.id === "oldEnoughSimple"), "des fougères sur un monde de 100 Ma : trop tôt");
ok(plain("fr")(1400) === "1400" && plain("fr")(0.55) === "0,55" && plain("en")(12345) === "12000", "les pistes s'écrivent comme on les relit");
{ // chaque piste, écrite dans le bloc et relue, allège le total des tensions
  const combos = [["lava", "ash"], ["jungle_world"], ["ocean_world"], ["desert_world", "water"], ["frozen_world", "rain"], ["red_sun", "frozen_cycle", "fern"], ["lava_world"],
    ["auroras", "frozen_cycle", "red_sun"], ["scorched_surface", "water"], ["dust_storm", "starless"], ["meltwater"], ["drifter"], ["jungle_world", "planet_rings"], ["frozen_cycle", "single_sun", "water"]];
  let tot = 0, worse = 0;
  for (const ids of combos) for (const src of ["", "mass: 0.3\nage: 9", "orbit: 1", "mass: 3"]) for (const seed of ["A", "B"]) {
    const r = solve({ ids, src, seed });
    for (const t of r.tensions) for (const h of t.hints || []) {
      tot++; const line = `${h.key}: ${plain("fr")(h.value)}`;
      if (solve({ ids, src: src + "\n" + line, seed }).cost >= r.cost - 1e-9) worse++;
    }
  }
  ok(tot > 20 && worse === 0, `${tot} pistes réécrites dans le bloc : ${worse} n'allègent pas le monde`);
}
const { verdictOf } = require("../src/engine/analysis");
ok(verdictOf(74) === "unstable" && P.applyPhysics(an, ph, "strict").verdict === verdictOf(P.applyPhysics(an, ph, "strict").stability), "le verdict strict suit les seuils du moteur");

console.log(`physics.test.js : ${n} vérifications, tout passe`);
