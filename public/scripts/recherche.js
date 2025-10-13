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
        previewBtn: document.getElementById('previewBtn'),
        copyUrlBtn: document.getElementById('copyUrlBtn'),
        
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
        urlPreview: document.getElementById('urlPreview'),
        generatedUrl: document.getElementById('generatedUrl'),
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
        
        // Catégorie (toujours présente)
        params.append('category', formData.category);
        
        // Localisation
        if (formData.ville && formData.codePostal) {
            const location = `${formData.ville}_${formData.codePostal}__`;
            params.append('locations', location);
        }
        
        // Prix
        if (formData.prixMin || formData.prixMax) {
            const prixMin = formData.prixMin || '0';
            const prixMax = formData.prixMax || '999999';
            params.append('price', `${prixMin}-${prixMax}`);
        }
        
        // Surface
        if (formData.surfaceMin || formData.surfaceMax) {
            const surfMin = formData.surfaceMin || '0';
            const surfMax = formData.surfaceMax || '999';
            params.append('square', `${surfMin}-${surfMax}`);
        }
        
        // Pièces
        if (formData.piecesMin || formData.piecesMax) {
            const piecMin = formData.piecesMin || '1';
            const piecMax = formData.piecesMax || '10';
            params.append('rooms', `${piecMin}-${piecMax}`);
        }
        
        // Chambres
        if (formData.chambresMin || formData.chambresMax) {
            const chambMin = formData.chambresMin || '1';
            const chambMax = formData.chambresMax || '10';
            params.append('bedrooms', `${chambMin}-${chambMax}`);
        }
        
        const finalUrl = `${baseUrl}?${params.toString()}`;
        console.log('✅ URL générée:', finalUrl);
        
        return finalUrl;
    }
    
    // ==========================================
    // FONCTION : AFFICHER L'APERÇU DE L'URL
    // ==========================================
    
    function showUrlPreview(url) {
        if (!elements.urlPreview || !elements.generatedUrl) {
            console.warn('⚠️ Zone d\'aperçu introuvable');
            return;
        }
        
        elements.generatedUrl.value = url;
        elements.urlPreview.style.display = 'block';
        
        elements.urlPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // ==========================================
    // FONCTION : AFFICHER LES ERREURS
    // ==========================================
    
    function showErrors(errors) {
        if (!elements.statusMessage) return;
        
        elements.statusMessage.className = 'status-message error';
        elements.statusMessage.innerHTML = `
            <strong>❌ Erreurs détectées :</strong>
            <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                ${errors.map(err => `<li>${err}</li>`).join('')}
            </ul>
        `;
        elements.statusMessage.style.display = 'block';
        
        elements.statusMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // ==========================================
    // FONCTION : TÉLÉCHARGER ET AFFICHER LE CONTENU
    // ==========================================
    async function fetchAndDisplayContent(url) {
        console.log('🌐 Récupération du contenu de:', url);
        
        const apiEndpoint = `${ENV_CONFIG.API_URL}/page`;
        
        console.log('🔗 Endpoint API:', apiEndpoint);
        
        try {
            // Afficher un message de chargement
            if (elements.statusMessage) {
                elements.statusMessage.className = 'status-message loading';
                elements.statusMessage.innerHTML = `
                    <strong>⏳ Récupération du contenu...</strong>
                    <small>Utilisation de vos headers navigateur pour éviter la détection...</small>
                `;
                elements.statusMessage.style.display = 'block';
            }
            
            // 🔥 CAPTURER LES HEADERS DE L'UTILISATEUR
            const userHeaders = await getUserHeaders();
            
            console.log('📡 Envoi requête avec headers utilisateur');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), ENV_CONFIG.TIMEOUT);
            
            // 🔥 ENVOYER EN POST AVEC LES HEADERS
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    userHeaders: userHeaders  // 🔥 Envoyer les headers
                })
            });
            
            clearTimeout(timeoutId);
            
            console.log('📡 Status HTTP:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ 
                    error: `Erreur HTTP ${response.status}` 
                }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('✅ Réponse API reçue');
            console.log('📊 Données:', {
                success: data.success,
                contentLength: data.content?.length,
                title: data.title,
                headersUsed: data.headersUsed,
                userAgent: data.userAgent
            });
            
            // Afficher aperçu dans la console
            displayContentPreview(data.content);
            
            // Afficher les statistiques dans l'interface
            if (elements.statusMessage) {
                elements.statusMessage.className = 'status-message success';
                elements.statusMessage.innerHTML = `
                    <strong>✅ Contenu récupéré avec succès</strong>
                    <small>Avec vos headers navigateur (anti-détection activée)</small>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.1); border-radius: 4px; font-family: monospace; font-size: 0.85em;">
                        📊 Statistiques:<br>
                        • Taille: ${formatBytes(data.content.length)}<br>
                        • Titre: ${data.title || 'N/A'}<br>
                        • Headers utilisés: ${data.headersUsed || 'N/A'}<br>
                        • User-Agent: ${data.userAgent?.substring(0, 50)}...<br>
                        ${data.detectionFlags?.hasDataDome ? '⚠️ DataDome détecté<br>' : ''}
                        ${data.detectionFlags?.hasCaptcha ? '⚠️ Captcha détecté<br>' : ''}
                    </div>
                `;
            }
            
            return data.content;
            
        } catch (error) {
            console.error('❌ Erreur API:', error);
            handleFetchError(error);
            return null;
        }
    }
    
    // ==========================================
    // FONCTION : AFFICHER L'APERÇU DU CONTENU
    // ==========================================
    
    function displayContentPreview(content) {
        if (!content) return;
        
        const lines = content.split('\n');
        const previewLines = 50;
        
        console.log('📄 ========================================');
        console.log(`📄 APERÇU DES ${previewLines} PREMIÈRES LIGNES:`);
        console.log('📄 ========================================');
        
        lines.slice(0, previewLines).forEach((line, index) => {
            console.log(`${(index + 1).toString().padStart(3, '0')} | ${line}`);
        });
        
        console.log('📄 ========================================');
        console.log(`📄 Total: ${lines.length} lignes | ${formatBytes(content.length)}`);
        console.log('📄 ========================================');
    }
    
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
            errorDetails = `La requête a pris plus de ${ENV_CONFIG.TIMEOUT / 1000} secondes`;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Impossible de contacter l\'API';
            errorDetails = `Vérifiez que l'API est accessible: ${ENV_CONFIG.API_URL}`;
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Erreur réseau';
            errorDetails = 'Vérifiez votre connexion internet';
        }
        
        if (elements.statusMessage) {
            elements.statusMessage.className = 'status-message error';
            elements.statusMessage.innerHTML = `
                <strong>❌ ${errorMessage}</strong>
                <small>${errorDetails || error.message}</small>
            `;
        }
    }
    
    // ==========================================
    // FONCTION : TÉLÉCHARGER LA PAGE HTML
    // ==========================================
    async function downloadPage(url) {
        if (!elements.statusMessage) return;
        
        console.log('📥 Téléchargement de la page:', url);
        
        // Récupérer le contenu via Lambda avec headers utilisateur
        const content = await fetchAndDisplayContent(url);
        
        if (content) {
            // Créer un blob et télécharger
            const blob = new Blob([content], { type: 'text/html' });
            const downloadUrl = URL.createObjectURL(blob);
            
            // Créer un nom de fichier
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `leboncoin_${timestamp}.html`;
            
            // Créer un lien de téléchargement
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Nettoyer
            URL.revokeObjectURL(downloadUrl);
            
            console.log('✅ Fichier téléchargé:', filename);
            
            // Mettre à jour le message
            if (elements.statusMessage && elements.statusMessage.className === 'status-message success') {
                elements.statusMessage.innerHTML += `
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(76, 175, 80, 0.1); border-radius: 4px;">
                        📥 <strong>Fichier téléchargé: ${filename}</strong>
                    </div>
                `;
            }
        }
    }
    
    // ==========================================
    // FONCTION : RÉINITIALISER LE FORMULAIRE
    // ==========================================
    
    function resetForm() {
        if (!elements.searchForm) return;
        
        elements.searchForm.reset();
        
        if (elements.urlPreview) elements.urlPreview.style.display = 'none';
        if (elements.statusMessage) elements.statusMessage.style.display = 'none';
        
        console.log('🔄 Formulaire réinitialisé');
    }
    
    // ==========================================
    // FONCTION : COPIER L'URL
    // ==========================================
    
    function copyUrlToClipboard() {
        if (!elements.generatedUrl) return;
        
        elements.generatedUrl.select();
        document.execCommand('copy');
        
        const originalText = elements.copyUrlBtn ? elements.copyUrlBtn.textContent : '';
        if (elements.copyUrlBtn) {
            elements.copyUrlBtn.textContent = '✅ Copié !';
            setTimeout(() => {
                elements.copyUrlBtn.textContent = originalText;
            }, 2000);
        }
        
        console.log('📋 URL copiée');
    }
    
    // ==========================================
    // GESTIONNAIRES D'ÉVÉNEMENTS
    // ==========================================
    
    // Soumission du formulaire
    if (elements.searchForm) {
        elements.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('📥 Soumission du formulaire');
            
            const formData = getFormData();
            const errors = validateForm(formData);
            
            if (errors.length > 0) {
                showErrors(errors);
                return;
            }
            
            const url = buildLeboncoinUrl(formData);
            showUrlPreview(url);
            downloadPage(url);
        });
    }
    
    // Bouton aperçu
    if (elements.previewBtn) {
        elements.previewBtn.addEventListener('click', () => {
            console.log('👁️ Aperçu de l\'URL');
            
            const formData = getFormData();
            const errors = validateForm(formData);
            
            if (errors.length > 0) {
                showErrors(errors);
                return;
            }
            
            const url = buildLeboncoinUrl(formData);
            showUrlPreview(url);
            
            if (elements.statusMessage) {
                elements.statusMessage.style.display = 'none';
            }
        });
    }
    
    // Bouton reset
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetForm);
    }
    
    // Bouton copier
    if (elements.copyUrlBtn) {
        elements.copyUrlBtn.addEventListener('click', copyUrlToClipboard);
    }
    
    console.log('✅ Page de recherche prête avec capture des headers utilisateur !');
});
