import json
import sys
from collections import defaultdict
from rental_stats import calculate_rental_stats


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
            annonces = json.load(f)
        
        if not annonces:
            print("Aucune annonce de vente trouvée dans le fichier.")
            return None
        
        # Statistiques pour les ventes (prix au m²)
        total_prix_m2 = 0
        total_annonces = 0
        prix_par_ville = defaultdict(list)
        
        for annonce in annonces:
            if 'prix_m2' in annonce and annonce['prix_m2'] is not None:
                prix_m2 = annonce['prix_m2']
                total_prix_m2 += prix_m2
                total_annonces += 1
                
                if 'localisation' in annonce:
                    ville = annonce['localisation'].split()[0]
                    prix_par_ville[ville].append(prix_m2)
        
        if total_annonces == 0:
            print("Aucune donnée de prix au m² trouvée.")
            return None
        
        moyenne_generale = round(total_prix_m2 / total_annonces, 2)
        
        # Calculer les moyennes par ville
        moyennes_par_ville = {}
        for ville, prix_list in prix_par_ville.items():
            if prix_list:
                moyennes_par_ville[ville] = round(sum(prix_list) / len(prix_list), 2)
        
        # Trier les villes par prix moyen décroissant
        villes_triees = sorted(moyennes_par_ville.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'nombre_annonces': total_annonces,
            'moyenne_prix_m2': moyenne_generale,
            'prix_min': min(annonce['prix_m2'] for annonce in annonces if annonce['prix_m2'] is not None),
            'prix_max': max(annonce['prix_m2'] for annonce in annonces if annonce['prix_m2'] is not None),
            'moyennes_par_ville': dict(villes_triees),
            'is_rental': False,
            'unite': '€/m²'
        }
        
    except FileNotFoundError:
        print(f"Erreur: Le fichier {json_file} n'a pas été trouvé.")
        return None
    except json.JSONDecodeError:
        print("Erreur: Le fichier JSON est mal formé.")
        return None
    except Exception as e:
        print(f"Une erreur s'est produite lors du calcul des statistiques de vente: {str(e)}")
        return None

def format_price(price):
    """Formate un prix avec des espaces comme séparateurs de milliers"""
    return f"{price:,.2f} €".replace(',', ' ').replace('.', ',').replace(',00', '') + ('/mois' if 'location' in locals() or 'location' in globals() else '')

def display_statistics(stats, title=""):
    """
    Affiche les statistiques de manière lisible
    
    Args:
        stats (dict): Dictionnaire contenant les statistiques à afficher
                     Pour les locations, doit contenir les clés 'global', 'meuble', 'non_meuble'
        title (str, optional): Titre à afficher pour ces statistiques
    """
    if not stats:
        print("Aucune statistique à afficher.")
        return
        
    # Vérifier si c'est une location (structure différente)
    is_rental = 'global' in stats and 'meuble' in stats and 'non_meuble' in stats
    title = title.upper() if title else "STATISTIQUES"
    
    print("\n" + "=" * 80)
    print(f"{title} - {'LOCATIONS' if is_rental else 'VENTES'}")
    print("=" * 80)
    
    if is_rental:
        # Afficher les statistiques globales
        if stats['global']:
            print(f"\n{'STATISTIQUES GLOBALES':^80}")
            print("-" * 80)
            print(f"Nombre total d'annonces : {stats['global']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['global']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['global']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['global']['prix_max'])}")
            
            if stats['global']['moyennes_par_ville']:
                print("\nMoyennes par ville :")
                for ville, prix in stats['global']['moyennes_par_ville'].items():
                    print(f"- {ville}: {format_price(prix)}")
        
        # Afficher les statistiques pour les locations meublées
        if stats['meuble']:
            print(f"\n{'LOCATIONS MEUBLÉES':^80}")
            print("-" * 80)
            print(f"Nombre d'annonces : {stats['meuble']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['meuble']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['meuble']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['meuble']['prix_max'])}")
            
            if stats['meuble']['moyennes_par_ville']:
                print("\nMoyennes par ville (meublé) :")
                for ville, prix in stats['meuble']['moyennes_par_ville'].items():
                    print(f"- {ville}: {format_price(prix)}")
        
        # Afficher les statistiques pour les locations non meublées
        if stats['non_meuble']:
            print(f"\n{'LOCATIONS NON MEUBLÉES':^80}")
            print("-" * 80)
            print(f"Nombre d'annonces : {stats['non_meuble']['nombre_annonces']}")
            print(f"Prix moyen : {format_price(stats['non_meuble']['moyenne_prix'])}")
            print(f"Prix minimum : {format_price(stats['non_meuble']['prix_min'])}")
            print(f"Prix maximum : {format_price(stats['non_meuble']['prix_max'])}")
            
            if stats['non_meuble']['moyennes_par_ville']:
                print("\nMoyennes par ville (non meublé) :")
                for ville, prix in stats['non_meuble']['moyennes_par_ville'].items():
                    print(f"- {ville}: {format_price(prix)}")
        
        return
    else:
        # Affichage pour les ventes
        print(f"\n{'STATISTIQUES DE VENTE':^80}")
        print("=" * 80)
        print(f"Prix moyen au m² : {format_price(stats['moyenne_prix_m2']).replace(' €', '')}")
        print(f"Prix minimum au m² : {format_price(stats['prix_min']).replace(' €', '')}")
        print(f"Prix maximum au m² : {format_price(stats['prix_max']).replace(' €', '')}")
        print(f"\n{'Nombre total d\'annonces analysées :':<40} {stats['nombre_annonces']}")
        
        if 'moyennes_par_ville' in stats and stats['moyennes_par_ville']:
            print("\nPrix moyens au m² par ville :")
            for ville, moyenne in stats['moyennes_par_ville'].items():
                print(f"- {ville:<20} : {format_price(moyenne).replace(' €', '')}")
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
            print(f"Les statistiques ont été enregistrées dans '{output_file}'")
        except Exception as e:
            print(f"Erreur lors de la sauvegarde des statistiques: {str(e)}")
