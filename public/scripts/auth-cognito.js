// ========================================
// 🔐 AUTH-COGNITO.JS
// Gestion de l'authentification AWS Cognito
// - Connexion
// - Inscription
// - Confirmation de compte
// - Stockage des tokens de session
// ========================================

console.log('🔐 Chargement de auth-cognito.js...');

// ========================================
// CONFIGURATION COGNITO
// ========================================

const poolData = {
    UserPoolId: CONFIG.COGNITO.USER_POOL_ID,
    ClientId: CONFIG.COGNITO.CLIENT_ID
};

// console.log('🔐 Initialisation Cognito UserPool:', poolData);

// Vérifier que le SDK Cognito est chargé
if (typeof AmazonCognitoIdentity === 'undefined') {
    console.error('❌ ERREUR: SDK Amazon Cognito non chargé !');
} else {
    // console.log('✅ SDK Amazon Cognito chargé');
}

// Créer le UserPool
window.userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
const userPool = window.userPool;

if (!userPool) {
    console.error('❌ ERREUR: UserPool est null !');
}

// ========================================
// OBTENIR L'UTILISATEUR ACTUEL
// ========================================

function getCurrentUser() {
    // console.log('🔍 Vérification de session existante...');
    const currentUser = userPool.getCurrentUser();
    // console.log('🔍 getCurrentUser() résultat:', currentUser ? currentUser.getUsername() : 'null');
    return currentUser;
}

// ========================================
// VÉRIFICATION DE SESSION EXISTANTE
// ========================================

function checkExistingSession() {
    // Vérifier si on vient de se déconnecter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
        // console.log('🚪 Déconnexion détectée - pas de vérification de session');
        showLoginForm();
        return;
    }

    const cognitoUser = getCurrentUser();

    if (cognitoUser != null) {
        // console.log('👤 Utilisateur trouvé:', cognitoUser.getUsername());

        cognitoUser.getSession((err, session) => {
            if (err) {
                console.error('❌ Erreur de session:', err);
                showLoginForm();
                return;
            }

            if (session.isValid()) {
                // console.log('✅ Session valide détectée');
                const idToken = session.getIdToken().getJwtToken();
                const accessToken = session.getAccessToken().getJwtToken();

                // Sauvegarder les tokens
                localStorage.setItem('idToken', idToken);
                localStorage.setItem('accessToken', accessToken);

                // console.log('🎫 Tokens sauvegardés');

                // Si on est sur la page de login, rediriger vers home
                if (window.location.pathname.includes('login.html')) {
                    // console.log('↪️ Redirection vers home...');
                    let homePageConfig = CONFIG.AUTH.HOME_PAGE || 'index.html';

                    if (homePageConfig === 'null' || homePageConfig === 'undefined') {
                        homePageConfig = 'index.html';
                    }

                    window.location.replace(homePageConfig);
                }
            } else {
                // console.log('⚠️ Session expirée');
                showLoginForm();
            }
        });
    } else {
        // console.log('✅ Pas de session, affichage du formulaire de login');
        showLoginForm();
    }
}

// ========================================
// HELPER POUR AFFICHER LE FORMULAIRE
// ========================================

function showLoginForm() {
    const loginSection = document.getElementById('login-section');
    if (loginSection) {
        loginSection.style.display = 'block';
    }
}

// ========================================
// INSCRIPTION
// ========================================

async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;

    // console.log('📝 Tentative d\'inscription pour:', email);

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

        // console.log('✅ Inscription réussie:', result.user.getUsername());
        showMessage('register', 'Inscription réussie ! Vérifiez votre email pour le code de confirmation.', 'success');

        // Passer à l'écran de confirmation
        setTimeout(() => {
            document.getElementById('register-section').style.display = 'none';
            document.getElementById('confirm-section').style.display = 'block';
            document.getElementById('confirm-email').value = email;
        }, 2000);
    });
}

// ========================================
// CONFIRMATION DE COMPTE
// ========================================

async function handleConfirmation(event) {
    event.preventDefault();

    const email = document.getElementById('confirm-email')?.value.trim();
    const code = document.getElementById('confirm-code')?.value.trim();

    // console.log('✅ Tentative de confirmation pour:', email);

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

        // console.log('✅ Confirmation réussie:', result);
        showMessage('confirm', 'Compte confirmé ! Vous pouvez maintenant vous connecter.', 'success');

        setTimeout(() => {
            document.getElementById('confirm-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('login-email').value = email;
        }, 2000);
    });
}

// ========================================
// CONNEXION
// ========================================

