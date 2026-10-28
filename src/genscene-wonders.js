"use strict";
/**
 * Les merveilles dans la fenêtre générative (src/genscene.js) : chaque composite du catalogue
 * (src/wonders.js) a son dessin. La géométrie est tirée d'une graine propre : un Âge sans merveille garde exactement son
 * image. Les mouvements suivent la boucle de 8 s (`t` de 0 à 1, fréquences entières) : rien ne saute.
 *
 * Couches, appelées par `paint` et `paintCavern` : « ridges » (sur les crêtes), « sky », « ground » (le sol, avant les
 * arbres), « air » (après les arbres et les ruines), « cave » (dans la caverne, avant les lueurs).
 */
const { rng, fnv, clamp, lerp, frac } = require("./util");
const TAU = Math.PI * 2;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (c, al = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(al).toFixed(3)})`;
const METAL = { gold: [222, 184, 96], silver: [204, 212, 224], copper: [92, 168, 138], iron: [46, 44, 48] }; /* le cuivre : vert-de-gris */
const ORPHAN = [[150, 96, 200], [86, 170, 120], [196, 110, 150], [90, 140, 210]];

/** La géométrie des merveilles de la scène (`S.wonders`), ou null. */
function buildWonders(S, W, H, hz) {
  const ids = S.wonders || []; if (!ids.length) return null;
  const q = rng((S.seed ^ 0xca7e1e) >>> 0), has = new Set(ids), o = { has };
  if (has.has("unfinished_horizon")) o.unfinished = { x0: W * (0.55 + 0.25 * q()), ink: q() };
  if (has.has("orphan_colour")) o.orphan = S.orphanRGB || ORPHAN[Math.floor(q() * ORPHAN.length)];
  if (has.has("breathing_mirrors")) o.mirrors = Array.from({ length: 3 + Math.floor(q() * 2) }, () => ({ x: W * (0.12 + 0.76 * q()), y: hz + H * (0.06 + 0.2 * q()), w: W * (0.05 + 0.06 * q()), p: Math.floor(q() * 4) / 4 }));
  if (has.has("visiting_weight")) o.stones = Array.from({ length: 5 }, () => ({ x: W * (0.1 + 0.8 * q()), y: hz + H * (0.03 + 0.18 * q()), r: H * (0.04 + 0.04 * q()), lift: H * (0.14 + 0.2 * q()), pts: Array.from({ length: 7 }, () => 0.7 + 0.45 * q()), p: q() }));
  if (has.has("wind_learned")) { const y0 = hz + H * (0.08 + 0.1 * q()), y1 = hz + H * (0.18 + 0.1 * q()); o.steps = Array.from({ length: 18 }, (_, i) => ({ u: i / 17, x: W * (0.06 + 0.88 * (i / 17)), y: lerp(y0, y1, i / 17) + H * 0.012 * Math.sin(i * 1.7), side: i % 2 ? 1 : -1 })); }
  if (has.has("reading_rain")) o.slabs = Array.from({ length: 3 }, () => ({ x: W * (0.12 + 0.76 * q()), y: hz + H * (0.04 + 0.14 * q()), w: W * (0.07 + 0.05 * q()), h: H * (0.06 + 0.04 * q()), lines: Array.from({ length: 4 + Math.floor(q() * 3) }, () => Array.from({ length: 3 + Math.floor(q() * 4) }, () => 0.3 + 0.7 * q())) }));
  if (has.has("ceiling_sea")) o.sea = { level: 0.16 + 0.06 * q(), drops: Array.from({ length: 14 }, () => ({ x: W * q(), p: q(), v: 1 + Math.floor(q() * 2) })) };
  if (has.has("fit_through_moths")) o.blobs = Array.from({ length: 7 }, () => ({ x: W * (0.1 + 0.8 * q()), y: hz - H * (0.05 + 0.3 * q()), rx: 14 + q() * 40, ry: 6 + q() * 16, p: q(), k: 1 + Math.floor(q() * 2) }));
  if (has.has("mosaic")) { const motif = ["feathered", "flamed", "margined", "fine"][fnv(S.name + "|mosaic") % 4]; o.tulips = { motif, base: [[214, 60, 70], [240, 200, 80], [236, 236, 228], [150, 70, 160]][Math.floor(q() * 4)], flame: [[150, 20, 40], [200, 60, 30], [120, 40, 110], [230, 120, 60]][Math.floor(q() * 4)], items: Array.from({ length: 9 }, () => ({ x: W * (0.05 + 0.9 * q()), y: hz + H * (0.12 + 0.17 * q()), s: 0.7 + 0.6 * q(), lean: (q() - 0.5) * 0.4, p: q() })) }; }
  if (has.has("ringed_ground")) o.rings = { cx: W * (0.3 + 0.4 * q()), knots: Array.from({ length: 4 }, () => ({ x: W * q(), y: hz + H * (0.05 + 0.22 * q()), r: H * (0.012 + 0.02 * q()) })) };
  if (has.has("drinking_roots")) o.leaves = Array.from({ length: 28 }, () => ({ u: q(), v: q(), p: q(), s: 0.6 + 0.8 * q() }));
  if (has.has("living_mist")) o.mist = { bands: Array.from({ length: 4 }, () => ({ y: hz - H * (0.02 - 0.12 * q()), h: H * (0.05 + 0.05 * q()), p: q() })), lives: Array.from({ length: 30 }, () => ({ x: W * q(), y: hz + H * (-0.08 + 0.2 * q()), p: q(), k: 1 + Math.floor(q() * 2) })) };
  if (has.has("day_aurora")) o.aurora = true;
  if (has.has("blooming_ice")) o.frostFlowers = Array.from({ length: 12 }, () => ({ x: W * (0.05 + 0.9 * q()), y: hz + H * (0.04 + 0.24 * q()), r: H * (0.012 + 0.018 * q()), n: 5 + Math.floor(q() * 3), p: q() }));
  if (has.has("rust_held_bridge")) o.web = Array.from({ length: 16 }, () => ({ u: q(), d: q(), sway: q() }));
  if (has.has("many_one")) o.herd = { x: W * (0.25 + 0.5 * q()), y: hz + H * (0.1 + 0.08 * q()), n: 11, p: q() };
  if (has.has("early_echo")) o.echo = { cracks: Array.from({ length: 5 }, () => ({ x: W * (0.1 + 0.8 * q()), pts: Array.from({ length: 6 }, () => q() - 0.5) })), at: 0.62 };
  return o;
}

/** Le ciel des merveilles : sa couleur sans source (la Couleur orpheline). Appelé par `skyState`. */
function skyTint(m, top, hzc, day) {
  const o = m.won; if (!o || !o.orphan) return { top, hzc };
  const c = o.orphan, lit = 0.25 + 0.75 * day; /* un ciel égal : le haut et l'horizon ont la même couleur */
  return { top: mixc(top, mixc(c, [10, 10, 16], 0.55 - 0.3 * lit), 0.85), hzc: mixc(hzc, mixc(c, [10, 10, 16], 0.5 - 0.3 * lit), 0.85) };
}

function ridgeY(m, x) { const rg = m.ridges[0]; if (!rg) return m.hz; const n = rg.xs.length - 1, f = clamp(x / m.W) * n, i = Math.floor(f); return rg.xs[i] + (rg.xs[Math.min(n, i + 1)] - rg.xs[i]) * (f - i); }

/** Une couche de merveilles. `k` : l'état du ciel (`skyState`) pour la lumière du jour. */
function wonderPass(g, m, t, layer, k) {
  const o = m.won; if (!o) return;
  if (k) m._k0 = k;
  const { W, H, hz } = m, day = k ? k.day : 0.6, night = k ? k.night : 0.2, hzc = k ? k.hzc : [120, 130, 150], top = k ? k.top : [60, 80, 120];
  g.save();
  try {
    if (layer === "ridges") ridges(g, m, t, o, { day, hzc, top });
    else if (layer === "sky") sky(g, m, t, o, { day, night });
    else if (layer === "ground") ground(g, m, t, o, { day, night });
    else if (layer === "relief") relief(g, m, t, o, { day, night, hzc, top });
    else if (layer === "air") air(g, m, t, o, { day, night });
    else if (layer === "cave") cave(g, m, t, o);
  } finally { g.restore(); }
  void W; void H; void hz;
}

function ridges(g, m, t, o, { day, hzc, top }) {
  const { W, H, hz } = m;
  if (o.rings) { /* les Cernes : les crêtes sont de bois, veinées */
    for (const rg of m.ridges) { const n = rg.xs.length - 1; g.strokeStyle = css([60, 36, 20], 0.35); g.lineWidth = 1;
      for (let j = 1; j <= 3; j++) { g.beginPath(); for (let i = 0; i <= n; i += 2) { const x = (i / n) * W, y = rg.xs[i] + j * H * 0.012 * (1 + rg.d); i ? g.lineTo(x, Math.min(hz, y)) : g.moveTo(x, Math.min(hz, y)); } g.stroke(); } }
  }
}

function relief(g, m, t, o, { day, hzc, top }) {
  const { W, H, hz } = m;
  if (o.unfinished) { /* l'Inachevé : à droite de la plume, le monde n'est pas encore décidé : le ciel seul, et l'esquisse des crêtes à l'encre ; chaque jour un peu plus d'encre */
    const sc = W / 320, x0 = o.unfinished.x0 + (W - o.unfinished.x0) * 0.25 * frac(Date.now() / 86400000 / 30 + o.unfinished.ink);
    let yTop = hz; for (const rg of m.ridges) { const n = rg.xs.length - 1; for (let k = 0; k <= n; k++) if ((k / n) * W >= x0) yTop = Math.min(yTop, rg.xs[k]); } yTop -= H * 0.08; /* ne recouvre que la bande des crêtes, pas le ciel au-dessus */
    const sg = g.createLinearGradient(0, yTop, 0, hz); sg.addColorStop(0, css(mixc(top, hzc, clamp(yTop / hz)), 0)); sg.addColorStop(0.35, css(mixc(top, hzc, clamp((yTop + (hz - yTop) * 0.35) / hz)))); sg.addColorStop(1, css(hzc)); const ramp = W * 0.08;
    g.save(); g.fillStyle = sg; for (let k = 0; k < 12; k++) { const xa = x0 + (k / 12) * ramp; g.globalAlpha = (k + 1) / 12; g.fillRect(xa, yTop, ramp / 12 + 1, hz - yTop + 1); } g.globalAlpha = 1; g.fillRect(x0 + ramp, yTop, W - x0 - ramp, hz - yTop + 1); g.restore(); /* le ciel, là où rien n'est encore écrit ; le bord s'efface comme un dessin qu'on gomme */
    g.strokeStyle = css([60, 52, 44], 0.55 + 0.2 * day); g.lineWidth = 1.1 * sc; g.setLineDash([4 * sc, 3 * sc]);
    for (const rg of m.ridges) { const n = rg.xs.length - 1; g.beginPath(); let st = false; for (let k = 0; k <= n; k++) { const x = (k / n) * W; if (x < x0) continue; st ? g.lineTo(x, rg.xs[k]) : g.moveTo(x, rg.xs[k]); st = true; } g.stroke(); } /* chaque crête, à l'encre, en pointillé */
    g.setLineDash([]); g.strokeStyle = css([60, 52, 44], 0.25 + 0.1 * day); g.lineWidth = 0.8 * sc;
    for (let k = 0; k < 26; k++) { const x = x0 + W * 0.02 + (k / 26) * (W - x0), rg = m.ridges[k % m.ridges.length], n = rg.xs.length - 1, y = rg.xs[Math.min(n, Math.round((x / W) * n))]; g.beginPath(); g.moveTo(x, y + 2 * sc); g.lineTo(x - 5 * sc, y + 9 * sc); g.stroke(); } /* des hachures sous les crêtes, comme un croquis */
    g.fillStyle = css([40, 34, 28], 0.85); g.beginPath(); g.moveTo(x0, ridgeY(m, x0) - 14 * sc); g.lineTo(x0 + 2 * sc, ridgeY(m, x0) - 1); g.lineTo(x0 - 1 * sc, ridgeY(m, x0) - 2); g.closePath(); g.fill(); /* la plume, là où l'encre s'arrête */
  }
}
function sky(g, m, t, o, { day }) {
  const { W, H, hz } = m;
  if (o.aurora) { /* l'Aurore de jour : la cendre grise, allumée par en dessous */
    g.fillStyle = css([128, 122, 116], 0.45); g.fillRect(0, 0, W, hz * 0.62);
    g.globalCompositeOperation = "lighter";
    [[80, 220, 150], [160, 110, 230], [90, 200, 200]].forEach((c, i) => {
      const b = H * (0.16 + 0.08 * i), v = H * 0.05; g.strokeStyle = css(c, 0.18 + 0.22 * day); g.lineWidth = H * 0.05; g.lineCap = "round"; g.beginPath();
      for (let x = 0; x <= W; x += 6) { const y = b + v * Math.sin(x / W * TAU * (1 + i * 0.5) + TAU * t * (i % 2 ? -1 : 1)) + v * 0.4 * Math.sin(x / W * TAU * 3 + TAU * t * 2); x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    });
  }
}

function ground(g, m, t, o, { day, night }) {
  const { S, W, H, hz } = m;
  if (o.rings) { /* les Cernes : le sol est une coupe de bois, cernes concentriques, nœuds */
    g.save(); g.beginPath(); g.rect(0, hz, W, H - hz); g.clip();
    g.fillStyle = css([92, 60, 34], 0.85); g.fillRect(0, hz, W, H - hz);
    const cx = o.rings.cx, cy = H * 1.35;
    for (let i = 0; i < 26; i++) { const R = H * 0.42 + i * H * 0.04; g.strokeStyle = i % 3 ? css([70, 44, 24], 0.55) : css([150, 108, 66], 0.5); g.lineWidth = i % 3 ? 1 : 2; g.beginPath(); g.ellipse(cx, cy, R * 2.2, R, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
    for (const kn of o.rings.knots) { g.fillStyle = css([52, 30, 16], 0.9); g.beginPath(); g.ellipse(kn.x, kn.y, kn.r * 1.6, kn.r, 0, 0, TAU); g.fill(); g.strokeStyle = css([130, 90, 54], 0.6); g.lineWidth = 1; g.beginPath(); g.ellipse(kn.x, kn.y, kn.r * 2.3, kn.r * 1.5, 0, 0, TAU); g.stroke(); }
    g.restore();
  }
  if (o.mirrors) for (const mr of o.mirrors) { /* les Miroirs qui respirent : des plaques d'obsidienne en relief qui se soulèvent, et le ciel qui ondule dedans */
    const br = Math.sin(TAU * (t + mr.p)), lift = H * 0.012 * (0.5 + 0.5 * br), w = mr.w * 1.1, h = w * 0.3, y = mr.y - lift;
    g.fillStyle = css([0, 0, 0], 0.35); g.beginPath(); g.ellipse(mr.x + w * 0.08, mr.y + h * 0.35, w * 1.02, h * 0.9, 0, 0, TAU); g.fill(); /* l'ombre portée, qui s'allonge quand la plaque se lève */
    g.fillStyle = "rgba(14,12,18,0.98)"; g.beginPath(); g.ellipse(mr.x, y + h * 0.3, w, h * 0.5, 0, 0, Math.PI); g.fill(); /* la tranche, sombre */
    const sky = g.createLinearGradient(mr.x - w, y - h, mr.x + w, y + h); sky.addColorStop(0, css(mixc(k0top(m), [8, 6, 12], 0.7))); sky.addColorStop(1, css(mixc(k0hzc(m), [8, 6, 12], 0.72)));
    g.fillStyle = sky; g.beginPath(); g.ellipse(mr.x, y, w, h, 0, 0, TAU); g.fill(); /* le miroir : le ciel, assombri */
    g.save(); g.beginPath(); g.ellipse(mr.x, y, w, h, 0, 0, TAU); g.clip(); g.strokeStyle = css([235, 230, 250], 0.22 + 0.25 * day); g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { const yy = y + i * h * 0.3; g.beginPath(); for (let x = mr.x - w; x <= mr.x + w; x += 4) { const v = yy + 1.4 * Math.sin(x / w * 5 + TAU * (t * 2 + i * 0.17) + br * 2); x === mr.x - w ? g.moveTo(x, v) : g.lineTo(x, v); } g.stroke(); } /* le reflet ondule : c'est lui qu'on voit respirer */
    g.restore();
    g.strokeStyle = css([200, 190, 220], 0.3 + 0.3 * day); g.lineWidth = 1; g.beginPath(); g.ellipse(mr.x, y, w, h, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); /* le bord éclairé */
  }
  if (o.steps) { /* ce que le vent a appris : des pas frais, sans personne, qui avancent */
    const front = frac(t), n = o.steps.length;
    o.steps.forEach((s, i) => { const age = frac(front - s.u); if (age > 0.85) return; const a = (1 - age / 0.85) * 0.7 + 0.15; const sc = W / 320; g.fillStyle = css([40, 30, 20], Math.min(1, a * 1.1)); g.beginPath(); g.ellipse(s.x, s.y + s.side * H * 0.01, 4.2 * sc, 2.2 * sc, -0.2, 0, TAU); g.fill(); g.fillStyle = css([255, 240, 210], a * 0.35); g.beginPath(); g.ellipse(s.x + 0.8 * sc, s.y + s.side * H * 0.01 - 1.6 * sc, 4 * sc, 1 * sc, -0.2, Math.PI, TAU); g.fill(); void n; }); /* des pas creusés : l'ombre au fond, la lèvre de sable éclairée */
  }
  if (o.slabs) { /* la Pluie qui lit : les lignes s'écrivent sous la bruine, une à une, et pâlissent quand elle cesse */
    const rain = m.lv ? Math.max(m.lv.drizzle || 0, m.lv.rain || 0) : 1, writing = frac(t), lit = 0.15 + 0.7 * rain;
    for (const [si, sl] of o.slabs.entries()) {
      g.fillStyle = "rgba(30,30,38,0.97)"; g.fillRect(sl.x - sl.w / 2, sl.y - sl.h, sl.w, sl.h); g.strokeStyle = "rgba(90,92,104,0.6)"; g.lineWidth = 1; g.strokeRect(sl.x - sl.w / 2, sl.y - sl.h, sl.w, sl.h);
      if (rain > 0.02) { g.fillStyle = css([170, 190, 210], 0.12 * rain); g.fillRect(sl.x - sl.w / 2, sl.y - sl.h, sl.w, sl.h); } /* la pierre mouillée */
      sl.lines.forEach((ln, i) => {
        const prog = clamp((writing * (sl.lines.length + 1) - i - si * 0.3)), y = sl.y - sl.h + 4 + i * (sl.h - 6) / sl.lines.length; /* chaque ligne apparaît à son tour sous la pluie */
        const a = rain > 0.02 ? lit * (0.4 + 0.6 * prog) : lit; if (a < 0.03) return;
        g.strokeStyle = css([215, 225, 205], a); g.lineWidth = 0.9; let x = sl.x - sl.w / 2 + 3;
        for (const w of ln) { const len = (sl.w - 8) / ln.length * w * (rain > 0.02 ? prog : 1); if (len > 1) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + len - 2, y); g.stroke(); } x += (sl.w - 8) / ln.length; }
        if (rain > 0.02 && prog > 0 && prog < 1) { g.fillStyle = css([230, 240, 255], 0.9); g.fillRect(x - (sl.w - 8) / ln.length + len0(ln, sl, prog) - 1, y - 1, 2, 2); } /* la goutte qui grave */
      });
    }
  }
  if (o.frostFlowers) { /* la Glace qui fleurit : le givre s'ouvre en pétales aux heures froides, disparaît à midi */
    const open = clamp(1 - day * 1.2 + night * 0.4);
    if (open > 0.03) for (const f of o.frostFlowers) { g.strokeStyle = css([240, 250, 255], 0.9 * open); g.fillStyle = css([215, 238, 255], 0.42 * open); g.lineWidth = 1.1 * W / 320;
      for (let i = 0; i < f.n; i++) { const a = (i / f.n) * TAU + f.p, r = f.r * 1.7 * (0.4 + 0.6 * open); g.beginPath(); g.ellipse(f.x + Math.cos(a) * r * 0.6, f.y + Math.sin(a) * r * 0.3, r * 0.55, r * 0.22, a, 0, TAU); g.fill(); g.stroke(); } }
  }
  if (o.tulips) tulips(g, m, t, o.tulips, S);
}

const len0 = (ln, sl, prog) => (sl.w - 8) / ln.length * ln[ln.length - 1] * prog;
const k0top = (m) => m._k0 ? m._k0.top : [60, 80, 120], k0hzc = (m) => m._k0 ? m._k0.hzc : [120, 130, 150];

function tulips(g, m, t, T) {
  const { H } = m;
  for (const it of T.items) { /* la Mosaïque : des tulipes brisées, le motif de la graine (plumé, flammé, marginé, brisure fine) */
    const s = H * 0.09 * it.s, sw = 1.5 * Math.sin(TAU * t + it.p * TAU), x = it.x, y = it.y, tx = x + it.lean * s + sw, ty = y - s * 1.5;
    g.strokeStyle = "rgba(40,90,40,0.95)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x, y - s * 0.7, tx, ty); g.stroke();
    g.fillStyle = "rgba(50,110,50,0.9)"; g.beginPath(); g.ellipse(x - s * 0.2, y - s * 0.35, s * 0.12, s * 0.4, -0.4, 0, TAU); g.fill();
    const cup = () => { g.beginPath(); g.moveTo(tx - s * 0.32, ty - s * 0.42); g.quadraticCurveTo(tx - s * 0.36, ty + s * 0.12, tx, ty + s * 0.14); g.quadraticCurveTo(tx + s * 0.36, ty + s * 0.12, tx + s * 0.32, ty - s * 0.42); g.lineTo(tx + s * 0.12, ty - s * 0.22); g.lineTo(tx, ty - s * 0.46); g.lineTo(tx - s * 0.12, ty - s * 0.22); g.closePath(); };
    g.fillStyle = css(T.base); cup(); g.fill();
    g.save(); cup(); g.clip(); g.strokeStyle = css(T.flame, 0.95);
    if (T.motif === "margined") { g.lineWidth = s * 0.12; cup(); g.stroke(); }
    else if (T.motif === "fine") { g.lineWidth = 0.7; g.beginPath(); g.moveTo(tx, ty + s * 0.12); g.lineTo(tx, ty - s * 0.44); g.stroke(); }
    else for (let i = -2; i <= 2; i++) { g.lineWidth = T.motif === "flamed" ? s * 0.07 : 0.8; g.beginPath(); g.moveTo(tx + i * s * 0.1, ty + s * 0.12); g.quadraticCurveTo(tx + i * s * 0.16 + (T.motif === "flamed" ? s * 0.08 * Math.sin(i) : 0), ty - s * 0.15, tx + i * s * 0.12, ty - s * 0.45); g.stroke(); }
    g.restore();
  }
}

function air(g, m, t, o, { day, night }) {
  const { S, W, H, hz } = m;
  if (o.stones) for (const st of o.stones) { /* la Pesanteur en visite : les pierres flottent le jour, se posent la nuit */
    const lift = st.lift * clamp(day * 1.25) + 3 * Math.sin(TAU * (t + st.p)) * day, y = st.y - lift;
    g.fillStyle = css([0, 0, 0], 0.25 * (1 - clamp(lift / st.lift) * 0.6)); g.beginPath(); g.ellipse(st.x, st.y + 2, st.r * (1.2 - 0.5 * clamp(lift / st.lift)), st.r * 0.25, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(58,54,64,0.98)"; g.strokeStyle = css([220, 210, 190], 0.35 + 0.3 * day); g.lineWidth = 1; g.beginPath(); st.pts.forEach((p, i) => { const a = (i / st.pts.length) * TAU, x = st.x + Math.cos(a) * st.r * p, yy = y + Math.sin(a) * st.r * p * 0.8; i ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.closePath(); g.fill(); g.stroke();
  }
  if (o.leaves) metalLeaves(g, m, t, o, day);
  if (o.web) for (const rn of m.ruins.filter((x) => x.k === "bridge")) { /* ce que tient la rouille : une toile de fils roux porte le tablier tombé */
    const v = W * 0.2, hub = { x: rn.x + v * 0.1, y: hz - H * 0.3 }, deckL = hz - H * 0.12, deckR = hz - H * 0.19; /* le tablier tombé, penché, retenu par la toile */
    const dk = (u) => ({ x: rn.x - v * 0.82 + u * v * 1.64, y: lerp(deckL, deckR, u) });
    g.lineCap = "round";
    for (const [i, f] of o.web.slice(0, 9).entries()) { /* les rayons, depuis un point au-dessus, jusqu'au sol de part et d'autre */
      const sway = 1.2 * Math.sin(TAU * (t + f.sway)), gx = rn.x - v * 1.1 + (i / 8) * v * 2.2;
      g.strokeStyle = css([165, 78, 36], 0.85); g.lineWidth = 1.8; g.beginPath(); g.moveTo(hub.x, hub.y); g.lineTo(gx + sway, hz + 3); g.stroke();
    }
    for (let r = 1; r <= 4; r++) { /* la spirale : des cercles de fils plus fins, qui relient les rayons */
      const R = H * 0.05 * r; g.strokeStyle = css([190, 96, 44], 0.55); g.lineWidth = 0.9; g.beginPath();
      for (let a = 0; a <= 24; a++) { const th = Math.PI * 0.1 + (a / 24) * Math.PI * 0.8, x = hub.x + Math.cos(th) * R * 2.4, y = hub.y + Math.sin(th) * R * 1.1 + 1.5 * Math.sin(TAU * t + a); a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    for (const u of [0.05, 0.35, 0.65, 0.95]) { const d = dk(u); g.strokeStyle = css([190, 96, 44], 0.9); g.lineWidth = 1.6; g.beginPath(); g.moveTo(hub.x, hub.y); g.lineTo(d.x, d.y); g.stroke(); } /* les fils qui tiennent le tablier */
    g.lineCap = "butt";
    g.fillStyle = "#0b0a0e"; g.beginPath(); const a0 = dk(0), a1 = dk(1); g.moveTo(a0.x, a0.y - 3); g.lineTo(a1.x, a1.y - 3); g.lineTo(a1.x, a1.y + 3); g.lineTo(a0.x, a0.y + 3); g.closePath(); g.fill();
    g.strokeStyle = css([190, 96, 44], 0.8); g.lineWidth = 1; g.stroke();
    g.fillStyle = css([190, 96, 44], 0.9); g.beginPath(); g.arc(hub.x, hub.y, 2.2, 0, TAU); g.fill();
  }
  if (o.herd) { /* l'Un-plusieurs : toutes les têtes tournent ensemble ; la nuit, une seule spirale */
    const h = o.herd, turn = Math.sin(TAU * t), coil = clamp(night * 1.4 - 0.2);
    for (let i = 0; i < h.n; i++) {
      const sc = W / 320 * 1.3, a = i * 0.9, sx = h.x + Math.cos(a) * (6 + i * 4) * 1.4 * sc, sy = h.y + Math.sin(a) * (6 + i * 4) * 0.45 * sc, lx = h.x + (i - h.n / 2) * 15 * sc + 8 * turn * sc, ly = h.y + (i % 3) * 3 * sc;
      const x = lerp(lx, sx, coil), y = lerp(ly, sy, coil), dir = turn >= 0 ? 1 : -1;
      g.fillStyle = "rgba(30,24,22,0.98)"; g.strokeStyle = "rgba(255,140,60,0.55)"; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y, 8 * sc, 4 * sc, 0, 0, TAU); g.fill(); g.stroke(); /* le bord éclairé par la lave */
      if (coil < 0.8) { g.beginPath(); g.ellipse(x + dir * 8 * sc, y - 3.5 * sc, 3.2 * sc, 2.3 * sc, 0, 0, TAU); g.fill(); g.stroke(); g.fillRect(x - 5 * sc, y + 2 * sc, 1.4 * sc, 5 * sc); g.fillRect(x + 4 * sc, y + 2 * sc, 1.4 * sc, 5 * sc); }
    }
  }
  if (o.mist) { /* la Brume vivante : elle va contre le vent ; des vies montent et redescendent dedans */
    for (const b of o.mist.bands) { const x = -frac(t + b.p) * W; const mg = g.createLinearGradient(0, b.y - b.h, 0, b.y + b.h); mg.addColorStop(0, "rgba(220,228,236,0)"); mg.addColorStop(0.5, css([222, 230, 238], 0.22 + 0.1 * day)); mg.addColorStop(1, "rgba(220,228,236,0)"); g.fillStyle = mg; g.fillRect(x, b.y - b.h, W * 2, b.h * 2); }
    g.globalCompositeOperation = "lighter";
    for (const l of o.mist.lives) { const y = l.y + H * 0.02 * Math.sin(TAU * (t * l.k + l.p)); g.fillStyle = css([200, 255, 220], 0.25 + 0.35 * Math.sin(TAU * (t * 2 + l.p)) ** 2); g.fillRect(l.x, y, 1.3, 1.3); }
    g.globalCompositeOperation = "source-over";
  }
  if (o.blobs) { /* celles qui passent : des lueurs rouge et or qui s'étirent dans les failles et se referment */
    g.globalCompositeOperation = "lighter"; const vis = 0.55 + 0.45 * night, sc = W / 320 * 1.5;
    for (const b of o.blobs) { const ph = TAU * (t * b.k + b.p), x = b.x + b.rx * Math.sin(ph), y = b.y + b.ry * Math.sin(ph * 2), stretch = 1 + 1.6 * Math.max(0, Math.sin(ph * 2 + 1)) ** 4;
      const gr = g.createRadialGradient(x, y, 0, x, y, 7 * stretch * sc); gr.addColorStop(0, css([255, 214, 120], 0.85 * vis)); gr.addColorStop(0.5, css([230, 90, 40], 0.4 * vis)); gr.addColorStop(1, css([200, 50, 30], 0));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 3.2 * stretch * sc, 3.2 * sc / Math.sqrt(stretch), 0.6, 0, TAU); g.fill(); }
    g.globalCompositeOperation = "source-over";
  }
  void S;
}

function metalLeaves(g, m, t, o, day) {
  const { S, W, H, hz } = m, col = METAL[S.wonderMetal] || METAL.gold, iron = S.wonderMetal === "iron";
  const hosts = m.trees.length ? m.trees.map((tr) => ({ x: tr.x, top: hz - tr.h, h: tr.h })) : [0.2, 0.45, 0.7, 0.85].map((u) => ({ x: W * u, top: hz - H * 0.08, h: H * 0.08 }));
  g.globalCompositeOperation = "source-over";
  hosts.forEach((ho, j) => {
    if (iron) { g.strokeStyle = css([255, 80, 30], 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(TAU * t + j))); g.lineWidth = 1; g.beginPath(); g.moveTo(ho.x, hz + 2); g.lineTo(ho.x + 1, ho.top + ho.h * 0.2); g.stroke(); }
    o.leaves.forEach((l, i) => { if (i % hosts.length !== j) return; const x = ho.x + (l.u - 0.5) * ho.h * 0.7, y = ho.top + l.v * ho.h * 0.55, tw = 0.5 + 0.5 * Math.sin(TAU * (t * 2 + l.p)), r = 2.2 * l.s;
      g.fillStyle = css(mixc(col, [255, 255, 255], 0.35 * tw * day), 0.95); g.beginPath(); g.ellipse(x, y, r, r * 0.55, l.p * 3, 0, TAU); g.fill();
      if (tw > 0.92) { g.fillStyle = css([255, 255, 250], 0.9 * day); g.fillRect(x - 0.5, y - 2, 1, 4); g.fillRect(x - 2, y - 0.5, 4, 1); } });
  });
}

function cave(g, m, t, o) {
  const { W, H, hz, cave: C } = m; if (!C) return;
  if (o.sea) { /* la Mer au plafond : la mer pend à la voûte ; la pluie monte y tomber */
    const lv = H * (o.sea.level + 0.1), N = C.ceil.length, surf = (x) => lv + 3 * Math.sin(x / W * TAU * 3 + TAU * t) + 1.5 * Math.sin(x / W * TAU * 7 - TAU * t * 2);
    const sg = g.createLinearGradient(0, 0, 0, lv + H * 0.06); sg.addColorStop(0, "rgba(6,30,48,0.97)"); sg.addColorStop(0.7, "rgba(18,70,100,0.92)"); sg.addColorStop(1, "rgba(40,110,140,0.85)");
    g.fillStyle = sg; g.beginPath(); g.moveTo(0, 0);
    for (let k = 0; k < N; k += 2) { const x = (k / (N - 1)) * W; g.lineTo(x, Math.max(C.ceil[k] * 0.4, surf(x))); }
    g.lineTo(W, 0); g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = "lighter"; /* la lumière de la caverne monte s'y refléter, en traînées qui tremblent */
    for (const L of C.lights) { const col = [120 + 80 * Math.sin(L.hue / 60), 200, 190], gr = g.createRadialGradient(L.x, lv, 0, L.x, lv, L.r * 2.2); gr.addColorStop(0, css(col, 0.22)); gr.addColorStop(1, css(col, 0)); g.fillStyle = gr; g.fillRect(L.x - L.r * 2.2, lv - L.r * 1.2, L.r * 4.4, L.r * 1.3);
      g.strokeStyle = css(col, 0.35); g.lineWidth = 1; for (let i = 0; i < 5; i++) { const y = lv - 3 - i * 4, w = L.r * 0.5 * (1 - i / 6), wob = 3 * Math.sin(TAU * (t * 2 + L.ph + i * 0.3)); g.beginPath(); g.moveTo(L.x - w + wob, y); g.lineTo(L.x + w + wob, y); g.stroke(); } }
    g.restore();
    g.strokeStyle = "rgba(170,225,240,0.7)"; g.lineWidth = 1.2; g.beginPath(); for (let x = 0; x <= W; x += 5) { const y = surf(x); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); /* la surface, vue d'en dessous */
    for (const d of o.sea.drops) { const q = frac(t * 0.5 * d.v + d.p), y = lerp(hz, lv + 4, q); g.fillStyle = css([170, 225, 240], 0.75 * (0.3 + 0.7 * q)); g.fillRect(d.x, y, 1.3, 4 + 3 * q); } /* la pluie monte, lentement */
    const sx = W * 0.62, sl = H * 0.16, sw = 1.5 * Math.sin(TAU * t * 0.5); /* une stalactite d'eau, qui pend et tremble */
    g.fillStyle = "rgba(60,130,160,0.8)"; g.beginPath(); g.moveTo(sx - 7, surf(sx)); g.quadraticCurveTo(sx - 2 + sw, surf(sx) + sl * 0.6, sx + sw * 1.5, surf(sx) + sl); g.quadraticCurveTo(sx + 2 + sw, surf(sx) + sl * 0.6, sx + 7, surf(sx)); g.closePath(); g.fill();
    g.fillStyle = "rgba(200,240,255,0.9)"; g.beginPath(); g.arc(sx + sw * 1.5, surf(sx) + sl + 1, 1.6, 0, TAU); g.fill();
  }
  if (o.echo) { /* l'Écho d'avance : l'éclair traverse la roche après le tonnerre (le son vient d'abord) */
    const q = frac(t - o.echo.at), flash = q < 0.1 ? 1 - q / 0.1 : 0, sc = W / 320;
    if (flash > 0) for (const c of o.echo.cracks) { g.strokeStyle = css([240, 245, 255], 0.9 * flash); g.lineWidth = 1.6 * sc; g.beginPath(); let x = c.x, y = 0; g.moveTo(x, y); for (const p of c.pts) { x += p * 18 * sc; y += H * 0.06; g.lineTo(x, y); } g.stroke(); }
    if (flash > 0) { g.fillStyle = css([200, 210, 240], 0.12 * flash); g.fillRect(0, 0, W, H); }
  }
}

module.exports = { buildWonders, wonderPass, skyTint, METAL };
