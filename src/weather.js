"use strict";
/**
 * Météo vivante : un bloc de météo écrit avec une fréquence et des moments du jour.
 *
 *   rain                      comme avant : toujours là (rien ne change pour les Âges déjà écrits)
 *   rain: sometimes, dawn     parfois, à l'aube
 *   drizzle: often, dawn, dusk
 *   fog: 1/10                 un moment sur dix, à toute heure
 *   snow: 30%, night
 *
 * Fréquences : always / often / sometimes / rarely (toujours / souvent / parfois / rarement), une fraction `1/10`
 * ou un pourcentage `30%`. Moments : dawn, morning, noon, afternoon, dusk, night (aube, matin, midi, après-midi,
 * crépuscule ou soir, nuit) ; aucun = à toute heure. Les petits mots « at », « in the », « à l' »… sont ignorés.
 *
 * Pour le moteur, la ligne écrit simplement le bloc (`hooks.norm`, src/entry.js) : stabilité, réactions, glyphes et
 * phrases sont ceux de `rain`. Seule la fenêtre générative (src/genscene.js) fait venir et partir la météo.
 *
 * Tirage reproductible : graine de l'Âge (nom de la note + ligne `seed:`) + numéro du jour + moment. Le jour est le
 * jour D'ni (yahr, src/dnitime.js) ; avec `day_length:`, c'est le jour de l'Âge (le même pour tout le monde : il
 * vient de l'horloge). Même Âge, même jour, même moment → même temps qu'il fait, chez tout le monde.
 */
const { rng, fnv, smooth, lerp } = require("./util");
const DT = require("./dnitime");

const FREQ = {
  always: 1, toujours: 1,
  often: 0.7, frequently: 0.7, souvent: 0.7,
  sometimes: 0.4, occasionally: 0.4, parfois: 0.4, quelquefois: 0.4,
  rarely: 0.15, seldom: 0.15, rarement: 0.15,
};
const SLOTS = ["dawn", "morning", "noon", "afternoon", "dusk", "night"];
const SLOT_ALIAS = {
  dawn: "dawn", sunrise: "dawn", daybreak: "dawn", aube: "dawn", aurore: "dawn",
  morning: "morning", matin: "morning", mornings: "morning",
  noon: "noon", midday: "noon", midi: "noon",
  afternoon: "afternoon", "après-midi": "afternoon", "apres-midi": "afternoon",
  dusk: "dusk", evening: "dusk", sunset: "dusk", twilight: "dusk", soir: "dusk", "crépuscule": "dusk", crepuscule: "dusk",
  night: "night", nights: "night", nuit: "night",
};
const FILLER = new Set(["at", "in", "the", "and", "or", "by", "every", "each", "à", "a", "au", "aux", "l", "le", "la", "les", "et", "ou", "de", "du", "en", "chaque"]);

/**
 * Lit la valeur d'une ligne (`sometimes, dawn`). Renvoie `{ freq, slots, unknown }` : slots null = à toute heure ;
 * `unknown` : les mots non compris, ignorés (une ligne en train d'être tapée, `rain: so`, reste de la pluie et pas une tache d'encre).
 * Une seule fréquence : la première ; une fraction impossible (`3/2`, `x/0`) ou un pourcentage au-delà de 100 ne compte pas.
 */
