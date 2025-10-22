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

        if (!currentFilename || !currentAnnonceId) {
            showError('Paramètres manquants. Impossible de charger l\'annonce.');
            return;
        }

        // Charger les données
        loadAnnonceData(currentFilename, currentAnnonceId);

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

        // Calculateur de prêt immobilier
        initLoanCalculator(prix);

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
        const loanNotaryPercentInput = document.getElementById('loan-notary-percent');
        const loanWorksAmountInput = document.getElementById('loan-works-amount');

        const loanPropertyPriceDisplay = document.getElementById('loan-property-price');
        const loanNotaryFeesDisplay = document.getElementById('loan-notary-fees');
        const loanWorksCostDisplay = document.getElementById('loan-works-cost');
        const loanTotalCostDisplay = document.getElementById('loan-total-cost');

        const loanMonthlyPaymentDisplay = document.getElementById('loan-monthly-payment');
        const loanTotalInterestDisplay = document.getElementById('loan-total-interest');
        const loanTotalRepaymentDisplay = document.getElementById('loan-total-repayment');

        // Fonction de calcul du prêt
        function calculateLoan() {
            // Récupérer les valeurs
            const durationYears = parseFloat(loanDurationInput.value) || 25;
            const annualRate = parseFloat(loanRateInput.value) || 3.5;
            const notaryPercent = parseFloat(loanNotaryPercentInput.value) || 8;
            const worksAmount = parseFloat(loanWorksAmountInput.value) || 0;

            console.log(`🔢 Calcul avec: ${durationYears} ans, ${annualRate}% taux, ${notaryPercent}% frais notaire, ${formatPrice(worksAmount)} travaux`);

            // Calcul des frais de notaire
            const notaryFees = Math.round(propertyPrice * (notaryPercent / 100));
            const totalCost = propertyPrice + notaryFees + worksAmount;

            // Afficher le résumé des coûts
            loanPropertyPriceDisplay.textContent = formatPrice(propertyPrice);
            loanNotaryFeesDisplay.textContent = formatPrice(notaryFees);
            loanWorksCostDisplay.textContent = formatPrice(worksAmount);
            loanTotalCostDisplay.textContent = formatPrice(totalCost);

            // Calcul de la mensualité avec la formule d'amortissement
            // M = P * (r(1+r)^n) / ((1+r)^n - 1)
            // où P = principal, r = taux mensuel, n = nombre de mois

            const monthlyRate = (annualRate / 100) / 12; // Taux mensuel
            const numberOfMonths = durationYears * 12; // Nombre de mensualités

            let monthlyPayment;
            if (monthlyRate === 0) {
                // Si taux = 0%, calcul simple
                monthlyPayment = totalCost / numberOfMonths;
            } else {
                // Formule d'amortissement classique
                const factor = Math.pow(1 + monthlyRate, numberOfMonths);
                monthlyPayment = totalCost * (monthlyRate * factor) / (factor - 1);
            }

            // Calcul du coût total du crédit et du total à rembourser
            const totalRepayment = monthlyPayment * numberOfMonths;
            const totalInterest = totalRepayment - totalCost;

            // Afficher les résultats
            loanMonthlyPaymentDisplay.textContent = formatPrice(monthlyPayment);
            loanTotalInterestDisplay.textContent = formatPrice(totalInterest);
            loanTotalRepaymentDisplay.textContent = formatPrice(totalRepayment);

            console.log(`✅ Mensualité: ${formatPrice(monthlyPayment)}`);
            console.log(`   Coût du crédit: ${formatPrice(totalInterest)}`);
            console.log(`   Total à rembourser: ${formatPrice(totalRepayment)}`);
        }

        // Ajouter les event listeners pour le recalcul en temps réel
        loanDurationInput.addEventListener('input', calculateLoan);
        loanRateInput.addEventListener('input', calculateLoan);
        loanNotaryPercentInput.addEventListener('input', calculateLoan);
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

                // Préparer les données à sauvegarder
                const loanData = {
                    annonceId: currentAnnonceId,
                    duration: parseFloat(loanDurationInput.value) || 25,
                    rate: parseFloat(loanRateInput.value) || 3.5,
                    notaryPercent: parseFloat(loanNotaryPercentInput.value) || 8,
                    worksAmount: parseFloat(loanWorksAmountInput.value) || 0,
                    worksArray: worksArray,
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
            if (savedData.notaryPercent) loanNotaryPercentInput.value = savedData.notaryPercent;

            // Restaurer les travaux
            if (savedData.worksArray && savedData.worksArray.length > 0) {
                worksArray = savedData.worksArray;
                renderWorksTable();
                updateDetailedTotal();
            } else if (savedData.worksAmount) {
                loanWorksAmountInput.value = savedData.worksAmount;
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
