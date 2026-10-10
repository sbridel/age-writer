"use strict";
/** Ajouts à l'interface existante : numéros D'ni, mécanismes, altérations, solitude, son ; journal ; bloc `dni`. */
const { fnv, esc, words, setMarkup } = require("./util");
const IMG = require("./imager");
const { worldIds, describeChange } = require("./law");
const mech = require("./mech");
const sound = require("./sound");
const journal = require("./journal");
const PH = require("./physics/index");
const SS = require("./starsystem");
const CAL = require("./calibration");
const SKY = require("./sky");
const TEL = require("./telescope");
const INS = require("./instruments");

const ageNumber = (name) => fnv(name) % 390625;                    // 25^4

/**
 * Étape 2 du télescope : ce que le Relto sait du système de cet Âge et de sa calibration (sans DOM). `sys` (clé d'étoile,
 * position, indices), `rec` (le système situé, ou null), `zero` (un Great Zero est trouvé), `cal` (état du micromètre),
 * `lt` (l'heure locale), `moved` (synchronisé sur une autre étoile : le monde a été réécrit), `kips` (synchronisé : les
 * coordonnées KIPS, KI-style).
 */
function calibrationOf(plugin, { src, analysis, name, path }) {
  const sys = SS.systemOf(analysis, src, name), { zero, rec } = SS.findLocated(plugin.ext.telescope, sys.key), now = Date.now();
  const tune = (plugin.ext.imagerTunings || {})[path] || null, moved = !!(tune && tune.sysKey && tune.sysKey !== sys.key && tune.syncAt != null);
  const orbit = CAL.orbitOf(analysis, name, SKY.parseSky(src), sys.near), cal = CAL.state(moved ? { ...tune, syncAt: null } : tune, orbit, !!rec, now);
  // étape 3 : gravée sur la fausse ligne, l'étoile donne une heure et des KIPS faux (on les montre tels quels : c'est le piège)
  const field = analysis && analysis.physics && analysis.physics.w ? analysis.physics.w.field : null;
  return { sys, rec, zero, cal, moved, orbit, compass: SS.compassOf(field), old: SS.offLine(rec), lt: CAL.localTime(orbit, cal, now + CAL.lineShift(orbit, rec && rec.line)), kips: rec && cal.synced ? [rec.torahn, TEL.kiElev(rec.elevation), rec.distance] : null };
}

