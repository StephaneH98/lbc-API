// scripts/auth-guard.js
console.log('🛡️ Chargement de auth-guard.js...');

// Initialisation Cognito
const userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: CONFIG.COGNITO.USER_POOL_ID,
    ClientId: CONFIG.COGNITO.CLIENT_ID,
    Storage: window.localStorage
});

// Vérification complète de l'authentification
async function checkAuthentication() {
    try {
        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) {
            console.warn('⚠️ Aucun utilisateur connecté');
            return false;
        }

        console.log('🔍 Vérification de la session pour:', cognitoUser.getUsername());

        const session = await new Promise((resolve, reject) => {
            cognitoUser.getSession((err, session) => {
                if (err) {
                    console.error('❌ Erreur de session:', err);
                    reject(err);
                    return;
                }
                resolve(session);
            });
        });

        if (!session || !session.isValid()) {
            console.error('❌ Session invalide');
            cognitoUser.signOut();
            return false;
        }

        console.log('✅ Session valide jusqu\'à:', new Date(session.getIdToken().payload.exp * 1000));
        return true;

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        return false;
    }
}

// Exécution après chargement complet de la page
window.addEventListener('load', async () => {
    console.log('🔍 Début de la vérification (après chargement complet)...');

    // Attendre 1 seconde pour laisser Cognito s'initialiser
    await new Promise(resolve => setTimeout(resolve, 10000));

    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
        console.log('🔀 Redirection vers le login...');
        window.location.href = 'pages/login.html'; // Ajustez le chemin
    } else {
        console.log('✅ Accès autorisé');
    }
});
