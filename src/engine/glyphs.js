"use strict";
const { baseOfVariant, blockById, recipeOf } = require("./registry");

function hexagon(cx, cy, radius) {
  let points = [];
  for (let k = 0; k < 6; k++) {
    let angle = (-90 + k * 60) * (Math.PI / 180),
      pointRadius = k % 2 === 0 ? radius : radius * 0.85;
    points.push([cx + pointRadius * Math.cos(angle), cy + pointRadius * Math.sin(angle)]);
  }
  return points;
}

const diamond = (cx, cy, halfW, halfH = halfW) => [
  [cx, cy - halfH],
  [cx + halfW, cy],
  [cx, cy + halfH],
  [cx - halfW, cy],
];

const kite = (cx, top, bottom, halfW) => [
  [cx, top],
  [cx + halfW, (top + bottom) / 2],
  [cx, bottom],
  [cx - halfW, (top + bottom) / 2],
];

const lens = (x1, x2, y, bulge) => [
  [x1, y],
  [(x1 + x2) / 2, y - bulge],
  [x2, y],
  [(x1 + x2) / 2, y + bulge],
];

const fill = (pts, opacity) => ({ kind: "polygon", pts: pts, opacity: opacity });

const outline = (pts, strokeWidth = 2) => ({
  kind: "polygon",
  pts: pts,
  stroke: !0,
  strokeWidth: strokeWidth,
});

const polyline = (pts, strokeWidth = 3) => ({ kind: "polyline", pts: pts, strokeWidth: strokeWidth });

const line = (from, to, strokeWidth = 2) => ({ kind: "line", a: from, b: to, strokeWidth: strokeWidth });

