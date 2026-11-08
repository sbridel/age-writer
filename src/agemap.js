"use strict";
/**
 * ESSAI 2.9 : la carte de l'Âge (claude/DESIGN-pistes-8-nov.md, § 1). Un relevé vu de dessus, à l'encre sur parchemin : la vue de face et les trois
 * autres directions du périscope, le point d'arrivée au centre (une marque discrète). Tout vient des modèles de la fenêtre : chaque point du sol
 * vu à l'écran (x, y) devient un point du sol (latéral u, profondeur z), puis la carte le pose tourné selon la direction.
 * Habillage : rose des vents (le nord vers le pôle, la flèche du vent), échelle en pas, cartouche au nom de l'Âge, les temps de l'eau (marées : rive haute
 * et rive basse ; mousson : le lit large et le lit étroit). Le papier vieillit avec l'Âge ; un Âge instable a des blancs non relevés. Pas de noms de lieux.
 */
const G = require("./genscene");
const V = require("./genviews");
const { rng, clamp, lerp } = require("./util");
const { mixc, css } = G;
const TAU = Math.PI * 2;
const ZK = 6; /* la profondeur se resserre vers le bord (tanh) : à l'échelle près du centre, l'horizon au bord de la carte */
const FOV = Math.PI / 4 / Math.atan(1 / 1.1); /* la fenêtre voit ±42° ; la carte étire jusqu'à ±45° pour que les quatre directions se touchent */
const PACES = 12; /* une unité de profondeur ≈ douze pas */

/** de l'écran au sol : u latéral (à droite > 0), z profondeur (1 = à nos pieds). */
const ground = (m, x, y) => { const D = m.H - m.hz, z = clamp(D / Math.max(0.5, y - m.hz), 1, 40); return { u: ((x - m.W / 2) * z) / (m.W * 0.55), z }; };

/** Le relevé d'une direction : formes en coordonnées du sol. */
function survey(m, k) {
  const { S, W, H, hz } = m, D = H - hz, out = { k, water: null, shoreLines: [], tideLines: [], rivers: [], ponds: [], works: [], trees: [], path: [], fissure: null, relief: null, pier: null, sea: false, cave: S.world === "cavern" };
  const poly = (pts) => pts.map(([x, y]) => ground(m, x, Math.max(y, hz + D / 40)));
  if (m.shore) { out.water = poly(m.shore.wet); out.shoreLines.push(poly(m.shore.line));
    if (S.tides && m._tide !== null) { const sh = m.shore, off = sh.mode === "side" ? [(sh.side < 0 ? 1 : -1) * W * 0.11 * 0.7, 0] : [0, (sh.mode === "far" ? 1 : -1) * D * 0.09 * 0.7]; out.tideLines.push(poly(sh.line.map(([x, y]) => [x + off[0], y + off[1]]))); } }
  else if (S.water && S.waterGround !== false && !S.ice) out.sea = true;
  if (m.riverGeo && S.river && !k) { /* la rivière de face seulement : le périscope en tire une par direction, la carte n'en garde qu'une */ const R = m.riverGeo, pts = []; for (let z = 1.02; z <= 30; z *= 1.08) pts.push({ z, u: R.u0 + R.amp * Math.sin(R.ph + z * 0.55) * Math.min(1, z * 0.3) }); out.rivers.push({ pts, wid: R.wid, wid0: R.wid0 || R.wid, frozen: !!(S.freeze && S.freeze.ice > 0.5) }); }
  if (m.pond) { const P = m.pond, c = ground(m, P.cx, P.cy), rz = ground(m, P.cx, P.cy - P.ry), ru = ground(m, P.cx + P.rx, P.cy); out.ponds.push({ u: c.u, z: c.z, ru: Math.abs(ru.u - c.u), rz: Math.abs(rz.z - c.z) * 0.6, oasis: !!P.oasis, bed: P.bed ? 1 / Math.max(0.2, P.rx / P.bed.rx) : 1, frozen: !!(S.freeze && S.freeze.ice > 0.5) }); }
  for (const rn of m.ruins || []) if (rn.by != null) { const p = ground(m, rn.x, rn.by); out.works.push({ ...p, k: rn.k }); }
  for (const tr of m.trees || []) if (tr.by != null) out.trees.push(ground(m, tr.x, tr.by));
  if (m.path) for (const seg of m.path.segs) out.path.push(seg.map((p) => ({ ...ground(m, p.x, p.y), wet: p.wet })));
  if (S.fissure && S.fissure !== "submarine" && m.fis && !k) { const y0 = hz + D * 0.2, y1 = hz + D * 0.6; out.fissure = [ground(m, m.fis.x, y0), ground(m, m.fis.x + W * 0.02, (y0 + y1) / 2), ground(m, m.fis.x - W * 0.01, y1)]; }
  if (m.pierV) out.pier = [ground(m, m.pierV.x0, H - 2), ground(m, m.pierV.x1, m.pierV.y1)];
  out.relief = S.terrain === "mountains" || S.terrain === "canyon" ? "mountains" : S.terrain === "hills" || (m.ridges || []).length > 2 ? "hills" : (m.ridges || []).length ? "low" : null;
  out.ground = S.lava ? "lava" : S.ice || S.world === "frozen" ? "ice" : S.sand || S.world === "desert" ? "sand" : S.grass || S.alive ? "grass" : "rock";
  return out;
}

