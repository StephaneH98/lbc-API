// ============================================
// CONFIGURATION
// ============================================

let API_URL = CONFIG?.API_URL;

console.log('📡 API configurée:', API_URL);
console.log(CONFIG);
console.log('🌍 Environnement:', CONFIG?.ENVIRONMENT || 'dev');

// ============================================
// STATE
// ============================================
let allAnnonces = [];

// ============================================
// ELEMENTS DOM
// ============================================
const testBtn = document.getElementById('testBtn');
const loadBtn = document.getElementById('loadBtn');
const testResult = document.getElementById('testResult');
const errorMessage = document.getElementById('errorMessage');
const loader = document.getElementById('loader');
const annoncesContainer = document.getElementById('annoncesContainer');
const annoncesTableBody = document.getElementById('annoncesTableBody');
const searchInput = document.getElementById('search');
const surfaceMinInput = document.getElementById('surface-min');
const surfaceMaxInput = document.getElementById('surface-max');
const resetFiltersBtn = document.getElementById('reset-filters');

// Custom dropdown
const piecesDropdownToggle = document.getElementById('pieces-dropdown-toggle');
const piecesDropdownMenu = document.getElementById('pieces-dropdown-menu');
const piecesSelectedText = document.getElementById('pieces-selected-text');
const piecesCheckboxes = document.querySelectorAll('input[name="pieces"]');

// Modal
const modal = document.getElementById('annonceModal');
const modalDetails = document.getElementById('modalDetails');
const closeModalBtn = document.querySelector('.close-modal');

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application démarrée');
    console.log('📡 API URL:', API_URL);
    
    // Event listeners
    if (testBtn) testBtn.addEventListener('click', testConnection);
    if (loadBtn) loadBtn.addEventListener('click', loadAnnonces);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    
    // Fermer la modal en cliquant en dehors
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    // Setup custom dropdown
    setupCustomDropdown();
    
    // Filtrage en temps réel
    if (searchInput) searchInput.addEventListener('input', filterAnnonces);
    if (surfaceMinInput) surfaceMinInput.addEventListener('input', filterAnnonces);
    if (surfaceMaxInput) surfaceMaxInput.addEventListener('input', filterAnnonces);
    piecesCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updatePiecesDropdownText();
            filterAnnonces();
        });
    });
});

