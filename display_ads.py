# -*- coding: utf-8 -*-
import json
import sys
import math
import io
from datetime import datetime, timedelta
from tabulate import tabulate

# Configuration de l'encodage pour la console
if sys.platform.startswith('win'):
    import os
    os.system('chcp 65001 > nul')  # Passe en UTF-8 sous Windows
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from config import LOAN_PARAMS, DISPLAY_CONFIG

# Dictionnaire global pour stocker les loyers moyens par nombre de pièces
loyers_par_pieces = {}
prix_moyen_par_pieces = {}

def calculer_mensualite(montant, taux_annuel, duree_annees):
    """
    Calcule la mensualitÃ© d'un prÃªt immobilier
    
    Args:
        montant (float): Montant du prÃªt en euros
        taux_annuel (float): Taux d'intÃ©rÃªt annuel (en pourcentage, ex: 3.5 pour 3.5%)
        duree_annees (int): DurÃ©e du prÃªt en annÃ©es
        
    Returns:
        float: Montant de la mensualitÃ©
    """
    if montant <= 0 or taux_annuel <= 0 or duree_annees <= 0:
        return 0.0
        
    taux_mensuel = (taux_annuel / 100) / 12
    nb_mensualites = duree_annees * 12
    
    # ÃEviter la division par zÃ©ro
    if taux_mensuel == 0:
        return montant / nb_mensualites
        
    # Formule de calcul de la mensualitÃ©
    mensualite = (montant * taux_mensuel) / (1 - (1 + taux_mensuel) ** -nb_mensualites)
    
    return round(mensualite, 2)

def load_announcements(json_file):
    """Charge les annonces depuis un fichier JSON"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Erreur: Le fichier {json_file} n'a pas Ã©tÃ© trouvÃ©.")
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
    
    # Trier les villes par prix moyen dÃ©croissant
    villes_triees = sorted(moyennes_par_ville.items(), key=lambda x: x[1], reverse=True)
    
    return {
        'nombre_annonces': len(announcements),
        'prix_m2_moyen': round(sum(prix_m2) / len(prix_m2), 2),
        'prix_m2_min': min(prix_m2),
        'prix_m2_max': max(prix_m2),
        'moyennes_par_ville': dict(villes_triees)
    }

def calculate_stats_par_pieces(announcements):
    """Calcule les statistiques par nombre de pièces"""
    if not announcements:
        return None
    
    stats = {}
    for annonce in announcements:
        if 'pieces' in annonce and 'prix' in annonce and 'surface_m2' in annonce:
            pieces = annonce['pieces']
            if pieces not in stats:
                stats[pieces] = {
                    'count': 0,
                    'total_prix': 0,
                    'total_surface': 0,
                    'prix_min': float('inf'),
                    'prix_max': 0,
                    'prix_m2_min': float('inf'),
                    'prix_m2_max': 0
                }
            
            stats[pieces]['count'] += 1
            stats[pieces]['total_prix'] += annonce['prix']
            stats[pieces]['total_surface'] += annonce['surface_m2']
            stats[pieces]['prix_min'] = min(stats[pieces]['prix_min'], annonce['prix'])
            stats[pieces]['prix_max'] = max(stats[pieces]['prix_max'], annonce['prix'])
            
            if annonce['surface_m2'] > 0:
                prix_m2 = annonce['prix'] / annonce['surface_m2']
                stats[pieces]['prix_m2_min'] = min(stats[pieces]['prix_m2_min'], prix_m2)
                stats[pieces]['prix_m2_max'] = max(stats[pieces]['prix_m2_max'], prix_m2)
    
    # Calcul des moyennes
    for pieces, data in stats.items():
        data['prix_moyen'] = data['total_prix'] / data['count']
        data['surface_moyenne'] = data['total_surface'] / data['count']
        data['prix_m2_moyen'] = data['total_prix'] / data['total_surface'] if data['total_surface'] > 0 else 0
    
    return dict(sorted(stats.items()))

def display_statistics(stats, announcements=None):
    """Affiche les statistiques des annonces"""
    if not stats:
        return
    
    print("\n" + "="*50)
    print("STATISTIQUES DES PRIX AU MÃˆTRE CARRÃE")
    print("="*50)
    print(f"Nombre total d'annonces : {stats['nombre_annonces']}")
    print(f"Prix moyen au m² : {stats['prix_m2_moyen']:,.2f} €/m²".replace(',', ' '))
    print(f"Prix minimum au m² : {stats['prix_m2_min']:,.2f} €/m²".replace(',', ' '))
    print(f"Prix maximum au m² : {stats['prix_m2_max']:,.2f} €/m²".replace(',', ' '))
    
    # Afficher les statistiques par nombre de pièces si des annonces sont fournies
    if announcements:
        stats_pieces = calculate_stats_par_pieces(announcements)
        if stats_pieces:
            print("\n" + "="*50)
            print("STATISTIQUES PAR NOMBRE DE PIÃˆCES")
            print("="*50)
            print(f"{'Pièces':<8} | {'Annonces':<8} | {'Prix moyen':<15} | {'Surface moy.':<12} | {'Prix/m² moy.':<12} | {'Prix min':<10} | {'Prix max'}")
            print("-"*100)
            
            for pieces, data in stats_pieces.items():
                print(f"{pieces:<8} | "
                      f"{data['count']:<8} | "
                      f"{format_price(round(data['prix_moyen'], 2)):<15} | "
                      f"{data['surface_moyenne']:.1f} m²{'':<7} | "
                      f"{data['prix_m2_moyen']:.2f} €/m² | "
                      f"{format_price(data['prix_min']):<10} | "
                      f"{format_price(data['prix_max'])}")
    
    print("="*50 + "\n")

def format_price(price):
    """Formate un prix avec un sÃ©parateur de milliers"""
    return f"{price:,} €".replace(',', ' ')

def format_surface(surface):
    """Formate une surface avec l'unitÃ©"""
    return f"{surface} m²"

