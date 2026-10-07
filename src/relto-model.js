"use strict";
/**
 * Relto : un Âge-refuge évolutif. Modèle de données (pur, sans DOM) :
 *  - le livre du Relto (frontmatter d'une note, age_type: personal_hub) ;
 *  - des « pages » (notes avec relto_page_id) qui, une fois actives, ajoutent des
 *    éléments au paysage et une ambiance sonore ;
 *  - les Âges du coffre, qui deviennent les livres de l'étagère.
 */
const { clamp, lerp, rng, fnv } = require("./util");

const TERRAINS = ["volcanic_plateau", "mossy_plateau", "sand_island", "glacier", "obsidian_plateau"];
const SURROUNDINGS = ["cloud_sea", "fog_sea", "ocean", "void", "lava_sea"];
const SKY_CYCLES = ["system_time", "frozen_dawn", "frozen_day", "frozen_dusk", "frozen_night"];
const STRUCTURES = ["hut", "bookshelves", "linking_pillars"];
const EFFECT_TYPES = ["vegetation", "waterfall", "fireflies", "lanterns", "snow", "aurora", "mist", "fireworks", "mountain", "pillars", "chimney", "gems", "gold", "silver", "koi", "cat", "rain", "storm", "birds", "butterflies", "moons", "dock", "bench", "islets", "calendar", "flowers", "grass"];
/** Options propres à certains effets (texte court) : couleur et nom du chat, variété du koï rare. */
const optsOf = (a) => { const o = {}; for (const k of ["color", "name", "rare"]) if (a && a[k] != null && String(a[k]).trim()) o[k] = String(a[k]).trim().slice(0, 40); return o; };
const ASSETS = { vegetation: ["conifer", "birch", "palm", "fern", "ponderosa", "maple", "crystal"], flowers: ["blue", "red", "yellow", "white", "pink"] };

/**
 * Répartit les plantes de l'île entre les pages de végétation. Les arbres (tout sauf les fougères) sont limités à `cap` au total :
 * quand plusieurs essences sont choisies, elles se partagent la place (au prorata de leur densité) et s'intercalent au lieu de se superposer.
 * @param {{type:string,asset?:string,density:number,pageId?:string}[]} additions
 * @param {number} seed
 * @param {(x:number)=>boolean} blocked  vrai si la position est interdite (cabane, étagère, piliers, chat, bassin, livres)
 * @returns {{x:number,row:number,h:number,sw:number,kind:string,page?:string}[]} triés par rangée puis abscisse
 */
const TALL_H = { ponderosa: [62, 18], maple: [44, 16], crystal: [46, 16] };
function placePlants(additions, seed, blocked, cap = 14) {
  const veg = additions.filter((a) => a.type === "vegetation"), kindOf = (a) => a.asset || "conifer";
  const trees = veg.filter((a) => kindOf(a) !== "fern"), ferns = veg.filter((a) => kindOf(a) === "fern"), out = [];
  // arbres : budget total, partagé au prorata
  const raw = trees.map((a) => Math.round(4 + a.density * 14)), sum = raw.reduce((s, v) => s + v, 0), scale = sum > cap ? cap / sum : 1;
  const counts = raw.map((v) => Math.max(1, Math.round(v * scale)));
  while (counts.reduce((s, v) => s + v, 0) > cap && counts.some((v) => v > 1)) counts[counts.indexOf(Math.max(...counts))]--;
  const pr = rng((seed ^ 0x7ee5) >>> 0), kinds = [];
  trees.forEach((a, i) => { for (let k = 0; k < counts[i]; k++) kinds.push({ a, i }); });
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(pr() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; } // mélange : les essences s'intercalent
  const slots = []; for (let x = 178; x <= 466; x += 3) if (!blocked(x)) slots.push(x);
  const N = Math.min(kinds.length, slots.length);
  for (let i = 0; i < N; i++) {
    const span = slots.length / N, idx = clamp(Math.floor((i + 0.5) * span + (pr() - 0.5) * span * 0.5), 0, slots.length - 1), kd = kinds[i], kind = kindOf(kd.a), hr = TALL_H[kind] || [40, 18];
    out.push({ x: slots[idx], row: 0, h: hr[0] + pr() * hr[1], sw: pr() * 6.28, kind, page: kd.a.pageId });
  }
  // fougères : basses, devant ou derrière
  for (const a of ferns) {
    const fr = rng(seed ^ fnv(a.pageId || "fern")), n = Math.round(4 + a.density * 14);
    for (let k = 0, guard = 0; k < n && guard++ < 200;) { const x = 184 + fr() * 272; if (blocked(x)) continue; out.push({ x, row: fr() < 0.5 ? 0 : 1, h: 12 + fr() * 8, sw: fr() * 6.28, kind: "fern", page: a.pageId }); k++; }
  }
  return out.sort((p, q) => p.row - q.row || p.x - q.x);
}

