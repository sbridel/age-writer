"use strict";
/**
 * Effets sur la fenêtre de liaison : au lieu d'une animation lisse, une image vivante mais
 * « découpée » (ondulation aquatique, déchirures, bruit statique, balayage). Quand l'Âge est
 * instable, la dégradation progresse : tremblements, ciel qui vire au violet puis au rouge,
 * ratures sur l'image, fissures. Le canvas d'origine reste en dessous (invisible) et alimente
 * un canvas de superposition recomposé à chaque image.
 */
const { rng, clamp, smooth, fnv } = require("./util");
const G = require("./genscene");
const D = require("./damagefx");
const { clockPhases } = require("./sky");

/** Paramètres d'effet pour un niveau d'instabilité u (0..1). Pur, testable. */
const MODES = ["classic", "static", "ripple", "sweep"];
/** « random » : un mode stable pour un même Âge (même graine → même effet). */
function resolveMode(mode, seed) { return mode === "random" ? MODES[fnv(String(seed || "")) % MODES.length] : mode; }

function fxParams(unrest, triggered = [], mode = "classic", strength = 1, opts = {}) {
  const tv = mode === "tv"; if (tv) mode = "static";
  const u = clamp(unrest), s = clamp(strength, 0, 2);
  const strong = triggered.filter((t) => t.severity === "strong").length;
  const medium = triggered.filter((t) => t.severity === "medium").length;
  const classic = mode === "classic", ripple = classic || mode === "ripple", stat = classic || mode === "static", sweep = classic || mode === "sweep";
  return {
    u, strong, medium,
    ripple: ripple ? (mode === "ripple" ? 1.2 + 2.5 * u : 0.5 + 2 * u) * s : 0,
    tearP: stat ? (0.03 + 0.45 * u + 0.1 * strong) * s : 0.4 * u * s,
    tearMag: 3 + 14 * (0.3 + u),
    noise: stat ? (0.06 + 0.28 * u + 0.05 * strong) * s : 0.15 * u,
    scan: stat ? 0.07 : 0,
    sweep: sweep ? 0.1 * s : 0,
    violet: smooth((u - 0.25) / 0.5) * 0.45,
    red: smooth((u - 0.6) / 0.4) * 0.4,
    tremor: Math.max(0, u - 0.2) * 3.5 * s,
    scribbles: Math.floor(Math.max(0, u - 0.4) * 40),
    cracks: Math.min(12, strong * 2 + medium + Math.floor(Math.max(0, u - 0.5) * 10)),
    desat: u * 0.6,
    // vieille télé (livre-piège) : image floue, neige dense, bandes qui roulent
    tv: tv ? { blur: 3.5, snow: 0.34 * Math.max(0.6, s), roll: 1 } : null,
    // liaison incertaine : coupures de l'image par des parasites, de plus en plus fréquentes
    dropP: opts.uncertain && u > 0.3 ? (0.02 + 0.22 * (u - 0.3)) * Math.max(0.3, s) : 0,
  };
}

/**
 * Un livre abîmé n'est pas sûr : sous u≈0.3 la liaison réussit toujours ; au-delà elle peut
 * vaciller (échec, on réessaie) ou glisser vers un autre livre du même Âge. Pur : r ∈ [0,1[.
 */
function rollLink(u, r, others = 0, dmg = null) {
  const x = clamp((u - 0.3) / 0.7), d = dmg || { damaged: 0, removed: 0 };
  // pages abîmées : la liaison vacille ; pages arrachées : elle s'égare
  const pFlicker = Math.min(0.6, 0.45 * x + 0.05 * (d.damaged || 0)), pAstray = others > 0 ? Math.min(0.35, 0.3 * x + 0.07 * (d.removed || 0)) : 0;
  if (r < pFlicker) return { kind: "flicker" };
  if (r < pFlicker + pAstray) return { kind: "astray", pick: Math.floor(((r - pFlicker) / (pAstray || 1)) * 997) };
  return { kind: "ok" };
}

/** Niveau d'instabilité à partir d'une analyse, ou d'un simple verdict. */
function unrestOf(a) {
  const pen = a && a.damage ? Math.min(0.9, 0.08 * (a.damage.damaged || 0) + 0.15 * (a.damage.removed || 0)) : 0; // pages abîmées/arrachées : la liaison seule
  if (a && typeof a.stability === "number") return clamp(1 - a.stability / 100 + pen);
  const v = a && a.verdict;
  return v === "dying" ? 0.85 : v === "unstable" ? 0.45 : 0.08;
}

