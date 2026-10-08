# Couche physique — galerie d'Âges (prototype)

> Généré par `node tools/physics-report.js`. La physique n'est **pas encore branchée** sur le plugin : ces fiches montrent ce que verrait l'onglet « Physique ». Tirage des pages coupé (seul ce qui est écrit compte). Graine = nom de l'Âge.

## Terre-mère

*Le témoin : un monde tempéré, rien ne grince.*

```age
single_sun
water
stone
rain
fern
grazer
```

- **Étoile** : 0,80 M☉ (5 042 K) · lumière 0,40 L☉ · vit 19,8 Ga
- **Orbite** : 0,60 UA · flux reçu 1,14 × Terre · année de 188 jours · jour de 41,7 h
- **Planète** : 0,66 M⊕ · rayon 0,90 · gravité 0,82 g · densité 5,04 g/cm³ · 4,23 Ga
- **Intérieur** : chaleur 0,85 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,61 × Terre
- **Atmosphère** : 0,96 bar · retenue à 95 % · 263 K sans effet de serre → 296 K en surface (23 °C)
- **Eau** : liquide (bout à 372 K)
- **Vivant** : lumière au sol 0,99 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 42 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 33 K.

Rien ne grince.

Stabilité : 85 (stable) → strict 85 (stable) · monde retenu n° 1/48, coût 0,00

## Forge

*La lave demande un intérieur chaud : le tirage choisit un monde jeune ou massif.*

```age
lava
water
stone
ash
```

- **Étoile** : 1,19 M☉ (6 531 K) · lumière 1,98 L☉ · vit 5,98 Ga
- **Orbite** : 1,17 UA · flux reçu 1,45 × Terre · année de 424 jours · jour de 10,5 h
- **Planète** : 1,33 M⊕ · rayon 1,09 · gravité 1,13 g · densité 5,72 g/cm³ · 5,68 Ga
- **Intérieur** : chaleur 0,85 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,18 × Terre
- **Atmosphère** : 1,59 bar · retenue à 97 % · 280 K sans effet de serre → 337 K en surface (63 °C)
- **Eau** : liquide (bout à 386 K)
- **Vivant** : lumière au sol 1,54 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 10 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- Plus près de l'étoile que le bord intérieur de la zone habitable : l'eau y lutte contre l'évaporation.
- L'effet de serre ajoute 57 K.

Rien ne grince.

Stabilité : 70 (unstable) → strict 70 (unstable) · monde retenu n° 2/48, coût 0,00

## Braise lente

*Un petit monde très vieux à qui l'on demande des volcans : la physique proteste et propose des lignes.*

```age
lava
ash
mass: 0.2
age: 9
```

