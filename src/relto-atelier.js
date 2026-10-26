"use strict";
// L'atelier d'écriture : une pièce cachée derrière une bibliothèque et un panneau de la cabane. Un grand bureau chargé d'objets étranges, une cheminée,
// un fauteuil (le chat s'y repose) et, en haut, une galerie de livres. Tout est dessiné ici (aucun asset).
const { rng, clamp, mix, rgba, fnv } = require("./util");
const EMB = require("./emblem");
const FL = require("./relto-flower");
const W = 640, H = 360, FLOOR = 250, GALLERY = 100;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const flick = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** La tablette : une dalle de pierre noire, des lignes gravées qui luisent faiblement. `s` : sa demi-largeur. */
function stone(ctx, c, x, y, s, t) { require("./relto-hear").tablet(ctx, c, x, y, s, t); } /* la pierre secrète : le signe des parois gravé dessus (src/relto-hear.js) */
/** Un bouton « retour » en haut à gauche d'une vue rapprochée (on s'y retrouvait coincé) : un rond de laiton et sa flèche. */
function backButton(r, ctx, label, go) {
  ctx.fillStyle = "rgba(20,14,8,0.72)"; ctx.beginPath(); ctx.arc(28, 28, 17, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#c9a24e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(233,220,184,0.95)"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(34, 28); ctx.lineTo(21, 28); ctx.moveTo(26, 22); ctx.lineTo(21, 28); ctx.lineTo(26, 34); ctx.stroke(); ctx.lineCap = "butt";
  r.hot.push({ x: 8, y: 8, w: 40, h: 40, tip: label, go });
}

/** Où se trouve la bibliothèque qui cache le passage, dans la cabane (coordonnées logiques) ; la pièce n'a aucun bouton de navigation. */
const SECRET = { x: 112, y: 182, w: 66, h: 66 };
/** La bibliothèque qui le cache déborde un peu du panneau. */
const CASE = { x: 104, y: 176, w: 84, h: 86 };
/** Les douze livres de la petite bibliothèque (deux rayons de six). Un seul bleu, un seul rouge, un seul dos sans titre : la combinaison est bleu, rouge, sans titre. */
const SHELF = [
  { col: "#a8802f", w: 13, h: 34 }, { col: "#3f5a3a", w: 11, h: 30 }, { col: "#8a2f2a", w: 12, h: 33 }, { col: "#4c2d4a", w: 14, h: 31 }, { col: "#5b4030", w: 11, h: 35 }, { col: "#444a50", w: 12, h: 29 },
  { col: "#5d6130", w: 13, h: 32 }, { col: "#2d4f7a", w: 12, h: 34 }, { col: "#6a4a32", w: 13, h: 31, blank: true }, { col: "#b08a3a", w: 11, h: 30 }, { col: "#3b4d33", w: 12, h: 33 }, { col: "#2b2724", w: 12, h: 28 },
];
const COMBO = [7, 2, 8];
/** La bibliothèque qui masque le panneau : on touche trois livres dans l'ordre ; les bons font coulisser le meuble, qui disparaît (le panneau de bois derrière, lui, se tapote). Chaque livre touché s'enfonce un peu, puis tout ressort si l'ordre est faux ou si l'on attend.
 * `gone` : le meuble est déjà écarté ; `r.bookAt` : l'instant où il a commencé à coulisser. */
function drawBookcase(r, ctx, c, gone, decoy) {
  const S = CASE, sh = (r.shelf = r.shelf || { seq: [], at: 0 }), now = Date.now();
  const sp = r.bookAt ? Math.min(1, (now - r.bookAt) / 1100) : gone ? 1 : 0, ease = sp * sp * (3 - 2 * sp);
  if (gone && sp >= 1) return;
  if (sh.seq.length && !gone && now - sh.at > 9000) sh.seq = [];
  ctx.save(); ctx.beginPath(); ctx.rect(S.x - 4, S.y - 4, S.w + 8, S.h + 8); ctx.clip(); ctx.translate(-(S.w + 10) * ease, 0);
  const glass = !!(r.glassOn && r.glassOn()); // la Verrière : bois sombre et cuivre (les livres, eux, ne changent pas)
  ctx.fillStyle = c(glass ? "#2a1a12" : "#3a2a1e"); ctx.fillRect(S.x - 4, S.y - 4, S.w + 8, S.h + 8); ctx.fillStyle = c("#1f160f"); ctx.fillRect(S.x, S.y, S.w, S.h);
  if (glass) { ctx.strokeStyle = c("#b5652a"); ctx.lineWidth = 1.3; ctx.strokeRect(S.x - 2.5, S.y - 2.5, S.w + 5, S.h + 5); }
  const rowH = S.h / 2;
  for (let row = 0; row < 2; row++) {
    const base = S.y + rowH * (row + 1) - 3; let x = S.x + 3;
    for (let k = 0; k < 6; k++) {
      const i = row * 6 + k, b = SHELF[i], pressed = sh.seq.includes(i), by = base - b.h + (pressed ? 2.5 : 0);
      ctx.fillStyle = c(b.col); ctx.fillRect(x, by, b.w, b.h);
      ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(x + b.w - 3, by, 3, b.h);
      if (!b.blank) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(x, by + 4, b.w, 2.5); ctx.fillRect(x, by + b.h - 8, b.w, 1.6); ctx.fillStyle = rgba(236, 222, 180, 0.55); ctx.fillRect(x + 2.5, by + 11, b.w - 5, 6); }
      if (pressed) { ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, by, b.w, b.h); }
      if (decoy) { const TRd = TR(r); r.hot.push({ x, y: by, w: b.w, h: b.h, tip: TRd("cabin.case.tip"), flash: TRd("cabin.case.flash" + (i % 3)) }); } // un décor : on peut les toucher, il ne se passe rien
      else if (!gone) r.hot.push({ x, y: by, w: b.w, h: b.h, tip: "", shelf: i, secret: true });
      x += b.w + 1;
    }
    ctx.fillStyle = c(glass ? "#b5652a" : "#4b3626"); ctx.fillRect(S.x, base, S.w, 3);
  }
  ctx.fillStyle = rgba(0, 0, 0, 0.16); ctx.fillRect(S.x - 4, S.y - 4, S.w + 8, 3);
  ctx.restore();
}

/** La chaîne de laiton qui pend de l'abat-jour : un clic la tire, la lampe s'éteint ou se rallume (l'état est celui du renderer, partagé entre l'atelier et le bureau). */
function lampChain(r, ctx, c, x, y, len, t, tip, bodyHot) {
  const pull = r.lampAt ? clamp(1 - (Date.now() - r.lampAt) / 260) : 0, sw = Math.sin(t * 1.3 + x) * 1.2 * (1 - pull), L = len + 6 * pull;
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1; ctx.setLineDash([1.6, 1.2]); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.6, y + L * 0.5, x + sw, y + L); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = c("#d8b45e"); ctx.beginPath(); ctx.arc(x + sw, y + L + 2, 2.4, 0, 6.283); ctx.fill();
  r.hot.push({ x: bodyHot.x, y: bodyHot.y, w: bodyHot.w, h: bodyHot.h, tip, lamp: true });
  r.hot.push({ x: x - 7, y: y + L - 6, w: 16, h: 16, tip, lamp: true });
}


/** Les petites choses du mur (épingle, feuille posée de travers) : les mêmes au bureau et dans l'atelier. */
function wallBits(ctx, c) {
  const pin = (x, y) => { ctx.fillStyle = c("#8e2b27"); ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.35); ctx.fillRect(x - 1, y - 1.2, 1, 1); };
  const sheet = (x, y, w, h, rot, col, draw) => { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h); ctx.fillStyle = c(col); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = rgba(90, 60, 20, 0.35); ctx.lineWidth = 0.8; ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1); draw(w, h); ctx.restore(); };
  return { pin, sheet };
}

