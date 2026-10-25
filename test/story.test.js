"use strict";
// Mode histoire (fondation) : le Relto histoire, ses Âges et ses pages isolés du bac à sable ; les chapitres et leur avancement.
const assert = require("assert");
const ST = require("../src/story");
const M = require("../src/relto-model");
const { analyseAgeBase } = require("../src/engine/analysis");
const { blockById } = require("../src/engine/registry");
let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; };

const axisOf = (id) => { const b = blockById.get(id); return b ? b.axis : null; };
// un Âge tel que l'index le décrit : stabilité du moteur + pages écrites
const age = (name, lines, path) => ({ name, path: path || `Histoire/${name}.md`, stability: analyseAgeBase(lines.join("\n"), { seed: name, draw: false }).stability, glyphs: lines });

// --- marqueur, dossiers
ok(ST.isStory({ relto_mode: "story" }) && !ST.isStory({}) && !ST.isStory(null) && !ST.isStory({ relto_mode: "sandbox" }), "isStory : seulement relto_mode: story");
ok(M.parseRelto({ relto_mode: "story" }).mode === "story" && M.parseRelto({}).mode === "sandbox" && M.parseRelto({ relto_mode: "autre" }).mode === "sandbox", "parseRelto : mode histoire ou bac à sable");
ok(ST.dirOf("Histoire/Premier.md") === "Histoire" && ST.dirOf("a/b/c.md") === "a/b" && ST.dirOf("c.md") === "", "dirOf");
ok(ST.inDirs("Histoire/x.md", ["histoire"]) && ST.inDirs("Histoire/sous/x.md", ["Histoire"]) && !ST.inDirs("Histoire2/x.md", ["Histoire"]) && !ST.inDirs("x.md", [""]) && !ST.inDirs("x.md", []), "inDirs : sous-dossiers oui, dossier voisin non, dossier vide jamais");

// --- isolation
const all = [{ name: "A", path: "Histoire/A.md" }, { name: "B", path: "Ages/B.md" }, { name: "C", path: "C.md" }];
ok(ST.scopeAges(all, { story: true, mine: "Histoire", storyDirs: ["Histoire"] }).map((a) => a.name).join() === "A", "Relto histoire : ses Âges seulement");
ok(ST.scopeAges(all, { story: false, mine: "", storyDirs: ["Histoire"] }).map((a) => a.name).join() === "B,C", "bac à sable : aucun Âge d'un dossier histoire");
ok(ST.scopeAges(all, { story: false, mine: "", storyDirs: [] }).length === 3, "bac à sable sans histoire : tous les Âges");
ok(ST.scopePaths("Histoire/p.md", { story: true, mine: "Histoire", storyDirs: ["Histoire"] }) && !ST.scopePaths("Ages/p.md", { story: true, mine: "Histoire", storyDirs: ["Histoire"] }) && !ST.scopePaths("Histoire/p.md", { story: false, mine: "", storyDirs: ["Histoire"] }) && ST.scopePaths("Ages/p.md", { story: false, mine: "", storyDirs: ["Histoire"] }), "pages-notes : même règle");

// --- chapitre 1 : un monde où se reposer
const good = age("Bon", ["single_sun", "steady_cycle", "water", "sand", "fern"]);
const ctx = (ages, seen) => ({ ages, axisOf, seen: seen || {} });
ok(ST.check(ST.chapterById("rest"), ctx([good])).ok, "rest : stable, 5 pages, ciel + eau/terre + vivant : réussi");
const bad = age("Mauvais", ["single_sun", "steady_cycle", "water", "lava"]);
ok(bad.stability < 75 && ST.check(ST.chapterById("rest"), ctx([bad])).why === "stable", "rest : un monde instable ne réussit pas");
const few = age("Court", ["single_sun", "water", "fern"]);
ok(few.stability >= 75 && ST.check(ST.chapterById("rest"), ctx([few])).why === "pages", "rest : moins de quatre pages ne suffit pas");
const noLife = age("SansVie", ["single_sun", "steady_cycle", "water", "sand"]);
ok(noLife.stability >= 75 && ST.check(ST.chapterById("rest"), ctx([noLife])).why === "axes", "rest : sans vivant, il manque quelque chose");
ok(ST.check(ST.chapterById("rest"), ctx([])).why === "noage", "rest : aucun Âge");
ok(ST.check(ST.chapterById("rest"), ctx([bad, good])).ok, "rest : un seul Âge réussi suffit parmi plusieurs");
ok(ST.axesOf(["single_sun", "steady_cycle", "water", "fern", "inconnu"], axisOf).has("cosmological") && ST.axesOf(["single_sun"], null).has("cosmological"), "axesOf : le ciel de base est lu même hors registre");

// --- chapitre 2 : corriger sans casser (il faut avoir vu l'Âge abîmé)
const fixed = age("Repris", ["single_sun", "steady_cycle", "water", "sand", "fern"]);
ok(!ST.check(ST.chapterById("mend"), ctx([fixed], {})).ok && ST.check(ST.chapterById("mend"), ctx([fixed], {})).why === "mend", "mend : un Âge jamais vu abîmé ne compte pas");
ok(ST.check(ST.chapterById("mend"), ctx([fixed], { Repris: 1 })).ok, "mend : vu abîmé, maintenant stable : réussi");
ok(!ST.check(ST.chapterById("mend"), ctx([bad], { Mauvais: 1 })).ok, "mend : vu abîmé et toujours instable : pas réussi");

