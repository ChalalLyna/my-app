export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewAction = "create" | "modify";

export interface RuleReview {
  id: string;
  ruleName: string;
  xml: string;
  filename: string;
  action: ReviewAction;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  status: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  comment?: string;
}

export const MOCK_RULE_REVIEWS: RuleReview[] = [
  {
    id: "rev-001",
    ruleName: "Suspicious PowerShell Encoded Command",
    xml: `<group name="cyberlab,windows,">\n  <rule id="100001" level="10">\n    <if_sid>92000</if_sid>\n    <field name="win.eventdata.commandLine" type="pcre2">(?i)encodedcommand|enc\\s+[A-Za-z0-9+/]{20}</field>\n    <description>Suspicious PowerShell encoded command detected</description>\n    <group>attack,execution,T1059.001</group>\n  </rule>\n</group>`,
    filename: "cyberlab_100001.xml",
    action: "create",
    submittedBy: "Alice Martin",
    submittedById: "user-001",
    submittedAt: "2026-05-17T08:00:00.000Z",
    status: "pending",
  },
  {
    id: "rev-002",
    ruleName: "LSASS Memory Access",
    xml: `<group name="cyberlab,windows,">\n  <rule id="100002" level="12">\n    <if_sid>92000</if_sid>\n    <field name="win.eventdata.targetImage" type="pcre2">(?i)lsass\\.exe</field>\n    <description>Potential credential dumping via LSASS access</description>\n    <group>attack,credential_access,T1003.001</group>\n  </rule>\n</group>`,
    filename: "cyberlab_100002.xml",
    action: "modify",
    submittedBy: "Bob Dupont",
    submittedById: "user-002",
    submittedAt: "2026-05-17T05:00:00.000Z",
    status: "approved",
    reviewedBy: "Sarah Chen",
    reviewedAt: "2026-05-17T06:30:00.000Z",
    comment: "Good detection rule, level is appropriate for the threat.",
  },
  {
    id: "rev-003",
    ruleName: "Lateral Movement via PsExec",
    xml: `<group name="cyberlab,windows,">\n  <rule id="100003" level="8">\n    <if_sid>92000</if_sid>\n    <field name="win.eventdata.originalFileName" type="pcre2">(?i)psexec</field>\n    <description>PsExec usage detected — possible lateral movement</description>\n    <group>attack,lateral_movement,T1570</group>\n  </rule>\n</group>`,
    filename: "cyberlab_100003.xml",
    action: "create",
    submittedBy: "Alice Martin",
    submittedById: "user-001",
    submittedAt: "2026-05-16T10:00:00.000Z",
    status: "rejected",
    reviewedBy: "Sarah Chen",
    reviewedAt: "2026-05-16T11:00:00.000Z",
    comment: "Too broad — PsExec has legitimate uses. Add additional conditions to reduce false positives.",
  },
  {
    id: "rev-004",
    ruleName: "Scheduled Task Created via CMD",
    xml: `<group name="cyberlab,windows,">\n  <rule id="100004" level="9">\n    <if_sid>18101</if_sid>\n    <field name="win.eventdata.commandLine" type="pcre2">(?i)schtasks.*\\/create</field>\n    <description>Scheduled task created via command line</description>\n    <group>attack,persistence,T1053.005</group>\n  </rule>\n</group>`,
    filename: "cyberlab_100004.xml",
    action: "create",
    submittedBy: "Bob Dupont",
    submittedById: "user-002",
    submittedAt: "2026-05-17T09:30:00.000Z",
    status: "pending",
  },
];