/**
 * Peint la carte dans `g` (carré conseillé). `m0` : le modèle de la vue de face (G.build). o : { name, stability (0–100), seed }.
 */
function paintMap(g, m0, o = {}) {
  const W = g.canvas.width, H = g.canvas.height, S = m0.S, q = rng(((S.seed ^ 0xca27e) >>> 0) || 1), cx = W / 2, cy = H * 0.47, R = Math.min(W, H) * 0.4;
  const age = clamp(S.age != null ? S.age / 4 : 0.3), doom = G.doomOf(S) || 0, stab = o.stability != null ? o.stability : 80;
  const paper = mixc([236, 222, 188], [214, 190, 146], age * 0.6), ink = mixc([62, 40, 22], [120, 94, 66], age * 0.5), inkC = (a = 1) => css(ink, a), wash = (c, a) => css(mixc(paper, c, 0.5), a);
  /* le parchemin */
  g.save(); g.fillStyle = css(paper); g.fillRect(0, 0, W, H);
  for (let k = 0; k < 40; k++) { g.fillStyle = css(mixc(paper, [150, 110, 60], 0.15), 0.05 + 0.05 * q()); g.beginPath(); g.ellipse(W * q(), H * q(), W * (0.05 + 0.15 * q()), H * (0.03 + 0.1 * q()), q() * 3, 0, TAU); g.fill(); } /* le grain */
  const at = (k, u, z) => { const th = Math.atan2(u, z) * FOV + (k * Math.PI) / 2, d = Math.max(0, Math.hypot(u, z) - 0.5), r = Math.tanh(d / ZK) * R * 0.97; return [cx + Math.sin(th) * r, cy - Math.cos(th) * r]; };
  const sector = (k) => { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 + (k * Math.PI) / 2 - Math.PI / 4, -Math.PI / 2 + (k * Math.PI) / 2 + Math.PI / 4); g.closePath(); };
  const ms = [0, 1, 2, 3].map((k) => (k ? V.heading(m0, k) : m0)), sv = ms.map((m, k) => survey(m, k));
  const hatch = (k, a = 0.35, step = 5) => { g.save(); sector(k); g.clip(); g.strokeStyle = css(mixc(ink, [60, 90, 120], 0.5), a); g.lineWidth = 0.7; for (let y = cy - R; y < cy + R; y += step) { g.beginPath(); g.moveTo(cx - R, y); g.lineTo(cx + R, y + 1.5); g.stroke(); } g.restore(); };
  const line = (k, pts, dash, lw = 1.1, a = 0.9) => { if (pts.length < 2) return; g.setLineDash(dash || []); g.strokeStyle = inkC(a); g.lineWidth = lw; g.beginPath(); pts.forEach((p, i) => { const [x, y] = at(k, p.u, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); };
  for (const s of sv) { const k = s.k;
    g.save(); sector(k); g.clip();
    { const qg = rng(((S.seed ^ (0x9e0 + k)) >>> 0) || 1); g.strokeStyle = inkC(0.38); g.fillStyle = inkC(0.35); g.lineWidth = 0.7; /* le sol, d'un signe par sorte : dunes, touffes, points de roche, croix de glace, coulées */
      for (let j = 0; j < 90; j++) { const a = -Math.PI / 2 + (k * Math.PI) / 2 + (qg() - 0.5) * (Math.PI / 2), d = R * Math.sqrt(qg()) * 0.95, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, z = 3 + 3 * qg();
        if (s.ground === "sand") { if (j % 2) { g.beginPath(); g.moveTo(x - z * 2, y); g.quadraticCurveTo(x - z * 0.5, y - z * 1.1, x + z * 0.6, y - z * 0.2); g.quadraticCurveTo(x + z * 1.2, y + z * 0.3, x + z * 2.2, y); g.stroke(); } }
        else if (s.ground === "grass") { if (j % 2 === 0) { g.beginPath(); g.moveTo(x - z * 0.5, y); g.lineTo(x - z * 0.15, y - z * 0.6); g.moveTo(x, y); g.lineTo(x, y - z * 0.8); g.moveTo(x + z * 0.5, y); g.lineTo(x + z * 0.15, y - z * 0.6); g.stroke(); } }
        else if (s.ground === "ice") { if (j % 3 === 0) { g.beginPath(); g.moveTo(x - z * 0.4, y); g.lineTo(x + z * 0.4, y); g.moveTo(x, y - z * 0.4); g.lineTo(x, y + z * 0.4); g.stroke(); } }
        else if (s.ground === "lava") { if (j % 3 === 0) { g.beginPath(); g.moveTo(x - z, y - z * 0.3); g.lineTo(x + z, y + z * 0.3); g.stroke(); } }
        else { g.beginPath(); g.arc(x, y, 0.7, 0, TAU); g.fill(); } } }
    if (s.sea) { g.fillStyle = wash([150, 180, 196], 0.55); sector(k); g.fill(); hatch(k); }
    if (s.water) { g.fillStyle = wash([150, 180, 196], 0.55); g.beginPath(); s.water.forEach((p, i) => { const [x, y] = at(k, p.u, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); g.save(); g.clip(); hatch(k); g.restore(); }
    for (const L of s.shoreLines) line(k, L, null, 1.4);
    for (const L of s.tideLines) line(k, L, [3, 3], 0.9, 0.7); /* la rive basse, en tirets */
    for (const Rv of s.rivers) { const side = (w) => [Rv.pts.map((p) => ({ u: p.u - w, z: p.z })), Rv.pts.map((p) => ({ u: p.u + w, z: p.z }))];
      if (Rv.wid0 > Rv.wid * 1.05) for (const L of side(Rv.wid0)) line(k, L, [2, 3], 0.8, 0.7); /* le lit large de la mousson */
      const [a, b] = side(Rv.wid); g.fillStyle = Rv.frozen ? wash([220, 230, 236], 0.8) : wash([150, 180, 196], 0.7); g.beginPath(); a.forEach((p, i) => { const [x, y] = at(k, p.u, p.z); i ? g.lineTo(x, y) : g.moveTo(x, y); }); for (let i = b.length - 1; i >= 0; i--) { const [x, y] = at(k, b[i].u, b[i].z); g.lineTo(x, y); } g.closePath(); g.fill(); line(k, a, null, 1); line(k, b, null, 1); }
    for (const P of s.ponds) { const [x, y] = at(k, P.u, P.z), sc = ((R * 0.97) / ZK) * (1 - Math.tanh(Math.hypot(P.u, P.z) / ZK) ** 2); g.fillStyle = P.frozen ? wash([220, 230, 236], 0.85) : wash(P.oasis ? [110, 170, 200] : [150, 180, 196], 0.75); g.beginPath(); g.ellipse(x, y, Math.max(3, P.ru * sc), Math.max(2.5, P.rz * sc), (k * Math.PI) / 2, 0, TAU); g.fill(); g.strokeStyle = inkC(); g.lineWidth = 1; g.stroke();
      if (P.bed > 1.05) { g.setLineDash([2, 3]); g.beginPath(); g.ellipse(x, y, Math.max(3, P.ru * sc) * P.bed, Math.max(2.5, P.rz * sc) * P.bed, (k * Math.PI) / 2, 0, TAU); g.stroke(); g.setLineDash([]); } /* l'ancien bord */
      if (P.oasis) for (let j = 0; j < 5; j++) { const a = (j / 5) * TAU, px = x + Math.cos(a) * (P.ru * sc + 6), py = y + Math.sin(a) * (P.rz * sc + 5); g.strokeStyle = inkC(0.8); g.lineWidth = 0.8; for (let l = 0; l < 4; l++) { const b = (l / 4) * TAU; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * 3.5, py + Math.sin(b) * 3.5); g.stroke(); } } } /* les palmiers, en étoiles */
    for (const p of s.trees) { const [x, y] = at(k, p.u, p.z), tc = W / 360; g.strokeStyle = inkC(0.85); g.lineWidth = 0.9; g.beginPath(); for (let j = 0; j < 7; j++) { const a = (j / 7) * TAU, rr = (4 + (j % 2) * 1.2) * tc; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.stroke(); g.fillStyle = inkC(0.8); g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); } /* l'arbre en couronne */
    if (s.fissure) { g.strokeStyle = inkC(); g.lineWidth = doom > 0.3 ? 3 : 1.6; g.beginPath(); s.fissure.forEach((p, i) => { const [x, y] = at(k, p.u, p.z); i ? g.lineTo(x + 3, y) : g.moveTo(x, y); }); g.stroke(); }
    for (const seg of s.path) line(k, seg, [1.5, 3], 1.3, 0.85); /* le chemin, en pointillé */
    if (s.pier) { const [a, b] = s.pier.map((p) => at(k, p.u, p.z)); g.strokeStyle = inkC(); g.lineWidth = 4; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.strokeStyle = css(paper); g.lineWidth = 2.4; g.stroke(); }
    for (const w of s.works) workMark(g, ...at(k, w.u, w.z), w.k, inkC);
    g.restore();
    /* le relief au bord : des hachures en éventail sur l'arc de la direction */
    if (s.relief) { const a0 = -Math.PI / 2 + (k * Math.PI) / 2 - Math.PI / 4; for (let j = 0; j < 22; j++) { const a = a0 + ((j + 0.5) / 22) * (Math.PI / 2), r0 = R * (s.relief === "mountains" ? 0.82 : 0.9), r1 = R * 0.99; g.strokeStyle = inkC(0.6); g.lineWidth = s.relief === "mountains" ? 1.1 : 0.7;
      if (s.relief === "mountains" && j % 3 === 0) { const ra = r0 + (r1 - r0) * 0.3; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.04) * r1, cy + Math.sin(a - 0.04) * r1); g.lineTo(cx + Math.cos(a) * ra, cy + Math.sin(a) * ra); g.lineTo(cx + Math.cos(a + 0.04) * r1, cy + Math.sin(a + 0.04) * r1); g.stroke(); } else if (s.relief !== "low" || j % 2) { g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); } } }
  }
  /* le bord du relevé */
  g.strokeStyle = inkC(); g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.lineWidth = 0.6; g.beginPath(); g.arc(cx, cy, R + 4, 0, TAU); g.stroke();
  /* les blancs non relevés : un Âge instable ou qui se dégrade */
  const nb = Math.round(clamp((100 - stab) / 20) * 3 + doom * 4);
  for (let j = 0; j < nb; j++) { const a = q() * TAU, d = R * (0.3 + 0.6 * q()), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, rx = R * (0.1 + 0.12 * q()), ry = rx * (0.5 + 0.4 * q());
    g.fillStyle = css(paper); g.beginPath(); g.ellipse(x, y, rx, ry, q() * 3, 0, TAU); g.fill(); g.setLineDash([2, 3]); g.strokeStyle = inkC(0.5); g.lineWidth = 0.7; g.stroke(); g.setLineDash([]); }
  /* le point d'arrivée : un petit cercle, rien d'écrit */
  g.strokeStyle = inkC(); g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, 3.5, 0, TAU); g.stroke(); g.fillStyle = inkC(); g.beginPath(); g.arc(cx, cy, 1.2, 0, TAU); g.fill();
  rose(g, m0, W * 0.86, H * 0.14, Math.min(W, H) * 0.08, inkC, paper);
  /* l'échelle en pas */
  { const x0 = W * 0.08, y0 = H * 0.9, u = (R * 0.97) / ZK, n = 3; /* l'échelle vaut près du centre */ g.strokeStyle = inkC(); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + u * n, y0); g.stroke(); for (let j = 0; j <= n; j++) { g.beginPath(); g.moveTo(x0 + u * j, y0 - 3); g.lineTo(x0 + u * j, y0 + 3); g.stroke(); if (j < n && j % 2 === 0) { g.fillStyle = inkC(0.8); g.fillRect(x0 + u * j, y0 - 1.5, u, 3); } }
    g.fillStyle = inkC(); g.font = `italic ${Math.round(H * 0.026)}px Georgia, serif`; g.textAlign = "left"; g.fillText(`${n * PACES} pas`, x0 + u * n + 6, y0 + 4); }
  /* le cartouche au nom de l'Âge */
  if (o.name) { const fs = Math.round(H * 0.04); g.font = `${fs}px Georgia, serif`; const tw = (g.measureText(o.name) || {}).width || o.name.length * fs * 0.5, bw = tw + fs * 2, bh = fs * 1.7, bx = W - bw - W * 0.05, by = H * 0.86;
    g.fillStyle = css(mixc(paper, [255, 250, 236], 0.4)); g.fillRect(bx, by, bw, bh); g.strokeStyle = inkC(); g.lineWidth = 1.4; g.strokeRect(bx, by, bw, bh); g.lineWidth = 0.6; g.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);
    g.fillStyle = inkC(); g.textAlign = "center"; g.fillText(o.name, bx + bw / 2, by + bh * 0.68); }
  /* le papier vieillit : des taches, un coin usé */
  for (let j = 0; j < Math.round(age * 7); j++) { const x = W * q(), y = H * q(), r = W * (0.02 + 0.05 * q()); const st = g.createRadialGradient(x, y, 0, x, y, r); st.addColorStop(0, css([140, 96, 50], 0.12 + 0.12 * age)); st.addColorStop(0.7, css([140, 96, 50], 0.05)); st.addColorStop(1, css([140, 96, 50], 0)); g.fillStyle = st; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  if (age > 0.45) { const c = W * 0.07 * age; g.fillStyle = "rgba(0,0,0,0)"; g.globalCompositeOperation = "destination-out"; g.beginPath(); g.moveTo(W, H - c); g.lineTo(W, H); g.lineTo(W - c * 1.3, H); g.closePath(); g.fillStyle = "#000"; g.fill(); g.globalCompositeOperation = "source-over"; }
  g.restore();
}

