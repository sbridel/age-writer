"use strict";

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) hash = Math.imul(hash ^ str.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function windowScene(age, salt = "") {
  let resolved = age.resolved,
    ids = new Set();
  for (let line of resolved.lines) line.entry && ids.add(line.entry.id);
  for (let id of resolved.matter.written) ids.add(id);
  for (let reaction of resolved.matter.reactions) ids.add(reaction.result);
  let has = (...names) => names.some((name) => ids.has(name)),
    ruins = [];
  return (
    has("door", "sealed_door") && ruins.push("door"),
    has("bridge", "fallen_bridge") && ruins.push("bridge"),
    has("tablet", "worn_tablet", "speaking_tablet") && ruins.push("tablet"),
    has("lamp", "lit_lamp") && ruins.push("lamp"),
    {
      seed: hashString(salt + "|" + [...ids].sort().join(",")),
      verdict: age.verdict,
      unrest: Math.max(0, Math.min(1, 1 - age.stability / 100)),
      suns: has("twin_suns") ? 2 : has("single_sun") ? 1 : 0,
      skyStated: has("twin_suns", "single_sun", "starless"),
      moon: has("companion_moon"),
      cycle: has("frozen_cycle") ? "frozen" : has("erratic_cycle") ? "erratic" : "steady",
      chaos: has("chaotic_orbit"),
      veil: has("permanent_veil"),
      auroras: has("auroras"),
      eclipses: has("recurring_eclipses"),
      starfall: has("starfall"),
      rain: has("rain", "storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
      storm: has("storm", "thunderstorm", "whispering_storm", "waiting_thunder"),
      wind: has(
        "wind",
        "storm",
        "thunderstorm",
        "dust_storm",
        "ash_cloud",
        "spore_cloud",
        "whispering_storm",
        "waiting_thunder",
      ),
      fog: has("fog", "marsh_mist", "rime", "watching_mist"),
      lightning: has("lightning", "thunderstorm", "waiting_thunder"),
      heat: has("heat"),
      hail: has("hail", "black_hail"),
      steam: has("steam"),
      dust: has("dust_storm"),
      ash: has("ash_cloud"),
      lava: has("lava", "obsidian", "whispering_obsidian"),
      water: has("water", "marsh_mist", "brine", "meltwater", "crying_obsidian"),
      ice: has("ice", "black_ice", "deep_cold", "hail", "rime"),
      sand: has("sand", "dust_storm", "glass", "singing_glass", "fulgurite"),
      trees: has("grove") ? 5 : has("great_tree", "ironwood", "charred_grove") ? 3 : 0,
      burnt: has("charred_grove", "wildfire"),
      fire: has("wildfire"),
      moths: has("moth", "lantern_moths", "whispering_moths"),
      glow: has("glowvine", "wrong_glowvine"),
      eyes: has("hunter", "stalking_pack"),
      ruins: ruins,
      lampLit: has("lit_lamp"),
      tabletAwake: has("speaking_tablet"),
      fissure: has("no_fissure")
        ? null
        : has("cave_fissure")
          ? "cave"
          : has("submarine_fissure", "fissure")
            ? has("water")
              ? "submarine"
              : "open"
            : null,
    }
  );
}

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 1831565813) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    return (
      (mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed),
      ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    );
  };
}

const smoothstep = (x) => {
  let clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
};

function mixHex(from, to, amount) {
  let parse = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)),
    [fromR, fromG, fromB] = parse(from),
    [toR, toG, toB] = parse(to),
    toHex = (value) => Math.round(value).toString(16).padStart(2, "0");
  return `#${toHex(fromR + (toR - fromR) * amount)}${toHex(fromG + (toG - fromG) * amount)}${toHex(fromB + (toB - fromB) * amount)}`;
}

const rgba = (r, g, b, alpha) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

const frac = (x) => x - Math.floor(x);

