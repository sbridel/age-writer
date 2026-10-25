"use strict";
/*
 * L'ardoise, dessinée (claude/DESIGN-art-bahro.md §16 ; le modèle est src/slate.js). Sur le bureau de l'atelier, devant le livre noir ; un clic
 * l'approche (vue `slate`) : une pierre sombre, rien sur le bord, pas de palette. On trace au doigt ou à la souris (bouton tenu), en un ou plusieurs
 * traits : la craie tremble. Après une courte pause, l'ardoise relit l'ensemble : un signe reconnu se pose, net, par-dessus la craie, et une phrase
 * le nomme ; un trait qui ne ressemble à rien reste tel quel. La main posée à plat (un appui long, sans bouger) efface tout.
 */
const { rgba } = require("./util");
const W = 640, H = 360, TAU = Math.PI * 2;
const SL = { x: 320, y: 172, w: 340, h: 220 }; /* l'ardoise approchée */
const CHALK = [226, 214, 190];
const PAUSE = 900, HOLD = 650; /* la pause qui fait relire ; l'appui long qui pose la main */

const inSlate = (x, y) => ((x - SL.x) / (SL.w * 0.5)) ** 2 + ((y - SL.y) / (SL.h * 0.5)) ** 2 <= 1;
const edgeR = (a, w, h) => 1 + 0.035 * Math.sin(a * 5 + 1) + 0.02 * Math.sin(a * 9);

/** La pierre : plate, sombre, au bord irrégulier, du mica dedans. `c` : la teinte de la pièce (lampe, nuit). */
function stone(ctx, c, x, y, w, h, rot = 0) {
  const edge = (k) => { ctx.beginPath(); for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU, r = edgeR(a); ctx.lineTo(Math.cos(a) * w * 0.5 * r + k, Math.sin(a) * h * 0.5 * r + k); } ctx.closePath(); };
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; edge(Math.max(2, w * 0.012)); ctx.fill();
  ctx.fillStyle = c("#17181c"); edge(Math.max(1, w * 0.006)); ctx.fill();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, c("#2a2c33")); g.addColorStop(0.5, c("#1f2126")); g.addColorStop(1, c("#262830"));
  ctx.fillStyle = g; edge(0); ctx.fill();
  let q = 3; const r = () => (q = (q * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < Math.round(w * 0.5); i++) { const px = (r() - 0.5) * w * 0.86, py = (r() - 0.5) * h * 0.86; ctx.fillStyle = r() < 0.3 ? "rgba(180,190,210,0.16)" : "rgba(0,0,0,0.18)"; ctx.fillRect(px, py, 1.1, 1.1); } /* le grain, le mica */
  ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.44, -h * 0.3 + i * h * 0.2); ctx.lineTo(w * 0.44, -h * 0.26 + i * h * 0.2); ctx.stroke(); } /* le feuilletage de l'ardoise */
  ctx.restore();
}
/** L'ardoise posée sur le bureau (vue `desk`). */
function onDesk(r, ctx, c, TRr, t) {
  const S = (r.opts.slateState && r.opts.slateState()) || {}; if (!S.here) return;
  stone(ctx, c, 586, 334, 66, 34, -0.06);
  if ((S.strokes || []).length) { ctx.save(); ctx.translate(586, 334); ctx.rotate(-0.06); ctx.scale(66 / SL.w, 34 / SL.h); ctx.translate(-SL.x, -SL.y); chalkAll(ctx, S.strokes, 0.7); ctx.restore(); } /* ce qu'on y a tracé, en petit */
  r.hot.push({ x: 550, y: 314, w: 72, h: 40, tip: TRr("slate.tip"), go: "slate" });
  void t;
}

