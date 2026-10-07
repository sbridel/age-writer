"use strict";
// Sous-vues « point-and-click » du Relto : l'intérieur de la cabane (cheminée, étagère des Âges, livres à part) et les piliers de liaison de près.
// Plein cadre, sans zoom de caméra ; tout est dessiné ici (aucun asset). Les zones `go: "island"` ramènent à la vue de l'île.
const { rng, clamp, mix, rgba, hexa } = require("./util");
const SC = require("./relto-scenery");
const W = 640, H = 360, FLOOR = 250, GY = 208;
const VERDICT = { stable: "#8fae6a", unstable: "#d9a24a", dying: "#c0553f", unknown: "#7a7a8a" };

const flicker = (t) => 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.06 * Math.sin(t * 17);

/** Livre à part posé sur la table : glyphes ou bibliothèque. */
function standingBook(ctx, c, b) {
  const y = b.y - b.h;
  ctx.fillStyle = c(b.body); ctx.fillRect(b.x, y, b.w, b.h);
  ctx.fillStyle = c(b.band); ctx.fillRect(b.x, y + 5, b.w, 3); ctx.fillRect(b.x, y + b.h - 8, b.w, 3);
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(b.x + b.w - 3.5, y, 3.5, b.h);
  const mx = b.x + b.w / 2, my = y + b.h / 2;
  ctx.fillStyle = c(b.band);
  if (b.kind === "glyphs") { ctx.beginPath(); ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 4.5, my); ctx.lineTo(mx, my + 7); ctx.lineTo(mx - 4.5, my); ctx.closePath(); ctx.fill(); }
  else { ctx.fillRect(mx - 3, my - 5, 6, 8); ctx.fillStyle = c(b.body); ctx.fillRect(mx - 1, my - 2.5, 2, 3.5); }
}

