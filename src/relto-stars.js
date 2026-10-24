"use strict";
/**
 * Le dernier étage de la caverne : la chambre aux étoiles (claude/DESIGN-reve-et-caverne-bahro.md, section 15). Tout est
 * dessiné ici, sans asset ; l'image d'Uru de l'auteur n'a donné que l'atmosphère.
 * - **Au lac** (`gate`) : aux degrés 0 et 1 rien ; au degré 2, une ouverture noire au fond, derrière le bassin, d'où monte
 *   une lueur bleue (celle d'en bas, pas celle de l'eau) et où se dessine une échelle de fer : on descend.
 * - **La chambre** (vue `stars`) : une salle ronde ; le sol en disque dallé en anneaux, traversé par une fissure d'où montent
 *   la lumière bleue et des poussières d'étoiles ; cinq piliers gravés en cercle ; des vasques de pierre pendues à trois
 *   cordes, qui s'allument avec les degrés du lac (2 : quelques-unes ; 3 : toutes : quelqu'un vient) ; des mains soufflées à
 *   l'ocre ; au degré 3, deux ombres de dos au bord de la fissure. Pas d'échelle visible : une bouche sombre dans un angle.
 * - **Regarder le sol** (vue `fissure`) : penché au bord, la roche en silhouette, le vide étoilé, une nébuleuse, les
 *   poussières qui montent vers nous, nos deux bottes. C'est la scène du dernier chapitre.
 * Aucune action pour l'instant : on regarde.
 */
const { rgba, fnv, mix } = require("./util");
const F = require("./fresco");
const W = 640, H = 360, TAU = Math.PI * 2;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const nowOf = (r) => (r.nowOverride || Date.now());
const stateOf = (r) => (r.opts && typeof r.opts.caveState === "function" ? r.opts.caveState() || {} : {});
const degreeOf = (r) => { const st = stateOf(r); return F.lakeDegree(st.colonies, st.fedAt, nowOf(r)); };
const q = (k) => (fnv("stars|" + k) % 10000) / 10000;
const BLUE = [110, 165, 255];
const blue = (a, m = 1) => rgba(Math.min(255, BLUE[0] * m), Math.min(255, BLUE[1] * m), Math.min(255, BLUE[2] * m), a);

/** L'ouverture au fond du lac (vue `cavebottom`), au degré 2 et plus : à droite, derrière le bassin. */
const GATE = [[568, 196], [580, 186], [596, 190], [606, 206], [612, 236], [614, 262], [604, 282], [574, 282], [566, 258], [562, 226]];
function gate(r, ctx, degree, t) {
  if (degree < 2) return;
  const tr = TR(r), hov = r.hover && r.hover.go === "stars", pulse = 0.85 + 0.15 * Math.sin(t * 0.9), path = () => { ctx.beginPath(); GATE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  const spill = ctx.createRadialGradient(588, 250, 6, 588, 250, 90); spill.addColorStop(0, blue(0.22 * pulse * (hov ? 1.4 : 1))); spill.addColorStop(1, blue(0)); ctx.fillStyle = spill; ctx.fillRect(490, 160, 150, 160); /* la lueur déborde sur la roche */
  ctx.fillStyle = "#010205"; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  const g = ctx.createLinearGradient(0, 282, 0, 186); g.addColorStop(0, blue(0.75 * pulse, 1.15)); g.addColorStop(0.45, blue(0.25 * pulse)); g.addColorStop(1, blue(0)); ctx.fillStyle = g; ctx.fillRect(556, 180, 64, 110);
  ctx.strokeStyle = rgba(30, 32, 40, 0.95); ctx.lineWidth = 2.2; /* l'échelle de fer, à contre-jour */
  for (const x of [579, 598]) { ctx.beginPath(); ctx.moveTo(x, 290); ctx.lineTo(x + (x < 590 ? 1 : -1), 200); ctx.stroke(); }
  ctx.lineWidth = 1.6; for (let y = 284; y > 206; y -= 11) { ctx.beginPath(); ctx.moveTo(579, y); ctx.lineTo(598, y); ctx.stroke(); }
  for (let i = 0; i < 9; i++) { const p = (t * 0.12 + q("gd" + i)) % 1, x = 570 + q("gx" + i) * 38, y = 282 - p * 90; ctx.fillStyle = rgba(210, 228, 255, 0.7 * (1 - p)); ctx.fillRect(x, y, 1.2, 1.2); } /* des poussières qui montent */
  ctx.restore();
  ctx.strokeStyle = blue(0.35 * pulse); ctx.lineWidth = 1; path(); ctx.stroke();
  r.hot.push({ x: 560, y: 184, w: 56, h: 100, tip: tr("stars.go"), go: "stars" });
}

/** Un signe gravé (pierre nue) ou qui luit (sous une vasque allumée). */
function carved(ctx, id, x, y, s, glow, seed) {
  const FR = require("./relto-fresco");
  if (glow > 0.02) { const g = ctx.createRadialGradient(x, y, 1, x, y, s * 1.8); g.addColorStop(0, rgba(255, 190, 110, 0.28 * glow)); g.addColorStop(1, rgba(255, 170, 90, 0)); ctx.fillStyle = g; ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4); }
  FR.sign(ctx, id, x, y, s, 0.45 + 0.5 * glow, seed, glow > 0.02 ? mix("#7a6a58", "#ffc27a", glow) : "#5a5a66");
}

