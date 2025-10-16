console.log('🔐 Chargement de auth.js...');

// Configuration Cognito
const poolData = {
    UserPoolId: CONFIG.COGNITO.USER_POOL_ID,
    ClientId: CONFIG.COGNITO.CLIENT_ID
};

console.log('🔐 Initialisation Cognito UserPool:', poolData);

if (typeof AmazonCognitoIdentity === 'undefined') {
    console.error('❌ ERREUR CRITIQUE: SDK Amazon Cognito non chargé !');
    console.error('❌ Vérifiez que le script CDN est bien présent dans le HTML');
} else {
    console.log('✅ SDK Amazon Cognito chargé');
}
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
// Test de validation
if (!userPool) {
    console.error('❌ ERREUR: UserPool est null !');
} else {
    console.log('✅ UserPool valide');
}

console.log('✅ UserPool créé avec succès');

// ✅ Fonction pour obtenir l'utilisateur actuellement connecté
function getCurrentUser() {
    console.log('🔍 Vérification de session existante...');
    return userPool.getCurrentUser();
}

// ✅ Vérification de la session au chargement
function checkExistingSession() {
    const cognitoUser = getCurrentUser();
    
    if (cognitoUser != null) {
        console.log('👤 Utilisateur trouvé:', cognitoUser.getUsername());
        
        cognitoUser.getSession((err, session) => {
            if (err) {
                console.error('❌ Erreur de session:', err);
                showLoginForm();
                return;
            }
            
            if (session.isValid()) {
                console.log('✅ Session valide détectée');
                const idToken = session.getIdToken().getJwtToken();
                const accessToken = session.getAccessToken().getJwtToken();
                
                // Sauvegarder les tokens
                localStorage.setItem('idToken', idToken);
                localStorage.setItem('accessToken', accessToken);
                
                console.log('🎫 Tokens sauvegardés');
                
                // Si on est sur la page de login, rediriger vers home
                if (window.location.pathname.includes('login.html')) {
                    console.log('↪️ Redirection vers home...');
                    window.location.href = CONFIG.AUTH.HOME_PAGE;
                }
            } else {
                console.log('⚠️ Session expirée');
                showLoginForm();
            }
        });
    } else {
        console.log('✅ Pas de session, affichage du formulaire de login');
        showLoginForm();
    }
}

function showLoginForm() {
    const loginSection = document.getElementById('login-section');
    if (loginSection) {
        loginSection.style.display = 'block';
    }
}

// ========================
// 🔐 GESTION DE L'INSCRIPTION
// ========================

async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;
    
    console.log('📝 Tentative d\'inscription pour:', email);
    
    if (!email || !password || !confirmPassword) {
        showMessage('register', 'Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('register', 'Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessage('register', 'Le mot de passe doit contenir au moins 8 caractères', 'error');
        return;
    }

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: email
        })
    ];

    userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
            console.error('❌ Erreur d\'inscription:', err);
            let errorMessage = 'Erreur lors de l\'inscription';
            
            if (err.code === 'UsernameExistsException') {
                errorMessage = 'Cet email est déjà utilisé';
            } else if (err.code === 'InvalidPasswordException') {
                errorMessage = 'Le mot de passe ne respecte pas les règles de sécurité';
            } else if (err.code === 'InvalidParameterException') {
                errorMessage = 'Email invalide';
            } else {
                errorMessage = err.message;
            }
            
            showMessage('register', errorMessage, 'error');
            return;
        }
        
        console.log('✅ Inscription réussie:', result.user.getUsername());
        showMessage('register', 'Inscription réussie ! Vérifiez votre email pour le code de confirmation.', 'success');
        
        // Passer à l'écran de confirmation
        setTimeout(() => {
            document.getElementById('register-section').style.display = 'none';
            document.getElementById('confirm-section').style.display = 'block';
            document.getElementById('confirm-email').value = email;
        }, 2000);
    });
}

// ========================
// 🔐 CONFIRMATION DE COMPTE
// ========================

