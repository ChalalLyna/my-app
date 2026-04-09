"use client";
 
import { useState } from "react";
import { Search, Skull, Bug, UserX, Globe, Shield, ChevronRight, X, CheckSquare } from "lucide-react";
import { Adversary, TTP } from "@/app/types/simulation";
 
// ─── Data ─────────────────────────────────────────────────────────────────────
 
const ALL_TTPS: TTP[] = [
  { id: "T1566",     name: "Phishing",                  tactic: "Initial Access",  description: "Sending malicious emails to gain initial access to target systems." },
  { id: "T1078",     name: "Valid Accounts",             tactic: "Defense Evasion", description: "Using legitimate credentials to authenticate and maintain access." },
  { id: "T1021",     name: "Remote Services",            tactic: "Lateral Movement",description: "Using remote services like RDP or SMB to move laterally." },
  { id: "T1059",     name: "Command & Scripting",        tactic: "Execution",       description: "Executing commands via interpreters like PowerShell or Bash." },
  { id: "T1105",     name: "Ingress Tool Transfer",      tactic: "Command & Control",description: "Transferring tools or files from external systems into the environment." },
  { id: "T1083",     name: "File & Directory Discovery", tactic: "Discovery",       description: "Enumerating files and directories to find sensitive data." },
  { id: "T1566.001", name: "Spearphishing Attachment",   tactic: "Initial Access",  description: "Targeted phishing with malicious file attachments." },
  { id: "T1204",     name: "User Execution",             tactic: "Execution",       description: "Relying on user interaction to execute malicious code." },
  { id: "T1055",     name: "Process Injection",          tactic: "Privilege Escalation", description: "Injecting code into legitimate processes to evade detection." },
  { id: "T1486",     name: "Data Encrypted for Impact",  tactic: "Impact",          description: "Encrypting data to disrupt availability (ransomware)." },
  { id: "T1489",     name: "Service Stop",               tactic: "Impact",          description: "Stopping or disabling services to disrupt operations." },
  { id: "T1490",     name: "Inhibit System Recovery",    tactic: "Impact",          description: "Deleting backups and shadow copies to prevent recovery." },
  { id: "T1048",     name: "Exfiltration Over Alt Channel", tactic: "Exfiltration", description: "Exfiltrating data over alternative channels like DNS or ICMP." },
  { id: "T1074",     name: "Data Staged",                tactic: "Collection",      description: "Staging collected data in a central location prior to exfiltration." },
  { id: "T1190",     name: "Exploit Public-Facing App",  tactic: "Initial Access",  description: "Exploiting vulnerabilities in internet-facing applications." },
  { id: "T1059.007", name: "JavaScript",                 tactic: "Execution",       description: "Using JavaScript for malicious execution in browsers or Node.js." },
  { id: "T1505",     name: "Server Software Component",  tactic: "Persistence",     description: "Installing web shells or server-side components for persistence." },
];
 
