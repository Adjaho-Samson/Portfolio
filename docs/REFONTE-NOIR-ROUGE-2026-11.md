# Refonte visuelle et animée — noir, rouge, métal

Date de validation locale : **14 novembre 2026**. Branche de travail : `arena/220d27bf-portfolio`. Aucun déploiement distant n’a été effectué.

Cette étape prolonge `REFONTE-BORDEAUX-2026-11.md`. Elle ne crée pas un nouveau site : elle reprend l’existant, remplace l’identité bordeaux/anthracite par une identité **noir profond / rouge électrique / gris métallique / blanc** et ajoute la couche de mouvement demandée. Contenus, coordonnées, projets, certifications et configuration de déploiement sont conservés.

## 1. Intention

Le niveau de présentation visé s’inspire de sites de développeurs très travaillés (rythme éditorial, grands titres, révélations au défilement, cartes de projets mises en scène), **sans reprendre ni le logo, ni les textes, ni les contenus du site de référence**. Toutes les chaînes affichées proviennent du portfolio TchatzDev existant ou des données du dépôt.

Principes retenus :

- lisibilité avant effet : aucune animation ne retarde l’accès au contenu ;
- un seul accent (le rouge) et une seule échelle typographique ;
- mouvements lents et amortis (0,5 à 1,1 s, `cubic-bezier(0.16, 1, 0.3, 1)`), jamais de mouvement permanent en plein écran ;
- tout effet est supprimable : `prefers-reduced-motion` et `Save-Data` désactivent préchargeur, Lenis et révélations.

## 2. Identité

| Rôle | Valeur (thème sombre) | Usage |
| --- | --- | --- |
| Fond | `--bg #07080a` | fond général, préchargeur |
| Surfaces | `#101317`, `#14181d`, `#1a1f25` | cartes, panneaux, en-tête au défilement |
| Accent | `--accent #ff2d3f` | liens actifs, boutons principaux, chiffres clés |
| Accent clair | `--accent-hover #ff5162` | survol, focus |
| Métal | `--steel #b9c0c8`, `--steel-deep #8b939c` | libellés secondaires, filets, icônes |
| Texte | `--text #f4f5f6`, `--muted #a2a9b2` | titres, paragraphes |

Le thème clair existe toujours (`[data-theme="light"]` : fond `#f6f5f3`, accent `#d1101f`) et reste pilotable depuis l’en-tête, avec persistance sous `tchatzdev.theme`. **Le défaut est désormais le noir**, y compris lorsque le système est en clair : c’est l’identité de la marque, pas une préférence système. Un choix explicite de l’utilisateur reste prioritaire et traverse les pages.

Aucun dégradé décoratif hors halos radiaux très basse opacité (hero, préchargeur, panneau AGORA). Aucun emoji décoratif. Aucune couleur hors des jetons.

## 3. Structure des pages

### Accueil (`index.html`)

`#accueil` (hero) → bandeau de technologies → `#projets` → `#parcours` → `#competences` (+ constellation) → `#services` → `#chronologie` → `#certifications` → `#agora` → `#contact`.

- **Hero** : nom `TCHATZDEV` en très grande taille, sous-titre « Développeur web & Android », phrase de positionnement, deux actions réelles, trois repères factuels (Abomey-Calavi, Web · Android · Logiciel, ESM-Bénin), portrait encadré, badge circulaire rotatif `Développeur · Créateur · TchatzDev`, colonne de chiffres (projets publiés, certifications, application Android) alimentée par les données.
- **Réalisations** : une carte « vedette » en pleine largeur puis deux cartes secondaires ; la fiche Tchatz Music ferme la section comme un bloc distinct, pas comme une troisième carte identique.
- **À propos** : colonne éditoriale asymétrique (titre à gauche, récit à droite), fiche d’identité en lignes, méthode en trois temps.
- **Compétences** : trois groupes nommés, chacun avec une icône, une intention et les technologies réellement utilisées ; aucune barre de pourcentage, aucun niveau inventé. La constellation SVG (12 compétences, 3 orbites) est conservée avec pause clavier.
- **Services**, **parcours** (chronologie verticale), **certifications** (aperçus réels des PDF), **AGORA**, **contact** : contenus existants, remis en page.

### Catalogue (`projets.html`)

Sept projets web publiés (TchatzSafe, Tchatz Klassio, Agora Factures, TchatzStudy, SpeedType, Trina Hook, Prince Art) et l’application Android Tchatz Music. Chaque fiche expose le besoin, ce qui a été livré, les technologies, l’état réel et, s’il existe, un lien de démonstration. **TchatzStudy n’a ni URL publique ni capture** : la fiche l’assume, ne liste aucune technologie et propose un échange direct plutôt qu’un bouton mort. L’APK est proposé depuis la fiche Android avec taille, empreinte SHA-256 et avertissement sur le build debug.

### Certifications (`certification.html`) et 404 (`404.html`)

Quatre certificats OpenClassrooms : vignette réelle générée depuis le PDF, émetteur, intitulé, date, numéro, lien PDF et visionneuse accessible (Échap, clic extérieur, retour du focus).

## 4. Animations

