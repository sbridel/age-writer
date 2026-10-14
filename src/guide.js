"use strict";
// Guide intégré : une fenêtre à rubriques (et une note exportable). Contenu en français et en anglais.
// Blocs : { p: texte } | { code: texte } | { ul: [lignes] } | { h: sous-titre } | { note: encadré } | { table: { head, rows } }
const GUIDE = {
  fr: [
    { id: "start", icon: "feather", title: "Écrire un Âge", body: [
      { p: "Un Âge est un monde décrit dans un bloc de code `age`, une page par ligne. Le plugin calcule le reste : description, stabilité, fenêtre de liaison, livre." },
      { p: "Tout se joue **dans la fiction** : ta note est un Livre descriptif, chaque ligne une phrase de l'Art, le texte sous le bloc est ce que le livre te renvoie. Ce que tu n'écris pas, l'obscurité le remplit, toujours de la même façon. La stabilité est la tenue de l'Art ; réécrire un monde exploré l'abîme ; le Relto est ta maison. Seuls l'onglet Détails (les notes d'un arpenteur) et les Réglages sortent du monde." },
      { code: "```age\nsingle_sun\nwater\nreturn: [[Hub]]\nlink: [[Sunder Reach]]\n```" },
      { h: "Lignes utiles" },
      { ul: ["`link: [[Note]]` : livre de liaison vers un autre Âge (autant que tu veux)", "`return: [[Note]]` : livre de retour", "`seed: 42` : change le tirage ; même note + même graine = même monde", "`panel: [[image.gif]]` : image de fenêtre à toi", "`trap book` : livre-piège (ni retour ni fissure)", "`cover: sober` : sobriété de la couverture (ornate, classic, sober, plain, ou 0 à 1)", "`window_style: generative`, `window_size: xl`, `fx: tv` : rendu de la fenêtre", "`many: ruins` / `few: rain` (ou `rain: few`) : quantités ; `drizzle: often, dawn` : un temps qui va et vient", "`damaged_pages = 2`, `removed_pages = 1` : livre abîmé"] },
      { p: "Ce que tu n'écris pas est tiré au sort, toujours de la même façon pour la même note. Les « pages » (single_sun, water, stone…) se choisissent aussi dans la palette de la vue livre." },
    ] },
    { id: "panel", icon: "layout-panel-top", title: "Le bloc Âge", body: [
      { p: "Sous le bloc, trois onglets pour ne pas tout montrer à la fois :" },
      { ul: ["**Texte & glyphes** : la description et les glyphes, accompagnés d'une petite fenêtre de liaison au centre", "**Fenêtre de liaison** : la grande fenêtre ; un clic joue le son de liaison", "**Détails** : le reste (stabilité, mécanismes, journal, bouton « Écouter l'Âge »…)"] },
      { p: "Désactivable : réglage « Onglets dans le bloc Âge » (Fenêtre de liaison)." },
      { p: "**Physique du monde** (onglet Détails) : chaque Âge reçoit une physique simplifiée (étoile, orbite, planète, noyau, air, eau, lumière), choisie pour tenir ce que tu as écrit. Si quelque chose ne tient pas, la fiche explique pourquoi et propose une ligne à écrire (`age: 3.5`) : un clic l'écrit dans le bloc. En mode facile (par défaut), la stabilité ne change pas ; en strict, ce qui ne tient pas coûte. Réglage : Âges & mécanismes › Physique des Âges." },
    ] },
    { id: "book", icon: "book-open", title: "Le livre", body: [
      { p: "Commande « Open this Age as a book » : le livre s'ouvre dans un onglet principal (ou une fenêtre, ou le panneau latéral : réglage « Ouvrir le livre dans »). Il s'ouvre toujours sur la **Couverture**." },
      { ul: ["**Couverture** : générée à partir de l'Âge (marbre, cuir, laiton). Sobriété réglable (réglage « Couvertures des livres » ou ligne `cover:`). « Enregistrer la couverture » l'exporte en SVG", "**Livre descriptif** : les pages du monde ; ✓ garde une page tirée, × la retire ; la palette ajoute ou retire des pages", "**Livre de liaison** : trois pages de droite (glyphes et texte, vitre de liaison, liens). Clique la page de droite pour avancer, celle de gauche pour reculer ; un froissement de page accompagne le geste"] },
      { p: "Cliquer la vitre ou « open ↗ » t'emmène dans l'Âge visé (liaison parfois incertaine si le livre est abîmé)." },
    ] },
    { id: "relto", icon: "mountain", title: "Le Relto (refuge)", body: [
      { p: "Ton refuge : une île avec cabane, étagère de livres (tes Âges, cliquables), piliers de liaison. La commande « Open the Relto » le crée ; un bloc `relto` le montre dans n'importe quelle note. Un livre vierge sur la table de la cabane permet d'y écrire un Âge sans quitter le refuge ; une trappe de fer dans le sol mène au coffre où ils sont rangés." },
      { code: "```relto\ninscription: ma devise\n```" },
      { h: "Onglets" },
      { ul: ["**Vue** (œil) : l'image, avec l'heure et l'heure D'ni dessous. Cliquer la zone de l'heure la cache ; elle s'efface seule après quelques secondes, sauf si la souris passe dessus", "**Pages** (feuille) : les pages actives, disponibles, verrouillées ; les livres affichés sur l'étagère", "**Réglages** (engrenage) : heure du ciel, ambiance sonore, niveau et volume", "**Agrandir** : ouvre la **vue Relto** dans un onglet principal, image grande", "**Guide** (livre) : ouvre ce guide sur la rubrique de ce que tu regardes. L'icône de montagne du ruban ouvre le Relto"] },
      { h: "Pages du Relto" },
      { p: "Chaque page ajoute un élément et une ambiance : pins, bouleaux, palmes, fougères, cascade, lucioles, lanternes, neige, aurore, feux d'artifice, montagne, menhirs, cheminée, brume, et, sous l'île : **gemmes, or, argent** (filons et cristaux dans la roche). « Nouvelle page » (onglet Pages) en crée une ; un bouton (globe) en coin de l'image bascule vers la **vue globale** du Relto (île, brume, îlots, pont) ; les pages *Rain*, *Storm*, *Birds*, *Butterflies*, *Moon & sun*, *Comets*, *Dock*, *Bench*, *Islets*, *Calendar pinnacle*, *Blue flowers*, *Grass*, *Ponderosa pines*, *Maples* et *Crystal tree* ajoutent leur élément ; deux pages ont des réglages dans leurs propriétés : **Cat** (`cat_name`, `cat_color` : black, white, orange, grey, cream, tabby, calico, tuxedo, siamese ou #rrggbb ; `cat_sleep` : auto, always, never — le soir, il dort sur le tapis de la cabane, près du feu) et **Koi pond** (`koi_rare` : ogon, platinum, ghost) ; la page **Imager** ajoute l'**Imageur** : on y pose le livre d'un Âge et on l'accorde à ses trois postes (I râtelier : poser ses pages écrites, dans l'ordre ; II banc optique : la lumière de son étoile et l'iris ; III régulateur : son ciel, dont la phase dérive avec l'heure) jusqu'à le voir sur l'écran (indices dans l'onglet Détails) ; une image nette se **verrouille**, puis le périscope tourne, regarde au zénith ou sous l'eau ; on peut aussi écrire ses propres pages dans un bloc `relto-library`." },
      { code: "```relto-library\npage lagon: Lagon | vegetation 0.5 palm, gold 0.6 | audio=river\n```" },
      { p: "Choisir les livres affichés : lignes `folders:`, `exclude:`, `books:` du bloc, ou cases à cocher de l'onglet Pages." },
    ] },
    { id: "sound", icon: "volume-2", title: "Les sons", body: [
      { p: "Tout est synthétisé. Trois gestes, trois sons, chacun réglable :" },
      { ul: ["**Manipuler le livre** (ouvrir la vue livre) : « Son du livre » puis « Clics du fermoir »", "**Se déplacer dans l'Âge** (la note s'ouvre depuis le Relto ou le livre) ou **toucher une vitre** : « Son de liaison » (plusieurs variantes)", "**Tourner une page** du livre de liaison : « Pages tournées »"] },
      { p: "Quand le livre est déjà ouvert, cliquer une vitre ne rejoue que le son de liaison. Les ambiances (Relto, Âge) se lancent avec le bouton ♪." },
    ] },
    { id: "law", icon: "scale", title: "Loi du changement", body: [
      { p: "Écrire un Âge, c'est le fixer. Tant que l'encre est fraîche (15 minutes par défaut), tu peux le retoucher. Après, modifier le monde (ajouter ou retirer une page) l'abîme : son instabilité monte, puis redescend si on le laisse en paix. Espaces, sauts de ligne, majuscules ou renommage ne comptent pas." },
      { p: "Réglages : « Loi du changement », « Minutes avant que l'encre sèche », « Guérison par jour »." },
    ] },
    { id: "settings", icon: "settings", title: "Réglages et commandes", body: [
      { p: "Réglages du plugin, section « Extensions », en sept pages : Livres & couvertures, Sons, Fenêtre de liaison, D'ni & chiffres, Âges & mécanismes, Dossiers, Tirage & bibliothèque." },
      { ul: ["Open this Age as a book", "Open the Relto / Open the Relto view (large)", "Create a Relto page", "Generate a random Age (un monde cohérent tiré au hasard, dans le dossier du refuge)", "Save this Age's book cover (SVG)", "Create the exploration journal for this Age", "Open the Age Writer guide (cette fenêtre)"] },
      { p: "Projet de fan, sans lien avec Cyan Worlds. Aucune ressource de Myst n'est fournie. This product contains trademarks and/or copyrighted works of Cyan. All rights reserved by Cyan. This product is not official and is not endorsed by Cyan." },
    ] },
  ],
  en: [
    { id: "start", icon: "feather", title: "Writing an Age", body: [
      { p: "An Age is a world described in an `age` code block, one page per line. The plugin works out the rest: description, stability, linking window, book." },
      { p: "Everything happens **inside the fiction**: your note is a Descriptive Book, each line a phrase of the Art, the text under the block is what the book says back. What you leave unwritten, the dark fills in, always the same way. Stability is how well the Art holds; rewriting an explored world damages it; the Relto is your home. Only the Details tab (a surveyor's notes) and the Settings step outside the world." },
      { code: "```age\nsingle_sun\nwater\nreturn: [[Hub]]\nlink: [[Sunder Reach]]\n```" },
      { h: "Useful lines" },
      { ul: ["`link: [[Note]]`: a linking book to another Age (as many as you like)", "`return: [[Note]]`: the way home", "`seed: 42`: changes the draw; same note + same seed = same world", "`panel: [[image.gif]]`: your own window image", "`trap book`: a trap (no return, no fissure)", "`cover: sober`: cover sobriety (ornate, classic, sober, plain, or 0 to 1)", "`window_style: generative`, `window_size: xl`, `fx: tv`: window rendering", "`many: ruins` / `few: rain` (or `rain: few`): quantities; `drizzle: often, dawn`: weather that comes and goes", "`damaged_pages = 2`, `removed_pages = 1`: a damaged book"] },
      { p: "Whatever you leave out is drawn at random, always the same way for the same note. Pages (single_sun, water, stone…) can also be picked from the book view palette." },
    ] },
    { id: "panel", icon: "layout-panel-top", title: "The Age block", body: [
      { p: "Three tabs under the block so it doesn't show everything at once:" },
      { ul: ["**Text & glyphs**: the description and glyphs, with a small linking window", "**Linking window**: the big window; a click plays the linking sound", "**Details**: the rest (stability, mechanisms, journal, “Listen to the Age”…)"] },
      { p: "Can be turned off: “Tabs in the Age block” (Linking window)." },
      { p: "**Physics of the world** (Details tab): every Age gets a simplified physics (star, orbit, planet, core, air, water, light), chosen to hold what you wrote. When something does not hold, the sheet explains why and suggests a line to write (`age: 3.5`): one click writes it into the block. In easy mode (the default), stability does not change; in strict mode, what does not hold costs. Setting: Ages & mechanisms › Physics of the Ages." },
    ] },
    { id: "book", icon: "book-open", title: "The book", body: [
      { p: "“Open this Age as a book”: opens in a main tab (or a window, or the side panel: “Open the book in”). It always opens on the **Cover**." },
      { ul: ["**Cover**: generated from the Age (marble, leather, brass). Sobriety adjustable (“Book covers” setting or a `cover:` line). “Save cover” exports an SVG", "**Descriptive book**: the world's pages; ✓ keeps a drawn page, × removes it; the palette adds or removes pages", "**Linking book**: three right-hand pages (glyphs + text, linking panel, links). Click the right page to go forward, the left page to go back; a page-turn rustle plays"] },
      { p: "Clicking the glass or “open ↗” takes you to the Age (the link can be unreliable if the book is damaged)." },
    ] },
    { id: "relto", icon: "mountain", title: "The Relto (refuge)", body: [
      { p: "Your refuge: an island with a hut, a bookshelf (your Ages, clickable) and linking pillars. The command “Open the Relto” creates it; a `relto` block shows it in any note. A blank book on the cabin table lets you write an Age without leaving the refuge; an iron hatch in the floor leads to the vault where they are kept." },
      { code: "```relto\ninscription: my motto\n```" },
      { h: "Tabs" },
      { ul: ["**View** (eye): the image, with the time and the D'ni time below. Clicking the time hides it; it also fades by itself after a few seconds unless the mouse is over it", "**Pages** (sheet): active, available and locked pages; the books on the shelf", "**Settings** (cog): sky time, soundscape, level and volume", "**Expand**: opens the dedicated **Relto view** in a main tab, with a large image", "**Guide** (book): opens this guide on the topic of what you are looking at. The mountain icon in the ribbon opens the Relto"] },
      { h: "Relto pages" },
      { p: "Each page adds an element and an ambience: pines, birches, palms, ferns, waterfall, fireflies, lanterns, snow, aurora, fireworks, mountain, pillars, chimney, mist and, under the island: **gems, gold, silver** (veins and crystals in the rock). “New page” (Pages tab) creates one; a globe button in the corner of the image switches to the **global view** of the Relto (island, mist, islets, bridge); the pages *Rain*, *Storm*, *Birds*, *Butterflies*, *Moon & sun*, *Comets*, *Dock*, *Bench*, *Islets*, *Calendar pinnacle*, *Blue flowers*, *Grass*, *Ponderosa pines*, *Maples* and *Crystal tree* add their element; two pages have settings in their properties: **Cat** (`cat_name`, `cat_color`: black, white, orange, grey, cream, tabby, calico, tuxedo, siamese or #rrggbb; `cat_sleep`: auto, always, never — in the evening it sleeps on the cabin rug, by the fire) and **Koi pond** (`koi_rare`: ogon, platinum, ghost); the **Imager** page adds the **Imager**: put an Age's book on it and tune it at its three stations (I crystal rack: set its written pages, in order; II optical bench: its star's light and the iris; III regulator: its sky, whose phase drifts with the hour) until you see it on the screen (clues in the Details tab); a clear image can be **locked**, then the periscope turns, looks up at the zenith or under the water; you can also write your own in a `relto-library` block." },
      { code: "```relto-library\npage lagoon: Lagoon | vegetation 0.5 palm, gold 0.6 | audio=river\n```" },
      { p: "Choose the books shown: `folders:`, `exclude:`, `books:` lines, or the checkboxes in the Pages tab." },
    ] },
    { id: "sound", icon: "volume-2", title: "Sounds", body: [
      { p: "Everything is synthesised. Three gestures, three sounds, each adjustable:" },
      { ul: ["**Handling the book** (the book view opens): “Book sound” then “Clasp clicks”", "**Moving into the Age** (the note opens from the Relto or the book) or **touching a glass**: “Linking sound” (several variants)", "**Turning a page** of the linking book: “Page turning”"] },
      { p: "When the book is already open, clicking a glass replays only the linking sound. Ambiences (Relto, Age) start with the ♪ button." },
    ] },
    { id: "law", icon: "scale", title: "Law of change", body: [
      { p: "Writing an Age fixes it. While the ink is fresh (15 minutes by default) you can edit freely. After that, changing the world (adding or removing a page) damages it: instability rises, then slowly heals if left alone. Whitespace, line breaks, capitals or renaming don't count." },
      { p: "Settings: “Law of change”, “Minutes before the ink dries”, “Healing per day”." },
    ] },
    { id: "settings", icon: "settings", title: "Settings & commands", body: [
      { p: "Plugin settings, “Extensions” section, in seven pages: Books & covers, Sounds, Linking window, D'ni & numbers, Ages & mechanics, Folders, Drawing & library." },
      { ul: ["Open this Age as a book", "Open the Relto / Open the Relto view (large)", "Create a Relto page", "Generate a random Age (a coherent random world, in the refuge folder)", "Save this Age's book cover (SVG)", "Create the exploration journal for this Age", "Open the Age Writer guide (this window)"] },
      { p: "A fan project, unrelated to Cyan Worlds. No Myst asset is included. This product contains trademarks and/or copyrighted works of Cyan. All rights reserved by Cyan. This product is not official and is not endorsed by Cyan." },
    ] },
  ],
};


