"use strict";

const CANVAS_COLOR = { stable: "4", unstable: "2", dying: "1" };

const NODE_W = 360;

const NODE_H = 220;

const COL_GAP = 520;

const ROW_GAP = 300;

const nodeId = (e) => "n" + djb2(e);

function djb2(e) {
  let o = 5381;
  for (let t = 0; t < e.length; t++) o = ((o << 5) + o + e.charCodeAt(t)) | 0;
  return (o >>> 0).toString(16).padStart(8, "0");
}

function buildCanvas(e, o) {
  let t = new Set(e.map((d) => d.path)),
    i = o.filter((d) => t.has(d.from) && t.has(d.to) && d.from !== d.to),
    r = new Map();
  for (let d of e) r.set(d.path, new Set());
  for (let d of i) (r.get(d.from).add(d.to), r.get(d.to).add(d.from));
  let s = new Map(),
    n = [...e.filter((d) => d.root), ...e.filter((d) => !d.root)];
  for (let d of n) {
    if (s.has(d.path)) continue;
    s.set(d.path, 0);
    let f = [d.path];
    for (; f.length;) {
      let m = f.shift();
      for (let k of r.get(m)) s.has(k) || (s.set(k, s.get(m) + 1), f.push(k));
    }
  }
  let a = new Map(),
    c = new Map();
  for (let d of n) {
    let f = s.get(d.path),
      m = a.get(f) ?? 0;
    (a.set(f, m + 1), c.set(d.path, { x: f * COL_GAP, y: m * ROW_GAP }));
  }
  let g = e.map((d) => ({
      id: nodeId(d.path),
      type: "file",
      file: d.path,
      x: c.get(d.path).x,
      y: c.get(d.path).y,
      width: NODE_W,
      height: NODE_H,
      ...(d.verdict ? { color: CANVAS_COLOR[d.verdict] } : {}),
    })),
    h = new Set(i.map((d) => `${d.from}\0${d.to}`)),
    u = new Set(),
    l = [];
  for (let d of i) {
    let f = [d.from, d.to].sort().join("\0");
    if (u.has(f)) continue;
    u.add(f);
    let m = h.has(`${d.to}\0${d.from}`),
      k = c.get(d.from),
      w = c.get(d.to),
      [x, A] =
        w.x > k.x
          ? ["right", "left"]
          : w.x < k.x
            ? ["left", "right"]
            : w.y > k.y
              ? ["bottom", "top"]
              : ["top", "bottom"];
    l.push({
      id: "e" + djb2(f),
      fromNode: nodeId(d.from),
      fromSide: x,
      toNode: nodeId(d.to),
      toSide: A,
      toEnd: "arrow",
      ...(m ? { fromEnd: "arrow", color: "5" } : { color: "2", label: "one-way" }),
    });
  }
  return { nodes: g, edges: l };
}

module.exports = { CANVAS_COLOR, COL_GAP, NODE_H, NODE_W, ROW_GAP, buildCanvas, djb2, nodeId };
