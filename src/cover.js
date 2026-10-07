"use strict";
/**
 * Page de garde du livre d'Âge (Descriptive Book) — entièrement procédurale, tirée du nom de l'Âge et de son monde.
 *
 * Un critère de sobriété (0 → 1) règle le tout :
 *  - 0 « ornée » : pierre marbrée aux teintes du monde (eau → vert-de-gris, lave → braise, glace, sable, forêt…),
 *    triple cadre doré, bordure à motif, ornements de coin, cartouche et couronne des symboles ;
 *  - 0,35 « classique » : marbre plus calme, deux cadres ;
 *  - 0,7 « sobre » : cuir patiné comme un vieux livre, un seul filet à froid, coins de laiton, médaillon rond ;
 *  - 1 « nue » : cuir, médaillon et coins de laiton, rien d'autre.
 * Le dos de cuir, les coins, la forme du cadre, le motif et la nuance viennent de la graine du nom ;
 * l'usure suit l'état du livre : lustré s'il est stable, éraflé s'il vacille, fendu s'il se meurt.
 */
const { fnv, esc } = require("./util");

const W = 480, H = 640, SP = 58, CX = SP + (W - SP) / 2, CY = 322; // dos de 58 px à gauche ; centre de la face
const BRASS = "#b8934a", BRASS2 = "#e0c27a", INK = "#cdbd94";

/** Niveaux nommés de sobriété (réglage, ligne `cover:` du bloc age). */
const LEVELS = { ornate: 0.05, classic: 0.35, sober: 0.7, plain: 1 };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Sobriété tirée du nom quand rien n'est précisé : un peu de tout, avec une légère nuance propre à chaque Âge. */
function autoSobriety(h) {
  const r = ((h >>> 16) % 1000) / 1000, j = (((h >>> 6) % 100) / 100 - 0.5) * 0.14;
  return clamp01((r < 0.2 ? 0.05 : r < 0.5 ? 0.35 : r < 0.85 ? 0.7 : 1) + j);
}

