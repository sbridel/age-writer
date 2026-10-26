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

/** Un scarabée vivant, vu d'au-dessus : (x, y) son centre, `s` sa demi-longueur, `a` l'angle où il regarde. o : { walk (0 à 1 : il marche), glow, dull (terne, en cage) }.
 *  La même bête que l'encrier de l'atelier (src/relto-hear.js : chaperon à six dents, corselet grenu, élytres striés, pattes avant dentelées) :
 *  l'encrier a été taillé d'après eux. Mais le vivant ne se déguise jamais : une seule robe, vert-bronze irisé, sous tous les habillages (27 oct. 2026). */
const ROBE = { lo: "#0f1f18", mid: "#2c5a3e", hi: "#9cc77a", edge: "#b8925a", sheen: "#7a5aa0" }, DULL = { lo: "#24211c", mid: "#4a443a", hi: "#7a7262", edge: "#6a6252", sheen: null };
function beetle(ctx, x, y, s, a, t, o = {}) {
  const K = o.dull ? DULL : ROBE, walk = o.walk || 0, ph = o.gait != null ? o.gait : t * 9 + x * 0.3, lw = (k) => Math.max(0.5, s * k), sq = o.persp || 1;
  ctx.save(); ctx.translate(x, y - walk * Math.abs(Math.sin(ph)) * s * 0.05); if (sq !== 1) ctx.scale(1, sq); /* posé sur le sol en perspective : on le voit d'en haut, mais de biais ; en marchant, le corps se soulève à chaque pas */
  if (o.glow) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 3); g.addColorStop(0, rgba(120, 220, 190, 0.22 * o.glow)); g.addColorStop(1, rgba(120, 220, 190, 0)); ctx.fillStyle = g; ctx.fillRect(-s * 3, -s * 3, s * 6, s * 6); }
  if (!o.air) { const sh = ctx.createRadialGradient(s * 0.1, s * 0.15, 1, s * 0.1, s * 0.15, s * 1.15); sh.addColorStop(0, rgba(0, 0, 0, 0.55)); sh.addColorStop(0.6, rgba(0, 0, 0, 0.3)); sh.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.15, s * 1.2, s * 1.0, a, 0, TAU); ctx.fill(); } /* l'ombre portée, serrée sous le corps : il touche le sol */
  ctx.rotate(a - Math.PI / 2); /* on dessine comme l'encrier, la tête vers +y */
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const leg = (pts) => { const path = () => { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s))); }; ctx.strokeStyle = K.lo; ctx.lineWidth = lw(0.1); path(); ctx.stroke(); ctx.strokeStyle = rgba(160, 200, 150, 0.3); ctx.lineWidth = lw(0.03); path(); ctx.stroke(); }; /* chaque patte, avec son reflet */
  for (const sd of [-1, 1]) { const sw = (k) => walk * Math.sin(ph + ((k + (sd > 0 ? 1 : 0)) % 2) * Math.PI) * 0.18; /* le pas en trépied : avant et arrière d'un côté avec le milieu de l'autre */ /* six pattes en deux segments ; en marchant elles balaient */
    leg([[sd * 0.42, 0.38], [sd * 0.72, 0.5 + sw(0)], [sd * 0.76, 0.82 + sw(0)]]);
    ctx.strokeStyle = K.lo; ctx.lineWidth = lw(0.04); for (let k = 0; k < 3; k++) { const yy = s * (0.6 + k * 0.08 + sw(0)), xx = sd * s * 0.75; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + sd * s * 0.08, yy - s * 0.02); ctx.stroke(); } /* les dents des pattes avant, pour fouir */
    leg([[sd * 0.48, 0.0], [sd * 0.82, -0.06 + sw(1)], [sd * 0.9, -0.36 + sw(1)]]);
    leg([[sd * 0.42, -0.3], [sd * 0.72, -0.5 + sw(2)], [sd * 0.66, -0.86 + sw(2)]]); }
  ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  ctx.fillStyle = K.mid; ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.52); /* le chaperon, en éventail à six dents */
  for (let i = 0; i <= 12; i++) { const an = Math.PI * (0.1 + 0.8 * (i / 12)), rr = s * (i % 2 ? 0.36 : 0.31); ctx.lineTo(-Math.cos(an) * rr, s * 0.52 + Math.sin(an) * rr * 0.8); }
  ctx.lineTo(s * 0.3, s * 0.52); ctx.closePath(); ctx.fill(); ctx.strokeStyle = K.edge; ctx.lineWidth = lw(0.025); ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = K.lo; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * s * 0.27, s * 0.6, s * 0.05, s * 0.07, 0, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = K.lo; ctx.lineWidth = lw(0.035); for (const sd of [-1, 1]) { const tw = Math.sin(t * 3.1 + sd + x) * 0.08 + (Math.sin(t * 0.7 + x) > 0.85 ? Math.sin(t * 20) * 0.1 : 0), ex = sd * s * (0.42 + tw), ey = s * 0.86; ctx.beginPath(); ctx.moveTo(sd * s * 0.22, s * 0.62); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = K.mid; ctx.beginPath(); ctx.ellipse(ex, ey + s * 0.03, s * 0.05, s * 0.08, sd * 0.4, 0, TAU); ctx.fill(); } /* les antennes en massue, qui tâtent l'air */
  const pg = ctx.createRadialGradient(-s * 0.2, s * 0.24, 1, 0, s * 0.38, s * 0.7); pg.addColorStop(0, K.hi); pg.addColorStop(0.55, K.mid); pg.addColorStop(1, K.lo); /* le corselet, large, grenu */
  ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.14); ctx.bezierCurveTo(-s * 0.66, s * 0.42, -s * 0.5, s * 0.58, -s * 0.24, s * 0.58); ctx.lineTo(s * 0.24, s * 0.58); ctx.bezierCurveTo(s * 0.5, s * 0.58, s * 0.66, s * 0.42, s * 0.6, s * 0.14); ctx.closePath(); ctx.fill();
  if (s > 7) { ctx.fillStyle = rgba(0, 0, 0, 0.22); for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc((q("pr" + k) - 0.5) * s * 0.9, s * (0.24 + q("pv" + k) * 0.28), lw(0.014), 0, TAU); ctx.fill(); } }
  const fly = o.fly || 0;
  if (fly > 0) { /* l'abdomen, sous les élytres qui s'écartent : sombre, en anneaux */
    ctx.fillStyle = "#1a2a22"; ctx.beginPath(); ctx.ellipse(0, -s * 0.47, s * 0.44, s * 0.56, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(150, 120, 80, 0.35); ctx.lineWidth = lw(0.025); for (let k = 0; k < 5; k++) { const yy = -s * (0.12 + k * 0.17), hw = s * 0.42 * Math.sqrt(Math.max(0, 1 - ((yy + s * 0.47) / (s * 0.56)) ** 2)); ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.quadraticCurveTo(0, yy - s * 0.05, hw, yy); ctx.stroke(); } }
  if (fly > 0) for (const sd of [-1, 1]) { /* en vol : les ailes membraneuses, déployées sous les élytres, qui vibrent (on n'en voit que le flou) */
    const fl = 0.6 + 0.4 * Math.sin(t * 90 + sd), wa = sd * (0.9 + 0.25 * Math.sin(t * 70)) * fly;
    ctx.save(); ctx.translate(sd * s * 0.3, s * 0.05); ctx.rotate(wa); ctx.fillStyle = rgba(225, 235, 230, 0.28 * fl * fly); ctx.strokeStyle = rgba(60, 50, 40, 0.3 * fly); ctx.lineWidth = lw(0.02);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.85, s * 0.32, s * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  for (const sd of [-1, 1]) { /* les élytres : deux coques bombées, striées ; la lumière vient d'en haut à gauche : le dos s'éclaire, les flancs plongent dans l'ombre ; une moire violette au bord (l'irisation) ; en vol, elles s'écartent et se lèvent */
    ctx.save(); if (fly > 0) { ctx.translate(sd * s * 0.5, s * 0.12); ctx.rotate(sd * 0.6 * fly); ctx.translate(-sd * s * 0.5, -s * 0.12); }
    const eg = ctx.createRadialGradient(sd * s * 0.16 - s * 0.08, -s * 0.42, s * 0.04, sd * s * 0.2, -s * 0.36, s * 0.78); eg.addColorStop(0, K.hi); eg.addColorStop(0.35, K.mid); eg.addColorStop(0.8, K.lo); eg.addColorStop(1, "#050a08");
    ctx.fillStyle = eg; ctx.beginPath(); ctx.moveTo(0, s * 0.16); ctx.lineTo(sd * s * 0.58, s * 0.16); ctx.bezierCurveTo(sd * s * 0.7, -s * 0.5, sd * s * 0.32, -s * 0.96, 0, -s * 0.98); ctx.closePath(); ctx.fill();
    if (K.sheen) { ctx.strokeStyle = K.sheen; ctx.globalAlpha = 0.45; ctx.lineWidth = lw(0.06); ctx.beginPath(); ctx.moveTo(sd * s * 0.58, s * 0.12); ctx.bezierCurveTo(sd * s * 0.68, -s * 0.5, sd * s * 0.32, -s * 0.92, 0, -s * 0.95); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.strokeStyle = K.edge; ctx.globalAlpha = 0.5; ctx.lineWidth = lw(0.025); ctx.beginPath(); ctx.moveTo(0, s * 0.16); ctx.lineTo(0, -s * 0.98); ctx.stroke(); ctx.globalAlpha = 1; /* la suture */
    if (s > 6) { ctx.strokeStyle = rgba(0, 0, 0, 0.28); ctx.lineWidth = lw(0.016); for (const k of [0.17, 0.32, 0.45]) { ctx.beginPath(); ctx.moveTo(sd * s * k, s * 0.12); ctx.quadraticCurveTo(sd * s * (k + 0.06), -s * 0.5, sd * s * k * 0.55, -s * 0.88); ctx.stroke(); } }
    { const rg = ctx.createLinearGradient(sd * s * 0.62, 0, sd * s * 0.3, 0); rg.addColorStop(0, rgba(0, 0, 0, 0.45)); rg.addColorStop(1, rgba(0, 0, 0, 0)); ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(sd * s * 0.58, s * 0.16); ctx.bezierCurveTo(sd * s * 0.7, -s * 0.5, sd * s * 0.32, -s * 0.96, 0, -s * 0.98); ctx.lineTo(sd * s * 0.3, -s * 0.5); ctx.closePath(); ctx.fill(); } /* le flanc qui s'enfonce dans l'ombre */
    if (sd < 0) { ctx.fillStyle = rgba(255, 250, 230, o.dull ? 0.06 : 0.28); ctx.beginPath(); ctx.ellipse(-s * 0.26, -s * 0.46, s * 0.1, s * 0.32, 0.2, 0, TAU); ctx.fill(); if (!o.dull) { ctx.fillStyle = rgba(255, 255, 255, 0.75); ctx.beginPath(); ctx.ellipse(-s * 0.24, -s * 0.36, s * 0.04, s * 0.1, 0.2, 0, TAU); ctx.fill(); } } /* le reflet, et son point de brillance */
    else if (!o.dull) { ctx.fillStyle = rgba(255, 255, 255, 0.18); ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.5, s * 0.05, s * 0.2, -0.1, 0, TAU); ctx.fill(); }
    ctx.restore(); }
  if (!o.dull) { ctx.fillStyle = rgba(255, 255, 255, 0.55); ctx.beginPath(); ctx.ellipse(-s * 0.18, s * 0.3, s * 0.1, s * 0.04, -0.3, 0, TAU); ctx.fill(); } /* le corselet brille aussi */
  ctx.restore();
}

/** Où marche un scarabée de la serre, à l'instant t : un tour lent autour de son coin. Sa marche ralentit jusqu'à l'arrêt puis repart,
 *  sans jamais sauter : u(t) = v (t − sin(ωt)/ω) ne recule jamais, et sa vitesse v (1 − cos ωt) s'annule doucement (26 oct. 2026). */
const PERSP = 0.6; /* le sol vu de biais : un rond y devient une ellipse aplatie */
function pathOf(i, t, cx, cy, rx, ry) {
  const sp = 0.03 + q("sp" + i) * 0.03, w = 0.35 + q("w" + i) * 0.25, ph = q("ph" + i), tt = t + q("t0" + i) * 40;
  const u = sp * (tt - Math.sin(w * tt) / w) + ph, walk = (1 - Math.cos(w * tt)) / 2;
  const x = cx + Math.cos(u * TAU) * rx, y = cy + Math.sin(u * TAU * 2) * ry, a = Math.atan2(Math.cos(u * TAU * 2) * ry * 2 * 2 / PERSP, -Math.sin(u * TAU) * rx); /* l'angle dans le plan du sol, pas sur l'écran */
  const gait = u * TAU * (rx + ry / PERSP) * 1.4 / 2.2; /* les pattes avancent avec le chemin parcouru, pas avec l'horloge : elles ne patinent pas */
  return { x, y, a, walk: walk * 0.6 + 0.4 * Math.min(1, walk * 3), gait };
}

/** Une feuille pleine : un fuseau, sa moitié basse plus sombre, une nervure claire. (x, y) le pétiole, L sa longueur, wd sa demi-largeur, a son angle. */
function leaf(ctx, x, y, L, wd, a, col, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(L * 0.3, -wd, L * 0.72, -wd * 0.85, L, 0); ctx.bezierCurveTo(L * 0.72, wd * 0.85, L * 0.3, wd, 0, 0); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.bezierCurveTo(L * 0.72, wd * 0.85, L * 0.3, wd, 0, 0); ctx.fill();
  if (L > 9) { ctx.strokeStyle = "rgba(220,240,200,0.28)"; ctx.lineWidth = Math.max(0.4, L * 0.02); ctx.beginPath(); ctx.moveTo(L * 0.05, 0); ctx.lineTo(L * 0.88, 0); ctx.stroke(); }
  ctx.restore();
}
/** Une fronde (palme ou fougère) : un rachis courbe, des folioles pleines de chaque côté, qui raccourcissent vers la pointe et retombent. */
function frond(ctx, x0, y0, a, L, bend, col, dark, o = {}) {
  const n = o.n || 14, fl = o.fl || L * 0.28, droop = o.droop == null ? 0.35 : o.droop, spread = o.spread || 1.05, fw = o.fw || 0.16;
  const cx = x0 + Math.cos(a) * L * 0.5 + Math.cos(a + Math.PI / 2) * bend * L, cy = y0 + Math.sin(a) * L * 0.5 + Math.sin(a + Math.PI / 2) * bend * L, ex = x0 + Math.cos(a) * L, ey = y0 + Math.sin(a) * L;
  const at = (u) => [(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cx + u * u * ex, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * cy + u * u * ey];
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.6, L * 0.012); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke(); ctx.lineCap = "butt";
  for (let j = 1; j <= n; j++) {
    const u = 0.12 + 0.86 * j / n, [px, py] = at(u), [qx, qy] = at(Math.min(1, u + 0.02)), ta = Math.atan2(qy - py, qx - px), len = fl * (1 - u * 0.6);
    for (const sd of [-1, 1]) { const la = ta + sd * spread + droop * (Math.cos(ta) > 0 ? 1 : -1) * 0.5; leaf(ctx, px, py, len, len * fw, la, sd > 0 ? dark : col, dark); }
  }
}
/** Une fougère : un éventail de frondes pleines. */
function fern(ctx, fx, fy, fs, t, col = "#3f7a46", dark = "#24502e") {
  for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.36 + Math.sin(t * 0.6 + fx + k) * 0.02; frond(ctx, fx, fy, a, 60 * fs, k * 0.06, col, dark, { n: 11, fl: 13 * fs, droop: 0.2, spread: 1.2, fw: 0.22 }); }
}
/** Une plante à grandes feuilles (oreille d'éléphant) : des pétioles, des feuilles en cœur, larges et luisantes. */
function bigLeaves(ctx, x, y, s, t, col, dark, k0) {
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.42 + Math.sin(t * 0.3 + k + k0) * 0.02, L = (34 + q("bl" + k0 + k) * 18) * s, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.7, ex, ey); ctx.stroke();
    const la = a + (Math.cos(a) > 0 ? 0.9 : -0.9) + Math.PI * (Math.cos(a) > 0 ? 0 : 1) * 0;
    leaf(ctx, ex, ey, 30 * s, 13 * s, Math.cos(a) >= 0 ? a + 0.9 : a - 0.9, col, dark);
    leaf(ctx, ex, ey, 9 * s, 7 * s, Math.cos(a) >= 0 ? a + 0.9 + Math.PI : a - 0.9 + Math.PI, dark, dark); void la; /* les deux lobes du cœur */
  }
}
/** Une cordyline : des feuilles en lanière, droites, qui s'ouvrent en gerbe. */
function strapLeaves(ctx, x, y, s, t, col, dark, k0) {
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.2 + Math.sin(t * 0.4 + k + k0) * 0.015; leaf(ctx, x, y, (40 + q("sl" + k0 + k) * 22) * s, 2.6 * s, a, k % 2 ? col : dark, dark); }
}
/** Un arbuste en fleurs : une boule de feuilles, des grappes claires. */
function flowerShrub(ctx, x, y, s, col, dark, fl, k0) {
  for (let i = 0; i < 26; i++) { const a = q("fa" + k0 + i) * TAU, rr = q("fr" + k0 + i) * 18 * s; leaf(ctx, x + Math.cos(a) * rr, y - 16 * s + Math.sin(a) * rr * 0.7, 9 * s, 3.6 * s, a, i % 3 ? col : dark, dark); }
  for (let i = 0; i < 12; i++) { const a = q("fb" + k0 + i) * TAU, rr = q("fc" + k0 + i) * 16 * s; ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y - 18 * s + Math.sin(a) * rr * 0.6, 2 * s, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr - 0.6 * s, y - 18.6 * s + Math.sin(a) * rr * 0.6, 0.8 * s, 0, TAU); ctx.fill(); }
}
/** Une volute de fonte : une spirale qui s'enroule (dir = ±1). */
function scroll(ctx, x, y, r, dir, a0 = 0) {
  ctx.beginPath(); for (let i = 0; i <= 40; i++) { const th = (i / 40) * Math.PI * 3, rr = r * (1 - th / (Math.PI * 3.4)), px = x + dir * Math.cos(th * dir + a0) * rr, py = y + Math.sin(th * dir + a0) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
}
const mix = (a, b, f) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * f).toString(16).padStart(2, "0")).join(""); };
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