// --- avancement
const store = {};
ok(ST.get(store, "k").done.length === 0 && Object.keys(ST.get(store, "k").seen).length === 0, "get : un état vide au départ");
ok(ST.get({ k: 5 }, "k").done.length === 0 && ST.get({ k: { done: "x", seen: 3 } }, "k").done.length === 0, "get : un état abîmé est remis d'équerre");
ST.noteSeen(store, "k", "Repris"); ok(ST.get(store, "k").seen.Repris === 1, "noteSeen");
let r = ST.evaluate(store, "k", { ages: [fixed], axisOf });
ok(r.map((c) => c.id).join() === "rest,mend", "evaluate : les deux chapitres réussis d'un coup se marquent dans l'ordre");
const store2 = {};
r = ST.evaluate(store2, "k", { ages: [fixed], axisOf });
ok(r.map((c) => c.id).join() === "rest" && ST.get(store2, "k").done.join() === "rest", "evaluate : le chapitre 1 réussi, le 2 attend (jamais vu abîmé)");
ok(ST.evaluate(store2, "k", { ages: [fixed], axisOf }).length === 0, "evaluate : un chapitre réussi ne se refait pas");
ST.noteSeen(store2, "k", "Repris"); r = ST.evaluate(store2, "k", { ages: [fixed], axisOf });
ok(r.map((c) => c.id).join() === "mend" && ST.get(store2, "k").done.join() === "rest,mend", "evaluate : le chapitre 2 suit une fois l'Âge vu abîmé");
const store3 = {}; ST.noteSeen(store3, "k", "Repris");
ok(ST.evaluate(store3, "k", { ages: [bad], axisOf }).length === 0 && ST.get(store3, "k").done.length === 0, "evaluate : le chapitre 2 ne passe pas avant le 1 (ordre)");
ok(ST.get({}, "a") !== ST.get({}, "b") && (() => { const s = {}; ST.get(s, "a").done.push("rest"); return ST.get(s, "b").done.length === 0; })(), "l'avancement est par Relto (une clé chacun)");

// --- pages-récompenses : verrouillées jusqu'au chapitre, puis disponibles
const rp = ST.rewardPages();
ok(rp.length === ST.CHAPTERS.filter((c) => c.page).length + 1 && rp.every((p) => p.story && p.unlock && p.unlock.story && (M.PAGE_PRESETS[p.id] || p.id === ST.ENDGAME.id)), "rewardPages : une page par chapitre (préréglage existant) et la page finale");
const rest = rp.find((p) => p.unlock.story === "rest");
ok(!M.checkUnlock(rest, [], new Set(), { storyDone: [] }).ok && /chapter/.test(M.checkUnlock(rest, [], new Set(), { storyDone: [] }).reason), "page verrouillée tant que le chapitre n'est pas réussi (avec la raison)");
ok(M.checkUnlock(rest, [], new Set(), { storyDone: ["rest"] }).ok && !M.checkUnlock(rest, [], new Set(), {}).ok, "page débloquée par le chapitre (et verrouillée sans état)");
const scene = (done) => M.buildScene({ ...M.parseRelto({ relto_mode: "story" }), name: "H", storyDone: done }, rp, [], []);
ok(scene([]).pages.find((p) => p.id === rest.id).state === "locked" && scene(["rest"]).pages.find((p) => p.id === rest.id).state === "available", "buildScene : verrouillée puis disponible");
const mendPage = rp.find((p) => p.unlock.story === "mend");
ok(scene(["rest"]).pages.find((p) => p.id === mendPage.id).state === "locked" && scene(["rest", "mend"]).pages.find((p) => p.id === mendPage.id).state === "available", "buildScene : chaque chapitre ouvre sa propre page");

