// Configuration
let API_URL = CONFIG ? CONFIG.API_URL : 'http://localhost:5000';

// Elements DOM
const apiUrlInput = document.getElementById('api-url');
const testConnectionBtn = document.getElementById('test-connection');
const connectionStatus = document.getElementById('connection-status');
const fileSelect = document.getElementById('file-select');
const refreshFilesBtn = document.getElementById('refresh-files');
const viewFilesBtn = document.getElementById('view-files');
const clearSelectionBtn = document.getElementById('clear-selection');
const selectionInfo = document.getElementById('selection-info');
const contentSection = document.getElementById('content-section');
const contentDisplay = document.getElementById('content-display');
const closeContentBtn = document.getElementById('close-content');
const loader = document.getElementById('loader');

// État de l'application
let availableFiles = [];
let selectedFiles = [];

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Application initialisée');
    console.log('🌍 Environnement:', CONFIG.ENVIRONMENT);
    console.log('🔗 API URL:', API_URL);

    // Pré-remplir avec l'URL de production
    apiUrlInput.value = API_URL;
    
    // Charger l'URL de l'API depuis le localStorage (override si défini)
    const savedApiUrl = localStorage.getItem('apiUrl');
    if (savedApiUrl) {
        apiUrlInput.value = savedApiUrl;
        API_URL = savedApiUrl;
    }
    
    // Event listeners
    testConnectionBtn.addEventListener('click', testConnection);
    refreshFilesBtn.addEventListener('click', loadFiles);
    viewFilesBtn.addEventListener('click', viewSelectedFiles);
    clearSelectionBtn.addEventListener('click', clearSelection);
    closeContentBtn.addEventListener('click', closeContent);
    
    apiUrlInput.addEventListener('change', () => {
        API_URL = apiUrlInput.value.trim();
        localStorage.setItem('apiUrl', API_URL);
        console.log('🔗 URL API mise à jour:', API_URL);
    });
    
    fileSelect.addEventListener('change', updateSelection);
    
    // Charger les fichiers au démarrage
    loadFiles();
});

