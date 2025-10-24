/* ==========================================
   ÉLÉMENTS DOM
   ========================================== */

   const loading = document.getElementById('loading');
   const errorMessage = document.getElementById('error-message');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const annoncesContainer = document.getElementById('annonces-container');
    const fileNameDisplay = document.getElementById('fileNameDisplay'); 
   /* ==========================================
      VARIABLES GLOBALES
      ========================================== */

   let currentAnnonces = [];           // Toutes les annonces combinées (vente + location)
   let currentVenteAnnonces = [];      // Annonces de vente actuellement affichées
   let currentLocationAnnonces = [];   // Annonces de location actuellement affichées
   let allVenteAnnonces = [];          // Toutes les annonces de vente chargées (pour sauvegarde)
   let allLocationAnnonces = [];       // Toutes les annonces de location chargées (pour sauvegarde)
   let currentFileName = '';           // Nom du fichier actuellement chargé
   let currentSort = {
       column: null,
       direction: 'asc'
   };
   
   /* ==========================================
      INITIALISATION
      ========================================== */
   
      window.addEventListener('DOMContentLoaded', () => {
        console.log('═══════════════════════════════════════');
        console.log('🎬 === INITIALISATION PAGE ANNONCES ===');
        console.log('═══════════════════════════════════════');

        // ✅ VÉRIFIER SI ON VIENT DE LA PAGE RECHERCHE
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');

        if (source === 'search') {
            console.log('🔍 Source: Recherche');

            // Récupérer les résultats depuis sessionStorage
            const searchResults = sessionStorage.getItem('searchResults');
            const searchStats = sessionStorage.getItem('searchStats');

            if (searchResults) {
                const announcements = JSON.parse(searchResults);
                const stats = searchStats ? JSON.parse(searchStats) : null;

                console.log('✅ Résultats de recherche trouvés:', announcements.length);

                // Séparer les annonces par type
                currentVenteAnnonces = announcements.filter(a => a.type === 'vente');
                currentLocationAnnonces = announcements.filter(a =>
                    a.type === 'location' ||
                    a.type === 'location_meublee' ||
                    a.type === 'location_non_meublee'
                );
                currentAnnonces = announcements;
                allVenteAnnonces = currentVenteAnnonces;
                allLocationAnnonces = currentLocationAnnonces;

                // Afficher le titre
                const fileNameDisplay = document.getElementById('fileNameDisplay');
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = `🔍 Résultats de recherche (${currentVenteAnnonces.length} vente${currentVenteAnnonces.length > 1 ? 's' : ''})`;
                }

                console.log(`📊 Nouvelle recherche: ${currentVenteAnnonces.length} vente, ${currentLocationAnnonces.length} location`);
                console.log(`   Affichage du tableau: ${currentVenteAnnonces.length} annonces de VENTE uniquement`);

                // Afficher UNIQUEMENT les annonces de vente
                hideLoading();
                displayAnnonces(currentVenteAnnonces);

                // Nettoyer le sessionStorage (optionnel)
                // sessionStorage.removeItem('searchResults');
                // sessionStorage.removeItem('searchStats');

                console.log('═══════════════════════════════════════');
                return;
            } else {
                console.warn('⚠️ Aucun résultat de recherche trouvé dans sessionStorage');
                showError('Aucun résultat de recherche. Redirection...');
                setTimeout(() => {
                    window.location.href = 'recherche.html';
                }, 2000);
                return;
            }
        }

        // ✅ MODE NORMAL : Chargement depuis fichier
        console.log('📂 Source: Fichier');

        let selectedFile = urlParams.get('file');

        console.log('📂 Récupération du fichier:');
        console.log('   Depuis URL:', selectedFile);

        // ✅ MÉTHODE 2 : Backup localStorage
        if (!selectedFile) {
            selectedFile = localStorage.getItem('selectedFile');
            console.log('   Depuis localStorage:', selectedFile);
        }

        // ✅ MÉTHODE 3 : Backup sessionStorage
        if (!selectedFile) {
            selectedFile = sessionStorage.getItem('currentFileName');
            console.log('   Depuis sessionStorage:', selectedFile);
        }

        // ✅ MÉTHODE 3 : Re-stocker dans localStorage si trouvé dans URL
        if (selectedFile && !localStorage.getItem('selectedFile')) {
            localStorage.setItem('selectedFile', selectedFile);
            console.log('   ✅ Fichier re-stocké dans localStorage');
        }

        console.log('\n📦 localStorage actuel:');
        console.log('   Nombre d\'items:', localStorage.length);
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log(`   [${i}] ${key} = ${localStorage.getItem(key)}`);
        }

        console.log('\n📄 Fichier final:', selectedFile);
        console.log('   Type:', typeof selectedFile);
        console.log('   Null?:', selectedFile === null);
        console.log('   Vide?:', selectedFile === '');

        if (!selectedFile || selectedFile === 'null' || selectedFile === 'undefined') {
            console.error('❌ Aucun fichier valide trouvé');
            showError('Aucun fichier sélectionné. Redirection dans 3 secondes...');
            setTimeout(() => {
                window.location.href = 'file_selection.html';
            }, 3000);
            return;
        }

        console.log('✅ Fichier validé:', selectedFile);
        console.log('═══════════════════════════════════════');

        // Stocker le nom du fichier dans la variable globale et sessionStorage
        currentFileName = selectedFile;
        sessionStorage.setItem('currentFileName', selectedFile);

        // Afficher le nom du fichier
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = `📄 Fichier : ${selectedFile}`;
        }

        // Charger les annonces
        loadAnnonces(selectedFile);
    });
    

    function showLoading() {
        if (loadingElement) loadingElement.style.display = 'flex';
        if (errorElement) errorElement.style.display = 'none';
        if (annoncesContainer) annoncesContainer.style.display = 'none';
    }

    function hideLoading() {
        if (loadingElement) loadingElement.style.display = 'none';
    }

    function showError(message) {
        console.error('❌ ERREUR:', message);
        hideLoading();
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        if (annoncesContainer) annoncesContainer.style.display = 'none';
    }

    function hideError() {
        if (errorElement) errorElement.style.display = 'none';
    }
   
   /* ==========================================
      CHARGEMENT DES ANNONCES
      ========================================== */
   
      async function loadAnnonces(filename) {
        console.log('═══════════════════════════════════════');
        console.log('🔄 CHARGEMENT DES ANNONCES');
        console.log('   Fichier:', filename);
        console.log('═══════════════════════════════════════');

        showLoading();
        hideError();

        try {
            // Récupérer l'utilisateur connecté
            const userEmail = CONFIG.getCurrentUser();
            if (!userEmail) {
                throw new Error('Utilisateur non authentifié');
            }

            // Utiliser GET_USER_SEARCHES avec les paramètres username et filename
            const apiUrl = CONFIG.getApiUrl('GET_USER_SEARCHES') +
                '?username=' + encodeURIComponent(userEmail) +
                '&filename=' + encodeURIComponent(filename);

            console.log('🌐 Appel API:');
            console.log('   URL:', apiUrl);
            console.log('   User:', userEmail);
            console.log('   Filename:', filename);

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
            
            console.log('📡 Réponse API:');
            console.log('   Status:', response.status);
            console.log('   OK:', response.ok);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('📦 Données reçues:');
            console.log('   Type:', typeof data);
            console.log('   Clés:', Object.keys(data));
            
            // ✅ EXTRACTION INTELLIGENTE DES ANNONCES
            let annonces = [];

            // Cas 1 : Réponse de la Lambda getUserSearches avec filename
            if (data.success && data.data) {
                // data.data contient le contenu du fichier JSON
                const fileContent = data.data;

                // Chercher les annonces dans le contenu du fichier
                if (Array.isArray(fileContent.content)) {
                    annonces = fileContent.content;
                    console.log('✅ Annonces trouvées dans data.data.content');
                } else if (Array.isArray(fileContent.annonces)) {
                    annonces = fileContent.annonces;
                    console.log('✅ Annonces trouvées dans data.data.annonces');
                } else if (Array.isArray(fileContent.ads)) {
                    annonces = fileContent.ads;
                    console.log('✅ Annonces trouvées dans data.data.ads');
                } else if (fileContent.data && (fileContent.data.vente || fileContent.data.location)) {
                    // Format avec data.vente et data.location
                    const vente = (Array.isArray(fileContent.data.vente) ? fileContent.data.vente : []).map(annonce => ({
                        ...annonce,
                        type: 'vente'
                    }));
                    const location = (Array.isArray(fileContent.data.location) ? fileContent.data.location : []).map(annonce => ({
                        ...annonce,
                        // Préserver le type existant (location_meublee, location_non_meublee) ou définir 'location' par défaut
                        type: annonce.type || 'location'
                    }));

                    // Stocker séparément les annonces
                    currentVenteAnnonces = vente;
                    currentLocationAnnonces = location;
                    allVenteAnnonces = vente;
                    allLocationAnnonces = location;

                    // Combiner toutes les annonces pour currentAnnonces (utilisé pour sélection/filtre global)
                    currentAnnonces = [...vente, ...location];

                    // Afficher UNIQUEMENT les annonces de VENTE dans le tableau
                    annonces = vente;

                    console.log('✅ Annonces chargées depuis data.data.data');
                    console.log(`   Vente: ${vente.length}, Location: ${location.length}`);
                    console.log(`   📊 Affichage du tableau: ${vente.length} annonces de VENTE uniquement`);
                } else if (Array.isArray(fileContent)) {
                    annonces = fileContent;
                    console.log('✅ data.data est directement un tableau');
                } else {
                    console.error('❌ Impossible de trouver les annonces dans data.data:', fileContent);
                    throw new Error('Format de fichier invalide - annonces introuvables');
                }
            }
            // Cas 2 : data.content (ancien format)
            else if (data.content && Array.isArray(data.content)) {
                annonces = data.content;
                console.log('✅ Annonces trouvées dans data.content');
            }
            // Cas 3 : data.annonces
            else if (data.annonces && Array.isArray(data.annonces)) {
                annonces = data.annonces;
                console.log('✅ Annonces trouvées dans data.annonces');
            }
            // Cas 4 : data.data (tableau direct)
            else if (data.data && Array.isArray(data.data)) {
                annonces = data.data;
                console.log('✅ Annonces trouvées dans data.data (tableau)');
            }
            // Cas 5 : data.body
            else if (data.body && Array.isArray(data.body)) {
                annonces = data.body;
                console.log('✅ Annonces trouvées dans data.body');
            }
            // Cas 6 : data est directement un tableau
            else if (Array.isArray(data)) {
                annonces = data;
                console.log('✅ data est directement un tableau');
            }
            // Cas 7 : Aucun format reconnu
            else {
                console.error('❌ Structure de données non reconnue:', data);
                throw new Error('Format de données invalide');
            }
            
            console.log('✅ Annonces extraites:');
            console.log('   Nombre:', annonces.length);
            
            if (annonces.length === 0) {
                showError('Aucune annonce trouvée dans ce fichier');
                return;
            }
            
            console.log('   Première annonce:', annonces[0]);
            console.log('═══════════════════════════════════════');
            
            // Stocker et afficher
            currentAnnonces = annonces;
            displayAnnonces(annonces);
            
        } catch (error) {
            console.error('═══════════════════════════════════════');
            console.error('❌ ERREUR:');
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
            console.error('═══════════════════════════════════════');
            
            showError(`Erreur lors du chargement : ${error.message}`);
        } finally {
            hideLoading();
        }
    }


   /* ==========================================
      ENREGISTREMENT DE LA RECHERCHE
      ========================================== */

   // Fonction pour afficher la modale de saisie du nom de fichier
   function showFilenameModal() {
       return new Promise((resolve) => {
           const defaultName = `recherche_${new Date().toISOString().slice(0, 10)}`;

           // Créer l'overlay
           const overlay = document.createElement('div');
           overlay.className = 'filename-modal-overlay';

           // Créer la modale
           const modal = document.createElement('div');
           modal.className = 'filename-modal';

           modal.innerHTML = `
               <div class="filename-modal-header">
                   <div class="filename-modal-icon">💾</div>
                   <h2 class="filename-modal-title">Enregistrer la recherche</h2>
               </div>
               <div class="filename-modal-body">
                   <label class="filename-modal-label" for="filename-input">
                       Nom du fichier :
                   </label>
                   <input
                       type="text"
                       id="filename-input"
                       class="filename-modal-input"
                       value="${defaultName}"
                       placeholder="Ex: ma_recherche"
                   >
                   <div class="filename-modal-hint">
                       L'extension .json sera ajoutée automatiquement
                   </div>
               </div>
               <div class="filename-modal-footer">
                   <button class="filename-modal-btn filename-modal-btn-cancel" id="modal-cancel-btn">
                       Annuler
                   </button>
                   <button class="filename-modal-btn filename-modal-btn-save" id="modal-save-btn">
                       Enregistrer
                   </button>
               </div>
           `;

           overlay.appendChild(modal);
           document.body.appendChild(overlay);

           // Focus sur l'input
           const input = modal.querySelector('#filename-input');
           setTimeout(() => {
               input.focus();
               input.select();
           }, 100);

           // Fonction de nettoyage
           const cleanup = () => {
               overlay.remove();
           };

           // Bouton annuler
           modal.querySelector('#modal-cancel-btn').addEventListener('click', () => {
               cleanup();
               resolve(null);
           });

           // Bouton enregistrer
           modal.querySelector('#modal-save-btn').addEventListener('click', () => {
               const filename = input.value.trim();
               if (filename) {
                   cleanup();
                   resolve(filename);
               } else {
                   input.style.borderColor = 'red';
                   input.focus();
               }
           });

           // Appuyer sur Entrée pour valider
           input.addEventListener('keypress', (e) => {
               if (e.key === 'Enter') {
                   const filename = input.value.trim();
                   if (filename) {
                       cleanup();
                       resolve(filename);
                   }
               }
           });

           // Appuyer sur Échap pour annuler
           input.addEventListener('keydown', (e) => {
               if (e.key === 'Escape') {
                   cleanup();
                   resolve(null);
               }
           });

           // Cliquer sur l'overlay pour annuler
           overlay.addEventListener('click', (e) => {
               if (e.target === overlay) {
                   cleanup();
                   resolve(null);
               }
           });
       });
   }

   async function saveSearchResults(selectedOnly = false) {
       console.log(`💾 Début de l'enregistrement ${selectedOnly ? 'de la sélection' : 'de toutes les annonces'}...`);

       const saveBtn = selectedOnly ? document.getElementById('saveSelectedBtn') : document.getElementById('saveAllBtn');
       if (!saveBtn) return;

       // Demander le nom du fichier à l'utilisateur via la modale
       const fileName = await showFilenameModal();

       // Si l'utilisateur annule ou laisse vide, ne pas continuer
       if (!fileName || fileName.trim() === '') {
           console.log('❌ Enregistrement annulé par l\'utilisateur');
           return;
       }

       try {
           // Désactiver le bouton
           saveBtn.disabled = true;
           saveBtn.classList.add('loading');
           saveBtn.querySelector('.btn-text').textContent = 'Enregistrement...';

           // Récupérer le current user depuis Cognito
           const currentUser = window.userPool?.getCurrentUser();
           if (!currentUser) {
               throw new Error('Utilisateur non connecté');
           }

           // Récupérer l'email depuis les attributs utilisateur
           const userEmail = await new Promise((resolve, reject) => {
               currentUser.getSession((err, session) => {
                   if (err) {
                       reject(new Error('Session invalide'));
                       return;
                   }

                   currentUser.getUserAttributes((err, attributes) => {
                       if (err) {
                           reject(new Error('Impossible de récupérer les attributs utilisateur'));
                           return;
                       }

                       const emailAttribute = attributes.find(attr => attr.getName() === 'email');
                       if (!emailAttribute) {
                           reject(new Error('Email non trouvé'));
                           return;
                       }

                       resolve(emailAttribute.getValue());
                   });
               });
           });

           console.log('👤 Email utilisateur:', userEmail);

           // Récupérer les données
           let venteAnnonces = [];
           let locationAnnonces = [];

           if (selectedOnly) {
               // Mode sélection :
               // - Vente : uniquement les annonces de vente sélectionnées
               // - Location : TOUTES les annonces de location (pas seulement celles sélectionnées)

               const selectedAnnonces = getSelectedAnnonces();
               if (selectedAnnonces.length === 0) {
                   throw new Error('Aucune annonce sélectionnée');
               }

               // Extraire uniquement les annonces de VENTE sélectionnées
               venteAnnonces = selectedAnnonces.filter(annonce => {
                   return annonce.type === 'vente';
               });

               // Récupérer TOUTES les annonces de location
               if (allLocationAnnonces.length > 0) {
                   // Depuis les variables globales si disponibles
                   locationAnnonces = allLocationAnnonces;
                   console.log('📍 Utilisation de allLocationAnnonces');
               } else {
                   // Sinon extraire depuis currentAnnonces en utilisant le champ 'type'
                   // Inclure 'location', 'location_meublee' et 'location_non_meublee'
                   locationAnnonces = currentAnnonces.filter(annonce => {
                       return annonce.type === 'location' ||
                              annonce.type === 'location_meublee' ||
                              annonce.type === 'location_non_meublee';
                   });
                   console.log('📍 Extraction depuis currentAnnonces:', locationAnnonces.length, 'annonces de location');
               }

               console.log(`📊 Sélection: ${venteAnnonces.length} annonces de vente sélectionnées + ${locationAnnonces.length} annonces de location (toutes)`);
           } else {
               // Mode tout : récupérer TOUTES les annonces vente et location
               if (allVenteAnnonces.length > 0 || allLocationAnnonces.length > 0) {
                   // Utiliser les variables globales si disponibles
                   venteAnnonces = allVenteAnnonces;
                   locationAnnonces = allLocationAnnonces;
               } else {
                   // Sinon séparer depuis currentAnnonces en utilisant le champ 'type'
                   currentAnnonces.forEach(annonce => {
                       if (annonce.type === 'location' ||
                           annonce.type === 'location_meublee' ||
                           annonce.type === 'location_non_meublee') {
                           locationAnnonces.push(annonce);
                       } else if (annonce.type === 'vente') {
                           venteAnnonces.push(annonce);
                       }
                   });
               }

               if (venteAnnonces.length === 0 && locationAnnonces.length === 0) {
                   throw new Error('Aucune annonce à enregistrer');
               }

               console.log(`📊 Toutes les annonces: ${venteAnnonces.length} vente, ${locationAnnonces.length} location`);
           }

           const statsData = sessionStorage.getItem('searchStats');

           // Préparer le payload
           const payload = {
               username: userEmail,
               filename: fileName.trim(),
               timestamp: new Date().toISOString(),
               data: {
                   vente: venteAnnonces,
                   location: locationAnnonces,
                   stats: statsData ? JSON.parse(statsData) : {}
               }
           };

           console.log('📦 Payload préparé:', {
               username: userEmail,
               venteCount: payload.data.vente.length,
               locationCount: payload.data.location.length
           });

           // Appeler la Lambda pour enregistrer
           const lambdaUrl = CONFIG.getApiUrl('SAVE_SEARCH') || `${CONFIG.API_URL}/save-search`;
           console.log('🚀 Appel Lambda:', lambdaUrl);

           const response = await fetch(lambdaUrl, {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${localStorage.getItem('idToken')}`
               },
               body: JSON.stringify(payload)
           });

           if (!response.ok) {
               const errorData = await response.json().catch(() => ({}));
               throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
           }

           const result = await response.json();
           console.log('✅ Recherche enregistrée:', result);

           // Animation de succès
           saveBtn.classList.remove('loading');
           saveBtn.classList.add('success');
           saveBtn.querySelector('.btn-icon').textContent = '✅';
           saveBtn.querySelector('.btn-text').textContent = 'Enregistré !';

           // Notification
           showNotification('Recherche enregistrée avec succès !', 'success');

           // Réinitialiser le bouton après 3 secondes
           setTimeout(() => {
               saveBtn.classList.remove('success');
               saveBtn.querySelector('.btn-icon').textContent = '💾';
               saveBtn.querySelector('.btn-text').textContent = 'Enregistrer cette recherche';
               saveBtn.disabled = false;
           }, 3000);

       } catch (error) {
           console.error('❌ Erreur lors de l\'enregistrement:', error);

           // Réactiver le bouton
           saveBtn.disabled = false;
           saveBtn.classList.remove('loading');
           saveBtn.querySelector('.btn-text').textContent = 'Enregistrer cette recherche';

           // Notification d'erreur
           showNotification(`Erreur: ${error.message}`, 'error');
       }
   }

   function showNotification(message, type = 'info') {
       const notification = document.createElement('div');
       notification.className = `notification notification-${type}`;
       notification.style.cssText = `
           position: fixed;
           top: 20px;
           right: 20px;
           background: ${type === 'success' ? '#48bb78' : '#f56565'};
           color: white;
           padding: 1rem 1.5rem;
           border-radius: 8px;
           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
           z-index: 9999;
           animation: slideIn 0.3s ease;
           font-weight: 500;
       `;
       notification.textContent = message;

       document.body.appendChild(notification);

       // Supprimer après 5 secondes
       setTimeout(() => {
           notification.style.animation = 'slideOut 0.3s ease';
           setTimeout(() => notification.remove(), 300);
       }, 5000);
   }

   // Attacher l'événement au bouton
   document.addEventListener('DOMContentLoaded', () => {

       // Bouton "Enregistrer tout"
       const saveAllBtn = document.getElementById('saveAllBtn');
       if (saveAllBtn) {
           saveAllBtn.addEventListener('click', () => saveSearchResults(false));
           console.log('✅ Listener ajouté au bouton "Enregistrer tout"');
       }

       // Bouton "Enregistrer la sélection"
       const saveSelectedBtn = document.getElementById('saveSelectedBtn');
       if (saveSelectedBtn) {
           saveSelectedBtn.addEventListener('click', () => saveSearchResults(true));
           console.log('✅ Listener ajouté au bouton "Enregistrer la sélection"');
       }

       // Bouton "Comparer"
       const compareBtn = document.getElementById('compareBtn');
       if (compareBtn) {
           compareBtn.addEventListener('click', () => {
               const selectedAnnonces = getSelectedAnnonces();
               if (selectedAnnonces.length >= 2 && selectedAnnonces.length <= 5) {
                   // Stocker les annonces sélectionnées dans sessionStorage
                   sessionStorage.setItem('comparaisonAnnonces', JSON.stringify(selectedAnnonces));
                   // Stocker aussi le nom du fichier actuel pour les liens
                   sessionStorage.setItem('comparaisonFileName', currentFileName);
                   // Rediriger vers la page de comparaison
                   window.location.href = 'comparaison.html';
               }
           });
           console.log('✅ Listener ajouté au bouton "Comparer"');
       }

   });

   /* ==========================================
      CALCUL DES STATISTIQUES DE PRIX
      ========================================== */

   function calculateRentalStats(annonces) {
       console.log('📊 Calcul des statistiques de location...');

       // Récupérer uniquement les annonces de location depuis sessionStorage
       const locationAnnonces = sessionStorage.getItem('searchResultsLocation');
       let rentalData = [];

       if (locationAnnonces) {
           rentalData = JSON.parse(locationAnnonces);
           console.log('📦 Annonces de location trouvées:', rentalData.length);
       } else {
           // Si pas de données de location séparées, filtrer les annonces actuelles
           // (Heuristique: si le prix contient "€ / mois" ou est < 3000€)
           rentalData = annonces.filter(ad => {
               const prix = ad.prix || '';
               return prix.toString().includes('/ mois') || prix.toString().includes('/mois') ||
                      (parseFloat(prix.toString().replace(/[^\d]/g, '')) < 3000 && parseFloat(prix.toString().replace(/[^\d]/g, '')) > 0);
           });
           console.log('🔍 Locations détectées par heuristique:', rentalData.length);
       }

       if (rentalData.length === 0) {
           console.log('⚠️ Aucune annonce de location trouvée');
           return null;
       }

       // Fonction pour extraire le nombre de pièces
       function extractRooms(title, description) {
           const text = `${title || ''} ${description || ''}`.toLowerCase();
           const patterns = [
               /(\d+)\s*pi[èe]ces?/i,
               /t(\d+)/i,
               /f(\d+)/i,
               /(\d+)\s*p\b/i
           ];

           for (const pattern of patterns) {
               const match = text.match(pattern);
               if (match) {
                   return parseInt(match[1]);
               }
           }
           return null;
       }

       // Fonction pour extraire le prix (nombre seulement)
       function extractPrice(priceStr) {
           if (!priceStr) return null;
           const priceString = priceStr.toString();
           const match = priceString.match(/(\d+[\s\d]*)/);
           if (match) {
               return parseFloat(match[1].replace(/\s/g, ''));
           }
           return null;
       }

       // Grouper par nombre de pièces
       const groupedByRooms = {};

       rentalData.forEach(ad => {
           const rooms = extractRooms(ad.titre || ad.title, ad.description);
           const price = extractPrice(ad.prix || ad.price);

           if (rooms && price && price > 0 && price < 5000) { // Filtrer les prix aberrants
               if (!groupedByRooms[rooms]) {
                   groupedByRooms[rooms] = [];
               }
               groupedByRooms[rooms].push(price);
           }
       });

       // Calculer les moyennes
       const stats = {};
       Object.keys(groupedByRooms).forEach(rooms => {
           const prices = groupedByRooms[rooms];
           const sum = prices.reduce((a, b) => a + b, 0);
           const avg = sum / prices.length;
           stats[rooms] = {
               count: prices.length,
               average: Math.round(avg),
               min: Math.min(...prices),
               max: Math.max(...prices)
           };
       });

       console.log('📊 Statistiques calculées:', stats);
       return stats;
   }

   function displaySalesPriceCharts(annonces) {
       const statsContainer = document.getElementById('stats-container');
       const statsContent = document.getElementById('stats-content');

       if (!annonces || annonces.length === 0) {
           console.log('⚠️ Pas d\'annonces à afficher');
           if (statsContainer) statsContainer.style.display = 'none';
           return;
       }

       console.log('🎨 Affichage des graphiques de prix...');

       // Extraire les prix et calculer le prix au m², groupés par nombre de pièces
       const pricesByRooms = {};
       const pricesPerM2ByRooms = {};

       annonces.forEach((ad, index) => {
           const price = parseFloat((ad.prix || ad.price || '').toString().replace(/[^\d]/g, ''));
           const pieces = ad.pieces || ad.rooms || ad.nb_pieces || 'all';

           if (price && price > 0) {
               // Initialiser les tableaux pour ce nombre de pièces
               if (!pricesByRooms[pieces]) {
                   pricesByRooms[pieces] = [];
                   pricesPerM2ByRooms[pieces] = [];
               }

               pricesByRooms[pieces].push(price);

               // Utiliser le prix_m2 directement s'il existe, sinon le calculer
               let pricePerM2 = parseFloat((ad.prix_m2 || '').toString().replace(/[^\d]/g, ''));

               if (!pricePerM2 || pricePerM2 === 0) {
                   // Essayer de calculer avec surface_m2
                   const surface = parseFloat((ad.surface_m2 || ad.surface || '').toString().replace(/[^\d]/g, ''));
                   if (surface && surface > 0) {
                       pricePerM2 = Math.round(price / surface);
                   }
               }

               if (pricePerM2 && pricePerM2 > 0) {
                   pricesPerM2ByRooms[pieces].push(pricePerM2);
               }
           }
       });

       // Calculer les stats globales (toutes pièces confondues)
       const allPrices = [];
       const allPricesPerM2 = [];
       Object.values(pricesByRooms).forEach(prices => allPrices.push(...prices));
       Object.values(pricesPerM2ByRooms).forEach(prices => allPricesPerM2.push(...prices));

       console.log('📊 Prix extraits:', allPrices.length);
       console.log('📏 Prix au m² calculés:', allPricesPerM2.length);

       if (allPrices.length === 0) {
           if (statsContainer) statsContainer.style.display = 'none';
           return;
       }

       const minPrice = Math.min(...allPrices);
       const maxPrice = Math.max(...allPrices);
       const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);

       const minPriceM2 = allPricesPerM2.length > 0 ? Math.min(...allPricesPerM2) : 0;
       const maxPriceM2 = allPricesPerM2.length > 0 ? Math.max(...allPricesPerM2) : 0;
       const avgPriceM2 = allPricesPerM2.length > 0 ? Math.round(allPricesPerM2.reduce((a, b) => a + b, 0) / allPricesPerM2.length) : 0;

       // Stocker les stats par nombre de pièces ET les stats globales
       window.priceChartData = {
           global: {
               minPrice: minPrice,
               maxPrice: maxPrice,
               avgPrice: avgPrice,
               minPriceM2: minPriceM2,
               maxPriceM2: maxPriceM2,
               avgPriceM2: avgPriceM2
           },
           byRooms: {
               // Ajouter une clé 'all' pour les stats globales
               'all': {
                   minPrice: minPrice,
                   maxPrice: maxPrice,
                   avgPrice: avgPrice,
                   minPriceM2: minPriceM2,
                   maxPriceM2: maxPriceM2,
                   avgPriceM2: avgPriceM2
               }
           }
       };

       // Calculer les stats pour chaque nombre de pièces
       Object.keys(pricesByRooms).forEach(rooms => {
           const prices = pricesByRooms[rooms];
           const pricesM2 = pricesPerM2ByRooms[rooms] || [];

           window.priceChartData.byRooms[rooms] = {
               minPrice: Math.min(...prices),
               maxPrice: Math.max(...prices),
               avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
               minPriceM2: pricesM2.length > 0 ? Math.min(...pricesM2) : 0,
               maxPriceM2: pricesM2.length > 0 ? Math.max(...pricesM2) : 0,
               avgPriceM2: pricesM2.length > 0 ? Math.round(pricesM2.reduce((a, b) => a + b, 0) / pricesM2.length) : 0
           };
       });

       console.log('📊 Stats par pièces:', window.priceChartData.byRooms);

       // Version compacte avec titres à gauche
       let html = '<div class="price-charts-compact">';

       // Graphique Prix de vente
       html += `
           <div class="chart-row-horizontal">
               <div class="chart-title-left">💰 Prix de vente :</div>
               <div class="price-range-bar" id="price-chart-bar">
                   <div class="range-gradient"></div>
                   <div class="hover-indicator" id="price-hover-indicator" style="display: none;"></div>
                   <div class="range-marker range-marker-min" style="left: 0%">
                       <div class="marker-value">${formatPrice(minPrice)}</div>
                   </div>
                   <div class="range-marker range-marker-avg" style="left: 50%">
                       <div class="marker-value">${formatPrice(avgPrice)}</div>
                   </div>
                   <div class="range-marker range-marker-max" style="right: 0%">
                       <div class="marker-value">${formatPrice(maxPrice)}</div>
                   </div>
               </div>
           </div>
       `;

       // Graphique Prix au m² (si disponible)
       if (allPricesPerM2.length > 0) {
           html += `
               <div class="chart-row-horizontal">
                   <div class="chart-title-left">📏 Prix au m² :</div>
                   <div class="price-range-bar" id="pricem2-chart-bar">
                       <div class="range-gradient"></div>
                       <div class="hover-indicator" id="pricem2-hover-indicator" style="display: none;"></div>
                       <div class="range-marker range-marker-min" style="left: 0%">
                           <div class="marker-value">${minPriceM2} €/m²</div>
                       </div>
                       <div class="range-marker range-marker-avg" style="left: 50%">
                           <div class="marker-value">${avgPriceM2} €/m²</div>
                       </div>
                       <div class="range-marker range-marker-max" style="right: 0%">
                           <div class="marker-value">${maxPriceM2} €/m²</div>
                       </div>
                   </div>
               </div>
           `;
       }

       html += '</div>';

       if (statsContent) {
           statsContent.innerHTML = html;
       }

       if (statsContainer) {
           statsContainer.style.display = 'block';
       }

       // Initialiser le comportement sticky
       initStickyBehavior();

       console.log('✅ Graphiques affichés');
   }

   function initStickyBehavior() {
       const statsContainer = document.getElementById('stats-container');

       if (!statsContainer) {
           console.log('❌ stats-container introuvable');
           return;
       }

       // Éviter de créer plusieurs listeners
       if (window.stickyScrollInitialized) return;
       window.stickyScrollInitialized = true;

       console.log('✅ Initialisation du comportement sticky');

       // Rendre les stats sticky immédiatement (toujours sous la nav)
       statsContainer.classList.add('stats-sticky');

       // Plus de changement de taille au scroll - les graphiques gardent toujours la même taille
   }

   function formatPrice(price) {
       return new Intl.NumberFormat('fr-FR', {
           style: 'currency',
           currency: 'EUR',
           minimumFractionDigits: 0,
           maximumFractionDigits: 0
       }).format(price);
   }

   /* ==========================================
      AFFICHAGE DES ANNONCES
      ========================================== */

   function displayAnnonces(annonces) {
       console.log('🎨 === AFFICHAGE ANNONCES ===');
       console.log('   Nombre:', annonces.length);

       // Afficher les graphiques de prix pour les annonces de vente
       displaySalesPriceCharts(annonces);

       if (!annonces || annonces.length === 0) {
           showEmptyState();
           return;
       }
       
       // Déterminer le type d'annonce
       const isLocation = annonces[0]?.hasOwnProperty('furnished') || 
                         annonces[0]?.hasOwnProperty('prix_m2');
       
       let html = `
           <div class="results-header">
               <h3>📊 ${annonces.length} annonce(s) ${isLocation ? 'de location' : 'de vente'}</h3>
               <button id="toggleFiltersBtn" class="btn-toggle-filters">
                   <span class="btn-icon">🔍</span>
                   <span class="btn-text">Filtrer</span>
               </button>
           </div>
           <div id="filters-wrapper"></div>
           <div class="table-responsive">
               <table class="annonces-table">
                   <thead>
                       <tr>
                           <th class="checkbox-col">
                               <input type="checkbox" id="selectAll" title="Tout sélectionner/désélectionner">
                           </th>
                           <th data-sort="id" class="sortable">
                               🆔 ID <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="localisation" class="sortable">
                               📍 Localisation <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="quartier" class="sortable">
                               🏘️ Quartier <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="pieces" class="sortable">
                               🏠 Pièces <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="surface" class="sortable">
                               📏 Surface <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="prix" class="sortable">
                               💰 Prix ${isLocation ? '/mois' : ''} <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="prix_m2" class="sortable">
                               📊 Prix/m² <span class="sort-icon">⇅</span>
                           </th>
                           <th data-sort="age" class="sortable">
                               ⏰ Âge <span class="sort-icon">⇅</span>
                           </th>
                           <th>📝 Description</th>
                           <th>🔗 Lien</th>
                       </tr>
                   </thead>
                   <tbody id="annoncesTableBody">
       `;
       
       annonces.forEach((annonce, index) => {
           const id = escapeHtml(annonce.id || index + 1);
           const localisation = escapeHtml(annonce.localisation || annonce.location || 'Non spécifié');
           const quartier = escapeHtml(annonce.quartier || '-');
           const description = escapeHtml(annonce.description || 'Aucune description');
           const url = annonce.url || annonce.link || annonce.lien || '#';

           const prix = annonce.prix || annonce.price || 0;
           const prixFormate = formatPrice(prix);

           const surface = annonce.surface_m2 || annonce.surface || null;
           const surfaceDisplay = surface ? `${surface} m²` : 'N/A';

           const pieces = annonce.pieces || annonce.rooms || annonce.nb_pieces || 'N/A';

           let prixM2 = 0;
           let prixM2Display = 'N/A';
           if (prix && surface && surface > 0) {
               prixM2 = Math.round(prix / surface);
               prixM2Display = formatPrice(prixM2) + '/m²';
           }

           const ageInfo = calculateAnnonceAge(annonce);

           // Utiliser currentFileName ou le récupérer de sessionStorage comme fallback
           const fileName = currentFileName || sessionStorage.getItem('currentFileName') || '';

           html += `
               <tr data-index="${index}" data-price="${prix}" data-pricem2="${prixM2}" data-pieces="${pieces}" class="annonce-row">
                   <td class="checkbox-col">
                       <input type="checkbox" class="row-checkbox" data-index="${index}">
                   </td>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="quartier">${quartier}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="annonce-detail.html?file=${encodeURIComponent(fileName)}&id=${encodeURIComponent(id)}">👁️ Voir</a>
                   </td>
               </tr>
           `;
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

       console.log('   ✅ Tableau généré');

       // Vérifier que le bouton existe
       const toggleBtn = document.getElementById('toggleFiltersBtn');
       console.log('🔍 DEBUG: Bouton toggleFiltersBtn trouvé?', !!toggleBtn);
       if (toggleBtn) {
           console.log('🔍 DEBUG: Style du bouton:', window.getComputedStyle(toggleBtn).display);
           console.log('🔍 DEBUG: Classes du bouton:', toggleBtn.className);
       }

       // Ajouter les événements de tri
       document.querySelectorAll('.sortable').forEach(th => {
           th.addEventListener('click', function() {
               const column = this.getAttribute('data-sort');
               sortAnnonces(column);
           });
       });

       // Initialiser les filtres avec un délai pour s'assurer que le script est chargé
       setTimeout(() => {
           if (typeof window.initializeFilters === 'function') {
               console.log('🔍 DEBUG: Appel de initializeFilters()');
               window.initializeFilters();
           } else {
               console.error('❌ window.initializeFilters n\'existe toujours pas');
           }
       }, 100);

       // Ajouter les événements pour les checkboxes
       initializeCheckboxes();

       // Ajouter les événements de survol pour les indicateurs sur les graphiques
       initializeChartHoverIndicators();
   }

   /* ==========================================
      INDICATEURS DE SURVOL SUR LES GRAPHIQUES
      ========================================== */

   function updateChartMarkers(rooms) {
       if (!window.priceChartData) return;

       // Obtenir les stats pour ce nombre de pièces ou les stats globales
       const stats = window.priceChartData.byRooms[rooms] || window.priceChartData.global;

       // Mettre à jour les marqueurs du graphique Prix de vente
       const priceMinMarker = document.querySelector('#price-chart-bar .range-marker-min .marker-value');
       const priceAvgMarker = document.querySelector('#price-chart-bar .range-marker-avg .marker-value');
       const priceMaxMarker = document.querySelector('#price-chart-bar .range-marker-max .marker-value');

       if (priceMinMarker) priceMinMarker.textContent = formatPrice(stats.minPrice);
       if (priceAvgMarker) priceAvgMarker.textContent = formatPrice(stats.avgPrice);
       if (priceMaxMarker) priceMaxMarker.textContent = formatPrice(stats.maxPrice);

       // Mettre à jour les marqueurs du graphique Prix au m²
       const priceM2MinMarker = document.querySelector('#pricem2-chart-bar .range-marker-min .marker-value');
       const priceM2AvgMarker = document.querySelector('#pricem2-chart-bar .range-marker-avg .marker-value');
       const priceM2MaxMarker = document.querySelector('#pricem2-chart-bar .range-marker-max .marker-value');

       if (priceM2MinMarker) priceM2MinMarker.textContent = `${stats.minPriceM2} €/m²`;
       if (priceM2AvgMarker) priceM2AvgMarker.textContent = `${stats.avgPriceM2} €/m²`;
       if (priceM2MaxMarker) priceM2MaxMarker.textContent = `${stats.maxPriceM2} €/m²`;

       // Stocker temporairement les stats actuelles pour le calcul de position de l'indicateur
       window.currentChartStats = stats;
   }

   function initializeChartHoverIndicators() {
       const rows = document.querySelectorAll('.annonce-row');
       const priceIndicator = document.getElementById('price-hover-indicator');
       const priceM2Indicator = document.getElementById('pricem2-hover-indicator');

       if (!priceIndicator) return;

       rows.forEach(row => {
           row.addEventListener('mouseenter', function() {
               const price = parseFloat(this.getAttribute('data-price'));
               const priceM2 = parseFloat(this.getAttribute('data-pricem2'));
               const pieces = this.getAttribute('data-pieces');

               if (!window.priceChartData) return;

               // Mettre à jour les marqueurs avec les stats du nombre de pièces
               updateChartMarkers(pieces);

               // Utiliser les stats du nombre de pièces pour calculer la position
               const stats = window.currentChartStats || window.priceChartData.global;

               // Calculer la position pour le prix de vente
               if (price && price > 0 && stats.minPrice && stats.maxPrice) {
                   const percentage = ((price - stats.minPrice) / (stats.maxPrice - stats.minPrice)) * 100;
                   priceIndicator.style.left = `${Math.max(0, Math.min(100, percentage))}%`;
                   priceIndicator.style.display = 'block';
                   priceIndicator.setAttribute('data-value', formatPrice(price));
               }

               // Calculer la position pour le prix au m²
               if (priceM2Indicator && priceM2 && priceM2 > 0 && stats.minPriceM2 && stats.maxPriceM2) {
                   const percentage = ((priceM2 - stats.minPriceM2) / (stats.maxPriceM2 - stats.minPriceM2)) * 100;
                   priceM2Indicator.style.left = `${Math.max(0, Math.min(100, percentage))}%`;
                   priceM2Indicator.style.display = 'block';
                   priceM2Indicator.setAttribute('data-value', `${priceM2} €/m²`);
               }
           });

           row.addEventListener('mouseleave', function() {
               // Restaurer les stats globales
               updateChartMarkers('all');

               priceIndicator.style.display = 'none';
               if (priceM2Indicator) {
                   priceM2Indicator.style.display = 'none';
               }
           });
       });
   }

   /* ==========================================
      TRI DES ANNONCES
      ========================================== */
   
   function sortAnnonces(column) {
       console.log('🔄 Tri par:', column);
       
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

               case 'quartier':
                   valA = (a.quartier || '').toLowerCase();
                   valB = (b.quartier || '').toLowerCase();
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
           
           let comparison = typeof valA === 'string' 
               ? valA.localeCompare(valB, 'fr') 
               : valA - valB;
               
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
           const quartier = escapeHtml(annonce.quartier || '-');
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

           // Utiliser currentFileName ou le récupérer de sessionStorage comme fallback
           const fileName = currentFileName || sessionStorage.getItem('currentFileName') || '';

           html += `
               <tr data-index="${index}">
                   <td class="checkbox-col">
                       <input type="checkbox" class="row-checkbox" data-index="${index}">
                   </td>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="quartier">${quartier}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="annonce-detail.html?file=${encodeURIComponent(fileName)}&id=${encodeURIComponent(id)}">👁️ Voir</a>
                   </td>
               </tr>
           `;
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
               activeTh.classList.add(
                   currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc'
               );
               const icon = activeTh.querySelector('.sort-icon');
               if (icon) {
                   icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
               }
           }
       }
   }
   
   /* ==========================================
      CALCUL ÂGE ANNONCE
      ========================================== */
   
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
           return { 
               display: 'N/A', 
               tooltip: 'Date non disponible', 
               class: 'age-unknown' 
           };
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
   
   /* ==========================================
      ÉTATS DE L'UI
      ========================================== */
   
   function showLoading(show) {
       if (loading) {
           loading.style.display = show ? 'flex' : 'none';
       }
   }
   
   function showError(message) {
       if (errorMessage) {
           errorMessage.textContent = `❌ ${message}`;
           errorMessage.style.display = 'block';
       }
       showLoading(false);
       if (annoncesContainer) {
           annoncesContainer.style.display = 'none';
       }
   }
   
   function hideError() {
       if (errorMessage) {
           errorMessage.style.display = 'none';
       }
   }
   
   function showEmptyState() {
       if (annoncesContainer) {
           annoncesContainer.innerHTML = `
               <div class="empty-state">
                   <div class="empty-icon">📭</div>
                   <h2>Aucune annonce trouvée</h2>
                   <p>Ce fichier ne contient pas d'annonces.</p>
                   <a href="file_selection.html" class="btn btn-primary">
                       ← Choisir un autre fichier
                   </a>
               </div>
           `;
           annoncesContainer.style.display = 'block';
       }
       showLoading(false);
   }
   
   /* ==========================================
      UTILITAIRES
      ========================================== */
   
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
   
   /* ==========================================
      GESTION DES CHECKBOXES ET SÉLECTION
      ========================================== */

   function initializeCheckboxes() {
       console.log('✅ Initialisation des checkboxes');

       // Checkbox "Tout sélectionner"
       const selectAllCheckbox = document.getElementById('selectAll');
       if (selectAllCheckbox) {
           selectAllCheckbox.addEventListener('change', function() {
               const checkboxes = document.querySelectorAll('.row-checkbox');
               checkboxes.forEach(cb => {
                   cb.checked = this.checked;
               });
               updateSelectionCount();
           });
       }

       // Checkboxes individuelles
       const rowCheckboxes = document.querySelectorAll('.row-checkbox');
       rowCheckboxes.forEach(checkbox => {
           checkbox.addEventListener('change', updateSelectionCount);
       });

       updateSelectionCount();
   }

   function updateSelectionCount() {
       const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
       const count = selectedCheckboxes.length;
       const totalCheckboxes = document.querySelectorAll('.row-checkbox').length;

       // Mettre à jour le compteur sur le bouton
       const selectionCountSpan = document.querySelector('.selection-count');
       if (selectionCountSpan) {
           selectionCountSpan.textContent = `(${count})`;
       }

       // Désactiver le bouton "Enregistrer la sélection" si aucune sélection
       const saveSelectedBtn = document.getElementById('saveSelectedBtn');
       if (saveSelectedBtn) {
           if (count === 0) {
               saveSelectedBtn.disabled = true;
               saveSelectedBtn.style.opacity = '0.5';
               saveSelectedBtn.style.cursor = 'not-allowed';
           } else {
               saveSelectedBtn.disabled = false;
               saveSelectedBtn.style.opacity = '1';
               saveSelectedBtn.style.cursor = 'pointer';
           }
       }

       // Gérer le bouton "Comparer"
       const compareBtn = document.getElementById('compareBtn');
       const compareCountSpan = document.querySelector('.compare-count');
       if (compareBtn) {
           if (count >= 2 && count <= 5) {
               // Afficher le bouton si 2 à 5 annonces sélectionnées
               compareBtn.style.display = 'flex';
               compareBtn.disabled = false;
               compareBtn.style.opacity = '1';
               compareBtn.style.cursor = 'pointer';
               if (compareCountSpan) {
                   compareCountSpan.textContent = `(${count})`;
               }
           } else {
               // Cacher ou désactiver si moins de 2 ou plus de 5
               if (count > 5) {
                   compareBtn.style.display = 'flex';
                   compareBtn.disabled = true;
                   compareBtn.style.opacity = '0.5';
                   compareBtn.style.cursor = 'not-allowed';
                   compareBtn.title = 'Maximum 5 annonces pour la comparaison';
                   if (compareCountSpan) {
                       compareCountSpan.textContent = `(${count} - Max 5)`;
                   }
               } else {
                   compareBtn.style.display = 'none';
               }
           }
       }

       // Mettre à jour la checkbox "Tout sélectionner"
       const selectAllCheckbox = document.getElementById('selectAll');
       if (selectAllCheckbox) {
           selectAllCheckbox.checked = count === totalCheckboxes && count > 0;
           selectAllCheckbox.indeterminate = count > 0 && count < totalCheckboxes;
       }

       console.log(`📊 Sélection: ${count}/${totalCheckboxes} annonces`);
   }

   function getSelectedAnnonces() {
       const selectedIndices = [];
       const checkboxes = document.querySelectorAll('.row-checkbox:checked');
       checkboxes.forEach(cb => {
           const index = parseInt(cb.getAttribute('data-index'));
           selectedIndices.push(index);
       });

       return currentAnnonces.filter((_, index) => selectedIndices.includes(index));
   }
