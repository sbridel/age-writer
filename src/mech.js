"use strict";
/**
 * Mécanismes et énigmes : vannes d'eau, télescopes, serrures sonores, générateurs à vapeur,
 * imagerie holofatidique… Toujours à l'état d'abandon : ces mondes sont silencieux, ils
 * gardent des traces, pas des habitants. Les valeurs des énigmes se lisent en chiffres D'ni.
 */
const { rng, fnv, pick } = require("./util");

const I = {
  steam_powered_elevator: "M30 10V90M70 10V90M30 40H70V70H30Z M50 10V40",
  water_valve: "M50 20V80M20 50H80M50 25A25 25 0 1 0 50.01 25Z",
  telescope: "M15 70L75 30L85 45L25 85Z M45 65L30 95M45 65L65 95",
  sound_lock: "M30 45V35A20 20 0 0 1 70 35V45M25 45H75V85H25Z M50 58V72",
  frequency_array: "M10 50Q20 20 30 50T50 50T70 50T90 50M10 75Q20 55 30 75T50 75T70 75T90 75",
  steam_generator: "M20 40H80V80H20Z M35 40V20H45V40M60 40V25H70V40M20 60H80",
  holofatic_imager: "M50 15L85 35V65L50 85L15 65V35Z M50 15V50L85 65M50 50L15 65",
  orrery: "M42 50A8 8 0 1 0 58 50A8 8 0 1 0 42 50M20 50A30 30 0 1 0 80 50A30 30 0 1 0 20 50M76 50A4 4 0 1 0 84 50A4 4 0 1 0 76 50",
  tide_gate: "M10 70H90M25 30V70M75 30V70M25 30H75M40 45H60V70H40Z",
  wind_organ: "M18 85V45H28V85M38 85V30H48V85M58 85V20H68V85M78 85V35H88V85",
  lens_array: "M50 15Q75 50 50 85Q25 50 50 15Z M50 85V95M15 50H85",
};

const MECHS = {
  steam_powered_elevator: { likes: ["heat", "lava", "steam", "water"], puzzle: "pressure",
    l: { en: "Steam-powered elevator", fr: "Ascenseur à vapeur" },
    d: { en: "A cage on a chain, waiting for pressure that never comes back.", fr: "Une cage au bout d'une chaîne, qui attend une pression qui ne reviendra pas." } },
  water_valve: { likes: ["water", "rain", "brine", "meltwater"], puzzle: "sequence",
    l: { en: "Water valves", fr: "Vannes d'eau" },
    d: { en: "Wheels and sluices, set by a hand that is gone.", fr: "Des vannes et des écluses, réglées par une main qui n'est plus là." } },
  telescope: { likes: ["single_sun", "twin_suns", "starless", "companion_moon", "starfall", "auroras"], puzzle: "angles",
    l: { en: "Telescope", fr: "Télescope" },
    d: { en: "A brass tube aimed at a piece of sky nobody has looked at in years.", fr: "Un tube de laiton pointé vers un morceau de ciel que personne n'a regardé depuis des années." } },
  sound_lock: { likes: ["crystal", "wind", "humming_shard", "strange_stone", "singing_glass"], puzzle: "tones",
    l: { en: "Sound lock", fr: "Serrure sonore" },
    d: { en: "A lock that listens: it opens for the right tones, in the right order.", fr: "Une serrure qui écoute : elle s'ouvre aux bons sons, dans le bon ordre." } },
  frequency_array: { likes: ["crystal", "lightning", "charged_crystal"], puzzle: "tones",
    l: { en: "Frequency array", fr: "Réseau de fréquences" },
    d: { en: "Rows of tuned plates, humming faintly with no one to hear.", fr: "Des rangées de lames accordées, qui bourdonnent sans personne pour les entendre." } },
  steam_generator: { likes: ["heat", "lava", "steam"], puzzle: "pressure",
    l: { en: "Steam generator", fr: "Générateur à vapeur" },
    d: { en: "A boiler gone cold, its gauges stopped mid-sentence.", fr: "Une chaudière refroidie, ses cadrans arrêtés en pleine phrase." } },
  holofatic_imager: { likes: ["crystal", "tablet", "strange_stone", "speaking_tablet"], puzzle: "sequence",
    l: { en: "Holofatic imager", fr: "Imagerie holofatidique" },
    d: { en: "A crystal that keeps a memory of whoever once stood before it.", fr: "Un cristal qui garde le souvenir de qui s'est tenu devant lui." } },
  orrery: { likes: ["twin_suns", "companion_moon", "chaotic_orbit", "shifting_orbit", "recurring_eclipses"], puzzle: "angles",
    l: { en: "Orrery", fr: "Planétaire" },
    d: { en: "A model of the sky, still turning slowly out of habit.", fr: "Un modèle du ciel, qui tourne encore lentement, par habitude." } },
  tide_gate: { likes: ["water", "companion_moon", "brine"], puzzle: "sequence",
    l: { en: "Tide gate", fr: "Écluse de marée" },
    d: { en: "A sluice that lets the water in and out by the moon's own arithmetic.", fr: "Une écluse qui règle l'eau selon l'arithmétique de la lune." } },
  wind_organ: { likes: ["wind", "storm", "great_tree", "dust_storm"], puzzle: "tones",
    l: { en: "Wind organ", fr: "Orgue à vent" },
    d: { en: "Pipes the wind plays, to a tune only the builder knew.", fr: "Des tuyaux que le vent joue, sur un air que seul le bâtisseur connaissait." } },
  lens_array: { likes: ["crystal", "single_sun", "twin_suns", "glass"], puzzle: "angles",
    l: { en: "Lens array", fr: "Réseau de lentilles" },
    d: { en: "Lenses set in a frame, gathering light for no one.", fr: "Des lentilles dans un cadre, qui rassemblent la lumière pour personne." } },
};
for (const id of Object.keys(MECHS)) MECHS[id].icon = I[id];

