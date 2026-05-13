export type MissionStatus = "In Progress" | "Completed" | "Planned" | "Failed";
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

export const MOCK_MISSIONS: Mission[] = [
  {
    id: "M001",
    name: "Purple Team Q1 2025",
    type: "Purple Team",
    status: "Completed",
    tasks: ["import-rules", "replicate-ad", "initial-access", "lateral-movement", "review-alerts", "tune-rules", "report"],
    createdAt: "2025-03-01T09:00:00Z",
    completedAt: "2025-03-15T17:00:00Z",
    target: "WS-CORP-042 / SRV-DC-01",
    createdBy: "John Doe",
    report: {
      summary: "Purple Team Q1 mission completed successfully. 7 ATT&CK techniques simulated, 5 detected by the SIEM. 2 detection gaps identified and fixed via rule tuning. Coverage score improved from 62% to 79%.",
      vulnerabilities: [
        { title: "Unmonitored PowerShell", severity: "Critical", description: "Base64-encoded PowerShell commands are not blocked by the current EDR, allowing arbitrary code execution." },
        { title: "Over-privileged service accounts", severity: "High", description: "The svc_backup account holds Domain Admin rights not required for its role." },
        { title: "SMB v1 active on SRV-DC-01", severity: "High", description: "SMBv1 is active on the domain controller, exposing the system to EternalBlue." },
        { title: "Insufficient audit logs", severity: "Medium", description: "Type 4624 events are not properly centralized in the SIEM." },
      ],
      recommendations: [
        "Enable PowerShell Constrained Language Mode on all workstations.",
        "Review service account permissions — apply the principle of least privilege.",
        "Disable SMBv1 across all systems via GPO.",
        "Centralize EventID 4624 and 4625 logs in the SIEM.",
        "Deploy a Sigma rule to detect after-hours logins on service accounts.",
      ],
      score: 79,
      ttpsUsed: ["T1566", "T1078", "T1021", "T1059", "T1486", "T1048", "T1083"],
      alertsGenerated: 12,
      duration: "14 days",
    },
  },
  {
    id: "M002",
    name: "Audit AD — Infrastructure",
    type: "Audit",
    status: "In Progress",
    tasks: ["replicate-ad", "deploy-agent", "recon", "gap-analysis"],
    createdAt: "2025-04-01T10:00:00Z",
    target: "SRV-DC-01",
    createdBy: "John Doe",
  },
  {
    id: "M003",
    name: "Red Team Ransomware Sim",
    type: "Red Team",
    status: "Planned",
    tasks: ["snapshot", "initial-access", "persistence", "exfiltration", "report"],
    createdAt: "2025-04-10T14:00:00Z",
    target: "WS-CORP-042 / USER-LAPTOP-03",
    createdBy: "John Doe",
  },
];
