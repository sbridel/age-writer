"use strict";
// Référence complète : quatre parties dans les deux langues, et tout ce qu'elle cite existe vraiment
// (identifiants de blocs, produits, lignes de valeurs physiques, exemples de blocs `age` sans tache d'encre).
const assert = require("assert"); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const { REF_EN } = require("../src/guide-ref-en");
const { REF_FR } = require("../src/guide-ref-fr");
const G = require("../src/guide");
const { SKY_ENTRIES } = require("../src/engine/data/sky");
const R = require("../src/engine/registry");
const { hooks } = require("../src/engine/hooks");
const { resolveAge } = require("../src/engine/resolve");
const P = require("../src/physics");
const { KEYS } = require("../src/physics/solve");
const { KEY_RE, FX_RE, STYLE_RE, TRAP_RE, DMG_RE, COVER_RE } = require("../src/mech");
const { DAY_RE, YEAR_RE, SIZE_RE, MOONS_RE } = require("../src/sky");
const { AMOUNT_RE } = require("../src/amounts");
const { SYSTEM_RE } = require("../src/starsystem");

// ---- 1. quatre parties, dans l'ordre demandé, dans les deux langues --------------------------------------------
const ORDER = ["set", "write", "gen", "relto"];
ok(JSON.stringify(G.PART_ORDER) === JSON.stringify(ORDER), "ordre des parties : réglages, écrire, généré, Relto");
for (const [lang, ref] of [["en", REF_EN], ["fr", REF_FR]]) {
  ok(ref.every((t) => ORDER.includes(t.part)), `${lang} : chaque rubrique appartient à une partie`);
  const seen = ref.map((t) => t.part).filter((p, i, a) => i === 0 || a[i - 1] !== p);
  ok(JSON.stringify(seen) === JSON.stringify(ORDER), `${lang} : les quatre parties, chacune d'un seul tenant, dans l'ordre (${seen.join(", ")})`);
  ok(ORDER.every((p) => G.PARTS[lang][p]), `${lang} : chaque partie a un nom`);
  ok(ref.some((t) => t.id === G.REF_START), `${lang} : la rubrique d'ouverture existe`);
  ok(new Set(ref.map((t) => t.id)).size === ref.length, `${lang} : identifiants de rubriques uniques`);
}
// les commandes ne sont pas mêlées à ce que l'on écrit
ok(REF_EN.find((t) => t.id === "cmd").part === "set", "les commandes sont rangées avec les réglages");