/** Le premier plan : une palme qui retombe du haut à gauche, une grande feuille en bas à gauche, une fougère en bas à droite. Sombres, presque en silhouette : on est derrière eux. */
function foreground(ctx, t) {
  const c1 = "#1d3a24", c2 = "#13281a";
  for (let k = 0; k < 4; k++) frond(ctx, -30, -40, 0.55 + k * 0.28 + Math.sin(t * 0.3 + k) * 0.01, 190 - k * 20, 0.12, c1, c2, { n: 18, fl: 46, droop: 0.6, spread: 0.9, fw: 0.14 });
  for (let k = 0; k < 3; k++) frond(ctx, W + 30, H + 30, -Math.PI / 2 - 0.45 - k * 0.32 + Math.sin(t * 0.4 + k) * 0.015, 170 - k * 18, -0.1, c1, c2, { n: 16, fl: 30, droop: 0.15, spread: 1.15, fw: 0.2 });
  for (const [a, L, w] of [[-0.55, 120, 46], [-1.0, 105, 40], [-1.45, 80, 30]]) { leaf(ctx, -30, H + 20, L, w, a + Math.sin(t * 0.25 + a) * 0.01, c1, c2); }
}

/** Le grand arbre du fond : un tronc noueux qui se divise, une ramure large faite de touffes de feuilles, des fruits d'orangerie ; pâli par la buée (c'est loin). */
function bigTree(ctx, x, y, t, haze, night) {
  const hz = night > 0.5 ? "#16262a" : haze, f = 0.28, bark = mix("#4a3a2c", hz, f), barkHi = mix("#7a6650", hz, f);
  ctx.fillStyle = mix("#3a2e22", hz, f); ctx.beginPath(); ctx.ellipse(x, y + 2, 30, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = mix("#8a8476", hz, f); ctx.beginPath(); ctx.ellipse(x, y + 1, 32, 5.5, 0, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); /* la margelle ronde de son parterre */
  ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.bezierCurveTo(x - 6, y - 30, x - 10, y - 50, x - 4, y - 70); ctx.lineTo(x + 5, y - 70); ctx.bezierCurveTo(x + 9, y - 50, x + 6, y - 30, x + 10, y); ctx.closePath(); ctx.fill(); /* le tronc */
  ctx.fillStyle = barkHi; ctx.globalAlpha = 0.4; ctx.fillRect(x - 5, y - 64, 2, 60); ctx.globalAlpha = 1;
  ctx.strokeStyle = bark; ctx.lineCap = "round"; for (const [a, L, w] of [[-2.3, 60, 5], [-0.85, 62, 5], [-1.6, 50, 4], [-2.8, 40, 3], [-0.3, 42, 3]]) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y - 66); ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.4, y - 66 + Math.sin(a) * L * 0.7, x + Math.cos(a) * L, y - 66 + Math.sin(a) * L); ctx.stroke(); } ctx.lineCap = "butt"; /* les maîtresses branches */
  const G = [["#4f8a4a", "#2f5a34"], ["#5f9a52", "#3a6a3a"], ["#3e7a46", "#24502e"]];
  for (let i = 0; i < 26; i++) { const a = -Math.PI * (0.05 + 0.9 * q("ta" + i)), rr = 30 + q("tr" + i) * 52, cx = x + Math.cos(a) * rr * 1.25, cy = y - 92 + Math.sin(a) * rr * 0.62, [c0, d0] = G[i % 3], c = mix(c0, hz, f), d = mix(d0, hz, f);
    ctx.fillStyle = d; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(cx, cy, 12 + q("tz" + i) * 6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    for (let m = 0; m < 16; m++) { const b = q("tb" + i + m) * TAU, r2 = q("tc" + i + m) * 18; leaf(ctx, cx + Math.cos(b) * r2, cy + Math.sin(b) * r2 - 2, 10, 3.6, b + Math.sin(t * 0.3 + i) * 0.03, c, d); } }
  for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * q("fo" + i)), rr = 26 + q("fp" + i) * 56, fx = x + Math.cos(a) * rr * 1.2, fy = y - 86 + Math.sin(a) * rr * 0.6; ctx.fillStyle = mix("#e8902a", hz, f); ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,240,200,0.4)"; ctx.beginPath(); ctx.arc(fx - 0.8, fy - 0.8, 0.9, 0, TAU); ctx.fill(); } /* des oranges : c'est une orangerie */
}
/** Un scarabée qui s'envole de temps en temps : posé, il écarte les élytres, décolle, traverse la serre en arc (son ombre reste au sol et pâlit), se pose ailleurs, se repose.
 *  Ses haltes : le bord du bassin, une rose, une fleur de cristal, le banc, l'allée… Deux d'entre eux, chacun son rythme. */