class LinkFx {
  /**
   * @param {HTMLElement} win       conteneur (.age-panel__window)
   * @param {HTMLCanvasElement|HTMLImageElement} source
   * @param {{unrest:number, triggered:object[], seed:string, mode:string, strength:number, reduced:boolean}} o
   */
  constructor(win, source, o) {
    this.win = win; this.source = source; this.o = o;
    this.p = fxParams(o.unrest, o.triggered, o.mode, o.strength, { uncertain: o.uncertain });
    if (this.p.tv) { this.p.noise = Math.max(this.p.noise, this.p.tv.snow); this.p.tearP = Math.max(this.p.tearP, 0.3); this.p.scan = 0.2; this.p.desat = 0.9; this.p.tremor = Math.max(this.p.tremor, 1.2); this.p.sweep = 0; }
    this.dropUntil = 0;
    const sw = source.width || source.naturalWidth || 240, sh = source.height || source.naturalHeight || 144;
    this.W = o.gen ? (o.gen.res || 320) : Math.min(320, sw || 240); this.H = Math.round(this.W * ((sh || 144) / (sw || 240)));
    this.canvas = document.createElement("canvas"); this.canvas.className = "age-linkfx";
    this.canvas.width = this.W; this.canvas.height = this.H;
    this.ctx = this.canvas.getContext("2d");
    win.appendChild(this.canvas); source.style.opacity = "0";
    // la hauteur du conteneur doit rester celle du média : on place le canvas par-dessus
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:auto;";
    const r = rng(fnv(o.seed || "fx"));
    this.noise = [0, 1, 2, 3].map(() => this.makeNoise(r));
    this.scribbles = Array.from({ length: 48 }, () => { const x = r() * this.W, y = r() * this.H; return [x, y, x + (r() - 0.5) * 60, y + (r() - 0.5) * 18, r()]; });
    this.cracks = D.branchCracks(r, this.W, this.H, 12); // fractures ramifiées, tirées de la graine
    this.dmgPlan = o.mode !== "off" && o.dmg && (o.dmg.damaged || o.dmg.removed) ? D.plan(o.seed || "fx", o.dmg, this.W, this.H) : null; // pages abîmées / arrachées
    this.frzAt = -1e9;
    if (o.gen) { // fenêtre génératrice : le paysage est dessiné ici, la source d'origine reste cachée
      this.model = G.build(o.gen, this.W, this.H); this.genCanvas = document.createElement("canvas"); this.genCanvas.width = this.W; this.genCanvas.height = this.H; this.gctx = this.genCanvas.getContext("2d");
    }
    this.tears = []; this.rr = r; this.visible = true; this.last = 0; this.frame = 0;
  }

