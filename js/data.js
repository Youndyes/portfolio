// ============================================================
//  CONTENU DU PORTFOLIO — c'est le seul fichier à modifier
//  pour mettre à jour tes infos et tes projets.
// ============================================================

const GITHUB = 'https://github.com/Youndyes';

export const profile = {
  name: 'Younes Bensallah',
  role: 'Étudiant en M2 Sciences et Technologie du Logiciel',
  school: 'Sorbonne Université',
  status: 'À la recherche d’un stage de fin d’études en développement logiciel',
  email: 'younes3138@gmail.com',
  github: GITHUB,
  linkedin: 'https://linkedin.com/in/younes-bensallah',
  cv: 'cv.pdf',
  about: [
    'Actuellement en Master 2 Sciences et Technologie du Logiciel à Sorbonne Université, je recherche un stage de fin d’études en développement pour l’année en cours.',
    'Parcours : Licence Informatique à l’Université Grenoble Alpes (2020 – 2024), puis Master 1 Systèmes logiciels et calculs distribués à l’Université Côte d’Azur (2025 – 2026).',
  ],
  experience: [
    { title: 'Projet de recherche : systèmes de fichiers pour SSD', org: 'INRIA / Université Côte d’Azur', date: 'Fév. – Mai 2026' },
    { title: 'Technicien HelpDesk', org: 'Econocom, Grenoble', date: 'Avr. – Juil. 2025' },
    { title: 'Technicien de proximité', org: 'EDF (via Econocom), Grenoble', date: 'Sept. – Nov. 2024' },
  ],
  skills: {
    'Backend': ['Java', 'Python', 'C', 'Spring / Spring Boot', 'Node.js / Express'],
    'Frontend': ['TypeScript', 'Angular'],
    'Bases de données': ['SQL', 'PostgreSQL', 'MongoDB'],
    'Outils et systèmes': ['Docker', 'Git', 'CI/CD (GitHub Actions)', 'Linux'],
    'Langues': ['Français (natif)', 'Anglais (courant)'],
    'Qualités': ['Autonomie', 'Rigueur', 'Communication'],
  },
};

