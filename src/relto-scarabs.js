"use strict";
/*
 * Les scarabées, après le 17 (26 oct. 2026, idée de l'auteur ; maquette, pas encore branchée).
 * - L'accord : ils sont libres. Une serre de verre contre la cabane, de la mousse, des fougères, une flaque ; ils y vivent, tranquilles.
 * - Le commandement : une vitrine de verre et de laiton sur le bureau de l'atelier, le couvercle scellé du serpent ; ils ne bougent pas.
 * Leur usage (l'encre qu'ils laissent) viendra plus tard ; ici on ne fait que regarder.
 */
const { rgba } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const q = (k) => { let h = 2166136261; for (const ch of String(k)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };

/** Un scarabée vivant, vu d'au-dessus : (x, y) son centre, `s` sa demi-longueur, `a` l'angle où il regarde. o : { walk (0 à 1 : il marche), glow, dull (terne, en cage) } */
function beetle(ctx, x, y, s, a, t, o = {}) {
  const walk = o.walk || 0, ph = t * 9 + x * 0.3;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (o.glow) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 3); g.addColorStop(0, rgba(120, 220, 190, 0.22 * o.glow)); g.addColorStop(1, rgba(120, 220, 190, 0)); ctx.fillStyle = g; ctx.fillRect(-s * 3, -s * 3, s * 6, s * 6); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.2, s * 0.95, s * 0.6, 0, 0, TAU); ctx.fill(); /* l'ombre */
  ctx.strokeStyle = o.dull ? "#2a2620" : "#1a1410"; ctx.lineWidth = Math.max(0.6, s * 0.09); ctx.lineCap = "round";
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { /* six pattes, qui bougent en marchant */
    const bx = s * (0.35 - k * 0.35), sw = walk * Math.sin(ph + k * 2.1 + (sd > 0 ? Math.PI : 0)) * s * 0.18;
    ctx.beginPath(); ctx.moveTo(bx, sd * s * 0.3); ctx.lineTo(bx + s * 0.1 + sw, sd * s * 0.62); ctx.lineTo(bx + s * (k === 0 ? 0.35 : k === 1 ? 0.05 : -0.3) + sw, sd * s * 0.82); ctx.stroke();
  }
  ctx.lineWidth = Math.max(0.5, s * 0.05); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.9, sd * s * 0.12); ctx.quadraticCurveTo(s * 1.15, sd * s * 0.2, s * 1.25, sd * s * 0.38); ctx.stroke(); } /* les antennes */
  ctx.lineCap = "butt";
  const base = o.dull ? ["#2e2a24", "#4a443a", "#6a6252"] : ["#10241f", "#1f4a40", "#5fb59c"];
  const g = ctx.createLinearGradient(-s, -s * 0.6, s * 0.4, s * 0.6); g.addColorStop(0, base[0]); g.addColorStop(0.55, base[1]); g.addColorStop(1, base[0]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-s * 0.15, 0, s * 0.78, s * 0.5, 0, 0, TAU); ctx.fill(); /* les élytres */
  ctx.strokeStyle = rgba(0, 0, 0, 0.5); ctx.lineWidth = Math.max(0.5, s * 0.05); ctx.beginPath(); ctx.moveTo(s * 0.45, 0); ctx.lineTo(-s * 0.9, 0); ctx.stroke(); /* la suture */
  ctx.fillStyle = base[1]; ctx.beginPath(); ctx.ellipse(s * 0.55, 0, s * 0.26, s * 0.34, 0, 0, TAU); ctx.fill(); /* le corselet */
  ctx.fillStyle = base[0]; ctx.beginPath(); ctx.ellipse(s * 0.86, 0, s * 0.14, s * 0.18, 0, 0, TAU); ctx.fill(); /* la tête */
  ctx.fillStyle = rgba(255, 255, 255, o.dull ? 0.06 : 0.22); ctx.beginPath(); ctx.ellipse(-s * 0.25, -s * 0.22, s * 0.35, s * 0.08, -0.15, 0, TAU); ctx.fill(); /* le reflet irisé */
  if (!o.dull) { ctx.fillStyle = base[2]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.18, s * 0.3, s * 0.06, 0.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}