/** Intérieur de la cabane. */
function drawCabin(r, ctx, sc, sky, t) {
  const st = new Set(sc.structures), night = clamp(sky.night == null ? 0.3 : sky.night), amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const lit = r.scene.additions.find((a) => a.type === "chimney"), d = lit ? clamp(lit.density == null ? 0.7 : lit.density, 0.2, 1) : 0.18, fl = flicker(t);
  // murs en planches
  const q = rng(0xcab1);
  ctx.fillStyle = c("#5a4330"); ctx.fillRect(0, 0, W, FLOOR);
  for (let x = 0; x < W; x += 40) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 220, 170, 0.04 + q() * 0.05); ctx.fillRect(x, 0, 40, FLOOR); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, 0, 1.5, FLOOR); }
  ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(0, 0, W, 24); ctx.fillRect(0, 22, W, 3);
  for (const x of [120, 320, 520]) ctx.fillRect(x - 8, 0, 16, 40);
  // sol
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#4a3524")); fg.addColorStop(1, c("#2c1f15"));
  ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1;
  for (const y of [FLOOR + 16, FLOOR + 38, FLOOR + 68]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let i = 0; i < 12; i++) { const x = i * 58 + 10; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - (x - 320) * 0.18, H); ctx.stroke(); }
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(0, FLOOR - 6, W, 8);
  // tapis
  ctx.fillStyle = c("#5b2b2b"); ctx.beginPath(); ctx.ellipse(330, 322, 170, 24, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = c("#c9a24e"); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(330, 322, 156, 19, 0, 0, 6.283); ctx.stroke();
  // fenêtre : le ciel de l'île
  const wx = 104, wy = 70, ww = 78, wh = 92;
  ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
  const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(wx, wy, ww, wh);
  if (sky.stars > 0.05) { const s = rng(0x57a2); for (let i = 0; i < 14; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.4 + 0.5 * s())); ctx.fillRect(wx + s() * ww, wy + s() * wh * 0.7, 1.2, 1.2); } }
  ctx.drawImage(r.sprite, wx - 10 + ((t * 4) % 120), wy + wh * 0.45, 60, 26);
  ctx.fillStyle = r.cloudColor(sky); ctx.globalAlpha = 0.5; ctx.fillRect(wx, wy + wh - 16, ww, 16); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = c("#2a1c14"); ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  ctx.fillStyle = c("#3a2a1e"); ctx.fillRect(wx - 6, wy + wh + 2, ww + 12, 6);
  if (sky.ambient > 0.35) { ctx.fillStyle = rgba(255, 240, 200, 0.07 * sky.ambient); ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww + 70, FLOOR + 60); ctx.lineTo(wx + 40, FLOOR + 60); ctx.closePath(); ctx.fill(); }
  // porte (retour à l'île)
  const dx = 22, dy = 112, dw = 64;
  ctx.fillStyle = c("#2a1c14"); ctx.fillRect(dx - 4, dy - 4, dw + 8, FLOOR - dy + 4);
  ctx.fillStyle = c("#46301f"); ctx.fillRect(dx, dy, dw, FLOOR - dy - 2);
  ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dw / 4, dy); ctx.lineTo(dx + i * dw / 4, FLOOR - 2); ctx.stroke(); }
  ctx.fillStyle = c("#c9a24e"); ctx.beginPath(); ctx.arc(dx + dw - 9, dy + 70, 3, 0, 6.283); ctx.fill();
  r.hot.push({ x: dx - 4, y: dy - 4, w: dw + 8, h: FLOOR - dy + 4, tip: "Door — back outside", go: "island" });
  // cheminée
  const fx = 462, fw = 156;
  ctx.fillStyle = c("#6a6258"); ctx.fillRect(fx + 20, 24, fw - 40, 90); // conduit
  ctx.fillStyle = c("#555047"); ctx.fillRect(fx, 114, fw, FLOOR - 114);
  ctx.strokeStyle = rgba(0, 0, 0, 0.28); ctx.lineWidth = 1;
  for (let y = 24; y < FLOOR; y += 16) { ctx.beginPath(); ctx.moveTo(y < 114 ? fx + 20 : fx, y); ctx.lineTo(y < 114 ? fx + fw - 20 : fx + fw, y); ctx.stroke(); for (let x = fx + ((y / 16) % 2) * 14; x < fx + fw; x += 28) { if (y < 114 && (x < fx + 20 || x > fx + fw - 20)) continue; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); } }
  ctx.fillStyle = c("#3a2a22"); ctx.fillRect(fx - 12, 104, fw + 24, 12);
  const ox = fx + 26, ow = fw - 52, oy = 150;
  ctx.fillStyle = "#0e0907"; ctx.beginPath(); ctx.moveTo(ox, FLOOR); ctx.lineTo(ox, oy + 24); ctx.quadraticCurveTo(ox + ow / 2, oy - 14, ox + ow, oy + 24); ctx.lineTo(ox + ow, FLOOR); ctx.closePath(); ctx.fill();
  // feu
  const mx = ox + ow / 2, by = FLOOR - 10;
  ctx.fillStyle = "#2b1c12"; ctx.fillRect(mx - 34, by - 6, 68, 8); ctx.fillStyle = "#3a2618"; ctx.fillRect(mx - 28, by - 12, 56, 7);
  const n = Math.round(3 + 4 * d);
  for (let i = 0; i < n; i++) {
    const ph = t * (2.2 + i * 0.37) + i * 1.9, h = (12 + 36 * d) * (0.65 + 0.35 * Math.sin(ph)) * (1 - Math.abs(i - (n - 1) / 2) * 0.12), x = mx + (i - (n - 1) / 2) * 11 * (0.7 + 0.3 * d), sw = Math.sin(ph * 1.3) * 3;
    for (const [col, k] of [["rgba(255,110,30,0.85)", 1], ["rgba(255,190,70,0.9)", 0.62], ["rgba(255,240,170,0.9)", 0.3]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 7 * k - 1, by - 8); ctx.quadraticCurveTo(x - 5 * k + sw, by - h * k * 0.6, x + sw, by - h * k - 6); ctx.quadraticCurveTo(x + 5 * k + sw, by - h * k * 0.6, x + 7 * k + 1, by - 8); ctx.closePath(); ctx.fill();
    }
  }
  if (lit) for (let i = 0; i < 7; i++) { const p = ((t * 0.5 + i * 0.19) % 1), x = mx + Math.sin(p * 9 + i * 3) * 18, y = by - 20 - p * 70; ctx.fillStyle = rgba(255, 190 - p * 90, 80, (1 - p) * 0.9); ctx.fillRect(x, y, 1.6, 1.6); }
  r.hot.push({ x: fx - 12, y: 104, w: fw + 24, h: FLOOR - 104, tip: lit ? "Fireplace" : "Cold hearth (add the chimney page to light it)" });
  // étagère des Âges
  if (st.has("bookshelves")) {
    const x0 = 196, w = 244, y0 = 50, RH = 62, S = 3.9;
    ctx.fillStyle = c("#241a12"); ctx.fillRect(x0, y0, w, FLOOR - y0);
    ctx.fillStyle = c("#4b3626"); ctx.fillRect(x0 - 7, y0 - 8, 9, FLOOR - y0 + 8); ctx.fillRect(x0 + w - 2, y0 - 8, 9, FLOOR - y0 + 8); ctx.fillRect(x0 - 7, y0 - 10, w + 14, 10);
    for (let rw = 0; rw < 4; rw++) ctx.fillRect(x0, y0 + RH * (rw + 1) - 3, w, 5);
    for (const b of r.geo.books) {
      const bx = x0 + 10 + b.col * 22, bh = b.h * S, by = y0 + RH * (b.row + 1) - 3 - bh, bw = b.w * S;
      ctx.fillStyle = c(b.color); ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = c(VERDICT[b.age.verdict] || VERDICT.unknown); ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(bx + bw - 3, by + 5, 3, bh - 5);
      r.hot.push({ x: bx, y: by, w: bw, h: bh, tip: `${b.age.name} — ${b.age.verdict || "?"}${b.age.stability != null ? ` ${b.age.stability}%` : ""}`, age: b.age, book: true });
    }
    if (sc.ages.length > 30) { ctx.fillStyle = rgba(230, 220, 190, 0.75); ctx.font = "11px serif"; ctx.fillText(`+${sc.ages.length - 30}`, x0 + w - 28, y0 - 14); }
    if (!sc.ages.length) { ctx.fillStyle = rgba(230, 220, 190, 0.45); ctx.font = "11px serif"; ctx.fillText("(no Age written yet)", x0 + 70, y0 + RH * 1.5); }
  }
  // table, chandelle et livres à part
  const tx = 60, tw = 136, ty = 284;
  ctx.fillStyle = c("#2f2016"); ctx.fillRect(tx + 6, ty, 7, 56); ctx.fillRect(tx + tw - 13, ty, 7, 56);
  ctx.fillStyle = c("#4b3322"); ctx.fillRect(tx + 2, ty + 8, tw - 4, 8);
  ctx.fillStyle = c("#6a4a30"); ctx.fillRect(tx, ty, tw, 8);
  const books = [
    { kind: "glyphs", x: tx + 16, y: ty, w: 17, h: 38, body: "#27555a", band: "#d8c07a", tip: "Book of glyphs" },
    { kind: "library", x: tx + 38, y: ty, w: 17, h: 33, body: "#5b2b2b", band: "#c9a24e", tip: "Library book (blocks and Relto pages)" },
  ];
  for (const b of books) { standingBook(ctx, c, b); r.hot.push({ x: b.x - 1, y: b.y - b.h - 1, w: b.w + 2, h: b.h + 2, tip: b.tip, special: b.kind }); }
  const cx = tx + tw - 34;
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(cx, ty - 14, 7, 14);
  const cf = clamp(0.75 * fl + 0.2); ctx.fillStyle = rgba(255, 190, 80, cf); ctx.beginPath(); ctx.ellipse(cx + 3.5, ty - 19, 2.4, 5 * cf, 0, 0, 6.283); ctx.fill();
  // lumière : lueur de l'âtre et de la chandelle, puis pénombre du soir
  let g = ctx.createRadialGradient(mx, FLOOR - 24, 6, mx, FLOOR - 24, 300); g.addColorStop(0, rgba(255, 150, 60, (0.18 + 0.2 * night) * fl * d)); g.addColorStop(1, rgba(255, 130, 40, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(cx + 3.5, ty - 19, 2, cx + 3.5, ty - 19, 70); g.addColorStop(0, rgba(255, 190, 90, (0.12 + 0.28 * night) * fl)); g.addColorStop(1, rgba(255, 190, 90, 0)); ctx.fillStyle = g; ctx.fillRect(cx - 80, ty - 90, 160, 140);
  g = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 420); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, rgba(0, 0, 0, 0.38)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Les piliers de liaison de près : la fenêtre de liaison s'allume quand des Âges y reviennent. */
function drawPillarsRoom(r, ctx, sc, sky, t) {
  const night = clamp(sky.night == null ? 0.3 : sky.night), amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const n = sc.returning || 0, lit = n > 0, pulse = 0.6 + 0.4 * Math.sin(t * 2.1);
  const sg = ctx.createLinearGradient(0, 0, 0, 280); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  if (sky.stars > 0.05) { const s = rng(0x91a4); for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.35 + 0.6 * s())); ctx.fillRect(s() * W, s() * 220, 1.4, 1.4); } }
  // brume lointaine
  const q = rng(0xf06); ctx.save(); ctx.globalAlpha = 0.5;
  for (let i = 0; i < 12; i++) { const s = 70 + q() * 90, x = ((q() * (W + 240) + t * 5 * (0.6 + q())) % (W + 240)) - 120, y = 220 + q() * 90; ctx.drawImage(r.sprite, x - s, y - s * 0.28, s * 2, s * 0.56); }
  ctx.restore();
  // dalle de pierre
  const gg = ctx.createLinearGradient(0, 292, 0, H); gg.addColorStop(0, c("#6a6358")); gg.addColorStop(1, c("#3a342c"));
  ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(40, 300); ctx.lineTo(600, 300); ctx.lineTo(640, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#4f6b3c"); ctx.fillRect(40, 296, 560, 5);
  ctx.strokeStyle = lit ? rgba(150, 215, 255, 0.35 + 0.3 * pulse) : rgba(120, 120, 140, 0.35); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(320, 322, 150, 20, 0, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.ellipse(320, 322, 96, 12, 0, 0, 6.283); ctx.stroke();
  // fenêtre de liaison entre les piliers
  const cx = 320, cy = 190;
  if (lit) {
    const gl = ctx.createRadialGradient(cx, cy, 8, cx, cy, 150); gl.addColorStop(0, rgba(170, 225, 255, 0.5 * pulse)); gl.addColorStop(1, rgba(170, 225, 255, 0)); ctx.fillStyle = gl; ctx.fillRect(cx - 160, cy - 160, 320, 320);
    ctx.fillStyle = rgba(190, 235, 255, 0.16 + 0.12 * pulse); ctx.beginPath(); ctx.ellipse(cx, cy, 72, 98, 0, 0, 6.283); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = rgba(200, 240, 255, 0.55 - i * 0.14); ctx.lineWidth = 2 - i * 0.5; ctx.beginPath(); ctx.ellipse(cx, cy, 70 - i * 9, 96 - i * 12, t * (0.4 + i * 0.25), 0, 5.2); ctx.stroke(); }
    const m = Math.min(n, 14);
    for (let i = 0; i < m; i++) { const a = t * 0.7 + (i / m) * 6.283, rx = 52 + (i % 3) * 8, ry = 76 + (i % 3) * 8; ctx.fillStyle = rgba(225, 248, 255, 0.85); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.4, 0, 6.283); ctx.fill(); }
  } else {
    ctx.strokeStyle = rgba(120, 120, 140, 0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 70, 96, 0, 0, 6.283); ctx.stroke();
  }
  // les deux piliers
  const PX = [196, 444], top = 56, bot = 304, pw = 58;
  PX.forEach((px, i) => {
    const g = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); g.addColorStop(0, c("#6a6a76")); g.addColorStop(0.7, c("#5a5a66")); g.addColorStop(1, c("#3e3e48"));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - pw / 2 - 6, bot); ctx.lineTo(px - pw / 2, bot - 22); ctx.lineTo(px - pw / 2 + 4, top + 14); ctx.lineTo(px - pw / 2 + 12, top); ctx.lineTo(px + pw / 2 - 12, top); ctx.lineTo(px + pw / 2 - 4, top + 14); ctx.lineTo(px + pw / 2, bot - 22); ctx.lineTo(px + pw / 2 + 6, bot); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c("#4f6a3c"); ctx.fillRect(px - pw / 2 - 6, bot - 9, pw + 12, 9);
    const col = lit ? rgba(150, 215, 255, 0.55 + 0.4 * pulse) : rgba(120, 120, 140, 0.4);
    for (let k = 0; k < 3; k++) {
      const y = top + 34 + k * 62; ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(px - 15, y, 30, 40);
      if (lit || night > 0.25) { const gl = ctx.createRadialGradient(px, y + 20, 0, px, y + 20, 30); gl.addColorStop(0, rgba(150, 215, 255, (lit ? 0.3 : 0.12) * (0.5 + night) * pulse)); gl.addColorStop(1, rgba(150, 215, 255, 0)); ctx.fillStyle = gl; ctx.fillRect(px - 30, y - 10, 60, 60); }
      const num = (sc.seed + i * 11 + k * 5) % 25, size = 24, wd = r.dni.widthOf(num, size); r.dni.drawNumber(ctx, num, px - wd / 2, y + 8, size, col, 0.2);
    }
  });
  r.hot.push({ x: PX[0] - pw / 2 - 6, y: top, w: PX[1] - PX[0] + pw + 12, h: bot - top, tip: n ? `${n} Age${n === 1 ? "" : "s"} link back here` : "No Age links back here yet" });
}