const EXTRA_GLYPHS = {
  // météo vivante : bruine (traits courts et fins, serrés), neige (étoiles à six branches), arc-en-ciel (trois arcs),
  // tornade (entonnoir de traits), fleurs (une corolle de losanges sur sa tige). Les produits (scented_mist…) se composent de leurs parents.
  drizzle: [
    line([20, 14], [17, 28], 1.8), line([44, 10], [41, 24], 1.8), line([68, 14], [65, 28], 1.8),
    line([32, 38], [29, 52], 1.8), line([56, 34], [53, 48], 1.8), line([80, 38], [77, 52], 1.8),
    line([20, 62], [17, 76], 1.8), line([44, 58], [41, 72], 1.8), line([68, 62], [65, 76], 1.8),
    line([32, 84], [30, 94], 1.8), line([56, 80], [54, 90], 1.8), line([80, 84], [78, 94], 1.8),
  ],
  snow: [
    line([30, 14], [30, 46], 2.5), line([16, 22], [44, 38], 2.5), line([16, 38], [44, 22], 2.5),
    line([70, 54], [70, 86], 2.5), line([56, 62], [84, 78], 2.5), line([56, 78], [84, 62], 2.5),
    fill(diamond(76, 22, 4)), fill(diamond(24, 76, 4)),
  ],
  rainbow: [
    polyline([[8, 84], [16, 52], [34, 30], [50, 24], [66, 30], [84, 52], [92, 84]], 3),
    polyline([[22, 84], [28, 60], [40, 44], [50, 40], [60, 44], [72, 60], [78, 84]], 3),
    polyline([[36, 84], [40, 68], [50, 58], [60, 68], [64, 84]], 3),
  ],
  tornado: [
    line([10, 12], [90, 12], 3), line([20, 28], [82, 28], 3), line([30, 44], [72, 44], 3),
    line([40, 60], [66, 60], 3), line([46, 74], [60, 74], 3), polyline([[52, 82], [50, 94]], 3),
  ],
  flowers: [
    polyline([[50, 94], [50, 52]], 3),
    line([50, 74], [30, 62], 2.5),
    fill(diamond(50, 22, 7, 11)), fill(diamond(34, 38, 11, 7)), fill(diamond(66, 38, 11, 7)), fill(diamond(50, 38, 4)),
  ],
  // soleil noir : un disque plein dans un anneau brisé (sa couronne)
  black_sun: [
    fill(hexagon(50, 50, 17)),
    polyline([[50, 20], [72, 32], [76, 52]], 3),
    polyline([[70, 74], [50, 82], [28, 74]], 3),
    polyline([[22, 54], [26, 32]], 3),
  ],
  // perturbateurs (télescope, étape 3) : le pulsar, un petit losange plein et ses deux faisceaux opposés, avec des tirets
  // (les éclats) ; l'étoile à neutrons, un très petit hexagone plein dans deux anneaux serrés (sa masse) ; le trou noir, un
  // vide (hexagone en creux) autour duquel la lumière s'enroule en arcs
  pulsar: [
    fill(diamond(50, 50, 8)),
    line([42, 42], [14, 14], 3), line([58, 58], [86, 86], 3),
    line([62, 38], [70, 30], 2), line([38, 62], [30, 70], 2),
    line([76, 24], [84, 16], 2), line([24, 76], [16, 84], 2),
  ],
  neutron_star: [
    fill(hexagon(50, 50, 9)),
    outline(hexagon(50, 50, 20), 2.5),
    outline(hexagon(50, 50, 31), 1.6),
    line([50, 4], [50, 14], 2), line([50, 86], [50, 96], 2),
  ],
  black_hole: [
    outline(hexagon(50, 50, 13), 3),
    polyline([[22, 50], [26, 30], [42, 20], [62, 22], [76, 34]], 3),
    polyline([[78, 50], [74, 70], [58, 80], [38, 78], [24, 66]], 3),
    polyline([[8, 46], [14, 22], [34, 8]], 1.8),
    polyline([[92, 54], [86, 78], [66, 92]], 1.8),
  ],
  shifting_orbit: [
    polyline(
      [
        [15, 70],
        [50, 32],
        [85, 70],
      ],
      4,
    ),
    fill(diamond(36, 54, 6)),
    fill(diamond(64, 54, 6), 0.4),
  ],
  chaotic_orbit: [
    polyline(
      [
        [15, 70],
        [34, 40],
        [50, 60],
        [66, 30],
        [85, 66],
      ],
      4,
    ),
    fill(diamond(30, 66, 4)),
    fill(diamond(58, 44, 4)),
    fill(diamond(74, 72, 4)),
  ],
  auroras: [
    polyline(
      [
        [10, 30],
        [30, 18],
        [50, 34],
        [70, 16],
        [90, 30],
      ],
      3.5,
    ),
    polyline(
      [
        [10, 50],
        [30, 38],
        [50, 54],
        [70, 36],
        [90, 50],
      ],
      3,
    ),
    polyline(
      [
        [10, 70],
        [30, 58],
        [50, 74],
        [70, 56],
        [90, 70],
      ],
      2.5,
    ),
  ],
  recurring_eclipses: [fill(hexagon(42, 50, 24)), outline(hexagon(60, 50, 24), 2.5)],
  permanent_veil: [
    fill(hexagon(50, 50, 22)),
    fill(lens(8, 92, 38, 4), 0.9),
    fill(lens(8, 92, 52, 4), 0.9),
    fill(lens(8, 92, 66, 4), 0.9),
  ],
  starfall: [
    line([20, 14], [44, 58], 3),
    fill(diamond(46, 62, 5)),
    line([48, 8], [72, 52], 3),
    fill(diamond(74, 56, 5)),
    line([66, 40], [84, 72], 2.5),
    fill(diamond(86, 76, 4)),
  ],
  close_binary_orbit: [
    fill(hexagon(36, 50, 16)),
    outline(hexagon(36, 50, 32), 1.5),
    fill(diamond(36, 18, 5)),
    fill(hexagon(88, 50, 7)),
  ],
  wide_binary_orbit: [
    fill(hexagon(42, 50, 10)),
    fill(hexagon(58, 50, 10)),
    outline(hexagon(50, 50, 42), 1.5),
    fill(diamond(50, 8, 5)),
  ],
  water: [
    polyline(
      [
        [14, 30],
        [26, 22],
        [38, 30],
        [50, 22],
        [62, 30],
        [74, 22],
        [86, 30],
      ],
      3,
    ),
    polyline(
      [
        [14, 50],
        [26, 42],
        [38, 50],
        [50, 42],
        [62, 50],
        [74, 42],
        [86, 50],
      ],
      3,
    ),
    polyline(
      [
        [14, 70],
        [26, 62],
        [38, 70],
        [50, 62],
        [62, 70],
        [74, 62],
        [86, 70],
      ],
      3,
    ),
  ],
  lava: [
    fill(lens(8, 92, 74, 9)),
    fill([
      [20, 66],
      [30, 38],
      [40, 66],
    ]),
    fill([
      [44, 66],
      [54, 24],
      [64, 66],
    ]),
    fill([
      [68, 66],
      [76, 44],
      [84, 66],
    ]),
  ],
  stone: [
    fill([
      [22, 72],
      [16, 48],
      [40, 26],
      [74, 32],
      [86, 58],
      [66, 76],
    ]),
  ],
  sand: [
    fill(diamond(28, 62, 6)),
    fill(diamond(50, 46, 6)),
    fill(diamond(72, 64, 6)),
    fill(diamond(42, 78, 5)),
    fill(diamond(66, 34, 5)),
    fill(diamond(22, 38, 4)),
  ],
  salt: [outline(diamond(50, 50, 28), 2.5), fill(diamond(50, 50, 9))],
  ash: [
    fill(
      [
        [24, 16],
        [30, 42],
        [24, 64],
        [18, 40],
      ],
      0.5,
    ),
    fill(
      [
        [50, 28],
        [56, 56],
        [50, 80],
        [44, 54],
      ],
      0.8,
    ),
    fill(
      [
        [78, 14],
        [84, 40],
        [78, 62],
        [72, 38],
      ],
      0.5,
    ),
  ],
  iron: [fill(kite(50, 10, 90, 8)), fill(lens(16, 84, 34, 6)), fill(lens(28, 72, 90, 4))],
  crystal: [
    outline(
      [
        [50, 6],
        [70, 34],
        [64, 90],
        [36, 90],
        [30, 34],
      ],
      2.5,
    ),
    line([50, 6], [50, 90], 1.5),
    line([30, 34], [70, 34], 1.5),
  ],
  strange_stone: [outline(hexagon(46, 54, 28), 2.5), fill(diamond(54, 50, 8)), line([60, 44], [82, 20], 2)],
  deep_cold: [
    fill(lens(8, 92, 26, 5)),
    fill([
      [22, 32],
      [32, 32],
      [27, 66],
    ]),
    fill([
      [44, 32],
      [56, 32],
      [50, 88],
    ]),
    fill([
      [68, 32],
      [78, 32],
      [73, 58],
    ]),
  ],
  pressure: [
    polyline(
      [
        [16, 24],
        [50, 46],
        [84, 24],
      ],
      4,
    ),
    polyline(
      [
        [16, 76],
        [50, 54],
        [84, 76],
      ],
      4,
    ),
    fill(diamond(50, 50, 5)),
  ],
  spore: [
    fill(hexagon(50, 50, 12)),
    fill(diamond(24, 28, 4)),
    fill(diamond(78, 30, 4)),
    fill(diamond(70, 76, 4)),
    fill(diamond(26, 72, 4)),
  ],
  seed: [fill(diamond(50, 56, 16, 30)), line([50, 26], [50, 10], 2.5), line([50, 14], [62, 6], 2)],
  vine: [
    polyline(
      [
        [32, 92],
        [42, 70],
        [28, 50],
        [48, 32],
        [36, 12],
      ],
      3.5,
    ),
    fill(diamond(56, 62, 6)),
    fill(diamond(22, 38, 6)),
    fill(diamond(50, 18, 5)),
  ],
  fern: [
    line([50, 92], [50, 8], 3),
    line([50, 30], [28, 16]),
    line([50, 30], [72, 16]),
    line([50, 52], [24, 36]),
    line([50, 52], [76, 36]),
    line([50, 74], [26, 60]),
    line([50, 74], [74, 60]),
  ],
  great_tree: [
    fill(kite(50, 48, 90, 7)),
    fill([
      [50, 4],
      [86, 56],
      [14, 56],
    ]),
    line([50, 90], [30, 98], 3),
    line([50, 90], [70, 98], 3),
  ],
  moth: [
    fill([
      [50, 50],
      [12, 20],
      [20, 68],
    ]),
    fill([
      [50, 50],
      [88, 20],
      [80, 68],
    ]),
    fill(kite(50, 30, 76, 3.5)),
  ],
  grazer: [
    fill(lens(16, 74, 46, 16)),
    line([30, 58], [28, 86], 3.5),
    line([62, 58], [64, 86], 3.5),
    fill(diamond(84, 36, 9)),
  ],
  burrower: [
    polyline(
      [
        [14, 32],
        [50, 80],
        [86, 32],
      ],
      4,
    ),
    fill(diamond(14, 32, 6)),
    fill(diamond(86, 32, 6)),
  ],
  hunter: [
    outline(
      [
        [10, 24],
        [90, 50],
        [10, 76],
      ],
      3,
    ),
    fill(diamond(52, 50, 6)),
  ],
  drifter: [
    outline(hexagon(50, 34, 18), 2.5),
    polyline(
      [
        [36, 54],
        [32, 66],
        [38, 78],
        [34, 92],
      ],
      2,
    ),
    polyline(
      [
        [50, 54],
        [46, 68],
        [52, 80],
        [48, 94],
      ],
      2,
    ),
    polyline(
      [
        [64, 54],
        [60, 66],
        [66, 78],
        [62, 92],
      ],
      2,
    ),
  ],
  wind: [
    polyline(
      [
        [8, 32],
        [58, 32],
        [68, 22],
        [80, 26],
      ],
      3,
    ),
    polyline(
      [
        [20, 50],
        [74, 50],
        [86, 40],
        [93, 46],
      ],
      3,
    ),
    polyline(
      [
        [8, 68],
        [48, 68],
        [58, 78],
        [68, 74],
      ],
      3,
    ),
  ],
  rain: [
    line([22, 16], [14, 42], 3),
    line([46, 22], [38, 48], 3),
    line([70, 16], [62, 42], 3),
    line([34, 54], [26, 80], 3),
    line([58, 60], [50, 86], 3),
    line([84, 54], [76, 80], 3),
  ],
  fog: [
    fill(lens(8, 92, 26, 3.5), 0.9),
    fill(lens(22, 80, 42, 3.5), 0.55),
    fill(lens(8, 70, 58, 3.5), 0.9),
    fill(lens(26, 92, 74, 3.5), 0.5),
  ],
  lightning: [
    fill([
      [58, 4],
      [28, 54],
      [47, 54],
      [36, 96],
      [76, 38],
      [55, 38],
      [68, 4],
    ]),
  ],
  heat: [
    polyline(
      [
        [22, 88],
        [30, 70],
        [22, 52],
        [30, 34],
        [22, 16],
      ],
      3,
    ),
    polyline(
      [
        [50, 92],
        [58, 74],
        [50, 56],
        [58, 38],
        [50, 20],
      ],
      3,
    ),
    polyline(
      [
        [78, 88],
        [86, 70],
        [78, 52],
        [86, 34],
        [78, 16],
      ],
      3,
    ),
  ],
  fissure: [
    polyline(
      [
        [50, 6],
        [44, 28],
        [56, 44],
        [46, 62],
        [54, 80],
        [48, 96],
      ],
      3.5,
    ),
    line([56, 44], [76, 52], 2),
    line([46, 62], [26, 70], 2),
  ],
  cave_fissure: [
    outline(
      [
        [14, 94],
        [14, 50],
        [30, 20],
        [70, 20],
        [86, 50],
        [86, 94],
      ],
      3,
    ),
    polyline(
      [
        [50, 34],
        [46, 52],
        [54, 66],
        [50, 92],
      ],
      3,
    ),
  ],
  submarine_fissure: [
    polyline(
      [
        [8, 26],
        [22, 18],
        [36, 26],
        [50, 18],
        [64, 26],
        [78, 18],
        [92, 26],
      ],
      3,
    ),
    polyline(
      [
        [50, 38],
        [44, 58],
        [56, 74],
        [48, 96],
      ],
      3.5,
    ),
    fill(diamond(66, 52, 4)),
    fill(diamond(34, 66, 3)),
  ],
  no_fissure: [
    polyline(
      [
        [50, 10],
        [44, 32],
        [56, 50],
        [48, 70],
        [52, 90],
      ],
      3,
    ),
    line([20, 20], [80, 80], 3.5),
  ],
  tablet: [
    outline(
      [
        [26, 8],
        [74, 8],
        [74, 92],
        [26, 92],
      ],
      2.5,
    ),
    line([36, 28], [64, 28], 2.5),
    line([36, 44], [64, 44], 2.5),
    line([36, 60], [54, 60], 2.5),
  ],
  lamp: [
    fill([
      [30, 90],
      [70, 90],
      [62, 58],
      [38, 58],
    ]),
    outline(diamond(50, 36, 12, 22), 2.5),
    fill(diamond(50, 38, 4, 7)),
  ],
  bridge: [
    polyline(
      [
        [8, 62],
        [50, 26],
        [92, 62],
      ],
      4,
    ),
    line([8, 62], [8, 90], 4),
    line([92, 62], [92, 90], 4),
    line([20, 78], [80, 78], 3),
  ],
  door: [
    outline(
      [
        [28, 92],
        [28, 36],
        [50, 8],
        [72, 36],
        [72, 92],
      ],
      3,
    ),
    fill(diamond(62, 62, 4)),
  ],
  book: [
    outline(
      [
        [50, 24],
        [12, 32],
        [12, 78],
        [50, 70],
      ],
      2.5,
    ),
    outline(
      [
        [50, 24],
        [88, 32],
        [88, 78],
        [50, 70],
      ],
      2.5,
    ),
    line([50, 24], [50, 70], 2.5),
  ],
};

