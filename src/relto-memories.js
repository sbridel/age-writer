"use strict";
/**
 * La chambre des souvenirs (claude/CATALOGUE-merveilles.md : des orbes, comme à Serenia). Chaque merveille vue
 * une fois (nouée par une union, ou écrite : pluie de pétales, brume parfumée…) flotte ici dans un orbe de verre, et dans
 * l'orbe, sa propre fenêtre, vivante (src/genscene.js). Rien ne s'en efface ; il n'y a pas de place vide (pas de règle des
 * 25 places, décision de l'auteur). On y entre par l'orbe qui flotte dans le salon, dès la première merveille vue.
 */
const { clamp, rgba, fnv } = require("./util");
const G = require("./genscene");
const CAT = require("./wonders");
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const W = 640, H = 360, TAU = Math.PI * 2;

/** Une scène neutre, à laquelle chaque merveille ajoute ce qui la porte. */
const BASE = { verdict: "stable", unrest: 0.15, suns: 1, skyStated: true, moon: false, cycle: "steady", chaos: false, veil: false, auroras: false, eclipses: false, starfall: false, rain: false, storm: false, wind: false, fog: false, lightning: false, heat: false, hail: false, steam: false, dust: false, ash: false, lava: false, water: false, ice: false, sand: false, trees: 2, burnt: false, fire: false, moths: false, glow: false, eyes: false, ruins: [], lampLit: false, tabletAwake: false, fissure: null, extras: [], sunHues: [], world: null, riches: [], scars: [], wonders: [] };
const LOOK = {
  unfinished_horizon: { wonders: ["unfinished_horizon"] }, orphan_colour: { wonders: ["orphan_colour"], sunHues: [[150, 96, 200]] },
  breathing_mirrors: { wonders: ["breathing_mirrors"], lava: true, water: true }, visiting_weight: { wonders: ["visiting_weight"] },
  wind_learned: { wonders: ["wind_learned"], sand: true, wind: true, trees: 0 }, reading_rain: { wonders: ["reading_rain"], drizzle: true },
  ceiling_sea: { wonders: ["ceiling_sea"], world: "cavern", suns: 0, glow: true }, fit_through_moths: { wonders: ["fit_through_moths"], moths: true },
  mosaic: { wonders: ["mosaic"], grass: true }, ringed_ground: { wonders: ["ringed_ground"], trees: 4 }, drinking_roots: { wonders: ["drinking_roots"], wonderMetal: "gold", trees: 3 },
  living_mist: { wonders: ["living_mist"], fog: true }, day_aurora: { wonders: ["day_aurora"], auroras: true }, blooming_ice: { wonders: ["blooming_ice"], ice: true, world: "frozen" },
  rust_held_bridge: { wonders: ["rust_held_bridge"], ruins: ["bridge"] }, many_one: { wonders: ["many_one"], lava: true, world: "lava" }, early_echo: { wonders: ["early_echo"], world: "cavern", suns: 0, glow: true },
  petal_rain: { petals: true, flowers: true, wind: true }, scented_mist: { scent: true, flowers: true, fog: true }, crystal_rain: { crystalRain: true },
  spore_cloud: { wind: true, fog: true }, glowvine: { glow: true, world: "jungle" }, lantern_moths: { moths: true, glow: true },
  cinderbloom: { lava: true, flowers: true }, ironwood: { trees: 4 }, humming_shard: { ruins: ["tablet"] }, singing_glass: { sand: true },
  speaking_tablet: { ruins: ["tablet"], tabletAwake: true }, charged_crystal: { lightning: true, storm: true }, fulgurite: { sand: true, lightning: true },
};
const OW = 96, OH = 58; /* la fenêtre peinte dans chaque orbe */

