"use strict";
// Le fond de l'atelier : quand on se retourne, l'autre côté de la pièce. Un lit à baldaquin, une armoire qui ne contient que des manches, une horloge sans aiguilles,
// un miroir en retard, une cage ouverte… Tout est dessiné ici (aucun asset) ; les objets ne servent à rien d'autre qu'à être étranges.
const { rng, clamp, mix, rgba } = require("./util");
const W = 640, H = 360, FLOOR = 250;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const flick = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** Un bouton rond, en haut à gauche, pour se retourner : deux flèches qui tournent. */
function turnButton(r, ctx, label, go) {
  ctx.fillStyle = "rgba(20,14,8,0.72)"; ctx.beginPath(); ctx.arc(22, 22, 12, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#c9a24e"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.strokeStyle = "rgba(233,220,184,0.95)"; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(16, 22); ctx.lineTo(28, 22); ctx.moveTo(24, 17.5); ctx.lineTo(28, 22); ctx.lineTo(24, 26.5); ctx.stroke(); ctx.lineCap = "butt"; // une simple flèche vers la droite
  r.hot.push({ x: 8, y: 8, w: 28, h: 28, tip: label, go });
}

const CAT_FUR = { orange: "#d9822b", black: "#2a2a31", white: "#e9e4da", grey: "#8c8c94", gray: "#8c8c94", brown: "#7a5236", cream: "#e3cfa4" };
/** Le chat, roulé en boule, posé en (x, y) (le bas du corps) ; il respire. */
function curledCat(r, ctx, c, cat, x, y, t, tipKey, TRr) {
  const fur = c(CAT_FUR[String(cat.color || "orange").toLowerCase()] || CAT_FUR.orange), br = Math.sin(t * 1.6) * 0.8;
  ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.beginPath(); ctx.ellipse(x, y + 1, 24, 5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(x, y - 8, 20, 9 + br * 0.4, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 15, y - 10, 8, 7, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 20, y - 15); ctx.lineTo(x - 19, y - 22); ctx.lineTo(x - 15, y - 16); ctx.moveTo(x - 13, y - 16); ctx.lineTo(x - 10, y - 22); ctx.lineTo(x - 9, y - 14); ctx.fill();
  ctx.strokeStyle = fur; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 16, y - 4); ctx.quadraticCurveTo(x + 26, y, x + 10, y + 1); ctx.stroke(); ctx.lineCap = "butt";
  ctx.strokeStyle = rgba(30, 20, 10, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 19, y - 10); ctx.lineTo(x - 16, y - 10); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x - 11, y - 10); ctx.stroke();
  const nm = String(cat.name || "").trim(), tip = TRr(tipKey);
  r.hot.push({ x: x - 26, y: y - 26, w: 54, h: 30, tip: nm ? `${nm} — ${tip}` : tip, flash: "purr…", purr: true });
}

