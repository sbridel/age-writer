"use strict";
// Le coffre-fort des livres descriptifs : une salle de pierre, une niche par livre (reliure de savant, sobre), et au centre le pupitre qui porte le livre vierge.
// Chaque livre est le livre descriptif d'un Âge (sa note) : supprimer la note le fait disparaître d'ici comme de l'étagère. Rien n'est dessiné hors du canevas.
const { rng, mix, rgba } = require("./util");

const W = 640, H = 360, FLOOR = 262, PER = 12, NW = 66, NH = 84;
const COLS = ["#3d3a2a", "#2f3e4f", "#4a2f3a", "#33442f", "#4b3a26", "#2b3a45"]; // des reliures de savant : ternes, jamais vives
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);

/** Une trappe de fer dans le sol (vue en perspective douce) : plaque rivetée, anneau de traction. Sert aux deux accès : la cabane et l'atelier. */
function trapDoor(r, ctx, c, cx, cy, w, h, tip) {
  const sk = h * 0.35; // le bord du fond est plus étroit : la plaque est couchée sur le sol
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk - 4, cy - h / 2 - 3); ctx.lineTo(cx + w / 2 - sk + 4, cy - h / 2 - 3); ctx.lineTo(cx + w / 2 + 4, cy + h / 2 + 3); ctx.lineTo(cx - w / 2 - 4, cy + h / 2 + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c("#3a3d44"); ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk, cy - h / 2); ctx.lineTo(cx + w / 2 - sk, cy - h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.lineTo(cx - w / 2, cy + h / 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c("#1b1c20"); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk * 0.5, cy); ctx.lineTo(cx + w / 2 - sk * 0.5, cy); ctx.stroke();
  ctx.fillStyle = c("#5a5f69"); for (const fy of [-0.34, 0.34]) for (const fx of [-0.36, 0.36]) ctx.fillRect(cx + fx * w - 1, cy + fy * h - 1, 2.2, 1.6);
  ctx.strokeStyle = c("#9a9fa9"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 6, 2.6, 0, 0, 6.283); ctx.stroke();
  r.hot.push({ x: cx - w / 2 - 4, y: cy - h / 2 - 4, w: w + 8, h: h + 8, tip, go: "vault" });
}

/** Un livre posé à plat, vu de la tranche : le dos porte son titre. Se range en pile (voir `pile`). */
function flatBook(ctx, c, x, y, w, h, body, band, title, fontPx) {
  ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + 1, y - 1, w, 2);
  ctx.fillStyle = c(body); ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(x + w - 3, y - h + 1.2, 3, h - 2.4); // la tranche des pages, côté ouvert
  ctx.fillStyle = c(band); ctx.fillRect(x + 4, y - h, 1.8, h); ctx.fillRect(x + w - 9, y - h, 1.8, h); // les nerfs du dos
  ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(x, y - 1.6, w, 1.6);
  if (title) { ctx.font = `${fontPx}px serif`; let t = title; while (t.length > 2 && ctx.measureText(t).width > w - 20) t = t.slice(0, -2) + "…"; ctx.fillStyle = c(band); ctx.textAlign = "center"; ctx.fillText(t, x + w / 2 - 1, y - h / 2 + fontPx * 0.35); ctx.textAlign = "left"; }
}

/** Une pile de livres à plat, du bas vers le haut ; renvoie les zones à pousser. books : [{x?, w, h, body, band, title, ...reste}] */
function pile(ctx, c, x, y, books, fontPx) {
  const out = []; let cy = y;
  books.forEach((b, i) => { const bx = x + (b.dx != null ? b.dx : [0, 3, -2, 2][i % 4]); flatBook(ctx, c, bx, cy, b.w, b.h, b.body, b.band, b.title, fontPx); out.push({ b, x: bx - 1, y: cy - b.h - 1, w: b.w + 2, h: b.h + 2 }); cy -= b.h; });
  return out;
}

