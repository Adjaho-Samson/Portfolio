# Audit initial du portfolio TchatzDev — 7 novembre 2026

Audit réalisé sur `742e903196f88b80ba0e3a17d18202a42eb0b376`, avant modification des pages. Cet état reste consultable dans l’historique Git ; aucune réécriture de l’historique n’est nécessaire.

## 1. Architecture et fonctionnement observés

- Site **statique HTML/CSS/JavaScript**, sans framework, bundler, `package.json` ou dépendance npm de production.
- `index.html` : accueil, présentation, compétences, trois réalisations détaillées, autres explorations, Android, AGORA et contact.
- `certification.html` : quatre certificats PDF et visionneuse en iframe ; `style.css` et `script.js` partagés.
- `admin.html`, `admin.css`, `admin.js` : connexion et tableau de bord dépendants entièrement du backend d’audience.
- `Certificats/` : quatre PDF d’une page, conservés comme documents officiels. `images/` : portrait, logo Android et captures web.
- `vercel.json` : hébergement statique et en-têtes de sécurité. `robots.txt`, `sitemap.xml` et fichier de vérification Google présents.
- JavaScript : menu, révélations au défilement, année, consentement/collecte d’audience et visionneuse PDF. Pas de formulaire de contact serveur : les contacts sont `mailto:`, WhatsApp et Facebook.
- Ressources externes au navigateur : Google Fonts/Google Fonts Static, liens de démonstration, liens vers des dépôts, téléchargement direct de l’APK. Aucune bibliothèque JS distante.

## 2. Vérifications initiales

- Les six tests structurels Python existants passent ; `node --check script.js` et `node --check admin.js` passent.
- Ces tests ne couvrent ni le rendu navigateur, ni les thèmes, ni les débordements, ni le fonctionnement réel des services.
- Contrôle Chromium initial : `document.documentElement.scrollWidth` vaut 388 px pour un viewport de 320 px, 415 px pour 375 px et 910 px pour 768 px. Les orbites du portrait et le halo Android dépassent réellement ; `body { overflow-x: hidden }` masque le symptôme. À 1440 px, aucun débordement détecté. Aucune erreur JavaScript initiale observée sur l’accueil.
- Les documents PDF ont été lus : ce sont des certificats OpenClassrooms distincts, avec intitulés, numéros et dates réels. Les PNG de captures existants et les trois captures fournies ont été examinés.
- Les adresses des projets et les technologies ont été recoupées avec les fichiers publics des projets (manifestes, configuration Gradle, descriptions). Les sites Vercel eux-mêmes ne sont pas accessibles depuis les domaines réseau autorisés de cet environnement ; ne pas confondre cette vérification avec un test de disponibilité en production.
- La release Android v1.0.0 existe, publiée le 3 novembre 2026, avec `Tchatz-Music-debug.apk` (14 821 978 octets). Android minimum API 26 ; cible/compilation API 35. Kotlin, Jetpack Compose, Media3, Room et DataStore sont vérifiés dans Gradle. Aucun visuel réel d’écran de cette application n’a été trouvé.

## 3. Supabase : périmètre exact

1. `analytics-config.js` : URL, clé publique et nom de fonction (vides dans le dépôt).
2. `script.js` : consentement, DNT/GPC, sessions, déduplication, impressions/clics et `fetch` vers Edge Function.
3. `admin.js` : authentification, jeton de session, déconnexion, RPC dashboard, graphiques et classements.
4. `admin.html` / `admin.css` : interface privée devenue inutile sans ce backend.
5. `supabase/functions/portfolio-event/index.ts` : client serveur et insertion d’événements.
6. `supabase/migrations/20261107_portfolio_analytics.sql` : tables, RLS, trigger et RPC.
7. `docs/supabase-analytics.md` : mise en service et variables serveur.
8. `vercel.json` : CSP autorisant les connexions/formulaires vers le backend.
9. `index.html`, `certification.html`, `robots.txt`, `README.md`, tests : bandeau, attributs de suivi, liens et documentation associés.

La configuration est vide : aucune collecte active ni clé secrète n’est présente dans cet état. Aucun projet distant ni aucune base ne doit être modifié pendant la suppression du code local. Les technologies propres aux autres produits ne sont pas à supprimer de leurs dépôts.

