// ==========================================
// ÉLÉMENTS DOM
// ==========================================
const loadFilesBtn = document.getElementById('loadFilesBtn');
const fileSelect = document.getElementById('fileSelect');
const displayFileBtn = document.getElementById('displayFileBtn');
const fileSelectionSection = document.getElementById('fileSelectionSection');
const fileInfo = document.getElementById('fileInfo');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let currentFiles = [];
let selectedFile = null;

// ==========================================
// ÉVÉNEMENTS
// ==========================================
loadFilesBtn.addEventListener('click', loadFiles);
fileSelect.addEventListener('change', handleFileSelection);
displayFileBtn.addEventListener('click', goToAnnoncesPage);

// ==========================================
// CHARGEMENT DES FICHIERS
// ==========================================
async function loadFiles() {
    console.log('🔄 Chargement des fichiers...');
    showLoading(true);
    hideMessages();

    try {
        const response = await fetch('http://127.0.0.1:5000/get_all_files');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Réponse API:', data);

        if (data.success && Array.isArray(data.files) && data.files.length > 0) {
            currentFiles = data.files;
            populateFileSelect(data.files);
            fileSelectionSection.style.display = 'block';
            showSuccess(`${data.files.length} fichier(s) trouvé(s)`);
        } else {
            showError('Aucun fichier disponible');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
        showError('Impossible de charger les fichiers');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// REMPLISSAGE DU SELECT
// ==========================================
function populateFileSelect(files) {
    fileSelect.innerHTML = '<option value="">-- Sélectionnez un fichier --</option>';
    
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.filename;
        option.textContent = file.filename;
        option.dataset.fileData = JSON.stringify(file);
        fileSelect.appendChild(option);
    });

    fileSelect.disabled = false;
    console.log('✅ Select rempli avec', files.length, 'fichiers');
}

// ==========================================
// GESTION DE LA SÉLECTION
// ==========================================
function handleFileSelection() {
    const selectedOption = fileSelect.options[fileSelect.selectedIndex];
    
    if (selectedOption.value === '') {
        fileInfo.style.display = 'none';
        displayFileBtn.disabled = true;
        selectedFile = null;
        return;
    }

    selectedFile = JSON.parse(selectedOption.dataset.fileData);
    console.log('📄 Fichier sélectionné:', selectedFile);

    // Afficher les informations
    document.getElementById('infoFileName').textContent = selectedFile.filename;
    document.getElementById('infoFileSize').textContent = formatFileSize(selectedFile.size);
    document.getElementById('infoFileDate').textContent = formatDate(selectedFile.last_modified);

    fileInfo.style.display = 'block';
    displayFileBtn.disabled = false;
}

// ==========================================
// NAVIGATION VERS LA PAGE ANNONCES
// ==========================================
function goToAnnoncesPage() {
    if (!selectedFile) {
        showError('Veuillez sélectionner un fichier');
        return;
    }

    console.log('🚀 Navigation vers annonces.html avec:', selectedFile.filename);
    
    // Stocker le nom du fichier dans localStorage
    localStorage.setItem('selectedFile', selectedFile.filename);
    
    // Rediriger vers la page d'affichage
    window.location.href = 'annonces.html';
}

// ==========================================
// UTILITAIRES D'AFFICHAGE
// ==========================================
function showLoading(show) {
    loading.style.display = show ? 'flex' : 'none';
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = `❌ ${message}`;
    errorMessage.style.display = 'block';
    setTimeout(() => errorMessage.style.display = 'none', 5000);
}

function showSuccess(message) {
    successMessage.textContent = `✅ ${message}`;
    successMessage.style.display = 'block';
    setTimeout(() => successMessage.style.display = 'none', 3000);
}

// ==========================================
// FORMATAGE
// ==========================================
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
}
