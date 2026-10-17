"use strict";
// Le Château, dehors (étape 2) : l'île entière devient le château. La montagne devient le donjon (asymétrique, l'observatoire intégré à
// sa plus haute tour), la roche de l'île des soubassements à arcs aveugles sous une enceinte, la cabane une chapelle au pied du donjon,
// les îlots des tours suspendues, les ponts de corde des passerelles de pierre, la cascade une gargouille, les menhirs et les piliers
// des stèles. Le vivant (herbe, fleurs, arbres, chat, koï) ne change pas. Aucune zone cliquable ne bouge (test/castle.test.js).
// Décisions et maquette : claude/DESIGN-chateau-gothique.md (Projet).
const { rng, clamp, mix, rgba } = require("./util");
const GY = 208;

const STONE = "#8a8591", STONE_D = "#5e5966", STONE_DD = "#3a3742", SLATE = "#3e4258", SLATE_D = "#24263a", GOLD = "#c9a24e";

/** La couleur d'une fenêtre : sombre le jour (un reflet du ciel), rouge orangé et chaude la nuit. */
function winColor(night, k = 1) { const n = clamp(night * 1.25); return mix(mix("#05060c", "#2e2a3a", 0.7 + 0.3 * k), n > 0.5 ? "#ff6a3a" : "#e0743a", n); }

/** Une lancette (fenêtre étroite en arc brisé) de largeur w, de hauteur h, le bas à (x, y). */
function lancet(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w * 0.6); ctx.quadraticCurveTo(x - w / 2, y - h + w * 0.1, x, y - h); ctx.quadraticCurveTo(x + w / 2, y - h + w * 0.1, x + w / 2, y - h + w * 0.6); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); }

/** Un toit conique d'ardoise (poivrière) au-dessus d'une tour de largeur w posée à x, son pied à y ; une pointe dorée. */
function cone(ctx, c, x, y, w, h) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, c("#565a78")); g.addColorStop(1, c(SLATE_D)); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 1.5, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w / 2 + 1.5, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y - h - 5); ctx.stroke();
}

/** Une tour de pierre (corps rectangulaire), son appareil, ses fenêtres. */
function tower(ctx, c, x, top, w, base, night, seed, win = true, dark = false) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, c(dark ? STONE_D : STONE)); g.addColorStop(0.6, c(dark ? STONE_DD : STONE_D)); g.addColorStop(1, c(STONE_DD)); ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, base - top);
  ctx.fillStyle = rgba(0, 0, 0, 0.16); for (let y = top + 6; y < base; y += 6) ctx.fillRect(x - w / 2, y, w, 0.7);
  if (win) { const q = rng(seed); for (let y = top + 10; y < base - 8; y += 16) if (q() < 0.8) lancet(ctx, x + (q() - 0.5) * w * 0.25, y + 8, Math.max(2, w * 0.18), 7, winColor(night, q())); }
}

/**
 * Le donjon, à la place de la montagne (même pied : M.x, M.hw, M.h). Asymétrique : une masse sombre de pignons et de flèches derrière ;
 * une tour ronde à gauche ; un corps à pignon et sa rose ; la tour de l'astronome, la plus haute, qui porte l'observatoire s'il est là
 * (on y pose M.tx, M.ty, lus par relto-telescope.js), sinon une flèche ; la grande flèche à côté ; une tour carrée basse à droite et sa
 * tourelle ; une tour isolée au bout d'une passerelle ; des arcs-boutants. Toujours dessiné sous le Château, même sans la page Montagne.
 */
