"use strict";
/**
 * Le couloir de la maison (claude/DESIGN-reve-et-caverne-bahro.md, section 11) : une troisième vue, en perspective, où l'on
 * recule depuis la grande pièce ou le salon (le bas de la vue). Il relie les pièces sans en charger aucune : au départ une seule
 * porte, au fond, celle de la forge (murée en arche tant que l'appentis n'est pas bâti ; une lueur dessous quand ça cuit). À
 * gauche une fenêtre étroite sur l'île, des patères, des bottes ; une lanterne au plafond ; à droite un miroir et un banc. Les
 * habits l'habillent (planches ; mosaïque et cuivre ; pierre et ogive) sans déplacer aucune zone cliquable. Tout est dessiné ici.
 */
const { rng, clamp, mix, rgba } = require("./util");
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const W = 640, H = 360, TAU = Math.PI * 2;
/** Le mur du fond (la porte de la forge y est percée), et le point de fuite. */
const FX0 = 262, FX1 = 378, FY0 = 92, FY1 = 246, VX = (FX0 + FX1) / 2;
const DOOR = { x: 292, w: 56, top: 128, bottom: FY1 };
/** La profondeur k (0 : au ras de l'écran, 1 : le mur du fond) devient une part du chemin vers le fond, comme en perspective. */
const f = (k) => (1 - 1 / (1 + 3 * k)) / 0.75;
const L = (k, v) => { const e = f(k), top = FY0 * e, bot = H - (H - FY1) * e; return [FX0 * e, top + (bot - top) * v]; };
const Rr = (k, v) => { const e = f(k), top = FY0 * e, bot = H - (H - FY1) * e; return [W - (W - FX1) * e, top + (bot - top) * v]; };
/** Un point (u, v) dans un quadrilatère [a, b, c, d] (a en haut à gauche, puis dans le sens des aiguilles). */
const onQuad = ([a, b, c, d], u, v) => { const top = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], bot = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u]; return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]; };
const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
const bbox = (pts, pad = 2) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x = Math.min(...xs) - pad, y = Math.min(...ys) - pad; return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad }; };

/** Le bas de la vue : une bande où l'on recule (vers le couloir, ou du couloir vers la pièce), un chevron pâle qui s'éclaire au survol. Partagé avec la grande pièce et le salon. */
function backEdge(r, ctx, go, tip) {
  const hov = r.hover && r.hover.go === go && r.hover.edge === "⌄";
  ctx.fillStyle = rgba(230, 215, 180, hov ? 0.85 : 0.34); ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.fillText("⌄", W / 2, H - 22); ctx.textAlign = "left";
  r.hot.push({ x: W / 2 - 110, y: H - 62, w: 220, h: 130, tip, go, edge: "⌄" }); /* la zone dépasse du bas de l'image : un curseur qui vise la flèche l'atteint même si l'affichage décale un peu */ /* une bande large et haute : le bas de l'image peut être couvert par la barre du Relto (plein écran, téléphone) */
}