function dateStr(ms, lang) { try { return new Date(ms).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" }); } catch (e) { return ""; } }

/** Mécanismes d'un Âge (écrits + tirés). */
function mechanismsFor(plugin, src, analysis, name) {
  const parsed = mech.parseMechanismLines(src), world = new Set(worldIds(analysis));
  return { list: mech.resolveMechanisms(world, name, parsed.ids, { mode: plugin.ext.mechanisms }), unknown: parsed.unknown, world };
}

/** Libellés des axes de stabilité (clés littérales pour le test des traductions). */
function axisLabel(t, axis) {
  return ({ cosmological: t("axis.cosmological"), geological: t("axis.geological"), weather: t("axis.weather"), ecological: t("axis.ecological"), metaphysical: t("axis.metaphysical"), alteration: t("axis.alteration") })[axis] || axis;
}
function sevLabel(t, sev) { return ({ light: t("sev.light"), medium: t("sev.medium"), strong: t("sev.strong") })[sev] || sev; }
const heading = (box, text) => box.createDiv({ cls: "age-det__h", text });

/** Détails · stabilité : verdict et une barre par axe (remplace la ligne brute des coûts). */
function renderStability(plugin, box, analysis) {
  const t = plugin.t, sec = box.createDiv({ cls: "age-det age-det--stab" });
  const markPanel = () => { const pn = box.closest && box.closest(".age-panel"); if (pn) pn.classList.add("age-panel--stab"); return !!pn; }; // masque l'ancienne ligne de débogage (remplace :has en CSS)
  if (!markPanel() && typeof requestAnimationFrame === "function") requestAnimationFrame(markPanel);
  heading(sec, t("det.stability"));
  const head = sec.createDiv({ cls: "age-det__verdict age-det__verdict--" + analysis.verdict });
  head.createSpan({ cls: "age-det__big", text: String(analysis.stability) });
  head.createSpan({ cls: "age-det__unit", text: "% · " + ({ stable: t("verdict.stable"), unstable: t("verdict.unstable"), dying: t("verdict.dying") })[analysis.verdict] });
  const axes = Object.entries(analysis.axisStability || {}).sort((a, b) => a[1] - b[1]);
  if (!axes.length) { sec.createDiv({ cls: "age-det__note", text: t("det.noaxis") }); return; }
  const bars = sec.createDiv({ cls: "age-det__bars" });
  const pcost = (analysis.physics && analysis.physics.axisCost) || {};
  for (const [axis, v] of axes) {
    const row = bars.createDiv({ cls: "age-det__bar" });
    row.createSpan({ cls: "age-det__axis", text: axisLabel(t, axis) });
    const track = row.createDiv({ cls: "age-det__track" });
    const fill = track.createDiv({ cls: "age-det__fill " + (v >= 75 ? "is-ok" : v >= 40 ? "is-warn" : "is-bad") });
    fill.style.width = Math.max(2, Math.min(100, v)) + "%";
    row.createSpan({ cls: "age-det__val", text: v + "%" + (pcost[axis] ? `  (${t("det.physpts", { n: Math.round(pcost[axis] * 100) })})` : "") });
  }
}

/** Détails · physique : fiche, chaîne des causes, pourquoi, ce qui ne tient pas (pistes cliquables). */
function renderPhysics(plugin, box, analysis, { src, path }) {
  const ph = analysis.physics; if (!ph) return;
  const t = plugin.t, lang = plugin.lang() === "fr" ? "fr" : "en", sh = PH.sheet(ph, lang), w = ph.w, f = PH.fmt(lang);
  const sec = box.createDiv({ cls: "age-det age-det--phys" });
  const top = sec.createDiv({ cls: "age-det__hrow" });
  heading(top, t("det.physics"));
  top.createSpan({ cls: "age-det__mode", text: ph.mode === "strict" ? t("det.mode.strict") : t("det.mode.easy") });
  // chaîne des causes
  const chain = sec.createDiv({ cls: "age-det__chain" });
  const node = (label, value, state) => { const n = chain.createSpan({ cls: "age-det__node is-" + state }); n.createEl("b", { text: label }); n.createSpan({ text: " " + value }); };
  const arrow = () => chain.createSpan({ cls: "age-det__arrow", text: "→" });
  const temp = w.Ts >= 255 && w.Ts <= 325 ? "ok" : w.Ts >= 200 && w.Ts <= 360 ? "warn" : "bad";
  const water = { liquid: [t("chain.liquid"), "ok"], ice: [t("chain.ice"), "warn"], vapor: [t("chain.vapor"), "bad"], none: [t("chain.none"), "warn"] }[w.water];
  node(t("chain.star"), w.stars === 0 ? t("chain.none") : f(w.starTemp, 0) + " K", w.stars === 0 || w.starLife < 1 ? "warn" : "ok"); arrow();
  node(t("chain.flux"), f(w.S) + "×", w.S > 0 ? "ok" : "warn"); arrow();
  node(t("chain.surface"), f(w.Ts - 273.15, 0) + " °C", temp); arrow();
  node(t("chain.water"), water[0], water[1]); arrow();
  node(t("chain.light"), f(w.light) + "×", w.light >= 0.01 || (w.blackSun && w.S >= 0.2) ? "ok" : "bad");
  chain.createSpan({ cls: "age-det__break" });
  node(t("chain.heat"), f(w.heat) + "×", w.volcanism ? "ok" : "warn"); arrow();
  node(t("chain.core"), w.liquidCore ? t("chain.liquid") : t("chain.frozen"), w.liquidCore ? "ok" : "warn"); arrow();
  node(t("chain.field"), w.field > 0.2 ? f(w.field) + "×" : t("chain.none"), w.field > 0.2 ? "ok" : "warn"); arrow();
  node(t("chain.air"), f(w.P) + " bar", w.P >= 0.05 ? "ok" : w.P >= 0.005 ? "warn" : "bad");
  // fiche
  const dl = sec.createEl("dl", { cls: "age-det__sheet" });
  for (const [k, v] of sh.rows) { dl.createEl("dt", { text: k }); dl.createEl("dd", { text: v }); }
  // notes de l'arpenteur pour l'Imageur du Relto : ce que chante le ciel de l'Âge, trois valeurs en chiffres D'ni (la phase dérive : jamais notée)
  try {
    const notes = plugin.ext.imagerNotes === "off" || plugin.ext.imagerNotes === "full" || plugin.ext.imagerNotes === "words" ? plugin.ext.imagerNotes : "words";
    if (notes === "off") throw new Error("notes masquées");
    const tg = IMG.targetsOf(analysis, path ? String(path).replace(/^.*\//, "").replace(/\.md$/i, "") : ""), hn = IMG.hints(tg, lang);
    const sky = sec.createDiv({ cls: "age-det__sky" });
    sky.createEl("b", { text: t("det.sky") + " " });
    sky.createSpan({ cls: "age-det__skyline", text: hn.line });
    const full = notes === "full"; // « mots seulement » : la phrase, sans aucun chiffre (les valeurs ne sont même pas créées, rien à révéler)
    if (full) {
      const nums = sky.createDiv({ cls: "age-det__skynums" });
      for (const [label, v] of [[t("det.sky.freq"), tg.freq], [t("det.sky.amp"), tg.amp], [t("det.sky.harm"), tg.harm]]) { const c = nums.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: label }); setMarkup(c.createSpan(), plugin.dni.numberSvg(v, { size: 16 })); }
      nums.createSpan({ cls: "age-det__skynum", text: tg.pol > 0 ? "+" : "−" }).setAttr("aria-label", t("det.sky.pol"));
    }
    if (hn.lightLine) {
      sky.createDiv({ cls: "age-det__skyline", text: hn.lightLine });
      if (full) {
        const ln = sky.createDiv({ cls: "age-det__skynums" });
        for (const [label, v] of [[t("det.sky.r"), hn.lensValues.r], [t("det.sky.g"), hn.lensValues.g], [t("det.sky.b"), hn.lensValues.b], [t("det.sky.iris"), hn.lensValues.iris]]) { const c = ln.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: label }); setMarkup(c.createSpan(), plugin.dni.numberSvg(v, { size: 16 })); }
      }
    }
  } catch (e) { /* pas de notes */ }
  try { renderStarNote(plugin, sec, { src, analysis, path }); } catch (e) { console.warn("[Age Writer ext] étoile", e); }
  if (sh.facts.length) {
    heading(sec, t("det.why")).addClass("age-det__h--sub");
    const ul = sec.createEl("ul", { cls: "age-det__facts" });
    for (const x of sh.facts) ul.createEl("li", { text: x });
  }
  heading(sec, t("det.tensions")).addClass("age-det__h--sub");
  if (!sh.tensions.length) { sec.createDiv({ cls: "age-det__calm", text: t("det.calm") }); return; }
  const list = sec.createDiv({ cls: "age-det__tensions" });
  sh.tensions.forEach((x, i) => {
    const raw = ph.tensions[i] || {}, card = list.createDiv({ cls: "age-det__tension is-" + x.severity });
    const tag = card.createDiv({ cls: "age-det__tag" });
    tag.createSpan({ cls: "age-det__sev", text: sevLabel(t, x.severity) });
    tag.createSpan({ text: " · " + axisLabel(t, x.axis) + (ph.mode === "strict" ? (raw.counted === false ? " · " + t("det.counted") : raw.points ? " · " + t("det.points", { n: raw.points }) : "") : "") });
    card.createDiv({ cls: "age-det__why", text: x.why });
    const hints = raw.hints || [];
    if (!x.fix.length) return;
    const fixes = card.createDiv({ cls: "age-det__fixes" });
    x.fix.forEach((txt, k) => {
      const h = hints[k];
      if (h && path) {
        const b = fixes.createEl("button", { cls: "age-det__fix", attr: { type: "button", "aria-label": t("det.write", { line: `${h.key}: ${PH.asLine(h.value)}` }) } });
        b.createSpan({ text: txt.replace(/\s*\([^()]*\)\s*$/, "") + " " });
        b.createEl("code", { text: `${h.key}: ${PH.asLine(h.value)}` });
        b.addEventListener("click", async () => {
          try { await plugin.writePhysicsLine(path, src, h.key, h.value); } catch (e) { console.warn("[Age Writer ext] piste", e); try { new (require("obsidian").Notice)(t("phys.notfound")); } catch (x) { /* ignore */ } }
        });
      } else fixes.createSpan({ cls: "age-det__fixtxt", text: txt });
    });
  });
}

