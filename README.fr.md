# Age Writer

[English](README.md) · **Français**

Plugin Obsidian, inspiré de Mystcraft et de la série Myst. Tu écris un **Âge** (un monde) dans un bloc `age`, une page par ligne, et le plugin calcule le reste : description, stabilité, fenêtre de liaison peinte et animée, livre à feuilleter avec sa couverture, carte des mondes liés, et un refuge (le **Relto**) où ranger tes Âges. Tout est local : pas de réseau, pas d'IA à l'exécution, tous les sons sont synthétisés et tous les dessins sont procéduraux.

Idée de départ : dans Mystcraft, on ne **crée** pas un monde, on se **lie** à un monde qui existe. Ce que tu écris le décrit ; ce que tu laisses ouvert est tiré au sort, toujours de la même façon pour la même note. Et si tu réécris un monde déjà exploré, tu l'abîmes.

> Projet de fan, sans lien avec Cyan Worlds ni approbation de leur part. Aucune ressource de Myst (police, image, son) n'est fournie.
>
> Un hommage : les noms empruntés à l'univers de Myst (Âge, Relto, D'ni, livre de liaison, Livre descriptif…) sont un clin d'œil et une source d'inspiration, pas une reproduction. Le code, les images, les sons et les textes sont originaux. Licence : MIT.

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

