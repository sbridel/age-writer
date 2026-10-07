"use strict";
const { AXES, DEFAULT_CATALYST, DEFAULT_WEIGHT, REACTION_TYPES, builtinLibrary } = require("./registry");
const { SKY_ENTRIES } = require("./data/sky");

function libraryBlocksIn(text) {
  return [...text.matchAll(/```age-library[ \t]*\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
}

const ID_RE = /^[a-z][a-z0-9_]*$/;

const BLOCK_LINE_RE = /^(block|product)\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*([^|]+?)\s*\|\s*(.+)$/i;

const BLOCK_TAIL_RE = /^([A-Za-z]+)((?:\s+(?:weight|bonus)\s*=\s*-?\d*\.?\d+)*)(?:\s+"([^"]*)")?\s*$/;

const REACTION_LINE_RE =
  /^reaction\s+([A-Za-z][A-Za-z0-9_]*)\s*\+\s*([A-Za-z][A-Za-z0-9_]*)\s*->\s*([A-Za-z][A-Za-z0-9_]*)\s*\(\s*([A-Za-z]+)\s*(?:,\s*cost\s*=\s*(-?\d*\.?\d+))?\s*\)\s*(?::\s*(.+))?$/i;

const VARIANT_LINE_RE =
  /^variant\s+([A-Za-z][A-Za-z0-9_]*)\s*->\s*([A-Za-z][A-Za-z0-9_]*)(?:\s+with\s+([A-Za-z][A-Za-z0-9_]*))?$/i;

function parseLibrary(source, file) {
  let result = { blocks: [], reactions: [], variants: [], problems: [] },
    addError = (line, text, message) =>
      result.problems.push({ level: "error", file: file, line: line, text: text, message: message }),
    addWarning = (line, text, message) =>
      result.problems.push({ level: "warning", file: file, line: line, text: text, message: message });
  return (
    source
      .split(
        `
`,
      )
      .forEach((rawLine, index) => {
        let lineNo = index + 1,
          line = rawLine.trim();
        if (line === "" || line.startsWith("#")) return;
        let match = line.match(BLOCK_LINE_RE);
        if (match) {
          let kind = match[1].toLowerCase(),
            id = match[2].toLowerCase(),
            descriptors = match[3]
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean),
            tail = match[4].match(BLOCK_TAIL_RE);
          if (!ID_RE.test(id))
            return addError(
              lineNo,
              line,
              `\u201C${match[2]}\u201D isn't a usable id (lowercase letters, digits and _, starting with a letter)`,
            );
          if (descriptors.length === 0)
            return addError(lineNo, line, "needs at least one descriptor, e.g.  heavy, bitter, pale");
          if (!tail)
            return addError(
              lineNo,
              line,
              `after the | put an axis (${AXES.join(", ")}), optionally weight=0.03 bonus=-0.1 and a "phrase"`,
            );
          let axis = tail[1].toLowerCase();
          if (!AXES.includes(axis))
            return addError(
              lineNo,
              line,
              `unknown axis \u201C${tail[1]}\u201D \u2014 use one of: ${AXES.join(", ")}`,
            );
          let mods = {};
          for (let mod of tail[2].matchAll(/(weight|bonus)\s*=\s*(-?\d*\.?\d+)/g))
            mods[mod[1]] = Number(mod[2]);
          let writable = kind === "block";
          (descriptors.length < 2 &&
            addWarning(lineNo, line, "only one descriptor \u2014 two or three read better"),
            !writable &&
              "weight" in mods &&
              addWarning(
                lineNo,
                line,
                "a product has no weight (it costs nothing; only writing a block does)",
              ),
            writable &&
              "bonus" in mods &&
              addWarning(
                lineNo,
                line,
                "bonus only applies to what a reaction produces; a block you write has none",
              ),
            result.blocks.push({
              line: lineNo,
              text: line,
              def: {
                id: id,
                descriptors: descriptors,
                axis: axis,
                writable: writable,
                weight: writable ? (mods.weight ?? DEFAULT_WEIGHT) : 0,
                ...(tail[3] !== void 0 ? { presence: tail[3] } : {}),
                ...(mods.bonus !== void 0 ? { stabilityBonus: mods.bonus } : {}),
              },
            }));
          return;
        }
        if (((match = line.match(REACTION_LINE_RE)), match)) {
          let [ingredientA, ingredientB, resultId] = [match[1], match[2], match[3]].map((part) =>
              part.toLowerCase(),
            ),
            type = match[4].toLowerCase();
          if (!REACTION_TYPES.includes(type))
            return addError(
              lineNo,
              line,
              `unknown reaction type \u201C${match[4]}\u201D \u2014 use one of: ${REACTION_TYPES.join(", ")}`,
            );
          if (ingredientA === ingredientB)
            return addError(lineNo, line, "a reaction needs two different ingredients");
          let verbs = match[6]
            ? match[6]
                .split("|")
                .map((part) => part.trim())
                .filter(Boolean)
            : void 0;
          result.reactions.push({
            line: lineNo,
            text: line,
            def: {
              a: ingredientA,
              b: ingredientB,
              result: resultId,
              type: type,
              ...(match[5] !== void 0 ? { cost: Number(match[5]) } : {}),
              ...(verbs && verbs.length ? { verbs: verbs } : {}),
            },
          });
          return;
        }
        if (((match = line.match(VARIANT_LINE_RE)), match)) {
          result.variants.push({
            line: lineNo,
            text: line,
            def: {
              base: match[1].toLowerCase(),
              variant: match[2].toLowerCase(),
              catalyst: (match[3] ?? DEFAULT_CATALYST).toLowerCase(),
            },
          });
          return;
        }
        let firstWord = line.split(/\s+/)[0].toLowerCase();
        addError(
          lineNo,
          line,
          firstWord === "block" || firstWord === "product"
            ? "expected   block id: descriptor, descriptor | axis"
            : firstWord === "reaction"
              ? "expected   reaction a + b -> result (type)"
              : firstWord === "variant"
                ? "expected   variant base -> variant   (optionally  with catalyst)"
                : "not a line I know \u2014 start with block, product, reaction or variant (or # for a comment)",
        );
      }),
    result
  );
}

