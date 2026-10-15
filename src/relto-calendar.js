"use strict";
// Le pilier du calendrier, en gros plan : la date D'ni complète gravée sur la pierre (le hahr, le nom du vailee, le yahr ; dessous
// gahrtahvo · tahvo · gorahn · prorahn). Rien ne se lit autrement : pas de légende. Sous la Verrière, la pierre devient un vitrail
// en ogive cerclé de cuivre, la gravure y luit en ambre ; sans elle, une dalle de pierre, la gravure sombre.
const { mix, rgba, rng } = require("./util");
const DC = require("./dniclock");
const DT = require("./dnitime");
const GLASS = require("./relto-glass");
const W = 640, H = 360, CX = 320, X0 = 200, X1 = 440, TOP = 34, BASE = 316;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);

function back(r, ctx, label) {
  ctx.fillStyle = "rgba(20,14,8,0.72)"; ctx.beginPath(); ctx.arc(28, 28, 17, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#c9a24e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(233,220,184,0.95)"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(34, 28); ctx.lineTo(21, 28); ctx.moveTo(26, 22); ctx.lineTo(21, 28); ctx.lineTo(26, 34); ctx.stroke(); ctx.lineCap = "butt";
  r.hot.push({ x: 8, y: 8, w: 40, h: 40, tip: label, go: r.calFrom === "global" ? "global" : "island" });
}

function drawCalendar(r, ctx, sc, sky, t) {
  const glass = !!(r.glassOn && r.glassOn()), TRr = TR(r), amb = 0.55 + 0.45 * (sky.ambient == null ? 1 : sky.ambient), c = (h) => mix("#05060c", h, amb);
  const ms = r.nowOverride != null ? r.nowOverride : Date.now(), d = DC.reltoDate(r.scene || sc, ms), q = rng(0x5ca1);
  r.drawSky(ctx, sky, t, null);
  const hz = ctx.createLinearGradient(0, 200, 0, H); hz.addColorStop(0, rgba(0, 0, 0, 0)); hz.addColorStop(1, c("#2a2a30")); ctx.fillStyle = hz; ctx.fillRect(0, 200, W, H - 200);
  // le socle de pierre et la mousse
  ctx.fillStyle = c("#5a5148"); ctx.fillRect(X0 - 22, BASE, X1 - X0 + 44, 16); ctx.fillStyle = c("#6a6056"); ctx.fillRect(X0 - 22, BASE, X1 - X0 + 44, 3);
  ctx.fillStyle = c("#6f8f4a"); for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.ellipse(X0 - 18 + q() * (X1 - X0 + 36), BASE + 1 - q() * 2, 3 + q() * 4, 1.6, 0, 0, 6.283); ctx.fill(); }
  // le fût
  const ogive = (xa, xb, top, base) => { const m = (xa + xb) / 2, k = (xb - xa) * 0.5; ctx.beginPath(); ctx.moveTo(xa, base); ctx.lineTo(xa, top + k); ctx.quadraticCurveTo(xa, top + k * 0.25, m, top); ctx.quadraticCurveTo(xb, top + k * 0.25, xb, top + k); ctx.lineTo(xb, base); ctx.closePath(); };
  if (glass) {
    const g = ctx.createLinearGradient(0, TOP, 0, BASE); g.addColorStop(0, c("#2a7a70")); g.addColorStop(1, c("#0e2a28")); ctx.fillStyle = g; ogive(X0, X1, TOP, BASE); ctx.fill();
    ctx.save(); ogive(X0, X1, TOP, BASE); ctx.clip(); const gl = ctx.createRadialGradient(CX, 170, 10, CX, 170, 150); gl.addColorStop(0, rgba(224, 162, 58, 0.22)); gl.addColorStop(1, rgba(224, 162, 58, 0)); ctx.fillStyle = gl; ctx.fillRect(X0, TOP, X1 - X0, BASE - TOP);
    ctx.strokeStyle = rgba(15, 47, 44, 0.8); ctx.lineWidth = 1.1; for (const x of [X0 + 60, X1 - 60]) { ctx.beginPath(); ctx.moveTo(x, TOP + 40); ctx.lineTo(x, BASE); ctx.stroke(); } // les plombs
    ctx.restore();
    ctx.strokeStyle = c(GLASS.COPPER); ctx.lineWidth = 5; ogive(X0, X1, TOP, BASE); ctx.stroke(); ctx.strokeStyle = rgba(230, 160, 106, 0.6); ctx.lineWidth = 0.9; ogive(X0 + 5, X1 - 5, TOP + 4, BASE); ctx.stroke();
    GLASS.cornerVines(ctx, c, X0 + 12, TOP + 70, X1 - X0 - 24, BASE - TOP - 84);
    ctx.fillStyle = c(GLASS.COPPER); ctx.fillRect(X0 - 8, BASE - 3, X1 - X0 + 16, 5); // le seuil de cuivre
  } else {
    const g = ctx.createLinearGradient(X0, 0, X1, 0); g.addColorStop(0, c("#8d8578")); g.addColorStop(1, c("#57524a")); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(X0, BASE); ctx.lineTo(X0 + 10, TOP + 26); ctx.lineTo(CX - 16, TOP); ctx.lineTo(CX + 14, TOP - 4); ctx.lineTo(X1 - 10, TOP + 26); ctx.lineTo(X1, BASE); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = rgba(0, 0, 0, 0.16); ctx.beginPath(); ctx.moveTo(CX + 40, TOP - 2); ctx.lineTo(X1 - 10, TOP + 26); ctx.lineTo(X1, BASE); ctx.lineTo(CX + 40, BASE); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(q() < 0.5 ? 0 : 255, q() < 0.5 ? 0 : 240, 220, 0.03 + q() * 0.04); ctx.fillRect(X0 + 10 + q() * (X1 - X0 - 20), TOP + 40 + q() * (BASE - TOP - 50), 8 + q() * 20, 1 + q() * 2); }
  }
  // la gravure : le hahr, le nom du vailee, le yahr ; dessous, gahrtahvo · tahvo · gorahn · prorahn
  const ink = glass ? c("#ffe3a6") : c("#2c2418"), lit = glass ? "rgba(10,30,28,0.7)" : "rgba(255,240,205,0.28)", dx = glass ? -0.6 : 0.6;
  const num = (v, cx, y, s) => { if (!r.dni) return; const w = r.dni.widthOf(v, s); r.dni.drawNumber(ctx, v, cx - w / 2 + dx, y + 0.7, s, lit); r.dni.drawNumber(ctx, v, cx - w / 2, y, s, ink); return w; };
  if (r.dni) {
    num(d.hahr, CX, 84, 32);
    ctx.font = "italic 24px serif"; ctx.textAlign = "center"; ctx.fillStyle = lit; ctx.fillText(d.name, CX + dx, 142.7); ctx.fillStyle = ink; ctx.fillText(d.name, CX, 142); ctx.textAlign = "left";
    num(d.yahr, CX, 160, 66);
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(CX - 56, 244); ctx.lineTo(CX + 56, 244); ctx.stroke(); ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(CX, 239); ctx.lineTo(CX + 5, 244); ctx.lineTo(CX, 249); ctx.lineTo(CX - 5, 244); ctx.closePath(); ctx.fill();
    const parts = [d.gahrtahvo, d.tahvo, d.gorahn, d.prorahn], s2 = 22, gap = 12, ws = parts.map((v) => r.dni.widthOf(v, s2)), tot = ws.reduce((a, b) => a + b, 0) + gap * 3;
    let x = CX - tot / 2; const y = 262;
    parts.forEach((v, i) => { r.dni.drawNumber(ctx, v, x + dx, y + 0.7, s2, lit); r.dni.drawNumber(ctx, v, x, y, s2, ink); x += ws[i]; if (i < 3) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x + gap / 2, y + s2 / 2, 1.6, 0, 6.283); ctx.fill(); } x += gap; });
  } else { ctx.font = "italic 20px serif"; ctx.textAlign = "center"; ctx.fillStyle = ink; ctx.fillText(DT.format(d), CX, 180); ctx.textAlign = "left"; }
  r.hot.push({ x: X0, y: TOP, w: X1 - X0, h: BASE - TOP, tip: `Calendar pinnacle — ${d.name} ${d.yahr}${d.synced ? "" : " (by the stone's own reckoning)"}` });
  back(r, ctx, TRr("calendar.back"));
}

module.exports = { drawCalendar };
