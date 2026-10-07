"use strict";
/**
 * Rendu canvas 2D du Relto : une île flottante au-dessus d'une mer de nuages.
 * Tout est procédural et déterministe (graine = seed du Relto), animé par le temps.
 */
const { rng, clamp, lerp, frac, mix, rgba, hexa, fnv } = require("./util");
const { skyAt, hourFor } = require("./relto-model");
const SC = require("./relto-scenery");
const GL = require("./relto-global");

const W = 640, H = 360, GY = 208; // largeur, hauteur logiques ; ligne de sol

const TERRAIN = {
  volcanic_plateau: { rock: "#2a2522", rock2: "#3b322c", top: "#4a4038", tuft: "#3f4d33", glow: "#ff7a30" },
  mossy_plateau: { rock: "#2b3028", rock2: "#3a4234", top: "#4f6b3c", tuft: "#6a9150", glow: null },
  sand_island: { rock: "#6b5a44", rock2: "#85704f", top: "#c2a76f", tuft: "#a89a52", glow: null },
  glacier: { rock: "#516b80", rock2: "#6f8ea3", top: "#c9dfec", tuft: "#e4f1f8", glow: null },
  obsidian_plateau: { rock: "#120f16", rock2: "#201a2a", top: "#2a2236", tuft: "#3b2f4a", glow: "#8a5cff" },
};
/** Koï rares du bassin (page « koi », option `rare=`). */
const KOI_RARE = {
  ogon: { label: "ogon (gold)", title: "Ogon", body: "#e8b838", spot: "#fff3b0", glow: "rgba(255,214,90,0.85)", glow2: "rgba(255,190,60,0.3)", spark: "rgba(255,236,150,A)" },
  platinum: { label: "platinum", title: "Platinum", body: "#fbfcff", spot: "#b8c6d8", glow: "rgba(235,245,255,0.9)", glow2: "rgba(200,225,255,0.3)", spark: "rgba(235,245,255,A)" },
  ghost: { label: "ghost", title: "Ghost", body: "#cfe0ee", spot: "#aac4dc", glow: "rgba(190,215,255,0.6)", glow2: "rgba(160,190,255,0.22)", spark: "rgba(190,215,255,A)", alpha: 0.6 },
};
/** Robes du chat (page « cat », option `color=`) ; un code #rrggbb est aussi accepté. */
const CATS = {
  black: { label: "black", fur: "#1d1b20", tail: "#1d1b20", eyes: "#e6c64a" },
  white: { label: "white", fur: "#efeae0", tail: "#efeae0", eyes: "#6fa8d8", ears: "#e8c5c0" },
  orange: { label: "orange", fur: "#d9822b", tail: "#d9822b", eyes: "#7fb04a", belly: "#f0c08a", stripes: "#b5611a", muzzle: "#f0c08a" },
  grey: { label: "grey", fur: "#7d8590", tail: "#7d8590", eyes: "#d8c050", belly: "#a9b0b8" },
  cream: { label: "cream", fur: "#e8cfa0", tail: "#e8cfa0", eyes: "#6fa8d8", belly: "#f4e6c8" },
  tabby: { label: "tabby", fur: "#8d6b45", tail: "#6a4e30", eyes: "#7fb04a", belly: "#c9ae86", stripes: "#4a3420" },
  calico: { label: "calico", fur: "#efeae0", tail: "#d9822b", eyes: "#7fb04a", patch: "#d9822b", ears: "#2a2420" },
  tuxedo: { label: "tuxedo", fur: "#1d1b20", tail: "#1d1b20", eyes: "#7fb04a", belly: "#efeae0", paws: "#efeae0", muzzle: "#efeae0" },
  siamese: { label: "siamese", fur: "#ecd9b8", tail: "#4a3a30", eyes: "#6fa8d8", ears: "#4a3a30", face: "#d8c4a0", paws: "#4a3a30", muzzle: "#4a3a30" },
};
function catLook(color) {
  const key = String(color || "").trim().toLowerCase();
  if (CATS[key]) return CATS[key];
  if (/^#?[0-9a-f]{6}$/.test(key)) { const c = key.startsWith("#") ? key : "#" + key; return { label: c, fur: c, tail: c, eyes: "#7fb04a" }; }
  return CATS.orange;
}
const VERDICT = { stable: "#8fae6a", unstable: "#d9a24a", dying: "#c0553f", unknown: "#7a7a8a" };
const BOOKS = ["#7a3b2a", "#2f4a3a", "#3a3f6a", "#6a5a2a", "#5a2f4a", "#2f5a5a"];
const CAM = 1.2, CAM_X = 320, CAM_Y = 214, CAM_OY = 196; // zoom sur l'île
const HUT_X = 245, SHELF_X = 352, PILLAR_X = [425, 462], PLATE_X = 318, SHELF_SCALE = 0.68;

function makeCanvas(w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
}

class ReltoRenderer {
  /** @param {HTMLCanvasElement} canvas  @param {import('./dni').Dni} dni */
  constructor(canvas, dni, opts = {}) {
    this.canvas = canvas; this.dni = dni;
    this.opts = { onOpen: null, onView: null, onSpecial: null, onHover: null, reducedMotion: false, ...opts };
    this.ctx = canvas.getContext("2d");
    // résolution : assez fine pour un écran HiDPI, sans dépasser 1280×720 (redessiné 30 fois par seconde)
    this.scale = Math.min(2, ((typeof devicePixelRatio === "number" ? devicePixelRatio : 1) || 1) * 1.25);
    canvas.width = Math.round(W * this.scale); canvas.height = Math.round(H * this.scale);
    this.hourOverride = null;
    this.hover = null; this.pointer = null; this.hot = [];
    this.running = false;
    this.sprite = this.makeSprite();
    this.layers = [makeCanvas(W, 140), makeCanvas(W, 140), makeCanvas(W, 140)];
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    canvas.addEventListener("pointerleave", () => { this.hover = null; this.pointer = null; this.canvas.style.cursor = ""; });
    canvas.addEventListener("click", (e) => this.onClick(e));
    // pas de dessin quand le canvas est hors écran ou l'onglet caché
    this.visible = true;
    if (typeof IntersectionObserver !== "undefined") { try { this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; }); this.io.observe(canvas); } catch (e) { /* ignore */ } }
  }

  makeSprite() {
    const s = makeCanvas(64, 64), g = s.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return s;
  }

  setScene(scene) {
    this.scene = scene;
    const r = rng(scene.seed);
    const g = (this.geo = { stars: [], clouds: [[], [], []], outline: [], strata: [], tufts: [], plants: [], books: [], flies: [], flakes: [] });
    for (let i = 0; i < 90; i++) g.stars.push({ x: r() * W, y: r() * 215, r: 0.5 + r() * 1.1, ph: 1 + r() * 3 });
    [[26, 0], [22, 1], [18, 2]].forEach(([n, L]) => { for (let i = 0; i < n; i++) g.clouds[L].push({ x: r() * W, y: 40 + r() * 70 - L * 12, s: 38 + r() * 56, a: 0.6 + r() * 0.4 }); });
    // contour de l'île : bord supérieur irrégulier, flancs en escaliers, pointe en bas
    const top = [], right = [[470, 207], [466, 226], [452, 246], [441, 262], [420, 286], [398, 306], [372, 330], [348, 352], [330, 372]];
    for (let x = 170; x <= 470; x += 20) top.push([x, GY - 1 - r() * 3]);
    const left = right.map(([x, y]) => [640 - x, y]).reverse();
    g.outline = [...top, ...right.slice(1).map(([x, y]) => [x + (r() - 0.5) * 6, y]), ...left.slice(0, -1).map(([x, y]) => [x + (r() - 0.5) * 6, y])];
    for (let i = 0; i < 26; i++) { const y = GY + 8 + r() * 120, w = 30 + r() * 120; g.strata.push([320 - w / 2 - (y - GY) * 0.1 + r() * 20, y, w * (1 - (y - GY) / 220)]); }
    for (let x = 172; x < 470; x += 6 + r() * 6) g.tufts.push([x, 2 + r() * 4]);
    // végétation : on laisse libres le chat, le bassin et les deux livres à part (rien ne doit les cacher)
    const clear = [[374, 404]]; if (scene.additions.some((a) => a.type === "cat")) clear.push([190, 216]); if (scene.additions.some((a) => a.type === "koi")) clear.push([276, 340]);
    g.clear = clear;
    const TALL = { ponderosa: [62, 18], maple: [44, 16], crystal: [46, 16] };
    for (const a of scene.additions.filter((a) => a.type === "vegetation")) {
      const n = Math.round(4 + a.density * 14), pr = rng(scene.seed ^ fnv(a.pageId || a.asset || "v"));
      let guard = 0;
      while (g.plants.filter((p) => p.page === a.pageId).length < n && guard++ < 200) {
        const x = 184 + pr() * 272;
        if (clear.some(([c0, c1]) => x > c0 && x < c1) || Math.abs(x - HUT_X) < 30 || Math.abs(x - SHELF_X) < 24 || x > PILLAR_X[0] - 12 && x < PILLAR_X[1] + 12) continue;
        // les arbres sont grands et toujours à l'arrière-plan (derrière cabane, étagère, bassin, chat) ; seules les fougères basses peuvent passer devant
        const low = (a.asset || "conifer") === "fern", row = low ? (pr() < 0.5 ? 0 : 1) : 0;
        g.plants.push({ x, row, h: low ? 12 + pr() * 8 : (TALL[a.asset] || [40, 18])[0] + pr() * (TALL[a.asset] || [40, 18])[1], sw: pr() * 6.28, kind: a.asset || "conifer", page: a.pageId });
      }
    }
    g.plants.sort((a, b) => a.row - b.row || a.x - b.x);
    // livres de l'étagère
    scene.ages.slice(0, 30).forEach((age, i) => {
      const h = fnv(age.name);
      g.books.push({ age, row: Math.floor(i / 10), col: i % 10, w: 3.4 + (h % 3) * 0.7, h: 8 + ((h >> 3) % 4), color: BOOKS[h % BOOKS.length] });
    });
    for (let i = 0; i < 26; i++) g.flies.push({ x: 190 + r() * 270, y: 150 + r() * 60, ph: r() * 6.28, sp: 0.3 + r() * 0.6, rr: 8 + r() * 24 });
    for (let i = 0; i < 160; i++) g.flakes.push({ x: r() * W, y: r() * H, sp: 18 + r() * 30, dr: r() * 6.28, s: 0.8 + r() * 1.6 });
  }

  setHour(h) { this.hourOverride = h; }
  hour() { return this.hourOverride != null ? this.hourOverride : hourFor(this.scene.skyCycle); }

  // ---- boucle --------------------------------------------------------------------------
  start() {
    if (this.running) return;
    this.running = true; this.last = 0; let seen = false, wait = 0, goneAt = 0;
    const loop = (ts) => {
      if (!this.running) return;
      // détaché : jamais affiché → abandon après ~4 s ; déjà affiché (section déchargée au défilement) → on attend
      // jusqu'à 2 min qu'il revienne, sans dessiner
      if (this.canvas.isConnected) { seen = true; goneAt = 0; }
      else if (!seen ? ++wait > 240 : ts - (goneAt = goneAt || ts) > 120000) { this.running = false; return; }
      else { this.raf = requestAnimationFrame(loop); return; }
      const shown = this.visible && !(typeof document !== "undefined" && document.hidden);
      if (shown && ts - this.last >= 33) { this.last = ts; try { this.draw(ts / 1000); } catch (e) { console.warn("[Age Writer ext] relto draw", e); this.running = false; return; } }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); if (this.io) { try { this.io.disconnect(); } catch (e) { /* ignore */ } this.io = null; } }

  // ---- dessin --------------------------------------------------------------------------
  draw(t) {
    const ctx = this.ctx, sc = this.scene; if (!sc) return;
    if (this.opts.reducedMotion) t = 0;
    const sky = skyAt(this.hour());
    const has = (type) => sc.additions.find((a) => a.type === type);
    this.hot = [];
    if (this.view === "global") return this.drawGlobalView(ctx, sc, sky, t, has);
    ctx.save(); ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(CAM_X, CAM_OY); ctx.scale(CAM, CAM); ctx.translate(-CAM_X, -CAM_Y);
    this.drawSky(ctx, sky, t, has("aurora"));
    const mo = has("moons"); if (mo) SC.moons(ctx, sky);
    this.drawClouds(ctx, 0, sky, t);
    const bd = has("birds"); if (bd) SC.birds(ctx, bd.density, sky, t);
    const fw = has("fireworks"); if (fw) this.drawFireworks(ctx, fw.density, sky, t);
    if (sc.surrounding === "ocean") this.drawOcean(ctx, sky, t);
    const is = has("islets"); if (is) SC.islets(ctx, this, is.density, sky, t);
    const cal = has("calendar"); if (cal) SC.calendar(ctx, this, sky, t);
    this.drawIsland(ctx, sky, t);
    const dk = has("dock"); if (dk) SC.dock(ctx, this, sky, t);
    for (const k of ["gold", "silver", "gems"]) { const o = has(k); if (o) this.drawOre(ctx, k, o.density, sky, t); }
    const mt = has("mountain"); if (mt) this.drawMount(ctx, mt.density, sky, t);
    this.drawPlants(ctx, 0, t);
    const kp = has("koi"); if (kp) this.drawKoi(ctx, kp, sky, t); // après les arbres du fond : le bassin n'est jamais recouvert
    const wf = has("waterfall"); if (wf) this.drawWaterfall(ctx, t);
    this.drawStructures(ctx, sky, t);
    const bn = has("bench"); if (bn) SC.bench(ctx, this, sky);
    const ct = has("cat"); if (ct) this.drawCat(ctx, ct, sky, t);
    const pl = has("pillars"); if (pl) this.drawPillars(ctx, pl.density, sky, t);
    const ch = has("chimney"); if (ch) this.drawChimney(ctx, ch.density, sky, t);
    this.drawPlants(ctx, 1, t);
    const gr = has("grass"); if (gr) SC.grass(ctx, gr.density, sky, t, this.geo.clear);
    for (const fl of sc.additions.filter((a) => a.type === "flowers")) SC.flowers(ctx, fl, sky, t, this.geo.clear);
    const bf = has("butterflies"); if (bf) SC.butterflies(ctx, bf.density, sky, t);
    const ff = has("fireflies"); if (ff) this.drawFireflies(ctx, ff.density, sky, t);
    const ln = has("lanterns"); if (ln) this.drawLanterns(ctx, ln.density, sky, t);
    const ms = has("mist"); if (ms) this.drawMist(ctx, ms.density, sky, t);
    this.drawClouds(ctx, 1, sky, t);
    this.drawClouds(ctx, 2, sky, t);
    const sn = has("snow"); if (sn) this.drawSnow(ctx, sn.density, t);
    const rn = has("rain"); if (rn) SC.rain(ctx, rn.density, sky, t, false);
    const st = has("storm"); if (st) SC.storm(ctx, st.density, sky, t);
    ctx.restore();
    this.drawGrade(ctx, sky);
    ctx.save(); ctx.translate(CAM_X, CAM_OY); ctx.scale(CAM, CAM); ctx.translate(-CAM_X, -CAM_Y);
    this.drawHover(ctx);
    this.drawFlash(ctx);
    ctx.restore();
    this.drawFade(ctx, sky);
    ctx.restore();
  }

  drawSky(ctx, sky, t, aurora) {
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (this.scene.surrounding === "void") { ctx.fillStyle = "#04050b"; ctx.fillRect(0, 250, W, H - 250); }
    for (const s of this.geo.stars) {
      const a = sky.stars * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.ph + s.x)));
      if (a > 0.02) { ctx.fillStyle = rgba(235, 238, 255, a); ctx.fillRect(s.x, s.y, s.r, s.r); }
    }
    const h = sky.hour;
    if (h >= 5.5 && h <= 20.5) { // soleil
      const p = (h - 5.5) / 15, x = 40 + 560 * p, y = 246 - Math.sin(Math.PI * p) * 160;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 90);
      glow.addColorStop(0, rgba(255, 220, 160, 0.55)); glow.addColorStop(1, rgba(255, 190, 120, 0));
      ctx.fillStyle = glow; ctx.fillRect(x - 100, y - 100, 200, 200);
      ctx.fillStyle = mix("#fff3c8", "#ffb070", sky.warm); ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.283); ctx.fill();
    }
    const mp = ((h - 18 + 24) % 24) / 13;
    if (mp >= 0 && mp <= 1) { // lune
      const x = 60 + 520 * mp, y = 246 - Math.sin(Math.PI * mp) * 150;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.clip();
      ctx.fillStyle = rgba(216, 223, 236, 0.35 + 0.6 * sky.night); ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.arc(x + 4, y - 1.5, 7.4, 0, 6.283); ctx.fill("evenodd");
      ctx.restore();
    }
    if (aurora) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const cols = [[80, 220, 160], [150, 120, 230], [90, 190, 220]];
      cols.forEach((c, i) => {
        ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.22 * (0.4 + 0.6 * sky.night)); ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.beginPath();
        for (let x = 0; x <= W; x += 8) { const y = 44 + i * 26 + 14 * Math.sin(x / W * 6.28 * (1 + i * 0.4) + t * (i % 2 ? -0.5 : 0.4)) + 5 * Math.sin(x / 40 + t); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  cloudColor(sky) {
    const base = mix("#2b3555", "#f4f7fb", clamp(sky.ambient * 1.1));
    return mix(base, "#f0a070", sky.warm * 0.55);
  }

  drawClouds(ctx, L, sky, t) {
    const sur = this.scene.surrounding;
    if (sur === "void" || sur === "ocean") { if (L !== 2 || sur === "void") return; }
    const lay = this.layers[L], g = lay.getContext("2d");
    g.clearRect(0, 0, W, 140);
    const speed = [3, 6, 11][L], list = this.geo.clouds[L];
    for (const c of list) {
      const x = ((c.x + t * speed) % (W + 120)) - 60;
      g.globalAlpha = c.a * [0.55, 0.8, 0.95][L];
      g.drawImage(this.sprite, x - c.s, c.y - c.s * 0.45, c.s * 2, c.s * 0.9);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-atop";
    let col = this.cloudColor(sky);
    if (sur === "fog_sea") col = mix(col, "#8a929c", 0.55);
    if (sur === "lava_sea") col = mix("#3a1410", "#ff6a2a", 0.35 + 0.2 * Math.sin(t * 0.7 + L));
    g.fillStyle = col; g.fillRect(0, 0, W, 140);
    g.globalCompositeOperation = "source-over";
    const y0 = [226, 250, 292][L];
    ctx.drawImage(lay, 0, y0 - 40, W, 140);
    if (L === 2) { // masse de nuages sous la ligne basse
      const gr = ctx.createLinearGradient(0, 330, 0, H);
      gr.addColorStop(0, hexa(col.length === 7 ? col : "#cccccc", 0)); gr.addColorStop(1, hexa(col.length === 7 ? col : "#cccccc", 0.95));
      ctx.fillStyle = gr; ctx.fillRect(0, 330, W, H - 330);
    }
  }

  drawOcean(ctx, sky, t) {
    const g = ctx.createLinearGradient(0, 252, 0, H);
    g.addColorStop(0, mix("#0a1a2a", "#3b7fa8", sky.ambient)); g.addColorStop(1, mix("#04101c", "#143a58", sky.ambient));
    ctx.fillStyle = g; ctx.fillRect(0, 252, W, H - 252);
    ctx.strokeStyle = rgba(230, 240, 255, 0.12 + 0.12 * sky.ambient); ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const y = 258 + i * 4, off = (t * (6 + i)) % 80;
      for (let x = -80 + off; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 2, x + 40, y); ctx.stroke(); }
    }
  }

  drawIsland(ctx, sky, t) {
    const T = TERRAIN[this.scene.terrain], g = this.geo, amb = 0.35 + 0.65 * sky.ambient;
    const shade = (c) => mix("#05060c", c, amb);
    ctx.beginPath(); g.outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    const gr = ctx.createLinearGradient(0, GY, 0, 372);
    gr.addColorStop(0, shade(T.rock2)); gr.addColorStop(1, shade(T.rock));
    ctx.fillStyle = gr; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba(0, 0, 0, 0.25); ctx.lineWidth = 1;
    for (const [x, y, w] of g.strata) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.4, y + 2); ctx.lineTo(x + w, y - 1); ctx.stroke(); }
    ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.beginPath(); ctx.moveTo(380, GY); ctx.lineTo(480, GY); ctx.lineTo(480, 300); ctx.lineTo(330, 380); ctx.closePath(); ctx.fill();
    if (T.glow) {
      for (let i = 0; i < 6; i++) {
        const a = 0.3 + 0.35 * Math.sin(t * 0.8 + i * 1.7), x = 205 + i * 45 + (i % 2) * 8, y = GY + 24 + (i * 17) % 60;
        ctx.strokeStyle = hexa(T.glow, clamp(a) * (0.6 + 0.4 * sky.night)); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 10); ctx.lineTo(x + 2, y + 20); ctx.stroke();
      }
    }
    ctx.restore();
    // surface
    ctx.fillStyle = shade(T.top); ctx.beginPath(); ctx.moveTo(168, GY); ctx.lineTo(472, GY); ctx.lineTo(462, GY + 9); ctx.quadraticCurveTo(320, GY + 16, 178, GY + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(T.tuft);
    for (const [x, h] of g.tufts) { ctx.beginPath(); ctx.moveTo(x - 2, GY + 1); ctx.lineTo(x, GY - h); ctx.lineTo(x + 2, GY + 1); ctx.fill(); }
  }

  /** Filons d'or, d'argent et gemmes dans la roche sous l'île (pages « gold », « silver », « gems »). Déterministe : graine du Relto. */
  drawOre(ctx, kind, density, sky, t) {
    const g = this.geo, amb = 0.35 + 0.65 * sky.ambient, r = rng((this.scene.seed ^ fnv("ore" + kind)) >>> 0), d = clamp(density == null ? 0.6 : density);
    ctx.save(); ctx.beginPath(); g.outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    const spot = () => { const y = GY + 20 + r() * 64, half = 150 - (y - GY) * 0.9; return [320 + (r() * 2 - 1) * half, y]; };
    if (kind === "gold" || kind === "silver") {
      const base = kind === "gold" ? [214, 170, 60] : [200, 210, 224], dark = base.map((v) => v * 0.55), n = Math.round(3 + d * 7);
      for (let i = 0; i < n; i++) {
        let [x, y] = spot(); const len = 4 + Math.floor(r() * 4), pts = [[x, y]];
        for (let k = 0; k < len; k++) { x += (r() - 0.35) * 14; y += (r() - 0.35) * 11; pts.push([x, y]); }
        const stroke = (rgb, w, a) => { ctx.strokeStyle = `rgba(${rgb.map((v) => Math.round(v * (0.5 + 0.5 * amb))).join(",")},${a})`; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); };
        stroke(dark, 3, 0.55); stroke(base, 1.3, 0.95);
        const tw = 0.5 + 0.5 * Math.sin(t * 1.6 + i * 2.3), [gx, gy] = pts[Math.floor(pts.length / 2)];
        if (tw > 0.7) { ctx.fillStyle = rgba(255, 250, 220, (tw - 0.7) * 2.2 * (0.5 + 0.5 * sky.night + 0.3)); ctx.beginPath(); ctx.arc(gx, gy, 1.4, 0, 6.283); ctx.fill(); }
      }
      for (let i = 0; i < Math.round(2 + d * 5); i++) { const [x, y] = spot(); ctx.fillStyle = `rgba(${base.map((v) => Math.round(v * (0.5 + 0.5 * amb))).join(",")},0.95)`; ctx.beginPath(); ctx.moveTo(x - 2.2, y + 1.2); ctx.lineTo(x - 0.8, y - 1.8); ctx.lineTo(x + 1.8, y - 1.2); ctx.lineTo(x + 2.4, y + 1.4); ctx.closePath(); ctx.fill(); }
    } else {
      const PAL = [[214, 60, 80], [60, 190, 120], [70, 120, 220], [170, 90, 210], [240, 190, 70]], n = Math.round(3 + d * 7);
      for (let i = 0; i < n; i++) {
        const [x, y] = spot(), c = PAL[Math.floor(r() * PAL.length)], s = 3 + r() * 4, pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 1.9), k = 0.45 + 0.55 * amb;
        const gl = ctx.createRadialGradient(x, y, 0.5, x, y, s * 3.2); gl.addColorStop(0, `rgba(${c.join(",")},${0.28 * pulse * (0.4 + sky.night)})`); gl.addColorStop(1, `rgba(${c.join(",")},0)`); ctx.fillStyle = gl; ctx.fillRect(x - s * 3.2, y - s * 3.2, s * 6.4, s * 6.4);
        const col = (m) => `rgb(${c.map((v) => Math.round(Math.min(255, v * m * k))).join(",")})`;
        ctx.fillStyle = col(0.8); ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.7, y - s * 0.2); ctx.lineTo(x + s * 0.45, y + s * 0.8); ctx.lineTo(x - s * 0.45, y + s * 0.8); ctx.lineTo(x - s * 0.7, y - s * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col(1.25); ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.7, y - s * 0.2); ctx.lineTo(x, y + s * 0.1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col(0.55); ctx.beginPath(); ctx.moveTo(x, y + s * 0.1); ctx.lineTo(x + s * 0.45, y + s * 0.8); ctx.lineTo(x - s * 0.45, y + s * 0.8); ctx.lineTo(x - s * 0.7, y - s * 0.2); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  drawPlants(ctx, row, t) {
    const sky = skyAt(this.hour()), amb = 0.4 + 0.6 * sky.ambient;
    for (const p of this.geo.plants) {
      if (p.row !== row) continue;
      const y = GY + (row ? 6 : 2), sw = Math.sin(t * 0.9 + p.sw) * (1.2 + p.h / 20), h = p.h;
      const col = (c) => mix("#05060c", c, amb);
      if (p.kind === "conifer") {
        ctx.fillStyle = col("#3a2a1c"); ctx.fillRect(p.x - 1, y - h * 0.22, 2, h * 0.22);
        ctx.fillStyle = col(row ? "#1f4a30" : "#1a3a28");
        for (let i = 0; i < 3; i++) { const w = h * (0.42 - i * 0.1), yy = y - h * (0.18 + i * 0.28); ctx.beginPath(); ctx.moveTo(p.x - w + sw * i * 0.3, yy); ctx.lineTo(p.x + sw * (i + 1) * 0.5, yy - h * 0.38); ctx.lineTo(p.x + w + sw * i * 0.3, yy); ctx.closePath(); ctx.fill(); }
      } else if (p.kind === "birch") {
        ctx.strokeStyle = col("#e8e6dc"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + sw * 0.4, y - h * 0.8); ctx.stroke();
        ctx.fillStyle = col("#8fb057");
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(p.x + sw * 0.5 + (i - 1.5) * 4, y - h * (0.7 + (i % 2) * 0.15), 5 - (i % 2), 0, 6.283); ctx.fill(); }
      } else if (p.kind === "palm") {
        ctx.strokeStyle = col("#6a5438"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.quadraticCurveTo(p.x + 4, y - h * 0.5, p.x + 2 + sw * 0.4, y - h * 0.9); ctx.stroke();
        ctx.strokeStyle = col("#3d7a3a"); ctx.lineWidth = 1.6;
        for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.5 + sw * 0.02; ctx.beginPath(); ctx.moveTo(p.x + 2 + sw * 0.4, y - h * 0.9); ctx.quadraticCurveTo(p.x + 2 + Math.cos(a) * 9, y - h * 0.9 + Math.sin(a) * 9 - 4, p.x + 2 + Math.cos(a) * 15, y - h * 0.9 + Math.sin(a) * 9 + 6); ctx.stroke(); }
      } else if (p.kind === "ponderosa") {
        ctx.strokeStyle = col("#6b3f26"); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + sw * 0.3, y - h * 0.9); ctx.stroke();
        ctx.fillStyle = col("#264a2c");
        for (let i = 0; i < 5; i++) { const yy = y - h * (0.5 + i * 0.11), w = 12 - i * 1.6, o = (i % 2 ? 1 : -1) * 3; ctx.beginPath(); ctx.ellipse(p.x + o + sw * (0.2 + i * 0.1), yy, w, 3.4, 0, 0, 6.283); ctx.fill(); }
      } else if (p.kind === "maple") {
        ctx.strokeStyle = col("#5a4030"); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + sw * 0.3, y - h * 0.6); ctx.stroke();
        const LEAF = ["#c4552a", "#d98a2b", "#b83a2a"], base = LEAF[Math.floor(p.x) % 3];
        for (let i = 0; i < 6; i++) { ctx.fillStyle = col(i % 2 ? base : LEAF[(Math.floor(p.x) + 1) % 3]); ctx.beginPath(); ctx.arc(p.x + Math.cos(i * 1.05) * 8 + sw * 0.4, y - h * 0.72 + Math.sin(i * 1.6) * 6, 8 + (i % 3), 0, 6.283); ctx.fill(); }
      } else if (p.kind === "crystal") {
        const gl = 0.5 + 0.5 * sky.night; ctx.fillStyle = col("#5fc7b5"); ctx.beginPath(); ctx.moveTo(p.x - 3, y); ctx.lineTo(p.x - 1.4, y - h * 0.8); ctx.lineTo(p.x + 1.4, y - h * 0.8); ctx.lineTo(p.x + 3, y); ctx.closePath(); ctx.fill();
        for (let i = 0; i < 7; i++) { const yy = y - h * (0.38 + i * 0.09), s = i % 2 ? 1 : -1, len = 11 - i * 0.9; ctx.fillStyle = col(i % 2 ? "#8ff0d8" : "#6fd6e8"); ctx.beginPath(); ctx.moveTo(p.x, yy); ctx.lineTo(p.x + s * len, yy - 7 - i); ctx.lineTo(p.x + s * (len - 3.5), yy + 1.5); ctx.closePath(); ctx.fill(); }
        if (gl > 0.55) { const g2 = ctx.createRadialGradient(p.x, y - h * 0.7, 2, p.x, y - h * 0.7, 26); g2.addColorStop(0, rgba(140, 240, 215, 0.35 * (gl - 0.5))); g2.addColorStop(1, rgba(140, 240, 215, 0)); ctx.fillStyle = g2; ctx.fillRect(p.x - 26, y - h * 0.7 - 26, 52, 52); }
      } else { // fern
        ctx.strokeStyle = col("#4f8a45"); ctx.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + sw * 0.01; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.quadraticCurveTo(p.x + Math.cos(a) * h * 0.3, y + Math.sin(a) * h * 0.4, p.x + Math.cos(a) * h * 0.42 + 3 * Math.sign(Math.cos(a)), y + Math.sin(a) * h * 0.38 + 5); ctx.stroke(); }
      }
    }
  }

  drawWaterfall(ctx, t) {
    const x = 178, w = 9;
    const g = ctx.createLinearGradient(0, GY, 0, 330);
    g.addColorStop(0, "rgba(220,240,255,0.85)"); g.addColorStop(1, "rgba(220,240,255,0.15)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, GY + 6); ctx.lineTo(x + w / 2, GY + 6); ctx.lineTo(x + w / 2 + 4, 330); ctx.lineTo(x - w / 2 - 4, 330); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const p = frac(t * 0.8 + i / 9), y = GY + 6 + p * 120, xx = x - w / 2 + 1 + (i % 4) * 2.2; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + 8); ctx.stroke(); }
    for (let i = 0; i < 7; i++) { const p = frac(t * 0.3 + i / 7), r = 6 + p * 16; ctx.fillStyle = rgba(235, 245, 255, 0.18 * (1 - p)); ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * 6, 322 - p * 20, r, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = "rgba(180,215,235,0.6)"; ctx.fillRect(x - 12, GY + 4, 24, 2.5);
  }

  /** Bassin de carpes koï : coupe de profil dans la roche, à droite de la cabane. Une koï rare (ogon, platine ou fantôme) nage avec les autres. */
  drawKoi(ctx, a, sky, t) {
    const X0 = 282, PW = 52, Y0 = GY + 2, PH = 15, amb = 0.35 + 0.65 * sky.ambient, shade = (c) => mix("#05060c", c, amb);
    const r = rng((this.scene.seed ^ 0x6b01) >>> 0), RARE = ["ogon", "platinum", "ghost"];
    const rare = KOI_RARE[String(a.rare || a.asset || "").toLowerCase()] ? String(a.rare || a.asset).toLowerCase() : RARE[Math.floor(r() * RARE.length)];
    const water = ctx.createLinearGradient(0, Y0, 0, Y0 + PH); water.addColorStop(0, shade("#3f7f96")); water.addColorStop(1, shade("#143550"));
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, PW, PH); ctx.clip();
    ctx.fillStyle = water; ctx.fillRect(X0, Y0, PW, PH);
    ctx.strokeStyle = rgba(230, 245, 255, 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(X0, Y0 + 0.6); ctx.lineTo(X0 + PW, Y0 + 0.6); ctx.stroke();
    const n = Math.round(2 + a.density * 5), COMMON = [["#efe2cc", "#d8452a"], ["#e8dcc6", "#d8452a"], ["#e0762a", "#f6b870"], ["#d94a2a", "#f2c9a0"], ["#efe2cc", "#1d1d24"]];
    const fish = (i, body, spot, size, rareKind) => {
      const ph = i * 2.1 + r() * 6, sp = 0.18 + r() * 0.16, lane = Y0 + 4.5 + (i % 3) * 3.6, s = Math.sin(t * sp + ph), dir = Math.cos(t * sp + ph) >= 0 ? 1 : -1;
      const x = X0 + 6 + (PW - 12) * (0.5 + 0.5 * s), y = lane + Math.sin(t * 0.9 + ph) * 0.7, wag = Math.sin(t * 6 + ph) * 1.2;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      if (rareKind) { const pulse = 0.8 + 0.2 * Math.sin(t * 2.4 + ph), gl = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 2); gl.addColorStop(0, rareKind.glow); gl.addColorStop(0.45, rareKind.glow2); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.globalAlpha = pulse; ctx.fillStyle = gl; ctx.fillRect(-size * 2.2, -size * 2.2, size * 4.4, size * 4.4); ctx.globalAlpha = 1; }
      ctx.globalAlpha = rareKind && rareKind.alpha ? rareKind.alpha : 1;
      ctx.fillStyle = shade(body); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-size * 0.45, 0); ctx.lineTo(-size * 0.8, -size * 0.2 + wag * 0.4); ctx.lineTo(-size * 0.8, size * 0.2 + wag * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(spot); ctx.beginPath(); ctx.ellipse(size * 0.05, -size * 0.04, size * 0.24, size * 0.13, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(-size * 0.28, size * 0.02, size * 0.12, size * 0.09, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgba(10, 10, 14, 0.8); ctx.fillRect(size * 0.34, -size * 0.07, 0.9, 0.9);
      if (rareKind) for (let k = 1; k <= 6; k++) { const ox = -dir * k * 2.6, oy = Math.sin(t * 7 + k * 1.7) * 1.4, a = (1 - k / 7) * 0.8 * (0.6 + 0.4 * Math.sin(t * 9 + k)); ctx.fillStyle = rareKind.spark.replace("A", a.toFixed(2)); ctx.fillRect(ox * dir - 0.5 + (dir < 0 ? 0 : 0), oy - 0.5, 1.1, 1.1); }
      ctx.restore();
      return [x, y];
    };
    for (let i = 1; i < n; i++) { const c = COMMON[Math.floor(r() * COMMON.length)]; fish(i, c[0], c[1], 8.5 + r() * 2, null); }
    const [rx, ry] = fish(0, KOI_RARE[rare].body, KOI_RARE[rare].spot, 15.5, KOI_RARE[rare]);
    if (rare !== "ghost") for (let k = 0; k < 4; k++) { const p = frac(t * 0.3 + k / 4 + r()); ctx.fillStyle = rgba(255, 245, 200, 0.7 * Math.sin(p * 3.14)); ctx.fillRect(X0 + 8 + r() * (PW - 16), Y0 + 2 + p * (PH - 4), 0.9, 0.9); }
    ctx.restore();
    ctx.fillStyle = shade("#6d6a64"); for (const [sx, sw] of [[X0 - 4, 5], [X0 + PW - 1, 5]]) { ctx.beginPath(); ctx.ellipse(sx + sw / 2, GY + 1, sw / 2 + 0.5, 3.4, 0, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = rgba(230, 245, 255, 0.25); ctx.lineWidth = 0.7; const rp = frac(t * 0.25); ctx.beginPath(); ctx.ellipse(X0 + PW * 0.5, GY + 0.8, 6 + rp * 14, 0.9 + rp * 1.2, 0, 0, 6.283); ctx.stroke();
    this.hot.push({ x: X0 - 3, y: GY - 2, w: PW + 6, h: PH + 5, tip: `Koi pond — a rare ${KOI_RARE[rare].label} koi swims here` });
    const nm = String(a.name || "").trim() || KOI_RARE[rare].title;
    this.hot.push({ x: rx - 9, y: ry - 6, w: 18, h: 12, tip: `${nm} — a rare ${KOI_RARE[rare].label} koi`, flash: nm });
  }

  /** Un chat assis près de la cabane : couleur et nom viennent de la page (`color=`, `name=`). Clignement, queue qui bat, yeux clos la nuit. */
  drawCat(ctx, a, sky, t) {
    const cat = catLook(a.color), amb = 0.4 + 0.6 * sky.ambient, shade = (c) => mix("#05060c", c, amb), CX = 203, K = 1.3;
    const blink = frac(t * 0.21 + (this.scene.seed % 7) / 7) > 0.965 || sky.night > 0.75, sway = Math.sin(t * 1.6) * 0.45;
    ctx.save(); ctx.translate(CX, GY); ctx.scale(K, K);
    // queue
    ctx.strokeStyle = shade(cat.tail); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(4.2, -2.4); ctx.bezierCurveTo(10 + sway * 2, -1, 11 + sway * 3, -8, 7 + sway * 4, -11); ctx.stroke();
    // corps, poitrail, pattes
    ctx.fillStyle = shade(cat.fur); ctx.beginPath(); ctx.ellipse(0, -5.6, 5, 6, 0, 0, 6.283); ctx.fill();
    if (cat.belly) { ctx.fillStyle = shade(cat.belly); ctx.beginPath(); ctx.ellipse(0, -4.4, 2.6, 4, 0, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = shade(cat.paws || cat.fur); ctx.fillRect(-3.4, -1.5, 2.4, 1.5); ctx.fillRect(1, -1.5, 2.4, 1.5);
    if (cat.patch) { ctx.fillStyle = shade(cat.patch); ctx.beginPath(); ctx.ellipse(-2.6, -7.5, 2.1, 2.6, 0.4, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(3, -3.5, 1.6, 2, 0, 0, 6.283); ctx.fill(); }
    if (cat.stripes) { ctx.strokeStyle = shade(cat.stripes); ctx.lineWidth = 0.7; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4.4, -8 + i * 2.4); ctx.lineTo(-2.2, -7.4 + i * 2.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4.4, -8 + i * 2.4); ctx.lineTo(2.2, -7.4 + i * 2.4); ctx.stroke(); } }
    // tête et oreilles
    ctx.fillStyle = shade(cat.ears || cat.fur); ctx.beginPath(); ctx.moveTo(-4, -14.2); ctx.lineTo(-3.6, -19.2); ctx.lineTo(-0.9, -16.6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -14.2); ctx.lineTo(3.6, -19.2); ctx.lineTo(0.9, -16.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(cat.face || cat.fur); ctx.beginPath(); ctx.arc(0, -13.2, 4.4, 0, 6.283); ctx.fill();
    if (cat.muzzle) { ctx.fillStyle = shade(cat.muzzle); ctx.beginPath(); ctx.ellipse(0, -11.6, 2.2, 1.7, 0, 0, 6.283); ctx.fill(); }
    // yeux, nez
    if (blink) { ctx.strokeStyle = shade("#1a1410"); ctx.lineWidth = 0.6; for (const ex of [-1.8, 1.8]) { ctx.beginPath(); ctx.moveTo(ex - 0.9, -13.4); ctx.lineTo(ex + 0.9, -13.4); ctx.stroke(); } }
    else { for (const ex of [-1.8, 1.8]) { ctx.fillStyle = sky.night > 0.4 ? rgba(255, 240, 150, 0.9) : shade(cat.eyes); ctx.beginPath(); ctx.ellipse(ex, -13.4, 0.9, 1.1, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = "#101010"; ctx.fillRect(ex - 0.2, -14.1, 0.4, 1.5); } }
    ctx.fillStyle = shade("#d98a8a"); ctx.fillRect(-0.4, -12.2, 0.8, 0.6);
    ctx.restore();
    const nm = String(a.name || "").trim();
    this.hot.push({ x: CX - 9, y: GY - 26, w: 18, h: 26, tip: nm ? `${nm} — ${cat.label} cat` : `A ${cat.label} cat`, flash: nm || `a ${cat.label} cat` });
  }

  /** étiquette brève (nom du chat, de la koï) affichée après un clic */
  drawFlash(ctx) {
    const f = this.flash; if (!f) return;
    if (Date.now() > f.until) { this.flash = null; return; }
    ctx.save(); ctx.font = "8px serif"; const tw = ctx.measureText(f.text).width, w = tw + 10, x = clamp(f.x - w / 2, 4, W - w - 4), y = f.y - 12;
    ctx.fillStyle = "rgba(14,12,10,0.82)"; ctx.fillRect(x, y, w, 12); ctx.strokeStyle = "rgba(205,189,148,0.7)"; ctx.lineWidth = 0.7; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 11);
    ctx.fillStyle = "#eadfb8"; ctx.textBaseline = "middle"; ctx.fillText(f.text, x + 5, y + 6.4); ctx.restore();
  }

  drawStructures(ctx, sky, t) {
    const sc = this.scene, st = new Set(sc.structures), night = sky.night, amb = 0.4 + 0.6 * sky.ambient;
    const col = (c) => mix("#05060c", c, amb);
    if (st.has("hut")) {
      const w = 56, h = 30, x0 = HUT_X - w / 2, y0 = GY - h;
      ctx.fillStyle = col("#5a4330"); ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * 5); ctx.lineTo(x0 + w, y0 + i * 5); ctx.stroke(); }
      ctx.fillStyle = col("#2f2a2a"); ctx.fillRect(x0 + 8, y0 - 22, 7, 18); // cheminée
      ctx.fillStyle = col("#3a2a22"); ctx.beginPath(); ctx.moveTo(x0 - 8, y0); ctx.lineTo(HUT_X, y0 - 24); ctx.lineTo(x0 + w + 8, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col("#2a1c14"); ctx.fillRect(HUT_X - 17, GY - 18, 12, 18);
      const fl = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      ctx.fillStyle = mix("#2a3a4a", "#ffd58a", clamp(night * fl * 1.1)); ctx.fillRect(x0 + w - 20, y0 + 8, 11, 10);
      if (night > 0.3) { const gl = ctx.createRadialGradient(x0 + w - 14, y0 + 13, 2, x0 + w - 14, y0 + 13, 38); gl.addColorStop(0, rgba(255, 200, 120, 0.35 * night * fl)); gl.addColorStop(1, rgba(255, 200, 120, 0)); ctx.fillStyle = gl; ctx.fillRect(x0 - 30, y0 - 30, w + 80, 90); }
      for (let i = 0; i < 6; i++) { const p = frac(t * 0.12 + i / 6); ctx.fillStyle = rgba(190, 190, 200, 0.22 * (1 - p)); ctx.beginPath(); ctx.arc(x0 + 11.5 + Math.sin(p * 6 + i) * 5 + p * 16, y0 - 24 - p * 44, 2.5 + p * 6, 0, 6.283); ctx.fill(); }
    }
    if (st.has("bookshelves")) this.drawShelf(ctx, amb, night);
    if (st.has("linking_pillars")) {
      const lit = sc.returning > 0, pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
      for (const px of PILLAR_X) {
        ctx.fillStyle = col("#5a5a66"); ctx.beginPath(); ctx.moveTo(px - 5, GY); ctx.lineTo(px - 5, GY - 32); ctx.lineTo(px - 2, GY - 36); ctx.lineTo(px + 2, GY - 36); ctx.lineTo(px + 5, GY - 32); ctx.lineTo(px + 5, GY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(px + 1, GY - 34, 4, 34);
        ctx.fillStyle = lit ? rgba(150, 215, 255, 0.5 + 0.4 * pulse) : rgba(120, 120, 140, 0.4); ctx.fillRect(px - 1, GY - 28, 2, 7); ctx.fillRect(px - 1, GY - 17, 2, 4);
      }
      const cx = (PILLAR_X[0] + PILLAR_X[1]) / 2;
      if (lit) { const gl = ctx.createRadialGradient(cx, GY - 22, 1, cx, GY - 22, 26); gl.addColorStop(0, rgba(160, 220, 255, 0.55 * pulse)); gl.addColorStop(1, rgba(160, 220, 255, 0)); ctx.fillStyle = gl; ctx.fillRect(cx - 30, GY - 52, 60, 60); }
      ctx.strokeStyle = lit ? rgba(190, 235, 255, 0.5 + 0.4 * pulse) : rgba(120, 120, 140, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, GY - 22, 8, 0, 6.283); ctx.stroke();
      this.hot.push({ x: PILLAR_X[0] - 6, y: GY - 38, w: PILLAR_X[1] - PILLAR_X[0] + 12, h: 38, tip: sc.returning ? `${sc.returning} Age${sc.returning === 1 ? "" : "s"} link back here` : "No Age links back here yet" });
    }
  }

  drawShelf(ctx, amb, night) {
    const col = (c) => mix("#05060c", c, amb), w = 62, h = 46, x0 = SHELF_X - w / 2, y0 = GY - h, K = SHELF_SCALE;
    const hp = this.hot.push.bind(this.hot), hot = { push: (r) => hp({ ...r, x: SHELF_X + (r.x - SHELF_X) * K, y: GY + (r.y - GY) * K, w: r.w * K, h: r.h * K }) };
    ctx.save(); ctx.translate(SHELF_X, GY); ctx.scale(K, K); ctx.translate(-SHELF_X, -GY); // l'étagère reste plus petite que la cabane
    ctx.fillStyle = col("#241a12"); ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = col("#4b3626"); ctx.fillRect(x0 - 2, y0 - 2, 4, h + 2); ctx.fillRect(x0 + w - 2, y0 - 2, 4, h + 2); ctx.fillRect(x0 - 2, y0 - 4, w + 4, 4);
    for (let r = 0; r < 3; r++) ctx.fillRect(x0, y0 + 14 + r * 14 - 2, w, 2.5);
    for (const b of this.geo.books) {
      const bx = x0 + 4 + b.col * 5.6, by = y0 + 14 + b.row * 14 - 2.5 - b.h;
      ctx.fillStyle = col(b.color); ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = col(VERDICT[b.age.verdict] || VERDICT.unknown); ctx.fillRect(bx, by, b.w, 1.6);
      hot.push({ x: bx - 0.5, y: by, w: b.w + 1, h: b.h, tip: `${b.age.name} — ${b.age.verdict || "?"}${b.age.stability != null ? ` ${b.age.stability}%` : ""}`, age: b.age, book: true });
    }
    if (this.scene.ages.length > 30) { ctx.fillStyle = rgba(230, 220, 190, 0.7); ctx.font = "7px serif"; ctx.fillText(`+${this.scene.ages.length - 30}`, x0 + w - 16, y0 + 12); }
    if (night > 0.4) { ctx.fillStyle = rgba(255, 210, 140, 0.5 * night); ctx.beginPath(); ctx.arc(x0 + w + 6, y0 + 4, 2, 0, 6.283); ctx.fill(); }
    ctx.restore();
    this.drawSpecialBooks(ctx, amb, K, w);
  }

  /** deux livres à part, debout au pied de l'étagère (taille réelle, hors de son échelle réduite) : glyphes et bibliothèque */
  drawSpecialBooks(ctx, amb, K, shelfW) {
    const col = (c) => mix("#05060c", c, amb), bw = 7, gap = 3, x1 = SHELF_X + (shelfW / 2) * K + 8;
    const defs = [
      { kind: "glyphs", x: x1, h: 17, body: "#27555a", band: "#d8c07a", tip: "Book of glyphs" },
      { kind: "library", x: x1 + bw + gap, h: 15, body: "#5b2b2b", band: "#c9a24e", tip: "Library book (blocks and Relto pages)" },
    ];
    for (const b of defs) {
      const y = GY - b.h;
      ctx.fillStyle = col(b.body); ctx.fillRect(b.x, y, bw, b.h);
      ctx.fillStyle = col(b.band); ctx.fillRect(b.x, y + 2, bw, 1.4); ctx.fillRect(b.x, y + b.h - 3.4, bw, 1.4);
      ctx.fillStyle = rgba(0, 0, 0, 0.22); ctx.fillRect(b.x + bw - 1.6, y, 1.6, b.h);
      if (b.kind === "glyphs") { ctx.fillStyle = col(b.band); ctx.beginPath(); ctx.moveTo(b.x + bw / 2, y + 5.5); ctx.lineTo(b.x + bw / 2 + 2, y + 8.5); ctx.lineTo(b.x + bw / 2, y + 11.5); ctx.lineTo(b.x + bw / 2 - 2, y + 8.5); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = col(b.band); ctx.fillRect(b.x + bw / 2 - 1.2, y + 5.5, 2.4, 3.6); ctx.fillStyle = col(b.body); ctx.fillRect(b.x + bw / 2 - 0.5, y + 6.4, 1, 1.6); }
      this.hot.push({ x: b.x - 1, y: y - 1, w: bw + 2, h: b.h + 2, tip: b.tip, special: b.kind });
    }
  }

  drawPlate(ctx, amb) {
    const sc = this.scene, w = 96, h = 24, x0 = PLATE_X - w / 2, y0 = GY + 18;
    ctx.fillStyle = mix("#05060c", "#2b2824", amb); ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = mix("#05060c", "#6b5a3a", amb); ctx.lineWidth = 1.2; ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
    const size = 13, nw = this.dni.widthOf(sc.seed, size);
    this.dni.drawNumber(ctx, sc.seed, PLATE_X - nw / 2, y0 + (h - size) / 2, size, mix("#05060c", "#cdbd94", Math.max(0.5, amb)));
    this.hot.push({ x: x0, y: y0, w, h, tip: `Seed ${sc.seed} · ${sc.ages.length} Age${sc.ages.length === 1 ? "" : "s"} on the shelf` });
  }

  /** un petit mont rocheux derrière la cabane, posé sur l'île (pas une chaîne à l'horizon) */
  drawMount(ctx, d, sky, t) {
    const T = TERRAIN[this.scene.terrain], amb = 0.35 + 0.65 * sky.ambient, shade = (c) => mix("#05060c", c, amb);
    const cx = HUT_X + 14, hw = 78 + 14 * d, h = 52 + 30 * d;
    const path = () => { ctx.beginPath(); ctx.moveTo(cx - hw, GY + 2); ctx.bezierCurveTo(cx - hw * 0.55, GY - h * 0.35, cx - hw * 0.3, GY - h * 0.95, cx - 6, GY - h); ctx.bezierCurveTo(cx + 14, GY - h * 1.02, cx + hw * 0.35, GY - h * 0.7, cx + hw * 0.62, GY - h * 0.32); ctx.bezierCurveTo(cx + hw * 0.85, GY - h * 0.1, cx + hw * 0.95, GY - 2, cx + hw, GY + 2); ctx.closePath(); };
    ctx.save(); path();
    const g = ctx.createLinearGradient(0, GY - h, 0, GY); g.addColorStop(0, shade(T.rock2)); g.addColorStop(1, shade(T.rock)); ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    // face à l'ombre à droite, strates, calotte herbeuse en haut
    ctx.fillStyle = rgba(0, 0, 0, 0.24); ctx.beginPath(); ctx.moveTo(cx + 4, GY - h); ctx.lineTo(cx + hw + 4, GY + 4); ctx.lineTo(cx + 6, GY + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(0, 0, 0, 0.22); ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = GY - h + i * (h / 6.2); ctx.beginPath(); ctx.moveTo(cx - hw, y + 3); ctx.lineTo(cx - 10, y - 2); ctx.lineTo(cx + hw * 0.5, y + 4); ctx.stroke(); }
    ctx.fillStyle = shade(T.top); ctx.beginPath(); ctx.moveTo(cx - 30, GY - h * 0.7); ctx.quadraticCurveTo(cx - 6, GY - h * 1.12, cx + 30, GY - h * 0.58); ctx.lineTo(cx + 30, GY - h * 1.2); ctx.lineTo(cx - 30, GY - h * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = shade(T.tuft); const r = rng((this.scene.seed ^ 0x2f1d) >>> 0);
    for (let i = 0; i < 9; i++) { const x = cx - 24 + r() * 44, y = GY - h * (0.86 + 0.1 * Math.sin((x - cx) / 14)) + 3; ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x, y - 3 - r() * 3); ctx.lineTo(x + 1.5, y); ctx.fill(); }
    if (T.glow) { ctx.strokeStyle = hexa(T.glow, (0.3 + 0.3 * Math.sin(t * 0.8)) * (0.5 + 0.5 * sky.night)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 20, GY - h * 0.5); ctx.lineTo(cx - 14, GY - h * 0.38); ctx.lineTo(cx - 19, GY - h * 0.25); ctx.stroke(); }
  }

  /** feux d'artifice : fusée, éclatement, retombée ; plus visibles à la nuit tombée */
  drawFireworks(ctx, d, sky, t) {
    const vis = clamp(0.45 + sky.night * 0.9), slots = 1 + Math.round(d * 3), PAL = [[255, 110, 90], [255, 214, 110], [120, 195, 255], [190, 140, 255], [130, 255, 185], [255, 250, 240]];
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    const dot = (x, y, r, col, a) => { ctx.globalAlpha = clamp(a); ctx.drawImage(this.sprite, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };
    for (let s = 0; s < slots; s++) {
      const period = 4.6 + s * 1.3, ph = t / period + s * 0.37, cyc = Math.floor(ph), p = frac(ph) * period;
      const r = rng((this.scene.seed + cyc * 7919 + s * 104729) >>> 0), x = 120 + r() * 400, y = 80 + r() * 55, col = PAL[Math.floor(r() * PAL.length)], n = 40 + Math.floor(r() * 24), ring = r() < 0.3, R = 52 + r() * 26 + 14 * d;
      const lift = 1.1;
      if (p < lift) { // fusée
        const q = p / lift, e = 1 - (1 - q) * (1 - q), yy = lerp(230, y, e), xx = lerp(x + (r() - 0.5) * 24, x, e);
        ctx.strokeStyle = rgba(255, 215, 150, 0.8 * vis); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 14); ctx.stroke();
        dot(xx, yy, 6, col, 0.9 * vis);
      } else if (p < lift + 2.6) { // éclatement
        const q = (p - lift) / 2.6, e = 1 - Math.pow(1 - Math.min(1, q * 1.7), 3), a = Math.pow(1 - q, 1.4) * vis;
        dot(x, y, 46, col, Math.max(0, 1 - q * 4) * 0.8 * vis);
        ctx.strokeStyle = rgba(col[0], col[1], col[2], a); ctx.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * 6.283 + (ring ? 0 : r() * 0.5), sp = ring ? 1 : 0.4 + r() * 0.6, fall = q * q * 40;
          const px = x + Math.cos(ang) * R * e * sp, py = y + Math.sin(ang) * R * e * sp + fall;
          const e0 = Math.max(0, e - 0.12), qx = x + Math.cos(ang) * R * e0 * sp, qy = y + Math.sin(ang) * R * e0 * sp + fall * 0.8;
          ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
          dot(px, py, 3.2, col, a * (0.6 + 0.4 * Math.sin(t * 25 + i)));
        }
      }
    }
    ctx.restore();
  }

  /** menhirs et colonnes brisées : ils s'allument de runes la nuit */
  /** cheminée allumée : fumée chaude et dense, lueur vacillante, étincelles, fenêtre éclairée */
  drawChimney(ctx, d, sky, t) {
    const x0 = HUT_X - 28, y0 = GY - 30, cx = x0 + 11.5, cy = y0 - 24, night = clamp(sky.night == null ? 0.3 : sky.night);
    const fl = 0.75 + 0.25 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1) + 0.1 * Math.sin(t * 17);
    // fenêtre et lueur de l'âtre
    const wx = x0 + 56 - 14, wy = y0 + 13;
    let g = ctx.createRadialGradient(wx, wy, 1, wx, wy, 34 + 10 * d); g.addColorStop(0, rgba(255, 170, 70, (0.35 + 0.25 * night) * fl * d)); g.addColorStop(1, rgba(255, 140, 50, 0));
    ctx.fillStyle = g; ctx.fillRect(wx - 50, wy - 50, 100, 100);
    ctx.fillStyle = rgba(255, 190, 90, (0.5 + 0.4 * night) * fl); ctx.fillRect(wx - 5, wy - 5, 11, 10);
    g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 18); g.addColorStop(0, rgba(255, 150, 60, (0.25 + 0.3 * night) * fl * d)); g.addColorStop(1, rgba(255, 120, 40, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - 20, cy - 20, 40, 40);
    // fumée : volutes qui s'élargissent, dérivent avec le vent
    const n = Math.round(8 + 8 * d);
    for (let i = 0; i < n; i++) {
      const p = frac(t * 0.1 + i / n), sway = Math.sin(p * 5 + i * 1.7) * (3 + p * 8), a = 0.34 * (1 - p) * Math.min(1, p * 6) * (0.6 + 0.4 * d);
      const gr = 150 - 40 * (1 - p) - 60 * night;
      ctx.fillStyle = rgba(gr, gr, gr + 8, a); ctx.beginPath(); ctx.arc(cx + sway + p * 26, cy - 3 - p * 70, 2.4 + p * 9, 0, 6.283); ctx.fill();
    }
    // étincelles
    for (let i = 0; i < 5; i++) {
      const p = frac(t * 0.45 + i * 0.213), x = cx + Math.sin(p * 9 + i * 3) * 4 + p * 9, y = cy - 2 - p * 30;
      ctx.fillStyle = rgba(255, 190 - p * 80, 80, (1 - p) * 0.9 * d * (0.4 + 0.6 * night + 0.2)); ctx.fillRect(x, y, 1.2, 1.2);
    }
  }
  drawPillars(ctx, d, sky, t) {
    const night = sky.night, amb = 0.4 + 0.6 * sky.ambient, n = 3 + Math.round(d * 3);
    const spots = [[184, 31, 1], [198, 22, 0], [388, 38, 1], [401, 27, 0], [413, 34, 1], [296, 19, 0]].slice(0, n);
    const rr = rng((this.scene.seed ^ 0x51ed27) >>> 0);
    spots.forEach(([x, h, whole], i) => {
      const w = 5.5 + rr() * 2, top = GY - h, lean = (rr() - 0.5) * 2;
      ctx.fillStyle = mix("#05060c", i % 2 ? "#6a6a76" : "#5a5a66", amb);
      ctx.beginPath(); ctx.moveTo(x - w, GY); ctx.lineTo(x - w + lean * 0.5, top + 3);
      if (whole) { ctx.lineTo(x - w * 0.6 + lean, top); ctx.lineTo(x + w * 0.6 + lean, top); } else { ctx.lineTo(x - w * 0.3 + lean, top - 3); ctx.lineTo(x + w * 0.2 + lean, top + 2); ctx.lineTo(x + w * 0.7 + lean, top - 1); }
      ctx.lineTo(x + w + lean * 0.5, top + 4); ctx.lineTo(x + w, GY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x + w * 0.2, top + 3, w * 0.8, h - 3);
      ctx.fillStyle = mix("#05060c", "#4f6a3c", amb * 0.8); ctx.fillRect(x - w, GY - 4, w * 2, 4);
      if (night > 0.25) { const pulse = 0.55 + 0.45 * Math.sin(t * 1.4 + i * 1.9), col = rgba(150, 215, 255, night * pulse * 0.9);
        const gl = ctx.createRadialGradient(x, GY - h * 0.55, 0, x, GY - h * 0.55, 12); gl.addColorStop(0, rgba(150, 215, 255, 0.28 * night * pulse)); gl.addColorStop(1, rgba(150, 215, 255, 0)); ctx.fillStyle = gl; ctx.fillRect(x - 12, GY - h * 0.55 - 12, 24, 24);
        if (h > 24) this.dni.drawNumber(ctx, (this.scene.seed + i * 7) % 25, x - 3.5, GY - h * 0.75, 7, col, 0.2);
      }
    });
  }

  drawFireflies(ctx, d, sky, t) {
    const n = Math.round(6 + d * 20), a = clamp(sky.night * 1.3 - 0.1);
    if (a <= 0.02) return;
    for (let i = 0; i < n; i++) {
      const f = this.geo.flies[i % this.geo.flies.length], x = f.x + Math.cos(t * f.sp + f.ph) * f.rr, y = f.y + Math.sin(t * f.sp * 1.3 + f.ph) * f.rr * 0.5, b = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + f.ph * 3));
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6); g.addColorStop(0, rgba(220, 255, 150, 0.9 * a * b)); g.addColorStop(1, rgba(220, 255, 150, 0)); ctx.fillStyle = g; ctx.fillRect(x - 6, y - 6, 12, 12);
    }
  }

  drawLanterns(ctx, d, sky, t) {
    const n = Math.round(3 + d * 5), a = 0.35 + 0.65 * sky.night;
    ctx.strokeStyle = rgba(30, 24, 20, 0.7); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(HUT_X + 26, GY - 36); ctx.quadraticCurveTo((HUT_X + SHELF_X) / 2, GY - 24, SHELF_X - 22, GY - 36); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const p = (i + 0.5) / n, x = lerp(HUT_X + 26, SHELF_X - 22, p), y = lerp(GY - 36, GY - 36, p) + Math.sin(p * Math.PI) * 10 + 2;
      const fl = 0.8 + 0.2 * Math.sin(t * 5 + i * 2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, rgba(255, 190, 100, 0.8 * a * fl)); g.addColorStop(1, rgba(255, 190, 100, 0)); ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
      ctx.fillStyle = rgba(255, 215, 150, 0.95); ctx.fillRect(x - 1.5, y - 2, 3, 4);
    }
  }

  drawMist(ctx, d, sky, t) {
    for (let i = 0; i < 4; i++) {
      const y = GY - 10 + i * 5, off = Math.sin(t * 0.2 + i) * 20;
      const g = ctx.createLinearGradient(0, y - 12, 0, y + 12); const c = this.cloudColor(sky);
      g.addColorStop(0, hexa(c, 0)); g.addColorStop(0.5, hexa(c, 0.2 * d + 0.05)); g.addColorStop(1, hexa(c, 0));
      ctx.fillStyle = g; ctx.fillRect(160 + off, y - 12, 320, 24);
    }
  }

  drawSnow(ctx, d, t) {
    const n = Math.round(30 + d * 130); ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < n; i++) { const f = this.geo.flakes[i], y = (f.y + t * f.sp) % H, x = f.x + Math.sin(t * 0.8 + f.dr) * 8; ctx.fillRect(x, y, f.s, f.s); }
  }

  drawGrade(ctx, sky) {
    if (sky.night > 0.15) { ctx.fillStyle = rgba(12, 16, 48, sky.night * 0.18); ctx.fillRect(0, 0, W, H); }
    if (sky.warm > 0.3) { ctx.fillStyle = rgba(255, 140, 70, (sky.warm - 0.3) * 0.12); ctx.fillRect(0, 0, W, H); }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  drawHover(ctx) {
    const h = this.hover; if (!h) return;
    ctx.strokeStyle = "rgba(255,240,200,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(h.x - 1, h.y - 1, h.w + 2, h.h + 2);
    ctx.font = "11px serif"; const tw = ctx.measureText(h.tip).width, bx = clamp(h.x + h.w / 2 - tw / 2 - 6, 4, W - tw - 16), by = Math.max(4, h.y - 24);
    ctx.fillStyle = "rgba(16,13,9,0.92)"; ctx.fillRect(bx, by, tw + 12, 18); ctx.strokeStyle = "rgba(205,189,148,0.8)"; ctx.strokeRect(bx, by, tw + 12, 18);
    ctx.fillStyle = "#e9dcb8"; ctx.fillText(h.tip, bx + 6, by + 13);
  }

  // ---- vues ----------------------------------------------------------------------------
  /** « island » (vue de l'île, par défaut) ou « global » (le Relto vu de loin) ; un fondu léger marque le passage. */
  setView(view) {
    if (view !== "global") view = "island";
    if (view === (this.view || "island")) return;
    this.view = view; this.hover = null; this.flash = null; this.fadeAt = Date.now();
    if (this.opts.onView) this.opts.onView(view);
    if (!this.running) this.draw(0);
  }
  drawGlobalView(ctx, sc, sky, t, has) {
    ctx.save(); ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); ctx.clearRect(0, 0, W, H);
    GL.drawGlobal(this, ctx, sc, sky, t, has);
    this.drawGrade(ctx, sky); this.drawHover(ctx); this.drawFlash(ctx); this.drawFade(ctx, sky);
    ctx.restore();
  }
  drawFade(ctx, sky) {
    if (!this.fadeAt || this.opts.reducedMotion) return;
    const p = (Date.now() - this.fadeAt) / 520; if (p >= 1) { this.fadeAt = 0; return; }
    ctx.fillStyle = rgba(...(sky.night > 0.5 ? [14, 16, 34] : [230, 234, 244]), 0.9 * (1 - p)); ctx.fillRect(0, 0, W, H);
  }

  // ---- souris --------------------------------------------------------------------------
  toLogical(e) {
    const r = this.canvas.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    if (this.view === "global") return [px, py]; // la vue globale n'a pas de zoom
    return [(px - CAM_X) / CAM + CAM_X, (py - CAM_OY) / CAM + CAM_Y]; // inverse de la caméra
  }
  hit(x, y) { for (let i = this.hot.length - 1; i >= 0; i--) { const h = this.hot[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
  onMove(e) {
    const [x, y] = this.toLogical(e), prev = this.hover; this.hover = this.hit(x, y); this.canvas.style.cursor = this.hover && (this.hover.book || this.hover.special || this.hover.flash || this.hover.go) ? "pointer" : "";
    if (!this.running && this.hover !== prev) this.draw(0); // mouvement réduit : pas de boucle, on redessine pour l'infobulle
  }
  onClick(e) { const [x, y] = this.toLogical(e), h = this.hit(x, y); if (!h) return; if (h.book && this.opts.onOpen) this.opts.onOpen(h.age, e); else if (h.special && this.opts.onSpecial) this.opts.onSpecial(h.special, e); else if (h.go) this.setView(h.go); else if (h.flash) { this.flash = { text: h.flash, x: h.x + h.w / 2, y: h.y, until: Date.now() + 2800 }; if (!this.running) this.draw(0); } }
}

module.exports = { ReltoRenderer, W, H, GY, TERRAIN, VERDICT };
