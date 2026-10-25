"use strict";
/*
 * Le Rehevkor, le livre des lois (claude/LOIS-DE-L-ECRITURE-DNI.md §13 ; claude/POEMES-rehevkor.md), modèle pur. Vingt-cinq pages : la Guilde en a
 * lu dix-huit, le psaume de l'écrivain en donne un verset par page ; trois pages ne se lisent pas, elles s'entendent (DESIGN-accord §1), et la
 * seconde série les retrouve une à une (chapitre 14 → rigafah, 21 ; 15 → rish, 20 ; 16 → heegator, 19) ; les quatre dernières restent blanches.
 * Le fahsee « Lien » ouvre le livre : la grille de lecture, cinq strophes pour sept parties.
 * Les textes sont les brouillons de Fable (12 et 25 oct.) : l'auteur les réécrira dans son propre verbe ; ils fixent la forme et le sens.
 */
/** Les nombres D'ni, de un à vingt-cinq (base vingt-cinq). */
const NAMES = ["fah", "bree", "sen", "tor", "vaht", "vagafah", "vagabree", "vagasen", "vagator", "nayvoo", "naygafah", "naygabree", "naygasen", "naygator", "heebor", "heegafah", "heegabree", "heegasen", "heegator", "rish", "rigafah", "rigabree", "rigasen", "rigator", "fahsee"];
const READ = 18; /* lues par la Guilde */
/** Les pages entendues : le chapitre qui les retrouve, et le signe de la planche qui les marque (à la place du nombre). */
const HEARD = { 21: { chapter: "hear", sign: "sun", mirror: 1 }, 20: { chapter: "carry", sign: "hand", mirror: 3 }, 19: { chapter: "accord", sign: "link", mirror: 2 } };

