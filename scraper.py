import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    """Configure et retourne un navigateur Chrome avec Selenium qui ressemble à un navigateur humain"""
    chrome_options = Options()
    
    # Options pour éviter la détection de bot
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Désactiver les logs inutiles
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    # User-Agent d'un navigateur moderne
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    chrome_options.add_argument(f'user-agent={user_agent}')
    
    # Désactiver WebDriver
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    
    # Options supplémentaires pour éviter la détection
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--disable-infobars')
    chrome_options.add_argument('--disable-notifications')
    chrome_options.add_argument('--disable-popup-blocking')
    
    # Initialiser le driver
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Modifier les propriétés du navigateur pour paraître plus humain
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    driver.execute_cdp_cmd('Network.setUserAgentOverride', {"userAgent": user_agent})
    
    # Désactiver la détection WebDriver
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['fr-FR', 'fr', 'en-US', 'en']
            });
        '''
    })
    
    return driver

def download_page(url, output_path=None, driver=None, page_number=1, max_pages=None):
    """
    Télécharge le contenu d'une page web avec Selenium
    
    Args:
        url (str ou LBCUrlBuilder): URL de la page à télécharger ou objet LBCUrlBuilder
        output_path (str, optional): Chemin de sortie du fichier HTML (peut contenir {page} pour le numéro de page)
        driver: Instance du navigateur existante (si None, une nouvelle est créée)
        page_number (int): Numéro de la page à télécharger
        max_pages (int, optional): Nombre maximum de pages à télécharger
    
    Returns:
        tuple: (contenu HTML de la page, driver, has_next_page)
    """
    import random
    import time
    
    should_quit = False
    has_next_page = False
    exception_occurred = False
    
    if driver is None:
        driver = setup_driver()
        should_quit = True
        
        # Attendre un peu après l'ouverture du navigateur
        time.sleep(random.uniform(2, 4))
    
    try:
        # Attendre un délai aléatoire avant de continuer
        time.sleep(random.uniform(1, 3))
        
        # Convertir l'URL en chaîne si c'est un objet LBCUrlBuilder
        if hasattr(url, '__str__'):
            url_str = str(url)
            print(f"Conversion de l'objet en chaîne : {url_str}")
        else:
            url_str = str(url)
        
        # Ajouter le numéro de page à l'URL si ce n'est pas la première page
        if page_number > 1:
            if '?' in url_str:
                url_str = f"{url_str}&page={page_number}"
            else:
                url_str = f"{url_str}?page={page_number}"
        
        # Faire défiler la fenêtre de manière aléatoire pour ressembler à un humain
        if random.random() > 0.5:  # 50% de chance de faire défiler
            scroll_pause_time = random.uniform(0.5, 1.5)
            scroll_amount = random.randint(200, 500)
            driver.execute_script(f"window.scrollBy(0, {scroll_amount});")
            time.sleep(scroll_pause_time)
        
        print(f"Accès à la page {page_number} : {url_str}")
        
        # Charger la page avec un délai aléatoire
        driver.get(url_str)
        
        # Attendre que la page soit chargée avec un délai aléatoire
        load_time = random.uniform(3, 7)
        print(f"Attente de {load_time:.1f} secondes pour le chargement de la page...")
        time.sleep(load_time)
        
        # Faire défiler la page de manière aléatoire
        if random.random() > 0.3:  # 70% de chance de faire défiler
            total_scrolls = random.randint(2, 5)
            for _ in range(total_scrolls):
                scroll_pause = random.uniform(0.5, 2.0)
                scroll_amount = random.randint(200, 800)
                driver.execute_script(f"window.scrollBy(0, {scroll_amount});")
                time.sleep(scroll_pause)
        
        # Vérifier si on est bloqué
        if "datadome" in driver.page_source.lower() or "access denied" in driver.page_source.lower():
            print("Détection de protection anti-bot. Essayez de résoudre le CAPTCHA manuellement...")
            input("Appuyez sur Entrée après avoir résolu le CAPTCHA...")
        
        # Récupérer le contenu de la page
        page_source = driver.page_source
        
        # Vérifier plusieurs variantes du message d'erreur
        error_messages = [
            "Aucune annonce ne correspond à votre recherche",
            "Désolés, nous n'avons pas ça sous la main",
            "Désolés, nous n'avons pas ça sous la main !",
            "Aucun résultat ne correspond à votre recherche",
            "Aucun résultat trouvé"
        ]
        
        # Vérifier si la page contient un message d'erreur
        for error_msg in error_messages:
            if error_msg in page_source:
                print(f"Message d'erreur détecté : '{error_msg}'")
                # Sauvegarder la page pour analyse
                debug_file = f"debug_page_{page_number}.html"
                with open(debug_file, "w", encoding="utf-8") as f:
                    f.write(page_source)
                print(f"Page de débogage enregistrée dans : {debug_file}")
                return None, driver, False
        
        # Vérifier si on est sur une page d'erreur ou de redirection
        error_titles = ["<title>Erreur 403</title>", "<title>Erreur 404</title>", "<title>Erreur 500</title>"]
        for error_title in error_titles:
            if error_title in page_source:
                print(f"Page d'erreur détectée : {error_title}")
                return None, driver, False
                
        # Vérifier si la page contient des annonces
        if "data-qa-id=" in page_source and "aditem" in page_source:
            print("Annonces détectées sur la page")
        else:
            print("Aucune annonce détectée sur la page")
            return None, driver, False
        
        # Vérifier s'il y a une page suivante
        has_next_page = False
        try:
            # Vérifier d'abord si on a atteint la fin des résultats
            if "Désolés, nous n'avons pas ça sous la main" in page_source:
                print("Fin des résultats atteinte (message de fin détecté).")
                has_next_page = False
            else:
                # Vérifier les boutons de pagination
                next_buttons = driver.find_elements("css selector", 
                    '[data-qa-id="pagination-next"]:not([disabled]), ' +
                    'a[data-qa-id="pagination-next"]:not([disabled]), ' +
                    'a[data-qa-id*="pagination-next"]:not([disabled])')
                
                has_next_page = len(next_buttons) > 0 and next_buttons[0].is_displayed()
                
                # Vérification supplémentaire basée sur le contenu de la page
                if not has_next_page and "suivant" in page_source.lower():
                    has_next_page = True
                
        except Exception as e:
            print(f"Erreur lors de la vérification de la page suivante : {str(e)}")
            has_next_page = False
        
        # Sauvegarder dans un fichier si un chemin est fourni
        if output_path and page_source:
            try:
                # Créer le répertoire s'il n'existe pas
                output_dir = os.path.dirname(os.path.abspath(output_path))
                if output_dir:  # Vérifier que le chemin n'est pas vide
                    os.makedirs(output_dir, exist_ok=True)
                
                # Remplacer {page} dans le chemin de sortie si nécessaire
                if '{page}' in output_path:
                    current_output = output_path.format(page=page_number)
                else:
                    # Ajouter le numéro de page avant l'extension
                    base, ext = os.path.splitext(output_path)
                    current_output = f"{base}_page{page_number}{ext}"
                
                # S'assurer que le chemin est absolu
                current_output = os.path.abspath(current_output)
                
                # Créer le répertoire parent s'il n'existe pas
                os.makedirs(os.path.dirname(current_output), exist_ok=True)
                
                # Écrire le contenu dans le fichier
                with open(current_output, "w", encoding="utf-8") as f:
                    f.write(page_source)
                print(f"Page {page_number} enregistrée dans : {current_output}")
                
                # Si c'est la première page, créer également une copie avec le nom de base
                if page_number == 1 and '{page}' not in output_path and page_source:
                    base_output = os.path.abspath(output_path)
                    with open(base_output, "w", encoding="utf-8") as f:
                        f.write(page_source)
                    print(f"Copie de la page 1 sauvegardée dans : {base_output}")
                    
            except Exception as e:
                print(f"Erreur lors de la sauvegarde du fichier : {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Vérifier si on est sur une page d'erreur ou de redirection
        if "Désolés, nous n'avons pas ça sous la main" in page_source:
            print("Fin des résultats atteinte (message de fin détecté).")
            has_next_page = False
            
        return page_source, driver, has_next_page
        
    except Exception as e:
        print(f"Erreur lors du téléchargement de la page {page_number} : {str(e)}")
        exception_occurred = True
        return None, driver, False
        
    finally:
        # Ne fermer le navigateur que si c'est la dernière page ou si une exception s'est produite
        if driver:
            if (should_quit and not has_next_page) or exception_occurred:
                print("Fermeture du navigateur...")
                driver.quit()
                driver = None  # S'assurer que le driver n'est plus utilisé

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python scraper.py <URL> [output_file]")
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("Démarrage du téléchargement avec Selenium...")
    print("Remarque : Un navigateur Chrome va s'ouvrir automatiquement.")
    
    download_page(url, output_path)
