console.log('🔐 Chargement de auth.js...');

// ===== CONFIGURATION COGNITO =====
const poolData = {
    UserPoolId: CONFIG.COGNITO.USER_POOL_ID,
    ClientId: CONFIG.COGNITO.CLIENT_ID
};
console.log('🔐 Initialisation Cognito UserPool:', poolData);

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

console.log('✅ UserPool créé avec succès');

// ============================================
// VÉRIFICATION SESSION AU CHARGEMENT
// ============================================

console.log('🔍 Vérification de session existante...');
const cognitoUser = userPool.getCurrentUser();
const user = userPool.getCurrentUser();
if (user) {
  user.getSession((err, session) => {
    if (err) {
      console.error("Erreur de session :", err);
      return; // Pas de redirection
    }
    if (session.isValid()) {
      console.log("✅ Session valide, redirection vers index.html");
      window.location.href = "../index.html"; // Redirige seulement si la session est valide
    } else {
      console.log("⚠️ Session expirée ou invalide");
      // Optionnel : déconnecter l'utilisateur
      user.signOut();
    }
  });
}



// ===== VÉRIFICATION : Si déjà connecté, rediriger =====
window.addEventListener('load', () => {
    console.log('🔍 Vérification de session existante...');
    
    const idToken = localStorage.getItem('idToken');
    
    if (idToken) {
        try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            const exp = payload.exp * 1000;
            
            if (Date.now() < exp) {
                console.log('✅ Session valide détectée, redirection vers index.html');
                window.location.href = '../index.html';
                return;
            } else {
                console.log('⚠️ Token expiré, nettoyage');
                localStorage.clear();
            }
        } catch (error) {
            console.error('❌ Erreur décodage token:', error);
            localStorage.clear();
        }
    }
    
    console.log('✅ Pas de session, affichage du formulaire de login');
});

// ===== VARIABLES GLOBALES =====
let pendingVerificationEmail = null;

// ===== FONCTIONS UTILITAIRES =====
function showError(message) {
    console.log('❌ Erreur:', message);
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

function showSuccess(message) {
    console.log('✅ Succès:', message);
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.innerHTML = message;
        successDiv.classList.remove('hidden');
    }
}

function hideSuccess() {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.classList.add('hidden');
    }
}

function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Chargement...' : button.dataset.originalText || button.textContent;
        if (!button.dataset.originalText && !isLoading) {
            button.dataset.originalText = button.textContent;
        }
    }
}

// ===== FONCTION DE NAVIGATION ENTRE ONGLETS =====
window.switchTab = function(tab) {
    console.log('🔵 Changement d\'onglet:', tab);
    
    // Gérer les onglets (boutons)
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    // Masquer tous les formulaires
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const confirmForm = document.getElementById('confirmForm');
    
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (confirmForm) confirmForm.classList.add('hidden');
    
    // Effacer les messages
    hideError();
    hideSuccess();
    
    // Afficher le bon formulaire et activer le bon onglet
    if (tab === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (tabs[0]) tabs[0].classList.add('active');
        console.log('✅ Onglet Connexion activé');
    } else if (tab === 'register') {
        if (registerForm) registerForm.classList.remove('hidden');
        if (tabs[1]) tabs[1].classList.add('active');
        console.log('✅ Onglet Inscription activé');
    }
};

