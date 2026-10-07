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

- **Étoile** : 0,73 M☉ · 4 797 K · lumière 0,29 L☉ · vit 25,4 Ga
- **Orbite** : 0,52 UA · flux reçu 1,07 × Terre · année de 160 jours · jour de 11,8 h
- **Planète** : 0,78 M⊕ · rayon 0,94 · gravité 0,90 g · densité 5,27 g/cm³ · 1,69 Ga
- **Intérieur** : chaleur 1,96 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 2,15 × Terre
- **Atmosphère** : 1,00 bar · retenue à 97 % · 259 K sans effet de serre → 293 K en surface (19 °C)
- **Eau** : liquide (bout à 373 K)
- **Vivant** : lumière au sol 1,07 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 12 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 34 K.

Rien ne grince.

Stabilité : 85 (stable) → strict 85 (stable) · monde retenu n° 3/48, coût 0,00

## Forge

*La lave demande un intérieur chaud : le tirage choisit un monde jeune ou massif.*

```age
lava
water
stone
ash
```

- **Étoile** : 0,76 M☉ · 4 915 K · lumière 0,34 L☉ · vit 22,5 Ga
- **Orbite** : 0,75 UA · flux reçu 0,60 × Terre · année de 273 jours · jour de 33,7 h
- **Planète** : 1,02 M⊕ · rayon 1,00 · gravité 1,03 g · densité 5,70 g/cm³ · 6,79 Ga
- **Intérieur** : chaleur 0,52 × Terre · volcans actifs · croûte figée · noyau liquide · champ magnétique 0,51 × Terre
- **Atmosphère** : 1,82 bar · retenue à 99 % · 224 K sans effet de serre → 276 K en surface (3 °C)
- **Eau** : liquide (bout à 391 K)
- **Vivant** : lumière au sol 0,60 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 34 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 52 K.

Rien ne grince.

Stabilité : 70 (unstable) → strict 70 (unstable) · monde retenu n° 1/48, coût 0,00

## Braise lente

*Un petit monde très vieux à qui l'on demande des volcans : la physique proteste et propose des lignes.*

```age
lava
ash
mass: 0.2
age: 9
```

