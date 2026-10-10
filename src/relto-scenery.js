"use strict";
// Éléments de décor ajoutés par les pages du Relto (ciel, faune, mobilier, îlots). Tout est dessiné ici, rien n'est emprunté.
// Chaque fonction reçoit le contexte 2D, le renderer `r` (pour la graine, le dessin du ciel, les zones cliquables), le ciel `sky` et le temps `t`.
const { rng, clamp, lerp, smooth, mix, rgba, fnv } = require("./util");
const DT = require("./dnitime");
const DC = require("./dniclock");
const W = 640, H = 360, GY = 208;
const amb = (sky) => 0.35 + 0.65 * sky.ambient;

/** Grande lune (toujours visible, pâle le jour) et petite lune compagne. */
function moons(ctx, sky) {
  const a = 0.28 + 0.62 * sky.night;
  for (const [x, y, r, k] of [[500, 96, 24, 1], [436, 72, 9, 0.8]]) {
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 2.6); g.addColorStop(0, rgba(220, 230, 255, 0.28 * a * k)); g.addColorStop(1, rgba(220, 230, 255, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
    ctx.fillStyle = rgba(236, 238, 246, a * k); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.fillStyle = rgba(160, 168, 190, 0.35 * a * k); for (const [dx, dy, rr] of [[-0.35, -0.2, 0.22], [0.25, 0.3, 0.17], [0.3, -0.35, 0.12]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, 6.283); ctx.fill(); }
  }
}

/** Pluie : traits obliques (d = intensité). */
function rain(ctx, d, sky, t, heavy) {
  const n = Math.round((60 + d * 160) * (heavy ? 1.6 : 1)), len = heavy ? 11 : 8;
  ctx.strokeStyle = rgba(200, 215, 235, heavy ? 0.5 : 0.38); ctx.lineWidth = 0.8; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 260 + (i % 7) * 22, x = ((i * 53.7) % (W + 40)) - 20 - (t * sp * 0.18) % 60 + 30, y = ((i * 131.3) + t * sp) % (H + 20) - 10;
    ctx.moveTo(x, y); ctx.lineTo(x - len * 0.25, y + len);
  }
  ctx.stroke();
}