/** Ciel, étoiles et brume lointaine communs aux vues rapprochées en extérieur. */
function outdoorBackdrop(r, ctx, sky, t, horizon) {
  const sg = ctx.createLinearGradient(0, 0, 0, horizon); sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bottom); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  if (sky.stars > 0.05) { const s = rng(0x7a11); for (let i = 0; i < 80; i++) { ctx.fillStyle = rgba(235, 238, 255, sky.stars * (0.3 + 0.6 * s())); ctx.fillRect(s() * W, s() * horizon * 0.9, 1.4, 1.4); } }
  const q = rng(0xfa6), cc = r.cloudColor(sky); ctx.save(); ctx.globalAlpha = 0.45;
  for (let i = 0; i < 10; i++) { const w = 80 + q() * 100, x = ((q() * (W + 240) + t * 4 * (0.6 + q())) % (W + 240)) - 120, y = horizon - 70 + q() * 90; ctx.drawImage(r.sprite, x - w, y - w * 0.25, w * 2, w * 0.5); }
  ctx.restore();
  ctx.fillStyle = hexa(cc, 0.18); ctx.fillRect(0, horizon - 30, W, 30);
}

/** Brins d'herbe (et fleurs de la page « flowers ») le long d'une ligne de sol, en coordonnées d'écran. */
function meadow(r, ctx, sc, sky, t, y, n, seed, h0) {
  const T = r.terrain(), q = rng(seed), k = 0.35 + 0.65 * sky.ambient, fl = sc.additions.find((a) => a.type === "flowers");
  const PAL = { blue: "#5b8cf0", red: "#e04a4a", yellow: "#f2d04a", white: "#f4f1e8", pink: "#f08ab8" };
  for (let i = 0; i < n; i++) {
    const x = q() * W, h = h0 * (0.6 + q() * 0.9), sw = Math.sin(t * 1.2 + i * 0.7) * h * 0.12;
    ctx.strokeStyle = mix("#05060c", i % 3 ? T.tuft : "#8ab864", k); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.4, y - h * 0.6, x + sw, y - h); ctx.stroke();
    if (fl && i % 9 === 0) { ctx.fillStyle = mix("#05060c", PAL[fl.asset] || PAL.blue, k); ctx.beginPath(); ctx.arc(x + sw, y - h, 3.2, 0, 6.283); ctx.fill(); }
  }
}

