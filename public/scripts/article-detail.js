// ==========================================
// GESTION DE LA PAGE DE DÉTAIL D'ARTICLE
// ==========================================

console.log('📄 Chargement de article-detail.js...');

// État global
let currentArticle = null;

/**
 * Initialisation de la page
 */
async function init() {
    console.log('🚀 Initialisation de la page de détail...');

    try {
        // Récupérer le filename depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const filename = urlParams.get('filename');

        if (!filename) {
            throw new Error('Aucun article spécifié');
        }

        console.log(`📄 Chargement de l'article: ${filename}`);

        // Charger l'article
        await loadArticle(filename);

        // Afficher l'article
        renderArticle();

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError(error.message);
    }
}

/**
 * Charger un article depuis l'API
 */
async function loadArticle(filename) {
    console.log(`📡 Chargement de l'article: ${filename}`);

    const loadingState = document.getElementById('loading-state');
    const articleContent = document.getElementById('article-content');

    // Afficher l'état de chargement
    loadingState.style.display = 'block';
    articleContent.style.display = 'none';

    try {
        // Appel API pour récupérer l'article
        const apiUrl = `${CONFIG.getApiUrl('GET_ARTICLES')}?filename=${encodeURIComponent(filename)}`;
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
            throw new Error(data.message || 'Erreur lors de la récupération de l\'article');
        }

        // Stocker l'article
        currentArticle = data.article;
        console.log('✅ Article chargé:', currentArticle.title);

    } catch (error) {
        console.error('❌ Erreur lors du chargement de l\'article:', error);
        throw error;
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Afficher l'article
 */
function renderArticle() {
    if (!currentArticle) {
        console.error('❌ Aucun article à afficher');
        return;
    }

    // Afficher le contenu
    document.getElementById('article-content').style.display = 'block';

    // Mettre à jour le titre de la page et les meta tags
    updatePageMeta();

    // Mettre à jour le breadcrumb
    updateBreadcrumb();

    // Afficher les catégories
    renderCategories();

    // Afficher le titre et l'excerpt
    renderHeader();

    // Afficher l'auteur et les infos
    renderAuthor();

    // Afficher l'image principale
    renderFeaturedImage();

    // Afficher le contenu principal
    renderMainContent();

    // Afficher la FAQ
    renderFAQ();

    // Afficher les articles liés
    renderRelatedArticles();
}

/**
 * Mettre à jour les meta tags de la page
 */
function updatePageMeta() {
    // Titre de la page
    const pageTitle = `${currentArticle.title} - Guide Immobilier`;
    document.getElementById('page-title').textContent = pageTitle;
    document.title = pageTitle;

    // Meta description
    if (currentArticle.seo?.meta_description) {
        document.getElementById('meta-description').setAttribute('content', currentArticle.seo.meta_description);
    } else if (currentArticle.excerpt) {
        document.getElementById('meta-description').setAttribute('content', currentArticle.excerpt);
    }

    // Meta keywords
    if (currentArticle.seo?.keywords) {
        const keywords = Array.isArray(currentArticle.seo.keywords)
            ? currentArticle.seo.keywords.join(', ')
            : currentArticle.seo.keywords;
        document.getElementById('meta-keywords').setAttribute('content', keywords);
    }
}

/**
 * Mettre à jour le breadcrumb
 */
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    const breadcrumbTitle = document.getElementById('breadcrumb-title');

    breadcrumbTitle.textContent = currentArticle.title;
    breadcrumb.style.display = 'block';
}

/**
 * Afficher les catégories
 */
function renderCategories() {
    const container = document.getElementById('article-categories');
    container.innerHTML = '';

    if (currentArticle.category && currentArticle.category.length > 0) {
        currentArticle.category.forEach(cat => {
            const badge = document.createElement('span');
            badge.className = 'article-category-badge';
            badge.textContent = cat;
            container.appendChild(badge);
        });
    }
}

/**
 * Afficher le titre et l'excerpt
 */
function renderHeader() {
    document.getElementById('article-title').textContent = currentArticle.title || 'Sans titre';
    document.getElementById('article-excerpt').textContent = currentArticle.excerpt || '';
}

/**
 * Afficher l'auteur et les infos
 */
