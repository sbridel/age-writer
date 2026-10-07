"use strict";
const obs = require("obsidian"), { Setting } = obs;
const G = require("./guide");

const DEFAULTS = {
  lang: "auto", numerals: "auto", vaultFont: "", showNumbers: true, dniText: true,
  panelFx: "classic", windowStyle: "classic", windowSize: "large", dniClock: true, fxStrength: 1, uncertainLinks: true, reltoMode: "zen", reltoVolume: 0.6,
  law: true, inkDry: 15, heal: 0.05,
  leather: true, coverTab: true, panelTabs: true, bookOpen: "tab", soundBook: true, soundClasp: true, soundLink: true, soundPage: true, reltoTabs: true, linkLeaves: true, coverStyle: "auto", bookStart: "cover",
  mechanisms: "draw", solitude: "balanced",
  sound: true, volume: 0.35,
  journalFolder: "", reltoFolder: "Ages",
  state: { law: { ages: {} } },
};

const L = {
  en: {
    h: "Extensions", sec: { book: ["Books & covers", "book-open", "Leather, covers, where and how a book opens."], snd: ["Sounds", "volume-2", "Book, clasp, linking, soundscapes."], win: ["Linking window", "app-window", "Window style, size, effects, tabs."], dni: ["D'ni & numbers", "languages", "Language, numerals, D'ni script and clock."], mech: ["Ages & mechanics", "settings-2", "Law of change, mechanisms, solitude."], dir: ["Folders", "folder", "Journal and hub folders."], eng: ["Drawing & library", "dices", "Open-slot drawing, drawn panel, auto properties, library folder, default image."], back: "Back", guide: "Guide", guided: "Quick guide and full reference: writing an Age, every line and block, the book, the Relto, sounds, settings.", open: "Guide", ref: "Reference", on: "On", off: "Off" }, lang: "Language of the extensions", num: "Numerals", numd: "Auto picks an installed font, then a local glyph file, then drawn numerals.",
    vf: "Numeral font (name)", vfd: "Family name of a font installed on your system, or a font file in the vault (.ttf/.otf). Not bundled: check its licence.",
    show: "Show numbers", dt: "Names in D'ni script", dtd: "Age and hub names, journal titles, `dni:text` inline. Only when a font is installed.", fx: "Linking window effect", dk: "D'ni time in the Relto", dkd: "Shows the year, month, day and hours of the D'ni calendar, computed from your computer's clock, in D'ni numerals (hide it per block with dni_time: off).", wz: "Window size (age block)", wzd: "Normal: the engine's small window. Large and Extra large make the linking window easier to read.", ws: "Window rendering", wsd: "Classic: the engine's painted window. Generative: a landscape drawn from each Age's seed (also: window_style: generative in the age block).", fxs: "Effect strength", law: "Law of change", lawd: "Editing an explored Age raises its instability.",
    dry: "Minutes before the ink dries", heal: "Healing per day", leather: "Leather book theme", cover: "Cover tab", cs: "Book covers", csd: "How sober the covers are. Auto: each Age draws its own. A line `cover: sober` (ornate, classic, sober, plain, or a number 0–1) in an age block overrides it.", bs: "When a book opens", bsd: "Land on the cover, or keep the tab you were on.", sb: "Book sound", sbd: "When you handle the book (the book view opens): leather and pages.", sc: "Clasp clicks", scd: "When you handle the book: a few clicks of the clasp, after the book sound.", rt: "Relto in tabs", rtd: "View, Pages and Settings tabs; the view shows the date and time larger. Off: the original single panel.", sp: "Page turning", spd: "A rustle when you turn a page of the linking book.", lv: "Linking book in 3 pages", lvd: "One page at a time: glyphs & text, linking panel, links. Off: the original two-page spread.", sl: "Linking sound", sld: "When you move into the Age (the note opens) or touch a linking panel or window.", bo: "Open the book in", bod: "Main tab: opens like a note, but shows the book. Window: a separate window (desktop). Side panel: the original behaviour.", ptabs: "Tabs in the Age block", ptabsd: "Text & glyphs, linking panel (click it to listen), details.", mech: "Mechanisms", mechd: "Draw: the Age invents some. Written: only those you list.",
    sol: "Solitude", sold: "Favours ruins, wild nature, fewer inhabitants. Changes newly drawn worlds.", snd: "Sounds (all)", zen: "Hub soundscape", zend: "Minimal: one pad or a hearth, very light. Zen: up to 4 soft layers. Full: everything the pages ask for.", unc: "Uncertain links", uncd: "A damaged book may flicker, fail or send you astray.", vol: "Volume", jf: "Journal folder", jfd: "Empty: next to the Age note.", rf: "Hub folder",
    o: { ornate: "Ornate", sober: "Sober", plain: "Plain (bare)", cover: "Cover", keep: "Keep the current tab", tab: "Main tab", window: "Window", side: "Side panel", normal: "Normal", large: "Large", xl: "Extra large", auto: "Auto", font: "Font", glyphs: "Glyph file", simple: "Drawn", off: "Off", minimal: "Minimal", zenm: "Zen", full: "Full", random: "Random (per Age)", gen: "Generative", tv: "Old TV", classic: "Classic", static: "Static", ripple: "Ripple", sweep: "Sweep", draw: "Draw", written: "Written only", balanced: "Balanced", strong: "Strong" },
  },
  fr: {
    h: "Extensions", sec: { book: ["Livres & couvertures", "book-open", "Cuir, couvertures, où et comment s'ouvre un livre."], snd: ["Sons", "volume-2", "Livre, fermoir, liaison, ambiances."], win: ["Fenêtre de liaison", "app-window", "Style, taille, effets et onglets de la fenêtre."], dni: ["D'ni & chiffres", "languages", "Langue, chiffres, écriture et horloge D'ni."], mech: ["Âges & mécanismes", "settings-2", "Loi du changement, mécanismes, solitude."], dir: ["Dossiers", "folder", "Dossiers des journaux et du refuge."], eng: ["Tirage & bibliothèque", "dices", "Tirage des cases ouvertes, fenêtre dessinée, propriétés auto, dossier de bibliothèque, image par défaut."], back: "Retour", guide: "Guide", guided: "Guide court et référence complète : écrire un Âge, toutes les lignes et tous les blocs, le livre, le Relto, les sons, les réglages.", open: "Guide", ref: "Référence", on: "Activé", off: "Désactivé" }, lang: "Langue des extensions", num: "Chiffres", numd: "Auto choisit une police installée, puis un fichier de glyphes local, puis des chiffres dessinés.",
    vf: "Police des chiffres (nom)", vfd: "Nom d'une famille installée sur le système, ou fichier de police dans le coffre (.ttf/.otf). Non fournie : vérifiez sa licence.",
    show: "Afficher les nombres", dt: "Noms en écriture D'ni", dtd: "Noms des Âges et du refuge, titres de journal, `dni:texte` en ligne. Seulement si une police est installée.", fx: "Effet de la fenêtre de liaison", dk: "Heure D'ni dans le Relto", dkd: "Affiche l'année, le mois, le jour et les heures du calendrier D'ni, calculés d'après l'horloge de l'ordinateur, en chiffres D'ni (à masquer par bloc avec dni_time: off).", wz: "Taille de la fenêtre (bloc age)", wzd: "Normale : la petite fenêtre du moteur. Grande et Très grande rendent la fenêtre de liaison plus lisible.", ws: "Rendu de la fenêtre", wsd: "Classique : la fenêtre peinte du moteur. Génératif : un paysage tiré de la graine de chaque Âge (aussi : window_style: generative dans le bloc age).", fxs: "Intensité de l'effet", law: "Loi du changement", lawd: "Modifier un Âge exploré augmente son instabilité.",
    dry: "Minutes avant que l'encre sèche", heal: "Guérison par jour", leather: "Thème cuir des livres", cover: "Onglet couverture", cs: "Couvertures des livres", csd: "Sobriété des couvertures. Auto : chaque Âge tire la sienne. Une ligne `cover: sobre` (ornate, classic, sober, plain, ou un nombre de 0 à 1) dans le bloc age l'emporte.", bs: "À l'ouverture d'un livre", bsd: "Tomber sur la couverture, ou garder l'onglet où l'on était.", sb: "Son du livre", sbd: "Quand on manipule le livre (la vue livre s'ouvre) : cuir et pages.", sc: "Clics du fermoir", scd: "Quand on manipule le livre : quelques clics de fermoir, après le son du livre.", rt: "Relto en onglets", rtd: "Onglets Vue, Pages et Réglages ; la vue montre la date et l'heure en grand. Désactivé : le panneau d'origine.", sp: "Pages tournées", spd: "Un froissement de papier quand on tourne une page du livre de liaison.", lv: "Livre de liaison en 3 pages", lvd: "Une page à la fois : glyphes & texte, vitre de liaison, liens. Désactivé : la double page d'origine.", sl: "Son de liaison", sld: "Quand on se déplace dans l'Âge (la note s'ouvre) ou qu'on touche une vitre ou une fenêtre de liaison.", bo: "Ouvrir le livre dans", bod: "Onglet principal : s'ouvre comme une note, mais affiche le livre. Fenêtre : une fenêtre séparée (ordinateur). Panneau latéral : le comportement d'origine.", ptabs: "Onglets dans le bloc Âge", ptabsd: "Texte & glyphes, fenêtre de liaison (cliquer pour écouter), détails.", mech: "Mécanismes", mechd: "Dessinés : l'Âge en invente. Écrits : seulement ceux que vous listez.",
    sol: "Solitude", sold: "Favorise ruines, nature sauvage, peu d'habitants. Change les mondes dessinés ensuite.", snd: "Sons (général)", zen: "Ambiance du refuge", zend: "Minimal : une nappe ou un feu, très léger. Zen : jusqu'à 4 couches douces. Complet : tout ce que demandent les pages.", unc: "Liaisons incertaines", uncd: "Un livre abîmé peut vaciller, échouer ou vous égarer.", vol: "Volume", jf: "Dossier des journaux", jfd: "Vide : à côté de la note de l'Âge.", rf: "Dossier du refuge",
    o: { ornate: "Ornée", sober: "Sobre", plain: "Nue", cover: "Couverture", keep: "Garder l'onglet courant", tab: "Onglet principal", window: "Fenêtre", side: "Panneau latéral", normal: "Normale", large: "Grande", xl: "Très grande", auto: "Auto", font: "Police", glyphs: "Fichier de glyphes", simple: "Dessinés", off: "Aucun", minimal: "Minimal", zenm: "Zen", full: "Complet", random: "Aléatoire (par Âge)", gen: "Génératif", tv: "Vieille télé", classic: "Classique", static: "Statique", ripple: "Ondulation", sweep: "Balayage", draw: "Dessinés", written: "Écrits seulement", balanced: "Équilibrée", strong: "Forte" },
  },
};

