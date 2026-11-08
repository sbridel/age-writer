"use strict";
/**
 * 2.10.1 : la synthèse du son de liaison « à la manière de » (claude/DESIGN-pistes-8-nov.md, le son). Module pur, sans DOM.
 * Un modèle (src/link-models.js) donne, trame par trame, l'enveloppe spectrale lissée (un cepstre tronqué), la hauteur du grave,
 * le voisement et le niveau. On fabrique une source propre (des harmoniques à cette hauteur, qui s'élargissent vers l'aigu, et du
 * souffle), on la colore par l'enveloppe, puis on reconstruit des phases cohérentes par quelques passes de Griffin-Lim.
 * Chaque appel tire une variante : hauteur, durée, souffle, et une graine de phases ; deux liaisons ne sonnent jamais pareil.
 *
 * synth(model, opts) → { samples: Float32Array, sr }   opts : { pitch, stretch, breath, harm, iters, seed }
 */

/* ---- FFT réelle via FFT complexe radix-2 (n puissance de deux) ---- */
function fft(re, im, inverse) {
  const n = re.length; let j = 0;
  for (let i = 1; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr; } }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/** Un générateur déterministe (xorshift) pour les phases et la variation. */
function rngOf(seed) { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function decodeCep(model) {
  const bin = typeof atob === "function" ? atob(model.cep) : Buffer.from(model.cep, "base64").toString("binary");
  const L = model.lift, n = model.n, out = new Array(n);
  for (let i = 0; i < n; i++) { const row = new Float32Array(L); for (let k = 0; k < L; k++) { let b = bin.charCodeAt(i * L + k); if (b > 127) b -= 256; row[k] = b * model.scale[k]; } out[i] = row; }
  return out;
}

/** L'enveloppe (amplitude par bin) d'une trame, depuis son cepstre tronqué : exp(c0 + Σ c_k cos(2πk·bin/N)). */
function envelopeOf(cep, nfft) {
  const N = nfft / 2 + 1, env = new Float32Array(N), L = cep.length;
  for (let b = 0; b < N; b++) { let s = cep[0]; const w = (2 * Math.PI * b) / nfft; for (let k = 1; k < L; k++) s += cep[k] * Math.cos(w * k); env[b] = Math.exp(Math.min(40, Math.max(-40, s))); }
  return env;
}

const lerp = (a, b, t) => a + (b - a) * t;

function synth(model, opts = {}) {
  const { sr, nfft, hop } = model, N = nfft / 2 + 1, pitch = opts.pitch || 1, stretch = opts.stretch || 1, breath = opts.breath == null ? 1 : opts.breath, harm = opts.harm == null ? 1 : opts.harm, iters = opts.iters == null ? 18 : opts.iters;
  const rnd = rngOf(opts.seed == null ? 1 : opts.seed), cep = decodeCep(model), n0 = model.n, n = Math.max(2, Math.round(n0 * stretch));
  const at = (arr, x) => { const j = Math.min(n0 - 1, Math.floor(x)), t = x - j, j2 = Math.min(n0 - 1, j + 1); return lerp(arr[j], arr[j2], t); };
  const binHz = sr / nfft, mags = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * (n0 - 1)) / (n - 1), j = Math.min(n0 - 1, Math.floor(x)), t = x - j, j2 = Math.min(n0 - 1, j + 1);
    const c = new Float32Array(model.lift); for (let k = 0; k < model.lift; k++) c[k] = lerp(cep[j][k], cep[j2][k], t);
    const env = envelopeOf(c, nfft), f0 = at(model.f0, x) * pitch, v = at(model.v, x) / 100, lvl = at(model.lvl, x) / 1000;
    const src = new Float32Array(N); const base = (1 - v) * breath * 0.8; for (let b = 0; b < N; b++) src[b] = base;
    if (v > 0.02 && f0 > 20) { const kmax = Math.min(60, Math.floor((sr / 2) / f0));
      for (let k = 1; k <= kmax; k++) { const fc = k * f0, wd = Math.max(3, 0.012 * fc + 1.5), amp = (v * harm * 1.6) / Math.sqrt(k), b0 = Math.max(0, Math.floor((fc - 4 * wd) / binHz)), b1 = Math.min(N - 1, Math.ceil((fc + 4 * wd) / binHz));
        for (let b = b0; b <= b1; b++) { const d = (b * binHz - fc) / wd; src[b] += amp * Math.exp(-0.5 * d * d); } } }
    let e2 = 0; const m = new Float32Array(N); for (let b = 0; b < N; b++) { m[b] = src[b] * env[b]; e2 += m[b] * m[b]; }
    const g = e2 > 0 && Number.isFinite(e2) ? lvl / Math.sqrt(e2) : 0; for (let b = 0; b < N; b++) m[b] = Number.isFinite(m[b]) ? m[b] * g : 0; mags[i] = m;
  }
  /* Griffin-Lim : phases au hasard, puis on alterne synthèse et analyse en gardant le module voulu */
  const win = new Float32Array(nfft); for (let i = 0; i < nfft; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nfft);
  const total = (n - 1) * hop + nfft, re = new Float32Array(nfft), im = new Float32Array(nfft);
  let ph = new Array(n); for (let i = 0; i < n; i++) { const p = new Float32Array(N); for (let b = 0; b < N; b++) p[b] = rnd() * 2 * Math.PI; ph[i] = p; }
  let y = new Float32Array(total);
  const istft = () => { y = new Float32Array(total); const norm = new Float32Array(total);
    for (let i = 0; i < n; i++) { const m = mags[i], p = ph[i]; for (let b = 0; b < N; b++) { re[b] = m[b] * Math.cos(p[b]); im[b] = m[b] * Math.sin(p[b]); } for (let b = N; b < nfft; b++) { re[b] = re[nfft - b]; im[b] = -im[nfft - b]; }
      fft(re, im, true); const o = i * hop; for (let k = 0; k < nfft; k++) { y[o + k] += re[k] * win[k]; norm[o + k] += win[k] * win[k]; } }
    for (let k = 0; k < total; k++) if (norm[k] > 1e-6) y[k] /= norm[k]; };
  const stftPhase = () => { for (let i = 0; i < n; i++) { const o = i * hop; for (let k = 0; k < nfft; k++) { re[k] = y[o + k] * win[k]; im[k] = 0; } fft(re, im, false); const p = ph[i]; for (let b = 0; b < N; b++) p[b] = Math.atan2(im[b], re[b]); } };
  for (let it = 0; it < iters; it++) { istft(); stftPhase(); }
  istft();
  let peak = 1e-9; for (let k = 0; k < total; k++) peak = Math.max(peak, Math.abs(y[k])); const g = 0.8 / peak; for (let k = 0; k < total; k++) y[k] *= g;
  return { samples: y, sr };
}

/** Les variantes selon l'Âge : hauteur, durée, souffle, et quel modèle de préférence. */
function variantFor(age = {}, rnd = Math.random) {
  const j = (k) => 1 + (rnd() * 2 - 1) * k;
  if (age.lava || age.hot) return { model: "riven", pitch: 0.9 * j(0.04), stretch: 1.12 * j(0.05), breath: 0.9 };
  if (age.cold || age.ice || age.dead) return { model: "uru", pitch: 1.08 * j(0.04), stretch: 0.95 * j(0.05), breath: 1.25 };
  if (age.water) return { model: "myst", pitch: 0.96 * j(0.04), stretch: 1.05 * j(0.05), breath: 1.1 };
  if (age.cavern) return { model: "riven", pitch: 0.95 * j(0.04), stretch: 1.0 * j(0.05), breath: 1.0 };
  const pick = rnd(); return { model: pick < 0.6 ? "myst" : pick < 0.85 ? "uru" : "riven", pitch: j(0.05), stretch: j(0.06), breath: j(0.2) };
}

module.exports = { synth, variantFor, fft, envelopeOf, rngOf };