function drawAtelier(r, ctx, sc, sky, t) {
  const glass = !!(r.glassOn && r.glassOn()); // la Verrière, sobre ici : un vitrail autour de la fenêtre ronde, du cuivre aux rampes et au manteau ; rien d'autre
  const castle = !!(r.castleOn && r.castleOn()), CS = require("./relto-castle"); // le Château : pierre et chêne fumé, galerie de noyer sculpté, escalier à vis, rosace, trône
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), q = rng(0xa7e1);
  const lit = sc.additions.find((a) => a.type === "chimney"), d = lit ? clamp(lit.density == null ? 0.7 : lit.density, 0.2, 1) : 0.45, fl = flick(t);
  // murs, boiseries
  if (castle) { CS.atelierWalls(ctx, c, FLOOR, FLOOR - 70); CS.cabinFloor(ctx, c, FLOOR, H, W, false, amb); } else {
  ctx.fillStyle = c("#4d3a2b"); ctx.fillRect(0, 0, W, FLOOR);
  for (let x = 0; x < W; x += 32) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 215, 165, 0.035 + q() * 0.04); ctx.fillRect(x, 0, 32, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(x, 0, 1.4, FLOOR); }
  ctx.fillStyle = c("#33251a"); ctx.fillRect(0, FLOOR - 70, W, 5); // lambris
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(0, FLOOR - 65, W, 65);
  // sol et tapis
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#46321f")); fg.addColorStop(1, c("#26190f")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (const y of [FLOOR + 18, FLOOR + 42, FLOOR + 74]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 4, W, 6);
  }
  if (castle) CS.rug(ctx, c, 300, 322, 210, 26);
  else if (glass) require("./relto-glass").ornateRug(ctx, c, 300, 322, 210, 26, { field: "#3d2a4a", border: "#22303a", vine: "#6a9a8a", gold: "#c9a24e" }); // la Verrière : un tapis ouvragé
  else {
  ctx.fillStyle = c("#3d2a4a"); ctx.beginPath(); ctx.ellipse(300, 322, 210, 26, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(300, 322, 194, 21, 0, 0, 6.283); ctx.stroke();
  }
  // galerie : un étage de livres de référence (décor pour l'instant), balustrade, échelle
  if (castle) CS.galleryBays(ctx, c, W, GALLERY); else { ctx.fillStyle = c("#1d140e"); ctx.fillRect(0, 0, W, GALLERY); }
  for (let sx = 120; sx < W - 20; sx += 130) {
    if (!castle) { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(sx - 4, 4, 5, GALLERY - 8); }
    for (let row = 0; row < 2; row++) {
      const y0 = 10 + row * 40; ctx.fillStyle = c("#4b3626"); ctx.fillRect(sx, y0 + 33, 118, 4);
      let bx = sx + 4; const g = rng(0x4000 + sx + row * 7);
      while (bx < sx + 112) { const bw = 5 + Math.floor(g() * 6), bh = 18 + Math.floor(g() * 14), col = ["#27555a", "#5b2b2b", "#3b3560", "#4c5a2c", "#6a4a2a", "#2f3e4f"][Math.floor(g() * 6)]; ctx.fillStyle = c(col); ctx.fillRect(bx, y0 + 33 - bh, bw, bh); ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw - 1.5, y0 + 33 - bh, 1.5, bh); if (g() < 0.4) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx, y0 + 33 - bh + 4, bw, 1.5); } bx += bw + 1; }
    }
  }
  if (castle) CS.balustrade(ctx, c, W, GALLERY); else {
  ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(0, GALLERY - 4, W, 8); // plancher de la galerie
  ctx.fillStyle = c("#4b3626"); ctx.fillRect(0, GALLERY + 4, W, 3);
  for (let x = 6; x < W; x += 24) { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(x, GALLERY + 7, 4, 20); ctx.fillStyle = c("#4b3626"); ctx.beginPath(); ctx.arc(x + 2, GALLERY + 9, 4, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = c(glass ? "#b5652a" : "#4b3626"); ctx.fillRect(0, GALLERY + 26, W, 4); // lisse
  if (glass) { ctx.fillStyle = c("#b5652a"); ctx.fillRect(0, GALLERY + 4, W, 3); ctx.fillStyle = c("#e6a06a"); ctx.fillRect(0, GALLERY + 26, W, 1); }
  }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(0, GALLERY + 30, W, 8);
  // l'échelle de la galerie
  if (castle) CS.spiralStair(ctx, c, 606, 30, GALLERY - 4, FLOOR); else { // le Château : un escalier à vis de noyer, dans la colonne de l'échelle
  ctx.fillStyle = c("#5a4330"); ctx.fillRect(628, GALLERY - 4, 5, FLOOR - GALLERY); ctx.fillRect(612, GALLERY - 4, 5, FLOOR - GALLERY);
  for (let y = GALLERY + 14; y < FLOOR - 6; y += 18) ctx.fillRect(612, y, 21, 3);
  }
  r.hot.push({ x: 606, y: GALLERY - 4, w: 30, h: FLOOR - GALLERY, tip: TRr("atelier.ladder.tip"), go: "loft" });
  // porte : le panneau coulisse vers la cabane
  const dx = 28, dy = 118, dw = 62;
  if (castle) CS.cabinDoor(ctx, c, sky, dx, dy, dw, FLOOR, 6); else if (r.glassOn && r.glassOn()) require("./relto-glass").atelierDoor(ctx, c, sky, dx, dy, dw, FLOOR); /* la Verrière : bois irisé, cuivre, vitrail ovale */ else { // l'arc bas : la rosace est juste au-dessus
  ctx.fillStyle = c("#241810"); ctx.fillRect(dx - 4, dy - 4, dw + 8, FLOOR - dy + 4); ctx.fillStyle = c("#46301f"); ctx.fillRect(dx, dy, dw, FLOOR - dy - 2);
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dw / 4, dy); ctx.lineTo(dx + i * dw / 4, FLOOR - 2); ctx.stroke(); }
  ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 66, 3, 0, 6.283); ctx.fill();
  }
  r.hot.push({ x: dx - 4, y: dy - 4, w: dw + 8, h: FLOOR - dy + 4, tip: TRr("atelier.door.tip"), go: "cabin" });
  require("./relto-atelier-back").turnButton(r, ctx, TRr("atelier.turn.tip"), "atelierback"); // se retourner : l'autre côté de la pièce
  // fenêtre ronde
  const wx = 66, wy = 58, wr = 32; // à l'étage, en haut à gauche (la galerie de livres commence plus loin)
  ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 6.283); ctx.clip(); const sg = ctx.createLinearGradient(0, wy - wr, 0, wy + wr); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(wx - wr, wy - wr, 2 * wr, 2 * wr);
  if (sky.stars > 0.05) { const s = rng(0x91); for (let i = 0; i < 10; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.4 + 0.5 * s())); ctx.fillRect(wx - wr + s() * 2 * wr, wy - wr + s() * wr, 1.2, 1.2); } }
  { const cm = sc.additions.find((a) => a.type === "comet"); if (cm) require("./relto-scenery").cometWindow(ctx, r, cm.density == null ? 0.6 : cm.density, sky, t, wx, wy, wr); } // la page Comète : on la voit passer, parfois
  if (r.sprite) ctx.drawImage(r.sprite, wx - wr - 10 + ((t * 4) % (2 * wr + 42)), wy - wr * 0.1, 50, 22); // un nuage qui passe, comme à la fenêtre de la cabane
  if (r.cloudColor) { ctx.fillStyle = r.cloudColor(sky); ctx.globalAlpha = 0.5; ctx.fillRect(wx - wr, wy + wr - 13, 2 * wr, 13); ctx.globalAlpha = 1; } // la brume sur l'horizon
  ctx.restore();
  if (castle) CS.rosette(ctx, c, sky, wx, wy, wr); // le Château : une rosace de pierre
  else if (glass) require("./relto-glass").roundWindowRing(ctx, c, sky, wx, wy, wr, false); // un anneau de verre coloré, le clair au milieu (la comète y passe toujours)
  else { ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 6.283); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx - wr, wy); ctx.lineTo(wx + wr, wy); ctx.moveTo(wx, wy - wr); ctx.lineTo(wx, wy + wr); ctx.stroke(); }
  r.hot.push({ x: wx - wr, y: wy - wr, w: 2 * wr, h: 2 * wr, tip: TRr("atelier.window.tip"), go: "roundwindow" }); // un clic : la lucarne de près, ceinte des chiffres D'ni
  // cheminée
  const fx = 470, fw = 130;
  ctx.fillStyle = c("#6a6258"); ctx.fillRect(fx + 18, GALLERY + 38, fw - 36, 90); ctx.fillStyle = c("#555047"); ctx.fillRect(fx, 150, fw, FLOOR - 150);
  ctx.strokeStyle = rgba(0, 0, 0, 0.26); ctx.lineWidth = 1; for (let y = 150; y < FLOOR; y += 15) { ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + fw, y); ctx.stroke(); }
  if (castle) CS.mantel(ctx, c, fx - 10, 140, fw + 20, 11, [fx + fw / 2, GALLERY + 52]); else { ctx.fillStyle = c(glass ? "#b5652a" : "#3a2a22"); ctx.fillRect(fx - 10, 140, fw + 20, 11); if (glass) { ctx.fillStyle = c("#e6a06a"); ctx.fillRect(fx - 10, 140, fw + 20, 1.4); } }
  const ox = fx + 20, ow = fw - 40; ctx.fillStyle = "#0e0907"; ctx.beginPath(); ctx.moveTo(ox, FLOOR); ctx.lineTo(ox, 188); ctx.quadraticCurveTo(ox + ow / 2, 160, ox + ow, 188); ctx.lineTo(ox + ow, FLOOR); ctx.closePath(); ctx.fill();
  const mx = ox + ow / 2, by = FLOOR - 9, n = Math.round(3 + 3 * d);
  if (castle) CS.andirons(ctx, c, ox + 8, ox + ow - 8, FLOOR - 1);
  ctx.fillStyle = "#2b1c12"; ctx.fillRect(mx - 28, by - 5, 56, 7);
  for (let i = 0; i < n; i++) { const ph = t * (2.2 + i * 0.37) + i * 1.9, h = (10 + 30 * d) * (0.65 + 0.35 * Math.sin(ph)), x = mx + (i - (n - 1) / 2) * 10, sw = Math.sin(ph * 1.3) * 3;
    for (const [col, k] of [["rgba(255,110,30,0.85)", 1], ["rgba(255,190,70,0.9)", 0.62], ["rgba(255,240,170,0.9)", 0.3]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 6 * k - 1, by - 7); ctx.quadraticCurveTo(x - 4 * k + sw, by - h * k * 0.6, x + sw, by - h * k - 5); ctx.quadraticCurveTo(x + 4 * k + sw, by - h * k * 0.6, x + 6 * k + 1, by - 7); ctx.fill(); } }
  ctx.fillStyle = rgba(255, 160, 70, 0.07 * fl * (0.5 + d)); ctx.beginPath(); ctx.arc(mx, by - 20, 150, 0, 6.283); ctx.fill();
  r.hot.push({ x: fx - 10, y: 140, w: fw + 20, h: FLOOR - 140, tip: TRr("atelier.fire.tip"), flash: TRr("atelier.fire.flash") });
  // fauteuil devant le feu ; le chat s'y roule en boule
  const ax = 396, ay = 262;
  const cover = coverOf(r); // la housse du jour : une étoffe sourde, qui change chaque jour (le même jour, la même toute la journée)
  if (castle) CS.throne(ctx, c, ax, ay, cover); // le Château : un trône bas, la housse du jour en velours
  else if (glass) require("./relto-glass").armchair(ctx, c, ax, ay, cover); // la Verrière : dossier en fer à cheval clouté de cuivre, accoudoirs en crosse, pieds en coup de fouet ; la housse du jour, la même
  else {
  ctx.fillStyle = c(cover.back); ctx.fillRect(ax, ay - 52, 52, 54); ctx.fillStyle = c(cover.seat); ctx.fillRect(ax - 8, ay - 30, 14, 36); ctx.fillRect(ax + 46, ay - 30, 14, 36); ctx.fillRect(ax + 4, ay - 26, 44, 28);
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(ax - 8, ay + 2, 68, 5); ctx.fillStyle = c("#2f2016"); ctx.fillRect(ax - 6, ay + 6, 4, 8); ctx.fillRect(ax + 54, ay + 6, 4, 8);
  }
  const cat = sc.additions.find((a) => a.type === "cat");
  if (cat && r.catSpotFor() === 0) r.drawSleepingCat(ctx, cat, { x: ax + 28, y: ay - 26, S: 1.7, shade: c, tip: TRr("atelier.cat.tip"), camo: cover.camo }, t); // (Marcel s'y camoufle : la couleur de la housse du jour, entre le dossier et l'assise) le même chat que dans la cabane, roulé sur l'assise
  else r.hot.push({ x: ax - 8, y: ay - 52, w: 68, h: 56, tip: TRr("atelier.chair.tip"), flash: TRr("atelier.chair.flash") });
  // le mur derrière le bureau : un portrait, le tableau aux ficelles rouges, un baromètre, une étagère de bocaux
  { const { pin, sheet } = wallBits(ctx, c), TRd = (k) => TRr(k), wq = rng(0xb0a7);
    FL.drawPortrait(ctx, c, sc, t); // l'ovale au mur : une fleur de cristal, qui luit doucement
    r.hot.push({ x: 119, y: 129, w: 44, h: 58, tip: TRd("atelier.deco.portrait"), go: "flower" });
    ctx.fillStyle = c("#5a4330"); ctx.fillRect(188, 126, 108, 72); if (castle) CS.goldFrame(ctx, c, 188, 126, 108, 72); else { ctx.strokeStyle = c(glass ? "#b5652a" : "#2f2118"); ctx.lineWidth = 3; ctx.strokeRect(188, 126, 108, 72); } // le tableau : liège sombre, feuilles, ficelles (cadre de cuivre sous la Verrière)
    for (let i = 0; i < 60; i++) { ctx.fillStyle = rgba(0, 0, 0, 0.1); ctx.fillRect(190 + wq() * 104, 128 + wq() * 68, 1.5, 1.5); }
    const P = [[200, 136, 22, 28, "#d9c9a0", -0.05], [236, 134, 26, 22, "#cdbb8a", 0.04], [268, 140, 22, 30, "#e0d3ae", -0.03], [212, 168, 26, 20, "#d6c598", 0.05], [252, 172, 28, 18, "#d9c9a0", -0.04]], pts = [];
    for (const [x, y, w, h, col, rot] of P) { sheet(x, y, w, h, rot, col, () => { ctx.strokeStyle = rgba(60, 45, 25, 0.5); ctx.lineWidth = 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h / 2 + 6 + k * 5); ctx.lineTo(w / 2 - 4 - k * 2, -h / 2 + 6 + k * 5); ctx.stroke(); } }); pts.push([x + w / 2, y + 4]); }
    ctx.strokeStyle = rgba(160, 40, 36, 0.85); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const k of [1, 2, 4, 3, 0, 2]) ctx.lineTo(pts[k][0], pts[k][1]); ctx.stroke(); for (const [x, y] of pts) pin(x, y);
    r.hot.push({ x: 188, y: 126, w: 108, h: 72, tip: TRd("atelier.deco.board"), flash: TRd("atelier.deco.board.flash") });
    { const bx = 326, by = 160; ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(bx, by, 22, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#e6d9b8"); ctx.beginPath(); ctx.arc(bx, by, 18, 0, 6.283); ctx.fill(); // un baromètre : l'aiguille ne bouge jamais
      ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 0.8; for (let i = 0; i < 12; i++) { const a = 2.4 + i * 0.4; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * 14, by + Math.sin(a) * 14); ctx.lineTo(bx + Math.cos(a) * 17, by + Math.sin(a) * 17); ctx.stroke(); }
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(4.3) * 13, by + Math.sin(4.3) * 13); ctx.stroke(); ctx.fillStyle = c("#2a1c14"); ctx.beginPath(); ctx.arc(bx, by, 2, 0, 6.283); ctx.fill();
      r.hot.push({ x: bx - 23, y: by - 23, w: 46, h: 46, tip: TRd("atelier.deco.baro"), flash: TRd("atelier.deco.baro.flash") }); }
    { const sx = 364, sy = 176; ctx.fillStyle = c("#4b3626"); ctx.fillRect(sx, sy, 84, 5);
      if (castle) { ctx.strokeStyle = c(CS.IRON); ctx.lineWidth = 2; for (const bx of [sx + 8, sx + 76]) { ctx.beginPath(); ctx.moveTo(bx, sy + 5); ctx.quadraticCurveTo(bx, sy + 16, bx - 6, sy + 12); ctx.stroke(); } } // le Château : des consoles de fer en volute
      else if (glass) { ctx.strokeStyle = c("#b5652a"); ctx.lineWidth = 2; for (const bx of [sx + 8, sx + 76]) { ctx.beginPath(); ctx.moveTo(bx, sy + 5); ctx.bezierCurveTo(bx, sy + 14, bx - 6, sy + 16, bx - 4, sy + 10); ctx.stroke(); } ctx.fillStyle = c("#b5652a"); ctx.fillRect(sx, sy, 84, 1.4); } // des consoles de cuivre en crosse
      else { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(sx + 6, sy + 5, 4, 8); ctx.fillRect(sx + 74, sy + 5, 4, 8); } // une étagère, des bocaux et un crâne de souris
      const J = [["#2f6b48", 12, 22], ["#7a3a3a", 10, 17], ["#3b3560", 14, 25], ["#6a4a2a", 11, 15]]; let jx = sx + 6;
      for (const [col, w, h] of J) { ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(jx + 1, sy - h + 1, w, h); ctx.fillStyle = c(col); ctx.fillRect(jx, sy - h, w, h); ctx.fillStyle = rgba(255, 255, 255, 0.18); ctx.fillRect(jx + 2, sy - h + 3, 2, h - 7); ctx.fillStyle = c("#c9a24e"); ctx.fillRect(jx + 1, sy - h - 3, w - 2, 3); jx += w + 5; }
      ctx.fillStyle = c("#e6d9b8"); ctx.beginPath(); ctx.ellipse(sx + 74, sy - 4, 5, 4, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#2a1c14"); ctx.fillRect(sx + 72, sy - 5, 1.5, 1.5); ctx.fillRect(sx + 75, sy - 5, 1.5, 1.5);
      r.hot.push({ x: sx - 2, y: sy - 30, w: 90, h: 36, tip: TRd("atelier.deco.shelf"), flash: TRd("atelier.deco.shelf.flash") }); } }
  require("./relto-vault").trapDoor(r, ctx, c, 567, 300, 78, 24, TRr("vault.door.tip"));
  if (castle) wolf(r, ctx, c, sky, t, TRr); // le Château : un loup blanc, assis devant le feu // la trappe de fer, dans le sol devant la cheminée : le coffre des livres descriptifs
  // le grand bureau
  const tx = 100, tw = 270, ty = 270;
  if (castle) { for (const x of [tx + 8, tx + tw - 18]) { ctx.fillStyle = c(CS.WALNUT_LO); ctx.fillRect(x, ty, 10, 74); ctx.fillStyle = c(CS.WALNUT_HI); ctx.fillRect(x + 1, ty, 2, 74); ctx.fillStyle = c(CS.WALNUT); ctx.beginPath(); ctx.ellipse(x + 5, ty + 62, 7, 4, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c(CS.GOLD); ctx.fillRect(x - 1, ty + 58, 12, 1.2); } } // le Château : des pieds de noyer tournés, une bague d'or
  else if (glass) require("./relto-glass").tableLegs(ctx, c, tx + 4, tw - 8, ty + 30); // la Verrière : des pieds en coup de fouet sous le caisson
  else { ctx.fillStyle = c("#2f2016"); ctx.fillRect(tx + 8, ty, 10, 74); ctx.fillRect(tx + tw - 18, ty, 10, 74); }
  ctx.fillStyle = c(castle ? CS.WALNUT_LO : glass ? "#2a1a12" : "#3d2a1c"); ctx.fillRect(tx + 6, ty + 10, tw - 12, 46);
  ctx.fillStyle = rgba(0, 0, 0, 0.3); for (let i = 0; i < 3; i++) ctx.fillRect(tx + 24 + i * 78, ty + 16, 66, 34); ctx.fillStyle = c("#c9a24e"); for (let i = 0; i < 3; i++) ctx.fillRect(tx + 52 + i * 78, ty + 30, 10, 3);
  ctx.fillStyle = c(castle ? "#2e2622" : glass ? "#4a2e1c" : "#6d4c31"); ctx.fillRect(tx - 6, ty - 8, tw + 12, 10); ctx.fillStyle = c(castle ? "#4a3e36" : glass ? "#b5652a" : "#7d5a3b"); ctx.fillRect(tx - 6, ty - 8, tw + 12, 3);
  if (castle) { ctx.fillStyle = c(CS.GOLD); ctx.fillRect(tx - 6, ty + 1, tw + 12, 1); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) ctx.strokeRect(tx + 24.5 + i * 78, ty + 16.5, 65, 33); } // le plateau de chêne noir, les tiroirs filetés d'or
  if (glass) { ctx.fillStyle = c("#b5652a"); ctx.fillRect(tx - 6, ty + 1, tw + 12, 1.4); ctx.strokeStyle = c("#b5652a"); ctx.lineWidth = 1; for (let i = 0; i < 3; i++) ctx.strokeRect(tx + 24.5 + i * 78, ty + 16.5, 65, 33); } // le plateau et les tiroirs filetés de cuivre
  const top = ty - 8;
  r.hot.push({ x: tx - 6, y: top - 36, w: tw + 12, h: 100, tip: TRr("atelier.sit.tip"), go: "desk" }); // s'asseoir au bureau (les objets, poussés après, gardent la priorité)
  const item = (x, y, w, h, tip, flash) => r.hot.push({ x, y, w, h, tip: TRr(tip), flash: flash ? TRr(flash) : undefined });
  // l'orrery : une sphère de laiton et ses anneaux qui tournent
  { const ox2 = tx + 30, oy2 = top - 34; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ox2 - 2, oy2 + 14, 4, 14); ctx.fillRect(ox2 - 12, top - 6, 24, 4);
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const a = t * 0.5 + k * 1.05; ctx.beginPath(); ctx.ellipse(ox2, oy2, 18, 18 * Math.abs(Math.cos(a)) + 2, k * 1.05, 0, 6.283); ctx.stroke(); }
    ctx.fillStyle = c("#7fd6c8"); ctx.beginPath(); ctx.arc(ox2, oy2, 4, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(127, 214, 200, 0.18 + 0.1 * Math.sin(t * 2)); ctx.beginPath(); ctx.arc(ox2, oy2, 11, 0, 6.283); ctx.fill();
    item(ox2 - 22, oy2 - 20, 44, 52, "atelier.orrery.tip", "atelier.orrery.flash"); }
  // la lampe à abat-jour vert (une chaîne de laiton l'éteint ou l'allume)
  { const lx = tx + 78; if (castle) { CS.candlestand(ctx, c, lx, top - 26, top - 2, !r.lampOff, fl, 0.8); CS.chainLink(ctx, c, lx + 8, top - 26 + 3.2 + 1, lx + 9, top - 20); } else if (glass) require("./relto-glass").tiffanyLamp(ctx, c, lx, top - 34, top - 20, 13, top - 2, 7, !r.lampOff, fl); else { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(lx - 1.5, top - 26, 3, 24); ctx.fillRect(lx - 8, top - 4, 16, 3); } if (!glass && !castle) { ctx.fillStyle = c("#2f6b48"); ctx.beginPath(); ctx.moveTo(lx - 12, top - 20); ctx.lineTo(lx + 12, top - 20); ctx.lineTo(lx + 7, top - 33); ctx.lineTo(lx - 7, top - 33); ctx.fill(); }
    if (!r.lampOff) { if (castle) CS.candleGlow(ctx, lx, top - 30, 60, fl, sky.night || 0); else if (glass) require("./relto-glass").lampGlow(ctx, lx, top - 20, top - 1, 13, fl, true); else { ctx.fillStyle = rgba(255, 220, 140, 0.1 + 0.03 * fl); ctx.beginPath(); ctx.moveTo(lx - 12, top - 20); ctx.lineTo(lx + 12, top - 20); ctx.lineTo(lx + 36, top + 2); ctx.lineTo(lx - 36, top + 2); ctx.fill(); } }
    lampChain(r, ctx, c, lx + 9, top - 20, 13, t, TRr("atelier.lamp.tip"), { x: lx - 13, y: top - 35, w: 26, h: 36 }); }
  // le grand livre ouvert, la plume et l'encrier
  { const bx = tx + 108; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 1, top - 6, 56, 6); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx + 1, top - 9, 26, 5); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + 28, top - 9, 26, 5); ctx.fillStyle = rgba(120, 90, 50, 0.6); for (let k = 0; k < 3; k++) { ctx.fillRect(bx + 4, top - 8 + k * 1.4, 20, 0.6); ctx.fillRect(bx + 31, top - 8 + k * 1.4, 20, 0.6); }
    item(bx - 2, top - 12, 58, 14, "atelier.book.tip", "atelier.book.flash");
    const ix = bx + 70, HS = (r.opts.hearState && r.opts.hearState()) || {}, hum = HS.hum || 0, HR = require("./relto-hear"); /* le chapitre 14 : l'encrier frémit, la pierre de liaison est posée à côté */
    HR.scarabSide(ctx, c, ix + 6, top - 1, 8, t, { skin: castle ? "castle" : glass ? "glass" : "plain", hum }); /* l'encrier en scarabée, de profil (la pièce est vue de face) : on s'assoit au bureau pour l'ouvrir */
    HR.dipPen(ctx, c, ix + 18, top - 2, 26, -0.25, { skin: castle ? "castle" : glass ? "glass" : "plain", w: 1.6 });
    item(ix - 2, top - 14, 46, 16, "atelier.ink.tip", hum > 0 ? "atelier.ink.hum" : "atelier.ink.flash");
    if (HS.stone) { HR.linkStone(ctx, c, ix - 9, top - 1, 6, t); item(ix - 17, top - 9, 16, 12, "atelier.link.tip", "atelier.link.flash"); }
    const SS = (r.opts.sealState && r.opts.sealState()) || {}; if (SS.here && !r.sealHeld) HR.seal(ctx, c, ix - 22, top - 2, 5); } /* le cachet, tout petit, de l'autre côté de la pierre de liaison */
  // un sablier et un cristal étrange qui respire
  { const hx = tx + 218; ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.4; ctx.strokeRect(hx - 8, top - 28, 16, 26); ctx.fillStyle = c("#e6d9a8"); ctx.beginPath(); ctx.moveTo(hx - 6, top - 26); ctx.lineTo(hx + 6, top - 26); ctx.lineTo(hx, top - 15); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx, top - 15); ctx.lineTo(hx + 6, top - 4); ctx.lineTo(hx - 6, top - 4); ctx.fill(); item(hx - 10, top - 30, 20, 30, "atelier.hourglass.tip", "atelier.hourglass.flash");
    const kx = tx + 246, p = 0.5 + 0.5 * Math.sin(t * 1.3); ctx.fillStyle = rgba(140, 90, 220, 0.12 + 0.12 * p); ctx.beginPath(); ctx.arc(kx, top - 14, 15, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#8d5fd6"); ctx.beginPath(); ctx.moveTo(kx, top - 30); ctx.lineTo(kx + 7, top - 14); ctx.lineTo(kx, top - 2); ctx.lineTo(kx - 7, top - 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.35); ctx.fillRect(kx - 2, top - 24, 2, 8); item(kx - 9, top - 32, 18, 32, "atelier.crystal.tip", "atelier.crystal.flash"); }
}