function mergeLibraries(sources, extra) {
  let problems = sources.flatMap((source) => source.parsed.problems),
    builtin = builtinLibrary(),
    skyIds = new Set(SKY_ENTRIES.map((entry) => entry.id)),
    builtinById = new Map(builtin.blocks.map((block) => [block.id, block])),
    addError = (file, item, message) =>
      problems.push({ level: "error", file: file, line: item.line, text: item.text, message: message }),
    addWarning = (file, item, message) =>
      problems.push({ level: "warning", file: file, line: item.line, text: item.text, message: message }),
    customBlocks = new Map(),
    definedIn = new Map();
  for (let { file, parsed } of sources)
    for (let block of parsed.blocks) {
      let id = block.def.id;
      if (skyIds.has(id)) {
        addError(file, block, `\u201C${id}\u201D is already a sky symbol \u2014 pick another id`);
        continue;
      }
      let builtinBlock = builtinById.get(id);
      if (builtinBlock && builtinBlock.writable !== block.def.writable) {
        addError(
          file,
          block,
          `\u201C${id}\u201D is a built-in ${builtinBlock.writable ? "block" : "product"}; it can't become a ${block.def.writable ? "block" : "product"}`,
        );
        continue;
      }
      (definedIn.has(id) &&
        addWarning(
          file,
          block,
          `\u201C${id}\u201D is defined again (this one wins over ${definedIn.get(id)})`,
        ),
        definedIn.set(id, file ?? "this note"),
        customBlocks.set(id, block.def));
    }
  let allBlocks = new Map();
  for (let block of builtin.blocks) allBlocks.set(block.id, block);
  for (let block of extra?.blocks ?? []) allBlocks.set(block.id, block);
  for (let block of customBlocks.values()) allBlocks.set(block.id, block);
  let reactions = [];
  for (let { file, parsed } of sources)
    for (let reaction of parsed.reactions) {
      let missing = [reaction.def.a, reaction.def.b, reaction.def.result].find(
        (candidate) => !allBlocks.has(candidate),
      );
      if (missing) {
        addError(
          file,
          reaction,
          `\u201C${missing}\u201D isn't a block or product \u2014 define it first (block / product line)`,
        );
        continue;
      }
      (allBlocks.get(reaction.def.result).writable &&
        addWarning(
          file,
          reaction,
          `\u201C${reaction.def.result}\u201D can also be written, so this reaction won't show when it is`,
        ),
        reactions.push(reaction.def));
    }
  let variants = [];
  for (let { file, parsed } of sources)
    for (let variant of parsed.variants) {
      let { base: baseId, variant: variantId, catalyst: catalystId } = variant.def;
      if (!allBlocks.has(baseId)) {
        addError(file, variant, `\u201C${baseId}\u201D isn't a block or product`);
        continue;
      }
      let catalystBlock = allBlocks.get(catalystId);
      if (!catalystBlock || !catalystBlock.writable) {
        addError(file, variant, `the catalyst \u201C${catalystId}\u201D must be a block you can write`);
        continue;
      }
      (allBlocks.has(variantId) ||
        addWarning(
          file,
          variant,
          `\u201C${variantId}\u201D has no product line, so it will have no descriptors`,
        ),
        variants.push(variant.def));
    }
  let produced = new Set(
    [...builtin.reactions, ...(extra?.reactions ?? []), ...reactions].map((reaction) => reaction.result),
  );
  for (let variant of [...builtin.variants, ...(extra?.variants ?? []), ...variants])
    produced.add(variant.variant);
  for (let { file, parsed } of sources)
    for (let block of parsed.blocks)
      !block.def.writable &&
        customBlocks.get(block.def.id) === block.def &&
        !produced.has(block.def.id) &&
        addWarning(file, block, `no reaction produces \u201C${block.def.id}\u201D, so it can never appear`);
  let customList = [...customBlocks.values()];
  return {
    library: { blocks: customList, reactions: reactions, variants: variants },
    problems: problems,
    counts: {
      blocks: customList.filter((block) => block.writable).length,
      products: customList.filter((block) => !block.writable).length,
      reactions: reactions.length,
      variants: variants.length,
    },
  };
}

