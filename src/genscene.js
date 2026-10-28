"use strict";
/**
 * Fenêtre génératrice : un paysage tiré de la graine de l'Âge, au lieu des peintres fixes du moteur.
 * Chaque Âge a sa teinte de ciel, ses crêtes (bruit fractal), ses nuages, ses arbres, placés d'après la graine ;
 * le contenu de l'Âge (soleils, météo, eau, lave, glace, sable, ruines, fissure…) décide de ce qui s'y ajoute.
 *
 *   sceneOf(analysis, name) → descripteur (mêmes notions que le moteur), ou null si l'analyse est inconnue
 *   build(scene, W, H)      → modèle (géométrie tirée une fois)
 *   paint(ctx, model, t)    → dessine l'image à la phase t (0..1, boucle de 8 s)
 */
const { rng, fnv, clamp, lerp, smooth, frac } = require("./util");
const SKY = require("./sky");
const WT = require("./wealth"), AM = require("./amounts"), SEA = require("./sea"), TERRAIN = require("./terrain");
const { crevasse } = require("./crevasse");
const WX = require("./weather");
const WON = require("./genscene-wonders"); /* les merveilles (src/wonders.js) */
const CAT = require("./wonders");
const TOR = require("./torus"); /* le tore : deux Âges qui se portent l'un l'autre */
const SSN = require("./seasons"); /* la saison du jour */

const TAU = Math.PI * 2, PERIOD = 16000; /* ESSAI (28 oct. soir) : la boucle de la fenêtre deux fois plus lente (8 s avant) */

/** Identifiants que le peintre connaît (tout le reste passe par le peintre générique, d'après l'axe et les adjectifs du bloc). */
const KNOWN = new Set((CAT.COMPOSITES.map((c) => c.id).join(" ") + " scorched_moths tarnished_growth " + "door sealed_door bridge fallen_bridge tablet worn_tablet speaking_tablet lamp lit_lamp twin_suns single_sun starless companion_moon steady_cycle frozen_cycle erratic_cycle chaotic_orbit stable_orbit shifting_orbit " +
  "permanent_veil auroras recurring_eclipses starfall rain storm thunderstorm whispering_storm waiting_thunder wind dust_storm ash_cloud spore_cloud fog marsh_mist rime watching_mist lightning heat " +
  "hail black_hail steam lava obsidian whispering_obsidian water brine meltwater crying_obsidian ice black_ice deep_cold sand glass singing_glass fulgurite grove great_tree ironwood charred_grove " +
  "wildfire moth lantern_moths whispering_moths glowvine wrong_glowvine hunter stalking_pack no_fissure cave_fissure submarine_fissure fissure " +
  "drizzle snow rainbow tornado flowers grass meadow scented_mist petal_rain glaze crystal_rain ash_rain acid_rain " +SKY.SKY_BLOCKS.map((b) => b.id).join(" ") + " " + WT.RICH_IDS.join(" ") + " " + WT.SCAR_IDS.join(" ") + " " + SEA.IDS.join(" ") + " " + TERRAIN.IDS.join(" ")).split(" "));
const AXES = ["cosmological", "geological", "meteorological", "ecological", "metaphysical"];

/**
 * ESSAI (mise en scène) : le point de liaison. Le monde propose les lieux possibles, la graine choisit ; fixe pour un Âge (même graine, même monde).
 *  plain : de plain-pied (horizon 64–74 %) · low : en contrebas, le ciel prend tout (80–85 %) · high : en surplomb, au bord d'un escarpement (46–56 %)
 *  cover : à couvert, une lisière ou une arche cadre la vue · cave : à l'entrée d'une grotte, on regarde dehors
 */
function viewOf(S, ids, wd) {
  const q = rng((S.seed ^ 0x71e3) >>> 0), has = (...n) => n.some((x) => ids.has(x));
  if (wd === "cavern" || S.torus) return { kind: "plain", hz: 0.7, side: 1 };
  const sea = S.water && S.waterGround !== false && !S.shore;
  const relief = S.terrain === "mountains" || S.terrain === "canyon" || S.terrain === "hills" || has("rifts", "basalt", "granite", "chalk", "karst", "basalt_columns") || S.soil === "stone" || (S.phys && S.phys.g < 0.8);
  const cave = !sea && wd !== "ocean" && (has("cave_fissure", "stone", "mountains", "hollowed_ground", "karst", "chalk", "basalt", "basalt_columns", "granite", "crystal", "iron", "deep_cold") || S.ice || S.lava || S.soil === "stone");
  const cover = S.trees > 0 || S.soil === "forest" || S.ruins.length > 0;
  const slope = !sea && (relief || S.terrain === "hills" || S.alive || S.sand || S.ice);
  /* le lieu est tiré d'abord, sans regarder le monde : une ligne ajoutée qui ne contredit rien ne déplace pas le point de liaison (un Livre descriptif
     peut recevoir des ajouts tant qu'ils ne contredisent pas le texte) ; seul ce qui rend ce lieu impossible le fait changer, pour le plus proche possible */
  const W8 = [["plain", 28], ["low", 18], ["high", 18], ["slope", 10], ["cover", 16], ["cave", 10]], ok = { plain: true, low: true, high: relief, slope, cover, cave };
  let x = q() * 100, want = "plain"; for (const [k, v] of W8) { if (x < v) { want = k; break; } x -= v; }
  const r2 = q(), r3 = q(), r4 = q(), r5 = q(), r6 = q(); /* toujours tirés, dans le même ordre : le reste du lieu ne bouge pas */
  const NEXT = { high: ["slope", "low"], slope: ["high", "plain"], cover: ["plain"], cave: ["cover", "plain"], plain: [], low: [] };
  let kind = ok[want] ? want : (NEXT[want].find((k) => ok[k]) || "plain");
  if (has("cave_fissure") && cave && r6 < 0.55) kind = "cave"; /* la fissure du retour est au fond d'une caverne : on y arrive */
  const span = { low: [0.76, 0.12], high: [0.42, 0.16], cave: [0.55, 0.17], cover: [0.62, 0.14], slope: [0.52, 0.2], plain: [0.6, 0.16] }[kind], hz = span[0] + span[1] * r2; /* des plages larges : deux vues du même genre se ressemblent moins */
  const near = kind === "plain" && !sea && r3 < 0.35 ? (S.trees > 0 ? "trunk" : S.ruins.length ? "column" : "boulder") : null; /* de plain-pied, parfois un élément du monde tout proche */
  void r4; void r5;
  const mat = S.ice || S.world === "frozen" ? "ice" : S.lava ? "lava" : has("basalt", "basalt_columns") ? "basalt" : has("chalk", "karst") ? "chalk" : "rock";
  return { kind, hz, near, side: q() < 0.5 ? -1 : 1, mat, frame: S.trees > 0 || S.soil === "forest" ? "trees" : "arch", pts: Array.from({ length: 24 }, () => q()) };
}
function sceneOf(a, name = "", blocks = null) {
  const res = a && a.resolved; if (!res || !res.lines || !res.matter) return null;
  const ids = new Set();
  for (const l of res.lines) if (l.entry) ids.add(l.entry.id);
  for (const w of res.matter.written || []) ids.add(w);
  for (const x of res.matter.reactions || []) ids.add(x.result);
  const scarLevel = {}; for (const x of res.scars || []) { ids.add(x.id); scarLevel[x.id] = x.level; } // cicatrices gardées du tirage, avec leur intensité
  const r = (...n) => n.some((x) => ids.has(x));
  // météo vivante : quels blocs allument quel temps (une ligne `rain: sometimes, dawn` le fait venir et partir, src/weather.js) ;
  // « * » : allumé par autre chose qu'un bloc (monde-type, physique), donc toujours là
  const wxSrc = {}, rw = (flag, ...n) => { const hit = n.filter((x) => ids.has(x)); if (hit.length) (wxSrc[flag] = wxSrc[flag] || []).push(...hit); return hit.length > 0; };
  const always = (flag, on) => { if (on) (wxSrc[flag] = wxSrc[flag] || []).push("*"); return on; }, or2 = (a, b) => a || b; // or2 : les deux côtés sont déjà évalués (chacun note sa source)
  const wd =r("frozen_world") ? "frozen" : r("lava_world") ? "lava" : r("desert_world") ? "desert" : r("ocean_world") ? "ocean" : r("jungle_world") ? "jungle" : r("cavern_world") ? "cavern" : null; // monde-type : impose son décor
  const ruins = [];
  if (r("door", "sealed_door")) ruins.push("door"); if (r("bridge", "fallen_bridge")) ruins.push("bridge");
  if (r("tablet", "worn_tablet", "speaking_tablet")) ruins.push("tablet"); if (r("lamp", "lit_lamp")) ruins.push("lamp");
  const S = {
    name, seed: fnv(name + "|" + (res.seed != null ? String(res.seed) : "")), cseed: fnv(name + "|" + [...ids].sort().join(",")), /* ESSAI (les Livres descriptifs, loi 17) : le lieu vient du nom (et de la ligne `seed:`), pas de ce qui est écrit ; une ligne ajoutée ne redessine pas le monde */ verdict: a.verdict, unrest: clamp(1 - (a.stability == null ? 100 : a.stability) / 100),
    suns: wd === "cavern" ? 0 : r("twin_suns") ? 2 : r("single_sun") ? 1 : 0, skyStated: r("twin_suns", "single_sun", "starless"), moon: r("companion_moon"),
    cycle: r("frozen_cycle") ? "frozen" : r("erratic_cycle") ? "erratic" : "steady", chaos: r("chaotic_orbit"), veil: r("permanent_veil"),
    auroras: r("auroras"), eclipses: r("recurring_eclipses"), starfall: r("starfall"),
    rain: or2(rw("rain", "rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder"), always("rain", wd === "jungle")), storm: rw("storm", "storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
    wind: rw("wind", "wind", "storm", "thunderstorm", "dust_storm", "ash_cloud", "spore_cloud", "whispering_storm", "waiting_thunder"),
    fog: or2(rw("fog", "fog", "marsh_mist", "rime", "watching_mist", "marsh"), always("fog", wd === "jungle")), lightning: rw("lightning", "lightning", "thunderstorm", "waiting_thunder"), heat: or2(rw("heat", "heat"), always("heat", wd === "lava" || wd === "desert")),
    hail: rw("hail", "hail", "black_hail"), steam: rw("steam", "steam"), dust: rw("dust", "dust_storm"), ash: or2(rw("ash", "ash_cloud", "ashen_sky"), always("ash", wd === "lava")),
    // nouveaux temps (météo vivante) et fleurs
    drizzle: rw("drizzle", "drizzle"), snow: rw("snow", "snow"), rainbow: rw("rainbow", "rainbow"), tornado: rw("tornado", "tornado"), scent: rw("scent", "scented_mist"), petals: rw("petals", "petal_rain"),
    glaze: rw("glaze", "glaze"), crystalRain: rw("crystalRain", "crystal_rain"), ashRain: rw("ashRain", "ash_rain"), acidRain: rw("acidRain", "acid_rain"), grass: r("grass", "meadow"), meadow: r("meadow"), flowers: r("flowers", "scented_mist", "petal_rain"),
    lava: r("lava", "obsidian", "whispering_obsidian") || wd === "lava", water: (r("water", "marsh_mist", "brine", "meltwater", "crying_obsidian", ...TERRAIN.WATER_IDS) || wd === "ocean") && wd !== "lava" && wd !== "desert",
    ice: r("ice", "black_ice", "deep_cold", "hail", "rime") || wd === "frozen", sand: r("sand", "dust_storm", "glass", "singing_glass", "fulgurite") || wd === "desert",
    trees: r("barren_soil") ? 0 : r("grove") || wd === "jungle" ? 5 : r("great_tree", "ironwood", "charred_grove", "crystal_tree") ? 3 : 0, burnt: r("charred_grove", "wildfire", "scorched_surface"), fire: r("wildfire"),
    moths: r("moth", "lantern_moths", "whispering_moths"), glow: r("glowvine", "wrong_glowvine", "glow_algae") || wd === "jungle" || wd === "cavern", eyes: r("hunter", "stalking_pack"), algae: r("glow_algae"),
    ruins, lampLit: r("lit_lamp"), tabletAwake: r("speaking_tablet"),
    world: wd, riches: WT.RICH_IDS.filter((id) => ids.has(id)), scars: WT.SCAR_IDS.filter((id) => ids.has(id)), scarLevel, blight: ids.has("blight"), belt: r("asteroid_field") ? "field" : r("asteroid_belt") ? "belt" : null, rings: r("planet_rings"), comet: r("comet"), remnants: ["pulsar", "neutron_star", "black_hole"].filter((id) => ids.has(id)), sunHues: SKY.sunColors([...ids]), blackDisc: [...ids].find((i) => SKY.HUES[i]) === "black_sun", blackSun: [...ids].find((i) => SKY.HUES[i]) === "black_sun" && !r("twin_suns"),
    extras: [...ids].filter((id) => !KNOWN.has(id) && !id.startsWith("?")).sort().slice(0, 8).map((id) => {
      const b = blocks && typeof blocks.get === "function" ? blocks.get(id) : null, ax = b && typeof b.axis === "string" ? b.axis.toLowerCase() : "";
      return { id, axis: AXES.find((x) => ax.startsWith(x.slice(0, 5))) || AXES[fnv(id) % 5], words: b && Array.isArray(b.descriptors) && b.descriptors.length ? b.descriptors.map(String) : id.split("_") };
    }),
    fissure: r("no_fissure") ? null : r("cave_fissure") ? "cave" : r("submarine_fissure", "fissure") ? (r("water") ? "submarine" : "open") : null,
  };
  S.kelp = r("kelp"); S.coral = r("coral"); S.acid = r("acid");
  S.terrain = ["mountains", "canyon", "plains", "hills"].find((id) => r(id)) || null; // relief écrit : règle les chaînes de la fenêtre (src/terrain.js)
  S.shore = shoreOf(S, r, wd);
  S.waterGround = waterGroundOf(S, ids, wd); /* l'eau ne fait le sol que si elle domine (loi 10, Mesure) */
  S.soil = soilOf(S, ids, wd);
  S.columns = ids.has("basalt_columns");
  S.age = a.physics && a.physics.w && Number.isFinite(a.physics.w.age) ? a.physics.w.age : null;
  S.primevalCand = ["mycelium", "spore", "mushroom", "pale_fungus", "moss", "lichen", "spore_cloud"].some((id) => ids.has(id));
  S.alive = ["fern", "grass", "flowers", "vine", "seed", "moss", "lichen", "spore", "mycelium", "kelp", "coral", "glow_algae", "berry_shrub", "heath_shrub", "thorn_bush", "sapling", "microbial_mat", "pale_fungus", "mushroom", "meadow", "plankton", "cinderbloom"].some((id) => ids.has(id)); /* un monde vivant montre sa flore basse */
  S.primeval = S.alive && S.primevalCand && S.age != null && S.age < 1.1 && !S.sand && !S.ice && !S.lava && !(S.water && S.waterGround !== false && !S.shore); /* (loi 12) trop jeune pour des arbres, assez vieux pour des champignons géants */
  S.tense = {}; { const SEV = { light: 0.35, medium: 0.6, strong: 0.85 }; for (const tn of (a.physics && a.physics.tensions) || []) for (const id of tn.ids || []) S.tense[id] = Math.max(S.tense[id] || 0, SEV[tn.severity] || 0.5); } /* (lois 3 et 4, généralisé) ce que la physique refuse est écrit, donc là, mais mal tiré, selon la gravité */
  if (S.age != null && S.age < 1) for (const id of ["grazer", "herd", "raptor", "deep_hunter", "shoal", "cave_stalker", "burrower", "bee", "spiders", "drifter", "still_drifter", "humming_blooms", "crystal_flower"]) if (ids.has(id)) S.tense[id] = Math.max(S.tense[id] || 0, Math.min(0.85, Math.max(0.35, 1 - S.age))); /* loi 12 : une bête complexe sur un monde de moins d'un milliard d'années */
  { const tt = Math.max(...["great_tree", "grove", "ironwood", "crystal_tree"].map((id) => S.tense[id] || 0)); if (S.trees && tt > 0 && !S.burnt) S.youngTrees = Math.max(S.youngTrees || 0, tt); } /* un arbre que la physique refuse : malade, comme l'arbre trop tôt */
  if (S.trees && S.age != null && S.age < 1 && !S.burnt) { S.youngTrees = Math.max(0.15, Math.min(1, 1 - S.age)); if (!S.sand && !S.ice && !S.lava) S.primeval = true; } /* (lois 3, 4 et 12) un grand arbre écrit sur un monde trop jeune existe (le Livre décrit), mais malade de sa contradiction (la faute se voit) ; à côté, les Prototaxites que le monde porte vraiment */
  S.lit = S.suns > 0 || !!S.glow; if (!S.lit) S.primeval = false; /* pas de verdure ni de Prototaxites sans soleil ni lueur */
  S.brine = !!S.water && (ids.has("brine") || ids.has("bitter_water") || ids.has("salt")); S.glacial = !!S.water && (S.ice || ids.has("meltwater") || ids.has("deep_cold") || wd === "frozen") && !S.lava && !S.heat && wd !== "lava"; /* la chimie de l'eau ; pas de glaçons dans une eau chaude */
  if (S.water && S.waterGround === false) { S.shore = null; S.river = !S.lava && wd !== "lava"; } /* l'eau en trait est une rivière, pas une mer */
  S.garden = r("garden"); S.lake = r("lake") && !S.lava && wd !== "lava" && !(S.water && S.waterGround !== false) && !S.shore; if (S.lake) S.river = false; /* ESSAI : un étang au pied de la vue (le lac), au lieu du ruban de rivière ; un jardin dessiné */
  S.graniteHue = ["grey", "ochre", "pink"][(S.seed >>> 7) % 3]; /* la variété du granite, tirée de la graine */
  S.rock = S.soil === "stone" ? (ids.has("basalt") || ids.has("basalt_columns") ? "basalt" : ids.has("granite") ? "granite" : null) : null; /* un visage pour la pierre, la forêt et le sel (src/dosage.js, BIOMES) */
  const cycleWritten = res.lines.some((l) => l.entry && l.entry.category === "cycle" && !l.autoFilled);
  S.phys = physLook(a.physics && a.physics.w, cycleWritten);
  if (S.phys) {
    if (!S.sunHues.length && S.phys.sunRGB.length) S.sunHues = S.phys.sunRGB; // couleur du soleil : celle de son étoile (une couleur écrite passe avant)
    if (S.phys.locked && !cycleWritten && S.cycle !== "erratic") S.cycle = "frozen"; // face figée par la marée : le soleil ne bouge plus
    if (S.phys.Ts > 318) { S.heat = true; always("heat", true); } // chaleur qui fait trembler l'air
  }
  // météo vivante : sources de chaque temps, parents de chaque produit (un orage né d'une pluie programmée vient et part avec elle), graine du tirage
  // les merveilles : nées d'une union (a.composites) ou écrites (la Brume vivante)
  S.fed = !!(a.life && Array.isArray(a.life.notes) && a.life.notes.some((x) => x.id === "fedPellet")); /* le granulé écrit qui nourrit (loi de la vie) avive les algues lumineuses de l'eau */
  S.wonders = [...new Set([...((a.composites || []).map((c) => c.id)), ...(ids.has("living_mist") ? ["living_mist"] : [])])];
  S.tarnished = ids.has("tarnished_growth") && !S.wonders.includes("drinking_roots"); /* ESSAI : la végétation ternie, le métal qui empoisonne */
  if (S.wonders.includes("drinking_roots")) { const u = (a.composites || []).find((c) => c.id === "drinking_roots"); S.wonderMetal = CAT.metalOf(u, ids); }
  if (S.wonders.includes("orphan_colour")) { S.orphanRGB = S.sunHues[0] || null; S.blackSun = false; S.blackDisc = false; } /* la Couleur orpheline : la couleur reste, le feu s'en va */
  S.wxSrc = wxSrc; S.wxParents = {}; S.wxKey = WX.seedKey(name, res.seed); S.weather = a.weather || null;
  for (const x of res.matter.reactions || []) if (!S.wxParents[x.result]) S.wxParents[x.result] = [x.a, x.b];
  S.seams = ((a.carry && a.carry.fragments) || []).map((f) => ({ what: f.what, from: f.from, contra: !!f.contra })); /* porter : une couture par fragment (src/carry.js) */
  const loops = ((a.carry && a.carry.fragments) || []).filter((f) => f.loop), lp = loops.find((f) => f.what !== "sky") || loops[0];
  if (a.slateAct) { const e = a.slateAct.effect; /* l'ardoise (src/slate.js) : ce qu'ils ont apporté aujourd'hui ; dans le commandement, peint sans réaction */
    if (e === "rain" || e === "steam") S.rain = always("rain", true); if (e === "heat" || e === "steam" || e === "summer") S.heat = always("heat", true); if (e === "steam") S.steam = always("steam", true);
    if (e === "mist") S.fog = always("fog", true); if (e === "summer") S.petals = always("petals", true); if (e === "night" || e === "longnight") S.forceNight = e === "longnight" ? 2 : 1; }
  S.season = SSN.lookOf(a.physics && a.physics.w, a.seasonU); /* la saison du jour (src/seasons.js) : null sans saisons marquées, ou sans jour fourni */
  S.loop = !!(a.carry && a.carry.loop); /* la boucle de Torus : deux Âges qui se portent l'un l'autre forment un monde en anneau (src/torus.js) */
  if (S.loop) { S.loopFam = lp && lp.what !== "sky" ? lp.what : "stone"; S.loopKey = String(name) + "|" + String((lp && lp.from) || ""); S.torus = TOR.formOf(S.loopKey); }
  S.view = viewOf(S, ids, wd); /* ESSAI : le point de liaison, d'où l'on regarde */
  { const fq = rng((S.seed ^ 0xface5) >>> 0), x = fq(); S.view.face = x < 0.45 ? "eq" : x < 0.65 ? "pole" : x < 0.83 ? "east" : "west"; S.view.lat = fq(); S.view.fx = fq(); } /* ESSAI : vers où regarde le point de liaison (l'équateur, le pôle, le levant, le couchant), et à quelle latitude */
  return S;
}

// ---- météo vivante : ce qui est là, à cet instant du jour --------------------------------------------------
const WX_FLAGS = ["rain", "storm", "wind", "fog", "lightning", "heat", "hail", "steam", "dust", "ash", "drizzle", "snow", "rainbow", "tornado", "scent", "petals", "glaze", "crystalRain", "ashRain", "acidRain"];
/**
 * Présence (0 à 1) de chaque temps à la phase `td` du jour (celle du soleil de la fenêtre). Sans ligne programmée
 * (`rain: sometimes, dawn`), tout ce qui est écrit vaut 1 : la fenêtre est celle d'avant. Un produit de réaction est là
 * quand ses deux parents le sont (un orage né d'une pluie du soir ne gronde que le soir). `o.now` : l'instant du tirage du jour.
 */
function weatherLevels(m, td, o = {}) {
  const S = m.S, sched = S.weather, out = {};
  if (!sched) { for (const f of WX_FLAGS) out[f] = S[f] ? 1 : 0; return out; }
  const { day, ageDays } = WX.dayOf(S, o.now != null ? o.now : Date.now()), memo = new Map(), parents = S.wxParents || {};
  if (S.cycle === "frozen") { const fz = rng((S.seed ^ 0x10c4) >>> 0); td = (0.7 * Math.asin(clamp(0.32 + 0.4 * fz()))) / Math.PI; } // le soleil immobile (voir suns) : l'heure aussi
  const idLv = (id, depth) => {
    if (memo.has(id)) return memo.get(id);
    let v = 1;
    if (sched[id]) v = WX.levelAt(S.wxKey || "", id, sched[id], td, day, ageDays);
    else if (parents[id] && depth < 6) v = Math.min(idLv(parents[id][0], depth + 1), idLv(parents[id][1], depth + 1));
    memo.set(id, v); return v;
  };
  for (const f of WX_FLAGS) {
    if (!S[f]) { out[f] = 0; continue; }
    const src = (S.wxSrc && S.wxSrc[f]) || [];
    out[f] = !src.length || src.includes("*") ? 1 : Math.max(...src.map((id) => idLv(id, 0)));
  }
  return out;
}

/** Couleur d'un corps noir (approximation de Tanner Helland), en RGB 0..255. */
function blackbody(T) {
  const t = clamp(T, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332), g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755), b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
/**
 * Ce que la physique du monde change à la fenêtre (quand la couche physique est active) :
 * couleur du soleil (température de l'étoile), taille du disque (rayon de l'étoile et distance), ciel (pression de l'air),
 * relief (gravité), face figée (marée), lumière au sol, chaleur.
 */
function physLook(w, cycleWritten) {
  if (!w || !Number.isFinite(w.P)) return null;
  const temps = (w.starTemps || []).filter(Number.isFinite), brown = !!w.blackSun;
  const T0 = temps[0] || 5772, L = Number.isFinite(w.L) ? w.L : 1, a = Number.isFinite(w.a) && w.a > 0 ? w.a : 1;
  const disc = clamp((Math.sqrt(Math.max(1e-6, L)) / Math.pow(T0 / 5772, 2)) / a, 0.45, 3); // rayon angulaire relatif au Soleil vu de la Terre
  return {
    sunRGB: brown ? [] : temps.slice(0, 2).map(blackbody), disc, P: Math.max(0, w.P), g: Number.isFinite(w.g) ? w.g : 1,
    coriolis: Number.isFinite(w.coriolis) ? w.coriolis : 1, /* ESSAI : Coriolis */ locked: !!w.locked, light: Number.isFinite(w.light) ? w.light : 1, Ts: Number.isFinite(w.Ts) ? w.Ts : 288, cycleWritten: !!cycleWritten, T: brown ? 0 : T0, T2: brown ? 0 : temps[1] || 0,
  };
}

/**
 * Rivage : de l'eau ET de la terre dans le même Âge (hors monde-océan, monde gelé, désert, monde de lave, qui imposent
 * leur décor) → la bande du bas est partagée entre l'eau et une rive. La nature de la rive vient de ce qui est écrit :
 * lave (côte noire qui fume), sable (plage), glace (banquise), pierre ou ruines (rochers), plantes (berge herbeuse).
 */
/** quand le sol n'est ni lave, ni sable, ni glace, ni eau, ni monde-type, la famille de sol la plus écrite (sel, pierre, forêt) le dessine. */
/** l'eau est le sol si l'Age est un monde-ocean, ou si la famille eau est la plus ecrite des familles de sol. */
function waterGroundOf(S, ids, wd) {
  if (!S.water) return false; if (wd === "ocean") return true;
  const { BIOMES } = require("./dosage"), n = (fam) => BIOMES[fam].filter((id) => ids.has(id)).length, w = n("water");
  return ["desert", "ice", "fire", "stone", "forest", "salt"].every((f) => w > n(f) /* l'eau fait le sol seulement si elle domine strictement (loi 10) */);
}
function soilOf(S, ids, wd) {
  if (wd || S.lava || S.sand || S.ice || S.waterGround) return null;
  const { BIOMES } = require("./dosage"); let best = null, n0 = 0;
  for (const fam of ["salt", "chalk", "stone", "earth", "forest"]) { const n = BIOMES[fam].filter((id) => ids.has(id)).length; if (n > n0) { best = fam; n0 = n; } }
  return best;
}
function shoreOf(S, r, wd) {
  if (!S.water || wd === "ocean" || wd === "frozen" || wd === "desert" || wd === "lava") return null;
  if (S.lava) return "lava";
  if (S.sand) return "sand";
  if (S.ice) return "ice";
  if (S.grass) return "grass"; // herbe ou prairie écrite : la rive est d'herbe
  if (r("stone", "iron", "crystal", "obsidian", "salt", "rifts", "geysers", "glass", "strange_stone", "copper", "gold", "silver", "gems") || S.ruins.length) return "rock";
  if (S.trees || S.glow || r("moss", "fern", "grove", "vine", "sapling", "seed", "spore", "lichen", "pale_fungus", "grazer", "burrower")) return "grass";
  if (r(...TERRAIN.WATER_IDS)) return "grass"; // rivière, delta, lac, marais : une berge herbeuse par défaut
  return null;
}

// ---- outils ----------------------------------------------------------------------------------------
function valueNoise(seed) {
  const r = rng(seed), v = Array.from({ length: 256 }, () => r());
  return (x) => { const i = Math.floor(x), f = smooth(x - i); return lerp(v[i & 255], v[(i + 1) & 255], f); };
}
function fbm(n, x, oct = 4) { let a = 0.5, s = 0, t = 0, fr = 1; for (let i = 0; i < oct; i++) { s += a * n(x * fr + i * 17.3); t += a; a *= 0.5; fr *= 2; } return s / t; }
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c, al = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(al).toFixed(3)})`;

// ---- blocs inconnus : teinte, taille, mouvement tirés des adjectifs (petit lexique, sinon hachage du mot) ----------
const LEX = {
  pale: { l: 0.35, s: 0.22 }, white: { l: 0.45, h: 200, s: 0.1 }, clear: { l: 0.3, h: 190 }, bright: { l: 0.35 }, dark: { l: -0.3 }, black: { l: -0.4, s: 0.05 }, deep: { l: -0.2, z: 1.2 }, hollow: { l: -0.15 },
  warm: { h: 28 }, searing: { h: 12, l: 0.1, v: 1.2 }, incandescent: { h: 24, l: 0.15, p: 1 }, cold: { h: 205 }, still: { v: 0.15 }, frozen: { h: 200, v: 0.1 }, wrong: { h: 305, p: 1 }, rich: { h: 44, l: 0.1 },
  green: { h: 120 }, sour: { h: 85 }, red: { h: 0 }, blue: { h: 215 }, golden: { h: 46, l: 0.1 }, silver: { h: 210, l: 0.3, s: 0.05 },
  vast: { z: 1.6 }, immense: { z: 1.8 }, thick: { z: 1.3 }, heavy: { z: 1.2, v: 0.4 }, dense: { z: 1.2 }, giant: { z: 1.7 }, tiny: { z: 0.55 }, thin: { z: 0.7 }, small: { z: 0.6 },
  slow: { v: 0.25 }, patient: { v: 0.25 }, closed: { v: 0.2 }, dull: { v: 0.3 }, swift: { v: 2.2 }, restless: { v: 2 }, humming: { p: 1, v: 1.3 }, listening: { p: 1, v: 0.6 }, sharp: { sp: 1 }, fluid: { v: 1.4 },
};
function traits(words) {
  const t = { h: fnv(words.join(" ")) % 360, s: 0.35 + (fnv(words.join("~")) % 40) / 100, l: 0.5, z: 1, v: 1, p: false, sp: false };
  let hSet = false; for (const w of words) { const x = LEX[String(w).toLowerCase()]; if (!x) continue; if (x.h != null && !hSet) { t.h = x.h; hSet = true; } if (x.s != null) t.s = x.s; t.l += x.l || 0; if (x.z) t.z *= x.z; if (x.v) t.v *= x.v; if (x.p) t.p = true; if (x.sp) t.sp = true; }
  t.l = clamp(t.l, 0.2, 0.9); t.z = clamp(t.z, 0.4, 2.2); t.v = clamp(t.v, 0.1, 2.5); return t;
}

// ---- modèle ----------------------------------------------------------------------------------------
function build(S, W, H) {
  const r = rng(S.seed ^ 0x9e3779b9), hz = H * (S.view ? S.view.hz : 0.7), A = (k) => (S.amt && S.amt[k] != null ? S.amt[k] : 1), nA = (n, k, lo, hi) => Math.round(clamp(n * A(k), lo, hi)); // quantités : beaucoup / peu / normal
  const hue = r() * 360, sat = 0.28 + r() * 0.35, warm = 20 + r() * 40, cool = 190 + r() * 60;
  const SC = S.skyColour || null; /* ESSAI : `sky: red` : la couleur écrite passe avant celle de la marque (les tirages restent les mêmes) */
  const skyHue0 = S.world === "jungle" ? 95 + r() * 40 : S.world === "cavern" ? 215 + r() * 30 : S.lava ? 8 + r() * 20 : S.sand ? 28 + r() * 16 : S.ice ? 200 + r() * 25 : hue, skyHue = SC ? SC.hue : skyHue0, skyS = SC && SC.sat != null ? SC.sat : null;
  const pal = {
    nightTop: hsl(skyHue + 230, 0.45, 0.05), nightHz: hsl(skyHue + 240, 0.35, 0.12),
    dawnTop: hsl(skyHue + 250, 0.4, 0.2), dawnHz: hsl(warm, 0.65, 0.5),
    dayTop: hsl((S.skyStated || r() < 0.7 || SC) ? skyHue : cool, skyS != null ? skyS : sat + 0.1 + (SC ? 0.12 : 0), 0.38 + (SC ? 0.08 + (SC.light || 0) : 0)), dayHz: hsl(skyHue + (r() < 0.5 ? 25 : -25) * (SC ? 0.4 : 1), skyS != null ? skyS : sat * 0.7 + (SC ? 0.1 : 0), 0.72),
    ground: S.lava ? hsl(8, 0.45, 0.07) : S.sand ? hsl(34, 0.35, 0.2) : S.ice ? hsl(205, 0.25, 0.2) : S.waterGround ? hsl(skyHue + 170, 0.25, 0.1) : S.soil === "salt" ? hsl(200, 0.06, 0.8) : S.soil === "chalk" ? hsl(45, 0.14, 0.7) : S.rock === "basalt" ? hsl(220, 0.08, 0.07) : S.rock === "granite" ? (S.graniteHue === "ochre" ? hsl(34, 0.28, 0.3) : S.graniteHue === "pink" ? hsl(10, 0.13, 0.37) : hsl(30, 0.03, 0.3)) : S.soil === "stone" ? hsl(220, 0.07, 0.17) : S.soil === "earth" ? hsl(24, 0.38, 0.13) : S.soil === "forest" ? hsl(95, 0.3, 0.12) : hsl(skyHue + 90, 0.25, 0.09),
    rock: hsl(skyHue + 200, 0.2, 0.07),
  };
  const RL = S.terrain ? TERRAIN.RELIEF[S.terrain] : null; // blocs de terrain : nombre, hauteur et allure des chaînes
  const nCount = RL ? RL.ridges : S.sand ? 2 : S.ice ? 4 : 3 + Math.floor(r() * 2);
  const ridges = Array.from({ length: nCount }, (_, i) => {
    const d = i / Math.max(1, nCount - 1), n = valueNoise((r() * 4294967296) >>> 0), ridged = RL ? RL.ridged : S.ice || (!S.sand && r() < 0.3);
    const amp = (S.sand ? 0.07 : 0.16 + r() * 0.12) * (1 - d * 0.35) * (S.phys ? clamp(Math.pow(S.phys.g, -0.5), 0.6, 1.55) : 1) * (RL ? RL.amp : 1) * (S.view && S.view.kind === "high" ? 0.5 : S.view && S.view.kind === "low" ? 1.1 : 1), freq = (S.sand ? 0.9 : 2.2 + r() * 2) * (1 + d * 0.5), base = hz - H * (0.05 + (1 - d) * 0.07);
    const xs = new Float32Array(Math.ceil(W / 4) + 1);
    for (let k = 0; k < xs.length; k++) {
      const u = k / (xs.length - 1); let v = fbm(n, u * freq * 3 + i * 5, S.ice ? 3 : 4);
      if (ridged) v = 1 - Math.abs(2 * v - 1);
      xs[k] = base - v * amp * H;
    }
    return { xs, d };
  });
  restyleRidges(S, ridges, W, H, hz); /* les crêtes suivent le monde (tirage à part) */
  const cones = [];
  if (S.lava) for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) cones.push({ x: W * (0.15 + 0.7 * r()), h: H * (0.2 + 0.14 * r()), w: W * (0.12 + 0.08 * r()) });
  if (cones.length && S.view && S.view.kind !== "plain") cones[0].x = W * (0.5 - S.view.side * (0.16 + 0.08 * S.view.pts[0])); /* ESSAI : le sujet sur un tiers, à l'opposé du cadre */
  const stars = Array.from({ length: nA(S.skyStated && S.suns === 0 ? 90 : 44, "stars", 6, 240) }, () => ({ x: r() * W, y: r() * hz * 0.85, s: 0.6 + r() * 1.3, p: r() * TAU, k: 1 + Math.floor(r() * 3) }));
  const clouds = Array.from({ length: nA(S.storm ? 7 : S.rain ? 5 : 2 + Math.floor(r() * 3), "clouds", 1, 14) }, () => ({ x: r() * W, y: H * (0.08 + r() * 0.3), w: W * (0.2 + r() * 0.3), h: H * (0.04 + r() * 0.06), sp: 1 + Math.floor(r() * 2), a: 0.1 + r() * 0.2, lump: Array.from({ length: 8 }, () => r()) }));
  const drops = Array.from({ length: nA(S.hail ? 40 : 90, "rain", 16, 280) }, () => ({ x: r() * W, y: r(), v: 1 + Math.floor(r() * 2), l: 0.04 + r() * 0.04 }));
  const motes = Array.from({ length: nA(50, "wind", 12, 150) }, () => ({ x: r() * W, y: r() * H, p: r(), k: 1 + Math.floor(r() * 2) }));
  const treeKind = (r(), treeKindsOf(S)); /* l'espèce selon le monde (loi 7), tirée à part ; le reste de l'image ne bouge pas */
  const nTrees = S.trees ? nA(S.trees, "trees", 1, 10) : 0, trees = Array.from({ length: nTrees }, (_, i) => ({ x: W * (0.06 + 0.88 * ((i + r() * 0.7) / Math.max(1, nTrees))), h: H * (0.2 + r() * 0.14), lean: r() - 0.5, p: r() * TAU }));
  const rf = A("ruins"), kinds = !S.ruins.length ? [] : rf > 1 ? Array.from({ length: Math.min(7, Math.ceil(S.ruins.length * rf)) }, (_, i) => S.ruins[i % S.ruins.length]) : S.ruins.slice(0, Math.max(1, Math.round(S.ruins.length * rf)));
  const ruins = kinds.map((k, i) => ({ k, x: W * (0.2 + 0.6 * ((i + r()) / Math.max(1, kinds.length))) }));
  const eyes = S.eyes ? Array.from({ length: 3 }, () => ({ x: W * (0.1 + 0.8 * r()), y: hz + H * (0.04 + 0.2 * r()), p: r() * TAU })) : [];
  const water = { lines: Array.from({ length: nA(10, "water", 3, 30) }, () => ({ y: hz + H * (0.04 + 0.22 * r()), w: W * (0.06 + 0.12 * r()), p: r() })) };
  const fis = { x: W * (0.2 + 0.6 * r()), pts: Array.from({ length: 7 }, () => r() - 0.5), bubbles: Array.from({ length: 7 }, () => ({ p: r(), dx: (r() - 0.5) * 9 })) };
  const lava = { veins: Array.from({ length: 5 }, () => ({ x: r() * W * 0.3, w: 0.6 + 0.4 * r(), pts: Array.from({ length: 6 }, () => r() - 0.5) })), sparks: Array.from({ length: 14 }, () => ({ x: r() * W, p: r() })) };
  const extras = (S.extras || []).map((e) => {
    const q = rng((fnv(e.id) ^ S.seed) >>> 0), tr = traits(e.words), n = e.axis === "geological" ? 3 + Math.floor(q() * 4) : e.axis === "ecological" ? 5 + Math.floor(q() * 4) : e.axis === "cosmological" ? 1 : 4 + Math.floor(q() * 3);
    return { ...e, tr, items: Array.from({ length: n }, () => ({ x: q() * W, y: q(), w: 0.6 + q() * 0.8, p: q() * TAU, pts: Array.from({ length: 5 }, () => q() - 0.5) })) };
  });
  const q2 = rng((S.seed ^ 0x51ed270b) >>> 0);
  const belt = S.belt === "belt" ? { rocks: Array.from({ length: 260 }, () => ({ u: q2(), off: (q2() + q2() - 1), r: 0.8 + q2() * q2() * 3.2, ph: q2() * TAU, k: 0.8 + q2() * 0.4 })), lift: 0.18 + 0.1 * q2(), tilt: (q2() - 0.5) * 0.25 } : null;
  const field = S.belt === "field" ? { rocks: Array.from({ length: 7 }, () => ({ u: q2(), y: q2(), r: 0.025 + q2() * 0.04, rot: (q2() - 0.5) * 0.5, ph: q2() * TAU, pts: Array.from({ length: 8 }, () => 0.65 + q2() * 0.55) })) } : null;
  const ringsP = S.rings ? { x: W * (0.2 + 0.55 * q2()), y: H * (0.16 + 0.14 * q2()), R: H * (0.09 + 0.06 * q2()), tilt: (q2() - 0.5) * 0.7, hue: q2() * 60 + 20, sat: 0.2 + q2() * 0.3 } : null;
  const cometP = S.comet ? { ph: q2(), y0: 0.12 + 0.25 * q2(), y1: 0.25 + 0.3 * q2(), dir: q2() < 0.5 ? 1 : -1 } : null;
  const q8 = rng((S.seed ^ 0x9e3779b1) >>> 0); // perturbateurs écrits (étape 3) : graine propre, rien d'autre ne bouge dans l'image
  const remn = (S.remnants || []).map((kind, i) => ({ kind, x: W * (0.12 + 0.76 * ((i + q8()) / Math.max(1, S.remnants.length))), y: H * (0.08 + 0.22 * q8()), ph: q8(), spin: 0.5 + q8() * 0.5, tilt: q8() * Math.PI, R: H * (0.025 + 0.015 * q8()) }));
  const fgKind = ["rocks", "branches", "arch"][Math.floor(r() * 3)], fg = { kind: fgKind, side: r() < 0.5 ? -1 : 1, pts: Array.from({ length: 16 }, () => r()), p: r() * TAU };
  Object.assign(fg, buildForeground(S, W, H)); // 1.16.1 : type choisi selon l'Âge, géométrie générée (graine propre : le reste de l'image ne bouge pas)
  // détail « habité » : une structure sans usage évident, posée au point le plus dégagé (loin des ruines et des arbres)
  const taken = [...ruins.map((q) => q.x), ...trees.map((q) => q.x)], cand = Array.from({ length: 8 }, () => W * (0.12 + 0.76 * r()));
  const dx = cand.map((x) => [Math.min(W, ...taken.map((q) => Math.abs(q - x))), x]).sort((a, b) => b[0] - a[0])[0][1];
  const det = { kind: (r(), detKindOf(S)), x: dx, s: 0.8 + r() * 0.5, p: r() * TAU, hue: r() < 0.5 ? 34 : 190 + r() * 60, n: 4 + Math.floor(r() * 4) };
  const q3 = rng((S.seed ^ 0x601d) >>> 0), rich = (S.riches || []).map((id) => { const n = Math.round(clamp(14 * AM.factorOf(id, S.amt), 4, 60)); return { id, col: WT.RICH_COLOR[id] || [255, 215, 120], big: id === "gems" || id === "pearls", pts: Array.from({ length: n }, () => ({ x: q3(), u: q3(), p: q3(), s: 1 + q3() * 1.3 })) }; });
  const scar = { cracks: Array.from({ length: 12 }, () => ({ x: q3(), u: q3(), pts: Array.from({ length: 5 }, () => q3() - 0.5) })), pits: Array.from({ length: 5 }, () => ({ x: q3(), u: 0.15 + 0.8 * q3(), w: 0.6 + q3() * 0.8 })), embers: Array.from({ length: 22 }, () => ({ x: q3(), u: q3(), p: q3() })) };
  const shore = S.shore ? buildShore(S, W, H, hz) : null;
  const night = buildNight(S, W, H, hz);
  const q7 = rng((S.seed ^ 0x5ea) >>> 0);
  const sea = {
    kelp: S.kelp ? Array.from({ length: 7 + Math.floor(q7() * 7) }, () => ({ x: W * q7(), h: 0.45 + 0.5 * q7(), p: q7() * TAU, w: 1.5 + q7() * 2.5, leaves: 4 + Math.floor(q7() * 5) })) : [],
    coral: S.coral ? Array.from({ length: 6 + Math.floor(q7() * 6) }, () => ({ x: W * q7(), u: 0.55 + 0.45 * q7(), s: 0.6 + q7() * 0.9, hue: [340, 15, 30, 290, 190][Math.floor(q7() * 5)], kind: Math.floor(q7() * 3), pts: Array.from({ length: 5 }, () => q7()) })) : [],
    acid: S.acid ? Array.from({ length: 3 + Math.floor(q7() * 3) }, () => ({ x: W * (0.08 + 0.84 * q7()), u: 0.15 + 0.8 * q7(), w: 0.5 + q7() * 0.9, p: q7() })) : [],
  };
  const meadow = S.grass ? buildMeadow(S, W, H, hz) : null; // herbe, prairie : graine propre
  const wx = buildWeather(S, W, H); // météo vivante : graine propre, rien d'autre ne bouge dans l'image
  const front = buildFront(S, W, H, hz); /* ESSAI : l'orage a un côté, l'averse est au loin */
  const pond = S.lake ? buildPond(S, W, H, hz) : null, garden = S.garden ? buildGarden(S, W, H, hz) : null; /* ESSAI : l'étang, le jardin ; graines propres */
  if (shore && shore.mode === "side" && S.fissure === "submarine") { const wx = lerp(shore.x0, shore.x1, 0.5); fis.x = shore.side < 0 ? lerp(wx, W, 0.45) : lerp(0, wx, 0.55); } // la fissure sous l'eau reste dans l'eau
  const cave = S.world === "cavern" ? buildCave(S, W, H, hz) : null; // la voûte : graine propre, les autres mondes ne bougent pas
  const qf = rng((S.seed ^ 0xa16ae) >>> 0), fedGlow = S.fed ? Array.from({ length: 16 }, () => ({ x: W * qf(), y: hz + (H - hz) * (0.08 + 0.8 * qf()), r: H * (0.02 + 0.04 * qf()), p: qf() })) : null; /* graine propre */
  const won = WON.buildWonders(S, W, H, hz); /* les merveilles : graine propre, un Âge sans merveille ne bouge pas */
  return { S, cave, won, fedGlow, ...(won && won.orphan ? { noSun: true } : {}), rich, scar, extras, fg, det, belt, field, ringsP, cometP, remn, W, H, hz, pal, ridges, cones, stars, clouds, drops, motes, treeKind, trees, ruins, eyes, water, fis, lava, shore, night, sea, wx, meadow, front, pond, garden };
}

/**
 * Géométrie des nouveaux temps (bruine, neige, arc-en-ciel, tornade, fleurs, pétales, brume parfumée, pluies étranges),
 * tirée d'une graine propre : un Âge sans ces blocs garde exactement son image. Les vitesses de chute sont entières
 * (en hauteurs d'image par boucle de 8 s) : la boucle de l'animation ne saute pas.
 */
function buildWeather(S, W, H) {
  const q = rng((S.seed ^ 0x3a7e5) >>> 0), out = {};
  if (S.drizzle || S.acidRain || S.crystalRain) out.mist = Array.from({ length: 150 }, () => ({ x: q() * W, y: q(), v: 1 + Math.floor(q() * 2), l: 0.012 + q() * 0.016, a: 0.5 + q() * 0.5 }));
  if (S.snow || S.ashRain || S.season) out.flakes = Array.from({ length: 120 }, () => ({ x: q() * W, y: q(), s: 0.7 + q() * q() * 1.8, p: q(), k: 1 + Math.floor(q() * 2) }));
  if (S.flowers || S.petals || S.scent || S.season) {
    const base = [340, 352, 12, 45, 285, 205][Math.floor(q() * 6)]; out.hue = base;
    out.blooms = Array.from({ length: 110 }, () => ({ x: q() * W, u: q(), h: base + (q() - 0.5) * 50 + (q() < 0.22 ? 160 : 0), s: q(), p: q() * TAU }));
  }
  if (S.petals || S.season) out.petals = Array.from({ length: 46 }, () => ({ x: q(), y: q(), s: 1.6 + q() * 2.2, p: q(), k: 1 + Math.floor(q() * 2), r: q() < 0.5 ? 1 : 2, h: (q() - 0.5) * 30 }));
  if (S.scent || S.glaze) out.motes = Array.from({ length: 30 }, () => ({ x: q(), y: q(), p: q(), s: 0.8 + q() * 1.2 }));
  if (S.rainbow) out.bow = { x: W * (q() < 0.5 ? 0.24 + 0.12 * q() : 0.64 + 0.12 * q()), R: H * (0.5 + 0.14 * q()), drop: H * (0.06 + 0.08 * q()) };
  if (S.tornado) out.twister = { x: W * (0.14 + 0.72 * q()), lean: (q() - 0.5) * 0.12, w: 0.8 + 0.5 * q(), p: q() * TAU, debris: Array.from({ length: 18 }, () => ({ p: q(), r: 0.4 + q(), k: 1 + Math.floor(q() * 2) })) };
  return out;
}

/**
 * ESSAI (la météo dans la mise en scène) : l'orage a un côté. Le temps vient de l'ouest ; selon l'orientation du point de liaison
 * (src/genscene.js, viewOf), le front arrive par la droite (face à l'équateur), par la gauche (face au pôle), passe au-dessus de la tête
 * (face au levant : il vient de dans le dos) ou monte en muraille sur l'horizon (face au couchant). Sans orage, une pluie écrite tombe
 * une fois sur deux au loin : une averse sous un nuage isolé, sur l'horizon. Graine propre : rien d'autre ne bouge dans l'image.
 */
function buildFront(S, W, H, hz) {
  if (!S.storm && !S.rain) return null; if (S.world === "cavern" || S.loop) return null;
  const q = rng((S.seed ^ 0x570f2) >>> 0), face = (S.view && S.view.face) || "eq";
  const lumps = Array.from({ length: 18 }, () => q()), bolts = Array.from({ length: 6 }, () => q());
  if (S.storm) return { mode: face === "pole" ? "left" : face === "east" ? "over" : face === "west" ? "ahead" : "right", lumps, bolts, reach: 0.36 + 0.2 * q(),
    curtains: Array.from({ length: 5 }, () => ({ u: q(), w: 0.03 + 0.06 * q(), a: 0.5 + 0.5 * q(), lean: (q() - 0.5) * 0.06 })) };
  if (q() < 0.5) return null; // la pluie tombe ici (comme avant)
  const n = q() < 0.6 ? 1 : 2, cells = Array.from({ length: n }, (_, i) => ({ x: W * (n === 1 ? 0.2 + 0.6 * q() : i ? 0.6 + 0.25 * q() : 0.15 + 0.25 * q()), w: W * (0.16 + 0.12 * q()), h: H * (0.09 + 0.06 * q()), base: hz - H * (0.17 + 0.08 * q()), lean: (q() - 0.5) * 0.25, lumps: Array.from({ length: 9 }, () => q()) }));
  return { mode: "shower", cells, lumps, bolts };
}

/** ESSAI : l'étang (`lake` sans mer) : une eau ronde au pied de la vue, des nénuphars s'il y a des plantes, des carpes s'il y a des poissons (`shoal`). */
function buildPond(S, W, H, hz) {
  const q = rng((S.seed ^ 0x9011d) >>> 0), D = H - hz, side = S.view && S.view.side ? S.view.side : 1;
  const cx = W * (0.5 + side * (0.08 + 0.14 * q())), cy = hz + D * (0.58 + 0.12 * q()), rx = W * (0.16 + 0.06 * q()), ry = D * (0.11 + 0.035 * q());
  const leafy = S.flowers || S.grass || S.garden || S.alive, fish = (S.extras || []).some((e) => e.id === "shoal");
  const pads = leafy ? Array.from({ length: 6 + Math.floor(q() * 5) }, () => { const a = q() * TAU, d = 0.35 + 0.55 * Math.sqrt(q()); return { u: Math.cos(a) * d, v: Math.sin(a) * d, s: 0.6 + 0.6 * q(), r: q() * TAU, bloom: S.flowers && q() < 0.35, hue: [330, 345, 50, 0][Math.floor(q() * 4)] }; }) : [];
  const koi = fish ? Array.from({ length: 4 + Math.floor(q() * 3) }, () => ({ a: q() * TAU, d: 0.25 + 0.5 * q(), sp: (q() < 0.5 ? -1 : 1) * (1 + Math.floor(q() * 2)), c: [[236, 120, 48], [240, 236, 228], [196, 204, 214], [226, 90, 40]][Math.floor(q() * 4)], spot: q() < 0.6 })) : [];
  return { cx, cy, rx, ry, pads, koi, ph: q() * TAU };
}
/** ESSAI : le jardin (`garden`) : une haie taillée devant l'horizon, percée d'entrées (le labyrinthe), des allées de haie qui viennent vers nous, des massifs de fleurs. */
function buildGarden(S, W, H, hz) {
  const q = rng((S.seed ^ 0x6a2de) >>> 0), D = H - hz, gaps = [];
  for (let i = 0, n = 3 + Math.floor(q() * 3); i < n; i++) gaps.push({ x: W * (0.08 + 0.84 * q()), w: W * (0.02 + 0.02 * q()) });
  const walls = Array.from({ length: 2 + Math.floor(q() * 2) }, () => ({ x: W * (0.1 + 0.8 * q()), lean: (q() - 0.5) * 1.2, len: 0.25 + 0.3 * q() }));
  const beds = Array.from({ length: 3 + Math.floor(q() * 2) }, () => ({ x: W * (0.1 + 0.8 * q()), u: 0.35 + 0.45 * q(), w: 0.6 + 0.6 * q(), hue: [330, 350, 12, 48, 280, 205][Math.floor(q() * 6)], n: 14 + Math.floor(q() * 10), seed: Math.floor(q() * 1e9) }));
  return { y: hz + D * (0.07 + 0.05 * q()), h: H * (0.055 + 0.02 * q()), gaps, walls, beds, D, bumps: Array.from({ length: 64 }, () => q()) };
}

/** L'herbe (`grass`) ou la prairie (`meadow`, plus haute et fleurie) : des brins sur toute la terre, serrés au loin. */
function buildMeadow(S, W, H, hz) {
  const q = rng((S.seed ^ 0x6a55) >>> 0), tall = !!S.meadow;
  const blades = Array.from({ length: tall ? 360 : 240 }, () => ({ x: q() * W, u: q(), h: (tall ? 5 : 3) + q() * (tall ? 7 : 4), p: q() * TAU, dry: q() }));
  blades.sort((a, b) => a.u - b.u); // du fond vers le devant
  const flowers = tall ? Array.from({ length: 70 }, () => ({ x: q() * W, u: q(), hue: [48, 205, 330, 0, 280, 55][Math.floor(q() * 6)], s: q(), p: q() * TAU })) : [];
  return { tall, blades, flowers };
}

/**
 * Géométrie du rivage (graine propre : rien d'autre ne change dans l'image). Trois cadrages :
 *   side : la rive occupe un côté, la ligne d'eau descend de l'horizon vers le bas de l'image ;
 *   far  : l'autre rive, au loin, juste sous l'horizon ; l'eau devant ;
 *   near : on est sur la rive, l'eau s'étend jusqu'à l'horizon.
 * line : points de la ligne d'eau ; land / wet : polygones de la terre et de l'eau.
 */
function buildShore(S, W, H, hz) {
  const q = rng((S.seed ^ 0x5407e) >>> 0), n = valueNoise((q() * 4294967296) >>> 0), D = H - hz, N = 48;
  const pick = q(), mode = pick < 0.55 ? "side" : pick < 0.8 ? "far" : "near", freq = 1.6 + q() * 2.6, wob = 0.6 + q() * 0.8;
  const out = { kind: S.shore, mode, line: [], land: [], wet: [], side: q() < 0.5 ? -1 : 1, x0: W * (0.28 + 0.44 * q()), x1: W * (0.08 + 0.84 * q()), f0: 0 };
  if (mode === "side") {
    for (let k = 0; k <= N; k++) { const u = k / N, w = (fbm(n, u * freq) - 0.5) * W * 0.3 * wob * (0.12 + u); out.line.push([lerp(out.x0, out.x1, Math.pow(u, 0.85)) + w, hz + D * u]); }
    const e = out.side < 0 ? -2 : W + 2, f = out.side < 0 ? W + 2 : -2;
    out.land = [[e, hz], ...out.line, [e, H + 2]]; out.wet = [[f, hz], ...out.line, [f, H + 2]];
  } else {
    out.f0 = mode === "far" ? 0.1 + 0.16 * q() : 0.38 + 0.26 * q();
    for (let k = 0; k <= N; k++) { const u = k / N, v = out.f0 + (fbm(n, u * freq * 1.5) - 0.5) * 0.16 * wob; out.line.push([-2 + (W + 4) * u, hz + D * clamp(v, 0.04, 0.9)]); }
    const top = [[W + 2, hz], [-2, hz]], bottom = [[W + 2, H + 2], [-2, H + 2]];
    if (mode === "far") { out.land = [...out.line, ...top]; out.wet = [...out.line, ...bottom]; } else { out.land = [...out.line, ...bottom]; out.wet = [...out.line, ...top]; }
  }
  // détails tirés une fois : rochers et galets sur la ligne, touffes sur la terre, glaçons, bouffées de vapeur
  out.rocks = Array.from({ length: 9 }, () => ({ k: Math.floor(q() * (N + 1)), s: 0.6 + q() * 0.9, pts: Array.from({ length: 6 }, () => 0.7 + q() * 0.5), dx: (q() - 0.5) * 2 }));
  out.tufts = Array.from({ length: 70 }, () => ({ x: q() * W, u: q(), h: 2 + q() * 4, p: q() * TAU }));
  out.floes = Array.from({ length: 8 }, () => ({ k: Math.floor(q() * (N + 1)), d: 4 + q() * 18, w: 3 + q() * 9, p: q() }));
  out.puffs = Array.from({ length: 7 }, () => ({ k: Math.floor(q() * (N + 1)), p: q() }));
  return out;
}

// ---- la nuit d'un Âge : constellations, parfois une nébuleuse ou une bande d'étoiles, ses lunes ----------------------
function buildNight(S, W, H, hz) {
  const q = rng((S.seed ^ 0x57a5) >>> 0);
  const cons = Array.from({ length: 2 + Math.floor(q() * 3) }, () => {
    const cx = W * (0.1 + 0.8 * q()), cy = hz * (0.08 + 0.45 * q()), R = H * (0.06 + 0.07 * q()), k = 4 + Math.floor(q() * 4);
    const pts = Array.from({ length: k }, () => ({ x: cx + (q() - 0.5) * 2 * R, y: cy + (q() - 0.5) * 1.4 * R, s: 1.4 + q() * 1.3, tw: q() * TAU }));
    pts.sort((a, b) => a.x - b.x); // un tracé qui se lit de gauche à droite
    return { pts, lines: q() < 0.45, tint: q() < 0.3 ? [255, 210, 170] : q() < 0.5 ? [190, 210, 255] : [240, 240, 255] };
  });
  const dark0 = S.suns === 0 && S.world !== "cavern", nebula = q() < (dark0 ? 0.85 : 0.35) ? { x: W * (0.15 + 0.7 * q()), y: hz * (0.15 + 0.4 * q()), R: H * (0.14 + 0.16 * q()), hue: [300, 200, 20, 160, 260][Math.floor(q() * 5)], blobs: Array.from({ length: 7 }, () => ({ dx: (q() - 0.5) * 1.6, dy: (q() - 0.5) * 0.9, r: 0.35 + q() * 0.6 })) } : null;
  const band = q() < (dark0 ? 0.8 : 0.4) ? { a: (q() - 0.5) * 1.2, y: hz * (0.25 + 0.3 * q()), w: H * (0.05 + 0.05 * q()), pts: Array.from({ length: 160 }, () => ({ u: q(), v: (q() + q() + q() - 1.5) / 1.5, b: q() })) } : null;
  const n = S.moons != null ? clamp(Math.round(S.moons), 0, 5) : S.moon ? 1 : 0;
  const moons = Array.from({ length: n }, (_, i) => ({ r: H * (i === 0 ? 0.045 * (S.moonScale || 1) : 0.015 + 0.03 * q()), ph: i === 0 ? 0.28 : q() * 0.8 - 0.4, off: i === 0 ? 0 : q(), sp: i === 0 ? 1 : 0.6 + q() * 1.6, tint: i === 0 ? [207, 214, 226] : [[220, 200, 180], [190, 210, 230], [230, 190, 170], [210, 215, 200]][Math.floor(q() * 4)], fx: 0.15 + 0.7 * q(), fy: 0.15 + 0.3 * q() }));
  return { cons, nebula, band, moons };
}

// ---- premier plan : choisi selon l'Âge, dessiné à partir de la graine ----------------------------------------
/** Poids de chaque premier plan selon ce que contient l'Âge (0 = impossible). « none » : parfois, rien ne cadre la vue. */
/** le détail habité, tiré à part et pondéré ; l'anneau devient rare, et de nouvelles formes s'y ajoutent. */
const DET_W = { ring: 0.45, pylon: 1, stair: 1, dish: 0.6, piers: 1, cairn: 1, dolmen: 1, obelisk: 0.9, cromlech: 0.8, tower: 0.8 };
function detKindOf(S) { const q = rng((S.seed ^ 0xde7a11) >>> 0), tot = Object.values(DET_W).reduce((a, b) => a + b, 0); let x = q() * tot; for (const [k, w] of Object.entries(DET_W)) { if ((x -= w) < 0) return k; } return "pylon"; }
/** le type de nuages d'un Âge : la pluie et l'orage gardent leurs nuages lourds ; sinon cumulus, cirrus, lenticulaires (sur les reliefs), nappes basses, ou ciel nu. */
function cloudStyleOf(S, L) { if (S.storm || S.rain || (L && (L.rain > 0.3 || L.storm > 0.1))) return "cumulus"; const q = rng((S.seed ^ 0xc10d) >>> 0), x = q(); return x < 0.18 ? "none" : x < 0.45 ? "cumulus" : x < 0.65 ? "cirrus" : x < 0.82 ? (S.terrain === "mountains" || S.ice ? "lenticular" : "stratus") : "stratus"; }
/** les crêtes du fond suivent le monde : pitons (craie), tables (basalte), dômes (granite), volcans (lave), pics (glace), collines rondes (terre, forêt), horizon presque plat (sel, mer). */
function ridgeStyleOf(S) { if (S.terrain === "canyon") return "canyon"; const q = rng((S.seed ^ 0x2c0e) >>> 0)(); return S.rock === "basalt" ? "tables" : S.rock === "granite" ? "domes" : S.soil === "chalk" ? "karst" : S.lava ? "volcano" : S.ice || S.world === "frozen" ? "glacier" : S.soil === "earth" || S.soil === "forest" ? "rolling" : S.soil === "salt" ? "flat" : S.soil === "stone" ? (q < 0.34 ? "cuesta" : q < 0.67 ? "buttes" : null) : S.sand || S.world === "desert" ? "erg" : S.water && S.waterGround !== false ? (q < 0.55 ? "coast" : "flat") : null; }
function restyleRidges(S, ridges, W, H, hz) {
  const style = ridgeStyleOf(S); if (!style) return; const q = rng((S.seed ^ 0x51d6e) >>> 0); if (style === "flat" && q() < 0.35) return;
  for (const rg of ridges) { const xs = rg.xs, n = xs.length, lo = Math.max(...xs), hi = Math.min(...xs), amp = Math.max(4, lo - hi), ph = q() * 6;
    if (style === "tables") for (let k = 0; k < n; k++) { const v = (lo - xs[k]) / amp, v2 = v > 0.55 ? 0.85 : v > 0.28 ? 0.48 : 0.12; xs[k] = lo - v2 * amp * 0.95; }
    else if (style === "karst") { const T = Array.from({ length: 7 + Math.floor(q() * 6) }, () => ({ c: q() * n, w: 2 + q() * 4, h: H * (0.08 + 0.13 * q()) * (1 - rg.d * 0.4) })); /* des pitons qui ont leur propre hauteur, même sur une plaine */ for (let k = 0; k < n; k++) { let v = H * 0.015; for (const t of T) { const u = (k - t.c) / t.w; if (Math.abs(u) < 1) v = Math.max(v, t.h * Math.pow(1 - Math.pow(Math.abs(u), 4), 0.5)); } xs[k] = lo - v; } }
    else if (style === "domes") { const D = Array.from({ length: 2 + Math.floor(q() * 2) }, () => ({ c: q() * n, w: n * (0.12 + 0.12 * q()), h: amp * (0.7 + 0.5 * q()) })); for (let k = 0; k < n; k++) { let v = amp * 0.1; for (const t of D) { const u = (k - t.c) / t.w; if (Math.abs(u) < 1) v = Math.max(v, t.h * Math.sqrt(1 - u * u)); } xs[k] = lo - v; } }
    else if (style === "volcano") { const c = q() * n, w = n * (0.18 + 0.1 * q()), h = amp * 1.6; for (let k = 0; k < n; k++) { const u = Math.abs(k - c) / w; let v = amp * 0.3 * (lo - xs[k]) / amp; if (u < 1) v = Math.max(v, h * (1 - u) - (u < 0.08 ? h * 0.06 : 0)); xs[k] = lo - v; } }
    else if (style === "glacier") for (let k = 0; k < n; k++) { const v = (lo - xs[k]) / amp; xs[k] = lo - Math.pow(v, 0.65) * amp * 1.25; }
    else if (style === "rolling") for (let k = 0; k < n; k++) { const v = 0.5 + 0.5 * Math.sin(k * 0.05 + ph) * Math.cos(k * 0.013 + ph * 2); xs[k] = lo - (0.25 + 0.5 * v) * amp * 0.6; }
    else if (style === "flat") for (let k = 0; k < n; k++) xs[k] = lo - (0.06 + 0.06 * Math.sin(k * 0.2 + ph)) * amp * 0.5;
    else if (style === "cuesta") { const P = n / (2 + Math.floor(q() * 2)); for (let k = 0; k < n; k++) { const u = ((k + ph * 10) % P) / P; xs[k] = lo - (u < 0.82 ? u / 0.82 : (1 - u) / 0.18) * H * (0.07 + 0.04 * (1 - rg.d)) - H * 0.01; } } /* cuestas : une pente douce, un escarpement */
    else if (style === "buttes") { const B = Array.from({ length: 3 + Math.floor(q() * 3) }, () => ({ c: q() * n, w: 3 + q() * 6, h: H * (0.05 + 0.07 * q()) * (1 - rg.d * 0.4) })); for (let k = 0; k < n; k++) { let v = H * 0.012; for (const b of B) { const u = Math.abs(k - b.c) / b.w; if (u < 1) v = Math.max(v, u < 0.75 ? b.h : b.h * (1 - (u - 0.75) / 0.25)); } xs[k] = lo - v; } } /* buttes-témoins à sommet plat */
    else if (style === "canyon") { const orig = xs.slice(), w = Math.max(3, Math.round(n / 10)), sm = orig.map((_, k) => { let a = 0, c = 0; for (let j = k - w; j <= k + w; j++) if (j >= 0 && j < n) { a += orig[j]; c++; } return a / c; }), slo = Math.max(...sm), shi = Math.min(...sm), sa = Math.max(1, slo - shi);
      const top = H * (0.08 + 0.06 * (1 - rg.d)) * (0.8 + 0.4 * q()), G = [{ c: q() * n, w: n * (0.1 + 0.1 * q()), d: 1 }, ...Array.from({ length: 1 + Math.floor(q() * 2) }, () => ({ c: q() * n, w: n * (0.02 + 0.03 * q()), d: 0.35 + 0.3 * q() }))];
      for (let k = 0; k < n; k++) { let h = top * (0.55 + 0.6 * (slo - sm[k]) / sa) + (orig[k] - sm[k]) * -0.15; for (const gg of G) { const u = Math.abs(k - gg.c) / gg.w; if (u < 1) h *= 1 - gg.d * (1 - Math.pow(u, 1.6)); } xs[k] = lo - Math.max(0, h); } } /* les parois d'un canyon : un rebord qui ondule lentement, rongé par la gorge et un ou deux ravins (pas une muraille) */
    else if (style === "erg") for (let k = 0; k < n; k++) { const v = Math.pow(Math.abs(Math.sin(k * 0.09 + ph + rg.d)), 0.6); xs[k] = lo - v * H * (0.04 + 0.03 * (1 - rg.d)); } /* une chaîne de grandes dunes */
    else if (style === "coast") { const side = ph > 3 ? 1 : 0; for (let k = 0; k < n; k++) { const f = side ? k / n : 1 - k / n, v = f > 0.55 ? (f - 0.55) / 0.45 : 0; xs[k] = lo - (H * 0.005 + v * H * (0.09 + 0.04 * Math.sin(k * 0.3))); } } /* une côte lointaine d'un seul côté, la mer ouverte de l'autre */
  }
}
/** la teinte du cristal d'un Âge : comme la fleur de cristal de l'atelier (src/relto-flower.js, flowerTone), tirée de la graine. */
/** la roche des rochers du premier plan, selon le sol. */
function rockStyleOf(S) { return S.rock === "basalt" ? "basalt" : S.rock === "granite" ? "granite" : S.soil === "salt" ? "salt" : S.sand || S.world === "desert" ? "sandstone" : S.ice || S.world === "frozen" ? "ice" : S.soil === "forest" || S.soil === "earth" || S.world === "jungle" ? "mossy" : null; }
/** la branche du premier plan suit l'espèce dominante de l'Âge (quand il a des arbres). */
function treeFgStyle(m) { const TK = m.treeKind; if (!m.S.trees || !TK || typeof TK === "string") return null; return { conifer: "needles", ponderosa: "needles", cypress: "needles", ginkgo: "ginkgo", maple: "rust", birch: "leafy", broadleaf: "leafy", willow: "moss", crystaltree: "crystal", mushtree: "cap" }[TK.main] || null; }
function crystalToneOf(S) { const fq = rng((S.seed ^ fnv("crystal-flower")) >>> 0); return { hue: fq() * 360, spread: 22 + fq() * 30, fsat: 0.5 + fq() * 0.3 }; }
/** les espèces d'arbres d'un Âge : une dominante, une secondaire, choisies selon le sol et le climat. */
const TREE_SETS = {
  ice: ["conifer", "conifer", "birch", "ponderosa"], sand: ["umbrella", "frond", "baobab", "spire"], jungle: ["broadleaf", "frond", "willow", "mushtree", "mushtree", "stalktree"],
  forest: ["broadleaf", "birch", "conifer", "maple", "ponderosa", "willow", "cypress", "ginkgo"], stone: ["twisted", "ponderosa", "conifer", "cypress"], water: ["willow", "birch", "frond", "cypress", "maple", "ginkgo", "mushtree", "stalktree"],
  any: ["broadleaf", "conifer", "umbrella", "frond", "birch", "cypress", "twisted", "baobab", "willow", "mushtree", "ponderosa", "maple", "ginkgo", "stalktree"],
};
function treeKindsOf(S) { const q = rng((S.seed ^ 0x7ee5) >>> 0), set = TREE_SETS[S.ice || S.world === "frozen" ? "ice" : S.sand || S.world === "desert" ? "sand" : S.world === "jungle" ? "jungle" : S.soil === "forest" || S.soil === "earth" ? "forest" : S.soil === "stone" || S.rock ? "stone" : S.water || S.river ? "water" : "any"], pick = () => set[Math.floor(q() * set.length)];
  const fungi = (S.extras || []).some((e) => ["mushroom", "mycelium", "pale_fungus", "glowing_mushroom", "singing_mushroom"].includes(e.id)); /* des champignons écrits : les arbres-champignons y poussent */
  const HOT = ["frond", "baobab", "umbrella"], WET = ["willow", "birch", "maple", "ginkgo", "broadleaf", "cypress"], cold = S.ice || S.world === "frozen", dry = S.sand || S.world === "desert", anyOk = TREE_SETS.any.filter((k) => !(cold && HOT.includes(k)) && !(dry && WET.includes(k))); /* le tirage libre reste dans le climat (loi 7) */
  let a = q() < 0.2 ? anyOk[Math.floor(q() * anyOk.length)] : pick(); let b = pick(); if (b === a) b = pick(); if (fungi && q() < 0.65) { b = a; a = "mushtree"; } const crys = (S.extras || []).some((e) => e.id === "crystal_tree") && !(S.age != null && S.age < 1); if (crys) { /* pas d'arbre de cristal sur un monde trop jeune pour les arbres (loi 12) */ b = q() < 0.5 ? a : "crystaltree"; a = "crystaltree"; } /* la réaction grand arbre + cristal : des arbres de cristal (et seulement alors) */ return { main: a, second: q() < 0.65 ? b : a }; }
function foregroundWeights(S) {
  const wet = S.water || !!S.shore, green = S.trees > 0 || S.world === "jungle" || S.glow, dry = S.sand || S.lava || S.world === "desert" || S.world === "lava", ruins = S.ruins.length > 0;
  return {
    none: 0.35, rocks: 1 + (dry ? 1.2 : 0), branches: S.world === "desert" || S.world === "lava" || S.world === "ocean" ? 0.2 : 1 + (green ? 1.4 : 0),
    arch: 0.4 + (ruins ? 0.9 : 0), vines: green || S.fog ? 0.5 + (S.world === "jungle" || S.glow ? 1.4 : 0.5) : 0.15, reeds: wet && !S.ice ? 1.4 : 0,
    leaves: green ? 1 : 0.2, pillar: 0.3 + (ruins ? 0.9 : 0), icicles: S.ice || S.world === "frozen" ? 1.1 : 0, /* ESSAI : moins souvent : les branches enneigées et les rochers ont leur chance */
    tallgrass: S.grass ? (S.meadow ? 3.2 : 2.2) : 0, // en dernier : n'altère pas le tirage des Âges sans herbe
  };
}
function buildForeground(S, W, H) {
  const q = rng((S.seed ^ 0xf06e) >>> 0), wts = foregroundWeights(S), tot = Object.values(wts).reduce((a, b) => a + b, 0);
  let pick = q() * tot, kind = "rocks";
  for (const [k, w] of Object.entries(wts)) { if (pick < w) { kind = k; break; } pick -= w; }
  const out = { kind, side: q() < 0.5 ? -1 : 1, pts: Array.from({ length: 16 }, () => q()), p: q() * TAU };
  if (kind === "branches") {
    // une branche qui pousse depuis un bord : chaque segment se divise en deux ou trois, de plus en plus fins ; style selon l'Âge
    const style = S.burnt ? "charred" : S.ice || S.world === "frozen" ? "snowy" : S.world === "jungle" || S.glow ? "leafy" : S.fog ? "moss" : ["leafy", "needles", "bare", "blossom", "leafy"][Math.floor(q() * 5)];
    const segs = [], fromTop = q() < 0.35, x0 = fromTop ? W * (0.04 + 0.25 * q()) : -4, y0 = fromTop ? -4 : H * (0.02 + 0.3 * q());
    const grow = (x, y, a, len, w, d) => {
      const bend = (q() - 0.5) * 0.6, x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push({ x, y, cx: x + Math.cos(a + bend) * len * 0.55, cy: y + Math.sin(a + bend) * len * 0.55, x2, y2, w, d, tip: d >= 3 });
      if (d >= 3 || len < H * 0.03) { segs[segs.length - 1].tip = true; return; }
      const n = q() < 0.35 ? 3 : 2;
      for (let i = 0; i < n; i++) { const da = (i - (n - 1) / 2) * (0.45 + 0.4 * q()) + (q() - 0.5) * 0.3; grow(x2, y2, a + da + 0.12, len * (0.58 + 0.2 * q()), w * 0.62, d + 1); }
    };
    grow(x0, y0, fromTop ? Math.PI * (0.18 + 0.2 * q()) : Math.PI * (-0.05 + 0.2 * q()), W * (0.16 + 0.1 * q()), Math.max(2.5, H * (0.02 + 0.012 * q())), 0);
    out.branch = { style, segs, hue: [330, 350, 10, 45, 280, 200][Math.floor(q() * 6)], tufts: Array.from({ length: 4 }, () => q()) }; // fleurs : rose, rouge, jaune, mauve, bleu pâle
  } else if (kind === "vines") {
    out.vines = Array.from({ length: 4 + Math.floor(q() * 5) }, () => ({ x: W * (0.02 + 0.3 * q()), len: H * (0.18 + 0.4 * q()), amp: 2 + q() * 6, f: 1 + q() * 2, p: q() * TAU, leaves: Array.from({ length: 5 + Math.floor(q() * 5) }, () => ({ u: q(), s: 2 + q() * 3, a: q() < 0.5 ? -1 : 1 })) }));
  } else if (kind === "reeds") {
    out.reeds = Array.from({ length: 9 + Math.floor(q() * 9) }, () => ({ x: W * (0.01 + 0.3 * q()), h: H * (0.16 + 0.34 * q()), lean: (q() - 0.4) * 0.35, head: q() < 0.45, p: q() * TAU, w: 1 + q() * 1.6 }));
  } else if (kind === "tallgrass") {
    out.grass = Array.from({ length: 26 + Math.floor(q() * 14) }, () => ({ x: W * (0.01 + 0.34 * q()), h: H * (0.12 + 0.3 * q()), lean: (q() - 0.3) * 0.5, p: q() * TAU, w: 0.8 + q() * 1.4, seed: S.meadow && q() < 0.3 }));
  } else if (kind === "leaves") {
    out.leaves = Array.from({ length: 2 + Math.floor(q() * 3) }, () => ({ a: (q() - 0.5) * 1.6, len: H * (0.3 + 0.35 * q()), wd: 0.22 + 0.2 * q(), y: H * (0.55 + 0.45 * q()), p: q() * TAU, notch: q() < 0.4 }));
  } else if (kind === "pillar") {
    out.pillar = { w: W * (0.05 + 0.04 * q()), x: W * (0.01 + 0.06 * q()), top: H * (0.05 + 0.35 * q()), cut: Array.from({ length: 5 }, () => q()), flutes: 3 + Math.floor(q() * 3), vine: q() < 0.5 };
  } else if (kind === "icicles") {
    out.icicles = Array.from({ length: 14 + Math.floor(q() * 12) }, () => ({ x: q() * W, len: H * (0.03 + 0.2 * Math.pow(q(), 2)), w: 2 + q() * 5, p: q() }));
  }
  return out;
}

// ---- soleils ---------------------------------------------------------------------------------------
/**
 * ESSAI : la course d'un astre dans la fenêtre, selon l'orientation du point de liaison. `p` : le moment de sa journée (visible pour p ≤ 0,7).
 * Vers l'équateur, il passe de gauche à droite en arc ; vers le pôle, de droite à gauche, bas (il passe dans votre dos) ; vers le levant, il monte du bas
 * vers le haut et sort du cadre ; vers le couchant, il descend du haut et se couche en face. La latitude abaisse l'arc et penche la montée.
 */
/** ESSAI : la phase d'une lune (0 nouvelle, 0,5 pleine) : sa période vient de la graine (10 à 40 jours), elle avance avec les jours de l'Âge. `S.phaseDay` force un jour (planches). */
function moonPhase(S, mo, mi, td) {
  const q = rng((S.seed ^ (0x1a7a + mi * 977)) >>> 0), period = 10 + 30 * q(), off = q();
  let day = S.phaseDay; if (day == null) { try { day = WX.dayOf(S, Date.now()).day; } catch (e) { day = 0; } }
  return frac((day + (td || 0)) / period + off);
}
function skyPath(m, p, top) {
  const { S, W, H, hz } = m, V = S.view || {}, face = V.face || "eq", lat = V.lat != null ? V.lat : 0.5;
  if (p > 0.7) return null; const q = p / 0.7, e = Math.sin(Math.PI * q), amp = (hz - top) * (1.15 - 0.55 * lat);
  if (face === "pole") { if (q > 0.32 && q < 0.68) return { x: -W, y: hz, e }; return q <= 0.32 ? { x: W * (0.82 + 0.6 * q), y: hz - e * amp * 0.45, e } : { x: W * (0.18 - 0.6 * (1 - q)), y: hz - e * amp * 0.45, e }; } /* face au pôle : le soleil passe dans le dos ; on le voit se lever à droite et se coucher à gauche */
  if (face === "east" || face === "west") { const k = (face === "east" ? q : 1 - q) / 0.5, lean = (V.side || 1) * (0.06 + 0.3 * lat); return { x: W * (0.3 + 0.4 * (V.fx != null ? V.fx : 0.5) + lean * k * 0.5), y: hz - k * (hz - top + H * 0.39), e }; } /* à midi il est sorti par le haut : on ne le voit pas en même temps de face et sur les côtés */
  return { x: W * (0.06 + 0.88 * q), y: hz - e * amp, e };
}
/** ESSAI : la lumière de l'étoile. Une naine rouge baigne tout d'orangé, une étoile blanche ou bleue d'une lumière froide ; deux soleils de couleurs différentes partagent le paysage. */
function starTint(T) { if (!T) return null; const k = T < 3900 ? 0.32 : T < 5200 ? 0.16 : T < 6500 ? 0 : 0.22; if (!k) return null; const c = blackbody(T), mx = Math.max(...c); return { c: c.map((v) => (v / mx) * 255), k }; }
function starLight(g, m, day) {
  const { W, H, S } = m, a = starTint(S.phys.T), b = S.suns > 1 ? starTint(S.phys.T2) : null; if (!a && !b) return;
  const f = (x) => (x ? css(mixc([255, 255, 255], x.c, x.k * 2 * (0.4 + 0.6 * day))) : "#ffffff");
  g.save(); g.globalCompositeOperation = "multiply"; if (b || (S.suns > 1 && a)) { const gg = g.createLinearGradient(0, 0, W, 0); gg.addColorStop(0, f(a)); gg.addColorStop(1, f(b)); g.fillStyle = gg; } else g.fillStyle = f(a); g.fillRect(0, 0, W, H); g.restore();
}
/** ESSAI : le feuillage s'adapte à son étoile : presque noir ou pourpre sous une naine rouge, roux et doré sous une étoile chaude. Un vert seulement (le reste garde sa couleur). */
/**
 * ESSAI (merveille 16, « ce que les racines ont bu ») : l'arbre est fait du métal qu'il a bu. Le feuillage prend le métal (or, argent, cuivre vert-de-gris),
 * l'écorce aussi, un ton plus sombre ; le fer (le grand arbre qui a bu la lave) est noir forgé. La végétation ternie (le métal sans la merveille) grise et ternit.
 */
/**
 * ESSAI : des arbres qui se lisent comme du métal, pas seulement de la couleur : on les dessine à part, on les teinte, puis on ajoute
 * un liseré clair là où la lumière accroche (en haut, côté ciel) et une ombre nette de l'autre côté (le relief du métal battu),
 * des bandes de reflet (le ciel en haut, le sol en bas, comme sur un objet poli) et des éclats qui scintillent.
 */
function metalLayer(g, m, t, mf, day) {
  const cv = g.canvas, doc = cv && cv.ownerDocument; if (!doc || typeof g.getTransform !== "function") return false;
  const { W, H, hz, S } = m, c = doc.createElement("canvas"); c.width = cv.width; c.height = cv.height; const o = c.getContext("2d"); if (!o) return false;
  o.setTransform(g.getTransform()); o.filter = mf; trees(o, m, t); o.filter = "none";
  const tall = Math.max(H * 0.2, ...m.trees.map((tr) => tr.h * 1.6)), y0 = hz - tall, sky = m.lastHzc || [200, 210, 225], iron = S.wonderMetal === "iron";
  o.globalCompositeOperation = "source-atop"; /* les reflets d'un objet poli : le ciel en haut, une bande sombre, le sol en bas */
  const gr = o.createLinearGradient(0, y0, 0, hz); gr.addColorStop(0, css(mixc(sky, [255, 255, 255], 0.5), iron ? 0.12 : 0.42 * (0.4 + 0.6 * day))); gr.addColorStop(0.35, css([255, 255, 255], 0)); gr.addColorStop(0.55, css([10, 10, 14], iron ? 0.1 : 0.3)); gr.addColorStop(0.7, css([255, 255, 255], 0)); gr.addColorStop(0.9, css(mixc(sky, [255, 255, 255], 0.3), iron ? 0.05 : 0.2 * (0.4 + 0.6 * day))); o.fillStyle = gr; o.fillRect(0, 0, W, H);
  const sh = frac(t * 0.15); o.save(); o.translate(W * (sh * 1.6 - 0.3), 0); o.rotate(-0.5); o.fillStyle = css([255, 255, 255], iron ? 0.05 : 0.22 * (0.3 + 0.7 * day)); o.fillRect(0, -H, W * 0.04, H * 3); o.restore(); /* un éclat qui glisse le long du métal */
  o.globalCompositeOperation = "source-over";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = "brightness(2.4)"; g.globalAlpha = iron ? 0.25 : 0.75; g.drawImage(c, -1, -1); /* le liseré clair, côté lumière */
  g.filter = "brightness(0.25)"; g.globalAlpha = 0.6; g.drawImage(c, 1, 1); /* l'ombre nette, de l'autre côté */
  g.filter = "none"; g.globalAlpha = 1; g.drawImage(c, 0, 0); g.restore();
  if (!iron && day > 0.2) { const q = rng((S.seed ^ 0x6117) >>> 0); for (const tr of m.trees) for (let k = 0; k < 4; k++) { const x = tr.x + (q() - 0.5) * tr.h * 0.8, y = hz - tr.h * (0.5 + 0.9 * q()), tw = Math.pow(Math.max(0, Math.sin(TAU * (t * 1.5 + q()))), 8); if (tw < 0.05) continue; g.strokeStyle = css([255, 255, 250], 0.9 * tw); g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4 * tw, y); g.lineTo(x + 4 * tw, y); g.moveTo(x, y - 4 * tw); g.lineTo(x, y + 4 * tw); g.stroke(); } } /* des éclats en étoile qui scintillent */
  return true;
}
function metalFilter(S) { return S.wonderMetal === "silver" ? "grayscale(1) brightness(1.55) contrast(1.15)" : S.wonderMetal === "gold" ? "grayscale(1) sepia(1) saturate(2.4) brightness(1.25)" : S.wonderMetal === "copper" ? "grayscale(1) sepia(1) hue-rotate(115deg) saturate(1.6) brightness(1.1)" : S.wonderMetal === "iron" ? "grayscale(1) brightness(0.32) contrast(1.3)" : S.tarnished ? "saturate(0.3) brightness(0.8) sepia(0.15)" : null; }
function leafFilter(S) { const T = S && S.phys && S.phys.T; if (!T || (T >= 4500 && T <= 6800)) return null; return T < 4500 ? `hue-rotate(${Math.round(120 + 40 * clamp((4500 - T) / 1500))}deg) saturate(0.8) brightness(${(0.75 - 0.15 * clamp((4500 - T) / 1500)).toFixed(2)})` : `hue-rotate(-${Math.round(70 + 20 * clamp((T - 6800) / 4000))}deg) saturate(1.1)`; }
const LEAFY = new Set(["fern", "vine", "seed", "thorn_bush", "berry_shrub", "heath_shrub", "moss", "sapling", "withered_fern", "lichen", "kelp", "glowvine"]);
function leafC(S, c) {
  const T = S && S.phys && S.phys.T; if (!T || (T >= 4500 && T <= 6800) || !c || !(c[1] > c[0] * 1.08 && c[1] > c[2])) return c;
  const L = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], tgt = T < 4500 ? [70, 26, 78] : [196, 112, 42], k = T < 4500 ? clamp((4500 - T) / 1500, 0.4, 0.85) : clamp((T - 6800) / 4000, 0.35, 0.75), Lt = 0.3 * tgt[0] + 0.59 * tgt[1] + 0.11 * tgt[2], adj = tgt.map((v) => clamp(v * (L / Lt) * (T < 4500 ? 0.75 : 1), 0, 255));
  return mixc(c, adj, k);
}
function suns(m, t, season = 0) {
  const { S, W, H, hz } = m, top = H * (0.14 + 0.08 * (0.5 - 0.5 * season)), out = [], erratic = (i) => { const q = Math.floor(t * 6), g = rng(S.seed + q * 31 + i); return { x: W * (0.2 + 0.6 * g()), y: H * (0.2 + 0.34 * g()) }; };
  for (let i = 0; i < S.suns; i++) {
    const rad = H * (i === 0 ? 0.085 : 0.055) * (S.phys ? clamp(Math.sqrt(S.phys.disc), 0.6, 1.7) : 1); let b = null;
    if (S.cycle === "frozen") { const fz = rng((S.seed ^ 0x10c4) >>> 0), el = 0.32 + 0.4 * fz(), fx = 0.25 + 0.5 * fz(); b = { x: W * (fx - 0.22 * i), y: hz - (hz - top) * el, e: el }; } // soleil immobile : sa hauteur et sa place dépendent de l'endroit du monde (graine)
    else if (S.cycle === "erratic") { const p = erratic(i); b = { x: p.x, y: p.y, e: clamp((hz - p.y) / (hz * 0.8)) }; }
    else b = skyPath(m, frac(t - i * 0.1), top);
    if (!b) continue;
    if (S.chaos) { b.x += W * 0.05 * Math.sin(TAU * t * 5 + i * 2); b.y += H * 0.04 * Math.sin(TAU * t * 7 + i); }
    out.push({ i, x: b.x, y: b.y, e: b.e, r: rad });
  }
  return out;
}

// ---- dessin ----------------------------------------------------------------------------------------
/**
 * La lumière du ciel à l'instant `t` : soleils, hauteur du jour, couleurs du zénith et de l'horizon, air mince ou épais.
 * `m.sunFrom` : un autre modèle dont on prend les soleils (les autres directions du périscope de l'Imageur).
 */
function skyState(m, t, o = {}) {
  t = frac(t); const { S, pal } = m, sm = m.sunFrom || m, td = o.day != null ? frac(o.day) : t, cs = o.clock != null ? o.clock : t * 8, sn = S.forceNight ? [] : suns(sm, td, o.season != null ? o.season : S.season ? -2 + 3.5 * S.season.sun : 0); /* la saison : le soleil bas l'hiver (sommet de sa course vers 26 % de la hauteur), haut l'été (12 %) ; sans saison, 18 % comme toujours */
  const d = S.forceNight ? 0 : S.suns === 0 ? 0 : S.cycle === "frozen" ? (sn.length ? Math.max(...sn.map((s) => s.e)) * 0.8 : 0.2) : S.cycle === "erratic" ? 0.2 + 0.6 * rng(sm.S.seed + Math.floor(td * 6))() : Math.max(0, ...sn.map((s) => s.e));
  const night = 1 - smooth(d * 3), day = smooth((d - 0.25) / 0.75); /* l'ardoise, la nuit (S.forceNight) : d = 0, à contre-horloge */
  let top = mixc(mixc(pal.nightTop, pal.dawnTop, smooth(d * 3)), pal.dayTop, day), hzc = mixc(mixc(pal.nightHz, pal.dawnHz, smooth(d * 3)), pal.dayHz, day);
  const hues = S.sunHues || []; if (hues[0]) { hzc = mixc(hzc, hues[0], 0.3 * day); top = mixc(top, hues[0], 0.14 * day); } // soleil coloré : la lumière du jour prend sa teinte
  const air = S.phys ? { thin: clamp((0.5 - S.phys.P) / 0.45), thick: S.phys.P > 1.5 ? clamp(Math.log2(S.phys.P / 1.5) / 4) : 0 } : { thin: 0, thick: 0 };
  const wrote = (id) => (S.extras || []).some((e) => e.id === id); if (wrote("thin_air")) air.thin = Math.max(air.thin, 0.95); if (wrote("thick_air")) air.thick = Math.max(air.thick, 0.65); m.airK = air; /* le bloc écrit tient ce que dit sa phrase (loi 3) */
  if (air.thin) { top = mixc(top, [4, 5, 12], 0.9 * air.thin); hzc = mixc(hzc, mixc(hzc, [10, 12, 24], 0.5), air.thin); } // air mince : ciel sombre même à midi
  if (air.thick) { top = mixc(top, mixc(hzc, [235, 230, 215], 0.3), 0.65 * air.thick); } // air épais : ciel laiteux, sans profondeur
  if (S.season && S.season.cold > 0.01) { top = mixc(top, [196, 206, 222], 0.2 * S.season.cold * day); hzc = mixc(hzc, [214, 218, 226], 0.28 * S.season.cold * day); } /* l'hiver : un ciel plus pâle, plus gris */
  if (m.won && m.won.orphan) ({ top, hzc } = WON.skyTint(m, top, hzc, day)); /* la Couleur orpheline : un ciel égal, sans source */
  if (S.blackSun) { const gray = (c) => { const v = (c[0] + c[1] + c[2]) / 3; return [v, v, v]; }; top = mixc(gray(top), [12, 8, 10], 0.55); hzc = mixc(gray(hzc), [60, 26, 26], 0.45); } // soleil noir : jour gris et sombre, horizon rouge éteint
  return { t, td, cs, sn, d, night, day, top, hzc, hues, air };
}

/**
 * La caverne : la fenêtre donne sur l'intérieur, une voûte fermée qui remplit tout le cadre, sans ciel ni horizon ouvert.
 * La seule lumière est celle de l'Âge : algues froides, vigne luisante, lave. Rien d'écrit qui luise, et la caverne reste presque noire.
 */
function buildCave(S, W, H, hz) {
  const q = rng((S.seed ^ 0xca7e5) >>> 0), n = valueNoise((q() * 4294967296) >>> 0), A = S.amt && S.amt.glow != null ? S.amt.glow : 1;
  const N = Math.ceil(W / 4) + 1, ceil = new Float32Array(N), floor = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1), edge = Math.pow(Math.abs(u - 0.5) * 2, 3);
    ceil[k] = H * (0.1 + 0.2 * fbm(n, u * 3.2 + 4)) + edge * H * 0.34; // la voûte descend vers les flancs
    floor[k] = hz + H * (0.03 * fbm(n, u * 5 + 20) - 0.01) + edge * H * 0.05;
  }
  const hue0 = S.algae ? 168 + q() * 18 : S.glow ? 110 + q() * 40 : S.lava ? 16 + q() * 14 : 215 + q() * 20;
  const lights = [];
  if (S.glow) for (let i = 0, c = Math.round(clamp(9 * A, 3, 26)); i < c; i++) {
    const zone = q(), wall = zone < 0.28, x = wall ? (q() < 0.5 ? W * (0.03 + 0.1 * q()) : W * (0.87 + 0.1 * q())) : W * (0.06 + 0.88 * q());
    lights.push({ x, y: wall ? H * (0.3 + 0.45 * q()) : hz + H * (0.02 + 0.2 * q()), r: H * (0.05 + 0.12 * q()), ph: q(), hue: hue0 + (q() - 0.5) * 24, wall });
  }
  if (S.lava) for (let i = 0, c = 2 + Math.floor(q() * 2); i < c; i++) lights.push({ x: W * (0.1 + 0.8 * q()), y: hz + H * (0.04 + 0.16 * q()), r: H * (0.09 + 0.1 * q()), ph: q(), hue: 12 + q() * 18, wall: false, lava: true });
  const pools = S.water ? Array.from({ length: 1 + Math.floor(q() * 2) }, () => ({ x: W * (0.2 + 0.6 * q()), w: W * (0.22 + 0.28 * q()), y: hz + H * (0.07 + 0.1 * q()), h: H * (0.06 + 0.05 * q()) })) : [];
  const stalactites = Array.from({ length: 16 }, () => ({ x: W * q(), len: H * (0.04 + 0.2 * Math.pow(q(), 1.6)), w: H * (0.014 + 0.03 * q()) }));
  const stalagmites = Array.from({ length: 10 }, () => ({ x: W * q(), h: H * (0.04 + 0.16 * Math.pow(q(), 1.5)), w: H * (0.015 + 0.03 * q()) }));
  const columns = Array.from({ length: 5 }, () => ({ x: W * (0.1 + 0.8 * q()), w: H * (0.03 + 0.05 * q()), a: q() }));
  const strata = Array.from({ length: 7 }, () => ({ y: H * (0.2 + 0.5 * q()), a: q(), p: q() * TAU }));
  const motes = Array.from({ length: Math.round(clamp(36 * A, 10, 90)) }, () => ({ x: W * q(), y: H * (0.25 + 0.65 * q()), p: q(), k: 1 + Math.floor(q() * 2), r: 0.6 + q() * 1.3 }));
  const moths = S.moths ? Array.from({ length: 6 }, () => ({ x: W * (0.1 + 0.8 * q()), y: H * (0.35 + 0.35 * q()), p: q(), rx: 14 + q() * 30, ry: 6 + q() * 12 })) : [];
  return { ceil, floor, hue0, lights, pools, stalactites, stalagmites, columns, strata, motes, moths };
}

function paintCavern(g, m, t) {
  const { S, W, H, hz, cave: C } = m, tone = (h, l = 0.6, sa = 0.85) => hsl(h, sa, l), N = C.ceil.length;
  const base = g.createLinearGradient(0, 0, 0, H); base.addColorStop(0, "rgb(4,5,9)"); base.addColorStop(0.45, "rgb(12,14,21)"); base.addColorStop(1, "rgb(8,10,14)");
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const L of C.lights) { // la brume de lumière : ce qui luit éclaire l'air de la caverne
    const col = tone(L.hue, 0.5), pulse = 0.75 + 0.25 * Math.sin(TAU * (t + L.ph)), gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 5);
    gr.addColorStop(0, css(col, 0.2 * pulse)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.restore();
  for (const s of C.strata) { g.strokeStyle = css([60, 66, 80], 0.05 + 0.05 * s.a); g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += 24) { const y = s.y + 6 * Math.sin(x / W * TAU * 1.5 + s.p); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (const c of C.columns) { // piliers lointains, noyés dans la brume
    const hg = g.createLinearGradient(0, 0, 0, hz); hg.addColorStop(0, "rgba(10,12,18,0.95)"); hg.addColorStop(1, css(mixc([10, 14, 20], tone(C.hue0, 0.3, 0.5), 0.35), 0.9));
    g.fillStyle = hg; g.beginPath(); g.moveTo(c.x - c.w, hz); g.quadraticCurveTo(c.x - c.w * 0.3, hz * 0.55, c.x - c.w * 0.5, 0); g.lineTo(c.x + c.w * 0.5, 0); g.quadraticCurveTo(c.x + c.w * 0.3, hz * 0.55, c.x + c.w, hz); g.closePath(); g.fill();
  }
  const rim = tone(C.hue0, 0.5, 0.7);
  const lit = C.lights.length ? 0.14 : 0.04, cg = g.createLinearGradient(0, 0, 0, Math.max(...C.ceil)); cg.addColorStop(0, "rgb(3,4,7)"); cg.addColorStop(0.6, "rgb(6,7,11)"); cg.addColorStop(1, css(mixc([7, 8, 12], rim, lit)));
  g.fillStyle = cg; g.beginPath(); g.moveTo(0, 0); for (let k = 0; k < N; k++) g.lineTo((k / (N - 1)) * W, C.ceil[k]); g.lineTo(W, 0); g.closePath(); g.fill(); // la voûte, que la lueur d'en bas touche à peine
  g.strokeStyle = css(rim, C.lights.length ? 0.1 : 0.03); g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < N; k++) { const x = (k / (N - 1)) * W; k ? g.lineTo(x, C.ceil[k]) : g.moveTo(x, C.ceil[k]); } g.stroke();
  for (const s of C.stalactites) { // stalactites : le haut est noir, la pointe attrape un peu de lueur
    const k = Math.max(0, Math.min(N - 1, Math.round((s.x / W) * (N - 1)))), y0 = C.ceil[k] - 2;
    g.fillStyle = cg; g.beginPath(); g.moveTo(s.x - s.w, y0); g.quadraticCurveTo(s.x - s.w * 0.25, y0 + s.len * 0.6, s.x, y0 + s.len); g.quadraticCurveTo(s.x + s.w * 0.25, y0 + s.len * 0.6, s.x + s.w, y0); g.closePath(); g.fill();
    if (C.lights.length) { g.fillStyle = css(rim, 0.22); g.beginPath(); g.arc(s.x, y0 + s.len - 1, 1.3, 0, TAU); g.fill(); }
  }
  for (const side of [0, 1]) { // les flancs referment la voûte des deux côtés
    const sg = g.createLinearGradient(side ? W : 0, 0, side ? W * 0.88 : W * 0.12, 0); sg.addColorStop(0, "rgb(3,4,7)"); sg.addColorStop(1, css(mixc([7, 8, 12], rim, lit * 0.8))); g.fillStyle = sg; g.beginPath(); g.moveTo(side ? W : 0, 0); for (let k = 0; k <= 12; k++) { const y = (k / 12) * hz, w = W * (0.015 + 0.075 * Math.pow(k / 12, 1.8) + 0.02 * Math.sin(k * 1.7 + side)); g.lineTo(side ? W - w : w, y); } g.lineTo(side ? W : 0, hz); g.closePath(); g.fill(); }
  const fl = g.createLinearGradient(0, hz - H * 0.03, 0, H); fl.addColorStop(0, "rgb(11,13,18)"); fl.addColorStop(1, "rgb(5,6,9)"); // le sol de la caverne
  g.fillStyle = fl; g.beginPath(); g.moveTo(0, H); for (let k = 0; k < N; k++) g.lineTo((k / (N - 1)) * W, C.floor[k]); g.lineTo(W, H); g.closePath(); g.fill();
  for (const p of C.pools) { // l'eau noire des vasques ; la lumière s'y reflète en traînées qui tremblent
    const wg = g.createLinearGradient(0, p.y - p.h, 0, p.y + p.h); wg.addColorStop(0, css(mixc([8, 14, 20], tone(C.hue0, 0.25, 0.5), 0.25), 0.95)); wg.addColorStop(1, "rgba(4,7,11,0.95)");
    g.fillStyle = wg; g.beginPath(); g.ellipse(p.x, p.y, p.w, p.h, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(p.x, p.y, p.w, p.h, 0, 0, TAU); g.clip(); g.globalCompositeOperation = "lighter";
    for (const L of C.lights) {
      if (Math.abs(L.x - p.x) > p.w * 1.15) continue; const col = tone(L.hue, 0.55);
      const rg = g.createRadialGradient(L.x, p.y, 0, L.x, p.y, p.h * 1.6); rg.addColorStop(0, css(col, 0.22)); rg.addColorStop(1, css(col, 0)); g.fillStyle = rg; g.fillRect(L.x - p.h * 1.6, p.y - p.h, p.h * 3.2, p.h * 2);
      g.strokeStyle = css(col, 0.35); g.lineWidth = 1; // de fines rides qui tremblent sous la lumière
      for (let i = 0; i < 7; i++) { const y = p.y - p.h * 0.7 + (i / 6) * p.h * 1.4, wob = 4 * Math.sin(TAU * (t * 2 + L.ph + i * 0.23)), w = L.r * 0.45 * (1 - Math.abs(i - 3) / 5); g.globalAlpha = 0.5 + 0.5 * Math.sin(TAU * (t + L.ph + i * 0.31)) ** 2; g.beginPath(); g.moveTo(L.x + wob - w, y); g.lineTo(L.x + wob + w, y); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.restore();
    g.strokeStyle = css(rim, 0.12); g.lineWidth = 1; g.beginPath(); g.ellipse(p.x, p.y, p.w, p.h, 0, 0, TAU); g.stroke();
  }
  for (const s of C.stalagmites) { const k = Math.max(0, Math.min(N - 1, Math.round((s.x / W) * (N - 1)))), y0 = C.floor[k] + 3; g.fillStyle = "rgb(4,5,8)"; g.beginPath(); g.moveTo(s.x - s.w, y0); g.quadraticCurveTo(s.x - s.w * 0.25, y0 - s.h * 0.6, s.x, y0 - s.h); g.quadraticCurveTo(s.x + s.w * 0.25, y0 - s.h * 0.6, s.x + s.w, y0); g.closePath(); g.fill(); }
  if (S.fissure) { // la bouche de la fissure, dans la pénombre de la caverne
    g.save(); g.globalAlpha = 0.4; fissure(g, m, t); g.restore();
  }
  ruinsPass(g, m, t);
  for (const e of m.eyes) { const o = Math.sin(TAU * (t + e.p)); if (o > -0.7) { g.fillStyle = css([255, 200, 90], 0.8); g.fillRect(e.x - 3, e.y, 1.6, 1.6); g.fillRect(e.x + 2, e.y, 1.6, 1.6); } }
  extraAt(g, m, t, "ground");
  WON.wonderPass(g, m, t, "cave", null);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const L of C.lights) { // les algues elles-mêmes : un cœur qui palpite, de petites perles autour
    const col = tone(L.hue, L.lava ? 0.5 : 0.62), pulse = 0.7 + 0.3 * Math.sin(TAU * (t * (L.lava ? 2 : 1) + L.ph)), gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
    gr.addColorStop(0, css(mixc(col, [255, 255, 255], 0.35), 0.8 * pulse)); gr.addColorStop(0.35, css(col, 0.35 * pulse)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(L.x, L.y, L.r, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { const a = (i + L.ph) * 2.4, d = L.r * (0.25 + 0.5 * ((i * 0.37 + L.ph) % 1)), b = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + L.ph + i * 0.21)); g.fillStyle = css(col, 0.55 * b); g.fillRect(L.x + Math.cos(a) * d, L.y + Math.sin(a) * d * 0.6, 1.8, 1.8); }
  }
  for (const mo of C.motes) { const x = mo.x + 10 * Math.sin(TAU * (t * mo.k + mo.p)), y = mo.y + 8 * Math.cos(TAU * (t * mo.k + mo.p * 1.7)), a = 0.25 + 0.4 * Math.sin(TAU * (t * 2 + mo.p)) ** 2; g.fillStyle = css(tone(C.hue0, 0.7), a * (C.lights.length ? 1 : 0.2)); g.beginPath(); g.arc(x, y, mo.r, 0, TAU); g.fill(); }
  for (const mo of C.moths) { const x = mo.x + mo.rx * Math.sin(TAU * (t + mo.p)), y = mo.y + mo.ry * Math.sin(TAU * (t * 2 + mo.p)); g.fillStyle = css([255, 232, 170], 0.85); g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill(); g.fillStyle = css([255, 232, 170], 0.18); g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); }
  g.restore();
  extraAt(g, m, t, "air");
  const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function paint(g, m, t, o = {}) {
  const { S, W, H, hz, pal } = m, k0 = skyState(m, t, o), { cs, d, night, day, top, hzc, hues, air } = k0, sn = m.noSun ? [] : k0.sn; t = k0.t; m.lastHzc = hzc; // sans soleil dessiné : la lumière reste celle du jour
  g.save(); g.clearRect(0, 0, W, H);
  const dm = doomOf(S);
  if (dm > 0.1 && dm < 0.9) { const a = (dm - 0.1) * 3.2, T = Date.now() / 1000; g.translate(Math.sin(T * 61) * a, Math.cos(T * 47) * a * 0.7); } // la terre tremble
  if (m.cave) { paintCavern(g, m, t); g.restore(); return; } // monde-caverne : une voûte fermée, éclairée par ce qui luit
  const L = m.lv = weatherLevels(m, k0.td, o), sw = S.season ? S.season.snow : 0, rs = S.season ? S.season.rainToSnow : 0; if (rs > 0) { L.snow = Math.max(L.snow, L.rain * rs, L.drizzle * rs); L.rain *= 1 - rs; L.drizzle *= 1 - rs; } if (sw > 0.3) L.snow = Math.max(L.snow, 0.5 * (sw - 0.3)); if (S.season && S.season.T > 318) L.heat = Math.max(L.heat, clamp((S.season.T - 318) / 15)); /* l'hiver : la pluie écrite tombe en neige ; l'été brûlant : l'air tremble */ // météo vivante : présence de chaque temps à cette heure (1 partout sans ligne programmée)
  const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, css(top)); sky.addColorStop(1, css(hzc)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  m.frontF = m.front ? (m.front.reach || 0.5) * (0.45 + 0.55 * L.storm) : 0; /* ESSAI : le front s'avance avec l'orage */
  if (L.storm > 0.005) { g.fillStyle = css([14, 17, 24], (m.front ? 0.12 : 0.5) * L.storm); g.fillRect(0, 0, W, H); }
  const grey = Math.max(L.drizzle * 0.55, L.snow * 0.6, L.ashRain * 0.7, L.acidRain * 0.5); // ciel couvert : un voile gris-perle, plus chaud sous la cendre
  if (grey > 0.005) { g.fillStyle = css(L.ashRain > 0.3 ? [120, 112, 104] : [176, 182, 192], 0.32 * grey * (0.35 + 0.65 * day)); g.fillRect(0, 0, W, hz); }
  if (S.veil) { g.fillStyle = "rgba(190,190,202,0.2)"; g.fillRect(0, 0, W, H); }
  // étoiles
  const sv = Math.max(lerp(1, 0.25, L.storm) * (1 - 0.5 * grey) * (S.veil ? 0.5 : 1) * (1 - Math.min(1, d * 1.4)), 0.7 * air.thin * air.thin) * (1 - 0.8 * air.thick); // sans air, les étoiles se voient en plein jour ; sous un air épais, presque jamais
  if (sv > 0.02) for (const s of m.stars) { g.fillStyle = css([230, 230, 245], (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * t * s.k + s.p))) * sv); g.fillRect(s.x, s.y, s.s, s.s); }
  if (sv > 0.02 && m.night) nightSky(g, m, t, sv);
  // aurores
  const ak = Math.max(0, Math.min(1, (night - 0.3) / 0.45)); // aurores : nuit seulement
  if (S.auroras && ak > 0.01) auroraCurtains(g, m, t, ak);
  if (S.starfall) for (let p = 0; p < 3; p++) {
    const q = frac(t + p / 3); if (q > 0.3) continue; const k = q / 0.3, x = (rng(S.seed + p)() * W * 0.7), y = rng(S.seed + p + 9)() * hz * 0.4;
    g.strokeStyle = css([255, 255, 255], 0.8 * (1 - k)); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x + k * W * 0.28, y + k * H * 0.24); g.lineTo(x + k * W * 0.28 - H * 0.18, y + k * H * 0.24 - H * 0.13); g.stroke();
  }
  // lune
  for (const [mi, mo] of ((m.night && m.night.moons) || []).entries()) { // les lunes : chacune sa taille, sa teinte, sa phase et son pas
    const rad = mo.r; let mp = null;
    if (S.cycle === "frozen") { const fz = rng((S.seed ^ 0x10c4) >>> 0); fz(); const sfx = 0.25 + 0.5 * fz(), mx = 0.1 + 0.8 * frac(sfx - 0.1 + 0.5 + mo.off * 0.3 + mi * 0.12); mp = { x: W * mx, y: H * mo.fy }; } // à l'opposé du soleil immobile else { const p = frac(td * mo.sp - 0.6 + mo.off); if (p <= 0.7) { const q = p / 0.7; mp = { x: W * (0.06 + 0.88 * q), y: hz - Math.sin(Math.PI * q) * (hz - H * (0.2 + 0.1 * mo.off)) }; } }
    if (S.cycle !== "frozen" && S.cycle !== "erratic") { /* ESSAI : la phase suit les jours de l'Âge ; la lune se lève d'autant plus tard qu'elle est vieille */
      const td = k0.td, ph = moonPhase(S, mo, mi, td), mtop = H * (0.14 + 0.06 * mi); mp = skyPath(m, frac(td - ph), mtop); mo._ph = ph;
      if (mp) { const sp = skyPath(m, frac(td), H * 0.14), sx = sp ? sp.x : W * 0.5, sy = sp ? sp.y : H * 1.6, ang = Math.atan2(sy - mp.y, sx - mp.x), c = Math.cos(TAU * ph); /* le côté éclairé regarde le soleil */
        g.fillStyle = css(mixc(mo.tint, [10, 12, 20], 0.82), 0.85); g.beginPath(); g.arc(mp.x, mp.y, rad, 0, TAU); g.fill(); /* la part sombre, à peine visible */
        if (c < 0.98) { g.save(); g.translate(mp.x, mp.y); g.rotate(ang); g.fillStyle = css(mo.tint); g.beginPath(); g.arc(0, 0, rad, -Math.PI / 2, Math.PI / 2, false); g.ellipse(0, 0, rad * Math.abs(c), rad, 0, Math.PI / 2, -Math.PI / 2, c > 0); g.closePath(); g.fill(); g.restore(); }
        const lit = (1 - c) / 2; if (mp.y < hz) m._moonlight = Math.max(m._moonlight || 0, lit * (rad / (H * 0.045))); }
      mp = null; }
    if (mp) { g.fillStyle = css(mo.tint); g.beginPath(); g.arc(mp.x, mp.y, rad, 0, TAU); g.fill(); g.fillStyle = "rgba(10,12,20,0.5)"; g.beginPath(); g.arc(mp.x + rad * mo.ph * 1.6, mp.y - rad * 0.2, rad * 0.9, 0, TAU); g.fill(); }
  }
  const drawSuns = () => {
  for (const s of sn) {
    const gl = g.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, s.r * 5), b = 0.5 * Math.max(Math.pow(Math.max(0, s.e), 0.6), S.cycle === "frozen" ? 0.7 : 0);
    const hc = hues[s.i] || hues[0] && S.suns < 2 && s.i === 0 && hues[0] || null; // 1er soleil : 1re couleur ; 2e soleil : 2e couleur
    gl.addColorStop(0, hc ? css(hc, b) : s.i === 0 ? css([255, 214, 150], b) : css([190, 215, 255], b * 0.8)); gl.addColorStop(1, css(hc || [255, 214, 150], 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    if ((S.blackSun || S.blackDisc) && s.i === 0) { // soleil noir : disque sombre et couronne rouge éteinte
      g.strokeStyle = css([150, 52, 40], 0.5 + 0.4 * b); g.lineWidth = Math.max(1.2, s.r * 0.22); g.beginPath(); g.arc(s.x, s.y, s.r * 1.08, 0, TAU); g.stroke();
      g.fillStyle = "#07050a"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); continue;
    }
    g.fillStyle = hc ? css(mixc(hc, [255, 255, 255], 0.35)) : s.i === 0 ? "#f6e0a8" : "#cfe0f4"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }
  };
  if (S.loop) drawSuns(); /* le soleil est plus loin que l'autre côté de l'anneau : il passe derrière, et ne se montre que dans le trou (26 oct. 2026) */
  if (S.loop) TOR.paintTorus(g, m, t, { fam: S.loopFam, key: S.loopKey, form: S.torus, night, air: mixc(hzc, top, 0.3) }); /* l'autre côté de l'anneau : devant les étoiles et le soleil, derrière nos nuages */
  // nuages (dérive lente, boucle)
  const cst = cloudStyleOf(S, L); /* un type de nuages par Âge */
  if (cst === "cirrus" && air.thin <= 0.85) for (const c of m.clouds) { const x = frac((c.x / W) + t * c.sp * 0.5) * (W + c.w * 2) - c.w, y = c.y * 0.6; g.strokeStyle = css(mixc(hzc, [255, 255, 255], 0.6), 0.35 * (0.4 + day)); g.lineWidth = 1.2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x + k * c.w * 0.12, y + k * 2); g.quadraticCurveTo(x + c.w * 0.5, y + k * 2 - 4 - c.lump[k] * 4, x + c.w * (0.8 + c.lump[k + 1] * 0.3), y + k * 2 + 3); g.stroke(); } }
  if (cst === "lenticular" && air.thin <= 0.85) for (const c of m.clouds.slice(0, 3)) { const x = c.x, y = c.y * 0.8 + hz * 0.25; for (let k = 0; k < 3; k++) { g.fillStyle = css(mixc(hzc, [255, 255, 255], 0.45 + 0.1 * k), 0.45 * (0.4 + day)); g.beginPath(); g.ellipse(x, y - k * c.h * 0.45, c.w * (0.45 - k * 0.1), c.h * 0.22, 0, 0, TAU); g.fill(); } }
  if (cst === "stratus" && air.thin <= 0.85) for (let k = 0; k < 3; k++) { const y = hz * (0.35 + k * 0.15), x = frac(t * 0.3 + k * 0.37) * W; g.fillStyle = css(mixc(hzc, [255, 255, 255], 0.3), 0.18 * (0.4 + day)); g.fillRect(0, y, W, H * 0.025); g.fillRect(x - W * 0.3, y - H * 0.012, W * 0.6, H * 0.012); }
  for (const c of air.thin > 0.85 || cst !== "cumulus" ? [] : m.clouds) { // presque pas d'air : pas de nuages
    const x = frac((c.x / W) + t * c.sp) * (W + c.w * 2) - c.w, ks = m.front && m.front.mode !== "shower" ? L.storm * stormCov(m, x + c.w * 0.5, c.y) : L.storm; g.fillStyle = css(mixc(mixc(hzc, [255, 255, 255], 0.35), [30, 34, 44], ks), lerp(c.a * (0.4 + day), 0.55, ks));
    const band = S.phys && !S.phys.locked ? clamp((S.phys.coriolis - 1.5) / 2.5) : 0; /* ESSAI (Coriolis) : un monde qui tourne vite étire ses nuages en bandes */
    c.lump.forEach((l, k) => { g.beginPath(); g.ellipse(x + (k / 7) * c.w * (1 + 0.6 * band), c.y + (l - 0.5) * c.h * 0.6 * (1 - 0.6 * band), c.w * 0.13 * (1 + 1.4 * band), c.h * (0.3 + l * 0.3) * (1 - 0.5 * band), 0, 0, TAU); g.fill(); });
  }
  // soleils (sous un anneau : déjà peints, derrière lui)
  if (!S.loop) drawSuns();
  const s0 = sn.find((s) => s.i === 0);
  if (S.eclipses && s0) { g.fillStyle = "#05060a"; g.beginPath(); g.arc(s0.x + s0.r * 2.4 * Math.cos(TAU * t), s0.y + s0.r * 0.15 * Math.sin(TAU * t), s0.r * 1.02, 0, TAU); g.fill(); }
  skyBodies(g, m, cs, day, hzc, sn);
  extraAt(g, m, t, "sky");
  WON.wonderPass(g, m, t, "sky", k0);
  if (m.front && (m.front.mode !== "shower" || m.ridges.length < 2)) stormSky(g, m, t, L, day, night, hzc, sn); /* ESSAI : l'orage d'un côté ; l'averse au loin, elle, passe entre les crêtes */
  if (S.seams && S.seams.some((f) => f.contra)) m.contraEdge = contraFx(g, m, t, S.seams.find((f) => f.contra), hzc); /* à contre-sens : une terre au-dessus de la tête, derrière les crêtes */
  // crêtes, de la plus lointaine à la plus proche (perspective atmosphérique : plus claires et plus proches de l'horizon au loin)
  m.ridges.forEach((rg, ri) => {
    if (ri === 1 && m.front && m.front.mode === "shower") stormSky(g, m, t, L, day, night, hzc, sn); /* ESSAI : derrière les crêtes proches, devant la plus lointaine */
    let c = mixc(mixc(pal.rock, pal.ground, 0.4 + 0.3 * rg.d), hzc, (1 - rg.d) * 0.45 * (0.3 + day * 0.7));
    if (S.ice) c = mixc(c, [214, 232, 248], (0.42 + 0.2 * day) * (1 - 0.6 * night)); // neige et glace sur les crêtes
    else if (sw > 0.01) c = mixc(c, [214, 232, 248], sw * (0.3 + 0.2 * day) * (1 - 0.6 * night)); // l'hiver : les crêtes blanchissent
    g.fillStyle = css(c); g.beginPath(); g.moveTo(0, hz); const n = rg.xs.length - 1;
    for (let k = 0; k <= n; k++) g.lineTo((k / n) * W, rg.xs[k]); g.lineTo(W, hz + 1); g.closePath(); g.fill();
    if (S.ice) { g.strokeStyle = css([240, 250, 255], (0.35 + 0.35 * day) * (1 - 0.5 * night)); g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k <= n; k++) k ? g.lineTo((k / n) * W, rg.xs[k]) : g.moveTo(0, rg.xs[0]); g.stroke(); } // arête givrée
    if (rg.d < 0.95) { // brume entre les plans : l'horizon remonte devant la crête
      const top = Math.min(...rg.xs), mg = g.createLinearGradient(0, top, 0, hz); mg.addColorStop(0, css(hzc, 0)); mg.addColorStop(1, css(hzc, 0.3 * (1 - rg.d) * (0.45 + 0.55 * day) + 0.08)); g.fillStyle = mg; g.fillRect(0, top, W, hz - top);
    }
  });
  WON.wonderPass(g, m, t, "ridges", k0);

  if (air.thick > 0.05) { const hg = g.createLinearGradient(0, 0, 0, hz); hg.addColorStop(0, css(hzc, 0.05 * air.thick)); hg.addColorStop(1, css(mixc(hzc, [240, 235, 220], 0.3), 0.45 * air.thick)); g.fillStyle = hg; g.fillRect(0, 0, W, hz); } // brume d'un air épais sur le relief
  for (const cn of m.cones) { // volcans : cône sombre + lueur du cratère
    g.fillStyle = css(pal.rock); g.beginPath(); g.moveTo(cn.x - cn.w, hz); g.lineTo(cn.x - cn.w * 0.12, hz - cn.h); g.lineTo(cn.x + cn.w * 0.12, hz - cn.h); g.lineTo(cn.x + cn.w, hz); g.closePath(); g.fill();
    const f = 0.5 + 0.5 * Math.sin(TAU * (t * 2) + cn.x), lg = g.createRadialGradient(cn.x, hz - cn.h, 1, cn.x, hz - cn.h, cn.h * 0.9); lg.addColorStop(0, css([255, 130, 50], 0.5 + 0.25 * f)); lg.addColorStop(1, css([255, 90, 30], 0)); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  if (L.rainbow > 0.005) rainbow(g, m, t, sn, day, L.rainbow); // l'arc posé sur les crêtes, derrière le sol
  // sol
  g.fillStyle = css(pal.ground); g.fillRect(0, hz, W, H - hz);
  if (m.shore) { waterSurface(g, m, t, sn, hzc); shoreLand(g, m, t, sn, day, night, hzc); } // eau et terre : un rivage
  else {
    if (S.sand) dunes(g, m);
    if (S.ice) iceSheet(g, m, t, sn, day, night, hzc);
    else if (S.water && S.waterGround !== false) waterSurface(g, m, t, sn, hzc); /* l'eau en trait ne peint plus la mer */
    if (S.lava) lavaVeins(g, m, t);
    if (!S.sand && !S.ice && !S.lava && !(S.water && S.waterGround !== false)) { if (S.soil === "salt") saltFlat(g, m, t, day, night, hzc); else if (S.rock === "basalt") blackSand(g, m, t, day, night, hzc); }
    if (S.view && S.view.kind === "high") valleyPlanes(g, m, t, day, night, hzc); /* ESSAI : vu d'en haut, la vallée s'étage */
    if (S.river) riverRibbon(g, m, t, sn, day, night, hzc, top);
    if (m.pond) pondWater(g, m, t, day, night, hzc, top); /* ESSAI : l'étang */
 /* les formes des sols */
  }
  midRelief(g, m, t, day, night, hzc); /* le relief du milieu, selon le sol (loi 7), avec ou sans rive */
  if (S.suns === 0 && S.world !== "cavern" && m.night) darkLight(g, m, t, hzc);
  if (m._moonlight && night > 0.3) { const ml = Math.min(1, m._moonlight) * (night - 0.3) / 0.7, gg = g.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, css([180, 196, 232], 0.2 * ml)); gg.addColorStop(1, css([180, 196, 232], 0.06 * ml)); g.fillStyle = gg; g.fillRect(0, hz, W, H - hz); } /* ESSAI : une nuit de pleine lune éclaire le sol d'une lumière froide */
  m._moonlight = 0; /* ESSAI : un monde sans soleil montre ce qui l'éclaire */
  if (m.airK && m.airK.thick > 0.05) { const D = H - hz, hg = g.createLinearGradient(0, hz, 0, hz + D * 0.45); hg.addColorStop(0, css(mixc(hzc, [240, 235, 220], 0.3), 0.55 * m.airK.thick)); hg.addColorStop(1, css(hzc, 0)); g.fillStyle = hg; g.fillRect(0, hz, W, D * 0.45); } /* ESSAI : un air épais écrase la profondeur : le lointain se noie */
  WON.wonderPass(g, m, t, "relief", k0); /* ESSAI : ce qui se dessine par-dessus le relief du milieu (l'Inachevé) */
  const offW = offWater(g, m); /* ESSAI : rien ne pousse sur la rivière ni sur l'étang */
  if (S.primeval) primeval(g, m, t, day, night); /* un monde trop jeune pour les arbres : des Prototaxites */
  else if (S.alive && !S.trees) lowFlora(g, m, t, day, night); /* la flore basse du climat, pour les Âges vivants sans arbres */
  if (S.columns || S.rock === "basalt" || (S.extras || []).some((e) => e.id === "basalt")) basaltColumns(g, m, t, day, night, hzc); /* l'escarpement d'orgues, au loin (aussi au bord de la mer) */
  if (m.meadow) { const lf = metalFilter(S) || leafFilter(S); if (lf) { g.save(); g.filter = lf; } meadowGround(g, m, t, night, L, hzc); if (lf) g.restore(); }
  scarPass(g, m, () => scarGround(g, m, t, night));
  groundWeather(g, m, t, night, L); // fleurs, neige au sol, verglas, cendre
  richGlints(g, m, t, night);
  extraAt(g, m, t, "ground");
  WON.wonderPass(g, m, t, "ground", k0);
  if (m.garden) gardenGround(g, m, t, day, night, hzc); /* ESSAI : le jardin */
  if (offW) g.restore();
  seaLife(g, m, t, night);
  // fissure
  if (S.fissure) { const wet = m.shore && S.fissure === "submarine"; if (wet) { g.save(); shorePath(g, m.shore.wet); g.clip(); } fissure(g, m, t); if (wet) g.restore(); }

  // arbres
  m.dayK = day; m.nightK = night; if (S.trees) { const mf = metalFilter(S); if (mf && S.wonderMetal && metalLayer(g, m, t, mf, day)) { /* dessinés en métal poli */ } else { if (mf) { g.save(); g.filter = mf; } trees(g, m, t); if (mf) g.restore(); } } /* ESSAI : l'arbre fait du métal qu'il a bu, ou terni */
  // ruines
  ruinsPass(g, m, t);
  detail(g, m, t, night);
  if (m.garden) gardenGround(g, m, t, day, night, hzc, "hedge"); /* ESSAI : la haie devant les arbres et les ruines de l'horizon : leur pied est derrière elle */
  if (S.glow || S.moths) for (let p = 0, np = Math.round(clamp(12 * (S.amt ? (S.moths ? (S.amt.moths != null ? S.amt.moths : 1) : (S.amt.glow != null ? S.amt.glow : 1)) : 1), 3, 40)); p < np; p++) { const q = rng(S.seed + p * 13), x = q() * W, y = hz - q() * H * 0.12, a = 0.35 + 0.5 * Math.sin(TAU * (t * (S.moths ? 2 : 1) + q())); g.fillStyle = css(S.glow ? [140, 255, 190] : [255, 230, 160], Math.max(0, a) * 0.8); g.beginPath(); g.arc(x + (S.moths ? 5 * Math.sin(TAU * (t * 2 + q())) : 0), y + (S.moths ? 3 * Math.cos(TAU * (t * 3 + q())) : 0), 1.4, 0, TAU); g.fill(); }
  for (const e of m.eyes) { const o = Math.sin(TAU * (t * 1 + e.p)); if (o > -0.7) { g.fillStyle = css([255, 200, 90], 0.8); g.fillRect(e.x - 3, e.y, 1.6, 1.6); g.fillRect(e.x + 2, e.y, 1.6, 1.6); } }
  if (m.shore) { g.save(); shorePath(g, m.shore.wet); g.clip(); reflect(g, m, t, 0.5); g.restore(); shoreEdge(g, m, t, night); } // le reflet ne couvre que l'eau ; l'écume par-dessus
  else if (S.ice) reflect(g, m, t, 0.34); else if (S.water && S.waterGround !== false) reflect(g, m, t, m.mirror ? 0.78 : 0.5); else if (S.soil === "salt" && !S.sand) reflect(g, m, t, 0.18); /* le sel luit comme un miroir terne */
  if (m.fedGlow && (m.shore || (S.water && !S.ice)) && night > 0.05) fedAlgae(g, m, t, night);
  extraAt(g, m, t, "air");
  WON.wonderPass(g, m, t, "air", k0);
  scarPass(g, m, () => { scarAir(g, m, t); scarHeld(g, m, t); });
  weather(g, m, t);
  const framed = S.view && ((S.view.kind !== "plain" && S.view.kind !== "low") || S.view.near);
  if (framed) { if (S.ice) frost(g, m, t, night); viewFrame(g, m, t, hzc, day, night); } /* ESSAI : le point de liaison cadre la vue (le givre est dehors, pas sur la roche) */
  else { const lf = ['leaves', 'vines', 'tallgrass', 'branches'].includes(m.fg.kind) && (metalFilter(S) || (m.fg.kind !== 'branches' && leafFilter(S))); if (lf) { g.save(); g.filter = lf; } foreground(g, m, t, hzc); if (lf) g.restore(); if (S.ice) frost(g, m, t, night); }
  if (S.phys && S.phys.light < 0.35 && !S.blackSun) { g.fillStyle = css([4, 5, 12], 0.45 * (1 - S.phys.light / 0.35) * (0.4 + 0.6 * day)); g.fillRect(0, 0, W, H); } // peu de lumière visible au sol : un jour terne
  if (S.phys && S.phys.T && !S.blackSun && S.suns > 0 && day > 0.05) starLight(g, m, day); /* ESSAI : le paysage baigne dans la couleur de son étoile */
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (S.blackSun) { // soleil noir : les couleurs s'éteignent en gris, seule la couronne garde son rouge
    g.save(); g.globalCompositeOperation = "saturation"; g.globalAlpha = 0.8; g.fillStyle = "#808080"; g.fillRect(0, 0, W, H); g.restore();
    { const tone = [[200, 0.22], [32, 0.3], [150, 0.18], [275, 0.2], [0, 0]][(S.seed >>> 5) % 5]; if (tone[1]) { g.save(); g.globalCompositeOperation = "color"; g.globalAlpha = 0.35; g.fillStyle = css(hsl(tone[0], tone[1], 0.5)); g.fillRect(0, 0, W, H); g.restore(); } } /* ESSAI : le monde éteint garde un ton à lui (froid, sépia, vert-de-gris, violet, ou gris pur) ; la couronne reste rouge */
    const s0b = sn.find((x) => x.i === 0);
    if (s0b && s0b.y - s0b.r * 1.3 < hz) { // la couronne reste dans le ciel : les crêtes la cachent comme elles cachent le disque
      const yAt = (x) => m.ridges.reduce((lo, rg) => { const n = rg.xs.length - 1, f = Math.max(0, Math.min(n, (x / W) * n)), i = Math.floor(f), y = rg.xs[i] + (rg.xs[Math.min(n, i + 1)] - rg.xs[i]) * (f - i); return Math.min(lo, y); }, hz);
      g.save(); g.beginPath(); g.moveTo(0, -1); g.lineTo(W, -1); for (let k = 64; k >= 0; k--) { const x = (k / 64) * W; g.lineTo(x, yAt(x)); } g.closePath(); g.clip();
      g.strokeStyle = "rgba(150,52,40,0.75)"; g.lineWidth = Math.max(1.2, s0b.r * 0.22); g.beginPath(); g.arc(s0b.x, s0b.y, s0b.r * 1.08, 0, TAU); g.stroke(); g.restore();
    }
  }
  if (dm > 0) doomFx(g, m, dm, sn);
  if (S.seams && S.seams.length) seamsFx(g, m, t); /* porter : la couture, la coupe */
  g.restore();
}
/* la couleur d'une famille de sol vue de loin : [sombre, clair] (src/torus.js) */
const FAM_RGB = TOR.FAM_RGB;
/**
 * Un lieu porté à contre-sens (claude/DESIGN-art-bahro.md §12, la clause de Torus) : sa terre au-dessus de la tête, haute et lointaine, mangée par l'air
 * (choix de l'auteur : « plus haute, plus loin ») ; la forme vient des crêtes de la fenêtre, renversées ; un fil de lumière au bord. Renvoie le bord.
 */
function contraFx(g, m, t, f, air) {
  const { W, hz } = m, [lo, hi] = FAM_RGB[f.what] || FAM_RGB.stone, base = hz * 0.1, N = 96, edge = [], rel = [];
  const ridgeY = (x) => m.ridges.reduce((lo2, rg) => { const n = rg.xs.length - 1, k = Math.max(0, Math.min(n, (x / W) * n)), i = Math.floor(k), y = rg.xs[i] + (rg.xs[Math.min(n, i + 1)] - rg.xs[i]) * (k - i); return Math.min(lo2, y); }, hz);
  const sh = fnv(String(f.from)) % W;
  for (let i = 0; i <= N; i++) { const x = (i / N) * W; rel.push([x, hz - ridgeY(W - ((x + sh) % W))]); }
  const mx = Math.max(...rel.map((e) => e[1])), mn = Math.min(...rel.map((e) => e[1]));
  for (const [x, r] of rel) edge.push([x, base + ((r - mn) / Math.max(1, mx - mn)) * hz * 0.16]);
  const deep = Math.max(...edge.map((e) => e[1])), gr = g.createLinearGradient(0, 0, 0, deep);
  gr.addColorStop(0, css(mixc(lo, air, 0.45))); gr.addColorStop(0.7, css(mixc(lo, air, 0.62))); gr.addColorStop(1, css(mixc(hi, air, 0.8)));
  g.save(); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); for (const [x, y] of edge) g.lineTo(x, y); g.lineTo(W, 0); g.closePath(); g.fill();
  g.fillStyle = css(mixc(lo, air, 0.5), 0.5); g.beginPath(); g.moveTo(0, 0); for (const [x, y] of edge) g.lineTo(x, base * 0.6 + (y - base) * 0.45); g.lineTo(W, 0); g.closePath(); g.fill(); /* un plan plus loin */
  if (f.what === "forest") { const q = rng(fnv("trees" + f.from)); g.fillStyle = css(mixc(lo, air, 0.55), 0.8); for (let i = 0; i < 40; i++) { const [x, e] = edge[Math.floor(q() * N)], h = 2 + q() * 3; g.beginPath(); g.moveTo(x - 1.4, e - 1); g.lineTo(x, e + h); g.lineTo(x + 1.4, e - 1); g.fill(); } } /* des arbres, pointe en bas */
  const p = 0.75 + 0.25 * Math.sin(TAU * t * 0.4);
  g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(235,245,255,${0.4 * p})`; g.lineWidth = 0.7; g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.strokeStyle = `rgba(200,230,255,${0.1 * p})`; g.lineWidth = 3; g.stroke();
  g.restore();
  return edge;
}
/**
 * Les coutures d'un Âge porté (claude/DESIGN-art-bahro.md §12.6) : un ciel porté, un fil de lumière le long de l'horizon ; un lieu porté, une coupe nette
 * qui descend de l'horizon, la terre de l'autre monde d'un côté (la route coupée d'Obduction, choix de l'auteur). La boucle est un tore, peint dans le ciel
 * (src/torus.js) ; le lieu à contre-sens est peint plus tôt (contraFx), derrière les crêtes.
 */
function seamsFx(g, m, t) {
  const { S, W, H, hz } = m, pulse = 0.75 + 0.25 * Math.sin(TAU * t * 0.4);
  S.seams.forEach((f, k) => {
    if (f.contra) return;
    g.save();
    if (f.what === "sky") {
      g.globalCompositeOperation = "lighter";
      const gr = g.createLinearGradient(0, hz - 3, 0, hz + 3); gr.addColorStop(0, "rgba(200,230,255,0)"); gr.addColorStop(0.5, `rgba(220,240,255,${0.35 * pulse})`); gr.addColorStop(1, "rgba(200,230,255,0)");
      g.fillStyle = gr; g.fillRect(0, hz - 3, W, 6);
      g.strokeStyle = `rgba(240,250,255,${0.55 * pulse})`; g.lineWidth = 0.8; g.beginPath(); for (let x = 0; x <= W; x += 8) { const y = hz - 0.5 + 0.8 * Math.sin(x * 0.11 + k); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    } else {
      const x0 = W * (0.42 + 0.2 * ((fnv(String(f.from) + f.what) % 100) / 100)), lean = 0.22, [lo, hi] = FAM_RGB[f.what] || FAM_RGB.stone;
      g.save(); g.beginPath(); g.moveTo(x0, hz); g.lineTo(x0 + (H - hz) * lean, H); g.lineTo(W, H); g.lineTo(W, hz); g.closePath(); g.clip();
      const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, css(mixc(hi, [200, 210, 220], 0.4), 0.5)); gr.addColorStop(1, css(lo, 0.6)); g.fillStyle = gr; g.fillRect(0, hz - 1, W, H - hz + 1);
      g.restore();
      g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(235,245,255,${0.6 * pulse})`; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x0, hz); g.lineTo(x0 + (H - hz) * lean, H); g.stroke();
      g.strokeStyle = `rgba(200,230,255,${0.15 * pulse})`; g.lineWidth = 4; g.stroke();
    }
    g.restore();
  });
}

/** Le lac de D'ni : les algues lumineuses, nourries par le granulé, luisent dans l'eau la nuit, et palpitent lentement (plus fort s'il y a des algues écrites). */
function fedAlgae(g, m, t, night) {
  const { S } = m, k = night * (S.algae ? 1 : 0.7);
  g.save(); if (m.shore) { shorePath(g, m.shore.wet); g.clip(); } g.globalCompositeOperation = "lighter";
  for (const b of m.fedGlow) { const pulse = 0.55 + 0.45 * Math.sin(TAU * (t + b.p)), gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.2); gr.addColorStop(0, css([110, 255, 190], 0.45 * k * pulse)); gr.addColorStop(0.4, css([60, 210, 160], 0.18 * k * pulse)); gr.addColorStop(1, css([40, 160, 120], 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(b.x, b.y, b.r * 2.2, b.r * 0.8, 0, 0, TAU); g.fill(); }
  g.restore();
}

/** L'herbe et la prairie : la terre verdit, et le vent passe sur les brins en longues vagues (plus fortes avec du vent). */
function meadowGround(g, m, t, night, L, hzc) {
  const { S, W, H, hz, shore, meadow: md } = m;
  if (S.water && !shore) return; // une mer : pas d'herbe
  if (S.world === "lava" || S.world === "desert" || (S.ice && !shore)) return;
  g.save(); if (shore) { shorePath(g, shore.land); g.clip(); }
  const se = S.season, dk = [6, 7, 12], lit = 1 - 0.6 * night, tint = (c) => (se ? mixc(mixc(c, [150, 138, 96], (1 - se.vig) * 0.75), [168, 112, 48], se.fall * 0.6) : c); /* l'herbe : paille l'hiver, rousse à l'automne */
  const base = tint(md.tall ? [86, 120, 58] : [74, 108, 54]), fl = se ? Math.max(clamp((se.vig - 0.35) / 0.4), se.bloom) : 1;
  const lg = g.createLinearGradient(0, hz, 0, H); lg.addColorStop(0, css(mixc(mixc(base, hzc || base, 0.3), dk, 0.3 + 0.5 * night), 0.55)); lg.addColorStop(1, css(mixc(base, dk, 0.35 + 0.5 * night), 0.7));
  g.fillStyle = lg; g.fillRect(0, hz, W, H - hz);
  const gust = 0.8 + ((L && L.wind) || (S.wind ? 1 : 0)) * 1.6, D = H - hz;
  g.lineWidth = 0.8; g.lineCap = "round";
  for (const b of md.blades) {
    const y = hz + D * b.u * b.u, k = 0.35 + b.u * 1.1, wave = Math.sin(TAU * t - (b.x / W) * 5 + b.u * 2), sw = (wave * 0.8 + Math.sin(TAU * t * 2 + b.p) * 0.25) * gust * k;
    const col = mixc(tint(mixc([92, 134, 66], [158, 160, 88], b.dry * (md.tall ? 0.6 : 0.35))), dk, 0.3 + 0.5 * night);
    g.strokeStyle = css(col, (0.45 + 0.4 * b.u) * lit + 0.15); g.beginPath(); g.moveTo(b.x, y); g.quadraticCurveTo(b.x + sw * 0.4, y - b.h * k * 0.6, b.x + sw, y - b.h * k); g.stroke();
  }
  const ff = g.filter; if (ff && ff !== "none") g.filter = "none"; /* ESSAI : les fleurs gardent leurs couleurs (le feuillage, lui, suit l'étoile) */
  for (const f of md.flowers) { // prairie : des fleurs dans les herbes hautes, qui bougent avec elles
    const y = hz + D * f.u * f.u, k = 0.35 + f.u * 1.1, wave = Math.sin(TAU * t - (f.x / W) * 5 + f.u * 2) * gust * k, r = (0.8 + f.s) * k;
    if (fl <= 0.01) break; bloom(g, f.x + wave, y - 9 * k, r * 1.3, mixc(hsl(f.hue, 0.55, 0.72), dk, 0.2 + 0.6 * night), 0.85 * lit * fl, f.p);
  }
  g.restore();
}

/** ESSAI : une fleur qu'on lit comme une fleur : cinq pétales autour d'un cœur clair quand elle est assez grande, un point au loin. */
function bloom(g, x, y, r, col, a, rot = 0, heart = [250, 226, 120]) {
  g.fillStyle = css(col, a);
  if (r < 1.6) { g.beginPath(); g.arc(x, y, Math.max(0.6, r), 0, TAU); g.fill(); return; }
  g.beginPath(); for (let k = 0; k < 5; k++) { const an = rot + (k * TAU) / 5, px = x + Math.cos(an) * r * 0.62, py = y + Math.sin(an) * r * 0.5; g.moveTo(px + r * 0.48, py); g.ellipse(px, py, r * 0.48, r * 0.36, an, 0, TAU); } g.fill();
  g.fillStyle = css(heart, a); g.beginPath(); g.arc(x, y, r * 0.24, 0, TAU); g.fill();
}
/** ESSAI : ce qui pousse sur la terre ne pousse pas sur l'eau : le chemin de découpe de tout, moins la rivière et l'étang. */
function offWater(g, m) {
  const rp = m.riverPoly, pd = m.pond; if (!(rp && rp.length) && !pd) return false;
  g.save(); g.beginPath(); g.rect(0, 0, m.W, m.H);
  if (rp && rp.length) { rp.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  if (pd) { g.moveTo(pd.cx + pd.rx * 1.04, pd.cy); g.ellipse(pd.cx, pd.cy, pd.rx * 1.04, pd.ry * 1.08, 0, 0, TAU); }
  g.clip("evenodd"); return true;
}
/** ESSAI : l'étang : la berge, l'eau qui prend le ciel, les rides, les nénuphars, les carpes qui tournent sous la surface. */
function pondWater(g, m, t, day, night, hzc, top) {
  const P = m.pond, lit = 1 - 0.6 * night, { cx, cy, rx, ry } = P;
  if (m.S.garden) { const st = stoneOf(m); g.fillStyle = css(st.low); g.beginPath(); g.ellipse(cx, cy + ry * 0.12, rx * 1.1, ry * 1.28, 0, 0, TAU); g.fill(); g.fillStyle = css(st.top); g.beginPath(); g.ellipse(cx, cy, rx * 1.08, ry * 1.2, 0, 0, TAU); g.fill(); g.strokeStyle = css(st.joint, 0.5); g.lineWidth = Math.max(0.6, m.W / 800); for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * rx * 1.0, cy + Math.sin(a) * ry * 1.04); g.lineTo(cx + Math.cos(a) * rx * 1.08, cy + Math.sin(a) * ry * 1.2); g.stroke(); } } /* ESSAI : au jardin, un bassin cerclé d'une margelle */
  else { g.fillStyle = css(mixc(m.pal.ground, [20, 16, 10], 0.4)); g.beginPath(); g.ellipse(cx, cy + ry * 0.06, rx * 1.06, ry * 1.16, 0, 0, TAU); g.fill(); } // la berge
  const water = mixc(mixc(hzc, top, 0.45), [16, 40, 46], 0.3 + 0.45 * night), wg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  wg.addColorStop(0, css(mixc(water, [8, 18, 20], 0.35))); wg.addColorStop(0.45, css(mixc(water, hzc, 0.35 * lit))); wg.addColorStop(1, css(water));
  g.fillStyle = wg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
  for (const k of P.koi) { const a = k.a + TAU * t * k.sp * 0.25, x = cx + Math.cos(a) * rx * k.d, y = cy + Math.sin(a) * ry * k.d, dir = a + (k.sp > 0 ? Math.PI / 2 : -Math.PI / 2), L = rx * 0.07; // les carpes, sous la surface
    g.save(); g.translate(x, y); g.rotate(Math.atan2(Math.sin(dir) * ry, Math.cos(dir) * rx)); g.globalAlpha = 0.78;
    g.fillStyle = css(mixc(k.c, water, 0.25 + 0.4 * night)); g.beginPath(); g.ellipse(0, 0, L, L * 0.32, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-L * 0.9, 0); g.lineTo(-L * 1.5, -L * 0.3 * (1 + 0.4 * Math.sin(TAU * t * 3 + k.a))); g.lineTo(-L * 1.5, L * 0.3); g.closePath(); g.fill();
    if (k.spot) { g.fillStyle = css(mixc([226, 70, 30], water, 0.3)); g.beginPath(); g.arc(L * 0.25, 0, L * 0.18, 0, TAU); g.fill(); }
    g.restore(); }
  g.strokeStyle = css(mixc(hzc, [255, 255, 255], 0.4), 0.25 * lit); g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { const f = frac(t * 0.5 + i / 3); g.globalAlpha = 1 - f; g.beginPath(); g.ellipse(cx + rx * 0.25 * Math.sin(P.ph + i * 2), cy + ry * 0.2 * Math.cos(P.ph + i), rx * 0.06 + rx * 0.22 * f, ry * 0.06 + ry * 0.22 * f, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1;
  g.fillStyle = css(mixc(hzc, [255, 255, 255], 0.5), 0.18 * lit); g.fillRect(cx - rx * 0.6, cy - ry * 0.35, rx * 1.2, Math.max(1, ry * 0.05)); // le reflet du ciel
  g.restore();
  const lf = leafFilter(m.S); if (lf) { g.save(); g.filter = lf; }
  for (const p of P.pads) { const x = cx + p.u * rx * 0.92, y = cy + p.v * ry * 0.92, s = rx * 0.065 * p.s * (0.8 + 0.4 * (p.v + 1) / 2); // les nénuphars : une feuille ronde fendue
    g.fillStyle = css(mixc([58, 104, 52], [8, 12, 10], 0.25 + 0.5 * night)); g.beginPath(); g.moveTo(x, y); g.ellipse(x, y, s, s * 0.42, 0, p.r, p.r + TAU * 0.9); g.closePath(); g.fill();
    g.strokeStyle = css([120, 160, 90], 0.3 * lit); g.lineWidth = 0.6; g.beginPath(); g.ellipse(x, y, s, s * 0.42, 0, p.r, p.r + TAU * 0.9); g.stroke(); }
  if (lf) g.restore();
  for (const p of P.pads) if (p.bloom) { const x = cx + p.u * rx * 0.92, y = cy + p.v * ry * 0.92, s = rx * 0.065 * p.s; bloom(g, x + s * 0.2, y - s * 0.25, s * 0.7, mixc(hsl(p.hue, 0.6, 0.78), [10, 12, 20], 0.5 * night), 0.95, p.r); }
}
/** ESSAI : le jardin : la haie taillée et ses entrées, les allées de haie, les massifs de fleurs. */
function gardenGround(g, m, t, day, night, hzc, part = "ground") { /* part : "ground" (les allées, sous les arbres) ou "hedge" (la haie et les massifs, devant les arbres, les ruines et l'étrangeté de l'horizon) */
  /* ESSAI (28 oct. soir) : une haie verte taillée (la couleur du feuillage suit l'étoile, comme les arbres), des allées de gravier qui passent par ses ouvertures
     et viennent vers nous, bordées de buis ; des massifs bordés où l'on voit les fleurs. Plus de pans de haie en parallélogramme. */
  const Gd = m.garden, { W, H, hz, S } = m, sc = W / 560, lit = 1 - 0.6 * night, D = H - hz, q = rng((S.seed ^ 0x9a7de) >>> 0);
  const shadeN = (c) => mixc(c, [6, 8, 12], 0.2 + 0.55 * night), leaf = shadeN(leafC(S, [46, 90, 44])), lite = shadeN(mixc(leafC(S, [92, 140, 70]), [200, 220, 150], 0.25 * (0.4 + 0.6 * day))), deep = shadeN(leafC(S, [24, 50, 26]));
  const h = Gd.h, y = Gd.y, gaps = Gd.gaps.slice().sort((a, b) => a.x - b.x), segs = []; let x = 0;
  for (const gp of gaps) { if (gp.x - gp.w / 2 > x + 2) segs.push([x, gp.x - gp.w / 2]); x = gp.x + gp.w / 2; } if (x < W) segs.push([x, W]);
  /* les allées : du seuil de chaque ouverture jusqu'au pied de la vue, en s'élargissant */
  const gravel = shadeN(mixc(mixc(m.pal.ground, [206, 192, 156], 0.6), [0, 0, 0], 0.08)), edge = shadeN(mixc(gravel, [0, 0, 0], 0.35));
  const P = m.pond;
  if (part === "ground") { /* ESSAI : une allée qui rencontre le bassin s'arrête à sa margelle (on y mène), au lieu de passer dessous */
  for (const gp of gaps) { let x0 = gp.x, w0 = gp.w * 0.9, x1 = x0 + (x0 - W / 2) * 0.9, w1 = gp.w * 6, yEnd = H;
    if (P) { for (let k = 1; k <= 40; k++) { const u = k / 40, yy = y + (H - y) * u, xc = x0 + (x1 - x0) * u, ww = (w0 + (w1 - w0) * u) / 2, dy = (yy - P.cy) / (P.ry * 1.2); if (Math.abs(dy) < 1) { const half = P.rx * 1.08 * Math.sqrt(1 - dy * dy); if (Math.abs(xc - P.cx) < half + ww) { yEnd = Math.min(H, P.cy); break; } } } }
    if (yEnd < H) { const u = (yEnd - y) / (H - y); x1 = x0 + (x1 - x0) * u; w1 = w0 + (w1 - w0) * u; } const Hy = yEnd;
    g.fillStyle = css(gravel); g.beginPath(); g.moveTo(x0 - w0 / 2, y); g.lineTo(x0 + w0 / 2, y); g.lineTo(x1 + w1 / 2, Hy); g.lineTo(x1 - w1 / 2, Hy); g.closePath(); g.fill();
    g.fillStyle = css([255, 255, 255], 0.06 * lit); for (let k = 0; k < 40; k++) { const u = q(), yy = y + (Hy - y) * u * u, xc = x0 + (x1 - x0) * u * u, ww = (w0 + (w1 - w0) * u * u) / 2; g.fillRect(xc + (q() - 0.5) * 2 * ww, yy, 1.2 * sc, 0.8 * sc); } /* le grain du gravier */
    const bw = 7 * sc * (Hy - y) / (H - y); for (const sd of [-1, 1]) { g.fillStyle = css(deep); g.beginPath(); g.moveTo(x0 + sd * w0 / 2, y); g.lineTo(x1 + sd * w1 / 2, Hy); g.lineTo(x1 + sd * (w1 / 2 + bw), Hy); g.lineTo(x0 + sd * (w0 / 2 + 1 * sc), y); g.closePath(); g.fill();
      g.fillStyle = css(leaf); g.beginPath(); g.moveTo(x0 + sd * w0 / 2, y - 0.6 * sc); g.lineTo(x1 + sd * w1 / 2, Hy - bw * 0.85); g.lineTo(x1 + sd * (w1 / 2 + bw), Hy - bw * 0.85); g.lineTo(x0 + sd * (w0 / 2 + 1 * sc), y - 0.6 * sc); g.closePath(); g.fill(); } /* les bordures de buis */
    g.strokeStyle = css(edge, 0.5); g.lineWidth = 0.8 * sc; g.beginPath(); g.moveTo(x0 - w0 / 2, y); g.lineTo(x1 - w1 / 2, Hy); g.moveTo(x0 + w0 / 2, y); g.lineTo(x1 + w1 / 2, Hy); g.stroke(); }
  return; }
  /* la haie : un corps dense, le dessus taillé en petites bosses, une lumière sur le dessus, une ombre au pied, le grain des feuilles */
  for (const [a, b] of segs) {
    g.fillStyle = css(leaf); g.beginPath(); g.moveTo(a, y); g.lineTo(a, y - h * 0.85); g.quadraticCurveTo(a, y - h, a + h * 0.15, y - h); g.lineTo(b - h * 0.15, y - h); g.quadraticCurveTo(b, y - h, b, y - h * 0.85); g.lineTo(b, y); g.closePath(); g.fill();
    g.fillStyle = css(lite); const r = Math.max(1.2, h * 0.16); for (let xx = a + r; xx < b - r * 0.5; xx += r * 1.6) { g.beginPath(); g.ellipse(xx, y - h + r * 0.3, r, r * 0.55, 0, Math.PI, TAU); g.fill(); } g.fillRect(a + h * 0.1, y - h + r * 0.25, b - a - h * 0.2, Math.max(1, h * 0.12)); /* le dessus taillé, au soleil */
    const n = Math.round((b - a) * h / (14 * sc * sc)); for (let k = 0; k < n; k++) { const xx = a + q() * (b - a), yy = y - h * (0.1 + 0.72 * q()), dk = q() < 0.55; g.fillStyle = css(dk ? deep : lite, dk ? 0.55 : 0.35); g.beginPath(); g.ellipse(xx, yy, (1.4 + q() * 1.6) * sc, (0.9 + q()) * sc, q() * 3, 0, TAU); g.fill(); } /* le grain des feuilles */
    g.fillStyle = css([0, 0, 0], 0.28); g.fillRect(a, y - h * 0.14, b - a, h * 0.14); g.fillStyle = css([0, 0, 0], 0.18); g.fillRect(a, y, b - a, Math.max(1, h * 0.12)); /* l'ombre au pied */
  }
  /* les massifs : une terre sombre bordée de buis, des fleurs qu'on voit */
  for (const b of Gd.beds) {
    const qb = rng(b.seed), yb = hz + D * b.u * b.u + D * 0.12, k = (0.45 + b.u * 1.25) * sc, rw = W * 0.07 * b.w * k / sc, rh = rw * 0.3;
    if (gaps.some((gp) => { const u = (yb - y) / (H - y), xc = gp.x + (gp.x - W / 2) * 0.9 * u, ww = (gp.w * 0.9 + (gp.w * 6 - gp.w * 0.9) * u) / 2; return Math.abs(b.x - xc) < ww + rw; }) || (P && Math.abs(yb - P.cy) < P.ry * 1.3 + rh && Math.abs(b.x - P.cx) < P.rx * 1.1 + rw)) continue; /* pas sur une allée, ni sur le bassin */
    g.fillStyle = css(deep); g.beginPath(); g.ellipse(b.x, yb + 1.2 * k, rw + 2.4 * k, rh + 1.6 * k, 0, 0, TAU); g.fill(); /* la bordure, dans l'ombre */
    g.fillStyle = css(leaf); g.beginPath(); g.ellipse(b.x, yb, rw + 2.4 * k, rh + 1.4 * k, 0, 0, TAU); g.fill();
    g.fillStyle = css(shadeN(mixc(m.pal.ground, [40, 26, 18], 0.5))); g.beginPath(); g.ellipse(b.x, yb, rw, rh, 0, 0, TAU); g.fill();
    const nf = Math.round(b.n * 1.4); for (let i = 0; i < nf; i++) { const a = qb() * TAU, d = Math.sqrt(qb()), fx = b.x + Math.cos(a) * rw * d * 0.85, fy = yb + Math.sin(a) * rh * d * 0.75, hue = b.hue + (qb() - 0.5) * 30, hh = (2 + 2.5 * qb()) * k;
      g.strokeStyle = css(leaf); g.lineWidth = Math.max(0.5, 0.6 * k); g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - hh); g.stroke();
      bloom(g, fx, fy - hh, (2 + 1.6 * qb()) * k, mixc(hsl(hue, 0.66, 0.68), [10, 12, 20], 0.15 + 0.6 * night), 0.92 * lit + 0.08, qb() * TAU); }
  }
}

/** Dunes de sable (sol entier, ou rive de sable). */
function dunes(g, m) {
  const { W, H, hz, pal } = m;
  for (let p = 0; p < 3; p++) { g.fillStyle = css(mixc(pal.ground, [120, 90, 55], 0.25 + 0.15 * p)); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, hz + H * (0.07 + 0.06 * p) + H * 0.025 * Math.sin(x / W * TAU * (1 + p) + p * 2)); g.lineTo(W, H); g.closePath(); g.fill(); }
}
// ---- les formes des sols (28 oct. 2026) ----------------------------------------------------------------
/* le sol vu en perspective : u en travers, z en profondeur (1 = au pied de la fenêtre) ; y = hz + (H - hz) / z */
const proj = (m, u, z) => [m.W / 2 + (u * m.W * 0.55) / z, m.hz + (m.H - m.hz) / z];
const hjit = (seed, a, b) => { const q = rng((seed ^ Math.imul(Math.round(a * 97) | 0, 73856093) ^ Math.imul(Math.round(b * 97) | 0, 19349663)) >>> 0); return [q() - 0.5, q() - 0.5]; };
/** Cellules hexagonales du sol (sommets partagés, un peu tordus) : appelle f(poly projeté, profondeur, tirage) du plus loin au plus près. */
function hexCells(m, size, jit, zMax, f) {
  const h = Math.sqrt(3) * size, cells = [];
  for (let i = -60; i <= 60; i++) for (let j = 0; j * h < zMax + h; j++) {
    const cu = i * 1.5 * size, cw = j * h + (i & 1 ? h / 2 : 0), z = 1 + cw; if (z > zMax || Math.abs(cu) > z * 1.05 + size * 2) continue;
    const poly = []; let ok = true;
    for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k, vu = cu + size * Math.cos(a), vw = cw + size * Math.sin(a), [ju, jw] = hjit(m.S.seed, vu, vw), zz = 1 + vw + jw * jit * size; if (zz < 0.35) { ok = false; break; } poly.push(proj(m, vu + ju * jit * size, zz)); }
    if (ok) cells.push({ poly, z, r: rng((m.S.seed ^ (i * 7919 + j * 104729)) >>> 0)() });
  }
  cells.sort((a, b) => b.z - a.z); for (const c of cells) f(c.poly, c.z, c.r);
}
const polyPath = (g, poly) => { g.beginPath(); poly.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
/** Le sel : une plaine blanche, craquelée en polygones aux bords relevés ; elle prend la couleur du ciel au loin. */
function saltFlat(g, m, t, day, night, hzc) {
  const { W, H, hz } = m, lit = 0.25 + 0.75 * day * (1 - 0.7 * night), white = mixc([236, 238, 240], hzc, 0.25), base = mixc(mixc([24, 26, 34], white, lit), [12, 14, 22], night * 0.6);
  const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, css(mixc(base, hzc, 0.55))); gr.addColorStop(0.35, css(base)); gr.addColorStop(1, css(mixc(base, [120, 116, 108], 0.25))); g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
  hexCells(m, 0.3, 0.6, 22, (poly, z) => {
    const a = Math.min(1, 2.6 / z); if (a < 0.05) return;
    polyPath(g, poly); g.lineWidth = Math.max(0.35, 1.5 / z); g.strokeStyle = css(mixc(base, [255, 255, 255], 0.65), 0.55 * a * lit + 0.05); g.stroke(); /* le bourrelet de sel, clair */
    g.save(); g.translate(0, Math.max(0.3, 1.1 / z)); polyPath(g, poly); g.lineWidth = Math.max(0.3, 0.9 / z); g.strokeStyle = css(mixc(base, [70, 74, 86], 0.8), 0.5 * a); g.stroke(); g.restore(); /* son ombre, la fente */
  });
}
/** les Prototaxites d'un monde jeune (loi 12) : des colonnes fibreuses au sommet arrondi, gris-brun, de hauteurs inégales, et au pied des plantes primitives aux tiges fourchues et aux capsules jaunes. */
function primeval(g, m, t, day, night) {
  const { W, H, hz, S } = m, q = rng((S.seed ^ 0x9e70) >>> 0), amb = 0.3 + 0.7 * day, C = (c, a) => css(mixc([5, 6, 12], leafC(S, c), amb), a), n = 5 + Math.floor(q() * 6);
  const cols = Array.from({ length: n }, () => { const z = 1.2 + q() * 6, y = hz + (H - hz) / z; return { x: W * (0.04 + 0.92 * q()), y, k: 2.6 / z, z, h: (40 + q() * 70) * (2.6 / z), w: (4 + q() * 3) * (2.6 / z), tone: q(), lean: (q() - 0.5) * 0.08 }; }).sort((a, b) => b.z - a.z);
  const tufts = (P, cnt) => { for (let j = 0; j < cnt; j++) { const bx = P.x + (q() - 0.5) * 40 * P.k, by = P.y + q() * 4 * P.k, hh = (5 + q() * 6) * P.k; g.strokeStyle = C([84, 128, 60]); g.lineWidth = Math.max(0.5, 0.7 * P.k); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - hh * 0.6); g.lineTo(bx - 2 * P.k, by - hh); g.moveTo(bx, by - hh * 0.6); g.lineTo(bx + 2 * P.k, by - hh * 0.95); g.stroke(); g.fillStyle = C([214, 180, 70]); g.beginPath(); g.ellipse(bx - 2 * P.k, by - hh - 0.8 * P.k, 0.7 * P.k + 0.3, 1.1 * P.k + 0.3, 0, 0, TAU); g.ellipse(bx + 2 * P.k, by - hh * 0.95 - 0.8 * P.k, 0.7 * P.k + 0.3, 1.1 * P.k + 0.3, 0, 0, TAU); g.fill(); } };
  for (const P of cols) {
    const base = mixc([118, 108, 88], [96, 104, 84], P.tone), hiC = mixc(base, [235, 228, 205], 0.35), loC = mixc(base, [20, 18, 14], 0.5), top = P.y - P.h, cx = P.x + P.lean * P.h;
    g.save(); g.beginPath(); g.moveTo(P.x - P.w * 1.15, P.y + 1); g.bezierCurveTo(P.x - P.w * 1.05, P.y - P.h * 0.4, cx - P.w * 0.95, top + P.w * 1.6, cx - P.w * 0.75, top + P.w * 0.6); g.quadraticCurveTo(cx, top - P.w * 0.55, cx + P.w * 0.75, top + P.w * 0.6); g.bezierCurveTo(cx + P.w * 0.95, top + P.w * 1.6, P.x + P.w * 1.05, P.y - P.h * 0.4, P.x + P.w * 1.15, P.y + 1); g.closePath();
    const gr = g.createLinearGradient(P.x - P.w, 0, P.x + P.w, 0); gr.addColorStop(0, C(loC)); gr.addColorStop(0.3, C(hiC)); gr.addColorStop(1, C(mixc(loC, [0, 0, 0], 0.3))); g.fillStyle = gr; g.fill(); g.clip();
    g.strokeStyle = C(mixc(loC, [0, 0, 0], 0.2), 0.55); g.lineWidth = Math.max(0.4, 0.5 * P.k); for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(P.x + j * P.w * 0.3, P.y); g.quadraticCurveTo(P.x + j * P.w * 0.28 + P.lean * P.h * 0.5, P.y - P.h * 0.5, cx + j * P.w * 0.22, top); g.stroke(); } /* les fibres */
    g.restore();
    g.fillStyle = C([60, 90, 50], 0.8); g.beginPath(); g.ellipse(P.x, P.y + 1, P.w * 2, P.w * 0.45, 0, 0, TAU); g.fill(); /* la mousse au pied */
    tufts(P, 4);
  }
  for (let j = 0; j < 8; j++) { const z = 1.1 + q() * 2.5; tufts({ x: W * q(), y: hz + (H - hz) / z, k: 2.6 / z }, 3); } /* les plantes primitives du premier plan */
}
/** la flore basse d'un monde vivant sans arbres, selon son climat (loi 7) : cactus, lichen et mousse, toundra, herbiers, salicornes, prairie, touffes de braise. */
function floraKindOf(S) { return S.lit === false ? "pale" : S.lava ? "cinder" : S.sand || S.world === "desert" ? "cactus" : S.ice || S.world === "frozen" ? "tundra" : S.soil === "salt" ? "salicorn" : S.water && S.waterGround !== false && !S.shore ? "seagrass" : S.soil === "chalk" ? "poppies" : S.soil === "stone" || S.rock ? "lichen" : "scrub"; }
function lowFlora(g, m, t, day, night) {
  const { W, H, hz, S } = m, kind = floraKindOf(S), q = rng((S.seed ^ 0xf10a) >>> 0), amb = 0.3 + 0.7 * day, C = (c, a) => css(mixc([5, 6, 12], leafC(S, c), amb), a), n = 10 + Math.floor(q() * 10);
  const pts = Array.from({ length: n }, () => { const z = 1.15 + q() * 4, y = hz + (H - hz) / z; return { x: q() * W, y, k: 3.4 / z, z, r: q() }; }).sort((a, b) => b.z - a.z);
  if (S.shore || (S.water && S.waterGround === false)) for (let k = 0; k < 6; k++) { const x = W * q(), y = hz + (H - hz) * (0.2 + 0.2 * q()); g.strokeStyle = C([60, 80, 40]); g.lineWidth = 0.9; for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(x + j * 2, y); g.quadraticCurveTo(x + j * 2 + 1, y - 6, x + j * 2 + (j - 2), y - 10 - q() * 5); g.stroke(); } } /* des roseaux sur la rive */
  for (const P of pts) { const k = P.k;
    if (kind === "pale") { for (let j = 0; j < 3; j++) { const x = P.x + (j - 1) * 3 * k, h = (2 + (j % 2) * 2) * k; g.strokeStyle = C([196, 192, 180], 0.8); g.lineWidth = Math.max(0.5, 0.6 * k); g.beginPath(); g.moveTo(x, P.y); g.lineTo(x, P.y - h); g.stroke(); g.fillStyle = C([226, 222, 210], 0.85); g.beginPath(); g.ellipse(x, P.y - h, 1.6 * k, 0.8 * k, 0, Math.PI, TAU); g.fill(); } continue; } /* sans lumière, des champignons pâles, pas de verdure */
    if (kind === "cactus") { if (P.r < 0.5) { const h = 18 * k; g.fillStyle = C([70, 110, 60]); g.fillRect(P.x - 2 * k, P.y - h, 4 * k, h); g.fillRect(P.x - 7 * k, P.y - h * 0.65, 3 * k, h * 0.3); g.fillRect(P.x - 7 * k, P.y - h * 0.85, 3 * k, h * 0.25); g.fillRect(P.x + 4 * k, P.y - h * 0.5, 3 * k, h * 0.25); g.fillRect(P.x + 4 * k, P.y - h * 0.75, 3 * k, h * 0.3); } else { g.fillStyle = C([120, 110, 60]); g.beginPath(); g.ellipse(P.x, P.y - 3 * k, 5 * k, 3.5 * k, 0, 0, TAU); g.fill(); g.strokeStyle = C([170, 150, 90]); g.lineWidth = 0.6; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(P.x + j * 2 * k, P.y); g.lineTo(P.x + j * 3 * k, P.y - 7 * k); g.stroke(); } } } /* saguaros et touffes sèches */
    else if (kind === "lichen") { g.fillStyle = C(P.r < 0.5 ? [150, 160, 90] : [190, 140, 70], 0.8); for (let j = 0; j < 5; j++) { g.beginPath(); g.ellipse(P.x + (j - 2) * 3 * k, P.y - 0.5, 3 * k * (0.6 + 0.4 * ((j * 7) % 3) / 3), 1.2 * k, 0, 0, TAU); g.fill(); } if (P.r > 0.7) { g.fillStyle = C([70, 110, 50]); g.beginPath(); g.ellipse(P.x, P.y - 1.5 * k, 5 * k, 3 * k, 0, Math.PI, TAU); g.fill(); g.fillStyle = C([230, 220, 140]); for (let j = 0; j < 4; j++) g.fillRect(P.x + (j - 1.5) * 2 * k, P.y - 3.5 * k, 1, 1); } } /* lichens jaunes et orangés, coussins de mousse fleuris */
    else if (kind === "tundra") { g.strokeStyle = C([110, 90, 70]); g.lineWidth = 0.8; for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x + (j - 2) * 2.5 * k, P.y - (4 + (j % 2) * 3) * k); g.stroke(); } g.fillStyle = C([200, 70, 60]); if (P.r < 0.4) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(P.x + (j - 1) * 2.5 * k, P.y - 5 * k, 1 * k, 0, TAU); g.fill(); } g.fillStyle = css([240, 248, 255], 0.6); g.fillRect(P.x - 4 * k, P.y - 1, 8 * k, 1); } /* toundra : arbustes nains, baies rouges, givre */
    else if (kind === "seagrass") { g.strokeStyle = C([50, 110, 70], 0.7); g.lineWidth = 1; for (let j = 0; j < 4; j++) { const sw = Math.sin(TAU * t * 0.5 + j + P.r * 6) * 2 * k; g.beginPath(); g.moveTo(P.x + j * 2 * k, P.y + 2); g.quadraticCurveTo(P.x + j * 2 * k + sw, P.y - 3 * k, P.x + j * 2 * k + sw * 1.5, P.y - 6 * k); g.stroke(); } } /* herbiers qui ondulent sous la surface */
    else if (kind === "salicorn") { g.fillStyle = C(P.r < 0.5 ? [170, 50, 60] : [120, 140, 60]); for (let j = 0; j < 6; j++) { g.beginPath(); g.ellipse(P.x + (j - 2.5) * 2 * k, P.y - (2 + (j % 3)) * k, 0.9 * k, 2.4 * k, (j - 2.5) * 0.15, 0, TAU); g.fill(); } } /* salicornes rouges et vertes sur le sel */
    else if (kind === "poppies") { g.strokeStyle = C([70, 110, 50]); g.lineWidth = 0.7; for (let j = 0; j < 4; j++) { const fx = P.x + (j - 1.5) * 3 * k, fy = P.y - (6 + j % 2 * 2) * k; g.beginPath(); g.moveTo(fx, P.y); g.lineTo(fx, fy); g.stroke(); g.fillStyle = C(j % 3 ? [210, 40, 40] : [240, 220, 220]); g.beginPath(); g.arc(fx, fy, 1.4 * k, 0, TAU); g.fill(); } } /* prairie calcaire : coquelicots et marguerites */
    else if (kind === "cinder") { g.strokeStyle = C([30, 22, 18]); g.lineWidth = 0.7; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y - 5 * k); g.stroke(); glowAt(g, P.x, P.y - 5 * k, 4 * k, [255, 100, 40], 0.3); g.fillStyle = css([240, 80, 30], 0.9); g.beginPath(); g.arc(P.x, P.y - 5 * k, 1.2 * k, 0, TAU); g.fill(); } /* touffes de braise */
    else { g.fillStyle = C(P.r < 0.5 ? [60, 90, 46] : [80, 104, 52]); g.beginPath(); g.ellipse(P.x, P.y - 2.5 * k, 7 * k, 4 * k, 0, Math.PI, TAU); g.fill(); g.strokeStyle = C([100, 130, 60]); g.lineWidth = 0.7; for (let j = -3; j <= 3; j++) { g.beginPath(); g.moveTo(P.x + j * 1.5 * k, P.y - 2 * k); g.lineTo(P.x + j * 2.2 * k, P.y - 7 * k); g.stroke(); } } /* buissons et hautes herbes */
  }
}
/** le relief du milieu, posé sur l'horizon, selon ce qui fait le sol. Une graine à part : le reste ne bouge pas. */
function midRelief(g, m, t, day, night, hzc) {
  const { W, H, hz, S } = m, q = rng((S.seed ^ 0x4e11e) >>> 0), sea = S.water && S.waterGround !== false && !S.ice;
  const kind = sea ? "islets" : S.lava ? null : S.sand ? "erg" : S.ice ? "seracs" : S.rock === "basalt" ? null : S.rock === "granite" ? "domes" : S.soil === "chalk" ? "cliffs" : S.soil === "salt" ? "buttes" : S.soil === "stone" ? "tors" : S.soil === "forest" ? "wooded" : S.soil === "earth" ? "rolling" : "rolling";
  if (!kind || (q() < 0.15 && kind !== "domes") || (kind === "tors" && q() < 0.5)) return; /* les collines de pierre : une fois sur deux seulement */ /* parfois rien : la plaine nue existe aussi (jamais pour le granite) */
  const air = (c, d) => mixc(c, hzc, 0.18 * d * (0.4 + 0.6 * day)), dark = (c) => mixc(c, [0, 0, 0], 0.35 + 0.4 * night);
  const span = (n, f) => { for (let i = 0; i < n; i++) { const d = 0.5 + q() * 0.5, cx = W * q(), w = W * (0.09 + 0.16 * q()), h = H * (0.06 + 0.11 * q()) * (1.2 - d * 0.5); f(cx, w, h, d, i); } };
  const fillPath = (col, pts) => { g.fillStyle = css(col); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); };
  if (kind === "mesas") span(2 + Math.floor(q() * 2), (cx, w, h, d) => { const c = dark(air([30, 31, 36], d)); fillPath(c, [[cx - w, hz + 1], [cx - w * 0.75, hz - h], [cx + w * 0.7, hz - h], [cx + w, hz + 1]]); g.fillStyle = css(mixc(c, [0, 0, 0], 0.4)); for (let x = cx - w * 0.72; x < cx + w * 0.68; x += 3 + q() * 2) g.fillRect(x, hz - h + 2, 0.7, h - 2); g.fillStyle = css(mixc(c, [200, 205, 215], 0.3 * day)); g.fillRect(cx - w * 0.75, hz - h, w * 1.45, 1); }); /* tables de basalte, flancs en orgues */
  else if (kind === "domes") { const GR = { grey: [138, 136, 132], ochre: [176, 138, 88], pink: [184, 128, 118] }[S.graniteHue || "grey"]; span(2 + Math.floor(q() * 2), (cx, w, h, d) => { w *= 1.15; h *= 1.9; const c = dark(mixc(GR, hzc, 0.18 * d)), sh = mixc(c, [0, 0, 0], 0.35); g.fillStyle = css(c); g.beginPath(); g.moveTo(cx - w, hz + 1); g.bezierCurveTo(cx - w * 0.95, hz - h * 1.35, cx + w * 0.85, hz - h * 1.35, cx + w, hz + 1); g.closePath(); g.fill(); g.save(); g.clip(); g.fillStyle = css(sh, 0.55); g.fillRect(cx + w * 0.25, hz - h * 1.4, w, h * 1.5); g.strokeStyle = css(sh, 0.7); g.lineWidth = 1; for (let k = 0; k < 5; k++) { const ox = cx - w * 0.6 + k * w * 0.3; g.beginPath(); g.moveTo(ox, hz - h * (0.9 - 0.1 * Math.abs(k - 2))); g.quadraticCurveTo(ox + w * 0.05, hz - h * 0.4, ox - w * 0.02, hz + 1); g.stroke(); } g.restore(); g.strokeStyle = css(mixc(c, [255, 245, 235], 0.4 * day), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - w * 0.75, hz - h * 0.55); g.bezierCurveTo(cx - w * 0.5, hz - h * 0.98, cx - w * 0.05, hz - h * 1.02, cx + w * 0.2, hz - h * 0.98); g.stroke(); for (let k = 0; k < 6; k++) { const bx = cx + (q() - 0.5) * w * 2.2, br = 2 + q() * 4; g.fillStyle = css(k % 2 ? c : sh); g.beginPath(); g.ellipse(bx, hz, br * 1.2, br, 0, Math.PI, TAU); g.fill(); if (k < 2) { g.beginPath(); g.ellipse(bx + br * 0.2, hz - br * 1.6, br * 0.8, br * 0.7, 0, 0, TAU); g.fill(); } } }); } /* dômes de granite (gris, ocre ou rose), écailles verticales, chaos de blocs au pied */
  else if (kind === "cliffs") { const c = air([238, 236, 226], 0.3), y = hz - H * (0.17 + 0.06 * q()), x0 = W * q() * 0.35, x1 = x0 + W * (0.4 + 0.25 * q()); g.fillStyle = css(mixc(c, [0, 0, 0], 0.15 + 0.4 * night)); g.beginPath(); g.moveTo(x0, hz + 1); g.lineTo(x0 + 10, y + 4); g.lineTo(x0 + 16, y); for (let x = x0 + 16; x < x1 - 8; x += 7) g.lineTo(x, y + (q() - 0.5) * 2.5); g.lineTo(x1 - 4, y + 3); g.lineTo(x1, hz + 1); g.closePath(); g.fill(); g.fillStyle = css(mixc([70, 110, 55], hzc, 0.2)); g.beginPath(); g.moveTo(x0 + 14, y + 0.5); for (let x = x0 + 16; x < x1 - 6; x += 5) g.lineTo(x, y - 2 - q() * 1.5); g.lineTo(x1 - 4, y + 3); g.lineTo(x0 + 14, y + 3); g.closePath(); g.fill(); for (let x = x0 + 18; x < x1 - 6; x += 6 + q() * 9) { g.fillStyle = css([0, 0, 0], 0.12 + 0.1 * q()); g.fillRect(x, y + 3, 2 + q() * 4, hz - y - 3); } g.strokeStyle = css([120, 115, 100], 0.5); g.lineWidth = 0.6; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + 10, y + k * (hz - y) / 4); g.lineTo(x1 - 2, y + k * (hz - y) / 4 + (q() - 0.5) * 2); g.stroke(); } } /* falaises de craie, blanches, l'herbe au sommet, les lits de silex */
  else if (kind === "buttes") span(2 + Math.floor(q() * 2), (cx, w, h, d) => { h *= 1.6; const c = air([196, 176, 160], d * 0.6); const bp = [[cx - w * 0.6, hz + 1], [cx - w * 0.5, hz - h * 0.35], [cx - w * 0.42, hz - h * 0.66], [cx - w * (0.32 + 0.06 * q()), hz - h * 0.72], [cx + w * (0.2 + 0.06 * q()), hz - h * 0.7], [cx + w * 0.36, hz - h * 0.6], [cx + w * 0.46, hz - h * 0.3], [cx + w * 0.6, hz + 1]]; fillPath(dark(c), bp);
    g.save(); g.beginPath(); bp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); const nb = 5 + Math.floor(q() * 3), ph = q() * 6; for (let k = 0; k < nb; k++) { const y = hz - h * (0.66 - k * (0.6 / nb)) + q() * 2, th = h * (0.025 + 0.04 * q()); g.fillStyle = css(dark(mixc(c, k % 2 ? [120, 84, 70] : [236, 220, 204], 0.45)), 0.5); g.beginPath(); g.moveTo(cx - w, y); for (let x = -w; x <= w; x += w / 8) g.lineTo(cx + x, y + Math.sin(x / w * 3 + ph + k) * h * 0.015); for (let x = w; x >= -w; x -= w / 8) g.lineTo(cx + x, y + th + Math.sin(x / w * 3 + ph + k) * h * 0.015); g.closePath(); g.fill(); } g.restore(); }); /* buttes rayées sur la plaine de sel, comme des badlands */
  else if (kind === "tors") span(2 + Math.floor(q() * 2), (cx, w, h, d) => { w *= 1.4; h *= 2; const c = mixc([156, 150, 140], hzc, 0.12 * d), hi = mixc(c, [245, 240, 230], 0.45 * day + 0.1), lo = mixc(c, [20, 18, 16], 0.55), out = mixc(c, [10, 10, 10], 0.75); g.fillStyle = css(mixc(c, [30, 28, 26], 0.45)); g.beginPath(); g.moveTo(cx - w, hz + 1); g.quadraticCurveTo(cx, hz - h * 0.8, cx + w, hz + 1); g.closePath(); g.fill(); const stack = [[0, 0.5, 0.26], [-0.2, 0.6, 0.19], [0.18, 0.64, 0.21], [0.02, 0.8, 0.18], [-0.05, 0.96, 0.13], [0.3, 0.52, 0.14]]; for (const [ox, oy, r] of stack) { const bx = cx + ox * w, by = hz - h * oy, R = r * w; g.fillStyle = css(c); g.strokeStyle = css(out, 0.8); g.lineWidth = 1; g.beginPath(); g.ellipse(bx, by, R, R * 0.7, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = css(lo, 0.75); g.beginPath(); g.ellipse(bx + R * 0.28, by + R * 0.22, R * 0.68, R * 0.42, 0, 0, TAU); g.fill(); g.fillStyle = css(hi, 0.8); g.beginPath(); g.ellipse(bx - R * 0.32, by - R * 0.32, R * 0.36, R * 0.17, -0.3, 0, TAU); g.fill(); } }); /* collines de pierre coiffées de blocs empilés, clairs, cernés d'ombre */
  else if (kind === "wooded" || kind === "rolling") { const green = kind === "wooded"; for (let l = 0; l < 2; l++) { const d = 1 - l * 0.45, c = dark(air(green ? leafC(S, [32, 54, 34]) : [128, 98, 62], d * 0.5)), a = H * (0.06 + 0.04 * q()) * (1 + l * 0.5), ph = q() * 6, ys = []; g.fillStyle = css(c); g.beginPath(); g.moveTo(0, hz + 1); for (let x = 0; x <= W; x += 3) { let y = hz - a * (0.55 + 0.45 * Math.sin(x / W * 4.5 + ph)); if (green) y -= 3 + Math.abs(Math.sin(x * 0.7 + ph)) * 4 + (Math.sin(x * 0.23) > 0.6 ? 4 : 0); ys.push([x, y]); g.lineTo(x, y); } g.lineTo(W, hz + 1); g.closePath(); g.fill(); if (!green && l === 1) { g.save(); g.clip(); for (let k = 0; k < 14; k++) { g.strokeStyle = css(k % 2 ? mixc(c, [210, 180, 110], 0.35) : mixc(c, [60, 90, 40], 0.35), 0.8); g.lineWidth = 3; g.beginPath(); g.moveTo(-20 + k * W * 0.09, hz + 2); g.lineTo(-20 + k * W * 0.09 + W * 0.25, hz - a * 1.4); g.stroke(); } g.restore(); } } } /* collines : boisées, leur crête faite de cimes ; de terre, des champs en bandes */
  else if (kind === "erg") span(3, (cx, w, h, d) => { w *= 1.4; h *= 1.6; const lit = dark(air([214, 168, 106], d)), shd = mixc(lit, [60, 30, 20], 0.55); g.fillStyle = css(lit); g.beginPath(); g.moveTo(cx - w * 1.3, hz + 1); g.quadraticCurveTo(cx - w * 0.3, hz - h * 1.15, cx + w * 0.15, hz - h); g.lineTo(cx + w * 0.55, hz + 1); g.closePath(); g.fill(); g.fillStyle = css(shd); g.beginPath(); g.moveTo(cx + w * 0.15, hz - h); g.quadraticCurveTo(cx + w * 0.35, hz - h * 0.4, cx + w * 0.55, hz + 1); g.lineTo(cx - w * 0.05, hz + 1); g.quadraticCurveTo(cx + w * 0.02, hz - h * 0.5, cx + w * 0.15, hz - h); g.closePath(); g.fill(); g.strokeStyle = css([255, 235, 200], 0.4 * day); g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx - w * 0.9, hz - h * 0.45); g.quadraticCurveTo(cx - w * 0.3, hz - h * 1.08, cx + w * 0.15, hz - h); g.stroke(); }); /* grandes dunes en croissant : face au soleil claire, face sous le vent dans l'ombre, la crête vive */
  else if (kind === "seracs" && (S.seed >>> 9) % 3 === 1) span(3, (cx, w, h, d) => { const c = air([222, 236, 250], d * 0.5), sh = mixc(c, [60, 110, 160], 0.5), ww = w * (0.8 + 0.6 * q()), hh = h * (0.9 + 0.5 * q()), top = hz - hh, sl = ww * 0.06; fillPath(c, [[cx - ww / 2, hz + 1], [cx - ww / 2 + sl, top + 2], [cx - ww / 2 + sl * 2, top], [cx + ww / 2 - sl * 2, top], [cx + ww / 2 - sl, top + 3], [cx + ww / 2, hz + 1]]); fillPath(sh, [[cx + ww * 0.15, top + 1], [cx + ww / 2 - sl * 2, top], [cx + ww / 2 - sl, top + 3], [cx + ww / 2, hz + 1], [cx + ww * 0.15, hz + 1]]); g.fillStyle = css([150, 205, 240], 0.5); for (let k = 1; k < 4; k++) g.fillRect(cx - ww / 2 + sl, top + hh * k / 4, ww * 0.6, 0.8); g.fillStyle = css([235, 244, 250], 0.6); g.fillRect(cx - ww * 0.55, hz, ww * 1.1, 1.2); }); /* ESSAI : des icebergs tabulaires, plats et rayés de strates */
  else if (kind === "seracs" && (S.seed >>> 9) % 3 === 2) { for (let l = 0; l < 3; l++) { const d = 1 - l * 0.3, c = air([226, 238, 250], d * 0.5), sh = mixc(c, [80, 130, 180], 0.35), y0 = hz - H * 0.012 * (3 - l), amp = H * (0.01 + 0.012 * l), ph = q() * 6; g.fillStyle = css(c); g.beginPath(); g.moveTo(0, hz + 1); for (let x = 0; x <= W; x += 3) { const u = ((x / W) * (5 + l * 2) + ph) % 1; g.lineTo(x, y0 - amp * (u < 0.8 ? u / 0.8 : (1 - u) / 0.2)); } g.lineTo(W, hz + 1); g.closePath(); g.fill(); g.strokeStyle = css(sh, 0.6); g.lineWidth = 0.8; g.beginPath(); for (let x = 0; x <= W; x += 3) { const u = ((x / W) * (5 + l * 2) + ph) % 1; if (u > 0.8) g.lineTo(x, y0 - amp * (1 - u) / 0.2); else g.moveTo(x, y0 - amp * u / 0.8); } g.stroke(); } } /* ESSAI : des sastrugis, la neige sculptée en vagues par le vent */
  else if (kind === "seracs") span(5, (cx, w, h, d) => { h *= 1.8; const c = air([214, 232, 248], d * 0.5), sh = mixc(c, [70, 120, 170], 0.45); const pts = [[cx - w * 0.28, hz + 1], [cx - w * 0.22, hz - h * 0.6], [cx - w * 0.12, hz - h * 0.95], [cx - w * 0.02, hz - h], [cx + w * 0.08, hz - h * 0.72], [cx + w * 0.2, hz - h * 0.5], [cx + w * 0.28, hz + 1]]; fillPath(c, pts); g.fillStyle = css(sh); g.beginPath(); g.moveTo(cx - w * 0.02, hz - h); g.lineTo(cx + w * 0.08, hz - h * 0.72); g.lineTo(cx + w * 0.2, hz - h * 0.5); g.lineTo(cx + w * 0.28, hz + 1); g.lineTo(cx + w * 0.02, hz + 1); g.closePath(); g.fill(); g.fillStyle = css([120, 190, 235], 0.7); g.fillRect(cx - w * 0.1, hz - h * 0.8, 1.2, h * 0.7); }); /* séracs : blocs de glace bleutés, une face dans l'ombre */
  else if (kind === "islets") span(2 + Math.floor(q() * 2), (cx, w, h, d) => { w *= 1.3; h *= 2.4; const c = mixc([14, 20, 16], hzc, 0.12 * d); g.fillStyle = css(c); g.beginPath(); g.moveTo(cx - w * 0.55, hz + 1); g.lineTo(cx - w * 0.48, hz - h * 0.4); g.quadraticCurveTo(cx - w * 0.25, hz - h * 1.0, cx + w * 0.1, hz - h * 0.85); g.lineTo(cx + w * 0.38, hz - h * 0.45); g.lineTo(cx + w * 0.55, hz + 1); g.closePath(); g.fill(); const PR = [[-0.55, 0], ...Array.from({ length: 11 }, (_, j) => { const u = j / 10, a0 = (1 - u) * (1 - u), a1 = 2 * u * (1 - u), a2 = u * u; return [a0 * -0.48 + a1 * -0.25 + a2 * 0.1, a0 * 0.4 + a1 * 1.0 + a2 * 0.85]; }), [0.38, 0.45], [0.55, 0]] /* le vrai profil de l'îlot (sa courbe échantillonnée) */, prof = (u) => { for (let j = 1; j < PR.length; j++) if (u <= PR[j][0]) { const [u0, v0] = PR[j - 1], [u1, v1] = PR[j]; return v0 + (v1 - v0) * (u - u0) / (u1 - u0); } return 0; }; for (let k = 0; k < 6; k++) { const u = -0.4 + k * 0.14, tx = cx + u * w, ty = hz - h * prof(u) + 3; g.beginPath(); g.moveTo(tx, ty - 8); g.lineTo(tx - 3.5, ty + 1); g.lineTo(tx + 3.5, ty + 1); g.closePath(); g.fill(); } /* les cimes posées sur le profil de l'îlot, pas en l'air */ g.fillStyle = css([235, 244, 248], 0.6); g.fillRect(cx - w * 0.58, hz, w * 1.16, 1.2); g.fillStyle = css(c, 0.4); g.beginPath(); g.ellipse(cx, hz + 4, w * 0.5, 3, 0, 0, TAU); g.fill(); }); /* îlots boisés au large, l'écume au pied, leur reflet */
}
/** le sable noir du basalte, semé de galets clairs, plus fin vers le loin. */
function blackSand(g, m, t, day, night, hzc) {
  const { W, H, hz, S } = m, q = rng((S.seed ^ 0x5a2d) >>> 0), lit = 0.25 + 0.75 * day * (1 - 0.7 * night), base = mixc([14, 14, 16], [62, 62, 66], lit);
  const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, css(mixc(base, hzc, 0.35))); gr.addColorStop(1, css(mixc(base, [0, 0, 0], 0.2))); g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
  for (let k = 0; k < 260; k++) { const v = q(), y = hz + (H - hz) * v * v, x = q() * W, r = 0.3 + 2.4 * v * v * q(); g.fillStyle = css(q() < 0.12 ? [210, 210, 205] : mixc(base, [150, 150, 150], 0.35 * q()), 0.75); g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, TAU); g.fill(); }
  if (S.water && S.waterGround === false || S.river) return; /* la mer : des aiguilles au large, sur l'horizon */
}
/** le basalte au loin : un escarpement d'orgues posé sur l'horizon, anthracite, reconnaissable à ses prismes ; quelques prismes tombés au premier plan. */
function basaltColumns(g, m, t, day, night, hzc) {
  const { W, H, hz, S } = m, q = rng((S.seed ^ 0xba5a17) >>> 0), lit = 0.2 + 0.8 * day * (1 - 0.65 * night), cold = S.columns && S.ice;
  const base = mixc(mixc([6, 6, 8], [30, 31, 35], lit), hzc, 0.1), edge = mixc(base, cold ? [240, 246, 255] : [170, 176, 190], 0.4 * lit), joint = mixc(base, [0, 0, 0], 0.6);
  const x0 = W * (0.05 + 0.45 * q()), span = W * (0.28 + 0.2 * q()), cw = 3.2 + q() * 1.4, Hmax = H * (0.17 + 0.08 * q());
  /* la silhouette : un plateau, des groupes plus hauts, des creux, une rampe d'éboulis aux deux bouts */
  const prof = []; let lvl = 0.75; for (let x = 0; x < span; x += cw) { const f = x / span, ends = Math.min(1, f / 0.12, (1 - f) / 0.1); if (q() < 0.18) lvl = Math.max(0.45, Math.min(1, lvl + (q() - 0.5) * 0.5)); prof.push({ x: x0 + x, top: hz - Hmax * lvl * ends * (0.92 + 0.16 * q()) }); }
  for (const c of prof) { if (c.top > hz - 2) continue; const h = hz + 2 - c.top;
    g.fillStyle = css(base); g.fillRect(c.x, c.top, cw + 0.3, h + 1);
    g.fillStyle = css(edge, 0.55); g.fillRect(c.x, c.top + 1, 0.6, h); /* l'arête qui prend le jour */
    g.fillStyle = css(edge, 0.85); g.fillRect(c.x, c.top - 0.6, cw, 1.2); /* la tête */
    g.fillStyle = css(joint, 0.9); for (let y = c.top + 6 + q() * 10; y < hz - 3; y += 9 + q() * 16) g.fillRect(c.x, y, cw, 0.7); /* les cassures, rares et décalées */
    g.fillStyle = css(joint, 0.8); g.fillRect(c.x + cw - 0.5, c.top, 0.5, h); /* le joint vertical : on lit des prismes, pas des briques */
  }
  g.fillStyle = css(mixc(base, hzc, 0.15)); g.beginPath(); g.moveTo(x0 - 8, hz + 2); for (let k = 0; k <= 10; k++) g.lineTo(x0 - 8 + k * (span + 16) / 10, hz + 2 - 2.5 * q()); g.lineTo(x0 + span + 8, hz + 3); g.closePath(); g.fill(); /* l'éboulis au pied */
  if (cold) { g.fillStyle = css([240, 248, 255], 0.55); for (const c of prof) if (q() < 0.5) g.fillRect(c.x, c.top - 0.8, cw, 1.4); }
  if (S.water || S.river) for (let k = 0; k < 1 + Math.floor(q() * 2); k++) { const x = x0 + span + W * (0.05 + 0.2 * q()), h = H * (0.07 + 0.07 * q()), w = W * (0.012 + 0.015 * q()); if (x > W - 4) continue; g.fillStyle = css(base); g.beginPath(); g.moveTo(x - w, hz + 1); g.lineTo(x - w * 0.5, hz - h * 0.6); g.lineTo(x - w * 0.1, hz - h); g.lineTo(x + w * 0.35, hz - h * 0.7); g.lineTo(x + w * 0.8, hz + 1); g.closePath(); g.fill(); } /* les aiguilles au large */
  for (let k = 0; k < 3 + Math.floor(q() * 3); k++) { const x = W * q(), y = hz + (H - hz) * (0.55 + 0.4 * q()), L = (8 + q() * 10) * (y - hz) / (H - hz), w = L * 0.32, a = (q() - 0.5) * 0.5; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = css(base); g.fillRect(-L / 2, -w, L, w); g.fillStyle = css(edge, 0.7); g.beginPath(); const hx = [[0, -w / 2], [w * 0.25, -w], [w * 0.5, -w / 2], [w * 0.25, 0]]; g.moveTo(L / 2 + hx[0][0], hx[0][1]); for (const [a2, b2] of hx) g.lineTo(L / 2 + a2, b2); g.closePath(); g.fill(); g.restore(); } /* des prismes tombés au premier plan */
}
/** La rivière : l'eau en trait serpente sur le sol, de l'horizon au pied de la fenêtre ; elle prend le ciel. */
function riverRibbon(g, m, t, sn, day, night, hzc, top) {
  const { H, hz, S } = m, q = rng((S.seed ^ 0x51a7e) >>> 0), ph = q() * 6.28, amp = 0.5 + q() * 0.6, wid = 0.16 + q() * 0.1, u0 = (q() - 0.5) * 0.6, pts = [];
  for (let z = 30; z >= 1.02; z *= 0.94) { const u = u0 + amp * Math.sin(ph + z * 0.55) * Math.min(1, z * 0.3); pts.push({ z, u }); }
  const L = pts.map((p) => proj(m, p.u - wid, p.z)), R = pts.map((p) => proj(m, p.u + wid, p.z)); m.riverPoly = L.concat(R.slice().reverse()); const water = mixc(mixc(hzc, top, 0.35), [20, 50, 60], 0.35 + 0.4 * night);
  g.beginPath(); L.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); for (let k = R.length - 1; k >= 0; k--) g.lineTo(R[k][0], R[k][1]); g.closePath();
  const wg = g.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, css(mixc(water, hzc, 0.5))); wg.addColorStop(1, css(water)); g.fillStyle = wg; g.fill();
  g.strokeStyle = css([0, 0, 0], 0.35); g.lineWidth = 1; g.stroke();
  for (let k = 0; k < 14; k++) { const i = Math.floor(q() * (pts.length - 2)), a = L[i], b = R[i], f = q(), x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, len = Math.max(1, (b[0] - a[0]) * 0.25); g.fillStyle = css([230, 240, 245], (0.18 + 0.2 * day) * (0.5 + 0.5 * Math.sin(TAU * (t + q())))); g.fillRect(x - len / 2, y, len, 0.9); } /* le courant */
}
/** Surface de l'eau : dégradé, rides qui glissent, reflet du soleil. */
function waterSurface(g, m, t, sn, hzc) {
  const { W, H, hz } = m;
  const S = m.S, chem = S.acid ? [[120, 150, 40], [18, 34, 10]] : S.brine ? [[176, 96, 112], [56, 22, 34]] : S.glacial ? [[64, 168, 176], [8, 38, 48]] : null, calm = !S.wind && !S.rain && !S.storm; /* la chimie de l'eau, et le miroir quand rien ne bouge */
  const wg = g.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, css(chem ? mixc(hzc, chem[0], 0.6) : calm ? mixc(hzc, [20, 60, 70], 0.4) : mixc(hzc, [20, 60, 70], 0.7))); wg.addColorStop(1, css(chem ? chem[1] : [11, 24, 28])); g.fillStyle = wg; g.fillRect(0, hz, W, H - hz);
  if (S.glacial) { const q = rng((S.seed ^ 0x1cef) >>> 0); for (let k = 0; k < 14; k++) { const z = 1.3 + q() * 7, y = hz + (H - hz) / z, x = W * q(), w = (22 + q() * 30) / z, h2 = (5 + q() * 6) / z; g.fillStyle = css([226, 238, 246], 0.85); g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w * 0.6, y - h2); g.lineTo(x + w * 0.5, y - h2 * 0.8); g.lineTo(x + w, y); g.lineTo(x + w * 0.3, y + h2 * 0.4); g.closePath(); g.fill(); g.fillStyle = css([120, 170, 200], 0.4); g.fillRect(x - w * 0.8, y, w * 1.6, Math.max(0.6, h2 * 0.3)); } } /* des glaçons qui flottent */
  m.mirror = calm && !chem;
  for (const l of m.water.lines) { const x = frac(l.p + t) * (W + l.w) - l.w; g.fillStyle = "rgba(200,225,235,0.22)"; g.fillRect(x, l.y, l.w, 1.2); }
  const s = sn.find((q) => q.e > 0.15); if (s) for (let b = 0; b < 6; b++) { g.fillStyle = css([255, 220, 160], (0.28 - b * 0.03) * Math.min(1, s.e * 2)); g.fillRect(s.x - (14 - b * 2) / 2 + 3 * Math.sin(TAU * (t * 2 + b * 0.2)), hz + H * (0.05 + 0.045 * b), 14 - b * 2, 1.5); }
}
/** Veines de lave et étincelles. */
function lavaVeins(g, m, t) {
  const { W, H, hz } = m;
  for (const v of m.lava.veins) { const y = hz + H * 0.08 + v.w * H * 0.14; g.strokeStyle = css([255, 122, 48], 0.55 + 0.4 * Math.sin(TAU * (t * 2 + v.w))); g.lineWidth = 1.6; g.beginPath(); g.moveTo(v.x, y); v.pts.forEach((q, k) => g.lineTo(((k + 1) / 6) * W * 0.9, y + q * H * 0.05)); g.stroke(); }
  for (const sp of m.lava.sparks) { const q = frac(t * 3 + sp.p); g.fillStyle = css([255, 150, 70], 1 - q); g.fillRect(sp.x + 6 * Math.sin(TAU * (q + sp.p)), hz + H * 0.1 - q * H * 0.45, 1.5, 1.5); }
}

// ---- rivage ------------------------------------------------------------------------------------------------
function shorePath(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
const SHORE_COL = { sand: [158, 126, 82], rock: [84, 80, 82], grass: [66, 98, 52], lava: [24, 16, 14] };
/** La rive : sa matière (sable, rochers, herbe, roche volcanique, banquise), plus claire au loin, plus sombre la nuit. */
function shoreLand(g, m, t, sn, day, night, hzc) {
  const { W, H, hz, shore: sh, pal } = m, dk = [6, 7, 12];
  g.save(); shorePath(g, sh.land); g.clip();
  if (sh.kind === "ice") iceSheet(g, m, t, sn, day, night, hzc);
  else {
    const base = SHORE_COL[sh.kind], near = mixc(base, dk, 0.35 + 0.5 * night), far = mixc(mixc(base, hzc, 0.35), dk, 0.25 + 0.5 * night);
    const lg = g.createLinearGradient(0, hz, 0, H); lg.addColorStop(0, css(far)); lg.addColorStop(1, css(near)); g.fillStyle = lg; g.fillRect(0, hz, W, H - hz);
    if (sh.kind === "sand") { g.globalAlpha = 0.55; dunes(g, m); g.globalAlpha = 1; }
    if (sh.kind === "grass") for (const f of sh.tufts) { const y = hz + (H - hz) * f.u * f.u, k = 0.4 + f.u, sw = Math.sin(TAU * t + f.p) * 0.8; g.strokeStyle = css(mixc([90, 130, 70], dk, 0.3 + 0.5 * night), 0.7); g.lineWidth = 0.8; g.beginPath(); g.moveTo(f.x, y); g.lineTo(f.x + sw, y - f.h * k); g.moveTo(f.x + 1.5, y); g.lineTo(f.x + 2 + sw, y - f.h * k * 0.8); g.stroke(); }
    if (sh.kind === "rock") for (const f of sh.tufts.slice(0, 26)) { const y = hz + (H - hz) * f.u, k = 0.3 + f.u; g.strokeStyle = css(mixc(pal.rock, [0, 0, 0], 0.4), 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(f.x, y); g.lineTo(f.x + f.h * 2 * k, y + f.h * 0.5 * k); g.stroke(); } // fentes de la pierre
    if (sh.kind === "lava") lavaVeins(g, m, t);
  }
  g.restore();
}
/** La ligne d'eau : écume qui va et vient, sable mouillé, rochers, roseaux, glaçons, vapeur de la lave qui touche l'eau. */
function shoreEdge(g, m, t, night) {
  const { H, hz, shore: sh } = m, lit = 1 - 0.6 * night, L = sh.line, depth = (y) => (y - hz) / (H - hz);
  const along = (fn) => { g.beginPath(); L.forEach(([x, y], i) => { const [px, py] = fn(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); };
  const wave = Math.sin(TAU * t), toward = sh.mode === "side" ? [-sh.side, 0] : [0, sh.mode === "far" ? 1 : -1]; // direction de l'eau, depuis la rive
  if (sh.kind === "lava") { // la lave rencontre l'eau : bord rougeoyant, vapeur
    along((x, y) => [x, y]); g.strokeStyle = css([255, 110, 40], (0.45 + 0.3 * Math.sin(TAU * t * 3)) * (0.6 + 0.4 * night)); g.lineWidth = 2.2; g.stroke();
    for (const p of sh.puffs) { const [x, y] = L[p.k], q = frac(t * 1.5 + p.p), r = 2 + q * 9 * (0.4 + depth(y)); g.fillStyle = css([225, 225, 228], 0.32 * (1 - q) * lit); g.beginPath(); g.arc(x + 3 * Math.sin(TAU * (q + p.p)), y - q * H * 0.18, r, 0, TAU); g.fill(); }
    return;
  }
  if (sh.kind !== "ice") { along((x, y) => { const k = 0.4 + depth(y); return [x - toward[0] * 2.2 * k, y - toward[1] * 1.4 * k]; }); g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 2.4; g.stroke(); } // la berge : une ombre du côté de la terre
  if (sh.kind === "sand") { along((x, y) => [x + toward[0] * -3 * (0.3 + depth(y)), y + toward[1] * -3 * (0.3 + depth(y))]); g.strokeStyle = css([110, 92, 66], 0.55 * lit); g.lineWidth = 4; g.stroke(); } // sable mouillé
  if (sh.kind === "ice") for (const f of sh.floes) { const [x, y] = L[f.k], k = 0.3 + depth(y), dx = toward[0] * f.d * k + Math.sin(TAU * (t + f.p)) * 1.2, dy = toward[1] * f.d * k * 0.5; g.fillStyle = css([226, 240, 252], 0.75 * lit); g.beginPath(); g.ellipse(x + dx, y + dy, f.w * k, f.w * k * 0.3, 0, 0, TAU); g.fill(); }
  // écume : deux lignes qui avancent et reculent
  for (const [off, a] of [[2.5, 0.5], [6, 0.25]]) {
    const o = off + 2.5 * wave; along((x, y) => { const k = 0.3 + depth(y); return [x + toward[0] * o * k, y + toward[1] * o * k * 0.6]; });
    g.strokeStyle = css([235, 245, 250], a * lit * (0.7 + 0.3 * wave)); g.lineWidth = 1.1; g.stroke();
  }
  if (sh.kind === "rock") for (const r of sh.rocks) { const [x, y] = L[r.k], R = (3 + 7 * depth(y)) * r.s; g.fillStyle = css(mixc(m.pal.rock, [40, 40, 46], 0.5)); g.strokeStyle = css([200, 190, 170], 0.25 * lit); g.lineWidth = 0.8; g.beginPath(); r.pts.forEach((k, i) => { const a = Math.PI + (i / 5) * Math.PI; i ? g.lineTo(x + r.dx * R + Math.cos(a) * R * k, y + Math.sin(a) * R * k * 0.8) : g.moveTo(x + r.dx * R + Math.cos(a) * R * k, y + Math.sin(a) * R * k * 0.8); }); g.closePath(); g.fill(); g.stroke(); }
  if (sh.kind === "grass") for (const r of sh.rocks) { const [x, y] = L[r.k], h = (4 + 9 * depth(y)) * r.s, sw = Math.sin(TAU * t + r.dx) * 1.2; g.strokeStyle = css([70, 96, 56], 0.85 * lit); g.lineWidth = 1; g.beginPath(); for (let i = -1; i <= 1; i++) { g.moveTo(x + i * 2, y); g.lineTo(x + i * 3 + sw, y - h); } g.stroke(); } // roseaux
}

/** Avec un rivage, corail (side = 1, côté eau) et flaques d'acide (side = −1, côté terre) se placent près de la ligne d'eau : jamais découpés hors de leur part. Sans rivage : null. */
function seaSpot(m, x, u, side) {
  const { W, H, hz, shore } = m; if (!shore) return null;
  const L = shore.line, D = H - hz, k = Math.max(0, Math.min(L.length - 1, Math.round((x / W) * (L.length - 1)))), [lx, ly] = L[k];
  const dir = shore.mode === "side" ? [-shore.side, 0] : [0, shore.mode === "far" ? 1 : -1], poly = side > 0 ? shore.wet : shore.land;
  let dist = (8 + 22 * u) * (0.4 + (ly - hz) / D);
  for (let i = 0; i < 6; i++, dist *= 0.5) { const x2 = clamp(lx + dir[0] * dist * side, 2, W - 2), y2 = clamp(ly + dir[1] * dist * side * 0.6, hz + 1, H - 1); if (inPoly(poly, x2, y2)) return [x2, y2]; } // trop loin (bord, horizon) : on se rapproche de la ligne
  return [clamp(lx + dir[0] * 1.5 * side, 2, W - 2), clamp(ly + dir[1] * side, hz + 1, H - 1)];
}
function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }

/**
 * Varech, corail, acide. Sous l'eau (dans la part d'eau quand il y a un rivage) : le varech monte du fond et ondule,
 * le corail fait des taches vives près du bas ; l'acide fait des flaques jaune-vert qui bouillonnent sur la terre,
 * ou teinte l'eau quand il n'y a pas de terre.
 */
function seaLife(g, m, t, night) {
  const { S, W, H, hz, sea, shore } = m; if (!sea || (!sea.kelp.length && !sea.coral.length && !sea.acid.length)) return;
  const D = H - hz, lit = 1 - 0.6 * night, wet = S.water;
  const near = (x, u, side) => seaSpot(m, x, u, side);
  if (wet && (sea.kelp.length || sea.coral.length)) {
    g.save(); if (shore) { shorePath(g, shore.wet); g.clip(); }
    for (const k of sea.kelp) { // des lanières qui montent du fond et ondulent avec le courant
      const top = H - D * k.h, n = 10; g.strokeStyle = css(mixc([60, 130, 70], [6, 12, 10], 0.2 + 0.55 * night), 0.8); g.lineWidth = k.w; g.lineCap = "round"; g.beginPath();
      for (let i = 0; i <= n; i++) { const u = i / n, y = H + 2 - (H + 2 - top) * u, x = k.x + Math.sin(TAU * t + k.p + u * 2.4) * 6 * u; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = css(mixc([80, 150, 80], [6, 12, 10], 0.2 + 0.55 * night), 0.7);
      for (let j = 1; j <= k.leaves; j++) { const u = j / (k.leaves + 1), y = H + 2 - (H + 2 - top) * u, x = k.x + Math.sin(TAU * t + k.p + u * 2.4) * 6 * u, sd = j % 2 ? 1 : -1; g.beginPath(); g.ellipse(x + sd * 4, y, 4.5, 1.6, sd * 0.5, 0, TAU); g.fill(); }
    }
    for (const c of sea.coral) { // récif : branches, éventails ou boules aux couleurs vives, ternies par la profondeur
      const pc = near(c.x, c.u, 1), cx0 = pc ? pc[0] : c.x, y = pc ? pc[1] : hz + D * c.u, R = (5 + 9 * c.u) * c.s, col = css(mixc(hsl(c.hue, 0.65, 0.6), [10, 30, 45], 0.35 + 0.45 * night), 0.85 * lit + 0.1);
      g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round";
      if (c.kind === 0) { g.lineWidth = Math.max(1, R * 0.18); g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.38 + (c.pts[i] - 0.5) * 0.3; g.moveTo(cx0, y); g.lineTo(cx0 + Math.cos(a) * R * (0.7 + 0.5 * c.pts[i]), y + Math.sin(a) * R * (0.7 + 0.5 * c.pts[i])); } g.stroke(); }
      else if (c.kind === 1) { g.beginPath(); g.moveTo(cx0, y); g.arc(cx0, y, R, Math.PI * 1.1, Math.PI * 1.9); g.closePath(); g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1; }
      else for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx0 + (c.pts[i] - 0.5) * R * 1.6, y - c.pts[i + 1] * R * 0.6, R * (0.25 + 0.2 * c.pts[i]), 0, TAU); g.fill(); }
    }
    g.restore();
  }
  if (sea.acid.length) {
    if (S.water && !shore) { g.fillStyle = css([170, 190, 60], 0.12 + 0.03 * Math.sin(TAU * t)); g.fillRect(0, hz, W, D); } // pas de terre : l'acide est dans l'eau
    g.save(); if (shore) { shorePath(g, shore.land); g.clip(); } else if (S.water) { g.restore(); return; }
    for (const a of sea.acid) { // flaques qui bouillonnent, une vapeur pâle au-dessus
      const pa = near(a.x, a.u, -1), ax = pa ? pa[0] : a.x, y = pa ? pa[1] : hz + D * a.u * a.u + D * 0.05, rx = (10 + 26 * ((y - hz) / D)) * a.w, ry = 1.6 + 5 * ((y - hz) / D);
      g.fillStyle = css(mixc([190, 210, 70], [10, 14, 8], 0.3 + 0.5 * night), 0.85); g.beginPath(); g.ellipse(ax, y, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = css([230, 245, 140], 0.35 * lit); g.lineWidth = 0.8; g.beginPath(); g.ellipse(ax, y, rx, ry, 0, Math.PI, TAU); g.stroke();
      for (let i = 0; i < 3; i++) { const q = frac(t * 2 + a.p + i / 3); g.strokeStyle = css([235, 250, 160], 0.5 * (1 - q) * lit); g.beginPath(); g.arc(ax + (i - 1) * rx * 0.4, y - q * 2, 0.8 + q * 1.6, 0, TAU); g.stroke(); }
      const vq = frac(t + a.p); g.fillStyle = css([210, 230, 140], 0.12 * (1 - vq) * lit); g.beginPath(); g.ellipse(ax, y - 4 - vq * 14, rx * 0.6, 3 + vq * 4, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
}

/** Le ciel nocturne propre à l'Âge : bande d'étoiles, nébuleuse, constellations (parfois reliées d'un trait très pâle). */
function nightSky(g, m, t, sv) {
  const { night: n, W, S } = m, few = S.amt && S.amt.stars != null ? S.amt.stars : 1; // « peu d'étoiles » : pas de bande ni de nébuleuse, constellations plus pâles
  sv *= Math.min(1, few); if (sv <= 0.01) return;
  if (n.band && few >= 0.6) { g.save(); g.translate(W / 2, n.band.y); g.rotate(n.band.a); for (const p of n.band.pts) { g.fillStyle = css([225, 228, 245], (0.12 + 0.35 * p.b) * sv); g.fillRect((p.u - 0.5) * W * 1.4, p.v * n.band.w, 1, 1); } const bg = g.createLinearGradient(0, -n.band.w, 0, n.band.w); bg.addColorStop(0, "rgba(220,225,245,0)"); bg.addColorStop(0.5, css([220, 225, 245], 0.07 * sv)); bg.addColorStop(1, "rgba(220,225,245,0)"); g.fillStyle = bg; g.fillRect(-W * 0.7, -n.band.w, W * 1.4, n.band.w * 2); g.restore(); }
  if (n.nebula && few >= 0.6) { const nb = n.nebula; g.save(); g.globalCompositeOperation = "lighter"; for (const b of nb.blobs) { const x = nb.x + b.dx * nb.R, y = nb.y + b.dy * nb.R, R = nb.R * b.r, gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, css(hsl(nb.hue + b.dx * 40, 0.6, 0.55), 0.14 * sv)); gr.addColorStop(1, css(hsl(nb.hue, 0.6, 0.5), 0)); g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2); } g.restore(); }
  for (const c of n.cons) {
    if (c.lines) { g.strokeStyle = css(c.tint, 0.13 * sv); g.lineWidth = 0.7; g.beginPath(); c.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
    for (const p of c.pts) { const a = (0.6 + 0.4 * Math.sin(TAU * t * 2 + p.tw)) * sv; g.fillStyle = css(c.tint, a); g.beginPath(); g.arc(p.x, p.y, p.s * 0.6, 0, TAU); g.fill(); if (p.s > 2.3) { g.fillStyle = css(c.tint, 0.18 * a); g.beginPath(); g.arc(p.x, p.y, p.s * 1.8, 0, TAU); g.fill(); } }
  }
}

/** Richesses : éclats de métal et de pierre sur le sol, qui scintillent à tour de rôle. */
function richGlints(g, m, t, night) {
  const { W, H, hz } = m; if (!m.rich.length) return;
  for (const rc of m.rich) for (const p of rc.pts) {
    const a = Math.pow(Math.max(0, Math.sin(TAU * (t * 2 + p.p))), 2), y = hz - H * 0.02 + (H - hz + H * 0.02) * Math.pow(p.u, 1.4), x = p.x * W, sz = (rc.big ? 3 : 2.1) * p.s * (0.7 + 0.5 * p.u);
    if (a > 0.25) { g.fillStyle = css(rc.col, 0.16 * a); g.fillRect(x - sz, y - sz, sz * 3, sz * 3); } // halo
    g.fillStyle = css(rc.col, 0.4 + 0.6 * a); g.fillRect(x, y, sz, sz);
    if (a > 0.55 && sz > 2.2) { g.strokeStyle = css([255, 255, 255], 0.5 * a); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + sz / 2 - 3, y + sz / 2); g.lineTo(x + sz / 2 + 3, y + sz / 2); g.moveTo(x + sz / 2, y + sz / 2 - 3); g.lineTo(x + sz / 2, y + sz / 2 + 3); g.stroke(); }
  }
}

/** Cicatrices du sol : surface calcinée (suie, braises), sol stérile (fentes sèches), eau amère (teinte verte), sol creux (fosses). */
function scarGround(g, m, t, night) {
  const { S, W, H, hz } = m, sc = new Set(S.scars || []); if (!sc.size && !S.blight) return;
  const f = (u) => hz + (H - hz) * u * u;
  if (S.blight) for (const p of m.scar.pits) { // la maladie du vivant (src/life.js) : des taches jaunies dans le vert
    const x = p.x * W, y = f(p.u), rx = (14 + 22 * p.u) * p.w, ry = 2.5 + 6 * p.u; g.fillStyle = css([196, 170, 70], 0.22 + 0.04 * Math.sin(TAU * (t + p.x))); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
  }
  if (sc.has("bitter_water") && (S.water || S.ice)) { g.fillStyle = css([96, 160, 64], 0.2 + 0.05 * Math.sin(TAU * t)); g.fillRect(0, hz, W, H - hz); }
  if (sc.has("scorched_surface")) {
    const gr = g.createLinearGradient(0, hz, 0, H); gr.addColorStop(0, "rgba(8,5,4,0.25)"); gr.addColorStop(1, "rgba(8,5,4,0.62)"); g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
    for (const e of m.scar.embers) { const a = 0.15 + 0.7 * Math.pow(Math.max(0, Math.sin(TAU * (t * 3 + e.p))), 2); g.fillStyle = css([255, 120, 40], a * (0.5 + 0.5 * night)); g.fillRect(e.x * W, f(e.u), 1.4, 1.4); }
  }
  if (sc.has("barren_soil") || sc.has("scorched_surface")) {
    g.strokeStyle = css(sc.has("scorched_surface") ? [20, 12, 8] : [66, 46, 30], 0.6); g.lineWidth = 1;
    for (const c of m.scar.cracks) { let x = c.x * W, y = f(0.05 + 0.9 * c.u); g.beginPath(); g.moveTo(x, y); c.pts.forEach((q, k) => { x += (k % 2 ? 1 : -1) * (7 + 8 * Math.abs(q)); y += (q + 0.2) * 7; g.lineTo(x, y); }); g.stroke(); }
  }
  if (sc.has("hollowed_ground")) for (const p of m.scar.pits) {
    const x = p.x * W, y = f(p.u), rx = (8 + 14 * p.u) * p.w, ry = 1.6 + 4 * p.u; g.fillStyle = "rgba(0,0,0,0.7)"; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = css([150, 130, 110], 0.28); g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, rx, ry, 0, Math.PI, TAU); g.stroke();
  }
}

/** L'intensité des cicatrices gardées du tirage (src/scarring.js) : légère à demi, profonde repassée une fois ; les cicatrices écrites sont normales. */
function scarPass(g, m, draw) {
  const lv = Object.values(m.S.scarLevel || {}), written = (m.S.scars || []).some((id) => !(m.S.scarLevel || {})[id]);
  const deep = lv.includes("deep"), light = !written && lv.length && lv.every((l) => l === "light");
  g.save(); if (light) g.globalAlpha *= 0.55; draw(); g.restore();
  if (deep) { g.save(); g.globalAlpha *= 0.45; draw(); g.restore(); }
}

/** Pluie retenue : un plafond de nuages lourds et bas, qui ne tombe pas. Ruines muettes : un voile gris sur le sol. */
function scarHeld(g, m, t) {
  const { S, W, H, hz } = m, sc = S.scars || [];
  if (sc.includes("held_rain")) {
    const gr = g.createLinearGradient(0, 0, 0, hz * 0.6); gr.addColorStop(0, css([38, 42, 52], 0.62)); gr.addColorStop(1, css([38, 42, 52], 0)); g.fillStyle = gr; g.fillRect(0, 0, W, hz * 0.6);
    for (let i = 0; i < 4; i++) { const x = ((i * 0.27 + t * 0.01) % 1.2 - 0.1) * W, y = hz * (0.08 + 0.07 * i); g.fillStyle = css([30, 34, 44], 0.32); g.beginPath(); g.ellipse(x, y, W * 0.22, hz * 0.06, 0, 0, TAU); g.fill(); }
  }
  if (sc.includes("mute_ruins")) { g.fillStyle = css([128, 128, 134], 0.16 + 0.03 * Math.sin(TAU * t)); g.fillRect(0, hz, W, H - hz); }
}

/** Air empoisonné : voile verdâtre et bandes de brume acide. */
function scarAir(g, m, t) {
  const { S, W, H, hz } = m; if (!(S.scars || []).includes("poisoned_air")) return;
  g.fillStyle = css([140, 172, 70], 0.12 + 0.04 * Math.sin(TAU * t)); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) { const y = hz - H * (0.04 + 0.08 * i), gr = g.createLinearGradient(0, y - H * 0.08, 0, y + H * 0.08); gr.addColorStop(0, "rgba(150,190,80,0)"); gr.addColorStop(0.5, css([150, 190, 80], 0.2)); gr.addColorStop(1, "rgba(150,190,80,0)"); g.fillStyle = gr; g.fillRect(-frac(t + i * 0.3) * 20, y - H * 0.08, W + 30, H * 0.16); }
}

/** Banquise : nappe de glace claire, plaques fissurées en perspective, congères à l'horizon, reflet du soleil, scintillements. */
function iceSheet(g, m, t, sn, day, night, hzc) {
  const { S, W, H, hz } = m, dk = [8, 18, 34], q = rng(S.seed ^ 0x1ce);
  const near = mixc([112, 168, 206], dk, night * 0.8), far = mixc(mixc(hzc, [236, 247, 255], 0.6), dk, night * 0.7);
  const wg = g.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, css(far)); wg.addColorStop(1, css(near)); g.fillStyle = wg; g.fillRect(0, hz, W, H - hz);
  const lit = 1 - night * 0.65;
  for (let i = 0; i < 20; i++) { // fractures qui divergent depuis l'horizon (perspective)
    const x0 = q() * W, x1 = x0 + (x0 - W / 2) * (0.5 + q() * 1.4), n = 5; let px = x0, py = hz;
    g.strokeStyle = css([250, 253, 255], 0.38 * lit); g.lineWidth = 1; g.beginPath(); g.moveTo(px, py);
    const pts = []; for (let k = 1; k <= n; k++) { const u = k / n; px = x0 + (x1 - x0) * u + (q() - 0.5) * 14 * u; py = hz + (H - hz) * u * u * 1.05; pts.push([px, py]); g.lineTo(px, py); } g.stroke();
    g.strokeStyle = css([20, 50, 90], 0.22 * lit); g.beginPath(); g.moveTo(x0 + 1.2, hz); pts.forEach(([x, y]) => g.lineTo(x + 1.2, y + 0.8)); g.stroke();
    if (q() < 0.5) { const [bx, by] = pts[2], dx = (q() - 0.5) * 60; g.strokeStyle = css([250, 253, 255], 0.28 * lit); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + dx * 0.5, by + 6); g.lineTo(bx + dx, by + 4 + q() * 10); g.stroke(); }
  }
  for (let i = 0; i < 7; i++) { const u = 0.1 + 0.9 * q(), y = hz + (H - hz) * u * u, x = q() * W, w = W * (0.1 + 0.25 * u); g.fillStyle = css([255, 255, 255], 0.08 * lit); g.beginPath(); g.ellipse(x, y, w, 2 + 6 * u, 0, 0, TAU); g.fill(); } // plaques plus claires
  const s = sn.find((z) => z.e > 0.12); if (s) { const gl = g.createLinearGradient(0, hz, 0, H); gl.addColorStop(0, css([255, 255, 255], 0.5 * Math.min(1, s.e * 2))); gl.addColorStop(1, css([255, 255, 255], 0)); g.fillStyle = gl; g.beginPath(); g.moveTo(s.x - 3, hz); g.lineTo(s.x + 3, hz); g.lineTo(s.x + 34, H); g.lineTo(s.x - 34, H); g.closePath(); g.fill(); }
  for (let p = 0; p < 44; p++) { const r2 = rng(S.seed + p * 7); g.fillStyle = css([235, 247, 255], 0.2 + 0.7 * Math.pow(Math.max(0, Math.sin(TAU * (t * 2 + r2()))), 3)); const u = r2(); g.fillRect(r2() * W, hz + (H - hz) * u * u, 1.5, 1.5); }
  for (let i = 0; i < 9; i++) { const x = W * (i / 8) + (q() - 0.5) * 30, w = W * (0.07 + 0.08 * q()); g.fillStyle = css(mixc([240, 248, 255], dk, night * 0.6), 0.85); g.beginPath(); g.ellipse(x, hz + 2, w, H * 0.025, 0, Math.PI, TAU); g.fill(); } // congères
}

/** Givre sur la vitre : voile blanc dans les coins et cristaux ramifiés. */
function frost(g, m, t, night) {
  const { W, H, S } = m, q = rng(S.seed ^ 0xf205), a = 0.55 - night * 0.2;
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([cx, cy]) => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.75); gr.addColorStop(0, css([235, 246, 255], 0.5)); gr.addColorStop(1, css([235, 246, 255], 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sx = cx ? -1 : 1, sy = cy ? -1 : 1, grow = (x, y, ang, len, depth) => {
      const x2 = x + Math.cos(ang) * len * sx, y2 = y + Math.sin(ang) * len * sy; g.strokeStyle = css([245, 252, 255], a * (1 - depth * 0.2)); g.lineWidth = 1.1 - depth * 0.25; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (depth < 3) for (const k of [-0.6, 0.6]) { if (q() < 0.8) grow(x + (x2 - x) * 0.55, y + (y2 - y) * 0.55, ang + k, len * 0.55, depth + 1); }
    };
    for (let i = 0; i < 7; i++) grow(cx, cy, (i / 6) * Math.PI / 2, H * (0.16 + 0.14 * q()), 0);
  });
  g.fillStyle = css([235, 246, 255], 0.14); g.fillRect(0, 0, W, H);
}

/** Crochets posés par le plugin : l'ouverture (0 à 1) des fissures d'un Âge d'après son âge. Sans plugin : grande ouverte. */
const HOOKS = { opening: () => 1, doom: () => 0 };
const hook = (fn, S, dflt) => { try { const v = fn(S.name); return typeof v === "number" && v === v ? Math.max(0, Math.min(1, v)) : dflt; } catch (e) { return dflt; } };
/** Ouverture des fissures : toujours grande ouverte quand l'Âge s'effondre. */
const openingOf = (S) => (doomOf(S) > 0 ? 1 : hook(HOOKS.opening, S, 1));
/** Effondrement (0 à 1) : 0 = rien ; ~0,12 = condamné, qui commence à se fissurer ; 0 → 1 pendant la fin en direct ; 1 = détruit (le vide). */
const doomOf = (S) => hook(HOOKS.doom, S, 0);

/** Voile de fin d'Âge : l'Âge rougeoie, un éclat monte (la supernova), tout devient blanc, puis noir : le vide et des cendres. */
function doomVeil(g, W, H, p, cx, cy) {
  const cl = (x) => Math.max(0, Math.min(1, x)), T = Date.now() / 1000;
  g.save();
  const warm = 0.3 * cl(p / 0.3) * (1 - cl((p - 0.8) / 0.1));
  if (warm > 0.01) { g.fillStyle = `rgba(150,36,12,${warm})`; g.fillRect(0, 0, W, H); }
  const b = cl((p - 0.3) / 0.5);
  if (b > 0.01) {
    const R = (0.1 + 1.6 * b * b) * Math.max(W, H), gr = g.createRadialGradient(cx, cy, 1, cx, cy, R);
    gr.addColorStop(0, `rgba(255,250,230,${0.95 * b})`); gr.addColorStop(0.35, `rgba(255,190,80,${0.55 * b})`); gr.addColorStop(1, "rgba(255,120,30,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
  }
  const w = cl((p - 0.72) / 0.16); if (w > 0) { g.fillStyle = `rgba(255,252,240,${w})`; g.fillRect(0, 0, W, H); }
  const v = cl((p - 0.86) / 0.1); if (v > 0) { g.fillStyle = `rgba(0,0,0,${v})`; g.fillRect(0, 0, W, H); }
  if (p > 0.95) for (let i = 0; i < 28; i++) { // cendres qui dérivent dans le vide
    const q = rng(i * 977 + 13), x = (q() * W + Math.sin(T * 0.3 + i) * 6 + T * 2) % W, y = (q() * H + T * (3 + 4 * q())) % H;
    g.fillStyle = `rgba(190,170,150,${0.12 + 0.25 * q()})`; g.fillRect(x, y, 1.2, 1.2);
  }
  g.restore();
}

/** L'effondrement vu de la fenêtre : le sol se fend de toutes parts, puis le voile. */
function doomFx(g, m, p, sn) {
  const { S, W, H, hz } = m, cl = (x) => Math.max(0, Math.min(1, x));
  const reach = cl(p / 0.6);
  if (reach > 0.02) {
    const q = rng((S.seed ^ 0xd00d) >>> 0), T = Date.now() / 1000; g.save(); g.lineJoin = "miter";
    for (let i = 0; i < 6; i++) {
      let x = W * (0.08 + 0.84 * q()), y = H; const pts = [[x, y]], steps = 9;
      for (let j = 1; j <= steps; j++) { x += (q() - 0.5) * W * 0.12; y -= (H - hz) * 1.05 / steps; pts.push([x, y]); }
      const n = Math.max(2, Math.round(pts.length * reach));
      for (const [col, lw] of [["rgba(0,0,0,0.8)", 2.2], [`rgba(255,${150 + 40 * Math.sin(T * 5 + i)},60,${0.55 * cl(p * 2)})`, 0.8]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.slice(0, n).forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
    }
    g.restore();
  }
  const s0 = sn && sn.find((x) => x.i === 0 && x.y < hz), cx = s0 ? s0.x : m.fis ? m.fis.x : W / 2, cy = s0 ? s0.y : hz * 0.55;
  doomVeil(g, W, H, p, cx, cy);
}

function fissure(g, m, t) {
  const { S, W, H, hz, fis } = m;
  if (S.fissure === "cave") {
    // une butte rocheuse irrégulière (des blocs, des strates), une bouche de grotte sombre et déchiquetée ; la crevasse luit au fond, sans jamais déborder de la bouche
    const x = fis.x, hw = H * 0.22, h = H * 0.2, J = fis.pts, rock = mixc(m.pal.rock, [150, 140, 128], 0.22), N = 16, top = [];
    for (let i = 0; i <= N; i++) { const u = i / N, bump = Math.pow(Math.sin(Math.PI * u), 0.6), n1 = J[i % J.length], n2 = J[(i * 3 + 1) % J.length]; top.push([x - hw * 1.4 + u * hw * 2.8 + n1 * hw * 0.08, hz - h * bump * (0.75 + 0.35 * n2) - (i % 3 === 1 ? h * 0.12 : 0)]); }
    g.fillStyle = css(rock); g.strokeStyle = css(mixc(rock, [0, 0, 0], 0.45)); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - hw * 1.45, hz + 4); top.forEach(([px, py]) => g.lineTo(px, py)); g.lineTo(x + hw * 1.45, hz + 4); g.closePath(); g.fill(); g.stroke();
    g.save(); g.clip(); g.strokeStyle = css(mixc(rock, [0, 0, 0], 0.3), 0.6); g.lineWidth = 0.8; // des strates et des fentes dans la roche
    for (let k = 1; k <= 3; k++) { const y = hz - h * 0.22 * k; g.beginPath(); g.moveTo(x - hw * 1.4, y + J[k] * 4); g.lineTo(x - hw * 0.2, y - 3 + J[k + 1] * 3); g.lineTo(x + hw * 1.4, y + 2 + J[k + 2] * 4); g.stroke(); }
    g.fillStyle = css(mixc(rock, [255, 245, 225], 0.12), 0.5); g.beginPath(); g.moveTo(x - hw * 1.2, hz - h * 0.2); top.slice(2, 8).forEach(([px, py]) => g.lineTo(px, py + 2)); g.lineTo(x - hw * 0.2, hz - h * 0.4); g.closePath(); g.fill(); // la lumière sur le flanc
    g.restore();
    const mw = hw * 0.42, mh = h * 0.6, mouth = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI, rr = 1 + J[i % J.length] * 0.25; mouth.push([x + Math.cos(a) * mw * rr, hz + 3 + Math.sin(a) * mh * rr]); }
    g.beginPath(); mouth.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath();
    g.fillStyle = "#020203"; g.fill(); g.strokeStyle = css(mixc(rock, [0, 0, 0], 0.65)); g.lineWidth = 2; g.stroke(); // la bouche, plus sombre que tout, et son rebord
    g.save(); g.clip();
    crevasse(g, { x, y0: hz - mh * 0.8, y1: hz + 2, w: mw * 0.5, jit: J, t, seed: 1 + ((S.seed >>> 0) % 89), shape: "lens", open: 1 }); // dans la grotte, toujours une crevasse (et jamais une menace)
    g.restore();
    return;
  }
  const sub = S.fissure === "submarine", y0 = sub ? hz + (H - hz) * 0.3 : hz + 2;
  crevasse(g, { x: fis.x, y0, y1: H - 2, w: W * 0.04, jit: fis.pts, t, water: sub, open: openingOf(S), seed: 1 + ((S.seed >>> 0) % 89) });
  if (sub) for (const b of fis.bubbles) { const q = frac(t * 2 + b.p); g.strokeStyle = css([205, 235, 248], 0.5 * (1 - q)); g.lineWidth = 0.9; g.beginPath(); g.arc(fis.x + b.dx, H - 4 - q * (H - y0 - 8), 1 + 1.4 * b.p, 0, TAU); g.stroke(); }
}

/** ESSAI : un tronc qui a de la matière : large au pied (évasé), effilé vers la couronne, une face d'ombre et quelques fentes d'écorce.
 *  P0 le pied, C le point de contrôle, P1 le haut ; w0 et w1 les largeurs ; fill et shade des couleurs css. Renvoie le point à u (pour les branches). */
function trunk(g, P0, C, P1, w0, w1, fill, shade, flare = 0.7) {
  const N = 14, L = [], R = [], at = (u) => [(1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * C[0] + u * u * P1[0], (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * C[1] + u * u * P1[1]];
  for (let i = 0; i <= N; i++) { const u = i / N, [x, y] = at(u), dx = 2 * (1 - u) * (C[0] - P0[0]) + 2 * u * (P1[0] - C[0]), dy = 2 * (1 - u) * (C[1] - P0[1]) + 2 * u * (P1[1] - C[1]), l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, fl = Math.max(0, 1 - u * 5), w = (w0 + (w1 - w0) * u) * (1 + flare * fl * fl) / 2;
    L.push([x + nx * w, y + ny * w]); R.push([x - nx * w, y - ny * w, x, y]); }
  g.fillStyle = fill; g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); g.fill();
  g.fillStyle = shade; g.beginPath(); g.moveTo(R[0][2], R[0][3]); for (const p of R) g.lineTo(p[2] + (p[0] - p[2]) * 0.1, p[3] + (p[1] - p[3]) * 0.1); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); g.fill(); /* la face d'ombre */
  if (w0 > 3) { g.strokeStyle = shade; g.lineWidth = Math.max(0.5, w0 * 0.07); for (let j = 0; j < 4; j++) { const u0 = 0.08 + 0.18 * j, o = (j % 2 ? 0.25 : -0.15); const a = at(u0), b = at(u0 + 0.12); g.beginPath(); g.moveTo(a[0] + o * w0 * 0.5, a[1]); g.lineTo(b[0] + o * w0 * 0.4, b[1]); g.stroke(); } } /* des fentes d'écorce */
  return at;
}
/** ESSAI : des branches maîtresses, du tronc vers la couronne. */
function boughs(g, at, h, w, fill, shade, ends) { for (const [u, ex, ey] of ends) { const [bx, by] = at(u); trunk(g, [bx, by], [(bx + ex) / 2, by - (by - ey) * 0.25], [ex, ey], w, w * 0.35, fill, shade, 0); } }

function trees(g, m, t) {
  /* les arbres du Relto (src/relto-render.js, drawPlants) repris dans la fenêtre, et quelques espèces de plus dans le même style : des couleurs, que la nuit éteint */
  const { S, hz } = m, se = S.season, fall = se && se.fall > 0.01 ? se.fall : 0, bare = se ? 0.45 + 0.55 * se.vig : 1;
  const TK = typeof m.treeKind === "string" ? { main: m.treeKind, second: m.treeKind } : m.treeKind, amb = 0.25 + 0.75 * (m.dayK != null ? m.dayK : 1), night = m.nightK || 0;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const col = (c) => css(mixc([5, 6, 12], mixc(leafC(S, typeof c === "string" ? hex(c) : c), [150, 78, 26], S.wonderMetal ? 0 : fall * 0.6), amb)), dark = (c) => css(mixc([5, 6, 12], leafC(S, typeof c === "string" ? hex(c) : c), amb));
  let stalkDone = false; /* l'arbre à tige : un seul par fenêtre, comme au Relto */
  for (const [i, tr] of m.trees.entries()) {
    const v = rng((S.seed ^ (0x7e11 + i * 7919)) >>> 0); let kind = S.burnt || S.lava || S.world === "lava" ? "spire" : v() < 0.32 ? TK.second : TK.main; if (kind === "stalktree") { if (stalkDone) kind = TK.main === "stalktree" ? (TK.second === "stalktree" ? "broadleaf" : TK.second) : TK.main; else stalkDone = true; }
    if (S.youngTrees) { /* l'anachronisme : un tronc gris, nu, à demi formé, fendu ; plus le monde est jeune, plus il est abîmé */
      const sev = S.youngTrees, hh = tr.h * 1.9 * (1.05 - 0.15 * sev) * (0.85 + 0.3 * v()), x = tr.x, y = hz + 3, lean = tr.lean * 6 + (v() - 0.5) * 14 * sev, broken = v() < 0.2 + 0.35 * sev, topY = y - hh * (broken ? 0.75 + 0.15 * v() : 1), tx = x + lean * (topY < y ? (y - topY) / hh : 1);
      const bark = mixc([5, 6, 12], mixc([168, 162, 150], [128, 120, 112], sev * 0.5), amb) /* du bois mort, blanchi */, fade = g.createLinearGradient(0, y, 0, topY); fade.addColorStop(0, css(bark, 1)); fade.addColorStop(1, css(bark, 0.9 - 0.45 * sev));
      g.strokeStyle = fade; g.lineWidth = 4.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - hh * 0.5, tx, topY); g.stroke(); /* le tronc s'efface vers le haut : mal tiré */
      if (broken) { g.fillStyle = css(bark, 0.9); g.beginPath(); g.moveTo(tx - 2, topY); g.lineTo(tx - 0.5, topY - 4); g.lineTo(tx + 0.6, topY - 1.5); g.lineTo(tx + 2, topY - 3.5); g.lineTo(tx + 1.5, topY + 1); g.closePath(); g.fill(); }
      g.strokeStyle = css([20, 16, 14], 0.8); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + 0.5, y - hh * 0.1); g.lineTo(x + lean * 0.12 + 1, y - hh * 0.35); g.lineTo(x + lean * 0.2, y - hh * 0.45); g.stroke(); /* la fente */
      g.strokeStyle = fade; g.lineWidth = 1.6; for (let b = 0; b < 5 - Math.round(1 * sev); b++) { const u = 0.45 + 0.15 * b, bx = x + lean * u * 0.6, by = y - hh * u, d = b % 2 ? 1 : -1, L = hh * (0.22 - 0.03 * b) * (1 - 0.4 * sev); if (by < topY) break; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + d * L, by - L * 0.5); g.lineTo(bx + d * L * 1.2, by - L * (0.5 + 0.3 * v())); g.stroke(); if (sev < 0.6) { g.fillStyle = css(mixc([5, 6, 12], [150, 156, 96], amb), 0.75); for (let f2 = 0; f2 < 3; f2++) { g.beginPath(); g.ellipse(bx + d * L * (0.7 + 0.2 * f2), by - L * (0.45 + 0.1 * f2), 2.6, 1.6, 0, 0, TAU); g.fill(); } } } /* des branches nues, quelques feuilles pâles s'il est moins abîmé */
      g.fillStyle = css(bark, 0.7); for (let k2 = 0; k2 < 3; k2++) g.fillRect(x + (v() - 0.5) * 14, y - 1, 2 + v() * 3, 1.5); /* des débris au pied */
      continue; }
    const sz = 1.0 + 0.55 * v();
    const h = tr.h * sz, sw = 1.6 * Math.sin(TAU * t + tr.p), x = tr.x, y = hz + 3, top = hz - h;
    { const tv = rng((S.seed ^ (0x5ca1e + i * 131)) >>> 0), sx = (tv() < 0.5 ? -1 : 1) * (0.7 + 0.65 * tv()), sy = 0.82 + 0.4 * tv(), rot = (tv() - 0.5) * 0.14; g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, sy); g.translate(-x, -y); } /* ESSAI : chaque arbre a sa carrure : plus large ou plus élancé, penché, retourné ; pas deux têtes pareilles */
    if (kind === "spire") { g.fillStyle = dark("#0a0909"); g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + sw * 0.4 + tr.lean * 4, top); g.lineTo(x + 2.5, y); g.fill();
      if (S.burnt) { g.lineWidth = 1.4; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(x + sw * 0.3, hz - h * 0.7); g.lineTo(x + s2 * h * 0.3 + sw, hz - h * 0.95); g.stroke(); } }
      else { g.lineWidth = 1; for (let k = 1; k < 4; k++) { const yy = hz - h * (0.3 + k * 0.17); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (k % 2 ? 1 : -1) * h * 0.18 + sw, yy - h * 0.07); g.stroke(); } } }
    else if (kind === "conifer") { const cw = Math.max(1, h * 0.03); g.fillStyle = col("#3a2a1c"); g.fillRect(x - cw, y - h * 0.22, cw * 2, h * 0.22); g.fillStyle = col(i % 2 ? "#1f4a30" : "#1a3a28"); for (let k = 0; k < 3; k++) { const w = h * (0.42 - k * 0.1) * (0.6 + 0.4 * bare), yy = y - h * (0.18 + k * 0.28); g.beginPath(); g.moveTo(x - w + sw * k * 0.3, yy); g.lineTo(x + sw * (k + 1) * 0.5, yy - h * 0.38); g.lineTo(x + w + sw * k * 0.3, yy); g.closePath(); g.fill(); } } /* Relto : conifère */
    else if (kind === "birch") { const w0 = Math.max(2, h * 0.06), at = trunk(g, [x, y], [x + tr.lean * 3, y - h * 0.4], [x + sw * 0.4, y - h * 0.8], w0, w0 * 0.5, dark("#e8e6dc"), dark("#a8a498"), 0.4); g.fillStyle = dark("#2a2620"); for (let k = 0; k < 6; k++) { const [bx, by] = at(0.08 + 0.13 * k); g.fillRect(bx - w0 * (k % 2 ? 0.1 : 0.45), by, w0 * 0.45, Math.max(0.8, w0 * 0.18)); } /* les marques noires du bouleau */ g.fillStyle = col("#8fb057"); const r0 = h * 0.12 * bare; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + sw * 0.5 + (k - 1.5) * r0 * 0.8, y - h * (0.7 + (k % 2) * 0.15), r0 * (1 - 0.2 * (k % 2)), 0, TAU); g.fill(); } } /* Relto : bouleau */
    else if (kind === "frond") { g.strokeStyle = col("#6a5438"); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - h * 0.5, x + 2 + sw * 0.4, y - h * 0.9); g.stroke(); g.strokeStyle = col("#3d7a3a"); g.lineWidth = 1.6; const R = h * 0.35; for (let k = 0; k < 6; k++) { const a = -2.6 + k * 0.5 + sw * 0.02; g.beginPath(); g.moveTo(x + 2 + sw * 0.4, y - h * 0.9); g.quadraticCurveTo(x + 2 + Math.cos(a) * R * 0.6, y - h * 0.9 + Math.sin(a) * R * 0.6 - 4, x + 2 + Math.cos(a) * R, y - h * 0.9 + Math.sin(a) * R * 0.6 + 6); g.stroke(); } } /* Relto : palmier */
    else if (kind === "ponderosa") { const w0 = Math.max(3, h * 0.08); trunk(g, [x, y], [x + sw * 0.15, y - h * 0.45], [x + sw * 0.3, y - h * 0.9], w0, w0 * 0.35, col("#6b3f26"), col("#3a2014")); g.fillStyle = col("#264a2c"); const W0 = h * 0.3 * (0.6 + 0.4 * bare); for (let k = 0; k < 5; k++) { const yy = y - h * (0.5 + k * 0.11), w = W0 * (1 - k * 0.13), o = (k % 2 ? 1 : -1) * W0 * 0.25; g.beginPath(); g.ellipse(x + o + sw * (0.2 + k * 0.1), yy, w, h * 0.085, 0, 0, TAU); g.fill(); } } /* Relto : pin ponderosa */
    else if (kind === "maple") { const w0 = Math.max(2.6, h * 0.085), fill = col("#5a4030"), shade = col("#2a1c14"), at = trunk(g, [x, y], [x + tr.lean * 4, y - h * 0.3], [x + sw * 0.3, y - h * 0.6], w0, w0 * 0.5, fill, shade); boughs(g, at, h, w0 * 0.45, fill, shade, [[0.85, x - h * 0.16 + sw * 0.3, y - h * 0.74], [0.9, x + h * 0.17 + sw * 0.3, y - h * 0.78]]); const LEAF = ["#c4552a", "#d98a2b", "#b83a2a"], b0 = Math.floor(x) % 3, R = h * 0.2 * bare; for (let k = 0; k < 6; k++) { g.fillStyle = dark(LEAF[(b0 + (k % 2)) % 3]); g.beginPath(); g.arc(x + Math.cos(k * 1.05) * R + sw * 0.4, y - h * 0.72 + Math.sin(k * 1.6) * R * 0.75, R * (1 + (k % 3) * 0.12), 0, TAU); g.fill(); } } /* Relto : érable */
    else if (kind === "crystaltree") { /* l'arbre de cristal : un tronc-prisme translucide qui se ramifie en branches cristallines, chaque prisme à deux faces, des grappes d'éclats au bout ; sa lumière est la sienne */
      const ct = crystalToneOf(S), HUE = hsl(ct.hue + ct.spread * 0.5, ct.fsat, 0.6), lum = (c, a) => css(mixc(mixc([5, 6, 12], c, amb), c, 0.6 * night), a);
      const light = hsl(ct.hue + ct.spread, ct.fsat * 0.8, 0.78), deep = hsl(ct.hue, ct.fsat, 0.32), tipC = hsl(ct.hue + 150, 0.6, 0.74), H2 = h * 1.15;
      if (night > 0.15) glowAt(g, x, y - H2 * 0.55, H2 * 0.85, HUE, 0.45 * night);
      const prism = (x0, y0, x1, y1, w0, w1) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; /* deux faces : claire à gauche, profonde à droite, une arête vive */
        g.fillStyle = lum(light, 0.82); g.beginPath(); g.moveTo(x0 + nx * w0, y0 + ny * w0); g.lineTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x1 + dx / L * w1 * 1.6, y1 + dy / L * w1 * 1.6); g.lineTo(x1, y1); g.lineTo(x0, y0); g.closePath(); g.fill();
        g.fillStyle = lum(deep, 0.85); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + dx / L * w1 * 1.6, y1 + dy / L * w1 * 1.6); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.lineTo(x0 - nx * w0, y0 - ny * w0); g.closePath(); g.fill();
        g.strokeStyle = lum([245, 255, 255], 0.7); g.lineWidth = 0.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      const tw = Math.max(2, h * 0.045), tx = x + sw * 0.3, ty = y - H2 * 0.42; prism(x, y, tx, ty, tw, tw * 0.7);
      const tips = []; const grow = (bx, by, a, L, w, d) => { const ex = bx + Math.cos(a) * L + sw * 0.2, ey = by + Math.sin(a) * L; prism(bx, by, ex, ey, w, w * 0.6); if (d > 0) { const n = 2 + (v() < 0.4 ? 1 : 0); for (let k = 0; k < n; k++) grow(ex, ey, a + (k - (n - 1) / 2) * (0.45 + 0.2 * v()), L * (0.62 + 0.12 * v()), w * 0.62, d - 1); } else tips.push([ex, ey, a]); };
      for (let k = 0; k < 3; k++) grow(tx, ty, -Math.PI / 2 + (k - 1) * (0.42 + 0.15 * v()), H2 * (0.26 + 0.05 * v()), tw * 0.7, 1);
      for (const [ex, ey, a] of tips) for (let k = 0; k < 3; k++) { const aa = a + (k - 1) * 0.5, L = h * (0.06 + 0.05 * v()); prism(ex, ey, ex + Math.cos(aa) * L, ey + Math.sin(aa) * L, 1.6, 0.8); g.fillStyle = lum(tipC, 0.9); g.beginPath(); g.arc(ex, ey, 1.3, 0, TAU); g.fill(); } /* les grappes d'éclats, un cœur de la teinte complémentaire */
      for (let k = 0; k < 6; k++) { const [ex, ey] = tips[Math.floor(v() * tips.length)] || [x, top], f = Math.max(0, Math.sin(TAU * t * 2 + k * 1.7 + i)); if (f > 0.6) { g.strokeStyle = css([255, 255, 255], (f - 0.6) * 2); g.lineWidth = 0.8; const r = 3 * f; g.beginPath(); g.moveTo(ex - r, ey); g.lineTo(ex + r, ey); g.moveTo(ex, ey - r); g.lineTo(ex, ey + r); g.stroke(); } } /* des éclats de lumière */
    }
    else if (kind === "stalktree") { /* l'arbre à tige du Relto (src/relto-render.js, drawStalk) : deux grandes tiges sombres à bulbes, ailes de feuilles pâles, poussières lumineuses */
      const k = (h * 1.3) / 96, xs = Math.max(m.W * 0.18, Math.min(m.W * 0.82, x)), stems = [{ dx: -4, h: 96 * k, bend: -5 * k, w: 2.6, pod: 4.6 * k }, { dx: 3 * k, h: 78 * k, bend: 7 * k, w: 2.2, pod: 4 * k }, { dx: 9 * k, h: 44 * k, bend: 10 * k, w: 1.5, pod: 3 * k }];
      g.fillStyle = col("#3a3a2a"); g.beginPath(); g.ellipse(xs + 2, y - 2, 13 * k, 3 * k, 0, 0, TAU); g.fill();
      const qs = stems.map((st, j) => { const s2 = Math.sin(TAU * t * 0.7 + j * 1.7) * 1.4; return { x0: xs + st.dx, y0: y - 2, cx: xs + st.dx + st.bend * 0.2, cy: y - 2 - st.h * 0.5, x1: xs + st.dx + st.bend + s2, y1: y - 2 - st.h }; });
      const at = (q, u) => [(1 - u) * (1 - u) * q.x0 + 2 * (1 - u) * u * q.cx + u * u * q.x1, (1 - u) * (1 - u) * q.y0 + 2 * (1 - u) * u * q.cy + u * u * q.y1];
      stems.forEach((st, j) => { const q = qs[j]; g.lineCap = "round"; g.strokeStyle = col("#1f2b1d"); g.lineWidth = st.w * Math.max(1, k) * 1.6; g.beginPath(); g.moveTo(q.x0, q.y0); g.quadraticCurveTo(q.cx, q.cy, q.x1, q.y1); g.stroke(); g.strokeStyle = col("#3b4f33"); g.lineWidth = 0.6; g.beginPath(); g.moveTo(q.x0 + 0.8, q.y0); g.quadraticCurveTo(q.cx + 0.8, q.cy, q.x1 + 0.6, q.y1 + 2); g.stroke(); g.fillStyle = col("#14170f"); g.beginPath(); g.ellipse(q.x1, q.y1 - st.pod * 0.6, st.pod * 0.8, st.pod, 0, 0, TAU); g.fill(); g.fillStyle = css([255, 255, 255], 0.12); g.beginPath(); g.ellipse(q.x1 - 1, q.y1 - st.pod * 0.9, st.pod * 0.25, st.pod * 0.4, 0, 0, TAU); g.fill(); });
      g.lineCap = "butt";
      [[0, 0.56, 4.6 * k], [1, 0.42, 3.6 * k]].forEach(([si, u, r], j) => { const [bx, by] = at(qs[si], u); g.fillStyle = col("#1c211b"); g.beginPath(); g.ellipse(bx, by, r, r * 1.15, 0, 0, TAU); g.fill(); for (let w = 0; w < 2; w++) { const sg = w ? 1 : -1, fl = Math.sin(TAU * t * 1.1 + j + w) * 0.08; g.fillStyle = col("#a9b890"); g.beginPath(); g.moveTo(bx, by + 1); g.quadraticCurveTo(bx + sg * r * 2.4, by - r * (1.1 + fl * 4), bx + sg * r * 3.6, by + r * 0.3); g.quadraticCurveTo(bx + sg * r * 1.6, by + r * 0.2, bx, by + 1); g.fill(); } });
      for (let j = 0; j < 26; j++) { const px = xs + (v() - 0.5) * 78 * k + Math.sin(TAU * t * 0.4 + j) * 4, py = y - stems[0].h * (0.35 + v() * 0.8) + Math.sin(TAU * t * 0.6 + j * 1.3) * 3, tw = 0.35 + 0.65 * Math.abs(Math.sin(TAU * t * (0.6 + v()) + j)); g.fillStyle = css([240, 238, 150], Math.min(1, tw * (0.5 + 0.8 * night + 0.2))); g.fillRect(px, py, 1.4 + night, 1.4 + night); }
      if (night > 0.35) glowAt(g, qs[0].x1, qs[0].y1 - 3, 16 * k, [240, 235, 150], 0.22 * night); }
    else if (kind === "ginkgo") { /* le ginkgo (d'après photo) : un grand arbre, couronne ovale et dense faite d'éventails, branches qui montent ; vert l'été, or à l'automne */
      const gold = se ? Math.min(1, (se.fall || 0) * 1.4) : 0, H2 = h * 1.25, cw = H2 * 0.3, cyc = y - H2 * 0.6;
      const tone = (k) => css(mixc([5, 6, 12], mixc(mixc([86, 132, 50], [120, 168, 70], k), mixc([214, 160, 20], [250, 214, 70], k), gold), amb));
      trunk(g, [x, y], [x + sw * 0.15, y - H2 * 0.42], [x + sw * 0.3, y - H2 * 0.85], Math.max(3, h * 0.08), Math.max(1.4, h * 0.025), col("#3e3026"), col("#1e1610")); g.strokeStyle = col("#3e3026"); g.lineWidth = Math.max(1.3, h * 0.02);
      for (let k = 0; k < 9; k++) { const by = y - H2 * (0.22 + 0.07 * k), d = k % 2 ? 1 : -1, L = cw * (0.9 - 0.06 * k); g.beginPath(); g.moveTo(x + sw * 0.2, by); g.quadraticCurveTo(x + d * L * 0.5, by - L * 0.2, x + d * L * 0.85 + sw * 0.5, by - L * 0.75); g.stroke(); }
      const fan = (fx, fy, r, a, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(fx, fy); g.arc(fx, fy, r, a - 0.75, a + 0.75); g.closePath(); g.fill(); };
      for (let k = 0; k < 320; k++) { const u = v(), w2 = (v() - 0.5) * 2, ey = cyc + (u - 0.5) * H2 * 0.78, half = cw * Math.sqrt(Math.max(0, 1 - Math.pow((ey - cyc) / (H2 * 0.42), 2))) * (ey < cyc ? 0.85 : 1), ex = x + sw * 0.6 + w2 * half; const shade = 0.25 + 0.75 * (0.5 - w2 * 0.35 - (ey - cyc) / H2 * 0.5); fan(ex, ey, h * (0.045 + 0.025 * v()) * (0.5 + 0.5 * bare), -Math.PI / 2 + (v() - 0.5) * 1.6, tone(Math.max(0, Math.min(1, shade)))); }
      if (gold > 0.3) { g.fillStyle = css(mixc([5, 6, 12], [236, 196, 48], amb), 0.85); for (let k = 0; k < 18; k++) { g.beginPath(); g.ellipse(x + (v() - 0.5) * h * 0.9, y - 1 - v() * 2, 1.6, 0.8, 0, 0, TAU); g.fill(); } } }
    else if (kind === "umbrella") { trunk(g, [x, y], [x + tr.lean * 8, hz - h * 0.5], [x + sw * 0.5, top + h * 0.15], Math.max(2.2, h * 0.07), Math.max(1.2, h * 0.025), col("#4a3826"), col("#241a10")); g.strokeStyle = col("#4a3826"); g.lineWidth = Math.max(1, h * 0.022); g.beginPath(); g.moveTo(x + sw * 0.5, top + h * 0.3); g.lineTo(x - h * 0.25 + sw, top + h * 0.14); g.moveTo(x + sw * 0.5, top + h * 0.3); g.lineTo(x + h * 0.25 + sw, top + h * 0.14); g.stroke(); g.fillStyle = col("#5c6a2e"); g.beginPath(); g.ellipse(x + sw, top + h * 0.12, h * 0.5 * bare, h * 0.1 * bare, 0, 0, TAU); g.fill(); } /* acacia */
    else if (kind === "broadleaf") { const w0 = Math.max(2.6, h * 0.085), fill = col("#4a3424"), shade = col("#24180f"), at = trunk(g, [x, y], [x + tr.lean * 6, hz - h * 0.5], [x + sw * 0.5, top + h * 0.3], w0, w0 * 0.45, fill, shade); const R = h * 0.26 * bare; boughs(g, at, h, w0 * 0.45, fill, shade, [[0.78, x + sw - R * 0.6, top + h * 0.24], [0.84, x + sw + R * 0.55, top + h * 0.2]]); for (let k = 0; k < 7; k++) { g.fillStyle = col(k % 3 ? "#2f6a34" : "#3f8040"); g.beginPath(); g.arc(x + sw + (v() - 0.5) * R * 1.6, top + h * 0.22 + (v() - 0.5) * R * 0.9, R * (0.55 + 0.35 * v()), 0, TAU); g.fill(); } } /* feuillu */
    else if (kind === "willow") { const w0 = Math.max(2.6, h * 0.09); trunk(g, [x, y], [x + tr.lean * 6, hz - h * 0.5], [x + sw * 0.5, top + h * 0.15], w0, w0 * 0.4, col("#4e3a28"), col("#261a10")); g.strokeStyle = col("#7aa04a"); g.lineWidth = 1; const R = h * 0.32; for (let k = 0; k < 13; k++) { const a = Math.PI * (0.1 + 0.8 * k / 12), sx = x + sw + Math.cos(a) * R * 0.6, sy = top + h * 0.15 - Math.sin(a) * R * 0.25; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(a) * R * 0.3, sy + h * 0.1, sx + Math.cos(a) * R * 0.35 + sw * 0.6, sy + h * (0.35 + 0.15 * v()) * bare); g.stroke(); } } /* saule */
    else if (kind === "cypress") { g.fillStyle = col("#1c3a26"); g.beginPath(); g.moveTo(x - h * 0.08, y); g.quadraticCurveTo(x - h * 0.13, hz - h * 0.5, x + sw * 0.6, top); g.quadraticCurveTo(x + h * 0.13, hz - h * 0.5, x + h * 0.08, y); g.closePath(); g.fill(); } /* cyprès */
    else if (kind === "baobab") { const tw = h * 0.12; g.fillStyle = col("#6e5a48"); g.beginPath(); g.moveTo(x - tw, y); g.quadraticCurveTo(x - tw * 1.2, hz - h * 0.5, x - tw * 0.6, top + h * 0.25); g.lineTo(x + tw * 0.6, top + h * 0.25); g.quadraticCurveTo(x + tw * 1.2, hz - h * 0.5, x + tw, y); g.closePath(); g.fill(); g.strokeStyle = g.fillStyle; g.lineWidth = 1.4; for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.15 + 0.7 * k / 5); g.beginPath(); g.moveTo(x, top + h * 0.27); g.lineTo(x + Math.cos(a) * h * 0.3 + sw, top + h * 0.27 + Math.sin(a) * h * 0.22); g.stroke(); } g.fillStyle = col("#5c7a34"); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (k - 1.5) * h * 0.16 + sw, top + h * 0.06, h * 0.07 * bare, 0, TAU); g.fill(); } } /* baobab */
    else if (kind === "twisted") { const d = tr.lean > 0 ? 1 : -1; g.strokeStyle = col("#3e2e22"); g.lineWidth = Math.max(2.2, h * 0.07); g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x - d * h * 0.15, hz - h * 0.35, x + d * h * 0.35, hz - h * 0.55, x + d * h * 0.3 + sw, top + h * 0.2); g.stroke(); g.lineCap = "butt"; g.fillStyle = col("#2c4a2e"); for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + d * h * (0.15 + 0.2 * k) + sw, top + h * (0.18 + 0.05 * k), h * 0.16 * bare, h * 0.05, 0, 0, TAU); g.fill(); } } /* arbre tordu par le vent */
    else { /* arbre-champignon géant, à la Teledahn : tronc en bouteille cerclé de collerettes, chapeau en cloche taché et rouillé, frange dessous ; des bulbes au pied */
      const vr = v(), sort = vr < 0.5 ? "rust" : vr < 0.8 ? "bone" : "glow", H2 = h * (1.2 + 0.4 * v()), base = h * 0.16, neck = base * 0.42, cx = x + tr.lean * 3 + sw * 0.4, capY = y - H2, R = h * (0.26 + 0.1 * v());
      const P = { rust: { stem: [120, 96, 62], cap: [128, 74, 38], spot: [190, 120, 60], dark: [52, 32, 20] }, bone: { stem: [176, 160, 128], cap: [168, 148, 110], spot: [110, 82, 50], dark: [70, 56, 40] }, glow: { stem: [70, 82, 84], cap: [40, 66, 72], spot: [90, 170, 160], dark: [16, 26, 30] } }[sort];
      const st = g.createLinearGradient(x - base, 0, x + base, 0); st.addColorStop(0, col(mixc(P.stem, [0, 0, 0], 0.35))); st.addColorStop(0.35, col(mixc(P.stem, [255, 240, 210], 0.15))); st.addColorStop(1, col(mixc(P.stem, [0, 0, 0], 0.55)));
      g.fillStyle = st; g.beginPath(); g.moveTo(x - base * 0.9, y); g.bezierCurveTo(x - base * 1.6, y - H2 * 0.3, cx - neck * 0.9, y - H2 * 0.62, cx - neck, capY + R * 0.25); g.lineTo(cx + neck, capY + R * 0.25); g.bezierCurveTo(cx + neck * 0.9, y - H2 * 0.62, x + base * 1.6, y - H2 * 0.3, x + base * 0.9, y); g.closePath(); g.fill(); /* le tronc en bouteille */
      g.strokeStyle = col(mixc(P.stem, [0, 0, 0], 0.5)); g.lineWidth = 0.6; for (let k = 0; k < 5; k++) { const ox = (k - 2) * base * 0.35; g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox * 0.9, y - H2 * 0.4, cx + ox * 0.35, capY + R * 0.3); g.stroke(); } /* l'écorce */
      for (const f of [0.5, 0.72]) { const yy = y - H2 * f, wv = base * (1.25 - f * 0.95); g.fillStyle = col(mixc(P.stem, [0, 0, 0], 0.4)); g.beginPath(); g.ellipse(x + (cx - x) * f, yy, wv * 1.25, wv * 0.3, 0, 0, TAU); g.fill(); g.fillStyle = col(mixc(P.stem, [255, 235, 200], 0.2)); g.beginPath(); g.ellipse(x + (cx - x) * f, yy - wv * 0.12, wv * 1.15, wv * 0.18, 0, Math.PI, TAU); g.fill(); } /* les collerettes */
      g.fillStyle = col(P.dark); g.beginPath(); g.ellipse(cx, capY + R * 0.3, R * 0.92, R * 0.17, 0, 0, TAU); g.fill(); /* le dessous sombre */
      g.strokeStyle = col(mixc(P.dark, P.cap, 0.4)); g.lineWidth = 0.7; for (let k = 0; k < 16; k++) { const fx = cx - R * 0.9 + k * R * 0.12; g.beginPath(); g.moveTo(fx, capY + R * 0.3); g.lineTo(fx + (v() - 0.5), capY + R * (0.36 + 0.12 * v())); g.stroke(); } /* la frange */
      g.fillStyle = col(P.cap); g.beginPath(); g.moveTo(cx - R, capY + R * 0.3); g.bezierCurveTo(cx - R * 1.02, capY - R * 0.15, cx - R * 0.55, capY - R * 0.62, cx, capY - R * 0.66); g.bezierCurveTo(cx + R * 0.55, capY - R * 0.62, cx + R * 1.02, capY - R * 0.15, cx + R, capY + R * 0.3); g.quadraticCurveTo(cx, capY + R * 0.42, cx - R, capY + R * 0.3); g.closePath(); g.fill(); /* le chapeau en cloche */
      g.save(); g.clip(); for (let k = 0; k < 26; k++) { g.fillStyle = col(k % 3 ? P.spot : P.dark); g.globalAlpha = 0.45 + 0.35 * v(); g.beginPath(); g.ellipse(cx + (v() - 0.5) * R * 2, capY + (v() - 0.6) * R * 0.9, R * (0.06 + 0.12 * v()), R * (0.04 + 0.07 * v()), v() * 3, 0, TAU); g.fill(); } g.globalAlpha = 1; g.fillStyle = col(mixc(P.cap, [0, 0, 0], 0.4)); g.globalAlpha = 0.5; g.fillRect(cx + R * 0.2, capY - R, R, R * 1.5); g.globalAlpha = 1; g.restore(); /* taché, rouillé, ombré d'un côté */
      if (sort === "glow") { glowAt(g, cx, capY + R * 0.35, R * 2, [110, 230, 210], 0.15 + 0.6 * night); g.fillStyle = css([150, 250, 230], 0.35 + 0.5 * night); for (let k = 0; k < 12; k++) g.fillRect(cx - R * 0.9 + k * R * 0.15, capY + R * (0.38 + 0.1 * v()), 1.2, 1.2); }
      for (let k = 0; k < 3; k++) { const bx = x + (v() - 0.5) * h * 0.9, bh = h * (0.12 + 0.12 * v()), c2 = v() < 0.5 ? [214, 118, 52] : [52, 160, 150]; g.strokeStyle = col([70, 76, 50]); g.lineWidth = 0.9; g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + 3, y - bh * 0.6, bx + 1, y - bh); g.stroke(); g.fillStyle = col(c2); g.beginPath(); g.arc(bx + 1, y - bh, h * 0.025 + 1, 0, TAU); g.fill(); } /* bulbes orange et turquoise au pied */
    }
    g.restore();
    if (S.fire) for (let k = 0; k < 3; k++) { const p = 0.5 + 0.5 * Math.sin(TAU * (t * 3 + k * 0.31 + i * 0.2)), fx = x + (k - 1) * 4 + sw; g.fillStyle = css([255, 140 + 60 * p, 40], 0.8); g.beginPath(); g.moveTo(fx - 2, hz - h * 0.7); g.lineTo(fx, hz - h * (0.9 + 0.25 * p)); g.lineTo(fx + 2, hz - h * 0.7); g.closePath(); g.fill(); }
  }
}

function auroraCurtains(g, m, t, ak) { require("./aurora").curtains(g, { W: m.W, H: m.H, hz: m.hz, seed: m.S.seed, t, ak }); } /* ESSAI : les aurores en rideaux (src/aurora.js) */
/** ESSAI (28 oct. soir) : la pierre des ruines, au lieu d'un noir de silhouette : la roche du monde, éteinte la nuit, un peu de la brume de l'horizon. */
function stoneOf(m) {
  const S = m.S, night = m.nightK || 0, day = m.dayK != null ? m.dayK : 1;
  const base = S.lava || S.world === "lava" ? [52, 42, 38] : S.rock === "basalt" ? [78, 80, 86] : S.soil === "chalk" ? [196, 188, 164] : S.rock === "granite" ? [150, 138, 132] : S.sand || S.world === "desert" ? [172, 146, 108] : S.ice || S.world === "frozen" ? [150, 168, 182] : [132, 124, 112];
  const hazed = mixc(base, m.pal.dayHz, 0.22 * day), lit = mixc(hazed, [6, 8, 12], 0.12 + 0.72 * night);
  return { lit, top: mixc(lit, [255, 248, 230], 0.16 * day * (1 - night)), low: mixc(lit, [0, 0, 0], 0.4), edge: mixc(lit, [0, 0, 0], 0.55), joint: mixc(lit, [0, 0, 0], 0.5) };
}
/** les ruines, peintes à part puis appareillées (lits de pierre, ombre au pied) et posées dans l'image ; sans calque possible, en aplat de pierre. */
function ruinsPass(g, m, t) {
  if (!m.ruins.length) return; const st = stoneOf(m), { W, H, hz } = m;
  let L = null; if (typeof document !== "undefined") { try { const c = m._rl || (m._rl = document.createElement("canvas")); if (c.width !== W) c.width = W; if (c.height !== H) c.height = H; L = c.getContext("2d"); if (!L || typeof L.clearRect !== "function" || typeof g.drawImage !== "function") L = null; } catch (e) { L = null; } }
  if (!L) { for (const rn of m.ruins) ruin(g, m, rn, t, g, st); return; }
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = "source-over"; L.clearRect(0, 0, W, H);
  for (const rn of m.ruins) ruin(L, m, rn, t, g, st);
  L.globalCompositeOperation = "source-atop";
  const gr = L.createLinearGradient(0, hz - H * 0.35, 0, hz + 2); gr.addColorStop(0, css(st.top)); gr.addColorStop(0.55, css(st.lit)); gr.addColorStop(1, css(st.low)); L.fillStyle = gr; L.fillRect(0, 0, W, H); /* plus clair en haut, sombre au pied */
  const sc = W / 560, row = Math.max(3, 5 * sc); L.strokeStyle = css(st.joint, 0.45); L.lineWidth = Math.max(0.6, 0.7 * sc); L.beginPath();
  for (let y = hz + 1, i = 0; y > hz - H * 0.45; y -= row, i++) { L.moveTo(0, y); L.lineTo(W, y); for (let x = (i % 2) * row * 1.3; x < W; x += row * 2.6) { L.moveTo(x, y); L.lineTo(x, y - row); } } L.stroke(); /* les lits et les joints de l'appareil */
  const q = rng((m.S.seed ^ 0x51a7e) >>> 0); for (let k = 0; k < 120; k++) { L.fillStyle = css(q() < 0.5 ? st.low : st.top, 0.25); L.fillRect(q() * W, hz - q() * H * 0.45, (2 + 4 * q()) * sc, (1 + 2 * q()) * sc); } /* les pierres inégales */
  L.globalCompositeOperation = "source-over"; g.drawImage(L.canvas, 0, 0);
}
function ruin(g, m, rn, t, fx = g, st = stoneOf(m)) {
  const { S, W, H, hz } = m, b = rn.x; g.fillStyle = css(st.lit); g.strokeStyle = css(st.edge); g.lineWidth = 1;
  const v8 = rng((S.seed ^ Math.imul(Math.round(b * 13) + 7, 2654435761)) >>> 0); /* chaque ruine a sa forme, d'un tirage à part (le reste de l'image ne bouge pas) */
  const RS = ["massive", "arched", "gothic", "fallen"][Math.floor(rng((S.seed ^ 0x5717) >>> 0)() * 4)]; /* un style par Âge : toutes les ruines d'un Âge viennent d'une même main */
  if (rn.k === "door") { const f0 = v8(), f = RS === "massive" ? 0.1 : RS === "arched" ? 0.4 : RS === "gothic" ? 0.7 : 0.9 + 0 * f0, v = H * (0.07 + 0.05 * v8()), h = H * (0.18 + 0.1 * v8());
    if (f < 0.3) { const pw = v * 0.38; g.fillRect(b - v, hz - h * 0.86, pw, h * 0.86 + 2); g.fillRect(b + v - pw, hz - h * 0.86, pw, h * 0.86 + 2); g.fillRect(b - v * 1.25, hz - h, v * 2.5, h * 0.16); g.strokeRect(b - v * 1.25, hz - h, v * 2.5, h * 0.16); } /* trilithe : deux montants et un linteau, le jour passe dessous */
    else if (f < 0.55) { g.beginPath(); g.moveTo(b - v, hz + 2); g.lineTo(b - v, hz - h + v); g.arc(b, hz - h + v, v, Math.PI, 0); g.lineTo(b + v, hz + 2); g.closePath(); g.fill(); g.stroke(); } /* plein cintre */
    else if (f < 0.8) { g.beginPath(); g.moveTo(b - v, hz + 2); g.lineTo(b - v, hz - h * 0.7); g.lineTo(b, hz - h); g.lineTo(b + v, hz - h * 0.7); g.lineTo(b + v, hz + 2); g.closePath(); g.fill(); g.stroke(); } /* en ogive (l'ancienne) */
    else { const cut = 0.35 + 0.3 * v8(); g.beginPath(); g.moveTo(b - v, hz + 2); g.lineTo(b - v, hz - h * 0.7); g.lineTo(b - v * 0.2, hz - h * 0.95); g.lineTo(b + v * 0.1, hz - h * 0.78); g.lineTo(b + v * 0.45, hz - h * (0.7 - cut * 0.5)); g.lineTo(b + v, hz - h * (0.7 - cut)); g.lineTo(b + v, hz + 2); g.closePath(); g.fill(); g.stroke(); for (let k = 0; k < 4; k++) { const bw = 2 + v8() * 4; g.fillRect(b + v * (0.9 + v8() * 0.8), hz - bw + 2, bw, bw); } } /* effondrée d'un côté, les blocs au pied */
  }
  else if (rn.k === "bridge") { const v = W * (0.14 + 0.1 * v8()), na = RS === "massive" ? 1 : RS === "arched" ? 3 : 2, gap = RS === "fallen" || v8() < 0.2 ? Math.floor(v8() * na) : -1, deck = 4 + v8() * 4, rise = H * (0.12 + 0.1 * v8()), aw = (2 * v) / na;
    for (let a = 0; a < na; a++) { const x0 = b - v + a * aw; if (a === gap) { /* ESSAI (28 oct. soir) : l'arche tombée, lisible : chaque pile garde la naissance de l'arche et un bout de tablier cassé (avant : deux rectangles noirs) */
        for (const sd of [0, 1]) { const px = sd ? x0 + aw : x0, dir = sd ? -1 : 1, pw = aw * 0.2, top = hz - rise - deck, reach = aw * (0.3 + 0.08 * v8());
          g.beginPath(); g.moveTo(px, hz + 2); g.lineTo(px, top); g.lineTo(px + dir * reach, top); g.lineTo(px + dir * reach * 0.9, top + deck * 0.6); g.lineTo(px + dir * reach * 1.02, top + deck * 1.1); g.lineTo(px + dir * reach * 0.8, top + deck + rise * 0.18); /* le bord cassé */
          g.quadraticCurveTo(px + dir * pw * 1.05, top + deck + rise * 0.3, px + dir * pw, hz + 2); g.closePath(); g.fill(); g.stroke(); }
        for (let k = 0; k < 4; k++) { const bx = x0 + aw * (0.3 + 0.12 * k + 0.05 * v8()), bw = aw * (0.06 + 0.05 * v8()), bh = deck * (0.5 + 0.6 * v8()); g.save(); g.translate(bx, hz + 1); g.rotate((v8() - 0.5) * 0.6); g.fillRect(-bw / 2, -bh, bw, bh); g.restore(); } continue; } /* les pierres tombées au pied */
      g.beginPath(); g.moveTo(x0, hz + 2); g.lineTo(x0, hz - rise - deck); g.lineTo(x0 + aw, hz - rise - deck); g.lineTo(x0 + aw, hz + 2); g.lineTo(x0 + aw * 0.88, hz + 2); g.quadraticCurveTo(x0 + aw / 2, hz - rise * 1.6, x0 + aw * 0.12, hz + 2); g.closePath(); g.fill(); g.stroke(); }
  }
  else if (rn.k === "tablet") { const v = H * (0.05 + 0.03 * v8()), h = H * (0.14 + 0.1 * v8()), tilt = (v8() - 0.5) * 0.35, round = RS === "arched" || (RS !== "massive" && v8() < 0.3), chip = RS === "fallen" || v8() < 0.3; g.save(); g.translate(b, hz + 2); g.rotate(tilt);
    g.beginPath(); g.moveTo(-v, 0); if (round) { g.lineTo(-v, -h + v); g.arc(0, -h + v, v, Math.PI, 0); } else { g.lineTo(-v, -h); if (chip) { g.lineTo(v * 0.3, -h); g.lineTo(v, -h * 0.78); } else g.lineTo(v, -h); } g.lineTo(v, 0); g.closePath(); g.fill(); g.stroke(); g.restore(); /* stèle ronde ou dalle, penchée, parfois écornée */
    const vv = v, hh = h; void vv; void hh; if (S.tabletAwake) { fx.fillStyle = css([255, 190, 110], 0.35 + 0.3 * Math.sin(TAU * t * 2)); fx.fillRect(b - v + 3, hz - h + 6, v * 2 - 6, 1.4); fx.fillRect(b - v + 3, hz - h + 12, v * 2 - 10, 1.4); } }
  else { g.fillRect(b - 1.2, hz - H * 0.16, 2.4, H * 0.16 + 2);
    if (S.lampLit) { const lg = fx.createRadialGradient(b, hz - H * 0.17, 1, b, hz - H * 0.17, H * 0.2); lg.addColorStop(0, css([140, 190, 255], 0.55 + 0.15 * Math.sin(TAU * t * 3))); lg.addColorStop(1, css([140, 190, 255], 0)); fx.fillStyle = lg; fx.fillRect(0, 0, W, H); fx.fillStyle = "#cfe3ff"; fx.beginPath(); fx.arc(b, hz - H * 0.17, 2.4, 0, TAU); fx.fill(); }
    else { g.fillStyle = css(st.edge); g.beginPath(); g.arc(b, hz - H * 0.17, 2.2, 0, TAU); g.fill(); } }
}

/** Le temps qu'il fait, chaque élément à sa présence du moment (`m.lv`, posé par paint ; 1 partout pour un Âge sans ligne programmée). */
function weather(g, m, t) {
  const { S, W, H, hz } = m, L = m.lv || weatherLevels(m, t);
  const fk = S.amt && S.amt.fog != null ? S.amt.fog : 1;
  stormShade(g, m, L);
  const F = m.front, side = F && (F.mode === "right" || F.mode === "left"), far = F && (F.mode === "ahead" || F.mode === "shower");
  if (L.fog > 0.005) for (let i = 0; i < 3; i++) { const y = hz - H * (0.02 + 0.07 * i), x = frac(t * (1 + i % 2) + i * 0.3) * W; const gr = g.createLinearGradient(0, y - H * 0.1, 0, y + H * 0.08); gr.addColorStop(0, "rgba(190,200,210,0)"); gr.addColorStop(0.5, css([190, 200, 210], clamp((0.2 - i * 0.04) * fk, 0, 0.75) * L.fog)); gr.addColorStop(1, "rgba(190,200,210,0)"); g.fillStyle = gr; g.fillRect(-x * 0.1, y - H * 0.1, W + 20, H * 0.18); }
  if (L.scent > 0.005) scentedMist(g, m, t, L.scent);
  if (L.heat > 0.005) { g.fillStyle = css([255, 160, 90], 0.05 * L.heat); for (let y = hz - H * 0.05; y < hz + H * 0.1; y += 4) g.fillRect(2 * Math.sin(TAU * t * 2 + y), y, W, 1); }
  if (L.steam > 0.005) for (let i = 0; i < 6; i++) { const q = frac(t * 2 + i / 6); g.fillStyle = css([220, 225, 230], 0.25 * (1 - q) * L.steam); g.beginPath(); g.arc(W * (0.15 + 0.14 * i) + 5 * Math.sin(TAU * (q + i)), hz - q * H * 0.4, 2 + q * 5, 0, TAU); g.fill(); }
  const ml = S.ash ? L.ash : S.dust ? L.dust : L.wind; // la couleur des poussières suit celle d'avant : cendre, sinon sable, sinon vent
  if ((S.dust || S.ash || S.wind) && ml > 0.005) for (const p of m.motes) { const x = frac(p.x / W + t * p.k * (S.dust ? 3 : 1.5)) * W, y = p.y + 3 * Math.sin(TAU * (t * 2 + p.p)); g.fillStyle = S.ash ? css([160, 160, 160], 0.4 * ml) : S.dust ? css([200, 160, 100], 0.45 * ml) : css([220, 220, 230], 0.12 * ml); g.fillRect(x, y, S.dust ? 2 : 1.2, 1); }
  if (L.tornado > 0.005) tornado(g, m, t, L.tornado);
  if (L.rain > 0.005 && !far) { g.strokeStyle = css([190, 205, 225], lerp(0.3, 0.45, L.storm) * L.rain); g.lineWidth = 1; g.beginPath(); const sl = side ? (F.mode === "right" ? -0.18 : 0.18) : 0.12; for (const d of m.drops) { const y = frac(d.y + t * d.v) * H, x = d.x + y * sl; if (side && stormCov(m, x, y) < 0.35 + 0.3 * frac(d.x * 7.3)) continue; g.moveTo(x, y); g.lineTo(x - sl * H * d.l * 1.4, y - H * d.l); } g.stroke(); } /* ESSAI : sous l'orage seulement ; il pousse la pluie devant lui */
  if (L.drizzle > 0.005 || L.acidRain > 0.005 || L.crystalRain > 0.005) drizzle(g, m, t, L);
  if (L.snow > 0.005 || L.ashRain > 0.005) flakes(g, m, t, L);
  if (L.petals > 0.005) petals(g, m, t, L.petals);
  else if (S.season) { if (S.season.bloom > 0.01) petals(g, m, t, 0.8 * S.season.bloom); if (S.season.fall > 0.01) petals(g, m, t, 0.9 * S.season.fall, true); } /* le printemps sème des pétales, l'automne des feuilles */
  if (L.hail > 0.005) { g.fillStyle = css([230, 240, 255], 0.7 * L.hail); for (const d of m.drops) { const y = frac(d.y + t * d.v * 1.5) * H; g.fillRect((d.x + y * 0.05) % W, y, 1.6, 1.6); } }
  if (L.lightning > 0.005) {
    const q = Math.floor(t * 4), g2 = rng(S.seed + q * 101), on = g2() < 0.35 && frac(t * 4) < 0.18;
    if (on) {
      g.fillStyle = css([220, 230, 255], (far ? 0.1 : 0.22) * L.lightning); g.fillRect(0, 0, W, H); g.strokeStyle = css([240, 245, 255], 0.9 * L.lightning); g.lineWidth = far ? 1 : 1.4; g.beginPath(); let x = W * (0.2 + 0.6 * g2()), y = 0;
      if (F && F.mode !== "shower") { const u = g2(); if (side) { y = frontBase(m); const e = frontEdge(m, y / hz); x = F.mode === "right" ? lerp(e, W, 0.15 + 0.75 * u) : lerp(e, 0, 0.15 + 0.75 * u); } else { x = W * (0.1 + 0.8 * u); y = F.mode === "ahead" ? lerp(frontEdge(m, x / W), hz, 0.25) : frontEdge(m, x / W); } } /* ESSAI : l'éclair tombe de l'orage */
      g.moveTo(x, y);
      while (y < hz) { x += (g2() - 0.5) * W * 0.07; y += H * (0.05 + 0.05 * g2()); g.lineTo(x, y); } g.stroke();
    }
  }
}

/** ESSAI : la part du ciel (et du sol, en x) sous l'orage, de 0 à 1. `m.frontF` : jusqu'où le front s'avance (suit le niveau de l'orage). */
function frontLump(F, u) { const n = F.lumps.length - 1, k = clamp(u) * n, i = Math.min(n - 1, Math.floor(k)), a = k - i; return F.lumps[i] * (1 - a) + F.lumps[i + 1] * a; }
function frontBase(m) { return m.hz * (0.62 + 0.1 * m.front.lumps[0]); } // la base de l'orage vu de côté : dessous, la pluie
function towerTop(m, x) { // la muraille vue de face : deux ou trois tours de cumulonimbus sur un mur plus bas
  const { W, H, hz, front: F } = m, f = m.frontF || 0.5, L = F.lumps; let h = 0;
  for (let i = 0; i < 3; i++) { const c = W * (0.12 + 0.76 * L[i + 1]), w = W * (0.07 + 0.08 * L[i + 4]), A = 0.45 + 0.55 * L[i + 7]; h = Math.max(h, A * Math.exp(-(((x - c) / w) ** 2))); }
  return hz - hz * 1.45 * f * (0.32 + 0.68 * h) + H * 0.012 * (frontLump(F, x / W) - 0.5);
}
function frontEdge(m, u) { // le bord du front : x (côtés, u = y / hz) ou y (dessus, muraille, u = x / W)
  const { W, H, hz, front: F } = m, f = m.frontF || 0.5, b = frontLump(F, u) - 0.5;
  if (F.mode === "right" || F.mode === "left") { const x = W * (1 - f) + W * 0.06 * Math.min(u, 0.75) + W * 0.03 * b; return F.mode === "right" ? x : W - x; }
  if (F.mode === "over") return hz * (0.12 + 0.8 * f) + H * 0.035 * b;
  return towerTop(m, u * W);
}
function stormCov(m, x, y) {
  const F = m.front; if (!F || F.mode === "shower") return 1; const { W, H, hz } = m, yy = Math.min(y, frontBase(m));
  if (F.mode === "right") return clamp(0.5 + (x - frontEdge(m, yy / hz)) / (W * 0.06));
  if (F.mode === "left") return clamp(0.5 + (frontEdge(m, yy / hz) - x) / (W * 0.06));
  if (F.mode === "over") return clamp(0.5 + (frontEdge(m, x / W) - y) / (H * 0.05));
  return clamp(0.5 + (y - frontEdge(m, x / W)) / (H * 0.04));
}
/** ESSAI : la masse de l'orage, peinte après les astres (elle les cache) et avant les crêtes ; ses rideaux de pluie au loin. L'averse au loin et son arc. */
function stormSky(g, m, t, L, day, night, hzc, sn) {
  const { S, W, H, hz, front: F } = m; if (!F) return;
  const lit = 0.35 + 0.65 * day, dark = mixc(mixc([30, 34, 44], hzc, 0.18), [6, 8, 14], 0.6 * night), pale = mixc(mixc(dark, [235, 232, 225], 0.32), hzc, 0.2);
  if (F.mode === "shower") {
    const k = L.rain; if (k < 0.005) return;
    const near = m.ridges.slice(1), ridgeTop = (x0, x1) => { let y = m.hz; for (const rg of near) { const n = rg.xs.length - 1; for (let i = Math.max(0, Math.floor((x0 / W) * n)); i <= Math.min(n, Math.ceil((x1 / W) * n)); i++) y = Math.min(y, rg.xs[i]); } return y; };
    const drawn = [];
    for (const c0 of F.cells) {
      const rt = ridgeTop(c0.x - c0.w / 2, c0.x + c0.w / 2), c = { ...c0, base: Math.min(c0.base, rt - H * 0.09), vis: rt }; // la base au-dessus des crêtes proches : on voit la pluie tomber derrière elles
      drawn.push(c);
      const yb = hz + 1; // la pluie : un voile large comme la base, aux bords doux (des bandes qui se chevauchent), qui pâlit en bas et penche avec le vent
      for (let j = 0; j < 6; j++) { const v = j / 5, l = c.lumps[j], xa = c.x - c.w * 0.3 + c.w * 0.6 * v, w = c.w * (0.3 + 0.1 * l), sh = c.w * c.lean;
        const cg = g.createLinearGradient(0, c.base, 0, yb); cg.addColorStop(0, css(mixc(dark, hzc, 0.4), 0.26 * k)); cg.addColorStop(0.75, css(mixc(dark, hzc, 0.5), 0.2 * k)); cg.addColorStop(1, css(mixc(dark, hzc, 0.55), 0.02 * k));
        g.fillStyle = cg; g.beginPath(); g.moveTo(xa - w / 2, c.base); g.lineTo(xa + w / 2, c.base); g.lineTo(xa + w / 2 + sh, yb); g.lineTo(xa - w / 2 + sh, yb); g.closePath(); g.fill(); }
      g.strokeStyle = css(mixc(dark, hzc, 0.5), 0.12 * k); g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 14; i++) { const x = c.x - c.w * 0.36 + c.w * 0.72 * ((i + 0.5 * c.lumps[i % 9]) / 14); g.moveTo(x, c.base + 2); g.lineTo(x + c.w * c.lean, yb); } g.stroke();
      const P = c.lumps.map((l, i) => { const v = i / 8, x = c.x - c.w * 0.42 + c.w * 0.84 * v, top = Math.sin(Math.PI * (0.08 + 0.84 * v)), r = c.h * (0.26 + 0.24 * l) * (0.6 + 0.5 * top); return [x, c.base - r * 0.55 - c.h * 0.9 * top * (0.6 + 0.6 * l), r, l]; }).concat(c.lumps.slice(0, 4).map((l, i) => [c.x + c.w * (i - 1.5) * 0.14, c.base - c.h * (1.15 + 0.35 * l), c.h * (0.26 + 0.12 * l), l])); // un cumulus bourgeonnant, qui monte // un cumulus bourgeonnant : un dôme de lobes sur une base plate
      g.fillStyle = css(mixc(dark, pale, 0.45), 0.9 * k); g.beginPath(); g.moveTo(c.x - c.w * 0.4, c.base); g.quadraticCurveTo(c.x, c.base + c.h * 0.08, c.x + c.w * 0.4, c.base); g.lineTo(c.x + c.w * 0.3, c.base - c.h * 0.45); g.lineTo(c.x - c.w * 0.3, c.base - c.h * 0.45); g.closePath(); g.fill(); // le dessous, sombre et presque plat
      g.fillStyle = css(mixc(dark, pale, 0.55), 0.95 * k); g.beginPath(); for (const [x, y, r] of P) { g.moveTo(x + r * 1.15, y); g.ellipse(x, y, r * 1.15, r, 0, 0, TAU); } g.fill(); // un seul contour : pas de cailloux empilés
      const ytop = Math.min(...P.map((p) => p[1] - p[2])); g.fillStyle = css(mixc(pale, [255, 248, 235], 0.5 * day), 0.3 * k * lit); g.beginPath(); for (const [x, y, r] of P) if (y - r < ytop + c.h * 0.7) { g.moveTo(x - r * 0.15 + r * 0.8, y - r * 0.35); g.ellipse(x - r * 0.15, y - r * 0.35, r * 0.8, r * 0.55, 0, 0, TAU); } g.fill(); // le haut éclairé, d'un seul tenant
    }
    const s0 = sn.find((s) => s.i === 0), face = (S.view && S.view.face) || "eq"; // l'arc : le soleil bas dans le dos (face au levant le soir, au couchant le matin)
    if (s0 && s0.e > 0.06 && s0.e < 0.5 && (face === "east" || face === "west") && (s0.y < 0 || s0.x < 0 || s0.x > W)) {
      const cx = W * 0.5, cy = hz + H * 0.7 * s0.e, a = k * clamp(s0.e * 3) * 0.85, BANDS = [[200, 70, 70], [215, 140, 70], [220, 205, 110], [110, 175, 110], [90, 140, 200], [110, 90, 175]];
      for (const c of drawn) { const R = clamp(Math.hypot(c.x - cx, cy - lerp(c.base, c.vis, 0.55)), H * 0.6, H * 1.5); g.save(); g.beginPath(); g.rect(c.x - c.w * 0.4, c.base, c.w * 0.8, hz - c.base); g.clip(); /* l'arc ne se voit que dans la pluie */
        BANDS.forEach((col, i) => { g.strokeStyle = css(col, 0.32 * a); g.lineWidth = H * 0.012; g.beginPath(); g.arc(cx, cy, R - i * H * 0.012, Math.PI, TAU); g.stroke(); }); g.restore(); }
    }
    return;
  }
  const k = L.storm; if (k < 0.005) return;
  const Lm = F.lumps, lobes = [], cap = (x, y, r, l, dx, dy) => lobes.push([x, y, r, dx, dy]); // les lobes du bord : tous les corps, puis tous les reflets (un bord continu, pas des disques empilés)
  const lobesOut = () => { g.fillStyle = css(mixc(dark, pale, 0.2), 0.95 * k); g.beginPath(); for (const [x, y, r] of lobes) { g.moveTo(x + r * 1.15, y); g.ellipse(x, y, r * 1.15, r, 0, 0, TAU); } g.fill();
    g.fillStyle = css(mixc(pale, [255, 246, 230], 0.35 * day), 0.26 * k * lit); g.beginPath(); for (const [x, y, r, dx, dy] of lobes) { const cx = x + dx * r * 0.42, cy = y + dy * r * 0.45; g.moveTo(cx + r * 0.62, cy); g.ellipse(cx, cy, r * 0.62, r * 0.4, 0, 0, TAU); } g.fill(); lobes.length = 0; };
  const curtain = (xa, ya, w, lean, a) => { const rg = g.createLinearGradient(0, ya, 0, hz); rg.addColorStop(0, css(mixc(dark, pale, 0.45), 0.05 * k)); rg.addColorStop(0.5, css(mixc(dark, pale, 0.5), 0.3 * k * a)); rg.addColorStop(1, css(mixc(dark, hzc, 0.45), 0.42 * k * a));
    g.fillStyle = rg; g.beginPath(); g.moveTo(xa - w / 2, ya); g.lineTo(xa + w / 2, ya); g.lineTo(xa + w / 2 + W * lean, hz + 1); g.lineTo(xa - w / 2 + W * lean, hz + 1); g.closePath(); g.fill(); };
  g.save();
  if (F.mode === "right" || F.mode === "left") { // vu de côté : l'enclume en haut qui déborde sur le ciel clair, le corps, la base, et la pluie dessous
    if (F.mode === "left") { g.translate(W, 0); g.scale(-1, 1); }
    const X = (y) => W * (1 - m.frontF) + W * 0.06 * Math.min(y / hz, 0.75) + W * 0.03 * (frontLump(F, y / hz) - 0.5), y0 = hz * 0.13, yb = frontBase(m), xa = X(y0) - W * (0.16 + 0.12 * Lm[1]);
    g.fillStyle = css(mixc(dark, pale, 0.4), 0.8 * k); g.beginPath(); g.moveTo(W, 0); g.lineTo(xa, 0); g.quadraticCurveTo(xa + W * 0.02, hz * 0.05, xa + W * 0.07, hz * 0.06); g.lineTo(X(y0), y0 + hz * 0.04); g.lineTo(W, y0); g.closePath(); g.fill(); // l'enclume
    const sh = g.createLinearGradient(0, yb, 0, hz); sh.addColorStop(0, css(dark, 0.62 * k)); sh.addColorStop(1, css(mixc(dark, hzc, 0.35), 0.5 * k)); g.fillStyle = sh; g.fillRect(X(yb) - W * 0.01, yb, W, hz - yb + 1); // sous la base : le rideau de pluie
    for (const c of F.curtains) curtain(lerp(X(yb), W, 0.06 + 0.9 * c.u), yb, W * c.w, -Math.abs(c.lean), c.a);
    g.beginPath(); g.moveTo(W, y0); for (let i = 0; i <= 30; i++) { const y = lerp(y0, yb, i / 30); g.lineTo(X(y), y); } g.lineTo(W, yb); g.closePath();
    const gr = g.createLinearGradient(X(yb), 0, W, 0); gr.addColorStop(0, css(mixc(dark, pale, 0.25), 0.92 * k)); gr.addColorStop(0.4, css(dark, 0.95 * k)); gr.addColorStop(1, css(mixc(dark, [0, 0, 0], 0.3), 0.97 * k)); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 10; i++) { const l = Lm[(i * 5 + 3) % Lm.length], l2 = Lm[(i * 7 + 2) % Lm.length], y = lerp(y0 + hz * 0.03, yb - hz * 0.05, (i + 0.5 * l2) / 9.5), r = H * (0.035 + 0.06 * l * l); cap(X(y) - r * (0.05 + 0.6 * l2) + W * 0.02, y, r, l, -0.7, -0.8); } lobesOut();
    g.fillStyle = css(mixc(dark, pale, 0.3), 0.7 * k); g.fillRect(X(yb) - W * 0.015, yb - 1.5, W, 3); // la base, nette
  } else if (F.mode === "ahead") { // de face : la muraille sur l'horizon, ses tours, l'enclume de la plus haute
    g.beginPath(); g.moveTo(0, hz + 1); for (let i = 0; i <= 64; i++) g.lineTo((i / 64) * W, towerTop(m, (i / 64) * W)); g.lineTo(W, hz + 1); g.closePath();
    const top = Math.min(...Array.from({ length: 33 }, (_, i) => towerTop(m, (i / 32) * W))), gr = g.createLinearGradient(0, top, 0, hz); gr.addColorStop(0, css(mixc(dark, pale, 0.3), 0.92 * k)); gr.addColorStop(0.6, css(dark, 0.95 * k)); gr.addColorStop(1, css(mixc(dark, hzc, 0.25), 0.9 * k)); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); for (const c of F.curtains) { const x = W * (0.05 + 0.9 * c.u); curtain(x, lerp(towerTop(m, x), hz, 0.5), W * c.w, c.lean, c.a); } g.restore();
    let best = null;
    for (let i = 0; i < 3; i++) { const c = W * (0.12 + 0.76 * Lm[i + 1]), w = W * (0.07 + 0.08 * Lm[i + 4]), A = 0.45 + 0.55 * Lm[i + 7]; if (!best || A > best.A) best = { c, w, A };
      for (let j = 0; j < 5; j++) { const x = c + w * (-0.9 + 0.45 * j), l = Lm[(i * 5 + j) % Lm.length], r = H * (0.028 + 0.03 * A + 0.015 * l); cap(x, towerTop(m, x) + r * 0.55, r, l, -0.4, -1); } } lobesOut();
    if (best && best.A > 0.7) { const y = towerTop(m, best.c) - H * 0.01, x0 = best.c - best.w * 1.4, x1 = best.c + best.w * 2.4; g.fillStyle = css(mixc(pale, hzc, 0.3), 0.75 * k); g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(best.c, y - H * 0.035, x1, y - H * 0.02); g.lineTo(x1 - best.w * 0.3, y + H * 0.008); g.quadraticCurveTo(best.c, y - H * 0.005, x0 + best.w * 0.5, y + H * 0.03); g.closePath(); g.fill(); } // l'enclume
  } else { // au-dessus de la tête : le plafond de l'orage, son bord, la lumière dessous
    g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= 40; i++) g.lineTo((i / 40) * W, frontEdge(m, i / 40)); g.lineTo(W, 0); g.closePath();
    const e0 = frontEdge(m, 0.5), gr = g.createLinearGradient(0, e0, 0, 0); gr.addColorStop(0, css(mixc(dark, pale, 0.3), 0.88 * k)); gr.addColorStop(0.35, css(dark, 0.94 * k)); gr.addColorStop(1, css(mixc(dark, [0, 0, 0], 0.3), 0.96 * k)); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 13; i++) { const l = Lm[(i * 7) % Lm.length], u = (i + 0.6 * Lm[(i * 3 + 1) % Lm.length]) / 12.6, r = H * (0.022 + 0.05 * l * l); cap(u * W, frontEdge(m, u) - r * 0.25, r, l, 0, 1); } lobesOut();
    if (day > 0.05) { const yb = frontEdge(m, 0.5), lg = g.createLinearGradient(0, yb, 0, hz); lg.addColorStop(0, css([255, 214, 160], 0)); lg.addColorStop(1, css([255, 214, 160], 0.22 * k * day)); g.fillStyle = lg; g.fillRect(0, yb, W, hz - yb); } // sous le bord, la lumière d'avant l'orage
  }
  g.restore();
  /* ESSAI (Coriolis) : sur un monde qui tourne vite, l'orage s'enroule : des bandes en spirale dans sa masse, qui tournent dans le sens de l'hémisphère */
  const cor = S.phys && !S.phys.locked ? S.phys.coriolis : 0, sw = clamp((cor - 1.3) / 1.7);
  if (sw > 0.02) {
    const hemi = (S.seed >>> 3) & 1 ? -1 : 1, cx = F.mode === "right" ? W * 0.95 : F.mode === "left" ? W * 0.05 : W * (0.5 + 0.15 * hemi), cy = F.mode === "ahead" ? hz - hz * 0.95 * (m.frontF || 0.5) * 0.6 : F.mode === "over" ? -H * 0.15 : hz * 0.25;
    g.lineWidth = H * 0.016; g.lineCap = "round";
    g.strokeStyle = css(mixc(pale, [255, 248, 236], 0.2 * day), 0.16 * sw * k);
    for (let arm = 0; arm < 3; arm++) { let open = false; g.beginPath(); /* un trait continu par bras, tant qu'il reste dans la masse de l'orage */
      for (let s2 = 0; s2 <= 60; s2++) { const u = s2 / 60, a = hemi * (u * 4.2 + arm * 2.09 + t * 0.6), rr = H * (0.06 + 0.55 * u) * (F.mode === "ahead" ? 0.5 : 1), x = cx + Math.cos(a) * rr * 1.4, y = cy + Math.sin(a) * rr * (F.mode === "over" ? 0.5 : 0.8);
        const inside = stormCov(m, x, y) > 0.6 && (F.mode !== "ahead" || y < hz) && u < 0.85;
        if (inside) { if (open) g.lineTo(x, y); else { g.moveTo(x, y); open = true; } } else open = false; }
      g.stroke(); }
  }
}
/** ESSAI : l'ombre de l'orage sur le sol, du côté d'où il vient ; le reste du paysage garde son soleil. */
function stormShade(g, m, L) {
  const { W, H, hz, front: F } = m; if (!F || F.mode === "shower" || L.storm < 0.005) return; const k = L.storm, c = [10, 12, 20];
  let gr;
  if (F.mode === "right" || F.mode === "left") { const e = frontEdge(m, 1); gr = g.createLinearGradient(e - (F.mode === "right" ? W * 0.08 : -W * 0.08), 0, F.mode === "right" ? W : 0, 0); }
  else if (F.mode === "over") gr = g.createLinearGradient(0, hz + (H - hz) * 0.3, 0, H);
  else gr = g.createLinearGradient(0, hz + (H - hz) * 0.4, 0, hz);
  gr.addColorStop(0, css(c, 0)); gr.addColorStop(1, css(c, 0.42 * k)); g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
}

// ---- météo vivante : les nouveaux temps -------------------------------------------------------------------------
/** Bruine : des fils très fins et serrés, presque droits, et une brume d'eau qui voile le lointain. Teintée par l'acide, irisée par le cristal. */
function drizzle(g, m, t, L) {
  const { W, H, hz, wx } = m; if (!wx.mist) return;
  const a = Math.max(L.drizzle, L.acidRain, L.crystalRain), acid = L.acidRain, cr = L.crystalRain, wet = mixc([200, 208, 216], [196, 206, 120], acid);
  const hg = g.createLinearGradient(0, hz - H * 0.22, 0, hz + H * 0.08); hg.addColorStop(0, css(wet, 0)); hg.addColorStop(0.7, css(wet, 0.18 * a)); hg.addColorStop(1, css(wet, 0)); g.fillStyle = hg; g.fillRect(0, hz - H * 0.22, W, H * 0.3);
  g.lineWidth = 0.7; g.strokeStyle = css(mixc([218, 226, 236], [205, 218, 110], acid), 0.36 * a); g.beginPath();
  for (const d of wx.mist) { const y = frac(d.y + t * d.v) * H, x = d.x + y * 0.04; g.moveTo(x, y); g.lineTo(x - 0.5, y - H * d.l); }
  g.stroke();
  if (cr > 0.005) for (const [i, d] of wx.mist.entries()) { // pluie de cristal : une goutte sur trois accroche la lumière
    if (i % 3) continue; const y = frac(d.y + t * d.v) * H, x = d.x + y * 0.04, tw = Math.pow(Math.max(0, Math.sin(TAU * (t * 3 + d.a * 7))), 4);
    g.fillStyle = css(hsl(180 + 180 * frac(d.a * 3 + t), 0.7, 0.85), (0.35 + 0.6 * tw) * cr); g.fillRect(x - 0.6, y - 0.6, 1.4, 1.4);
    if (tw > 0.6) { g.strokeStyle = css([255, 255, 255], 0.5 * tw * cr); g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + 2.5, y); g.moveTo(x, y - 2.5); g.lineTo(x, y + 2.5); g.stroke(); }
  }
  if (acid > 0.005) { g.fillStyle = css([170, 190, 70], 0.06 * acid); g.fillRect(0, 0, W, H); }
}
/** Neige (flocons blancs et doux qui oscillent) ou pluie de cendre (gris, plus lourde). */
function flakes(g, m, t, L) {
  const { H, wx } = m; if (!wx.flakes) return;
  for (const [i, f] of wx.flakes.entries()) {
    const ash = L.ashRain > 0.005 && (i % 2 === 1 || L.snow <= 0.005), lv = ash ? L.ashRain : L.snow; if (lv <= 0.005) continue;
    const y = frac(f.y + t * f.k) * (H + 6) - 3, x = f.x + 6 * Math.sin(TAU * (t * 2 + f.p)) + y * 0.05;
    g.fillStyle = ash ? css(f.p < 0.3 ? [150, 144, 136] : [70, 66, 62], 0.75 * lv) : css([246, 248, 252], (0.55 + 0.4 * f.p) * lv); // la cendre : grise, parfois plus pâle
    g.beginPath(); if (ash) g.ellipse(x, y, f.s * 1.2, f.s * 0.7, f.p * 3, 0, TAU); else g.arc(x, y, f.s, 0, TAU); g.fill();
  }
}
/** Pluie de pétales : des pétales qui tournoient en descendant de biais, de la couleur des fleurs. */
function petals(g, m, t, lv, leaf) {
  const { W, H, wx } = m; if (!wx.petals) return;
  for (const p of wx.petals) {
    const x = frac(p.x + t * p.k) * (W + 20) - 10, y = frac(p.y + t * p.r) * (H + 10) - 5 + 6 * Math.sin(TAU * (t * 2 + p.p)), spin = TAU * (t * 2 * p.k + p.p);
    g.fillStyle = leaf ? css(hsl(22 + p.h * 0.6, 0.65, 0.42), 0.85 * lv) : css(hsl((wx.hue != null ? wx.hue : 340) + p.h, 0.55, 0.8), 0.85 * lv); g.beginPath(); g.ellipse(x, y, p.s, p.s * (0.25 + 0.35 * Math.abs(Math.sin(spin))), spin, 0, TAU); g.fill();
  }
}
/** Brume parfumée : un voile rose et doré au ras du sol, et du pollen qui monte en luisant. */
function scentedMist(g, m, t, lv) {
  const { W, H, hz, wx } = m, tint = hsl(wx.hue != null ? wx.hue + 10 : 350, 0.45, 0.82);
  for (let i = 0; i < 3; i++) { const y = hz + H * (0.02 + 0.06 * i), x = frac(t + i * 0.37) * W, gr = g.createLinearGradient(0, y - H * 0.09, 0, y + H * 0.07); gr.addColorStop(0, css(tint, 0)); gr.addColorStop(0.5, css(tint, (0.2 - 0.03 * i) * lv)); gr.addColorStop(1, css(tint, 0)); g.fillStyle = gr; g.fillRect(-x * 0.1, y - H * 0.09, W + 20, H * 0.16); }
  for (const p of wx.motes || []) { const q = frac(p.y + t), x = p.x * W + 4 * Math.sin(TAU * (t + p.p)), y = H - q * (H - hz * 0.8); g.fillStyle = css([255, 236, 190], 0.5 * Math.sin(Math.PI * q) * lv); g.beginPath(); g.arc(x, y, p.s, 0, TAU); g.fill(); }
}
/** Tornade : un entonnoir de vent, au loin, qui ondule entre la base des nuages et le sol, et ce qu'il soulève. */
function tornado(g, m, t, lv) {
  const { H, hz, wx, pal } = m, tw = wx.twister; if (!tw) return;
  const top = H * 0.1, n = 26, col = mixc(pal.rock, [120, 118, 112], 0.55);
  const at = (u) => tw.x + Math.sin(TAU * t + tw.p + u * 3) * H * 0.03 * (1 - u) + tw.lean * H * (1 - u);
  const cg = g.createLinearGradient(0, 0, 0, top * 2.2); cg.addColorStop(0, css([40, 42, 48], 0.5 * lv)); cg.addColorStop(1, css([40, 42, 48], 0)); g.fillStyle = cg; g.beginPath(); g.ellipse(tw.x, top, H * 0.4, top * 1.2, 0, 0, TAU); g.fill(); // la base des nuages qui l'enfante
  for (let i = 0; i <= n; i++) { const u = i / n, y = lerp(top, hz, u), w = H * (0.012 + 0.11 * Math.pow(1 - u, 1.8)) * tw.w; g.fillStyle = css(mixc(col, [30, 30, 34], 0.35 * u), (0.22 + 0.25 * u) * lv); g.beginPath(); g.ellipse(at(u) + Math.sin(TAU * t * 3 + i) * w * 0.15, y, w, w * 0.3, 0, 0, TAU); g.fill(); }
  g.strokeStyle = css([210, 205, 195], 0.18 * lv); g.lineWidth = 0.8; // les filets de vent qui tournent autour de l'entonnoir
  for (let j = 0; j < 4; j++) { g.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n, y = lerp(top, hz, u), w = H * (0.012 + 0.11 * Math.pow(1 - u, 1.8)) * tw.w, x = at(u) + Math.sin(TAU * (t * 2 + j / 4) + u * 9) * w * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (const d of tw.debris) { const a = TAU * (t * d.k * 2 + d.p), r = H * 0.035 * d.r, x = at(1) + Math.cos(a) * r, y = hz - H * 0.015 - Math.abs(Math.sin(a)) * r * 0.6 - d.p * H * 0.05; g.fillStyle = css([60, 56, 50], 0.6 * lv); g.fillRect(x, y, 1.4, 1.4); }
  const dg = g.createRadialGradient(at(1), hz, 0, at(1), hz, H * 0.08); dg.addColorStop(0, css(col, 0.35 * lv)); dg.addColorStop(1, css(col, 0)); g.fillStyle = dg; g.fillRect(at(1) - H * 0.08, hz - H * 0.08, H * 0.16, H * 0.1); // la poussière à ses pieds
}
/** Arc-en-ciel : sept bandes très douces, à l'opposé du soleil, qui s'effacent vers le sol. Seulement quand il fait jour. */
function rainbow(g, m, t, sn, day, lv) {
  const { W, H, hz, wx } = m, b = wx.bow; if (!b || day < 0.05) return;
  const s0 = sn.find((s) => s.e > 0.05), cx = s0 ? clamp(W - s0.x, W * 0.15, W * 0.85) : b.x, cy = hz + b.drop, a = lv * day * (0.85 + 0.15 * Math.sin(TAU * t));
  const BANDS = [[200, 70, 70], [215, 140, 70], [220, 205, 110], [110, 175, 110], [90, 140, 200], [100, 90, 175], [140, 95, 170]];
  g.save(); g.beginPath(); g.rect(0, 0, W, hz); g.clip();
  BANDS.forEach((c, i) => { const R = b.R - i * H * 0.012, gr = g.createLinearGradient(0, cy - R, 0, hz); gr.addColorStop(0, css(c, 0.28 * a)); gr.addColorStop(0.7, css(c, 0.16 * a)); gr.addColorStop(1, css(c, 0)); g.strokeStyle = gr; g.lineWidth = H * 0.013; g.beginPath(); g.arc(cx, cy, R, Math.PI, TAU); g.stroke(); });
  g.restore();
}
/** Le sol sous la neige, le verglas ou la cendre ; les fleurs. Sur la terre seulement (avec un rivage, pas sur l'eau). */
function groundWeather(g, m, t, night, L) {
  const { S, W, H, hz, wx, shore } = m, snow = Math.max(L.snow, S.season ? S.season.snow : 0), glaze = L.glaze, ash = L.ashRain;
  if (!(snow > 0.005 || glaze > 0.005 || ash > 0.005 || (S.flowers && wx.blooms))) return;
  if (S.water && !shore) return; // une mer : rien ne s'y pose
  g.save(); if (shore) { shorePath(g, shore.land); g.clip(); }
  const lit = 1 - 0.6 * night;
  const fv = S.season ? Math.max(clamp((S.season.vig - 0.35) / 0.4), S.season.bloom) : 1; /* la saison : les fleurs dorment l'hiver, reviennent au printemps */
  const mfl = S.wonderMetal && metalFilter(S); if (mfl) { g.save(); g.filter = mfl; } /* ESSAI : les fleurs de la merveille, faites du métal bu */
  if (S.flowers && wx.blooms && fv > 0.01) for (const b of wx.blooms) { // fleurs : des touches de couleur, serrées au loin, plus grandes devant ; la neige les éteint
    const y = hz + (H - hz) * b.u * b.u + 1, k = 0.35 + 1.1 * b.u, x = b.x + Math.sin(TAU * t + b.p) * k * 0.8;
    g.strokeStyle = css(mixc([70, 100, 60], [8, 10, 12], 0.3 + 0.5 * night), 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(b.x, y); g.lineTo(x, y - 3 * k); g.stroke();
    g.fillStyle = css(mixc(hsl(b.h, 0.55 + 0.2 * b.s, 0.66), [10, 12, 20], clamp(0.15 + 0.6 * night + 0.5 * snow)), (0.9 * lit + 0.1) * fv); bloom(g, x, y - 3 * k, 0.9 + 1.5 * k * (0.6 + 0.4 * b.s), mixc(hsl(b.h, 0.55 + 0.2 * b.s, 0.66), [10, 12, 20], clamp(0.15 + 0.6 * night + 0.5 * snow)), (0.9 * lit + 0.1) * fv, b.p);
  }
  if (mfl) g.restore();
  if (snow > 0.005) { const sg = g.createLinearGradient(0, hz, 0, H); sg.addColorStop(0, css([232, 238, 246], 0.55 * snow * lit)); sg.addColorStop(1, css([214, 224, 238], 0.35 * snow * lit)); g.fillStyle = sg; g.fillRect(0, hz, W, H - hz); }
  if (ash > 0.005) { g.fillStyle = css([60, 58, 56], 0.3 * ash); g.fillRect(0, hz, W, H - hz); }
  if (glaze > 0.005) { // verglas : le sol devient un miroir terne, des reflets glissent
    g.fillStyle = css([200, 220, 240], 0.12 * glaze * lit); g.fillRect(0, hz, W, H - hz);
    for (const p of wx.motes || []) { const u = p.y, y = hz + (H - hz) * u * u, x = frac(p.x + t * 0.25) * W, a = Math.pow(Math.max(0, Math.sin(TAU * (t + p.p))), 3); g.fillStyle = css([245, 252, 255], (0.15 + 0.6 * a) * glaze * lit); g.fillRect(x, y, 6 + 18 * u, 0.9); }
  }
  g.restore();
}

// ---- corps célestes : ceinture, champ d'astéroïdes, planète à anneaux, comète (mouvements lents, horloge continue en secondes) ----
function arcY(m, u, lift) { return m.hz * 0.92 - Math.sin(Math.PI * u) * m.H * (0.2 + lift); }
function skyBodies(g, m, cs, day, hzc, sn) {
  const { S, W, H, hz } = m, lum = 0.55 + 0.45 * (1 - day * 0.4);
  if (m.ringsP) { // planète à anneaux : moitié arrière de l'anneau, disque ombré, moitié avant
    const p = m.ringsP, col = hsl(p.hue, p.sat, 0.62), ring = (a0, a1, w, al) => { g.strokeStyle = css(mixc(col, [255, 255, 255], 0.25), al); g.lineWidth = w; g.beginPath(); g.ellipse(p.x, p.y, p.R * 2.1, p.R * 0.5, p.tilt, a0, a1); g.stroke(); };
    ring(Math.PI, TAU, p.R * 0.22, 0.5); ring(Math.PI, TAU, p.R * 0.06, 0.7);
    const sh = g.createRadialGradient(p.x - p.R * 0.4, p.y - p.R * 0.4, p.R * 0.1, p.x, p.y, p.R * 1.1); sh.addColorStop(0, css(mixc(col, [255, 255, 255], 0.3))); sh.addColorStop(1, css(mixc(col, [10, 8, 20], 0.7))); g.fillStyle = sh; g.beginPath(); g.arc(p.x, p.y, p.R, 0, TAU); g.fill();
    ring(0, Math.PI, p.R * 0.22, 0.55); ring(0, Math.PI, p.R * 0.06, 0.75);
  }
  if (m.belt) { // ceinture : un arc de petits rocs qui dérive, quelques éclats
    const b = m.belt, cr = Math.cos(b.tilt), sr = Math.sin(b.tilt);
    g.strokeStyle = css(mixc(hzc, [200, 185, 160], 0.4), 0.1); g.lineWidth = H * 0.09; g.lineCap = "round"; g.beginPath(); for (let k = 0; k <= 24; k++) { const u = k / 24; k ? g.lineTo(W * u, arcY(m, u, b.lift)) : g.moveTo(0, arcY(m, 0, b.lift)); } g.stroke(); // voile de poussière sous les rocs
    for (const r of b.rocks) {
      const u = frac(r.u + cs / (200 * r.k)), x0 = W * (u * 1.1 - 0.05), y0 = arcY(m, clamp(u * 1.1 - 0.05), b.lift) + r.off * H * 0.07, x = x0 * cr - (y0 - hz * 0.5) * sr, y = y0 * cr + x0 * sr * 0.1;
      const fl = Math.sin(cs * 1.7 + r.ph) > 0.985 ? 1 : 0; g.fillStyle = css(mixc([135, 120, 104], hzc, 0.2), (0.75 + 0.25 * fl) * lum); g.fillRect(x, y, r.r * (r.off > 0 ? 1.3 : 1), r.r * 0.9);
      if (fl) { g.fillStyle = "rgba(255,245,220,0.9)"; g.fillRect(x - 0.5, y - 0.5, 2.2, 2.2); }
    }
  }
  if (m.field) { // champ : quelques gros blocs irréguliers qui tournent lentement, et parfois une chute
    for (const r of m.field.rocks) {
      const u = frac(r.u + cs / 260), x = W * (u * 1.2 - 0.1), y = H * (0.1 + 0.34 * r.y), R = H * r.r, a = cs * r.rot + r.ph;
      g.beginPath(); r.pts.forEach((k, i) => { const th = a + i / r.pts.length * TAU, px = x + Math.cos(th) * R * k * 1.15, py = y + Math.sin(th) * R * k; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
      g.fillStyle = css(mixc([48, 42, 40], hzc, 0.12)); g.fill(); g.strokeStyle = css(mixc([200, 180, 150], hzc, 0.3), 0.55 * lum); g.lineWidth = 1; g.stroke();
    }
    const k = Math.floor(cs / 40), ph = (cs / 40 - k) / 0.1; // une chute toutes les 40 s, qui dure 4 s
    if (ph >= 0 && ph < 1) {
      const g2 = rng(S.seed + k * 977), x1 = W * (0.2 + 0.7 * g2()), x0 = x1 - W * 0.25, y1 = hz + H * 0.02, y0 = -H * 0.05, e = ph * ph, x = lerp(x0, x1, e), y = lerp(y0, y1, e);
      const tl = g.createLinearGradient(x, y, lerp(x0, x, 0.6), lerp(y0, y, 0.6)); tl.addColorStop(0, "rgba(255,230,180,0.95)"); tl.addColorStop(1, "rgba(255,150,60,0)"); g.strokeStyle = tl; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(lerp(x0, x, 0.6), lerp(y0, y, 0.6)); g.stroke();
      if (ph > 0.9) { const f = (ph - 0.9) * 10, fg = g.createRadialGradient(x1, hz, 0, x1, hz, H * 0.3 * f); fg.addColorStop(0, css([255, 230, 190], 0.8 * (1 - f))); fg.addColorStop(1, css([255, 150, 60], 0)); g.fillStyle = fg; g.fillRect(0, 0, W, H); }
    }
  }
  for (const p of m.remn || []) remnant(g, p, cs, lum, hzc);
  if (m.cometP) { // comète : passe en ~45 s toutes les 90 s ; la queue s'éloigne de sa direction
    const c = m.cometP, p = frac(cs / 90 + c.ph) / 0.5; if (p < 1) {
      const x = c.dir > 0 ? lerp(-W * 0.1, W * 1.1, p) : lerp(W * 1.1, -W * 0.1, p), y = H * lerp(c.y0, c.y1, p), tx = x - c.dir * W * 0.38, ty = y - H * (c.y1 - c.y0) * 0.38;
      const tl = g.createLinearGradient(x, y, tx, ty); tl.addColorStop(0, "rgba(200,225,255,0.7)"); tl.addColorStop(1, "rgba(200,225,255,0)"); g.strokeStyle = tl; g.lineWidth = H * 0.03; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke();
      g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(tx, ty + H * 0.05); g.stroke();
      const hg = g.createRadialGradient(x, y, 0, x, y, H * 0.06); hg.addColorStop(0, "rgba(255,255,255,0.95)"); hg.addColorStop(1, "rgba(180,215,255,0)"); g.fillStyle = hg; g.fillRect(x - H * 0.06, y - H * 0.06, H * 0.12, H * 0.12);
    }
  }
}

/**
 * Un perturbateur écrit (télescope, étape 3), dans le ciel de la fenêtre : le pulsar, un point dont le faisceau balaie le ciel
 * et éclate quand il passe vers nous ; l'étoile à neutrons, une étincelle bleu-blanc dans un halo serré ; le trou noir, un
 * disque vide dans un anneau de lumière courbée, les étoiles voisines étirées en arcs. Plus visibles la nuit (`lum`).
 */
function remnant(g, p, cs, lum, hzc) {
  const { x, y, R } = p, k = clamp(lum);
  if (p.kind === "pulsar") {
    const a = p.tilt + cs * p.spin * TAU * 0.6, flash = Math.pow(Math.max(0, Math.cos(cs * p.spin * TAU * 0.6 + p.ph * TAU)), 24);
    for (const sgn of [1, -1]) { const tx = x + sgn * Math.cos(a) * R * 9, ty = y + sgn * Math.sin(a) * R * 4, gr = g.createLinearGradient(x, y, tx, ty); gr.addColorStop(0, css([210, 230, 255], 0.35 * k)); gr.addColorStop(1, css([210, 230, 255], 0)); g.strokeStyle = gr; g.lineWidth = R * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke(); }
    const hg = g.createRadialGradient(x, y, 0, x, y, R * (1.2 + 3 * flash)); hg.addColorStop(0, css([240, 248, 255], (0.6 + 0.4 * flash) * k)); hg.addColorStop(1, css([180, 210, 255], 0)); g.fillStyle = hg; g.fillRect(x - R * 4.5, y - R * 4.5, R * 9, R * 9);
  } else if (p.kind === "neutron_star") {
    const tw = 0.85 + 0.15 * Math.sin(cs * 0.9 + p.ph * TAU), hg = g.createRadialGradient(x, y, 0, x, y, R * 2.2);
    hg.addColorStop(0, css([235, 245, 255], 0.95 * k * tw)); hg.addColorStop(0.25, css([170, 205, 255], 0.5 * k)); hg.addColorStop(1, css([120, 160, 255], 0)); g.fillStyle = hg; g.fillRect(x - R * 2.2, y - R * 2.2, R * 4.4, R * 4.4);
    g.strokeStyle = css([190, 215, 255], 0.35 * k); g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, R * 1.3, 0, TAU); g.stroke();
  } else {
    const rr = R * 1.6, ring = g.createRadialGradient(x, y, rr * 0.9, x, y, rr * 1.9); ring.addColorStop(0, css([255, 214, 160], 0.75 * k)); ring.addColorStop(0.4, css([255, 170, 110], 0.3 * k)); ring.addColorStop(1, css([255, 150, 90], 0));
    g.fillStyle = ring; g.beginPath(); g.arc(x, y, rr * 1.9, 0, TAU); g.fill();
    g.strokeStyle = css(mixc([200, 210, 240], hzc, 0.2), 0.5 * k); g.lineWidth = 1; for (let i = 0; i < 4; i++) { const a0 = p.tilt + i * 1.7 + cs * 0.02; g.beginPath(); g.arc(x, y, rr * (2.3 + i * 0.5), a0, a0 + 0.5 + 0.2 * i); g.stroke(); } // les étoiles derrière, étirées en arcs
    g.fillStyle = "#030205"; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
}

// ---- reflets : la partie haute de l'image, retournée, ondulée et fondue dans l'eau --------------------------
function reflect(g, m, t, a) {
  const cv = g.canvas, { W, H, hz } = m; if (!cv || typeof cv.width !== "number") return;
  const rows = Math.floor(H - hz);
  for (let i = 0; i < rows; i++) {
    const sy = hz - 1 - i * 1.15; if (sy < 0) break;
    g.globalAlpha = a * (1 - i / rows) * (0.8 + 0.2 * Math.sin(TAU * (t * 3 + i * 0.2)));
    g.drawImage(cv, 0, Math.floor(sy), W, 1, Math.sin(TAU * (t * 2 + i * 0.09)) * (0.6 + i * 0.05), hz + i, W, 1);
  }
  g.globalAlpha = 1;
}

// ---- détail habité : une structure sans usage évident -------------------------------------------------
function detail(g, m, t, night) {
  if (!m.det) return; // les autres directions du périscope n'en ont pas : il est unique
  const { W, H, hz, det: d, pal } = m, x = d.x, s = d.s, st0 = stoneOf(m), dark = css(mixc(st0.lit, [0, 0, 0], 0.3)), rim = css(st0.top, 0.7); /* ESSAI (28 oct. soir) : l'étrangeté est de pierre, comme les ruines, plus un noir de silhouette */
  const blink = night * (0.35 + 0.65 * Math.max(0, Math.sin(TAU * (t * 2) + d.p))), glow = css(hsl(d.hue, 0.8, 0.6), 1);
  g.fillStyle = dark; g.strokeStyle = rim; g.lineWidth = 1;
  if (d.kind === "pylon") {
    const h = H * 0.3 * s, w = H * 0.014;
    g.beginPath(); g.moveTo(x - w * 2, hz + 3); g.lineTo(x - w * 0.6, hz - h); g.lineTo(x + w * 0.6, hz - h); g.lineTo(x + w * 2, hz + 3); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x, hz - h * 0.62, w * 5, w * 1.8, 0, 0, TAU); g.stroke();
    const lg = g.createRadialGradient(x, hz - h, 0, x, hz - h, H * 0.07); lg.addColorStop(0, css(hsl(d.hue, 0.8, 0.6), 0.9 * blink)); lg.addColorStop(1, css(hsl(d.hue, 0.8, 0.6), 0)); g.fillStyle = lg; g.fillRect(x - H * 0.07, hz - h - H * 0.07, H * 0.14, H * 0.14);
    g.fillStyle = glow; g.globalAlpha = 0.3 + 0.7 * blink; g.fillRect(x - 1, hz - h - 1, 2, 2); g.globalAlpha = 1;
  } else if (d.kind === "ring") { // anneau dressé, à demi enfoui (la partie sous l'horizon est coupée) ; brisé, penché ou couché
    const vr = rng((m.S.seed ^ 0x61a9) >>> 0), form = vr(), R = H * (0.1 + 0.08 * vr()) * s;
    if (form < 0.3) { g.lineWidth = Math.max(3, H * 0.02); g.strokeStyle = dark; g.beginPath(); g.ellipse(x, hz - 1, R, R * 0.22, 0, 0, TAU); g.stroke(); g.lineWidth = 1; g.strokeStyle = rim; g.beginPath(); g.ellipse(x, hz - 2.5, R * 1.02, R * 0.22, 0, Math.PI, TAU); g.stroke(); return; } /* couché dans l'herbe */
    g.save(); g.beginPath(); g.rect(0, 0, W, hz + 2); g.clip(); g.translate(x, hz - R * 0.45); g.rotate(form < 0.6 ? (vr() - 0.5) * 0.6 : 0); g.translate(-x, -(hz - R * 0.45));
    const a0 = form < 0.85 ? (vr() * TAU) : 0, a1 = form < 0.85 ? a0 + TAU * (0.55 + 0.25 * vr()) : TAU; /* brisé : un arc manque (l'anneau entier devient rare) */
    g.lineWidth = Math.max(3, H * 0.022); g.strokeStyle = dark; g.beginPath(); g.arc(x, hz - R * 0.45, R, a0, a1); g.stroke();
    g.lineWidth = 1; g.strokeStyle = rim; g.beginPath(); g.arc(x, hz - R * 0.45, R * 1.04, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    if (blink > 0.05) { g.strokeStyle = css(hsl(d.hue, 0.8, 0.6), 0.5 * blink); g.lineWidth = 1.4; g.beginPath(); g.arc(x, hz - R * 0.45, R * 0.84, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
  } else if (d.kind === "stair") { // escalier qui monte vers rien ; chaque escalier a sa forme (tirage à part)
    const v = rng((m.S.seed ^ 0x57a1) >>> 0), form = v(), dir = v() < 0.5 ? 1 : -1, n = d.n + 2 + Math.floor(v() * 3), w = H * (0.03 + 0.025 * v()) * s, st = H * (0.022 + 0.018 * v()) * s, broken = v() < 0.45 ? 1 + Math.floor(v() * (n - 2)) : -1;
    const hs = []; let acc = 0; for (let i = 0; i < n; i++) { acc += st * (0.75 + 0.5 * v()); hs.push(acc); }
    const zig = form < 0.25, arches = !zig && form > 0.82, top = hs[n - 1] + H * 0.012, cols = zig ? n * 2 - 1 : n, fit = Math.min(1, (W * 0.22) / (cols * w), (H * 0.2) / hs[n - 1]); if (fit < 1) { g.save(); g.translate(x, hz); g.scale(fit, fit); g.translate(-x, -hz); }
    for (let i = 0; i < cols; i++) {
      const k = zig && i >= n ? cols - 1 - i : i, X = dir > 0 ? x + i * w : x - (i + 1) * w; let h = hs[k] + H * 0.012;
      if (i === broken) h *= 0.35 + 0.25 * v(); /* une marche tombée */
      const chip = v() < 0.3 ? 1 + v() * 2.5 : 0;
      g.fillStyle = dark;
      if (arches) { const slab = st * 1.1; g.fillRect(X, hz - h, w + 0.5, slab); if (i % 3 === 0 || i === cols - 1) g.fillRect(X + w * 0.3, hz - h + slab, w * 0.4, h - slab + 2); } /* volée sur des piles : le jour passe dessous */
      else { g.beginPath(); g.moveTo(X, hz + 2); g.lineTo(X, hz - h + (dir > 0 ? 0 : chip)); g.lineTo(X + w + 0.5, hz - h + (dir > 0 ? chip : 0)); g.lineTo(X + w + 0.5, hz + 2); g.closePath(); g.fill(); }
      g.fillStyle = rim; g.fillRect(X, hz - h, w + 0.5, 1);
    }
    if (broken >= 0 || form > 0.6) for (let k = 0; k < 3 + Math.floor(v() * 4); k++) { const bw = 1.5 + v() * 3.5, bx = dir > 0 ? x - v() * w * 2.5 : x + v() * w * 2.5; g.fillStyle = dark; g.fillRect(bx, hz - bw + 2, bw * 1.3, bw); } /* des blocs au pied */
    void top; if (fit < 1) g.restore();
  } else if (d.kind === "cairn") { // un cairn, des pierres posées l'une sur l'autre
    const v = rng((m.S.seed ^ 0xca17) >>> 0), n = 4 + Math.floor(v() * 4); let y = hz + 2, w = H * 0.05 * s;
    for (let i = 0; i < n; i++) { const h = w * (0.45 + 0.2 * v()), off = (v() - 0.5) * w * 0.25; g.fillStyle = dark; g.beginPath(); g.ellipse(x + off, y - h / 2, w / 2, h / 2, (v() - 0.5) * 0.3, 0, TAU); g.fill(); g.fillStyle = rim; g.fillRect(x + off - w * 0.25, y - h + 0.5, w * 0.5, 1); y -= h * 0.85; w *= 0.8 + 0.12 * v(); }
  } else if (d.kind === "dolmen") { // deux pierres debout et une table
    const v = rng((m.S.seed ^ 0xd01e) >>> 0), w = H * (0.16 + 0.06 * v()) * s, h = H * (0.08 + 0.04 * v()) * s, tilt = (v() - 0.5) * 0.12;
    g.fillStyle = dark; g.fillRect(x - w * 0.42, hz - h, w * 0.18, h + 2); g.fillRect(x + w * 0.24, hz - h * (0.9 + 0.1 * v()), w * 0.18, h + 2);
    g.save(); g.translate(x, hz - h); g.rotate(tilt); g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w * 0.45, -h * 0.35); g.lineTo(w * 0.5, -h * 0.3); g.lineTo(w / 2, 0); g.closePath(); g.fill(); g.fillStyle = rim; g.fillRect(-w * 0.45, -h * 0.35, w * 0.95, 1); g.restore();
  } else if (d.kind === "obelisk") { // une aiguille taillée, parfois penchée
    const v = rng((m.S.seed ^ 0x0be1) >>> 0), h = H * (0.22 + 0.12 * v()) * s, w = H * 0.022 * s, tilt = v() < 0.4 ? (v() - 0.5) * 0.4 : 0;
    g.save(); g.translate(x, hz + 2); g.rotate(tilt); g.fillStyle = dark; g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w * 0.7, -h); g.lineTo(0, -h - w * 1.4); g.lineTo(w * 0.7, -h); g.lineTo(w, 0); g.closePath(); g.fill(); g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); g.moveTo(-w * 0.7, -h); g.lineTo(0, -h - w * 1.4); g.stroke(); g.restore();
  } else if (d.kind === "cromlech") { // un cercle de pierres levées, vu de biais
    const v = rng((m.S.seed ^ 0xc801) >>> 0), n = 7 + Math.floor(v() * 5), R = W * (0.08 + 0.04 * v()) * s, ry = H * 0.025 * s, st = [];
    for (let i = 0; i < n; i++) { if (v() < 0.18) continue; const a = (i / n) * TAU, px = x + Math.cos(a) * R, py = hz + 2 + Math.sin(a) * ry, sc = 0.8 + 0.4 * (Math.sin(a) + 1) / 2; st.push({ px, py, h: H * (0.04 + 0.03 * v()) * s * sc, w: H * 0.016 * s * sc }); }
    st.sort((a, b) => a.py - b.py); for (const q of st) { g.fillStyle = dark; g.fillRect(q.px - q.w / 2, q.py - q.h, q.w, q.h); g.fillStyle = rim; g.fillRect(q.px - q.w / 2, q.py - q.h, q.w, 1); }
  } else if (d.kind === "tower") { // le moignon d'une tour ronde, une fenêtre, le haut écroulé
    const v = rng((m.S.seed ^ 0x70e2) >>> 0), w = H * (0.06 + 0.03 * v()) * s, h = H * (0.18 + 0.1 * v()) * s, cut = h * (0.15 + 0.2 * v());
    g.fillStyle = dark; g.beginPath(); g.moveTo(x - w, hz + 2); g.lineTo(x - w, hz - h); g.lineTo(x - w * 0.3, hz - h + cut * 0.4); g.lineTo(x + w * 0.2, hz - h + cut); g.lineTo(x + w, hz - h + cut * 0.6); g.lineTo(x + w, hz + 2); g.closePath(); g.fill();
    g.fillStyle = rim; g.fillRect(x - w, hz - h, w * 0.7, 1); g.fillStyle = css(mixc(pal.rock, [220, 200, 170], 0.25), 0.5 + 0.4 * night); g.fillRect(x - w * 0.15, hz - h * 0.55, w * 0.3, h * 0.12);
  } else if (d.kind === "dish") { // antenne parabolique qui tourne lentement
    const h = H * 0.16 * s, tilt = -0.9 + 0.35 * Math.sin(TAU * t + d.p);
    g.strokeStyle = dark; g.lineWidth = Math.max(2.5, H * 0.014); g.beginPath(); g.moveTo(x, hz + 2); g.lineTo(x, hz - h); g.stroke();
    g.save(); g.translate(x, hz - h); g.rotate(tilt); const r = H * 0.075 * s; g.fillStyle = dark; g.strokeStyle = rim; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, r, Math.PI * 0.08, Math.PI * 0.92); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = dark; g.lineWidth = Math.max(1.2, H * 0.008); g.beginPath(); g.moveTo(0, r * 0.1); g.lineTo(0, -r * 0.95); g.stroke();
    g.fillStyle = glow; g.globalAlpha = 0.25 + 0.75 * blink; g.fillRect(-1.2, -r * 0.95 - 1, 2.4, 2.4); g.globalAlpha = 1; g.restore();
  } else { // piliers sans pont, alignés vers l'horizon ; têtes brisées, parfois un linteau resté en place
    const v = rng((m.S.seed ^ 0x91e5) >>> 0), dir = v() < 0.5 ? 1 : -1, lint = v() < 0.4 ? Math.floor(v() * d.n) : -1, pos = [];
    for (let i = 0; i < d.n + 1; i++) { const k = 1 - i / (d.n + 2), w = H * 0.03 * s * k, h = H * (0.1 + 0.07 * ((i * 7 + 3) % 5) / 5) * s * k * (0.7 + 0.6 * v()), X = x - dir * i * W * 0.05 * s, br = v() < 0.4 ? w * (0.6 + v()) : 0;
      g.fillStyle = dark; g.beginPath(); g.moveTo(X, hz + 2); g.lineTo(X, hz - h); g.lineTo(X + w * 0.5, hz - h + br); g.lineTo(X + w, hz - h + br * 0.4); g.lineTo(X + w, hz + 2); g.closePath(); g.fill(); g.fillStyle = rim; g.fillRect(X, hz - h, w * 0.5, 1); pos.push({ X, w, h }); }
    if (lint >= 0 && pos[lint + 1]) { const a = pos[lint], b2 = pos[lint + 1], y = hz - Math.min(a.h, b2.h); g.fillStyle = dark; g.fillRect(Math.min(a.X, b2.X), y - 3, Math.abs(a.X - b2.X) + Math.max(a.w, b2.w), 3.5); g.fillStyle = rim; g.fillRect(Math.min(a.X, b2.X), y - 3, Math.abs(a.X - b2.X) + Math.max(a.w, b2.w), 1); }
  }
}

// ---- premier plan : un cadre sombre au bord de l'image ---------------------------------------------------------
/** ESSAI : le cadre du point de liaison : le bord de l'escarpement (high), une lisière ou une arche (cover), l'entrée d'une grotte (cave). */
/** ESSAI : la vallée vue d'en haut : des plans qui s'étagent jusqu'à l'horizon (plus clairs au loin), et ce que le sol y porte : bois, champs, éboulis, rides de sable, crevasses. */
/** ESSAI : sans soleil, ce qui éclaire le monde : la lueur de la nébuleuse ou de la bande d'étoiles sur le sol, la lave par en dessous, les lueurs du vivant, les cristaux. Chaque monde sombre a sa lumière. */
function darkLight(g, m, t, hzc) {
  const { W, H, hz, S, night: n } = m, D = H - hz, q = rng((S.seed ^ 0xda7c) >>> 0), ids = new Set((S.extras || []).map((e) => e.id));
  const neb = n.nebula ? hsl(n.nebula.hue, 0.55, 0.45) : n.band ? [150, 160, 200] : null;
  if (neb) { const sk = g.createLinearGradient(0, hz - H * 0.35, 0, hz); sk.addColorStop(0, css(neb, 0)); sk.addColorStop(1, css(neb, 0.3)); g.fillStyle = sk; g.fillRect(0, hz - H * 0.35, W, H * 0.35); const gg = g.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, css(neb, 0.4)); gg.addColorStop(1, css(neb, 0.08)); g.fillStyle = gg; g.fillRect(0, hz, W, D); } /* la lumière du ciel nocturne, posée sur le sol */
  if (S.lava) { const gg = g.createLinearGradient(0, H, 0, hz); gg.addColorStop(0, css([255, 80, 30], 0.28)); gg.addColorStop(1, css([255, 80, 30], 0)); g.fillStyle = gg; g.fillRect(0, hz - D * 0.3, W, D * 1.3); } /* la lave éclaire par en dessous */
  if (S.glow || ids.has("glow_algae") || ids.has("glowing_mushroom") || ids.has("glowvine") || ids.has("mushroom")) for (let k = 0; k < 18; k++) { const x = q() * W, y = hz + D * (0.1 + 0.85 * q()), r = (4 + q() * 10) * (0.4 + (y - hz) / D), col = [[90, 255, 200], [140, 200, 255], [200, 255, 120]][k % 3], a = 0.25 + 0.15 * Math.sin(TAU * t * 0.4 + k); const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.5); gr.addColorStop(0, css(col, a)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5); } /* les lueurs du vivant */
  if (ids.has("crystal") || ids.has("crystal_tree") || ids.has("crystal_flower")) { const ct = crystalToneOf(S); for (let k = 0; k < 10; k++) { const x = q() * W, y = hz + D * (0.05 + 0.8 * q()), h = (5 + q() * 12) * (0.4 + (y - hz) / D), col = hsl(ct.hue + ct.spread * q(), 0.7, 0.65); g.fillStyle = css(col, 0.8); g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.25, y); g.lineTo(x - h * 0.25, y); g.closePath(); g.fill(); const gr = g.createRadialGradient(x, y - h * 0.5, 0, x, y - h * 0.5, h * 2); gr.addColorStop(0, css(col, 0.3)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(x - h * 2, y - h * 2.5, h * 4, h * 4); } } /* des cristaux qui luisent */
  g.strokeStyle = css(mixc(neb || [150, 160, 200], [255, 255, 255], 0.3), 0.25); g.lineWidth = 1; for (const rg of m.ridges.slice(-1)) { const nn = rg.xs.length - 1; g.beginPath(); for (let k = 0; k <= nn; k++) k ? g.lineTo((k / nn) * W, rg.xs[k]) : g.moveTo(0, rg.xs[0]); g.stroke(); } /* le fil de lumière sur la crête la plus proche */
}
function valleyPlanes(g, m, t, day, night, hzc) {
  const { W, H, hz, S, pal } = m, q = rng((S.seed ^ 0x7a11e) >>> 0), lit = 0.25 + 0.75 * day * (1 - 0.7 * night), D = H - hz, n = 4;
  const kind = S.lava ? null : S.ice || S.world === "frozen" ? "ice" : S.sand || S.world === "desert" ? "sand" : S.soil === "salt" ? null : S.trees > 0 || S.soil === "forest" || S.world === "jungle" ? "wood" : S.soil === "earth" ? "fields" : S.soil === "stone" || S.rock || S.soil === "chalk" ? "scree" : S.alive ? "wood" : "scree";
  const AK = m.airK || { thin: 0, thick: 0 }, haze = (0.35 + 0.5 * AK.thick) * (1 - 0.8 * AK.thin), air = (c, d) => mixc(mixc([6, 7, 12], c, lit), hzc, haze * (1 - d) * (0.3 + 0.7 * day)); /* l'air règle la perspective : épais, le loin se fond ; ténu, tout reste net */
  for (let b = 0; b < n; b++) { /* du plus loin au plus proche : chaque plan est une bande ondulée, un peu plus sombre que le précédent */
    const d = (b + 1) / (n + 1), y0 = hz + D * Math.pow(d, 1.6) * 0.85, amp = D * 0.03 * (0.5 + d), ph = q() * 6, c = air(mixc(pal.ground, b % 2 ? [255, 255, 255] : [0, 0, 0], 0.1), d);
    g.fillStyle = css(c); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 6) g.lineTo(x, y0 + Math.sin(x / W * (3 + b) + ph) * amp + Math.sin(x * 0.05 + ph) * amp * 0.25); g.lineTo(W, H); g.closePath(); g.fill();
    g.strokeStyle = css(mixc(c, hzc, 0.35), 0.35); g.lineWidth = 0.8; g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = y0 + Math.sin(x / W * (3 + b) + ph) * amp + Math.sin(x * 0.05 + ph) * amp * 0.25; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); /* la crête du plan, que la lumière accroche */
    if (!kind) continue;
    const k = (0.45 + 1.1 * d) * W / 320, cnt = kind === "fields" ? 3 : 5 + Math.floor(q() * 5);
    for (let i = 0; i < cnt; i++) { const x = q() * W, y = y0 + amp * 1.2 + q() * D * 0.08 * (0.4 + d);
      if (kind === "wood") { const w = (14 + q() * 28) * k, cw = mixc(leafC(S, S.ice ? [34, 52, 46] : S.sand ? [74, 80, 46] : [30, 56, 32]), [0, 0, 0], 0.2 * (1 - d)); g.fillStyle = css(air(cw, d)); for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(x + (j - 2.5) * w * 0.18, y - (j % 2) * 2 * k, w * 0.14, 0, TAU); g.fill(); } } /* un bois, en boules serrées */
      else if (kind === "fields") { const w = (40 + q() * 50) * k, h = (5 + q() * 4) * k, sk = (q() - 0.5) * 0.3; for (let j = 0; j < 4; j++) { g.fillStyle = css(air(mixc(pal.ground, j % 2 ? [150, 130, 70] : [70, 96, 50], 0.35), d), 0.8); g.beginPath(); g.moveTo(x + j * w * 0.25, y); g.lineTo(x + (j + 1) * w * 0.25, y + sk * w * 0.25); g.lineTo(x + (j + 1) * w * 0.25 - 3 * k, y + h + sk * w * 0.25); g.lineTo(x + j * w * 0.25 - 3 * k, y + h); g.closePath(); g.fill(); } } /* des champs en lanières */
      else if (kind === "scree") { g.fillStyle = css(air(mixc(pal.rock, [200, 194, 182], 0.3), d)); for (let j = 0; j < 5; j++) { const r = (1.5 + q() * 3) * k; g.beginPath(); g.ellipse(x + (q() - 0.5) * 24 * k, y + q() * 4 * k, r * 1.4, r, 0, Math.PI, TAU); g.fill(); } } /* des blocs épars */
      else if (kind === "sand") { g.strokeStyle = css(air(mixc(pal.ground, [255, 230, 180], 0.3), d), 0.6); g.lineWidth = 0.8; for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(x - 20 * k, y + j * 3 * k); g.quadraticCurveTo(x, y + j * 3 * k - 3 * k, x + 20 * k, y + j * 3 * k); g.stroke(); } } /* des rides de sable */
      else if (kind === "ice") { g.strokeStyle = css(air([70, 110, 150], d), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(x - 18 * k, y); g.lineTo(x - 6 * k, y + 2 * k); g.lineTo(x + 4 * k, y - 1 * k); g.lineTo(x + 18 * k, y + 1.5 * k); g.stroke(); } /* des crevasses */
    }
  }
}
function viewFrame(g, m, t, hzc, day, night) {
  const { W, H, hz, S, pal } = m, V = S.view, P = V.pts, sd = V.side, X = (x) => (sd < 0 ? x : W - x), lit = 0.2 + 0.8 * day * (1 - 0.7 * night);
  const dk = (c, k = 1) => mixc([4, 5, 9], c, lit * k), path = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  if (V.kind === "high") { /* on se tient au bord : une lèvre de roche en bas, la vue plonge */
    const base = dk(mixc(pal.rock, [70, 64, 58], 0.5), 0.55), y0 = H * (0.84 + 0.05 * P[0]), pts = [[0, H]];
    for (let k = 0; k <= 12; k++) { const x = (k / 12) * W, bump = Math.sin(k * 1.7 + P[1] * 6) * H * 0.02 + (P[(k + 2) % 24] - 0.5) * H * 0.025; pts.push([x, y0 + bump - (sd < 0 ? (12 - k) : k) / 12 * H * 0.06]); }
    pts.push([W, H]); path(pts); g.fillStyle = css(base); g.fill();
    g.save(); path(pts); g.clip(); const tf = g.createLinearGradient(0, y0 - H * 0.08, 0, y0 + H * 0.06); tf.addColorStop(0, css(mixc(base, hzc, 0.45 * (0.3 + 0.7 * day)))); tf.addColorStop(1, css(base, 0)); g.fillStyle = tf; g.fillRect(0, 0, W, H); g.restore(); /* le dessus de la roche, éclairé */
    g.strokeStyle = css(mixc(hzc, [255, 240, 220], 0.3), 0.5); g.lineWidth = 1.2; g.beginPath(); pts.slice(1, -1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    const hz2 = g.createLinearGradient(0, hz, 0, y0); hz2.addColorStop(0, css(hzc, 0)); hz2.addColorStop(1, css(hzc, 0.12 * (0.4 + 0.6 * day))); g.fillStyle = hz2; g.fillRect(0, hz, W, y0 - hz); /* l'air entre nous et le fond de la vallée */
    g.fillStyle = css(dk([60, 80, 46], 0.7), 0.9); for (let k = 0; k < 9; k++) { const u = P[(k * 5) % 24], x = u * W, y = y0 - (sd < 0 ? 1 - u : u) * H * 0.06 + 1; for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x + j * 2, y + 2); g.lineTo(x + j * 2 + 1, y - 4 - (j % 2) * 2); g.lineTo(x + j * 2 + 2, y + 2); g.fill(); } }
    return;
  }
  if (V.kind === "slope") { /* à flanc de pente : le sol monte d'un côté, on ne voit l'horizon que de l'autre */
    const gr = S.ice || S.world === "frozen" ? [214, 228, 240] : S.sand || S.world === "desert" ? mixc(pal.ground, [214, 176, 116], 0.55) : S.lava ? [46, 32, 28] : S.alive || S.trees ? leafC(S, mixc([84, 122, 58], pal.ground, 0.25)) : S.rock === "granite" ? { grey: [150, 146, 140], ochre: [176, 140, 96], pink: [180, 132, 120] }[S.graniteHue || "grey"] : S.soil === "chalk" ? [214, 206, 186] : S.rock === "basalt" ? [52, 52, 58] : mixc(pal.rock, [150, 140, 126], 0.45);
    const base = dk(gr, 1), topY = H * (0.18 + 0.28 * P[0]), footX = W * (0.4 + 0.4 * P[1]), bend = 1.0 + 0.8 * P[6], edge = []; /* la couleur du monde, éclairée par le jour ; hauteur, étendue et galbe propres à l'Âge */
    for (let k = 0; k <= 20; k++) { const u = k / 20, x = u * footX, y = topY + (H - topY) * Math.pow(u, bend) + Math.sin(u * 9 + P[2] * 6) * H * 0.015 * (1 - u); edge.push([X(x), y]); }
    path([[X(0), H + 2], [X(0), topY], ...edge, [X(footX), H + 2]]); const sg = g.createLinearGradient(X(footX * 0.7), topY, X(0), H); sg.addColorStop(0, css(mixc(base, hzc, 0.25 * day))); sg.addColorStop(0.6, css(base)); sg.addColorStop(1, css(mixc(base, [0, 0, 0], 0.3))); g.fillStyle = sg; g.fill();
    g.strokeStyle = css(mixc(hzc, [255, 240, 220], 0.3), 0.45); g.lineWidth = 1.2; g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); /* la crête de la pente, contre le ciel */
    g.save(); path([[X(0), H + 2], [X(0), topY], ...edge, [X(footX), H + 2]]); g.clip();
    const tex = S.ice || S.world === "frozen" ? "snow" : S.sand || S.world === "desert" ? "sand" : S.lava ? "lava" : S.alive || S.trees ? "grass" : "stone";
    for (let k = 0; k < 60; k++) { const u = P[k % 24] * 0.95, v = P[(k * 7 + 3) % 24], x = X(u * footX * (0.3 + 0.7 * v)), y = topY + (H - topY) * (0.1 + 0.9 * v) + (k % 5) * 3, sc = 0.6 + 0.8 * v;
      if (tex === "grass") { g.strokeStyle = css(mixc(base, [140, 170, 90], 0.35), 0.7); g.lineWidth = 0.8; for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(x + j * 2, y); g.lineTo(x + j * 2 + (j - 1) * 1.5 + Math.sin(TAU * t * 0.4 + k) * 1.2, y - 6 * sc); g.stroke(); } }
      else if (tex === "stone") { g.fillStyle = css(mixc(base, [190, 184, 172], 0.25)); g.beginPath(); g.ellipse(x, y, 4 * sc, 2.4 * sc, 0, Math.PI, TAU); g.fill(); }
      else if (tex === "snow") { g.fillStyle = css([150, 180, 210], 0.35); g.beginPath(); g.ellipse(x, y, 9 * sc, 1.5 * sc, -0.3 * (V.side), 0, TAU); g.fill(); }
      else if (tex === "sand") { g.strokeStyle = css(mixc(base, [255, 230, 180], 0.3), 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 10 * sc, y); g.quadraticCurveTo(x, y - 2 * sc, x + 10 * sc, y); g.stroke(); }
      else if (tex === "lava" && k % 3 === 0) { g.strokeStyle = css([255, 90 + 40 * v, 30], 0.35 + 0.25 * Math.sin(TAU * t + k)); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 * sc, y + 3 * sc); g.lineTo(x + 12 * sc, y + 1 * sc); g.stroke(); } }
    g.restore();
    if (tex !== "lava" && P[8] < 0.4) { const u = 0.15 + 0.5 * P[5], bx = X(footX * u * 0.8), by = topY + (H - topY) * Math.pow(u * 0.8, bend) + H * (0.03 + 0.15 * P[9]), r = W * (0.015 + 0.03 * P[10]); g.fillStyle = css(dk(mixc(pal.rock, gr, 0.4), 0.8)); g.beginPath(); g.ellipse(bx, by, r, r * (0.55 + 0.3 * P[11]), (P[12] - 0.5) * 0.4, Math.PI, TAU); g.fill(); g.strokeStyle = css(mixc(hzc, [255, 240, 220], 0.3), 0.3); g.beginPath(); g.ellipse(bx, by, r, r * (0.55 + 0.3 * P[11]), (P[12] - 0.5) * 0.4, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); } /* parfois une pierre sur la pente, de la teinte du lieu, jamais au même endroit */
    return;
  }
  if (V.near) { /* de plain-pied, un élément du monde tout proche, d'un côté */
    const mat = S.rock === "granite" ? { grey: [150, 146, 140], ochre: [172, 138, 96], pink: [176, 130, 118] }[S.graniteHue || "grey"] : S.soil === "chalk" ? [210, 202, 182] : S.rock === "basalt" || S.lava ? [50, 50, 56] : S.sand || S.world === "desert" ? [176, 140, 96] : S.ice ? [170, 196, 220] : mixc(pal.rock, [140, 132, 120], 0.45);
    const st = dk(mat, 0.95), hi = css(mixc(hzc, [255, 236, 210], 0.3), 0.45), shade = (x0, x1, y0, y1) => { const gg = g.createLinearGradient(X(x0), y0, X(x1), y1); gg.addColorStop(0, css(mixc(st, hzc, 0.22 * day))); gg.addColorStop(0.55, css(st)); gg.addColorStop(1, css(mixc(st, [0, 0, 0], 0.4))); return gg; }; /* la matière du monde, éclairée du côté du ciel */
    if (V.near === "boulder") { const cx = X(W * (0.06 + 0.14 * P[0])), rx = W * (0.14 + 0.14 * P[1]), ry = H * (0.28 + 0.26 * P[2]), pts = []; for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI, j = 1 + (P[k % 24] - 0.5) * 0.08, sq = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.7); pts.push([cx + Math.cos(a) * rx * j, H * 1.02 + sq * ry * j]); } /* un bloc arrondi, un peu tassé */
      path(pts); g.fillStyle = shade(W * 0.3, 0, H * 0.5, H); g.fill(); g.strokeStyle = hi; g.lineWidth = 1.2; g.beginPath(); pts.slice(2, 12).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.fillStyle = css(S.ice || S.season && S.season.snow ? [220, 232, 244] : dk([60, 86, 44], 0.7), 0.85); g.beginPath(); pts.slice(5, 12).forEach(([x, y], i) => (i ? g.lineTo(x, y + 2) : g.moveTo(x, y))); g.lineTo(pts[11][0], pts[11][1] + 6); g.lineTo(pts[5][0], pts[5][1] + 6); g.closePath(); g.fill(); /* mousse, ou neige, sur le dos du rocher */
      g.strokeStyle = css(mixc(st, [0, 0, 0], 0.4), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - rx * 0.2, H * 1.02 - ry * 0.8); g.lineTo(cx - rx * 0.1, H * 1.02 - ry * 0.45); g.lineTo(cx - rx * 0.25, H); g.stroke(); return; }
    if (V.near === "column") { const x = W * (0.06 + 0.12 * P[0]), w = W * (0.05 + 0.05 * P[1]), top = H * (0.1 + 0.35 * P[2]), cc = dk(mixc(mat, [200, 190, 170], 0.35), 0.95);
      path([[X(x - w / 2), H + 2], [X(x - w / 2), top + 8], [X(x - w * 0.2), top], [X(x), top + 10], [X(x + w * 0.25), top + 3], [X(x + w / 2), top + 12], [X(x + w / 2), H + 2]]); { const gg = g.createLinearGradient(X(x + w / 2), 0, X(x - w / 2), 0); gg.addColorStop(0, css(mixc(cc, hzc, 0.2 * day))); gg.addColorStop(1, css(mixc(cc, [0, 0, 0], 0.4))); g.fillStyle = gg; } g.fill();
      g.strokeStyle = css(mixc(cc, [0, 0, 0], 0.4), 0.8); g.lineWidth = 1; for (let k = 1; k < 4; k++) { const fx = X(x - w / 2 + (k / 4) * w); g.beginPath(); g.moveTo(fx, top + 14); g.lineTo(fx, H); g.stroke(); } /* les cannelures */
      g.strokeStyle = hi; g.beginPath(); g.moveTo(X(x + (sd < 0 ? w / 2 : -w / 2)), top + 12); g.lineTo(X(x + (sd < 0 ? w / 2 : -w / 2)), H); g.stroke();
      g.fillStyle = css(mixc(cc, [0, 0, 0], 0.1)); g.beginPath(); g.ellipse(X(x + w * 1.6), H - H * 0.03, w * 0.55, H * 0.05, 0, 0, TAU); g.fill(); g.strokeStyle = hi; g.beginPath(); g.ellipse(X(x + w * 1.6), H - H * 0.03, w * 0.55, H * 0.05, 0, Math.PI, TAU); g.stroke(); /* un tambour tombé */
      g.fillStyle = css(dk([46, 66, 38], 0.55), 0.9); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(X(x - w / 2 + P[(k + 3) % 24] * w), top + 20 + P[(k + 8) % 24] * (H - top) * 0.7, 3, 5, 0, 0, TAU); g.fill(); } return; }
    /* trunk : un tronc tout proche, ses racines, sans le feuillage (hors du cadre) */
    const x = W * (0.05 + 0.1 * P[0]), w = W * (0.06 + 0.07 * P[1]), bark = dk(S.ice ? [120, 110, 100] : S.sand ? [140, 110, 80] : [96, 72, 52], 0.95);
    path([[X(x - w * 0.42), -2], [X(x + w * 0.42), -2], [X(x + w * 0.5), H * 0.7], [X(x + w * 1.1), H + 2], [X(x - w * 1.0), H + 2], [X(x - w * 0.5), H * 0.72]]); { const gg = g.createLinearGradient(X(x + w / 2), 0, X(x - w / 2), 0); gg.addColorStop(0, css(mixc(bark, hzc, 0.2 * day))); gg.addColorStop(1, css(mixc(bark, [0, 0, 0], 0.45))); g.fillStyle = gg; } g.fill();
    g.strokeStyle = css(mixc(bark, [0, 0, 0], 0.4), 0.8); g.lineWidth = 1; for (let k = 0; k < 5; k++) { const bx = X(x - w * 0.35 + k * w * 0.18); g.beginPath(); g.moveTo(bx, 0); g.bezierCurveTo(bx + 2, H * 0.3, bx - 2, H * 0.6, bx + (k - 2) * 3, H); g.stroke(); } /* l'écorce */
    g.strokeStyle = hi; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(x + (sd < 0 ? w * 0.42 : -w * 0.42)), 0); g.lineTo(X(x + (sd < 0 ? w * 0.5 : -w * 0.5)), H * 0.7); g.stroke();
    g.fillStyle = css(bark); g.beginPath(); g.moveTo(X(x + w * 0.4), H * 0.3); g.lineTo(X(x + w * 1.3), H * 0.22); g.lineTo(X(x + w * 1.32), H * 0.24); g.lineTo(X(x + w * 0.42), H * 0.36); g.fill(); /* une branche coupée */
    return;
  }
  if (V.kind === "cover" && V.frame === "trees") { /* une lisière : deux troncs proches d'un côté, le feuillage qui retombe du haut */
    const bark = css(dk(mixc(pal.rock, [40, 30, 22], 0.6), 0.6)), leaf = leafC(S, S.ice || S.world === "frozen" ? [30, 44, 40] : S.sand ? [70, 76, 40] : [26, 46, 28]), lc = (k) => css(dk(mixc(leaf, [0, 0, 0], k), 0.7), 1);
    const w1 = W * (0.07 + 0.03 * P[0]), x1 = W * (0.06 + 0.06 * P[1]), w2 = W * (0.03 + 0.02 * P[2]), x2 = x1 + W * (0.14 + 0.06 * P[3]);
    for (const [x, w] of [[x2, w2], [x1, w1]]) { g.fillStyle = bark; g.beginPath(); g.moveTo(X(x - w / 2) , H); g.bezierCurveTo(X(x - w * 0.45), H * 0.6, X(x - w * 0.35), H * 0.3, X(x - w * 0.3), -2); g.lineTo(X(x + w * 0.3), -2); g.bezierCurveTo(X(x + w * 0.35), H * 0.3, X(x + w * 0.45), H * 0.6, X(x + w / 2 + w * 0.3), H); g.closePath(); g.fill();
      g.strokeStyle = css(mixc(hzc, [255, 230, 190], 0.2), 0.18); g.lineWidth = 1; g.beginPath(); g.moveTo(X(x + w * 0.3), 0); g.bezierCurveTo(X(x + w * 0.35), H * 0.3, X(x + w * 0.45), H * 0.6, X(x + w * 0.8), H); g.stroke(); }
    const reach = W * (0.42 + 0.16 * P[4]); for (let k = 0; k < 26; k++) { const u = k / 25, x = u * reach, y = H * (0.02 + 0.2 * Math.pow(u, 1.6)) + (P[k % 24] - 0.5) * H * 0.06, r = H * (0.07 - 0.04 * u) * (0.8 + 0.4 * P[(k + 7) % 24]); g.fillStyle = lc(0.15 + 0.25 * P[(k + 3) % 24]); g.beginPath(); g.ellipse(X(x), y, r * 1.4, r, 0, 0, TAU); g.fill(); }
    const sway = Math.sin(TAU * t * 0.3) * 1.5; g.strokeStyle = lc(0.1); g.lineWidth = 1; for (let k = 0; k < 7; k++) { const x = X(reach * (0.2 + 0.7 * P[(k + 11) % 24])), y = H * (0.12 + 0.12 * P[(k + 5) % 24]), L = H * (0.06 + 0.1 * P[(k + 9) % 24]); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sway, y + L * 0.6, x + sway * 1.6, y + L); g.stroke(); }
    g.fillStyle = css(dk([40, 50, 34], 0.5)); g.beginPath(); g.moveTo(0, H); for (let k = 0; k <= 10; k++) g.lineTo(X(reach * 0.9 * (k / 10)), H - H * (0.05 + 0.04 * P[(k + 13) % 24]) * (1 - k / 12)); g.lineTo(X(0), H); g.closePath(); g.fill();
    return;
  }
  if (V.kind === "cover") { /* une arche en ruine, toute proche : un pilier massif d'un côté, le linteau brisé en haut ; en silhouette, comme un premier plan */
    const st = mixc(mixc(pal.rock, [40, 36, 32], 0.5), [0, 0, 0], 0.55), stc = css(st), hi = css(mixc(hzc, [255, 236, 210], 0.3), 0.3), pw = W * (0.12 + 0.05 * P[0]), lt = H * (0.11 + 0.05 * P[1]), reach = W * (0.5 + 0.25 * P[2]);
    const out = [[X(0), -2], [X(reach), -2]]; for (let k = 0; k <= 6; k++) { const u = k / 6, x = reach - u * (reach - pw - W * 0.05), y = lt * (0.35 + 0.65 * u) + (P[(k + 5) % 24] - 0.5) * lt * 0.5 * (1 - u); out.push([X(x), y]); }
    out.push([X(pw + W * 0.02), lt + H * 0.04], [X(pw), lt + H * 0.12]); for (let k = 1; k <= 6; k++) out.push([X(pw + (P[(k + 9) % 24] - 0.5) * W * 0.012), lt + H * 0.12 + (H - lt) * k / 6]); out.push([X(0), H + 2]);
    path(out); g.fillStyle = stc; g.fill(); g.strokeStyle = hi; g.lineWidth = 1; g.beginPath(); out.slice(2, -1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); /* la lumière du dehors sur la tranche */
    g.save(); path(out); g.clip(); g.strokeStyle = css(mixc(st, [150, 140, 125], 0.18), 0.8); g.lineWidth = 0.8; let row = 0;
    for (let y = lt + H * 0.06; y < H; y += H * (0.07 + 0.03 * P[(row + 3) % 24]), row++) { g.beginPath(); g.moveTo(X(0), y); g.lineTo(X(pw + 4), y + (P[row % 24] - 0.5) * 3); g.stroke(); const xv = pw * (0.3 + 0.4 * P[(row + 7) % 24]); g.beginPath(); g.moveTo(X(xv), y); g.lineTo(X(xv), y + H * 0.07); g.stroke(); } /* les assises du pilier */
    for (let x = pw + W * 0.06; x < reach - W * 0.04; x += W * (0.05 + 0.03 * P[(Math.round(x) % 24)])) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x + 2), lt * 0.6); g.stroke(); } /* les claveaux du linteau */
    g.restore();
    g.fillStyle = css(dk([46, 66, 38], 0.55), 0.95); for (let k = 0; k < 10; k++) { const y = lt + H * 0.05 + P[(k + 4) % 24] * H * 0.75, x = X(pw - 1 - P[(k + 2) % 24] * 4); g.beginPath(); g.ellipse(x, y, 2.5 + P[k % 24] * 2, 4 + P[(k + 1) % 24] * 3, 0, 0, TAU); g.fill(); } /* du lierre sur la tranche */
    g.strokeStyle = css(dk([46, 66, 38], 0.55), 0.9); g.lineWidth = 0.8; for (let k = 0; k < 5; k++) { const x = X(pw + W * 0.05 + P[(k + 14) % 24] * (reach - pw - W * 0.1)), y0 = lt * (0.5 + 0.4 * P[(k + 6) % 24]), L = H * (0.05 + 0.1 * P[(k + 8) % 24]), sw = Math.sin(TAU * t * 0.3 + k) * 1.2; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + sw, y0 + L * 0.5, x + sw * 1.5, y0 + L); g.stroke(); } /* des tiges qui pendent du linteau */
    return;
  }
  /* l'entrée d'une grotte : la roche tout autour, une ouverture irrégulière, la lumière du dehors qui entre */
  const M = { rock: { "grey": [92, 90, 88], "ochre": [128, 100, 66], "pink": [132, 98, 92] }[S.graniteHue || "grey"], ice: [120, 170, 205], basalt: [30, 31, 36], chalk: [206, 200, 182], lava: [26, 18, 16] }[V.mat] || [92, 90, 88];
  const rockC = dk(M, V.mat === "ice" ? 0.75 : 0.55), cx = W * (0.5 + 0.08 * sd * P[0]), cy = hz - H * (0.02 + 0.04 * P[1]), rx = W * (0.4 + 0.07 * P[2]), ryT = cy - H * (0.04 + 0.05 * P[3]), ryB = H * (0.86 + 0.06 * P[4]) - cy;
  const open = []; for (let k = 0; k < 48; k++) { const a = (k / 48) * TAU, top = Math.sin(a) < 0, ry = top ? ryT : ryB, jag = 1 + (P[k % 24] - 0.5) * (top ? 0.18 : 0.1) + Math.sin(a * 5 + P[5] * 6) * 0.05; open.push([cx + Math.cos(a) * rx * jag * (top ? 1 : 1.08), cy + Math.sin(a) * ry * jag]); }
  g.save(); g.beginPath(); g.rect(0, 0, W, H); open.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  const rg = g.createRadialGradient(cx, cy, Math.min(rx, ryB) * 0.9, cx, cy, W * 0.75); rg.addColorStop(0, css(mixc(rockC, hzc, 0.22 * (0.3 + 0.7 * day)))); rg.addColorStop(0.35, css(rockC)); rg.addColorStop(1, css(mixc(rockC, [0, 0, 0], 0.75))); /* la paroi s'éclaire près de l'ouverture */ g.fillStyle = rg; g.fill("evenodd");
  g.clip("evenodd");
  g.strokeStyle = css(mixc(rockC, [0, 0, 0], 0.45), 0.55); g.lineWidth = 1.2; for (let k = 0; k < 7; k++) { const y = H * (0.08 + 0.13 * k) + P[(k + 3) % 24] * 8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += W / 8) g.lineTo(x, y + Math.sin(x * 0.03 + k + P[k] * 5) * 5 + (x / W - 0.5) * 10 * (P[(k + 6) % 24] - 0.5)); g.stroke(); } /* les strates de la roche */
  if (V.mat === "ice") { g.strokeStyle = css([225, 245, 255], 0.35); g.lineWidth = 1; for (let k = 0; k < 10; k++) { const x = W * P[(k * 3) % 24]; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 10 * (P[k] - 0.5), H * 0.5, x + 18 * (P[(k + 1) % 24] - 0.5), H); g.stroke(); } } /* des veines claires dans la glace */
  if (V.mat === "basalt") { g.strokeStyle = css(mixc(rockC, [120, 120, 130], 0.25), 0.6); g.lineWidth = 1; for (let x = 4; x < W; x += 7 + (x % 5)) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 2, H); g.stroke(); } } /* des prismes dans la paroi */
  if (V.mat === "lava") { const lg = g.createRadialGradient(cx, cy + ryB * 0.6, 4, cx, cy + ryB * 0.6, W * 0.5); lg.addColorStop(0, css([255, 90, 30], 0.35)); lg.addColorStop(1, css([255, 60, 20], 0)); g.fillStyle = lg; g.fillRect(0, 0, W, H); } /* un tunnel de lave : la roche rougeoie */
  g.restore();
  const edge = (k) => mixc(hzc, [255, 244, 228], 0.3 + 0.2 * k); g.strokeStyle = css(V.mat === "lava" ? [255, 110, 40] : edge(day), V.mat === "lava" ? 0.6 : 0.3 + 0.25 * day); g.lineWidth = 1.4; g.beginPath(); open.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); /* le bord que la lumière du dehors accroche */
  if (V.mat === "ice" || V.mat === "chalk" || V.mat === "rock") { const sc = V.mat === "ice" ? [210, 236, 250] : dk(M, 0.7); for (let k = 0; k < 9; k++) { const idx = 24 + 4 + Math.floor(P[(k * 7) % 24] * 16), x = open[idx][0], y = open[idx][1] + 1, L = H * (0.03 + 0.07 * P[(k + 3) % 24]); g.fillStyle = css(sc, V.mat === "ice" ? 0.85 : 1); g.beginPath(); g.moveTo(x - 3, y - 6); g.lineTo(x + 3, y - 6); g.lineTo(x + 0.3, y + L); g.closePath(); g.fill(); } } /* stalactites ou glaçons au linteau */
  const fl = g.createLinearGradient(0, cy + ryB * 0.7, 0, H); fl.addColorStop(0, css(mixc(hzc, [255, 240, 220], 0.2), 0.28 * (0.3 + 0.7 * day))); fl.addColorStop(1, css(hzc, 0)); g.fillStyle = fl; g.beginPath(); g.ellipse(cx, H, rx * 0.9, H - cy - ryB * 0.7, 0, Math.PI, TAU); g.fill(); /* la lumière du dehors sur le sol de la grotte */
}
function foreground(g, m, t, hzc) {
  const { W, H, fg, pal } = m, col = css(mixc(pal.rock, [0, 0, 0], 0.7)), rim = css(mixc(hzc, [255, 230, 190], 0.2), 0.22), sd = fg.side, X = (x) => (sd < 0 ? x : W - x);
  g.fillStyle = col; g.strokeStyle = rim; g.lineWidth = 1; g.lineCap = "round";
  const wind = Math.sin(TAU * t + fg.p);
  if (fg.kind === "none") return;
  if (fg.kind === "rocks") {
    const rs = rockStyleOf(m.S), RC = { basalt: [22, 22, 26], salt: [214, 210, 200], sandstone: [150, 104, 64], mossy: [40, 46, 36], ice: [170, 200, 222], granite: m.S.graniteHue === "pink" ? [150, 112, 104] : m.S.graniteHue === "ochre" ? [150, 120, 80] : [120, 118, 114] }[rs]; if (RC) g.fillStyle = css(mixc(mixc(pal.rock, RC, 0.75), [0, 0, 0], 0.3)); /* les rochers prennent la roche du sol */
    for (const [wd, k] of [[0.3, 0], [0.16, 8]]) {
      g.beginPath(); g.moveTo(X(-2), H + 2); g.lineTo(X(-2), H * (0.74 + 0.1 * fg.pts[k]));
      for (let i = 1; i <= 6; i++) g.lineTo(X(W * wd * (i / 6)), H * (0.78 + 0.18 * (i / 6) - 0.1 * fg.pts[(k + i) % 16]));
      g.lineTo(X(W * wd), H + 2); g.closePath(); g.fill(); g.stroke();
      if (rs) { g.save(); g.clip(); const top = H * (0.74 + 0.1 * fg.pts[k]) - 4;
        if (rs === "basalt") { g.strokeStyle = css([0, 0, 0], 0.6); g.lineWidth = 1; for (let x = 0; x < W * wd; x += 7) { g.beginPath(); g.moveTo(X(x), top); g.lineTo(X(x), H); g.stroke(); } g.strokeStyle = css([160, 170, 185], 0.35); for (let x = 0; x < W * wd; x += 7) { g.beginPath(); g.moveTo(X(x + 1), top); g.lineTo(X(x + 1), H); g.stroke(); } } /* des prismes */
        else if (rs === "sandstone") { g.strokeStyle = css([90, 56, 30], 0.5); g.lineWidth = 1.2; for (let y = top; y < H; y += 6) { g.beginPath(); g.moveTo(X(0), y); g.lineTo(X(W * wd), y + 3); g.stroke(); } } /* les lits du grès */
        else if (rs === "salt") { g.fillStyle = css([250, 250, 248], 0.6); for (let y = top; y < H; y += 9) g.fillRect(Math.min(X(0), X(W * wd)), y, W * wd, 2); } /* la croûte de sel */
        else if (rs === "mossy") { g.fillStyle = css([70, 110, 50], 0.85); g.fillRect(Math.min(X(0), X(W * wd)), top - 2, W * wd, 7); } /* la mousse dessus */
        else if (rs === "ice") { g.strokeStyle = css([240, 250, 255], 0.6); g.lineWidth = 1; for (let k2 = 0; k2 < 6; k2++) { g.beginPath(); g.moveTo(X(W * wd * k2 / 6), top + 4); g.lineTo(X(W * wd * k2 / 6 + 8), H); g.stroke(); } } /* les arêtes de la glace */
        g.restore(); }
    }
  } else if (fg.kind === "branches") {
    const ts = treeFgStyle(m), b0 = ts ? { ...fg.branch, style: ts } : fg.branch, se = m.S.season, b = se && (b0.style === "leafy" || b0.style === "blossom") ? { ...b0, style: se.snow > 0.3 ? "snowy" : se.vig < 0.3 ? "bare" : se.bloom > 0.5 ? "blossom" : se.fall > 0.5 ? "rust" : b0.style, hue: b0.hue != null ? b0.hue : 340 } : b0, sway = (d) => wind * (0.6 + d * 0.9); /* la branche du bord suit la saison */
    if (b.style === "cap") { /* le bord d'un chapeau de champignon géant qui déborde du cadre */ const ct = m.S, R = W * 0.42, cx = X(W * 0.12), cy = -H * 0.06; g.fillStyle = css([40, 26, 18]); g.beginPath(); g.ellipse(cx, cy + R * 0.42, R, R * 0.13, 0, 0, TAU); g.fill(); g.strokeStyle = css([90, 60, 40], 0.7); g.lineWidth = 0.8; for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(cx, cy + R * 0.42); g.lineTo(cx + (k / 10) * R * 0.95, cy + R * 0.42 + R * 0.11 * Math.cos((k / 10) * Math.PI / 2)); g.stroke(); } g.fillStyle = css([110, 66, 34]); g.beginPath(); g.ellipse(cx, cy + R * 0.3, R, R * 0.38, 0, 0, Math.PI, true); g.fill(); g.fillStyle = css([170, 110, 56], 0.6); for (let k = 0; k < 18; k++) { const a = Math.PI * (1 + ((k * 37) % 100) / 100), rr = ((k * 53) % 100) / 100; g.beginPath(); g.ellipse(cx + Math.cos(a) * R * rr, cy + R * 0.3 + Math.sin(a) * R * 0.38 * rr, R * 0.05, R * 0.03, 0, 0, TAU); g.fill(); } void ct; return; }
    for (const s of b.segs) { // les branches, de la plus épaisse à la plus fine ; les bouts bougent plus que la base
      const o0 = sway(s.d - 1) * (s.d > 0 ? 1 : 0), o1 = sway(s.d);
      g.strokeStyle = b.style === "charred" ? "#060505" : col; g.lineWidth = Math.max(0.8, s.w); g.beginPath(); g.moveTo(X(s.x + o0), s.y + o0 * 0.3); g.quadraticCurveTo(X(s.cx + (o0 + o1) / 2), s.cy, X(s.x2 + o1), s.y2 + o1 * 0.3); g.stroke();
      if (b.style === "snowy" && s.d < 3) { g.strokeStyle = css([235, 244, 252], 0.75); g.lineWidth = Math.max(0.8, s.w * 0.45); g.beginPath(); g.moveTo(X(s.x + o0), s.y + o0 * 0.3 - s.w * 0.45); g.quadraticCurveTo(X(s.cx + (o0 + o1) / 2), s.cy - s.w * 0.45, X(s.x2 + o1), s.y2 + o1 * 0.3 - s.w * 0.45); g.stroke(); }
    }
    for (const s of b.segs) {
      if (!s.tip) continue; const x = s.x2 + sway(s.d), y = s.y2 + sway(s.d) * 0.3, k = (s.x2 * 7 + s.y2 * 13) % 1;
      if (b.style === "leafy" || b.style === "rust") { g.fillStyle = b.style === "rust" ? css(mixc(pal.rock, [150, 70, 20], 0.6)) : col; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(X(x + (i - 1.5) * 4), y + (i % 2) * 4 + 2, 2.4, 6, (i - 1.5) * 0.5 * sd, 0, TAU); g.fill(); } }
      else if (b.style === "needles") { g.strokeStyle = col; g.lineWidth = 0.9; g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(X(x), y); g.lineTo(X(x + i * 2.2), y + 7 - Math.abs(i)); } g.stroke(); }
      else if (b.style === "blossom") { g.fillStyle = css(hsl(b.hue, 0.6, 0.78), 0.9); for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 6; g.beginPath(); g.arc(X(x + Math.cos(a) * 3.4), y + Math.sin(a) * 3.4, 1.9, 0, TAU); g.fill(); } g.fillStyle = css(hsl(b.hue + 30, 0.7, 0.88), 0.95); g.beginPath(); g.arc(X(x), y, 1.3, 0, TAU); g.fill(); }
      else if (b.style === "moss") { g.strokeStyle = css(mixc(pal.rock, [90, 110, 80], 0.4), 0.55); g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < 3; i++) { const len = 8 + 14 * ((k + i * 0.37) % 1); g.moveTo(X(x + i * 2 - 2), y); g.quadraticCurveTo(X(x + i * 2 - 2 + wind * 2), y + len * 0.5, X(x + i * 2 - 2 + wind * 3), y + len); } g.stroke(); }
      else if (b.style === "snowy") { g.fillStyle = css([235, 244, 252], 0.8); g.beginPath(); g.ellipse(X(x), y - 1.5, 2.6, 1.3, 0, 0, TAU); g.fill(); }
      else if (b.style === "ginkgo") { const gold = se ? Math.min(1, (se.fall || 0) * 1.4) : 0; g.fillStyle = css(mixc(mixc([60, 92, 34], [214, 166, 30], gold), [0, 0, 0], 0.35)); for (let i = 0; i < 5; i++) { const fx = X(x + (i - 2) * 4.5), fy = y + (i % 2) * 3 + 2; g.beginPath(); g.moveTo(fx, fy); g.arc(fx, fy, 5.5, -Math.PI / 2 - 0.8 + (i - 2) * 0.2, -Math.PI / 2 + 0.8 + (i - 2) * 0.2); g.closePath(); g.fill(); } } /* éventails de ginkgo */
      else if (b.style === "crystal") { const ct = crystalToneOf(m.S); for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5, L = 6 + (i % 2) * 3; g.fillStyle = css(hsl(ct.hue + (i % 2) * ct.spread, ct.fsat, 0.55 + 0.15 * (i % 2)), 0.9); g.beginPath(); g.moveTo(X(x), y); g.lineTo(X(x + Math.cos(a) * L - 1.4), y + Math.sin(a) * L); g.lineTo(X(x + Math.cos(a) * L * 1.3), y + Math.sin(a) * L * 1.3); g.lineTo(X(x + Math.cos(a) * L + 1.4), y + Math.sin(a) * L); g.closePath(); g.fill(); } } /* éclats de cristal */
    }
  } else if (fg.kind === "vines") {
    for (const v of fg.vines) { // lianes qui pendent du haut, avec leurs feuilles
      g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); const n = 12;
      for (let i = 0; i <= n; i++) { const u = i / n, y = -2 + v.len * u, x = v.x + Math.sin(u * v.f * TAU + v.p) * v.amp * u + wind * 3 * u * u; i ? g.lineTo(X(x), y) : g.moveTo(X(x), y); }
      g.stroke(); g.fillStyle = col;
      for (const l of v.leaves) { const u = l.u, y = -2 + v.len * u, x = v.x + Math.sin(u * v.f * TAU + v.p) * v.amp * u + wind * 3 * u * u; g.beginPath(); g.ellipse(X(x + l.a * l.s), y, l.s * 1.4, l.s * 0.6, l.a * 0.6 * sd, 0, TAU); g.fill(); }
    }
  } else if (fg.kind === "reeds") {
    for (const r of fg.reeds) { // roseaux et massettes au bord de l'eau
      const sw = Math.sin(TAU * t + r.p) * 2.2, tx = r.x + r.lean * r.h + sw, ty = H - r.h;
      g.strokeStyle = col; g.lineWidth = r.w; g.beginPath(); g.moveTo(X(r.x), H + 2); g.quadraticCurveTo(X(r.x + r.lean * r.h * 0.4), H - r.h * 0.5, X(tx), ty); g.stroke();
      if (r.head) { g.fillStyle = col; g.beginPath(); g.ellipse(X(tx - r.lean * 6), ty + 7, 2.2, 6, r.lean * sd, 0, TAU); g.fill(); }
    }
  } else if (fg.kind === "tallgrass") {
    for (const b of fg.grass) { // herbes hautes au premier plan, qui suivent la vague du vent
      const sw = Math.sin(TAU * t - (b.x / W) * 5 + b.p * 0.3) * (2 + b.h / H * 10), tx = b.x + b.lean * b.h + sw, ty = H - b.h;
      g.strokeStyle = col; g.lineWidth = b.w; g.beginPath(); g.moveTo(X(b.x), H + 2); g.quadraticCurveTo(X(b.x + b.lean * b.h * 0.3), H - b.h * 0.55, X(tx), ty); g.stroke();
      if (b.seed) { g.fillStyle = col; g.beginPath(); g.ellipse(X(tx), ty + 3, 1.6, 4, b.lean * sd, 0, TAU); g.fill(); }
    }
  } else if (fg.kind === "leaves") {
    for (const l of fg.leaves) { // grandes feuilles qui entrent par un côté
      const a = l.a + wind * 0.04, bx = -6, by = l.y, ex = bx + Math.cos(a) * l.len, ey = by - Math.abs(Math.sin(a)) * l.len * 0.8 - l.len * 0.2, mx = (bx + ex) / 2, my = (by + ey) / 2, nx = -(ey - by) * l.wd, ny = (ex - bx) * l.wd;
      g.fillStyle = col; g.beginPath(); g.moveTo(X(bx), by); g.quadraticCurveTo(X(mx + nx), my + ny, X(ex), ey); g.quadraticCurveTo(X(mx - nx), my - ny, X(bx), by); g.fill();
      g.strokeStyle = rim; g.lineWidth = 0.8; g.beginPath(); g.moveTo(X(bx), by); g.lineTo(X(ex), ey); g.stroke();
      if (l.notch) { g.strokeStyle = rim; g.lineWidth = 0.6; g.beginPath(); for (let i = 1; i < 5; i++) { const u = i / 5, px = lerp(bx, ex, u), py = lerp(by, ey, u); g.moveTo(X(px), py); g.lineTo(X(px + nx * 0.5 + (ex - bx) * 0.08), py + ny * 0.5 + (ey - by) * 0.08); } g.stroke(); } // nervures
    }
  } else if (fg.kind === "pillar") {
    const p = fg.pillar, x = p.x, w = p.w; // colonne brisée sur un bord, parfois prise dans une liane
    g.fillStyle = col; g.beginPath(); g.moveTo(X(x), H + 2); g.lineTo(X(x), p.top + p.cut[0] * H * 0.04);
    for (let i = 1; i <= 4; i++) g.lineTo(X(x + w * i / 4), p.top + p.cut[i] * H * 0.06); g.lineTo(X(x + w), H + 2); g.closePath(); g.fill();
    g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < p.flutes; i++) { const fx = x + w * i / p.flutes; g.moveTo(X(fx), p.top + H * 0.08); g.lineTo(X(fx), H); } g.stroke();
    g.fillStyle = col; g.fillRect(Math.min(X(x - w * 0.15), X(x + w * 1.15)), H * 0.9, w * 1.3, H * 0.1);
    if (p.vine) { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i <= 14; i++) { const u = i / 14, y = p.top + H * 0.05 + u * (H - p.top), xx = x + w * (0.5 + 0.6 * Math.sin(u * 9 + fg.p)); i ? g.lineTo(X(xx), y) : g.moveTo(X(xx), y); } g.stroke(); }
  } else if (fg.kind === "icicles") {
    g.fillStyle = col; g.fillRect(0, 0, W, H * 0.025);
    for (const c of fg.icicles) { // stalactites de glace au bord du cadre, une goutte de temps en temps
      g.fillStyle = css([200, 225, 245], 0.55); g.beginPath(); g.moveTo(c.x - c.w, H * 0.02); g.lineTo(c.x, H * 0.02 + c.len); g.lineTo(c.x + c.w, H * 0.02); g.closePath(); g.fill();
      g.strokeStyle = css([245, 252, 255], 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(c.x - c.w * 0.4, H * 0.025); g.lineTo(c.x, H * 0.02 + c.len * 0.9); g.stroke();
      const q = frac(t * 2 + c.p); if (c.len > H * 0.08 && q < 0.5) { g.fillStyle = css([220, 240, 255], 0.7 * (1 - q * 2)); g.fillRect(c.x - 0.6, H * 0.02 + c.len + q * H * 0.5, 1.2, 2); }
    }
  } else { // arche : deux piliers et une voûte
    const p1 = W * (0.022 + 0.02 * fg.pts[0]), p2 = W * (0.022 + 0.02 * fg.pts[1]);
    g.fillRect(0, 0, p1, H); g.fillRect(W - p2, 0, p2, H); g.strokeStyle = rim; g.beginPath(); g.moveTo(p1, H); g.lineTo(p1, 0); g.moveTo(W - p2, H); g.lineTo(W - p2, 0); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H * 0.2); g.quadraticCurveTo(W / 2, -H * 0.06, 0, H * 0.2); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(W, H * 0.2); g.quadraticCurveTo(W / 2, -H * 0.06, 0, H * 0.2); g.stroke();
  }
}

// ---- blocs inconnus : un dessin par axe ------------------------------------------------------------------
const LAYER = { cosmological: "sky", geological: "ground", ecological: "ground", meteorological: "air", metaphysical: "air" };
function extraAt(g, m, t, layer) {
  const { W, H, hz } = m;
  for (const e of m.extras) {
    const art = ART[e.id]; if (art) { if (art.layer === layer) { const sev = (m.S.tense || {})[e.id] || 0, lf = (LEAFY.has(e.id) || e.id === "flowers" || e.id === "grass") && (metalFilter(m.S) || (LEAFY.has(e.id) && leafFilter(m.S))); if (!sev && lf) { g.save(); g.filter = lf; art.draw(g, m, t, e); g.restore(); } else if (!sev) art.draw(g, m, t, e); else if (!SIGNS.has(e.id) || sev < 0.6) { g.save(); g.globalAlpha = SIGNS.has(e.id) ? 0.25 : GAUNT.has(e.id) ? 1 - 0.25 * sev : 1 - 0.7 * sev; g.filter = "grayscale(" + Math.min(1, sev * 1.2).toFixed(2) + ") sepia(" + (0.35 * sev).toFixed(2) + ") brightness(" + (1 - 0.2 * sev).toFixed(2) + ")"; art.draw(g, m, t, e); g.restore(); } } continue; } /* mal tiré, un bloc que la physique refuse ; le signe d'un invisible refusé s'efface */ /* un dessin propre au bloc */
    if (LAYER[e.axis] !== layer) continue;
    const tr = e.tr, col = (a, l = tr.l) => css(hsl(tr.h, tr.s, l), a), ph = TAU * t * Math.max(1, Math.round(tr.v * 2)) / 2, beat = tr.p ? 0.55 + 0.45 * Math.sin(ph * 2 + e.items[0].p) : 1;
    if (e.axis === "cosmological") { // halo, anneau et petit compagnon en orbite
      const it = e.items[0], cx = W * (0.25 + 0.5 * (it.x / W)), cy = H * (0.12 + 0.22 * it.y), R = H * 0.09 * tr.z;
      const gl = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2); gl.addColorStop(0, col(0.5 * beat, 0.7)); gl.addColorStop(1, col(0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.strokeStyle = col(0.7 * beat, 0.65); g.lineWidth = 1.4; g.beginPath(); g.ellipse(cx, cy, R * 1.5, R * 0.45, it.p * 0.3, 0, TAU); g.stroke();
      g.fillStyle = col(0.95, 0.75); g.beginPath(); g.arc(cx + Math.cos(ph + it.p) * R * 1.5, cy + Math.sin(ph + it.p) * R * 0.45, Math.max(1.5, R * 0.14), 0, TAU); g.fill();
    } else if (e.axis === "geological") { // formations au sol : aiguilles si « sharp », dômes sinon
      for (const it of e.items) {
        const x = W * (0.05 + 0.9 * (it.x / W)), h = H * (0.07 + 0.1 * it.w) * tr.z, w = h * (tr.sp ? 0.45 : 1.4); g.fillStyle = col(0.95, tr.l * 0.45); g.strokeStyle = col(0.5 + 0.3 * beat, tr.l); g.lineWidth = 1;
        g.beginPath(); if (tr.sp) { g.moveTo(x - w, hz + 3); g.lineTo(x - w * 0.15, hz - h); g.lineTo(x + w * 0.5, hz - h * 0.6); g.lineTo(x + w, hz + 3); } else { g.moveTo(x - w, hz + 3); g.quadraticCurveTo(x, hz - h * 1.9, x + w, hz + 3); }
        g.closePath(); g.fill(); g.stroke();
      }
    } else if (e.axis === "ecological") { // tiges à bulbe lumineux qui se balancent
      for (const it of e.items) {
        const x = W * (0.04 + 0.92 * (it.x / W)), y0 = hz + H * (0.02 + 0.2 * it.y), h = H * (0.06 + 0.08 * it.w) * tr.z, sw = Math.sin(ph + it.p) * 3 * tr.v;
        g.strokeStyle = col(0.9, tr.l * 0.4); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + sw, y0 - h * 0.5, x + sw * 1.4, y0 - h); g.stroke();
        g.fillStyle = col(0.85 * beat, 0.7); g.beginPath(); g.arc(x + sw * 1.4, y0 - h, Math.max(1.5, h * 0.12), 0, TAU); g.fill();
      }
    } else if (e.axis === "meteorological") { // voiles colorés qui dérivent
      for (const [i, it] of e.items.entries()) {
        const y = hz - H * (0.05 + 0.35 * it.y), x = frac(it.x / W + t * tr.v * (1 + (i % 2))) * (W * 1.4) - W * 0.2, wd = W * 0.3 * tr.z;
        const gr = g.createLinearGradient(x, 0, x + wd, 0); gr.addColorStop(0, col(0, 0.7)); gr.addColorStop(0.5, col(0.22, 0.7)); gr.addColorStop(1, col(0, 0.7)); g.fillStyle = gr; g.fillRect(x, y, wd, H * 0.04 * tr.z);
      }
    } else { // métaphysique : lueurs et signes qui pulsent
      for (const it of e.items) {
        const x = it.x, y = hz - H * (0.05 + 0.5 * it.y), a = (0.35 + 0.5 * Math.sin(ph * 1.5 + it.p)) * beat, R = H * 0.03 * tr.z * (1 + it.w);
        const gl = g.createRadialGradient(x, y, 0, x, y, R * 2.5); gl.addColorStop(0, col(0.7 * Math.max(0, a), 0.75)); gl.addColorStop(1, col(0)); g.fillStyle = gl; g.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
        g.strokeStyle = col(Math.max(0, a), 0.8); g.lineWidth = 1; g.beginPath(); it.pts.forEach((q, k) => { const px = x + (k - 2) * R * 0.5, py = y + q * R * 1.6; k ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
      }
    }
  }
}

// ---- un dessin propre pour les blocs les plus écrits, au lieu des dômes et des tiges de repli ----
/* un point du sol, en profondeur : z de 1,4 (près) à 7 (loin) ; k = l'échelle */
const gpt = (m, it, zNear = 1.4, zFar = 7) => { const z = zNear + it.y * (zFar - zNear), y = m.hz + (m.H - m.hz) / z; return { x: it.x, y, k: 2.4 / z, z }; };
const byDepth = (m, e, zn, zf) => e.items.map((it) => ({ it, ...gpt(m, it, zn, zf) })).sort((a, b) => b.z - a.z);
const shadeOf = (m, c, f) => mixc(c, m.pal.ground, f);
const seaHere = (m) => m.S.water && m.S.waterGround !== false && !m.S.ice;
/** une bête de terre ne marche que sur la terre : sur la rive s'il y en a une, nulle part sur une mer sans rive. */
const onLand = (m, P) => !seaHere(m) || (!!m.shore && m.shore.land && m.shore.land.length > 2 && inPoly(m.shore.land, P.x, P.y));
function boulder(g, m, P, w, h, col, pts) { g.fillStyle = css(col); g.beginPath(); const n = 9; for (let k = 0; k <= n; k++) { const a = Math.PI + (k / n) * Math.PI, r = 0.8 + 0.35 * (pts[k % 5] + 0.5), x = P.x + Math.cos(a) * w * r, y = P.y + Math.sin(a) * h * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill(); }
const ART = {
  stone: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e)) { const w = 14 * P.k * P.it.w, h = 9 * P.k * (0.7 + P.it.w * 0.5), c = shadeOf(m, mixc(m.pal.rock, [150, 150, 145], 0.35), Math.min(0.5, P.z / 14)); boulder(g, m, P, w, h, c, P.it.pts); g.fillStyle = css([230, 230, 225], 0.18); g.beginPath(); g.ellipse(P.x - w * 0.25, P.y - h * 0.75, w * 0.35, h * 0.18, -0.2, 0, TAU); g.fill(); } } },
  iron: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e)) { const w = 12 * P.k * P.it.w, h = 10 * P.k, c = shadeOf(m, [34, 30, 32], Math.min(0.5, P.z / 14)); boulder(g, m, P, w, h, c, P.it.pts); g.strokeStyle = css([170, 80, 35], 0.75); g.lineWidth = Math.max(0.6, P.k * 1.2); g.beginPath(); g.moveTo(P.x - w * 0.3, P.y - h * 0.8); g.lineTo(P.x - w * 0.2, P.y - h * 0.2); g.moveTo(P.x + w * 0.2, P.y - h * 0.7); g.lineTo(P.x + w * 0.3, P.y); g.stroke(); } } },
  crystal: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e)) { for (let j = 0; j < 4; j++) { const a = (P.it.pts[j] * 0.9), h = (16 + 14 * (P.it.pts[j + 1] + 0.5)) * P.k, w = 3.2 * P.k, x = P.x + (j - 1.5) * w * 1.3; g.save(); g.translate(x, P.y); g.rotate(a * 0.6); g.fillStyle = css(hsl(190 + 40 * P.it.w, 0.45, 0.72), 0.75); g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w * 0.8, -h * 0.8); g.lineTo(0, -h); g.lineTo(w * 0.8, -h * 0.8); g.lineTo(w, 0); g.closePath(); g.fill(); g.fillStyle = css([255, 255, 255], 0.35 + 0.3 * Math.sin(TAU * t * 2 + P.it.p + j)); g.fillRect(-w * 0.15, -h * 0.85, w * 0.3, h * 0.6); g.restore(); } } } },
  salt: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e)) { const w = 5 * P.k, h = (14 + 10 * P.it.w) * P.k; g.fillStyle = css(mixc([238, 236, 228], m.pal.ground, 0.2)); g.beginPath(); g.moveTo(P.x - w, P.y); g.quadraticCurveTo(P.x - w * 0.9, P.y - h * 0.6, P.x - w * 0.3, P.y - h); g.lineTo(P.x + w * 0.4, P.y - h * 0.92); g.quadraticCurveTo(P.x + w, P.y - h * 0.5, P.x + w * 1.1, P.y); g.closePath(); g.fill(); g.fillStyle = css([0, 0, 0], 0.12); g.fillRect(P.x + w * 0.2, P.y - h * 0.9, w * 0.8, h * 0.9); } } }, /* cheminées de sel */
  ash: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e)) { const w = 22 * P.k, h = 4 * P.k; g.fillStyle = css([118, 116, 114], 0.7); g.beginPath(); g.ellipse(P.x, P.y, w, h, 0, Math.PI, TAU); g.fill(); } } },
  fern: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.2, 4)) { const sw = Math.sin(TAU * t + P.it.p) * 1.2; for (let f = 0; f < 5; f++) { const a = -Math.PI / 2 + (f - 2) * 0.42, L = (16 + 6 * P.it.w) * P.k; g.strokeStyle = css(hsl(110 + 20 * P.it.w, 0.35, 0.22)); g.lineWidth = Math.max(0.5, P.k * 0.8); g.beginPath(); g.moveTo(P.x, P.y); const ex = P.x + Math.cos(a) * L + sw, ey = P.y + Math.sin(a) * L * 0.9; g.quadraticCurveTo(P.x + Math.cos(a) * L * 0.4, P.y - L * 0.7, ex, ey); g.stroke(); for (let l = 1; l < 7; l++) { const u = l / 7, lx = P.x + (ex - P.x) * u, ly = P.y + (ey - P.y) * u - Math.sin(u * Math.PI) * L * 0.25; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - 2.6 * P.k * (1 - u), ly + 1.6 * P.k); g.moveTo(lx, ly); g.lineTo(lx + 2.6 * P.k * (1 - u), ly + 1.6 * P.k); g.stroke(); } } } } },
  vine: { layer: "air", draw(g, m, t, e) { const { W, H } = m, side = e.items[0].x < W / 2 ? 0 : W; for (const [i, it] of e.items.slice(0, 4).entries()) { const x0 = side ? W - 6 - i * 9 : 6 + i * 9, L = H * (0.25 + 0.3 * it.w), sw = Math.sin(TAU * t * 0.5 + it.p) * 3; g.strokeStyle = css(hsl(100, 0.3, 0.14)); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + 8, L * 0.3, x0 - 8 + sw, L * 0.6, x0 + sw, L); g.stroke(); for (let l = 1; l < 9; l++) { const u = l / 9, y = L * u, x = x0 + Math.sin(u * 6 + it.p) * 5 + sw * u; g.fillStyle = css(hsl(105, 0.35, 0.18)); g.beginPath(); g.ellipse(x + (l % 2 ? 3 : -3), y, 2.6, 1.4, l % 2 ? 0.5 : -0.5, 0, TAU); g.fill(); } } } }, /* lianes qui pendent d'un bord */
  seed: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) { const h = 6 * P.k; g.strokeStyle = css(hsl(95, 0.45, 0.35)); g.lineWidth = Math.max(0.5, P.k * 0.7); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y - h); g.stroke(); g.fillStyle = css(hsl(95, 0.5, 0.4)); g.beginPath(); g.ellipse(P.x - 1.6 * P.k, P.y - h, 1.8 * P.k, 0.9 * P.k, -0.5, 0, TAU); g.ellipse(P.x + 1.6 * P.k, P.y - h, 1.8 * P.k, 0.9 * P.k, 0.5, 0, TAU); g.fill(); } } }, /* pousses */
  mycelium: { layer: "ground", draw(g, m, t, e) { g.strokeStyle = css([235, 232, 220], 0.35); g.lineWidth = 0.6; for (const P of byDepth(m, e, 1.2, 3)) { let x = P.x, y = P.y; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += (P.it.pts[k % 5] + Math.sin(k)) * 6 * P.k; y += (Math.cos(k * 1.7 + P.it.p)) * 1.5 * P.k; g.lineTo(x, y); } g.stroke(); } } }, /* fils blancs au ras du sol */
  thorn_bush: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) { g.strokeStyle = css(mixc([30, 22, 20], m.pal.ground, 0.2)); g.lineWidth = Math.max(0.6, P.k * 1.1); for (let b = 0; b < 11; b++) { const a = -Math.PI * (0.1 + 0.8 * ((b + P.it.pts[b % 5] + 0.5) / 11)), L = (20 + 8 * P.it.w) * P.k * (0.6 + 0.4 * Math.sin(b * 2.3)); const ex = P.x + Math.cos(a) * L, ey = P.y + Math.sin(a) * L; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(ex, ey); g.stroke(); g.beginPath(); g.moveTo(P.x + (ex - P.x) * 0.6, P.y + (ey - P.y) * 0.6); g.lineTo(P.x + (ex - P.x) * 0.6 + 2.5 * P.k, P.y + (ey - P.y) * 0.6 - 1.5 * P.k); g.stroke(); } } } },
  berry_shrub: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) { const R = (13 + 5 * P.it.w) * P.k; g.fillStyle = css(hsl(120, 0.3, 0.17)); for (let b = 0; b < 4; b++) { g.beginPath(); g.arc(P.x + (b - 1.5) * R * 0.5, P.y - R * (0.6 + 0.25 * (b % 2)), R * 0.62, 0, TAU); g.fill(); } g.fillStyle = css([190, 40, 60]); for (let b = 0; b < 7; b++) { g.beginPath(); g.arc(P.x + (P.it.pts[b % 5] * 1.6) * R, P.y - R * (0.4 + 0.5 * ((b * 37) % 10) / 10), Math.max(0.7, 1.1 * P.k), 0, TAU); g.fill(); } } } },
  heath_shrub: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 5)) { const w = 26 * P.k, h = 8 * P.k; g.fillStyle = css(hsl(300, 0.25, 0.26)); g.beginPath(); g.ellipse(P.x, P.y, w, h, 0, Math.PI, TAU); g.fill(); g.fillStyle = css(hsl(310, 0.35, 0.45), 0.8); for (let b = 0; b < 10; b++) g.fillRect(P.x + (b / 10 - 0.5) * w * 1.7, P.y - h * (0.4 + 0.5 * ((b * 7) % 5) / 5), Math.max(0.8, P.k), Math.max(0.8, P.k)); } } }, /* bruyère */
  grazer: { layer: "ground", draw(g, m, t, e) { const sev = (m.S.tense || {})[e.id] || 0; if (sev) return famished(g, m, t, e, sev); for (const P of byDepth(m, e, 1.8, 5).filter((P) => onLand(m, P))) { const s = 17 * P.k, dir = P.it.pts[0] < 0 ? -1 : 1, head = Math.sin(TAU * t * 0.3 + P.it.p) > 0.2; g.fillStyle = css(mixc([28, 24, 22], m.pal.ground, 0.25)); g.beginPath(); g.ellipse(P.x, P.y - s * 0.75, s * 0.75, s * 0.33, 0, 0, TAU); g.fill(); for (const lx of [-0.5, -0.3, 0.35, 0.55]) g.fillRect(P.x + lx * s, P.y - s * 0.6, Math.max(0.6, s * 0.08), s * 0.6); g.beginPath(); g.moveTo(P.x + dir * s * 0.6, P.y - s * 0.85); g.lineTo(P.x + dir * s * 1.05, head ? P.y - s * 0.15 : P.y - s * 1.2); g.lineWidth = Math.max(0.8, s * 0.16); g.strokeStyle = g.fillStyle; g.stroke(); g.beginPath(); g.ellipse(P.x + dir * s * 1.1, head ? P.y - s * 0.12 : P.y - s * 1.25, s * 0.18, s * 0.12, 0, 0, TAU); g.fill(); } } }, /* bêtes qui paissent, tête basse ou levée */
  burrower: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.4, 6).filter((P) => onLand(m, P))) { const w = 7 * P.k, h = 3.5 * P.k; g.fillStyle = css(mixc([70, 52, 36], m.pal.ground, 0.3)); g.beginPath(); g.ellipse(P.x, P.y, w, h, 0, Math.PI, TAU); g.fill(); g.fillStyle = css([0, 0, 0], 0.7); g.beginPath(); g.ellipse(P.x + w * 0.3, P.y - h * 0.15, w * 0.22, h * 0.3, 0, 0, TAU); g.fill(); } } }, /* terriers */
  spore: { layer: "air", draw(g, m, t, e) { const { W, H, hz } = m; for (const it of e.items) for (let k = 0; k < 5; k++) { const x = (it.x + k * 37 + Math.sin(TAU * (t * 0.3 + it.p + k)) * 12) % W, y = hz - ((frac(t * 0.08 + it.y + k * 0.21)) * H * 0.55); g.fillStyle = css([235, 235, 210], 0.35); g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); g.fillStyle = css([235, 235, 210], 0.08); g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); } } }, /* poussière vivante qui monte */
  drifter: { layer: "air", draw(g, m, t, e) { const { W, H, hz } = m; for (const it of e.items) { const x = frac(it.x / W + t * 0.02) * W, y = hz - H * (0.15 + 0.35 * it.y) + Math.sin(TAU * t * 0.4 + it.p) * 4, r = 4 + 3 * it.w; g.fillStyle = css(hsl(200 + 60 * it.w, 0.5, 0.8), 0.35); g.beginPath(); g.arc(x, y, r, Math.PI, TAU); g.closePath(); g.fill(); g.strokeStyle = css(hsl(200 + 60 * it.w, 0.5, 0.85), 0.3); g.lineWidth = 0.6; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * r * 0.5, y); g.quadraticCurveTo(x + k * r * 0.6 + Math.sin(TAU * t + k) * 2, y + r, x + k * r * 0.4, y + r * 2.2); g.stroke(); } } } }, /* flotteurs translucides */
  raptor: { layer: "sky", draw(g, m, t, e) { const sev = (m.S.tense || {})[e.id] || 0; if (sev) return famishedRaptor(g, m, t, e, sev); const { W, H } = m, it = e.items[0], a = TAU * (t * 0.25 + it.p), cx = W * (0.25 + 0.5 * it.x / W), cy = H * (0.18 + 0.12 * it.y), x = cx + Math.cos(a) * W * 0.12, y = cy + Math.sin(a) * H * 0.04, s = 6 + 2 * it.w, f = Math.sin(TAU * t * 3) * 0.3; g.strokeStyle = css([20, 18, 22], 0.85); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - s, y - s * (0.25 + f)); g.quadraticCurveTo(x - s * 0.4, y - s * 0.1, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.1, x + s, y - s * (0.25 + f)); g.stroke(); } }, /* un rapace qui tourne */
  shoal: { layer: "ground", draw(g, m, t, e) { if (!seaHere(m)) return; for (const P of byDepth(m, e, 1.5, 5)) for (let k = 0; k < 6; k++) { const x = P.x + Math.sin(TAU * t * 0.5 + k + P.it.p) * 10 * P.k + k * 3 * P.k, y = P.y + Math.cos(k * 1.3) * 2 * P.k; g.fillStyle = css([220, 230, 240], 0.25 + 0.35 * Math.max(0, Math.sin(TAU * t * 2 + k + P.it.p))); g.fillRect(x, y, 2.2 * P.k, 0.8 * P.k); } } }, /* éclairs d'argent sous l'eau */
  deep_hunter: { layer: "ground", draw(g, m, t, e) { if (!seaHere(m)) return; const P = byDepth(m, e, 1.6, 4)[0], x = P.x + ((t * 0.05) % 1) * 40 * P.k, s = 7 * P.k; g.fillStyle = css([18, 22, 28], 0.9); g.beginPath(); g.moveTo(x - s, P.y); g.quadraticCurveTo(x - s * 0.2, P.y - s * 1.4, x + s * 0.4, P.y - s * 1.2); g.lineTo(x + s * 0.3, P.y); g.closePath(); g.fill(); g.strokeStyle = css([210, 225, 235], 0.3); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x - s * 1.6, P.y + 0.5); g.lineTo(x + s, P.y + 0.5); g.stroke(); } }, /* un aileron fend l'eau */
  pellet: { layer: "ground", draw() {} }, carrion_beetle: { layer: "ground", draw() {} }, /* enfouis, trop petits : rien à voir */
};
/* ce qui ne se voit pas d'une fenêtre (sous le sol, dans l'air, à l'échelle du monde) ; les sols sont dits par la couleur du sol */
for (const id of ["crystal_tree", "clay", "chalk", "basalt", "granite", "fired_clay", "karst", "basalt_columns", "dead_core", "thin_air", "thick_air", "soil_bacteria", "humus", "earth", "peat", "silt"]) ART[id] = { layer: "ground", draw() {} }; /* dead_core : son signe est l'absence d'aurores ; l'air : déjà dit par le ciel (physique) */
const SIGNS = new Set(["molten_core", "subsurface_ocean", "pressure"]), GAUNT = new Set(["grazer", "herd", "raptor"]); /* ces bêtes ont un dessin famélique : on les pâlit moins */
/** (loi 4) une bête que la physique refuse (sans proies, sans plantes, hors climat, trop tôt) : famélique. Échine et hanches saillantes, côtes, cou tombant, pattes grêles ; si le refus est fort, une bête couchée et un squelette. */
function famished(g, m, t, e, sev) {
  const bone = mixc([196, 184, 160], m.pal.ground, 0.3), hide = mixc(mixc([28, 24, 22], [92, 84, 72], 0.5 * sev), m.pal.ground, 0.25), spots = byDepth(m, e, 1.2, 2.6).filter((P) => onLand(m, P)); /* plus près que les bêtes saines : la faute se voit (loi 4) */
  spots.forEach((P, n) => { const s = 17 * P.k, dir = P.it.pts[0] < 0 ? -1 : 1, lw = Math.max(0.5, s * 0.05);
    if (sev > 0.7 && n === spots.length - 1) { /* le squelette : un arc de côtes dans l'herbe, un crâne */
      g.strokeStyle = css(bone, 0.85); g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(P.x - s * 0.7, P.y - s * 0.12); g.lineTo(P.x + s * 0.6, P.y - s * 0.1); g.stroke();
      for (let k = 0; k < 6; k++) { const x = P.x - s * 0.5 + k * s * 0.2; g.beginPath(); g.moveTo(x, P.y - s * 0.12); g.bezierCurveTo(x - s * 0.12, P.y - s * 0.45, x + s * 0.2, P.y - s * 0.5, x + s * 0.12, P.y - s * 0.02); g.stroke(); } /* des côtes en arceaux */
      g.fillStyle = css(bone, 0.9); g.beginPath(); g.ellipse(P.x + dir * s * 0.85, P.y - s * 0.08, s * 0.16, s * 0.09, dir * 0.3, 0, TAU); g.fill(); return; }
    if (sev > 0.5 && n === 0 && spots.length > 1) { /* une bête couchée, la tête au sol */
      g.fillStyle = css(hide); g.beginPath(); g.ellipse(P.x, P.y - s * 0.18, s * 0.72, s * 0.2, 0, 0, TAU); g.fill();
      g.strokeStyle = css(hide); g.lineWidth = Math.max(0.7, s * 0.1); g.beginPath(); g.moveTo(P.x + dir * s * 0.6, P.y - s * 0.25); g.lineTo(P.x + dir * s * 1.05, P.y - s * 0.04); g.stroke();
      g.strokeStyle = css(bone, 0.7); g.lineWidth = lw; for (let k = 0; k < 4; k++) { const x = P.x - s * 0.25 + k * s * 0.16; g.beginPath(); g.moveTo(x, P.y - s * 0.32); g.lineTo(x + s * 0.03, P.y - s * 0.08); g.stroke(); } return; }
    const ry = s * (0.3 - 0.12 * sev), by = P.y - s * 0.8, sway = Math.sin(TAU * t * 0.15 + P.it.p) * s * 0.03; /* lent : il ne paît plus, il tient debout */
    g.fillStyle = css(hide); g.beginPath(); g.moveTo(P.x - s * 0.75, by); g.quadraticCurveTo(P.x - s * 0.6, by - ry * 1.5, P.x - s * 0.45, by - ry * 1.1); /* la hanche */ g.quadraticCurveTo(P.x, by - ry * 0.7, P.x + s * 0.45, by - ry * 1.2); /* l'échine creusée, le garrot */ g.quadraticCurveTo(P.x + s * 0.75, by - ry * 0.6, P.x + s * 0.72, by); g.quadraticCurveTo(P.x, by + ry * 0.5, P.x - s * 0.75, by); /* le ventre rentré */ g.closePath(); g.fill();
    g.fillRect(P.x - 0.52 * s, by, Math.max(0.5, s * 0.05), P.y - by); g.fillRect(P.x - 0.33 * s, by, Math.max(0.5, s * 0.05), P.y - by); g.fillRect(P.x + 0.36 * s, by, Math.max(0.5, s * 0.05), P.y - by); g.fillRect(P.x + 0.55 * s, by, Math.max(0.5, s * 0.05), P.y - by); /* pattes grêles */
    g.strokeStyle = css(bone, 0.55 + 0.3 * sev); g.lineWidth = lw; for (let k = 0; k < 4 + Math.round(2 * sev); k++) { const x = P.x - s * 0.22 + k * s * 0.11; g.beginPath(); g.moveTo(x, by - ry * 0.75); g.quadraticCurveTo(x + s * 0.05, by - ry * 0.1, x + s * 0.02, by + ry * 0.3); g.stroke(); } /* les côtes */
    g.fillStyle = css(bone, 0.7); g.beginPath(); g.arc(P.x - s * 0.45, by - ry * 1.15, Math.max(0.6, s * 0.06), 0, TAU); g.fill(); /* l'os de la hanche */
    const nx = P.x + dir * s * 0.65, ny = by - ry * 0.6, hx = P.x + dir * s * 1.08 + sway, hy = P.y - s * 0.3; g.strokeStyle = css(hide); g.lineWidth = Math.max(0.7, s * 0.1); g.beginPath(); g.moveTo(nx, ny); g.quadraticCurveTo(nx + dir * s * 0.3, ny - s * 0.05, hx, hy); g.stroke(); /* le cou qui tombe */
    g.fillStyle = css(hide); g.beginPath(); g.ellipse(hx, hy + s * 0.04, s * 0.15, s * 0.09, dir * 0.9, 0, TAU); g.fill();
  });
}
function famishedRaptor(g, m, t, e, sev) { /* un rapace épuisé : il plane bas, lentement, les ailes trouées de rémiges perdues */
  const { W, H } = m, it = e.items[0], a = TAU * (t * 0.12 + it.p), cx = W * (0.25 + 0.5 * it.x / W), cy = H * (0.22 + 0.12 * it.y), x = cx + Math.cos(a) * W * 0.12, y = cy + Math.sin(a) * H * 0.04 + Math.sin(TAU * t * 0.7) * 2 /* il tourne encore, plus lentement, en perdant de l'altitude par à-coups */, s = 6 + 2 * it.w;
  g.strokeStyle = css([20, 18, 22], 0.85); g.lineWidth = 1.2;
  for (const d of [-1, 1]) { const tip = x + d * s, ty = y - s * 0.08; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + d * s * 0.35, y - s * 0.05, x + d * s * 0.55, y - s * 0.02); g.stroke(); /* l'aile, puis un trou */ g.beginPath(); g.moveTo(x + d * s * (0.68 + 0.08 * sev), y - s * 0.04); g.lineTo(tip, ty); g.stroke(); g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + d * s * 0.5, y); g.lineTo(x + d * s * 0.52, y + s * 0.18); g.stroke(); g.lineWidth = 1.2; }
}
const glowAt = (g, x, y, r, col, a) => { const gl = g.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, css(col, a)); gl.addColorStop(1, css(col, 0)); g.fillStyle = gl; g.fillRect(x - r, y - r, r * 2, r * 2); };
const caps = (g, P, n, R, col, glow, t) => { for (let k = 0; k < n; k++) { const x = P.x + (k - n / 2) * R * 1.1 + P.it.pts[k % 5] * R, h = R * (1.2 + (k % 3) * 0.5), r = R * (0.7 + 0.3 * ((k * 7) % 3) / 3); g.fillStyle = css(mixc(col, [0, 0, 0], 0.4)); g.fillRect(x - r * 0.15, P.y - h, r * 0.3, h); g.fillStyle = css(col); g.beginPath(); g.ellipse(x, P.y - h, r, r * 0.55, 0, Math.PI, TAU); g.fill(); if (glow) glowAt(g, x, P.y - h, r * 3, col, 0.25 + 0.15 * Math.sin(TAU * t + k)); } };
Object.assign(ART, {
  crystal_flower: { layer: "ground", draw(g, m, t, e) { /* rares, en bouquets : un ou deux par fenêtre, cinq à sept fleurs serrées de hauteurs différentes, une lueur commune ; la teinte suit la graine de l'Âge */
    const SC = require("./relto-scarabs"), ct = crystalToneOf(m.S), q = rng((m.S.seed ^ 0xb0c7) >>> 0), nb = q() < 0.35 ? 2 : 1, spots = byDepth(m, e, 1.25, 2.4).slice(0, nb);
    for (const P of spots) { const n = 5 + Math.floor(q() * 3), base = P.y + 2 * P.k, bx = Math.max(m.W * 0.12, Math.min(m.W * 0.88, P.x)), list = [];
      for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 7 * P.k + (q() - 0.5) * 5 * P.k, sc = 0.62 * P.k * (0.7 + 0.6 * q()); list.push({ x: bx + off, s: sc, lean: off * 0.35 }); }
      glowAt(g, bx, base - 18 * P.k, 26 * P.k, hsl(ct.hue + ct.spread * 0.5, ct.fsat, 0.6), 0.16 + 0.08 * Math.sin(TAU * t * 0.6));
      list.sort((a, b) => b.s - a.s);
      for (const f of list) { g.save(); g.translate(f.x, base); g.rotate(f.lean * 0.012); SC.crystalFlower(g, 0, 0, f.s, t * TAU + f.x, ct); g.restore(); }
      g.fillStyle = css(hsl(ct.hue + 150, 0.35, 0.3)); for (let k = 0; k < 6; k++) { const lx = bx + (q() - 0.5) * 30 * P.k; g.beginPath(); g.moveTo(lx, base); g.lineTo(lx + (q() - 0.5) * 8 * P.k, base - 7 * P.k); g.lineTo(lx + 2 * P.k, base); g.closePath(); g.fill(); } /* les feuilles au pied du bouquet */
    } } },
  /* les signes de ce qui ne se voit pas */
  molten_core: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.25, 3.5).slice(0, 3)) { glowAt(g, P.x, P.y, 22 * P.k, [255, 110, 50], 0.3 + 0.1 * Math.sin(TAU * t + P.it.p)); g.fillStyle = css([30, 14, 10], 0.95); g.beginPath(); g.ellipse(P.x, P.y, 8 * P.k, 2.2 * P.k, 0, 0, TAU); g.fill(); g.fillStyle = css([255, 140, 60], 0.8); g.beginPath(); g.ellipse(P.x, P.y, 4 * P.k, 0.9 * P.k, 0, 0, TAU); g.fill(); for (let k = 0; k < 10; k++) { const u = frac(t * 0.6 + k / 10 + P.it.p), r = (2.5 + 11 * u) * P.k; g.fillStyle = css([236, 234, 228], 0.5 * (1 - u)); g.beginPath(); g.arc(P.x + Math.sin(TAU * u + k) * 5 * P.k * u, P.y - u * 55 * P.k, r, 0, TAU); g.fill(); } } } }, /* fumerolles : la chaleur d'en dessous */
  subsurface_ocean: { layer: "ground", draw(g, m, t, e) { if (!(m.S.ice || m.S.world === "frozen")) return; for (const P of byDepth(m, e, 1.2, 3)) { g.strokeStyle = css([60, 150, 220], 0.9); g.lineWidth = Math.max(1, 1.8 * P.k); let x = P.x - 20 * P.k, y = P.y; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 9 * P.k; y += P.it.pts[k % 5] * 4 * P.k; g.lineTo(x, y); } g.stroke(); glowAt(g, P.x, P.y, 14 * P.k, [80, 170, 240], 0.25); } const P = byDepth(m, e, 1.6, 3)[0], hh = (0.75 + 0.25 * Math.sin(TAU * t * 0.3 + P.it.p)) * 85 * P.k; for (let k = 0; k < 12; k++) { const u = k / 11; g.fillStyle = css([70, 100, 130], 0.25 * (1 - u)); g.beginPath(); g.arc(P.x + Math.sin(k * 1.3) * 3 * u * P.k + 1.5, P.y - hh * u + 1.5, (3 + 10 * u) * P.k, 0, TAU); g.fill(); } for (let k = 0; k < 12; k++) { const u = k / 11; g.fillStyle = css([248, 252, 255], 0.85 * (1 - u * 0.8)); g.beginPath(); g.arc(P.x + Math.sin(k * 1.3) * 3 * u * P.k, P.y - hh * u, (2.5 + 10 * u) * P.k, 0, TAU); g.fill(); } g.strokeStyle = css([120, 170, 210], 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y - hh * 0.6); g.stroke(); } }, /* fentes bleues et panache de glace : l'océan caché respire */
  pressure: { layer: "ground", draw(g, m, t, e) { const P = byDepth(m, e, 1.3, 2.2)[0], w = 46 * P.k, h = 30 * P.k, dir = P.it.pts[0] < 0 ? -1 : 1; g.save(); g.beginPath(); g.moveTo(P.x - w, P.y + 1); g.lineTo(P.x - w * 0.75, P.y - h * 0.7); g.lineTo(P.x + w * 0.15 * dir, P.y - h); g.lineTo(P.x + w * 0.8, P.y - h * 0.55); g.lineTo(P.x + w, P.y + 1); g.closePath(); g.fillStyle = css([70, 62, 56]); g.fill(); g.clip(); const band = [[176, 150, 112], [92, 82, 76], [150, 118, 88], [60, 54, 52], [196, 176, 140]]; for (let k = 0; k < 10; k++) { g.strokeStyle = css(band[k % 5], 0.9); g.lineWidth = 3.4 * P.k; g.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, xx = P.x - w + u * 2 * w, yy = P.y + 2 - k * h * 0.12 - Math.sin(u * Math.PI * 1.3 * dir + 0.5) * h * 0.4; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } g.restore(); } }, /* des strates pliées : la pression lente */
  mushroom: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) caps(g, P, 4, 3.6 * P.k, [150, 110, 80], false, t); } },
  pale_fungus: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) caps(g, P, 5, 2.4 * P.k, [225, 222, 210], false, t); } },
  strange_stone: { layer: "ground", draw(g, m, t, e) { const P = byDepth(m, e, 1.6, 3)[0], w = 7 * P.k, h = 26 * P.k, beat = 0.5 + 0.5 * Math.sin(TAU * t * 0.7); glowAt(g, P.x, P.y - h * 0.6, h * 0.9, [255, 150, 90], 0.12 + 0.12 * beat); g.fillStyle = css([40, 32, 34]); g.beginPath(); g.moveTo(P.x - w, P.y + 1); g.lineTo(P.x - w * 0.8, P.y - h * 0.8); g.quadraticCurveTo(P.x - w * 0.1, P.y - h * 1.08, P.x + w * 0.7, P.y - h * 0.86); g.lineTo(P.x + w, P.y + 1); g.closePath(); g.fill(); g.strokeStyle = css([255, 160, 100], 0.25 + 0.3 * beat); g.lineWidth = 0.8; g.beginPath(); g.moveTo(P.x - w * 0.2, P.y - h * 0.7); g.lineTo(P.x + w * 0.1, P.y - h * 0.45); g.lineTo(P.x - w * 0.1, P.y - h * 0.25); g.stroke(); } }, /* une pierre dressée, tiède, qui écoute */
  geysers: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.6, 6).slice(0, 3)) { const ph = frac(t * 0.35 + P.it.p / TAU), on = ph < 0.45, h = (on ? Math.sin((ph / 0.45) * Math.PI) : 0.12) * 50 * P.k; g.fillStyle = css([90, 80, 70], 0.8); g.beginPath(); g.ellipse(P.x, P.y, 6 * P.k, 2 * P.k, 0, 0, TAU); g.fill(); for (let k = 0; k < 7; k++) { const u = k / 6, r = (3 + 9 * u) * P.k; g.fillStyle = css([235, 238, 240], (0.45 - 0.35 * u) * (on ? 1 : 0.4)); g.beginPath(); g.arc(P.x + Math.sin(k + t) * 2 * u * P.k, P.y - h * u, r * (on ? 1 : 0.6), 0, TAU); g.fill(); } } } }, /* jets de vapeur, par intermittence */
  cave_stalker: { layer: "ground", draw(g, m, t, e) { const P = byDepth(m, e, 1.5, 3).filter((P) => onLand(m, P))[0]; if (!P) return; const o = Math.sin(TAU * t * 0.5 + P.it.p); if (o < -0.6) return; const s = 2.2 * P.k; g.fillStyle = css([220, 235, 230], 0.8); g.fillRect(P.x - s * 2, P.y - s * 3, s, s * 0.6); g.fillRect(P.x + s, P.y - s * 3, s, s * 0.6); } }, /* deux yeux pâles, au ras du sol */
  glow_algae: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.4, 5)) { glowAt(g, P.x, P.y, 16 * P.k, [110, 255, 170], 0.22 + 0.1 * Math.sin(TAU * t + P.it.p)); g.fillStyle = css([90, 220, 150], 0.5); g.beginPath(); g.ellipse(P.x, P.y, 10 * P.k, 2.5 * P.k, 0, 0, TAU); g.fill(); } } },
  plankton: { layer: "ground", draw(g, m, t, e) { if (!seaHere(m) && !m.S.river) return; for (const P of byDepth(m, e, 1.3, 6)) for (let k = 0; k < 8; k++) { g.fillStyle = css([140, 200, 255], 0.25 + 0.35 * Math.max(0, Math.sin(TAU * t * 1.5 + k * 1.7 + P.it.p))); g.fillRect(P.x + (k - 4) * 4 * P.k, P.y + Math.sin(k * 2.1) * 2 * P.k, 1.2, 1.2); } } }, /* la mer qui pétille */
  rust: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 6)) { g.fillStyle = css([150, 70, 35], 0.55); g.beginPath(); g.ellipse(P.x, P.y, 16 * P.k, 3 * P.k, 0, 0, TAU); g.fill(); g.fillStyle = css([190, 95, 45], 0.45); g.beginPath(); g.ellipse(P.x + 4 * P.k, P.y - 0.5, 7 * P.k, 1.4 * P.k, 0, 0, TAU); g.fill(); } } },
  bee: { layer: "air", draw(g, m, t, e) { const { hz, H } = m; for (const it of e.items) for (let k = 0; k < 3; k++) { const a = TAU * (t * 1.5 + it.p + k * 0.33), x = it.x + Math.cos(a) * 8 + Math.sin(a * 2.3) * 4, y = hz + H * (0.04 + 0.12 * it.y) + Math.sin(a * 1.7) * 4; g.fillStyle = css([255, 200, 60], 0.95); g.fillRect(x, y, 1.6, 1.2); } } }, /* des points d'or qui butinent */
  rifts: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.2, 3).slice(0, 2)) { let x = P.x, y = P.y; g.strokeStyle = css([12, 8, 10], 0.9); g.lineWidth = Math.max(1, 2.4 * P.k); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (14 + P.it.pts[k % 5] * 12) * P.k; y += (P.it.pts[(k + 2) % 5]) * 5 * P.k; g.lineTo(x, y); } g.stroke(); g.strokeStyle = css([255, 90, 40], 0.18 + 0.1 * Math.sin(TAU * t + P.it.p)); g.lineWidth = Math.max(0.5, 0.8 * P.k); g.stroke(); } } }, /* failles qui couvent */
  spiders: { layer: "air", draw(g, m, t, e) { const { W } = m, left = e.items[0].x < W / 2, cx = left ? 0 : W, cy = 0, R = 46 + 20 * e.items[0].w; g.strokeStyle = css([230, 230, 235], 0.35); g.lineWidth = 0.5; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (left ? 0 : Math.PI / 2) + (k / 6) * (Math.PI / 2); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } for (let r = 8; r < R; r += 7) { for (let k = 0; k <= 6; k++) { const a = (left ? 0 : Math.PI / 2) + (k / 6) * (Math.PI / 2), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } } g.stroke(); g.fillStyle = css([15, 12, 14]); g.beginPath(); g.arc(cx + (left ? 1 : -1) * R * 0.45, R * 0.4, 2.2, 0, TAU); g.fill(); } }, /* une toile dans un coin de la fenêtre */
  moss: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 5)) { g.fillStyle = css(hsl(95, 0.45, 0.24)); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(P.x + (k - 1.5) * 5 * P.k, P.y - 1.5 * P.k, 4.5 * P.k, 2.6 * P.k, 0, Math.PI, TAU); g.fill(); } } } },
  microbial_mat: { layer: "ground", draw(g, m, t, e) { const P = byDepth(m, e, 1.6, 4)[0]; for (const [k, c] of [[1, [200, 90, 40]], [0.75, [230, 170, 50]], [0.5, [120, 170, 70]], [0.28, [60, 140, 170]]]) { g.fillStyle = css(c, 0.75); g.beginPath(); g.ellipse(P.x, P.y, 28 * P.k * k, 5 * P.k * k, 0, 0, TAU); g.fill(); } } }, /* les anneaux de couleur d'une source chaude */
  book: { layer: "ground", draw(g, m, t, e) { const P = byDepth(m, e, 1.6, 3)[0], s = 9 * P.k; g.fillStyle = css([26, 22, 24]); g.fillRect(P.x - s * 0.12, P.y - s * 1.3, s * 0.24, s * 1.3); g.fillRect(P.x - s * 0.5, P.y - 1, s, 2); g.beginPath(); g.moveTo(P.x - s * 0.7, P.y - s * 1.35); g.lineTo(P.x + s * 0.7, P.y - s * 1.35); g.lineTo(P.x + s * 0.55, P.y - s * 1.55); g.lineTo(P.x - s * 0.55, P.y - s * 1.55); g.closePath(); g.fill(); g.fillStyle = css([236, 226, 200], 0.9); g.beginPath(); g.moveTo(P.x - s * 0.6, P.y - s * 1.55); g.quadraticCurveTo(P.x - s * 0.3, P.y - s * 1.75, P.x, P.y - s * 1.58); g.quadraticCurveTo(P.x + s * 0.3, P.y - s * 1.75, P.x + s * 0.6, P.y - s * 1.55); g.lineTo(P.x, P.y - s * 1.47); g.closePath(); g.fill(); } }, /* un livre ouvert sur son lutrin */
  blurred_book: { layer: "ground", draw(g, m, t, e) { ART.book.draw(g, m, t, e); const P = byDepth(m, e, 1.6, 3)[0]; g.fillStyle = css([80, 90, 110], 0.35); g.beginPath(); g.ellipse(P.x, P.y - 9 * P.k * 1.55, 6 * P.k, 2 * P.k, 0, 0, TAU); g.fill(); } },
  withered_fern: { layer: "ground", draw(g, m, t, e) { g.save(); g.filter = "sepia(1) saturate(1.6) brightness(0.8)"; ART.fern.draw(g, m, t, e); g.restore(); } },
  herd: { layer: "ground", draw(g, m, t, e) { const e2 = { ...e, items: [...e.items, ...e.items.map((it) => ({ ...it, x: it.x + 18, y: Math.min(1, it.y + 0.05), p: it.p + 1 }))] }; ART.grazer.draw(g, m, t, e2); } },
  sapling: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.5, 5)) { const h = 22 * P.k; g.strokeStyle = css([45, 35, 28]); g.lineWidth = Math.max(0.7, P.k); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y - h); g.stroke(); g.fillStyle = css(hsl(100, 0.45, 0.32)); g.beginPath(); g.ellipse(P.x, P.y - h, 5 * P.k, 7 * P.k, 0, 0, TAU); g.fill(); } } },
  humming_blooms: { layer: "ground", draw(g, m, t, e) { const sc = m.W / 560; for (const P of byDepth(m, e, 1.3, 4).filter((P) => onLand(m, P))) { const q = rng(((P.it.p * 1e6) | 0) ^ 0x6b1), k = P.k * sc, hue0 = q() * 360; /* ESSAI : une touffe de fleurs qui frémit (le bourdonnement), non une rangée de points */
      g.fillStyle = css(leafC(m.S, [58, 104, 48])); for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(P.x + (j - 1.5) * 3.2 * k, P.y - 1.2 * k, 3.4 * k, 1.3 * k, (j - 1.5) * 0.5, 0, TAU); g.fill(); } /* les feuilles au pied */
      for (let j = 0; j < 7; j++) { const dx = (q() - 0.5) * 14 * k, hh = (5 + q() * 6) * k, sway = Math.sin(TAU * (t * 2 + j * 0.3 + P.it.p)) * 0.8 * k, fx = P.x + dx + sway, fy = P.y - hh;
        g.strokeStyle = css(leafC(m.S, [70, 112, 52])); g.lineWidth = Math.max(0.6, 0.7 * k); g.beginPath(); g.moveTo(P.x + dx * 0.6, P.y - 0.5 * k); g.quadraticCurveTo(P.x + dx * 0.8, P.y - hh * 0.5, fx, fy); g.stroke();
        bloom(g, fx, fy, (2.4 + 1.2 * q()) * k, hsl(hue0 + (q() - 0.5) * 70, 0.68, 0.66), 0.95, q() * TAU); } }
      ART.bee.draw(g, m, t, e); } },
  cinderbloom: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 4)) for (let k = 0; k < 5; k++) { const x = P.x + (k - 2.5) * 5 * P.k, y = P.y - (4 + (k % 2) * 3) * P.k; g.strokeStyle = css([30, 20, 18]); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, P.y); g.lineTo(x, y); g.stroke(); glowAt(g, x, y, 4 * P.k, [255, 90, 40], 0.35); g.fillStyle = css([230, 60, 30]); g.beginPath(); g.arc(x, y, 1.8 * P.k, 0, TAU); g.fill(); } } },
  diamond: { layer: "ground", draw(g, m, t, e) { for (const P of byDepth(m, e, 1.3, 6)) { const a = Math.max(0, Math.sin(TAU * t * 2 + P.it.p)); g.strokeStyle = css([255, 255, 255], 0.3 + 0.6 * a); g.lineWidth = 0.8; const r = (2 + 4 * a) * P.k; g.beginPath(); g.moveTo(P.x - r, P.y - 2); g.lineTo(P.x + r, P.y - 2); g.moveTo(P.x, P.y - 2 - r); g.lineTo(P.x, P.y - 2 + r); g.stroke(); } } },
  charged_crystal: { layer: "ground", draw(g, m, t, e) { ART.crystal.draw(g, m, t, e); for (const P of byDepth(m, e)) glowAt(g, P.x, P.y - 12 * P.k, 20 * P.k, [140, 190, 255], 0.2 + 0.15 * Math.sin(TAU * t * 3 + P.it.p)); } },
  humming_shard: { layer: "ground", draw(g, m, t, e) { g.save(); g.translate(Math.sin(TAU * t * 9) * 0.5, 0); ART.crystal.draw(g, m, t, e); g.restore(); } },
  still_drifter: { layer: "air", draw(g, m, t, e) { ART.drifter.draw(g, m, 0, e); } },
  aeroplankton: { layer: "air", draw(g, m, t, e) { const { W, H, hz } = m; for (const it of e.items) for (let k = 0; k < 6; k++) { const x = (it.x + k * 41) % W, y = hz - H * (0.05 + 0.3 * frac(it.y + k * 0.17)); g.fillStyle = css([220, 240, 255], 0.2 + 0.4 * Math.max(0, Math.sin(TAU * t * 2 + k + it.p))); g.fillRect(x, y, 1, 1); } } },
});

module.exports = { buildFront, HOOKS, openingOf, doomOf, doomVeil, sceneOf, traits, KNOWN, WX_FLAGS, weatherLevels, build, paint, suns, PERIOD, hsl, seaSpot, blackbody, skyState, mixc, css, valueNoise, fbm };
