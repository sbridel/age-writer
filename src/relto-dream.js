"use strict";
/**
 * Le Rêve (vue `dream`, étape 4d ; claude/DESIGN-reve-et-caverne-bahro.md, section 20). Tout est dessiné ici.
 * L'Âge posé sur l'Imageur, peint par le rendu des fenêtres (src/genscene.js), mais vu de l'autre côté : en miroir, dans le
 * bleu de la chambre aux étoiles, une image qui respire, des bords qui se défont en poussière. Les tirages voisins (les
 * possibles) passent lentement dans l'image l'un après l'autre. Les fautes mûries sont des blessures dans l'image, les
 * merveilles des points de lumière ; avec un guide, leur phrase vient au survol, et ce qu'on a regardé reste au réveil.
 * Le rêve s'éteint seul au bout d'une minute (src/dream.js, LENGTH) ; la flèche ramène à la caverne. On n'y agit pas.
 * `r.dream` : { age, at, data: { seed, name, models, items } | null, seen: Set, guided, guide }.
 */
const { rgba, clamp, fnv } = require("./util");
const G = require("./genscene");
const D = require("./dream");
const CAT = require("./wonders");
const W = 640, H = 360, TAU = Math.PI * 2;
const TR = (r) => (r.imagerTr ? r.imagerTr() : (k) => k);
const q = (k) => (fnv("dream|" + k) % 10000) / 10000;

/** La fenêtre d'un tirage : un canevas repeint quelques fois par seconde. */
function canvasOf(r, k, m, t) {
  const cache = (r._dreamCv = r._dreamCv || {}); let c = cache[k];
  if (!c || c.m !== m) {
    const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : (typeof document !== "undefined" ? Object.assign(document.createElement("canvas"), { width: W, height: H }) : null);
    if (!cv) return null; c = cache[k] = { cv, m, at: -1 };
  }
  if (t - c.at > 0.1 || c.at < 0) { c.at = t; try { G.paint(c.cv.getContext("2d"), c.m, (0.46 + 0.02 * Math.sin(t * 0.05)) % 1, { day: 0.5, clock: 12 }); } catch (e) { /* un tirage qui échoue reste vide */ } }
  return c.cv;
}

/** Un fond de nuit étoilée : avant que l'image vienne, et autour d'elle. */
function night(ctx, t) {
  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 420); bg.addColorStop(0, "#0b1438"); bg.addColorStop(1, "#02030c"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { const x = q("sx" + i) * W, y = q("sy" + i) * H, s = q("ss" + i), a = (0.25 + 0.6 * s) * (0.5 + 0.5 * Math.sin(t * (0.5 + s) + i)); ctx.fillStyle = rgba(215, 228, 255, a); ctx.fillRect(x, y, s > 0.9 ? 1.6 : 1, s > 0.9 ? 1.6 : 1); }
}

/** Une blessure (une faute mûrie) : une déchirure sombre, et sur ses bords une lumière froide qui bat. */
function wound(ctx, x, y, k, t, hov) {
  const pulse = 0.55 + 0.45 * Math.sin(t * 1.3 + k * 2.1), n = 6, pts = [];
  for (let i = 0; i <= n; i++) pts.push([x - 18 + (i / n) * 36, y + (q("wy" + k + i) - 0.5) * 9 + (i % 2 ? 3 : -3)]);
  const g = ctx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, rgba(150, 190, 255, (hov ? 0.3 : 0.16) * pulse)); g.addColorStop(1, rgba(150, 190, 255, 0)); ctx.fillStyle = g; ctx.fillRect(x - 36, y - 36, 72, 72);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(2, 4, 16, 0.9); ctx.lineWidth = 3.4; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  ctx.strokeStyle = rgba(200, 225, 255, (hov ? 0.95 : 0.6) * pulse); ctx.lineWidth = 0.9; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py - 1.6) : ctx.moveTo(px, py - 1.6))); ctx.stroke();
}
/** L'autre face d'une merveille : un point de lumière qui tient, quatre branches fines. */
function glint(ctx, x, y, k, t, hov) {
  const pulse = 0.7 + 0.3 * Math.sin(t * 0.9 + k), L = (hov ? 16 : 12) * pulse;
  const g = ctx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, rgba(255, 236, 190, 0.55 * pulse)); g.addColorStop(1, rgba(255, 220, 160, 0)); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
  ctx.strokeStyle = rgba(255, 244, 215, 0.85 * pulse); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
  ctx.fillStyle = rgba(255, 252, 240, 0.95); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
}
/** Un possible : un cercle de poussière qui se forme quand son tirage passe dans l'image. */
function ripple(ctx, x, y, k, t, a, hov) {
  if (a < 0.05) return;
  for (let i = 0; i < 3; i++) { const p = ((t * 0.35 + i / 3 + q("rp" + k)) % 1), rr = 6 + p * 22; ctx.strokeStyle = rgba(180, 210, 255, a * (1 - p) * (hov ? 0.9 : 0.6)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.45, 0, 0, TAU); ctx.stroke(); }
  for (let i = 0; i < 10; i++) { const an = q("rd" + k + i) * TAU, d = 4 + q("re" + k + i) * 14; ctx.fillStyle = rgba(220, 235, 255, a * 0.7); ctx.fillRect(x + Math.cos(an + t * 0.2) * d, y + Math.sin(an + t * 0.2) * d * 0.45, 1, 1); }
}