const TITLES = {
  fr: ["L'Équilibre", "Le Couple", "La Description", "L'Observation", "Les Fondations", "L'Intensité", "Le Support", "La Cohérence", "L'Étendue", "La Mesure", "L'Enchaînement", "L'Histoire du monde", "Les Niches", "La Durée", "Le Changement", "Les Œuvres", "Le Nom", "La Carapace", "Le Couple chanté", "Le Portage", "L'Accord"],
  en: ["Balance", "The Pair", "Description", "Observation", "Foundations", "Intensity", "Support", "Coherence", "Extent", "Measure", "Consequence", "The World's History", "Niches", "Duration", "Change", "Works", "The Name", "The Shell", "The Sung Pair", "Carrying", "The Accord"],
};
const VERSES = {
  fr: [
    "Cherche ce qui revient quand on le pousse ; ce qui monte haut n'est pas ce qui tient.",
    "Ce qui tient par deux attend le troisième ; il ne viendra pas.",
    "Le Livre décrit ; il ne commande pas. Ce que tu tais, le Faiseur l'a déjà dit, et tu n'y trouveras que ce qui était.",
    "La grande faute crie à la première lecture ; la petite attend que tu reviennes. Le prix se dit toujours ; la cause se mérite.",
    "Le ciel porte la pierre, et la pierre porte le reste. Ce qui faute en haut descend ; ce qui faute en bas reste où il est.",
    "Toute chute a sa hauteur. Ne pleure pas la mousse comme tu pleurerais l'étoile.",
    "Ce qui permet descend ; ce qui porte monte. Ne demande pas au sable ce que tu demanderais à la roche.",
    "Que les parties s'accordent : ce qui se contredit paie selon son poids, et l'accord agrandit la maison.",
    "La faute coûte au contact ; plus les bords sont longs, plus la frontière brûle.",
    "Tout se dose ; la coupe a un bord. Qui le dépasse paie doucement, puis sans fin. Beaucoup de tout n'est pas un monde.",
    "Ce qui découle de soi n'est pas une faute, et l'orage est juste ; ce qui détruit en est une, et le feu le sait.",
    "La terre se souvient d'une vie ; sur un monde né d'hier, elle ment.",
    "Le vivant tient par ses rôles, non par ses noms ; le rôle vide, un autre le tient un temps, et moins bien.",
    "L'Âge vit dans le temps : ce qui penche se creuse et se boit ; ce qui tient se répare à chaque aube.",
    "Quand l'encre a séché, chaque mot déplacé blesse ; effacer n'est pas revenir.",
    "Ce que les mains ont fait ne porte rien et n'achète rien ; le monde l'accueille et ne lui doit rien.",
    "Le nom que tu donnes est la graine de ce que tu n'écris pas. Deux Livres au même texte, sous deux noms, ouvrent deux mondes ; renommer, c'est écrire ailleurs.",
    "Ce qui couvre un monde l'abrite du ciel, et le ciel s'y souvient moins ; mais la voûte ne tient que par ce qui la porte, et plus la salle est vaste, plus elle demande.",
    "Ce qui tient par deux attend le troisième ; mais ce que le monde a noué de lui-même n'attend personne : il tient, et rien d'autre ne le porte. Ôte l'un des deux, et tu verras ce qui le tenait.",
    "Le Livre décrit ; le signe veut. Ce qu'on ne sait pas écrire, on le porte : un morceau d'un monde qui est, posé dans un monde qui est, avec sa coupe. Ils ne créent rien, et sans le Livre ils ne peuvent rien ; mais ce qu'ils font, l'histoire le peint.",
    "Ce qui sonne ensemble tient ensemble. Mais l'accord n'a pas de creux où retomber : il tient sur le fil, tant que les voix s'accordent, et pas une aube de plus. Écoute avant d'écrire ; le jour d'un monde est sa note.",
  ],
  en: [
    "Seek what comes back when it is pushed; what rises high is not what holds.",
    "What holds by two waits for a third; it will not come.",
    "The Book describes; it does not command. What you leave unsaid, the Maker has already said, and you will find there only what was.",
    "The great fault cries out at the first reading; the small one waits for you to come back. The price is always told; the cause is earned.",
    "The sky carries the stone, and the stone carries the rest. What fails above comes down; what fails below stays where it is.",
    "Every fall has its height. Do not weep for the moss as you would weep for the star.",
    "What permits comes down; what carries goes up. Do not ask of sand what you would ask of rock.",
    "Let the parts agree: what contradicts itself pays by its weight, and agreement makes the house larger.",
    "The fault costs where things touch; the longer the edges, the more the border burns.",
    "Everything is measured; the cup has a rim. Who goes past it pays gently, then without end. Much of everything is not a world.",
    "What follows from itself is no fault, and the storm is just; what destroys is one, and the fire knows it.",
    "The ground remembers a life; on a world born yesterday, it lies.",
    "Living things hold by their roles, not by their names; an empty role, another holds for a time, and less well.",
    "An Age lives in time: what leans digs itself in and drinks; what holds mends itself with each dawn.",
    "Once the ink has dried, every word moved wounds; to erase is not to go back.",
    "What hands have made carries nothing and buys nothing; the world takes it in and owes it nothing.",
    "The name you give is the seed of what you do not write. Two Books of the same text, under two names, open two worlds; to rename is to write elsewhere.",
    "What covers a world shelters it from the sky, and the sky remembers it less; but the vault holds only by what carries it, and the wider the hall, the more it asks.",
    "What holds by two waits for a third; but what the world has knotted of itself waits for no one: it holds, and nothing else carries it. Take away one of the two, and you will see what held it.",
    "The Book describes; the sign wants. What one cannot write, one carries: a piece of a world that is, set in a world that is, with its cut. They create nothing, and without the Book they can do nothing; but what they do, the story paints.",
    "What sounds together holds together. But the accord has no hollow to fall back into: it holds on the thread, as long as the voices agree, and not one dawn more. Listen before you write; the day of a world is its note.",
  ],
};
const OPEN = { fr: "Shorah. Avant la première encre, écoute ; on ne te dira pas tout.", en: "Shorah. Before the first ink, listen; you will not be told everything." };
const CLOSE = { fr: "Shorah. Ferme le Livre, et va voir ce que tu as écrit : tu ne l'as pas créé, tu l'as trouvé.", en: "Shorah. Close the Book, and go see what you have written: you did not create it, you found it." };
const BLANK = {
  fr: (from, heard) => `Les pages ${from} à fahsee sont blanches. Le Rehevkor en compte vingt-cinq ; la Guilde en a lu dix-huit${heard ? `, et l'on en a entendu ${heard === 1 ? "une" : heard === 2 ? "deux" : "trois"}` : ""}.`,
  en: (from, heard) => `The pages ${from} to fahsee are blank. The Rehevkor counts twenty-five; the Guild has read eighteen${heard ? `, and ${heard === 1 ? "one" : heard === 2 ? "two" : "three"} ${heard === 1 ? "has" : "have"} been heard` : ""}.`,
};
/** Le fahsee « Lien » : vingt-cinq vers, cinq strophes, le mot de lien d'une strophe à l'autre, Shorah ouvre et ferme. */
const LIEN = {
  fr: [
    ["Shorah, écrivain. Ce qu'on cherche est là :", "non le haut : le creux qui prend ce qu'on pousse", "et le rend sans main à sa place, en bas.", "Ce qui tient par deux attend la secousse ;", "le creux garde tout quand le haut s'en va."],
    ["Va, dis ce qui est ; le Livre décrit,", "le reste est écrit par un Autre ; il tient ;", "le nom choisit tout ce qui n'est pas dit ;", "regarde longtemps : le vrai se retient,", "il ne vient qu'à qui revient, et relit."],
    ["Relis le ciel : lui porte tout le reste ;", "ce qu'il faute en haut descend dans la pierre ;", "le haut permet tout, le bas seul atteste ;", "sous un toit de roc, le ciel est derrière ;", "la guerre des mots, l'excès : tout te leste."],
    ["Leste, le vivant tient par ses offices ;", "ce qui suit son cours n'est jamais en faute ;", "le sol se souvient, ou ment : c'est l'indice ;", "ce qui est seul meurt, et rien ne l'en ôte ;", "le rôle vacant vit par un novice."],
    ["Novice, l'instable, ouvert, se boit là ;", "chaque aube, le droit sans aide guérit ;", "l'encre sèche mord ce qu'on rajouta ;", "effacer n'y fait rien ; et l'œuvre fuit,", "hors de toute loi. Va, et vois. Shorah."],
  ],
  en: [
    ["Shorah, writer. What you seek is here:", "not the height: the hollow that takes what is pushed", "and gives it back, unhanded, to its place below.", "What holds by two is waiting for the shake;", "the hollow keeps all when the height is gone."],
    ["Gone to say what is; the Book describes,", "the rest is written by Another; it holds;", "the name decides all that is left unsaid;", "look long: the true keeps itself back,", "it comes only to one who comes back, and rereads."],
    ["Reread the sky: it carries all the rest;", "what fails up there comes down into the stone;", "the height permits all, the ground alone attests;", "under a roof of rock, the sky stays behind;", "the war of words, excess: all of it weighs you down."],
    ["Weighed down, the living holds by its offices;", "what follows its course is never at fault;", "the ground remembers, or lies: that is the clue;", "what stands alone dies, and nothing spares it;", "the vacant role lives on through a novice."],
    ["Novice, the unsteady, left open, drinks itself there;", "each dawn, the upright heals with no one's help;", "dry ink bites whatever was added;", "erasing does nothing; and the work slips away,", "outside every law. Go, and see. Shorah."],
  ],
};

