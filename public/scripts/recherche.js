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
        category: document.getElementById('category'),
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
    const requiredElements = ['searchForm', 'category'];
    const missingElements = requiredElements.filter(key => !elements[key]);
    
    if (missingElements.length > 0) {
        console.error('❌ Éléments manquants:', missingElements);
        console.error('Vérifiez que ces IDs existent dans recherche.html');
        return;
    }
    
    console.log('✅ Tous les éléments obligatoires trouvés');
    
    // ==========================================
    // FONCTION : CAPTURER LES HEADERS DU NAVIGATEUR
    // ==========================================
    async function getUserHeaders() {
        const headers = {
            'User-Agent': navigator.userAgent,
            'Accept-Language': navigator.language || navigator.userLanguage,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        };

        // Ajouter DNT si activé
        if (navigator.doNotTrack === '1') {
            headers['DNT'] = '1';
        }

        // Ajouter les informations de plateforme
        headers['Sec-Ch-Ua-Platform'] = `"${navigator.platform}"`;
        headers['Sec-Ch-Ua-Mobile'] = /mobile/i.test(navigator.userAgent) ? '?1' : '?0';

        // Capturer la résolution d'écran
        headers['Viewport-Width'] = window.innerWidth.toString();
        headers['Viewport-Height'] = window.innerHeight.toString();
        
        // Timezone
        headers['Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;

        console.log('📋 Headers capturés:', headers);
        return headers;
    }
    
    // ==========================================
    // FONCTION : RÉCUPÉRER LES DONNÉES DU FORMULAIRE
    // ==========================================
    
    function getFormData() {
        return {
            category: elements.category?.value || '10',
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
    
    // ==========================================
    // FONCTION : AFFICHER APERÇU HTML DANS LA CONSOLE
    // ==========================================
    
    function displayHtmlPreview(html, maxLines = 100) {
        if (!html) {
            console.warn('⚠️ Aucun HTML à afficher');
            return;
        }
        
        const lines = html.split('\n');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📄 APERÇU HTML (${maxLines} premières lignes / ${lines.length} total)`);
        console.log('═══════════════════════════════════════════════════════');
        
        lines.slice(0, maxLines).forEach((line, index) => {
            const lineNum = (index + 1).toString().padStart(4, '0');
            console.log(`${lineNum} │ ${line}`);
        });
        
        if (lines.length > maxLines) {
            console.log(`... (${lines.length - maxLines} lignes supplémentaires)`);
        }
        
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 Stats: ${lines.length} lignes | ${formatBytes(html.length)}`);
        console.log('═══════════════════════════════════════════════════════');
    }
    
    /**
     * 📡 Envoie l'URL à la Lambda AWS avec le proxy CORS
     */
    async function sendToLambda(url) {
        const startTime = Date.now();
        
        try {
            console.log('🚀 Envoi vers Lambda...');
            console.log('📍 URL originale:', url);
            
            // ========== CONSTRUCTION DE L'URL FINALE ==========
            // Format: https://corsproxy.io/?https://www.leboncoin.fr/recherche?...
            const proxiedUrl = `${CONFIG.PROXY_URL}${url}`;
            console.log('🔗 URL avec proxy:', proxiedUrl);
            
            // ========== HEADERS UTILISATEUR RÉALISTES ==========
            const userHeaders = {
                'User-Agent': navigator.userAgent,
                'Accept-Language': navigator.language || 'fr-FR,fr;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1'
            };
            
            console.log('📋 Headers:', userHeaders);
            
            // ========== CONSTRUCTION DES QUERY PARAMS ==========
            const lambdaUrl = `${CONFIG.API_URL}/page`;
            
            const params = new URLSearchParams({
                url: proxiedUrl,  // ← URL complète avec proxy
                userHeaders: JSON.stringify(userHeaders)
            });
            
            const finalUrl = `${lambdaUrl}?${params.toString()}`;
            console.log('🎯 URL finale Lambda:', finalUrl);
            
            // ========== REQUÊTE FETCH ==========
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.warn('⏱️ Timeout atteint');
                controller.abort();
            }, CONFIG.TIMEOUT);
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const duration = Date.now() - startTime;
            console.log(`⏱️ Durée: ${duration}ms`);
            
            // ========== GESTION DE LA RÉPONSE ==========
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            console.log('✅ HTML reçu:', html.length, 'octets');
            
            // Vérification CAPTCHA
            if (html.includes('captcha') || html.includes('DataDome')) {
                console.warn('⚠️ CAPTCHA détecté dans la réponse !');
                showError('Le site a détecté un bot. Réessayez dans quelques secondes.');
                return null;
            }
            
            // Vérification contenu vide
            if (html.length < 500) {
                console.warn('⚠️ Réponse trop courte, potentiellement vide');
                showError('Réponse invalide du serveur');
                return null;
            }
            // ✨ Analyse du contenu
            console.log('═'.repeat(80));
            console.log('📊 ANALYSE DE LA RÉPONSE');
            console.log('═'.repeat(80));
            
            console.log('📏 Taille:', html.length.toLocaleString(), 'caractères');
            console.log('📦 Poids:', (html.length / 1024).toFixed(2), 'Ko');
            console.log('⏱️  Temps:', (performance.now() - startTime).toFixed(0), 'ms');
            
            // Détection du type de contenu
            const isHTML = html.trim().startsWith('<!DOCTYPE') || html.trim().startsWith('<html');
            const isJSON = html.trim().startsWith('{') || html.trim().startsWith('[');
            const contentType = isHTML ? '🌐 HTML' : isJSON ? '📋 JSON' : '📄 Texte';
            console.log('🔍 Type détecté:', contentType);
            
            // Comptage des lignes
            const lines = html.split('\n');
            console.log('📝 Nombre de lignes:', lines.length);
            
            console.log('─'.repeat(80));
            console.log('📄 APERÇU DU CONTENU');
            console.log('─'.repeat(80));
            
            // Afficher les 15 premières lignes non vides
            const nonEmptyLines = lines.filter(line => line.trim().length > 0).slice(0, 15);
            
            nonEmptyLines.forEach((line, index) => {
                const lineNum = (index + 1).toString().padStart(2, '0');
                const content = line.trim().substring(0, 100);
                const truncated = content.length < line.trim().length ? '...' : '';
                
                console.log(`%c${lineNum} %c${content}${truncated}`, 
                    'color: #888; font-weight: bold',
                    'color: #333'
                );
            });
            
            if (lines.length > 15) {
                console.log(`%c... et ${lines.length - 15} lignes supplémentaires`, 'color: #888; font-style: italic');
            }
            
            console.log('═'.repeat(80));

            // Si c'est du HTML, afficher quelques stats
            if (isHTML) {
                const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
                const title = titleMatch ? titleMatch[1] : 'Non trouvé';
                
                const scriptCount = (html.match(/<script/gi) || []).length;
                const linkCount = (html.match(/<link/gi) || []).length;
                const divCount = (html.match(/<div/gi) || []).length;
                
                console.log('🏷️  Titre:', title);
                console.log('📊 Statistiques HTML:');
                console.log('   • <script> tags:', scriptCount);
                console.log('   • <link> tags:', linkCount);
                console.log('   • <div> tags:', divCount);
                console.log('═'.repeat(80));
            }


            console.log('⏱️  Temps:', (performance.now() - startTime).toFixed(0), 'ms');
            
            return html;
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ Erreur après', duration, 'ms:', error);
            
            if (error.name === 'AbortError') {
                showError(`Timeout après ${CONFIG.TIMEOUT/1000}s`);
            } else if (error.message.includes('Failed to fetch')) {
                showError('Erreur réseau. Vérifiez votre connexion.');
            } else {
                showError(`Erreur: ${error.message}`);
            }
            
            return null;
        }
    }

    /**
     * 🎬 Gestionnaire du bouton de recherche
     */
    async function handleSearch() {
        const button = document.getElementById('searchButton');
        const originalText = button.textContent;
        
        try {
            // UI: Mode chargement
            button.disabled = true;
            button.textContent = '⏳ Chargement...';
            button.classList.add('loading');
            
            // Récupération de l'URL générée
            const generatedUrl = generateLeboncoinUrl();
            console.log('🔗 URL générée:', generatedUrl);
            
            // Envoi à la Lambda
            const html = await sendToLambda(generatedUrl);
            
            if (!html) {
                throw new Error('Aucune donnée reçue');
            }
            
            // Affichage des résultats
            displayResults(html);
            
            // Log de succès
            console.log('✅ Recherche terminée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur recherche:', error);
            showError(error.message);
            
        } finally {
            // Restauration du bouton
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove('loading');
        }
    }

    /**
     * ⚠️ Affichage d'une erreur
     */
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
    

    /**
     * 📊 Affichage des résultats
     */
    function displayResults(html) {
        const container = document.getElementById('results-container');
        
        try {
            // Parsing du HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extraction des annonces (à adapter selon la structure Leboncoin)
            const annonces = doc.querySelectorAll('[data-qa-id="aditem_container"]');
            
            if (annonces.length === 0) {
                container.innerHTML = `
                    <div class="no-results">
                        <span>😕</span>
                        <p>Aucune annonce trouvée</p>
                    </div>
                `;
                return;
            }
            
            console.log(`📦 ${annonces.length} annonces trouvées`);
            
            // Affichage des annonces
            let resultsHtml = `<h2>📋 ${annonces.length} résultats</h2><div class="annonces-grid">`;
            
            annonces.forEach((annonce, index) => {
                const titre = annonce.querySelector('[data-qa-id="aditem_title"]')?.textContent || 'Sans titre';
                const prix = annonce.querySelector('[data-qa-id="aditem_price"]')?.textContent || 'Prix non spécifié';
                const lien = annonce.querySelector('a')?.href || '#';
                const image = annonce.querySelector('img')?.src || '';
                
                resultsHtml += `
                    <div class="annonce-card" data-index="${index}">
                        ${image ? `<img src="${image}" alt="${titre}" loading="lazy">` : ''}
                        <h3>${titre}</h3>
                        <p class="prix">${prix}</p>
                        <a href="${lien}" target="_blank" rel="noopener">Voir l'annonce →</a>
                    </div>
                `;
            });
            
            resultsHtml += '</div>';
            container.innerHTML = resultsHtml;
            
        } catch (error) {
            console.error('❌ Erreur parsing HTML:', error);
            showError('Impossible d\'analyser les résultats');
        }
    }

    // ========== INITIALISATION ==========
    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('searchButton');
        if (button) {
            button.addEventListener('click', handleSearch);
            console.log('✅ Gestionnaire de recherche initialisé');
        }
    });



    
    // ==========================================
    // FONCTION : FORMATER LES BYTES
    // ==========================================
    
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // ==========================================
    // FONCTION : GÉRER LES ERREURS
    // ==========================================
    
    function handleFetchError(error) {
        let errorMessage = error.message;
        let errorDetails = '';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Timeout dépassé';
            errorDetails = `La requête a pris plus de ${CONFIG.TIMEOUT / 1000} secondes`;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Impossible de contacter l\'API';
            errorDetails = `Vérifiez que l'API est accessible: ${CONFIG.API_URL}`;
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Erreur réseau';
            errorDetails = 'Vérifiez votre connexion internet';
        }
        
        showStatus(errorMessage, 'error', errorDetails);
    }
    
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
            
            console.log('📝 Soumission du formulaire...');
            
            // Récupérer les données
            const formData = getFormData();
            
            // Valider
            const errors = validateForm(formData);
            if (errors.length > 0) {
                showStatus('Erreurs de validation', 'error', errors.join('<br>'));
                return;
            }
            
            // Construire l'URL
            const url = buildLeboncoinUrl(formData);
            
            // Envoyer à Lambda
            await sendToLambda(url);
        });
    }
    
    // Bouton réinitialiser
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetForm);
    }
    
    console.log('✅ Page de recherche prête !');
});
