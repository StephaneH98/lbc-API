import os
import sys
import subprocess
import json
import glob
from urllib.parse import urlparse
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

def is_postal_code(input_str):
    """Vérifie si l'entrée est un code postal français valide (5 chiffres)"""
    return input_str.isdigit() and len(input_str) == 5 and 1000 <= int(input_str) <= 98999

def get_city_coordinates(location_input):
    """
    Récupère les coordonnées GPS et le code postal d'une ville ou d'un code postal
    
    Args:
        location_input (str): Peut être un nom de ville ou un code postal français
        
    Returns:
        dict: Dictionnaire contenant les informations de localisation ou None si non trouvé
    """
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Initialiser le géocodeur avec un user_agent personnalisé et un timeout plus long
            geolocator = Nominatim(
                user_agent="lbc_scraper",
                timeout=10,  # Augmenter le timeout à 10 secondes
                domain="nominatim.openstreetmap.org"
            )
            
            # Ajouter un délai pour respecter les conditions d'utilisation
            geocode = RateLimiter(
                geolocator.geocode,
                min_delay_seconds=2,  # Augmenter le délai minimum entre les requêtes
                max_retries=3,  # Nombre de tentatives en cas d'échec
                error_wait_seconds=5  # Délai d'attente entre les tentatives
            )
        
            # Préparer les requêtes en fonction du type d'entrée
            if is_postal_code(location_input):
                # Si c'est un code postal, on le recherche directement
                queries = [
                    f"{location_input}, France",
                    f"{location_input}, FR"
                ]
            else:
                # Si c'est un nom de ville, on essaie différents formats
                queries = [
                    f"{location_input}, France",
                    f"Ville de {location_input}, France",
                    f"{location_input}, {location_input}, France"
                ]
            
            location = None
            for query in queries:
                location = geocode(query, addressdetails=True, language='fr')
                if location:
                    break
            
            if not location:
                retry_count += 1
                if retry_count < max_retries:
                    print(f"Localisation non trouvée pour '{location_input}'. Nouvelle tentative ({retry_count}/{max_retries-1})...")
                    import time
                    time.sleep(2)  # Attendre 2 secondes avant de réessayer
                    continue
                else:
                    print(f"\nErreur : Impossible de trouver la localisation pour '{location_input}' après {max_retries} tentatives.")
                    print("Conseils :")
                    print("1. Vérifiez l'orthographe du nom de la ville ou du code postal")
                    print("2. Essayez d'utiliser un nom de ville plus grand à proximité")
                    print("3. Vérifiez votre connexion Internet")
                    print("4. Le service de géolocalisation peut être temporairement indisponible")
                    return None
            
            # Extraire le code postal et le nom de la ville
            address = location.raw.get('address', {})
            postcode = address.get('postcode')
            city_name = address.get('city') or address.get('town') or address.get('village') or location_input
            
            # Si pas de code postal, essayer de le trouver dans display_name
            if not postcode and 'display_name' in location.raw:
                import re
                # Chercher un code postal français (5 chiffres) dans le display_name
                match = re.search(r'\b(?:0[1-9]|[1-8]\d|9[0-8])\d{3}\b', location.raw['display_name'])
                if match:
                    postcode = match.group(0)
            
            # Si on avait un code postal en entrée mais qu'on ne le retrouve pas dans la réponse
            if is_postal_code(location_input) and not postcode:
                postcode = location_input
            
            if not postcode:
                print(f"Impossible de déterminer le code postal pour : {location_input}")
                return None
                
            return {
                'name': city_name,
                'postcode': postcode,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'input_type': 'postal_code' if is_postal_code(location_input) else 'city_name'
            }
            
        except Exception as e:
            retry_count += 1
            if retry_count < max_retries:
                print(f"\nERREUR lors de la recherche de localisation : {str(e)}")
                print(f"Nouvelle tentative dans 5 secondes... ({retry_count}/{max_retries})")
                import time
                time.sleep(5)  # Attendre 5 secondes avant de réessayer
            else:
                print(f"\nERREUR CRITIQUE après {max_retries} tentatives :")
                print(str(e))
                print("\nConseils de dépannage :")
                print("1. Vérifiez votre connexion Internet")
                print("2. Le service de géolocalisation peut être temporairement indisponible")
                print("3. Essayez de réessayer dans quelques instants")
                print("4. Si le problème persiste, contactez le support technique avec le message d'erreur ci-dessus")
                return None