/** « Je m'assois au bureau » : le gros plan du plateau, la corbeille à lettres à gauche. */
function drawDesk(r, ctx, sc, sky, t) {
  const glass = !!(r.glassOn && r.glassOn()); // la Verrière : la lampe à coupole de verre, un filet de cuivre au bord du plateau
  const castle = !!(r.castleOn && r.castleOn()), CS = require("./relto-castle"); // le Château : un mur de pierre, le plateau de chêne noir, un grand chandelier
  const amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), fl = flick(t), mail = (r.opts.mailState && r.opts.mailState()) || {};
  if (castle) { CS.ashlar(ctx, c, 0, 0, W, 184, "#4a4552", 18, 0xde5c); ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(0, 0, W, 184); } else { ctx.fillStyle = c("#2b2018"); ctx.fillRect(0, 0, W, H); } // le mur, dans l'ombre
  for (let x = 0; x < W; x += 36) { ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(x, 0, 1.4, 190); }
  // au mur : la carte du ciel, des parchemins épinglés, une carte de l'île, un croquis encadré (plus de fenêtre : on a le dos à la lumière)
  const { pin, sheet } = wallBits(ctx, c);
  const wq = rng(0x5a17);
  sheet(446, 22, 104, 82, -0.02, "#1f2a44", (w, h) => { // la carte du ciel : un fond d'encre bleue, des étoiles, des lignes de constellations, un cercle de mois
    ctx.strokeStyle = rgba(216, 192, 122, 0.55); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 38, 0, 6.283); ctx.stroke();
    const pts = []; for (let i = 0; i < 22; i++) pts.push([(wq() - 0.5) * (w - 14), (wq() - 0.5) * (h - 14)]);
    ctx.strokeStyle = rgba(216, 192, 122, 0.35); ctx.beginPath(); for (let i = 0; i < pts.length - 1; i += 3) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.lineTo(pts[i + 2][0], pts[i + 2][1]); } ctx.stroke();
    for (const [x, y] of pts) { ctx.fillStyle = rgba(240, 232, 200, 0.85); ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8); }
    ctx.fillStyle = rgba(216, 192, 122, 0.9); ctx.beginPath(); ctx.arc(22, -18, 3, 0, 6.283); ctx.fill(); });
  pin(456, 27); pin(540, 27);
  r.hot.push({ x: 446, y: 22, w: 104, h: 82, tip: TRr("atelier.wall.chart"), ...(r.available && r.available().starmap ? { go: "starmap" } : { flash: TRr("atelier.wall.chart.flash") }) });
  sheet(566, 30, 50, 66, 0.045, "#d9c9a0", (w, h) => { ctx.strokeStyle = rgba(60, 45, 25, 0.55); ctx.lineWidth = 1; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h / 2 + 10 + i * 8); ctx.lineTo(w / 2 - 6 - (i % 3) * 5, -h / 2 + 10 + i * 8); ctx.stroke(); } });
  pin(591, 36); r.hot.push({ x: 566, y: 30, w: 50, h: 66, tip: TRr("atelier.wall.notes"), flash: TRr("atelier.wall.notes.flash") });
  sheet(470, 112, 76, 50, -0.03, "#cdbb8a", (w, h) => { // une carte de l'île, au trait
    ctx.strokeStyle = rgba(70, 50, 25, 0.7); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-22, -16, -6, -14); ctx.quadraticCurveTo(8, -20, 20, -8); ctx.quadraticCurveTo(30, 4, 14, 12); ctx.quadraticCurveTo(0, 20, -14, 14); ctx.quadraticCurveTo(-28, 14, -26, 2); ctx.stroke();
    ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(0, -4, 12, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(150, 40, 30, 0.8); ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(16, 2); ctx.moveTo(16, -4); ctx.lineTo(10, 2); ctx.stroke(); });
  pin(481, 117); pin(536, 116); r.hot.push({ x: 470, y: 112, w: 76, h: 50, tip: TRr("atelier.wall.map"), flash: TRr("atelier.wall.map.flash") });
  sheet(566, 112, 44, 40, 0.06, "#e0d3ae", (w, h) => { ctx.strokeStyle = rgba(60, 45, 25, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -2, 11, 0, 6.283); ctx.moveTo(-14, 12); ctx.lineTo(14, 12); ctx.moveTo(0, -13); ctx.lineTo(0, 9); ctx.stroke(); }); pin(588, 117);
  r.hot.push({ x: 566, y: 112, w: 44, h: 40, tip: TRr("atelier.wall.sketch"), flash: TRr("atelier.wall.sketch.flash") });
  sheet(236, 40, 44, 58, -0.05, "#d6c598", (w, h) => { ctx.strokeStyle = rgba(60, 45, 25, 0.5); ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h / 2 + 9 + i * 9); ctx.lineTo(w / 2 - 6 - (i % 2) * 8, -h / 2 + 9 + i * 9); ctx.stroke(); } }); pin(257, 46);
  r.hot.push({ x: 236, y: 40, w: 44, h: 58, tip: TRr("atelier.wall.notes"), flash: TRr("atelier.wall.notes.flash") });
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 3; ctx.strokeRect(300, 54, 70, 52); ctx.fillStyle = c("#3d4f46"); ctx.fillRect(302, 56, 66, 48); // un petit cadre : une côte, au crayon vert
  ctx.strokeStyle = rgba(230, 220, 180, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(304, 92); ctx.quadraticCurveTo(320, 70, 336, 86); ctx.quadraticCurveTo(350, 74, 366, 94); ctx.stroke();
  r.hot.push({ x: 300, y: 54, w: 70, h: 52, tip: TRr("atelier.wall.frame"), flash: TRr("atelier.wall.frame.flash") });
  const g = ctx.createLinearGradient(0, 180, 0, H); g.addColorStop(0, c(castle ? "#3a2e28" : "#6d4c31")); g.addColorStop(1, c(castle ? "#17110e" : "#3a2717")); ctx.fillStyle = g; ctx.fillRect(0, 180, W, H - 180); // le plateau
  if (castle) { ctx.fillStyle = c("#4a3e36"); ctx.fillRect(0, 180, W, 4); ctx.fillStyle = c(CS.GOLD); ctx.fillRect(0, 180, W, 1); ctx.fillRect(0, 186, W, 0.8); } // le Château : chêne noir, deux filets d'or
  ctx.fillStyle = c(castle ? "#4a3e36" : glass ? "#b5652a" : "#7d5a3b"); ctx.fillRect(0, 180, W, 4); if (glass) { ctx.fillStyle = c("#e6a06a"); ctx.fillRect(0, 180, W, 1.2); } const q = rng(0xde5c); ctx.strokeStyle = rgba(0, 0, 0, 0.14); ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = 190 + q() * 170; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(200, y + q() * 6 - 3, 440, y + q() * 6 - 3, W, y); ctx.stroke(); }
  // la lampe verte, en haut à gauche : son cône éclaire le plateau ; la chaîne de laiton l'éteint ou l'allume
  { const lx = 150; const glassD = glass;
    if (castle) { if (!r.lampOff) CS.candleGlow(ctx, lx, 60, 230, fl, 0.8); CS.candlestand(ctx, c, lx, 64, 182, !r.lampOff, fl, 2.6); CS.chainLink(ctx, c, lx + 26, 64 + 4 * 2.6 + 2, lx + 28, 78); } // le Château : un grand chandelier ; la chaîne de l'éteignoir pend de sa branche droite
    else if (glassD) { if (!r.lampOff) require("./relto-glass").lampGlow(ctx, lx, 78, null, 40, fl, true); require("./relto-glass").tiffanyLamp(ctx, c, lx, 30, 78, 40, 184, 22, !r.lampOff, fl); } // la Verrière : une lampe à coupole de verre au plomb, pied de bronze ; sa lumière se colore sur le mur et le plateau
    else { ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(lx - 3, 90, 6, 92); ctx.fillRect(lx - 22, 176, 44, 8); ctx.fillStyle = c("#2f6b48"); ctx.beginPath(); ctx.moveTo(lx - 38, 78); ctx.lineTo(lx + 38, 78); ctx.lineTo(lx + 20, 34); ctx.lineTo(lx - 20, 34); ctx.fill(); }
    if (!r.lampOff && !castle) { ctx.fillStyle = glassD ? rgba(255, 214, 160, 0.05 + 0.02 * fl) : rgba(255, 224, 150, 0.1 + 0.03 * fl); ctx.beginPath(); ctx.moveTo(lx - 38, 78); ctx.lineTo(lx + 38, 78); ctx.lineTo(lx + 230, 360); ctx.lineTo(lx - 150, 360); ctx.fill(); }
    lampChain(r, ctx, c, lx + 28, 78, 34, t, TRr("atelier.lamp.tip"), { x: lx - 40, y: 32, w: 80, h: 150 }); }
  // le planétaire, au fond à droite
  { const ox = 410, oy = 150; ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(ox - 3, oy + 22, 6, 30); ctx.fillRect(ox - 20, 176, 40, 6); ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = t * 0.5 + k * 1.05; ctx.beginPath(); ctx.ellipse(ox, oy, 28, 28 * Math.abs(Math.cos(a)) + 3, k * 1.05, 0, 6.283); ctx.stroke(); } ctx.fillStyle = c("#7fd6c8"); ctx.beginPath(); ctx.arc(ox, oy, 6, 0, 6.283); ctx.fill();
    r.hot.push({ x: ox - 32, y: oy - 32, w: 64, h: 84, tip: TRr("atelier.orrery.tip"), flash: TRr("atelier.orrery.flash") }); }
  { const st = (r.opts.statusState && r.opts.statusState()) || { tier: 0, korfah: false, title: "" }; require("./relto-status").drawStatus(r, ctx, c, TRr, t, st); } // la plaque du titre et les objets de chaque palier
  // le grand livre ouvert, au centre : des lignes d'écriture qui attendent
  { const bx = 230, by = 230, bw = 190, bh = 100; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 8, by - 6, bw + 16, bh + 12); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx, by - 2, bw / 2 - 2, bh); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + bw / 2 + 2, by - 2, bw / 2 - 2, bh);
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw / 2 - 2, by - 2, 4, bh); ctx.fillStyle = rgba(110, 80, 45, 0.55); for (let k = 0; k < 8; k++) { ctx.fillRect(bx + 10, by + 8 + k * 11, 66 - (k % 3) * 8, 1.4); ctx.fillRect(bx + bw / 2 + 12, by + 8 + k * 11, 62 - (k % 4) * 7, 1.4); }
    r.hot.push({ x: bx - 8, y: by - 8, w: bw + 16, h: bh + 16, tip: TRr("atelier.book.tip"), flash: TRr("atelier.book.flash") }); }
  { // le livre vierge : un livre fermé, vu d'au-dessus, posé sur le bureau à droite (reliure sombre, coins de laiton, rien d'écrit)
    ctx.save(); ctx.translate(574, 226); ctx.rotate(-0.09);
    ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(-34, -44, 76, 100); ctx.fillStyle = c("#2a2620"); ctx.fillRect(-38, -50, 76, 100);
    ctx.fillStyle = c("#1b1814"); ctx.fillRect(-38, -50, 8, 100); ctx.fillStyle = rgba(255, 255, 255, 0.05); ctx.fillRect(-26, -46, 60, 92);
    ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1.2; ctx.strokeRect(-22, -36, 48, 72);
    ctx.fillStyle = c("#d8c07a"); for (const [px, py] of [[-37, -49], [33, -49], [-37, 44], [33, 44]]) ctx.fillRect(px, py, 5, 5);
    ctx.restore(); r.hot.push({ x: 534, y: 172, w: 82, h: 108, tip: TRr("agebook.tip"), go: "descbook" }); }
  require("./relto-hear").dipPen(ctx, c, 545, 270, 122, -0.92, { skin: castle ? "castle" : glass ? "glass" : "plain", w: 4 }); /* le porte-plume, posé en travers du livre noir */
  // l'encrier et la plume, à droite
  const HS = (r.opts.hearState && r.opts.hearState()) || {}, hum = HS.hum || 0, HR = require("./relto-hear"); /* le chapitre 14 : l'encrier qui frémit, la pierre de liaison */
  { /* l'encrier en scarabée : un clic écarte ses ailes (les élytres), l'encre est dessous ; elles se referment quand on se lève */
    const ui0 = (r.deskUI = r.deskUI || { open: false, at: 0, held: false, heldAt: 0, relAt: 0 }), now0 = Date.now(), e0 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const op = ui0.wing ? e0((now0 - ui0.wingAt) / 500) : ui0.wingAt ? 1 - e0((now0 - ui0.wingAt) / 400) : 0;
    HR.scarab(ctx, c, 462, 286, 30, t, { skin: castle ? "castle" : glass ? "glass" : "plain", hum, open: op });
    r.hot.push({ x: 432, y: 250, w: 62, h: 64, tip: TRr(ui0.wing ? "atelier.scarab.close" : "atelier.scarab.tip"), desk: "wings" }); }
  if (HS.stone) { HR.linkStone(ctx, c, 440, 318, 17, t); r.hot.push({ x: 420, y: 304, w: 40, h: 28, tip: TRr("atelier.link.tip"), desk: "link" }); } /* la pierre de liaison, posée la nuit à côté de l'encrier */
  { const SK = (r.opts.stoneState && r.opts.stoneState()) || {}; if (SK.place === "desk") { stone(ctx, c, 530, 326, 8, t); r.hot.push({ x: 516, y: 308, w: 28, h: 30, tip: TRr("atelier.stone.kept") }); } } /* le commandement : la pierre est restée, posée à côté de la pierre de liaison */
  require("./relto-slate").onDesk(r, ctx, c, TRr, t); /* l'ardoise (étape F), devant le livre noir */
  { const SS = (r.opts.sealState && r.opts.sealState()) || {}; /* le cachet (étape D, src/ward.js) : petit, discret, à droite de l'encrier ; un clic le prend */
    if (SS.here && !r.sealHeld) { HR.seal(ctx, c, 497, 314, 16); r.hot.push({ x: 484, y: 300, w: 28, h: 26, tip: TRr("atelier.seal.tip"), desk: "seal" }); } }
  // la corbeille à lettres, à gauche : un panier de laiton ; une enveloppe cachetée dépasse quand du courrier est arrivé
  { const cx = 70, cy = 262, cw = 110, ch = 64; ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.beginPath(); ctx.ellipse(cx + cw / 2, cy + ch + 4, cw / 2 + 6, 8, 0, 0, 6.283); ctx.fill();
    const env = (x, y, a, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = c(col); ctx.fillRect(-30, -18, 60, 36); ctx.strokeStyle = rgba(120, 90, 50, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(0, 4); ctx.lineTo(30, -18); ctx.stroke(); ctx.restore(); };
    if (mail.has) { env(cx + 30, cy + 8, -0.25, "#d6c7a0"); env(cx + 62, cy + 4, 0.18, "#e2d5b0"); }
    if (mail.unread) { const p = 0.5 + 0.5 * Math.sin(t * 2.4); env(cx + 48, cy - 8, 0.06, "#efe3c2"); ctx.fillStyle = c("#8e2b27"); ctx.beginPath(); ctx.arc(cx + 48, cy - 4, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 190, 100, 0.12 + 0.2 * p); ctx.beginPath(); ctx.arc(cx + 48, cy - 4, 46, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = c("#7a5c2a"); ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx + cw, cy + 10); ctx.lineTo(cx + cw - 10, cy + ch); ctx.lineTo(cx + 10, cy + ch); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(cx + k * cw / 6, cy + 10); ctx.lineTo(cx + 10 + k * (cw - 20) / 6, cy + ch); ctx.stroke(); } for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx + 2 + k * 2, cy + 10 + k * 13); ctx.lineTo(cx + cw - 2 - k * 2, cy + 10 + k * 13); ctx.stroke(); }
    ctx.strokeStyle = c("#d8b45e"); ctx.lineWidth = 3; ctx.strokeRect(cx, cy + 8, cw, 4);
    r.hot.push(mail.unread || mail.has ? { x: cx - 4, y: cy - 32, w: cw + 8, h: ch + 40, tip: TRr(mail.unread ? "atelier.tray.new" : "atelier.tray.tip"), special: "mail" } : { x: cx - 4, y: cy - 4, w: cw + 8, h: ch + 12, tip: TRr("atelier.tray.tip"), flash: TRr("atelier.tray.empty") }); }
  const ui = (r.deskUI = r.deskUI || { open: false, at: 0, held: false, heldAt: 0, relAt: 0 }), now = Date.now(), ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const dp = ui.open ? ease((now - ui.at) / 650) : ease(1 - (now - ui.at) / 500); // le tiroir glisse hors du bureau (ou y rentre) ; il se ferme quand on s'en va
  if (dp > 0.001) {
    const yb = 312, dy = yb - 66 * dp; ctx.save(); ctx.beginPath(); ctx.rect(520, 0, 120, yb); ctx.clip(); // il sort de sous le bord du plateau (et reste au-dessus de la barre d'horloge, en plein écran)
    ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(534, dy - 4, 106, 8); ctx.fillStyle = c("#2a1c12"); ctx.fillRect(536, dy, 100, 66); ctx.fillStyle = c("#0f0a07"); ctx.fillRect(542, dy + 4, 88, 36); ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 1.5; ctx.strokeRect(536, dy, 100, 66);
    ctx.fillStyle = c("#4a3322"); ctx.fillRect(536, dy + 44, 100, 22); ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(586, dy + 55, 4, 0, 6.283); ctx.fill();
    const hold = ui.held ? (ui.relAt ? 1 - ease((now - ui.relAt) / 550) : ease((now - ui.heldAt) / 600)) : 0; // la tablette quitte le tiroir pour les mains, puis y revient
    const SK = (r.opts.stoneState && r.opts.stoneState()) || {}, inDrawer = !r.stoneHeld && (SK.place || "drawer") === "drawer"; /* la pierre : dans le tiroir, emportée, partie (l'accord) ou posée sur le bureau (le commandement) */
    if (inDrawer && (!ui.held || hold < 0.999)) stone(ctx, c, 586, dy + 22, 14, t);
    ctx.restore();
    if (inDrawer && ui.open && now - ui.at > 600 && !ui.held) r.hot.push({ x: 548, y: yb - 62, w: 76, h: 42, tip: TRr("atelier.stone.tip"), desk: "hold" });
    if (ui.open && now - ui.at > 400) r.hot.push({ x: 536, y: yb - 22, w: 100, h: 22, tip: TRr("atelier.drawer.close"), desk: "drawer" });
  }
  if (!ui.open || dp < 0.05) { // un clou de laiton qui brille un peu trop : c'est le bouton du tiroir
    const g = 0.35 + 0.35 * Math.sin(t * 1.1); ctx.fillStyle = c("#b98f3c"); ctx.beginPath(); ctx.arc(612, 292, 2.6, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 240, 190, g); ctx.fillRect(611, 290.5, 1.6, 1.6);
    r.hot.push({ x: 600, y: 280, w: 24, h: 24, tip: "", desk: "drawer", secret: true });
  }
  if (r.available && r.available().scope) { const st = (r.opts.scopeState && r.opts.scopeState()) || {}; require("./relto-scope").drawMicroscope(r, ctx, c, castle ? "castle" : glass ? "glass" : "plain", 62, 222, st.flask); } /* le microscope, à gauche de la lampe, et son flacon */
  if (glass && !r.lampOff) require("./relto-glass").lampPool(ctx, 150, 214, 40, fl); // la flaque colorée, sur le plateau ET sur ce qui y est posé
  backButton(r, ctx, TRr("atelier.stand.tip"), "atelier"); // se lever
  if (ui.held) { // la tablette entre les mains : on la regarde de près, un clic la rend au tiroir
    const hp = ui.relAt ? 1 - ease((now - ui.relAt) / 550) : ease((now - ui.heldAt) / 600);
    if (ui.relAt && now - ui.relAt > 560) { ui.held = false; ui.relAt = 0; } else {
      ctx.fillStyle = rgba(0, 0, 0, 0.62 * hp); ctx.fillRect(0, 0, W, H);
      const sx = 586 + (320 - 586) * hp, sy = 290 + (172 - 290) * hp, sz = 14 + 66 * hp; ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.7) * 0.06 * hp); ctx.translate(-sx, -sy); stone(ctx, c, sx, sy, sz, t); ctx.restore();
      if (hp > 0.9) { ctx.font = "italic 15px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(233, 220, 184, 0.85); ctx.fillText(TRr(((r.opts.stoneState && r.opts.stoneState()) || {}).canTake ? "atelier.stone.flash17" : "atelier.stone.flash"), W / 2, 312); ctx.textAlign = "left"; }
      const SK2 = (r.opts.stoneState && r.opts.stoneState()) || {};
      r.hot.push({ x: 0, y: 0, w: W, h: H, tip: "", desk: "release" }); /* d'abord le fond (un clic à côté la rend au tiroir) : la pierre, déclarée après, gagne le clic (la dernière zone l'emporte ; 26 oct. 2026) */
      if (SK2.canTake && hp > 0.9) r.hot.push({ x: sx - sz * 1.6, y: sy - sz * 1.3, w: sz * 3.2, h: sz * 2.2, tip: TRr("atelier.stone.carry"), desk: "carry" }); /* le 17 : on peut l'emporter (un clic sur elle) ; ailleurs, on la rend au tiroir */
    }
  }
  if (ui.link && HS.stone) { /* la pierre de liaison, de près : elle quitte le bureau pour les mains, un clic la repose */
    const lp = ui.linkRel ? 1 - ease((now - ui.linkRel) / 450) : ease((now - ui.link) / 550);
    if (ui.linkRel && now - ui.linkRel > 460) { ui.link = 0; ui.linkRel = 0; } else {
      ctx.fillStyle = rgba(0, 0, 0, 0.62 * lp); ctx.fillRect(0, 0, W, H);
      HR.linkStone(ctx, c, 440 + (320 - 440) * lp, 318 + (168 - 318) * lp, 17 + 79 * lp, t, { sq: 0.55 + 0.25 * lp, rot: 0.08 - 0.04 * lp, thick: 0.28 - 0.1 * lp });
      if (lp > 0.9) { ctx.font = "italic 15px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(233, 220, 184, 0.85); ctx.fillText(TRr("atelier.link.flash"), W / 2, 316); ctx.textAlign = "left"; }
      r.hot.push({ x: 0, y: 0, w: W, h: H, tip: "", desk: "unlink" });
    }
  }
}

