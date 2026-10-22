"use strict";
/**
 * Le salon : l'autre côté de la cabane (on s'y retourne par les bords de la vue). À gauche un coin cuisine (évier d'émail et
 * mélangeur de laiton, poêle à bois pour cuire, étagère de bocaux, casseroles) ; au milieu une grande fenêtre en arc sur la mer de
 * nuages, et dessous un grand canapé où l'on peut dormir ; à droite, sur un piédestal, le Livre du Relto, fermé : un clic l'ouvre.
 * Les déguisements l'habillent (le Château : pierre, noyer, velours, ogive ; la Verrière : verre, cuivre, mosaïque, vitrail), sans
 * déplacer aucune zone cliquable. Plein cadre, tout dessiné ici (aucun asset).
 */
const { rng, clamp, mix, rgba } = require("./util");
const GLASS = require("./relto-glass");
const CASTLE = require("./relto-castle");
const MEM = () => require("./relto-memories"); /* paresseux : la chambre dépend de la fenêtre générative */
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const W = 640, H = 360, FLOOR = 250;
const flicker = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** La grande fenêtre (et le canapé dessous, le piédestal à droite) : les mêmes places sous tous les habits. */
const WIN = { x: 250, y: 46, w: 200, h: 150 }, SOFA = { x: 212, y: 176, w: 276 }, PED = { x: 568, top: 150 };

/** Le contour de la fenêtre : un plein cintre, ou une ogive au Château. */
function arch(ctx, castle, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y + h);
  if (castle) { ctx.lineTo(x, y + w * 0.55); ctx.quadraticCurveTo(x, y + w * 0.12, x + w / 2, y - w * 0.12); ctx.quadraticCurveTo(x + w, y + w * 0.12, x + w, y + w * 0.55); }
  else { ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); }
  ctx.lineTo(x + w, y + h); ctx.closePath();
}