// Tester la connexion à l'API
async function testConnection() {
    showLoader();
    hideStatus();
    
    try {
        console.log('🔍 Test de connexion à:', API_URL);
        
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`✅ Connexion réussie ! Bucket: ${data.bucket}`, 'success');
            console.log('✅ API connectée:', data);
        } else {
            throw new Error(data.message || 'Erreur de connexion');
        }
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        showStatus(`❌ Erreur: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Charger la liste des fichiers
async function loadFiles() {
    showLoader();
    hideStatus();
    
    try {
        console.log('📂 Chargement des fichiers...');
        
        const response = await fetch(`${API_URL}/files`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors du chargement des fichiers');
        }
        
        availableFiles = data.files;
        
        // Remplir le menu déroulant
        fileSelect.innerHTML = '';
        
        if (availableFiles.length === 0) {
            fileSelect.innerHTML = '<option value="" disabled>Aucun fichier JSON trouvé</option>';
            showStatus('ℹ️ Aucun fichier JSON trouvé dans le bucket', 'error');
        } else {
            availableFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = `${file.name} (${file.size_mb} MB)`;
                fileSelect.appendChild(option);
            });
            
            showStatus(`✅ ${availableFiles.length} fichier(s) chargé(s)`, 'success');
            console.log(`✅ ${availableFiles.length} fichiers chargés`);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showStatus(`❌ Erreur: ${error.message}`, 'error');
        fileSelect.innerHTML = '<option value="" disabled>Erreur de chargement</option>';
    } finally {
        hideLoader();
    }
}

// Mettre à jour la sélection
function updateSelection() {
    selectedFiles = Array.from(fileSelect.selectedOptions).map(option => option.value);
    
    console.log('📋 Fichiers sélectionnés:', selectedFiles);
    
    if (selectedFiles.length > 0) {
        viewFilesBtn.disabled = false;
        clearSelectionBtn.disabled = false;
        
        selectionInfo.classList.remove('hidden');
        selectionInfo.textContent = `📋 ${selectedFiles.length} fichier(s) sélectionné(s)`;
    } else {
        viewFilesBtn.disabled = true;
        clearSelectionBtn.disabled = true;
        selectionInfo.classList.add('hidden');
    }
}

// Afficher les fichiers sélectionnés
async function viewSelectedFiles() {
    if (selectedFiles.length === 0) {
        showStatus('⚠️ Aucun fichier sélectionné', 'error');
        return;
    }
    
    showLoader();
    contentDisplay.innerHTML = '';
    contentSection.classList.remove('hidden');
    
    try {
        console.log('👁️ Affichage de', selectedFiles.length, 'fichier(s)...');
        
        // Charger tous les fichiers en parallèle
        const promises = selectedFiles.map(filename => loadSingleFile(filename));
        const results = await Promise.allSettled(promises);
        
        // Afficher les résultats
        results.forEach((result, index) => {
            const filename = selectedFiles[index];
            
            if (result.status === 'fulfilled') {
                displayFileContent(filename, result.value);
            } else {
                displayFileError(filename, result.reason);
            }
        });
        
        // Scroll vers le contenu
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        showStatus(`❌ Erreur: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Charger un fichier individuel
async function loadSingleFile(filename) {
    console.log('📥 Chargement de:', filename);
    
    const response = await fetch(`${API_URL}/file/${encodeURIComponent(filename)}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Erreur de chargement');
    }
    
    return data;
}

// Afficher le contenu d'un fichier
function displayFileContent(filename, data) {
    const card = document.createElement('div');
    card.className = 'file-content-card';
    
    const fileInfo = availableFiles.find(f => f.name === filename);
    
    card.innerHTML = `
        <h3>📄 ${filename}</h3>
        <div class="file-info">
            📊 Taille: ${data.size_bytes.toLocaleString()} octets
            ${fileInfo ? ` • 📅 Modifié: ${new Date(fileInfo.last_modified).toLocaleString('fr-FR')}` : ''}
        </div>
        <div class="json-content">
            <pre>${JSON.stringify(data.content, null, 2)}</pre>
        </div>
    `;
    
    contentDisplay.appendChild(card);
    console.log('✅ Fichier affiché:', filename);
}

// Afficher une erreur de fichier
function displayFileError(filename, error) {
    const card = document.createElement('div');
    card.className = 'file-content-card';
    card.style.borderColor = '#dc3545';
    
    card.innerHTML = `
        <h3>❌ ${filename}</h3>
        <div class="file-info" style="background: #f8d7da; color: #721c24;">
            ⚠️ Erreur: ${error.message || error}
        </div>
    `;
    
    contentDisplay.appendChild(card);
    console.error('❌ Erreur pour', filename, ':', error);
}

// Effacer la sélection
function clearSelection() {
    fileSelect.selectedIndex = -1;
    selectedFiles = [];
    updateSelection();
    closeContent();
    console.log('🗑️ Sélection effacée');
}

// Fermer la section de contenu
function closeContent() {
    contentSection.classList.add('hidden');
    contentDisplay.innerHTML = '';
}

// Afficher le loader
function showLoader() {
    loader.classList.remove('hidden');
}

// Cacher le loader
function hideLoader() {
    loader.classList.add('hidden');
}

// Afficher un message de statut
function showStatus(message, type) {
    connectionStatus.textContent = message;
    connectionStatus.className = `status ${type}`;
    connectionStatus.classList.remove('hidden');
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
        connectionStatus.classList.add('hidden');
    }, 5000);
}

// Cacher le statut
function hideStatus() {
    connectionStatus.classList.add('hidden');
}

// Gestion des erreurs globales
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Erreur non gérée:', event.reason);
    showStatus('❌ Une erreur est survenue', 'error');
    hideLoader();
});