// Référence complète : quatre parties (réglages, ce que l'on écrit, ce que l'Âge produit seul, Relto), en français et en anglais.
const { REF_EN } = require("./guide-ref-en");
const { REF_FR } = require("./guide-ref-fr");
const PART_ORDER = ["set", "write", "gen", "relto", "spoil"];
const PARTS = {
  en: { set: "Settings", write: "What you write", gen: "What the Age generates by itself", relto: "Relto", spoil: "Spoilers" },
  fr: { set: "Réglages", write: "Ce que tu écris", gen: "Ce que l'Âge génère seul", relto: "Relto", spoil: "Spoilers" },
};
/** Rubrique ouverte par défaut dans la référence : la façon d'écrire un Âge. */
const REF_START = "syntax";

/** Niveaux du guide : « quick » (court) et « full » (référence complète, en français et en anglais). */
const topics = (lang, level) => (level === "full" ? (lang === "fr" ? REF_FR : REF_EN) : GUIDE[lang] || GUIDE.en);

/** Texte Markdown du guide (pour l'enregistrer dans une note). */
function toMarkdown(lang, level) {
  const out = [level === "full" ? (lang === "fr" ? "# Age Writer — Référence complète" : "# Age Writer — Full reference") : "# Age Writer — Guide", ""];
  const parts = PARTS[lang] || PARTS.en, cell = (x) => String(x).replace(/\|/g, "\\|");
  let part = null;
  for (const t of topics(lang, level)) {
    if (t.spoiler) continue; // la note enregistrée ne contient jamais les spoilers
    if (t.part && t.part !== part) { part = t.part; out.push("## " + parts[part], ""); }
    out.push((t.part ? "### " : "## ") + t.title, "");
    for (const b of t.body) {
      if (b.p) out.push(b.p, "");
      else if (b.h) out.push((t.part ? "#### " : "### ") + b.h, "");
      else if (b.code) out.push("````", b.code, "````", "");
      else if (b.ul) out.push(...b.ul.map((x) => "- " + x), "");
      else if (b.note) out.push("> " + b.note, "");
      else if (b.table) out.push("| " + b.table.head.map(cell).join(" | ") + " |", "|" + b.table.head.map(() => " --- |").join(""), ...b.table.rows.map((r) => "| " + r.map(cell).join(" | ") + " |"), "");
    }
  }
  return out.join("\n");
}