| Effet | Mise en œuvre | Garde-fou |
| --- | --- | --- |
| Préchargeur | logo + nom + barre + pourcentage, disparition au `load` et au plus tard à 2,4 s | désactivé en `reduced-motion` / `Save-Data`, masqué en `html:not(.js)` |
| Révélations | GSAP + ScrollTrigger, `data-reveal` / `data-stagger` / `data-split-lines` | contenu visible par défaut sans JS ; classes posées après chargement |
| Parallaxe | portrait et halos, amplitudes de 10 à 40 px | désactivée < 1050 px et en `reduced-motion` |
| Défilement doux | Lenis, ancres interceptées avec compensation d’en-tête | repli natif, jamais d’interception des liens inter-pages |
| Curseur | anneau + point, uniquement `(hover: hover) and (pointer: fine)` | masqué au tactile, `pointer-events: none` |
| Boutons | aimantation légère (`data-magnetic`), flèches animées au survol | seulement si pointeur fin et animation autorisée |
| Cartes projets | élévation, zoom d’image contenu, filet accentué | pas de déplacement du texte, pas de `scale` sur la carte entière |
| En-tête | condensation au défilement descendant, réapparition à la remontée | jamais masqué si l’utilisateur n’a pas encore défilé |
| Navigation | indicateur de section active, soulignement animé | état `aria-current` cohérent |
| Compteurs | chiffres réels issus de `projects.json` / `certifications.json` | jamais de valeur codée en dur dans le HTML |

Le préchargeur ne recule plus pendant sa disparition (le battement de progression est interrompu dès `finish()`), ce qui évitait un « 100 % » suivi d’un « 68 % ».

## 5. Accessibilité et dégradation

- Thème sombre par défaut, contraste des libellés secondaires porté à `#8b939c` (sombre) et `#545c66` (clair), micro-libellés ≥ 0,7 rem.
- Lien d’évitement, `main#contenu` focusable, focus visible sur tous les interactifs, cibles tactiles ≥ 44 px.
- Menu mobile : `aria-expanded`, `aria-controls`, fermeture par Échap, clic extérieur, navigation et changement de largeur ; focus rendu au bouton.
- Sans JavaScript : préchargeur, curseur, boutons de thème et de menu masqués, contenu complet, ancres natives, PDF accessibles.
- `prefers-reduced-motion` : plus de Lenis, plus de GSAP, plus de préchargeur ; les contenus restent dans leur état final.
- CSP inchangée : `script-src 'self'`, `style-src 'self'`, `connect-src 'none'`. Aucun `style=` n’est émis dans le contenu, aucun script distant, aucune police distante.

## 6. Dépendances ajoutées

| Fichier | Paquet | Version | Licence |
| --- | --- | --- | --- |
| `assets/js/vendor/gsap.min.js` | `gsap` | 3.15.1 | licence standard GreenSock |
| `assets/js/vendor/ScrollTrigger.min.js` | `gsap` | 3.15.1 | licence standard GreenSock |
| `assets/js/vendor/lenis.min.js` | `lenis` | 1.3.27 | MIT |

Fichiers copiés tels qu’ils sont publiés dans les paquets npm officiels, servis depuis le domaine (la CSP interdit tout script distant). Licences et versions dans `assets/vendor-licenses/`. Aucun autre paquet n’est nécessaire : pas de framework CSS, pas de bundler, pas de dépendance à l’exécution hors navigateur.

Poids transférés, hors APK : CSS `portfolio.css` **86 Ko** (≈ 16 Ko gzip), `main.js` **26 Ko** (≈ 7,6 Ko gzip), GSAP + ScrollTrigger + Lenis **137 Ko** minifiés (≈ 50 Ko gzip), images **508 Ko** dont la plupart en `loading="lazy"`. L’APK de 14,8 Mo n’est jamais chargé par la page, uniquement téléchargé à la demande.

## 7. Vérifications réellement exécutées

- `python3 tools/build.py` : quatre pages générées ; `--check` : HTML à jour.
- `python3 -m unittest tests/test_static.py -v` : **15 tests réussis** (les contrats obsolètes ont été réécrits : version CSS, huit projets, jetons de la nouvelle palette, thème sombre par défaut, thème et navigation partagés, bibliothèques versionnées, sprite entièrement utilisé).
- `node --check` : `theme.js`, `main.js`, `browser.mjs`, `server.mjs`.
- `node tests/browser.mjs` (suite complète, Playwright + Chromium) : **80 combinaisons page × largeur × thème** réussies, **0 violation axe-core** (accueil, catalogue, certifications, clair et sombre), **0 erreur console**, **0 erreur de page**, **0 requête externe**. Scénarios couverts : thème et persistance, identité sombre par défaut, menu mobile, ancres, quatre dialogues de certificat, téléchargement APK vérifié par empreinte, constellation, 404 + en-têtes de production, stockage refusé, absence de JavaScript.
- Contrôles visuels par captures : accueil 1440 × 900 et 390 × 844, catalogue et certifications en 390 px, thème clair, menu mobile ouvert. Aucun débordement, aucune bande vide, aucun texte tronqué.

## 8. Limites

- Pas de déploiement Vercel depuis cet environnement ; le comportement du domaine de production après publication reste à constater.
- Validation sur Chromium uniquement : pas de test sur téléphone Android physique, Safari/iOS ni lecteur d’écran réel. Les mesures tactiles et `reduced-motion` sont vérifiées par émulation.
- **TchatzStudy** : aucune URL publique, aucune capture, aucun dépôt public. La fiche reste volontairement sans lien et sans liste de technologies. Fournir une URL, une capture et les fonctions réelles permettrait de la compléter.
- Deux projets publics existants ne sont pas encore présentés : **Bedel** (`biblioens.vercel.app`), **Linkora** (`linkora-self-xi`) et **Royal Groupe** (`royalgroupe.vercel.app`). Ils peuvent être ajoutés dès que leur description et leur visuel sont validés.
- Les liens de démonstration dépendent de Vercel ; leur disponibilité n’est pas garantie par ce dépôt.

## 9. Reproduction

```sh
python3 tools/build.py --check
python3 -m unittest tests/test_static.py -v
npm --prefix tests ci
node tests/browser.mjs                 # suite complète
PORTFOLIO_QUICK=1 node tests/browser.mjs  # contrôle rapide
python3 -m http.server 4173 --bind 0.0.0.0
```