const ADVERSARIES: Adversary[] = [
  {
    id: "apt29",
    name: "APT29 (Cozy Bear)",
    ttps: ALL_TTPS.filter(t => ["T1566","T1078","T1021"].includes(t.id)),
    severity: "Critical",
    description: "Russian state-sponsored APT known for supply chain attacks and stealthy persistence.",
    origin: "Russia",
    motivation: "Espionage",
  },
  {
    id: "lazarus",
    name: "Lazarus Group",
    ttps: ALL_TTPS.filter(t => ["T1059","T1105","T1083"].includes(t.id)),
    severity: "Critical",
    description: "North Korean threat actor targeting financial institutions and cryptocurrency.",
    origin: "North Korea",
    motivation: "Financial / Espionage",
  },
  {
    id: "fin7",
    name: "FIN7",
    ttps: ALL_TTPS.filter(t => ["T1566.001","T1204","T1055"].includes(t.id)),
    severity: "High",
    description: "Financially motivated group targeting retail and hospitality sectors.",
    origin: "Unknown",
    motivation: "Financial",
  },
  {
    id: "generic-ransomware",
    name: "Generic Ransomware",
    ttps: ALL_TTPS.filter(t => ["T1486","T1489","T1490"].includes(t.id)),
    severity: "High",
    description: "Common ransomware patterns for endpoint resilience testing.",
    origin: "Various",
    motivation: "Financial",
  },
  {
    id: "insider-threat",
    name: "Insider Threat",
    ttps: ALL_TTPS.filter(t => ["T1078","T1048","T1074"].includes(t.id)),
    severity: "Medium",
    description: "Simulates malicious insider data exfiltration behaviors.",
    origin: "Internal",
    motivation: "Data theft",
  },
  {
    id: "web-app-attacker",
    name: "Web Application Attacker",
    ttps: ALL_TTPS.filter(t => ["T1190","T1059.007","T1505"].includes(t.id)),
    severity: "Medium",
    description: "OWASP-based web attack simulation with common vulnerabilities.",
    origin: "Unknown",
    motivation: "Access / Defacement",
  },
];
 
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/30 border-red-800/50",
  High:     "text-orange-400 bg-orange-900/30 border-orange-800/50",
  Medium:   "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
  Low:      "text-green-400 bg-green-900/30 border-green-800/50",
};
 
const TACTIC_COLORS: Record<string, string> = {
  "Initial Access":       "text-red-400 bg-red-900/20",
  "Execution":            "text-orange-400 bg-orange-900/20",
  "Persistence":          "text-amber-400 bg-amber-900/20",
  "Privilege Escalation": "text-yellow-400 bg-yellow-900/20",
  "Defense Evasion":      "text-lime-400 bg-lime-900/20",
  "Lateral Movement":     "text-cyan-400 bg-cyan-900/20",
  "Collection":           "text-blue-400 bg-blue-900/20",
  "Command & Control":    "text-indigo-400 bg-indigo-900/20",
  "Exfiltration":         "text-purple-400 bg-purple-900/20",
  "Impact":               "text-pink-400 bg-pink-900/20",
  "Discovery":            "text-teal-400 bg-teal-900/20",
};
 
const ICONS = [Skull, Bug, UserX, Globe, Shield, Skull];
 
// ─── Props ────────────────────────────────────────────────────────────────────
 
export interface Step2Selection {
  adversary: Adversary | null;
  selectedTTPs: TTP[];
}
 
interface Props {
  selection: Step2Selection;
  onSelectionChange: (s: Step2Selection) => void;
}
 
// ─── Component ────────────────────────────────────────────────────────────────
 
