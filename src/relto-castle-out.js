"use strict";
// Le Château, dehors (étape 2) : l'île entière devient le château. La montagne devient le donjon (asymétrique, l'observatoire intégré à
// sa plus haute tour), la roche de l'île des soubassements à arcs aveugles sous une enceinte, la cabane une chapelle au pied du donjon,
// les îlots des tours suspendues, les ponts de corde des passerelles de pierre, la cascade une gargouille, les menhirs et les piliers
// des stèles. Le vivant (herbe, fleurs, arbres, chat, koï) ne change pas. Aucune zone cliquable ne bouge (test/castle.test.js).
// Décisions et maquette : claude/DESIGN-chateau-gothique.md (Projet).
const { rng, clamp, mix, rgba } = require("./util");
const MOON_PHOTO = require("./relto-moon-photo");
const GY = 208;

const STONE = "#8a8591", STONE_D = "#5e5966", STONE_DD = "#3a3742", SLATE = "#3e4258", SLATE_D = "#24263a", GOLD = "#c9a24e";

/** La pierre au jour : à midi elle s'éclaircit vers un gris doux et bleuté (la maquette était une scène de nuit) ; au crépuscule elle redescend vers l'anthracite ; la nuit rouge n'y change rien. */
function daylight(sky) { const d = clamp(((sky.ambient == null ? 1 : sky.ambient) - 0.45) / 0.5) * (1 - (sky.red || 0)); return d; }
function litStone(sky) { const d = daylight(sky); return d <= 0 ? (h) => h : (h) => mix(h, "#b8bccb", 0.34 * d); }

/**
 * L'ardoise : bleu-noir, nettement plus sombre que la pierre ; le jour elle ne s'éclaircit presque pas (contrairement à la pierre), car
 * c'est le contraste pierre claire / toit sombre qui donne une tête à chaque tour. Un toit (x0, by) → (ax, ay) → (x1, by) : le pan à
 * l'ombre (du côté opposé au soleil), des rangs d'ardoises, l'arête accrochée par la lumière, l'égout sombre. col : la couleur de la scène.
 */