/** Pages proposées à la création (id -> modèle). */
const PAGE_PRESETS = {
  page_pine_trees: { label: "Pine trees", effects: { canvas_additions: [{ type: "vegetation", density: 0.7, asset: "conifer" }], ambiance_audio: "wind_in_pines" } },
  page_birches: { label: "Birches", effects: { canvas_additions: [{ type: "vegetation", density: 0.55, asset: "birch" }], ambiance_audio: "wind" } },
  page_palms: { label: "Palms", effects: { canvas_additions: [{ type: "vegetation", density: 0.5, asset: "palm" }], ambiance_audio: "wind" } },
  page_ferns: { label: "Ferns", effects: { canvas_additions: [{ type: "vegetation", density: 0.8, asset: "fern" }], ambiance_audio: "soft_rain" } },
  page_waterfall: { label: "Waterfall", effects: { canvas_additions: [{ type: "waterfall" }], ambiance_audio: "waterfall" } },
  page_fireflies: { label: "Fireflies", effects: { canvas_additions: [{ type: "fireflies", density: 0.7 }], ambiance_audio: "night_crickets" } },
  page_lanterns: { label: "Lanterns", effects: { canvas_additions: [{ type: "lanterns", density: 0.6 }], ambiance_audio: "fire_crackle" } },
  page_snow: { label: "Snowfall", effects: { canvas_additions: [{ type: "snow", density: 0.6 }], ambiance_audio: "wind" } },
  page_aurora: { label: "Aurora", effects: { canvas_additions: [{ type: "aurora" }], ambiance_audio: "deep_hum" } },
  page_fireworks: { label: "Fireworks", effects: { canvas_additions: [{ type: "fireworks", density: 0.6 }], ambiance_audio: "fireworks" } },
  page_mountain: { label: "Mountains", effects: { canvas_additions: [{ type: "mountain", density: 0.7 }], ambiance_audio: "mountain_air" } },
  page_pillars: { label: "Standing pillars", effects: { canvas_additions: [{ type: "pillars", density: 0.6 }], ambiance_audio: "stone_choir" } },
  page_chimney: { label: "Chimney fire", effects: { canvas_additions: [{ type: "chimney", density: 0.7 }], ambiance_audio: "hearth" } },
  page_gems: { label: "Gemstones", effects: { canvas_additions: [{ type: "gems", density: 0.6 }], ambiance_audio: "deep_hum" } },
  page_gold: { label: "Gold", effects: { canvas_additions: [{ type: "gold", density: 0.6 }], ambiance_audio: "stone_choir" } },
  page_silver: { label: "Silver", effects: { canvas_additions: [{ type: "silver", density: 0.6 }], ambiance_audio: "deep_hum" } },
  page_koi: { label: "Koi pond", effects: { canvas_additions: [{ type: "koi", density: 0.5, rare: "ogon" }], ambiance_audio: "river" } },
  page_cat: { label: "Cat", effects: { canvas_additions: [{ type: "cat", color: "orange", name: "Mochi" }], ambiance_audio: "hearth" } },
  page_rain: { label: "Rain", effects: { canvas_additions: [{ type: "rain", density: 0.6 }], ambiance_audio: "soft_rain" } },
  page_storm: { label: "Storm", effects: { canvas_additions: [{ type: "storm", density: 0.7 }], ambiance_audio: "thunder" } },
  page_birds: { label: "Birds", effects: { canvas_additions: [{ type: "birds", density: 0.5 }], ambiance_audio: "wind" } },
  page_butterflies: { label: "Butterflies", effects: { canvas_additions: [{ type: "butterflies", density: 0.6 }], ambiance_audio: "wind" } },
  page_moons: { label: "Moon & sun", effects: { canvas_additions: [{ type: "moons" }], ambiance_audio: "deep_hum" } },
  page_dock: { label: "Dock", effects: { canvas_additions: [{ type: "dock" }], ambiance_audio: "river" } },
  page_bench: { label: "Bench", effects: { canvas_additions: [{ type: "bench" }], ambiance_audio: "wind" } },
  page_islets: { label: "Islets", effects: { canvas_additions: [{ type: "islets", density: 0.6 }], ambiance_audio: "mountain_air" } },
  page_calendar: { label: "Calendar pinnacle", effects: { canvas_additions: [{ type: "calendar" }], ambiance_audio: "stone_choir" } },
  page_flowers: { label: "Blue flowers", effects: { canvas_additions: [{ type: "flowers", density: 0.6, asset: "blue" }], ambiance_audio: "wind" } },
  page_grass: { label: "Grass", effects: { canvas_additions: [{ type: "grass", density: 0.6 }], ambiance_audio: "wind" } },
  page_ponderosa: { label: "Ponderosa pines", effects: { canvas_additions: [{ type: "vegetation", density: 0.4, asset: "ponderosa" }], ambiance_audio: "wind_in_pines" } },
  page_maples: { label: "Maples", effects: { canvas_additions: [{ type: "vegetation", density: 0.5, asset: "maple" }], ambiance_audio: "wind" } },
  page_crystal_tree: { label: "Crystal tree", effects: { canvas_additions: [{ type: "vegetation", density: 0.2, asset: "crystal" }], ambiance_audio: "deep_hum" } },
  page_mist: { label: "Mist", effects: { canvas_additions: [{ type: "mist", density: 0.6 }], ambiance_audio: "wind" } },
};