def get_location_from_user():
    """Demande à l'utilisateur de saisir une localisation et retourne les informations de géolocalisation"""
    while True:
        location_input = input("\nEntrez le nom de la ville ou le code postal (ou appuyez sur Entrée pour terminer) : ").strip()
        if not location_input:
            return None
            
        print(f"\nRecherche des informations pour : {location_input}...")
        
        # Récupérer les coordonnées de la localisation
        city_info = get_city_coordinates(location_input)
        if city_info:
            return city_info
            
        print("Veuillez réessayer avec un autre nom de ville ou code postal.")

def parse_arguments():
    """Parse les arguments en ligne de commande"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Pipeline de récupération et d\'analyse des annonces immobilières')
    parser.add_argument('--vente', type=str, help='Chemin vers le fichier JSON des annonces de vente')
    parser.add_argument('--location', type=str, help='Chemin vers le fichier JSON des annonces de location')
    parser.add_argument('--max-price', type=int, help='Prix maximum pour le filtrage')
    parser.add_argument('--min-surface', type=int, help='Surface minimale pour le filtrage')
    parser.add_argument('--location-ville', type=str, help='Localisation pour le filtrage')
    
    return parser.parse_args()

def main():
    # Parser les arguments en ligne de commande
    args = parse_arguments()
    
    # Fichiers temporaires
    html_file = "page_telechargee.html"
    json_file = args.vente if args.vente else "annonces_data.json"
    rental_json_file = args.location if args.location else "locations_data.json"
    
    try:
        # 1. Construction de l'URL
        print("=" * 80)
        print("ÉTAPE 1/5 : Construction de l'URL de recherche")
        print("=" * 80)
        from url_builder import LBCUrlBuilder
        
        # Initialiser le builder d'URL
        url_builder = LBCUrlBuilder()
        url_builder.clear_locations()
        
        # Liste pour stocker les localisations ajoutées
        locations = []
        
        # Utiliser la localisation fournie en argument ou demander à l'utilisateur
        if args.location_ville:
            print(f"\nUtilisation de la localisation fournie : {args.location_ville}")
            city_info = get_city_coordinates(args.location_ville)
            if city_info:
                locations.append(city_info)
                print(f"Localisation ajoutée : {city_info['name']} ({city_info['postcode']}) - {city_info['latitude']}, {city_info['longitude']}")
            else:
                print(f"Impossible de trouver les coordonnées pour : {args.location_ville}")
                sys.exit(1)
        else:
            # Demander les localisations à l'utilisateur
            print("\nAjoutez une ou plusieurs villes pour votre recherche :")
            
            while True:
                city_info = get_location_from_user()
                if not city_info:
                    if not locations:
                        print("Veuvez ajouter au moins une localisation.")
                        continue
                    break
                    
                # Ajouter la localisation à la liste
                locations.append(city_info)
                
                # Afficher un résumé des localisations ajoutées
                print("\nLocalisations actuelles :")
                for i, loc in enumerate(locations, 1):
                    print(f"{i}. {loc['name']} ({loc['postcode']}) - {loc['latitude']}, {loc['longitude']}")
                
                # Demander si l'utilisateur veut ajouter une autre localisation
                if input("\nVoulez-vous ajouter une autre localisation ? (o/n) ").lower() != 'o':
                    break
        
        # Afficher un résumé des localisations sélectionnées
        print("\n" + "=" * 80)
        print("RÉSUMÉ DES LOCALISATIONS")
        print("=" * 80)
        
        for i, loc in enumerate(locations, 1):
            print(f"\nLocalisation {i} :")
            print(f"- Nom : {loc['name']}")
            print(f"- Code postal : {loc['postcode']}")
            print(f"- Coordonnées : {loc['latitude']}, {loc['longitude']}")
            print(f"- Type de recherche : {'Code postal' if loc.get('input_type') == 'postal_code' else 'Nom de ville'}")
        
        # Ajouter toutes les localisations à l'URL
        for loc in locations:
            url_builder.add_location(
                loc['name'],
                loc['postcode'],
                loc['latitude'],
                loc['longitude'],
                10000  # Rayon de 10km
            )
        
        # Construire et afficher les URLs de recherche
        sale_url = url_builder.build()  # URL pour la vente (catégorie 9 par défaut)
        rental_url = url_builder.get_rental_url()  # URL pour la location (catégorie 10)
        
        print("\n" + "=" * 80)
        print("URLS DE RECHERCHE GÉNÉRÉES")
        print("=" * 80)
        print(f"\nURL pour les ventes (catégorie 9) :")
        print(sale_url)
        print(f"\nURL pour les locations (catégorie 10) :")
        print(rental_url)
        
        # Demander confirmation avant de continuer
        if input("\nVoulez-vous continuer avec ces paramètres ? (o/n): ").lower() != 'o':
            print("Annulation par l'utilisateur.")
            return
            
        # Utiliser l'URL de vente pour la suite du traitement
        search_url = sale_url
        
        # 2. Téléchargement de la page avec Selenium
        print("\n" + "=" * 80)
        print("ÉTAPE 2/5 : Téléchargement des pages avec Selenium")
        print("=" * 80)
        from scraper import download_page
        
        print(f"Téléchargement des annonces depuis : {search_url}")
        
        # Créer un dossier pour stocker les pages téléchargées
        import os
        base_dir = os.path.dirname(html_file) or '.'
        base_name = os.path.splitext(os.path.basename(html_file))[0]
        output_pattern = os.path.join(base_dir, f"{base_name}_page{{page}}.html")
        
        # Télécharger toutes les pages disponibles
        driver = None
        page_number = 1
        has_next_page = True
        
        try:
            while has_next_page and page_number <= 20:  # Limite de 20 pages pour éviter les boucles infinies
                current_output = output_pattern.format(page=page_number)
                print(f"\nTéléchargement de la page {page_number}...")
                
                # Passer le driver existant à la fonction download_page
                content, driver, has_next = download_page(
                    search_url,
                    output_path=current_output,
                    driver=driver,
                    page_number=page_number,
                    max_pages=20
                )
                
                if not content:
                    print(f"Aucun contenu récupéré pour la page {page_number}")
                    break
                    
                # Si c'est la première page, on garde une copie avec le nom original
                if page_number == 1:
                    with open(html_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Page 1 sauvegardée dans : {html_file}")
                
                if not has_next:
                    print("Dernière page atteinte.")
                    break
                    
                page_number += 1
                
                # Ajouter un délai aléatoire entre les requêtes pour éviter d'être bloqué
                import random, time
                delay = random.uniform(3, 8)  # Délai entre 3 et 8 secondes
                print(f"Attente de {delay:.1f} secondes avant la page suivante...")
                time.sleep(delay)
                
        except Exception as e:
            print(f"Erreur lors du téléchargement des pages : {str(e)}")
            
        finally:
            # S'assurer que le navigateur est fermé à la fin
            if driver:
                print("Nettoyage et fermeture du navigateur...")
                driver.quit()
            
            # Ajouter un délai aléatoire entre les requêtes pour paraître plus humain
            import random, time
            time.sleep(random.uniform(2, 5))
        
        # Fermer le navigateur si nécessaire
        if driver:
            driver.quit()
        
        if page_number == 1:
            print("Aucune annonce trouvée.")
            return
            
        # Nettoyer les fichiers HTML temporaires après extraction
        def clean_html_files(pattern):
            """Supprime les fichiers HTML correspondant au motif donné"""
            try:
                for file in glob.glob(pattern):
                    try:
                        os.remove(file)
                        print(f"Fichier supprimé : {file}")
                    except Exception as e:
                        print(f"Erreur lors de la suppression de {file}: {e}")
            except Exception as e:
                print(f"Erreur lors du nettoyage des fichiers HTML: {e}")
        
        # 3. Extraction des annonces de vente
        print("\n" + "=" * 80)
        print("ÉTAPE 3/5 : Extraction des annonces de vente")
        print("=" * 80)
        from extract_ads import extract_ads
        
        print(f"Extraction des annonces de vente depuis : {html_file}")
        if not extract_ads(html_file, json_file):
            print("Erreur lors de l'extraction des annonces de vente")
            return
        
        # 3.1. Extraction des annonces de location (meublées et non meublées)
        rental_html_file_meuble = "page_location_meuble_telechargee.html"
        rental_html_file_non_meuble = "page_location_non_meuble_telechargee.html"
        rental_json_file = "locations_data.json"
        
        # Liste pour stocker les fichiers HTML temporaires à supprimer
        temp_html_files = []
        
        print("\n" + "=" * 80)
        print("ÉTAPE 3.1/5 : Extraction des annonces de location")
        print("=" * 80)
        
        all_rental_ads = []
        
        # Traitement des locations meublées (furnished=1)
        print("\nRecherche des locations meublées...")
        rental_url_builder_meuble = LBCUrlBuilder()
        
        # Utiliser la première localisation de la liste
        loc = locations[0]
        rental_url_builder_meuble.add_location(
            loc['name'],
            loc['postcode'],
            loc['latitude'],
            loc['longitude'],
            10000  # Rayon de 10km
        )
        rental_url_meuble = rental_url_builder_meuble.get_rental_url() + "&furnished=1"
        
        print(f"\nTéléchargement des annonces de locations meublées : {rental_url_meuble}")
        
        # Créer un dossier pour stocker les pages téléchargées
        base_dir = os.path.dirname(rental_html_file_meuble) or '.'
        base_name = os.path.splitext(os.path.basename(rental_html_file_meuble))[0]
        output_pattern = os.path.join(base_dir, f"{base_name}_page{{page}}.html")
        
        # Télécharger toutes les pages disponibles
        driver = None
        page_number = 1
        has_next_page = True
        temp_meuble_files = []
        
        while has_next_page and page_number <= 20:  # Limite de 20 pages
            current_output = output_pattern.format(page=page_number)
            print(f"\nTéléchargement de la page {page_number}...")
            
            content, driver, has_next = download_page(
                rental_url_meuble,
                output_path=current_output,
                driver=driver,
                page_number=page_number,
                max_pages=20
            )
            
            if not content:
                print(f"Aucun contenu récupéré pour la page {page_number}")
                break
                
            # Si c'est la première page, on garde une copie avec le nom original
            if page_number == 1:
                with open(rental_html_file_meuble, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Page 1 sauvegardée dans : {rental_html_file_meuble}")
            
            # Extraire les annonces de cette page
            temp_json = f"temp_meuble_page{page_number}.json"
            if extract_ads(current_output, temp_json):
                # Ajouter le champ furnished=True aux annonces
                try:
                    with open(temp_json, 'r+', encoding='utf-8') as f:
                        ads = json.load(f)
                        for ad in ads:
                            ad['furnished'] = True
                        f.seek(0)
                        json.dump(ads, f, ensure_ascii=False, indent=2)
                        f.truncate()
                except Exception as e:
                    print(f"Erreur lors de l'ajout du champ 'furnished' : {e}")
                
                temp_meuble_files.append(temp_json)
            
            if not has_next:
                print("Dernière page atteinte pour les locations meublées.")
                break
                
            page_number += 1
            
            # Ajouter un délai aléatoire entre les requêtes
            time.sleep(random.uniform(2, 5))
        
        # Fermer le navigateur si nécessaire
        if driver:
            driver.quit()
        
        # Fusionner tous les fichiers JSON temporaires
        if temp_meuble_files:
            if os.path.exists(rental_json_file):
                temp_meuble_files.insert(0, rental_json_file)
            
            merge_json_files(temp_meuble_files, rental_json_file)
            
            # Nettoyer les fichiers temporaires
            for temp_file in temp_meuble_files[1:]:  # Ne pas supprimer le fichier de sortie
                try:
                    os.remove(temp_file)
                    os.remove(temp_file.replace('.json', '.html'))  # Supprimer aussi le fichier HTML temporaire
                except Exception as e:
                    print(f"Erreur lors du nettoyage des fichiers temporaires : {e}")
            
            # Ajouter les annonces à la liste complète
            for temp_json in temp_meuble_files[1:]:
                try:
                    with open(temp_json, 'r', encoding='utf-8') as f:
                        ads = json.load(f)
                        all_rental_ads.extend(ads)
                        print(f"{len(ads)} annonces de locations meublées trouvées")
                except Exception as e:
                    print(f"Erreur lors de la lecture du fichier JSON temporaire : {e}")
        
        # Traitement des locations non meublées (furnished=2)
        print("\nRecherche des locations non meublées...")
        rental_url_builder_non_meuble = LBCUrlBuilder()
        loc = locations[0]
        rental_url_builder_non_meuble.add_location(
            loc['name'],
            loc['postcode'],
            loc['latitude'],
            loc['longitude'],
            10000  # Rayon de 10km
        )
        rental_url_non_meuble = rental_url_builder_non_meuble.get_rental_url() + "&furnished=2"
        
        print(f"\nTéléchargement des annonces de locations non meublées : {rental_url_non_meuble}")
        
        # Créer un dossier pour stocker les pages téléchargées
        base_dir = os.path.dirname(rental_html_file_non_meuble) or '.'
        base_name = os.path.splitext(os.path.basename(rental_html_file_non_meuble))[0]
        output_pattern = os.path.join(base_dir, f"{base_name}_page{{page}}.html")
        
        # Télécharger toutes les pages disponibles
        driver = None
        page_number = 1
        has_next_page = True
        temp_non_meuble_files = []
        
        while has_next_page and page_number <= 20:  # Limite de 20 pages
            current_output = output_pattern.format(page=page_number)
            print(f"\nTéléchargement de la page {page_number}...")
            
            content, driver, has_next = download_page(
                rental_url_non_meuble,
                output_path=current_output,
                driver=driver,
                page_number=page_number,
                max_pages=20
            )
            
            if not content:
                print(f"Aucun contenu récupéré pour la page {page_number}")
                break
                
            # Si c'est la première page, on garde une copie avec le nom original
            if page_number == 1:
                with open(rental_html_file_non_meuble, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Page 1 sauvegardée dans : {rental_html_file_non_meuble}")
            
            # Extraire les annonces de cette page
            temp_json = f"temp_non_meuble_page{page_number}.json"
            if extract_ads(current_output, temp_json):
                # Ajouter le champ furnished=False aux annonces
                try:
                    with open(temp_json, 'r+', encoding='utf-8') as f:
                        ads = json.load(f)
                        for ad in ads:
                            ad['furnished'] = False
                        f.seek(0)
                        json.dump(ads, f, ensure_ascii=False, indent=2)
                        f.truncate()
                except Exception as e:
                    print(f"Erreur lors de l'ajout du champ 'furnished' : {e}")
                
                temp_non_meuble_files.append(temp_json)
            
            if not has_next:
                print("Dernière page atteinte pour les locations non meublées.")
                break
                
            page_number += 1
            
            # Ajouter un délai aléatoire entre les requêtes
            time.sleep(random.uniform(2, 5))
        
        # Fermer le navigateur si nécessaire
        if driver:
            driver.quit()
        
        # Fusionner tous les fichiers JSON temporaires
        if temp_non_meuble_files:
            if os.path.exists(rental_json_file):
                temp_non_meuble_files.insert(0, rental_json_file)
            
            merge_json_files(temp_non_meuble_files, rental_json_file)
            
            # Nettoyer les fichiers temporaires et ajouter les annonces à la liste complète
            for temp_file in temp_non_meuble_files[1:]:  # Ne pas supprimer le fichier de sortie
                try:
                    # Ajouter les annonces à la liste complète
                    with open(temp_file, 'r', encoding='utf-8') as f:
                        ads = json.load(f)
                        all_rental_ads.extend(ads)
                        print(f"{len(ads)} annonces de locations non meublées trouvées")
                    
                    # Supprimer les fichiers temporaires
                    os.remove(temp_file)
                    os.remove(temp_file.replace('.json', '.html'))  # Supprimer aussi le fichier HTML temporaire
                except Exception as e:
                    print(f"Erreur lors du traitement du fichier {temp_file} : {e}")
        
        # Écrire toutes les annonces dans le fichier final
        if all_rental_ads:
            with open(rental_json_file, 'w', encoding='utf-8') as f:
                json.dump(all_rental_ads, f, ensure_ascii=False, indent=2)
        else:
            print("Aucune annonce de location trouvée.")
            return
            
        # 4. Calcul des statistiques pour les ventes
        print("\n" + "=" * 80)
        print("ÉTAPE 4/6 : Calcul des statistiques pour les ventes")
        print("=" * 80)
        from calculate_average import calculate_sale_stats, display_statistics
        from rental_stats import calculate_rental_stats
        
        print(f"Calcul des statistiques pour les ventes : {json_file}")
        stats = calculate_sale_stats(json_file)
        if stats:
            display_statistics(stats, "Ventes")
        else:
            print("Aucune statistique à afficher pour les ventes")
            
        # 5. Calcul des statistiques pour les locations
        print("\n" + "=" * 80)
        print("ÉTAPE 5/6 : Calcul des statistiques pour les locations")
        print("=" * 80)
        
        print(f"Calcul des statistiques pour les locations : {rental_json_file}")
        rental_stats = calculate_rental_stats(rental_json_file)
        if rental_stats:
            display_statistics(rental_stats, "Locations")
        else:
            print("Aucune statistique à afficher pour les locations")
            
        # 6. Affichage des annonces
        print("\n" + "=" * 80)
        print("ÉTAPE 6/6 : Affichage des annonces")
        print("=" * 80)
        
        # Préparer les arguments pour display_ads.py
        # Utiliser le chemin complet vers Python et le script
        import sys
        python_exec = sys.executable
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "display_ads.py")
        
        cmd = [python_exec, script_path]
        
        # Ajouter les arguments si spécifiés
        if args.vente:
            cmd.append(f"--vente={args.vente}")
        if args.location:
            cmd.append(f"--location={args.location}")
        if args.max_price:
            cmd.append("--max-price")
            cmd.append(str(args.max_price))
        if args.min_surface:
            cmd.append("--min-surface")
            cmd.append(str(args.min_surface))
        if args.location_ville:
            cmd.append("--location-ville")
            cmd.append(args.location_ville)
        
        # Afficher la commande pour le débogage
        print("\nExécution de la commande :", " ".join(f'"{arg}"' if ' ' in arg else arg for arg in cmd))
        
        # Configurer le répertoire de travail pour éviter les problèmes avec les chemins UNC
        cwd = os.path.dirname(os.path.abspath(__file__))
        
        try:
            # Utiliser shell=True avec un chemin complet pour éviter les problèmes de chemins UNC
            if os.name == 'nt':  # Windows
                cmd_str = ' '.join(f'"{arg}"' if ' ' in arg else arg for arg in cmd)
                subprocess.run(cmd_str, check=True, shell=True, cwd=cwd)
            else:
                subprocess.run(cmd, check=True, cwd=cwd)
                
        except subprocess.CalledProcessError as e:
            print(f"Erreur lors de l'affichage des annonces : {e}")
            print(f"Code de sortie : {e.returncode}")
            if e.stdout:
                print("Sortie standard :", e.stdout)
            if e.stderr:
                print("Erreur standard :", e.stderr)
        except FileNotFoundError:
            print(f"Erreur : Le fichier {script_path} est introuvable")
        except Exception as e:
            print(f"Erreur inattendue : {e}")
        
        print("\n" + "=" * 80)
        
        # Nettoyer les fichiers HTML temporaires
        print("Nettoyage des fichiers HTML temporaires...")
        patterns_to_clean = [
            "*_page*.html",
            "*_telechargee.html",
            "*_telechargee_page*.html"
        ]
        
        for pattern in patterns_to_clean:
            for file_path in glob.glob(pattern):
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        print(f"Fichier supprimé : {file_path}")
                except Exception as e:
                    print(f"Erreur lors de la suppression de {file_path}: {e}")
        
        print("Nettoyage terminé.")
        print("\n" + "=" * 80)
        print("PIPELINE TERMINÉ AVEC SUCCÈS")
        print("=" * 80)
        
    except Exception as e:
        print(f"\nERREUR : {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Nettoyer les fichiers temporaires même en cas d'erreur
        print("\nNettoyage des fichiers temporaires après erreur...")
        patterns_to_clean = [
            "*_page*.html",
            "*_telechargee.html",
            "*_telechargee_page*.html"
        ]
        
        for pattern in patterns_to_clean:
            for file_path in glob.glob(pattern):
                try:
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        print(f"Fichier supprimé : {file_path}")
                except Exception as cleanup_error:
                    print(f"Erreur lors de la suppression de {file_path}: {cleanup_error}")
        
        sys.exit(1)

if __name__ == "__main__":
    main()
