# Compte rendu — refonte du portfolio TchatzDev

Date de validation locale : **7 novembre 2026**. Branche de travail : `arena/a1057887-portfolio`. Aucun déploiement distant ni suppression de ressource cloud n’a été effectué.

> **Mise à jour du 14 novembre 2026.** Une refonte visuelle et animée a suivi ce compte rendu : identité noir / rouge / métal, hero cinématique, préchargeur, GSAP + ScrollTrigger + Lenis, huit projets au catalogue. Les sections ci-dessous décrivent l’étape de novembre qui reste exacte sur le plan factuel (contenus, coordonnées, suppressions, sécurité) ; pour l’état actuel, se référer à **`REFONTE-NOIR-ROUGE-2026-11.md`**, qui prévaut en cas d’écart (palette, nombre de tests, nombre de projets).

## 1. Audit préalable

L’audit a été enregistré dans `AUDIT-INITIAL-2026-11.md` avant la refonte. Il couvrait les pages, styles, scripts, configuration Vercel, intégration d’audience, ressources, tests et contenu.

Constats principaux : ancienne palette verte dominante ; styles et scripts monolithiques ; débordements masqués par `overflow-x:hidden` ; compteur sans mesure exploitable ; administration et intégration Supabase dormantes ; liens vers les sources dans les cartes ; certifications sans aperçu ; contenu des projets dispersé dans le HTML.

Mesures de départ sur l’accueil, avec Chromium : `scrollWidth` de **388 / 415 / 910 / 1440 px** pour des viewports de **320 / 375 / 768 / 1440 px**. Les six tests structurels historiques passaient, mais ne détectaient pas ces débordements.

## 2. Refonte réalisée

### Identité et interface

- Palette limitée à trois familles : **bleu** pour l’action principale et la structure, **rouge** pour les accents et avertissements, **blanc / bleu nuit** pour les surfaces et la lisibilité selon le thème.
- Composants cohérents : navigation, hero, parcours, compétences, services, cartes de projets, fiche Android, certifications, AGORA, contact et pied de page.
- Polices Manrope et DM Mono auto-hébergées, avec licences ; icônes SVG locales.
- Thèmes clair et sombre sur toutes les pages, bouton visible avec libellé explicite, choix enregistré sous `tchatzdev.theme`, détection système en l’absence de choix, synchronisation de `theme-color` et repli si le stockage est refusé.
- Animations courtes, révélations progressives, transitions de thème et de navigation lorsque le navigateur les prend en charge ; désactivation via `prefers-reduced-motion`.
- Mise en page mobile-first, cibles tactiles, focus visible, lien d’évitement, navigation clavier et menu mobile refermable.

### Contenus vérifiés

- **Cinq projets web distincts** à cette date : TchatzSafe, Tchatz Klassio, SpeedType, Trina Hook et Prince Art. Deux projets supplémentaires (Agora Factures, TchatzStudy) ont été ajoutés lors de la refonte du 14 novembre, portant le catalogue à sept projets web et une application. Captures fournies ou déjà présentes, descriptions contextualisées, fonctionnalités et technologies vérifiées dans les sources publiques en lecture seule.
- Sélection de trois projets sur l’accueil et catalogue complet dans `projets.html`, avec catégories « A. Sites web » et « B. Applications ».
- **Tchatz Music** présenté séparément comme application Android native : Kotlin, Jetpack Compose, Media3, Room et DataStore ; lecture locale, playlists, favoris, recherche, file d’attente, mode aléatoire et répétition. Ces éléments ont été recoupés avec le code et le README du projet, pas présentés comme un test sur téléphone personnel.
- Lien de téléchargement direct vers l’APK debug v1.0.0 réellement publié. Taille publiée : **14 821 978 octets**. Android 8.0 minimum, cible API 35. Limites du build debug affichées. Aucun lien Play Store inventé et aucune fausse capture d’interface Android.
- **Quatre certifications OpenClassrooms** : titres officiels, dates et numéros extraits des PDF ; aperçus WebP générés depuis ces documents ; visionneuse accessible et liens PDF directs. Aucun lien de vérification externe inventé.
- Coordonnées, parcours, AGORA et liens de contact conservés. Correction orthographique de « Apprendissage ».

### Architecture et publication

- Sources centralisées dans `src/pages`, `src/templates` et `src/data` ; générateur Python sans dépendance tierce (`tools/build.py`). HTML racine généré et versionné pour un hébergement statique direct.
- CSS et JavaScript réécrits autour de composants réutilisables ; aucun framework ni dépendance runtime.
- SEO par page, canonical, Open Graph, Twitter Card, image de partage 1200 × 630 et JSON-LD. Sitemap limité aux trois pages indexables ; robots mis à jour ; 404 statique.
- Configuration Vercel statique, sans commande de build, sortie racine, URL `.html` conservées. En-têtes CSP, anti-sniffing, anti-cliquetage, permissions navigateur et cache. `.vercelignore` exclut les sources de maintenance et les tests du contenu public.
- Images optimisées et dimensions réservées ; chargement différé hors premier écran ; polices locales avec `font-display: swap`. Ensemble des fichiers `assets/` : environ **592 Ko**, PDF conservés : environ **484 Ko**. Ces tailles sont celles des fichiers, pas un score Lighthouse.

