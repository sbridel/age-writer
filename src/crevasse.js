"use strict";
/**
 * La crevasse : une vraie faille aux bords dentelés, dont l'ouverture donne sur le vide étoilé
 * (la voie du retour). Pur dessin canvas, déterministe (sauf le scintillement, qui suit `t`).
 *
 *   crevasse(g, { x, y0, y1, w, jit, t, water, seed, shape })
 *     x, y0, y1 : axe et hauteur ; w : demi-largeur maximale ; jit : 7 nombres de −0,5 à 0,5 (l'allure du tracé) ;
 *     shape : "wedge" (étroite au loin, large près de nous : une faille dans le sol) ou "lens" (une bouche ovale).
 */
const TAU = Math.PI * 2;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Les deux lèvres de la crevasse : deux lignes brisées de haut en bas. */
function outline({ x, y0, y1, w, jit, shape, seed }) {
  const N = 16, L = [], R = [], p = jit.length - 1;
  const bend = (u) => { const f = u * p, i = Math.min(p - 1, Math.floor(f)); return jit[i] + (jit[i + 1] - jit[i]) * (f - i); };
  for (let i = 0; i <= N; i++) {
    const u = i / N, y = y0 + (y1 - y0) * u, cx = x + bend(u) * w * 2.2;
    const base = shape === "lens" ? Math.sin(Math.PI * u) : 0.16 + 0.84 * u, hw = Math.max(0.4, w * base * (0.75 + 0.5 * hash(seed + i * 3.1)));
    L.push([cx - hw * (0.8 + 0.4 * hash(seed + i * 7.7)), y]);
    R.push([cx + hw * (0.8 + 0.4 * hash(seed + i * 5.3)), y]);
  }
  return { L, R };
}

function crevasse(g, o) {
  const { x, y0, y1, w, t = 0, water = false, shape = "wedge" } = o, seed = o.seed || 1;
  const jit = Array.isArray(o.jit) && o.jit.length > 1 ? o.jit : [0, 0.1, -0.1, 0.05];
  const { L, R } = outline({ x, y0, y1, w, jit, shape, seed });
  const path = () => { g.beginPath(); L.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); };
  const tint = water ? [150, 222, 240] : [196, 222, 255], pulse = 0.5 + 0.5 * Math.sin(TAU * t * 0.5 + seed);
  const minX = Math.min(...L.map((q) => q[0])), maxX = Math.max(...R.map((q) => q[0])), cy = (y0 + y1) / 2;

  // la lueur qui sort de la faille
  const gr = Math.max(w * 3, (y1 - y0) * 0.7), glow = g.createRadialGradient(x, cy, 1, x, cy, gr);
  glow.addColorStop(0, rgba(tint, 0.14 + 0.08 * pulse)); glow.addColorStop(1, rgba(tint, 0));
  g.fillStyle = glow; g.fillRect(x - gr, cy - gr, gr * 2, gr * 2);

  // le fond : le vide, et ses étoiles
  g.save(); path(); g.clip();
  const bg = g.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, water ? "#07202e" : "#0b0d28"); bg.addColorStop(0.55, water ? "#031018" : "#05061a"); bg.addColorStop(1, "#010103");
  g.fillStyle = bg; g.fillRect(minX - 2, y0 - 1, maxX - minX + 4, y1 - y0 + 2);
  const band = g.createLinearGradient(minX, y1, maxX, y0); band.addColorStop(0, "rgba(0,0,0,0)"); band.addColorStop(0.5, rgba(tint, 0.1 + 0.05 * pulse)); band.addColorStop(1, "rgba(0,0,0,0)"); // une voie lactée, de biais
  g.fillStyle = band; g.fillRect(minX - 2, y0 - 1, maxX - minX + 4, y1 - y0 + 2);
  const n = Math.max(14, Math.round((maxX - minX) * (y1 - y0) / 35));
  for (let i = 0; i < n; i++) {
    const sx = minX + (maxX - minX) * hash(seed + i * 1.7), sy = y0 + (y1 - y0) * hash(seed + i * 2.9 + 5);
    const tw = 0.5 + 0.5 * Math.sin(TAU * (t * 0.6 + hash(seed + i * 0.9) * 3)), big = i % 7 === 0;
    g.fillStyle = rgba(big ? [255, 245, 220] : tint, (big ? 0.55 : 0.3) + 0.55 * tw);
    g.fillRect(sx - (big ? 0.7 : 0.4), sy - (big ? 0.7 : 0.4), big ? 1.5 : 0.9, big ? 1.5 : 0.9);
  }
  g.restore();

  // les lèvres : une ombre dehors, un fil de lumière dessus
  path(); g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 2.6; g.lineJoin = "miter"; g.stroke();
  g.strokeStyle = rgba(tint, 0.32 + 0.22 * pulse); g.lineWidth = 0.9;
  for (const side of [L, R]) { g.beginPath(); side.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
}

module.exports = { crevasse, outline };