/** Un trait de craie : il tremble, s'épaissit et s'allège comme un doigt ; un halo de poussière autour. */
function chalk(ctx, pts, a = 1, w = 3.4) {
  if (!pts || pts.length < 1) return;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (pts.length === 1) { ctx.fillStyle = rgba(...CHALK, 0.9 * a); ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], w * 0.6, 0, TAU); ctx.fill(); ctx.restore(); return; }
  ctx.strokeStyle = rgba(...CHALK, 0.28 * a); ctx.lineWidth = w * 2.2; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  ctx.strokeStyle = rgba(...CHALK, 0.9 * a);
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; ctx.lineWidth = w * (0.72 + 0.5 * Math.abs(Math.sin(i * 1.3 + x0 * 0.05))); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  ctx.restore();
}
const chalkAll = (ctx, strokes, a) => { for (const s of strokes || []) chalk(ctx, s, a); };
/** La main posée à plat : son empreinte de poussière, qui s'efface. */
function handPrint(ctx, x, y, s, a) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = rgba(...CHALK, 0.22 * a); ctx.strokeStyle = rgba(...CHALK, 0.22 * a); ctx.lineCap = "round";
  ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.5, s * 0.55, 0, 0, TAU); ctx.fill();
  ctx.lineWidth = s * 0.22; for (let f = 0; f < 5; f++) { const an = -2.6 + f * 0.43, l = f === 0 ? s * 0.8 : s * 1.1; ctx.beginPath(); ctx.moveTo(Math.cos(an) * s * 0.4, s * 0.3 + Math.sin(an) * s * 0.4); ctx.lineTo(Math.cos(an) * l, s * 0.3 + Math.sin(an) * l); ctx.stroke(); }
  ctx.restore();
}
/** Le cadre d'un groupe de traits (pour poser le signe net par-dessus). */
function boxOf(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, s: Math.max(18, Math.min(70, Math.max(x1 - x0, y1 - y0) * 0.55)) };
}

/** La vue `slate` : le bureau assombri derrière, l'ardoise approchée, la craie, les signes reconnus, la phrase. */
function drawSlateView(r, ctx, sc, sky, t) {
  require("./relto-atelier").drawDesk(r, ctx, sc, sky, t); r.hot = []; /* le bureau derrière, sans ses objets cliquables */
  const TRr = (k, v) => (r.imagerTr ? r.imagerTr()(k, v) : k), ui = uiOf(r), now = Date.now(), FR = require("./relto-fresco"), SLATE = require("./slate");
  ctx.fillStyle = "rgba(0,0,0,0.66)"; ctx.fillRect(0, 0, W, H);
  stone(ctx, (h) => h, SL.x, SL.y, SL.w, SL.h, 0.015);
  const res = ui.result, faded = res && res.signs && res.signs.some(Boolean) ? 0.4 : 1;
  ctx.save(); ctx.beginPath(); ctx.ellipse(SL.x, SL.y, SL.w * 0.5, SL.h * 0.5, 0, 0, TAU); ctx.clip();
  chalkAll(ctx, ui.strokes, faded); if (ui.cur) chalk(ctx, ui.cur, 1);
  if (res && res.signs && !ui.cur) { /* les signes reconnus se posent, nets, par-dessus la craie de leur groupe */
    const gs = SLATE.groups(ui.strokes);
    res.signs.forEach((id, i) => { if (!id || !gs[i]) return; const b = boxOf(gs[i]), k = Math.min(1, (now - (res.at || 0)) / 400); FR.sign(ctx, id, b.x, b.y, b.s, 0.95 * k, "slate" + i, id === "serpent" ? "rgba(200,120,70,0.92)" : rgba(...CHALK, 0.95)); });
  }
  if (ui.hand) { const k = (now - ui.hand.at) / 1200; if (k < 1) handPrint(ctx, ui.hand.x, ui.hand.y, 70, 1 - k); else ui.hand = null; }
  ctx.restore();
  if (ui.hold && !ui.cur) { const k = Math.min(1, (now - ui.hold.at) / HOLD); ctx.strokeStyle = rgba(...CHALK, 0.25 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ui.hold.x, ui.hold.y, 26 * k, 0, TAU); ctx.stroke(); } /* l'appui long se voit venir : la main va se poser */
  const say = sentenceOf(res, TRr); if (say) { ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(233, 220, 184, 0.88); ctx.fillText(say, W / 2, 316); ctx.textAlign = "left"; }
  else if (!ui.strokes.length && !ui.cur) { ctx.font = "italic 14px serif"; ctx.textAlign = "center"; ctx.fillStyle = rgba(233, 220, 184, 0.6); ctx.fillText(TRr("slate.blank"), W / 2, 316); ctx.textAlign = "left"; }
  r.hot.push({ x: SL.x - SL.w / 2, y: SL.y - SL.h / 2, w: SL.w, h: SL.h, tip: "", slateArea: true });
  require("./relto-atelier").backButton(r, ctx, TRr("slate.back"), "desk");
  if (ui.dueAt && now >= ui.dueAt) relire(r); /* la pause : l'ardoise relit */
}
/** La phrase sous l'ardoise : les signes nommés (« La pluie et le feu. »), ou le trait qu'elle garde tel quel. Elle ne dit pas ce qu'ils comprendront. */
function sentenceOf(res, TRr) {
  if (!res || !res.signs || !res.signs.length) return "";
  if (res.signs.some((x) => !x)) return TRr("slate.unknown");
  const names = res.signs.map((id) => TRr(["slate.sign", id].join(".")));
  const low = (w) => w.charAt(0).toLowerCase() + w.slice(1); /* « La pluie et le feu », « Rain and fire » */
  return TRr("slate.seen", { signs: names.length > 1 ? TRr("slate.and", { a: names[0], b: low(names[1]) }) : names[0] });
}

