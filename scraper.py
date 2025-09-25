from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

def setup_driver():
    """Configure et retourne un navigateur Chrome avec Selenium"""
    chrome_options = Options()
    
    # Options pour faire ressembler à un vrai navigateur
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Désactiver les logs inutiles
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    # Initialiser le driver
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    # Modifier les propriétés du navigateur pour paraître plus humain
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver

def download_page(url, output_path=None):
    """
    Télécharge le contenu d'une page web avec Selenium
    
    Args:
        url (str ou LBCUrlBuilder): URL de la page à télécharger ou objet LBCUrlBuilder
        output_path (str, optional): Chemin de sortie du fichier HTML
    
    Returns:
        str: Contenu HTML de la page ou None en cas d'erreur
    """
    driver = None
    try:
        # Convertir l'URL en chaîne si c'est un objet LBCUrlBuilder
        if hasattr(url, '__str__'):
            url_str = str(url)
            print(f"Conversion de l'objet en chaîne : {url_str}")
        else:
            url_str = str(url)
            
        # Vérifier que l'URL est valide
        if not url_str.startswith(('http://', 'https://')):
            print(f"ERREUR: URL invalide : {url_str}")
            return None
        
        print("Lancement du navigateur...")
        driver = setup_driver()
        
        print(f"Accès à l'URL : {url_str}")
        driver.get(url_str)
        
        # Attendre que la page soit chargée
        time.sleep(5)  # Augmentez ce délai si nécessaire
        
        # Vérifier si on est bloqué
        if "datadome" in driver.page_source.lower() or "access denied" in driver.page_source.lower():
            print("Détection de protection anti-bot. Essayez de résoudre le CAPTCHA manuellement...")
            input("Appuyez sur Entrée après avoir résolu le CAPTCHA...")
        
        # Récupérer le contenu de la page
        page_content = driver.page_source
        
        # Sauvegarder dans un fichier si un chemin est fourni
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(page_content)
            print(f"Page enregistrée dans : {output_path}")
        
        return page_content
        
    except Exception as e:
        print(f"Erreur lors du téléchargement : {str(e)}")
        return None
        
    finally:
        if driver:
            print("Fermeture du navigateur...")
            driver.quit()

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
