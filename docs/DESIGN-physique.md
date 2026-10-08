# Couche physique des Âges — conception

> **État (8 oct. 2026)** : idée validée par l'auteur ; **prototype écrit et testé, pas encore branché** sur le plugin.
> Code : `src/physics/` (branche `physique` du dépôt). Tests : `test/physics.test.js`. Galerie : `docs/physique-exemples.md`.
> Le plugin livré ne change pas : `build.js` laisse `src/physics` hors du paquet (`release/main.js` identique octet pour octet à la 1.15.2).

---

## En bref

Aujourd'hui, un bloc est une étiquette (« volcans », « eau ») et la stabilité vient de contradictions écrites à la main entre étiquettes. La couche physique ajoute, **sous** les étiquettes, un petit monde physique : une étoile, une orbite, une planète avec sa masse, son âge, sa chaleur interne, son noyau, son champ magnétique, son air, sa température, son eau. Chaque bloc **demande** quelque chose à ce monde (la lave demande un intérieur chaud ; les fougères, de la lumière et une température vivable).

Trois idées font tout le système :

1. **Le monde cherche une physique qui tienne ce que tu as écrit.** Ce que le livre laisse ouvert (masse, âge, distance à l'étoile…) est tiré de la graine, comme le reste — mais sous contraintes : le moteur essaie 48 mondes possibles, toujours les mêmes pour la même graine, et garde le premier qui tient tout. Écrire `lava` sans rien d'autre donne naturellement un monde jeune ou massif.
2. **Quand rien ne tient, le monde dit pourquoi, et propose quoi écrire.** « L'intérieur est trop froid pour nourrir des volcans (chaleur interne 0,09 ; il faut au moins 0,5). Pistes : un monde plus jeune (`age: 3,5`) ; une planète plus massive (`mass: 2,6`) ; une géante toute proche qui la pétrit par marée (`planet_rings`). » Les nombres sont **calculés** : on a cherché la valeur la plus proche qui lève la tension.
3. **Trois niveaux de rigueur.** *Facile* : la physique explique, ne punit jamais. *Strict* : chaque tension coûte sur son axe, comme une contradiction du moteur. *Hardcore ++* : plus tard.

Ce n'est **pas une simulation**. Chaque loi est une version simplifiée d'une relation réelle, calée pour que la Terre, Mars, Vénus et la Lune retombent à peu près sur leurs vraies valeurs. L'objectif est un monde **crédible et explicable**.

---

## 1. Intention

### L'esprit

Dans l'univers de Myst, on n'invente pas un monde : on le **décrit**, et un monde décrit de façon incohérente est instable. La couche physique donne une raison à cette instabilité. « Volcans actifs sur un petit monde vieux de neuf milliards d'années » n'est plus une incompatibilité arbitraire entre deux mots : c'est un intérieur refroidi qui ne peut plus rien nourrir.

Ce que la nature refuse, l'Art peut encore le tenir, mais il le paie : c'est le sens de l'axe **métaphysique**. Un soleil vert n'est pas une faute de physique : aucune étoile ne brille vert, ce ciel est peint par l'Art, et il coûte un peu d'Art. Cette lecture est **celle de l'auteur**, inspirée de Myst ; on ne la présente pas comme le lore officiel.

### Les principes

- **Facile ne punit jamais.** En mode facile, la stabilité ne bouge pas d'un point : la physique éclaire, explique, suggère.
- **Rien ne change pour les Âges existants** tant que l'auteur ne passe pas en strict (à vérifier au branchement avec `tools/equiv.js` : 600 Âges, 0 différence attendue).
- **La physique ne touche pas le tirage des pages du moteur.** Elle tire ses propres paramètres avec ses propres dés (`graine|physics`), après coup.
- **Le Relto est hors physique.** C'est la zone sûre, « comme chez soi » : aucune loi ne s'y applique, aucune tension ne l'abîme.
- **Les ruines sont neutres.** Portes, tablettes, ponts, livres ne demandent rien à la physique ; au contraire, leur présence dit que **quelqu'un a pu apporter** ce que la nature n'aurait pas fait (des arbres sous un soleil bleu trop jeune, par exemple).
- **Écrire un nombre, c'est avoir le dernier mot.** `mass: 0.2` fixe la masse ; la physique en tire les conséquences, elle ne la conteste pas.

---

## 2. Les trois niveaux

| Niveau | Ce qui se passe | Pour qui |
|---|---|---|
| **Facile** (défaut proposé) | La physique est calculée et affichée (onglet « Physique » : fiche, causes, tensions, pistes). La stabilité ne change pas. | Tout le monde, écriture rapide. |
| **Strict** | Chaque tension coûte sur son axe (léger 10, moyen 20, fort 35 points), avec un plafond de 45 points par axe. Une tension déjà comptée par le moteur (même bloc, même axe) ne coûte pas deux fois. | Les auteurs qui veulent un monde qui tient. |
| **Hardcore ++** | Plus tard : formules plus fidèles, unités réelles, plus de grandeurs (voir §11). | Les amateurs de science. |
| *Off* | Rien du tout (comportement actuel). | — |

Le réglage serait global (onglet Réglages → « Âges & mécanismes »), avec une ligne par Âge pour déroger : `physics: strict` (idée, non codée).

---

## 3. Comment ça marche

```
bloc age ──► symboles (écrits, tirés, nés de réactions)  ──► réglages des blocs (blocks.js)
          └► lignes de valeurs (mass:, age:, orbit:…)    ──► paramètres fixés
                                                            │
                         graine|physics ──► 48 mondes possibles (paramètres libres tirés)
                                                            │  pour chacun : lois (model.js) → état w
                                                            │               exigences (rules.js) → tensions
                                                            ▼
                                     on garde le premier monde sans tension (sinon le moins coûteux)
                                                            │
                         pour chaque tension restante : recherche de la valeur la plus proche qui la lève
                                                            ▼
                             fiche (text.js) · mode facile / strict (index.js : applyPhysics)
```

Fichiers :

| Fichier | Rôle |
|---|---|
| `src/physics/model.js` | les **lois**, en fonctions pures (aucune dépendance) |
| `src/physics/blocks.js` | ce que chaque **bloc** fixe et exige |
| `src/physics/rules.js` | les **exigences** : test, axe, gravité, explication FR/EN, paramètres à chercher, pistes |
| `src/physics/solve.js` | lignes de valeurs, tirage sous contraintes, état dérivé, tensions, pistes chiffrées |
| `src/physics/text.js` | la **fiche** (lignes, causes, tensions) en français ou en anglais |
| `src/physics/index.js` | l'API : `physicsOf(analyse, src, graine)`, `applyPhysics(analyse, phys, mode)`, `sheet(phys, langue)` |
| `tools/physics-report.js` | la galerie `docs/physique-exemples.md` (`node tools/physics-report.js [en]`) |
| `tools/physics-bench.js` | le **banc physique** : une page autonome qui fait tourner ce code dans le navigateur (écrire un bloc, voir la fiche, cliquer une piste) → `test/visual/out/banc-physique.html` ; modèle `tools/physics-bench.template.html` |

### Le tirage sous contraintes

Les paramètres libres ont des **lois a priori** (des plages plausibles) :

| Paramètre | A priori | Fixé par |
|---|---|---|
| masse de l'étoile | 0,7–1,3 M☉ ; selon la couleur : rouge 0,15–0,5, orange 0,6–0,9, blanche 1,1–1,6, bleue 3–12 | `red_sun`…, `star_mass:` |
| nombre d'étoiles | 1 ; 2 avec `twin_suns` ou deux couleurs ; 0 avec `starless` | blocs |
| flux reçu (insolation) | log-normale autour de 1 × Terre (0,2–3) | `insolation:`, `orbit:` |
| masse de la planète | log-normale autour de 1 M⊕ (0,05–8) | `mass:` |
| part du noyau de fer | 0,33 ± 0,06 (+0,12 avec `iron`) | `core:` |
| âge | 0,5–9 Ga, **jamais plus vieux que son étoile** | `age:` |
| rotation | log-normale autour de 24 h (6–120) ; figée avec `frozen_cycle` ; 1,5–8 jours autour d'une géante | `rotation:` |
| volatils (de quoi faire de l'air) | log-normale autour de 1 (0,1–5) | `volatiles:` |
| eau | 0,3 par défaut ; 1 avec `water` ; 3 `ocean_world` ; 0,02 `desert_world` | `water:` |
| marée | 0 ; +0,03 avec une lune ; 0,1–5 autour d'une géante (`planet_rings`) ; +0,1 si figé près d'une naine | `tides:` |

48 mondes sont tirés (graine `nom de la note|physics`, dés distincts pour chaque essai). Tous les dés sont **toujours** jetés dans le même ordre, puis les valeurs écrites remplacent les valeurs tirées : écrire `insolation: 1` ne déplace pas le tirage de la masse ou de l'âge. On garde **le premier** monde qui ne laisse aucune tension, sinon celui dont le coût total est le plus bas. Comme le premier essai est un tirage a priori ordinaire, un Âge sans exigence particulière reçoit simplement un monde plausible au hasard.

### Les pistes chiffrées

Pour chaque tension restante, `solve.js` fait varier **un seul** paramètre à la fois (ceux que l'exigence déclare dans `search`), sur une grille logarithmique de 65 valeurs, et retient la valeur **la plus proche de l'actuelle** qui lève la tension **sans alourdir le total des tensions** (une piste qui échange un problème contre un pire n'en est pas une), arrondie à deux chiffres si l'arrondi marche encore. Si l'auteur a écrit `orbit:`, la piste de flux est rendue en `orbit:`. Les nombres proposés s'écrivent sans séparateur de milliers, pour que le bloc les relise. Vérifié : chaque piste, réécrite dans le bloc et relue, allège le monde. La fiche la propose comme une ligne à écrire : « un monde plus jeune (`age: 3,5`) ». Au plus deux pistes chiffrées, suivies des pistes en blocs (« `planet_rings` »).

---

## 4. Les lois

Unités : Terre = 1 (masse, rayon, gravité, chaleur interne, flux reçu), Soleil = 1 (masse, luminosité), UA, milliards d'années (Ga), kelvins, bars, heures.

| Loi | Relation simplifiée | D'après |
|---|---|---|
| **L1 Étoiles** | luminosité L = 0,23·M^2,3 (M < 0,43), M⁴ (< 2), 1,4·M^3,5 ; rayon ∝ M^0,8 / M^0,57 ; température par L = 4πR²σT⁴ ; durée de vie = 10 Ga · M / L | relation masse-luminosité de la séquence principale |
| **L2 Orbite** | flux S = L / a² ; période = 365,25 j · √(a³ / M★) ; verrouillage par marée en ≈ 2·10⁴ Ga · a⁶ / M★² (Terre : jamais ; monde tempéré autour d'une naine de 0,3 M☉ : < 1 Ga ; de 0,5 M☉ : ~20 Ga) ; zone habitable 0,36 < S < 1,1 | Kepler ; temps de verrouillage ∝ a⁶ ; Kopparapu et al. 2013 |
| **L3 Planète** | rayon R = (1,07 − 0,21·CMF) · M^(1/3,7) ; gravité g = M / R² ; libération v = √(M / R) ; densité M / R³ | Zeng et al. 2016 (planètes rocheuses) |
| **L4 Intérieur** | chaleur h = √M · e^(−(âge − 4,5)/3,5) · e^(−âge·0,066·(1/R − 1)) + marée ; seuils : volcanisme 0,5, tectonique 0,7 (et M ≥ 0,5 **et de l'eau liquide**, qui lubrifie la croûte : Vénus n'a pas de plaques), noyau liquide 0,4, océan de magma 3 ; **dynamo** si noyau liquide, intensité ∝ √(24 h / rotation) × fer × chaleur — une rotation lente l'affaiblit (Mercure, 1 % du champ terrestre) ; bouclier réel au-delà de 0,2 | décroissance radioactive ; petits corps refroidis plus vite |
| **L5 Atmosphère** | T_eq = 278,6 K · (S·(1 − A))^¼ (+ chaleur interne seule si pas d'étoile, ≈ 35 K pour la Terre) ; rétention = e^(−(x/2)²), x = vent stellaire (√S, ×0,3 avec champ magnétique) / (v²·255/T_eq) ; pression = volatils × √chaleur × rétention × régime, et sous ~60 K l'air gèle (il tombe en neige) ; serre grise : T_s⁴ = T_eq⁴ · (1 + ¾τ), τ = 0,836 · P^1,2 | équilibre radiatif ; échappement de Jeans + vent stellaire (très simplifiés) |
| **L6 Eau** | régimes : **liquide** (les océans enfouissent le CO₂ : rien de plus), **glace** (plus de pluie pour l'enfouir : ×3, et l'albédo monte de 0,2), **sec** (effet Vénus : jusqu'à ×150 si volcanique) ; on garde le premier régime qui se confirme ; ébullition par Clausius-Clapeyron (jamais sous 273,16 K) ; sous 0,00612 bar (point triple, 611,7 Pa), l'eau ne coule pas | cycle carbonates-silicates ; point triple de l'eau |
| **L7 Vivant** | lumière au sol = S × voiles (`permanent_veil` 0,3, `ash_cloud` 0,6, air > 10 bar 0,5) ; vie verte entre −18 et +52 °C ; vie rude (spores, lichens) entre −73 et +87 °C ou près d'une source chaude ; vie simple ≥ 0,3 Ga, arbres et bêtes ≥ 1 Ga (sauf bâtisseurs) | ordres de grandeur terrestres |
| **L8 Chaîne alimentaire** | brouteurs → flore ; chasseurs → proies ; fouisseurs → sol meuble | bon sens écologique |

### Calage

| Monde | Modèle | Réalité |
|---|---|---|
| Terre | 1 bar, 287 K, eau liquide, champ 1, volcans | 1 bar, 288 K |
| Mars | 0,07 bar, 211 K, glace, pas de champ, volcans éteints | 0,006 bar, 210 K |
| Vénus (rotation 243 j, sans eau) | 50 bar, 655 K, champ 0,05 (pas de bouclier), pas de plaques | 92 bar, 737 K, pas de champ ni de plaques |
| Lune | pas d'air, intérieur froid (0,06) | idem |

Mars garde un peu trop d'air et Vénus un peu trop peu : c'est le prix de lois simples. Les tests vérifient des **fourchettes**, pas des valeurs exactes. L'absence de champ de Vénus sort du modèle par sa rotation lente ; dans la réalité, la cause est débattue (l'état de son noyau, plutôt) : c'est une simplification, et les messages ne prétendent pas l'expliquer.

---

## 5. Les lignes de valeurs

À écrire dans le bloc `age`, une par ligne. Virgule ou point. Toutes facultatives.

| Ligne (alias) | Sens | Unité |
|---|---|---|
| `mass:` (`masse:`) | masse de la planète | Terre = 1 |
| `radius:` (`rayon:`) | rayon (sinon déduit de la masse) | Terre = 1 |
| `age:` (`âge:`) | âge du monde | Ga ; `500 Ma` accepté |
| `orbit:` (`orbite:`, `distance:`) | distance à l'étoile | UA |
| `insolation:` (`flux:`) | flux reçu | Terre = 1 |
| `star_mass:` (`masse_étoile:`) | masse de l'étoile | Soleil = 1 |
| `rotation:` (`spin:`) | durée du jour | heures ; `3 j` / `3 d` accepté |
| `core:` (`noyau:`) | `liquid` / `liquide`, `solid` / `figé`, `none` / `aucun`, ou part de fer (0–0,8) | — |
| `atmosphere:` (`atmosphère:`, `pressure:`, `pression:`) | `none` / `aucune`, `thin` / `mince`, `dense` / `épaisse`, ou un nombre | bars |
| `water:` (`eau:`) | quantité d'eau | Terre ≈ 1 |
| `volatiles:` | de quoi faire de l'air | Terre = 1 |
| `albedo:` (`albédo:`) | part de lumière renvoyée | 0–1 |
| `tides:` (`marées:`) | chaleur de marée | Terre = 1 |

Bornes : masse 0,01–20, rayon 0,05–4, âge ≤ 13,8 Ga, orbite 0,005–1 000 UA, flux ≤ 5 000, étoile 0,08–60 M☉ ; une valeur hors plage est ramenée dedans et la fiche le signale ; une valeur nulle est ignorée là où elle n'a pas de sens (masse, rayon, orbite, flux, rotation).

**En mots**, `core: liquid` ou `atmosphere: thin` ne fixent rien : ce sont des **affirmations** que la physique vérifie (et qui guident le tirage). **En nombres**, ils fixent la valeur.

Ces lignes ne se confondent avec aucune autre ligne existante (`day_length:`, `seed:`, `normal: water`, `fx:`… : vérifié par les tests). Le bloc `water` seul sur sa ligne reste un bloc.

---

## 6. Les exigences

| Exigence | Loi | Axe | Gravité | Test (simplifié) | Pistes chiffrées sur |
|---|---|---|---|---|---|
| `volcanism` | L4 | géologique | moyenne | chaleur ≥ 0,5 ou surface ≥ 1 200 K | âge, masse |
| `magmaOcean` | L4 | géologique | forte | chaleur ≥ 3 ou surface ≥ 1 200 K | âge, insolation, masse |
| `hydrothermalPast` | L4 | géologique | légère | de l'eau ou chaleur ≥ 0,3 | — |
| `magneticField` | L4 | cosmologique | légère | champ > 0,2 et une étoile | rotation, âge, masse |
| `lockPlausible` | L2 | cosmologique | légère | verrouillage ≤ âge, ou lune d'une géante | insolation |
| `axisChaos` | L2 | cosmologique | légère | pas de grande lune | — |
| `realStar` | L1 | métaphysique | légère | jamais (vert, violet) | — |
| `liquidWater` | L6 | géologique | légère | eau liquide (ou glace assumée) | insolation, atmosphère, eau |
| `deepOcean` | L6 | géologique | forte | eau liquide et eau ≥ 1 | eau, insolation |
| `thawing` | L6 | géologique | légère | 250–300 K | insolation |
| `frozenSurface` | L5 | cosmologique | moyenne | < 255 K | insolation, atmosphère |
| `warmClimate` | L5 | écologique | moyenne | 283–320 K | insolation, atmosphère |
| `dryClimate` | L6 | géologique | moyenne | peu d'eau ou pas liquide | eau |
| `notFurnace` | L5 | géologique | moyenne | ≤ 340 K | insolation, âge |
| `coldSomewhere` | L5 | météo | légère | ≤ 300 K ou face de nuit | insolation |
| `hotSomewhere` | L5 | météo | légère | ≥ 295 K, volcans, ou face de jour | insolation, atmosphère |
| `scorching` | L5 | géologique | légère | soleil fort, volcans ou ≥ 320 K | insolation |
| `someAir` | L5 | météo | moyenne | ≥ 0,005 bar | masse, atmosphère |
| `moistAir` | L6 | météo | légère | ≥ 0,05 bar et de l'eau | atmosphère, eau |
| `rainCycle` | L6 | météo | légère | air, eau liquide ou vapeur, énergie | insolation, atmosphère, eau |
| `convection` | L5 | météo | légère | ≥ 0,1 bar et énergie | atmosphère, insolation |
| `erosion` | L5 | géologique | légère | de l'air ou de l'eau | atmosphère |
| `sunlight` | L7 | écologique | légère | lumière au sol ≥ 0,01 (ou lueur propre) | insolation |
| `temperateLife` | L7 | écologique | légère | 255–325 K | insolation, atmosphère |
| `hardyLife` | L7 | écologique | légère | 200–360 K ou source chaude | insolation, atmosphère |
| `breathableAir` | L7 | écologique | légère | ≥ 0,05 bar | masse, atmosphère |
| `oldEnoughSimple` | L7 | écologique | légère | ≥ 0,3 Ga ou bâtisseurs | âge |
| `oldEnoughComplex` | L7 | écologique | moyenne | ≥ 1 Ga ou bâtisseurs | âge |
| `tallTrees` | L3 | écologique | légère | gravité ≤ 2 | masse |
| `buoyancy` | L3 | écologique | légère | air / gravité ≥ 0,5, ou une mer | atmosphère, masse |
| `foodPlants` | L8 | écologique | légère | une flore | — |
| `prey` | L8 | écologique | légère | des proies | — |
| `soil` | L8 | écologique | légère | sable, limon, pierre, cendre ou sel | — |

Le bloc peut changer la gravité (« la lave exige du volcanisme, gravité moyenne ; la cendre, gravité légère »). Si plusieurs blocs demandent la même chose, une seule tension est levée, avec la gravité la plus forte.

Une exigence vaut pour **tout** monde, quels que soient les blocs : `starAlive` (L1, cosmologique, moyenne) — un monde ne peut pas être plus vieux que son étoile (`blue_sun` + `age: 5`).

En strict, une tension n'est pas comptée deux fois quand **tous** les blocs qui la portent sont déjà dans une contradiction du moteur sur le même axe ; le verdict suit les seuils du moteur (`verdictOf`).

---

## 7. Ce que verrait l'auteur

Un quatrième onglet sous le bloc Âge, **Physique**, ou une section de l'onglet *Détails*. Exemple réel du prototype (Âge « Braise lente » : `lava`, `ash`, `mass: 0.2`, `age: 9`) :

```
Étoile      0,74 M☉ · 4 805 K · lumière 0,29 L☉ · vit 25,2 Ga
Orbite      0,52 UA · flux reçu 1,07 × Terre · année de 161 jours · jour de 25,0 h
Planète     0,20 M⊕ · rayon 0,65 · gravité 0,47 g · densité 3,93 g/cm³ · 9,00 Ga
Intérieur   chaleur 0,090 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
Atmosphère  0,040 bar · retenue à 8 % · 238 K sans effet de serre → 239 K en surface (-34 °C)
Eau         glace
Vivant      lumière au sol 1,07 × Terre

Pourquoi ce monde est ainsi
  • Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
  • Faible gravité et vent d'étoile : l'air fuit dans l'espace.
  • Sous 0,47 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas
  ⚠ moyenne · géologique — L'intérieur est trop froid pour nourrir des volcans (chaleur interne 0,090 ; il faut au moins 0,50).
     Pistes : un monde plus jeune (age: 3,50) · une planète plus massive (mass: 2,60) · une géante toute proche
              qui la pétrit par marée (planet_rings)
```

Idées d'interface (non codées) :

- **Un clic sur une piste l'écrit dans le bloc** (comme le ✓ / × des pages du livre).
- **La chaîne des causes en petit schéma** : étoile → flux → température → eau → vie ; noyau → champ → air. La flèche qui casse est rouge.
- **Les valeurs dans les propriétés de la note** (commande « Update Age data ») : `age_gravity`, `age_temperature`, `age_pressure`, `age_water`, `age_star`… utilisables par Dataview.
- **Le journal d'exploration** pourrait citer la fiche (« L'air est mince ; la glace craque sous les pas »), dans la voix choisie.

La galerie `docs/physique-exemples.md` montre 14 Âges passés par le prototype (et `docs/physics-examples.md` en anglais).

---

## 8. Branchement prévu (non fait)

Tout passe par les crochets existants du moteur (`src/engine/hooks.js`), sans toucher au moteur :

| Où | Quoi |
|---|---|
| `src/entry.js`, `AGEX.skip` | reconnaître `PHYS_RE` (sinon `mass: 2` serait un symbole inconnu, une tache d'encre, qui coûte 10 points cosmologiques : la galerie et le banc simulent déjà ce crochet) |
| `src/entry.js`, `AGEX.adjust` | après la loi du changement : `applyPhysics(out, physicsOf(out, src, graine), this.ext.physics)` |
| `src/settings-ui.js` | réglage `physics` : off / easy / strict (défaut à décider, voir §13) ; libellés `i18n.js` |
| `src/ui-extras.js` | onglet ou section « Physique » : `sheet(analysis.physics, langue)` |
| `src/engine/analysis.js`, `frontmatterFor` | clés `age_gravity`… (via le crochet `adjust`, l'analyse porte `physics`) |
| `build.js` | retirer `"physics"` de `NOT_SHIPPED` ; requérir `./physics/index` (le mini-bundler ne résout pas un dossier seul) |
| `src/guide.js` | une rubrique « Physique » dans le guide et la référence |

Coût mesuré : 0,8 ms par Âge en moyenne (48 essais au plus, plus la recherche des pistes, ≈ 65 essais par paramètre et par tension). À garder en cache par (texte du bloc, graine), comme l'analyse.

---

## 9. Effets sur le rendu (idées)

La fenêtre générative (`src/genscene.js`) pourrait lire la fiche :

- **Couleur du soleil** d'après sa température (corps noir) quand aucune couleur n'est écrite ; **taille apparente** d'après la distance (une naine rouge tout proche est un grand disque terne).
- **Ciel** : air mince → ciel sombre même de jour (Mars) ; air épais → horizon laiteux ; serre emballée → ciel jaune-orangé.
- **Face figée** : le soleil ne bouge plus ; selon la graine, on regarde la face de jour, la nuit, ou la bande du crépuscule.
- **Géante annelée** (`planet_rings`) : elle emplit le ciel, avec ses phases.
- **Gravité** : montagnes et arbres plus hauts sous faible gravité, plus bas et trapus sous forte gravité.
- **Glace** : quand l'eau est de la glace, la mer devient banquise.

---

## 10. Le Relto et le mode campagne

- **Le Relto reste hors physique.** Les pages du Relto ne déclenchent aucune exigence ; c'est la zone sûre.
- En mode campagne, les **lois** pourraient se découvrir comme des pages : « Notes sur les volcans », « Notes sur l'air ». Tant qu'on ne connaît pas une loi, ses tensions apparaissent comme des intuitions vagues (« quelque chose cloche sous terre ») ; une fois découverte, la fiche explique et chiffre. Idée à discuter.
- Le **livre des glyphes** pourrait gagner une page « science » par loi découverte.

---

## 11. Hardcore ++ (plus tard)

- Types spectraux (M, K, G, F, A, B) et vraie zone habitable (Kopparapu) ; éruptions des naines rouges qui décapent l'air.
- Sphère de Hill et limite de Roche (lunes possibles, anneaux) ; résonances orbitales ; excentricité et saisons asymétriques ; obliquité et cycles de Milankovitch.
- Composition de l'air (N₂, O₂, CO₂, H₂, CH₄) au lieu d'une seule pression ; oxygène produit par la vie (grande oxydation) ; H₂ primordial qui garde au chaud une planète errante (Stevenson 1999).
- Bilan d'eau (échappement de l'hydrogène, océans perdus).
- **Trou noir** : un bloc `black_hole` (ou une étoile morte), une fenêtre de liaison qui rend la lentille gravitationnelle (rayon de Schwarzschild 2,95 km par masse solaire, sphère de photons à 1,5 fois ce rayon) et la dilatation du temps d'une orbite proche. Indépendant du reste, mais il lirait les mêmes paramètres.

---

## 12. Ce que le prototype ne fait pas encore

- Une `atmosphere:` écrite en nombre n'est pas confrontée à ce que la planète peut retenir (on pourrait signaler « 3 bar sur un monde de 0,02 M⊕, l'air fuit »).
- Les pistes chiffrées ne font varier qu'un paramètre à la fois (elles n'aggravent jamais le total, mais n'explorent pas les combinaisons).
- Les réactions du moteur (eau + lave → obsidienne) ne sont pas encore pesées par la physique (l'obsidienne exige du volcanisme, c'est tout).
- Pas de saisons, pas de climat par latitude : une seule température moyenne (sauf l'estimation jour / nuit d'un monde figé).
- Les textes sont en français et en anglais dans le code (`rules.js`, `text.js`), pas encore dans `i18n.js`.

---

## 13. Décisions de l'auteur (8 oct. 2026)

| # | Question | Décision |
|---|---|---|
| 1 | Mode par défaut | **Facile** pour tout le monde. |
| 2 | Barème strict | On essaie 10 / 20 / 35 points (léger / moyen / fort), plafond 45 par axe, **en réglage** (curseur « sévérité de la physique » dans les Réglages) pour pouvoir l'adoucir ou le durcir sans toucher au code. |
| 3 | Alias français des lignes | **Gardés** (`masse:`, `âge:`, `noyau:`…). |
| 4 | Bâtisseurs (blocs de ruines : `tablet`, `door`, `bridge`, `lamp`, `book`…) | Ils excusent la vie *trop jeune* pour son monde (quelqu'un l'a apportée : arbres sous une étoile bleue), **pas** la vie *impossible* (sans lumière, sans air, à une température invivable). C'est déjà le comportement du prototype. |
| 5 | Soleil vert / violet | La couleur doit avoir un **effet physique**, pas seulement un coût d'Art. À concevoir : par exemple le violet comme une étoile chaude et ultraviolette (plus de flux, vie plus exposée), le vert comme une étoile de type solaire à la lumière teintée (plantes d'une autre couleur). |
| 6 | Mondes-types (`frozen_world`…) | **Facile** : le monde-type oriente le tirage (vers le froid pour `frozen_world`). **Strict** : il n'oriente rien, il est seulement vérifié (plus dur à tenir). |
| 7 | Où afficher la physique | Une **section de l'onglet *Détails***, retravaillé. |

---

## 14. Deux défauts du moteur, trouvés en route — corrigés en 1.15.3

- **Bug** : les incompatibilités des mondes-types avec le temps qu'il fait (`desert_world` + `rain`, `frozen_world` + `heat`…) étaient rangées sur un axe mal nommé (`"meteorological"` au lieu de `"weather"`) et ne coûtaient rien. Corrigé.
- **Décompte** : le moteur ne gardait qu'une incompatibilité par monde-type (la première). **Décision de l'auteur : toutes comptent.** Le tirage des pages garde l'ancien décompte, pour que les mondes déjà écrits gardent exactement les mêmes pages ; seule leur stabilité change (11,5 % des Âges sur 3 000 essais, −9,8 points en moyenne, jusqu'à −76 quand beaucoup de règles se cumulent). Détails : `docs/NOTES-historique.md`, section 1.15.3.

---

## 15. Feuille de route

| Étape | Contenu | Critère de fin |
|---|---|---|
| **0. Prototype** ✅ | `src/physics/`, tests (279 vérifications), galerie, banc d'essai, relecture indépendante des lois et du code (corrigée) | fait (8 oct. 2026) |
| 1. Décisions ✅ | réponses au §13 | fait (8 oct. 2026) |
| 2. Branchement facile | crochets `skip` / `adjust`, réglage, onglet « Physique », i18n | les 600 Âges de `equiv` inchangés ; fiche lisible dans Obsidian |
| 3. Strict | barème, déduplication avec le moteur, frontmatter | tests de stabilité ; galerie relue par l'auteur |
| 4. Rendu | soleil, ciel, gravité, face figée dans `genscene` | pages de `test/visual` |
| 5. Pistes cliquables | une piste s'écrit dans le bloc | test d'intégration |
| 6. Hardcore ++ | §11, au choix | — |

---

## Annexe — correspondance des blocs

Généré depuis `src/physics/blocks.js` (« réaction » : le bloc ne s'écrit pas, il naît d'une réaction ; *neutre* : la physique ne dit rien de lui).

<!-- 85/135 blocs reliés -->
#### Ciel — stars

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `single_sun` | oui | stars=1 | — |
| `twin_suns` | oui | stars=2 | — |
| `starless` | oui | stars=0 | — |
| `companion_moon` | oui | moon=true | — |

#### Ciel — cycle

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `steady_cycle` | oui |  | *neutre* |
| `erratic_cycle` | oui | chaoticAxis=true | axisChaos (light) |
| `frozen_cycle` | oui | locked=true | lockPlausible (light) |

#### Ciel — orbit

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `stable_orbit` | oui |  | *neutre* |
| `shifting_orbit` | oui |  | *neutre* |
| `chaotic_orbit` | oui |  | *neutre* |
| `close_binary_orbit` | oui | binary=S | — |
| `wide_binary_orbit` | oui | binary=P | — |

#### Ciel — phenomenon

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `auroras` | oui |  | magneticField (light) |
| `recurring_eclipses` | oui |  | *neutre* |
| `permanent_veil` | oui | veil=0.3, albedoAdd=0.15 | — |
| `starfall` | oui |  | *neutre* |

#### Ciel — belt

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `asteroid_belt` | oui |  | *neutre* |
| `asteroid_field` | oui |  | *neutre* |
| `planet_rings` | oui | giantHost=true | — |
| `comet` | oui |  | *neutre* |

#### Ciel — hue

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `green_sun` | oui | hue=green_sun, masse ★ 0.8–1.2 M☉ | realStar (light) |
| `red_sun` | oui | hue=red_sun, masse ★ 0.15–0.5 M☉ | — |
| `white_sun` | oui | hue=white_sun, masse ★ 1.1–1.6 M☉ | — |
| `blue_sun` | oui | hue=blue_sun, masse ★ 3–12 M☉ | — |
| `orange_sun` | oui | hue=orange_sun, masse ★ 0.6–0.9 M☉ | — |
| `violet_sun` | oui | hue=violet_sun, masse ★ 0.8–1.2 M☉ | realStar (light) |

#### Ciel — world

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `frozen_world` | oui | albedoAdd=0.25 | frozenSurface (medium) |
| `lava_world` | oui | water=0.05 | magmaOcean (strong) |
| `desert_world` | oui | water=0.02 | dryClimate (medium), notFurnace (medium) |
| `ocean_world` | oui | water=3 | deepOcean (strong) |
| `jungle_world` | oui | water=1.5 | liquidWater (medium), warmClimate (medium), sunlight (medium), oldEnoughComplex (medium) |

#### Matière — geological

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `water` | oui | water=1 | liquidWater (light) |
| `lava` | oui |  | volcanism (medium) |
| `stone` | oui |  | *neutre* |
| `sand` | oui |  | erosion (light) |
| `salt` | oui |  | *neutre* |
| `ash` | oui |  | volcanism (light) |
| `iron` | oui | coreAdd=0.12 | — |
| `crystal` | oui |  | *neutre* |
| `strange_stone` | oui |  | *neutre* |
| `deep_cold` | oui |  | coldSomewhere (light) |
| `pressure` | oui |  | *neutre* |
| `obsidian` | réaction |  | volcanism (light) |
| `ice` | réaction |  | *neutre* |
| `glass` | réaction |  | volcanism (light) |
| `rust` | réaction |  | *neutre* |
| `brine` | réaction | water=1 | liquidWater (light) |
| `silt` | réaction | water=1 | liquidWater (light) |
| `diamond` | réaction |  | *neutre* |
| `humming_shard` | réaction |  | *neutre* |
| `crying_obsidian` | réaction |  | volcanism (light) |
| `whispering_obsidian` | réaction |  | volcanism (light) |
| `black_ice` | réaction |  | *neutre* |
| `singing_glass` | réaction |  | volcanism (light) |
| `living_rust` | réaction |  | *neutre* |
| `clouded_diamond` | réaction |  | *neutre* |
| `fulgurite` | réaction |  | *neutre* |
| `fissure` | oui |  | *neutre* |
| `cave_fissure` | oui |  | *neutre* |
| `submarine_fissure` | oui |  | *neutre* |
| `no_fissure` | oui |  | *neutre* |
| `gold` | oui |  | hydrothermalPast (light) |
| `silver` | oui |  | hydrothermalPast (light) |
| `copper` | oui |  | hydrothermalPast (light) |
| `gems` | oui |  | *neutre* |
| `pearls` | oui |  | liquidWater (medium), oldEnoughSimple (light) |
| `rare_ore` | oui |  | *neutre* |
| `scorched_surface` | oui |  | scorching (light) |
| `poisoned_air` | oui |  | volcanism (light) |
| `barren_soil` | oui |  | *neutre* |
| `bitter_water` | oui |  | *neutre* |
| `hollowed_ground` | oui |  | *neutre* |
| `ashen_sky` | oui |  | volcanism (light) |

#### Matière — ecological

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `spore` | oui |  | oldEnoughSimple (light), hardyLife (light) |
| `seed` | oui |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `vine` | oui |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `fern` | oui |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `great_tree` | oui |  | sunlight (light), breathableAir (light), temperateLife (light), oldEnoughComplex (light), tallTrees (light) |
| `moss` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `lichen` | réaction |  | oldEnoughSimple (light), hardyLife (light) |
| `pale_fungus` | réaction |  | oldEnoughSimple (light), hardyLife (light) |
| `sapling` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `ironwood` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light), oldEnoughComplex (light), tallTrees (light) |
| `cinderbloom` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `glowvine` | réaction |  | *neutre* |
| `withered_fern` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light) |
| `charred_grove` | réaction |  | *neutre* |
| `grove` | réaction |  | sunlight (light), breathableAir (light), temperateLife (light), oldEnoughComplex (light), tallTrees (light) |
| `singing_lichen` | réaction |  | oldEnoughSimple (light), hardyLife (light) |
| `wrong_glowvine` | réaction |  | *neutre* |
| `moth` | oui |  | foodPlants (light) |
| `grazer` | oui |  | foodPlants (light), oldEnoughComplex (light), breathableAir (light), temperateLife (light) |
| `burrower` | oui |  | soil (light), breathableAir (light), temperateLife (light) |
| `hunter` | oui |  | prey (light), oldEnoughComplex (light), breathableAir (light), temperateLife (light) |
| `drifter` | oui |  | buoyancy (light) |
| `lantern_moths` | réaction |  | foodPlants (light) |
| `herd` | réaction |  | foodPlants (light), oldEnoughComplex (light), breathableAir (light), temperateLife (light) |
| `stalking_pack` | réaction |  | prey (light), oldEnoughComplex (light), breathableAir (light), temperateLife (light) |
| `warren` | réaction |  | soil (light), breathableAir (light), temperateLife (light) |
| `still_drifter` | réaction |  | *neutre* |
| `whispering_moths` | réaction |  | foodPlants (light) |
| `watching_herd` | réaction |  | foodPlants (light), oldEnoughComplex (light), breathableAir (light), temperateLife (light) |
| `humming_warren` | réaction |  | soil (light), breathableAir (light), temperateLife (light) |
| `wildfire` | réaction |  | *neutre* |

#### Matière — metaphysical

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `tablet` | oui |  | *neutre* |
| `lamp` | oui |  | *neutre* |
| `bridge` | oui |  | *neutre* |
| `door` | oui |  | *neutre* |
| `book` | oui |  | *neutre* |
| `worn_tablet` | réaction |  | *neutre* |
| `lit_lamp` | réaction |  | *neutre* |
| `sealed_door` | réaction |  | *neutre* |
| `blurred_book` | réaction |  | *neutre* |
| `fallen_bridge` | réaction |  | *neutre* |
| `speaking_tablet` | réaction |  | *neutre* |

#### Matière — weather

| Bloc | Écrit ? | Fixe | Exige (gravité) |
|---|---|---|---|
| `wind` | oui |  | someAir (medium) |
| `rain` | oui |  | rainCycle (light) |
| `fog` | oui |  | moistAir (light) |
| `lightning` | oui |  | convection (light) |
| `heat` | oui |  | hotSomewhere (light) |
| `storm` | réaction |  | convection (light) |
| `thunderstorm` | réaction |  | convection (light) |
| `marsh_mist` | réaction |  | rainCycle (light) |
| `dust_storm` | réaction |  | someAir (medium) |
| `ash_cloud` | réaction | albedoAdd=0.1, veil=0.6 | volcanism (light) |
| `hail` | réaction |  | convection (light) |
| `steam` | réaction |  | *neutre* |
| `rime` | réaction |  | coldSomewhere (light) |
| `meltwater` | réaction | water=1 | thawing (light) |
| `spore_cloud` | réaction |  | *neutre* |
| `charged_crystal` | réaction |  | *neutre* |
| `whispering_storm` | réaction |  | convection (light) |
| `waiting_thunder` | réaction |  | convection (light) |
| `watching_mist` | réaction |  | rainCycle (light) |
| `black_hail` | réaction |  | convection (light) |

