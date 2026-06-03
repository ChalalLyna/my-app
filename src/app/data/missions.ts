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
  { id: "import-rules",     label: "Import client rules",    description: "Import the client's existing detection rules to evaluate and test them.",          category: "Infrastructure" },
  { id: "export-rules",     label: "Export rules to client", description: "Select rules from the cabinet library and export them as a deliverable.",           category: "Infrastructure" },
  { id: "replicate-client", label: "Replicate client assets",description: "Configure the client's environment replicas in the simulation platform.",           category: "Infrastructure" },
  { id: "deploy-agent",     label: "Deploy agent",           description: "Install the Caldera agent on target assets.",                                       category: "Infrastructure" },
  { id: "snapshot",         label: "VM snapshot",            description: "Create a snapshot of the current machine state before the mission.",                 category: "Infrastructure" },
  // Detection
  { id: "tune-rules",       label: "Tune SIEM rules",        description: "Review and adjust detection rules based on attack simulation results.",              category: "Detection" },
  { id: "review-alerts",    label: "Analyze alerts",         description: "Analyze all alerts generated during the mission.",                                  category: "Detection" },
  { id: "gap-analysis",     label: "Gap analysis",           description: "Identify TTPs not detected by the client's current SIEM configuration.",            category: "Detection" },
];

