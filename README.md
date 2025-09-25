# LBC API - Outil d'analyse immobilière

Ce projet est un outil d'analyse immobilière qui permet de récupérer, analyser et comparer les annonces immobilières de Le Bon Coin.

## Fonctionnalités

- Récupération des annonces immobilières (vente et location) depuis Le Bon Coin
- Analyse des prix au mètre carré par localisation
- Calcul des mensualités de prêt immobilier
- Comparaison entre les loyers et les mensualités d'emprunt
- Filtrage des annonces par prix, surface et localisation
- Export des résultats au format JSON

## Prérequis

- Python 3.7 ou supérieur
- Navigateur web (pour la résolution des CAPTCHA)
- Compte Le Bon Coin (recommandé pour éviter les limitations)

## Installation

1. Clonez le dépôt :
   ```bash
   git clone [URL_DU_REPO]
   cd lbc_API
   ```

2. Installez les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

## Utilisation

### Lancer une recherche

```bash
python run_pipeline.py
```

Suivez les instructions pour :
1. Ajouter des localisations (villes, codes postaux)
2. Définir vos critères de recherche
3. Lancer la collecte des données

### Afficher les résultats

Pour afficher les résultats d'une recherche précédente :

```bash
python display_ads.py [fichier_json]
```

Options disponibles :
- `--max-price PRIX` : Filtrer par prix maximum
- `--min-surface SURFACE` : Filtrer par surface minimale
- `--location VILLE` : Filtrer par localisation

### Calculer des moyennes

Pour calculer des moyennes à partir des données :

```bash
python calculate_average.py [fichier_json]
```

## Fichiers importants

- `run_pipeline.py` : Point d'entrée principal pour lancer une recherche
- `display_ads.py` : Affiche les annonces sous forme de tableau
- `calculate_average.py` : Calcule des statistiques sur les données
- `url_builder.py` : Gère la construction des URLs de recherche
- `scraper.py` : Contient les fonctions de scraping
- `extract_ads.py` : Extrait les données des annonces

## Exemple de sortie

Le script affiche un tableau détaillé des annonces avec :
- ID
- Localisation
- Prix
- Surface
- Prix/m²
- Mensualité estimée (3.5% sur 25 ans)
- Différence (loyer - mensualité) pour les locations
- Description

## Personnalisation

Vous pouvez modifier les paramètres de recherche par défaut dans `url_builder.py` :
- Taux d'intérêt
- Durée d'emprunt
- Filtres par défaut (surface, nombre de pièces, etc.)

## Avertissement

Ce projet est à but éducatif. Veuillez respecter les conditions d'utilisation de Le Bon Coin et ne pas surcharger leurs serveurs avec des requêtes trop fréquentes.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
