// ==========================================
// ÉLÉMENTS DOM
// ==========================================
const annoncesContainer = document.getElementById('annonces-container');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const fileNameDisplay = document.getElementById('fileNameDisplay');

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let currentAnnonces = [];
let currentSort = {
    column: null,
    direction: 'asc'
};

// ==========================================
// INITIALISATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const selectedFile = localStorage.getItem('selectedFile');
    
    if (!selectedFile) {
        showError('Aucun fichier sélectionné');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    fileNameDisplay.textContent = `Fichier : ${selectedFile}`;
    loadAnnonces(selectedFile);
});

// ==========================================
// CHARGEMENT DES ANNONCES
// ==========================================
async function loadAnnonces(filename) {
    console.log('🔄 Chargement du fichier:', filename);
    showLoading(true);

    try {
        const response = await fetch(`http://127.0.0.1:5000/get_annonces?filename=${encodeURIComponent(filename)}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Données reçues:', data);

        if (data.success && Array.isArray(data.annonces)) {
            currentAnnonces = data.annonces;
            displayAnnonces(data.annonces);
        } else {
            throw new Error('Format de données invalide');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
        showError('Impossible de charger les annonces');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// AFFICHAGE DES ANNONCES
// ==========================================
function displayAnnonces(annonces) {
    console.log('🎨 Affichage de', annonces.length, 'annonces');
    
    if (annonces.length === 0) {
        showError('Aucune annonce à afficher');
        return;
    }

    const isLocation = annonces[0]?.hasOwnProperty('furnished') || annonces[0]?.hasOwnProperty('prix_m2');

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
        const id = escapeHtml(annonce.id || index + 1);
        const localisation = escapeHtml(annonce.localisation || annonce.location || 'Non spécifié');
        const description = escapeHtml(annonce.description || 'Aucune description');
        const url = annonce.url || annonce.link || annonce.lien || '#';
        
        const prix = annonce.prix || annonce.price || 0;
        const prixFormate = formatPrice(prix);
        
        const surface = annonce.surface_m2 || annonce.surface || null;
        const surfaceDisplay = surface ? `${surface} m²` : 'N/A';
        
        const pieces = annonce.pieces || annonce.rooms || annonce.nb_pieces || 'N/A';
        
        let prixM2Display = 'N/A';
        if (prix && surface && surface > 0) {
            const prixM2 = Math.round(prix / surface);
            prixM2Display = formatPrice(prixM2) + '/m²';
        }
        
        const ageInfo = calculateAnnonceAge(annonce);
        
        html += `<tr>`;
        html += `<td class="id">${id}</td>`;
        html += `<td class="localisation">${localisation}</td>`;
        html += `<td class="pieces">${pieces}</td>`;
        html += `<td class="surface">${surfaceDisplay}</td>`;
        html += `<td class="prix">${prixFormate}</td>`;
        html += `<td class="prix-m2">${prixM2Display}</td>`;
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
            <p>💡 Cliquez sur une colonne pour trier • Survolez l'âge pour voir la date exacte</p>
        </div>
    `;

    annoncesContainer.innerHTML = html;
    annoncesContainer.style.display = 'block';
    
    // Ajouter les événements de tri
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            sortAnnonces(column);
        });
    });
}

// ==========================================
// TRI DES ANNONCES
// ==========================================
function sortAnnonces(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
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
                const dateFields = ['date', 'date_publication', 'published_at', 'created_at', 'timestamp'];
                let dateA = null, dateB = null;
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
        
        let comparison = typeof valA === 'string' ? valA.localeCompare(valB, 'fr') : valA - valB;
        return currentSort.direction === 'asc' ? comparison : -comparison;
    });
    
    renderAnnoncesTable(sorted);
    updateSortIcons();
}

