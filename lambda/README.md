# AWS Lambda Functions - LBC API

Ce dossier contient toutes les fonctions AWS Lambda utilisées par l'application LBC API pour le scraping et le traitement des annonces immobilières du Bon Coin.

## Architecture

```
lambda/
└── functions/
    ├── page/           # Proxy HTTP pour récupérer le HTML des pages
    ├── extractAds/     # Parser HTML et extraction des annonces
    └── saveSearch/     # Sauvegarde des résultats dans S3
```

## Fonctions Lambda

### 1. 🌐 Page Proxy (`page/`)
**Runtime:** Node.js 18.x  
**Rôle:** Récupérer le HTML de pages web en contournant CORS

**Fonctionnalités:**
- Proxy HTTP/HTTPS avec headers réalistes
- Simulation de navigateur Firefox 133
- Support compression gzip/deflate/brotli
- CORS activé

**Endpoint:** `GET/POST /page?url={url}`

[Documentation complète →](functions/page/README.md)

---

### 2. 📊 Extract Ads (`extractAds/`)
**Runtime:** Python 3.11  
**Rôle:** Parser le HTML et extraire les annonces immobilières

**Fonctionnalités:**
- Parsing HTML avec BeautifulSoup4
- Extraction structurée des données (titre, prix, localisation, etc.)
- Conversion des dates relatives
- Support vente et location

**Endpoint:** `POST /extract-ads`

[Documentation complète →](functions/extractAds/README.md)

---

### 3. 💾 Save Search (`saveSearch/`)
**Runtime:** Python 3.11  
**Rôle:** Sauvegarder les résultats de recherche dans S3

**Fonctionnalités:**
- Sauvegarde organisée par utilisateur dans S3
- Validation des données (email, timestamp, payload)
- Tagging S3 pour restrictions d'accès
- Métadonnées enrichies

**Endpoint:** `POST /save-search`

[Documentation complète →](functions/saveSearch/README.md)

---

## Flux de travail

```
┌─────────────┐
│   Frontend  │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Demande HTML
       ▼
┌─────────────────┐
│   Page Proxy    │──► Récupère HTML depuis LBC
│  (Node.js 18)   │
└────────┬────────┘
         │ 2. Retourne HTML
         ▼
┌─────────────────┐
│    Frontend     │──► Parse localement OU
└────────┬────────┘
         │ 3. Envoie HTML
         ▼
┌─────────────────┐
│   Extract Ads   │──► Parse et extrait les données
│  (Python 3.11)  │
└────────┬────────┘
         │ 4. Retourne JSON structuré
         ▼
┌─────────────────┐
│    Frontend     │──► Affiche les annonces
└────────┬────────┘
         │ 5. Enregistrement (optionnel)
         ▼
┌─────────────────┐
│   Save Search   │──► Sauvegarde dans S3
│  (Python 3.11)  │
└─────────────────┘
```

## Déploiement

### Prérequis
- AWS CLI configuré
- Compte AWS avec permissions Lambda, S3, API Gateway
- Node.js 18+ (pour `page`)
- Python 3.11+ (pour `extractAds` et `saveSearch`)

### Déployer toutes les fonctions

```bash
# 1. Page Proxy
cd lambda/functions/page
npm install
zip -r lambda-code.zip index.js package.json
aws lambda update-function-code --function-name pageProxy --zip-file fileb://lambda-code.zip

# 2. Extract Ads
cd ../extractAds
pip install -r requirements.txt -t .
zip -r function.zip extract_ads.py bs4/ soupsieve/ *.dist-info/
aws lambda update-function-code --function-name extractAds --zip-file fileb://function.zip

# 3. Save Search
cd ../saveSearch
pip install -r requirements.txt -t .
zip -r function.zip save_search.py boto3/ botocore/ *.dist-info/
aws lambda update-function-code --function-name saveSearch --zip-file fileb://function.zip
```

## Configuration API Gateway

### Endpoints requis

| Méthode | Path | Lambda | CORS |
|---------|------|--------|------|
| GET, POST | `/page` | pageProxy | ✅ |
| POST | `/extract-ads` | extractAds | ✅ |
| POST | `/save-search` | saveSearch | ✅ |

### Autorisation
- `/page` et `/extract-ads` : Public ou API Key
- `/save-search` : Cognito User Pool recommandé

## Variables d'environnement

### Save Search
```bash
BUCKET_NAME=bucket-test-new-app
```

### Autres fonctions
Aucune variable d'environnement requise.

## Permissions IAM

### Page Proxy
Aucune permission AWS requise (seulement accès HTTP externe)

### Extract Ads
Aucune permission AWS requise

### Save Search
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectTagging"
            ],
            "Resource": "arn:aws:s3:::bucket-test-new-app/users/*"
        }
    ]
}
```

## Surveillance et Logs

Tous les logs sont disponibles dans CloudWatch Logs :
- `/aws/lambda/pageProxy`
- `/aws/lambda/extractAds`
- `/aws/lambda/saveSearch`

## Structure Git

### Fichiers versionnés (✅ dans Git)
```
functions/
├── page/
│   ├── index.js              ✅
│   ├── package.json          ✅
│   ├── .gitignore            ✅
│   └── README.md             ✅
├── extractAds/
│   ├── extract_ads.py        ✅
│   ├── requirements.txt      ✅
│   ├── .gitignore            ✅
│   └── README.md             ✅
└── saveSearch/
    ├── save_search.py        ✅
    ├── requirements.txt      ✅
    ├── .gitignore            ✅
    └── README.md             ✅
```

### Fichiers exclus (❌ pas dans Git)
```
functions/
├── page/
│   ├── node_modules/         ❌ (.gitignore)
│   ├── lambda-code.zip       ❌ (.gitignore)
│   └── package-lock.json     ❌ (.gitignore)
├── extractAds/
│   ├── venv/                 ❌ (.gitignore)
│   ├── function.zip          ❌ (.gitignore)
│   ├── __pycache__/          ❌ (.gitignore)
│   └── bs4/                  ❌ (dépendance installée)
└── saveSearch/
    ├── venv/                 ❌ (.gitignore)
    ├── function.zip          ❌ (.gitignore)
    ├── __pycache__/          ❌ (.gitignore)
    └── boto3/                ❌ (dépendance installée)
```

## Coûts estimés

### Free Tier AWS Lambda
- 1M requêtes/mois gratuites
- 400 000 GB-secondes de calcul gratuits

### Au-delà du Free Tier
- **Page Proxy:** ~$0.20 pour 1000 requêtes
- **Extract Ads:** ~$0.40 pour 1000 requêtes (plus de mémoire)
- **Save Search:** ~$0.20 pour 1000 requêtes + coûts S3

## Maintenance

### Mise à jour des dépendances

**Node.js (Page Proxy):**
```bash
cd functions/page
npm update
npm audit fix
```

**Python (Extract Ads & Save Search):**
```bash
cd functions/extractAds
pip install --upgrade -r requirements.txt

cd ../saveSearch
pip install --upgrade -r requirements.txt
```

### Monitoring
- CloudWatch Metrics : Surveiller les invocations, erreurs, durée
- CloudWatch Logs : Déboguer les erreurs
- X-Ray : Tracer les requêtes (optionnel)

## Support

Pour toute question :
1. Consultez les README individuels de chaque fonction
2. Vérifiez les logs CloudWatch
3. Consultez la documentation AWS Lambda

---

**Dernière mise à jour:** Octobre 2025
