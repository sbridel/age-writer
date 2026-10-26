"use strict";
/*
 * Les scarabées, après le 17 (26 oct. 2026, idée de l'auteur ; maquette, pas encore branchée).
 * - L'accord : ils sont libres. Une serre de verre contre la cabane, de la mousse, des fougères, une flaque ; ils y vivent, tranquilles.
 * - Le commandement : une vitrine de verre et de laiton sur le bureau de l'atelier, le couvercle scellé du serpent ; ils ne bougent pas.
 * Leur usage (l'encre qu'ils laissent) viendra plus tard ; ici on ne fait que regarder.
 */
const { rgba } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const q = (k) => { let h = 2166136261; for (const ch of String(k)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };

/** Un scarabée vivant, vu d'au-dessus : (x, y) son centre, `s` sa demi-longueur, `a` l'angle où il regarde. o : { walk (0 à 1 : il marche), glow, dull (terne, en cage) } */
function beetle(ctx, x, y, s, a, t, o = {}) {
  const walk = o.walk || 0, ph = t * 9 + x * 0.3;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (o.glow) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 3); g.addColorStop(0, rgba(120, 220, 190, 0.22 * o.glow)); g.addColorStop(1, rgba(120, 220, 190, 0)); ctx.fillStyle = g; ctx.fillRect(-s * 3, -s * 3, s * 6, s * 6); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.2, s * 0.95, s * 0.6, 0, 0, TAU); ctx.fill(); /* l'ombre */
  ctx.strokeStyle = o.dull ? "#2a2620" : "#1a1410"; ctx.lineWidth = Math.max(0.6, s * 0.09); ctx.lineCap = "round";
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { /* six pattes, qui bougent en marchant */
    const bx = s * (0.35 - k * 0.35), sw = walk * Math.sin(ph + k * 2.1 + (sd > 0 ? Math.PI : 0)) * s * 0.18;
    ctx.beginPath(); ctx.moveTo(bx, sd * s * 0.3); ctx.lineTo(bx + s * 0.1 + sw, sd * s * 0.62); ctx.lineTo(bx + s * (k === 0 ? 0.35 : k === 1 ? 0.05 : -0.3) + sw, sd * s * 0.82); ctx.stroke();
  }
  ctx.lineWidth = Math.max(0.5, s * 0.05); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.9, sd * s * 0.12); ctx.quadraticCurveTo(s * 1.15, sd * s * 0.2, s * 1.25, sd * s * 0.38); ctx.stroke(); } /* les antennes */
  ctx.lineCap = "butt";
  const base = o.dull ? ["#2e2a24", "#4a443a", "#6a6252"] : ["#10241f", "#1f4a40", "#5fb59c"];
  const g = ctx.createLinearGradient(-s, -s * 0.6, s * 0.4, s * 0.6); g.addColorStop(0, base[0]); g.addColorStop(0.55, base[1]); g.addColorStop(1, base[0]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-s * 0.15, 0, s * 0.78, s * 0.5, 0, 0, TAU); ctx.fill(); /* les élytres */
  ctx.strokeStyle = rgba(0, 0, 0, 0.5); ctx.lineWidth = Math.max(0.5, s * 0.05); ctx.beginPath(); ctx.moveTo(s * 0.45, 0); ctx.lineTo(-s * 0.9, 0); ctx.stroke(); /* la suture */
  ctx.fillStyle = base[1]; ctx.beginPath(); ctx.ellipse(s * 0.55, 0, s * 0.26, s * 0.34, 0, 0, TAU); ctx.fill(); /* le corselet */
  ctx.fillStyle = base[0]; ctx.beginPath(); ctx.ellipse(s * 0.86, 0, s * 0.14, s * 0.18, 0, 0, TAU); ctx.fill(); /* la tête */
  ctx.fillStyle = rgba(255, 255, 255, o.dull ? 0.06 : 0.22); ctx.beginPath(); ctx.ellipse(-s * 0.25, -s * 0.22, s * 0.35, s * 0.08, -0.15, 0, TAU); ctx.fill(); /* le reflet irisé */
  if (!o.dull) { ctx.fillStyle = base[2]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.18, s * 0.3, s * 0.06, 0.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
}