/** Où marche un scarabée de la serre, à l'instant t : un tour lent autour de son coin, avec des haltes. */
function pathOf(i, t, cx, cy, rx, ry) {
  const sp = 0.05 + q("sp" + i) * 0.06, ph = q("ph" + i) * TAU, u = t * sp + ph, halt = (Math.sin(t * 0.37 + i * 1.7) + 1) / 2 < 0.35;
  const uu = halt ? Math.floor(u * 4) / 4 : u;
  const x = cx + Math.cos(uu * TAU) * rx, y = cy + Math.sin(uu * TAU * 2) * ry, a = Math.atan2(Math.cos(uu * TAU * 2) * ry * 2, -Math.sin(uu * TAU) * rx);
  return { x, y, a, walk: halt ? 0 : 1 };
}

/** La serre (l'accord) : verrière en arc, montants de cuivre, un lit de mousse, des fougères, une flaque ; les scarabées y vivent. */
function drawSerre(r, ctx, sc, sky, t) {
  const amb = 0.6 + 0.4 * sky.ambient, night = sky.night || 0;
  /* le ciel à travers le verre, et la voûte de verre */
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, night > 0.5 ? "#0e1a24" : "#9cc4cf"); g.addColorStop(1, night > 0.5 ? "#16262a" : "#d6e6dc"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgba(30, 60, 50, 0.18); ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, 250); ctx.quadraticCurveTo(320, -120, 610, 250); ctx.stroke(); /* l'arc de cuivre */
  ctx.lineWidth = 2; for (let k = 1; k < 8; k++) { const x = 30 + (580 * k) / 8, top = 250 - Math.sin((Math.PI * k) / 8) * 185; ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x, top); ctx.stroke(); } /* les montants */
  for (const yy of [210, 160]) { ctx.beginPath(); ctx.moveTo(30, yy); ctx.lineTo(610, yy); ctx.stroke(); }
  ctx.fillStyle = rgba(255, 255, 255, 0.06); for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(40 + k * 72, 240); ctx.lineTo(70 + k * 72, 120); ctx.lineTo(80 + k * 72, 120); ctx.lineTo(50 + k * 72, 240); ctx.fill(); } /* les reflets du verre */
  /* le sol : de la terre, un lit de mousse, une flaque */
  const sg = ctx.createLinearGradient(0, 240, 0, H); sg.addColorStop(0, "#2a2418"); sg.addColorStop(1, "#14110c"); ctx.fillStyle = sg; ctx.fillRect(0, 240, W, H - 240);
  for (let i = 0; i < 60; i++) { const x = q("mx" + i) * W, y = 252 + q("my" + i) * 90, rr = 8 + q("mr" + i) * 22; ctx.fillStyle = rgba(60 + q("mc" + i) * 30, 100 + q("md" + i) * 40, 50, 0.55); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.4, 0, 0, TAU); ctx.fill(); } /* la mousse */
  ctx.fillStyle = "#1c2e30"; ctx.beginPath(); ctx.ellipse(430, 312, 80, 16, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(160, 210, 220, 0.25); ctx.lineWidth = 1; ctx.stroke(); /* la flaque */
  ctx.fillStyle = rgba(200, 230, 240, 0.12); ctx.beginPath(); ctx.ellipse(410, 308, 30, 3, 0, 0, TAU); ctx.fill();
  /* des fougères, en crosses et en palmes */
  for (const [fx, fy, fs] of [[90, 262, 1.2], [190, 256, 0.9], [560, 262, 1.3], [300, 250, 0.8]]) {
    ctx.strokeStyle = "#2f6a3e"; ctx.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.32; ctx.beginPath(); ctx.moveTo(fx, fy); const ex = fx + Math.cos(a) * 60 * fs, ey = fy + Math.sin(a) * 60 * fs; ctx.quadraticCurveTo(fx + Math.cos(a) * 30 * fs + k * 4, fy + Math.sin(a) * 40 * fs, ex, ey); ctx.stroke();
      for (let j = 1; j < 9; j++) { const u = j / 9, px = fx + (ex - fx) * u, py = fy + (ey - fy) * u, n = 9 * fs * (1 - u * 0.7); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a + 1.3) * n, py + Math.sin(a + 1.3) * n); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a - 1.3) * n, py + Math.sin(a - 1.3) * n); ctx.stroke(); } }
  }
  /* les scarabées : six, chacun son coin, qui marchent et s'arrêtent */
  const spots = [[150, 300, 40, 10], [260, 318, 50, 8], [370, 286, 30, 8], [520, 300, 36, 12], [600, 330, 20, 6], [90, 330, 28, 6]];
  spots.forEach(([cx, cy, rx, ry], i) => { const p = pathOf(i, t, cx, cy, rx, ry); beetle(ctx, p.x, p.y, 11 + q("s" + i) * 5, p.a, t, { walk: p.walk, glow: night }); });
  if (night > 0.3) { ctx.fillStyle = rgba(0, 0, 0, 0.45 * night); ctx.fillRect(0, 0, W, H); spots.forEach(([cx, cy, rx, ry], i) => { const p = pathOf(i, t, cx, cy, rx, ry); const gl = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 16); gl.addColorStop(0, rgba(140, 230, 200, 0.5 * night)); gl.addColorStop(1, rgba(140, 230, 200, 0)); ctx.fillStyle = gl; ctx.fillRect(p.x - 16, p.y - 16, 32, 32); }); } /* la nuit, leur dos luit */
  void r; void sc; void amb;
}

