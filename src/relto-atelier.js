"use strict";
// L'atelier d'écriture : une pièce cachée derrière un panneau de la cabane. Un grand bureau chargé d'objets étranges, une cheminée,
// un fauteuil (le chat s'y repose) et, en haut, une galerie de livres. Tout est dessiné ici (aucun asset).
const { rng, clamp, mix, rgba } = require("./util");
const W = 640, H = 360, FLOOR = 250, GALLERY = 100;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const CAT_FUR = { orange: "#d9822b", black: "#2a2a31", white: "#e9e4da", grey: "#8c8c94", gray: "#8c8c94", brown: "#7a5236", cream: "#e3cfa4" };
const flick = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** Où se trouve le panneau secret dans la cabane (coordonnées logiques) ; la pièce n'a aucun bouton de navigation. */
const SECRET = { x: 112, y: 182, w: 66, h: 66 };

function drawAtelier(r, ctx, sc, sky, t) {
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), q = rng(0xa7e1);
  const lit = sc.additions.find((a) => a.type === "chimney"), d = lit ? clamp(lit.density == null ? 0.7 : lit.density, 0.2, 1) : 0.45, fl = flick(t);
  // murs, boiseries
  ctx.fillStyle = c("#4d3a2b"); ctx.fillRect(0, 0, W, FLOOR);
  for (let x = 0; x < W; x += 32) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 215, 165, 0.035 + q() * 0.04); ctx.fillRect(x, 0, 32, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(x, 0, 1.4, FLOOR); }
  ctx.fillStyle = c("#33251a"); ctx.fillRect(0, FLOOR - 70, W, 5); // lambris
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(0, FLOOR - 65, W, 65);
  // sol et tapis
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#46321f")); fg.addColorStop(1, c("#26190f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (const y of [FLOOR + 18, FLOOR + 42, FLOOR + 74]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 4, W, 6);
  ctx.fillStyle = c("#3d2a4a"); ctx.beginPath(); ctx.ellipse(300, 322, 210, 26, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(300, 322, 194, 21, 0, 0, 6.283); ctx.stroke();
  // galerie : un étage de livres de référence (décor pour l'instant), balustrade, échelle
  ctx.fillStyle = c("#1d140e"); ctx.fillRect(0, 0, W, GALLERY);
  for (let sx = 120; sx < W - 20; sx += 130) {
    ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(sx - 4, 4, 5, GALLERY - 8);
    for (let row = 0; row < 2; row++) {
      const y0 = 10 + row * 40; ctx.fillStyle = c("#4b3626"); ctx.fillRect(sx, y0 + 33, 118, 4);
      let bx = sx + 4; const g = rng(0x4000 + sx + row * 7);
      while (bx < sx + 112) { const bw = 5 + Math.floor(g() * 6), bh = 18 + Math.floor(g() * 14), col = ["#27555a", "#5b2b2b", "#3b3560", "#4c5a2c", "#6a4a2a", "#2f3e4f"][Math.floor(g() * 6)]; ctx.fillStyle = c(col); ctx.fillRect(bx, y0 + 33 - bh, bw, bh); ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw - 1.5, y0 + 33 - bh, 1.5, bh); if (g() < 0.4) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx, y0 + 33 - bh + 4, bw, 1.5); } bx += bw + 1; }
    }
  }
  ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(0, GALLERY - 4, W, 8); // plancher de la galerie
  ctx.fillStyle = c("#4b3626"); ctx.fillRect(0, GALLERY + 4, W, 3);
  for (let x = 6; x < W; x += 24) { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(x, GALLERY + 7, 4, 20); ctx.fillStyle = c("#4b3626"); ctx.beginPath(); ctx.arc(x + 2, GALLERY + 9, 4, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = c("#4b3626"); ctx.fillRect(0, GALLERY + 26, W, 4); // lisse
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(0, GALLERY + 30, W, 8);
  // l'échelle de la galerie
  ctx.fillStyle = c("#5a4330"); ctx.fillRect(628, GALLERY - 4, 5, FLOOR - GALLERY); ctx.fillRect(612, GALLERY - 4, 5, FLOOR - GALLERY);
  for (let y = GALLERY + 14; y < FLOOR - 6; y += 18) ctx.fillRect(612, y, 21, 3);
  // porte : le panneau pivote vers la cabane
  const dx = 28, dy = 118, dw = 62;
  ctx.fillStyle = c("#241810"); ctx.fillRect(dx - 4, dy - 4, dw + 8, FLOOR - dy + 4); ctx.fillStyle = c("#46301f"); ctx.fillRect(dx, dy, dw, FLOOR - dy - 2);
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dw / 4, dy); ctx.lineTo(dx + i * dw / 4, FLOOR - 2); ctx.stroke(); }
  ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 66, 3, 0, 6.283); ctx.fill();
  r.hot.push({ x: dx - 4, y: dy - 4, w: dw + 8, h: FLOOR - dy + 4, tip: TRr("atelier.door.tip"), go: "cabin" });
  // fenêtre ronde
  const wx = 200, wy = 168, wr = 34;
  ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 6.283); ctx.clip(); const sg = ctx.createLinearGradient(0, wy - wr, 0, wy + wr); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(wx - wr, wy - wr, 2 * wr, 2 * wr);
  if (sky.stars > 0.05) { const s = rng(0x91); for (let i = 0; i < 10; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.4 + 0.5 * s())); ctx.fillRect(wx - wr + s() * 2 * wr, wy - wr + s() * wr, 1.2, 1.2); } }
  ctx.restore();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 6.283); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx - wr, wy); ctx.lineTo(wx + wr, wy); ctx.moveTo(wx, wy - wr); ctx.lineTo(wx, wy + wr); ctx.stroke();
  // cheminée
  const fx = 470, fw = 130;
  ctx.fillStyle = c("#6a6258"); ctx.fillRect(fx + 18, GALLERY + 38, fw - 36, 90); ctx.fillStyle = c("#555047"); ctx.fillRect(fx, 150, fw, FLOOR - 150);
  ctx.strokeStyle = rgba(0, 0, 0, 0.26); ctx.lineWidth = 1; for (let y = 150; y < FLOOR; y += 15) { ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + fw, y); ctx.stroke(); }
  ctx.fillStyle = c("#3a2a22"); ctx.fillRect(fx - 10, 140, fw + 20, 11);
  const ox = fx + 20, ow = fw - 40; ctx.fillStyle = "#0e0907"; ctx.beginPath(); ctx.moveTo(ox, FLOOR); ctx.lineTo(ox, 188); ctx.quadraticCurveTo(ox + ow / 2, 160, ox + ow, 188); ctx.lineTo(ox + ow, FLOOR); ctx.closePath(); ctx.fill();
  const mx = ox + ow / 2, by = FLOOR - 9, n = Math.round(3 + 3 * d);
  ctx.fillStyle = "#2b1c12"; ctx.fillRect(mx - 28, by - 5, 56, 7);
  for (let i = 0; i < n; i++) { const ph = t * (2.2 + i * 0.37) + i * 1.9, h = (10 + 30 * d) * (0.65 + 0.35 * Math.sin(ph)), x = mx + (i - (n - 1) / 2) * 10, sw = Math.sin(ph * 1.3) * 3;
    for (const [col, k] of [["rgba(255,110,30,0.85)", 1], ["rgba(255,190,70,0.9)", 0.62], ["rgba(255,240,170,0.9)", 0.3]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6 * k - 1, by - 7); ctx.quadraticCurveTo(x - 4 * k + sw, by - h * k * 0.6, x + sw, by - h * k - 5); ctx.quadraticCurveTo(x + 4 * k + sw, by - h * k * 0.6, x + 6 * k + 1, by - 7); ctx.fill(); } }
  ctx.fillStyle = rgba(255, 160, 70, 0.07 * fl * (0.5 + d)); ctx.beginPath(); ctx.arc(mx, by - 20, 150, 0, 6.283); ctx.fill();
  r.hot.push({ x: fx - 10, y: 140, w: fw + 20, h: FLOOR - 140, tip: TRr("atelier.fire.tip"), flash: TRr("atelier.fire.flash") });
  // fauteuil devant le feu ; le chat s'y roule en boule
  const ax = 396, ay = 262;
  ctx.fillStyle = c("#5b2b2b"); ctx.fillRect(ax, ay - 52, 52, 54); ctx.fillStyle = c("#6d3535"); ctx.fillRect(ax - 8, ay - 30, 14, 36); ctx.fillRect(ax + 46, ay - 30, 14, 36); ctx.fillRect(ax + 4, ay - 26, 44, 28);
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(ax - 8, ay + 2, 68, 5); ctx.fillStyle = c("#2f2016"); ctx.fillRect(ax - 6, ay + 6, 4, 8); ctx.fillRect(ax + 54, ay + 6, 4, 8);
  const cat = sc.additions.find((a) => a.type === "cat");
  if (cat) {
    const fur = CAT_FUR[String(cat.color || "orange").toLowerCase()] || CAT_FUR.orange, br = Math.sin(t * 1.6) * 0.8;
    ctx.fillStyle = c(fur); ctx.beginPath(); ctx.ellipse(ax + 26, ay - 30, 17, 9 + br * 0.4, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(ax + 13, ay - 33, 8, 7, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ax + 8, ay - 38); ctx.lineTo(ax + 9, ay - 45); ctx.lineTo(ax + 13, ay - 39); ctx.moveTo(ax + 15, ay - 39); ctx.lineTo(ax + 18, ay - 45); ctx.lineTo(ax + 19, ay - 37); ctx.fill();
    ctx.strokeStyle = c(fur); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ax + 40, ay - 26); ctx.quadraticCurveTo(ax + 48, ay - 22, ax + 34, ay - 20); ctx.stroke(); ctx.lineCap = "butt";
    ctx.strokeStyle = rgba(30, 20, 10, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + 9, ay - 33); ctx.lineTo(ax + 12, ay - 33); ctx.moveTo(ax + 14, ay - 33); ctx.lineTo(ax + 17, ay - 33); ctx.stroke();
    const nm = String(cat.name || "").trim();
    r.hot.push({ x: ax - 4, y: ay - 50, w: 62, h: 40, tip: nm ? `${nm} — ${TRr("atelier.cat.tip")}` : TRr("atelier.cat.tip"), flash: "purr…", purr: true });
  } else r.hot.push({ x: ax - 8, y: ay - 52, w: 68, h: 56, tip: TRr("atelier.chair.tip"), flash: TRr("atelier.chair.flash") });
  // le grand bureau
  const tx = 100, tw = 270, ty = 270;
  ctx.fillStyle = c("#2f2016"); ctx.fillRect(tx + 8, ty, 10, 74); ctx.fillRect(tx + tw - 18, ty, 10, 74); ctx.fillStyle = c("#3d2a1c"); ctx.fillRect(tx + 6, ty + 10, tw - 12, 46);
  ctx.fillStyle = rgba(0, 0, 0, 0.3); for (let i = 0; i < 3; i++) ctx.fillRect(tx + 24 + i * 78, ty + 16, 66, 34); ctx.fillStyle = c("#c9a24e"); for (let i = 0; i < 3; i++) ctx.fillRect(tx + 52 + i * 78, ty + 30, 10, 3);
  ctx.fillStyle = c("#6d4c31"); ctx.fillRect(tx - 6, ty - 8, tw + 12, 10); ctx.fillStyle = c("#7d5a3b"); ctx.fillRect(tx - 6, ty - 8, tw + 12, 3);
  const top = ty - 8;
  const item = (x, y, w, h, tip, flash) => r.hot.push({ x, y, w, h, tip: TRr(tip), flash: flash ? TRr(flash) : undefined });
  // l'orrery : une sphère de laiton et ses anneaux qui tournent
  { const ox2 = tx + 30, oy2 = top - 34; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ox2 - 2, oy2 + 14, 4, 14); ctx.fillRect(ox2 - 12, top - 6, 24, 4);
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const a = t * 0.5 + k * 1.05; ctx.beginPath(); ctx.ellipse(ox2, oy2, 18, 18 * Math.abs(Math.cos(a)) + 2, k * 1.05, 0, 6.283); ctx.stroke(); }
    ctx.fillStyle = c("#7fd6c8"); ctx.beginPath(); ctx.arc(ox2, oy2, 4, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(127, 214, 200, 0.18 + 0.1 * Math.sin(t * 2)); ctx.beginPath(); ctx.arc(ox2, oy2, 11, 0, 6.283); ctx.fill();
    item(ox2 - 22, oy2 - 20, 44, 52, "atelier.orrery.tip", "atelier.orrery.flash"); }
  // la lampe à abat-jour vert
  { const lx = tx + 78; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(lx - 1.5, top - 26, 3, 24); ctx.fillRect(lx - 8, top - 4, 16, 3); ctx.fillStyle = c("#2f6b48"); ctx.beginPath(); ctx.moveTo(lx - 12, top - 20); ctx.lineTo(lx + 12, top - 20); ctx.lineTo(lx + 7, top - 33); ctx.lineTo(lx - 7, top - 33); ctx.fill();
    ctx.fillStyle = rgba(255, 220, 140, 0.1 + 0.03 * fl); ctx.beginPath(); ctx.moveTo(lx - 12, top - 20); ctx.lineTo(lx + 12, top - 20); ctx.lineTo(lx + 36, top + 2); ctx.lineTo(lx - 36, top + 2); ctx.fill(); item(lx - 13, top - 35, 26, 36, "atelier.lamp.tip", "atelier.lamp.flash"); }
  // le grand livre ouvert, la plume et l'encrier
  { const bx = tx + 108; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 1, top - 6, 56, 6); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx + 1, top - 9, 26, 5); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + 28, top - 9, 26, 5); ctx.fillStyle = rgba(120, 90, 50, 0.6); for (let k = 0; k < 3; k++) { ctx.fillRect(bx + 4, top - 8 + k * 1.4, 20, 0.6); ctx.fillRect(bx + 31, top - 8 + k * 1.4, 20, 0.6); }
    item(bx - 2, top - 12, 58, 14, "atelier.book.tip", "atelier.book.flash");
    const ix = bx + 70; ctx.fillStyle = c("#14202a"); ctx.beginPath(); ctx.ellipse(ix + 6, top - 4, 7, 4, 0, 0, 6.283); ctx.fill(); ctx.fillRect(ix + 3, top - 10, 6, 6); ctx.strokeStyle = c("#e8dcc0"); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(ix + 7, top - 10); ctx.lineTo(ix + 15, top - 26); ctx.stroke();
    item(ix - 2, top - 28, 22, 30, "atelier.ink.tip", "atelier.ink.flash"); }
  // un sablier et un cristal étrange qui respire
  { const hx = tx + 218; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.strokeRect(hx - 8, top - 28, 16, 26); ctx.fillStyle = c("#e6d9a8"); ctx.beginPath(); ctx.moveTo(hx - 6, top - 26); ctx.lineTo(hx + 6, top - 26); ctx.lineTo(hx, top - 15); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx, top - 15); ctx.lineTo(hx + 6, top - 4); ctx.lineTo(hx - 6, top - 4); ctx.fill(); item(hx - 10, top - 30, 20, 30, "atelier.hourglass.tip", "atelier.hourglass.flash");
    const kx = tx + 246, p = 0.5 + 0.5 * Math.sin(t * 1.3); ctx.fillStyle = rgba(140, 90, 220, 0.12 + 0.12 * p); ctx.beginPath(); ctx.arc(kx, top - 14, 15, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#8d5fd6"); ctx.beginPath(); ctx.moveTo(kx, top - 30); ctx.lineTo(kx + 7, top - 14); ctx.lineTo(kx, top - 2); ctx.lineTo(kx - 7, top - 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.35); ctx.fillRect(kx - 2, top - 24, 2, 8); item(kx - 9, top - 32, 18, 32, "atelier.crystal.tip", "atelier.crystal.flash"); }
}

module.exports = { drawAtelier, SECRET };
