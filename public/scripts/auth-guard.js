console.log('🛡️ Chargement de auth-guard.js...');

// ✅ Fonction de vérification d'authentification
async function checkAuthentication(requiredForPage = null) {
    console.log('🔍 Vérification de la session pour:', requiredForPage);
    
    return new Promise((resolve) => {
        const currentUser = userPool.getCurrentUser();
        
        if (!currentUser) {
            console.log('⚠️ Aucun utilisateur connecté');
            resolve(false);
            return;
        }
        
        currentUser.getSession((err, session) => {
            if (err || !session.isValid()) {
                console.log('❌ Session invalide ou expirée');
                resolve(false);
                return;
            }
            
            console.log('✅ Session valide');
            resolve(true);
        });
    });
}

// ✅ Déterminer le chemin de login selon la page actuelle
function getLoginPagePath() {
    const currentPath = window.location.pathname;
    console.log('📍 Chemin actuel:', currentPath);
    
    // Si on est déjà sur la page de login, ne pas rediriger
    if (currentPath.includes('login.html')) {
        console.log('✅ Déjà sur la page de login');
        return null;
    }
    
    // Si on est dans /pages/
    if (currentPath.includes('/pages/')) {
        console.log('📁 Dans /pages/, redirection vers: login.html');
        return 'login.html'; // Même dossier
    }
    
    // Si on est à la racine
    console.log('📁 À la racine, redirection vers: pages/login.html');
    return 'pages/login.html';
}

// ✅ Vérification au chargement de la page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔍 Début de la vérification (DOMContentLoaded)...');
    
    const isAuthenticated = await checkAuthentication(window.location.pathname);
    console.log('✅ Authentification vérifiée:', isAuthenticated);
    
    // ⚠️ Ne protéger QUE si on est PAS sur la page de login
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
    
    if (!isLoginPage && !isAuthenticated) {
        console.log('🚫 Redirection vers la page de login...');
        const loginPath = getLoginPagePath();
        
        if (loginPath) {
            window.location.replace(loginPath);
        }
    } else if (isLoginPage && isAuthenticated) {
        // Si authentifié et sur login → rediriger vers home
        console.log('✅ Déjà authentifié, redirection vers home...');
        const homePath = currentPath.includes('/pages/') ? '../index.html' : 'index.html';
        window.location.replace(homePath);
    } else {
        console.log('✅ Accès autorisé');
    }
});

console.log('✅ auth-guard.js chargé complètement');