function renderAuthor() {
    const authorContainer = document.getElementById('article-author');
    const readingInfoContainer = document.getElementById('article-reading-info');

    // Auteur
    const author = currentArticle.author || {};
    const authorName = author.name || 'Anonyme';
    const authorRole = author.role || '';
    const authorInitial = authorName.charAt(0).toUpperCase();

    authorContainer.innerHTML = `
        <div class="article-author-avatar-main">${authorInitial}</div>
        <div class="article-author-details">
            <div class="article-author-name">${authorName}</div>
            ${authorRole ? `<div class="article-author-role">${authorRole}</div>` : ''}
        </div>
    `;

    // Infos de lecture
    const publishedDate = currentArticle.published_at
        ? new Date(currentArticle.published_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : '';

    const readingTime = currentArticle.reading_time || 0;

    readingInfoContainer.innerHTML = `
        ${publishedDate ? `
            <div>
                <span>📅</span>
                <span>${publishedDate}</span>
            </div>
        ` : ''}
        ${readingTime ? `
            <div>
                <span>📖</span>
                <span>${readingTime} min de lecture</span>
            </div>
        ` : ''}
    `;
}

/**
 * Afficher l'image principale
 */
function renderFeaturedImage() {
    const img = document.getElementById('article-featured-image');

    if (currentArticle.featured_image?.url) {
        img.src = currentArticle.featured_image.url;
        img.alt = currentArticle.featured_image.alt || currentArticle.title;
        img.style.display = 'block';

        img.onerror = function() {
            this.style.display = 'none';
        };
    }
}

/**
 * Afficher le contenu principal
 */
function renderMainContent() {
    const container = document.getElementById('article-main-content');
    container.innerHTML = '';

    const content = currentArticle.content || {};

    // Introduction
    if (content.introduction) {
        const intro = document.createElement('div');
        intro.innerHTML = content.introduction;
        container.appendChild(intro);
    }

    // Sections
    if (content.sections && content.sections.length > 0) {
        content.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = `
                ${section.title ? `<h2>${section.title}</h2>` : ''}
                ${section.content || ''}
            `;
            container.appendChild(sectionDiv);
        });
    }

    // Conclusion
    if (content.conclusion) {
        const conclusion = document.createElement('div');
        conclusion.innerHTML = `
            <h2>Conclusion</h2>
            ${content.conclusion}
        `;
        container.appendChild(conclusion);
    }
}

/**
 * Afficher la FAQ
 */
function renderFAQ() {
    const faqSection = document.getElementById('article-faq');
    const faqContent = document.getElementById('faq-content');

    const faq = currentArticle.content?.faq || [];

    if (faq.length === 0) {
        faqSection.style.display = 'none';
        return;
    }

    faqSection.style.display = 'block';
    faqContent.innerHTML = '';

    faq.forEach(item => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = `
            <div class="faq-question">Q: ${item.question}</div>
            <div class="faq-answer">${item.answer}</div>
        `;
        faqContent.appendChild(faqItem);
    });
}

/**
 * Afficher les articles liés
 */
function renderRelatedArticles() {
    const relatedSection = document.getElementById('related-articles');
    const relatedGrid = document.getElementById('related-articles-grid');

    const related = currentArticle.related_articles || [];

    if (related.length === 0) {
        relatedSection.style.display = 'none';
        return;
    }

    relatedSection.style.display = 'block';
    relatedGrid.innerHTML = '';

    related.forEach(article => {
        const card = document.createElement('div');
        card.className = 'related-article-card';

        // Si l'article lié est un objet complet
        const articleTitle = article.title || article;
        const articleSlug = article.slug || '';

        card.innerHTML = `
            <div class="related-article-title">${articleTitle}</div>
        `;

        // Gérer le clic (recharger la page avec le nouvel article)
        card.onclick = () => {
            // Si on a le filename, l'utiliser, sinon essayer de le construire depuis le slug
            if (article.filename) {
                window.location.href = `article-detail.html?filename=${encodeURIComponent(article.filename)}`;
            } else if (articleSlug) {
                window.location.href = `article-detail.html?filename=${encodeURIComponent(articleSlug + '.json')}`;
            }
        };

        relatedGrid.appendChild(card);
    });
}

/**
 * Afficher une erreur
 */
function showError(message) {
    const loadingState = document.getElementById('loading-state');
    const articleContent = document.getElementById('article-content');

    loadingState.style.display = 'none';
    articleContent.style.display = 'block';

    articleContent.innerHTML = `
        <div style="
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            <h2>❌ Erreur</h2>
            <p style="color: #666; margin: 20px 0;">${message}</p>
            <button onclick="window.location.href='articles.html'" style="
                padding: 12px 24px;
                background: linear-gradient(135deg, #f8b400 0%, #d4940a 100%);
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
                font-size: 1em;
            ">Retour aux articles</button>
        </div>
    `;
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', init);

console.log('✅ article-detail.js chargé');
