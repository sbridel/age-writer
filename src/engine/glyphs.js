"use strict";
const { baseOfVariant, blockById, recipeOf } = require("./registry");

function hexagon(e, o, t) {
  let i = [];
  for (let r = 0; r < 6; r++) {
    let s = (-90 + r * 60) * (Math.PI / 180),
      n = r % 2 === 0 ? t : t * 0.85;
    i.push([e + n * Math.cos(s), o + n * Math.sin(s)]);
  }
  return i;
}

const diamond = (e, o, t, i = t) => [
  [e, o - i],
  [e + t, o],
  [e, o + i],
  [e - t, o],
];

const kite = (e, o, t, i) => [
  [e, o],
  [e + i, (o + t) / 2],
  [e, t],
  [e - i, (o + t) / 2],
];

const lens = (e, o, t, i) => [
  [e, t],
  [(e + o) / 2, t - i],
  [o, t],
  [(e + o) / 2, t + i],
];

const fill = (e, o) => ({ kind: "polygon", pts: e, opacity: o });

const outline = (e, o = 2) => ({ kind: "polygon", pts: e, stroke: !0, strokeWidth: o });

const polyline = (e, o = 3) => ({ kind: "polyline", pts: e, strokeWidth: o });

const line = (e, o, t = 2) => ({ kind: "line", a: e, b: o, strokeWidth: t });

