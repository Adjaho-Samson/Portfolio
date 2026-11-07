# Portfolio TchatzDev

Portfolio statique de **Samson Adjaho** : réalisations web, application Android, certifications, compétences, services et initiative AGORA. Aucun framework, backend applicatif, compte visiteur ou traceur d’audience n’est nécessaire au fonctionnement du site.

## Pages

- `index.html` — accueil et sélection de réalisations ;
- `projets.html` — catalogue « Sites web » et « Applications » ;
- `certification.html` — certificats originaux, aperçus et téléchargements ;
- `404.html` — page d’erreur statique.

Les seules destinations externes des cartes de projets sont les démonstrations (« Visiter le projet ») et le téléchargement binaire direct de l’APK Tchatz Music. Aucun lien vers un dépôt, un profil de développement ou une page de code source n’est proposé dans l’interface.

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
| `assets/js/theme.js` | Thème initial système, choix explicite et persistance locale |
| `assets/js/main.js` | Menu, révélations progressives et visionneuse de certificats |
| `assets/images/` | Captures fournies, portrait optimisé et aperçus réels des PDF |
| `assets/fonts/` | Polices locales et licences OFL |
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

Les URL historiques `index.html` et `certification.html` sont conservées. `projets.html` est ajouté au sitemap. Le fichier de vérification Google est conservé. Aucun déploiement distant n’est effectué par les scripts de test.

## Contenus et ressources

- TchatzSafe, Tchatz Klassio et SpeedType utilisent les captures fournies pour cette refonte.
- Trina Hook et Prince Art conservent leurs captures existantes, optimisées en WebP.
- Tchatz Music utilise son logo officiel. Aucune capture réelle de l’interface Android n’étant disponible, aucune interface mobile n’est simulée.
- Les quatre aperçus de certification sont rendus depuis les PDF originaux. Les intitulés, dates et numéros proviennent de ces documents.
- L’APK v1.0.0 est un build debug réellement publié. Les limites de signature et d’installation sont indiquées avant téléchargement.
- Les polices Manrope et DM Mono sont auto-hébergées ; leurs licences sont jointes.

L’audit préalable et les résultats effectivement obtenus sont documentés dans `docs/AUDIT-INITIAL-2026-11.md` et `docs/COMPTE-RENDU-2026-11.md`.