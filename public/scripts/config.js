// ==========================================
// CONFIGURATION CENTRALISÉE DE L'APPLICATION
// ==========================================

console.log('🔧 Chargement de config.js...');

// Vérification que window.ENV existe
if (!window.ENV) {
    console.error('❌ window.ENV n\'est pas défini ! Vérifiez que env-config.js est chargé.');
    window.ENV = {
        API_URL: 'http://127.0.0.1:5000',
        BUCKET_NAME: 'fallback-bucket',
        REGION: 'eu-west-3',
        COGNITO: {
            USER_POOL_ID: '',
            CLIENT_ID: '',
            REGION: 'eu-west-3'
        },
        AUTH: {
            LOGIN_PAGE: 'login.html',
            HOME_PAGE: 'index.html',
            LOGOUT_REDIRECT: 'login.html'
        }
    };
    console.warn('⚠️ Utilisation des valeurs par défaut pour ENV');
}

// Définition de CONFIG
const CONFIG = {
    // API URL - Utilise env-config.js
    API_URL: window.ENV.API_URL || 'http://127.0.0.1:5000',

    // AWS Configuration
    BUCKET_NAME: window.ENV.BUCKET_NAME || 'default-bucket',
    REGION: window.ENV.REGION || 'eu-west-3',
    PROXY_URL: window.ENV.PROXY_URL || 'https://test.io/?',
    TIMEOUT: window.ENV.TIMEOUT || 60000,

    // ⭐ Configuration Cognito
    COGNITO: {
        USER_POOL_ID: window.ENV.COGNITO?.USER_POOL_ID || '',
        CLIENT_ID: window.ENV.COGNITO?.CLIENT_ID || '',
        REGION: window.ENV.COGNITO?.REGION || window.ENV.REGION || 'eu-west-3'
    },

    // ⭐ Configuration Auth
    AUTH: {
        LOGIN_PAGE: window.ENV.AUTH?.LOGIN_PAGE || 'index.html',
        HOME_PAGE: window.ENV.AUTH?.HOME_PAGE || 'accueil.html',
        TOKEN_KEY: 'idToken',
        USER_KEY: 'userEmail',
        SESSION_KEY: 'cognitoSession'
    },

    // Endpoints API
    ENDPOINTS: {
        GET_ALL_FILES: '/files',
        GET_FILE_DATA: '/file/{filename}',
        GET_PAGE: '/page',
        UPLOAD_FILE: '/upload_file',
        DELETE_FILE: '/delete_file',
        SAVE_SEARCH: '/save-search',
    },

    // Constantes application
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_FILE_TYPES: ['.json'],

    // Messages
    MESSAGES: {
        ERROR_NETWORK: 'Erreur de connexion au serveur',
        ERROR_NO_FILES: 'Aucun fichier disponible',
        ERROR_FILE_NOT_FOUND: 'Fichier introuvable',
        ERROR_INVALID_FORMAT: 'Format de fichier invalide',
        SUCCESS_UPLOAD: 'Fichier uploadé avec succès',
        SUCCESS_DELETE: 'Fichier supprimé avec succès',
        // ⭐ Messages d'authentification
        ERROR_NOT_AUTHENTICATED: 'Vous devez être connecté',
        ERROR_SESSION_EXPIRED: 'Session expirée, veuillez vous reconnecter',
        SUCCESS_LOGIN: 'Connexion réussie',
        SUCCESS_LOGOUT: 'Déconnexion réussie'
    }
};

// Fonction pour construire les URLs d'API
CONFIG.getApiUrl = function(endpoint) {
    const path = this.ENDPOINTS[endpoint] || endpoint;
    const url = `${this.API_URL}${path}`;
    // console.log(`🔗 getApiUrl("${endpoint}") => ${url}`);
    return url;
};

// ⭐ Fonction pour récupérer le token d'authentification
CONFIG.getAuthToken = function() {
    const token = localStorage.getItem(this.AUTH.TOKEN_KEY);
    // if (!token) {
    //     console.warn('⚠️ Aucun token d\'authentification trouvé');
    // }
    return token;
};

