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
                currentLocationAnnonces = announcements.filter(a => a.type === 'location');
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

        // Stocker le nom du fichier dans la variable globale
        currentFileName = selectedFile;

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
                        type: 'location'
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

   async function saveSearchResults(selectedOnly = false) {
       console.log(`💾 Début de l'enregistrement ${selectedOnly ? 'de la sélection' : 'de toutes les annonces'}...`);

       const saveBtn = selectedOnly ? document.getElementById('saveSelectedBtn') : document.getElementById('saveAllBtn');
       if (!saveBtn) return;

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
                   locationAnnonces = currentAnnonces.filter(annonce => {
                       return annonce.type === 'location';
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
                       if (annonce.type === 'location') {
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

       // Extraire les prix et calculer le prix au m²
       const prices = [];
       const pricesPerM2 = [];

       annonces.forEach((ad, index) => {
           const price = parseFloat((ad.prix || ad.price || '').toString().replace(/[^\d]/g, ''));

           if (price && price > 0) {
               prices.push(price);

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
                   pricesPerM2.push(pricePerM2);
               }
           }
       });

       console.log('📊 Prix extraits:', prices.length);
       console.log('📏 Prix au m² calculés:', pricesPerM2.length);

       if (prices.length === 0) {
           if (statsContainer) statsContainer.style.display = 'none';
           return;
       }

       const minPrice = Math.min(...prices);
       const maxPrice = Math.max(...prices);
       const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

       const minPriceM2 = pricesPerM2.length > 0 ? Math.min(...pricesPerM2) : 0;
       const maxPriceM2 = pricesPerM2.length > 0 ? Math.max(...pricesPerM2) : 0;
       const avgPriceM2 = pricesPerM2.length > 0 ? Math.round(pricesPerM2.reduce((a, b) => a + b, 0) / pricesPerM2.length) : 0;

       // Stocker les valeurs min/max pour les calculs de position
       window.priceChartData = {
           minPrice: minPrice,
           maxPrice: maxPrice,
           minPriceM2: minPriceM2,
           maxPriceM2: maxPriceM2
       };

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
       if (pricesPerM2.length > 0) {
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

           html += `
               <tr data-index="${index}" data-price="${prix}" data-pricem2="${prixM2}" class="annonce-row">
                   <td class="checkbox-col">
                       <input type="checkbox" class="row-checkbox" data-index="${index}">
                   </td>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="annonce-detail.html?file=${encodeURIComponent(currentFileName)}&id=${encodeURIComponent(id)}">👁️ Voir</a>
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

   function initializeChartHoverIndicators() {
       const rows = document.querySelectorAll('.annonce-row');
       const priceIndicator = document.getElementById('price-hover-indicator');
       const priceM2Indicator = document.getElementById('pricem2-hover-indicator');

       if (!priceIndicator) return;

       rows.forEach(row => {
           row.addEventListener('mouseenter', function() {
               const price = parseFloat(this.getAttribute('data-price'));
               const priceM2 = parseFloat(this.getAttribute('data-pricem2'));

               if (!window.priceChartData) return;

               const { minPrice, maxPrice, minPriceM2, maxPriceM2 } = window.priceChartData;

               // Calculer la position pour le prix de vente
               if (price && price > 0 && minPrice && maxPrice) {
                   const percentage = ((price - minPrice) / (maxPrice - minPrice)) * 100;
                   priceIndicator.style.left = `${percentage}%`;
                   priceIndicator.style.display = 'block';
                   priceIndicator.setAttribute('data-value', formatPrice(price));
               }

               // Calculer la position pour le prix au m²
               if (priceM2Indicator && priceM2 && priceM2 > 0 && minPriceM2 && maxPriceM2) {
                   const percentage = ((priceM2 - minPriceM2) / (maxPriceM2 - minPriceM2)) * 100;
                   priceM2Indicator.style.left = `${percentage}%`;
                   priceM2Indicator.style.display = 'block';
                   priceM2Indicator.setAttribute('data-value', `${priceM2} €/m²`);
               }
           });

           row.addEventListener('mouseleave', function() {
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
           
           html += `
               <tr data-index="${index}">
                   <td class="checkbox-col">
                       <input type="checkbox" class="row-checkbox" data-index="${index}">
                   </td>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="annonce-detail.html?file=${encodeURIComponent(currentFileName)}&id=${encodeURIComponent(id)}">👁️ Voir</a>
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
