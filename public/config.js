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
        REGION: 'eu-west-3'
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
    
    // Endpoints API
    ENDPOINTS: {
        GET_ALL_FILES: '/files',
        GET_FILE_DATA: '/file/{filename}',
        UPLOAD_FILE: '/upload_file',
        DELETE_FILE: '/delete_file'
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
        SUCCESS_DELETE: 'Fichier supprimé avec succès'
    }
};

// ⚠️ IMPORTANT : Définir getApiUrl comme propriété de CONFIG
CONFIG.getApiUrl = function(endpoint) {
    const path = this.ENDPOINTS[endpoint] || endpoint;
    const url = `${this.API_URL}${path}`;
    console.log(`🔗 getApiUrl("${endpoint}") => ${url}`);
    return url;
};

// Rendre CONFIG disponible globalement
window.CONFIG = CONFIG;

// Log de la configuration
console.log('✅ CONFIG chargé avec succès');
console.log('📡 CONFIG.API_URL:', CONFIG.API_URL);
console.log('🪣 CONFIG.BUCKET_NAME:', CONFIG.BUCKET_NAME);
console.log('🌍 CONFIG.REGION:', CONFIG.REGION);
console.log('📝 CONFIG.ENDPOINTS:', CONFIG.ENDPOINTS);
console.log('💬 CONFIG.MESSAGES:', CONFIG.MESSAGES);

// Test de la fonction getApiUrl
console.log('🧪 Test getApiUrl:');
console.log('   GET_ALL_FILES:', CONFIG.getApiUrl('GET_ALL_FILES'));
console.log('   GET_FILE_DATA:', CONFIG.getApiUrl('GET_FILE_DATA'));

// Vérification du type de getApiUrl
console.log('🔍 Type de CONFIG.getApiUrl:', typeof CONFIG.getApiUrl);

// Vérification de l'environnement
if (CONFIG.API_URL.includes('localhost') || CONFIG.API_URL.includes('127.0.0.1')) {
    console.warn('⚠️ Mode développement détecté - API locale');
} else {
    console.log('✅ Mode production - API distante');
}

console.log('✅ config.js chargé complètement');