## 4. Problèmes et possibilités d’amélioration

### Design / lisibilité

- Palette verte dominante, sections Android/contact inversées en couleurs fixes, pas de mode clair ni de contrôle de thème.
- Nombreux textes entre 8 et 12 pixels, graisses et contrastes inégaux ; hiérarchie difficile à parcourir sur téléphone.
- Orbites, note flottante, cercles et halo décoratifs sans contribution au contenu. `overflow-x: hidden` masque les débordements au lieu de corriger leurs dimensions.
- Accueil très long : toutes les fiches détaillées y sont exposées, sans catalogue indépendant. Certifications seulement accessibles par de petits liens.
- Pas de section de services explicite ; les domaines d’AGORA peuvent en fonder une sans inventer d’offre.

### Fonctionnement / accessibilité

- Menu mobile piloté par une classe et un breakpoint différent du reste du code ; pas de gestion complète du focus hors menu ni de synchronisation explicite avec le breakpoint CSS.
- Modale PDF avec `aria-hidden` plutôt que fermeture/inertie natives ; iframe peu adaptée aux visionneuses PDF de certains téléphones. Les liens PDF doivent rester directement utilisables.
- Boutons de thème absents ; préférence système non exploitée. Animation de curseur clignotante décorative à retirer.
- Liens « Code source » sur les trois projets web et Android, plus lien profil GitHub : à retirer de l’interface conformément au cahier des charges.

### Contenu / exactitude

- Klassio et SpeedType utilisent des visuels typographiques alors que de vraies captures sont maintenant fournies.
- Le certificat « Vibe Coding » est décrit à tort comme une certification JavaScript. Son intitulé officiel concerne les agents IA et le vibe coding.
- Les intitulés HTML/CSS, Git et Linux peuvent reprendre les titres exacts des PDF. Les dates précises sont disponibles ; aucun lien indépendant de vérification n’est fourni.
- Ne pas afficher « VERIFIED » comme une vérification externe indépendante. Le PDF est la pièce disponible.
- Tchatz Music ne doit pas recevoir de fausses captures, de faux avis ni une présentation Play Store. L’APK est explicitement un build debug.

### Technique / performance / SEO

- CSS monolithique avec couleurs codées en dur et règles desktop-first ; composants et tokens à rationaliser.
- Informations de navigation/projets répétées dans plusieurs fichiers : risque de divergence pendant la maintenance.
- Images PNG jusqu’à 699 Ko, polices tierces bloquantes, pas de variantes responsives ni de favicon dédié léger.
- Métadonnées de la page certificats incomplètes/inexactes sur JavaScript ; sitemap sans future page projets ; image de partage simplement carrée malgré un aperçu large annoncé.
- Liens PDF contenant espaces/esperluette à encoder correctement. Pas de page 404 personnalisée.

## 5. Orientations retenues avant intervention

- Conserver le statique, l’identité TchatzDev, les coordonnées, les cinq réalisations web et l’application Android existante. Aucun nouveau projet ni certificat inventé.
- Centraliser les contenus et les fragments communs, générer des HTML lisibles et indexables, conserver des ressources locales optimisées. Aucun framework runtime supplémentaire.
- Bleu pour les actions, rouge pour les accents, blanc/surfaces neutres pour la lecture ; tokens clair/sombre et préférence locale.
- Accueil recentré sur une sélection ; `projets.html` avec Sites web / Applications ; certificats mis en avant avec aperçus réels et titres/dates officiels.
- Suppression de toute l’intégration d’audience et de l’administration associée. Pas de compteur de remplacement : l’activation d’un service externe nécessiterait une configuration et une validation hors de ce dépôt. Aucun chiffre local présenté comme audience réelle.
- Supprimer les accès aux dépôts dans l’interface ; conserver uniquement les démonstrations et le lien binaire direct de l’APK réellement publié. Ne pas toucher aux dépôts eux-mêmes.
- Tester réellement le rendu Chromium à plusieurs largeurs, les deux thèmes, les interactions, les ressources, les métadonnées et la configuration de déploiement. Les appareils Android physiques, Safari réel et la production Vercel restent des validations distinctes à signaler honnêtement.