/** La salle ronde. */
const PILLARS = [-90, -18, -162, 54, 126].map((deg, i) => { const a = (deg * Math.PI) / 180, x = 320 + Math.cos(a) * 250, y = 262 + Math.sin(a) * 48; return { i, x, y, s: 0.58 + ((y - 214) / 87) * 0.95 }; });
const FISSURE_L = [[316, 222], [310, 236], [314, 250], [302, 268], [306, 286], [290, 306], [294, 326], [276, 344], [270, 360]];
const FISSURE_R = [[324, 222], [330, 238], [326, 252], [338, 270], [334, 288], [352, 308], [346, 328], [366, 346], [372, 360]];

function drawStars(r, ctx, sc, sky, t) {
  const tr = TR(r), degree = degreeOf(r), lit = degree >= 3 ? [0, 1, 2, 3, 4] : degree >= 2 ? [0, 2] : [];
  /* la paroi ronde : des strates qui se courbent autour de nous */
  const bg = ctx.createLinearGradient(0, 0, 0, 240); bg.addColorStop(0, "#03040a"); bg.addColorStop(1, "#0b0e1a"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 11; i++) { const base = 26 + i * 19, k = (210 - base) / 210; ctx.strokeStyle = rgba(70, 80, 110, 0.10 + 0.05 * (i % 3 === 0)); ctx.lineWidth = 1 + (i % 4 === 0); ctx.beginPath(); for (let x = 0; x <= W; x += 10) { const y = base - 0.00042 * (x - 320) * (x - 320) * k * 120 / 100 + 2 * Math.sin(x / 37 + i); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  /* la bouche sombre, dans un angle : là d'où l'on vient */
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(58, 54); ctx.quadraticCurveTo(84, 30, 108, 50); ctx.lineTo(112, 104); ctx.quadraticCurveTo(86, 114, 60, 104); ctx.closePath(); ctx.fill();
  /* des mains soufflées à l'ocre : la roche autour, la main en réserve */
  for (const [x, y, rot] of [[214, 128, -0.25], [446, 118, 0.2], [252, 96, 0.1]]) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 24); g.addColorStop(0, rgba(200, 112, 46, 0.42)); g.addColorStop(0.65, rgba(200, 112, 46, 0.2)); g.addColorStop(1, rgba(200, 112, 46, 0)); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = "#0a0c16"; ctx.beginPath(); ctx.ellipse(0, 3, 6, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#0a0c16"; ctx.lineWidth = 3.4; ctx.lineCap = "round"; for (let f = 0; f < 5; f++) { const a = -2.6 + f * 0.43, l = f === 0 ? 11 : 15; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, 3 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * l, 3 + Math.sin(a) * l); ctx.stroke(); } ctx.restore();
    r.hot.push({ x: x - 18, y: y - 18, w: 36, h: 36, tip: tr("stars.hands") });
  }
  /* le sol : un disque dallé en anneaux */
  const fl = ctx.createLinearGradient(0, 210, 0, H); fl.addColorStop(0, "#151a28"); fl.addColorStop(1, "#232838"); ctx.fillStyle = fl; ctx.beginPath(); ctx.ellipse(320, 300, 360, 86, 0, Math.PI, TAU); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  { const base = ctx.createLinearGradient(0, 170, 0, 230); base.addColorStop(0, "rgba(0,0,0,0)"); base.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(320, 300, 360, 86, 0, Math.PI, TAU); ctx.lineTo(W, 170); ctx.lineTo(0, 170); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(120, 135, 170, 0.35); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(320, 300, 360, 86, 0, Math.PI, TAU); ctx.stroke(); } /* le pied de la paroi ronde */
  for (let k = 1; k <= 6; k++) { const s = k / 6; ctx.strokeStyle = rgba(110, 125, 160, 0.24); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(320, 300, 360 * s, 86 * s, 0, 0, TAU); ctx.stroke();
    for (let j = 0; j < 6 + k * 4; j++) { const a = (j / (6 + k * 4)) * TAU + k * 0.4, s0 = (k - 1) / 6; ctx.beginPath(); ctx.moveTo(320 + Math.cos(a) * 360 * s0, 300 + Math.sin(a) * 86 * s0); ctx.lineTo(320 + Math.cos(a) * 360 * s, 300 + Math.sin(a) * 86 * s); ctx.stroke(); } }
  /* la fissure, au sol : large devant, étroite au fond ; la lumière bleue et les poussières d'étoiles en montent */
  const glow = ctx.createRadialGradient(320, 300, 10, 320, 300, 230); glow.addColorStop(0, blue(0.30)); glow.addColorStop(1, blue(0)); ctx.fillStyle = glow; ctx.fillRect(0, 170, W, H - 170);
  const crack = () => { ctx.beginPath(); FISSURE_L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = FISSURE_R.length - 1; i >= 0; i--) ctx.lineTo(FISSURE_R[i][0], FISSURE_R[i][1]); ctx.closePath(); };
  const cg = ctx.createLinearGradient(320, 222, 320, H); cg.addColorStop(0, blue(0.9, 1.3)); cg.addColorStop(0.4, blue(0.85)); cg.addColorStop(1, "#0a1630"); ctx.fillStyle = cg; crack(); ctx.fill();
  ctx.save(); crack(); ctx.clip(); for (let i = 0; i < 40; i++) { const x = 270 + q("cs" + i) * 100, y = 222 + q("ct" + i) * 140; ctx.fillStyle = rgba(230, 240, 255, 0.4 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))); ctx.fillRect(x, y, 1, 1); } ctx.restore(); /* le vide, en bas */
  ctx.strokeStyle = blue(0.55, 1.2); ctx.lineWidth = 1; crack(); ctx.stroke();
  r.hot.push({ x: 268, y: 222, w: 106, h: 138, tip: tr("stars.crack") });
  /* au degré 3, deux ombres de dos au bord de la fissure */
  if (degree >= 3) for (const [x, y, s] of [[262, 268, 1], [384, 262, 0.92]]) {
    const sway = Math.sin(t * 0.35 + x) * 0.8; ctx.save(); ctx.translate(x + sway, y); ctx.scale(s, s);
    const sh = ctx.createRadialGradient(0, -20, 4, 0, -16, 34); sh.addColorStop(0, "rgba(2,3,8,0.95)"); sh.addColorStop(0.8, "rgba(2,3,8,0.85)"); sh.addColorStop(1, "rgba(2,3,8,0)"); ctx.fillStyle = sh;
    ctx.beginPath(); ctx.moveTo(-15, 8); ctx.quadraticCurveTo(-22, -24, -8, -38); ctx.quadraticCurveTo(0, -46, 9, -38); ctx.quadraticCurveTo(22, -22, 15, 8); ctx.closePath(); ctx.fill(); /* le dos, voûté */
    ctx.beginPath(); ctx.ellipse(0, -43, 5.5, 6.5, 0, 0, TAU); ctx.fill(); /* la tête, basse */
    ctx.strokeStyle = "rgba(2,3,8,0.9)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-14, -26); ctx.quadraticCurveTo(-24, -6, -20, 10); ctx.moveTo(14, -26); ctx.quadraticCurveTo(24, -6, 21, 10); ctx.stroke(); /* les bras, longs */
    ctx.strokeStyle = blue(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, -38); ctx.quadraticCurveTo(0, -46, 9, -38); ctx.stroke(); /* la lumière d'en bas sur l'épaule */
    ctx.restore();
  }
  /* les poussières d'étoiles qui montent de la fissure */
  for (let i = 0; i < 70; i++) { const u = q("du" + i), p = (t * (0.05 + q("dv" + i) * 0.06) + q("dw" + i)) % 1, yb = 222 + u * 138, half = 4 + u * 46, x = 320 + (q("dx" + i) - 0.5) * 2 * half + Math.sin(t * 0.7 + i) * 6 * p, y = yb - p * (120 + u * 140), a = (1 - p) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7)));
    ctx.fillStyle = rgba(215, 230, 255, 0.85 * a); ctx.beginPath(); ctx.arc(x, y, 0.6 + u * 1.1, 0, TAU); ctx.fill(); }
  /* les cinq piliers, du fond vers nous ; les vasques au-dessus */
  const signs = F.itemsOf((r.scene && r.scene.ages) || [], {}).filter((it) => it.kind === "age").slice(-15).flatMap((it) => it.parts.slice(0, 1));
  const order = PILLARS.slice().sort((a, b) => a.y - b.y);
  for (const p of order) {
    const on = lit.includes(p.i), hgt = 118 * p.s, w = 14 * p.s, top = p.y - hgt, hov = r.hover && r.hover.pillar === p.i + 1;
    const pg = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0); pg.addColorStop(0, "#14161f"); pg.addColorStop(0.45, hov ? "#3c4050" : "#2e3240"); pg.addColorStop(1, "#101219"); ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x - w * 0.86, top); ctx.lineTo(p.x + w * 0.86, top); ctx.lineTo(p.x + w, p.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1c1f2a"; ctx.fillRect(p.x - w * 1.25, p.y - 4 * p.s, w * 2.5, 6 * p.s); if (top > 2) ctx.fillRect(p.x - w * 1.15, top - 3 * p.s, w * 2.3, 5 * p.s); /* socle et chapiteau */
    const lb = ctx.createLinearGradient(p.x, 0, p.x + w, 0); lb.addColorStop(0, blue(0)); lb.addColorStop(1, blue(0.10 + (p.x < 320 ? 0.12 : 0))); ctx.fillStyle = lb; ctx.fillRect(p.x - w, top, w * 2, hgt); /* la lueur de la fissure sur le flanc */
    for (let k = 0; k < 3; k++) { const id = signs.length ? signs[(p.i * 3 + k) % signs.length] : F.ELEMENTS[(p.i * 5 + k * 7) % F.ELEMENTS.length]; carved(ctx, id, p.x, p.y - hgt * (0.3 + k * 0.2), 5.5 * p.s, on ? 0.8 + 0.2 * Math.sin(t * 1.1 + k) : 0, "pil" + p.i + k); }
    r.hot.push({ x: p.x - w * 1.2, y: Math.max(0, top), w: w * 2.4, h: p.y - Math.max(0, top), tip: on ? tr("stars.pillar.lit") : tr("stars.pillar"), pillar: p.i + 1 });
    /* la vasque, pendue à trois cordes, en avant du pilier */
    const vx = p.x, vy = Math.max(26, top - 26 * p.s), vr = 11 * p.s;
    ctx.strokeStyle = rgba(120, 110, 95, 0.55); ctx.lineWidth = 0.8; for (const dx of [-vr * 0.9, 0, vr * 0.9]) { ctx.beginPath(); ctx.moveTo(vx + dx * 0.15, 0); ctx.lineTo(vx + dx, vy - 2); ctx.stroke(); }
    if (on) { const fg = ctx.createRadialGradient(vx, vy - 4, 1, vx, vy - 4, vr * 3.2); fg.addColorStop(0, blue(0.5, 1.2)); fg.addColorStop(1, blue(0)); ctx.fillStyle = fg; ctx.fillRect(vx - vr * 3.2, vy - vr * 3.2, vr * 6.4, vr * 6.4);
      for (let k = 0; k < 3; k++) { const fl2 = Math.sin(t * 5 + k * 2 + p.i) * 0.2; ctx.fillStyle = blue(0.75 - k * 0.18, 1.25); ctx.beginPath(); ctx.moveTo(vx - vr * (0.5 - k * 0.12), vy - 1); ctx.quadraticCurveTo(vx + fl2 * vr, vy - vr * (1.2 - k * 0.25), vx + vr * (0.5 - k * 0.12), vy - 1); ctx.closePath(); ctx.fill(); }
      for (let k = 0; k < 6; k++) { const pp = (t * 0.18 + q("vf" + p.i + k)) % 1; ctx.fillStyle = rgba(200, 220, 255, 0.7 * (1 - pp)); ctx.fillRect(vx + (q("vx" + p.i + k) - 0.5) * vr * 1.4, vy + 4 + pp * 70 * p.s, 1, 1); } } /* des poussières tombent de la vasque */
    ctx.fillStyle = "#2a2a30"; ctx.beginPath(); ctx.ellipse(vx, vy, vr, vr * 0.32, 0, 0, Math.PI); ctx.quadraticCurveTo(vx, vy + vr * 1.1, vx + vr, vy); ctx.fill();
    ctx.fillStyle = on ? "#3a4258" : "#24252c"; ctx.beginPath(); ctx.ellipse(vx, vy, vr, vr * 0.3, 0, 0, TAU); ctx.fill();
    r.hot.push({ x: vx - vr, y: vy - vr * 0.6, w: vr * 2, h: vr * 1.4, tip: on ? tr("stars.basin.lit") : tr("stars.basin") });
  }
  const v = ctx.createRadialGradient(W / 2, H * 0.6, 160, W / 2, H * 0.6, 420); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  require("./relto-atelier").backButton(r, ctx, tr("stars.back"), "cavebottom");
  require("./relto-hall").backEdge(r, ctx, "fissure", tr("stars.floor"));
  void sc; void sky;
}