const GLYPHS = {
  single_sun: [
    {
      kind: "polygon",
      pts: [
        [50, 24],
        [69, 39],
        [72.5, 63],
        [50, 72],
        [27.5, 63],
        [31, 39],
      ],
    },
  ],
  twin_suns: [
    {
      kind: "polygon",
      pts: [
        [34, 30],
        [48.7, 41.5],
        [51.3, 60],
        [34, 67],
        [16.7, 60],
        [19.3, 41.5],
      ],
    },
    {
      kind: "polygon",
      pts: [
        [66, 30],
        [80.7, 41.5],
        [83.3, 60],
        [66, 67],
        [48.7, 60],
        [51.3, 41.5],
      ],
      opacity: 0.55,
    },
  ],
  starless: [
    {
      kind: "polygon",
      pts: [
        [50, 24],
        [69, 39],
        [72.5, 63],
        [50, 72],
        [27.5, 63],
        [31, 39],
      ],
      stroke: !0,
      strokeWidth: 1.5,
    },
    {
      kind: "polygon",
      pts: [
        [28, 28],
        [47.2, 52.8],
        [72, 72],
        [52.8, 47.2],
      ],
    },
  ],
  companion_moon: [
    {
      kind: "polygon",
      pts: [
        [44, 30],
        [58.7, 41.5],
        [61.3, 60],
        [44, 67],
        [26.7, 60],
        [29.3, 41.5],
      ],
    },
    { kind: "line", a: [60, 60], b: [68, 64], strokeWidth: 2 },
    {
      kind: "polygon",
      pts: [
        [74, 60],
        [82, 68],
        [74, 76],
        [66, 68],
      ],
    },
  ],
  steady_cycle: [
    {
      kind: "polygon",
      pts: [
        [10, 50],
        [30, 44],
        [70, 44],
        [90, 50],
        [70, 56],
        [30, 56],
      ],
    },
    {
      kind: "polygon",
      pts: [
        [50, 34],
        [58, 50],
        [50, 66],
        [42, 50],
      ],
    },
  ],
  erratic_cycle: [
    {
      kind: "polyline",
      pts: [
        [15, 62],
        [32, 38],
        [49, 62],
        [66, 38],
        [83, 62],
      ],
      strokeWidth: 4,
    },
  ],
  stable_orbit: [
    {
      kind: "polyline",
      pts: [
        [15, 70],
        [50, 32],
        [85, 70],
      ],
      strokeWidth: 4,
    },
    {
      kind: "polygon",
      pts: [
        [50, 42],
        [58, 50],
        [50, 58],
        [42, 50],
      ],
    },
  ],
  frozen_cycle: [
    {
      kind: "polygon",
      pts: [
        [10, 50],
        [30, 44],
        [70, 44],
        [90, 50],
        [70, 56],
        [30, 56],
      ],
    },
    { kind: "rect", x: 42, y: 42, w: 16, h: 16 },
  ],
};