function drawLounge(r, ctx, sc, sky, t) {
  const night = clamp(sky.night == null ? 0.3 : sky.night), amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), fl = flicker(t);
  const glass = !!(r.glassOn && r.glassOn()), castle = !!(r.castleOn && r.castleOn()), tr = TR(r);
  const R = (col, x, y, w, h) => { ctx.fillStyle = c(col); ctx.fillRect(x, y, w, h); };

  // ---- murs et sol ----
  if (castle) { CASTLE.cabinWalls(r, ctx, c, sky, t, FLOOR); CASTLE.cabinFloor(ctx, c, FLOOR, H, W, false, amb); }
  else if (glass) { GLASS.cabinWalls(r, ctx, c, sky, t, FLOOR); GLASS.cabinFloor(ctx, c, FLOOR, amb); }
  else {
    const q = rng(0x5a10);
    ctx.fillStyle = c("#5a4330"); ctx.fillRect(0, 0, W, FLOOR);
    for (let x = 0; x < W; x += 40) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 220, 170, 0.04 + q() * 0.05); ctx.fillRect(x, 0, 40, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, 0, 1.5, FLOOR); }
    R("#3a2a1e", 0, 0, W, 24); R("#3a2a1e", 0, 22, W, 3); for (const x of [200, 560]) R("#3a2a1e", x - 8, 0, 16, 40);
    const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#4a3524")); fg.addColorStop(1, c("#2c1f15")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1;
    for (const y of [FLOOR + 16, FLOOR + 38, FLOOR + 68]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const x = i * 58 + 10; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - (x - 320) * 0.18, H); ctx.stroke(); }
    R("#2a1c14", 0, FLOOR - 6, W, 8);
  }
  if (glass) GLASS.lightPatches(ctx, sky, r.hour(), FLOOR);

  kitchen(r, ctx, c, R, sky, t, fl, night, castle, glass, tr);
  windowAndSky(r, ctx, c, R, sky, t, castle, glass);
  sofa(r, ctx, c, R, castle, glass, tr);
  pedestal(r, ctx, c, R, sky, fl, night, castle, glass, tr);

  // ---- le luminaire, au-dessus du canapé ----
  const lx = 470;
  if (castle) {
    ctx.strokeStyle = c(CASTLE.IRON); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, 21); ctx.lineTo(lx, 50); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(lx, 58, 22, 5, 0, 0, 6.283); ctx.stroke();
    for (const dx of [-20, -7, 7, 20]) { R("#d8cfb8", lx + dx - 1.5, 46, 3, 10); ctx.fillStyle = rgba(255, 207, 122, 0.55 + 0.45 * night * fl); ctx.beginPath(); ctx.ellipse(lx + dx, 44, 1.4, 2.8, 0, 0, 6.283); ctx.fill(); }
  } else if (glass) {
    ctx.strokeStyle = c(GLASS.COPPER_LO); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, 16); ctx.lineTo(lx, 44); ctx.stroke(); // une suspension de verre, en abat-jour
    const cols = ["#ffd27a", "#2f8a82", "#e0a23a", "#8fe3d2"], on = night > 0.25;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = on ? mix(c(cols[i % 4]), "#ffe2a0", 0.35 * fl) : c(cols[i % 4]); ctx.beginPath(); ctx.moveTo(lx, 44); ctx.lineTo(lx - 24 + i * 8, 64); ctx.lineTo(lx - 16 + i * 8, 64); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = GLASS.LEAD; ctx.lineWidth = 0.8; for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(lx, 44); ctx.lineTo(lx - 24 + i * 8, 64); ctx.stroke(); }
    R(GLASS.COPPER, lx - 25, 63, 50, 3);
  } else {
    ctx.strokeStyle = c("#2a2018"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, 24); ctx.lineTo(lx, 52); ctx.stroke();
    R("#3a3026", lx - 7, 52, 14, 4); R("#3a3026", lx - 7, 72, 14, 3);
    ctx.fillStyle = night > 0.25 ? rgba(255, 207, 122, 0.75 + 0.25 * fl) : c("#d9b878"); ctx.fillRect(lx - 5, 56, 10, 16);
  }
  if (night > 0.2) { // la nuit : la lanterne (ou le lustre) éclaire le canapé ; le poêle, le coin cuisine
    let g = ctx.createRadialGradient(lx, 64, 2, lx, 64, 140); g.addColorStop(0, rgba(255, 190, 100, 0.28 * night * fl)); g.addColorStop(1, rgba(255, 190, 100, 0)); ctx.fillStyle = g; ctx.fillRect(lx - 160, 0, 320, 260);
    g = ctx.createRadialGradient(136, 226, 2, 136, 226, 95); g.addColorStop(0, rgba(255, 140, 60, 0.24 * night * fl)); g.addColorStop(1, rgba(255, 140, 60, 0)); ctx.fillStyle = g; ctx.fillRect(30, 130, 210, 160);
  }

  MEM().loungeOrb(r, ctx, t); /* la porte de la chambre des souvenirs : un orbe, près du plafond */
  // ---- se retourner : les bords de la vue ramènent à la cabane ----
  turnEdges(r, ctx, "cabin", tr("relto.lounge.turn"));
  const v = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, rgba(0, 0, 0, 0.38)); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/** Les bords de la vue : deux fines bandes où l'on se retourne, une flèche pâle qui s'éclaire au survol. Partagé avec la cabane. */
function turnEdges(r, ctx, go, tip) {
  for (const [x, ch] of [[0, "‹"], [W - 16, "›"]]) {
    const hov = r.hover && r.hover.go === go && r.hover.edge === ch;
    ctx.fillStyle = rgba(230, 215, 180, hov ? 0.7 : 0.22); ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.fillText(ch, x + 8, 300); ctx.textAlign = "left";
    r.hot.push({ x, y: 40, w: 16, h: 300, tip, go, edge: ch });
  }
}

