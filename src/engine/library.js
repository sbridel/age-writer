"use strict";
const { AXES, DEFAULT_CATALYST, DEFAULT_WEIGHT, REACTION_TYPES, builtinLibrary } = require("./registry");
const { SKY_ENTRIES } = require("./data/sky");

function libraryBlocksIn(e) {
  return [...e.matchAll(/```age-library[ \t]*\r?\n([\s\S]*?)```/g)].map((o) => o[1]);
}

const ID_RE = /^[a-z][a-z0-9_]*$/;

const BLOCK_LINE_RE = /^(block|product)\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*([^|]+?)\s*\|\s*(.+)$/i;

const BLOCK_TAIL_RE = /^([A-Za-z]+)((?:\s+(?:weight|bonus)\s*=\s*-?\d*\.?\d+)*)(?:\s+"([^"]*)")?\s*$/;

const REACTION_LINE_RE =
  /^reaction\s+([A-Za-z][A-Za-z0-9_]*)\s*\+\s*([A-Za-z][A-Za-z0-9_]*)\s*->\s*([A-Za-z][A-Za-z0-9_]*)\s*\(\s*([A-Za-z]+)\s*(?:,\s*cost\s*=\s*(-?\d*\.?\d+))?\s*\)\s*(?::\s*(.+))?$/i;

const VARIANT_LINE_RE =
  /^variant\s+([A-Za-z][A-Za-z0-9_]*)\s*->\s*([A-Za-z][A-Za-z0-9_]*)(?:\s+with\s+([A-Za-z][A-Za-z0-9_]*))?$/i;

function parseLibrary(e, o) {
  let t = { blocks: [], reactions: [], variants: [], problems: [] },
    i = (s, n, a) => t.problems.push({ level: "error", file: o, line: s, text: n, message: a }),
    r = (s, n, a) => t.problems.push({ level: "warning", file: o, line: s, text: n, message: a });
  return (
    e
      .split(
        `
`,
      )
      .forEach((s, n) => {
        let a = n + 1,
          c = s.trim();
        if (c === "" || c.startsWith("#")) return;
        let g = c.match(BLOCK_LINE_RE);
        if (g) {
          let u = g[1].toLowerCase(),
            l = g[2].toLowerCase(),
            d = g[3]
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            f = g[4].match(BLOCK_TAIL_RE);
          if (!ID_RE.test(l))
            return i(
              a,
              c,
              `\u201C${g[2]}\u201D isn't a usable id (lowercase letters, digits and _, starting with a letter)`,
            );
          if (d.length === 0) return i(a, c, "needs at least one descriptor, e.g.  heavy, bitter, pale");
          if (!f)
            return i(
              a,
              c,
              `after the | put an axis (${AXES.join(", ")}), optionally weight=0.03 bonus=-0.1 and a "phrase"`,
            );
          let m = f[1].toLowerCase();
          if (!AXES.includes(m))
            return i(a, c, `unknown axis \u201C${f[1]}\u201D \u2014 use one of: ${AXES.join(", ")}`);
          let k = {};
          for (let x of f[2].matchAll(/(weight|bonus)\s*=\s*(-?\d*\.?\d+)/g)) k[x[1]] = Number(x[2]);
          let w = u === "block";
          (d.length < 2 && r(a, c, "only one descriptor \u2014 two or three read better"),
            !w &&
              "weight" in k &&
              r(a, c, "a product has no weight (it costs nothing; only writing a block does)"),
            w &&
              "bonus" in k &&
              r(a, c, "bonus only applies to what a reaction produces; a block you write has none"),
            t.blocks.push({
              line: a,
              text: c,
              def: {
                id: l,
                descriptors: d,
                axis: m,
                writable: w,
                weight: w ? (k.weight ?? DEFAULT_WEIGHT) : 0,
                ...(f[3] !== void 0 ? { presence: f[3] } : {}),
                ...(k.bonus !== void 0 ? { stabilityBonus: k.bonus } : {}),
              },
            }));
          return;
        }
        if (((g = c.match(REACTION_LINE_RE)), g)) {
          let [u, l, d] = [g[1], g[2], g[3]].map((k) => k.toLowerCase()),
            f = g[4].toLowerCase();
          if (!REACTION_TYPES.includes(f))
            return i(
              a,
              c,
              `unknown reaction type \u201C${g[4]}\u201D \u2014 use one of: ${REACTION_TYPES.join(", ")}`,
            );
          if (u === l) return i(a, c, "a reaction needs two different ingredients");
          let m = g[6]
            ? g[6]
                .split("|")
                .map((k) => k.trim())
                .filter(Boolean)
            : void 0;
          t.reactions.push({
            line: a,
            text: c,
            def: {
              a: u,
              b: l,
              result: d,
              type: f,
              ...(g[5] !== void 0 ? { cost: Number(g[5]) } : {}),
              ...(m && m.length ? { verbs: m } : {}),
            },
          });
          return;
        }
        if (((g = c.match(VARIANT_LINE_RE)), g)) {
          t.variants.push({
            line: a,
            text: c,
            def: {
              base: g[1].toLowerCase(),
              variant: g[2].toLowerCase(),
              catalyst: (g[3] ?? DEFAULT_CATALYST).toLowerCase(),
            },
          });
          return;
        }
        let h = c.split(/\s+/)[0].toLowerCase();
        i(
          a,
          c,
          h === "block" || h === "product"
            ? "expected   block id: descriptor, descriptor | axis"
            : h === "reaction"
              ? "expected   reaction a + b -> result (type)"
              : h === "variant"
                ? "expected   variant base -> variant   (optionally  with catalyst)"
                : "not a line I know \u2014 start with block, product, reaction or variant (or # for a comment)",
        );
      }),
    t
  );
}

