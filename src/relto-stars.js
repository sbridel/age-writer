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

/** Le pied de la paroi : une ligne de roche irrégulière autour de la salle (y en fonction de x). */
const footY = (x) => { const u = (x - 320) / 360; return 300 - 86 * Math.sqrt(Math.max(0, 1 - u * u)) + (q("ft" + Math.round(x / 16)) - 0.5) * 9; };
const VIOLET = [150, 118, 255];
const violet = (a) => rgba(VIOLET[0], VIOLET[1], VIOLET[2], a);
/** Une masse de roche : un polygone irrégulier, plus clair en bas (la lumière vient de la fissure, d'en bas). */
function rock(ctx, x, y, w, h, key, a = 1) {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, rgba(14, 15, 28, 0.55 * a)); g.addColorStop(1, rgba(48, 58, 96, 0.32 * a)); ctx.fillStyle = g; ctx.beginPath();
  for (let k = 0; k < 9; k++) { const an = (k / 9) * TAU, rr = 0.7 + q(key + "r" + k) * 0.4, px = x + Math.cos(an) * w / 2 * rr, py = y + Math.sin(an) * h / 2 * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill();
}

/** Un contour lissé : les points sont joints par des courbes passant par leurs milieux. */
function smooth(ctx, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const c = pts[i], m = mid(c, pts[(i + 1) % n]); ctx.quadraticCurveTo(c[0], c[1], m[0], m[1]); }
  ctx.closePath();
}

/**
 * Deux silhouettes, vues de profil ou de trois quarts dos, tournées vers la droite (la fissure) ; (x, y) = leurs pieds.
 * 0 : accroupie sur les talons, l'échine en C, la grosse tête basse et avancée, un bras long qui descend jusqu'au sol, trois
 * longs doigts posés. 1 : plus loin, penchée au bord, le cou tendu vers le vide, le dos presque à l'horizontale.
 * Une masse noire, sans museau ni visage ; la lumière d'en bas ne fait qu'un liseré (échine, crâne, avant-bras). Elles ne
 * bougent pas, elles respirent (l'échine monte et descend de moins d'un pixel). `lean` : 1 = regarde à droite, -1 = en miroir.
 */
const FIGS = [
  { pts: [[-6, 0], [-11, -4], [-13, -12], [-12, -22], [-8, -31], [-3, -38], [3, -36], [7, -41], [13, -44], [18, -40], [20, -34], [16, -29], [11, -29], [11, -24], [17, -17], [22, -9], [27, 0], [23, 0], [18, -8], [12, -12], [6, -12], [7, 0]], rim: [4, 5, 6, 7, 8, 9, 10], hand: [24, 0] },
  { pts: [[-9, 0], [-14, -5], [-15, -12], [-11, -19], [-4, -24], [3, -28], [8, -25], [13, -28], [19, -29], [24, -25], [24, -19], [20, -15], [15, -16], [16, -9], [20, -4], [25, 0], [21, 0], [14, -6], [8, -8], [2, -8], [3, 0]], rim: [4, 5, 6, 7, 8, 9, 10], hand: [22, 0] },
];
function bahroShadow(ctx, x, y, s, lean, t, which = 0) {
  const F0 = FIGS[which % FIGS.length], br = 1 + 0.014 * Math.sin(t * 0.5);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * lean, s);
  const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); sg.addColorStop(0, "rgba(0,0,0,0.55)"); sg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(2, 1, 34, 6, 0, 0, TAU); ctx.fill(); /* son ombre au sol */
  ctx.save(); ctx.scale(1, br);
  ctx.fillStyle = "rgba(3,4,9,0.97)"; smooth(ctx, F0.pts); ctx.fill();
  ctx.strokeStyle = "rgba(3,4,9,0.97)"; ctx.lineCap = "round"; ctx.lineWidth = 1.5; const [hx, hy] = F0.hand; for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(hx - 1, hy - 1); ctx.lineTo(hx + 4 + f * 3, hy + 0.5 - f * 0.4); ctx.stroke(); } /* trois longs doigts posés */
  ctx.strokeStyle = blue(0.5); ctx.lineWidth = 0.9; ctx.beginPath(); F0.rim.forEach((i, k) => { const a = F0.pts[i], b = F0.pts[(i + 1) % F0.pts.length], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; k ? ctx.lineTo(m[0], m[1]) : ctx.moveTo(m[0], m[1]); }); ctx.stroke(); /* le liseré : échine, crâne */
  ctx.restore(); ctx.restore();
}

