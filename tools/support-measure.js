// La carte du sol, étape 2 (outil de développement, hors plugin) : combien de choses la fenêtre pose-t-elle aujourd'hui sur un sol qui ne les porte pas ?
// Lit la table des supports (src/genscene.js, SUPPORT) et solEn(x, y) ; ne peint rien, ne change aucune image. Voir claude/DESIGN-carte-du-sol.md.
// Usage : node tools/support-measure.js [N] [graine]   (JSON complet avec SUPPORT_JSON=fichier)
const fs = require("fs");
const H = require("./harness");
const G = require("../src/genscene"), SKY = require("../src/sky"), REG = require("../src/engine/registry");
const N = Number(process.argv[2]) || 1000, SEED0 = Number(process.argv[3]) || 7;
let s = SEED0 >>> 0 || 1; const rnd = () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296), pick = (a) => a[Math.floor(rnd() * a.length)];
const BLOCKS = (Array.isArray(REG.BUILTIN_BLOCKS) ? REG.BUILTIN_BLOCKS : Object.values(REG.BUILTIN_BLOCKS)).filter((b) => b.writable !== false);
const BUILT = new Set(["tower", "lighthouse", "stairs"]);

(async () => {
  const p = new H.Plug(H.app, { dir: "plugins/age", version: "support" }); await p.onload(); await new Promise((r) => setTimeout(r, 50));
  const by = new Map(), soils = new Map(), wrong = new Map(), examples = []; let n = 0, windowsWrong = 0;
  /* ce que les peintres font déjà d'eux-mêmes : ils n'en dessinent rien (effacé) ou le découpent (le ruban de rivière, l'étang) ; ce n'est pas une faute visible */
  const LAND_FILTER = new Set(["grazer", "burrower", "cave_stalker", "humming_blooms", "geysers"]), SEA_ONLY = new Set(["shoal", "deep_hunter", "plankton"]);
  const fate = (kind, sol, S) => { const wet = sol === "sea" || sol === "river" || sol === "pond";
    if (SEA_ONLY.has(kind)) return wet || (kind === "plankton" && S.river) ? "ok" : "effacé";
    if (LAND_FILTER.has(kind) && wet) return "effacé";
    if (sol === "river" || sol === "pond") return "découpé";
    return "visible"; };
  const tally = (kind, sol, ok, how, written) => { const b = by.get(kind) || { n: 0, bad: 0, vis: 0, wr: 0 }; b.n++; if (!ok) { b.bad++; if (how === "visible") { b.vis++; if (written) b.wr++; } } by.set(kind, b); if (!ok && how === "visible") { const k = kind + " sur " + sol; wrong.set(k, (wrong.get(k) || 0) + 1); } };
  for (let i = 0; i < N; i++) {
    const L = ["single_sun"]; for (let k = 0, m = 1 + Math.floor(rnd() * 4); k < m; k++) L.push(pick(BLOCKS).id);
    const f = new H.TFile(`Sup/a${i}.md`, "```age\n" + [...new Set(L)].join("\n") + "\n```\n"); H.files.set(f.path, f);
    const txt = p.core.extract(f.content), seed = p.core.seed(f.path), a = p.core.analyse(txt, { seed }), S = G.sceneOf(a, seed, p.core.blocks); if (!S) continue;
    Object.assign(S, SKY.parseSky(txt)); n++;
    const m = G.build(S, 640, 360), hz = m.hz, D = m.H - hz, writ = new Set((a.resolved && a.resolved.matter && a.resolved.matter.written) || []), drawnIds = new Set((a.drawn || []).map((d) => d.id)); let bad = 0;
    const check = (kind, x, y, id) => { const sp = G.supportOf(kind); if (!sp) return; const sol = G.solEn(m, x, y), ok = sol.k === "far" || sp.on.has(sol.k), how = ok ? "ok" : fate(kind, sol.k, S); soils.set(sol.k, (soils.get(sol.k) || 0) + 1); tally(kind, sol.k + (sol.form ? "/" + sol.form : ""), ok, how, id && writ.has(id) && !drawnIds.has(id)); if (!ok && how === "visible") bad++; };
    for (const rn of m.ruins) check(BUILT.has(rn.k) ? "built" : rn.k === "bridge" ? "bridge" : "ruin", rn.x, (rn.by || hz) + 2);
    for (const tr of m.trees) check("tree", tr.x, hz + 2);
    if (m.det) check("detail", m.det.x, hz + D * 0.06);
    for (const e of m.extras || []) if (G.supportOf(e.id)) for (const P of G.byDepthForTest(m, e)) check(e.id, P.x, P.y, e.id);
    if (bad) { windowsWrong++; if (examples.length < 12) examples.push({ i, lines: [...new Set(L)], bad }); }
  }
  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + " %" : "—");
  const out = [`# Carte du sol, étape 2 : ce qui est mal porté aujourd'hui (${n} Âges tirés, graine ${SEED0})`, "", `Fenêtres avec au moins une chose mal portée **et visible** : **${windowsWrong} (${pct(windowsWrong, n)})**`, "",
    "« Mal portées » : selon la table des supports (proposition de la fiche). « Visibles » : le peintre ne les efface pas ni ne les découpe déjà. « Écrites » : parmi les visibles, celles que l'auteur a écrites (décision C) ; les autres sont tirées.", "",
    "| Sorte | Posées | Mal portées | Visibles | dont écrites | % visibles |", "|---|---|---|---|---|---|"];
  for (const [k, b] of [...by.entries()].sort((x, y) => y[1].vis - x[1].vis)) out.push(`| ${k} | ${b.n} | ${b.bad} | ${b.vis} | ${b.wr} | ${pct(b.vis, b.n)} |`);
  out.push("", "## Les cas visibles les plus fréquents", "", "| Chose sur sol | Nombre |", "|---|---|");
  for (const [k, c] of [...wrong.entries()].sort((x, y) => y[1] - x[1]).slice(0, 20)) out.push(`| ${k} | ${c} |`);
  out.push("", "## Les sols rencontrés sous les pieds", "", [...soils.entries()].sort((x, y) => y[1] - x[1]).map(([k, c]) => `${k} ${c}`).join(" · "));
  console.log(out.join("\n"));
  if (process.env.SUPPORT_JSON) fs.writeFileSync(process.env.SUPPORT_JSON, JSON.stringify({ n, windowsWrong, by: Object.fromEntries(by), wrong: Object.fromEntries(wrong), examples }, null, 1));
  process.exit(0);
})();