async function handleConfirmation(event) {
    event.preventDefault();
    
    const email = document.getElementById('confirm-email')?.value.trim();
    const code = document.getElementById('confirm-code')?.value.trim();
    
    console.log('✅ Tentative de confirmation pour:', email);
    
    if (!email || !code) {
        showMessage('confirm', 'Veuillez remplir tous les champs', 'error');
        return;
    }

    const userData = {
        Username: email,
        Pool: userPool
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            console.error('❌ Erreur de confirmation:', err);
            let errorMessage = 'Code de confirmation invalide';
            
            if (err.code === 'CodeMismatchException') {
                errorMessage = 'Code incorrect';
            } else if (err.code === 'ExpiredCodeException') {
                errorMessage = 'Code expiré. Demandez un nouveau code.';
            } else {
                errorMessage = err.message;
            }
            
            showMessage('confirm', errorMessage, 'error');
            return;
        }
        
        console.log('✅ Confirmation réussie:', result);
        showMessage('confirm', 'Compte confirmé ! Vous pouvez maintenant vous connecter.', 'success');
        
        setTimeout(() => {
            document.getElementById('confirm-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('login-email').value = email;
        }, 2000);
    });
}

// ========================
// 🔐 CONNEXION
// ========================

async function handleLogin(event) {
    console.log('🔵 handleLogin appelé');
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const form = event.target;
    
    // Récupération des champs
    let emailInput = document.getElementById('login-email');
    let passwordInput = document.getElementById('login-password');
    
    // Si les IDs ne correspondent pas, chercher par type
    if (!emailInput) {
        emailInput = form.querySelector('input[type="email"]');
    }
    
    if (!passwordInput) {
        passwordInput = form.querySelector('input[type="password"]');
    }
    
    if (!emailInput || !passwordInput) {
        console.error('❌ Champs de formulaire introuvables');
        showMessage('login', 'Erreur: champs de formulaire introuvables', 'error');
        return false;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('🔵 Tentative de connexion pour:', email);
    
    if (!email || !password) {
        showMessage('login', 'Veuillez remplir tous les champs', 'error');
        return false;
    }

    // ✅ VÉRIFICATION CRITIQUE : userPool doit exister
    if (typeof AmazonCognitoIdentity === 'undefined') {
        console.error('❌ SDK Amazon Cognito non chargé');
        showMessage('login', 'Erreur: SDK Cognito non disponible', 'error');
        return false;
    }

    if (!userPool) {
        console.error('❌ UserPool non initialisé');
        showMessage('login', 'Erreur de configuration (UserPool)', 'error');
        return false;
    }

    console.log('✅ UserPool disponible:', userPool);

    // ✅ Création des données d'authentification
    const authenticationData = {
        Username: email,
        Password: password,
    };

    console.log('✅ AuthenticationData créé');

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    console.log('✅ AuthenticationDetails créé:', authenticationDetails);

    // ✅ Création de l'utilisateur Cognito
    const userData = {
        Username: email,
        Pool: userPool
    };

    console.log('✅ UserData préparé:', userData);

    let cognitoUser;
    try {
        cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        console.log('✅ CognitoUser créé:', cognitoUser);
    } catch (error) {
        console.error('❌ Erreur création CognitoUser:', error);
        showMessage('login', 'Erreur lors de la création de l\'utilisateur', 'error');
        return false;
    }
    
    if (!cognitoUser) {
        console.error('❌ CognitoUser est null après création');
        showMessage('login', 'Erreur: impossible de créer l\'utilisateur Cognito', 'error');
        return false;
    }

    console.log('🔄 Envoi de la requête d\'authentification...');

    return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                console.log('✅ Connexion réussie');
                
                try {
                    const accessToken = result.getAccessToken().getJwtToken();
                    const idToken = result.getIdToken().getJwtToken();
                    const refreshToken = result.getRefreshToken().getToken();
                    
                    localStorage.setItem('idToken', idToken);
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
                    
                    console.log('🎫 Tokens sauvegardés');
                    console.log('↪️ Redirection vers:', CONFIG.AUTH.HOME_PAGE);
                    
                    showMessage('login', 'Connexion réussie ! Redirection...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = CONFIG.AUTH.HOME_PAGE;
                    }, 1000);
                    
                    resolve(result);
                } catch (tokenError) {
                    console.error('❌ Erreur traitement tokens:', tokenError);
                    showMessage('login', 'Erreur lors de la sauvegarde des tokens', 'error');
                    reject(tokenError);
                }
            },

            onFailure: (err) => {
                console.error('❌ Erreur de connexion:', err);
                console.error('❌ Code erreur:', err.code);
                console.error('❌ Message erreur:', err.message);
                
                let errorMessage = 'Erreur de connexion';
                
                if (err.code === 'UserNotConfirmedException') {
                    errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
                } else if (err.code === 'NotAuthorizedException') {
                    errorMessage = 'Email ou mot de passe incorrect';
                } else if (err.code === 'UserNotFoundException') {
                    errorMessage = 'Utilisateur non trouvé';
                } else if (err.code === 'TooManyRequestsException') {
                    errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
                } else {
                    errorMessage = err.message || 'Erreur inconnue';
                }
                
                showMessage('login', errorMessage, 'error');
                reject(err);
            },

            newPasswordRequired: (userAttributes, requiredAttributes) => {
                console.log('🔄 Nouveau mot de passe requis');
                showMessage('login', 'Nouveau mot de passe requis', 'info');
                // Gérer le changement de mot de passe si nécessaire
            }
        });
    });
}