/**
 * Un pilier (l'auteur : retoucher le premier, droit et trapu, gravé de haut en bas — pas un totem qui ondule) : un fût qui
 * s'amincit à peine et se renfle au premier tiers, le pied qui fond dans la roche du sol, le haut rugueux, et sur tout le fût
 * des bandes gravées (des chevrons, des points, des losanges) entre lesquelles s'insèrent trois de nos signes. Une coupe en
 * haut, entre deux cornes courtes et épaisses. Les gravures luisent bleu quand la vasque au-dessus est allumée.
 * Renvoie { top (le haut de la coupe), w }.
 */
function pillar(ctx, p, on, hov, t, signs) {
  const s = p.s, hgt = 82 * s, w = 14 * s, side = p.x < 320 ? 1 : p.x > 320 ? -1 : 0, jit = (k) => (q("pj" + p.i + k) - 0.5);
  const wd = (v) => w * (1 - 0.14 * v + 0.07 * Math.sin(Math.min(1, v * 1.5) * Math.PI)) + jit(Math.round(v * 24)) * w * 0.07; /* un fût qui s'amincit à peine, renflé au premier tiers, aux bords un peu rugueux */
  const N = 24, Lp = [], Rp = []; for (let k = 0; k <= N; k++) { const v = k / N, y = p.y - v * hgt, flare = v < 0.1 ? (0.1 - v) * 4 * w : 0; Lp.push([p.x - wd(v) - flare, y]); Rp.push([p.x + wd(v) + flare, y]); }
  const body = () => { ctx.beginPath(); Lp.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let k = Rp.length - 1; k >= 0; k--) ctx.lineTo(Rp[k][0], Rp[k][1]); ctx.closePath(); };
  ctx.fillStyle = "#151824"; for (let k = 0; k < 6; k++) { const dx = (k - 2.5) * w * 0.8 + jit(k) * w * 0.5; ctx.beginPath(); ctx.ellipse(p.x + dx, p.y + 1.5 * s, w * (0.5 + q("pr" + p.i + k) * 0.5), 2.6 * s, 0, 0, TAU); ctx.fill(); } /* le pied fond dans la roche du sol */
  const pg = ctx.createLinearGradient(p.x - w * 1.1, 0, p.x + w * 1.1, 0); pg.addColorStop(0, side > 0 ? "#13161f" : "#1d2131"); pg.addColorStop(0.5, hov ? "#383d52" : "#282c3e"); pg.addColorStop(1, side < 0 ? "#13161f" : "#1d2131"); ctx.fillStyle = pg; body(); ctx.fill();
  ctx.save(); body(); ctx.clip();
  const lb = ctx.createLinearGradient(p.x - side * w, 0, p.x + side * w * 1.2, 0); lb.addColorStop(0, blue(0)); lb.addColorStop(1, blue(0.26)); ctx.fillStyle = lb; ctx.fillRect(p.x - w * 2, p.y - hgt, w * 4, hgt); /* la fissure éclaire le flanc qui la regarde */
  const ink = on ? rgba(170, 200, 255, 0.92) : rgba(150, 160, 190, 0.32), lw = Math.max(0.8, 1.05 * s); ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const BANDS = [0.1, 0.19, 0.3, 0.41, 0.5, 0.6, 0.7, 0.8, 0.9]; /* les lignes qui font le tour du fût, un peu courbes (on voit le dessus) */
  for (const v of BANDS) { const y = p.y - v * hgt; ctx.beginPath(); ctx.ellipse(p.x, y, wd(v), 1.7 * s, 0, 0, Math.PI); ctx.stroke(); }
  const rowAt = (a, b, kind) => { const v = (a + b) / 2, y = p.y - v * hgt + 1 * s, ww = wd(v) * 0.82, hh = (b - a) * hgt * 0.32;
    if (kind === 0) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const x = p.x - ww + (k / 8) * ww * 2; ctx.lineTo(x, y + (k % 2 ? -hh : hh)); } ctx.stroke(); } /* des chevrons */
    else if (kind === 1) { for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(p.x - ww + (k / 6) * ww * 2, y, 0.9 * s, 0, TAU); ctx.fill(); } } /* des points */
    else { for (let k = 0; k < 4; k++) { const x = p.x - ww * 0.75 + (k / 3) * ww * 1.5; ctx.beginPath(); ctx.moveTo(x - 2.4 * s, y); ctx.lineTo(x, y - hh * 1.2); ctx.lineTo(x + 2.4 * s, y); ctx.lineTo(x, y + hh * 1.2); ctx.closePath(); ctx.stroke(); } } }; /* des losanges */
  rowAt(0.1, 0.19, 1); rowAt(0.41, 0.5, 0); rowAt(0.6, 0.7, 2); rowAt(0.8, 0.9, 1);
  if (on) { const g = ctx.createLinearGradient(0, p.y, 0, p.y - hgt); g.addColorStop(0, blue(0.2)); g.addColorStop(1, blue(0.04)); ctx.fillStyle = g; ctx.fillRect(p.x - w * 2, p.y - hgt, w * 4, hgt); }
  ctx.restore();
  for (let k = 0; k < 3; k++) { const id = signs.length ? signs[(p.i * 3 + k) % signs.length] : F.ELEMENTS[(p.i * 5 + k * 7) % F.ELEMENTS.length], v = [0.245, 0.355, 0.75][k]; carved(ctx, id, p.x, p.y - v * hgt, 3.8 * s, on ? 0.8 + 0.2 * Math.sin(t * 1.1 + k) : 0, "pil" + p.i + k); } /* trois de nos signes, entre les bandes */
  /* le sommet : rugueux, une coupe, deux cornes courtes et épaisses */
  const ty = p.y - hgt, cw = w * 1.12;
  ctx.fillStyle = "#1c2030"; ctx.beginPath(); ctx.moveTo(p.x - wd(1), ty + 1); for (let k = 0; k <= 5; k++) ctx.lineTo(p.x - cw + (k / 5) * cw * 2, ty - 7 * s - (k % 2 ? 2.5 : 0) * s - q("pt" + p.i + k) * 2 * s); ctx.lineTo(p.x + wd(1), ty + 1); ctx.closePath(); ctx.fill(); /* le haut est rugueux */
  ctx.fillStyle = on ? "#2c3658" : "#0b0d15"; ctx.beginPath(); ctx.ellipse(p.x, ty - 8 * s, cw * 0.88, 2.4 * s, 0, 0, TAU); ctx.fill();
  if (on) { const eg = ctx.createRadialGradient(p.x, ty - 9 * s, 1, p.x, ty - 9 * s, cw * 2); eg.addColorStop(0, violet(0.45)); eg.addColorStop(1, violet(0)); ctx.fillStyle = eg; ctx.fillRect(p.x - cw * 2, ty - 9 * s - cw * 2, cw * 4, cw * 4); } /* une braise violette dans la coupe */
  for (const sg of [-1, 1]) { ctx.strokeStyle = "#232738"; ctx.lineCap = "round"; ctx.lineWidth = 4.4 * s; ctx.beginPath(); ctx.moveTo(p.x + sg * cw * 0.85, ty - 5 * s); ctx.quadraticCurveTo(p.x + sg * cw * 1.45, ty - 7 * s, p.x + sg * cw * 1.4, ty - 14 * s); ctx.stroke();
    ctx.strokeStyle = "#7d7a70"; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(p.x + sg * cw * 1.4, ty - 12 * s); ctx.lineTo(p.x + sg * cw * 1.38, ty - 14.5 * s); ctx.stroke(); } /* deux cornes, courtes, épaisses, pâles au bout */
  return { top: ty - 9 * s, w };
}

