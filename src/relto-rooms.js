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
    for (let rw = 0; rw < 3; rw++) ctx.fillRect(x0, y0 + RH * (rw + 1) - 3, w, 5); // trois rayons (30 livres) : un 4e tombait sur le plancher
    for (const b of r.geo.books) {
      const bx = x0 + 10 + b.col * 22, bh = b.h * S, by = y0 + RH * (b.row + 1) - 3 - bh, bw = b.w * S;
      ctx.fillStyle = c(b.color); ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = c(VERDICT[b.age.verdict] || VERDICT.unknown); ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(bx + bw - 3, by + 5, 3, bh - 5);
      const held = r.opts.imagerGet && sc.additions.some((a) => a.type === "imager") && (r.opts.imagerGet(b.age.path) || {}).lock; // tenu par l'Imageur : une petite étiquette de laiton
      if (held) { ctx.fillStyle = c("#c9a24e"); ctx.fillRect(bx + bw / 2 - 2.5, by + 8, 5, 8); ctx.fillStyle = rgba(127, 214, 200, 0.8); ctx.fillRect(bx + bw / 2 - 1, by + 10, 2, 2); }
      r.hot.push({ x: bx, y: by, w: bw, h: bh, tip: `${b.age.name} — ${b.age.verdict || "?"}${b.age.stability != null ? ` ${b.age.stability}%` : ""}${held ? " · held by the Imager" : ""}`, age: b.age, book: true });
    }
    if (sc.ages.length > 30) { ctx.fillStyle = rgba(230, 220, 190, 0.75); ctx.font = "11px serif"; ctx.fillText(`+${sc.ages.length - 30}`, x0 + w - 28, y0 - 14); }
    if (!sc.ages.length) { ctx.fillStyle = rgba(230, 220, 190, 0.45); ctx.font = "11px serif"; ctx.fillText("(no Age written yet)", x0 + 70, y0 + RH * 1.5); }
  }
  // table, chandelle et livres à part
  const tx = 60, tw = 176, ty = 284;
  ctx.fillStyle = c("#2f2016"); ctx.fillRect(tx + 6, ty, 7, 56); ctx.fillRect(tx + tw - 13, ty, 7, 56);
  ctx.fillStyle = c("#4b3322"); ctx.fillRect(tx + 2, ty + 8, tw - 4, 8);
  ctx.fillStyle = c("#6a4a30"); ctx.fillRect(tx, ty, tw, 8);
  const books = [
    { kind: "glyphs", x: tx + 16, y: ty, w: 17, h: 38, body: "#27555a", band: "#d8c07a", tip: "Book of glyphs" },
    { kind: "library", x: tx + 38, y: ty, w: 17, h: 33, body: "#5b2b2b", band: "#c9a24e", tip: "Library book (blocks and Relto pages)" },
  ];
  for (const b of books) { standingBook(ctx, c, b); r.hot.push({ x: b.x - 1, y: b.y - b.h - 1, w: b.w + 2, h: b.h + 2, tip: b.tip, special: b.kind }); }
  if (r.scene.additions.some((a) => a.type === "imager")) { // l'Imageur : un petit appareil de laiton sur la table, son cristal luit ; un clic y mène
    const ix = tx + 112, iy = ty; ctx.fillStyle = c("#6b5126"); ctx.fillRect(ix - 9, iy - 6, 18, 6); ctx.fillRect(ix - 2, iy - 20, 4, 14);
    ctx.fillStyle = rgba(127, 214, 200, 0.55 + 0.25 * Math.sin(t * 2)); ctx.beginPath(); ctx.moveTo(ix, iy - 34); ctx.lineTo(ix + 6, iy - 27); ctx.lineTo(ix, iy - 19); ctx.lineTo(ix - 6, iy - 27); ctx.closePath(); ctx.fill();
    const ig = ctx.createRadialGradient(ix, iy - 27, 0, ix, iy - 27, 18); ig.addColorStop(0, "rgba(127,214,200,0.35)"); ig.addColorStop(1, "rgba(127,214,200,0)"); ctx.fillStyle = ig; ctx.fillRect(ix - 18, iy - 45, 36, 36);
    r.hot.push({ x: ix - 12, y: iy - 38, w: 24, h: 38, tip: "The Imager", go: "imager" });
  }
  if (r.scene.additions.some((a) => a.type === "imager") && r.opts.notes !== "off") { // le carnet de l'arpenteur : posé à plat sur la table, signet rouge
    const nx = tx + 132, ny = ty - 5;
    ctx.fillStyle = c("#3b2a1a"); ctx.fillRect(nx, ny, 22, 5); ctx.fillStyle = c("#6b4a2a"); ctx.fillRect(nx, ny - 1, 22, 2);
    ctx.fillStyle = c("#c9a24e"); ctx.fillRect(nx + 1, ny + 1, 2, 3); ctx.fillRect(nx + 19, ny + 1, 2, 3); ctx.fillStyle = c("#8e2b27"); ctx.fillRect(nx + 14, ny + 4, 1.4, 4);
    r.hot.push({ x: nx - 2, y: ny - 4, w: 26, h: 12, tip: "Surveyor's notebook", special: "surveyor" });
  }
  { // le livre des pages : grand livre ouvert, posé à plat ; un clic l'ouvre en gros plan
    const bx = tx + 60, by = ty - 6;
    ctx.fillStyle = c("#4a2a22"); ctx.fillRect(bx - 1, by, 30, 6); ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(bx + 1, by - 2, 13, 5); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(bx + 15, by - 2, 13, 5);
    ctx.fillStyle = rgba(120, 90, 50, 0.6); for (let k = 0; k < 3; k++) { ctx.fillRect(bx + 3, by - 1 + k * 1.4 - 0.6, 9, 0.5); ctx.fillRect(bx + 17, by - 1 + k * 1.4 - 0.6, 9, 0.5); }
    r.hot.push({ x: bx - 3, y: by - 6, w: 36, h: 14, tip: "Book of pages — click to open", go: "book" });
  }
  const cx = tx + tw - 18;
  ctx.fillStyle = c("#e8dcc0"); ctx.fillRect(cx, ty - 14, 7, 14);
  const cf = clamp(0.75 * fl + 0.2); ctx.fillStyle = rgba(255, 190, 80, cf); ctx.beginPath(); ctx.ellipse(cx + 3.5, ty - 19, 2.4, 5 * cf, 0, 0, 6.283); ctx.fill();
  // le chat, quand il dort au coin du feu (voir ReltoRenderer.catAsleep) : au premier plan, sur le tapis
  const cat = r.scene.additions.find((a) => a.type === "cat");
  if (cat && r.catAsleep()) r.drawSleepingCat(ctx, cat, { x: 428, y: 326, S: 3.1, glow: lit ? d * fl : 0, shade: c }, t);
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
  const T = r.terrain(), k = 0.6 + 0.4 * sky.ambient, c = (h) => mix("#05060c", h, k), koi = sc.additions.find((a) => a.type === "koi"), wf = sc.additions.find((a) => a.type === "waterfall");
  const S = 5.5, K = r.lay.koi, fx = K.x0 + 26, fy = GY + 9.5, ox = 320, oy = 215, yg = oy + (GY - fy) * S, y0 = oy + (GY + 2 - fy) * S, y1 = oy + (GY + 17 - fy) * S, xr = ox + (K.x1 - fx) * S;
  outdoorBackdrop(r, ctx, sky, t, yg);
  // roche : face de l'île sous le bassin, strates
  const g = ctx.createLinearGradient(0, yg, 0, H); g.addColorStop(0, c(T.rock2)); g.addColorStop(1, c(T.rock)); ctx.fillStyle = g; ctx.fillRect(0, yg - 6, W, H - yg + 6);
  const q = rng(0x5ea7); ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const y = y1 + 10 + i * 14 + q() * 6, x = q() * 500; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + q() * 90, y + 3); ctx.lineTo(x + 150 + q() * 80, y - 2); ctx.stroke(); }
  ctx.fillStyle = c(T.top); ctx.fillRect(0, yg - 12, W, y0 - yg + 12);
  ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(0, y0 - 4, W, 4);
  // le mont (falaise à gauche) : le ruisseau naît d'une encoche dans la roche, longe la paroi, coule sur le sol jusqu'au bassin et s'y jette
  if (wf) {
    const ED = [[-10, 282], [40, 264], [90, 238], [150, 218], [yg - 8, 202]], edge = (y) => { for (let i = 1; i < ED.length; i++) if (y <= ED[i][0]) { const [ya, xa] = ED[i - 1], [yb, xb] = ED[i]; return xa + ((xb - xa) * (y - ya)) / (yb - ya); } return ED[ED.length - 1][1]; };
    ctx.fillStyle = c(T.rock2); ctx.beginPath(); ctx.moveTo(-10, -10); for (const [y, x] of ED) ctx.lineTo(x, y); ctx.lineTo(-10, yg - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.moveTo(282, -10); for (const [y, x] of ED) ctx.lineTo(x, y); ctx.lineTo(160, yg - 8); ctx.lineTo(190, 150); ctx.lineTo(214, 90); ctx.lineTo(238, 40); ctx.lineTo(250, -10); ctx.closePath(); ctx.fill();
    const q2 = rng(0x4c1); ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const y = 20 + i * 24 + q2() * 8, x = q2() * 120; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 70 + q2() * 60, y + 4); ctx.stroke(); }
    const y0s = 34, ex = ox + (K.x0 + 16 - fx) * S, N = 30, pts = [];
    for (let i = 0; i <= N; i++) { const p = i / N, y = y0s + (yg - 8 - y0s) * p; pts.push([edge(y) - 7 - 3 * p + Math.sin(p * 9 + t * 0.5) * 0.9, y, 9 + 9 * p]); }
    ctx.fillStyle = "rgba(205,232,250,0.92)"; ctx.beginPath(); pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x - w / 2, y) : ctx.moveTo(x - w / 2, y))); for (let i = N; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c("#2a2622"); ctx.beginPath(); ctx.ellipse(pts[0][0] + 1, y0s - 1, 14, 5, -0.15, 0, 6.283); ctx.fill(); // l'encoche d'où l'eau sort
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.6;
    for (let k = 0; k < 8; k++) { const q = (t * 0.45 + k / 8) % 1, i = Math.min(N - 1, Math.floor(q * N)), [x, y, w] = pts[i], [x2, y2] = pts[i + 1]; ctx.beginPath(); ctx.moveTo(x + ((k % 3) - 1) * w * 0.25, y); ctx.lineTo(x2 + ((k % 3) - 1) * w * 0.25, y2 + 6); ctx.stroke(); }
    // au pied de la paroi : un filet d'eau sur le sol jusqu'au bord du bassin, où il se jette dans l'eau
    const cy = y0 - 7, bx = pts[N][0];
    const cg = ctx.createLinearGradient(bx - 10, 0, ex, 0); cg.addColorStop(0, "rgba(205,232,250,0.9)"); cg.addColorStop(1, "rgba(190,224,246,0.8)"); ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(bx - 10, yg - 14); ctx.quadraticCurveTo(bx + 6, cy - 4, bx + 40, cy - 2); ctx.lineTo(ex - 6, cy - 2); ctx.lineTo(ex + 8, y0 + 2); ctx.lineTo(ex - 8, y0 + 2); ctx.lineTo(ex - 8, cy + 6); ctx.lineTo(bx + 40, cy + 5); ctx.quadraticCurveTo(bx + 10, cy + 6, bx + 8, yg - 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const p = (t * 0.6 + i / 6) % 1, x = bx + 6 + p * (ex - bx - 10); ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + 7, cy + 1); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const p = (t * 0.5 + i / 4) % 1; ctx.strokeStyle = rgba(235, 245, 255, 0.5 * (1 - p)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(ex, y0 + 3, 8 + p * 30, 2 + p * 4, 0, 0, 6.283); ctx.stroke(); }
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

/** Jouets du chat (page « cattoys ») : posés dans l'herbe de la vue du chat, cliquables (la balle à grelot et la souris font du bruit). */
function catToys(r, ctx, sc, sky, t, gy, d, back) {
  const k = 0.45 + 0.55 * sky.ambient, c = (h) => mix("#05060c", h, k), n = 2 + Math.round(d * 3), now = Date.now(), since = (id) => (r.toyAt && r.toyAt[id] ? (now - r.toyAt[id]) / 1000 : 9);
  const hot = (x, y, w, h, tip, toy) => r.hot.push({ x, y, w, h, tip, toy, flash: tip });
  if (back) { // la boîte en carton, derrière le chat
    if (n >= 5) { const x = 56, y = gy - 58, w = 118, h = 62; ctx.fillStyle = c("#a67c52"); ctx.fillRect(x, y, w, h); ctx.fillStyle = c("#8d6742"); ctx.fillRect(x, y, w, 8); ctx.fillStyle = c("#2f2218"); ctx.fillRect(x + 12, y + 14, w - 24, h - 14); ctx.strokeStyle = c("#caa070"); ctx.lineWidth = 2; ctx.strokeRect(x + 12, y + 14, w - 24, h - 14); hot(x, y, w, h + 2, "Cardboard box", "box"); }
    return;
  }
  const yarn = since("yarn") < 1.4 ? Math.sin(Math.min(1, since("yarn") / 1.4) * Math.PI) * 38 : 0, yx = 452 + yarn, yy = gy + 30, rot = yarn * 0.12;
  if (n >= 2) { // pelote de laine
    ctx.strokeStyle = c("#c0392b"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(yx + 20, yy + 14); ctx.bezierCurveTo(yx + 60, yy + 22, yx + 80, yy + 4 + Math.sin(t) * 2, yx + 120, yy + 16); ctx.stroke();
    ctx.fillStyle = c("#c0392b"); ctx.beginPath(); ctx.arc(yx, yy, 22, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#e8685a"); ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(yx, yy, 22 - i * 3, 9 + i * 3, rot + i * 0.8, 0, 6.283); ctx.stroke(); }
    hot(yx - 22, yy - 22, 44, 44, "Ball of yarn", "yarn");
  }
  if (n >= 3) { // souris en peluche
    const mx = 548, my = gy + 38 + Math.sin(since("mouse") * 18) * (since("mouse") < 0.3 ? 3 : 0);
    ctx.strokeStyle = c("#d8a0a0"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(mx - 24, my); ctx.bezierCurveTo(mx - 50, my + 10, mx - 56, my - 8, mx - 76, my + 4); ctx.stroke();
    ctx.fillStyle = c("#8f8f98"); ctx.beginPath(); ctx.ellipse(mx, my, 26, 15, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#d8a0a0"); ctx.beginPath(); ctx.arc(mx + 10, my - 13, 6, 0, 6.283); ctx.arc(mx + 22, my - 10, 6, 0, 6.283); ctx.fill();
    ctx.fillStyle = c("#1a1410"); ctx.beginPath(); ctx.arc(mx + 18, my - 2, 2.2, 0, 6.283); ctx.fill(); ctx.fillStyle = c("#d8a0a0"); ctx.beginPath(); ctx.arc(mx + 26, my + 3, 2.4, 0, 6.283); ctx.fill();
    hot(mx - 28, my - 20, 56, 38, "Toy mouse", "mouse");
  }
  if (n >= 4) { // balle à grelot
    const bx = 392, by = gy + 40, hop = since("bell") < 0.5 ? Math.abs(Math.sin(since("bell") * 12)) * 8 : 0;
    ctx.fillStyle = c("#d9ae45"); ctx.beginPath(); ctx.arc(bx, by - hop, 14, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 245, 200, 0.5); ctx.beginPath(); ctx.arc(bx - 5, by - 5 - hop, 4, 0, 6.283); ctx.fill();
    ctx.strokeStyle = c("#7a5a1c"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 13, by - hop); ctx.lineTo(bx + 13, by - hop); ctx.stroke();
    hot(bx - 14, by - hop - 14, 28, 28, "Jingle ball", "bell");
  }
  if (n >= 5) { // canne à plumes
    const sx = 596, sy = gy + 52, ex = 626, ey = gy + 14, sw = Math.sin(t * 2) * 4;
    ctx.strokeStyle = c("#7a5a3a"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 70, sy + 4); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.strokeStyle = c("#caa070"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 14, sy - 30, ex + sw, ey); ctx.stroke();
    [["#d85a4a", -0.5], ["#e8c45a", 0], ["#5aa8d8", 0.5]].forEach(([col, a]) => { ctx.fillStyle = c(col); ctx.beginPath(); ctx.ellipse(ex + sw + Math.sin(a) * 6, ey - 8, 4, 14, a + sw * 0.05, 0, 6.283); ctx.fill(); });
    hot(sx - 70, ey - 22, 110, 80, "Feather wand", "wand");
  }
}

/** Le bassin de près : le bassin occupe presque tout le cadre, avec ses décorations (nénuphars, lanterne de pierre, tuyau de bambou, roseaux, libellules). */
function drawPondPlusRoom(r, ctx, sc, sky, t) {
  const T = r.terrain(), k = 0.6 + 0.4 * sky.ambient, kk = 0.45 + 0.55 * sky.ambient, c = (h) => mix("#05060c", h, k), cc = (h) => mix("#05060c", h, kk), night = sky.night || 0;
  const koi = sc.additions.find((a) => a.type === "koi"), dc = sc.additions.find((a) => a.type === "ponddecor"), d = dc && dc.density != null ? dc.density : 0.6, K = r.lay.koi;
  const S = 8, fx = K.x0 + 26, fy = GY + 9.5, ox = 320, oy = 222, yg = oy + (GY - fy) * S, y0 = oy + (GY + 2 - fy) * S, y1 = oy + (GY + 17 - fy) * S, xl = ox + (K.x0 - fx) * S, xr = ox + (K.x1 - fx) * S;
  outdoorBackdrop(r, ctx, sky, t, yg);
  const g = ctx.createLinearGradient(0, yg, 0, H); g.addColorStop(0, c(T.rock2)); g.addColorStop(1, c(T.rock)); ctx.fillStyle = g; ctx.fillRect(0, yg - 6, W, H - yg + 6);
  ctx.fillStyle = c(T.top); ctx.fillRect(0, yg - 12, W, y0 - yg + 12); ctx.fillStyle = rgba(0, 0, 0, 0.18); ctx.fillRect(0, y0 - 4, W, 4);
  const q = rng(0xbada); ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const y = y1 + 8 + i * 12, x = q() * 500; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80 + q() * 80, y + 3); ctx.stroke(); }
  // lanterne de pierre sur la rive gauche
  const lx = xl - 44, lb = y0 - 4;
  ctx.fillStyle = cc("#8a867c"); ctx.fillRect(lx - 22, lb - 8, 44, 8); ctx.fillRect(lx - 7, lb - 46, 14, 38); ctx.fillRect(lx - 18, lb - 58, 36, 12);
  ctx.fillStyle = night > 0.2 ? rgba(255, 200, 110, 0.35 + 0.5 * night) : cc("#4a463e"); ctx.fillRect(lx - 11, lb - 56, 22, 8); ctx.fillStyle = cc("#716d64"); ctx.beginPath(); ctx.moveTo(lx - 28, lb - 58); ctx.lineTo(lx, lb - 80); ctx.lineTo(lx + 28, lb - 58); ctx.closePath(); ctx.fill(); ctx.fillRect(lx - 3, lb - 86, 6, 8);
  if (night > 0.2) { const gl = ctx.createRadialGradient(lx, lb - 52, 2, lx, lb - 52, 70); gl.addColorStop(0, rgba(255, 190, 100, 0.4 * night)); gl.addColorStop(1, rgba(255, 190, 100, 0)); ctx.fillStyle = gl; ctx.fillRect(lx - 70, lb - 122, 140, 140); }
  r.hot.push({ x: lx - 28, y: lb - 88, w: 56, h: 90, tip: "Stone lantern" });
  // tuyau de bambou sur la rive droite : une goutte tombe dans l'eau
  const bx = xr + 34, tipx = xr - 40, tipy = y0 - 58;
  ctx.strokeStyle = cc("#7d9a4e"); ctx.lineCap = "round"; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(bx + 20, y0 - 6); ctx.lineTo(bx, y0 - 70); ctx.lineTo(tipx, tipy); ctx.stroke();
  ctx.strokeStyle = cc("#56702f"); ctx.lineWidth = 2; for (const [x, y] of [[bx + 12, y0 - 34], [bx - 4, y0 - 66], [tipx + 30, tipy + 3]]) { ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x + 5, y + 4); ctx.stroke(); }
  const drop = (t * 0.6) % 1, dropY = tipy + 8 + drop * (y0 - tipy - 8); ctx.fillStyle = "rgba(205,232,250,0.9)"; ctx.beginPath(); ctx.ellipse(tipx - 2, dropY, 2.6, 4, 0, 0, 6.283); ctx.fill();
  for (let i = 0; i < 2; i++) { const p = (t * 0.6 + i * 0.5) % 1; ctx.strokeStyle = rgba(235, 245, 255, 0.55 * (1 - p)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(tipx - 2, y0 + 4, 6 + p * 36, 1.5 + p * 5, 0, 0, 6.283); ctx.stroke(); }
  r.hot.push({ x: tipx - 14, y: tipy - 10, w: bx - tipx + 36, h: y0 - tipy + 6, tip: "Bamboo spout" });
  // le bassin : décor sous l'eau (galets, algues) puis les poissons
  const under = (cx2, B, shade) => {
    const u = rng(0x9eb5), n = 8 + Math.round(d * 12);
    for (let i = 0; i < n; i++) { cx2.fillStyle = shade(i % 2 ? "#6d6a64" : "#857f73"); cx2.beginPath(); cx2.ellipse(B.X0 + 2 + u() * (B.PW - 4), B.Y0 + B.PH - 0.8, 1 + u() * 1.6, 0.5 + u() * 0.5, 0, 0, 6.283); cx2.fill(); }
    for (let i = 0, m = 3 + Math.round(d * 4); i < m; i++) { const x = B.X0 + 5 + u() * (B.PW - 10), h = 5 + u() * 4, ph = u() * 6; cx2.strokeStyle = shade("#3f7a4a"); cx2.lineWidth = 0.8; cx2.beginPath(); cx2.moveTo(x, B.Y0 + B.PH); cx2.bezierCurveTo(x + Math.sin(t * 0.9 + ph) * 1.4, B.Y0 + B.PH - h * 0.4, x - Math.sin(t * 0.9 + ph) * 1.4, B.Y0 + B.PH - h * 0.7, x + Math.sin(t * 0.9 + ph) * 1.8, B.Y0 + B.PH - h); cx2.stroke(); }
  };
  r.koiUnder = under; r.withView(ctx, { S, ox, oy, fx, fy }, () => r.drawKoi(ctx, koi, sky, t)); r.koiUnder = null;
  // nénuphars et fleurs sur l'eau
  const lp = rng(0x1117), nl = 3 + Math.round(d * 4);
  for (let i = 0; i < nl; i++) {
    const x = xl + 40 + lp() * (xr - xl - 80), y = y0 + 2 + (i % 2) * 3 + Math.sin(t * 0.7 + i) * 0.8, w = 24 + lp() * 14;
    ctx.fillStyle = cc("#3f8a4a"); ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.18, 0, 0.18, 6.1); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = cc("#2e6a38"); ctx.lineWidth = 1; ctx.stroke();
    if (i % 2 === 0) { const col = i % 4 === 0 ? "#f08ab8" : "#f4f1e8"; ctx.fillStyle = cc(col); for (let a = -2; a <= 2; a++) { ctx.beginPath(); ctx.ellipse(x + a * 4, y - 7 + Math.abs(a), 3, 8 - Math.abs(a), a * 0.35, 0, 6.283); ctx.fill(); } if (night > 0.3) { const gl = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 22); gl.addColorStop(0, rgba(255, 220, 240, 0.3 * night)); gl.addColorStop(1, rgba(255, 220, 240, 0)); ctx.fillStyle = gl; ctx.fillRect(x - 22, y - 28, 44, 44); } }
  }
  r.hot.push({ x: xl + 20, y: y0 - 14, w: xr - xl - 40, h: 14, tip: "Water lilies" });
  // roseaux sur les deux rives
  const rp = rng(0x44aa);
  for (const [a, b] of [[xl - 90, xl - 6], [xr + 6, xr + 70]]) for (let i = 0, m = 4 + Math.round(d * 5); i < m; i++) {
    const x = a + rp() * (b - a), h = 50 + rp() * 56, sw = Math.sin(t * 0.9 + i * 1.3) * 5;
    ctx.strokeStyle = cc("#5d7a3a"); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.quadraticCurveTo(x + sw * 0.4, y0 - h * 0.5, x + sw, y0 - h); ctx.stroke();
    if (i % 2) { ctx.fillStyle = cc("#5a3a22"); ctx.beginPath(); ctx.ellipse(x + sw, y0 - h - 6, 3, 9, 0, 0, 6.283); ctx.fill(); }
  }
  meadow(r, ctx, sc, sky, t, y0 - 2, 40, 0x5b3, 12);
  // libellules (de jour), lucioles (le soir)
  if (night < 0.5) for (let i = 0, m = 1 + Math.round(d * 2); i < m; i++) {
    const x = ((t * 22 + i * 190) % (W + 80)) - 40, y = y0 - 90 - i * 24 + Math.sin(t * 1.7 + i * 2) * 16, w = Math.sin(t * 40 + i) * 5;
    ctx.fillStyle = cc(i % 2 ? "#3a8fc8" : "#c8483a"); ctx.fillRect(x - 12, y - 1.5, 24, 3); ctx.fillStyle = rgba(225, 240, 255, 0.55); ctx.beginPath(); ctx.ellipse(x - 2, y - 4, 9, 2.4 + Math.abs(w) * 0.3, -0.3, 0, 6.283); ctx.ellipse(x + 3, y + 4, 9, 2.4 + Math.abs(w) * 0.3, 0.3, 0, 6.283); ctx.fill();
  }
  if (night > 0.3) { const fq = rng(0xf1f2); for (let i = 0; i < 18; i++) { const x = fq() * W + Math.sin(t * 0.5 + i) * 14, y = 40 + fq() * (y0 - 60) + Math.sin(t * 0.8 + i * 1.3) * 8; ctx.fillStyle = rgba(240, 238, 150, night * (0.4 + 0.6 * Math.abs(Math.sin(t + i)))); ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); } }
}