function keep(r, ctx, M, sky, t, observatory) {
  const amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb), night = clamp(sky.night == null ? 0 : sky.night);
  const cx = M.x, hw = M.hw, h = M.h, B = GY + 2;
  // la lueur rouge des fenêtres, la nuit
  if (night > 0.2) { const g = ctx.createRadialGradient(cx, GY - h * 0.5, 4, cx, GY - h * 0.5, hw); g.addColorStop(0, rgba(255, 90, 60, 0.16 * night)); g.addColorStop(1, rgba(255, 90, 60, 0)); ctx.fillStyle = g; ctx.fillRect(cx - hw, GY - h - 30, hw * 2, h + 40); }
  // la masse arrière : pignons et flèches fines, en silhouette
  ctx.fillStyle = c("#2a2632");
  ctx.beginPath(); ctx.moveTo(cx - hw * 0.92, B);
  const back = [[-0.92, 0.18], [-0.86, 0.3], [-0.78, 0.3], [-0.74, 0.52], [-0.7, 0.3], [-0.62, 0.36], [-0.5, 0.36], [-0.44, 0.62], [-0.38, 0.36], [0.24, 0.4], [0.3, 0.7], [0.36, 0.4], [0.62, 0.34], [0.7, 0.56], [0.76, 0.34], [0.9, 0.22], [0.96, 0.12]];
  for (const [u, v] of back) ctx.lineTo(cx + u * hw, GY - v * h);
  ctx.lineTo(cx + hw * 0.96, B); ctx.closePath(); ctx.fill();
  ctx.fillStyle = winColor(night, 0.4); const qb = rng(0xbac4); for (let i = 0; i < 9; i++) { const u = -0.85 + qb() * 1.7, v = 0.08 + qb() * 0.22; ctx.fillRect(cx + u * hw, GY - v * h, 1.6, 3); } // des fenêtres lointaines
  // la tour isolée, tout à droite, et sa passerelle (dessinées avant : la tour carrée passe devant)
  const ix = cx + hw * 0.86, itop = GY - h * 0.42;
  tower(ctx, c, ix, itop, 11, B, night, 0x15, true, true); cone(ctx, c, ix, itop, 11, 16);
  const rx = cx + hw * 0.52, rtop = GY - h * 0.5, rw = 22;
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(rx + rw / 2, rtop + 22); ctx.quadraticCurveTo((rx + ix) / 2, rtop + 16, ix - 5.5, itop + 16); ctx.lineTo(ix - 5.5, itop + 20); ctx.quadraticCurveTo((rx + ix) / 2, rtop + 20, rx + rw / 2, rtop + 26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(STONE_DD); ctx.lineWidth = 0.6; for (let k = 1; k < 4; k++) { const u = k / 4, xx = rx + rw / 2 + (ix - 5.5 - rx - rw / 2) * u; ctx.beginPath(); ctx.moveTo(xx, rtop + 20 - 2 * Math.sin(u * Math.PI) + 6 * 0); ctx.lineTo(xx, rtop + 28); ctx.stroke(); }
  // la tour ronde, à gauche
  const lx = cx - hw * 0.58, ltop = GY - h * 0.72, lw = 20;
  tower(ctx, c, lx, ltop, lw, B, night, 0x1e); cone(ctx, c, lx, ltop, lw, 24);
  ctx.fillStyle = c("#9a95a3"); ctx.fillRect(lx - lw / 2 - 1.5, ltop + h * 0.22, lw + 3, 2); ctx.fillStyle = rgba(0, 0, 0, 0.35); for (let x = lx - lw / 2; x < lx + lw / 2; x += 3) ctx.fillRect(x, ltop + h * 0.22 - 3, 1, 3); // un balcon
  // le corps à pignon, et sa rose
  const bx0 = cx - hw * 0.44, bx1 = cx + hw * 0.36, btop = GY - h * 0.5;
  tower(ctx, c, (bx0 + bx1) / 2, btop, bx1 - bx0, B, night, 0x2b, false);
  const gx = cx - hw * 0.12, gtop = btop - 30, ga = bx0 + 4, gb = gx + (gx - ga);
  { const g = ctx.createLinearGradient(ga, 0, gb, 0); g.addColorStop(0, c("#565a78")); g.addColorStop(1, c(SLATE_D)); ctx.fillStyle = g; }
  ctx.beginPath(); ctx.moveTo(ga - 2, btop); ctx.lineTo(gx, gtop); ctx.lineTo(gb + 2, btop); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#1c1a26"); for (let k = 1; k < 4; k++) { const u = k / 4; ctx.beginPath(); ctx.moveTo(ga + (gx - ga) * u, btop - (btop - gtop) * u); ctx.lineTo(ga + (gx - ga) * u - 3, btop - (btop - gtop) * u - 1.5); ctx.lineTo(ga + (gx - ga) * u - 1, btop - (btop - gtop) * u + 2); ctx.closePath(); ctx.fill(); } // des crochets sur le rampant
  const rr = 6; ctx.fillStyle = winColor(night, 0.8); ctx.beginPath(); ctx.arc(gx, btop - 11, rr, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#17141a"); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(gx, btop - 11, rr, 0, 6.283); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(gx, btop - 11); ctx.lineTo(gx + Math.cos(a) * rr, btop - 11 + Math.sin(a) * rr); ctx.stroke(); }
  ctx.strokeStyle = c("#b8b3c0"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(gx, btop - 11, rr + 1.5, 0, 6.283); ctx.stroke();
  const qw = rng(0x2c1); for (let x = bx0 + 8; x < bx1 - 6; x += 11) { lancet(ctx, x, btop + 22, 3.4, 12, winColor(night, qw())); lancet(ctx, x, B - 12, 3.4, 12, winColor(night, qw())); } // deux rangs de lancettes
  ctx.fillStyle = c("#9a95a3"); ctx.fillRect(bx0, btop + 26, bx1 - bx0, 1.6);
  // la grande flèche, à gauche de la tour de l'astronome
  const sx = cx - hw * 0.24, stop = btop - 10;
  tower(ctx, c, sx, stop, 11, btop, night, 0x3a);
  { const g = ctx.createLinearGradient(sx - 6, 0, sx + 6, 0); g.addColorStop(0, c("#565a78")); g.addColorStop(1, c(SLATE_D)); ctx.fillStyle = g; }
  ctx.beginPath(); ctx.moveTo(sx - 7, stop); ctx.lineTo(sx, stop - h * 0.62); ctx.lineTo(sx + 7, stop); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#1c1a26"); for (let k = 1; k < 5; k++) { const u = k / 5, yy = stop - h * 0.62 * u, ww = 7 * (1 - u); ctx.fillRect(sx - ww - 1.4, yy, 1.4, 1.2); ctx.fillRect(sx + ww, yy, 1.4, 1.2); }
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, stop - h * 0.62); ctx.lineTo(sx, stop - h * 0.62 - 7); ctx.stroke();
  ctx.fillStyle = winColor(night, 0.9); ctx.fillRect(sx - 0.8, stop - h * 0.3, 1.6, 4);
  // la tour de l'astronome : la plus haute ; l'observatoire s'y pose
  const ax = observatory ? M.tx : cx + hw * 0.08, aw = 30, atop = observatory ? M.ty + 2 : GY - h + 10; // avec l'observatoire : exactement sur sa terrasse (M.tx, M.ty, calculés comme pour la montagne), pour qu'il ne bouge pas
  tower(ctx, c, ax, atop, aw, B, night, 0x4a);
  ctx.fillStyle = c("#9a95a3"); ctx.fillRect(ax - aw / 2 - 2, atop - 2, aw + 4, 3); // la plate-forme
  ctx.fillStyle = c(STONE_D); for (let x = ax - aw / 2 - 2; x < ax + aw / 2 + 1; x += 5) ctx.fillRect(x, atop - 5, 3, 3); // le garde-corps
  if (!observatory) cone(ctx, c, ax, atop - 2, aw - 4, 34);
  // la tour carrée basse, à droite, et sa tourelle en encorbellement
  tower(ctx, c, rx, rtop, rw, B, night, 0x5c); cone(ctx, c, rx, rtop, rw, 20);
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(rx + rw / 2, rtop + 30); ctx.quadraticCurveTo(rx + rw / 2 + 6, rtop + 26, rx + rw / 2 + 6, rtop + 16); ctx.lineTo(rx + rw / 2, rtop + 16); ctx.closePath(); ctx.fill();
  tower(ctx, c, rx + rw / 2 + 3, rtop + 2, 6, rtop + 16, night, 0x5d, false); cone(ctx, c, rx + rw / 2 + 3, rtop + 2, 6, 11);
  // les arcs-boutants : de la tour ronde vers la grande flèche, de la tour carrée vers la tour de l'astronome
  ctx.strokeStyle = c("#46434f"); ctx.lineWidth = 2.4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(lx + lw / 2, ltop + 10); ctx.quadraticCurveTo((lx + sx) / 2, ltop - 2, sx - 5.5, stop + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx - rw / 2, rtop + 8); ctx.quadraticCurveTo((rx + ax) / 2, rtop - 6, ax + aw / 2, atop + 18); ctx.stroke(); ctx.lineCap = "butt";
  for (const [px, py] of [[lx + lw / 2 + 1, ltop + 10], [rx - rw / 2 - 1, rtop + 8]]) { ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px, py - 7); ctx.lineTo(px + 2, py); ctx.closePath(); ctx.fill(); } // leurs pinacles
  // la gargouille, au pied, d'où sort la cascade (dessinée par drawWaterfall)
  void t;
}

