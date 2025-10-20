# Lambda Function: Extract Ads

## Description
Cette fonction Lambda extrait et parse les annonces immobilières à partir du HTML des pages du Bon Coin. Elle transforme le HTML brut en données structurées JSON prêtes à être affichées.

## Fonctionnalités
- ✅ Parsing HTML avec BeautifulSoup4
- ✅ Extraction des informations d'annonces (titre, prix, localisation, surface, pièces, etc.)
- ✅ Conversion des dates relatives ("Aujourd'hui", "Hier", "Il y a X jours")
- ✅ Gestion des annonces de vente et de location
- ✅ Nettoyage et normalisation des données
- ✅ Support CORS complet
- ✅ Gestion d'erreurs robuste

## Utilisation

### Requête
```http
POST /extract-ads
Content-Type: application/json

{
    "html": "<html>...</html>",
    "type": "vente"
}
```

### Paramètres
- `html` (requis): Code HTML de la page à parser
- `type` (optionnel): Type d'annonces ("vente" ou "location", par défaut "vente")

### Réponse (Succès)
```json
{
    "statusCode": 200,
    "headers": {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    "body": {
        "success": true,
        "count": 35,
        "ads": [
            {
                "titre": "Appartement T3 avec balcon",
                "prix": "180000",
                "localisation": "Perpignan 66000",
                "surface_m2": "65",
                "pieces": "3",
                "date_publication": "2025-10-20",
                "url": "https://www.leboncoin.fr/...",
                "description": "Bel appartement..."
            }
        ]
    }
}
```

## Données extraites

### Pour chaque annonce
- `titre`: Titre de l'annonce
- `prix`: Prix (nombre ou chaîne avec unité)
- `localisation`: Ville et code postal
- `surface_m2`: Surface en mètres carrés (si disponible)
- `pieces`: Nombre de pièces (si disponible)
- `date_publication`: Date au format ISO (YYYY-MM-DD)
- `url`: URL complète de l'annonce
- `description`: Description courte

### Gestion des dates
La fonction convertit les dates relatives en dates ISO :
- "Aujourd'hui" → 2025-10-20
- "Hier" → 2025-10-19
- "Il y a 3 jours" → 2025-10-17
- "25 oct. 2025" → 2025-10-25

## Variables d'environnement
Aucune variable d'environnement requise.

## Dépendances Python
```
beautifulsoup4==4.12.2
```

## Déploiement

### 1. Installer les dépendances
```bash
cd lambda/functions/extractAds
pip install -r requirements.txt -t .
```

### 2. Créer le package de déploiement
```bash
zip -r function.zip extract_ads.py bs4/ soupsieve/ beautifulsoup4-*.dist-info/ soupsieve-*.dist-info/
```

### 3. Créer la Lambda dans AWS
```bash
aws lambda create-function \
  --function-name extractAds \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler extract_ads.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512
```

## Fichiers du projet
- `extract_ads.py` : Code principal de la fonction Lambda
- `requirements.txt` : Dépendances Python
- `.gitignore` : Exclusions Git (venv/, *.zip, __pycache__, etc.)
- `README.md` : Cette documentation

## Logs CloudWatch
Les logs incluent :
- 📦 Taille du HTML reçu
- 🔍 Nombre d'annonces trouvées
- ⚠️ Warnings pour données manquantes
- ❌ Erreurs de parsing

## Limitations
- Dépend de la structure HTML du Bon Coin (peut nécessiter des mises à jour)
- Ne supporte que les annonces immobilières
- Timeout maximum: 30 secondes

## Support
Pour toute question, consultez les logs CloudWatch de la fonction Lambda.
