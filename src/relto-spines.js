"use strict";
/*
 * Les livres du Relto, d'une seule main (26 oct. 2026, demande de l'auteur : harmoniser sur les livres de liaison de la cabane).
 * Des reliures ternes (la palette du coffre), un cuir arrondi (plus clair au milieu), des nerfs d'un or passé dont le nombre et la hauteur
 * changent d'un livre à l'autre, une pièce de titre ; l'usure dit l'état d'un monde, jamais une couleur de code.
 * - `spine` : un livre debout, vu de dos ; `ornate` (les Livres descriptifs) ajoute des coiffes, un double filet et un fleuron.
 * - `flatBook` / `pile` : un livre couché, vu de la tranche du dos ; le titre s'y écrit à l'or passé.
 * Les couleurs qu'un dessin donne sont adoucies (`muted`), sans perdre leur teinte : un livre bleu reste bleu, un rouge reste rouge
 * (l'énigme des trois livres de l'atelier en dépend).
 */
const { rgba } = require("./util");

/** La palette du coffre : des reliures de savant, ternes, jamais vives. */
const NEUTRAL = ["#4b3a26", "#33442f", "#2f3e4f", "#3d3a2a", "#4a2f3a", "#2b3a45"];
const GILT = [176, 150, 98];

const rgbOf = (h) => [1, 3, 5].map((k) => parseInt(String(h).slice(k, k + 2), 16));
const hexOf = (v) => "#" + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
/** Éclaircir (t > 0) ou assombrir (t < 0) une couleur hexadécimale. */
function shade(h, t) { return hexOf(rgbOf(h).map((x) => (t > 0 ? x + (255 - x) * t : x * (1 + t)))); }
/** Adoucir une couleur vers un brun de cuir (k de 0 à 1) : la teinte reste, l'éclat s'en va. */
function muted(h, k = 0.3) { const a = rgbOf(h), b = rgbOf("#3a3226"); return hexOf(a.map((x, i) => x + (b[i] - x) * k)); }
/** Un nombre tiré d'une clé (le nom de l'Âge, le titre…) : chaque reliure garde ses nerfs. */
const keyOf = (s) => [...String(s || "")].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Un livre debout, vu de dos. o : { verdict, key, ornate, blank (sans pièce de titre), pressed } */
function spine(ctx, c, x, y, w, h, color, o = {}) {
  const k = keyOf(o.key || color), plain = o.style === "plain"; o = o.style === "ornate" ? { ...o, ornate: true } : o; /* style : "plain" (cuir nu, sans nerfs), "simple" (par défaut), "ornate" */
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, c(shade(color, -0.35))); g.addColorStop(0.45, c(shade(color, 0.06))); g.addColorStop(1, c(shade(color, -0.45)));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (o.ornate) { /* les coiffes, en haut et en bas : un bourrelet de cuir plus sombre */
    ctx.fillStyle = c(shade(color, -0.5)); ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
  }
  const top = 3 + (k % 3) + (o.ornate ? 2 : 0), nb = 1 + ((k >>> 3) % 3), bot = h * (0.7 + ((k >>> 6) % 5) * 0.045), gap = 3 + ((k >>> 9) % 2), bands = [];
  for (let i = 0; i < nb; i++) bands.push(y + top + i * gap);
  for (let i = 0; i < 1 + ((k >>> 11) % 2); i++) bands.push(Math.min(y + h - 4, y + bot + i * gap));
  if (plain) bands.length = 0; /* le cuir nu : pas de nerfs, au plus une pièce de titre */
  for (const yy of bands) { ctx.fillStyle = rgba(0, 0, 0, 0.4); ctx.fillRect(x, yy + 1, w, 1); ctx.fillStyle = rgba(GILT[0], GILT[1], GILT[2], 0.55); ctx.fillRect(x, yy, w, 0.8); } /* les nerfs, d'un or passé */
  if (!o.blank) {
    const ty = y + h * 0.3, th = h * 0.22;
    ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 2, ty, w - 4, th);
    ctx.fillStyle = rgba(GILT[0], GILT[1], GILT[2], 0.3); ctx.fillRect(x + 3, ty + 2, w - 6, 0.8); ctx.fillRect(x + 3, ty + th - 3, w - 6, 0.8); /* la pièce de titre */
    if (o.ornate) { ctx.fillStyle = rgba(GILT[0], GILT[1], GILT[2], 0.5); const cx = x + w / 2, cy = ty + th / 2; ctx.beginPath(); ctx.moveTo(cx, cy - 2.2); ctx.lineTo(cx + 1.6, cy); ctx.lineTo(cx, cy + 2.2); ctx.lineTo(cx - 1.6, cy); ctx.closePath(); ctx.fill(); } /* un fleuron */
  }
  if (o.ornate) { ctx.strokeStyle = rgba(GILT[0], GILT[1], GILT[2], 0.22); ctx.lineWidth = 0.6; ctx.strokeRect(x + 1.5, y + h * 0.58, w - 3, h * 0.08); } /* un double filet, à froid presque */
  if (o.verdict === "unstable" || o.verdict === "dying") { /* le cuir éraflé */
    ctx.fillStyle = rgba(210, 200, 180, o.verdict === "dying" ? 0.22 : 0.12);
    for (let i = 0; i < (o.verdict === "dying" ? 5 : 3); i++) ctx.fillRect(x + ((i * 37 + k) % Math.max(1, w - 2)), y + 12 + ((i * 53 + k) % Math.max(1, h - 24)), 1.2, 3 + (i % 3));
  }
  if (o.pressed) { ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, y, w, h); }
}

