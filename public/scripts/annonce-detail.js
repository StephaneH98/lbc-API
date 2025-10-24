/* ==========================================
   PAGE DÉTAIL D'UNE ANNONCE
   ========================================== */

(function() {
    'use strict';

    let annonceData = null;
    let allAnnonces = [];
    let priceStats = null;
    let currentFilename = '';
    let currentAnnonceId = '';

    /* ==========================================
       INITIALISATION
       ========================================== */

    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 Initialisation de la page détail annonce');

        // Récupérer les paramètres de l'URL
        const urlParams = new URLSearchParams(window.location.search);
        currentFilename = urlParams.get('file');
        currentAnnonceId = urlParams.get('id');

        if (!currentAnnonceId) {
            showError('ID de l\'annonce manquant. Impossible de charger l\'annonce.');
            return;
        }

        // Vérifier si on a un fichier OU des données temporaires en sessionStorage
        if (!currentFilename || currentFilename === '') {
            console.log('📋 Pas de fichier spécifié, tentative de chargement depuis sessionStorage');
            loadAnnonceFromSessionStorage(currentAnnonceId);
        } else {
            // Charger les données depuis le fichier
            loadAnnonceData(currentFilename, currentAnnonceId);
        }

        // Événement bouton retour
        document.getElementById('backBtn').addEventListener('click', function() {
            window.history.back();
        });
    });

    /* ==========================================
       CHARGEMENT DES DONNÉES
       ========================================== */

    function loadAnnonceFromSessionStorage(annonceId) {
        console.log('🔍 Recherche de l\'annonce dans sessionStorage...');

        try {
            // Essayer de récupérer les annonces temporaires
            const tempAnnoncesStr = sessionStorage.getItem('tempAnnonces');
            if (!tempAnnoncesStr) {
                showError('Aucune donnée temporaire trouvée. Veuillez d\'abord effectuer une recherche ou sélectionner un fichier.');
                return;
            }

            const tempAnnonces = JSON.parse(tempAnnoncesStr);
            console.log(`📦 ${tempAnnonces.length} annonces trouvées dans sessionStorage`);

            // Chercher l'annonce par ID
            const annonce = tempAnnonces.find(a => String(a.id) === String(annonceId));

            if (!annonce) {
                showError(`Annonce #${annonceId} introuvable dans les données temporaires.`);
                return;
            }

            console.log('✅ Annonce trouvée:', annonce);

            // Charger aussi les annonces de location si disponibles
            const tempLocationStr = sessionStorage.getItem('tempLocationAnnonces');
            let locationAnnonces = [];
            if (tempLocationStr) {
                locationAnnonces = JSON.parse(tempLocationStr);
                console.log(`📍 ${locationAnnonces.length} annonces de location trouvées`);
            }

            // Afficher l'annonce
            displayAnnonce(annonce, locationAnnonces);

        } catch (error) {
            console.error('❌ Erreur lors du chargement depuis sessionStorage:', error);
            showError('Erreur lors du chargement des données temporaires: ' + error.message);
        }
    }

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

            // Séparer les annonces de vente et de location
            const venteAnnonces = innerData.vente || [];
            const locationAnnonces = innerData.location || [];

            // Stocker les annonces de vente séparément pour les stats
            window.venteAnnonces = venteAnnonces;
            window.locationAnnonces = locationAnnonces;

            // Combiner toutes les annonces pour la recherche de l'annonce actuelle
            allAnnonces = [...venteAnnonces, ...locationAnnonces];

            console.log(`📊 Total annonces chargées: ${allAnnonces.length}`);
            console.log(`   💰 Annonces de vente: ${venteAnnonces.length}`);
            console.log(`   🏠 Annonces de location: ${locationAnnonces.length}`);
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

            // Calculer les statistiques de location
            calculateRentalStats();

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

        // IMPORTANT : Utiliser uniquement les annonces de vente pour les statistiques de prix
        const annoncesVente = window.venteAnnonces || [];

        console.log(`📊 Calcul des stats sur ${annoncesVente.length} annonces de VENTE uniquement`);

        annoncesVente.forEach((annonce, index) => {
            // Extraire le prix - nettoyer tous les caractères non numériques
            const prixStr = (annonce.prix || annonce.price || '').toString().replace(/\s/g, '');
            const price = parseFloat(prixStr.replace(/[^\d]/g, ''));

            if (price && price > 0 && !isNaN(price)) {
                prices.push(price);

                // Calculer prix au m²
                let priceM2 = 0;

                // D'abord essayer prix_m2 direct
                const prixM2Str = (annonce.prix_m2 || '').toString().replace(/\s/g, '');
                priceM2 = parseFloat(prixM2Str.replace(/[^\d]/g, ''));

                // Si pas de prix_m2 ou invalide, calculer à partir de la surface
                if (!priceM2 || priceM2 === 0 || isNaN(priceM2)) {
                    const surfaceStr = (annonce.surface_m2 || annonce.surface || '').toString().replace(/\s/g, '');
                    const surface = parseFloat(surfaceStr.replace(/[^\d.]/g, ''));

                    if (surface && surface > 0 && !isNaN(surface)) {
                        priceM2 = Math.round(price / surface);
                    }
                }

                if (priceM2 && priceM2 > 0 && !isNaN(priceM2)) {
                    pricesPerM2.push(priceM2);
                }
            }
        });

        console.log(`💰 Prix collectés: ${prices.length} prix de vente`);
        console.log(`📏 Prix/m² collectés: ${pricesPerM2.length} prix au m²`);

        if (prices.length > 0) {
            console.log(`💰 Prix min: ${Math.min(...prices)}, max: ${Math.max(...prices)}`);
        }

        if (pricesPerM2.length > 0) {
            console.log(`📏 Prix/m² min: ${Math.min(...pricesPerM2)}, max: ${Math.max(...pricesPerM2)}`);
        }

        priceStats = {
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
            avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
            minPriceM2: pricesPerM2.length > 0 ? Math.min(...pricesPerM2) : 0,
            maxPriceM2: pricesPerM2.length > 0 ? Math.max(...pricesPerM2) : 0,
            avgPriceM2: pricesPerM2.length > 0 ? Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length) : 0
        };

        console.log('📊 Statistiques finales:', priceStats);
    }

    /* ==========================================
       CALCUL DES STATISTIQUES DE LOCATION
       ========================================== */

    let rentalStats = {
        meuble: { min: 0, max: 0, avg: 0, count: 0 },
        nonMeuble: { min: 0, max: 0, avg: 0, count: 0 }
    };

    function calculateRentalStats() {
        const rentsMeuble = [];
        const rentsNonMeuble = [];

        // Utiliser les annonces de location
        const annoncesLocation = window.locationAnnonces || [];

        console.log(`🏠 Calcul des stats de location sur ${annoncesLocation.length} annonces`);

        annoncesLocation.forEach((annonce) => {
            // Extraire le loyer
            const loyerStr = (annonce.loyer || annonce.rent || annonce.prix || annonce.price || '').toString().replace(/\s/g, '');
            const loyer = parseFloat(loyerStr.replace(/[^\d]/g, ''));

            if (loyer && loyer > 0 && !isNaN(loyer)) {
                // Déterminer si c'est meublé ou non
                const type = annonce.type || '';
                const isMeuble = type === 'location_meublee' ||
                                annonce.furnished === true ||
                                annonce.furnished === 'true' ||
                                annonce.meuble === true;

                if (isMeuble) {
                    rentsMeuble.push(loyer);
                } else {
                    rentsNonMeuble.push(loyer);
                }
            }
        });

        console.log(`🏠 Loyers meublés collectés: ${rentsMeuble.length}`);
        console.log(`🏠 Loyers non meublés collectés: ${rentsNonMeuble.length}`);

        // Calculer les stats pour meublé
        if (rentsMeuble.length > 0) {
            rentalStats.meuble = {
                min: Math.min(...rentsMeuble),
                max: Math.max(...rentsMeuble),
                avg: Math.round(rentsMeuble.reduce((a, b) => a + b, 0) / rentsMeuble.length),
                count: rentsMeuble.length
            };
            console.log(`💰 Meublé - Min: ${rentalStats.meuble.min}, Max: ${rentalStats.meuble.max}, Moyen: ${rentalStats.meuble.avg}`);
        }

        // Calculer les stats pour non meublé
        if (rentsNonMeuble.length > 0) {
            rentalStats.nonMeuble = {
                min: Math.min(...rentsNonMeuble),
                max: Math.max(...rentsNonMeuble),
                avg: Math.round(rentsNonMeuble.reduce((a, b) => a + b, 0) / rentsNonMeuble.length),
                count: rentsNonMeuble.length
            };
            console.log(`💰 Non meublé - Min: ${rentalStats.nonMeuble.min}, Max: ${rentalStats.nonMeuble.max}, Moyen: ${rentalStats.nonMeuble.avg}`);
        }

        console.log('📊 Statistiques de location finales:', rentalStats);
    }

    /* ==========================================
       AFFICHAGE DE L'ANNONCE
       ========================================== */

    function displayAnnonce(annonce, locationAnnonces = []) {
        // Si annonce est fournie en paramètre, l'utiliser, sinon utiliser annonceData globale
        if (annonce) {
            annonceData = annonce;
        }

        // Vérifier que annonceData est définie
        if (!annonceData) {
            showError('Aucune donnée d\'annonce à afficher');
            return;
        }

        // Si locationAnnonces est fourni, le stocker globalement
        if (locationAnnonces && locationAnnonces.length > 0) {
            window.locationAnnonces = locationAnnonces;
            // Recalculer les statistiques de location avec les nouvelles données
            calculateRentalStats();
        }

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

        // Quartier
        const quartier = annonceData.quartier || '-';
        document.getElementById('annonce-quartier').textContent = quartier;

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

        // Calculateur de prêt immobilier
        initLoanCalculator(prix);

        // Rentabilité locative
        initRentalProfitability();

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
       CALCULATEUR DE PRÊT IMMOBILIER
       ========================================== */

    function initLoanCalculator(propertyPrice) {
        if (!propertyPrice || propertyPrice <= 0) {
            console.log('⚠️ Prix du bien invalide, calculateur désactivé');
            return;
        }

        console.log(`💰 Initialisation du calculateur de prêt avec prix: ${formatPrice(propertyPrice)}`);

        // Éléments du DOM
        const loanDurationInput = document.getElementById('loan-duration');
        const loanRateInput = document.getElementById('loan-rate');
        const loanApportInput = document.getElementById('loan-apport');
        const loanWorksAmountInput = document.getElementById('loan-works-amount');

        const loanPropertyPriceDisplay = document.getElementById('loan-property-price');
        const loanNotaryFeesDisplay = document.getElementById('loan-notary-fees');
        const loanWorksCostDisplay = document.getElementById('loan-works-cost');
        const loanTotalCostDisplay = document.getElementById('loan-total-cost');

        const loanMonthlyPaymentDisplay = document.getElementById('loan-monthly-payment');
        const loanTotalInterestDisplay = document.getElementById('loan-total-interest');
        const loanTotalRepaymentDisplay = document.getElementById('loan-total-repayment');

        // Variable globale pour stocker le coût d'ameublement actuel
        window.currentFurnitureCost = 0;

        // Fonction de calcul du prêt
        function calculateLoan() {
            // Récupérer les valeurs
            const durationYears = parseFloat(loanDurationInput.value) || 25;
            const annualRate = parseFloat(loanRateInput.value) || 3.5;
            const apport = parseFloat(loanApportInput.value) || 0;
            const worksAmount = parseFloat(loanWorksAmountInput.value) || 0;
            const furnitureCost = window.currentFurnitureCost || 0;

            console.log(`🔢 Calcul avec: ${durationYears} ans, ${annualRate}% taux, ${formatPrice(apport)} apport, ${formatPrice(worksAmount)} travaux, ${formatPrice(furnitureCost)} ameublement`);

            // Calcul des frais de notaire (fixés à 8%)
            const notaryFees = Math.round(propertyPrice * 0.08);
            const totalCost = propertyPrice + notaryFees + worksAmount + furnitureCost;

            // Montant du prêt après déduction de l'apport
            const loanAmount = totalCost - apport;

            // Afficher le résumé des coûts
            loanPropertyPriceDisplay.textContent = formatPrice(propertyPrice);
            loanNotaryFeesDisplay.textContent = formatPrice(notaryFees);
            loanWorksCostDisplay.textContent = formatPrice(worksAmount);

            // Afficher le coût d'ameublement
            const loanFurnitureCostElement = document.getElementById('loan-furniture-cost');
            if (loanFurnitureCostElement) {
                loanFurnitureCostElement.textContent = formatPrice(furnitureCost);
            }

            // Afficher le sous-total
            const loanSubtotalElement = document.getElementById('loan-subtotal');
            if (loanSubtotalElement) {
                loanSubtotalElement.textContent = formatPrice(totalCost);
            }

            // Afficher l'apport
            const loanApportDisplayElement = document.getElementById('loan-apport-display');
            if (loanApportDisplayElement) {
                loanApportDisplayElement.textContent = formatPrice(apport);
            }

            // Afficher le montant à emprunter (totalCost - apport)
            loanTotalCostDisplay.textContent = formatPrice(loanAmount);

            // Calcul de la mensualité avec la formule d'amortissement
            // M = P * (r(1+r)^n) / ((1+r)^n - 1)
            // où P = principal, r = taux mensuel, n = nombre de mois

            const monthlyRate = (annualRate / 100) / 12; // Taux mensuel
            const numberOfMonths = durationYears * 12; // Nombre de mensualités

            let monthlyPayment;
            if (loanAmount <= 0) {
                // Si l'apport couvre tout, pas de prêt nécessaire
                monthlyPayment = 0;
            } else if (monthlyRate === 0) {
                // Si taux = 0%, calcul simple
                monthlyPayment = loanAmount / numberOfMonths;
            } else {
                // Formule d'amortissement classique
                const factor = Math.pow(1 + monthlyRate, numberOfMonths);
                monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
            }

            // Calcul du coût total du crédit et du total à rembourser
            const totalRepayment = monthlyPayment * numberOfMonths;
            const totalInterest = totalRepayment - loanAmount;

            // Afficher les résultats
            loanMonthlyPaymentDisplay.textContent = formatPrice(monthlyPayment);
            loanTotalInterestDisplay.textContent = formatPrice(totalInterest);
            loanTotalRepaymentDisplay.textContent = formatPrice(totalRepayment);

            console.log(`✅ Mensualité: ${formatPrice(monthlyPayment)}`);
            console.log(`   Montant emprunté: ${formatPrice(loanAmount)}`);
            console.log(`   Coût du crédit: ${formatPrice(totalInterest)}`);
            console.log(`   Total à rembourser: ${formatPrice(totalRepayment)}`);

            // Mettre à jour la rentabilité si la fonction est disponible
            if (typeof window.calculateProfitability === 'function') {
                window.calculateProfitability();
            }
        }

        // Exposer calculateLoan globalement pour pouvoir l'appeler depuis calculateFurnitureCost
        window.calculateLoan = calculateLoan;

        // Ajouter les event listeners pour le recalcul en temps réel
        loanDurationInput.addEventListener('input', calculateLoan);
        loanRateInput.addEventListener('input', calculateLoan);
        loanApportInput.addEventListener('input', calculateLoan);
        loanWorksAmountInput.addEventListener('input', calculateLoan);

        // Gérer les boutons de preset pour les travaux
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const amount = parseFloat(this.getAttribute('data-amount')) || 0;
                loanWorksAmountInput.value = amount;
                calculateLoan();
            });
        });

        // Gérer le changement de mode (global / détaillé)
        const modeButtons = document.querySelectorAll('.mode-btn');
        const globalModeContent = document.getElementById('works-global-mode');
        const detailedModeContent = document.getElementById('works-detailed-mode');

        modeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const mode = this.getAttribute('data-mode');

                // Mettre à jour les boutons actifs
                modeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Afficher le bon contenu
                if (mode === 'global') {
                    globalModeContent.classList.add('active');
                    detailedModeContent.classList.remove('active');
                } else {
                    globalModeContent.classList.remove('active');
                    detailedModeContent.classList.add('active');
                    // Recalculer le total des catégories
                    updateDetailedTotal();
                }
            });
        });

        // Gestion du mode détaillé avec tableau
        const workTypeSelect = document.getElementById('work-type-select');
        const workAmountInput = document.getElementById('work-amount-input');
        const addWorkBtn = document.getElementById('add-work-btn');
        const worksTableBody = document.getElementById('works-table-body');
        const detailedTotalDisplay = document.getElementById('works-detailed-total');

        // Tableau pour stocker les travaux
        let worksArray = [];

        // Mapping des types de travaux avec leurs icônes et labels
        const workTypesMap = {
            'peinture': { icon: '🎨', label: 'Peinture' },
            'electricite': { icon: '⚡', label: 'Électricité' },
            'plomberie': { icon: '🚰', label: 'Plomberie' },
            'menuiserie': { icon: '🏠', label: 'Menuiserie' },
            'chauffage': { icon: '🔥', label: 'Chauffage' },
            'salle-de-bain': { icon: '🛁', label: 'Salle de bain' },
            'cuisine': { icon: '🍳', label: 'Cuisine' },
            'gros-oeuvre': { icon: '🏗️', label: 'Gros œuvre' },
            'isolation': { icon: '🌡️', label: 'Isolation' },
            'fenetres': { icon: '🪟', label: 'Fenêtres' },
            'toiture': { icon: '🏡', label: 'Toiture' },
            'autres': { icon: '🔧', label: 'Autres travaux' }
        };

        // Fonction pour ajouter un travail
        function addWork() {
            const workType = workTypeSelect.value;
            const amount = parseFloat(workAmountInput.value);

            // Validation
            if (!workType) {
                alert('Veuillez sélectionner un type de travaux');
                return;
            }

            if (!amount || amount <= 0) {
                alert('Veuillez saisir un montant valide');
                return;
            }

            // Ajouter au tableau
            const work = {
                id: Date.now(), // ID unique
                type: workType,
                amount: amount
            };

            worksArray.push(work);

            // Réinitialiser le formulaire
            workTypeSelect.value = '';
            workAmountInput.value = '';

            // Rafraîchir l'affichage
            renderWorksTable();
            updateDetailedTotal();
        }

        // Fonction pour supprimer un travail
        function deleteWork(id) {
            worksArray = worksArray.filter(work => work.id !== id);
            renderWorksTable();
            updateDetailedTotal();
        }

        // Fonction pour afficher le tableau
        function renderWorksTable() {
            // Vider le tableau
            worksTableBody.innerHTML = '';

            if (worksArray.length === 0) {
                // Afficher l'état vide
                worksTableBody.innerHTML = `
                    <tr class="empty-state">
                        <td colspan="4" style="text-align: center; color: #999; padding: 2rem;">
                            Aucun travaux ajouté. Utilisez le formulaire ci-dessus pour ajouter des travaux.
                        </td>
                    </tr>
                `;
                return;
            }

            // Afficher les travaux
            worksArray.forEach(work => {
                const workInfo = workTypesMap[work.type];
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="work-icon-cell">${workInfo.icon}</td>
                    <td class="work-type-cell">${workInfo.label}</td>
                    <td class="work-amount-cell">${formatPrice(work.amount)}</td>
                    <td class="work-actions-cell">
                        <button class="delete-work-btn" onclick="window.deleteWork(${work.id})">
                            🗑️
                        </button>
                    </td>
                `;
                worksTableBody.appendChild(row);
            });
        }

        // Fonction pour calculer le total
        function updateDetailedTotal() {
            let total = 0;
            worksArray.forEach(work => {
                total += work.amount;
            });

            // Mettre à jour l'affichage du total détaillé
            detailedTotalDisplay.textContent = formatPrice(total);

            // Mettre à jour le champ global avec le total calculé
            loanWorksAmountInput.value = total;

            // Recalculer le prêt
            calculateLoan();
        }

        // Exposer la fonction deleteWork globalement pour les boutons
        window.deleteWork = deleteWork;

        // Event listener pour le bouton ajouter
        addWorkBtn.addEventListener('click', addWork);

        // Event listener pour la touche Entrée dans les champs
        workAmountInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addWork();
            }
        });

        // ===== SAUVEGARDE ET CHARGEMENT DES DONNÉES =====

        // Fonction pour sauvegarder les données du calculateur
        async function saveLoanData() {
            const saveBtnElement = document.getElementById('save-loan-data-btn');
            const saveStatusElement = document.getElementById('save-status');

            try {
                saveBtnElement.disabled = true;
                saveStatusElement.textContent = 'Enregistrement...';
                saveStatusElement.className = 'save-status loading';

                // Récupérer l'utilisateur
                const username = CONFIG.getCurrentUser();
                if (!username) {
                    throw new Error('Utilisateur non authentifié');
                }

                // Récupérer la qualité des meubles sélectionnée
                const furnitureQualityRadio = document.querySelector('input[name="furniture-quality"]:checked');
                const furnitureQuality = furnitureQualityRadio ? parseFloat(furnitureQualityRadio.value) : 0;

                // Préparer les données à sauvegarder
                const loanData = {
                    annonceId: currentAnnonceId,
                    duration: parseFloat(loanDurationInput.value) || 25,
                    rate: parseFloat(loanRateInput.value) || 3.5,
                    apport: parseFloat(loanApportInput.value) || 0,
                    worksAmount: parseFloat(loanWorksAmountInput.value) || 0,
                    worksArray: worksArray,
                    furnitureQuality: furnitureQuality,
                    savedAt: new Date().toISOString()
                };

                console.log('💾 Sauvegarde des données du prêt:', loanData);

                // Charger le fichier JSON actuel
                const apiUrl = CONFIG.getApiUrl('GET_USER_SEARCHES') +
                    '?username=' + encodeURIComponent(username) +
                    '&filename=' + encodeURIComponent(currentFilename);

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
                    throw new Error(`Erreur lors du chargement du fichier: ${response.status}`);
                }

                const responseData = await response.json();
                const outerData = responseData.data || responseData;
                const innerData = outerData.data || outerData;

                // Trouver l'annonce et ajouter les données du prêt
                const venteAnnonces = innerData.vente || [];
                const locationAnnonces = innerData.location || [];
                const allAnnoncesList = [...venteAnnonces, ...locationAnnonces];

                // Trouver l'annonce correspondante
                let foundAnnonce = allAnnoncesList.find(a => a.id.toString() === currentAnnonceId);
                if (!foundAnnonce) {
                    const index = parseInt(currentAnnonceId) - 1;
                    if (index >= 0 && index < allAnnoncesList.length) {
                        foundAnnonce = allAnnoncesList[index];
                    }
                }

                if (foundAnnonce) {
                    // Ajouter les données du calculateur à l'annonce
                    foundAnnonce.loanCalculatorData = loanData;
                    console.log('✅ Données du prêt ajoutées à l\'annonce');
                }

                // Sauvegarder le fichier JSON modifié via l'API SAVE_SEARCH
                const saveApiUrl = CONFIG.getApiUrl('SAVE_SEARCH');

                const saveResponse = await fetch(saveApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': authToken ? `Bearer ${authToken}` : ''
                    },
                    body: JSON.stringify({
                        username: username,
                        filename: currentFilename,
                        data: innerData
                    })
                });

                if (!saveResponse.ok) {
                    throw new Error(`Erreur lors de la sauvegarde: ${saveResponse.status}`);
                }

                const saveResult = await saveResponse.json();
                console.log('✅ Données sauvegardées avec succès:', saveResult);

                saveStatusElement.textContent = '✓ Enregistré avec succès';
                saveStatusElement.className = 'save-status success';

                setTimeout(() => {
                    saveStatusElement.textContent = '';
                    saveStatusElement.className = 'save-status';
                }, 3000);

            } catch (error) {
                console.error('❌ Erreur lors de la sauvegarde:', error);
                saveStatusElement.textContent = '✗ Erreur lors de l\'enregistrement';
                saveStatusElement.className = 'save-status error';

                setTimeout(() => {
                    saveStatusElement.textContent = '';
                    saveStatusElement.className = 'save-status';
                }, 5000);
            } finally {
                saveBtnElement.disabled = false;
            }
        }

        // Fonction pour charger les données sauvegardées
        function loadSavedLoanData() {
            if (!annonceData || !annonceData.loanCalculatorData) {
                console.log('ℹ️ Aucune donnée de prêt sauvegardée pour cette annonce');
                return;
            }

            const savedData = annonceData.loanCalculatorData;
            console.log('📥 Chargement des données sauvegardées:', savedData);

            // Restaurer les paramètres du prêt
            if (savedData.duration) loanDurationInput.value = savedData.duration;
            if (savedData.rate) loanRateInput.value = savedData.rate;
            if (savedData.apport !== undefined) loanApportInput.value = savedData.apport;

            // Restaurer les travaux
            if (savedData.worksArray && savedData.worksArray.length > 0) {
                worksArray = savedData.worksArray;
                renderWorksTable();
                updateDetailedTotal();
            } else if (savedData.worksAmount) {
                loanWorksAmountInput.value = savedData.worksAmount;
            }

            // Restaurer la qualité des meubles
            if (savedData.furnitureQuality !== undefined) {
                const furnitureRadio = document.querySelector(`input[name="furniture-quality"][value="${savedData.furnitureQuality}"]`);
                if (furnitureRadio) {
                    furnitureRadio.checked = true;
                    // Déclencher l'événement change pour mettre à jour le coût
                    furnitureRadio.dispatchEvent(new Event('change'));
                }
                console.log(`🛋️ Qualité des meubles restaurée: ${savedData.furnitureQuality} €/m²`);
            }

            // Recalculer
            calculateLoan();

            console.log('✅ Données du prêt restaurées');
        }

        // Event listener pour le bouton de sauvegarde
        const saveLoanDataBtn = document.getElementById('save-loan-data-btn');
        if (saveLoanDataBtn) {
            saveLoanDataBtn.addEventListener('click', saveLoanData);
        }

        // Charger les données sauvegardées au démarrage
        loadSavedLoanData();

        // Calcul initial avec les valeurs par défaut
        calculateLoan();
    }

    /* ==========================================
       INITIALISATION RENTABILITÉ LOCATIVE
       ========================================== */

    function initRentalProfitability() {
        console.log('🏠 Initialisation de la rentabilité locative');

        // Afficher les statistiques de loyers
        displayRentalStats();

        // Récupérer la surface du bien
        const surfaceStr = (annonceData.surface_m2 || annonceData.surface || '').toString().replace(/\s/g, '');
        const surface = parseFloat(surfaceStr.replace(/[^\d.]/g, ''));

        if (!surface || surface <= 0) {
            console.log('⚠️ Surface du bien non disponible, désactivation de l\'ameublement');
            document.querySelector('.furniture-quality-section').style.display = 'none';
            return;
        }

        document.getElementById('furniture-surface').textContent = `${surface} m²`;

        // Variables globales pour le calcul
        let furnitureCostPerM2 = 0;
        let currentMonthlyPayment = 0;

        // Fonction pour calculer le coût d'ameublement
        function calculateFurnitureCost() {
            const furnitureCost = Math.round(surface * furnitureCostPerM2);

            // Stocker dans la variable globale
            window.currentFurnitureCost = furnitureCost;

            // Mettre à jour le coût d'ameublement dans la section ameublement
            document.getElementById('furniture-total-cost').textContent = formatPrice(furnitureCost);

            // Déclencher le recalcul du prêt (qui inclura le coût d'ameublement)
            // Cela mettra à jour automatiquement le résumé du prêt ET la rentabilité
            if (typeof calculateLoan === 'function') {
                calculateLoan();
            }

            return { furnitureCost };
        }

        // Fonction pour calculer la rentabilité
        function calculateProfitability() {
            // Récupérer le loyer depuis le champ de saisie (ou slider si pas rempli)
            const rentInput = document.getElementById('rent-input');
            const rentSlider = document.getElementById('rent-slider');
            const selectedRent = parseFloat(rentInput?.value || rentSlider?.value || 0);

            console.log(`💰 Loyer sélectionné: ${selectedRent}`);

            if (!selectedRent || selectedRent === 0) {
                document.getElementById('selected-rent').textContent = 'Non disponible';
                document.getElementById('annual-rent-income').textContent = '-';
                document.getElementById('gross-yield').textContent = '-';
                document.getElementById('monthly-cashflow').textContent = '-';
                return;
            }

            // Afficher le loyer sélectionné
            document.getElementById('selected-rent').textContent = formatPrice(selectedRent) + ' / mois';

            // Revenus annuels
            const annualIncome = selectedRent * 12;
            document.getElementById('annual-rent-income').textContent = formatPrice(annualIncome);

            // Récupérer le coût total d'acquisition (sous-total = prix + notaire + travaux + meubles)
            const subtotalText = document.getElementById('loan-subtotal').textContent;
            const totalCost = parseFloat(subtotalText.replace(/[^\d]/g, '')) || 0;

            if (totalCost === 0) {
                console.log('⚠️ Coût total non disponible');
                return;
            }

            // Rendement brut
            const grossYield = (annualIncome * 100) / totalCost;
            document.getElementById('gross-yield').textContent = grossYield.toFixed(2) + ' %';

            // Cash-flow mensuel
            const annualCharges = parseFloat(document.getElementById('annual-charges').value) || 0;
            const monthlyCharges = annualCharges / 12;

            // Récupérer la mensualité du prêt
            const monthlyPaymentText = document.getElementById('loan-monthly-payment').textContent;
            currentMonthlyPayment = parseFloat(monthlyPaymentText.replace(/[^\d]/g, '')) || 0;

            const monthlyCashflow = selectedRent - currentMonthlyPayment - monthlyCharges;
            const cashflowElement = document.getElementById('monthly-cashflow');
            cashflowElement.textContent = formatPrice(monthlyCashflow) + ' / mois';

            // Colorer le cash-flow en fonction du résultat
            if (monthlyCashflow > 0) {
                cashflowElement.style.color = '#2ecc71';
            } else if (monthlyCashflow < 0) {
                cashflowElement.style.color = '#e74c3c';
            } else {
                cashflowElement.style.color = '#95a5a6';
            }

            console.log(`💰 Rentabilité calculée: ${grossYield.toFixed(2)}%, Cash-flow: ${formatPrice(monthlyCashflow)}`);
        }

        // Exposer calculateProfitability globalement pour pouvoir l'appeler depuis calculateLoan
        window.calculateProfitability = calculateProfitability;

        // Event listeners pour les boutons radio de qualité d'ameublement
        const furnitureRadios = document.querySelectorAll('input[name="furniture-quality"]');
        furnitureRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                furnitureCostPerM2 = parseFloat(this.value);
                console.log(`🛋️ Qualité d'ameublement sélectionnée: ${furnitureCostPerM2} €/m²`);
                calculateFurnitureCost();
            });
        });

        // Fonction pour mettre à jour le slider en fonction du toggle
        function updateRentSlider() {
            const toggle = document.getElementById('rental-type-toggle');
            const slider = document.getElementById('rent-slider');
            const isMeuble = toggle.checked;

            let minRent, maxRent, avgRent;

            if (isMeuble) {
                minRent = rentalStats.meuble.min || 0;
                maxRent = rentalStats.meuble.max || 1000;
                avgRent = rentalStats.meuble.avg || 500;
            } else {
                minRent = rentalStats.nonMeuble.min || 0;
                maxRent = rentalStats.nonMeuble.max || 1000;
                avgRent = rentalStats.nonMeuble.avg || 500;
            }

            // Mettre à jour les bornes du slider
            slider.min = minRent;
            slider.max = maxRent;
            slider.value = avgRent;

            // Mettre à jour le champ de saisie
            const rentInput = document.getElementById('rent-input');
            if (rentInput) {
                rentInput.min = minRent;
                rentInput.max = maxRent;
                rentInput.value = avgRent;
            }

            // Afficher les bornes
            document.getElementById('rent-min-display').textContent = formatPrice(minRent);
            document.getElementById('rent-max-display').textContent = formatPrice(maxRent);

            console.log(`🔄 Slider mis à jour: min=${minRent}, max=${maxRent}, valeur=${avgRent}, meublé=${isMeuble}`);

            // Recalculer la rentabilité
            calculateProfitability();
        }

        // Fonction pour mettre à jour le slider depuis le champ de saisie
        function updateFromInput() {
            const rentInput = document.getElementById('rent-input');
            const slider = document.getElementById('rent-slider');
            const value = parseFloat(rentInput.value) || 0;

            // Mettre à jour le slider
            slider.value = value;

            console.log(`✏️ Loyer saisi manuellement: ${value}`);

            // Recalculer la rentabilité
            calculateProfitability();
        }

        // Fonction pour mettre à jour le champ de saisie depuis le slider
        function updateFromSlider() {
            const slider = document.getElementById('rent-slider');
            const rentInput = document.getElementById('rent-input');
            const value = parseFloat(slider.value);

            // Mettre à jour le champ de saisie
            if (rentInput) {
                rentInput.value = value;
            }

            console.log(`🎚️ Loyer depuis slider: ${value}`);

            // Recalculer la rentabilité
            calculateProfitability();
        }

        // Event listener pour le toggle meublé/non meublé
        const rentalTypeToggle = document.getElementById('rental-type-toggle');
        if (rentalTypeToggle) {
            rentalTypeToggle.addEventListener('change', updateRentSlider);
        }

        // Event listener pour le slider de loyer
        const rentSlider = document.getElementById('rent-slider');
        if (rentSlider) {
            rentSlider.addEventListener('input', updateFromSlider);
        }

        // Event listener pour le champ de saisie du loyer
        const rentInput = document.getElementById('rent-input');
        if (rentInput) {
            rentInput.addEventListener('input', updateFromInput);
        }

        // Event listener pour les charges annuelles
        const annualChargesInput = document.getElementById('annual-charges');
        annualChargesInput.addEventListener('input', calculateProfitability);

        // Initialiser le slider avec les valeurs non meublé
        updateRentSlider();

        // Calcul initial
        calculateFurnitureCost();
    }

    /* ==========================================
       AFFICHAGE DES STATISTIQUES DE LOYERS
       ========================================== */

    function displayRentalStats() {
        // Meublé
        if (rentalStats.meuble.count > 0) {
            document.getElementById('rental-meuble-min').textContent = formatPrice(rentalStats.meuble.min);
            document.getElementById('rental-meuble-avg').textContent = formatPrice(rentalStats.meuble.avg);
            document.getElementById('rental-meuble-max').textContent = formatPrice(rentalStats.meuble.max);
        } else {
            document.getElementById('rental-meuble-min').textContent = 'N/A';
            document.getElementById('rental-meuble-avg').textContent = 'N/A';
            document.getElementById('rental-meuble-max').textContent = 'N/A';
        }

        // Non meublé
        if (rentalStats.nonMeuble.count > 0) {
            document.getElementById('rental-non-meuble-min').textContent = formatPrice(rentalStats.nonMeuble.min);
            document.getElementById('rental-non-meuble-avg').textContent = formatPrice(rentalStats.nonMeuble.avg);
            document.getElementById('rental-non-meuble-max').textContent = formatPrice(rentalStats.nonMeuble.max);
        } else {
            document.getElementById('rental-non-meuble-min').textContent = 'N/A';
            document.getElementById('rental-non-meuble-avg').textContent = 'N/A';
            document.getElementById('rental-non-meuble-max').textContent = 'N/A';
        }

        console.log('✅ Statistiques de loyers affichées');
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

    /* ==========================================
       GESTION DE LA POPUP PDF
       ========================================== */

    function initPdfPopup() {
        const generatePdfBtn = document.getElementById('generate-pdf-btn');
        const pdfPopup = document.getElementById('pdf-popup');
        const closePdfPopupBtn = document.getElementById('close-pdf-popup');
        const downloadPdfBtn = document.getElementById('download-pdf-btn');

        // Ouvrir la popup
        generatePdfBtn.addEventListener('click', function() {
            pdfPopup.style.display = 'flex';
            console.log('📄 Popup PDF ouverte');
        });

        // Fermer la popup
        function closePopup() {
            pdfPopup.style.display = 'none';
            console.log('✖️ Popup PDF fermée');
        }

        closePdfPopupBtn.addEventListener('click', closePopup);

        // Fermer la popup si on clique en dehors
        pdfPopup.addEventListener('click', function(event) {
            if (event.target === pdfPopup) {
                closePopup();
            }
        });

        // Gérer les clics sur les labels pour cocher/décocher
        const sectionItems = document.querySelectorAll('.pdf-section-item');
        sectionItems.forEach(item => {
            item.addEventListener('click', function(event) {
                // Si on clique sur le label, ne pas propager l'événement
                if (event.target.tagName === 'LABEL' || event.target.classList.contains('section-label')) {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                    event.preventDefault();
                }
            });
        });

        // Télécharger le PDF
        downloadPdfBtn.addEventListener('click', async function() {
            console.log('📥 Génération du PDF...');

            // Récupérer les sections sélectionnées
            const selectedSections = [];
            const checkboxes = document.querySelectorAll('input[name="pdf-section"]:checked');
            checkboxes.forEach(cb => selectedSections.push(cb.value));

            const includeLink = document.getElementById('pdf-include-link').checked;

            console.log('📋 Sections sélectionnées:', selectedSections);
            console.log('🔗 Inclure le lien:', includeLink);

            if (selectedSections.length === 0) {
                alert('Veuillez sélectionner au moins une section à inclure dans le PDF');
                return;
            }

            // Désactiver le bouton pendant la génération
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.textContent = '⏳ Génération en cours...';

            try {
                await generatePDF(selectedSections, includeLink);
                console.log('✅ PDF généré avec succès');
                closePopup();
            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF:', error);
                alert('Erreur lors de la génération du PDF: ' + error.message);
            } finally {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.textContent = '📥 Télécharger le PDF';
            }
        });
    }

    /* ==========================================
       GÉNÉRATION DU PDF
       ========================================== */

    async function generatePDF(selectedSections, includeLink) {
        // Pour la génération du PDF, nous allons utiliser jsPDF avec html2canvas
        // Ces bibliothèques devront être incluses dans le HTML

        // Vérifier si jsPDF est disponible
        if (typeof window.jspdf === 'undefined') {
            throw new Error('La bibliothèque jsPDF n\'est pas chargée. Veuillez inclure jsPDF dans votre page.');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        let yPosition = 20;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);

        // Helper pour ajouter une nouvelle page si nécessaire
        function checkNewPage(heightNeeded = 20) {
            if (yPosition + heightNeeded > pageHeight - margin) {
                pdf.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        }

        // Helper pour ajouter du texte avec retour à la ligne automatique
        function addText(text, fontSize = 10, isBold = false) {
            pdf.setFontSize(fontSize);
            if (isBold) {
                pdf.setFont(undefined, 'bold');
            } else {
                pdf.setFont(undefined, 'normal');
            }

            const lines = pdf.splitTextToSize(text, contentWidth);
            const lineHeight = fontSize * 0.5;

            lines.forEach(line => {
                checkNewPage(lineHeight);
                pdf.text(line, margin, yPosition);
                yPosition += lineHeight;
            });
            yPosition += 2;
        }

        // Titre principal
        pdf.setFillColor(255, 215, 0);
        pdf.rect(0, 0, pageWidth, 40, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        const title = document.getElementById('annonce-title').textContent;
        pdf.text(title, margin, 15);

        const price = document.getElementById('annonce-price').textContent;
        pdf.setFontSize(18);
        pdf.text(price, margin, 25);

        const priceM2 = document.getElementById('annonce-price-m2').textContent;
        pdf.setFontSize(12);
        pdf.text(priceM2, margin, 32);

        yPosition = 50;
        pdf.setTextColor(0, 0, 0);

        // Inclure les sections sélectionnées
        for (const section of selectedSections) {
            switch (section) {
                case 'header':
                    // Déjà inclus dans le titre
                    break;

                case 'main-info':
                    checkNewPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Informations principales', margin, yPosition);
                    yPosition += 8;

                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'normal');

                    const localisation = document.getElementById('annonce-localisation').textContent;
                    addText(`Localisation: ${localisation}`, 10, true);

                    const quartier = document.getElementById('annonce-quartier').textContent;
                    addText(`Quartier: ${quartier}`);

                    const surface = document.getElementById('annonce-surface').textContent;
                    addText(`Surface: ${surface}`);

                    const pieces = document.getElementById('annonce-pieces').textContent;
                    addText(`Pièces: ${pieces}`);

                    const date = document.getElementById('annonce-date').textContent;
                    addText(`Date de publication: ${date}`);

                    yPosition += 5;
                    break;

                case 'description':
                    checkNewPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Description', margin, yPosition);
                    yPosition += 8;

                    const description = document.getElementById('annonce-description').textContent;
                    addText(description, 9);
                    yPosition += 5;
                    break;

                case 'price-position':
                    checkNewPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Positionnement prix', margin, yPosition);
                    yPosition += 8;

                    if (priceStats) {
                        addText(`Prix minimum: ${formatPrice(priceStats.minPrice)}`);
                        addText(`Prix moyen: ${formatPrice(priceStats.avgPrice)}`);
                        addText(`Prix maximum: ${formatPrice(priceStats.maxPrice)}`);
                        yPosition += 3;
                        addText(`Prix/m² minimum: ${priceStats.minPriceM2} €/m²`);
                        addText(`Prix/m² moyen: ${priceStats.avgPriceM2} €/m²`);
                        addText(`Prix/m² maximum: ${priceStats.maxPriceM2} €/m²`);
                    }
                    yPosition += 5;
                    break;

                case 'works':
                    checkNewPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Estimation des travaux', margin, yPosition);
                    yPosition += 8;

                    const worksCost = document.getElementById('loan-works-cost').textContent;
                    addText(`Montant des travaux: ${worksCost}`, 10, true);
                    yPosition += 5;
                    break;

                case 'furniture':
                    checkNewPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Coût de l\'ameublement', margin, yPosition);
                    yPosition += 8;

                    const furnitureCost = document.getElementById('loan-furniture-cost').textContent;
                    addText(`Coût d'ameublement: ${furnitureCost}`, 10, true);
                    yPosition += 5;
                    break;

                case 'loan':
                    checkNewPage(50);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Calculateur de prêt immobilier', margin, yPosition);
                    yPosition += 8;

                    const propertyPrice = document.getElementById('loan-property-price').textContent;
                    addText(`Prix du bien: ${propertyPrice}`);

                    const notaryFees = document.getElementById('loan-notary-fees').textContent;
                    addText(`Frais de notaire: ${notaryFees}`);

                    const worksAmount = document.getElementById('loan-works-cost').textContent;
                    addText(`Travaux: ${worksAmount}`);

                    const furnitureAmount = document.getElementById('loan-furniture-cost').textContent;
                    addText(`Ameublement: ${furnitureAmount}`);

                    const subtotal = document.getElementById('loan-subtotal').textContent;
                    addText(`Sous-total: ${subtotal}`, 10, true);

                    const apport = document.getElementById('loan-apport-display').textContent;
                    addText(`Apport personnel: ${apport}`);

                    const totalCost = document.getElementById('loan-total-cost').textContent;
                    addText(`Montant à emprunter: ${totalCost}`, 11, true);

                    yPosition += 3;

                    const monthlyPayment = document.getElementById('loan-monthly-payment').textContent;
                    addText(`Mensualité: ${monthlyPayment}`, 12, true);

                    const totalInterest = document.getElementById('loan-total-interest').textContent;
                    addText(`Coût total du crédit: ${totalInterest}`);

                    const totalRepayment = document.getElementById('loan-total-repayment').textContent;
                    addText(`Total à rembourser: ${totalRepayment}`);

                    yPosition += 5;
                    break;

                case 'rental':
                    checkNewPage(40);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Rentabilité locative', margin, yPosition);
                    yPosition += 8;

                    const selectedRent = document.getElementById('selected-rent').textContent;
                    addText(`Loyer mensuel: ${selectedRent}`, 10, true);

                    const annualIncome = document.getElementById('annual-rent-income').textContent;
                    addText(`Revenus annuels: ${annualIncome}`);

                    const grossYield = document.getElementById('gross-yield').textContent;
                    addText(`Rendement brut: ${grossYield}`, 11, true);

                    const cashflow = document.getElementById('monthly-cashflow').textContent;
                    addText(`Cash-flow mensuel: ${cashflow}`, 11, true);

                    yPosition += 5;
                    break;
            }
        }

        // Ajouter le lien si demandé
        if (includeLink) {
            checkNewPage(20);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(0, 0, 255);
            const annonceUrl = document.getElementById('annonce-link').href;
            addText(`Lien vers l'annonce: ${annonceUrl}`, 9);
        }

        // Footer sur chaque page
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${i} sur ${pageCount}`, pageWidth - 30, pageHeight - 10);
            pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, pageHeight - 10);
        }

        // Télécharger le PDF
        const filename = `annonce_${currentAnnonceId}_${new Date().getTime()}.pdf`;
        pdf.save(filename);
    }

    // Initialiser la popup PDF après le chargement du DOM
    document.addEventListener('DOMContentLoaded', function() {
        // Attendre que l'annonce soit chargée avant d'initialiser la popup
        const observer = new MutationObserver(function(mutations) {
            const generateBtn = document.getElementById('generate-pdf-btn');
            if (generateBtn && !generateBtn.hasAttribute('data-initialized')) {
                generateBtn.setAttribute('data-initialized', 'true');
                initPdfPopup();
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

})();