def calculate_average_rent(announcements):
    """Calcule le loyer moyen au m² Ã  partir des annonces de location"""
    rents = []
    for annonce in announcements:
        # VÃ©rifier si c'est une annonce de location et qu'elle a un prix et une surface
        if (annonce.get('category') == 'location' and 
            annonce.get('prix') and 
            annonce.get('surface_m2')):
            loyer_m2 = annonce['prix'] / annonce['surface_m2']
            rents.append(loyer_m2)
    
    # Retourner la moyenne des loyers au m², ou une valeur par dÃ©faut si pas assez de donnÃ©es
    return round(sum(rents) / len(rents), 2) if rents else 15

def display_announcements_table(announcements, rental_stats=None):
    """
    Affiche les annonces sous forme de tableau
    
    Args:
        announcements: Liste des annonces à afficher
        rental_stats: Dictionnaire des statistiques de location par nombre de pièces
                     (optionnel, utilisé pour calculer les différences de loyer)
    """
    if not announcements:
        print("Aucune annonce à afficher.")
        return
    
    # Calculer le loyer moyen global
    loyer_moyen_global = calculate_average_rent(announcements)
    
    # Mettre à jour le dictionnaire global des loyers moyens par nombre de pièces uniquement pour les locations
    global loyers_par_pieces
    is_rental = any(a.get('category') == 'location' for a in announcements) if announcements else False
    
    if is_rental and rental_stats:
        loyers_par_pieces.clear()  # Vider le dictionnaire avant de le remplir
        for pieces, data in rental_stats.items():
            if 'prix_moyen' in data:  # Utiliser directement le prix moyen
                loyers_par_pieces[pieces] = data['prix_moyen']
            elif 'prix_m2_moyen' in data and 'surface_moyenne' in data and data['surface_moyenne'] > 0:
                loyers_par_pieces[pieces] = data['prix_m2_moyen'] * data['surface_moyenne']
        
        # Afficher les statistiques avant le tableau
        if loyers_par_pieces:
            print("\nLoyers moyens par nombre de pièces :")
            for pieces, loyer in sorted(loyers_par_pieces.items()):
                print(f"- {pieces} pièce{'s' if pieces > 1 else ''} : {loyer:.2f}€")
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
            # Pour les annonces de vente, utiliser le loyer moyen pour ce nombre de pièces
            pieces = annonce.get('pieces')
            loyer_mensuel = loyers_par_pieces.get(pieces)
        
        # Calculer la différence entre le loyer mensuel et la mensualité
        difference = (loyer_mensuel - mensualite) if loyer_mensuel is not None and mensualite > 0 else None
        difference_str = format_price(int(difference)) if difference is not None else 'N/A'
        
        # Récupérer le nombre de pièces depuis les données de l'annonce
        pieces = annonce.get('pieces', 'N/A')
        
        # Calculer le temps écoulé depuis la publication
        temps_ecoule = 'N/A'
        date_publication = annonce.get('date_publication')
        if date_publication and date_publication != 'N/A':
            try:
                date_pub = datetime.strptime(date_publication, "%Y-%m-%d").date()
                aujourdhui = datetime.now().date()
                delta = aujourdhui - date_pub
                
                ans = delta.days // 365
                mois = (delta.days % 365) // 30
                jours = delta.days % 30
                
                if ans > 0:
                    temps_ecoule = f"il y a {ans} an{'s' if ans > 1 else ''}"
                    if mois > 0:
                        temps_ecoule += f" et {mois} mois"
                elif mois > 0:
                    temps_ecoule = f"il y a {mois} mois"
                    if jours > 0:
                        temps_ecoule += f" et {jours} jour{'s' if jours > 1 else ''}"
                else:
                    if delta.days == 0:
                        temps_ecoule = "aujourd'hui"
                    elif delta.days == 1:
                        temps_ecoule = "hier"
                    else:
                        temps_ecoule = f"il y a {delta.days} jour{'s' if delta.days > 1 else ''}"
                        
            except (ValueError, TypeError) as e:
                temps_ecoule = 'N/A'
        
        table_data.append([
            annonce.get('id', 'N/A'),
            annonce.get('localisation', 'N/A'),
            format_price(prix_annonce),
            format_surface(annonce.get('surface_m2', 0)),
            pieces,
            format_price(annonce.get('prix_m2', 0)) + '/m²',
            format_price(int(mensualite)) if mensualite > 0 else 'N/A',
            difference_str,
            temps_ecoule,
            annonce.get('description', 'N/A')
        ])
    
    # En-têtes du tableau
    headers = ["ID", "Localisation", "Prix", "Surface", "Pièces", "Prix/m²", 
               "Mensualité (3.5% - 25 ans)", "Différence (loyer - mensualité)", 
               "Publié il y a", "Description"]
    
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


