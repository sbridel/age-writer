"use strict";

const CANVAS_COLOR = { stable: "4", unstable: "2", dying: "1" };

const NODE_W = 360;

const NODE_H = 220;

const COL_GAP = 520;

const ROW_GAP = 300;

const nodeId = (path) => "n" + djb2(path);

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildCanvas(files, links) {
  let knownPaths = new Set(files.map((file) => file.path)),
    validLinks = links.filter(
      (link) => knownPaths.has(link.from) && knownPaths.has(link.to) && link.from !== link.to,
    ),
    neighbors = new Map();
  for (let file of files) neighbors.set(file.path, new Set());
  for (let link of validLinks) (neighbors.get(link.from).add(link.to), neighbors.get(link.to).add(link.from));
  let depth = new Map(),
    ordered = [...files.filter((file) => file.root), ...files.filter((file) => !file.root)];
  for (let file of ordered) {
    if (depth.has(file.path)) continue;
    depth.set(file.path, 0);
    let queue = [file.path];
    for (; queue.length;) {
      let current = queue.shift();
      for (let neighbor of neighbors.get(current))
        depth.has(neighbor) || (depth.set(neighbor, depth.get(current) + 1), queue.push(neighbor));
    }
  }
  let rowCounts = new Map(),
    positions = new Map();
  for (let file of ordered) {
    let level = depth.get(file.path),
      row = rowCounts.get(level) ?? 0;
    (rowCounts.set(level, row + 1), positions.set(file.path, { x: level * COL_GAP, y: row * ROW_GAP }));
  }
  let nodes = files.map((file) => ({
      id: nodeId(file.path),
      type: "file",
      file: file.path,
      x: positions.get(file.path).x,
      y: positions.get(file.path).y,
      width: NODE_W,
      height: NODE_H,
      ...(file.verdict ? { color: CANVAS_COLOR[file.verdict] } : {}),
    })),
    linkKeys = new Set(validLinks.map((link) => `${link.from}\0${link.to}`)),
    seenPairs = new Set(),
    edges = [];
  for (let link of validLinks) {
    let pairKey = [link.from, link.to].sort().join("\0");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    let bidirectional = linkKeys.has(`${link.to}\0${link.from}`),
      fromPos = positions.get(link.from),
      toPos = positions.get(link.to),
      [fromSide, toSide] =
        toPos.x > fromPos.x
          ? ["right", "left"]
          : toPos.x < fromPos.x
            ? ["left", "right"]
            : toPos.y > fromPos.y
              ? ["bottom", "top"]
              : ["top", "bottom"];
    edges.push({
      id: "e" + djb2(pairKey),
      fromNode: nodeId(link.from),
      fromSide: fromSide,
      toNode: nodeId(link.to),
      toSide: toSide,
      toEnd: "arrow",
      ...(bidirectional ? { fromEnd: "arrow", color: "5" } : { color: "2", label: "one-way" }),
    });
  }
  return { nodes: nodes, edges: edges };
}

module.exports = { CANVAS_COLOR, COL_GAP, NODE_H, NODE_W, ROW_GAP, buildCanvas, djb2, nodeId };
