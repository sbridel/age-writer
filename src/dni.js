"use strict";
/**
 * Chiffres D'ni (base 25).
 *
 * Quatre sources de tracé, de la plus fidèle à la plus simple :
 *   font   : une police D'ni déjà installée sur l'ordinateur (détectée) ou chargée
 *            depuis un .ttf que l'utilisateur a mis dans son coffre ;
 *   glyphs : un fichier dni-numerals.local.json (contours extraits d'une police,
 *            usage local) placé dans le dossier du plugin ;
 *   simple : tracé procédural, écrit ici (aucun contour copié) ; il reproduit le
 *            système : un cadre, une forme « unités » (1-4) et une forme « cinquaines »
 *            (5, 10, 15, 20) superposées.
 */
const { esc } = require("./util");

// valeur 0..24 -> caractère de la famille Dni Script (vérifié sur les polices de Jehon)
const FONT_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ")", "!", '"', "#", "$", "%", "^", "&", "*", "(", "[", "]", "{", "}", "\\"];
const FAMILIES = ["D'ni Script", "D'ni Script LM", "D'ni Script Angular", "Dni Script", "DniScript", "Dnifont", "D'ni", "Dni"];
const FONT_CAP = 1800 / 2048; // hauteur d'un chiffre / em, dans ces polices

/**
 * Chiffres en base 25 (poids fort en tête). Accepte un nombre, un BigInt ou une chaîne de chiffres :
 * au-delà de 2^53 on passe en BigInt pour rester exact. Jamais de boucle infinie (Infinity, NaN → 0).
 */
function toBase25(num) {
  let big = null;
  if (typeof num === "bigint") big = num < 0n ? -num : num;
  else if (typeof num === "string" && /^\s*-?\d+\s*$/.test(num)) { const t = num.trim().replace(/^-/, "").slice(0, 200); if (t.length > 15) big = BigInt(t); else num = Number(t); }
  if (big != null) { if (big === 0n) return [0]; const d = []; while (big > 0n) { d.unshift(Number(big % 25n)); big /= 25n; } return d; }
  let n = Math.abs(Math.floor(Number(num) || 0));
  if (!Number.isFinite(n) || n === 0) return [0];
  if (n > Number.MAX_SAFE_INTEGER) return toBase25(BigInt(Math.round(n)));
  const d = [];
  while (n > 0) { d.unshift(n % 25); n = Math.floor(n / 25); }
  return d;
}
const fromBase25 = (digits) => digits.reduce((a, d) => a * 25 + d, 0);

// ---- tracé procédural, repère 0..100, cadre de 4 à 96 ---------------------------------
const P = (u, v) => `${+(4 + 92 * u).toFixed(1)} ${+(4 + 92 * v).toFixed(1)}`;
const FRAME = "M4 4H96V96H4Z";
const UNITS = [
  null,
  `M${P(0.5, 0)}V${P(0.5, 1).split(" ")[1]}`,                              // 1 : trait vertical
  `M${P(0, 0.1)}C${P(0.46, 0.26)} ${P(0.46, 0.74)} ${P(0, 0.9)}`,         // 2 : arc à gauche
  `M${P(0.5, 0)}L${P(0, 0.5)}L${P(0.5, 1)}`,                              // 3 : « K »
  `M${P(0.52, 1)}V${P(0, 0.3).split(" ")[1]}H96`,                         // 4 : crochet
];
const FIVES = [
  null,
  `M4 ${P(0, 0.5).split(" ")[1]}H96`,                                      // 5 : barre
  `M${P(0, 1)}C${P(0.1, 0.6)} ${P(0.9, 0.6)} ${P(1, 1)}`,                 // 10 : arc en bas
  `M${P(0, 0.46)}L${P(0.5, 1)}L${P(1, 0.46)}`,                            // 15 : « V »
  `M${P(0.29, 0)}V${P(0, 0.5).split(" ")[1]}H96`,                         // 20 : équerre
];
const DOT = "M45 45h10v10H45Z";