/** Les lois entendues par un Relto histoire : d'après ses chapitres réussis. */
const heardOf = (done) => Object.entries(HEARD).filter(([, h]) => (done || []).includes(h.chapter)).map(([n]) => Number(n)).sort((a, b) => a - b);
/**
 * Les vingt-cinq pages du livre, pour la langue `lang`, avec ce que le joueur en sait : `read` (lue par la Guilde), `heard` (entendue, retrouvée
 * par un chapitre), `blank` (blanche), ou `closed` (une page entendue que le joueur n'a pas encore retrouvée : blanche pour lui).
 */
function pagesOf(done, lang) {
  const L = VERSES[lang] ? lang : "en", heard = heardOf(done), out = [];
  for (let n = 1; n <= 25; n++) {
    const h = HEARD[n], kind = n <= READ ? "read" : h ? (heard.includes(n) ? "heard" : "closed") : "blank";
    out.push({ n, name: NAMES[n - 1], kind, title: kind === "read" || kind === "heard" ? TITLES[L][n - 1] : "", verse: kind === "read" || kind === "heard" ? VERSES[L][n - 1] : "", sign: h ? h.sign : null, mirror: h ? h.mirror : null });
  }
  return out;
}
/** La phrase des pages blanches, telle que le joueur la lit : à partir de la première page qu'il n'a pas, et combien il en a entendu. */
function blankLine(done, lang) {
  const L = BLANK[lang] ? lang : "en", pages = pagesOf(done, L), first = pages.find((p) => p.kind === "closed" || p.kind === "blank");
  return BLANK[L](first ? first.name : "fahsee", heardOf(done).length);
}
const lien = (lang) => LIEN[LIEN[lang] ? lang : "en"];
const open = (lang) => OPEN[OPEN[lang] ? lang : "en"];
const close = (lang) => CLOSE[CLOSE[lang] ? lang : "en"];

module.exports = { NAMES, READ, HEARD, TITLES, VERSES, LIEN, heardOf, pagesOf, blankLine, lien, open, close };
