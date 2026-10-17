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

/**
 * Le donjon, à la place de la montagne : la maquette (claude/DESIGN-chateau-gothique.md), dessinée dans son propre repère (le sol à y = 208)
 * puis posée et mise à l'échelle sur l'île. Trois plans : derrière, une masse sombre de pignons et de flèches fines ; au milieu, la tour
 * ronde et son balcon, le corps à pignons (la rose, la galerie d'arcatures, les grandes lancettes, le portail à archivoltes), la grande
 * flèche ajourée et sa tourelle, une petite flèche, des arcs-boutants à pinacles, des gargouilles ; devant à droite, la tour de l'astronome
 * (l'observatoire s'y pose : son sommet est exactement la terrasse M.tx, M.ty, pour que rien de cliquable ne bouge) et la tour isolée au bout
 * de sa passerelle couverte. Toujours dessiné sous le Château, même sans la page Montagne.
 */
function keep(r, ctx, M, sky, t, observatory) {
  const amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb), night = clamp(sky.night == null ? 0 : sky.night);
  const ax = observatory ? M.tx : r.terraceOf ? r.terraceOf(M).tx : M.x, s = 0.7 + 0.08 * clamp((M.hw - 100) / 24);
  const P = (d) => new Path2D(d), W = (k) => winColor(night, k);
  const grad = (x0, x1, stops) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach((h, i) => g.addColorStop(i / (stops.length - 1), c(h))); return g; };
  const MID = ["#6e6876", "#4a4552", "#2e2a36"], FRONT = ["#878090", "#5e5866", "#3a3542"], SL = ["#565a78", "#24263a"];
  const fillP = (d, f) => { ctx.fillStyle = f; ctx.fill(P(d)); }, strokeP = (d, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(P(d)); };
  const courses = (x, y, w, h) => { ctx.fillStyle = rgba(0, 0, 0, 0.22); for (let yy = y + 4.5, k = 0; yy < y + h; yy += 4.5, k++) { ctx.fillRect(x, yy, w, 0.7); for (let xx = x + (k % 2 ? 11 : 5.5); xx < x + w; xx += 11) ctx.fillRect(xx, yy, 0.6, 4.5); } };
  const box = (x, y, w, h, stops) => { ctx.fillStyle = grad(x, x + w, stops); ctx.fillRect(x, y, w, h); courses(x, y, w, h); };
  const lancets = (ds, k) => { for (const d of ds) fillP(d, W(k)); };
  // la lueur rouge des fenêtres, la nuit
  if (night > 0.2) { const g = ctx.createRadialGradient(ax - 40, GY - 90, 4, ax - 40, GY - 90, 120); g.addColorStop(0, rgba(255, 90, 60, 0.18 * night)); g.addColorStop(1, rgba(255, 90, 60, 0)); ctx.fillStyle = g; ctx.fillRect(ax - 170, GY - 210, 260, 220); }
  ctx.save(); ctx.translate(ax - 354 * s, GY * (1 - s)); ctx.scale(s, s); /* le repère de la maquette : la tour de l'astronome à x = 354, le sol à y = 208 */
  // PLAN ARRIÈRE : pignons et flèches fines, en silhouette
  ctx.fillStyle = c("#2a2632");
  ctx.fill(P("M180 210 L 186 160 L 196 160 L 196 136 L 204 136 L 204 160 L 224 160 L 224 118 L 230 100 L 236 118 L 236 160 L 250 160 L 250 110 L 256 110 L 256 160 L 330 160 L 330 128 L 336 128 L 336 160 L 372 160 L 372 112 L 378 92 L 384 112 L 384 160 L 400 160 L 400 136 L 406 136 L 406 160 L 420 210 Z"));
  ctx.fill(P("M322 160 L 326 70 L 330 160 Z M196 136 L 200 112 L 204 136 Z M400 136 L 403 116 L 406 136 Z"));
  ctx.fillStyle = W(0.4); for (const [x, y] of [[229, 126], [229, 140], [377, 120], [377, 136], [325, 100], [325, 124], [200, 146], [403, 146]]) ctx.fillRect(x, y, 2, 4); // des fenêtres lointaines
  // PLAN MOYEN — la tour ronde, à gauche, son toit, son balcon, ses lancettes
  box(208, 112, 26, 98, MID);
  fillP("M204 112 L 221 76 L 238 112 Z", grad(204, 238, SL)); fillP("M221 76 L 238 112 L 221 112 Z", rgba(0, 0, 0, 0.22));
  strokeP("M221 76 v-8", c(GOLD), 1); fillP("M221 68 l-2.5 2.5 l2.5 1.6 l2.5 -1.6 Z", c(GOLD));
  fillP("M206 150 h30 v3 h-30 Z", c("#7a7683")); strokeP("M209 150 v-6 M214 150 v-6 M219 150 v-6 M224 150 v-6 M229 150 v-6 M234 150 v-6", c("#2a2733"), 0.9); ctx.fillStyle = c("#9a95a3"); ctx.fillRect(206, 143, 30, 1.2);
  lancets(["M216 130 v-9 q3 -5 6 0 v9 Z", "M216 176 v-9 q3 -5 6 0 v9 Z", "M224 196 v-7 q2.5 -4 5 0 v7 Z"], 0.9);
  strokeP("M219 121 v9 M216 126 h6 M219 167 v9 M216 172 h6", c("#17141a"), 0.7);
  // le corps à pignons
  box(238, 126, 98, 84, MID);
  fillP("M238 126 L 266 90 L 294 126 Z", grad(238, 294, SL)); fillP("M266 90 L 294 126 L 266 126 Z", rgba(0, 0, 0, 0.2));
  fillP("M300 126 L 318 104 L 336 126 Z", grad(300, 336, SL));
  fillP("M248 113 l3 -2 l-1 3 Z M254 105 l3 -2 l-1 3 Z M260 97 l3 -2 l-1 3 Z M284 113 l-3 -2 l1 3 Z M278 105 l-3 -2 l1 3 Z M272 97 l-3 -2 l1 3 Z", c("#1c1a26")); // les crochets
  strokeP("M266 90 v-7", c(GOLD), 1); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(266, 82, 1.3, 0, 6.283); ctx.fill();
  // la grande rose
  ctx.fillStyle = mix(c("#3a1020"), W(1), night * 0.6); ctx.beginPath(); ctx.arc(266, 116, 9, 0, 6.283); ctx.fill();
  strokeP("M275 116 A9 9 0 1 1 257 116 A9 9 0 1 1 275 116 M269 116 A3 3 0 1 1 263 116 A3 3 0 1 1 269 116 M266 107 v18 M257 116 h18 M259.6 109.6 l12.8 12.8 M272.4 109.6 l-12.8 12.8 M266 107 q3 2 4 6 M266 107 q-3 2 -4 6 M275 116 q-2 3 -6 4 M275 116 q-2 -3 -6 -4 M266 125 q3 -2 4 -6 M266 125 q-3 -2 -4 -6 M257 116 q2 3 6 4 M257 116 q2 -3 6 -4", c("#17141a"), 0.8);
  ctx.strokeStyle = c("#9a95a3"); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(266, 116, 10.6, 0, 6.283); ctx.stroke();
  // la galerie d'arcatures, sous la rose
  lancets(["M244 150 v-9 q2.5 -4 5 0 v9 Z M252 150 v-9 q2.5 -4 5 0 v9 Z M260 150 v-9 q2.5 -4 5 0 v9 Z M268 150 v-9 q2.5 -4 5 0 v9 Z M276 150 v-9 q2.5 -4 5 0 v9 Z M284 150 v-9 q2.5 -4 5 0 v9 Z"], 0.85);
  strokeP("M246.5 141 v9 M254.5 141 v9 M262.5 141 v9 M270.5 141 v9 M278.5 141 v9 M286.5 141 v9", c("#17141a"), 0.6);
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(241, 151, 52, 1.8); ctx.fillRect(241, 138, 52, 1.4);
  // les grandes lancettes de l'étage bas, et une à droite
  lancets(["M246 182 v-14 q4 -7 8 0 v14 Z", "M278 182 v-14 q4 -7 8 0 v14 Z", "M308 176 v-12 q3.5 -6 7 0 v12 Z", "M318 150 v-9 q2.5 -4 5 0 v9 Z"], 1);
  strokeP("M250 168 v14 M246 175 h8 M282 168 v14 M278 175 h8 M311.5 164 v12 M308 170 h7 M247 170 q3 -5 6 0 M279 170 q3 -5 6 0", c("#17141a"), 0.8);
  strokeP("M244.5 182 v-14 q5.5 -9 11 0 v14 M276.5 182 v-14 q5.5 -9 11 0 v14", c("#9a95a3"), 0.8);
  // le grand portail à archivoltes et son perron
  fillP("M258 210 V 194 Q 266 180 274 194 V 210 Z", c("#0a0809"));
  strokeP("M256 210 V 194 Q 266 177 276 194 V 210", c("#7a7683"), 2); strokeP("M253.5 210 V 194 Q 266 173.5 278.5 194 V 210", c("#4a4752"), 2.2); strokeP("M251 210 V 194 Q 266 170 281 194 V 210", c("#8f8a98"), 1);
  fillP("M266 177 l-3 -6 l3 -3 l3 3 Z", c(GOLD));
  if (night > 0.3) fillP("M264 210 v-10 h4 v10 Z", rgba(255, 106, 58, 0.55 * night));
  // la grande flèche ajourée
  box(296, 78, 16, 48, FRONT);
  fillP("M292 78 L 304 14 L 316 78 Z", grad(292, 316, SL)); fillP("M304 14 L 316 78 L 304 78 Z", rgba(0, 0, 0, 0.22));
  fillP("M300 70 v-6 q4 -5 8 0 v6 Z M301.5 56 v-5 q2.5 -4 5 0 v5 Z M302.5 44 v-4 q1.5 -3 3 0 v4 Z", c("#1c1420")); // les ajours
  lancets(["M301 69 v-4.5 q3 -3.5 6 0 v4.5 Z", "M302.3 55 v-3.5 q1.7 -2.5 3.4 0 v3.5 Z"], 0.8);
  fillP("M297 66 l-3 -2 l0 4 Z M311 66 l3 -2 l0 4 Z M298.5 52 l-3 -2 l0 4 Z M309.5 52 l3 -2 l0 4 Z M300.5 38 l-2.5 -2 l0 3.5 Z M307.5 38 l2.5 -2 l0 3.5 Z M302 26 l-2 -2 l0 3 Z M306 26 l2 -2 l0 3 Z", c("#1c1a26")); // les crochets
  strokeP("M304 14 v-11", c(GOLD), 1.2); fillP("M304 3 l-3 3 l3 2 l3 -2 Z", c(GOLD));
  fillP("M293 92 h22 v2.6 h-22 Z", c("#7a7683")); strokeP("M296 92 v-5 M300 92 v-5 M304 92 v-5 M308 92 v-5 M312 92 v-5", c("#2a2733"), 0.8); // son balcon
  lancets(["M300 112 v-9 q4 -6 8 0 v9 Z"], 0.95); strokeP("M304 103 v9 M300 108 h8", c("#17141a"), 0.7);
  // la tourelle collée à la flèche
  fillP("M312 118 q7 -3 7 -11 v-7 h-7 Z", c("#4a4350")); ctx.fillStyle = grad(312, 320, FRONT); ctx.fillRect(312, 100, 8, 26);
  fillP("M310 100 L 316 82 L 322 100 Z", grad(310, 322, SL)); strokeP("M316 82 v-4", c(GOLD), 0.8); ctx.fillStyle = W(0.7); ctx.fillRect(315, 108, 2, 5);
  // la petite flèche, derrière le pignon
  ctx.fillStyle = grad(246, 253, MID); ctx.fillRect(246, 92, 7, 12); fillP("M243 92 L 249.5 66 L 256 92 Z", grad(243, 256, SL)); strokeP("M249.5 66 v-5", c(GOLD), 0.9); ctx.fillStyle = W(0.8); ctx.fillRect(248.5, 80, 2, 4);
  // les arcs-boutants à pinacles
  ctx.lineCap = "round"; strokeP("M234 104 q 14 -14 30 -14", c("#4a4350"), 2.2); strokeP("M238 120 q 12 -8 26 -8", c("#4a4350"), 1.6); strokeP("M340 130 q -10 -14 -24 -22", c("#4a4350"), 2); ctx.lineCap = "butt";
  fillP("M232 106 v-8 l3 -6 l3 6 v8 Z M338 132 v-8 l3 -6 l3 6 v8 Z", c("#5a5664")); strokeP("M235 92 v-4 M341 118 v-4", c(GOLD), 0.7);
  // les gargouilles aux corniches
  fillP("M236 126 l 8 -2 l 1.5 2.5 l -3 1.5 l 1 2.5 l -7.5 -1.5 Z M340 126 l -8 -2 l -1.5 2.5 l 3 1.5 l -1 2.5 l 7.5 -1.5 Z", c("#5a5664"));
  // PLAN AVANT DROIT — la tour isolée et sa passerelle couverte (avant la tour de l'astronome, qui passe devant)
  box(392, 150, 16, 60, FRONT);
  fillP("M388 150 L 400 120 L 412 150 Z", grad(388, 412, SL)); fillP("M400 120 L 412 150 L 400 150 Z", rgba(0, 0, 0, 0.2));
  strokeP("M400 120 v-6", c(GOLD), 0.9); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(400, 113, 1.1, 0, 6.283); ctx.fill();
  fillP("M390 172 h20 v2.4 h-20 Z", c("#7a7683")); strokeP("M393 172 v-4 M397 172 v-4 M401 172 v-4 M405 172 v-4", c("#2a2733"), 0.8);
  lancets(["M397 166 v-7 q3 -4 6 0 v7 Z", "M397 192 v-7 q3 -4 6 0 v7 Z"], 0.9);
  fillP("M368 160 q 12 -10 24 -6 l 0 4 q -12 -4 -24 6 Z", c("#6a6673")); fillP("M368 164 q 12 -10 24 -6 l 0 10 q -12 -4 -24 6 Z", c("#4a4350"));
  fillP("M373 171 v-5 q2 -3 4 0 v5 Z M381 169 v-5 q2 -3 4 0 v5 Z", c("#0a0809")); strokeP("M368 174 q 12 -10 24 -6", c("#7a7683"), 1.2);
  fillP("M372 176 q 8 14 8 34 l -4 0 q 0 -18 -8 -30 Z", c("#4a4350"));
  // la tour de l'astronome : avec l'observatoire, son sommet est la terrasse (en coordonnées de l'île : M.ty + 2)
  const top = observatory ? (M.ty + 2 - GY * (1 - s)) / s : 140;
  box(340, top, 28, 210 - top, FRONT);
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(336, top - 4, 36, 4); strokeP(`M339 ${top - 3} v-4 M345 ${top - 3} v-4 M351 ${top - 3} v-4 M357 ${top - 3} v-4 M363 ${top - 3} v-4 M369 ${top - 3} v-4`, c("#2a2733"), 0.8); // la plate-forme et son garde-corps
  if (!observatory) { fillP(`M336 ${top - 4} L 354 ${top - 44} L 372 ${top - 4} Z`, grad(336, 372, SL)); strokeP(`M354 ${top - 44} v-6`, c(GOLD), 1); }
  for (let y = top + 28; y < 200; y += 28) lancets([`M350 ${y} v-11 q4 -6 8 0 v11 Z`], 0.95);
  ctx.restore();
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

