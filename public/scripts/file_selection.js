/* ==========================================
   FILE SELECTION - UTILISE CONFIG GLOBAL
   ========================================== */

   console.log('📄 === CHARGEMENT DE file_selection.js ===');

   // Vérifier que CONFIG existe (défini dans config.js)
   if (typeof CONFIG === 'undefined') {
       console.error('❌ CONFIG n\'est pas défini ! Vérifiez que config.js est chargé avant file_selection.js');
       alert('ERREUR CRITIQUE : Configuration manquante. Rechargez la page.');
       throw new Error('CONFIG is not defined');
   }
   
   console.log('✅ CONFIG détecté:', CONFIG);
   
   /* ==========================================
      UTILITAIRES
      ========================================== */

      /**
 * Formate la taille d'un fichier en unités lisibles
 * @param {number} bytes - Taille en octets
 * @returns {string} - Taille formatée (ex: "1.5 MB")
 */
    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = (bytes / Math.pow(1024, i)).toFixed(2);
        
        return `${size} ${sizes[i]}`;
    }

    function formatDate(isoDate) {
        if (!isoDate) return 'Date inconnue';
        
        try {
            const date = new Date(isoDate);
            
            // Vérifier si la date est valide
            if (isNaN(date.getTime())) {
                return 'Date invalide';
            }
            
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            return `${day}/${month}/${year} à ${hours}:${minutes}`;
        } catch (error) {
            console.error('❌ Erreur formatage date:', error);
            return 'Date invalide';
        }
    }
    
    /**
     * Formate un nombre avec des séparateurs de milliers
     * @param {number} num - Nombre à formater
     * @returns {string} - Nombre formaté (ex: "1 234 567")
     */
    function formatNumber(num) {
        if (!num && num !== 0) return 'N/A';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    
    /**
     * Extrait le nom de base d'un fichier (sans extension)
     * @param {string} filename - Nom du fichier
     * @returns {string} - Nom sans extension
     */
    function getFileBaseName(filename) {
        if (!filename) return '';
        return filename.replace(/\.[^/.]+$/, '');
    }
    
    /**
     * Vérifie si un fichier est un JSON valide
     * @param {string} filename - Nom du fichier
     * @returns {boolean}
     */
    function isJsonFile(filename) {
        if (!filename) return false;
        return filename.toLowerCase().endsWith('.json');
    }

   
   function showLoader() {
       console.log('⏳ Affichage du loader');
       const loader = document.getElementById('loader');
       if (loader) {
           loader.style.display = 'flex';
       } else {
           console.warn('⚠️ Élément #loader introuvable');
       }
   }
   
   function hideLoader() {
       console.log('✅ Masquage du loader');
       const loader = document.getElementById('loader');
       if (loader) {
           loader.style.display = 'none';
       }
   }
   
   function showError(message) {
       console.error('❌ Affichage erreur:', message);
       
       const errorContainer = document.getElementById('error-container');
       const errorMessage = document.getElementById('error-message');
       
       if (errorContainer && errorMessage) {
           errorMessage.textContent = message;
           errorContainer.style.display = 'flex';
           
           setTimeout(() => {
               hideError();
           }, 8000);
       } else {
           console.error('⚠️ Conteneur d\'erreur introuvable');
           alert(message);
       }
   }
   
   function hideError() {
       const errorContainer = document.getElementById('error-container');
       if (errorContainer) {
           errorContainer.style.display = 'none';
       }
   }
   
   function showEmptyState() {
       console.log('📭 Affichage état vide');
       const emptyState = document.getElementById('empty-state');
       if (emptyState) {
           emptyState.style.display = 'flex';
       }
   }
   
   function hideEmptyState() {
       const emptyState = document.getElementById('empty-state');
       if (emptyState) {
           emptyState.style.display = 'none';
       }
   }
   
   /* ==========================================
      CHARGEMENT DES FICHIERS
      ========================================== */
   
   async function loadFiles() {
       console.log('🚀 === DÉBUT loadFiles() ===');

       try {
           showLoader();
           hideError();
           hideEmptyState();

           // Récupérer l'utilisateur connecté
           console.log('🔍 DEBUG - localStorage:');
           console.log('   idToken:', localStorage.getItem('idToken') ? 'Présent ✅' : 'Absent ❌');
           console.log('   userEmail:', localStorage.getItem('userEmail'));
           console.log('   accessToken:', localStorage.getItem('accessToken') ? 'Présent ✅' : 'Absent ❌');

           const userEmail = CONFIG.getCurrentUser();
           console.log('👤 Utilisateur connecté:', userEmail);

           if (!userEmail) {
               console.error('❌ userEmail est null ou undefined');
               console.error('   Contenu complet du localStorage:', JSON.stringify(localStorage));
               throw new Error('Utilisateur non authentifié. Veuillez vous connecter.');
           }

           // Utiliser CONFIG.getApiUrl pour récupérer les recherches de l'utilisateur
           const url = CONFIG.getApiUrl('GET_USER_SEARCHES') + '?username=' + encodeURIComponent(userEmail);
           console.log('🔗 URL API:', url);

           // Récupérer le token d'authentification
           const authToken = CONFIG.getAuthToken();

           console.log('📍 Envoi de la requête fetch...');
           const response = await fetch(url, {
               method: 'GET',
               headers: {
                   'Accept': 'application/json',
                   'Content-Type': 'application/json',
                   'Authorization': authToken ? `Bearer ${authToken}` : ''
               }
           });

           console.log('📍 Réponse reçue:');
           console.log('   Status:', response.status);
           console.log('   StatusText:', response.statusText);
           console.log('   OK:', response.ok);

           if (!response.ok) {
               const errorText = await response.text();
               console.error('   Corps de l\'erreur:', errorText);
               throw new Error(`HTTP ${response.status}: ${response.statusText}`);
           }

           console.log('📍 Parsing JSON...');
           const data = await response.json();
           console.log('   Données brutes:', data);
           console.log('   Type:', typeof data);

           // Vérifier le succès de la réponse
           if (!data.success) {
               console.error('❌ Réponse en échec:', data.message);
               throw new Error(data.message || 'Erreur lors de la récupération des fichiers');
           }

           // Vérifier la structure de la réponse
           if (!data.files) {
               console.error('❌ Propriété "files" manquante');
               console.log('   Structure reçue:', JSON.stringify(data, null, 2));
               throw new Error('Format de réponse invalide: propriété "files" manquante');
           }

           if (!Array.isArray(data.files)) {
               console.error('❌ "files" n\'est pas un tableau');
               console.log('   Type de files:', typeof data.files);
               throw new Error('Format de réponse invalide: "files" doit être un tableau');
           }

           console.log('✅ Nombre de fichiers:', data.files.length);

           if (data.files.length === 0) {
               console.log('📭 Aucun fichier trouvé pour cet utilisateur');
               showEmptyState();
               return;
           }

           console.log('📍 Affichage des fichiers...');
           displayFiles(data.files);

           console.log('✅ === FIN loadFiles() - SUCCÈS ===');

       } catch (error) {
           console.error('❌ === FIN loadFiles() - ERREUR ===');
           console.error('   Type:', error.constructor.name);
           console.error('   Message:', error.message);
           console.error('   Stack:', error.stack);

           showError(`Erreur lors du chargement: ${error.message}`);
       } finally {
           hideLoader();
       }
   }
   
   function displayFiles(files) {
    console.log('🎨 === AFFICHAGE DES FICHIERS ===');
    console.log('   Nombre:', files.length);
    
    const container = document.getElementById('files-container');
    const emptyState = document.getElementById('empty-state');
    const countNumber = document.getElementById('count-number');
    
    if (!container) {
        console.error('❌ Container #files-container introuvable');
        return;
    }
    
    // Mettre à jour le compteur
    if (countNumber) {
        countNumber.textContent = files.length;
    }
    
    // Si aucun fichier
    if (!files || files.length === 0) {
        console.log('   ℹ️ Aucun fichier - affichage empty state');
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    // Masquer empty state et afficher la grid
    if (emptyState) emptyState.style.display = 'none';
    container.style.display = 'grid';
    
    // Créer les cartes HTML
    container.innerHTML = files.map((file, index) => {
        const filename = file.name || 'fichier_inconnu.json';
        const fileSize = file.size || 0;
        const lastModified = file.last_modified || '';
        const adsCount = file.ads_count || null;
        
        return `
            <div class="file-card" data-filename="${escapeHtml(filename)}" style="animation-delay: ${index * 0.1}s">
                <div class="file-header">
                    <div class="file-icon">📄</div>
                    <div class="file-info-header">
                        <h3 class="file-name">${escapeHtml(filename)}</h3>
                        <span class="file-size">${formatFileSize(fileSize)}</span>
                    </div>
                </div>
                
                <div class="file-meta">
                    <div class="meta-item">
                        <span class="meta-label">📦 Taille</span>
                        <span class="meta-value">${formatFileSize(fileSize)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">🕒 Enregistré</span>
                        <span class="meta-value">${formatDate(lastModified)}</span>
                    </div>
                    ${adsCount !== null && adsCount > 0 ? `
                    <div class="meta-item">
                        <span class="meta-label">📢 Annonces</span>
                        <span class="meta-value">${formatNumber(adsCount)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="file-actions">
                    <button class="file-btn btn-view" onclick="selectFile('${escapeHtml(filename)}')">
                        <span class="btn-icon">👁️</span>
                        <span class="btn-text">Ouvrir</span>
                    </button>
                    <button class="file-btn btn-download" onclick="downloadFile('${escapeHtml(filename)}')">
                        <span class="btn-icon">⬇️</span>
                        <span class="btn-text">Télécharger</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('   ✅ Cartes créées et affichées');
    
    // Scroll vers le container
    setTimeout(() => {
        container.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 200);
}

// Fonction de téléchargement
function downloadFile(filename) {
    console.log('📥 Téléchargement:', filename);
    const link = document.createElement('a');
    link.href = `${CONFIG.dataPath}/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fonction d'échappement HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

   
   function createFileCard(file) {
       const card = document.createElement('div');
       card.className = 'file-card';
       
       // Adapter selon la structure de votre réponse API
       const fileName = file.name || file.fileName || file;
       const fileSize = file.size || 0;
       const lastModified = file.lastModified || file.last_modified || null;
       
       console.log('   📄 Fichier:', { fileName, fileSize, lastModified });
       
       // Formater la taille
       const sizeInMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : '?';
       
       // Formater la date
       let formattedDate = 'Date inconnue';
       if (lastModified) {
           try {
               const date = new Date(lastModified);
               formattedDate = date.toLocaleDateString('fr-FR', {
                   day: '2-digit',
                   month: '2-digit',
                   year: 'numeric',
                   hour: '2-digit',
                   minute: '2-digit'
               });
           } catch (e) {
               console.warn('   Erreur formatage date:', e);
           }
       }
       
       card.innerHTML = `
           <div class="file-icon">📄</div>
           <h3 class="file-name">${escapeHtml(fileName)}</h3>
           <div class="file-meta">
               <span>📊 ${sizeInMB} MB</span>
               <span>🕒 ${formattedDate}</span>
           </div>
           <button class="file-btn" data-filename="${escapeHtml(fileName)}">
               Ouvrir →
           </button>
       `;
       
       const button = card.querySelector('.file-btn');
       button.addEventListener('click', () => {
           const fn = button.getAttribute('data-filename');
           console.log('👆 Clic sur fichier:', fn);
           selectFile(fn);
       });
       
       return card;
   }
   
   function escapeHtml(text) {
       const div = document.createElement('div');
       div.textContent = text;
       return div.innerHTML;
   }
   
   /* ==========================================
      SÉLECTION D'UN FICHIER
      ========================================== */
   
      function selectFile(filename) {
        console.log('═══════════════════════════════════════');
        console.log('📂 SÉLECTION DU FICHIER');
        console.log('   Nom du fichier:', filename);
        console.log('   Type:', typeof filename);
        console.log('═══════════════════════════════════════');
        
        if (!filename) {
            alert('❌ Nom de fichier invalide');
            return;
        }
    
        // ✅ MÉTHODE 1 : localStorage (peut être effacé)
        try {
            localStorage.setItem('selectedFile', filename);
            console.log('✅ Fichier stocké dans localStorage:', filename);
        } catch (e) {
            console.warn('⚠️ localStorage non disponible:', e);
        }
    
        // ✅ MÉTHODE 2 : URL (backup fiable)
        console.log('🔄 Redirection avec paramètre URL');
        const targetUrl = `annonces.html?file=${encodeURIComponent(filename)}`;
        console.log('   URL cible:', targetUrl);
        
        window.location.href = targetUrl;
    }
    
    
   /* ==========================================
      INITIALISATION
      ========================================== */
   
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎬 === DOMContentLoaded ===');
        console.log('   URL:', window.location.href);
        
        // Vérifier les éléments DOM
        const requiredIds = ['loader', 'error-container', 'files-container', 'empty-state', 'load-files-btn'];
        console.log('🔍 Vérification DOM:');
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            console.log(`   #${id}:`, el ? '✅' : '❌');
        });
        
        // Bouton de rechargement
        const loadFilesBtn = document.getElementById('load-files-btn');
        if (loadFilesBtn) {
            console.log('🔘 Bouton rechargement OK');
            loadFilesBtn.addEventListener('click', () => {
                console.log('👆 Clic rechargement');
                loadFiles();
            });
        }
        
        // Charger automatiquement
        console.log('🚀 Chargement initial...');
        loadFiles();
    });

    // Gestion des erreurs globales
    window.addEventListener('error', (event) => {
        console.error('💥 Erreur globale:', event.message, event.filename, event.lineno);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('💥 Promise rejetée:', event.reason);
    });

    console.log('✅ === file_selection.js CHARGÉ ===');

    window.selectFile = selectFile;
    window.downloadFile = downloadFile;
    window.hideError = hideError;
    window.loadFiles = loadFiles;

    console.log('✅ Fonctions globales exposées:', {
        selectFile: typeof window.selectFile,
        downloadFile: typeof window.downloadFile,
        hideError: typeof window.hideError,
        loadFiles: typeof window.loadFiles
    });
   