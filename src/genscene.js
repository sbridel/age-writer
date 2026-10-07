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
const WT = require("./wealth"), AM = require("./amounts");

const TAU = Math.PI * 2, PERIOD = 8000;

/** Identifiants que le peintre connaît (tout le reste passe par le peintre générique, d'après l'axe et les adjectifs du bloc). */
const KNOWN = new Set(("door sealed_door bridge fallen_bridge tablet worn_tablet speaking_tablet lamp lit_lamp twin_suns single_sun starless companion_moon frozen_cycle erratic_cycle chaotic_orbit " +
  "permanent_veil auroras recurring_eclipses starfall rain storm thunderstorm whispering_storm waiting_thunder wind dust_storm ash_cloud spore_cloud fog marsh_mist rime watching_mist lightning heat " +
  "hail black_hail steam lava obsidian whispering_obsidian water brine meltwater crying_obsidian ice black_ice deep_cold sand glass singing_glass fulgurite grove great_tree ironwood charred_grove " +
  "wildfire moth lantern_moths whispering_moths glowvine wrong_glowvine hunter stalking_pack no_fissure cave_fissure submarine_fissure fissure " + SKY.SKY_BLOCKS.map((b) => b.id).join(" ") + " " + WT.RICH_IDS.join(" ") + " " + WT.SCAR_IDS.join(" ")).split(" "));
const AXES = ["cosmological", "geological", "meteorological", "ecological", "metaphysical"];

