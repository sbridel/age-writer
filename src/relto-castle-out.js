"use strict";
// Le Château, dehors (étape 2) : l'île entière devient le château. La montagne devient le donjon (asymétrique, l'observatoire intégré à
// sa plus haute tour), la roche de l'île des soubassements à arcs aveugles sous une enceinte, la cabane une chapelle au pied du donjon,
// les îlots des tours suspendues, les ponts de corde des passerelles de pierre, la cascade une gargouille, les menhirs et les piliers
// des stèles. Le vivant (herbe, fleurs, arbres, chat, koï) ne change pas. Aucune zone cliquable ne bouge (test/castle.test.js).
// Décisions et maquette : claude/DESIGN-chateau-gothique.md (Projet).
const { rng, clamp, mix, rgba } = require("./util");
const GY = 208;

const STONE = "#8a8591", STONE_D = "#5e5966", STONE_DD = "#3a3742", SLATE = "#3e4258", SLATE_D = "#24263a", GOLD = "#c9a24e";

/** La pierre au jour : à midi elle s'éclaircit vers un gris doux et bleuté (la maquette était une scène de nuit) ; au crépuscule elle redescend vers l'anthracite ; la nuit rouge n'y change rien. */
function daylight(sky) { const d = clamp(((sky.ambient == null ? 1 : sky.ambient) - 0.45) / 0.5) * (1 - (sky.red || 0)); return d; }
function litStone(sky) { const d = daylight(sky); return d <= 0 ? (h) => h : (h) => mix(h, "#b8bccb", 0.34 * d); }

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
  const lit = litStone(sky), amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", lit(h), amb), night = clamp(sky.night == null ? 0 : sky.night);
  const sunRight = daylight(sky) > 0 && (sky.hour || 12) > 13; // l'après-midi, le soleil est à droite : la face éclairée change de côté
  const ax = observatory ? M.tx : r.terraceOf ? r.terraceOf(M).tx : M.x, s = 0.66 + 0.04 * clamp((M.hw - 100) / 24), raise = M.h * 0.12, cx = M.x, hw = M.hw, h = M.h;
  const P = (d) => new Path2D(d), W = (k) => winColor(night, k);
  const grad = (x0, x1, stops) => { const g = sunRight ? ctx.createLinearGradient(x1, 0, x0, 0) : ctx.createLinearGradient(x0, 0, x1, 0); stops.forEach((h, i) => g.addColorStop(i / (stops.length - 1), c(h))); return g; };
  const MID = ["#6e6876", "#4a4552", "#2e2a36"], FRONT = ["#878090", "#5e5866", "#3a3542"], SL = ["#565a78", "#24263a"];
  const fillP = (d, f) => { ctx.fillStyle = f; ctx.fill(P(d)); }, strokeP = (d, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(P(d)); };
  const courses = (x, y, w, h) => { ctx.fillStyle = rgba(0, 0, 0, 0.22); for (let yy = y + 4.5, k = 0; yy < y + h; yy += 4.5, k++) { ctx.fillRect(x, yy, w, 0.7); for (let xx = x + (k % 2 ? 11 : 5.5); xx < x + w; xx += 11) ctx.fillRect(xx, yy, 0.6, 4.5); } };
  const box = (x, y, w, h, stops) => { ctx.fillStyle = grad(x, x + w, stops); ctx.fillRect(x, y, w, h); courses(x, y, w, h); };
  const lancets = (ds, k) => { for (const d of ds) fillP(d, W(k)); };
  // la lueur rouge des fenêtres, la nuit
  if (night > 0.2) { const g = ctx.createRadialGradient(ax - 40, GY - 90, 4, ax - 40, GY - 90, 120); g.addColorStop(0, rgba(255, 90, 60, 0.18 * night)); g.addColorStop(1, rgba(255, 90, 60, 0)); ctx.fillStyle = g; ctx.fillRect(ax - 170, GY - 210, 260, 220); }
  // la courtine : un mur crénelé au fond de la cour, d'un bord à l'autre de l'île, et une tour d'angle à chaque bout (le donjon passe devant)
  { const x0 = 152, x1 = 460, top = GY - 24;
    ctx.fillStyle = grad(x0, x1, ["#6a6472", "#4a4552", "#34303c"]); ctx.fillRect(x0, top, x1 - x0, GY + 2 - top); courses(x0, top, x1 - x0, GY + 2 - top);
    for (let x = x0; x < x1 - 3; x += 7) ctx.fillRect(x, top - 4, 4, 4); /* les merlons */
    ctx.fillStyle = c("#8a8494"); ctx.fillRect(x0, top, x1 - x0, 1.4);
    for (let x = x0 + 22; x < x1 - 12; x += 26) lancets([`M${x - 1.5} ${GY - 6} v-6 q1.5 -3 3 0 v6 Z`], 0.5);
    for (const [x, hh] of [[x0 + 2, 54], [x1 - 2, 46]]) { box(x - 8, GY - hh, 16, hh + 2, FRONT); ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - 10, GY - hh - 3, 20, 3); fillP(`M${x - 10} ${GY - hh - 3} L ${x} ${GY - hh - 30} L ${x + 10} ${GY - hh - 3} Z`, grad(x - 10, x + 10, SL)); strokeP(`M${x} ${GY - hh - 30} v-5`, c(GOLD), 0.9); lancets([`M${x - 2} ${GY - hh + 18} v-7 q2 -4 4 0 v7 Z`, `M${x - 2} ${GY - 10} v-7 q2 -4 4 0 v7 Z`], 0.9); }
  }
  // l'ancienne montagne, devenue la masse du château : sa silhouette exacte, hérissée de pignons, de créneaux et de flèches fines, semée de fenêtres
  { const bz = (a, b, c2, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c2 + u * u * u * d; }, pts = [];
    const seg = (x0, y0, x1, y1, x2, y2, x3, y3) => { for (let i = 0; i <= 30; i++) pts.push([bz(x0, x1, x2, x3, i / 30), bz(y0, y1, y2, y3, i / 30)]); };
    seg(cx - hw, GY + 2, cx - hw * 0.55, GY - h * 0.35, cx - hw * 0.3, GY - h * 0.95, cx - 6, GY - h); seg(cx - 6, GY - h, cx + 14, GY - h * 1.02, cx + hw * 0.35, GY - h * 0.7, cx + hw * 0.62, GY - h * 0.32); seg(cx + hw * 0.62, GY - h * 0.32, cx + hw * 0.85, GY - h * 0.1, cx + hw * 0.95, GY - 2, cx + hw, GY + 2);
    const yAt = (x) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return GY; };
    const q = rng(0x3a57), st = 9; ctx.fillStyle = grad(cx - hw, cx + hw, ["#3a3542", "#2a2632", "#1e1b26"]); ctx.beginPath(); ctx.moveTo(cx - hw, GY + 2);
    for (let x = cx - hw + 4; x < cx + hw - 4; x += st) { const y = Math.max(GY - h - 4, yAt(x + st / 2) - 4), k = q(); if (k < 0.34) { ctx.lineTo(x, y); ctx.lineTo(x + st / 2, y - 7); ctx.lineTo(x + st, y); } else if (k < 0.5) { ctx.lineTo(x, y); ctx.lineTo(x + st / 2 - 1.5, y); ctx.lineTo(x + st / 2, y - 16 - q() * 8); ctx.lineTo(x + st / 2 + 1.5, y); ctx.lineTo(x + st, y); } else { for (let m = 0; m < 3; m++) { const xx = x + m * st / 3; ctx.lineTo(xx, y - 2.5); ctx.lineTo(xx + st / 6, y - 2.5); ctx.lineTo(xx + st / 6, y); ctx.lineTo(xx + st / 3, y); } } }
    ctx.lineTo(cx + hw, GY + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = W(0.35); for (let i = 0; i < 26; i++) { const x = cx - hw * 0.9 + q() * hw * 1.8, top = yAt(x); if (GY - top > 14) ctx.fillRect(x, top + 6 + q() * (GY - top - 12), 1.6, 3); } // ses fenêtres
  }
  // le repère de la maquette (la tour de l'astronome à x = 354, le sol à y = 208), haussé : le donjon se dresse au sommet de l'ancienne montagne
  ctx.save(); ctx.translate(ax - 354 * s, GY * (1 - s) - raise); ctx.scale(s, s);
  // PLAN ARRIÈRE : pignons et flèches fines, en silhouette
  ctx.fillStyle = c("#2a2632");
  ctx.fill(P("M180 210 L 186 160 L 196 160 L 196 136 L 204 136 L 204 160 L 224 160 L 224 118 L 230 100 L 236 118 L 236 160 L 250 160 L 250 110 L 256 110 L 256 160 L 330 160 L 330 128 L 336 128 L 336 160 L 372 160 L 372 112 L 378 92 L 384 112 L 384 160 L 400 160 L 400 136 L 406 136 L 406 160 L 420 210 Z"));
  ctx.fill(P("M322 160 L 326 70 L 330 160 Z M196 136 L 200 112 L 204 136 Z M400 136 L 403 116 L 406 136 Z"));
  ctx.fillStyle = W(0.4); for (const [x, y] of [[229, 126], [229, 140], [377, 120], [377, 136], [325, 100], [325, 124], [200, 146], [403, 146]]) ctx.fillRect(x, y, 2, 4); // des fenêtres lointaines
  // une tourelle, derrière la tour ronde : plus petite, plus sombre, on la devine à peine (dessinée avant la tour, qui la cache en partie)
  ctx.fillStyle = c("#3e3a48"); ctx.fillRect(231, 98, 7, 18); fillP("M230 98 L 234.5 84 L 239 98 Z", c("#2e3044")); strokeP("M234.5 84 v-4", c(GOLD), 0.6); ctx.fillStyle = W(0.5); ctx.fillRect(233.8, 102, 1.4, 3);
  // PLAN MOYEN — la tour ronde, à gauche, son toit, son balcon, ses lancettes
  box(208, 112, 26, 98, MID);
  fillP("M204 112 L 221 76 L 238 112 Z", grad(204, 238, SL)); fillP("M221 76 L 238 112 L 221 112 Z", rgba(0, 0, 0, 0.22));
  strokeP("M221 76 v-8", c(GOLD), 1); fillP("M221 68 l-2.5 2.5 l2.5 1.6 l2.5 -1.6 Z", c(GOLD));
  fillP("M206 150 h30 v3 h-30 Z", c("#7a7683")); strokeP("M209 150 v-6 M214 150 v-6 M219 150 v-6 M224 150 v-6 M229 150 v-6 M234 150 v-6", c("#2a2733"), 0.9); ctx.fillStyle = c("#9a95a3"); ctx.fillRect(206, 143, 30, 1.2);
  lancets(["M216 130 v-9 q3 -5 6 0 v9 Z", "M216 176 v-9 q3 -5 6 0 v9 Z", "M224 196 v-7 q2.5 -4 5 0 v7 Z"], 0.9);
  strokeP("M219 121 v9 M216 126 h6 M219 167 v9 M216 172 h6", c("#17141a"), 0.7);
  // l'arc-boutant de gauche : un pinacle posé sur le parapet de la tour ronde, un arc plein qui vole par-dessus le pignon jusqu'au fût de la grande flèche (dessiné avant le pignon et la flèche, qui le recouvrent à ses bouts)
  fillP("M238 100 Q 266 78 298 85 L 298 89.5 Q 266 84 238 105 Z", c("#4a4350")); strokeP("M238 100 Q 266 78 298 85", c("#7a7683"), 0.8); // un arc fin, de la tourelle cachée derrière la tour ronde jusqu'au fût de la grande flèche
  // la petite flèche, derrière le pignon (dessinée avant lui : son pied plonge derrière le rampant, elle ne flotte pas)
  ctx.fillStyle = grad(246, 253, MID); ctx.fillRect(246, 92, 7, 30); fillP("M243 92 L 249.5 66 L 256 92 Z", grad(243, 256, SL)); strokeP("M249.5 66 v-5", c(GOLD), 0.9); ctx.fillStyle = W(0.8); ctx.fillRect(248.5, 80, 2, 4);
  // le corps à pignons
  box(234, 126, 102, 84, MID); /* collé à la tour ronde : plus de jour entre les deux */
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
  // les arcs-boutants à pinacles
  ctx.lineCap = "round"; strokeP("M340 130 q -10 -14 -24 -22", c("#4a4350"), 2); ctx.lineCap = "butt"; /* l'arc-boutant de droite seulement : ceux de gauche ne s'appuyaient sur rien */
  fillP("M338 132 v-8 l3 -6 l3 6 v8 Z", c("#5a5664")); strokeP("M341 118 v-4", c(GOLD), 0.7);
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
  const top = observatory ? (M.ty + 2 - GY * (1 - s) + raise) / s : 112, aw = 30 / s, a0 = 354 - aw / 2;
  box(a0, top, aw, 210 - top, FRONT);
  if (!observatory) { ctx.fillStyle = c("#7a7683"); ctx.fillRect(a0 - 4, top - 4, aw + 8, 4); ctx.fillStyle = c("#2a2733"); for (let x = a0 - 3; x < a0 + aw + 4; x += 6) ctx.fillRect(x, top - 8, 1.2, 4); } // la plate-forme et son garde-corps ; avec l'observatoire, la tour se prolonge sans rupture jusqu'à sa coupole
  if (!observatory) { fillP(`M${a0 - 4} ${top - 4} L 354 ${top - 50} L ${a0 + aw + 4} ${top - 4} Z`, grad(a0, a0 + aw, SL)); strokeP(`M354 ${top - 50} v-6`, c(GOLD), 1); }
  for (const sx of [-1, 1]) { const bx0 = sx < 0 ? a0 - 5 : a0 + aw; ctx.fillStyle = grad(bx0, bx0 + 5, FRONT); ctx.fillRect(bx0, top + 30, 5, 210 - top - 30); for (let y = top + 60; y < 200; y += 40) { ctx.fillStyle = c("#a29dab"); ctx.fillRect(bx0 - 0.5, y, 6, 1.6); } } // les contreforts, à ressauts
  for (let y = top + 34; y < 200; y += 26) { lancets([`M350 ${y} v-12 q4 -7 8 0 v12 Z`], 0.95); strokeP(`M354 ${y - 12} v12 M350 ${y - 6} h8`, c("#17141a"), 0.7); strokeP(`M348 ${y} v-12 q6 -10 12 0 v12`, c("#a29dab"), 0.9); } // les lancettes, leur meneau et leur larmier
  ctx.fillStyle = c("#a29dab"); ctx.fillRect(a0 - 3, top + 16, aw + 6, 2.4); ctx.fillStyle = c("#5e5866"); for (let x = a0 - 2; x < a0 + aw + 2; x += 5) { ctx.beginPath(); ctx.moveTo(x, top + 18.4); ctx.lineTo(x + 3.4, top + 18.4); ctx.lineTo(x + 1.7, top + 23); ctx.closePath(); ctx.fill(); } // une galerie sur mâchicoulis
  strokeP(`M${a0 + 4} ${top + 16} v-5 M${a0 + aw - 4} ${top + 16} v-5`, c("#2a2733"), 0.8); for (let x = a0 + 4; x < a0 + aw - 3; x += 5) lancets([`M${x} ${top + 15} v-6 q1.5 -2.5 3 0 v6 Z`], 0.5); // l'arcature de la galerie
  for (const sx of [-1, 1]) { const px = sx < 0 ? a0 - 4 : a0 + aw + 4; ctx.fillStyle = grad(px - 3.5, px + 3.5, FRONT); ctx.fillRect(px - 3.5, top - 8, 7, 26); fillP(`M${px - 4.5} ${top - 8} L ${px} ${top - 34} L ${px + 4.5} ${top - 8} Z`, grad(px - 4.5, px + 4.5, SL)); // deux pinacles d'angle, qui encadrent la coupole
    ctx.fillStyle = c("#1c1a26"); for (let k = 1; k < 4; k++) { const y = top - 8 - k * 6.5, w = 4.5 * (1 - k / 4); ctx.fillRect(px - w - 1.4, y, 1.4, 1.2); ctx.fillRect(px + w, y, 1.4, 1.2); }
    strokeP(`M${px} ${top - 34} v-5`, c(GOLD), 0.9); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(px, top - 39.5, 1.2, 0, 6.283); ctx.fill();
    fillP(`M${px + sx * 3.5} ${top + 22} l ${sx * 8} -2 l ${sx * 1.5} 2.5 l ${-sx * 3} 1.5 l ${sx * 1} 2.5 l ${-sx * 7.5} -1.5 Z`, c("#5a5664")); } // et leurs gargouilles
  ctx.restore();
  // le pied de l'ancienne montagne : un long corps de logis à contreforts et créneaux, d'un flanc à l'autre, une tour ronde à chaque bout
  { const x0 = cx - hw + 10, x1 = cx + hw - 10, top = GY - raise - 4;
    box(x0, top, x1 - x0, GY + 2 - top, MID); ctx.fillStyle = grad(x0, x1, MID); for (let x = x0; x < x1 - 3; x += 6) ctx.fillRect(x, top - 3.5, 3.5, 3.5); /* les merlons */
    ctx.fillStyle = c("#8a8494"); ctx.fillRect(x0, top, x1 - x0, 1.4);
    for (let x = x0 + 16; x < x1 - 10; x += 18) { ctx.fillStyle = c("#3a3542"); ctx.beginPath(); ctx.moveTo(x - 2.5, GY + 2); ctx.lineTo(x - 2.5, top + 8); ctx.lineTo(x, top + 3); ctx.lineTo(x + 2.5, top + 8); ctx.lineTo(x + 2.5, GY + 2); ctx.closePath(); ctx.fill(); lancets([`M${x + 9 - 1.8} ${GY - 5} v-9 q1.8 -4 3.6 0 v9 Z`], 0.7); } /* contreforts et lancettes */
    for (const [x, hh, w] of [[x0 - 2, raise + 30, 16], [x1 + 2, raise + 22, 14]]) { box(x - w / 2, GY - hh, w, hh + 2, FRONT); ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - w / 2 - 2, GY - hh - 3, w + 4, 3); fillP(`M${x - w / 2 - 2} ${GY - hh - 3} L ${x} ${GY - hh - 26} L ${x + w / 2 + 2} ${GY - hh - 3} Z`, grad(x - w / 2, x + w / 2, SL)); strokeP(`M${x} ${GY - hh - 26} v-5`, c(GOLD), 0.9); lancets([`M${x - 2} ${GY - hh + 14} v-7 q2 -4 4 0 v7 Z`, `M${x - 2} ${GY - 8} v-7 q2 -4 4 0 v7 Z`], 0.9); }
  }
  void t;
}

