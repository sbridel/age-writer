"use strict";
/*
 * Le Rehevkor sur la longue table de l'étage (claude/DESIGN-art-bahro.md §18 ; le modèle est src/rehevkor.js) : un livre de cuir noir, vingt-cinq pages.
 * La première ouvre sur le fahsee « Lien », la grille de lecture ; puis le psaume, un verset par loi, le nombre D'ni à gauche et le titre à droite ;
 * les pages entendues (retrouvées par les chapitres 14 à 16) n'ont pas de nombre mais le petit signe de la planche, et se lisent en italique ;
 * les pages que le joueur n'a pas encore sont blanches, avec leur nombre à peine visible. Même reliure et mêmes gestes que le livre des glyphes.
 */
const { rgba } = require("./util");
const RK = require("./rehevkor");
const W = 640, H = 360, LX = 62, RX = 320, PW = 258, PT = 40, PH = 276, TURN_MS = 520, INK = "#3a2a1a", FAINT = "#8a7458", RUBRIC = "#9a3322", LAPIS = "#2c3f74", OCHRE = "#a86a3a";
const mix = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`; };

/** Coupe un texte en lignes qui tiennent dans `w` (la police courante). */
function wrap(ctx, text, w) {
  const out = []; let line = "";
  for (const word of String(text).split(" ")) { const t = line ? line + " " + word : word; if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
/** Les feuillets, dans la langue du jeu : la page de titre, le fahsee, puis les lois, autant qu'il en tient sur un feuillet (de une à quatre ;
 *  26 oct. 2026 : deux par feuillet laissaient la moitié de la page vide), la ligne des pages blanches, la fermeture. */
const LINE_CH = 48, ROOM = 226; /* environ 42 lettres par ligne de verset ; la hauteur d'écriture d'un feuillet, flèches comprises */
const lines = (txt) => Math.max(1, Math.ceil(String(txt || "").length / LINE_CH));
function heightOf(p, done, lang) {
  if (p.kind === "read" || p.kind === "heard") return 18 + lines(p.verse) * 13 + (p.kind === "heard" ? 13 : 0) + 14;
  return 46 + (p.n === firstMissing(done) ? 20 + lines(RK.blankLine(done, lang)) * 13 : 0);
}
function sheetsOf(done, lang) {
  const pages = RK.pagesOf(done, lang), out = [{ kind: "front" }, { kind: "lien" }];
  let cur = [], h = 0;
  for (const p of pages) { const hp = heightOf(p, done, lang); if (cur.length && (h + hp > ROOM || cur.length >= 4)) { out.push({ kind: "laws", laws: cur }); cur = []; h = 0; } cur.push(p); h += hp; }
  if (cur.length) out.push({ kind: "laws", laws: cur });
  out.push({ kind: "close" });
  return out;
}
function drawSheet(r, ctx, sh, side, c, tr, lang, done, t) {
  const x0 = side ? RX : LX, left = !side;
  ctx.fillStyle = c(left ? "#e6d9b8" : "#eadfc0"); ctx.fillRect(x0, PT, PW, PH);
  const sp = ctx.createLinearGradient(left ? RX - 30 : RX, 0, left ? RX : RX + 30, 0); sp.addColorStop(0, left ? "rgba(60,40,20,0)" : "rgba(60,40,20,0.35)"); sp.addColorStop(1, left ? "rgba(60,40,20,0.35)" : "rgba(60,40,20,0)"); ctx.fillStyle = sp; ctx.fillRect(left ? RX - 30 : RX, PT, 30, PH);
  if (!sh) return;
  const ink = c(INK), faint = c(FAINT), cx = x0 + PW / 2, m = 22, rubric = c(RUBRIC), lapis = c(LAPIS); /* un manuscrit rubriqué (26 oct. 2026) : les titres au vermillon, les nombres au lapis */
  ctx.textAlign = "center";
  if (sh.kind === "front") {
    ctx.fillStyle = rubric; ctx.font = "italic 22px serif"; ctx.fillText(tr("lawbook.title"), cx, PT + 96);
    ctx.strokeStyle = c(OCHRE); ctx.lineWidth = 0.8; for (const dy of [62, 70]) { ctx.beginPath(); ctx.moveTo(cx - 70, PT + dy); ctx.lineTo(cx + 70, PT + dy); ctx.stroke(); } ctx.fillStyle = lapis; ctx.beginPath(); ctx.moveTo(cx, PT + 61); ctx.lineTo(cx + 4, PT + 66); ctx.lineTo(cx, PT + 71); ctx.lineTo(cx - 4, PT + 66); ctx.closePath(); ctx.fill(); /* un filet double à l'ocre, un losange au lapis */
    ctx.font = "italic 10px serif"; ctx.fillStyle = faint; ctx.fillText(tr("lawbook.sub"), cx, PT + 114);
    if (r.dni) { const s = 13, w = r.dni.widthOf(25, s); r.dni.drawNumber(ctx, 25, cx - w / 2, PT + 136, s, lapis); } /* fahsee : vingt-cinq */
    ctx.font = "italic 11px serif"; ctx.fillStyle = ink; wrap(ctx, RK.open(lang), PW - 2 * m).forEach((l, i) => ctx.fillText(l, cx, PT + 196 + i * 15));
  } else if (sh.kind === "lien") {
    ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(tr("lawbook.lien"), cx, PT + 20);
    ctx.textAlign = "left"; ctx.fillStyle = ink; ctx.font = "9.2px serif"; let y = PT + 32;
    for (const st of RK.lien(lang)) { for (const l of st) { ctx.fillText(l, x0 + 16, y); y += 9.1; } y += 4; }
  } else if (sh.kind === "laws") {
    let y = PT + 24;
    for (const p of sh.laws) {
      if (p.kind === "read" || p.kind === "heard") {
        const heard = p.kind === "heard";
        if (heard) require("./relto-fresco").sign(ctx, p.sign, x0 + m + 8, y + 2, 7, 0.9, "law" + p.n, c("#a86a3a")); /* une page entendue : le signe de la planche, pas le nombre */
        else if (r.dni) r.dni.drawNumber(ctx, p.n, x0 + m, y - 6, 10, lapis); else { ctx.textAlign = "left"; ctx.font = "10px serif"; ctx.fillStyle = lapis; ctx.fillText(String(p.n), x0 + m, y + 2); }
        ctx.textAlign = "left"; ctx.font = "italic 10px serif"; ctx.fillStyle = faint; ctx.fillText(p.name, x0 + m + 26, y + 2);
        ctx.textAlign = "right"; ctx.font = (heard ? "italic " : "") + "11px serif"; ctx.fillStyle = heard ? c(OCHRE) : rubric; ctx.fillText(p.title, x0 + PW - m, y + 2);
        ctx.textAlign = "left"; ctx.font = (heard ? "italic " : "") + "10.5px serif"; y += 18;
        wrap(ctx, p.verse, PW - 2 * m).forEach((l, li) => { if (li === 0 && !heard) { ctx.fillStyle = rubric; ctx.font = "bold 12px serif"; ctx.fillText(l[0], x0 + m, y); const w0 = ctx.measureText(l[0]).width; ctx.fillStyle = ink; ctx.font = "10.5px serif"; ctx.fillText(l.slice(1), x0 + m + w0, y); } else { ctx.fillStyle = heard ? c("#5a3a22") : ink; ctx.fillText(l, x0 + m, y); } y += 13; }); /* la lettrine au vermillon ; une page entendue, à l'encre brune */
        if (heard) { ctx.fillStyle = faint; ctx.font = "italic 9px serif"; ctx.fillText(tr("lawbook.heard", { n: RK.NAMES[p.mirror - 1] }), x0 + m, y + 1); y += 13; }
        y += 14;
      } else { /* blanche pour le joueur : le nombre à peine visible */
        ctx.textAlign = "left"; if (r.dni) r.dni.drawNumber(ctx, p.n, x0 + m, y - 6, 10, rgba(74, 53, 32, 0.18)); ctx.font = "italic 10px serif"; ctx.fillStyle = rgba(74, 53, 32, 0.25); ctx.fillText(p.name, x0 + m + 26, y + 2);
        if (p.n === firstMissing(done)) { ctx.font = "italic 10px serif"; ctx.fillStyle = faint; let yy = y + 20; for (const l of wrap(ctx, RK.blankLine(done, lang), PW - 2 * m)) { ctx.fillText(l, x0 + m, yy); yy += 13; } y = yy; }
        y += 46;
      }
    }
  } else if (sh.kind === "close") {
    ctx.font = "italic 11px serif"; ctx.fillStyle = ink; wrap(ctx, RK.close(lang), PW - 2 * m).forEach((l, i) => ctx.fillText(l, cx, PT + 120 + i * 15));
    const k = 0.5 + 0.5 * Math.sin(t * 0.8); ctx.fillStyle = rgba(168, 106, 58, 0.25 + 0.2 * k); ctx.beginPath(); ctx.arc(cx, PT + 200, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = "left";
}
const firstMissing = (done) => { const p = RK.pagesOf(done, "en").find((x) => x.kind === "closed" || x.kind === "blank"); return p ? p.n : 0; };

function drawLawBook(r, ctx, sc, sky, t) {
  const tr = r.imagerTr ? r.imagerTr() : (k) => k, lang = r.opts.lang ? r.opts.lang() : "en", done = (r.opts.lawsDone && r.opts.lawsDone()) || [];
  const amb = 0.7 + 0.3 * sky.ambient, c = (h) => mix("#05060c", h, amb), st = r.gbook || (r.gbook = { spread: 0, anim: null });
  const sheets = sheetsOf(done, lang), nS = Math.max(1, Math.ceil(sheets.length / 2)); st.spread = Math.max(0, Math.min(nS - 1, st.spread));
  ctx.fillStyle = c("#2a1c12"); ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { ctx.fillStyle = rgba(0, 0, 0, 0.1 + 0.06 * ((y / 9) % 3)); ctx.fillRect(0, y, W, 1.2); }
  ctx.fillStyle = rgba(0, 0, 0, 0.35); ctx.fillRect(52, 36, 548, 296); ctx.fillStyle = c("#15131a"); ctx.fillRect(48, 30, 548, 296); ctx.strokeStyle = c("#a86a3a"); ctx.lineWidth = 1.2; ctx.strokeRect(53.5, 35.5, 537, 285); /* la reliure : cuir noir, un filet d'ocre */
  const now = Date.now(); let an = st.anim; if (an && now - an.at > TURN_MS) an = st.anim = null;
  const pair = (s) => [sheets[2 * s], sheets[2 * s + 1]];
  const squash = (sh, side, sx) => { if (sx <= 0.02) return; ctx.save(); ctx.translate(RX, 0); ctx.scale(sx, 1); ctx.translate(-RX, 0); drawSheet(r, ctx, sh, side, c, tr, lang, done, t); ctx.fillStyle = rgba(30, 18, 6, 0.32 * (1 - sx)); ctx.fillRect(side ? RX : LX, PT, PW, PH); ctx.restore(); };
  if (!an) { const [a, b] = pair(st.spread); drawSheet(r, ctx, a, 0, c, tr, lang, done, t); drawSheet(r, ctx, b, 1, c, tr, lang, done, t); }
  else {
    const p = (now - an.at) / TURN_MS, f = pair(an.from), n = pair(st.spread), fwd = an.dir > 0;
    drawSheet(r, ctx, fwd ? f[0] : n[0], 0, c, tr, lang, done, t); drawSheet(r, ctx, fwd ? n[1] : f[1], 1, c, tr, lang, done, t);
    if (p < 0.5) squash(fwd ? f[1] : f[0], fwd ? 1 : 0, 1 - 2 * p); else squash(fwd ? n[0] : n[1], fwd ? 0 : 1, 2 * p - 1);
  }
  ctx.font = "26px serif"; ctx.fillStyle = rgba(74, 53, 32, 0.85); ctx.textAlign = "center";
  if (!an) {
    if (st.spread > 0) { ctx.fillText("‹", LX + 18, PT + PH - 24); r.hot.push({ x: LX + 4, y: PT + PH - 46, w: 30, h: 30, tip: tr("glyphbook.prev"), gbTurn: -1 }); }
    if (st.spread < nS - 1) { ctx.fillText("›", RX + PW - 18, PT + PH - 24); r.hot.push({ x: RX + PW - 34, y: PT + PH - 46, w: 30, h: 30, tip: tr("glyphbook.next"), gbTurn: 1 }); }
  }
  ctx.textAlign = "left";
  require("./relto-atelier").backButton(r, ctx, tr("lawbook.close"), r.bookFrom || "loft");
  const fl = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1), g = ctx.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 420); g.addColorStop(0, rgba(255, 190, 90, 0.07 * fl)); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  r.gbookN = nS;
  void sc;
}

module.exports = { drawLawBook, sheetsOf, wrap };
