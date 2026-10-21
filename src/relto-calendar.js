"use strict";
// Le pilier du calendrier, en gros plan : la date D'ni complète gravée sur la pierre (le hahr, le nom du vailee, le yahr ; dessous
// gahrtahvo · tahvo · gorahn · prorahn). Rien ne se lit autrement : pas de légende. Sous la Verrière, la pierre devient un vitrail
// en ogive cerclé de cuivre, la gravure y luit en ambre ; sans elle, une dalle de pierre, la gravure sombre.
const { mix, rgba, rng } = require("./util");
const DC = require("./dniclock");
const DT = require("./dnitime");
const GLASS = require("./relto-glass");
const CS = require("./relto-castle");
const W = 640, H = 360, CX = 320, X0 = 200, X1 = 440, TOP = 34, BASE = 316;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);

function back(r, ctx, label) {
  ctx.fillStyle = "rgba(20,14,8,0.72)"; ctx.beginPath(); ctx.arc(28, 28, 17, 0, 6.283); ctx.fill(); ctx.strokeStyle = "#c9a24e"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(233,220,184,0.95)"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(34, 28); ctx.lineTo(21, 28); ctx.moveTo(26, 22); ctx.lineTo(21, 28); ctx.lineTo(26, 34); ctx.stroke(); ctx.lineCap = "butt";
  r.hot.push({ x: 8, y: 8, w: 40, h: 40, tip: label, go: r.calFrom === "global" ? "global" : "island" });
}