const str = (value) => String(value);

function serializeLibrary(library) {
  let lines = [],
    blockLine = (block) => {
      let flags = [];
      (block.writable && block.weight !== DEFAULT_WEIGHT && flags.push(`weight=${str(block.weight)}`),
        block.stabilityBonus !== void 0 && flags.push(`bonus=${str(block.stabilityBonus)}`));
      let spec = [block.axis, ...flags].join(" ") + (block.presence !== void 0 ? ` "${block.presence}"` : "");
      return `${block.writable ? "block" : "product"} ${block.id}: ${block.descriptors.join(", ")} | ${spec}`;
    };
  for (let axis of AXES) {
    let axisBlocks = library.blocks.filter((block) => block.axis === axis);
    if (axisBlocks.length !== 0) {
      lines.push(`# --- ${axis} ---`);
      for (let block of axisBlocks.filter((item) => item.writable)) lines.push(blockLine(block));
      for (let block of axisBlocks.filter((item) => !item.writable)) lines.push(blockLine(block));
      lines.push("");
    }
  }
  lines.push("# --- reactions ---");
  for (let reaction of library.reactions) {
    let parts = [reaction.type, ...(reaction.cost !== void 0 ? [`cost=${str(reaction.cost)}`] : [])].join(
      ", ",
    );
    lines.push(
      `reaction ${reaction.a} + ${reaction.b} -> ${reaction.result} (${parts})${reaction.verbs && reaction.verbs.length ? ` : ${reaction.verbs.join(" | ")}` : ""}`,
    );
  }
  lines.push("", "# --- variants (shown instead of the plain product when the catalyst is written) ---");
  for (let variant of library.variants)
    lines.push(
      `variant ${variant.base} -> ${variant.variant}${variant.catalyst !== DEFAULT_CATALYST ? ` with ${variant.catalyst}` : ""}`,
    );
  return lines.join(`
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
