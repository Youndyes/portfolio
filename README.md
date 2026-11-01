# Portfolio isométrique en pixel art

Un portfolio interactif : on conduit une petite voiture sur une île en vue isométrique,
et chaque bâtiment ouvre la fiche d'un projet. Une « version classique » (liste) est
disponible pour les recruteurs pressés.

## Lancer en local

Aucune installation n'est nécessaire (pas de Node, pas de build). Lancez simplement :

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Puis ouvrez <http://localhost:8080>. Un serveur est nécessaire, car les modules ES ne se chargent pas en `file://`.

## Personnaliser

Tout le contenu se trouve dans **`js/data.js`** :

- `profile` : nom, formation, e-mail, liens GitHub/LinkedIn, paragraphes « À propos », compétences ;
- `projects` : jusqu'à 8 projets. Chacun devient un bâtiment (`style` : `house`, `tower`, `lab` ou `factory`, plus une couleur `color`). Les emplacements vides affichent un chantier « Bientôt… ».

Pour le CV, déposez `cv.pdf` à la racine. Pour les captures d'écran, ajoutez `image: 'img/mon-projet.png'` à un projet.

## Mise en ligne (GitHub Pages)

1. Poussez le dossier dans un dépôt GitHub (par exemple `ton-pseudo.github.io`).
2. Allez dans Settings → Pages → Source : branche `main`, dossier `/ (root)`.

Le site étant statique, il fonctionne aussi tel quel sur Netlify, Vercel ou Cloudflare Pages.

## Structure

| Fichier | Rôle |
|---|---|
| `js/main.js` | rendu basse résolution, caméra isométrique alignée au pixel, boucle, entrées |
| `js/world.js` | génération de l'île : routes, bâtiments, dalles, arbres, eau, nuages |
| `js/car.js` | modèle 3D de la voiture, physique arcade, collisions, silhouette à travers les murs |
| `js/ui.js` | écran d'accueil, panneaux de projets, liste, aide |
| `js/minimap.js` | mini-carte tournée à 45° |
| `js/particles.js` | poussière, fumée, traces de pneus |

## Commandes

ZQSD / WASD / flèches pour se déplacer (la voiture va dans la direction indiquée à l'écran
et s'arrête dès qu'on relâche), E ou Entrée pour entrer,
R pour revenir au départ, la molette pour zoomer. On peut aussi cliquer directement sur un bâtiment.
Sur mobile, des boutons tactiles s'affichent à l'écran.
