// Configuration de l'application
// Ce fichier sera modifié après le déploiement de l'API

const CONFIG = {
    // URL de l'API Gateway (à modifier après déploiement Lambda)
    API_URL: 'https://VOTRE_API_ID.execute-api.eu-west-3.amazonaws.com/prod',
    
    // Nom du bucket S3
    BUCKET_NAME: 'bucket-test-new-app',
    
    // Région AWS
    AWS_REGION: 'eu-west-3',
    
    // Environnement
    ENVIRONMENT: 'production'
};

// Export pour utilisation dans script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
