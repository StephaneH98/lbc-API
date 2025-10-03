// ============================================
// CONFIGURATION
// ============================================
let API_URL = CONFIG?.API_URL || 'http://localhost:5000';

// ============================================
// STATE
// ============================================
let selectedFiles = [];
let allAnnonces = [];

// ============================================
// ELEMENTS DOM
// ============================================
// Ancienne interface (fichiers S3)
const apiUrlInput = document.getElementById('api-url');
const testConnectionBtn = document.getElementById('test-connection');
const connectionStatus = document.getElementById('connection-status');
const refreshFilesBtn = document.getElementById('refresh-files');
const fileSelect = document.getElementById('file-select');
const viewFilesBtn = document.getElementById('view-files');
const clearSelectionBtn = document.getElementById('clear-selection');
const selectionInfo = document.getElementById('selection-info');
const contentSection = document.getElementById('content-section');
const contentDisplay = document.getElementById('content-display');
const closeContentBtn = document.getElementById('close-content');

// Nouvelle interface (annonces)
const testBtn = document.getElementById('testBtn');
const loadBtn = document.getElementById('loadBtn');
const testResult = document.getElementById('testResult');
const errorMessage = document.getElementById('errorMessage');
const loader = document.getElementById('loader');

// Filtres
const searchInput = document.getElementById('search');
const piecesDropdownToggle = document.getElementById('pieces-dropdown-toggle');
const piecesDropdownMenu = document.getElementById('pieces-dropdown-menu');
const piecesCheckboxes = document.querySelectorAll('input[name="pieces"]');
const piecesSelectedText = document.getElementById('pieces-selected-text');
const surfaceMinInput = document.getElementById('surface-min');
const surfaceMaxInput = document.getElementById('surface-max');
const applyFiltersBtn = document.getElementById('apply-filters');
const resetFiltersBtn = document.getElementById('reset-filters');

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application démarrée');
    console.log('🔗 API URL:', API_URL);
    
    // Pré-remplir avec l'URL de production
    if (apiUrlInput) {
        apiUrlInput.value = API_URL;
        
        const savedApiUrl = localStorage.getItem('apiUrl');
        if (savedApiUrl) {
            apiUrlInput.value = savedApiUrl;
            API_URL = savedApiUrl;
        }
        
        apiUrlInput.addEventListener('change', () => {
            API_URL = apiUrlInput.value.trim();
            localStorage.setItem('apiUrl', API_URL);
            console.log('🔗 URL API mise à jour:', API_URL);
        });
    }
    
    // Event listeners - Ancienne interface
    testConnectionBtn?.addEventListener('click', testConnection);
    refreshFilesBtn?.addEventListener('click', loadFiles);
    viewFilesBtn?.addEventListener('click', viewSelectedFiles);
    clearSelectionBtn?.addEventListener('click', clearSelection);
    closeContentBtn?.addEventListener('click', closeContent);
    fileSelect?.addEventListener('change', updateSelection);
    
    // Event listeners - Nouvelle interface annonces
    testBtn?.addEventListener('click', testConnection);
    loadBtn?.addEventListener('click', loadAnnonces);
    
    // NOUVEAUX Event listeners pour les filtres
    applyFiltersBtn?.addEventListener('click', filterAnnonces);
    resetFiltersBtn?.addEventListener('click', resetFilters);
    
    // Filtrage en temps réel sur la recherche (optionnel)
    searchInput?.addEventListener('input', filterAnnonces);

    // Gestion du dropdown custom
    setupCustomDropdown();
    
    // Charger les fichiers au démarrage
    loadFiles();
});

// ============================================
// TEST DE CONNEXION
// ============================================
async function testConnection() {
    console.log('🔍 Test de connexion...');
    
    const testUrl = `${API_URL}/health`;
    console.log('📡 URL testée:', testUrl);
    
    if (testResult) testResult.textContent = '⏳ Test en cours...';
    showStatus('⏳ Test de connexion...', 'info');
    
    try {
        const response = await fetch(testUrl);
        const data = await response.json();
        
        console.log('✅ Réponse:', data);
        
        if (testResult) {
            testResult.textContent = `✅ ${data.message || 'Connexion réussie'}`;
            testResult.style.color = 'green';
        }
        
        showStatus('✅ API connectée avec succès!', 'success');
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        
        if (testResult) {
            testResult.textContent = `❌ Erreur: ${error.message}`;
            testResult.style.color = 'red';
        }
        
        showStatus(`❌ Erreur: ${error.message}`, 'error');
    }
}