/** L'étage : une galerie de livres, et sur la longue table les livres de référence qui ont quitté la table du salon. */
function drawLoft(r, ctx, sc, sky, t) {
  const glass = !!(r.glassOn && r.glassOn()); // la Verrière : un filet de cuivre au bord des rayons et de la table, rien d'autre
  const castle = !!(r.castleOn && r.castleOn()), CS = require("./relto-castle"); // le Château : des rayonnages de noyer en arcs brisés, filets d'or, la table de chêne noir
  const amb = 0.5 + 0.5 * sky.ambient, c = (h) => mix("#05060c", h, amb), TRr = TR(r), fl = flick(t), q = rng(0x10f7);
  ctx.fillStyle = c(castle ? "#2a1a12" : "#3f2f22"); ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 34) { ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.fillRect(x, 0, 1.4, H); }
  for (let row = 0; row < 3; row++) { // les étagères du fond
    const y0 = 18 + row * 62; ctx.fillStyle = c("#1d140e"); ctx.fillRect(0, y0, W, 56); ctx.fillStyle = c(castle ? CS.WALNUT_HI : "#4b3626"); ctx.fillRect(0, y0 + 56, W, 5); if (glass) { ctx.fillStyle = c("#b5652a"); ctx.fillRect(0, y0 + 56, W, 1.6); } if (castle) { ctx.fillStyle = c(CS.GOLD); ctx.fillRect(0, y0 + 56, W, 1); }
    let bx = 6; const g = rng(0x600 + row * 11);
    while (bx < W - 10) { const bw = 6 + Math.floor(g() * 8), bh = 28 + Math.floor(g() * 22), col = ["#27555a", "#5b2b2b", "#3b3560", "#4c5a2c", "#6a4a2a", "#2f3e4f", "#5a3a52"][Math.floor(g() * 7)]; ctx.fillStyle = c(col); ctx.fillRect(bx, y0 + 56 - bh, bw, bh); ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(bx + bw - 2, y0 + 56 - bh, 2, bh); if (g() < 0.45) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx, y0 + 56 - bh + 5, bw, 2); } bx += bw + 1; if (g() < 0.06) bx += 14; }
  }
  if (castle) for (let sx = 0; sx < W; sx += 128) { ctx.fillStyle = c("#140c08"); ctx.fillRect(sx, 0, 8, 214); ctx.fillStyle = c(CS.WALNUT_HI); ctx.fillRect(sx, 0, 1.4, 214); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 1; CS.pointed(ctx, sx + 12, sx + 124, 4, 22, 200); ctx.stroke(); } // des arcs brisés sur les rayonnages
  ctx.fillStyle = rgba(255, 190, 90, 0.05 * fl); ctx.fillRect(0, 0, W, 220);
  const g = ctx.createLinearGradient(0, 214, 0, H); g.addColorStop(0, c(castle ? "#3a2e28" : "#6d4c31")); g.addColorStop(1, c(castle ? "#17110e" : "#35241a")); ctx.fillStyle = g; ctx.fillRect(0, 214, W, H - 214); // la longue table
  if (castle) { ctx.fillStyle = c(CS.GOLD); ctx.fillRect(0, 218, W, 0.8); }
  ctx.fillStyle = c(castle ? "#4a3e36" : glass ? "#b5652a" : "#7d5a3b"); ctx.fillRect(0, 214, W, 4); if (glass) { ctx.fillStyle = c("#e6a06a"); ctx.fillRect(0, 214, W, 1.2); } ctx.strokeStyle = rgba(0, 0, 0, 0.14); ctx.lineWidth = 1; for (let i = 0; i < 9; i++) { const y = 224 + q() * 120; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + q() * 4 - 2); ctx.stroke(); }
  { // les livres de référence, empilés à plat sur la longue table, le titre sur le dos
    const zs = require("./relto-vault").pile(ctx, c, 70, 306, [{ kind: "glyphs", w: 128, h: 17, body: "#27555a", band: "#d8c07a", title: TRr("book.t.glyphs"), tip: "atelier.loft.glyphs" }, { kind: "library", w: 136, h: 19, body: "#5b2b2b", band: "#c9a24e", title: TRr("book.t.library"), tip: "atelier.loft.library" }, { kind: "descbook", w: 118, h: 16, body: "#3d3a2a", band: "#d8c07a", title: "", tip: "atelier.loft.agebook" }, { kind: "rehevkor", w: 132, h: 20, body: "#15131a", band: "#a86a3a", title: TRr("book.t.rehevkor"), tip: "atelier.loft.rehevkor" }], 11); /* le Rehevkor : le livre des lois, cuir noir, un filet d'ocre */
    for (const z of zs) r.hot.push({ x: z.x, y: z.y, w: z.w, h: z.h, tip: TRr(z.b.tip), ...(z.b.kind === "glyphs" ? { go: "glyphbook" } : z.b.kind === "descbook" ? { go: "descbook" } : z.b.kind === "rehevkor" ? { go: "lawbook" } : { special: "library" }) }); }
  { const bx = 262, by = 292; ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 4, by - 2, 170, 20); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx, by - 8, 80, 18); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + 84, by - 8, 80, 18); ctx.fillStyle = rgba(120, 90, 50, 0.6); for (let k = 0; k < 4; k++) { ctx.fillRect(bx + 8, by - 3 + k * 4, 62, 1); ctx.fillRect(bx + 92, by - 3 + k * 4, 62, 1); }
    r.hot.push({ x: bx - 6, y: by - 12, w: 176, h: 34, tip: TRr("atelier.loft.pages"), go: "book" }); }
  if (sc.additions.some((a) => a.type === "imager") && r.opts.notes !== "off") { const nx = 450, ny = 290; ctx.fillStyle = c("#3b2a1a"); ctx.fillRect(nx, ny, 62, 14); ctx.fillStyle = c("#6b4a2a"); ctx.fillRect(nx, ny - 3, 62, 5); ctx.fillStyle = c("#c9a24e"); ctx.fillRect(nx + 3, ny + 2, 5, 9); ctx.fillRect(nx + 54, ny + 2, 5, 9); ctx.fillStyle = c("#8e2b27"); ctx.fillRect(nx + 40, ny + 12, 3, 12); r.hot.push({ x: nx - 3, y: ny - 8, w: 68, h: 36, tip: TRr("atelier.loft.surveyor"), special: "surveyor" }); }
  if (sc.mode !== "story") { // le Traité de l'Art : un gros volume fermé d'un fermoir de laiton, en bac à sable seulement ; le fermoir ne cède qu'au Grand Maître
    const st = (r.opts.statusState && r.opts.statusState()) || { tier: 0 }, open = st.tier >= 4, bx = 548, by = 318, bw = 74, bh = 26;
    ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(bx + 2, by + 1, bw, 3);
    ctx.fillStyle = c("#2a1a30"); ctx.fillRect(bx, by - bh, bw, bh); // la reliure, un cuir sombre
    ctx.fillStyle = c("#e7dcc0"); ctx.fillRect(bx + 3, by - bh + 3, bw - 10, bh - 6); // la tranche des pages
    ctx.fillStyle = rgba(0, 0, 0, 0.18); for (let k = 0; k < 6; k++) ctx.fillRect(bx + 3, by - bh + 5 + k * 3.2, bw - 10, 1);
    ctx.fillStyle = c("#2a1a30"); ctx.fillRect(bx, by - bh, 7, bh); ctx.fillRect(bx + bw - 7, by - bh, 7, bh);
    ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx + 1, by - bh + 5, 5, 1.6); ctx.fillRect(bx + 1, by - 7, 5, 1.6); // les nerfs dorés du dos
    const cx = bx + bw - 4, cy = by - bh / 2; // le fermoir de laiton, sur la tranche
    if (open) { ctx.fillStyle = c("#d8b45e"); ctx.fillRect(cx - 4, cy - 5, 8, 4); ctx.fillRect(cx - 2, cy - 2, 4, 15); ctx.fillStyle = c("#8a6a2a"); ctx.fillRect(cx - 1, by + 1, 2, 2); } // le fermoir ouvert : sa languette pend sur la table
    else { ctx.fillStyle = c("#d8b45e"); ctx.fillRect(cx - 4, cy - 5, 8, 10); ctx.fillStyle = c("#8a6a2a"); ctx.fillRect(cx - 2, cy - 2, 4, 4); }
    if (open) { ctx.fillStyle = rgba(255, 220, 140, 0.08 + 0.06 * fl); ctx.fillRect(bx - 6, by - bh - 6, bw + 12, bh + 10); }
    r.hot.push({ x: bx - 4, y: by - bh - 4, w: bw + 8, h: bh + 8, tip: TRr(open ? "atelier.loft.treatise" : "atelier.loft.treatise.shut"), ...(open ? { special: "treatise" } : { flash: TRr("atelier.loft.treatise.clasp"), clasp: true }) });
  }
  backButton(r, ctx, TRr("atelier.loft.down"), "atelier");
}