function kitchen(r, ctx, c, R, sky, t, fl, night, castle, glass, tr) {
  // la crédence : carreaux de faïence (cabane), carreaux émaillés verts (Verrière), pierre (Château)
  for (let y = 150; y < 212; y += 9) for (let x = 14; x < 190; x += 9) { const k = ((x + y) / 9) % 2 < 1; ctx.fillStyle = c(glass ? (k ? "#3f8a7a" : "#2f6a62") : castle ? (k ? "#8a8494" : "#7a7484") : (k ? "#b8b0a0" : "#a8a090")); ctx.fillRect(x, y, 8.4, 8.4); }
  // l'étagère (elle s'arrête avant le tuyau du poêle) : bocaux, une miche, des herbes qui sèchent
  const wood = castle ? CASTLE.WALNUT : glass ? "#3a2418" : "#3a2a1e", wood2 = castle ? CASTLE.WALNUT_LO : "#2a1c14";
  R(wood, 14, 108, 140, 5); R(wood2, 22, 113, 4, 8); R(wood2, 146, 113, 4, 8);
  if (castle || glass) { ctx.fillStyle = c(castle ? CASTLE.GOLD : GLASS.COPPER); ctx.fillRect(14, 108, 140, 1); }
  for (const [x, col, h] of [[24, "#c99a4a", 18], [44, "#8a5a7a", 14], [60, "#6a8a4a", 20], [82, "#d8c890", 12]]) { R(col, x, 108 - h, 12, h); R("#6a5a48", x - 1, 108 - h - 3, 14, 3); }
  ctx.fillStyle = c("#a8743a"); ctx.beginPath(); ctx.ellipse(118, 101, 16, 8, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(102, 100, 32, 8);
  for (let i = 0; i < 3; i++) R("#8a6a3a", 132 + i * 6, 90 + (i % 2) * 2, 4, 18);
  R(wood, 14, 124, 140, 3); // la barre des casseroles
  for (const [x, rad] of [[34, 9], [58, 7], [128, 10]]) {
    ctx.strokeStyle = c("#2a2420"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, 127); ctx.lineTo(x, 136); ctx.stroke();
    ctx.fillStyle = c("#7a4a2e"); ctx.beginPath(); ctx.arc(x, 136 + rad, rad, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#9a6a42"); ctx.beginPath(); ctx.arc(x - 2, 134 + rad, rad * 0.4, 0, 6.283); ctx.fill();
  }
  // le meuble sous l'évier : planches (cabane), noyer filé d'or (Château), bois sombre et cuivre (Verrière)
  R(castle ? CASTLE.WALNUT : glass ? "#2a1a12" : "#4a3424", 14, 212, 92, 40); R(castle ? CASTLE.WALNUT_LO : "#3a2618", 14, 212, 92, 4);
  ctx.strokeStyle = c(castle ? CASTLE.GOLD : glass ? GLASS.COPPER : "#2a1c14"); ctx.lineWidth = 1; ctx.strokeRect(20, 220, 38, 26); ctx.strokeRect(62, 220, 38, 26);
  // le bac : émail blanc à bord roulé (pierre au Château)
  const basin = castle ? CASTLE.STONE_HI : "#d8d2c4", rim = castle ? CASTLE.STONE : "#cfc8b8", rimHi = castle ? "#b8b3c0" : "#ece6d8", inside = castle ? CASTLE.STONE_LO : "#b8b0a0";
  ctx.fillStyle = c(basin); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(14, 196, 92, 20, 4) : ctx.rect(14, 196, 92, 20); ctx.fill();
  R(rim, 10, 212, 100, 6); R(rimHi, 10, 211, 100, 2); R(inside, 16, 206, 88, 6);
  // le mélangeur mural, en laiton patiné (cuivre à la Verrière) : deux croisillons sur leurs rosaces, un col de cygne tourné vers le bac
  const BR = glass ? GLASS.COPPER : "#a8823e", BRH = glass ? GLASS.COPPER_HI : "#d6b06a", BRL = glass ? GLASS.COPPER_LO : "#6e5224", mx = 60, my = 188;
  ctx.save(); ctx.translate(mx, my); ctx.scale(1.35, 1.35); ctx.translate(-mx, -my);
  for (const x of [mx - 16, mx + 16]) { ctx.fillStyle = c(BRL); ctx.beginPath(); ctx.arc(x, my, 3.4, 0, 6.283); ctx.fill(); ctx.fillStyle = c(BR); ctx.beginPath(); ctx.arc(x, my, 2.4, 0, 6.283); ctx.fill(); }
  R(BR, mx - 16, my - 1.2, 32, 2.4); R(BRH, mx - 16, my - 1.2, 32, 0.7);
  for (const x of [mx - 21, mx + 21]) { R(BR, x - 0.8, my - 4, 1.6, 8); R(BR, x - 3.5, my - 0.8, 7, 1.6); ctx.fillStyle = c(BRH); ctx.beginPath(); ctx.arc(x, my, 1, 0, 6.283); ctx.fill(); }
  R(BR, mx - 1.3, my - 14, 2.6, 14); R(BR, mx - 2, my - 8, 4, 1.4); R(BRH, mx - 1.3, my - 14, 0.8, 14);
  ctx.fillStyle = c(BR); ctx.beginPath(); ctx.arc(mx, my - 15.5, 1.8, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c(BR); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 0.5, my - 13); ctx.quadraticCurveTo(mx + 9, my - 17, mx + 10, my - 9); ctx.stroke();
  R(BR, mx + 8.7, my - 9.5, 2.6, 3.2); R(BRL, mx + 8.9, my - 6.5, 2.2, 0.8);
  const on = !!r.tapOn;
  if (on) { // le robinet ouvert : un filet d'eau qui ondule un peu, plus clair au milieu
    const wob = Math.sin(t * 23) * 0.15, sg = ctx.createLinearGradient(mx + 9, 0, mx + 11, 0); sg.addColorStop(0, rgba(150, 190, 220, 0.5)); sg.addColorStop(0.5, rgba(230, 245, 255, 0.85)); sg.addColorStop(1, rgba(150, 190, 220, 0.5));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(mx + 9, my - 6); ctx.lineTo(mx + 11, my - 6); ctx.lineTo(mx + 10.7 + wob, my + 13.5); ctx.lineTo(mx + 9.3 + wob, my + 13.5); ctx.closePath(); ctx.fill();
  } else { const drip = (t * 0.9) % 1; ctx.fillStyle = rgba(170, 200, 225, 0.55); ctx.beginPath(); ctx.arc(mx + 10, my - 5 + drip * 13, 0.8, 0, 6.283); ctx.fill(); } // fermé : une goutte, de temps en temps
  ctx.restore();
  if (on) { // l'eau dans le bac : des cercles qui s'élargissent, un peu d'écume au point de chute
    const sx = mx + 10 * 1.35, sy = 208.5;
    for (let i = 0; i < 3; i++) { const p = ((t * 1.6 + i / 3) % 1); ctx.strokeStyle = rgba(225, 240, 250, 0.5 * (1 - p)); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy, 2 + p * 16, 0.8 + p * 2.6, 0, 0, 6.283); ctx.stroke(); }
    ctx.fillStyle = rgba(240, 250, 255, 0.7); for (let i = 0; i < 4; i++) { const a = t * 9 + i * 1.7; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * 2.2, sy - 0.8 - Math.abs(Math.sin(a * 1.3)) * 1.8, 0.6, 0, 6.283); ctx.fill(); }
  }
  r.hot.push({ x: 10, y: 170, w: 100, h: 48, tip: tr(on ? "relto.lounge.tap.off" : "relto.lounge.tap.on"), tap: true });
  // la niche de pierre (Château) ou la hotte de cuivre (Verrière) au-dessus du poêle
  if (castle) { ctx.strokeStyle = c(CASTLE.STONE_LO); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(112, FLOOR + 2); ctx.lineTo(112, 150); ctx.quadraticCurveTo(150, 118, 188, 150); ctx.lineTo(188, FLOOR + 2); ctx.stroke(); }
  if (glass) { ctx.fillStyle = c(GLASS.COPPER); ctx.beginPath(); ctx.moveTo(112, 150); ctx.lineTo(188, 150); ctx.lineTo(176, 118); ctx.lineTo(124, 118); ctx.closePath(); ctx.fill(); R(GLASS.COPPER_HI, 112, 148, 76, 2); for (const x of [130, 150, 170]) R(GLASS.COPPER_LO, x, 121, 1.2, 27); }
  // le poêle à bois pour cuire : fonte, la porte du foyer, une marmite qui fume, une bouilloire, le tuyau qui monte
  R("#26221f", 118, 196, 64, 56); R("#3a3430", 114, 190, 72, 8); R("#1a1715", 124, 214, 24, 20); R("#1a1715", 154, 214, 22, 14);
  const fire = ctx.createRadialGradient(136, 226, 1, 136, 226, 12); fire.addColorStop(0, rgba(255, 160, 70, 0.75 + 0.25 * fl)); fire.addColorStop(1, rgba(255, 90, 20, 0)); ctx.fillStyle = fire; ctx.fillRect(124, 214, 24, 20);
  R("#1a1715", 120, 250, 6, 2); R("#1a1715", 174, 250, 6, 2);
  ctx.fillStyle = c("#2c2a2a"); ctx.beginPath(); ctx.moveTo(126, 190); ctx.lineTo(154, 190); ctx.lineTo(152, 172); ctx.lineTo(128, 172); ctx.closePath(); ctx.fill(); R("#3a3836", 124, 169, 32, 4);
  ctx.fillStyle = c("#6a4a30"); ctx.beginPath(); ctx.ellipse(170, 183, 9, 7, 0, 0, 6.283); ctx.fill(); ctx.fillRect(168, 173, 4, 4); ctx.strokeStyle = c("#6a4a30"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(178, 181); ctx.lineTo(184, 175); ctx.stroke();
  for (let i = 0; i < 5; i++) { const p = ((t * 0.18 + i / 5) % 1); ctx.fillStyle = rgba(220, 220, 220, 0.2 * (1 - p)); ctx.beginPath(); ctx.arc(140 + Math.sin(p * 5 + i) * 4, 166 - p * 46, 2.5 + p * 6, 0, 6.283); ctx.fill(); } // la vapeur
  if (!glass) { R("#2a2622", 166, 24, 9, 146); R("#3a3430", 164, 96, 13, 4); } else R("#2a2622", 166, 24, 9, 94); // le tuyau (sous la hotte, à la Verrière)
  r.hot.push({ x: 114, y: 166, w: 74, h: 86, tip: tr("relto.lounge.stove") });
}

function windowAndSky(r, ctx, c, R, sky, t, castle, glass) {
  const { x: wx, y: wy, w: ww, h: wh } = WIN;
  ctx.fillStyle = c(castle ? CASTLE.STONE_LO : glass ? GLASS.COPPER_LO : "#3a2a1e"); arch(ctx, castle, wx - 10, wy - 10, ww + 20, wh + 16); ctx.fill();
  ctx.save(); arch(ctx, castle, wx, wy, ww, wh); ctx.clip();
  const sg = ctx.createLinearGradient(0, wy - 30, 0, wy + wh); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(wx, wy - 30, ww, wh + 30);
  if (sky.stars > 0.05) { const s = rng(0x10a6e); for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.35 + 0.6 * s())); ctx.fillRect(wx + s() * ww, wy - 20 + s() * 100, 1.2, 1.2); } }
  if (sky.night > 0.4) { // la lune, haute dans la fenêtre (rouge au Château)
    const mx = wx + 150, my = wy + 40; ctx.fillStyle = sky.red ? "#d8503a" : "#f2ecd0"; ctx.beginPath(); ctx.arc(mx, my, sky.red ? 13 : 9, 0, 6.283); ctx.fill();
    if (!sky.red) { ctx.fillStyle = sky.top; ctx.beginPath(); ctx.arc(mx + 5, my - 3, 8, 0, 6.283); ctx.fill(); }
  }
  const cc = r.cloudColor(sky), q = rng(0x10c1);
  ctx.save(); ctx.globalAlpha = 0.75; for (let i = 0; i < 9; i++) { const w = 50 + q() * 70, x = wx - 60 + ((q() * (ww + 120) + t * 3 * (0.5 + q())) % (ww + 120)), y = wy + 95 + q() * 50; ctx.drawImage(r.sprite, x - w, y - w * 0.25, w * 2, w * 0.5); } ctx.restore();
  ctx.fillStyle = cc; ctx.globalAlpha = 0.45; ctx.fillRect(wx, wy + wh - 22, ww, 22); ctx.globalAlpha = 1;
  if (glass) { // le vitrail de tête : un éventail vert et ambre autour d'un soleil
    const cols = ["#8fe3d2", "#2f8a82", "#ffd27a", "#e0a23a"], ox = wx + ww / 2, oy = wy + ww / 2;
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, ww / 2, Math.PI + (i * Math.PI) / 8, Math.PI + ((i + 1) * Math.PI) / 8); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = GLASS.LEAD; ctx.lineWidth = 1.4;
    for (let i = 1; i < 8; i++) { const a = Math.PI + (i * Math.PI) / 8; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * ww / 2, oy + Math.sin(a) * ww / 2); ctx.stroke(); }
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(ox, oy, 12, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
  // les meneaux, le cintre intérieur ; le remplage (Château), le cadre de cuivre (Verrière)
  ctx.strokeStyle = c(castle ? CASTLE.STONE : glass ? GLASS.COPPER : "#3a2a1e"); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy + (castle ? -18 : 4)); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.55); ctx.lineTo(wx + ww, wy + wh * 0.55); ctx.stroke();
  ctx.lineWidth = 2;
  if (castle) { ctx.strokeStyle = c(CASTLE.STONE_HI); ctx.lineWidth = 3; arch(ctx, true, wx, wy, ww, wh); ctx.stroke(); ctx.lineWidth = 2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(wx + ww / 2 + s * 36, wy + 30, 22, 0, 6.283); ctx.stroke(); } ctx.beginPath(); ctx.arc(wx + ww / 2, wy - 2, 13, 0, 6.283); ctx.stroke(); }
  else if (glass) { ctx.strokeStyle = c(GLASS.COPPER); ctx.lineWidth = 4; arch(ctx, false, wx, wy, ww, wh); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2 - 18, Math.PI, 0); ctx.stroke(); }
  R(castle ? CASTLE.STONE : glass ? GLASS.COPPER : "#3a2a1e", wx - 16, wy + wh, ww + 32, 9); if (glass) R(GLASS.COPPER_HI, wx - 16, wy + wh, ww + 32, 1.5);
  if (sky.ambient > 0.35) { ctx.fillStyle = rgba(255, 240, 200, 0.06 * sky.ambient); ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + 60, FLOOR + 70); ctx.lineTo(wx - 30, FLOOR + 70); ctx.closePath(); ctx.fill(); } // la lumière du jour sur le canapé
}