function sceneOf(a, name = "", blocks = null) {
  const res = a && a.resolved; if (!res || !res.lines || !res.matter) return null;
  const ids = new Set();
  for (const l of res.lines) if (l.entry) ids.add(l.entry.id);
  for (const w of res.matter.written || []) ids.add(w);
  for (const x of res.matter.reactions || []) ids.add(x.result);
  const r = (...n) => n.some((x) => ids.has(x));
  const wd = r("frozen_world") ? "frozen" : r("lava_world") ? "lava" : r("desert_world") ? "desert" : r("ocean_world") ? "ocean" : r("jungle_world") ? "jungle" : null; // monde-type : impose son décor
  const ruins = [];
  if (r("door", "sealed_door")) ruins.push("door"); if (r("bridge", "fallen_bridge")) ruins.push("bridge");
  if (r("tablet", "worn_tablet", "speaking_tablet")) ruins.push("tablet"); if (r("lamp", "lit_lamp")) ruins.push("lamp");
  return {
    seed: fnv(name + "|" + [...ids].sort().join(",")), verdict: a.verdict, unrest: clamp(1 - (a.stability == null ? 100 : a.stability) / 100),
    suns: r("twin_suns") ? 2 : r("single_sun") ? 1 : 0, skyStated: r("twin_suns", "single_sun", "starless"), moon: r("companion_moon"),
    cycle: r("frozen_cycle") ? "frozen" : r("erratic_cycle") ? "erratic" : "steady", chaos: r("chaotic_orbit"), veil: r("permanent_veil"),
    auroras: r("auroras"), eclipses: r("recurring_eclipses"), starfall: r("starfall"),
    rain: r("rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder") || wd === "jungle", storm: r("storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
    wind: r("wind", "storm", "thunderstorm", "dust_storm", "ash_cloud", "spore_cloud", "whispering_storm", "waiting_thunder"),
    fog: r("fog", "marsh_mist", "rime", "watching_mist") || wd === "jungle", lightning: r("lightning", "thunderstorm", "waiting_thunder"), heat: r("heat") || wd === "lava" || wd === "desert",
    hail: r("hail", "black_hail"), steam: r("steam"), dust: r("dust_storm"), ash: r("ash_cloud", "ashen_sky") || wd === "lava",
    lava: r("lava", "obsidian", "whispering_obsidian") || wd === "lava", water: (r("water", "marsh_mist", "brine", "meltwater", "crying_obsidian") || wd === "ocean") && wd !== "lava" && wd !== "desert",
    ice: r("ice", "black_ice", "deep_cold", "hail", "rime") || wd === "frozen", sand: r("sand", "dust_storm", "glass", "singing_glass", "fulgurite") || wd === "desert",
    trees: r("barren_soil") ? 0 : r("grove") || wd === "jungle" ? 5 : r("great_tree", "ironwood", "charred_grove") ? 3 : 0, burnt: r("charred_grove", "wildfire", "scorched_surface"), fire: r("wildfire"),
    moths: r("moth", "lantern_moths", "whispering_moths"), glow: r("glowvine", "wrong_glowvine") || wd === "jungle", eyes: r("hunter", "stalking_pack"),
    ruins, lampLit: r("lit_lamp"), tabletAwake: r("speaking_tablet"),
    world: wd, riches: WT.RICH_IDS.filter((id) => ids.has(id)), scars: WT.SCAR_IDS.filter((id) => ids.has(id)), belt: r("asteroid_field") ? "field" : r("asteroid_belt") ? "belt" : null, rings: r("planet_rings"), comet: r("comet"), sunHues: SKY.sunColors([...ids]),
    extras: [...ids].filter((id) => !KNOWN.has(id) && !id.startsWith("?")).sort().slice(0, 8).map((id) => {
      const b = blocks && typeof blocks.get === "function" ? blocks.get(id) : null, ax = b && typeof b.axis === "string" ? b.axis.toLowerCase() : "";
      return { id, axis: AXES.find((x) => ax.startsWith(x.slice(0, 5))) || AXES[fnv(id) % 5], words: b && Array.isArray(b.descriptors) && b.descriptors.length ? b.descriptors.map(String) : id.split("_") };
    }),
    fissure: r("no_fissure") ? null : r("cave_fissure") ? "cave" : r("submarine_fissure", "fissure") ? (r("water") ? "submarine" : "open") : null,
  };
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
  const r = rng(S.seed ^ 0x9e3779b9), hz = H * 0.7, A = (k) => (S.amt && S.amt[k] != null ? S.amt[k] : 1), nA = (n, k, lo, hi) => Math.round(clamp(n * A(k), lo, hi)); // quantités : beaucoup / peu / normal
  const hue = r() * 360, sat = 0.28 + r() * 0.35, warm = 20 + r() * 40, cool = 190 + r() * 60;
  const skyHue = S.world === "jungle" ? 95 + r() * 40 : S.lava ? 8 + r() * 20 : S.sand ? 28 + r() * 16 : S.ice ? 200 + r() * 25 : hue;
  const pal = {
    nightTop: hsl(skyHue + 230, 0.45, 0.05), nightHz: hsl(skyHue + 240, 0.35, 0.12),
    dawnTop: hsl(skyHue + 250, 0.4, 0.2), dawnHz: hsl(warm, 0.65, 0.5),
    dayTop: hsl(S.skyStated || r() < 0.7 ? skyHue : cool, sat + 0.1, 0.38), dayHz: hsl(skyHue + (r() < 0.5 ? 25 : -25), sat * 0.7, 0.72),
    ground: S.lava ? hsl(8, 0.45, 0.07) : S.sand ? hsl(34, 0.35, 0.2) : S.ice ? hsl(205, 0.25, 0.2) : S.water ? hsl(skyHue + 170, 0.25, 0.1) : hsl(skyHue + 90, 0.25, 0.09),
    rock: hsl(skyHue + 200, 0.2, 0.07),
  };
  const nCount = S.sand ? 2 : S.ice ? 4 : 3 + Math.floor(r() * 2);
  const ridges = Array.from({ length: nCount }, (_, i) => {
    const d = i / Math.max(1, nCount - 1), n = valueNoise((r() * 4294967296) >>> 0), ridged = S.ice || (!S.sand && r() < 0.3);
    const amp = (S.sand ? 0.07 : 0.16 + r() * 0.12) * (1 - d * 0.35), freq = (S.sand ? 0.9 : 2.2 + r() * 2) * (1 + d * 0.5), base = hz - H * (0.05 + (1 - d) * 0.07);
    const xs = new Float32Array(Math.ceil(W / 4) + 1);
    for (let k = 0; k < xs.length; k++) {
      const u = k / (xs.length - 1); let v = fbm(n, u * freq * 3 + i * 5, S.ice ? 3 : 4);
      if (ridged) v = 1 - Math.abs(2 * v - 1);
      xs[k] = base - v * amp * H;
    }
    return { xs, d };
  });
  const cones = [];
  if (S.lava) for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) cones.push({ x: W * (0.15 + 0.7 * r()), h: H * (0.2 + 0.14 * r()), w: W * (0.12 + 0.08 * r()) });
  const stars = Array.from({ length: nA(S.skyStated && S.suns === 0 ? 90 : 44, "stars", 6, 240) }, () => ({ x: r() * W, y: r() * hz * 0.85, s: 0.6 + r() * 1.3, p: r() * TAU, k: 1 + Math.floor(r() * 3) }));
  const clouds = Array.from({ length: nA(S.storm ? 7 : S.rain ? 5 : 2 + Math.floor(r() * 3), "clouds", 1, 14) }, () => ({ x: r() * W, y: H * (0.08 + r() * 0.3), w: W * (0.2 + r() * 0.3), h: H * (0.04 + r() * 0.06), sp: 1 + Math.floor(r() * 2), a: 0.1 + r() * 0.2, lump: Array.from({ length: 8 }, () => r()) }));
  const drops = Array.from({ length: nA(S.hail ? 40 : 90, "rain", 16, 280) }, () => ({ x: r() * W, y: r(), v: 1 + Math.floor(r() * 2), l: 0.04 + r() * 0.04 }));
  const motes = Array.from({ length: nA(50, "wind", 12, 150) }, () => ({ x: r() * W, y: r() * H, p: r(), k: 1 + Math.floor(r() * 2) }));
  const treeKind = ["spire", "umbrella", "conifer", "frond"][Math.floor(r() * 4)];
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
  const fgKind = ["rocks", "branches", "arch"][Math.floor(r() * 3)], fg = { kind: fgKind, side: r() < 0.5 ? -1 : 1, pts: Array.from({ length: 16 }, () => r()), p: r() * TAU };
  // détail « habité » : une structure sans usage évident, posée au point le plus dégagé (loin des ruines et des arbres)
  const taken = [...ruins.map((q) => q.x), ...trees.map((q) => q.x)], cand = Array.from({ length: 8 }, () => W * (0.12 + 0.76 * r()));
  const dx = cand.map((x) => [Math.min(W, ...taken.map((q) => Math.abs(q - x))), x]).sort((a, b) => b[0] - a[0])[0][1];
  const det = { kind: ["pylon", "ring", "stair", "dish", "piers"][Math.floor(r() * 5)], x: dx, s: 0.8 + r() * 0.5, p: r() * TAU, hue: r() < 0.5 ? 34 : 190 + r() * 60, n: 4 + Math.floor(r() * 4) };
  const q3 = rng((S.seed ^ 0x601d) >>> 0), rich = (S.riches || []).map((id) => { const n = Math.round(clamp(14 * AM.factorOf(id, S.amt), 4, 60)); return { id, col: WT.RICH_COLOR[id] || [255, 215, 120], big: id === "gems" || id === "pearls", pts: Array.from({ length: n }, () => ({ x: q3(), u: q3(), p: q3(), s: 1 + q3() * 1.3 })) }; });
  const scar = { cracks: Array.from({ length: 12 }, () => ({ x: q3(), u: q3(), pts: Array.from({ length: 5 }, () => q3() - 0.5) })), pits: Array.from({ length: 5 }, () => ({ x: q3(), u: 0.15 + 0.8 * q3(), w: 0.6 + q3() * 0.8 })), embers: Array.from({ length: 22 }, () => ({ x: q3(), u: q3(), p: q3() })) };
  return { S, rich, scar, extras, fg, det, belt, field, ringsP, cometP, W, H, hz, pal, ridges, cones, stars, clouds, drops, motes, treeKind, trees, ruins, eyes, water, fis, lava };
}