const STATES = { dormant: { en: "dormant", fr: "au repos" }, rusted: { en: "rusted", fr: "rouillé" }, overgrown: { en: "overgrown", fr: "envahi" }, sealed: { en: "sealed", fr: "scellé" }, cracked: { en: "cracked", fr: "fissuré" } };
const PUZZLE_LABEL = { pressure: { en: "pressure mark", fr: "repère de pression" }, sequence: { en: "order", fr: "ordre" }, angles: { en: "angles", fr: "angles" }, tones: { en: "tones", fr: "sons" } };

const TRACES = [
  { en: "No one lives here. A hearth still holds cold ash.", fr: "Personne n'habite ici. Un âtre garde encore sa cendre froide." },
  { en: "Footprints in the dust, all going the same way, none coming back.", fr: "Des traces dans la poussière, toutes dans le même sens, aucune de retour." },
  { en: "A cup on a ledge, long dry; whoever set it down did not come back for it.", fr: "Une tasse sur un rebord, sèche depuis longtemps ; qui l'a posée n'est pas revenu la chercher." },
  { en: "Names were scratched into the stone, then weathered nearly smooth.", fr: "Des noms ont été gravés dans la pierre, puis presque effacés par le temps." },
  { en: "Everything here was built with care, and then left.", fr: "Tout ici a été bâti avec soin, puis abandonné." },
  { en: "The only sound is the place itself.", fr: "Le seul bruit est celui du lieu lui-même." },
  { en: "Moss has taken the steps; the builders are a rumour.", fr: "La mousse a pris les marches ; les bâtisseurs ne sont plus qu'une rumeur." },
  { en: "A door stands open onto nothing in particular.", fr: "Une porte est ouverte sur rien de particulier." },
];

// `mechanism: water_valve` — aussi « Water Valve », « water-valve », plusieurs séparés par des virgules
const KEY_RE = /^\s*(?:dnie_mechanism|mechanism|puzzle_type|puzzle)\s*:\s*(.+?)\s*$/i;

