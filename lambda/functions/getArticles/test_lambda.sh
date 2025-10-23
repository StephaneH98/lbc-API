#!/bin/bash

# Script de test pour la Lambda getArticles
# Usage: ./test_lambda.sh [test_number]
# Example: ./test_lambda.sh 1

FUNCTION_NAME="getArticles"
REGION="eu-west-3"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TEST DE LA LAMBDA: ${FUNCTION_NAME}${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Fonction pour exécuter un test
run_test() {
    local test_num=$1
    local test_name=$2
    local event=$3

    echo -e "${YELLOW}▶ ${test_name}${NC}"
    echo -e "${BLUE}Payload:${NC}"
    echo "$event" | jq '.'
    echo ""

    echo -e "${BLUE}📡 Invocation de la Lambda...${NC}\n"

    # Invoquer la Lambda
    aws lambda invoke \
        --function-name ${FUNCTION_NAME} \
        --region ${REGION} \
        --payload "$event" \
        --cli-binary-format raw-in-base64-out \
        response.json > /dev/null 2>&1

    # Vérifier le code de retour
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Lambda invoquée avec succès${NC}\n"

        # Afficher la réponse
        echo -e "${BLUE}📦 Réponse:${NC}"
        cat response.json | jq '.'
        echo ""

        # Extraire et afficher le body
        echo -e "${BLUE}📄 Body de la réponse:${NC}"
        cat response.json | jq -r '.body' | jq '.'
        echo ""
    else
        echo -e "${RED}❌ Erreur lors de l'invocation${NC}\n"
    fi

    echo -e "${BLUE}========================================${NC}\n"
}

# Menu des tests
show_menu() {
    echo -e "${YELLOW}Sélectionnez un test à exécuter:${NC}"
    echo "1. LIST - Récupérer tous les articles"
    echo "2. GET - Récupérer 'investir sans apport.json'"
    echo "3. GET - Récupérer 'meuble vs nu.json'"
    echo "4. GET - Récupérer 'cashflow positif.json'"
    echo "5. GET - Fichier inexistant (test d'erreur)"
    echo "6. Exécuter TOUS les tests"
    echo "0. Quitter"
    echo ""
}

# TEST 1: LIST tous les articles
test_1() {
    run_test 1 \
        "TEST 1: LIST - Récupérer tous les articles" \
        '{"queryStringParameters": null}'
}

# TEST 2: GET article spécifique
test_2() {
    run_test 2 \
        "TEST 2: GET - Récupérer un article spécifique" \
        '{"queryStringParameters": {"filename": "investir sans apport.json"}}'
}

# TEST 3: GET autre article
test_3() {
    run_test 3 \
        "TEST 3: GET - Récupérer un autre article" \
        '{"queryStringParameters": {"filename": "meuble vs nu.json"}}'
}

# TEST 4: GET article cash-flow
test_4() {
    run_test 4 \
        "TEST 4: GET - Récupérer un article sur le cash-flow" \
        '{"queryStringParameters": {"filename": "cashflow positif.json"}}'
}

# TEST 5: GET fichier inexistant (erreur)
test_5() {
    run_test 5 \
        "TEST 5: GET - Fichier inexistant (test d'erreur)" \
        '{"queryStringParameters": {"filename": "article-inexistant.json"}}'
}

# Exécuter tous les tests
run_all_tests() {
    echo -e "${GREEN}🚀 Exécution de TOUS les tests...${NC}\n"
    test_1
    sleep 1
    test_2
    sleep 1
    test_3
    sleep 1
    test_4
    sleep 1
    test_5
    echo -e "${GREEN}✅ Tous les tests sont terminés${NC}"
}

# Mode interactif ou argument
if [ $# -eq 0 ]; then
    # Mode interactif
    while true; do
        show_menu
        read -p "Votre choix: " choice
        echo ""

        case $choice in
            1) test_1 ;;
            2) test_2 ;;
            3) test_3 ;;
            4) test_4 ;;
            5) test_5 ;;
            6) run_all_tests ;;
            0)
                echo -e "${BLUE}Au revoir !${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Choix invalide${NC}\n"
                ;;
        esac

        read -p "Appuyez sur Entrée pour continuer..."
        clear
    done
else
    # Mode avec argument
    case $1 in
        1) test_1 ;;
        2) test_2 ;;
        3) test_3 ;;
        4) test_4 ;;
        5) test_5 ;;
        all) run_all_tests ;;
        *)
            echo -e "${RED}Usage: $0 [1|2|3|4|5|all]${NC}"
            exit 1
            ;;
    esac
fi

# Nettoyer
rm -f response.json