/**
 * Notes de l'arpenteur, suite (étape 2) : ce qu'on perçoit du Great Zero depuis l'Âge (en mots ; « complètes » : les trois
 * réglages du télescope en chiffres D'ni ; « aucune » : rien), si son étoile est située, et l'heure là-bas.
 */
function renderStarNote(plugin, sec, { src, analysis, path }) {
  const t = plugin.t, lang = plugin.lang() === "fr" ? "fr" : "en", notes = plugin.ext.imagerNotes === "off" || plugin.ext.imagerNotes === "full" ? plugin.ext.imagerNotes : "words";
  const name = path ? String(path).replace(/^.*\//, "").replace(/\.md$/i, "") : "", C = calibrationOf(plugin, { src, analysis, name, path });
  const box = sec.createDiv({ cls: "age-det__sky age-det__star" });
  if (notes !== "off") {
    // ce que l'arpenteur perçoit (étape 3 : dévié par un trou noir, retard faussé par un faux pouls, boussole grossière sans nord magnétique)
    const guild = INS.isGuild(plugin.ext), w = SS.words(SS.surveyed(C.sys, guild), lang, { fx: C.sys.fx, compass: C.compass, easy: !guild }); // mode facile : les étoiles mortes ne faussent pas les notes
    box.createEl("b", { text: t("sys.heading") + " " });
    box.createSpan({ cls: "age-det__skyline", text: w.line });
    if (w.pert) box.createDiv({ cls: "age-det__skyline age-det__pert", text: w.pert });
    if (notes === "full") {
      const nums = box.createDiv({ cls: "age-det__skynums" }), vals = [[t("sys.val.torahn"), w.values.torahn], [t("sys.val.elev"), w.values.elev], [t("sys.val.delay"), w.values.delay]];
      if (w.values.beats) vals.push([t("sys.val.beats"), w.values.beats]);
      for (const [label, v] of vals) {
        const c = nums.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: label });
        if (v < 0) c.createSpan({ text: "−" }); setMarkup(c.createSpan(), plugin.dni.numberSvg(Math.abs(v), { size: 16 }));
      }
      if (C.sys.near && C.sys.near.length) { // « complètes » : les perturbateurs proches, nommés, et leur distance en shahfeetee
        const pl = box.createDiv({ cls: "age-det__skynums" }); pl.createSpan({ cls: "age-det__skylabel", text: t("sys.pert.heading") });
        for (const p of C.sys.near) { const c = pl.createSpan({ cls: "age-det__skynum" }); c.createSpan({ cls: "age-det__skylabel", text: p.kind === "pulsar" ? t("sys.pert.pulsar.name") : p.kind === "neutron_star" ? t("sys.pert.neutron.name") : t("sys.pert.bh.name") }); setMarkup(c.createSpan(), plugin.dni.numberSvg(p.d, { size: 14 })); }
      }
    }
    const why = (C.orbit && C.orbit.why) || [];
    if (C.rec && why.length) box.createDiv({ cls: "age-det__state is-drift", text: why.includes("nofield") ? t("sys.drift.nofield") : why.includes("weakfield") ? t("sys.drift.weakfield") : t("sys.drift.pert") });
  }
  if (C.zero) box.createDiv({ cls: "age-det__state" + (C.rec ? (C.old ? " is-moved" : " is-located") : ""), text: C.rec ? (C.old ? t("sys.state.old") : t("sys.state.located")) : t("sys.state.not") });
  if (C.moved) box.createDiv({ cls: "age-det__state is-moved", text: t("sys.moved") });
  // l'heure là-bas : seulement si l'Imageur est synchronisé ; sinon elle reste incertaine (le temps se gagne en se situant)
  if (C.rec) {
    const tl = box.createDiv({ cls: "age-det__time" + (C.lt.known ? (C.lt.certain ? " is-certain" : " is-drift") : "") });
    tl.createSpan({ text: C.lt.known ? CAL.timeWords(C.lt, lang) + " " : t("cal.time.sync") });
    if (C.lt.known) setMarkup(tl.createSpan({ cls: "age-det__timenum" }), plugin.dni.numberSvg(C.lt.gahr, { size: 14 }) + '<span class="age-ext__dot">:</span>' + plugin.dni.numberSvg(C.lt.tahvo, { size: 14 }));
  }
}

