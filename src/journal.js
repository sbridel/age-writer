"use strict";
/**
 * Journal d'exploration : un carnet attaché à l'Âge, écrit dans la voix de quelqu'un
 * (Atrus : posé et inquiet ; Gehn : impérieux ; Miller : décontracté). Il se remplit tout seul :
 * ce que dit le livre, les rencontres de matière, les ruines, les mécanismes, les contradictions,
 * les altérations, puis chaque note du coffre qui renvoie vers l'Âge (avec un croquis en marge).
 */
const { fnv, words } = require("./util");

const VOICES = {
  atrus: {
    en: { intro: "I have written this Age down as carefully as I can. What follows is what I have seen of it.", arrival: "The Descriptive Book says: “{text}”", matter: "Where {a} meets {b}, {r} appears. I should have expected it.", life: "There is life here: {list}. It does not seem to need me.", ruin: "Someone built here before: {list}. I found no one.", warn: "Something here does not agree with itself: {a} and {b}. I do not like it.", alter: "I changed what was written, and the Age answered. {text}", note: "From my notes, “{title}”:", outro: "I will return when I have thought about this more." },
    fr: { intro: "J'ai écrit cet Âge avec tout le soin dont je suis capable. Voici ce que j'en ai vu.", arrival: "Le Livre descriptif dit : « {text} »", matter: "Là où {a} rencontre {b}, {r} apparaît. J'aurais dû m'y attendre.", life: "Il y a de la vie ici : {list}. Elle ne semble pas avoir besoin de moi.", ruin: "Quelqu'un a bâti ici avant moi : {list}. Je n'ai trouvé personne.", warn: "Quelque chose ici se contredit : {a} et {b}. Cela ne me plaît pas.", alter: "J'ai modifié ce qui était écrit, et l'Âge a répondu. {text}", note: "Extrait de mes notes, « {title} » :", outro: "Je reviendrai quand j'y aurai réfléchi." },
  },
  gehn: {
    en: { intro: "I have shaped this Age, as I shape all things that will serve me.", arrival: "I wrote: “{text}”. The world obeyed, as it must.", matter: "{a} and {b} meet, and obey me: {r}.", life: "Creatures: {list}. They will learn who made this place.", ruin: "Monuments, {list}. Mine, or soon to be.", warn: "A flaw: {a} against {b}. It will be corrected.", alter: "I rewrote the Age to suit me. It protests. {text}", note: "Recorded for my own use, “{title}”:", outro: "Let it be known that this was my work." },
    fr: { intro: "J'ai façonné cet Âge, comme je façonne tout ce qui doit me servir.", arrival: "J'ai écrit : « {text} ». Le monde a obéi, comme il le doit.", matter: "{a} et {b} se rencontrent, et m'obéissent : {r}.", life: "Des créatures : {list}. Elles apprendront qui a fait ce lieu.", ruin: "Des monuments, {list}. Les miens, ou bientôt.", warn: "Un défaut : {a} contre {b}. Il sera corrigé.", alter: "J'ai récrit l'Âge à ma convenance. Il proteste. {text}", note: "Consigné pour mon usage, « {title} » :", outro: "Que l'on sache que ceci fut mon œuvre." },
  },
  miller: {
    en: { intro: "Okay. Notes on this place, written fast so I don't forget.", arrival: "The book says: “{text}”. Fair enough.", matter: "Funny thing: {a} runs into {b} and you get {r}.", life: "Saw some life: {list}. Kept my distance.", ruin: "Ruins: {list}. Somebody was here, and then wasn't.", warn: "Weird: {a} and {b} don't get along here. Watch your step.", alter: "Somebody (okay, me) edited this Age after the fact. {text}", note: "Scribbled elsewhere, “{title}”:", outro: "Going back for coffee. Then more notes." },
    fr: { intro: "Bon. Des notes sur cet endroit, écrites vite pour ne pas oublier.", arrival: "Le livre dit : « {text} ». Soit.", matter: "Drôle de truc : {a} rencontre {b} et ça donne {r}.", life: "J'ai vu de la vie : {list}. Je suis resté à distance.", ruin: "Des ruines : {list}. Quelqu'un était là, puis plus personne.", warn: "Bizarre : {a} et {b} ne s'entendent pas ici. Faites attention.", alter: "Quelqu'un (bon, moi) a modifié cet Âge après coup. {text}", note: "Griffonné ailleurs, « {title} » :", outro: "Je retourne chercher du café. Puis d'autres notes." },
  },
};
const MECH_FRAME = { en: "{label}, {state}. {desc}", fr: "{label}, {state}. {desc}" };

