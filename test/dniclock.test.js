"use strict";
// L'horloge D'ni : débloquée par le Great Zero ; sans elle, la pierre-calendrier dérive de quelques yahr et l'heure se tait.
const assert = require("assert"); let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const DC = require("../src/dniclock");
const DT = require("../src/dnitime");
const M = require("../src/relto-model");

// ---- la dérive : quelques yahr, jamais nulle, reproductible, différente d'un Relto à l'autre ----------------------
const drifts = []; for (let s = 1; s <= 300; s++) drifts.push(DC.driftYahr(s));
ok(drifts.every((d) => Number.isInteger(d) && Math.abs(d) >= DC.DRIFT.min && Math.abs(d) <= DC.DRIFT.max), "dérive de 2 à 7 yahr, jamais nulle");
ok(drifts.some((d) => d < 0) && drifts.some((d) => d > 0), "en avance ou en retard");
ok(DC.driftYahr(1999) === DC.driftYahr(1999) && new Set(drifts).size > 5, "même graine, même dérive ; graines différentes, dérives variées");
const now = Date.UTC(2026, 9, 10, 0, 30);
const loose = { seed: 1999, additions: [] }, tight = { seed: 1999, additions: [{ type: "dniclock" }] };
const a = DC.reltoDate(loose, now), b = DC.reltoDate(tight, now), truth = DT.fromDate(now);
ok(!a.synced && a.drift === DC.driftYahr(1999), "sans l'horloge : la date de la pierre, décalée");
ok(b.synced && b.drift === 0 && b.yahr === truth.yahr && b.hahr === truth.hahr && b.prorahn === truth.prorahn, "avec l'horloge : la vraie date et la vraie heure");
ok(DT.dayNumber(now + a.drift * DC.MS_PER_YAHR) - DT.dayNumber(now) === a.drift, "l'écart est bien de `drift` yahr");

// ---- la page : présente d'office, verrouillée jusqu'au Great Zero ------------------------------------------------
const bp = M.builtinPages(), clock = bp.find((p) => p.id === "page_dni_clock");
ok(clock && clock.unlock.zero === true && clock.additions.some((x) => x.type === "dniclock"), "page « D'ni clock » d'office, débloquée par le Zéro");
const ages = [{ name: "A", path: "A.md", verdict: "stable", stability: 90 }];
const lost = M.buildScene({ ...M.parseRelto({ seed: 7, relto_pages_active: ["page_dni_clock"] }), zeroFound: false }, bp, ages);
const found = M.buildScene({ ...M.parseRelto({ seed: 7, relto_pages_active: ["page_dni_clock"] }), zeroFound: true }, bp, ages);
const pl = lost.pages.find((p) => p.id === "page_dni_clock"), pf = found.pages.find((p) => p.id === "page_dni_clock");
ok(pl.state === "locked" && /Great Zero/.test(pl.reason) && !DC.synced(lost), "Zéro introuvé : horloge verrouillée, pas de signal");
ok(pf.state === "active" && DC.synced(found), "Zéro trouvé : l'horloge capte, la date se recale");
const fm = M.pageFrontmatter("page_dni_clock", M.PAGE_PRESETS.page_dni_clock);
ok(fm.unlock && fm.unlock.great_zero === true && M.parsePage(fm, "c.md").unlock.zero === true, "note créée depuis le préréglage : unlock.great_zero se relit");