/** Orage : ciel assombri, pluie dense, éclairs espacés (déterministes en fonction du temps). */
function storm(ctx, d, sky, t) {
  ctx.fillStyle = rgba(18, 22, 40, 0.28 + 0.2 * d); ctx.fillRect(0, 0, W, H);
  rain(ctx, d, sky, t, true);
  const period = 6.5, k = Math.floor(t / period), ph = t / period - k;
  if (ph < 0.045 || (ph > 0.075 && ph < 0.095)) {
    const r = rng((k * 7919 + 13) >>> 0); let x = 120 + r() * 400, y = 0; ctx.fillStyle = rgba(235, 240, 255, 0.16 + (ph < 0.045 ? 0.12 : 0)); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgba(245, 248, 255, 0.95); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y);
    while (y < GY - 10) { y += 14 + r() * 14; x += (r() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}

/** Oiseaux : silhouettes qui traversent le ciel (moins visibles la nuit). */
function birds(ctx, d, sky, t) {
  const n = Math.round(3 + d * 6), a = clamp(1 - sky.night * 0.85);
  if (a < 0.05) return;
  ctx.save(); ctx.strokeStyle = rgba(30, 30, 40, 0.75 * a); ctx.lineWidth = 1.1; ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const sp = 14 + (i % 4) * 6, x = ((i * 137 + t * sp) % (W + 80)) - 40, y = 40 + (i * 29) % 90 + Math.sin(t * 0.7 + i) * 6, f = Math.sin(t * 7 + i * 1.9) * 3;
    ctx.beginPath(); ctx.moveTo(x - 5, y + f * 0.6); ctx.quadraticCurveTo(x - 2.5, y - 2 - f, x, y); ctx.quadraticCurveTo(x + 2.5, y - 2 - f, x + 5, y + f * 0.6); ctx.stroke();
  }
  ctx.restore();
}

/** Papillons : voltigent autour de l'île de jour. */
function butterflies(ctx, d, sky, t) {
  const n = Math.round(4 + d * 10), a = clamp(1 - sky.night * 1.2);
  if (a < 0.05) return;
  const PAL = ["#f0a23c", "#7fb8f0", "#f06aa0", "#f4e45a", "#b890f0"];
  for (let i = 0; i < n; i++) {
    const cx = 190 + (i * 43) % 270, cy = 150 + (i * 23) % 50, x = cx + Math.sin(t * 0.5 + i * 1.3) * 34, y = cy + Math.sin(t * 0.9 + i * 2.1) * 12, w = Math.abs(Math.sin(t * 13 + i)) * 3 + 0.8;
    ctx.fillStyle = rgba(...hexRgb(PAL[i % PAL.length]), 0.9 * a); ctx.beginPath(); ctx.ellipse(x - w * 0.5, y, w, 2.1, 0.5, 0, 6.283); ctx.ellipse(x + w * 0.5, y, w, 2.1, -0.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = rgba(40, 30, 30, 0.8 * a); ctx.fillRect(x - 0.3, y - 1.4, 0.7, 2.8);
  }
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/** Ponton de bois qui s'avance dans la brume, à droite de l'île, avec une barque amarrée. */
/** Un pont de cordes de (x0, y0) à (x1, y1), planches et poteaux, un peu affaissé au milieu. */
function ropeBridge(ctx, r, c, x0, y0, x1, y1, tip) {
  const sag = 6, n = Math.max(6, Math.round(Math.abs(x1 - x0) / 4.6));
  ctx.strokeStyle = c("#8a6a44"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 - 5); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 5 + sag, x1, y1 - 5); ctx.stroke();
  ctx.fillStyle = c("#6b4a30"); for (let i = 0; i <= n; i++) { const p = i / n, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p + Math.sin(p * Math.PI) * sag * 0.9; ctx.fillRect(x - 1.6, y, 3.2, 1.6); }
  ctx.fillStyle = c("#4a3220"); ctx.fillRect(x0 - 1, y0 - 7, 1.6, 8); ctx.fillRect(x1 - 1, y1 - 7, 1.6, 8);
  r.hot.push({ x: Math.min(x0, x1) - 2, y: Math.min(y0, y1) - 10, w: Math.abs(x1 - x0) + 4, h: Math.abs(y0 - y1) + 18, tip });
}

/**
 * Le ponton, à droite de l'île. Avec le pinacle du calendrier, il devient un pont de cordes qui y mène ; avec l'horloge D'ni,
 * un second pont part du bord gauche de l'île jusqu'à son îlot.
 */
function dock(ctx, r, sky, t, toPinnacle, toClock) {
  const a = 0.4 + 0.6 * sky.ambient, c = (h) => mix("#05060c", h, a);
  if (toClock) ropeBridge(ctx, r, c, 148, GY + 2, 112, 204, "Bridge to the D'ni clock");
  if (toPinnacle) { ropeBridge(ctx, r, c, 470, GY + 2, 526, 202, "Bridge to the calendar pinnacle"); return; }
  const X0 = 470, X1 = 530, y = GY + 3;
  ctx.fillStyle = c("#6b4a30"); ctx.fillRect(X0, y, X1 - X0, 3);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 0.6; for (let x = X0 + 4; x < X1; x += 5) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 3); ctx.stroke(); }
  ctx.fillStyle = c("#4a3220"); for (const x of [X0 + 8, X0 + 28, X1 - 4]) ctx.fillRect(x, y + 3, 2.4, 14);
  const bob = Math.sin(t * 1.1) * 0.8; ctx.save(); ctx.translate(X1 - 22, y + 11 + bob);
  ctx.fillStyle = c("#7a4a2a"); ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(11, -2); ctx.lineTo(7, 3); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill(); ctx.fillStyle = c("#caa064"); ctx.fillRect(-9, -2.6, 18, 1); ctx.restore();
  ctx.strokeStyle = c("#caa064"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(X1 - 4, y + 3); ctx.quadraticCurveTo(X1 - 12, y + 9, X1 - 18, y + 9 + bob); ctx.stroke();
  if (sky.night > 0.35) { const g = ctx.createRadialGradient(X1 - 2, y - 5, 0, X1 - 2, y - 5, 12); g.addColorStop(0, rgba(255, 200, 120, 0.7 * sky.night)); g.addColorStop(1, rgba(255, 200, 120, 0)); ctx.fillStyle = g; ctx.fillRect(X1 - 14, y - 17, 24, 24); ctx.fillStyle = rgba(255, 220, 150, 0.95); ctx.fillRect(X1 - 3, y - 6, 2, 3); ctx.fillStyle = c("#4a3220"); ctx.fillRect(X1 - 2.4, y - 3, 1, 3); }
  r.hot.push({ x: X0, y: y - 6, w: X1 - X0 + 2, h: 22, tip: "Dock" });
}

/** Banc de bois sur l'île, entre la cabane et l'étagère. */
function bench(ctx, r, sky, bx) {
  const a = 0.4 + 0.6 * sky.ambient, c = (h) => mix("#05060c", h, a), x0 = bx != null ? bx : 289, y = GY;
  ctx.fillStyle = c("#6b4a30"); ctx.fillRect(x0, y - 9, 26, 2); ctx.fillRect(x0, y - 13, 26, 1.6); ctx.fillRect(x0 + 1, y - 13, 1.6, 6); ctx.fillRect(x0 + 23.4, y - 13, 1.6, 6);
  ctx.fillStyle = c("#4a3220"); ctx.fillRect(x0 + 2, y - 7, 2, 7); ctx.fillRect(x0 + 22, y - 7, 2, 7);
  r.hot.push({ x: x0 - 1, y: y - 15, w: 28, h: 15, tip: "Bench" });
}

/** Fleurs basses le long du sol (asset : blue, red, yellow, white, pink). */
function flowers(ctx, a, sky, t, clear) {
  const PAL = { blue: "#5b8cf0", red: "#e04a4a", yellow: "#f2d04a", white: "#f4f1e8", pink: "#f08ab8" }, col = PAL[a.asset] || PAL.blue, n = Math.round(14 + a.density * 46), r = rng(0x5eed ^ fnv(String(a.asset || "blue")));
  const k = amb(sky);
  for (let i = 0; i < n; i++) {
    const x = 174 + r() * 292; if (clear.some(([c0, c1]) => x > c0 && x < c1)) continue;
    const h = 3 + r() * 4, sw = Math.sin(t * 1.1 + i) * 0.8;
    ctx.strokeStyle = mix("#05060c", "#3f7a3a", k); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, GY + 3); ctx.lineTo(x + sw, GY + 3 - h); ctx.stroke();
    ctx.fillStyle = mix("#05060c", col, k); ctx.beginPath(); ctx.arc(x + sw, GY + 3 - h, 1.5, 0, 6.283); ctx.fill();
  }
}

