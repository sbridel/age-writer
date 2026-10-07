"use strict";
const { hooks } = require("./hooks");

const AGE_BLOCK_RE = /```age[ \t]*\r?\n([\s\S]*?)```/g;

function writtenLines(e) {
  let o = new Set();
  for (let t of e.matchAll(AGE_BLOCK_RE))
    for (let i of t[1].split(`
`)) {
      let r = i.trim();
      r && !r.startsWith("#") && !/^(link|return|panel|seed)\s*:/i.test(r) && !hooks.skip(r) && o.add(r);
    }
  return o;
}

function addLine(e, o) {
  let t = [...e.matchAll(AGE_BLOCK_RE)];
  if (t.length === 0) return null;
  if (writtenLines(e).has(o)) return e;
  let i = t[t.length - 1],
    r = i.index + i[0].length - 3,
    s =
      e[r - 1] !==
      `
`;
  return (
    e.slice(0, r) +
    (s
      ? `
`
      : "") +
    o +
    `
` +
    e.slice(r)
  );
}

function removeLine(e, o) {
  let t = !1,
    i = e.replace(AGE_BLOCK_RE, (r, s) => {
      if (t) return r;
      let n = s.split(`
`),
        a = n.findIndex((c) => c.trim() === o);
      return a === -1
        ? r
        : ((t = !0),
          n.splice(a, 1),
          r.slice(0, r.length - s.length - 3) +
            n.join(`
`) +
            "```");
    });
  return t ? i : null;
}

function setPanelLine(e, o) {
  let t = [...e.matchAll(AGE_BLOCK_RE)];
  if (t.length === 0 || t.some((n) => /^\s*panel\s*:/im.test(n[1]))) return null;
  let i = t[t.length - 1],
    r = i.index + i[0].length - 3,
    s =
      e[r - 1] !==
      `
`;
  return (
    e.slice(0, r) +
    (s
      ? `
`
      : "") +
    `panel: [[${o}]]
` +
    e.slice(r)
  );
}

function setSeedLine(e, o) {
  let t = [...e.matchAll(AGE_BLOCK_RE)];
  if (t.length === 0) return null;
  let i = !1,
    r = e.replace(AGE_BLOCK_RE, (c, g) =>
      i || !/^\s*seed\s*:/im.test(g) ? c : ((i = !0), c.replace(/^(\s*)seed\s*:.*$/im, `$1seed: ${o}`)),
    );
  if (i) return r;
  let s = t[t.length - 1],
    n = s.index + s[0].length - 3,
    a =
      e[n - 1] !==
      `
`;
  return (
    e.slice(0, n) +
    (a
      ? `
`
      : "") +
    `seed: ${o}
` +
    e.slice(n)
  );
}

module.exports = { AGE_BLOCK_RE, addLine, removeLine, setPanelLine, setSeedLine, writtenLines };