/** La gargouille du pied du donjon : en (x, y), tournée vers la droite (vers le bassin). */
function gargoyle(ctx, c, x, y) {
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 3, y - 4); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + 3, y + 1); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x - 4, y + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#17141a"); ctx.fillRect(x + 1, y - 2.6, 1, 1); ctx.fillStyle = c(STONE); ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x - 1, y - 7); ctx.lineTo(x + 1, y - 4); ctx.closePath(); ctx.fill(); // une oreille pointue
}

/** La chapelle, à la place de la cabane (même empreinte : x0..x0+w, toit jusqu'à y0 − 24) : pignon d'ardoise raide, une flèche, une lancette qui s'allume, une porte en arc brisé. */
function chapel(ctx, col, sky, t, x0, y0, w, h, hutX) {
  const night = clamp(sky.night == null ? 0 : sky.night), fl = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, col("#a29dab")); g.addColorStop(0.6, col(STONE)); g.addColorStop(1, col(STONE_D)); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = rgba(0, 0, 0, 0.15); for (let y = y0 + 5; y < y0 + h; y += 5) ctx.fillRect(x0, y, w, 0.7);
  // le toit d'ardoise, raide, et ses crochets
  { const sg = ctx.createLinearGradient(x0, 0, x0 + w, 0); sg.addColorStop(0, col("#5a5e7c")); sg.addColorStop(1, col(SLATE_D)); ctx.fillStyle = sg; }
  ctx.beginPath(); ctx.moveTo(x0 - 5, y0); ctx.lineTo(hutX, y0 - 24); ctx.lineTo(x0 + w + 5, y0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col("#1c1a26"); for (let k = 1; k < 4; k++) { const u = k / 4; for (const s of [-1, 1]) { const xx = hutX + s * (w / 2 + 5) * (1 - u), yy = y0 - 24 * u; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + s * 2.6, yy - 1.4); ctx.lineTo(xx + s * 0.8, yy + 1.8); ctx.closePath(); ctx.fill(); } }
  // la petite flèche du clocher, au faîte
  ctx.fillStyle = col(STONE_D); ctx.fillRect(hutX - 3, y0 - 30, 6, 8); ctx.fillStyle = winColor(night, 1); ctx.fillRect(hutX - 1, y0 - 28, 2, 4);
  ctx.fillStyle = col(SLATE_D); ctx.beginPath(); ctx.moveTo(hutX - 4, y0 - 30); ctx.lineTo(hutX, y0 - 46); ctx.lineTo(hutX + 4, y0 - 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col(GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hutX, y0 - 46); ctx.lineTo(hutX, y0 - 51); ctx.moveTo(hutX - 2, y0 - 49); ctx.lineTo(hutX + 2, y0 - 49); ctx.stroke();
  // la porte en arc brisé (où était celle de la cabane) et la grande lancette à remplage (où était la fenêtre)
  ctx.fillStyle = col("#17141a"); ctx.beginPath(); ctx.moveTo(hutX - 17, GY); ctx.lineTo(hutX - 17, GY - 13); ctx.quadraticCurveTo(hutX - 17, GY - 18, hutX - 11, GY - 20); ctx.quadraticCurveTo(hutX - 5, GY - 18, hutX - 5, GY - 13); ctx.lineTo(hutX - 5, GY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col("#b8b3c0"); ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = col(GOLD); ctx.fillRect(hutX - 7.5, GY - 9, 1, 1);
  const lx = x0 + w - 14; lancet(ctx, lx, y0 + 22, 9, 17, winColor(night * fl, 1));
  ctx.strokeStyle = col("#17141a"); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(lx, y0 + 22); ctx.lineTo(lx, y0 + 9); ctx.moveTo(lx - 4.5, y0 + 15); ctx.lineTo(lx + 4.5, y0 + 15); ctx.stroke();
  ctx.strokeStyle = col("#b8b3c0"); ctx.beginPath(); ctx.moveTo(lx - 5.5, y0 + 22); ctx.lineTo(lx - 5.5, y0 + 10); ctx.quadraticCurveTo(lx - 5.5, y0 + 5, lx, y0 + 3.5); ctx.quadraticCurveTo(lx + 5.5, y0 + 5, lx + 5.5, y0 + 10); ctx.lineTo(lx + 5.5, y0 + 22); ctx.stroke();
  if (night > 0.3) { const gl = ctx.createRadialGradient(lx, y0 + 14, 2, lx, y0 + 14, 34); gl.addColorStop(0, rgba(255, 110, 70, 0.32 * night * fl)); gl.addColorStop(1, rgba(255, 110, 70, 0)); ctx.fillStyle = gl; ctx.fillRect(lx - 36, y0 - 20, 72, 60); }
  // la cheminée de pierre, côté droit du toit (la fumée en sort : drawChimney)
  ctx.fillStyle = col(STONE_D); ctx.fillRect(x0 + w - 12, y0 - 18, 6, 14); ctx.fillStyle = col(STONE); ctx.fillRect(x0 + w - 13, y0 - 19, 8, 2);
  // deux contreforts
  ctx.fillStyle = col(STONE_D); for (const x of [x0 - 3, x0 + w - 1]) { ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, y0 + 8); ctx.lineTo(x + 2, y0 + 5); ctx.lineTo(x + 4, y0 + 8); ctx.lineTo(x + 4, GY); ctx.closePath(); ctx.fill(); }
}
/** Où sort la fumée de la cheminée de la chapelle. */
function chimneyAt(x0, y0, w) { return [x0 + w - 9, y0 - 20]; }

