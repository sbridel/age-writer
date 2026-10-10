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
    this.vaultFace = null; this.glyphs = null; this.userFamily = null; this.missing = null;
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

  /** Les polices D'ni n'ont que des minuscules : une majuscule retomberait dans une police ordinaire. */
  textFor(s) { return String(s == null ? "" : s).toLowerCase(); }

  /** Largeur d'une cellule de chiffre, relative à la hauteur. */
  cell(mode = this.mode()) {
    if (mode === "glyphs") return this.glyphs.box[2] / this.glyphs.box[3];
    if (mode === "font") return 1.15;
    return 1;
  }

  /** Contenu SVG (sans balise <svg>) d'un chiffre dont le coin haut-gauche est (x,y). */
  digitInner(v, x, y, size, color, mode = this.mode()) {
    if (!(v >= 0 && v <= 24)) return "";
    if (mode === "glyphs") {
      const [bx, by, , bh] = this.glyphs.box, s = size / bh;
      return `<path transform="translate(${(x - bx * s).toFixed(2)} ${(y - by * s).toFixed(2)}) scale(${s.toFixed(5)})" d="${this.glyphs.paths[v]}" fill="${color}"/>`;
    }
    if (mode === "font" && !this.glyphMissing(v)) {
      const cw = size * this.cell("font");
      return `<text x="${(x + cw / 2).toFixed(2)}" y="${(y + size).toFixed(2)}" text-anchor="middle" font-family="${esc(this.textStack())}" font-size="${(size / FONT_CAP).toFixed(2)}" fill="${color}">${esc(FONT_CHARS[v])}</text>`;
    }
    const { stroke, fill } = simplePaths(v), s = size / 100;
    const sw = (7).toFixed(1);
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})">` +
      `<path d="${stroke.join("")}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter"/>` +
      fill.map((d) => `<path d="${d}" fill="${color}"/>`).join("") + `</g>`;
  }

  /** Un nombre entier en base 25, comme chaîne SVG complète. */
  numberSvg(num, { size = 28, color = "currentColor", gap = 0.22, cls = "age-dni" } = {}) {
    const digits = toBase25(num), mode = this.mode(), cw = size * this.cell(mode), g = size * gap;
    const W = digits.length * cw + (digits.length - 1) * g, H = size;
    const pad = size * 0.04;
    const inner = digits.map((d, i) => this.digitInner(d, i * (cw + g) + pad, pad, size - 2 * pad, color, mode)).join("");
    return `<svg class="${cls}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" role="img" aria-label="${esc(num)} (D'ni)">${inner}</svg>`;
  }

  /** Largeur qu'occuperait un nombre (mêmes unités que size). */
  widthOf(num, size = 28, gap = 0.22) {
    const n = toBase25(num).length;
    return n * size * this.cell() + (n - 1) * size * gap;
  }

  /** Dessine un nombre sur un canvas 2D ; renvoie la largeur occupée. */
  drawNumber(ctx, num, x, y, size = 28, color = "#cdbd94", gap = 0.22) {
    const digits = toBase25(num), mode = this.mode(), cw = size * this.cell(mode), g = size * gap;
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color;
    digits.forEach((d, i) => this.drawDigit_(ctx, d, x + i * (cw + g), y, size, mode, cw));
    ctx.restore();
    return digits.length * cw + (digits.length - 1) * g;
  }

  /** Un chiffre 0..24 dans sa case (coin haut-gauche `dx`, `y`, largeur `cw`) ; couleurs déjà posées. */
  drawDigit_(ctx, d, dx, y, size, mode, cw) {
    if (mode === "simple" || (mode === "font" && this.glyphMissing(d))) { // tracé procédural (chiffre absent de la police : centré dans la case)
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
      ctx.fillText(FONT_CHARS[d], dx + cw / 2, y + size);
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
    if (whole > 0 || !fr.length) { toBase25(whole).forEach((d) => { cells.push({ d, x, framed: false }); x += cw + size * 0.22; }); if (fr.length) x += g; }
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
      inner += this.digitInner(c.d, c.x + pad, L.pad + pad, size - 2 * pad, color, mode);
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
      this.drawDigit_(ctx, c.d, x + c.x, y, size, mode, L.cw);
    }
    ctx.restore();
    return L.width;
  }
}

module.exports = { Dni, toBase25, fromBase25, simplePaths, FONT_CHARS, FAMILIES };