const stripLink = (v) => {
  if (v == null) return "";
  return String(v).trim().replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0].split("#")[0].trim();
};
const asList = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

function parseRelto(fm = {}) {
  const env = fm.environment || {};
  const pick = (v, list, def) => (list.includes(v) ? v : def);
  const seedRaw = fm.seed;
  const seed = Number.isFinite(Number(seedRaw)) && seedRaw !== "" && seedRaw != null ? Math.abs(Math.floor(Number(seedRaw))) : 19991118;
  return {
    name: fm.age_name || "Relto",
    seed,
    stability: clamp(Number(fm.stability ?? 100), 0, 100),
    terrain: pick(env.base_terrain, TERRAINS, "volcanic_plateau"),
    surrounding: pick(env.surrounding, SURROUNDINGS, "cloud_sea"),
    skyCycle: pick(env.sky_cycle, SKY_CYCLES, "system_time"),
    structures: asList(fm.structures).filter((s) => STRUCTURES.includes(s)),
    unknownStructures: asList(fm.structures).filter((s) => !STRUCTURES.includes(s)),
    pagesActive: asList(fm.relto_pages_active).map(stripLink),
  };
}

function parsePage(fm = {}, path = "") {
  if (!fm.relto_page_id) return null;
  const eff = fm.effects || {};
  const adds = asList(eff.canvas_additions).map((a) => ({
    type: String(a && a.type || ""),
    density: clamp(Number(a && a.density != null ? a.density : 0.5), 0, 1),
    asset: a && a.asset ? String(a.asset) : undefined,
    ...optsOf({ ...a, ...(a && a.type === "cat" ? { color: fm.cat_color ?? (a && a.color), name: fm.cat_name ?? (a && a.name) } : {}), ...(a && a.type === "koi" ? { rare: fm.koi_rare ?? (a && a.rare), name: fm.koi_name ?? (a && a.name) } : {}) }),
  })).filter((a) => EFFECT_TYPES.includes(a.type));
  const audio = eff.ambiance_audio == null ? [] : asList(eff.ambiance_audio).map(String);
  const un = fm.unlock || null;
  return {
    id: String(fm.relto_page_id),
    path,
    target: fm.target_age ? String(fm.target_age) : "Relto",
    enabled: fm.enabled !== false,
    additions: adds,
    audio,
    unknown: asList(eff.canvas_additions).filter((a) => !a || !EFFECT_TYPES.includes(String(a.type))).length,
    unlock: un ? {
      age: un.age ? stripLink(un.age) : null,
      minStability: Number(un.min_stability ?? 40),
      agesCount: un.ages_count != null ? Number(un.ages_count) : null,
    } : null,
  };
}

