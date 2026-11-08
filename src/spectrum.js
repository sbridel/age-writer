"use strict";
/**
 * 2.10 : le spectroscope du télescope (claude/DESIGN-pistes-8-nov.md, § 33). Module pur.
 * La tranche de cristal glissée sur l'oculaire décompose la lumière de l'étoile de l'Âge sur le lutrin : la pente dit la chaleur,
 * les creux disent ce qu'elle contient, et la lecture, en mots, dit ce que cela veut dire. Un soleil dont la couleur est écrite
 * (l'Art) montre la lumière entière d'une étoile ordinaire : « ce vert est écrit ».
 *
 * starOf(w, tensions) : ce que le spectroscope a besoin de savoir d'un monde (physique résolue).
 * spectrumOf(star, n)  : n valeurs de 0 à 1, de 380 à 740 nm.
 * readingOf(star)       : { heat, holds, means } : trois clés de texte (src/i18n.js, « spec.* »), `means` peut manquer.
 */
const T_SUN = 5772;
const DEBRIS = ["asteroid_belt", "asteroid_field", "planet_rings"];

/** Ce que l'on sait de l'étoile d'un Âge : d'après la physique résolue `w` et ses tensions. */
function starOf(w, tensions = [], ids = []) {
  if (!w || !(w.stars > 0)) return null;
  const hues = w.hues || [], hue = hues[0] || null, has = (id) => tensions.some((x) => x && x.id === id);
  return {
    T: Number.isFinite(w.starTemp) && w.starTemp > 0 ? w.starTemp : T_SUN, T2: w.starTemps && Number.isFinite(w.starTemps[1]) ? w.starTemps[1] : null,
    suns: w.stars || 1, hue, blackSun: !!w.blackSun, whiteDwarf: !!w.whiteDwarf, kind: w.wdKind || null, debris: !!w.debris || DEBRIS.some((id) => ids.includes(id)),
    uv: Number.isFinite(w.uv) ? w.uv : 1, life: Number.isFinite(w.starLife) ? w.starLife : Infinity,
    art: !!hue && (has("realStar") || has("deadStarColour") || (!w.whiteDwarf && (hue === "green_sun" || hue === "violet_sun"))), /* la couleur est écrite, pas née */
  };
}

/** La courbe de Planck (relative) à la longueur d'onde l (nm) pour T (K). */
function planck(l, T) { const x = l * 1e-9, h = 6.626e-34, c = 3e8, k = 1.381e-23; return (2 * h * c * c) / Math.pow(x, 5) / (Math.exp((h * c) / (x * k * T)) - 1); }
const dip = (l, c0, w, d) => 1 - d * Math.exp(-((l - c0) * (l - c0)) / (2 * w * w));

