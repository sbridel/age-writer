"use strict";
// La lucarne de l'atelier, en gros plan : le ciel dans le rond, et autour une bague de laiton gravée des vingt-cinq chiffres D'ni, de 0 à 24
// (le zéro en haut, puis dans le sens des aiguilles). Une planche de lecture : rien ne bouge, aucune légende. Sous la Verrière la bague est ornée
// (le vitrail agrandi, le cuivre) ; sinon c'est la fenêtre ronde simple, ses croisillons et son laiton.
const { rng, mix, rgba } = require("./util");
const GLASS = require("./relto-glass");
const W = 640, H = 360, CX = 320, CY = 180, R_GLASS = 112, R_IN = 114, R_OUT = 148, N = 25;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);

/** Le chemin de la bague : deux cercles, à remplir en « evenodd ». */
function annulus(ctx) { ctx.beginPath(); ctx.arc(CX, CY, R_OUT, 0, Math.PI * 2); ctx.moveTo(CX + R_IN, CY); ctx.arc(CX, CY, R_IN, 0, Math.PI * 2); }

/** Le bouton « retour » (le même rond de laiton que les autres vues rapprochées). */
function back(r, ctx, label) {
  ctx.fillStyle = "rgba(20,14,8,0.72)"; ctx.beginPath(); ctx.arc(28, 28, 17, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#c9a24e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(233,220,184,0.95)"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(34, 28); ctx.lineTo(21, 28); ctx.moveTo(26, 22); ctx.lineTo(21, 28); ctx.lineTo(26, 34); ctx.stroke(); ctx.lineCap = "butt";
  r.hot.push({ x: 8, y: 8, w: 40, h: 40, tip: label, go: "atelier" });
}

function drawRoundWindow(r, ctx, sc, sky, t) {
  const glass = !!(r.glassOn && r.glassOn()), TRr = TR(r), amb = 0.5 + 0.5 * (sky.ambient == null ? 1 : sky.ambient), c = (h) => mix("#05060c", h, amb), q = rng(0x70e1);
  // le mur : les mêmes planches sombres que l'atelier
  ctx.fillStyle = c(glass ? "#3a2c24" : "#4d3a2b"); ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 32) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 215, 165, 0.035 + q() * 0.04); ctx.fillRect(x, 0, 32, H); ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(x, 0, 1.4, H); }
  const vg = ctx.createRadialGradient(CX, CY, R_OUT, CX, CY, 430); vg.addColorStop(0, rgba(0, 0, 0, 0)); vg.addColorStop(1, rgba(0, 0, 0, 0.5)); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // le ciel dans le rond (clair au milieu sous la Verrière, plein cadre sinon)
  const rs = glass ? R_GLASS * 0.7 : R_GLASS;
  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R_GLASS, 0, 6.283); ctx.clip();
  const sg = ctx.createLinearGradient(0, CY - R_GLASS, 0, CY + R_GLASS); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(CX - R_GLASS, CY - R_GLASS, 2 * R_GLASS, 2 * R_GLASS);
  if (sky.stars > 0.05) { const s = rng(0x91); for (let i = 0; i < 46; i++) { const a = s() * 6.283, d = Math.sqrt(s()) * R_GLASS, sz = 1 + s() * 1.4; ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.4 + 0.5 * s())); ctx.fillRect(CX + Math.cos(a) * d, CY + Math.sin(a) * d * 0.9 - R_GLASS * 0.1, sz, sz); } }
  { const cm = sc.additions.find((a) => a.type === "comet"); if (cm) require("./relto-scenery").cometWindow(ctx, r, cm.density == null ? 0.6 : cm.density, sky, t, CX, CY, rs); }
  if (r.sprite) ctx.drawImage(r.sprite, CX - R_GLASS - 30 + ((t * 7) % (2 * R_GLASS + 130)), CY - 6, 130, 56);
  if (r.cloudColor) { ctx.fillStyle = r.cloudColor(sky); ctx.globalAlpha = 0.5; ctx.fillRect(CX - R_GLASS, CY + R_GLASS - 36, 2 * R_GLASS, 36); ctx.globalAlpha = 1; }
  ctx.restore();
  if (glass) GLASS.roundWindowRing(ctx, c, sky, CX, CY, R_GLASS, false); // sans bourgeons : sur une planche de chiffres, on les lirait comme des zéros
  else { ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(CX, CY, R_GLASS, 0, 6.283); ctx.stroke(); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(CX - R_GLASS, CY); ctx.lineTo(CX + R_GLASS, CY); ctx.moveTo(CX, CY - R_GLASS); ctx.lineTo(CX, CY + R_GLASS); ctx.stroke(); }
  // la bague de laiton
  const metal = glass ? GLASS.COPPER : "#b8923e", hi = glass ? GLASS.COPPER_HI : "#e2c06a", lo = glass ? GLASS.COPPER_LO : "#6e5420";
  const bg = ctx.createLinearGradient(CX - R_OUT, CY - R_OUT, CX + R_OUT, CY + R_OUT); bg.addColorStop(0, c(hi)); bg.addColorStop(0.45, c(metal)); bg.addColorStop(1, c(lo));
  ctx.fillStyle = bg; annulus(ctx); ctx.fill("evenodd");
  ctx.save(); annulus(ctx); ctx.clip("evenodd"); // le grain du métal
  for (let i = 0; i < 70; i++) { const a = q() * 6.283, l = 0.04 + q() * 0.18, rr = R_IN + (R_OUT - R_IN) * q(); ctx.strokeStyle = rgba(q() < 0.5 ? 255 : 0, 235, 190, 0.05 + q() * 0.07); ctx.lineWidth = 0.8 + q() * 1.4; ctx.beginPath(); ctx.arc(CX, CY, rr, a, a + l); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = rgba(30, 20, 8, 0.65); ctx.lineWidth = 1.2; for (const rr of [R_IN, R_OUT]) { ctx.beginPath(); ctx.arc(CX, CY, rr, 0, 6.283); ctx.stroke(); }
  ctx.strokeStyle = rgba(255, 240, 200, 0.3); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(CX, CY, R_OUT - 1.6, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
  const mid = (R_IN + R_OUT) / 2;
  // graduations entre les chiffres ; sous la Verrière, un petit bourgeon de cuivre dans chaque intervalle
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * 6.283 - Math.PI / 2;
    if (glass) { ctx.fillStyle = c(lo); ctx.beginPath(); ctx.ellipse(CX + Math.cos(a) * mid, CY + Math.sin(a) * mid, 3.2, 1.5, a, 0, 6.283); ctx.fill(); }
    else { ctx.strokeStyle = rgba(40, 26, 10, 0.55); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * (R_IN + 3), CY + Math.sin(a) * (R_IN + 3)); ctx.lineTo(CX + Math.cos(a) * (R_OUT - 3), CY + Math.sin(a) * (R_OUT - 3)); ctx.stroke(); }
  }
  // les chiffres gravés, 0..24, le pied vers le centre
  if (r.dni) {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.283, size = 18, w = r.dni.widthOf(i, size), x = CX + Math.sin(a) * mid, y = CY - Math.cos(a) * mid;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      r.dni.drawNumber(ctx, i, -w / 2 + 0.6, -size / 2 + 0.7, size, "rgba(255,244,214,0.3)");
      r.dni.drawNumber(ctx, i, -w / 2, -size / 2, size, rgba(46, 30, 12, 0.88));
      ctx.restore();
    }
  }
  back(r, ctx, TRr("atelier.window.back"));
}

module.exports = { drawRoundWindow, R_GLASS, R_IN, R_OUT, N };
