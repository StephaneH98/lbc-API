// recherche.js
// ==========================================
// ATTENDRE LE CHARGEMENT COMPLET DU DOM
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM chargé, initialisation...');
    
    // ==========================================
    // RÉCUPÉRATION DES ÉLÉMENTS AVEC VÉRIFICATION
    // ==========================================
    
    const elements = {
        // Formulaire
        searchForm: document.getElementById('searchForm'),
        
        // Boutons
        resetBtn: document.getElementById('resetBtn'),
        
        // Champs du formulaire
        ville: document.getElementById('ville'),
        codePostal: document.getElementById('codePostal'),
        prixMin: document.getElementById('prixMin'),
        prixMax: document.getElementById('prixMax'),
        surfaceMin: document.getElementById('surfaceMin'),
        surfaceMax: document.getElementById('surfaceMax'),
        piecesMin: document.getElementById('piecesMin'),
        piecesMax: document.getElementById('piecesMax'),
        chambresMin: document.getElementById('chambresMin'),
        chambresMax: document.getElementById('chambresMax'),
        
        // Zones d'affichage
        statusMessage: document.getElementById('statusMessage')
    };
    
    // Vérifier que tous les éléments OBLIGATOIRES existent
    const requiredElements = ['searchForm'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    
    if (missingElements.length > 0) {
        console.error('❌ Éléments manquants:', missingElements);
        console.error('Vérifiez que ces IDs existent dans recherche.html');
        return;
    }
    
    console.log('✅ Tous les éléments obligatoires trouvés');
    
   
    
    // ==========================================
    // FONCTION : RÉCUPÉRER LES DONNÉES DU FORMULAIRE
    // ==========================================
    
    function getFormData() {
        return {
            category: elements.category?.value || '9',
            ville: elements.ville?.value?.trim() || '',
            codePostal: elements.codePostal?.value?.trim() || '',
            prixMin: elements.prixMin?.value || '',
            prixMax: elements.prixMax?.value || '',
            surfaceMin: elements.surfaceMin?.value || '',
            surfaceMax: elements.surfaceMax?.value || '',
            piecesMin: elements.piecesMin?.value || '',
            piecesMax: elements.piecesMax?.value || '',
            chambresMin: elements.chambresMin?.value || '',
            chambresMax: elements.chambresMax?.value || ''
        };
    }
    
    // ==========================================
    // FONCTION : VALIDER LE FORMULAIRE
    // ==========================================
    
    function validateForm(formData) {
        const errors = [];
        
        // Code postal (si renseigné)
        if (formData.codePostal && !/^\d{5}$/.test(formData.codePostal)) {
            errors.push('Le code postal doit contenir 5 chiffres');
        }
        
        // Prix
        if (formData.prixMin && formData.prixMax) {
            if (parseFloat(formData.prixMin) > parseFloat(formData.prixMax)) {
                errors.push('Le prix minimum ne peut pas être supérieur au prix maximum');
            }
        }
        
        // Surface
        if (formData.surfaceMin && formData.surfaceMax) {
            if (parseFloat(formData.surfaceMin) > parseFloat(formData.surfaceMax)) {
                errors.push('La surface minimum ne peut pas être supérieure à la surface maximum');
            }
        }
        
        // Pièces
        if (formData.piecesMin && formData.piecesMax) {
            if (parseInt(formData.piecesMin) > parseInt(formData.piecesMax)) {
                errors.push('Le nombre de pièces minimum ne peut pas être supérieur au maximum');
            }
        }
        
        // Chambres
        if (formData.chambresMin && formData.chambresMax) {
            if (parseInt(formData.chambresMin) > parseInt(formData.chambresMax)) {
                errors.push('Le nombre de chambres minimum ne peut pas être supérieur au maximum');
            }
        }
        
        return errors;
    }
    
    // ==========================================
    // FONCTION : CONSTRUIRE L'URL LEBONCOIN
    // ==========================================
    
    function buildLeboncoinUrl(formData) {
        console.log('🔨 Construction URL avec:', formData);
        
        const baseUrl = 'https://www.leboncoin.fr/recherche';
        const params = new URLSearchParams();
        
        // Catégorie (obligatoire)
        if (formData.category) {
            params.append('category', formData.category);
        }
        
        // Prix
        if (formData.prixMin || formData.prixMax) {
            const prixMin = formData.prixMin || 'min';
            const prixMax = formData.prixMax || 'max';
            params.append('price', `${prixMin}-${prixMax}`);
        }
        
        // Surface
        if (formData.surfaceMin || formData.surfaceMax) {
            const surfaceMin = formData.surfaceMin || 'min';
            const surfaceMax = formData.surfaceMax || 'max';
            params.append('square', `${surfaceMin}-${surfaceMax}`);
        }
        
        // Pièces
        if (formData.piecesMin || formData.piecesMax) {
            const piecesMin = formData.piecesMin || 'min';
            const piecesMax = formData.piecesMax || 'max';
            params.append('rooms', `${piecesMin}-${piecesMax}`);
        }
        
        // Chambres (bedrooms)
        if (formData.chambresMin || formData.chambresMax) {
            const chambresMin = formData.chambresMin || 'min';
            const chambresMax = formData.chambresMax || 'max';
            params.append('bedrooms', `${chambresMin}-${chambresMax}`);
        }
        
        // Localisation simplifiée
        if (formData.ville || formData.codePostal) {
            const location = formData.ville || formData.codePostal;
            params.append('locations', location);
        }
        
        const finalUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
        console.log('🔗 URL construite:', finalUrl);
        
        return finalUrl;
    }
    
    // ==========================================
    // FONCTION : AFFICHER UN MESSAGE DE STATUT
    // ==========================================
    

   
    /**
     * 📡 Envoie l'URL à la Lambda AWS avec le proxy CORS
     */
    async function sendToLambda(url) {
        const statusDiv = document.getElementById('statusMessage');
        
        // Affichage du message de chargement
        statusDiv.textContent = '⏳ Envoi de la requête vers Lambda...';
        statusDiv.className = 'status-message loading';
        statusDiv.style.display = 'block';
    
        proxyUrl = CONFIG.PROXY_URL + url;

        console.log('🚀 Envoi vers Lambda:', proxyUrl);
        // ✅ Construction de l'URL avec query string
        LAMBDA_URL = `${CONFIG.API_URL}/page?url=${encodeURIComponent(proxyUrl)}`;

        try {
            const response = await fetch(LAMBDA_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
                // ❌ PAS DE BODY avec GET
            });

            const data = await response.json();
            
            // ✅ AFFICHAGE DANS LA CONSOLE
            console.log('📦 Réponse complète:', data);
            
            if (data.s3Url) {
                console.log('✅ S3 URL:', data.s3Url);
                console.log('🔑 S3 Key:', data.s3Key);
                console.log('📊 Taille:', data.contentLength, 'octets');
                console.log('🔍 Captcha:', data.hasCaptcha ? 'Oui' : 'Non');
                console.log('⏰ Timestamp:', new Date(data.timestamp).toLocaleString('fr-FR'));
            }

    
            if (response.ok) {
                // Affichage du succès
                statusDiv.innerHTML = `
                    <div style="padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0; color: #155724;">✅ Page récupérée avec succès !</h3>
                        <p style="margin: 5px 0;"><strong>🔗 URL S3:</strong> <a href="${data.s3Url}" target="_blank" style="color: #0056b3; text-decoration: underline;">${data.s3Url}</a></p>
                        <p style="margin: 5px 0;"><strong>🔑 Clé S3:</strong> ${data.s3Key}</p>
                        <p style="margin: 5px 0;"><strong>📊 Taille:</strong> ${data.contentLength.toLocaleString('fr-FR')} octets</p>
                        <p style="margin: 5px 0;"><strong>🔍 Captcha détecté:</strong> ${data.hasCaptcha ? '🔴 Oui' : '🟢 Non'}</p>
                        <p style="margin: 5px 0;"><strong>⏰ Timestamp:</strong> ${new Date(data.timestamp).toLocaleString('fr-FR')}</p>
                    </div>
                `;
                statusDiv.className = 'status-message success';
                console.log('✅ Succès !');
                return data;
            } else {
                // Affichage de l'erreur
                statusDiv.innerHTML = `
                    <div style="padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0; color: #721c24;">❌ Erreur</h3>
                        <p style="margin: 5px 0;">${data.error || 'Erreur inconnue'}</p>
                    </div>
                `;
                statusDiv.className = 'status-message error';
                console.error('❌ Erreur:', data.error);
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('❌ Erreur complète:', error);
            statusDiv.innerHTML = `
                <div style="padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px 0; color: #721c24;">❌ Erreur réseau</h3>
                    <p style="margin: 5px 0;">${error.message}</p>
                </div>
            `;
            statusDiv.className = 'status-message error';
            throw error;
        }
    }
    

    

    async function callExtractLambda(s3Url) {
        const startTime = Date.now();
    
        try {
            console.log('🚀 Envoi de l\'URL S3 vers Lambda d\'extraction...');
            console.log('🔗 S3 URL:', s3Url);
    
            // ========== CONSTRUCTION DE L'URL AVEC QUERY STRING ==========
            const lambdaUrl = `${CONFIG.API_URL}/extract?url=${encodeURIComponent(s3Url)}`;
            // const lambdaUrl = `${CONFIG.API_URL}/extract?url=${encodeURIComponent("https://immo-app.s3.eu-west-3.amazonaws.com/html/1760522340566-aHR0cHM6Ly-hhyx8qx.html")}`;
            console.log('🎯 URL Lambda:', lambdaUrl);
    
            // ========== TIMEOUT CONTROLLER ==========
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ Timeout atteint');
                controller.abort();
            }, CONFIG.TIMEOUT);
    
            // ========== REQUÊTE GET ==========
            const response = await fetch(lambdaUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/json',
                    'Content-Type': 'application/json'
                    // 'x-api-key': '...optional if required...',
                    // 'Authorization': 'Bearer ...optional if required...'
                },
                signal: controller.signal
            });
    
            clearTimeout(timeoutId);
    
            const duration = Date.now() - startTime;
            console.log(`⏱️ Durée: ${duration}ms`);
    
            // ========== GESTION DE LA RÉPONSE ==========
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
    
            const result = await response.json();
            console.log('✅ Réponse JSON reçue:', result);
    
            // ========== ANALYSE DE LA RÉPONSE ==========
            console.log('═'.repeat(80));
            console.log('📊 RÉSULTAT DE L\'EXTRACTION');
            console.log('═'.repeat(80));
    
            if (result.success) {
                console.log('✅ Statut: Succès');
                console.log('📋 Message:', result.message);
    
                if (result.stats) {
                    console.log('📊 Statistiques:');
                    console.log('   • Total annonces:', result.stats.total_ads);
                    console.log('   • Annonces valides:', result.stats.valid_ads);
                    console.log('   • Annonces ignorées:', result.stats.ignored_ads);
                    console.log('   • Taux de complétion:', result.stats.completion_rate + '%');
                }
    
                if (result.announcements && result.announcements.length > 0) {
                    console.log('\n📝 Aperçu des annonces:');
                    result.announcements.slice(0, 3).forEach((ad, index) => {
                        console.log(`\n${index + 1}. ${ad.titre || 'Sans titre'}`);
                        console.log(`   Prix: ${ad.prix || 'N/A'}`);
                        console.log(`   URL: ${ad.url || 'N/A'}`);
                        console.log(`   Localisation: ${ad.localisation || 'N/A'}`);
                    });
    
                    if (result.announcements.length > 3) {
                        console.log(`\n... et ${result.announcements.length - 3} autres annonces`);
                    }
                }
            } else {
                console.warn('⚠️ Statut: Échec');
                console.warn('📋 Message:', result.message);
            }
    
            console.log('═'.repeat(80));
            console.log('⏱️  Temps total:', (Date.now() - startTime), 'ms');
    
            return result;
    
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Erreur après', duration, 'ms:', error);
    
            if (error.name === 'AbortError') {
                showError(`Timeout après ${CONFIG.TIMEOUT/1000}s lors de l'extraction`);
            } else if (error.message.includes('Failed to fetch')) {
                showError('Erreur réseau lors de l\'extraction. Vérifiez votre connexion.');
            } else {
                showError(`Erreur extraction: ${error.message}`);
            }
    
            return null;
        }
    }
    
    

    /**
     * ⚠️ Affichage d'une erreur
     */


    // ========== INITIALISATION ==========
    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('searchButton');
        if (button) {
            button.addEventListener('click', handleSearch);
            console.log('✅ Gestionnaire de recherche initialisé');
        }
    });
    
    // ==========================================
    // FONCTION : RÉINITIALISER LE FORMULAIRE
    // ==========================================
    
    function resetForm() {
        if (!elements.searchForm) return;
        
        elements.searchForm.reset();
        if (elements.statusMessage) elements.statusMessage.style.display = 'none';
        
        console.log('🔄 Formulaire réinitialisé');
    }
    
    // ==========================================
    // GESTIONNAIRES D'ÉVÉNEMENTS
    // ==========================================
    
    // Soumission du formulaire
    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
    
            // ========== RÉCUPÉRATION DU BOUTON ==========
            const button = this.querySelector('button[type="submit"]') || 
                          this.querySelector('input[type="submit"]') ||
                          document.getElementById('searchButton');
            
            const originalText = button?.textContent || button?.value || 'Rechercher';
    
            try {
                console.log('═'.repeat(80));
                console.log('🎯 DÉBUT DU PROCESSUS COMPLET');
                console.log('═'.repeat(80));
    
                // ========== UI: MODE CHARGEMENT ==========
                if (button) {
                    button.disabled = true;
                    button.classList.add('loading');
                }
    
                // ========== ÉTAPE 1: GÉNÉRATION ET SCRAPING ==========
                console.log('\n📍 ÉTAPE 1/2: Récupération du HTML');
                console.log('─'.repeat(80));
    
                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Récupération des données...';
                    } else {
                        button.value = '⏳ Récupération des données...';
                    }
                }
    
                // Récupérer les données
                const formData = getFormData();
    
                // Valider
                const errors = validateForm(formData);
                if (errors.length > 0) {
                    showStatus('Erreurs de validation', 'error', errors.join('<br>'));
                    return;
                }
    
                // Construire l'URL
                const generatedUrl = buildLeboncoinUrl(formData);
                console.log('🔗 URL générée:', generatedUrl);
    
                const response = await sendToLambda(generatedUrl);
                console.log('🚀 Réponse reçue:', response.s3Url);
                if (!response) {
                    throw new Error('Aucune donnée HTML reçue');
                }
    
                console.log('✅ HTML récupéré avec succès');
    
                // ========== ÉTAPE 2: EXTRACTION DES ANNONCES ==========
                console.log('\n🔍 ÉTAPE 2/2: Extraction des annonces');
                console.log('─'.repeat(80));
    
                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Extraction des annonces...';
                    } else {
                        button.value = '⏳ Extraction des annonces...';
                    }
                }
    
                const extractionResult = await callExtractLambda(response.s3Url); // ⚠️ Ajout de 'await'
    
                if (!extractionResult) {
                    throw new Error('Échec de l\'extraction des annonces');
                }
    
                if (!extractionResult.success) {
                    throw new Error(extractionResult.message || 'Extraction échouée');
                }
    
                // ========== AFFICHAGE DES RÉSULTATS ==========
                console.log('\n🎨 Affichage des résultats');
                console.log('─'.repeat(80));
    
                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Affichage...';
                    } else {
                        button.value = '⏳ Affichage...';
                    }
                }
    
                const announcements = extractionResult.announcements || [];
    
                if (announcements.length === 0) {
                    console.warn('⚠️ Aucune annonce trouvée');
                    showWarning('Aucune annonce trouvée pour ces critères');
                } else {
                    displayAnnouncements(announcements);
    
                    // Stats finales
                    console.log('\n═'.repeat(80));
                    console.log('✨ PROCESSUS TERMINÉ AVEC SUCCÈS');
                    console.log('═'.repeat(80));
                    console.log(`📊 Statistiques:`);
                    console.log(`   • Total annonces: ${extractionResult.stats?.total_ads || announcements.length}`);
                    console.log(`   • Annonces valides: ${extractionResult.stats?.valid_ads || announcements.length}`);
                    console.log(`   • Annonces ignorées: ${extractionResult.stats?.ignored_ads || 0}`);
                    console.log(`   • Taux de complétion: ${extractionResult.stats?.completion_rate || 100}%`);
                    console.log('═'.repeat(80));
    
                    showSuccess(`${announcements.length} annonce(s) trouvée(s) !`);
                }
    
            } catch (error) {
                console.error('❌ Erreur:', error);
                
                let errorMessage = 'Une erreur est survenue';
                
                if (error.name === 'AbortError') {
                    errorMessage = 'Timeout: la requête a pris trop de temps';
                } else if (error.message?.includes('Failed to fetch')) {
                    errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
                } else {
                    errorMessage = error.message || 'Erreur inconnue';
                }
                
                showError(errorMessage);
                
            } finally {
                // ========== RESTAURATION UI ==========
                if (button) {
                    button.disabled = false;
                    button.classList.remove('loading');
                    
                    if (button.tagName === 'BUTTON') {
                        button.textContent = originalText;
                    } else {
                        button.value = originalText;
                    }
                }
                
                console.log('\n🏁 Processus terminé\n');
            }
        });
    }
    
    
    // Bouton réinitialiser
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetForm);
    }
    
    console.log('✅ Page de recherche prête !');
});


