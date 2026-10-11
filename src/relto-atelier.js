"use strict";
// L'atelier d'écriture : une pièce cachée derrière un panneau de la cabane. Un grand bureau chargé d'objets étranges, une cheminée,
// un fauteuil (le chat s'y repose) et, en haut, une galerie de livres. Tout est dessiné ici (aucun asset).
const { rng, clamp, mix, rgba } = require("./util");
const W = 640, H = 360, FLOOR = 250, GALLERY = 100;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const CAT_FUR = { orange: "#d9822b", black: "#2a2a31", white: "#e9e4da", grey: "#8c8c94", gray: "#8c8c94", brown: "#7a5236", cream: "#e3cfa4" };
const flick = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** La tablette : une dalle de pierre noire, des lignes gravées qui luisent faiblement. `s` : sa demi-largeur. */
function stone(ctx, c, x, y, s, t) {
  const w = s * 1.5, h = s * 2; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12);
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(-w + 2, -h * 0.5 + 3, w * 2, h); // l'ombre
  ctx.fillStyle = c("#1a1820"); ctx.fillRect(-w, -h * 0.6, w * 2, h); ctx.fillStyle = c("#2a2733"); ctx.fillRect(-w, -h * 0.6, w * 2, 2); ctx.fillRect(-w, -h * 0.6, 2, h);
  ctx.strokeStyle = rgba(150, 110, 230, 0.4 + 0.3 * Math.sin(t * 1.4)); ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) { const ly = -h * 0.6 + h * (0.2 + k * 0.2); ctx.beginPath(); ctx.moveTo(-w * 0.7, ly); ctx.lineTo(-w * 0.1 + (k % 2) * w * 0.2, ly); ctx.moveTo(w * 0.05, ly); ctx.lineTo(w * 0.7 - (k % 3) * w * 0.15, ly); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-w * 0.2, -h * 0.5); ctx.lineTo(0, -h * 0.4); ctx.lineTo(w * 0.2, -h * 0.5); ctx.stroke();
  ctx.restore();
}
/** Une bande d'issue, bien visible, au bas d'une vue rapprochée (on s'y retrouvait coincé). */
function exitBand(r, ctx, label, go) {
  const g = ctx.createLinearGradient(0, H - 44, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.7)"); ctx.fillStyle = g; ctx.fillRect(0, H - 44, W, 44);
  ctx.font = "italic 15px serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(233,220,184,0.9)"; ctx.fillText("\u2193  " + label, W / 2, H - 12); ctx.textAlign = "left";
  r.hot.push({ x: 0, y: H - 40, w: W, h: 40, tip: label, go });
}

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
  r.hot.push({ x: 606, y: GALLERY - 4, w: 30, h: FLOOR - GALLERY, tip: TRr("atelier.ladder.tip"), go: "loft" });
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
  const top = ty - 8, rs = (r.opts.relicState && r.opts.relicState()) || {};
  if (rs.stone) { stone(ctx, c, tx + 262, top - 6, 7, t); r.hot.push({ x: tx + 252, y: top - 18, w: 22, h: 18, tip: TRr("atelier.stone.tip"), flash: TRr("atelier.stone.flash") }); }
  r.hot.push({ x: tx - 6, y: top - 36, w: tw + 12, h: 100, tip: TRr("atelier.sit.tip"), go: "desk" }); // s'asseoir au bureau (les objets, poussés après, gardent la priorité)
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

