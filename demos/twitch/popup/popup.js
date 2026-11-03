document.addEventListener("DOMContentLoaded", () => {
    const loadingScreen = document.getElementById("loading-screen");

    // Simuler un temps de chargement ou attendre que le contenu soit prêt
    setTimeout(() => {
        document.body.classList.add('loaded'); // Affiche le contenu principal
        loadingScreen.classList.add('hidden'); // Masque l'écran de chargement
    }, 1800); // Temps de chargement simulé (1800ms)
});


document.addEventListener("DOMContentLoaded", async () => {
    const notificationMenu = document.getElementById("notification-menu");
    const bellButton = document.getElementById("bell-button");

    // Sélecteurs des paramètres
    const twitchCheckbox = document.getElementById('notif-twitch');
    const youtubeCheckbox = document.getElementById('notif-youtube');

    // Sélecteurs Twitch
    const statusText = document.querySelector('.live-status');
    const previewImage = document.querySelector('#preview-image');
    const streamTitle = document.querySelector('#stream-title');
    const streamCategory = document.querySelector('#stream-category');
    const viewerCount = document.querySelector('#stream-viewers');

    // Charger les paramètres sauvegardés
    const loadSettings = async () => {
        const { settings } = await chrome.storage.local.get('settings') || {};
        console.log('Paramètres récupérés :', settings);

        if (twitchCheckbox) twitchCheckbox.checked = settings?.twitch ?? true;
        if (youtubeCheckbox) youtubeCheckbox.checked = settings?.youtube ?? true;
    };

    // Sauvegarder les paramètres
    const saveSettings = () => {
        const settings = {
            twitch: twitchCheckbox?.checked ?? true,
            youtube: youtubeCheckbox?.checked ?? true,
        };

        chrome.storage.local.set({ settings }, () => {
            console.log('Paramètres sauvegardés :', settings);
        });
    };

    // Gestion des événements pour le menu des notifications
    bellButton.addEventListener("click", () => {
        notificationMenu.classList.toggle("visible");
    });

    notificationMenu.addEventListener("change", saveSettings);

    document.addEventListener("click", (event) => {
        const isOutsideMenu = !notificationMenu.contains(event.target) && !bellButton.contains(event.target);
        if (isOutsideMenu) {
            notificationMenu.classList.remove("visible");
        }
    });

    // Charger les données Twitch
    const fetchTwitchData = async () => {
        const clientId = 'DEMO'; // identifiants retirés de la démo publique
        const accessToken = 'DEMO';
        const userLogin = 'otplol_';

        try {
            const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${userLogin}`, {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();
            console.log('Données Twitch récupérées :', data);

            if (data.data?.length > 0) {
                const stream = data.data[0];


                previewImage.src = stream.thumbnail_url.replace('{width}', '400').replace('{height}', '225');
                streamTitle.textContent = `${stream.title}`;
                streamCategory.innerHTML = `<img src="src/manette.svg" class="icon" alt="Gamepad"> ${stream.game_name} &nbsp;&nbsp;
                            <img src="src/eye.svg" class="icon" alt="Eye"> ${stream.viewer_count}`;




                streamTitle.style.color = '#C3A879';
                streamCategory.style.color = '#C3A879';
                

            } else {
                // Stream hors ligne
                streamTitle.textContent = '';
                streamCategory.textContent = '';
                viewerCount.textContent = '';
            
                // Masquer la vidéo et afficher le message offline
                document.querySelector('.video-preview').classList.add('hidden');
                document.getElementById('offline-message').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des données Twitch :', error);
            statusText.textContent = 'Erreur de chargement.';
            statusText.style.color = 'red';
        }
    };

    // Initialisation
    document.body.classList.add('loaded');
    await loadSettings();
    await fetchTwitchData();
});