function paintWindow(ctx, scene, time, width, height) {
  time = frac(time);
  let rng = mulberry32(scene.seed),
    horizon = height * 0.72;
  (ctx.save(), ctx.clearRect(0, 0, width, height));
  let rolls = [0, 1, 2, 3, 4, 5, 6].map(() => rng()),
    phase = Math.floor(time * 6),
    dayShare = 0.7,
    riseBase = (fraction) => horizon + fraction * 1.4,
    arcPoint = (progress, peakY, baseOffset) => {
      let lift = Math.sin(Math.PI * progress);
      return {
        x: width * (0.06 + 0.88 * progress),
        y: riseBase(baseOffset) - lift * (riseBase(baseOffset) - height * peakY),
        e: lift,
      };
    },
    bodies = [];
  for (let index = 0; index < scene.suns; index++) {
    let radius = height * (index === 0 ? 0.085 : 0.055),
      pos = null;
    if (scene.cycle === "frozen")
      pos = { x: width * (0.7 - 0.25 * index), y: horizon - height * 0.1, e: 0.12 };
    else if (scene.cycle === "erratic") {
      let y = height * (0.22 + 0.34 * rolls[(phase + index + 2) % 7]);
      pos = {
        x: width * (0.2 + 0.6 * rolls[(phase + index) % 7]),
        y: y,
        e: Math.max(0, Math.min(1, (horizon - y) / (horizon * 0.8))),
      };
    } else {
      let progress = frac(time - index * 0.1);
      progress <= dayShare && (pos = arcPoint(progress / dayShare, 0.14, radius));
    }
    if (!pos) continue;
    let wobble = scene.chaos
      ? {
          x: width * 0.05 * Math.sin(TAU * time * 5 + index * 2),
          y: height * 0.04 * Math.sin(TAU * time * 7 + index),
        }
      : { x: 0, y: 0 };
    bodies.push({ idx: index, x: pos.x + wobble.x, y: pos.y + wobble.y, r: radius, e: pos.e });
  }
  let daylight =
      scene.suns === 0
        ? 0
        : scene.cycle === "frozen"
          ? 0.2
          : scene.cycle === "erratic"
            ? 0.2 + 0.6 * rolls[phase]
            : Math.max(0, ...bodies.map((body) => body.e)),
    skyLow = smoothstep(daylight * 3),
    skyHigh = smoothstep((daylight - 0.25) / 0.75),
    skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
  (skyGradient.addColorStop(
    0,
    scene.skyStated ? mixHex(mixHex("#04050b", "#241d3d", skyLow), "#2f4d7a", skyHigh) : "#161a26",
  ),
    skyGradient.addColorStop(
      1,
      scene.skyStated ? mixHex(mixHex("#12141f", "#b05a36", skyLow), "#c2a98c", skyHigh) : "#2e3040",
    ),
    (ctx.fillStyle = skyGradient),
    ctx.fillRect(0, 0, width, height),
    scene.storm && ((ctx.fillStyle = rgba(14, 17, 24, 0.5)), ctx.fillRect(0, 0, width, height)),
    scene.veil && ((ctx.fillStyle = rgba(190, 190, 202, 0.2)), ctx.fillRect(0, 0, width, height)));
  let starCount = scene.skyStated ? (scene.suns === 0 ? 70 : 36) : 26,
    starVisibility = (scene.storm ? 0.25 : 1) * (scene.veil ? 0.5 : 1) * (1 - Math.min(1, daylight * 1.4));
  for (let i = 0; i < starCount; i++) {
    let sx = rng() * width,
      sy = rng() * horizon * 0.9,
      speed = 3 * (1 + (i % 3)),
      twinklePhase = rng(),
      alpha =
        (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * (time * speed + twinklePhase)))) *
        starVisibility *
        (scene.skyStated ? (scene.suns === 0 ? 1 : 0.55) : 0.7);
    ((ctx.fillStyle = rgba(230, 230, 245, alpha)), ctx.fillRect(sx, sy, 1.2, 1.2));
  }
  for (let body of bodies) {
    let glow = ctx.createRadialGradient(body.x, body.y, body.r * 0.5, body.x, body.y, body.r * 5),
      intensity = 0.5 * Math.max(Math.pow(Math.max(0, body.e), 0.6), scene.cycle === "frozen" ? 0.7 : 0);
    (glow.addColorStop(
      0,
      body.idx === 0 ? rgba(255, 214, 150, intensity) : rgba(190, 215, 255, intensity * 0.8),
    ),
      glow.addColorStop(1, rgba(255, 214, 150, 0)),
      (ctx.fillStyle = glow),
      ctx.fillRect(0, 0, width, height),
      (ctx.fillStyle = body.idx === 0 ? "#f6e0a8" : "#cfe0f4"),
      ctx.beginPath(),
      ctx.arc(body.x, body.y, body.r, 0, TAU),
      ctx.fill());
  }
  let mainSun = bodies.find((body) => body.idx === 0);
  if (
    (scene.eclipses &&
      mainSun &&
      ((ctx.fillStyle = "#05060a"),
      ctx.beginPath(),
      ctx.arc(
        mainSun.x + mainSun.r * 2.4 * Math.cos(TAU * time),
        mainSun.y + mainSun.r * 0.15 * Math.sin(TAU * time),
        mainSun.r * 1.02,
        0,
        TAU,
      ),
      ctx.fill()),
    scene.moon)
  ) {
    let moonRadius = height * 0.045,
      moonPos = null;
    if (scene.cycle === "frozen") moonPos = { x: width * 0.3, y: height * 0.3 };
    else {
      let moonProgress = frac(time - 0.6);
      moonProgress <= dayShare && (moonPos = arcPoint(moonProgress / dayShare, 0.2, moonRadius));
    }
    moonPos &&
      ((ctx.fillStyle = "#cfd6e2"),
      ctx.beginPath(),
      ctx.arc(moonPos.x, moonPos.y, moonRadius, 0, TAU),
      ctx.fill(),
      (ctx.fillStyle = rgba(10, 12, 20, 0.5)),
      ctx.beginPath(),
      ctx.arc(moonPos.x + moonRadius * 0.45, moonPos.y - moonRadius * 0.2, moonRadius * 0.9, 0, TAU),
      ctx.fill());
  }
  const auroraK = Math.max(0, Math.min(1, (1 - Math.min(1, daylight * 1.4) - 0.3) / 0.45)); // aurores : visibles la nuit seulement
  if (scene.auroras && auroraK > 0.01) {
    (ctx.save(), (ctx.globalCompositeOperation = "lighter"));
    let auroraColors = [
      [80, 220, 160],
      [150, 120, 230],
      [90, 190, 220],
    ];
    for (let band = 0; band < 3; band++) {
      let baseY = height * (0.16 + 0.08 * band),
        amplitude = height * 0.05,
        waves = 2 + band;
      ((ctx.strokeStyle = rgba(...auroraColors[band], 0.32 * auroraK)),
        (ctx.lineWidth = height * 0.045),
        (ctx.lineCap = "round"),
        ctx.beginPath());
      for (let px = 0; px <= width; px += 6) {
        let py =
          baseY +
          amplitude * Math.sin((px / width) * TAU * (waves / 2) + TAU * time * (band % 2 ? -1 : 1)) +
          amplitude * 0.4 * Math.sin((px / width) * TAU * 3 + TAU * time * 2);
        px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (scene.starfall)
    for (let index = 0; index < 3; index++) {
      let startX = rng() * width * 0.7,
        startY = rng() * horizon * 0.4,
        cyclePos = frac(time + index / 3);
      if (cyclePos > 0.3) continue;
      let progress = cyclePos / 0.3,
        tailLength = height * 0.22;
      ((ctx.strokeStyle = rgba(255, 255, 255, 0.8 * (1 - progress))),
        (ctx.lineWidth = 1.3),
        ctx.beginPath(),
        ctx.moveTo(startX + progress * width * 0.28, startY + progress * height * 0.24),
        ctx.lineTo(
          startX + progress * width * 0.28 - tailLength * 0.8,
          startY + progress * height * 0.24 - tailLength * 0.6,
        ),
        ctx.stroke());
    }
  let ridgeColor = scene.ice ? "#1a2430" : "#0c0d14";
  ((ctx.fillStyle = ridgeColor), ctx.beginPath(), ctx.moveTo(0, horizon));
  let ridgeSteps = 8;
  for (let i = 0; i <= ridgeSteps; i++)
    ctx.lineTo((i / ridgeSteps) * width, horizon - height * (0.04 + 0.12 * rng()) * (i % 2 ? 1 : 0.5));
  (ctx.lineTo(width, horizon), ctx.closePath(), ctx.fill());
  let groundColor = scene.lava
    ? "#26120e"
    : scene.ice
      ? "#27333f"
      : scene.sand
        ? "#3d3022"
        : scene.water
          ? "#14201f"
          : "#15130f";
  if (((ctx.fillStyle = groundColor), ctx.fillRect(0, horizon, width, height - horizon), scene.sand)) {
    ctx.fillStyle = "#4f3e2b";
    for (let dune = 0; dune < 3; dune++) {
      (ctx.beginPath(), ctx.moveTo(0, height));
      for (let x = 0; x <= width; x += 8)
        ctx.lineTo(
          x,
          horizon +
            height * (0.07 + 0.06 * dune) +
            height * 0.025 * Math.sin((x / width) * TAU * (1 + dune) + dune * 2),
        );
      (ctx.lineTo(width, height), ctx.closePath(), ctx.fill());
    }
  }
  if (scene.water) {
    let waterGradient = ctx.createLinearGradient(0, horizon + height * 0.03, 0, height);
    (waterGradient.addColorStop(0, "#1f3f48"),
      waterGradient.addColorStop(1, "#0b181c"),
      (ctx.fillStyle = waterGradient),
      ctx.fillRect(0, horizon + height * 0.03, width, height));
    for (let i = 0; i < 9; i++) {
      let y = horizon + height * (0.05 + 0.2 * rng()),
        length = width * (0.08 + 0.1 * rng()),
        offset = rng(),
        x = frac(offset + time) * (width + length) - length;
      ((ctx.fillStyle = rgba(200, 225, 235, 0.22)), ctx.fillRect(x, y, length, 1.2));
    }
    let sunBody = bodies.find((body) => body.e > 0.15);
    if (sunBody)
      for (let i = 0; i < 6; i++)
        ((ctx.fillStyle = rgba(255, 220, 160, (0.28 - i * 0.03) * Math.min(1, sunBody.e * 2))),
          ctx.fillRect(
            sunBody.x - (14 - i * 2) * 0.5 + 3 * Math.sin(TAU * (time * 2 + i * 0.2)),
            horizon + height * (0.05 + 0.045 * i),
            14 - i * 2,
            1.5,
          ));
  }
  if (scene.lava) {
    for (let i = 0; i < 5; i++) {
      let y = horizon + height * (0.06 + 0.05 * i);
      ((ctx.strokeStyle = rgba(255, 122, 48, 0.55 + 0.4 * Math.sin(TAU * (time * 2 + i * 0.37)))),
        (ctx.lineWidth = 1.6),
        ctx.beginPath(),
        ctx.moveTo(rng() * width * 0.2, y));
      for (let j = 1; j <= 6; j++)
        ctx.lineTo((j / 6) * width * (0.7 + 0.3 * rng()), y + (rng() - 0.5) * height * 0.04);
      ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      let x = rng() * width,
        offset = rng(),
        rise = frac(time * 3 + offset);
      ((ctx.fillStyle = rgba(255, 150, 70, 1 - rise)),
        ctx.fillRect(
          x + 6 * Math.sin(TAU * (rise + offset)),
          horizon + height * 0.1 - rise * height * 0.45,
          1.5,
          1.5,
        ));
    }
  }
  if (scene.ice)
    for (let i = 0; i < 16; i++) {
      let x = rng() * width,
        y = horizon + rng() * (height - horizon),
        phase = rng();
      ((ctx.fillStyle = rgba(
        225,
        240,
        255,
        0.15 + 0.6 * Math.max(0, Math.sin(TAU * (time * 2 + phase))) ** 3,
      )),
        ctx.fillRect(x, y, 1.4, 1.4));
    }
  if (scene.fissure === "submarine") {
    let fissureX = width * (0.22 + 0.56 * rng()),
      topY = horizon + (height - horizon) * 0.3,
      pulse = 0.5 + 0.5 * Math.sin(TAU * time * 3),
      points = [];
    for (let i = 0; i <= 5; i++)
      points.push([fissureX + (rng() - 0.5) * width * 0.05 + i * 1.2, topY + (height - topY - 2) * (i / 5)]);
    let strokeCrack = () => {
      (ctx.beginPath(),
        points.forEach(([x, y], pointIndex) => {
          let wobble = 1.6 * Math.sin(TAU * (time * 2 + pointIndex * 0.45));
          pointIndex === 0 ? ctx.moveTo(x + wobble, y) : ctx.lineTo(x + wobble, y);
        }),
        ctx.stroke());
    };
    ((ctx.lineJoin = "miter"),
      (ctx.strokeStyle = rgba(110, 190, 225, 0.12 + 0.08 * pulse)),
      (ctx.lineWidth = 9),
      strokeCrack(),
      (ctx.strokeStyle = rgba(170, 225, 245, 0.4 + 0.3 * pulse)),
      (ctx.lineWidth = 1.6),
      strokeCrack());
    for (let i = 0; i < 7; i++) {
      let phase = rng(),
        dx = (rng() - 0.5) * 9,
        progress = frac(time * 2 + phase);
      ((ctx.strokeStyle = rgba(205, 235, 248, 0.5 * (1 - progress))),
        (ctx.lineWidth = 0.9),
        ctx.beginPath(),
        ctx.arc(
          fissureX + dx + 2 * Math.sin(TAU * (progress * 2 + phase)),
          height - 4 - progress * (height - topY - 8),
          1 + 1.4 * phase,
          0,
          TAU,
        ),
        ctx.stroke());
    }
  } else if (scene.fissure === "open") {
    let fissureX = width * (0.2 + 0.6 * rng()),
      pulse = 0.5 + 0.5 * Math.sin(TAU * time * 3),
      points = [];
    for (let i = 0; i <= 6; i++)
      points.push([
        fissureX + (rng() - 0.5) * width * 0.07 + i * 1.5,
        horizon + 2 + (height - horizon - 2) * (i / 6),
      ]);
    let strokeCrack = () => {
      (ctx.beginPath(),
        points.forEach(([x, y], pointIndex) => (pointIndex === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))),
        ctx.stroke());
    };
    ((ctx.lineJoin = "miter"),
      (ctx.strokeStyle = rgba(150, 215, 255, 0.1 + 0.08 * pulse)),
      (ctx.lineWidth = 7),
      strokeCrack(),
      (ctx.strokeStyle = rgba(205, 238, 255, 0.55 + 0.4 * pulse)),
      (ctx.lineWidth = 1.8),
      strokeCrack());
  }
  if (scene.fissure === "cave") {
    let caveX = width * (0.18 + 0.64 * rng()),
      halfWidth = height * 0.17,
      caveHeight = height * 0.22,
      pulse = 0.5 + 0.5 * Math.sin(TAU * time * 3);
    ((ctx.fillStyle = "#040406"),
      (ctx.strokeStyle = "#2c2a36"),
      (ctx.lineWidth = 1),
      ctx.beginPath(),
      ctx.moveTo(caveX - halfWidth, horizon + 4),
      ctx.lineTo(caveX - halfWidth, horizon - caveHeight * 0.55),
      ctx.quadraticCurveTo(
        caveX,
        horizon - caveHeight * 1.25,
        caveX + halfWidth,
        horizon - caveHeight * 0.55,
      ),
      ctx.lineTo(caveX + halfWidth, horizon + 4),
      ctx.closePath(),
      ctx.fill(),
      ctx.stroke(),
      (ctx.strokeStyle = rgba(190, 230, 255, 0.5 + 0.4 * pulse)),
      (ctx.lineWidth = 1.6),
      ctx.beginPath(),
      ctx.moveTo(caveX, horizon - caveHeight * 0.7),
      ctx.lineTo(caveX - 2, horizon - caveHeight * 0.4),
      ctx.lineTo(caveX + 2, horizon - caveHeight * 0.15),
      ctx.lineTo(caveX, horizon + 2),
      ctx.stroke());
  }
  for (let i = 0; i < scene.trees; i++) {
    let x = width * (0.08 + (0.84 * (i + rng() * 0.6)) / Math.max(1, scene.trees)),
      treeHeight = height * (0.2 + 0.1 * rng()),
      sway = 1.6 * Math.sin(TAU * time + i);
    if (
      ((ctx.fillStyle = scene.burnt ? "#0a0909" : "#070b08"),
      ctx.beginPath(),
      ctx.moveTo(x - 2.5, horizon + 3),
      ctx.lineTo(x + sway * 0.4, horizon - treeHeight),
      ctx.lineTo(x + 2.5, horizon + 3),
      ctx.fill(),
      scene.burnt)
    ) {
      ((ctx.strokeStyle = "#0a0909"), (ctx.lineWidth = 1.4));
      for (let side of [-1, 1])
        (ctx.beginPath(),
          ctx.moveTo(x + sway * 0.3, horizon - treeHeight * 0.7),
          ctx.lineTo(x + side * treeHeight * 0.3 + sway, horizon - treeHeight * 0.95),
          ctx.stroke());
    } else
      (ctx.beginPath(),
        ctx.moveTo(x - treeHeight * 0.42 + sway, horizon - treeHeight * 0.5),
        ctx.lineTo(x + sway * 1.2, horizon - treeHeight * 1.15),
        ctx.lineTo(x + treeHeight * 0.42 + sway, horizon - treeHeight * 0.5),
        ctx.fill());
    if (scene.fire)
      for (let j = 0; j < 3; j++) {
        let flicker = 0.5 + 0.5 * Math.sin(TAU * (time * 3 + j * 0.31 + i * 0.2));
        ((ctx.fillStyle = rgba(255, 140 + 60 * flicker, 40, 0.8)), ctx.beginPath());
        let flameX = x + (j - 1) * 4 + sway;
        (ctx.moveTo(flameX - 2, horizon - treeHeight * 0.7),
          ctx.lineTo(flameX, horizon - treeHeight * (0.9 + 0.25 * flicker)),
          ctx.lineTo(flameX + 2, horizon - treeHeight * 0.7),
          ctx.fill());
      }
  }
  if (
    (scene.ruins.forEach((kind, index) => {
      let x = width * (0.2 + 0.6 * ((index + rng()) / Math.max(1, scene.ruins.length)));
      if (
        ((ctx.fillStyle = "#08080d"), (ctx.strokeStyle = "#2c2a36"), (ctx.lineWidth = 1), kind === "door")
      ) {
        let halfWidth = height * 0.1,
          doorHeight = height * 0.24;
        (ctx.beginPath(),
          ctx.moveTo(x - halfWidth, horizon + 2),
          ctx.lineTo(x - halfWidth, horizon - doorHeight * 0.7),
          ctx.lineTo(x, horizon - doorHeight),
          ctx.lineTo(x + halfWidth, horizon - doorHeight * 0.7),
          ctx.lineTo(x + halfWidth, horizon + 2),
          ctx.closePath(),
          ctx.fill(),
          ctx.stroke());
      } else if (kind === "bridge") {
        let halfSpan = width * 0.2;
        (ctx.beginPath(),
          ctx.moveTo(x - halfSpan, horizon + 2),
          ctx.quadraticCurveTo(x, horizon - height * 0.22, x + halfSpan, horizon + 2),
          ctx.lineTo(x + halfSpan, horizon + 6),
          ctx.lineTo(x - halfSpan, horizon + 6),
          ctx.closePath(),
          ctx.fill(),
          ctx.stroke());
      } else if (kind === "tablet") {
        let tabletHalfWidth = height * 0.07,
          tabletHeight = height * 0.2;
        (ctx.fillRect(x - tabletHalfWidth, horizon - tabletHeight, tabletHalfWidth * 2, tabletHeight + 2),
          ctx.strokeRect(x - tabletHalfWidth, horizon - tabletHeight, tabletHalfWidth * 2, tabletHeight + 2),
          scene.tabletAwake &&
            ((ctx.fillStyle = rgba(255, 190, 110, 0.35 + 0.3 * Math.sin(TAU * time * 2))),
            ctx.fillRect(x - tabletHalfWidth + 3, horizon - tabletHeight + 6, tabletHalfWidth * 2 - 6, 1.4),
            ctx.fillRect(
              x - tabletHalfWidth + 3,
              horizon - tabletHeight + 12,
              tabletHalfWidth * 2 - 10,
              1.4,
            )));
      } else if ((ctx.fillRect(x - 1.2, horizon - height * 0.16, 2.4, height * 0.16 + 2), scene.lampLit)) {
        let lampGlow = ctx.createRadialGradient(
          x,
          horizon - height * 0.17,
          1,
          x,
          horizon - height * 0.17,
          height * 0.2,
        );
        (lampGlow.addColorStop(0, rgba(140, 190, 255, 0.55 + 0.15 * Math.sin(TAU * time * 3))),
          lampGlow.addColorStop(1, rgba(140, 190, 255, 0)),
          (ctx.fillStyle = lampGlow),
          ctx.fillRect(0, 0, width, height),
          (ctx.fillStyle = "#cfe3ff"),
          ctx.beginPath(),
          ctx.arc(x, horizon - height * 0.17, 2.4, 0, TAU),
          ctx.fill());
      } else
        ((ctx.fillStyle = "#2c2a36"),
          ctx.beginPath(),
          ctx.arc(x, horizon - height * 0.17, 2.2, 0, TAU),
          ctx.fill());
    }),
    scene.glow)
  )
    for (let i = 0; i < 7; i++) {
      let x = width * (0.1 + 0.12 * i),
        y = horizon - height * (0.03 + 0.07 * Math.abs(Math.sin(i * 1.7))),
        alpha = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(TAU * (time * 2 + i * 0.17))),
        gradient = ctx.createRadialGradient(x, y, 0, x, y, 9);
      (gradient.addColorStop(0, rgba(170, 240, 210, alpha)),
        gradient.addColorStop(1, rgba(170, 240, 210, 0)),
        (ctx.fillStyle = gradient),
        ctx.fillRect(x - 10, y - 10, 20, 20));
    }
  if (scene.eyes) {
    let x = width * (0.25 + 0.5 * rng());
    frac(time * 2) < 0.82 &&
      ((ctx.fillStyle = "#ffd070"),
      ctx.fillRect(x, horizon - 1, 2, 2),
      ctx.fillRect(x + 6, horizon - 1, 2, 2));
  }
  if (scene.moths) {
    let centerX = width * (0.3 + 0.4 * rng()),
      centerY = horizon - height * 0.22;
    for (let i = 0; i < 6; i++) {
      let speed = 1 + (i % 3),
        phase = i / 6,
        x = centerX + width * 0.1 * Math.cos(TAU * (time * speed + phase)),
        y = centerY + height * 0.07 * Math.sin(TAU * (time * speed + phase * 1.3)),
        gradient = ctx.createRadialGradient(x, y, 0, x, y, 6);
      (gradient.addColorStop(0, rgba(246, 230, 168, 0.9)),
        gradient.addColorStop(1, rgba(246, 230, 168, 0)),
        (ctx.fillStyle = gradient),
        ctx.fillRect(x - 6, y - 6, 12, 12));
    }
  }
  if (scene.fog)
    for (let i = 0; i < 4; i++) {
      let y = horizon - height * (0.18 - 0.07 * i),
        drift = 22 * Math.sin(TAU * time + i);
      ((ctx.fillStyle = rgba(214, 218, 226, 0.13)), ctx.fillRect(drift - 20, y, width + 40, height * 0.1));
    }
  if (scene.heat) {
    ((ctx.strokeStyle = rgba(255, 190, 120, 0.13)), (ctx.lineWidth = 1.4));
    for (let i = 0; i < 8; i++) {
      let x = width * (0.08 + 0.12 * i);
      ctx.beginPath();
      for (let y = horizon; y > horizon - height * 0.3; y -= 3) {
        let progress = (horizon - y) / (height * 0.3),
          sx = x + 3 * Math.sin(progress * 9 - TAU * time * 2 + i);
        y === horizon ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }
  }
  if (scene.steam || scene.ash || scene.dust) {
    let [red, green, blue] = scene.ash ? [70, 70, 76] : scene.dust ? [160, 120, 80] : [235, 235, 240];
    for (let i = 0; i < 6; i++) {
      let rx = rng(),
        ry = rng(),
        rise = scene.steam ? frac(time + ry) : 0,
        x = scene.steam ? width * rx + 8 * Math.sin(TAU * (time + rx)) : frac(rx + time) * (width + 80) - 40,
        y = scene.steam ? horizon - rise * height * 0.55 : height * (0.1 + 0.4 * ry),
        radius = height * (scene.steam ? 0.06 + 0.07 * rise : 0.12),
        gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      (gradient.addColorStop(0, rgba(red, green, blue, scene.steam ? 0.28 * (1 - rise) : 0.3)),
        gradient.addColorStop(1, rgba(red, green, blue, 0)),
        (ctx.fillStyle = gradient),
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2));
    }
  }
  if (scene.rain) {
    let dropCount = scene.storm ? 120 : 64;
    ((ctx.strokeStyle = rgba(190, 205, 225, scene.storm ? 0.4 : 0.3)), (ctx.lineWidth = 1), ctx.beginPath());
    for (let i = 0; i < dropCount; i++) {
      let x0 = rng() * width,
        phase = rng(),
        y = frac(phase + time * 4) * (height + 20) - 10,
        slant = scene.wind ? 0.35 : 0.1,
        x = x0 + y * slant;
      (ctx.moveTo(x, y), ctx.lineTo(x + (scene.wind ? 4 : 1.5), y + 7));
    }
    ctx.stroke();
  }
  if (scene.hail) {
    ctx.fillStyle = rgba(240, 245, 255, 0.75);
    for (let i = 0; i < 26; i++) {
      let x = rng() * width,
        phase = rng();
      ctx.fillRect(x, frac(phase + time * 5) * (height + 10) - 5, 1.8, 1.8);
    }
  }
  if (scene.wind) {
    ((ctx.strokeStyle = rgba(210, 220, 235, 0.22)), (ctx.lineWidth = 1));
    for (let i = 0; i < 12; i++) {
      let y = rng() * horizon,
        phase = rng(),
        length = width * (0.08 + 0.14 * rng()),
        x = frac(phase + time * 3) * (width + length) - length;
      (ctx.beginPath(), ctx.moveTo(x, y), ctx.lineTo(x + length, y), ctx.stroke());
    }
  }
  if (scene.lightning) {
    let flash = 0;
    ([0.15, 0.2, 0.62].forEach((flashTime, index) => {
      let x = width * (0.2 + 0.6 * rng()),
        distance = Math.min(Math.abs(time - flashTime), 1 - Math.abs(time - flashTime)),
        strength = Math.max(0, 1 - distance / 0.025) ** 2;
      if (((flash = Math.max(flash, strength)), strength > 0.25)) {
        ((ctx.strokeStyle = rgba(255, 255, 255, 0.9 * strength)),
          (ctx.lineWidth = 2),
          ctx.beginPath(),
          ctx.moveTo(x, 0));
        let boltRng = mulberry32(scene.seed + index * 977),
          boltX = x;
        for (let y = 0; y < horizon; y += horizon / 7)
          ((boltX += (boltRng() - 0.5) * 22), ctx.lineTo(boltX, y + horizon / 7));
        ctx.stroke();
      }
    }),
      flash > 0 && ((ctx.fillStyle = rgba(235, 240, 255, 0.34 * flash)), ctx.fillRect(0, 0, width, height)));
  }
  if (scene.unrest > 0.25 && scene.verdict !== "stable") {
    ((ctx.fillStyle = rgba(0, 0, 0, 0.12 * scene.unrest * (0.5 + 0.5 * Math.sin(TAU * time * 9)))),
      ctx.fillRect(0, 0, width, height));
    for (let i = 0; i < 28; i++)
      ((ctx.fillStyle = rgba(200, 200, 200, 0.16 * scene.unrest)),
        ctx.fillRect(rng() * width, rng() * height, 1.2, 1.2));
  }
  let vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    width * 0.62,
  );
  (vignette.addColorStop(0, rgba(0, 0, 0, 0)),
    vignette.addColorStop(1, rgba(0, 0, 0, 0.7)),
    (ctx.fillStyle = vignette),
    ctx.fillRect(0, 0, width, height),
    ctx.restore());
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