function showStatus(message, type = 'info', details = '') {
    if (!elements.statusMessage) return;
    
    const icons = {
        'loading': '⏳',
        'success': '✅',
        'error': '❌',
        'info': 'ℹ️'
    };
    
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.innerHTML = `
        <strong>${icons[type]} ${message}</strong>
        ${details ? `<small>${details}</small>` : ''}
    `;
    elements.statusMessage.style.display = 'block';
    
    elements.statusMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <span class="icon">✅</span>
        <span class="message">${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showWarning(message) {
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.innerHTML = `
        <span class="icon">⚠️</span>
        <span class="message">${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
        <span class="icon">❌</span>
        <span class="message">${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}
function showError(container, message) {
    // Vérification de sécurité
    if (!container) {
        console.error('❌ showError: container est null, message:', message);
        // Créer un container temporaire en haut de page
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            max-width: 80%;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        tempContainer.innerHTML = `
            <strong>❌ Erreur</strong><br>
            ${message}
        `;
        document.body.appendChild(tempContainer);
        
        // Auto-supprimer après 5 secondes
        setTimeout(() => {
            tempContainer.remove();
        }, 5000);
        
        return;
    }
    
    // Comportement normal si le container existe
    container.innerHTML = `
        <div class="error-message" style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; border-left: 4px solid #f44336;">
            <strong>❌ Erreur:</strong> ${message}
        </div>
    `;
    container.style.display = 'block';
}


function displayAnnouncements(announcements) {
    console.log(`🎨 Affichage de ${announcements.length} annonce(s) en tableau...`);

    let container = document.getElementById('results');

    // Créer le container s'il n'existe pas
    if (!container) {
        console.warn('⚠️ Container "results" introuvable, création automatique...');
        container = document.createElement('div');
        container.id = 'results';
        container.className = 'results-container';
        
        const form = document.getElementById('searchForm');
        if (form && form.parentElement) {
            form.parentElement.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
        console.log('✅ Container créé dynamiquement');
    }

    // Vider le container
    container.innerHTML = '';

    // Header avec stats
    const header = document.createElement('div');
    header.className = 'results-header';
    header.innerHTML = `
        <h2>📋 Résultats de la recherche</h2>
        <p class="results-count">${announcements.length} annonce(s) trouvée(s)</p>
    `;
    container.appendChild(header);

    // Wrapper pour le scroll horizontal sur mobile
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    // Création du tableau
    const table = document.createElement('table');
    table.className = 'announcements-table';

    // En-tête du tableau
    table.innerHTML = `
        <thead>
            <tr>
                <th class="col-number">#</th>
                <th class="col-title">Description</th>
                <th class="col-price">Prix</th>
                <th class="col-location">Localisation</th>
                <th class="col-rooms">Pièces</th>
                <th class="col-date">Âge</th>
                <th class="col-action">Action</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Remplir le tableau avec les annonces
    announcements.forEach((ad, index) => {
        const row = document.createElement('tr');
        row.className = 'announcement-row';
        row.style.animationDelay = `${index * 0.03}s`;

        // Fonction helper pour formater l'âge
        const formatAge = (date) => {
            if (!date) return '<span class="no-data">N/A</span>';
            
            const adDate = new Date(date);
            const now = new Date();
            const diffTime = Math.abs(now - adDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return '<span class="age-new">Aujourd\'hui</span>';
            if (diffDays === 1) return '<span class="age-recent">Hier</span>';
            if (diffDays < 7) return `<span class="age-recent">${diffDays}j</span>`;
            if (diffDays < 30) return `<span class="age-medium">${Math.floor(diffDays / 7)} sem.</span>`;
            return `<span class="age-old">${Math.floor(diffDays / 30)} mois</span>`;
        };

        // Fonction helper pour extraire le nombre de pièces
        const extractRooms = (title, description) => {
            const text = `${title || ''} ${description || ''}`.toLowerCase();
            
            // Chercher "X pièces", "X pieces", "TX", "FX"
            const patterns = [
                /(\d+)\s*pi[èe]ces?/i,
                /t(\d+)/i,
                /f(\d+)/i,
                /(\d+)\s*p\b/i
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    return `<span class="rooms-badge">${match[1]} pièce${match[1] > 1 ? 's' : ''}</span>`;
                }
            }
            
            return '<span class="no-data">N/A</span>';
        };

        row.innerHTML = `
            <td class="col-number">
                <span class="row-number">${index + 1}</span>
            </td>
            <td class="col-title">
                <div class="title-cell">
                    <strong>${ad.titre || 'Sans titre'}</strong>
                    ${ad.description ? `<small>${ad.description.substring(0, 80)}${ad.description.length > 80 ? '...' : ''}</small>` : ''}
                </div>
            </td>
            <td class="col-price">
                <span class="price-value">${ad.prix || '<span class="no-data">Non spécifié</span>'}</span>
            </td>
            <td class="col-location">
                ${ad.localisation ? `📍 ${ad.localisation}` : '<span class="no-data">N/A</span>'}
            </td>
            <td class="col-rooms">
                ${extractRooms(ad.titre, ad.description)}
            </td>
            <td class="col-date">
                ${formatAge(ad.date)}
            </td>
            <td class="col-action">
                <a href="${ad.url || '#'}" target="_blank" rel="noopener noreferrer" class="btn-view">
                    Voir →
                </a>
            </td>
        `;

        tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // Scroll vers les résultats
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    console.log('✅ Tableau affiché avec succès');
}