/** Les signes des œuvres : la tour (un cercle et son point), le phare (une étoile), le moulin (une croix d'ailes), le pont (deux traits), les ruines (un carré hachuré). */
function workMark(g, x0, y0, k, inkC) {
  const c = g.canvas.width / 360; g.save(); g.translate(x0, y0); g.scale(c, c); const x = 0, y = 0; /* des signes à la taille de la carte */
  g.fillStyle = "rgba(236, 222, 188, 0.9)"; g.beginPath(); g.arc(0, 0, 7.5, 0, TAU); g.fill(); /* un peu de papier sous le signe */
  g.strokeStyle = inkC(); g.fillStyle = inkC(); g.lineWidth = 1.2;
  if (k === "tower") { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
  else if (k === "lighthouse") { for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU, r = j % 2 ? 2.5 : 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); } }
  else if (k === "mill") { g.strokeRect(x - 2.5, y - 2.5, 5, 5); g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.stroke(); }
  else if (k === "bridge") { g.beginPath(); g.moveTo(x - 7, y - 2); g.lineTo(x + 7, y - 2); g.moveTo(x - 7, y + 2); g.lineTo(x + 7, y + 2); g.stroke(); }
  else if (k === "stairs") { for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x - 4, y - 4 + j * 2.5); g.lineTo(x + 4, y - 4 + j * 2.5); g.stroke(); } }
  else { g.strokeRect(x - 4, y - 3, 8, 6); g.beginPath(); g.moveTo(x - 4, y + 3); g.lineTo(x + 4, y - 3); g.moveTo(x - 1, y + 3); g.lineTo(x + 4, y); g.stroke(); }
  g.restore();
}