function renderAnnoncesTable(annonces) {
    const tbody = document.getElementById('annoncesTableBody');
    if (!tbody) return;
    
    let html = '';
    annonces.forEach((annonce, index) => {
        const id = escapeHtml(annonce.id || index + 1);
        const localisation = escapeHtml(annonce.localisation || annonce.location || 'Non spécifié');
        const description = escapeHtml(annonce.description || 'Aucune description');
        const url = annonce.url || annonce.link || annonce.lien || '#';
        const prix = annonce.prix || annonce.price || 0;
        const prixFormate = formatPrice(prix);
        const surface = annonce.surface_m2 || annonce.surface || null;
        const surfaceDisplay = surface ? `${surface} m²` : 'N/A';
        const pieces = annonce.pieces || annonce.rooms || annonce.nb_pieces || 'N/A';
        
        let prixM2Display = 'N/A';
        if (prix && surface && surface > 0) {
            const prixM2 = Math.round(prix / surface);
            prixM2Display = formatPrice(prixM2) + '/m²';
        }
        
        const ageInfo = calculateAnnonceAge(annonce);
        
        html += `<tr>`;
        html += `<td class="id">${id}</td>`;
        html += `<td class="localisation">${localisation}</td>`;
        html += `<td class="pieces">${pieces}</td>`;
        html += `<td class="surface">${surfaceDisplay}</td>`;
        html += `<td class="prix">${prixFormate}</td>`;
        html += `<td class="prix-m2">${prixM2Display}</td>`;
        html += `<td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>`;
        html += `<td class="description">${description}</td>`;
        html += `<td class="url"><a href="${url}" target="_blank" rel="noopener">🔗 Voir</a></td>`;
        html += `</tr>`;
    });
    tbody.innerHTML = html;
}

function updateSortIcons() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '⇅';
    });
    
    if (currentSort.column) {
        const activeTh = document.querySelector(`[data-sort="${currentSort.column}"]`);
        if (activeTh) {
            activeTh.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            const icon = activeTh.querySelector('.sort-icon');
            if (icon) icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        }
    }
}

// ==========================================
// CALCUL ÂGE ANNONCE
// ==========================================
function calculateAnnonceAge(annonce) {
    const dateFields = ['date', 'date_publication', 'published_at', 'created_at', 'timestamp'];
    let annonceDate = null;
    
    for (const field of dateFields) {
        if (annonce[field]) {
            annonceDate = new Date(annonce[field]);
            if (!isNaN(annonceDate.getTime())) break;
        }
    }
    
    if (!annonceDate || isNaN(annonceDate.getTime())) {
        return { display: 'N/A', tooltip: 'Date non disponible', class: 'age-unknown' };
    }
    
    const now = new Date();
    const diffMs = now - annonceDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    let display, cssClass;
    
    if (diffMinutes < 60) {
        display = `${diffMinutes} min`;
        cssClass = 'age-fresh';
    } else if (diffHours < 24) {
        display = `${diffHours}h`;
        cssClass = 'age-fresh';
    } else if (diffDays === 1) {
        display = '1 jour';
        cssClass = 'age-recent';
    } else if (diffDays < 7) {
        display = `${diffDays} jours`;
        cssClass = 'age-recent';
    } else if (diffWeeks === 1) {
        display = '1 sem.';
        cssClass = 'age-medium';
    } else if (diffWeeks < 4) {
        display = `${diffWeeks} sem.`;
        cssClass = 'age-medium';
    } else if (diffMonths === 1) {
        display = '1 mois';
        cssClass = 'age-old';
    } else if (diffMonths < 12) {
        display = `${diffMonths} mois`;
        cssClass = 'age-old';
    } else if (diffYears === 1) {
        display = '1 an';
        cssClass = 'age-very-old';
    } else {
        display = `${diffYears} ans`;
        cssClass = 'age-very-old';
    }
    
    return {
        display,
        tooltip: annonceDate.toLocaleString('fr-FR'),
        class: cssClass
    };
}

// ==========================================
// UTILITAIRES
// ==========================================
function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.style.display = 'block';
    loading.style.display = 'none';
}

function formatPrice(price) {
    if (!price) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