def process_file(file_path, max_price=None, min_surface=None, location=None, is_rental=False):
    """
    Traite un seul fichier d'annonces
    
    Args:
        file_path (str): Chemin vers le fichier JSON des annonces
        max_price (int, optional): Prix maximum pour le filtrage
        min_surface (int, optional): Surface minimale pour le filtrage
        location (str, optional): Localisation pour le filtrage
        is_rental (bool): Si True, traite le fichier comme des locations (affichage diffÃ©rent)
    """
    print(f"\n{'='*80}")
    print(f"TRAITEMENT DU FICHIER: {file_path}".center(80))
    print(f"{'='*80}")
    
    # Charger les annonces
    announcements = load_announcements(file_path)
    if not announcements:
        print(f"Aucune annonce valide dans le fichier {file_path}")
        return
    
    # Appliquer les filtres
    filtered_announcements = filter_announcements(
        announcements,
        max_price=max_price,
        min_surface=min_surface,
        location=location
    )
    
    if not filtered_announcements:
        print("Aucune annonce ne correspond aux critères de recherche.")
        return
    
    # Calculer les statistiques
    stats = calculate_statistics(filtered_announcements)
    stats_pieces = calculate_stats_par_pieces(filtered_announcements)
    
    # Afficher les statistiques par nombre de pièces (toujours affichÃ©)
    if stats_pieces:
        if is_rental:
            for pieces, data in sorted(stats_pieces.items()):
                print(pieces, round(data['prix_moyen'], 2))
                loyers_par_pieces[pieces] = round(data['prix_moyen'], 2)
                print(loyers_par_pieces), print(prix_moyen_par_pieces)
        else:
            for pieces, data in sorted(stats_pieces.items()):
                print(pieces, round(data['prix_moyen'], 2))
                prix_moyen_par_pieces[pieces] = round(data['prix_moyen'], 2)
                print(prix_moyen_par_pieces), print(loyers_par_pieces)

        print("\nPRIX MOYEN PAR NOMBRE DE PIÃˆCES:")
        print(f"{'Pièces':<8} | {'Annonces':<8} | {'Prix moyen':<15} | {'Surface moy.':<12} | {'Prix/m² moy.'}")
        print("-"*80)
        

        for pieces, data in sorted(stats_pieces.items()):
            print(f"{pieces:<8} | "
                  f"{data['count']:<8} | "
                  f"{format_price(round(data['prix_moyen'], 2)):<15} | "
                  f"{data['surface_moyenne']:.1f} m²{'':<5} | "
                  f"{data['prix_m2_moyen']:.2f} €/m²")
    
    # Afficher les statistiques gÃ©nÃ©rales
    print("\nSTATISTIQUES GENERALES:")
    print(f"Nombre total d'annonces : {stats['nombre_annonces']}")
    print(f"Prix moyen au m² : {stats['prix_m2_moyen']:,.2f} €/m²".replace(',', ' '))
    
    # Pour les locations, afficher le loyer moyen
    if is_rental or any(a.get('category') == 'location' for a in filtered_announcements):
        loyer_moyen_m2 = calculate_average_rent(filtered_announcements)
        if loyer_moyen_m2:
            print(f"\nLoyer moyen estimé : {loyer_moyen_m2:.2f} €/m²")
    else:
        # Pour les ventes, afficher plus de detailes
        print(f"Prix minimum au m² : {stats['prix_m2_min']:,.2f} €/m²".replace(',', ' '))
        print(f"Prix maximum au m² : {stats['prix_m2_max']:,.2f} €/m²".replace(',', ' '))
    
    # Afficher le tableau detaillé uniquement pour les ventes
    if not is_rental:
        print(f"\n{'='*80}")
        print("LISTE DETAILLEE DES ANNONCES".center(80))
        print(f"{'='*80}")
        # Passer les statistiques de location pour le calcul des differences
        display_announcements_table(filtered_announcements, rental_stats=stats_pieces)