**Version 1.17.0** : **l'Imageur**, une machine du Relto (page *Imager*) : on pose le livre d'un Âge sur le lutrin et on l'accorde en trois réglages (I cristaux : les pages écrites de l'Âge ; II lentilles : la lumière de son étoile ; III atmosphère : son ciel, calculé par sa physique, avec une phase qui dérive avec l'horloge) jusqu'à ce qu'il apparaisse sur l'écran ; une fois **verrouillé**, il suit l'Âge, et un périscope tourne, lève les yeux au zénith ou descend **sous l'eau**. Indices dans l'onglet Détails de chaque Âge. **1.16.1** : **rivages** dans la fenêtre générative : l'eau et la terre d'un même Âge se rencontrent enfin (plage, rochers, berge herbeuse, côte de lave qui fume, banquise), avec un cadrage propre à chaque Âge. **Premiers plans** choisis selon l'Âge et générés depuis sa graine : une branche qui pousse autrement dans chaque Âge (feuillue, aiguilles, nue, en fleurs, mousse pendante, enneigée, calcinée), des lianes, des roseaux et massettes au bord de l'eau, de grandes feuilles, une colonne brisée, des stalactites de glace, des rochers, une arche, ou rien. **Descriptions réécrites** (fini les « Beyond that… Beyond that… » : les mots de liaison ne se répètent jamais, le ciel se lit dans l'ordre, ce qui ne réagit pas est regroupé, les adjectifs seulement à la première mention) et **reproductibles** (même Âge, même texte à chaque ouverture). Dans le Relto, **le chat dort au coin du feu** : le soir, il est roulé en boule sur le tapis de la cabane (un clic le fait ronronner) ; `cat_sleep: auto | always | never`. Correctif : un rayon d'étagère traînait sur le plancher de la cabane. **1.16.0** : **physique des Âges**. Sous les blocs, chaque Âge reçoit une physique simplifiée (étoile, orbite, planète, chaleur interne, noyau, champ magnétique, air, température, eau, lumière), choisie pour tenir ce que tu as écrit ; l'onglet **Détails** retravaillé la montre : stabilité par axe en barres, chaîne des causes, fiche du monde, ce qui ne tient pas et pourquoi, et des lignes à écrire (`age: 3.5`) qu'un clic écrit dans le bloc. Mode **facile** (par défaut) : la stabilité ne change jamais ; **strict** : ce qui ne tient pas coûte, avec un curseur de sévérité. Nouveaux blocs, jamais tirés au sort : `black_sun` (une naine brune : de la chaleur sans lumière, jour gris, plantes noires), `close_orbit`, `distant_orbit`, `young_world`, `ancient_world`, `heavy_world`, `light_world`, `molten_core`, `dead_core`, `geysers`, `rifts`, `thick_air`, `thin_air`, `subsurface_ocean`. Lignes de valeurs : `mass:`, `age:`, `orbit:`, `insolation:`, `core:`, `atmosphere:`… (alias français acceptés). Les Âges existants gardent leurs pages et leur stabilité en mode facile. **1.15.3** : les incompatibilités des mondes-types avec le temps qu'il fait comptent enfin (`desert_world` + `rain`, `frozen_world` + `heat`… ne coûtaient rien à cause d'un nom d'axe erroné), et **toutes** les incompatibilités ciel ↔ matière comptent, plus seulement une par monde-type. Les pages tirées ne changent pas, seule la stabilité change (environ un Âge sur neuf, souvent de quelques points). **1.15.2** : feu de la cabane : les gros « pop » étaient une note qui descend (d'où le « ploc ploc ») ; ce sont maintenant de simples claquements de bruit, sans hauteur. **1.15.1** : feu de la cabane : plus de souffle d'air permanent, grondement très léger, ce sont surtout les craquements du bois. **1.15.0** : la **cabane** joue un **feu qui crépite** (grondement doux, souffle, crépitements en rafale et gros « pop » de bûche) quand la page *cheminée* est active ; réglage facultatif « Fichier son de la cheminée » pour utiliser un vrai enregistrement ; âtre froid = silence. **1.14.4** : un fichier de miaulements qui contient **plusieurs miaulements** est maintenant découpé aux silences : un seul est joué à chaque fois, jamais deux fois de suite le même, à vitesse légèrement variable. **1.14.3** : les sons du bassin, du ronron et du miaou peuvent venir de **vrais enregistrements** de ton coffre (Réglages > Son > Relto : « Fichier son du bassin / du ronronnement / du miaou » ; ogg, mp3 ou wav ; vide = son synthétisé). Les fichiers ne sont pas fournis avec le plugin : prends des sons libres de droits (CC0 ou licence qui t'autorise l'usage, vérifie la page de chaque son). **1.14.2** : les **aurores boréales** ne sont visibles que la nuit, dans le Relto (île et vue globale) comme dans les Âges (elles se lèvent au crépuscule et disparaissent à l'aube). **1.14.1** : sons des vues rapprochées refaits (clapotis très léger au bassin, ronronnement plus doux, miaou plus naturel avec parfois un court « mrrp ») ; les jouets du chat sont au tout premier plan, sans herbe par-dessus. **1.14.0** : deux nouvelles pages : **page_cat_toys** (jouets du chat dans la vue du chat : pelote qui roule, souris qui couine, balle à grelot, canne à plumes, boîte en carton) et **page_pond_decor** (vue **« Le bassin, de près »** : le bassin presque plein cadre avec nénuphars et fleurs, lanterne de pierre, tuyau de bambou dont l'eau goutte, roseaux, galets et algues, libellules le jour, lucioles le soir ; elle demande la page koï). **1.13.1** : **motifs de koï générés** (variétés kohaku, sanke, showa, tancho, asagi, orange, yamabuki ; taches tirées au hasard, déterministes avec la graine du Relto) ; **sons des vues rapprochées** synthétisés : eau qui coule au bassin, chat qui ronronne et miaule (un clic sur le chat le fait miauler), réglage « Sons des vues rapprochées » ; le ruisseau de la vue du bassin naît maintenant d'une encoche dans la falaise, longe la paroi et coule jusqu'au bassin. **1.13.0** : **plan de l'île** (cabane, bassin, piliers de liaison, chat, arbre à tiges, banc, pierres dressées sont placés côte à côte sans se chevaucher ; si tout ne tient pas, les moins importants restent pour les sous-vues) ; **boutons de navigation** dans la bande du haut (île, vue globale, cabane, piliers, bosquet, bassin, chat) ; nouvelles vues rapprochées **bassin** (avec le ruisseau), **chat** (son nom, un clic) et **bosquet** ; le **mont** est plus grand et porte la source d'un **ruisseau** qui descend jusqu'au bassin puis tombe de l'île ; page **page_stalk_tree** (un arbre à tiges, un seul) ; les **lanternes** deviennent volantes. **1.12.0** : premières **sous-vues point-and-click** : un clic sur la cabane ouvre son **intérieur** (cheminée, étagère des Âges en grand, livre des glyphes et livre de la bibliothèque sur la table, porte pour ressortir) et un clic sur les piliers ouvre la **vue des piliers de liaison** (la fenêtre de liaison s'allume quand des Âges y reviennent) ; le bouton de la bande du haut ramène à l'île. Quand la cabane existe, l'étagère et les gros livres ne sont plus sur l'île (plus de place pour les arbres). **1.11.1** : infobulles du Relto toujours entières (recadrées dans l'image) ; quand la page *pinacle du calendrier* est active, le ponton devient un **pont** vers le pinacle ; les **arbres** se répartissent entre les essences choisies (budget partagé, étalés sur l'île) ; le bouton de **vue globale** est dans la bande du haut, avec les onglets ; l'île est élargie à gauche et l'îlot du fond éloigné. **1.11.0** : une **vue globale** du Relto (bouton en coin de l'image : le Relto vu de loin, au milieu de la mer de brume, avec ses pinacles, ses îlots et un pont ; un clic sur l'île ramène à la vue de l'île, qui reste l'ouverture par défaut) et **14 nouvelles pages** : pluie, orage, oiseaux, papillons, lune et soleil, ponton, banc, îlots, pinacle du calendrier, fleurs bleues, herbe, pins ponderosa, érables, arbre de cristal. (1.10 : bassin de koï et chat ; 1.9 : deux livres à part ; 1.8 : quantité de hasard.) Le moteur (issu du 1.3.0) est en sources lisibles dans `src/engine/`. Le `manifest.json` annonce `1.17.0`.

---

## Sommaire

1. [Installation](#1-installation)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Écrire un Âge](#3-écrire-un-âge)
4. [Le bloc Âge : trois onglets](#4-le-bloc-âge--trois-onglets)
5. [Le livre](#5-le-livre)
6. [Le Relto](#6-le-relto)
7. [Les sons](#7-les-sons)
8. [Le monde : stabilité, tirage, loi du changement](#8-le-monde)
9. [Fenêtre, effets, pièges](#9-fenêtre-effets-pièges)
10. [D'ni, mécanismes, journal](#10-dni-mécanismes-journal)
11. [Réglages](#11-réglages)
12. [Guide intégré](#12-guide-intégré)
13. [Commandes](#13-commandes)
14. [Limites connues](#14-limites-connues)
15. [Développement](#15-développement)
16. [Licences](#16-licences-et-mentions)
17. [Historique des changements récents](#17-changements-récents)

---

## 1. Installation

Manuelle, pour l'instant :

1. Récupérer `main.js`, `styles.css`, `manifest.json`.
2. Les copier dans `<coffre>/.obsidian/plugins/age-writer/`.
3. Dans Obsidian : *Réglages → Plugins communautaires*, recharger, activer **Age Writer**.

Les réglages de l'extension sont dans l'onglet de réglages du plugin, sous le titre « Extensions ». La langue de l'interface suit celle d'Obsidian (anglais ou français). Le contenu du moteur (noms de blocs, descriptions générées) est en anglais.

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
4. Commande **Create a Relto page**, puis un bloc `relto` dans une note : ton refuge, avec tes Âges sur l'étagère.
   Ou **Generate a random Age** pour un monde tout fait ; la note *Age Writer — Bienvenue*, créée au premier lancement, est un exemple commenté.
5. Si tu te perds : commande **Open the Age Writer guide** (guide court) ou **Open the Age Writer full reference**.

---

## 3. Écrire un Âge

Un bloc de code `age`, une page par ligne (un identifiant de bloc), plus des lignes spéciales.

| Ligne | Effet |
|---|---|
| `link: [[Note]]` | livre de liaison vers un autre Âge (plusieurs permis) |
| `return: [[Note]]` | livre de retour |
| `panel: [[image]]` | image de fenêtre à toi |
| `seed: 42` | change le tirage (même note + même graine = même monde) |
| `cover: sober` | sobriété de la couverture : `ornate`, `classic`, `sober`, `plain`, ou 0 à 1 |
| `window_style: generative` | rendu de la fenêtre (`generative` ou `classic`) |
| `window_size: xl` / `window_width: 520` | taille de la fenêtre |
| `fx: tv` | effet de fenêtre : `classic`, `static`, `ripple`, `sweep`, `tv`, `random`, `off` |
| `day_length: 40`, `year_length: 12` | durée du jour (minutes réelles) et de l'année (jours), rendu génératif |
| `moons: 3` (ou `lunes: 3`) | nombre de lunes dans la fenêtre générative (0 à 5 ; `companion_moon` en donne une) |
| `many: ruins` / `few: rain` / `normal: water` | quantités |
| `mechanism: orrery` | mécanisme de l'Âge |
| `trap book` | livre-piège (ni retour ni fissure) |
| `damaged_pages = 2`, `removed_pages = 1` | livre de liaison abîmé |

Les lignes spéciales sont ignorées par le moteur : elles ne comptent pas comme des pages. La liste complète des blocs (92 identifiants, par axe) et de tous les alias est dans la **référence complète** intégrée au plugin.

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
- **II. Banc optique** — la couleur de la **lumière de l'étoile** : un verre rouge, un vert, un bleu **coulissent sur leurs rails** (un clic où on les veut, de 0 à 24), et un **iris** à lamelles, avec son levier sur un arc, réglé sur la lumière que reçoit le monde (une étoile proche et vive le ferme, une lointaine l'ouvre). Un **comparateur** montre à gauche la lumière de l'étoile, à droite ton faisceau. Des verres faux **teintent** l'image.
- **III. Régulateur** — le **ciel** de l'Âge : inverseur de polarité et quatre boutons (fréquence, amplitude, harmoniques, phase), un **tube cathodique** avec la trace large et pâle du ciel et la tienne, vive, un voltmètre. La fréquence vient de la **durée du jour**, l'amplitude de la **pression de l'air**, les harmoniques des **aurores et du champ magnétique**, la polarité du sens du champ. La **phase dérive** avec l'horloge, au rythme du jour de l'Âge (un monde figé par la marée ne dérive presque pas). Désaccordé, l'écran n'est que **neige**.

**Le verrou.** À droite, un grand levier sous une lampe : rouge, ambre quand l'image est assez nette, verte quand il tient. Tiré sur une image nette, la machine **suit l'Âge toute seule** (la phase qui dérive, les sauts d'un cycle erratique) ; les commandes sont alors tenues, et le livre porte une petite étiquette de laiton sur l'étagère de la cabane. On le relâche en le tirant de nouveau.

**Le périscope.** Verrouillé, la manivelle à gauche de l'écran **tourne la vue** (quatre directions, chacune son paysage sous le même ciel ; la rose montre où l'on regarde) et le levier à droite l'**incline** : vers le **zénith** (tout le ciel, ses étoiles, ses lunes, ses aurores, la canopée s'il y a des arbres), à l'horizon, ou **sous l'eau** quand l'Âge en a (rayons de lumière, varech, corail, poissons, ruines englouties, creux d'acide, cheminées de lave, perles, et la lueur d'une **fissure** sous-marine : la voie du retour ; sous la glace s'il gèle). La vue glisse quand on tourne.

Les valeurs s'affichent en chiffres D'ni. La **jauge de netteté** lit les trois réglages ensemble, et les **battements** du bourdon ralentissent à mesure que l'atmosphère s'accorde ; une quinte cristalline sonne quand l'image entière tient ; verre, rails, manivelle et verrou ont chacun leur bruit. Les indices restent dans la fiction : l'onglet **Détails** de chaque Âge porte une note d'arpenteur (comment son ciel bourdonne, à quoi ressemble la lumière de son étoile, et les valeurs fixes en chiffres D'ni) ; la phase n'est jamais écrite, et les cristaux sont les pages mêmes du livre. Ton réglage, le verrou et le périscope sont gardés pour chaque Âge.

### Les deux livres du Relto

Au pied de l'étagère, deux livres d'aspect différent des Âges (aussi dans l'onglet **Pages**, et par commandes) :

- **Livre des glyphes** (turquoise, losange) : un clic ouvre la liste des glyphes *utilisés* dans les Âges de l'étagère, avec leur dessin et les Âges où ils apparaissent (clic = ouvre l'Âge). Pour l'instant « connu » = écrit dans un Âge ; la future boucle de jeu pourra le limiter aux glyphes découverts. Commande : *Open the book of glyphs*.
- **Livre de la bibliothèque** (rouge, fermoir) : un clic propose *Blocs, réactions et variantes d'Âges* (`age-library`) ou *Pages du Relto* (`relto-library`). Le plugin ouvre la note de bibliothèque existante, ou la crée avec un exemple commenté (`Age Library.md`, `Relto Library.md`, dans le dossier de bibliothèque s'il est défini). Tu n'as plus qu'à écrire. Commande : *Open a library note*.

La syntaxe d'une page du Relto accepte `page lagon: …` ou `page_lagon: …` (le second n'était pas reconnu avant, alors que les exemples le montraient).

### La vue globale

Un petit bouton (globe) en haut à gauche de l'image bascule entre la **vue de l'île** (celle d'ouverture) et la **vue globale** : le Relto vu de loin, l'île au centre dans la mer de brume, des pinacles de roche qui en émergent. Les pages y ajoutent leurs éléments : les **îlots** (page *Islets*), le **pont** de cordes qui les relie, le **pinacle du calendrier** (page *Calendar pinnacle*, qui porte le jour D'ni), le ciel (lune, pluie, orage, oiseaux, aurore, neige). Un clic sur l'île (« Your Relto ») ramène à la vue de l'île ; le même bouton (maison) fait aussi le retour.

### Pages du décor, du ciel et de la faune (1.11)

| Page | Ce qu'elle ajoute |
|---|---|
| *Rain*, *Storm* | pluie ; orage avec éclairs espacés et ciel assombri (`rain`, `storm`, densité 0 à 1) |
| *Birds*, *Butterflies* | oiseaux qui traversent le ciel (le jour surtout) ; papillons qui voltigent autour de l'île |
| *Moon & sun* | une grande lune et sa petite compagne, visibles aussi de jour |
| *Dock* | un ponton dans la brume, à droite de l'île, avec une barque et une lanterne la nuit |
| *Bench* | un banc de bois entre la cabane et l'étagère |
| *Islets* | des îlots flottants derrière l'île (densité = nombre) |
| *Calendar pinnacle* | une pierre dressée sur un îlot, qui affiche le jour D'ni |
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
- **Mécanismes** : onze (ascenseur à vapeur, vanne, télescope, serrure sonore, réseau de fréquences, générateur, imageur holofatique, planétaire, écluse, orgue à vent, réseau de lentilles), chacun avec un état et une énigme.
- **Solitude** : pondère le tirage vers des mondes déserts.
- **Journal d'exploration** : un bloc `age-journal` qui s'écrit au fil des notes liées ; voix Atrus, Gehn ou Miller.
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
| Âges & mécanismes | loi du changement, encre, guérison, mécanismes, solitude, physique des Âges (facile / strict / désactivée) et sa sévérité |
| Dossiers | journaux, refuge |
| Tirage & bibliothèque | réglages du moteur : propriétés automatiques, fenêtre dessinée, tirage des cases ouvertes, force du pli, dossier de bibliothèque, image de panneau par défaut |

Défauts notables : cuir et couverture activés ; livre dans un onglet principal, ouvert sur la couverture ; couverture « auto » ; fenêtre grande ; encre 15 min ; guérison 0,05 par jour ; ambiance du Relto zen ; volume 0,35 ; Relto en onglets activé.

---

## 12. Guide intégré

Deux niveaux, dans une fenêtre à rubriques (et exportables en notes) :

- **Guide court** : écrire un Âge, le bloc, le livre, le Relto, les sons, la loi du changement, les réglages ;
- **Référence complète** (en français) : toutes les lignes et leurs alias, les 92 blocs par axe, ciel étendu, quantités, stabilité, fenêtre, pièges, Relto (note YAML, pages, options), D'ni, mécanismes, journal, sons, bibliothèque, tous les réglages, commandes, propriétés, limites.

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

---

## 14. Limites connues

- **Obsidian réel** : le plugin est testé par des tests automatiques (jsdom, faux AudioContext, rendus Chromium, intégration contre le vrai `main.js`), mais pas systématiquement dans Obsidian lui-même. Mobile et thème clair ne sont pas testés.
- Les réglages utilisent les composants classiques d'Obsidian, avec une navigation à rubriques faite à la main (pas l'API de réglages récente).
- La loi du changement range son état par **nom de note**.
- Une note à plusieurs blocs `age` : chaque bloc tire son propre monde.
- Le rendu génératif ne s'applique pas à l'export GIF.
- Le contenu du moteur est en anglais ; la référence complète est en français seulement.
- Le vocabulaire « Relto », « D'ni » apparaît dans l'interface et les clés YAML.

---

## La suite

Pour l'instant, c'est le **mode bac à sable** : tu écris des mondes, tu les explores, tu règles l'Imageur et tu aménages ton refuge à ton rythme, sans rien à gagner ni à perdre. Un **mode jeu** arrive bientôt (objectifs, découvertes, conséquences), et **bien d'autres choses encore !** Idées et signalements de bugs sont bienvenus dans les Issues du dépôt.

---

## 15. Développement

Depuis la 1.7.0, **tout le code est lisible** : le moteur d'origine (1.3.0, dont les sources TypeScript étaient perdues) a été dé-minifié, renommé et découpé en modules dans `src/engine/` (`registry`, `rules`, `draw`, `resolve`, `prose`, `glyphs`, `analysis`, `book-view`, `settings-tab`, `plugin`…). Les anciennes retouches par expressions régulières sur du code minifié ont disparu : les points de contact avec l'extension sont de vrais appels à `src/engine/hooks.js`. Le `main.js` 1.3.0 d'origine est conservé tel quel dans `legacy/` (provenance).

Le build produit **deux versions du même code** :
- `dist/` : **lisible** (non minifiée) — pour lire, déboguer, suivre une erreur ;
- `release/` : **minifiée** — celle qu'on installe ou publie.

```sh
npm install          # une fois (jsdom, eslint, esbuild — développement seulement)
npm run build        # src/ → dist/ (lisible) + release/ (minifié)
npm test             # tous les tests, sur la version lisible puis sur la minifiée
npm run lint
npm run equiv -- <ancien main.js>   # non-régression : 600 Âges au hasard, ancien build contre nouveau
node test/visual/make.js            # pages de rendu dans test/visual/out/
npm run zip          # release/age-writer-<v>.zip (plugin) + -src.zip (sources)
```

Dans `src/` : `main.js` (point d'entrée : assemble moteur + extension), `engine/` (le moteur), puis la couche d'extension : `entry.js` (patchs du livre et des blocs), `ui-extras.js` (panneau et onglets), `ui-relto.js` (Relto, vue dédiée), `relto-render.js` (canvas), `cover.js` (couvertures), `sound.js` (sons), `linkfx.js` et `genscene.js` (fenêtre), `law.js` (loi du changement), `mech.js` (lignes spéciales), `physics/` (physique des Âges : lois, exigences des blocs, tirage sous contraintes, fiche ; conception dans `docs/DESIGN-physique.md`), `geophys.js` (blocs de géophysique), `settings-ui.js` (réglages), `guide.js` (guide), `i18n.js`. Détails : `docs/DEV.md`.

---

## 16. Licences et mentions

- **Licence du projet** : [MIT](LICENSE), © Sébastien Wallachia.
- Le code tiers et ses licences sont listés dans [`NOTICE`](NOTICE) ; les textes de licence sont dans [`LICENSES/`](LICENSES/).
- **gifenc** (MIT, © 2017 Matt DesLauriers) : export GIF, embarqué dans le moteur.
- **Tracery** (© Kate Compton ; paquet npm `tracery-grammar` déclaré ISC, dépôt d'origine sous Apache 2.0) : la grammaire de la prose, embarquée dans le moteur.
- **Police D'ni** : non fournie ; chacun utilise sa copie, selon sa licence.
- Projet de fan, sans lien avec Cyan Worlds ni approbation de leur part.

---

## 17. Changements récents

- Relto : onglets Vue / Pages / Réglages, heure en grand qui se cache et s'efface, nom D'ni en bandeau, vue dédiée et plein écran, pages gemmes / or / argent, graine retirée du roc, son qui continue d'un onglet à l'autre.
- Livre : ouverture sur la couverture, couvertures procédurales à sobriété réglable, linking book en trois pages à tourner (clic droite/gauche), livre ouvert dans un onglet principal, plus petit et plus haut.
- Sons : trois réglages séparés (livre, fermoir, liaison) + pages tournées ; seul le son de liaison joue quand on clique une vitre depuis le livre ; onze variantes de liaison.
- Bloc Âge : trois onglets, petite fenêtre centrée, grande fenêtre cliquable.
- Loi du changement : espaces, sauts de ligne, casse n'altèrent plus l'Âge.
- Piège : « trap book » ne dessine plus de fissure sous-marine à l'insu du texte.
- Réglages : rubriques avec icônes et valeurs ; guide court et référence complète intégrés.
