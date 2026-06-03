export type MissionStatus = "In Progress" | "Completed" | "Planned" | "Failed";
export type MissionType = "Red Team" | "Blue Team" | "Purple Team";

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
  { id: "import-rules",    label: "Import rules",          description: "Import a Sigma rule set from a file or external repository.",               category: "Infrastructure" },
  { id: "export-rules",    label: "Export rules",          description: "Export active detection rules in Sigma YAML format.",                       category: "Infrastructure" },
  { id: "replicate-ad",    label: "Replicate AD",          description: "Replicate the target Active Directory structure in the Ludus environment.", category: "Infrastructure" },
  { id: "deploy-agent",    label: "Deploy agent",          description: "Install the Caldera agent on target assets.",                               category: "Infrastructure" },
  { id: "snapshot",        label: "VM snapshot",           description: "Create a snapshot of the current machine state before the mission.",        category: "Infrastructure" },
  // Attack
  { id: "recon",           label: "Reconnaissance",        description: "Information gathering phase on the target (OSINT, network scan).",          category: "Attack" },
  { id: "initial-access",  label: "Initial access",        description: "Simulate an initial access attempt via phishing or exploit.",               category: "Attack" },
  { id: "lateral-movement",label: "Lateral movement",      description: "Simulate lateral movement between network assets.",                         category: "Attack" },
  { id: "exfiltration",    label: "Data exfiltration",     description: "Simulate sensitive data exfiltration out of the network.",                  category: "Attack" },
  { id: "persistence",     label: "Persistence",           description: "Establish a persistence mechanism on the compromised system.",              category: "Attack" },
  // Detection
  { id: "tune-rules",      label: "Tune SIEM rules",       description: "Review and adjust detection rules based on mission results.",               category: "Detection" },
  { id: "review-alerts",   label: "Analyze alerts",        description: "Analyze all alerts generated during the mission.",                          category: "Detection" },
  { id: "gap-analysis",    label: "Gap analysis",          description: "Identify attacks not detected by the current SIEM.",                        category: "Detection" },
  // Reporting
  { id: "report",          label: "Generate report",       description: "Produce the complete mission report with recommendations.",                  category: "Reporting" },
  { id: "debrief",         label: "Team debrief",          description: "Organize a debrief session with stakeholders.",                             category: "Reporting" },
];

