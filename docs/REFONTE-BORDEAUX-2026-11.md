# Compte rendu — refonte « bordeaux & anthracite » du portfolio TchatzDev

Date de validation locale : **7 novembre 2026**. Branche : `arena/92428962-portfolio`.
Aucun déploiement distant n'a été effectué : tout est vérifié sur le dépôt et en
local, avec un Chromium réel piloté par Playwright.

## 1. Ce qui existait avant cette intervention

Le site était déjà un site statique généré (`src/` → `tools/build.py` → HTML
racine), sans framework, avec deux thèmes, quatre pages, cinq projets web, une
application Android et quatre certificats. Le compte rendu de la refonte
précédente reste dans `COMPTE-RENDU-2026-11.md`.

Points de départ relevés avant modification :

- palette bleue + un rouge d'accent, polices **Manrope** et **DM Mono** ;
- logo = un `t` minuscule avec un point rouge sous la lettre ;
- pied de page minimal, contenant la mention « Site statique · aucun traceur
  d’audience intégré » ;
- aucune mise en orbite des compétences : trois cartes de « groupes » ;
- bouton APK pointant vers
  `github.com/…/releases/download/v1.0.0/Tchatz-Music-debug.apk`, en
  `target="_blank"` ;
- icônes SVG maison (jeu interne, pas Font Awesome).

## 2. Identité visuelle

| Rôle | Clair | Sombre |
| --- | --- | --- |
| Fond | `#f4f1ec` (blanc cassé chaud) | `#121417` |
| Surfaces | `#fffefc` / `#f8f5f0` | `#191c21` / `#1f232a` |
| Anthracite | `#1b1d21` | `#0f1114` |
| Bordeaux principal | `#7c1f2f` | `#a83446` |
| Bordeaux lumineux (accents) | `#a13a4a` | `#dd8c96` |
| Texte | `#1a1d22` | `#f3efea` |
| Texte secondaire | `#565e69` | `#b3ada6` |

Le bordeaux n'est jamais utilisé en aplat criard : il porte les actions
principales, les filets, les numéros de section et les accents lumineux (halos
radiaux à faible opacité). Les deux thèmes restent disponibles, la préférence
système est respectée et le choix explicite est conservé
(`tchatzdev.theme`).

## 3. Typographie

- **Plus Jakarta Sans** (variable, 200–800) pour les titres, le logo, les
  boutons et les libellés ;
- **Inter** (variable, 100–900) pour les paragraphes et les interfaces.

Les deux familles sont auto-hébergées, sous-ensemble latin, `font-display: swap`
et préchargées (75 604 octets au total, contre 43 052 pour Manrope + DM Mono).
Manrope, DM Mono et leurs licences ont été retirés pour éviter deux familles
inutilisées ; les licences OFL des nouvelles polices sont jointes.

## 4. Logo TchatzDev

Nouveau monogramme : un **T capital solide** (barre + hampe avec coupe en biseau),
une **barre d'appui gris clair** qui évoque une ligne de base de code, et un
**dégradé bordeaux** dans le carré arrondi. Le point sous la lettre a disparu.
Le tracé est un SVG de cinq nœuds, lisible de 16 px (favicon) à 180 px.

Décliné dans :

- l'en-tête et le pied de page (`.brand` + `.brand-mark`, deux tailles) ;
- le favicon (`assets/favicon.svg`) ;
- l'image de partage Open Graph, régénérée avec le nouveau monogramme.

## 5. Constellation de compétences (portrait + orbites)

`src/data/skills.json` décrit **3 orbites** et **12 compétences** ; `tools/build.py`
en déduit le HTML et génère `assets/css/orbits.css` (positions calculées
trigonométriquement, aucune position écrite à la main).

| Orbite | Rayon | Durée | Sens | Compétences |
| --- | --- | --- | --- | --- |
| Fondations web | 46 % | 32 s | horaire | HTML5, CSS3, JavaScript |
| Frameworks & back-end | 67,5 % | 48 s | antihoraire | React, Vue.js, PHP |
| Logiciel & systèmes | 87,5 % | 60 s | horaire | Python, Kotlin, Android, Git & GitHub, Linux, Accessibilité |

- Portrait dans un cercle parfait, anneau dégradé bordeaux → anthracite, image
  recadrée sur le visage (`object-position: 50% 10%`).
- Chaque compétence porte **son logo officiel** (Simple Icons) ou l'icône
  Font Awesome officielle pour l'accessibilité.
- Le système se fige dès que le pointeur entre dans la scène ; la compétence
  survolée s'inverse en bordeaux et **son nom s'affiche dans la pastille de
  légende** (région `aria-live`).
- Bouton **Pause / Reprendre** (clavier, `aria-pressed`), et arrêt complet si
  `prefers-reduced-motion: reduce`.
- Sur téléphone, seules les icônes orbitent (aucun chevauchement de texte) ; la
  légende nomme la compétence et les trois orbites sont listées dessous.
- Les compétences restent des `<button>` focusables, sans action de navigation.

## 6. Pied de page

Refonte complète, sur fond anthracite :

- logo + présentation courte de TchatzDev, badges lieu et domaines ;
- deux colonnes de navigation (Explorer / Réalisations) ;
- colonne contact : e-mail, WhatsApp, réseaux sociaux en icônes Font Awesome ;
- copyright avec **année dynamique** (`data-current-year`) ;
- retour en haut.