/**
 * Bibliothèque de pages : un bloc `relto-library`, une page par ligne.
 *   page id: Étiquette | effet densité [asset], effet … | audio=preset,preset | unlock=Âge:60
 * @returns {{pages:{id:string,label:string,effects:object,unlock:object|null}[], problems:{line:number,text:string,message:string}[]}}
 */
function parseReltoLibrary(text) {
  const pages = [], problems = [];
  String(text).split("\n").forEach((raw, i) => {
    const l = raw.trim(); if (!l || l.startsWith("#")) return;
    const m = l.match(/^page[\s_]+([a-z][a-z0-9_]*)\s*:\s*(.+)$/i);
    if (!m) { problems.push({ line: i + 1, text: l, message: "expected:  page id: Label | effect 0.5, effect asset | audio=preset | unlock=Age:60" }); return; }
    // découpe sur « | » mais pas à l'intérieur d'un lien [[Nom|alias]]
    const parts = m[2].split(/\|(?![^[]*\]\])/).map((x) => x.trim()), eff = []; let audio = [], unlock = null;
    for (const part of parts.slice(1)) {
      const a = part.match(/^audio\s*=\s*(.+)$/i); if (a) { audio = a[1].split(",").map((x) => x.trim()).filter(Boolean); continue; }
      const u = part.match(/^unlock\s*=\s*(.+?)(?:\s*:\s*(\d+))?$/i); if (u) { unlock = { age: stripLink(u[1]), minStability: u[2] ? Number(u[2]) : 40 }; continue; }
      for (const item of part.split(",")) {
        const w = item.trim().match(/\w+=(?:"[^"]*"|\S+)|\S+/g) || []; if (!w.length) continue;
        if (!EFFECT_TYPES.includes(w[0])) { problems.push({ line: i + 1, text: l, message: `unknown effect “${w[0]}” — use one of: ${EFFECT_TYPES.join(", ")}` }); continue; }
        const e = { type: w[0] }; for (const x of w.slice(1)) { if (/^\d*\.?\d+$/.test(x)) e.density = Number(x); else if (/^(color|colour|name|rare)=/i.test(x)) { const kv = x.match(/^(\w+)=(.*)$/); e[kv[1].toLowerCase() === "colour" ? "color" : kv[1].toLowerCase()] = kv[2].replace(/^"|"$/g, ""); } else e.asset = x; } eff.push(e);
      }
    }
    pages.push({ id: m[1], label: parts[0] || m[1], effects: { canvas_additions: eff, ...(audio.length ? { ambiance_audio: audio.length === 1 ? audio[0] : audio } : {}) }, unlock });
  });
  return { pages, problems };
}

