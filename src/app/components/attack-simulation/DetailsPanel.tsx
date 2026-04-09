"use client";
 
import { Asset, Adversary, TTP } from "@/app/types/simulation";
import { Monitor, Cpu, Wifi, Shield, Target, Hash, Layers, User } from "lucide-react";
import { Step2Selection } from "./StepSelectAdversary";
 
// ─── Asset details data ───────────────────────────────────────────────────────
const ASSET_DETAILS: Record<string, { ip: string; mac: string; cpu: string; ram: string; disk: string }> = {
  "ws-corp-042":    { ip: "192.168.10.42", mac: "AA:BB:CC:DD:EE:FF", cpu: "Intel i7-12700", ram: "16 GB",  disk: "512 GB SSD" },
  "srv-dc-01":      { ip: "192.168.1.1",   mac: "11:22:33:44:55:66", cpu: "Xeon E-2334",   ram: "64 GB",  disk: "2 TB NVMe"  },
  "dev-linux-01":   { ip: "192.168.10.55", mac: "AA:11:BB:22:CC:33", cpu: "AMD Ryzen 5",   ram: "32 GB",  disk: "1 TB SSD"   },
  "user-laptop-03": { ip: "192.168.20.18", mac: "FF:EE:DD:CC:BB:AA", cpu: "Apple M2",      ram: "8 GB",   disk: "256 GB SSD" },
};
 
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/20 border-red-800/40",
  High:     "text-orange-400 bg-orange-900/20 border-orange-800/40",
  Medium:   "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  Low:      "text-green-400 bg-green-900/20 border-green-800/40",
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
 
// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  currentStep: number;
  asset: Asset | null;
  step2: Step2Selection;
}
 
// ─── Sub-panels ───────────────────────────────────────────────────────────────
 