// `code` et **gras** → éléments DOM, sans innerHTML
function inline(el, text) {
  for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/)) {
    if (!part) continue;
    if (part.startsWith("**")) el.createEl("strong", { text: part.slice(2, -2) });
    else if (part[0] === "`") el.createEl("code", { text: part.slice(1, -1) });
    else if (part[0] === "*" && part.length > 2 && part.endsWith("*")) el.createEl("em", { text: part.slice(1, -1) });
    else el.appendText(part);
  }
}

/** Forme de recherche d'un caractère : minuscule, sans accent (un caractère pour un, pour surligner au bon endroit). */
const foldChar = (ch) => { const f = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); return f.length === 1 ? f : ch.toLowerCase(); };
const fold = (s) => Array.from(String(s), foldChar).join("");
/** Tout le texte d'une rubrique, pour la recherche (le corps d'une rubrique « spoiler » n'en fait pas partie : seul son titre). */
function topicText(t) {
  const out = [t.title];
  if (!t.spoiler) for (const b of t.body) {
    if (b.p) out.push(b.p); else if (b.h) out.push(b.h); else if (b.code) out.push(b.code); else if (b.note) out.push(b.note);
    else if (b.ul) out.push(...b.ul); else if (b.table) out.push(...b.table.head, ...b.table.rows.flat());
  }
  return fold(out.join("\n").replace(/\*\*|`/g, ""));
}
/** Surligne `q` (déjà replié) dans les textes de `el` ; rend la première marque. */
function highlight(el, q) {
  if (!q) return null;
  const doc = el.ownerDocument, walk = doc.createTreeWalker(el, 4), nodes = []; let n, first = null;
  while ((n = walk.nextNode())) if (!n.parentElement.closest(".age-guide__mini")) nodes.push(n);
  for (const node of nodes) {
    const txt = node.nodeValue, f = fold(txt); let i = f.indexOf(q); if (i < 0) continue;
    const frag = doc.createDocumentFragment(); let at = 0;
    while (i >= 0) { frag.appendChild(doc.createTextNode(txt.slice(at, i))); const m = doc.createElement("mark"); m.className = "age-guide__hit"; m.textContent = txt.slice(i, i + q.length); frag.appendChild(m); if (!first) first = m; at = i + q.length; i = f.indexOf(q, at); }
    frag.appendChild(doc.createTextNode(txt.slice(at))); node.parentNode.replaceChild(frag, node);
  }
  return first;
}

/** Dessine une rubrique dans `host` (`kicker` : le nom de sa partie, au-dessus du titre).
 *  Une longue rubrique (quatre sous-titres ou plus) s'ouvre sur un mini-sommaire : un lien par sous-titre. */
function renderTopic(host, topic, kicker, spoil) {
  host.empty();
  if (kicker) host.createDiv({ cls: "age-guide__kicker", text: kicker });
  host.createEl("h2", { text: topic.title });
  const heads = topic.gate ? [] : topic.body.filter((b) => b.h), mini = heads.length >= 4 ? host.createDiv({ cls: "age-guide__mini" }) : null, h4s = [];
  let page = host; // une rubrique « spoiler » s'ouvre sur un avertissement et une case : le texte reste caché tant qu'elle n'est pas cochée
  if (topic.gate) {
    const st = spoil || { on: false }, gate = host.createDiv({ cls: "age-guide__gate" }); gate.createDiv({ cls: "age-guide__spoiltag", text: "⚠ SPOILER ⚠" }); inline(gate.createEl("p"), topic.gate.p);
    const lab = gate.createEl("label", { cls: "age-guide__gatebox" }), cb = lab.createEl("input", { type: "checkbox" }); lab.appendText(" " + topic.gate.label); cb.checked = !!st.on;
    page = host.createDiv({ cls: "age-guide__spoiler" }); page.hidden = !st.on;
    cb.addEventListener("change", () => { st.on = cb.checked; page.hidden = !st.on; });
  }
  host = page;
  for (const b of topic.body) {
    if (b.p) inline(host.createEl("p"), b.p);
    else if (b.h) h4s.push(host.createEl("h4", { text: b.h }));
    else if (b.code) host.createEl("pre", { cls: "age-guide__code" }).createEl("code", { text: b.code });
    else if (b.ul) { const ul = host.createEl("ul"); for (const x of b.ul) inline(ul.createEl("li"), x); }
    else if (b.note) inline(host.createDiv({ cls: "age-guide__note" }), b.note);
    else if (b.table) {
      const wrap = host.createDiv({ cls: "age-guide__tablewrap" }), table = wrap.createEl("table", { cls: "age-guide__table" + (b.table.phys ? " age-guide__table--phys" : "") });
      const hr = table.createEl("thead").createEl("tr"); for (const x of b.table.head) hr.createEl("th", { text: x });
      const tb = table.createEl("tbody");
      for (const r of b.table.rows) { const tr = tb.createEl("tr"); for (const x of r) inline(tr.createEl("td"), x); }
    }
  }
  if (mini) for (const h of h4s) { // le corps du guide est positionné : `offsetTop` se compte depuis lui
    const a = mini.createEl("button", { cls: "age-guide__minilink", text: h.textContent }), box = mini.parentElement;
    a.addEventListener("click", () => { box.scrollTop = Math.max(0, h.offsetTop - 8); });
  }
}

/** Ouvre le guide dans une fenêtre : niveau court ou référence complète, rubriques à gauche, texte à droite.
 *  Sur un écran étroit (téléphone), le sommaire et le texte se relaient : on choisit une rubrique, « Sommaire » y ramène.
 *  `opts.over` : l'élément d'où on l'ouvre (le Relto) ; en plein écran, la fenêtre se pose par-dessus lui.
 *  `opts.book` : le Traité de l'Art (le même guide, ouvert depuis le livre de l'étage) : titre du livre (`title`, `dni`, `font`), parchemin, et `onFlip()` à chaque rubrique tournée. */
function openGuide(plugin, topicId, level0, opts) {
  const obs = require("obsidian"), lang = plugin.lang(), fr = lang === "fr";
  class GuideModal extends obs.Modal {
    onOpen() {
      const { contentEl, modalEl } = this; contentEl.empty(); modalEl.addClass("age-guide-modal");
      const book = opts && opts.book; if (book) { modalEl.addClass("age-guide-modal--book"); const hd = contentEl.createDiv({ cls: "age-guide__bookhead" }); if (book.dni) { const d = hd.createDiv({ cls: "age-guide__bookdni age-dni" }); d.setText(book.dni); if (book.font) d.style.fontFamily = book.font; } hd.createDiv({ cls: "age-guide__booktitle", text: book.title }); }
      let level = level0 === "full" ? "full" : "quick"; const spoil = { on: false }; // la case « spoilers » : décochée à chaque ouverture du guide
      let flips = 0; const flip = () => { if (book && book.onFlip && flips++ > 0) book.onFlip(); }; // la première rubrique est l'ouverture du livre, pas une page tournée
      const tabs = contentEl.createDiv({ cls: "age-guide__levels" }), root = contentEl.createDiv({ cls: "age-guide" });
      const side = root.createDiv({ cls: "age-guide__side" }), main = root.createDiv({ cls: "age-guide__main" });
      const search = side.createEl("input", { cls: "age-guide__search", type: "search", attr: { placeholder: fr ? "Chercher dans le guide…" : "Search the guide…", "aria-label": fr ? "Chercher" : "Search" } });
      const nav = side.createDiv({ cls: "age-guide__nav" }), none = side.createDiv({ cls: "age-guide__none", text: fr ? "Rien trouvé." : "Nothing found." }); none.hidden = true;
      let query = "", cur = null, go = () => {}; // `go(±1)` : rubrique voisine (flèches du clavier)
      const tocBtn = main.createEl("button", { cls: "age-guide__tocbtn", text: fr ? "‹ Sommaire" : "‹ Contents" }); // écran étroit seulement (CSS)
      const body = main.createDiv({ cls: "age-guide__body" }), steps = main.createDiv({ cls: "age-guide__steps" }), foot = main.createDiv({ cls: "age-guide__foot" });
      const toc = (on) => { root.toggleClass("is-toc", on); if (on) nav.scrollTop = 0; };
      const reveal = (r) => { if (!r || r.offsetParent === null) return; const top = r.offsetTop, bot = top + r.offsetHeight; if (top < nav.scrollTop || bot > nav.scrollTop + nav.clientHeight) nav.scrollTop = Math.max(0, top - nav.clientHeight / 3); };
      tocBtn.addEventListener("click", () => toc(true));
      const lv = { quick: tabs.createEl("button", { text: fr ? "Guide court" : "Quick guide", cls: "age-guide__level" }), full: tabs.createEl("button", { text: fr ? "Référence complète" : "Full reference", cls: "age-guide__level" }) };
      const draw = (id) => {
        const list = topics(lang, level), rows = {}; nav.empty();
        for (const k of Object.keys(lv)) lv[k].toggleClass("is-active", k === level);
        const parts = PARTS[lang] || PARTS.en;
        const show = (tid) => {
          const t = list.find((x) => x.id === tid) || list[0]; if (cur !== t.id) flip(); cur = t.id; for (const [k, r] of Object.entries(rows)) r.toggleClass("is-active", k === t.id); renderTopic(body, t, t.part && parts[t.part], spoil); body.scrollTop = 0; toc(false);
          reveal(rows[t.id]); // le sommaire défile jusqu'à la rubrique ouverte
          const hit = highlight(body, query); if (hit) body.scrollTop = Math.max(0, hit.offsetTop - body.clientHeight / 3);
          steps.empty(); // rubrique précédente / suivante : lire d'une traite sans repasser par le sommaire
          const vis = list.filter((x) => !rows[x.id].hasClass("is-out")), j = vis.indexOf(t), prev = j < 0 ? null : vis[j - 1], next = vis[j + 1]; // la recherche active : on tourne parmi les rubriques trouvées
          const step = (t2, cls, word) => { // un mot (« ‹ Précédent ») au-dessus du titre de la rubrique, qui passe à la ligne au lieu de déborder
            const b = steps.createEl("button", { cls: "age-guide__step " + cls }); b.createSpan({ cls: "age-guide__stepword", text: word }); b.createSpan({ cls: "age-guide__steptitle", text: t2.title });
            b.addEventListener("click", () => show(t2.id));
          };
          if (prev) step(prev, "age-guide__step--prev", fr ? "‹ Précédent" : "‹ Previous");
          if (next) step(next, "age-guide__step--next", fr ? "Suivant ›" : "Next ›");
        };
        let part = null; const heads = {}, texts = {};
        for (const t of list) {
          if (t.part && t.part !== part) { part = t.part; heads[part] = nav.createDiv({ cls: "age-guide__part", text: parts[part] }); }
          const r = nav.createDiv({ cls: "age-guide__item" }); rows[t.id] = r; texts[t.id] = topicText(t);
          try { obs.setIcon(r.createSpan({ cls: "age-guide__icon" }), t.icon); } catch (e) { /* ignore */ }
          r.createSpan({ text: t.title }); r.addEventListener("click", () => show(t.id));
        }
        // la recherche : le sommaire ne garde que les rubriques qui contiennent les mots, et le texte les surligne
        const filter = () => {
          const seen = list.filter((t) => !query || texts[t.id].includes(query)), keep = new Set(seen.map((t) => t.id));
          for (const t of list) rows[t.id].toggleClass("is-out", !keep.has(t.id)); // une classe, pas `hidden` : la règle `display: flex` des lignes l'emporterait
          for (const [p, h] of Object.entries(heads)) h.toggleClass("is-out", !seen.some((t) => t.part === p));
          none.hidden = seen.length > 0; return seen;
        };
        search.oninput = () => { query = fold(search.value.trim()); const seen = filter(); if (seen.length && !narrow()) show(seen.some((t) => t.id === cur) ? cur : seen[0].id); };
        search.onkeydown = (e) => { if (e.key === "Enter") { const seen = filter(); if (seen.length) show(seen[0].id); } };
        go = (d) => { const seen = list.filter((t) => !rows[t.id].hasClass("is-out")), i = seen.findIndex((t) => t.id === cur); const t = seen[i + d]; if (t) show(t.id); };
        filter();
        show(id || (level === "full" ? REF_START : null));
        if (!id && narrow()) toc(true); // sur téléphone, sans rubrique demandée : on ouvre sur le sommaire
      };
      // ← et → tournent les rubriques (pas pendant qu'on écrit dans la recherche)
      this.keys = (e) => { if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || "")) return; if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { go(1); e.preventDefault(); } };
      modalEl.ownerDocument.addEventListener("keydown", this.keys);
      const narrow = () => !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
      for (const k of Object.keys(lv)) lv[k].addEventListener("click", () => { level = k; draw(); });
      foot.createEl("button", { text: fr ? "Enregistrer en note" : "Save as a note" }).addEventListener("click", async () => {
        const path = level === "full" ? (fr ? "Age Writer — Référence.md" : "Age Writer — Reference.md") : "Age Writer — Guide.md", ex = plugin.app.vault.getAbstractFileByPath(path);
        const f = ex || await plugin.app.vault.create(path, toMarkdown(lang, level));
        new obs.Notice(fr ? "Enregistré : " + path : "Saved: " + path); this.close(); plugin.app.workspace.getLeaf("tab").openFile(f);
      });
      draw(topicId);
    }
    onClose() { if (this.keys) this.modalEl.ownerDocument.removeEventListener("keydown", this.keys); this.contentEl.empty(); }
  }
  const m = new GuideModal(plugin.app); m.open();
  // ouvert depuis le Relto en plein écran : la fenêtre doit passer devant lui (plein écran du navigateur : elle doit vivre dans l'élément plein écran)
  const over = opts && opts.over, fsEl = over && over.ownerDocument && over.ownerDocument.fullscreenElement;
  if (fsEl && m.containerEl && m.containerEl.parentElement !== fsEl) fsEl.appendChild(m.containerEl);
  if (over && m.containerEl) m.containerEl.addClass("age-guide-over");
}

module.exports = { GUIDE, PARTS, PART_ORDER, REF_START, topics, toMarkdown, renderTopic, openGuide, fold, topicText };