const fill = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ""));
const list = (xs) => xs.map(words).join(", ");

/**
 * @param {object} o
 * @param {'atrus'|'gehn'|'miller'} o.voice
 * @param {'en'|'fr'} o.lang
 * @param {object} o.analysis    analyse du moteur (resolved.matter, resolved.triggered…)
 * @param {(id:string)=>({axis:string}|undefined)} o.defOf
 * @param {string} o.prose       première phrase(s) du livre
 * @param {{id:string,state:string,label:string,desc:string}[]} o.mechs
 * @param {{text:string}[]} o.alterations  descriptions des altérations
 * @param {{title:string, excerpt:string, mtime:number}[]} o.notes  notes qui renvoient vers l'Âge
 * @param {string[]} o.ids       éléments du monde (pour les croquis)
 * @returns {{kind:string, text:string, glyph?:string, excerpt?:string, title?:string}[]}
 */
function buildEntries(o) {
  const F = (VOICES[o.voice] || VOICES.atrus)[o.lang] || VOICES.atrus.en;
  const out = [], r = o.analysis.resolved;
  const axisOf = (id) => { const d = o.defOf(id); return d && d.axis; };
  out.push({ kind: "intro", text: F.intro });
  if (o.prose) out.push({ kind: "arrival", text: fill(F.arrival, { text: o.prose }) });
  for (const x of r.matter.reactions) out.push({ kind: "matter", text: fill(F.matter, { a: words(x.a), b: words(x.b), r: words(x.shown) }), glyph: x.shown });
  const life = o.ids.filter((id) => axisOf(id) === "ecological"), ruins = o.ids.filter((id) => axisOf(id) === "metaphysical");
  if (life.length) out.push({ kind: "life", text: fill(F.life, { list: list(life) }), glyph: life[0] });
  if (ruins.length) out.push({ kind: "ruin", text: fill(F.ruin, { list: list(ruins) }), glyph: ruins[0] });
  for (const m of o.mechs) out.push({ kind: "mech", text: fill(MECH_FRAME[o.lang] || MECH_FRAME.en, m), mech: m.id });
  for (const t of r.triggered) out.push({ kind: "warn", text: fill(F.warn, { a: words(t.a), b: words(t.b) }), glyph: t.a });
  for (const a of o.alterations) out.push({ kind: "alter", text: fill(F.alter, { text: a.text }) });
  for (const n of o.notes) out.push({ kind: "note", text: fill(F.note, { title: n.title }), excerpt: n.excerpt, title: n.title, glyph: o.ids.length ? o.ids[fnv(n.title) % o.ids.length] : undefined });
  out.push({ kind: "outro", text: F.outro });
  return out;
}

/** Contexte (lignes) autour du lien vers `ageName` dans le texte d'une note. */
function excerptAround(content, ageName, max = 220) {
  const lines = String(content).replace(/^---[\s\S]*?\n---\n?/, "").split("\n");
  const re = new RegExp("\\[\\[" + ageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\||#|\\]\\])", "i");
  let i = lines.findIndex((l) => re.test(l));
  if (i < 0) i = lines.findIndex((l) => l.trim() && !l.startsWith("#") && !l.startsWith("```"));
  if (i < 0) return "";
  const s = lines.slice(Math.max(0, i - 1), i + 2).join(" ").replace(/\s+/g, " ").replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_, a, __, b) => b || a).trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

const JOURNAL_VOICES = Object.keys(VOICES);

module.exports = { VOICES, JOURNAL_VOICES, buildEntries, excerptAround };