/** La rose des vents : le nord vers le pôle (selon où regarde la vue de face), une flèche pour le vent du lieu. */
function rose(g, m0, x, y, r, inkC, paper) {
  const V0 = m0.S.view || {}, face = V0.face || "eq", toPole = { eq: Math.PI, pole: 0, east: -Math.PI / 2, west: Math.PI / 2 }[face], wd = G.windMode(m0.S), fromA = toPole + ({ pole: 0, east: Math.PI / 2, west: -Math.PI / 2 }[wd.from] || 0);
  g.save(); g.translate(x, y); g.strokeStyle = inkC(); g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.stroke();
  g.rotate(toPole); for (let j = 0; j < 4; j++) { g.rotate(Math.PI / 2); g.fillStyle = j === 3 ? inkC() : css(paper); g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.16, 0); g.lineTo(-r * 0.16, 0); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = inkC(); g.font = `${Math.round(r * 0.32)}px Georgia, serif`; g.textAlign = "center"; g.fillText("N", 0, -r * 1.12); g.restore();
  g.save(); g.translate(x, y); g.rotate(fromA + Math.PI); g.strokeStyle = inkC(0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -r * 1.5); g.lineTo(0, -r * 0.75); g.stroke(); g.beginPath(); g.moveTo(-r * 0.12, -r * 0.92); g.lineTo(0, -r * 0.75); g.lineTo(r * 0.12, -r * 0.92); g.stroke(); /* le vent souffle de là */
  for (const d of [0.05, 0.12]) { g.beginPath(); g.moveTo(0, -r * (1.5 - d * 3)); g.lineTo(r * 0.14, -r * (1.55 - d * 3)); g.stroke(); } g.restore();
  void lerp;
}

module.exports = { paintMap, survey, ground };