/** Le bassin de koï en gros plan : la coupe dans la roche, le ruisseau qui y tombe et la chute qui en repart. */
function drawPondRoom(r, ctx, sc, sky, t) {
  const T = r.terrain(), k = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, k), koi = sc.additions.find((a) => a.type === "koi"), wf = sc.additions.find((a) => a.type === "waterfall");
  const S = 5.5, K = r.lay.koi, fx = K.x0 + 26, fy = GY + 9.5, ox = 320, oy = 215, yg = oy + (GY - fy) * S, y0 = oy + (GY + 2 - fy) * S, y1 = oy + (GY + 17 - fy) * S, xr = ox + (K.x1 - fx) * S;
  outdoorBackdrop(r, ctx, sky, t, yg);
  // roche : face de l'île sous le bassin, strates
  const g = ctx.createLinearGradient(0, yg, 0, H); g.addColorStop(0, c(T.rock2)); g.addColorStop(1, c(T.rock)); ctx.fillStyle = g; ctx.fillRect(0, yg - 6, W, H - yg + 6);
  const q = rng(0x5ea7); ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const y = y1 + 10 + i * 14 + q() * 6, x = q() * 500; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + q() * 90, y + 3); ctx.lineTo(x + 150 + q() * 80, y - 2); ctx.stroke(); }
  ctx.fillStyle = c(T.top); ctx.fillRect(0, yg - 12, W, y0 - yg + 12);
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(0, y0 - 4, W, 4);
  // le mont et le ruisseau qui descend jusqu'au bassin
  if (wf) {
    ctx.fillStyle = c(T.rock2); ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(262, -10); ctx.lineTo(236, 70); ctx.lineTo(200, 96); ctx.lineTo(176, yg - 10); ctx.lineTo(-10, yg - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.moveTo(176, yg - 10); ctx.lineTo(200, 96); ctx.lineTo(236, 70); ctx.lineTo(262, -10); ctx.lineTo(300, -10); ctx.lineTo(236, 150); ctx.lineTo(214, yg - 10); ctx.closePath(); ctx.fill();
    const sx = 212, sy = 94, ex = ox + (K.x0 + 16 - fx) * S; // la chute arrive dans l'eau du bassin
    const gr = ctx.createLinearGradient(0, sy, 0, y0); gr.addColorStop(0, "rgba(205,232,250,0.9)"); gr.addColorStop(1, "rgba(225,242,255,0.8)"); ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.bezierCurveTo(sx - 2, sy + 40, ex - 12, yg - 30, ex - 11, y0); ctx.lineTo(ex + 11, y0); ctx.bezierCurveTo(ex + 12, yg - 30, sx + 8, sy + 40, sx + 8, sy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) { const p = (t * 0.7 + i / 9) % 1, y = sy + p * (y0 - sy), x = sx + (ex - sx) * Math.pow(p, 1.4) + (i % 3 - 1) * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 10); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const p = (t * 0.5 + i / 4) % 1; ctx.strokeStyle = rgba(235, 245, 255, 0.5 * (1 - p)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(ex, y0 + 2, 10 + p * 34, 2 + p * 5, 0, 0, 6.283); ctx.stroke(); }
  }
  // le bassin (le même dessin que sur l'île, agrandi) ; ses zones cliquables suivent
  r.withView(ctx, { S, ox, oy, fx, fy }, () => r.drawKoi(ctx, koi, sky, t));
  // la chute qui repart du bassin vers la brume
  if (wf) {
    const ex = xr - 7 * S, gr = ctx.createLinearGradient(0, y1, 0, H); gr.addColorStop(0, "rgba(220,240,255,0.9)"); gr.addColorStop(1, "rgba(220,240,255,0.1)"); ctx.fillStyle = gr; ctx.fillRect(ex - 22, y1 - 4, 44, H - y1 + 4);
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.6; for (let i = 0; i < 8; i++) { const p = (t * 0.8 + i / 8) % 1, y = y1 + p * (H - y1 - 10); ctx.beginPath(); ctx.moveTo(ex - 18 + (i % 4) * 11, y); ctx.lineTo(ex - 18 + (i % 4) * 11, y + 12); ctx.stroke(); }
  }
  meadow(r, ctx, sc, sky, t, y0 - 2, 70, 0x9e1, 14);
}

