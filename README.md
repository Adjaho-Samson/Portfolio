# Portfolio TchatzDev

Portfolio statique de **Samson Adjaho** : réalisations web, application Android, certifications, compétences, services et initiative AGORA. Aucun framework, backend applicatif, compte visiteur ou traceur d’audience n’est nécessaire au fonctionnement du site.

Identité visuelle : bordeaux profond (`#7c1f2f`), anthracite (`#1b1d21`), blanc cassé (`#f4f1ec`). Titres en **Plus Jakarta Sans**, textes en **Inter**, polices variables auto-hébergées. Icônes **Font Awesome Free 7** et marques **Simple Icons 16**, intégrées dans un sprite SVG local.

## Pages

- `index.html` — accueil et sélection de réalisations ;
- `projets.html` — catalogue « Sites web » et « Applications » ;
- `certification.html` — certificats originaux, aperçus et téléchargements ;
- `404.html` — page d’erreur statique.

Les seules destinations externes des cartes de projets sont les démonstrations (« Visiter le projet »). L’APK de Tchatz Music n’est plus un lien GitHub : le fichier officiel est hébergé par le site dans `assets/downloads/` et servi en pièce jointe (`application/vnd.android.package-archive`). Aucun lien vers un dépôt, un profil de développement ou une page de code source n’est proposé dans l’interface.

## Développer et générer

Le HTML racine est généré et versionné pour un déploiement statique direct. **Modifier les sources dans `src/`, puis régénérer** ; ne pas maintenir deux versions à la main.

```sh
python3 tools/build.py
python3 tools/build.py --check
python3 -m http.server 4173 --bind 0.0.0.0
```

Prérequis : Python 3.11+ pour la génération et les tests structurels. Aucune dépendance Python tierce n’est nécessaire. Node.js est utilisé uniquement pour les vérifications navigateur facultatives.

| Chemin | Rôle |
| --- | --- |
| `src/pages/` | Contenu des pages et structure des sections |
| `src/templates/` | En-tête, pied de page et enveloppe HTML communs |
| `src/data/` | Informations du site, projets et certifications |
| `tools/build.py` | Génération HTML, cartes réutilisables et métadonnées structurées |
| `assets/css/portfolio.css` | Tokens clair/sombre, composants et responsive mobile-first |
| `assets/css/orbits.css` | Généré : rayons, durées et positions de la constellation |
| `src/data/skills.json` | Compétences, orbites et groupes affichés |
| `assets/downloads/` | APK officiel de Tchatz Music servi directement par le site |
| `assets/js/theme.js` | Thème initial système, choix explicite et persistance locale |
| `assets/js/main.js` | Menu, révélations progressives et visionneuse de certificats |
| `assets/images/` | Captures fournies, portrait optimisé et aperçus réels des PDF |
| `assets/fonts/` | Plus Jakarta Sans et Inter (variables, latin) et licences OFL |
| `assets/icons/` | Licences des jeux d’icônes (Font Awesome Free, Simple Icons) |
| `tools/icon_data.py` | Généré : tracés officiels du sprite SVG |
| `tools/sync_icons.py` | Régénère `icon_data.py` depuis les paquets npm officiels |
| `Certificats/` | PDF originaux, conservés sans modification |
| `tests/` | Vérifications structurelles et navigateur |
| `docs/` | Audit initial et compte rendu de validation |

La clé de thème est `tchatzdev.theme`. Seul le choix `light` ou `dark` est conservé localement. En l’absence de choix, le système décide ; si le stockage est refusé, le thème fonctionne en mémoire pour la page courante.

## Vérifications

Structure, contenu, liens locaux, absence d’intégration d’audience et cohérence de la génération :

```sh
python3 -m unittest tests/test_static.py -v
node --check assets/js/theme.js
node --check assets/js/main.js
```

Les tests couvrent l’identité visuelle, le logo, le pied de page, la
constellation (12 compétences, 3 orbites, noms accessibles, positions générées
sans style inline à cause de la CSP), les icônes officielles et le téléchargement
de l’APK (fichier réel, taille, empreinte SHA-256, en-têtes Vercel).

Navigateur réel Chromium (layouts, thèmes, menu, dialogues, accessibilité axe-core, en-têtes de sécurité et absence de requêtes externes) :

```sh
npm --prefix tests ci
npm --prefix tests exec -- playwright install chromium
node tests/browser.mjs
```

Si Chromium est déjà installé :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium node tests/browser.mjs
```

Le test démarre son propre serveur local et applique les en-têtes de `vercel.json`. Les captures et le rapport JSON sont écrits dans `test-results/`, ignoré par Git. `PORTFOLIO_QUICK=1` réduit la matrice de largeurs pour un contrôle rapide ; la validation complète utilise dix largeurs, de 320 à 1920 px.

## Déploiement Vercel

Le preset est « Other », sans commande de build, avec la racine comme sortie. `vercel.json` fixe cette configuration et les en-têtes de sécurité. Les fichiers HTML générés doivent être à jour avant publication. `.vercelignore` exclut les sources de maintenance, les tests et la documentation du contenu servi publiquement.

**Cache et mises à jour visibles.** Le HTML est servi en `max-age=0, must-revalidate` : un déploiement est donc visible au premier rechargement. Les feuilles et scripts sont référencés avec l’empreinte de leur contenu (`assets/css/portfolio.css?v=…`, générée par `tools/build.py`), ce qui autorise un cache `immutable` d’un an sans jamais figer une ancienne version : dès que le fichier change, l’URL change. Les polices suivent la même règle ; les images sont revalidées au plus tard après une heure. Ne jamais réintroduire de règle `Cache-Control` longue sur `/assets/(.*)` : elle masquerait les correctifs CSS après publication (voir `docs/CACHE-NAVIGATEUR-2026-11.md`).

Les URL historiques `index.html` et `certification.html` sont conservées. `projets.html` est ajouté au sitemap. Le fichier de vérification Google est conservé. Aucun déploiement distant n’est effectué par les scripts de test.

## Contenus et ressources

- TchatzSafe, Tchatz Klassio et SpeedType utilisent les captures fournies pour cette refonte.
- Trina Hook et Prince Art conservent leurs captures existantes, optimisées en WebP.
- Tchatz Music utilise son logo officiel. Aucune capture réelle de l’interface Android n’étant disponible, aucune interface mobile n’est simulée.
- Les quatre aperçus de certification sont rendus depuis les PDF originaux. Les intitulés, dates et numéros proviennent de ces documents.
- L’APK v1.0.0 est un build debug réellement publié. Les limites de signature et d’installation sont indiquées avant téléchargement.
- Les polices Plus Jakarta Sans et Inter sont auto-hébergées ; leurs licences sont jointes.
- Les icônes Font Awesome Free 7 (CC BY 4.0) et Simple Icons 16 (CC0 1.0) sont intégrées en SVG ; licences dans `assets/icons/`.
- L’APK `assets/downloads/Tchatz-Music-1.0.0-debug.apk` (14 821 978 octets, SHA-256 `99595ce5…305e2b`) est identique à l’asset publié de la release `v1.0.0`.

L’audit préalable et les résultats effectivement obtenus sont documentés dans `docs/AUDIT-INITIAL-2026-11.md`, `docs/COMPTE-RENDU-2026-11.md` et, pour la refonte bordeaux/anthracite, `docs/REFONTE-BORDEAUX-2026-11.md`.