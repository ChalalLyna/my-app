import json
import yaml
import os
import re
# CONFIGURATION 
TARGET_CATEGORY = "windows" 
MAPPING_CONFIG = {
    "windows":   {"sid": "61603", "field": "win.eventdata.commandLine"},
    "linux":     {"sid": "5400",  "field": "full_log"},
    "macos":     {"sid": "510",   "field": "full_log"},
    "network":   {"sid": "10005", "field": "full_log"},
    "cloud":     {"sid": "10010", "field": "aws.eventSource"},
    "web":       {"sid": "31100", "field": "full_log"},
    "default":   {"sid": "10000", "field": "full_log"}
}
SIGMA_BASE_PATH = f"sigma_repo/rules/{TARGET_CATEGORY}"
OUTPUT_FILE = f"{TARGET_CATEGORY}_cti_db.json"
def map_severity(level):
    mapping = {"low": "5", "medium": "8", "high": "12", "critical": "15"}
    return mapping.get(str(level).lower(), "10")
def get_wazuh_info(logsource):
    for key in [logsource.get('product', ''), logsource.get('category', ''), TARGET_CATEGORY, 'default']:
        if key and key in MAPPING_CONFIG:
            return MAPPING_CONFIG[key]
    return MAPPING_CONFIG["default"]
def extract_logic(detection):
    keywords = []
    if not isinstance(detection, dict): return ""
    for key, value in detection.items():
        if key.startswith("selection"):
            if isinstance(value, dict):
                for _, items in value.items():
                    if isinstance(items, list): keywords.extend([str(i) for i in items])
                    else: keywords.append(str(items))
            elif isinstance(value, list):
                keywords.extend([str(i) for i in value])
    return "|".join([re.escape(k) for k in keywords if k])
def process_rules():
    if not os.path.exists(SIGMA_BASE_PATH):
        print(f" Dossier introuvable : {SIGMA_BASE_PATH}")
        return
    database = []
    for root, _, files in os.walk(SIGMA_BASE_PATH):
        for file in files:
            if file.endswith(".yml"):
                try:
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        raw_yaml = f.read()
                        f.seek(0)
                        content = yaml.safe_load(f)
                        if not content: continue
                        logsource = content.get('logsource', {})
                        tags = content.get('tags', [])
                        mitre_ids = [t.replace('attack.t', 'T').upper() for t in tags if t.startswith('attack.t')]    
                        wazuh_cfg = get_wazuh_info(logsource)
                        wazuh_lvl = map_severity(content.get('level', 'medium'))
                        regex = extract_logic(content.get('detection', {}))
                        # Conversion systématique en string 
                        date_val = content.get('date', 'N/A')
                        mod_val = content.get('modified', 'N/A')
                        entry = {
                            "metadata": {
                                "sigma_id": content.get('id', 'N/A'),
                                "title": content.get('title', 'Sans titre'),
                                "description": content.get('description'),
                                "author": content.get('author'),
                                "date_added": str(date_val) if date_val else "N/A",
                                "last_modified": str(mod_val) if mod_val else "N/A",
                                "mitre_techniques": mitre_ids,
                                "severity": content.get('level'),
                                "wazuh_level": wazuh_lvl,
                                "product": logsource.get('product'),
                                "category": TARGET_CATEGORY,
                                "sub_category": logsource.get('category'),
                                "original_sigma_yaml": raw_yaml
                            },
                            "wazuh_xml": (
                                f'<rule id="100001" level="{wazuh_lvl}">\n'
                                f'  <if_sid>{wazuh_cfg["sid"]}</if_sid>\n'
                                f'  <field name="{wazuh_cfg["field"]}" type="pcre2">(?i){regex}</field>\n'
                                f'  <description>{content.get("title")}</description>\n'
                                f'</rule>'
                            )
                        }
                        database.append(entry)
                except Exception: continue
    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        json.dump(database, f, indent=4, ensure_ascii=False)
    print(f" Importation terminée pour {TARGET_CATEGORY}.")
if __name__ == "__main__":
    process_rules()