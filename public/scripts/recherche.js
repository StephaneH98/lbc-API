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

    function buildLeboncoinUrl(formData, category, includePrice = true) {
        console.log(`🔨 Construction URL pour catégorie ${category} (Prix: ${includePrice ? 'Oui' : 'Non'})`);

        const baseUrl = 'https://www.leboncoin.fr/recherche';
        const params = new URLSearchParams();

        // Catégorie (obligatoire)
        params.append('category', category);

        // Prix (uniquement si includePrice = true, donc pour la vente)
        if (includePrice && (formData.prixMin || formData.prixMax)) {
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
    
                // ========== RÉCUPÉRATION DES DONNÉES ==========
                const formData = getFormData();

                // Valider
                const errors = validateForm(formData);
                if (errors.length > 0) {
                    showStatus('Erreurs de validation', 'error', errors.join('<br>'));
                    return;
                }

                // ========== ÉTAPE 1: GÉNÉRATION DES URLS ==========
                console.log('\n📍 ÉTAPE 1/4: Génération des URLs');
                console.log('─'.repeat(80));

                // URL pour VENTE (catégorie 9) - AVEC prix
                const urlVente = buildLeboncoinUrl(formData, '9', true);
                console.log('🏘️ URL VENTE (cat. 9):', urlVente);

                // URL pour LOCATION (catégorie 10) - SANS prix
                const urlLocation = buildLeboncoinUrl(formData, '10', false);
                console.log('🏠 URL LOCATION (cat. 10):', urlLocation);

                // ========== ÉTAPE 2: RÉCUPÉRATION DES PAGES HTML ==========
                console.log('\n📍 ÉTAPE 2/4: Récupération des pages HTML');
                console.log('─'.repeat(80));

                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Récupération page VENTE...';
                    } else {
                        button.value = '⏳ Récupération page VENTE...';
                    }
                }

                console.log('🏘️ Récupération HTML VENTE...');
                const responseVente = await sendToLambda(urlVente);
                if (!responseVente) {
                    throw new Error('Aucune donnée HTML reçue pour VENTE');
                }
                console.log('✅ HTML VENTE récupéré:', responseVente.s3Url);

                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Récupération page LOCATION...';
                    } else {
                        button.value = '⏳ Récupération page LOCATION...';
                    }
                }

                console.log('\n🏠 Récupération HTML LOCATION...');
                const responseLocation = await sendToLambda(urlLocation);
                if (!responseLocation) {
                    throw new Error('Aucune donnée HTML reçue pour LOCATION');
                }
                console.log('✅ HTML LOCATION récupéré:', responseLocation.s3Url);

                // ========== ÉTAPE 3: EXTRACTION DES ANNONCES ==========
                console.log('\n📍 ÉTAPE 3/4: Extraction des annonces');
                console.log('─'.repeat(80));

                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Extraction annonces VENTE...';
                    } else {
                        button.value = '⏳ Extraction annonces VENTE...';
                    }
                }

                console.log('🏘️ Extraction annonces VENTE...');
                const extractionVente = await callExtractLambda(responseVente.s3Url);
                if (!extractionVente || !extractionVente.success) {
                    throw new Error('Échec de l\'extraction des annonces VENTE');
                }
                console.log('✅ Annonces VENTE extraites:', extractionVente.announcements?.length || 0);

                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Extraction annonces LOCATION...';
                    } else {
                        button.value = '⏳ Extraction annonces LOCATION...';
                    }
                }

                console.log('\n🏠 Extraction annonces LOCATION...');
                const extractionLocation = await callExtractLambda(responseLocation.s3Url);
                if (!extractionLocation || !extractionLocation.success) {
                    throw new Error('Échec de l\'extraction des annonces LOCATION');
                }
                console.log('✅ Annonces LOCATION extraites:', extractionLocation.announcements?.length || 0);

                // ========== ÉTAPE 4: AFFICHAGE DES RÉSULTATS ==========
                console.log('\n📍 ÉTAPE 4/4: Préparation des résultats');
                console.log('─'.repeat(80));

                if (button) {
                    if (button.tagName === 'BUTTON') {
                        button.textContent = '⏳ Préparation de l\'affichage...';
                    } else {
                        button.value = '⏳ Préparation de l\'affichage...';
                    }
                }

                const annoncesVente = extractionVente.announcements || [];
                const annoncesLocation = extractionLocation.announcements || [];

                // ========== AFFICHAGE EXTRAITS DANS LA CONSOLE ==========
                console.log('\n═'.repeat(80));
                console.log('🏘️ EXTRAIT JSON VENTE (Catégorie 9)');
                console.log('═'.repeat(80));
                console.log('📊 Total annonces VENTE:', annoncesVente.length);
                if (annoncesVente.length > 0) {
                    console.log('\n🔍 Aperçu (3 premières annonces):');
                    annoncesVente.slice(0, 3).forEach((ad, idx) => {
                        console.log(`\n${idx + 1}. ${ad.titre || 'Sans titre'}`);
                        console.log(`   Prix: ${ad.prix || 'N/A'}`);
                        console.log(`   Localisation: ${ad.localisation || 'N/A'}`);
                        console.log(`   URL: ${ad.url || 'N/A'}`);
                    });
                }

                console.log('\n═'.repeat(80));
                console.log('🏠 EXTRAIT JSON LOCATION (Catégorie 10)');
                console.log('═'.repeat(80));
                console.log('📊 Total annonces LOCATION:', annoncesLocation.length);
                if (annoncesLocation.length > 0) {
                    console.log('\n🔍 Aperçu (3 premières annonces):');
                    annoncesLocation.slice(0, 3).forEach((ad, idx) => {
                        console.log(`\n${idx + 1}. ${ad.titre || 'Sans titre'}`);
                        console.log(`   Prix: ${ad.prix || 'N/A'}`);
                        console.log(`   Localisation: ${ad.localisation || 'N/A'}`);
                        console.log(`   URL: ${ad.url || 'N/A'}`);
                    });
                }

                // ========== COMBINER LES RÉSULTATS ==========
                const allAnnouncements = [...annoncesVente, ...annoncesLocation];
                const totalCount = allAnnouncements.length;

                console.log('\n═'.repeat(80));
                console.log('✨ PROCESSUS TERMINÉ AVEC SUCCÈS');
                console.log('═'.repeat(80));
                console.log(`📊 Statistiques globales:`);
                console.log(`   • Total annonces VENTE: ${annoncesVente.length}`);
                console.log(`   • Total annonces LOCATION: ${annoncesLocation.length}`);
                console.log(`   • TOTAL COMBINÉ: ${totalCount}`);
                console.log('═'.repeat(80));

                if (totalCount === 0) {
                    console.warn('⚠️ Aucune annonce trouvée');
                    showWarning('Aucune annonce trouvée pour ces critères');
                } else {
                    // Sauvegarder les résultats séparément dans sessionStorage
                    sessionStorage.setItem('searchResults', JSON.stringify(allAnnouncements));
                    sessionStorage.setItem('searchResultsVente', JSON.stringify(annoncesVente));
                    sessionStorage.setItem('searchResultsLocation', JSON.stringify(annoncesLocation));
                    sessionStorage.setItem('searchStats', JSON.stringify({
                        vente: extractionVente.stats,
                        location: extractionLocation.stats,
                        totalVente: annoncesVente.length,
                        totalLocation: annoncesLocation.length,
                        totalCombine: totalCount
                    }));

                    showSuccess(`${totalCount} annonce(s) trouvée(s) (${annoncesVente.length} vente, ${annoncesLocation.length} location) ! Redirection...`);

                    // Rediriger vers annonces.html après 2 secondes
                    setTimeout(() => {
                        window.location.href = 'annonces.html?source=search';
                    }, 2000);
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


