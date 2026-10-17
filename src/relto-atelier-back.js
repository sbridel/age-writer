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

function drawBackroom(r, ctx, sc, sky, t) {
  const castle = !!(r.castleOn && r.castleOn()), CS = require("./relto-castle"); // le Château : tenture pourpre à lys d'or, lambris de noyer, parquet, applique de fer
  const glass = !!(r.glassOn && r.glassOn()), VR = require("./relto-glass"); // la Verrière : papier peint à lys, applique de verre au plomb, tapis ouvragé, cimaise de cuivre
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), q = rng(0xbed1), fl = flick(t), now = Date.now();
  const item = (x, y, w, h, tip, flash, extra) => r.hot.push({ x, y, w, h, tip: TRr(tip), flash: flash ? TRr(flash) : undefined, ...(extra || {}) });
  // murs tendus de papier sombre, lambris, plafond
  if (castle) { // une tenture pourpre, ses lys d'or en semis, sur un lambris de noyer
    const tg = ctx.createLinearGradient(0, 0, 0, FLOOR - 70); tg.addColorStop(0, c("#3a1226")); tg.addColorStop(1, c(CS.PURPLE)); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, FLOOR - 70);
    for (let x = 0; x < W; x += 22) { ctx.fillStyle = rgba(0, 0, 0, 0.12); ctx.fillRect(x, 0, 6, FLOOR - 70); } // les plis
    ctx.fillStyle = rgba(201, 162, 78, 0.32); for (let y = 34; y < FLOOR - 82; y += 40) for (let x = 20; x < W; x += 48) CS.lys(ctx, x + ((y / 40) % 2) * 24, y, 3.4, false);
    CS.wainscot(ctx, c, 0, FLOOR - 70, W, 70, 64);
  } else {
  ctx.fillStyle = c("#3a423d"); ctx.fillRect(0, 0, W, FLOOR);
  for (let x = 0; x < W; x += 28) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 235, 210, 0.03 + q() * 0.03); ctx.fillRect(x, 0, 28, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x, 0, 1.2, FLOOR); }
  if (glass) { ctx.strokeStyle = rgba(200, 170, 90, 0.13); ctx.lineWidth = 0.9; ctx.lineCap = "round"; for (let y = 30; y < FLOOR - 76; y += 46) for (let x = 14; x < W; x += 56) VR.motif(ctx, ["lily", "iris", "tulip"][((x / 56) + (y / 46)) % 3 | 0], x + ((y / 46) % 2) * 28, y - 16, y + 18, 0.45); } // un papier peint à fleurs au trait
  else for (let y = 24; y < FLOOR - 70; y += 38) for (let x = 14; x < W; x += 56) { ctx.fillStyle = rgba(200, 170, 90, 0.05); ctx.beginPath(); ctx.arc(x + ((y / 38) % 2) * 28, y, 3, 0, 6.283); ctx.fill(); } // des petites fleurs de papier peint
  ctx.fillStyle = c("#2a2018"); ctx.fillRect(0, 0, W, 16); ctx.fillStyle = c(glass ? "#b5652a" : "#33251a"); ctx.fillRect(0, FLOOR - 70, W, 5); ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(0, FLOOR - 65, W, 65);
  }
  if (castle) { ctx.fillStyle = c(CS.WALNUT_LO); ctx.fillRect(0, 0, W, 16); ctx.fillStyle = c(CS.GOLD); ctx.fillRect(0, 15, W, 0.9); }
  // sol et tapis
  if (castle) { CS.cabinFloor(ctx, c, FLOOR, H, W, false, amb); ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 4, W, 6); CS.rug(ctx, c, 340, 316, 230, 26, CS.VELVET_LO); } else {
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#46321f")); fg.addColorStop(1, c("#26190f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (const y of [FLOOR + 18, FLOOR + 42, FLOOR + 74]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 4, W, 6);
  if (glass) VR.ornateRug(ctx, c, 340, 316, 230, 26, { field: "#7a5a1e", border: "#2f4a44", vine: "#8ab08a", gold: "#d8b45e" });
  else { ctx.fillStyle = c("#7a5a1e"); ctx.beginPath(); ctx.ellipse(340, 316, 230, 26, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#2f4a44"); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(340, 316, 212, 21, 0, 0, 6.283); ctx.stroke(); }
  }
  // une applique, au mur, qui éclaire à peine
  { const ax = 262, ay = 120;
    if (castle) CS.sconce(ctx, c, ax, ay - 2, fl, sky.night || 0, 0); // une applique de fer forgé et sa chandelle
    else if (glass) { ctx.strokeStyle = c("#6b4a22"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay + 18); ctx.bezierCurveTo(ax - 8, ay + 8, ax + 8, ay + 2, ax, ay - 4); ctx.stroke(); VR.tiffanyLamp(ctx, c, ax, ay - 16, ay - 5, 7, ay - 5, 0.5, true, fl); } // une applique : une tulipe de verre au plomb sur une tige de bronze
    else { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ax - 2, ay, 4, 18); ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(ax, ay - 2, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 200, 110, 0.5 * fl); ctx.beginPath(); ctx.arc(ax, ay - 9, 3.5, 0, 6.283); ctx.fill(); } ctx.fillStyle = rgba(255, 190, 90, 0.05 * fl); ctx.beginPath(); ctx.arc(ax, ay - 8, 70, 0, 6.283); ctx.fill(); }

  // le lit à baldaquin
  { const bx = 24, bw = 212;
    if (castle) { // le Château : une tête de lit de noyer en arc brisé, deux lancettes aveugles et un trilobe, filet d'or
      ctx.fillStyle = c(CS.WALNUT_LO); CS.pointed(ctx, bx + 14, bx + bw - 14, 92, 132, 218); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 1; CS.pointed(ctx, bx + 20, bx + bw - 20, 100, 136, 214); ctx.stroke();
      for (const m of [bx + bw / 2 - 34, bx + bw / 2 + 34]) { ctx.fillStyle = c("#1e140e"); CS.pointed(ctx, m - 18, m + 18, 132, 150, 196); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(CS.WALNUT_HI); ctx.lineWidth = 1; CS.pointed(ctx, m - 18, m + 18, 132, 150, 196); ctx.stroke(); }
      ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 1.2; for (const [dx, dy] of [[0, -5], [-5, 3], [5, 3]]) { ctx.beginPath(); ctx.arc(bx + bw / 2 + dx, 120 + dy, 5, 0, 6.283); ctx.stroke(); } // le trilobe
    } else if (glass) { // la Verrière : une tête de lit en coup de fouet, et dans son cœur un vitrail ovale à iris
      ctx.fillStyle = c("#3a2416"); ctx.beginPath(); ctx.moveTo(bx + 14, 218); ctx.lineTo(bx + 14, 128); ctx.bezierCurveTo(bx + 40, 96, bx + 80, 124, bx + bw / 2, 100); ctx.bezierCurveTo(bx + bw - 80, 124, bx + bw - 40, 96, bx + bw - 14, 128); ctx.lineTo(bx + bw - 14, 218); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx + 18, 132); ctx.bezierCurveTo(bx + 42, 104, bx + 80, 130, bx + bw / 2, 106); ctx.bezierCurveTo(bx + bw - 80, 130, bx + bw - 42, 104, bx + bw - 18, 132); ctx.stroke();
      const G = VR.glassTones(c, sky, 0.3); ctx.fillStyle = G.teal; ctx.beginPath(); ctx.ellipse(bx + bw / 2, 156, 30, 28, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = rgba(200, 170, 90, 0.75); ctx.lineWidth = 1.1; ctx.lineCap = "round"; VR.motif(ctx, "iris", bx + bw / 2, 134, 180, 0.6); ctx.lineCap = "butt";
      ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(bx + bw / 2, 156, 30, 28, 0, 0, 6.283); ctx.stroke();
    } else {
    ctx.fillStyle = c("#2a1c14"); ctx.fillRect(bx + 14, 118, bw - 28, 100); ctx.fillStyle = c("#3d2a1c"); ctx.beginPath(); ctx.moveTo(bx + 14, 118); ctx.quadraticCurveTo(bx + bw / 2, 96, bx + bw - 14, 118); ctx.fill(); // la tête de lit
    }
    if (castle) { // le Château : des colonnes de noyer à bagues d'or, et des pinacles pour boules
      for (const x of [bx, bx + bw - 9]) { ctx.fillStyle = c(CS.WALNUT_LO); ctx.fillRect(x, 62, 9, 190); ctx.fillStyle = c(CS.WALNUT_HI); ctx.fillRect(x + 1, 62, 1.6, 190); ctx.fillStyle = c(CS.GOLD); for (const y of [100, 160, 220]) ctx.fillRect(x - 1, y, 11, 2);
        ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.moveTo(x - 1, 62); ctx.lineTo(x + 4.5, 40); ctx.lineTo(x + 10, 62); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.arc(x + 4.5, 38, 2, 0, 6.283); ctx.fill(); }
    } else if (glass) { // la Verrière : des colonnes de bronze fines, qui finissent en tulipe
      for (const x of [bx + 2, bx + bw - 7]) { ctx.fillStyle = c("#6b4a22"); ctx.fillRect(x, 62, 5, 190); ctx.fillStyle = c(VR.COPPER_HI); ctx.fillRect(x + 1, 62, 1, 190);
        ctx.fillStyle = c("#8ab08a"); ctx.beginPath(); ctx.moveTo(x + 2.5, 62); ctx.quadraticCurveTo(x - 6, 54, x - 3, 44); ctx.quadraticCurveTo(x + 2.5, 50, x + 2.5, 62); ctx.quadraticCurveTo(x + 2.5, 50, x + 8, 44); ctx.quadraticCurveTo(x + 11, 54, x + 2.5, 62); ctx.fill(); ctx.fillStyle = c("#d8b45e"); ctx.beginPath(); ctx.ellipse(x + 2.5, 46, 3, 5, 0, 0, 6.283); ctx.fill(); }
    } else {
    ctx.fillStyle = c("#241a14"); ctx.fillRect(bx, 62, 9, 190); ctx.fillRect(bx + bw - 9, 62, 9, 190); ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(bx + 4.5, 60, 6, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(bx + bw - 4.5, 60, 6, 0, 6.283); ctx.fill(); // les colonnes et leurs boules de laiton
    }
    ctx.fillStyle = c("#2f2118"); ctx.fillRect(bx, 62, bw, 8); // le ciel de lit
    if (castle) { ctx.fillStyle = c(CS.WALNUT); ctx.fillRect(bx - 3, 56, bw + 6, 7); ctx.fillStyle = c(CS.GOLD); ctx.fillRect(bx - 3, 62, bw + 6, 1); for (let x = bx; x < bx + bw; x += 12) { ctx.fillStyle = c(CS.WALNUT_LO); ctx.beginPath(); ctx.moveTo(x, 56); ctx.lineTo(x + 6, 48); ctx.lineTo(x + 12, 56); ctx.closePath(); ctx.fill(); } } // le Château : une corniche à gâbles
    if (glass) { ctx.fillStyle = c("#3a2416"); ctx.beginPath(); ctx.moveTo(bx - 2, 62); ctx.quadraticCurveTo(bx + bw / 2, 34, bx + bw + 2, 62); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx, 60); ctx.quadraticCurveTo(bx + bw / 2, 38, bx + bw, 60); ctx.stroke(); } // la Verrière : un ciel de lit cintré, filet de cuivre
    const cur = c(castle ? "#1f3a30" : "#5b2b3a"), curD = c(castle ? "#12241d" : "#44202c"); /* le Château : un velours vert bouteille, qui se détache de la tenture pourpre */ ctx.fillStyle = cur; for (let i = 0; i < 9; i++) { const sx = bx + 2 + i * (bw - 4) / 9; ctx.beginPath(); ctx.moveTo(sx, 70); ctx.lineTo(sx + (bw - 4) / 9, 70); ctx.quadraticCurveTo(sx + (bw - 4) / 18, 92, sx, 70); ctx.fill(); } // la frange festonnée
    ctx.fillRect(bx + 2, 70, bw - 4, 8);
    if (castle) { ctx.fillStyle = c(CS.GOLD); ctx.fillRect(bx + 2, 77, bw - 4, 1.2); for (let i = 0; i < 9; i++) { const sx = bx + 2 + (i + 0.5) * (bw - 4) / 9; ctx.beginPath(); ctx.arc(sx, 86, 1.6, 0, 6.283); ctx.fill(); } } // la frange d'or et ses glands
    for (const side of [0, 1]) { // les rideaux, attachés par un cordon
      const x0 = side ? bx + bw - 10 : bx + 9, dir = side ? -1 : 1;
      ctx.fillStyle = cur; ctx.beginPath(); ctx.moveTo(x0, 78); ctx.lineTo(x0 + dir * 34, 78); ctx.quadraticCurveTo(x0 + dir * 12, 138, x0 + dir * 26, 252); ctx.lineTo(x0, 252); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = curD; ctx.lineWidth = 1.4; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + dir * k * 8, 80); ctx.quadraticCurveTo(x0 + dir * (k * 4 + 2), 150, x0 + dir * (k * 6 + 1), 250); ctx.stroke(); }
      ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0, 160); ctx.quadraticCurveTo(x0 + dir * 14, 168, x0 + dir * 26, 156); ctx.stroke();
    }
    ctx.fillStyle = c("#3d2a1c"); ctx.fillRect(bx + 4, 222, bw - 8, 26); ctx.fillStyle = c("#2f2118"); ctx.fillRect(bx + 4, 222, bw - 8, 4); // le pied du lit
    ctx.fillStyle = c("#d9d2c0"); ctx.fillRect(bx + 16, 200, bw - 32, 24); // le matelas
    if (castle) { // le Château : un couvre-lit ivoire, brodé de lys, bordé d'or
      ctx.fillStyle = c("#e6dcc4"); ctx.fillRect(bx + 32, 204, bw - 50, 18); ctx.fillStyle = c("#d2c6a8"); ctx.fillRect(bx + 32, 218, bw - 50, 4);
      ctx.fillStyle = c(CS.GOLD); ctx.fillRect(bx + 32, 204, bw - 50, 1.4); ctx.fillRect(bx + 32, 216.5, bw - 50, 1.2); ctx.fillRect(bx + 32, 204, 1.4, 18);
      ctx.fillStyle = rgba(170, 130, 60, 0.55); for (let i = 0; i < 6; i++) CS.lys(ctx, bx + 46 + i * 24, 211, 2.2, false);
    } else {
    const pat = ["#8a3a3a", "#c9a24e", "#2f4a44", "#5b2b3a"]; for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = c(pat[(i + j * 2) % 4]); ctx.fillRect(bx + 34 + i * 20, 206 + j * 8, 19, 8); } // l'édredon en patchwork
    }
    ctx.fillStyle = c("#ece6d4"); ctx.beginPath(); ctx.ellipse(bx + 40, 196, 22, 8, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(0, 0, 0, 0.12); ctx.beginPath(); ctx.ellipse(bx + 43, 197, 10, 4, 0, 0, 6.283); ctx.fill(); // l'oreiller, et le creux d'une tête
    item(bx, 60, bw, 192, "back.bed.tip", "back.bed.flash");
    const cat = sc.additions.find((a) => a.type === "cat");
    if (cat && r.catSpotFor() === 2) r.drawSleepingCat(ctx, cat, { x: bx + 128, y: 206, S: 1.9, shade: c, tip: TRr("atelier.cat.bed") }, t); // le chat dort sur l'édredon
  }
  { const cat = sc.additions.find((a) => a.type === "cat"); if (cat && r.catSpotFor() === 1) r.drawSleepingCat(ctx, cat, { x: 300, y: 306, S: 2.3, shade: c, tip: TRr("atelier.cat.rug") }, t); } // ou sur le tapis

  // l'armoire : on peut l'ouvrir ; elle ne contient que des manches
  { const wx = 292, wy = 72, ww = 110, wh = FLOOR - wy, op = r.wardAt ? clamp((now - r.wardAt) / 550) : 1, k = r.wardOpen ? op : 1 - op; /* jamais touchée : fermée (op = 1, k = 0) ; avant, op = 0 la dessinait ouverte alors qu'elle était fermée */
    ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(wx + 5, wy + 4, ww, wh);
    ctx.fillStyle = c(castle ? CS.WALNUT_LO : glass ? "#2e1e14" : "#3d2a1c"); ctx.fillRect(wx, wy, ww, wh); ctx.fillStyle = c(castle ? CS.WALNUT : glass ? "#3a2416" : "#4b3626"); ctx.fillRect(wx - 6, wy - 8, ww + 12, 12); ctx.fillRect(wx - 3, wy + wh - 8, ww + 6, 8);
    if (castle) { // le Château : un couronnement en gâble à crochets, deux pinacles, un fleuron d'or
      ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.moveTo(wx - 4, wy - 8); ctx.lineTo(wx + ww / 2, wy - 36); ctx.lineTo(wx + ww + 4, wy - 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(wx + 8, wy - 10); ctx.lineTo(wx + ww / 2, wy - 30); ctx.lineTo(wx + ww - 8, wy - 10); ctx.stroke();
      ctx.fillStyle = c(CS.WALNUT_LO); for (let k = 1; k < 5; k++) { const u = k / 5; for (const s2 of [-1, 1]) { const x = wx + ww / 2 + s2 * (ww / 2 + 4) * (1 - u), y = wy - 8 - 28 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s2 * 3, y - 2); ctx.lineTo(x + s2 * 1, y + 2); ctx.closePath(); ctx.fill(); } }
      ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy - 46); ctx.lineTo(wx + ww / 2 + 3, wy - 36); ctx.lineTo(wx + ww / 2 - 3, wy - 36); ctx.closePath(); ctx.fill();
      for (const x of [wx - 4, wx + ww + 4]) { ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.moveTo(x - 3, wy - 8); ctx.lineTo(x, wy - 24); ctx.lineTo(x + 3, wy - 8); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.arc(x, wy - 25, 1.4, 0, 6.283); ctx.fill(); }
    } else if (glass) { // la Verrière : une corniche cintrée en coup de fouet, filet de cuivre, un bouton de fleur au sommet
      ctx.fillStyle = c("#3a2416"); ctx.beginPath(); ctx.moveTo(wx - 6, wy - 8); ctx.bezierCurveTo(wx + 20, wy - 10, wx + 30, wy - 30, wx + ww / 2, wy - 30); ctx.bezierCurveTo(wx + ww - 30, wy - 30, wx + ww - 20, wy - 10, wx + ww + 6, wy - 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(wx - 2, wy - 9); ctx.bezierCurveTo(wx + 22, wy - 11, wx + 32, wy - 26, wx + ww / 2, wy - 26); ctx.bezierCurveTo(wx + ww - 32, wy - 26, wx + ww - 22, wy - 11, wx + ww + 2, wy - 9); ctx.stroke();
      ctx.fillStyle = c("#d8b45e"); ctx.beginPath(); ctx.ellipse(wx + ww / 2, wy - 34, 3, 5, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#8ab08a"); for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.ellipse(wx + ww / 2 + s2 * 5, wy - 30, 4, 1.8, s2 * 0.5, 0, 6.283); ctx.fill(); }
    }
    ctx.fillStyle = "#0b0807"; ctx.fillRect(wx + 8, wy + 12, ww - 16, wh - 26); // l'intérieur
    if (k > 0.05) { // des manteaux vides, aux manches en trop ; deux reflets, parfois
      for (let i = 0; i < 4; i++) { const cx = wx + 22 + i * 21; ctx.fillStyle = c(["#2b2430", "#3a2a2a", "#26302b", "#322a22"][i]); ctx.fillRect(cx - 7, wy + 40, 14, 90); for (let s = 0; s < 2 + (i % 2); s++) { ctx.beginPath(); ctx.moveTo(cx + (s % 2 ? 6 : -6), wy + 48 + s * 6); ctx.quadraticCurveTo(cx + (s % 2 ? 16 : -16), wy + 90 + s * 8, cx + (s % 2 ? 10 : -10), wy + 128 + s * 6); ctx.lineWidth = 5; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); } }
      ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(wx + 12, wy + 36); ctx.lineTo(wx + ww - 12, wy + 36); ctx.stroke();
      if (Math.sin(t * 0.9) > 0.92) { ctx.fillStyle = rgba(255, 230, 150, 0.85); ctx.fillRect(wx + 52, wy + 150, 2.5, 2.5); ctx.fillRect(wx + 60, wy + 150, 2.5, 2.5); }
      ctx.fillStyle = rgba(0, 0, 0, 0.55 * (1 - k)); ctx.fillRect(wx + 8, wy + 12, ww - 16, wh - 26);
    }
    for (const side of [0, 1]) { // les portes : un soleil et une lune, sur charnières
      const w1 = (ww / 2 - 6) * (1 - 0.8 * k), x1 = side ? wx + ww - 8 - w1 : wx + 8;
      ctx.fillStyle = c(castle ? CS.WALNUT : glass ? "#3e2818" : "#4a3322"); ctx.fillRect(x1, wy + 12, w1, wh - 26); ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; ctx.strokeRect(x1 + 3, wy + 18, w1 - 6, wh - 38);
      if (castle && w1 > 14) { ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.9; CS.pointed(ctx, x1 + 5, x1 + w1 - 5, wy + 24, wy + 24 + w1 * 0.6, wy + wh - 22); ctx.stroke(); // le Château : un panneau en arc brisé, des pentures de fer
        ctx.strokeStyle = c(CS.IRON); ctx.lineWidth = 2; for (const y of [wy + 34, wy + wh - 34]) { const hx0 = side ? x1 + w1 : x1, d = side ? -1 : 1; ctx.beginPath(); ctx.moveTo(hx0, y); ctx.lineTo(hx0 + d * w1 * 0.55, y); ctx.stroke(); ctx.beginPath(); ctx.arc(hx0 + d * w1 * 0.55, y, 2, 0, 6.283); ctx.stroke(); } }
      if (glass && w1 > 14) { const G = VR.glassTones(c, sky, 0.3), gx0 = x1 + 6, gw = w1 - 12, gy0 = wy + 46, gh = 70; ctx.save(); ctx.beginPath(); ctx.moveTo(gx0, gy0 + gh); ctx.lineTo(gx0, gy0 + gw / 2); ctx.ellipse(gx0 + gw / 2, gy0 + gw / 2, gw / 2, gw / 2, 0, Math.PI, 2 * Math.PI); ctx.lineTo(gx0 + gw, gy0 + gh); ctx.closePath(); ctx.clip(); // la Verrière : un vitrail en plein cintre dans chaque porte
        const gg = ctx.createLinearGradient(0, gy0, 0, gy0 + gh); gg.addColorStop(0, G.amb); gg.addColorStop(1, G.teal2); ctx.fillStyle = gg; ctx.fillRect(gx0, gy0, gw, gh); ctx.strokeStyle = rgba(30, 20, 10, 0.6); ctx.lineWidth = 1; ctx.lineCap = "round"; VR.motif(ctx, side ? "lily" : "iris", gx0 + gw / 2, gy0 + 6, gy0 + gh, 0.4 * w1 / 45); ctx.lineCap = "butt"; ctx.restore();
        ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 + gh); ctx.lineTo(gx0, gy0 + gw / 2); ctx.ellipse(gx0 + gw / 2, gy0 + gw / 2, gw / 2, gw / 2, 0, Math.PI, 2 * Math.PI); ctx.lineTo(gx0 + gw, gy0 + gh); ctx.closePath(); ctx.stroke(); }
      if (w1 > 18) { const cx = x1 + w1 / 2, cy = wy + 78; ctx.strokeStyle = c("#c9a24e"); ctx.fillStyle = c("#c9a24e"); ctx.lineWidth = 1.4;
        if (!side) { ctx.beginPath(); ctx.arc(cx, cy, 8 * w1 / 45, 0, 6.283); ctx.fill(); for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(a * 0.785) * 12 * w1 / 45, cy + Math.sin(a * 0.785) * 12 * w1 / 45); ctx.lineTo(cx + Math.cos(a * 0.785) * 18 * w1 / 45, cy + Math.sin(a * 0.785) * 18 * w1 / 45); ctx.stroke(); } }
        else { ctx.beginPath(); ctx.arc(cx, cy, 14 * w1 / 45, 0.5, 5.8); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 5 * w1 / 45, cy, 11 * w1 / 45, 0.6, 5.7, true); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(side ? x1 + 7 : x1 + w1 - 7, wy + 130, 2.4, 0, 6.283); ctx.fill(); }
    }
    item(wx - 6, wy - 8, ww + 12, wh + 8, "back.ward.tip", null, { ward: true });
  }

  // l'horloge sans aiguilles
  { const hx = 428, hy = 100, hw = 38;
    ctx.fillStyle = c(castle ? CS.WALNUT_LO : glass ? "#2e1e14" : "#33241a"); ctx.fillRect(hx, hy, hw, FLOOR - hy); ctx.fillStyle = c(castle ? CS.WALNUT : glass ? "#3a2416" : "#42301f"); ctx.fillRect(hx - 4, hy - 6, hw + 8, 8); ctx.fillRect(hx - 3, FLOOR - 8, hw + 6, 8);
    if (castle) { // le Château : un capot en gâble, deux pinacles, un fleuron d'or
      ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.moveTo(hx - 4, hy - 6); ctx.lineTo(hx + hw / 2, hy - 28); ctx.lineTo(hx + hw + 4, hy - 6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx + 2, hy - 8); ctx.lineTo(hx + hw / 2, hy - 23); ctx.lineTo(hx + hw - 2, hy - 8); ctx.stroke();
      ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.moveTo(hx + hw / 2, hy - 36); ctx.lineTo(hx + hw / 2 + 2.4, hy - 28); ctx.lineTo(hx + hw / 2 - 2.4, hy - 28); ctx.closePath(); ctx.fill();
      for (const x of [hx - 3, hx + hw + 3]) { ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.moveTo(x - 2.4, hy - 6); ctx.lineTo(x, hy - 20); ctx.lineTo(x + 2.4, hy - 6); ctx.closePath(); ctx.fill(); }
    } else if (glass) { // la Verrière : un capot cintré, filet de cuivre, et un pied évasé
      ctx.fillStyle = c("#3a2416"); ctx.beginPath(); ctx.moveTo(hx - 5, hy - 5); ctx.quadraticCurveTo(hx + hw / 2, hy - 30, hx + hw + 5, hy - 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 2, hy - 6); ctx.quadraticCurveTo(hx + hw / 2, hy - 26, hx + hw + 2, hy - 6); ctx.stroke();
      ctx.fillStyle = c("#3a2416"); ctx.beginPath(); ctx.moveTo(hx - 8, FLOOR); ctx.quadraticCurveTo(hx, FLOOR - 4, hx + 2, FLOOR - 22); ctx.lineTo(hx + hw - 2, FLOOR - 22); ctx.quadraticCurveTo(hx + hw, FLOOR - 4, hx + hw + 8, FLOOR); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = c("#e6d9b8"); ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 26, 15, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 1.2; ctx.stroke(); if (castle || glass) { ctx.strokeStyle = c(castle ? CS.GOLD : VR.COPPER); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 26, 16.5, 0, 6.283); ctx.stroke(); ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 1.2; } /* une bague d'or ou de cuivre */
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; ctx.beginPath(); ctx.moveTo(hx + hw / 2 + Math.cos(a) * 12, hy + 26 + Math.sin(a) * 12); ctx.lineTo(hx + hw / 2 + Math.cos(a) * 14, hy + 26 + Math.sin(a) * 14); ctx.stroke(); }
    ctx.fillStyle = c("#2a1c14"); ctx.beginPath(); ctx.arc(hx + hw / 2, hy + 26, 1.6, 0, 6.283); ctx.fill(); // pas d'aiguilles
    ctx.fillStyle = "#0b0807"; if (castle) { CS.pointed(ctx, hx + 5, hx + hw - 5, hy + 46, hy + 62, hy + 154); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 1; ctx.stroke(); } else if (glass) { ctx.beginPath(); ctx.ellipse(hx + hw / 2, hy + 104, hw / 2 - 5, 50, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = c(VR.COPPER); ctx.lineWidth = 2; ctx.stroke(); } else ctx.fillRect(hx + 5, hy + 54, hw - 10, 100); /* la gaine : une lancette (Château), un ovale cerclé de cuivre (Verrière) */ const pa = Math.sin(t * 2.4) * 0.1, px = hx + hw / 2, py = hy + 56; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(pa) * 66, py + Math.cos(pa) * 66); ctx.stroke(); ctx.fillStyle = c("#d8b45e"); ctx.beginPath(); ctx.arc(px + Math.sin(pa) * 66, py + Math.cos(pa) * 66, 5, 0, 6.283); ctx.fill();
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
  // un porte-chapeau, une plume humide (le Château : une cape y pend, et une épée au fourreau est appuyée au mur à côté — à qui sait)
  { const hx = 258, hy = 250; ctx.strokeStyle = c(castle ? CS.IRON : "#2a1c14"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, 142); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx - 14, hy); ctx.lineTo(hx + 14, hy); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx, 150); ctx.quadraticCurveTo(hx + s * 10, 150, hx + s * 14, 142); ctx.stroke(); }
    if (castle) {
      const sx = 244, sw0 = Math.sin(t * 0.5) * 0.6; // l'épée : le fourreau noir à bouterolle d'or, la garde en croix, le pommeau
      ctx.save(); ctx.translate(sx, FLOOR); ctx.rotate(-0.1); ctx.fillStyle = c("#15121a"); ctx.fillRect(-2.6, -78, 5.2, 78); ctx.fillStyle = c(CS.GOLD); ctx.fillRect(-2.6, -8, 5.2, 4); ctx.fillRect(-2.2, -52, 4.4, 1.4); ctx.fillRect(-9, -82, 18, 3); ctx.fillRect(-1.6, -96, 3.2, 14); ctx.beginPath(); ctx.arc(0, -98, 3, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#8a1a2a"); ctx.beginPath(); ctx.arc(0, -98, 1.3, 0, 6.283); ctx.fill(); ctx.restore();
      item(sx - 10, FLOOR - 104, 20, 106, "back.sword.tip", "back.sword.flash", { sfx: "sword", extra: true });
      { const B = 246, sw = sw0 * 3; // la cape, pendue par son col au crochet du haut : un col montant doublé de rouge, les épaules qui retombent sur les bras du porte-chapeau, des plis qui s'évasent, un ourlet festonné ; devant, l'ouverture laisse voir la doublure rouge ; une chaînette d'or ferme le col
        ctx.fillStyle = c("#0e0b10"); ctx.beginPath(); ctx.moveTo(hx - 7, 151); ctx.lineTo(hx - 15, 126); ctx.quadraticCurveTo(hx, 132, hx + 15, 126); ctx.lineTo(hx + 7, 151); ctx.closePath(); ctx.fill(); /* le col montant */
        ctx.fillStyle = c("#6a1020"); ctx.beginPath(); ctx.moveTo(hx - 5.5, 149); ctx.lineTo(hx - 12, 129.5); ctx.quadraticCurveTo(hx, 134.5, hx + 12, 129.5); ctx.lineTo(hx + 5.5, 149); ctx.closePath(); ctx.fill(); /* sa doublure */
        const body = () => { ctx.beginPath(); ctx.moveTo(hx - 6, 147); ctx.quadraticCurveTo(hx - 15, 147, hx - 18, 157); ctx.bezierCurveTo(hx - 21, 185, hx - 25 + sw * 0.6, 215, hx - 26 + sw, B - 2);
          const xs = [-26, -15.6, -5.2, 5.2, 15.6, 26]; for (let i = 1; i < xs.length; i++) ctx.quadraticCurveTo(hx + (xs[i - 1] + xs[i]) / 2 + sw, B + 4, hx + xs[i] + sw, B - (i % 2 ? 0 : 2));
          ctx.bezierCurveTo(hx + 25 + sw * 0.6, 215, hx + 21, 185, hx + 18, 157); ctx.quadraticCurveTo(hx + 15, 147, hx + 6, 147); ctx.closePath(); };
        { const g = ctx.createLinearGradient(hx - 26, 0, hx + 26, 0); [["#08060a", 0], ["#251a27", 0.18], ["#0d0a0f", 0.33], ["#2b1f2d", 0.5], ["#0d0a0f", 0.66], ["#231925", 0.82], ["#070509", 1]].forEach(([h, k]) => g.addColorStop(k, c(h))); ctx.fillStyle = g; } body(); ctx.fill(); /* le drap noir, ses plis en clair-obscur */
        ctx.save(); body(); ctx.clip(); ctx.strokeStyle = rgba(0, 0, 0, 0.45); ctx.lineWidth = 1; for (const k of [-15, -6, 9, 17]) { ctx.beginPath(); ctx.moveTo(hx + k * 0.55, 158); ctx.quadraticCurveTo(hx + k * 0.85 + sw * 0.4, 200, hx + k + sw, B); ctx.stroke(); } ctx.restore(); /* le creux des plis */
        ctx.fillStyle = c("#6a1020"); ctx.beginPath(); ctx.moveTo(hx - 1, 151); ctx.lineTo(hx + 1, 151); ctx.lineTo(hx + 6 + sw, B); ctx.lineTo(hx - 3 + sw, B); ctx.closePath(); ctx.fill(); /* l'ouverture, la doublure rouge */
        ctx.fillStyle = c("#8a1a2a"); ctx.beginPath(); ctx.moveTo(hx + 17 + sw, B - 12); ctx.quadraticCurveTo(hx + 27 + sw, B - 6, hx + 25 + sw, B); ctx.lineTo(hx + 14 + sw, B - 1); ctx.closePath(); ctx.fill(); /* un coin de l'ourlet retourné */
        ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(hx - 1, 151); ctx.lineTo(hx - 3 + sw, B); ctx.moveTo(hx + 1, 151); ctx.lineTo(hx + 6 + sw, B); ctx.moveTo(hx - 15, 126); ctx.quadraticCurveTo(hx, 132, hx + 15, 126); ctx.stroke(); /* les galons */
        ctx.fillStyle = c(CS.GOLD); for (const k of [-5, 5]) { ctx.beginPath(); ctx.arc(hx + k, 150, 1.8, 0, 6.283); ctx.fill(); } ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(hx - 5, 150); ctx.quadraticCurveTo(hx, 154, hx + 5, 150); ctx.stroke(); } /* l'agrafe : deux médaillons, une chaînette */
      item(hx - 18, 106, 38, 148, "back.cape.tip", "back.cape.flash"); /* la zone du porte-chapeau, inchangée */
    } else {
    ctx.fillStyle = c("#26302b"); ctx.beginPath(); ctx.ellipse(hx - 2, 140, 16, 5, -0.1, 0, 6.283); ctx.fill(); ctx.fillRect(hx - 9, 128, 15, 12); ctx.strokeStyle = c("#d8d2c0"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx + 5, 132); ctx.quadraticCurveTo(hx + 14, 118, hx + 22, 112); ctx.stroke(); ctx.fillStyle = rgba(30, 40, 90, 0.8); ctx.beginPath(); ctx.arc(hx + 22, 112, 1.6, 0, 6.283); ctx.fill();
    item(hx - 18, 106, 38, 148, "back.hat.tip", "back.hat.flash");
    }
  }
  // une pile de livres sans titre, penchée
  { const px = 488, py = 250; for (const [i, col, w, dx] of [[0, "#5b2b2b", 40, 0], [1, "#27555a", 34, 4], [2, "#4c5a2c", 30, -3]]) { ctx.save(); ctx.translate(px + dx, py - 8 - i * 9); ctx.rotate((i - 1) * 0.04); ctx.fillStyle = c(col); ctx.fillRect(-w / 2, -4, w, 9); ctx.fillStyle = rgba(236, 222, 180, 0.7); ctx.fillRect(-w / 2 + 2, 3.5, w - 4, 1.8); ctx.restore(); }
    item(px - 22, py - 38, 46, 40, "back.books.tip", "back.books.flash");
  }
  ctx.fillStyle = rgba(255, 160, 70, 0.05 * fl); ctx.fillRect(0, 0, W, H); // une chaleur diffuse, venue du côté du feu
  turnButton(r, ctx, TRr("atelier.turn.tip"), "atelier");
}

module.exports = { drawBackroom, turnButton };
