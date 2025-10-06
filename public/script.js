// ============================================
// CONFIGURATION
// ============================================

let API_URL = CONFIG?.API_URL;

console.log('📡 API configurée:', API_URL);
console.log('🌍 Environnement:', CONFIG?.ENVIRONMENT || 'dev');

// ============================================
// STATE
// ============================================
let allAnnonces = [];
let availableFiles = []; // Cache de la liste des fichiers

// ============================================
// ELEMENTS DOM
// ============================================
const testBtn = document.getElementById('testBtn');
const loadFilesBtn = document.getElementById('loadFilesBtn');
const displayFileBtn = document.getElementById('displayFileBtn');
const fileSelect = document.getElementById('fileSelect');
const fileSelectGroup = document.getElementById('fileSelectGroup');
const fileInfo = document.getElementById('fileInfo');
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
    
    // Event listeners principaux
    if (testBtn) testBtn.addEventListener('click', testConnection);
    if (loadFilesBtn) loadFilesBtn.addEventListener('click', loadFilesList);
    if (displayFileBtn) displayFileBtn.addEventListener('click', displaySelectedFile);
    if (fileSelect) fileSelect.addEventListener('change', onFileSelected);
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
// GESTION DES FICHIERS
// ============================================

// Charger la liste des fichiers disponibles
async function loadFilesList() {
    console.log('📂 Chargement de la liste des fichiers...');
    
    showLoader(true);
    hideError();
    loadFilesBtn.disabled = true;
    loadFilesBtn.textContent = '⏳ Chargement...';
    
    try {
        const response = await fetch(`${API_URL}/files`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Réponse API /files:', data);
        
        // Adapter selon le format de votre API
        availableFiles = data.files || data.annonces || data;
        
        if (!Array.isArray(availableFiles) || availableFiles.length === 0) {
            throw new Error('Aucun fichier trouvé');
        }
        
        // Remplir le select
        fileSelect.innerHTML = '<option value="">-- Sélectionnez un fichier --</option>';
        availableFiles.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            
            // Adapter selon la structure de vos fichiers
            const fileName = file.Key || file.name || file.filename || `Fichier ${index + 1}`;
            option.textContent = fileName;
            
            fileSelect.appendChild(option);
        });
        
        // Afficher le groupe de sélection
        fileSelectGroup.style.display = 'flex';
        
        console.log(`✅ ${availableFiles.length} fichier(s) chargé(s)`);
        
    } catch (error) {
        console.error('❌ Erreur de chargement des fichiers:', error);
        showError(`Erreur: ${error.message}`);
    } finally {
        showLoader(false);
        loadFilesBtn.disabled = false;
        loadFilesBtn.textContent = '🔄 Recharger la liste';
    }
}

// Quand un fichier est sélectionné dans le dropdown
function onFileSelected() {
    const selectedIndex = fileSelect.value;
    
    if (selectedIndex === '') {
        displayFileBtn.disabled = true;
        fileInfo.style.display = 'none';
        return;
    }
    
    const file = availableFiles[selectedIndex];
    
    // Afficher les infos du fichier
    const fileName = file.Key || file.name || file.filename || 'Nom inconnu';
    const fileSize = formatFileSize(file.Size || file.size || 0);
    const lastModified = formatDate(file.LastModified || file.lastModified || file.date);
    
    fileInfo.innerHTML = `
        <h4>📄 Informations du fichier</h4>
        <p><strong>📝 Nom :</strong> ${escapeHtml(fileName)}</p>
        <p><strong>📦 Taille :</strong> ${fileSize}</p>
        <p><strong>🕒 Dernière modification :</strong> ${lastModified}</p>
    `;
    fileInfo.style.display = 'block';
    displayFileBtn.disabled = false;
    
    console.log('📄 Fichier sélectionné:', file);
}