/** Le Château : la nuit rouge. Le jour reste le jour ; au crépuscule le ciel vire au rouge sombre, la nuit il est couleur de sang (sky.red, de 0 à 1). */
function redNight(sky) {
  const k = clamp(((sky.night == null ? 0 : sky.night) - 0.2) / 0.5); if (k <= 0) return sky;
  return Object.assign({}, sky, { top: mix(sky.top, "#14060e", k), bottom: mix(sky.bottom, "#5e1a20", k), stars: sky.stars * (1 - 0.35 * k), red: k });
}

/** La lune rouge : pleine, grande, un halo de braise, des mers sombres ; et des chauves-souris qui passent devant. */
function bloodMoon(ctx, sky, t, x, y) {
  const k = sky.red, R = 21;
  const halo = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 4); halo.addColorStop(0, rgba(255, 90, 48, 0.45 * k)); halo.addColorStop(1, rgba(255, 90, 48, 0)); ctx.fillStyle = halo; ctx.fillRect(x - R * 4, y - R * 4, R * 8, R * 8);
  ctx.save(); ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(x - R * 0.25, y - R * 0.25, R * 0.1, x, y, R); g.addColorStop(0, "#ff8a4a"); g.addColorStop(0.6, "#e03a22"); g.addColorStop(1, "#8a1a14"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
  ctx.fillStyle = "rgba(154,36,24,0.45)"; for (const [dx, dy, rr] of [[-0.37, -0.28, 0.14], [0.31, 0.28, 0.1], [0.47, -0.37, 0.07], [-0.19, 0.34, 0.08], [0.05, -0.05, 0.05]]) { ctx.beginPath(); ctx.arc(x + dx * R, y + dy * R, rr * R, 0, 6.283); ctx.fill(); }
  ctx.restore();
  if (k > 0.3) { const a = (k - 0.3) / 0.7; ctx.fillStyle = rgba(26, 8, 12, 0.9 * a); // les chauves-souris
    for (let i = 0; i < 6; i++) { const bx = ((i * 137 + t * (7 + (i % 3) * 3)) % 700) - 30, by = 38 + i * 17 + Math.sin(t * 0.8 + i * 2) * 8, f = Math.sin(t * 10 + i * 1.7), s = 2.4 + (i % 2);
      ctx.beginPath(); ctx.moveTo(bx - s * 1.6, by - f * s * 0.9); ctx.quadraticCurveTo(bx - s * 0.6, by - s * 0.2, bx, by + s * 0.25); ctx.quadraticCurveTo(bx + s * 0.6, by - s * 0.2, bx + s * 1.6, by - f * s * 0.9); ctx.quadraticCurveTo(bx + s * 0.7, by + s * 0.35, bx, by + s * 0.7); ctx.quadraticCurveTo(bx - s * 0.7, by + s * 0.35, bx - s * 1.6, by - f * s * 0.9); ctx.fill(); }
    giantBat(ctx, t, x, y, a); }
}