## 3. Suppressions effectuées dans le dépôt

- `admin.html`, `admin.js`, `admin.css` ;
- `analytics-config.js`, suivi des clics, compteur et logique d’audience ;
- fonction Edge et migration SQL du portfolio, puis dossiers Supabase vides ;
- documentation d’intégration Supabase ;
- anciens `style.css` et `script.js`, remplacés par les fichiers maintenables dans `assets/` ;
- anciens PNG/JPEG dupliqués après création des ressources optimisées utilisées par le site ;
- tous les boutons et liens vers les codes sources des projets, ainsi que le lien vers le profil GitHub dans l’interface et les métadonnées publiques.

La seule URL GitHub restante dans l’interface est le **téléchargement binaire direct de l’APK**, pas une page de dépôt. Aucun dépôt GitHub distant n’a été supprimé ou modifié. Aucune table, fonction ou donnée distante n’a été supprimée : l’accès au projet Supabase n’était pas disponible et une suppression cloud aurait nécessité une confirmation explicite.

Aucun remplaçant d’analytics n’a été ajouté. Le site ne collecte pas d’audience et ne présente aucun compteur simulé.

## 4. Tests réellement exécutés

### Structure et génération

- `python3 tools/build.py` : quatre pages générées.
- `python3 tools/build.py --check` : HTML à jour.
- `python3 -m unittest tests/test_static.py -v` : **10 tests réussis**.
- `node --check` : les deux scripts publics et les deux scripts de test passent.
- `git diff --check` : aucune erreur d’espacement.
- Recherche dans les pages, sources et assets : aucune référence active à Supabase, à l’ancienne configuration d’analytics ou au suivi `data-track`.
- Vérification des ressources locales, ancres, identifiants uniques, alternatives d’images, métadonnées, sitemap et configuration statique.

### Chromium réel avec Playwright

Suite complète finale : **80 combinaisons page × largeur × thème réussies**.

- Pages : accueil, projets, certifications, 404.
- Largeurs : 320, 360, 375, 414, 768, 820, 1024, 1280, 1440 et 1920 px.
- Thèmes : clair et sombre.
- Aucun dépassement horizontal de la page ni élément visible dépassant du viewport dans la matrice testée.
- Bouton de thème, persistance après rechargement et changement de page, préférence système initiale et changement système en direct, stockage refusé.
- Menu mobile : ouverture, limites à l’écran, Échap, retour du focus, clic extérieur, navigation et redimensionnement desktop.
- Ancres de catégories, navigation accueil → projets → contact.
- Quatre visionneuses de certificats : image chargée, PDF accessible, fermeture par bouton/Échap/arrière-plan et retour du focus.
- Liens externes : cinq destinations de démonstration et un APK direct ; attributs `noopener noreferrer` vérifiés. Les destinations de démonstration ont aussi été lues avec succès via l’outil de consultation web. Aucun message de contact n’a été envoyé automatiquement.
- Page 404 avec statut 404 et en-têtes de production testés via un serveur local appliquant `vercel.json`.
- Fonctionnement sans JavaScript : contenu, navigation et liens PDF disponibles ; bouton de thème non fonctionnel volontairement masqué.
- **Aucune erreur JavaScript/console et aucune requête réseau externe** pendant la suite.

### Accessibilité

- axe-core : **0 violation détectée** sur accueil, projets et certifications, chacun en clair et sombre à 1440 px.
- Contrôles complémentaires axe sur le menu mobile ouvert à 375 px et la visionneuse de certificat ouverte : **0 violation détectée**.
- Un défaut initial de contraste (4,27:1 sur un petit libellé de l’accueil clair) a été corrigé avant la validation finale.
- Parcours clavier, focus, réduction des animations et absence de JavaScript exercés dans Chromium.

Les captures finales et le rapport machine sont produits dans `test-results/` lors de l’exécution ; ce dossier n’est pas versionné.

## 5. Limites et points restants

- **Pas de déploiement Vercel effectué** depuis cet environnement. La génération, les fichiers statiques, les en-têtes et le comportement local sont validés ; le comportement du domaine de production après publication reste à vérifier.
- Pas de test sur téléphone Android physique, Safari/iOS ou lecteur d’écran réel. La validation navigateur est Chromium ; les affirmations sur Tchatz Music proviennent des sources et de la release, pas d’une installation personnelle.
- Aucune capture réelle de l’interface Android n’était disponible : la fiche utilise le logo et le signale explicitement.
- Les PDF ne contiennent pas d’URL de vérification externe ; aucun lien de ce type n’a été fabriqué.
- Le build Android disponible est signé en debug ; l’avertissement est visible. Une release signée pour distribution stable reste un travail du projet Android, pas du portfolio.
- Les éventuelles ressources Supabase déjà déployées côté cloud ne sont pas touchées par cette refonte du dépôt.
- Les partages Facebook/WhatsApp disposent des métadonnées et de l’image dédiées ; leur vignette réelle après mise en production dépendra du crawl de ces plateformes.

## 6. Reproduction

```sh
python3 tools/build.py --check
python3 -m unittest tests/test_static.py -v
npm --prefix tests ci
npm --prefix tests exec -- playwright install chromium
node tests/browser.mjs
```

Pour prévisualiser sans build :

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

Le détail de maintenance est dans `README.md`.