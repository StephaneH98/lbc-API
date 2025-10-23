// ==========================================
// GESTION DE LA PAGE ARTICLES
// ==========================================

console.log('📚 Chargement de articles.js...');

// État global
let allArticles = [];
let allCategories = [];
let selectedCategory = 'tous'; // 'tous' ou une catégorie spécifique

/**
 * Initialisation de la page
 */
async function init() {
    console.log('🚀 Initialisation de la page articles...');

    try {
        // Charger les articles
        await loadArticles();

        // Afficher les articles
        renderArticles();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError('Impossible de charger les articles. Veuillez réessayer.');
    }
}

/**
 * Charger les articles depuis l'API
 */
async function loadArticles() {
    console.log('📡 Chargement des articles...');

    const loadingState = document.getElementById('loading-state');
    const articlesGrid = document.getElementById('articles-grid');
    const emptyState = document.getElementById('empty-state');

    // Afficher l'état de chargement
    loadingState.style.display = 'block';
    articlesGrid.style.display = 'none';
    emptyState.style.display = 'none';

    try {
        // Appel API pour lister les articles
        const apiUrl = CONFIG.getApiUrl('GET_ARTICLES');
        console.log(`📡 Appel API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Données reçues:', data);

        if (!data.success) {
            throw new Error(data.message || 'Erreur lors de la récupération des articles');
        }

        // Stocker les articles et catégories
        allArticles = data.articles || [];
        allCategories = data.categories || [];

        console.log(`✅ ${allArticles.length} articles chargés`);
        console.log(`📂 Catégories: ${allCategories.join(', ')}`);

        // Mettre à jour les statistiques
        updateStats();

        // Générer les filtres de catégories
        renderCategoryFilters();

    } catch (error) {
        console.error('❌ Erreur lors du chargement des articles:', error);
        throw error;
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Mettre à jour les statistiques
 */
function updateStats() {
    const totalArticles = document.getElementById('total-articles');
    const totalCategories = document.getElementById('total-categories');
    const filteredCount = document.getElementById('filtered-count');

    totalArticles.textContent = allArticles.length;
    totalCategories.textContent = allCategories.length;

    // Calculer le nombre d'articles filtrés
    const filtered = getFilteredArticles();
    filteredCount.textContent = filtered.length;
}

/**
 * Générer les filtres de catégories
 */
function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    container.innerHTML = '';

    // Bouton "Tous"
    const btnTous = document.createElement('button');
    btnTous.className = 'category-filter-btn active';
    btnTous.textContent = `Tous (${allArticles.length})`;
    btnTous.onclick = () => selectCategory('tous');
    container.appendChild(btnTous);

    // Boutons de catégories
    allCategories.forEach(category => {
        // Compter les articles de cette catégorie
        const count = allArticles.filter(article =>
            article.category && article.category.includes(category)
        ).length;

        const btn = document.createElement('button');
        btn.className = 'category-filter-btn';
        btn.textContent = `${category} (${count})`;
        btn.onclick = () => selectCategory(category);
        container.appendChild(btn);
    });
}

/**
 * Sélectionner une catégorie
 */
function selectCategory(category) {
    selectedCategory = category;

    // Mettre à jour les boutons actifs
    const buttons = document.querySelectorAll('.category-filter-btn');
    buttons.forEach(btn => {
        if (
            (category === 'tous' && btn.textContent.startsWith('Tous')) ||
            btn.textContent.startsWith(category)
        ) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Réafficher les articles
    renderArticles();

    // Mettre à jour les statistiques
    updateStats();
}

/**
 * Obtenir les articles filtrés
 */
function getFilteredArticles() {
    if (selectedCategory === 'tous') {
        return allArticles;
    }

    return allArticles.filter(article =>
        article.category && article.category.includes(selectedCategory)
    );
}

/**
 * Afficher les articles
 */
function renderArticles() {
    const articlesGrid = document.getElementById('articles-grid');
    const emptyState = document.getElementById('empty-state');

    // Obtenir les articles filtrés
    const articles = getFilteredArticles();

    // Si aucun article
    if (articles.length === 0) {
        articlesGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    // Afficher la grille
    articlesGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    // Vider la grille
    articlesGrid.innerHTML = '';

    // Générer les cartes d'articles
    articles.forEach(article => {
        const card = createArticleCard(article);
        articlesGrid.appendChild(card);
    });

    console.log(`✅ ${articles.length} articles affichés`);
}

/**
 * Créer une carte d'article
 */
function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'article-card';
    if (article.featured) {
        card.classList.add('featured');
    }

    // Gérer le clic sur la carte
    card.onclick = () => openArticle(article.filename);

    // Image
    const imageUrl = article.featured_image?.url || '';
    const imageAlt = article.featured_image?.alt || article.title;

    // Catégories
    const categoriesHtml = (article.category || [])
        .map(cat => `<span class="article-category-tag">${cat}</span>`)
        .join('');

    // Auteur
    const authorName = article.author?.name || 'Anonyme';
    const authorInitial = authorName.charAt(0).toUpperCase();

    // Date formatée
    const publishedDate = article.published_at ? new Date(article.published_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    // HTML de la carte
    card.innerHTML = `
        ${imageUrl ? `<img src="${imageUrl}" alt="${imageAlt}" class="article-image" onerror="this.style.display='none'">` : '<div class="article-image"></div>'}
        <div class="article-content">
            <div class="article-categories">
                ${categoriesHtml}
            </div>
            <h3 class="article-title">${article.title || 'Sans titre'}</h3>
            <p class="article-excerpt">${article.excerpt || ''}</p>
            <div class="article-meta">
                <div class="article-author">
                    <div class="article-author-avatar">${authorInitial}</div>
                    <div>
                        <div>${authorName}</div>
                        ${publishedDate ? `<div style="font-size: 0.85em; color: #999;">${publishedDate}</div>` : ''}
                    </div>
                </div>
                ${article.reading_time ? `
                    <div class="article-reading-time">
                        <span>📖</span>
                        <span>${article.reading_time} min</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

/**
 * Ouvrir un article
 */
function openArticle(filename) {
    console.log(`📄 Ouverture de l'article: ${filename}`);

    // Rediriger vers la page de détail avec le filename en paramètre
    window.location.href = `article-detail.html?filename=${encodeURIComponent(filename)}`;
}

/**
 * Afficher une erreur
 */
function showError(message) {
    const loadingState = document.getElementById('loading-state');
    const articlesGrid = document.getElementById('articles-grid');
    const emptyState = document.getElementById('empty-state');

    loadingState.style.display = 'none';
    articlesGrid.style.display = 'none';
    emptyState.style.display = 'block';

    emptyState.innerHTML = `
        <h3>❌ Erreur</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="
            margin-top: 20px;
            padding: 10px 20px;
            background: linear-gradient(135deg, #f8b400 0%, #d4940a 100%);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        ">Réessayer</button>
    `;
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', init);

console.log('✅ articles.js chargé');