// ---- couleurs ---------------------------------------------------------------------------------
const hex2 = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
function shift(hex, dh, dl = 0) { // décalage de teinte (degrés) et de clarté
  const [r, g, b] = hex2(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  h = (h + dh + 360) % 360; l = Math.max(0.02, Math.min(0.95, l + dl));
  if (s === 0) return toHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = (t) => { t = ((t % 360) + 360) % 360 / 360; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return toHex([f(h + 120) * 255, f(h) * 255, f(h - 120) * 255]);
}
const rng = (seed) => { let o = seed >>> 0; return () => { o = o + 1831565813 | 0; let t = Math.imul(o ^ o >>> 15, 1 | o); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/** Matières : [sombre, moyen, clair, veine] ; première correspondance gagnante. */
const MATERIALS = [
  { key: "lava", ids: ["lava", "heat", "wildfire", "ember"], c: ["#2a0b08", "#6e2412", "#c25a24", "#f6c27a"] },
  { key: "ice", ids: ["deep_cold", "frost", "ice", "meltwater_ice"], c: ["#14212e", "#41627e", "#a7c3d6", "#f4f9fc"] },
  { key: "water", ids: ["water", "brine", "marsh_mist", "meltwater"], c: ["#0c2624", "#2c6a5e", "#7db39c", "#dff2e4"] },
  { key: "sand", ids: ["sand", "dust_storm", "dust"], c: ["#33240f", "#86642f", "#d0ad6c", "#f5e6b8"] },
  { key: "flora", ids: ["fern", "vine", "great_tree", "glowvine", "wrong_glowvine", "spore", "seed", "lichen"], c: ["#101f14", "#2e5732", "#7ba05c", "#d3e6a4"] },
  { key: "stone", ids: ["stone", "iron", "crystal", "salt", "ash"], c: ["#1d1f26", "#474a57", "#8b8f9d", "#e0e0ea"] },
  { key: "night", ids: ["starless", "permanent_veil"], c: ["#0b0a1c", "#29244f", "#5a549e", "#cac3f2"] },
];

function materialFor(world, h) {
  const has = new Set(world || []);
  const m = MATERIALS.find((x) => x.ids.some((id) => has.has(id)));
  // pas de monde connu : une teinte tirée du nom
  let c = m ? m.c : ["#1c1a14", "#4a4030", "#9a8a68", "#efe4c4"].map((x) => shift(x, (h % 360) - 180, 0));
  const dh = ((h >>> 9) % 25) - 12, dl = (((h >>> 14) % 9) - 4) / 100; // chaque Âge a sa nuance
  c = c.map((x, i) => shift(x, dh, i === 3 ? 0 : dl));
  return { key: m ? m.key : "plain", c };
}

// ---- motifs de bordure (cellule 16×14) ---------------------------------------------------------
const MOTIFS = {
  key: "M0 12H4V4H12V10H8V8", // clé grecque
  teeth: "M0 12L4 4L8 12L12 4L16 12",
  diamond: "M8 1L15 7L8 13L1 7Z M8 4.5L11.5 7L8 9.5L4.5 7Z",
  wave: "M0 8Q4 1 8 8T16 8 M0 12Q4 5 8 12T16 12",
  flame: "M1 13Q3 7 8 1Q13 7 15 13 M8 13Q6 9 8 6Q10 9 8 13",
  stars: "M8 2V12M3 7H13M5 4L11 10M11 4L5 10",
  scale: "M0 13Q4 3 8 13 M8 13Q12 3 16 13 M4 8Q8 -1 12 8",
};
const MOTIF_BY_MATERIAL = { lava: ["flame", "teeth"], water: ["wave", "scale"], ice: ["stars", "diamond"], sand: ["key", "teeth"], flora: ["scale", "diamond"], stone: ["key", "diamond"], night: ["stars", "diamond"], plain: ["key", "teeth", "diamond"] };

const oct = (x, y, w, h, c) => `M${x + c} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h - c}L${x + w - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`;
const rrect = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const FRAMES = [(x, y, w, h) => oct(x, y, w, h, 26), (x, y, w, h) => rrect(x, y, w, h, 18), (x, y, w, h) => oct(x, y, w, h, 12), (x, y, w, h) => rrect(x, y, w, h, 4)];

function corner(x, y, kind, leather, gold, b1, b2) {
  const r = 14;
  const base = `<path d="${oct(x - r, y - r, 2 * r, 2 * r, 5)}" fill="${leather}" stroke="${gold}" stroke-width="1.6"/>`;
  if (kind === 0) { let s = ""; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `M${x} ${y}L${(x + Math.cos(a) * (r - 3)).toFixed(1)} ${(y + Math.sin(a) * (r - 3)).toFixed(1)}`; } return base + `<path d="${s}" stroke="${b1}" stroke-width="1.2" fill="none"/><circle cx="${x}" cy="${y}" r="2.4" fill="${b2}"/>`; }
  if (kind === 1) return base + `<path d="M${x - 8} ${y - 8}H${x + 8}V${y + 8}H${x - 8}Z" fill="none" stroke="${b1}" stroke-width="1.2"/><path d="M${x} ${y - 11}L${x + 11} ${y}L${x} ${y + 11}L${x - 11} ${y}Z" fill="none" stroke="${b2}" stroke-width="1"/>`;
  if (kind === 2) return base + `<path d="M${x - 10} ${y}H${x + 10}M${x} ${y - 10}V${y + 10}" stroke="${b1}" stroke-width="1.6"/>` + [[-6, -6], [6, -6], [-6, 6], [6, 6]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="1.5" fill="${b2}"/>`).join("");
  return base + `<path d="${oct(x - 8, y - 8, 16, 16, 4)}" fill="none" stroke="${b1}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${b2}" stroke-width="1.2"/>`;
}

const tbl = (c, i) => c.map((x) => (hex2(x)[i] / 255).toFixed(3)).join(" ");

/**
 * @param {object} o
 * @param {string} o.name           nom de l'Âge
 * @param {number} o.number         numéro d'Âge (affiché en D'ni)
 * @param {number} [o.seedNumber]   graine numérique (affichée en petit)
 * @param {import('./dni').Dni} o.dni
 * @param {(id:string,x:number,y:number,size:number)=>string} [o.glyph]  fe() du moteur
 * @param {string[]} [o.glyphIds]
 * @param {string[]} [o.world]      identifiants du monde (eau, lave, pierre…) : matière et motif de la couverture
 * @param {number} [o.sobriety]     0 (ornée) … 1 (nue) ; absent : tirée du nom
 * @param {string} [o.verdict]      stable | unstable | dying : usure
 * @param {string} [o.label]        « Descriptive book »
 * @param {boolean} [o.standalone]  ajoute xmlns (export de fichier)
 */
function coverSvg(o) {
  const h = fnv(o.name), u = "c" + (h % 100000), R = rng(h ^ 0x9e3779b9);
  const sob = o.sobriety != null && !isNaN(o.sobriety) ? clamp01(o.sobriety) : autoSobriety(h);
  const leatherMode = sob >= 0.5, protectors = sob >= 0.55, nFrames = sob < 0.25 ? 3 : sob < 0.55 ? 2 : sob < 0.85 ? 1 : 0, band = sob < 0.4, medallion = sob >= 0.55;
  const mat = materialFor(o.world, h), pal = mat.c, stops = [pal[0], mix(pal[0], pal[1], 0.55), pal[1], mix(pal[1], pal[2], 0.5)]; // la pierre reste sombre : le clair ne sert qu'aux veines
  // cuir : un brun patiné, à peine teinté par le monde
  const lb = shift(mix("#5b4128", pal[1], 0.28), ((h >>> 9) % 11) - 5, (((h >>> 14) % 7) - 3) / 100), lstops = [mix(lb, "#140c07", 0.6), mix(lb, "#140c07", 0.28), lb, mix(lb, "#b08a5a", 0.22)];
  const spineCol = leatherMode ? mix(lb, "#100905", 0.5) : mix(pal[0], "#1c130d", 0.62), leather2 = mix(spineCol, "#4a3626", 0.3), leather = spineCol;
  const b1 = mix(BRASS, "#6f6246", sob * 0.45), b2 = mix(BRASS2, "#7a6a4a", sob * 0.45); // le laiton se ternit avec la sobriété
  const motifList = MOTIF_BY_MATERIAL[mat.key], motif = MOTIFS[motifList[(h >>> 4) % motifList.length]];
  const frameFn = FRAMES[(h >>> 7) % FRAMES.length], cornerKind = (h >>> 3) % 4, rings = 1 + ((h >>> 5) % 2), vertBand = ((h >>> 11) & 1) === 1 && sob < 0.2;
  const ribs = 3 + ((h >>> 13) % 3), seed = h % 997;
  const verdictCol = { stable: "#8fae6a", unstable: "#d9a24a", dying: "#c0553f" }[o.verdict] || b1;
  const fx = (0.004 + R() * 0.006).toFixed(4), fy = (0.008 + R() * 0.009).toFixed(4), vx = (0.003 + R() * 0.004).toFixed(4), vy = (0.007 + R() * 0.006).toFixed(4);
  const L = SP + 24, T = 24, FW = W - L - 24, FH = H - 2 * T; // cadre de la face
  const GOLD = `url(#${u}au)`, vein = hex2(pal[3]).map((v) => (v / 255).toFixed(3));
  const gain = (1.9 - 0.9 * Math.min(sob, 0.5) * 2).toFixed(2), off = (-(0.45 - 0.2 * Math.min(sob, 0.5) * 2)).toFixed(2), veinK = Math.max(0.04, 0.2 * (1 - sob * 1.6)).toFixed(2);
  let s = `<svg ${o.standalone ? `xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ` : ""}class="age-cover" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.name)}">`;
  s += `<defs>
<filter id="${u}mb" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="5" seed="${seed}" result="n"/>
<feColorMatrix in="n" type="matrix" values="${gain} 0 0 0 ${off}  ${gain} 0 0 0 ${off}  ${gain} 0 0 0 ${off}  0 0 0 0 1" result="g"/>
<feComponentTransfer in="g" result="base"><feFuncR type="table" tableValues="${tbl(stops, 0)}"/><feFuncG type="table" tableValues="${tbl(stops, 1)}"/><feFuncB type="table" tableValues="${tbl(stops, 2)}"/></feComponentTransfer>
<feTurbulence type="turbulence" baseFrequency="${vx} ${vy}" numOctaves="2" seed="${(seed + 7) % 997}" result="v"/>
<feColorMatrix in="v" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="vg"/>
<feComponentTransfer in="vg" result="ridge"><feFuncR type="table" tableValues="0 0 0 1 0 0 0 0 0 0 0 0"/><feFuncG type="table" tableValues="0 0 0 1 0 0 0 0 0 0 0 0"/><feFuncB type="table" tableValues="0 0 0 1 0 0 0 0 0 0 0 0"/></feComponentTransfer>
<feComponentTransfer in="ridge" result="vein"><feFuncR type="linear" slope="${vein[0]}"/><feFuncG type="linear" slope="${vein[1]}"/><feFuncB type="linear" slope="${vein[2]}"/></feComponentTransfer>
<feComposite in="base" in2="vein" operator="arithmetic" k1="0" k2="1" k3="${veinK}" k4="0"/>
</filter>
<filter id="${u}lt" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${(fx * 2.2).toFixed(4)} ${(fy * 1.7).toFixed(4)}" numOctaves="4" seed="${seed}" result="n"/>
<feColorMatrix in="n" type="matrix" values="1.7 0 0 0 -0.3  1.7 0 0 0 -0.3  1.7 0 0 0 -0.3  0 0 0 0 1" result="g"/>
<feComponentTransfer in="g" result="base"><feFuncR type="table" tableValues="${tbl(lstops, 0)}"/><feFuncG type="table" tableValues="${tbl(lstops, 1)}"/><feFuncB type="table" tableValues="${tbl(lstops, 2)}"/></feComponentTransfer>
<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="${(seed + 3) % 997}" result="gr"/>
<feColorMatrix in="gr" type="matrix" values="0.9 0 0 0 0.38  0.9 0 0 0 0.38  0.9 0 0 0 0.38  0 0 0 0 1" result="grm"/>
<feBlend in="base" in2="grm" mode="multiply"/>
</filter>
<filter id="${u}lg" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed % 89}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"/></filter>
<linearGradient id="${u}au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b2}"/><stop offset="0.55" stop-color="${b1}"/><stop offset="1" stop-color="${mix(b1, "#000", 0.35)}"/></linearGradient>
<linearGradient id="${u}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.03"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.07"/></linearGradient>
<linearGradient id="${u}sp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.5" stop-color="#000" stop-opacity="0.1"/><stop offset="0.86" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
<radialGradient id="${u}v" cx="55%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${(0.5 + 0.2 * sob).toFixed(2)}"/></radialGradient>
<pattern id="${u}m" width="16" height="14" patternUnits="userSpaceOnUse"><path d="${motif}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></pattern>
<pattern id="${u}mv" width="16" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><path d="${motif}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></pattern>
<clipPath id="${u}face"><rect x="${SP}" y="0" width="${W - SP}" height="${H}"/></clipPath>
</defs>`;
  // matière de la couverture (pierre marbrée ou cuir patiné), brillance
  s += leatherMode ? `<rect width="${W}" height="${H}" fill="${lb}" filter="url(#${u}lt)"/>` : `<rect width="${W}" height="${H}" fill="${pal[1]}" filter="url(#${u}mb)"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#${u}gl)" opacity="${leatherMode ? 0.45 : 1}"/>`;
  // dos de cuir : nerfs, coutures, charnière
  s += `<rect width="${SP}" height="${H}" fill="${spineCol}"/><rect width="${SP}" height="${H}" filter="url(#${u}lg)" opacity="0.7"/><rect width="${SP}" height="${H}" fill="url(#${u}sp)"/>`;
  const ribLine = leatherMode ? mix(spineCol, "#000", 0.5) : GOLD;
  for (let i = 0; i < ribs; i++) {
    const y = 70 + (i * (H - 140)) / Math.max(ribs - 1, 1);
    s += `<rect x="0" y="${(y - 5).toFixed(1)}" width="${SP}" height="10" fill="${leather2}" opacity="0.8"/><path d="M0 ${(y - 5).toFixed(1)}H${SP}M0 ${(y + 5).toFixed(1)}H${SP}" stroke="${ribLine}" stroke-width="1.4" opacity="${leatherMode ? 0.7 : 0.85}"/>`;
  }
  s += `<path d="M${SP - 11} 14V${H - 14}" stroke="${mix(spineCol, "#d8c8a8", 0.5)}" stroke-width="1.3" stroke-dasharray="5 6" opacity="0.7"/>`;
  s += `<path d="M${SP} 0V${H}" stroke="#000" stroke-width="3.5" opacity="0.55"/><path d="M${SP + 2.5} 0V${H}" stroke="#fff" stroke-width="1" opacity="0.14"/>`;
  if (leatherMode) s += `<rect x="${SP + 3}" y="3" width="${W - SP - 6}" height="${H - 6}" fill="none" stroke="${mix(lb, "#d8b888", 0.5)}" stroke-width="5" opacity="0.11"/>`; // bords frottés
  // coins : cuir riveté (ornés) ou coins de laiton (sobres)
  if (protectors) {
    for (const [cx, cy, sx, sy] of [[W, 0, -1, 1], [W, H, -1, -1], [SP + 1, 0, 1, 1], [SP + 1, H, 1, -1]]) {
      const tri = `M${cx} ${cy}L${cx + sx * 46} ${cy}L${cx} ${cy + sy * 46}Z`;
      s += `<path d="${tri}" fill="${GOLD}" stroke="#000" stroke-opacity="0.45" stroke-width="1"/><path d="M${cx + sx * 8} ${cy + sy * 3}L${cx + sx * 40} ${cy + sy * 3}M${cx + sx * 3} ${cy + sy * 8}L${cx + sx * 3} ${cy + sy * 40}" stroke="#fff" stroke-opacity="0.22" stroke-width="1"/><circle cx="${cx + sx * 13}" cy="${cy + sy * 13}" r="2.4" fill="${mix(b1, "#000", 0.35)}"/>`;
    }
  } else {
    for (const [cx, cy, sx, sy] of [[W, 0, -1, 1], [W, H, -1, -1]]) {
      const tri = `M${cx} ${cy}L${cx + sx * 70} ${cy}L${cx} ${cy + sy * 70}Z`;
      s += `<path d="${tri}" fill="${leather}"/><path d="${tri}" filter="url(#${u}lg)" opacity="0.7"/>`;
      s += `<path d="M${cx + sx * 70} ${cy}L${cx} ${cy + sy * 70}" stroke="${GOLD}" stroke-width="1.6"/><circle cx="${cx + sx * 16}" cy="${cy + sy * 16}" r="3.2" fill="${b2}" stroke="#000" stroke-opacity="0.4"/>`;
    }
  }
  // cadres de la face : dorés (ornés) ou frappés à froid dans le cuir (sobres)
  const blind = (d, w) => `<path d="${d}" fill="none" stroke="${mix(lb, "#000", 0.6)}" stroke-width="${w}" opacity="0.8"/><path d="${d}" fill="none" stroke="${mix(lb, "#e8cfa0", 0.5)}" stroke-width="0.7" opacity="0.28" transform="translate(0.9 0.9)"/>`;
  const stroke = (d, w, c) => (leatherMode ? blind(d, w) : `<path d="${d}" fill="none" stroke="${c || GOLD}" stroke-width="${w}"${c ? ' opacity="0.9"' : ""}/>`);
  if (nFrames >= 3) { s += stroke(frameFn(L, T, FW, FH), 3); s += stroke(frameFn(L + 11, T + 11, FW - 22, FH - 22), 1.1, b1); s += stroke(frameFn(L + 22, T + 22, FW - 44, FH - 44), 1.8); }
  else if (nFrames === 2) { s += stroke(frameFn(L, T, FW, FH), 2.4); s += stroke(frameFn(L + 14, T + 14, FW - 28, FH - 28), 1.1, b1); }
  else if (nFrames === 1) s += stroke(frameFn(L + 6, T + 6, FW - 12, FH - 12), 2);
  // bordures à motif, ornements de coin et médaillons (seulement si l'ornement l'emporte)
  if (band) s += `<rect x="${L + 40}" y="${T + 30}" width="${FW - 80}" height="14" fill="url(#${u}m)" opacity="${(1 - sob).toFixed(2)}"/><rect x="${L + 40}" y="${H - T - 44}" width="${FW - 80}" height="14" fill="url(#${u}m)" opacity="${(1 - sob).toFixed(2)}"/>`;
  if (vertBand) s += `<rect x="${L + 30}" y="${T + 56}" width="14" height="${FH - 112}" fill="url(#${u}mv)"/><rect x="${W - 24 - 44}" y="${T + 56}" width="14" height="${FH - 112}" fill="url(#${u}mv)"/>`;
  if (!protectors) {
    for (const [x, y] of [[L + 18, T + 18], [W - 24 - 18, T + 18], [L + 18, H - T - 18], [W - 24 - 18, H - T - 18]]) s += corner(x, y, cornerKind, leather, GOLD, b1, b2);
    for (const [x, y] of [[CX, T + 22], [CX, H - T - 22]]) s += `<path d="${oct(x - 8, y - 8, 16, 16, 4)}" fill="${leather}" stroke="${GOLD}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="2.4" fill="${b2}"/>`;
  }
  const serif = "Georgia, 'Times New Roman', serif", fam = o.dni.hasFont() ? esc(o.dni.textStack()) : "";
  const dniName = o.dni.hasFont() ? esc(o.dni.textFor ? o.dni.textFor(o.name) : o.name) : "";
  const labelTxt = esc((o.label || "DESCRIPTIVE BOOK").toUpperCase());
  const numG = (n, size, y, color) => { const w = o.dni.widthOf(n, size); return `<g color="${color}">${o.dni.numberSvg(n, { size, color }).replace(/^<svg[^>]*>/, `<g transform="translate(${(CX - w / 2).toFixed(1)} ${y})">`).replace(/<\/svg>$/, "</g>")}</g>`; };
  if (!medallion) {
    // cartouche : plaque sombre translucide, couronne de symboles, numéro et noms
    for (let i = 0; i < rings; i++) s += `<path d="${oct(CX - 130 + i * 8, CY - 172 + i * 8, 260 - i * 16, 340 - i * 16, 40 - i * 6)}" fill="${i ? "none" : "rgba(8,6,4,0.62)"}" stroke="${i ? b1 : GOLD}" stroke-width="${i ? 1 : 2}"/>`;
    const ids = (o.glyphIds || []).slice(0, 8);
    if (o.glyph) ids.forEach((id, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(ids.length, 1), cx = CX + Math.cos(a) * 98, cy = CY + Math.sin(a) * 132, sz = 32;
      s += `<g color="${INK}" opacity="0.92">${o.glyph(id, cx - sz / 2, cy - sz / 2, sz)}</g>`;
    });
    s += numG(o.number, 38, 266, b2);
    s += `<path d="M${CX - 70} 334H${CX + 70}" stroke="${b1}" stroke-width="1"/><path d="M${CX - 14} 334l14 -5l14 5l-14 5z" fill="${b2}"/>`;
    if (dniName) s += `<text x="${CX + 1}" y="373" text-anchor="middle" font-family="${fam}" font-size="29" fill="#000" opacity="0.6">${dniName}</text><text x="${CX}" y="372" text-anchor="middle" font-family="${fam}" font-size="29" fill="${GOLD}">${dniName}</text>`;
    const ly = dniName ? 398 : 372;
    s += `<text x="${CX + 0.8}" y="${ly + 0.8}" text-anchor="middle" font-family="${serif}" font-style="italic" font-size="19" fill="#000" opacity="0.55">${esc(o.name)}</text><text x="${CX}" y="${ly}" text-anchor="middle" font-family="${serif}" font-style="italic" font-size="19" fill="#e6d8b4">${esc(o.name)}</text>`;
    s += `<text x="${CX}" y="132" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="3.5" fill="${GOLD}">${labelTxt}</text>`;
  } else {
    // médaillon rond de laiton, comme sur les vieux livres : le numéro D'ni, le nom frappé dessous, quelques symboles discrets
    const my = 262, r = 40 - 6 * (sob - 0.55);
    s += `<circle cx="${CX}" cy="${my}" r="${r + 4}" fill="#000" opacity="0.28"/><circle cx="${CX}" cy="${my}" r="${r}" fill="${GOLD}" stroke="#000" stroke-opacity="0.5" stroke-width="1.2"/>`;
    s += `<circle cx="${CX}" cy="${my}" r="${r - 6}" fill="${mix(lb, "#000", 0.55)}" stroke="${b2}" stroke-opacity="0.8" stroke-width="1"/>`;
    s += numG(o.number, 20, my - 10, b2);
    if (dniName) s += `<text x="${CX}" y="${my + r + 40}" text-anchor="middle" font-family="${fam}" font-size="24" fill="${mix(lb, "#e8cfa0", 0.55)}" opacity="0.85">${dniName}</text>`;
    const ly = my + r + (dniName ? 66 : 44);
    s += `<text x="${CX}" y="${ly}" text-anchor="middle" font-family="${serif}" font-style="italic" font-size="17" fill="${mix(lb, "#e8cfa0", 0.6)}" opacity="0.9">${esc(o.name)}</text>`;
    s += `<text x="${CX}" y="112" text-anchor="middle" font-family="Georgia, serif" font-size="10" letter-spacing="4" fill="${mix(lb, "#e8cfa0", 0.42)}" opacity="0.8">${labelTxt}</text>`;
    const ids = sob < 0.85 && o.glyph ? (o.glyphIds || []).slice(0, 6) : [];
    ids.forEach((id, i) => { const sz = 17, x = CX + (i - (ids.length - 1) / 2) * 30 - sz / 2; s += `<g color="${mix(lb, "#e8cfa0", 0.5)}" opacity="0.7">${o.glyph(id, x, ly + 24, sz)}</g>`; });
  }
  if (o.seedNumber != null && !medallion) s += numG(o.seedNumber, 15, 506, b1);
  if (o.verdict) s += `<text x="${CX}" y="${medallion ? 560 : 548}" text-anchor="middle" font-family="Georgia, serif" font-size="10.5" letter-spacing="3" fill="${medallion ? mix(verdictCol, lb, 0.35) : verdictCol}">${esc(o.verdict.toUpperCase())}</text>`;
  // usure : éraflures s'il vacille, fentes s'il se meurt
  if (o.verdict === "unstable" || o.verdict === "dying") {
    const n = o.verdict === "dying" ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const x = SP + 10 + R() * (W - SP - 20), y = 10 + R() * (H - 20), a = R() * Math.PI, l = 14 + R() * 46;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}" stroke="#f0e6cc" stroke-width="0.6" opacity="${(0.12 + R() * 0.16).toFixed(2)}" clip-path="url(#${u}face)"/>`;
    }
  }
  if (o.verdict === "dying") {
    for (let k = 0; k < 3; k++) {
      let x = SP + 40 + R() * (W - SP - 80), y = k % 2 ? H : 0, pts = 0; const dir = k % 2 ? -1 : 1; let d = `M${x.toFixed(1)} ${y}`;
      while (pts < 9 && y > -10 && y < H + 10) { x += (R() - 0.5) * 34; y += dir * (24 + R() * 34); d += `L${x.toFixed(1)} ${y.toFixed(1)}`; pts++; }
      s += `<path d="${d}" fill="none" stroke="#050403" stroke-width="2.2" stroke-linejoin="bevel" opacity="0.78" clip-path="url(#${u}face)"/><path d="${d}" fill="none" stroke="#f0e6cc" stroke-width="0.7" opacity="0.22" transform="translate(1.4 0)" clip-path="url(#${u}face)"/>`;
    }
  }
  s += `<rect width="${W}" height="${H}" fill="url(#${u}v)"/><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#000" stroke-opacity="0.5"/></svg>`;
  return s;
}

module.exports = { coverSvg, materialFor, MATERIALS, LEVELS, autoSobriety };
