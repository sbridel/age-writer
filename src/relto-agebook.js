"use strict";
// Le livre vierge : on y écrit un Âge sans quitter le Relto. Page de gauche : le nom et le texte (champs HTML posés sur le canevas, comme dans le livre
// de la bibliothèque). Page de droite : le lutrin, qui lit l'Âge à mesure qu'on l'écrit, par couches selon le titre d'écrivain (src/lectern.js).
// Sceller le livre crée la note de l'Âge dans le coffre ; elle s'ouvre ensuite comme n'importe quel Âge.
const { mix, rgba } = require("./util");
const GB = require("./relto-glyphbook");

const W = 640, H = 360, LX = 62, RX = 320, PW = 258, PT = 40, PH = 276;
const INK = "#3a2d1a", FAINT = "#8a7650", DEBOUNCE = 280, MAX_GLYPHS = 12;
const KIND_INK = { alert: "#7a3b2a", unknown: "#8a6a2a", dose: "#4a3d22", depth: "#2f5a3a", reaction: "#3a5a52", balance: "#6a4a2a", cost: "#6b5a3a" };

/** Découpe un texte en lignes qui tiennent dans `maxW` (la police du contexte). */
function wrap(ctx, text, maxW) {
  const out = []; let line = "";
  for (const w of String(text).split(/\s+/)) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

/** La page de droite : le lutrin. */
function drawLectern(r, ctx, tr, c, ui) {
  const x0 = RX, cx = x0 + PW / 2, ink = c(INK), faint = c(FAINT);
  ctx.fillStyle = c("#eadfc0"); ctx.fillRect(x0, PT, PW, PH);
  const sp = ctx.createLinearGradient(RX, 0, RX + 30, 0); sp.addColorStop(0, "rgba(60,40,20,0.35)"); sp.addColorStop(1, "rgba(60,40,20,0)"); ctx.fillStyle = sp; ctx.fillRect(RX, PT, 30, PH);
  ctx.textAlign = "center"; ctx.fillStyle = ink; ctx.font = "italic 13px serif"; ctx.fillText(tr("agebook.lectern"), cx, PT + 26);
  const st = r.opts.statusState ? r.opts.statusState() : null;
  if (st && st.title) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(st.title, cx, PT + 38); }
  ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + 38, PT + 44); ctx.lineTo(x0 + PW - 38, PT + 44); ctx.stroke();
  const read = ui.read;
  if (!read) { ctx.fillStyle = faint; ctx.font = "italic 10px serif"; ctx.fillText(tr("agebook.empty1"), cx, PT + 120); ctx.fillText(tr("agebook.empty2"), cx, PT + 136); ctx.textAlign = "left"; return; }
  let y = PT + 66; ctx.textAlign = "left";
  ctx.fillStyle = ink; ctx.font = "italic 13px serif"; ctx.fillText(read.verdict, x0 + 22, y); y += 16;
  if (read.prose) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; for (const ln of wrap(ctx, read.prose, PW - 44).slice(0, 3)) { ctx.fillText(ln, x0 + 22, y); y += 11; } y += 3; }
  const gl = read.glyphs.slice(0, MAX_GLYPHS); gl.forEach((id, i) => GB.drawGlyph(r, ctx, id, x0 + 22 + i * 19, y, 16, INK, 0.85)); if (gl.length) y += 22;
  ctx.strokeStyle = rgba(74, 53, 32, 0.15); ctx.beginPath(); ctx.moveTo(x0 + 22, y - 3); ctx.lineTo(x0 + PW - 22, y - 3); ctx.stroke(); y += 8;
  const bottom = PT + PH - 14;
  for (const ln of read.lines) {
    ctx.font = ln.kind === "alert" ? "9.5px serif" : "italic 9px serif"; ctx.fillStyle = c(KIND_INK[ln.kind] || INK);
    const pre = ln.fam ? `[${read.familyLabel[ln.fam] || ln.fam}] ` : ln.kind === "alert" ? "• " : "", rows = wrap(ctx, pre + ln.text, PW - 44).slice(0, 3);
    if (y + rows.length * 11 > bottom) { ctx.fillStyle = faint; ctx.fillText("…", x0 + 22, bottom); break; }
    for (const row of rows) { ctx.fillText(row, x0 + 22, y); y += 11; } y += 3;
  }
}

/** La page de gauche (le papier ; les champs HTML se posent par-dessus). */
function drawWritePage(ctx, tr, c, ui) {
  const x0 = LX, cx = x0 + PW / 2, faint = c(FAINT);
  ctx.fillStyle = c("#e6d9b8"); ctx.fillRect(x0, PT, PW, PH);
  const sp = ctx.createLinearGradient(RX - 30, 0, RX, 0); sp.addColorStop(0, "rgba(60,40,20,0)"); sp.addColorStop(1, "rgba(60,40,20,0.35)"); ctx.fillStyle = sp; ctx.fillRect(RX - 30, PT, 30, PH);
  ctx.textAlign = "center"; ctx.fillStyle = c(INK); ctx.font = "italic 13px serif"; ctx.fillText(tr("agebook.title"), cx, PT + 26);
  ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(tr("agebook.sub"), cx, PT + 38);
  ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 + 38, PT + 44); ctx.lineTo(x0 + PW - 38, PT + 44); ctx.stroke();
  if (ui.msg) { ctx.fillStyle = ui.bad ? "#8a2f2f" : "#2f5a3a"; ctx.font = "italic 10px serif"; ctx.fillText(ui.msg.length > 44 ? ui.msg.slice(0, 43) + "…" : ui.msg, cx, PT + 270); }
  ctx.textAlign = "left";
  ui.slot = { nx: x0 + 18, ny: PT + 52, nw: PW - 36, nh: 22, x: x0 + 18, y: PT + 80, w: PW - 36, h: 146, bx: x0 + PW / 2 - 50, by: PT + 234, bw: 100, bh: 24 };
}