/** Lit les lignes `mechanism: id` d'un texte de blocs age. */
function parseMechanismLines(text) {
  const ids = [], unknown = [];
  for (const line of String(text).split("\n")) {
    const m = line.match(KEY_RE); if (!m) continue;
    for (const part of m[1].split(",")) {
      const id = part.trim().toLowerCase().replace(/[\s-]+/g, "_"); if (!id) continue;
      if (MECHS[id]) { if (!ids.includes(id)) ids.push(id); } else if (!unknown.includes(id)) unknown.push(id);
    }
  }
  return { ids, unknown };
}

function puzzleFor(id, r) {
  const kind = MECHS[id].puzzle;
  if (kind === "pressure") return { kind, values: [3 + Math.floor(r() * 21)] };
  if (kind === "sequence" || kind === "angles") {
    const v = new Set(); while (v.size < 3) v.add(1 + Math.floor(r() * 24));
    return { kind, values: kind === "sequence" ? [...v] : [...v].sort((a, b) => a - b) };
  }
  const tones = []; for (let i = 0; i < 4; i++) tones.push(Math.floor(r() * 25));
  return { kind, values: tones, hz: tones.map((n) => Math.round(110 * Math.pow(2, n / 12))) };
}

/**
 * @param {Set<string>} world  éléments du monde
 * @param {string} name        nom de l'Âge (graine)
 * @param {string[]} written   mécanismes écrits dans le livre
 * @param {{mode:'off'|'written'|'draw'}} o
 * @returns {{id:string, written:boolean, state:string, puzzle:object}[]}
 */
function resolveMechanisms(world, name, written, o = { mode: "draw" }) {
  if (o.mode === "off") return [];
  const out = [];
  const make = (id, isWritten) => {
    const r = rng(fnv(name + "|" + id));
    return { id, written: isWritten, state: pick(r, Object.keys(STATES)), puzzle: puzzleFor(id, r) };
  };
  for (const id of written) out.push(make(id, true));
  if (o.mode !== "draw") return out;
  const r = rng(fnv(name + "|mechanisms")), roll = r();
  let want = (roll < 0.4 ? 0 : roll < 0.8 ? 1 : 2) - out.length;
  const pool = Object.keys(MECHS).filter((id) => !written.includes(id));
  while (want-- > 0 && pool.length) {
    const ws = pool.map((id) => 1 + 2.5 * MECHS[id].likes.filter((x) => world.has(x)).length), tot = ws.reduce((a, b) => a + b, 0);
    let x = r() * tot, i = 0; while (i < pool.length - 1 && (x -= ws[i]) > 0) i++;
    out.push(make(pool.splice(i, 1)[0], false));
  }
  return out;
}

const label = (id, lang) => (MECHS[id] ? MECHS[id].l[lang] || MECHS[id].l.en : id);
const describe = (id, lang) => (MECHS[id] ? MECHS[id].d[lang] || MECHS[id].d.en : "");
const stateWord = (s, lang) => (STATES[s] ? STATES[s][lang] || STATES[s].en : s);
const puzzleLabel = (k, lang) => (PUZZLE_LABEL[k] ? PUZZLE_LABEL[k][lang] || PUZZLE_LABEL[k].en : k);
const traceFor = (name, lang) => { const t = TRACES[fnv(name + "|trace") % TRACES.length]; return t[lang] || t.en; };

/** Facteur appliqué au poids d'un tirage : favorise ruines et nature, rend les habitants rares. */
function solitudeFactor(level, slot, id) {
  if (level === "off" || !level) return 1;
  const k = level === "strong" ? 1 : 0;
  if (slot === "ruins") return k ? 3.5 : 2.2;
  if (slot === "flora") return k ? 1.6 : 1.3;
  if (slot === "weather") return id === "wind" || id === "fog" ? (k ? 1.6 : 1.4) : (k ? 1.2 : 1.1);
  if (slot === "fauna") return id === "hunter" ? (k ? 0.25 : 0.5) : id === "grazer" ? (k ? 0.5 : 0.8) : 1;
  return 1;
}

/** `fx: static` (ou window_fx / link_fx) dans le bloc age : effet de la fenêtre de liaison pour cet Âge. */
const FX_RE = /^\s*(?:window_fx|link_fx|fx)\s*:\s*([A-Za-z]+)\s*$/i;
const FX_VALUES = ["classic", "static", "ripple", "sweep", "tv", "random", "off"];
function parseFx(src) {
  for (const line of String(src || "").split("\n")) { const m = line.match(FX_RE); if (m && FX_VALUES.includes(m[1].toLowerCase())) return m[1].toLowerCase(); }
  return null;
}

