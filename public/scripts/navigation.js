/**
 * Composant de navigation réutilisable
 * À inclure dans toutes les pages de l'application
 */

(function() {
    'use strict';

    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }

    function initNavigation() {
        console.log('🧭 Initialisation du menu de navigation');

        // Créer le menu
        const nav = createNavigationMenu();

        // Insérer le menu au début du body
        document.body.insertBefore(nav, document.body.firstChild);

        // Attacher les événements
        attachEventListeners();
    }

    function createNavigationMenu() {
        const nav = document.createElement('nav');
        nav.id = 'app-navigation';
        nav.className = 'app-nav';

        nav.innerHTML = `
            <div class="nav-container">
                <div class="nav-header">
                    <h1 class="nav-title">LBC Analyzer</h1>
                    <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
                        <span class="hamburger"></span>
                        <span class="hamburger"></span>
                        <span class="hamburger"></span>
                    </button>
                </div>

                <div class="nav-menu" id="navMenu">
                    <div class="nav-links">
                        <a href="/pages/recherche.html" class="nav-link" data-page="recherche">
                            <span class="nav-icon">🔍</span>
                            <span class="nav-text">Nouvelle recherche</span>
                        </a>
                        <a href="/pages/file_selection.html" class="nav-link" data-page="file_selection">
                            <span class="nav-icon">📁</span>
                            <span class="nav-text">Mes fichiers</span>
                        </a>
                        <a href="/pages/annonces.html" class="nav-link" data-page="annonces">
                            <span class="nav-icon">📊</span>
                            <span class="nav-text">Annonces</span>
                        </a>
                    </div>

                    <div class="nav-footer">
                        <div class="nav-user" id="navUser">
                            <span class="user-icon">👤</span>
                            <span class="user-email" id="userEmail">Chargement...</span>
                        </div>
                        <button class="nav-logout" id="logoutBtn">
                            <span class="logout-icon">🚪</span>
                            <span class="logout-text">Déconnexion</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return nav;
    }

    function attachEventListeners() {
        // Toggle du menu mobile
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                const isOpening = !navMenu.classList.contains('active');

                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');

                // Ajouter/retirer classe au body pour pousser le contenu
                if (isOpening) {
                    document.body.classList.add('nav-menu-open');

                    // Calculer et définir la hauteur du menu pour le CSS
                    setTimeout(() => {
                        const menuHeight = navMenu.offsetHeight;
                        document.documentElement.style.setProperty('--nav-menu-height', `${menuHeight}px`);
                    }, 50);
                } else {
                    document.body.classList.remove('nav-menu-open');
                }
            });
        }

        // Bouton de déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Afficher l'email de l'utilisateur
        displayUserEmail();

        // Marquer la page active
        highlightActivePage();
    }

    function displayUserEmail() {
        const userEmailSpan = document.getElementById('userEmail');
        if (!userEmailSpan) return;

        // Utiliser CONFIG.getCurrentUser() si disponible
        if (typeof CONFIG !== 'undefined' && CONFIG.getCurrentUser) {
            const email = CONFIG.getCurrentUser();
            if (email) {
                userEmailSpan.textContent = email;
            } else {
                userEmailSpan.textContent = 'Non connecté';
            }
        } else {
            // Fallback: lire depuis localStorage
            const email = localStorage.getItem('userEmail');
            userEmailSpan.textContent = email || 'Non connecté';
        }
    }

    function highlightActivePage() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (currentPath.includes(href) || currentPath.endsWith(href.substring(1))) {
                link.classList.add('active');
            }
        });
    }

    function handleLogout() {
        console.log('🚪 Déconnexion...');

        // Confirmer la déconnexion
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
            return;
        }

        // Effacer la session
        if (typeof CONFIG !== 'undefined' && CONFIG.clearSession) {
            CONFIG.clearSession();
        } else {
            // Fallback: nettoyer manuellement
            localStorage.removeItem('idToken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('cognitoSession');
        }

        // Déconnecter de Cognito si disponible
        if (typeof window.userPool !== 'undefined') {
            const currentUser = window.userPool.getCurrentUser();
            if (currentUser) {
                currentUser.signOut();
            }
        }

        // Rediriger vers la page de login
        window.location.href = '/pages/login.html';
    }
})();