function mergeLibraries(e, o) {
  let t = e.flatMap((m) => m.parsed.problems),
    i = builtinLibrary(),
    r = new Set(SKY_ENTRIES.map((m) => m.id)),
    s = new Map(i.blocks.map((m) => [m.id, m])),
    n = (m, k, w) => t.push({ level: "error", file: m, line: k.line, text: k.text, message: w }),
    a = (m, k, w) => t.push({ level: "warning", file: m, line: k.line, text: k.text, message: w }),
    c = new Map(),
    g = new Map();
  for (let { file: m, parsed: k } of e)
    for (let w of k.blocks) {
      let x = w.def.id;
      if (r.has(x)) {
        n(m, w, `\u201C${x}\u201D is already a sky symbol \u2014 pick another id`);
        continue;
      }
      let A = s.get(x);
      if (A && A.writable !== w.def.writable) {
        n(
          m,
          w,
          `\u201C${x}\u201D is a built-in ${A.writable ? "block" : "product"}; it can't become a ${w.def.writable ? "block" : "product"}`,
        );
        continue;
      }
      (g.has(x) && a(m, w, `\u201C${x}\u201D is defined again (this one wins over ${g.get(x)})`),
        g.set(x, m ?? "this note"),
        c.set(x, w.def));
    }
  let h = new Map();
  for (let m of i.blocks) h.set(m.id, m);
  for (let m of o?.blocks ?? []) h.set(m.id, m);
  for (let m of c.values()) h.set(m.id, m);
  let u = [];
  for (let { file: m, parsed: k } of e)
    for (let w of k.reactions) {
      let x = [w.def.a, w.def.b, w.def.result].find((A) => !h.has(A));
      if (x) {
        n(m, w, `\u201C${x}\u201D isn't a block or product \u2014 define it first (block / product line)`);
        continue;
      }
      (h.get(w.def.result).writable &&
        a(m, w, `\u201C${w.def.result}\u201D can also be written, so this reaction won't show when it is`),
        u.push(w.def));
    }
  let l = [];
  for (let { file: m, parsed: k } of e)
    for (let w of k.variants) {
      let { base: x, variant: A, catalyst: $ } = w.def;
      if (!h.has(x)) {
        n(m, w, `\u201C${x}\u201D isn't a block or product`);
        continue;
      }
      let F = h.get($);
      if (!F || !F.writable) {
        n(m, w, `the catalyst \u201C${$}\u201D must be a block you can write`);
        continue;
      }
      (h.has(A) || a(m, w, `\u201C${A}\u201D has no product line, so it will have no descriptors`),
        l.push(w.def));
    }
  let d = new Set([...i.reactions, ...(o?.reactions ?? []), ...u].map((m) => m.result));
  for (let m of [...i.variants, ...(o?.variants ?? []), ...l]) d.add(m.variant);
  for (let { file: m, parsed: k } of e)
    for (let w of k.blocks)
      !w.def.writable &&
        c.get(w.def.id) === w.def &&
        !d.has(w.def.id) &&
        a(m, w, `no reaction produces \u201C${w.def.id}\u201D, so it can never appear`);
  let f = [...c.values()];
  return {
    library: { blocks: f, reactions: u, variants: l },
    problems: t,
    counts: {
      blocks: f.filter((m) => m.writable).length,
      products: f.filter((m) => !m.writable).length,
      reactions: u.length,
      variants: l.length,
    },
  };
}