- **Étoile** : 0,74 M☉ · 4 805 K · lumière 0,29 L☉ · vit 25,2 Ga
- **Orbite** : 0,52 UA · flux reçu 1,07 × Terre · année de 161 jours · jour de 25,0 h
- **Planète** : 0,20 M⊕ · rayon 0,65 · gravité 0,47 g · densité 3,93 g/cm³ · 9,00 Ga
- **Intérieur** : chaleur 0,090 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,040 bar · retenue à 8 % · 238 K sans effet de serre → 239 K en surface (-34 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 1,07 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.
- Sous 0,47 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas :

- **medium** · geological — L'intérieur est trop froid pour nourrir des volcans (chaleur interne 0,090 ; il faut au moins 0,50).
  - Pistes : un monde plus jeune (age: 3,50) ; une planète plus massive (mass: 2,60) ; une géante toute proche qui la pétrit par marée (planet_rings)

Stabilité : 60 (unstable) → strict 60 (unstable) · monde retenu n° 1/48, coût 0,20

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

- **Étoile** : 0,20 M☉ · 3 026 K · lumière 0,006 L☉ · vit 346 Ga
- **Orbite** : 0,056 UA · flux reçu 1,85 × Terre · année de 11 jours · face fixe (jour = 10,8 jours terrestres)
- **Planète** : 0,96 M⊕ · rayon 0,97 · gravité 1,02 g · densité 5,84 g/cm³ · 3,89 Ga
- **Intérieur** : chaleur 1,25 × Terre (dont marée 0,10) · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique aucun
- **Atmosphère** : 0,61 bar · retenue à 53 % · 297 K sans effet de serre → 320 K en surface (47 °C)
- **Eau** : liquide (bout à 359 K)
- **Vivant** : lumière au sol 1,85 × Terre

Pourquoi ce monde est ainsi :

- La marée de l'étoile a figé sa rotation : la face de jour monte vers 107 °C, la face de nuit descend vers -42 °C, et la vie tient la bande du crépuscule.
- Le noyau est liquide, mais la rotation trop lente pour une dynamo : pas de bouclier magnétique.
- L'effet de serre ajoute 23 K.

Rien ne grince.

Stabilité : 77 (stable) → strict 77 (stable) · monde retenu n° 3/48, coût 0,00

## Midi figé

*La même face figée autour d'un soleil jaune : peu plausible, et le monde le dit.*

```age
single_sun
frozen_cycle
water
```

- **Étoile** : 0,83 M☉ · 5 162 K · lumière 0,47 L☉ · vit 17,6 Ga
- **Orbite** : 0,70 UA · flux reçu 0,96 × Terre · année de 236 jours · face fixe (jour = 236 jours terrestres)
- **Planète** : 2,99 M⊕ · rayon 1,36 · gravité 1,62 g · densité 6,59 g/cm³ · 4,80 Ga
- **Intérieur** : chaleur 1,72 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique aucun
- **Atmosphère** : 1,17 bar · retenue à 95 % · 252 K sans effet de serre → 290 K en surface (17 °C)
- **Eau** : liquide (bout à 377 K)
- **Vivant** : lumière au sol 0,96 × Terre

Pourquoi ce monde est ainsi :

- La marée de l'étoile a figé sa rotation : la face de jour monte vers 57 °C, la face de nuit descend vers -43 °C, et la vie tient la bande du crépuscule.
- Le noyau est liquide, mais la rotation trop lente pour une dynamo : pas de bouclier magnétique.
- L'effet de serre ajoute 38 K.
- Sous 1,62 g, les montagnes restent basses et les êtres trapus.

Ce qui ne tient pas :

- **light** · cosmological — À 0,70 UA d'une étoile de 0,83 M☉, un monde met environ 8 701 Ga à cesser de tourner sur lui-même ; il n'a que 4,80 Ga.
  - Pistes : plus près de l'étoile (insolation: 13,0) ; un soleil rouge : on s'en tient tout près, et la marée fige vite la rotation (red_sun) ; faire de ce monde la lune d'une géante, qui lui montre toujours la même face (planet_rings)

Stabilité : 85 (stable) → strict 75 (stable) · monde retenu n° 3/48, coût 0,10

## Io

*La lune d'une géante, chauffée par ses marées.*

```age
planet_rings
lava
steam
water
```

- **Étoile** : 0,96 M☉ · 5 651 K · lumière 0,86 L☉ · vit 11,2 Ga
- **Orbite** : 0,93 UA · flux reçu 0,99 × Terre · année de 336 jours · jour de 49,9 h
- **Planète** : 1,68 M⊕ · rayon 1,14 · gravité 1,30 g · densité 6,29 g/cm³ · 8,60 Ga
- **Intérieur** : chaleur 1,14 × Terre (dont marée 0,71) · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,92 × Terre
- **Atmosphère** : 0,93 bar · retenue à 99 % · 254 K sans effet de serre → 285 K en surface (12 °C)
- **Eau** : liquide (bout à 371 K)
- **Vivant** : lumière au sol 0,99 × Terre

Pourquoi ce monde est ainsi :

- Ce monde est la lune d'une géante annelée : elle emplit son ciel et le pétrit par ses marées.
- Noyau liquide et rotation de 50 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 31 K.

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
- **Orbite** : errante, sans étoile · jour de 19,5 h
- **Planète** : 0,73 M⊕ · rayon 0,92 · gravité 0,86 g · densité 5,16 g/cm³ · 2,40 Ga
- **Intérieur** : chaleur 1,53 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,63 × Terre
- **Atmosphère** : 2,67 bar · retenue à 100 % · 39 K sans effet de serre → 51 K en surface (-222 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,00 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 20 h : un champ magnétique, que nul vent d'étoile ne vient éprouver.
- L'effet de serre ajoute 12 K.
- Sous la glace, la chaleur du sol peut garder un océan caché.

Ce qui ne tient pas :

- **light** · geological — À 51 K en surface, l'eau est de la glace.
  - Pistes : ou assumer la glace : deep_cold, frozen_world
- **light** · ecological (déjà compté par le moteur) — Les plantes vertes vivent de lumière, et il n'en arrive presque pas jusqu'au sol.
  - Pistes : des champignons et des spores, qui vivent de chaleur (spore, pale_fungus) ; une lumière à elles (glowvine)
- **light** · ecological (déjà compté par le moteur) — À -222 °C, la sève gèle : rien de vert ne pousse à découvert.
  - Pistes : ou une vie plus rude : lichen, mousse, champignons

Stabilité : 70 (unstable) → strict 70 (unstable) · monde retenu n° 2/48, coût 0,30

## Bleue

*Une étoile bleue vit trop peu pour que l'évolution fasse des arbres…*

```age
blue_sun
great_tree
grazer
```

- **Étoile** : 10,5 M☉ · 25 154 K · lumière 5 238 L☉ · vit 0,020 Ga
- **Orbite** : 80,3 UA · flux reçu 0,81 × Terre · année de 81 098 jours · jour de 30,0 h
- **Planète** : 1,38 M⊕ · rayon 1,09 · gravité 1,16 g · densité 5,85 g/cm³ · 0,019 Ga
- **Intérieur** : chaleur 4,22 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,34 × Terre
- **Atmosphère** : 1,77 bar · retenue à 99 % · 242 K sans effet de serre → 296 K en surface (23 °C)
- **Eau** : liquide (bout à 390 K)
- **Vivant** : lumière au sol 0,81 × Terre

Pourquoi ce monde est ainsi :

- Une étoile si ardente ne vit que 20 millions d'années : ce monde est forcément jeune.
- Noyau liquide et rotation de 30 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 54 K.
- Assez de chaleur pour un océan de magma sous la croûte : le sol est jeune, et il bouge.

Ce qui ne tient pas :

- **light** · ecological — Une étoile de 10,5 M☉ s'éteint en 20 millions d'années ; il en faut environ mille pour des arbres et des bêtes.
  - Pistes : un soleil moins ardent (orange_sun, single_sun) ; ou des bâtisseurs qui les ont apportés (tablet, door, bridge…)

Stabilité : 76 (stable) → strict 76 (stable) · monde retenu n° 3/48, coût 0,10

## Bleue semée

*… sauf si des bâtisseurs les ont apportés.*

```age
blue_sun
great_tree
grazer
tablet
door
```

- **Étoile** : 7,53 M☉ · 20 675 K · lumière 1 637 L☉ · vit 0,046 Ga
- **Orbite** : 35,1 UA · flux reçu 1,33 × Terre · année de 27 671 jours · jour de 30,4 h
- **Planète** : 0,83 M⊕ · rayon 0,94 · gravité 0,94 g · densité 5,54 g/cm³ · 0,044 Ga
- **Intérieur** : chaleur 3,26 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 1,59 × Terre
- **Atmosphère** : 1,11 bar · retenue à 96 % · 274 K sans effet de serre → 313 K en surface (40 °C)
- **Eau** : liquide (bout à 376 K)
- **Vivant** : lumière au sol 1,33 × Terre

Pourquoi ce monde est ainsi :

- Une étoile si ardente ne vit que 46 millions d'années : ce monde est forcément jeune.
- Noyau liquide et rotation de 30 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 39 K.
- Assez de chaleur pour un océan de magma sous la croûte : le sol est jeune, et il bouge.

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

- **Étoile** : 1,10 M☉ · 6 183 K · lumière 1,46 L☉ · vit 7,53 Ga
- **Orbite** : 1,35 UA · flux reçu 0,80 × Terre · année de 548 jours · jour de 22,2 h
- **Planète** : 1,15 M⊕ · rayon 1,05 · gravité 1,05 g · densité 5,48 g/cm³ · 6,04 Ga
- **Intérieur** : chaleur 0,73 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,64 × Terre
- **Atmosphère** : 1,28 bar · retenue à 99 % · 241 K sans effet de serre → 281 K en surface (7 °C)
- **Eau** : liquide (bout à 380 K)
- **Vivant** : lumière au sol 0,80 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 22 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 40 K.

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

- **Étoile** : 1,07 M☉ · 6 072 K · lumière 1,32 L☉ · vit 8,12 Ga
- **Orbite** : 1,44 UA · flux reçu 0,64 × Terre · année de 609 jours · jour de 41,4 h
- **Planète** : 0,30 M⊕ · rayon 0,72 · gravité 0,57 g · densité 4,38 g/cm³ · 7,71 Ga
- **Intérieur** : chaleur 0,18 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : 0,12 bar · retenue à 48 % · 228 K sans effet de serre → 231 K en surface (-43 °C)
- **Eau** : glace
- **Vivant** : lumière au sol 0,64 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.

Rien ne grince.

Stabilité : 58 (unstable) → strict 58 (unstable) · monde retenu n° 2/48, coût 0,00

## Aurores mortes

*Des aurores sans champ magnétique.*

```age
auroras
mass: 0.1
age: 8
```

- **Étoile** : 1,03 M☉ · 5 903 K · lumière 1,13 L☉ · vit 9,14 Ga
- **Orbite** : 1,05 UA · flux reçu 1,02 × Terre · année de 388 jours · jour de 42,5 h
- **Planète** : 0,10 M⊕ · rayon 0,53 · gravité 0,36 g · densité 3,76 g/cm³ · 8,00 Ga
- **Intérieur** : chaleur 0,072 × Terre · volcans éteints · croûte figée · noyau figé · champ magnétique aucun
- **Atmosphère** : presque vide
- **Eau** : glace
- **Vivant** : lumière au sol 1,02 × Terre

Pourquoi ce monde est ainsi :

- Le noyau s'est figé : plus de dynamo, plus de bouclier magnétique.
- Faible gravité et vent d'étoile : l'air fuit dans l'espace.
- Si peu d'air que la glace passe directement en vapeur : l'eau ne coule jamais.
- Sous 0,36 g, les montagnes s'élèvent haut et les pas sont longs.

Ce qui ne tient pas :

- **light** · cosmological — Le noyau s'est figé (chaleur interne 0,072) : pas de dynamo, donc des aurores faibles et diffuses, comme sur Mars.
  - Pistes : un monde plus jeune (age: 2,80) ; une planète plus massive (mass: 1,30) ; plus de fer au cœur (iron)

Stabilité : 55 (unstable) → strict 45 (unstable) · monde retenu n° 1/48, coût 0,10

## Ciel vert

*Un soleil vert : pas une faute physique, un coût d'Art.*

```age
green_sun
water
fern
```

- **Étoile** : 1,01 M☉ · 5 813 K · lumière 1,03 L☉ · vit 9,75 Ga
- **Orbite** : 1,01 UA · flux reçu 1,01 × Terre · année de 371 jours · jour de 15,9 h
- **Planète** : 0,59 M⊕ · rayon 0,88 · gravité 0,77 g · densité 4,84 g/cm³ · 4,49 Ga
- **Intérieur** : chaleur 0,74 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 0,78 × Terre
- **Atmosphère** : 1,11 bar · retenue à 95 % · 255 K sans effet de serre → 292 K en surface (19 °C)
- **Eau** : liquide (bout à 376 K)
- **Vivant** : lumière au sol 1,01 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 16 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 37 K.

Ce qui ne tient pas :

- **light** · metaphysical — Aucune étoile ne brille vert ou violet : une étoile qui émet surtout du vert nous paraît blanche. Ce ciel tient de l'Art, pas de la nature.
  - Pistes : garder ce soleil, en connaissance de cause : il coûte un peu d'Art

Stabilité : 77 (stable) → strict 77 (stable) · monde retenu n° 1/48, coût 0,10

## Jumeaux

*Deux soleils, une orbite qui fait le tour des deux.*

```age
twin_suns
wide_binary_orbit
water
fern
rain
```

- **Étoiles** : 1,21 M☉ + 0,75 M☉ · 6 623 K · lumière 2,47 L☉ · vit 5,64 Ga
- **Orbite** : 1,76 UA · flux reçu 0,80 × Terre · année de 609 jours · jour de 18,8 h
- **Planète** : 2,13 M⊕ · rayon 1,19 · gravité 1,50 g · densité 6,95 g/cm³ · 0,70 Ga
- **Intérieur** : chaleur 4,36 × Terre · volcans actifs · plaques en mouvement · noyau liquide · champ magnétique 2,40 × Terre
- **Atmosphère** : 1,55 bar · retenue à 100 % · 241 K sans effet de serre → 289 K en surface (15 °C)
- **Eau** : liquide (bout à 386 K)
- **Vivant** : lumière au sol 0,80 × Terre

Pourquoi ce monde est ainsi :

- Noyau liquide et rotation de 19 h : une dynamo, donc un champ magnétique qui dévie le vent de l'étoile.
- L'effet de serre ajoute 48 K.
- Assez de chaleur pour un océan de magma sous la croûte : le sol est jeune, et il bouge.
- Sous 1,50 g, les montagnes restent basses et les êtres trapus.

Rien ne grince.

Stabilité : 75 (stable) → strict 75 (stable) · monde retenu n° 1/48, coût 0,00