export default function StepSelectAdversary({ selection, onSelectionChange }: Props) {
  const [mode, setMode] = useState<"adversary" | "ttp">("adversary");
  const [search, setSearch] = useState("");
 
  const { adversary: selectedAdversary, selectedTTPs } = selection;
 
  // TTPs shown in TTP mode = all; in adversary mode after selection = adversary's TTPs
  const ttpsToShow = selectedAdversary ? selectedAdversary.ttps : ALL_TTPS;
 
  const filteredAdversaries = ADVERSARIES.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.ttps.some(t => t.id.toLowerCase().includes(search.toLowerCase()))
  );
 
  const filteredTTPs = ttpsToShow.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tactic.toLowerCase().includes(search.toLowerCase())
  );
 
  // ── Handlers ──
  const handleSelectAdversary = (adv: Adversary) => {
    if (selectedAdversary?.id === adv.id) {
      // Deselect → clear everything
      onSelectionChange({ adversary: null, selectedTTPs: [] });
    } else {
      // Select adversary → pre-select all its TTPs
      onSelectionChange({ adversary: adv, selectedTTPs: adv.ttps });
    }
  };
 
  const handleToggleTTP = (ttp: TTP) => {
    const exists = selectedTTPs.find(t => t.id === ttp.id);
    const next = exists
      ? selectedTTPs.filter(t => t.id !== ttp.id)
      : [...selectedTTPs, ttp];
    onSelectionChange({ adversary: selectedAdversary, selectedTTPs: next });
  };
 
  const handleClearAdversary = () => {
    onSelectionChange({ adversary: null, selectedTTPs: [] });
    setMode("adversary");
  };
 
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white flex-shrink-0">Step 2: Select Adversary / TTP</h2>
 
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-800/60 rounded-xl flex-shrink-0">
        <button
          onClick={() => { setMode("adversary"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "adversary"
              ? "bg-gray-700 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Adversary Profile
        </button>
        <button
          onClick={() => { setMode("ttp"); setSearch(""); }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "ttp"
              ? "bg-gray-700 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {selectedAdversary ? `TTPs of ${selectedAdversary.name.split(" ")[0]}` : "TTPs directement"}
          {selectedTTPs.length > 0 && (
            <span className="ml-1.5 bg-brand/30 text-brand px-1.5 py-0.5 rounded-full text-[10px]">
              {selectedTTPs.length}
            </span>
          )}
        </button>
      </div>
 
      {/* Active adversary banner */}
      {selectedAdversary && mode === "ttp" && (
        <div className="flex items-center justify-between px-3 py-2 bg-brand/10 border border-brand/30 rounded-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-brand" />
            <span className="text-xs font-semibold text-brand">{selectedAdversary.name}</span>
            <span className="text-[10px] text-gray-500">— sélectionnez les TTPs à inclure</span>
          </div>
          <button onClick={handleClearAdversary} className="text-gray-600 hover:text-red-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}
 
      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={mode === "adversary" ? "Search adversaries..." : "Search TTPs..."}
          className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
        />
      </div>
 
      {/* ── ADVERSARY MODE ── */}
      {mode === "adversary" && (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1">
          {filteredAdversaries.map((adv, i) => {
            const isSelected = selectedAdversary?.id === adv.id;
            const Icon = ICONS[i % ICONS.length];
            return (
              <button
                key={adv.id}
                onClick={() => handleSelectAdversary(adv)}
                className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-brand bg-brand-light shadow-md shadow-brand/10"
                    : "border-gray-800 bg-gray-800/30 hover:border-gray-700 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-brand/20" : "bg-gray-700/60"}`}>
                      <Icon size={15} className={isSelected ? "text-brand" : "text-gray-400"} />
                    </div>
                    <p className={`font-bold text-sm leading-tight ${isSelected ? "text-brand-dark" : "text-white"}`}>
                      {adv.name}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${SEVERITY_COLORS[adv.severity]}`}>
                    {adv.severity}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                  {adv.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {adv.ttps.map((t) => (
                    <span key={t.id} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-brand/15 text-brand" : "bg-gray-700/60 text-gray-500"}`}>
                      {t.id}
                    </span>
                  ))}
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-brand font-semibold">
                    <ChevronRight size={11} />
                    Passer à la sélection des TTPs →
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
 
      {/* ── TTP MODE ── */}
      {mode === "ttp" && (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {filteredTTPs.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">Aucun TTP trouvé</p>
          )}
          {filteredTTPs.map((ttp) => {
            const isSelected = selectedTTPs.some(t => t.id === ttp.id);
            const tacticColor = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
            return (
              <button
                key={ttp.id}
                onClick={() => handleToggleTTP(ttp)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-brand/60 bg-brand/5 shadow-sm"
                    : "border-gray-800 bg-gray-800/20 hover:border-gray-700 hover:bg-gray-800/40"
                }`}
              >
                {/* Checkbox */}
                <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                  isSelected ? "bg-brand border-brand" : "border-gray-600"
                }`}>
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-brand">{ttp.id}</span>
                    <span className={`text-white text-xs font-semibold`}>{ttp.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${tacticColor}`}>
                      {ttp.tactic}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{ttp.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
 
export { ADVERSARIES, ALL_TTPS };