// Charger et afficher le contenu du fichier sélectionné
async function displaySelectedFile() {
    const selectedIndex = fileSelect.value;
    
    if (selectedIndex === '') {
        alert('⚠️ Veuillez sélectionner un fichier');
        return;
    }
    
    const file = availableFiles[selectedIndex];
    const fileName = file.Key || file.name || file.filename;
    
    console.log('📥 Chargement du fichier:', fileName);
    
    showLoader(true);
    hideError();
    displayFileBtn.disabled = true;
    displayFileBtn.textContent = '⏳ Chargement...';
    
    try {
        // Appeler l'API pour récupérer le contenu du fichier
        // ⚠️ Adapter l'URL selon votre API
        const response = await fetch(`${API_URL}/file/${encodeURIComponent(fileName)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📦 Contenu du fichier:', data);
        
        // Extraire les annonces selon le format
        allAnnonces = data.annonces || data.body || data;
        
        if (!Array.isArray(allAnnonces)) {
            throw new Error('Format de données invalide');
        }
        
        console.log(`✅ ${allAnnonces.length} annonces chargées`);
        
        // Afficher le conteneur et les annonces
        annoncesContainer.style.display = 'block';
        displayAnnonces(allAnnonces);
        
        // Mettre à jour le compteur
        const countSpan = document.getElementById('annoncesCount');
        if (countSpan) countSpan.textContent = allAnnonces.length;
        
        // Scroll vers les annonces
        annoncesContainer.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Erreur de chargement du fichier:', error);
        showError(`Erreur: ${error.message}`);
    } finally {
        showLoader(false);
        displayFileBtn.disabled = false;
        displayFileBtn.textContent = '👁️ Afficher les annonces';
    }
}

// ============================================
// TEST DE CONNEXION API
// ============================================
async function testConnection() {
    console.log('🔍 Test de connexion...');
    
    testResult.textContent = '⏳ Test en cours...';
    testResult.className = 'result';
    
    try {
        const response = await fetch(`${API_URL}/health`);
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
// AFFICHAGE DES ANNONCES
// ============================================
function displayAnnonces(annonces) {
    console.log(`📊 Affichage de ${annonces.length} annonces`);
    
    if (!annoncesTableBody) {
        console.error('❌ Element annoncesTableBody introuvable');
        return;
    }
    
    annoncesTableBody.innerHTML = '';
    
    if (annonces.length === 0) {
        annoncesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #a0aec0;">
                    🔍 Aucune annonce trouvée
                </td>
            </tr>
        `;
        return;
    }
    
    annonces.forEach(annonce => {
        const row = document.createElement('tr');
        
        const id = annonce.id || annonce.ID || 'N/A';
        const localisation = annonce.localisation || annonce.ville || annonce.adresse || 'N/A';
        const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 'N/A';
        const surface = annonce.surface || annonce.superficie || 'N/A';
        const prix = annonce.prix || annonce.price || 0;
        const url = annonce.url || annonce.link || annonce.lien || '#';
        
        const prixFormate = prix ? new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: 'EUR',
            minimumFractionDigits: 0
        }).format(prix) : 'N/A';
        
        const prixM2 = (prix && surface && surface !== 'N/A') ? 
            Math.round(prix / parseFloat(surface)) : null;
        
        const prixM2Display = prixM2 ? 
            new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                minimumFractionDigits: 0
            }).format(prixM2) + '/m²' : 'N/A';
        
        row.innerHTML = `
            <td>${escapeHtml(id)}</td>
            <td>${escapeHtml(localisation)}</td>
            <td>${escapeHtml(pieces)}</td>
            <td>${surface !== 'N/A' ? surface + ' m²' : 'N/A'}</td>
            <td style="font-weight: 600; color: #667eea;">${prixFormate}</td>
            <td style="color: #48bb78;">${prixM2Display}</td>
            <td>
                <a href="${escapeHtml(url)}" target="_blank" class="btn-url">🔗 Voir</a>
            </td>
        `;
        
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => showAnnonceDetails(annonce));
        
        annoncesTableBody.appendChild(row);
    });
    
    console.log(`✅ ${annonces.length} lignes ajoutées`);
}

