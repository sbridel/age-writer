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
ok(ST.check(ST.chapterById("rest"), ctx([])).why === "stable", "rest : aucun Âge");
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
ok(rp.length === ST.CHAPTERS.length + 1 && rp.every((p) => p.story && p.unlock && p.unlock.story && (M.PAGE_PRESETS[p.id] || p.id === ST.ENDGAME.id)), "rewardPages : une page par chapitre (préréglage existant) et la page finale");
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
ok(ST.nextChapter([]).id === "rest" && ST.nextChapter(["rest"]).id === "mend" && ST.nextChapter(["rest", "mend"]).id === "weather" && ST.nextChapter(["rest", "mend", "weather"]).id === "laws" && ST.nextChapter(["rest", "mend", "weather", "laws"]).id === "alter" && ST.nextChapter(["rest", "mend", "weather", "laws", "alter"]) === null, "nextChapter : dans l'ordre, null à la fin");
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
  ok(t.startsWith("# Nom") && t.includes(ST.MENTOR) && blk && blk[1].split("\n").length === ST.WORLDS[c.id].lines.length, "note de chapitre " + c.id + "/" + lang + " : titre, mentor, bloc age");
  ok(!/bahro|encrier|inkwell|endgame/i.test(t), "note de chapitre " + c.id + "/" + lang + " : rien de réservé");
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
let afair = 0; for (let i = 0; i < 200; i++) { const nm = ST.chapterName(ac, `Modifier ce qui est écrit · ${1000 + i * 7919}`, an); if (an(al.join("\n"), nm).stability >= 80) afair++; }
ok(afair === 200, "alter : le monde de départ tient avec de la marge (" + afair + "/200)");

// ---- la page finale
const endP = ST.rewardPages().find((p) => p.id === ST.ENDGAME.id);
ok(endP && endP.additions.some((a) => a.type === "inkwell") && endP.unlock.story === "end", "page finale : un encrier, ouverte par la fin de l'histoire");
ok(!M.checkUnlock(endP, [], new Set(), { storyDone: ["rest", "mend"] }).ok && M.checkUnlock(endP, [], new Set(), { storyDone: ["rest", "mend", "end"] }).ok, "page finale : fermée avant la fin, ouverte après");
ok(!/bahro/i.test(JSON.stringify(ST.ENDGAME)) && !Object.keys(M.PAGE_PRESETS).includes(ST.ENDGAME.id), "page finale : nom neutre, hors du bac à sable");
ok(ST.chapterNote(mend, "fr", "N").includes("Deseekay") && !ST.chapterNote(restC, "fr", "N").includes("Deseekay"), "chapitre 2 : sous-titre D'ni");

console.log(`story.test.js : ${n} vérifications ok`);
