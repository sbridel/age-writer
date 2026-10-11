"use strict";
// Le livre de la bibliothèque, un vrai livre sur le canevas : le sommaire, les entrées de la bibliothèque des Âges puis de celle du Relto (une page
// chacune, ou plus), et à la fin de chaque partie une page blanche où l'on écrit une nouvelle entrée sans ouvrir la note. Le champ de saisie est
// le seul élément HTML (posé par-dessus le canevas, à la place de la page).
const { clamp, mix, rgba } = require("./util");

const W = 640, H = 360, LX = 62, RX = 320, PW = 258, PT = 40, PH = 276, TURN_MS = 520, ROWS = 8, ROW_H = 28;
const INK = "#3a2d1a", FAINT = "#8a7650";
const KINDS = ["ages", "relto"];

/** Les pages : sommaire, puis pour chaque genre ses entrées et sa page d'écriture. `data[kind]` : [{text,file}]. */
function buildPages(data) {
  const pages = [{ kind: "toc" }], toc = [];
  for (const k of KINDS) {
    const list = (data && data[k]) || [], first = pages.length, nP = Math.max(1, Math.ceil(list.length / ROWS));
    for (let i = 0; i < nP; i++) pages.push({ kind: "entries", lib: k, rows: list.slice(i * ROWS, (i + 1) * ROWS), part: nP > 1 ? `${i + 1}/${nP}` : "", empty: !list.length });
    toc.push({ lib: k, page: first, n: list.length, write: pages.length });
    pages.push({ kind: "write", lib: k });
  }
  pages[0].toc = toc;
  return pages;
}

/** Une ligne d'entrée → { head, tail } (« page lagon: Lagoon | … » : la tête avant le premier « | », la queue après). */
function splitEntry(text) { const i = text.indexOf("|"); return i < 0 ? { head: text, tail: "" } : { head: text.slice(0, i).trim(), tail: text.slice(i + 1).trim() }; }

function fit(ctx, txt, max) { let s = String(txt); if (ctx.measureText(s).width <= max) return s; while (s.length > 3 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1); return s + "…"; }