// ---- les anneaux : un par unité, chacun à son rythme, lus sous l'index -----------------------------------------
{
  const R = DC.rings(now), by = Object.fromEntries(R.map((x) => [x.key, x]));
  ok(R.map((x) => x.key).join() === "vailee,yahr,gahrtahvo,tahvo", "quatre anneaux : vailee, yahr, gahrtahvo, tahvo");
  ok(by.vailee.value === truth.vailee && by.yahr.value === truth.yahr && by.gahrtahvo.value === truth.gahrtahvo && by.tahvo.value === truth.tahvo, "le chiffre sous l'index de chaque anneau est l'unité en cours (dnitime)");
  ok(JSON.stringify(DC.rings(now)) === JSON.stringify(R), "même instant, mêmes angles (déterministe)");
  ok(R.every((x) => [x.pos, x.angle, x.elapsed].every(Number.isFinite) && x.pos >= 0 && x.pos < 1 && Math.abs(x.angle + x.pos * 2 * Math.PI) < 1e-12), "angle = −pos · 2π, fini");
  ok(R.every((x) => Math.abs(DC.digitAngle(x, x.index)) <= Math.PI / x.n + 1e-9), "le chiffre en cours est sous l'index (à une demi-case près)");
  // chaque anneau tourne à sa vitesse : un tahvo fait avancer l'anneau du tahvo d'un 25e de tour, celui du gahrtahvo d'un 125e…
  const one = 625 * DC.PRO_MS, R2 = DC.rings(now + one), d = (k) => ((R2.find((x) => x.key === k).pos - by[k].pos) + 1) % 1;
  ok(Math.abs(d("tahvo") - 1 / 25) < 1e-6 && Math.abs(d("gahrtahvo") - 1 / 125) < 1e-6 && Math.abs(d("yahr") - 1 / 125 / 29) < 1e-7 && Math.abs(d("vailee") - 1 / 125 / 290) < 1e-7, "vitesses : tahvo > gahrtahvo > yahr > vailee, dans les rapports D'ni");
  const ys = new Set(), vs = new Set(); for (let i = 0; i < 290; i++) { const q = DC.rings(DT.REF + (i + 0.5) * DC.MS_PER_YAHR); vs.add(q[0].value); ys.add(q[1].value); }
  ok(vs.size === 10 && Math.min(...vs) === 1 && Math.max(...vs) === 10 && ys.size === 29 && Math.min(...ys) === 1 && Math.max(...ys) === 29, "un hahr : vailee 1–10, yahr 1–29");
  ok(DC.rings(NaN).every((x) => Number.isFinite(x.angle)) && DC.rings(-1e15).every((x) => Number.isFinite(x.angle) && x.value >= x.base), "même avec une date absurde : rien de non fini");
}
// ---- la lueur des transitions : au changement d'unité, puis elle s'éteint ---------------------------------------
{
  const tv = DC.rings(now).find((x) => x.key === "tahvo"), start = now - tv.elapsed, at = (dt) => DC.glows(start + dt);
  ok(at(10).tahvo > 0.99 && at(DC.GLOW_MS / 2).tahvo > 0 && at(DC.GLOW_MS / 2).tahvo < at(10).tahvo && at(DC.GLOW_MS + 10).tahvo === 0, "nouveau tahvo : son chiffre luit, puis s'éteint");
  ok(at(10).vailee === 0, "le vailee, qui n'a pas changé, ne luit pas");
  ok(DC.glows(start + 10, true).tahvo === 0, "mouvement réduit : aucune lueur");
  const yr = DC.rings(now).find((x) => x.key === "yahr"), g = DC.glows(now - yr.elapsed + 50);
  ok(g.yahr > 0.9 && g.gahrtahvo > 0.9 && g.tahvo > 0.9 && g.vailee === 0, "nouveau yahr : il emporte gahrtahvo et tahvo (remis à 0)");
  ok(DC.glowAt(-1) === 0 && DC.glowAt(NaN) === 0, "lueur nulle hors de la fenêtre");
}
// ---- la vue rapprochée : seulement avec l'horloge ---------------------------------------------------------------
{
  const { JSDOM } = require("jsdom"), dom = new JSDOM("<body></body>", { pretendToBeVisual: true });
  global.window = dom.window; global.document = dom.window.document; global.Path2D = class {};
  let bad = 0, calls = 0; const chk = (v) => { if (typeof v === "number" && !Number.isFinite(v)) bad++; }, grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, k) => (k === "canvas" ? { width: 640, height: 360 } : k === "measureText" ? () => ({ width: 30 }) : k === "createLinearGradient" || k === "createRadialGradient" ? (...a) => { a.forEach(chk); return grad; } : (...a) => { calls++; a.forEach(chk); }), set: () => true });
  dom.window.HTMLCanvasElement.prototype.getContext = () => ctx;
  const { ReltoRenderer } = require("../src/relto-render"), { Dni } = require("../src/dni"), dni = new Dni({ getMode: () => "auto" }); dni.ready = true;
  const mk = (pages, zero) => { const rel = { ...M.parseRelto({ seed: 7, structures: ["hut"], relto_pages_active: pages }), zeroFound: zero }; return M.buildScene(rel, pages.map((id) => M.parsePage(M.pageFrontmatter(id, M.PAGE_PRESETS[id]), id + ".md")), ages); };
  const r = new ReltoRenderer(dom.window.document.createElement("canvas"), dni); r.nowOverride = now;
  r.setScene(mk(["page_dni_clock"], false)); ok(!r.available().clock, "sans l'horloge (Zéro introuvé) : pas de vue rapprochée");
  r.setView("clock"); ok(r.view !== "clock", "setView('clock') refusé sans l'horloge");
  r.setScene(mk(["page_dni_clock", "page_calendar"], true)); r.view = "island"; r.setHour(21); r.draw(1);
  const door = r.hot.find((h) => h.go === "clock"); ok(r.available().clock && door, "avec l'horloge : la sphère de l'île mène à la vue rapprochée");
  r.toLogical = () => [door.x + 2, door.y + 2]; r.onClick({}); ok(r.view === "clock", "un clic sur la sphère ouvre la vue `clock`");
  for (const h of [3, 9, 13, 19.5, 23]) { r.setHour(h); r.draw(2.3); }
  ok(r.clock && r.clock.date.yahr === truth.yahr && r.clock.rings[1].value === truth.yahr, "la vue lit l'heure D'ni de l'instant");
  ok(r.hot.some((h) => h.go === "island") && r.hot.some((h) => /^Vailee ring — Leevot/.test(h.tip)) && r.hot.some((h) => /calendar pinnacle/i.test(h.tip)), "retour à l'île, anneau du vailee nommé, pinacle au loin");
  r.opts.reducedMotion = true; r.draw(5); ok(Object.values(r.clock.glows).every((v) => v === 0), "mouvement réduit : l'état courant, sans lueur");
  r.opts.reducedMotion = false; r.nowOverride = now - DC.rings(now)[3].elapsed + 100; r.draw(1); ok(r.clock.glows.tahvo > 0.9, "à l'instant d'un nouveau tahvo, la vue le fait luire");
  r.view = "global"; r.draw(1); ok(r.hot.some((h) => h.go === "clock"), "vue globale : l'horloge est là, et mène aussi à la vue rapprochée");
  r.setScene(mk([], true)); r.view = "clock"; r.draw(1); ok(r.view === "island", "page retirée : retour à l'île");
  ok(calls > 500 && bad === 0, `${calls} appels de dessin, aucun nombre non fini (${bad})`);
}
console.log(`✓ dniclock.test.js (${n} contrôles)`);
