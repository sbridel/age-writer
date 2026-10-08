"use strict";
// Le livre des pages du Relto, posé sur la table de la cabane (à la Uru) : un livre ouvert dont chaque page est le dessin de ce qu'elle ajoute à l'île.
// Page éclairée et à l'encre vive = attachée ; page pâle = disponible (un clic l'attache) ; cadenas = verrouillée (la raison est dans l'infobulle).
// Un clic sur une page l'attache ou la détache : l'île change en direct (même mécanisme que l'onglet des pages : relto_pages_active).
const { clamp, mix, rgba } = require("./util");

const W = 640, H = 360, PER_PAGE = 6, PER_SPREAD = 2 * PER_PAGE;
const COLS = 3, CW = 71, CH = 104, GAP = 8, LEFT_X = 78, RIGHT_X = 336, TOP = 84, ROW_GAP = 14;

/** Le nom lisible d'une page. */
const nameOf = (p) => (p.label || String(p.id).replace(/^page_/, "").replace(/_/g, " ")).replace(/^./, (s) => s.toUpperCase());

/** Le dessin d'une page, à l'encre, dans le rectangle (x, y, w, h). `on` : page attachée (couleurs vives) ; sinon encre pâle. */
function vignette(ctx, add, x, y, w, h, t, on) {
  const type = (add && add.type) || "?", asset = add && add.asset, ink = on ? "#3a2a1a" : "#8a7a60", acc = (col) => (on ? col : ink);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y);
  ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ink; ctx.fillStyle = ink;
  const gy = h * 0.78, cx = w / 2, line = (...pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); };
  const dot = (px, py, r, col) => { ctx.fillStyle = col || ink; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill(); };
  const ground = () => { ctx.beginPath(); ctx.moveTo(2, gy); ctx.quadraticCurveTo(cx, gy - 5, w - 2, gy + 2); ctx.stroke(); };
  const tri = (px, py, tw, th) => { ctx.beginPath(); ctx.moveTo(px - tw / 2, py); ctx.lineTo(px, py - th); ctx.lineTo(px + tw / 2, py); ctx.closePath(); ctx.stroke(); };
  const cloud = (px, py, s) => { ctx.beginPath(); ctx.arc(px - 8 * s, py, 7 * s, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(px, py - 6 * s, 9 * s, Math.PI, 0); ctx.arc(px + 9 * s, py, 7 * s, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.stroke(); };
  switch (type) {
    case "vegetation": {
      ground();
      if (asset === "birch") { for (const [bx, bh] of [[cx - 14, 38], [cx, 46], [cx + 14, 34]]) { line([bx, gy], [bx, gy - bh]); for (let k = 1; k < 5; k++) line([bx - 2, gy - bh * k / 5], [bx + 2, gy - bh * k / 5]); dot(bx, gy - bh - 2, 6, acc("rgba(150,170,70,0.55)")); } }
      else if (asset === "palm") { line([cx, gy], [cx + 4, gy - 22], [cx - 2, gy - 40]); for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.05 + 0.18 * k); ctx.beginPath(); ctx.moveTo(cx - 2, gy - 40); ctx.quadraticCurveTo(cx - 2 + Math.cos(a) * 16, gy - 40 + Math.sin(a) * 14 - 4, cx - 2 + Math.cos(a) * 26, gy - 40 + Math.sin(a) * 10 + 8); ctx.stroke(); } }
      else if (asset === "fern") { for (const dx of [-14, 0, 14]) for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.4; ctx.beginPath(); ctx.moveTo(cx + dx, gy); ctx.quadraticCurveTo(cx + dx + Math.cos(a) * 14, gy + Math.sin(a) * 18, cx + dx + Math.cos(a) * 20, gy + Math.sin(a) * 26 + 6); ctx.stroke(); } }
      else if (asset === "maple") { line([cx, gy], [cx, gy - 22]); dot(cx, gy - 32, 15, acc("rgba(200,100,40,0.6)")); ctx.beginPath(); ctx.arc(cx, gy - 32, 15, 0, 6.283); ctx.stroke(); }
      else if (asset === "crystal") { for (const [dx, hh] of [[-12, 30], [0, 44], [12, 26]]) { ctx.beginPath(); ctx.moveTo(cx + dx - 5, gy); ctx.lineTo(cx + dx - 4, gy - hh); ctx.lineTo(cx + dx, gy - hh - 7); ctx.lineTo(cx + dx + 4, gy - hh); ctx.lineTo(cx + dx + 5, gy); ctx.closePath(); ctx.fillStyle = acc("rgba(140,220,230,0.4)"); ctx.fill(); ctx.stroke(); } }
      else if (asset === "ponderosa") { for (const [bx, bh] of [[cx - 12, 46], [cx + 10, 38]]) { line([bx, gy], [bx, gy - bh]); for (let k = 0; k < 3; k++) { dot(bx + (k % 2 ? 5 : -5), gy - bh + 4 + k * 9, 5, acc("rgba(60,110,60,0.55)")); } } }
      else { for (const [bx, bh] of [[cx - 15, 30], [cx + 2, 44], [cx + 17, 26]]) { line([bx, gy], [bx, gy - 3]); for (let k = 0; k < 3; k++) { ctx.fillStyle = acc("rgba(60,110,70,0.35)"); tri(bx, gy - 3 - k * bh / 4.2, bh * 0.55 - k * 3, bh * 0.45); ctx.fill(); } } }
      break;
    }
    case "waterfall": { ctx.strokeRect(cx - 24, 4, 48, gy * 0.5); line([cx - 8, 4 + gy * 0.5], [cx - 8, gy]); for (const dx of [-6, 0, 6, 12]) { ctx.strokeStyle = acc("rgba(80,150,200,0.8)"); line([cx + dx - 6, 8 + gy * 0.45], [cx + dx - 6 + Math.sin(t * 3 + dx) * 1.5, gy - 2]); } ctx.strokeStyle = ink; ctx.beginPath(); ctx.ellipse(cx - 2, gy + 2, 26, 6, 0, 0, 6.283); ctx.stroke(); break; }
    case "fireflies": for (let i = 0; i < 9; i++) { const px = 8 + ((i * 53) % (w - 16)), py = 10 + ((i * 37) % (gy - 14)), f = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); dot(px, py, 1.6, acc(rgba(240, 230, 110, 0.4 + 0.6 * f))); if (on) dot(px, py, 4.5, rgba(240, 230, 110, 0.18 * f)); } ground(); break;
    case "lanterns": for (const [lx, ly] of [[cx - 18, 20], [cx + 4, 12], [cx + 20, 28]]) { line([lx, 0], [lx, ly]); ctx.fillStyle = acc("rgba(255,180,70,0.55)"); ctx.beginPath(); ctx.rect(lx - 5, ly, 10, 14); ctx.fill(); ctx.stroke(); } break;
    case "snow": for (let i = 0; i < 16; i++) dot(6 + ((i * 41) % (w - 12)), (i * 23 + t * 8 * (1 + (i % 3) * 0.3)) % gy, 1.3, on ? "#4a6a85" : ink); ground(); break;
    case "aurora": for (let b = 0; b < 3; b++) { ctx.strokeStyle = acc(["rgba(80,200,150,0.7)", "rgba(150,120,220,0.7)", "rgba(90,180,220,0.7)"][b]); ctx.lineWidth = 3; ctx.beginPath(); for (let px = 0; px <= w; px += 5) { const py = 14 + b * 12 + 6 * Math.sin(px / 12 + b + t); px ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } ctx.lineWidth = 1.2; ctx.strokeStyle = ink; ground(); break;
    case "fireworks": for (const [fx, fy, r] of [[cx - 12, 26, 15], [cx + 14, 38, 10]]) for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; ctx.strokeStyle = acc(k % 2 ? "rgba(230,90,90,0.8)" : "rgba(230,190,70,0.8)"); line([fx + Math.cos(a) * r * 0.3, fy + Math.sin(a) * r * 0.3], [fx + Math.cos(a) * r, fy + Math.sin(a) * r]); } break;
    case "mountain": ground(); line([2, gy], [cx - 14, gy - 40], [cx - 6, gy - 32], [cx + 4, gy - 56], [cx + 22, gy - 20], [cx + 30, gy - 28], [w - 2, gy]); line([cx + 4, gy - 56], [cx + 1, gy - 46], [cx + 8, gy - 48]); break;
    case "pillars": ground(); for (const dx of [-18, 0, 18]) { ctx.strokeRect(cx + dx - 4, gy - 40, 8, 40); line([cx + dx - 7, gy - 40], [cx + dx + 7, gy - 40]); } ctx.strokeStyle = acc("rgba(120,200,190,0.8)"); line([cx - 14, gy - 20], [cx + 14, gy - 20]); break;
    case "chimney": ground(); ctx.strokeRect(cx - 14, gy - 28, 28, 28); ctx.strokeRect(cx + 4, gy - 40, 7, 12); for (let k = 0; k < 3; k++) { ctx.strokeStyle = acc("rgba(120,120,120,0.7)"); ctx.beginPath(); ctx.arc(cx + 7 + Math.sin(t * 2 + k) * 3, gy - 46 - k * 7, 3 + k, 0, 6.283); ctx.stroke(); } ctx.fillStyle = acc("rgba(255,150,50,0.8)"); ctx.beginPath(); ctx.moveTo(cx - 5, gy); ctx.lineTo(cx, gy - 12 - 2 * Math.sin(t * 6)); ctx.lineTo(cx + 5, gy); ctx.fill(); break;
    case "gems": for (const [gx, gyy, s, col] of [[cx - 14, gy - 12, 12, "rgba(200,60,90,0.55)"], [cx + 6, gy - 24, 15, "rgba(70,150,220,0.55)"], [cx + 18, gy - 8, 9, "rgba(90,200,120,0.55)"]]) { ctx.beginPath(); ctx.moveTo(gx - s, gyy); ctx.lineTo(gx - s * 0.5, gyy - s * 0.7); ctx.lineTo(gx + s * 0.5, gyy - s * 0.7); ctx.lineTo(gx + s, gyy); ctx.lineTo(gx, gyy + s * 0.9); ctx.closePath(); ctx.fillStyle = acc(col); ctx.fill(); ctx.stroke(); } break;
    case "gold": case "silver": { const col = type === "gold" ? "rgba(225,180,50,0.7)" : "rgba(190,200,210,0.8)"; for (const [bx, by] of [[cx - 16, gy - 6], [cx + 4, gy - 6], [cx - 6, gy - 18]]) { ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx + 1, by - 9); ctx.lineTo(bx + 19, by - 9); ctx.lineTo(bx + 16, by); ctx.closePath(); ctx.fillStyle = acc(col); ctx.fill(); ctx.stroke(); } break; }
    case "koi": ctx.beginPath(); ctx.ellipse(cx, gy - 18, 30, 17, 0, 0, 6.283); ctx.stroke(); for (const [fx, fy, d, col] of [[cx - 8, gy - 20, 1, "rgba(240,120,40,0.8)"], [cx + 10, gy - 14, -1, "rgba(235,235,230,0.9)"]]) { ctx.fillStyle = acc(col); ctx.beginPath(); ctx.ellipse(fx, fy, 8, 3.4, 0, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx - d * 7, fy); ctx.lineTo(fx - d * 13, fy - 4); ctx.lineTo(fx - d * 13, fy + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    case "imager": ctx.beginPath(); ctx.arc(cx, gy - 26, 20, 0, 6.283); ctx.stroke(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; line([cx + Math.cos(a) * 20, gy - 26 + Math.sin(a) * 20], [cx + Math.cos(a + 1.2) * 9, gy - 26 + Math.sin(a + 1.2) * 9]); } ctx.fillStyle = acc("rgba(127,214,200,0.6)"); ctx.beginPath(); ctx.moveTo(cx, gy - 34); ctx.lineTo(cx + 5, gy - 26); ctx.lineTo(cx, gy - 18); ctx.lineTo(cx - 5, gy - 26); ctx.closePath(); ctx.fill(); break;
    case "cattoys": ground(); dot(cx - 12, gy - 6, 6, acc("rgba(210,70,70,0.6)")); ctx.beginPath(); ctx.arc(cx - 12, gy - 6, 6, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx + 12, gy - 6, 8, 4, 0, 0, 6.283); ctx.stroke(); line([cx + 20, gy - 6], [cx + 28, gy - 12], [cx + 32, gy - 8]); break;
    case "ponddecor": ctx.beginPath(); ctx.ellipse(cx, gy - 14, 31, 13, 0, 0, 6.283); ctx.stroke(); for (const [px, py] of [[cx - 12, gy - 14], [cx + 8, gy - 10], [cx + 14, gy - 18]]) { ctx.fillStyle = acc("rgba(80,160,90,0.55)"); ctx.beginPath(); ctx.ellipse(px, py, 7, 3, 0, 0, 6.283); ctx.fill(); ctx.stroke(); } dot(cx + 8, gy - 13, 2, acc("#d86a9a")); break;
    case "cat": ground(); ctx.fillStyle = acc("rgba(230,150,60,0.6)"); ctx.beginPath(); ctx.ellipse(cx, gy - 12, 11, 13, 0, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, gy - 30, 8, 0, 6.283); ctx.fill(); ctx.stroke(); line([cx - 7, gy - 34], [cx - 7, gy - 42], [cx - 2, gy - 37]); line([cx + 7, gy - 34], [cx + 7, gy - 42], [cx + 2, gy - 37]); ctx.beginPath(); ctx.moveTo(cx + 10, gy - 4); ctx.quadraticCurveTo(cx + 26, gy - 6, cx + 20, gy - 20); ctx.stroke(); break;
    case "rain": cloud(cx, 22, 1.4); for (let i = 0; i < 9; i++) { const px = 8 + i * 8, py = 34 + ((i * 17 + t * 30) % 34); ctx.strokeStyle = acc("rgba(80,130,190,0.8)"); line([px, py], [px - 2, py + 6]); } break;
    case "storm": cloud(cx, 22, 1.5); ctx.fillStyle = acc("rgba(235,200,60,0.9)"); ctx.beginPath(); ctx.moveTo(cx + 2, 34); ctx.lineTo(cx - 8, 54); ctx.lineTo(cx, 54); ctx.lineTo(cx - 6, 72); ctx.lineTo(cx + 10, 48); ctx.lineTo(cx + 2, 48); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case "birds": for (const [bx, by] of [[cx - 14, 20], [cx + 6, 12], [cx + 18, 28]]) { ctx.beginPath(); ctx.moveTo(bx - 7, by + 1); ctx.quadraticCurveTo(bx - 3, by - 6 + Math.sin(t * 5 + bx) * 2, bx, by); ctx.quadraticCurveTo(bx + 3, by - 6 + Math.sin(t * 5 + bx) * 2, bx + 7, by + 1); ctx.stroke(); } break;
    case "butterflies": for (const [bx, by, s] of [[cx - 10, 24, 1], [cx + 12, 42, 0.8]]) { ctx.fillStyle = acc("rgba(90,140,230,0.55)"); for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + d * 5 * s, by - 2, 5 * s, 7 * s, d * 0.5, 0, 6.283); ctx.fill(); ctx.stroke(); } line([bx, by - 6 * s], [bx, by + 6 * s]); } break;
    case "moons": ctx.beginPath(); ctx.arc(cx - 14, 26, 11, 0, 6.283); ctx.stroke(); ctx.fillStyle = acc("rgba(220,200,120,0.5)"); ctx.beginPath(); ctx.arc(cx - 14, 26, 11, 0.6, 5.7); ctx.arc(cx - 9, 24, 8, 5.2, 1.2, true); ctx.fill(); dot(cx + 16, 40, 8, acc("rgba(240,170,60,0.65)")); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; line([cx + 16 + Math.cos(a) * 10, 40 + Math.sin(a) * 10], [cx + 16 + Math.cos(a) * 14, 40 + Math.sin(a) * 14]); } break;
    case "dock": ctx.fillStyle = acc("rgba(80,150,190,0.25)"); ctx.fillRect(0, gy - 12, w, h - gy + 12); line([4, gy - 12], [w - 4, gy - 12]); for (let k = 0; k < 6; k++) line([10 + k * 11, gy - 14], [10 + k * 11, gy - 4]); line([8, gy - 18], [w - 8, gy - 18]); break;
    case "bench": ground(); line([cx - 18, gy - 14], [cx + 18, gy - 14]); line([cx - 18, gy - 24], [cx + 18, gy - 24]); line([cx - 16, gy - 14], [cx - 16, gy]); line([cx + 16, gy - 14], [cx + 16, gy]); line([cx - 16, gy - 24], [cx - 16, gy - 14]); line([cx + 16, gy - 24], [cx + 16, gy - 14]); break;
    case "islets": for (const [ix, iy, s] of [[cx - 14, 28, 14], [cx + 12, 46, 10], [cx - 2, gy - 4, 18]]) { ctx.beginPath(); ctx.ellipse(ix, iy, s, s * 0.32, 0, 0, 6.283); ctx.fillStyle = acc("rgba(100,140,90,0.4)"); ctx.fill(); ctx.stroke(); line([ix - s * 0.6, iy + s * 0.2], [ix, iy + s * 0.9], [ix + s * 0.6, iy + s * 0.2]); } break;
    case "calendar": ground(); tri(cx, gy, 24, 56); ctx.beginPath(); ctx.ellipse(cx, gy - 30, 12, 3, 0, 0, 6.283); ctx.stroke(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; dot(cx + Math.cos(a) * 12, gy - 30 + Math.sin(a) * 3, 1.3, acc("#d8a24a")); } break;
    case "flowers": ground(); for (const [fx, fh] of [[cx - 14, 20], [cx - 4, 30], [cx + 8, 24], [cx + 18, 16]]) { line([fx, gy], [fx, gy - fh]); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; dot(fx + Math.cos(a) * 3.2, gy - fh + Math.sin(a) * 3.2, 2, acc("rgba(70,110,220,0.75)")); } dot(fx, gy - fh, 1.4, acc("#e8d070")); } break;
    case "grass": ground(); for (let k = 0; k < 14; k++) { const gx = 6 + k * 5, gh = 8 + ((k * 7) % 14); line([gx, gy + 1], [gx + ((k % 3) - 1) * 3, gy - gh]); } break;
    case "stalktree": ground(); line([cx, gy], [cx - 2, gy - 18], [cx + 3, gy - 34], [cx, gy - 52]); for (let k = 0; k < 4; k++) { const ky = gy - 10 - k * 12; ctx.beginPath(); ctx.ellipse(cx + (k % 2 ? 7 : -7), ky, 5, 2.2, 0, 0, 6.283); ctx.fillStyle = acc("rgba(120,190,110,0.5)"); ctx.fill(); ctx.stroke(); } dot(cx, gy - 54, 5, acc("rgba(200,230,140,0.6)")); break;
    case "mist": for (let k = 0; k < 5; k++) { ctx.strokeStyle = acc("rgba(170,190,200,0.8)"); ctx.beginPath(); for (let px = 0; px <= w; px += 4) { const py = 18 + k * 11 + 3 * Math.sin(px / 9 + k * 2 + t); px ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } break;
    default: for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI; line([cx + Math.cos(a) * 18, gy / 2 + Math.sin(a) * 18], [cx - Math.cos(a) * 18, gy / 2 - Math.sin(a) * 18]); } dot(cx, gy / 2, 2.4);
  }
  ctx.restore();
}