/** Chemins d'un chiffre 0..24 : { stroke: [d...], fill: [d...] } dans un repère 0..100. */
function simplePaths(v) {
  const u = v % 5, f = Math.floor(v / 5);
  const stroke = [FRAME], fill = [];
  if (v === 0) fill.push(DOT);
  if (f) stroke.push(FIVES[f]);
  if (u) stroke.push(UNITS[u]);
  return { stroke, fill };
}

class Dni {
  /**
   * @param {object} o
   * @param {()=>string} o.getMode  'auto' | 'font' | 'glyphs' | 'simple'
   * @param {object} [o.adapter]    vault.adapter (exists/read/readBinary)
   * @param {string} [o.pluginDir]  dossier du plugin
   * @param {()=>string} [o.getVaultFont] chemin d'un .ttf dans le coffre
   */
  constructor(o = {}) {
    this.o = o;
    this.family = null;      // famille CSS utilisable, ou null
    this.glyphs = null;      // { box, paths:[d] } ou null
    this.vaultFace = null;
    this.ready = false;
  }

  async init() {
    // repart de zéro : un réglage vidé ou changé ne doit pas garder l'ancienne police
    if (this.vaultFace && typeof document !== "undefined" && document.fonts) { try { document.fonts.delete(this.vaultFace); } catch (e) { /* ignore */ } }
    this.vaultFace = null; this.glyphs = null; this.userFamily = null; this.missing = null; this.frames = null;
    this.family = this.detectInstalled();
    try { await this.loadVaultFont(); } catch (e) { console.warn("[Age Writer] police du coffre illisible", e); }
    try { await this.loadGlyphFile(); } catch (e) { /* facultatif */ }
    this.ready = true;
  }