function renderExtras(plugin, container, { src, analysis, name, compact, path }) {
  const t = plugin.t, lang = plugin.lang(), ext = plugin.ext, dni = plugin.dni;
  const box = container.createDiv({ cls: "age-ext" + (compact ? " age-ext--compact" : "") });
  const { list, unknown, world } = mechanismsFor(plugin, src, analysis, name);

  if (!compact) {
    try { renderStability(plugin, box, analysis); } catch (e) { console.warn("[Age Writer ext] stabilité", e); }
    try { renderPhysics(plugin, box, analysis, { src, path }); } catch (e) { console.warn("[Age Writer ext] physique", e); }
    if (ext.showNumbers || list.length || unknown.length) heading(box, t("det.age"));
  }

  if (ext.showNumbers) {
    const plate = box.createDiv({ cls: "age-ext__plate" }); plate.setAttr("title", t("num.title"));
    const seedLine = /^\s*seed\s*:\s*(\d+)\s*$/im.exec(src);
    let kips = null; try { kips = calibrationOf(plugin, { src, analysis, name, path }).kips; } catch (e) { kips = null; } // étape 2 : les coordonnées KIPS, une fois l'Âge calibré
    dniText(plugin, plate, name, "age-ext__dniname");
    let h = `<span class="age-ext__lbl">${esc(t("num.age"))}</span>${dni.numberSvg(ageNumber(name), { size: 18 })}`;
    h += `<span class="age-ext__lbl">${esc(kips ? t("cal.kips") : t("num.coords"))}</span>` + (kips ? kips.map((n) => (n < 0 ? '<span class="age-ext__dot">−</span>' : "") + dni.numberSvg(Math.abs(n), { size: 14 })).join('<span class="age-ext__dot">·</span>') : `<span class="age-ext__lbl age-ext__unc">${esc(t("num.uncharted"))}</span>`);
    if (seedLine) h += `<span class="age-ext__lbl">${esc(t("num.seed"))}</span>${dni.numberSvg(seedLine[1], { size: 14 })}`;
    setMarkup(plate, h, true);
  }

  if (list.length || unknown.length) {
    const m = box.createDiv({ cls: "age-ext__mechs" });
    for (const x of list) {
      const row = m.createDiv({ cls: "age-ext__mech" + (x.written ? " is-written" : "") });
      setMarkup(row.createDiv({ cls: "age-ext__icon" }), `<svg viewBox="0 0 100 100"><path d="${mech.MECHS[x.id].icon}" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="miter"/></svg>`);
      const body = row.createDiv({ cls: "age-ext__mechbody" });
      body.createEl("b", { text: mech.label(x.id, lang) });
      body.createSpan({ text: ` · ${mech.stateWord(x.state, lang)}` + (x.written ? "" : ` · ${t("mech.drawn")}`) });
      body.createDiv({ cls: "age-ext__desc", text: mech.describe(x.id, lang) });
      const det = body.createEl("details", { cls: "age-ext__puzzle" });
      det.createEl("summary", { text: `${t("mech.puzzle")} — ${mech.puzzleLabel(x.puzzle.kind, lang)}` });
      setMarkup(det.createDiv({ cls: "age-ext__nums" }), x.puzzle.values.map((v) => dni.numberSvg(v, { size: 16 })).join("") + (x.puzzle.hz ? `<span class="age-ext__hz">${x.puzzle.hz.join(" · ")} Hz</span>` : ""));
    }
    for (const u of unknown) m.createDiv({ cls: "age-ext__warn", text: t("mech.unknown", { id: u }) });
  }

  const log = plugin.law.log(name), extra = plugin.law.effective(name);
  if (ext.law && (extra > 0.005 || log.length)) {
    const l = box.createDiv({ cls: "age-ext__law" });
    if (log.length) {
      const last = log[log.length - 1];
      l.createDiv({ cls: "age-ext__lawhead", text: t("law.warning") });
      l.createDiv({ cls: "age-ext__lawline", text: `${dateStr(last.t, lang)} — ${describeChange(last, t)}` });
    }
    if (extra > 0.005) l.createDiv({ cls: "age-ext__lawmeter", text: t("law.meter", { n: Math.round(extra * 100) }) });
  }
  if (ext.law && plugin.law.condemned(name)) {
    const d = box.createDiv({ cls: "age-ext__law age-ext__doom" });
    if (plugin.law.destroyed(name)) d.createDiv({ cls: "age-ext__lawhead", text: t("doom.destroyed") });
    else if (plugin.law.burning(name)) d.createDiv({ cls: "age-ext__lawhead", text: t("doom.burning") });
    else {
      d.createDiv({ cls: "age-ext__lawhead", text: t("doom.condemned") });
      const burn = d.createEl("button", { cls: "age-ext__sound", text: "🔥 " + t("doom.burn"), attr: { type: "button" } });
      burn.addEventListener("click", () => { if (plugin.law.burn(name)) { plugin.saveExt(); plugin.refreshLive(); } });
    }
  }
  const strong = analysis.resolved.triggered.filter((x) => x.severity === "strong");
  if (analysis.damage) box.createDiv({ cls: "age-ext__lawmeter", text: t("book.damage", { d: analysis.damage.damaged, r: analysis.damage.removed }) });
  if (strong.length) box.createDiv({ cls: "age-ext__fissure", text: t("fissure.label", { a: words(strong[0].a), b: words(strong[0].b) }) });

  if (ext.solitude !== "off") box.createDiv({ cls: "age-ext__trace", text: mech.traceFor(name, lang) });

  if (ext.sound) {
    let layers = sound.mergeLayers(sound.layersForWorld(world), sound.layersForMechs(list.map((x) => x.id)));
    const u = typeof analysis.stability === "number" ? 1 - analysis.stability / 100 : 0;
    if (u > 0.5) layers = sound.mergeLayers(layers, { static: 0.1 + 0.4 * (u - 0.5) });
    const btn = box.createEl("button", { cls: "age-ext__sound", text: "♪ " + t("sound.listen") });
    btn.addEventListener("click", () => plugin.toggleSound(layers, btn, [], name));
  }
  return box;
}