/** Un livre couché, vu de la tranche du dos (posé sur une table) : le cuir arrondi de haut en bas, des nerfs verticaux, le titre à l'or passé. */
function flatBook(ctx, c, x, y, w, h, body, title, fontPx, key) {
  const color = muted(body, 0.2), k = keyOf(key || title || body);
  ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 1, y - 1, w, 2);
  const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, c(shade(color, -0.3))); g.addColorStop(0.45, c(shade(color, 0.07))); g.addColorStop(1, c(shade(color, -0.45)));
  ctx.fillStyle = g; ctx.fillRect(x, y - h, w, h);
  const xs = [x + 4 + (k % 3), x + 8 + (k % 3), x + w - 10 - ((k >>> 4) % 3)];
  if ((k >>> 7) % 2) xs.push(x + w - 6 - ((k >>> 4) % 3));
  for (const xx of xs) { ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(xx + 1, y - h, 1, h); ctx.fillStyle = rgba(GILT[0], GILT[1], GILT[2], 0.55); ctx.fillRect(xx, y - h, 0.9, h); } /* les nerfs du dos */
  if (title) { ctx.font = `${fontPx}px serif`; let t = title; while (t.length > 2 && ctx.measureText(t).width > w - 26) t = t.slice(0, -2) + "…"; ctx.fillStyle = rgba(GILT[0] + 30, GILT[1] + 30, GILT[2] + 20, 0.85); ctx.textAlign = "center"; ctx.fillText(t, x + w / 2 - 1, y - h / 2 + fontPx * 0.35); ctx.textAlign = "left"; }
}

/** Une pile de livres couchés, du bas vers le haut ; renvoie les zones à pousser. books : [{dx?, w, h, body, title, ...reste}] */
function pile(ctx, c, x, y, books, fontPx) {
  const out = []; let cy = y;
  books.forEach((b, i) => { const bx = x + (b.dx != null ? b.dx : [0, 3, -2, 2][i % 4]); flatBook(ctx, c, bx, cy, b.w, b.h, b.body, b.title, fontPx, b.kind || b.title); out.push({ b, x: bx - 1, y: cy - b.h - 1, w: b.w + 2, h: b.h + 2 }); cy -= b.h; });
  return out;
}

module.exports = { NEUTRAL, GILT, shade, muted, keyOf, spine, flatBook, pile };