- **Étoile** : 0,74 M☉ (4 805 K) · lumière 0,29 L☉ · vit 25,2 Ga
- **Orbite** : 0,71 UA · flux reçu 0,58 × Terre · année de 256 jours · jour de 20,0 h
- **Planète** : 0,20 M⊕ · rayon 0,65 · gravité 0,48 g · densité 4,08 g/cm³ · 9,00 Ga
- **Intérieur** : chaleur 0,089 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,19 bar · retenue à 38 % · 204 K sans effet de serre → 208 K en surface (-65 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,47 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Sous 0,48 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas :

- **medium** · geological — L'intérieur est trop froid pour nourrir des volcans (chaleur interne 0,089 ; il faut au moins 0,50).
  - Pistes : un monde plus jeune (age: 3,5) ; une planète plus massive (mass: 2,6) ; une géante toute proche qui la pétrit par marée (planet_rings)

Stabilité : 92 (stable) → strict 72 (unstable) · monde retenu n° 1/48, coût 0,20

## Crépuscule

*Autour d'une naine rouge, la marée fige la rotation : une face au soleil, l'autre dans la nuit.*

```age
red_sun
frozen_cycle
water
spore
fern
wind
```

- **Étoile** : 0,17 M☉ (2 923 K) · lumière 0,0037 L☉ · vit 448 Ga
- **Orbite** : 0,070 UA · flux reçu 0,75 × Terre · année de 16,7 jours · face fixe (jour = 16,7 jours terrestres)
- **Planète** : 1,96 M⊕ · rayon 1,22 · gravité 1,31 g · densité 5,91 g/cm³ · 0,50 Ga
- **Intérieur** : chaleur 4,52 × Terre (dont marée 0,10) · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,26 × Terre
- **Atmosphère** : 2,89 bar · retenue à 99 % · 237 K sans effet de serre → 319 K en surface (46 °C)
- **Eau** : liquide (bout à 406 K)
- **Vivant** : lumière au sol 0,15 × Terre

Pourquoi ce monde est ainsi :

- Une étoile froide : elle chauffe plus qu'elle n'éclaire (19 % de la lumière visible du Soleil, à chaleur égale).
- La marée de l'étoile a figé sa rotation : la face de jour monte vers 70 °C, la face de nuit descend vers 9 °C, et la vie tient la bande du crépuscule.
- Noyau liquide et rotation de 400 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 81 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.

Rien ne grince.

Stabilité : 77 (stable) → strict 77 (stable) · monde retenu n° 1/48, coût 0,00

## Midi figé

*La même face figée autour d'un soleil jaune : peu plausible, et le monde le dit.*

```age
single_sun
frozen_cycle
water
```

- **Étoile** : 1,29 M☉ (6 923 K) · lumière 2,75 L☉ · vit 4,68 Ga
- **Orbite** : 1,36 UA · flux reçu 1,48 × Terre · année de 512 jours · face fixe (jour = 512 jours terrestres)
- **Planète** : 0,42 M⊕ · rayon 0,79 · gravité 0,66 g · densité 4,60 g/cm³ · 4,45 Ga
- **Intérieur** : chaleur 0,61 × Terre · volcans actifs · croûte figée · noyau liquide · champ magnétique faible
- **Atmosphère** : 0,13 bar · retenue à 19 % · 281 K sans effet de serre → 285 K en surface (12 °C)
- **Eau** : liquide (bout à 322 K)
- **Vivant** : lumière au sol 1,59 × Terre

Pourquoi ce monde est ainsi :

- La marée de l'étoile a figé sa rotation : la face de jour monte vers 87 °C, la face de nuit descend vers -102 °C, et la vie tient la bande du crépuscule.
- Le noyau est liquide, mais il tourne trop lentement : la dynamo reste faible, sans vrai bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.

Ce qui ne tient pas :

- **light** · cosmological — À 1,36 UA d'une étoile de 1,29 M☉, un monde met environ 76 978 Ga à cesser de tourner sur lui-même ; il n'a que 4,45 Ga.
  - Pistes : un petit soleil rouge et une orbite serrée : la marée y fige vite la rotation (red_sun) ; faire de ce monde la lune d'une géante, qui lui montre toujours la même face (planet_rings)

Stabilité : 85 (stable) → strict 75 (stable) · monde retenu n° 1/48, coût 0,10

## Io

*La lune d'une géante, chauffée par ses marées.*

```age
planet_rings
lava
steam
water
```

- **Étoile** : 0,96 M☉ (5 651 K) · lumière 0,86 L☉ · vit 11,2 Ga
- **Orbite** : 1,02 UA · flux reçu 0,83 × Terre · année de 381 jours · jour de 83,2 h
- **Planète** : 0,89 M⊕ · rayon 0,93 · gravité 1,03 g · densité 6,15 g/cm³ · 8,90 Ga
- **Intérieur** : chaleur 2,44 × Terre (dont marée 2,19) · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,31 × Terre
- **Atmosphère** : 1,30 bar · retenue à 98 % · 244 K sans effet de serre → 285 K en surface (11 °C)
- **Eau** : liquide (bout à 380 K)
- **Vivant** : lumière au sol 0,82 × Terre

Pourquoi ce monde est ainsi :

- Ce monde est la lune d'une géante annelée : elle emplit son ciel et le pétrit par ses marées.
- Noyau liquide et rotation de 83 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 41 K.

Rien ne grince.

Stabilité : 66 (unstable) → strict 66 (unstable) · monde retenu n° 1/48, coût 0,00

## Errante

*Sans étoile : l'eau gèle, les champignons vivent de la chaleur du sol, les arbres non.*

```age
starless
water
spore
pale_fungus
great_tree
```

- **Étoile** : aucune : seule la chaleur du sol
- **Orbite** : errante, sans étoile · jour de 24,2 h
- **Planète** : 1,16 M⊕ · rayon 1,06 · gravité 1,02 g · densité 5,28 g/cm³ · 2,81 Ga
- **Intérieur** : chaleur 1,76 × Terre · volcans actifs · croûte figée · noyau liquide · champ magnétique 0,99 × Terre
- **Atmosphère** : 1,35 bar · retenue à 100 % · 40 K sans effet de serre → 47 K en surface (-226 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,00 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 24 h : un champ magnétique, que nul vent d'étoile ne vient éprouver.
- Si froid que l'air lui-même gèle et tombe en neige.
- L'effet de serre ajoute 7 K.
- Sous la glace, la chaleur du sol peut garder un océan caché.

Ce qui ne tient pas :

- **light** · geological — À 47 K en surface, l'eau est de la glace.
  - Pistes : ou assumer la glace : deep_cold, frozen_world
- **light** · ecological (déjà compté par le moteur) — Les plantes vertes vivent de lumière, et il n'en arrive presque pas jusqu'au sol.
  - Pistes : des champignons et des spores, qui vivent de chaleur (spore, pale_fungus) ; une lumière à elles (glowvine)
- **light** · ecological (déjà compté par le moteur) — À -226 °C, la sève gèle : rien de vert ne pousse à découvert.
  - Pistes : ou une vie plus rude : lichen, mousse, champignons

Stabilité : 41 (unstable) → strict 41 (unstable) · monde retenu n° 3/48, coût 0,30

## Bleue

*Une étoile bleue vit trop peu pour que l'évolution fasse des arbres…*

```age
blue_sun
great_tree
grazer
```

- **Étoile** : 3,06 M☉ (12 147 K) · lumière 69,8 L☉ · vit 0,44 Ga
- **Orbite** : 9,59 UA · flux reçu 0,76 × Terre · année de 6 206 jours · jour de 12,0 h
- **Planète** : 2,88 M⊕ · rayon 1,32 · gravité 1,64 g · densité 6,84 g/cm³ · 0,42 Ga
- **Intérieur** : chaleur 5,49 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 2,28 × Terre
- **Atmosphère** : 2,77 bar · retenue à 100 % · 238 K sans effet de serre → 317 K en surface (43 °C)
- **Eau** : liquide (bout à 404 K)
- **Vivant** : lumière au sol 0,53 × Terre

Pourquoi ce monde est ainsi :

- Une étoile si ardente ne vit que 438 millions d'années : ce monde est forcément jeune.
- Une étoile chaude, riche en ultraviolets (4,87 × le Soleil) : il faut un air épais pour vivre à découvert.
- Noyau liquide et rotation de 12 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 79 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.
- Sous 1,64 g, les montagnes restent basses et les êtres trapus.

Ce qui ne tient pas :

- **light** · ecological — Une étoile de 3,06 M☉ s'éteint en 438 millions d'années ; il en faut environ mille pour des arbres et des bêtes.
  - Pistes : un soleil moins ardent (orange_sun, single_sun) ; ou des bâtisseurs qui les ont apportés (tablet, door, bridge…)

Stabilité : 76 (stable) → strict 76 (stable) · monde retenu n° 29/48, coût 0,10

## Bleue semée

*… sauf si des bâtisseurs les ont apportés.*

```age
blue_sun
great_tree
grazer
tablet
door
```

- **Étoile** : 7,53 M☉ (20 675 K) · lumière 1 637 L☉ · vit 0,046 Ga
- **Orbite** : 40,1 UA · flux reçu 1,02 × Terre · année de 33 850 jours · jour de 33,4 h
- **Planète** : 1,30 M⊕ · rayon 1,10 · gravité 1,08 g · densité 5,43 g/cm³ · 0,044 Ga
- **Intérieur** : chaleur 4,08 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,87 × Terre
- **Atmosphère** : 2,09 bar · retenue à 98 % · 256 K sans effet de serre → 322 K en surface (49 °C)
- **Eau** : liquide (bout à 395 K)
- **Vivant** : lumière au sol 0,27 × Terre

Pourquoi ce monde est ainsi :

- Une étoile si ardente ne vit que 46,0 millions d'années : ce monde est forcément jeune.
- Une étoile froide : elle chauffe plus qu'elle n'éclaire (27 % de la lumière visible du Soleil, à chaleur égale).
- Une étoile chaude, riche en ultraviolets (6,22 × le Soleil) : il faut un air épais pour vivre à découvert.
- Noyau liquide et rotation de 33 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 66 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.

Rien ne grince.

Stabilité : 76 (stable) → strict 76 (stable) · monde retenu n° 1/48, coût 0,00

## Mer sans rivage

*Un monde-océan, une lune, des dériveurs.*

```age
ocean_world
water
drifter
companion_moon
```

- **Étoile** : 1,10 M☉ (6 183 K) · lumière 1,46 L☉ · vit 7,53 Ga
- **Orbite** : 1,02 UA · flux reçu 1,41 × Terre · année de 358 jours · jour de 22,1 h
- **Planète** : 0,95 M⊕ · rayon 1,00 · gravité 0,95 g · densité 5,28 g/cm³ · 7,15 Ga
- **Intérieur** : chaleur 0,49 × Terre · volcans éteints · croûte figée · noyau liquide · champ magnétique 0,43 × Terre
- **Atmosphère** : 0,59 bar · retenue à 96 % · 278 K sans effet de serre → 298 K en surface (25 °C)
- **Eau** : liquide (bout à 359 K)
- **Vivant** : lumière au sol 1,46 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 22 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 21 K.

Rien ne grince.

Stabilité : 91 (stable) → strict 91 (stable) · monde retenu n° 1/48, coût 0,00

## Poussière

*Un petit désert : assez d'air pour les tempêtes de sable ?*

```age
desert_world
sand
wind
dust_storm
mass: 0.3
```

- **Étoile** : 1,07 M☉ (6 072 K) · lumière 1,32 L☉ · vit 8,12 Ga
- **Orbite** : 0,95 UA · flux reçu 1,47 × Terre · année de 325 jours · jour de 15,9 h
- **Planète** : 0,30 M⊕ · rayon 0,71 · gravité 0,59 g · densité 4,60 g/cm³ · 7,54 Ga
- **Intérieur** : chaleur 0,19 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,042 bar · retenue à 8 % · 281 K sans effet de serre → 282 K en surface (8 °C)
- **Eau** : liquide (bout à 300 K)
- **Vivant** : lumière au sol 1,52 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.

Rien ne grince.

Stabilité : 68 (unstable) → strict 68 (unstable) · monde retenu n° 2/48, coût 0,00

## Aurores mortes

*Des aurores sans champ magnétique.*

```age
auroras
mass: 0.1
age: 8
```

- **Étoile** : 1,03 M☉ (5 903 K) · lumière 1,13 L☉ · vit 9,14 Ga
- **Orbite** : 1,16 UA · flux reçu 0,84 × Terre · année de 450 jours · jour de 15,5 h
- **Planète** : 0,10 M⊕ · rayon 0,53 · gravité 0,36 g · densité 3,74 g/cm³ · 8,00 Ga
- **Intérieur** : chaleur 0,073 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,0017 bar · retenue à 1 % · 224 K sans effet de serre → 224 K en surface (-49 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,85 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.
- Si peu d'air que la glace passe directement en vapeur : l'eau ne coule jamais.
- Sous 0,36 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas :

- **light** · cosmological — Le noyau s'est figé (chaleur interne 0,073) : pas de dynamo, donc des aurores faibles et diffuses, comme sur Mars.
  - Pistes : un monde plus jeune (age: 2,8) ; une planète plus massive (mass: 1,3) ; plus de fer au cœur (iron)

Stabilité : 75 (stable) → strict 65 (unstable) · monde retenu n° 1/48, coût 0,10

## Ciel vert

*Un soleil vert : pas une faute physique, un coût d'Art.*

```age
green_sun
water
fern
```

- **Étoile** : 1,04 M☉ (5 929 K) · lumière 1,15 L☉ · vit 8,98 Ga
- **Orbite** : 0,91 UA · flux reçu 1,40 × Terre · année de 311 jours · jour de 20,9 h
- **Planète** : 0,21 M⊕ · rayon 0,65 · gravité 0,50 g · densité 4,26 g/cm³ · 1,35 Ga
- **Intérieur** : chaleur 1,09 × Terre · volcans actifs · croûte figée · noyau liquide · champ magnétique 1,35 × Terre
- **Atmosphère** : 1,03 bar · retenue à 71 % · 277 K sans effet de serre → 314 K en surface (41 °C)
- **Eau** : liquide (bout à 374 K)
- **Vivant** : lumière au sol 1,42 × Terre

Pourquoi ce monde est ainsi :

- Sous un soleil vert, les plantes boiraient le vert au lieu de le renvoyer : feuillages pourpres, presque noirs.
- Noyau liquide et rotation de 21 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- Plus près de l'étoile que le bord intérieur de la zone habitable : l'eau y lutte contre l'évaporation.
- L'effet de serre ajoute 37 K.

Ce qui ne tient pas :

- **light** · metaphysical — Aucune étoile ne brille vert ou violet : une étoile qui émet surtout du vert nous paraît blanche. Ce ciel tient de l'Art, pas de la nature.
  - Pistes : garder ce soleil, en connaissance de cause : il coûte un peu d'Art

Stabilité : 77 (stable) → strict 77 (stable) · monde retenu n° 2/48, coût 0,10

## Jumeaux

*Deux soleils, une orbite qui fait le tour des deux.*

```age
twin_suns
wide_binary_orbit
water
fern
rain
```

- **Étoiles** : 1,21 M☉ (6 623 K) + 0,75 M☉ (4 868 K) · lumière 2,47 L☉ · vit 5,64 Ga
- **Orbite** : 1,76 UA · flux reçu 0,80 × Terre · année de 609 jours · jour de 18,8 h
- **Planète** : 2,13 M⊕ · rayon 1,19 · gravité 1,50 g · densité 6,95 g/cm³ · 0,70 Ga
- **Intérieur** : chaleur 4,36 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 2,40 × Terre
- **Atmosphère** : 1,55 bar · retenue à 100 % · 241 K sans effet de serre → 289 K en surface (15 °C)
- **Eau** : liquide (bout à 386 K)
- **Vivant** : lumière au sol 0,82 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 19 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 48 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.
- Sous 1,50 g, les montagnes restent basses et les êtres trapus.

Rien ne grince.

Stabilité : 75 (stable) → strict 75 (stable) · monde retenu n° 1/48, coût 0,00

## Soleil noir

*Une naine brune : de la chaleur, presque pas de lumière. Les plantes boivent l'infrarouge.*

```age
black_sun
water
fern
stone
```

- **Étoile** : 0,049 M☉ (1 470 K) · lumière 0,000042 L☉ · ne brûle pas : se refroidit lentement
- **Orbite** : 0,0053 UA · flux reçu 1,48 × Terre · année de 0,65 jour · face fixe (jour = 0,65 jours terrestres)
- **Planète** : 0,37 M⊕ · rayon 0,76 · gravité 0,63 g · densité 4,55 g/cm³ · 3,41 Ga
- **Intérieur** : chaleur 1,07 × Terre (dont marée 0,30) · volcans actifs · croûte figée · noyau liquide · champ magnétique 1,32 × Terre
- **Atmosphère** : 0,52 bar · retenue à 84 % · 281 K sans effet de serre → 299 K en surface (26 °C)
- **Eau** : liquide (bout à 355 K)
- **Vivant** : lumière au sol 0,0016 × Terre

Pourquoi ce monde est ainsi :

- Un soleil noir : une naine brune, presque toute sa lumière est infrarouge. Le jour est une pénombre rouge sombre, les couleurs s'éteignent en gris, et les plantes, pour boire cette chaleur, seraient presque noires.
- Une orbite serrée (0,0053 UA) : une année de 0,65 jour, et la marée de l'étoile chauffe l'intérieur.
- Rien ne l'a écrit, mais l'étoile est si proche que sa marée a eu le temps de figer la rotation.
- La marée de l'étoile a figé sa rotation : la face de jour monte vers 85 °C, la face de nuit descend vers -62 °C, et la vie tient la bande du crépuscule.
- Noyau liquide et rotation de 15 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 18 K.

Rien ne grince.

Stabilité : 74 (unstable) → strict 74 (unstable) · monde retenu n° 1/48, coût 0,00

## Super-Terre

*Un monde lourd : plaques en mouvement, montagnes basses, arbres trapus.*

```age
heavy_world
rifts
water
great_tree
```

- **Étoile** : 1,18 M☉ (6 517 K) · lumière 1,96 L☉ · vit 6,03 Ga
- **Orbite** : 1,86 UA · flux reçu 0,56 × Terre · année de 854 jours · jour de 16,5 h
- **Planète** : 2,81 M⊕ · rayon 1,33 · gravité 1,58 g · densité 6,56 g/cm³ · 5,73 Ga
- **Intérieur** : chaleur 1,29 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,40 × Terre
- **Atmosphère** : 2,30 bar · retenue à 100 % · 221 K sans effet de serre → 283 K en surface (10 °C)
- **Eau** : liquide (bout à 398 K)
- **Vivant** : lumière au sol 0,60 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 17 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 62 K.
- Sous 1,58 g, les montagnes restent basses et les êtres trapus.

Rien ne grince.

Stabilité : 75 (stable) → strict 75 (stable) · monde retenu n° 1/48, coût 0,00

## Lune glacée

*Un océan caché sous la glace, chauffé par la marée d'une géante.*

```age
planet_rings
subsurface_ocean
distant_orbit
```

- **Étoile** : 1,15 M☉ (6 395 K) · lumière 1,76 L☉ · vit 6,53 Ga
- **Orbite** : 1,93 UA · flux reçu 0,47 × Terre · année de 914 jours · jour de 53,5 h
- **Planète** : 0,86 M⊕ · rayon 0,95 · gravité 0,95 g · densité 5,54 g/cm³ · 5,23 Ga
- **Intérieur** : chaleur 4,01 × Terre (dont marée 3,27) · volcans actifs · croûte figée · noyau liquide · champ magnétique 1,17 × Terre
- **Atmosphère** : 1,52 bar · retenue à 99 % · 211 K sans effet de serre → 253 K en surface (-21 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,50 × Terre

Pourquoi ce monde est ainsi :

- Ce monde est la lune d'une géante annelée : elle emplit son ciel et le pétrit par ses marées.
- Noyau liquide et rotation de 53 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 41 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.

Rien ne grince.

Stabilité : 73 (unstable) → strict 73 (unstable) · monde retenu n° 1/48, coût 0,00

## Jeune et lourd

*Un monde neuf, brûlant dessous, à l'air épais.*

```age
young_world
heavy_world
geysers
thick_air
```

- **Étoile** : 0,75 M☉ (4 843 K) · lumière 0,31 L☉ · vit 24,2 Ga
- **Orbite** : 0,51 UA · flux reçu 1,20 × Terre · année de 153 jours · jour de 20,6 h
- **Planète** : 3,44 M⊕ · rayon 1,40 · gravité 1,75 g · densité 6,87 g/cm³ · 0,10 Ga
- **Intérieur** : chaleur 6,53 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,52 × Terre
- **Atmosphère** : 3,61 bar · retenue à 100 % · 267 K sans effet de serre → 376 K en surface (102 °C)
- **Eau** : liquide (bout à 413 K)
- **Vivant** : lumière au sol 0,99 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 21 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- Plus près de l'étoile que le bord intérieur de la zone habitable : l'eau y lutte contre l'évaporation.
- L'effet de serre ajoute 109 K.
- Un intérieur brûlant : volcans partout, séismes fréquents, un sol jeune qui bouge sans cesse.
- Sous 1,75 g, les montagnes restent basses et les êtres trapus.

Rien ne grince.

Stabilité : 69 (unstable) → strict 69 (unstable) · monde retenu n° 1/48, coût 0,00

## Noyau mort

*Un vieux petit monde sans bouclier : les aurores ne tiennent pas.*

```age
ancient_world
light_world
dead_core
thin_air
auroras
```

- **Étoile** : 1,01 M☉ (5 806 K) · lumière 1,03 L☉ · vit 9,80 Ga
- **Orbite** : 1,56 UA · flux reçu 0,42 × Terre · année de 708 jours · jour de 43,0 h
- **Planète** : 0,11 M⊕ · rayon 0,55 · gravité 0,36 g · densité 3,67 g/cm³ · 7,05 Ga
- **Intérieur** : chaleur 0,11 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,065 bar · retenue à 23 % · 189 K sans effet de serre → 190 K en surface (-83 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,42 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.
- Sous 0,36 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas :

- **light** · cosmological — Le noyau s'est figé (chaleur interne 0,11) : pas de dynamo, donc des aurores faibles et diffuses, comme sur Mars.
  - Pistes : plus de fer au cœur (iron)

Stabilité : 67 (unstable) → strict 57 (unstable) · monde retenu n° 3/48, coût 0,10