/** Les soubassements : sur la roche de l'île (dans son découpage), un appareil de pierre, une rangée d'arcs aveugles, des contreforts. */
function foundations(ctx, c, outline) {
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]), X0 = Math.min(...xs), X1 = Math.max(...xs), Y1 = Math.max(...ys);
  ctx.fillStyle = rgba(0, 0, 0, 0.14); for (let y = GY + 14; y < Y1; y += 9) ctx.fillRect(X0, y, X1 - X0, 0.8);
  const q = rng(0xf0d7); ctx.fillStyle = rgba(0, 0, 0, 0.1); for (let y = GY + 14, row = 0; y < Y1; y += 9, row++) for (let x = X0 + (row % 2) * 11; x < X1; x += 22) ctx.fillRect(x, y, 0.8, 9);
  ctx.fillStyle = rgba(255, 245, 235, 0.035); for (let i = 0; i < 40; i++) ctx.fillRect(X0 + q() * (X1 - X0), GY + 14 + q() * (Y1 - GY - 14), 10 + q() * 14, 8);
  for (let i = 0; i < 9; i++) { // une rangée d'arcs aveugles, sous le bord
    const u = (i + 0.5) / 9, x = 150 + u * 300, w = 20, top = GY + 24 + Math.abs(u - 0.5) * 4, bot = top + 26;
    ctx.fillStyle = rgba(10, 8, 14, 0.55); ctx.beginPath(); ctx.moveTo(x - w / 2, bot); ctx.lineTo(x - w / 2, top + 8); ctx.quadraticCurveTo(x - w / 2, top + 1, x, top - 2); ctx.quadraticCurveTo(x + w / 2, top + 1, x + w / 2, top + 8); ctx.lineTo(x + w / 2, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#9a95a3"); ctx.lineWidth = 0.8; ctx.stroke();
  }
  ctx.fillStyle = c(STONE_D); for (const [x, y, hh] of [[168, GY + 18, 60], [240, GY + 18, 90], [380, GY + 18, 84], [446, GY + 18, 50]]) { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x + 3, y + hh); ctx.lineTo(x, y + hh + 8); ctx.lineTo(x - 3, y + hh); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x + 1, y, 4, hh); ctx.fillStyle = c(STONE_D); } // des contreforts qui descendent dans la brume
}
/** L'enceinte : un parapet bas à arcatures sur le bord avant de l'île (le bord inférieur de la surface). */
function parapet(ctx, c) {
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, x = 138 + u * 324, t2 = (x - 138) / 324, y = GY + 9 + Math.sin(t2 * Math.PI) * 6.5 * (x > 138 && x < 462 ? 1 : 0); pts.push([x, y]); }
  ctx.fillStyle = c(STONE); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#b0abb8"); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 1.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(20, 16, 24, 0.5); ctx.lineWidth = 0.7; for (let i = 1; i < pts.length; i += 1) { const [x, y] = pts[i]; ctx.beginPath(); ctx.arc(x - 4, y + 6, 3.2, Math.PI, 0); ctx.stroke(); }
}

