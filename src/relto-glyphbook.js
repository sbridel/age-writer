"use strict";
// Le livre des glyphes, un vrai livre : une vue du Relto (sur le canevas), des pages qu'on tourne, les glyphes groupés par type, puis les réactions
// qu'on a vues. En histoire, les glyphes pas encore appris se devinent en pâle (comme dans la palette du livre). Rien n'est dessiné hors du canevas : les glyphes
// sont les mêmes que partout, rasterisés une fois (SVG → image) dans le renderer.
const { clamp, mix, rgba } = require("./util");

const W = 640, H = 360, LX = 62, RX = 320, PW = 258, PT = 40, PH = 276, TURN_MS = 520;
const COLS = 4, ROWS = 3, CW = 58, CH = 64, PER_PAGE = COLS * ROWS, ROWS_REACT = 7;
const INK = "#3a2d1a", FAINT = "#8a7650";

/** Les pages du livre, à partir des Âges du refuge (pur : `deps` donne le moteur et les accroches de l'histoire, pour les tests). */
function buildPages(ages, deps) {
  const { groups, hooks, hashOf, ghostText, unscore } = deps, used = new Map(), reacts = new Map();
  for (const a of ages || []) {
    for (const id of a.glyphs || []) { if (!used.has(id)) used.set(id, []); used.get(id).push(a); }
    for (const x of a.reactions || []) { const key = (x.a || "") + "+" + (x.b || "") + "=" + (x.shown || ""); if (x.shown && !reacts.has(key)) reacts.set(key, x); }
  }
  const path = (ages || []).map((a) => a.path).find((p) => hooks.known(p)), known = path ? hooks.known(path) : null, per = path ? hooks.ghosts(path) : 0;
  const sections = [];
  for (const g of groups) {
    const cells = [], seen = [], rest = [];
    for (const it of g.items) { if (used.has(it.id)) cells.push({ id: it.id, name: it.label, state: "used", ages: used.get(it.id) }); else if (!known || known.has(it.id)) seen.push({ id: it.id, name: it.label, state: "known" }); else rest.push(it); } // hors de l'histoire, tout glyphe est connu : ceux pas encore écrits se montrent en pâle, avec leur nom
    const hidden = rest.sort((x, y) => hashOf(x.id) - hashOf(y.id)), n = Math.min(per, hidden.length);
    const ghosts = hidden.slice(0, n).map((it) => ({ id: it.id, state: "ghost", hint: ghostText(hooks, it.id) }));
    const all = [...cells, ...seen, ...ghosts];
    if (all.length) sections.push({ axis: g.axis, label: g.label, cells: all, more: hidden.length - n });
  }
  const pages = [{ kind: "toc" }];
  for (const s of sections) {
    const nP = Math.max(1, Math.ceil(s.cells.length / PER_PAGE));
    for (let i = 0; i < nP; i++) pages.push({ kind: "glyphs", axis: s.axis, title: s.label, part: nP > 1 ? `${i + 1}/${nP}` : "", cells: s.cells.slice(i * PER_PAGE, (i + 1) * PER_PAGE), more: i === nP - 1 ? s.more : 0, section: s.label, first: i === 0 });
  }
  const list = [...reacts.values()].map((x) => ({ a: x.a, b: x.b, r: x.shown, type: x.type, catalyzed: !!x.catalyzed, name: unscore(String(x.shown)) }));
  for (let i = 0; i < list.length; i += ROWS_REACT) pages.push({ kind: "react", rows: list.slice(i, i + ROWS_REACT), first: i === 0 });
  const toc = sections.map((s) => ({ label: s.label, page: pages.findIndex((p) => p.section === s.label), n: s.cells.filter((c) => c.state === "used").length }));
  if (list.length) toc.push({ label: null, page: pages.findIndex((p) => p.kind === "react"), n: list.length, react: true });
  pages[0].toc = toc; pages[0].written = used.size; pages[0].reactions = list.length;
  return pages;
}