/** Découpe un texte en lignes qui tiennent dans `maxW` (la police du contexte). */
function wrapLines(ctx, text, maxW) {
  const out = []; let line = "";
  for (const w of String(text).split(/\s+/)) { const tryL = line ? line + " " + w : w; if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL; }
  if (line) out.push(line); return out;
}
/** La dernière lettre du mentor, dépliée sur le bureau : du parchemin, une écriture penchée, un cachet de cire (son emblème). */
function drawLetter(r, ctx, sc, sky, t) {
  const TRr = TR(r), amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), q = rng(0x1e77), fl = flick(t);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c("#34261b")); g.addColorStop(1, c("#1d140e")); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(0, 0, 0, 0.18); ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const y = 10 + q() * 340; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + q() * 6 - 3); ctx.stroke(); }
  { const lg = ctx.createRadialGradient(320, 180, 20, 320, 180, 300); lg.addColorStop(0, rgba(255, 190, 90, 0.12 * fl)); lg.addColorStop(1, rgba(255, 190, 90, 0)); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); } // la lueur de la lampe
  const x0 = 130, y0 = 8, w = 380, h = 344; ctx.save(); ctx.translate(320, 180); ctx.rotate(-0.012); ctx.translate(-320, -180);
  ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.fillRect(x0 + 6, y0 + 8, w, h); // l'ombre
  const pg = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h); pg.addColorStop(0, c("#eadfb8")); pg.addColorStop(0.5, c("#e2d3a6")); pg.addColorStop(1, c("#d3c18f")); ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(x0, y0 + 3); for (let i = 1; i <= 16; i++) ctx.lineTo(x0 + i * w / 16, y0 + (i % 2 ? 0 : 2.5)); ctx.lineTo(x0 + w, y0 + h - 2); for (let i = 15; i >= 0; i--) ctx.lineTo(x0 + i * w / 16, y0 + h - (i % 2 ? 0 : 2.5)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(120, 90, 50, 0.18); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 + h / 3); ctx.lineTo(x0 + w, y0 + h / 3); ctx.moveTo(x0, y0 + 2 * h / 3); ctx.lineTo(x0 + w, y0 + 2 * h / 3); ctx.stroke(); // les plis
  const vg = ctx.createRadialGradient(x0 + w / 2, y0 + h / 2, 60, x0 + w / 2, y0 + h / 2, 240); vg.addColorStop(0, "rgba(120,80,30,0)"); vg.addColorStop(1, "rgba(120,80,30,0.22)"); ctx.fillStyle = vg; ctx.fillRect(x0, y0, w, h);
  // le texte : une écriture penchée, à l'encre ferro-gallique (un vert sombre, presque noir)
  ctx.fillStyle = c("#2c3d2b"); ctx.font = "italic 16px serif"; let y = y0 + 40; const paras = [TRr("story.letter.hi"), TRr("story.end"), TRr("story.letter.more") + " " + TRr("atelier.clue")];
  for (const p of paras) { for (const ln of wrapLines(ctx, p, w - 76)) { ctx.fillText(ln, x0 + 38, y); y += 20; } y += 8; }
  ctx.textAlign = "right"; ctx.fillText("\u2014 Adrin Vesparath, seltahn", x0 + w - 40, y + 6); ctx.textAlign = "left";
  EMB.drawSeal(ctx, x0 + 80, y0 + h - 40, 31, c, t); // l'emblème de l'auteur, en sceau de cire
  ctx.restore();
  backButton(r, ctx, TRr("atelier.stand.tip"), "cabin");
}

