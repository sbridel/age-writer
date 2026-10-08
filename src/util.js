"use strict";
// Petits utilitaires partagés (JavaScript pur, sans dépendance).

function fnv(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32 : générateur déterministe à partir d'une graine entière. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 1831565813) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x, a = 0, b = 1) => (x === x ? Math.max(a, Math.min(b, x)) : a); // NaN → a (jamais de NaN dans le rendu)
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const frac = (x) => x - Math.floor(x);
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) {
  const [r1, g1, b1] = hex2rgb(a), [r2, g2, b2] = hex2rgb(b);
  const f = (x) => Math.round(x).toString(16).padStart(2, "0");
  return "#" + f(r1 + (r2 - r1) * t) + f(g1 + (g2 - g1) * t) + f(b1 + (b2 - b1) * t);
}
const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(a).toFixed(3)})`;
function hexa(h, a) { const [r, g, b] = hex2rgb(h); return rgba(r, g, b, a); }

/** Identifiant « lisible » : heat_wave -> heat wave */
const words = (id) => String(id).replace(/_/g, " ");

/**
 * Pose du balisage (SVG, petits fragments) sans innerHTML : le texte est analysé par DOMParser dans un document inerte,
 * débarrassé des <script>, <iframe>, <object> et des attributs on*, puis ses nœuds sont importés. Remplace le contenu de `el`
 * (append = false) ou s'ajoute à la fin. Renvoie `el`.
 */
function setMarkup(el, markup, append = false) {
  if (!el) return el;
  if (!append) while (el.firstChild) el.removeChild(el.firstChild);
  const view = el.ownerDocument && el.ownerDocument.defaultView, Parser = (view && view.DOMParser) || (typeof DOMParser !== "undefined" ? DOMParser : null);
  if (!Parser) return el;
  const doc = new Parser().parseFromString(`<body>${markup == null ? "" : String(markup)}</body>`, "text/html");
  for (const bad of doc.body.querySelectorAll("script,iframe,object,embed,foreignObject")) bad.remove();
  for (const node of doc.body.querySelectorAll("*")) for (const at of [...node.attributes]) if (/^on/i.test(at.name) || /^\s*javascript:/i.test(at.value)) node.removeAttribute(at.name);
  const owner = el.ownerDocument || document;
  for (const n of [...doc.body.childNodes]) el.appendChild(owner.importNode(n, true));
  return el;
}

module.exports = { setMarkup, fnv, rng, clamp, lerp, smooth, frac, pick, esc, mix, rgba, hexa, hex2rgb, words };