/** Onglets du bloc `age` : texte et glyphes (vitre en petit, au-dessus) · fenêtre de liaison (grande ; un clic = le son d'une liaison) · détails.
 *  Seul l'affichage change : la vitre est déplacée (pas recréée), ses effets continuent. */
function tabifyPanel(plugin, panel) {
  const t = plugin.t, bar = panel.createDiv({ cls: "age-tabs" });
  panel.insertBefore(bar, panel.firstChild);
  const tabs = [["text", t("tab.text")], ["link", t("tab.link")], ["details", t("tab.details")]], btns = {};
  const show = (id) => { panel.dataset.tab = id; for (const k in btns) btns[k].toggleClass("is-active", k === id); };
  for (const [id, label] of tabs) {
    const b = bar.createEl("button", { cls: "age-tabs__btn", text: label, attr: { type: "button", role: "tab" } });
    b.addEventListener("click", () => show(id)); btns[id] = b;
  }
  const win = panel.querySelector(".age-panel__window");
  if (win) {
    const box = panel.createDiv({ cls: "age-tabs__win" });
    panel.insertBefore(box, bar.nextSibling); box.appendChild(win);
    win.addClass("is-touch"); win.setAttr("title", t("link.touch"));
    let timer = 0;
    win.addEventListener("click", () => {
      if (plugin.ext.sound && plugin.ext.soundLink !== false) sound.linkSound(plugin.ext.volume);
      win.removeClass("is-linking"); void win.offsetWidth; win.addClass("is-linking");
      clearTimeout(timer); timer = window.setTimeout(() => win.removeClass("is-linking"), 800);
    });
  }
  show("text");
}

