# 🚀 Guide de Déploiement - Lambda Functions

Ce guide explique comment déployer les fonctions Lambda **sans polluer votre dépôt Git** avec des dépendances.

## ⚠️ Règle d'Or

**JAMAIS** exécuter `pip install -r requirements.txt` ou `npm install` directement dans les dossiers des fonctions !

Les dépendances ne doivent **PAS** être versionnées dans Git.

## 📋 Prérequis

- Python 3.11+ (pour les fonctions Python)
- Node.js 18+ (pour les fonctions Node.js)
- pip (gestionnaire de paquets Python)
- zip (outil de compression)
- Accès AWS avec permissions Lambda

## 🎯 Méthode Recommandée

### Option 1: Déployer toutes les fonctions

```bash
cd lambda
chmod +x deploy-all.sh
./deploy-all.sh
```

Cette commande va :
- ✅ Créer un package `function.zip` pour chaque fonction
- ✅ Installer les dépendances dans des dossiers temporaires
- ✅ Nettoyer automatiquement après chaque build
- ✅ Afficher un résumé des succès/échecs

### Option 2: Déployer une fonction spécifique

```bash
# Exemple pour getUserSearches
cd lambda/functions/getUserSearches
chmod +x deploy.sh
./deploy.sh
```

## 📤 Upload vers AWS

Après avoir créé les packages, vous pouvez les uploader :

### Via AWS CLI

```bash
# Exemple pour getUserSearches
aws lambda update-function-code \
  --function-name getUserSearches \
  --zip-file fileb://function.zip

# Exemple pour saveSearch
aws lambda update-function-code \
  --function-name saveSearch \
  --zip-file fileb://function.zip
```

### Via Console AWS

1. Ouvrir [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Sélectionner la fonction
3. Cliquer sur "Upload from" → ".zip file"
4. Sélectionner `function.zip`
5. Sauvegarder

## 🔧 Workflow Complet (Première fois)

### 1. Créer la fonction Lambda dans AWS

```bash
# Exemple pour getUserSearches
aws lambda create-function \
  --function-name getUserSearches \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler get_user_searches.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables={BUCKET_NAME=bucket-test-new-app}
```

### 2. Configurer API Gateway

- Créer une route (ex: `GET /user-searches`)
- L'intégrer avec la Lambda
- Activer CORS
- (Optionnel) Ajouter l'autorisation Cognito

### 3. Configurer les permissions IAM

Exemple pour `getUserSearches` :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:HeadObject"
            ],
            "Resource": [
                "arn:aws:s3:::bucket-test-new-app",
                "arn:aws:s3:::bucket-test-new-app/users/*"
            ]
        }
    ]
}
```

## 📝 Que se passe-t-il pendant le déploiement ?

1. **Création d'un dossier temporaire** (`build_temp/`)
   ```
   lambda/functions/getUserSearches/
   ├── get_user_searches.py        ← Dans Git ✅
   ├── requirements.txt            ← Dans Git ✅
   ├── deploy.sh                   ← Dans Git ✅
   ├── README.md                   ← Dans Git ✅
   ├── .gitignore                  ← Dans Git ✅
   └── build_temp/                 ← Temporaire ❌
       ├── get_user_searches.py
       ├── requirements.txt
       ├── boto3/                  ← Dépendances
       ├── botocore/
       └── ...
   ```

2. **Copie des fichiers sources** dans `build_temp/`

3. **Installation des dépendances** dans `build_temp/`
   ```bash
   pip install -r requirements.txt -t build_temp/
   ```

4. **Création du zip** depuis `build_temp/`
   ```bash
   cd build_temp
   zip -r ../function.zip .
   ```

5. **Nettoyage du dossier temporaire**
   ```bash
   rm -rf build_temp/
   ```

6. **Résultat** : `function.zip` créé, prêt à être uploadé ✅

## ❌ Ce qui NE doit PAS être dans Git

```
lambda/functions/getUserSearches/
├── boto3/              ❌ Dépendance Python
├── botocore/           ❌ Dépendance Python
├── build_temp/         ❌ Dossier temporaire
├── function.zip        ❌ Package de déploiement
├── *.dist-info/        ❌ Métadonnées de packages
└── __pycache__/        ❌ Cache Python
```

## ✅ Ce qui DOIT être dans Git

```
lambda/functions/getUserSearches/
├── get_user_searches.py    ✅ Code source
├── requirements.txt        ✅ Liste des dépendances
├── README.md              ✅ Documentation
├── .gitignore             ✅ Règles d'exclusion
└── deploy.sh              ✅ Script de déploiement
```

## 🐛 Dépannage

### Problème: "Permission denied" sur deploy.sh

**Solution:**
```bash
chmod +x deploy.sh
```

### Problème: pip n'installe pas les dépendances

**Solution:**
```bash
# Vérifier que pip est installé
pip --version

# Utiliser pip3 si nécessaire
pip3 install -r requirements.txt -t build_temp/
```

### Problème: Le zip est trop gros

**Solution:**
```bash
# Utiliser la compression maximale
zip -r9 function.zip .
```

### Problème: Les dépendances apparaissent dans Git

**Solution:**
```bash
# Vérifier que le .gitignore est correct
cat .gitignore

# Nettoyer le cache Git
git rm -r --cached boto3/ botocore/
git commit -m "Remove dependencies from Git"
```

## 📚 Ressources

- [Documentation AWS Lambda - Python](https://docs.aws.amazon.com/lambda/latest/dg/python-package.html)
- [Documentation AWS Lambda - Node.js](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html)
- [Best Practices pour Lambda](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## 🆘 Support

Pour toute question :
1. Consulter le README de chaque fonction
2. Vérifier les logs CloudWatch
3. Tester localement avec `python nom_fichier.py`
