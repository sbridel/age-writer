"use strict";
// Vue globale du Relto : l'île vue de loin au milieu de la mer de brume, des pinacles qui en émergent, les îlots des pages et un pont.
// Dessinée entièrement ici (aucun asset). Les zones cliquables (`go: "island"`) ramènent à la vue de l'île.
const { rng, clamp, mix, rgba, hexa, fnv } = require("./util");
const SC = require("./relto-scenery");
const DC = require("./dniclock");
const W = 640, H = 360;

const k = (sky) => 0.35 + 0.65 * sky.ambient;

/** Pinacle de roche qui sort de la brume (le bas est noyé par la brume dessinée ensuite). */
function spire(ctx, x, top, w, h, sky, shade) {
  const col = (c) => mix("#05060c", c, k(sky) * shade);
  const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, col("#6d6354")); g.addColorStop(1, col("#3a342c"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, top + h); ctx.lineTo(x - w * 0.42, top + h * 0.12); ctx.lineTo(x - w * 0.18, top); ctx.lineTo(x + w * 0.22, top + 2); ctx.lineTo(x + w * 0.46, top + h * 0.1); ctx.lineTo(x + w / 2, top + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.moveTo(x + w * 0.1, top + 2); ctx.lineTo(x + w * 0.46, top + h * 0.1); ctx.lineTo(x + w / 2, top + h); ctx.lineTo(x + w * 0.1, top + h); ctx.closePath(); ctx.fill();
}

/** Nappe de brume : dégradé horizontal plus blobs de nuages qui défilent. */
function fog(r, ctx, sky, t, y0, y1, alpha, speed, seed) {
  const c = r.cloudColor(sky), g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, hexa(c, 0)); g.addColorStop(0.35, hexa(c, alpha)); g.addColorStop(1, hexa(c, Math.min(1, alpha + 0.25)));
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
  const q = rng(seed); ctx.save(); ctx.globalAlpha = alpha * 0.9;
  for (let i = 0; i < 16; i++) { const s = 60 + q() * 90, x = ((q() * (W + 200) + t * speed * (0.6 + q() * 0.8)) % (W + 200)) - 100, y = y0 + (y1 - y0) * (0.2 + q() * 0.8); ctx.drawImage(r.sprite, x - s, y - s * 0.3, s * 2, s * 0.6); }
  ctx.restore();
}