function drawHall(r, ctx, sc, sky, t) {
  const tr = TR(r), glass = !!(r.glassOn && r.glassOn()), castle = !!(r.castleOn && r.castleOn());
  const night = clamp(sky.night == null ? 0.3 : sky.night), amb = 0.5 + 0.5 * clamp(sky.ambient == null ? 0.7 : sky.ambient), c = (h) => mix("#05060c", h, amb);
  const fl = 0.85 + 0.15 * Math.sin(t * 6.3) * Math.sin(t * 2.9);
  const ovenOn = !!(r.available && r.available().oven), st = ovenOn && r.opts && r.opts.ovenState ? r.opts.ovenState(r.nowOverride != null ? r.nowOverride : Date.now()) || {} : {};
  const cooking = !!(st.phase && st.phase.phase === "cooking");
  const pal = castle ? { wall: "#4a4552", wall2: "#3a3644", trim: "#2a2630", ceil: "#1e1b22", floor: "#3a3540", far: "#524c5a" }
    : glass ? { wall: "#1c3a34", wall2: "#122824", trim: "#b5652a", ceil: "#1a120c", floor: "#14201e", far: "#21443d" }
      : { wall: "#5a4a34", wall2: "#43372a", trim: "#2e2418", ceil: "#2a2016", floor: "#4a3a26", far: "#625238" };
  // ---- le plafond, le sol, les deux murs, le fond ----
  ctx.fillStyle = c(pal.ceil); poly(ctx, [[0, 0], [W, 0], [FX1, FY0], [FX0, FY0]]); ctx.fill();
  ctx.fillStyle = c(pal.floor); poly(ctx, [[0, H], [W, H], [FX1, FY1], [FX0, FY1]]); ctx.fill();
  for (const side of [0, 1]) {
    const P = side ? Rr : L, g = ctx.createLinearGradient(side ? W : 0, 0, side ? FX1 : FX0, 0); g.addColorStop(0, c(pal.wall)); g.addColorStop(1, c(mix(pal.wall, "#000000", 0.35)));
    ctx.fillStyle = g; poly(ctx, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]); ctx.fill();
    ctx.fillStyle = c(pal.wall2); poly(ctx, [P(0, 0.62), P(1, 0.62), P(1, 1), P(0, 1)]); ctx.fill(); /* le soubassement, plus sombre */
  }
  const fg = ctx.createLinearGradient(0, FY0, 0, FY1); fg.addColorStop(0, c(pal.far)); fg.addColorStop(1, c(mix(pal.far, "#000000", 0.25))); ctx.fillStyle = fg; ctx.fillRect(FX0, FY0, FX1 - FX0, FY1 - FY0);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1;
  if (castle) { /* la pierre : des assises qui filent vers le fond, des joints décalés ; un tapis rouge au sol ; des arcs-doubleaux au plafond */
    for (const side of [0, 1]) { const P = side ? Rr : L; for (let v = 0.08; v < 1; v += 0.09) { ctx.beginPath(); ctx.moveTo(...P(0, v)); ctx.lineTo(...P(1, v)); ctx.stroke(); }
      for (let i = 0; i < 16; i++) { const k = i / 16, v = 0.08 + ((i % 2) * 0.09); for (let vv = v; vv < 0.98; vv += 0.18) { ctx.beginPath(); ctx.moveTo(...P(k, vv)); ctx.lineTo(...P(k, vv + 0.09)); ctx.stroke(); } } }
    for (let y = FY0 + 12; y < FY1; y += 13) { ctx.beginPath(); ctx.moveTo(FX0, y); ctx.lineTo(FX1, y); ctx.stroke(); }
    ctx.fillStyle = c("#6a1e22"); poly(ctx, [[W / 2 - 120, H], [W / 2 + 120, H], [VX + 22, FY1], [VX - 22, FY1]]); ctx.fill(); ctx.strokeStyle = c("#b08a3a"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2 - 108, H); ctx.lineTo(VX - 19, FY1); ctx.moveTo(W / 2 + 108, H); ctx.lineTo(VX + 19, FY1); ctx.stroke();
    ctx.strokeStyle = c("#2a2630"); ctx.lineWidth = 3; for (const k of [0.15, 0.45, 0.8]) { const [x0, y0] = L(k, 0), [x1] = Rr(k, 0); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 30 * (1 - f(k)) - 4, x1, y0); ctx.stroke(); }
  } else if (glass) { /* la mosaïque sombre : des pilastres de cuivre, une cimaise de cuivre ; au sol, un damier de tesselles */
    ctx.fillStyle = rgba(90, 160, 140, 0.06); for (const side of [0, 1]) { const P = side ? Rr : L; for (let i = 0; i < 14; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) { ctx.beginPath(); poly(ctx, [P(i / 14, j / 11), P((i + 1) / 14, j / 11), P((i + 1) / 14, (j + 1) / 11), P(i / 14, (j + 1) / 11)]); ctx.fill(); } }
    ctx.strokeStyle = c(pal.trim); ctx.lineWidth = 2.5; for (const side of [0, 1]) { const P = side ? Rr : L; for (const k of side ? [0.12, 0.53, 0.8] : [0.12, 0.47, 0.76]) { /* ils encadrent le miroir et la fenêtre, jamais ne les traversent */ ctx.lineWidth = 3.5 * (1 - f(k)) + 1; ctx.beginPath(); ctx.moveTo(...P(k, 0)); ctx.lineTo(...P(k, 1)); ctx.stroke(); } ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...P(0, 0.62)); ctx.lineTo(...P(1, 0.62)); ctx.stroke(); }
    ctx.strokeStyle = rgba(90, 160, 140, 0.12); ctx.lineWidth = 1; for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 56, H); ctx.lineTo(VX + i * 9.6, FY1); ctx.stroke(); } for (let k = 0.05; k < 1; k += 0.08) { const [x0, y] = L(k, 1), [x1] = Rr(k, 1); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.fillStyle = c(pal.trim); ctx.fillRect(FX0, FY0, FX1 - FX0, 2); ctx.fillRect(FX0, FY0 + (FY1 - FY0) * 0.62, FX1 - FX0, 1.5);
  } else { /* les planches : des lames verticales aux murs, une cimaise ; au sol des lames qui filent vers le fond ; des poutres au plafond */
    for (const side of [0, 1]) { const P = side ? Rr : L; for (let i = 1; i < 22; i++) { const k = i / 22; ctx.beginPath(); ctx.moveTo(...P(k, 0)); ctx.lineTo(...P(k, 1)); ctx.stroke(); }
      ctx.strokeStyle = c(pal.trim); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...P(0, 0.62)); ctx.lineTo(...P(1, 0.62)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...P(0, 0.96)); ctx.lineTo(...P(1, 0.96)); ctx.stroke(); ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; }
    for (let x = FX0 + 12; x < FX1; x += 12) { ctx.beginPath(); ctx.moveTo(x, FY0); ctx.lineTo(x, FY1); ctx.stroke(); }
    for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 48, H); ctx.lineTo(VX + i * 8.3, FY1); ctx.stroke(); }
    const q = rng(0x4a11); for (let k = 0.04; k < 1; k += 0.07) { const [x0, y] = L(k, 1), [x1] = Rr(k, 1), jx = x0 + (x1 - x0) * (0.2 + q() * 0.6); ctx.beginPath(); ctx.moveTo(jx - 30 * (1 - f(k)), y); ctx.lineTo(jx + 30 * (1 - f(k)), y); ctx.stroke(); }
    ctx.fillStyle = c("#1e160e"); for (const k of [0.1, 0.4, 0.75]) { const [x0, y0] = L(k, 0), [x1] = Rr(k, 0), hgt = 14 * (1 - f(k)) + 3; ctx.fillRect(x0, y0, x1 - x0, hgt); }
  }
  // ---- au fond : la porte de la forge, ou l'arche murée ----
  const { x: dx, w: dw, top: dt, bottom: db } = DOOR, dr = dw / 2;
  const doorPath = (pad = 0) => { ctx.beginPath(); ctx.moveTo(dx - pad, db); if (castle) { ctx.lineTo(dx - pad, dt + dr); ctx.quadraticCurveTo(dx - pad, dt - pad + 4, dx + dr, dt - pad - 10); ctx.quadraticCurveTo(dx + dw + pad, dt - pad + 4, dx + dw + pad, dt + dr); } else { ctx.lineTo(dx - pad, dt + dr); ctx.arc(dx + dr, dt + dr, dr + pad, Math.PI, 0); } ctx.lineTo(dx + dw + pad, db); ctx.closePath(); };
  ctx.fillStyle = c(castle ? "#2a2630" : glass ? "#3a1e0c" : "#2a1e14"); doorPath(5); ctx.fill(); /* l'embrasure */
  if (!ovenOn) { /* murée : des briques (des moellons au Château) dans l'arche, des claveaux autour ; elle attend quelque chose */
    ctx.save(); doorPath(); ctx.clip(); ctx.fillStyle = c(castle ? "#5a5462" : "#6a5040"); ctx.fillRect(dx, dt - 14, dw, db - dt + 14);
    const q = rng(0xb41c), bh = castle ? 11 : 7; for (let y = dt - 14; y < db; y += bh) { const off = ((y - dt) / bh) % 2 ? (castle ? 10 : 6) : 0; for (let x = dx - 12 + off; x < dx + dw; x += castle ? 20 : 12) { ctx.fillStyle = c(mix(castle ? "#5a5462" : "#7a5a44", "#000000", q() * 0.25)); ctx.fillRect(x + 1, y + 1, (castle ? 20 : 12) - 2, bh - 2); } }
    ctx.restore(); ctx.strokeStyle = c(castle ? "#6a6474" : "#8a7058"); ctx.lineWidth = 3; doorPath(2); ctx.stroke();
  } else {
    ctx.save(); doorPath(); ctx.clip();
    if (glass) { /* une porte vitrée : un cadre de cuivre, un verre dépoli en haut où l'on voit le feu quand ça cuit, un panneau de bois en bas */
      ctx.fillStyle = c("#3a2418"); ctx.fillRect(dx, dt - 14, dw, db - dt + 14);
      const pg = ctx.createLinearGradient(0, dt, 0, dt + 70); pg.addColorStop(0, cooking ? rgba(255, 170, 80, 0.85 * fl) : c("#4a7a70")); pg.addColorStop(1, cooking ? rgba(220, 110, 40, 0.75 * fl) : c("#2a4a44")); ctx.fillStyle = pg; ctx.fillRect(dx + 6, dt - 10, dw - 12, 74);
      ctx.fillStyle = rgba(255, 255, 255, 0.12); for (let i = 0; i < 30; i++) ctx.fillRect(dx + 7 + ((i * 37) % (dw - 14)), dt - 6 + ((i * 53) % 66), 1.2, 1.2); /* le grain du dépoli */
      ctx.strokeStyle = c("#b5652a"); ctx.lineWidth = 2; ctx.strokeRect(dx + 6, dt - 10, dw - 12, 74); ctx.beginPath(); ctx.moveTo(dx + dr, dt - 10); ctx.lineTo(dx + dr, dt + 64); ctx.stroke();
      ctx.strokeStyle = c("#2a1810"); ctx.lineWidth = 1; ctx.strokeRect(dx + 8, dt + 72, dw - 16, db - dt - 80);
    } else { /* des planches (du chêne ferré au Château), deux pentures, un anneau */
      ctx.fillStyle = c(castle ? "#3a2a1e" : "#5a3e26"); ctx.fillRect(dx, dt - 14, dw, db - dt + 14);
      ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dw / 5, dt - 14); ctx.lineTo(dx + i * dw / 5, db); ctx.stroke(); }
      ctx.fillStyle = c("#22201e"); for (const y of [dt + dr + 4, db - 22]) { ctx.fillRect(dx + 2, y, dw - 4, 4); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(dx + 6 + i * (dw - 12) / 4, y + 2, 1, 0, TAU); ctx.fill(); } }
      if (castle) { ctx.fillStyle = c("#1a1816"); ctx.fillRect(dx + dr - 6, dt + 8, 12, 9); ctx.fillStyle = cooking ? rgba(255, 160, 70, 0.8 * fl) : c("#0a0908"); ctx.fillRect(dx + dr - 4.5, dt + 9.5, 9, 6); ctx.strokeStyle = c("#3a3634"); ctx.lineWidth = 1; for (const x of [dx + dr - 1.5, dx + dr + 1.5]) { ctx.beginPath(); ctx.moveTo(x, dt + 9); ctx.lineTo(x, dt + 16); ctx.stroke(); } } /* le judas */
      ctx.strokeStyle = c("#22201e"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(dx + dw - 10, dt + (db - dt) * 0.55, 3.2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = c(castle ? "#6a6474" : glass ? "#b5652a" : "#3a2a1c"); ctx.lineWidth = 2.5; doorPath(1); ctx.stroke();
    if (cooking) { /* la lueur sous la porte, sur son chant, et sur le sol du couloir */
      const g = ctx.createLinearGradient(0, db, 0, db + 9); g.addColorStop(0, rgba(255, 150, 60, 0.85 * fl)); g.addColorStop(1, rgba(255, 120, 40, 0)); ctx.fillStyle = g; ctx.fillRect(dx - 3, db, dw + 6, 9);
      ctx.fillStyle = rgba(255, 190, 110, 0.5 * fl); ctx.fillRect(dx + dw - 1, dt + dr, 1.6, db - dt - dr);
      const g2 = ctx.createRadialGradient(dx + dr, db, 2, dx + dr, db, 160); g2.addColorStop(0, rgba(255, 140, 50, (0.12 + 0.28 * night) * fl)); g2.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g2; ctx.fillRect(dx - 160, db - 90, dw + 320, 220);
    }
  }
  const dz = { x: dx - 6, y: dt - 16, w: dw + 12, h: db - dt + 20 };
  r.hot.push({ ...dz, tip: !ovenOn ? tr("hall.door.bricked") : cooking ? tr("hall.door.cooking") : tr("hall.door"), ...(ovenOn ? { go: "oven" } : {}) });
  // ---- à gauche : la fenêtre étroite sur l'île ----
  const win = [L(0.2, 0.16), L(0.42, 0.2), L(0.42, 0.56), L(0.2, 0.56)];
  const skyTop = mix("#7fb0d8", "#0b1430", night), skyBot = mix("#cfe4f2", "#1a2a50", night), sg = ctx.createLinearGradient(0, win[0][1], 0, win[3][1]); sg.addColorStop(0, mix("#05060c", skyTop, 0.4 + 0.6 * amb)); sg.addColorStop(1, mix("#05060c", skyBot, 0.4 + 0.6 * amb));
  ctx.fillStyle = sg; poly(ctx, win); ctx.fill();
  if (night > 0.4) { ctx.fillStyle = rgba(255, 255, 255, 0.7 * night); for (const [u, v] of [[0.3, 0.2], [0.7, 0.35], [0.45, 0.6], [0.8, 0.15], [0.2, 0.75]]) { const [x, y] = onQuad(win, u, v); ctx.fillRect(x, y, 1.2, 1.2); } }
  else { ctx.fillStyle = rgba(255, 255, 255, 0.5 * (1 - night)); const [cx, cy] = onQuad(win, 0.4, 0.78); ctx.beginPath(); ctx.ellipse(cx, cy, 10, 3, -0.2, 0, TAU); ctx.fill(); } /* un nuage */
  ctx.strokeStyle = c(castle ? "#2a2630" : glass ? "#b5652a" : "#2e2418"); ctx.lineWidth = 4; poly(ctx, win); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...onQuad(win, 0.5, 0)); ctx.lineTo(...onQuad(win, 0.5, 1)); ctx.moveTo(...onQuad(win, 0, 0.45)); ctx.lineTo(...onQuad(win, 1, 0.45)); ctx.stroke();
  if (glass) { ctx.fillStyle = rgba(220, 140, 70, 0.35); for (const [u, v] of [[0.08, 0.06], [0.92, 0.06], [0.08, 0.94], [0.92, 0.94]]) { const [x, y] = onQuad(win, u, v); ctx.fillRect(x - 2, y - 2, 4, 4); } }
  if (castle) { ctx.strokeStyle = c("#1a1816"); ctx.lineWidth = 1.2; for (const u of [0.25, 0.75]) { ctx.beginPath(); ctx.moveTo(...onQuad(win, u, 0)); ctx.lineTo(...onQuad(win, u, 1)); ctx.stroke(); } }
  { const sill = [L(0.2, 0.56), L(0.42, 0.56)]; ctx.strokeStyle = c(mix(pal.trim, "#ffffff", 0.15)); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...sill[0]); ctx.lineTo(...sill[1]); ctx.stroke(); }
  if (night < 0.5) { ctx.fillStyle = rgba(255, 240, 200, 0.08 * (1 - night) * amb); const [a] = [L(0.22, 1)], [b] = [L(0.44, 1)]; poly(ctx, [a, b, [b[0] + 120, b[1] + 6], [a[0] + 150, a[1] + 10]]); ctx.fill(); } /* le jour sur le plancher */
  r.hot.push({ ...bbox(win), tip: tr("hall.window") });
  // ---- à gauche, plus loin : les patères, le manteau, l'écharpe ; les bottes au pied du mur ----
  const [p0x, p0y] = L(0.55, 0.3), [p1x, p1y] = L(0.68, 0.32);
  ctx.strokeStyle = c(castle ? "#2a1e14" : glass ? "#b5652a" : "#2a1e14"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); ctx.stroke();
  ctx.fillStyle = c(castle ? "#b08a3a" : glass ? "#e6a06a" : "#1e1814"); for (const u of [0.15, 0.5, 0.85]) { ctx.beginPath(); ctx.arc(p0x + (p1x - p0x) * u, p0y + (p1y - p0y) * u + 3, 1.6, 0, TAU); ctx.fill(); }
  { const cx = p0x + (p1x - p0x) * 0.25, cy = p0y + 4, coat = castle ? "#2a1a2e" : glass ? "#3a4a3a" : "#4a3a30"; ctx.fillStyle = c(coat); ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx + 9, cy + 54); ctx.lineTo(cx - 8, cy + 56); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx + 1, cy + 54); ctx.stroke(); }
  { const cx = p0x + (p1x - p0x) * 0.82, cy = p0y + (p1y - p0y) * 0.82 + 4; ctx.strokeStyle = c(castle ? "#7a1e22" : glass ? "#c87a3a" : "#8a3a2a"); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 1, cy + 30); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 4, cy + 24); ctx.stroke(); } /* l'écharpe */
  { const [bx, by] = L(0.5, 1); ctx.fillStyle = c("#1e140c"); for (const o of [10, 21]) { ctx.fillRect(bx + o, by - 22, 8, 20); ctx.beginPath(); ctx.ellipse(bx + o + 7, by - 2, 8, 3, 0, 0, TAU); ctx.fill(); } }
  r.hot.push({ x: p0x - 8, y: p0y - 6, w: p1x - p0x + 16, h: 66, tip: tr("hall.coats") });
  // ---- la lanterne, au plafond ----
  { const lx = VX, [, cy] = L(0.4, 0), ly = cy + 26; ctx.strokeStyle = c("#1a1410"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx, cy); ctx.lineTo(lx, ly - 8); ctx.stroke();
    const metal = castle ? "#1a1816" : glass ? "#b5652a" : "#2a2420", lit = 0.35 + 0.65 * night;
    if (glass) { ctx.fillStyle = c(metal); ctx.beginPath(); ctx.moveTo(lx - 10, ly); ctx.quadraticCurveTo(lx, ly - 14, lx + 10, ly); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 200, 120, 0.4 + 0.5 * lit * fl); ctx.beginPath(); ctx.ellipse(lx, ly + 6, 7, 7, 0, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = c(metal); ctx.fillRect(lx - 7, ly - 8, 14, 4); ctx.fillRect(lx - 6, ly + 12, 12, 3); ctx.fillStyle = rgba(255, 200, 120, 0.35 + 0.55 * lit * fl); ctx.fillRect(lx - 5, ly - 4, 10, 16); ctx.strokeStyle = c(metal); ctx.lineWidth = 1.2; for (const x of [lx - 5, lx, lx + 5]) { ctx.beginPath(); ctx.moveTo(x, ly - 4); ctx.lineTo(x, ly + 12); ctx.stroke(); } }
    if (night > 0.2) { const g = ctx.createRadialGradient(lx, ly + 4, 3, lx, ly + 4, 230); g.addColorStop(0, rgba(255, 200, 120, 0.3 * night * fl)); g.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    r.hot.push({ x: lx - 14, y: ly - 14, w: 28, h: 34, tip: tr("hall.lantern") }); }
  // ---- à droite : le miroir et le banc ----
  const mq = [Rr(0.26, 0.16), Rr(0.46, 0.2), Rr(0.46, 0.56), Rr(0.26, 0.56)], oval = (s) => { const pts = []; for (let i = 0; i < 32; i++) { const a = i * TAU / 32; pts.push(onQuad(mq, 0.5 + 0.5 * s * Math.cos(a), 0.5 + 0.5 * s * Math.sin(a))); } return pts; };
  if (glass) { /* la Verrière : un cadre de cuivre fin, en coup de fouet, une tulipe en crête (il repose sur la cimaise : rien ne flotte) */
    const cu = c("#b5652a"), cu2 = c("#e6a06a"); ctx.fillStyle = cu; poly(ctx, oval(1)); ctx.fill();
    ctx.strokeStyle = cu; ctx.lineCap = "round"; const P = (u, v) => onQuad(mq, u, v);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...P(0.5, -0.02)); ctx.quadraticCurveTo(...P(0.3, -0.12), ...P(0.22, -0.02)); ctx.moveTo(...P(0.5, -0.02)); ctx.quadraticCurveTo(...P(0.7, -0.12), ...P(0.78, -0.02)); ctx.stroke(); /* deux volutes */
    ctx.fillStyle = cu2; ctx.beginPath(); ctx.moveTo(...P(0.5, -0.04)); ctx.quadraticCurveTo(...P(0.42, -0.14), ...P(0.46, -0.2)); ctx.quadraticCurveTo(...P(0.5, -0.15), ...P(0.54, -0.2)); ctx.quadraticCurveTo(...P(0.58, -0.14), ...P(0.5, -0.04)); ctx.fill(); /* la tulipe */
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(...P(0.5, 1.0)); ctx.quadraticCurveTo(...P(0.42, 1.08), ...P(0.5, 1.13)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...P(0.5, 1.13)); ctx.lineTo(...P(0.5, 1.2)); ctx.stroke(); /* une vrille qui descend jusqu'à la cimaise */
    ctx.lineCap = "butt";
  } else { ctx.fillStyle = c(castle ? "#b08a3a" : "#8a6a28"); poly(ctx, oval(1)); ctx.fill(); }
  { const inner = oval(glass ? 0.92 : 0.84), [ax, ay] = onQuad(mq, 0.2, 0.1), [bx, by] = onQuad(mq, 0.8, 0.9), g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, c(castle ? "#3a3a44" : "#9ab0b8")); g.addColorStop(1, c(castle ? "#16161c" : "#3a4a52")); ctx.fillStyle = g; poly(ctx, inner); ctx.fill();
    if (!castle) { ctx.save(); poly(ctx, inner); ctx.clip();
      { const rq = [onQuad(mq, 0.12, 0.2), onQuad(mq, 0.42, 0.24), onQuad(mq, 0.42, 0.58), onQuad(mq, 0.12, 0.56)], rs = ctx.createLinearGradient(0, rq[0][1], 0, rq[3][1]); /* la fenêtre d'en face, dans le miroir : c'est un miroir, pas un hublot */
        rs.addColorStop(0, mix("#05060c", mix("#a8c8e0", "#1a2a50", night), 0.45 + 0.4 * amb)); rs.addColorStop(1, mix("#05060c", mix("#dcebf4", "#24345a", night), 0.45 + 0.4 * amb)); ctx.fillStyle = rs; poly(ctx, rq); ctx.fill();
        ctx.strokeStyle = c(glass ? "#b5652a" : "#2e2418"); ctx.lineWidth = 1.6; poly(ctx, rq); ctx.stroke(); ctx.beginPath(); ctx.moveTo(...onQuad(rq, 0.5, 0)); ctx.lineTo(...onQuad(rq, 0.5, 1)); ctx.moveTo(...onQuad(rq, 0, 0.45)); ctx.lineTo(...onQuad(rq, 1, 0.45)); ctx.stroke(); }
      ctx.fillStyle = rgba(255, 255, 255, 0.16); const [hx, hy] = onQuad(mq, 0.36, 0.3); ctx.beginPath(); ctx.ellipse(hx, hy, 5, 13, 0.2, 0, TAU); ctx.fill();
      if (cooking) { ctx.fillStyle = rgba(255, 150, 60, 0.25 * fl); const [ox, oy] = onQuad(mq, 0.3, 0.75); ctx.beginPath(); ctx.ellipse(ox, oy, 4, 6, 0, 0, TAU); ctx.fill(); } /* la porte du fond, dans le miroir */
      ctx.restore(); } }
  r.hot.push({ ...bbox(oval(1)), tip: castle ? tr("hall.mirror.castle") : tr("hall.mirror") });
  { /* le banc, contre le mur : une assise épaisse qui avance dans le couloir, deux pieds courts */
    const k0 = 0.22, k1 = 0.5, sv = 0.8, out = (k) => 44 * (1 - f(k)) + 8, s0 = Rr(k0, sv), s1 = Rr(k1, sv), o0 = [s0[0] - out(k0), s0[1] + 4 * (1 - f(k0))], o1 = [s1[0] - out(k1), s1[1] + 4 * (1 - f(k1))];
    const wood = castle ? "#3a2a1e" : glass ? "#3a2418" : "#5a4028", th = (k) => 7 * (1 - f(k)) + 3, leg = (k) => Rr(k, 1)[1] - Rr(k, sv)[1];
    ctx.fillStyle = c(mix(wood, "#000000", 0.5)); for (const k of [k0 + 0.02, k1 - 0.01]) { const [x, y] = Rr(k, sv); ctx.fillRect(x - 3, y, 3 * (1 - f(k)) + 1.5, Rr(k, 1)[1] - y); } /* les pieds arrière, contre le mur */
    ctx.fillStyle = c(mix(wood, "#000000", 0.25)); poly(ctx, [Rr(k0, sv - 0.09), Rr(k1, sv - 0.09), Rr(k1, sv), Rr(k0, sv)]); ctx.fill(); /* un dossier bas, fixé au mur */
    ctx.fillStyle = c(mix(wood, "#000000", 0.35)); for (const [p, k] of [[o0, k0], [o1, k1]]) ctx.fillRect(p[0] + 3, p[1], 4 * (1 - f(k)) + 2, leg(k)); /* les pieds avant */
    ctx.fillStyle = c(mix(wood, "#ffffff", 0.08)); poly(ctx, [s0, s1, o1, o0]); ctx.fill();
    ctx.fillStyle = c(mix(wood, "#000000", 0.2)); poly(ctx, [o0, o1, [o1[0], o1[1] + th(k1)], [o0[0], o0[1] + th(k0)]]); ctx.fill();
    { const cushion = castle ? "#6a1e24" : glass ? "#2e5a4e" : "#7a5a3a", m = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], q0 = m(s0, s1, 0.08), q1 = m(s0, s1, 0.62), r0 = m(o0, o1, 0.08), r1 = m(o0, o1, 0.62); /* un coussin long, posé : on lit une assise, pas une rampe */
      ctx.fillStyle = c(cushion); poly(ctx, [[q0[0], q0[1] - 4], [q1[0], q1[1] - 3], [r1[0], r1[1] - 3], [r0[0], r0[1] - 5]]); ctx.fill(); ctx.fillStyle = c(mix(cushion, "#000000", 0.3)); poly(ctx, [[r0[0], r0[1] - 5], [r1[0], r1[1] - 3], r1, r0]); ctx.fill(); } }
  // ---- une ombre douce aux bords, et le chemin du retour ----
  const v = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, rgba(0, 0, 0, 0.4)); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  backEdge(r, ctx, r.hallFrom || "lounge", tr("hall.back"));
}

module.exports = { drawHall, backEdge, DOOR };