/** Herbe haute le long du sol. */
function grass(ctx, d, sky, t, clear) {
  const n = Math.round(50 + d * 150), r = rng(0x9a55), k = amb(sky);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < n; i++) {
    const x = 172 + r() * 298; if (clear.some(([c0, c1]) => x > c0 && x < c1)) continue;
    const h = 5 + r() * 6, sw = Math.sin(t * 1.3 + i * 0.7) * 1.4;
    ctx.strokeStyle = mix("#05060c", i % 3 ? "#5a9a46" : "#7ab45a", k); ctx.beginPath(); ctx.moveTo(x, GY + 4); ctx.quadraticCurveTo(x + sw * 0.4, GY + 4 - h * 0.6, x + sw, GY + 4 - h); ctx.stroke();
  }
}

/** Petits îlots flottants dans la brume, derrière l'île. */
function islets(ctx, r, d, sky, t) {
  const n = Math.round(2 + d * 3), POS = [[76, 146, 0.8], [536, 176, 1], [132, 240, 0.6], [566, 238, 0.7], [488, 264, 0.5]], k = amb(sky);
  for (let i = 0; i < Math.min(n, POS.length); i++) {
    const [x, y0, s] = POS[i], y = y0 + Math.sin(t * 0.4 + i * 1.7) * 2;
    ctx.save(); ctx.globalAlpha = 0.5 + 0.35 * s; ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = mix("#05060c", "#5a5148", k); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(10, 26); ctx.lineTo(0, 38); ctx.lineTo(-12, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mix("#05060c", "#6f8a4a", k); ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, 6.283); ctx.fill();
    if (i % 2 === 0) { ctx.fillStyle = mix("#05060c", "#2a4a30", k); ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(0, -22); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = mix("#05060c", "#7a6f62", k); ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-1, -26); ctx.lineTo(4, -2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    r.hot.push({ x: x - 26 * s, y: y - 28 * s, w: 52 * s, h: 60 * s, tip: "Islet" });
  }
}

/** Pinacle du calendrier : une pierre dressée sur un îlot, qui porte le jour D'ni (en chiffres D'ni). */
function calendar(ctx, r, sky, t) {
  const x = 548, y = 200, k = amb(sky), d = DC.reltoDate(r.scene); // sans l'horloge D'ni, la pierre dérive de quelques yahr
  ctx.save(); ctx.globalAlpha = 0.85;
  ctx.fillStyle = mix("#05060c", "#5a5148", k); ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 24, y); ctx.lineTo(x + 8, y + 24); ctx.lineTo(x, y + 34); ctx.lineTo(x - 11, y + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix("#05060c", "#6f8a4a", k); ctx.beginPath(); ctx.ellipse(x, y, 24, 5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = mix("#05060c", "#7d7468", k); ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x - 4, y - 56); ctx.lineTo(x + 3, y - 60); ctx.lineTo(x + 7, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(0, 0, 0, 0.2); ctx.beginPath(); ctx.moveTo(x + 1, y - 59); ctx.lineTo(x + 7, y); ctx.lineTo(x + 1, y); ctx.closePath(); ctx.fill();
  const glow = 0.45 + 0.4 * sky.night + 0.1 * Math.sin(t * 1.6), size = 9;
  if (r.dni) { const w = r.dni.widthOf(d.yahr, size); r.dni.drawNumber(ctx, d.yahr, x - 1 - w / 2, y - 40, size, `rgba(255,226,150,${clamp(glow).toFixed(2)})`); }
  ctx.restore();
  r.hot.push({ x: x - 24, y: y - 62, w: 48, h: 98, tip: `Calendar pinnacle — ${d.name} ${d.yahr}${d.synced ? "" : " (by the stone's own reckoning)"}` });
}

/**
 * L'horloge D'ni : sur son îlot, un pilier de pierre qui porte une sphère armillaire de laiton. L'anneau des heures tourne
 * avec le jour D'ni (une révolution par yahr), le globe intérieur lentement ; rien ne clignote : le faisceau, c'est
 * l'observatoire qui le répand dans le Relto.
 */
function dniClock(ctx, r, sky, t) {
  const x = 92, y = 206, k = amb(sky), d = DC.reltoDate(r.scene), ph = DT.dayPhase(), brass = () => mix("#05060c", "#c9a75a", k);
  ctx.save(); ctx.globalAlpha = 0.9;
  // l'îlot
  ctx.fillStyle = mix("#05060c", "#5a5148", k); ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.lineTo(x + 9, y + 22); ctx.lineTo(x - 1, y + 32); ctx.lineTo(x - 10, y + 19); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix("#05060c", "#6f8a4a", k); ctx.beginPath(); ctx.ellipse(x, y, 22, 4.5, 0, 0, 6.283); ctx.fill();
  // le pilier : un fût de pierre, une base et un chapiteau
  const sg = ctx.createLinearGradient(x - 5, 0, x + 5, 0); sg.addColorStop(0, mix("#05060c", "#8d8578", k)); sg.addColorStop(1, mix("#05060c", "#57524a", k));
  ctx.fillStyle = sg; ctx.fillRect(x - 7, y - 6, 14, 6); ctx.fillRect(x - 4, y - 40, 8, 34); ctx.fillRect(x - 6.5, y - 44, 13, 4);
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(x + 1, y - 40, 3, 34);
  // la sphère armillaire
  const cx = x, cy = y - 56, R = 11;
  ctx.lineWidth = 1.3; ctx.strokeStyle = brass();
  ctx.beginPath(); ctx.moveTo(cx, y - 44); ctx.lineTo(cx, cy + R + 1); ctx.stroke(); // le pied
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke(); // le méridien
  ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.32, -0.42, 0, 6.283); ctx.stroke(); // l'écliptique, incliné
  ctx.beginPath(); ctx.ellipse(cx, cy, R * Math.abs(Math.cos(ph * 6.283)), R, 0, 0, 6.283); ctx.stroke(); // l'anneau des heures : il tourne avec le jour D'ni
  ctx.beginPath(); ctx.moveTo(cx - R - 3, cy + 4); ctx.lineTo(cx + R + 3, cy - 4); ctx.stroke(); // l'axe
  const gg = ctx.createRadialGradient(cx - 1.5, cy - 1.5, 0.5, cx, cy, 4); gg.addColorStop(0, mix("#05060c", "#e8d3a0", k)); gg.addColorStop(1, mix("#05060c", "#7a5c28", k));
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx + Math.sin(t * 0.15) * 0.6, cy, 3.4, 0, 6.283); ctx.fill(); // le globe
  ctx.restore();
  r.hot.push({ x: x - 22, y: y - 70, w: 44, h: 104, tip: `D'ni clock — ${DT.format(d)}` });
}