// ============================================
// MODAL DE DÉTAILS
// ============================================
function showAnnonceDetails(annonce) {
    console.log('👁️ Affichage détails:', annonce);
    
    const id = annonce.id || annonce.ID || 'N/A';
    const type = annonce.type || annonce.transaction || 'Vente';
    const localisation = annonce.localisation || annonce.ville || annonce.adresse || 'N/A';
    const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 'N/A';
    const surface = annonce.surface || annonce.superficie || 'N/A';
    const prix = annonce.prix || annonce.price || 0;
    const url = annonce.url || annonce.link || annonce.lien || null;
    
    const prixFormate = prix ? new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR'
    }).format(prix) : 'N/A';
    
    const surfaceFormatee = surface !== 'N/A' ? surface + ' m²' : 'N/A';
    
    const prixM2 = (prix && surface && surface !== 'N/A') ? 
        Math.round(prix / parseFloat(surface)) : null;
    
    const prixM2Display = prixM2 ? 
        new Intl.NumberFormat('fr-FR', { 
            style: 'currency', 
            currency: 'EUR'
        }).format(prixM2) + '/m²' : 'N/A';
    
    let urlSection = '';
    if (url && url !== '#') {
        urlSection = `
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="${escapeHtml(url)}" target="_blank" class="btn-url-modal">
                    🔗 Voir l'annonce complète
                </a>
            </div>
        `;
    }
    
    modalDetails.innerHTML = `
        <div class="detail-header">
            <span class="badge ${type.toLowerCase() === 'vente' ? 'badge-vente' : 'badge-location'}">
                ${escapeHtml(type)}
            </span>
            <h2 style="margin: 10px 0; color: #2d3748;">Annonce #${escapeHtml(id)}</h2>
        </div>
        
        ${urlSection}
        
        <div class="detail-grid">
            <div class="detail-item">
                <span class="detail-label">📍 Localisation</span>
                <span class="detail-value">${escapeHtml(localisation)}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">🏠 Nombre de pièces</span>
                <span class="detail-value">${escapeHtml(pieces)}</span>
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
    `;
    
    modal.style.display = 'flex';
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
            const surface = parseFloat(annonce.surface || annonce.superficie || 0);
            matchSurfaceMin = surface >= surfaceMin;
        }
        
        // Filtre surface max
        let matchSurfaceMax = true;
        if (surfaceMax !== null) {
            const surface = parseFloat(annonce.surface || annonce.superficie || 0);
            matchSurfaceMax = surface <= surfaceMax;
        }
        
        return matchSearch && matchPieces && matchSurfaceMin && matchSurfaceMax;
    });
    
    console.log(`🔍 ${filtered.length} annonces après filtrage`);
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
// CUSTOM DROPDOWN (Pièces)
// ============================================
function setupCustomDropdown() {
    if (!piecesDropdownToggle || !piecesDropdownMenu) return;
    
    piecesDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        piecesDropdownMenu.classList.toggle('show');
        piecesDropdownToggle.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            piecesDropdownMenu.classList.remove('show');
            piecesDropdownToggle.classList.remove('active');
        }
    });
}

function updatePiecesDropdownText() {
    const selected = Array.from(piecesCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    if (selected.length === 0) {
        piecesSelectedText.textContent = '🏠 Nombre de pièces';
    } else if (selected.length === 1) {
        piecesSelectedText.innerHTML = `🏠 Nombre de pièces <span class="selection-badge">${selected.length}</span>`;
    } else {
        piecesSelectedText.innerHTML = `🏠 Nombre de pièces <span class="selection-badge">${selected.length}</span>`;
    }
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

function escapeHtml(text) {
    if (!text) return 'N/A';
    const div = document.createElement('div');
    div.textContent = text.toString();
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/A';
    }
}
