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

/** Les livres couchés : le même dessin que partout (src/relto-spines.js). */
const flatBook = (ctx, c, x, y, w, h, body, band, title, fontPx) => require("./relto-spines").flatBook(ctx, c, x, y, w, h, body, title, fontPx);
const pile = (ctx, c, x, y, books, fontPx) => require("./relto-spines").pile(ctx, c, x, y, books, fontPx);

function drawVault(r, ctx, sc, sky, t) {
  const amb = 0.55 + 0.45 * sky.ambient, c = (h) => mix("#05060c", h, amb), tr = TR(r), q = rng(0x70a1), fl = 0.85 + 0.15 * Math.sin(t * 6.1) * Math.sin(t * 2.7);
  const castle = !!(r.castleOn && r.castleOn()), glass = !!(r.glassOn && r.glassOn()), CS = require("./relto-castle"), VR = require("./relto-glass");
  if (castle) { // le Château : une crypte. Pierre appareillée, voûte d'ogives, dallage, et la chandelle pour lumière
    CS.ashlar(ctx, c, 0, 0, W, FLOOR, "#4a4552", 22, 0x70a1);
    ctx.fillStyle = c("#1c1a22"); ctx.fillRect(0, 0, W, 14); ctx.strokeStyle = c("#4a4552"); ctx.lineWidth = 2; for (let x = 40; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x - 40, 14); ctx.quadraticCurveTo(x, -2, x + 40, 14); ctx.stroke(); } // le départ des voûtes, à peine vu
    ctx.fillStyle = c("#7a7683"); ctx.fillRect(0, 13, W, 4); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(0, 17, W, 1.4); // la corniche : le mur commence dessous, les niches y tiennent tout entières
    for (const x of [8, W - 8]) { ctx.fillStyle = c("#5e5966"); ctx.fillRect(x - 6, 17, 12, FLOOR - 17); ctx.fillStyle = c("#7a7683"); ctx.fillRect(x - 8, 17, 16, 4); ctx.fillRect(x - 8, FLOOR - 8, 16, 8); } // deux colonnes engagées
    const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#3e3a46")); fg.addColorStop(1, c("#1a1820")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.strokeStyle = rgba(0, 0, 0, 0.35); ctx.lineWidth = 1; for (const y of [FLOOR + 14, FLOOR + 34, FLOOR + 62]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } for (let k = -8; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(W / 2 + k * 40, FLOOR); ctx.lineTo(W / 2 + k * 70, H); ctx.stroke(); } // le dallage
    ctx.fillStyle = c("#15131a"); ctx.fillRect(0, FLOOR - 4, W, 6);
  } else if (glass) { // la Verrière : une salle de mosaïque sombre sous une verrière de cuivre, à la lueur d'une lampe de verre au plomb
    const wg = ctx.createLinearGradient(0, 0, 0, FLOOR); wg.addColorStop(0, c("#16302c")); wg.addColorStop(1, c("#0e1c1a")); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, FLOOR);
    for (let y = 20; y < FLOOR; y += 9) for (let x = ((y / 9) % 2) * 4.5; x < W; x += 9) { ctx.fillStyle = rgba(q() < 0.5 ? 90 : 40, 160, 140, 0.05 + q() * 0.06); ctx.fillRect(x, y, 8, 8); } // les tesselles
    ctx.strokeStyle = rgba(200, 170, 90, 0.12); ctx.lineWidth = 0.9; ctx.lineCap = "round"; for (const x of [140, 320, 500]) VR.motif(ctx, ["iris", "lily", "tulip"][(x / 180) | 0], x, 200, FLOOR - 6, 0.6); ctx.lineCap = "butt"; // des fleurs au trait dans la mosaïque
    ctx.fillStyle = c("#1a120c"); ctx.fillRect(0, 0, W, 16); ctx.fillStyle = c(VR.COPPER); ctx.fillRect(0, 14, W, 3); ctx.fillStyle = c(VR.COPPER_HI); ctx.fillRect(0, 14, W, 0.8); // la corniche de cuivre : le mur commence dessous
    VR.roundGrille(ctx, c, 320, 46, 26, 4); // un œil-de-bœuf grillagé au-dessus du lutrin : du noir derrière, du fer devant (c'est une chambre forte)
    VR.darkMosaic(ctx, c, FLOOR, W, H); ctx.fillStyle = c(VR.COPPER_LO); ctx.fillRect(0, FLOOR - 4, W, 5);
  } else {
  ctx.fillStyle = c("#2a2c30"); ctx.fillRect(0, 0, W, FLOOR);
  for (let y = 0; y < FLOOR; y += 22) for (let x = -((y / 22) % 2) * 20; x < W; x += 40) { ctx.fillStyle = rgba(q() < 0.5 ? 255 : 0, 255, 255, 0.02 + q() * 0.03); ctx.fillRect(x, y, 40, 22); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x, y, 40, 1.2); ctx.fillRect(x, y, 1.2, 22); }
  ctx.fillStyle = c("#1d1e22"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 26); ctx.quadraticCurveTo(W / 2, 62, 0, 26); ctx.closePath(); ctx.fill(); // la voûte
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, c("#34353a")); fg.addColorStop(1, c("#1c1d21")); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = c("#15161a"); ctx.fillRect(0, FLOOR - 4, W, 6);
  }
  /** Le numéro de la niche, en chiffres D'ni : sur le tympan de cuivre (Verrière), gravé dans la clef de l'arc (Château), sur une petite plaque (ailleurs). */
  const niNum = (nx, ny, v) => {
    if (!r.dni || !r.dni.drawNumber) return;
    const s2 = 10.5, w = r.dni.widthOf(v, s2), cx = nx + NW / 2, y = glass ? ny - 11 : castle ? ny - 15 : ny - 13;
    if (!glass && !castle) { ctx.fillStyle = c("#6a5232"); ctx.fillRect(cx - w / 2 - 3, y - 1.5, w + 6, s2 + 3); ctx.fillStyle = c("#2a2014"); ctx.fillRect(cx - w / 2 - 2, y - 0.5, w + 4, s2 + 1); }
    r.dni.drawNumber(ctx, v, cx - w / 2 + 0.6, y + 0.6, s2, glass ? rgba(255, 220, 170, 0.45) : rgba(0, 0, 0, 0.5)); r.dni.drawNumber(ctx, v, cx - w / 2, y, s2, glass ? c("#2a0c02") : castle ? c("#c8c3d2") : c("#e0c080")); /* gravé : un liseré de lumière, puis le trait */
  };
  const frame = (nx, ny) => { // l'encadrement de chaque niche : un arc brisé de pierre (Château), un arc de cuivre et une lunette de verre (Verrière)
    const low = ny > 100, base = low ? FLOOR : ny + NH + 3; // le rang du bas : l'encadrement descend jusqu'au sol, sur un socle ; celui du haut s'arrête sur un appui
    if (castle) { ctx.fillStyle = c("#7a7683"); CS.pointed(ctx, nx - 6, nx + NW + 6, ny - 22, ny + 4, base); ctx.closePath(); ctx.fill(); ctx.fillStyle = c("#2a2630"); CS.pointed(ctx, nx - 1, nx + NW + 1, ny - 16, ny + 6, ny + NH); ctx.closePath(); ctx.fill(); ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.arc(nx + NW / 2, ny - 24, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = c("#9a95a3"); ctx.fillRect(nx - 8, ny + NH + 1, NW + 16, 3); ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(nx - 8, ny + NH + 4, NW + 16, 1.2); // l'appui mouluré
      if (low) { ctx.fillStyle = c("#5e5966"); ctx.fillRect(nx - 8, FLOOR - 10, NW + 16, 10); ctx.fillStyle = c("#9a95a3"); ctx.fillRect(nx - 8, FLOOR - 10, NW + 16, 1.4); } } // le socle
    else if (glass) { ctx.fillStyle = c(VR.COPPER_LO); ctx.beginPath(); ctx.moveTo(nx - 5, base); ctx.lineTo(nx - 5, ny); ctx.ellipse(nx + NW / 2, ny, NW / 2 + 5, 16, 0, Math.PI, 2 * Math.PI); ctx.lineTo(nx + NW + 5, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c(VR.COPPER); ctx.fillRect(nx - 7, ny + NH + 1, NW + 14, 2.4); if (low) { ctx.fillStyle = c("#2a1a12"); ctx.fillRect(nx - 7, FLOOR - 9, NW + 14, 9); ctx.fillStyle = c(VR.COPPER); ctx.fillRect(nx - 7, FLOOR - 9, NW + 14, 1.2); } // l'appui de cuivre ; le socle
      { const tg = ctx.createLinearGradient(0, ny - 13, 0, ny); tg.addColorStop(0, c("#c67a3e")); tg.addColorStop(1, c("#6a3818")); ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(nx + NW / 2, ny - 1, NW / 2 - 2, 12, 0, Math.PI, 2 * Math.PI); ctx.fill(); /* le tympan : une plaque de cuivre, où se lit le numéro de la niche */
        ctx.strokeStyle = rgba(255, 220, 170, 0.35); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(nx + NW / 2, ny - 1, NW / 2 - 5, 9.5, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); }
      ctx.strokeStyle = c(VR.COPPER_HI); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(nx + NW / 2, ny, NW / 2 + 3, 14, 0, Math.PI, 2 * Math.PI); ctx.stroke(); }
  };
  for (let i = 0; i < PER; i++) { const nx = (i % 6 < 3 ? 28 : 392) + (i % 3) * 80, ny = 44 + (i < 6 ? 0 : 108); frame(nx, ny); niNum(nx, ny, (r.vaultPage || 0) * PER + i + 1); } // les encadrements d'abord : ceux du bas ne recouvrent pas les écriteaux du haut
  // une niche garde plusieurs livres (cinq au plus), rangés par ordre alphabétique ; son écriteau dit d'où à où elle va
  const list = ((r.opts.vaultAges ? r.opts.vaultAges() : []) || []).slice().sort((x, y) => String(x.name).localeCompare(String(y.name))), niches = [];
  for (let i = 0; i < list.length; i += PER_NICHE) niches.push(list.slice(i, i + PER_NICHE));
  const pages = Math.max(1, Math.ceil(niches.length / PER)); r.vaultPage = Math.min(Math.max(0, r.vaultPage || 0), pages - 1);
  const spot = (i) => { const side = i % 6 < 3 ? 0 : 1, col = i % 3, row = i < 6 ? 0 : 1; return [side ? 392 + col * 80 : 28 + col * 80, 44 + row * 108]; }; // trois colonnes à gauche, trois à droite, deux rangées
  const shownN = niches.slice(r.vaultPage * PER, r.vaultPage * PER + PER);
  const SK = (r.opts.stoneState && r.opts.stoneState()) || {}, caged = SK.ending === "command" && r.vaultPage === pages - 1, cageAt = PER - 1; /* le commandement : la dernière niche de la dernière page garde la vitrine */
  for (let i = shownN.length; i < PER; i++) { // les niches vides ne le restent pas tout à fait : une bougie, une araignée sur sa toile, un vase de fleurs sèches
    const [nx, ny] = spot(i); ctx.fillStyle = c("#0e0f12"); ctx.fillRect(nx - 3, ny - 3, NW + 6, NH + 6); ctx.fillStyle = c("#17181c"); ctx.fillRect(nx, ny, NW, NH);
    const kind = (i * 5 + r.vaultPage * 7) % 9, bx = nx + NW / 2, by = ny + NH - 4, flip = (i + r.vaultPage) % 2 ? 1 : -1;
    if (caged && i === cageAt) { require("./relto-scarabs").vitrine(ctx, c, nx + 6, by - 42, NW - 12, 42, t); r.hot.push({ x: nx, y: ny, w: NW, h: NH, tip: TR(r)("scarab.case") }); continue; } /* le commandement : la vitrine, parmi les curiosités */
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
      require("./relto-spines").spine(ctx, c, bx, by, sw - 1, bh, COLS[hh % COLS.length], { ornate: true, key: a.path }); /* un Livre descriptif : la même reliure, plus ornée (coiffes, fleuron, filet) */
      r.hot.push({ x: bx, y: by, w: sw - 1, h: bh, tip: a.name, go: "descbook", arg: a.path });
    });
    const first = grp[0].name, last = grp[grp.length - 1].name, abbr = (n) => (n.length > 7 ? n.slice(0, 6) + "…" : n), label = grp.length === 1 ? abbr(first) : `${abbr(first)} – ${abbr(last)}`;
    void label; /* plus de nom écrit sous la niche (il cassait l'ambiance) : chaque livre le dit dans son infobulle */
  });
  if (!list.length) { ctx.fillStyle = rgba(230, 220, 190, 0.5); ctx.font = "italic 13px serif"; ctx.textAlign = "center"; ctx.fillText(tr("vault.empty"), W / 2, 88); ctx.textAlign = "left"; }
  // le pupitre central et le livre vierge
  const px = 288, pw = 64;
  ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(px - 6, FLOOR - 2, pw + 12, 8);
  ctx.fillStyle = c(castle ? CS.WALNUT_LO : glass ? "#3a2a1a" : "#4b3a28"); ctx.fillRect(px + 8, 176, pw - 16, FLOOR - 176); ctx.fillStyle = c(castle ? CS.WALNUT : glass ? "#5a3e24" : "#6a4f33"); ctx.fillRect(px, 168, pw, 12);
  if (castle) { ctx.fillStyle = c(CS.GOLD); ctx.fillRect(px, 179, pw, 1.2); ctx.fillRect(px + 8, FLOOR - 12, pw - 16, 1.2); CS.lys(ctx, px + pw / 2, 206, 4, false); for (const x of [px - 26, px + pw + 26]) { CS.candlestand(ctx, c, x, 150, FLOOR, true, fl, 1); CS.candleGlow(ctx, x, 140, 60, fl, 0.6); } } // le Château : un lutrin de noyer filet d'or, deux chandeliers de fer
  if (glass) { for (const [lx, d] of [[262, 1], [384, -1]]) { ctx.save(); ctx.translate(lx, FLOOR); ctx.scale(1.4, 1.4); ctx.translate(-lx, -FLOOR); VR.guimardLamp(ctx, c, lx, FLOOR, 166, d); ctx.restore(); } } /* deux lampadaires à la Guimard, de part et d'autre du lutrin : des boutons de verre rouge */
  if (glass) { VR.copperEdge(ctx, c, px, 168, pw, 3); VR.cornerVines(ctx, c, px + 10, 184, pw - 20, FLOOR - 196); } /* plus de lampe de verre au plomb sur le pupitre : les deux lampadaires l'éclairent */ // la Verrière : un pupitre aux rinceaux de cuivre, une lampe de verre au plomb
  ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(px + 6, 154, 25, 15); ctx.fillStyle = c("#eadfc0"); ctx.fillRect(px + 33, 154, 25, 15); ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(px + 30, 152, 4, 18);
  ctx.fillStyle = rgba(255, 200, 110, 0.07 * fl); ctx.beginPath(); ctx.arc(px + pw / 2, 150, 70, 0, 6.283); ctx.fill();
  r.hot.push({ x: px - 4, y: 146, w: pw + 8, h: 36, tip: tr("agebook.tip"), go: "descbook" });
  if (castle) { // le Château : un sarcophage de pierre sur deux tréteaux, le couvercle entrouvert, un filet de lumière rouge
    const cx0 = 412, cw = 184, cy0 = 290, ch = 34, glow = 0.5 + 0.3 * Math.sin(t * 0.9);
    ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.beginPath(); ctx.ellipse(cx0 + cw / 2, cy0 + ch + 20, cw * 0.6, 7, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = c("#3a3542"); for (const x of [cx0 + 18, cx0 + cw - 18]) { ctx.beginPath(); ctx.moveTo(x - 10, cy0 + ch + 20); ctx.lineTo(x, cy0 + ch - 2); ctx.lineTo(x + 10, cy0 + ch + 20); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 16, cy0 + ch + 20); ctx.lineTo(x - 6, cy0 + ch - 2); ctx.lineTo(x + 6, cy0 + ch - 2); ctx.lineTo(x + 16, cy0 + ch + 20); ctx.closePath(); ctx.fill(); } // les tréteaux
    const g = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); g.addColorStop(0, c("#6e6876")); g.addColorStop(1, c("#3a3542")); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx0 + 6, cy0); ctx.lineTo(cx0 + cw - 2, cy0); ctx.lineTo(cx0 + cw + 2, cy0 + ch); ctx.lineTo(cx0 - 2, cy0 + ch); ctx.closePath(); ctx.fill(); // la cuve, légèrement trapézoïdale
    ctx.fillStyle = rgba(0, 0, 0, 0.28); ctx.fillRect(cx0 + 2, cy0 + ch - 4, cw - 2, 4); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.8; ctx.strokeRect(cx0 + 10, cy0 + 6, cw - 20, ch - 12); CS.lys(ctx, cx0 + cw / 2, cy0 + ch / 2, 3, false); // un filet d'or, un lys
    ctx.fillStyle = rgba(255, 60, 50, 0.55 * glow); ctx.fillRect(cx0 + 4, cy0 - 3.5, cw - 6, 3.5); const rg = ctx.createRadialGradient(cx0 + cw / 2, cy0 - 2, 2, cx0 + cw / 2, cy0 - 2, 70); rg.addColorStop(0, rgba(255, 60, 50, 0.18 * glow)); rg.addColorStop(1, rgba(255, 60, 50, 0)); ctx.fillStyle = rg; ctx.fillRect(cx0 - 60, cy0 - 60, cw + 120, 80); // le jour rouge, sous le couvercle entrouvert
    const lg = ctx.createLinearGradient(0, cy0 - 12, 0, cy0 - 3); lg.addColorStop(0, c("#8a8591")); lg.addColorStop(1, c("#5e5966")); ctx.fillStyle = lg; ctx.save(); ctx.translate(cx0 + cw / 2, cy0 - 3.5); ctx.rotate(-0.035); ctx.beginPath(); ctx.moveTo(-cw / 2 - 2, 0); ctx.lineTo(-cw / 2 + 10, -9); ctx.lineTo(cw / 2 - 6, -9); ctx.lineTo(cw / 2 + 6, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-cw / 2 + 14, -4.5); ctx.lineTo(cw / 2 - 10, -4.5); ctx.stroke(); ctx.fillStyle = c(CS.GOLD); ctx.beginPath(); ctx.moveTo(0, -8.5); ctx.lineTo(0, -1); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.strokeStyle = c(CS.GOLD); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); // le couvercle, un peu de guingois, une croix
    r.hot.push({ x: cx0 - 4, y: cy0 - 14, w: cw + 8, h: ch + 36, tip: tr("vault.coffin.tip"), flash: tr("vault.coffin.flash"), sfx: "coffin", extra: true });
  }
  if (pages > 1) { // les pages du coffre : douze livres à la fois
    ctx.fillStyle = rgba(230, 220, 190, 0.8); ctx.font = "11px serif"; ctx.textAlign = "center"; ctx.fillText(`${r.vaultPage + 1} / ${pages}`, W / 2, 330); ctx.textAlign = "left";
    r.hot.push({ x: W / 2 - 54, y: 316, w: 30, h: 20, tip: "◀", vpage: -1 }); r.hot.push({ x: W / 2 + 24, y: 316, w: 30, h: 20, tip: "▶", vpage: 1 });
    ctx.fillStyle = "#c9a24e"; ctx.font = "14px serif"; ctx.fillText("◀", W / 2 - 46, 331); ctx.fillText("▶", W / 2 + 32, 331);
  }
  require("./relto-cave").vaultCrack(r, ctx, c, castle, t); /* la faille (l'escalier de la crypte au Château) : vers la caverne */
  require("./relto-atelier").backButton(r, ctx, tr("vault.back"), r.vaultFrom || "cabin");
}

module.exports = { drawVault, trapDoor, flatBook, pile };