function drawPage(r, ctx, pg, side, c, live, tr, ui) {
  const x0 = side ? RX : LX, left = !side;
  ctx.fillStyle = c(left ? "#e6d9b8" : "#eadfc0"); ctx.fillRect(x0, PT, PW, PH);
  const sp = ctx.createLinearGradient(left ? RX - 30 : RX, 0, left ? RX : RX + 30, 0); sp.addColorStop(0, left ? "rgba(60,40,20,0)" : "rgba(60,40,20,0.35)"); sp.addColorStop(1, left ? "rgba(60,40,20,0.35)" : "rgba(60,40,20,0)"); ctx.fillStyle = sp; ctx.fillRect(left ? RX - 30 : RX, PT, 30, PH);
  if (!pg) return;
  ctx.textAlign = "center"; const cx = x0 + PW / 2, ink = c(INK), faint = c(FAINT);
  const title = (txt, sub) => { ctx.fillStyle = ink; ctx.font = "italic 13px serif"; ctx.fillText(txt, cx, PT + 26); if (sub) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(sub, cx, PT + 38); } ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + 38, PT + 44); ctx.lineTo(x0 + PW - 38, PT + 44); ctx.stroke(); };
  if (pg.kind === "toc") {
    title(tr("libbook.title"), tr("libbook.sub"));
    let y = PT + 76;
    for (const e of pg.toc) {
      for (const w of [0, 1]) {
        const label = w ? tr("libbook.write." + e.lib) : tr("libbook.lib." + e.lib) , pageNo = (w ? e.write : e.page) + 1;
        ctx.textAlign = "left"; ctx.fillStyle = w ? faint : ink; ctx.font = (w ? "italic 11px serif" : "12px serif"); ctx.fillText((w ? "   ✎ " : "") + label, x0 + 30, y);
        ctx.textAlign = "right"; ctx.fillStyle = faint; ctx.font = "italic 11px serif"; ctx.fillText(w ? `p. ${pageNo}` : `${e.n} · p. ${pageNo}`, x0 + PW - 30, y);
        ctx.strokeStyle = rgba(74, 53, 32, 0.15); ctx.setLineDash([1, 3]); ctx.beginPath(); ctx.moveTo(x0 + 30, y + 3); ctx.lineTo(x0 + PW - 30, y + 3); ctx.stroke(); ctx.setLineDash([]);
        if (live) r.hot.push({ x: x0 + 24, y: y - 13, w: PW - 48, h: 20, tip: label, gbGo: pageNo - 1 });
        y += 24;
      }
      y += 12;
    }
  } else if (pg.kind === "entries") {
    title(tr("libbook.lib." + pg.lib), pg.part);
    if (pg.empty) { ctx.fillStyle = faint; ctx.font = "italic 11px serif"; ctx.fillText(tr("libbook.empty1"), cx, PT + 120); ctx.fillText(tr("libbook.empty2"), cx, PT + 138); }
    pg.rows.forEach((row, i) => {
      const y = PT + 62 + i * ROW_H, e = splitEntry(row.text);
      ctx.textAlign = "left"; ctx.fillStyle = ink; ctx.font = "11px serif"; ctx.fillText(fit(ctx, e.head, PW - 44), x0 + 22, y);
      if (e.tail) { ctx.fillStyle = faint; ctx.font = "italic 8.5px serif"; ctx.fillText(fit(ctx, e.tail, PW - 44), x0 + 22, y + 11); }
      ctx.strokeStyle = rgba(74, 53, 32, 0.12); ctx.beginPath(); ctx.moveTo(x0 + 20, y + 16); ctx.lineTo(x0 + PW - 20, y + 16); ctx.stroke();
      if (live) r.hot.push({ x: x0 + 18, y: y - 11, w: PW - 36, h: ROW_H - 2, tip: row.text.length > 140 ? row.text.slice(0, 140) + "…" : row.text });
    });
  } else if (pg.kind === "write") {
    title(tr("libbook.write." + pg.lib), tr("libbook.write.sub"));
    ctx.fillStyle = faint; ctx.font = "italic 9px serif";
    [1, 2, 3].forEach((n, i) => { const k = `libbook.fmt.${pg.lib}.${n}`, v = tr(k); if (v && v !== k) ctx.fillText(fit(ctx, v, PW - 30), cx, PT + 60 + i * 13); });
    if (ui.msg) { ctx.fillStyle = ui.bad ? "#8a2f2f" : "#2f5a3a"; ctx.font = "italic 10px serif"; ctx.fillText(fit(ctx, ui.msg, PW - 24), cx, PT + 252); }
    ui.slot = { x: x0 + 18, y: PT + 106, w: PW - 36, h: 84, bx: x0 + PW / 2 - 44, by: PT + 200, bw: 88, bh: 22, lib: pg.lib };
  }
  ctx.textAlign = "left";
}