/** La liste des souvenirs, dans l'ordre où ils ont été vus : [{ id, at, age }]. */
function memoriesOf(r) {
  const box = r.opts && typeof r.opts.wonders === "function" ? r.opts.wonders() || {} : {};
  return Object.entries(box).filter(([id]) => LOOK[id]).map(([id, v]) => ({ id, at: (v && v.at) || 0, age: (v && v.age) || "", gone: !!(v && v.gone) })).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** La fenêtre d'un souvenir : un petit canevas, repeint quelques fois par seconde (pas à chaque image). */
function orbCanvas(r, id, t) {
  const cache = (r._memCache = r._memCache || {}); let c = cache[id];
  if (!c) {
    const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(OW, OH) : (typeof document !== "undefined" ? Object.assign(document.createElement("canvas"), { width: OW, height: OH }) : null);
    if (!cv) return null;
    const S = { ...BASE, ...LOOK[id], name: "memory|" + id, seed: fnv("memory|" + id) };
    const m = G.build(S, OW, OH); m.fg = { ...m.fg, kind: "none" }; /* pas de premier plan : l'orbe montre la merveille, pas une branche */
    c = cache[id] = { cv, m, at: -1 };
  }
  if (t - c.at > 0.12 || c.at < 0) { c.at = t; try { G.paint(c.cv.getContext("2d"), c.m, (t / 8) % 1, { day: 0.4, clock: 12 }); } catch (e) { /* une scène qui échoue reste vide */ } }
  return c.cv;
}

/** Les places des orbes : un arc lâche, de gauche à droite, chacun à sa hauteur. */
function places(n) {
  return Array.from({ length: n }, (_, i) => {
    const u = n === 1 ? 0.5 : i / (n - 1), row = n > 9 ? i % 2 : 0, k = fnv("orb" + i);
    return { x: 70 + u * (W - 140), y: (n > 9 ? 130 : 200) - 70 * Math.sin(u * Math.PI) + row * 92 + (k % 21) - 10, r: n > 12 ? 30 : 36, ph: (k % 100) / 100 };
  });
}

function drawMemories(r, ctx, sc, sky, t) {
  const tr = TR(r), list = memoriesOf(r), at = places(list.length), night = clamp(sky && sky.night != null ? sky.night : 0.3);
  /* l'espace : une nuit bleue, sans murs, un sol d'eau sombre qui reflète */
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#070914"); bg.addColorStop(0.7, "#121a30"); bg.addColorStop(1, "#05070d"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const k = fnv("mst" + i), x = k % W, y = (k >>> 10) % 230, a = 0.15 + 0.35 * Math.sin(t * 0.8 + i) ** 2; ctx.fillStyle = rgba(200, 210, 255, a); ctx.fillRect(x, y, 1.2, 1.2); }
  ctx.fillStyle = rgba(40, 60, 100, 0.25); ctx.fillRect(0, 300, W, 60);
  ctx.strokeStyle = rgba(140, 170, 230, 0.12); ctx.lineWidth = 1; for (const y of [304, 316, 334]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  if (!list.length) { ctx.fillStyle = rgba(220, 225, 240, 0.6); ctx.font = "italic 15px serif"; ctx.textAlign = "center"; ctx.fillText(tr("relto.memories.empty"), W / 2, H / 2); ctx.textAlign = "left"; }
  list.forEach((mem, i) => {
    const p = at[i], bob = 5 * Math.sin(t * 0.7 + p.ph * TAU), x = p.x, y = p.y + bob, R = p.r, hov = r.hover && r.hover.wonder === mem.id, sel = r.memSel === mem.id; (r._memPos = r._memPos || {})[mem.id] = { x, y, R };
    ctx.save(); if (mem.gone) ctx.globalAlpha = 0.55; /* un monde qui n'est plus : l'orbe pâlit */
    const glow = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 1.8); glow.addColorStop(0, rgba(160, 190, 255, hov ? 0.3 : 0.14)); glow.addColorStop(1, rgba(160, 190, 255, 0)); ctx.fillStyle = glow; ctx.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
    const cv = orbCanvas(r, mem.id, t);
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
    if (cv) ctx.drawImage(cv, x - R * 1.35, y - R * 0.82, R * 2.7, R * 1.64); else { ctx.fillStyle = "#223"; ctx.fillRect(x - R, y - R, R * 2, R * 2); }
    const sh = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, 1, x, y, R); sh.addColorStop(0, rgba(255, 255, 255, 0.22)); sh.addColorStop(0.5, rgba(255, 255, 255, 0)); sh.addColorStop(1, rgba(10, 20, 40, 0.45)); ctx.fillStyle = sh; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    ctx.strokeStyle = rgba(210, 225, 255, hov ? 0.85 : 0.45); ctx.lineWidth = hov ? 1.6 : 1; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    if (r.opts && r.opts.dreamGuide && r.opts.dreamGuide() === mem.id) { ctx.strokeStyle = rgba(150, 190, 255, 0.5 + 0.3 * Math.sin(t * 1.5)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, R + 5, 0, TAU); ctx.stroke(); } /* le guide choisi : un second cercle qui bat */
    ctx.fillStyle = rgba(255, 255, 255, 0.6); ctx.beginPath(); ctx.ellipse(x - R * 0.4, y - R * 0.5, R * 0.18, R * 0.08, -0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(180, 200, 255, 0.08 + 0.05 * night); ctx.beginPath(); ctx.ellipse(x, 318 + (y - 120) * 0.08, R * 0.8, 3, 0, 0, TAU); ctx.fill(); /* son reflet sur l'eau */
    const name = CAT.nameOf(mem.id, tr("relto.memories.lang") === "fr");
    ctx.restore();
    r.hot.push({ x: x - R, y: y - R, w: R * 2, h: R * 2, wonder: mem.id, tip: (!mem.age ? name : tr(mem.gone ? "relto.memories.tip.gone" : "relto.memories.tip", { w: name, age: mem.age })) + (mem.face ? " — " + tr("dream.face", { f: mem.face }) : "") }); /* l'autre face, si un rêve l'a laissée */
    if (sel) { /* l'orbe choisi : on peut le laisser partir */
      const label = tr("relto.memories.forget"); ctx.font = "italic 12px serif"; const tw = ctx.measureText(label).width + 16, bx = Math.max(4, Math.min(W - tw - 4, x - tw / 2)), by = y + R + 10, fh = r.hover && r.hover.forgetWonder === mem.id;
      ctx.fillStyle = rgba(20, 26, 46, 0.85); ctx.fillRect(bx, by, tw, 20); ctx.strokeStyle = rgba(210, 225, 255, fh ? 0.8 : 0.4); ctx.strokeRect(bx, by, tw, 20);
      ctx.fillStyle = rgba(230, 236, 255, fh ? 1 : 0.8); ctx.fillText(label, bx + 8, by + 14);
      r.hot.push({ x: bx, y: by, w: tw, h: 20, forgetWonder: mem.id, tip: label });
      if (!mem.gone && r.opts && r.opts.dreamGuide) { /* l'emporter en rêve : le guide (étape 4d) ; un seul à la fois */
        const carried = r.opts.dreamGuide() === mem.id, gl = tr(carried ? "dream.guide.leave" : "dream.guide.take"), gw = ctx.measureText(gl).width + 16, gx = Math.max(4, Math.min(W - gw - 4, x - gw / 2)), gy = by + 26, gh = r.hover && r.hover.takeGuide === mem.id;
        ctx.fillStyle = rgba(20, 26, 46, 0.85); ctx.fillRect(gx, gy, gw, 20); ctx.strokeStyle = rgba(210, 225, 255, gh ? 0.8 : 0.4); ctx.strokeRect(gx, gy, gw, 20);
        ctx.fillStyle = rgba(230, 236, 255, gh ? 1 : 0.8); ctx.fillText(gl, gx + 8, gy + 14);
        r.hot.push({ x: gx, y: gy, w: gw, h: 20, takeGuide: mem.id, tip: gl });
      }
    }
  });
  const lv = r._memLeaving; /* un souvenir qu'on laisse partir : il monte, pâlit et se dissout */
  if (lv) { const k = (Date.now() - lv.at) / 1600; if (k >= 1) r._memLeaving = null; else { const y = lv.y - k * 120, a = 1 - k; ctx.strokeStyle = rgba(210, 225, 255, 0.6 * a); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lv.x, y, lv.R * (1 + 0.3 * k), 0, TAU); ctx.stroke(); const gg = ctx.createRadialGradient(lv.x, y, 1, lv.x, y, lv.R); gg.addColorStop(0, rgba(220, 230, 255, 0.4 * a)); gg.addColorStop(1, rgba(220, 230, 255, 0)); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(lv.x, y, lv.R, 0, TAU); ctx.fill(); } }
  /* se retourner : les bords ramènent au salon */
  for (const [x, ch] of [[0, "‹"], [W - 16, "›"]]) {
    const hov = r.hover && r.hover.go === "lounge" && r.hover.edge === ch;
    ctx.fillStyle = rgba(230, 215, 180, hov ? 0.7 : 0.22); ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText(ch, x + 8, 300); ctx.textAlign = "left";
    r.hot.push({ x, y: 40, w: 16, h: 300, tip: tr("relto.memories.back"), go: "lounge", edge: ch });
  }
}

/** L'orbe du salon : la porte de la chambre, qui flotte près du plafond dès la première merveille vue. */
function loungeOrb(r, ctx, t) {
  const n = memoriesOf(r).length; if (!n) return;
  const tr = TR(r), x = 612, y = 74 + 4 * Math.sin(t * 0.9), R = 11, hov = r.hover && r.hover.go === "memories";
  const g = ctx.createRadialGradient(x, y, 2, x, y, R * 3); g.addColorStop(0, rgba(180, 205, 255, hov ? 0.5 : 0.3)); g.addColorStop(1, rgba(180, 205, 255, 0)); ctx.fillStyle = g; ctx.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
  const b = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, R); b.addColorStop(0, "rgba(240,248,255,0.9)"); b.addColorStop(0.6, "rgba(120,150,220,0.55)"); b.addColorStop(1, "rgba(40,60,120,0.6)"); ctx.fillStyle = b; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(220, 235, 255, hov ? 0.9 : 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  r.hot.push({ x: x - R * 1.6, y: y - R * 1.6, w: R * 3.2, h: R * 3.2, go: "memories", tip: tr("relto.memories.go") });
}

module.exports = { drawMemories, loungeOrb, memoriesOf, LOOK };
