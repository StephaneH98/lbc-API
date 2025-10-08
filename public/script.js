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
let selectedFileName = null; 
let currentAnnonces = []; // Stocker les annonces actuelles
let currentSort = {
    column: null,
    direction: 'asc' // 'asc' ou 'desc'
};
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
        selectedFileName = null;
        return;
    }
    
    const file = availableFiles[selectedIndex];
    selectedFileName = file.name || file.Key; 
    
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
    if (!selectedFileName) {
        showError('Aucun fichier sélectionné');
        return;
    }

    hideError();
    showLoader(true);
    annoncesContainer.style.display = 'none';

    console.log('📥 Chargement du fichier:', selectedFileName);

    try {
        const url = `${CONFIG.API_URL}/file/${encodeURIComponent(selectedFileName)}`;
        console.log('🔗 URL appelée:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API:', errorText);
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 Contenu du fichier:', data);

        // ✅ EXTRACTION ADAPTÉE À VOTRE FORMAT
        let annonces = [];
        
        if (data.content && Array.isArray(data.content)) {
            // Format: { success: true, content: [...] }
            annonces = data.content;
        } else if (Array.isArray(data)) {
            // Format: [...]
            annonces = data;
        } else if (data.annonces && Array.isArray(data.annonces)) {
            // Format: { annonces: [...] }
            annonces = data.annonces;
        } else if (data.data && Array.isArray(data.data)) {
            // Format: { data: [...] }
            annonces = data.data;
        } else {
            console.warn('⚠️ Format inattendu:', data);
            throw new Error('Format de données non reconnu');
        }

        if (annonces.length === 0) {
            showError('Aucune annonce trouvée dans ce fichier');
            return;
        }

        console.log(`✅ ${annonces.length} annonce(s) trouvée(s)`);
        displayAnnonces(annonces);
        
        // Scroll vers les résultats
        setTimeout(() => {
            annoncesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

    } catch (error) {
        console.error('❌ Erreur de chargement du fichier:', error);
        showError(`Impossible de charger le fichier: ${error.message}`);
    } finally {
        showLoader(false);
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

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 octets';
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatPrice(price) {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function formatDate(dateString) {
    if (!dateString) return 'Date inconnue';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Erreur formatage date:', e);
        return dateString;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ==========================================
// CALCUL DE L'ÂGE D'UNE ANNONCE
// ==========================================
function calculateAnnonceAge(annonce) {
    const dateFields = ['date', 'date_publication', 'published_at', 'created_at', 'timestamp'];
    let dateString = null;
    
    // Chercher le champ de date
    for (const field of dateFields) {
        if (annonce[field]) {
            dateString = annonce[field];
            break;
        }
    }
    
    if (!dateString) {
        return {
            display: 'N/A',
            tooltip: 'Date de publication inconnue',
            class: 'age-unknown'
        };
    }
    
    try {
        const dateAnnonce = new Date(dateString);
        const maintenant = new Date();
        const diffMs = maintenant - dateAnnonce;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHeures = Math.floor(diffMs / (1000 * 60 * 60));
        const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffSemaines = Math.floor(diffJours / 7);
        const diffMois = Math.floor(diffJours / 30);
        
        let display = '';
        let cssClass = '';
        
        if (diffMinutes < 60) {
            display = `${diffMinutes} min`;
            cssClass = 'age-fresh';
        } else if (diffHeures < 24) {
            display = `${diffHeures}h`;
            cssClass = 'age-fresh';
        } else if (diffJours === 1) {
            display = 'Hier';
            cssClass = 'age-recent';
        } else if (diffJours < 7) {
            display = `${diffJours}j`;
            cssClass = 'age-recent';
        } else if (diffSemaines < 4) {
            display = `${diffSemaines} sem.`;
            cssClass = 'age-medium';
        } else if (diffMois < 12) {
            display = `${diffMois} mois`;
            cssClass = 'age-old';
        } else {
            const annees = Math.floor(diffMois / 12);
            display = `${annees} an${annees > 1 ? 's' : ''}`;
            cssClass = 'age-very-old';
        }
        
        const tooltip = `Publié le ${formatDate(dateString)}`;
        
        return {
            display: display,
            tooltip: tooltip,
            class: cssClass
        };
        
    } catch (e) {
        console.error('Erreur calcul âge:', e);
        return {
            display: 'Erreur',
            tooltip: 'Date invalide',
            class: 'age-error'
        };
    }
}

function renderAnnoncesTable(annonces) {
    const tbody = document.getElementById('annoncesTableBody');
    
    if (!tbody) {
        console.error('❌ tbody introuvable !');
        return;
    }
    
    let html = '';
    
    // Détecter le type de fichier
    const isLocation = annonces[0]?.hasOwnProperty('furnished') || annonces[0]?.hasOwnProperty('prix_m2');
    
    annonces.forEach((annonce, index) => {
        // Extraction des données
        const id = escapeHtml(annonce.id || index + 1);
        const localisation = escapeHtml(annonce.localisation || annonce.location || 'Non spécifié');
        const description = escapeHtml(annonce.description || 'Aucune description');
        const url = annonce.url || annonce.link || annonce.lien || '#';
        
        // Prix
        const prix = annonce.prix || annonce.price || 0;
        const prixFormate = formatPrice(prix);
        
        // Surface
        const surface = annonce.surface_m2 || annonce.surface || null;
        const surfaceDisplay = surface ? `${surface} m²` : 'N/A';
        
        // Pièces
        const pieces = annonce.pieces || annonce.rooms || annonce.nb_pieces || 'N/A';
        
        // Prix au m²
        let prixM2 = null;
        let prixM2Display = 'N/A';
        
        if (prix && surface && surface > 0) {
            prixM2 = Math.round(prix / surface);
            prixM2Display = formatPrice(prixM2) + '/m²';
        }
        
        // Calcul de l'âge de l'annonce
        const ageInfo = calculateAnnonceAge(annonce);
        
        // Construction de la ligne
        html += `<tr>`;
        html += `<td class="id">${id}</td>`;
        html += `<td class="localisation">${localisation}</td>`;
        html += `<td class="pieces">${pieces}</td>`;
        html += `<td class="surface">${surfaceDisplay}</td>`;
        html += `<td class="prix">${prixFormate}</td>`;
        html += `<td class="prix-m2 ${prixM2 ? 'has-value' : ''}">${prixM2Display}</td>`;
        html += `<td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>`;
        html += `<td class="description">${description}</td>`;
        html += `<td class="url"><a href="${url}" target="_blank" rel="noopener">🔗 Voir</a></td>`;
        html += `</tr>`;
    });
    
    tbody.innerHTML = html;
}

function updateSortIcons() {
    // Réinitialiser toutes les icônes
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '⇅';
    });
    
    // Mettre à jour l'icône de la colonne active
    if (currentSort.column) {
        const activeTh = document.querySelector(`[data-sort="${currentSort.column}"]`);
        if (activeTh) {
            activeTh.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            const icon = activeTh.querySelector('.sort-icon');
            if (icon) {
                icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
            }
        }
    }
}

// ==========================================
// FONCTION DE TRI
// ==========================================
function sortAnnonces(column) {
    console.log(`🔄 Tri par colonne: ${column}`);
    
    // Inverser la direction si on clique sur la même colonne
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Copie du tableau pour ne pas modifier l'original
    const sorted = [...currentAnnonces].sort((a, b) => {
        let valA, valB;
        
        switch(column) {
            case 'id':
                valA = parseInt(a.id) || 0;
                valB = parseInt(b.id) || 0;
                break;
                
            case 'localisation':
                valA = (a.localisation || a.location || '').toLowerCase();
                valB = (b.localisation || b.location || '').toLowerCase();
                break;
                
            case 'pieces':
                valA = parseInt(a.pieces || a.rooms || a.nb_pieces) || 0;
                valB = parseInt(b.pieces || b.rooms || b.nb_pieces) || 0;
                break;
                
            case 'surface':
                valA = parseFloat(a.surface_m2 || a.surface) || 0;
                valB = parseFloat(b.surface_m2 || b.surface) || 0;
                break;
                
            case 'prix':
                valA = parseFloat(a.prix || a.price) || 0;
                valB = parseFloat(b.prix || b.price) || 0;
                break;
                
            case 'prix_m2':
                const surfaceA = parseFloat(a.surface_m2 || a.surface) || 0;
                const surfaceB = parseFloat(b.surface_m2 || b.surface) || 0;
                const prixA = parseFloat(a.prix || a.price) || 0;
                const prixB = parseFloat(b.prix || b.price) || 0;
                valA = surfaceA > 0 ? prixA / surfaceA : 0;
                valB = surfaceB > 0 ? prixB / surfaceB : 0;
                break;
                
            case 'age':
                // Tri par date (plus récent = valeur plus grande)
                const dateFields = ['date', 'date_publication', 'published_at', 'created_at', 'timestamp'];
                
                let dateA = null;
                let dateB = null;
                
                for (const field of dateFields) {
                    if (a[field]) dateA = new Date(a[field]);
                    if (b[field]) dateB = new Date(b[field]);
                    if (dateA && dateB) break;
                }
                
                valA = dateA ? dateA.getTime() : 0;
                valB = dateB ? dateB.getTime() : 0;
                break;
                
            default:
                return 0;
        }
        
        // Comparaison
        let comparison = 0;
        if (typeof valA === 'string') {
            comparison = valA.localeCompare(valB, 'fr');
        } else {
            comparison = valA - valB;
        }
        
        // Appliquer la direction
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });
    
    console.log(`✅ Tri ${currentSort.direction === 'asc' ? '↑' : '↓'} appliqué sur ${column}`);
    
    // Ré-afficher avec les données triées
    renderAnnoncesTable(sorted);
    updateSortIcons();
}


// ==========================================
// AFFICHAGE DES ANNONCES (VERSION DEBUG)
// ==========================================
function displayAnnonces(annonces) {
    console.log('🎨 displayAnnonces() appelée');
    console.log('📊 Nombre d\'annonces reçues:', annonces?.length);
    
    if (!Array.isArray(annonces)) {
        console.error('❌ Les annonces ne sont pas un tableau !');
        showError('Format de données invalide');
        return;
    }
    
    if (annonces.length === 0) {
        console.error('❌ Le tableau est vide !');
        showError('Aucune annonce à afficher');
        return;
    }

    console.log('✅ Validation OK, génération du HTML...');

    // Détecter le type de fichier
    const isLocation = annonces[0].hasOwnProperty('furnished') || annonces[0].hasOwnProperty('prix_m2');

    // Créer le tableau
    let html = `
    <div class="results-header">
        <h3>📊 ${annonces.length} annonce(s) ${isLocation ? 'de location' : 'de vente'}</h3>
    </div>
    <div class="table-responsive">
        <table class="annonces-table">
            <thead>
                <tr>
                    <th data-sort="id" class="sortable">🆔 ID <span class="sort-icon">⇅</span></th>
                    <th data-sort="localisation" class="sortable">📍 Localisation <span class="sort-icon">⇅</span></th>
                    <th data-sort="pieces" class="sortable">🏠 Pièces <span class="sort-icon">⇅</span></th>
                    <th data-sort="surface" class="sortable">📏 Surface <span class="sort-icon">⇅</span></th>
                    <th data-sort="prix" class="sortable">💰 Prix ${isLocation ? '/mois' : ''} <span class="sort-icon">⇅</span></th>
                    <th data-sort="prix_m2" class="sortable">📊 Prix/m² <span class="sort-icon">⇅</span></th>
                    <th data-sort="age" class="sortable">⏰ Âge <span class="sort-icon">⇅</span></th>
                    <th>📝 Description</th>
                    <th>🔗 Lien</th>
                </tr>
            </thead>
            <tbody id="annoncesTableBody">
    `;


    annonces.forEach((annonce, index) => {
        // Extraction des données
        const id = escapeHtml(annonce.id || index + 1);
        const localisation = escapeHtml(annonce.localisation || annonce.location || 'Non spécifié');
        const description = escapeHtml(annonce.description || 'Aucune description');
        const url = annonce.url || annonce.link || annonce.lien || '#';
        
        // Prix
        const prix = annonce.prix || annonce.price || 0;
        const prixFormate = formatPrice(prix);
        
        // Surface
        const surface = annonce.surface_m2 || annonce.surface || null;
        const surfaceDisplay = surface ? `${surface} m²` : 'N/A';
        
        // Pièces
        const pieces = annonce.pieces || annonce.rooms || annonce.nb_pieces || 'N/A';
        
        // Prix au m²
        let prixM2 = null;
        let prixM2Display = 'N/A';
        
        if (prix && surface && surface > 0) {
            prixM2 = Math.round(prix / surface);
            prixM2Display = formatPrice(prixM2) + '/m²';
        }
        
        // Calcul de l'âge de l'annonce
        const ageInfo = calculateAnnonceAge(annonce);
        
        // Construction de la ligne
        html += `<tr>`;
        html += `<td class="id">${id}</td>`;
        html += `<td class="localisation">${localisation}</td>`;
        html += `<td class="pieces">${pieces}</td>`;
        html += `<td class="surface">${surfaceDisplay}</td>`;
        html += `<td class="prix">${prixFormate}</td>`;
        html += `<td class="prix-m2 ${prixM2 ? 'has-value' : ''}">${prixM2Display}</td>`;
        html += `<td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>`;
        html += `<td class="description">${description}</td>`;
        html += `<td class="url"><a href="${url}" target="_blank" rel="noopener">🔗 Voir</a></td>`;
        html += `</tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
        
        <div class="table-stats">
            <p>💡 Astuce : Survolez l'âge pour voir la date exacte de publication</p>
        </div>
    `;

    console.log('📏 Longueur du HTML généré:', html.length, 'caractères');

    annoncesContainer.innerHTML = html;
    annoncesContainer.style.display = 'block';
    
    // Sauvegarder les annonces actuelles
    currentAnnonces = annonces;
    currentSort = { column: null, direction: 'asc' };
    
    console.log('✅ HTML injecté dans le container');
    
    // Ajouter les événements de tri sur les en-têtes
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            sortAnnonces(column);
        });
    });
    
    console.log('✅ Événements de tri ajoutés');
    
    // Scroll vers les résultats
    setTimeout(() => {
        annoncesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