const SLATE3 = ["#4b5172", "#2e3249", "#1b1e2e"];
function slateRoof(ctx, col, x0, ax, ay, x1, by, o = {}) {
  const sr = !!o.sunRight, step = o.step || 4, lw = o.lw || 0.5, path = () => { ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(ax, ay); ctx.lineTo(x1, by); ctx.closePath(); };
  const g = sr ? ctx.createLinearGradient(x1, 0, x0, 0) : ctx.createLinearGradient(x0, 0, x1, 0); SLATE3.forEach((h, i) => g.addColorStop(i / 2, col(h)));
  path(); ctx.fillStyle = g; ctx.fill();
  ctx.save(); path(); ctx.clip();
  ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.beginPath(); if (sr) { ctx.moveTo(x0, by); ctx.lineTo(ax, ay); ctx.lineTo(ax, by); } else { ctx.moveTo(ax, ay); ctx.lineTo(x1, by); ctx.lineTo(ax, by); } ctx.closePath(); ctx.fill(); /* le pan à l'ombre */
  if (o.rows !== false) { ctx.strokeStyle = rgba(6, 8, 18, 0.42); ctx.lineWidth = lw; for (let y = by - step; y > ay + step * 0.8; y -= step) { ctx.beginPath(); ctx.moveTo(Math.min(x0, x1), y); ctx.lineTo(Math.max(x0, x1), y); ctx.stroke(); } } /* les rangs d'ardoises */
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = col("#a3acd0"); ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, by); ctx.stroke(); ctx.restore(); /* l'arête */
  if (o.eave !== false) { ctx.fillStyle = col("#12142a"); ctx.fillRect(Math.min(x0, x1) - 0.4, by - lw * 2, Math.abs(x1 - x0) + 0.8, lw * 3.2); } /* l'égout */
}

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
  const MID = ["#6e6876", "#4a4552", "#2e2a36"], FRONT = ["#878090", "#5e5866", "#3a3542"];
  const cs = (h) => mix("#05060c", mix(h, "#8a93b8", 0.12 * daylight(sky)), amb); /* l'ardoise, à peine éclaircie le jour */
  const R = (x0, ax, ay, x1, by, o = {}) => slateRoof(ctx, cs, x0, ax, ay, x1, by, Object.assign({ sunRight }, o));
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
    for (const [x, hh] of [[x0 + 2, 54], [x1 - 2, 46]]) { box(x - 8, GY - hh, 16, hh + 2, FRONT); ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - 10, GY - hh - 3, 20, 3); R(x - 10, x, GY - hh - 30, x + 10, GY - hh - 3); strokeP(`M${x} ${GY - hh - 30} v-5`, c(GOLD), 0.9); lancets([`M${x - 2} ${GY - hh + 18} v-7 q2 -4 4 0 v7 Z`, `M${x - 2} ${GY - 10} v-7 q2 -4 4 0 v7 Z`], 0.9); }
  }
  // l'ancienne montagne, devenue la masse du château : sa silhouette exacte, hérissée de pignons, de créneaux et de flèches fines, semée de fenêtres
  { const bz = (a, b, c2, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c2 + u * u * u * d; }, pts = [];
    const seg = (x0, y0, x1, y1, x2, y2, x3, y3) => { for (let i = 0; i <= 30; i++) pts.push([bz(x0, x1, x2, x3, i / 30), bz(y0, y1, y2, y3, i / 30)]); };
    seg(cx - hw, GY + 2, cx - hw * 0.55, GY - h * 0.35, cx - hw * 0.3, GY - h * 0.95, cx - 6, GY - h); seg(cx - 6, GY - h, cx + 14, GY - h * 1.02, cx + hw * 0.35, GY - h * 0.7, cx + hw * 0.62, GY - h * 0.32); seg(cx + hw * 0.62, GY - h * 0.32, cx + hw * 0.85, GY - h * 0.1, cx + hw * 0.95, GY - 2, cx + hw, GY + 2);
    const yAt = (x) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return GY; };
    const q = rng(0x3a57), skyline = (seed, fill, lift, wins, sky0 = 8, tall = 0) => { /* une ligne de tours : chacune repose sur la masse du mont (son pied plonge dedans), aucune ne flotte */
      const z = rng(seed), roof = (x0, x1, y, kind) => { const w = x1 - x0, m = (x0 + x1) / 2;
        if (kind === 0) { ctx.moveTo(x0 - 1, y); ctx.lineTo(m, y - w * (1.5 + z() * 0.9)); ctx.lineTo(x1 + 1, y); } /* un toit en poivrière, raide */
        else if (kind === 1) { ctx.moveTo(m - 1.2, y); ctx.lineTo(m, y - 12 - z() * 14); ctx.lineTo(m + 1.2, y); } /* une flèche fine */
        else if (kind === 2) { const n = Math.max(2, Math.round(w / 3.4)); ctx.moveTo(x0, y); for (let i = 0; i < n; i++) { const a = x0 + (i * w) / n, b = a + w / n * 0.55, hh = z() < 0.22 ? 1 + z() * 1.5 : 3; ctx.lineTo(a, y - hh); ctx.lineTo(b, y - hh); ctx.lineTo(b, y); ctx.lineTo(a + w / n, y); } } /* des créneaux, dont certains brisés */
        else { ctx.moveTo(x0 - 1, y); ctx.lineTo(x0 + w * 0.22, y - w * 0.9); ctx.lineTo(x1 - w * 0.22, y - w * 0.9); ctx.lineTo(x1 + 1, y); ctx.moveTo(m - 1, y - w * 0.9); ctx.lineTo(m, y - w * 0.9 - 9 - z() * 8); ctx.lineTo(m + 1, y - w * 0.9); } }; /* un comble brisé et son épi */
      ctx.fillStyle = fill; ctx.beginPath();
      for (let x = cx - hw + 8; x < cx + hw - 10;) { const w = z() < 0.22 ? 12 + z() * 8 : 4 + z() * 8, base = yAt(x + w / 2), rise = (z() < 0.3 + tall ? 8 + z() * 14 + tall * 120 * z() : 1 + z() * 7) * lift, top = Math.max(GY - h - sky0, base - rise), k = z();
        ctx.rect(x, top, w, GY - top); roof(x, x + w, top, w > 14 ? (k < 0.5 ? 3 : 2) : k < 0.5 ? 0 : k < 0.75 ? 1 : 2);
        if (w < 12 && z() < 0.3) { const tw = w * 0.6, tx = x + (z() < 0.5 ? -tw * 0.35 : w - tw * 0.65), ty = top + 4 + z() * 6; ctx.moveTo(tx + tw, ty + 6); ctx.lineTo(tx + tw / 2, ty + 10); ctx.lineTo(tx, ty + 6); ctx.rect(tx, ty - 6, tw, 12); ctx.moveTo(tx - 0.5, ty - 6); ctx.lineTo(tx + tw / 2, ty - 6 - tw * 2.2); ctx.lineTo(tx + tw + 0.5, ty - 6); } /* une tourelle en encorbellement, accrochée au flanc */
        if (wins) wins.push([x, top, w]);
        x += w * (0.55 + z() * 0.6); }
      ctx.fill(); };
    const far = mix(c("#4e4858"), c("#7a7488"), 0.25 * daylight(sky)), wins = [];
    skyline(0x91d2, far, 1.1, null); /* le plan lointain, plus clair */
    const Yp = (u) => GY - 100 * u, Xp = (u) => cx + hw * u;
    const crown = (x, y, w) => { ctx.moveTo(x - 1.5, y - 2.4); ctx.lineTo(x + w + 1.5, y - 2.4); ctx.lineTo(x + w + 1.5, y); ctx.lineTo(x - 1.5, y); }; /* tracée dans le même sens que les fûts (sinon, au chevauchement, le remplissage s'annule et laisse voir le ciel) */
    const spire = (x, y, w, k) => { ctx.moveTo(x - 0.8, y); ctx.lineTo(x + w / 2, y - w * k); ctx.lineTo(x + w + 0.8, y); };
    const foot = (x, w) => Math.min(GY, yAt(x + w / 2) + 6);
    const tower = (x, top, w, bot, k) => { ctx.rect(x, top, w, bot - top); crown(x, top, w); spire(x, top - 2.4, w, k); };
    /* au fond, la tour de l'horloge : un fût carré très haut, le cadran, un beffroi ajouré, une flèche et ses clochetons ; à gauche une petite tour
       posée sur la masse, reliée par une passerelle ; à droite une tourelle suspendue au bout d'un bras, sur sa jambe de force. Rien ne flotte. */
    const CT = { x: Xp(0.2), w: 18, top: Yp(1.14) }, ctMid = CT.x + CT.w / 2, B = CT.top - 20, dialY = B + 10.5;
    ctx.fillStyle = far; ctx.beginPath();
    { const { x, w, top } = CT; ctx.rect(x, top, w, foot(x, w) - top); /* le fût, entier jusqu'à la masse */
      crown(x, top + 25, w); ctx.rect(x - 2, top + 25, w + 4, 2); for (let k = 0; k <= 6; k++) ctx.rect(x - 1.6 + k * (w + 3.2) / 6, top + 22.6, 0.9, 2.4); /* une galerie à balustrade, sous le cadran */
      crown(x, top, w); ctx.rect(x, B, w, 20); crown(x, B, w); /* le beffroi, aussi large que le fût, entre deux corniches */
      ctx.moveTo(x + 1, B - 2.4); ctx.lineTo(ctMid, B - 2.4 - w * 1.25); ctx.lineTo(x + w - 1, B - 2.4); /* la flèche */
      ctx.moveTo(ctMid - 2, B - 10); ctx.lineTo(ctMid, B - 14); ctx.lineTo(ctMid + 2, B - 10); ctx.rect(ctMid - 2, B - 10, 4, 3.5); /* une lucarne sur la flèche */
      for (const px of [x - 1.5, x + w - 1.5]) { ctx.rect(px, B - 7, 3, 7); ctx.moveTo(px - 0.4, B - 7); ctx.lineTo(px + 1.5, B - 16); ctx.lineTo(px + 3.4, B - 7); } /* les clochetons d'angle */
      for (const px of [x - 1.2, x + w - 1.8]) { ctx.rect(px, top - 2, 3, 4); ctx.moveTo(px - 0.3, top - 2); ctx.lineTo(px + 1.5, top - 7); ctx.lineTo(px + 3.3, top - 2); } } /* et deux pinacles, à la corniche du cadran */
    /* les deux tours reliées, minuscules (elles sont aussi loin que l'horloge) : à gauche une tourelle sur la masse et sa passerelle ; à droite une tourelle suspendue au bout d'un bras grêle */
    { const w = 5, x = CT.x - 13, top = CT.top - 16, by = CT.top - 4; tower(x, top, w, foot(x, w), 2.6); ctx.rect(x + w, by, CT.x - x - w, 1.4); ctx.moveTo(CT.x, by + 1.4); ctx.lineTo(CT.x - 2.5, by + 1.4); ctx.lineTo(CT.x, by + 4.5); }
    { const ax0 = CT.x + CT.w, ay = CT.top - 2, ax1 = ax0 + 13, th = 1.4; ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay - 1); ctx.lineTo(ax1, ay - 1 + th); ctx.lineTo(ax0, ay + th);
      ctx.moveTo(ax0, ay + th + 5); ctx.lineTo(ax0 + 6, ay + th - 0.4); ctx.lineTo(ax0 + 4.5, ay + th - 0.4); ctx.lineTo(ax0, ay + th + 7); /* la jambe de force */
      const hw3 = 4.6, hx = ax1 - hw3 / 2, hy = ay - 6, len = 8; tower(hx, hy, hw3, hy + len, 2.2); ctx.moveTo(hx - 0.5, hy + len); ctx.quadraticCurveTo(hx + hw3 / 2, hy + len + 3, hx + hw3 + 0.5, hy + len); ctx.moveTo(hx + 0.6, hy + len + 1.4); ctx.lineTo(hx + hw3 / 2, hy + len + 1.4 + hw3 * 1.6); ctx.lineTo(hx + hw3 - 0.6, hy + len + 1.4); }
    ctx.fill();
    { const d = daylight(sky), right = d > 0 && (sky.hour || 12) > 13; if (d > 0) { const ww = CT.w * 0.45, yb = foot(CT.x, CT.w); ctx.fillStyle = rgba(255, 250, 240, 0.12 * d); ctx.fillRect(right ? CT.x + CT.w * 0.55 : CT.x, B, ww, yb - B); ctx.fillStyle = rgba(0, 0, 0, 0.08 * d); ctx.fillRect(right ? CT.x : CT.x + CT.w * 0.55, B, ww, yb - B); } } /* le côté éclairé : la tour prend du volume */
    { const R = 6.4, nt = clamp(sky.night || 0); /* la rosace : un vitrail sombre qui s'embrase la nuit, son réseau de pierre, un anneau */
      ctx.fillStyle = mix(c("#3a1020"), W(1), nt * 0.6); ctx.beginPath(); ctx.arc(ctMid, dialY, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = c("#17141a"); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(ctMid, dialY, R * 0.34, 0, 6.283); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(ctMid + Math.cos(a) * R * 0.34, dialY + Math.sin(a) * R * 0.34); ctx.lineTo(ctMid + Math.cos(a) * R, dialY + Math.sin(a) * R); } ctx.stroke();
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4, ox = ctMid + Math.cos(a) * R * 0.66, oy = dialY + Math.sin(a) * R * 0.66; ctx.moveTo(ox + R * 0.24, oy); ctx.arc(ox, oy, R * 0.24, 0, 6.283); } ctx.stroke(); /* les lobes */
      ctx.strokeStyle = mix(c("#8a8494"), c("#a8a2b2"), 0.4 * daylight(sky)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ctMid, dialY, R + 0.9, 0, 6.283); ctx.stroke();
      ctx.fillStyle = W(0.6); for (const bx of [CT.x + 4, CT.x + CT.w - 7]) { const y0 = CT.top + 4; ctx.beginPath(); ctx.moveTo(bx, y0 + 9); ctx.lineTo(bx, y0 + 3); ctx.quadraticCurveTo(bx + 1.5, y0, bx + 3, y0 + 3); ctx.lineTo(bx + 3, y0 + 9); ctx.closePath(); ctx.fill(); } /* deux baies en arc, sous la rosace */
      for (let y = CT.top + 30; y < foot(CT.x, CT.w) - 8; y += 12) ctx.fillRect(ctMid - 0.8, y, 1.6, 3.4); } /* des meurtrières le long du fût */
    ctx.fillStyle = grad(cx - hw, cx + hw, ["#3a3542", "#2a2632", "#1e1b26"]); ctx.beginPath(); ctx.moveTo(cx - hw, GY + 2); for (const [x, y] of pts) ctx.lineTo(x, y); ctx.lineTo(cx + hw, GY + 2); ctx.closePath(); ctx.fill(); /* la masse du mont */
    skyline(0x3a57, grad(cx - hw, cx + hw, ["#3a3542", "#2a2632", "#1e1b26"]), 1, wins); /* le plan proche */
    /* devant : une tour étagée à gauche, une flèche brisée qui penche, et un seul bras court à droite qui porte une tour suspendue */
    ctx.fillStyle = grad(cx - hw, cx + hw, ["#3a3542", "#2a2632", "#1e1b26"]); ctx.beginPath();
    { const x = Xp(-0.46), w = 12, top = Yp(0.88), w2 = 7, x2 = x + 4, t2 = top - 16; ctx.rect(x, top, w, foot(x, w) - top); crown(x, top, w); ctx.rect(x2, t2, w2, top - t2); crown(x2, t2, w2); spire(x2, t2 - 2.4, w2, 2.6);
      ctx.moveTo(x - 1, top - 2.4); ctx.lineTo(x + 1.4, top - 9); ctx.lineTo(x + 3.8, top - 2.4); ctx.moveTo(x + w - 3.8, top - 2.4); ctx.lineTo(x + w - 1.4, top - 9); ctx.lineTo(x + w + 1, top - 2.4); wins.push([x, top, w]); } /* la tour étagée et ses clochetons */
    { const x = Xp(-0.06), w = 7, top = Yp(0.84); ctx.rect(x, top, w, foot(x, w) - top); crown(x, top, w); ctx.moveTo(x - 0.6, top - 2.4); ctx.lineTo(x + 6, top - 13); ctx.lineTo(x + 3.4, top - 15.5); ctx.lineTo(x + 5.6, top - 19); ctx.lineTo(x + w + 0.6, top - 2.4); } /* une flèche brisée, qui penche, son bout cassé */
    { const x0 = Xp(0.4), w0 = 11, top0 = Yp(0.9); ctx.rect(x0, top0, w0, foot(x0, w0) - top0); crown(x0, top0, w0); spire(x0, top0 - 2.4, w0, 2.2); wins.push([x0, top0, w0]); }
    ctx.fill();
    ctx.fillStyle = W(0.35); for (const [x, top, w] of wins) { if (q() < 0.55 && GY - top > 18) { const n = 1 + (q() * 2 | 0); for (let i = 0; i < n; i++) ctx.fillRect(x + w / 2 - 0.8, top + 6 + i * 7 + q() * 3, 1.6, 3); } } /* ses fenêtres, sur les tours */
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
  R(204, 221, 76, 238, 112);
  strokeP("M221 76 v-8", c(GOLD), 1); fillP("M221 68 l-2.5 2.5 l2.5 1.6 l2.5 -1.6 Z", c(GOLD));
  fillP("M206 150 h30 v3 h-30 Z", c("#7a7683")); strokeP("M209 150 v-6 M214 150 v-6 M219 150 v-6 M224 150 v-6 M229 150 v-6 M234 150 v-6", c("#2a2733"), 0.9); ctx.fillStyle = c("#9a95a3"); ctx.fillRect(206, 143, 30, 1.2);
  lancets(["M216 130 v-9 q3 -5 6 0 v9 Z", "M216 176 v-9 q3 -5 6 0 v9 Z", "M224 196 v-7 q2.5 -4 5 0 v7 Z"], 0.9);
  strokeP("M219 121 v9 M216 126 h6 M219 167 v9 M216 172 h6", c("#17141a"), 0.7);
  // l'arc-boutant de gauche : un pinacle posé sur le parapet de la tour ronde, un arc plein qui vole par-dessus le pignon jusqu'au fût de la grande flèche (dessiné avant le pignon et la flèche, qui le recouvrent à ses bouts)
  fillP("M238 100 Q 266 78 298 85 L 298 89.5 Q 266 84 238 105 Z", c("#4a4350")); strokeP("M238 100 Q 266 78 298 85", c("#7a7683"), 0.8); // un arc fin, de la tourelle cachée derrière la tour ronde jusqu'au fût de la grande flèche
  // la petite flèche, derrière le pignon (dessinée avant lui : son pied plonge derrière le rampant, elle ne flotte pas)
  box(244, 92, 11, 30, MID); lancets(["M248 108 v-6 q1.5 -3 3 0 v6 Z"], 0.8); // le fût : de la pierre appareillée, assez large pour porter sa flèche, et une lancette
  ctx.fillStyle = c("#a29dab"); ctx.fillRect(242.6, 91, 13.8, 1.8); ctx.fillStyle = c("#5e5966"); for (let x = 243.4; x < 256; x += 3.2) { ctx.beginPath(); ctx.moveTo(x, 92.8); ctx.lineTo(x + 2, 92.8); ctx.lineTo(x + 1, 95); ctx.closePath(); ctx.fill(); } // la corniche sur consoles, où la flèche se pose
  R(244.4, 249.5, 64, 254.6, 91, { step: 3.5 }); /* la flèche d'ardoise, en retrait de la corniche */
  for (const px of [244, 255]) { ctx.fillStyle = grad(px - 1.3, px + 1.3, MID); ctx.fillRect(px - 1.3, 85, 2.6, 6); R(px - 1.6, px, 77, px + 1.6, 85, { rows: false, eave: false }); strokeP(`M${px} 77 v-2`, c(GOLD), 0.5); } /* deux clochetons, aux angles de la corniche */
  fillP("M246.8 91 v-5 l2.7 -4 l2.7 4 v5 Z", grad(246, 252, MID)); lancets(["M248.6 90.5 v-3 q0.9 -1.6 1.8 0 v3 Z"], 0.8); // une lucarne au pied de la flèche
  strokeP("M249.5 66 v-5", c(GOLD), 0.9);
  // le corps à pignons
  box(234, 126, 102, 84, MID); /* collé à la tour ronde : plus de jour entre les deux */
  R(238, 266, 90, 294, 126);
  R(300, 318, 104, 336, 126);
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
  // la grande flèche : elle naît de sa tour par étages (rien n'est posé sans appui) — le fût, un étage de beffroi à deux baies, une
  // corniche ; sur la corniche, quatre clochetons d'angle et des gâbles qui enchâssent le pied de la flèche ; la flèche, plus étroite que
  // la tour, en cuivre vert-de-gris (le seul accent de couleur du Château : tout le reste est d'ardoise), ses arêtes, ses rangs
  // d'écailles, une lucarne, des crochets ; au sommet, la boule et la croix
  box(296, 78, 16, 48, FRONT);
  { const cv = (h) => mix("#05060c", mix(h, "#d6ece2", 0.1 * daylight(sky)), amb), V = { L: cv("#86b8a4"), M: cv("#558f7e"), D: cv("#2f5e55"), R: cv("#b4dccb"), K: cv("#1d3b36") };
    const sg = sunRight ? -1 : 1, X = 304, B = 78, H = 50, BW = 7.2, poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X + x * sg, B + y) : ctx.moveTo(X + x * sg, B + y))); ctx.closePath(); ctx.fill(); };
    box(296, 65, 16, 13, FRONT); /* l'étage du beffroi */
    for (const x of [-5, 0.5]) { poly([[x, -2], [x + 4, -2], [x + 4, -8], [x + 2, -10.5], [x, -8]], W(0.7)); poly([[x + 1.75, -9.5], [x + 2.25, -9.5], [x + 2.25, -2], [x + 1.75, -2]], c("#5e5866")); } /* deux baies en ogive, un meneau */
    ctx.fillStyle = c("#17141a"); for (const x of [-4, -1, 2, 5]) { ctx.beginPath(); ctx.arc(X + x, B - 0.9, 0.55, 0, 6.283); ctx.fill(); } /* la frise de quadrilobes */
    ctx.fillStyle = c("#a29dab"); ctx.fillRect(X - 9, B - 14, 18, 1.5); /* la corniche */
    poly([[-8, -14], [-2, -14], [-5, -21]], V.D); poly([[2, -14], [8, -14], [5, -21]], V.D); /* les gâbles des côtés, derrière */
    poly([[-BW, -14], [0, -14], [0, -14 - H]], V.L); poly([[0, -14], [BW, -14], [0, -14 - H]], V.M); poly([[BW * 0.55, -14], [BW, -14], [0, -14 - H]], V.D); /* les pans de la flèche */
    ctx.strokeStyle = V.R; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(X, B - 14); ctx.lineTo(X, B - 14 - H); ctx.stroke();
    ctx.strokeStyle = V.D; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(X - BW * 0.55 * sg, B - 14); ctx.lineTo(X, B - 14 - H); ctx.stroke(); /* les arêtes */
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = V.D; ctx.lineWidth = 0.3;
    for (let i = 1; i < 12; i++) { const y = B - 14 - (H * i) / 12.5, w = BW * (1 - i / 12.5); ctx.beginPath(); ctx.moveTo(X - w, y); for (let j = 0; j < 4; j++) { const x0 = X - w + (2 * w * j) / 4, x1 = X - w + (2 * w * (j + 1)) / 4; ctx.quadraticCurveTo((x0 + x1) / 2, y + 0.9, x1, y); } ctx.stroke(); } ctx.restore(); /* les rangs d'écailles arrondies */
    { const y = -14 - H * 0.36; poly([[-2, y + 4], [2, y + 4], [2, y + 1], [0, y - 2], [-2, y + 1]], V.D); poly([[-1, y + 4], [1, y + 4], [1, y + 1.6], [0, y + 0.4], [-1, y + 1.6]], W(0.6)); } /* la lucarne */
    ctx.fillStyle = V.R; for (let i = 1; i < 5; i++) { const f = i / 5.5, y = B - 14 - H * f, w = BW * (1 - f); for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X + k * w, y); ctx.lineTo(X + k * (w + 1.3), y - 1.2); ctx.lineTo(X + k * (w - 0.2), y - 1.6); ctx.closePath(); ctx.fill(); } } /* les crochets */
    poly([[-5.5, -14], [5.5, -14], [0, -24]], V.M); poly([[-5.5, -14], [0, -14], [0, -24]], V.L); /* le gâble de face */
    ctx.fillStyle = V.D; ctx.beginPath(); ctx.arc(X, B - 17.4, 1.5, 0, 6.283); ctx.fill(); ctx.fillStyle = mix(c("#17141a"), W(1), night * 0.7); for (const an of [0, 2.09, 4.19]) { ctx.beginPath(); ctx.arc(X + Math.sin(an) * 0.55, B - 17.4 - Math.cos(an) * 0.55, 0.5, 0, 6.283); ctx.fill(); } /* son oculus trilobé */
    ctx.fillStyle = V.R; ctx.beginPath(); ctx.moveTo(X, B - 24); ctx.lineTo(X - 0.6, B - 25.6); ctx.lineTo(X, B - 26.4); ctx.lineTo(X + 0.6, B - 25.6); ctx.closePath(); ctx.fill();
    for (const k of [-1, 1]) { const x = k * 7.8, lit = k * sg < 0; poly([[x - 1.3, -13], [x + 1.3, -13], [x + 1.3, -19], [x - 1.3, -19]], c(lit ? "#878090" : "#5e5866")); poly([[x - 1.6, -19], [x + 1.6, -19], [x, -29]], lit ? V.L : V.M); /* les clochetons d'angle */
      ctx.fillStyle = V.R; for (const f of [0.35, 0.65]) { const y = B - 19 - 10 * f, w = 1.6 * (1 - f), xx = X + x * sg; ctx.fillRect(xx - w - 0.6, y - 0.4, 0.7, 0.6); ctx.fillRect(xx + w - 0.1, y - 0.4, 0.7, 0.6); }
      ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(X + x * sg, B - 29.4, 0.5, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(X, B - 14 - H - 0.8, 0.9, 0, 6.283); ctx.fill(); ctx.fillRect(X - 0.3, B - 14 - H - 7, 0.6, 6.2); ctx.fillRect(X - 1.7, B - 14 - H - 5.4, 3.4, 0.6); /* le fleuron : la boule, la croix */
  }
  fillP("M293 92 h22 v2.6 h-22 Z", c("#7a7683")); strokeP("M296 92 v-5 M300 92 v-5 M304 92 v-5 M308 92 v-5 M312 92 v-5", c("#2a2733"), 0.8); // son balcon
  lancets(["M300 112 v-9 q4 -6 8 0 v9 Z"], 0.95); strokeP("M304 103 v9 M300 108 h8", c("#17141a"), 0.7);
  // la tourelle collée à la flèche
  fillP("M312 118 q7 -3 7 -11 v-7 h-7 Z", c("#4a4350")); ctx.fillStyle = grad(312, 320, FRONT); ctx.fillRect(312, 100, 8, 26);
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(310.5, 99, 11, 1.8); R(310, 316, 82, 322, 99.5, { step: 3.5 }); /* sa corniche, sa poivrière */ strokeP("M316 82 v-4", c(GOLD), 0.8); ctx.fillStyle = W(0.7); ctx.fillRect(315, 108, 2, 5);
  // les arcs-boutants à pinacles
  ctx.lineCap = "round"; strokeP("M340 130 q -10 -14 -24 -22", c("#4a4350"), 2); ctx.lineCap = "butt"; /* l'arc-boutant de droite seulement : ceux de gauche ne s'appuyaient sur rien */
  fillP("M338 132 v-8 l3 -6 l3 6 v8 Z", c("#5a5664")); strokeP("M341 118 v-4", c(GOLD), 0.7);
  // les gargouilles aux corniches
  fillP("M236 126 l 8 -2 l 1.5 2.5 l -3 1.5 l 1 2.5 l -7.5 -1.5 Z M340 126 l -8 -2 l -1.5 2.5 l 3 1.5 l -1 2.5 l 7.5 -1.5 Z", c("#5a5664"));
  // PLAN AVANT DROIT — la tour isolée et sa passerelle couverte (avant la tour de l'astronome, qui passe devant)
  box(392, 150, 16, 60, FRONT);
  ctx.fillStyle = c("#7a7683"); ctx.fillRect(389, 148, 22, 2.4); R(388, 400, 120, 412, 149); /* une corniche, où le toit se pose */
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
  if (!observatory) { R(a0 - 4, 354, top - 50, a0 + aw + 4, top - 4); strokeP(`M354 ${top - 50} v-6`, c(GOLD), 1); }
  for (const sx of [-1, 1]) { const bx0 = sx < 0 ? a0 - 5 : a0 + aw; ctx.fillStyle = grad(bx0, bx0 + 5, FRONT); ctx.fillRect(bx0, top + 30, 5, 210 - top - 30); for (let y = top + 60; y < 200; y += 40) { ctx.fillStyle = c("#a29dab"); ctx.fillRect(bx0 - 0.5, y, 6, 1.6); } } // les contreforts, à ressauts
  for (let y = top + 34; y < 200; y += 26) { lancets([`M350 ${y} v-12 q4 -7 8 0 v12 Z`], 0.95); strokeP(`M354 ${y - 12} v12 M350 ${y - 6} h8`, c("#17141a"), 0.7); strokeP(`M348 ${y} v-12 q6 -10 12 0 v12`, c("#a29dab"), 0.9); } // les lancettes, leur meneau et leur larmier
  ctx.fillStyle = c("#a29dab"); ctx.fillRect(a0 - 3, top + 16, aw + 6, 2.4); ctx.fillStyle = c("#5e5866"); for (let x = a0 - 2; x < a0 + aw + 2; x += 5) { ctx.beginPath(); ctx.moveTo(x, top + 18.4); ctx.lineTo(x + 3.4, top + 18.4); ctx.lineTo(x + 1.7, top + 23); ctx.closePath(); ctx.fill(); } // une galerie sur mâchicoulis
  strokeP(`M${a0 + 4} ${top + 16} v-5 M${a0 + aw - 4} ${top + 16} v-5`, c("#2a2733"), 0.8); for (let x = a0 + 4; x < a0 + aw - 3; x += 5) lancets([`M${x} ${top + 15} v-6 q1.5 -2.5 3 0 v6 Z`], 0.5); // l'arcature de la galerie
  for (const sx of [-1, 1]) { const px = sx < 0 ? a0 - 4 : a0 + aw + 4; ctx.fillStyle = grad(px - 3.5, px + 3.5, FRONT); ctx.fillRect(px - 3.5, top - 8, 7, 26); R(px - 4.5, px, top - 34, px + 4.5, top - 8, { rows: false }); // deux pinacles d'angle, qui encadrent la coupole
    ctx.fillStyle = c("#1c1a26"); for (let k = 1; k < 4; k++) { const y = top - 8 - k * 6.5, w = 4.5 * (1 - k / 4); ctx.fillRect(px - w - 1.4, y, 1.4, 1.2); ctx.fillRect(px + w, y, 1.4, 1.2); }
    strokeP(`M${px} ${top - 34} v-5`, c(GOLD), 0.9); ctx.fillStyle = c(GOLD); ctx.beginPath(); ctx.arc(px, top - 39.5, 1.2, 0, 6.283); ctx.fill();
    { const gx = sx < 0 ? a0 : a0 + aw, gy = top + 22, X = (u) => gx + sx * u, D = c("#4a4552"), M = c("#6e6876"), L = c("#8a8494"); /* et leurs gargouilles : de profil, penchées dans le vide, sur une console qui sort de l'angle de la tour, sous la galerie */
      ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(X(-1), gy - 1.6); ctx.lineTo(X(3), gy - 1.6); ctx.lineTo(X(3), gy + 1.5); ctx.lineTo(X(-1), gy + 5); ctx.closePath(); ctx.fill(); /* la console, prise dans l'angle de la tour */
      ctx.fillStyle = M; ctx.beginPath(); ctx.moveTo(X(1), gy - 1.4); ctx.quadraticCurveTo(X(4), gy - 4.6, X(7), gy - 3.2); /* le dos voûté */
      ctx.lineTo(X(8.4), gy - 4.6); ctx.lineTo(X(9), gy - 2.8); /* l'oreille */
      ctx.quadraticCurveTo(X(10.6), gy - 2.6, X(11.4), gy - 1.6); ctx.lineTo(X(9.6), gy - 1); /* le museau, la gueule ouverte */
      ctx.lineTo(X(11), gy + 0.2); ctx.quadraticCurveTo(X(9), gy + 1, X(7.4), gy + 0.4); /* la mâchoire */
      ctx.lineTo(X(6.6), gy + 2); ctx.lineTo(X(5.6), gy + 0.6); ctx.lineTo(X(3), gy + 1.2); ctx.closePath(); ctx.fill(); /* la patte, agrippée à la console */
      ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(X(1.4), gy - 1.6); ctx.quadraticCurveTo(X(4), gy - 4.2, X(6.6), gy - 3.2); ctx.lineTo(X(6.4), gy - 2.6); ctx.quadraticCurveTo(X(4), gy - 3.4, X(1.6), gy - 1); ctx.closePath(); ctx.fill(); /* le dos, éclairé */
      ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(X(3.4), gy - 2.6); ctx.lineTo(X(2), gy - 6.4); ctx.lineTo(X(4.2), gy - 4.4); ctx.lineTo(X(4.6), gy - 6); ctx.lineTo(X(5.6), gy - 3.6); ctx.closePath(); ctx.fill(); /* une aile repliée */
      ctx.fillStyle = c("#17141a"); ctx.fillRect(sx > 0 ? X(8.6) : X(9.4), gy - 2.4, 0.8, 0.8); } /* l'œil */ }
  ctx.restore();
  // le pied de l'ancienne montagne : un long corps de logis à contreforts et créneaux, d'un flanc à l'autre, une tour ronde à chaque bout
  { const x0 = cx - hw + 10, x1 = cx + hw - 10, top = GY - raise - 4;
    box(x0, top, x1 - x0, GY + 2 - top, MID); ctx.fillStyle = grad(x0, x1, MID); for (let x = x0; x < x1 - 3; x += 6) ctx.fillRect(x, top - 3.5, 3.5, 3.5); /* les merlons */
    ctx.fillStyle = c("#8a8494"); ctx.fillRect(x0, top, x1 - x0, 1.4);
    for (let x = x0 + 16; x < x1 - 10; x += 18) { ctx.fillStyle = c("#3a3542"); ctx.beginPath(); ctx.moveTo(x - 2.5, GY + 2); ctx.lineTo(x - 2.5, top + 8); ctx.lineTo(x, top + 3); ctx.lineTo(x + 2.5, top + 8); ctx.lineTo(x + 2.5, GY + 2); ctx.closePath(); ctx.fill(); { const lh = Math.min(9, GY - 5 - (top + 3) - 3), lw = lh < 6 ? 2.6 : 3.6; if (lh >= 2) lancets([`M${x + 9 - lw / 2} ${GY - 5} v-${lh.toFixed(1)} q${lw / 2} -${lw < 3 ? 2.6 : 4} ${lw} 0 v${lh.toFixed(1)} Z`], 0.7); } } /* contreforts et lancettes (la lancette tient sous le bandeau, quelle que soit la hauteur du mur) */
    for (const [x, hh, w] of [[x0 - 2, raise + 30, 16], [x1 + 2, raise + 22, 14]]) { box(x - w / 2, GY - hh, w, hh + 2, FRONT); ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - w / 2 - 2, GY - hh - 3, w + 4, 3); R(x - w / 2 - 2, x, GY - hh - 26, x + w / 2 + 2, GY - hh - 3); strokeP(`M${x} ${GY - hh - 26} v-5`, c(GOLD), 0.9); lancets([`M${x - 2} ${GY - hh + 14} v-7 q2 -4 4 0 v7 Z`, `M${x - 2} ${GY - 8} v-7 q2 -4 4 0 v7 Z`], 0.9); }
  }
  void t;
}

