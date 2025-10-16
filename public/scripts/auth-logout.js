// ========================================
// 🚪 AUTH-LOGOUT.JS
// Gestion de la déconnexion
// - Invalide la session côté serveur
// - Supprime les clés de session du navigateur
// - Redirige vers login.html
// ========================================

console.log('🚪 Chargement de auth-logout.js...');

// ========================================
// FONCTION DE DÉCONNEXION
// ========================================

async function logout() {
    console.log('🚪 Déconnexion en cours...');

    try {
        // Vérifier que userPool existe
        if (typeof userPool === 'undefined') {
            console.warn('⚠️ userPool non défini - nettoyage direct');
            clearAllStorage();
            redirectToLogin();
            return;
        }

        const cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            // console.log('👤 Utilisateur trouvé:', cognitoUser.getUsername());

            // ÉTAPE 1 : Invalider la session côté serveur (GlobalSignOut)
            // console.log('🔥 Invalidation de la session côté serveur...');

            await new Promise((resolve) => {
                cognitoUser.globalSignOut({
                    onSuccess: (result) => {
                        // console.log('✅ GlobalSignOut réussi:', result);
                        resolve();
                    },
                    onFailure: (err) => {
                        console.warn('⚠️ GlobalSignOut échoué:', err.message);
                        // Continuer quand même
                        resolve();
                    }
                });
            });

            // ÉTAPE 2 : Déconnexion locale
            // console.log('🔥 Déconnexion locale...');
            cognitoUser.signOut();
            // console.log('✅ SignOut local effectué');
        }

        // ÉTAPE 3 : Nettoyage complet du localStorage et sessionStorage
        clearAllStorage();

        console.log('✅ Déconnexion terminée');

        // ÉTAPE 4 : Redirection vers la page de login
        redirectToLogin();

    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);

        // En cas d'erreur, nettoyage brutal
        console.log('🔥 Nettoyage d\'urgence...');
        clearAllStorage();
        redirectToLogin();
    }
}

// ========================================
// NETTOYAGE DU STORAGE
// ========================================

function clearAllStorage() {
    // console.log('🔥 Nettoyage du localStorage et sessionStorage...');

    // Compter les clés Cognito
    const cognitoKeys = Object.keys(localStorage).filter(key =>
        key.includes('CognitoIdentityServiceProvider') ||
        key.includes('amplify') ||
        key.includes('aws.cognito') ||
        key === 'LastAuthUser'
    );

    // console.log(`🗑️ ${cognitoKeys.length} clé(s) Cognito à supprimer`);

    // Supprimer toutes les clés
    localStorage.clear();
    sessionStorage.clear();

    // console.log('✅ Storage complètement vidé');
}

// ========================================
// REDIRECTION VERS LOGIN
// ========================================

function redirectToLogin() {
    // console.log('🔗 Redirection vers login...');

    // Marquer qu'on vient de se déconnecter
    sessionStorage.setItem('justLoggedOut', 'true');

    // Déterminer le chemin de la page de login
    const currentPath = window.location.pathname;
    let loginPath = 'login.html';

    if (currentPath.includes('/pages/')) {
        loginPath = 'login.html';
    } else {
        loginPath = 'pages/login.html';
    }

    // Forcer le rechargement complet (sans cache)
    window.location.replace(loginPath + '?logout=' + Date.now());
}

// ========================================
// GESTION DU BOUTON DE DÉCONNEXION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {
        // console.log('🔘 Bouton de déconnexion trouvé');

        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();

            // Confirmation optionnelle
            if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                logout();
            }
        });
    }
});

// ========================================
// RACCOURCIS CLAVIER (optionnel)
// ========================================

// Ctrl+Alt+L = Déconnexion
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key === 'l') {
        e.preventDefault();
        // console.log('⌨️ Raccourci détecté : Déconnexion');
        if (confirm('Déconnexion via raccourci clavier ?')) {
            logout();
        }
    }
});

// Exposer la fonction globalement
window.logout = logout;

console.log('✅ auth-logout.js chargé complètement');
