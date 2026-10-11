"use strict";
// Le registre de l'Imageur : un petit livre de laiton posé près du lutrin. Ouvert, il lit l'Âge posé sur le lutrin, par couches selon le titre
// d'écrivain (src/lectern.js). C'est là qu'on « lit » un Âge : le livre descriptif dit ce qu'il est, le registre dit ce qu'il vaut.
const { rgba } = require("./util");

const IC = { x: 130, y: 212, w: 36, h: 26 }, PN = { x: 126, y: 16, w: 312, h: 306 };
const INK = "#3a2d1a", FAINT = "#8a7650";
const KIND_INK = { alert: "#7a3b2a", unknown: "#8a6a2a", dose: "#4a3d22", depth: "#2f5a3a", reaction: "#3a5a52", balance: "#6a4a2a", cost: "#6b5a3a" };

function wrap(ctx, text, maxW) {
  const out = []; let line = "";
  for (const w of String(text).split(/\s+/)) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

/** Le registre fermé, à côté du lutrin. */
function drawIcon(r, ctx, c, tip, t) {
  const { x, y, w, h } = IC;
  ctx.fillStyle = rgba(0, 0, 0, 0.3); ctx.fillRect(x - 2, y + h - 2, w + 6, 5);
  ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(x, y, w, h); ctx.fillStyle = c("#d8c07a"); ctx.fillRect(x, y, w, 2.5); ctx.fillRect(x, y + h - 2.5, w, 2.5); ctx.fillRect(x + 4, y, 2, h);
  ctx.fillStyle = rgba(255, 235, 170, 0.35 + 0.15 * Math.sin(t * 1.6)); ctx.fillRect(x + w - 12, y + 7, 8, 1.5); ctx.fillRect(x + w - 12, y + 12, 8, 1.5);
  r.hot.push({ x: x - 2, y: y - 2, w: w + 6, h: h + 6, tip, imager: { ledger: 1 } });
}

/** Le registre ouvert : la lecture de l'Âge. `read` : le résultat de `lectern.readOut`, ou null tant qu'il se charge. */
function drawPanel(r, ctx, c, tr, read, name) {
  const { x, y, w, h } = PN, ink = c(INK), faint = c(FAINT), cx = x + w / 2;
  ctx.fillStyle = rgba(0, 0, 0, 0.45); ctx.fillRect(x + 5, y + 6, w, h); ctx.fillStyle = c("#3d3a2a"); ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = c("#eadfc0"); ctx.fillRect(x, y, w, h); ctx.strokeStyle = c("#d8c07a"); ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y - 3.5, w + 7, h + 7);
  ctx.textAlign = "center"; ctx.fillStyle = ink; ctx.font = "italic 14px serif"; ctx.fillText(name || tr("ledger.title"), cx, y + 24);
  const st = r.opts.statusState ? r.opts.statusState() : null;
  ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(tr("ledger.title") + (st && st.title ? " · " + st.title : ""), cx, y + 37);
  ctx.strokeStyle = rgba(74, 53, 32, 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 30, y + 44); ctx.lineTo(x + w - 30, y + 44); ctx.stroke();
  ctx.textAlign = "left";
  if (!read) { ctx.fillStyle = faint; ctx.font = "italic 10px serif"; ctx.textAlign = "center"; ctx.fillText(tr("ledger.reading"), cx, y + 120); ctx.textAlign = "left"; }
  else {
    let yy = y + 66;
    ctx.fillStyle = ink; ctx.font = "italic 14px serif"; ctx.fillText(read.verdict, x + 22, yy); yy += 16;
    if (read.prose) { ctx.fillStyle = faint; ctx.font = "italic 9.5px serif"; for (const ln of wrap(ctx, read.prose, w - 44).slice(0, 4)) { ctx.fillText(ln, x + 22, yy); yy += 12; } yy += 4; }
    const GB = require("./relto-glyphbook");
    read.glyphs.slice(0, 14).forEach((id, i) => GB.drawGlyph(r, ctx, id, x + 22 + i * 20, yy, 17, INK, 0.85)); if (read.glyphs.length) yy += 24;
    ctx.strokeStyle = rgba(74, 53, 32, 0.15); ctx.beginPath(); ctx.moveTo(x + 22, yy - 4); ctx.lineTo(x + w - 22, yy - 4); ctx.stroke(); yy += 8;
    const bottom = y + h - 12;
    for (const ln of read.lines) {
      ctx.font = ln.kind === "alert" ? "10px serif" : "italic 9.5px serif"; ctx.fillStyle = c(KIND_INK[ln.kind] || INK);
      const pre = ln.fam ? `[${read.familyLabel[ln.fam] || ln.fam}] ` : ln.kind === "alert" ? "• " : "", rows = wrap(ctx, pre + ln.text, w - 44).slice(0, 3);
      if (yy + rows.length * 12 > bottom) { ctx.fillStyle = faint; ctx.fillText("…", x + 22, bottom); break; }
      for (const row of rows) { ctx.fillText(row, x + 22, yy); yy += 12; } yy += 3;
    }
  }
  r.hot.push({ x: x - 6, y: y - 6, w: w + 12, h: h + 12, tip: tr("ledger.close"), imager: { ledger: 1 } });
}

/** Demande (une fois par Âge) la lecture à l'extérieur ; `ledgerData` la garde. */
function ensureRead(r, age) {
  const ld = r.ledgerData;
  if (ld && ld.path === age.path) return ld.read;
  r.ledgerData = { path: age.path, read: null };
  if (r.opts.onLedger) Promise.resolve(r.opts.onLedger(age)).then((read) => { if (r.ledgerData && r.ledgerData.path === age.path) { r.ledgerData.read = read || null; if (!r.running) r.draw(0); } }).catch(() => { /* ignore */ });
  return null;
}

module.exports = { drawIcon, drawPanel, ensureRead, IC, PN };