// ---- 2. les identifiants cités existent ------------------------------------------------------------------------
const writable = new Set([...SKY_ENTRIES.map((e) => e.id), ...R.writableIds]);
const products = new Set(R.BUILTIN_BLOCKS.filter((b) => !b.writable).map((b) => b.id));
const codes = (text) => [...String(text).matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const isId = (s) => /^[a-z][a-z0-9_]*$/.test(s);
const textsOf = (b) => [b.p, b.note, ...(b.ul || []), ...((b.table && b.table.rows.flat()) || [])].filter(Boolean);
for (const [lang, ref] of [["en", REF_EN], ["fr", REF_FR]]) {
  const listed = new Set();
  for (const t of ref.filter((x) => x.check === "blocks")) {
    for (const b of t.body) for (const tx of textsOf(b)) for (const c of codes(tx)) {
      if (!isId(c)) continue;
      ok(writable.has(c), `${lang} › ${t.id} : « ${c} » est un bloc qui s'écrit`); listed.add(c);
    }
  }
  // tous les blocs qui s'écrivent sont dans la référence (sauf ceux d'une bibliothèque personnelle)
  const missing = [...writable].filter((id) => !listed.has(id));
  ok(!missing.length, `${lang} : blocs absents de la référence : ${missing.join(", ")}`);
  const react = ref.find((t) => t.check === "products"), cited = new Set();
  for (const b of react.body) for (const tx of textsOf(b)) {
    // « `produit` ← `a` + `b` » : à gauche un produit, à droite des blocs (écrits ou produits)
    const m = /^`([a-z_]+)` ←/.exec(tx); if (m) { ok(products.has(m[1]), `${lang} › réactions : « ${m[1]} » est un produit`); cited.add(m[1]); }
    for (const c of codes(tx)) if (isId(c)) ok(writable.has(c) || products.has(c), `${lang} › réactions : « ${c} » existe`);
  }
  for (const v of R.BUILTIN_VARIANTS) ok(codes(JSON.stringify(react.body)).includes(v.variant), `${lang} : variante « ${v.variant} » citée`);
  for (const r of R.BUILTIN_REACTIONS) if (!R.writableIds.has(r.result)) ok(cited.has(r.result), `${lang} : produit « ${r.result} » cité`);
}

// ---- 3. le tableau des valeurs physiques : chaque valeur type se lit, chaque clé est citée ------------------------
for (const [lang, ref] of [["en", REF_EN], ["fr", REF_FR]]) {
  const table = ref.find((t) => t.check === "phys").body.find((b) => b.table).table;
  const keysCited = new Set();
  for (const [line, example, why] of table.rows) {
    for (const c of codes(line)) { const k = c.replace(/:$/, ""); ok(k in KEYS, `${lang} : « ${k} » est une clé physique`); keysCited.add(k); }
    const ex = codes(example)[0];
    ok(P.isPhysicsLine(ex), `${lang} : « ${ex} » est une ligne de valeur lisible`);
    const parsed = P.parsePhysics(ex); ok(Object.keys(parsed.params).length + parsed.asserts.length === 1 && !parsed.clamped.length, `${lang} : « ${ex} » est lue sans être ramenée`);
    ok(why.length > 80, `${lang} : « ${ex} » a une explication`);
  }
  const fold = (k) => k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // « marees: » = « marées: », dit en tête de rubrique
  const all = Object.keys(KEYS).filter((k) => !keysCited.has(k) && ![...keysCited].some((c) => fold(c) === k));
  ok(!all.length, `${lang} : clés physiques absentes du tableau : ${all.join(", ")}`);
}

// ---- 4. chaque exemple de bloc `age` se lit sans tache d'encre --------------------------------------------------
const skip0 = hooks.skip;
const norm0 = hooks.norm; hooks.norm = require("../src/weather").normalize;
hooks.skip = (line) => P.isPhysicsLine(line) || KEY_RE.test(line) || FX_RE.test(line) || STYLE_RE.test(line) || DAY_RE.test(line) || MOONS_RE.test(line) || YEAR_RE.test(line) || SIZE_RE.test(line) || AMOUNT_RE.test(line) || TRAP_RE.test(line) || DMG_RE.test(line) || COVER_RE.test(line) || SYSTEM_RE.test(line);
let examples = 0;
for (const [lang, ref] of [["en", REF_EN], ["fr", REF_FR]]) for (const t of ref) for (const b of t.body) {
  const m = b.code && /^```age\n([\s\S]*?)\n```$/.exec(b.code); if (!m) continue;
  const r = resolveAge(m[1], { seed: "ref", draw: false }), blots = r.lines.filter((l) => l.unknown).map((l) => l.raw);
  ok(!blots.length, `${lang} › ${t.id} : exemple sans tache d'encre (${blots.join(", ")})`); examples++;
}
// et la mise en garde de la référence est vraie : une ligne d'intitulé est une tache d'encre
ok(resolveAge("stars: twin_suns", { draw: false }).lines.some((l) => l.unknown), "« stars: twin_suns » est bien une tache d'encre");
hooks.skip = skip0; hooks.norm = norm0;
ok(examples >= 20, `exemples de blocs age vérifiés : ${examples}`);

// ---- 5. l'export en note garde les parties et le tableau ---------------------------------------------------------
for (const lang of ["en", "fr"]) {
  const md = G.toMarkdown(lang, "full");
  ok(ORDER.every((p) => md.includes("## " + G.PARTS[lang][p] + "\n")), `${lang} : l'export Markdown a les quatre parties`);
  ok(/\n\| --- \| --- \| --- \|\n/.test(md) && md.includes("`tides: 0.03`"), `${lang} : l'export Markdown a le tableau des valeurs`);
}
console.log(`reference : ${n} vérifications, tout passe`);
