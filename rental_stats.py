import json
from collections import defaultdict

def format_price(price):
    """Formate un prix avec des espaces comme séparateurs de milliers"""
    return f"{price:,.2f} €".replace(',', ' ').replace('.', ',').replace(',00', '')

def calculate_rental_stats(json_file):
    """
    Calcule les statistiques pour les annonces de location
    
    Args:
        json_file (str): Chemin vers le fichier JSON contenant les annonces
        
    Returns:
        dict: Dictionnaire contenant les statistiques de location
    """
    try:
        # Charger les données depuis le fichier JSON
        with open(json_file, 'r', encoding='utf-8') as f:
            annonces = json.load(f)
        
        if not annonces:
            print("Aucune annonce de location trouvée dans le fichier.")
            return None
        
        # Séparer les annonces meublées et non meublées
        annonces_meublees = [a for a in annonces if a.get('furnished') is True]
        annonces_non_meublees = [a for a in annonces if a.get('furnished') is False]
        
        def calculer_statistiques(liste_annonces, type_location):
            if not liste_annonces:
                return None
                
            prix = [a['prix'] for a in liste_annonces if 'prix' in a and a['prix'] is not None]
            
            if not prix:
                print(f"Aucune donnée de prix trouvée pour les locations {type_location}.")
                return None
                
            somme_totale = sum(prix)
            nombre = len(prix)
            moyenne = round(somme_totale / nombre, 2)
            
            print(f"\nCalcul de la moyenne des locations {type_location} :")
            print(f"- Somme totale des prix : {format_price(somme_totale).replace(' €', '')}")
            print(f"- Nombre d'annonces : {nombre}")
            print(f"- Moyenne : {format_price(moyenne).replace(' €', '')} (arrondie à 2 décimales)")
            
            # Statistiques par ville
            prix_par_ville = defaultdict(list)
            for annonce in liste_annonces:
                if 'prix' in annonce and annonce['prix'] is not None and 'localisation' in annonce:
                    ville = annonce['localisation'].split()[0]
                    prix_par_ville[ville].append(annonce['prix'])
            
            moyennes_par_ville = {}
            for ville, prix_list in prix_par_ville.items():
                if prix_list:
                    moyennes_par_ville[ville] = round(sum(prix_list) / len(prix_list), 2)
            
            # Trier les villes par prix moyen décroissant
            villes_triees = sorted(moyennes_par_ville.items(), key=lambda x: x[1], reverse=True)
            
            return {
                'nombre_annonces': nombre,
                'moyenne_prix': moyenne,
                'prix_min': min(prix),
                'prix_max': max(prix),
                'moyennes_par_ville': dict(villes_triees),
                'is_rental': True,
                'unite': '€/mois'
            }
        
        # Calculer les statistiques pour chaque type de location
        stats_meublees = calculer_statistiques(annonces_meublees, "meublées")
        stats_non_meublees = calculer_statistiques(annonces_non_meublees, "non meublées")
        
        # Calculer les statistiques globales
        stats_globales = calculer_statistiques(annonces, "toutes confondues")
        
        return {
            'global': stats_globales,
            'meuble': stats_meublees,
            'non_meuble': stats_non_meublees
        }
        
    except FileNotFoundError:
        print(f"Erreur: Le fichier {json_file} n'a pas été trouvé.")
        return None
    except json.JSONDecodeError:
        print("Erreur: Le fichier JSON est mal formé.")
        return None
    except Exception as e:
        print(f"Une erreur s'est produite lors du calcul des statistiques de location: {str(e)}")
        return None
