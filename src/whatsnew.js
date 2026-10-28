"use strict";
/**
 * Les nouveautés d'une version (pur). Après une mise à jour, le plugin les montre une fois : une fenêtre qui les liste,
 * et un pli de la Guilde sur la table de la cabane du Relto, qui dit l'essentiel dans la voix du monde.
 * Règle : rien sur l'histoire (les règles de spoilers du guide valent ici).
 */
const NEWS = [
  {
    v: "2.3.0",
    fr: {
      title: "Le jardin et le vent",
      letter: "La Guilde a appris à écrire un jardin. Un ciel peut maintenant porter la couleur qu'on lui donne, un lac s'étale en étang au pied de la vue, et la haie d'un jardin se taille devant l'horizon. Le vent, lui, apprend la rotation du monde. Et pour ceux qui suivent les lettres d'Adrin : il montre désormais comment il aurait écrit chaque monde qu'il demande.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**`ciel: rouge`** : la couleur du ciel de jour, au lieu de celle que tire la marque (une couleur ou un angle de teinte). Elle ne coûte rien.",
        "**Le jardin** : `garden` dessine une haie taillée percée d'entrées, ses allées, des massifs de fleurs.",
        "**L'étang** : `lake` pose un étang au pied de la vue ; nénuphars quand des plantes poussent, carpes sous la surface avec `shoal`.",
        "**Les fleurs** se dessinent en fleurs et gardent leurs couleurs ; rien ne pousse plus sur la rivière ni sur l'étang.",
        "**La force de Coriolis** : un monde qui tourne vite range ses vents en bandes et enroule ses orages ; un monde trop lent ne porte pas de tornade (physique stricte). L'onglet Détails le dit.",
        "**L'Âge du mentor** : Adrin écrit sous la lettre de chaque chapitre comment il aurait écrit le monde demandé : toujours après la réussite, et en recours si l'on cherche longtemps.",
        "**Le journal** : trois voix qui lui sont propres, l'archiviste, le maître, le voyageur (les journaux déjà écrits gardent la leur).",
      ],
    },
    en: {
      title: "The garden and the wind",
      letter: "The Guild has learned to write a garden. A sky can now wear the colour it is given, a lake spreads into a pond at the foot of the view, and a garden's hedge is clipped before the horizon. The wind, for its part, learns the spin of the world. And for those who follow Adrin's letters: he now shows how he would have written each world he asks for.",
      sign: "— for the Guild of Writers",
      items: [
        "**`sky: red`**: the colour of the daytime sky, instead of the one the mark draws (a colour or an angle of hue). It costs nothing.",
        "**The garden**: `garden` draws a clipped hedge pierced with openings, its alleys, flower beds.",
        "**The pond**: `lake` lays a pond at the foot of the view; water lilies when plants grow, koi under the surface with `shoal`.",
        "**Flowers** are drawn as flowers and keep their colours; nothing grows on the river or the pond any more.",
        "**The Coriolis force**: a fast-spinning world lays its winds in bands and coils its storms; a world too slow carries no tornado (strict physics). The Details tab says so.",
        "**The mentor's Age**: Adrin writes under each chapter letter how he would have written the world he asked for: always after success, and as a last resort if you search a long while.",
        "**The journal**: three voices of its own, the archivist, the master, the traveller (journals already written keep theirs).",
      ],
    },
  },
  {
    v: "2.2.0",
    fr: {
      title: "Ce que la Guilde a appris",
      letter: "Depuis votre dernière visite, la Guilde a appris à regarder. Chaque Livre relie désormais à un lieu qui lui est propre : au bord d'une hauteur, au fond d'un creux, à l'entrée d'une grotte, sous une lisière. Le ciel y tourne selon la direction où l'on se tient, la lune y a ses phases, la lumière y prend la couleur de son étoile, et l'orage y arrive de son côté. Et un Livre peut maintenant être complété sans être altéré : une page qui ne contredit rien décrit un peu plus le même monde.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Les points de liaison** : de plain-pied, en contrebas, en surplomb, à flanc de pente, à couvert, à l'entrée d'une grotte. Le lieu est choisi par la marque du Livre (son nom, `seed:` ou `age_seed`), parmi ce que le monde permet, et reste le même.",
        "**Le ciel** : le soleil suit la direction où l'on regarde (équateur, pôle, levant, couchant) ; la lune a son mois et de vraies phases ; la pleine lune éclaire le sol.",
        "**L'étoile** : le paysage baigne dans la couleur de son étoile, et le vivant s'y adapte (pourpre sombre sous une naine rouge, roux et doré sous une étoile chaude).",
        "**La météo a un côté** : l'orage arrive d'un côté selon la direction du lieu (de profil, au-dessus de la tête, ou en muraille sur l'horizon), cache le soleil et ne mouille que sous lui ; une pluie tombe parfois au loin, avec un morceau d'arc-en-ciel quand le soleil est bas dans le dos.",
        "**Les climats extrêmes** : un monde sans soleil montre ce qui l'éclaire ; le soleil noir garde un ton à lui ; la glace a ses icebergs et ses sastrugis.",
        "**Les Livres descriptifs** : une page ajoutée qui ne contredit rien est gratuite, même à l'encre sèche, et ne redessine pas le paysage. Retirer, changer une valeur ou contredire reste une altération.",
        "**L'Imageur** : le périscope tourne avec le lieu ; le soleil et les lunes suivent leur course vue de chaque côté.",
        "**Les merveilles** se voient mieux, dont les arbres faits du métal qu'ils ont bu.",
        "**Retouches** : chaque arbre a sa carrure ; canyons, buttes et stalactites redessinés.",
      ],
    },
    en: {
      title: "What the Guild has learned",
      letter: "Since your last visit, the Guild has learned to look. Every Book now links to a place of its own: on the edge of a height, down in a hollow, at the mouth of a cave, under a forest edge. The sky turns there with the direction you face, the moon has its phases, the light takes the colour of its star, and storms come from their own side. And a Book can now be completed without being altered: a page that contradicts nothing describes a little more of the same world.",
      sign: "— for the Guild of Writers",
      items: [
        "**Linking points**: on level ground, down in a hollow, on a height, on a slope, under cover, at the mouth of a cave. The place is chosen by the Book's mark (its name, `seed:` or `age_seed`), among what the world allows, and stays the same.",
        "**The sky**: the sun follows the direction you face (equator, pole, sunrise, sunset); the moon has its month and real phases; a full moon lights the ground.",
        "**The star**: the landscape is bathed in its star's colour, and living things adapt (dark purple under a red dwarf, russet and gold under a hot star).",
        "**Weather has a side**: a storm comes from one side depending on the place's direction (from the side, overhead, or as a wall on the horizon), hides the sun and only wets what lies under it; rain sometimes falls far away, with a piece of rainbow when the sun is low behind you.",
        "**Extreme climates**: a world without a sun shows what lights it; a black sun keeps a tone of its own; ice has its icebergs and sastrugi.",
        "**Descriptive Books**: a page added that contradicts nothing is free, even once the ink has dried, and does not redraw the landscape. Removing, changing a value or contradicting is still an alteration.",
        "**The Imager**: the periscope turns with the place; the sun and moons follow their course as seen from each side.",
        "**Wonders** show better, among them the trees made of the metal they drank.",
        "**Touch-ups**: every tree has its own build; canyons, buttes and stalactites redrawn.",
      ],
    },
  },
];

/** -1, 0 ou 1 : compare deux versions « x.y.z ». */
function cmp(a, b) {
  const pa = String(a || "0").split(".").map((x) => parseInt(x, 10) || 0), pb = String(b || "0").split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}
/** Les nouveautés plus récentes que `seen`, jusqu'à `current` comprise, de la plus récente à la plus ancienne. */
function since(seen, current) { return NEWS.filter((n) => cmp(n.v, seen) > 0 && cmp(n.v, current) <= 0).sort((a, b) => cmp(b.v, a.v)); }
/** Que faire au lancement : rien sur une installation neuve, la fenêtre si la version a monté (ou si l'on vient d'une version qui ne notait pas la version vue) et qu'il y a des nouvelles. */
function onStart(seen, current, known) {
  if (!seen) return known ? { show: since("0", current).length > 0, seen: current, from: "0" } : { show: false, seen: current }; // `known` : le plugin avait déjà des données (une mise à jour depuis une version qui ne notait rien)
  if (cmp(current, seen) <= 0) return { show: false, seen };
  return { show: since(seen, current).length > 0, seen: current, from: seen };
}

module.exports = { NEWS, cmp, since, onStart };
