import subprocess
import os
import sys

def refresh_cti_database(category="windows"):
    print(f"🔄 Rafraîchissement CTI : [{category}]")

    try:
        # 1. Git Pull
        if os.path.exists("sigma_repo"):
            subprocess.run(["git", "-C", "sigma_repo", "pull"], capture_output=True, text=True, check=True)
        else:
            subprocess.run(["git", "clone", "--depth", "1", "https://github.com/SigmaHQ/sigma.git", "sigma_repo"], check=True)

        # 2. Import Dynamique de l'importer
        try:
            import universal_importer
        except ImportError:
            print("❌ Erreur : Renommez 'cti_universal_importer.py' en 'universal_importer.py'")
            return False
        
        # Injection des paramètres
        universal_importer.TARGET_CATEGORY = category
        universal_importer.SIGMA_BASE_PATH = f"sigma_repo/rules/{category}"
        universal_importer.OUTPUT_FILE = f"{category}_cti_db.json"
        
        # Exécution
        universal_importer.process_rules()

        print(f"✨ Base {category} mise à jour avec succès.")
        return True

    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False

if __name__ == "__main__":
    cat = sys.argv[1] if len(sys.argv) > 1 else "windows"
    refresh_cti_database(cat)