function island(r, ctx, sc, sky, t, has) {
  const cx = 320, y = 228, a = k(sky), c = (h) => mix("#05060c", h, a);
  const rock = ctx.createLinearGradient(0, y, 0, y + 70); rock.addColorStop(0, c("#6a5d4e")); rock.addColorStop(1, c("#2c2822"));
  ctx.fillStyle = rock; ctx.beginPath(); ctx.moveTo(cx - 64, y); ctx.lineTo(cx + 64, y); ctx.lineTo(cx + 40, y + 34); ctx.lineTo(cx + 14, y + 66); ctx.lineTo(cx - 6, y + 74); ctx.lineTo(cx - 36, y + 38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.moveTo(cx + 12, y); ctx.lineTo(cx + 64, y); ctx.lineTo(cx + 40, y + 34); ctx.lineTo(cx + 14, y + 66); ctx.closePath(); ctx.fill();
  if (has("waterfall")) { ctx.fillStyle = rgba(225, 240, 255, 0.7); ctx.fillRect(cx - 63, y, 3, 46); }
  ctx.fillStyle = c("#7a9a54"); ctx.beginPath(); ctx.ellipse(cx, y, 64, 8, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c("#3d3128"); ctx.beginPath(); ctx.moveTo(cx - 30, y - 2); ctx.quadraticCurveTo(cx - 10, y - 46, cx + 4, y - 48); ctx.quadraticCurveTo(cx + 20, y - 40, cx + 34, y - 2); ctx.closePath(); ctx.fill();
  for (const v of sc.additions.filter((a) => a.type === "vegetation")) { const kind = v.asset || "conifer", n = 5; for (let i = 0; i < n; i++) { const x = cx - 56 + ((i * 41 + fnv(kind) % 13) % 112), h = 10 + (i % 3) * 3; ctx.fillStyle = c(kind === "maple" ? "#c4552a" : kind === "crystal" ? "#6fd6c4" : "#1f4a30"); ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 3, y); ctx.closePath(); ctx.fill(); } }
  ctx.fillStyle = c("#6b4a30"); ctx.fillRect(cx - 34, y - 12, 22, 12); ctx.fillStyle = c("#3a2a22"); ctx.beginPath(); ctx.moveTo(cx - 37, y - 12); ctx.lineTo(cx - 23, y - 22); ctx.lineTo(cx - 9, y - 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix("#2a3a4a", "#ffd58a", clamp(sky.night * 1.1)); ctx.fillRect(cx - 18, y - 9, 4, 4);
  ctx.fillStyle = c("#4b3626"); ctx.fillRect(cx + 4, y - 14, 12, 14); ctx.fillStyle = c("#241a12"); ctx.fillRect(cx + 5, y - 13, 10, 12);
  ctx.fillStyle = c("#5a5a66"); ctx.fillRect(cx + 38, y - 18, 3, 18); ctx.fillRect(cx + 50, y - 18, 3, 18);
  if (sc.returning > 0) { ctx.strokeStyle = rgba(190, 235, 255, 0.5 + 0.3 * Math.sin(t * 2)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx + 45.5, y - 12, 5, 0, 6.283); ctx.stroke(); }
  const pt = has("chimney"); if (pt) { for (let i = 0; i < 3; i++) { const p = ((t * 0.3 + i / 3) % 1); ctx.fillStyle = rgba(190, 190, 200, 0.3 * (1 - p)); ctx.beginPath(); ctx.arc(cx - 28 + p * 8, y - 24 - p * 22, 2 + p * 3, 0, 6.283); ctx.fill(); } }
  r.hot.push({ x: cx - 66, y: y - 52, w: 132, h: 100, tip: "Your Relto — click to go there", go: "island" });
}

/** Un îlot : socle de roche, calotte verte, un arbre. */
function islet(ctx, x, y, s, sky, i, t) {
  const a = k(sky), c = (h) => mix("#05060c", h, a), by = y + Math.sin(t * 0.4 + i * 1.7) * 2;
  ctx.save(); ctx.translate(x, by); ctx.scale(s, s);
  ctx.fillStyle = c("#5a5148"); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(10, 26); ctx.lineTo(0, 38); ctx.lineTo(-12, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#6f8a4a"); ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = c(i % 2 ? "#c4552a" : "#2a4a30"); ctx.beginPath(); if (i % 2) ctx.arc(2, -12, 9, 0, 6.283); else { ctx.moveTo(-6, -2); ctx.lineTo(0, -26); ctx.lineTo(6, -2); ctx.closePath(); } ctx.fill();
  ctx.restore();
}

/** Pont de cordes entre deux points : câble qui s'affaisse, planches et poteaux. */
function bridge(ctx, x0, y0, x1, y1, sky) {
  const c = (h) => mix("#05060c", h, k(sky)), sag = 7;
  ctx.strokeStyle = c("#8a6a44"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0 - 5); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 5 + sag, x1, y1 - 5); ctx.stroke();
  ctx.fillStyle = c("#6b4a30"); const n = Math.max(6, Math.round((x1 - x0) / 5));
  for (let i = 0; i <= n; i++) { const p = i / n, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p + Math.sin(p * Math.PI) * sag * 0.9; ctx.fillRect(x - 1.6, y, 3.2, 1.6); }
  ctx.fillStyle = c("#4a3220"); ctx.fillRect(x0 - 1, y0 - 7, 1.6, 8); ctx.fillRect(x1 - 1, y1 - 7, 1.6, 8);
}

function drawGlobal(r, ctx, sc, sky, t, has) {
  r.drawSky(ctx, sky, t, has("aurora"));
  if (has("moons")) SC.moons(ctx, sky);
  if (has("comet")) SC.comet(ctx, r, has("comet").density, sky, t);
  r.drawClouds(ctx, 0, sky, t);
  if (has("birds")) SC.birds(ctx, has("birds").density, sky, t);
  // pinacles lointains puis brume
  const far = [[70, 188, 22, 90], [150, 196, 18, 70], [235, 204, 16, 56], [400, 204, 16, 58], [492, 198, 20, 76], [572, 190, 22, 92]];
  for (const [x, top, w, h] of far) spire(ctx, x, top, w, h, sky, 0.7);
  fog(r, ctx, sky, t, 200, 270, 0.55, 5, 0xf06);
  // îlots des pages, pont, pinacle du calendrier
  const isl = has("islets"), cal = has("calendar"), spots = [[470, 246, 0.95], [150, 252, 0.8], [118, 280, 0.6], [548, 282, 0.65], [250, 274, 0.55]], n = isl ? Math.min(spots.length, Math.round(2 + isl.density * 3)) : 0;
  for (let i = 0; i < n; i++) { islet(ctx, spots[i][0], spots[i][1], spots[i][2], sky, i, t); r.hot.push({ x: spots[i][0] - 26 * spots[i][2], y: spots[i][1] - 28 * spots[i][2], w: 52 * spots[i][2], h: 62 * spots[i][2], tip: `Islet ${i + 1}` }); }
  if (cal) {
    const x = 575, y = 246, d = DC.reltoDate(r.scene);
    islet(ctx, x, y, 0.9, sky, 0, t);
    ctx.fillStyle = mix("#05060c", "#7d7468", k(sky)); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 3, y - 54); ctx.lineTo(x + 3, y - 58); ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
    const glow = 0.5 + 0.4 * sky.night; if (r.dni) { const w = r.dni.widthOf(d.yahr, 8); r.dni.drawNumber(ctx, d.yahr, x - w / 2 - 1, y - 38, 8, `rgba(255,226,150,${clamp(glow).toFixed(2)})`); }
    r.hot.push({ x: x - 22, y: y - 60, w: 44, h: 96, tip: `Calendar pinnacle — ${d.name} ${d.yahr}` });
  }
  if (has("dniclock")) { // l'horloge D'ni, plus loin dans la brume, à gauche
    const s = 0.75, gx = 88, gy = 250; ctx.save(); ctx.translate(gx - 92 * s, gy - 206 * s); ctx.scale(s, s); SC.dniClock(ctx, r, sky, t); ctx.restore();
    const h = r.hot.pop(); r.hot.push({ ...h, x: gx - 22 * s, y: gy - 70 * s, w: 44 * s, h: 104 * s });
    if (has("dock")) bridge(ctx, gx + 16, gy - 1, 262, 236, sky); // la page Ponton : un pont de cordes jusqu'à l'horloge
  }
  if (n > 0 || cal) bridge(ctx, 388, 230, 470 - 22, 244, sky);
  if (n > 0 && cal) bridge(ctx, 470 + 22, 246, 575 - 22, 246, sky);
  island(r, ctx, sc, sky, t, has);
  // pinacles proches et brume basse
  spire(ctx, 38, 236, 46, 140, sky, 0.9); spire(ctx, 606, 244, 40, 130, sky, 0.9); spire(ctx, 205, 292, 34, 90, sky, 0.85); spire(ctx, 440, 300, 30, 80, sky, 0.85);
  fog(r, ctx, sky, t, 238, H, 0.7, 9, 0xf07);
  r.drawClouds(ctx, 1, sky, t); r.drawClouds(ctx, 2, sky, t);
  if (has("butterflies")) SC.butterflies(ctx, has("butterflies").density, sky, t);
  if (has("snow")) r.drawSnow(ctx, has("snow").density, t);
  if (has("rain")) SC.rain(ctx, has("rain").density, sky, t, false);
  if (has("storm")) SC.storm(ctx, has("storm").density, sky, t);
}

module.exports = { drawGlobal };