// ---- notes de chapitre
const an = (text, nm) => analyseAgeBase(text, { seed: nm });
const mend = ST.chapterById("mend"), restC = ST.chapterById("rest");
ok(ST.nextChapter([]).id === "rest" && ST.nextChapter(["rest"]).id === "mend" && ST.nextChapter(["rest", "mend"]).id === "weather" && ST.nextChapter(["rest", "mend", "weather"]).id === "laws" && ST.nextChapter(["rest", "mend", "weather", "laws"]).id === "alter" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter"]).id === "zero" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter", "zero"]).id === "imager" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter", "zero", "imager"]).id === "hard" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard"]).id === "strange" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard", "strange"]).id === "give" && ST.nextChapter(ST.CHAPTERS.map((c) => c.id)) === null, "nextChapter : dans l'ordre, le second livre après le 9, null à la fin");
{ /* le second livre (section 19 de la fiche de la caverne) : la machine et la caverne */
  const B1 = ["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard", "strange"], ev = (cave) => { const s = { k: { done: B1.slice() } }; ST.evaluate(s, "k", { ages: [], axisOf, cave }); return { done: ST.get(s, "k").done, why: ST.get(s, "k").why }; };
  ok(ST.bookOneDone(B1) && !ST.bookOneDone(B1.slice(0, 8)) && ST.BOOK_ONE_END === "strange", "la fin du premier livre reste au chapitre 9");
  ok(ST.CHAPTERS.filter((c) => c.book === 2).map((c) => c.id).join() === "give,descend,lake,slab", "quatre chapitres au second livre");
  ok(ev({}).why === "white" && ev({ cookedWhite: true }).why === "reveal" && ev({ cookedWhite: true, revealed: 1 }).why === "lake", "10 : un blanc cuit ; 11 : une révélation ; 12 : le lac");
  ok(ev({ cookedWhite: true, revealed: 1, colonies: 1 }).why === "look" && ev({ cookedWhite: true, revealed: 1, colonies: 1, looked: true }).why === "slab", "12 : une colonie ne suffit pas, il faut regarder une goutte");
  ok(ev({ cookedWhite: true, revealed: 1, colonies: 1, looked: true, slabOpen: true }).done.slice(-1)[0] === "slab" && ev({ cookedWhite: true, revealed: 1, colonies: 1, looked: true, slabOpen: true }).why === "hear", "13 : la dalle ouverte, le second livre est fini ; le 14 attend");
  ok(ST.kindOf(ST.chapterById("give")) === "write" && ["descend", "lake", "slab"].every((id) => ST.kindOf(ST.chapterById(id)) === "explore"), "le 10 s'écrit, les trois autres s'explorent");
  ok(["page_gold", "page_silver", "page_gems"].every((pg) => ST.CHAPTERS.some((c) => c.page === pg && c.book === 2)) && !ST.chapterById("slab").page, "or, argent, gemmes ; la dalle n'a pas de page");
  const hg = ST.HINTS.give; ok(hg.fr.length === 3 && hg.en.length === 3 && ![...hg.fr, ...hg.en].some((x) => /\d/.test(x)), "les indices du 10 : trois, sans un chiffre");
  const n10 = ST.chapterNote(ST.chapterById("give"), "fr", "N"); ok(/`silt`/.test(n10) && /Guilde des Writers/.test(n10) && !/\b(40|20|38)\b/.test(n10), "la note du 10 : la feuille des quatre sols, et pas la recette");
}
ok(Object.keys(ST.get({}, "k").notes).length === 0, "get : normalise les notes de chapitre");
let fair = 0, same = 0;
for (let i = 0; i < 300; i++) {
  const base = `Corriger sans casser · ${1000 + i * 7919}`, nm = ST.chapterName(mend, base, an);
  if (an(ST.WORLDS.mend.lines.join("\n"), nm).stability < 75 && an(ST.WORLDS.mend.fixed.join("\n"), nm).stability >= 75) fair++;
  if (nm === base) same++;
}
ok(fair === 300, "chapitre 2 : pour tout nom, le monde abîmé est instable et le monde corrigé stable (" + fair + "/300)");
ok(same > 150, "chapitre 2 : le nom est le plus souvent gardé tel quel");
ok(ST.chapterName(restC, "X", an) === "X", "chapitre 1 : le nom ne change pas");
for (const lang of ["en", "fr"]) for (const c of ST.CHAPTERS) {
  const t = ST.chapterNote(c, lang, "Nom"), blk = t.match(/```age\n([\s\S]*?)\n```/);
  ok(/^---\nstory_kind: [a-z-]+\n---\n# Nom/.test(t) && t.includes(ST.MENTOR) && (ST.WORLDS[c.id].lines.length ? blk && blk[1].split("\n").length === ST.WORLDS[c.id].lines.length : !blk), "note de chapitre " + c.id + "/" + lang + " : titre, mentor, bloc age");
  ok(!(c.book === 3 ? /bahro|endgame/i : /bahro|encrier|inkwell|endgame/i).test(t), "note de chapitre " + c.id + "/" + lang + " : rien de réservé"); /* la seconde série se lit après la fin du premier livre : elle peut nommer l'encrier (l'auteur, 25 oct.) */
}

// ---- chapitre 3 : la météo programmée
const wc = ST.chapterById("weather"), wl = ST.WORLDS.weather.lines;
const wa = (programmed) => ({ ...age("Pluie", wl), programmed });
ok(ST.check(wc, ctx([wa(0)])).why === "program" && ST.check(wc, ctx([wa(1)])).ok, "weather : la pluie en continu ne suffit pas, une ligne programmée oui");
ok(ST.check(wc, ctx([{ ...wa(1), stability: 50 }])).why === "stable", "weather : un monde instable ne passe pas");
let wfair = 0; for (let i = 0; i < 200; i++) { const nm = ST.chapterName(wc, `Un jour qui change · ${1000 + i * 7919}`, an); if (an(wl.join("\n"), nm).stability >= 80) wfair++; }
ok(wfair === 200, "weather : le monde de départ tient avec de la marge, pour tout nom (" + wfair + "/200)");
ok(require("../src/weather").parseWeather("rain: sometimes, dawn").rain.length === 1 && ST.chapterNote(wc, "en", "N").includes("rain: sometimes, dawn"), "weather : la ligne à écrire est celle que lit le moteur");

// ---- chapitre 4 : les lois (deux valeurs physiques)
const lc = ST.chapterById("laws"), ll = ST.WORLDS.laws.lines;
ok(ST.check(lc, ctx([{ ...age("L", ll), physics: 1 }])).why === "physics" && ST.check(lc, ctx([{ ...age("L", ll), physics: 2 }])).ok, "laws : une valeur ne suffit pas, deux oui");
ok(ST.check(lc, ctx([{ ...age("L", ll), physics: 2, stability: 50 }])).why === "stable", "laws : un monde instable ne passe pas");
let lfair = 0; for (let i = 0; i < 200; i++) { const nm = ST.chapterName(lc, `Les lois du monde · ${1000 + i * 7919}`, an); if (an(ll.join("\n"), nm).stability >= 80) lfair++; }
ok(lfair === 200, "laws : le monde de départ tient avec de la marge (" + lfair + "/200)");
ok(an(ll.join("\n"), "x").resolved.matter.reactions.length >= 1 && Object.keys(require("../src/physics").parsePhysics("mass: 0.8\nage: 3.5").params).length === 2 && /mass: 0\.8/.test(ST.chapterNote(lc, "en", "N")), "laws : une réaction à voir, et les deux lignes de la lettre sont lues par le moteur");

// ---- chapitre 5 : modifier ce qui est écrit (Loi du Changement)
const ac = ST.chapterById("alter"), al = ST.WORLDS.alter.lines, me = { alter: "Dossier/Note.md" };
const aa = (altered, st) => ({ ...age("Note", al, "Dossier/Note.md"), altered, ...(st != null ? { stability: st } : {}) });
ok(ST.check(ac, { ...ctx([aa(0)]), notes: me }).why === "dry" && ST.check(ac, { ...ctx([aa(1)]), notes: me }).ok, "alter : pas de modification après séchage, pas de réussite ; une, oui");
ok(ST.check(ac, { ...ctx([aa(1, 50)]), notes: me }).why === "stable", "alter : modifié mais le monde ne tient plus");
ok(ST.check(ac, { ...ctx([{ ...aa(3), path: "Autre/Age.md" }]), notes: me }).why === "dry" && ST.check(ac, ctx([aa(1)])).why === "dry", "alter : seule la note du chapitre compte");
let afair = 0; for (let i = 0; i < 200; i++) { const nm = ST.chapterName(ac, `Modifier ce qui est écrit · ${1000 + i * 7919}`, an); if (an(al.join("\n"), nm).stability >= 90) afair++; }
ok(afair === 200, "alter : le monde de départ tient avec de la marge (" + afair + "/200)");

// ---- chapitre 6 : lever les yeux (le Great Zero)
const zc = ST.chapterById("zero");
ok(ST.check(zc, ctx([])).why === "zero" && ST.check(zc, { ...ctx([]), zeroFound: true }).ok, "zero : réussi quand le Great Zero est trouvé, pas avant");
ok(!/```age/.test(ST.chapterNote(zc, "en", "N")) && ST.chapterNote(zc, "fr", "N").includes("Great Zero"), "zero : une note sans bloc age, qui parle du Great Zero");
ok(M.PAGE_PRESETS.page_telescope.unlock.page === "page_mountain" && ST.CHAPTERS.some((c) => c.page === "page_mountain"), "zero : la page des Montagnes (qui mène au télescope) est une récompense de chapitre");

// ---- chapitre 7 : écouter le ciel (l'Imageur verrouillé)
const ic = ST.chapterById("imager");
ok(ST.check(ic, ctx([age("I", ["water"], "Dossier/I.md")])).why === "lock" && ST.check(ic, { ...ctx([{ ...age("I", ["water"]), path: "Dossier/I.md" }]), tunings: { "Dossier/I.md": { lock: false } } }).why === "lock", "imager : pas de verrou, pas de réussite");
ok(ST.check(ic, { ...ctx([{ ...age("I", ["water"]), path: "Dossier/I.md" }]), tunings: { "Dossier/I.md": { lock: true } } }).ok && ST.check(ic, { ...ctx([]), tunings: { "Autre.md": { lock: true } } }).why === "lock", "imager : verrouillé sur un Âge du dossier ; un verrou ailleurs ne compte pas");
ok(ST.CHAPTERS.find((c) => c.id === "zero").page === "page_imager" && !M.PAGE_PRESETS.page_imager.unlock, "imager : la page de l'Imageur est offerte par le chapitre précédent");

// ---- chapitre 9 : le monde difficile
const hc = ST.chapterById("hard"), hr = ST.WORLDS.hard.ref;
const hw = (extra) => ({ ...age("Dur", hr, "Dossier/Dur.md"), programmed: 1, physics: 2, ...(extra || {}) });
ok(hr.length >= 8 && ST.axesOf(hr, axisOf).size >= 4, "hard : le monde de référence a huit pages et quatre axes");
ok(ST.check(hc, ctx([hw({ stability: 90 })])).ok, "hard : tout ensemble et stable, réussi");
ok(ST.check(hc, ctx([hw({ stability: 90, programmed: 0 })])).why === "program" && ST.check(hc, ctx([hw({ stability: 90, physics: 1 })])).why === "physics" && ST.check(hc, ctx([hw({ stability: 90, glyphs: hr.slice(0, 7) })])).why === "hardpages", "hard : sans météo programmée, sans deux valeurs physiques ou sous huit pages, non");
ok(ST.check(hc, ctx([hw({ stability: 77 })])).why === "hardstable" && ST.check(hc, ctx([hw({ stability: 50 })])).why === "hardstable", "hard : il faut de la marge (80), et un monde instable ne compte pas");
let hfair = 0; for (let i = 0; i < 200; i++) { const nm = ST.chapterName(hc, `Le monde difficile · ${1000 + i * 7919}`, an); if (an(hr.join("\n"), nm).stability >= 80) hfair++; }
ok(hfair === 200, "hard : un monde de référence tient pour tout nom (" + hfair + "/200)");

// ---- chapitre 10 : un monde étrange et merveilleux
const sc = ST.chapterById("strange"), sw = ST.WORLDS.strange.ref;
const info = (lines, nm) => { const a = an(lines.join("\n"), nm); return { name: nm, path: "D/" + nm + ".md", stability: a.stability, glyphs: lines, reactions: a.resolved.matter.reactions.map((r) => ({ shown: r.shown, type: r.type, catalyzed: !!r.catalyzed })) }; };
let sfair = 0; for (let i = 0; i < 60; i++) { const nm = ST.chapterName(sc, `Un monde étrange et merveilleux · ${1000 + i * 7919}`, an); if (ST.check(sc, ctx([info(sw, nm)])).ok) sfair++; }
ok(sfair >= 58, "strange : un monde de référence existe pour presque tout nom (" + sfair + "/60)");
const sname = ST.chapterName(sc, "Un monde étrange et merveilleux · 1", an), sgood = info(sw, sname);
ok(ST.check(sc, ctx([sgood])).ok, "strange : soleil violet, stable, réactions rares avec la pierre étrange, ruines : réussi");
ok(!ST.check(sc, ctx([{ ...sgood, glyphs: sgood.glyphs.map((g) => (g === "violet_sun" ? "red_sun" : g)) }])).ok, "strange : un autre soleil ne suffit pas");
ok(!ST.check(sc, ctx([{ ...sgood, glyphs: sgood.glyphs.filter((g) => g !== "tablet") }])).ok, "strange : sans l'axe métaphysique, non");
ok(!ST.check(sc, ctx([{ ...sgood, reactions: sgood.reactions.map((r) => ({ ...r, catalyzed: false })) }])).ok && !ST.check(sc, ctx([{ ...sgood, reactions: sgood.reactions.slice(0, 2) }])).ok, "strange : sans pierre étrange, ou sous trois réactions, non");
ok(!ST.check(sc, ctx([{ ...sgood, reactions: sgood.reactions.map((r) => ({ ...r, type: "violent" })) }])).ok && !ST.check(sc, ctx([{ ...sgood, stability: 77 }])).ok, "strange : des réactions violentes ou une marge trop courte, non");
const sn = ST.chapterNote(sc, "fr", "N");
ok(!/À faire/.test(sn) && !/violet_sun|strange_stone|tablet|deep_cold|drizzle/.test(sn) && ST.HINTS.strange.fr.length === 3 && !/violet_sun|strange_stone|tablet_|deep_cold|drizzle/.test(ST.HINTS.strange.fr.slice(0, 2).join(" ") + ST.HINTS.strange.en.slice(0, 2).join(" ")) && ST.HINTS.strange.en[2].includes("violet_sun"), "strange : la lettre et l'indice ne donnent ni recette ni nom de bloc");

// ---- ce qui manque, et les noms « Age N »
{ const st = {}, sky = age("Sans vie", ["single_sun", "steady_cycle", "water", "rain"]);
  ST.evaluate(st, "k", { ages: [sky], axisOf }); ok(ST.get(st, "k").why === "axes", "evaluate : un monde sans vivant — ce qui manque est « axes »");
  const st0 = {}; ST.evaluate(st0, "k", { ages: [], axisOf }); ok(ST.get(st0, "k").why === "noage", "evaluate : aucun Âge — « noage »"); }
{ const names = []; const nm = ST.chapterName(ST.chapterById("mend"), (i) => "Age " + (i + 1), an); names.push(nm); ok(/^Age \d+$/.test(nm) && an(ST.WORLDS.mend.lines.join("\n"), nm).stability < 75 && an(ST.WORLDS.mend.fixed.join("\n"), nm).stability >= 75, "chapterName : un nom « Age N » équitable pour le chapitre 2"); }

// ---- la page finale
const endP = ST.rewardPages().find((p) => p.id === ST.ENDGAME.id);
ok(endP && endP.additions.some((a) => a.type === "inkwell") && endP.unlock.story === "end", "page finale : un encrier, ouverte par la fin de l'histoire");
ok(!M.checkUnlock(endP, [], new Set(), { storyDone: ["rest", "mend"] }).ok && M.checkUnlock(endP, [], new Set(), { storyDone: ["rest", "mend", "end"] }).ok, "page finale : fermée avant la fin, ouverte après");
ok(!/bahro/i.test(JSON.stringify(ST.ENDGAME)) && !/bahro/i.test(JSON.stringify(M.PAGE_PRESETS[ST.ENDGAME.id] || {})), "page finale : nom neutre (proposée aussi au bac à sable, sans déblocage)");
ok(ST.chapterNote(mend, "fr", "N").includes("Deseekay") && !ST.chapterNote(restC, "fr", "N").includes("Deseekay"), "chapitre 2 : sous-titre D'ni");

ok(!ST.drawsOn([]) && !ST.drawsOn(["rest","hard"]) && ST.drawsOn(["rest","imager"]), "tirage des pages : coupé jusqu'à l'Imageur");

ok(Object.keys(ST.COURSE).every((id) => ST.chapterById(id)) && ST.COURSE.rest.every((r) => ST.courseSheet("rest", "fr").includes("`" + r[0] + "`")), "feuille de cours : mots des chapitres, tous dans la feuille");
ok(!ST.courseSheet("hard", "en") && !ST.courseSheet("strange", "fr") && /Guilde des Writers/.test(ST.chapterNote(ST.chapterById("weather"), "fr", "N")) && !/Guilde/.test(ST.chapterNote(ST.chapterById("strange"), "fr", "N")), "feuille de cours : aucune pour les épreuves");
ok(/s___/.test(ST.reviewSheet("alter", "fr")) && !/`sand`/.test(ST.reviewSheet("alter", "fr")) && !/`lava`/.test(ST.reviewSheet("zero", "en")) && /\| \? \|/.test(ST.reviewSheet("zero", "en")) && !ST.reviewSheet("rest", "en"), "feuille de cours : s'efface en révision (initiale, puis plus rien)");
ok(ST.knownBlocks([]).has("fern") && !ST.knownBlocks([]).has("rain") && ST.knownBlocks(["rest"]).has("lava") && ST.knownBlocks(["rest", "mend"]).has("rain") && !ST.knownBlocks(["rest"]).has("violet_sun"), "palette du livre : seuls les blocs appris");
const allDone = ["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard"];
ok(!ST.knownBlocks(allDone).has("violet_sun") && !ST.knownBlocks(allDone).has("black_sun") && !ST.knownBlocks(allDone).has("pulsar") && ST.knownBlocks(allDone, { strange: 2 }).has("violet_sun"), "palette du livre : au dernier chapitre, ni soleil noir ni pulsar ; le dernier indice donne le monde du maître");
ok(ST.kindOf(ST.chapterById("zero")) === "explore" && ST.kindOf(ST.chapterById("imager")) === "explore" && ST.kindOf(ST.chapterById("rest")) === "write" && ST.exploreName(ST.chapterById("zero"), "en", new Set(["Looking up"])) === "Looking up 2" && /Relto exploration/.test(ST.chapterNote(ST.chapterById("zero"), "en", "N")) && /Writing exercise/.test(ST.chapterNote(ST.chapterById("rest"), "en", "N")), "chapitres : exercice d'écriture ou exploration du Relto, nom propre à l'exploration");
ok(ST.check(ST.chapterById("imager"), { ages: [{ path: "a.md", stability: 80 }], tunings: {}, guildLock: true }).ok && !ST.check(ST.chapterById("imager"), { ages: [{ path: "a.md", stability: 80 }], tunings: {}, guildLock: false }).ok && !ST.check(ST.chapterById("imager"), { ages: [], tunings: {}, guildLock: true }).ok, "chapitre de l'Imageur : le verrou de l'Imageur de la Guilde compte");
{ // le courrier du mentor
  const MAIL = require("../src/story-mail"), known = ST.knownBlocks([], {}), st = {}, r = () => 0.5;
  ok(MAIL.step(st, 1000, known, "k", "en", r) === null && st.mail.at > 1000, "mail: first call only schedules");
  ok(MAIL.step(st, 1001, known, "k", "en", r) === null, "mail: not before the delay");
  const l = MAIL.step(st, st.mail.at + 1, known, "k", "fr", r);
  ok(l && !known.has(l.id) && l.text.includes(l.id) && st.mail.unread && st.mail.told[0] === l.id, "mail: a letter about an unknown block");
  ok(MAIL.step(st, 9e12, known, "k", "fr", r) === null, "mail: no second letter while unread");
  MAIL.read(st, 5, r); ok(!st.mail.unread && st.mail.at > 5, "mail: reading schedules the next");
  ok(!MAIL.candidates(known, []).some((id) => ST.WORLDS.strange.ref.includes(id)), "mail: never gives away the final test");
  // le réglage du délai (`mailDelay`) : rapide / normal / lent ; absent ou inconnu = normal
  const min = (ms) => ms / 60000;
  for (const [mode, lo, hi] of [["fast", 2, 6], ["normal", 8, 25], ["slow", 30, 90], ["daily", 22 * 60, 26 * 60]]) ok(min(MAIL.delay(0, mode)) === lo && min(MAIL.delay(1, mode)) === hi, `mail: délai « ${mode} » de ${lo} à ${hi} min`);
  ok(MAIL.delay(0.3) === MAIL.delay(0.3, "normal") && MAIL.delay(0.3, "n'importe quoi") === MAIL.delay(0.3, "normal"), "mail: sans réglage ou réglage inconnu, le délai d'avant");
  const sf = {}, ss = {}; MAIL.step(sf, 0, known, "k", "en", r, "fast"); MAIL.step(ss, 0, known, "k", "en", r, "slow");
  ok(min(sf.mail.at) === 4 && min(ss.mail.at) === 60, "mail: la première arrivée suit le réglage (4 min en rapide, 60 min en lent, à mi-hasard)");
  // les lettres françaises disent les descripteurs en français (table `src/descriptors-fr.js`)
  const REG = require("../src/engine/registry"), DFR = require("../src/descriptors-fr");
  const miss = [...new Set(REG.blockList.filter((b) => b.writable && b.descriptors).flatMap((b) => b.descriptors))].filter((w) => !DFR.FR[w]);
  ok(!miss.length, `mail: chaque descripteur d'un bloc écrivable a son équivalent français (manque : ${miss.join(", ")})`);
  const rainFr = MAIL.letter("rain", "fr", 0), rainEn = MAIL.letter("rain", "en", 0);
  ok(rainFr.includes("*régulier, gris, doux*") && !/steady|grey|soft/.test(rainFr), "mail: lettre FR, descripteurs traduits");
  ok(rainEn.includes("*steady, grey, soft*"), "mail: lettre EN, descripteurs d'origine");
  ok(DFR.tr("mot-inconnu") === "mot-inconnu" && DFR.tr("heavy") === "lourd", "mail: un mot sans équivalent reste tel quel");
  const sr = { mail: { at: 0, told: [], unread: true, note: "" } }; MAIL.read(sr, 0, r, "slow"); ok(min(sr.mail.at) === 60, "mail: la lecture programme la suivante selon le réglage");
}
{ // les infobulles des glyphes non appris, dans la langue de l'interface (hooks `ghostWord` et `ghostSky`)
  const Module = require("module"), load = Module._load;
  Module._load = function (req, ...a) { return req === "obsidian" ? new Proxy({}, { get: () => class {} }) : load.call(this, req, ...a); };
  const BV = require("../src/engine/book-view"); Module._load = load;
  const H = require("../src/engine/hooks").hooks, DFR = require("../src/descriptors-fr"), saved = { w: H.ghostWord, s: H.ghostSky };
  ok(BV.ghostText(H, "rain") === "Steady, grey, soft" && BV.ghostText(H, "pulsar") === "A remnant", "infobulle : sans hooks de langue, l'anglais du moteur");
  H.ghostWord = DFR.tr; H.ghostSky = (c) => DFR.skyPhrase(c);
  ok(BV.ghostText(H, "rain") === "Régulier, gris, doux" && BV.ghostText(H, "pulsar") === "Un vestige", "infobulle : en français, descripteurs et indices du ciel traduits");
  ok(BV.ghostText(H, "pas-un-bloc") === H.ghostTip(), "infobulle : sans indice, la formule générale");
  ok(Object.keys(DFR.SKY).sort().join() === Object.keys(BV.SKY_HINTS).sort().join(), "infobulle : chaque catégorie du ciel a son indice français");
  H.ghostWord = saved.w; H.ghostSky = saved.s;
}
console.log(`story.test.js : ${n} vérifications ok`);


{ /* la seconde série, chapitre 14 « Entendre » (claude/DESIGN-art-bahro.md §2) : les deux voix, l'encrier, l'encre, la visite */
  const HEAR = require("../src/story-hear");
  const B2 = ["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard", "strange", "give", "descend", "lake", "slab"];
  const hc = ST.chapterById("hear");
  ok(hc && hc.page === null && hc.law === 21 && ST.nextChapter(B2).id === "hear", "le 14 suit le 13 ; son prix est la page 21 du livre des lois, pas une page du Relto");
  ok(ST.kindOf(hc) === "explore" && !/```age/.test(ST.chapterNote(hc, "fr", "Entendre")), "le 14 s'explore : pas de monde de départ");
  const n14 = ST.chapterNote(hc, "fr", "Entendre"), e14 = ST.chapterNote(hc, "en", "Hearing");
  ok(/Ton encre ne sèche pas/.test(n14) && /vingt-cinq/.test(n14) && /Your ink does not dry/.test(e14) && /seltahn/.test(n14), "la lettre du 14, en deux langues, signée seltahn");
  ok(!/Bahro|serpent|ardoise|slate|Catherine/i.test(n14 + e14), "la lettre du 14 ne nomme ni les Bahro ni personne du lore");
  const mk = () => ({ done: B2.slice(), seen: {}, notes: { strange: "Story/Age 9.md" }, by: { strange: "Story/Age 9.md" } });
  const ages = [{ name: "Age 9", path: "Story/Age 9.md" }, { name: "Age 10", path: "Story/Age 10.md" }, { name: "Age 11", path: "Story/Age 11.md" }];
  const T0 = new Date(2026, 9, 25, 14, 0, 0).getTime();
  { const st = mk(); ok(!ST.check(hc, { ages, st }).ok && ST.check(hc, { ages, st }).why === "hear", "14 : rien d'entendu, rien de réussi"); }
  { const st = mk(); HEAR.heard(st, "Story/Age 10.md", "Story/Age 11.md", "good", 10, 13, T0); ok(!st.hear && !ST.check(hc, { ages, st }).ok, "14 : deux voix sans le monde étrange ne comptent pas"); }
  { const st = mk(); HEAR.heard(st, "Story/Age 9.md", "Story/Age 10.md", "rub", 10, 11, T0); ok(!ST.check(hc, { ages, st }).ok && HEAR.humOf(st, T0) === 1, "14 : une seconde qui frotte ne s'accorde pas, mais l'encrier frémit"); }
  { const st = mk(); HEAR.heard(st, "Story/Age 9.md", "Story/Age 10.md", "clash", 10, 13, T0); ok(!ST.check(hc, { ages, st }).ok, "14 : le triton non plus"); }
  { const st = mk(); HEAR.heard(st, "Story/Age 9.md", "Story/Age 9.md", "full", 10, 10, T0); ok(!ST.check(hc, { ages, st }).ok, "14 : le monde étrange avec lui-même (l'unisson) ne compte pas"); }
  { const st = mk(); HEAR.heard(st, "Elsewhere/Far.md", "Story/Age 9.md", "good", 13, 10, T0); ok(!ST.check(hc, { ages, st }).ok, "14 : un Âge hors du dossier ne compte pas"); }
  { const st = mk(); HEAR.heard(st, "Story/Age 11.md", "Story/Age 9.md", "good", 13, 10, T0); const r = ST.check(hc, { ages, st }); ok(r.ok && r.path === "Story/Age 11.md" && st.hear.freq === 10, "14 : à la tierce avec un Âge du dossier, dans un sens ou dans l'autre ; la voix retenue est celle du monde étrange"); }
  { const st = mk(); HEAR.heard(st, "Age 9", "Age 10", "full", 10, 16, T0); ok(ST.check(hc, { ages, st }).ok, "14 : l'octave aussi ; un Âge nommé seulement par son nom se reconnaît"); }
  { const st = { ...mk(), by: {} }; HEAR.heard(st, "Story/Age 9.md", "Story/Age 10.md", "good", 10, 13, T0); ok(ST.check(hc, { ages, st }).ok, "14 : sans `by`, le monde étrange est la note du chapitre 9"); }
  { const st = mk(); st.done = B2.slice(0, 12); ok(!HEAR.heard(st, "Story/Age 9.md", "Story/Age 10.md", "good", 10, 13, T0) && HEAR.humOf(st, T0) === 0 && HEAR.wetName(st) === null, "avant le 14 : rien n'est retenu, l'encre sèche comme ailleurs"); }
  { const st = mk(); ok(HEAR.wetName(st) === "Age 9", "dès que le 14 est ouvert, l'encre du monde étrange ne sèche plus"); }
  { const st = mk(); HEAR.struck(st, 10, T0); ok(HEAR.humOf(st, T0 + 60000) > 0.9 && Math.abs(HEAR.humOf(st, T0 + HEAR.HUM_MS + 1) - HEAR.HUM_LOW) < 1e-9, "l'encrier : fort tout de suite, puis faible tant que le chapitre dure"); st.done.push("hear"); ok(HEAR.humOf(st, T0) === 0, "l'encrier se tait quand le 14 est réussi"); }
  { /* la visite : le chapitre réussi à 14 h, le cri entre 22 h et 6 h, la pierre au matin */
    const st = mk(); st.done.push("hear"); HEAR.visitFrom(st, T0);
    const at = (d, h) => new Date(2026, 9, 25 + d, h, 0, 0).getTime();
    ok(!HEAR.stoneHere(st, at(0, 21)) && !HEAR.cryNow(st, at(0, 21)), "la visite : rien avant la nuit");
    ok(HEAR.cryNow(st, at(0, 23)) && !HEAR.cryNow(st, at(1, 2)), "la nuit : un cri, une seule fois");
    ok(!HEAR.stoneHere(st, at(1, 5)) && HEAR.stoneHere(st, at(1, 6)) && HEAR.stoneHere(st, at(9, 12)), "au matin, la pierre est sur le bureau, et elle y reste");
    const st2 = mk(); st2.done.push("hear"); HEAR.visitFrom(st2, at(1, 3)); ok(HEAR.morningAfter(at(1, 3)) === at(1, 6) && HEAR.cryNow(st2, at(1, 4)), "réussi en pleine nuit : le cri tout de suite, la pierre ce matin même");
    const st3 = mk(); st3.done.push("hear"); HEAR.visitFrom(st3, T0); ok(!HEAR.cryNow(st3, at(1, 7)) && HEAR.stoneHere(st3, at(1, 7)), "absent la nuit : pas de cri, la pierre quand même");
    const v0 = st.hear.visit; HEAR.visitFrom(st, at(3, 12)); ok(st.hear.visit === v0, "la visite ne se refait pas");
  }
  const I18N = require("../src/i18n"); ok(["en", "fr"].every((l) => { const t = I18N.makeT(() => l); return t("story.why.hear") !== "story.why.hear" && t("story.done.nopage") !== "story.done.nopage"; }), "les phrases du 14, en deux langues");
}

{ /* chapitre 15 « Porter » (claude/DESIGN-art-bahro.md §12.5) */
  const B3 = ["rest", "mend", "weather", "laws", "alter", "zero", "imager", "hard", "strange", "give", "descend", "lake", "slab", "hear"];
  const cc = ST.chapterById("carry");
  ok(cc && cc.page === null && cc.law === 20 && ST.nextChapter(B3).id === "carry" && ST.CHAPTERS.slice(-2).map((c) => c.id).join() === "hear,carry", "le 15 suit le 14 ; son prix est la page 20");
  ok(ST.kindOf(cc) === "write" && /```age\nsingle_sun/.test(ST.chapterNote(cc, "fr", "Age 20")) && ST.WORLDS.carry.stable, "le 15 s'écrit : un monde de départ qui tient");
  const n15 = ST.chapterNote(cc, "fr", "Age 20"), e15 = ST.chapterNote(cc, "en", "Age 20");
  ok(/une pierre sombre/.test(n15) && /on peut porter/.test(n15) && /a dark stone/.test(e15) && /carry: sky from/.test(n15), "la lettre du 15 et sa feuille de cours, en deux langues");
  ok(!/Bahro|serpent|ardoise|slate|Catherine/i.test(n15 + e15), "la lettre du 15 ne nomme ni les Bahro ni personne du lore");
  ok(!ST.knownBlocks(B3).has("carry: sky from …") && !ST.knownBlocks(B3).has("sky"), "la palette du livre ne prend pas les mots de la feuille du 15 pour des blocs");
  const ck = (ages) => ST.check(cc, { ages });
  ok(!ck([{ name: "A", path: "S/A.md", stability: 90, carried: 0 }]).ok && ck([{ name: "A", path: "S/A.md", stability: 90, carried: 0 }]).why === "carry", "15 : sans fragment, rien");
  ok(!ck([{ name: "A", path: "S/A.md", stability: 70, carried: 1 }]).ok, "15 : un monde porté qui ne tient pas, non");
  ok(ck([{ name: "A", path: "S/A.md", stability: 80, carried: 1 }]).ok && ck([{ name: "A", path: "S/A.md", stability: 80, carried: 1 }]).path === "S/A.md", "15 : un monde porté qui tient");
}