/** `cover: sober` (ou ornate | classic | plain, ou un nombre de 0 = ornée à 1 = nue ; `sobriety:` aussi) : sobriété de la couverture de cet Âge. */
const COVER_LEVELS = { ornate: 0.05, "ornée": 0.05, ornee: 0.05, classic: 0.35, classique: 0.35, sober: 0.7, sobre: 0.7, plain: 1, nue: 1, simple: 1 };
const COVER_RE = /^\s*(?:cover|couverture|cover_style|sobriety|sobri[ée]t[ée])\s*[:=]\s*(ornate|orn[ée]e|classic|classique|sober|sobre|plain|nue|simple|[01](?:\.\d+)?|\.\d+)\s*$/i;
function parseCover(src) {
  for (const line of String(src || "").split("\n")) {
    const m = line.match(COVER_RE); if (!m) continue;
    const v = m[1].toLowerCase(); return v in COVER_LEVELS ? COVER_LEVELS[v] : Math.max(0, Math.min(1, Number(v)));
  }
  return null;
}

/** `trap book` (ou trap_book, trap: true, livre piège) dans le bloc age : cet Âge est un livre-piège. */
// « trap book » seul sur sa ligne, ou avec une valeur ; « trap » / « trapped » seulement avec une valeur (trap: yes),
// pour ne pas transformer un mot isolé en piège par accident
const STYLE_RE = /^\s*(?:window_style|render)\s*[:=]\s*(generative|procedural|gen|classic)\s*$/i;
/** `window_style: generative` (ou `render:`) : « gen » ou « classic », ou null si la ligne manque. */
function parseStyle(src) {
  for (const line of String(src || "").split("\n")) { const m = line.match(STYLE_RE); if (m) return /^classic$/i.test(m[1]) ? "classic" : "gen"; }
  return null;
}
const TRAP_RE = /^\s*(?:(?:trap[ _-]?book|livre[ _-]?pi[eè]ge)\s*(?:[:=]\s*(\S+))?|(?:trap|trapped)\s*[:=]\s*(\S+))\s*$/i;
function parseTrap(src) {
  for (const line of String(src || "").split("\n")) { const m = line.match(TRAP_RE); if (m) return !/^(false|no|non|off|0)$/i.test(m[1] || m[2] || ""); }
  return false;
}

/** `damaged_pages = 2` / `removed_pages: 3` : pages abîmées ou arrachées du livre de liaison (altèrent la liaison). */
const DMG_RE = /^\s*(damage(?:d)?[ _]pages|damage(?:d)?|removed[ _]pages|removed|torn[ _]pages)\s*[:=]\s*(\d+)\s*$/i;
function parseDamage(src) {
  let damaged = 0, removed = 0, any = false;
  for (const line of String(src || "").split("\n")) {
    const m = line.match(DMG_RE); if (!m) continue; any = true;
    const n = Math.min(99, Number(m[2]));
    if (/^(removed|torn)/i.test(m[1])) removed += n; else damaged += n;
  }
  return any ? { damaged, removed } : null;
}
/** Pénalité de liaison (0..0.9) : n'altère pas la stabilité de l'Âge, seulement la fiabilité de la liaison. */
function damagePenalty(d) { return d ? Math.min(0.9, 0.08 * (d.damaged || 0) + 0.15 * (d.removed || 0)) : 0; }
function applyDamage(r, d) { return r && d && (d.damaged || d.removed) ? { ...r, damage: d } : r; }

module.exports = { COVER_RE, COVER_LEVELS, parseCover, STYLE_RE, parseStyle, DMG_RE, parseDamage, applyDamage, damagePenalty, TRAP_RE, parseTrap, FX_RE, FX_VALUES, parseFx, MECHS, STATES, parseMechanismLines, resolveMechanisms, label, describe, stateWord, puzzleLabel, traceFor, solitudeFactor, KEY_RE };