// ---- soleils ---------------------------------------------------------------------------------------
function suns(m, t, season = 0) {
  const { S, W, H, hz } = m, top = H * (0.14 + 0.08 * (0.5 - 0.5 * season)), out = [], erratic = (i) => { const q = Math.floor(t * 6), g = rng(S.seed + q * 31 + i); return { x: W * (0.2 + 0.6 * g()), y: H * (0.2 + 0.34 * g()) }; };
  for (let i = 0; i < S.suns; i++) {
    const rad = H * (i === 0 ? 0.085 : 0.055); let b = null;
    if (S.cycle === "frozen") b = { x: W * (0.7 - 0.25 * i), y: hz - H * 0.1, e: 0.12 };
    else if (S.cycle === "erratic") { const p = erratic(i); b = { x: p.x, y: p.y, e: clamp((hz - p.y) / (hz * 0.8)) }; }
    else { const p = frac(t - i * 0.1); if (p <= 0.7) { const q = p / 0.7, e = Math.sin(Math.PI * q); b = { x: W * (0.06 + 0.88 * q), y: hz - e * (hz - top), e }; } }
    if (!b) continue;
    if (S.chaos) { b.x += W * 0.05 * Math.sin(TAU * t * 5 + i * 2); b.y += H * 0.04 * Math.sin(TAU * t * 7 + i); }
    out.push({ i, x: b.x, y: b.y, e: b.e, r: rad });
  }
  return out;
}

