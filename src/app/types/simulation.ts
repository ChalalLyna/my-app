export interface Asset {
  id: string;
  name: string;
  os: string;
  status: "Online" | "Offline";
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
 
export interface TTP {
  id: string;       // ex: "T1566"
  name: string;     // ex: "Phishing"
  tactic: string;   // ex: "Initial Access"
  description: string;
}