// ---- journal --------------------------------------------------------------------------
function parseJournalSource(source) {
  const o = {};
  for (const l of source.split("\n")) { const m = l.match(/^\s*(age|voice|lang)\s*:\s*(.+?)\s*$/i); if (m) o[m[1].toLowerCase()] = m[2]; }
  return o;
}

async function renderJournal(plugin, source, el, ctx) {
  const { app, core, t } = plugin, opt = parseJournalSource(source);
  const fmAge = (app.metadataCache.getCache(ctx.sourcePath)?.frontmatter || {}).journal_of;
  const link = String(opt.age || fmAge || "").replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();
  el.empty();
  const root = el.createDiv({ cls: "age-journal" });
  if (!link) { root.createDiv({ cls: "age-journal__empty", text: t("journal.noage") }); return; }
  const file = app.metadataCache.getFirstLinkpathDest(link, ctx.sourcePath);
  const src = file ? core.extract(await app.vault.cachedRead(file)) : null;
  if (!file || src === null) { root.createDiv({ cls: "age-journal__empty", text: t("journal.notfound", { name: link }) }); return; }
  const lang = opt.lang || plugin.lang(), voice = (opt.voice || "atrus").toLowerCase();
  const analysis = core.analyse(src, { seed: core.base(file.path) });
  const { list: mechs, world } = mechanismsFor(plugin, src, analysis, file.basename);
  const ids = [...world].filter((i) => !i.startsWith("?"));
  // notes qui renvoient vers l'Âge
  const notes = [];
  for (const [from, targets] of Object.entries(app.metadataCache.resolvedLinks)) {
    if (!targets[file.path] || from === file.path || from === ctx.sourcePath) continue;
    const f = app.vault.getAbstractFileByPath(from); if (!f || f.extension !== "md") continue;
    notes.push({ f, title: f.basename, ctime: f.stat.ctime, mtime: f.stat.mtime });
  }
  notes.sort((a, b) => a.ctime - b.ctime);
  for (const n of notes) n.excerpt = journal.excerptAround(await app.vault.cachedRead(n.f), file.basename);
  const alterations = plugin.law.log(file.basename).map((e) => ({ text: describeChange(e, t) }));
  const prose = core.prose(analysis.resolved, { seed: file.basename }).split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
  const entries = journal.buildEntries({
    voice, lang, analysis, defOf: (id) => core.blocks.get(id), prose, ids, alterations, notes,
    mechs: mechs.map((m) => ({ id: m.id, state: mech.stateWord(m.state, lang), label: mech.label(m.id, lang), desc: mech.describe(m.id, lang) })),
  });
  const head = root.createDiv({ cls: "age-journal__head" });
  head.createSpan({ cls: "age-journal__title", text: t("journal.title", { name: file.basename }) });
  dniText(plugin, head, file.basename, "age-journal__dniname");
  head.createSpan({ cls: "age-journal__voice", text: `— ${voice[0].toUpperCase() + voice.slice(1)}` });
  entries.forEach((e, i) => {
    const row = root.createDiv({ cls: `age-journal__entry age-journal__entry--${e.kind}` });
    const marg = row.createDiv({ cls: "age-journal__margin" });
    if (e.glyph) setMarkup(marg, `<svg viewBox="0 0 100 100" aria-hidden="true">${core.glyphSvg(e.glyph, 0, 0, 100, "light")}</svg>`);
    const body = row.createDiv({ cls: "age-journal__text" });
    body.createDiv({ text: e.text });
    if (e.excerpt) body.createDiv({ cls: "age-journal__excerpt", text: e.excerpt });
    setMarkup(row.createDiv({ cls: "age-journal__page" }), plugin.dni.numberSvg(i + 1, { size: 11 }));
  });
}