function syncOverlay(r, slot) {
  const ui = r.abUI;
  if (!slot) { if (ui.root) ui.root.style.display = "none"; return; }
  if (!ui.root) {
    const parent = r.canvas.parentElement; if (!parent) return;
    const root = document.createElement("div"); root.className = "age-libbook__write";
    const nm = document.createElement("input"); nm.className = "age-libbook__ta age-agebook__name"; nm.type = "text"; nm.spellcheck = false;
    const ta = document.createElement("textarea"); ta.className = "age-libbook__ta"; ta.spellcheck = false;
    const btn = document.createElement("button"); btn.className = "age-libbook__btn";
    for (const ev of ["keydown", "keyup", "keypress", "mousedown", "click", "wheel"]) root.addEventListener(ev, (e) => e.stopPropagation());
    nm.value = ui.draft.name; ta.value = ui.draft.text;
    const refresh = () => { ui.draft.name = nm.value; ui.draft.text = ta.value; clearTimeout(ui.timer); ui.timer = setTimeout(() => { readNow(r); if (!r.running) r.draw(0); }, DEBOUNCE); };
    nm.addEventListener("input", refresh); ta.addEventListener("input", refresh);
    btn.addEventListener("click", async () => {
      if (ui.busy) return; const tr = r.imagerTr ? r.imagerTr() : (k) => k;
      if (!ta.value.trim() || !r.opts.onAgeWrite) { ui.msg = tr("agebook.nothing"); ui.bad = true; if (!r.running) r.draw(0); return; }
      ui.busy = true; let res;
      try { res = await r.opts.onAgeWrite(nm.value.trim(), ta.value); } catch (e) { res = { ok: false, error: String((e && e.message) || e) }; }
      ui.busy = false;
      if (res && res.ok) { ui.msg = tr("agebook.sealed", { name: res.name }); ui.bad = false; ta.value = ""; nm.value = ""; ui.draft = { name: "", text: "" }; ui.read = null; if (r.opts.onFlip) r.opts.onFlip(); }
      else { ui.msg = tr("agebook.bad", { why: (res && res.error) || "?" }); ui.bad = true; }
      if (!r.running) r.draw(0);
    });
    root.appendChild(nm); root.appendChild(ta); root.appendChild(btn); parent.appendChild(root); Object.assign(ui, { root, nm, ta, btn });
  }
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, sx = 100 / W, sy = 100 / H, cw = r.canvas.clientWidth || W, k = cw / W;
  const st = ui.root.style; st.display = "block"; st.position = "absolute"; st.left = "0"; st.top = "0"; st.width = "100%"; st.height = "100%"; st.pointerEvents = "none";
  const place = (el, x, y, w, h) => { const e = el.style; e.position = "absolute"; e.left = x * sx + "%"; e.top = y * sy + "%"; e.width = w * sx + "%"; e.height = h * sy + "%"; e.pointerEvents = "auto"; e.boxSizing = "border-box"; };
  place(ui.nm, slot.nx, slot.ny, slot.nw, slot.nh); place(ui.ta, slot.x, slot.y, slot.w, slot.h); place(ui.btn, slot.bx, slot.by, slot.bw, slot.bh);
  for (const el of [ui.nm, ui.ta, ui.btn]) el.style.fontSize = Math.max(9, 10 * k) + "px";
  ui.nm.placeholder = tr("agebook.ph.name"); ui.ta.placeholder = tr("agebook.ph.text"); ui.btn.textContent = tr("agebook.seal");
}

/** Relit l'Âge écrit (le lutrin lit à mesure) ; `null` s'il n'y a rien. */
function readNow(r) {
  const ui = r.abUI; if (!ui) return;
  const text = ui.draft.text;
  if (!text.trim() || !r.opts.lecternRead) { ui.read = null; return; }
  try { ui.read = r.opts.lecternRead(text, ui.draft.name || "Age"); } catch (e) { ui.read = null; }
}

function drawAgeBook(r, ctx, sc, sky, t) {
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb);
  const ui = r.abUI || (r.abUI = { msg: "", bad: false, slot: null, read: null, draft: { name: "", text: "" } });
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(52, 36, 548, 296); ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(48, 30, 548, 296); ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1.2; ctx.strokeRect(53.5, 35.5, 537, 285);
  drawWritePage(ctx, tr, c, ui); drawLectern(r, ctx, tr, c, ui);
  require("./relto-atelier").backButton(r, ctx, tr("glyphbook.close"), r.bookFrom || "cabin");
  const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1), g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 420); g.addColorStop(0, rgba(255, 190, 90, 0.07 * fl)); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  syncOverlay(r, ui.slot);
}

module.exports = { drawAgeBook, readNow, drawLectern, wrap };
