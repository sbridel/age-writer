"use strict";
// La carte des étoiles (télescope, étape 3) : un parchemin déroulé sur la table de l'observatoire. Au centre le Great Zero
// (une rose à huit pointes), le Relto (la petite île), chaque système situé (une étoile à l'encre, ses Âges en légende au survol),
// ses perturbateurs (signes de cinabre), des traits fins qui relient les étoiles voisines (la constellation), et pour chaque
// étoile un court trait de plomb vers l'endroit où son Âge voit vraiment le Zéro : sur la bonne ligne, il vise la rose ; sur
// la ligne de Me'erta, il la manque. Encre brune sur papier clair : lisible en thème clair comme sombre (le papier reste papier).
// Modèle : src/starmap.js. On y vient par le rouleau au mur de l'observatoire ; ︾ y ramène.
const { rng, clamp, rgba } = require("./util");
const T = require("./telescope");
const MAP = require("./starmap");
const TL = require("./relto-telescope");
const BEAM = require("./beam");
const { makeT } = require("./i18n");

const W = 640, H = 360, SHEET = { x: 70, y: 18, w: 500, h: 300 }, BACK = { x: 0, y: 330, w: W, h: 30 };
const EN = makeT(() => "en");
const tOf = (r) => (r.opts && typeof r.opts.t === "function" ? r.opts.t : EN);
const pertName = (t, kind) => (kind === "black_hole" ? t("map.pert.bh") : kind === "pulsar" ? t("map.pert.pulsar") : t("map.pert.ns"));
const INK = "#3b2a1b", INK2 = "#6b4a2a", RED = "#9b3b22", LEAD = "#5f6b78";

/** Une étoile à l'encre : quatre branches et un point (`big` : le système qui a plusieurs Âges). */
function inkStar(ctx, x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? s * 0.32 : s; ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); }
  ctx.closePath(); ctx.fill();
}
/** Le signe d'un perturbateur, en cinabre. */
function pertSign(ctx, kind, x, y) {
  ctx.strokeStyle = RED; ctx.fillStyle = RED; ctx.lineWidth = 1.1;
  if (kind === "black_hole") { ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 7.5, -0.6, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 7.5, 2.5, 4.3); ctx.stroke(); ctx.fillStyle = "#1a0f0a"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); }
  else if (kind === "pulsar") { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 8, y + 5); ctx.lineTo(x + 8, y - 5); ctx.stroke(); for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(x, y, 4.5, k > 0 ? -0.9 : 2.2, k > 0 ? -0.3 : 2.8); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 6.283); ctx.stroke(); }
}

