// Recensement des tirages (outil de développement, hors plugin) : ce que le tirage automatique produit, et ce que la fenêtre en montre.
// Trois questions : (1) quels blocs le tirage peut-il seulement tirer ? (2) à quelle fréquence, sur N Âges ? (3) chaque bloc, une fois posé, change-t-il l'image ?
// Usage : node tools/census.js [N] [graine]   (écrit le rapport sur la sortie ; JSON complet avec CENSUS_JSON=fichier)
const fs = require("fs"), path = require("path");
const H = require("./harness");
const G = require("../src/genscene"), SKY = require("../src/sky"), REG = require("../src/engine/registry"), DRAW = require("../src/engine/draw");
const N = Number(process.argv[2]) || 700, SEED0 = Number(process.argv[3]) || 11;
const rnd = (() => { let s = SEED0 >>> 0 || 1; return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296); })();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const BLOCKS = (Array.isArray(REG.BUILTIN_BLOCKS) ? REG.BUILTIN_BLOCKS : Object.values(REG.BUILTIN_BLOCKS));
const WRITABLE = BLOCKS.filter((b) => b.writable !== false), AXIS = (ax) => WRITABLE.filter((b) => b.axis === ax).map((b) => b.id);
const GEO = AXIS("geological"), ECO = AXIS("ecological"), WX = AXIS("weather"), META = AXIS("metaphysical"), COSMO = AXIS("cosmological");
const some = (a, lo, hi) => { const n = lo + Math.floor(rnd() * (hi - lo + 1)), out = new Set(); while (out.size < Math.min(n, a.length)) out.add(pick(a)); return [...out]; };

/* ce que le tirage peut tirer : les options des emplacements de engine/draw.js */
const POOL = new Map(); for (const s of DRAW.DRAW_SLOTS) for (const o of s.options) if (o.id) POOL.set(o.id, s.name);