/* ---- les gestes ---- */
function uiOf(r) {
  if (!r.slateUI) { const S = (r.opts.slateState && r.opts.slateState()) || {}; r.slateUI = { strokes: (S.strokes || []).map((s) => s.map((p) => p.slice())), cur: null, result: S.signs && S.signs.length ? { signs: S.signs.slice(), at: 0 } : null, dueAt: 0, hold: null, hand: null }; }
  return r.slateUI;
}
function relire(r) {
  const ui = uiOf(r); ui.dueAt = 0; if (!ui.strokes.length) { ui.result = null; return; }
  const out = r.opts.onSlateTrace ? r.opts.onSlateTrace(ui.strokes.map((s) => s.map((p) => p.slice()))) : null;
  ui.result = out ? { signs: out.signs, effect: out.effect, at: Date.now() } : null;
}
function erase(r, x, y) {
  const ui = uiOf(r); ui.strokes = []; ui.cur = null; ui.result = null; ui.dueAt = 0; ui.hand = { x, y, at: Date.now() };
  if (r.opts.onSlateErase) r.opts.onSlateErase(); if (r.opts.onRelic) r.opts.onRelic("put");
}
/** Le bouton (ou le doigt) se pose sur l'ardoise : un trait commence ; s'il ne bouge pas, c'est peut-être la main qui se pose. */
function down(r, e, x, y) {
  if (!inSlate(x, y)) return false;
  const ui = uiOf(r); ui.cur = [[x, y]]; ui.dueAt = 0; ui.hold = { x, y, at: Date.now() };
  r.chalk = true; try { r.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  clearTimeout(r._slateHold); r._slateHold = setTimeout(() => { const u = uiOf(r); if (u.hold && u.cur && u.cur.length <= 3) { r.chalk = false; erase(r, u.hold.x, u.hold.y); u.hold = null; if (!r.running) r.draw(0); } }, HOLD);
  if (!r.running) r.draw(0); return true;
}
function move(r, x, y) {
  const ui = uiOf(r); if (!ui.cur) return;
  const [px, py] = ui.cur[ui.cur.length - 1]; if (Math.hypot(x - px, y - py) < 1.6) return;
  ui.cur.push([Math.max(SL.x - SL.w / 2, Math.min(SL.x + SL.w / 2, x)), Math.max(SL.y - SL.h / 2, Math.min(SL.y + SL.h / 2, y))]);
  if (ui.hold && Math.hypot(x - ui.hold.x, y - ui.hold.y) > 6) ui.hold = null; /* il bouge : c'est un trait */
  if (!r.running) r.draw(0);
}
function up(r) {
  const ui = uiOf(r); r.chalk = false; clearTimeout(r._slateHold); ui.hold = null; if (!ui.cur) return;
  ui.strokes.push(ui.cur); ui.cur = null; ui.result = null; ui.dueAt = Date.now() + PAUSE; /* elle relira après une courte pause sans nouveau trait */
  setTimeout(() => { if (ui.dueAt && Date.now() >= ui.dueAt) { relire(r); if (!r.running) r.draw(0); } }, PAUSE + 30);
  if (!r.running) r.draw(0);
}

module.exports = { SL, PAUSE, HOLD, stone, onDesk, chalk, handPrint, drawSlateView, sentenceOf, uiOf, relire, erase, down, move, up, inSlate };