async function handleLogin(event) {
    // console.log('🔵 handleLogin appelé');

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

    // console.log('🔵 Tentative de connexion pour:', email);

    if (!email || !password) {
        showMessage('login', 'Veuillez remplir tous les champs', 'error');
        return false;
    }

    // Vérifier que le SDK et userPool sont disponibles
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

    // Création des données d'authentification
    const authenticationData = {
        Username: email,
        Password: password,
    };

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    // Création de l'utilisateur Cognito
    const userData = {
        Username: email,
        Pool: userPool
    };

    let cognitoUser;
    try {
        cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        // console.log('✅ CognitoUser créé:', cognitoUser);
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

    // console.log('🔄 Envoi de la requête d\'authentification...');

    return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                console.log('✅ Connexion réussie');

                try {
                    const accessToken = result.getAccessToken().getJwtToken();
                    const idToken = result.getIdToken().getJwtToken();
                    const refreshToken = result.getRefreshToken().getToken();

                    // Sauvegarder les tokens
                    localStorage.setItem('idToken', idToken);
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    // Forcer la sauvegarde de la session Cognito
                    const username = cognitoUser.getUsername();
                    const clientId = CONFIG.COGNITO.CLIENT_ID;
                    const keyPrefix = `CognitoIdentityServiceProvider.${clientId}`;

                    // Sauvegarder LastAuthUser (clé critique pour getCurrentUser())
                    localStorage.setItem(`${keyPrefix}.LastAuthUser`, username);

                    // Sauvegarder les tokens Cognito (format attendu par le SDK)
                    localStorage.setItem(`${keyPrefix}.${username}.idToken`, idToken);
                    localStorage.setItem(`${keyPrefix}.${username}.accessToken`, accessToken);
                    localStorage.setItem(`${keyPrefix}.${username}.refreshToken`, refreshToken);
                    localStorage.setItem(`${keyPrefix}.${username}.clockDrift`, '0');

                    console.log('🎫 Tokens sauvegardés');
                    console.log('🎫 Session Cognito persistée');
                    console.log('📦 Vérification localStorage AVANT redirection:');
                    console.log('   - Clés Cognito:', Object.keys(localStorage).filter(k => k.includes('Cognito')).length);
                    console.log('   - LastAuthUser:', localStorage.getItem(`${keyPrefix}.LastAuthUser`));

                    showMessage('login', 'Connexion réussie ! Redirection...', 'success');

                    setTimeout(() => {
                        let homePageConfig = CONFIG.AUTH.HOME_PAGE || 'index.html';

                        if (homePageConfig === 'null' || homePageConfig === 'undefined') {
                            homePageConfig = 'index.html';
                        }

                        console.log('🔗 Redirection vers:', homePageConfig);
                        window.location.replace(homePageConfig);
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
                // console.log('🔄 Nouveau mot de passe requis');
                showMessage('login', 'Nouveau mot de passe requis', 'info');
            }
        });
    });
}

// ========================================
// AFFICHAGE DES MESSAGES
// ========================================

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

// ========================================
// GESTION DES ONGLETS
// ========================================

function switchTab(tabName) {
    // console.log('🔄 Changement d\'onglet vers:', tabName);

    // Gérer les onglets
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Activer l'onglet cliqué
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Gérer les formulaires
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const confirmForm = document.getElementById('confirm-form');

    if (tabName === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (confirmForm) confirmForm.classList.add('hidden');
    } else if (tabName === 'register') {
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (confirmForm) confirmForm.classList.add('hidden');
    }
}

// ========================================
// MOT DE PASSE OUBLIÉ
// ========================================

function showForgotPassword() {
    // console.log('🔑 Affichage du formulaire de récupération de mot de passe');
    alert('Fonctionnalité de récupération de mot de passe à venir...');
    // TODO: Implémenter la récupération de mot de passe avec Cognito
}

// Exposer les fonctions globalement
window.switchTab = switchTab;
window.showForgotPassword = showForgotPassword;
window.getCurrentUser = getCurrentUser;

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // console.log('✅ === DOM READY ===');

    // Attacher les listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const confirmForm = document.getElementById('confirm-form');

    if (loginForm) {
        // Supprimer les anciens listeners
        const newLoginForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLoginForm, loginForm);

        // Attacher le nouveau listener
        newLoginForm.addEventListener('submit', (e) => {
            // console.log('🎯 Formulaire LOGIN soumis');
            handleLogin(e);
        });
        // console.log('🔗 Listener LOGIN attaché');
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            // console.log('🎯 Formulaire REGISTER soumis');
            handleRegister(e);
        });
        // console.log('🔗 Listener REGISTER attaché');
    }

    if (confirmForm) {
        confirmForm.addEventListener('submit', (e) => {
            // console.log('🎯 Formulaire CONFIRM soumis');
            handleConfirmation(e);
        });
        // console.log('🔗 Listener CONFIRM attaché');
    }

    // Vérifier la session existante SEULEMENT sur la page de login
    if (window.location.pathname.includes('login.html')) {
        // console.log('🔍 Page de login détectée - vérification de session');
        checkExistingSession();
    }

    // console.log('✅ === Initialisation terminée ===');
});

console.log('✅ auth-cognito.js chargé complètement');