const PERCH = [[130, 289], [440, 258], [585, 296], [228, 352], [470, 352], [360, 262]]; /* jamais là où marchent les autres */
function flyer(ctx, t, f, night) {
  const T = [36, 49][f], n = Math.floor((t + f * 17) / T), p = ((t + f * 17) / T) - n, A = PERCH[(n * 3 + f * 4) % PERCH.length], B = PERCH[(n * 3 + 3 + f * 4) % PERCH.length];
  const sz = (y) => 15 * (0.55 + (y - 232) / 128 * 0.6), head = Math.atan2((B[1] - A[1]) / PERSP, B[0] - A[0]);
  if (p < 0.6) { const open = p > 0.52 ? (p - 0.52) / 0.08 : 0; beetle(ctx, A[0], A[1], sz(A[1]), head + (p < 0.45 ? Math.sin(n * 7.3) * 0.8 : 0), t, { walk: 0, glow: night, persp: 0.74, fly: open }); return; } /* posé ; puis il ouvre les élytres */
  if (p > 0.86) { const close = p < 0.92 ? 1 - (p - 0.86) / 0.06 : 0; beetle(ctx, B[0], B[1], sz(B[1]), head, t, { walk: 0, glow: night, persp: 0.74, fly: close }); return; } /* posé ; il replie ses ailes */
  const u = (p - 0.6) / 0.26, e = u * u * (3 - 2 * u), gx = A[0] + (B[0] - A[0]) * e, gy = A[1] + (B[1] - A[1]) * e, h = Math.sin(Math.PI * u) * (100 + 50 * Math.abs(Math.sin(n))), wob = Math.sin(t * 6 + f) * 3;
  ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - h / 140)})`; ctx.beginPath(); ctx.ellipse(gx, gy, sz(gy) * (1 - h / 260), sz(gy) * 0.5 * (1 - h / 260), 0, 0, TAU); ctx.fill(); /* son ombre, au sol, qui le suit */
  beetle(ctx, gx + wob, gy - h, sz(gy) * (1 + h / 400), head + Math.sin(t * 4) * 0.15, t, { walk: 0, glow: night, persp: 0.8, fly: 1, air: true });
}
/** Des brins d'herbe et de mousse devant les scarabées qui marchent dans les parterres : ils les cachent à moitié (sur l'allée, rien). */
function grassOver(ctx, t, pos) {
  ctx.lineCap = "round";
  pos.forEach((p, i) => { const f = (p.y - 232) / (H - 232); if (p.x > 290 - 170 * f && p.x < 334 + 66 * f) return; /* sur l'allée : rien devant */
    for (let k = 0; k < 7; k++) { const gx = Math.round((p.x + (q("gg" + i + k) - 0.5) * 30) / 6) * 6, gy = p.y + 3 + q("gh" + i + k) * 4, h = 6 + q("gk" + i + k) * 8, sw = Math.sin(t * 0.8 + gx) * 1.2;
      ctx.strokeStyle = k % 2 ? "#3f7a46" : "#2a5a34"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + sw * 0.5, gy - h * 0.6, gx + sw + (k - 3) * 0.6, gy - h); ctx.stroke(); } });
  ctx.lineCap = "butt";
}
/** La voûte du Château : un treillis de losanges au plomb sur tout le verre, et çà et là un losange teinté (rouge, bleu, or, violet), pâle : on colore la lumière, pas un damier. */
function gothicVault(ctx, S, ptOn, day) {
  const L = Math.log(S[S.length - 1]), P = (u, v) => ptOn(Math.exp(v * L), u), nu = 56, nv = 26;
  { ctx.save(); ctx.fillStyle = `rgba(36,34,44,${0.42 - 0.1 * day})`; ctx.beginPath(); for (let m = 0; m <= 30; m++) ctx.lineTo(...P(m / 30, 1)); ctx.lineTo(...P(1, 0)); for (let m = 30; m >= 0; m--) ctx.lineTo(...P(m / 30, 0)); ctx.closePath(); ctx.fill(); ctx.restore(); } /* le verre fumé, noir-gris, partout où il n'y a pas de couleur */
  ctx.strokeStyle = "rgba(20,18,24,0.42)"; ctx.lineWidth = 0.55;
  for (let d = -nv; d <= nu; d++) for (const sgn of [1, -1]) { ctx.beginPath(); let started = false; for (let m = 0; m <= 40; m++) { const v = m / 40, u = (d + sgn * v * nv) / nu; if (u < 0 || u > 1) { started = false; continue; } const [x, y] = P(u, v); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); } ctx.stroke(); } /* le plomb en petits losanges */
  const cols = [[122, 31, 43], [92, 40, 112], [74, 24, 48], [201, 162, 78]]; /* les couleurs du Château : bordeaux, violet, lie-de-vin, et un rare éclat d'or */
  S.slice(1, 4).forEach((sc) => { for (let i = 0; i < 40; i++) { const f0 = 0.955, f1 = 0.99, u0 = i / 40, u1 = (i + 1) / 40, c = cols[i % 8 === 4 ? 3 : i % 3]; /* une bordure de couleur le long de chaque arc, en petits morceaux */
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.45 + 0.3 * day})`; ctx.beginPath(); ctx.moveTo(...ptOn(sc * f0, u0)); ctx.lineTo(...ptOn(sc * f0, u1)); ctx.lineTo(...ptOn(sc * f1, u1)); ctx.lineTo(...ptOn(sc * f1, u0)); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(20,18,24,0.6)"; ctx.lineWidth = 0.4 + sc * 0.2; ctx.stroke(); } });
}
/** Le pignon du Château : deux lancettes et une rose de vitrail, rouge, bleu et violet, sertis de pierre ; derrière l'arbre. */
function gothicGable(ctx, A, VP, day, t) {
  const gable = () => { ctx.beginPath(); ctx.moveTo(VP.x - A.hw, A.base); ctx.quadraticCurveTo(VP.x, A.apex - (A.base - A.apex), VP.x + A.hw, A.base); };
  for (const [w, a] of [[26, 0.1], [16, 0.12], [8, 0.14]]) { ctx.strokeStyle = `rgba(22,20,28,${a})`; ctx.lineWidth = w; gable(); ctx.stroke(); } /* un passage doux entre la voûte et le pignon, pas une coupure */
  ctx.save(); gable(); ctx.closePath(); ctx.clip(); /* rien ne déborde du pignon */
  ctx.fillStyle = `rgba(22,20,28,${0.72 - 0.06 * day})`; ctx.fillRect(VP.x - A.hw, 0, 2 * A.hw, A.base); /* le pignon, en verre fumé presque noir : les vitraux y brillent comme dans une église */
  const base = A.base - 40, al = 0.5 + 0.35 * day, glass = (c) => `rgba(${c[0]},${c[1]},${c[2]},${al})`, R = [[122, 31, 43], [74, 24, 60], [92, 40, 112], [201, 162, 78]]; /* bordeaux, lie-de-vin violacée, violet, or */
  const IRON = "#1c1a22", archY = (x) => { const u = (x - (VP.x - A.hw)) / (2 * A.hw); return A.base - (A.base - (A.apex - (A.base - A.apex))) * 2 * u * (1 - u); };
  const rx = VP.x, ry = 100, rr = 32; /* la grande rose, tout en haut, au-dessus de la ramure */
  for (let i = 0; i < 16; i++) { const a0 = (i / 16) * TAU, a1 = ((i + 1) / 16) * TAU; ctx.fillStyle = glass(R[[0, 2, 1, 2][i % 4]]); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.arc(rx, ry, rr, a0, a1); ctx.closePath(); ctx.fill(); }
  for (let i = 0; i < 8; i++) { const a = ((i + 0.5) / 8) * TAU, px = rx + Math.cos(a) * rr * 0.62, py = ry + Math.sin(a) * rr * 0.62; ctx.fillStyle = glass(R[0]); ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = IRON; ctx.lineWidth = 1; ctx.stroke(); } /* huit médaillons dans la couronne */
  ctx.fillStyle = glass(R[3]); ctx.beginPath(); ctx.arc(rx, ry, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = IRON; ctx.lineWidth = 1.6; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ctx.beginPath(); ctx.moveTo(rx + Math.cos(a) * 9, ry + Math.sin(a) * 9); ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); ctx.stroke(); }
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(rx, ry, 9, 0, TAU); ctx.stroke();
  /* sous la traverse, de part et d'autre du tronc : une arcade de petites baies en arc brisé, chacune son verre */
  const lights = []; for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const x0 = VP.x + sd * (18 + k * 26), x1 = x0 + sd * 20; lights.push([Math.min(x0, x1), Math.max(x0, x1), k]); }
  const pointedLight = (x0, x1, top, bot) => { const m = (x0 + x1) / 2; ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, top + 10); ctx.quadraticCurveTo(x0, top + 2, m, top); ctx.quadraticCurveTo(x1, top + 2, x1, top + 10); ctx.lineTo(x1, bot); ctx.closePath(); };
  for (const [x0, x1, k] of lights) { ctx.fillStyle = glass(R[[0, 2, 1, 0][k]]); pointedLight(x0, x1, base + 6, A.base - 3); ctx.fill(); ctx.fillStyle = glass(R[3]); ctx.beginPath(); ctx.arc((x0 + x1) / 2, base + 16, 2.4, 0, TAU); ctx.fill(); ctx.strokeStyle = IRON; ctx.lineWidth = 2; pointedLight(x0, x1, base + 6, A.base - 3); ctx.stroke(); }
  { /* le remplage de fonte noire qui tient tout : la traverse, des meneaux jusqu'à l'arc, l'anneau de la rose et ses rayons qui la tiennent à l'arc */
    ctx.strokeStyle = IRON; ctx.lineCap = "round";
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(VP.x - A.hw, base + 2); ctx.lineTo(VP.x + A.hw, base + 2); ctx.stroke();
    for (const x of [VP.x - 70, VP.x + 70]) { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, base + 2); ctx.lineTo(x, archY(x)); ctx.stroke(); }
    ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(rx, ry, rr + 1, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.2; for (const a of [-Math.PI / 2, -0.35, -Math.PI + 0.35, 0.5, Math.PI - 0.5]) { const x = rx + Math.cos(a) * (rr + 1), y = ry + Math.sin(a) * (rr + 1); let L = 0; while (L < 200 && y + Math.sin(a) * L < archY(x + Math.cos(a) * L) && y + Math.sin(a) * L < base) L += 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.stroke(); } /* les rayons qui tiennent la rose */
    ctx.strokeStyle = "rgba(201,162,78,0.55)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(rx, ry, rr + 3, 0, TAU); ctx.stroke(); ctx.lineCap = "butt"; }
  ctx.restore(); void t;
}
/** La frise de la Verrière : sur chaque arc, une bande de verre (ambre au sommet, vert d'eau aux reins) sertie de plomb, où court une liane en coup de fouet ; des iris violets et des lys blancs y fleurissent. */
function nouveauFrieze(ctx, S, arch, ptOn, day, t) {
  S.slice(1, 4).forEach((sc, k) => {
    const a = 0.94, b = 0.99, band = (f) => { const out = []; for (let i = 0; i <= 48; i++) out.push(ptOn(sc * f, i / 48)); return out; }, P = band(a), Q = band(b);
    for (let i = 0; i < 48; i++) { const u = i / 48, c = u > 0.3 && u < 0.7 ? [232, 170, 80] : (i % 3 ? [110, 190, 170] : [90, 150, 190]); ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.4 + 0.3 * day})`; ctx.beginPath(); ctx.moveTo(...P[i]); ctx.lineTo(...P[i + 1]); ctx.lineTo(...Q[i + 1]); ctx.lineTo(...Q[i]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(15,47,44,0.7)"; ctx.lineWidth = 0.5 + sc * 0.2; ctx.stroke(); }
    const mid = (u) => { const f = (a + b) / 2 + Math.sin(u * 22 + k) * (b - a) * 0.35; return ptOn(sc * f, u); }; /* la liane, qui ondule dans la bande */
    ctx.strokeStyle = "#1f4a34"; ctx.lineWidth = 0.6 + sc * 0.45; ctx.lineCap = "round"; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const [x, y] = mid(i / 120); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let i = 1; i < 14; i++) { const u = i / 14, [x, y] = mid(u), [x2, y2] = mid(u + 0.01), ang = Math.atan2(y2 - y, x2 - x), z = sc * 1.6;
      if (i % 3 === 0) { const iris = i % 2; for (let m = 0; m < 3; m++) leaf(ctx, x, y, 3.2 * z, 1.4 * z, ang - Math.PI / 2 + (m - 1) * 0.8, iris ? "#8a6ac8" : "#f2ecdc", iris ? "#5a3e90" : "#c8bfa4"); ctx.fillStyle = "#e8c45a"; ctx.beginPath(); ctx.arc(x, y, 0.5 * z, 0, TAU); ctx.fill(); } /* un iris, un lys */
      else leaf(ctx, x, y, 3 * z, 1 * z, ang + (i % 2 ? 0.9 : -0.9), "#4a8a5a", "#2a5a3e"); }
    ctx.lineCap = "butt";
  });
  void t;
}
/** Le soleil levant du pignon : un demi-disque ambre posé sur la traverse, des rayons de verre jusqu'à l'arc, une couronne de petites fleurs, le plomb partout. */
function nouveauSun(ctx, A, VP, day, t) {
  const cy = A.base - 40, R = (A.base - A.apex), n = 18;
  ctx.save(); ctx.beginPath(); ctx.ellipse(VP.x, A.base, A.hw, A.base - A.apex, 0, Math.PI, TAU); ctx.closePath(); ctx.clip(); ctx.beginPath(); ctx.rect(0, 0, W, cy); ctx.clip();
  const al = 0.28 + 0.27 * day;
  for (let i = 0; i < n; i++) { const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI, c = [[214, 160, 80], [120, 170, 140], [196, 140, 70], [90, 150, 150], [226, 190, 110], [180, 110, 120]][i % 6];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${al})`; ctx.beginPath(); ctx.moveTo(VP.x, cy); ctx.lineTo(VP.x + Math.cos(a0) * R * 2, cy + Math.sin(a0) * R * 2); ctx.lineTo(VP.x + Math.cos(a1) * R * 2, cy + Math.sin(a1) * R * 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(15,47,44,0.8)"; ctx.lineWidth = 1.6; ctx.stroke(); }
  const sg = ctx.createRadialGradient(VP.x, cy, 2, VP.x, cy, 34); sg.addColorStop(0, `rgba(255,240,190,${0.6 + 0.3 * day})`); sg.addColorStop(1, `rgba(240,170,70,${0.5 + 0.3 * day})`); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(VP.x, cy, 30, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = "rgba(15,47,44,0.8)"; ctx.lineWidth = 1.4; ctx.stroke();
  for (let i = 0; i < 9; i++) { const a = Math.PI + ((i + 0.5) / 9) * Math.PI, x = VP.x + Math.cos(a) * 42, y = cy + Math.sin(a) * 42; for (let m = 0; m < 5; m++) { const b = (m / 5) * TAU + t * 0; ctx.fillStyle = i % 2 ? "#f2ecdc" : "#d87a98"; ctx.beginPath(); ctx.ellipse(x + Math.cos(b) * 2.4, y + Math.sin(b) * 2.4, 2.2, 1.2, b, 0, TAU); ctx.fill(); } ctx.fillStyle = "#e8c45a"; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); } /* la couronne de fleurs */
  ctx.strokeStyle = "rgba(15,47,44,0.8)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(VP.x, cy, 48, Math.PI, TAU); ctx.stroke();
  ctx.restore();
}
/** Une colonne de la Verrière, à la Guimard : une tige de fonte verte qui s'amincit en montant, un bourgeon pour chapiteau, et un bras en coup de fouet qui va soutenir l'arc. */
function guimardColumn(ctx, xc, xl, yc, wallTop, s, sd) {
  const iron = "#2c4836", hi = "rgba(170,220,180,0.4)", x = (xc + xl) / 2;
  ctx.fillStyle = iron; ctx.beginPath(); ctx.moveTo(x - 4 * s, wallTop); ctx.bezierCurveTo(x - 1.4 * s, wallTop - 10 * s, x - 1.2 * s, yc + 20 * s, x - 1.6 * s, yc); ctx.lineTo(x + 1.6 * s, yc); ctx.bezierCurveTo(x + 1.2 * s, yc + 20 * s, x + 1.4 * s, wallTop - 10 * s, x + 4 * s, wallTop); ctx.closePath(); ctx.fill(); /* la tige évasée au pied */
  ctx.fillStyle = hi; ctx.fillRect(x - sd * 0.6 * s, yc + 4 * s, 0.6 * s, wallTop - yc - 14 * s);
  ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(x, yc - 2 * s, 3 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#c87a3a"; ctx.beginPath(); ctx.ellipse(x - 0.8 * s, yc - 3.4 * s, 0.9 * s, 2 * s, 0, 0, TAU); ctx.fill(); /* le bourgeon, un filet de cuivre */
  ctx.strokeStyle = iron; ctx.lineCap = "round"; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x, yc + 14 * s); ctx.bezierCurveTo(x - sd * 14 * s, yc + 10 * s, x - sd * 4 * s, yc - 18 * s, x - sd * 22 * s, yc - 26 * s); ctx.stroke(); /* le coup de fouet */
  ctx.lineWidth = 0.9 * s; ctx.beginPath(); ctx.moveTo(x - sd * 8 * s, yc + 6 * s); ctx.quadraticCurveTo(x - sd * 16 * s, yc + 2 * s, x - sd * 14 * s, yc - 6 * s); ctx.stroke();
  ctx.fillStyle = iron; ctx.beginPath(); ctx.ellipse(x - sd * 14 * s, yc - 7 * s, 1.6 * s, 2.6 * s, sd * 0.4, 0, TAU); ctx.fill(); ctx.lineCap = "butt"; /* une vrille et son bourgeon */
}
/** Un rosier : un buisson de feuilles dentées, des roses ouvertes (une spirale de pétales) et des boutons. */
function rose(ctx, x, y, s, t, k0) {
  for (let i = 0; i < 34; i++) { const a = q("ra" + k0 + i) * TAU, rr = Math.sqrt(q("rr" + k0 + i)) * 20 * s; leaf(ctx, x + Math.cos(a) * rr, y - 14 * s + Math.sin(a) * rr * 0.6, 7 * s, 3 * s, a, i % 3 ? "#2f5a32" : "#3f6e3a", "#1f3e24"); }
  const C = [["#b0283a", "#6a1020"], ["#d86a84", "#8a2a44"], ["#e8b0b8", "#b06a78"], ["#c84a4a", "#7a1a20"]][k0 % 4];
  for (let i = 0; i < 7; i++) { const a = q("rb" + k0 + i) * TAU, rr = Math.sqrt(q("rc" + k0 + i)) * 16 * s, px = x + Math.cos(a) * rr, py = y - 16 * s + Math.sin(a) * rr * 0.55, R = (3 + q("rd" + k0 + i) * 1.6) * s;
    if (i % 4 === 3) { ctx.fillStyle = C[1]; ctx.beginPath(); ctx.ellipse(px, py, R * 0.45, R * 0.7, 0.3, 0, TAU); ctx.fill(); continue; } /* un bouton */
    ctx.fillStyle = C[1]; ctx.beginPath(); ctx.arc(px, py, R, 0, TAU); ctx.fill(); ctx.fillStyle = C[0]; ctx.beginPath(); ctx.arc(px - R * 0.15, py - R * 0.15, R * 0.82, 0, TAU); ctx.fill();
    ctx.strokeStyle = C[1]; ctx.lineWidth = Math.max(0.5, 0.5 * s); ctx.beginPath(); for (let m = 0; m <= 20; m++) { const th = m * 0.55, rr2 = R * 0.7 * (1 - m / 24); m ? ctx.lineTo(px + Math.cos(th) * rr2, py + Math.sin(th) * rr2) : ctx.moveTo(px + Math.cos(th) * rr2, py + Math.sin(th) * rr2); } ctx.stroke(); } /* la spirale des pétales */
  void t;
}
/** Du muguet : deux larges feuilles dressées, une tige qui s'arque, des clochettes blanches. */
function muguet(ctx, x, y, s, t) {
  leaf(ctx, x - 2 * s, y, 22 * s, 5 * s, -Math.PI / 2 - 0.25, "#3f7a46", "#2a5a34"); leaf(ctx, x + 2 * s, y, 20 * s, 5 * s, -Math.PI / 2 + 0.3, "#4a8a4e", "#2a5a34");
  const sw = Math.sin(t * 0.7 + x) * 0.6; ctx.strokeStyle = "#5a8a4a"; ctx.lineWidth = Math.max(0.6, 0.7 * s); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2 * s, y - 20 * s, x + (9 + sw) * s, y - 15 * s); ctx.stroke();
  for (let k = 0; k < 5; k++) { const u = 0.35 + k * 0.15, bx = x + (2 * s) * 2 * u * (1 - u) + (9 + sw) * s * u * u, by = y - 20 * s * 2 * u * (1 - u) - 15 * s * u * u + 3 * s, R = 1.7 * s * (1 - k * 0.08);
    ctx.fillStyle = "#f4f2e8"; ctx.beginPath(); ctx.arc(bx, by, R, Math.PI, TAU); ctx.lineTo(bx + R, by + R * 0.6); for (let m = 0; m < 3; m++) ctx.lineTo(bx + R - (m + 0.5) * R * 0.66, by + (m % 2 ? R * 0.9 : R * 0.45)); ctx.lineTo(bx - R, by + R * 0.6); ctx.closePath(); ctx.fill(); }
}
/** Un champignon qui luit : un pied pâle, un chapeau bleu-vert ; le jour à peine, la nuit il éclaire autour de lui. `top` : on ne redessine que le chapeau lumineux, par-dessus le voile de la nuit. */
function mushroom(ctx, x, y, s, t, night, top) {
  const pulse = 0.75 + 0.25 * Math.sin(t * 1.1 + x * 0.7);
  if (!top) { ctx.fillStyle = "#d8d4c0"; ctx.beginPath(); ctx.moveTo(x - 1.2 * s, y); ctx.quadraticCurveTo(x - 0.6 * s, y - 4 * s, x - 0.9 * s, y - 7 * s); ctx.lineTo(x + 0.9 * s, y - 7 * s); ctx.quadraticCurveTo(x + 0.6 * s, y - 4 * s, x + 1.2 * s, y); ctx.closePath(); ctx.fill(); }
  const a = top ? night * pulse : 1; ctx.globalAlpha = a; ctx.fillStyle = top ? "#a8fff0" : "#5aa8a0"; ctx.beginPath(); ctx.ellipse(x, y - 7 * s, 4.4 * s, 3 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
  ctx.fillStyle = top ? "rgba(255,255,255,0.7)" : "rgba(200,255,245,0.45)"; for (const [dx, dy] of [[-1.8, -8.4], [0.8, -9.2], [2.4, -7.8]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, 0.5 * s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
}
/** La teinte des fleurs de cristal : celle du tableau de l'atelier (la graine du Relto, ou `flower_color`). */
function flowerToneOf(r) { try { if (r && r.scene) return require("./relto-flower").flowerTone(r.scene); } catch (e) { /* sans Relto (maquette) */ } return { hue: 140, spread: 40, fsat: 0.6 }; }
/** Une fleur de cristal, comme au tableau : des pétales en losanges à facettes, un cœur de la teinte complémentaire, une lueur qui respire. */
function crystalFlower(ctx, x, y, s, t, tone) {
  const HS = require("./relto-flower").hsl, { hue, spread, fsat } = tone, gl = 0.5 + 0.5 * Math.sin(t * 1.3 + x), cy = y - 34 * s;
  const P = [HS(hue, fsat, 0.42), HS(hue + spread * 0.6, fsat, 0.55), HS(hue + spread, fsat + 0.1, 0.5)], HEART = HS(hue + 150, 0.6, 0.74), STEM = HS(hue + 150, 0.35, 0.38), LEAF = HS(hue + 150, 0.4, 0.3);
  const hg = ctx.createRadialGradient(x, cy, 1, x, cy, 20 * s); hg.addColorStop(0, `rgba(255,255,255,${0.12 + 0.1 * gl})`); hg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = hg; ctx.fillRect(x - 20 * s, cy - 20 * s, 40 * s, 40 * s);
  ctx.strokeStyle = STEM; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2 * s, y - 16 * s, x, cy + 6 * s); ctx.stroke();
  for (const [dy, sg] of [[-8, -1], [-15, 1]]) { ctx.fillStyle = LEAF; ctx.beginPath(); ctx.moveTo(x, y + dy * s); ctx.lineTo(x + sg * 10 * s, y + (dy - 6) * s); ctx.lineTo(x + sg * 3 * s, y + (dy + 3) * s); ctx.closePath(); ctx.fill(); }
  const petal = (ang, len, w, col, hi) => { ctx.save(); ctx.translate(x, cy); ctx.rotate(ang); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -2 * s); ctx.lineTo(-w * s, -len * 0.45 * s); ctx.lineTo(0, -len * s); ctx.lineTo(w * s, -len * 0.45 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = `rgba(255,255,255,${hi})`; ctx.beginPath(); ctx.moveTo(0, -2 * s); ctx.lineTo(0, -len * s); ctx.lineTo(w * s, -len * 0.45 * s); ctx.closePath(); ctx.fill(); ctx.restore(); };
  petal(-1.95, 13, 3.8, P[0], 0.08); petal(1.95, 13, 3.8, P[0], 0.08);
  for (let i = 0; i < 5; i++) petal(-1.25 + i * 0.62, 15, 4.2, [P[0], P[1], P[2], P[1], P[0]][i], 0.14 + 0.1 * gl);
  ctx.fillStyle = HEART; ctx.beginPath(); ctx.moveTo(x, cy - 4 * s); ctx.lineTo(x + 3.2 * s, cy); ctx.lineTo(x, cy + 4 * s); ctx.lineTo(x - 3.2 * s, cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * gl})`; ctx.fillRect(x + 7 * s, cy - 17 * s, 1.4, 1.4);
}

/** Les trois salons d'hiver, un par habillage (26 oct. 2026, d'après les photos de l'auteur) :
 *  sans habillage, un salon d'hiver de fer peint vert-de-gris sur des dalles claires, un olivier en pot ; le Château, une orangerie gothique de fer noir
 *  fileté d'or, arcs brisés, dallage sombre, un lustre de fer ; la Verrière, une nef Art nouveau de cuivre aux carreaux de vitrail, sol de mosaïque, des palmes. */
const STYLES = {
  plain: { frame: "#5f7f6c", hi: "#9fbfa8", round: true, glass: [200, 225, 210], wall: "#8a8476", wallTop: "#aaa496", floor: ["#6e685c", "#3a362f"], flags: "rgba(0,0,0,0.18)", sky: ["#b8d6d2", "#eef2e2"] },
  castle: { frame: "#23212a", hi: "#c9a24e", round: false, glass: [190, 205, 215], wall: "#4a4552", wallTop: "#6e6876", floor: ["#3e3a46", "#1a1820"], flags: "rgba(0,0,0,0.3)", sky: ["#8fb0bc", "#cdd8d4"] },
  glass: { frame: "#2c4836", hi: "#c87a3a", round: true, stained: true, glass: [236, 226, 196], wall: "#1f3a34", wallTop: "#b5652a", floor: ["#2a3a34", "#121c18"], flags: "rgba(200,170,90,0.1)", sky: ["#c8d6c0", "#efe6cc"] },
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
  const archPathS = (sc) => { const A = arch(sc); ctx.beginPath(); if (ST.round) ctx.ellipse(VP.x, A.base, A.hw, A.base - A.apex, 0, Math.PI, TAU); else { ctx.moveTo(VP.x - A.hw, A.base); ctx.quadraticCurveTo(VP.x, A.apex - (A.base - A.apex), VP.x + A.hw, A.base); } };
  const archPath0 = () => { const A = arch(5.1); ctx.beginPath(); if (ST.round) ctx.ellipse(VP.x, A.base, A.hw, A.base - A.apex, 0, Math.PI, TAU); else { ctx.moveTo(VP.x - A.hw, A.base); ctx.quadraticCurveTo(VP.x, A.apex - (A.base - A.apex), VP.x + A.hw, A.base); } ctx.closePath(); };
  /* au fond, à travers le verre du pignon : des feuillages flous */
  for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(${60 + q("bg" + i) * 30},${110 + q("bh" + i) * 40},80,${0.25 * day + 0.08})`; ctx.beginPath(); ctx.ellipse(VP.x - 140 + q("bx" + i) * 280, 200 + q("by" + i) * 26, 30 + q("bw" + i) * 40, 22 + q("bv" + i) * 16, 0, 0, TAU); ctx.fill(); }
  const S = [1, 1.5, 2.25, 3.4, 5.1]; /* les arcs, du fond vers nous */
  { /* le verre : une seule nappe claire, à peine teintée ; ce sont les petits bois qui font les carreaux */
    const A = arch(S[S.length - 1]); ctx.save(); archPath0(); ctx.clip(); const gl = ctx.createLinearGradient(0, 0, 0, 240); gl.addColorStop(0, `rgba(${ST.glass[0]},${ST.glass[1]},${ST.glass[2]},${0.14 + 0.08 * day})`); gl.addColorStop(1, `rgba(${ST.glass[0]},${ST.glass[1]},${ST.glass[2]},0.04)`); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, 240); ctx.restore(); void A;
  }
  if (ST.stained) nouveauSun(ctx, arch(1), VP, day, t);
  if (ST === STYLES.castle) { gothicVault(ctx, S, ptOn, day); gothicGable(ctx, arch(1), VP, day, t); } /* le Château : des losanges de verre au plomb, quelques-uns teintés ; au pignon, deux lancettes et une rose */ /* au pignon du fond, un soleil levant de verre : des rayons ambre, rose et vert d'eau */
  const mid = []; for (let k = 0; k < S.length - 1; k++) for (const f of [0.25, 0.5, 0.75]) mid.push(S[k] * Math.pow(S[k + 1] / S[k], f)); /* les petits bois transversaux, entre deux arcs */
  ctx.strokeStyle = ST.frame; ctx.globalAlpha = 0.55; ctx.lineCap = "round";
  for (const sc of mid) { ctx.lineWidth = 0.4 + sc * 0.22; archPathS(sc); ctx.stroke(); }
  for (let m = 0; m <= 24; m++) { const u = m / 24, a = ptOn(S[0], u), b = ptOn(S[S.length - 1], u); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } /* les petits bois longitudinaux */
  ctx.globalAlpha = 1;
  if (ST.stained) nouveauFrieze(ctx, S, arch, ptOn, day, t); /* la Verrière : le long de chaque arc, une bande de vitrail où court une liane en coup de fouet, des iris et des lys */

  ctx.strokeStyle = ST.frame; ctx.lineCap = "round";
  for (let m = 0; m <= 6; m++) { const u = m / 6, a = ptOn(S[0], u), b = ptOn(S[S.length - 1], u); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } /* les pannes, vers le point de fuite */
  const archPath = (sc) => { const A = arch(sc); ctx.beginPath(); if (ST.round) ctx.ellipse(VP.x, A.base, A.hw, A.base - A.apex, 0, Math.PI, TAU); else { ctx.moveTo(VP.x - A.hw, A.base); ctx.quadraticCurveTo(VP.x, A.apex - (A.base - A.apex), VP.x + A.hw, A.base); } };
  S.forEach((sc, k) => { ctx.strokeStyle = ST.frame; ctx.lineWidth = 1.5 + k * 1.6; archPath(sc); ctx.stroke(); if (ST.hi) { ctx.strokeStyle = ST.hi; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(0.6, 0.3 + k * 0.35); archPath(sc); ctx.stroke(); ctx.globalAlpha = 1; } }); /* les arcs, et leur filet clair (or au Château) */
  ctx.strokeStyle = ST.frame;
  if (ST !== STYLES.castle) { const A = arch(1); ctx.lineWidth = 1.2; for (const u of [0.25, 0.5, 0.75]) { const [x] = ptOn(1, u); ctx.beginPath(); ctx.moveTo(x, A.base); ctx.lineTo(x, ptOn(1, u)[1]); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(VP.x - A.hw * 0.9, A.base - 40); ctx.lineTo(VP.x + A.hw * 0.9, A.base - 40); ctx.stroke(); } /* le pignon du fond, ses montants */
  ctx.lineCap = "butt";
  ctx.fillStyle = "rgba(255,255,255,0.16)"; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(q("dx" + i) * W, 30 + q("dy" + i) * 150, 0.8 + q("ds" + i) * 1.2, 0, TAU); ctx.fill(); } /* la buée */
  { /* les chapiteaux et les volutes de fonte, au pied de chaque arc ; les colonnes sur le muret */
    for (const sc2 of S.slice(0, 3)) { const A = arch(sc2), yc = A.base - (A.base - A.apex) * 0.3, wallTop = 218 + (sc2 - 1) * 66.3;
      for (const sd of [-1, 1]) { const xc = VP.x + sd * A.hw * (ST.round ? 0.954 : 0.92), xl = VP.x + sd * A.hw;
        if (ST.stained) { guimardColumn(ctx, xc, xl, yc, wallTop, sc2, sd); continue; } /* la Verrière : une tige de fonte, un bourgeon, un coup de fouet */
        ctx.fillStyle = ST.frame; ctx.fillRect(Math.min(xc, xl) - 1.2 * sc2, yc, Math.abs(xl - xc) + 2.4 * sc2, wallTop - yc); /* la colonne */
        ctx.fillStyle = ST.hi; ctx.globalAlpha = 0.3; ctx.fillRect(xc - sd * 0.8 * sc2, yc, 0.8 * sc2, wallTop - yc); ctx.globalAlpha = 1;
        ctx.fillStyle = ST.frame; ctx.fillRect(Math.min(xc, xl) - 4 * sc2, yc - 3 * sc2, Math.abs(xl - xc) + 8 * sc2, 3 * sc2); ctx.fillRect(Math.min(xc, xl) - 2.5 * sc2, yc, Math.abs(xl - xc) + 5 * sc2, 2 * sc2); /* le chapiteau */
        ctx.fillRect(Math.min(xc, xl) - 3 * sc2, wallTop - 4 * sc2, Math.abs(xl - xc) + 6 * sc2, 4 * sc2); /* la base */
        ctx.strokeStyle = ST.frame; ctx.lineWidth = 0.8 + sc2 * 0.5; scroll(ctx, xc - sd * 9 * sc2, yc - 9 * sc2, 7 * sc2, -sd, sd > 0 ? Math.PI : 0); /* la volute, dans l'angle */
        ctx.beginPath(); ctx.moveTo(xc, yc - 3 * sc2); ctx.quadraticCurveTo(xc - sd * 4 * sc2, yc - 18 * sc2, xc - sd * 18 * sc2, yc - 24 * sc2); ctx.stroke(); } } }
  if (ST === STYLES.castle) { ctx.save(); ctx.translate(VP.x + 6, 236); ctx.scale(0.78, 0.72); ctx.translate(-VP.x - 6, -236); } bigTree(ctx, VP.x + 6, 236, t, ST.sky[1], night); if (ST === STYLES.castle) ctx.restore(); /* au Château, plus petit : la rose du pignon se voit au-dessus */ /* au fond de la nef, au bout de l'allée : un grand arbre planté en pleine terre */
  if (day > 0.3) { /* la lumière qui tombe du toit, douce, en nappes */
    ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const [x0, w0] of [[160, 70], [360, 60], [470, 30]]) { const lg = ctx.createLinearGradient(0, 0, 0, 320); lg.addColorStop(0, `rgba(255,240,200,${0.07 * day})`); lg.addColorStop(1, "rgba(255,240,200,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w0, 0); ctx.lineTo(x0 + w0 + 70, 320); ctx.lineTo(x0 + 40, 320); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  /* les murets de pierre, de chaque côté, qui filent vers le fond ; un appareil de pierres */
  { const A0 = arch(1), A1 = arch(S[S.length - 1]); for (const sd of [-1, 1]) { ctx.fillStyle = ST.wall; ctx.beginPath(); ctx.moveTo(VP.x + sd * A0.hw, A0.base); ctx.lineTo(VP.x + sd * A0.hw, A0.base - 14); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 70); ctx.lineTo(VP.x + sd * A1.hw, A1.base); ctx.closePath(); ctx.fill(); ctx.fillStyle = ST.wallTop; ctx.beginPath(); ctx.moveTo(VP.x + sd * A0.hw, A0.base - 14); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 70); ctx.lineTo(VP.x + sd * A1.hw, A1.base - 78); ctx.lineTo(VP.x + sd * A0.hw, A0.base - 16); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.8; for (let k = 1; k < 12; k++) { const u = k / 12, sc2 = 1 + u * 1.6, xx = VP.x + sd * 150 * sc2, y0 = 218 + (sc2 - 1) * 66.3, y1 = 150 + 82 * sc2; ctx.beginPath(); ctx.moveTo(xx, y0 + 2); ctx.lineTo(xx, y1); ctx.stroke(); } }
    ctx.fillStyle = ST.wall; ctx.fillRect(VP.x - A0.hw, A0.base - 14, 2 * A0.hw, 14); ctx.fillStyle = ST.wallTop; ctx.fillRect(VP.x - A0.hw, A0.base - 16, 2 * A0.hw, 2.5); }
  /* les plates-bandes sur les murets : un talus serré de plantes, du fond (pâli par la buée) vers nous (sombre, net) */
  { const G = [["#4f8a4a", "#2f5a34"], ["#5f9a52", "#3a6a3a"], ["#3e7a52", "#24503a"], ["#6a9a4a", "#40683a"], ["#4a7a5a", "#2a4a3a"]], haze = night > 0.5 ? "#16262a" : ST.sky[1];
    for (const sd of [-1, 1]) for (let k = 23; k >= 0; k--) { const u = k / 23, sc2 = 1 + u * 1.5, x = VP.x + sd * (150 * sc2 - (6 + q("bd" + k + sd) * 10) * sc2), y = 218 + (sc2 - 1) * 66.3 + 2, f = 0.5 * (1 - u), kind = (k * 7 + (sd > 0 ? 2 : 0)) % 5, [c0, d0] = G[(k * 3 + (sd > 0 ? 1 : 0)) % G.length], c = mix(c0, haze, f), d = mix(d0, haze, f), s2 = 0.8 * sc2, kk = k * 2 + (sd > 0 ? 1 : 0);
      if (kind === 0) bigLeaves(ctx, x, y, s2, t, c, d, kk); else if (kind === 1) fern(ctx, x, y, 0.75 * sc2, t, c, d); else if (kind === 2) strapLeaves(ctx, x, y, s2, t, c, d, kk); else if (kind === 3) flowerShrub(ctx, x, y, s2 * 1.4, c, d, mix(["#e8a0b8", "#f2e6d0", "#e6c45a", "#c8a0e0"][k % 4], haze, f), kk); else for (let m = 0; m < 4; m++) frond(ctx, x, y, -Math.PI / 2 + (m - 1.5) * 0.55, 48 * s2 * 1.4, (m - 1.5) * 0.08, c, d, { n: 10, fl: 12 * s2, droop: 0.5, spread: 0.9, fw: 0.14 }); } }
  /* les pots suspendus */
  hangingPot(ctx, 120, 0, 60, t, 1); hangingPot(ctx, 320, 0, 34, t, 2); hangingPot(ctx, 520, 0, 60, t, 3); /* accrochés aux arcs au-dessus de nous */
  /* le sol : de la terre de jardin partout, et une allée de dalles au milieu, bordée de buis ; les parterres de part et d'autre */
  const PATH = [[290, 232], [334, 232], [400, H], [120, H]], pathX = (y, sd) => (sd < 0 ? 290 + (120 - 290) * (y - 232) / (H - 232) : 334 + (400 - 334) * (y - 232) / (H - 232));
  { const sg = ctx.createLinearGradient(0, 230, 0, H); sg.addColorStop(0, "#4a3c2c"); sg.addColorStop(1, "#241a12"); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(170, 232); ctx.lineTo(470, 232); ctx.lineTo(W + 200, H); ctx.lineTo(-200, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 260; i++) { const y = 234 + Math.pow(q("ty" + i), 0.8) * 126, x = q("tx" + i) * W, rr = 0.5 + (y - 232) / 128 * 1.6 * q("tr" + i); ctx.fillStyle = i % 3 ? "rgba(0,0,0,0.25)" : "rgba(160,130,90,0.22)"; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.4, rr * 0.6, 0, 0, TAU); ctx.fill(); } } /* la terre, grumeleuse */
  { const inPath = (x, y) => { const f = (y - 232) / (H - 232); return x > 290 - 170 * f - 2 && x < 334 + 66 * f + 2; }, inBay = (x, y) => y > 278 && y < 336 && x > 64 && x < 300, inPond = (x, y) => ((x - 482) / 92) ** 2 + ((y - 320) / 26) ** 2 < 1;
    const lg = ctx.createLinearGradient(0, 232, 0, H); lg.addColorStop(0, "#5f7a54"); lg.addColorStop(1, "#22381f"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(170, 232); ctx.lineTo(470, 232); ctx.lineTo(W + 200, H); ctx.lineTo(-200, H); ctx.closePath(); ctx.fill(); /* le gazon recouvre la terre */
    const EARTH = [[92, 268], [140, 272], [224, 270], [506, 264], [540, 268], [406, 276], [470, 288], [590, 302]].map(([x, y], i) => [x, y, (26 + q("ea" + i) * 10) * (0.6 + (y - 232) / 128), (26 + q("ea" + i) * 10) * 0.24]), inEarth = (x, y) => EARTH.some(([ex, ey, rx, ry]) => ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 < 1);
    for (const [x, y, rx0, ry0] of EARTH) { const rr = 1; ctx.fillStyle = "#3a2c20"; ctx.beginPath(); ctx.ellipse(x, y, rx0 * rr, ry0, 0, 0, TAU); ctx.fill(); } /* la terre ne se voit plus qu'au pied des rosiers et des fleurs */
    const shades = ["#26402a", "#34553a", "#46684a", "#5a7a52"], paths = shades.map(() => new Path2D());
    for (let y = 234; y < H + 8; y += 1.2 + (y - 232) * 0.022) { const sc2 = 0.35 + (y - 232) / 128 * 1.5, step = 2.2 * sc2; for (let x = -10 + (y * 7.3) % step; x < W + 10; x += step) { if (inPath(x, y) || inBay(x, y) || inPond(x, y) || inEarth(x, y)) continue; const k = Math.floor(q("gs" + Math.round(x) + "," + Math.round(y)) * 4), h = (3 + q("gh" + Math.round(x * 3 + y)) * 4) * sc2, lean = (q("gl" + Math.round(x + y * 5)) - 0.5) * 2.4 * sc2; paths[k].moveTo(x, y); paths[k].lineTo(x + lean, y - h); } }
    ctx.lineCap = "round"; shades.forEach((c, k) => { ctx.strokeStyle = c; ctx.lineWidth = 0.9; ctx.stroke(paths[k]); }); ctx.lineCap = "butt"; } /* des brins serrés, plus grands vers nous */
  const BAY = [[80, 280], [pathX(280, -1) + 4, 280], [pathX(334, -1) + 4, 334], [66, 334]]; /* un renfoncement dallé au bord de l'allée, pour le banc */
  { ctx.save(); ctx.beginPath(); PATH.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); BAY.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip("nonzero");
    const ys = ST.stained ? (() => { const a = [232]; while (a[a.length - 1] < 384) { const y = a[a.length - 1]; a.push(y + 0.9 + (y - 232) * 0.055); } return a; })() : [232, 235, 239, 244, 250, 258, 268, 281, 298, 320, 348, 384], cols = ST.stained ? 44 : 14, xAt = (k, y) => VP.x + (k - cols / 2) * (ST.stained ? 7 : 22) * ((y - VP.y) / (232 - VP.y)), TESS = ["#2f5a52", "#356258", "#2a5048", "#3a6a5e", "#2c564e", "#33604f"];
    for (let r2 = 0; r2 < ys.length - 1; r2++) for (let k = ST.stained ? -14 : -4; k < cols; k++) { const y0 = ys[r2], y1 = ys[r2 + 1], off = r2 % 2 ? 0.5 : 0, n2 = q("fl" + r2 + "," + k), f = (y0 - 232) / 150;
      ctx.fillStyle = ST.stained ? mix(TESS[Math.floor(n2 * 6)], "#121c18", Math.min(0.8, f * 0.5)) : mix(ST.floor[0], ST.floor[1], Math.min(1, f * 0.9 + n2 * 0.18)); ctx.beginPath(); ctx.moveTo(xAt(k + off, y0), y0); ctx.lineTo(xAt(k + 1 + off, y0), y0); ctx.lineTo(xAt(k + 1 + off, y1), y1); ctx.lineTo(xAt(k + off, y1), y1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ST.flags; ctx.lineWidth = 0.6 + f * 1.4; ctx.stroke(); }
    ctx.restore(); }
  if (ST.stained) for (const sd of [-1, 1]) { /* la bordure de la mosaïque : un filet d'ocre, et dedans une vrille en coup de fouet */
    const at = (y, d) => [pathX(y, sd) - sd * d * (0.4 + (y - 232) / 128 * 1.6), y];
    for (const [d, c, w] of [[3, "#c39a48", 1], [9, "#c39a48", 0.6]]) { ctx.strokeStyle = c; ctx.beginPath(); for (let y = 234; y <= H; y += 4) { const [x] = at(y, d); y === 234 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.lineWidth = w; ctx.stroke(); }
    ctx.strokeStyle = "rgba(226,214,184,0.55)"; ctx.lineWidth = 0.8; ctx.beginPath(); for (let y = 236; y <= H; y += 2) { const [x] = at(y, 6 + 2.2 * Math.sin(y * 0.18)); y === 236 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  for (const sd of [-1, 1]) for (let y = 236; y < H + 6; y += 2 + (y - 232) * 0.05) { if (sd < 0 && y > 276 && y < 338) continue; const sc2 = 0.4 + (y - 232) / 128 * 2.4, x = pathX(y, sd) + sd * 1.5 * sc2; ctx.fillStyle = (Math.round(y) % 2) ? "#2f5230" : "#3a6a3a"; ctx.beginPath(); ctx.ellipse(x, y - 2 * sc2, 3.2 * sc2, 2.4 * sc2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(170,220,140,0.18)"; ctx.beginPath(); ctx.ellipse(x - 0.8 * sc2, y - 3 * sc2, 1.4 * sc2, 0.8 * sc2, 0, 0, TAU); ctx.fill(); } /* la bordure de buis, le long de l'allée */
  ctx.strokeStyle = "#8a8476"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(pathX(280, -1) + 4, 280); ctx.lineTo(80, 280); ctx.lineTo(66, 334); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 0.8; ctx.stroke(); /* la bordure de pierre du renfoncement */
  if (ST.stained) { const GL = require("./relto-glass"), id = (k) => k; for (const [y0, sc3] of [[262, 0.5], [312, 0.78]]) for (const sd of [-1, 1]) { const x0 = pathX(y0, sd) + sd * 8; if (sd < 0 && y0 > 270) continue; ctx.save(); ctx.translate(x0, y0); ctx.scale(sc3, sc3); GL.guimardLamp(ctx, id, 0, 0, -86, -sd, 0.4 + night); ctx.restore(); } } /* deux lampadaires de Guimard, de part et d'autre de l'allée */
  for (let i = 0; i < 46; i++) { const sd = i % 2 ? 1 : -1, y = 250 + q("gy" + i) * 100, edge = pathX(y, sd) + sd * (8 + q("gx" + i) * 140) * (0.4 + (y - 232) / 128), sc2 = 0.5 + (y - 232) / 128 * 1.1; if (sd < 0 && y > 278 && y < 336 && edge > 60) continue; for (let m = 0; m < 9; m++) { const b = q("gb" + i + m) * TAU, r2 = q("gr" + i + m) * 9 * sc2; leaf(ctx, edge + Math.cos(b) * r2 * 1.6, y + Math.sin(b) * r2 * 0.4, 6 * sc2, 2.6 * sc2, -Math.PI / 2 + (q("gl" + i + m) - 0.5) * 2.2, i % 3 ? "#3f7a46" : "#5a8a3e", "#24502e"); } } /* des touffes basses, un couvre-sol */
  for (let i = 0; i < 70; i++) { const sd = i % 2 ? 1 : -1, u = q("mo" + i), sc2 = 1 + u * 1.6, x = VP.x + sd * (150 * sc2 - q("mw" + i) * 30 * sc2), y = 150 + 82 * sc2 - 1, rr = (2 + q("mr" + i) * 4) * sc2; ctx.fillStyle = `rgba(${60 + q("mc" + i) * 30},${100 + q("md" + i) * 40},55,0.6)`; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.35, 0, 0, TAU); ctx.fill(); } /* la mousse, au pied des murets et dans les joints */
  /* le bassin : une margelle de pierre ronde, l'eau, les nénuphars, un filet d'eau qui tombe d'une vasque */
  { const bx = 482, by = 320, rx = 82, ry = 19;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(bx + 4, by + 10, rx + 6, ry + 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#8a8476"; ctx.beginPath(); ctx.ellipse(bx, by + 6, rx + 6, ry + 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#aaa496"; ctx.beginPath(); ctx.ellipse(bx, by, rx + 6, ry + 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1c2e30"; ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(200,230,240,${0.08 + 0.12 * day})`; ctx.beginPath(); ctx.ellipse(bx - 22, by - 6, 36, 3, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 3; k++) { const rr = ((t * 8 + k * 14) % 42); ctx.strokeStyle = `rgba(200,230,240,${0.25 * (1 - rr / 42)})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(bx + 20, by - 2, rr, rr * 0.22, 0, 0, TAU); ctx.stroke(); } /* les ronds dans l'eau, sous le filet */
    for (const [lx, ly, lr] of [[bx - 50, by + 4, 9], [bx - 30, by - 8, 6], [bx + 52, by + 2, 8], [bx + 38, by + 10, 6]]) { ctx.fillStyle = "#3f7a4a"; ctx.beginPath(); ctx.ellipse(lx, ly, lr, lr * 0.4, 0, 0.3, TAU - 0.1); ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.ellipse(lx - lr * 0.3, ly - lr * 0.1, lr * 0.4, lr * 0.12, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#f0e0ec"; for (const a of [0, 1.2, 2.4, 3.6, 4.8]) { ctx.beginPath(); ctx.ellipse(bx - 30 + Math.cos(a) * 2.5, by - 10 + Math.sin(a) * 1, 2.4, 1.2, a, 0, TAU); ctx.fill(); } ctx.fillStyle = "#e6c45a"; ctx.beginPath(); ctx.arc(bx - 30, by - 10, 1.2, 0, TAU); ctx.fill(); /* une fleur de nénuphar */
    ctx.fillStyle = "#8a8476"; ctx.fillRect(bx + 17, by - 34, 6, 32); ctx.fillStyle = "#aaa496"; ctx.beginPath(); ctx.ellipse(bx + 20, by - 36, 16, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#8a8476"; ctx.beginPath(); ctx.ellipse(bx + 20, by - 34, 16, 4, 0, 0, Math.PI); ctx.fill(); /* la vasque */
    ctx.strokeStyle = `rgba(210,235,245,${0.5})`; ctx.lineWidth = 1; for (const dx of [-14, 14]) { ctx.beginPath(); ctx.moveTo(bx + 20 + dx, by - 35); ctx.quadraticCurveTo(bx + 20 + dx * 1.15, by - 26, bx + 20 + dx * 1.1, by - 2); ctx.stroke(); } /* l'eau qui déborde de la vasque */
  }
  ctx.strokeStyle = "#5a7a3a"; ctx.lineWidth = 1.4; for (let k = 0; k < 9; k++) { const rx = 548 + k * 5, h = 40 + q("rd" + k) * 30, sw = Math.sin(t * 0.7 + k) * 2; ctx.beginPath(); ctx.moveTo(rx, 322); ctx.quadraticCurveTo(rx + sw, 322 - h / 2, rx + sw * 2, 322 - h); ctx.stroke(); if (k % 3 === 0) { ctx.fillStyle = "#6a4a2a"; ctx.fillRect(rx + sw * 2 - 1.5, 322 - h - 6, 3, 9); } } /* les roseaux, et leurs massettes */
  /* les fougères */
  fern(ctx, 200, 252, 0.95, t);
  /* les parterres : des rosiers, des fleurs de cristal (celles du tableau de l'atelier), du muguet, et, à l'ombre, des champignons qui luisent */
  const tone = flowerToneOf(r);
  rose(ctx, 92, 266, 1.0, t, 1); rose(ctx, 140, 270, 0.9, t, 2); rose(ctx, 506, 262, 0.9, t, 3); rose(ctx, 540, 266, 0.8, t, 4); rose(ctx, 590, 300, 1.3, t, 1); rose(ctx, 470, 286, 1.1, t, 2);
  for (const [cx, cy, cs] of [[224, 262, 0.6], [240, 270, 0.75], [208, 272, 0.7], [406, 266, 0.65], [420, 276, 0.8], [392, 280, 0.7]]) crystalFlower(ctx, cx, cy, cs, t, tone);
  for (const [mx, my, ms] of [[96, 348, 1.2], [128, 352, 1.3], [44, 300, 1.0], [418, 296, 1.0], [438, 288, 0.9], [512, 296, 1.0], [560, 340, 1.1]]) muguet(ctx, mx, my, ms, t);
  const MUSH = [[404, 344, 1.5], [418, 352, 1.8], [396, 356, 1.1], [612, 352, 1.4], [626, 358, 1.0], [40, 352, 1.2]];
  for (const [mx, my, ms] of MUSH) mushroom(ctx, mx, my, ms, t, night);
  /* le banc de fonte, à gauche : un dossier ajouré, des pieds en volutes, des lattes de bois */
  { const x0 = 96, y0 = 290, w = 118; ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x0 + 2, y0 + 32, w, 4);
    ctx.strokeStyle = ST.frame === "#5f7f6c" ? "#3a4a40" : ST.frame; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 - 26); ctx.lineTo(x0 + w, y0 - 26); ctx.stroke();
    ctx.lineWidth = 1.2; for (let k = 0; k < 6; k++) scroll(ctx, x0 + 10 + k * 20, y0 - 14, 6, k % 2 ? 1 : -1); /* le dossier en volutes */
    ctx.fillStyle = "#7a5a3a"; for (let k = 0; k < 3; k++) ctx.fillRect(x0, y0 - 2 + k * 3, w, 2.2); /* les lattes */
    ctx.lineWidth = 2.2; for (const lx of [x0 + 6, x0 + w - 6]) { ctx.beginPath(); ctx.moveTo(lx, y0 - 26); ctx.lineTo(lx, y0 + 6); ctx.quadraticCurveTo(lx + (lx < x0 + 50 ? -6 : 6), y0 + 20, lx + (lx < x0 + 50 ? -2 : 2), y0 + 32); ctx.stroke(); ctx.lineWidth = 1.2; scroll(ctx, lx + (lx < x0 + 50 ? 5 : -5), y0 + 14, 4, lx < x0 + 50 ? 1 : -1); ctx.lineWidth = 2.2; } }
  /* la table de rempotage, à droite : des godets de terre cuite, un arrosoir */
  ctx.fillStyle = "#4a3422"; ctx.fillRect(560, 268, 76, 6); ctx.fillRect(566, 274, 5, 40); ctx.fillRect(626, 274, 5, 40); ctx.fillRect(566, 300, 65, 3);
  for (const [px, ph] of [[572, 10], [588, 8], [602, 11]]) { ctx.fillStyle = "#a85a3a"; ctx.beginPath(); ctx.moveTo(px - 6, 268); ctx.lineTo(px + 6, 268); ctx.lineTo(px + 4, 268 - ph); ctx.lineTo(px - 4, 268 - ph); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,220,180,0.2)"; ctx.fillRect(px - 4, 267 - ph, 8, 1.2); for (let m = 0; m < 4; m++) leaf(ctx, px, 266 - ph, 7, 2.6, -Math.PI / 2 + (m - 1.5) * 0.7, "#4b8a4a", "#2f5a34"); }
  ctx.fillStyle = "#6a7a7a"; ctx.beginPath(); ctx.ellipse(622, 262, 8, 6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#6a7a7a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(614, 262); ctx.lineTo(604, 252); ctx.stroke(); /* l'arrosoir */
  for (const [px, ph] of [[580, 312], [600, 314]]) { ctx.fillStyle = "#9a5a3a"; ctx.beginPath(); ctx.moveTo(px - 8, ph - 12); ctx.lineTo(px + 8, ph - 12); ctx.lineTo(px + 6, ph); ctx.lineTo(px - 6, ph); ctx.closePath(); ctx.fill(); } /* des pots vides, dessous */
  if (ST !== STYLES.glass) { const px = 44, py = 338; ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(px + 4, py + 2, 30, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#9a5a34"; ctx.beginPath(); ctx.moveTo(px - 26, py - 40); ctx.lineTo(px + 26, py - 40); ctx.lineTo(px + 19, py); ctx.lineTo(px - 19, py); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#b06a3e"; ctx.fillRect(px - 28, py - 44, 56, 7); ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(px - 24, py - 30, 48, 2);
    for (let k = 0; k < 8; k++) frond(ctx, px, py - 44, -Math.PI / 2 + (k - 3.5) * 0.36 + Math.sin(t * 0.3 + k) * 0.01, 110 + (k % 3) * 18, (k - 3.5) * 0.07, k % 2 ? "#3f7a46" : "#356a3e", "#22482a", { n: 16, fl: 24, droop: 0.7, spread: 0.85, fw: 0.13 }); } /* un palmier en pot, à gauche */
  if (ST === STYLES.plain) { /* un olivier dans une vasque de pierre sur piédouche, comme sur la photo */
    const ox = 262, oy = 332; ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(ox + 4, oy + 2, 26, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#b8b0a0"; ctx.fillRect(ox - 14, oy - 6, 28, 6); ctx.fillRect(ox - 6, oy - 18, 12, 12); ctx.beginPath(); ctx.moveTo(ox - 26, oy - 44); ctx.lineTo(ox + 26, oy - 44); ctx.quadraticCurveTo(ox + 22, oy - 18, ox, oy - 18); ctx.quadraticCurveTo(ox - 22, oy - 18, ox - 26, oy - 44); ctx.fill();
    ctx.fillStyle = "#cfc8b8"; ctx.fillRect(ox - 28, oy - 48, 56, 5); ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(ox - 20, oy - 36, 40, 2); ctx.fillStyle = "#4a3a2a"; ctx.beginPath(); ctx.ellipse(ox, oy - 48, 24, 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(ox, oy - 48); ctx.bezierCurveTo(ox - 8, oy - 70, ox + 10, oy - 82, ox + 2, oy - 104); ctx.stroke(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox + 1, oy - 80); ctx.quadraticCurveTo(ox + 18, oy - 92, ox + 22, oy - 112); ctx.moveTo(ox - 2, oy - 74); ctx.quadraticCurveTo(ox - 16, oy - 86, ox - 20, oy - 104); ctx.stroke();
    for (let i = 0; i < 220; i++) { const cl = [[ox + 2, oy - 112], [ox + 22, oy - 118], [ox - 20, oy - 110], [ox + 10, oy - 128]][i % 4], a = q("ol" + i) * TAU, rr = Math.sqrt(q("or" + i)) * 22; leaf(ctx, cl[0] + Math.cos(a) * rr, cl[1] + Math.sin(a) * rr * 0.6, 9, 1.8, a, i % 2 ? "#8a9f6a" : "#6f8a5a", "#4f6a4a"); } }
  else if (ST === STYLES.castle) { /* un lustre de fer, au-dessus de l'allée */
    ctx.strokeStyle = "#23212a"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(320, 0); ctx.lineTo(320, 34); ctx.stroke(); ctx.beginPath(); ctx.ellipse(320, 40, 34, 6, 0, 0, TAU); ctx.stroke();
    for (const dx of [-30, -15, 0, 15, 30]) { ctx.fillStyle = "#e8dcc0"; ctx.fillRect(320 + dx - 1.5, 28, 3, 9); const f = 0.8 + 0.2 * Math.sin(t * 7 + dx); ctx.fillStyle = `rgba(255,200,110,${0.9 * f})`; ctx.beginPath(); ctx.ellipse(320 + dx, 25, 1.6, 3 * f, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = `rgba(255,200,120,${0.06 + 0.1 * night})`; ctx.beginPath(); ctx.arc(320, 30, 80, 0, TAU); ctx.fill(); }
  else { /* la Verrière : deux palmes dans des pots de cuivre */
    for (const [px, sd] of [[46, 1], [596, -1]]) { ctx.fillStyle = "#b5652a"; ctx.beginPath(); ctx.moveTo(px - 16, 300); ctx.lineTo(px + 16, 300); ctx.lineTo(px + 12, 330); ctx.lineTo(px - 12, 330); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 6; k++) frond(ctx, px, 300, -Math.PI / 2 + (k - 2.5) * 0.45 + sd * 0.2, 76, (k - 2.5) * 0.06, "#3b7a4a", "#24503a", { n: 12, fl: 16, droop: 0.5 }); } }
  { const SUN = require("./relto-light").sunOf(sky, r && r.hour ? r.hour() : sky.hour); /* la lumière tachetée, au sol : elle glisse avec l'heure, longue le matin et le soir ; sous la Verrière, les verres de la frise la colorent, comme dans une église */
    if (SUN) { const tinted = ST.stained || ST === STYLES.castle, cols = ST.stained ? [[255, 190, 90], [235, 120, 160], [120, 210, 140], [150, 130, 230], [255, 225, 110]] : ST === STYLES.castle ? [[200, 50, 70], [150, 70, 190], [230, 180, 100], [170, 40, 90], [240, 220, 230]] : [[255, 240, 200]], L = 1 + (1 - SUN.el) * 1.6, sh = SUN.az * 60;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; for (let i2 = 0; i2 < (tinted ? 40 : 22); i2++) { const x = 60 + q("lx" + i2) * 520 + sh * (0.5 + q("ly" + i2)), y = 248 + q("ly" + i2) * 100, rr = (tinted ? 5 : 8) + q("lr" + i2) * (tinted ? 12 : 22), c = cols[i2 % cols.length], a = (tinted ? 0.3 : 0.16) * SUN.day;
        const lg = ctx.createRadialGradient(x, y, 1, x, y, rr * L); lg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`); lg.addColorStop(0.7, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.6})`); lg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(x, y, rr * L, rr * 0.32, SUN.az * 0.12, 0, TAU); ctx.fill(); } ctx.restore(); } }
  /* les scarabées : sept qui marchent, s'arrêtent et repartent ; un huitième sur le banc ; un neuvième qui grimpe une fronde */
  const spots = [[150, 330, 40, 8], [340, 338, 40, 8], [350, 290, 30, 5], [420, 352, 34, 4], [600, 336, 20, 5], [70, 334, 26, 5], [520, 282, 26, 4]];
  const pos = spots.map(([cx, cy, rx, ry], i) => pathOf(i, t, cx, cy, rx, ry));
  pos.forEach((p, i) => beetle(ctx, p.x, p.y, (14 + q("s" + i) * 6) * (0.55 + (p.y - 232) / 128 * 0.6), p.a, t, { walk: p.walk, gait: p.gait, glow: night, persp: 0.74 })); /* plus petits au loin ; le corps, moins écrasé que le sol, garde son volume */
  grassOver(ctx, t, pos); /* des brins d'herbe devant eux : ils passent dedans, pas dessus */
  for (let f = 0; f < 2; f++) flyer(ctx, t, f, night); /* de temps en temps, l'un d'eux s'envole, traverse la serre et se pose ailleurs */
  foreground(ctx, t); /* au premier plan, des feuillages qui sortent du cadre */
  { const vg = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(10,20,14,0.45)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); } /* un voile sombre aux bords */
  if (night > 0.3) { ctx.fillStyle = `rgba(0,0,0,${0.45 * night})`; ctx.fillRect(0, 0, W, H); for (const [mx, my, ms] of MUSH) { const gl = ctx.createRadialGradient(mx, my - 4 * ms, 1, mx, my - 4 * ms, 22 * ms); gl.addColorStop(0, `rgba(120,240,230,${0.5 * night})`); gl.addColorStop(1, "rgba(120,240,230,0)"); ctx.fillStyle = gl; ctx.fillRect(mx - 22 * ms, my - 26 * ms, 44 * ms, 44 * ms); mushroom(ctx, mx, my, ms, t, night, true); } for (const p of pos) { const gl = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 18); gl.addColorStop(0, `rgba(140,230,200,${0.55 * night})`); gl.addColorStop(1, "rgba(140,230,200,0)"); ctx.fillStyle = gl; ctx.fillRect(p.x - 18, p.y - 18, 36, 36); } } /* la nuit, leur dos luit */
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