/** Le Château : la nuit rouge. Le jour reste le jour ; au crépuscule le ciel vire au rouge sombre, la nuit il est couleur de sang (sky.red, de 0 à 1). */
function redNight(sky) {
  const k = clamp(((sky.night == null ? 0 : sky.night) - 0.2) / 0.5); if (k <= 0) return sky;
  return Object.assign({}, sky, { top: mix(sky.top, "#14060e", k), bottom: mix(sky.bottom, "#5e1a20", k), stars: sky.stars * (1 - 0.35 * k), red: k });
}

/**
 * Le disque de la lune rouge : la photo de la pleine Lune (relto-moon-photo.js), teintée en braise une fois hors écran
 * (256 px) puis réduite. Tant que la photo charge, un simple disque dégradé ; dès qu'elle est là, la vraie Lune, rouge.
 */
let moonTex = null, moonImg = null;
function moonTexture() {
  if (moonTex) return moonTex;
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  if (!moonImg) {
    moonImg = new Image();
    moonImg.onload = () => { try { moonTex = tintMoon(moonImg); } catch (e) { moonTex = null; } };
    moonImg.onerror = () => { moonImg = { failed: true }; };
    try { moonImg.src = MOON_PHOTO; } catch (e) { moonImg = { failed: true }; }
  }
  return null;
}
/**
 * La photo en gris devient une lune de sang : adoucie (réduite à 64 px puis réagrandie : les cratères fondent, les mers
 * restent en nuages), puis teintée sur une rampe pourpre sombre → rouge sang → cuivre clair ; l'ombre pourpre qui mord en
 * bas à gauche, le limbe qui s'assombrit, un fin liseré clair sur le bord éclairé.
 */