/** Où marche un scarabée de la serre, à l'instant t : un tour lent autour de son coin. Sa marche ralentit jusqu'à l'arrêt puis repart,
 *  sans jamais sauter : u(t) = v (t − sin(ωt)/ω) ne recule jamais, et sa vitesse v (1 − cos ωt) s'annule doucement (26 oct. 2026). */
function pathOf(i, t, cx, cy, rx, ry) {
  const sp = 0.03 + q("sp" + i) * 0.03, w = 0.35 + q("w" + i) * 0.25, ph = q("ph" + i), tt = t + q("t0" + i) * 40;
  const u = sp * (tt - Math.sin(w * tt) / w) + ph, walk = (1 - Math.cos(w * tt)) / 2;
  const x = cx + Math.cos(u * TAU) * rx, y = cy + Math.sin(u * TAU * 2) * ry, a = Math.atan2(Math.cos(u * TAU * 2) * ry * 2 * 2, -Math.sin(u * TAU) * rx);
  return { x, y, a, walk };
}

/** Une fougère : des frondes en éventail, chacune avec ses pennes. */
function fern(ctx, fx, fy, fs, t, col = "#2f6a3e") {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.32 + Math.sin(t * 0.6 + fx + k) * 0.02, ex = fx + Math.cos(a) * 60 * fs, ey = fy + Math.sin(a) * 60 * fs;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a) * 30 * fs + k * 4, fy + Math.sin(a) * 40 * fs, ex, ey); ctx.stroke();
    for (let j = 1; j < 9; j++) { const u = j / 9, px = fx + (ex - fx) * u, py = fy + (ey - fy) * u, n = 9 * fs * (1 - u * 0.7); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a + 1.3) * n, py + Math.sin(a + 1.3) * n); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a - 1.3) * n, py + Math.sin(a - 1.3) * n); ctx.stroke(); }
  }
}
/** Un pot de cuivre suspendu à la verrière, et ses tiges retombantes. */
function hangingPot(ctx, x, y, len, t, k) {
  ctx.strokeStyle = "rgba(70,40,20,0.8)"; ctx.lineWidth = 0.8; for (const d of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y + len); ctx.stroke(); }
  const py = y + len; ctx.fillStyle = "#9a5a2a"; ctx.beginPath(); ctx.moveTo(x - 10, py); ctx.lineTo(x + 10, py); ctx.lineTo(x + 7, py + 12); ctx.lineTo(x - 7, py + 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,220,170,0.25)"; ctx.fillRect(x - 9, py + 1, 18, 1.5);
  for (let v = 0; v < 5; v++) { /* les tiges qui retombent, et leurs petites feuilles */
    const sx = x - 8 + v * 4, L = 26 + q("v" + k + v) * 30, sw = Math.sin(t * 0.8 + v + k) * 2;
    ctx.strokeStyle = "#3b7a4a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, py + 2); ctx.quadraticCurveTo(sx + sw, py + L / 2, sx + sw * 1.5 + (v - 2) * 3, py + L); ctx.stroke();
    ctx.fillStyle = "#4b9a5a"; for (let l = 1; l < 5; l++) { const u = l / 5, lx = sx + sw * u * 1.4 + (v - 2) * 3 * u, ly = py + L * u; ctx.beginPath(); ctx.ellipse(lx + (l % 2 ? 2 : -2), ly, 2.4, 1.3, l % 2 ? 0.5 : -0.5, 0, TAU); ctx.fill(); }
  }
}

/** Les trois salons d'hiver, un par habillage (26 oct. 2026, d'après les photos de l'auteur) :
 *  sans habillage, un salon d'hiver de fer peint vert-de-gris sur des dalles claires, un olivier en pot ; le Château, une orangerie gothique de fer noir
 *  fileté d'or, arcs brisés, dallage sombre, un lustre de fer ; la Verrière, une nef Art nouveau de cuivre aux carreaux de vitrail, sol de mosaïque, des palmes. */