/** Le chat en gros plan, dans l'herbe : un clic affiche son nom. */
function drawCatRoom(r, ctx, sc, sky, t) {
  const T = r.terrain(), k = 0.35 + 0.65 * sky.ambient, cat = sc.additions.find((a) => a.type === "cat"), gy = 276;
  outdoorBackdrop(r, ctx, sky, t, gy - 10);
  const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, mix("#05060c", T.top, k)); g.addColorStop(1, mix("#05060c", T.rock, k)); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
  meadow(r, ctx, sc, sky, t, gy + 4, 120, 0x3c47, 22);
  r.withView(ctx, { S: 8, ox: 320, oy: gy + 12, fx: r.lay.cat.x, fy: GY }, () => r.drawCat(ctx, cat, sky, t));
  meadow(r, ctx, sc, sky, t, gy + 30, 50, 0x77e, 26); // brins au premier plan, devant les pattes
  if (sky.night > 0.3) { const q = rng(0xf1f1); for (let i = 0; i < 16; i++) { const x = q() * W + Math.sin(t * 0.5 + i) * 12, y = 120 + q() * 150 + Math.sin(t * 0.8 + i * 1.4) * 8; ctx.fillStyle = rgba(240, 238, 150, sky.night * (0.4 + 0.6 * Math.abs(Math.sin(t + i)))); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill(); } }
  const nm = String(cat.name || "").trim();
  if (nm) { ctx.font = "italic 22px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(233, 220, 184, 0.92); ctx.fillText(nm, 320, H - 14); ctx.textAlign = "left"; }
}