Object.assign(GLYPHS, EXTRA_GLYPHS);

function shrinkShapes(shapes, scale, offsetX, offsetY) {
  let mapPoint = ([x, y]) => [x * scale + offsetX, y * scale + offsetY],
    scaleStroke = (width) => width * Math.max(scale * 1.3, 0.8);
  return shapes.map((shape) => {
    switch (shape.kind) {
      case "polygon":
        return {
          ...shape,
          pts: shape.pts.map(mapPoint),
          strokeWidth: shape.strokeWidth ? scaleStroke(shape.strokeWidth) : void 0,
        };
      case "polyline":
        return { ...shape, pts: shape.pts.map(mapPoint), strokeWidth: scaleStroke(shape.strokeWidth) };
      case "line":
        return {
          ...shape,
          a: mapPoint(shape.a),
          b: mapPoint(shape.b),
          strokeWidth: scaleStroke(shape.strokeWidth),
        };
      case "rect":
        return {
          ...shape,
          x: shape.x * scale + offsetX,
          y: shape.y * scale + offsetY,
          w: shape.w * scale,
          h: shape.h * scale,
        };
    }
  });
}

function glyphShapes(id, depth = 0) {
  if (GLYPHS[id]) return GLYPHS[id];
  let base = baseOfVariant.get(id);
  if (base && depth < 6) {
    let marker = [
      {
        kind: "polygon",
        pts: [
          [88, 6],
          [95, 14],
          [88, 22],
          [81, 14],
        ],
      },
      { kind: "line", a: [88, 22], b: [88, 34], strokeWidth: 2 },
    ];
    return [...glyphShapes(base, depth + 1), ...marker];
  }
  let recipe = recipeOf.get(id);
  return recipe && depth < 6
    ? [
        ...shrinkShapes(glyphShapes(recipe[0], depth + 1), 0.62, 0, -2),
        ...shrinkShapes(glyphShapes(recipe[1], depth + 1), 0.62, 38, 40),
      ]
    : proceduralGlyph(id);
}

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function seededRng(seed) {
  let state = seed;
  return function () {
    ((state |= 0), (state = (state + 1831565813) | 0));
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    return (
      (mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed),
      ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    );
  };
}

