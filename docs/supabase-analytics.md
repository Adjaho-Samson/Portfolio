# Activer l’audience et le tableau de bord TchatzDev

L’intégration Supabase est préparée dans le dépôt, mais **n’est pas activée** : aucune URL de projet, clé publique, statistique ou capture d’écran n’a été inventée.

### Audit du Supabase déjà connecté

Le seul projet Supabase visible est celui de **Tchatz Klassio**. Son schéma contient déjà `analytics_events`, `api_track_event` et `api_admin_stats`; son authentification autorise actuellement les inscriptions nécessaires à Klassio. Cette mesure d’audience est liée à l’activité de Klassio et à ses propres rôles. **N’appliquez pas la migration TchatzDev à ce projet et ne modifiez pas ses réglages Auth** : cela mélangerait les métriques des deux produits et pourrait empêcher les étudiants/responsables de Klassio de s’inscrire. Aucun changement n’a été envoyé à ce projet.

La migration `portfolio_events` de ce dépôt est destinée à un **projet Supabase distinct, dédié à TchatzDev**. Créez ce projet séparé (ou fournissez plus tard un autre projet clairement réservé au portfolio) avant d’appliquer le schéma. La connexion client reste volontairement vide jusque-là. Tant que `analytics-config.js` reste vide, le portfolio n’envoie aucune requête de mesure et le tableau de bord n’affiche que des états vides / zéro. Même configurée, la collecte attend le consentement explicite du visiteur et respecte Do Not Track / Global Privacy Control.

## Architecture et limites de confiance

- Le portfolio statique transmet uniquement des événements autorisés à `supabase/functions/portfolio-event/`.
- L’Edge Function valide l’origine, le type d’événement, les chemins, les catégories et les identifiants de session avant l’écriture. Les événements publics ne peuvent pas lire les tables.
- `SUPABASE_SERVICE_ROLE_KEY` est utilisé exclusivement par l’Edge Function côté serveur. Ne le copiez **jamais** dans `analytics-config.js`, un fichier HTML, les variables Vercel préfixées `VITE_` ou un navigateur.
- Le tableau de bord utilise la clé publique Supabase pour Auth puis appelle `portfolio_dashboard`. La fonction SQL contrôle `auth.uid()` par rapport à `portfolio_admins`; les tables ont RLS activé et n’accordent aucun accès direct aux rôles `anon` / `authenticated`.
- L’adresse IP, le chemin complet d’un référent, les paramètres d’URL, les données de compte ou les contenus consultés ne sont pas collectés. Le domaine référent, la catégorie d’appareil et le nom général du navigateur le sont.
- L’identifiant aléatoire est conservé dans `sessionStorage` pour l’onglet courant. Les visiteurs uniques sont donc une **estimation de sessions d’onglets**, pas une identification d’une personne entre appareils ou onglets. Les pages consultées sont dédupliquées au rechargement dans cet onglet.
- En cas d’indisponibilité Supabase, le site continue normalement sans bloquer la navigation; les événements non envoyés ne sont pas simulés ni comptabilisés.

## Mise en service

1. Créez un **nouveau projet Supabase dédié à TchatzDev** (ne sélectionnez pas `tchatz-klassio`). Dans **Authentication → Providers / Settings**, activez l’authentification par e-mail et **désactivez les inscriptions publiques**. Créez le seul compte administrateur depuis la console Supabase. Activez l’authentification multifacteur du compte si elle est disponible dans votre offre.
2. Appliquez `supabase/migrations/20261107_portfolio_analytics.sql` via le SQL Editor ou votre pipeline de migrations.
3. Dans **Authentication → Users**, copiez l’UUID du compte administrateur, puis autorisez uniquement cet utilisateur :

   ```sql
   insert into public.portfolio_admins (user_id)
   values ('UUID-DU-COMPTE-ADMIN');
   ```

   Remplacez la valeur par l’UUID réel depuis la console; ne créez pas de compte public dans le portfolio.

4. Installez la CLI Supabase et liez le bon projet. Déployez la fonction publique de collecte (elle ne demande pas de session visiteur; ses validations et la limite de débit SQL remplacent cette vérification) :

   ```sh
   supabase link --project-ref VOTRE_PROJECT_REF
   supabase functions deploy portfolio-event --no-verify-jwt
   supabase secrets set SITE_ORIGIN=https://tchatzdev.vercel.app
   ```

   `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis à l’environnement de la fonction par Supabase. Si vous utilisez une URL de déploiement différente, définissez exactement son origine HTTPS dans `SITE_ORIGIN`.

5. Dans `analytics-config.js`, renseignez l’URL du projet (`https://….supabase.co`) et sa **publishable key / ancienne anon key** publique. Cette clé est conçue pour le navigateur, mais RLS reste indispensable. N’y mettez aucune clé secrète. Le même fichier configure le tableau de bord.
6. Déployez les fichiers statiques et testez une visite, un clic de projet et une connexion administrateur. Une visite de test est une donnée réelle : supprimez-la ensuite si vous ne souhaitez pas la conserver.
7. Vérifiez depuis une fenêtre privée qu’un visiteur non connecté peut seulement afficher l’écran de connexion. Même si le fichier `admin.html` est récupérable sur un hébergement statique, les agrégats ne sont jamais retournés sans authentification **et** appartenance à la liste `portfolio_admins`.

## Statistiques et périodes

L’écran propose 7, 30 et 90 jours pour la courbe, les pages, projets et répartitions. Le classement « projets consultés » mesure une impression quand au moins 55 % d’une fiche entre dans l’écran (une fois par projet et par onglet); les clics sortants sont comptés séparément. Les totaux « aujourd’hui », « semaine » et « mois » suivent UTC. Les liens projets sont suivis lorsqu’ils portent l’attribut `data-track-project`. Le lien GitHub Release de l’APK debug Tchatz Music est également suivi (`data-track-music-download`) ; cette métrique compte les clics vers le téléchargement, pas les installations.

Les événements sont conservés dans `portfolio_events` jusqu’à suppression explicite. Définissez une durée de conservation adaptée à vos besoins et règles locales avant une collecte durable; cette version ne lance pas de suppression automatique qui effacerait des données sans votre accord. Le trigger rejette un volume supérieur à 240 événements par identifiant de session et par heure; cette limite réduit les abus accidentels mais ne constitue pas un service anti-bot complet.

## Dépannage

- **L’écran indique « non configuré »** : les deux champs de `analytics-config.js` sont vides ou l’URL ne commence pas par HTTPS.
- **La collecte renvoie 403** : `SITE_ORIGIN` doit correspondre exactement à l’origine qui sert le portfolio (schéma, hôte, port éventuel).
- **Les stats restent à zéro** : vérifiez l’onglet Réseau, le déploiement de la fonction, la migration et la table `portfolio_events`. Zéro est affiché honnêtement lorsqu’aucun événement n’est arrivé.
- **La connexion ne donne pas accès aux stats** : confirmez que l’inscription est fermée, que l’utilisateur Supabase est confirmé et que son UUID figure dans `portfolio_admins`.
- Ne partagez jamais une clé `service_role`, un mot de passe admin ou un jeton de session pour diagnostiquer.
