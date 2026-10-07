"use strict";
/**
 * Couche physique : la FICHE du monde, en français ou en anglais.
 * `sheet(phys, lang)` → { rows: [[section, libellé, valeur]], facts: [phrases], tensions: [{ severity, why, fix[] }] }.
 */
const { REQUIREMENTS, ASSERTIONS, GLOBAL, HINTS } = require("./rules");
const { HEAT, WATER_TRIPLE_BAR, FIELD_SHIELD } = require("./model");

/** Nombre lisible : 2 chiffres utiles sous 10, 1 sous 100, 0 au-delà ; virgule en français. */
function fmt(lang) {
  return (x, digits) => {
    if (x == null || Number.isNaN(x)) return "—";
    if (!isFinite(x)) return "∞";
    const a = Math.abs(x);
    const d = digits != null ? digits : a >= 100 ? 0 : a >= 10 ? 1 : a >= 0.1 || a === 0 ? 2 : 3;
    let s = a >= 1e5 ? x.toExponential(1) : digits == null && a > 0 && a < 0.01 ? String(Number(x.toPrecision(2))) : x.toFixed(d);
    if (a < 1e5 && a >= 1000) s = Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === "fr" ? " " : ",");
    return lang === "fr" ? s.replace(".", ",") : s;
  };
}

/** Nombre à écrire dans un bloc (piste) : sans séparateur de milliers ni exposant, que parsePhysics relit. */
function plain(lang) {
  return (v) => { const t = Number(v.toPrecision(2)); const s = t >= 100 ? String(Math.round(t)) : String(t); return lang === "fr" ? s.replace(".", ",") : s; };
}

const L = {
  fr: {
    star: "Étoile", stars: "Étoiles", none: "aucune", orbit: "Orbite", planet: "Planète", interior: "Intérieur", air: "Atmosphère", water: "Eau", life: "Vivant",
    starV: (w, f) => (w.stars === 0 ? "aucune : seule la chaleur du sol" : w.starMasses.map((m, i) => `${f(m)} M☉ (${f(w.starTemps[i], 0)} K)`).join(" + ") + ` · lumière ${f(w.L)} L☉ · vit ${f(w.starLife)} Ga`),
    orbitV: (w, f) => (w.stars === 0 ? "errante, sans étoile" : `${f(w.a)} UA · flux reçu ${f(w.S)} × Terre · année de ${f(w.periodDays, 0)} jours`),
    spinV: (w, f) => (w.locked ? `face fixe (jour = ${f(w.rotation / 24)} jours terrestres)` : `jour de ${f(w.rotation)} h`),
    planetV: (w, f) => `${f(w.M)} M⊕ · rayon ${f(w.R)} · gravité ${f(w.g)} g · densité ${f(w.rho * 5.51)} g/cm³ · ${f(w.age)} Ga`,
    interiorV: (w, f) => `chaleur ${f(w.heat)} × Terre${w.tidal > 0.05 ? ` (dont marée ${f(w.tidal)})` : ""} · ${w.volcanism ? "volcans actifs" : "volcans éteints"} · ${w.tectonics ? "plaques en mouvement" : "croûte figée"} · noyau ${w.liquidCore ? "liquide" : "figé"} · champ magnétique ${w.field > FIELD_SHIELD ? f(w.field) + " × Terre" : w.field > 0 ? "faible" : "aucun"}`,
    airV: (w, f) => (w.P < 0.001 ? "presque vide" : `${f(w.P)} bar · retenue à ${f(w.keep * 100, 0)} % · ${f(w.Teq, 0)} K sans effet de serre → ${f(w.Ts, 0)} K en surface (${f(w.Ts - 273.15, 0)} °C)`),
    waterV: (w, f) => ({ none: "aucune en surface", ice: "glace", vapor: "vapeur", liquid: `liquide (bout à ${f(w.boil, 0)} K)` }[w.water]),
    lifeV: (w, f) => `lumière au sol ${f(w.light)} × Terre`,
  },
  en: {
    star: "Star", stars: "Stars", none: "none", orbit: "Orbit", planet: "Planet", interior: "Interior", air: "Atmosphere", water: "Water", life: "Life",
    starV: (w, f) => (w.stars === 0 ? "none: only the ground's own heat" : w.starMasses.map((m, i) => `${f(m)} M☉ (${f(w.starTemps[i], 0)} K)`).join(" + ") + ` · light ${f(w.L)} L☉ · lives ${f(w.starLife)} Gyr`),
    orbitV: (w, f) => (w.stars === 0 ? "rogue, starless" : `${f(w.a)} AU · receives ${f(w.S)} × Earth · ${f(w.periodDays, 0)}-day year`),
    spinV: (w, f) => (w.locked ? `one face fixed (day = ${f(w.rotation / 24)} Earth days)` : `${f(w.rotation)} h day`),
    planetV: (w, f) => `${f(w.M)} M⊕ · radius ${f(w.R)} · gravity ${f(w.g)} g · density ${f(w.rho * 5.51)} g/cm³ · ${f(w.age)} Gyr`,
    interiorV: (w, f) => `heat ${f(w.heat)} × Earth${w.tidal > 0.05 ? ` (tides ${f(w.tidal)})` : ""} · ${w.volcanism ? "active volcanoes" : "dead volcanoes"} · ${w.tectonics ? "moving plates" : "stagnant lid"} · core ${w.liquidCore ? "liquid" : "frozen"} · magnetic field ${w.field > FIELD_SHIELD ? f(w.field) + " × Earth" : w.field > 0 ? "weak" : "none"}`,
    airV: (w, f) => (w.P < 0.001 ? "almost none" : `${f(w.P)} bar · ${f(w.keep * 100, 0)} % retained · ${f(w.Teq, 0)} K without greenhouse → ${f(w.Ts, 0)} K at the surface (${f(w.Ts - 273.15, 0)} °C)`),
    waterV: (w, f) => ({ none: "none at the surface", ice: "ice", vapor: "vapour", liquid: `liquid (boils at ${f(w.boil, 0)} K)` }[w.water]),
    lifeV: (w, f) => `light at ground level ${f(w.light)} × Earth`,
  },
};

