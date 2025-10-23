// ==========================================
// GESTION DE LA PAGE DE COMPARAISON
// ==========================================

console.log('⚖️ Chargement de comparaison.js...');

// État global
let annoncesToCompare = [];
let currentFileName = '';

/**
 * Initialisation de la page
 */
function init() {
    console.log('🚀 Initialisation de la page de comparaison...');

    try {
        // Récupérer les annonces depuis sessionStorage
        const storedAnnonces = sessionStorage.getItem('comparaisonAnnonces');
        const storedFileName = sessionStorage.getItem('comparaisonFileName');

        if (!storedAnnonces) {
            console.warn('⚠️ Aucune annonce trouvée dans sessionStorage');
            showEmptyState();
            return;
        }

        annoncesToCompare = JSON.parse(storedAnnonces);
        currentFileName = storedFileName || '';

        console.log(`✅ ${annoncesToCompare.length} annonces chargées pour comparaison`);
        console.log(`📁 Fichier source: ${currentFileName}`);

        if (annoncesToCompare.length < 2) {
            console.warn('⚠️ Moins de 2 annonces pour la comparaison');
            showEmptyState();
            return;
        }

        // Afficher le tableau de comparaison
        displayComparisonTable();

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showEmptyState();
    }
}

/**
 * Afficher le tableau de comparaison
 */
function displayComparisonTable() {
    console.log('📊 Génération du tableau de comparaison...');

    const loadingState = document.getElementById('loading-state');
    const comparisonContent = document.getElementById('comparison-content');
    const table = document.getElementById('comparison-table');

    // Cacher le loading
    loadingState.style.display = 'none';
    comparisonContent.style.display = 'block';

    // Générer le tableau
    const html = generateTableHTML();
    table.innerHTML = html;

    console.log('✅ Tableau de comparaison affiché');
}

/**
 * Générer le HTML du tableau
 */