/** « Je m'assois au bureau » : le gros plan du plateau, la corbeille à lettres à gauche. */
function drawDesk(r, ctx, sc, sky, t) {
  const amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), fl = flick(t), mail = (r.opts.mailState && r.opts.mailState()) || {};
  ctx.fillStyle = c("#2b2018"); ctx.fillRect(0, 0, W, H); // le mur, dans l'ombre
  for (let x = 0; x < W; x += 36) { ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(x, 0, 1.4, 190); }
  const wx = 470, wy = 40, ww = 110, wh = 100; ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(wx, wy, ww, wh); ctx.restore();
  ctx.strokeStyle = c("#1d140e"); ctx.lineWidth = 6; ctx.strokeRect(wx, wy, ww, wh); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  const g = ctx.createLinearGradient(0, 180, 0, H); g.addColorStop(0, c("#6d4c31")); g.addColorStop(1, c("#3a2717")); ctx.fillStyle = g; ctx.fillRect(0, 180, W, H - 180); // le plateau
  ctx.fillStyle = c("#7d5a3b"); ctx.fillRect(0, 180, W, 4); const q = rng(0xde5c); ctx.strokeStyle = rgba(0, 0, 0, 0.14); ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = 190 + q() * 170; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(200, y + q() * 6 - 3, 440, y + q() * 6 - 3, W, y); ctx.stroke(); }
  // la lampe verte, en haut à gauche : son cône éclaire le plateau
  { const lx = 150; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(lx - 3, 90, 6, 92); ctx.fillRect(lx - 22, 176, 44, 8); ctx.fillStyle = c("#2f6b48"); ctx.beginPath(); ctx.moveTo(lx - 38, 78); ctx.lineTo(lx + 38, 78); ctx.lineTo(lx + 20, 34); ctx.lineTo(lx - 20, 34); ctx.fill();
    ctx.fillStyle = rgba(255, 224, 150, 0.1 + 0.03 * fl); ctx.beginPath(); ctx.moveTo(lx - 38, 78); ctx.lineTo(lx + 38, 78); ctx.lineTo(lx + 230, 360); ctx.lineTo(lx - 150, 360); ctx.fill();
    r.hot.push({ x: lx - 40, y: 32, w: 80, h: 150, tip: TRr("atelier.lamp.tip"), flash: TRr("atelier.lamp.flash") }); }
  // le planétaire, au fond à droite
  { const ox = 410, oy = 150; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ox - 3, oy + 22, 6, 30); ctx.fillRect(ox - 20, 176, 40, 6); ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = t * 0.5 + k * 1.05; ctx.beginPath(); ctx.ellipse(ox, oy, 28, 28 * Math.abs(Math.cos(a)) + 3, k * 1.05, 0, 6.283); ctx.stroke(); } ctx.fillStyle = c("#7fd6c8"); ctx.beginPath(); ctx.arc(ox, oy, 6, 0, 6.283); ctx.fill();
    r.hot.push({ x: ox - 32, y: oy - 32, w: 64, h: 84, tip: TRr("atelier.orrery.tip"), flash: TRr("atelier.orrery.flash") }); }
  // le grand livre ouvert, au centre : des lignes d'écriture qui attendent
  { const bx = 230, by = 230, bw = 190, bh = 100; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 8, by - 6, bw + 16, bh + 12); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx, by - 2, bw / 2 - 2, bh); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + bw / 2 + 2, by - 2, bw / 2 - 2, bh);
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw / 2 - 2, by - 2, 4, bh); ctx.fillStyle = rgba(110, 80, 45, 0.55); for (let k = 0; k < 8; k++) { ctx.fillRect(bx + 10, by + 8 + k * 11, 66 - (k % 3) * 8, 1.4); ctx.fillRect(bx + bw / 2 + 12, by + 8 + k * 11, 62 - (k % 4) * 7, 1.4); }
    r.hot.push({ x: bx - 8, y: by - 8, w: bw + 16, h: bh + 16, tip: TRr("atelier.book.tip"), flash: TRr("atelier.book.flash") }); }
  // l'encrier et la plume, à droite
  { const ix = 470, iy = 300; ctx.fillStyle = c("#14202a"); ctx.beginPath(); ctx.ellipse(ix, iy, 26, 12, 0, 0, 6.283); ctx.fill(); ctx.fillRect(ix - 10, iy - 22, 20, 18); ctx.fillStyle = c("#2d4a5c"); ctx.fillRect(ix - 12, iy - 24, 24, 5); ctx.strokeStyle = c("#e8dcc0"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(ix + 6, iy - 24); ctx.lineTo(ix + 52, iy - 78); ctx.stroke();
    r.hot.push({ x: ix - 28, y: iy - 80, w: 84, h: 94, tip: TRr("atelier.ink.tip"), flash: TRr("atelier.ink.flash") }); }
  // la corbeille à lettres, à gauche : un panier de laiton ; une enveloppe cachetée dépasse quand du courrier est arrivé
  { const cx = 70, cy = 262, cw = 110, ch = 64; ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.beginPath(); ctx.ellipse(cx + cw / 2, cy + ch + 4, cw / 2 + 6, 8, 0, 0, 6.283); ctx.fill();
    const env = (x, y, a, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = c(col); ctx.fillRect(-30, -18, 60, 36); ctx.strokeStyle = rgba(120, 90, 50, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(0, 4); ctx.lineTo(30, -18); ctx.stroke(); ctx.restore(); };
    if (mail.has) { env(cx + 30, cy + 8, -0.25, "#d6c7a0"); env(cx + 62, cy + 4, 0.18, "#e2d5b0"); }
    if (mail.unread) { const p = 0.5 + 0.5 * Math.sin(t * 2.4); env(cx + 48, cy - 8, 0.06, "#efe3c2"); ctx.fillStyle = c("#8e2b27"); ctx.beginPath(); ctx.arc(cx + 48, cy - 4, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 190, 100, 0.12 + 0.2 * p); ctx.beginPath(); ctx.arc(cx + 48, cy - 4, 46, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = c("#7a5c2a"); ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx + cw, cy + 10); ctx.lineTo(cx + cw - 10, cy + ch); ctx.lineTo(cx + 10, cy + ch); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(cx + k * cw / 6, cy + 10); ctx.lineTo(cx + 10 + k * (cw - 20) / 6, cy + ch); ctx.stroke(); } for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx + 2 + k * 2, cy + 10 + k * 13); ctx.lineTo(cx + cw - 2 - k * 2, cy + 10 + k * 13); ctx.stroke(); }
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 3; ctx.strokeRect(cx, cy + 8, cw, 4);
    r.hot.push(mail.unread || mail.has ? { x: cx - 4, y: cy - 32, w: cw + 8, h: ch + 40, tip: TRr(mail.unread ? "atelier.tray.new" : "atelier.tray.tip"), special: "mail" } : { x: cx - 4, y: cy - 4, w: cw + 8, h: ch + 12, tip: TRr("atelier.tray.tip"), flash: TRr("atelier.tray.empty") }); }
  const rs = (r.opts.relicState && r.opts.relicState()) || {};
  if (rs.drawer) { // le tiroir est sorti : un fond sombre, et la pierre dedans si on ne l'a pas encore prise
    ctx.fillStyle = c("#2a1c12"); ctx.fillRect(536, 294, 100, 44); ctx.fillStyle = c("#0f0a07"); ctx.fillRect(542, 298, 88, 32); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.5; ctx.strokeRect(536, 294, 100, 44);
    if (!rs.stone) { stone(ctx, c, 586, 322, 14, t); r.hot.push({ x: 560, y: 298, w: 52, h: 32, tip: TRr("atelier.stone.tip"), relic: "stone" }); }
  }
  if (rs.stone) { stone(ctx, c, 204, 316, 12, t); r.hot.push({ x: 190, y: 296, w: 28, h: 26, tip: TRr("atelier.stone.tip"), flash: TRr("atelier.stone.flash") }); }
  exitBand(r, ctx, TRr("atelier.stand.tip"), "atelier"); // se lever
  if (!rs.drawer) { // un clou de laiton qui brille un peu trop : c'est le bouton du tiroir
    const g = 0.35 + 0.35 * Math.sin(t * 1.1); ctx.fillStyle = c("#b98f3c"); ctx.beginPath(); ctx.arc(598, 346, 2.6, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 240, 190, g); ctx.fillRect(597, 344.5, 1.6, 1.6);
    r.hot.push({ x: 588, y: 336, w: 20, h: 18, tip: "", relic: "drawer", secret: true });
  }
}

