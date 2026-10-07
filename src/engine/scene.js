"use strict";

function hashString(e) {
  let o = 2166136261;
  for (let t = 0; t < e.length; t++) o = Math.imul(o ^ e.charCodeAt(t), 16777619);
  return o >>> 0;
}

function windowScene(e, o = "") {
  let t = e.resolved,
    i = new Set();
  for (let n of t.lines) n.entry && i.add(n.entry.id);
  for (let n of t.matter.written) i.add(n);
  for (let n of t.matter.reactions) i.add(n.result);
  let r = (...n) => n.some((a) => i.has(a)),
    s = [];
  return (
    r("door", "sealed_door") && s.push("door"),
    r("bridge", "fallen_bridge") && s.push("bridge"),
    r("tablet", "worn_tablet", "speaking_tablet") && s.push("tablet"),
    r("lamp", "lit_lamp") && s.push("lamp"),
    {
      seed: hashString(o + "|" + [...i].sort().join(",")),
      verdict: e.verdict,
      unrest: Math.max(0, Math.min(1, 1 - e.stability / 100)),
      suns: r("twin_suns") ? 2 : r("single_sun") ? 1 : 0,
      skyStated: r("twin_suns", "single_sun", "starless"),
      moon: r("companion_moon"),
      cycle: r("frozen_cycle") ? "frozen" : r("erratic_cycle") ? "erratic" : "steady",
      chaos: r("chaotic_orbit"),
      veil: r("permanent_veil"),
      auroras: r("auroras"),
      eclipses: r("recurring_eclipses"),
      starfall: r("starfall"),
      rain: r("rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
      storm: r("storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
      wind: r(
        "wind",
        "storm",
        "thunderstorm",
        "dust_storm",
        "ash_cloud",
        "spore_cloud",
        "whispering_storm",
        "waiting_thunder",
      ),
      fog: r("fog", "marsh_mist", "rime", "watching_mist"),
      lightning: r("lightning", "thunderstorm", "waiting_thunder"),
      heat: r("heat"),
      hail: r("hail", "black_hail"),
      steam: r("steam"),
      dust: r("dust_storm"),
      ash: r("ash_cloud"),
      lava: r("lava", "obsidian", "whispering_obsidian"),
      water: r("water", "marsh_mist", "brine", "meltwater", "crying_obsidian"),
      ice: r("ice", "black_ice", "deep_cold", "hail", "rime"),
      sand: r("sand", "dust_storm", "glass", "singing_glass", "fulgurite"),
      trees: r("grove") ? 5 : r("great_tree", "ironwood", "charred_grove") ? 3 : 0,
      burnt: r("charred_grove", "wildfire"),
      fire: r("wildfire"),
      moths: r("moth", "lantern_moths", "whispering_moths"),
      glow: r("glowvine", "wrong_glowvine"),
      eyes: r("hunter", "stalking_pack"),
      ruins: s,
      lampLit: r("lit_lamp"),
      tabletAwake: r("speaking_tablet"),
      fissure: r("no_fissure")
        ? null
        : r("cave_fissure")
          ? "cave"
          : r("submarine_fissure", "fissure")
            ? r("water")
              ? "submarine"
              : "open"
            : null,
    }
  );
}

const TAU = Math.PI * 2;

function mulberry32(e) {
  let o = e >>> 0;
  return () => {
    o = (o + 1831565813) | 0;
    let t = Math.imul(o ^ (o >>> 15), 1 | o);
    return ((t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t), ((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

const smoothstep = (e) => {
  let o = Math.max(0, Math.min(1, e));
  return o * o * (3 - 2 * o);
};

function mixHex(e, o, t) {
  let i = (u) => [1, 3, 5].map((l) => parseInt(u.slice(l, l + 2), 16)),
    [r, s, n] = i(e),
    [a, c, g] = i(o),
    h = (u) => Math.round(u).toString(16).padStart(2, "0");
  return `#${h(r + (a - r) * t)}${h(s + (c - s) * t)}${h(n + (g - n) * t)}`;
}

const rgba = (e, o, t, i) => `rgba(${e},${o},${t},${Math.max(0, Math.min(1, i)).toFixed(3)})`;

const frac = (e) => e - Math.floor(e);

function paintWindow(e, o, t, i, r) {
  t = frac(t);
  let s = mulberry32(o.seed),
    n = r * 0.72;
  (e.save(), e.clearRect(0, 0, i, r));
  let a = [0, 1, 2, 3, 4, 5, 6].map(() => s()),
    c = Math.floor(t * 6),
    g = 0.7,
    h = (p) => n + p * 1.4,
    u = (p, y, b) => {
      let v = Math.sin(Math.PI * p);
      return { x: i * (0.06 + 0.88 * p), y: h(b) - v * (h(b) - r * y), e: v };
    },
    l = [];
  for (let p = 0; p < o.suns; p++) {
    let y = r * (p === 0 ? 0.085 : 0.055),
      b = null;
    if (o.cycle === "frozen") b = { x: i * (0.7 - 0.25 * p), y: n - r * 0.1, e: 0.12 };
    else if (o.cycle === "erratic") {
      let _ = r * (0.22 + 0.34 * a[(c + p + 2) % 7]);
      b = { x: i * (0.2 + 0.6 * a[(c + p) % 7]), y: _, e: Math.max(0, Math.min(1, (n - _) / (n * 0.8))) };
    } else {
      let _ = frac(t - p * 0.1);
      _ <= g && (b = u(_ / g, 0.14, y));
    }
    if (!b) continue;
    let v = o.chaos
      ? { x: i * 0.05 * Math.sin(TAU * t * 5 + p * 2), y: r * 0.04 * Math.sin(TAU * t * 7 + p) }
      : { x: 0, y: 0 };
    l.push({ idx: p, x: b.x + v.x, y: b.y + v.y, r: y, e: b.e });
  }
  let d =
      o.suns === 0
        ? 0
        : o.cycle === "frozen"
          ? 0.2
          : o.cycle === "erratic"
            ? 0.2 + 0.6 * a[c]
            : Math.max(0, ...l.map((p) => p.e)),
    f = smoothstep(d * 3),
    m = smoothstep((d - 0.25) / 0.75),
    k = e.createLinearGradient(0, 0, 0, n);
  (k.addColorStop(0, o.skyStated ? mixHex(mixHex("#04050b", "#241d3d", f), "#2f4d7a", m) : "#161a26"),
    k.addColorStop(1, o.skyStated ? mixHex(mixHex("#12141f", "#b05a36", f), "#c2a98c", m) : "#2e3040"),
    (e.fillStyle = k),
    e.fillRect(0, 0, i, r),
    o.storm && ((e.fillStyle = rgba(14, 17, 24, 0.5)), e.fillRect(0, 0, i, r)),
    o.veil && ((e.fillStyle = rgba(190, 190, 202, 0.2)), e.fillRect(0, 0, i, r)));
  let w = o.skyStated ? (o.suns === 0 ? 70 : 36) : 26,
    x = (o.storm ? 0.25 : 1) * (o.veil ? 0.5 : 1) * (1 - Math.min(1, d * 1.4));
  for (let p = 0; p < w; p++) {
    let y = s() * i,
      b = s() * n * 0.9,
      v = 3 * (1 + (p % 3)),
      _ = s(),
      P =
        (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * (t * v + _)))) *
        x *
        (o.skyStated ? (o.suns === 0 ? 1 : 0.55) : 0.7);
    ((e.fillStyle = rgba(230, 230, 245, P)), e.fillRect(y, b, 1.2, 1.2));
  }
  for (let p of l) {
    let y = e.createRadialGradient(p.x, p.y, p.r * 0.5, p.x, p.y, p.r * 5),
      b = 0.5 * Math.max(Math.pow(Math.max(0, p.e), 0.6), o.cycle === "frozen" ? 0.7 : 0);
    (y.addColorStop(0, p.idx === 0 ? rgba(255, 214, 150, b) : rgba(190, 215, 255, b * 0.8)),
      y.addColorStop(1, rgba(255, 214, 150, 0)),
      (e.fillStyle = y),
      e.fillRect(0, 0, i, r),
      (e.fillStyle = p.idx === 0 ? "#f6e0a8" : "#cfe0f4"),
      e.beginPath(),
      e.arc(p.x, p.y, p.r, 0, TAU),
      e.fill());
  }
  let A = l.find((p) => p.idx === 0);
  if (
    (o.eclipses &&
      A &&
      ((e.fillStyle = "#05060a"),
      e.beginPath(),
      e.arc(A.x + A.r * 2.4 * Math.cos(TAU * t), A.y + A.r * 0.15 * Math.sin(TAU * t), A.r * 1.02, 0, TAU),
      e.fill()),
    o.moon)
  ) {
    let p = r * 0.045,
      y = null;
    if (o.cycle === "frozen") y = { x: i * 0.3, y: r * 0.3 };
    else {
      let b = frac(t - 0.6);
      b <= g && (y = u(b / g, 0.2, p));
    }
    y &&
      ((e.fillStyle = "#cfd6e2"),
      e.beginPath(),
      e.arc(y.x, y.y, p, 0, TAU),
      e.fill(),
      (e.fillStyle = rgba(10, 12, 20, 0.5)),
      e.beginPath(),
      e.arc(y.x + p * 0.45, y.y - p * 0.2, p * 0.9, 0, TAU),
      e.fill());
  }
  if (o.auroras) {
    (e.save(), (e.globalCompositeOperation = "lighter"));
    let p = [
      [80, 220, 160],
      [150, 120, 230],
      [90, 190, 220],
    ];
    for (let y = 0; y < 3; y++) {
      let b = r * (0.16 + 0.08 * y),
        v = r * 0.05,
        _ = 2 + y;
      ((e.strokeStyle = rgba(...p[y], 0.32)),
        (e.lineWidth = r * 0.045),
        (e.lineCap = "round"),
        e.beginPath());
      for (let P = 0; P <= i; P += 6) {
        let R =
          b +
          v * Math.sin((P / i) * TAU * (_ / 2) + TAU * t * (y % 2 ? -1 : 1)) +
          v * 0.4 * Math.sin((P / i) * TAU * 3 + TAU * t * 2);
        P === 0 ? e.moveTo(P, R) : e.lineTo(P, R);
      }
      e.stroke();
    }
    e.restore();
  }
  if (o.starfall)
    for (let p = 0; p < 3; p++) {
      let y = s() * i * 0.7,
        b = s() * n * 0.4,
        v = frac(t + p / 3);
      if (v > 0.3) continue;
      let _ = v / 0.3,
        P = r * 0.22;
      ((e.strokeStyle = rgba(255, 255, 255, 0.8 * (1 - _))),
        (e.lineWidth = 1.3),
        e.beginPath(),
        e.moveTo(y + _ * i * 0.28, b + _ * r * 0.24),
        e.lineTo(y + _ * i * 0.28 - P * 0.8, b + _ * r * 0.24 - P * 0.6),
        e.stroke());
    }
  let $ = o.ice ? "#1a2430" : "#0c0d14";
  ((e.fillStyle = $), e.beginPath(), e.moveTo(0, n));
  let F = 8;
  for (let p = 0; p <= F; p++) e.lineTo((p / F) * i, n - r * (0.04 + 0.12 * s()) * (p % 2 ? 1 : 0.5));
  (e.lineTo(i, n), e.closePath(), e.fill());
  let M = o.lava ? "#26120e" : o.ice ? "#27333f" : o.sand ? "#3d3022" : o.water ? "#14201f" : "#15130f";
  if (((e.fillStyle = M), e.fillRect(0, n, i, r - n), o.sand)) {
    e.fillStyle = "#4f3e2b";
    for (let p = 0; p < 3; p++) {
      (e.beginPath(), e.moveTo(0, r));
      for (let y = 0; y <= i; y += 8)
        e.lineTo(y, n + r * (0.07 + 0.06 * p) + r * 0.025 * Math.sin((y / i) * TAU * (1 + p) + p * 2));
      (e.lineTo(i, r), e.closePath(), e.fill());
    }
  }
  if (o.water) {
    let p = e.createLinearGradient(0, n + r * 0.03, 0, r);
    (p.addColorStop(0, "#1f3f48"),
      p.addColorStop(1, "#0b181c"),
      (e.fillStyle = p),
      e.fillRect(0, n + r * 0.03, i, r));
    for (let b = 0; b < 9; b++) {
      let v = n + r * (0.05 + 0.2 * s()),
        _ = i * (0.08 + 0.1 * s()),
        P = s(),
        R = frac(P + t) * (i + _) - _;
      ((e.fillStyle = rgba(200, 225, 235, 0.22)), e.fillRect(R, v, _, 1.2));
    }
    let y = l.find((b) => b.e > 0.15);
    if (y)
      for (let b = 0; b < 6; b++)
        ((e.fillStyle = rgba(255, 220, 160, (0.28 - b * 0.03) * Math.min(1, y.e * 2))),
          e.fillRect(
            y.x - (14 - b * 2) * 0.5 + 3 * Math.sin(TAU * (t * 2 + b * 0.2)),
            n + r * (0.05 + 0.045 * b),
            14 - b * 2,
            1.5,
          ));
  }
  if (o.lava) {
    for (let p = 0; p < 5; p++) {
      let y = n + r * (0.06 + 0.05 * p);
      ((e.strokeStyle = rgba(255, 122, 48, 0.55 + 0.4 * Math.sin(TAU * (t * 2 + p * 0.37)))),
        (e.lineWidth = 1.6),
        e.beginPath(),
        e.moveTo(s() * i * 0.2, y));
      for (let b = 1; b <= 6; b++) e.lineTo((b / 6) * i * (0.7 + 0.3 * s()), y + (s() - 0.5) * r * 0.04);
      e.stroke();
    }
    for (let p = 0; p < 14; p++) {
      let y = s() * i,
        b = s(),
        v = frac(t * 3 + b);
      ((e.fillStyle = rgba(255, 150, 70, 1 - v)),
        e.fillRect(y + 6 * Math.sin(TAU * (v + b)), n + r * 0.1 - v * r * 0.45, 1.5, 1.5));
    }
  }
  if (o.ice)
    for (let p = 0; p < 16; p++) {
      let y = s() * i,
        b = n + s() * (r - n),
        v = s();
      ((e.fillStyle = rgba(225, 240, 255, 0.15 + 0.6 * Math.max(0, Math.sin(TAU * (t * 2 + v))) ** 3)),
        e.fillRect(y, b, 1.4, 1.4));
    }
  if (o.fissure === "submarine") {
    let p = i * (0.22 + 0.56 * s()),
      y = n + (r - n) * 0.3,
      b = 0.5 + 0.5 * Math.sin(TAU * t * 3),
      v = [];
    for (let P = 0; P <= 5; P++) v.push([p + (s() - 0.5) * i * 0.05 + P * 1.2, y + (r - y - 2) * (P / 5)]);
    let _ = () => {
      (e.beginPath(),
        v.forEach(([P, R], E) => {
          let z = 1.6 * Math.sin(TAU * (t * 2 + E * 0.45));
          E === 0 ? e.moveTo(P + z, R) : e.lineTo(P + z, R);
        }),
        e.stroke());
    };
    ((e.lineJoin = "miter"),
      (e.strokeStyle = rgba(110, 190, 225, 0.12 + 0.08 * b)),
      (e.lineWidth = 9),
      _(),
      (e.strokeStyle = rgba(170, 225, 245, 0.4 + 0.3 * b)),
      (e.lineWidth = 1.6),
      _());
    for (let P = 0; P < 7; P++) {
      let R = s(),
        E = (s() - 0.5) * 9,
        z = frac(t * 2 + R);
      ((e.strokeStyle = rgba(205, 235, 248, 0.5 * (1 - z))),
        (e.lineWidth = 0.9),
        e.beginPath(),
        e.arc(p + E + 2 * Math.sin(TAU * (z * 2 + R)), r - 4 - z * (r - y - 8), 1 + 1.4 * R, 0, TAU),
        e.stroke());
    }
  } else if (o.fissure === "open") {
    let p = i * (0.2 + 0.6 * s()),
      y = 0.5 + 0.5 * Math.sin(TAU * t * 3),
      b = [];
    for (let _ = 0; _ <= 6; _++)
      b.push([p + (s() - 0.5) * i * 0.07 + _ * 1.5, n + 2 + (r - n - 2) * (_ / 6)]);
    let v = () => {
      (e.beginPath(), b.forEach(([_, P], R) => (R === 0 ? e.moveTo(_, P) : e.lineTo(_, P))), e.stroke());
    };
    ((e.lineJoin = "miter"),
      (e.strokeStyle = rgba(150, 215, 255, 0.1 + 0.08 * y)),
      (e.lineWidth = 7),
      v(),
      (e.strokeStyle = rgba(205, 238, 255, 0.55 + 0.4 * y)),
      (e.lineWidth = 1.8),
      v());
  }
  if (o.fissure === "cave") {
    let p = i * (0.18 + 0.64 * s()),
      y = r * 0.17,
      b = r * 0.22,
      v = 0.5 + 0.5 * Math.sin(TAU * t * 3);
    ((e.fillStyle = "#040406"),
      (e.strokeStyle = "#2c2a36"),
      (e.lineWidth = 1),
      e.beginPath(),
      e.moveTo(p - y, n + 4),
      e.lineTo(p - y, n - b * 0.55),
      e.quadraticCurveTo(p, n - b * 1.25, p + y, n - b * 0.55),
      e.lineTo(p + y, n + 4),
      e.closePath(),
      e.fill(),
      e.stroke(),
      (e.strokeStyle = rgba(190, 230, 255, 0.5 + 0.4 * v)),
      (e.lineWidth = 1.6),
      e.beginPath(),
      e.moveTo(p, n - b * 0.7),
      e.lineTo(p - 2, n - b * 0.4),
      e.lineTo(p + 2, n - b * 0.15),
      e.lineTo(p, n + 2),
      e.stroke());
  }
  for (let p = 0; p < o.trees; p++) {
    let y = i * (0.08 + (0.84 * (p + s() * 0.6)) / Math.max(1, o.trees)),
      b = r * (0.2 + 0.1 * s()),
      v = 1.6 * Math.sin(TAU * t + p);
    if (
      ((e.fillStyle = o.burnt ? "#0a0909" : "#070b08"),
      e.beginPath(),
      e.moveTo(y - 2.5, n + 3),
      e.lineTo(y + v * 0.4, n - b),
      e.lineTo(y + 2.5, n + 3),
      e.fill(),
      o.burnt)
    ) {
      ((e.strokeStyle = "#0a0909"), (e.lineWidth = 1.4));
      for (let _ of [-1, 1])
        (e.beginPath(),
          e.moveTo(y + v * 0.3, n - b * 0.7),
          e.lineTo(y + _ * b * 0.3 + v, n - b * 0.95),
          e.stroke());
    } else
      (e.beginPath(),
        e.moveTo(y - b * 0.42 + v, n - b * 0.5),
        e.lineTo(y + v * 1.2, n - b * 1.15),
        e.lineTo(y + b * 0.42 + v, n - b * 0.5),
        e.fill());
    if (o.fire)
      for (let _ = 0; _ < 3; _++) {
        let P = 0.5 + 0.5 * Math.sin(TAU * (t * 3 + _ * 0.31 + p * 0.2));
        ((e.fillStyle = rgba(255, 140 + 60 * P, 40, 0.8)), e.beginPath());
        let R = y + (_ - 1) * 4 + v;
        (e.moveTo(R - 2, n - b * 0.7),
          e.lineTo(R, n - b * (0.9 + 0.25 * P)),
          e.lineTo(R + 2, n - b * 0.7),
          e.fill());
      }
  }
  if (
    (o.ruins.forEach((p, y) => {
      let b = i * (0.2 + 0.6 * ((y + s()) / Math.max(1, o.ruins.length)));
      if (((e.fillStyle = "#08080d"), (e.strokeStyle = "#2c2a36"), (e.lineWidth = 1), p === "door")) {
        let v = r * 0.1,
          _ = r * 0.24;
        (e.beginPath(),
          e.moveTo(b - v, n + 2),
          e.lineTo(b - v, n - _ * 0.7),
          e.lineTo(b, n - _),
          e.lineTo(b + v, n - _ * 0.7),
          e.lineTo(b + v, n + 2),
          e.closePath(),
          e.fill(),
          e.stroke());
      } else if (p === "bridge") {
        let v = i * 0.2;
        (e.beginPath(),
          e.moveTo(b - v, n + 2),
          e.quadraticCurveTo(b, n - r * 0.22, b + v, n + 2),
          e.lineTo(b + v, n + 6),
          e.lineTo(b - v, n + 6),
          e.closePath(),
          e.fill(),
          e.stroke());
      } else if (p === "tablet") {
        let v = r * 0.07,
          _ = r * 0.2;
        (e.fillRect(b - v, n - _, v * 2, _ + 2),
          e.strokeRect(b - v, n - _, v * 2, _ + 2),
          o.tabletAwake &&
            ((e.fillStyle = rgba(255, 190, 110, 0.35 + 0.3 * Math.sin(TAU * t * 2))),
            e.fillRect(b - v + 3, n - _ + 6, v * 2 - 6, 1.4),
            e.fillRect(b - v + 3, n - _ + 12, v * 2 - 10, 1.4)));
      } else if ((e.fillRect(b - 1.2, n - r * 0.16, 2.4, r * 0.16 + 2), o.lampLit)) {
        let v = e.createRadialGradient(b, n - r * 0.17, 1, b, n - r * 0.17, r * 0.2);
        (v.addColorStop(0, rgba(140, 190, 255, 0.55 + 0.15 * Math.sin(TAU * t * 3))),
          v.addColorStop(1, rgba(140, 190, 255, 0)),
          (e.fillStyle = v),
          e.fillRect(0, 0, i, r),
          (e.fillStyle = "#cfe3ff"),
          e.beginPath(),
          e.arc(b, n - r * 0.17, 2.4, 0, TAU),
          e.fill());
      } else ((e.fillStyle = "#2c2a36"), e.beginPath(), e.arc(b, n - r * 0.17, 2.2, 0, TAU), e.fill());
    }),
    o.glow)
  )
    for (let p = 0; p < 7; p++) {
      let y = i * (0.1 + 0.12 * p),
        b = n - r * (0.03 + 0.07 * Math.abs(Math.sin(p * 1.7))),
        v = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(TAU * (t * 2 + p * 0.17))),
        _ = e.createRadialGradient(y, b, 0, y, b, 9);
      (_.addColorStop(0, rgba(170, 240, 210, v)),
        _.addColorStop(1, rgba(170, 240, 210, 0)),
        (e.fillStyle = _),
        e.fillRect(y - 10, b - 10, 20, 20));
    }
  if (o.eyes) {
    let p = i * (0.25 + 0.5 * s());
    frac(t * 2) < 0.82 &&
      ((e.fillStyle = "#ffd070"), e.fillRect(p, n - 1, 2, 2), e.fillRect(p + 6, n - 1, 2, 2));
  }
  if (o.moths) {
    let p = i * (0.3 + 0.4 * s()),
      y = n - r * 0.22;
    for (let b = 0; b < 6; b++) {
      let v = 1 + (b % 3),
        _ = b / 6,
        P = p + i * 0.1 * Math.cos(TAU * (t * v + _)),
        R = y + r * 0.07 * Math.sin(TAU * (t * v + _ * 1.3)),
        E = e.createRadialGradient(P, R, 0, P, R, 6);
      (E.addColorStop(0, rgba(246, 230, 168, 0.9)),
        E.addColorStop(1, rgba(246, 230, 168, 0)),
        (e.fillStyle = E),
        e.fillRect(P - 6, R - 6, 12, 12));
    }
  }
  if (o.fog)
    for (let p = 0; p < 4; p++) {
      let y = n - r * (0.18 - 0.07 * p),
        b = 22 * Math.sin(TAU * t + p);
      ((e.fillStyle = rgba(214, 218, 226, 0.13)), e.fillRect(b - 20, y, i + 40, r * 0.1));
    }
  if (o.heat) {
    ((e.strokeStyle = rgba(255, 190, 120, 0.13)), (e.lineWidth = 1.4));
    for (let p = 0; p < 8; p++) {
      let y = i * (0.08 + 0.12 * p);
      e.beginPath();
      for (let b = n; b > n - r * 0.3; b -= 3) {
        let v = (n - b) / (r * 0.3),
          _ = y + 3 * Math.sin(v * 9 - TAU * t * 2 + p);
        b === n ? e.moveTo(_, b) : e.lineTo(_, b);
      }
      e.stroke();
    }
  }
  if (o.steam || o.ash || o.dust) {
    let [p, y, b] = o.ash ? [70, 70, 76] : o.dust ? [160, 120, 80] : [235, 235, 240];
    for (let v = 0; v < 6; v++) {
      let _ = s(),
        P = s(),
        R = o.steam ? frac(t + P) : 0,
        E = o.steam ? i * _ + 8 * Math.sin(TAU * (t + _)) : frac(_ + t) * (i + 80) - 40,
        z = o.steam ? n - R * r * 0.55 : r * (0.1 + 0.4 * P),
        U = r * (o.steam ? 0.06 + 0.07 * R : 0.12),
        ee = e.createRadialGradient(E, z, 0, E, z, U);
      (ee.addColorStop(0, rgba(p, y, b, o.steam ? 0.28 * (1 - R) : 0.3)),
        ee.addColorStop(1, rgba(p, y, b, 0)),
        (e.fillStyle = ee),
        e.fillRect(E - U, z - U, U * 2, U * 2));
    }
  }
  if (o.rain) {
    let p = o.storm ? 120 : 64;
    ((e.strokeStyle = rgba(190, 205, 225, o.storm ? 0.4 : 0.3)), (e.lineWidth = 1), e.beginPath());
    for (let y = 0; y < p; y++) {
      let b = s() * i,
        v = s(),
        _ = frac(v + t * 4) * (r + 20) - 10,
        P = o.wind ? 0.35 : 0.1,
        R = b + _ * P;
      (e.moveTo(R, _), e.lineTo(R + (o.wind ? 4 : 1.5), _ + 7));
    }
    e.stroke();
  }
  if (o.hail) {
    e.fillStyle = rgba(240, 245, 255, 0.75);
    for (let p = 0; p < 26; p++) {
      let y = s() * i,
        b = s();
      e.fillRect(y, frac(b + t * 5) * (r + 10) - 5, 1.8, 1.8);
    }
  }
  if (o.wind) {
    ((e.strokeStyle = rgba(210, 220, 235, 0.22)), (e.lineWidth = 1));
    for (let p = 0; p < 12; p++) {
      let y = s() * n,
        b = s(),
        v = i * (0.08 + 0.14 * s()),
        _ = frac(b + t * 3) * (i + v) - v;
      (e.beginPath(), e.moveTo(_, y), e.lineTo(_ + v, y), e.stroke());
    }
  }
  if (o.lightning) {
    let p = 0;
    ([0.15, 0.2, 0.62].forEach((b, v) => {
      let _ = i * (0.2 + 0.6 * s()),
        P = Math.min(Math.abs(t - b), 1 - Math.abs(t - b)),
        R = Math.max(0, 1 - P / 0.025) ** 2;
      if (((p = Math.max(p, R)), R > 0.25)) {
        ((e.strokeStyle = rgba(255, 255, 255, 0.9 * R)), (e.lineWidth = 2), e.beginPath(), e.moveTo(_, 0));
        let E = mulberry32(o.seed + v * 977),
          z = _;
        for (let U = 0; U < n; U += n / 7) ((z += (E() - 0.5) * 22), e.lineTo(z, U + n / 7));
        e.stroke();
      }
    }),
      p > 0 && ((e.fillStyle = rgba(235, 240, 255, 0.34 * p)), e.fillRect(0, 0, i, r)));
  }
  if (o.unrest > 0.25 && o.verdict !== "stable") {
    ((e.fillStyle = rgba(0, 0, 0, 0.12 * o.unrest * (0.5 + 0.5 * Math.sin(TAU * t * 9)))),
      e.fillRect(0, 0, i, r));
    for (let p = 0; p < 28; p++)
      ((e.fillStyle = rgba(200, 200, 200, 0.16 * o.unrest)), e.fillRect(s() * i, s() * r, 1.2, 1.2));
  }
  let T = e.createRadialGradient(i / 2, r / 2, r * 0.35, i / 2, r / 2, i * 0.62);
  (T.addColorStop(0, rgba(0, 0, 0, 0)),
    T.addColorStop(1, rgba(0, 0, 0, 0.7)),
    (e.fillStyle = T),
    e.fillRect(0, 0, i, r),
    e.restore());
}

const WINDOW_W = 240;

const WINDOW_H = 144;

const WINDOW_LOOP_MS = 8e3;

module.exports = {
  TAU,
  WINDOW_H,
  WINDOW_LOOP_MS,
  WINDOW_W,
  frac,
  hashString,
  mixHex,
  mulberry32,
  paintWindow,
  rgba,
  smoothstep,
  windowScene,
};