// ============================================
// CHARGER LA LISTE DES FICHIERS
// ============================================
async function loadFiles() {
    if (!fileSelect) return;
    
    console.log('📂 Chargement de la liste des fichiers...');
    showLoader(true);
    hideStatus();
    
    try {
        const response = await fetch(`${API_URL}/files`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Fichiers reçus:', data);
        
        fileSelect.innerHTML = '';
        
        if (data.files && data.files.length > 0) {
            data.files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = `📄 ${file}`;
                fileSelect.appendChild(option);
            });
            
            showStatus(`✅ ${data.files.length} fichier(s) trouvé(s)`, 'success');
        } else {
            fileSelect.innerHTML = '<option value="" disabled>Aucun fichier disponible</option>';
            showStatus('⚠️ Aucun fichier trouvé', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showStatus(`❌ Erreur: ${error.message}`, 'error');
        fileSelect.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
    } finally {
        showLoader(false);
    }
}

// ============================================
// GESTION DE LA SÉLECTION
// ============================================
function updateSelection() {
    if (!fileSelect) return;
    
    selectedFiles = Array.from(fileSelect.selectedOptions).map(option => option.value);
    
    console.log('📋 Fichiers sélectionnés:', selectedFiles);
    
    if (selectedFiles.length > 0) {
        if (viewFilesBtn) viewFilesBtn.disabled = false;
        if (clearSelectionBtn) clearSelectionBtn.disabled = false;
        
        if (selectionInfo) {
            selectionInfo.classList.remove('hidden');
            selectionInfo.textContent = `📋 ${selectedFiles.length} fichier(s) sélectionné(s)`;
        }
    } else {
        if (viewFilesBtn) viewFilesBtn.disabled = true;
        if (clearSelectionBtn) clearSelectionBtn.disabled = true;
        if (selectionInfo) selectionInfo.classList.add('hidden');
    }
}

// ============================================
// AFFICHER LES FICHIERS SÉLECTIONNÉS
// ============================================
async function viewSelectedFiles() {
    if (selectedFiles.length === 0) {
        showStatus('⚠️ Aucun fichier sélectionné', 'error');
        return;
    }
    
    console.log('👁️ Affichage des fichiers:', selectedFiles);
    showLoader(true);
    
    if (contentDisplay) contentDisplay.innerHTML = '';
    if (contentSection) contentSection.classList.remove('hidden');
    
    for (const filename of selectedFiles) {
        try {
            await displayFileContent(filename);
        } catch (error) {
            displayFileError(filename, error);
        }
    }
    
    showLoader(false);
}

// ============================================
// AFFICHER LE CONTENU D'UN FICHIER
// ============================================
async function displayFileContent(filename) {
    console.log(`📄 Chargement de: ${filename}`);
    
    const url = `${API_URL}/file/${filename}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Contenu reçu:', data);
    
    if (!contentDisplay) return;
    
    const card = document.createElement('div');
    card.className = 'file-content-card';
    
    let content = data.content || data;
    
    if (typeof content === 'string') {
        try {
            content = JSON.parse(content);
        } catch (e) {
            console.log('⚠️ Contenu texte brut');
        }
    }
    
    const jsonString = JSON.stringify(content, null, 2);
    const size = new Blob([jsonString]).size;
    
    card.innerHTML = `
        <h3>📄 ${filename}</h3>
        <div class="file-info">
            📊 Taille: ${formatBytes(size)} | 
            📅 Type: ${Array.isArray(content) ? 'Array' : typeof content}
            ${Array.isArray(content) ? ` | 📝 ${content.length} élément(s)` : ''}
        </div>
        <pre class="json-content">${escapeHtml(jsonString)}</pre>
    `;
    
    contentDisplay.appendChild(card);
    console.log('✅ Fichier affiché:', filename);
}

// ============================================
// AFFICHER UNE ERREUR DE FICHIER
// ============================================
function displayFileError(filename, error) {
    if (!contentDisplay) return;
    
    const card = document.createElement('div');
    card.className = 'file-content-card';
    card.style.borderColor = '#dc3545';
    
    card.innerHTML = `
        <h3>❌ ${filename}</h3>
        <div class="file-info" style="background: #f8d7da; color: #721c24;">
            ⚠️ Erreur: ${error.message || error}
        </div>
    `;
    
    contentDisplay.appendChild(card);
    console.error('❌ Erreur pour', filename, ':', error);
}

// ============================================
// CLEAR & CLOSE
// ============================================
function clearSelection() {
    if (fileSelect) fileSelect.selectedIndex = -1;
    selectedFiles = [];
    updateSelection();
    closeContent();
    console.log('🗑️ Sélection effacée');
}

function closeContent() {
    if (contentSection) contentSection.classList.add('hidden');
    if (contentDisplay) contentDisplay.innerHTML = '';
}

// ============================================
// CHARGER ET AFFICHER LES ANNONCES
// ============================================
async function loadAnnonces() {
    showLoader(true);
    hideError();
    
    const annoncesContainer = document.getElementById('annoncesContainer');
    if (annoncesContainer) annoncesContainer.style.display = 'none';
    
    const fileName = 'annonces_data.json';
    const url = `${API_URL}/file/${fileName}`;
    
    console.log(`📡 Chargement depuis: ${url}`);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Données brutes reçues:', data);
        console.log('📊 Type:', typeof data);
        
        let annonces;
        
        if (Array.isArray(data)) {
            console.log('✅ Format: Array direct');
            annonces = data;
        } else if (data.content && Array.isArray(data.content)) {
            console.log('✅ Format: Object avec content (array)');
            annonces = data.content;
        } else if (data.content && typeof data.content === 'string') {
            console.log('⚠️ Format: Double encodage détecté');
            annonces = JSON.parse(data.content);
        } else {
            console.error('❌ Structure non reconnue:', data);
            throw new Error('Format de données non reconnu');
        }
        
        if (!Array.isArray(annonces)) {
            throw new Error('Les données ne sont pas un tableau');
        }
        
        console.log(`✅ ${annonces.length} annonces chargées`);
        
        // 🔍 DEBUG: Afficher les clés de la première annonce
        if (annonces.length > 0) {
            console.log('📋 Structure de la première annonce:', annonces[0]);
            console.log('📋 Clés disponibles:', Object.keys(annonces[0]));
        }
        
        allAnnonces = annonces;
        displayAnnonces(annonces);
        
        if (annoncesContainer) annoncesContainer.style.display = 'block';
        
        const countSpan = document.getElementById('annoncesCount');
        if (countSpan) countSpan.textContent = annonces.length;
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showError(`Erreur lors du chargement: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

// ============================================
// AFFICHER LES ANNONCES
// ============================================
function displayAnnonces(annonces) {
    const tbody = document.getElementById('annoncesBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!annonces || annonces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">Aucune annonce trouvée</td></tr>';
        return;
    }
    
    console.log(`📋 Affichage de ${annonces.length} annonces`);
    
    annonces.forEach((annonce, index) => {
        try {
            const row = createAnnonceRow(annonce);
            tbody.appendChild(row);
        } catch (error) {
            console.error(`❌ Erreur ligne ${index}:`, error, annonce);
        }
    });
}

// ============================================
// CRÉER UNE LIGNE D'ANNONCE
// ============================================
function createAnnonceRow(annonce) {
    const tr = document.createElement('tr');
    
    // ID
    const tdId = document.createElement('td');
    tdId.className = 'id-cell';
    tdId.textContent = annonce.id || 'N/A';
    tr.appendChild(tdId);
    
    // Prix
    const tdPrix = document.createElement('td');
    tdPrix.className = 'prix-cell';
    tdPrix.textContent = formatPrix(annonce.prix);
    tr.appendChild(tdPrix);
    
    // Surface
    const tdSurface = document.createElement('td');
    tdSurface.className = 'surface-cell';
    tdSurface.textContent = formatSurface(annonce.surface_m2 || annonce.surface || annonce.superficie);
    tr.appendChild(tdSurface);
    
    // Pièces
    const tdPieces = document.createElement('td');
    tdPieces.className = 'pieces-cell';
    tdPieces.textContent = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 'N/A';
    tr.appendChild(tdPieces);
    
    // Action
    const tdAction = document.createElement('td');
    tdAction.className = 'action-cell';
    if (annonce.url) {
        const btn = document.createElement('button');
        btn.textContent = '👁️ Voir';
        btn.className = 'btn btn-primary';
        btn.onclick = () => window.open(annonce.url, '_blank');
        tdAction.appendChild(btn);
    } else {
        tdAction.textContent = 'N/A';
    }
    tr.appendChild(tdAction);
    
    return tr;
}

function setupCustomDropdown() {
    if (!piecesDropdownToggle || !piecesDropdownMenu) return;
    
    // Toggle du menu au clic sur le bouton
    piecesDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        piecesDropdownMenu.classList.toggle('show');
        piecesDropdownToggle.classList.toggle('active');
    });
    
    // Empêcher la fermeture quand on clique dans le menu
    piecesDropdownMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Fermer le menu si on clique ailleurs
    document.addEventListener('click', () => {
        piecesDropdownMenu.classList.remove('show');
        piecesDropdownToggle.classList.remove('active');
    });
    
    // Mettre à jour le texte quand on coche/décoche
    piecesCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updatePiecesDropdownText);
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
    
    console.log(`🏠 ${count} type(s) de pièces sélectionné(s)`);
}