/** Une passerelle de pierre à petites arcades, de (x0, y0) à (x1, y1) (le tablier) ; une rambarde basse. */
function stoneBridge(ctx, c, x0, y0, x1, y1) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 14));
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.lineTo(x1, y1 - 1); ctx.lineTo(x1, y1 + 6); for (let i = n; i > 0; i--) { const u0 = i / n, u1 = (i - 1) / n, xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1, ya = y0 + (y1 - y0) * u0, yb = y0 + (y1 - y0) * u1; ctx.lineTo(xa, ya + 6); ctx.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + 1.5, xb, yb + 6); } ctx.closePath(); ctx.fill();
  ctx.fillStyle = c(STONE); ctx.beginPath(); ctx.moveTo(x0, y0 - 1); ctx.lineTo(x1, y1 - 1); ctx.lineTo(x1, y1 + 1); ctx.lineTo(x0, y0 + 1); ctx.closePath(); ctx.fill(); // le tablier
  ctx.strokeStyle = c(STONE_D); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0 - 4); ctx.lineTo(x1, y1 - 4); ctx.stroke(); // la rambarde
  ctx.lineWidth = 0.8; for (let i = 0; i <= n * 2; i++) { const u = i / (n * 2), x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 1); ctx.stroke(); }
  for (const [x, y] of [[x0, y0], [x1, y1]]) { ctx.fillStyle = c(STONE_D); ctx.fillRect(x - 1.5, y - 7, 3, 7); ctx.fillStyle = c(GOLD); ctx.fillRect(x - 0.6, y - 8.4, 1.2, 1.2); } // deux bornes
}