const EXTRA_GLYPHS = {
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

function shrinkShapes(e, o, t, i) {
  let r = ([n, a]) => [n * o + t, a * o + i],
    s = (n) => n * Math.max(o * 1.3, 0.8);
  return e.map((n) => {
    switch (n.kind) {
      case "polygon":
        return { ...n, pts: n.pts.map(r), strokeWidth: n.strokeWidth ? s(n.strokeWidth) : void 0 };
      case "polyline":
        return { ...n, pts: n.pts.map(r), strokeWidth: s(n.strokeWidth) };
      case "line":
        return { ...n, a: r(n.a), b: r(n.b), strokeWidth: s(n.strokeWidth) };
      case "rect":
        return { ...n, x: n.x * o + t, y: n.y * o + i, w: n.w * o, h: n.h * o };
    }
  });
}

function glyphShapes(e, o = 0) {
  if (GLYPHS[e]) return GLYPHS[e];
  let t = baseOfVariant.get(e);
  if (t && o < 6) {
    let r = [
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
    return [...glyphShapes(t, o + 1), ...r];
  }
  let i = recipeOf.get(e);
  return i && o < 6
    ? [
        ...shrinkShapes(glyphShapes(i[0], o + 1), 0.62, 0, -2),
        ...shrinkShapes(glyphShapes(i[1], o + 1), 0.62, 38, 40),
      ]
    : proceduralGlyph(e);
}

function stringHash(e) {
  let o = 0;
  for (let t = 0; t < e.length; t++) o = (o * 31 + e.charCodeAt(t)) | 0;
  return Math.abs(o);
}

function seededRng(e) {
  let o = e;
  return function () {
    ((o |= 0), (o = (o + 1831565813) | 0));
    let t = Math.imul(o ^ (o >>> 15), 1 | o);
    return ((t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t), ((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

function proceduralGlyph(e) {
  let o = stringHash(e),
    t = seededRng(o ^ 2654435769),
    i = (s, n) => s + (n - s) * t(),
    r = (s, n, a, c = a) => [
      [s, n - c],
      [s + a, n],
      [s, n + c],
      [s - a, n],
    ];
  switch (blockById.get(e)?.axis) {
    case "geological": {
      let s = 6 + Math.floor(t() * 3),
        n = [];
      for (let g = 0; g < s; g++) {
        let h = ((g + i(-0.25, 0.25)) / s) * Math.PI * 2 - Math.PI / 2,
          u = i(22, 36);
        n.push([50 + u * Math.cos(h), 52 + u * 0.9 * Math.sin(h)]);
      }
      let a = [{ kind: "polygon", pts: n, stroke: !0, strokeWidth: 2.5 }],
        c = [50 + i(-8, 8), 52 + i(-8, 8)];
      for (let g of [0, Math.floor(s / 3), Math.floor((2 * s) / 3)].slice(0, 2 + Math.floor(t() * 2)))
        a.push({ kind: "line", a: n[g], b: c, strokeWidth: 1.5 });
      return (t() < 0.5 && a.push({ kind: "polygon", pts: r(c[0], c[1], 6) }), a);
    }
    case "weather": {
      let s = [];
      for (let n = 0; n < 3; n++) {
        let a = [];
        for (let c = 0; c < 5; c++) a.push([8 + c * 21, 28 + n * 22 + i(-9, 9)]);
        s.push({ kind: "polyline", pts: a, strokeWidth: 3 });
      }
      for (let n = 0; n < 1 + Math.floor(t() * 3); n++)
        s.push({ kind: "polygon", pts: r(i(14, 86), i(14, 90), 4) });
      return s;
    }
    case "ecological": {
      let s = i(-10, 10),
        n = [
          {
            kind: "polyline",
            pts: [
              [50, 94],
              [50 + s * 0.5, 60],
              [50 + s, 18],
            ],
            strokeWidth: 3.2,
          },
        ],
        a = 2 + Math.floor(t() * 3);
      for (let c = 0; c < a; c++) {
        let g = 0.22 + (0.62 * c) / a + i(-0.04, 0.04),
          h = 94 - g * 76,
          u = 50 + s * g,
          l = c % 2 ? 1 : -1,
          d = [u + l * i(14, 26), h - i(8, 16)];
        (n.push({ kind: "line", a: [u, h], b: d, strokeWidth: 2.5 }),
          t() < 0.65 && n.push({ kind: "polygon", pts: r(d[0], d[1], 4.5) }));
      }
      return n;
    }
    case "metaphysical": {
      let s = i(20, 30),
        a = [
          {
            kind: "polygon",
            pts:
              o % 3 === 0
                ? [
                    [50 - s, 92],
                    [50 - s, 42],
                    [50, 12],
                    [50 + s, 42],
                    [50 + s, 92],
                  ]
                : o % 3 === 1
                  ? [
                      [50 - s, 10],
                      [50 + s, 10],
                      [50 + s, 92],
                      [50 - s, 92],
                    ]
                  : r(50, 52, s, i(34, 44)),
            stroke: !0,
            strokeWidth: 3,
          },
        ];
      for (let c = 0; c < 1 + Math.floor(t() * 3); c++) {
        let g = i(32, 74);
        t() < 0.5
          ? a.push({ kind: "line", a: [50 - i(6, 14), g], b: [50 + i(6, 14), g], strokeWidth: 2.5 })
          : a.push({ kind: "polygon", pts: r(50 + i(-8, 8), g, 4) });
      }
      return a;
    }
    default: {
      let s = i(24, 34),
        n = s - 4,
        a = i(0, 40),
        c = [];
      for (let h = 0; h < 6; h++) {
        let u = (-90 + h * 60 + a) * (Math.PI / 180),
          l = h % 2 === 0 ? s : n;
        c.push([50 + l * Math.cos(u), 50 + l * Math.sin(u)]);
      }
      let g = [{ kind: "polygon", pts: c, stroke: !0, strokeWidth: 1.5 }];
      if (t() < 0.5) g.push({ kind: "polygon", pts: r(50, 50, 6) });
      else for (let h = 0; h < 2; h++) g.push({ kind: "polygon", pts: r(i(40, 60), i(40, 60), 3) });
      for (let h = 0; h < 1 + Math.floor(t() * 3); h++) {
        let u = t() * Math.PI * 2;
        g.push({
          kind: "line",
          a: [50 + (s + 4) * Math.cos(u), 50 + (s + 4) * Math.sin(u)],
          b: [50 + (s + 12) * Math.cos(u), 50 + (s + 12) * Math.sin(u)],
          strokeWidth: 2,
        });
      }
      return g;
    }
  }
}

const TREMBLE = { none: 0, light: 0.3, medium: 0.6, strong: 1 };

function jitterPoint([e, o], t, i) {
  return t === 0 ? [e, o] : [e + (i() * 2 - 1) * t, o + (i() * 2 - 1) * t];
}

function fixed1(e) {
  return e.toFixed(1);
}

function shapeSvg(e, o, t, i) {
  switch (e.kind) {
    case "polygon": {
      let s = e.pts
          .map((g) => jitterPoint(g, o, i))
          .map(([g, h]) => `${fixed1(g)},${fixed1(h)}`)
          .join(" "),
        n = e.stroke ? "none" : "currentColor",
        a = e.stroke ? ` stroke="currentColor" stroke-width="${fixed1((e.strokeWidth ?? 1.5) * t)}"` : "",
        c = e.opacity !== void 0 ? ` opacity="${e.opacity}"` : "";
      return `<polygon points="${s}" fill="${n}"${a}${c}/>`;
    }
    case "polyline":
      return `<polyline points="${e.pts
        .map((n) => jitterPoint(n, o, i))
        .map(([n, a]) => `${fixed1(n)},${fixed1(a)}`)
        .join(
          " ",
        )}" fill="none" stroke="currentColor" stroke-width="${fixed1(e.strokeWidth * t)}" stroke-linejoin="miter" stroke-linecap="square"/>`;
    case "line": {
      let [r, s] = jitterPoint(e.a, o, i),
        [n, a] = jitterPoint(e.b, o, i);
      return `<line x1="${fixed1(r)}" y1="${fixed1(s)}" x2="${fixed1(n)}" y2="${fixed1(a)}" stroke="currentColor" stroke-width="${fixed1(e.strokeWidth * t)}" stroke-linecap="square"/>`;
    }
    case "rect": {
      let [r, s] = jitterPoint([e.x, e.y], o * 0.5, i);
      return `<rect x="${fixed1(r)}" y="${fixed1(s)}" width="${e.w}" height="${e.h}" fill="currentColor"/>`;
    }
  }
}

function glyphInner(e, o = "none") {
  let t = glyphShapes(e),
    i = TREMBLE[o],
    r = i * 3,
    s = 1 + i * 0.6,
    n = seededRng(stringHash(e));
  return t.map((a) => shapeSvg(a, r, s, n)).join("");
}

function glyphSvg(e, o, t, i, r = "none") {
  let s = i / 100,
    n = r === "none" ? "" : ` age-glyph--tremble-${r}`;
  return `<g transform="translate(${o},${t}) scale(${s})"><g class="age-glyph${n}">${glyphInner(e, r)}</g></g>`;
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
