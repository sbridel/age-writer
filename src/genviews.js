"use strict";
/**
 * Les autres vues d'un Âge (1.17, périscope de l'Imageur) : la fenêtre de liaison regarde dans une direction ; une fois
 * l'Imageur verrouillé, on peut tourner (quatre directions), lever les yeux (le zénith) ou descendre sous l'eau.
 * Tout reste tiré de la graine de l'Âge : même livre, mêmes vues ; chaque direction a sa propre graine de décor, mais
 * le ciel, la lumière et l'heure sont ceux de la vue de face.
 */
const G = require("./genscene");
const { rng, clamp, lerp, frac, fnv } = require("./util");
const { crevasse } = require("./crevasse");
const { mixc, css, hsl } = G;
const TAU = Math.PI * 2;

/** Le modèle d'une direction `k` (0 = la vue de face, celle de la fenêtre de liaison ; 1 à 3 en tournant). */
function heading(m0, k) {
  k = ((k % 4) + 4) % 4; if (!k || !m0) return m0;
  m0.headings = m0.headings || {};
  if (m0.headings[k]) return m0.headings[k];
  const S = { ...m0.S, seed: (m0.S.seed ^ Math.imul(k, 0x9e3779b1)) >>> 0, fissure: null }; // la fissure est d'un seul côté : celui qu'on voit de face
  const m = G.build(S, m0.W, m0.H);
  m.pal = m0.pal; m.sunFrom = m0; m.noSun = true; m.ringsP = null; m.cometP = null; // le soleil, les anneaux, la comète : de face seulement
  m.night = { ...m.night, moons: [] };
  return (m0.headings[k] = m);
}

/** Y a-t-il de l'eau sous laquelle descendre ? */
function hasUnder(m) { return !!(m && m.S && m.S.water); }

