"use strict";
// Âges d'exemple : un monde tiré au hasard mais cohérent (graine → mêmes lignes), et la note de bienvenue.
// JavaScript pur : aucune dépendance au moteur. La cohérence est garantie par construction (archétypes
// dont les pages ne se contredisent pas) et vérifiée par test/ageseed.test.js contre le moteur et la physique stricte.
const { rng, pick } = require("./util");

/** Archétypes : un noyau de pages sûres, puis des décors facultatifs (au plus quelques-uns) et des raretés. */
const KINDS = [
  { id: "sea", core: ["single_sun", "steady_cycle", "water", "sand"], deco: ["fern", "wind", "great_tree", "vine", "lamp"], rare: ["kelp", "coral", "auroras", "companion_moon"], name: ["Marées", "Varech", "Écume", "Sel"] },
  { id: "twin", core: ["twin_suns", "steady_cycle", "sand", "heat"], deco: ["wind", "tablet", "lamp", "iron", "door"], rare: ["recurring_eclipses", "companion_moon"], name: ["Dunes", "Deux-Soleils", "Mirage", "Ocre"] },
  { id: "ice", core: ["single_sun", "steady_cycle", "deep_cold", "stone"], deco: ["wind", "crystal", "door", "lamp"], rare: ["auroras", "starfall", "companion_moon"], name: ["Givre", "Banquise", "Pâle", "Silence"] },
  { id: "fire", core: ["single_sun", "steady_cycle", "stone", "lava"], deco: ["ash", "iron", "bridge", "tablet"], rare: ["starfall", "companion_moon"], name: ["Braise", "Cendre", "Forge", "Basalte"] },
  { id: "green", core: ["single_sun", "steady_cycle", "water", "rain"], deco: ["fern", "vine", "great_tree", "fog", "bridge"], rare: ["auroras", "companion_moon"], name: ["Canopée", "Mousse", "Source", "Brume"] },
];
const NOUN = ["Île", "Rive", "Terrasse", "Plateau", "Anse", "Crête", "Jardin", "Refuge", "Vallée", "Grève"];
const NOUN_EN = { "Île": "Isle", "Rive": "Shore", "Terrasse": "Terrace", "Plateau": "Plateau", "Anse": "Cove", "Crête": "Ridge", "Jardin": "Garden", "Refuge": "Haven", "Vallée": "Vale", "Grève": "Strand" };
const NAME_EN = { "Marées": "Tides", "Varech": "Kelp", "Écume": "Foam", "Sel": "Salt", "Dunes": "Dunes", "Deux-Soleils": "Twin Suns", "Mirage": "Mirage", "Ocre": "Ochre", "Givre": "Frost", "Banquise": "Floe", "Pâle": "Pale", "Silence": "Silence", "Braise": "Ember", "Cendre": "Ash", "Forge": "Forge", "Basalte": "Basalt", "Canopée": "Canopy", "Mousse": "Moss", "Source": "Spring", "Brume": "Mist", "Veilleuse": "Nightlight", "Nuit": "Night", "Cristal": "Crystal", "Écho": "Echo" };

/** Mêmes lignes pour une même graine. `lang` n'affecte que le nom. */
function draw1(seed, lang, link) {
  const r = rng((Number(seed) >>> 0) ^ 0x9e3779b9); r(); r();
  const kind = KINDS[Math.floor(r() * KINDS.length)];
  const lines = [...kind.core];
  const deco = kind.deco.slice(); const nd = 2 + Math.floor(r() * 2);
  for (let i = 0; i < nd && deco.length; i++) lines.push(deco.splice(Math.floor(r() * deco.length), 1)[0]);
  const rare = []; // une rareté une fois sur deux, deux fois sur dix-sept deux
  if (r() < 0.5) rare.push(pick(r, kind.rare));
  if (r() < 0.12) { const o = pick(r, kind.rare); if (!rare.includes(o)) rare.push(o); }
  for (const x of rare) if (!lines.includes(x)) lines.push(x);
  if (rare.includes("companion_moon") && r() < 0.5) lines.push("moons: " + (2 + Math.floor(r() * 2)));
  const word = pick(r, kind.name), noun = pick(r, NOUN);
  const name = lang === "en" ? `${NOUN_EN[noun]} of ${NAME_EN[word] || word}` : `${noun} ${/^[AEIOUÉÎ]/.test(word) ? "d'" : "de "}${word}`.replace("de Deux-Soleils", "des Deux-Soleils");
  const sd = 1 + Math.floor(r() * 99999);
  if (link) lines.push(`link: [[${link}]]`);
  const all = [...lines, "seed: " + sd];
  return { kind: kind.id, name, lines: all, text: `\`\`\`age\n${all.join("\n")}\n\`\`\`` };
}