/** La vitrine (le commandement) : une boîte de verre et de laiton posée sur le bureau, des scarabées immobiles sur un lit de feutre, le couvercle scellé du serpent. (x, y) : le coin haut gauche ; w, h : la boîte. */
function vitrine(ctx, c, x, y, w, h, t) {
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(x + 4, y + h - 2, w, 6); /* l'ombre sur le bureau */
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(x, y + h - 10, w, 10); /* le socle */
  ctx.fillStyle = c("#3a2a3a"); ctx.fillRect(x + 4, y + 8, w - 8, h - 18); /* le feutre, au fond */
  [[0.25, 0.45, 0.4], [0.5, 0.35, -0.2], [0.72, 0.55, 2.8], [0.4, 0.7, 1.4]].forEach(([u, v, a], i) => beetle(ctx, x + w * u, y + 8 + (h - 18) * v, 9 + i % 2 * 2, a, t, { dull: true })); /* ils ne bougent pas */
  ctx.fillStyle = rgba(200, 220, 230, 0.1); ctx.fillRect(x + 4, y + 8, w - 8, h - 18); /* le verre */
  ctx.fillStyle = rgba(255, 255, 255, 0.12); ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 26, y + 10); ctx.lineTo(x + 12, y + h - 12); ctx.lineTo(x + 6, y + h - 12); ctx.fill(); /* un reflet */
  ctx.strokeStyle = c("#b08a3a"); ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 7, w - 6, h - 16); /* le cadre de laiton */
  ctx.fillStyle = c("#b08a3a"); ctx.fillRect(x, y, w, 8); ctx.fillStyle = c("#7a5a22"); ctx.fillRect(x, y + 6, w, 2); /* le couvercle */
  const sx = x + w / 2, sy = y + 4; ctx.fillStyle = c("#7a1f1f"); ctx.beginPath(); ctx.arc(sx, sy + 2, 7, 0, TAU); ctx.fill(); /* le cachet de cire, à cheval sur le couvercle */
  ctx.strokeStyle = c("#c44a3a"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.quadraticCurveTo(sx - 1, sy - 2, sx + 1, sy + 3); ctx.quadraticCurveTo(sx + 3, sy + 7, sx + 4, sy); ctx.stroke(); /* le serpent */
}

module.exports = { beetle, pathOf, drawSerre, vitrine };