/** Chaîne de causes, en phrases courtes : ce qui explique le monde. */
function facts(w, lang, f) {
  const fr = lang === "fr", out = [];
  const push = (a, b) => out.push(fr ? a : b);
  if (w.stars > 0 && w.starLife < 1 && w.age <= w.starLife) push(`Une étoile si ardente ne vit que ${f(w.starLife * 1000)} millions d'années : ce monde est forcément jeune.`, `So fierce a star lives only ${f(w.starLife * 1000)} million years: this world must be young.`);
  if (w.locked && !w.giantHost) {
    const day = w.Ts * (1 + 0.3 / (1 + w.P)), night = w.Ts * (1 - 0.45 / (1 + w.P)); // un air épais transporte la chaleur vers la nuit
    push(`La marée de l'étoile a figé sa rotation : la face de jour monte vers ${f(day - 273.15, 0)} °C, la face de nuit descend vers ${f(night - 273.15, 0)} °C, et la vie tient la bande du crépuscule.`,
      `The star's tide has frozen its spin: the day side climbs toward ${f(day - 273.15, 0)} °C, the night side sinks toward ${f(night - 273.15, 0)} °C, and life holds the twilight band.`);
  }
  if (w.giantHost) push("Ce monde est la lune d'une géante annelée : elle emplit son ciel et le pétrit par ses marées.", "This world is the moon of a ringed giant: it fills the sky and kneads it with tides.");
  if (w.liquidCore && w.field > FIELD_SHIELD) {
    if (w.stars > 0) push(`Noyau liquide et rotation de ${f(w.rotation, 0)} h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.`, `Liquid core and a ${f(w.rotation, 0)} h spin: a dynamo, hence a magnetic field turning aside the stellar wind.`);
    else push(`Noyau liquide et rotation de ${f(w.rotation, 0)} h : un champ magnétique, que nul vent d'étoile ne vient éprouver.`, `Liquid core and a ${f(w.rotation, 0)} h spin: a magnetic field that no stellar wind ever tests.`);
  }
  else if (w.liquidCore) push("Le noyau est liquide, mais il tourne trop lentement : la dynamo reste faible, sans vrai bouclier magnétique.", "The core is liquid but turns too slowly: the dynamo stays weak, with no real magnetic shield.");
  else push("Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.", "The core has frozen: no dynamo, no magnetic shield.");
  if (w.keep < 0.3 && w.stars > 0) {
    if (w.g < 0.7) push("Faible gravité et vent d'étoile : l'air fuit dans l'espace.", "Low gravity and stellar wind: the air leaks into space.");
    else push("Une haute atmosphère trop chaude et sans bouclier : le vent de l'étoile l'arrache peu à peu.", "An upper atmosphere too hot and unshielded: the stellar wind strips it away little by little.");
  }
  if (w.airFrozen) push("Si froid que l'air lui-même gèle et tombe en neige.", "So cold that the air itself freezes and falls as snow.");
  if (w.stars > 0 && w.S > 1.1 && w.Ts > 300) push("Plus près de l'étoile que le bord intérieur de la zone habitable : l'eau y lutte contre l'évaporation.", "Inside the inner edge of the habitable zone: water struggles against evaporation.");
  if (w.stars > 0 && w.S < 0.36 && w.S > 0.05 && w.Ts < 273) push("Au-delà du bord extérieur de la zone habitable : seule une serre épaisse garde l'eau liquide.", "Beyond the outer edge of the habitable zone: only a thick greenhouse keeps water liquid.");
  if (w.volcanism && w.water !== "liquid" && w.P > 10) push("Pas d'océan pour enfouir le gaz carbonique des volcans : il s'accumule, et la serre s'emballe.", "No ocean to bury the volcanoes' carbon dioxide: it piles up and the greenhouse runs away.");
  if (w.Ts - w.Teq > 5) push(`L'effet de serre ajoute ${f(w.Ts - w.Teq, 0)} K.`, `The greenhouse adds ${f(w.Ts - w.Teq, 0)} K.`);
  if (w.water === "ice" && w.P < WATER_TRIPLE_BAR && w.Ts > 150) push("Si peu d'air que la glace passe directement en vapeur : l'eau ne coule jamais.", "So little air that ice turns straight to vapour: water never flows.");
  if (w.heat >= HEAT.magmaOcean) {
    if (w.water === "liquid" || w.Ts < 600) push("Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.", "A searing interior: volcanoes everywhere, frequent quakes, young ground always on the move.");
    else push("Assez de chaleur pour un océan de magma sous une croûte mince.", "Enough heat for a magma ocean beneath a thin crust.");
  }
  if (w.stars === 0 && w.water === "ice" && w.heat >= 0.3) push("Sous la glace, la chaleur du sol peut garder un océan caché.", "Beneath the ice, the ground's heat may keep a hidden ocean.");
  if (w.g > 1.5) push(`Sous ${f(w.g)} g, les montagnes restent basses et les êtres trapus.`, `Under ${f(w.g)} g, mountains stay low and creatures squat.`);
  if (w.g < 0.5) push(`Sous ${f(w.g)} g, les montagnes s'élèvent haut et les pas sont longs.`, `Under ${f(w.g)} g, mountains rise tall and strides are long.`);
  return out;
}

