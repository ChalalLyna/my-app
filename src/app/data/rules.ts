export type RuleSeverity = "Critical" | "High" | "Medium" | "Low";
export type RuleStatus = "active" | "inactive";
 
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  status: RuleStatus;
  ttp: string;
  source: string;
  lastModified: string;
  yaml: string;
}
 
export const MOCK_RULES: DetectionRule[] = [
  {
    id: "R001",
    name: "PowerShell Encoded Command",
    description: "Détecte l'exécution de commandes PowerShell encodées en base64, souvent utilisées pour obfusquer du code malveillant.",
    severity: "Critical",
    status: "active",
    ttp: "T1059",
    source: "Sysmon / EventID 4104",
    lastModified: "2025-04-10T08:30:00Z",
    yaml: `title: PowerShell Encoded Command Detection
id: R001
status: experimental
description: Detects PowerShell execution with encoded commands
author: CyberLab
date: 2025/04/10
references:
  - https://attack.mitre.org/techniques/T1059/
tags:
  - attack.execution
  - attack.t1059.001
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    EventID: 4104
    ScriptBlockText|contains:
      - '-enc '
      - '-EncodedCommand'
      - 'JAB'
  condition: selection
fields:
  - CommandLine
  - User
  - ParentImage
falsepositives:
  - Legitimate administrative scripts
level: critical
`,
  },
  {
    id: "R002",
    name: "SMB Lateral Movement",
    description: "Détecte les connexions SMB suspectes entre postes de travail, indicateur de mouvement latéral.",
    severity: "High",
    status: "active",
    ttp: "T1021",
    source: "Network Sensor / EventID 5140",
    lastModified: "2025-04-09T14:15:00Z",
    yaml: `title: SMB Lateral Movement Detection
id: R002
status: stable
description: Detects unusual SMB connections between workstations
author: CyberLab
date: 2025/04/09
tags:
  - attack.lateral_movement
  - attack.t1021.002
logsource:
  category: network_connection
  product: windows
detection:
  selection:
    EventID: 5140
    ShareName|contains: 'ADMIN$'
    SourceAddress|startswith: '192.168.'
  filter:
    DestinationAddress|contains: '192.168.1.'
  condition: selection and not filter
fields:
  - SourceAddress
  - DestinationAddress
  - ShareName
  - User
falsepositives:
  - IT admin remote management
level: high
`,
  },
  {
    id: "R003",
    name: "After-Hours Login",
    description: "Détecte les connexions de comptes de service en dehors des heures ouvrables (avant 7h ou après 20h).",
    severity: "Medium",
    status: "active",
    ttp: "T1078",
    source: "AD Logs / EventID 4624",
    lastModified: "2025-04-08T09:00:00Z",
    yaml: `title: After-Hours Account Login
id: R003
status: experimental
description: Detects logins outside business hours (before 7am or after 8pm)
author: CyberLab
date: 2025/04/08
tags:
  - attack.defense_evasion
  - attack.t1078
logsource:
  category: authentication
  product: windows
detection:
  selection:
    EventID: 4624
    LogonType: 3
    TargetUserName|startswith: 'svc_'
  timeframe:
    before: '07:00'
    after: '20:00'
  condition: selection
fields:
  - TargetUserName
  - IpAddress
  - LogonType
falsepositives:
  - Scheduled maintenance tasks
  - On-call administrators
level: medium
`,
  },
  {
    id: "R004",
    name: "Phishing Link Click",
    description: "Détecte le clic sur un lien de phishing simulé via la passerelle email.",
    severity: "High",
    status: "active",
    ttp: "T1566",
    source: "Email Gateway / SIM-001",
    lastModified: "2025-04-07T16:45:00Z",
    yaml: `title: Phishing Link Click Detection
id: R004
status: experimental
description: Detects when a user clicks a simulated phishing link
author: CyberLab
date: 2025/04/07
tags:
  - attack.initial_access
  - attack.t1566.001
logsource:
  category: proxy
  product: network
detection:
  selection:
    EventID: SIM-001
    url|contains:
      - 'malicious-sim.lab'
      - '/payload'
  condition: selection
fields:
  - Recipient
  - Subject
  - LinkClicked
  - UserAgent
falsepositives:
  - Security awareness testing
level: high
`,
  },
  {
    id: "R005",
    name: "Process Injection Detected",
    description: "Détecte les injections de processus via des appels système suspects (CreateRemoteThread, WriteProcessMemory).",
    severity: "Critical",
    status: "inactive",
    ttp: "T1055",
    source: "Sysmon / EventID 8",
    lastModified: "2025-04-05T11:20:00Z",
    yaml: `title: Process Injection via CreateRemoteThread
id: R005
status: experimental
description: Detects process injection using CreateRemoteThread
author: CyberLab
date: 2025/04/05
tags:
  - attack.privilege_escalation
  - attack.t1055.003
logsource:
  category: create_remote_thread
  product: windows
detection:
  selection:
    EventID: 8
    TargetImage|endswith:
      - '\\lsass.exe'
      - '\\svchost.exe'
      - '\\explorer.exe'
  filter:
    SourceImage|startswith:
      - 'C:\\Windows\\System32\\'
  condition: selection and not filter
fields:
  - SourceImage
  - TargetImage
  - StartAddress
falsepositives:
  - Security software
level: critical
`,
  },
];
 
export const YAML_TEMPLATE = `title: Nouvelle Règle de Détection
id: R006
status: experimental
description: Description de la règle
author: CyberLab
date: ${new Date().toISOString().split("T")[0].replace(/-/g, "/")}
references:
  - https://attack.mitre.org/techniques/TXXXX/
tags:
  - attack.tactic
  - attack.tXXXX
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    EventID: 4104
    CommandLine|contains:
      - 'motclé1'
      - 'motclé2'
  condition: selection
fields:
  - CommandLine
  - User
  - ParentImage
falsepositives:
  - Comportement légitime possible
level: medium
`;