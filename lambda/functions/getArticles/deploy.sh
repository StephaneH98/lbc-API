#!/bin/bash

# Script de déploiement pour la Lambda getArticles
# Usage: ./deploy.sh

set -e

FUNCTION_NAME="getArticles"
REGION="eu-west-3"
ROLE_ARN="arn:aws:iam::381491974509:role/MyLambdaExecutionRole"

echo "🚀 Déploiement de la Lambda ${FUNCTION_NAME}..."

# Créer le package ZIP
echo "📦 Création du package ZIP..."
zip -j function.zip lambda_function.py

# Vérifier si la fonction existe
echo "🔍 Vérification de l'existence de la fonction..."
if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} 2>/dev/null; then
    # Mise à jour du code
    echo "🔄 Mise à jour du code de la fonction..."
    aws lambda update-function-code \
        --function-name ${FUNCTION_NAME} \
        --zip-file fileb://function.zip \
        --region ${REGION}

    echo "✅ Code mis à jour avec succès"
else
    # Création de la fonction
    echo "🆕 Création de la fonction Lambda..."
    aws lambda create-function \
        --function-name ${FUNCTION_NAME} \
        --runtime python3.9 \
        --role ${ROLE_ARN} \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment "Variables={BUCKET_NAME=bucket-test-new-app}" \
        --region ${REGION}

    echo "✅ Fonction créée avec succès"
fi

# Nettoyer
echo "🧹 Nettoyage..."
rm function.zip

echo "✅ Déploiement terminé !"
echo "📝 Nom de la fonction: ${FUNCTION_NAME}"
echo "🌍 Région: ${REGION}"
