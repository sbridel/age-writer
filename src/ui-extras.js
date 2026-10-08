"use strict";
/** Ajouts à l'interface existante : numéros D'ni, mécanismes, altérations, solitude, son ; journal ; bloc `dni`. */
const { fnv, esc, words } = require("./util");
const { worldIds, describeChange } = require("./law");
const mech = require("./mech");
const sound = require("./sound");
const journal = require("./journal");
const PH = require("./physics/index");

const ageNumber = (name) => fnv(name) % 390625;                    // 25^4
const coords = (name) => ["x", "y", "z"].map((k) => fnv(name + "|" + k) % 625); // 25^2

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
  node(t("chain.light"), f(w.light) + "×", w.light >= 0.01 ? "ok" : "bad");
  chain.createSpan({ cls: "age-det__break" });
  node(t("chain.heat"), f(w.heat) + "×", w.volcanism ? "ok" : "warn"); arrow();
  node(t("chain.core"), w.liquidCore ? t("chain.liquid") : t("chain.frozen"), w.liquidCore ? "ok" : "warn"); arrow();
  node(t("chain.field"), w.field > 0.2 ? f(w.field) + "×" : t("chain.none"), w.field > 0.2 ? "ok" : "warn"); arrow();
  node(t("chain.air"), f(w.P) + " bar", w.P >= 0.05 ? "ok" : w.P >= 0.005 ? "warn" : "bad");
  // fiche
  const dl = sec.createEl("dl", { cls: "age-det__sheet" });
  for (const [k, v] of sh.rows) { dl.createEl("dt", { text: k }); dl.createEl("dd", { text: v }); }
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
        b.addEventListener("click", () => plugin.writePhysicsLine(path, src, h.key, h.value));
      } else fixes.createSpan({ cls: "age-det__fixtxt", text: txt });
    });
  });
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
    const c = coords(name), seedLine = /^\s*seed\s*:\s*(\d+)\s*$/im.exec(src);
    dniText(plugin, plate, name, "age-ext__dniname");
    let h = `<span class="age-ext__lbl">${esc(t("num.age"))}</span>${dni.numberSvg(ageNumber(name), { size: 18 })}`;
    h += `<span class="age-ext__lbl">${esc(t("num.coords"))}</span>` + c.map((n) => dni.numberSvg(n, { size: 14 })).join('<span class="age-ext__dot">·</span>');
    if (seedLine) h += `<span class="age-ext__lbl">${esc(t("num.seed"))}</span>${dni.numberSvg(seedLine[1], { size: 14 })}`;
    plate.insertAdjacentHTML("beforeend", h);
  }

  if (list.length || unknown.length) {
    const m = box.createDiv({ cls: "age-ext__mechs" });
    for (const x of list) {
      const row = m.createDiv({ cls: "age-ext__mech" + (x.written ? " is-written" : "") });
      row.createDiv({ cls: "age-ext__icon" }).innerHTML = `<svg viewBox="0 0 100 100"><path d="${mech.MECHS[x.id].icon}" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="miter"/></svg>`;
      const body = row.createDiv({ cls: "age-ext__mechbody" });
      body.createEl("b", { text: mech.label(x.id, lang) });
      body.createSpan({ text: ` · ${mech.stateWord(x.state, lang)}` + (x.written ? "" : ` · ${t("mech.drawn")}`) });
      body.createDiv({ cls: "age-ext__desc", text: mech.describe(x.id, lang) });
      const det = body.createEl("details", { cls: "age-ext__puzzle" });
      det.createEl("summary", { text: `${t("mech.puzzle")} — ${mech.puzzleLabel(x.puzzle.kind, lang)}` });
      det.createDiv({ cls: "age-ext__nums" }).innerHTML = x.puzzle.values.map((v) => dni.numberSvg(v, { size: 16 })).join("") + (x.puzzle.hz ? `<span class="age-ext__hz">${x.puzzle.hz.join(" · ")} Hz</span>` : "");
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
  const prose = core.prose(analysis.resolved).split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
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
    if (e.glyph) marg.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${core.glyphSvg(e.glyph, 0, 0, 100, "light")}</svg>`;
    const body = row.createDiv({ cls: "age-journal__text" });
    body.createDiv({ text: e.text });
    if (e.excerpt) body.createDiv({ cls: "age-journal__excerpt", text: e.excerpt });
    row.createDiv({ cls: "age-journal__page" }).innerHTML = plugin.dni.numberSvg(i + 1, { size: 11 });
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
    if (/^\d+$/.test(line)) row.innerHTML = plugin.dni.numberSvg(line, { size: 36 }) + `<span class="age-dniblock__arabic">${esc(line)}</span>`;
    else { row.setText(plugin.dni.hasFont() ? plugin.dni.textFor(line) : line); row.style.fontFamily = plugin.dni.textStack(); row.style.fontSize = "1.6em"; }
  }
  if (!plugin.dni.hasFont()) root.createDiv({ cls: "age-dniblock__note", text: plugin.t("dni.nofont") });
}

module.exports = { dniText, renderExtras, tabifyPanel, renderJournal, renderDniBlock, ageNumber, coords, mechanismsFor, parseJournalSource };