const STYLES = {
  plain: { frame: "#5f7f6c", hi: "#9fbfa8", round: true, pane: [[170, 210, 190, 0.1], [255, 255, 255, 0.05]], wall: "#8a8476", wallTop: "#aaa496", floor: ["#6e685c", "#3a362f"], flags: "rgba(0,0,0,0.18)", sky: ["#b8d6d2", "#eef2e2"] },
  castle: { frame: "#23212a", hi: "#c9a24e", round: false, pane: [[150, 170, 190, 0.08], [255, 255, 255, 0.04]], wall: "#4a4552", wallTop: "#6e6876", floor: ["#3e3a46", "#1a1820"], flags: "rgba(0,0,0,0.3)", sky: ["#8fb0bc", "#cdd8d4"] },
  glass: { frame: "#b5652a", hi: "#e6a06a", round: true, stained: true, pane: [[230, 170, 80, 0.2], [110, 190, 140, 0.2], [210, 120, 150, 0.16], [120, 160, 210, 0.16]], wall: "#1f3a34", wallTop: "#b5652a", floor: ["#2a3a34", "#121c18"], flags: "rgba(200,170,90,0.1)", sky: ["#c8d6c0", "#efe6cc"] },
};
const styleOf = (r) => (r && r.castleOn && r.castleOn() ? STYLES.castle : r && r.glassOn && r.glassOn() ? STYLES.glass : STYLES.plain);

/** La serre (l'accord) : une verrière en arc sur un muret de pierre, des pots suspendus, des fougères, un massif en fleurs, des roseaux et une mare
 *  à nénuphars, un banc de pierre, une table de rempotage ; les scarabées y vivent, l'un d'eux grimpe une fronde. La nuit, leur dos luit. */