// ---- le zénith ---------------------------------------------------------------------------------------
/** Lever les yeux : le ciel entier, ses étoiles et ses lunes ; la canopée sur les bords s'il y a des arbres. Canvas carré conseillé (on le tourne avec l'azimut). */
function paintZenith(g, m, t, o = {}) {
  const k = G.skyState(m, t, o), { S, hz } = m, W = g.canvas.width, H = g.canvas.height, cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
  const { d, night, day, top, hzc, air } = k; t = k.t;
  g.save(); g.clearRect(0, 0, W, H);
  const sky = g.createRadialGradient(cx, cy, 0, cx, cy, R); sky.addColorStop(0, css(mixc(top, [0, 0, 0], 0.12))); sky.addColorStop(0.75, css(mixc(top, hzc, 0.35))); sky.addColorStop(1, css(mixc(top, hzc, 0.7)));
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const L = G.weatherLevels(m, k.td, o); // météo vivante : la même que de face (1 partout sans ligne programmée)
  if (L.storm > 0.005) { g.fillStyle = css([14, 17, 24], 0.55 * L.storm); g.fillRect(0, 0, W, H); }
  if (S.veil) { g.fillStyle = "rgba(190,190,202,0.22)"; g.fillRect(0, 0, W, H); }
  const sv = Math.max(lerp(1, 0.25, L.storm) * (S.veil ? 0.5 : 1) * (1 - Math.min(1, d * 1.4)), 0.7 * air.thin * air.thin) * (1 - 0.8 * air.thick);
  const few = S.amt && S.amt.stars != null ? Math.min(1, S.amt.stars) : 1, sx = W / m.W, sy = H / (hz * 0.9);
  if (sv > 0.02) {
    for (const s of m.stars) for (const [x, y] of [[s.x * sx, s.y * sy], [W - s.x * sx, H - s.y * sy]]) { g.fillStyle = css([230, 230, 245], (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * t * s.k + s.p))) * sv); g.fillRect(x, y, s.s, s.s); }
    const n = m.night;
    if (n && n.band && few >= 0.6) { // la bande d'étoiles passe au-dessus de la tête
      g.save(); g.translate(cx, cy); g.rotate(n.band.a + 0.6);
      for (const p of n.band.pts) { g.fillStyle = css([225, 228, 245], (0.12 + 0.35 * p.b) * sv); g.fillRect((p.u - 0.5) * R * 2, p.v * n.band.w * 1.6, 1, 1); }
      const bg = g.createLinearGradient(0, -n.band.w * 1.6, 0, n.band.w * 1.6); bg.addColorStop(0, "rgba(220,225,245,0)"); bg.addColorStop(0.5, css([220, 225, 245], 0.08 * sv)); bg.addColorStop(1, "rgba(220,225,245,0)"); g.fillStyle = bg; g.fillRect(-R, -n.band.w * 1.6, R * 2, n.band.w * 3.2);
      g.restore();
    }
    if (n && n.nebula && few >= 0.6) { const nb = n.nebula; g.save(); g.globalCompositeOperation = "lighter"; for (const b of nb.blobs || []) { const x = nb.x * sx + b.dx * nb.R * 1.3, y = nb.y * sy + b.dy * nb.R * 1.3, rr = nb.R * 1.3 * b.r, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, css(hsl(nb.hue + b.dx * 40, 0.6, 0.5), 0.1 * sv)); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } g.restore(); }
    for (const c of (n && n.cons) || []) {
      const P = c.pts.map((p) => ({ ...p, x: p.x * sx, y: p.y * sy }));
      if (c.lines) { g.strokeStyle = css(c.tint, 0.13 * sv * few); g.lineWidth = 0.7; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); }
      for (const p of P) { const a = (0.6 + 0.4 * Math.sin(TAU * t * 2 + p.tw)) * sv * few; g.fillStyle = css(c.tint, a); g.beginPath(); g.arc(p.x, p.y, p.s * 0.6, 0, TAU); g.fill(); }
    }
  }
  // aurores : des rideaux qui ondulent au-dessus
  const ak = clamp((night - 0.3) / 0.45);
  if (S.auroras && ak > 0.01) {
    g.save(); g.globalCompositeOperation = "lighter";
    [[80, 220, 160], [150, 120, 230], [90, 190, 220]].forEach((c, i) => {
      for (const [lw, al] of [[0.11, 0.035], [0.07, 0.05], [0.04, 0.07], [0.015, 0.12]]) { // un voile doux : plusieurs passes, de la plus large à la plus fine
        g.strokeStyle = css(c, al * ak * 1.6); g.lineWidth = H * lw; g.lineCap = "round"; g.beginPath();
        for (let a = 0; a <= 1.001; a += 0.02) { const rr = R * (0.35 + 0.18 * i) + H * 0.05 * Math.sin(a * TAU * 3 + TAU * t * (i % 2 ? -1 : 1)), q = -0.4 + a * 2.2 + i * 0.5; const x = cx + Math.cos(q) * rr, y = cy + Math.sin(q) * rr * 0.8; a ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    });
    g.restore();
  }
  // lunes : chacune à sa place dans le ciel, plus pâles le jour
  for (const [i, mo] of ((m.night && m.night.moons) || []).entries()) {
    const q = rng((S.seed ^ fnv("zenith-moon|" + i)) >>> 0), x = W * (0.2 + 0.6 * q()), y = H * (0.2 + 0.6 * q()), rad = mo.r * (W / m.W) * 1.3, a = 0.35 + 0.65 * night;
    g.globalAlpha = a; g.fillStyle = css(mo.tint); g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    g.fillStyle = "rgba(10,12,20,0.5)"; g.beginPath(); g.arc(x + rad * mo.ph * 1.6, y - rad * 0.2, rad * 0.9, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // anneaux d'une planète voisine
  if (m.ringsP) { const p = m.ringsP, x = W * 0.72, y = H * 0.3, rr = p.R * (W / m.W) * 1.2; g.fillStyle = css(hsl(p.hue, p.sat, 0.55), 0.9); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.strokeStyle = css(hsl(p.hue + 20, p.sat, 0.75), 0.7); g.lineWidth = rr * 0.18; g.beginPath(); g.ellipse(x, y, rr * 2, rr * 0.55, p.tilt, 0, TAU); g.stroke(); }
  if (m.belt) { g.save(); g.translate(cx, cy); g.rotate(m.belt.tilt + 1.1); for (const b of m.belt.rocks) { g.fillStyle = css([150, 140, 125], (0.4 + 0.4 * day) * b.k); g.fillRect((b.u - 0.5) * R * 2, b.off * H * 0.05, b.r, b.r); } g.restore(); }
  // les soleils : haut dans le ciel, ils sont près du centre ; bas, vers le bord
  for (const s of m.noSun ? [] : k.sn) {
    const e = clamp(s.e), x = cx + ((s.x / m.W) - 0.5) * W * 0.9, y = cy + (1 - e) * H * 0.55, rr = s.r * (W / m.W) * 1.1, hc = (k.hues[s.i] || k.hues[0] || (s.i ? [190, 215, 255] : [255, 214, 150]));
    const gl = g.createRadialGradient(x, y, rr * 0.5, x, y, rr * 7); gl.addColorStop(0, css(hc, 0.55 * Math.max(0.2, e))); gl.addColorStop(1, css(hc, 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
    if (S.blackSun && s.i === 0) { g.strokeStyle = "rgba(150,52,40,0.8)"; g.lineWidth = Math.max(1.2, rr * 0.22); g.beginPath(); g.arc(x, y, rr * 1.08, 0, TAU); g.stroke(); g.fillStyle = "#07050a"; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); continue; }
    g.fillStyle = css(mixc(hc, [255, 255, 255], 0.4)); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  // nuages : ils passent au-dessus, vus d'en dessous
  for (const c of air.thin > 0.85 ? [] : m.clouds) {
    const x = frac(c.x / m.W + t * c.sp) * (W + c.w * 2) - c.w, y = (c.y / m.H) * H * 1.8; g.fillStyle = css(mixc(mixc(hzc, [255, 255, 255], 0.3), [30, 34, 44], L.storm), lerp(c.a * (0.5 + day), 0.55, L.storm));
    c.lump.forEach((l, j) => { g.beginPath(); g.ellipse(x + (j / 7) * c.w * 1.3, y + (l - 0.5) * c.h, c.w * 0.18, c.h * (0.5 + l * 0.5), 0, 0, TAU); g.fill(); });
  }
  const fall = Math.max(L.rain, L.drizzle * 0.6, L.acidRain * 0.6, L.crystalRain * 0.6); // la bruine, plus fine, tombe aussi vers soi
  if (fall > 0.005) { g.strokeStyle = css([200, 215, 235], 0.35 * fall); g.lineWidth = 0.8; const q = rng(Math.floor(t * 400)); for (let i = 0; i < 60; i++) { const a = q() * TAU, r0 = q() * R, l = 4 + r0 * 0.06; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l)); g.stroke(); } } // la pluie tombe vers soi
  const fl = Math.max(L.snow, L.ashRain); // neige ou cendre : des flocons qui descendent droit sur soi
  if (fl > 0.005) { const q = rng((S.seed ^ 0x5a0) >>> 0); for (let i = 0; i < 50; i++) { const a = q() * TAU, r0 = frac(q() - t * 0.5) * R; g.fillStyle = L.ashRain > L.snow ? css([96, 92, 88], 0.5 * fl) : css([246, 248, 252], 0.7 * fl); g.beginPath(); g.arc(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 0.8 + r0 / R * 2.2, 0, TAU); g.fill(); } }
  if (L.lightning > 0.005 && frac(t * 3.7) < 0.03) { g.fillStyle = css([235, 240, 255], 0.35 * L.lightning); g.fillRect(0, 0, W, H); }
  // la canopée : des branches qui entrent par les bords
  if (S.trees || S.world === "jungle") {
    const q = rng((S.seed ^ 0xca70) >>> 0), dark = css(mixc(mixc(hzc, [0, 0, 0], 0.85), [10, 30, 15], 0.4), 0.95), n = 5 + Math.floor(q() * 4);
    g.fillStyle = dark; g.strokeStyle = dark; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + q() * 0.5, x0 = cx + Math.cos(a) * R, y0 = cy + Math.sin(a) * R, len = R * (0.35 + 0.25 * q()), sw = Math.sin(TAU * t + i) * 0.03;
      const x1 = x0 - Math.cos(a + sw) * len, y1 = y0 - Math.sin(a + sw) * len; g.lineWidth = 3 + q() * 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let j = 0; j < 14; j++) { const u = 0.3 + 0.7 * q(), lx = lerp(x0, x1, u) + (q() - 0.5) * 26, ly = lerp(y0, y1, u) + (q() - 0.5) * 26; g.beginPath(); g.ellipse(lx, ly, 6 + q() * 6, 3 + q() * 3, q() * TAU, 0, TAU); g.fill(); }
    }
    if (S.glow) { g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 24; i++) { const a = q() * TAU, rr = R * (0.6 + 0.4 * q()), f = 0.5 + 0.5 * Math.sin(TAU * t * 2 + i); g.fillStyle = css([140, 255, 190], 0.5 * f * (0.3 + night)); g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.6, 0, TAU); g.fill(); } g.restore(); }
  }
  const vg = g.createRadialGradient(cx, cy, R * 0.5, cx, cy, R); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