/**
 * Un îlot devenu morceau du château (dans le repère de l'îlot : son bord haut à y = 0, ±26 de large, échelle déjà posée) : plus de roche
 * ni d'herbe, de la maçonnerie suspendue. Sous chaque pièce, un cul-de-lampe de pierre en pointe (il remplace la roche). Cinq pièces :
 * une haute tour en encorbellement, un bastion à deux tourelles, une échauguette, un pan de mur ajouré, une petite tour.
 */
function castleIslet(ctx, c, night, i) {
  const kind = i % 5;
  // le cul-de-lampe : un cône renversé d'assises qui se resserrent, des bagues moulurées, une pointe
  const cw = kind === 1 ? 24 : kind === 3 ? 22 : 15, tip = kind === 1 ? 40 : 32;
  { const g = ctx.createLinearGradient(-cw, 0, cw, 0); g.addColorStop(0, c(STONE)); g.addColorStop(0.6, c(STONE_D)); g.addColorStop(1, c(STONE_DD)); ctx.fillStyle = g; }
  ctx.beginPath(); ctx.moveTo(-cw, 0); ctx.lineTo(cw, 0); ctx.quadraticCurveTo(cw * 0.7, tip * 0.45, 2, tip); ctx.lineTo(-2, tip); ctx.quadraticCurveTo(-cw * 0.7, tip * 0.45, -cw, 0); ctx.closePath(); ctx.fill();
  for (const v of [0.18, 0.4, 0.64]) { const ww = cw * (1 - v * 0.95), y = tip * v; ctx.fillStyle = c("#a29dab"); ctx.fillRect(-ww, y, ww * 2, 1.4); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(-ww, y + 1.4, ww * 2, 1); }
  ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(0, tip + 1.5, 1.4, 0, 6.283); ctx.fill(); // un fleuron au bout
  ctx.fillStyle = c("#a29dab"); ctx.fillRect(-cw - 2, -1.5, cw * 2 + 4, 3); // la corniche
  const body = (x, w, top) => { const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, c(STONE)); g.addColorStop(0.6, c(STONE_D)); g.addColorStop(1, c(STONE_DD)); ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, -top - 1.5); ctx.fillStyle = rgba(0, 0, 0, 0.16); for (let y = top + 5; y < -1.5; y += 5) ctx.fillRect(x - w / 2, y, w, 0.7); };
  const roof = (x, w, top, h) => { const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, c("#565a78")); g.addColorStop(1, c(SLATE_D)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, top); ctx.lineTo(x, top - h); ctx.lineTo(x + w / 2 + 2, top); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, top - h); ctx.lineTo(x, top - h - 4); ctx.stroke(); };
  const crenel = (x, w, top) => { ctx.fillStyle = c("#a29dab"); ctx.fillRect(x - w / 2 - 1.5, top - 1.5, w + 3, 2); };
  if (kind === 0) { // une haute tour en encorbellement
    body(0, 14, -34); crenel(0, 14, -34); roof(0, 14, -35, 22); lancet(ctx, 0, -20, 3, 8, winColor(night, 1)); lancet(ctx, 0, -6, 2.4, 5, winColor(night, 0.6));
    ctx.fillStyle = c("#a29dab"); ctx.fillRect(-9, -24, 18, 1.6); ctx.fillStyle = rgba(0, 0, 0, 0.35); for (let x = -8; x < 8; x += 3) ctx.fillRect(x, -27, 1, 3); // un balcon
  } else if (kind === 1) { // un bastion à deux tourelles
    body(0, 34, -14); crenel(0, 34, -14); ctx.fillStyle = rgba(0, 0, 0, 0.3); for (let x = -15; x < 16; x += 6) ctx.fillRect(x, -18, 3, 3.5); // les créneaux
    for (const x of [-14, 14]) { body(x, 10, -28); roof(x, 10, -29, 17); lancet(ctx, x, -17, 2.4, 6, winColor(night, 0.9)); }
    lancet(ctx, 0, -4, 5, 8, winColor(night, 0.8)); ctx.strokeStyle = c("#b8b3c0"); ctx.lineWidth = 0.6; ctx.strokeRect(-3, -12, 6, 8);
  } else if (kind === 2) { // une échauguette, sur une console
    body(0, 10, -22); roof(0, 10, -23, 16); lancet(ctx, 0, -10, 2.4, 6, winColor(night, 1));
  } else if (kind === 3) { // un pan de mur ajouré : deux arcs brisés, une tourelle d'angle
    body(-3, 30, -16); crenel(-3, 30, -16);
    for (const x of [-11, 1]) { ctx.fillStyle = rgba(12, 10, 16, 0.75); ctx.beginPath(); ctx.moveTo(x - 4, -2); ctx.lineTo(x - 4, -9); ctx.quadraticCurveTo(x - 4, -13, x, -14); ctx.quadraticCurveTo(x + 4, -13, x + 4, -9); ctx.lineTo(x + 4, -2); ctx.closePath(); ctx.fill(); }
    body(15, 8, -26); roof(15, 8, -27, 13); lancet(ctx, 15, -14, 2, 5, winColor(night, 1));
  } else { // une petite tour
    body(0, 11, -24); crenel(0, 11, -24); roof(0, 11, -25, 15); lancet(ctx, 0, -11, 2.4, 6, winColor(night, 0.9));
  }
}

