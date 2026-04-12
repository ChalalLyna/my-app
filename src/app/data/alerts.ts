export type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "New" | "Investigating" | "Resolved";

export interface DetectionAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  ttp: string;
  ttpName: string;
  asset: string;
  timestamp: string;
  source: string;
  rawLog: string;
}

export const MOCK_ALERTS: DetectionAlert[] = [
  {
    id: "ALT-001",
    title: "Suspicious PowerShell Execution",
    description: "A PowerShell command was executed with encoded arguments, a common technique used to obfuscate malicious scripts.",
    severity: "Critical",
    status: "New",
    ttp: "T1059",
    ttpName: "Command & Scripting Interpreter",
    asset: "WS-CORP-042",
    timestamp: "2025-04-12T10:34:22Z",
    source: "Caldera / Sysmon",
    rawLog: `EventID: 4104\nProcess: powershell.exe\nCommandLine: powershell -enc JABjAGwAaQBlAG4AdAAgAD0A...\nUser: CORP\\jdoe\nParentProcess: cmd.exe`,
  },
  {
    id: "ALT-002",
    title: "Lateral Movement via SMB",
    description: "Unusual SMB connection detected between workstations, indicating possible lateral movement attempt.",
    severity: "High",
    status: "New",
    ttp: "T1021",
    ttpName: "Remote Services",
    asset: "SRV-DC-01",
    timestamp: "2025-04-12T10:35:47Z",
    source: "Caldera / Network Sensor",
    rawLog: `EventID: 5140\nShareName: \\\\SRV-DC-01\\ADMIN$\nSourceIP: 192.168.10.42\nDestIP: 192.168.1.1\nUser: CORP\\jdoe`,
  },
  {
    id: "ALT-003",
    title: "Valid Account Used for Persistence",
    description: "A domain account logged in outside business hours, potentially indicating credential abuse.",
    severity: "Medium",
    status: "Investigating",
    ttp: "T1078",
    ttpName: "Valid Accounts",
    asset: "WS-CORP-042",
    timestamp: "2025-04-12T10:37:11Z",
    source: "Caldera / AD Logs",
    rawLog: `EventID: 4624\nLogonType: 3\nUser: CORP\\svc_backup\nSourceIP: 192.168.10.42\nTime: 02:37:11 UTC`,
  },
  {
    id: "ALT-004",
    title: "Phishing Email Link Clicked",
    description: "A user clicked a link in a simulated phishing email, triggering initial access telemetry.",
    severity: "High",
    status: "New",
    ttp: "T1566",
    ttpName: "Phishing",
    asset: "USER-LAPTOP-03",
    timestamp: "2025-04-12T10:38:59Z",
    source: "Caldera / Email Gateway",
    rawLog: `EventID: SIM-001\nRecipient: sara.b@corp.local\nSubject: Urgent: VPN Update Required\nLinkClicked: http://malicious-sim.lab/payload\nUserAgent: Mozilla/5.0 (Macintosh)`,
  },
];
