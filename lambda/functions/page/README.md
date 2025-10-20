# Lambda Function: Page Proxy

## Description
Cette fonction Lambda AWS agit comme un proxy HTTP pour récupérer le contenu HTML de pages web en contournant les restrictions CORS et en simulant un navigateur réel.

## Fonctionnalités
- ✅ Récupération de pages HTML via HTTP/HTTPS
- ✅ Headers réalistes simulant un navigateur (Firefox 133)
- ✅ Support de la compression gzip/deflate/brotli
- ✅ Gestion des redirections
- ✅ Headers personnalisables
- ✅ Support CORS complet
- ✅ Gestion d'erreurs robuste

## Déploiement

### 1. Installer les dépendances
```bash
cd lambda/functions/page
npm install
```

### 2. Créer le package de déploiement
```bash
zip -r lambda-code.zip index.js package.json
# Note: node_modules/ est exclu par .gitignore
```

## Fichiers du projet
- `index.js` : Code principal de la fonction Lambda
- `package.json` : Dépendances Node.js
- `.gitignore` : Exclusions Git (node_modules, *.zip, etc.)
- `README.md` : Cette documentation

## Support
Pour toute question, consultez les logs CloudWatch de la fonction Lambda.