/** La phrase d'une chose (seulement avec un guide). */
function sentence(tr, it) {
  if (it.kind === "fault") return it.text;
  if (it.kind === "possible") return tr("dream.possible", { b: it.id });
  const fr = tr("relto.memories.lang") === "fr";
  return tr("dream.wonder", { w: CAT.nameOf(it.id, fr), a: it.a, b: it.b, k: it.keystone || it.a });
}

function drawDream(r, ctx, sc, sky, t) {
  const tr = TR(r), d = r.dream;
  night(ctx, t);
  if (!d) { r.setView && r.view === "dream" && r.setView("memories"); return; }
  const el = (Date.now() - d.at) / 1000, len = D.LENGTH / 1000;
  if (el > len) { r.setView("memories"); return; } /* le rêve s'éteint seul ; le réveil est fait par setView */
  if (!d.data) { /* il vient */
    ctx.fillStyle = rgba(200, 215, 255, 0.35 + 0.25 * Math.sin(t * 2)); ctx.font = "italic 15px serif"; ctx.textAlign = "center"; ctx.fillText(d.failed ? tr("dream.none") : "…", W / 2, H / 2); ctx.textAlign = "left";
    if (d.failed && el > 3) r.setView("memories");
  } else {
    const fadeIn = clamp(el / 3), fadeOut = clamp((len - el) / 5), A = fadeIn * fadeOut, models = d.data.models || [];
    ctx.save(); ctx.translate(W / 2, H / 2); const br = 1.03 + 0.012 * Math.sin(t * 0.35); ctx.scale(-br, br); ctx.translate(-W / 2, -H / 2); /* de l'autre côté : en miroir ; elle respire */
    const main = models[0] && canvasOf(r, 0, models[0], t);
    if (main) { ctx.globalAlpha = A; ctx.drawImage(main, 0, 0, W, H); }
    for (let k = 1; k < models.length; k++) { const cv = canvasOf(r, k, models[k], t + k * 3.1); if (!cv) continue; ctx.globalAlpha = A * D.altWeight(k - 1, el); ctx.drawImage(cv, 0, 0, W, H); } /* les tirages voisins passent, l'un après l'autre */
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = "color"; ctx.fillStyle = rgba(70, 110, 235, 0.8 * A); ctx.fillRect(0, 0, W, H); ctx.restore(); /* le bleu de la chambre à la place de ses couleurs */
    ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = rgba(120, 150, 255, 0.25 * A); ctx.fillRect(0, 0, W, H); ctx.restore();
    /* les bords se défont : la nuit les reprend, et la poussière s'en détache */
    const v = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 360); v.addColorStop(0, "rgba(2,3,12,0)"); v.addColorStop(0.7, "rgba(2,3,12,0.35)"); v.addColorStop(1, "rgba(2,3,12,0.95)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const an = q("da" + i) * TAU, p = (t * (0.03 + q("dv" + i) * 0.04) + q("dw" + i)) % 1, rad = 190 + p * 190, x = W / 2 + Math.cos(an) * rad * 1.15, y = H / 2 + Math.sin(an) * rad * 0.62; ctx.fillStyle = rgba(205, 222, 255, 0.7 * (1 - p) * A); ctx.fillRect(x, y, 1.2, 1.2); }
    /* les choses du rêve : des blessures, des points de lumière, des possibles qui passent (en miroir, comme l'image) */
    const items = d.data.items || [];
    items.forEach((it, k) => {
      const x = W - it.x, y = it.y, hov = r.hover && r.hover.dreamItem === it.key, a = it.kind === "possible" ? D.altWeight(it.alt || 0, el) / 0.6 : 1;
      ctx.save(); ctx.globalAlpha = A;
      if (it.kind === "fault") wound(ctx, x, y, k, t, hov); else if (it.kind === "wonder") glint(ctx, x, y, k, t, hov); else ripple(ctx, x, y, k, t, a, hov);
      ctx.restore();
      if (d.guided && A > 0.4 && (it.kind !== "possible" || a > 0.35)) r.hot.push({ x: x - 24, y: y - 18, w: 48, h: 36, tip: sentence(tr, it), dreamItem: it.key });
    });
    if (r.hover && r.hover.dreamItem) d.seen.add(r.hover.dreamItem); /* ce qu'on a regardé de près */
    if (d.guided) { /* le guide : l'orbe qui nous a suivis, en bas à droite */
      const gx = W - 44, gy = H - 46 + 4 * Math.sin(t * 0.8), gg = ctx.createRadialGradient(gx, gy, 2, gx, gy, 26); gg.addColorStop(0, rgba(200, 220, 255, 0.5 * A)); gg.addColorStop(1, rgba(160, 190, 255, 0)); ctx.fillStyle = gg; ctx.fillRect(gx - 26, gy - 26, 52, 52);
      ctx.strokeStyle = rgba(220, 232, 255, 0.7 * A); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(gx, gy, 11, 0, TAU); ctx.stroke(); ctx.fillStyle = rgba(255, 255, 255, 0.6 * A); ctx.beginPath(); ctx.ellipse(gx - 4, gy - 5, 2.4, 1.1, -0.6, 0, TAU); ctx.fill();
      r.hot.push({ x: gx - 14, y: gy - 14, w: 28, h: 28, tip: tr("dream.guide.with") });
    }
  }
  require("./relto-atelier").backButton(r, ctx, tr("dream.wake"), "memories");
  void sc; void sky;
}

module.exports = { drawDream };