/** La chauve-souris géante : de loin en loin (toutes les 50 s environ, pendant 8 s), une grande silhouette traverse le ciel devant la lune, à grands coups d'ailes lents, les yeux rouges. */
function giantBat(ctx, t, mx, my, a) {
  const P = 52, D = 8, ph = ((t % P) + P) % P; if (ph > D) return;
  const u = ph / D, dir = Math.floor(t / P) % 2 ? -1 : 1, x = dir > 0 ? -70 + u * 780 : 710 - u * 780, y = my - 30 + Math.sin(u * Math.PI) * 44 + Math.sin(t * 2.6) * 5, f = Math.sin(t * 3.4), S = 1 + 0.5 * Math.sin(u * Math.PI);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * S, S); ctx.fillStyle = rgba(16, 6, 10, 0.95 * a);
  const wing = (s) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 14, -8 - f * 14, s * 34, -10 - f * 26); ctx.quadraticCurveTo(s * 30, -2 - f * 14, s * 24, 4 - f * 8); ctx.quadraticCurveTo(s * 20, 0 - f * 6, s * 14, 6 - f * 4); ctx.quadraticCurveTo(s * 9, 2, s * 4, 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(16, 6, 10, 0.95 * a); ctx.lineWidth = 0.8; for (const k of [0.45, 0.75]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 34 * k, (-10 - f * 26) * k + 4 * (1 - k)); ctx.stroke(); } };
  wing(1); wing(-1);
  ctx.beginPath(); ctx.ellipse(0, 3, 3.2, 6, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(0, -3, 2.6, 0, 6.283); ctx.fill(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 1.4, -4.5); ctx.lineTo(s * 2.6, -8.5); ctx.lineTo(s * 0.4, -5.6); ctx.closePath(); ctx.fill(); } // le corps, la tête, les oreilles
  ctx.fillStyle = rgba(255, 60, 40, 0.9 * a); ctx.fillRect(-1.6, -3.4, 1, 1); ctx.fillRect(0.6, -3.4, 1, 1); // les yeux
  ctx.restore();
}