// Chaque projet devient un bâtiment sur la carte (8 emplacements, les 4 premiers
// sont au centre de la ville, donc les plus visibles).
//   style : monument voxel (joyn, hive, pacman, sampler, twitch, ssd, compression, sbls)
//           ou bâtiment générique (house, tower, lab, factory)
//   color : couleur d'accent du bâtiment et de la dalle
//   demo  : { url, label, external? } → bouton « ▶ » qui ouvre la version web
//   note  : (optionnel) encadré affiché dans la fiche (ex. comptes de démo)
//   image : (optionnel) chemin d'une capture, ex. 'img/sampler.png'
export const projects = [
  {
    id: 'joyn',
    title: 'JOYN',
    year: '2026 · M2',
    style: 'joyn',
    color: '#f26b46',
    tags: ['Flutter', 'Dart', 'Web + Mobile', 'Docker', 'CI/CD', 'Cloudflare'],
    short: 'Plateforme de mise en relation candidats / entreprises pour l’alternance.',
    description: [
      'Application de mise en relation entre candidats et entreprises pour l’emploi, le stage et surtout l’alternance. L’idée : « faire le match avant la candidature », en croisant compétences, localisation, rythme et attentes des deux côtés.',
      'Projet d’équipe du Master 2 STL, développé en Flutter avec deux expériences distinctes (Web et Mobile) qui partagent la même logique métier.',
    ],
    highlights: [
      'Parcours complets : landing, authentification, inscription, onboarding (import de CV), tableaux de bord candidat et recruteur',
      'Architecture par features (data / domain / presentation), séparation Web / Mobile vérifiée automatiquement en CI',
      'Workflow Git rigoureux : branches courtes, PR avec revue, CI GitHub Actions, déploiement Docker / Cloudflare',
    ],
    note: 'Comptes de démo : recruteur@joyn.fr ou etudiant@joyn.fr — mot de passe Joyn2026',
    demo: { url: 'https://gpstl-joyn-front.joynpstl.workers.dev/', label: 'Ouvrir l’application', external: true },
    links: [],
  },
  {
    id: 'hive',
    title: 'Jeu Hive',
    year: 'Avr. – Juin 2024',
    style: 'hive',
    color: '#84cc16',
    tags: ['Java', 'Swing', 'POO', 'IA', 'Travail en équipe'],
    short: 'Le jeu de plateau Hive en Java, avec IA — jouable directement dans le navigateur.',
    description: [
      'Adaptation complète du jeu de plateau Hive, développée en équipe en Java / Swing : plateau hexagonal, 5 types d’insectes avec leurs règles de déplacement, partie à deux joueurs ou contre l’ordinateur.',
      'La démo exécute le vrai programme Java (.jar d’origine) dans le navigateur, grâce à une machine virtuelle Java compilée en WebAssembly (CheerpJ).',
    ],
    highlights: [
      'IA avec plusieurs niveaux de difficulté (aléatoire, débutant, moyen, difficile) basée sur des heuristiques et un parcours BFS',
      'Architecture MVC avec pattern Observateur, sauvegarde / chargement de partie, annulation des coups, écran de règles',
      'Conception orientée objet en équipe, revue de code et répartition des modules',
    ],
    note: 'Le premier chargement de la machine virtuelle Java prend 20 à 40 secondes.',
    demo: { url: 'demos/hive/', label: 'Jouer à Hive' },
    links: [],
  },
  {
    id: 'pacman',
    title: 'Pac-Man IA',
    year: 'Oct. – Déc. 2025',
    style: 'pacman',
    color: '#ffb703',
    tags: ['Java 21', 'Maven', 'Spring Boot', 'MongoDB', 'Docker', 'CI/CD', 'Algorithmique'],
    short: 'Labyrinthes générés, IA Minimax pour Pac-Man et fantômes A* — jouable en ligne.',
    description: [
      'Projet TER de Master 1 (en binôme) : un Pac-Man complet centré sur l’algorithmique et l’intelligence artificielle, avec une API REST déployée, une base MongoDB et des benchmarks.',
      'La démo est un portage JavaScript fidèle de la logique Java : on peut jouer soi-même, ou regarder l’IA jouer et changer en direct l’algorithme de chaque fantôme.',
    ],
    highlights: [
      'Génération de labyrinthes : Kruskal modifié pour une symétrie parfaite, puis suppression des culs-de-sac',
      'IA Pac-Man : Minimax avec élagage alpha-bêta (horizon de 4 coups), fonction d’évaluation et sécurités anti-boucle',
      'Fantômes configurables en A* ou en glouton ; benchmarks IA contre IA et graphiques en Python',
      'Pipeline CI/CD (GitHub Actions, tests unitaires) et déploiement conteneurisé (Docker)',
    ],
    demo: { url: 'demos/pacman/', label: 'Jouer / regarder l’IA' },
    links: [],
  },
  {
    id: 'sampler',
    title: 'Sampler Audio',
    year: 'Nov. 2025 – Jan. 2026',
    style: 'sampler',
    color: '#ff5d8f',
    tags: ['JavaScript', 'Web Audio API', 'Angular', 'Node.js', 'Express', 'MongoDB Atlas'],
    short: 'Sampler web : pads, effets temps réel, séquenceur, enregistrement micro.',
    description: [
      'Application web permettant de créer, éditer et jouer des kits de sons, réalisée en binôme en Master 1 : un front-end de sampling, une API REST Node.js / Express reliée à MongoDB Atlas et une interface d’administration en Angular.',
      'Dans la démo, les kits sont servis en statique (sans serveur) : on peut jouer les pads à la souris ou au clavier, appliquer des effets et composer avec le séquenceur.',
    ],
    highlights: [
      'Mon rôle : architecture du moteur audio (Web Audio API), chaîne d’effets, séquenceur et enregistrement micro',
      'Séparation stricte moteur / interface (SamplerEngine / SamplerGUI), support MIDI, recherche de sons sur Freesound',
    ],
    demo: { url: 'demos/sampler/', label: 'Ouvrir le sampler' },
    links: [{ label: 'Code source', url: `${GITHUB}/Projet-Sampler-Audio-Angular` }],
  },
  {
    id: 'twitch',
    title: 'Extension Twitch',
    year: 'Mars 2025',
    style: 'twitch',
    color: '#a970ff',
    tags: ['Chrome Manifest V3', 'JavaScript', 'Node.js', 'Express', 'Webhooks'],
    short: 'Extension Chrome qui notifie en temps réel le lancement d’un live Twitch.',
    description: [
      'Extension Chrome (Manifest V3) qui prévient dès qu’une chaîne Twitch passe en direct, avec une popup affichant le titre, la catégorie, le nombre de spectateurs et l’aperçu du stream.',
      'La démo affiche la vraie popup de l’extension dans un faux navigateur, avec des données simulées pour l’API Twitch.',
    ],
    highlights: [
      'Service worker en arrière-plan : vérification périodique (chrome.alarms), icône dynamique et notifications système',
      'Serveur Node.js / Express qui reçoit les événements Twitch EventSub et YouTube par webhooks',
      'Préférences de notification persistées avec chrome.storage',
    ],
    demo: { url: 'demos/twitch/', label: 'Essayer l’extension' },
    links: [],
  },
  {
    id: 'ssd',
    title: 'Recherche SSD · INRIA',
    year: 'Fév. – Mai 2026',
    style: 'ssd',
    color: '#4cc9f0',
    tags: ['Linux', 'Bash', 'Python', 'Matplotlib', 'Systèmes de fichiers'],
    short: 'Étude comparative de systèmes de fichiers pour SSD (INRIA / Université Côte d’Azur).',
    description: [
      'Projet de recherche de Master 1 (UCA / INRIA, Sophia Antipolis), encadré par Sid Touati : une étude comparative des systèmes de fichiers conçus pour la mémoire flash, avec ou sans contrôleur FTL.',
      'Le projet prolonge des travaux antérieurs en intégrant VeraCrypt (chiffrement à la volée), en étudiant l’overhead selon la taille des blocs au formatage et en mesurant le nombre maximal de fichiers et de répertoires.',
    ],
    highlights: [
      'Benchmarks pratiques de JFFS2 et UBIFS (flash brute MTD, via block2mtd), de F2FS et de VeraCrypt sous Kali Linux / VirtualBox',
      'Analyse théorique des systèmes historiques JFFS, YAFFS2 et LogFS',
      'Résultats : UBIFS surpasse nettement JFFS2 en écriture séquentielle, VeraCrypt ajoute un overhead modéré, F2FS a un overhead de formatage plus élevé',
      'Mesures automatisées en Bash, graphiques en Python (Matplotlib), rapport de 16 pages et soutenance orale',
    ],
    doc: { url: 'docs/rapport-ssd-inria.pdf', label: 'Lire le rapport (16 pages)', title: 'Étude comparative des systèmes de fichiers pour SSD' },
    links: [],
  },
  {
    id: 'compression',
    title: 'Compression d’entiers',
    year: 'Oct. – Nov. 2025',
    style: 'compression',
    color: '#4ade80',
    tags: ['Java', 'Bash', 'Algorithmique', 'Performance'],
    short: 'Compression d’entiers par bit packing avec accès direct aux éléments.',
    description: [
      'Projet de Software Engineering à l’Université Côte d’Azur : implémenter plusieurs méthodes de compression d’entiers tout en conservant l’accès direct à chaque élément, afin d’accélérer les transmissions de données.',
      'Chaque mode est mesuré : taille compressée, temps de compression et de décompression, coût d’un accès get(i), et débit réseau à partir duquel la compression devient rentable.',
    ],
    highlights: [
      'Plusieurs modes de bit packing, dont un mode avec zone de débordement (overflow)',
      'Banc de tests automatisé par scripts Bash, avec un résumé comparatif des résultats',
    ],
    links: [{ label: 'Code source', url: `${GITHUB}/Software-Engineering-Project-2025` }],
  },
  {
    id: 'sbls',
    title: 'Solveur SBLS',
    year: 'Janv. 2026',
    style: 'sbls',
    color: '#ff8a3d',
    tags: ['Java', 'Choco Solver', 'Programmation par contraintes'],
    short: 'Solveur de contraintes pour les carrés latins spatialement équilibrés.',
    description: [
      'Solveur pour le problème des Spatially Balanced Latin Squares (SBLS), réalisé avec Choco Solver en Master 1.',
      'Comparaison entre un modèle simple et une méthode intégrant l’équilibre spatial : pour n = 5, l’arbre de recherche passe de 6 735 à 327 nœuds explorés.',
    ],
    links: [{ label: 'Code source', url: `${GITHUB}/Spatially-Balanced-Latin-Square-SBLS-Bensallah` }],
  },
];
