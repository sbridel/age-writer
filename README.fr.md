# Age Writer

[English](README.md) · **Français**

Plugin Obsidian pour écrire des mondes. Tu écris un **Âge** (un monde) dans un bloc `age`, une page par ligne, et le plugin calcule le reste : description, stabilité, fenêtre de liaison peinte et animée, livre à feuilleter avec sa couverture, carte des mondes liés, et un refuge (le **Relto**) où ranger tes Âges. Tout est local : pas de réseau, pas d'IA à l'exécution, tous les sons sont synthétisés et tous les dessins sont procéduraux.

Idée de départ : on ne **crée** pas un monde, on se **lie** à un monde qui existe. Ce que tu écris le décrit ; ce que tu laisses ouvert est tiré au sort, toujours de la même façon pour la même note. Et si tu réécris un monde déjà exploré, tu l'abîmes.

> **This product contains trademarks and/or copyrighted works of Cyan. All rights reserved by Cyan. This product is not official and is not endorsed by Cyan.**
>
> *(Traduction : ce produit contient des marques et/ou des œuvres protégées de Cyan, tous droits réservés par Cyan ; il n'est ni officiel ni approuvé par Cyan.)*
>
> Projet de fan réalisé selon la politique de contenu de fans de Cyan. Sans lien avec Cyan Worlds ni approbation de leur part. Aucune ressource de Myst (police, image, son) n'est fournie. Gratuit et non commercial.
>
> Inspiré de la série Myst (et de l'idée de Mystcraft : se lier à un monde plutôt que le créer). Un hommage : les noms empruntés à l'univers de Myst (Âge, Relto, D'ni, livre de liaison, Livre descriptif…) sont un clin d'œil et une source d'inspiration, pas une reproduction. Le code, les images, les sons et les textes sont originaux. Licence : MIT.

## Dans la fiction

Age Writer est pensé pour être **diégétique** : presque tout ce qu'il montre est quelque chose qui se passe *dans le monde*, pas une fonction d'application. Tu ne remplis pas un formulaire : tu es un Écrivain à son pupitre, et ton coffre est une bibliothèque de Livres descriptifs.

- **Ta note est un Livre descriptif.** Chaque ligne du bloc `age` est une phrase de l'Art. Le texte sous le bloc, c'est ce que le livre te renvoie une fois écrit : *« The sun burns white, leaving no corner kind. »* Rien n'y est une étiquette ni un nom de champ.
- **Ce que tu n'écris pas n'est pas vide.** L'obscurité le remplit, et le livre te le dit : *« Unwritten, it was drawn from the dark: a pale companion trails the main star. »* Même note, même monde, à chaque fois : tu te lies à un monde qui existe, tu ne relances pas un dé.
- **La stabilité, c'est la tenue de l'Art**, pas un score. Un Âge est *stable*, *instable* ou *mourant* ; les contradictions se lisent comme le malaise du monde lui-même (*« a frozen world does not thaw for what is written upon it »*).
- **Les mondes ont une physique.** Le noyau refroidit, l'air s'échappe d'un petit monde, une naine rouge fige une face dans la nuit. Quand quelque chose ne tient pas, l'explication parle du monde (*« un noyau en fusion, mais l'intérieur s'est refroidi »*), et la correction est proposée comme une ligne d'Art à écrire (`age: 3.5`).
- **Tu regardes par une fenêtre de liaison.** Chaque Âge a sa fenêtre vivante : son ciel, son relief, son rivage, la branche ou les roseaux au bord du cadre, son temps et sa lumière à cette heure. Un clic, et tu entends la liaison.
- **Les livres se comportent en livres.** Une couverture tirée de l'Âge, un fermoir qui claque, des pages qui tournent. Un livre-piège ressemble à n'importe quel autre. Des pages abîmées ou arrachées rendent la liaison incertaine. Réécrire un monde déjà exploré **l'abîme** (la loi du changement) : l'Art se souvient.
- **Les nombres sont D'ni.** Numéros d'Âge, graines, énigmes et horloge du Relto s'écrivent en base 25 ; le Relto garde l'heure D'ni.
- **Chez soi est un lieu.** Le Relto est ton Âge : une île, une cabane, une étagère où tes Âges se rangent en livres colorés selon leur stabilité. Les pages que l'on gagne en écrivant (un Âge stable, un certain nombre d'Âges) changent l'île. Le soir, le chat dort sur le tapis, près du feu. Aucune physique ne s'y applique : c'est le seul endroit où rien ne résiste.
- **Le journal s'écrit, il ne se consigne pas.** Explorer un Âge laisse des entrées, avec une voix, à côté des notes qui le mentionnent.

Deux endroits sortent exprès de la fiction : l'onglet **Détails** (stabilité par axe, causes, chiffres : à lire comme les notes d'un arpenteur de la Guilde sur ton livre) et les **Réglages**. Tout le reste essaie de rester dans le monde.

**État.** Publié, ordinateur seulement, mode bac à sable (voir [La suite](#15-la-suite)). La version en cours est celle de [`manifest.json`](manifest.json) et de la page [Releases](https://github.com/sbridel/age-writer/releases) ; les changements de chaque version sont dans [`CHANGELOG.md`](CHANGELOG.md) (en anglais) et, plus en détail, dans [`docs/NOTES-historique.md`](docs/NOTES-historique.md).

Nouveautés récentes : **l'Art de la Guilde** (réglage *Instruments* : un livre vierge dans l'Imageur, qu'on accorde jusqu'à voir paraître un monde, parfois un monde que personne n'a écrit ; un balancier-métronome dans l'observatoire pour distinguer le vrai pouls des faux), l'**horloge D'ni** qui s'éveille quand le Great Zero de ton Relto est trouvé, l'**observatoire** et sa carte des étoiles (situer les étoiles de tes Âges, étoiles mortes, fausse ligne du roi Me'erta), un **banc optique** redessiné avec une aide aux lentilles, la **météo vivante** (`drizzle: often, dawn`), et le **rahnfee**, une unité de fan pour les distances le long du faisceau du Great Zero. Le détail est dans [`CHANGELOG.md`](CHANGELOG.md).
---

## Sommaire

1. [Installation](#1-installation)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Écrire un Âge](#3-écrire-un-âge)
4. [Le bloc Âge : trois onglets](#4-le-bloc-âge--trois-onglets)
5. [Le livre](#5-le-livre)
6. [Le Relto](#6-le-relto)
   - [Onglets](#onglets)
   - [L'Imageur](#limageur)
   - [Le télescope](#le-télescope)
   - [Les deux livres du Relto](#les-deux-livres-du-relto)
   - [La vue globale](#la-vue-globale)
   - [Pages du décor, du ciel et de la faune](#pages-du-décor-du-ciel-et-de-la-faune)
   - [Le bassin de koï et le chat](#le-bassin-de-koï-et-le-chat)
   - [Pages intégrées](#pages-intégrées)
7. [Les sons](#7-les-sons)
8. [Le monde](#8-le-monde)
9. [Fenêtre, effets, pièges](#9-fenêtre-effets-pièges)
10. [D'ni, mécanismes, journal](#10-dni-mécanismes-journal)
11. [Réglages](#11-réglages)
12. [Guide intégré](#12-guide-intégré)
13. [Commandes](#13-commandes)
14. [Limites connues](#14-limites-connues)
15. [La suite](#15-la-suite)
16. [Développement](#16-développement)
17. [Licences et mentions](#17-licences-et-mentions)

---

## 1. Installation

- **Depuis Obsidian** (une fois le plugin listé dans l'annuaire communautaire) : *Réglages → Plugins communautaires → Parcourir*, chercher **Age Writer**, installer, activer.
- **À la main** : télécharger `main.js`, `styles.css` et `manifest.json` depuis la dernière [release](https://github.com/sbridel/age-writer/releases), les copier dans `.obsidian/plugins/age-writer/` dans ton coffre, puis activer **Age Writer** dans *Réglages → Plugins communautaires*.

L'interface suit la langue d'Obsidian (anglais ou français). Le contenu des mondes (noms de blocs, descriptions générées) est en anglais. Les réglages du plugin sont dans son onglet de réglages, sous le titre « Extensions ».
---

## 2. Démarrage rapide

1. Écris un bloc `age` dans une note :

````
```age
single_sun
water
return: [[Hub]]
link: [[Sunder Reach]]
```
````

2. Sous le bloc, le panneau s'affiche (onglets *Texte & glyphes*, *Fenêtre de liaison*, *Détails*).
3. Commande **Open this Age as a book** : le livre s'ouvre dans un onglet, sur sa couverture.
4. Commande **Open the Relto** : elle crée la note de ton refuge (une île, une cabane, une étagère où tes Âges sont rangés en livres).
   Ou **Generate a random Age** pour un monde tout fait ; la note *Age Writer — Bienvenue*, créée au premier lancement, est un exemple commenté.
5. Si tu ne sais pas quoi écrire : commande **Open the Age Writer full reference**, partie *Ce que tu écris* : tous les blocs, toutes les lignes, avec des exemples.

---

## 3. Écrire un Âge

Un bloc de code `age` contient trois sortes de lignes :

- **un bloc, seul sur sa ligne**, écrit tel quel : `water`, `twin_suns`, `great_tree`. Chacun est une page du livre ;
- **une clé et une valeur** : `seed: 42`, `link: [[Sunder Reach]]`, `mass: 0.8` ;
- **une liste** : `many: ruins, trees`.

`stars: twin_suns` n'est pas une ligne valide (c'est une **tache d'encre**) : écris `twin_suns` seul. Tout ce que le plugin ne reconnaît pas est une tache d'encre et coûte de la stabilité.

Les lignes spéciales :

| Ligne | Effet |
|---|---|
| `link: [[Sunder Reach]]` | livre de liaison vers un autre Âge (plusieurs permis) |
| `return: [[Hub]]` | livre de retour |
| `panel: [[lagoon.png]]` | image de fenêtre à toi |
| `seed: 42` | change le tirage (même note + même graine = même monde) |
| `cover: sober` | sobriété de la couverture : `ornate`, `classic`, `sober`, `plain`, ou 0 à 1 |
| `window_style: generative` | rendu de la fenêtre (`generative` ou `classic`) |
| `window_size: xl` / `window_width: 520` | taille de la fenêtre |
| `fx: tv` | effet de fenêtre : `classic`, `static`, `ripple`, `sweep`, `tv`, `random`, `off` |
| `day_length: 40`, `year_length: 12` | durée du jour (minutes réelles) et de l'année (jours), rendu génératif |
| `moons: 3` (ou `lunes: 3`) | nombre de lunes dans la fenêtre générative (0 à 5 ; `companion_moon` en donne une) |
| `many: ruins` / `few: rain` / `normal: water` | quantités |
| `rain: sometimes, dawn` | météo vivante : à quelle fréquence (`always`, `often`, `sometimes`, `rarely`, `1/10`, `30%`) et à quel moment (`dawn`, `morning`, `noon`, `afternoon`, `dusk`, `night`) |
| `mass: 0.8`, `age: 3.5`, `orbit: 1.2`… | valeurs de physique (toutes facultatives ; la référence donne une valeur type et ce que chacune veut dire) |
| `mechanism: orrery` | mécanisme de l'Âge |
| `trap book` | livre-piège (ni retour ni fissure) |
| `damaged_pages = 2`, `removed_pages = 1` | livre de liaison abîmé |

Les lignes spéciales ne sont pas des pages. Tous les blocs que tu peux écrire, par axe et avec leur coût, et tous les alias sont dans la **référence complète** intégrée au plugin.

---

## 4. Le bloc Âge : trois onglets

Pour ne pas tout montrer à la fois, le panneau sous le bloc a trois onglets (réglage *Onglets dans le bloc Âge*) :

- **Texte & glyphes** : description et glyphes, avec une petite fenêtre de liaison centrée ;
- **Fenêtre de liaison** : la grande fenêtre ; un clic joue le son de liaison ;
- **Détails** : stabilité par axe, **physique du monde** (fiche, chaîne des causes, ce qui ne tient pas, pistes cliquables), chiffres D'ni, mécanismes, bouton « Écouter l'Âge ».

---

## 5. Le livre

Commande **Open this Age as a book**. Il s'ouvre dans un onglet principal (ou une fenêtre, ou le panneau latéral : réglage *Ouvrir le livre dans*) et toujours sur la **Couverture**.

- **Couverture** : générée à partir de l'Âge (marbre, cuir, dos nervuré, coins ou rivets, médaillon ou cartouche, usure selon le verdict). Sobriété réglable, de très ornée à nue ; export en SVG.
- **Descriptive book** : les pages du monde ; ✓ garde une page tirée, × la retire ; une palette ajoute ou retire des pages.
- **Linking book** : trois pages à droite (glyphes + texte, vitre de liaison, liens). On tourne les pages en cliquant la page de droite (suivante) ou de gauche (précédente), avec un bruit de page.

Cliquer la vitre ou « open ↗ » te lie vers l'Âge visé (liaison parfois incertaine si le livre est abîmé).

---

## 6. Le Relto

Ton refuge : une île avec cabane, étagère de livres (tes Âges, cliquables et colorés par stabilité), piliers de liaison, et des **pages** qui ajoutent des éléments et des ambiances. Un bloc `relto` dans une note l'affiche.

### Onglets

Une fine rangée d'icônes discrètes au-dessus de l'image :

| Onglet | Contenu |
|---|---|
| **Vue** (œil) | l'image ; dessous, l'heure et l'heure D'ni en grand. Un clic sur l'heure la cache ; elle s'efface seule après quelques secondes, sauf si la souris est sur la vue. Le nom D'ni s'affiche en petit, en haut, dans la bande noire |
| **Pages** | pages actives, disponibles, verrouillées ; livres affichés sur l'étagère |
| **Réglages** | heure du ciel, ambiance sonore, niveau, volume |
| **Agrandir** | ouvre la **vue Relto** dans un onglet principal (aussi : commande *Open the Relto view (large)*) |

Dans la vue Relto, une icône **plein écran** met l'image sur tout l'écran ; la barre d'icônes et l'heure flottent par-dessus et s'effacent. Échap pour quitter. Le son du Relto continue quand on change d'onglet.

### L'Imageur

La page *Imager* (`page_imager`) ajoute au Relto une machine inspirée des imageurs de la série Myst : une chambre de pierre froide (bouton de navigation, ou le petit appareil de laiton qui luit sur la table de la cabane). On pose le livre d'un Âge sur le **lutrin** (‹ › pour changer de livre) et on accorde la machine sur cet Âge jusqu'à ce qu'il apparaisse, vivant, sur l'**écran** (un petit cristal l'y projette). C'est une machine, pas un panneau à onglets : chaque commande a sa place. Sous l'écran, un établi et ses **trois postes**, chacun avec sa lampe (allumée quand le réglage est juste) ; un clic sur un poste pour s'en approcher, la flèche du bas pour reculer (de près, l'écran reste visible) :

- **I. Râtelier à cristaux** — la résonance de l'Âge : ses **pages écrites, dans l'ordre du livre** (les quatre premières). Huit cristaux gravés sur un râtelier (les pages de l'Âge et des leurres) ; on en **prend un et on le pose** dans l'un des quatre logements (celui qui y était retourne au râtelier, ou les deux échangent). Un cristal luit vert d'eau quand il est juste, vacille ambre quand la page est bien de l'Âge mais mal placée. Des cristaux faux **dédoublent** l'image.
- **II. Banc optique** — la couleur de la **lumière de l'étoile** : un verre rouge, un vert, un bleu **coulissent sur leurs rails** (un clic où on les veut, de 0 à 24), et un **iris** à lamelles, avec son levier sur un arc, réglé sur la lumière que reçoit le monde (une étoile proche et vive le ferme, une lointaine l'ouvre). Un **comparateur** montre à gauche la lumière de l'étoile, à droite ton faisceau. Des verres faux **teintent** l'image. Avec l'*Aide aux lentilles* (activée par défaut), une ligne de mots sous l'écran dit ce que l'œil lit dans le comparateur : quelle couleur est en trop ou manque, si ton faisceau est trop vif ou trop sombre.
- **III. Régulateur** — le **ciel** de l'Âge : inverseur de polarité et quatre boutons (fréquence, amplitude, harmoniques, phase), un **tube cathodique** avec la trace large et pâle du ciel et la tienne, vive, un voltmètre. La fréquence vient de la **durée du jour**, l'amplitude de la **pression de l'air**, les harmoniques des **aurores et du champ magnétique**, la polarité du sens du champ. La **phase dérive** avec l'horloge, au rythme du jour de l'Âge (un monde figé par la marée ne dérive presque pas). Désaccordé, l'écran n'est que **neige**.

**Le verrou.** À droite, un grand levier sous une lampe : rouge, ambre quand l'image est assez nette, verte quand il tient. Tiré sur une image nette, la machine **suit l'Âge toute seule** (la phase qui dérive, les sauts d'un cycle erratique) ; les commandes sont alors tenues, et le livre porte une petite étiquette de laiton sur l'étagère de la cabane. On le relâche en le tirant de nouveau.

**Le périscope.** Verrouillé, la manivelle à gauche de l'écran **tourne la vue** (quatre directions, chacune son paysage sous le même ciel ; la rose montre où l'on regarde) et le levier à droite l'**incline** : vers le **zénith** (tout le ciel, ses étoiles, ses lunes, ses aurores, la canopée s'il y a des arbres), à l'horizon, ou **sous l'eau** quand l'Âge en a (rayons de lumière, varech, corail, poissons, ruines englouties, creux d'acide, cheminées de lave, perles, et la lueur d'une **fissure** sous-marine : la voie du retour ; sous la glace s'il gèle). La vue glisse quand on tourne.

Les valeurs s'affichent en chiffres D'ni. La **jauge de netteté** lit les trois réglages ensemble, et les **battements** du bourdon ralentissent à mesure que l'atmosphère s'accorde ; une quinte cristalline sonne quand l'image entière tient ; verre, rails, manivelle et verrou ont chacun leur bruit. Les indices restent dans la fiction : l'onglet **Détails** de chaque Âge porte une note d'arpenteur (comment son ciel bourdonne, à quoi ressemble la lumière de son étoile, et les valeurs fixes en chiffres D'ni) ; la phase n'est jamais écrite, et les cristaux sont les pages mêmes du livre. Ton réglage, le verrou et le périscope sont gardés pour chaque Âge. Une fois l'étoile de l'Âge située au télescope, un micromètre de synchro calibre l'Imageur sur ce monde : une image plus nette, l'heure là-bas et ses coordonnées KIPS (voir [Le télescope](#le-télescope)).

**L'Art de la Guilde.** Tout ce qui précède est la façon facile (par défaut). Dans la façon exigeante (réglage *Instruments* : *L'Art de la Guilde*), l'Imageur ne contient qu'un **livre vierge**, fixé, à fenêtre noire : on ne choisit pas l'Âge, on le trouve par les réglages. Le **télescope** donne la cible : pose le livre d'un Âge sur le lutrin de l'observatoire, son étoile située et les trois molettes sur ses indices, et l'instrument tient cette étoile et renvoie sa lumière à l'Imageur ; le comparateur de la station II la montre à gauche (sans lui, la moitié gauche reste sombre : on peut encore régler à l'aveugle, d'après les mots de l'arpenteur). La **station I** propose les cristaux des glyphes que tu connais (ceux qu'écrivent les Âges de l'étagère, comme le livre des glyphes ; par rangées de huit) ; quatre cristaux dans l'ordre sont les premières pages d'un monde. S'ils correspondent à un Âge (parmi ceux de l'étoile tenue, ou parmi tous), ils **verrouillent une planète** et éveillent la **station III** : alors seulement la trace du ciel apparaît sur le tube cathodique. Plusieurs Âges autour d'une même étoile (`system:`) partagent sa lumière : cristaux et atmosphère les départagent. Accorde lentilles et atmosphère, synchronise la planète si son étoile est située, et l'image se forme : le livre vierge **se souvient**, le nom de l'Âge s'inscrit sur sa page. Le verrou et le périscope marchent comme avant. Des réglages partiels donnent les signes habituels (image dédoublée, teinte, neige) sans nommer le monde ; des réglages qui ne correspondent à aucun Âge écrit laissent le plus souvent la fenêtre noire. L'état de la Guilde est gardé par Relto, à part des réglages par Âge du mode facile.

**Les mondes que personne n'a écrits.** L'Art ne crée pas un monde, il en relie un qui existe déjà : on tombe donc parfois quand même sur un monde. En réglant **à l'aveugle** (le télescope ne tient aucune étoile), pose quatre cristaux qui ne correspondent à aucun Âge écrit : la station III ne dort plus, elle *cherche* (fréquence et amplitude comptent encore). Si les lentilles disent une étoile plausible (la lumière blanche à rouge d'un soleil ordinaire, à quelques crans près), si le jour n'est ni figé ni fou et l'air respirable, et si le livre juge vivant (pas mourant) un monde aux quatre premières pages de ces cristaux, dans cet ordre, alors environ une fois sur trois la fenêtre forme un monde que personne n'a écrit. C'est reproductible : les mêmes cristaux, la même lumière d'étoile et les mêmes plages de crans d'iris, de fréquence et d'amplitude montrent toujours le même monde, ou rien ; la phase, l'harmonique et la polarité s'accordent ensuite sans le changer. Rends-le net (la netteté se règle comme pour un Âge écrit ; ni synchro, ni heure là-bas, ni KIPS) : le livre le montre sans nom, « un monde que personne n'a écrit », avec quelques mots de sa description à l'encre pâle, une note étrange qui bat (avec les sons des vues rapprochées) et une ligne : « Le livre montre un monde que personne n'a écrit. » Clique **Transcrire ce monde** sous le livre : une nouvelle note est créée là où *Générer un Âge au hasard* range les siennes (sans jamais écraser), avec un nom tiré de sa graine et un bloc `age` qui contient exactement ses quatre pages, son étoile et son ciel en lignes de valeurs (`star_mass:`, `insolation:`, `rotation:`, `atmosphere:`) et sa `seed:`. Ouverte, c'est le même monde ; désormais c'est un Âge écrit comme les autres (il rejoint l'étagère, et le livre retiendra son nom). Un Âge écrit dont les pages correspondent l'emporte toujours.

### Le télescope

La page *Telescope* (`page_telescope`) est toujours dans le livre des pages, **verrouillée tant que tu n'as pas écrit ton premier Âge et attaché la page *Montagnes***. Attache-la : un petit observatoire se dresse au sommet : un tambour de pierre et une coupole vert-de-gris, la fente ouverte d'où dépasse le tube (une fenêtre s'allume la nuit) ; un clic pour y regarder. Chaque Relto cache son propre **Great Zero**, tiré du nom et de la graine du Relto : rien n'est stocké, et deux Reltos ne le partagent jamais. Deux molettes orientent la lunette : **Torahn** (l'angle, dans le sens horaire depuis la ligne du Great Zero, en torantee : un tour en fait 62 500) et **Élévation** (la hauteur par rapport au plan du Great Zero, en shahfeetee ; comme sur le KI, au-dessus du plan le chiffre est négatif) ; la couronne avance de 25 crans, le moyeu d'un cran (100 torantee ou 1 shahfee). Les valeurs sont gravées sous chaque molette en chiffres D'ni. Ce sont les unités du système de coordonnées D'ni du Great Zero (GZCS) ; la troisième coordonnée, la distance au Zéro (en shahfeetee), se mesure quand on situe l'étoile d'un Âge (ci-dessous). Aucune distance n'est affichée : dans l'oculaire, un pouls qui bat au prorahn D'ni n'est d'abord qu'une lueur diffuse et inégale, puis un point de lumière qui se fixe à mesure qu'on approche ; une ligne de mots dit ce qu'on voit, et une note douce suit chaque geste ; tant qu'on regarde, le pouls bat aussi doucement à l'oreille, en sautant des battements de loin, régulier de près (avec les sons des vues rapprochées). Dans la manière **facile** (par défaut), après chaque geste la ligne de mots ajoute « Il s'avive. » ou « Il pâlit. », et le signal scintille à peine. Dans **l'Art de la Guilde** (réglage *Manière des instruments*), rien ne dit si l'on se rapproche : le signal scintille d'un battement à l'autre, il faut en regarder quelques-uns avant de juger, et comparer soi-même. Amène le point dans le petit anneau : le Zéro est **trouvé**, gravé sur la plaque, il le reste, et une faible lueur bat au bout de la lunette sur l'île. Un clic sur la plaque y ramène les molettes. Trouver le Zéro débloque la page **D'ni clock** (`page_dni_clock`) : une sphère armillaire de laiton sur son propre pilier dans la brume, dont l'anneau des heures tourne avec le jour D'ni. Une fois attachée, l'observatoire répand le faisceau du Zéro dans tout le Relto : l'heure D'ni s'affiche et le calendrier se remet à l'heure. Jusque-là, le Relto ne connaît la date que par sa pierre-calendrier, qui dérive de quelques yahr, et l'heure se tait. (Que le faisceau porte le temps D'ni est une extension du lore propre au plugin.)

**Le métronome.** Au mur de gauche de l'observatoire pend un petit balancier de laiton, réglé à la main, qui bat le prorahn mécaniquement (« Un balancier D'ni, réglé à la main : il compte les prorahn, il ne connaît pas l'heure »). Il frappe d'un côté puis de l'autre, une fois par prorahn, et la butée touchée luit un instant : le pouls du vrai Zéro culmine toujours à ce moment-là. Tout le reste glisse contre lui : la ligne ancienne de Me'erta (environ 1,06 prorahn) s'écarte un peu plus du balancier à chaque battement, et le faux battement d'un pulsar ou d'une étoile à neutrons tombe nettement à côté. Avec les sons des vues rapprochées, on l'entend aussi : un tic sec, de bois, à chaque battement, distinct de la note du pouls, pour entendre les deux se séparer. En mouvement réduit, le balancier reste au repos et une petite lampe de chaque côté marque le battement.

**Deux manières de jouer.** *Manière des instruments* (Âges & mécanismes) règle ensemble le télescope et l'Imageur. **Facile** (par défaut) : les mots « il s'avive / il pâlit », une scintillation faible, la ligne ancienne n'apparaît jamais, et les étoiles mortes brouillent seulement un peu l'image (ni faux battement, ni direction courbée, ni retard faussé ; les notes de l'arpenteur disent vrai et seulement que la lumière « arrive un peu floue »). **L'Art de la Guilde** : tout ce qui suit, pièges compris. Les récompenses sont les mêmes (le Zéro, l'horloge D'ni, les étoiles situées, l'heure là-bas, KIPS).

**Situer l'étoile d'un Âge (étape 2). Le télescope travaille à l'échelle des systèmes d'étoiles ; l'Imageur trouve ensuite la planète. L'étoile de chaque Âge a une vraie place dans le GZCS (Torahn, distance et élévation par rapport au Great Zero), tirée de ses blocs d'étoile (combien de soleils, leurs couleurs, une orbite binaire) et d'une graine d'étoile : par défaut chaque Âge a sa propre étoile ; écris la même ligne `system: Kerath` (ou `système:`) dans plusieurs Âges qui ont les mêmes blocs d'étoile et ils partagent un système, situé d'un coup. Change l'étoile d'un Âge et son système se déplace : réécrire déplace le monde. L'onglet **Détails** de l'Âge ajoute à sa note d'arpenteur ce qu'on perçoit du Great Zero **depuis cet Âge** : sa direction (des mots de rose des vents, le nord étant la ligne du Zéro), sa hauteur au-dessus ou au-dessous de l'horizon, le retard de son pouls (la distance) et son éclat ; avec *Notes de l'arpenteur* sur complètes, les trois réglages du télescope en chiffres D'ni ; sur aucune, rien. Une fois le Zéro de ton Relto trouvé, pose le livre d'un Âge sur le **lutrin** au pied de l'instrument (‹ › pour choisir ; lutrin vide : retour à ton propre Zéro). Les deux molettes visent alors l'endroit où le Zéro apparaît vu de cet Âge, et une troisième, petite, règle le **Retard** du pouls : combien il arrive après le battement du métronome, lu en rahnfee (plus bas ; la couronne avance d'un 25ᵉ, le moyeu d'un 625ᵉ, soit 25 shahfeetee de trajet). Dans l'oculaire, le même pouls te guide, et un anneau ambre, l'**écho** de l'Âge, bat avant ou après lui tant que le retard n'est pas juste (« L'écho vient après le pouls : plus de retard »). Dans la tolérance (200 torantee, 2 shahfeetee, un cran de retard), l'étoile est **située** : l'instrument fait lui-même la différence (Relto → Zéro) moins (Âge → Zéro), et la plaque *Étoile de l'Âge* grave sa position GZCS (Torahn et élévation, puis sa distance le long du faisceau en rahnfee). Aucun calcul à la main. Il faut le Zéro du Relto pour situer une étoile ; oublier le Zéro oublie aussi les étoiles.

**Calibrer l'Imageur.** La calibration est un bonus : sans elle, l'Imageur marche exactement comme avant. Une fois l'étoile de l'Âge située, un petit **micromètre de synchro** apparaît à côté de l'écran, sous une fenêtre à réticule : tourne-le (couronne : cinq crans, moyeu : un demi-cran) jusqu'à ce que le monde passe sur le réticule. Synchronisé, l'image s'aiguise (d'autant plus que ton réglage est déjà bon), l'écran dit **l'heure là-bas** (« Là-bas, c'est l'aube », puis le jour propre de l'Âge divisé comme un yahr D'ni, en chiffres D'ni) et ses coordonnées **KIPS** s'affichent comme sur un KI ; l'onglet Détails dit l'heure aussi, et la plaque des nombres montre KIPS au lieu de « non situé ». Jusque-là, l'heure de l'Âge reste incertaine : le temps se gagne en se situant. La calibration **dérive** : intacte une semaine réelle, elle s'use ensuite pendant une semaine (l'image s'adoucit, l'heure redevient incertaine, le micromètre glisse hors du réticule) ; resynchronise pour la rendre neuve. Si l'étoile de l'Âge est réécrite après la synchro, son onglet Détails dit que « le signal a changé ».

**Étoiles mortes (étape 3 ; leurs pièges dans l'Art de la Guilde seulement).** Certaines régions de l'espace abritent un **pulsar**, une **étoile à neutrons** ou un **trou noir**, que tu les écrives ou non : ils appartiennent à la région (environ une étoile sur dix en ressent un, les étoiles voisines les partagent, et aucun n'est près du Great Zero : tes Âges les plus proches restent faciles à situer). Écrire `pulsar`, `neutron_star` ou `black_hole` ne fait que *décrire* ce qui est là : le livre nomme alors un monde dont l'étoile en a un près d'elle (si l'étoile écrite n'en a pas, le monde est placé près d'une étoile qui en a ; réécrire déplace le monde). Ils apparaissent dans le ciel de la fenêtre générative. Au télescope, ils rendent une étoile difficile à situer : un pulsar ou une étoile à neutrons ajoute un **faux battement** à sa propre période (plus rapide ou plus lent que celui du Zéro) ; le retard de l'arpenteur est faux, et l'écho peut s'accorder sur le faux battement (« L'écho suit le faux battement, pas celui du Zéro ») ; un trou noir **courbe** la lumière du Zéro : la direction de l'arpenteur est fausse, et dans l'oculaire une image brillante ne tient pas, le vrai point étant le bout pâle d'un arc. Les notes de l'arpenteur le disent en mots (« Un second battement, plus rapide, croise celui du Zéro » ; « La lumière du Zéro arrive courbée, étirée en arc ») et, complètes, ajoutent les faux battements pour 25 prorahn et la distance de chaque étoile morte. Une telle étoile se situe tout de même en cherchant au-delà du leurre, ou **indirectement** : dès que deux étoiles situées sont voisines (à moins de 6 000 shahfeetee), tire le levier **Balises** entre les molettes : « Les étoiles situées s'accordent », et la lumière courbée comme le faux battement s'effacent.

**La ligne ancienne (étape 3 ; l'Art de la Guilde seulement).** Avant de trouver le Zéro, un second pouls, plus pâle, peut attirer l'œil, glissant contre l'horloge D'ni : une ancienne ligne d'origine, celle du roi Me'erta, jamais décrétée. Amène-la dans l'anneau et l'instrument s'y cale : sa plaque grave *cette* ligne, et chaque étoile située ensuite tourne du même angle (l'heure là-bas et les KIPS sont faux avec elle). Rien ne le dit tout net, mais cela se voit : sur la **carte des étoiles**, le trait de plomb de chaque étoile manque le Zéro (« ? »), deux étoiles gravées sur des lignes différentes laissent la carte ouverte, les Âges d'un même `system:` ne s'accordent pas avec une étoile regravée, des balises gravées sur des lignes différentes se contredisent, et l'onglet Détails dit que l'étoile « a été gravée sur une ligne ancienne ». Pour corriger : revise le vrai Zéro (l'instrument s'y cale ; la ligne ancienne ne le reprend plus), puis ramène chaque étoile dans l'anneau pour la regraver, ou gratte-la de sa plaque (la petite croix).

**La carte des étoiles (étape 3).** Le rouleau de parchemin en haut à droite de l'observatoire déroule une carte : le Great Zero en rose des vents au centre, ton Relto, et chaque système situé (une constellation, chaque étoile reliée à sa plus proche voisine), avec ses Âges (le premier nom écrit, tous au survol) et ses étoiles mortes en cinabre. Le plan du Zéro est vu de biais, comme une table, et chaque étoile pend à un **fil à plomb** depuis son pied sur le plan : plein au-dessus, pointillé dessous. Le nord est la ligne que tient l'instrument ; les distances vont en racine carrée, pour que voisines et lointaines tiennent sur une feuille, et les hauteurs ont leur propre échelle, gravée dans un coin (à côté des distances, elles seraient invisibles). Un seul Âge bien situé suffit à l'ancrer. Encre sur papier : elle se lit de même en thème clair et sombre.

**Dérive et nord magnétique (étape 3).** La dérive de la calibration dépend de la physique de l'Âge : un monde sans champ magnétique (noyau mort, ou qui tourne à peine) n'a pas de nord ; son arpenteur donne des relèvements grossiers (quatre mots de boussole, ou huit avec un champ faible) et sa calibration s'use deux fois plus vite (1,4 fois avec un champ faible) ; près d'une étoile morte, plus vite encore (× 1,5 près d'un trou noir, × 1,3 près d'un pulsar ou d'une étoile à neutrons ; au plus × 4). L'onglet Détails dit pourquoi.

**À propos des distances.** Les coordonnées sont celles du système de coordonnées du Great Zero, en shahfeetee — mais pour les Âges, ce sont des **shahfeetee de faisceau** : la longueur du trajet que fait le pouls à travers l'Art pour atteindre le Zéro, pas une distance à travers l'espace. C'est l'unité de la Caverne, qui mesure autre chose, si bien qu'elle n'a pas d'équivalent en kilomètres : une valeur de 15 000 veut dire loin dans le faisceau, rien de plus. L'Art relie des mondes d'univers à univers, pas d'un bout du ciel à l'autre ; le Great Zero est le repère de ces liaisons. Pour ces longueurs de faisceau, les instruments emploient le **rahnfee** (pluriel *rahnfeetee*) : la longueur que parcourt le pouls du Great Zero dans le faisceau pendant un **prorahn**, soit 25³ = **15 625 shahfeetee de faisceau**. Il n'y a pas de virgule : chaque place est gravée dans sa petite lucarne, comme sur les cadrans d'un instrument de mesureur — la première lucarne compte les 25ᵉ, la deuxième les 625ᵉ, la troisième les 15 625ᵉ —, si bien que les lucarnes 12 · 12 · 12 se lisent environ un demi-rahnfee (7 812 shahfeetee) ; les instruments le disent aussi en mots (« environ un demi-battement »). Les lucarnes sont une notation propre au plugin, cohérente avec la rigueur des mesureurs D'ni, pas une notation D'ni attestée. Les distances se lisent en rahnfee : la molette du Retard, la ligne de distance des plaques *Great Zero* et *Étoile de l'Âge*, la distance des KIPS, les notes complètes de l'arpenteur et la carte des étoiles ; toutes les élévations restent en shahfeetee, l'échelle de la Caverne et la convention du KI. Aucune étoile n'est à un rahnfee entier du Zéro : au-delà, le pouls se mêlerait au battement suivant du balancier. *Le rahnfee est une unité inventée par des fans, faite de prorahn et de shahfee ; ce n'est pas un mot D'ni attesté.*

### Les deux livres du Relto

Au pied de l'étagère, deux livres d'aspect différent des Âges (aussi dans l'onglet **Pages**, et par commandes) :

- **Livre des glyphes** (turquoise, losange) : un clic ouvre la liste des glyphes *utilisés* dans les Âges de l'étagère, avec leur dessin et les Âges où ils apparaissent (clic = ouvre l'Âge). Pour l'instant « connu » = écrit dans un Âge ; la future boucle de jeu pourra le limiter aux glyphes découverts. Commande : *Open the book of glyphs*.
- **Livre de la bibliothèque** (rouge, fermoir) : un clic propose *Blocs, réactions et variantes d'Âges* (`age-library`) ou *Pages du Relto* (`relto-library`). Le plugin ouvre la note de bibliothèque existante, ou la crée avec un exemple commenté (`Age Library.md`, `Relto Library.md`, dans le dossier de bibliothèque s'il est défini). Tu n'as plus qu'à écrire. Commande : *Open a library note*.

La syntaxe d'une page du Relto accepte `page lagon: …` ou `page_lagon: …` (le second n'était pas reconnu avant, alors que les exemples le montraient).

### La vue globale

Un petit bouton (globe) en haut à gauche de l'image bascule entre la **vue de l'île** (celle d'ouverture) et la **vue globale** : le Relto vu de loin, l'île au centre dans la mer de brume, des pinacles de roche qui en émergent. Les pages y ajoutent leurs éléments : les **îlots** (page *Islets*), le **pont** de cordes qui les relie, le **pinacle du calendrier** (page *Calendar pinnacle*, qui porte le jour D'ni), le ciel (lune, comète, pluie, orage, oiseaux, aurore, neige). Un clic sur l'île (« Your Relto ») ramène à la vue de l'île ; le même bouton (maison) fait aussi le retour.

### Pages du décor, du ciel et de la faune

| Page | Ce qu'elle ajoute |
|---|---|
| *Rain*, *Storm* | pluie ; orage avec éclairs espacés et ciel assombri (`rain`, `storm`, densité 0 à 1) |
| *Birds*, *Butterflies* | oiseaux qui traversent le ciel (le jour surtout) ; papillons qui voltigent autour de l'île |
| *Moon & sun* | une grande lune et sa petite compagne, visibles aussi de jour |
| *Comets* | de temps en temps, une comète traverse lentement le ciel (un passage dure 40 à 60 s), tête blanc bleuté et longue queue douce ; surtout la nuit, à peine visible le jour. Densité de `comet` = fréquence (environ toutes les 8 minutes à 0, environ chaque minute à 1) ; aussi dans la vue globale |
| *Dock* | un ponton dans la brume, à droite de l'île, avec une barque et une lanterne la nuit ; il devient un pont de cordes vers la *Calendar pinnacle*, et un second pont mène à la *D'ni clock* quand elle se dresse dans la brume |
| *Bench* | un banc de bois entre la cabane et l'étagère |
| *Islets* | des îlots flottants derrière l'île (densité = nombre) |
| *Calendar pinnacle* | une pierre dressée sur un îlot, qui affiche le jour D'ni (décalé de quelques yahr tant que l'horloge D'ni ne l'a pas recalé) |
| *D'ni clock* | une sphère armillaire de laiton sur son pilier dans la brume ; débloquée en trouvant le Great Zero, elle apporte l'heure D'ni (voir [Le télescope](#le-télescope)). Un clic la montre de près : quatre anneaux portent le vailee, le yahr, le gahrtahvo et le tahvo, chacun tournant à son rythme avec ses chiffres D'ni gravés, lus sous l'index, en haut ; un chiffre luit un instant quand son unité change ; le socle porte la date et l'heure en chiffres D'ni et le nom du vailee |
| *Blue flowers* | fleurs basses le long du sol (`asset` : blue, red, yellow, white, pink) |
| *Grass* | herbe haute le long du sol |
| *Ponderosa pines*, *Maples*, *Crystal tree* | arbres de fond (`vegetation` avec `asset` ponderosa, maple, crystal) |

Chaque page est un préréglage (« Nouvelle page »), et tous ces effets s'écrivent aussi dans un bloc `relto-library`, par exemple `page pluie: Pluie | rain 0.9, birds 0.4 | audio=soft_rain`.

### Le bassin de koï et le chat

- **Bassin de koï** (page *Koi pond*) : un bassin vu en coupe, à droite de la cabane, avec des carpes qui nagent. Une **koï rare** les accompagne : `koi_rare` dans les propriétés de la note de la page vaut `ogon` (doré), `platinum` ou `ghost` (fantôme). Sans valeur, la variété est tirée d'après la graine du Relto. `koi_name` donne un nom à la koï rare (par défaut « Ogon », « Platinum » ou « Ghost »). Un clic sur la koï (ou sur le chat) affiche son nom un instant.
- **Chat** (page *Cat*) : assis à gauche de la cabane, il cligne des yeux, bat de la queue et dort la nuit. Dans la note de la page, `cat_name` donne son nom (affiché au survol) et `cat_color` sa robe : `black`, `white`, `orange`, `grey`, `cream`, `tabby`, `calico`, `tuxedo`, `siamese`, ou un code `#rrggbb`.
- **Le chat dort au coin du feu.** Le soir et la nuit (plus souvent quand la page *Chimney fire* est allumée, parfois par pluie ou neige), il n'est plus dehors : il dort roulé en boule sur le tapis de la cabane, respire, une oreille frémit. Un clic le fait ronronner (ton fichier *Purr sound file* s'il est réglé). La vue « chat » mène alors à la cabane. Le tirage change toutes les demi-heures, d'après la graine du Relto. `cat_sleep` dans la note de la page (ou `sleep=` dans une ligne de bibliothèque) : `auto` (défaut), `always` (toujours au coin du feu) ou `never` (toujours dehors).
- Dans un bloc `relto-library` : `page chat: Chat | cat color=black name="Petit Loup" sleep=auto` et `page bassin: Bassin | koi 0.8 rare=platinum` (la densité de `koi` règle le nombre de carpes).

Les arbres (pins, bouleaux, palmes) sont grands et dessinés à l'arrière-plan, derrière la cabane, l'étagère, le chat et le bassin, et ils évitent la place exacte du chat, du bassin et des deux livres à part : rien ne les cache.

### Pages intégrées

Pins, bouleaux, palmes, fougères, cascade, lucioles, lanternes, neige, aurore, feux d'artifice, montagne, menhirs, cheminée, brume, et sous l'île : **gemmes, or, argent** (filons et cristaux dans la roche, scintillants). « Nouvelle page » crée une page ; on peut aussi les écrire à la main (une note par page) ou dans un bloc `relto-library` :

````
```relto-library
page lagon: Lagon | vegetation 0.5 palm, gold 0.6 | audio=river | unlock=[[Marais de verre]]:60
```
````

Le choix des livres de l'étagère se fait par les cases à cocher de l'onglet Pages, ou par les options `folders:`, `exclude:`, `books:` du bloc.

---

## 7. Les sons

Tout est synthétisé (Web Audio). Trois gestes, trois sons, chacun réglable séparément :

| Geste | Son | Réglage |
|---|---|---|
| Manipuler le livre (la vue livre s'ouvre) | choc, cuir, pages ; puis 2 à 5 clics de fermoir | *Son du livre*, *Clics du fermoir* |
| Se déplacer dans l'Âge (la note s'ouvre) ou toucher une vitre | son de liaison, onze variantes tirées au hasard | *Son de liaison* |
| Tourner une page du livre de liaison | froissement de papier | *Pages tournées* |

Quand le livre est déjà ouvert, cliquer une vitre ne rejoue que le son de liaison. Les ambiances (Relto, Âge) se lancent avec le bouton ♪ ; niveaux minimal / zen / complet.

---

## 8. Le monde

- **Stabilité** : cinq axes (cosmologique, géologique, météo, écologique, métaphysique) plus l'axe `alteration`. L'Âge prend la stabilité de son axe le plus faible : ≥ 75 % stable, 40–74 % instable, < 40 % mourant.
- **Tirage** : ce que le livre laisse ouvert est tiré, toujours pareil pour la même note. Un livre vague tombe sur un monde stable environ 96 % du temps.
- **Fissure** : environ la moitié des mondes n'en ont pas. Sans livre de retour **et** sans fissure, l'Âge est un piège.
- **Loi du changement** : tant que l'encre est fraîche (15 min par défaut), tu peux retoucher. Ensuite, modifier le monde (ajouter ou retirer une page) l'abîme (0,06 d'instabilité par élément, plafond 0,30), puis il guérit lentement. Espaces, sauts de ligne, casse et renommage ne comptent pas.
- **Ciel étendu** (ceinture et champ d'astéroïdes, anneaux, comète, soleils colorés), **mondes-types** (gelé, lave, désert, océan, jungle), **richesses et cicatrices** (or, argent, gemmes… compensées par des cicatrices jusqu'à 75 %) : voir la référence complète.
- **Météo vivante** : une ligne de météo peut porter une fréquence et des moments du jour, `drizzle: often, dawn` ou `fog: 1/10, night` (`always`, `often`, `sometimes`, `rarely` ou `toujours`, `souvent`, `parfois`, `rarement`, une fraction ou un pourcentage ; `dawn`, `morning`, `noon`, `afternoon`, `dusk`, `night` ou `aube`, `matin`, `midi`, `après-midi`, `soir`, `nuit`). Dans la fenêtre générative, elle vient et s'en va avec le soleil, en fondu ; le tirage dépend de la graine de l'Âge et du jour D'ni (ou du jour de l'Âge avec `day_length:`) : même jour, même temps pour tout le monde. Pour la stabilité, elle compte exactement comme la ligne nue ; un `rain` seul reste de la pluie tout le temps. Nouveaux blocs : `drizzle`, `snow`, `rainbow`, `tornado`, `flowers` ; nouveaux produits : `scented_mist` (fog + flowers), `petal_rain` (wind + flowers), `glaze` (drizzle + deep_cold), `crystal_rain`, `ash_rain`, `acid_rain` (drizzle + crystal / ash / acid).

---

## 9. Fenêtre, effets, pièges

- **Rendu** : `classic` (la fenêtre peinte du moteur) ou `generative` (paysage tiré de la graine : ciel, relief, végétation, météo, reflets, premier plan (choisi selon l'Âge : branche, lianes, roseaux, feuilles, colonne, glaçons, rochers, arche ou rien), un détail habité). Quand un Âge a **de l'eau et de la terre** (sable, pierre ou ruines, plantes, lave, glace), la fenêtre montre un **rivage** : plage, rochers, berge herbeuse et roseaux, côte de lave noire qui fume au contact de l'eau, ou banquise et glaçons ; la rive descend sur un côté, se tient au loin sous l'horizon, ou c'est là que l'on se tient. Forme et cadrage viennent de la graine. `ocean_world` garde la mer ouverte, `desert_world` et `lava_world` restent à sec, `frozen_world` reste gelé. Avec la **couche physique** active (facile ou strict), la fenêtre montre aussi le monde calculé : le soleil prend la couleur de la température de son étoile (une naine rouge luit orange-rouge, une étoile chaude blanc-bleu) et sa taille selon le rayon de l'étoile et la distance ; un air mince assombrit le ciel (étoiles en plein jour quand il n'y en a presque plus, pas de nuages) ; un air épais le rend laiteux et brumeux ; un monde léger a des montagnes hautes et fines, un monde lourd des collines basses et larges ; un monde figé par la marée garde son soleil immobile, à une hauteur qui dépend de l'endroit où l'on se tient ; peu de lumière visible donne un jour terne. Une couleur de soleil écrite passe toujours avant. Trois blocs de plus, jamais tirés au sort : `kelp` (une forêt de varech qui ondule sous l'eau), `coral` (un récif vif dans les eaux chaudes), `acid` (des flaques qui bouillonnent ; il ronge la pierre en sol creux, le fer en rouille, l'eau en eau amère, le corail en sel). **Chaque Âge a sa nuit** : deux à quatre constellations tirées de la graine (certaines reliées d'un trait pâle), parfois une nébuleuse ou une bande d'étoiles, et ses lunes (`companion_moon`, ou `moons: 3` jusqu'à cinq, chacune avec sa taille, sa teinte, sa phase et son pas).
- **Effets** : parasites, ondulation, balayage, vieille télé… selon l'instabilité ; `prefers-reduced-motion` est respecté.
- **Dégâts** : `damaged_pages` (zones décalées, séparation de couleurs, figées, taches d'encre), `removed_pages` (trous brûlés), fractures quand l'instabilité monte. Tirés de la graine du livre.
- **Livre-piège** : `trap book`. Il a l'air normal.
- **Liaisons incertaines** (réglage) : au-delà de 30 % d'instabilité de liaison, la liaison peut vaciller ou glisser vers un autre livre du même Âge.

---

## 10. D'ni, mécanismes, journal

- **Chiffres D'ni** en base 25 (numéro d'Âge, graine, énigmes, horloge). Niveaux : police installée (non fournie), fichier de glyphes local, chiffres dessinés par le plugin. **Heure D'ni** du Relto d'après l'horloge de l'ordinateur.
- **Mécanismes** : onze (ascenseur à vapeur, vanne, télescope, serrure sonore, réseau de fréquences, générateur à vapeur, imageur holofatique, planétaire, porte de marée, orgue à vent, réseau de lentilles ; à ne pas confondre avec la page télescope du Relto), chacun avec un état et une énigme.
- **Solitude** : pondère le tirage vers des mondes déserts.
- **Journal d'exploration** : un bloc `age-journal` qui s'écrit au fil des notes liées ; voix inspirées de divers personnages des jeux.
- **Bibliothèque personnelle** : des blocs `age-library` définissent tes propres blocs, produits, réactions et variantes.

---

## 11. Réglages

Dans l'onglet de réglages du plugin : une carte **Guide** (boutons Guide et Référence) puis sept rubriques, chacune avec icône, description et valeur courante.

| Rubrique | Contenu |
|---|---|
| Livres & couvertures | cuir, onglet couverture, où s'ouvre le livre, ouverture sur la couverture, sobriété des couvertures, livre en 3 pages |
| Sons | sons (général), volume, son du livre, clics du fermoir, pages tournées, son de liaison, ambiance et volume du Relto |
| Fenêtre de liaison | onglets du bloc Âge, rendu, taille, effet, intensité, liaisons incertaines |
| D'ni & chiffres | langue, chiffres, police, nombres, noms en D'ni, heure D'ni, Relto en onglets |
| Âges & mécanismes | loi du changement, encre, guérison, mécanismes, solitude, physique des Âges (facile / strict / désactivée) et sa sévérité, manière des instruments (facile / l'Art de la Guilde) |
| Dossiers | journaux, refuge |
| Tirage & bibliothèque | réglages du moteur : propriétés automatiques, fenêtre dessinée, tirage des cases ouvertes, force du pli, dossier de bibliothèque, image de panneau par défaut |

Défauts notables : cuir et couverture activés ; livre dans un onglet principal, ouvert sur la couverture ; couverture « auto » ; fenêtre grande ; encre 15 min ; guérison 0,05 par jour ; ambiance du Relto zen ; volume 0,35 ; Relto en onglets activé ; instruments en facile.

---

## 12. Guide intégré

Deux niveaux, dans une fenêtre à rubriques, en anglais et en français (exportables en notes) :

- **Guide court** : écrire un Âge, le bloc, le livre, le Relto, les sons, la loi du changement, les réglages ;
- **Référence complète**, en quatre parties : **Réglages** (réglages et commandes), **Ce que tu écris** (les trois sortes de lignes, tous les blocs par axe avec leur coût, les valeurs de physique avec une valeur type et leur sens, quantités, lignes de météo et de fenêtre), **Ce que l'Âge génère seul** (réactions, stabilité, tirage), **Relto** (la note du refuge, les pages, le chat, l'Imageur, le télescope).
---

## 13. Commandes

| Commande | Rôle |
|---|---|
| Open this Age as a book | vue livre |
| Open the Relto · Open the Relto view (large) | refuge dans une note · vue dédiée |
| Create a Relto page | crée une page de refuge |
| Generate a random Age | un monde au hasard, cohérent et stable, en nouvelle note dans le dossier du refuge |
| Open the Age Writer guide · full reference | guide court · référence complète |
| Save this Age's book cover (SVG) | couverture en SVG |
| Create the exploration journal for this Age | journal |
| Save this Age's window as a GIF | export de la fenêtre |
| Generate the Age map (canvas) | carte des Âges liés (bleu = aller-retour, orange = sens unique) |
| Update Age data in this note / in every note | écrit `age_verdict`, `age_stability`, `age_axes`, `age_return`, `age_links`, `age_discovered`, `age_drawn`, `age_home` |
| Create / Reload an Age library · Copy the built-in content | bibliothèque personnelle |
| Stop the soundscape | coupe l'ambiance |
| Forget the Great Zero (aim the telescope again) | le télescope perd le Great Zero (tous les Reltos) : plaque vierge, heure D'ni muette, recherche à refaire |

---

## 14. Limites connues

- **Ordinateur seulement** : le plugin est pensé pour la souris, le son et des canvas animés ; il n'existe pas sur mobile.
- **Surtout testé par machine** : tests automatiques (jsdom, faux `AudioContext`, rendus Chromium, intégration contre le vrai `main.js`) et usage réel dans Obsidian, sur ordinateur et en thème clair d'abord. Le thème sombre et les autres thèmes sont moins testés : signale-moi ce qui cloche.
- **État rangé par nom de note** : la loi du changement lie son état au nom de la note.
- **Plusieurs blocs `age` dans une note** : chaque bloc tire son propre monde.
- **Export GIF** : sans le rendu génératif.
- **Vocabulaire** : les mots « Relto » et « D'ni » viennent de l'univers de Myst, dans l'interface et les clés YAML. Le guide et la référence complète existent en anglais et en français.

---

## 15. La suite

Pour l'instant, c'est le **mode bac à sable** : tu écris des mondes, tu les explores, tu règles l'Imageur et tu aménages ton refuge à ton rythme, sans rien à gagner ni à perdre. Un **mode jeu** arrive bientôt (objectifs, découvertes, conséquences), et **bien d'autres choses encore !** Idées et signalements de bugs sont bienvenus dans les Issues du dépôt.

---

## 16. Développement

Depuis la 1.7.0, **tout le code est lisible** : le moteur d'origine (1.3.0, dont les sources TypeScript étaient perdues) a été dé-minifié, renommé et découpé en modules dans `src/engine/` (`registry`, `rules`, `draw`, `resolve`, `prose`, `glyphs`, `analysis`, `book-view`, `settings-tab`, `plugin`…). Les anciennes retouches par expressions régulières sur du code minifié ont disparu : les points de contact avec l'extension sont de vrais appels à `src/engine/hooks.js`. Le `main.js` 1.3.0 d'origine est conservé tel quel dans `legacy/` (provenance).

Le build produit **deux versions du même code** :
- `dist/` : **lisible** (non minifiée) — pour lire, déboguer, suivre une erreur ;
- `release/` : **minifiée** — celle qu'on installe ou publie.

```sh
npm install          # une fois (jsdom, eslint, esbuild — développement seulement)
npm run build        # src/ → dist/ (lisible) + release/ (minifié)
npm test             # tous les tests, sur la version lisible puis sur la minifiée
npm run lint
npm run equiv -- legacy/main-1.3.0.min.js # non-régression : 600 Âges au hasard, ancien build contre nouveau
node test/visual/make.js            # pages de rendu dans test/visual/out/
npm run zip          # release/age-writer-<version>.zip (plugin) + -src.zip (sources) ; version = package.json
```

Dans `src/` : `main.js` (point d'entrée : assemble moteur + extension), `engine/` (le moteur), puis la couche d'extension : `entry.js` (patchs du livre et des blocs), `ui-extras.js` (panneau et onglets), `ui-relto.js` (Relto, vue dédiée), `relto-render.js` (canvas), `cover.js` (couvertures), `sound.js` (sons), `linkfx.js` et `genscene.js` (fenêtre), `law.js` (loi du changement), `mech.js` (lignes spéciales), `physics/` (physique des Âges : lois, exigences des blocs, tirage sous contraintes, fiche ; conception dans `docs/DESIGN-physique.md`), `geophys.js` (blocs de géophysique), `weather.js` (météo vivante), `relto-imager.js` (l'Imageur), `imager-guild.js` (son livre vierge, l'Art de la Guilde) et `unwritten.js` (les mondes que personne n'a écrits), `telescope.js`, `starsystem.js`, `perturbers.js`, `calibration.js`, `starmap.js`, `relto-telescope.js` et `relto-starmap.js` (le télescope : Great Zero, étoiles des Âges, étoiles mortes, ligne ancienne, calibration de l'Imageur, carte des étoiles), `settings-ui.js` (réglages), `guide.js`, `guide-ref-en.js`, `guide-ref-fr.js` (guide et référence complète), `i18n.js`. Détails : `docs/DEV.md`.

---

## 17. Licences et mentions

- **Licence du projet** : [MIT](LICENSE), © Sébastien Wallachia.
- Le code tiers et ses licences sont listés dans [`NOTICE`](NOTICE) ; les textes de licence sont dans [`LICENSES/`](LICENSES/).
- **gifenc** (MIT, © 2017 Matt DesLauriers) : export GIF, embarqué dans le moteur.
- **Tracery** (© Kate Compton ; paquet npm `tracery-grammar` déclaré ISC, dépôt d'origine sous Apache 2.0) : la grammaire de la prose, embarquée dans le moteur.
- **Police D'ni** : non fournie ; chacun utilise sa copie, selon sa licence.
- Projet de fan, sans lien avec Cyan Worlds ni approbation de leur part.