  detectInstalled(families = FAMILIES) {
    if (typeof document === "undefined") return null;
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      const probe = "a%[Z{0Q";
      const w = (font) => { ctx.font = font; return ctx.measureText(probe).width; };
      for (const fam of families) {
        let diff = 0;
        for (const base of ["monospace", "serif", "sans-serif"]) if (Math.abs(w(`64px "${fam}", ${base}`) - w(`64px ${base}`)) > 0.5) diff++;
        if (diff === 3) return fam;
      }
    } catch (e) { /* pas de canvas */ }
    return null;
  }

  async loadVaultFont() {
    const p = ((this.o.getVaultFont && this.o.getVaultFont()) || "").trim();
    if (!p) return;
    // un nom de famille installée sur le système (pas un fichier) : on vérifie qu'elle existe
    if (!/\.(ttf|otf|woff2?)$/i.test(p)) { const fam = this.detectInstalled([p.replace(/['"]/g, "")]); if (fam) this.family = this.userFamily = fam; return; }
    if (!this.o.adapter || typeof FontFace === "undefined") return;
    if (!(await this.o.adapter.exists(p))) return;
    const buf = await this.o.adapter.readBinary(p);
    const face = new FontFace("AgeDniVault", buf);
    await face.load();
    document.fonts.add(face);
    this.vaultFace = face;
  }

  async loadGlyphFile() {
    if (!this.o.adapter || !this.o.pluginDir) return;
    const p = `${this.o.pluginDir}/dni-numerals.local.json`;
    if (!(await this.o.adapter.exists(p))) return;
    this.setGlyphData(JSON.parse(await this.o.adapter.read(p)));
  }

  setGlyphData(data) {
    if (!data || !Array.isArray(data.glyphs) || data.glyphs.length < 25) return;
    const b = data.box; if (!Array.isArray(b) || b.length < 4 || !b.every((x) => Number.isFinite(x)) || !(b[3] > 0) || !(b[2] > 0)) return; // fichier invalide : ignoré
    const byV = []; for (const g of data.glyphs) byV[g.v] = g.d;
    this.glyphs = { box: data.box, paths: byV };
  }

  /** Mode effectivement utilisé, selon le réglage et ce qui est disponible. */
  mode() {
    const want = (this.o.getMode && this.o.getMode()) || "auto";
    const have = { font: !!(this.vaultFace || this.family), glyphs: !!this.glyphs, simple: true };
    if (want !== "auto" && have[want]) return want;
    return have.font ? "font" : have.glyphs ? "glyphs" : "simple";
  }

  fontFamily() {
    return this.vaultFace ? "'AgeDniVault'" : this.family ? `'${this.family}'` : null;
  }

  /** Pile CSS à utiliser pour du texte en lettres D'ni (si une police est disponible). */
  textStack() {
    const f = this.fontFamily();
    return f ? `${f}, serif` : "serif";
  }

  hasFont() { return !!this.fontFamily(); }

  /**
   * Cette police dessine-t-elle vraiment le chiffre `v` ? Certaines polices D'ni n'ont pas tous les caractères
   * (le 12 est un guillemet « " ») : le navigateur prend alors une police de secours et affiche un guillemet.
   * On compare la largeur du caractère dans la police et dans deux polices génériques ; identiques → absent.
   */
  glyphMissing(v) {
    const f = this.fontFamily(); if (!f || typeof document === "undefined") return false;
    const key = f + "|" + v; this.missing = this.missing || new Map();
    if (this.missing.has(key)) return this.missing.get(key);
    let miss = false;
    try {
      const c = this.probeCtx = this.probeCtx || document.createElement("canvas").getContext("2d");
      if (c) {
        const w = (font) => { c.font = "100px " + font; return c.measureText(FONT_CHARS[v]).width; };
        const mine = w(f);
        miss = mine > 0 && (Math.abs(mine - w("serif")) < 0.01 || Math.abs(mine - w("sans-serif")) < 0.01);
      }
    } catch (e) { miss = false; }
    this.missing.set(key, miss); return miss;
  }

  /**
   * Un chiffre absent de la police, recomposé avec ses deux moitiés : les chiffres D'ni sont additifs (12 = cadre + forme
   * « dix » + forme « deux »), donc superposer les glyphes 10 et 2 de la police donne exactement le 12 qu'elle n'a pas,
   * dans son dessin et dans son cadre (Dnifont n'a pas le 12, un guillemet). Renvoie [cinquaine, unité] ou null.
   */
  fontParts_(v) {
    if (!this.glyphMissing(v)) return null;
    const u = v % 5, f = v - u;
    if (!u || !f || this.glyphMissing(f) || this.glyphMissing(u)) return null;
    return [f, u];
  }
  /** Le chiffre `v` se dessine-t-il avec la police (tel quel ou recomposé) ? */
  fontDraws_(v) { return !this.glyphMissing(v) || !!this.fontParts_(v); }

  /** Les polices D'ni n'ont que des minuscules : une majuscule retomberait dans une police ordinaire. */
  textFor(s) { return String(s == null ? "" : s).toLowerCase(); }

  /** Largeur d'une cellule de chiffre, relative à la hauteur. */
  cell(mode = this.mode()) {
    if (mode === "glyphs") return this.glyphs.box[2] / this.glyphs.box[3];
    if (mode === "font") return 1.15;
    return 1;
  }

  /**
   * Avec une police : un nombre entier se compose comme un MOT, d'une seule chaîne, et c'est la police qui soude les cases
   * (ses chasses sont dessinées pour ça : le montant droit d'un chiffre reçoit le montant gauche du suivant). Renvoie la
   * chaîne, ou null si on n'est pas en police ou si un chiffre lui manque (on revient alors au placement case par case).
   */
  fontRun_(digits, mode = this.mode()) {
    if (mode !== "font" || digits.length < 2 || digits.some((d) => this.glyphMissing(d))) return null;
    /* la police soude-t-elle vraiment ? Sa chasse doit valoir l'écart entre les montants (mesuré) ; sinon (Dnifont : ses
       cases se chevauchent d'un cinquième), on place case par case, comme pour les contours */
    const f = this.frame_("font", 0), adv = (this.runWidth_(FONT_CHARS[0] + FONT_CHARS[0], 100) - this.runWidth_(FONT_CHARS[0], 100)) / 100;
    if (Math.abs(adv - (f.r - f.l)) > 0.04) return null;
    return digits.map((d) => FONT_CHARS[d]).join("");
  }
  /** Largeur d'une chaîne composée dans la police, pour une hauteur de chiffre `size` (mesurée au canvas ; sinon estimée). */
  runWidth_(str, size) {
    try {
      const c = this.probeCtx = this.probeCtx || document.createElement("canvas").getContext("2d");
      if (c) { c.font = `${(size / FONT_CAP).toFixed(2)}px ${this.textStack()}`; const w = c.measureText(str).width; if (w > 0) return w; }
    } catch (e) { /* pas de canvas */ }
    return str.length * size * this.cell("font");
  }

  /**
   * Placement des chiffres d'un nombre (hors police, voir fontRun_) : `xs` = abscisse d'ancrage de chaque chiffre (coin haut-gauche de sa case), `width`.
   * Par défaut (`gap` absent) les cases sont SOUDÉES, comme dans l'écriture D'ni : au-delà de 24, chaque chiffre pose son
   * montant gauche sur le montant droit du précédent. Un `gap` numérique garde l'ancien écart (fraction de la hauteur).
   */
  layout_(digits, size, mode = this.mode(), gap = null) {
    const cw = size * this.cell(mode), xs = [];
    if (gap != null || digits.length < 2) { digits.forEach((d, i) => xs.push(i * (cw + size * (gap || 0)))); return { xs, width: digits.length * cw + (digits.length - 1) * size * (gap || 0) }; }
    let edge = null;
    for (const d of digits) { const f = this.frame_(mode, d), ax = edge == null ? 0 : edge - f.l * size; xs.push(ax); edge = ax + f.r * size; }
    return { xs, width: xs[xs.length - 1] + cw };
  }
  /**
   * Les deux montants d'un chiffre ({ l, r } : bord gauche du montant gauche et du montant droit, en hauteurs, depuis
   * l'ancrage). Procédural : connu (cadre de 4 à 96, trait de 7). Police ou contours : chaque glyphe a sa largeur et ses
   * barres débordantes ; on le trace hors écran et on cherche les colonnes encrées sur presque toute la hauteur. Mis en
   * cache par police et par chiffre ; une mesure ratée (police pas encore chargée) n'est pas gardée et se refait plus tard.
   */
  frame_(mode, d) {
    const cell = this.cell(mode), guess = { l: (cell - 1) / 2 + 0.005, r: (cell - 1) / 2 + 0.925 };
    if (mode === "simple" || (mode === "font" && !this.fontDraws_(d))) return guess;
    const key = mode + "|" + (mode === "font" ? this.textStack() : "glyphs") + "|" + d;
    this.frames = this.frames || new Map();
    const got = this.frames.get(key);
    if (got && (got.ok || Date.now() - got.at < 1500)) return got.f;
    let f = null;
    try {
      const H = 160, W = Math.ceil(H * cell) + 160, Hc = H + 80, cv = document.createElement("canvas"); cv.width = W; cv.height = Hc;
      const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.fillStyle = "#000"; ctx.strokeStyle = "#000";
      this.drawDigit_(ctx, d, 80, 40, H, mode, H * cell);
      const img = ctx.getImageData(0, 0, W, Hc).data, tall = [], rows = [];
      for (let y = 0; y < Hc; y++) { let any = false; for (let x = 0; x < W && !any; x++) if (img[(y * W + x) * 4 + 3] > 128) any = true; if (any) rows.push(y); }
      const gh = rows.length ? rows[rows.length - 1] - rows[0] + 1 : H; /* hauteur encrée réelle : la boîte peut être plus haute que le cadre */
      for (let x = 0; x < W; x++) { let n = 0; for (let y = 0; y < Hc; y++) if (img[(y * W + x) * 4 + 3] > 128) n++; tall.push(n >= gh * 0.7); }
      const first = tall.indexOf(true);
      let last = tall.lastIndexOf(true); while (last > first && tall[last - 1]) last--;
      if (first >= 0 && last > first + H * 0.3) f = { l: (first - 80) / H, r: (last - 80) / H };
    } catch (e) { /* pas de canvas */ }
    this.frames.set(key, { f: f || guess, ok: !!f, at: Date.now() });
    return f || guess;
  }

  /** Un compte rendu lisible de ce que fait le module (commande de diagnostic) : mode, police, cases mesurées. */
  report() {
    const mode = this.mode(), lines = [`mode : ${mode} (réglage : ${(this.o.getMode && this.o.getMode()) || "auto"})`, `police : ${this.fontFamily() || "aucune"}${this.vaultFace ? " (du coffre)" : ""}`, `contours : ${this.glyphs ? "oui, boîte " + this.glyphs.box.join(" ") : "non"}`];
    if (mode === "font") { const miss = []; for (let v = 0; v < 25; v++) if (this.glyphMissing(v)) miss.push(v); lines.push(`chiffres absents de la police : ${miss.length ? miss.map((v) => v + (this.fontParts_(v) ? " (recomposé " + this.fontParts_(v).join("+") + ")" : " (procédural)")).join(", ") : "aucun"}`); lines.push(`largeur de « 1322 » composé : ${this.runWidth_(this.fontRun_(toBase25(1322)) || "", 100).toFixed(1)} pour 100 de haut (3 chiffres)`); }
    if (mode !== "simple") for (const v of [0, 1, 2]) { const f = this.frame_(mode, v), ok = this.frames && this.frames.get(mode + "|" + (mode === "font" ? this.textStack() : "glyphs") + "|" + v); lines.push(`chiffre ${v} : montants à ${f.l.toFixed(3)} et ${f.r.toFixed(3)}${ok && ok.ok ? "" : " (estimés, mesure ratée)"}`); }
    if (mode === "font") lines.push(`la police soude-t-elle seule : ${this.fontRun_([0, 0]) ? "oui" : "non, placement case par case"}`);
    return lines.join("\n");
  }

  /** Pas vertical pour des chiffres empilés en cases soudées (pilier du calendrier). */
  joinStep(size) { return size * 0.92; }

  /** Contenu SVG (sans balise <svg>) d'un chiffre dont le coin haut-gauche est (x,y). */
  digitInner(v, x, y, size, color, mode = this.mode()) {
    if (!(v >= 0 && v <= 24)) return "";
    if (mode === "glyphs") {
      const [bx, by, , bh] = this.glyphs.box, s = size / bh;
      return `<path transform="translate(${(x - bx * s).toFixed(2)} ${(y - by * s).toFixed(2)}) scale(${s.toFixed(5)})" d="${this.glyphs.paths[v]}" fill="${color}"/>`;
    }
    if (mode === "font" && this.fontDraws_(v)) {
      const cw = size * this.cell("font"), parts = this.fontParts_(v) || [v];
      return parts.map((q) => `<text x="${(x + cw / 2).toFixed(2)}" y="${(y + size).toFixed(2)}" text-anchor="middle" font-family="${esc(this.textStack())}" font-size="${(size / FONT_CAP).toFixed(2)}" fill="${color}">${esc(FONT_CHARS[q])}</text>`).join("");
    }
    const { stroke, fill } = simplePaths(v), s = size / 100;
    const sw = (7).toFixed(1);
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})">` +
      `<path d="${stroke.join("")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter"/>` +
      fill.map((d) => `<path d="${d}" fill="${color}"/>`).join("") + `</g>`;
  }

  /** Un nombre entier en base 25, comme chaîne SVG complète. */
  numberSvg(num, { size = 28, color = "currentColor", gap = null, cls = "age-dni" } = {}) {
    const digits = toBase25(num), mode = this.mode(), pad = size * 0.04, ds = size - 2 * pad, run = gap == null ? this.fontRun_(digits, mode) : null;
    const L = run ? { width: this.runWidth_(run, ds) } : this.layout_(digits, ds, mode, gap);
    const W = L.width + 2 * pad, H = size;
    const inner = run
      ? `<text x="${pad.toFixed(2)}" y="${(pad + ds).toFixed(2)}" font-family="${esc(this.textStack())}" font-size="${(ds / FONT_CAP).toFixed(2)}" fill="${color}">${esc(run)}</text>`
      : digits.map((d, i) => this.digitInner(d, L.xs[i] + pad, pad, ds, color, mode)).join("");
    return `<svg class="${cls}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" role="img" aria-label="${esc(num)} (D'ni)">${inner}</svg>`;
  }

  /** Largeur qu'occuperait un nombre (mêmes unités que size). */
  widthOf(num, size = 28, gap = null) {
    const digits = toBase25(num), mode = this.mode(), run = gap == null ? this.fontRun_(digits, mode) : null;
    return run ? this.runWidth_(run, size) : this.layout_(digits, size, mode, gap).width;
  }

  /** Dessine un nombre sur un canvas 2D ; renvoie la largeur occupée. */
  drawNumber(ctx, num, x, y, size = 28, color = "#cdbd94", gap = null) {
    const digits = toBase25(num), mode = this.mode(), run = gap == null ? this.fontRun_(digits, mode) : null;
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color;
    let w;
    if (run) w = this.drawRun_(ctx, run, x, y, size);
    else { const cw = size * this.cell(mode), L = this.layout_(digits, size, mode, gap); digits.forEach((d, i) => this.drawDigit_(ctx, d, x + L.xs[i], y, size, mode, cw)); w = L.width; }
    ctx.restore();
    return w;
  }

  /** Une chaîne composée dans la police, coin haut-gauche (x, y) ; renvoie sa largeur. Couleurs déjà posées. */
  drawRun_(ctx, run, x, y, size) {
    ctx.font = `${(size / FONT_CAP).toFixed(1)}px ${this.textStack()}`;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(run, x, y + size);
    return ctx.measureText ? ctx.measureText(run).width : this.runWidth_(run, size);
  }

  /** Un chiffre 0..24 dans sa case (coin haut-gauche `dx`, `y`, largeur `cw`) ; couleurs déjà posées. */
  drawDigit_(ctx, d, dx, y, size, mode, cw) {
    if (mode === "simple" || (mode === "font" && !this.fontDraws_(d))) { // tracé procédural (chiffre absent de la police : centré dans la case)
      const { stroke, fill } = simplePaths(d), s = size / 100;
      ctx.save(); ctx.translate(dx + (cw - size) / 2, y); ctx.scale(s, s);
      ctx.lineWidth = 7; ctx.lineCap = "square"; ctx.lineJoin = "miter";
      for (const p of stroke) ctx.stroke(new Path2D(p));
      for (const p of fill) ctx.fill(new Path2D(p));
      ctx.restore();
    } else if (mode === "glyphs") {
      const [bx, by, , bh] = this.glyphs.box, s = size / bh;
      ctx.save(); ctx.translate(dx - bx * s, y - by * s); ctx.scale(s, s);
      ctx.fill(new Path2D(this.glyphs.paths[d])); ctx.restore();
    } else {
      ctx.font = `${(size / FONT_CAP).toFixed(1)}px ${this.textStack()}`;
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      for (const q of this.fontParts_(d) || [d]) ctx.fillText(FONT_CHARS[q], dx + cw / 2, y + size);
    }
  }

  /**
   * Une longueur en rahnfee (src/beam.js), sans virgule moderne : `digits` = [entier, f1, f2, …], f1 en 25ᵉ, f2 en 625ᵉ…
   * Chaque chiffre de la fraction est gravé dans sa petite LUCARNE, comme sur les cadrans d'un instrument de mesureur ;
   * la place de la lucarne dit le rang (25ᵉ, 625ᵉ, 15 625ᵉ). Un zéro reste gravé : la place compte. Un entier non nul
   * (au-delà d'un rahnfee : rien ne l'atteint aujourd'hui) s'écrit d'abord, à nu, avant les lucarnes.
   * Renvoie { cells: [{ d, x, framed }], width, cw, pad }, dans les unités de `size`.
   */
  fractionLayout_(digits, size = 28, gap = 0.36) {
    const arr = Array.isArray(digits) && digits.length ? digits : [0], whole = Math.max(0, Math.round(Number(arr[0]) || 0));
    const fr = arr.slice(1).map((d) => Math.max(0, Math.min(24, Math.round(Number(d) || 0))));
    const cw = size * this.cell(), g = size * gap, pad = size * 0.14, cells = [];
    let x = 0;
    if (whole > 0 || !fr.length) { const wd = toBase25(whole), run = this.fontRun_(wd); if (run) { x = this.runWidth_(run, size); cells.push({ run, x: 0, framed: false }); } else { const WL = this.layout_(wd, size); wd.forEach((d, i) => cells.push({ d, x: WL.xs[i], framed: false })); x = WL.width; } if (fr.length) x += g; }
    fr.forEach((d, i) => { cells.push({ d, x: x + pad, framed: true }); x += cw + 2 * pad + (i < fr.length - 1 ? g * 0.5 : 0); });
    return { cells, width: x, cw, pad };
  }
  /** Largeur d'une longueur en lucarnes (mêmes unités que size). */
  fractionWidth(digits, size = 28, gap = 0.36) { return this.fractionLayout_(digits, size, gap).width; }
  /** Une longueur en lucarnes, comme chaîne SVG complète (même dessin que `drawFraction`). */
  fractionSvg(digits, { size = 28, color = "currentColor", gap = 0.36, cls = "age-dni", label = "" } = {}) {
    const L = this.fractionLayout_(digits, size, gap), mode = this.mode(), pad = size * 0.04, H = size + 2 * L.pad, W = Math.max(1, L.width), sw = Math.max(0.6, size * 0.05);
    let inner = "";
    for (const c of L.cells) {
      if (c.framed) inner += `<rect x="${(c.x - L.pad + sw / 2).toFixed(2)}" y="${(sw / 2).toFixed(2)}" width="${(L.cw + 2 * L.pad - sw).toFixed(2)}" height="${(H - sw).toFixed(2)}" rx="${(size * 0.12).toFixed(2)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(2)}" opacity="0.7"/>`;
      inner += c.run
        ? `<text x="${(c.x + pad).toFixed(2)}" y="${(L.pad + size - pad).toFixed(2)}" font-family="${esc(this.textStack())}" font-size="${((size - 2 * pad) / FONT_CAP).toFixed(2)}" fill="${color}">${esc(c.run)}</text>`
        : this.digitInner(c.d, c.x + pad, L.pad + pad, size - 2 * pad, color, mode);
    }
    const aria = label || (Array.isArray(digits) ? digits.join(" ") : "0");
    return `<svg class="${cls}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" role="img" aria-label="${esc(aria)} (D'ni)">${inner}</svg>`;
  }
  /** Dessine une longueur en lucarnes sur un canvas 2D ; renvoie la largeur occupée. */
  drawFraction(ctx, digits, x, y, size = 28, color = "#cdbd94", gap = 0.36) {
    const L = this.fractionLayout_(digits, size, gap), mode = this.mode();
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color;
    for (const c of L.cells) {
      if (c.framed) { ctx.save(); ctx.globalAlpha *= 0.7; ctx.lineWidth = Math.max(0.6, size * 0.05); ctx.strokeRect(x + c.x - L.pad, y - L.pad, L.cw + 2 * L.pad, size + 2 * L.pad); ctx.restore(); }
      if (c.run) this.drawRun_(ctx, c.run, x + c.x, y, size); else this.drawDigit_(ctx, c.d, x + c.x, y, size, mode, L.cw);
    }
    ctx.restore();
    return L.width;
  }
}

module.exports = { Dni, toBase25, fromBase25, simplePaths, FONT_CHARS, FAMILIES };