// ---- sous l'eau --------------------------------------------------------------------------------------
/** Ce qu'il y a sous la surface dans la direction `az` (graine propre) : fond, varech, corail, poissons, fissure… */
function buildUnder(m, az = 0) {
  const { S } = m, W = 300, H = 176, q = rng((S.seed ^ 0x5ea5ea ^ Math.imul(az + 1, 0x2545f491)) >>> 0);
  const floor = Array.from({ length: 41 }, (_, i) => H * (0.8 + 0.06 * Math.sin(i * 0.5 + q() * 2) + 0.04 * q()));
  const life = S.kelp || S.coral || S.glow || S.moths || S.trees || q() < 0.6;
  return {
    W, H, floor, life,
    rays: Array.from({ length: 6 }, () => ({ x: W * q(), w: 8 + 18 * q(), p: q() * TAU })),
    kelp: S.kelp ? Array.from({ length: 9 + Math.floor(q() * 8) }, () => ({ x: W * q(), h: 0.45 + 0.45 * q(), p: q() * TAU, w: 2 + q() * 3, d: q(), leaves: 5 + Math.floor(q() * 6) })) : [],
    coral: S.coral ? Array.from({ length: 10 + Math.floor(q() * 8) }, () => ({ x: W * q(), s: 0.6 + q() * 0.9, hue: [340, 15, 30, 290, 190, 50][Math.floor(q() * 6)], kind: Math.floor(q() * 3), pts: Array.from({ length: 6 }, () => q()) })) : [],
    pits: S.acid ? Array.from({ length: 3 + Math.floor(q() * 3) }, () => ({ x: W * (0.1 + 0.8 * q()), w: 8 + 14 * q(), p: q() })) : [],
    schools: life && !S.acid ? Array.from({ length: 1 + Math.floor(q() * 3) }, () => ({ y: H * (0.25 + 0.4 * q()), sp: (q() < 0.5 ? -1 : 1) * (0.04 + 0.05 * q()), p: q(), n: 5 + Math.floor(q() * 9), hue: [40, 200, 10, 280, 160][Math.floor(q() * 5)], s: 0.8 + q() * 0.8, fish: Array.from({ length: 14 }, () => [q() - 0.5, q() - 0.5, q()]) })) : [],
    snow: Array.from({ length: 50 }, () => ({ x: q(), y: q(), s: 0.6 + q() })),
    bubbles: Array.from({ length: 10 }, () => ({ x: W * q(), p: q(), s: 0.8 + q() * 1.5 })),
    fis: (() => { // une seule direction du périscope montre la crevasse (les autres vues l'ignorent, mais le tirage est le même)
      const d = S.fissure === "submarine" || S.fissure === "open" ? { x: W * (0.25 + 0.5 * q()), pts: Array.from({ length: 7 }, () => q() - 0.5), seed: 1 + ((S.seed >>> 0) % 89) } : null;
      return d && ((S.seed >>> 0) % 4) === (((az % 4) + 4) % 4) ? d : null;
    })(),
    vents: S.lava ? Array.from({ length: 2 }, () => ({ x: W * (0.15 + 0.7 * q()), p: q() })) : [],
    shells: (S.riches || []).includes("pearls") ? Array.from({ length: 3 }, () => ({ x: W * (0.1 + 0.8 * q()), o: q() })) : [],
    glints: (S.riches || []).filter((r) => r !== "pearls").length ? Array.from({ length: 12 }, () => ({ x: W * q(), p: q() })) : [],
    ruin: S.ruins && S.ruins.length && q() < 0.8 ? { x: W * (0.15 + 0.7 * q()), h: H * (0.25 + 0.2 * q()), broken: q() } : null,
    shadow: S.eyes ? { y: H * (0.35 + 0.2 * q()), p: q() } : null,
  };
}

