# Guide du développeur — Age Writer 1.4 (couche d'extension)

## Le principe

Le plugin d'origine (Age Writer 1.3.0) n'existe plus qu'en `main.js` minifié, rangé dans `base/`.
On ne le modifie pas à la main : `build.js` y pose quelques **points d'ancrage** (des remplacements de
texte vérifiés, chacun doit trouver exactement une correspondance), puis colle à la fin la couche
d'extension, assemblée depuis `src/` par `tools/bundle.js`.

```
base/main.js ──build.js──► ancrages (__AGEX.adjust / w / skip, export) ─┐
src/*.js ──tools/bundle.js──────────────────────────────────────────────┴──► dist/main.js
base/styles.css + src/styles.ext.css ─────────────────────────────────────► dist/styles.css
base/manifest.json + version de package.json ─────────────────────────────► dist/manifest.json
```

Si une ancre ne trouve rien (autre version de la base), la construction s'arrête avec son nom :
c'est l'expression régulière correspondante de `build.js` qu'il faut adapter.

### Points d'ancrage (build.js)

| Ancre | Effet | Utilisé par |
|---|---|---|
| `analyse()` | toute analyse d'un Âge passe par `__AGEX.adjust(résultat, options, texte)` | loi du changement, `trap book`, `damaged_pages` |
| tirage « one » / « each » | les poids du tirage passent par `__AGEX.w(slot, option)` | solitude |
| analyseur / écrivain de pages | une ligne pour laquelle `__AGEX.skip(ligne)` est vrai est ignorée | `mechanism:`, `fx:`, `trap book`, `damaged_pages` |
| export par défaut | le plugin exporté devient la classe étendue | tout |
| blocs de ciel / règles / phrases | `__AGEX.sky`, `__AGEX.rules`, `__AGEX.prose` (données de `src/sky.js`) ajoutées aux listes `Q`, `gt` et à la banque `Si` du moteur | ciel étendu |
| blocs de matière | `__AGEX.matter` (données de `src/wealth.js`) ajoutées à la liste `ot` des blocs de matière du moteur | richesses, cicatrices |
| identifiants (`grab`) | fonctions internes exposées dans `core` | voir ci-dessous |

`core` = `{ analyse, extract, base, glyphSvg, prose, glyphs, blocks, BookView, SettingsTab }`.

