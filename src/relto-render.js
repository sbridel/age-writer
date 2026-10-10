"use strict";
/**
 * Rendu canvas 2D du Relto : une île flottante au-dessus d'une mer de nuages.
 * Tout est procédural et déterministe (graine = seed du Relto), animé par le temps.
 */
const { rng, clamp, lerp, frac, mix, rgba, hexa, fnv } = require("./util");
const { skyAt, hourFor, placePlants, layoutIsland } = require("./relto-model");
const SC = require("./relto-scenery");
const GL = require("./relto-global");
const RM = require("./relto-rooms");
const RI = require("./relto-imager");
const PB = require("./relto-pagebook");
const TL = require("./relto-telescope");
const SM = require("./relto-starmap");
const CK = require("./relto-clock");
const IM = require("./imager");
const GI = require("./imager-guild");
const UW = require("./unwritten");
const T = require("./telescope");
const EN_T = require("./i18n").makeT(() => "en");
const CAL = require("./calibration");
const RV = require("./genviews");
const ROOMS = { cabin: RM.drawCabin, pillars: RM.drawPillarsRoom, pond: RM.drawPondRoom, pondplus: RM.drawPondPlusRoom, cat: RM.drawCatRoom, grove: RM.drawGroveRoom, imager: RI.drawImagerRoom, book: PB.drawBookRoom, telescope: TL.drawTelescopeRoom, starmap: SM.drawStarMap, clock: CK.drawClockRoom };

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
/**
 * Motifs de koï générés au hasard (déterministes avec la graine) : une variété (kohaku, sanke, showa, tancho, asagi, orange, yamabuki)
 * donne la couleur de fond et celles des taches ; le nombre, la place, la taille et la forme des taches sont tirés, jamais deux poissons pareils.
 */
