"use strict";
/**
 * 2.9 : l'estampe (claude/DESIGN-pistes-8-nov.md, § 15). Un Âge exporté en une image, sur une planche de papier :
 *  - la carte postale : la fenêtre, le nom, une phrase ;
 *  - la planche : la fenêtre et la carte de l'Âge côte à côte, puis la description entière et la ligne de glyphes.
 * Aucun nombre, aucun verdict chiffré, rien de l'histoire. Le dessin seul (le fichier : src/entry.js, exportEstampe).
 */
const G = require("./genscene");
const AMAP = require("./agemap");
const GL = require("./engine/glyphs");

const PAPER = "#efe4c8", INK = "#3e2a18", FAINT = "#8a7458";

/** les formes d'un glyphe (src/engine/glyphs.js), à l'encre, dans un carré de côté s. */
function drawGlyph(g, id, x, y, s, col) {
  let shapes; try { shapes = GL.glyphShapes(id); } catch (e) { shapes = null; } if (!shapes) return;
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.strokeStyle = col; g.fillStyle = col; g.lineJoin = "miter"; g.lineCap = "square";
  for (const sh of shapes) {
    if (sh.kind === "polyline" || (sh.kind === "polygon" && sh.stroke)) { g.lineWidth = sh.strokeWidth || 1.5; g.beginPath(); sh.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); if (sh.kind === "polygon") g.closePath(); g.stroke(); }
    else if (sh.kind === "polygon") { g.globalAlpha = sh.opacity != null ? sh.opacity : 1; g.beginPath(); sh.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill(); g.globalAlpha = 1; }
    else if (sh.kind === "line") { g.lineWidth = sh.strokeWidth || 2; g.beginPath(); g.moveTo(sh.a[0], sh.a[1]); g.lineTo(sh.b[0], sh.b[1]); g.stroke(); }
    else if (sh.kind === "rect") g.fillRect(sh.x, sh.y, sh.w, sh.h);
  }
  g.restore();
}

/** Coupe un texte en lignes qui tiennent dans `w`. */
function wrap(g, text, w) {
  const out = []; for (const para of String(text || "").split(/\n+/)) { let ln = ""; for (const word of para.split(/\s+/)) { const t = ln ? ln + " " + word : word; if (ln && g.measureText(t).width > w) { out.push(ln); ln = word; } else ln = t; } if (ln) out.push(ln); }
  return out;
}

/** Le papier et son filet. */
function paper(g, W, H) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(120,80,40,0)"); vg.addColorStop(1, "rgba(120,80,40,0.18)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(18, 18, W - 36, H - 36); g.lineWidth = 0.8; g.strokeRect(25, 25, W - 50, H - 50);
}

/** La fenêtre dans son cadre, peinte à l'heure donnée (o : options de G.paint). */
function windowAt(g, m, x, y, w, h, t, o) {
  const cv = makeCanvas(g, m.W, m.H); G.paint(cv.getContext("2d"), m, t, o);
  g.drawImage(cv, x, y, w, h); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}
const makeCanvas = (g, w, h) => { const doc = g.canvas && g.canvas.ownerDocument; const c = doc ? doc.createElement("canvas") : new OffscreenCanvas(w, h); c.width = w; c.height = h; return c; };

/**
 * Compose l'estampe dans `g` (sa toile doit déjà avoir la bonne taille : sizeOf). `kind` : "postcard" | "plate".
 * a : { m (modèle G.build), name, prose (texte), glyphs (identifiants), stability, t, paintOpts }.
 */
function compose(g, kind, a) {
  const W = g.canvas.width, H = g.canvas.height, serif = "Georgia, 'Times New Roman', serif";
  paper(g, W, H); g.textBaseline = "alphabetic";
  if (kind === "postcard") {
    const ww = W - 100, wh = Math.round((ww * a.m.H) / a.m.W); windowAt(g, a.m, 50, 50, ww, wh, a.t, a.paintOpts);
    g.fillStyle = INK; g.textAlign = "center"; g.font = `34px ${serif}`; g.fillText(a.name, W / 2, 50 + wh + 58);
    const first = String(a.prose || "").split(/(?<=\.)\s+/)[0] || ""; g.font = `italic 19px ${serif}`; g.fillStyle = FAINT; wrap(g, first, ww - 60).slice(0, 3).forEach((l, i) => g.fillText(l, W / 2, 50 + wh + 96 + i * 26));
    return;
  }
  /* la planche : la fenêtre et la carte, le nom, la description, les glyphes */
  const top = 50, mw = 520, ww = W - 100 - mw - 30, wh = Math.round((ww * a.m.H) / a.m.W), mapY = top + Math.max(0, (wh - mw) / 2);
  g.fillStyle = INK; g.textAlign = "left"; g.font = `40px ${serif}`; g.fillText(a.name, 50, top + 34);
  const y0 = top + 60; windowAt(g, a.m, 50, y0, ww, wh, a.t, a.paintOpts);
  const mc = makeCanvas(g, mw, mw); AMAP.paintMap(mc.getContext("2d"), a.m, { name: a.name, stability: a.stability }); g.drawImage(mc, 50 + ww + 30, y0 + (wh - mw) / 2, mw, mw); void mapY;
  let y = y0 + Math.max(wh, mw) + 40; g.font = `20px ${serif}`; g.fillStyle = INK;
  for (const l of wrap(g, a.prose, W - 100)) { g.fillText(l, 50, y); y += 29; }
  y += 18; g.strokeStyle = FAINT; g.lineWidth = 0.8; g.beginPath(); g.moveTo(50, y); g.lineTo(W - 50, y); g.stroke(); y += 16;
  const ids = (a.glyphs || []).slice(0, 40), gs = 38, per = Math.floor((W - 100) / (gs + 8));
  ids.forEach((id, i) => drawGlyph(g, id, 50 + (i % per) * (gs + 8), y + Math.floor(i / per) * (gs + 10), gs, INK));
}

/** La taille de la toile pour un format et une description (la planche s'allonge avec le texte). */
function sizeOf(kind, a, measure) {
  if (kind === "postcard") return { w: 1200, h: Math.round(50 + ((1100 * a.m.H) / a.m.W)) + 190 };
  const W = 1800, ww = W - 100 - 520 - 30, wh = Math.round((ww * a.m.H) / a.m.W), lines = measure ? measure(a.prose, W - 100) : Math.ceil(String(a.prose || "").length / 150) + 1;
  const gl = Math.ceil(Math.min(40, (a.glyphs || []).length) / Math.floor((W - 100) / 46));
  return { w: W, h: 110 + Math.max(wh, 520) + 40 + lines * 29 + 34 + gl * 48 + 50 };
}

module.exports = { compose, sizeOf, wrap, drawGlyph };