// ============================================
// TEST DE CONNEXION API
// ============================================
async function testConnection() {
    console.log('🔍 Test de connexion...');
    
    testResult.textContent = '⏳ Test en cours...';
    testResult.className = 'result';
    
    try {
        const response = await fetch(`${API_URL}/test`);
        const data = await response.json();
        
        if (response.ok) {
            testResult.textContent = `✅ ${data.message || 'Connexion réussie'}`;
            testResult.className = 'result success';
            console.log('✅ Connexion OK:', data);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
        testResult.textContent = `❌ Erreur: ${error.message}`;
        testResult.className = 'result error';
    }
}

// ============================================
// CHARGER LES ANNONCES
// ============================================
async function loadAnnonces() {
    console.log('📥 Chargement des annonces...');
    
    showLoader(true);
    hideError();
    
    try {
        const response = await fetch(`${API_URL}/annonces`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Données reçues:', data);
        
        if (!data.annonces || !Array.isArray(data.annonces)) {
            throw new Error('Format de données invalide');
        }
        
        allAnnonces = data.annonces;
        console.log(`✅ ${allAnnonces.length} annonces chargées`);
        
        // Afficher le conteneur et les annonces
        if (annoncesContainer) annoncesContainer.style.display = 'block';
        displayAnnonces(allAnnonces);
        
        // Mettre à jour le compteur
        const countSpan = document.getElementById('annoncesCount');
        if (countSpan) countSpan.textContent = allAnnonces.length;
        
    } catch (error) {
        console.error('❌ Erreur de chargement:', error);
        showError(`Erreur: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

// ============================================
// AFFICHER LES ANNONCES
// ============================================
function displayAnnonces(annonces) {
    console.log(`📊 Affichage de ${annonces.length} annonces`);
    
    if (!annoncesTableBody) {
        console.error('❌ Element annoncesTableBody non trouvé');
        return;
    }
    
    annoncesTableBody.innerHTML = '';
    
    if (annonces.length === 0) {
        annoncesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #718096;">
                    📭 Aucune annonce à afficher
                </td>
            </tr>
        `;
        return;
    }
    
    annonces.forEach(annonce => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.style.transition = 'background-color 0.2s';
        
        const id = annonce.id || 'N/A';
        const localisation = annonce.localisation || annonce.ville || annonce.adresse || 'Non spécifiée';
        const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 'N/A';
        const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
        const prix = annonce.prix || annonce.loyer || 0;
        const url = annonce.url || annonce.lien || annonce.link || null;
        
        // Calcul prix/m²
        let prixM2Display = 'N/A';
        if (prix > 0 && surface > 0) {
            const prixM2 = prix / surface;
            prixM2Display = `${prixM2.toFixed(2)} €`;
        }
        
        const prixFormate = prix > 0 ? `${prix.toLocaleString('fr-FR')} €` : 'N/A';
        const surfaceFormatee = surface > 0 ? `${surface} m²` : 'N/A';
        
        // Bouton URL
        let urlButton = '';
        if (url) {
            urlButton = `<button class="btn-url" onclick="window.open('${url}', '_blank'); event.stopPropagation();">🔗 Voir l'annonce</button>`;
        } else {
            urlButton = `<span style="color: #a0aec0; font-size: 12px;">Pas de lien</span>`;
        }
        
        row.innerHTML = `
            <td style="font-weight: 600; color: #667eea;">${id}</td>
            <td>${localisation}</td>
            <td style="text-align: center;">${pieces}</td>
            <td style="text-align: right;">${surfaceFormatee}</td>
            <td style="text-align: right; font-weight: 600;">${prixFormate}</td>
            <td style="text-align: right; color: #48bb78; font-weight: 600;">${prixM2Display}</td>
            <td style="text-align: center;">${urlButton}</td>
        `;
        
        row.addEventListener('mouseenter', () => row.style.backgroundColor = '#f7fafc');
        row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
        row.addEventListener('click', () => showAnnonceDetails(annonce));
        
        annoncesTableBody.appendChild(row);
    });
    
    console.log(`✅ ${annonces.length} lignes ajoutées`);
}

// ============================================
// AFFICHER DÉTAILS ANNONCE
// ============================================
function showAnnonceDetails(annonce) {
    console.log('👁️ Affichage des détails:', annonce.id);
    
    if (!modal || !modalDetails) return;
    
    const id = annonce.id || 'N/A';
    const localisation = annonce.localisation || annonce.ville || annonce.adresse || 'Non spécifiée';
    const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 'N/A';
    const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
    const prix = annonce.prix || annonce.loyer || 0;
    const type = annonce.type || 'Non spécifié';
    const description = annonce.description || 'Aucune description disponible';
    const url = annonce.url || annonce.lien || annonce.link || null;
    
    let prixM2Display = 'N/A';
    if (prix > 0 && surface > 0) {
        const prixM2 = prix / surface;
        prixM2Display = `${prixM2.toFixed(2)} €/m²`;
    }
    
    const prixFormate = prix > 0 ? `${prix.toLocaleString('fr-FR')} €` : 'N/A';
    const surfaceFormatee = surface > 0 ? `${surface} m²` : 'N/A';
    
    let urlSection = '';
    if (url) {
        urlSection = `
            <div style="margin: 20px 0; text-align: center;">
                <a href="${url}" target="_blank" class="btn-url-modal">
                    🔗 Voir l'annonce complète
                </a>
            </div>
        `;
    }
    
    modalDetails.innerHTML = `
        <div class="detail-header">
            <span class="badge ${type.toLowerCase() === 'vente' ? 'badge-vente' : 'badge-location'}">
                ${type}
            </span>
            <h2 style="margin: 10px 0; color: #2d3748;">Annonce #${id}</h2>
        </div>
        
        ${urlSection}
        
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">📍 Localisation</span>
                <span class="detail-value">${localisation}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">🏠 Nombre de pièces</span>
                <span class="detail-value">${pieces}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">📏 Surface</span>
                <span class="detail-value">${surfaceFormatee}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">💰 Prix</span>
                <span class="detail-value" style="color: #667eea; font-weight: 700;">${prixFormate}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">📊 Prix au m²</span>
                <span class="detail-value" style="color: #48bb78; font-weight: 700;">${prixM2Display}</span>
            </div>
        </div>
        
        <div class="detail-description">
            <h3 style="margin-bottom: 10px; color: #4a5568;">📝 Description</h3>
            <p style="color: #718096; line-height: 1.6;">${description}</p>
        </div>
        
        <div class="detail-raw">
            <details>
                <summary style="cursor: pointer; color: #667eea; font-weight: 600;">
                    🔧 Données brutes (JSON)
                </summary>
                <pre style="background: #f7fafc; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">${JSON.stringify(annonce, null, 2)}</pre>
            </details>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// ============================================
// CUSTOM DROPDOWN
// ============================================
function setupCustomDropdown() {
    if (!piecesDropdownToggle || !piecesDropdownMenu) return;
    
    piecesDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        piecesDropdownMenu.classList.toggle('show');
        piecesDropdownToggle.classList.toggle('active');
    });
    
    piecesDropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.addEventListener('click', () => {
        piecesDropdownMenu.classList.remove('show');
        piecesDropdownToggle.classList.remove('active');
    });
}

function updatePiecesDropdownText() {
    const checkedBoxes = Array.from(piecesCheckboxes).filter(cb => cb.checked);
    const count = checkedBoxes.length;
    
    if (count === 0) {
        piecesSelectedText.innerHTML = '🏠 Nombre de pièces';
    } else if (count === 1) {
        const value = checkedBoxes[0].value;
        piecesSelectedText.innerHTML = `🏠 ${value === '5+' ? '5+ pièces' : value + ' pièce' + (value > 1 ? 's' : '')}`;
    } else {
        piecesSelectedText.innerHTML = `🏠 ${count} sélections <span class="selection-badge">${count}</span>`;
    }
}

// ============================================
// FILTRER LES ANNONCES
// ============================================
function filterAnnonces() {
    console.log('🔍 Application des filtres...');
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const surfaceMin = surfaceMinInput?.value ? parseFloat(surfaceMinInput.value) : null;
    const surfaceMax = surfaceMaxInput?.value ? parseFloat(surfaceMaxInput.value) : null;
    const selectedPieces = Array.from(piecesCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    const filtered = allAnnonces.filter(annonce => {
        // Filtre recherche
        const matchSearch = searchTerm === '' || 
            (annonce.id || '').toString().toLowerCase().includes(searchTerm) ||
            (annonce.localisation || '').toLowerCase().includes(searchTerm) ||
            (annonce.ville || '').toLowerCase().includes(searchTerm) ||
            (annonce.adresse || '').toLowerCase().includes(searchTerm);
        
        // Filtre pièces
        let matchPieces = true;
        if (selectedPieces.length > 0) {
            const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 0;
            matchPieces = selectedPieces.some(value => {
                if (value === '5+') return pieces >= 5;
                return pieces == parseInt(value);
            });
        }
        
        // Filtre surface min
        let matchSurfaceMin = true;
        if (surfaceMin !== null) {
            const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
            matchSurfaceMin = surface >= surfaceMin;
        }
        
        // Filtre surface max
        let matchSurfaceMax = true;
        if (surfaceMax !== null) {
            const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
            matchSurfaceMax = surface <= surfaceMax;
        }
        
        return matchSearch && matchPieces && matchSurfaceMin && matchSurfaceMax;
    });
    
    console.log(`✅ ${filtered.length} annonces correspondent aux critères`);
    
    displayAnnonces(filtered);
    
    const countSpan = document.getElementById('annoncesCount');
    if (countSpan) countSpan.textContent = filtered.length;
}

// ============================================
// RÉINITIALISER LES FILTRES
// ============================================
function resetFilters() {
    console.log('🔄 Réinitialisation des filtres');
    
    if (searchInput) searchInput.value = '';
    if (surfaceMinInput) surfaceMinInput.value = '';
    if (surfaceMaxInput) surfaceMaxInput.value = '';
    piecesCheckboxes.forEach(cb => cb.checked = false);
    updatePiecesDropdownText();
    
    displayAnnonces(allAnnonces);
    
    const countSpan = document.getElementById('annoncesCount');
    if (countSpan) countSpan.textContent = allAnnonces.length;
}

// ============================================
// HELPERS
// ============================================
function showLoader(show) {
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function hideError() {
    if (errorMessage) errorMessage.style.display = 'none';
}