/** Texte en lettres D'ni : seulement si une police est installée et que le réglage est actif (jamais de faux D'ni). */
function dniText(plugin, parent, text, cls) {
  if (!plugin.ext.dniText || !plugin.dni.hasFont()) return null;
  const s = parent.createSpan({ cls: "age-dni" + (cls ? " " + cls : ""), text: plugin.dni.textFor(text) });
  s.style.fontFamily = plugin.dni.textStack();
  return s;
}

// ---- bloc `dni` : chiffres en D'ni, texte dans la police si elle est là -----------------------
function renderDniBlock(plugin, source, el) {
  const root = el.createDiv({ cls: "age-dniblock" });
  for (const raw of source.split("\n")) {
    const line = raw.trim(); if (!line) continue;
    const row = root.createDiv({ cls: "age-dniblock__row" });
    if (/^\d+$/.test(line)) setMarkup(row, plugin.dni.numberSvg(line, { size: 36 }) + `<span class="age-dniblock__arabic">${esc(line)}</span>`);
    else { row.setText(plugin.dni.hasFont() ? plugin.dni.textFor(line) : line); row.style.fontFamily = plugin.dni.textStack(); row.style.fontSize = "1.6em"; }
  }
  if (!plugin.dni.hasFont()) root.createDiv({ cls: "age-dniblock__note", text: plugin.t("dni.nofont") });
}

module.exports = { dniText, renderExtras, tabifyPanel, renderJournal, renderDniBlock, ageNumber, calibrationOf, mechanismsFor, parseJournalSource };