/** Sous la surface : la lumière qui descend, le fond, ce qui y vit. `az` : la direction du périscope. */
function paintUnder(g, m, t, o = {}, az = 0) {
  const k = G.skyState(m, t, o), { S } = m, W = g.canvas.width, H = g.canvas.height; t = k.t;
  m.under = m.under || {}; const U = m.under[az] || (m.under[az] = buildUnder(m, az)), fx = W / U.W, fy = H / U.H;
  const night = k.night, lightK = (S.phys ? clamp(S.phys.light * 1.3, 0.3, 1) : 1) * (S.blackSun ? 0.45 : 1), lit = clamp(0.12 + 0.88 * (1 - night)) * lightK;
  let shallow = mixc(mixc(k.hzc, [40, 150, 160], 0.6), [4, 10, 18], 1 - lit), deep = mixc([4, 22, 34], [1, 3, 6], 0.5 + 0.5 * night);
  if (S.acid) { shallow = mixc(shallow, [150, 170, 50], 0.45); deep = mixc(deep, [30, 36, 8], 0.5); }
  if (S.lava) deep = mixc(deep, [70, 18, 6], 0.45);
  if (S.ice) shallow = mixc(shallow, [150, 200, 230], 0.25 * lit);
  g.save(); g.clearRect(0, 0, W, H);
  const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, css(shallow)); wg.addColorStop(1, css(deep)); g.fillStyle = wg; g.fillRect(0, 0, W, H);
  // la surface vue d'en dessous (ou la glace)
  const sy = H * 0.1;
  if (S.ice) {
    g.fillStyle = css(mixc([190, 225, 245], [10, 16, 26], 1 - lit), 0.92); g.beginPath(); g.moveTo(0, 0);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, sy + 3 * Math.sin(x * 0.07 + 1.3) + 2 * Math.sin(x * 0.21)); g.lineTo(W, 0); g.closePath(); g.fill();
    const q = rng((S.seed ^ 0x1ce) >>> 0); g.strokeStyle = css([240, 250, 255], 0.35 * lit); g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { let x = W * q(), y = 0; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (q() - 0.5) * 30; y += sy * 0.3; g.lineTo(x, y); } g.stroke(); }
  } else {
    g.fillStyle = css(mixc(k.top, [200, 230, 240], 0.35 * lit), 0.55 + 0.3 * lit); g.beginPath(); g.moveTo(0, 0);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, sy + 2.5 * Math.sin(x * 0.08 + TAU * t * 2) + 1.5 * Math.sin(x * 0.19 - TAU * t * 3)); g.lineTo(W, 0); g.closePath(); g.fill();
    g.strokeStyle = css([235, 250, 255], 0.5 * lit); g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = sy + 2.5 * Math.sin(x * 0.08 + TAU * t * 2) + 1.5 * Math.sin(x * 0.19 - TAU * t * 3); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  // les rayons de lumière (le jour)
  if (lit > 0.25) { g.save(); g.globalCompositeOperation = "lighter"; for (const r of U.rays) { const x = r.x * fx + Math.sin(TAU * t + r.p) * 6, w = r.w * fx, gr = g.createLinearGradient(0, sy, 0, H * 0.85); gr.addColorStop(0, css([220, 245, 235], 0.13 * lit)); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(x, sy); g.lineTo(x + w, sy); g.lineTo(x + w * 2.2 + 20, H * 0.85); g.lineTo(x + 20, H * 0.85); g.closePath(); g.fill(); } g.restore(); }
  // une ombre au loin (les chasseurs)
  if (U.shadow) { const x = frac(t * 0.25 + U.shadow.p) * (W + 160) - 80, y = U.shadow.y * fy; g.fillStyle = css(deep, 0.75); g.beginPath(); g.ellipse(x, y, 34, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x - 48, y - 9); g.lineTo(x - 46, y + 8); g.closePath(); g.fill(); if (night > 0.4) { g.fillStyle = "rgba(255,200,90,0.7)"; g.fillRect(x + 26, y - 2, 1.6, 1.6); } }
  // une ruine engloutie
  if (U.ruin) { const x = U.ruin.x * fx, y0 = H * 0.82, h = U.ruin.h * fy; g.fillStyle = css(mixc(deep, shallow, 0.3), 0.85); g.fillRect(x - 7, y0 - h, 14, h); g.fillRect(x - 11, y0 - h - 4, 22, 5); if (U.ruin.broken > 0.5) { g.save(); g.translate(x + 26, y0 - 4); g.rotate(1.3); g.fillRect(-5, -h * 0.4, 10, h * 0.4); g.restore(); } }
  // le varech du fond (plans éloignés plus pâles)
  const kelp = (back) => { for (const kp of U.kelp) { if ((kp.d < 0.45) !== back) continue; const base = H + 2, top = H - H * kp.h, x0 = kp.x * fx, col = mixc(mixc([60, 130, 70], [6, 12, 10], 0.2 + 0.6 * night), deep, back ? 0.5 : 0); g.strokeStyle = css(col, 0.9); g.lineWidth = kp.w * (back ? 0.7 : 1.2); g.lineCap = "round"; g.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12, y = base - (base - top) * u, x = x0 + Math.sin(TAU * t * 0.6 + kp.p + u * 2.6) * 9 * u; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = css(mixc(col, [120, 170, 80], 0.2), 0.8); for (let j = 1; j <= kp.leaves; j++) { const u = j / (kp.leaves + 1), y = base - (base - top) * u, x = x0 + Math.sin(TAU * t * 0.6 + kp.p + u * 2.6) * 9 * u, sd = j % 2 ? 1 : -1; g.beginPath(); g.ellipse(x + sd * 5, y, 6, 2, sd * 0.5, 0, TAU); g.fill(); } } };
  kelp(true);
  // le fond
  const fcol = S.lava ? [20, 12, 12] : S.sand || !S.ice ? [60, 56, 44] : [40, 52, 60];
  g.fillStyle = css(mixc(mixc(fcol, deep, 0.45), [0, 0, 0], 0.4 * night)); g.beginPath(); g.moveTo(0, H);
  U.floor.forEach((y, i) => g.lineTo((i / (U.floor.length - 1)) * W, y * fy)); g.lineTo(W, H); g.closePath(); g.fill();
  if (lit > 0.3) { g.strokeStyle = css([220, 245, 230], 0.08 * lit); g.lineWidth = 0.8; for (let i = 0; i < 9; i++) { g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H * (0.86 + i * 0.016) + 1.6 * Math.sin(x * 0.12 + i + TAU * t); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } } // les reflets de la surface sur le fond
  const floorAt = (x) => { const u = clamp(x / W) * (U.floor.length - 1), i = Math.floor(u); return lerp(U.floor[i], U.floor[Math.min(U.floor.length - 1, i + 1)], u - i) * fy; };
  // l'acide : des creux rongés, des bulles jaunâtres
  for (const p of U.pits) { const x = p.x * fx, y = floorAt(x) + 3; g.fillStyle = css([24, 26, 8], 0.85); g.beginPath(); g.ellipse(x, y, p.w * fx, 3.5, 0, 0, TAU); g.fill(); g.fillStyle = css([150, 80, 30], 0.4); g.beginPath(); g.ellipse(x + p.w * 0.9, y + 1, p.w * 0.5, 2, 0, 0, TAU); g.fill(); for (let i = 0; i < 3; i++) { const qq = frac(t * 0.8 + p.p + i / 3); g.strokeStyle = css([220, 240, 120], 0.6 * (1 - qq)); g.beginPath(); g.arc(x + (i - 1) * 4 + Math.sin(qq * 9) * 2, y - qq * H * 0.5, 1 + qq * 1.5, 0, TAU); g.stroke(); } }
  // les cheminées de lave
  for (const v of U.vents) { const x = v.x * fx, y = floorAt(x); const lg = g.createRadialGradient(x, y, 1, x, y, 30); lg.addColorStop(0, css([255, 120, 40], 0.55 + 0.2 * Math.sin(TAU * t * 2 + v.p * 9))); lg.addColorStop(1, "rgba(255,90,30,0)"); g.fillStyle = lg; g.fillRect(x - 30, y - 30, 60, 60); g.fillStyle = css([25, 14, 12]); g.beginPath(); g.moveTo(x - 9, y + 2); g.lineTo(x - 3, y - 10); g.lineTo(x + 3, y - 10); g.lineTo(x + 9, y + 2); g.closePath(); g.fill(); for (let i = 0; i < 4; i++) { const qq = frac(t + v.p + i / 4); g.fillStyle = css([90, 80, 80], 0.5 * (1 - qq)); g.beginPath(); g.arc(x + Math.sin(qq * 7 + i) * 4, y - 10 - qq * H * 0.6, 2 + qq * 4, 0, TAU); g.fill(); } }
  // la fissure : la voie du retour, une lueur au fond
  if (U.fis) { const x0 = U.fis.x * fx, y = floorAt(x0) + 2, f = 0.6 + 0.4 * Math.sin(TAU * t * 1.5); const lg = g.createRadialGradient(x0, y, 1, x0, y, 40); lg.addColorStop(0, css([200, 240, 255], 0.35 * f)); lg.addColorStop(1, "rgba(200,240,255,0)"); g.fillStyle = lg; g.fillRect(x0 - 40, y - 40, 80, 80); crevasse(g, { x: x0, y0: y - 5, y1: Math.min(H + 6, y + 38 * fy), w: 8 * fx, jit: U.fis.pts, t, water: true, open: G.openingOf(S), seed: U.fis.seed, shape: "lens" }); for (let i = 0; i < 5; i++) { const qq = frac(t * 0.7 + i / 5); g.strokeStyle = css([230, 250, 255], 0.55 * (1 - qq)); g.lineWidth = 0.8; g.beginPath(); g.arc(x0 + Math.sin(qq * 8 + i) * 6, y - qq * H * 0.7, 1 + qq * 2, 0, TAU); g.stroke(); } }
  // le corail
  for (const c of U.coral) {
    const x = c.x * fx, y = floorAt(x) + 2, R = (9 + 8 * c.pts[5]) * c.s * fx, col = css(mixc(hsl(c.hue, 0.7, 0.58), deep, 0.25 + 0.5 * night), 0.92); g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round";
    if (c.kind === 0) { g.lineWidth = Math.max(1.2, R * 0.16); g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.36 + (c.pts[i] - 0.5) * 0.3, l = R * (0.8 + 0.5 * c.pts[i]), mx = x + Math.cos(a) * l * 0.55, my = y + Math.sin(a) * l * 0.55; g.moveTo(x, y); g.lineTo(mx, my); g.lineTo(x + Math.cos(a - 0.3) * l, y + Math.sin(a - 0.3) * l); g.moveTo(mx, my); g.lineTo(x + Math.cos(a + 0.35) * l * 0.9, y + Math.sin(a + 0.35) * l * 0.9); } g.stroke(); }
    else if (c.kind === 1) { g.globalAlpha = 0.85; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R * 1.1, Math.PI * 1.08, Math.PI * 1.92); g.closePath(); g.fill(); g.globalAlpha = 1; g.strokeStyle = css([0, 0, 0], 0.2); g.lineWidth = 0.6; for (let i = 0; i < 6; i++) { const a = Math.PI * (1.1 + 0.8 * (i / 5)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); g.stroke(); } }
    else { g.beginPath(); g.ellipse(x, y - R * 0.3, R * 0.75, R * 0.5, 0, 0, TAU); g.fill(); g.strokeStyle = css([0, 0, 0], 0.25); g.lineWidth = 0.7; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(x, y - R * 0.3, R * (0.2 + 0.14 * i), R * (0.12 + 0.09 * i), 0, Math.PI, TAU); g.stroke(); } }
  }
  // perles et éclats
  for (const s of U.shells) { const x = s.x * fx, y = floorAt(x); const op = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(TAU * t * 0.3 + s.o * 9)); g.fillStyle = css([110, 95, 85]); g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, Math.PI); g.fill(); g.beginPath(); g.ellipse(x, y, 7, 3 + op * 4, 0, Math.PI, TAU); g.fill(); g.fillStyle = css([245, 240, 230], 0.9); g.beginPath(); g.arc(x, y - 1, 1.8, 0, TAU); g.fill(); }
  for (const s of U.glints) { const x = s.x * fx, y = floorAt(x) + 3, f = Math.max(0, Math.sin(TAU * (t * 1.3 + s.p))); if (f > 0.6) { g.fillStyle = css([255, 225, 140], (f - 0.6) * 2 * (0.4 + lit)); g.fillRect(x - 1, y - 1, 2, 2); } }
  kelp(false);
  // les poissons
  for (const sc of U.schools) {
    const cx0 = frac(t * Math.abs(sc.sp) * 4 + sc.p) * (W + 120) - 60, cx = sc.sp > 0 ? cx0 : W - cx0, cy = sc.y * fy + Math.sin(TAU * t + sc.p * 9) * 6, glow = S.glow && night > 0.4;
    for (const [dx, dy, ph] of sc.fish.slice(0, sc.n)) {
      const x = cx + dx * 50, y = cy + dy * 22 + Math.sin(TAU * t * 3 + ph * 9) * 1.5, L = 5 * sc.s, dir = sc.sp > 0 ? 1 : -1;
      g.fillStyle = glow ? css([140, 255, 220], 0.85) : css(mixc(hsl(sc.hue, 0.5, 0.55), deep, 0.35 + 0.5 * night), 0.9);
      g.beginPath(); g.ellipse(x, y, L, L * 0.38, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - dir * L * 0.8, y); g.lineTo(x - dir * L * 1.6, y - L * 0.45); g.lineTo(x - dir * L * 1.6, y + L * 0.45); g.closePath(); g.fill();
    }
  }
  // la neige marine et les bulles
  for (const s of U.snow) { const x = frac(s.x + Math.sin(TAU * t * 0.2 + s.y * 9) * 0.01) * W, y = frac(s.y + t * 0.05 * s.s) * H; g.fillStyle = css([210, 230, 225], 0.25 * (0.4 + lit)); g.fillRect(x, y, s.s, s.s); }
  for (const b of U.bubbles) { const q = frac(t * 0.5 * b.s + b.p), x = b.x * fx + Math.sin(q * 12 + b.p * 9) * 3, y = H - q * (H - sy); g.strokeStyle = css([230, 250, 255], 0.4 * (1 - q * 0.5)); g.lineWidth = 0.7; g.beginPath(); g.arc(x, y, b.s, 0, TAU); g.stroke(); }
  // l'eau qui voile : plus on regarde loin, plus c'est trouble
  const fg = g.createLinearGradient(0, sy, 0, H); fg.addColorStop(0, css(shallow, 0.05)); fg.addColorStop(0.6, css(mixc(shallow, deep, 0.5), S.acid ? 0.35 : 0.15)); fg.addColorStop(1, css(deep, 0.1)); g.fillStyle = fg; g.fillRect(0, sy, W, H - sy);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.restore();
}

/** Peint une vue du périscope : `tilt` 1 = zénith, 0 = horizon, −1 = sous l'eau ; `az` 0 à 3. */
function paintLook(g, m0, t, o, az, tilt) {
  if (tilt > 0 || (tilt < 0 && hasUnder(m0))) {
    if (tilt > 0) paintZenith(g, m0, t, o); else paintUnder(g, m0, t, o, az);
    const p = G.doomOf(m0.S); if (p > 0) G.doomVeil(g, g.canvas.width, g.canvas.height, p, g.canvas.width / 2, g.canvas.height * (tilt > 0 ? 0.5 : 0.2)); // la fin d'un Âge se voit sous l'eau et au zénith aussi
    return;
  }
  return G.paint(g, heading(m0, az), t, o);
}

module.exports = { heading, hasUnder, paintZenith, paintUnder, buildUnder, paintLook };