def main():
    # Configuration de l'encodage de la console
    if sys.platform.startswith('win'):
        import os
        os.system('chcp 65001 > nul')  # Passe en UTF-8 sous Windows
    if len(sys.argv) < 2:
        print("Usage: python display_ads.py [--vente=FICHIER] [--location=FICHIER] [--max-price PRIX] [--min-surface SURFACE] [--location-ville VILLE]")
        print("Exemple: python display_ads.py --vente=ventes.json --location=locations.json --max-price 100000 --min-surface 50 --location-ville albi")
        sys.exit(1)
    
    # Variables pour stocker les fichiers et options
    vente_file = None
    location_file = None
    max_price = None
    min_surface = None
    location_ville = None
    
    # Traiter les arguments
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        
        if arg.startswith('--vente='):
            vente_file = arg.split('=', 1)[1]
        elif arg.startswith('--location='):
            location_file = arg.split('=', 1)[1]
        elif arg == '--max-price' and i + 1 < len(sys.argv):
            try:
                max_price = int(sys.argv[i+1])
                i += 1
            except ValueError:
                print("Erreur: Le prix maximum doit être un nombre.")
                sys.exit(1)
        elif arg == '--min-surface' and i + 1 < len(sys.argv):
            try:
                min_surface = int(sys.argv[i+1])
                i += 1
            except ValueError:
                print("Erreur: La surface minimale doit être un nombre.")
                sys.exit(1)
        elif arg == '--location-ville' and i + 1 < len(sys.argv):
            location_ville = sys.argv[i+1]
            i += 1
        else:
            print(f"Argument inconnu ou manquant une valeur: {arg}")
            print("Utilisation: python display_ads.py [--vente=FICHIER] [--location=FICHIER] [--max-price PRIX] [--min-surface SURFACE] [--location-ville VILLE]")
            sys.exit(1)
        i += 1
    
    # Vérifier qu'au moins un fichier a été spécifié
    if not vente_file and not location_file:
        print("Erreur: Vous devez spécifier au moins un fichier avec --vente ou --location")
        sys.exit(1)
    
    # Traiter le fichier de location s'il est spécifié (en premier)
    if location_file:
        process_file(location_file, max_price, min_surface, location_ville, is_rental=True)
    
    # Traiter le fichier de vente s'il est spÃ©cifiÃ© (ensuite)
    if vente_file:
        process_file(vente_file, max_price, min_surface, location_ville, is_rental=False)

if __name__ == "__main__":
    main()