/** La brume basse cramoisie de la nuit rouge : de grandes nappes sous l'île, qui dérivent lentement. */
function bloodFog(ctx, sky, t) {
  const k = sky.red;
  for (const [x, y, rx, ry, a, sp] of [[320, 300, 330, 70, 0.5, 0.15], [320, 252, 360, 40, 0.3, -0.1], [100, 330, 180, 40, 0.3, 0.2], [560, 320, 160, 36, 0.3, -0.18]]) {
    const xx = x + Math.sin(t * sp) * 18; ctx.save(); ctx.translate(xx, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(176, 84, 96, a * 0.7 * k)); g.addColorStop(1, rgba(176, 84, 96, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.283); ctx.fill(); ctx.restore();
  }
}

/**
 * Les pages Or, Argent et Gemmes sous le Château : au lieu de veines dessinées par-dessus les soubassements, des ornements serti dans
 * la maçonnerie. L'or dore les clés et le cerne des arcs aveugles, l'argent ceux des autres arcs, les gemmes sont des cabochons sertis
 * entre les arcs, qui luisent. La densité règle combien d'arcs en portent.
 */
function castleOre(ctx, kind, density, sky, t) {
  const d = clamp(density == null ? 0.6 : density), n = Math.max(2, Math.round(2 + d * 7)), amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb), night = clamp(sky.night == null ? 0 : sky.night);
  const arch = (i) => { const u = (i + 0.5) / 9; return [150 + u * 300, GY + 24 + Math.abs(u - 0.5) * 4]; };
  if (kind === "gold" || kind === "silver") {
    const col = kind === "gold" ? "#d8b45e" : "#c8d0dc", hi = kind === "gold" ? "#f4dc90" : "#eef2f8", order = kind === "gold" ? [4, 2, 6, 0, 8, 3, 5, 1, 7] : [3, 5, 1, 7, 0, 8, 2, 4, 6];
    for (const i of order.slice(0, n)) { const [x, top] = arch(i), w = 20, bot = top + 26;
      ctx.strokeStyle = c(col); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x - w / 2 - 1.5, bot); ctx.lineTo(x - w / 2 - 1.5, top + 8); ctx.quadraticCurveTo(x - w / 2 - 1.5, top - 0.5, x, top - 3.5); ctx.quadraticCurveTo(x + w / 2 + 1.5, top - 0.5, x + w / 2 + 1.5, top + 8); ctx.lineTo(x + w / 2 + 1.5, bot); ctx.stroke(); // le cerne de l'arc
      ctx.fillStyle = c(col); ctx.beginPath(); ctx.moveTo(x - 3, top - 4); ctx.lineTo(x + 3, top - 4); ctx.lineTo(x + 2, top + 2); ctx.lineTo(x - 2, top + 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(hi); ctx.fillRect(x - 2.4, top - 4, 1.2, 1.2); // la clé
      if (Math.sin(t * 1.3 + i * 2.1) > 0.96) { ctx.fillStyle = rgba(255, 250, 230, 0.8); ctx.fillRect(x - 0.6, top - 6, 1.2, 4); ctx.fillRect(x - 2, top - 4.6, 4, 1.2); } // un éclat
    }
  } else { // les gemmes : des cabochons sertis entre les arcs, et sous l'enceinte
    const cols = ["#5ad0a0", "#c04a6a", "#6a7ae0", "#e0b040", "#9a5ad0"];
    for (let i = 0; i < n; i++) { const x = 150 + ((i * 3 + 1) % 10) * (300 / 9), y = GY + 18 + (i % 3) * 22 + (i % 2) * 6, col = cols[i % cols.length], g = 0.35 + 0.25 * night + 0.15 * Math.sin(t * 1.1 + i);
      ctx.fillStyle = rgba(parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16), 0.18 * g); ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.fill();
      ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.283); ctx.fill(); // la sertissure
      ctx.fillStyle = mix(c(col), col, 0.4 + 0.4 * night); ctx.beginPath(); ctx.moveTo(x, y - 2.8); ctx.lineTo(x + 2.4, y); ctx.lineTo(x, y + 2.8); ctx.lineTo(x - 2.4, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.55); ctx.fillRect(x - 1, y - 1.6, 1, 1); }
  }
}