function sofa(r, ctx, c, R, castle, glass, tr) {
  const { x: sx, y: sy, w: sw } = SOFA;
  const back = castle ? CASTLE.VELVET_LO : glass ? "#1f3e34" : "#4a2a26", cap = castle ? CASTLE.VELVET : glass ? "#2f5a4a" : "#5c3430", seat = castle ? "#8a2a36" : glass ? "#3a6a58" : "#6a3c36", base = castle ? CASTLE.WALNUT_LO : glass ? GLASS.COPPER_LO : "#2e1a16", foot = castle ? CASTLE.WALNUT : glass ? GLASS.COPPER : "#1e120e";
  const rr = (x, y, w, h, rad) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h); };
  R(back, sx + 8, sy, sw - 16, 40); // le dossier
  const cw = (sw - 28) / 3;
  for (let i = 0; i < 3; i++) { ctx.fillStyle = c(cap); rr(sx + 14 + i * cw, sy + 4, cw - 4, 36, 8); ctx.fill(); }
  if (castle) { ctx.fillStyle = c(CASTLE.GOLD); for (let i = 0; i < 3; i++) for (const [dx, dy] of [[0.3, 0.35], [0.7, 0.35], [0.5, 0.7]]) { ctx.beginPath(); ctx.arc(sx + 14 + i * cw + (cw - 4) * dx, sy + 4 + 36 * dy, 0.9, 0, 6.283); ctx.fill(); } } // capitons boutonnés
  ctx.fillStyle = c(seat); rr(sx + 6, sy + 36, sw - 12, 26, 6); ctx.fill(); // l'assise
  for (let i = 1; i < 3; i++) { ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(sx + 6 + (i * (sw - 12)) / 3, sy + 38, 1.5, 22); }
  ctx.fillStyle = c(back); rr(sx - 6, sy + 10, 22, 58, 9); ctx.fill(); rr(sx + sw - 16, sy + 10, 22, 58, 9); ctx.fill(); // les accoudoirs
  R(base, sx, sy + 62, sw, 8);
  ctx.fillStyle = c(foot); for (const x of [sx + 6, sx + sw - 12]) { ctx.beginPath(); ctx.moveTo(x, sy + 70); ctx.lineTo(x + 6, sy + 70); ctx.lineTo(x + 4.5, sy + 76); ctx.lineTo(x + 1.5, sy + 76); ctx.closePath(); ctx.fill(); } // les pieds tournés
  // l'oreiller, le plaid jeté, deux coussins : on peut y dormir
  ctx.fillStyle = c("#d8ccb0"); ctx.beginPath(); ctx.ellipse(sx + 34, sy + 32, 22, 11, -0.15, 0, 6.283); ctx.fill();
  ctx.fillStyle = c(castle ? "#4a3a2a" : "#7a6a40"); ctx.beginPath(); ctx.moveTo(sx + 120, sy + 38); ctx.quadraticCurveTo(sx + 170, sy + 30, sx + 230, sy + 40); ctx.lineTo(sx + 246, sy + 74); ctx.lineTo(sx + 150, sy + 70); ctx.quadraticCurveTo(sx + 128, sy + 60, sx + 120, sy + 38); ctx.fill();
  ctx.strokeStyle = c(castle ? "#2e2418" : "#5a4e2c"); ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sx + 140 + i * 16, sy + 36); ctx.lineTo(sx + 150 + i * 16, sy + 72); ctx.stroke(); }
  ctx.fillStyle = c(castle ? CASTLE.PURPLE : "#3c5a46"); rr(sx + 200, sy + 14, 30, 26, 6); ctx.fill(); ctx.fillStyle = c(glass ? "#c99a4a" : "#8a6a3a"); rr(sx + 226, sy + 18, 26, 22, 6); ctx.fill();
  r.hot.push({ x: sx - 6, y: sy, w: sw + 12, h: 76, tip: tr("relto.lounge.sofa") });
}

