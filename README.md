# Portfolio de Younes Bensallah

**Visiter le site : https://youndyes.github.io/portfolio/**

Étudiant en M2 Sciences et Technologie du Logiciel à Sorbonne Université, je recherche une **alternance en développement logiciel**.

Plutôt qu'un CV de plus, j'ai voulu un portfolio qu'on explore : on conduit une petite voiture sur une île en vue isométrique, en pixel art. Chaque monument représente un de mes projets. Il suffit de s'arrêter devant pour le découvrir et, souvent, l'essayer directement dans le navigateur.

Vous êtes pressé ? Le bouton **« Version classique »** de l'écran d'accueil affiche tous les projets sous forme de liste.

## Les projets

| Projet | En bref | À essayer |
|---|---|---|
| **JOYN** | Plateforme de mise en relation candidats / entreprises pour l'alternance | Site en ligne |
| **Jeu Hive** | Le jeu de plateau Hive en Java, avec une IA | Jouable dans le navigateur |
| **Pac-Man IA** | Labyrinthes générés, Pac-Man piloté par Minimax, fantômes en A* | Jouable dans le navigateur |
| **Sampler Audio** | Sampler web : pads, effets en temps réel, séquenceur, enregistrement micro | Démo dans le navigateur |
| **Extension Twitch** | Extension Chrome qui prévient quand un live commence | Démo dans le navigateur |
| **Recherche SSD · INRIA** | Étude comparative de systèmes de fichiers pour SSD | Rapport (PDF) |
| **Compression d'entiers** | Compression par *bit packing* avec accès direct aux éléments | Code sur GitHub |
| **Solveur SBLS** | Solveur de contraintes pour les carrés latins spatialement équilibrés | Code sur GitHub |

Le site donne aussi accès à mon CV, à une présentation de mon parcours et de mes compétences, et à mes coordonnées.

## Comment jouer

| | Ordinateur | Mobile |
|---|---|---|
| Se déplacer | ZQSD ou flèches | Joystick |
| Entrer dans un bâtiment | Espace ou E | Bouton ENTRER |
| Zoomer | Molette | Boutons + et − |
| Revenir au départ | R | — |

On peut aussi cliquer directement sur un bâtiment, ou ouvrir la liste des projets avec le bouton **☰ Projets**.

## Aspects techniques

Le site est entièrement statique : HTML, CSS et JavaScript, sans framework ni étape de build.

- **Rendu 3D** avec [Three.js](https://threejs.org), dessiné en basse résolution puis agrandi pixel par pixel pour obtenir l'effet pixel art, avec une caméra isométrique alignée sur la grille de pixels pour éviter le scintillement.
- **Monuments en voxels**, générés à partir de petits dessins en pixel art. Le décor fixe est fusionné en quelques maillages pour rester fluide, y compris sur téléphone.
- **Voiture arcade** : elle va dans la direction indiquée à l'écran, s'arrête dès qu'on relâche, et reste visible en silhouette derrière les bâtiments.
- **Démos jouables** :
  - Hive tourne avec son `.jar` Java d'origine, exécuté dans le navigateur grâce à [CheerpJ](https://cheerpj.com).
  - Pac-Man est un portage JavaScript de la logique Java du projet.
  - Le Sampler et l'extension Twitch utilisent leur vraie interface, avec un serveur et des API simulés.