/* blocs qui ont un peintre dédié dans la fenêtre : ART (src/genscene.js) + l'ensemble KNOWN */
const src = fs.readFileSync(path.join(__dirname, "../src/genscene.js"), "utf8"), PAINTER = new Set([...src.matchAll(/\b([a-z_]+): \{ layer: "/g)].map((m) => m[1]));

/* un Âge « écrit par un joueur » : peu de lignes, un ciel, parfois un sol, un peu de vie ; le reste est tiré */
function sparse() {
  const L = [rnd() < 0.7 ? "single_sun" : "twin_suns"]; if (rnd() < 0.5) L.push(pick(GEO)); if (rnd() < 0.4) L.push(pick(ECO)); if (rnd() < 0.2) L.push(pick(WX)); if (rnd() < 0.1) L.push(pick(META));
  return [...new Set(L)];
}
function full() {
  const L = [rnd() < 0.7 ? "single_sun" : "twin_suns", "steady_cycle", ...some(GEO, 1, 3), ...some(ECO, 0, 5), ...some(WX, 0, 2)];
  if (rnd() < 0.12) L.push(pick(META)); if (rnd() < 0.04) L.push(pick(COSMO)); return [...new Set(L)];
}
const stableKey = (S) => JSON.stringify(S, (k, v) => (typeof v === "function" || k === "seed" || k === "extras" ? undefined : typeof v === "number" ? Math.round(v * 1000) / 1000 : v));

(async () => {
  const p = new H.Plug(H.app, { dir: "plugins/age", version: "census" }); await p.onload();
  let n = 0;
  const mk = (lines, name) => { const f = new H.TFile(`Cen/${name}${n++}.md`, "```age\n" + lines.join("\n") + "\n```\n"); H.files.set(f.path, f); return f; };
  const scene = (f) => { const a = p.core.analyse(p.core.extract(f.content), { seed: p.core.seed(f.path) }), S = G.sceneOf(a, p.core.seed(f.path), p.core.blocks); if (S) Object.assign(S, SKY.parseSky(p.core.extract(f.content))); return { a, S }; };
  const rep = { N, seed: SEED0 };

  /* (2) fréquence de tirage, sur N Âges (moitié peu écrits, moitié bien écrits) */
  const drawnC = new Map(), slotC = new Map(), writtenC = new Map(); let withDrawn = 0, drawnTotal = 0;
  for (let i = 0; i < N; i++) {
    const lines = i % 2 ? full() : sparse(), f = mk(lines, "D"), { a } = scene(f);
    for (const id of lines) writtenC.set(id, (writtenC.get(id) || 0) + 1);
    const d = a.drawn || []; if (d.length) withDrawn++; drawnTotal += d.length;
    for (const x of d) { drawnC.set(x.id, (drawnC.get(x.id) || 0) + 1); slotC.set(x.slot, (slotC.get(x.slot) || 0) + 1); }
  }
  const MECH = require("../src/mech"), mechC = new Map(), viewC = new Map(), wonderC = new Map(), stateC = new Map(); let mechAges = 0, mechTotal = 0;
  for (let i = 0; i < N; i++) {
    const f = mk(i % 2 ? full() : sparse(), "M"), { a, S } = scene(f); if (!S) continue;
    const world = new Set([...(a.resolved && a.resolved.lines ? a.resolved.lines.map((l) => l.id) : [])]);
    const ms = MECH.resolveMechanisms(world, f.basename, [], { mode: "draw" }); if (ms.length) mechAges++; mechTotal += ms.length;
    for (const m of ms) { mechC.set(m.id, (mechC.get(m.id) || 0) + 1); stateC.set(m.state, (stateC.get(m.state) || 0) + 1); }
    const vk = (S.view && S.view.kind) || "(aucune)"; viewC.set(vk, (viewC.get(vk) || 0) + 1);
    for (const w of S.wonders || []) wonderC.set(w, (wonderC.get(w) || 0) + 1);
  }
  rep.mech = { agesWith: mechAges, perAge: +(mechTotal / N).toFixed(2), byId: [...mechC.entries()].sort((a, b) => b[1] - a[1]), states: [...stateC.entries()], visibleInWindow: "non (texte du panneau Détails seulement, src/ui-extras.js)" };
  rep.views = [...viewC.entries()].sort((a, b) => b[1] - a[1]); rep.wonders = [...wonderC.entries()].sort((a, b) => b[1] - a[1]);
  rep.draw = { withDrawn, perAge: +(drawnTotal / N).toFixed(2), distinctDrawn: drawnC.size, poolSize: POOL.size, registry: BLOCKS.length, writable: WRITABLE.length,
    neverDrawable: BLOCKS.filter((b) => !POOL.has(b.id)).length };
  rep.drawnFreq = [...drawnC.entries()].sort((a, b) => b[1] - a[1]).map(([id, c]) => ({ id, slot: POOL.get(id), pct: +((100 * c) / N).toFixed(1), painter: PAINTER.has(id) || G.KNOWN.has(id) }));
  rep.poolNeverSeen = [...POOL.keys()].filter((id) => !drawnC.has(id));

  /* (3) visibilité : chaque bloc écrit seul sur 12 bases, l'image change-t-elle ? (empreinte de la scène avec / sans) */
  const bases = []; for (let i = 0; i < 12; i++) bases.push(["single_sun", "steady_cycle", ...(i % 3 === 0 ? ["water"] : i % 3 === 1 ? ["stone"] : ["sand"]), ...some(ECO, 0, 2)]);
  const baseKeys = bases.map((l, i) => { const f = mk(l, "B"); const { S } = scene(f); return S ? stableKey(S) : null; });
  const vis = [];
  for (const b of BLOCKS) {
    if (b.writable === false) continue;
    let changed = 0, tried = 0, ext = 0;
    bases.forEach((l, i) => { if (l.includes(b.id) || baseKeys[i] == null) return; const f = mk([...l, b.id], "V"), { S } = scene(f); if (!S) return; tried++; if (stableKey(S) !== baseKeys[i]) changed++; if ((S.extras || []).some((x) => x.id === b.id)) ext++; });
    vis.push({ id: b.id, axis: b.axis, drawable: POOL.has(b.id), painter: PAINTER.has(b.id) || G.KNOWN.has(b.id), changedPct: tried ? Math.round((100 * changed) / tried) : null, generic: tried ? ext === tried : false, extrasOnly: tried ? ext === tried && !(PAINTER.has(b.id) || G.KNOWN.has(b.id)) : false });
  }
  rep.visibility = vis;
  rep.silent = vis.filter((v) => v.changedPct === 0);
  rep.genericOnly = vis.filter((v) => v.extrasOnly);
  rep.noPainter = vis.filter((v) => !PAINTER.has(v.id));
  rep.painterNotDrawable = vis.filter((v) => !v.drawable && PAINTER.has(v.id)).map((v) => v.id);
  rep.writableNeverDrawn = vis.filter((v) => !v.drawable).length;
  /* drawn but silent */
  rep.drawnSilent = rep.drawnFreq.filter((d) => (vis.find((v) => v.id === d.id) || {}).changedPct === 0);
  if (process.env.CENSUS_JSON) fs.writeFileSync(process.env.CENSUS_JSON, JSON.stringify(rep, null, 1));
  const L = (t, a) => console.log(`\n## ${t} (${a.length})\n` + a.join(", "));
  console.log(JSON.stringify({ ...rep, drawnFreq: undefined, visibility: undefined, silent: undefined, genericOnly: undefined, noPainter: undefined, drawnSilent: undefined, poolNeverSeen: undefined }));
  console.log("\n## tirés, fréquence (% des Âges)\n" + rep.drawnFreq.map((d) => `${d.id}(${d.slot}) ${d.pct}%${d.painter ? "" : " [sans peintre]"}`).join("\n"));
  console.log("\n## mécanismes", JSON.stringify(rep.mech)); console.log("## vues", JSON.stringify(rep.views)); console.log("## merveilles", JSON.stringify(rep.wonders));
  L("écrivables mais jamais tirés, avec un peintre (existent mais n'arrivent jamais seuls)", rep.painterNotDrawable);
  L("dans le tirage, jamais vus", rep.poolNeverSeen);
  L("tirés mais sans effet sur l'image", rep.drawnSilent.map((d) => d.id));
  L("silencieux (aucun changement visible, écrits ou non)", rep.silent.map((v) => `${v.id}[${v.axis}]`));
  L("peintre générique seulement (texte/étiquette)", rep.genericOnly.map((v) => v.id));
  L("sans peintre dédié", rep.noPainter.map((v) => `${v.id}${v.changedPct ? ":" + v.changedPct + "%" : ""}`));
  process.exit(0);
})();
