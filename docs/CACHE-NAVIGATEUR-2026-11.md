# Correctif — mises à jour invisibles à cause du cache, 7 novembre 2026

Branche : `arena/bb6d24e5-portfolio`. Signalement utilisateur : « je n’arrive
toujours pas à voir la nouvelle mise à jour sur mon portable », alors que le
correctif de débordement horizontal était déjà fusionné et déployé.

## Cause

Le site est un site statique publié sur Vercel. La configuration contenait une
règle générale :

```json
{ "source": "/assets/(.*)", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
] }
```

Le HTML était bien revalidé (`max-age=0`), mais **toutes** les ressources de
`assets/` — donc `portfolio.css`, `orbits.css`, `main.js`, `theme.js` — étaient
conservées 24 heures par le navigateur, et jusqu’à 7 jours de plus en
`stale-while-revalidate` (côté CDN Vercel comme côté poste de travail). Or les
URL étaient stables : `assets/css/portfolio.css` restait identique d’une
publication à l’autre. Le dernier correctif du 7 novembre étant **exclusivement
CSS**, le navigateur pouvait donc afficher le nouvel HTML avec l’ancienne
feuille de style : aucune différence visible, barre horizontale toujours là.

## Correctif

1. `tools/build.py` ajoute l’empreinte du contenu à chaque feuille et script
   référencés (`assets/css/portfolio.css?v=bd9fe0bc31`). L’empreinte est
   recalculée à chaque génération, donc l’URL change dès que le fichier change.
2. `vercel.json` remplace la règle générale par des règles explicites :
   - `/assets/css/(.*)`, `/assets/js/(.*)`, `/assets/fonts/(.*)` :
     `public, max-age=31536000, immutable` — sans risque, l’URL est versionnée ;
   - `/assets/images/(.*)` : `public, max-age=3600, stale-while-revalidate=86400` ;
   - `/(.*).html` : inchangé, `public, max-age=0, must-revalidate` ;
   - APK : inchangé, `immutable` (fichier publié, jamais modifié).
3. `tests/test_static.py` ajoute
   `test_stylesheets_and_scripts_are_versioned_for_cache_busting` : les quatre
   pages doivent référencer les URL versionnées avec la bonne empreinte, et
   aucune règle générale de cache long ne doit réapparaître sur `/assets/(.*)`.

## Effet pour l’utilisateur

- Publication d’un correctif CSS ou JS : visible au premier rechargement, même
  sans vider le cache.
- Le HTML n’a plus besoin d’être « forcé » par `Ctrl+Shift+R` après un
  déploiement.

## Vérifications

- `python3 tools/build.py` puis `--check` : sortie à jour.
- `python3 -m unittest tests/test_static.py` : 15 tests, OK.
- `node --check` sur `theme.js`, `main.js` et `tests/server.mjs` : OK.

## Rappel de déploiement

Vercel publie la branche `main`. Tant que la fusion n’est pas faite, l’adresse
`https://tchatzdev.vercel.app` continue de servir la version précédente. Après
fusion, vérifier dans le tableau de bord Vercel que le déploiement de production
correspond bien au dernier commit de `main`.