/** Le bosquet en gros plan : tous les arbres des pages, l'arbre à tiges, les fleurs, l'herbe et ce qui y vole. */
function drawGroveRoom(r, ctx, sc, sky, t) {
  const T = r.terrain(), k = 0.35 + 0.65 * sky.ambient, has = (ty) => sc.additions.find((a) => a.type === ty), oy = 292, S = 2;
  outdoorBackdrop(r, ctx, sky, t, oy);
  const g = ctx.createLinearGradient(0, oy, 0, H); g.addColorStop(0, mix("#05060c", T.top, k)); g.addColorStop(1, mix("#05060c", T.rock, k)); ctx.fillStyle = g; ctx.fillRect(0, oy, W, H - oy);
  r.withView(ctx, { S, ox: 0, oy, fx: 150, fy: GY }, () => {
    r.drawPlants(ctx, 0, t, r.geo.grove);
    const sk = has("stalktree"); if (sk) r.drawStalk(ctx, sk, sky, t);
    const gr = has("grass"); if (gr) SC.grass(ctx, gr.density, sky, t, []);
    r.drawPlants(ctx, 1, t, r.geo.grove);
    for (const fl of sc.additions.filter((a) => a.type === "flowers")) SC.flowers(ctx, fl, sky, t, []);
    const bf = has("butterflies"); if (bf) SC.butterflies(ctx, bf.density, sky, t);
    const ff = has("fireflies"); if (ff) r.drawFireflies(ctx, ff.density, sky, t);
    const bd = has("birds"); if (bd) SC.birds(ctx, bd.density, sky, t);
    const ln = has("lanterns"); if (ln) r.drawLanterns(ctx, ln.density, sky, t);
  });
}

module.exports = { drawCabin, drawPillarsRoom, drawPondRoom, drawCatRoom, drawGroveRoom };