  makeNoise(r) {
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), d = g.createImageData(64, 64);
    for (let i = 0; i < d.data.length; i += 4) { const v = r() < 0.5 ? 0 : 255, a = r() < 0.55 ? r() * 255 : 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = a; }
    g.putImageData(d, 0, 0); return c;
  }

  ready() {
    if (this.model) return !!this.gctx;
    const s = this.source;
    return s.tagName === "IMG" ? s.complete && s.naturalWidth > 0 && s.naturalHeight > 0 : s.width > 0 && s.height > 0;
  }

  tick(ms) {
    if (!this.ready()) return;
    const { ctx, W, H, p } = this, t = ms / 1000;
    let s = this.source;
    if (this.model) {
      const cp = clockPhases(this.o.gen); // jour réel (day_length) et saison (year_length) ; sinon le jour boucle sur l'animation
      G.paint(this.gctx, this.model, this.still != null ? this.still : (ms % G.PERIOD) / G.PERIOD, { day: cp ? cp.day : undefined, season: cp ? cp.season : 0, clock: Date.now() / 1000 });
      s = this.genCanvas;
    }
    const sw = s.width || s.naturalWidth, sh = s.height || s.naturalHeight;
    this.frame++;
    ctx.save(); ctx.clearRect(0, 0, W, H);
    // filtre (flou télé, désaturation) appliqué une fois à l'image entière, sur un canvas intermédiaire,
    // puis découpé en lignes : jamais un filtre par ligne (coûteux, et le flou d'une ligne de 1 px la fait disparaître)
    const filt = p.tv ? `blur(${(p.tv.blur * (0.8 + 0.3 * Math.sin(t * 2.3))).toFixed(1)}px) grayscale(0.85) contrast(1.15) brightness(${(1.25 + 0.25 * Math.sin(t * 13) * Math.sin(t * 3.1)).toFixed(2)})`
      : p.desat > 0.02 ? `saturate(${(1 - p.desat).toFixed(2)}) contrast(${(1 + 0.25 * p.u).toFixed(2)})` : null;
    let img = s, iw = sw, ih = sh;
    if (filt) {
      if (!this.pre) { this.pre = document.createElement("canvas"); this.pre.width = W; this.pre.height = H; this.pctx = this.pre.getContext("2d"); }
      const g = this.pctx; g.clearRect(0, 0, W, H); g.filter = filt; g.drawImage(s, 0, 0, sw, sh, 0, 0, W, H); g.filter = "none";
      img = this.pre; iw = W; ih = H;
    }
    const ry = ih / H;
    // coupure : l'image disparaît sous les parasites pendant un instant
    if (p.dropP > 0 && t > this.dropUntil && this.rr() < p.dropP) this.dropUntil = t + 0.12 + this.rr() * 0.4;
    const dropped = t < this.dropUntil;
    // tremblement de terre : rafales
    if (p.tremor > 0 && Math.sin(t * 0.9) > 0.55) ctx.translate((this.rr() - 0.5) * p.tremor * 2, (this.rr() - 0.5) * p.tremor);
    // déchirures
    this.tears = this.tears.filter((x) => x.until > t);
    if (this.rr() < p.tearP) this.tears.push({ y: Math.floor(this.rr() * H), h: 2 + Math.floor(this.rr() * 12), dx: (this.rr() - 0.5) * 2 * p.tearMag, until: t + 0.08 + this.rr() * 0.25 });
    if (p.ripple < 0.05 && !this.tears.length) ctx.drawImage(img, 0, 0, iw, ih, 0, 0, W, H);
    else for (let y = 0; y < H; y++) {
      let dx = p.ripple * Math.sin(y * 0.33 + t * 2.2) + p.ripple * 0.4 * Math.sin(y * 0.11 - t * 1.3);
      for (const tr of this.tears) if (y >= tr.y && y < tr.y + tr.h) dx += tr.dx;
      ctx.drawImage(img, 0, y * ry, iw, Math.max(1, ry), dx, y, W, 1);
    }
    if (dropped) { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(20,20,22,0.8)"; ctx.fillRect(0, 0, W, H); }
    if (this.dmgPlan) {
      if (this.dmgPlan.zones.some((z) => z.kind === "freeze") && t - this.frzAt > 2.4) { // image « figée » : copie rafraîchie toutes les 2,4 s
        if (!this.frz) { this.frz = document.createElement("canvas"); this.frz.width = W; this.frz.height = H; this.fctx = this.frz.getContext("2d"); }
        this.fctx.clearRect(0, 0, W, H); this.fctx.drawImage(img, 0, 0, iw, ih, 0, 0, W, H); this.frzAt = t;
      }
      D.drawDamage(ctx, this.dmgPlan, img, iw, ih, W, H, t, this.frz, this.noise[0], "zones");
    }
    // teintes d'instabilité
    ctx.globalCompositeOperation = "source-atop";
    if (p.violet > 0.01) { ctx.fillStyle = `rgba(110,40,150,${p.violet.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    if (p.red > 0.01) { ctx.fillStyle = `rgba(170,24,30,${(p.red * (0.8 + 0.2 * Math.sin(t * 3))).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = "source-over";
    if (this.dmgPlan) D.drawDamage(ctx, this.dmgPlan, img, iw, ih, W, H, t, this.frz, this.noise[0], "holes");
    // ratures
    if (p.scribbles > 0) {
      ctx.strokeStyle = "rgba(12,9,7,0.75)"; ctx.lineWidth = 1;
      for (let i = 0; i < Math.min(p.scribbles, this.scribbles.length); i++) {
        const [x1, y1, x2, y2] = this.scribbles[i]; ctx.beginPath(); ctx.moveTo(x1, y1);
        const n = 5; for (let k = 1; k <= n; k++) ctx.lineTo(x1 + (x2 - x1) * k / n + (k % 2 ? 2 : -2), y1 + (y2 - y1) * k / n + (k % 2 ? -3 : 3));
        ctx.stroke();
      }
      if (p.u > 0.75) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(W - 8, H - 6); ctx.moveTo(W - 8, 6); ctx.lineTo(8, H - 6); ctx.stroke(); }
    }
    // fissures spatiales : ramifiées, elles s'ouvrent à mesure que l'instabilité monte
    if (p.cracks > 0) D.drawCracks(ctx, this.cracks, p.cracks, clamp(0.3 + p.u * 0.9 + p.strong * 0.12), t);
    // bruit statique + lignes de balayage
    if (p.noise > 0.01 || dropped) {
      ctx.globalAlpha = dropped ? 0.95 : clamp(p.noise);
      for (let i = 0; i < 2; i++) { const n = this.noise[(this.frame + i) % 4]; ctx.drawImage(n, -Math.floor(this.rr() * 64), -Math.floor(this.rr() * 64), W + 64, H + 64); }
      ctx.globalAlpha = 1;
    }
    if (p.scan > 0) { ctx.fillStyle = `rgba(0,0,0,${p.scan})`; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
    if (p.sweep > 0) {
      const y = ((t * 0.28) % 1.4 - 0.2) * H, g = ctx.createLinearGradient(0, y - 12, 0, y + 12);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, `rgba(255,255,255,${p.sweep})`); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, y - 12, W, 24);
    }
    if (p.tv) {
      const by = ((t * 0.35) % 1.3 - 0.15) * H, bg = ctx.createLinearGradient(0, by - 22, 0, by + 22);
      bg.addColorStop(0, "rgba(0,0,0,0)"); bg.addColorStop(0.5, "rgba(0,0,0,0.5)"); bg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = bg; ctx.fillRect(0, by - 22, W, 44);
      if (this.rr() < 0.18) { ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(0, Math.floor(this.rr() * H), W, 1 + Math.floor(this.rr() * 2)); }
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  destroy() { if (this.io) try { this.io.disconnect(); } catch (e) { /* ignore */ } this.canvas.remove(); this.source.style.opacity = ""; }
}

/** Boucle commune : une seule requestAnimationFrame pour toutes les fenêtres. */
const loop = { list: new Set(), raf: 0 };
function step(ts) {
  for (const fx of [...loop.list]) {
    if (!fx.win.isConnected) {
      // jamais affichée : abandon après ~5 s ; détachée (vue de lecture qui décharge les sections lointaines,
      // note fermée) : on la garde 2 min, au cas où elle revient au défilement
      if (!fx.seen) { if (++fx.wait > 300) { loop.list.delete(fx); if (fx.io) fx.io.disconnect(); } }
      else if ((fx.goneAt = fx.goneAt || ts) && ts - fx.goneAt > 120000) { loop.list.delete(fx); if (fx.io) fx.io.disconnect(); }
      continue;
    }
    fx.seen = true; fx.goneAt = 0;
    if (!fx.visible || ts - fx.last < 66) continue; // ~15 images/s
    fx.last = ts;
    try { fx.tick(ts); } catch (e) { console.warn("[Age Writer ext] linkfx", e); loop.list.delete(fx); try { fx.destroy(); } catch (x) { /* ignore */ } }
  }
  loop.raf = loop.list.size ? requestAnimationFrame(step) : 0;
}

function attach(win, source, o) {
  if (o && o.mode) o = { ...o, mode: resolveMode(o.mode, o.seed) };
  if (!source || (o.mode === "off" && !o.gen)) return null;
  // une seule superposition par fenêtre (un nouveau rendu de la même fenêtre remplace l'ancienne)
  for (const old of [...loop.list]) if (old.win === win) { loop.list.delete(old); old.destroy(); }
  const fx = new LinkFx(win, source, o); fx.seen = false; fx.wait = 0; fx.goneAt = 0;
  if (o.mode === "off") { fx.p = fxParams(0, [], "sweep", 0); fx.p.sweep = 0; fx.p.ripple = 0; fx.p.tearP = 0; fx.p.tremor = 0; fx.p.dropP = 0; fx.p.noise = 0; fx.p.scan = 0; fx.p.desat = 0; fx.p.violet = 0; fx.p.red = 0; fx.p.scribbles = 0; fx.p.cracks = 0; }
  if (typeof IntersectionObserver !== "undefined") { try { fx.io = new IntersectionObserver((es) => { fx.visible = es[es.length - 1].isIntersecting; }); fx.io.observe(win); } catch (e) { /* ignore */ } }
  if (o.reduced) { fx.still = 0.3; fx.p = fxParams(o.unrest, o.triggered, "sweep", 0); fx.p.sweep = 0; fx.p.ripple = 0; fx.p.tearP = 0; fx.p.tremor = 0; fx.p.dropP = 0; fx.tick(0); if (source.tagName === "IMG" && !source.complete) source.addEventListener("load", () => fx.tick(0)); return fx; }
  loop.list.add(fx); if (!loop.raf) loop.raf = requestAnimationFrame(step);
  return fx;
}

module.exports = { rollLink, MODES, resolveMode, fxParams, unrestOf, LinkFx, attach };