La mention « Site statique · aucun traceur d’audience intégré » a été
**supprimée**, et un test vérifie qu'aucune variante de cette mention ne
réapparaît dans le pied de page.

## 7. Téléchargement de Tchatz Music — cause réelle et correction

**Diagnostic.** Le bouton pointait vers une URL `…/releases/download/…` ouverte
dans un nouvel onglet. GitHub redirige alors vers
`objects.githubusercontent.com` (domaine non autorisé par la CSP du site et
souvent bloqué ou remplacé par l'application GitHub sur Android). La requête
sortait du site, d'où l'impression d'être renvoyé vers le profil GitHub.

**Correction.** L'APK officiel est désormais **hébergé par le site** :

- fichier `assets/downloads/Tchatz-Music-1.0.0-debug.apk`, **14 821 978 octets**,
  SHA-256 `99595ce5…305e2b` — identique à l'asset de la release `v1.0.0` ;
- lien `<a download="Tchatz-Music-1.0.0-debug.apk" type="application/vnd.android.package-archive">` ;
- `vercel.json` force `Content-Type: application/vnd.android.package-archive`,
  `Content-Disposition: attachment` et un cache d'une semaine pour
  `/assets/downloads/*.apk` ;
- aucun `window.open`, aucune URL GitHub, aucun message de fausse confirmation :
  seuls des faits (version, taille, empreinte, compatibilité) et un message
  d'état après le clic.

**Vérifié en navigateur réel**, avec un agent Android et avec un agent bureau :
le téléchargement se déclenche, le nom de fichier proposé est
`Tchatz-Music-1.0.0-debug.apk` et le fichier reçu fait bien 14 821 978 octets,
sans aucune requête externe.

**Version PC.** Aucune n'existe : le panneau l'indique explicitement
(« application Android uniquement ; depuis un ordinateur, enregistrez le fichier
puis transférez-le »). Aucun faux installateur PC n'est proposé.

## 8. Icônes Font Awesome

- `tools/sync_icons.py` extrait les tracés des paquets officiels
  `@fortawesome/fontawesome-free` 7.3.1 (licence CC BY 4.0) et `simple-icons`
  16.36.0 (CC0 1.0) et génère `tools/icon_data.py` (40 icônes).
- Le générateur intègre ces tracés dans un **sprite SVG inline** : aucune
  requête réseau, aucun fichier de police d'icônes, aucun emoji.
- Icônes de service : `laptop-code`, `mobile-screen`, `handshake` ; contact :
  `envelope`, `whatsapp`, `facebook-f` ; divers : `download`,
  `arrow-up-right-from-square`, `award`, `circle-info`, `universal-access`, etc.
- Crédits et licences : `assets/icons/LICENSE.md`, `LICENSE-fontawesome.txt`,
  `LICENSE-simple-icons.md`.

## 9. Qualité, accessibilité, SEO

- **80 vérifications de mise en page** (4 pages × 2 thèmes × 10 largeurs, de
  320 à 1920 px) : aucun débordement horizontal, aucun élément hors cadre.
- **6 audits axe-core** (3 pages × 2 thèmes, plus le menu mobile et la
  visionneuse) : **0 violation** WCAG 2 A/AA, 2.1 AA et bonnes pratiques.
  Trois contrastes insuffisants ont été corrigés (texte secondaire sur fond
  teinté, accent du logo en pied de page, bouton principal du panneau contact).
- Navigation clavier, lien d'évitement, focus visible, `Escape` sur le menu et
  la visionneuse, retour du focus, `aria-live` sur la légende.
- Aucune requête externe, aucune erreur JavaScript dans la console.
- SEO conservé et enrichi : titres/descriptions par page, canonical, Open
  Graph/Twitter (nouvelle image 1200 × 630), `h1` unique par page, alternatives
  textuelles, JSON-LD `Person` (compétences, formation, contact) et
  `CollectionPage` pour les catalogues.
- Performances : CSS/JS inchangés en nombre de fichiers (+1 feuille générée de
  1,3 Ko), deux polices variables au lieu de deux fichiers statiques, images
  avec dimensions réservées et chargement différé hors premier écran.

## 10. Points restant à traiter (hors dépôt)

1. **Poids de l'APK** : 14,8 Mo versionnés dans Git. C'est ce qui garantit un
   téléchargement direct, mais si le binaire grossit ou change souvent, mieux
   vaut le publier par une étape CI vers le stockage du site plutôt que de le
   commiter.
2. **Signature debug** : l'APK reste un build debug (signature de la CI). Une
   version signée en release serait nécessaire pour des mises à jour garanties
   et une éventuelle publication Play Store.
3. **Aucune capture d'écran réelle** de l'interface Tchatz Music : la fiche
   l'indique honnêtement plutôt que d'en simuler une.
4. **Déploiement** : à pousser sur Vercel pour vérifier `Content-Type` et
   `Content-Disposition` de l'APK en production ; le serveur de test applique
   déjà les en-têtes de `vercel.json`.
5. **Partage social** : l'image a été régénérée, mais les caches des réseaux
   sociaux peuvent afficher l'ancienne version quelques jours.