function AssetPanel({ asset }: { asset: Asset }) {
  const details = ASSET_DETAILS[asset.id];
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-gray-800/70 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={13} className="text-brand" />
          <p className="text-white font-bold text-sm truncate">{asset.name}</p>
        </div>
        <p className="text-gray-500 text-xs">{asset.os}</p>
        <p className={`text-xs font-semibold mt-1 ${asset.status === "Online" ? "text-emerald-400" : "text-gray-600"}`}>
          ● {asset.status}
        </p>
      </div>
 
      {details && (
        <>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Wifi size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Network</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">IP</span>
                <span className="text-gray-300 font-mono font-medium">{details.ip}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">MAC</span>
                <span className="text-gray-400 font-mono text-[10px]">{details.mac}</span>
              </div>
            </div>
          </div>
 
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Hardware</p>
            </div>
            <div className="space-y-1.5">
              {[["CPU", details.cpu], ["RAM", details.ram], ["Disk", details.disk]].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-gray-600">{k}</span>
                  <span className="text-gray-300 text-right text-[11px] max-w-[110px] leading-tight">{v}</span>
                </div>
              ))}
            </div>
          </div>
 
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Posture</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand to-indigo-400 rounded-full" style={{ width: asset.status === "Online" ? "72%" : "0%" }} />
              </div>
              <span className="text-xs text-gray-400 font-semibold">{asset.status === "Online" ? "72%" : "—"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
 
function AdversaryPanel({ adversary, selectedTTPs }: { adversary: Adversary; selectedTTPs: TTP[] }) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gray-800/70 rounded-xl p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-white font-bold text-sm leading-tight">{adversary.name}</p>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex-shrink-0 ${SEVERITY_COLORS[adversary.severity]}`}>
            {adversary.severity}
          </span>
        </div>
        <p className="text-gray-500 text-[11px] leading-relaxed">{adversary.description}</p>
      </div>
 
      {/* Meta */}
      <div className="space-y-2">
        {adversary.origin && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-600"><User size={11} /> Origin</div>
            <span className="text-gray-300 font-medium">{adversary.origin}</span>
          </div>
        )}
        {adversary.motivation && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-600"><Target size={11} /> Motivation</div>
            <span className="text-gray-300 font-medium">{adversary.motivation}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-600"><Layers size={11} /> TTPs total</div>
          <span className="text-gray-300 font-medium">{adversary.ttps.length}</span>
        </div>
      </div>
 
      {/* Selected TTPs */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={11} className="text-gray-600" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            TTPs sélectionnés ({selectedTTPs.length}/{adversary.ttps.length})
          </p>
        </div>
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {adversary.ttps.map(ttp => {
            const isActive = selectedTTPs.some(t => t.id === ttp.id);
            const tc = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
            return (
              <div key={ttp.id} className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${isActive ? "border-brand/30 bg-brand/5" : "border-gray-800/50 bg-gray-800/20 opacity-40"}`}>
                <span className="font-mono text-[10px] font-bold text-brand flex-shrink-0 mt-0.5">{ttp.id}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-semibold ${isActive ? "text-white" : "text-gray-500"}`}>{ttp.name}</p>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${tc}`}>{ttp.tactic}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
 
function TTPsOnlyPanel({ selectedTTPs }: { selectedTTPs: TTP[] }) {
  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="bg-gray-800/70 rounded-xl p-3">
        <p className="text-white font-bold text-sm">{selectedTTPs.length} TTP{selectedTTPs.length !== 1 ? "s" : ""} sélectionné{selectedTTPs.length !== 1 ? "s" : ""}</p>
        <p className="text-gray-500 text-[11px] mt-0.5">Sélection manuelle sans profil adversaire</p>
      </div>
 
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={11} className="text-gray-600" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">TTPs actifs</p>
        </div>
        {selectedTTPs.length === 0 ? (
          <p className="text-xs text-gray-600 italic text-center py-4">Aucun TTP sélectionné</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {selectedTTPs.map(ttp => {
              const tc = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
              return (
                <div key={ttp.id} className="flex items-start gap-2 p-2 rounded-lg border border-brand/30 bg-brand/5">
                  <span className="font-mono text-[10px] font-bold text-brand flex-shrink-0 mt-0.5">{ttp.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white">{ttp.name}</p>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${tc}`}>{ttp.tactic}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
 
// ─── Main component ───────────────────────────────────────────────────────────
 
export default function DetailsPanel({ currentStep, asset, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;
 
  // Determine what to show
  let title = "Asset Details";
  let content: React.ReactNode;
 
  if (currentStep === 1) {
    title = "Asset Details";
    content = asset ? (
      <AssetPanel asset={asset} />
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center">
          <Monitor size={20} className="text-gray-700" />
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">Sélectionnez un asset pour voir ses détails</p>
      </div>
    );
  } else if (currentStep === 2) {
    if (adversary) {
      title = "Adversary Details";
      content = <AdversaryPanel adversary={adversary} selectedTTPs={selectedTTPs} />;
    } else {
      title = "TTP Details";
      content = <TTPsOnlyPanel selectedTTPs={selectedTTPs} />;
    }
  } else {
    // Step 3 — show summary
    title = "Résumé";
    content = (
      <div className="flex flex-col gap-3 animate-in fade-in duration-200">
        {asset && (
          <div className="bg-gray-800/50 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Cible</p>
            <p className="text-white font-bold text-sm">{asset.name}</p>
            <p className="text-gray-500 text-xs">{asset.os}</p>
          </div>
        )}
        {adversary && (
          <div className="bg-gray-800/50 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Adversaire</p>
            <p className="text-white font-bold text-sm">{adversary.name}</p>
          </div>
        )}
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">TTPs ({selectedTTPs.length})</p>
          <div className="flex flex-wrap gap-1">
            {selectedTTPs.map(t => (
              <span key={t.id} className="font-mono text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">{t.id}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="w-56 bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4 flex-shrink-0 overflow-hidden">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 flex-shrink-0">{title}</p>
      <div className="flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}
 