// ---- dessin ----------------------------------------------------------------------------------------
function paint(g, m, t, o = {}) {
  t = frac(t); const { S, W, H, hz, pal } = m, td = o.day != null ? frac(o.day) : t, cs = o.clock != null ? o.clock : t * 8, sn = suns(m, td, o.season || 0);
  const d = S.suns === 0 ? 0 : S.cycle === "frozen" ? 0.2 : S.cycle === "erratic" ? 0.2 + 0.6 * rng(S.seed + Math.floor(td * 6))() : Math.max(0, ...sn.map((s) => s.e));
  const night = 1 - smooth(d * 3), day = smooth((d - 0.25) / 0.75);
  let top = mixc(mixc(pal.nightTop, pal.dawnTop, smooth(d * 3)), pal.dayTop, day), hzc = mixc(mixc(pal.nightHz, pal.dawnHz, smooth(d * 3)), pal.dayHz, day);
  const hues = S.sunHues || []; if (hues[0]) { hzc = mixc(hzc, hues[0], 0.3 * day); top = mixc(top, hues[0], 0.14 * day); } // soleil coloré : la lumière du jour prend sa teinte
  g.save(); g.clearRect(0, 0, W, H);
  const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, css(top)); sky.addColorStop(1, css(hzc)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  if (S.storm) { g.fillStyle = "rgba(14,17,24,0.5)"; g.fillRect(0, 0, W, H); }
  if (S.veil) { g.fillStyle = "rgba(190,190,202,0.2)"; g.fillRect(0, 0, W, H); }
  // étoiles
  const sv = (S.storm ? 0.25 : 1) * (S.veil ? 0.5 : 1) * (1 - Math.min(1, d * 1.4));
  if (sv > 0.02) for (const s of m.stars) { g.fillStyle = css([230, 230, 245], (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * t * s.k + s.p))) * sv); g.fillRect(s.x, s.y, s.s, s.s); }
  // aurores
  if (S.auroras) {
    g.save(); g.globalCompositeOperation = "lighter";
    [[80, 220, 160], [150, 120, 230], [90, 190, 220]].forEach((c, y) => {
      const b = H * (0.14 + 0.08 * y), v = H * 0.05; g.strokeStyle = css(c, 0.3 * (0.4 + night)); g.lineWidth = H * 0.045; g.lineCap = "round"; g.beginPath();
      for (let x = 0; x <= W; x += 6) { const yy = b + v * Math.sin(x / W * TAU * ((2 + y) / 2) + TAU * t * (y % 2 ? -1 : 1)) + v * 0.4 * Math.sin(x / W * TAU * 3 + TAU * t * 2); x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
      g.stroke();
    });
    g.restore();
  }
  if (S.starfall) for (let p = 0; p < 3; p++) {
    const q = frac(t + p / 3); if (q > 0.3) continue; const k = q / 0.3, x = (rng(S.seed + p)() * W * 0.7), y = rng(S.seed + p + 9)() * hz * 0.4;
    g.strokeStyle = css([255, 255, 255], 0.8 * (1 - k)); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x + k * W * 0.28, y + k * H * 0.24); g.lineTo(x + k * W * 0.28 - H * 0.18, y + k * H * 0.24 - H * 0.13); g.stroke();
  }
  // lune
  if (S.moon) {
    const rad = H * 0.045; let mp = null;
    if (S.cycle === "frozen") mp = { x: W * 0.3, y: H * 0.3 }; else { const p = frac(td - 0.6); if (p <= 0.7) { const q = p / 0.7; mp = { x: W * (0.06 + 0.88 * q), y: hz - Math.sin(Math.PI * q) * (hz - H * 0.2) }; } }
    if (mp) { g.fillStyle = "#cfd6e2"; g.beginPath(); g.arc(mp.x, mp.y, rad, 0, TAU); g.fill(); g.fillStyle = "rgba(10,12,20,0.5)"; g.beginPath(); g.arc(mp.x + rad * 0.45, mp.y - rad * 0.2, rad * 0.9, 0, TAU); g.fill(); }
  }
  // nuages (dérive lente, boucle)
  for (const c of m.clouds) {
    const x = frac((c.x / W) + t * c.sp) * (W + c.w * 2) - c.w; g.fillStyle = css(S.storm ? [30, 34, 44] : mixc(hzc, [255, 255, 255], 0.35), S.storm ? 0.55 : c.a * (0.4 + day));
    c.lump.forEach((l, k) => { g.beginPath(); g.ellipse(x + (k / 7) * c.w, c.y + (l - 0.5) * c.h * 0.6, c.w * 0.13, c.h * (0.3 + l * 0.3), 0, 0, TAU); g.fill(); });
  }
  // soleils
  for (const s of sn) {
    const gl = g.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, s.r * 5), b = 0.5 * Math.max(Math.pow(Math.max(0, s.e), 0.6), S.cycle === "frozen" ? 0.7 : 0);
    const hc = hues[s.i] || hues[0] && S.suns < 2 && s.i === 0 && hues[0] || null; // 1er soleil : 1re couleur ; 2e soleil : 2e couleur
    gl.addColorStop(0, hc ? css(hc, b) : s.i === 0 ? css([255, 214, 150], b) : css([190, 215, 255], b * 0.8)); gl.addColorStop(1, css(hc || [255, 214, 150], 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.fillStyle = hc ? css(mixc(hc, [255, 255, 255], 0.35)) : s.i === 0 ? "#f6e0a8" : "#cfe0f4"; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }
  const s0 = sn.find((s) => s.i === 0);
  if (S.eclipses && s0) { g.fillStyle = "#05060a"; g.beginPath(); g.arc(s0.x + s0.r * 2.4 * Math.cos(TAU * t), s0.y + s0.r * 0.15 * Math.sin(TAU * t), s0.r * 1.02, 0, TAU); g.fill(); }
  skyBodies(g, m, cs, day, hzc, sn);
  extraAt(g, m, t, "sky");
  // crêtes, de la plus lointaine à la plus proche (perspective atmosphérique : plus claires et plus proches de l'horizon au loin)
  m.ridges.forEach((rg) => {
    let c = mixc(mixc(pal.rock, pal.ground, 0.4 + 0.3 * rg.d), hzc, (1 - rg.d) * 0.45 * (0.3 + day * 0.7));
    if (S.ice) c = mixc(c, [214, 232, 248], (0.42 + 0.2 * day) * (1 - 0.6 * night)); // neige et glace sur les crêtes
    g.fillStyle = css(c); g.beginPath(); g.moveTo(0, hz); const n = rg.xs.length - 1;
    for (let k = 0; k <= n; k++) g.lineTo((k / n) * W, rg.xs[k]); g.lineTo(W, hz + 1); g.closePath(); g.fill();
    if (S.ice) { g.strokeStyle = css([240, 250, 255], (0.35 + 0.35 * day) * (1 - 0.5 * night)); g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k <= n; k++) k ? g.lineTo((k / n) * W, rg.xs[k]) : g.moveTo(0, rg.xs[0]); g.stroke(); } // arête givrée
    if (rg.d < 0.95) { // brume entre les plans : l'horizon remonte devant la crête
      const top = Math.min(...rg.xs), mg = g.createLinearGradient(0, top, 0, hz); mg.addColorStop(0, css(hzc, 0)); mg.addColorStop(1, css(hzc, 0.3 * (1 - rg.d) * (0.45 + 0.55 * day) + 0.08)); g.fillStyle = mg; g.fillRect(0, top, W, hz - top);
    }
  });
  for (const cn of m.cones) { // volcans : cône sombre + lueur du cratère
    g.fillStyle = css(pal.rock); g.beginPath(); g.moveTo(cn.x - cn.w, hz); g.lineTo(cn.x - cn.w * 0.12, hz - cn.h); g.lineTo(cn.x + cn.w * 0.12, hz - cn.h); g.lineTo(cn.x + cn.w, hz); g.closePath(); g.fill();
    const f = 0.5 + 0.5 * Math.sin(TAU * (t * 2) + cn.x), lg = g.createRadialGradient(cn.x, hz - cn.h, 1, cn.x, hz - cn.h, cn.h * 0.9); lg.addColorStop(0, css([255, 130, 50], 0.5 + 0.25 * f)); lg.addColorStop(1, css([255, 90, 30], 0)); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  // sol
  g.fillStyle = css(pal.ground); g.fillRect(0, hz, W, H - hz);
  if (S.sand) { for (let p = 0; p < 3; p++) { g.fillStyle = css(mixc(pal.ground, [120, 90, 55], 0.25 + 0.15 * p)); g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, hz + H * (0.07 + 0.06 * p) + H * 0.025 * Math.sin(x / W * TAU * (1 + p) + p * 2)); g.lineTo(W, H); g.closePath(); g.fill(); } }
  if (S.ice) iceSheet(g, m, t, sn, day, night, hzc);
  else if (S.water) {
    const wg = g.createLinearGradient(0, hz, 0, H); wg.addColorStop(0, css(mixc(hzc, [20, 60, 70], 0.7))); wg.addColorStop(1, "#0b181c"); g.fillStyle = wg; g.fillRect(0, hz, W, H - hz);
    for (const l of m.water.lines) { const x = frac(l.p + t) * (W + l.w) - l.w; g.fillStyle = "rgba(200,225,235,0.22)"; g.fillRect(x, l.y, l.w, 1.2); }
    const s = sn.find((q) => q.e > 0.15); if (s) for (let b = 0; b < 6; b++) { g.fillStyle = css([255, 220, 160], (0.28 - b * 0.03) * Math.min(1, s.e * 2)); g.fillRect(s.x - (14 - b * 2) / 2 + 3 * Math.sin(TAU * (t * 2 + b * 0.2)), hz + H * (0.05 + 0.045 * b), 14 - b * 2, 1.5); }
  }
  if (S.lava) {
    for (const v of m.lava.veins) { const y = hz + H * 0.08 + v.w * H * 0.14; g.strokeStyle = css([255, 122, 48], 0.55 + 0.4 * Math.sin(TAU * (t * 2 + v.w))); g.lineWidth = 1.6; g.beginPath(); g.moveTo(v.x, y); v.pts.forEach((q, k) => g.lineTo(((k + 1) / 6) * W * 0.9, y + q * H * 0.05)); g.stroke(); }
    for (const sp of m.lava.sparks) { const q = frac(t * 3 + sp.p); g.fillStyle = css([255, 150, 70], 1 - q); g.fillRect(sp.x + 6 * Math.sin(TAU * (q + sp.p)), hz + H * 0.1 - q * H * 0.45, 1.5, 1.5); }
  }
  scarGround(g, m, t, night);
  richGlints(g, m, t, night);
  extraAt(g, m, t, "ground");
  // fissure
  if (S.fissure) fissure(g, m, t);
  // arbres
  if (S.trees) trees(g, m, t);
  // ruines
  for (const rn of m.ruins) ruin(g, m, rn, t);
  detail(g, m, t, night);
  if (S.glow || S.moths) for (let p = 0, np = Math.round(clamp(12 * (S.amt ? (S.moths ? (S.amt.moths != null ? S.amt.moths : 1) : (S.amt.glow != null ? S.amt.glow : 1)) : 1), 3, 40)); p < np; p++) { const q = rng(S.seed + p * 13), x = q() * W, y = hz - q() * H * 0.12, a = 0.35 + 0.5 * Math.sin(TAU * (t * (S.moths ? 2 : 1) + q())); g.fillStyle = css(S.glow ? [140, 255, 190] : [255, 230, 160], Math.max(0, a) * 0.8); g.beginPath(); g.arc(x + (S.moths ? 5 * Math.sin(TAU * (t * 2 + q())) : 0), y + (S.moths ? 3 * Math.cos(TAU * (t * 3 + q())) : 0), 1.4, 0, TAU); g.fill(); }
  for (const e of m.eyes) { const o = Math.sin(TAU * (t * 1 + e.p)); if (o > -0.7) { g.fillStyle = css([255, 200, 90], 0.8); g.fillRect(e.x - 3, e.y, 1.6, 1.6); g.fillRect(e.x + 2, e.y, 1.6, 1.6); } }
  if (S.ice) reflect(g, m, t, 0.34); else if (S.water) reflect(g, m, t, 0.5);
  extraAt(g, m, t, "air");
  scarAir(g, m, t);
  weather(g, m, t);
  foreground(g, m, t, hzc);
  if (S.ice) frost(g, m, t, night);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
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
  const { S, W, H, hz } = m, sc = new Set(S.scars || []); if (!sc.size) return;
  const f = (u) => hz + (H - hz) * u * u;
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

