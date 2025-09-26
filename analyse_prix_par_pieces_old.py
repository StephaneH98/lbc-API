import json
from collections import defaultdict

def format_price(price):
    """Formate un prix avec un séparateur de milliers"""
    return f"{int(price):,} €".replace(',', ' ')

def analyser_prix_par_pieces(fichier_json):
    """Analyse les prix moyens par nombre de pièces"""
    try:
        with open(fichier_json, 'r', encoding='utf-8') as f:
            annonces = json.load(f)
        
        # Initialiser un dictionnaire pour stocker les données par nombre de pièces
        stats_par_pieces = defaultdict(lambda: {'total_prix': 0, 'nombre_annonces': 0, 'surfaces': []})
        
        # Parcourir toutes les annonces
        for annonce in annonces:
            if 'pieces' in annonce and 'prix' in annonce and annonce['prix'] is not None:
                pieces = annonce['pieces']
                stats_par_pieces[pieces]['total_prix'] += annonce['prix']
                stats_par_pieces[pieces]['nombre_annonces'] += 1
                if 'surface_m2' in annonce and annonce['surface_m2'] is not None:
                    stats_par_pieces[pieces]['surfaces'].append(annonce['surface_m2'])
        
        # Calculer les moyennes
        resultats = []
        for pieces, data in sorted(stats_par_pieces.items()):
            if data['nombre_annonces'] > 0:
                moyenne_prix = data['total_prix'] / data['nombre_annonces']
                surface_moyenne = sum(data['surfaces']) / len(data['surfaces']) if data['surfaces'] else 0
                prix_m2_moyen = moyenne_prix / surface_moyenne if surface_moyenne > 0 else 0
                
                resultats.append({
                    'pieces': pieces,
                    'nombre_annonces': data['nombre_annonces'],
                    'prix_moyen': moyenne_prix,
                    'surface_moyenne': surface_moyenne,
                    'prix_m2_moyen': prix_m2_moyen
                })
        
        return resultats
        
    except Exception as e:
        print(f"Erreur lors de l'analyse des données : {str(e)}")
        return []

def afficher_resultats(resultats):
    """Affiche les résultats de l'analyse"""
    if not resultats:
        print("Aucune donnée à afficher.")
        return
    
    print("\n" + "="*80)
    print("PRIX MOYEN DES LOCATIONS PAR NOMBRE DE PIÈCES")
    print("="*80)
    print(f"{'Pièces':<8} | {'Annonces':<10} | {'Prix moyen':<15} | {'Surface moy.':<12} | {'Prix/m² moy.'}")
    print("-"*80)
    
    for res in resultats:
        print(f"{res['pieces']:<8} | "
              f"{res['nombre_annonces']:<10} | "
              f"{format_price(res['prix_moyen']):<15} | "
              f"{res['surface_moyenne']:.1f} m²{'':<7} | "
              f"{res['prix_m2_moyen']:.2f} €/m²")

if __name__ == "__main__":
    fichier_json = "locations_data.json"
    resultats = analyser_prix_par_pieces(fichier_json)
    afficher_resultats(resultats)