function addExtSettings(plugin, el) {
  const e = plugin.ext, l = L[plugin.lang()] || L.en, o = l.o;
  const opts = (keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
  const save = () => { plugin.saveExt(); plugin.refreshLive(); };
  const redraw = () => { try { plugin.redrawEverything(); } catch (x) { /* ignore */ } };
  const engineEls = [...el.children].slice(1); // le moteur d'origine : la ligne de version reste en haut, le reste est rangé dans une rubrique
  const root = el.createDiv({ cls: "age-ext-settings" });
  new Setting(root).setName(l.h).setHeading();
  const icon0 = (host, name) => { try { obs.setIcon && obs.setIcon(host, name); } catch (x) { /* ignore */ } };
  const head = root.createDiv({ cls: "age-set__guide" });
  icon0(head.createSpan({ cls: "age-set__icon" }), "graduation-cap");
  const gt = head.createDiv({ cls: "age-set__txt" }); gt.createDiv({ cls: "age-set__name", text: l.sec.guide }); gt.createDiv({ cls: "age-set__desc", text: l.sec.guided });
  head.createEl("button", { text: l.sec.open, cls: "mod-cta" }).addEventListener("click", () => G.openGuide(plugin));
  head.createEl("button", { text: l.sec.ref }).addEventListener("click", () => G.openGuide(plugin, null, "full"));
  const nav = root.createDiv({ cls: "age-set__nav" }), pages = root.createDiv({ cls: "age-set__pages" });
  const icon = (host, name) => { try { obs.setIcon && obs.setIcon(host, name); } catch (x) { /* ignore */ } };
  const open = (key) => { if (!key) refreshVals(); nav.toggleClass("is-hidden", !!key); head.toggleClass("is-hidden", !!key); for (const [k, p] of Object.entries(sections)) p.toggleClass("is-hidden", k !== key); };
  const sections = {};
  const vals = {}, refreshVals = () => { for (const k of Object.keys(vals)) { try { vals[k].setText(String(sectionVal[k]())); } catch (x) { /* ignore */ } } };
  const yn = (v) => (v ? l.sec.on : l.sec.off);
  const sectionVal = { eng: () => "", book: () => o[e.coverStyle] || e.coverStyle, snd: () => yn(e.sound), win: () => o[e.windowSize] || e.windowSize, dni: () => o[e.numerals] || e.numerals, mech: () => yn(e.law), dir: () => e.reltoFolder || "" };
  const section = (key) => {
    const [name, ic, desc] = l.sec[key];
    const row = nav.createDiv({ cls: "age-set__row" });
    icon(row.createSpan({ cls: "age-set__icon" }), ic);
    const txt = row.createDiv({ cls: "age-set__txt" }); txt.createDiv({ cls: "age-set__name", text: name }); txt.createDiv({ cls: "age-set__desc", text: desc });
    vals[key] = row.createSpan({ cls: "age-set__val", text: String(sectionVal[key]()) });
    icon(row.createSpan({ cls: "age-set__chev" }), "chevron-right");
    row.addEventListener("click", () => open(key));
    const page = pages.createDiv({ cls: "age-set__page is-hidden" }); sections[key] = page;
    const back = page.createDiv({ cls: "age-set__back" }); icon(back.createSpan(), "chevron-left"); back.createSpan({ text: " " + l.sec.back + " · " + name });
    back.addEventListener("click", () => open(null));
    return page;
  };
  let cur = root;
  const dd = (name, desc, key, keys, after) => new Setting(cur).setName(name).setDesc(desc || "").addDropdown((d) => d.addOptions(opts(keys)).setValue(e[key]).onChange((v) => { e[key] = v; save(); if (after) after(); }));
  const tg = (name, desc, key, after) => new Setting(cur).setName(name).setDesc(desc || "").addToggle((t) => t.setValue(!!e[key]).onChange((v) => { e[key] = v; save(); if (after) after(); }));
  const sl = (name, key, min, max, step, after) => new Setting(cur).setName(name).addSlider((s) => s.setLimits(min, max, step).setValue(e[key]).setDynamicTooltip().onChange((v) => { e[key] = v; save(); if (after) after(); }));
  const tx = (name, desc, key, after) => new Setting(cur).setName(name).setDesc(desc || "").addText((t) => t.setValue(e[key] || "").onChange((v) => { e[key] = v.trim(); save(); if (after) after(); }));
  const sub = (name) => new Setting(cur).setName(name).setHeading();

  cur = section("book");
  tg(l.leather, "", "leather");
  tg(l.cover, "", "coverTab");
  dd(l.bo, l.bod, "bookOpen", ["tab", "window", "side"]);
  dd(l.bs, l.bsd, "bookStart", ["cover", "keep"]);
  tg(l.lv, l.lvd, "linkLeaves", () => plugin.refreshLive());
  dd(l.cs, l.csd, "coverStyle", ["auto", "ornate", "classic", "sober", "plain"], () => plugin.redrawEverything());

  cur = section("snd");
  tg(l.snd, "", "sound");
  sl(l.vol, "volume", 0, 1, 0.05, () => { try { plugin.sound.setVolume && plugin.sound.setVolume(e.volume); } catch (x) { /* ignore */ } });
  sub(plugin.lang() === "fr" ? "Livre" : "Book");
  tg(l.sb, l.sbd, "soundBook");
  tg(l.sc, l.scd, "soundClasp");
  tg(l.sp, l.spd, "soundPage");
  sub(plugin.lang() === "fr" ? "Âge" : "Age");
  tg(l.sl, l.sld, "soundLink");
  sub(l.zen);
  new Setting(cur).setName(l.zen).setDesc(l.zend).addDropdown((d) => d.addOptions({ minimal: o.minimal, zen: o.zenm, full: o.full }).setValue(e.reltoMode).onChange((v) => { e.reltoMode = v; save(); }));
  sl(l.vol + " (Relto)", "reltoVolume", 0, 1, 0.05);

  cur = section("win");
  tg(l.ptabs, l.ptabsd, "panelTabs", () => plugin.redrawEverything());
  dd(l.ws, l.wsd, "windowStyle", ["classic", "gen"]);
  dd(l.wz, l.wzd, "windowSize", ["normal", "large", "xl"], () => plugin.redrawEverything());
  dd(l.fx, "", "panelFx", ["classic", "static", "ripple", "sweep", "random", "off"]);
  sl(l.fxs, "fxStrength", 0.2, 2, 0.1);
  tg(l.unc, l.uncd, "uncertainLinks");

  cur = section("dni");
  new Setting(cur).setName(l.lang).addDropdown((d) => d.addOptions({ auto: "Auto", en: "English", fr: "Français" }).setValue(e.lang).onChange((v) => { e.lang = v; save(); }));
  dd(l.num, l.numd, "numerals", ["auto", "font", "glyphs", "simple"], () => plugin.dni.init().then(redraw));
  let fontTimer = 0; // la police est rechargée quand on arrête de taper, pas à chaque touche
  tx(l.vf, l.vfd, "vaultFont", () => { clearTimeout(fontTimer); fontTimer = setTimeout(() => plugin.dni.init().then(redraw), 900); });
  tg(l.show, "", "showNumbers");
  tg(l.dt, l.dtd, "dniText", () => plugin.redrawEverything());
  tg(l.rt, l.rtd, "reltoTabs", () => plugin.refreshLive());
  tg(l.dk, l.dkd, "dniClock", () => plugin.redrawEverything());

  cur = section("mech");
  tg(l.law, l.lawd, "law");
  sl(l.dry, "inkDry", 1, 120, 1);
  sl(l.heal, "heal", 0, 0.3, 0.01);
  dd(l.mech, l.mechd, "mechanisms", ["draw", "written"]);
  dd(l.sol, l.sold, "solitude", ["off", "balanced", "strong"], () => { try { plugin.applyDrawingSettings && plugin.applyDrawingSettings(); } catch (x) { /* ignore */ } });

  cur = section("dir");
  tx(l.jf, l.jfd, "journalFolder");
  tx(l.rf, "", "reltoFolder");
  if (engineEls.length) { cur = section("eng"); for (const c of engineEls) cur.appendChild(c); }
  root.createDiv({ cls: "age-set__footer", text: "Age Writer " + ((plugin.manifest && plugin.manifest.version) || "") });
}
module.exports = { addExtSettings, DEFAULTS };
