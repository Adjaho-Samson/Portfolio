# Correctif — débordement horizontal (responsivité), 7 novembre 2026

Branche : `arena/fe9727ae-portfolio`. Signalement utilisateur : barre de
défilement horizontale et contenu décalé (capture : viewport ≈ 1165 px CSS,
page ≈ 1300 px de large).

## Cause

Les pistes d'orbite de la constellation (`.orbit-path`) sont des carrés
invisibles de la taille de la scène, mis en rotation par `animation: spin`.
La boîte englobante d'un carré tourné est sa diagonale : √2 × la scène, soit
jusqu’à ~21 % de la scène qui dépassait de chaque côté (≈ 110 px pour une
scène de 520 px). Ce débordement, bien qu'invisible, alimentait le
*débordement scrollable* du document : barre horizontale, en-tête et hero
décalés vers la gauche dès que l'on retrouvait le bord droit.

La fuite apparaissait surtout entre 1050 px et ~1430 px de large (hero en
deux colonnes, scène cadrée dans sa colonne) et sur mobile (scène = pleine
largeur), exactement les cas signalés.

## Correctif (CSS uniquement, `assets/css/portfolio.css`)

1. `.constellation { overflow: clip; overflow-clip-margin: 34px; }` — rogne
   le débordement à la source. `clip` ne crée pas de conteneur de défilement
   et `overflow-clip-margin` préserve les pastilles, leur survol (scale 1.12)
   et les contours de focus, qui vivent à moins de 34 px du bord de scène.
2. `html { overflow-x: clip; }` — filet de sécurité global : plus aucune
   barre horizontale possible, sans casser l'en-tête collant (contrairement
   à `overflow-x: hidden`, interdit par `tests/test_static.py`).

Aucun changement de géométrie : les orbites restent des cercles parfaits,
les pastilles conservent leurs positions générées (`orbits.css`).

## Vérifications

- `python3 tools/build.py` : sortie identique (HTML inchangé).
- `python3 tests/test_static.py` : 14 tests, OK.
- Calcul géométrique : portée maximale pastille + survol + focus ≈ 48,8 % de
  la demi-scène + 34 px de marge de rognage → rien de visible n'est rogné.
