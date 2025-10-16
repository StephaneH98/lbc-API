// ========================================
// 🛡️ AUTH-GUARD.JS
// Vérification et protection des pages
// - Vérifie si l'utilisateur a des clés de session
// - Valide la session Cognito
// - Redirige vers login.html si invalide
// - Protège les pages nécessitant une authentification
// ========================================

console.log('🛡️ Chargement de auth-guard.js...');

// ========================================
// CONFIGURATION DES PAGES
// ========================================

// Pages qui NE nécessitent PAS d'authentification
const PUBLIC_PAGES = [
    'login.html',
    'register.html',
    'forgot-password.html'
];

// Pages qui nécessitent une authentification
const PROTECTED_PAGES = [
    'index.html',
    'file_selection.html',
    'recherche.html',
    'annonces.html',
    'dashboard.html'
];

// ========================================
// VÉRIFICATION D'AUTHENTIFICATION
// ========================================

async function checkAuthentication(currentPath = null) {
    console.log('🔍 Vérification de la session pour:', currentPath);

    return new Promise((resolve) => {
        // Vérifier que userPool existe
        if (typeof userPool === 'undefined') {
            console.warn('⚠️ userPool non défini - auth-cognito.js non chargé');
            resolve(false);
            return;
        }

        const currentUser = userPool.getCurrentUser();

        if (!currentUser) {
            console.log('⚠️ Aucun utilisateur connecté (getCurrentUser = null)');
            console.log('📦 Clés localStorage:', Object.keys(localStorage).filter(k => k.includes('Cognito')));
            resolve(false);
            return;
        }

        console.log('👤 getCurrentUser() a retourné un utilisateur:', currentUser.getUsername());

        // Vérification de la session
        currentUser.getSession((err, session) => {
            if (err) {
                console.error('❌ Erreur lors de la récupération de la session:', err);

                // Forcer la déconnexion en cas d'erreur
                currentUser.signOut();

                // Nettoyer localStorage
                Object.keys(localStorage).forEach(key => {
                    if (key.includes('CognitoIdentityServiceProvider')) {
                        localStorage.removeItem(key);
                    }
                });

                resolve(false);
                return;
            }

            if (!session || !session.isValid()) {
                console.log('❌ Session invalide ou expirée');

                // Forcer la déconnexion
                currentUser.signOut();

                // Nettoyer localStorage
                Object.keys(localStorage).forEach(key => {
                    if (key.includes('CognitoIdentityServiceProvider')) {
                        localStorage.removeItem(key);
                    }
                });

                resolve(false);
                return;
            }

            console.log('✅ Session valide pour:', currentUser.getUsername());
            const expiresInMinutes = Math.round((session.getIdToken().getExpiration() * 1000 - Date.now()) / 1000 / 60);
            console.log('📅 Token expire dans:', expiresInMinutes, 'minutes');
            resolve(true);
        });
    });
}

// ========================================
// GESTION DES REDIRECTIONS
// ========================================

function isPublicPage(path) {
    return PUBLIC_PAGES.some(page => path.includes(page));
}

function isProtectedPage(path) {
    return PROTECTED_PAGES.some(page => path.includes(page));
}

function getLoginPagePath() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
        return 'login.html';
    }
    return 'pages/login.html';
}

// ========================================
// LOGIQUE PRINCIPALE
// ========================================

// ========================================
// ATTENDRE QUE USERPOOL SOIT DISPONIBLE
// ========================================

function waitForUserPool(maxWait = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkInterval = setInterval(() => {
            if (typeof userPool !== 'undefined' && userPool !== null) {
                clearInterval(checkInterval);
                console.log('✅ userPool disponible');
                resolve(true);
            } else if (Date.now() - startTime > maxWait) {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout: userPool non disponible après', maxWait, 'ms');
                reject(false);
            }
        }, 50); // Vérifier toutes les 50ms
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 Début de la vérification (DOMContentLoaded)...');

    const currentPath = window.location.pathname;
    console.log('📍 Page actuelle:', currentPath);

    // Pages login.html - Vérifier si on vient de se déconnecter
    if (currentPath.includes('login.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('logout')) {
            console.log('🚪 Page de login après déconnexion - pas de vérification nécessaire');
            return;
        }

        console.log('🔍 Page login - Accès autorisé');
        return;
    }

    // Pages publiques (autres que login)
    if (isPublicPage(currentPath)) {
        console.log('✅ Page publique - Accès autorisé sans authentification');
        return;
    }

    // Toutes les autres pages sont protégées par défaut
    console.log('🔒 Page protégée - Vérification de l\'authentification...');

    // ⚠️ ATTENDRE QUE USERPOOL SOIT DISPONIBLE
    try {
        await waitForUserPool();
    } catch (err) {
        console.error('❌ userPool non disponible - Redirection vers login');
        window.location.replace(getLoginPagePath());
        return;
    }

    const isAuthenticated = await checkAuthentication(currentPath);
    console.log('✅ Authentification vérifiée:', isAuthenticated);

    if (!isAuthenticated) {
        console.log('🚫 Non authentifié - Redirection vers login...');
        window.location.replace(getLoginPagePath());
    } else {
        console.log('✅ Authentifié - Accès autorisé');
    }
});

console.log('✅ auth-guard.js chargé complètement');