/** La gargouille du pied du donjon : en (x, y), tournée vers la droite (vers le bassin). */
function gargoyle(ctx, c, x, y) {
  ctx.fillStyle = c(STONE_D); ctx.beginPath(); ctx.moveTo(x - 6, y - 3); ctx.lineTo(x + 3, y - 4); ctx.lineTo(x + 6, y - 1); ctx.lineTo(x + 3, y + 1); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x - 4, y + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#17141a"); ctx.fillRect(x + 1, y - 2.6, 1, 1); ctx.fillStyle = c(STONE); ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x - 1, y - 7); ctx.lineTo(x + 1, y - 4); ctx.closePath(); ctx.fill(); // une oreille pointue
}

/** La chapelle, à la place de la cabane (même empreinte : x0..x0+w, toit jusqu'à y0 − 24) : pignon d'ardoise raide, une flèche, une lancette qui s'allume, une porte en arc brisé. */
/** La chapelle est plus petite que l'ancienne cabane (CHAPEL_K) : à côté du donjon, elle doit rester une chapelle. Sa zone cliquable, elle, ne change pas. */
const CHAPEL_K = 0.72;
function chapel(ctx, col, sky, t, x0, y0, w, h, hutX) {
  ctx.save(); ctx.translate(hutX, GY); ctx.scale(CHAPEL_K, CHAPEL_K); ctx.translate(-hutX, -GY); /* réduite, posée au même pied */
  const night = clamp(sky.night == null ? 0 : sky.night), fl = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1), x1 = x0 + w, ap = y0 - 34, glow = (k) => winColor(night * fl, k);
  const LIME = ["#7c7771", "#5d5953", "#3f3c38"] /* une pierre plus vieille que le château : grise et brune, moussue */, lime = (a, b) => { const g = ctx.createLinearGradient(a, 0, b, 0); LIME.forEach((h2, i) => g.addColorStop(i / 2, col(h2))); return g; };
  // la cheminée, derrière le pignon (la fumée en sort : drawChimney)
  ctx.fillStyle = col(STONE_D); ctx.fillRect(x1 - 12, y0 - 18, 6, 16); ctx.fillStyle = col(STONE); ctx.fillRect(x1 - 13, y0 - 19, 8, 2);
  // le toit d'ardoise, raide, qui déborde du pignon comme un chaperon, et ses crochets
  { const sg = ctx.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, col("#5a5e7c")); sg.addColorStop(1, col(SLATE_D)); ctx.fillStyle = sg; }
  ctx.beginPath(); ctx.moveTo(x0 - 4, y0 + 1); ctx.lineTo(hutX, ap - 3); ctx.lineTo(x1 + 4, y0 + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col("#1c1a26"); for (let k = 1; k < 4; k++) { const u = k / 4; for (const s of [-1, 1]) { const xx = hutX + s * (w / 2 + 4) * (1 - u), yy = y0 + 1 - (y0 + 4 - ap) * u; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + s * 2.6, yy - 1.6); ctx.lineTo(xx + s * 0.6, yy + 1.8); ctx.closePath(); ctx.fill(); } }
  // la façade : le mur et le pignon de pierre claire, d'un seul tenant
  ctx.fillStyle = lime(x0, x1); ctx.beginPath(); ctx.moveTo(x0, GY); ctx.lineTo(x0, y0); ctx.lineTo(x0 + 2, y0); ctx.lineTo(hutX, ap); ctx.lineTo(x1 - 2, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, GY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(0, 0, 0, 0.13); for (let y = y0 + 5; y < GY; y += 5) ctx.fillRect(x0, y, w, 0.7); for (let y = y0; y > ap + 4; y -= 5) { const half = (w / 2 - 2) * (y - ap) / (y0 - ap); ctx.fillRect(hutX - half, y, half * 2, 0.7); }
  ctx.fillStyle = col("#8c8780"); ctx.fillRect(x0, y0 - 1, w, 1.6); // le bandeau
  // la mousse : au pied, sur le bandeau, dans les joints ; des coulures sombres sous la rose
  { const q = rng(0xc4a9); ctx.fillStyle = rgba(0, 0, 0, 0.16); for (const dx of [-3, 2.5]) ctx.fillRect(hutX + dx, y0 - 4, 1.2, 9 + q() * 6);
    for (let i = 0; i < 18; i++) { const x = x0 - 3 + q() * (w + 6), y = i < 9 ? GY - q() * 5 : i < 14 ? y0 - 0.5 + q() * 1.5 : y0 + 4 + q() * (GY - y0 - 8); ctx.fillStyle = col(q() < 0.5 ? "#4f5c34" : "#5e6a3c"); ctx.beginPath(); ctx.ellipse(x, y, 1.6 + q() * 2.8, 0.9 + q() * 1.2, 0, 0, 6.283); ctx.fill(); } }
  // la rose, dans le pignon
  { const ry = y0 - 11, rr = 6.5; ctx.fillStyle = glow(0.9); ctx.beginPath(); ctx.arc(hutX, ry, rr, 0, 6.283); ctx.fill();
    ctx.strokeStyle = col("#2a2630"); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(hutX, ry, 2, 0, 6.283); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(hutX + Math.cos(a) * 2, ry + Math.sin(a) * 2); ctx.lineTo(hutX + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.stroke(); }
    ctx.strokeStyle = col("#938e86"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hutX, ry, rr + 1, 0, 6.283); ctx.stroke(); }
  // le clocheton, au faîte : une arcade où pend la cloche, un petit toit, la croix
  { const bw = 8, by = ap - 1; ctx.fillStyle = lime(hutX - bw / 2, hutX + bw / 2); ctx.fillRect(hutX - bw / 2, by - 12, bw, 12);
    ctx.fillStyle = col("#1a1720"); ctx.beginPath(); ctx.moveTo(hutX - 2.4, by - 2); ctx.lineTo(hutX - 2.4, by - 8); ctx.quadraticCurveTo(hutX, by - 11, hutX + 2.4, by - 8); ctx.lineTo(hutX + 2.4, by - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col(GOLD); ctx.beginPath(); ctx.moveTo(hutX - 1.8, by - 3.4); ctx.quadraticCurveTo(hutX - 1.6, by - 7.6, hutX, by - 7.8); ctx.quadraticCurveTo(hutX + 1.6, by - 7.6, hutX + 1.8, by - 3.4); ctx.closePath(); ctx.fill(); // la cloche
    ctx.fillStyle = col(SLATE_D); ctx.beginPath(); ctx.moveTo(hutX - bw / 2 - 1.5, by - 12); ctx.lineTo(hutX, by - 21); ctx.lineTo(hutX + bw / 2 + 1.5, by - 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col(GOLD); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hutX, by - 21); ctx.lineTo(hutX, by - 29); ctx.moveTo(hutX - 2.6, by - 26); ctx.lineTo(hutX + 2.6, by - 26); ctx.stroke(); }
  // le portail en arc brisé, au milieu : deux voussures, le tympan, la porte ; la nuit, un rai de lumière
  { const pw = 13, pt = GY - 22, pa = (k) => { ctx.beginPath(); ctx.moveTo(hutX - pw / 2 - k, GY); ctx.lineTo(hutX - pw / 2 - k, pt + 7); ctx.quadraticCurveTo(hutX - pw / 2 - k, pt - k * 0.8, hutX, pt - 3 - k * 1.2); ctx.quadraticCurveTo(hutX + pw / 2 + k, pt - k * 0.8, hutX + pw / 2 + k, pt + 7); ctx.lineTo(hutX + pw / 2 + k, GY); };
    ctx.fillStyle = col("#5a5348"); pa(3); ctx.closePath(); ctx.fill(); ctx.fillStyle = col("#1c1612"); pa(0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col("#938e86"); ctx.lineWidth = 0.9; pa(3); ctx.stroke(); ctx.strokeStyle = col("#6a6356"); pa(1.4); ctx.stroke();
    ctx.fillStyle = col("#3a2c22"); ctx.fillRect(hutX - pw / 2 + 0.8, pt + 6, pw - 1.6, GY - pt - 6); ctx.strokeStyle = col("#17110c"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(hutX, pt + 6); ctx.lineTo(hutX, GY); ctx.stroke(); // les deux battants
    ctx.fillStyle = col("#1c1820"); for (const yy of [pt + 10, GY - 5]) ctx.fillRect(hutX - pw / 2 + 0.8, yy, pw - 1.6, 1.1); // les pentures
    ctx.fillStyle = col(GOLD); ctx.beginPath(); ctx.arc(hutX - 1.6, GY - 9, 0.8, 0, 6.283); ctx.arc(hutX + 1.6, GY - 9, 0.8, 0, 6.283); ctx.fill();
    if (night > 0.3) { ctx.fillStyle = rgba(255, 150, 80, 0.7 * night * fl); ctx.fillRect(hutX - 0.5, pt + 7, 1, GY - pt - 7); } }
  // deux lancettes de part et d'autre du portail
  for (const lx of [hutX - 18, hutX + 18]) { lancet(ctx, lx, GY - 9, 5, 13, glow(1)); ctx.strokeStyle = col("#938e86"); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(lx - 3.2, GY - 9); ctx.lineTo(lx - 3.2, GY - 18); ctx.quadraticCurveTo(lx - 3.2, GY - 22, lx, GY - 23.2); ctx.quadraticCurveTo(lx + 3.2, GY - 22, lx + 3.2, GY - 18); ctx.lineTo(lx + 3.2, GY - 9); ctx.stroke(); }
  if (night > 0.3) { const gl = ctx.createRadialGradient(hutX, GY - 14, 2, hutX, GY - 14, 40); gl.addColorStop(0, rgba(255, 110, 70, 0.28 * night * fl)); gl.addColorStop(1, rgba(255, 110, 70, 0)); ctx.fillStyle = gl; ctx.fillRect(hutX - 42, GY - 56, 84, 60); }
  // deux contreforts d'angle, à pinacle
  for (const x of [x0 - 4, x1]) { ctx.fillStyle = lime(x, x + 4); ctx.fillRect(x, y0 + 2, 4, GY - y0 - 2); ctx.fillStyle = col("#4e483f"); ctx.fillRect(x - 0.5, y0 + 12, 5, 1.2);
    ctx.fillStyle = col(SLATE_D); ctx.beginPath(); ctx.moveTo(x - 0.6, y0 + 2); ctx.lineTo(x + 2, y0 - 9); ctx.lineTo(x + 4.6, y0 + 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = col(GOLD); ctx.fillRect(x + 1.6, y0 - 11, 0.9, 2); }
  ctx.restore();
}
/** Où sort la fumée de la cheminée de la chapelle. */
function chimneyAt(x0, y0, w) { const hx = x0 + w / 2; return [hx + (w / 2 - 9) * CHAPEL_K, GY - (GY - y0 + 20) * CHAPEL_K]; }

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
function castleIslet(ctx, c, night, i, low = false) {
  const kind = low ? 1 : i % 5; /* low : derrière le calendrier ou l'horloge D'ni, un bastion bas, sans tours, pour qu'ils se détachent sur le ciel */
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
    if (!low) for (const x of [-14, 14]) { body(x, 10, -28); roof(x, 10, -29, 17); lancet(ctx, x, -17, 2.4, 6, winColor(night, 0.9)); }
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

/** La stèle du calendrier, sous le Château : granit sombre en arc brisé, filet d'or ; le nombre D'ni s'y lit en or (dessiné ensuite par l'appelant). */
function calendarStele(ctx, c, x, y, night) {
  if (night > 0.2) { const g = ctx.createRadialGradient(x, y - 40, 1, x, y - 40, 22); g.addColorStop(0, rgba(232, 190, 96, 0.22 * night)); g.addColorStop(1, rgba(232, 190, 96, 0)); ctx.fillStyle = g; ctx.fillRect(x - 24, y - 64, 48, 48); }
  { const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0); g.addColorStop(0, c("#5e5966")); g.addColorStop(0.55, c("#46424f")); g.addColorStop(1, c("#2c2934")); ctx.fillStyle = g; }
  stelePath(ctx, x, y, 9, 62); ctx.fill();
  ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.8; stelePath(ctx, x, y - 3, 6.5, 54); ctx.stroke();
  ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.moveTo(x, y - 70); ctx.lineTo(x + 2, y - 63); ctx.lineTo(x - 2, y - 63); ctx.closePath(); ctx.fill(); // le fleuron
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - 11, y - 3, 22, 3); // le socle
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

module.exports = { castleOre, litStone, daylight, calendarStele, redNight, bloodMoon, bloodFog, winColor, lancet, keep, gargoyle, chapel, chimneyAt, foundations, parapet, stoneBridge, isletTower, castleIslet, corbel, stelePath, bench, globalCastle, STONE, STONE_D, STONE_DD, SLATE, GOLD };
