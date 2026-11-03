"use strict";
/**
 * ESSAI 2.6 : les saisons et la météo du Relto. Modèle pur, sans dessin (le dessin est dans src/relto-render.js).
 * Le Relto vit au rythme du vrai calendrier : la saison est celle du jour réel (hémisphère nord par défaut, réglage `reltoHemisphere`),
 * et le temps qu'il fait se tire par demi-heure, d'après la graine du Relto et la saison : le même instant donne toujours le même ciel.
 * Les pages écrites (pluie, neige, orage, brume) restent : elles s'ajoutent à la météo, jamais l'inverse.
 */
const { fnv, clamp, frac, rng } = require("./util");
const DAY = 86400000, SLOT = 30 * 60000, TAU = Math.PI * 2;

/** La phase de l'année : 0 = cœur de l'hiver (mi-janvier au nord), 0,25 printemps, 0,5 été, 0,75 automne. */
function phaseOf(now, south = false) {
  const d = new Date(now), start = Date.UTC(d.getUTCFullYear(), 0, 1), doy = (now - start) / DAY;
  return frac((doy - 15) / 365.25 + (south ? 0.5 : 0));
}
const wave = (u, c) => clamp(Math.cos(TAU * (u - c)));
const nameOf = (u) => (u < 0.125 || u >= 0.875 ? "winter" : u < 0.375 ? "spring" : u < 0.625 ? "summer" : "autumn");

/** Le temps d'une demi-heure : un état parmi ceux que la saison permet. */
const STATES = ["clear", "cloudy", "overcast", "drizzle", "rain", "fog", "snow", "storm"];
function slotState(seed, slot, u, depth = 0) {
  const r = rng(fnv("relto-wx|" + seed + "|" + slot)), w = wave(u, 0), s = wave(u, 0.5), a = wave(u, 0.75);
  const W8 = { clear: 5 + 2 * s, cloudy: 3, overcast: 1 + 1.5 * a + w, drizzle: 0.6 + 1.2 * a, rain: 0.4 + 0.8 * a + 0.3 * s, fog: 0.4 + 1.2 * a + 0.6 * w, snow: 2.2 * w * w, storm: 0.15 + 0.5 * s };
  /* un temps dure : une demi-heure sur deux reprend la précédente (le ciel ne change pas à chaque coup d'œil) */
  if (depth < 12 && r() < 0.55) return slotState(seed, slot - 1, u, depth + 1);
  const tot = STATES.reduce((t, k) => t + W8[k], 0); let x = r() * tot;
  for (const k of STATES) if ((x -= W8[k]) <= 0) return k;
  return "clear";
}
/** Ce que fait chaque état : nuages en plus, ciel gris, pluie, neige, brume, orage (0..1). */
const LOOK = {
  clear: {}, cloudy: { clouds: 0.5 }, overcast: { clouds: 1, grey: 0.6 }, drizzle: { clouds: 1, grey: 0.5, rain: 0.25 }, rain: { clouds: 1, grey: 0.7, rain: 0.6 },
  fog: { grey: 0.3, fog: 0.8 }, snow: { clouds: 1, grey: 0.5, snow: 0.7 }, storm: { clouds: 1, grey: 0.9, rain: 0.9, storm: 0.7 },
};

/**
 * L'état du Relto à l'instant `now` : la saison et ce qu'elle fait au décor, et le temps qu'il fait (fondu sur 6 minutes d'une demi-heure à l'autre).
 * @returns { season, u, autumn, winter, spring, summer, snowCover, bare, blossom, leaves, petals, wx: { state, clouds, grey, rain, snow, fog, storm } }
 */
function reltoSeason(seed, now, o = {}) {
  const u = phaseOf(now, o.south), slot = Math.floor(now / SLOT), into = (now % SLOT) / SLOT, k = clamp(into / 0.2);
  const cur = slotState(seed, slot, u), prev = slotState(seed, slot - 1, u), mixv = (key) => (LOOK[prev][key] || 0) * (1 - k) + (LOOK[cur][key] || 0) * k;
  const wx = { state: cur, clouds: mixv("clouds"), grey: mixv("grey"), rain: mixv("rain"), snow: mixv("snow"), fog: mixv("fog"), storm: mixv("storm") };
  const winter = wave(u, 0), spring = wave(u, 0.25), summer = wave(u, 0.5), autumn = wave(u, 0.75);
  /* la neige tient au sol en hiver, plus encore s'il neige ; elle fond au printemps */
  const snowCover = clamp(Math.max(0, winter - 0.55) * 2.2 + wx.snow * 0.4);
  return {
    season: nameOf(u), u, winter, spring, summer, autumn, snowCover,
    tint: clamp((autumn - 0.25) * 1.4), /* les feuillus roussissent */
    bare: clamp((winter - 0.6) * 2.5), /* puis se dénudent */
    blossom: clamp((spring - 0.55) * 2.2), /* fleurs aux branches */
    leaves: clamp((autumn - 0.45) * 1.8) * (1 - wx.snow), /* les feuilles qui tombent */
    petals: clamp((spring - 0.7) * 3),
    wx,
  };
}

module.exports = { phaseOf, nameOf, slotState, reltoSeason, STATES, LOOK, SLOT };