function drawSerre(r, ctx, sc, sky, t) {
  const night = sky.night || 0, day = 1 - night, ST = styleOf(r);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, night > 0.5 ? "#0e1a24" : ST.sky[0]); g.addColorStop(1, night > 0.5 ? "#16262a" : ST.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(40,80,60,0.14)"; ctx.fillRect(0, 0, W, H);
  /* on est dessous : une nef de verre vue de l'intérieur ; des arcs de cuivre qui passent au-dessus de nous et rapetissent vers le fond, des pannes qui filent au point de fuite */
  const VP = { x: 320, y: 150 }, arch = (sc) => ({ hw: 150 * sc, base: VP.y + 82 * sc, apex: VP.y - 92 * sc });
  const ptOn = (sc, u) => { const A = arch(sc); if (ST.round) { const th = Math.PI * (1 - u); return [VP.x + A.hw * Math.cos(th), A.base - (A.base - A.apex) * Math.sin(th)]; } const x = VP.x - A.hw + 2 * A.hw * u, yy = A.base - (A.base - A.apex) * (1 - Math.pow(2 * u - 1, 2)); return [x, yy]; }; /* plein cintre, ou arc brisé au Château */
  /* au fond, à travers le verre du pignon : des feuillages flous */
  for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${60 + q("bg" + i) * 30},${110 + q("bh" + i) * 40},80,${0.25 * day + 0.08})`; ctx.beginPath(); ctx.ellipse(VP.x - 140 + q("bx" + i) * 280, 200 + q("by" + i) * 26, 30 + q("bw" + i) * 40, 22 + q("bv" + i) * 16, 0, 0, TAU); ctx.fill(); }
  const S = [1, 1.5, 2.25, 3.4, 5.1]; /* les arcs, du fond vers nous */
  for (let k = S.length - 1; k > 0; k--) { /* entre deux arcs, des carreaux de verre un peu verts, plus clairs vers le haut */
    for (let m = 0; m < 6; m++) { const u0 = m / 6, u1 = (m + 1) / 6, a = ptOn(S[k], u0), b = ptOn(S[k], u1), c2 = ptOn(S[k - 1], u1), d = ptOn(S[k - 1], u0);
      const P = ST.pane[(m * 3 + k) % ST.pane.length], al = P[3] * (0.6 + 0.6 * day); ctx.fillStyle = `rgba(${P[0]},${P[1]},${P[2]},${al})`; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
      if (ST.stained) { const cx = (a[0] + b[0] + c2[0] + d[0]) / 4, cy = (a[1] + b[1] + c2[1] + d[1]) / 4, rr = Math.max(3, Math.abs(b[0] - a[0]) * 0.18); ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.55, (m - 3) * 0.3, 0, TAU); ctx.moveTo(cx - rr, cy); ctx.quadraticCurveTo(cx, cy - rr, cx + rr, cy); ctx.stroke(); } } /* la Verrière : un vitrail à feuille dans chaque carreau */
  }
  ctx.strokeStyle = ST.frame; ctx.lineCap = "round";
  for (let m = 0; m <= 6; m++) { const u = m / 6, a = ptOn(S[0], u), b = ptOn(S[S.length - 1], u); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } /* les pannes, vers le point de fuite */
  const archPath = (sc) => { const A = arch(sc); ctx.beginPath(); if (ST.round) ctx.ellipse(VP.x, A.base, A.hw, A.base - A.apex, 0, Math.PI, TAU); else { ctx.moveTo(VP.x - A.hw, A.base); ctx.quadraticCurveTo(VP.x, A.apex - (A.base - A.apex), VP.x + A.hw, A.base); } };
  S.forEach((sc, k) => { ctx.strokeStyle = ST.frame; ctx.lineWidth = 1.5 + k * 1.6; archPath(sc); ctx.stroke(); if (ST.hi) { ctx.strokeStyle = ST.hi; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(0.6, 0.3 + k * 0.35); archPath(sc); ctx.stroke(); ctx.globalAlpha = 1; } }); /* les arcs, et leur filet clair (or au Château) */
  ctx.strokeStyle = ST.frame;
  { const A = arch(1); ctx.lineWidth = 1.2; for (const u of [0.25, 0.5, 0.75]) { const [x] = ptOn(1, u); ctx.beginPath(); ctx.moveTo(x, A.base); ctx.lineTo(x, ptOn(1, u)[1]); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(VP.x - A.hw * 0.9, A.base - 40); ctx.lineTo(VP.x + A.hw * 0.9, A.base - 40); ctx.stroke(); } /* le pignon du fond, ses montants */
  ctx.lineCap = "butt";
  ctx.fillStyle = "rgba(255,255,255,0.16)"; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(q("dx" + i) * W, 30 + q("dy" + i) * 150, 0.8 + q("ds" + i) * 1.2, 0, TAU); ctx.fill(); } /* la buée */
  if (day > 0.3) { /* la lumière qui tombe du toit, douce, en nappes */
    ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const [x0, w0] of [[180, 60], [380, 50]]) { const lg = ctx.createLinearGradient(0, 0, 0, 300); lg.addColorStop(0, `rgba(255,240,200,${0.06 * day})`); lg.addColorStop(1, "rgba(255,240,200,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w0, 0); ctx.lineTo(x0 + w0 + 60, 300); ctx.lineTo(x0 + 30, 300); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  /* les murets de pierre, de chaque côté, qui filent vers le fond */
  { const A0 = arch(1), A1 = arch(S[S.length - 1]); for (const sd of [-1, 1]) { ctx.fillStyle = ST.wall; ctx.beginPath(); ctx.moveTo(VP.x + sd * A0.hw, A0.base); ctx.lineTo(VP.x + sd * A0.hw, A0.base - 14); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 70); ctx.lineTo(VP.x + sd * A1.hw, A1.base); ctx.closePath(); ctx.fill(); ctx.fillStyle = ST.wallTop; ctx.beginPath(); ctx.moveTo(VP.x + sd * A0.hw, A0.base - 14); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 70); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 78); ctx.lineTo(VP.x + sd * A0.hw, A0.base - 16); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = ST.wall; ctx.fillRect(VP.x - A0.hw, A0.base - 14, 2 * A0.hw, 14); ctx.fillStyle = ST.wallTop; ctx.fillRect(VP.x - A0.hw, A0.base - 16, 2 * A0.hw, 2.5); }
  /* les pots suspendus */
  hangingPot(ctx, 120, 0, 60, t, 1); hangingPot(ctx, 320, 0, 34, t, 2); hangingPot(ctx, 520, 0, 60, t, 3); /* accrochés aux arcs au-dessus de nous */
  /* le sol : terre, mousse, un chemin de dalles */
  const sg = ctx.createLinearGradient(0, 230, 0, H); sg.addColorStop(0, ST.floor[0]); sg.addColorStop(1, ST.floor[1]); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(170, 232); ctx.lineTo(470, 232); ctx.lineTo(W + 200, H); ctx.lineTo(-200, H); ctx.closePath(); ctx.fill(); /* le sol, qui s'élargit vers nous */
  ctx.strokeStyle = ST.flags; ctx.lineWidth = 1; for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(VP.x + k * 18, 232); ctx.lineTo(VP.x + k * 90, H); ctx.stroke(); } for (const yy of [242, 258, 280, 310, 350]) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); } /* les dalles (ou la mosaïque), en perspective */
  for (let i = 0; i < 40; i++) { const x = q("mx" + i) * W, y = 256 + q("my" + i) * 90, rr = 8 + q("mr" + i) * 22; ctx.fillStyle = `rgba(${55 + q("mc" + i) * 35},${100 + q("md" + i) * 45},50,0.55)`; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.4, 0, 0, TAU); ctx.fill(); }
  for (let k = 0; k < 6; k++) { const x = 250 + k * 22 + (k % 2) * 6, y = 350 - k * 14; ctx.fillStyle = "#6a655c"; ctx.beginPath(); ctx.ellipse(x, y, 16 - k, 5 - k * 0.4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(x - 10, y + 2, 20 - k, 1.4); } /* le chemin de dalles */
  /* la mare, ses roseaux, ses nénuphars */
  ctx.fillStyle = "#1c2e30"; ctx.beginPath(); ctx.ellipse(460, 312, 84, 17, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(160,210,220,0.25)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = `rgba(200,230,240,${0.08 + 0.1 * day})`; ctx.beginPath(); ctx.ellipse(440, 308, 34, 3, 0, 0, TAU); ctx.fill();
  for (const [lx, ly, lr] of [[420, 316, 9], [478, 306, 7], [505, 318, 8]]) { ctx.fillStyle = "#3f7a4a"; ctx.beginPath(); ctx.arc(lx, ly, lr, 0.3, TAU - 0.1); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#e8d8e8"; ctx.beginPath(); ctx.arc(480, 304, 3, 0, TAU); ctx.fill(); ctx.fillStyle = "#e6c45a"; ctx.beginPath(); ctx.arc(480, 304, 1.2, 0, TAU); ctx.fill(); /* une fleur de nénuphar */
  ctx.strokeStyle = "#5a7a3a"; ctx.lineWidth = 1.4; for (let k = 0; k < 9; k++) { const rx = 530 + k * 5, h = 40 + q("rd" + k) * 30, sw = Math.sin(t * 0.7 + k) * 2; ctx.beginPath(); ctx.moveTo(rx, 314); ctx.quadraticCurveTo(rx + sw, 314 - h / 2, rx + sw * 2, 314 - h); ctx.stroke(); if (k % 3 === 0) { ctx.fillStyle = "#6a4a2a"; ctx.fillRect(rx + sw * 2 - 1.5, 314 - h - 6, 3, 9); } } /* les roseaux, et leurs massettes */
  /* un massif en fleurs */
  for (let i = 0; i < 26; i++) { const x = 360 + q("fx" + i) * 70, y = 262 + q("fy" + i) * 22; ctx.fillStyle = "#3b6a3a"; ctx.beginPath(); ctx.ellipse(x, y + 4, 6, 3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = ["#d88aa8", "#f0e0c8", "#c46a8a", "#e8c46a"][i % 4]; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
  /* les fougères */
  fern(ctx, 70, 258, 1.25, t); fern(ctx, 200, 252, 0.95, t); fern(ctx, 600, 262, 1.2, t);
  /* le banc de pierre, à gauche */
  ctx.fillStyle = "#5a554c"; ctx.fillRect(100, 292, 110, 9); ctx.fillStyle = "#6e695e"; ctx.fillRect(100, 290, 110, 3); ctx.fillStyle = "#47433b"; ctx.fillRect(110, 301, 12, 20); ctx.fillRect(188, 301, 12, 20); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(104, 321, 104, 4);
  /* la table de rempotage, à droite : des godets de terre cuite, un arrosoir */
  ctx.fillStyle = "#4a3422"; ctx.fillRect(560, 268, 76, 6); ctx.fillRect(566, 274, 5, 40); ctx.fillRect(626, 274, 5, 40);
  for (const [px, ph] of [[572, 10], [588, 8], [602, 11]]) { ctx.fillStyle = "#a85a3a"; ctx.beginPath(); ctx.moveTo(px - 6, 268); ctx.lineTo(px + 6, 268); ctx.lineTo(px + 4, 268 - ph); ctx.lineTo(px - 4, 268 - ph); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#4b8a4a"; ctx.beginPath(); ctx.arc(px, 266 - ph, 4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#6a7a7a"; ctx.beginPath(); ctx.ellipse(622, 262, 8, 6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#6a7a7a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(614, 262); ctx.lineTo(604, 252); ctx.stroke(); /* l'arrosoir */
  if (ST === STYLES.plain) { /* un olivier en pot de pierre, comme sur la photo */
    ctx.fillStyle = "#b8b0a0"; ctx.beginPath(); ctx.moveTo(258, 300); ctx.lineTo(290, 300); ctx.lineTo(286, 330); ctx.lineTo(262, 330); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(262, 314, 24, 2);
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(274, 300); ctx.quadraticCurveTo(270, 270, 276, 236); ctx.stroke();
    for (let i = 0; i < 40; i++) { const a = q("ol" + i) * TAU, rr = q("or" + i) * 26; ctx.fillStyle = i % 2 ? "#7a8f5a" : "#5f7a4a"; ctx.beginPath(); ctx.ellipse(276 + Math.cos(a) * rr, 228 + Math.sin(a) * rr * 0.7, 4, 1.4, a, 0, TAU); ctx.fill(); } }
  else if (ST === STYLES.castle) { /* un lustre de fer, au-dessus de l'allée */
    ctx.strokeStyle = "#23212a"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(320, 0); ctx.lineTo(320, 70); ctx.stroke(); ctx.beginPath(); ctx.ellipse(320, 76, 34, 6, 0, 0, TAU); ctx.stroke();
    for (const dx of [-30, -15, 0, 15, 30]) { ctx.fillStyle = "#e8dcc0"; ctx.fillRect(320 + dx - 1.5, 64, 3, 9); const f = 0.8 + 0.2 * Math.sin(t * 7 + dx); ctx.fillStyle = `rgba(255,200,110,${0.9 * f})`; ctx.beginPath(); ctx.ellipse(320 + dx, 61, 1.6, 3 * f, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = `rgba(255,200,120,${0.06 + 0.1 * night})`; ctx.beginPath(); ctx.arc(320, 66, 80, 0, TAU); ctx.fill(); }
  else { /* la Verrière : deux palmes dans des pots de cuivre */
    for (const [px, sd] of [[46, 1], [596, -1]]) { ctx.fillStyle = "#b5652a"; ctx.beginPath(); ctx.moveTo(px - 16, 300); ctx.lineTo(px + 16, 300); ctx.lineTo(px + 12, 330); ctx.lineTo(px - 12, 330); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#3b7a4a"; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.4 + sd * 0.2, L = 70 + (k % 2) * 14, ex = px + Math.cos(a) * L, ey = 300 + Math.sin(a) * L; ctx.beginPath(); ctx.moveTo(px, 300); ctx.quadraticCurveTo(px + Math.cos(a) * L * 0.5, 300 + Math.sin(a) * L * 0.4 - 10, ex, ey + 10); ctx.stroke();
        ctx.lineWidth = 1; for (let j = 2; j < 10; j++) { const u = j / 10, xx = px + (ex - px) * u, yy = 300 + (ey + 10 - 300) * u - 6 * Math.sin(Math.PI * u); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 7, yy + 8); ctx.moveTo(xx, yy); ctx.lineTo(xx - 7, yy + 8); ctx.stroke(); } ctx.lineWidth = 2; } } }
  /* les scarabées : sept qui marchent, s'arrêtent et repartent ; un huitième sur le banc ; un neuvième qui grimpe une fronde */
  const spots = [[150, 330, 40, 8], [270, 330, 46, 8], [350, 296, 30, 6], [420, 340, 30, 6], [600, 336, 20, 5], [70, 334, 26, 5], [520, 282, 26, 4]];
  const pos = spots.map(([cx, cy, rx, ry], i) => pathOf(i, t, cx, cy, rx, ry));
  pos.forEach((p, i) => beetle(ctx, p.x, p.y, 10 + q("s" + i) * 5, p.a, t, { walk: p.walk, glow: night }));
  beetle(ctx, 160 + Math.sin(t * 0.05) * 30, 288, 11, Math.PI + Math.cos(t * 0.05) * 0.3, t, { walk: 0.3, glow: night }); /* sur le banc */
  { const u = (1 - Math.cos(t * 0.12)) / 2, a = -Math.PI / 2 + 0.32, fx = 200, fy = 252, ex = fx + Math.cos(a) * 57, ey = fy + Math.sin(a) * 57, bx = fx + (ex - fx) * u * 0.8, by = fy + (ey - fy) * u * 0.8; beetle(ctx, bx, by, 8, a + (Math.sin(t * 0.12) > 0 ? 0 : Math.PI), t, { walk: Math.abs(Math.sin(t * 0.12)), glow: night }); } /* sur une fronde, qui monte et redescend */
  if (night > 0.3) { ctx.fillStyle = `rgba(0,0,0,${0.45 * night})`; ctx.fillRect(0, 0, W, H); for (const p of pos) { const gl = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 18); gl.addColorStop(0, `rgba(140,230,200,${0.55 * night})`); gl.addColorStop(1, "rgba(140,230,200,0)"); ctx.fillStyle = gl; ctx.fillRect(p.x - 18, p.y - 18, 36, 36); } } /* la nuit, leur dos luit */
  if (r && r.hot) { const tr = r.imagerTr ? r.imagerTr() : (k) => k; require("./relto-atelier").backButton(r, ctx, tr("scarab.back"), "loft"); }
  void sc;
}

/** La vitrine (le commandement) : une boîte de verre et de laiton posée sur le bureau, des scarabées immobiles sur un lit de feutre, le couvercle scellé du serpent. (x, y) : le coin haut gauche ; w, h : la boîte. */
function vitrine(ctx, c, x, y, w, h, t) {
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(x + 4, y + h - 2, w, 6); /* l'ombre sur le bureau */
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(x, y + h - 10, w, 10); /* le socle */
  ctx.fillStyle = c("#3a2a3a"); ctx.fillRect(x + 4, y + 8, w - 8, h - 18); /* le feutre, au fond */
  [[0.25, 0.45, 0.4], [0.5, 0.35, -0.2], [0.72, 0.55, 2.8], [0.4, 0.7, 1.4]].forEach(([u, v, a], i) => beetle(ctx, x + w * u, y + 8 + (h - 18) * v, 9 + i % 2 * 2, a, t, { dull: true })); /* ils ne bougent pas */
  ctx.fillStyle = rgba(200, 220, 230, 0.1); ctx.fillRect(x + 4, y + 8, w - 8, h - 18); /* le verre */
  ctx.fillStyle = rgba(255, 255, 255, 0.12); ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 26, y + 10); ctx.lineTo(x + 12, y + h - 12); ctx.lineTo(x + 6, y + h - 12); ctx.fill(); /* un reflet */
  ctx.strokeStyle = c("#b08a3a"); ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 7, w - 6, h - 16); /* le cadre de laiton */
  ctx.fillStyle = c("#b08a3a"); ctx.fillRect(x, y, w, 8); ctx.fillStyle = c("#7a5a22"); ctx.fillRect(x, y + 6, w, 2); /* le couvercle */
  const sx = x + w / 2, sy = y + 4; ctx.fillStyle = c("#7a1f1f"); ctx.beginPath(); ctx.arc(sx, sy + 2, 7, 0, TAU); ctx.fill(); /* le cachet de cire, à cheval sur le couvercle */
  ctx.strokeStyle = c("#c44a3a"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 4); ctx.quadraticCurveTo(sx - 1, sy - 2, sx + 1, sy + 3); ctx.quadraticCurveTo(sx + 3, sy + 7, sx + 4, sy); ctx.stroke(); /* le serpent */
}

module.exports = { beetle, pathOf, drawSerre, vitrine };
