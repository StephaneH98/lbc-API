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
   
   let currentAnnonces = [];
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
        
        // ✅ MÉTHODE 1 : Récupérer depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
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
            const urlTemplate = CONFIG.getApiUrl('GET_FILE_DATA');
            const apiUrl = urlTemplate.replace('{filename}', encodeURIComponent(filename));
            
            console.log('🌐 Appel API:');
            console.log('   URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
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
            
            // Cas 1 : data.content (votre cas actuel)
            if (data.content && Array.isArray(data.content)) {
                annonces = data.content;
                console.log('✅ Annonces trouvées dans data.content');
            }
            // Cas 2 : data.annonces
            else if (data.annonces && Array.isArray(data.annonces)) {
                annonces = data.annonces;
                console.log('✅ Annonces trouvées dans data.annonces');
            }
            // Cas 3 : data.data
            else if (data.data && Array.isArray(data.data)) {
                annonces = data.data;
                console.log('✅ Annonces trouvées dans data.data');
            }
            // Cas 4 : data.body
            else if (data.body && Array.isArray(data.body)) {
                annonces = data.body;
                console.log('✅ Annonces trouvées dans data.body');
            }
            // Cas 5 : data est directement un tableau
            else if (Array.isArray(data)) {
                annonces = data;
                console.log('✅ data est directement un tableau');
            }
            // Cas 6 : Aucun format reconnu
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
      AFFICHAGE DES ANNONCES
      ========================================== */
   
   function displayAnnonces(annonces) {
       console.log('🎨 === AFFICHAGE ANNONCES ===');
       console.log('   Nombre:', annonces.length);
       
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
           </div>
           <div class="table-responsive">
               <table class="annonces-table">
                   <thead>
                       <tr>
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
           
           let prixM2Display = 'N/A';
           if (prix && surface && surface > 0) {
               const prixM2 = Math.round(prix / surface);
               prixM2Display = formatPrice(prixM2) + '/m²';
           }
           
           const ageInfo = calculateAnnonceAge(annonce);
           
           html += `
               <tr>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="${url}" target="_blank" rel="noopener noreferrer">🔗 Voir</a>
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
       
       // Ajouter les événements de tri
       document.querySelectorAll('.sortable').forEach(th => {
           th.addEventListener('click', function() {
               const column = this.getAttribute('data-sort');
               sortAnnonces(column);
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
               <tr>
                   <td class="id">${id}</td>
                   <td class="localisation">${localisation}</td>
                   <td class="pieces">${pieces}</td>
                   <td class="surface">${surfaceDisplay}</td>
                   <td class="prix">${prixFormate}</td>
                   <td class="prix-m2">${prixM2Display}</td>
                   <td class="age ${ageInfo.class}" title="${ageInfo.tooltip}">${ageInfo.display}</td>
                   <td class="description">${description}</td>
                   <td class="url">
                       <a href="${url}" target="_blank" rel="noopener noreferrer">🔗 Voir</a>
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
   