/** Ce que l'étoile absorbe : les raies et les bandes, selon ce qu'elle est. */
function absorb(star, l) {
  const T = star.T, wd = star.whiteDwarf, k = star.kind;
  if (star.blackSun) return 0.35 + 0.65 * Math.max(0, (l - 600) / 140); /* la naine brune : presque rien dans le visible, tout dans le rouge sombre */
  if (wd && k === "salt") return dip(l, 589, 45, 0.95) * dip(l, 671, 4, 0.7) * (l < 430 ? 0.05 : l < 460 ? 0.05 + (0.95 * (l - 430)) / 30 : 1); /* le sel lui prend le jaune ; le lithium, un trait fin ; le calcium, tout le violet */
  if (wd && k === "brine") return dip(l, 589, 80, 0.98) * (l < 430 ? 0.05 : l < 460 ? 0.05 + (0.95 * (l - 430)) / 30 : 1); /* le sel à l'extrême : il ne reste que le bleu */
  if (wd && k === "carbon") { let a = 1; for (const [c0, w, d] of [[438, 10, 0.6], [473, 12, 0.75], [516, 14, 0.8], [563, 16, 0.7], [619, 18, 0.45]]) a *= 1 - d * Math.exp(-((l - c0) * (l - c0)) / (2 * w * w)) * (l < c0 ? 0.3 : 1) * (1 - Math.min(1, Math.max(0, (l - c0) / (w * 3)))); return a; } /* les bandes du carbone, en dents de scie */
  if (wd) { const wide = T > 12000 ? 14 : 8; return dip(l, 656, wide, 0.55) * dip(l, 486, wide, 0.6) * dip(l, 434, wide * 0.9, 0.6) * dip(l, 410, wide * 0.8, 0.5); } /* l'hydrogène, très élargi : l'air y est écrasé */
  if (T < 4000) return dip(l, 620, 25, 0.35) * dip(l, 705, 20, 0.4) * dip(l, 520, 18, 0.25) * dip(l, 589, 2, 0.5); /* une étoile froide : des bandes molles d'oxyde */
  if (T > 9000) return dip(l, 656, 4, 0.5) * dip(l, 486, 4, 0.55) * dip(l, 434, 4, 0.55) * dip(l, 410, 4, 0.5) * dip(l, 397, 3, 0.4); /* une étoile chaude : l'hydrogène seul, par grandes raies */
  return dip(l, 656, 2.5, 0.6) * dip(l, 486, 2, 0.5) * dip(l, 434, 2, 0.4) * dip(l, 589, 1.5, 0.5) * dip(l, 527, 1.5, 0.3) * dip(l, 397, 2, 0.45) * dip(l, 393, 2, 0.5); /* un soleil : l'hydrogène, le sodium, le magnésium, le calcium, en raies fines */
}

/** n valeurs (0 à 1) de 380 à 740 nm : la lumière de l'étoile après ce qu'elle absorbe. Deux soleils : leurs lumières s'ajoutent. */
function spectrumOf(star, n = 180) {
  if (!star) return [];
  const out = []; let max = 0;
  for (let i = 0; i < n; i++) {
    const l = 380 + (360 * i) / (n - 1); let v = planck(l, star.T) * absorb(star, l);
    if (star.suns > 1 && star.T2) v += 0.6 * planck(l, star.T2) * absorb({ ...star, T: star.T2, whiteDwarf: false, kind: null }, l) * (planck(560, star.T) / planck(560, star.T2));
    out.push(v); if (v > max) max = v;
  }
  return out.map((v) => (max > 0 ? v / max : 0));
}

/** La lecture, en trois temps : la chaleur, ce qu'elle contient, ce que cela veut dire (clés « spec.* »). */
function readingOf(star) {
  if (!star) return null;
  const T = star.T, wd = star.whiteDwarf;
  const heat = star.blackSun ? "spec.heat.black" : T < 4000 ? "spec.heat.cold" : T < 5000 ? "spec.heat.cool" : T < 7000 ? "spec.heat.warm" : T < 12000 ? "spec.heat.hot" : "spec.heat.burning";
  let holds = star.blackSun ? "spec.holds.black" : wd ? (star.kind === "salt" ? "spec.holds.salt" : star.kind === "brine" ? "spec.holds.brine" : star.kind === "carbon" ? "spec.holds.carbon" : star.kind === "young" ? "spec.holds.young" : star.kind === "old" ? "spec.holds.old" : "spec.holds.dwarf") : T < 4000 ? "spec.holds.molecules" : T > 9000 ? "spec.holds.hydrogen" : "spec.holds.sun";
  let means = null;
  if (star.art) means = star.hue === "violet_sun" ? "spec.means.art.violet" : star.hue === "green_sun" ? "spec.means.art.green" : "spec.means.art";
  else if (star.uv > 2) means = "spec.means.uv";
  else if (Number.isFinite(star.life) && star.life < 1) means = "spec.means.short";
  else if (wd && star.debris) means = "spec.means.reborn";
  else if (star.suns > 1) means = "spec.means.twin";
  return { heat, holds, means };
}

module.exports = { starOf, spectrumOf, readingOf, planck };