/** L'image d'un glyphe (SVG → Image, une fois, dans la couleur demandée) ; `null` tant qu'elle n'est pas prête. */
function glyphImg(r, id, col) {
  if (typeof Image === "undefined" || !r.opts.glyphSvg) return null;
  const cache = r._gimg || (r._gimg = new Map()), key = id + "|" + col; let e = cache.get(key);
  if (!e) {
    e = { img: null, ok: false }; cache.set(key, e);
    try {
      const inner = String(r.opts.glyphSvg(id)).replace(/currentColor/g, col), img = new Image();
      img.onload = () => { e.ok = true; if (!r.running && (r.view === "glyphbook" || r.view === "agebook")) r.draw(0); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${inner}</svg>`);
      e.img = img;
    } catch (err) { e.img = null; }
  }
  return e.ok ? e.img : null;
}

function drawGlyph(r, ctx, id, x, y, s, col, alpha) {
  const img = glyphImg(r, id, col); ctx.save(); ctx.globalAlpha = alpha;
  if (img) ctx.drawImage(img, x, y, s, s); else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6); }
  ctx.restore();
}

/** Une page : le papier, puis son contenu. `live` : on pousse aussi les zones cliquables (pas pendant qu'une page se tourne). */
function drawPage(r, ctx, pg, side, c, live, tr, BV) {
  const x0 = side ? RX : LX, left = !side;
  ctx.fillStyle = c(left ? "#e6d9b8" : "#eadfc0"); ctx.fillRect(x0, PT, PW, PH);
  const sp = ctx.createLinearGradient(left ? RX - 30 : RX, 0, left ? RX : RX + 30, 0); sp.addColorStop(0, left ? "rgba(60,40,20,0)" : "rgba(60,40,20,0.35)"); sp.addColorStop(1, left ? "rgba(60,40,20,0.35)" : "rgba(60,40,20,0)"); ctx.fillStyle = sp; ctx.fillRect(left ? RX - 30 : RX, PT, 30, PH);
  if (!pg) return;
  ctx.textAlign = "center"; const cx = x0 + PW / 2, ink = c(INK), faint = c(FAINT);
  const title = (txt, sub) => { ctx.fillStyle = ink; ctx.font = "italic 13px serif"; ctx.fillText(txt, cx, PT + 26); if (sub) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(sub, cx, PT + 38); } ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + 38, PT + 44); ctx.lineTo(x0 + PW - 38, PT + 44); ctx.stroke(); };
  if (pg.kind === "toc") {
    title(tr("glyphbook.title"), tr("glyphbook.count", { n: pg.written, m: pg.reactions }));
    if (!pg.toc.length) { ctx.fillStyle = faint; ctx.font = "italic 11px serif"; ctx.fillText(tr("glyphbook.blank1"), cx, PT + 120); ctx.fillText(tr("glyphbook.blank2"), cx, PT + 138); }
    pg.toc.forEach((e, i) => {
      const y = PT + 70 + i * 22, label = e.react ? tr("glyphbook.react") : e.label;
      ctx.textAlign = "left"; ctx.fillStyle = ink; ctx.font = "12px serif"; ctx.fillText(label, x0 + 30, y);
      ctx.textAlign = "right"; ctx.fillStyle = faint; ctx.font = "italic 11px serif"; ctx.fillText(`${e.n} · p. ${e.page + 1}`, x0 + PW - 30, y);
      ctx.strokeStyle = rgba(74, 53, 32, 0.15); ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(x0 + 34 + ctx.measureText(label).width * 0.0, y + 3); ctx.lineTo(x0 + PW - 30, y + 3); ctx.stroke(); ctx.setLineDash([]);
      if (live) r.hot.push({ x: x0 + 24, y: y - 13, w: PW - 48, h: 20, tip: label, gbGo: e.page });
    });
  } else if (pg.kind === "glyphs") {
    title(pg.title, pg.part);
    pg.cells.forEach((cell, i) => {
      const col = i % COLS, row = Math.floor(i / COLS), x = x0 + (PW - COLS * CW) / 2 + col * CW, y = PT + 54 + row * CH, gx = x + (CW - 38) / 2;
      if (cell.state === "used") {
        ctx.fillStyle = "rgba(255,244,214,0.45)"; ctx.fillRect(x + 2, y, CW - 4, CH - 4); ctx.strokeStyle = rgba(160, 110, 40, 0.5); ctx.lineWidth = 0.9; ctx.strokeRect(x + 2.5, y + 0.5, CW - 5, CH - 5);
        drawGlyph(r, ctx, cell.id, gx, y + 4, 38, ink, 1);
        ctx.fillStyle = ink; ctx.font = "8.5px serif"; let nm = cell.name; while (nm.length > 3 && ctx.measureText(nm).width > CW - 6) nm = nm.slice(0, -2) + "…"; ctx.fillText(nm, x + CW / 2, y + CH - 12);
        ctx.fillStyle = BV.AXIS_COLORS[pg.axis] || "#888"; ctx.fillRect(x + 8, y + CH - 8, CW - 16, 2);
        const names = cell.ages.slice(0, 3).map((a) => a.name).join(", ") + (cell.ages.length > 3 ? "…" : "");
        if (live) r.hot.push({ x: x + 2, y, w: CW - 4, h: CH - 4, tip: `${cell.name} — ${tr("glyphbook.ages", { n: cell.ages.length })} ${names}`, age: cell.ages[0], book: true });
      } else if (cell.state === "known") {
        ctx.strokeStyle = rgba(90, 70, 40, 0.3); ctx.lineWidth = 0.8; ctx.strokeRect(x + 2.5, y + 0.5, CW - 5, CH - 5);
        drawGlyph(r, ctx, cell.id, gx, y + 4, 38, faint, 0.55);
        ctx.fillStyle = faint; ctx.font = "8.5px serif"; let nm = cell.name; while (nm.length > 3 && ctx.measureText(nm).width > CW - 6) nm = nm.slice(0, -2) + "…"; ctx.fillText(nm, x + CW / 2, y + CH - 12);
        if (live) r.hot.push({ x: x + 2, y, w: CW - 4, h: CH - 4, tip: `${cell.name} — ${tr("glyphbook.unwritten")}` });
      } else { // pas encore appris : une silhouette pâle, sans nom
        try { ctx.filter = "blur(1px) grayscale(1)"; } catch (e) { /* pas de filtre */ }
        drawGlyph(r, ctx, cell.id, gx, y + 4, 38, faint, 0.28); try { ctx.filter = "none"; } catch (e) { /* pas de filtre */ }
        if (live) r.hot.push({ x: x + 2, y, w: CW - 4, h: CH - 4, tip: cell.hint });
      }
    });
    if (pg.more > 0) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(tr("glyphbook.more", { n: pg.more }), cx, PT + PH - 34); }
  } else if (pg.kind === "react") {
    title(tr("glyphbook.react"), pg.first ? tr("glyphbook.react.sub") : "");
    pg.rows.forEach((row, i) => {
      const y = PT + 56 + i * 30;
      drawGlyph(r, ctx, row.a, x0 + 18, y, 24, ink, 1); ctx.fillStyle = faint; ctx.font = "13px serif"; ctx.textAlign = "left"; ctx.fillText("+", x0 + 46, y + 17);
      drawGlyph(r, ctx, row.b, x0 + 58, y, 24, ink, 1); ctx.fillText("→", x0 + 88, y + 17); drawGlyph(r, ctx, row.r, x0 + 106, y, 24, ink, 1);
      ctx.fillStyle = ink; ctx.font = "italic 10px serif"; ctx.fillText(row.name, x0 + 138, y + 12); ctx.fillStyle = faint; ctx.font = "italic 8.5px serif"; ctx.fillText((row.type || "") + (row.catalyzed ? " · " + tr("glyphbook.catalyzed") : ""), x0 + 138, y + 24);
      if (live) r.hot.push({ x: x0 + 14, y: y - 2, w: PW - 28, h: 28, tip: `${String(row.a).replace(/_/g, " ")} + ${String(row.b).replace(/_/g, " ")} → ${row.name}` });
    });
  }
  ctx.textAlign = "left";
}

/** Un livre ouvert sur la table, à la chandelle ; ‹ › tournent les pages, le sommaire renvoie aux sections, la flèche ronde ferme le livre. */
function drawGlyphBook(r, ctx, sc, sky, t) {
  const BV = require("./engine/book-view"), hooks = require("./engine/hooks").hooks, tr = r.imagerTr ? r.imagerTr() : (k) => k;
  const amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb), st = r.gbook || (r.gbook = { spread: 0, anim: null });
  if (!r._gbData || r._gbData.sc !== sc) r._gbData = { sc, pages: buildPages(sc.ages || [], { groups: BV.paletteGroups().map((g) => { const k = "glyphbook.axis." + g.axis, v = tr(k); return { ...g, label: v && v !== k ? v : g.label }; }), hooks, hashOf: BV.hashOf, ghostText: BV.ghostText, unscore: BV.unscore }) };
  const pages = r._gbData.pages, nS = Math.max(1, Math.ceil(pages.length / 2)); st.spread = clamp(st.spread, 0, nS - 1);
  // la table, dans la pénombre ; le livre : couverture de cuir sarcelle, deux pages
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(52, 36, 548, 296); ctx.fillStyle = c("#1f4448"); ctx.fillRect(48, 30, 548, 296); ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1.2; ctx.strokeRect(53.5, 35.5, 537, 285);
  const now = Date.now(); let an = st.anim; if (an && now - an.at > TURN_MS) an = st.anim = null;
  const pair = (s) => [pages[2 * s], pages[2 * s + 1]];
  const squash = (pg, side, sx) => { if (sx <= 0.02) return; ctx.save(); ctx.translate(RX, 0); ctx.scale(sx, 1); ctx.translate(-RX, 0); drawPage(r, ctx, pg, side, c, false, tr, BV); ctx.fillStyle = rgba(30, 18, 6, 0.32 * (1 - sx)); ctx.fillRect(side ? RX : LX, PT, PW, PH); ctx.restore(); };
  if (!an) { const [a, b] = pair(st.spread); drawPage(r, ctx, a, 0, c, true, tr, BV); drawPage(r, ctx, b, 1, c, true, tr, BV); }
  else {
    const p = (now - an.at) / TURN_MS, f = pair(an.from), n = pair(st.spread), fwd = an.dir > 0;
    drawPage(r, ctx, fwd ? f[0] : n[0], 0, c, false, tr, BV); drawPage(r, ctx, fwd ? n[1] : f[1], 1, c, false, tr, BV);
    if (p < 0.5) squash(fwd ? f[1] : f[0], fwd ? 1 : 0, 1 - 2 * p); else squash(fwd ? n[0] : n[1], fwd ? 0 : 1, 2 * p - 1);
  }
  // les repères : numéros de page, flèches
  ctx.fillStyle = rgba(74, 53, 32, 0.8); ctx.font = "italic 10px serif"; ctx.textAlign = "center";
  if (pages[2 * st.spread]) ctx.fillText(String(2 * st.spread + 1), LX + PW / 2, PT + PH - 8);
  if (pages[2 * st.spread + 1]) ctx.fillText(String(2 * st.spread + 2), RX + PW / 2, PT + PH - 8);
  ctx.font = "26px serif"; ctx.fillStyle = rgba(74, 53, 32, 0.85);
  if (!an) {
    if (st.spread > 0) { ctx.fillText("‹", LX + 18, PT + PH - 24); r.hot.push({ x: LX + 4, y: PT + PH - 46, w: 30, h: 30, tip: tr("glyphbook.prev"), gbTurn: -1 }); }
    if (st.spread < nS - 1) { ctx.fillText("›", RX + PW - 18, PT + PH - 24); r.hot.push({ x: RX + PW - 34, y: PT + PH - 46, w: 30, h: 30, tip: tr("glyphbook.next"), gbTurn: 1 }); }
  }
  ctx.textAlign = "left";
  require("./relto-atelier").backButton(r, ctx, tr("glyphbook.close"), r.bookFrom || "cabin");
  const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1), g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 420); g.addColorStop(0, rgba(255, 190, 90, 0.07 * fl)); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  r.gbookN = nS;
}

module.exports = { drawGlyphBook, drawGlyph, buildPages, PER_PAGE, TURN_MS };
