"""
Configuration du projet LBC API
Ce fichier contient tous les paramètres et constantes du projet.
"""

# Paramètres de recherche par défaut
DEFAULT_SEARCH_PARAMS = {
    'category': '9',  # Immobilier par défaut (vente)
    'price': '15000-300000',  # Prix min-max
    'square': '10-120',  # Surface min-max en m²
    'rooms': '3-6',  # Nombre de pièces
    'bedrooms': '2-6',  # Nombre de chambres
    'real_estate_type': '2,1'  # 1=Maison, 2=Appartement
}

# Paramètres pour la location
RENTAL_PARAMS = {
    'category': '10',  # Catégorie Location
    'square': '20-200',  # Surface plus large pour la location
    'rooms': '2-5',  # Nombre de pièces plus large
    'bedrooms': '1-4',  # Nombre de chambres plus large
    'real_estate_type': '1,2'  # 1=Maison, 2=Appartement
}

# Paramètres de calcul de prêt
LOAN_PARAMS = {
    'interest_rate': 3.5,  # Taux d'intérêt annuel en pourcentage
    'loan_duration_years': 25,  # Durée du prêt en années
    'default_rent_per_sqm': 15  # Loyer moyen par m² par défaut
}

# Paramètres de scraping
SCRAPER_CONFIG = {
    'base_url': 'https://www.leboncoin.fr',
    'search_url': 'https://www.leboncoin.fr/recherche',
    'timeout': 30,  # Timeout en secondes pour les requêtes
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'max_retries': 3  # Nombre de tentatives en cas d'échec
}

# Chemins des fichiers
FILE_PATHS = {
    'locations_data': 'locations_data.json',
    'sales_data': 'sales_data.json',
    'output_dir': 'output',
    'html_backup': 'page_backup.html'
}

# Paramètres d'affichage
DISPLAY_CONFIG = {
    'page_width': 150,  # Largeur de la page pour l'affichage
    'max_description_length': 30  # Longueur maximale de la description
}