/** Un îlot devenu tour suspendue (dans le repère de l'îlot : son sommet à y = 0, échelle déjà posée) : une tour et sa poivrière, une fenêtre rouge. */
function isletTower(ctx, c, night, big) {
  const w = big ? 14 : 10, top = big ? -30 : -22;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, c(STONE)); g.addColorStop(1, c(STONE_DD)); ctx.fillStyle = g; ctx.fillRect(-w / 2, top, w, -top);
  ctx.fillStyle = rgba(0, 0, 0, 0.16); for (let y = top + 5; y < 0; y += 5) ctx.fillRect(-w / 2, y, w, 0.7);
  lancet(ctx, 0, top + 13, 2.8, 6, winColor(night, 1));
  ctx.fillStyle = c(SLATE); ctx.beginPath(); ctx.moveTo(-w / 2 - 2, top); ctx.lineTo(0, top - (big ? 18 : 14)); ctx.lineTo(w / 2 + 2, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, top - (big ? 18 : 14)); ctx.lineTo(0, top - (big ? 22 : 17)); ctx.stroke();
  ctx.fillStyle = rgba(0, 0, 0, 0.12); for (let y = 6; y < 30; y += 6) ctx.fillRect(-20, y, 40, 0.7); // l'appareil sous la tour : l'îlot est un soubassement
}