// ========================
// 🔐 DÉCONNEXION
// ========================

function logout() {
    console.log('🚪 Déconnexion en cours...');
    
    try {
        // 1. Déconnexion Cognito
        const currentUser = userPool.getCurrentUser();
        if (currentUser) {
            currentUser.signOut();
            console.log('✅ Utilisateur déconnecté de Cognito');
        }
        
        // 2. Supprimer UNIQUEMENT les tokens de CETTE application
        const keysToRemove = [];
        
        Object.keys(localStorage).forEach(key => {
            if (key.includes(CONFIG.COGNITO.USER_POOL_ID) || 
                key.includes(CONFIG.COGNITO.CLIENT_ID) ||
                key === 'idToken' ||
                key === 'accessToken' ||
                key === 'refreshToken' ||
                key.startsWith('CognitoIdentityServiceProvider')) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Token supprimé:', key);
        });
        
        // 3. Nettoyer sessionStorage
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes(CONFIG.COGNITO.USER_POOL_ID) || 
                key.includes(CONFIG.COGNITO.CLIENT_ID)) {
                sessionStorage.removeItem(key);
            }
        });
        
        console.log(`✅ ${keysToRemove.length} éléments supprimés`);
        
        // 4. Rediriger vers login
        const loginPage = CONFIG.AUTH.LOGOUT_REDIRECT || CONFIG.AUTH.LOGIN_PAGE;
        console.log('🔗 Redirection vers:', loginPage);
        
        window.location.href = loginPage;
        
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        // Forcer la redirection même en cas d'erreur
        window.location.href = CONFIG.AUTH.LOGIN_PAGE;
    }
}

// Exposer la fonction globalement
window.logout = logout;

// ========================================
// 📱 GESTION DU BOUTON DE DÉCONNEXION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logoutButton');
    
    if (logoutButton) {
        console.log('🔘 Bouton de déconnexion trouvé');
        
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
// ⌨️ RACCOURCIS CLAVIER (optionnel)
// ========================================

// Ctrl+Alt+L = Déconnexion
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key === 'l') {
        e.preventDefault();
        console.log('⌨️ Raccourci détecté : Déconnexion');
        if (confirm('Déconnexion via raccourci clavier ?')) {
            logout();
        }
    }
});

console.log('✅ Fonction de déconnexion chargée');

// ========================
// 📨 AFFICHAGE DES MESSAGES
// ========================

function showMessage(formType, message, type = 'info') {
    const messageDiv = document.getElementById(`${formType}-message`);
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// ========================
// 🚀 INITIALISATION
// ========================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ === DOM READY ===');
    
    // Attacher les listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const confirmForm = document.getElementById('confirm-form');
    const logoutButton = document.getElementById('logout-button');
    
    console.log('📋 Éléments trouvés:', {
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        confirmForm: !!confirmForm,
        logoutButton: !!logoutButton
    });
    
    if (loginForm) {
        // Supprimer les anciens listeners
        const newLoginForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLoginForm, loginForm);
        
        // Attacher le nouveau listener
        newLoginForm.addEventListener('submit', (e) => {
            console.log('🎯 Formulaire LOGIN soumis');
            handleLogin(e);
        });
        console.log('🔗 Listener LOGIN attaché');
    } else {
        console.warn('⚠️ Formulaire login-form non trouvé');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            console.log('🎯 Formulaire REGISTER soumis');
            handleRegister(e);
        });
        console.log('🔗 Listener REGISTER attaché');
    }
    
    if (confirmForm) {
        confirmForm.addEventListener('submit', (e) => {
            console.log('🎯 Formulaire CONFIRM soumis');
            handleConfirmation(e);
        });
        console.log('🔗 Listener CONFIRM attaché');
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            console.log('🎯 Bouton LOGOUT cliqué');
            handleLogout(e);
        });
        console.log('🔗 Listener LOGOUT attaché');
    }
    
    // Vérifier la session existante
    checkExistingSession();
    
    console.log('✅ === Initialisation terminée ===');
});


console.log('✅ auth.js chargé complètement');