function parseValue(text) {
  const s = String(text == null ? "" : text).toLowerCase().replace(/\s*\/\s*/g, "/").replace(/\s+%/g, "%");
  let freq = null; const slots = [], unknown = [];
  for (let tok of s.split(/[\s,;]+/)) {
    tok = tok.replace(/^[ld]['’]/, "");
    if (!tok || FILLER.has(tok)) continue;
    let f = null, m;
    if (SLOT_ALIAS[tok]) { const sl = SLOT_ALIAS[tok]; if (!slots.includes(sl)) slots.push(sl); continue; }
    if (tok in FREQ) f = FREQ[tok];
    else if ((m = tok.match(/^(\d+)\/(\d+)$/))) { const a = Number(m[1]), b = Number(m[2]); if (b > 0 && a <= b) f = a / b; }
    else if ((m = tok.match(/^(\d+(?:\.\d+)?)%$/))) { const p = Number(m[1]); if (p <= 100) f = p / 100; }
    if (f === null || freq !== null) { unknown.push(tok); continue; }
    freq = f;
  }
  return { freq: freq === null ? 1 : freq, slots: slots.length ? SLOTS.filter((x) => slots.includes(x)) : null, unknown };
}

/** Un bloc que la ligne peut programmer : un bloc écrit à la main, sur l'axe météo (intégré ou de la bibliothèque). */
function isWeatherId(id) {
  const b = require("./engine/registry").blockById.get(id); // chargé à la demande : pas de cycle de modules
  return !!b && !!b.writable && b.axis === "weather";
}

const LINE_RE = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*?)\s*$/;
const RESERVED = new Set(["seed", "link", "return", "panel"]); // clés du moteur : jamais de la météo
/** `rain: sometimes, dawn` → { id: "rain", freq, slots } ; null si ce n'est pas une ligne de météo lisible. */
function parseLine(line) {
  const m = String(line).match(LINE_RE); if (!m) return null;
  const id = m[1].toLowerCase(); if (RESERVED.has(id) || !isWeatherId(id)) return null;
  return { id, ...parseValue(m[2]) };
}
/** Pour le moteur (`hooks.norm`) : la ligne programmée devient l'identifiant du bloc ; toute autre ligne reste telle quelle. */
function normalize(line) { const p = parseLine(line); return p ? p.id : line; }

/**
 * Programme de météo d'un bloc `age` : `{ rain: [{ freq, slots }], … }`, ou null s'il n'y en a pas.
 * Un bloc écrit aussi seul sur sa ligne (`rain`) est toujours là : sa programmation est ignorée. `rain: always` aussi.
 * Plusieurs lignes pour le même bloc s'additionnent (`rain: often, dawn` + `rain: rarely, night`).
 */
function parseWeather(src) {
  const bare = new Set(), out = {};
  for (const raw of String(src || "").split("\n")) {
    const line = raw.trim(); if (!line || line.startsWith("#")) continue;
    if (/^[a-z][a-z0-9_]*$/.test(line)) { bare.add(line); continue; }
    const p = parseLine(line); if (!p) continue;
    if (p.freq >= 1 && !p.slots) { bare.add(p.id); continue; }
    (out[p.id] = out[p.id] || []).push({ freq: p.freq, slots: p.slots });
  }
  for (const id of bare) delete out[id];
  return Object.keys(out).length ? out : null;
}

// ---- tirage ------------------------------------------------------------------------------------------------
/** Le bloc est-il là, ce jour-là, à ce moment-là ? Un dé par (Âge, bloc, jour, moment) : plus fréquent = mêmes jours, et d'autres en plus. */
function activeIn(key, id, rules, day, slot) {
  let roll = -1;
  for (const r of rules) {
    if (r.slots && !r.slots.includes(slot)) continue;
    if (r.freq >= 1) return true;
    if (roll < 0) roll = rng(fnv(`${key}|${id}|${day}|${slot}`))();
    if (roll < r.freq) return true;
  }
  return false;
}
/** Le temps d'un jour entier : `{ rain: ["dawn", "dusk"], … }` (les moments où chaque bloc programmé est là). */
function drawDay(key, sched, day) {
  const out = {};
  for (const [id, rules] of Object.entries(sched || {})) out[id] = SLOTS.filter((s) => activeIn(key, id, rules, day, s));
  return out;
}

/**
 * Les moments sur le trajet du soleil de la fenêtre (src/genscene.js : il se lève à la phase 0 et se couche à 0,7).
 * La phase est décalée de LEAD pour que l'aube entoure le lever : u = phase + LEAD.
 *   aube [0 ; 0,12[ · matin [0,12 ; 0,32[ · midi [0,32 ; 0,5[ · après-midi [0,5 ; 0,68[ · crépuscule [0,68 ; 0,84[ · nuit [0,84 ; 1[
 */
const LEAD = 0.06, BOUNDS = [0, 0.12, 0.32, 0.5, 0.68, 0.84, 1], FADE = 0.04;
function slotOf(phase) { const u = ((phase + LEAD) % 1 + 1) % 1; let i = 0; while (i < 5 && u >= BOUNDS[i + 1]) i++; return SLOTS[i]; }

/**
 * Présence (0 à 1) d'un bloc programmé à la phase `phase` du jour `day`. Fondu d'un moment à l'autre (FADE de chaque côté
 * de la limite) : la météo arrive et s'en va, elle ne se coupe pas. `ageDays` : la phase appartient à des jours qui se
 * suivent (day_length) ; l'aube qui commence avant minuit est celle du lendemain. Sinon (jour en boucle de la fenêtre,
 * jour D'ni) la boucle repasse par les mêmes moments du même jour.
 */
function levelAt(key, id, rules, phase, day, ageDays) {
  const raw = phase + LEAD, u = raw - Math.floor(raw), d0 = ageDays ? day + Math.floor(raw) : day;
  let i = 0; while (i < 5 && u >= BOUNDS[i + 1]) i++;
  const on = (j) => {
    let d = d0, k = j;
    if (k < 0) { k += 6; if (ageDays) d -= 1; } else if (k > 5) { k -= 6; if (ageDays) d += 1; }
    return activeIn(key, id, rules, d, SLOTS[k]) ? 1 : 0;
  };
  const here = on(i), lo = BOUNDS[i], hi = BOUNDS[i + 1];
  if (u - lo < FADE) return lerp(on(i - 1), here, smooth(0.5 + (u - lo) / (2 * FADE)));
  if (hi - u < FADE) return lerp(here, on(i + 1), smooth(0.5 - (hi - u) / (2 * FADE)));
  return here;
}

/** Le numéro du jour pour le tirage : jour de l'Âge si `day_length:` est écrit, sinon jour D'ni. */
function dayOf(sky, now = Date.now()) {
  if (sky && sky.dayLen > 0) return { day: Math.floor(now / (sky.dayLen * 60000)), ageDays: true };
  return { day: DT.dayNumber(now), ageDays: false };
}

/** Graine de l'Âge pour la météo : la même que celle du tirage des pages (nom de la note + ligne `seed:`). */
const seedKey = (name, seedLine) => `${name || ""}#${seedLine || ""}`;

module.exports = { FREQ, SLOTS, SLOT_ALIAS, LEAD, BOUNDS, FADE, parseValue, parseLine, normalize, isWeatherId, parseWeather, activeIn, drawDay, slotOf, levelAt, dayOf, seedKey };