/**
 * Le lustre (l'auteur l'aime, dans ses images ; rien de copié) : sous la voûte, au-dessus de la fissure, une couronne de pointes
 * recourbées, pâles comme de l'os, autour d'un globe de lumière bleue, pendue à une chaîne. Il s'allume quand quelqu'un vient
 * (le lac au degré 2 et plus) ; éteint, un globe noir et des pointes dans l'ombre.
 */
function chandelier(ctx, degree, t) {
  const x = 320, y = 76, on = degree >= 2 ? (degree >= 3 ? 1 : 0.6) : 0, pulse = 0.88 + 0.12 * Math.sin(t * 0.9);
  ctx.strokeStyle = rgba(90, 90, 100, 0.8); ctx.lineWidth = 1; for (let yy = 40; yy < y - 10; yy += 4) { ctx.beginPath(); ctx.ellipse(x, yy, 1, 2, 0, 0, TAU); ctx.stroke(); } /* la chaîne, depuis la voûte */
  if (on) { const g = ctx.createRadialGradient(x, y, 2, x, y, 120); g.addColorStop(0, rgba(200, 225, 255, 0.35 * on * pulse)); g.addColorStop(0.4, blue(0.12 * on)); g.addColorStop(1, blue(0)); ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 240, 240); }
  for (let i = 0; i < 16; i++) { /* un éclat de pointes effilées, dans tous les sens : sombres comme de la pierre, la lumière au bout */
    const a = (i / 16) * TAU + q("cha" + i) * 0.3, up = -Math.sin(a), len = (16 + q("chl" + i) * 22) * (up > 0 ? 1.15 : 0.85), dx = Math.cos(a), dy = Math.sin(a) * 0.75, back = (i % 3) === 1;
    const tx = x + dx * len, ty = y + dy * len, nx = -dy, ny = dx, b0 = 2.4;
    ctx.globalAlpha = back ? 0.6 : 1; ctx.fillStyle = "#1e1f28"; ctx.beginPath(); ctx.moveTo(x + nx * b0, y + ny * b0); ctx.lineTo(tx, ty); ctx.lineTo(x - nx * b0, y - ny * b0); ctx.closePath(); ctx.fill();
    if (on) { const tg = ctx.createLinearGradient(x, y, tx, ty); tg.addColorStop(0.55, blue(0)); tg.addColorStop(1, rgba(220, 235, 255, 0.85 * on)); ctx.strokeStyle = tg; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + dx * len * 0.5, y + dy * len * 0.5); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = on ? rgba(225, 240, 255, 0.95 * on * pulse) : "#0a0b12"; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill(); /* le globe */
  if (on) { ctx.fillStyle = rgba(255, 255, 255, 0.9 * on); ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2.2, 0, TAU); ctx.fill(); }
}

