/* ==========================================
   PAGE DÉTAIL D'UNE ANNONCE
   ========================================== */

(function() {
    'use strict';

    let annonceData = null;
    let allAnnonces = [];
    let priceStats = null;

    /* ==========================================
       INITIALISATION
       ========================================== */

    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 Initialisation de la page détail annonce');

        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const filename = urlParams.get('file');
        const annonceId = urlParams.get('id');

        if (!filename || !annonceId) {
            showError('Paramètres manquants. Impossible de charger l\'annonce.');
            return;
        }

        // Charger les données
        loadAnnonceData(filename, annonceId);

        // Événement bouton retour
        document.getElementById('backBtn').addEventListener('click', function() {
            window.history.back();
        });
    });

    /* ==========================================
       CHARGEMENT DES DONNÉES
       ========================================== */

    async function loadAnnonceData(filename, annonceId) {
        try {
            // Récupérer l'utilisateur de la même manière que dans annonces.js
            const username = CONFIG.getCurrentUser();
            if (!username) {
                throw new Error('Utilisateur non authentifié');
            }

            console.log(`📥 Chargement du fichier: ${filename}`);
            console.log(`👤 Utilisateur: ${username}`);

            // Utiliser l'API GET_USER_SEARCHES comme dans annonces.js
            const apiUrl = CONFIG.getApiUrl('GET_USER_SEARCHES') +
                '?username=' + encodeURIComponent(username) +
                '&filename=' + encodeURIComponent(filename);

            console.log(`🌐 URL API: ${apiUrl}`);

            // Récupérer le token d'authentification
            const authToken = CONFIG.getAuthToken();

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': authToken ? `Bearer ${authToken}` : ''
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('📦 Données reçues de l\'API:', responseData);

            // La structure de l'API est: { success: true, data: { data: { vente: [...], location: [...] } } }
            const outerData = responseData.data || responseData;
            const innerData = outerData.data || outerData;

            console.log('📦 Contenu de innerData:', innerData);
            console.log('📦 Clés de innerData:', Object.keys(innerData));

            // Combiner les annonces de vente et de location
            const venteAnnonces = innerData.vente || [];
            const locationAnnonces = innerData.location || [];
            allAnnonces = [...venteAnnonces, ...locationAnnonces];

            console.log(`📊 Total annonces chargées: ${allAnnonces.length}`);
            console.log(`🔍 Recherche de l'annonce ID: "${annonceId}"`);

            // Afficher les premiers IDs pour debug
            if (allAnnonces.length > 0) {
                console.log('📋 Premiers IDs trouvés:', allAnnonces.slice(0, 5).map(a => a.id));
            }

            // Trouver l'annonce spécifique - essayer plusieurs méthodes
            annonceData = allAnnonces.find(a => {
                const id = (a.id || '').toString();
                return id === annonceId;
            });

            // Si pas trouvé par ID exact, essayer par index (ID - 1)
            if (!annonceData) {
                const index = parseInt(annonceId) - 1;
                if (index >= 0 && index < allAnnonces.length) {
                    console.log(`⚠️ ID exact non trouvé, utilisation de l'index ${index}`);
                    annonceData = allAnnonces[index];
                }
            }

            // Si toujours pas trouvé, essayer une correspondance flexible
            if (!annonceData) {
                annonceData = allAnnonces.find(a => {
                    const id = (a.id || '').toString().trim();
                    return id == annonceId; // Égalité non stricte
                });
            }

            if (!annonceData) {
                console.error('❌ Annonces disponibles:', allAnnonces.map(a => ({ id: a.id, localisation: a.localisation })));
                throw new Error(`Annonce #${annonceId} introuvable parmi ${allAnnonces.length} annonces`);
            }

            console.log('✅ Annonce chargée:', annonceData);

            // Calculer les statistiques de prix
            calculatePriceStats();

            // Afficher l'annonce
            displayAnnonce();

        } catch (error) {
            console.error('❌ Erreur:', error);
            showError('Erreur lors du chargement de l\'annonce: ' + error.message);
        }
    }

    /* ==========================================
       CALCUL DES STATISTIQUES DE PRIX
       ========================================== */

    function calculatePriceStats() {
        const prices = [];
        const pricesPerM2 = [];

        allAnnonces.forEach(annonce => {
            const price = parseFloat((annonce.prix || annonce.price || '').toString().replace(/[^\d]/g, ''));
            if (price && price > 0) {
                prices.push(price);

                // Calculer prix au m²
                let priceM2 = parseFloat((annonce.prix_m2 || '').toString().replace(/[^\d]/g, ''));
                if (!priceM2 || priceM2 === 0) {
                    const surface = parseFloat((annonce.surface_m2 || annonce.surface || '').toString().replace(/[^\d]/g, ''));
                    if (surface && surface > 0) {
                        priceM2 = Math.round(price / surface);
                    }
                }

                if (priceM2 && priceM2 > 0) {
                    pricesPerM2.push(priceM2);
                }
            }
        });

        priceStats = {
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            minPriceM2: pricesPerM2.length > 0 ? Math.min(...pricesPerM2) : 0,
            maxPriceM2: pricesPerM2.length > 0 ? Math.max(...pricesPerM2) : 0,
            avgPriceM2: pricesPerM2.length > 0 ? Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length) : 0
        };

        console.log('📊 Statistiques de prix:', priceStats);
    }

    /* ==========================================
       AFFICHAGE DE L'ANNONCE
       ========================================== */

    function displayAnnonce() {
        // Cacher le loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('annonce-content').style.display = 'block';

        // Titre
        const localisation = annonceData.localisation || annonceData.location || 'Localisation non spécifiée';
        const pieces = annonceData.pieces || annonceData.rooms || annonceData.nb_pieces || '?';
        document.getElementById('annonce-title').textContent = `Appartement ${pieces} pièces - ${localisation}`;

        // Badges (âge de l'annonce)
        const badgesHtml = createAgeBadge(annonceData);
        document.getElementById('annonce-badges').innerHTML = badgesHtml;

        // Prix
        const prix = parseFloat((annonceData.prix || annonceData.price || '0').toString().replace(/[^\d]/g, ''));
        document.getElementById('annonce-price').textContent = formatPrice(prix);

        // Prix au m²
        const surface = parseFloat((annonceData.surface_m2 || annonceData.surface || '0').toString().replace(/[^\d]/g, ''));
        let prixM2Display = '';
        if (prix && surface && surface > 0) {
            const prixM2 = Math.round(prix / surface);
            prixM2Display = `${formatPrice(prixM2)}/m²`;
        } else {
            prixM2Display = 'N/A';
        }
        document.getElementById('annonce-price-m2').textContent = prixM2Display;

        // Localisation
        document.getElementById('annonce-localisation').textContent = localisation;

        // Surface
        document.getElementById('annonce-surface').textContent = surface ? `${surface} m²` : 'N/A';

        // Pièces
        document.getElementById('annonce-pieces').textContent = pieces;

        // Date de publication
        const dateStr = annonceData.date_publication || annonceData.date || 'Non spécifiée';
        document.getElementById('annonce-date').textContent = formatDate(dateStr);

        // Description
        const description = annonceData.description || 'Aucune description disponible';
        document.getElementById('annonce-description').textContent = description;

        // Graphiques de positionnement
        displayPricePosition(prix, prixM2Display !== 'N/A' ? Math.round(prix / surface) : 0);

        // Lien vers l'annonce
        const url = annonceData.url || annonceData.link || annonceData.lien || '#';
        document.getElementById('annonce-link').href = url;
    }

    /* ==========================================
       AFFICHAGE DU POSITIONNEMENT PRIX
       ========================================== */

    function displayPricePosition(currentPrice, currentPriceM2) {
        if (!priceStats) return;

        const container = document.getElementById('price-position-charts');
        let html = '';

        // Graphique Prix de vente
        if (currentPrice > 0) {
            const percentage = ((currentPrice - priceStats.minPrice) / (priceStats.maxPrice - priceStats.minPrice)) * 100;
            const comparison = getComparison(currentPrice, priceStats.avgPrice);

            html += `
                <div class="position-chart-row">
                    <div class="position-chart-label">💰 Prix de vente</div>
                    <div class="position-bar-container">
                        <div class="position-gradient"></div>
                        <div class="position-marker position-marker-current"
                             style="left: ${percentage}%"
                             data-value="${formatPrice(currentPrice)}">
                        </div>
                    </div>
                </div>
                <div class="position-range-labels">
                    <span>Min: ${formatPrice(priceStats.minPrice)}</span>
                    <span>Moy: ${formatPrice(priceStats.avgPrice)}</span>
                    <span>Max: ${formatPrice(priceStats.maxPrice)}</span>
                </div>
                <div class="position-comparison">${comparison.text}</div>
            `;
        }

        // Graphique Prix au m²
        if (currentPriceM2 > 0 && priceStats.minPriceM2 > 0) {
            const percentage = ((currentPriceM2 - priceStats.minPriceM2) / (priceStats.maxPriceM2 - priceStats.minPriceM2)) * 100;
            const comparison = getComparison(currentPriceM2, priceStats.avgPriceM2);

            html += `
                <div class="position-chart-row" style="margin-top: 2rem;">
                    <div class="position-chart-label">📏 Prix au m²</div>
                    <div class="position-bar-container">
                        <div class="position-gradient"></div>
                        <div class="position-marker position-marker-current"
                             style="left: ${percentage}%"
                             data-value="${currentPriceM2} €/m²">
                        </div>
                    </div>
                </div>
                <div class="position-range-labels">
                    <span>Min: ${priceStats.minPriceM2} €/m²</span>
                    <span>Moy: ${priceStats.avgPriceM2} €/m²</span>
                    <span>Max: ${priceStats.maxPriceM2} €/m²</span>
                </div>
                <div class="position-comparison">${comparison.text}</div>
            `;
        }

        container.innerHTML = html;
    }

    /* ==========================================
       FONCTIONS UTILITAIRES
       ========================================== */

    function getComparison(value, average) {
        const diff = ((value - average) / average) * 100;
        let text = '';
        let emoji = '';

        if (diff < -15) {
            emoji = '🟢';
            text = `${emoji} Cette annonce est ${Math.abs(diff).toFixed(0)}% moins chère que la moyenne. Très bon prix !`;
        } else if (diff < -5) {
            emoji = '✅';
            text = `${emoji} Cette annonce est ${Math.abs(diff).toFixed(0)}% moins chère que la moyenne. Bon prix.`;
        } else if (diff > 15) {
            emoji = '🔴';
            text = `${emoji} Cette annonce est ${diff.toFixed(0)}% plus chère que la moyenne. Prix élevé.`;
        } else if (diff > 5) {
            emoji = '⚠️';
            text = `${emoji} Cette annonce est ${diff.toFixed(0)}% plus chère que la moyenne.`;
        } else {
            emoji = '⚖️';
            text = `${emoji} Cette annonce est dans la moyenne du marché.`;
        }

        return { text, emoji };
    }

    function createAgeBadge(annonce) {
        const dateStr = annonce.date_publication || annonce.date;
        if (!dateStr) return '<span class="badge">📅 Date inconnue</span>';

        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) {
            return '<span class="badge badge-new">🆕 Nouvelle (aujourd\'hui)</span>';
        } else if (diffDays === 1) {
            return '<span class="badge badge-new">🆕 Nouvelle (hier)</span>';
        } else if (diffDays < 7) {
            return `<span class="badge badge-new">🆕 Récente (${diffDays} jours)</span>`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `<span class="badge">${weeks} semaine${weeks > 1 ? 's' : ''}</span>`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `<span class="badge badge-old">⏰ ${months} mois</span>`;
        } else {
            return '<span class="badge badge-old">⏰ Plus d\'1 an</span>';
        }
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Non spécifiée';

        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } catch (error) {
            return dateStr;
        }
    }

    function showError(message) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

})();
