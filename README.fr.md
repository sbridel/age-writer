# Age Writer

[English](README.md) · **Français**

Plugin Obsidian, inspiré de Mystcraft et de la série Myst. Tu écris un **Âge** (un monde) dans un bloc `age`, une page par ligne, et le plugin calcule le reste : description, stabilité, fenêtre de liaison peinte et animée, livre à feuilleter avec sa couverture, carte des mondes liés, et un refuge (le **Relto**) où ranger tes Âges. Tout est local : pas de réseau, pas d'IA à l'exécution, tous les sons sont synthétisés et tous les dessins sont procéduraux.

Idée de départ : dans Mystcraft, on ne **crée** pas un monde, on se **lie** à un monde qui existe. Ce que tu écris le décrit ; ce que tu laisses ouvert est tiré au sort, toujours de la même façon pour la même note. Et si tu réécris un monde déjà exploré, tu l'abîmes.

> Projet de fan, sans lien avec Cyan Worlds ni approbation de leur part. Aucune ressource de Myst (police, image, son) n'est fournie.

**Version 1.16.1** : **descriptions réécrites** (fini les « Beyond that… Beyond that… » : les mots de liaison ne se répètent jamais, le ciel se lit dans l'ordre, ce qui ne réagit pas est regroupé, les adjectifs seulement à la première mention) et **reproductibles** (même Âge, même texte à chaque ouverture). Dans le Relto, **le chat dort au coin du feu** : le soir, il est roulé en boule sur le tapis de la cabane (un clic le fait ronronner) ; `cat_sleep: auto | always | never`. Correctif : un rayon d'étagère traînait sur le plancher de la cabane. **1.16.0** : **physique des Âges**. Sous les blocs, chaque Âge reçoit une physique simplifiée (étoile, orbite, planète, chaleur interne, noyau, champ magnétique, air, température, eau, lumière), choisie pour tenir ce que tu as écrit ; l'onglet **Détails** retravaillé la montre : stabilité par axe en barres, chaîne des causes, fiche du monde, ce qui ne tient pas et pourquoi, et des lignes à écrire (`age: 3.5`) qu'un clic écrit dans le bloc. Mode **facile** (par défaut) : la stabilité ne change jamais ; **strict** : ce qui ne tient pas coûte, avec un curseur de sévérité. Nouveaux blocs, jamais tirés au sort : `black_sun` (une naine brune : de la chaleur sans lumière, jour gris, plantes noires), `close_orbit`, `distant_orbit`, `young_world`, `ancient_world`, `heavy_world`, `light_world`, `molten_core`, `dead_core`, `geysers`, `rifts`, `thick_air`, `thin_air`, `subsurface_ocean`. Lignes de valeurs : `mass:`, `age:`, `orbit:`, `insolation:`, `core:`, `atmosphere:`… (alias français acceptés). Les Âges existants gardent leurs pages et leur stabilité en mode facile. **1.15.3** : les incompatibilités des mondes-types avec le temps qu'il fait comptent enfin (`desert_world` + `rain`, `frozen_world` + `heat`… ne coûtaient rien à cause d'un nom d'axe erroné), et **toutes** les incompatibilités ciel ↔ matière comptent, plus seulement une par monde-type. Les pages tirées ne changent pas, seule la stabilité change (environ un Âge sur neuf, souvent de quelques points). **1.15.2** : feu de la cabane : les gros « pop » étaient une note qui descend (d'où le « ploc ploc ») ; ce sont maintenant de simples claquements de bruit, sans hauteur. **1.15.1** : feu de la cabane : plus de souffle d'air permanent, grondement très léger, ce sont surtout les craquements du bois. **1.15.0** : la **cabane** joue un **feu qui crépite** (grondement doux, souffle, crépitements en rafale et gros « pop » de bûche) quand la page *cheminée* est active ; réglage facultatif « Fichier son de la cheminée » pour utiliser un vrai enregistrement ; âtre froid = silence. **1.14.4** : un fichier de miaulements qui contient **plusieurs miaulements** est maintenant découpé aux silences : un seul est joué à chaque fois, jamais deux fois de suite le même, à vitesse légèrement variable. **1.14.3** : les sons du bassin, du ronron et du miaou peuvent venir de **vrais enregistrements** de ton coffre (Réglages > Son > Relto : « Fichier son du bassin / du ronronnement / du miaou » ; ogg, mp3 ou wav ; vide = son synthétisé). Les fichiers ne sont pas fournis avec le plugin : prends des sons libres de droits (CC0 ou licence qui t'autorise l'usage, vérifie la page de chaque son). **1.14.2** : les **aurores boréales** ne sont visibles que la nuit, dans le Relto (île et vue globale) comme dans les Âges (elles se lèvent au crépuscule et disparaissent à l'aube). **1.14.1** : sons des vues rapprochées refaits (clapotis très léger au bassin, ronronnement plus doux, miaou plus naturel avec parfois un court « mrrp ») ; les jouets du chat sont au tout premier plan, sans herbe par-dessus. **1.14.0** : deux nouvelles pages : **page_cat_toys** (jouets du chat dans la vue du chat : pelote qui roule, souris qui couine, balle à grelot, canne à plumes, boîte en carton) et **page_pond_decor** (vue **« Le bassin, de près »** : le bassin presque plein cadre avec nénuphars et fleurs, lanterne de pierre, tuyau de bambou dont l'eau goutte, roseaux, galets et algues, libellules le jour, lucioles le soir ; elle demande la page koï). **1.13.1** : **motifs de koï générés** (variétés kohaku, sanke, showa, tancho, asagi, orange, yamabuki ; taches tirées au hasard, déterministes avec la graine du Relto) ; **sons des vues rapprochées** synthétisés : eau qui coule au bassin, chat qui ronronne et miaule (un clic sur le chat le fait miauler), réglage « Sons des vues rapprochées » ; le ruisseau de la vue du bassin naît maintenant d'une encoche dans la falaise, longe la paroi et coule jusqu'au bassin. **1.13.0** : **plan de l'île** (cabane, bassin, piliers de liaison, chat, arbre à tiges, banc, pierres dressées sont placés côte à côte sans se chevaucher ; si tout ne tient pas, les moins importants restent pour les sous-vues) ; **boutons de navigation** dans la bande du haut (île, vue globale, cabane, piliers, bosquet, bassin, chat) ; nouvelles vues rapprochées **bassin** (avec le ruisseau), **chat** (son nom, un clic) et **bosquet** ; le **mont** est plus grand et porte la source d'un **ruisseau** qui descend jusqu'au bassin puis tombe de l'île ; page **page_stalk_tree** (un arbre à tiges, un seul) ; les **lanternes** deviennent volantes. **1.12.0** : premières **sous-vues point-and-click** : un clic sur la cabane ouvre son **intérieur** (cheminée, étagère des Âges en grand, livre des glyphes et livre de la bibliothèque sur la table, porte pour ressortir) et un clic sur les piliers ouvre la **vue des piliers de liaison** (la fenêtre de liaison s'allume quand des Âges y reviennent) ; le bouton de la bande du haut ramène à l'île. Quand la cabane existe, l'étagère et les gros livres ne sont plus sur l'île (plus de place pour les arbres). **1.11.1** : infobulles du Relto toujours entières (recadrées dans l'image) ; quand la page *pinacle du calendrier* est active, le ponton devient un **pont** vers le pinacle ; les **arbres** se répartissent entre les essences choisies (budget partagé, étalés sur l'île) ; le bouton de **vue globale** est dans la bande du haut, avec les onglets ; l'île est élargie à gauche et l'îlot du fond éloigné. **1.11.0** : une **vue globale** du Relto (bouton en coin de l'image : le Relto vu de loin, au milieu de la mer de brume, avec ses pinacles, ses îlots et un pont ; un clic sur l'île ramène à la vue de l'île, qui reste l'ouverture par défaut) et **14 nouvelles pages** : pluie, orage, oiseaux, papillons, lune et soleil, ponton, banc, îlots, pinacle du calendrier, fleurs bleues, herbe, pins ponderosa, érables, arbre de cristal. (1.10 : bassin de koï et chat ; 1.9 : deux livres à part ; 1.8 : quantité de hasard.) Le moteur (issu du 1.3.0) est en sources lisibles dans `src/engine/`. Le `manifest.json` annonce `1.16.1`.

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

- **Rendu** : `classic` (la fenêtre peinte du moteur) ou `generative` (paysage tiré de la graine : ciel, relief, végétation, météo, reflets, premier plan, un détail habité).
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
- Le monde est entièrement sur l'eau ou entièrement à sec : pas de rivage.
- Le rendu génératif ne s'applique pas à l'export GIF.
- Le contenu du moteur est en anglais ; la référence complète est en français seulement.
- Le vocabulaire « Relto », « D'ni » apparaît dans l'interface et les clés YAML.

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

À compléter avant publication :

- **Licence du projet** : à choisir (fichier `LICENSE`).
- **gifenc** (MIT, © Matt DesLauriers) : export GIF, embarqué dans le moteur.
- **Tracery** (`tracery-grammar`, ISC, © Kate Compton) : prose, embarquée dans le moteur d'origine ; texte de licence à joindre ou remplacement.
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