const str = (e) => String(e);

function serializeLibrary(e) {
  let o = [],
    t = (i) => {
      let r = [];
      (i.writable && i.weight !== DEFAULT_WEIGHT && r.push(`weight=${str(i.weight)}`),
        i.stabilityBonus !== void 0 && r.push(`bonus=${str(i.stabilityBonus)}`));
      let s = [i.axis, ...r].join(" ") + (i.presence !== void 0 ? ` "${i.presence}"` : "");
      return `${i.writable ? "block" : "product"} ${i.id}: ${i.descriptors.join(", ")} | ${s}`;
    };
  for (let i of AXES) {
    let r = e.blocks.filter((s) => s.axis === i);
    if (r.length !== 0) {
      o.push(`# --- ${i} ---`);
      for (let s of r.filter((n) => n.writable)) o.push(t(s));
      for (let s of r.filter((n) => !n.writable)) o.push(t(s));
      o.push("");
    }
  }
  o.push("# --- reactions ---");
  for (let i of e.reactions) {
    let r = [i.type, ...(i.cost !== void 0 ? [`cost=${str(i.cost)}`] : [])].join(", ");
    o.push(
      `reaction ${i.a} + ${i.b} -> ${i.result} (${r})${i.verbs && i.verbs.length ? ` : ${i.verbs.join(" | ")}` : ""}`,
    );
  }
  o.push("", "# --- variants (shown instead of the plain product when the catalyst is written) ---");
  for (let i of e.variants)
    o.push(
      `variant ${i.base} -> ${i.variant}${i.catalyst !== DEFAULT_CATALYST ? ` with ${i.catalyst}` : ""}`,
    );
  return o.join(`
`);
}

const LIBRARY_TEMPLATE = `# Age library

Blocks, reactions and variants written here are read by the plugin and added to
the built-in ones \u2014 no rebuild. Any note can hold a library; this is just a
convenient place. Put it in the block below. Lines starting with # are comments.

- \`block id: word, word, word | axis\` \u2014 something you can write in an age block.
- \`product id: word, word, word | axis\` \u2014 something that only exists as the result of a reaction.
- \`reaction a + b -> result (type)\` \u2014 what happens when two meet. The type is one of
  violent, crystallizing, corrosive, soothing, transmuting, growing, feeding, decaying, awakening.
  Optionally \`(type, cost=0.1)\` to set its own stability cost, and \` : verb | verb\` for your own verbs.
- \`variant base -> rare with catalyst\` \u2014 what \`base\` becomes when the catalyst block is written
  (leave out \`with \u2026\` for strange_stone).

Axes: cosmological, geological, weather, ecological, metaphysical.
Reusing an id of a built-in block replaces it (that's how you change its words);
a reaction for a pair that already reacts replaces the old one.

\`\`\`age-library
# block brume_salee: heavy, bitter, pale | weather
# product brume_salee_haute: low, pale, drifting | weather
# reaction brume_salee + wind -> brume_salee_haute (transmuting)
\`\`\`
`;

module.exports = {
  BLOCK_LINE_RE,
  BLOCK_TAIL_RE,
  ID_RE,
  LIBRARY_TEMPLATE,
  REACTION_LINE_RE,
  VARIANT_LINE_RE,
  libraryBlocksIn,
  mergeLibraries,
  parseLibrary,
  serializeLibrary,
  str,
};
