import json
import sys
from collections import defaultdict
from rental_stats import calculate_rental_stats

def format_price(price):
    """Formate un prix avec un séparateur de milliers"""
    return f"{int(price):,} €".replace(',', ' ')

def calculate_average_price_by_rooms(data):
    """Calcule le prix moyen par nombre de pièces"""
    rooms_data = defaultdict(lambda: {'total_price': 0, 'count': 0, 'avg_price': 0})
    
    for item in data:
        if item.get('category') == 'location' and item.get('pieces') and item.get('prix'):
            rooms = item['pieces']
            rooms_data[rooms]['total_price'] += item['prix']
            rooms_data[rooms]['count'] += 1
    
    # Calculer les moyennes
    for rooms, data in rooms_data.items():
        if data['count'] > 0:
            data['avg_price'] = round(data['total_price'] / data['count'], 2)
    
    # Trier par nombre de pièces
    return dict(sorted(rooms_data.items()))

def calculate_sale_stats(json_file):
    """
    Calcule les statistiques pour les annonces de vente
    
    Args:
        json_file (str): Chemin vers le fichier JSON contenant les annonces
        
    Returns:
        dict: Dictionnaire contenant les statistiques de vente
    """
    try:
        # Charger les données depuis le fichier JSON
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print("Aucune annonce trouvée dans le fichier.")
            return None
        
        # Calcul des statistiques globales
        total_price = 0
        total_surface = 0
        count = 0
        
        for item in data:
            if item.get('prix') and item.get('surface_m2') and item.get('category') == 'vente':
                total_price += item['prix']
                total_surface += item['surface_m2']
                count += 1
        
        if count == 0:
            print("Aucune donnée de vente valide trouvée.")
            return None
            
        avg_price = total_price / count
        avg_price_per_sqm = total_price / total_surface if total_surface > 0 else 0
        
        # Calcul des moyennes par nombre de pièces
        avg_by_rooms = calculate_average_price_by_rooms(data)
        
        return {
            'global': {
                'count': count,
                'avg_price': round(avg_price, 2),
                'avg_price_per_sqm': round(avg_price_per_sqm, 2)
            },
            'by_rooms': avg_by_rooms
        }
        
    except FileNotFoundError:
        print(f"Erreur: Le fichier {json_file} n'a pas été trouvé.")
        return None
    except json.JSONDecodeError:
        print("Erreur: Le fichier n'est pas un JSON valide.")
        return None
    except Exception as e:
        print(f"Une erreur s'est produite lors du calcul des statistiques de vente: {str(e)}")
        return None

def display_statistics(stats, title):
    """Affiche les statistiques de manière lisible"""
    if not stats:
        print("Aucune statistique à afficher.")
        return
        
    print(f"\n{'='*40} {title} {'='*40}")
    
    # Vérifier le format des données
    if 'global' in stats and 'meuble' in stats and 'non_meuble' in stats:
        # Format pour les locations (retourné par calculate_rental_stats)
        if stats['global']:
            print("\n=== STATISTIQUES GLOBALES ===")
            print(f"Nombre total d'annonces : {stats['global']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['global']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['global']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['global']['prix_max'])}")
            
            # Afficher les moyennes par ville si disponibles
            if 'moyennes_par_ville' in stats['global'] and stats['global']['moyennes_par_ville']:
                print("\nMoyennes par ville :")
                for ville, prix in stats['global']['moyennes_par_ville'].items():
                    print(f"- {ville}: {format_price(prix)}")
        
        if stats['meuble']:
            print("\n=== LOCATIONS MEUBLÉES ===")
            print(f"Nombre d'annonces : {stats['meuble']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['meuble']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['meuble']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['meuble']['prix_max'])}")
        
        if stats['non_meuble']:
            print("\n=== LOCATIONS NON MEUBLÉES ===")
            print(f"Nombre d'annonces : {stats['non_meuble']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['non_meuble']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['non_meuble']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['non_meuble']['prix_max'])}")
    
    elif 'global' in stats and 'avg_price' in stats['global']:
        # Format pour les ventes
        print("\n=== STATISTIQUES GLOBALES ===")
        print(f"Nombre total d'annonces : {stats['global']['count']}")
        print(f"Prix moyen : {format_price(stats['global']['avg_price'])}")
        print(f"Prix moyen au m² : {stats['global']['avg_price_per_sqm']:.2f} €/m²")
        
        # Afficher les statistiques par nombre de pièces
        if 'by_rooms' in stats and stats['by_rooms']:
            print("\n=== PRIX MOYEN PAR NOMBRE DE PIÈCES ===")
            print("Pièces | Nombre d'annonces | Prix moyen (€)")
            print("-------|-------------------|---------------")
            for rooms, data in stats['by_rooms'].items():
                print(f"{rooms:6d} | {data['count']:17d} | {format_price(data['avg_price'])}")
    else:
        # Format non reconnu, afficher les données brutes
        print("Format de données non reconnu. Affichage brut :")
        print(json.dumps(stats, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python calculate_average.py <fichier_json> [--rental]")
        sys.exit(1)
    
    fichier_json = sys.argv[1]
    is_rental = '--rental' in sys.argv
    
    if is_rental:
        stats = calculate_rental_stats(fichier_json)
        title = "LOCATIONS"
        output_file = 'statistiques_locations.json'
    else:
        stats = calculate_sale_stats(fichier_json)
        title = "VENTES"
        output_file = 'statistiques_ventes.json'
    
    if stats:
        display_statistics(stats, title)
        
        # Sauvegarder les statistiques dans un fichier
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            print(f"\nLes statistiques ont été enregistrées dans '{output_file}'")
        except Exception as e:
            print(f"Erreur lors de la sauvegarde des statistiques: {str(e)}")