function tintMoon(img) {
  const S = 256, C = S / 2, R = S / 2 - 1, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
  const g = cv.getContext("2d"); if (!g) return null;
  const sm = document.createElement("canvas"); sm.width = sm.height = 64; const gs = sm.getContext("2d"); if (!gs) return null;
  gs.drawImage(img, 0, 0, 64, 64);
  g.save(); g.beginPath(); g.arc(C, C, R, 0, 6.283); g.clip();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(sm, -4, -4, S + 8, S + 8);
  const px = g.getImageData(0, 0, S, S), d = px.data;
  for (let i = 0; i < d.length; i += 4) { const v = d[i] / 255, w = Math.pow(v, 0.85);
    d[i] = Math.round(255 * Math.min(1, 0.25 + 0.95 * w)); d[i + 1] = Math.round(255 * Math.max(0, 0.02 + 0.62 * w * w)); d[i + 2] = Math.round(255 * Math.max(0, 0.08 + 0.2 * w * w * w)); }
  g.putImageData(px, 0, 0);
  const umbra = g.createRadialGradient(C - R * 1.1, C + R * 1.1, R * 0.7, C - R * 1.1, C + R * 1.1, R * 2.4); umbra.addColorStop(0, "rgba(40,4,14,0.55)"); umbra.addColorStop(1, "rgba(40,4,14,0)"); g.fillStyle = umbra; g.fillRect(0, 0, S, S);
  const limb = g.createRadialGradient(C, C, R * 0.82, C, C, R); limb.addColorStop(0, "rgba(30,2,6,0)"); limb.addColorStop(1, "rgba(30,2,6,0.4)"); g.fillStyle = limb; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 24; i++) { const a0 = -2.2 + i * 0.12, f = Math.sin((i + 0.5) / 24 * Math.PI); g.strokeStyle = `rgba(255,214,170,${(0.45 * f).toFixed(3)})`; g.lineWidth = 2; g.beginPath(); g.arc(C, C, R - 1.1, a0, a0 + 0.125); g.stroke(); }
  g.restore();
  return cv;
}