/** Un petit cadenas (page verrouillée). */
function lock(ctx, x, y, col) { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.3; ctx.strokeRect(x - 4, y, 8, 6); ctx.beginPath(); ctx.arc(x, y, 3.2, Math.PI, 0); ctx.stroke(); }

/** Le nombre de volées (doubles pages) du livre. */
const spreadsOf = (n) => Math.max(1, Math.ceil(n / PER_SPREAD));

/** La vue du livre : fond de bois à la chandelle, le livre ouvert, ses douze cases, les flèches et la sortie. */
function drawBookRoom(r, ctx, sc, sky, t) {
  const amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb), pages = sc.pages || [];
  const st = r.pageBook || (r.pageBook = { spread: 0 }); st.spread = clamp(st.spread, 0, spreadsOf(pages.length) - 1);
  // la table, dans la pénombre
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.10 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  // le livre : couverture, deux pages de parchemin, dos
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(52, 36, 548, 296);
  ctx.fillStyle = c("#4a2a22"); ctx.fillRect(48, 30, 548, 296);
  ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(62, 40, 258, 276); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(320, 40, 258, 276);
  const sp = ctx.createLinearGradient(290, 0, 320, 0); sp.addColorStop(0, "rgba(60,40,20,0)"); sp.addColorStop(1, "rgba(60,40,20,0.35)"); ctx.fillStyle = sp; ctx.fillRect(290, 40, 30, 276);
  const sp2 = ctx.createLinearGradient(320, 0, 350, 0); sp2.addColorStop(0, "rgba(60,40,20,0.35)"); sp2.addColorStop(1, "rgba(60,40,20,0)"); ctx.fillStyle = sp2; ctx.fillRect(320, 40, 30, 276);
  // titres
  const nOn = pages.filter((p) => p.state === "active").length;
  ctx.fillStyle = c("#4a3520"); ctx.font = "italic 13px serif"; ctx.textAlign = "center";
  ctx.fillText("Book of pages", 192, 66); ctx.fillText(`${nOn} attached · ${pages.length} pages`, 449, 66); ctx.textAlign = "left";
  ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(100, 74); ctx.lineTo(284, 74); ctx.moveTo(357, 74); ctx.lineTo(541, 74); ctx.stroke();
  if (!pages.length) { ctx.fillStyle = c("#6a5538"); ctx.font = "italic 11px serif"; ctx.textAlign = "center"; ctx.fillText("The pages are blank.", 192, 170); ctx.fillText("Write a Relto page, then it will appear here.", 192, 188); ctx.textAlign = "left"; }
  // les cases
  const start = st.spread * PER_SPREAD;
  for (let i = 0; i < PER_SPREAD; i++) {
    const p = pages[start + i]; if (!p) continue;
    const side = i < PER_PAGE ? 0 : 1, j = i % PER_PAGE, col = j % COLS, row = Math.floor(j / COLS);
    const x = (side ? RIGHT_X : LEFT_X) + col * (CW + GAP), y = TOP + row * (CH + ROW_GAP);
    const on = p.state === "active", can = p.state === "available" || on || p.state === "disabled" || r.scene.pagesActive.includes(p.id), locked = p.state === "locked" && !on;
    if (on) { const g = ctx.createRadialGradient(x + CW / 2, y + 40, 4, x + CW / 2, y + 40, 60); g.addColorStop(0, "rgba(255,210,120,0.35)"); g.addColorStop(1, "rgba(255,210,120,0)"); ctx.fillStyle = g; ctx.fillRect(x - 8, y - 6, CW + 16, 96); }
    ctx.fillStyle = on ? rgba(255, 244, 214, 0.5) : rgba(80, 60, 30, 0.05); ctx.fillRect(x, y, CW, 80);
    ctx.strokeStyle = on ? rgba(160, 110, 40, 0.85) : rgba(90, 70, 40, 0.35); ctx.lineWidth = on ? 1.4 : 0.9; ctx.strokeRect(x + 0.5, y + 0.5, CW - 1, 79);
    ctx.globalAlpha = locked ? 0.25 : on ? 1 : 0.55; vignette(ctx, (p.additions && p.additions[0]) || null, x + 1, y + 1, CW - 2, 78, t, on); ctx.globalAlpha = 1;
    if (on) { ctx.fillStyle = "#9a2f2a"; ctx.beginPath(); ctx.arc(x + CW - 8, y + 8, 4.4, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 255, 255, 0.35); ctx.beginPath(); ctx.arc(x + CW - 9.4, y + 6.6, 1.3, 0, 6.283); ctx.fill(); }
    if (locked) lock(ctx, x + CW / 2, y + 36, rgba(70, 50, 30, 0.8));
    ctx.fillStyle = on ? c("#3a2412") : c("#7a6648"); ctx.font = (on ? "bold " : "") + "9px serif"; ctx.textAlign = "center";
    let label = nameOf(p); while (label.length > 3 && ctx.measureText(label).width > CW + 4) label = label.slice(0, -2) + "…";
    ctx.fillText(label, x + CW / 2, y + 93); ctx.textAlign = "left";
    const verb = on ? "click to detach" : locked ? "locked" + (p.reason ? ": " + p.reason : "") : can ? "click to attach" : p.state;
    r.hot.push({ x, y, w: CW, h: 96, tip: `${nameOf(p)} — ${verb}`, ...(locked ? {} : { pageToggle: p.id }) });
  }
  // feuilleter, refermer
  const nS = spreadsOf(pages.length);
  ctx.fillStyle = rgba(236, 224, 190, 0.85); ctx.font = "italic 11px serif"; ctx.textAlign = "center";
  ctx.fillText(`${st.spread + 1} / ${nS}`, 320, 346);
  if (st.spread > 0) { ctx.font = "22px serif"; ctx.fillText("‹", 70, 349); r.hot.push({ x: 52, y: 328, w: 36, h: 28, tip: "Previous pages", pbook: -1 }); }
  if (st.spread < nS - 1) { ctx.font = "22px serif"; ctx.fillText("›", 570, 349); r.hot.push({ x: 552, y: 328, w: 36, h: 28, tip: "Next pages", pbook: 1 }); }
  ctx.font = "italic 11px serif"; ctx.fillText("← Close the book", 90, 16); ctx.textAlign = "left";
  r.hot.push({ x: 10, y: 2, w: 160, h: 22, tip: "Close the book — back to the cabin", go: "cabin" });
  // la chandelle : une lueur chaude, puis la pénombre
  const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1);
  let g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 420); g.addColorStop(0, rgba(255, 190, 90, 0.07 * fl)); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

module.exports = { drawBookRoom, vignette, nameOf, spreadsOf, PER_SPREAD };