/** La fleur de cristal du mur, en gros plan (un clic sur le cadre ovale de l'atelier). */
function drawFlowerView(r, ctx, sc, sky, t) {
  const TRr = TR(r), amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  FL.drawCloseup(ctx, c, sc, t, W, H);
  r.hot.push({ x: 200, y: 20, w: 240, h: 320, tip: TRr("atelier.flower.tip"), flash: TRr("atelier.flower.flash") });
  backButton(r, ctx, TRr("atelier.flower.back"), "atelier");
}

/**
 * La housse du fauteuil de l'atelier : une étoffe parmi six, tirée chaque jour (date locale et graine du Relto). Tons sourds, ceux
 * de la pièce. `back` le dossier, `seat` l'assise et les accoudoirs, `camo` la couleur que prend Marcel quand il y dort.
 */
const COVERS = [
  { back: "#5b2b2b", seat: "#6d3535", camo: "#622f2f" }, // le cuir bordeaux
  { back: "#2c4a3a", seat: "#365a47", camo: "#305140" }, // le velours vert bouteille
  { back: "#7a5a2c", seat: "#8c6a36", camo: "#836231" }, // l'ocre
  { back: "#273449", seat: "#304058", camo: "#2b3a50" }, // le bleu nuit
  { back: "#55524c", seat: "#65615a", camo: "#5d5953" }, // le tweed gris
  { back: "#4a3326", seat: "#5a3f2f", camo: "#52392a" }, // le cuir tabac
];
function coverOf(r, now = Date.now()) {
  const d = new Date(now), day = d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000), seed = (r.scene && r.scene.seed) || 0;
  return COVERS[Math.floor(rng((fnv("housse|" + day) ^ seed) >>> 0)() * COVERS.length)];
}