/** La lune rouge : pleine, grande, un halo de braise, des mers floues (moonTexture) ; et des chauves-souris qui passent devant. */
function bloodMoon(ctx, sky, t, x, y) {
  const k = sky.red, R = 21;
  const halo = ctx.createRadialGradient(x, y, R * 0.6, x, y, R * 4); halo.addColorStop(0, rgba(255, 90, 48, 0.45 * k)); halo.addColorStop(1, rgba(255, 90, 48, 0)); ctx.fillStyle = halo; ctx.fillRect(x - R * 4, y - R * 4, R * 8, R * 8);
  ctx.save(); ctx.globalAlpha = k;
  const tex = moonTexture();
  if (tex) ctx.drawImage(tex, x - R, y - R, R * 2, R * 2);
  else { const g = ctx.createRadialGradient(x - R * 0.25, y - R * 0.25, R * 0.1, x, y, R); g.addColorStop(0, "#e8643c"); g.addColorStop(0.6, "#c03a24"); g.addColorStop(1, "#6e1610"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill(); }
  ctx.restore();
  if (k > 0.3) { const a = (k - 0.3) / 0.7; ctx.fillStyle = rgba(26, 8, 12, 0.9 * a); // les chauves-souris
    for (let i = 0; i < 6; i++) { const bx = ((i * 137 + t * (7 + (i % 3) * 3)) % 700) - 30, by = 38 + i * 17 + Math.sin(t * 0.8 + i * 2) * 8, f = Math.sin(t * 10 + i * 1.7), s = 2.4 + (i % 2);
      ctx.beginPath(); ctx.moveTo(bx - s * 1.6, by - f * s * 0.9); ctx.quadraticCurveTo(bx - s * 0.6, by - s * 0.2, bx, by + s * 0.25); ctx.quadraticCurveTo(bx + s * 0.6, by - s * 0.2, bx + s * 1.6, by - f * s * 0.9); ctx.quadraticCurveTo(bx + s * 0.7, by + s * 0.35, bx, by + s * 0.7); ctx.quadraticCurveTo(bx - s * 0.7, by + s * 0.35, bx - s * 1.6, by - f * s * 0.9); ctx.fill(); }
    giantBat(ctx, t, x, y, a); }
}

/**
 * La chauve-souris géante : de loin en loin (toutes les 50 s environ, pendant 9 s), elle sort de la lune, petite, et file vers un bord
 * en grandissant, de profil, la tête dans le sens du vol : un corps, une tête à museau, une haute oreille, un œil jaune, deux ailes
 * (la lointaine plus sombre) qui montent et descendent. Elle sort du cadre par un côté, puis l'autre la fois suivante.
 */
function giantBat(ctx, t, mx, my, a) {
  const P = 50, D = 9, ph = ((t % P) + P) % P; if (ph > D) return;
  const u = ph / D, dir = Math.floor(t / P) % 2 ? -1 : 1, e = u * u, x = mx + dir * (40 + e * 420), y = my - 6 + e * 70 + Math.sin(t * 2.2) * 4, S = 0.7 + e * 1.2, th = Math.sin(t * 6) * 0.95 + 0.1, fade = Math.min(1, u * 6) * a;
  const MEM = rgba(30, 10, 15, 0.95 * fade), FAR = rgba(16, 5, 8, 0.92 * fade), BONE = rgba(96, 40, 46, 0.9 * fade), FUR = rgba(20, 7, 10, fade);
  ctx.save(); ctx.translate(x, y); ctx.scale(S * dir, S); /* de profil, la tête dans le sens du vol */
  /* une aile, dessinée à plat (x le long du corps, z vers le bout de l'aile) puis relevée de th et vue un peu d'en haut : l'aile proche
     (s = 1) passe sous le corps, la lointaine (s = -1) au-dessus ; les deux battent ensemble */
  const wing = (sd, col, bones) => {
    const Q = ([px, pz]) => [px, -pz * Math.sin(th) + sd * pz * Math.cos(th) * 0.32];
    const sh = Q([3, 0]), wr = Q([5, 13]), d1 = Q([2, 31]), d2 = Q([-7, 27]), d3 = Q([-12, 17]), hip = Q([-6, 0.5]);
    const scal = (p0, p1) => ctx.quadraticCurveTo((p0[0] + p1[0]) / 2 + (wr[0] - (p0[0] + p1[0]) / 2) * 0.35, (p0[1] + p1[1]) / 2 + (wr[1] - (p0[1] + p1[1]) / 2) * 0.35, p1[0], p1[1]); /* un feston, creusé vers le poignet */
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...wr); ctx.lineTo(...d1); scal(d1, d2); scal(d2, d3); scal(d3, hip); ctx.closePath(); ctx.fill();
    if (bones) { ctx.strokeStyle = BONE; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...wr); ctx.stroke(); ctx.lineWidth = 0.6; ctx.beginPath(); for (const d of [d1, d2, d3]) { ctx.moveTo(...wr); ctx.lineTo(...d); } ctx.stroke(); } };
  wing(-1, FAR, false); /* l'aile lointaine, derrière le corps */
  ctx.fillStyle = FUR; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 3.6, -0.06, 0, 6.283); ctx.fill(); /* le corps */
  ctx.strokeStyle = FUR; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5, 1.5); ctx.lineTo(-11, 2.6); ctx.moveTo(-5, 0.5); ctx.lineTo(-10.5, 0.8); ctx.stroke(); /* les pattes, tendues en arrière */
  ctx.beginPath(); ctx.arc(7, -1, 3, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(8.6, -2.6); ctx.lineTo(12, -0.4); ctx.lineTo(8.6, 1); ctx.closePath(); ctx.fill(); /* la tête, le museau pointu */
  ctx.beginPath(); ctx.moveTo(4.8, -2.6); ctx.lineTo(5.2, -9.5); ctx.lineTo(7.4, -3.4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(6.6, -3.4); ctx.lineTo(7.8, -9); ctx.lineTo(9, -3); ctx.closePath(); ctx.fill(); /* les deux grandes oreilles */
  ctx.fillStyle = rgba(255, 210, 60, 0.95 * fade); ctx.beginPath(); ctx.arc(8.4, -1.6, 0.7, 0, 6.283); ctx.fill(); /* l'œil jaune */
  wing(1, MEM, true); /* l'aile proche, devant */
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
/** Sous le Château, on ne dessine que ce qui tient dans la maçonnerie de l'île : un point dans son contour, un rectangle (et sa marge) tout entier dedans. */
function inside(outline, x, y) { let a = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const [xi, yi] = outline[i], [xj, yj] = outline[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) a = !a; } return a; }
function fits(outline, x0, y0, x1, y1, m = 3) { return !outline || [[x0 - m, y0], [x1 + m, y0], [x0 - m, y1 + m], [x1 + m, y1 + m]].every(([x, y]) => inside(outline, x, y)); }

function castleOre(ctx, kind, density, sky, t, outline) {
  const d = clamp(density == null ? 0.6 : density), n = Math.max(2, Math.round(2 + d * 7)), amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb), night = clamp(sky.night == null ? 0 : sky.night);
  const arch = (i) => { const u = (i + 0.5) / 9; return [150 + u * 300, GY + 24 + Math.abs(u - 0.5) * 4]; };
  if (kind === "gold" || kind === "silver") {
    const col = kind === "gold" ? "#d8b45e" : "#c8d0dc", hi = kind === "gold" ? "#f4dc90" : "#eef2f8", order = kind === "gold" ? [4, 2, 6, 0, 8, 3, 5, 1, 7] : [3, 5, 1, 7, 0, 8, 2, 4, 6];
    for (const i of order.slice(0, n)) { const [x, top] = arch(i), w = 20, bot = top + 26; if (!fits(outline, x - w / 2 - 3, top - 5, x + w / 2 + 3, bot)) continue; /* pas d'arc doré qui déborde dans le vide */
      ctx.strokeStyle = c(col); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x - w / 2 - 1.5, bot); ctx.lineTo(x - w / 2 - 1.5, top + 8); ctx.quadraticCurveTo(x - w / 2 - 1.5, top - 0.5, x, top - 3.5); ctx.quadraticCurveTo(x + w / 2 + 1.5, top - 0.5, x + w / 2 + 1.5, top + 8); ctx.lineTo(x + w / 2 + 1.5, bot); ctx.stroke(); // le cerne de l'arc
      ctx.fillStyle = c(col); ctx.beginPath(); ctx.moveTo(x - 3, top - 4); ctx.lineTo(x + 3, top - 4); ctx.lineTo(x + 2, top + 2); ctx.lineTo(x - 2, top + 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(hi); ctx.fillRect(x - 2.4, top - 4, 1.2, 1.2); // la clé
      if (Math.sin(t * 1.3 + i * 2.1) > 0.96) { ctx.fillStyle = rgba(255, 250, 230, 0.8); ctx.fillRect(x - 0.6, top - 6, 1.2, 4); ctx.fillRect(x - 2, top - 4.6, 4, 1.2); } // un éclat
    }
  } else { // les gemmes : des cabochons sertis entre les arcs, et sous l'enceinte
    const cols = ["#5ad0a0", "#c04a6a", "#6a7ae0", "#e0b040", "#9a5ad0"];
    for (let i = 0; i < n; i++) { const x = 150 + ((i * 3 + 1) % 10) * (300 / 9), y = GY + 18 + (i % 3) * 22 + (i % 2) * 6, col = cols[i % cols.length], g = 0.35 + 0.25 * night + 0.15 * Math.sin(t * 1.1 + i); if (!fits(outline, x - 8, y - 8, x + 8, y + 8, 0)) continue;
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
  slateRoof(ctx, col, x0 - 4, hutX, ap - 3, x1 + 4, y0 + 1, { sunRight: daylight(sky) > 0 && (sky.hour || 12) > 13 });
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
    const u = (i + 0.5) / 9, x = 150 + u * 300, w = 20, top = GY + 24 + Math.abs(u - 0.5) * 4, bot = top + 26; if (!fits(outline, x - w / 2, top - 2, x + w / 2, bot)) continue; /* un arc que le bord de l'île couperait n'est pas dessiné */
    ctx.fillStyle = rgba(10, 8, 14, 0.55); ctx.beginPath(); ctx.moveTo(x - w / 2, bot); ctx.lineTo(x - w / 2, top + 8); ctx.quadraticCurveTo(x - w / 2, top + 1, x, top - 2); ctx.quadraticCurveTo(x + w / 2, top + 1, x + w / 2, top + 8); ctx.lineTo(x + w / 2, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#9a95a3"); ctx.lineWidth = 0.8; ctx.stroke();
  }
  ctx.fillStyle = c(STONE_D); for (const [x, y, hh] of [[168, GY + 18, 60], [240, GY + 18, 90], [380, GY + 18, 84], [446, GY + 18, 50]]) { if (!fits(outline, x - 5, y, x + 5, y + hh, 0) || !inside(outline, x, y + hh + 8)) continue; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x + 3, y + hh); ctx.lineTo(x, y + hh + 8); ctx.lineTo(x - 3, y + hh); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x + 1, y, 4, hh); ctx.fillStyle = c(STONE_D); } // des contreforts qui descendent dans la brume
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
  slateRoof(ctx, c, -w / 2 - 2, 0, top - (big ? 18 : 14), w / 2 + 2, top, { step: 3.5 });
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
  const roof = (x, w, top, h) => { slateRoof(ctx, c, x - w / 2 - 2, x, top - h, x + w / 2 + 2, top, { step: 3.5 }); ctx.strokeStyle = c(GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, top - h); ctx.lineTo(x, top - h - 4); ctx.stroke(); };
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

module.exports = { slateRoof, castleOre, litStone, daylight, calendarStele, redNight, bloodMoon, moonTexture, bloodFog, winColor, lancet, keep, gargoyle, chapel, chimneyAt, foundations, parapet, stoneBridge, isletTower, castleIslet, corbel, stelePath, bench, globalCastle, STONE, STONE_D, STONE_DD, SLATE, GOLD };