function drawCalendar(r, ctx, sc, sky, t) {
  const castle = !!(r.castleOn && r.castleOn()); // le Château : une stèle de granit en arc brisé, à crochets et pinacles, la gravure dorée
  const glass = !!(r.glassOn && r.glassOn()), TRr = TR(r), amb = 0.55 + 0.45 * (sky.ambient == null ? 1 : sky.ambient), c = (h) => mix("#05060c", h, amb);
  const ms = r.nowOverride != null ? r.nowOverride : Date.now(), d = DC.reltoDate(r.scene || sc, ms), q = rng(0x5ca1);
  r.drawSky(ctx, sky, t, null);
  const hz = ctx.createLinearGradient(0, 200, 0, H); hz.addColorStop(0, rgba(0, 0, 0, 0)); hz.addColorStop(1, c("#2a2a30")); ctx.fillStyle = hz; ctx.fillRect(0, 200, W, H - 200);
  // le socle de pierre et la mousse
  ctx.fillStyle = c(castle ? "#5e5966" : "#5a5148"); ctx.fillRect(X0 - 22, BASE, X1 - X0 + 44, 16); ctx.fillStyle = c(castle ? "#9a95a3" : "#6a6056"); ctx.fillRect(X0 - 22, BASE, X1 - X0 + 44, 3);
  if (castle) { ctx.fillStyle = rgba(0, 0, 0, 0.25); for (let x = X0 - 22 + 30; x < X1 + 22; x += 30) ctx.fillRect(x, BASE + 3, 1, 13); } // le Château : un socle de pierre appareillée, sans mousse
  else { ctx.fillStyle = c("#6f8f4a"); for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.ellipse(X0 - 18 + q() * (X1 - X0 + 36), BASE + 1 - q() * 2, 3 + q() * 4, 1.6, 0, 0, 6.283); ctx.fill(); } }
  // le fût
  const ogive = (xa, xb, top, base) => { const m = (xa + xb) / 2, k = (xb - xa) * 0.5; ctx.beginPath(); ctx.moveTo(xa, base); ctx.lineTo(xa, top + k); ctx.quadraticCurveTo(xa, top + k * 0.25, m, top); ctx.quadraticCurveTo(xb, top + k * 0.25, xb, top + k); ctx.lineTo(xb, base); ctx.closePath(); };
  if (castle) {
    const g = ctx.createLinearGradient(X0, 0, X1, 0); g.addColorStop(0, c("#9a95a3")); g.addColorStop(0.55, c("#6e6876")); g.addColorStop(1, c("#4a4752")); ctx.fillStyle = g; CS.pointed(ctx, X0, X1, TOP, TOP + 70, BASE); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1.4; CS.pointed(ctx, X0, X1, TOP, TOP + 70, BASE); ctx.stroke();
    ctx.strokeStyle = c("#b8b3c0"); ctx.lineWidth = 1; CS.pointed(ctx, X0 + 9, X1 - 9, TOP + 12, TOP + 74, BASE - 6); ctx.stroke(); // la moulure
    ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.8; CS.pointed(ctx, X0 + 13, X1 - 13, TOP + 18, TOP + 76, BASE - 10); ctx.stroke();
    ctx.fillStyle = c("#5a5664"); { const kq = (X1 - X0) * 0.12, P0 = [X0, TOP + 70], P1 = [X0 + kq, TOP + 17.5], P2 = [CX, TOP]; /* la courbe même de CS.pointed : les crochets s'y posent */
      for (let k = 1; k < 6; k++) { const u = k / 6, v = 1 - u, px = v * v * P0[0] + 2 * v * u * P1[0] + u * u * P2[0], py = v * v * P0[1] + 2 * v * u * P1[1] + u * u * P2[1];
        let tx = 2 * v * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), ty = 2 * v * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]); const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
        for (const s2 of [1, -1]) { const x0 = s2 > 0 ? px : X1 - (px - X0), ex = tx * s2, nx = ty * s2, ny = -tx; /* tangente vers le sommet, normale vers dehors */
          ctx.beginPath(); ctx.moveTo(x0 - ex * 3, py - ty * 3 + 0.6 * ny); ctx.lineTo(x0 + nx * 6 + ex * 3, py + ny * 6 + ty * 3); ctx.lineTo(x0 + ex * 3, py + ty * 3 + 0.6 * ny); ctx.closePath(); ctx.fill(); } } } // les crochets, posés sur l'arc
    ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.moveTo(CX, TOP - 14); ctx.lineTo(CX + 4, TOP - 2); ctx.lineTo(CX - 4, TOP - 2); ctx.closePath(); ctx.fill(); // le fleuron
    for (const x of [X0 - 14, X1 + 14]) { ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - 6, TOP + 110, 12, BASE - TOP - 110); ctx.beginPath(); ctx.moveTo(x - 7, TOP + 110); ctx.lineTo(x, TOP + 78); ctx.lineTo(x + 7, TOP + 110); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.arc(x, TOP + 76, 1.8, 0, 6.283); ctx.fill(); } // deux pinacles
  } else if (glass) {
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
  const ink = castle ? c("#d8b45e") : glass ? c("#ffe3a6") : c("#2c2418"), lit = castle ? "rgba(20,16,24,0.75)" : glass ? "rgba(10,30,28,0.7)" : "rgba(255,240,205,0.28)", dx = castle || glass ? -0.6 : 0.6;
  const num = (v, cx, y, s) => { if (!r.dni) return; const w = r.dni.widthOf(v, s); r.dni.drawNumber(ctx, v, cx - w / 2 + dx, y + 0.7, s, lit); r.dni.drawNumber(ctx, v, cx - w / 2, y, s, ink); return w; };
  if (r.dni) {
    num(d.hahr, CX, 84, 32);
    const dn = r.dni.writes && r.dni.writes(), nm = dn ? r.dni.textFor(d.name) : d.name; /* le vailee en lettres D'ni quand une police est là (l'infobulle le dit en latin) */
    ctx.font = dn ? `28px ${r.dni.textStack()}` : "italic 24px serif"; ctx.textAlign = "center"; ctx.fillStyle = lit; ctx.fillText(nm, CX + dx, 142.7); ctx.fillStyle = ink; ctx.fillText(nm, CX, 142); ctx.textAlign = "left";
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
