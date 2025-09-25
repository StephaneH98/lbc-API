import json
import sys
import math
from tabulate import tabulate
from config import LOAN_PARAMS, DISPLAY_CONFIG

def calculer_mensualite(montant, taux_annuel, duree_annees):
    """
    Calcule la mensualité d'un prêt immobilier
    
    Args:
        montant (float): Montant du prêt en euros
        taux_annuel (float): Taux d'intérêt annuel (en pourcentage, ex: 3.5 pour 3.5%)
        duree_annees (int): Durée du prêt en années
        
    Returns:
        float: Montant de la mensualité
    """
    if montant <= 0 or taux_annuel <= 0 or duree_annees <= 0:
        return 0.0
        
    taux_mensuel = (taux_annuel / 100) / 12
    nb_mensualites = duree_annees * 12
    
    # Éviter la division par zéro
    if taux_mensuel == 0:
        return montant / nb_mensualites
        
    # Formule de calcul de la mensualité
    mensualite = (montant * taux_mensuel) / (1 - (1 + taux_mensuel) ** -nb_mensualites)
    
    return round(mensualite, 2)

def load_announcements(json_file):
    """Charge les annonces depuis un fichier JSON"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Erreur: Le fichier {json_file} n'a pas été trouvé.")
        return None
    except json.JSONDecodeError:
        print("Erreur: Le fichier n'est pas un JSON valide.")
        return None

def calculate_statistics(announcements):
    """Calcule les statistiques des annonces"""
    if not announcements:
        return None
    
    prix_m2 = [a['prix_m2'] for a in announcements if a.get('prix_m2') is not None]
    
    if not prix_m2:
        return None
    
    # Calcul des moyennes par ville
    villes = {}
    for annonce in announcements:
        if 'localisation' in annonce and 'prix_m2' in annonce and annonce['prix_m2'] is not None:
            ville = annonce['localisation'].split()[0]  # Prendre le premier mot comme nom de ville
            if ville not in villes:
                villes[ville] = []
            villes[ville].append(annonce['prix_m2'])
    
    # Calcul des moyennes
    moyennes_par_ville = {}
    for ville, prix in villes.items():
        if prix:  # S'assurer que la liste n'est pas vide
            moyennes_par_ville[ville] = round(sum(prix) / len(prix), 2)
    
    # Trier les villes par prix moyen décroissant
    villes_triees = sorted(moyennes_par_ville.items(), key=lambda x: x[1], reverse=True)
    
    return {
        'nombre_annonces': len(announcements),
        'prix_m2_moyen': round(sum(prix_m2) / len(prix_m2), 2),
        'prix_m2_min': min(prix_m2),
        'prix_m2_max': max(prix_m2),
        'moyennes_par_ville': dict(villes_triees)
    }

def display_statistics(stats):
    """Affiche les statistiques des annonces"""
    if not stats:
        return
    
    print("\n" + "="*50)
    print("STATISTIQUES DES PRIX AU MÈTRE CARRÉ")
    print("="*50)
    print(f"Nombre total d'annonces : {stats['nombre_annonces']}")
    print(f"Prix moyen au m² : {stats['prix_m2_moyen']:,.2f} €/m²".replace(',', ' '))
    print(f"Prix minimum au m² : {stats['prix_m2_min']:,.2f} €/m²".replace(',', ' '))
    print(f"Prix maximum au m² : {stats['prix_m2_max']:,.2f} €/m²".replace(',', ' '))
    print("="*50 + "\n")

def format_price(price):
    """Formate un prix avec un séparateur de milliers"""
    return f"{price:,} €".replace(',', ' ')

def format_surface(surface):
    """Formate une surface avec l'unité"""
    return f"{surface} m²"

def calculate_average_rent(announcements):
    """Calcule le loyer moyen au m² à partir des annonces de location"""
    rents = []
    for annonce in announcements:
        # Vérifier si c'est une annonce de location et qu'elle a un prix et une surface
        if (annonce.get('category') == 'location' and 
            annonce.get('prix') and 
            annonce.get('surface_m2')):
            loyer_m2 = annonce['prix'] / annonce['surface_m2']
            rents.append(loyer_m2)
    
    # Retourner la moyenne des loyers au m², ou une valeur par défaut si pas assez de données
    return round(sum(rents) / len(rents), 2) if rents else 15