function pedestal(r, ctx, c, R, sky, fl, night, castle, glass, tr) {
  const { x: px, top } = PED, gold = castle ? CASTLE.GOLD : glass ? GLASS.COPPER_HI : "#b8934a";
  // le tapis rond (la Verrière : deux anneaux de cuivre dans la mosaïque)
  if (glass) { /* la mosaïque de la Verrière porte déjà ses anneaux de cuivre */ }
  else if (castle) CASTLE.rug(ctx, c, px, FLOOR + 30, 62, 12);
  else { ctx.strokeStyle = c("#7a3a2a"); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, FLOOR + 30, 62, 12, 0, 0, 6.283); ctx.stroke(); }
  // les degrés du socle
  const s0 = castle ? CASTLE.STONE_LO : glass ? GLASS.COPPER_LO : "#2e2018", s1 = castle ? CASTLE.STONE : glass ? GLASS.COPPER : "#3a2a1e", s2 = castle ? CASTLE.STONE_HI : glass ? GLASS.COPPER_HI : "#4a3426";
  R(s0, px - 34, FLOOR - 2, 68, 8); R(s1, px - 28, FLOOR - 10, 56, 9); R(s2, px - 22, FLOOR - 16, 44, 7);
  // le fût cannelé, ses bagues, le chapiteau à volutes
  const fg = ctx.createLinearGradient(px - 11, 0, px + 11, 0);
  const [f0, f1, f2] = castle ? [CASTLE.STONE_LO, CASTLE.STONE_HI, CASTLE.STONE_LO] : glass ? [GLASS.COPPER_LO, GLASS.COPPER_HI, GLASS.COPPER_LO] : ["#3a2618", "#6a4a32", "#2e1e14"];
  fg.addColorStop(0, c(f0)); fg.addColorStop(0.5, c(f1)); fg.addColorStop(1, c(f2)); ctx.fillStyle = fg; ctx.fillRect(px - 11, top + 38, 22, FLOOR - 16 - (top + 38));
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (const dx of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(px + dx, top + 42); ctx.lineTo(px + dx, FLOOR - 20); ctx.stroke(); }
  R(gold, px - 13, top + 60, 26, 2.5); R(gold, px - 13, FLOOR - 24, 26, 2.5);
  R(s2, px - 18, top + 32, 36, 8);
  ctx.strokeStyle = c(s2); ctx.lineWidth = 2.4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(px + s * 18, top + 38, 5, 0, 6.283); ctx.stroke(); }
  if (castle) { ctx.fillStyle = c(CASTLE.GOLD); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px + s * 26.5, FLOOR - 10); ctx.lineTo(px + s * 24, FLOOR - 28); ctx.lineTo(px + s * 21.5, FLOOR - 10); ctx.fill(); ctx.fillStyle = c(CASTLE.GOLD); } } // deux flammes d'or, posées sur la marche du milieu (devant la marche du haut)
  if (glass) { // une liane grimpe autour du fût
    ctx.strokeStyle = c("#3b8f6a"); ctx.lineWidth = 1.6; ctx.beginPath(); for (let y = FLOOR - 20; y > top + 42; y -= 4) { const x = px + Math.sin(y * 0.15) * 10; if (y === FLOOR - 20) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.fillStyle = c("#4bb08a"); for (let y = FLOOR - 26; y > top + 46; y -= 14) { const x = px + Math.sin(y * 0.15) * 10; ctx.beginPath(); ctx.ellipse(x + 4, y, 4, 2, 0.6, 0, 6.283); ctx.fill(); }
  }
  // le pupitre incliné
  ctx.fillStyle = c(castle ? CASTLE.WALNUT : glass ? GLASS.COPPER_LO : "#5a3c28"); ctx.beginPath(); ctx.moveTo(px - 40, top + 32); ctx.lineTo(px + 40, top + 32); ctx.lineTo(px + 34, top + 10); ctx.lineTo(px - 34, top + 10); ctx.closePath(); ctx.fill();
  R(gold, px - 40, top + 31, 80, 2);
  // le Livre du Relto, fermé : vert forêt, un filet d'or, le médaillon grenat (couleurs du livre lui-même, à peine assombries la nuit)
  const b = (h) => mix("#05060c", h, 0.35 + 0.65 * Math.max(0.6, sky.ambient));
  ctx.fillStyle = b("#08130c"); ctx.beginPath(); ctx.moveTo(px - 30, top + 30); ctx.lineTo(px + 30, top + 30); ctx.lineTo(px + 26, top + 11); ctx.lineTo(px - 26, top + 11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = b("#16301d"); ctx.beginPath(); ctx.moveTo(px - 29, top + 27); ctx.lineTo(px + 29, top + 27); ctx.lineTo(px + 25, top + 9); ctx.lineTo(px - 25, top + 9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = b("#d4b25a"); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px - 25, top + 25); ctx.lineTo(px + 25, top + 25); ctx.lineTo(px + 22, top + 11.5); ctx.lineTo(px - 22, top + 11.5); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = b("#d4b25a"); ctx.beginPath(); ctx.ellipse(px, top + 18, 6.5, 4.2, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = b("#6a1d27"); ctx.beginPath(); ctx.ellipse(px, top + 18, 5, 3.1, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = b("#d4b25a"); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(px - 3, top + 19.5); ctx.lineTo(px, top + 16.5); ctx.lineTo(px + 3, top + 19.5); ctx.stroke();
  ctx.fillStyle = b("#e8dcb8"); ctx.fillRect(px - 29, top + 27, 58, 2.2);
  const hov = r.hover && r.hover.special === "reltobook";
  const glow = ctx.createRadialGradient(px, top + 16, 2, px, top + 16, 70); glow.addColorStop(0, night > 0.3 ? rgba(255, 200, 120, (0.26 + (hov ? 0.12 : 0)) * fl) : rgba(255, 245, 215, 0.16 + (hov ? 0.1 : 0))); glow.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = glow; ctx.fillRect(px - 80, top - 60, 160, 150);
  if (night > 0.3) { // la nuit, une bougie haute à côté du livre
    R("#d8cfb8", px + 46, top + 4, 4, 26); R("#3a3026", px + 42, top + 30, 12, 3);
    ctx.fillStyle = rgba(255, 207, 122, 0.8 + 0.2 * fl); ctx.beginPath(); ctx.ellipse(px + 48, top + 1, 2, 4, 0, 0, 6.283); ctx.fill();
  }
  r.hot.push({ x: px - 42, y: top + 2, w: 84, h: 36, tip: tr("relto.lounge.book"), special: "reltobook" });
}

module.exports = { drawLounge, turnEdges, WIN, SOFA, PED };