/** Regarder le sol : penché au bord de la fissure. */
function drawFissure(r, ctx, sc, sky, t) {
  const tr = TR(r), cx = 330, cy = 140;
  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 420); bg.addColorStop(0, "#0c1638"); bg.addColorStop(0.5, "#050a1e"); bg.addColorStop(1, "#010208"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (const [x, y, rr, col] of [[392, 128, 120, [120, 80, 200]], [300, 176, 90, [70, 130, 230]], [356, 150, 50, [220, 170, 255]]]) { const g = ctx.createRadialGradient(x, y, 2, x, y, rr); g.addColorStop(0, rgba(col[0], col[1], col[2], 0.22)); g.addColorStop(1, rgba(col[0], col[1], col[2], 0)); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); } /* la nébuleuse, loin */
  for (let i = 0; i < 260; i++) { const x = q("fx" + i) * W, y = q("fy" + i) * H, s = q("fs" + i), tw = 0.5 + 0.5 * Math.sin(t * (0.6 + s * 2) + i); ctx.fillStyle = rgba(225, 235, 255, (0.25 + 0.6 * s) * tw); ctx.fillRect(x, y, s > 0.92 ? 1.6 : 1, s > 0.92 ? 1.6 : 1); }
  /* les poussières qui montent vers nous : elles grossissent en approchant */
  for (let i = 0; i < 90; i++) { const a = q("pa" + i) * TAU, p = (t * (0.04 + q("pv" + i) * 0.05) + q("pw" + i)) % 1, d = p * p * 420, x = cx + Math.cos(a) * d * (0.6 + q("pr" + i) * 0.5), y = cy + Math.sin(a) * d * 0.62, s = 0.4 + p * 2.6;
    ctx.fillStyle = rgba(215, 230, 255, Math.min(1, p * 1.6) * (1 - p * 0.3) * 0.9); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
  r.hot.push({ x: 240, y: 30, w: 180, h: 260, tip: tr("fissure.void") });
  /* les bords de roche, en silhouette tout autour ; la lumière bleue d'en bas sur leurs arêtes */
  const rim = [[0, 0], [W, 0], [W, H], [0, H], [0, 0], [306, -4], [330, 10], [346, 4], [356, 36], [376, 58], [372, 96], [404, 128], [398, 168], [432, 206], [424, 250], [456, 290], [420, 330], [404, 368], [262, 368], [234, 326], [196, 292], [220, 254], [212, 214], [242, 176], [238, 138], [266, 104], [262, 66], [286, 40], [284, 8], [306, -4]];
  const rock = ctx.createLinearGradient(0, 0, 0, H); rock.addColorStop(0, "#07080d"); rock.addColorStop(1, "#11131b"); ctx.fillStyle = rock;
  ctx.beginPath(); rim.slice(0, 5).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = rim.length - 1; i >= 5; i--) ctx.lineTo(rim[i][0], rim[i][1]); ctx.closePath(); ctx.fill("evenodd");
  ctx.save(); ctx.beginPath(); rim.slice(0, 5).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = rim.length - 1; i >= 5; i--) ctx.lineTo(rim[i][0], rim[i][1]); ctx.closePath(); ctx.clip("evenodd");
  for (const [wd, al] of [[46, 0.05], [24, 0.08], [10, 0.14]]) { ctx.strokeStyle = blue(al); ctx.lineWidth = wd; ctx.lineJoin = "round"; ctx.beginPath(); rim.slice(5).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); } /* la lumière d'en bas sur la roche, près du bord */
  for (let i = 0; i < 26; i++) { const x = q("sx" + i) * W, y = q("sy" + i) * H, g = ctx.createRadialGradient(x, y, 2, x, y, 30 + q("sr" + i) * 40); g.addColorStop(0, rgba(40, 46, 64, 0.35)); g.addColorStop(1, rgba(40, 46, 64, 0)); ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140); } /* le relief de la roche */
  ctx.restore();
  ctx.strokeStyle = blue(0.45, 1.2); ctx.lineWidth = 1.4; ctx.beginPath(); rim.slice(5).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  for (let i = 0; i < 18; i++) { const k = 5 + Math.floor(q("rk" + i) * (rim.length - 6)), [x, y] = rim[k], dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1; ctx.strokeStyle = rgba(40, 46, 66, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + (dx / L) * 6, y + (dy / L) * 6); ctx.lineTo(x + (dx / L) * (20 + q("rl" + i) * 30), y + (dy / L) * (20 + q("rl" + i) * 30)); ctx.stroke(); } /* des cassures dans la roche */
  /* nos deux bottes, au bord */
  for (const [x, rot] of [[214, 0.18], [452, -0.16]]) { /* un pied de chaque côté, sur la roche */
    ctx.save(); ctx.translate(x, H + 6); ctx.rotate(rot);
    const bg2 = ctx.createLinearGradient(-24, 0, 24, 0); bg2.addColorStop(0, "#1c140e"); bg2.addColorStop(0.5, "#3a2a1c"); bg2.addColorStop(1, "#160f0a"); ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-20, -40); ctx.quadraticCurveTo(-18, -62, 0, -64); ctx.quadraticCurveTo(18, -62, 20, -40); ctx.lineTo(22, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0e0a07"; ctx.fillRect(-23, -6, 46, 6); /* la semelle */
    ctx.strokeStyle = blue(0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, -46); ctx.quadraticCurveTo(0, -66, 17, -46); ctx.stroke(); /* la lueur d'en bas sur le bout */
    ctx.restore();
  }
  require("./relto-atelier").backButton(r, ctx, tr("fissure.back"), "stars");
  void sc; void sky;
}

module.exports = { gate, drawStars, drawFissure, GATE, PILLARS };
