# Guide du développeur — Age Writer

## Le principe

Depuis la 1.7.0 il n'y a plus de patch sur du code minifié. Le moteur d'origine (Age Writer 1.3.0) a été
dé-minifié une fois pour toutes : ses sources lisibles sont dans `src/engine/`, avec des noms explicites.
`src/main.js` assemble le moteur et la couche d'extension ; `build.js` empaquette le tout (`tools/bundle.js`).

```
src/**/*.js ──tools/bundle.js──► main.js unique ──┬─► dist/main.js     (lisible)
src/styles.css + src/styles.ext.css ──────────────┼─► dist/styles.css
manifest.json + version de package.json ──────────┴─► dist/manifest.json
                                  esbuild (minify) ──► release/main.js (+ les deux autres fichiers)
```

`legacy/main-1.3.0.min.js` : le `main.js` minifié d'origine, gardé pour mémoire (jamais utilisé par le build).

### Le moteur (`src/engine/`)

| Module | Rôle |
|---|---|
| `data/sky.js`, `data/matter.js` | contenu du moteur : blocs de ciel ; blocs, réactions et variantes de matière (géologie, flore, faune, ruines, météo, fissures) |
| `registry.js` | registre des blocs/réactions (intégrés + bibliothèque de l'utilisateur), `reactMatter` |
| `library.js` | lecture/écriture des blocs `age-library` |
| `rules.js` | contradictions ciel ↔ vivant ↔ matière |
| `draw.js` | tirage des pages laissées ouvertes (poids, pénalité de conflit) |
| `resolve.js` | lecture d'un bloc `age` ligne par ligne (`resolveAge`) |
| `analysis.js` | verdict et stabilité par axe (`analyseAge`), liste des pages, données du frontmatter |
| `prose.js` | texte de description (Tracery) |
| `glyphs.js` | les glyphes SVG et leurs tremblements |
| `scene.js`, `gif.js` | fenêtre de liaison d'origine et export GIF |
| `age-text.js` | édition du texte d'un bloc `age` (ajouter/retirer une ligne, `seed:`, `panel:`) |
| `age-map.js` | génération de la carte (canvas) |
| `book-view.js`, `settings-tab.js`, `plugin.js` | la vue livre, l'onglet de réglages d'origine, la classe du plugin |
| `hooks.js` | **les points d'accroche** de l'extension (voir ci-dessous) |
| `vendor/` | gifenc (MIT) et Tracery, repris tels quels |

### Les points d'accroche (`src/engine/hooks.js`)

| Hook | Appelé par | Utilisé pour |
|---|---|---|
| `hooks.adjust(résultat, options, texte)` | `analyseAge` | loi du changement, `trap book`, `damaged_pages`, quantités |
| `hooks.w(slot, option)` | `draw.js` | solitude (poids des options du tirage) |
| `hooks.written(ensemble)` | `resolve.js` | livre-piège : la fissure est « répondue » avant le tirage |
| `hooks.skip(ligne)` | `resolve.js`, `age-text.js` | lignes de l'extension (`mechanism:`, `fx:`, `trap book`…) : ni symbole inconnu, ni page |
| `hooks.norm(ligne)` | `resolve.js`, `age-text.js` | météo vivante : `rain: sometimes, dawn` est lue comme `rain` (src/weather.js) |

Les valeurs par défaut rendent le moteur identique à la 1.3.0 ; `src/entry.js` les remplace au démarrage.
L'extension reçoit en plus `core` (`src/main.js`) = `{ analyse, extract, base, glyphSvg, prose, glyphs, blocks, BookView, SettingsTab }`.
Le ciel étendu (`src/sky.js`) et les richesses (`src/wealth.js`) sont lus directement par `data/sky.js`, `rules.js`,
`prose.js` et `registry.js`.

**Ajouter une clé au bloc `age`** (comme `fx:`) : une expression régulière dans `src/mech.js`, ajoutée à
`hooks.skip` (assigné dans `entry.js`) (sinon le moteur la prend pour un symbole inconnu), et lue là où elle sert
(`hooks.adjust` si elle change l'analyse).

## Les modules de la couche d'extension (`src/`)

| Fichier | Rôle |
|---|---|
| `entry.js` | la classe étendue : cycle de vie, crochets, vue livre (couverture, clic sur la vitre, liaisons incertaines), commandes, son (marche/arrêt, garde-fou) |
| `settings-ui.js` | réglages de l'extension (`DEFAULTS`, section ajoutée à l'onglet d'origine) |
| `i18n.js` | textes en/fr ; `test/i18n.test.js` vérifie que chaque clé utilisée existe dans les deux langues |
| `ui-extras.js` | ce qui s'ajoute au panneau d'un Âge (plaque, chiffres, mécanismes, loi, son ; notes de l'arpenteur, dont le Great Zero vu de l'Âge, l'heure là-bas et KIPS : `calibrationOf`), journal, bloc `dni` |
| `ui-relto.js` | bloc `relto` (scène, pages, livres, son du refuge), bloc `relto-library`, création de pages |
| `relto-model.js` | données du Relto : lecture du frontmatter, pages, déverrouillage, `relto-library`, choix des livres, ciel |
| `relto-render.js` | rendu canvas du Relto (île, cabane, étagère, effets de pages) ; état de l'Imageur, sa calibration (`imagerCal`, `imagerSeen`) ; en mode Guilde, le livre vierge (`imagerGuild` : tous les Âges de l'étagère lus, `imagerFind` : le monde que les réglages approchent, `imagerRemember` : le nom inscrit), gardé sous la clé `guild:<relto>` de `imagerGet / imagerSet` |
| `imager-guild.js` | l'Imageur en mode « L'Art de la Guilde » (`opts.instrumentsMode()` = "guild"), modèle pur : râtelier des glyphes connus (`rackOf`, rangées de huit), logements (`place`, `normCry`), le monde approché (`choose` : cristaux justes, puis justesse, puis atmosphère ; parmi les Âges de l'étoile tenue au télescope), la lumière renvoyée (`lightOf`), la cible (`targetOf`, qui porte `cryScore` lu par `crystalScore`), l'état gardé (`normalize`, `saved`), l'étoile tenue (`aimedOf`) ; `unwritten` : le monde jamais écrit, par le chercheur passé à `choose(…, finder)` (à l'aveugle seulement, quatre logements garnis, `full` ; un Âge écrit aux cristaux justes l'emporte toujours) |
| `unwritten.js` | les mondes jamais écrits (mode Guilde), modèle pur : clé des réglages (`keyOf` : quatre cristaux dans l'ordre, l'étoile que dit la lumière, `starOf` contre la palette `STARS`, puis iris, fréquence, amplitude par paliers de cinq crans, `BIN`), cohérence (`plausible`), hasard tiré de la clé (`lucky`, `CHANCE` = 0,35), jugement du moteur (`judge` : ni tache d'encre, ni mourant, premières pages = cristaux, aucune tension physique forte, ciel qui retombe dans la clé), le bloc (`linesOf` : quatre pages + `star_mass:` `insolation:` `rotation:` `atmosphere:` ; `seedOf`), le nom (`nameOf`, déterministe, `AVOID` : jamais un Âge des jeux ; `taken` : jamais une note existante), le monde (`find` : un candidat comme ceux de l'étagère, `unwritten` = { key, seed, name, lines, text, words }), la note (`noteOf`). Le rendu (`relto-render.js`, `imagerFinder`) met en cache par clé ; `ui-relto.js` lui passe le moteur (`opts.unwrittenFind`) et la transcription (`opts.onTranscribe` → `transcribeWorld` dans `entry.js`) |
| `telescope.js` | télescope, modèle pur : Great Zero caché tiré du nom + graine du Relto (`greatZero`), visée et molettes (`turn`), signal chaud/froid (`signal`, `level`, `bandOf` : décroît strictement avec l'écart, paliers de mots, tolérance `TOL`), état gardé (`saved`) |
| `starsystem.js` | télescope, étape 2, modèle pur : clé d'étoile d'un Âge (`starKey` : blocs d'étoile + ligne `system:` ou nom#graine), position GZCS du système (`position`), le Zéro vu de l'Âge (`zeroSeenFrom`, `sources` : liste de sources avec période, `lineOffset` pour l'étape 3), mots de l'arpenteur (`words`), molette du retard (`turnDial`, `measure`, `echoOffset` ; garde-fou au chargement : ni étoile ni cran au-delà d'un rahnfee, `beam.js`), calcul de l'instrument (`locate` : (Relto → Zéro) − (Âge → Zéro)), système situé (`record`, `findLocated`). Étape 3 : `systemOf` ajoute les perturbateurs (`near`, `fx`, `written`), `clue` (vrai) et `seen` (perçu) ; `perceive`, `scope` (l'oculaire : leurre du trou noir, faux pouls), `beacons` (triangulation : 2 balises à moins de 6 000 shahfeetee), la fausse ligne de Me'erta (`oldLine`, `lineSignals`, `believedZero`, `record(…, { line })`, `miss`, `offLine`), la boussole selon le champ magnétique (`compassOf`, `words(…, { compass, fx })`) ; mondes lointains : `farBeats` (une étoile sur six au-delà d'un rahnfee), le retard en battements entiers (`beats`) plus la fraction (`delay`), le compteur du réglage, `beatErr` d'une étoile gravée au mauvais battement |
| `beam.js` | le **rahnfee** (invention de fan, jamais présentée comme un mot D'ni attesté), modèle pur : `RAHNFEE` = 25³ = 15 625 shahfeetee de faisceau, le trajet du pouls en un prorahn ; `digitsOf` (une longueur en chiffres D'ni après le point : [entier, 25ᵉ, 625ᵉ, 15 625ᵉ], arrondie, bornée juste sous un rahnfee), `fromDigits`, `delayDigits` (la molette du retard : [0, a, b], a·25 + b = crans), `lateOf` / `fracBand` (le retard en fraction de battement, en paliers de mots `beam.late` / `beam.far`), `within` / `clamp` (portée). Dessin : `Dni.drawFraction`, `Dni.fractionSvg` (`dni.js` : chaque place dans sa lucarne, sans virgule) ; `engraved(…, { frac })` dans `relto-telescope.js` ; `hot.frac` (infobulle de la carte, `drawHover`). Lus en rahnfee : molette du retard, plaque de l'étoile, KIPS, notes complètes, carte ; restent en shahfeetee : plaque du Zéro, élévations, données gardées |
| `perturbers.js` | télescope, étape 3, modèle pur : les étoiles mortes (pulsar, étoile à neutrons, trou noir) tirées de la région (grille de cases de 3 000 shahfeetee, `cellBodies`, `near` ; cœur calme près du Zéro), `placeFor` (un livre qui les écrit décrit une étoile qui en a), `effects` (faux pouls : période et retard faussé ; trou noir : déviation) |
| `instruments.js` | le réglage des instruments (`ext.instrumentsMode` : `"easy"` par défaut, ou `"guild"`, l'Art de la Guilde), modèle pur : `modeOf`, `isGuild` (réexporté par `settings-ui.js`). Le télescope le reçoit par `opts.instrumentsMode` (une fonction, `ui-relto.js`) ; l'Imageur au livre vierge lira la même clé. Facile : `T.observe(…, scale = SCINT.easy)`, `SS.lineSignals(…, { easy })` (pas de ligne de Me'erta), `SS.scope(…, { easy })` (ni leurre ni faux pouls, `blur`), `SS.surveyed` / `SS.words(…, { easy })` (notes vraies), mots `tel.warmer` / `tel.colder` après un geste (`st.trend`). Guilde : la 1.19 telle quelle |
| `metronome.js` | le métronome de l'observatoire, modèle pur : un balancier qui bat le prorahn (`swing` : ±1 à chaque prorahn entier, quand le vrai pouls culmine ; `sideOf`, `peakAt`) et le glissement d'une source d'une autre période contre lui (`slip`). Dessin : `metronome()` dans `relto-telescope.js` (mur de gauche, `METRO`) ; son : `telescopeSfx("metronome")`, et `"falsebeat"` pour le faux pouls d'une étoile morte ; le coup marqué du gorahn (`isMarked`, tous les 25 battements : le battement fort du Zéro) |
| `starmap.js` | télescope, étape 3, modèle pur : la carte des étoiles (`layout` : Zéro, Relto, étoiles gravées, leurs Âges et perturbateurs, le trait vers le Zéro et son écart `miss` ; `fit` : projection en racine carrée ; `fit3` : la même, plan incliné, chaque point à sa hauteur, à une échelle propre — les fils à plomb) |
| `relto-starmap.js` | télescope, étape 3, dessin : le parchemin de la carte (vue `starmap`, depuis le rouleau de l'observatoire) |
| `calibration.js` | calibration d'un Âge, modèle pur : orbite et jour (`orbitOf` : physique ou `day_length` / `year_length`), micromètre de synchro (`turnSync`, `reading`, `state`), dérive d'une semaine (`quality` : intacte 7 jours, perdue à 14 ; étape 3 : `driftOf`, le seul endroit où ajouter un facteur, l'accélère selon le champ magnétique et les perturbateurs, lu par `orbitOf(…, near)` ; `lineShift` : l'heure fausse d'une étoile gravée sur la fausse ligne), heure locale (`localTime`, `timeWords`), bonus d'image (`boost`) |
| `relto-telescope.js` | télescope, dessin : la lunette au sommet du mont, sa vue (oculaire, molettes Torahn / Élévation, unités GZCS : torantee et shahfeetee, plaque du Zéro), les gestes ; état gardé par Relto (`ext.telescope[nom#graine]`). Étape 2 : le lutrin (‹ ›, livre chargé par `opts.onImagerAge`), la molette du Retard, l'écho, la plaque de l'étoile ; état gardé dans le même objet (`dial`, `systems[cléÉtoile]`). Étape 3 : la ligne de Me'erta dans l'oculaire (`line` gardé seulement s'il est ≠ 0), le leurre courbé et le faux pouls (`source`), le levier des balises (`triLever`), le coin à gratter (`unchart`), le rouleau vers la carte (`mapDoor`) ; chaque système garde aussi `seen`, `pert`, `ages`, `line`, `tri` (facultatifs : un état de l'étape 2 se relit tel quel). Mode Guilde : l'étoile tenue (`aimedKey` : livre sur le lutrin, étoile située, molettes dans la tolérance) est gardée dans `aimedAt` (+ `book`, le chemin du livre, remis sur le lutrin au retour) ; lue par l'Imageur via `aimedOf` ; en mode facile, rien de plus n'est écrit |
| `dniclock.js` | horloge D'ni, modèle pur : `synced`, dérive de la pierre-calendrier (`driftYahr`, `reltoDate`) ; les anneaux de la sphère (`rings` : vailee, yahr, gahrtahvo, tahvo, chacun avec son chiffre sous l'index et son angle ; `digitAngle`), la lueur d'un chiffre qui change (`glows`, `GLOW_MS`) |
| `relto-clock.js` | horloge D'ni, dessin : la vue rapprochée `clock` (un clic sur la sphère de l'île) : sphère, anneaux gravés, socle (date et heure en chiffres D'ni), pierre-calendrier au loin ; `r.nowOverride` fige l'instant (tests, rendus visuels) |
| `linkfx.js` | effets de la fenêtre de liaison (ondulation, statique, télé, coupures), tirage d'une liaison incertaine |
| `genscene.js` | fenêtre génératrice : `sceneOf` (descripteur, blocs inconnus compris), `traits` (adjectifs → teinte, taille, mouvement), `build` (géométrie tirée de la graine), `paint` (une image à la phase t) |
| `wealth.js` / `amounts.js` | richesses et cicatrices (blocs de matière), quantités many/few/normal et compensation (`applyAmounts`, appelé par `adjust`) |
| `weather.js` | météo vivante : lignes `bloc: fréquence, moments`, tirage par (graine de l'Âge, jour D'ni ou jour de l'Âge, moment), présence en fondu ; la fenêtre la lit par `weatherLevels()` (`genscene.js`) |
| `sky.js` | ciel étendu : blocs de cosmologie et mondes-types (`WORLD_CLASH`, `WORLD_LIFE`), règles ciel↔vivant, phrases, lignes `day_length` / `year_length`, horloge |
| `damagefx.js` | dégâts procéduraux : `plan` (zones et trous), `branchCracks` / `drawCracks`, `drawDamage` |
| `sound.js` | synthèse Web Audio : couches d'ambiance, préréglages, niveaux zen/minimal, effets ponctuels (livre, liaison, parasites) |
| `dni.js` | chiffres D'ni en base 25 (police installée → fichier de glyphes → tracé), texte D'ni |
| `law.js` | loi du changement (altération, encre sèche, guérison) |
| `mech.js` | mécanismes et énigmes, solitude, et les clés du bloc `age` (`fx:`, `trap book`, `damaged_pages`) |
| `journal.js` | voix et entrées du journal d'exploration |
| `cover.js` | page de garde SVG |
| `index.js` | index des Âges du coffre (cache par date de modification) |
| `util.js` | hasard déterministe, couleurs, petites fonctions |
| `styles.ext.css` | styles ajoutés à ceux d'origine |

## Recettes

**Une page de Relto intégrée** : `PAGE_PRESETS` dans `relto-model.js`. Si elle a un nouvel effet visuel,
l'ajouter à `EFFECT_TYPES`, écrire `drawXxx()` dans `relto-render.js` et l'appeler dans `draw()` au bon
endroit de l'ordre de dessin. Vérifier avec `npm run visual` (variante dans `test/visual/entry-relto.js`).

**Une page présente d'office** (verrouillée puis disponible sans qu'on écrive de note, comme le télescope) : son id dans
`BUILTIN_PAGES` (`relto-model.js`), un préréglage avec `unlock: { agesCount: n }`. Une note ou une ligne de bibliothèque de même id l'emporte.

**Un son** : une méthode-couche `xxx(g)` dans `Soundscape` (`sound.js`), son nom dans `LAYERS`, un
préréglage dans `PRESETS`. Pour qu'elle reste au refuge en mode zen, l'ajouter à `ZEN_KEEP` (et `ZEN_CAP`).
Toute minuterie passe par `this.every()` / `this.later()` (elles s'arrêtent avec le son) ; toute note
ponctuelle par `this.tone()`.

**Un élément du paysage génératif** : un champ dans `sceneOf()` (`genscene.js`), son dessin dans `paint()` (ou une fonction à part, comme `trees()`), son tirage dans `build()`. Vérifier avec `npm run visual` (`gen.html`) et `node test/gen.test.js`.

**Un perturbateur de plus** (étape 3) : son genre dans `KINDS`, `SHARE`, `REACH` (et `PERIOD` s'il bat) de `src/perturbers.js`, son effet dans `effects()`, un bloc de ciel (ci-dessous) de même identifiant, son signe dans `PSYM` (`relto-telescope.js`) et `pertSign` (`relto-starmap.js`), son dessin dans `remnant()` (`genscene.js`).

**Un bloc de ciel** : une entrée dans `SKY_BLOCKS` (catégorie hors cases du tirage : jamais tiré), sa phrase dans `SKY_PROSE`, ses règles dans `SKY_RULES` (+ note dans `NOTES`) ; ajouter son identifiant se fait tout seul dans `KNOWN` (sinon le peintre générique le prendrait). Son dessin : `skyBodies()` (`genscene.js`), sa lecture : un champ dans `sceneOf()`. Le test d'intégration réel vérifie reconnaissance, stabilité, phrases et absence de tirage.

**Un détail ou un premier plan** : un type de plus dans les listes de `build()` (`fgKind`, `det.kind`) et sa branche dans `detail()` / `foreground()` (`genscene.js`) ; le test boucle sur tous les types (ajouter le nom dans `test/gen.test.js`).

**Un mot du lexique des blocs inconnus** : une entrée dans `LEX` (`genscene.js`) : `h` teinte, `s` saturation, `l` luminosité, `z` taille, `v` vitesse, `p` pulsation, `sp` arêtes.

**Les mondes jamais écrits** (mode Guilde, `src/unwritten.js`) : la fréquence se règle par `CHANCE` (parmi les réglages cohérents et que le moteur juge vivants) et par `plausible` (étoile, jour, air) ; une étoile de plus pour les lentilles : une masse dans `MASSES` (sa couleur se calcule) ; un nom de jeu à ne jamais tirer : `AVOID`. Changer la clé (`keyOf`, `BIN`) change les mondes trouvés par tous les joueurs : le test `unwritten` le dira.

**Une longueur de faisceau à afficher** (étoile, perturbateur, distance) : la garder en shahfeetee dans les données, la graver par `BEAM.digitsOf(sf)` → `dni.drawFraction` (canvas) ou `dni.fractionSvg` (onglet Détails) ; en mots, `BEAM.fracBand(BEAM.rahnfeeOf(sf))` dans la liste `beam.far`. Une étoile au-delà d'un rahnfee est refusée (`starsystem.js`) : dans la fiction, son pouls se mêlerait au battement suivant.

**Un style de dégât** : un élément de `KINDS` et sa branche dans `drawDamage()` (`damagefx.js`).

**Un effet de fenêtre** : un mode dans `fxParams()` (`linkfx.js`), sa valeur dans `FX_VALUES` (`mech.js`)
et dans la liste du réglage (`settings-ui.js`).

**Un texte d'interface** : une clé dans les deux langues de `i18n.js`, appelée avec une chaîne littérale
(`t("ma.cle")`) pour que le test la trouve.

## Tests

| Commande | Ce qui est vérifié |
|---|---|
| `npm test` (lisible, puis minifié) | `law`, `i18n`, `zen` (sons, effets, clés du bloc age, livres), `gen` (paysage génératif, dégâts procéduraux), `sound` (cycle de vie avec un faux AudioContext), `telescope`, `starsystem`, `beam` et `perturbers` (Great Zero ; rahnfee : conversions, chiffres après le point, retard, portée, plaques et carte ; étoiles des Âges, lutrin, calibration, dérive ; étape 3 : étoiles mortes, triangulation, ligne de Me'erta, carte, nord magnétique ; ces trois-là jouent dans l'Art de la Guilde), `instruments` (réglage facile / Guilde, métronome : phase du vrai pouls, glissement de la fausse ligne, tic et faux pouls à l'oreille), `imager-guild` (le livre vierge : comparateur nourri par le télescope, cristaux = glyphes connus, planète et station III, Âges d'une même étoile, nom inscrit, fenêtre noire ; mode facile inchangé), `unwritten` (mondes jamais écrits : déterminisme, un Âge écrit l'emporte, fréquence 30–40 % parmi les réglages cohérents et vivants, bloc sans tache d'encre, peinture finie, transcription aller-retour, noms, dans le Relto), `integration` (build + exécution dans jsdom avec un faux `obsidian`, sur une maquette du moteur) |
| `npm run equiv -- <ancien main.js>` | non-régression : 600 Âges au hasard, ancien build contre nouveau |
| `npm run lint` | eslint : variables non définies ou inutilisées, code mort |
| `npm run visual` | pages HTML de rendu (Relto, fenêtres, couverture) à ouvrir ou capturer |

Rien ne remplace un essai dans Obsidian : copier `release/` (ou décompresser `release/age-writer-<v>.zip`)
dans `.obsidian/plugins/age-writer/` du coffre de test, puis recharger le plugin.

## Pièges connus

- **Vue de lecture d'Obsidian** : les sections loin de l'écran sont détachées du document puis remises au
  défilement. Les boucles d'animation (Relto, fenêtres) et le garde-fou du son en tiennent compte : un
  élément détaché n'est abandonné qu'au bout de 2 minutes, et le son ne s'arrête que si la note change ou
  si l'onglet se ferme ou se cache.
- **AudioContext** : un seul par ambiance, un seul partagé pour tous les effets ponctuels. Ne jamais en
  créer un par clic (les navigateurs en limitent le nombre).
- **Loi du changement** : l'état est rangé par nom de note. Deux Âges de même nom dans deux dossiers
  partagent le même état.
- **Vocabulaire** : « Relto », « D'ni » apparaissent dans l'interface et les clés YAML. C'est à trancher
  avant toute publication.

## Publier une version

1. `version` dans `package.json`.
2. `npm run lint && npm test`.
3. `npm run zip` → `release/age-writer-<v>.zip` (plugin) et `release/age-writer-<v>-src.zip` (sources).
4. Mettre à jour `docs/NOTES-historique.md`.
