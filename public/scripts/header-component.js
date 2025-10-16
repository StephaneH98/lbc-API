console.log('📋 Chargement de header-component.js...');

// ========================================
// 🎨 CRÉATION DU HEADER AVEC DÉCONNEXION
// ========================================

function createLogoutButton() {
    console.log('🔘 Création du bouton de déconnexion...');

    // Vérifier si le bouton existe déjà
    if (document.getElementById('logoutButton')) {
        console.log('✅ Bouton de déconnexion déjà présent');
        return;
    }

    // Créer le conteneur du header
    const headerContainer = document.createElement('div');
    headerContainer.className = 'auth-header';
    headerContainer.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        padding: 15px 25px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 15px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom-left-radius: 16px;
        border: 2px solid #F59E0B;
        border-top: none;
        border-right: none;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
    `;

    // Créer le texte de bienvenue (optionnel)
    const userInfo = document.createElement('span');
    userInfo.className = 'user-info';
    userInfo.style.cssText = `
        color: #F59E0B;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    `;
    userInfo.textContent = '✓ Connecté';

    // Créer le bouton de déconnexion
    const logoutButton = document.createElement('button');
    logoutButton.id = 'logoutButton';
    logoutButton.className = 'logout-button';
    logoutButton.innerHTML = `
        <span class="button-icon">⚡</span>
        <span class="button-text">Déconnexion</span>
    `;

    // Styles du bouton
    logoutButton.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #FFFFFF 0%, #FCD34D 100%);
        color: #1F2937;
        border: 2px solid #F59E0B;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    `;

    // Effet hover
    logoutButton.addEventListener('mouseenter', () => {
        logoutButton.style.transform = 'translateY(-3px)';
        logoutButton.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.5)';
        logoutButton.style.background = 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)';
        logoutButton.style.borderColor = '#EAB308';
    });

    logoutButton.addEventListener('mouseleave', () => {
        logoutButton.style.transform = 'translateY(0)';
        logoutButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
        logoutButton.style.background = 'linear-gradient(135deg, #FFFFFF 0%, #FCD34D 100%)';
        logoutButton.style.borderColor = '#F59E0B';
    });

    // Gestionnaire de clic
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🚪 Clic sur le bouton de déconnexion');

        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            if (typeof logout === 'function') {
                logout();
            } else {
                console.error('❌ Fonction logout non disponible');
                alert('Erreur: fonction de déconnexion non disponible');
            }
        }
    });

    // Assembler le header
    headerContainer.appendChild(userInfo);
    headerContainer.appendChild(logoutButton);

    // Ajouter au body
    document.body.insertBefore(headerContainer, document.body.firstChild);

    console.log('✅ Bouton de déconnexion créé et ajouté');
}

// ========================================
// 🚀 INITIALISATION AUTO
// ========================================

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLogoutButton);
} else {
    // DOM déjà chargé
    createLogoutButton();
}

console.log('✅ header-component.js chargé complètement');