function drawBackroom(r, ctx, sc, sky, t) {
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), q = rng(0xbed1), fl = flick(t), now = Date.now();
  const item = (x, y, w, h, tip, flash, extra) => r.hot.push({ x, y, w, h, tip: TRr(tip), flash: flash ? TRr(flash) : undefined, ...(extra || {}) });
  // murs tendus de papier sombre, lambris, plafond
  ctx.fillStyle = c("#3a423d"); ctx.fillRect(0, 0, W, FLOOR);
  for (let x = 0; x < W; x += 28) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 235, 210, 0.03 + q() * 0.03); ctx.fillRect(x, 0, 28, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x, 0, 1.2, FLOOR); }
  for (let y = 24; y < FLOOR - 70; y += 38) for (let x = 14; x < W; x += 56) { ctx.fillStyle = rgba(200, 170, 90, 0.05); ctx.beginPath(); ctx.arc(x + ((y / 38) % 2) * 28, y, 3, 0, 6.283); ctx.fill(); } // des petites fleurs de papier peint
  ctx.fillStyle = c("#2a2018"); ctx.fillRect(0, 0, W, 16); ctx.fillStyle = c("#33251a"); ctx.fillRect(0, FLOOR - 70, W, 5); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(0, FLOOR - 65, W, 65);
  // sol et tapis
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#46321f")); fg.addColorStop(1, c("#26190f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (const y of [FLOOR + 18, FLOOR + 42, FLOOR + 74]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 4, W, 6);
  ctx.fillStyle = c("#7a5a1e"); ctx.beginPath(); ctx.ellipse(340, 316, 230, 26, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#2f4a44"); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(340, 316, 212, 21, 0, 0, 6.283); ctx.stroke();
  // une applique, au mur, qui éclaire à peine
  { const ax = 262, ay = 120; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ax - 2, ay, 4, 18); ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(ax, ay - 2, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 200, 110, 0.5 * fl); ctx.beginPath(); ctx.arc(ax, ay - 9, 3.5, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 190, 90, 0.05 * fl); ctx.beginPath(); ctx.arc(ax, ay - 8, 70, 0, 6.283); ctx.fill(); }

  // le lit à baldaquin
  { const bx = 24, bw = 212;
    ctx.fillStyle = c("#2a1c14"); ctx.fillRect(bx + 14, 118, bw - 28, 100); ctx.fillStyle = c("#3d2a1c"); ctx.beginPath(); ctx.moveTo(bx + 14, 118); ctx.quadraticCurveTo(bx + bw / 2, 96, bx + bw - 14, 118); ctx.fill(); // la tête de lit
    ctx.fillStyle = c("#241a14"); ctx.fillRect(bx, 62, 9, 190); ctx.fillRect(bx + bw - 9, 62, 9, 190); ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(bx + 4.5, 60, 6, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(bx + bw - 4.5, 60, 6, 0, 6.283); ctx.fill(); // les colonnes et leurs boules de laiton
    ctx.fillStyle = c("#2f2118"); ctx.fillRect(bx, 62, bw, 8); // le ciel de lit
    const cur = c("#5b2b3a"), curD = c("#44202c"); ctx.fillStyle = cur; for (let i = 0; i < 9; i++) { const sx = bx + 2 + i * (bw - 4) / 9; ctx.beginPath(); ctx.moveTo(sx, 70); ctx.lineTo(sx + (bw - 4) / 9, 70); ctx.quadraticCurveTo(sx + (bw - 4) / 18, 92, sx, 70); ctx.fill(); } // la frange festonnée
    ctx.fillRect(bx + 2, 70, bw - 4, 8);
    for (const side of [0, 1]) { // les rideaux, attachés par un cordon
      const x0 = side ? bx + bw - 10 : bx + 9, dir = side ? -1 : 1;
      ctx.fillStyle = cur; ctx.beginPath(); ctx.moveTo(x0, 78); ctx.lineTo(x0 + dir * 34, 78); ctx.quadraticCurveTo(x0 + dir * 12, 138, x0 + dir * 26, 252); ctx.lineTo(x0, 252); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = curD; ctx.lineWidth = 1.4; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + dir * k * 8, 80); ctx.quadraticCurveTo(x0 + dir * (k * 4 + 2), 150, x0 + dir * (k * 6 + 1), 250); ctx.stroke(); }
      ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, 160); ctx.quadraticCurveTo(x0 + dir * 14, 168, x0 + dir * 26, 156); ctx.stroke();
    }
    ctx.fillStyle = c("#3d2a1c"); ctx.fillRect(bx + 4, 222, bw - 8, 26); ctx.fillStyle = c("#2f2118"); ctx.fillRect(bx + 4, 222, bw - 8, 4); // le pied du lit
    ctx.fillStyle = c("#d9d2c0"); ctx.fillRect(bx + 16, 200, bw - 32, 24); // le matelas
    const pat = ["#8a3a3a", "#c9a24e", "#2f4a44", "#5b2b3a"]; for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = c(pat[(i + j * 2) % 4]); ctx.fillRect(bx + 34 + i * 20, 206 + j * 8, 19, 8); } // l'édredon en patchwork
    ctx.fillStyle = c("#ece6d4"); ctx.beginPath(); ctx.ellipse(bx + 40, 196, 22, 8, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(0, 0, 0, 0.12); ctx.beginPath(); ctx.ellipse(bx + 43, 197, 10, 4, 0, 0, 6.283); ctx.fill(); // l'oreiller, et le creux d'une tête
    item(bx, 60, bw, 192, "back.bed.tip", "back.bed.flash");
    const cat = sc.additions.find((a) => a.type === "cat");
    if (cat && r.catSpot === 2) curledCat(r, ctx, c, cat, bx + 128, 205, t, "atelier.cat.tip", TRr); // le chat dort sur l'édredon
  }
  { const cat = sc.additions.find((a) => a.type === "cat"); if (cat && r.catSpot === 1) curledCat(r, ctx, c, cat, 300, 304, t, "atelier.cat.tip", TRr); } // ou sur le tapis

  // l'armoire : on peut l'ouvrir ; elle ne contient que des manches
  { const wx = 292, wy = 72, ww = 110, wh = FLOOR - wy, op = r.wardAt ? clamp((now - r.wardAt) / 550) : 0, k = r.wardOpen ? op : 1 - op;
    ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(wx + 5, wy + 4, ww, wh);
    ctx.fillStyle = c("#3d2a1c"); ctx.fillRect(wx, wy, ww, wh); ctx.fillStyle = c("#4b3626"); ctx.fillRect(wx - 6, wy - 8, ww + 12, 12); ctx.fillRect(wx - 3, wy + wh - 8, ww + 6, 8);
    ctx.fillStyle = "#0b0807"; ctx.fillRect(wx + 8, wy + 12, ww - 16, wh - 26); // l'intérieur
    if (k > 0.05) { // des manteaux vides, aux manches en trop ; deux reflets, parfois
      for (let i = 0; i < 4; i++) { const cx = wx + 22 + i * 21; ctx.fillStyle = c(["#2b2430", "#3a2a2a", "#26302b", "#322a22"][i]); ctx.fillRect(cx - 7, wy + 40, 14, 90); for (let s = 0; s < 2 + (i % 2); s++) { ctx.beginPath(); ctx.moveTo(cx + (s % 2 ? 6 : -6), wy + 48 + s * 6); ctx.quadraticCurveTo(cx + (s % 2 ? 16 : -16), wy + 90 + s * 8, cx + (s % 2 ? 10 : -10), wy + 128 + s * 6); ctx.lineWidth = 5; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); } }
      ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(wx + 12, wy + 36); ctx.lineTo(wx + ww - 12, wy + 36); ctx.stroke();
      if (Math.sin(t * 0.9) > 0.92) { ctx.fillStyle = rgba(255, 230, 150, 0.85); ctx.fillRect(wx + 52, wy + 150, 2.5, 2.5); ctx.fillRect(wx + 60, wy + 150, 2.5, 2.5); }
      ctx.fillStyle = rgba(0, 0, 0, 0.55 * (1 - k)); ctx.fillRect(wx + 8, wy + 12, ww - 16, wh - 26);
    }
    for (const side of [0, 1]) { // les portes : un soleil et une lune, sur charnières
      const w1 = (ww / 2 - 6) * (1 - 0.8 * k), x1 = side ? wx + ww - 8 - w1 : wx + 8;
      ctx.fillStyle = c("#4a3322"); ctx.fillRect(x1, wy + 12, w1, wh - 26); ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; ctx.strokeRect(x1 + 3, wy + 18, w1 - 6, wh - 38);
      if (w1 > 18) { const cx = x1 + w1 / 2, cy = wy + 78; ctx.strokeStyle = c("#c9a24e"); ctx.fillStyle = c("#c9a24e"); ctx.lineWidth = 1.4;
        if (!side) { ctx.beginPath(); ctx.arc(cx, cy, 8 * w1 / 45, 0, 6.283); ctx.fill(); for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a * 0.785) * 12 * w1 / 45, cy + Math.sin(a * 0.785) * 12 * w1 / 45); ctx.lineTo(cx + Math.cos(a * 0.785) * 18 * w1 / 45, cy + Math.sin(a * 0.785) * 18 * w1 / 45); ctx.stroke(); } }
        else { ctx.beginPath(); ctx.arc(cx, cy, 14 * w1 / 45, 0.5, 5.8); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 5 * w1 / 45, cy, 11 * w1 / 45, 0.6, 5.7, true); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(side ? x1 + 7 : x1 + w1 - 7, wy + 130, 2.4, 0, 6.283); ctx.fill(); }
    }
    item(wx - 6, wy - 8, ww + 12, wh + 8, "back.ward.tip", null, { ward: true });
  }

  // l'horloge sans aiguilles
  { const hx = 428, hy = 100, hw = 38;
    ctx.fillStyle = c("#33241a"); ctx.fillRect(hx, hy, hw, FLOOR - hy); ctx.fillStyle = c("#42301f"); ctx.fillRect(hx - 4, hy - 6, hw + 8, 8); ctx.fillRect(hx - 3, FLOOR - 8, hw + 6, 8);
    ctx.fillStyle = c("#e6d9b8"); ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 26, 15, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 1.2; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; ctx.beginPath(); ctx.moveTo(hx + hw / 2 + Math.cos(a) * 12, hy + 26 + Math.sin(a) * 12); ctx.lineTo(hx + hw / 2 + Math.cos(a) * 14, hy + 26 + Math.sin(a) * 14); ctx.stroke(); }
    ctx.fillStyle = c("#2a1c14"); ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 26, 1.6, 0, 6.283); ctx.fill(); // pas d'aiguilles
    ctx.fillStyle = "#0b0807"; ctx.fillRect(hx + 5, hy + 54, hw - 10, 100); const pa = Math.sin(t * 2.4) * 0.1, px = hx + hw / 2, py = hy + 56; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(pa) * 66, py + Math.cos(pa) * 66); ctx.stroke(); ctx.fillStyle = c("#d8b45e"); ctx.beginPath(); ctx.arc(px + Math.sin(pa) * 66, py + Math.cos(pa) * 66, 5, 0, 6.283); ctx.fill();
    item(hx - 4, hy - 6, hw + 8, FLOOR - hy + 6, "back.clock.tip", "back.clock.flash");
  }

  // le miroir rond, en retard sur la pièce
  { const mx = 520, my = 148, rx = 32, ry = 46;
    ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.ellipse(mx, my, rx + 5, ry + 5, 0, 0, 6.283); ctx.fill(); const mg = ctx.createLinearGradient(mx - rx, my - ry, mx + rx, my + ry); mg.addColorStop(0, c("#3a5a5e")); mg.addColorStop(1, c("#1c2c30")); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(mx, my, rx, ry, 0, 0, 6.283); ctx.clip(); const lag = Math.sin(t * 0.8 - 0.7) * 9; ctx.fillStyle = rgba(10, 14, 16, 0.55); ctx.fillRect(mx - 16 + lag, my - 8, 32, 70); ctx.beginPath(); ctx.arc(mx + lag, my - 16, 11, 0, 6.283); ctx.fill(); // une silhouette qui suit avec retard
    ctx.fillStyle = rgba(255, 255, 255, 0.07); ctx.beginPath(); ctx.moveTo(mx - rx, my - 10); ctx.lineTo(mx - 6, my - ry); ctx.lineTo(mx + 8, my - ry); ctx.lineTo(mx - rx, my + 8); ctx.fill(); ctx.restore();
    item(mx - rx - 6, my - ry - 6, 2 * rx + 12, 2 * ry + 12, "back.mirror.tip", "back.mirror.flash");
  }

  // la cage ouverte, suspendue ; quelque chose y chante
  { const cx = 596, cy = 96; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, 16); ctx.lineTo(cx, cy - 26); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 20, Math.PI, 0); ctx.lineTo(cx + 20, cy + 22); ctx.lineTo(cx - 20, cy + 22); ctx.closePath(); ctx.stroke(); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 8, cy - 20 + Math.abs(i) * 2); ctx.lineTo(cx + i * 8, cy + 22); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx + 20, cy + 2); ctx.lineTo(cx + 34, cy - 6); ctx.stroke(); ctx.fillStyle = rgba(180, 235, 220, 0.4 + 0.3 * Math.sin(t * 1.7)); ctx.beginPath(); ctx.arc(cx, cy + 6, 3, 0, 6.283); ctx.fill(); // la porte ouverte, une lueur
    item(cx - 24, cy - 28, 52, 56, "back.cage.tip", "back.cage.flash");
  }
  // un globe sans terres
  { const gx = 566, gy = 214; ctx.fillStyle = c("#2a1c14"); ctx.fillRect(gx - 2, gy + 14, 4, 22); ctx.fillRect(gx - 12, gy + 34, 24, 4); const gg = ctx.createRadialGradient(gx - 6, gy - 6, 3, gx, gy, 20); gg.addColorStop(0, c("#3f6a78")); gg.addColorStop(1, c("#16303a")); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 20, 0, 6.283); ctx.fill();
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(gx, gy, 20, 6, -0.3, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.ellipse(gx, gy, 6, 20, -0.3, 0, 6.283); ctx.stroke();
    item(gx - 22, gy - 22, 44, 62, "back.globe.tip", "back.globe.flash");
  }
  // un porte-chapeau, une plume humide
  { const hx = 258, hy = 250; ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, 142); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx - 14, hy); ctx.lineTo(hx + 14, hy); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx, 150); ctx.quadraticCurveTo(hx + s * 10, 150, hx + s * 14, 142); ctx.stroke(); }
    ctx.fillStyle = c("#26302b"); ctx.beginPath(); ctx.ellipse(hx - 2, 140, 16, 5, -0.1, 0, 6.283); ctx.fill(); ctx.fillRect(hx - 9, 128, 15, 12); ctx.strokeStyle = c("#d8d2c0"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 5, 132); ctx.quadraticCurveTo(hx + 14, 118, hx + 22, 112); ctx.stroke(); ctx.fillStyle = rgba(30, 40, 90, 0.8); ctx.beginPath(); ctx.arc(hx + 22, 112, 1.6, 0, 6.283); ctx.fill();
    item(hx - 18, 106, 38, 148, "back.hat.tip", "back.hat.flash");
  }
  // une pile de livres sans titre, penchée
  { const px = 488, py = 250; for (const [i, col, w, dx] of [[0, "#5b2b2b", 40, 0], [1, "#27555a", 34, 4], [2, "#4c5a2c", 30, -3]]) { ctx.save(); ctx.translate(px + dx, py - 8 - i * 9); ctx.rotate((i - 1) * 0.04); ctx.fillStyle = c(col); ctx.fillRect(-w / 2, -4, w, 9); ctx.fillStyle = rgba(236, 222, 180, 0.7); ctx.fillRect(-w / 2 + 2, 3.5, w - 4, 1.8); ctx.restore(); }
    item(px - 22, py - 38, 46, 40, "back.books.tip", "back.books.flash");
  }
  ctx.fillStyle = rgba(255, 160, 70, 0.05 * fl); ctx.fillRect(0, 0, W, H); // une chaleur diffuse, venue du côté du feu
  turnButton(r, ctx, TRr("atelier.turn.tip"), "atelier");
}

module.exports = { drawBackroom, turnButton };