/** La vue de la carte. */
function drawStarMap(r, ctx, sc, sky, tm) {
  const t = tOf(r), st = TL.state(r), map = MAP.layout(st.zero, st.found ? st.systems : {}, st.line), S = SHEET;
  // la table et le parchemin (taché, bords sombres), éclairé par une lampe
  const tg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 420); tg.addColorStop(0, "#4a3a2a"); tg.addColorStop(1, "#1c140e"); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(S.x + 6, S.y + 8, S.w, S.h);
  const pg = ctx.createRadialGradient(S.x + S.w * 0.45, S.y + S.h * 0.4, 30, S.x + S.w / 2, S.y + S.h / 2, S.w * 0.7); pg.addColorStop(0, "#f4ead2"); pg.addColorStop(0.75, "#e6d5ae"); pg.addColorStop(1, "#c9b083"); ctx.fillStyle = pg; ctx.fillRect(S.x, S.y, S.w, S.h);
  const q = rng(((sc.seed || 0) ^ 0x3a9) >>> 0); for (let i = 0; i < 14; i++) { const x = S.x + q() * S.w, y = S.y + q() * S.h, rr = 8 + q() * 30, g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, rgba(150, 110, 60, 0.07 + 0.06 * q())); g.addColorStop(1, "rgba(150,110,60,0)"); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2); } // taches
  ctx.fillStyle = "#8a6a3a"; ctx.fillRect(S.x - 4, S.y - 3, S.w + 8, 6); ctx.fillRect(S.x - 4, S.y + S.h - 3, S.w + 8, 6); // les deux rouleaux
  ctx.strokeStyle = rgba(59, 42, 27, 0.5); ctx.lineWidth = 0.8; ctx.strokeRect(S.x + 10.5, S.y + 12.5, S.w - 21, S.h - 25);
  const box = { x: S.x + 14, y: S.y + 34, w: S.w - 28, h: S.h - 66 }, P = MAP.fit(map, box, 0.06), [zx, zy] = P.at(0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(S.x + 11, S.y + 13, S.w - 22, S.h - 26); ctx.clip();
  // cercles de distance (1 000, 2 500, 5 000, 10 000 shahfeetee : l'échelle va en racine carrée) et la ligne d'origine : le nord de la carte est la ligne où l'instrument est calé
  ctx.strokeStyle = rgba(107, 74, 42, 0.22); ctx.lineWidth = 0.7; ctx.setLineDash && ctx.setLineDash([2, 4]);
  for (const d of [1000, 2500, 5000, 10000, 15000]) { if (d > map.scale * 1.1) break; ctx.beginPath(); ctx.arc(zx, zy, P.ring(d), 0, 6.283); ctx.stroke(); }
  ctx.setLineDash && ctx.setLineDash([]);
  ctx.strokeStyle = rgba(107, 74, 42, 0.45); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(zx, zy - P.R - 6); ctx.stroke();
  ctx.font = "italic 9px serif"; ctx.fillStyle = INK2; ctx.textAlign = "center"; ctx.fillText(t("map.north"), zx, zy - P.R - 9); ctx.textAlign = "left";
  // les étiquettes ne se chevauchent pas : chacune cherche, autour de son point, une place libre
  const taken = [], place = (x, y, w, h) => { for (const [dx, dy] of [[9, -4], [9, 10], [-9 - w, -4], [-9 - w, 10], [-w / 2, -12], [-w / 2, 18], [12, -16], [-12 - w, 20]]) { const b = { x: x + dx, y: y + dy - h, w, h }; if (b.x < S.x + 14 || b.x + w > S.x + S.w - 14 || b.y < S.y + 14) continue; if (!taken.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)) { taken.push(b); return [b.x, b.y + h - 2]; } } return null; };
  // la constellation : chaque étoile reliée à sa plus proche voisine
  ctx.strokeStyle = rgba(59, 42, 27, 0.35); ctx.lineWidth = 0.8;
  for (const s of map.stars) { let best = null, bd = Infinity; for (const o of map.stars) { if (o === s) continue; const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; best = o; } } if (best && s.key < best.key || (best && map.stars.length === 2)) { const [ax, ay] = P.at(s.x, s.y), [bx, by] = P.at(best.x, best.y); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); } }
  // le Great Zero : une rose des vents à huit pointes
  ctx.save(); ctx.translate(zx, zy);
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, L = i % 2 ? 7 : 12; ctx.fillStyle = i % 2 ? INK2 : INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a - 0.25) * 3, -Math.cos(a - 0.25) * 3); ctx.lineTo(Math.sin(a) * L, -Math.cos(a) * L); ctx.lineTo(Math.sin(a + 0.25) * 3, -Math.cos(a + 0.25) * 3); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#f4ead2"; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.283); ctx.fill(); ctx.restore();
  r.hot.push({ x: zx - 12, y: zy - 12, w: 24, h: 24, tip: t("map.zero") });
  // le Relto : une petite île
  const [rx, ry] = P.at(map.relto.x, map.relto.y);
  ctx.fillStyle = "#7a8a5a"; ctx.beginPath(); ctx.ellipse(rx, ry, 6, 3.6, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(rx - 1.5, ry - 6, 3, 3.4); // la cabane
  taken.push({ x: zx - 12, y: zy - 12, w: 24, h: 24 }, { x: rx - 7, y: ry - 7, w: 14, h: 12 });
  for (const s of map.stars) { const [sx, sy] = P.at(s.x, s.y); taken.push({ x: sx - 6, y: sy - 6, w: 12, h: 12 }); }
  ctx.font = "italic 10px serif"; ctx.fillStyle = INK2; { const w = ctx.measureText(t("map.relto")).width, at = place(rx, ry, w, 10); if (at) ctx.fillText(t("map.relto"), at[0], at[1]); }
  r.hot.push({ x: rx - 10, y: ry - 10, w: 20, h: 20, tip: `${sc.name || "Relto"} — ${t("map.relto.tip")}` });
  // les étoiles situées, leurs perturbateurs, leur trait de plomb vers le Zéro
  for (const s of map.stars) {
    const [sx, sy] = P.at(s.x, s.y);
    for (const p of s.pert) { const [px, py] = P.at(p.x, p.y); ctx.strokeStyle = rgba(155, 59, 34, 0.35); ctx.lineWidth = 0.6; ctx.setLineDash && ctx.setLineDash([1.5, 2.5]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); pertSign(ctx, p.kind, px, py); r.hot.push({ x: px - 8, y: py - 8, w: 16, h: 16, tip: pertName(t, p.kind) }); }
    const len = 22, bad = s.miss > 2 * T.TOL.torahn; // le trait : où l'Âge voit vraiment le Zéro
    ctx.strokeStyle = bad ? RED : LEAD; ctx.lineWidth = bad ? 1.1 : 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + s.ray.x * len, sy - s.ray.y * len); ctx.stroke();
    if (bad) { ctx.fillStyle = RED; ctx.font = "bold 10px serif"; ctx.fillText("?", sx + s.ray.x * len + 2, sy - s.ray.y * len + 3); }
    inkStar(ctx, sx, sy, s.ages.length > 1 ? 6.5 : 5, s.offLine ? "rgba(59,42,27,0.55)" : INK);
    if (s.offLine) { ctx.strokeStyle = RED; ctx.lineWidth = 0.8; ctx.setLineDash && ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 6.283); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); }
    if (s.tri) { ctx.strokeStyle = LEAD; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(sx - 8, sy + 7); ctx.lineTo(sx, sy - 7); ctx.lineTo(sx + 8, sy + 7); ctx.closePath(); ctx.stroke(); } // triangulée
    const label = s.ages.length ? s.ages[0] + (s.ages.length > 1 ? " +" + (s.ages.length - 1) : "") : "";
    if (label) { ctx.font = "italic 9.5px serif"; ctx.fillStyle = INK2; const at = place(sx, sy, Math.min(120, ctx.measureText(label).width), 10); if (at) ctx.fillText(label, at[0], at[1], 120); } // sans place libre : le nom reste au survol
    const tip = (s.ages.length ? s.ages.join(", ") : t("map.star.unnamed")) + (s.pert.length ? " — " + s.pert.map((p) => pertName(t, p.kind)).join(", ") : "") + (bad ? " — " + t("map.star.miss") : "");
    const far = t("beam.far.line", { far: String(t("beam.far")).split("|")[BEAM.fracBand(BEAM.rahnfeeOf(s.distance))] }); // la distance le long du faisceau : en mots, puis en rahnfee (chiffres D'ni)
    r.hot.push({ x: sx - 9, y: sy - 9, w: 18, h: 18, tip: tip + " — " + far, frac: BEAM.digitsOf(s.distance) });
  }
  ctx.restore();
  // le titre, la légende et, si besoin, l'avertissement de l'arpenteur
  ctx.font = "italic 13px serif"; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(t("map.title"), S.x + S.w / 2, S.y + 29); ctx.textAlign = "left";
  const bad = map.stars.filter((s) => s.miss > 2 * T.TOL.torahn).length, msg = !st.found ? t("map.nozero") : !map.stars.length ? t("map.empty") : bad ? (map.mixed ? t("map.warn.mixed") : t("map.warn.old")) : t("map.ok");
  ctx.font = "italic 11px serif"; ctx.fillStyle = bad ? RED : INK2; ctx.textAlign = "center"; ctx.fillText(msg, S.x + S.w / 2, S.y + S.h - 20, S.w - 40); ctx.textAlign = "left";
  // redescendre à l'observatoire
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BACK.x, BACK.y, BACK.w, BACK.h);
  ctx.fillStyle = rgba(224, 194, 122, 0.85); ctx.font = "16px serif"; ctx.textAlign = "center"; ctx.fillText("︾", W / 2, BACK.y + 20); ctx.textAlign = "left";
  r.hot.push({ ...BACK, tip: t("map.back"), go: "telescope" });
  void tm; void sky; void clamp;
}

module.exports = { drawStarMap, SHEET };