/** Le champ d'écriture (HTML) posé sur la page d'écriture visible ; `slot` null : on le cache. */
function syncOverlay(r, slot) {
  const ui = r.libUI;
  if (!ui || !ui.root) { if (!slot) return; }
  if (!slot) { if (ui.root) ui.root.style.display = "none"; return; }
  if (!ui.root) {
    const parent = r.canvas.parentElement; if (!parent) return;
    const root = document.createElement("div"); root.className = "age-libbook__write";
    const ta = document.createElement("textarea"); ta.className = "age-libbook__ta"; ta.spellcheck = false;
    const btn = document.createElement("button"); btn.className = "age-libbook__btn";
    for (const ev of ["keydown", "keyup", "keypress", "mousedown", "click", "wheel"]) root.addEventListener(ev, (e) => e.stopPropagation());
    btn.addEventListener("click", async () => {
      if (ui.busy || !ta.value.trim() || !r.opts.onLibraryAdd) return; ui.busy = true;
      const tr = r.imagerTr ? r.imagerTr() : (k) => k; let res;
      try { res = await r.opts.onLibraryAdd(ui.lib, ta.value); } catch (e) { res = { ok: false, error: String((e && e.message) || e) }; }
      ui.busy = false;
      if (res.ok) { ta.value = ""; ui.msg = tr("libbook.added", { n: res.n }); ui.bad = false; if (r.opts.onFlip) r.opts.onFlip(); r._lbData = null; }
      else { ui.msg = res.error === "empty" ? tr("libbook.nothing") : tr("libbook.bad", { why: res.error }); ui.bad = true; }
      if (!r.running) r.draw(0);
    });
    root.appendChild(ta); root.appendChild(btn); parent.appendChild(root); Object.assign(ui, { root, ta, btn });
  }
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, sx = 100 / W, sy = 100 / H, cw = r.canvas.clientWidth || W, k = cw / W;
  const root = ui.root, st = root.style; st.display = "block"; st.position = "absolute"; st.left = "0"; st.top = "0"; st.width = "100%"; st.height = "100%"; st.pointerEvents = "none";
  const place = (el, x, y, w, h) => { const e = el.style; e.position = "absolute"; e.left = x * sx + "%"; e.top = y * sy + "%"; e.width = w * sx + "%"; e.height = h * sy + "%"; e.pointerEvents = "auto"; e.boxSizing = "border-box"; };
  place(ui.ta, slot.x, slot.y, slot.w, slot.h); place(ui.btn, slot.bx, slot.by, slot.bw, slot.bh);
  ui.ta.style.fontSize = Math.max(9, 10 * k) + "px"; ui.btn.style.fontSize = Math.max(9, 10 * k) + "px";
  ui.ta.placeholder = tr("libbook.ph." + slot.lib); ui.btn.textContent = tr("libbook.add"); ui.lib = slot.lib;
}

function drawLibraryBook(r, ctx, sc, sky, t) {
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const st = r.gbook || (r.gbook = { spread: 0, anim: null }), ui = r.libUI || (r.libUI = { msg: "", bad: false, slot: null });
  if (!r._lbData) r._lbData = { pages: buildPages(r.opts.libraryData ? r.opts.libraryData() : {}) };
  const pages = r._lbData.pages, nS = Math.max(1, Math.ceil(pages.length / 2)); st.spread = clamp(st.spread, 0, nS - 1);
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(52, 36, 548, 296); ctx.fillStyle = c("#5b2b2b"); ctx.fillRect(48, 30, 548, 296); ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1.2; ctx.strokeRect(53.5, 35.5, 537, 285);
  const now = Date.now(); let an = st.anim; if (an && now - an.at > TURN_MS) an = st.anim = null;
  const pair = (s) => [pages[2 * s], pages[2 * s + 1]]; ui.slot = null;
  const squash = (pg, side, sx) => { if (sx <= 0.02) return; ctx.save(); ctx.translate(RX, 0); ctx.scale(sx, 1); ctx.translate(-RX, 0); drawPage(r, ctx, pg, side, c, false, tr, {}); ctx.fillStyle = rgba(30, 18, 6, 0.32 * (1 - sx)); ctx.fillRect(side ? RX : LX, PT, PW, PH); ctx.restore(); };
  if (!an) { const [a, b] = pair(st.spread); drawPage(r, ctx, a, 0, c, true, tr, ui); drawPage(r, ctx, b, 1, c, true, tr, ui); }
  else {
    const p = (now - an.at) / TURN_MS, f = pair(an.from), n = pair(st.spread), fwd = an.dir > 0;
    drawPage(r, ctx, fwd ? f[0] : n[0], 0, c, false, tr, {}); drawPage(r, ctx, fwd ? n[1] : f[1], 1, c, false, tr, {});
    if (p < 0.5) squash(fwd ? f[1] : f[0], fwd ? 1 : 0, 1 - 2 * p); else squash(fwd ? n[0] : n[1], fwd ? 0 : 1, 2 * p - 1);
  }
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
  r.gbookN = nS; syncOverlay(r, an ? null : ui.slot);
}

module.exports = { drawLibraryBook, buildPages, splitEntry, syncOverlay };