/**
 * Un Âge au hasard. `opts.check(lines, name)` (facultatif) dit si le moteur trouve le monde stable : on essaie alors
 * jusqu'à 16 tirages voisins et on garde le premier. `opts.taken(name)` écarte les noms déjà pris. `opts.link` : nom
 * d'un Âge existant vers lequel poser un livre de liaison (sinon la première page du livre de liaison reste vide).
 */
function randomAge(seed, lang = "fr", opts = {}) {
  let last = null;
  for (let k = 0; k < 40; k++) {
    const a = draw1((Number(seed) >>> 0) + k * 7919, lang, opts.link);
    if (opts.taken && opts.taken(a.name)) continue;
    last = a;
    if (!opts.check || opts.check(a.lines, a.name)) return a;
    if (k >= 15) break;
  }
  return last || draw1(seed, lang, opts.link);
}

/** Note d'un Âge au hasard (titre + bloc + une ligne d'explication). */
function randomNote(seed, lang = "fr", opts = {}) {
  const a = randomAge(seed, lang, opts);
  const intro = lang === "en" ? "A world drawn at random. Edit any line, add pages, change `seed:` for another draw." : "Un monde tiré au hasard. Modifie une ligne, ajoute des pages, change `seed:` pour un autre tirage.";
  return { name: a.name, body: `# ${a.name}\n\n${intro}\n\n${a.text}\n` };
}

const WELCOME = {
  fr: {
    title: "Age Writer — Bienvenue",
    // Un Âge d'exemple fait main : eau, sable, varech, deux lunes, aurores.
    lines: ["single_sun", "steady_cycle", "water", "sand", "kelp", "fern", "rain", "companion_moon", "moons: 2", "auroras", "seed: 1118"],
    body: (block) => `# Age Writer — Bienvenue\n\nVoici un Âge d'exemple, déjà écrit. **Une page par ligne** : chaque ligne du bloc ci-dessous ajoute un élément au monde.\n\n${block}\n\n- \`single_sun\`, \`steady_cycle\` : une étoile, un jour régulier.\n- \`water\`, \`sand\` : une mer et des plages (elles se partagent le bas de la fenêtre).\n- \`kelp\`, \`fern\`, \`wind\` : du varech sous l'eau, des fougères, du vent.\n- \`companion_moon\` et \`moons: 2\` : deux lunes dans le ciel. \`auroras\` : des aurores.\n- \`seed: 1118\` : change ce nombre pour un autre tirage de ce qui reste ouvert.\n- Pour relier cet Âge à un autre : ajoute \`link: [[Nom d'un autre Âge]]\` dans le bloc. Le livre de liaison montre alors l'autre monde à travers la vitre.\n\n## Pour commencer\n\n1. Regarde le panneau sous le bloc : onglets *Texte et glyphes*, *Fenêtre de liaison*, *Détails*.\n2. Commande **Ouvrir cet Âge comme un livre** pour le voir en livre.\n3. Commande **Générer un Âge au hasard** pour en créer d'autres.\n4. Commande **Ouvrir le guide Age Writer** pour tout le reste.\n`,
  },
  en: {
    title: "Age Writer — Welcome",
    lines: ["single_sun", "steady_cycle", "water", "sand", "kelp", "fern", "rain", "companion_moon", "moons: 2", "auroras", "seed: 1118"],
    body: (block) => `# Age Writer — Welcome\n\nHere is a ready-made example Age. **One page per line**: each line of the block below adds an element to the world.\n\n${block}\n\n- \`single_sun\`, \`steady_cycle\`: one star, a regular day.\n- \`water\`, \`sand\`: a sea and beaches (they share the bottom of the window).\n- \`kelp\`, \`fern\`, \`wind\`: kelp under the water, ferns, wind.\n- \`companion_moon\` and \`moons: 2\`: two moons in the sky. \`auroras\`: auroras.\n- \`seed: 1118\`: change this number for another draw of whatever is left open.\n- To link this Age to another: add \`link: [[Name of another Age]]\` to the block. The linking book then shows the other world through the glass.\n\n## Getting started\n\n1. Look at the panel under the block: tabs *Text & glyphs*, *Linking window*, *Details*.\n2. Run **Open this Age as a book** to see it as a book.\n3. Run **Generate a random Age** to create more.\n4. Run **Open the Age Writer guide** for everything else.\n`,
  },
};

/** Note de bienvenue : { title, body } dans la langue demandée. */
function welcomeNote(lang = "fr") {
  const W = WELCOME[lang === "en" ? "en" : "fr"];
  return { title: W.title, lines: W.lines, body: W.body("```age\n" + W.lines.join("\n") + "\n```") };
}

module.exports = { randomAge, randomNote, welcomeNote, KINDS };