/**
 * Comète (effet `comet`, densité = fréquence) : de temps en temps, une comète traverse lentement le ciel du Relto.
 * Le temps est découpé en fenêtres de `period` secondes (de ~8 min à densité 0 jusqu'à ~1 min 10 à densité 1) ; chaque fenêtre k
 * contient un passage de 40 à 60 s, tiré de la graine du Relto et de k (instant, sens, hauteur, longueur et courbure de la queue).
 * Hauteur : y de 78 à 132 (coordonnées logiques), pour rester dans le ciel visible de la vue de l'île (zoom 1,2 autour de y = 214).
 * Renvoie la tête (x, y), la direction unitaire (dx, dy), la longueur de la queue, l'enveloppe du passage `env` (0..1), ou null.
 * `still` (prefers-reduced-motion) : une comète immobile, au milieu de son premier passage.
 */
function cometAt(seed, t, d, still) {
  const period = 70 + Math.pow(1 - clamp(d), 1.5) * 410, base = (seed ^ fnv("comet")) >>> 0;
  const pass = (k) => { const q = rng((base ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0), dur = 40 + q() * 20; return { k, dur, start: k * period + q() * (period - dur), dir: q() < 0.5 ? 1 : -1, y0: 78 + q() * 30, y1: 92 + q() * 40, len: 95 + q() * 50, curl: (q() - 0.5) * 0.5 }; };
  let c, p;
  if (still) { c = pass(0); p = 0.5; } else { c = pass(Math.floor(t / period)); p = (t - c.start) / c.dur; if (!(p >= 0 && p < 1)) return null; }
  const x0 = c.dir > 0 ? -40 : W + 40, x1 = c.dir > 0 ? W + 40 : -40, vx = x1 - x0, vy = c.y1 - c.y0, n = Math.hypot(vx, vy);
  return { x: lerp(x0, x1, p), y: lerp(c.y0, c.y1, p), dx: vx / n, dy: vy / n, len: c.len, curl: c.curl, env: smooth(p / 0.12) * smooth((1 - p) / 0.12), p, k: c.k, dir: c.dir, period };
}

/** Visibilité de la comète selon l'heure : pleine la nuit, se lève au crépuscule, presque effacée en plein jour. */
const cometVis = (sky) => 0.06 + 0.94 * smooth(((sky.night == null ? 0 : sky.night) - 0.2) / 0.55);

/** Dessine la comète : tête blanc bleuté, longue queue douce et légèrement courbe qui s'éloigne de sa direction, fin trait d'ions. */
function comet(ctx, r, d, sky, t) {
  const c = cometAt(r.scene.seed, t, d, !!(r.opts && r.opts.reducedMotion)); if (!c) return;
  const a = c.env * cometVis(sky); if (a < 0.01) return;
  const bx = -c.dx, by = -c.dy, nx = -by, ny = bx, L = c.len, tx = c.x + bx * L, ty = c.y + by * L;
  const qx = c.x + bx * L * 0.55 + nx * L * c.curl * 0.35, qy = c.y + by * L * 0.55 + ny * L * c.curl * 0.35;
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  for (const [w, al] of [[14, 0.09], [7, 0.15], [3, 0.26]]) { // queue de poussière : trois voiles, du plus large au plus fin
    const g = ctx.createLinearGradient(c.x, c.y, tx, ty); g.addColorStop(0, rgba(210, 228, 255, al * a)); g.addColorStop(0.45, rgba(170, 200, 250, al * 0.55 * a)); g.addColorStop(1, rgba(150, 180, 240, 0));
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo(qx, qy, tx, ty); ctx.stroke();
  }
  const ix = c.x + bx * L * 1.15 - nx * 6, iy = c.y + by * L * 1.15 - ny * 6, gi = ctx.createLinearGradient(c.x, c.y, ix, iy); // queue d'ions : droite, plus bleue
  gi.addColorStop(0, rgba(150, 190, 255, 0.35 * a)); gi.addColorStop(1, rgba(120, 160, 255, 0));
  ctx.strokeStyle = gi; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ix, iy); ctx.stroke();
  const hg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 11); // la chevelure et le noyau
  hg.addColorStop(0, rgba(255, 255, 255, 0.95 * a)); hg.addColorStop(0.3, rgba(205, 228, 255, 0.5 * a)); hg.addColorStop(1, rgba(180, 210, 255, 0));
  ctx.fillStyle = hg; ctx.fillRect(c.x - 11, c.y - 11, 22, 22);
  ctx.fillStyle = rgba(250, 252, 255, a); ctx.beginPath(); ctx.arc(c.x, c.y, 1.4, 0, 6.283); ctx.fill();
  ctx.restore();
}

module.exports = { cometAt, cometVis, comet, moons, rain, storm, birds, butterflies, dock, bench, flowers, grass, islets, calendar, dniClock, W, H, GY };
