/* ==========================================
   SYSTÈME DE FILTRAGE DES ANNONCES
   ========================================== */

// Variables globales pour les filtres
let filteredAnnonces = [];
let activeFilters = {
    prixMin: null,
    prixMax: null,
    pieces: null,
    surfaceMin: null,
    surfaceMax: null,
    localisation: null
};

/* ==========================================
   INITIALISATION DES FILTRES
   ========================================== */

// Fonction d'initialisation exposée globalement
window.initializeFilters = function() {
    console.log('🔍 Initialisation des filtres...');

    const filtersWrapper = document.getElementById('filters-wrapper');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    const filtersContainer = document.getElementById('filters-container');

    console.log('🔍 DEBUG: filtersWrapper trouvé?', !!filtersWrapper);
    console.log('🔍 DEBUG: filtersContainer trouvé?', !!filtersContainer);
    console.log('🔍 DEBUG: filtersWrapper a des enfants?', filtersWrapper?.hasChildNodes());

    // Si le wrapper existe et qu'on n'a pas encore déplacé les filtres
    if (filtersWrapper && !filtersWrapper.hasChildNodes()) {
        if (filtersContainer) {
            // Déplacer les filtres dans le wrapper
            filtersWrapper.appendChild(filtersContainer);
            console.log('✅ Filtres déplacés dans le wrapper');
            console.log('🔍 DEBUG: Display du container après déplacement:', filtersContainer.style.display);
        } else {
            console.error('❌ filtersContainer non trouvé!');
        }
    } else {
        console.log('⚠️ Filtres déjà déplacés ou wrapper introuvable');
    }

    // Attacher les événements si le bouton toggle existe et n'a pas encore d'événement
    if (toggleBtn && !toggleBtn.dataset.initialized) {
        toggleBtn.addEventListener('click', toggleFilters);
        toggleBtn.dataset.initialized = 'true';
        console.log('✅ Événement toggle attaché');
    }

    // Attacher les autres événements aux boutons
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');

    if (applyBtn && !applyBtn.dataset.initialized) {
        applyBtn.addEventListener('click', applyFilters);
        applyBtn.dataset.initialized = 'true';
        console.log('✅ Bouton "Appliquer" attaché');
    }

    if (resetBtn && !resetBtn.dataset.initialized) {
        resetBtn.addEventListener('click', resetFilters);
        resetBtn.dataset.initialized = 'true';
        console.log('✅ Bouton "Réinitialiser" attaché');
    }
};

/* ==========================================
   FONCTION D'APPLICATION DES FILTRES
   ========================================== */

function applyFilters() {
    console.log('🔍 === APPLICATION DES FILTRES ===');

    // Récupérer les valeurs des filtres
    const prixMin = parseFloat(document.getElementById('filterPrixMin')?.value) || null;
    const prixMax = parseFloat(document.getElementById('filterPrixMax')?.value) || null;
    const pieces = document.getElementById('filterPieces')?.value || null;
    const surfaceMin = parseFloat(document.getElementById('filterSurfaceMin')?.value) || null;
    const surfaceMax = parseFloat(document.getElementById('filterSurfaceMax')?.value) || null;
    const localisation = document.getElementById('filterLocalisation')?.value?.toLowerCase().trim() || null;

    // Stocker les filtres actifs
    activeFilters = {
        prixMin,
        prixMax,
        pieces,
        surfaceMin,
        surfaceMax,
        localisation
    };

    console.log('📋 Filtres appliqués:', activeFilters);

    // Si aucun filtre n'est actif, afficher toutes les annonces
    const hasActiveFilters = Object.values(activeFilters).some(val => val !== null && val !== '');

    if (!hasActiveFilters) {
        console.log('⚠️ Aucun filtre actif - affichage de toutes les annonces');
        filteredAnnonces = [...currentAnnonces];
        renderAnnoncesTable(filteredAnnonces);
        updateFilterCount(filteredAnnonces.length);
        return;
    }

    // Filtrer les annonces
    filteredAnnonces = currentAnnonces.filter(annonce => {
        // Récupérer les valeurs de l'annonce
        const annoncePrix = parseFloat(annonce.prix || annonce.price) || 0;
        const annoncePieces = parseInt(annonce.pieces || annonce.rooms || annonce.nb_pieces) || 0;
        const annonceSurface = parseFloat(annonce.surface_m2 || annonce.surface) || 0;
        const annonceLocalisation = (annonce.localisation || annonce.location || '').toLowerCase();

        // Appliquer les filtres
        let match = true;

        // Filtre Prix minimum
        if (prixMin !== null && annoncePrix < prixMin) {
            match = false;
        }

        // Filtre Prix maximum
        if (prixMax !== null && annoncePrix > prixMax) {
            match = false;
        }

        // Filtre Pièces
        if (pieces !== null && pieces !== '') {
            const piecesNum = parseInt(pieces);
            if (piecesNum === 5) {
                // 5+ pièces
                if (annoncePieces < 5) {
                    match = false;
                }
            } else {
                if (annoncePieces !== piecesNum) {
                    match = false;
                }
            }
        }

        // Filtre Surface minimum
        if (surfaceMin !== null && annonceSurface < surfaceMin) {
            match = false;
        }

        // Filtre Surface maximum
        if (surfaceMax !== null && annonceSurface > surfaceMax) {
            match = false;
        }


        // Filtre Localisation (recherche partielle)
        if (localisation !== null && localisation !== '') {
            if (!annonceLocalisation.includes(localisation)) {
                match = false;
            }
        }

        return match;
    });

    console.log(`✅ Filtrage terminé: ${filteredAnnonces.length}/${currentAnnonces.length} annonces`);

    // Afficher les annonces filtrées
    if (filteredAnnonces.length === 0) {
        showNoResultsMessage();
    } else {
        renderAnnoncesTable(filteredAnnonces);
    }

    updateFilterCount(filteredAnnonces.length);
}

