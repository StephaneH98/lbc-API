// auth-guard.js
console.log('🛡️ Chargement de auth-guard.js...');

// ========================
// 🔐 AUTH GUARD - Protection des pages
// ========================

function checkAuthentication() {
    return new Promise((resolve) => {
        console.log('🔍 Vérification de la session pour:', userPool?.getCurrentUser()?.getUsername());
        
        const cognitoUser = userPool?.getCurrentUser();
        
        if (!cognitoUser) {
            console.log('⚠️ Aucun utilisateur connecté');
            resolve(false);
            return;
        }
        
        cognitoUser.getSession((err, session) => {
            if (err) {
                console.error('❌ Erreur de session:', err);
                resolve(false);
                return;
            }
            
            if (session && session.isValid()) {
                console.log('✅ Session valide');
                
                // Sauvegarder les tokens
                localStorage.setItem('idToken', session.getIdToken().getJwtToken());
                localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
                
                resolve(true);
            } else {
                console.log('❌ Session invalide ou expirée');
                resolve(false);
            }
        });
    });
}

// Vérification au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🔍 Début de la vérification (DOMContentLoaded)...');
        const isAuthenticated = await checkAuthentication();
        console.log('✅ Authentification vérifiée:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('🚫 Redirection vers la page de login...');
            window.location.href = CONFIG.AUTH.LOGIN_PAGE;
        }
    });
} else {
    // DOM déjà chargé
    (async () => {
        console.log('🔍 Début de la vérification (après chargement complet)...');
        const isAuthenticated = await checkAuthentication();
        console.log('✅ Authentification vérifiée:', isAuthenticated);
        
        if (!isAuthenticated) {
            console.log('🚫 Redirection vers la page de login...');
            window.location.href = CONFIG.AUTH.LOGIN_PAGE;
        }
    })();
}

console.log('✅ auth-guard.js chargé complètement');