function fissure(g, m, t) {
  const { S, W, H, hz, fis } = m, f = 0.5 + 0.5 * Math.sin(TAU * t * 3);
  if (S.fissure === "cave") {
    const x = fis.x, hw = H * 0.17, h = H * 0.22; g.fillStyle = "#040406"; g.strokeStyle = "#2c2a36"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - hw, hz + 4); g.lineTo(x - hw, hz - h * 0.55); g.quadraticCurveTo(x, hz - h * 1.25, x + hw, hz - h * 0.55); g.lineTo(x + hw, hz + 4); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = css([190, 230, 255], 0.5 + 0.4 * f); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, hz - h * 0.7); g.lineTo(x - 2, hz - h * 0.4); g.lineTo(x + 2, hz - h * 0.15); g.lineTo(x, hz + 2); g.stroke();
    return;
  }
  const sub = S.fissure === "submarine", y0 = sub ? hz + (H - hz) * 0.3 : hz + 2, pts = fis.pts.map((q, i) => [fis.x + q * W * 0.06 + i * 1.3, y0 + (H - y0 - 2) * (i / 6)]);
  const stroke = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "miter"; g.beginPath(); pts.forEach(([x, y], i) => { const z = sub ? 1.6 * Math.sin(TAU * (t * 2 + i * 0.45)) : 0; i ? g.lineTo(x + z, y) : g.moveTo(x + z, y); }); g.stroke(); };
  stroke(sub ? css([110, 190, 225], 0.12 + 0.08 * f) : css([150, 215, 255], 0.1 + 0.08 * f), sub ? 9 : 7); stroke(sub ? css([170, 225, 245], 0.4 + 0.3 * f) : css([205, 238, 255], 0.55 + 0.4 * f), sub ? 1.6 : 1.8);
  if (sub) for (const b of fis.bubbles) { const q = frac(t * 2 + b.p); g.strokeStyle = css([205, 235, 248], 0.5 * (1 - q)); g.lineWidth = 0.9; g.beginPath(); g.arc(fis.x + b.dx, H - 4 - q * (H - y0 - 8), 1 + 1.4 * b.p, 0, TAU); g.stroke(); }
}

