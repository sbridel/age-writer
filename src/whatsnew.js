"use strict";
/**
 * Les nouveautés d'une version (pur). Après une mise à jour, le plugin les montre une fois : une fenêtre qui les liste,
 * et un pli de la Guilde sur la table de la cabane du Relto, qui dit l'essentiel dans la voix du monde.
 * Règle : rien sur l'histoire (les règles de spoilers du guide valent ici).
 */
const NEWS = [
  {
    v: "2.7.0",
    fr: {
      title: "Un lieu où l'on va",
      letter: "Les éclaireurs revenaient avec des paysages ; on leur demandait où ils avaient marché. L'encre a appris à poser chaque chose sur ce qui la porte, et à laisser la trace de ceux qui sont passés.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Le chemin** : là où des mains ont bâti, un chemin part de vos pieds et y mène, fait de ce que le sol donne (dalles, marches taillées, pieux, bornes), avec ses gués et ses passerelles. Là où ne vivent que des bêtes, une sente va à l'eau. Un monde que personne n'a parcouru n'en a pas.",
        "**Il suit le lieu** : il monte depuis un creux, descend en lacets depuis une hauteur, longe une pente, et dans une grotte des marches montent vers la lumière.",
        "**Chaque chose tient sur quelque chose** : rien ne flotte plus sur l'eau ni ne se pose sur ce qui ne le porte pas ; ce que vous avez écrit et que rien ne porte reste, mais souffrant.",
        "**Le gouffre** : quand un Âge se dégrade, sa fissure s'ouvre en gouffre, boit la lave et avale ce qui est bâti au bord ; sous la mer, un tourbillon.",
      ],
    },
    en: {
      title: "A place you go",
      letter: "The scouts came back with landscapes; they were asked where they had walked. The ink has learned to set each thing on what carries it, and to keep the trace of those who passed.",
      sign: "— for the Guild of Writers",
      items: [
        "**The path**: where hands have built, a path leaves from your feet and leads there, made of what the ground gives (slabs, cut steps, stakes, markers), with its fords and footbridges. Where only beasts live, a trail goes to the water. A world no one has walked has none.",
        "**It follows the place**: it climbs from a hollow, winds down from a height, runs along a slope, and in a cave steps rise towards the light.",
        "**Everything stands on something**: nothing floats on water or rests on what cannot carry it any more; what you wrote and nothing carries is still there, but ailing.",
        "**The chasm**: as an Age degrades, its fissure opens into a chasm, drinks the lava and swallows what is built at its edge; under the sea, a whirlpool.",
      ],
    },
  },
  {
    v: "2.6.0",
    fr: {
      title: "Chaque monde le sien",
      letter: "Les éclaireurs de la Guilde se plaignaient de revenir de trop de mondes semblables : une plaine, un peu de vent, une fissure. L'encre a appris de nouveaux mots. Désormais, chaque Âge qu'on écrit garde quelque chose qui n'est qu'à lui.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Les formes de l'eau et de la terre** : une île au large, une falaise, une cascade, une plage, un lagon, une arche marine ; et l'eau rouge, laiteuse ou noire.",
        "**Le ciel et le bâti** : une géante gazeuse, une nébuleuse ; une tour, un phare, un ponton, un escalier.",
        "**La signature des nouveaux Âges** : chaque Âge écrit après la 2.6 tire une chose rare à lui, et un tirage plus varié. Les Âges d'avant ne changent pas.",
        "**Le Relto vit au rythme de l'année** : neige en hiver, fleurs au printemps, feuilles qui tombent en automne, et un temps qui change toutes les demi-heures.",
        "**Des geysers qui jaillissent** et des ponts de toutes sortes : suspendus, de bois, de cordes, en aqueduc.",
      ],
    },
    en: {
      title: "Every world its own",
      letter: "The Guild's scouts complained of coming back from too many worlds alike: a plain, a little wind, a fissure. The ink has learned new words. From now on, every Age you write keeps something that is its own alone.",
      sign: "— for the Guild of Writers",
      items: [
        "**The shapes of water and land**: an island offshore, a cliff, a waterfall, a beach, a lagoon, a sea arch; and red, milky or black water.",
        "**The sky and the built**: a gas giant, a nebula; a tower, a lighthouse, a pier, stairs.",
        "**The signature of new Ages**: every Age written after 2.6 draws one rare thing of its own, and a richer draw. Ages from before do not change.",
        "**The Relto lives with the year**: snow in winter, blossoms in spring, leaves falling in autumn, and weather that changes every half hour.",
        "**Geysers that erupt** and bridges of every kind: suspended, wooden, rope, aqueduct.",
      ],
    },
  },
  {
    v: "2.5.2",
    fr: {
      title: "Le feu se tait",
      letter: "Un veilleur de la Guilde jurait entendre crépiter un âtre froid depuis des heures. On a vérifié : il avait raison. Désormais, le feu ne parle que tant qu'il brûle.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Un feu éteint ne crépite plus** : ni dans la pièce, ni dans le paysage sonore du Relto.",
        "**Le crépitement baisse avec le bois** pendant qu'on écoute, et n'est plus qu'un souffle dans les braises.",
        "**Une bûche sur un foyer froid** le fait crépiter de nouveau tout de suite.",
      ],
    },
    en: {
      title: "The fire goes quiet",
      letter: "A watchman of the Guild swore he had heard a cold hearth crackling for hours. We checked: he was right. From now on, the fire speaks only while it burns.",
      sign: "— for the Guild of Writers",
      items: [
        "**A dead fire no longer crackles**: neither in the room nor in the Relto soundscape.",
        "**The crackle fades with the wood** while you listen, and is only a breath in the embers.",
        "**A log on a cold hearth** makes it crackle again at once.",
      ],
    },
  },
  {
    v: "2.5.1",
    fr: {
      title: "Le verre de la Verrière",
      letter: "Un verrier de la Guilde est passé de nuit devant la Verrière. Il a trouvé que le feu la repeignait tout entière, cuivre compris ; il n'a laissé la couleur qu'au verre.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**La Verrière, la nuit** : la couleur du feu ne déborde plus en rectangle sur le ciel ; elle ne tombe que sur le verre, et le cuivre garde le sien.",
        "**Sa lueur et la lumière au sol** prennent la couleur du feu à mesure qu'il gagne.",
        "**Un feu ordinaire, ou des braises**, la laissent dans son vert d'eau.",
      ],
    },
    en: {
      title: "The Glasshouse glass",
      letter: "A glazier of the Guild walked past the Glasshouse at night. He found the fire repainting all of it, copper included; he left the colour to the glass alone.",
      sign: "— for the Guild of Writers",
      items: [
        "**The Glasshouse at night**: the fire's colour no longer spills in a rectangle over the sky; it falls on the glass alone, and the copper keeps its own.",
        "**Its glow and the light on the ground** take the fire's colour as it spreads.",
        "**An ordinary fire, or embers**, leave it in its water green.",
      ],
    },
  },
  {
    v: "2.5.0",
    fr: {
      title: "Le monde a un côté",
      letter: "Les arpenteurs de la Guilde sont revenus avec du sable dans les plis de leurs carnets. Les mondes ont un vent, un matin, un âge qui se lit dans leurs pics ; le bois qu'on croyait perdu repousse. Et chez vous, le feu attend qu'on y remette une bûche.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Le vent du lieu** : la tempête de sable, le grain de neige et l'orage arrivent de son côté ; le brouillard dort le matin dans les vallées.",
        "**Hors du cadre**, un soleil ou une lune se devine encore à sa lumière.",
        "**Le relief** dit l'âge et la chaleur du monde : pics vifs, sommets usés, crêtes, vallées, cratères.",
        "**L'oxygène** est fabriqué par la vie ; le feu, la rouille et les bêtes en ont besoin (`oxygen:` pour l'écrire).",
        "**La lave suit sa roche** (coulée noire du basalte, dôme gris du granite), et son soufre brûle bleu la nuit.",
        "**Le monde se relit** : le bois brûlé repousse, la foudre rebrûle, le sol nu se couvre ; deux merveilles d'eau qui ne tombe pas.",
        "**Le feu du Relto** brûle le bois qu'on y met, prend la couleur du dernier Âge relié (ou celle de la page Couleur du feu) et, bien nourri, la répand sur toutes les fenêtres ; celles du Château sont finies.",
      ],
    },
    en: {
      title: "The world has a side",
      letter: "The Guild's surveyors have come back with sand in the folds of their notebooks. Worlds have a wind, a morning, an age you can read in their peaks; the wood thought lost grows back. And at home, the fire is waiting for another log.",
      sign: "— for the Guild of Writers",
      items: [
        "**The wind of the place**: sandstorms, snow squalls and storms arrive from its side; fog lies in the valleys in the morning.",
        "**Beyond the frame**, a sun or a moon still shows by its light.",
        "**Relief** tells the world's age and heat: sharp peaks, worn summits, ridges, valleys, craters.",
        "**Oxygen** is made by life; fire, rust and animals need it (`oxygen:` to write it).",
        "**Lava follows its rock** (the black flow of basalt, the grey dome of granite), and its sulphur burns blue at night.",
        "**The world rereads itself**: burnt wood grows back, lightning burns again, bare ground fills in; two wonders of water that does not fall.",
        "**The Relto fire** burns the wood you add, takes the colour of the last Age you linked to (or the one of the Fire colour page) and, well fed, spreads it to every window; the Castle's windows are finished.",
      ],
    },
  },
  {
    v: "2.4.1",
    fr: {
      title: "L'orage a du volume",
      letter: "Un graveur de la Guilde a passé l'après-midi à regarder monter un orage. Il en a rapporté des tours, une base lourde et une enclume qui s'étire ; et au passage, il a refait la porte de l'appentis de la Verrière.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**L'orage vu de côté** a du volume : un bord qui bourgeonne, des tours et des creux dans sa masse, une base bosselée, une enclume qui déborde sur le ciel clair.",
        "**Sous l'orage**, la pluie tombe en un mur au bord doux et penché.",
        "**L'appentis de la Verrière** a un mur plus haut sous sa coupole ronde, et une porte art nouveau à sa mesure, toute dans le mur.",
      ],
    },
    en: {
      title: "The storm has volume",
      letter: "A Guild engraver spent the afternoon watching a storm rise. He came back with towers, a heavy base and a stretching anvil; and on the way, he redid the door of the Glasshouse lean-to.",
      sign: "— for the Guild of Writers",
      items: [
        "**A storm seen from the side** has volume: a billowing edge, towers and hollows in its mass, a lumpy base, an anvil spreading over the clear sky.",
        "**Beneath the storm**, the rain falls as a wall with a soft, leaning edge.",
        "**The Glasshouse lean-to** has a higher wall under its round dome, and an art nouveau door to its measure, entirely in the wall.",
      ],
    },
  },
  {
    v: "2.4.0",
    fr: {
      title: "La pierre et les aurores",
      letter: "Les graveurs de la Guilde ont repris leurs fenêtres. Les ruines ont retrouvé leur pierre, les jardins leurs allées, les arbres leur écorce ; et les nuits d'aurores ressemblent enfin à ce que racontent ceux qui les ont vues.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Les aurores** tombent en rideaux de rayons doux, vertes en bas, roses ou pourpres en haut, dans la fenêtre comme dans le ciel du Relto.",
        "**Les ruines** et les étrangetés de l'horizon sont de pierre, de la roche du monde, au lieu de silhouettes noires.",
        "**Le jardin** a sa haie verte, ses allées de gravier qui mènent au bassin, ses massifs fleuris ; les arbres se tiennent derrière la haie.",
        "**Les arbres** ont des troncs à leur taille, avec leur écorce et leurs branches ; les fleurs bourdonnantes sont des touffes de fleurs.",
        "**La fenêtre** bouge deux fois plus lentement.",
      ],
    },
    en: {
      title: "Stone and auroras",
      letter: "The Guild's engravers have taken up their windows again. Ruins have found their stone, gardens their alleys, trees their bark; and nights of aurora at last look like what those who saw them tell.",
      sign: "— for the Guild of Writers",
      items: [
        "**Auroras** fall in curtains of soft rays, green below, pink or purple above, in the window and in the Relto sky alike.",
        "**Ruins** and the strange things on the horizon are made of stone, the world's own rock, instead of black silhouettes.",
        "**The garden** has its green hedge, gravel alleys leading to the basin, flower beds; trees stand behind the hedge.",
        "**Trees** have trunks to their size, with bark and branches; humming blooms are tufts of flowers.",
        "**The window** moves twice as slowly.",
      ],
    },
  },
  {
    v: "2.3.1",
    fr: {
      title: "Le livre des lois, relu",
      letter: "Un copiste de la Guilde a relu le Rehevkor de près. Le poème qui ouvre le livre se lit mieux, et deux versets disent enfin les lois telles qu'on les connaît aujourd'hui.",
      sign: "— pour la Guilde des Écrivains",
      items: [
        "**Le fahsee qui ouvre le livre des lois** est retravaillé pour la clarté : chaque vers dit plus nettement la loi qu'il désigne.",
        "**En anglais**, le fahsee rime à son tour, de la même forme : cinq strophes de cinq vers coupés au milieu.",
        "**Deux versets suivent les lois** : le Changement (un mot ajouté qui ne contredit rien ne blesse pas) et le Nom (la marque, graine de ce qu'on n'écrit pas et du lieu où l'on arrive).",
      ],
    },
    en: {
      title: "The book of laws, reread",
      letter: "A Guild copyist has reread the Rehevkor closely. The poem that opens the book reads better, and two verses at last tell the laws as they are known today.",
      sign: "— for the Guild of Writers",
      items: [
        "**The fahsee that opens the book of laws** is reworked for clarity: each line says more plainly the law it points to.",
        "**In English**, the fahsee now rhymes as well, in the same form: five verses of five lines cut in the middle.",
        "**Two verses follow the laws**: Change (a word added that contradicts nothing does no harm) and The Name (the mark, seed of what you do not write and of the place where you arrive).",
      ],
    },
  },
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