def display_announcements_table(announcements):
    """Affiche les annonces sous forme de tableau"""
    if not announcements:
        print("Aucune annonce à afficher.")
        return
    
    # Calculer le loyer moyen au m²
    loyer_moyen_m2 = calculate_average_rent(announcements)
    print(f"\nLoyer moyen estimé : {loyer_moyen_m2} €/m²")
    
    # Afficher les statistiques avant le tableau
    stats = calculate_statistics(announcements)
    if stats:
        display_statistics(stats)
    
    # Préparer les données pour le tableau
    table_data = []
    for annonce in announcements:
        # Calculer la mensualité avec les paramètres du prêt
        prix_annonce = annonce.get('prix', 0)
        mensualite = calculer_mensualite(
            prix_annonce, 
            LOAN_PARAMS['interest_rate'], 
            LOAN_PARAMS['loan_duration_years']
        ) if prix_annonce else 0
        
        surface = annonce.get('surface_m2', 0)
        
        # Si c'est une annonce de location, utiliser son propre loyer
        if annonce.get('category') == 'location':
            loyer_mensuel = annonce.get('prix', 0)
        else:
            # Pour les annonces de vente, estimer le loyer mensuel en fonction de la surface et du loyer moyen au m²
            loyer_mensuel = surface * loyer_moyen_m2 if surface > 0 else 0
        
        # Calculer la différence entre le loyer mensuel estimé et la mensualité
        difference = (loyer_mensuel - mensualite) if loyer_mensuel > 0 and mensualite > 0 else None
        difference_str = format_price(int(difference)) if difference is not None else 'N/A'
        
        # Récupérer le nombre de pièces depuis les données de l'annonce
        pieces = annonce.get('pieces', 'N/A')
        
        table_data.append([
            annonce.get('id', 'N/A'),
            annonce.get('localisation', 'N/A'),
            format_price(prix_annonce),
            format_surface(annonce.get('surface_m2', 0)),
            pieces,
            format_price(annonce.get('prix_m2', 0)) + '/m²',
            format_price(int(mensualite)) if mensualite > 0 else 'N/A',
            difference_str,
            annonce.get('description', 'N/A')
        ])
    
    # En-têtes du tableau
    headers = ["ID", "Localisation", "Prix", "Surface", "Pièces", "Prix/m²", "Mensualité (3.5% - 25 ans)", "Différence (loyer - mensualité)", "Description"]
    
    # Afficher le tableau
    separator = '=' * DISPLAY_CONFIG['page_width']
    print("\n" + separator)
    print(f"LISTE DÉTAILLÉE DES ANNONCES ({len(announcements)} résultats)")
    print(separator)
    
    # Utiliser tabulate pour un affichage propre
    print(tabulate(table_data, headers=headers, tablefmt='grid', stralign='right', numalign='right'))
    
    # Afficher un résumé
    separator = '-' * DISPLAY_CONFIG['page_width']
    print("\n" + separator)
    print(f"Total : {len(announcements)} annonces affichées")
    print(separator + "\n")

def filter_announcements(announcements, max_price=None, min_surface=None, location=None):
    """Filtre les annonces selon des critères"""
    filtered = announcements.copy()
    
    if max_price is not None:
        filtered = [a for a in filtered if a.get('prix', float('inf')) <= max_price]
    if min_surface is not None:
        filtered = [a for a in filtered if a.get('surface_m2', 0) >= min_surface]
    if location:
        location = location.lower()
        filtered = [a for a in filtered if location in a.get('localisation', '').lower()]
    
    return filtered

def main():
    if len(sys.argv) < 2:
        print("Usage: python display_ads.py <fichier_json> [--max-price PRIX] [--min-surface SURFACE] [--location VILLE]")
        print("Exemple: python display_ads.py annonces_data.json --max-price 100000 --min-surface 50 --location albi")
        sys.exit(1)
    
    json_file = sys.argv[1]
    
    # Traiter les arguments optionnels
    max_price = None
    min_surface = None
    location = None
    
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--max-price' and i + 1 < len(sys.argv):
            try:
                max_price = int(sys.argv[i+1])
                i += 2
            except ValueError:
                print(f"Erreur: Le prix maximum doit être un nombre.")
                sys.exit(1)
        elif sys.argv[i] == '--min-surface' and i + 1 < len(sys.argv):
            try:
                min_surface = int(sys.argv[i+1])
                i += 2
            except ValueError:
                print(f"Erreur: La surface minimale doit être un nombre.")
                sys.exit(1)
        elif sys.argv[i] == '--location' and i + 1 < len(sys.argv):
            location = sys.argv[i+1]
            i += 2
        else:
            i += 1
    
    # Charger les annonces
    announcements = load_announcements(json_file)
    if not announcements:
        return
    
    # Appliquer les filtres
    filtered_announcements = filter_announcements(
        announcements,
        max_price=max_price,
        min_surface=min_surface,
        location=location
    )
    
    # Afficher le tableau avec les statistiques
    display_announcements_table(filtered_announcements)

if __name__ == "__main__":
    main()