// ===== FONCTION D'INSCRIPTION =====
window.handleRegister = async function(e) {
    e.preventDefault();
    console.log('🔵 === DÉBUT handleRegister ===');
    hideError();
    hideSuccess();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    console.log('📝 Données:', { name, email, passwordLength: password.length });
    
    // Validation
    if (!name || !email || !password || !passwordConfirm) {
        showError('Tous les champs sont requis');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }
    
    if (password.length < 8) {
        showError('Le mot de passe doit contenir au moins 8 caractères');
        return;
    }
    
    setButtonLoading('registerButton', true);
    
    try {
        const userPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: window.ENV.COGNITO.USER_POOL_ID,
            ClientId: window.ENV.COGNITO.CLIENT_ID
        });
        
        const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'email',
                Value: email
            }),
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'name',
                Value: name
            })
        ];
        
        const result = await new Promise((resolve, reject) => {
            userPool.signUp(email, password, attributeList, null, (err, result) => {
                if (err) {
                    console.error('❌ Erreur signUp:', err);
                    reject(err);
                } else {
                    console.log('✅ Inscription réussie!', result);
                    resolve(result);
                }
            });
        });
        
        // Stocker l'email pour la vérification
        pendingVerificationEmail = email;
        console.log('📧 Email stocké:', email);
        
        showSuccess(`
            ✅ Compte créé avec succès !<br>
            Un code de confirmation a été envoyé à <strong>${email}</strong>
        `);
        
        // Masquer le formulaire d'inscription
        document.getElementById('registerForm').classList.add('hidden');
        
        // Afficher le formulaire de confirmation
        setTimeout(() => {
            const confirmForm = document.getElementById('confirmForm');
            if (confirmForm) {
                confirmForm.classList.remove('hidden');
                console.log('✅ Formulaire de confirmation affiché');
                
                const codeInput = document.getElementById('confirmCode');
                if (codeInput) {
                    codeInput.focus();
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        
        let errorMessage = 'Erreur lors de l\'inscription';
        
        if (error.code === 'UsernameExistsException') {
            errorMessage = 'Cet email est déjà utilisé';
        } else if (error.code === 'InvalidPasswordException') {
            errorMessage = 'Mot de passe invalide. Il doit contenir au moins 8 caractères avec majuscules, minuscules, chiffres et caractères spéciaux.';
        } else if (error.code === 'InvalidParameterException') {
            errorMessage = 'Paramètres invalides. Vérifiez votre email et mot de passe.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
    } finally {
        setButtonLoading('registerButton', false);
        console.log('🔵 === FIN handleRegister ===');
    }
};

// ===== FONCTION DE CONFIRMATION =====
window.handleConfirmation = async function(e) {
    e.preventDefault();
    console.log('🔵 === DÉBUT handleConfirmation ===');
    hideError();
    hideSuccess();
    
    const code = document.getElementById('confirmCode').value.trim();
    
    console.log('📝 Email:', pendingVerificationEmail);
    console.log('📝 Code:', code);
    
    if (!pendingVerificationEmail) {
        showError('Email manquant. Veuillez vous réinscrire.');
        return;
    }
    
    if (!code) {
        showError('Veuillez entrer le code de vérification');
        return;
    }
    
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        showError('Le code doit contenir 6 chiffres');
        return;
    }
    
    setButtonLoading('confirmButton', true);
    
    try {
        const userPool = new AmazonCognitoIdentity.CognitoUserPool({
            UserPoolId: window.ENV.COGNITO.USER_POOL_ID,
            ClientId: window.ENV.COGNITO.CLIENT_ID
        });
        
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: pendingVerificationEmail,
            Pool: userPool
        });
        
        await new Promise((resolve, reject) => {
            cognitoUser.confirmRegistration(code, true, (err, result) => {
                if (err) {
                    console.error('❌ Erreur confirmation:', err);
                    reject(err);
                } else {
                    console.log('✅ Confirmation réussie:', result);
                    resolve(result);
                }
            });
        });
        
        showSuccess('✅ Compte confirmé avec succès ! Vous pouvez maintenant vous connecter.');
        
        // Masquer le formulaire de confirmation
        document.getElementById('confirmForm').classList.add('hidden');
        
        // Afficher le formulaire de connexion
        setTimeout(() => {
            switchTab('login');
            
            // Pré-remplir l'email
            const loginEmail = document.getElementById('loginEmail');
            if (loginEmail) {
                loginEmail.value = pendingVerificationEmail;
            }
            
            // Focus sur le mot de passe
            const loginPassword = document.getElementById('loginPassword');
            if (loginPassword) {
                loginPassword.focus();
            }
            
            pendingVerificationEmail = null;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erreur confirmation:', error);
        
        let errorMessage = 'Erreur lors de la confirmation';
        
        if (error.code === 'CodeMismatchException') {
            errorMessage = 'Code incorrect. Veuillez réessayer.';
        } else if (error.code === 'ExpiredCodeException') {
            errorMessage = 'Code expiré. Demandez un nouveau code.';
        } else if (error.code === 'NotAuthorizedException') {
            errorMessage = 'Utilisateur déjà confirmé ou code invalide';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
    } finally {
        setButtonLoading('confirmButton', false);
        console.log('🔵 === FIN handleConfirmation ===');
    }
};

// ===== FONCTION DE CONNEXION =====

function handleLogin(event) {
    event.preventDefault();
    hideError();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔵 Tentative de connexion pour:', email);
    
    if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }
    
    const authenticationData = {
        Username: email,
        Password: password
    };
    
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    const userData = {
        Username: email,
        Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    console.log('🔄 Envoi de la requête d\'authentification...');
    
    user.authenticateUser(authenticationDetails, {
        onSuccess: function(session) {
            console.log('✅ Connexion réussie !');
        
            // 1. Vérifier que l'utilisateur est bien récupérable
            const cognitoUser = userPool.getCurrentUser();
            if (!cognitoUser) {
                showError('Erreur interne: utilisateur non trouvé après connexion');
                return;
            }
        
            // 2. Forcer la persistance de la session
            cognitoUser.getSession((err, persistedSession) => {
                if (err || !persistedSession || !persistedSession.isValid()) {
                    console.error('❌ Échec de la persistance de session:', err);
                    showError('Erreur de session. Veuillez réessayer.');
                    return;
                }
        
                console.log('✅ Session persistée avec succès:', {
                    token: persistedSession.getIdToken().getJwtToken().substring(0, 10) + '...',
                    expires: new Date(persistedSession.getIdToken().payload.exp * 1000).toLocaleString()
                });
        
                // 3. Rediriger après un délai pour laisser le temps à localStorage de se mettre à jour
                setTimeout(() => {
                    window.location.href = CONFIG.AUTH.HOME_PAGE;
                }, 1500); // 1.5 secondes de délai
            });
        },
        
        
        
        onFailure: (err) => {
            console.error('❌ Erreur de connexion:', err);
            
            let errorMessage = 'Erreur de connexion';
            
            if (err.code === 'UserNotFoundException') {
                errorMessage = 'Utilisateur non trouvé';
            } else if (err.code === 'NotAuthorizedException') {
                errorMessage = 'Email ou mot de passe incorrect';
            } else if (err.code === 'UserNotConfirmedException') {
                errorMessage = 'Compte non confirmé. Vérifiez vos emails.';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            showError(errorMessage);
        }
    });
}



// ===== FONCTION DE DÉCONNEXION =====
window.handleLogout = function() {
    console.log('🔵 Déconnexion...');
    
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    window.location.href = 'index.html';
};

// ===== FONCTION DE VÉRIFICATION DE SESSION =====
window.checkAuth = function() {
    console.log('🔵 Vérification de l\'authentification...');
    
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) {
        console.log('❌ Pas de token, redirection vers login');
        window.location.href = 'index.html';
        return null;
    }
    
    try {
        // Décoder le JWT (simple vérification, pas de validation de signature)
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const exp = payload.exp * 1000; // Convertir en millisecondes
        
        if (Date.now() >= exp) {
            console.log('❌ Token expiré');
            handleLogout();
            return null;
        }
        
        console.log('✅ Token valide:', payload);
        return payload;
    } catch (error) {
        console.error('❌ Erreur décodage token:', error);
        handleLogout();
        return null;
    }
};

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ === DOM READY ===');
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const confirmForm = document.getElementById('confirmForm');
    const logoutButton = document.getElementById('logoutButton');
    
    console.log('📋 Formulaires:', {
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        confirmForm: !!confirmForm,
        logoutButton: !!logoutButton
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('🔗 Listener LOGIN attaché');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('🔗 Listener REGISTER attaché');
    }
    
    if (confirmForm) {
        confirmForm.addEventListener('submit', handleConfirmation);
        console.log('🔗 Listener CONFIRM attaché');
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
        console.log('🔗 Listener LOGOUT attaché');
    }
    
    console.log('✅ === Initialisation terminée ===');
});

console.log('✅ auth.js chargé complètement');