function trees(g, m, t) {
  const { S, hz } = m, col = S.burnt ? "#0a0909" : "#070b08";
  for (const [i, tr] of m.trees.entries()) {
    const sw = 1.6 * Math.sin(TAU * t + tr.p), x = tr.x, top = hz - tr.h; g.fillStyle = col; g.strokeStyle = col;
    if (S.burnt || m.treeKind === "spire") { // flèche nue ou tronc brûlé aux branches cassées
      g.beginPath(); g.moveTo(x - 2.5, hz + 3); g.lineTo(x + sw * 0.4 + tr.lean * 4, top); g.lineTo(x + 2.5, hz + 3); g.fill();
      if (S.burnt) { g.lineWidth = 1.4; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + sw * 0.3, hz - tr.h * 0.7); g.lineTo(x + s * tr.h * 0.3 + sw, hz - tr.h * 0.95); g.stroke(); } }
      else { g.lineWidth = 1; for (let k = 1; k < 4; k++) { const y = hz - tr.h * (0.3 + k * 0.17); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k % 2 ? 1 : -1) * tr.h * 0.18 + sw, y - tr.h * 0.07); g.stroke(); } }
    } else if (m.treeKind === "umbrella") { // tronc fin + canopée plate
      g.lineWidth = 2; g.beginPath(); g.moveTo(x, hz + 3); g.quadraticCurveTo(x + tr.lean * 8, hz - tr.h * 0.5, x + sw * 0.5, top); g.stroke();
      g.beginPath(); g.ellipse(x + sw, top, tr.h * 0.5, tr.h * 0.12, 0, 0, TAU); g.fill();
    } else if (m.treeKind === "frond") { // palme
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, hz + 3); g.quadraticCurveTo(x + tr.lean * 10, hz - tr.h * 0.5, x + sw * 0.4, top); g.stroke();
      for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.1 + 0.16 * k) + sw * 0.03; g.beginPath(); g.moveTo(x + sw * 0.4, top); g.quadraticCurveTo(x + Math.cos(a) * tr.h * 0.3, top + Math.sin(a) * tr.h * 0.35 - 3, x + Math.cos(a) * tr.h * 0.5, top + Math.sin(a) * tr.h * 0.3 + 6); g.stroke(); }
    } else { // conifère
      g.beginPath(); g.moveTo(x - 2.5, hz + 3); g.lineTo(x + sw * 0.4, top); g.lineTo(x + 2.5, hz + 3); g.fill();
      g.beginPath(); g.moveTo(x - tr.h * 0.42 + sw, hz - tr.h * 0.5); g.lineTo(x + sw * 1.2, hz - tr.h * 1.15); g.lineTo(x + tr.h * 0.42 + sw, hz - tr.h * 0.5); g.fill();
    }
    if (S.fire) for (let k = 0; k < 3; k++) { const p = 0.5 + 0.5 * Math.sin(TAU * (t * 3 + k * 0.31 + i * 0.2)), fx = x + (k - 1) * 4 + sw; g.fillStyle = css([255, 140 + 60 * p, 40], 0.8); g.beginPath(); g.moveTo(fx - 2, hz - tr.h * 0.7); g.lineTo(fx, hz - tr.h * (0.9 + 0.25 * p)); g.lineTo(fx + 2, hz - tr.h * 0.7); g.fill(); }
  }
}

function ruin(g, m, rn, t) {
  const { S, W, H, hz } = m, b = rn.x; g.fillStyle = "#08080d"; g.strokeStyle = "#2c2a36"; g.lineWidth = 1;
  if (rn.k === "door") { const v = H * 0.1, h = H * 0.24; g.beginPath(); g.moveTo(b - v, hz + 2); g.lineTo(b - v, hz - h * 0.7); g.lineTo(b, hz - h); g.lineTo(b + v, hz - h * 0.7); g.lineTo(b + v, hz + 2); g.closePath(); g.fill(); g.stroke(); }
  else if (rn.k === "bridge") { const v = W * 0.2; g.beginPath(); g.moveTo(b - v, hz + 2); g.quadraticCurveTo(b, hz - H * 0.22, b + v, hz + 2); g.lineTo(b + v, hz + 6); g.lineTo(b - v, hz + 6); g.closePath(); g.fill(); g.stroke(); }
  else if (rn.k === "tablet") { const v = H * 0.07, h = H * 0.2; g.fillRect(b - v, hz - h, v * 2, h + 2); g.strokeRect(b - v, hz - h, v * 2, h + 2); if (S.tabletAwake) { g.fillStyle = css([255, 190, 110], 0.35 + 0.3 * Math.sin(TAU * t * 2)); g.fillRect(b - v + 3, hz - h + 6, v * 2 - 6, 1.4); g.fillRect(b - v + 3, hz - h + 12, v * 2 - 10, 1.4); } }
  else { g.fillRect(b - 1.2, hz - H * 0.16, 2.4, H * 0.16 + 2);
    if (S.lampLit) { const lg = g.createRadialGradient(b, hz - H * 0.17, 1, b, hz - H * 0.17, H * 0.2); lg.addColorStop(0, css([140, 190, 255], 0.55 + 0.15 * Math.sin(TAU * t * 3))); lg.addColorStop(1, css([140, 190, 255], 0)); g.fillStyle = lg; g.fillRect(0, 0, W, H); g.fillStyle = "#cfe3ff"; g.beginPath(); g.arc(b, hz - H * 0.17, 2.4, 0, TAU); g.fill(); }
    else { g.fillStyle = "#2c2a36"; g.beginPath(); g.arc(b, hz - H * 0.17, 2.2, 0, TAU); g.fill(); } }
}