/* ==========================================
   FONCTION DE RÉINITIALISATION DES FILTRES
   ========================================== */

function resetFilters() {
    console.log('🔄 Réinitialisation des filtres...');

    // Réinitialiser les valeurs des inputs
    const prixMinInput = document.getElementById('filterPrixMin');
    const prixMaxInput = document.getElementById('filterPrixMax');
    const piecesSelect = document.getElementById('filterPieces');
    const surfaceMinInput = document.getElementById('filterSurfaceMin');
    const localisationInput = document.getElementById('filterLocalisation');
    const surfaceMaxInput = document.getElementById('filterSurfaceMax');

    if (prixMinInput) prixMinInput.value = '';
    if (prixMaxInput) prixMaxInput.value = '';
    if (piecesSelect) piecesSelect.value = '';
    if (surfaceMinInput) surfaceMinInput.value = '';
    if (localisationInput) localisationInput.value = '';
    if (surfaceMaxInput) surfaceMaxInput.value = '';

    // Réinitialiser les filtres actifs
    activeFilters = {
        prixMin: null,
        prixMax: null,
        pieces: null,
        surfaceMin: null,
        surfaceMax: null,
        localisation: null
    };

    // Afficher toutes les annonces
    filteredAnnonces = [...currentAnnonces];
    renderAnnoncesTable(filteredAnnonces);
    updateFilterCount(filteredAnnonces.length);

    // Masquer le compteur de résultats
    const filterResults = document.getElementById('filterResults');
    if (filterResults) {
        filterResults.style.display = 'none';
    }

    console.log('✅ Filtres réinitialisés');
}

/* ==========================================
   FONCTIONS UTILITAIRES
   ========================================== */

function updateFilterCount(count) {
    const filterCount = document.getElementById('filterCount');
    const filterResults = document.getElementById('filterResults');

    if (filterCount) {
        filterCount.textContent = count;
    }

    if (filterResults) {
        filterResults.style.display = 'block';
    }

    // Mettre à jour le header du tableau
    const resultsHeader = document.querySelector('.results-header h3');
    if (resultsHeader) {
        resultsHeader.textContent = `📊 ${count} annonce(s) affichée(s)`;
    }
}

function showNoResultsMessage() {
    const tbody = document.getElementById('annoncesTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3 style="color: #718096; margin-bottom: 0.5rem;">Aucune annonce trouvée</h3>
                    <p style="color: #a0aec0;">Essayez de modifier vos critères de recherche</p>
                    <button onclick="resetFilters()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        🔄 Réinitialiser les filtres
                    </button>
                </td>
            </tr>
        `;
    }
}

console.log('✅ Module de filtrage chargé');

/* ==========================================
   FONCTIONS TOGGLE FILTRES
   ========================================== */

function toggleFilters() {
    console.log('🔍 DEBUG: toggleFilters appelé');
    const filtersContainer = document.getElementById('filters-container');
    const toggleBtn = document.getElementById('toggleFiltersBtn');

    console.log('🔍 DEBUG: filtersContainer trouvé?', !!filtersContainer);
    if (filtersContainer) {
        console.log('🔍 DEBUG: display actuel:', filtersContainer.style.display);
    }

    if (filtersContainer.style.display === 'none' || filtersContainer.style.display === '') {
        showFilters();
    } else {
        hideFilters();
    }
}

function showFilters() {
    const filtersContainer = document.getElementById('filters-container');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    
    if (filtersContainer) {
        filtersContainer.style.display = 'block';
        console.log('✅ Filtres affichés');
    }
    
    if (toggleBtn) {
        toggleBtn.querySelector('.btn-text').textContent = 'Masquer';
        toggleBtn.querySelector('.btn-icon').textContent = '▲';
    }
    
    // Scroll vers les filtres
    filtersContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideFilters() {
    const filtersContainer = document.getElementById('filters-container');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    
    if (filtersContainer) {
        filtersContainer.style.display = 'none';
        console.log('✅ Filtres masqués');
    }
    
    if (toggleBtn) {
        toggleBtn.querySelector('.btn-text').textContent = 'Filtrer';
        toggleBtn.querySelector('.btn-icon').textContent = '🔍';
    }
}
