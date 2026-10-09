"use strict";
const { hooks } = require("./hooks");

const AGE_BLOCK_RE = /```age[ \t]*\r?\n([\s\S]*?)```/g;

function writtenLines(text) {
  let written = new Set();
  for (let match of text.matchAll(AGE_BLOCK_RE))
    for (let rawLine of match[1].split(`
`)) {
      let line = rawLine.trim();
      line &&
        !line.startsWith("#") &&
        !/^(link|return|panel|seed)\s*:/i.test(line) &&
        !hooks.skip(line) &&
        written.add(hooks.norm(line));
    }
  return written;
}

function addLine(text, line) {
  let blocks = [...text.matchAll(AGE_BLOCK_RE)];
  if (blocks.length === 0) return null;
  if (writtenLines(text).has(line)) return text;
  let lastBlock = blocks[blocks.length - 1],
    insertAt = lastBlock.index + lastBlock[0].length - 3,
    needsNewline =
      text[insertAt - 1] !==
      `
`;
  return (
    text.slice(0, insertAt) +
    (needsNewline
      ? `
`
      : "") +
    line +
    `
` +
    text.slice(insertAt)
  );
}

function removeLine(text, line) {
  let removed = !1,
    result = text.replace(AGE_BLOCK_RE, (block, body) => {
      if (removed) return block;
      let bodyLines = body.split(`
`),
        index = bodyLines.findIndex((bodyLine) => bodyLine.trim() === line);
      if (index === -1) index = bodyLines.findIndex((bodyLine) => bodyLine.trim() !== "" && hooks.norm(bodyLine.trim()) === line); // `rain: sometimes, dawn` se retire avec `rain`
      return index === -1
        ? block
        : ((removed = !0),
          bodyLines.splice(index, 1),
          block.slice(0, block.length - body.length - 3) +
            bodyLines.join(`
`) +
            "```");
    });
  return removed ? result : null;
}

function setPanelLine(text, target) {
  let blocks = [...text.matchAll(AGE_BLOCK_RE)];
  if (blocks.length === 0 || blocks.some((block) => /^\s*panel\s*:/im.test(block[1]))) return null;
  let lastBlock = blocks[blocks.length - 1],
    insertAt = lastBlock.index + lastBlock[0].length - 3,
    needsNewline =
      text[insertAt - 1] !==
      `
`;
  return (
    text.slice(0, insertAt) +
    (needsNewline
      ? `
`
      : "") +
    `panel: [[${target}]]
` +
    text.slice(insertAt)
  );
}

function setSeedLine(text, seed) {
  let blocks = [...text.matchAll(AGE_BLOCK_RE)];
  if (blocks.length === 0) return null;
  let replaced = !1,
    replacedText = text.replace(AGE_BLOCK_RE, (block, body) =>
      replaced || !/^\s*seed\s*:/im.test(body)
        ? block
        : ((replaced = !0), block.replace(/^(\s*)seed\s*:.*$/im, `$1seed: ${seed}`)),
    );
  if (replaced) return replacedText;
  let lastBlock = blocks[blocks.length - 1],
    insertAt = lastBlock.index + lastBlock[0].length - 3,
    needsNewline =
      text[insertAt - 1] !==
      `
`;
  return (
    text.slice(0, insertAt) +
    (needsNewline
      ? `
`
      : "") +
    `seed: ${seed}
` +
    text.slice(insertAt)
  );
}

module.exports = { AGE_BLOCK_RE, addLine, removeLine, setPanelLine, setSeedLine, writtenLines };