function proceduralGlyph(blockId) {
  let hash = stringHash(blockId),
    rng = seededRng(hash ^ 2654435769),
    randRange = (lo, hi) => lo + (hi - lo) * rng(),
    diamondPoints = (cx, cy, halfW, halfH = halfW) => [
      [cx, cy - halfH],
      [cx + halfW, cy],
      [cx, cy + halfH],
      [cx - halfW, cy],
    ];
  switch (blockById.get(blockId)?.axis) {
    case "geological": {
      let sides = 6 + Math.floor(rng() * 3),
        points = [];
      for (let k = 0; k < sides; k++) {
        let angle = ((k + randRange(-0.25, 0.25)) / sides) * Math.PI * 2 - Math.PI / 2,
          radius = randRange(22, 36);
        points.push([50 + radius * Math.cos(angle), 52 + radius * 0.9 * Math.sin(angle)]);
      }
      let shapes = [{ kind: "polygon", pts: points, stroke: !0, strokeWidth: 2.5 }],
        center = [50 + randRange(-8, 8), 52 + randRange(-8, 8)];
      for (let vertexIndex of [0, Math.floor(sides / 3), Math.floor((2 * sides) / 3)].slice(
        0,
        2 + Math.floor(rng() * 2),
      ))
        shapes.push({ kind: "line", a: points[vertexIndex], b: center, strokeWidth: 1.5 });
      return (
        rng() < 0.5 && shapes.push({ kind: "polygon", pts: diamondPoints(center[0], center[1], 6) }),
        shapes
      );
    }
    case "weather": {
      let shapes = [];
      for (let row = 0; row < 3; row++) {
        let pts = [];
        for (let col = 0; col < 5; col++) pts.push([8 + col * 21, 28 + row * 22 + randRange(-9, 9)]);
        shapes.push({ kind: "polyline", pts: pts, strokeWidth: 3 });
      }
      for (let k = 0; k < 1 + Math.floor(rng() * 3); k++)
        shapes.push({ kind: "polygon", pts: diamondPoints(randRange(14, 86), randRange(14, 90), 4) });
      return shapes;
    }
    case "ecological": {
      let lean = randRange(-10, 10),
        shapes = [
          {
            kind: "polyline",
            pts: [
              [50, 94],
              [50 + lean * 0.5, 60],
              [50 + lean, 18],
            ],
            strokeWidth: 3.2,
          },
        ],
        branchCount = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < branchCount; k++) {
        let along = 0.22 + (0.62 * k) / branchCount + randRange(-0.04, 0.04),
          y = 94 - along * 76,
          x = 50 + lean * along,
          side = k % 2 ? 1 : -1,
          tip = [x + side * randRange(14, 26), y - randRange(8, 16)];
        (shapes.push({ kind: "line", a: [x, y], b: tip, strokeWidth: 2.5 }),
          rng() < 0.65 && shapes.push({ kind: "polygon", pts: diamondPoints(tip[0], tip[1], 4.5) }));
      }
      return shapes;
    }
    case "metaphysical": {
      let halfWidth = randRange(20, 30),
        shapes = [
          {
            kind: "polygon",
            pts:
              hash % 3 === 0
                ? [
                    [50 - halfWidth, 92],
                    [50 - halfWidth, 42],
                    [50, 12],
                    [50 + halfWidth, 42],
                    [50 + halfWidth, 92],
                  ]
                : hash % 3 === 1
                  ? [
                      [50 - halfWidth, 10],
                      [50 + halfWidth, 10],
                      [50 + halfWidth, 92],
                      [50 - halfWidth, 92],
                    ]
                  : diamondPoints(50, 52, halfWidth, randRange(34, 44)),
            stroke: !0,
            strokeWidth: 3,
          },
        ];
      for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
        let y = randRange(32, 74);
        rng() < 0.5
          ? shapes.push({
              kind: "line",
              a: [50 - randRange(6, 14), y],
              b: [50 + randRange(6, 14), y],
              strokeWidth: 2.5,
            })
          : shapes.push({ kind: "polygon", pts: diamondPoints(50 + randRange(-8, 8), y, 4) });
      }
      return shapes;
    }
    default: {
      let outerRadius = randRange(24, 34),
        innerRadius = outerRadius - 4,
        rotation = randRange(0, 40),
        pts = [];
      for (let k = 0; k < 6; k++) {
        let angle = (-90 + k * 60 + rotation) * (Math.PI / 180),
          radius = k % 2 === 0 ? outerRadius : innerRadius;
        pts.push([50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]);
      }
      let shapes = [{ kind: "polygon", pts: pts, stroke: !0, strokeWidth: 1.5 }];
      if (rng() < 0.5) shapes.push({ kind: "polygon", pts: diamondPoints(50, 50, 6) });
      else
        for (let k = 0; k < 2; k++)
          shapes.push({ kind: "polygon", pts: diamondPoints(randRange(40, 60), randRange(40, 60), 3) });
      for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
        let angle = rng() * Math.PI * 2;
        shapes.push({
          kind: "line",
          a: [50 + (outerRadius + 4) * Math.cos(angle), 50 + (outerRadius + 4) * Math.sin(angle)],
          b: [50 + (outerRadius + 12) * Math.cos(angle), 50 + (outerRadius + 12) * Math.sin(angle)],
          strokeWidth: 2,
        });
      }
      return shapes;
    }
  }
}