function generateTableHTML() {
    // En-tête avec les IDs des annonces
    let html = '<thead><tr>';
    html += '<th>Critère</th>';
    annoncesToCompare.forEach((annonce, index) => {
        const id = escapeHtml(annonce.id || index + 1);
        html += `<th><div class="annonce-id">ID: ${id}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    // Lignes de comparaison
    const comparisons = [
        {
            label: '📍 Localisation',
            getValue: (a, index) => escapeHtml(a.localisation || a.location || 'Non spécifié'),
            compare: false
        },
        {
            label: '💰 Prix',
            getValue: (a, index) => formatPrice(a.prix || a.price || 0),
            compare: true,
            compareType: 'min'
        },
        {
            label: '📏 Surface',
            getValue: (a, index) => {
                const surface = a.surface_m2 || a.surface;
                return surface ? `${surface} m²` : 'N/A';
            },
            compare: true,
            compareType: 'max'
        },
        {
            label: '🏠 Pièces',
            getValue: (a, index) => escapeHtml(String(a.pieces || a.rooms || a.nb_pieces || 'N/A')),
            compare: true,
            compareType: 'max'
        },
        {
            label: '📊 Prix/m²',
            getValue: (a, index) => {
                const prix = a.prix || a.price || 0;
                const surface = a.surface_m2 || a.surface;
                if (prix && surface && surface > 0) {
                    const prixM2 = Math.round(prix / surface);
                    return `${formatPrice(prixM2)}/m²`;
                }
                return 'N/A';
            },
            compare: true,
            compareType: 'min'
        },
        {
            label: '⏰ Âge de l\'annonce',
            getValue: (a, index) => {
                const ageInfo = calculateAnnonceAge(a);
                return ageInfo.display;
            },
            compare: false
        },
        {
            label: '📝 Description',
            getValue: (a, index) => {
                const desc = a.description || 'Aucune description';
                return desc.length > 100 ? escapeHtml(desc.substring(0, 100)) + '...' : escapeHtml(desc);
            },
            compare: false
        },
        {
            label: '🔗 Lien',
            getValue: (a, index) => {
                const id = a.id || index + 1;
                const detailUrl = `annonce-detail.html?file=${encodeURIComponent(currentFileName)}&id=${encodeURIComponent(id)}`;
                return `<a href="${detailUrl}" class="link-button">👁️ Voir le détail</a>`;
            },
            compare: false
        }
    ];

    // Générer chaque ligne de comparaison
    comparisons.forEach(comp => {
        html += '<tr>';
        html += `<th>${comp.label}</th>`;

        // Si on doit comparer, trouver la meilleure valeur
        let bestIndices = [];
        if (comp.compare) {
            bestIndices = findBestValues(annoncesToCompare, comp);
        }

        // Afficher les valeurs pour chaque annonce
        annoncesToCompare.forEach((annonce, index) => {
            const value = comp.getValue(annonce, index);
            const isBest = bestIndices.includes(index);
            const tdClass = isBest ? ' class="best-value"' : '';

            html += `<td${tdClass}>${value}</td>`;
        });

        html += '</tr>';
    });

    html += '</tbody>';
    return html;
}

/**
 * Trouver les meilleures valeurs pour la comparaison
 */
function findBestValues(annonces, comparison) {
    const values = annonces.map((annonce, index) => {
        let numValue = 0;

        // Extraire la valeur numérique selon le critère
        if (comparison.label.includes('Prix/m²') || comparison.label === '💰 Prix') {
            const prix = annonce.prix || annonce.price || 0;
            const surface = annonce.surface_m2 || annonce.surface;

            if (comparison.label.includes('Prix/m²')) {
                numValue = surface && surface > 0 ? Math.round(prix / surface) : 0;
            } else {
                numValue = prix;
            }
        } else if (comparison.label.includes('Surface')) {
            numValue = annonce.surface_m2 || annonce.surface || 0;
        } else if (comparison.label.includes('Pièces')) {
            numValue = parseInt(annonce.pieces || annonce.rooms || annonce.nb_pieces || 0);
        }

        return { index, value: numValue };
    });

    // Filtrer les valeurs valides (> 0)
    const validValues = values.filter(v => v.value > 0);

    if (validValues.length === 0) return [];

    // Trouver la meilleure valeur selon le type
    if (comparison.compareType === 'min') {
        const minValue = Math.min(...validValues.map(v => v.value));
        return validValues.filter(v => v.value === minValue).map(v => v.index);
    } else if (comparison.compareType === 'max') {
        const maxValue = Math.max(...validValues.map(v => v.value));
        return validValues.filter(v => v.value === maxValue).map(v => v.index);
    }

    return [];
}

/**
 * Calculer l'âge d'une annonce
 */
function calculateAnnonceAge(annonce) {
    if (!annonce.date) {
        return {
            display: 'Inconnue',
            class: '',
            tooltip: 'Date non disponible'
        };
    }

    try {
        const annonceDate = new Date(annonce.date);
        const now = new Date();
        const diffTime = Math.abs(now - annonceDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let display = '';
        let className = '';

        if (diffDays === 0) {
            display = 'Aujourd\'hui';
            className = 'age-fresh';
        } else if (diffDays === 1) {
            display = 'Hier';
            className = 'age-fresh';
        } else if (diffDays < 7) {
            display = `${diffDays} jours`;
            className = 'age-recent';
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            display = `${weeks} semaine${weeks > 1 ? 's' : ''}`;
            className = 'age-medium';
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            display = `${months} mois`;
            className = 'age-old';
        } else {
            const years = Math.floor(diffDays / 365);
            display = `${years} an${years > 1 ? 's' : ''}`;
            className = 'age-veryold';
        }

        const formattedDate = annonceDate.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            display,
            class: className,
            tooltip: `Publiée le ${formattedDate}`
        };
    } catch (error) {
        console.error('Erreur lors du calcul de l\'âge:', error);
        return {
            display: 'Erreur',
            class: '',
            tooltip: 'Erreur de calcul'
        };
    }
}

/**
 * Formater un prix
 */
function formatPrice(price) {
    if (!price || price === 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

/**
 * Échapper le HTML
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Afficher l'état vide
 */
function showEmptyState() {
    const loadingState = document.getElementById('loading-state');
    const comparisonContent = document.getElementById('comparison-content');
    const emptyState = document.getElementById('empty-state');

    loadingState.style.display = 'none';
    comparisonContent.style.display = 'none';
    emptyState.style.display = 'block';
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', init);

console.log('✅ comparaison.js chargé');
