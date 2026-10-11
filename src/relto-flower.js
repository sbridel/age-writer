"use strict";
/** La fleur de cristal de l'atelier : un petit cadre ovale au mur, et la même fleur en gros plan. Sa couleur vient de la graine du Relto,
 *  sauf si la page de l'atelier donne `flower_color` (une teinte 0–360 ou un « #rrggbb ») : de quoi la changer sans toucher à la graine. */
const { rng, rgba, fnv } = require("./util");

function hsl(h, sa, l) { h = ((h % 360) + 360) % 360; const k = (n) => (n + h / 30) % 12, a = sa * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))), x = (v) => Math.round(v * 255).toString(16).padStart(2, "0"); return "#" + x(f(0)) + x(f(8)) + x(f(4)); }

/** La teinte imposée par la page de l'atelier (ou null) : un nombre 0–360, ou une couleur « #rrggbb » dont on garde teinte et saturation. */
function flowerOverride(sc) {
  const a = (sc.additions || []).find((x) => (x.type === "atelier" || x.type === "inkwell") && x.flower != null); if (!a) return null;
  const v = String(a.flower).trim(), m = /^#?([0-9a-f]{6})$/i.exec(v);
  if (m) { const n = parseInt(m[1], 16), R = (n >> 16) / 255, G = ((n >> 8) & 255) / 255, B = (n & 255) / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn; if (d < 0.02) return { hue: 0, sat: 0.08 };
    const h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4, l = (mx + mn) / 2; return { hue: ((h * 60) + 360) % 360, sat: Math.max(0.25, Math.min(0.85, d / (1 - Math.abs(2 * l - 1)))) }; }
  const n = Number(v); return Number.isFinite(n) ? { hue: ((n % 360) + 360) % 360 } : null;
}

/** Dessine la fleur (coordonnées du mur : centre 141,150) ; l'appelant a posé le clip de l'ovale. */
function drawFlowerArt(ctx, c, sc, t) {
    const gl = 0.5 + 0.5 * Math.sin(t * 1.3), cx = 141, cy = 150, fq = rng((sc.seed ^ fnv("crystal-flower")) >>> 0), seedHue = fq() * 360, spread = 22 + fq() * 30, seedSat = 0.5 + fq() * 0.3, ov = flowerOverride(sc), hue = ov ? ov.hue : seedHue, fsat = ov && ov.sat != null ? ov.sat : seedSat; // la couleur et le dégradé viennent de la graine du Relto — sauf si la page de l'atelier impose une teinte (flower_color)
    const P1 = hsl(hue, fsat, 0.42), P2 = hsl(hue + spread * 0.6, fsat, 0.55), P3 = hsl(hue + spread, fsat + 0.1, 0.5), HEART = hsl(hue + 150, 0.6, 0.74), BG0 = hsl(hue, 0.3, 0.12), BG1 = hsl(hue + spread, 0.28, 0.2), STEM = hsl(hue + 150, 0.35, 0.38), LEAF = hsl(hue + 150, 0.4, 0.3);
    const bgG = ctx.createLinearGradient(0, 134, 0, 182); bgG.addColorStop(0, c(BG1)); bgG.addColorStop(1, c(BG0)); ctx.fillStyle = bgG; ctx.fillRect(120, 130, 42, 56); // le fond de l'ovale : un dégradé de la même teinte
    const hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22); hg.addColorStop(0, rgba(parseInt(P2.slice(1, 3), 16), parseInt(P2.slice(3, 5), 16), parseInt(P2.slice(5, 7), 16), 0.35 + 0.15 * gl)); hg.addColorStop(1, rgba(parseInt(P2.slice(1, 3), 16), parseInt(P2.slice(3, 5), 16), parseInt(P2.slice(5, 7), 16), 0)); ctx.fillStyle = hg; ctx.fillRect(cx - 24, cy - 24, 48, 48);
    ctx.strokeStyle = c(STEM); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.quadraticCurveTo(cx - 2, cy + 20, cx + 1, cy + 34); ctx.stroke(); // la tige
    for (const [dx, dy, sg] of [[-1, 24, -1], [1, 17, 1]]) { ctx.fillStyle = c(LEAF); ctx.beginPath(); ctx.moveTo(cx + dx, cy + dy); ctx.lineTo(cx + dx + sg * 10, cy + dy - 6); ctx.lineTo(cx + dx + sg * 3, cy + dy + 3); ctx.closePath(); ctx.fill(); } // deux feuilles taillées
    const petal = (ang, len, w, col, hi) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = c(col); ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(-w, -len * 0.45); ctx.lineTo(0, -len); ctx.lineTo(w, -len * 0.45); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, hi); ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -len); ctx.lineTo(w, -len * 0.45); ctx.closePath(); ctx.fill(); ctx.restore(); };
    petal(-1.95, 13, 3.8, P1, 0.08); petal(1.95, 13, 3.8, P1, 0.08); // les deux pétales du bas, qui retombent vers la tige : la fleur ne flotte plus
    ctx.fillStyle = c(LEAF); ctx.beginPath(); ctx.moveTo(cx, cy + 1); ctx.lineTo(cx + 4, cy + 7); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 4, cy + 7); ctx.closePath(); ctx.fill(); // le calice, où la tige rejoint la fleur
    for (let i = 0; i < 5; i++) petal(-1.25 + i * 0.62, 15, 4.2, [P1, P2, P3, P2, P1][i], 0.14 + 0.1 * gl); // les pétales, des losanges à facettes
    ctx.fillStyle = c(HEART); ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3.2, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 3.2, cy); ctx.closePath(); ctx.fill(); // le cœur, de la teinte complémentaire
    ctx.fillStyle = rgba(255, 255, 255, 0.5 + 0.4 * gl); ctx.fillRect(cx + 7, cy - 17, 1.4, 1.4); ctx.fillRect(cx - 9, cy - 9, 1.2, 1.2); // des éclats
}

/** Le cadre ovale (doré) puis la fleur dedans, au centre (141,158) du mur. */
function drawPortrait(ctx, c, sc, t) {
  ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.ellipse(141, 158, 21, 28, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#2e3a36"); ctx.beginPath(); ctx.ellipse(141, 158, 17, 24, 0, 0, 6.283); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(141, 158, 17, 24, 0, 0, 6.283); ctx.clip(); drawFlowerArt(ctx, c, sc, t); ctx.restore();
}

/** La vue rapprochée : le cadre ovale agrandi sur le mur lambrissé, la fleur qui luit. */
function drawCloseup(ctx, c, sc, t, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c("#2a1d14")); g.addColorStop(1, c("#1a110b")); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgba(0, 0, 0, 0.22); for (let x = 0; x < W; x += 64) ctx.fillRect(x, 0, 3, H); // les lames du lambris
  const gl = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 280); gl.addColorStop(0, rgba(255, 190, 90, 0.1)); gl.addColorStop(1, rgba(255, 190, 90, 0)); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2 + 4); ctx.scale(5.5, 5.5); ctx.translate(-141, -158); drawPortrait(ctx, c, sc, t); ctx.restore();
}

module.exports = { drawPortrait, drawCloseup, flowerOverride };
