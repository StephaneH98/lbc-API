#!/bin/bash

###############################################
# Script de déploiement Lambda saveSearch
# Crée un package sans polluer le dépôt Git
###############################################

echo "🚀 Début du déploiement de saveSearch"
echo "=========================================="

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Nom de la fonction
FUNCTION_NAME="saveSearch"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}📁 Répertoire de travail: ${SCRIPT_DIR}${NC}"

# Utiliser un dossier temporaire local pour éviter les problèmes de partage réseau
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows - utiliser le dossier temp local
    BUILD_DIR="${TEMP}/lambda_build_${FUNCTION_NAME}"
else
    # Linux/Mac - utiliser /tmp
    BUILD_DIR="/tmp/lambda_build_${FUNCTION_NAME}"
fi

echo -e "${BLUE}🗂️  Création du dossier temporaire: ${BUILD_DIR}${NC}"

# Nettoyer si existe déjà
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Nettoyage du dossier temporaire existant..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"

# Copier les fichiers sources
echo -e "${BLUE}📄 Copie des fichiers sources...${NC}"
cp "${SCRIPT_DIR}/save_search.py" "$BUILD_DIR/"
cp "${SCRIPT_DIR}/lambda_function.py" "$BUILD_DIR/" 2>/dev/null || true
cp "${SCRIPT_DIR}/requirements.txt" "$BUILD_DIR/"

# Installer les dépendances dans le dossier temporaire
echo -e "${BLUE}📦 Installation des dépendances...${NC}"
python -m pip install -r "${BUILD_DIR}/requirements.txt" -t "$BUILD_DIR" --quiet --disable-pip-version-check

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
    rm -rf "$BUILD_DIR"
    exit 1
fi

# Créer le zip depuis le dossier temporaire
echo -e "${BLUE}📦 Création du package function.zip...${NC}"
cd "$BUILD_DIR"

# Utiliser python -m zipfile pour la compatibilité Windows
python -m zipfile -c "${SCRIPT_DIR}/function.zip" ./*

if [ $? -ne 0 ]; then
    # Fallback: essayer avec la commande zip si disponible
    if command -v zip &> /dev/null; then
        zip -r9 "${SCRIPT_DIR}/function.zip" . -q
    else
        echo -e "${RED}❌ Erreur lors de la création du zip${NC}"
        cd "$SCRIPT_DIR"
        rm -rf "$BUILD_DIR"
        exit 1
    fi
fi

cd "$SCRIPT_DIR"

# Nettoyer le dossier temporaire
echo -e "${BLUE}🧹 Nettoyage du dossier temporaire...${NC}"
rm -rf "$BUILD_DIR"

# Afficher la taille du package
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows - utiliser PowerShell pour afficher la taille
    ZIP_SIZE=$(powershell -Command "(Get-Item '${SCRIPT_DIR}/function.zip').Length / 1KB" | awk '{printf "%.2f KB", $1}')
else
    ZIP_SIZE=$(du -h "${SCRIPT_DIR}/function.zip" | cut -f1)
fi

echo -e "${GREEN}✅ Package créé avec succès: function.zip (${ZIP_SIZE})${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo "=========================================="
echo ""
echo "📤 Pour uploader vers AWS Lambda:"
echo ""
echo "   Option 1 - Via AWS CLI:"
echo "   aws lambda update-function-code \\"
echo "     --function-name ${FUNCTION_NAME} \\"
echo "     --zip-file fileb://function.zip"
echo ""
echo "   Option 2 - Via Console AWS:"
echo "   1. Ouvrir AWS Lambda Console"
echo "   2. Sélectionner la fonction '${FUNCTION_NAME}'"
echo "   3. Upload → function.zip"
echo ""
echo "📋 Variables d'environnement à configurer:"
echo "   BUCKET_NAME=bucket-test-new-app"
echo ""