/**
 * Le loup blanc (le Château seulement) : roulé devant le feu, comme le chat, mais d'une seule silhouette en courbes (le museau posé
 * sur les pattes, le front, les oreilles, la collerette ébouriffée, le dos voûté, la croupe), peinte de l'intérieur : la selle plus
 * sombre sur l'échine, le masque et la collerette clairs, l'ombre du ventre ; les pattes suggérées dans la silhouette (l'avant-bras
 * couché sous le menton, la patte arrière repliée) ; la queue touffue qui s'enroule autour de la cuisse, le bout sombre. Il dort ; une oreille frémit parfois. Au clic, il dresse les oreilles et ouvre un œil d'ambre qui suit le curseur, puis se
 * rendort. Un vieux compagnon ; on n'en dit pas plus (atelier.wolf.*).
 */
function wolf(r, ctx, c, sky, t, TRr) {
  const X = 540, Y = 280, S = 0.9, up = r.wolfAt ? Math.max(0, 1 - (Date.now() - r.wolfAt) / 2600) : 0, awake = Math.min(1, Math.sin(Math.min(1, up) * Math.PI) * 2.5), br = 1 + 0.03 * Math.sin(t * 1.4);
  const tw = (((t * 0.13 + (r.scene.seed % 7) / 7) % 1) > 0.97 ? Math.sin(t * 40) * 1.2 : 0), perk = awake * 2.5;
  const F1 = c("#eeecf2"), F2 = c("#cdcad3"), F3 = c("#94909e"), F4 = c("#5e5a68"), K = c("#14111a"), EDGE = rgba(36, 32, 44, 0.5);
  const tri = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
  const body = () => { /* la silhouette, du bout du nez au bout de la croupe, et retour par le sol et les pattes */
    ctx.beginPath(); ctx.moveTo(-64, -8);
    ctx.bezierCurveTo(-58, -11, -50, -13, -45, -14); /* le chanfrein */
    ctx.bezierCurveTo(-42, -16, -40, -20, -36, -22); /* le front */
    ctx.bezierCurveTo(-32, -24, -26, -25, -23, -24); /* le crâne */
    ctx.lineTo(-19, -27); ctx.lineTo(-17, -24); ctx.lineTo(-12, -29); ctx.lineTo(-10, -26); /* la collerette ébouriffée sur la nuque */
    ctx.bezierCurveTo(-4, -33, 10, -36, 22, -33); /* le dos voûté */
    ctx.bezierCurveTo(36, -30, 50, -22, 50, -11); /* la croupe */
    ctx.bezierCurveTo(50, -4, 46, 0, 40, 0);
    ctx.lineTo(-52, 0); ctx.bezierCurveTo(-58, 0, -62, -1, -62, -3); ctx.bezierCurveTo(-62, -5, -60, -5.5, -58, -5.5); /* le bout des pattes avant */
    ctx.lineTo(-61, -5.8); ctx.bezierCurveTo(-63.5, -6.2, -64.6, -7, -64, -8); ctx.closePath(); };
  ctx.save(); ctx.translate(X, Y); ctx.scale(S, S);
  ctx.fillStyle = rgba(0, 0, 0, 0.32); ctx.beginPath(); ctx.ellipse(-6, 1, 60, 5, 0, 0, 6.283); ctx.fill(); /* l'ombre sur le sol */
  ctx.save(); ctx.scale(1, br);
  tri([[-38, -20], [-37.5, -30 - perk], [-33, -22]], F3); /* l'oreille lointaine, derrière le front */
  body(); ctx.fillStyle = F2; ctx.fill();
  ctx.save(); body(); ctx.clip();
  { const g = ctx.createLinearGradient(-40, 0, -10, 0); g.addColorStop(0, rgba(94, 90, 104, 0)); g.addColorStop(1, rgba(94, 90, 104, 0.5)); ctx.fillStyle = g; } ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(60, -40); ctx.lineTo(60, -12); ctx.bezierCurveTo(46, -18, 30, -26, 8, -26); ctx.bezierCurveTo(-10, -26, -26, -22, -40, -18); ctx.closePath(); ctx.fill(); /* la selle, sombre sur l'échine, qui s'éteint en douceur sur la nuque et le crâne */
  { const g = ctx.createLinearGradient(-24, 0, 0, 0); g.addColorStop(0, F1); g.addColorStop(1, rgba(238, 236, 242, 0)); ctx.fillStyle = g; } ctx.beginPath(); ctx.moveTo(-66, -9); ctx.bezierCurveTo(-56, -12, -46, -12, -40, -10); ctx.bezierCurveTo(-34, -8, -30, -14, -26, -20); ctx.lineTo(-22, -16); ctx.lineTo(-18, -20); ctx.lineTo(-16, -13); ctx.lineTo(-11, -15); ctx.lineTo(-12, -8); ctx.lineTo(-6, -8); ctx.bezierCurveTo(-3, -6, -1, -2, 2, 2); ctx.lineTo(-66, 2); ctx.closePath(); ctx.fill(); /* le masque, la gorge et la collerette, clairs, qui se fondent dans le flanc (pas de bord net) */
  { const g = ctx.createLinearGradient(0, -12, 0, 0); g.addColorStop(0, rgba(94, 90, 104, 0)); g.addColorStop(1, rgba(94, 90, 104, 0.55)); ctx.fillStyle = g; ctx.fillRect(-66, -12, 118, 12); } /* l'ombre du ventre, sur toute la longueur */
  ctx.strokeStyle = rgba(94, 90, 104, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(32, -12, 13, 2.1, 4.5); ctx.stroke(); /* le galbe de la cuisse */
  ctx.strokeStyle = rgba(94, 90, 104, 0.45); ctx.lineWidth = 0.8; for (const [x, y] of [[0, -28], [8, -30], [16, -29], [26, -27], [36, -23]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 2.5); ctx.stroke(); } /* quelques mèches sur le dos */
  ctx.restore();
  body(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.8; ctx.stroke();
  /* les pattes, suggérées dans la silhouette (rien ne dépasse) : devant, l'avant-bras couché sous le menton, le coude replié en arrière ;
     derrière, le jarret replié et la patte arrière qui pointe devant le bout de la queue ; les doigts et les griffes */
  const SH = (al) => rgba(94, 90, 104, al);
  ctx.save(); body(); ctx.clip();
  { const g = ctx.createLinearGradient(0, -8.4, 0, -4.6); g.addColorStop(0, SH(0)); g.addColorStop(0.55, SH(0.3)); g.addColorStop(1, SH(0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-61, -8); ctx.bezierCurveTo(-52, -7.6, -42, -7.4, -32, -8.6); ctx.bezierCurveTo(-30, -6, -30, -3, -31, 0); ctx.lineTo(-33, 0); ctx.bezierCurveTo(-34, -3, -36, -4.8, -40, -5); ctx.lineTo(-61, -4.6); ctx.closePath(); ctx.fill(); } /* le dessus de l'avant-bras, sous le menton ; le coude */
  { const g = ctx.createLinearGradient(0, -5, 0, 0); g.addColorStop(0, F1 + "73"); g.addColorStop(1, F1 + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-62, -5.2); ctx.bezierCurveTo(-52, -5.4, -42, -5.2, -36, -4.6); ctx.bezierCurveTo(-33, -3.4, -32.6, -1.4, -33, 0); ctx.lineTo(-62, 0); ctx.closePath(); ctx.fill(); } /* l'avant-bras, clair, couché au sol */
  { const g = ctx.createLinearGradient(0, -6.6, 0, -1); g.addColorStop(0, SH(0)); g.addColorStop(0.5, SH(0.4)); g.addColorStop(1, SH(0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(18, -9); ctx.bezierCurveTo(14, -6.6, 8, -5.4, 2, -5.6); ctx.bezierCurveTo(0, -4.4, 0, -2, 1, 0); ctx.lineTo(3, 0); ctx.bezierCurveTo(4, -2, 8, -3.4, 18, -4); ctx.closePath(); ctx.fill(); } /* le jarret replié */
  { ctx.fillStyle = F1 + "cc"; ctx.beginPath(); ctx.moveTo(14, -3.8); ctx.bezierCurveTo(8, -3.6, 4, -4.2, 2, -3.2); ctx.bezierCurveTo(0.6, -2.2, 1, -0.2, 2.6, 0); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill(); } /* la patte arrière */
  ctx.restore();
  ctx.strokeStyle = SH(0.75); ctx.lineWidth = 0.55; for (const [x, y0, y1] of [[-60.2, -0.2, -3.8], [-58.4, -0.2, -4], [3.6, -0.2, -2.8], [5.2, -0.2, -3]]) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x - 0.2, (y0 + y1) / 2, x + 0.5, y1); ctx.stroke(); } /* les doigts */
  ctx.fillStyle = F4; for (const x of [-61.6, -59.6, -57.8, 1.8, 3.6, 5.4]) { ctx.beginPath(); ctx.ellipse(x, -0.35, 0.55, 0.38, 0, 0, 6.283); ctx.fill(); } /* les griffes */
  /* la queue, touffue, qui naît de la croupe et s'enroule autour de la cuisse jusqu'au genou ; le bout sombre */
  const TP = [[47, -10], [55, 0.5], [32, 1], [12, -2.2]], TN = 30, at = (u) => { const m = 1 - u, a = m * m * m, b = 3 * m * m * u, d = 3 * m * u * u, e = u * u * u; return [a * TP[0][0] + b * TP[1][0] + d * TP[2][0] + e * TP[3][0], a * TP[0][1] + b * TP[1][1] + d * TP[2][1] + e * TP[3][1]]; };
  const tup = [], tdn = [];
  for (let i = 0; i <= TN; i++) { const u = i / TN, [x, y] = at(u), [x2, y2] = at(Math.min(1, u + 0.01)), [x0, y0] = at(Math.max(0, u - 0.01)), L = Math.hypot(x2 - x0, y2 - y0) || 1, nx = -(y2 - y0) / L, ny = (x2 - x0) / L;
    const w = 1.4 + 4.4 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.06)), 0.6), j = i > 2 && i < TN - 1 ? [1.1, 0.98, 1.03, 0.96, 1.08][i % 5] : 1; /* plus épaisse au milieu, une bordure ébouriffée */
    tup.push([x + nx * w * j, y + ny * w * j]); tdn.push([x - nx * w * 0.75, y - ny * w * 0.75]); }
  const tail = () => { ctx.beginPath(); tup.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); const [tx, ty] = at(1); ctx.quadraticCurveTo(tx - 3.5, ty + 0.4, tdn[TN][0], tdn[TN][1]); for (let i = TN; i >= 0; i--) ctx.lineTo(tdn[i][0], tdn[i][1]); ctx.closePath(); };
  tail(); ctx.fillStyle = F1; ctx.fill();
  ctx.save(); tail(); ctx.clip();
  { const [tx] = at(1), g = ctx.createLinearGradient(tx - 2, 0, tx + 13, 0); g.addColorStop(0, F4); g.addColorStop(0.45, SH(0.55)); g.addColorStop(1, SH(0)); ctx.fillStyle = g; ctx.fillRect(tx - 6, -20, 22, 26); } /* le bout sombre */
  { const g = ctx.createLinearGradient(0, -6, 0, 2); g.addColorStop(0, SH(0)); g.addColorStop(1, SH(0.35)); ctx.fillStyle = g; ctx.fillRect(-20, -20, 90, 24); } /* le dessous, dans l'ombre */
  ctx.strokeStyle = F2; ctx.lineWidth = 0.6; for (let i = 5; i < TN - 3; i += 5) { const [x, y] = at(i / TN); ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x - 3.5, y + 0.8); ctx.stroke(); } ctx.restore(); /* des mèches */
  tail(); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.7; ctx.stroke();
  /* l'oreille proche, qui frémit (et se dresse au clic) */
  tri([[-33, -22.5], [-31.5 + tw, -33 - perk], [-27, -24.3]], F2); tri([[-32, -23], [-31.2 + tw, -30 - perk], [-28.6, -24]], F4);
  ctx.strokeStyle = EDGE; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-33, -22.5); ctx.lineTo(-31.5 + tw, -33 - perk); ctx.lineTo(-27, -24.3); ctx.stroke();
  /* la truffe, la gueule close, l'œil */
  ctx.fillStyle = K; ctx.beginPath(); ctx.ellipse(-63.4, -8.6, 1.9, 1.5, -0.2, 0, 6.283); ctx.fill();
  ctx.strokeStyle = F4; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-62, -6.4); ctx.quadraticCurveTo(-56, -6.6, -50, -8); ctx.stroke();
  { const ex = -42, ey = -15.2;
    if (awake > 0.05) { const [px, py] = r.pointer || [X - 160, Y - 40], ang = Math.atan2(py - (Y + ey * S), px - (X + ex * S)), o = awake;
      ctx.fillStyle = F4; ctx.beginPath(); ctx.moveTo(ex - 3.6, ey + 0.6); ctx.quadraticCurveTo(ex, ey - 2.8 * o, ex + 3.2, ey - 0.6); ctx.quadraticCurveTo(ex, ey + 1.6, ex - 3.6, ey + 0.6); ctx.fill();
      ctx.fillStyle = c("#d8a844"); ctx.beginPath(); ctx.moveTo(ex - 3, ey + 0.5); ctx.quadraticCurveTo(ex, ey - 2.1 * o, ex + 2.6, ey - 0.5); ctx.quadraticCurveTo(ex, ey + 1.2, ex - 3, ey + 0.5); ctx.fill();
      ctx.fillStyle = "#120e14"; ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * 0.9, ey - 0.1 + Math.sin(ang) * 0.4 * o, 0.8, 0, 6.283); ctx.fill(); }
    else { ctx.strokeStyle = F4; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ex - 3.2, ey - 0.2); ctx.quadraticCurveTo(ex, ey + 1.6, ex + 3, ey - 0.8); ctx.stroke(); } } /* endormi : l'œil clos, un petit arc */
  ctx.restore();
  ctx.restore();
  r.hot.push({ x: X - 60, y: Y - 34, w: 108, h: 36, tip: TRr("atelier.wolf.tip"), flash: TRr("atelier.wolf.flash"), wolf: true, extra: true });
}

module.exports = { COVERS, coverOf, drawFlowerView, drawAtelier, drawDesk, drawLoft, drawLetter, drawBookcase, backButton, SECRET, CASE, COMBO };
