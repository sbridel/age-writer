"use strict";
/**
 * La crevasse : une vraie faille aux bords dentelés, dont l'ouverture donne sur le vide étoilé
 * (la voie du retour). Pur dessin canvas, déterministe (sauf le scintillement, qui suit `t`).
 *
 *   crevasse(g, { x, y0, y1, w, jit, t, water, seed, shape })
 *     x, y0, y1 : axe et hauteur ; w : demi-largeur maximale ; jit : 7 nombres de −0,5 à 0,5 (l'allure du tracé) ;
 *     open : 0 à 1 (1 par défaut) : de la fissure fermée à la crevasse grande ouverte, étoiles comprises ;
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
  const open = o.open == null ? 1 : Math.max(0, Math.min(1, o.open)), ease = open * open * (3 - 2 * open); // 0 : un fil de lumière ; 1 : la crevasse ouverte
  const { x, y0, t = 0, water = false, shape = "wedge" } = o, seed = o.seed || 1, w = o.w * (0.1 + 0.9 * ease), y1 = y0 + (o.y1 - y0) * (0.4 + 0.6 * ease);
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
    g.fillStyle = rgba(big ? [255, 245, 220] : tint, ((big ? 0.55 : 0.3) + 0.55 * tw) * Math.min(1, ease * 1.6));
    g.fillRect(sx - (big ? 0.7 : 0.4), sy - (big ? 0.7 : 0.4), big ? 1.5 : 0.9, big ? 1.5 : 0.9);
  }
  g.restore();

  if (o.rock) walls(g, o, L, R, path, t, seed, ease); // ESSAI (6 nov.) : la faille a des parois, des lèvres qui s'effritent, de l'air dedans

  // les lèvres : une ombre dehors, un fil de lumière dessus
  path(); g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = 2.6; g.lineJoin = "miter"; g.stroke();
  g.strokeStyle = rgba(tint, (o.rock ? 0.18 : 0.32) + (o.rock ? 0.12 : 0.22) * pulse); g.lineWidth = 0.9;
  for (const side of [L, R]) { g.beginPath(); side.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
}

/**
 * ESSAI (6 nov., l'auteur : « tu pourrais améliorer le rendu de la fissure ») : ce qu'on voit d'une faille ouverte dans le sol, d'en haut.
 *  - les parois : de chaque lèvre, la roche descend avant le vide ; la paroi d'en face (celle qui fait face au regard) se voit plus large,
 *    avec ses strates, éclairée en haut, noire en bas ; le vide étoilé ne commence qu'au fond ;
 *  - de l'air dedans : une brume bleutée à mi-profondeur, qui sépare la roche des étoiles ;
 *  - les lèvres : un bord de sol qui s'effrite (des éclats, un liseré clair côté jour) ;
 *  - des cailloux qui se détachent et tombent, de temps en temps.
 *  o.rock : la couleur de la roche ; o.soil : la couleur du sol au bord ; o.light : 0 (nuit) à 1 (jour) ; o.facing : -1 / 1, la paroi qui fait face au regard.
 */
function walls(g, o, L, R, path, t, seed, ease) {
  const rock = o.rock, soil = o.soil || rock, light = o.light == null ? 1 : o.light, facing = o.facing || 1, n = L.length;
  const shade = (c, k) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
  g.save(); path(); g.clip();
  for (const [side, far] of [[L, facing < 0], [R, facing > 0]]) { // la paroi : une bande qui part de la lèvre vers l'intérieur ; plus large en face
    const other = side === L ? R : L;
    for (let i = 1; i < n; i++) {
      const [x0, y0] = side[i - 1], [x1, y1] = side[i], [ox0] = other[i - 1], [ox1] = other[i], wd0 = Math.abs(ox0 - x0), wd1 = Math.abs(ox1 - x1), f = far ? 0.55 : 0.22, d0 = wd0 * f, d1 = wd1 * f, dir = side === L ? 1 : -1;
      const gr = g.createLinearGradient(x0, y0, x0 + dir * d0, y0); gr.addColorStop(0, rgba(shade(rock, 0.55 + 0.35 * light), 1)); gr.addColorStop(0.55, rgba(shade(rock, 0.25 + 0.15 * light), 1)); gr.addColorStop(1, rgba(shade(rock, 0.06), 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + dir * d1, y1 + 1); g.lineTo(x0 + dir * d0, y0 + 1); g.closePath(); g.fill();
      if (far && i % 2 === 0) { g.strokeStyle = rgba(shade(rock, 0.18), 0.5); g.lineWidth = 0.7; for (let k = 1; k <= 3; k++) { const u = k / 4; g.beginPath(); g.moveTo(x0 + dir * d0 * u, y0); g.lineTo(x1 + dir * d1 * u, y1); g.stroke(); } } // les strates
    }
  }
  const top = L[0][1], bot = L[n - 1][1], minX = Math.min(...L.map((q) => q[0])), maxX = Math.max(...R.map((q) => q[0]));
  const mist = g.createLinearGradient(0, top, 0, bot); mist.addColorStop(0, "rgba(120,140,170,0)"); mist.addColorStop(0.5, `rgba(120,140,170,${0.12 + 0.08 * light})`); mist.addColorStop(1, "rgba(120,140,170,0)"); // l'air dedans
  g.fillStyle = mist; g.fillRect(minX, top, maxX - minX, bot - top);
  for (let k = 0; k < 4; k++) { const ph = (t * 0.35 + hash(seed + k * 4.1)) % 1, i = 1 + Math.floor(hash(seed + k * 9.3) * (n - 2)), side = k % 2 ? R : L, [px, py] = side[i], dir = side === L ? 1 : -1; // un caillou qui se détache et tombe
    g.fillStyle = rgba(shade(rock, 0.4 + 0.3 * light), 0.9 * (1 - ph) * ease); g.fillRect(px + dir * (2 + ph * 4), py + ph * (bot - top) * 0.35, 1.6, 1.6); }
  g.restore();
  g.save(); g.lineJoin = "round"; // les lèvres qui s'effritent : des éclats de sol au bord, un liseré clair côté jour
  for (const side of [L, R]) for (let i = 1; i < n - 1; i++) { const [px, py] = side[i], dir = side === L ? -1 : 1, s = 1.2 + 2.2 * hash(seed + i * 3.7 + (side === L ? 0 : 50)); if (hash(seed + i * 1.9 + (side === L ? 7 : 0)) < 0.45) continue;
    g.fillStyle = rgba(shade(soil, 0.5 + 0.4 * light), 0.9); g.beginPath(); g.moveTo(px, py - s * 0.5); g.lineTo(px + dir * s * 1.4, py - s * 0.2); g.lineTo(px + dir * s * 0.6, py + s * 0.7); g.closePath(); g.fill(); }
  g.strokeStyle = rgba(shade(soil, 1.15), 0.35 * light); g.lineWidth = 1; for (const side of [L, R]) { g.beginPath(); side.forEach(([px, py], i) => (i ? g.lineTo(px + (side === L ? -1 : 1), py - 0.5) : g.moveTo(px, py))); g.stroke(); }
  g.restore();
}

module.exports = { crevasse, outline };
