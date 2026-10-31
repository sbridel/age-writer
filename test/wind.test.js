"use strict";
// 2.5 (B) : la météo a un côté, suite — le vent du lieu (Coriolis, latitude), la muraille de sable ou de neige, le brouillard du matin.
const assert = require("assert");
const G = require("../src/genscene");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const W = (face, lat, phys) => G.windMode({ view: { face, lat }, phys });
const earth = { coriolis: 1, locked: false };
ok(W("eq", 0.5, null).from === "west" && W("eq", 0.5, null).mode === "right", "sans physique : de l'ouest, comme avant");
ok(W("eq", 0.5, earth).from === "west", "latitudes moyennes : vents d'ouest");
ok(W("eq", 0.1, earth).from === "east" && W("eq", 0.9, earth).from === "east", "basses latitudes (alizés) et hautes (vents polaires) : de l'est");
ok(W("eq", 0.5, { coriolis: 0.1, locked: false }).from === "pole" && W("eq", 0.5, { coriolis: 3, locked: true }).from === "pole", "monde lent ou figé : une seule cellule, le vent vient du pôle");
ok(W("eq", 0.5, earth).mode === "right" && W("eq", 0.1, earth).mode === "left" && W("eq", 0.5, { locked: true }).mode === "over", "face à l'équateur : l'ouest à droite, l'est à gauche, le pôle dans le dos");
ok(W("pole", 0.5, earth).mode === "left" && W("pole", 0.5, { locked: true }).mode === "ahead", "face au pôle : l'ouest à gauche, le pôle en face");
ok(W("east", 0.1, earth).mode === "ahead" && W("east", 0.5, earth).mode === "over", "face au levant : l'est en face, l'ouest dans le dos");
ok(W("west", 0.5, earth).mode === "ahead" && W("west", 0.1, earth).mode === "over", "face au couchant : l'ouest en face, l'est dans le dos");
const st = (lat) => G.buildFront({ seed: 7, storm: true, view: { face: "eq", lat }, phys: earth }, 640, 384, 260).mode;
ok(st(0.5) === "right" && st(0.1) === "left", "l'orage suit le vent du lieu");
ok(G.fogHour(0.02) === 1 && G.fogHour(0.2) > 0.3 && G.fogHour(0.2) < 0.7 && G.fogHour(0.35) === 0 && G.fogHour(0.5) === 0 && G.fogHour(0.85) === 1, "le brouillard : plein à l'aube, se lève dans la matinée, absent le jour, revient la nuit");
console.log(`wind.test.js : ${n} vérifications ok`);