function drawStars(r, ctx, sc, sky, t) {
  const tr = TR(r), degree = degreeOf(r), lit = degree >= 3 ? [0, 1, 2, 3, 4] : degree >= 2 ? [0, 2] : [], FR = require("./relto-fresco");
  /* la paroi : de la roche en masses, une caverne qui se referme autour de nous ; la lumière monte de la fissure */
  const bg = ctx.createLinearGradient(0, 0, 0, 260); bg.addColorStop(0, "#04030a"); bg.addColorStop(1, "#0d1022"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 38; i++) { const x = q("mx" + i) * W, y = 20 + q("my" + i) * 220, w = 50 + q("mw" + i) * 120, h = 30 + q("mh" + i) * 70; rock(ctx, x, y, w, h, "m" + i); }
  ctx.strokeStyle = rgba(80, 92, 140, 0.13); ctx.lineWidth = 1; for (let i = 0; i < 16; i++) { let x = q("sx" + i) * W, y = 40 + q("sy" + i) * 180; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 14 + q("sk" + i + k) * 18; y += (q("sl" + i + k) - 0.5) * 8; ctx.lineTo(x, y); } ctx.stroke(); } /* des strates rompues */
  /* la voûte : une masse sombre hérissée au centre, et des stalactites tout autour */
  ctx.fillStyle = "#05050b"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 24);
  for (let x = W; x >= 0; x -= 14) { const near = 1 - Math.min(1, Math.abs(x - 320) / 170), len = 8 + near * 46 + q("st" + x) * (14 + near * 30); ctx.lineTo(x - 3, 22 + near * 18); ctx.lineTo(x - 7, 22 + len); ctx.lineTo(x - 11, 22 + near * 18); }
  ctx.lineTo(0, 24); ctx.closePath(); ctx.fill();
  chandelier(ctx, degree, t); /* le lustre, sous la voûte */
  /* la bouche sombre, dans un angle : là d'où l'on vient */
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(52, 64); ctx.quadraticCurveTo(70, 40, 98, 52); ctx.lineTo(110, 112); ctx.quadraticCurveTo(84, 124, 56, 112); ctx.closePath(); ctx.fill();
  /* ce qu'ils ont peint : des figures à l'ocre, à demi effacées ; et les mains soufflées */
  for (const [id, x, y, s] of [["chained", 150, 148, 13], ["cry", 506, 132, 14], ["eye", 402, 104, 11], ["serpent", 236, 176, 12], ["stonesign", 586, 176, 11]]) FR.sign(ctx, id, x, y, s, 0.38, "starspaint" + id);
  for (const [x, y, rot] of [[214, 124, -0.25], [446, 150, 0.2], [262, 98, 0.1]]) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 24); g.addColorStop(0, rgba(200, 112, 46, 0.42)); g.addColorStop(0.65, rgba(200, 112, 46, 0.2)); g.addColorStop(1, rgba(200, 112, 46, 0)); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = "#0a0c16"; ctx.beginPath(); ctx.ellipse(0, 3, 6, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#0a0c16"; ctx.lineWidth = 3.4; ctx.lineCap = "round"; for (let f = 0; f < 5; f++) { const a = -2.6 + f * 0.43, l = f === 0 ? 11 : 15; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, 3 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * l, 3 + Math.sin(a) * l); ctx.stroke(); } ctx.restore();
    r.hot.push({ x: x - 18, y: y - 18, w: 36, h: 36, tip: tr("stars.hands") });
  }
  /* le sol : de la roche, pas des dalles ; un rebord en gradin au fond, des bosses, des fêlures */
  const floor = () => { ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, footY(x)); ctx.lineTo(W, H); ctx.closePath(); };
  const fl = ctx.createLinearGradient(0, 210, 0, H); fl.addColorStop(0, "#12162a"); fl.addColorStop(1, "#1e2438"); ctx.fillStyle = fl; floor(); ctx.fill();
  ctx.save(); floor(); ctx.clip();
  { const ledge = (dy) => { ctx.beginPath(); for (let x = 0; x <= W; x += 16) { const y = footY(x) + dy * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - ((x - 320) / 360) ** 2))); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
    ctx.fillStyle = rgba(6, 8, 16, 0.55); ledge(0); for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, footY(x) + 16 * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - ((x - 320) / 360) ** 2)))); ctx.closePath(); ctx.fill(); /* la face du gradin, dans l'ombre */
    ctx.strokeStyle = rgba(110, 130, 190, 0.28); ctx.lineWidth = 1.4; ledge(0); ctx.stroke(); ctx.strokeStyle = rgba(110, 130, 190, 0.16); ctx.lineWidth = 1; ledge(16); ctx.stroke(); } /* son arête, et son pied */
  for (let i = 0; i < 26; i++) { const x = q("bx" + i) * W, y = 236 + q("by" + i) * 120; if (Math.abs(x - 320) < 46 + (y - 222) * 0.4) continue; const w = 30 + q("bw" + i) * 70, h = 8 + q("bh" + i) * 16, g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2), toward = x < 320 ? 1 : -1;
    g.addColorStop(0, rgba(70, 86, 130, 0.22)); g.addColorStop(1, rgba(4, 6, 12, 0.35)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, toward * 0.08, 0, TAU); ctx.fill(); } /* des bosses de roche, éclairées du côté de la fissure */
  ctx.strokeStyle = rgba(4, 6, 12, 0.55); ctx.lineWidth = 1.1; for (let i = 0; i < 18; i++) { let x = q("cx" + i) * W, y = 240 + q("cy" + i) * 110; if (Math.abs(x - 320) < 60) continue; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (x < 320 ? -1 : 1) * (8 + q("cs" + i + k) * 14); y += (q("cv" + i + k) - 0.3) * 9; ctx.lineTo(x, y); } ctx.stroke(); } /* des fêlures qui partent de la fissure */
  ctx.restore();
  /* la fissure, au sol : large devant, étroite au fond ; la lumière bleue et les poussières d'étoiles en montent */
  const glow = ctx.createRadialGradient(320, 300, 10, 320, 300, 240); glow.addColorStop(0, blue(0.32)); glow.addColorStop(1, blue(0)); ctx.fillStyle = glow; ctx.fillRect(0, 160, W, H - 160);
  const crack = () => { ctx.beginPath(); FISSURE_L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let i = FISSURE_R.length - 1; i >= 0; i--) ctx.lineTo(FISSURE_R[i][0], FISSURE_R[i][1]); ctx.closePath(); };
  const cg = ctx.createLinearGradient(320, 222, 320, H); cg.addColorStop(0, blue(0.9, 1.3)); cg.addColorStop(0.4, blue(0.85)); cg.addColorStop(1, "#0a1630"); ctx.fillStyle = cg; crack(); ctx.fill();
  ctx.save(); crack(); ctx.clip(); for (let i = 0; i < 40; i++) { const x = 270 + q("cs" + i) * 100, y = 222 + q("ct" + i) * 140; ctx.fillStyle = rgba(230, 240, 255, 0.4 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))); ctx.fillRect(x, y, 1, 1); } ctx.restore(); /* le vide, en bas */
  ctx.strokeStyle = blue(0.55, 1.2); ctx.lineWidth = 1; crack(); ctx.stroke();
  r.hot.push({ x: 268, y: 222, w: 106, h: 138, tip: tr("stars.crack") });
  /* au degré 3, deux d'entre eux, de dos, accroupis au bord de la fissure (des ombres : jamais de détail) */
  if (degree >= 3) { bahroShadow(ctx, 256, 272, 1, 1, t, 0); bahroShadow(ctx, 392, 258, 0.78, -1, t + 2.1, 1); }
  /* les poussières d'étoiles qui montent de la fissure */
  for (let i = 0; i < 70; i++) { const u = q("du" + i), p = (t * (0.05 + q("dv" + i) * 0.06) + q("dw" + i)) % 1, yb = 222 + u * 138, half = 4 + u * 46, x = 320 + (q("dx" + i) - 0.5) * 2 * half + Math.sin(t * 0.7 + i) * 6 * p, y = yb - p * (120 + u * 140), a = (1 - p) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7)));
    ctx.fillStyle = rgba(215, 230, 255, 0.85 * a); ctx.beginPath(); ctx.arc(x, y, 0.6 + u * 1.1, 0, TAU); ctx.fill(); }
  /* les cinq piliers, du fond vers nous : un fût droit gravé de haut en bas, une coupe à deux cornes courtes ; les vasques au-dessus */
  const signs = F.itemsOf((r.scene && r.scene.ages) || [], {}).filter((it) => it.kind === "age").slice(-15).flatMap((it) => it.parts.slice(0, 1));
  for (const p of PILLARS.slice().sort((a, b) => a.y - b.y)) {
    const on = lit.includes(p.i), hov = r.hover && r.hover.pillar === p.i + 1, T = pillar(ctx, p, on, hov, t, signs);
    const cyy = T.top;
    r.hot.push({ x: p.x - T.w * 2.4, y: cyy - 22 * p.s, w: T.w * 4.8, h: p.y - cyy + 22 * p.s, tip: on ? tr("stars.pillar.lit") : tr("stars.pillar"), pillar: p.i + 1 });
    /* la vasque, pendue à trois cordes sous la voûte, au-dessus du pilier : flamme bleu-violet */
    const vr = 10 * p.s, vx = p.x, vy = Math.max(70, cyy - 30 - 34 * p.s);
    ctx.strokeStyle = rgba(120, 110, 95, 0.5); ctx.lineWidth = 0.8; for (const dx of [-vr * 0.9, 0, vr * 0.9]) { ctx.beginPath(); ctx.moveTo(vx + dx * 0.15, 20); ctx.lineTo(vx + dx, vy - 2); ctx.stroke(); }
    if (on) { const fg = ctx.createRadialGradient(vx, vy - 4, 1, vx, vy - 4, vr * 4); fg.addColorStop(0, violet(0.42)); fg.addColorStop(0.5, blue(0.18)); fg.addColorStop(1, blue(0)); ctx.fillStyle = fg; ctx.fillRect(vx - vr * 4, vy - vr * 4, vr * 8, vr * 8);
      for (let k = 0; k < 3; k++) { const fl2 = Math.sin(t * 5 + k * 2 + p.i) * 0.2; ctx.fillStyle = k === 2 ? rgba(220, 230, 255, 0.8) : k ? violet(0.7) : blue(0.75, 1.2); ctx.beginPath(); ctx.moveTo(vx - vr * (0.55 - k * 0.14), vy - 1); ctx.quadraticCurveTo(vx + fl2 * vr, vy - vr * (1.3 - k * 0.3), vx + vr * (0.55 - k * 0.14), vy - 1); ctx.closePath(); ctx.fill(); }
      for (let k = 0; k < 8; k++) { const pp = (t * 0.16 + q("vf" + p.i + k)) % 1; ctx.fillStyle = rgba(200, 200, 255, 0.7 * (1 - pp)); ctx.fillRect(vx + (q("vx" + p.i + k) - 0.5) * vr * 1.4, vy + 4 + pp * 80 * p.s, 1, 1); } } /* des poussières tombent de la vasque */
    ctx.fillStyle = "#26262e"; ctx.beginPath(); ctx.ellipse(vx, vy, vr, vr * 0.32, 0, 0, Math.PI); ctx.quadraticCurveTo(vx, vy + vr * 1.1, vx + vr, vy); ctx.fill();
    ctx.fillStyle = on ? "#3a3a62" : "#202128"; ctx.beginPath(); ctx.ellipse(vx, vy, vr, vr * 0.3, 0, 0, TAU); ctx.fill();
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

module.exports = { gate, drawStars, drawFissure, GATE, PILLARS, bahroShadow };