/** Page de bibliothèque → même forme qu'une page lue dans une note (sans fichier). */
function libraryPage(lp) {
  const eff = lp.effects || {};
  return {
    id: lp.id, path: null, library: true, label: lp.label, target: "Relto", enabled: true, unknown: 0,
    additions: (eff.canvas_additions || []).map((a) => ({ type: a.type, density: clamp(a.density != null ? a.density : 0.5, 0, 1), asset: a.asset, ...optsOf(a) })),
    audio: eff.ambiance_audio == null ? [] : asList(eff.ambiance_audio).map(String),
    unlock: lp.unlock ? { age: lp.unlock.age, minStability: lp.unlock.minStability, agesCount: null } : null,
  };
}

/** @returns {{ok:boolean, reason:string}} */
function checkUnlock(page, ages) {
  const u = page.unlock;
  if (!u) return { ok: true, reason: "" };
  if (u.age) {
    const want = String(u.age).replace(/^.*\//, "").replace(/\.md$/i, "").toLowerCase(); // [[Ages/Nom]] ou [[Nom]]
    const a = ages.find((x) => String(x.name).toLowerCase() === want);
    if (!a) return { ok: false, reason: `needs the Age “${u.age}”` };
    if (a.stability < u.minStability) return { ok: false, reason: `“${u.age}” must be at least ${u.minStability}% stable (now ${a.stability}%)` };
  }
  if (u.agesCount != null && ages.length < u.agesCount) return { ok: false, reason: `needs ${u.agesCount} Ages (you have ${ages.length})` };
  return { ok: true, reason: "" };
}

/**
 * @param {object} relto  résultat de parseRelto
 * @param {object[]} pages résultats de parsePage (non nuls)
 * @param {object[]} ages  [{name, path, verdict, stability, returnTo, links}]
 */
function buildScene(relto, pages, ages, shown) {
  const active = new Set(relto.pagesActive);
  const states = pages.map((p) => {
    const lock = checkUnlock(p, ages);
    let state;
    if (active.has(p.id)) state = !p.enabled ? "disabled" : lock.ok ? "active" : "locked";
    else state = lock.ok ? "available" : "locked";
    return { id: p.id, path: p.path, library: !!p.library, label: p.label, state, reason: lock.reason, additions: p.additions, audio: p.audio };
  });
  const missing = relto.pagesActive.filter((id) => !pages.some((p) => p.id === id));
  const additions = [];
  const audio = [];
  for (const s of states) {
    if (s.state !== "active") continue;
    for (const a of s.additions) {
      const prev = additions.find((x) => x.type === a.type && x.asset === a.asset && x.name === a.name && x.color === a.color);
      if (prev) prev.density = clamp(prev.density + a.density * 0.5, 0, 1);
      else additions.push({ ...a, pageId: s.id });
    }
    for (const n of s.audio) if (!audio.includes(n)) audio.push(n);
  }
  const vis = shown || ages, returning = vis.filter((a) => a.returnTo === relto.name).length;
  return {
    ...relto,
    ages: vis.filter((a) => a.name !== relto.name),
    returning,
    pages: states,
    missingPages: missing,
    additions,
    audio,
  };
}

/** « A, [[B]], dossier/ » -> ["A","B","dossier"] */
function parseList(v) {
  return (Array.isArray(v) ? v : String(v == null ? "" : v).split(","))
    .map((x) => String(x).trim().replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0].replace(/^\/+|\/+$/g, "").trim()).filter(Boolean);
}
const inFolder = (path, dirs) => dirs.some((d) => { const p = path.toLowerCase(), q = d.toLowerCase(); return p === q || p.startsWith(q + "/"); });
/**
 * Choix des livres affichés dans le Relto. folders : seulement ces dossiers ; exclude : jamais ceux-là ;
 * books : liste blanche de noms (ou chemins) ; [] = aucun. Renvoie { candidates (après dossiers), shown (après liste blanche) }.
 */
function filterAges(ages, r = {}) {
  const folders = parseList(r.folders), exclude = parseList(r.exclude), books = parseList(r.books).map((x) => x.toLowerCase());
  const candidates = ages.filter((a) => (!folders.length || inFolder(a.path, folders)) && !(exclude.length && inFolder(a.path, exclude)));
  // liste blanche active dès que `books` est donné, même vide (relto_books: [] = aucun livre)
  const listed = Array.isArray(r.books) || books.length > 0;
  const shown = listed ? candidates.filter((a) => books.includes(a.name.toLowerCase()) || books.includes(String(a.path).toLowerCase().replace(/\.md$/, ""))) : candidates;
  return { candidates, shown };
}

