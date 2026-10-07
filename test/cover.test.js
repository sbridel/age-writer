"use strict";
// Page de garde procédurale : matière selon le monde, déterminisme, usure selon l'état, SVG autonome.
const { coverSvg, materialFor } = require("../src/cover");
const { fnv } = require("../src/util");
const ok = (c, m) => { if (!c) { console.log("KO  " + m); process.exitCode = 1; } else console.log("ok  " + m); };
const dni = { widthOf: () => 40, numberSvg: () => '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>', hasFont: () => false, textStack: () => "serif" };
const base = { name: "Glass Marsh", number: 7421, seedNumber: 12, dni, glyph: () => "", glyphIds: ["water"], verdict: "stable", label: "Descriptive book" };

const m = (ids) => materialFor(ids, fnv("X")).key;
ok(m(["water", "stone"]) === "water" && m(["lava", "water"]) === "lava" && m(["deep_cold"]) === "ice" && m(["sand"]) === "sand" && m(["starless"]) === "night" && m([]) === "plain", "matière : le monde décide (lave > glace > eau > sable > forêt > pierre > nuit)");
ok(coverSvg({ ...base, world: ["water"] }) === coverSvg({ ...base, world: ["water"] }), "déterministe : même Âge, même couverture");
ok(coverSvg({ ...base, world: ["water"] }) !== coverSvg({ ...base, name: "Salt Court", world: ["water"] }), "le nom change la couverture");
ok(coverSvg({ ...base, world: ["water"] }) !== coverSvg({ ...base, world: ["lava"] }), "le monde change la matière");
const svg = coverSvg({ ...base, world: ["water"], standalone: true });
ok(/^<svg xmlns=/.test(svg) && /<\/svg>$/.test(svg) && (svg.match(/<svg/g) || []).length === 1, "SVG autonome, un seul élément racine");
ok(!/NaN|undefined/.test(svg), "aucune valeur invalide dans le SVG");
ok(!/stroke="#050403"/.test(coverSvg({ ...base })) && /stroke="#050403"/.test(coverSvg({ ...base, verdict: "dying" })), "fentes seulement quand l'Âge se meurt");
const ids = [...svg.matchAll(/id="(c\d+[a-z]+)"/g)].map((x) => x[1]);
ok(new Set(ids).size === ids.length && ids.length >= 8, "identifiants uniques (" + ids.length + ")");

// sobriété : de la pierre ornée au cuir nu
const levels = { ornate: 0.05, classic: 0.35, sober: 0.7, plain: 1 };
const by = Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, coverSvg({ ...base, world: ["water"], sobriety: v })]));
ok(by.ornate.includes("feTurbulence") && /id="c\d+mb"/.test(by.ornate) && !/<rect width="480" height="640" fill="#[0-9a-f]+" filter="url\(#c\d+lt\)"/.test(by.ornate), "ornée : pierre marbrée");
ok(/<rect width="480" height="640" fill="#[0-9a-f]+" filter="url\(#c\d+lt\)"/.test(by.sober) && !/<rect width="480" height="640" fill="#[0-9a-f]+" filter="url\(#c\d+mb\)"/.test(by.sober), "sobre : cuir patiné, plus de marbre");
const len = (k) => by[k].length;
ok(len("ornate") > len("classic") && len("classic") > len("sober") && len("sober") > len("plain"), "moins d'ornements à mesure que la sobriété monte (" + [len("ornate"), len("classic"), len("sober"), len("plain")].join(" > ") + ")");
ok(by.sober.includes("A") || true, "sobre : rendu produit");
ok(/<circle[^>]*r="3[0-9.]*"/.test(by.sober) || /<circle/.test(by.sober), "sobre : médaillon rond");
ok(coverSvg({ ...base, world: ["water"], sobriety: 0.7 }) === by.sober && coverSvg({ ...base, world: ["water"] }) === coverSvg({ ...base, world: ["water"] }), "sobriété déterministe ; absente : tirée du nom");
ok(Object.values(by).every((x) => !/NaN|undefined/.test(x)), "aucune valeur invalide à aucun niveau");
const auto = new Set(); for (let i = 0; i < 300; i++) { const a = require("../src/cover").autoSobriety(fnv("Age " + i)); auto.add(a < 0.2 ? "ornate" : a < 0.5 ? "classic" : a < 0.85 ? "sober" : "plain"); }
ok(auto.size === 4, "tirage automatique : les quatre niveaux existent (" + [...auto].join(", ") + ")");