/** L'étage : une galerie de livres, et sur la longue table les livres de référence qui ont quitté la table du salon. */
function drawLoft(r, ctx, sc, sky, t) {
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), fl = flick(t), q = rng(0x10f7);
  ctx.fillStyle = c("#3f2f22"); ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 34) { ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x, 0, 1.4, H); }
  for (let row = 0; row < 3; row++) { // les étagères du fond
    const y0 = 18 + row * 62; ctx.fillStyle = c("#1d140e"); ctx.fillRect(0, y0, W, 56); ctx.fillStyle = c("#4b3626"); ctx.fillRect(0, y0 + 56, W, 5);
    let bx = 6; const g = rng(0x600 + row * 11);
    while (bx < W - 10) { const bw = 6 + Math.floor(g() * 8), bh = 28 + Math.floor(g() * 22), col = ["#27555a", "#5b2b2b", "#3b3560", "#4c5a2c", "#6a4a2a", "#2f3e4f", "#5a3a52"][Math.floor(g() * 7)]; ctx.fillStyle = c(col); ctx.fillRect(bx, y0 + 56 - bh, bw, bh); ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw - 2, y0 + 56 - bh, 2, bh); if (g() < 0.45) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx, y0 + 56 - bh + 5, bw, 2); } bx += bw + 1; if (g() < 0.06) bx += 14; }
  }
  ctx.fillStyle = rgba(255, 190, 90, 0.05 * fl); ctx.fillRect(0, 0, W, 220);
  const g = ctx.createLinearGradient(0, 214, 0, H); g.addColorStop(0, c("#6d4c31")); g.addColorStop(1, c("#35241a")); ctx.fillStyle = g; ctx.fillRect(0, 214, W, H - 214); // la longue table
  ctx.fillStyle = c("#7d5a3b"); ctx.fillRect(0, 214, W, 4); ctx.strokeStyle = rgba(0, 0, 0, 0.14); ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = 224 + q() * 120; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + q() * 4 - 2); ctx.stroke(); }
  const stand = (x, y, w, h, body, band, kind) => {
    ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x - 4, y, w + 14, 7); ctx.fillStyle = c(body); ctx.fillRect(x, y - h, w, h); ctx.fillStyle = c(band); ctx.fillRect(x, y - h + 10, w, 5); ctx.fillRect(x, y - 16, w, 5); ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(x + w - 6, y - h, 6, h);
    const mx = x + w / 2, my = y - h / 2; ctx.fillStyle = c(band);
    if (kind === "glyphs") { ctx.beginPath(); ctx.moveTo(mx, my - 14); ctx.lineTo(mx + 9, my); ctx.lineTo(mx, my + 14); ctx.lineTo(mx - 9, my); ctx.closePath(); ctx.fill(); } else { ctx.fillRect(mx - 6, my - 10, 12, 16); ctx.fillStyle = c(body); ctx.fillRect(mx - 2, my - 5, 4, 7); }
  };
  stand(70, 296, 38, 84, "#27555a", "#d8c07a", "glyphs"); r.hot.push({ x: 66, y: 208, w: 52, h: 94, tip: TRr("atelier.loft.glyphs"), special: "glyphs" });
  stand(136, 296, 38, 74, "#5b2b2b", "#c9a24e", "library"); r.hot.push({ x: 132, y: 218, w: 52, h: 84, tip: TRr("atelier.loft.library"), special: "library" });
  { const bx = 232, by = 292; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 4, by - 2, 170, 20); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx, by - 8, 80, 18); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + 84, by - 8, 80, 18); ctx.fillStyle = rgba(120, 90, 50, 0.6); for (let k = 0; k < 4; k++) { ctx.fillRect(bx + 8, by - 3 + k * 4, 62, 1); ctx.fillRect(bx + 92, by - 3 + k * 4, 62, 1); }
    r.hot.push({ x: bx - 6, y: by - 12, w: 176, h: 34, tip: TRr("atelier.loft.pages"), go: "book" }); }
  if (sc.additions.some((a) => a.type === "imager") && r.opts.notes !== "off") { const nx = 450, ny = 290; ctx.fillStyle = c("#3b2a1a"); ctx.fillRect(nx, ny, 62, 14); ctx.fillStyle = c("#6b4a2a"); ctx.fillRect(nx, ny - 3, 62, 5); ctx.fillStyle = c("#c9a24e"); ctx.fillRect(nx + 3, ny + 2, 5, 9); ctx.fillRect(nx + 54, ny + 2, 5, 9); ctx.fillStyle = c("#8e2b27"); ctx.fillRect(nx + 40, ny + 12, 3, 12); r.hot.push({ x: nx - 3, y: ny - 8, w: 68, h: 36, tip: TRr("atelier.loft.surveyor"), special: "surveyor" }); }
  exitBand(r, ctx, TRr("atelier.loft.down"), "atelier");
}

module.exports = { drawAtelier, drawDesk, drawLoft, SECRET };
