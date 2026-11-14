# Bibliothèques tierces

Fichiers copiés tels quels depuis les paquets npm officiels, servis depuis ce
domaine (la CSP de production interdit tout script distant).

| Fichier servi | Paquet | Version | Licence |
| --- | --- | --- | --- |
| `assets/js/vendor/gsap.min.js` | [gsap](https://www.npmjs.com/package/gsap) | 3.15.1 | GreenSock Standard License — voir `gsap-LICENSE.txt` |
| `assets/js/vendor/ScrollTrigger.min.js` | [gsap](https://www.npmjs.com/package/gsap) | 3.15.1 | GreenSock Standard License — voir `gsap-LICENSE.txt` |
| `assets/js/vendor/lenis.min.js` | [lenis](https://www.npmjs.com/package/lenis) | 1.3.27 | MIT — voir `lenis-LICENSE.txt` |

Le plugin ScrollTrigger est distribué dans le paquet `gsap` ; il est utilisé ici
pour le défilement animé. Aucun plugin « Club GreenSock » payant n'est inclus.
Ces fichiers ne sont jamais modifiés à la main : pour les mettre à jour,
reprendre les fichiers `dist/*.min.js` des paquets npm correspondants.