/** Un cul-de-lampe de pierre sous un îlot du château (le calendrier, l'horloge D'ni) : le dessus à (x, y), demi-largeur w, pointe à y + tip ; un dallage dessus. */
function corbel(ctx, c, x, y, w, tip) {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, c(STONE)); g.addColorStop(0.6, c(STONE_D)); g.addColorStop(1, c(STONE_DD)); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.quadraticCurveTo(x + w * 0.7, y + tip * 0.45, x + 2, y + tip); ctx.lineTo(x - 2, y + tip); ctx.quadraticCurveTo(x - w * 0.7, y + tip * 0.45, x - w, y); ctx.closePath(); ctx.fill();
  for (const v of [0.18, 0.4, 0.64]) { const ww = w * (1 - v * 0.95), yy = y + tip * v; ctx.fillStyle = c("#a29dab"); ctx.fillRect(x - ww, yy, ww * 2, 1.4); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(x - ww, yy + 1.4, ww * 2, 1); }
  ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(x, y + tip + 1.5, 1.4, 0, 6.283); ctx.fill();
  ctx.fillStyle = c("#a29dab"); ctx.beginPath(); ctx.ellipse(x, y, w + 1, 4, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 0.6; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * w * 0.35, y - 3.4); ctx.lineTo(x + k * w * 0.4, y + 3.4); ctx.stroke(); } // le dallage
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

module.exports = { winColor, lancet, keep, gargoyle, chapel, chimneyAt, foundations, parapet, stoneBridge, isletTower, castleIslet, corbel, stelePath, bench, globalCastle, STONE, STONE_D, STONE_DD, SLATE, GOLD };