/** Frontmatter d'une nouvelle page à partir d'un préréglage. */
function pageFrontmatter(id, preset) {
  const fm = {
    relto_page_id: id,
    target_age: "Relto",
    enabled: true,
    effects: JSON.parse(JSON.stringify(preset.effects)),
  };
  // propriétés simples à modifier dans la note (Obsidian n'édite pas bien les listes imbriquées)
  for (const a of (preset.effects && preset.effects.canvas_additions) || []) {
    if (a.type === "cat") { fm.cat_name = a.name || ""; fm.cat_color = a.color || "orange"; }
    if (a.type === "koi") { fm.koi_rare = a.rare || "ogon"; fm.koi_name = a.name || ""; }
  }
  if (preset.unlock) fm.unlock = { age: `[[${preset.unlock.age}]]`, min_stability: preset.unlock.minStability };
  return fm;
}

/** Frontmatter du livre du Relto (valeurs par défaut). */
function defaultReltoFrontmatter(seed = 19991118) {
  return {
    age_type: "personal_hub",
    age_name: "Relto",
    seed,
    stability: 100,
    environment: { base_terrain: "volcanic_plateau", surrounding: "cloud_sea", sky_cycle: "system_time" },
    structures: ["hut", "bookshelves", "linking_pillars"],
    relto_pages_active: [],
  };
}

// ---- ciel : palette selon l'heure -------------------------------------------------------
// [heure, haut, bas, étoiles, lumière ambiante, chaleur du couchant]
const KEYS = [
  [0, "#05070f", "#0e1530", 1, 0.05, 0],
  [4.5, "#080c1c", "#1a2142", 1, 0.08, 0],
  [5.8, "#25305e", "#a35f6a", 0.4, 0.3, 0.7],
  [7, "#4a6aa6", "#f0b27a", 0.05, 0.6, 0.9],
  [9, "#4f86c6", "#b5d4ea", 0, 0.9, 0.1],
  [13, "#3f7fd0", "#a6d2f2", 0, 1, 0],
  [16.5, "#4a79b8", "#cfdcdf", 0, 0.9, 0.1],
  [18.5, "#4b5f9e", "#f0b070", 0.05, 0.65, 0.8],
  [19.8, "#2c2f66", "#d9644a", 0.3, 0.35, 0.95],
  [21, "#121638", "#3d3258", 0.8, 0.12, 0.3],
  [24, "#05070f", "#0e1530", 1, 0.05, 0],
];
const { mix } = require("./util");

function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h > KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = clamp((h - a[0]) / (b[0] - a[0]));
  return {
    hour: h, top: mix(a[1], b[1], t), bottom: mix(a[2], b[2], t),
    stars: lerp(a[3], b[3], t), ambient: lerp(a[4], b[4], t), warm: lerp(a[5], b[5], t),
    night: 1 - lerp(a[4], b[4], t),
  };
}

/** Heure à utiliser selon le cycle du ciel. */
function hourFor(skyCycle, now = new Date()) {
  switch (skyCycle) {
    case "frozen_dawn": return 6.6;
    case "frozen_day": return 12.5;
    case "frozen_dusk": return 19.3;
    case "frozen_night": return 1.5;
    default: return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }
}

module.exports = {
  parseList, filterAges, TERRAINS, SURROUNDINGS, SKY_CYCLES, STRUCTURES, EFFECT_TYPES, ASSETS, PAGE_PRESETS,
  placePlants, optsOf, stripLink, parseReltoLibrary, libraryPage, parseRelto, parsePage, checkUnlock, buildScene, pageFrontmatter, defaultReltoFrontmatter, skyAt, hourFor,
};