const KOI_COL = { white: "#efe2cc", cream: "#f1e4c6", red: "#d8452a", orange: "#e0762a", black: "#1d1d24", slate: "#6f8fae", yellow: "#e8c65a" };
const KOI_STYLES = [
  { id: "kohaku", base: "white", patch: ["red"], n: [2, 4], w: 3 },
  { id: "sanke", base: "white", patch: ["red"], dark: ["black"], n: [2, 3], nd: [1, 3], w: 2 },
  { id: "showa", base: "black", patch: ["red", "white"], n: [3, 5], w: 2 },
  { id: "tancho", base: "white", dot: "red", n: [0, 0], w: 1 },
  { id: "asagi", base: "slate", patch: ["orange"], n: [1, 2], w: 1 },
  { id: "orange", base: "orange", patch: ["white", "cream"], n: [0, 2], w: 2 },
  { id: "yamabuki", base: "yellow", patch: ["cream"], n: [0, 2], w: 1 },
];
function koiGenome(r, rareKind) {
  const span = (a) => a[0] + Math.floor(r() * (a[1] - a[0] + 1)), pick = (a) => a[Math.floor(r() * a.length)];
  const patch = (col, lo, hi, small) => ({ u: lo + r() * (hi - lo), v: (r() - 0.5) * 1.1, rx: small ? 0.1 + r() * 0.14 : 0.2 + r() * 0.26, ry: small ? 0.3 + r() * 0.3 : 0.5 + r() * 0.5, rot: (r() - 0.5) * 0.7, col, a: 0.9 + r() * 0.1, blobs: [[(r() - 0.5) * 0.3, (r() - 0.5) * 0.5, 0.6 + r() * 0.3], [(r() - 0.5) * 0.4, (r() - 0.5) * 0.5, 0.5 + r() * 0.3]] });
  if (rareKind) { // koï rare : couleur métal ou perle, avec des plages plus claires/foncées tirées au hasard
    const out = []; for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) out.push(patch(rareKind.spot, -0.8 + i * 0.4 + r() * 0.2, -0.5 + i * 0.4 + r() * 0.2, false));
    return { base: rareKind.body, tail: rareKind.body, patches: out, dot: null };
  }
  let tot = 0; for (const st of KOI_STYLES) tot += st.w; let q = r() * tot, st = KOI_STYLES[0]; for (const x of KOI_STYLES) { q -= x.w; if (q <= 0) { st = x; break; } }
  const patches = [], n = span(st.n);
  for (let i = 0; i < n; i++) patches.push(patch(KOI_COL[pick(st.patch)], -0.85 + (1.5 * i) / Math.max(1, n) + r() * 0.15, -0.85 + (1.5 * (i + 1)) / Math.max(1, n), false));
  if (st.dark) for (let i = 0, nd = span(st.nd); i < nd; i++) patches.push(patch(KOI_COL[st.dark[0]], -0.75 + r() * 1.5, -0.75 + r() * 1.5, true));
  const tail = KOI_COL[st.base] && (st.id === "showa" || st.id === "asagi") ? KOI_COL[st.base] : r() < 0.35 && patches.length ? patches[0].col : KOI_COL[st.base];
  return { base: KOI_COL[st.base], tail, patches, dot: st.dot ? { col: KOI_COL[st.dot], u: 0.52 } : null, id: st.id };
}
function catLook(color) {
  const key = String(color || "").trim().toLowerCase();
  if (CATS[key]) return CATS[key];
  if (/^#?[0-9a-f]{6}$/.test(key)) { const c = key.startsWith("#") ? key : "#" + key; return { label: c, fur: c, tail: c, eyes: "#7fb04a" }; }
  return CATS.orange;
}
const TIP_DELAY = 450; // ms avant qu'une infobulle du canvas apparaisse
const VERDICT = { stable: "#8fae6a", unstable: "#d9a24a", dying: "#c0553f", unknown: "#7a7a8a" };
const BOOKS = ["#7a3b2a", "#2f4a3a", "#3a3f6a", "#6a5a2a", "#5a2f4a", "#2f5a5a"];
const CAM = 1.2, CAM_X = 320, CAM_Y = 214, CAM_OY = 196; // zoom sur l'île
const HUT_X = 245, SHELF_X = 352, PILLAR_X = [425, 462], PLATE_X = 318, SHELF_SCALE = 0.68; // valeurs par défaut ; le plan de l'île (layoutIsland) place chaque élément

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
    for (let x = 130; x <= 470; x += 20) top.push([x, GY - 1 - r() * 3]);
    const left = right.map(([x, y]) => [640 - x - 40 * (1 - (y - 207) / 165), y]).reverse(); // flanc gauche élargi (île plus large à gauche)
    g.outline = [...top, ...right.slice(1).map(([x, y]) => [x + (r() - 0.5) * 6, y]), ...left.slice(0, -1).map(([x, y]) => [x + (r() - 0.5) * 6, y])];
    for (let i = 0; i < 26; i++) { const y = GY + 8 + r() * 120, w = 30 + r() * 120; g.strata.push([320 - w / 2 - (y - GY) * 0.1 + r() * 20, y, w * (1 - (y - GY) / 220)]); }
    for (let x = 132; x < 470; x += 6 + r() * 6) g.tufts.push([x, 2 + r() * 4]);
    // plan de l'île : chaque gros élément a sa place (voir layoutIsland) ; on ne plante pas là où il y a cabane, bassin, chat, piliers
    const lay = (this.lay = layoutIsland(scene)); this.hutX = lay.hut ? lay.hut.x : HUT_X; this.pillX = lay.pillars ? lay.pillars.x : PILLAR_X; this.shelfX = lay.shelf ? lay.shelf.x : SHELF_X;
    const solid = (x) => lay.solid.some(([c0, c1]) => x > c0 && x < c1);
    g.clear = [lay.koi && [lay.koi.x0 - 3, lay.koi.x1 + 3], lay.cat && [lay.cat.x - 14, lay.cat.x + 14], lay.stalk && [lay.stalk.x - 8, lay.stalk.x + 8]].filter(Boolean);
    g.plants = placePlants(scene.additions, scene.seed, solid);
    g.grove = placePlants(scene.additions, scene.seed, () => false, 20); // le bosquet (vue rapprochée) montre tous les arbres, sans cabane ni bassin
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
    if (this.view && this.view !== "island" && this.view !== "global" && !this.available()[this.view]) this.view = "island"; // la page de cette vue a été retirée
    if (this.view === "cat" && this.catAsleep()) { this.view = "cabin"; if (this.opts.onView) this.opts.onView("cabin"); } // l'heure a tourné : il est rentré dormir
    if (this.view === "global") return this.drawFullView(ctx, sky, () => GL.drawGlobal(this, ctx, sc, sky, t, has));
    if (ROOMS[this.view]) return this.drawFullView(ctx, sky, () => ROOMS[this.view](this, ctx, sc, sky, t));
    ctx.save(); ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(CAM_X, CAM_OY); ctx.scale(CAM, CAM); ctx.translate(-CAM_X, -CAM_Y);
    this.drawSky(ctx, sky, t, has("aurora"));
    const mo = has("moons"); if (mo) SC.moons(ctx, sky);
    const cm = has("comet"); if (cm) SC.comet(ctx, this, cm.density, sky, t); // devant les étoiles, derrière les nuages
    this.drawClouds(ctx, 0, sky, t);
    const bd = has("birds"); if (bd) SC.birds(ctx, bd.density, sky, t);
    const fw = has("fireworks"); if (fw) this.drawFireworks(ctx, fw.density, sky, t);
    if (sc.surrounding === "ocean") this.drawOcean(ctx, sky, t);
    const is = has("islets"); if (is) SC.islets(ctx, this, is.density, sky, t);
    const cal = has("calendar"); if (cal) SC.calendar(ctx, this, sky, t);
    if (has("dniclock")) SC.dniClock(ctx, this, sky, t);
    this.drawIsland(ctx, sky, t);
    const dk = has("dock"); if (dk) SC.dock(ctx, this, sky, t, !!cal, !!has("dniclock"));
    for (const k of ["gold", "silver", "gems"]) { const o = has(k); if (o) this.drawOre(ctx, k, o.density, sky, t); }
    const mt = has("mountain"), tl = has("telescope"); if (mt || tl) this.drawMount(ctx, mt ? mt.density : 0, sky, t, !!tl); // avec l'observatoire, le sommet est aplani en terrasse
    if (tl) TL.drawOnIsland(this, ctx, sky, t);
    const wf = has("waterfall"); if (wf) this.drawWaterfall(ctx, t, "stream"); // le ruisseau coule sur la montagne : derrière les arbres
    this.drawPlants(ctx, 0, t);
    const kp = has("koi"); if (kp) this.drawKoi(ctx, kp, sky, t); // après les arbres du fond : le bassin n'est jamais recouvert
    if (wf) this.drawWaterfall(ctx, t, "fall"); // éclaboussures sur le bassin et chute sous l'île : devant
    this.drawStructures(ctx, sky, t);
    const bn = has("bench"); if (bn) SC.bench(ctx, this, sky, this.lay.bench ? this.lay.bench.x0 : 289);
    const ct = has("cat"); if (ct && !this.catAsleep()) this.drawCat(ctx, ct, sky, t); // endormi : il est dans la cabane, près du feu
    const sk = has("stalktree"); if (sk) this.drawStalk(ctx, sk, sky, t);
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
    const ak = clamp(((sky.night == null ? 0 : sky.night) - 0.3) / 0.45); // les aurores ne se voient que la nuit (invisibles de jour, elles se lèvent au crépuscule)
    if (aurora && ak > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const cols = [[80, 220, 160], [150, 120, 230], [90, 190, 220]];
      cols.forEach((c, i) => {
        ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.26 * ak); ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.beginPath();
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
    ctx.fillStyle = shade(T.top); ctx.beginPath(); ctx.moveTo(128, GY); ctx.lineTo(472, GY); ctx.lineTo(462, GY + 9); ctx.quadraticCurveTo(300, GY + 16, 138, GY + 9); ctx.closePath(); ctx.fill();
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

  drawPlants(ctx, row, t, list) {
    const sky = skyAt(this.hour()), amb = 0.4 + 0.6 * sky.ambient;
    for (const p of list || this.geo.plants) {
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

  /** Ruisseau : naît sur le flanc du mont, descend jusqu'au bassin (ou jusqu'au bord), puis tombe de l'île dans la brume. */
  /** Ruisseau (part « stream », sur la montagne, derrière les arbres) puis chute (part « fall », sous l'île, devant). */
  drawWaterfall(ctx, t, part = "all") {
    const L = this.lay, M = L.mount, koi = L.koi, mt = this.scene.additions.some((a) => a.type === "mountain");
    const fx = koi ? koi.x0 + 16 : M.x + M.hw * 0.5, sx = mt ? M.x + 16 : fx - 22, sy = mt ? GY - M.h * 0.86 : GY - 7, N = 24, pts = [];
    for (let i = 0; i <= N; i++) { const p = i / N; pts.push([sx + (fx - sx) * Math.pow(p, 1.15) + Math.sin(p * 7 + t * 0.4) * 0.8 * (1 - p), sy + (GY - sy) * p, 1.6 + 2.6 * p]); }
    if (part !== "fall") {
    ctx.fillStyle = "rgba(200,228,248,0.85)"; ctx.beginPath();
    pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x - w / 2, y) : ctx.moveTo(x - w / 2, y))); for (let i = N; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.9;
    for (let k = 0; k < 7; k++) { const q = frac(t * 0.4 + k / 7), i = Math.min(N - 1, Math.floor(q * N)), [x, y] = pts[i], [x2, y2] = pts[i + 1]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.fillStyle = "rgba(190,220,238,0.7)"; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 1.6, 0, 0, 6.283); ctx.fill(); // la source
    }
    if (part === "stream") return;
    for (let i = 0; i < 3; i++) { const p = frac(t * 0.5 + i / 3); ctx.strokeStyle = rgba(235, 245, 255, 0.4 * (1 - p)); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(fx, GY + 0.6, 2 + p * 7, 0.6 + p * 1.3, 0, 0, 6.283); ctx.stroke(); } // éclaboussures à l'arrivée
    // la chute : du fond du bassin (ou du bord de l'île) jusque dans la brume
    const ex = koi ? koi.x1 - 7 : fx, ey = koi ? GY + 17 : GY + 9, w = 8;
    const g = ctx.createLinearGradient(0, ey, 0, 350); g.addColorStop(0, "rgba(220,240,255,0.85)"); g.addColorStop(1, "rgba(220,240,255,0.08)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex - w / 2, ey); ctx.lineTo(ex + w / 2, ey); ctx.lineTo(ex + w / 2 + 4, 350); ctx.lineTo(ex - w / 2 - 4, 350); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const p = frac(t * 0.8 + i / 9), y = ey + p * (330 - ey), xx = ex - w / 2 + 1 + (i % 4) * 2.2; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + 8); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const p = frac(t * 0.3 + i / 6), r = 6 + p * 14; ctx.fillStyle = rgba(235, 245, 255, 0.16 * (1 - p)); ctx.beginPath(); ctx.arc(ex + Math.sin(i * 2 + t) * 6, 346 - p * 18, r, 0, 6.283); ctx.fill(); }
  }

  /** Arbre à tiges (page « stalktree ») : deux grandes tiges sombres à bulbes, ailes de feuilles pâles et poussières lumineuses autour. Un seul exemplaire. */
  drawStalk(ctx, a, sky, t) {
    const x = this.lay.stalk ? this.lay.stalk.x : 250, amb = 0.35 + 0.65 * sky.ambient, c = (h) => mix("#05060c", h, amb), night = sky.night || 0, k = 0.8 + 0.4 * clamp(a.density == null ? 0.5 : a.density);
    const stems = [{ dx: -4, h: 96 * k, bend: -5, w: 2.6, pod: 4.6 }, { dx: 3, h: 78 * k, bend: 7, w: 2.2, pod: 4 }, { dx: 9, h: 44 * k, bend: 10, w: 1.5, pod: 3 }];
    ctx.fillStyle = c("#3a3a2a"); ctx.beginPath(); ctx.ellipse(x + 2, GY + 1, 13, 3, 0, 0, 6.283); ctx.fill();
    const curve = (st, sw) => ({ x0: x + st.dx, y0: GY, cx: x + st.dx + st.bend * 0.2, cy: GY - st.h * 0.5, x1: x + st.dx + st.bend + sw, y1: GY - st.h });
    const at = (q, u) => [(1 - u) * (1 - u) * q.x0 + 2 * (1 - u) * u * q.cx + u * u * q.x1, (1 - u) * (1 - u) * q.y0 + 2 * (1 - u) * u * q.cy + u * u * q.y1];
    const qs = stems.map((st, i) => curve(st, Math.sin(t * 0.7 + i * 1.7) * 1.4));
    stems.forEach((st, i) => {
      const q = qs[i]; ctx.lineCap = "round";
      ctx.strokeStyle = c("#1f2b1d"); ctx.lineWidth = st.w; ctx.beginPath(); ctx.moveTo(q.x0, q.y0); ctx.quadraticCurveTo(q.cx, q.cy, q.x1, q.y1); ctx.stroke();
      ctx.strokeStyle = c("#3b4f33"); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(q.x0 + 0.8, q.y0); ctx.quadraticCurveTo(q.cx + 0.8, q.cy, q.x1 + 0.6, q.y1 + 2); ctx.stroke();
      ctx.fillStyle = c("#14170f"); ctx.beginPath(); ctx.ellipse(q.x1, q.y1 - st.pod * 0.6, st.pod * 0.8, st.pod, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgba(255, 255, 255, 0.12); ctx.beginPath(); ctx.ellipse(q.x1 - 1, q.y1 - st.pod * 0.9, st.pod * 0.25, st.pod * 0.4, 0, 0, 6.283); ctx.fill();
    });
    // bulbes latéraux avec leurs ailes de feuilles
    [[0, 0.56, 4.6, 1], [1, 0.42, 3.6, 1]].forEach(([si, u, r, wings], j) => {
      const [bx, by] = at(qs[si], u); ctx.fillStyle = c("#1c211b"); ctx.beginPath(); ctx.ellipse(bx, by, r, r * 1.15, 0, 0, 6.283); ctx.fill();
      for (let w = 0; w < (wings ? 2 : 0); w++) { const sg = w ? 1 : -1, fl = Math.sin(t * 1.1 + j + w) * 0.08; ctx.fillStyle = c("#a9b890"); ctx.beginPath(); ctx.moveTo(bx, by + 1); ctx.quadraticCurveTo(bx + sg * r * 2.4, by - r * (1.1 + fl * 4), bx + sg * r * 3.6, by + r * 0.3); ctx.quadraticCurveTo(bx + sg * r * 1.6, by + r * 0.2, bx, by + 1); ctx.fill(); }
    });
    // poussières lumineuses autour de la cime
    const rr = rng((this.scene.seed ^ 0x57a1) >>> 0), top = stems[0].h;
    for (let i = 0; i < 26; i++) {
      const px = x + (rr() - 0.5) * 78 + Math.sin(t * 0.4 + i) * 4, py = GY - top * (0.35 + rr() * 0.8) + Math.sin(t * 0.6 + i * 1.3) * 3, tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + rr()) + i));
      ctx.fillStyle = rgba(240, 238, 150, tw * (0.5 + 0.5 * night + 0.2)); ctx.fillRect(px, py, 1.2, 1.2);
    }
    if (night > 0.35) { const [px, py] = [qs[0].x1, qs[0].y1 - 3], g = ctx.createRadialGradient(px, py, 0, px, py, 16); g.addColorStop(0, rgba(240, 235, 150, 0.22 * night)); g.addColorStop(1, rgba(240, 235, 150, 0)); ctx.fillStyle = g; ctx.fillRect(px - 16, py - 16, 32, 32); }
    this.hot.push({ x: x - 12, y: GY - top - 8, w: 34, h: top + 8, tip: "Stalk tree" });
  }

  /** Bassin de carpes koï : coupe de profil dans la roche, à droite de la cabane. Une koï rare (ogon, platine ou fantôme) nage avec les autres. */
  drawKoi(ctx, a, sky, t) {
    const X0 = this.lay.koi ? this.lay.koi.x0 : 282, PW = 52, Y0 = GY + 2, PH = 15, amb = 0.35 + 0.65 * sky.ambient, shade = (c) => mix("#05060c", c, amb);
    const r = rng((this.scene.seed ^ 0x6b01) >>> 0), RARE = ["ogon", "platinum", "ghost"];
    const rare = KOI_RARE[String(a.rare || a.asset || "").toLowerCase()] ? String(a.rare || a.asset).toLowerCase() : RARE[Math.floor(r() * RARE.length)];
    const water = ctx.createLinearGradient(0, Y0, 0, Y0 + PH); water.addColorStop(0, shade("#3f7f96")); water.addColorStop(1, shade("#143550"));
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, PW, PH); ctx.clip();
    ctx.fillStyle = water; ctx.fillRect(X0, Y0, PW, PH);
    if (this.koiUnder) this.koiUnder(ctx, { X0, Y0, PW, PH }, shade); // décor sous l'eau (vue du bassin agrandi)
    ctx.strokeStyle = rgba(230, 245, 255, 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(X0, Y0 + 0.6); ctx.lineTo(X0 + PW, Y0 + 0.6); ctx.stroke();
    const n = Math.round(2 + a.density * 5), genomes = [koiGenome(r, KOI_RARE[rare])]; for (let i = 1; i < n; i++) genomes.push(koiGenome(r, null));
    const fish = (i, gn, size, rareKind) => {
      const ph = i * 2.1 + r() * 6, sp = 0.18 + r() * 0.16, lane = Y0 + 4.5 + (i % 3) * 3.6, s = Math.sin(t * sp + ph), dir = Math.cos(t * sp + ph) >= 0 ? 1 : -1;
      const x = X0 + 6 + (PW - 12) * (0.5 + 0.5 * s), y = lane + Math.sin(t * 0.9 + ph) * 0.7, wag = Math.sin(t * 6 + ph) * 1.2;
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
      if (rareKind) { const pulse = 0.8 + 0.2 * Math.sin(t * 2.4 + ph), gl = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 2); gl.addColorStop(0, rareKind.glow); gl.addColorStop(0.45, rareKind.glow2); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.globalAlpha = pulse; ctx.fillStyle = gl; ctx.fillRect(-size * 2.2, -size * 2.2, size * 4.4, size * 4.4); ctx.globalAlpha = 1; }
      const al = rareKind && rareKind.alpha ? rareKind.alpha : 1; ctx.globalAlpha = al;
      ctx.fillStyle = shade(gn.tail); ctx.beginPath(); ctx.moveTo(-size * 0.45, 0); ctx.lineTo(-size * 0.8, -size * 0.2 + wag * 0.4); ctx.lineTo(-size * 0.8, size * 0.2 + wag * 0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(gn.base); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, 6.283); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, 6.283); ctx.clip(); // les taches restent dans le corps
      for (const p of gn.patches) { ctx.fillStyle = shade(p.col); ctx.globalAlpha = al * p.a; const cx = p.u * size * 0.46, cy = p.v * size * 0.1; ctx.beginPath(); ctx.ellipse(cx, cy, p.rx * size * 0.5, p.ry * size * 0.2, p.rot, 0, 6.283); ctx.fill(); for (const [du, dv, k] of p.blobs) { ctx.beginPath(); ctx.ellipse(cx + du * size * 0.4, cy + dv * size * 0.2, p.rx * size * 0.5 * k, p.ry * size * 0.2 * k, p.rot, 0, 6.283); ctx.fill(); } }
      ctx.restore(); ctx.globalAlpha = al;
      if (gn.dot) { ctx.fillStyle = shade(gn.dot.col); ctx.beginPath(); ctx.arc(gn.dot.u * size * 0.46, 0, size * 0.085, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = rgba(10, 10, 14, 0.8); ctx.fillRect(size * 0.34, -size * 0.07, 0.9, 0.9);
      if (rareKind) for (let k = 1; k <= 6; k++) { const ox = -dir * k * 2.6, oy = Math.sin(t * 7 + k * 1.7) * 1.4, a = (1 - k / 7) * 0.8 * (0.6 + 0.4 * Math.sin(t * 9 + k)); ctx.fillStyle = rareKind.spark.replace("A", a.toFixed(2)); ctx.fillRect(ox * dir - 0.5, oy - 0.5, 1.1, 1.1); }
      ctx.restore();
      return [x, y];
    };
    for (let i = 1; i < n; i++) fish(i, genomes[i], 8.5 + r() * 2, null);
    const [rx, ry] = fish(0, genomes[0], 15.5, KOI_RARE[rare]);
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
    const cat = catLook(a.color), amb = 0.4 + 0.6 * sky.ambient, shade = (c) => mix("#05060c", c, amb), CX = this.lay.cat ? this.lay.cat.x : 203, K = 1.3;
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

  /**
   * Le chat dort-il dans la cabane, sur le tapis ? Option de page `sleep=` : never (toujours dehors), always (toujours au coin du feu),
   * auto (défaut) : le soir et la nuit, surtout quand l'âtre brûle ; parfois par pluie ou neige, rarement en plein jour.
   * Le tirage change par demi-heure (jamais d'une image à l'autre) et dépend de la graine du Relto.
   */
  catAsleep() {
    const sc = this.scene, has = (ty) => sc.additions.find((a) => a.type === ty), cat = has("cat");
    if (!cat || !sc.structures.includes("hut")) return false;
    const mode = String(cat.sleep || "auto").toLowerCase();
    if (mode === "never" || mode === "no" || mode === "off") return false;
    if (mode === "always" || mode === "yes" || mode === "fire") return true;
    const h = ((this.hour() % 24) + 24) % 24, fire = !!has("chimney"), wet = !!(has("rain") || has("storm") || has("snow"));
    const p = h >= 19.5 || h < 6.5 ? (fire ? 0.85 : 0.5) : wet ? 0.55 : h >= 17 && fire ? 0.3 : 0.06;
    return rng((sc.seed ^ fnv("cat-sleep|" + Math.floor(h * 2))) >>> 0)() < p;
  }

  /**
   * Le chat roulé en boule (vue de la cabane) : il respire, une oreille frémit de temps en temps, la queue fait le tour du corps.
   * (x, y) : le sol sous lui ; S : échelle ; glow : lueur de l'âtre (0 = feu éteint) ; shade : la pénombre de la pièce.
   */
  drawSleepingCat(ctx, a, { x, y, S, glow = 0, shade = (c) => c }, t) {
    const cat = catLook(a.color), br = 1 + 0.045 * Math.sin(t * 1.5), tw = frac(t * 0.13 + (this.scene.seed % 5) / 5) > 0.975 ? Math.sin(t * 40) * 0.25 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
    ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(0, 0, 13, 2.2, 0, 0, 6.283); ctx.fill(); // ombre sur le tapis
    // corps : une miche couchée, qui se soulève doucement
    ctx.save(); ctx.translate(1, 0); ctx.scale(1, br);
    ctx.fillStyle = shade(cat.fur); ctx.beginPath(); ctx.ellipse(0, -5, 11, 5.4, 0, 0, 6.283); ctx.fill();
    if (cat.belly) { ctx.fillStyle = shade(cat.belly); ctx.beginPath(); ctx.ellipse(-2.5, -1.7, 5.5, 1.7, 0, 0, 6.283); ctx.fill(); }
    if (cat.patch) { ctx.fillStyle = shade(cat.patch); ctx.beginPath(); ctx.ellipse(4, -7, 4.2, 2.6, 0.2, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2, -8.4, 2.2, 1.4, -0.2, 0, 6.283); ctx.fill(); }
    if (cat.stripes) { ctx.strokeStyle = shade(cat.stripes); ctx.lineWidth = 0.8; for (let i = 0; i < 4; i++) { const sx = -3 + i * 3.2; ctx.beginPath(); ctx.moveTo(sx, -10.2); ctx.quadraticCurveTo(sx + 1.2, -7.4, sx + 0.4, -5.4); ctx.stroke(); } }
    ctx.restore();
    // queue enroulée devant, jusque sous le museau
    ctx.strokeStyle = shade(cat.tail); ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(10.5, -2.5); ctx.bezierCurveTo(13.5, 0.5, 7, 1.6, 0, 1.4); ctx.quadraticCurveTo(-6, 1.2, -9 + Math.sin(t * 0.7) * 0.4, -0.4); ctx.stroke();
    // patte avant, tête posée dessus
    ctx.fillStyle = shade(cat.paws || cat.fur); ctx.beginPath(); ctx.ellipse(-9.5, -1.2, 2.6, 1.3, 0, 0, 6.283); ctx.fill();
    const hx = -8.2, hy = -5.2;
    ctx.fillStyle = shade(cat.ears || cat.fur);
    ctx.beginPath(); ctx.moveTo(hx - 3.4, hy - 1.6); ctx.lineTo(hx - 4.4, hy - 6); ctx.lineTo(hx - 0.9, hy - 3.6); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(hx + 2.2, hy - 2.6); ctx.rotate(0.35 + tw); ctx.beginPath(); ctx.moveTo(-1.6, 0.4); ctx.lineTo(0.2, -4.2); ctx.lineTo(1.8, 0.2); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = shade(cat.face || cat.fur); ctx.beginPath(); ctx.ellipse(hx, hy, 4.4, 3.9, -0.15, 0, 6.283); ctx.fill();
    if (cat.muzzle) { ctx.fillStyle = shade(cat.muzzle); ctx.beginPath(); ctx.ellipse(hx - 0.8, hy + 1.6, 2.2, 1.5, 0, 0, 6.283); ctx.fill(); }
    // yeux clos : deux petits arcs
    const fur = String(cat.face || cat.fur), dark = /^#[0-9a-f]{6}$/i.test(fur) && parseInt(fur.slice(1, 3), 16) + parseInt(fur.slice(3, 5), 16) + parseInt(fur.slice(5, 7), 16) < 240;
    ctx.strokeStyle = shade(dark ? "#8a8296" : "#1a1410"); ctx.lineWidth = 0.55; // sur un pelage sombre, les paupières se lisent en clair
    for (const ex of [hx - 2.3, hx + 1.3]) { ctx.beginPath(); ctx.arc(ex, hy - 0.4, 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = shade("#d98a8a"); ctx.fillRect(hx - 0.9, hy + 1, 0.8, 0.55);
    // lueur de l'âtre sur le dos (le feu est à droite)
    if (glow > 0) { ctx.strokeStyle = rgba(255, 170, 80, 0.5 * glow); ctx.lineWidth = 0.9; ctx.lineCap = "butt"; ctx.beginPath(); ctx.ellipse(1, -5 * br, 11, 5.4 * br, 0, -0.95, 0.3); ctx.stroke(); }
    ctx.restore();
    // quelques « z » qui montent, très pâles
    if (!this.opts.reducedMotion) for (let i = 0; i < 2; i++) { const p = frac(t * 0.18 + i * 0.5); ctx.fillStyle = rgba(240, 230, 210, 0.35 * Math.sin(p * Math.PI)); ctx.font = `italic ${Math.round(S * (2.6 + p * 1.6))}px serif`; ctx.fillText("z", x + S * (-11 + p * 4 + i * 2), y - S * (11 + p * 9)); }
    const nm = String(a.name || "").trim();
    this.hot.push({ x: x - 14 * S, y: y - 12 * S, w: 27 * S, h: 13 * S, tip: nm ? `${nm} — asleep by the fire` : `A ${cat.label} cat, asleep`, flash: "purr…", purr: true });
  }

  // ---- l'Imageur (page « imager ») --------------------------------------------------------------
  /**
   * État de l'Imageur : l'Âge posé sur le lutrin (parmi ceux de l'étagère), son ciel (`target`), sa vue (modèle génératif)
   * et le réglage de la console. Les données d'un Âge viennent de `opts.onImagerAge(age)` (lecture de la note, analyse,
   * physique) ; le réglage est relu et gardé par `opts.imagerGet / imagerSet` (par chemin de note).
   */
  imagerState() {
    const guild = this.imagerGuildOn();
    if (this.imager && !!this.imager.guild !== guild) this.imager = null; // le mode a changé : l'appareil change de livre
    if (guild) return this.imagerGuild();
    if (!this.imager) this.imager = { idx: 0, station: null, hand: null, age: null, target: null, model: null, settings: IM.normalize(null), loading: null, empty: false };
    const st = this.imager, ages = (this.scene && this.scene.ages) || [];
    st.empty = !ages.length;
    if (ages.length && (!st.age || !ages.some((a) => a.path === st.age.path)) && !st.loading) this.imagerLoad(Math.min(st.idx, ages.length - 1));
    return st;
  }
  imagerNow() { return this.nowOverride != null ? this.nowOverride : Date.now(); }
  /** Le mode des instruments (réglage `instrumentsMode`, lu par `opts.instrumentsMode()`) : "guild" = l'Art de la Guilde. */
  imagerGuildOn() { return !!(this.opts && typeof this.opts.instrumentsMode === "function" && this.opts.instrumentsMode() === "guild"); }
  /** Où le mode Guilde garde son état (par Relto, à part des réglages de chaque Âge) : une clé dans `imagerGet / imagerSet`. */
  imagerGuildKey() { const sc = this.scene || {}; return "guild:" + T.keyOf(sc.name, sc.seed); }
  /**
   * L'Imageur au LIVRE VIERGE (mode Guilde, src/imager-guild.js) : on ne choisit pas l'Âge, on le trouve. Les Âges de l'étagère
   * sont tous lus (`cands`) ; à chaque image, le monde que les réglages approchent (`world`) devient la cible : parmi les Âges
   * de l'étoile que tient le télescope (`star`, sa lumière `light` au comparateur), sinon parmi tous. Aucun : fenêtre noire.
   * Cristaux justes (`planet`) : la station III s'éveille, et le micromètre de synchro (étape 2) trouve la planète.
   */
  imagerGuild() {
    const ages = (this.scene && this.scene.ages) || [], sig = ages.map((a) => a.path).join("\n"), gkey = this.imagerGuildKey();
    if (!this.imager || this.imager.gkey !== gkey) {
      const saved = this.opts.imagerGet ? this.opts.imagerGet(gkey) : null;
      this.imager = { guild: true, gkey, station: null, hand: null, age: null, target: null, model: null, settings: IM.normalize(saved), g: GI.normalize(saved), cands: [], sig: null, loading: null, empty: false, world: null, planet: false, star: null, light: null };
    }
    const st = this.imager; st.empty = !ages.length; st.ages = ages;
    if (st.sig !== sig && !st.loading) {
      st.sig = sig; const token = (st.loading = {}); if (this.unwrittenCache) this.unwrittenCache.clear(); // l'étagère a changé (un monde transcrit l'a rejointe) : on recherche
      Promise.all(ages.map((age) => Promise.resolve(this.opts.onImagerAge ? this.opts.onImagerAge(age) : null).then((data) => ({ age, data }), () => ({ age, data: null })))).then((list) => {
        if (st.loading !== token) return; st.loading = null; st.cands = list.filter((c) => c.data && c.data.target);
        if (!this.running) this.draw(0);
      });
    }
    this.imagerFind();
    this.imagerRemember((text) => { this.flash = { text, x: W / 2, y: 120, until: Date.now() + 3200 }; }); // l'image peut se former d'elle-même (la phase dérive)
    return st;
  }
  /** Le monde que les réglages approchent, et ce qui en découle (cible, vue, système, lumière renvoyée par le télescope). */
  imagerFind() {
    const st = this.imager, now = this.imagerNow(), star = TL.aimedOf(this), s = st.settings, g = st.g;
    st.star = star; st.light = GI.lightOf(st.cands, star);
    let pick = GI.choose(st.cands, g.cry, s, now, star, st.loading || st.sig == null ? null : this.imagerFinder()); // les mondes jamais écrits : une fois l'étagère lue (un Âge écrit l'emporte toujours)
    if (s.lock && g.lockOn) { const held = st.cands.find((c) => c.age.path === g.lockOn); if (held) pick = { world: held, planet: true }; } // verrouillé : la machine tient son monde
    const w = pick.world;
    if (!w || !st.world || w.age.path !== st.world.age.path) { st.anim = null; st.thumb = null; }
    st.world = w; st.planet = !!(w && pick.planet); st.age = w ? w.age : null;
    st.target = GI.targetOf(w, g.cry); st.model = w ? w.data.model || null : null; st.view = !!st.model;
    st.system = st.planet ? w.data.system || null : null; st.orbit = st.planet ? w.data.orbit || null : null; // la synchro ne cherche qu'une planète tenue
    if (s.lock && !st.planet && !st.loading) { st.settings = { ...s, lock: false, az: 0, tilt: 0 }; st.g = { ...g, lockOn: null }; } // le monde a glissé : le verrou lâche
  }
  /**
   * Mode Guilde : le chercheur de mondes jamais écrits (src/unwritten.js, `find`, fourni par `opts.unwrittenFind(cry, s)`),
   * mis en cache par clé de réglages (mêmes réglages, même monde ou rien ; la scène générative n'est construite qu'une fois).
   */
  imagerFinder() {
    const f = this.opts && this.opts.unwrittenFind; if (typeof f !== "function") return null;
    const cache = (this.unwrittenCache = this.unwrittenCache || new Map());
    return (cry, s) => {
      const k = UW.keyOf(cry, s); if (!k) return null;
      if (cache.has(k)) return cache.get(k);
      let w = null; try { w = UW.lucky(k) ? f(cry, s) || null : null; } catch (e) { w = null; }
      if (cache.size > 200) cache.delete(cache.keys().next().value);
      cache.set(k, w); return w;
    };
  }
  /** Les textes de l'Imageur (`opts.t`, l'anglais à défaut). */
  imagerTr() { return this.opts && typeof this.opts.t === "function" ? this.opts.t : EN_T; }
  /** Garder le réglage : par Âge (mode facile), ou l'état du livre vierge (mode Guilde). */
  imagerSave() {
    const st = this.imager; if (!this.opts.imagerSet) return;
    if (st.guild) this.opts.imagerSet(st.gkey, GI.saved(st.settings, st.g));
    else if (st.age) this.opts.imagerSet(st.age.path, st.settings);
  }
  /** Mode Guilde : l'image se forme (nette, cristaux justes) — le livre vierge s'en souvient, le nom s'inscrit sur sa page. */
  imagerRemember(say) {
    const st = this.imager; if (!st.guild || !st.planet || !st.world) return false;
    const name = String(st.world.age.name), clear = st.settings.lock || this.imagerClarity().total >= IM.LOCK_AT;
    if (st.world.unwritten) { // un monde que personne n'a écrit : pas de nom à inscrire ; une note étrange et une ligne, une fois par monde
      const key = st.world.unwritten.key; if (!clear || st.uSeen === key) return false;
      st.uSeen = key; if (this.opts.onImagerSound) this.opts.onImagerSound("unwritten");
      const t = this.imagerTr(); if (say) say(t("guild.unwritten.formed"));
      return true;
    }
    if (!clear || st.g.seen.includes(name)) return false;
    st.g = { ...st.g, seen: [...st.g.seen, name].sort() }; this.imagerSave();
    const t = this.imagerTr(); if (say) say(t("guild.inscribed", { name }));
    return true;
  }
  imagerLoad(i) {
    const ages = (this.scene && this.scene.ages) || [], st = this.imager; if (!ages.length) return;
    st.idx = ((i % ages.length) + ages.length) % ages.length; const age = ages[st.idx];
    st.age = age; st.target = null; st.model = null; st.view = false; st.thumb = null; st.hand = null; st.anim = null; st.system = null; st.orbit = null;
    st.settings = IM.normalize(this.opts.imagerGet ? this.opts.imagerGet(age.path) : null);
    if (!this.opts.onImagerAge) return;
    const token = (st.loading = {});
    Promise.resolve(this.opts.onImagerAge(age)).then((d) => {
      if (st.loading !== token) return; st.loading = null;
      if (!d) return; st.target = d.target; st.model = d.model; st.view = !!d.model; st.system = d.system || null; st.orbit = d.orbit || null; // étape 2 : son système d'étoile, son orbite
      if (st.settings.tilt < 0 && !RV.hasUnder(st.model)) st.settings = { ...st.settings, tilt: 0 };
      if (st.settings.lock && !IM.canLock(st.settings, st.target, this.imagerNow())) st.settings = { ...st.settings, lock: false, az: 0, tilt: 0 }; // le livre a changé depuis : le verrou a glissé
      if (!this.running) this.draw(0);
    }, () => { if (st.loading === token) st.loading = null; });
  }
  /**
   * La vue de l'Âge sur l'écran : un petit canvas repeint à chaque image (de face ; verrouillé, là où regarde le
   * périscope). Pendant qu'on tourne ou qu'on lève les yeux, l'ancienne vue est peinte aussi, pour glisser de l'une à l'autre.
   */
  imagerView(st, t) {
    if (!st.model) return null;
    if (!st.canvas) st.canvas = makeCanvas(300, 176);
    st.thumb = st.canvas;
    if (!st.sq) st.sq = makeCanvas(350, 350);
    const s = st.settings, look = s.lock ? { az: s.az, tilt: s.tilt } : { az: 0, tilt: 0 }, now = this.imagerNow();
    RI.paintView(st.canvas, st.model, st.target, t, now, look, st.sq);
    const a = st.anim;
    if (a && t >= a.t0 && t - a.t0 < 0.7) {
      if (!st.canvas2) st.canvas2 = makeCanvas(300, 176);
      RI.paintView(st.canvas2, st.model, st.target, t, now, a.from, st.sq);
      return { cur: st.canvas, prev: st.canvas2, p: (t - a.t0) / 0.7, dx: a.dx, dy: a.dy };
    }
    return { cur: st.canvas };
  }
  /**
   * Étape 2 : la calibration de l'Âge sur le lutrin (src/calibration.js). Null tant que son système d'étoile n'est pas situé
   * au télescope de ce Relto : l'Imageur est alors exactement celui d'avant. Sinon : l'état du micromètre (`q`, `synced`,
   * `certain`, `reading`, `gap`), le système situé (`sys`, sa position GZCS) et l'heure locale (`lt`).
   */
  imagerCal() {
    const st = this.imager; if (!st || !st.system || !st.orbit) return null;
    const tel = TL.systemsOf(this), sys = tel.found && tel.systems ? tel.systems[st.system.key] : null; if (!sys) return null;
    const other = st.guild && st.g.syncFor !== (st.world && st.world.age.path); // mode Guilde : la synchro vaut pour le monde où elle a été faite
    const now = this.imagerNow(), set = other || (st.settings.sysKey && st.settings.sysKey !== st.system.key) ? { ...st.settings, syncAt: null } : st.settings; // l'étoile a changé depuis la synchro
    let c = CAL.state(set, st.orbit, true, now);
    if (sys.beatErr) c = { ...c, synced: false, certain: false, q: 0, slip: true }; // gravée au mauvais battement : la planète glisse, rien ne tient
    return { ...c, sys, system: st.system, lt: CAL.localTime(st.orbit, c, now + CAL.lineShift(st.orbit, sys.line)) }; // étape 3 : gravée sur la fausse ligne, l'heure là-bas est fausse
  }
  /** Un geste sur la machine : un livre, un poste, un cristal, un verre, un bouton, le verrou, le périscope, le micromètre. */
  imagerAct(a) {
    const st = this.imagerState(), tg = st.target, before = st.settings, now = this.imagerNow(), sfx = (k) => { if (this.opts.onImagerSound) this.opts.onImagerSound(k); };
    const say = (text) => { const h = this.hover || { x: W / 2, y: H / 2, w: 0 }; this.flash = { text, x: h.x + (h.w || 0) / 2, y: h.y, until: Date.now() + 2400 }; };
    if (a.hum) { if (this.opts.onImagerHum) this.opts.onImagerHum(a.hum); sfx("click"); return; }
    if (a.sync != null) { // le micromètre de synchro : seulement quand le système de l'Âge est situé
      const cal = this.imagerCal(), tt = this.opts && typeof this.opts.t === "function" ? this.opts.t : null; if (!cal) return;
      if (cal.slip) { st.settings = IM.normalize({ ...before, sync: CAL.turnSync(before, a.sync, st.orbit, true, now).s.sync, syncAt: null }); sfx("click"); if (tt) say(tt("cal.slip")); this.imagerSave(); return; } // le mauvais battement : la planète glisse
      const res = CAL.turnSync(before, a.sync, st.orbit, true, now); st.settings = IM.normalize(res.synced ? { ...res.s, sysKey: st.system.key } : res.s);
      if (st.guild) {
        st.g = { ...st.g, syncFor: res.synced && st.world ? st.world.age.path : null };
        if (res.synced && st.world && this.opts.imagerGet && this.opts.imagerSet) { const p = st.world.age.path, s = st.settings; this.opts.imagerSet(p, { ...(this.opts.imagerGet(p) || {}), sync: s.sync, syncAt: s.syncAt, sysKey: s.sysKey }); } // l'onglet Détails de l'Âge dit l'heure là-bas
      }
      if (res.synced && !(cal.synced && cal.certain && cal.q >= 1)) { sfx("lock"); if (tt) say(tt("cal.synced")); } else sfx("click");
      this.imagerSave();
      if (this.opts.onImagerTune) this.opts.onImagerTune(st);
      return;
    }
    if (st.guild) { if (this.imagerGuildAct(a, st, before, sfx, say)) return; }
    else if (a.book) { this.imagerLoad(st.idx + a.book); sfx("page"); return; }
    if ("station" in a) { st.station = a.station; st.hand = null; return; }
    if (a.lock) {
      if (!tg) return;
      const res = IM.toggleLock(before, tg, now); st.settings = res.s;
      if (!res.ok) { sfx("jam"); say("It won't hold — the image is not clear"); return; }
      sfx(res.locked ? "lock" : "unlock"); say(res.locked ? "Locked — the machine follows the Age" : "Released");
      if (st.guild) st.g = { ...st.g, lockOn: res.locked && st.world ? st.world.age.path : null };
      if (!res.locked && (before.az || before.tilt)) this.imagerAnim(before, st.settings);
    } else if (a.slot != null || a.rack != null) {
      if (before.lock) { say("The lock holds the crystals"); return; }
      const res = IM.place(before, null, a.slot != null ? { slot: a.slot } : { rack: a.rack }); st.hand = null; // d'un clic : posé dans le premier logement libre, ou rendu
      if (res.full) { sfx("jam"); say(this.imagerTr()("cry.full")); return; }
      st.settings = res.s; sfx(res.s.cry.filter((v) => v >= 0).length < before.cry.filter((v) => v >= 0).length ? "lift" : "set");
    } else if ("tilt" in a) {
      if (!before.lock) { sfx("jam"); say("The periscope is free only once the lock holds"); return; }
      if (a.tilt < 0 && !RV.hasUnder(st.model)) { sfx("jam"); say("Nothing below but rock"); return; }
      st.settings = IM.turn(before, "tilt", a.tilt - before.tilt); sfx("lever");
    } else if (a.key) {
      if (before.lock && a.key !== "az") { say("The lock holds the tuning"); return; }
      if (a.key === "az" && !before.lock) { sfx("jam"); say("The periscope is free only once the lock holds"); return; }
      st.settings = a.value != null ? IM.set(before, a.key, a.value) : IM.turn(before, a.key, a.delta, tg && tg.crystals ? tg.crystals.options.length : 8);
      sfx(a.key === "az" ? "crank" : a.value != null ? "slide" : "click");
      if (a.key === "az") st.crankSpin = 0;
    }
    if (st.settings.az !== before.az || st.settings.tilt !== before.tilt) this.imagerAnim(before, st.settings);
    if (st.guild) { this.imagerFind(); this.imagerRemember(say); }
    this.imagerSave();
    if (this.opts.onImagerTune) this.opts.onImagerTune(st);
  }
  /**
   * Mode Guilde : les gestes propres au livre vierge (les cristaux sont des glyphes ; le râtelier a des rangées ; la station III
   * dort tant que les cristaux ne tiennent pas une planète). Renvoie vrai si le geste est traité ici.
   */
  imagerGuildAct(a, st, before, sfx, say) {
    const t = this.imagerTr(), done = () => { this.imagerFind(); this.imagerSave(); if (this.opts.onImagerTune) this.opts.onImagerTune(st); return true; };
    if (a.book) return true; // un seul livre, fixé dans l'appareil
    if (a.transcribe) { this.imagerTranscribe(st, sfx, say); return true; }
    if (a.rackPage) { const rack = GI.rackOf((this.scene && this.scene.ages) || [], st.cands), n = GI.pages(rack); st.g = { ...st.g, page: (((st.g.page + a.rackPage) % n) + n) % n }; sfx("click"); return done(); }
    if (a.slot != null || a.rack != null) {
      if (before.lock) { say(t("guild.lock.cry")); return true; }
      const res = GI.place(st.g.cry, null, a.slot != null ? { slot: a.slot } : { rack: a.rack }), was = st.planet;
      if (res.full) { sfx("jam"); say(t("cry.full")); return true; }
      const removed = res.cry.filter(Boolean).length < st.g.cry.filter(Boolean).length;
      st.hand = null; st.g = { ...st.g, cry: res.cry }; sfx(removed ? "lift" : "set");
      this.imagerFind(); if (st.planet && !was) { sfx("lock"); say(t("guild.planet")); }
      if (this.opts.onImagerChord) { // la note du cristal posé ; les quatre posés : l'accord, posé ou qui bat
        const placed = !removed && a.rack != null ? a.rack : null;
        if (GI.full(st.g.cry)) this.opts.onImagerChord(GI.chordOf(st.g.cry), GI.beatOf(st.planet, st.target));
        else if (placed) this.opts.onImagerChord(GI.chordOf([placed]), 0);
      }
      this.imagerRemember(say);
      return done();
    }
    // quatre cristaux posés sans monde tenu : le régulateur cherche (un monde que personne n'a écrit, src/unwritten.js)
    if (a.key && ["freq", "amp", "harm", "phase", "pol"].includes(a.key) && !st.planet && !GI.full(st.g.cry) && !before.lock) { sfx("jam"); say(t("guild.atmo.asleep")); return true; }
    return false;
  }
  /**
   * Transcrire le monde jamais écrit que montre le livre vierge (image formée) : `opts.onTranscribe(u)` crée la note (src/entry.js,
   * `transcribeWorld`) et renvoie son nom. Le monde devient un Âge écrit : il rejoint l'étagère, et c'est lui qui répondra.
   */
  imagerTranscribe(st, sfx, say) {
    const t = this.imagerTr(), w = st.world, u = w && w.unwritten;
    if (!u || !RI.formed(this, st)) { sfx("jam"); say(t("guild.transcribe.blur")); return; }
    if (!this.opts.onTranscribe || st.transcribing) return;
    st.transcribing = true; sfx("page");
    Promise.resolve(this.opts.onTranscribe(u)).then((name) => {
      st.transcribing = false;
      if (name) { st.transcribed = { key: u.key, name }; this.flash = { text: t("guild.transcribed", { name }), x: W / 2, y: 120, until: Date.now() + 3600 }; }
      else this.flash = { text: t("guild.transcribe.fail"), x: W / 2, y: 120, until: Date.now() + 3200 };
      if (!this.running) this.draw(0);
    }, () => { st.transcribing = false; });
  }
  /** La vue glisse de l'ancienne direction vers la nouvelle (de côté pour l'azimut, de haut en bas pour l'inclinaison). */
  imagerAnim(from, to) {
    const st = this.imager; if (this.opts.reducedMotion) return;
    const d = ((to.az - from.az + 4) % 4) === 3 ? -1 : to.az !== from.az ? 1 : 0;
    st.anim = { from: { az: from.lock ? from.az : 0, tilt: from.lock ? from.tilt : 0 }, t0: this.imagerT || 0, dx: d, dy: d ? 0 : to.tilt > from.tilt ? -1 : 1 };
  }
  /** Les trois réglages et la netteté finale (0 à 1) : pour le son et les tests. */
  imagerClarity() { const st = this.imager; return st && st.target ? IM.clarity(st.settings, st.target, this.imagerNow()) : { cry: 0, lens: 0, atmo: 0, total: 0 }; }
  /** La netteté vue à l'écran : celle du réglage, plus le bonus de la calibration (identique sans calibration). */
  imagerSeen() { const cl = this.imagerClarity(), cal = this.imagerCal(), q = cal ? cal.q : 0; if (!(q > 0)) return cl; const o = { cry: CAL.boost(cl.cry, q), lens: CAL.boost(cl.lens, q), atmo: CAL.boost(cl.atmo, q) }; return { ...o, total: o.cry * o.lens * o.atmo }; }
  imagerSharpness() { return this.imagerClarity().total; }

  /** étiquette brève (nom du chat, de la koï) affichée après un clic */
  /** partie visible du monde (x0, x1, y0) : la caméra de l'île recadre les bords, la vue globale montre tout */
  visible_() { return this.view && this.view !== "island" ? [0, W, 0] : [CAM_X - CAM_X / CAM, CAM_X + (W - CAM_X) / CAM, CAM_Y - CAM_OY / CAM]; }
  drawFlash(ctx) {
    const f = this.flash; if (!f) return;
    if (Date.now() > f.until) { this.flash = null; return; }
    ctx.save(); const [vx0, vx1, vy0] = this.visible_(); const big = this.view && this.view !== "island", fs = big ? 14 : 8, fh = fs + 4; ctx.font = `${fs}px serif`; const tw = ctx.measureText(f.text).width, w = tw + 10, x = clamp(f.x - w / 2, vx0 + 4, Math.max(vx0 + 4, vx1 - w - 4)), y = Math.max(vy0 + 2, f.y - fh);
    ctx.fillStyle = "rgba(14,12,10,0.82)"; ctx.fillRect(x, y, w, fh); ctx.strokeStyle = "rgba(205,189,148,0.7)"; ctx.lineWidth = 0.7; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, fh - 1);
    ctx.fillStyle = "#eadfb8"; ctx.textBaseline = "middle"; ctx.fillText(f.text, x + 5, y + fh / 2 + 0.4); ctx.restore();
  }

  drawStructures(ctx, sky, t) {
    const sc = this.scene, st = new Set(sc.structures), night = sky.night, amb = 0.4 + 0.6 * sky.ambient;
    const col = (c) => mix("#05060c", c, amb);
    if (st.has("hut")) {
      const w = 56, h = 30, x0 = this.hutX - w / 2, y0 = GY - h;
      this.hot.push({ x: x0 - 8, y: y0 - 24, w: w + 16, h: h + 24, tip: "Cabin — click to go inside", go: "cabin" });
      ctx.fillStyle = col("#5a4330"); ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = rgba(0, 0, 0, 0.3); ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x0, y0 + i * 5); ctx.lineTo(x0 + w, y0 + i * 5); ctx.stroke(); }
      ctx.fillStyle = col("#2f2a2a"); ctx.fillRect(x0 + 8, y0 - 22, 7, 18); // cheminée
      ctx.fillStyle = col("#3a2a22"); ctx.beginPath(); ctx.moveTo(x0 - 8, y0); ctx.lineTo(this.hutX, y0 - 24); ctx.lineTo(x0 + w + 8, y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col("#2a1c14"); ctx.fillRect(this.hutX - 17, GY - 18, 12, 18);
      const fl = 0.8 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
      ctx.fillStyle = mix("#2a3a4a", "#ffd58a", clamp(night * fl * 1.1)); ctx.fillRect(x0 + w - 20, y0 + 8, 11, 10);
      if (night > 0.3) { const gl = ctx.createRadialGradient(x0 + w - 14, y0 + 13, 2, x0 + w - 14, y0 + 13, 38); gl.addColorStop(0, rgba(255, 200, 120, 0.35 * night * fl)); gl.addColorStop(1, rgba(255, 200, 120, 0)); ctx.fillStyle = gl; ctx.fillRect(x0 - 30, y0 - 30, w + 80, 90); }
      for (let i = 0; i < 6; i++) { const p = frac(t * 0.12 + i / 6); ctx.fillStyle = rgba(190, 190, 200, 0.22 * (1 - p)); ctx.beginPath(); ctx.arc(x0 + 11.5 + Math.sin(p * 6 + i) * 5 + p * 16, y0 - 24 - p * 44, 2.5 + p * 6, 0, 6.283); ctx.fill(); }
    }
    if (st.has("bookshelves") && !st.has("hut")) this.drawShelf(ctx, amb, night); // avec une cabane, l'étagère est à l'intérieur
    if (st.has("linking_pillars")) {
      const lit = sc.returning > 0, pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
      for (const px of this.pillX) {
        ctx.fillStyle = col("#5a5a66"); ctx.beginPath(); ctx.moveTo(px - 5, GY); ctx.lineTo(px - 5, GY - 32); ctx.lineTo(px - 2, GY - 36); ctx.lineTo(px + 2, GY - 36); ctx.lineTo(px + 5, GY - 32); ctx.lineTo(px + 5, GY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(px + 1, GY - 34, 4, 34);
        ctx.fillStyle = lit ? rgba(150, 215, 255, 0.5 + 0.4 * pulse) : rgba(120, 120, 140, 0.4); ctx.fillRect(px - 1, GY - 28, 2, 7); ctx.fillRect(px - 1, GY - 17, 2, 4);
      }
      const cx = (this.pillX[0] + this.pillX[1]) / 2;
      if (lit) { const gl = ctx.createRadialGradient(cx, GY - 22, 1, cx, GY - 22, 26); gl.addColorStop(0, rgba(160, 220, 255, 0.55 * pulse)); gl.addColorStop(1, rgba(160, 220, 255, 0)); ctx.fillStyle = gl; ctx.fillRect(cx - 30, GY - 52, 60, 60); }
      ctx.strokeStyle = lit ? rgba(190, 235, 255, 0.5 + 0.4 * pulse) : rgba(120, 120, 140, 0.35); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, GY - 22, 8, 0, 6.283); ctx.stroke();
      this.hot.push({ x: this.pillX[0] - 6, y: GY - 38, w: this.pillX[1] - this.pillX[0] + 12, h: 38, tip: (sc.returning ? `${sc.returning} Age${sc.returning === 1 ? "" : "s"} link back here` : "No Age links back here yet") + " — click to look closer", go: "pillars" });
    }
  }

  drawShelf(ctx, amb, night) {
    const col = (c) => mix("#05060c", c, amb), w = 62, h = 46, x0 = this.shelfX - w / 2, y0 = GY - h, K = SHELF_SCALE;
    const hp = this.hot.push.bind(this.hot), hot = { push: (r) => hp({ ...r, x: this.shelfX + (r.x - this.shelfX) * K, y: GY + (r.y - GY) * K, w: r.w * K, h: r.h * K }) };
    ctx.save(); ctx.translate(this.shelfX, GY); ctx.scale(K, K); ctx.translate(-this.shelfX, -GY); // l'étagère reste plus petite que la cabane
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
    const col = (c) => mix("#05060c", c, amb), bw = 7, gap = 3, x1 = this.shelfX + (shelfW / 2) * K + 8;
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
  drawMount(ctx, d, sky, t, terrace = false) {
    const T = TERRAIN[this.scene.terrain], amb = 0.35 + 0.65 * sky.ambient, shade = (c) => mix("#05060c", c, amb);
    const { x: cx, hw, h } = this.lay.mount; // le mont, derrière la cabane, grand : il porte la source du ruisseau
    const path = () => { ctx.beginPath(); ctx.moveTo(cx - hw, GY + 2); ctx.bezierCurveTo(cx - hw * 0.55, GY - h * 0.35, cx - hw * 0.3, GY - h * 0.95, cx - 6, GY - h); ctx.bezierCurveTo(cx + 14, GY - h * 1.02, cx + hw * 0.35, GY - h * 0.7, cx + hw * 0.62, GY - h * 0.32); ctx.bezierCurveTo(cx + hw * 0.85, GY - h * 0.1, cx + hw * 0.95, GY - 2, cx + hw, GY + 2); ctx.closePath(); };
    ctx.save();
    if (terrace) { // un sommet aplani : on coupe la pointe à la hauteur où le mont est assez large pour porter l'observatoire
      const bz = (a, b, c2, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d; };
      const L = [], R = []; for (let i = 0; i <= 60; i++) { const t = i / 60;
        L.push([bz(cx - hw, cx - hw * 0.55, cx - hw * 0.3, cx - 6, t), bz(GY + 2, GY - h * 0.35, GY - h * 0.95, GY - h, t)]);
        R.push([bz(cx - 6, cx + 14, cx + hw * 0.35, cx + hw * 0.62, t), bz(GY - h, GY - h * 1.02, GY - h * 0.7, GY - h * 0.32, t)]); }
      const xAt = (pts, y) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if ((y0 - y) * (y1 - y) <= 0 && y0 !== y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return null; };
      let ty = GY - h + 2, lx = cx - 6, rx = cx - 6;
      for (; ty < GY - h * 0.6; ty += 0.5) { lx = xAt(L, ty); rx = xAt(R, ty); if (lx != null && rx != null && rx - lx >= 34) break; }
      this.lay.mount.ty = ty; this.lay.mount.tx = (lx + rx) / 2; // lus par l'observatoire (relto-telescope.js)
      ctx.beginPath(); ctx.rect(0, ty, 10000, 10000); ctx.clip();
    }
    path();
    const g = ctx.createLinearGradient(0, GY - h, 0, GY); g.addColorStop(0, shade(T.rock2)); g.addColorStop(1, shade(T.rock)); ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    // face à l'ombre à droite, strates, calotte herbeuse en haut
    ctx.fillStyle = rgba(0, 0, 0, 0.24); ctx.beginPath(); ctx.moveTo(cx + 4, GY - h); ctx.lineTo(cx + hw + 4, GY + 4); ctx.lineTo(cx + 6, GY + 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(0, 0, 0, 0.22); ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = GY - h + i * (h / 6.2); ctx.beginPath(); ctx.moveTo(cx - hw, y + 3); ctx.lineTo(cx - 10, y - 2); ctx.lineTo(cx + hw * 0.5, y + 4); ctx.stroke(); }
    if (!terrace) ctx.fillStyle = shade(T.top); else ctx.fillStyle = "rgba(0,0,0,0)"; // la calotte herbeuse : pas sur une terrasse de pierre
    ctx.beginPath(); ctx.moveTo(cx - 30, GY - h * 0.7); ctx.quadraticCurveTo(cx - 6, GY - h * 1.12, cx + 30, GY - h * 0.58); ctx.lineTo(cx + 30, GY - h * 1.2); ctx.lineTo(cx - 30, GY - h * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = shade(T.tuft); const r = rng((this.scene.seed ^ 0x2f1d) >>> 0);
    for (let i = 0; i < 9; i++) { const x = cx - 24 + r() * 44, y = GY - h * (0.86 + 0.1 * Math.sin((x - cx) / 14)) + 3; if (terrace && (y < this.lay.mount.ty + 3 || Math.abs(x - this.lay.mount.tx) < 15)) continue; ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x, y - 3 - r() * 3); ctx.lineTo(x + 1.5, y); ctx.fill(); }
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
    const x0 = this.hutX - 28, y0 = GY - 30, cx = x0 + 11.5, cy = y0 - 24, night = clamp(sky.night == null ? 0.3 : sky.night);
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
    const night = sky.night, amb = 0.4 + 0.6 * sky.ambient, HS = [31, 22, 38, 27, 34, 19], WH = [1, 0, 1, 0, 1, 0], spots = [];
    for (const c of this.lay.stones) for (let k = 0; k < c.n; k++) { const i = c.from + k; spots.push([c.x + (k - (c.n - 1) / 2) * 12, HS[i % 6], WH[i % 6]]); } // pierres dressées : groupes posés dans les espaces libres du plan
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

  /** lanternes volantes : papier chaud qui s'élève lentement de l'île, dérive avec le vent et s'éteint en altitude */
  drawLanterns(ctx, d, sky, t) {
    const n = Math.round(4 + d * 7), glow = 0.35 + 0.65 * sky.night, r = rng((this.scene.seed ^ 0x1a47) >>> 0);
    for (let i = 0; i < n; i++) {
      const T = 24 + r() * 14, p = frac(t / T + i / n + r()), x0 = 150 + r() * 320, s = 4 + r() * 3, ph = r() * 6.283;
      const x = x0 + Math.sin(p * 5 + ph) * 12 + p * 34, y = GY - 22 - p * 200, a = Math.sin(Math.PI * Math.min(1, p * 1.05)) ** 0.6, fl = 0.85 + 0.15 * Math.sin(t * 4.5 + i * 2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4); g.addColorStop(0, rgba(255, 190, 100, 0.7 * glow * fl * a)); g.addColorStop(1, rgba(255, 170, 80, 0)); ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
      ctx.fillStyle = rgba(255, 150, 70, 0.95 * a); ctx.beginPath(); ctx.moveTo(x - s * 0.6, y + s); ctx.lineTo(x - s * 0.95, y - s * 0.3); ctx.quadraticCurveTo(x, y - s * 1.5, x + s * 0.95, y - s * 0.3); ctx.lineTo(x + s * 0.6, y + s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(255, 225, 160, (0.55 + 0.4 * glow) * a * fl); ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.8, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgba(60, 36, 24, 0.85 * a); ctx.fillRect(x - s * 0.55, y + s, s * 1.1, s * 0.28);
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
    // l'infobulle attend un instant (TIP_DELAY) : on peut viser une zone, et voir ce qu'elle couvre, sans qu'elle s'interpose aussitôt
    const k = `${Math.round(h.x)},${Math.round(h.y)},${h.tip}`; if (k !== this.tipKey) { this.tipKey = k; this.tipAt = Date.now(); const delay = this.opts.tipDelay != null ? this.opts.tipDelay : TIP_DELAY; if (!this.running && delay > 0) window.setTimeout(() => { if (this.tipKey === k) this.draw(0); }, delay + 20); }
    const late = Date.now() - this.tipAt >= (this.opts.tipDelay != null ? this.opts.tipDelay : TIP_DELAY);
    if (this.opts.hoverFrame !== false) { ctx.strokeStyle = "rgba(255,240,200,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(h.x - 1, h.y - 1, h.w + 2, h.h + 2); } // cadre : réglage « Cadre des zones cliquables »
    if (!late || !h.tip) return;
    const [vx0, vx1, vy0] = this.visible_();
    // `h.frac` (facultatif) : une longueur de faisceau en rahnfee (src/beam.js), gravée en chiffres D'ni après le texte
    const fs = 10, fw = h.frac && this.dni && this.dni.fractionWidth ? this.dni.fractionWidth(h.frac, fs) + 6 : 0;
    ctx.font = "11px serif"; const tw = ctx.measureText(h.tip).width + fw, bx = clamp(h.x + h.w / 2 - tw / 2 - 6, vx0 + 4, Math.max(vx0 + 4, vx1 - tw - 16)), by = h.tipBelow ? Math.min(H - 22, h.y + h.h + 6) : Math.max(vy0 + 4, h.y - 24); // `tipBelow` : sous la zone (le micromètre : sa fenêtre et son fil restent visibles)
    ctx.fillStyle = "rgba(16,13,9,0.92)"; ctx.fillRect(bx, by, tw + 12, 18); ctx.strokeStyle = "rgba(205,189,148,0.8)"; ctx.strokeRect(bx, by, tw + 12, 18);
    ctx.fillStyle = "#e9dcb8"; ctx.fillText(h.tip, bx + 6, by + 13);
    if (fw) this.dni.drawFraction(ctx, h.frac, bx + 6 + tw - fw + 6, by + 4, fs, "#e0c27a");
  }

  // ---- vues ----------------------------------------------------------------------------
  /** « island » (vue de l'île, par défaut) ou « global » (le Relto vu de loin) ; un fondu léger marque le passage. */
  setView(view) {
    if (view !== "global" && !(ROOMS[view] && this.available()[view])) view = "island";
    if (view === "cat" && this.catAsleep()) view = "cabin"; // il dort au coin du feu : on le trouve dans la cabane
    if (view === (this.view || "island")) return;
    this.view = view; this.hover = null; this.flash = null; this.fadeAt = Date.now();
    if (this.opts.onView) this.opts.onView(view);
    if (!this.running) this.draw(0);
  }
  /** vues possibles selon les pages et structures de ce Relto (l'île et la vue globale existent toujours) */
  available() {
    const sc = this.scene, a = (t) => sc.additions.some((x) => x.type === t);
    return { island: true, global: true, cabin: sc.structures.includes("hut"), pillars: sc.structures.includes("linking_pillars"), pond: a("koi"), pondplus: a("koi") && a("ponddecor"), cat: a("cat"), grove: a("vegetation") || a("flowers") || a("grass") || a("stalktree") || a("butterflies"), imager: a("imager"), book: sc.structures.includes("hut"), telescope: a("telescope"), starmap: a("telescope"), clock: a("dniclock") };
  }
  /** dessine `fn` (en coordonnées de l'île) agrandi dans une vue rapprochée et reporte les zones cliquables qu'il crée à l'écran */
  withView(ctx, { S, ox, oy, fx, fy }, fn) {
    const n0 = this.hot.length; ctx.save(); ctx.translate(ox, oy); ctx.scale(S, S); ctx.translate(-fx, -fy); fn(); ctx.restore();
    for (let i = n0; i < this.hot.length; i++) { const h = this.hot[i]; this.hot[i] = { ...h, x: ox + (h.x - fx) * S, y: oy + (h.y - fy) * S, w: h.w * S, h: h.h * S }; }
  }
  terrain() { return TERRAIN[this.scene.terrain] || TERRAIN.mossy_plateau; }
  /** vues plein cadre (globale, cabane, piliers, bassin, chat, bosquet) : pas de caméra ; `fn` dessine la scène */
  drawFullView(ctx, sky, fn) {
    ctx.save(); ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); ctx.clearRect(0, 0, W, H);
    fn();
    this.drawPassages(ctx);
    this.drawGrade(ctx, sky); this.drawHover(ctx); this.drawFlash(ctx); this.drawFade(ctx, sky);
    ctx.restore();
  }
  /**
   * Les passages entre la maison, l'Imageur et l'observatoire : deux petites plaques de laiton aux coins du bas de chaque
   * pièce (celles qui existent dans ce Relto), pour aller de l'une à l'autre sans repasser par l'île. Pas en gros plan
   * d'une station de l'Imageur (on y recule d'abord).
   */
  drawPassages(ctx) {
    const v = this.view, ROOMS3 = ["cabin", "imager", "telescope"];
    if (!ROOMS3.includes(v) || (v === "imager" && this.imager && this.imager.station)) return;
    const av = this.available(), to = ROOMS3.filter((x) => x !== v && av[x]); if (!to.length) return;
    const t = this.imagerTr(), y = 335, h = 18;
    ctx.save(); ctx.font = "italic 11px serif";
    to.forEach((dest, i) => {
      const label = t("relto.pass." + dest), w = Math.ceil(ctx.measureText(label).width) + 26, right = i === 1 || (to.length === 1 && dest === "telescope"), x = right ? W - 12 - w : 12;
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#9a7a3c"); g.addColorStop(1, "#6b5226");
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x + 1, y + 2, w, h); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,226,160,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.fillStyle = "#2a1d13"; ctx.textAlign = right ? "right" : "left"; ctx.fillText(right ? label + "  ›" : "‹  " + label, right ? x + w - 8 : x + 8, y + 13); ctx.textAlign = "left";
      this.hot.push({ x, y, w, h, tip: t("relto.pass." + dest + ".tip"), go: dest });
    });
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
    if (this.view && this.view !== "island") return [px, py]; // les vues plein cadre n'ont pas de zoom
    return [(px - CAM_X) / CAM + CAM_X, (py - CAM_OY) / CAM + CAM_Y]; // inverse de la caméra
  }
  hit(x, y) { for (let i = this.hot.length - 1; i >= 0; i--) { const h = this.hot[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
  onMove(e) {
    const [x, y] = this.toLogical(e), prev = this.hover; this.hover = this.hit(x, y); this.canvas.style.cursor = this.hover && (this.hover.book || this.hover.special || this.hover.flash || this.hover.go || this.hover.imager || this.hover.tel || this.hover.purr || this.hover.pageToggle || this.hover.pbook) ? "pointer" : "";
    if (!this.running && this.hover !== prev) this.draw(0); // mouvement réduit : pas de boucle, on redessine pour l'infobulle
  }
  onClick(e) { const [x, y] = this.toLogical(e), h = this.hit(x, y); if (!h) return; if (h.pageToggle) { if (this.opts.onPageToggle) this.opts.onPageToggle(h.pageToggle); return; } if (h.pbook) { this.pageBook = this.pageBook || { spread: 0 }; this.pageBook.spread += h.pbook; if (!this.running) this.draw(0); return; } if (h.imager) { this.imagerAct(h.imager); if (!this.running) this.draw(0); return; } if (h.tel) { TL.act(this, h.tel); if (!this.running) this.draw(0); return; } if (h.toy) { this.toyAt = this.toyAt || {}; this.toyAt[h.toy] = Date.now(); if (this.opts.onToy) this.opts.onToy(h.toy); if (h.flash) this.flash = { text: h.flash, x: h.x + h.w / 2, y: h.y, until: Date.now() + 2200 }; if (!this.running) this.draw(0); } else if (h.book && this.opts.onOpen) this.opts.onOpen(h.age, e); else if (h.special && this.opts.onSpecial) this.opts.onSpecial(h.special, e); else if (h.go) this.setView(h.go); else if (h.flash) { if (this.view === "cat" && this.opts.onMeow) this.opts.onMeow(); if (h.purr && this.opts.onPurr) this.opts.onPurr(); this.flash = { text: h.flash, x: h.x + h.w / 2, y: h.y, until: Date.now() + 2800 }; if (!this.running) this.draw(0); } }
}

module.exports = { ReltoRenderer, W, H, GY, TERRAIN, VERDICT };
