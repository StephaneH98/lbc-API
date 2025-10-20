#!/bin/bash

###############################################
# Script de déploiement de toutes les Lambdas
# Crée les packages pour toutes les fonctions
###############################################

echo "🚀 Déploiement de toutes les fonctions Lambda"
echo "=============================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="${SCRIPT_DIR}/functions"

# Liste des fonctions Lambda
FUNCTIONS=("getUserSearches" "saveSearch")

# Compteurs
SUCCESS_COUNT=0
FAIL_COUNT=0

echo -e "${BLUE}📁 Répertoire des fonctions: ${FUNCTIONS_DIR}${NC}"
echo ""

# Déployer chaque fonction
for func in "${FUNCTIONS[@]}"; do
    FUNC_DIR="${FUNCTIONS_DIR}/${func}"
    DEPLOY_SCRIPT="${FUNC_DIR}/deploy.sh"

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 Déploiement de ${func}...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Vérifier que le dossier existe
    if [ ! -d "$FUNC_DIR" ]; then
        echo -e "${RED}❌ Dossier introuvable: ${FUNC_DIR}${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo ""
        continue
    fi

    # Vérifier que le script de déploiement existe
    if [ ! -f "$DEPLOY_SCRIPT" ]; then
        echo -e "${RED}❌ Script de déploiement introuvable: ${DEPLOY_SCRIPT}${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo ""
        continue
    fi

    # Rendre le script exécutable
    chmod +x "$DEPLOY_SCRIPT"

    # Exécuter le déploiement
    cd "$FUNC_DIR"
    ./deploy.sh

    if [ $? -eq 0 ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "${GREEN}✅ ${func} déployé avec succès${NC}"
    else
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo -e "${RED}❌ Échec du déploiement de ${func}${NC}"
    fi

    echo ""
    cd "$SCRIPT_DIR"
done

# Résumé
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 RÉSUMÉ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   Total de fonctions: ${#FUNCTIONS[@]}"
echo -e "   ${GREEN}✅ Succès: ${SUCCESS_COUNT}${NC}"
echo -e "   ${RED}❌ Échecs: ${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les fonctions ont été déployées avec succès !${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Certaines fonctions n'ont pas pu être déployées${NC}"
    exit 1
fi