const TREMBLE = { none: 0, light: 0.3, medium: 0.6, strong: 1 };

function jitterPoint([x, y], amount, rng) {
  return amount === 0 ? [x, y] : [x + (rng() * 2 - 1) * amount, y + (rng() * 2 - 1) * amount];
}

function fixed1(value) {
  return value.toFixed(1);
}

function shapeSvg(shape, jitter, strokeScale, rng) {
  switch (shape.kind) {
    case "polygon": {
      let points = shape.pts
          .map((point) => jitterPoint(point, jitter, rng))
          .map(([x, y]) => `${fixed1(x)},${fixed1(y)}`)
          .join(" "),
        fillColor = shape.stroke ? "none" : "currentColor",
        strokeAttr = shape.stroke
          ? ` stroke="currentColor" stroke-width="${fixed1((shape.strokeWidth ?? 1.5) * strokeScale)}"`
          : "",
        opacityAttr = shape.opacity !== void 0 ? ` opacity="${shape.opacity}"` : "";
      return `<polygon points="${points}" fill="${fillColor}"${strokeAttr}${opacityAttr}/>`;
    }
    case "polyline":
      return `<polyline points="${shape.pts
        .map((point) => jitterPoint(point, jitter, rng))
        .map(([x, y]) => `${fixed1(x)},${fixed1(y)}`)
        .join(
          " ",
        )}" fill="none" stroke="currentColor" stroke-width="${fixed1(shape.strokeWidth * strokeScale)}" stroke-linejoin="miter" stroke-linecap="square"/>`;
    case "line": {
      let [x1, y1] = jitterPoint(shape.a, jitter, rng),
        [x2, y2] = jitterPoint(shape.b, jitter, rng);
      return `<line x1="${fixed1(x1)}" y1="${fixed1(y1)}" x2="${fixed1(x2)}" y2="${fixed1(y2)}" stroke="currentColor" stroke-width="${fixed1(shape.strokeWidth * strokeScale)}" stroke-linecap="square"/>`;
    }
    case "rect": {
      let [x, y] = jitterPoint([shape.x, shape.y], jitter * 0.5, rng);
      return `<rect x="${fixed1(x)}" y="${fixed1(y)}" width="${shape.w}" height="${shape.h}" fill="currentColor"/>`;
    }
  }
}

function glyphInner(id, tremble = "none") {
  let shapes = glyphShapes(id),
    amount = TREMBLE[tremble],
    jitter = amount * 3,
    strokeScale = 1 + amount * 0.6,
    rng = seededRng(stringHash(id));
  return shapes.map((shape) => shapeSvg(shape, jitter, strokeScale, rng)).join("");
}

function glyphSvg(id, x, y, size, tremble = "none") {
  let scale = size / 100,
    trembleClass = tremble === "none" ? "" : ` age-glyph--tremble-${tremble}`;
  return `<g transform="translate(${x},${y}) scale(${scale})"><g class="age-glyph${trembleClass}">${glyphInner(id, tremble)}</g></g>`;
}

module.exports = {
  EXTRA_GLYPHS,
  GLYPHS,
  TREMBLE,
  diamond,
  fill,
  fixed1,
  glyphInner,
  glyphShapes,
  glyphSvg,
  hexagon,
  jitterPoint,
  kite,
  lens,
  line,
  outline,
  polyline,
  proceduralGlyph,
  seededRng,
  shapeSvg,
  shrinkShapes,
  stringHash,
};