function weather(g, m, t) {
  const { S, W, H, hz } = m;
  const fk = S.amt && S.amt.fog != null ? S.amt.fog : 1;
  if (S.fog) for (let i = 0; i < 3; i++) { const y = hz - H * (0.02 + 0.07 * i), x = frac(t * (1 + i % 2) + i * 0.3) * W; const gr = g.createLinearGradient(0, y - H * 0.1, 0, y + H * 0.08); gr.addColorStop(0, "rgba(190,200,210,0)"); gr.addColorStop(0.5, css([190, 200, 210], clamp((0.2 - i * 0.04) * fk, 0, 0.75))); gr.addColorStop(1, "rgba(190,200,210,0)"); g.fillStyle = gr; g.fillRect(-x * 0.1, y - H * 0.1, W + 20, H * 0.18); }
  if (S.heat) { g.fillStyle = css([255, 160, 90], 0.05); for (let y = hz - H * 0.05; y < hz + H * 0.1; y += 4) g.fillRect(2 * Math.sin(TAU * t * 2 + y), y, W, 1); }
  if (S.steam) for (let i = 0; i < 6; i++) { const q = frac(t * 2 + i / 6); g.fillStyle = css([220, 225, 230], 0.25 * (1 - q)); g.beginPath(); g.arc(W * (0.15 + 0.14 * i) + 5 * Math.sin(TAU * (q + i)), hz - q * H * 0.4, 2 + q * 5, 0, TAU); g.fill(); }
  if (S.dust || S.ash || S.wind) for (const p of m.motes) { const x = frac(p.x / W + t * p.k * (S.dust ? 3 : 1.5)) * W, y = p.y + 3 * Math.sin(TAU * (t * 2 + p.p)); g.fillStyle = S.ash ? css([160, 160, 160], 0.4) : S.dust ? css([200, 160, 100], 0.45) : css([220, 220, 230], 0.12); g.fillRect(x, y, S.dust ? 2 : 1.2, 1); }
  if (S.rain) { g.strokeStyle = css([190, 205, 225], S.storm ? 0.45 : 0.3); g.lineWidth = 1; g.beginPath(); for (const d of m.drops) { const y = frac(d.y + t * d.v) * H, x = d.x + y * 0.12; g.moveTo(x, y); g.lineTo(x - 2, y - H * d.l); } g.stroke(); }
  if (S.hail) { g.fillStyle = "rgba(230,240,255,0.7)"; for (const d of m.drops) { const y = frac(d.y + t * d.v * 1.5) * H; g.fillRect((d.x + y * 0.05) % W, y, 1.6, 1.6); } }
  if (S.lightning) {
    const q = Math.floor(t * 4), g2 = rng(S.seed + q * 101), on = g2() < 0.35 && frac(t * 4) < 0.18;
    if (on) {
      g.fillStyle = "rgba(220,230,255,0.22)"; g.fillRect(0, 0, W, H); g.strokeStyle = "rgba(240,245,255,0.9)"; g.lineWidth = 1.4; g.beginPath(); let x = W * (0.2 + 0.6 * g2()), y = 0; g.moveTo(x, y);
      while (y < hz) { x += (g2() - 0.5) * W * 0.07; y += H * (0.05 + 0.05 * g2()); g.lineTo(x, y); } g.stroke();
    }
  }
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
  if (m.cometP) { // comète : passe en ~45 s toutes les 90 s ; la queue s'éloigne de sa direction
    const c = m.cometP, p = frac(cs / 90 + c.ph) / 0.5; if (p < 1) {
      const x = c.dir > 0 ? lerp(-W * 0.1, W * 1.1, p) : lerp(W * 1.1, -W * 0.1, p), y = H * lerp(c.y0, c.y1, p), tx = x - c.dir * W * 0.38, ty = y - H * (c.y1 - c.y0) * 0.38;
      const tl = g.createLinearGradient(x, y, tx, ty); tl.addColorStop(0, "rgba(200,225,255,0.7)"); tl.addColorStop(1, "rgba(200,225,255,0)"); g.strokeStyle = tl; g.lineWidth = H * 0.03; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke();
      g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(tx, ty + H * 0.05); g.stroke();
      const hg = g.createRadialGradient(x, y, 0, x, y, H * 0.06); hg.addColorStop(0, "rgba(255,255,255,0.95)"); hg.addColorStop(1, "rgba(180,215,255,0)"); g.fillStyle = hg; g.fillRect(x - H * 0.06, y - H * 0.06, H * 0.12, H * 0.12);
    }
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
  const { W, H, hz, det: d, pal } = m, x = d.x, s = d.s, dark = css(mixc(pal.rock, [0, 0, 0], 0.55)), rim = css(mixc(pal.rock, [220, 200, 170], 0.4), 0.5);
  const blink = night * (0.35 + 0.65 * Math.max(0, Math.sin(TAU * (t * 2) + d.p))), glow = css(hsl(d.hue, 0.8, 0.6), 1);
  g.fillStyle = dark; g.strokeStyle = rim; g.lineWidth = 1;
  if (d.kind === "pylon") {
    const h = H * 0.3 * s, w = H * 0.014;
    g.beginPath(); g.moveTo(x - w * 2, hz + 3); g.lineTo(x - w * 0.6, hz - h); g.lineTo(x + w * 0.6, hz - h); g.lineTo(x + w * 2, hz + 3); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x, hz - h * 0.62, w * 5, w * 1.8, 0, 0, TAU); g.stroke();
    const lg = g.createRadialGradient(x, hz - h, 0, x, hz - h, H * 0.07); lg.addColorStop(0, css(hsl(d.hue, 0.8, 0.6), 0.9 * blink)); lg.addColorStop(1, css(hsl(d.hue, 0.8, 0.6), 0)); g.fillStyle = lg; g.fillRect(x - H * 0.07, hz - h - H * 0.07, H * 0.14, H * 0.14);
    g.fillStyle = glow; g.globalAlpha = 0.3 + 0.7 * blink; g.fillRect(x - 1, hz - h - 1, 2, 2); g.globalAlpha = 1;
  } else if (d.kind === "ring") { // anneau dressé, à demi enfoui (la partie sous l'horizon est coupée)
    const R = H * 0.17 * s; g.save(); g.beginPath(); g.rect(0, 0, W, hz + 2); g.clip();
    g.lineWidth = Math.max(3, H * 0.022); g.strokeStyle = dark; g.beginPath(); g.arc(x, hz - R * 0.45, R, 0, TAU); g.stroke();
    g.lineWidth = 1; g.strokeStyle = rim; g.beginPath(); g.arc(x, hz - R * 0.45, R * 1.04, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    if (blink > 0.05) { g.strokeStyle = css(hsl(d.hue, 0.8, 0.6), 0.5 * blink); g.lineWidth = 1.4; g.beginPath(); g.arc(x, hz - R * 0.45, R * 0.84, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
  } else if (d.kind === "stair") { // escalier qui monte vers rien
    const n = d.n + 2, w = H * 0.045 * s, st = H * 0.03 * s;
    for (let i = 0; i < n; i++) { const h = st * (i + 1) + H * 0.012; g.fillStyle = dark; g.fillRect(x + i * w, hz - h, w + 0.5, h + 2); g.fillStyle = rim; g.fillRect(x + i * w, hz - h, w + 0.5, 1); }
  } else if (d.kind === "dish") { // antenne parabolique qui tourne lentement
    const h = H * 0.16 * s, tilt = -0.9 + 0.35 * Math.sin(TAU * t + d.p);
    g.strokeStyle = dark; g.lineWidth = Math.max(2.5, H * 0.014); g.beginPath(); g.moveTo(x, hz + 2); g.lineTo(x, hz - h); g.stroke();
    g.save(); g.translate(x, hz - h); g.rotate(tilt); const r = H * 0.075 * s; g.fillStyle = dark; g.strokeStyle = rim; g.lineWidth = 1;
    g.beginPath(); g.arc(0, 0, r, Math.PI * 0.08, Math.PI * 0.92); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = dark; g.lineWidth = Math.max(1.2, H * 0.008); g.beginPath(); g.moveTo(0, r * 0.1); g.lineTo(0, -r * 0.95); g.stroke();
    g.fillStyle = glow; g.globalAlpha = 0.25 + 0.75 * blink; g.fillRect(-1.2, -r * 0.95 - 1, 2.4, 2.4); g.globalAlpha = 1; g.restore();
  } else { // piliers sans pont, alignés vers l'horizon
    for (let i = 0; i < d.n + 1; i++) { const k = 1 - i / (d.n + 2), w = H * 0.03 * s * k, h = H * (0.1 + 0.07 * ((i * 7 + 3) % 5) / 5) * s * k; g.fillStyle = dark; g.fillRect(x - i * W * 0.05 * s, hz - h, w, h + 2); g.fillStyle = rim; g.fillRect(x - i * W * 0.05 * s, hz - h, w, 1); }
  }
}

// ---- premier plan : un cadre sombre au bord de l'image (rochers, branches ou arche) -------------------------
function foreground(g, m, t, hzc) {
  const { W, H, fg, pal } = m, col = css(mixc(pal.rock, [0, 0, 0], 0.7)), rim = css(mixc(hzc, [255, 230, 190], 0.2), 0.22), sd = fg.side, X = (x) => (sd < 0 ? x : W - x);
  g.fillStyle = col; g.strokeStyle = rim; g.lineWidth = 1;
  if (fg.kind === "rocks") {
    for (const [wd, k] of [[0.3, 0], [0.16, 8]]) {
      g.beginPath(); g.moveTo(X(-2), H + 2); g.lineTo(X(-2), H * (0.74 + 0.1 * fg.pts[k]));
      for (let i = 1; i <= 6; i++) g.lineTo(X(W * wd * (i / 6)), H * (0.78 + 0.18 * (i / 6) - 0.1 * fg.pts[(k + i) % 16]));
      g.lineTo(X(W * wd), H + 2); g.closePath(); g.fill(); g.stroke();
    }
  } else if (fg.kind === "branches") {
    const sw = Math.sin(TAU * t + fg.p) * 1.6; g.strokeStyle = col; g.lineCap = "round";
    g.lineWidth = Math.max(2.5, H * 0.022); g.beginPath(); g.moveTo(X(-4), H * 0.02); g.quadraticCurveTo(X(W * 0.2 + sw), H * (0.04 + 0.08 * fg.pts[0]), X(W * 0.42 + sw), H * (0.14 + 0.1 * fg.pts[1])); g.stroke();
    for (let i = 0; i < 5; i++) {
      const bx = W * (0.06 + 0.07 * i) + sw * 0.5, by = H * (0.03 + 0.03 * i), ex = bx + W * (0.04 + 0.04 * fg.pts[i]), ey = by + H * (0.12 + 0.12 * fg.pts[i + 5]);
      g.lineWidth = Math.max(1.2, H * 0.012); g.beginPath(); g.moveTo(X(bx), by); g.quadraticCurveTo(X(bx + 6), by + (ey - by) * 0.5, X(ex + sw), ey); g.stroke();
      g.fillStyle = col; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(X(ex + sw + (k - 1) * 3), ey + 2 + (k % 2) * 3, 1.6, 4 + k, 0.5 * (k - 1) * sd, 0, TAU); g.fill(); }
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


module.exports = { sceneOf, traits, KNOWN, build, paint, suns, PERIOD, hsl };
