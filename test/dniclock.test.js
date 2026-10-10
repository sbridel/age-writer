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
console.log(`✓ dniclock.test.js (${n} contrôles)`);
