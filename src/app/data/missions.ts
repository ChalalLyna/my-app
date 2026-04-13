export type MissionStatus = "En cours" | "Terminée" | "Planifiée" | "Échouée";
export type MissionType = "Red Team" | "Blue Team" | "Purple Team" | "Audit";

export interface MissionTask {
  id: string;
  label: string;
  description: string;
  category: string;
}

export interface Mission {
  id: string;
  name: string;
  type: MissionType;
  status: MissionStatus;
  tasks: string[]; // task IDs
  createdAt: string;
  completedAt?: string;
  target: string;
  createdBy: string;
  report?: MissionReport;
}

export interface MissionReport {
  summary: string;
  vulnerabilities: { title: string; severity: "Critical" | "High" | "Medium" | "Low"; description: string }[];
  recommendations: string[];
  score: number; // 0-100
  ttpsUsed: string[];
  alertsGenerated: number;
  duration: string;
}

// ─── Available tasks per type ─────────────────────────────────────────────────

export const MISSION_TASKS: MissionTask[] = [
  // Infrastructure
  { id: "import-rules",    label: "Importer des règles",         description: "Importer un jeu de règles Sigma depuis un fichier ou dépôt externe.",      category: "Infrastructure" },
  { id: "export-rules",    label: "Exporter des règles",         description: "Exporter les règles de détection actives au format Sigma YAML.",             category: "Infrastructure" },
  { id: "replicate-ad",    label: "Répliquer AD",                description: "Répliquer la structure Active Directory cible dans l'environnement Ludus.",  category: "Infrastructure" },
  { id: "deploy-agent",    label: "Déployer un agent",           description: "Installer l'agent Caldera sur les assets cibles.",                           category: "Infrastructure" },
  { id: "snapshot",        label: "Snapshot des VMs",            description: "Créer un snapshot de l'état actuel des machines avant la mission.",          category: "Infrastructure" },
  // Attack
  { id: "recon",           label: "Reconnaissance",              description: "Phase de collecte d'informations sur la cible (OSINT, scan réseau).",        category: "Attaque" },
  { id: "initial-access",  label: "Accès initial",               description: "Simuler une tentative d'accès initial via phishing ou exploit.",             category: "Attaque" },
  { id: "lateral-movement",label: "Mouvement latéral",           description: "Simuler un mouvement latéral entre assets du réseau.",                       category: "Attaque" },
  { id: "exfiltration",    label: "Exfiltration de données",     description: "Simuler une exfiltration de données sensibles hors du réseau.",              category: "Attaque" },
  { id: "persistence",     label: "Persistance",                 description: "Établir un mécanisme de persistance sur le système compromis.",              category: "Attaque" },
  // Detection
  { id: "tune-rules",      label: "Affiner les règles SIEM",     description: "Revoir et ajuster les règles de détection suite aux résultats.",             category: "Détection" },
  { id: "review-alerts",   label: "Analyser les alertes",        description: "Analyser toutes les alertes générées pendant la mission.",                   category: "Détection" },
  { id: "gap-analysis",    label: "Analyse des lacunes",         description: "Identifier les attaques non détectées par le SIEM actuel.",                  category: "Détection" },
  // Reporting
  { id: "report",          label: "Générer un rapport",          description: "Produire le rapport de mission complet avec recommandations.",                category: "Rapport" },
  { id: "debrief",         label: "Débrief équipe",              description: "Organiser une session de débrief avec les parties prenantes.",               category: "Rapport" },
];

export const MOCK_MISSIONS: Mission[] = [
  {
    id: "M001",
    name: "Purple Team Q1 2025",
    type: "Purple Team",
    status: "Terminée",
    tasks: ["import-rules", "replicate-ad", "initial-access", "lateral-movement", "review-alerts", "tune-rules", "report"],
    createdAt: "2025-03-01T09:00:00Z",
    completedAt: "2025-03-15T17:00:00Z",
    target: "WS-CORP-042 / SRV-DC-01",
    createdBy: "John Doe",
    report: {
      summary: "Mission Purple Team Q1 réalisée avec succès. 7 techniques ATT&CK simulées, 5 détectées par le SIEM. 2 lacunes de détection identifiées et corrigées via rule tuning. Score de couverture amélioré de 62% à 79%.",
      vulnerabilities: [
        { title: "PowerShell non supervisé", severity: "Critical", description: "Les commandes PowerShell encodées ne sont pas bloquées par l'EDR actuel, permettant une exécution arbitraire de code." },
        { title: "Comptes de service sur-privilégiés", severity: "High", description: "Le compte svc_backup dispose de droits Domain Admin non nécessaires à son rôle." },
        { title: "SMB v1 actif sur SRV-DC-01", severity: "High", description: "SMBv1 est actif sur le contrôleur de domaine, exposant le système à EternalBlue." },
        { title: "Logs d'audit insuffisants", severity: "Medium", description: "Les événements de type 4624 ne sont pas correctement centralisés dans le SIEM." },
      ],
      recommendations: [
        "Activer le mode Constrained Language de PowerShell sur tous les postes.",
        "Revoir les droits des comptes de service — appliquer le principe du moindre privilège.",
        "Désactiver SMBv1 sur l'ensemble des systèmes via GPO.",
        "Centraliser les logs EventID 4624 et 4625 dans le SIEM.",
        "Déployer une règle Sigma pour détecter les connexions après-heures sur les comptes de service.",
      ],
      score: 79,
      ttpsUsed: ["T1566", "T1078", "T1021", "T1059", "T1486", "T1048", "T1083"],
      alertsGenerated: 12,
      duration: "14 jours",
    },
  },
  {
    id: "M002",
    name: "Audit AD — Infrastructure",
    type: "Audit",
    status: "En cours",
    tasks: ["replicate-ad", "deploy-agent", "recon", "gap-analysis"],
    createdAt: "2025-04-01T10:00:00Z",
    target: "SRV-DC-01",
    createdBy: "John Doe",
  },
  {
    id: "M003",
    name: "Red Team Ransomware Sim",
    type: "Red Team",
    status: "Planifiée",
    tasks: ["snapshot", "initial-access", "persistence", "exfiltration", "report"],
    createdAt: "2025-04-10T14:00:00Z",
    target: "WS-CORP-042 / USER-LAPTOP-03",
    createdBy: "John Doe",
  },
];