function sheet(phys, lang = "fr") {
  const t = L[lang] || L.fr, f = fmt(lang), w = phys.w, num = plain(lang);
  const rows = [
    [w.stars > 1 ? t.stars : t.star, t.starV(w, f)],
    [t.orbit, t.orbitV(w, f) + " · " + t.spinV(w, f)],
    [t.planet, t.planetV(w, f)],
    [t.interior, t.interiorV(w, f)],
    [t.air, t.airV(w, f)],
    [t.water, t.waterV(w, f)],
    [t.life, t.lifeV(w, f)],
  ];
  const tensions = phys.tensions.map((x) => {
    const req = REQUIREMENTS[x.id] || ASSERTIONS[x.id] || GLOBAL[x.id];
    const why = req.why[lang] ? req.why[lang](w, f) : req.why.fr(w, f);
    const hinted = (x.hints || []).map((h) => `${(HINTS[h.key][h.dir][lang] || HINTS[h.key][h.dir].fr)} (${h.key}: ${num(h.value)})`);
    const fix = [...hinted, ...(req.fix ? req.fix(w, f) : []).map((o) => o[lang] || o.fr)];
    return { id: x.id, ids: x.ids, severity: x.severity, axis: x.axis, law: x.law, why, fix };
  });
  const notes = (phys.clamped || []).map((c) => (lang === "fr" ? `Valeur ramenée dans la plage du modèle : ${c.key} ${num(c.from)} → ${num(c.to)}.` : `Value brought into the model's range: ${c.key} ${num(c.from)} → ${num(c.to)}.`));
  return { rows, facts: [...notes, ...facts(w, lang, f)], tensions };
}

module.exports = { fmt, plain, sheet, facts };