/** Le chat en gros plan, dans l'herbe : un clic affiche son nom. */
function drawCatRoom(r, ctx, sc, sky, t) {
  const T = r.terrain(), k = 0.35 + 0.65 * sky.ambient, cat = sc.additions.find((a) => a.type === "cat"), gy = 276;
  outdoorBackdrop(r, ctx, sky, t, gy - 10);
  const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, mix("#05060c", T.top, k)); g.addColorStop(1, mix("#05060c", T.rock, k)); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
  meadow(r, ctx, sc, sky, t, gy + 4, 120, 0x3c47, 22);
const tz = sc.additions.find((a) => a.type === "cattoys"), td = tz ? (tz.density == null ? 0.6 : tz.density) : 0;
  if (tz) catToys(r, ctx, sc, sky, t, gy, td, true);
  r.withView(ctx, { S: 8, ox: 320, oy: gy + 12, fx: r.lay.cat.x, fy: GY }, () => r.drawCat(ctx, cat, sky, t));
  meadow(r, ctx, sc, sky, t, gy + 30, 50, 0x77e, 26); // brins au premier plan, devant les pattes
  if (tz) catToys(r, ctx, sc, sky, t, gy, td, false); // les jouets sont au tout premier plan : aucune herbe par-dessus
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

module.exports = { drawCabin, drawPillarsRoom, drawPondRoom, drawPondPlusRoom, drawCatRoom, drawGroveRoom };