**Ajouter une clé au bloc `age`** (comme `fx:`) : une expression régulière dans `src/mech.js`, ajoutée à
`AGEX.skip` dans `entry.js` (sinon le moteur la prend pour un symbole inconnu), et lue là où elle sert
(`AGEX.adjust` si elle change l'analyse).

## Les modules (`src/`)

| Fichier | Rôle |
|---|---|
| `entry.js` | la classe étendue : cycle de vie, crochets, vue livre (couverture, clic sur la vitre, liaisons incertaines), commandes, son (marche/arrêt, garde-fou) |
| `settings-ui.js` | réglages de l'extension (`DEFAULTS`, section ajoutée à l'onglet d'origine) |
| `i18n.js` | textes en/fr ; `test/i18n.test.js` vérifie que chaque clé utilisée existe dans les deux langues |
| `ui-extras.js` | ce qui s'ajoute au panneau d'un Âge (plaque, chiffres, mécanismes, loi, son), journal, bloc `dni` |
| `ui-relto.js` | bloc `relto` (scène, pages, livres, son du refuge), bloc `relto-library`, création de pages |
| `relto-model.js` | données du Relto : lecture du frontmatter, pages, déverrouillage, `relto-library`, choix des livres, ciel |
| `relto-render.js` | rendu canvas du Relto (île, cabane, étagère, effets de pages) |
| `linkfx.js` | effets de la fenêtre de liaison (ondulation, statique, télé, coupures), tirage d'une liaison incertaine |
| `genscene.js` | fenêtre génératrice : `sceneOf` (descripteur, blocs inconnus compris), `traits` (adjectifs → teinte, taille, mouvement), `build` (géométrie tirée de la graine), `paint` (une image à la phase t) |
| `wealth.js` / `amounts.js` | richesses et cicatrices (blocs de matière, `__AGEX.matter`), quantités many/few/normal et compensation (`applyAmounts`, appelé par `adjust`) |
| `sky.js` | ciel étendu : blocs de cosmologie et mondes-types (`WORLD_CLASH`, `WORLD_LIFE`), règles ciel↔vivant, phrases (données injectées dans le moteur à la construction), lignes `day_length` / `year_length`, horloge |
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

**Un son** : une méthode-couche `xxx(g)` dans `Soundscape` (`sound.js`), son nom dans `LAYERS`, un
préréglage dans `PRESETS`. Pour qu'elle reste au refuge en mode zen, l'ajouter à `ZEN_KEEP` (et `ZEN_CAP`).
Toute minuterie passe par `this.every()` / `this.later()` (elles s'arrêtent avec le son) ; toute note
ponctuelle par `this.tone()`.

**Un élément du paysage génératif** : un champ dans `sceneOf()` (`genscene.js`), son dessin dans `paint()` (ou une fonction à part, comme `trees()`), son tirage dans `build()`. Vérifier avec `npm run visual` (`gen.html`) et `node test/gen.test.js`.

**Un bloc de ciel** : une entrée dans `SKY_BLOCKS` (catégorie hors cases du tirage : jamais tiré), sa phrase dans `SKY_PROSE`, ses règles dans `SKY_RULES` (+ note dans `NOTES`) ; ajouter son identifiant se fait tout seul dans `KNOWN` (sinon le peintre générique le prendrait). Son dessin : `skyBodies()` (`genscene.js`), sa lecture : un champ dans `sceneOf()`. Le test d'intégration réel vérifie reconnaissance, stabilité, phrases et absence de tirage.

**Un détail ou un premier plan** : un type de plus dans les listes de `build()` (`fgKind`, `det.kind`) et sa branche dans `detail()` / `foreground()` (`genscene.js`) ; le test boucle sur tous les types (ajouter le nom dans `test/gen.test.js`).

**Un mot du lexique des blocs inconnus** : une entrée dans `LEX` (`genscene.js`) : `h` teinte, `s` saturation, `l` luminosité, `z` taille, `v` vitesse, `p` pulsation, `sp` arêtes.

**Un style de dégât** : un élément de `KINDS` et sa branche dans `drawDamage()` (`damagefx.js`).

**Un effet de fenêtre** : un mode dans `fxParams()` (`linkfx.js`), sa valeur dans `FX_VALUES` (`mech.js`)
et dans la liste du réglage (`settings-ui.js`).

**Un texte d'interface** : une clé dans les deux langues de `i18n.js`, appelée avec une chaîne littérale
(`t("ma.cle")`) pour que le test la trouve.

## Tests

| Commande | Ce qui est vérifié |
|---|---|
| `npm test` | `law`, `i18n`, `zen` (sons, effets, clés du bloc age, livres), `gen` (paysage génératif, dégâts procéduraux), `sound` (cycle de vie avec un faux AudioContext), `integration` (build + exécution dans jsdom avec un faux `obsidian`, sur une maquette du moteur) |
| `npm run test:real` | idem + intégration sur le vrai `base/main.js` |
| `npm run lint` | eslint : variables non définies ou inutilisées, code mort |
| `npm run visual` | pages HTML de rendu (Relto, fenêtres, couverture) à ouvrir ou capturer |

Rien ne remplace un essai dans Obsidian : copier `dist/` (ou décompresser `release/age-writer-<v>.zip`)
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
2. `npm run lint && npm run test:real`.
3. `npm run zip` → `release/age-writer-<v>.zip` (plugin) et `release/age-writer-<v>-src.zip` (sources).
4. Mettre à jour `docs/NOTES-historique.md`.
