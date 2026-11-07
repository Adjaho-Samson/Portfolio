# Portfolio TchatzDev

Portfolio statique en HTML, CSS et JavaScript, sans framework de production. Les fichiers principaux sont `index.html`, `style.css` et `script.js`; `certification.html` conserve la page et la visionneuse PDF. `admin.html` est un espace de connexion séparé.

## Prévisualiser et vérifier

```sh
python3 -m http.server 4173 --bind 0.0.0.0
python3 -m unittest tests/test_static.py -v
node --check script.js
node --check admin.js
```

L’ouverture des liens externes, du menu mobile, des certificats et du formulaire de connexion nécessite un navigateur. Les PDFs de certificats sont conservés dans `Certificats/`.

## Statistiques Supabase (facultatives)

Aucune clé de projet ni donnée d’audience n’est versionnée. Laissez `analytics-config.js` vide pour désactiver la collecte. Le projet Supabase déjà connecté sert à **Tchatz Klassio** et possède ses propres tables/fonctions d’analytique : ne l’utilisez pas pour les métriques du portfolio. La configuration TchatzDev doit viser un projet dédié. Pour activer l’authentification, le stockage sécurisé, l’Edge Function et le tableau de bord, suivez **[docs/supabase-analytics.md](docs/supabase-analytics.md)**. N’exposez jamais `SUPABASE_SERVICE_ROLE_KEY`; seule la clé publique Supabase va dans la configuration navigateur. Le consentement explicite du visiteur et Do Not Track / Global Privacy Control sont respectés.

## Projets et ressources

TchatzSafe, Tchatz Klassio, SpeedType et Tchatz Music sont présentés à partir de leurs dépôts et descriptions disponibles. Le portfolio contient une capture réelle de TchatzSafe; les visuels de Klassio et SpeedType sont volontairement typographiques, pas des captures d’écran. Le dépôt Android et l’APK GitHub Release v1.0.0 de Tchatz Music sont liés depuis la section dédiée ; le fichier est identifié comme build debug. Aucune capture réelle de l’interface mobile n’étant disponible, le téléphone affiché est explicitement conceptuel.