// ============================================
// FILTRER LES ANNONCES
// ============================================
function filterAnnonces() {
    console.log('🔍 Fonction filterAnnonces appelée');
    
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const selectedPieces = Array.from(piecesCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    const surfaceMin = surfaceMinInput?.value ? parseFloat(surfaceMinInput.value) : null;
    const surfaceMax = surfaceMaxInput?.value ? parseFloat(surfaceMaxInput.value) : null;
    
    console.log('🔍 Filtres appliqués:');
    console.log('  - Recherche:', searchTerm || 'aucune');
    console.log('  - Pièces sélectionnées:', selectedPieces.length > 0 ? selectedPieces : 'toutes');
    console.log('  - Surface min:', surfaceMin || 'aucune');
    console.log('  - Surface max:', surfaceMax || 'aucune');
    console.log('  - Total annonces:', allAnnonces.length);
    
    if (allAnnonces.length === 0) {
        console.warn('⚠️ Aucune annonce à filtrer');
        return;
    }
    
    const filtered = allAnnonces.filter(annonce => {
        // Filtre recherche
        const matchSearch = !searchTerm || 
            annonce.id?.toString().toLowerCase().includes(searchTerm) ||
            annonce.localisation?.toLowerCase().includes(searchTerm) ||
            annonce.description?.toLowerCase().includes(searchTerm);
        
        // Filtre pièces
        let matchPieces = true;
        if (selectedPieces.length > 0) {
            const pieces = annonce.pieces || annonce.nb_pieces || annonce.nombre_pieces || 0;
            
            matchPieces = selectedPieces.some(value => {
                if (value === '5+') {
                    return pieces >= 5;
                } else {
                    return pieces == parseInt(value);
                }
            });
            
            console.log(`  Annonce ${annonce.id}: pieces=${pieces}, match=${matchPieces}`);
        }
        
        // Filtre surface minimum (CORRIGÉ)
        let matchSurfaceMin = true;
        if (surfaceMin !== null) {
            const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
            matchSurfaceMin = surface >= surfaceMin;
            console.log(`  Annonce ${annonce.id}: surface=${surface}, min=${surfaceMin}, match=${matchSurfaceMin}`);
        }
        
        // Filtre surface maximum (CORRIGÉ)
        let matchSurfaceMax = true;
        if (surfaceMax !== null) {
            const surface = annonce.surface_m2 || annonce.surface || annonce.superficie || 0;
            matchSurfaceMax = surface <= surfaceMax;
            console.log(`  Annonce ${annonce.id}: surface=${surface}, max=${surfaceMax}, match=${matchSurfaceMax}`);
        }
        
        return matchSearch && matchPieces && matchSurfaceMin && matchSurfaceMax;
    });
    
    console.log(`✅ ${filtered.length} annonces correspondent aux critères`);
    
    displayAnnonces(filtered);
    
    // Mettre à jour le compteur
    const countSpan = document.getElementById('annoncesCount');
    if (countSpan) countSpan.textContent = filtered.length;
}

// ============================================
// RÉINITIALISER LES FILTRES
// ============================================
function resetFilters() {
    console.log('🔄 Réinitialisation des filtres');
    
    // Vider tous les champs
    if (searchInput) searchInput.value = '';
    if (surfaceMinInput) surfaceMinInput.value = '';
    if (surfaceMaxInput) surfaceMaxInput.value = '';
    piecesCheckboxes.forEach(cb => cb.checked = false);
    updatePiecesDropdownText();
        
    // Afficher toutes les annonces
    displayAnnonces(allAnnonces);
    
    // Mettre à jour le compteur
    const countSpan = document.getElementById('annoncesCount');
    if (countSpan) countSpan.textContent = allAnnonces.length;
}

// ============================================
// HELPERS
// ============================================
function formatPrix(prix) {
    if (!prix && prix !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(prix);
}

function formatSurface(surface) {
    if (!surface && surface !== 0) return 'N/A';
    return `${surface} m²`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

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

function showStatus(message, type) {
    if (connectionStatus) {
        connectionStatus.textContent = message;
        connectionStatus.className = `status ${type}`;
        connectionStatus.classList.remove('hidden');
        
        setTimeout(() => {
            connectionStatus.classList.add('hidden');
        }, 5000);
    }
}

function hideStatus() {
    if (connectionStatus) connectionStatus.classList.add('hidden');
}
