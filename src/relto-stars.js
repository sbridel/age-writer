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

/**
 * L'un d'eux, de dos, accroupi : assis sur les talons, les genoux qui dépassent, un torse en V (épaules plus larges que les
 * hanches, omoplates saillantes), la tête basse enfoncée vers l'avant, de longs bras maigres aux coudes écartés, les mains à
 * longs doigts posées au sol ; `lean` (-1 / 1) : le côté de la fissure, vers lequel une main se tend. Une silhouette, un liseré
 * bleu sur les arêtes (la lumière vient d'en bas), une ombre douce au sol. (x, y) : entre ses pieds.
 */
function bahroShadow(ctx, x, y, s, lean, t) {
  const br = Math.sin(t * 0.5) * 0.6, dk = "rgba(3,4,10,0.96)", L = -lean; /* L : le côté opposé à la fissure */
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (lean > 0 ? -1 : 1), s); /* la même figure, en miroir selon le côté */
  const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, 30); sg.addColorStop(0, "rgba(0,0,0,0.5)"); sg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 1, 30, 6, 0, 0, TAU); ctx.fill(); /* son ombre au sol */
  const body = () => { ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-17, -6, -13, -12); ctx.lineTo(-17, -31 + br); ctx.lineTo(-11, -40 + br); ctx.quadraticCurveTo(-5, -44 + br, -3, -41 + br); ctx.quadraticCurveTo(0, -48 + br, 4, -42 + br); ctx.quadraticCurveTo(8, -45 + br, 13, -40 + br); ctx.lineTo(18, -30 + br); ctx.lineTo(13, -12); ctx.quadraticCurveTo(17, -6, 12, 0); ctx.closePath(); };
  ctx.fillStyle = dk; body(); ctx.fill(); /* le dos : épaules hautes, la tête enfoncée entre elles */
  ctx.beginPath(); ctx.ellipse(-16, -3, 7, 4, -0.5, 0, TAU); ctx.ellipse(16, -3, 7, 4, 0.5, 0, TAU); ctx.fill(); /* les genoux qui dépassent, de chaque côté */
  ctx.strokeStyle = dk; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const arm = (sx, ex, ey, hx, hy, reach) => { ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(sx, -36 + br); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.lineWidth = 1.2; for (let f = 0; f < 4; f++) { const a = Math.PI / 2 + (hx > 0 ? -1 : 1) * (0.2 + f * 0.28) - (reach ? 0.9 : 0); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * 8 * (hx > 0 ? 1 : -1) * (reach ? -1 : 1), hy + Math.sin(a) * 6); ctx.stroke(); } }; /* bras maigres, coudes écartés, longs doigts */
  arm(-14, -27, -22 + br, -22, 0, false); arm(14, 30, -26 + br, 38, -6, true); /* une main posée, l'autre qui se tend vers la fissure */
  ctx.strokeStyle = blue(0.45); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-17, -31 + br); ctx.lineTo(-11, -40 + br); ctx.quadraticCurveTo(-5, -44 + br, -3, -41 + br); ctx.moveTo(4, -42 + br); ctx.quadraticCurveTo(8, -45 + br, 13, -40 + br); ctx.lineTo(18, -30 + br); ctx.stroke(); /* le liseré de lumière sur les épaules */
  ctx.strokeStyle = blue(0.3); ctx.beginPath(); ctx.moveTo(30, -26 + br); ctx.lineTo(38, -6); ctx.stroke(); /* sur le bras tendu, du côté de la lumière */
  ctx.strokeStyle = "rgba(40,50,80,0.5)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, -34 + br); ctx.quadraticCurveTo(-8, -28 + br, -5, -24 + br); ctx.moveTo(6, -34 + br); ctx.quadraticCurveTo(8, -28 + br, 5, -24 + br); ctx.moveTo(0, -38 + br); ctx.lineTo(0, -14); ctx.stroke(); /* les omoplates, l'échine */
  ctx.restore(); void L;
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
  if (degree >= 3) { bahroShadow(ctx, 262, 270, 1, -1, t); bahroShadow(ctx, 386, 262, 0.9, 1, t + 2.1); }
  /* les poussières d'étoiles qui montent de la fissure */
  for (let i = 0; i < 70; i++) { const u = q("du" + i), p = (t * (0.05 + q("dv" + i) * 0.06) + q("dw" + i)) % 1, yb = 222 + u * 138, half = 4 + u * 46, x = 320 + (q("dx" + i) - 0.5) * 2 * half + Math.sin(t * 0.7 + i) * 6 * p, y = yb - p * (120 + u * 140), a = (1 - p) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7)));
    ctx.fillStyle = rgba(215, 230, 255, 0.85 * a); ctx.beginPath(); ctx.arc(x, y, 0.6 + u * 1.1, 0, TAU); ctx.fill(); }
  /* les cinq totems, du fond vers nous : un tronc de pierre irrégulier, gravé de bandes et de nos signes, une coupe à deux cornes au sommet ; les vasques au-dessus */
  const signs = F.itemsOf((r.scene && r.scene.ages) || [], {}).filter((it) => it.kind === "age").slice(-15).flatMap((it) => it.parts.slice(0, 1));
  for (const p of PILLARS.slice().sort((a, b) => a.y - b.y)) {
    const on = lit.includes(p.i), hgt = 76 * p.s, w = 10 * p.s, top = p.y - hgt, hov = r.hover && r.hover.pillar === p.i + 1, side = p.x < 320 ? 1 : p.x > 320 ? -1 : 0, key = "tot" + p.i;
    const edge = (sgn) => { const pts = []; for (let k = 0; k <= 6; k++) { const v = k / 6, ww = w * (1.08 - 0.22 * v) * (0.9 + q(key + sgn + k) * 0.2); pts.push([p.x + sgn * ww, p.y - v * hgt]); } return pts; };
    const L0 = edge(-1), R0 = edge(1), body = () => { ctx.beginPath(); L0.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let k = R0.length - 1; k >= 0; k--) ctx.lineTo(R0[k][0], R0[k][1]); ctx.closePath(); };
    const pg = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0); pg.addColorStop(0, side > 0 ? "#141722" : "#1c2030"); pg.addColorStop(0.5, hov ? "#363b4e" : "#272b3c"); pg.addColorStop(1, side < 0 ? "#141722" : "#1c2030"); ctx.fillStyle = pg; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    const lb = ctx.createLinearGradient(p.x - side * w, 0, p.x + side * w, 0); lb.addColorStop(0, blue(0)); lb.addColorStop(1, blue(0.22)); ctx.fillStyle = lb; ctx.fillRect(p.x - w * 1.3, top, w * 2.6, hgt); /* la fissure éclaire le flanc qui la regarde */
    const ink = on ? rgba(180, 205, 255, 0.85) : rgba(150, 160, 190, 0.32); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, 1.1 * p.s); ctx.lineCap = "round";
    for (const v of [0.12, 0.55]) { const y = p.y - v * hgt; ctx.beginPath(); for (let k = 0; k <= 8; k++) { const x = p.x - w * 1.1 + (k / 8) * w * 2.2, yy = y + (k % 2 ? -3 : 3) * p.s; k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); } /* deux bandes en zigzag */
    { const cy = p.y - 0.34 * hgt; ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.3) { const rr = (a / (TAU * 2.2)) * w * 0.7; ctx.lineTo(p.x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8); } ctx.stroke(); } /* une spirale */
    ctx.restore();
    for (let k = 0; k < 2; k++) { const id = signs.length ? signs[(p.i * 2 + k) % signs.length] : F.ELEMENTS[(p.i * 5 + k * 7) % F.ELEMENTS.length]; carved(ctx, id, p.x, p.y - hgt * (0.72 + k * 0.14) + (k ? -2 : 0) * p.s, 4.6 * p.s, on ? 0.8 + 0.2 * Math.sin(t * 1.1 + k) : 0, "pil" + p.i + k); }
    /* la coupe au sommet, et ses deux cornes */
    const cw = w * 1.5, cyy = top - 2 * p.s; ctx.fillStyle = "#1a1d2a"; ctx.beginPath(); ctx.moveTo(p.x - w * 0.7, top + 2 * p.s); ctx.quadraticCurveTo(p.x - cw, cyy, p.x - cw, cyy - 3 * p.s); ctx.lineTo(p.x + cw, cyy - 3 * p.s); ctx.quadraticCurveTo(p.x + cw, cyy, p.x + w * 0.7, top + 2 * p.s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = on ? "#2e3a58" : "#0c0e16"; ctx.beginPath(); ctx.ellipse(p.x, cyy - 3 * p.s, cw * 0.92, 2.6 * p.s, 0, 0, TAU); ctx.fill();
    if (on) { const eg = ctx.createRadialGradient(p.x, cyy - 4 * p.s, 1, p.x, cyy - 4 * p.s, cw * 1.6); eg.addColorStop(0, violet(0.45)); eg.addColorStop(1, violet(0)); ctx.fillStyle = eg; ctx.fillRect(p.x - cw * 1.6, cyy - cw * 1.6, cw * 3.2, cw * 3.2); } /* une braise violette dans la coupe */
    ctx.strokeStyle = "#1a1d2a"; ctx.lineWidth = 2.4 * p.s; ctx.lineCap = "round"; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(p.x + sg * cw * 0.9, cyy - 3 * p.s); ctx.quadraticCurveTo(p.x + sg * cw * 1.5, cyy - 10 * p.s, p.x + sg * cw * 1.1, cyy - 18 * p.s); ctx.stroke(); }
    r.hot.push({ x: p.x - cw * 1.4, y: cyy - 20 * p.s, w: cw * 2.8, h: p.y - cyy + 20 * p.s, tip: on ? tr("stars.pillar.lit") : tr("stars.pillar"), pillar: p.i + 1 });
    /* la vasque, pendue à trois cordes sous la voûte, au-dessus du totem : flamme bleu-violet */
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

module.exports = { gate, drawStars, drawFissure, GATE, PILLARS };
