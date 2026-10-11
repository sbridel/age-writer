"use strict";
// L'emblème de l'auteur (dessiné ici, aucun asset) : un disque de laiton et d'émail rouge, quatre plumes en diagonale, un cercle central au glyphe,
// des nuages d'émail en haut et en bas, deux ornements en zigzag. Version simplifiée, aplats et reflets, pour s'accorder au reste du Relto.
const { rgba } = require("./util");

/** Dessine l'emblème centré en (cx, cy), de rayon `R`. `c` : filtre de couleur (lumière ambiante), facultatif ; `t` : temps (un reflet qui glisse). */
function drawEmblem(ctx, cx, cy, R, c = (h) => h, t = 0) {
  const GOLD = c("#d8a448"), GOLD_L = c("#f2cf7a"), GOLD_D = c("#8a5e22"), RED = c("#7a1410"), RED_D = c("#3a0806"), ORANGE = c("#d9731f");
  ctx.save(); ctx.translate(cx, cy);
  // fond d'émail
  ctx.fillStyle = RED_D; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
  const eg = ctx.createRadialGradient(0, R * 0.2, R * 0.1, 0, 0, R * 0.95); eg.addColorStop(0, c("#a01e14")); eg.addColorStop(1, RED); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0, 0, R * 0.93, 0, 6.283); ctx.fill();
  // nuages d'émail : un sombre au sommet, un orangé en bas
  const cloud = (x, y, s, col, hi) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - s * 0.6, y, s * 0.45, Math.PI, 0); ctx.arc(x, y - s * 0.12, s * 0.55, Math.PI, 0); ctx.arc(x + s * 0.6, y, s * 0.45, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = hi; ctx.lineWidth = Math.max(0.6, R * 0.02); ctx.beginPath(); ctx.arc(x, y - s * 0.12, s * 0.38, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); };
  cloud(0, -R * 0.62, R * 0.34, c("#4a0c08"), rgba(255, 120, 60, 0.35)); cloud(0, R * 0.8, R * 0.38, ORANGE, rgba(255, 230, 150, 0.7));
  // les quatre plumes en diagonale, pointe vers le centre
  const nib = (a) => { ctx.save(); ctx.rotate(a); ctx.translate(0, -R * 0.72);
    const L = R * 0.4, W = R * 0.13; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(0, L * 0.55); ctx.lineTo(W, -L * 0.1); ctx.lineTo(W * 0.6, -L * 0.5); ctx.lineTo(-W * 0.6, -L * 0.5); ctx.lineTo(-W, -L * 0.1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD_D; ctx.lineWidth = Math.max(0.6, R * 0.015); ctx.beginPath(); ctx.moveTo(0, L * 0.5); ctx.lineTo(0, -L * 0.12); ctx.stroke(); ctx.fillStyle = RED_D; ctx.beginPath(); ctx.arc(0, -L * 0.2, W * 0.32, 0, 6.283); ctx.fill();
    ctx.fillStyle = rgba(255, 240, 190, 0.45); ctx.beginPath(); ctx.moveTo(-W * 0.7, -L * 0.4); ctx.lineTo(-W * 0.3, -L * 0.4); ctx.lineTo(-W * 0.5, L * 0.1); ctx.closePath(); ctx.fill(); ctx.restore(); };
  for (const a of [Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) nib(a);
  // les zigzags de gauche et de droite, et leurs barres
  const zig = (dir) => { ctx.fillStyle = GOLD; ctx.beginPath(); const x0 = dir * R * 0.88, xi = dir * R * 0.6; ctx.moveTo(x0, -R * 0.1); ctx.lineTo(xi, -R * 0.22); ctx.lineTo(dir * R * 0.72, -R * 0.02); ctx.lineTo(xi, R * 0.2); ctx.lineTo(x0, R * 0.08); ctx.lineTo(dir * R * 0.74, -R * 0.01); ctx.closePath(); ctx.fill();
    ctx.fillStyle = GOLD_D; ctx.fillRect(Math.min(x0, dir * R * 0.97), -R * 0.03, R * 0.1, R * 0.06); };
  zig(-1); zig(1);
  // le cercle central et son glyphe
  ctx.fillStyle = c("#4a0c08"); ctx.beginPath(); ctx.arc(0, 0, R * 0.44, 0, 6.283); ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = R * 0.05; ctx.stroke();
  ctx.strokeStyle = GOLD_L; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = R * 0.075;
  ctx.beginPath(); ctx.moveTo(R * 0.02, -R * 0.3); ctx.lineTo(-R * 0.06, -R * 0.04); ctx.lineTo(R * 0.06, R * 0.04); ctx.lineTo(-R * 0.04, R * 0.28); ctx.stroke(); // la tige brisée
  ctx.lineWidth = R * 0.04; for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(-R * (0.3 - k * 0.07), R * 0.02); ctx.quadraticCurveTo(-R * (0.31 - k * 0.07), -R * 0.2, -R * (0.14 - k * 0.07), -R * 0.3); ctx.stroke(); } // trois griffes parallèles
  ctx.lineWidth = R * 0.055; ctx.beginPath(); ctx.moveTo(R * 0.3, -R * 0.06); ctx.quadraticCurveTo(R * 0.26, R * 0.22, -R * 0.02, R * 0.3); ctx.stroke(); ctx.lineWidth = R * 0.04; ctx.beginPath(); ctx.moveTo(R * 0.1, -R * 0.24); ctx.lineTo(R * 0.26, -R * 0.2); ctx.stroke(); ctx.lineCap = "butt";
  // l'anneau extérieur, avec un reflet qui glisse
  const rg = ctx.createLinearGradient(-R, -R, R, R); rg.addColorStop(0, GOLD_L); rg.addColorStop(0.5, GOLD); rg.addColorStop(1, GOLD_D); ctx.strokeStyle = rg; ctx.lineWidth = R * 0.075; ctx.beginPath(); ctx.arc(0, 0, R * 0.965, 0, 6.283); ctx.stroke();
  const sh = (t * 0.4) % 6.283; ctx.strokeStyle = rgba(255, 250, 220, 0.4); ctx.lineWidth = R * 0.025; ctx.beginPath(); ctx.arc(0, 0, R * 0.965, sh, sh + 0.5); ctx.stroke();
  ctx.restore();
}

module.exports = { drawEmblem };