function drawVault(r, ctx, sc, sky, t) {
  const amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), tr = TR(r), q = rng(0x70a1), fl = 0.85 + 0.15 * Math.sin(t * 6.1) * Math.sin(t * 2.7);
  ctx.fillStyle = c("#2a2c30"); ctx.fillRect(0, 0, W, FLOOR);
  for (let y = 0; y < FLOOR; y += 22) for (let x = -((y / 22) % 2) * 20; x < W; x += 40) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 255, 255, 0.02 + q() * 0.03); ctx.fillRect(x, y, 40, 22); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, y, 40, 1.2); ctx.fillRect(x, y, 1.2, 22); }
  ctx.fillStyle = c("#1d1e22"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 26); ctx.quadraticCurveTo(W / 2, 62, 0, 26); ctx.closePath(); ctx.fill(); // la voûte
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#34353a")); fg.addColorStop(1, c("#1c1d21")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = c("#15161a"); ctx.fillRect(0, FLOOR - 4, W, 6);
  const list = (r.opts.vaultAges ? r.opts.vaultAges() : []) || [], pages = Math.max(1, Math.ceil(list.length / PER)); r.vaultPage = Math.min(Math.max(0, r.vaultPage || 0), pages - 1);
  const shown = list.slice(r.vaultPage * PER, r.vaultPage * PER + PER);
  shown.forEach((a, i) => { // trois colonnes à gauche, trois à droite, deux rangées
    const side = i % 6 < 3 ? 0 : 1, col = i % 3, row = i < 6 ? 0 : 1, nx = side ? 392 + col * 80 : 28 + col * 80, ny = 44 + row * 108;
    ctx.fillStyle = c("#0e0f12"); ctx.fillRect(nx - 3, ny - 3, NW + 6, NH + 6); ctx.fillStyle = c("#17181c"); ctx.fillRect(nx, ny, NW, NH); // la niche
    const body = COLS[hash(a.path) % COLS.length], bx = nx + 18, bw = 30, bh = NH - 16, by = ny + NH - bh - 4;
    ctx.fillStyle = c(body); ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = c("#b8a878"); ctx.fillRect(bx, by + 6, bw, 2); ctx.fillRect(bx, by + bh - 9, bw, 2); ctx.fillStyle = rgba(0, 0, 0, 0.24); ctx.fillRect(bx + bw - 4, by, 4, bh);
    ctx.fillStyle = c("#b8a878"); ctx.fillRect(bx + bw / 2 - 3, by + bh / 2 - 6, 6, 9);
    ctx.fillStyle = c("#3a3326"); ctx.fillRect(nx, ny + NH + 4, NW, 12); ctx.fillStyle = c("#e0d4b0"); ctx.font = "9px serif"; ctx.textAlign = "center";
    let label = a.name; while (label.length > 3 && ctx.measureText(label).width > NW - 6) label = label.slice(0, -2); if (label !== a.name) label += "…"; ctx.fillText(label, nx + NW / 2, ny + NH + 13); ctx.textAlign = "left";
    r.hot.push({ x: nx - 3, y: ny - 3, w: NW + 6, h: NH + 22, tip: a.name, go: "descbook", arg: a.path });
  });
  if (!list.length) { ctx.fillStyle = rgba(230, 220, 190, 0.5); ctx.font = "italic 13px serif"; ctx.textAlign = "center"; ctx.fillText(tr("vault.empty"), W / 2, 110); ctx.textAlign = "left"; }
  // le pupitre central et le livre vierge
  const px = 288, pw = 64;
  ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(px - 6, FLOOR - 2, pw + 12, 8);
  ctx.fillStyle = c("#4b3a28"); ctx.fillRect(px + 8, 176, pw - 16, FLOOR - 176); ctx.fillStyle = c("#6a4f33"); ctx.fillRect(px, 168, pw, 12);
  ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(px + 6, 154, 25, 15); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(px + 33, 154, 25, 15); ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(px + 30, 152, 4, 18);
  ctx.fillStyle = rgba(255, 200, 110, 0.07 * fl); ctx.beginPath(); ctx.arc(px + pw / 2, 150, 70, 0, 6.283); ctx.fill();
  r.hot.push({ x: px - 4, y: 146, w: pw + 8, h: 36, tip: tr("agebook.tip"), go: "descbook" });
  if (pages > 1) { // les pages du coffre : douze livres à la fois
    ctx.fillStyle = rgba(230, 220, 190, 0.8); ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText(`${r.vaultPage + 1} / ${pages}`, W / 2, 330); ctx.textAlign = "left";
    r.hot.push({ x: W / 2 - 54, y: 316, w: 30, h: 20, tip: "◀", vpage: -1 }); r.hot.push({ x: W / 2 + 24, y: 316, w: 30, h: 20, tip: "▶", vpage: 1 });
    ctx.fillStyle = "#c9a24e"; ctx.font = "14px serif"; ctx.fillText("◀", W / 2 - 46, 331); ctx.fillText("▶", W / 2 + 32, 331);
  }
  require("./relto-atelier").backButton(r, ctx, tr("vault.back"), r.vaultFrom || "cabin");
}

module.exports = { drawVault, trapDoor, flatBook, pile };
