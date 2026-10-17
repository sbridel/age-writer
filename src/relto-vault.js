"use strict";
// Le coffre-fort des livres descriptifs : une salle de pierre, une niche par livre (reliure de savant, sobre), et au centre le pupitre qui porte le livre vierge.
// Chaque livre est le livre descriptif d'un Âge (sa note) : supprimer la note le fait disparaître d'ici comme de l'étagère. Rien n'est dessiné hors du canevas.
const { rng, mix, rgba } = require("./util");

const W = 640, H = 360, FLOOR = 262, PER = 12, PER_NICHE = 5, NW = 66, NH = 84;
const COLS = ["#3d3a2a", "#2f3e4f", "#4a2f3a", "#33442f", "#4b3a26", "#2b3a45"]; // des reliures de savant : ternes, jamais vives
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);

/** Une trappe de fer dans le sol (vue en perspective douce) : plaque rivetée, anneau de traction. Sert aux deux accès : la cabane et l'atelier. */
function trapDoor(r, ctx, c, cx, cy, w, h, tip) {
  if (r.castleOn && r.castleOn()) { require("./relto-castle").stoneTrap(ctx, c, cx, cy, w, h); r.hot.push({ x: cx - w / 2 - 4, y: cy - h / 2 - 4, w: w + 8, h: h + 8, tip, go: "vault" }); return; } // le Château : une dalle à anneau
  if (r.glassOn && r.glassOn()) { require("./relto-glass").bronzeTrap(ctx, c, cx, cy, w, h); r.hot.push({ x: cx - w / 2 - 4, y: cy - h / 2 - 4, w: w + 8, h: h + 8, tip, go: "vault" }); return; } // la Verrière : bronze et argent
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
  // une niche garde plusieurs livres (cinq au plus), rangés par ordre alphabétique ; son écriteau dit d'où à où elle va
  const list = ((r.opts.vaultAges ? r.opts.vaultAges() : []) || []).slice().sort((x, y) => String(x.name).localeCompare(String(y.name))), niches = [];
  for (let i = 0; i < list.length; i += PER_NICHE) niches.push(list.slice(i, i + PER_NICHE));
  const pages = Math.max(1, Math.ceil(niches.length / PER)); r.vaultPage = Math.min(Math.max(0, r.vaultPage || 0), pages - 1);
  const spot = (i) => { const side = i % 6 < 3 ? 0 : 1, col = i % 3, row = i < 6 ? 0 : 1; return [side ? 392 + col * 80 : 28 + col * 80, 44 + row * 108]; }; // trois colonnes à gauche, trois à droite, deux rangées
  const shownN = niches.slice(r.vaultPage * PER, r.vaultPage * PER + PER);
  for (let i = shownN.length; i < PER; i++) { // les niches vides ne le restent pas tout à fait : une bougie, une araignée sur sa toile, un vase de fleurs sèches
    const [nx, ny] = spot(i); ctx.fillStyle = c("#0e0f12"); ctx.fillRect(nx - 3, ny - 3, NW + 6, NH + 6); ctx.fillStyle = c("#17181c"); ctx.fillRect(nx, ny, NW, NH);
    const kind = (i * 5 + r.vaultPage * 7) % 9, bx = nx + NW / 2, by = ny + NH - 4, flip = (i + r.vaultPage) % 2 ? 1 : -1;
    const glow = (x, y, rad, a, col) => { ctx.fillStyle = rgba(col[0], col[1], col[2], a); ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill(); };
    if (kind === 0) { // une bougie, dont la flamme vacille et éclaire la niche
      const f = 0.8 + 0.2 * Math.sin(t * 7 + i) * Math.sin(t * 3.1 + i); glow(bx, by - 26, 34, 0.1 * f, [255, 190, 90]);
      ctx.fillStyle = c("#5a4c36"); ctx.fillRect(bx - 7, by - 3, 14, 3); ctx.fillStyle = c("#d9ceb0"); ctx.fillRect(bx - 3, by - 24, 6, 21); ctx.fillStyle = rgba(255, 200, 100, 0.95 * f); ctx.beginPath(); ctx.ellipse(bx, by - 29, 2.2, 4.5 * f, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = rgba(255, 245, 200, 0.9); ctx.beginPath(); ctx.ellipse(bx, by - 28, 1, 2.2, 0, 0, 6.283); ctx.fill();
    } else if (kind === 1) { // une toile dans un coin, et l'araignée qui descend et remonte sur son fil
      const cx0 = flip > 0 ? nx : nx + NW; ctx.strokeStyle = rgba(220, 220, 230, 0.22); ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 0; k <= 4; k++) { const an = (k / 4) * 1.5708; ctx.moveTo(cx0, ny); ctx.lineTo(cx0 + flip * Math.cos(an) * 38, ny + Math.sin(an) * 38); } ctx.stroke();
      for (const rr of [10, 20, 30]) { ctx.beginPath(); ctx.arc(cx0, ny, rr, flip > 0 ? 0 : 1.5708, flip > 0 ? 1.5708 : 3.1416); ctx.stroke(); }
      const sy = ny + 28 + 10 * Math.sin(t * 0.8 + i), sx = cx0 + flip * 30; ctx.strokeStyle = rgba(220, 220, 230, 0.3); ctx.beginPath(); ctx.moveTo(sx, ny + 2); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.fillStyle = c("#0a0a0c"); ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, 6.283); ctx.fill(); ctx.strokeStyle = c("#0a0a0c"); ctx.lineWidth = 0.8; for (const d of [-1, 1]) for (const k of [0, 1, 2]) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + d * (4 + k), sy - 2 + k * 2.2); ctx.stroke(); }
    } else if (kind === 2) { // un bocal où une luciole s'éteint et se rallume
      const f = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2); ctx.strokeStyle = rgba(190, 210, 220, 0.4); ctx.lineWidth = 1; ctx.strokeRect(bx - 10, by - 26, 20, 26); ctx.fillStyle = c("#4b3a26"); ctx.fillRect(bx - 11, by - 29, 22, 4);
      glow(bx + Math.sin(t * 0.6 + i) * 4, by - 12 + Math.cos(t * 0.8 + i) * 4, 12, 0.12 * f, [190, 255, 150]); glow(bx + Math.sin(t * 0.6 + i) * 4, by - 12 + Math.cos(t * 0.8 + i) * 4, 1.8, 0.4 + 0.6 * f, [225, 255, 180]);
    } else if (kind === 3) { // un vase et trois tiges sèches
      ctx.fillStyle = c("#4b3a26"); ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx + 4, by - 15); ctx.lineTo(bx - 4, by - 15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c("#8a7a4a"); ctx.lineWidth = 1; for (const [dx, h] of [[-5, 36], [0, 44], [5, 32]]) { ctx.beginPath(); ctx.moveTo(bx, by - 14); ctx.quadraticCurveTo(bx + dx * 0.6, by - h * 0.6, bx + dx, by - h); ctx.stroke(); ctx.fillStyle = c("#a89460"); ctx.beginPath(); ctx.arc(bx + dx, by - h, 2, 0, 6.283); ctx.fill(); }
    } else if (kind === 4) { // un sablier, le sable qui coule
      ctx.strokeStyle = c("#b8934a"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - 9, by - 34); ctx.lineTo(bx + 9, by - 34); ctx.moveTo(bx - 9, by - 2); ctx.lineTo(bx + 9, by - 2); ctx.stroke();
      ctx.fillStyle = rgba(200, 180, 130, 0.35); ctx.beginPath(); ctx.moveTo(bx - 8, by - 33); ctx.lineTo(bx + 8, by - 33); ctx.lineTo(bx + 1, by - 18); ctx.lineTo(bx + 8, by - 3); ctx.lineTo(bx - 8, by - 3); ctx.lineTo(bx - 1, by - 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c("#c8b27a"); ctx.fillRect(bx - 0.5, by - 18, 1, 14); ctx.beginPath(); ctx.moveTo(bx - 7, by - 3); ctx.lineTo(bx + 7, by - 3); ctx.lineTo(bx, by - 11 - 2 * Math.sin(t)); ctx.closePath(); ctx.fill();
    } else if (kind === 5) { // une clé pendue à un clou
      ctx.fillStyle = c("#3a3d44"); ctx.fillRect(bx - 1, ny + 10, 2, 3); ctx.strokeStyle = c("#b8934a"); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(bx, ny + 21 + Math.sin(t * 0.9 + i) * 0.6, 5, 0, 6.283); ctx.stroke(); ctx.fillStyle = c("#b8934a"); ctx.fillRect(bx - 1, ny + 26, 2, 22); ctx.fillRect(bx, ny + 38, 6, 2); ctx.fillRect(bx, ny + 44, 4, 2);
    } else if (kind === 6) { // une fougère en pot
      ctx.fillStyle = c("#5a3a26"); ctx.beginPath(); ctx.moveTo(bx - 9, by); ctx.lineTo(bx + 9, by); ctx.lineTo(bx + 7, by - 12); ctx.lineTo(bx - 7, by - 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c("#4c6a3a"); ctx.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { const sw = Math.sin(t * 0.7 + k + i) * 1.2; ctx.beginPath(); ctx.moveTo(bx, by - 12); ctx.quadraticCurveTo(bx + k * 5 + sw, by - 34 + Math.abs(k) * 3, bx + k * 9 + sw, by - 30 + Math.abs(k) * 8); ctx.stroke(); }
    } else if (kind === 7) { // un encrier et sa plume
      ctx.fillStyle = c("#14202a"); ctx.beginPath(); ctx.ellipse(bx, by - 5, 9, 5, 0, 0, 6.283); ctx.fill(); ctx.fillRect(bx - 4, by - 14, 8, 8); ctx.strokeStyle = c("#e8dcc0"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx + 2, by - 14); ctx.lineTo(bx + 14, by - 38); ctx.stroke();
    } else { // un parchemin roulé et des feuilles qui traînent
      ctx.fillStyle = c("#d6c7a0"); ctx.fillRect(bx - 14, by - 9, 28, 8); ctx.fillStyle = c("#b8a672"); ctx.beginPath(); ctx.ellipse(bx - 14, by - 5, 2, 4, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(bx + 14, by - 5, 2, 4, 0, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(bx + 12, by - 1.5); ctx.rotate(0.3); ctx.fillStyle = c("#c9b98a"); ctx.fillRect(-7, -2, 14, 3); ctx.restore(); ctx.fillStyle = c("#7a5a3a"); ctx.fillRect(bx - 4, by - 10, 8, 1.5);
    }
  }
  shownN.forEach((grp, i) => {
    const [nx, ny] = spot(i);
    ctx.fillStyle = c("#0e0f12"); ctx.fillRect(nx - 3, ny - 3, NW + 6, NH + 6); ctx.fillStyle = c("#17181c"); ctx.fillRect(nx, ny, NW, NH); // la niche
    const sw = 11, x0 = nx + 4 + Math.floor((NW - 8 - grp.length * sw) / 2);
    grp.forEach((a, k) => { // un dos par livre, debout, tous différents de hauteur
      const hh = hash(a.path), bh = 46 + (hh % 28), bx = x0 + k * sw, by = ny + NH - 4 - bh;
      ctx.fillStyle = c(COLS[hh % COLS.length]); ctx.fillRect(bx, by, sw - 1, bh); ctx.fillStyle = c("#b8a878"); ctx.fillRect(bx, by + 5, sw - 1, 1.6); ctx.fillRect(bx, by + bh - 8, sw - 1, 1.6); ctx.fillStyle = rgba(0, 0, 0, 0.24); ctx.fillRect(bx + sw - 4, by, 3, bh);
      r.hot.push({ x: bx, y: by, w: sw - 1, h: bh, tip: a.name, go: "descbook", arg: a.path });
    });
    const first = grp[0].name, last = grp[grp.length - 1].name, abbr = (n) => (n.length > 7 ? n.slice(0, 6) + "…" : n), label = grp.length === 1 ? abbr(first) : `${abbr(first)} – ${abbr(last)}`;
    ctx.fillStyle = c("#3a3326"); ctx.fillRect(nx, ny + NH + 4, NW, 12); ctx.fillStyle = c("#e0d4b0"); ctx.font = "8px serif"; ctx.textAlign = "center";
    let lab = label; while (lab.length > 3 && ctx.measureText(lab).width > NW - 4) lab = lab.slice(0, -2); ctx.fillText(lab, nx + NW / 2, ny + NH + 13); ctx.textAlign = "left";
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
