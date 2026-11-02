"use strict";
// 2.5 (I) : le feu du Relto : le bois (une heure par bûche, quatre au plus, puis les braises, puis la cendre), la couleur.
const assert = require("assert");
const F = require("../src/relto-fire");
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const H = F.HOUR, now = 1.8e12;

ok(F.hearthOf(null, now).phase === "flame", "jamais allumé : le feu brûle");
ok(F.hearthOf(now + 2 * H, now).level === 1 && F.hearthOf(now + 2 * H, now).logs === 2, "deux heures de bois : plein feu, deux bûches");
ok(Math.abs(F.hearthOf(now + H / 2, now).level - 0.25) < 1e-9, "une demi-heure : le feu baisse");
const e = F.hearthOf(now - H / 4, now); ok(e.phase === "embers" && Math.abs(e.glow - 0.75) < 1e-9, "fini depuis un quart d'heure : des braises");
ok(F.hearthOf(now - 2 * H, now).phase === "cold", "fini depuis deux heures : la cendre froide");

ok(F.addLog(now - 5 * H, now) === now + H, "sur un feu éteint, une bûche : une heure");
ok(F.addLog(now + H, now) === now + 2 * H, "une bûche de plus : une heure de plus");
ok(F.addLog(now + 3.5 * H, now) === now + 4 * H, "quatre bûches au plus");
ok(F.isFull(now + 3.5 * H, now) && !F.isFull(now + 2 * H, now), "le foyer plein refuse la bûche");

ok(F.colorOfAge(new Set(["salt", "copper"]), "stable") === "sodium", "le sodium l'emporte sur le cuivre");
ok(F.colorOfAge(new Set(["copper", "chalk"]), "stable") === "copper", "le cuivre l'emporte sur le calcium");
ok(F.colorOfAge(new Set(["ash"]), "stable") === "potassium", "la cendre : la potasse, lilas");
ok(F.colorOfAge(new Set(["acid"]), "stable") === "blue", "l'acide : le soufre, bleu");
ok(F.colorOfAge(new Set(["salt"]), "dying") === "ghost", "un Âge mourant : un feu fantôme");
ok(F.colorOfAge(new Set(["stone"]), "stable") === "ordinary", "rien de chimique : le feu ordinaire");

ok(F.COLORS.length === 15 && F.COLORS[0].id === "ordinary" && F.COLORS[14].id === "ghost", "quinze couleurs, de l'ordinaire au fantôme");
ok(F.shownColor({ last: "copper" }, false).id === "copper", "sans page : la couleur du dernier Âge");
ok(F.shownColor({ last: "copper", pick: 2 }, false).id === "copper", "sans page, le choix ne compte pas");
ok(F.shownColor({ last: "copper", pick: 2 }, true).id === "sodium", "avec la page : le choix passe avant");
ok(F.nextPick({ last: "copper" }) === 10, "le premier clic part de la couleur qu'on voit");
ok(F.nextPick({ pick: 14 }) === 0, "après le fantôme, l'ordinaire");

const a = { verdict: "stable", resolved: { lines: [{ entry: { id: "lava" } }, { entry: { id: "salt" } }], matter: { written: [], reactions: [] }, scars: [] } };
const ext = {}; ok(F.rememberAge(ext, a) === "sodium" && ext.reltoFire.last === "sodium", "le dernier Âge visité est retenu");
/* 2.5.2 : le son suit le feu */
ok(F.soundOf(now + 4 * H, now) === 1 && Math.abs(F.soundOf(now + H, now) - 0.675) < 1e-9, "le crépitement suit le bois");
ok(F.soundOf(now - H / 4, now) > 0 && F.soundOf(now - H / 4, now) < 0.25, "en braises, un souffle");
ok(F.soundOf(now - 2 * H, now) === 0, "éteint : plus de crépitement");
console.log(`✓ fire.test.js (${n} contrôles)`);