// ⭐ Fonction pour récupérer l'utilisateur courant
CONFIG.getCurrentUser = function() {
    // Essayer d'abord de récupérer depuis localStorage
    let userEmail = localStorage.getItem(this.AUTH.USER_KEY);

    // Si pas trouvé, décoder depuis le token idToken
    if (!userEmail) {
        const idToken = this.getAuthToken();
        if (idToken) {
            try {
                // Décoder le JWT (la partie payload est entre les deux points)
                const payload = idToken.split('.')[1];
                const decodedPayload = JSON.parse(atob(payload));
                userEmail = decodedPayload.email;

                // Stocker l'email pour les prochaines fois
                if (userEmail) {
                    localStorage.setItem(this.AUTH.USER_KEY, userEmail);
                }
            } catch (e) {
                console.warn('⚠️ Impossible de décoder le token:', e);
            }
        }
    }

    return userEmail;
};

// ⭐ Fonction pour vérifier si l'utilisateur est authentifié
CONFIG.isAuthenticated = function() {
    const token = this.getAuthToken();
    const isAuth = !!token;
    // console.log(`🔐 isAuthenticated: ${isAuth}`);
    return isAuth;
};

// ⭐ Fonction pour effacer la session
CONFIG.clearSession = function() {
    localStorage.removeItem(this.AUTH.TOKEN_KEY);
    localStorage.removeItem(this.AUTH.USER_KEY);
    localStorage.removeItem(this.AUTH.SESSION_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('loginTime');
    // console.log('🗑️ Session effacée');
};

// Rendre CONFIG disponible globalement
window.CONFIG = CONFIG;

// Log de la configuration
// console.log('✅ CONFIG chargé avec succès');
// console.log('📡 CONFIG.API_URL:', CONFIG.API_URL);
// console.log('📡 CONFIG.PROXY_URL:', CONFIG.PROXY_URL);
// console.log('🪣 CONFIG.BUCKET_NAME:', CONFIG.BUCKET_NAME);
// console.log('🌍 CONFIG.REGION:', CONFIG.REGION);
// console.log('🔐 CONFIG.COGNITO.USER_POOL_ID:', CONFIG.COGNITO.USER_POOL_ID);
// console.log('🔐 CONFIG.COGNITO.CLIENT_ID:', CONFIG.COGNITO.CLIENT_ID ? '***' + CONFIG.COGNITO.CLIENT_ID.slice(-4) : 'Non défini');
// console.log('🏠 CONFIG.AUTH.HOME_PAGE:', CONFIG.AUTH.HOME_PAGE);
// console.log('📝 CONFIG.ENDPOINTS:', CONFIG.ENDPOINTS);

// // Test de la fonction getApiUrl
// console.log('🧪 Test getApiUrl:');
// console.log('   GET_ALL_FILES:', CONFIG.getApiUrl('GET_ALL_FILES'));
// console.log('   GET_FILE_DATA:', CONFIG.getApiUrl('GET_FILE_DATA'));

// // Vérification du type de getApiUrl
// console.log('🔍 Type de CONFIG.getApiUrl:', typeof CONFIG.getApiUrl);

// Vérification de l'environnement
if (CONFIG.API_URL.includes('localhost') || CONFIG.API_URL.includes('127.0.0.1')) {
    // console.warn('⚠️ Mode développement détecté - API locale');
} else {
    // console.log('✅ Mode production - API distante');
}

// ⭐ Vérification de la configuration Cognito
if (!CONFIG.COGNITO.USER_POOL_ID || !CONFIG.COGNITO.CLIENT_ID) {
    console.warn('⚠️ Configuration Cognito incomplète - L\'authentification ne fonctionnera pas');
} else {
    // console.log('✅ Configuration Cognito OK');
}

// console.log('✅ config.js chargé complètement');