/** Une stèle en arc brisé (menhir ou pilier de liaison sous le Château) : chemin seul, pied à y, de demi-largeur w, de hauteur h. */
function stelePath(ctx, x, y, w, h) { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - h + w * 1.1); ctx.quadraticCurveTo(x - w, y - h + w * 0.2, x, y - h); ctx.quadraticCurveTo(x + w, y - h + w * 0.2, x + w, y - h + w * 1.1); ctx.lineTo(x + w, y); ctx.closePath(); }

/** Le banc, en pierre. */
function bench(ctx, c, x0) {
  const y = GY; ctx.fillStyle = c(STONE); ctx.fillRect(x0, y - 9, 26, 3); ctx.fillStyle = c("#b0abb8"); ctx.fillRect(x0, y - 9, 26, 0.8);
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(x0 + 2, y); ctx.lineTo(x0 + 2, y - 6); ctx.lineTo(x0 + 7, y - 6); ctx.lineTo(x0 + 7, y); ctx.closePath(); ctx.fill(); ctx.fillRect(x0 + 19, y - 6, 5, 6);
}

/** Le Château vu de loin (vue globale), sur l'île de la vue globale (cx, y : le milieu du bord de l'île) : la silhouette du donjon, la chapelle, les fenêtres rouges. */
function globalCastle(ctx, c, sky, cx, y) {
  const night = clamp(sky.night == null ? 0 : sky.night);
  ctx.fillStyle = c("#2a2632"); ctx.beginPath(); ctx.moveTo(cx - 34, y - 1); // la silhouette, asymétrique
  for (const [dx, dy] of [[-34, -10], [-30, -10], [-28, -22], [-26, -30], [-24, -22], [-20, -22], [-20, -28], [-12, -28], [-9, -50], [-6, -28], [-2, -28], [-2, -40], [0, -44], [3, -56], [6, -44], [8, -40], [8, -28], [14, -28], [16, -34], [18, -26], [24, -26], [26, -32], [28, -24], [30, -24], [34, -10]]) ctx.lineTo(cx + dx, y + dy);
  ctx.lineTo(cx + 34, y - 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c(STONE_D); ctx.fillRect(cx - 20, y - 22, 28, 21); // le corps, un peu plus clair
  ctx.fillStyle = winColor(night, 1); for (const [dx, dy] of [[-17, -16], [-11, -16], [-5, -16], [1, -16], [-14, -8], [-6, -8], [2, -8], [-26, -18], [2, -36], [15, -20], [27, -18]]) ctx.fillRect(cx + dx, y + dy, 1.6, 3);
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx + 3, y - 56); ctx.lineTo(cx + 3, y - 60); ctx.stroke();
}

module.exports = { winColor, lancet, keep, gargoyle, chapel, chimneyAt, foundations, parapet, stoneBridge, isletTower, stelePath, bench, globalCastle, STONE, STONE_D, STONE_DD, SLATE, GOLD };
