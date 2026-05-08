export interface Asset {
  id: string;
  name: string;
  os: string;
  // From DB (populated by /api/assets)
  description?: string;
  category?: string;
  vmidProxmox?: number;
  nomMachine?: string;
  cpu?: string;
  ram?: string;
  disk?: string;
  ip?: string;
}

export interface Adversary {
  id: string;
  name: string;
  ttps: TTP[];
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  origin?: string;
  motivation?: string;
}

export interface TTPExecutor {
  name: string;      // "cmd" | "psh" | "sh" | "bash"
  platform: string;  // "windows" | "linux" | "darwin"
  command: string;
  cleanup: string[];
  payloads: string[];
}

export interface TTP {
  id: string;       // MITRE technique_id (e.g. "T1566") or ability_id UUID if no technique_id
  name: string;
  tactic: string;
  description: string;
  calderaAbilityIds?: string[];  // Caldera ability UUIDs for this technique
  executors?: TTPExecutor[];
  privilege?: string;            // "Administrator" | "SYSTEM" | "" (empty = standard user)
  requirements?: string[];
}
