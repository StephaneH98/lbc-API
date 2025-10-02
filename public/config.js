// Configuration de l'application
// Ce fichier sera modifié après le déploiement de l'API

const CONFIG = {
    API_URL: window.ENV?.API_URL || 'http://localhost:5000',
    BUCKET_NAME: window.ENV?.BUCKET_NAME || 'bucket-test-new-app',
    AWS_REGION: window.ENV?.AWS_REGION || 'eu-west-3',
    ENVIRONMENT: 'dev'
};

// Export pour utilisation dans script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
