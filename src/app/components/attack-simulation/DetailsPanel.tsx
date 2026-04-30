"use client";

import { useState, useEffect } from "react";
import { Asset, Adversary, TTP } from "@/app/types/simulation";
import { Monitor, Cpu, Wifi, Target, Hash, Layers, User, Tag, Loader2 } from "lucide-react";
import { Step2Selection } from "./StepSelectAdversary";

// ─── Colors ───────────────────────────────────────────────────────────────────

const TACTIC_COLORS: Record<string, string> = {
  "Initial Access":       "text-red-400 bg-red-900/20",
  "Execution":            "text-orange-400 bg-orange-900/20",
  "Persistence":          "text-amber-400 bg-amber-900/20",
  "Privilege Escalation": "text-yellow-400 bg-yellow-900/20",
  "Defense Evasion":      "text-lime-400 bg-lime-900/20",
  "Lateral Movement":     "text-cyan-400 bg-cyan-900/20",
  "Collection":           "text-blue-400 bg-blue-900/20",
  "Command And Control":  "text-indigo-400 bg-indigo-900/20",
  "Exfiltration":         "text-purple-400 bg-purple-900/20",
  "Impact":               "text-pink-400 bg-pink-900/20",
  "Discovery":            "text-teal-400 bg-teal-900/20",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  currentStep: number;
  assets: Asset[];
  step2: Step2Selection;
}

// ─── AssetPanel ───────────────────────────────────────────────────────────────

function AssetPanel({ asset }: { asset: Asset }) {
  const [proxmoxIp, setProxmoxIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(false);

  useEffect(() => {
    if (!asset.vmidProxmox) return;
    setIpLoading(true);
    setProxmoxIp(null);
    fetch(`/api/proxmox/vm-ip?vmid=${asset.vmidProxmox}`)
      .then((r) => r.json())
      .then((data) => { if (data.ip) setProxmoxIp(data.ip); })
      .catch(() => {})
      .finally(() => setIpLoading(false));
  }, [asset.vmidProxmox]);

  const displayIp = proxmoxIp ?? asset.ip ?? "—";

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gray-800/70 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={13} className="text-brand" />
          <p className="text-white font-bold text-sm truncate">{asset.name}</p>
        </div>
        <p className="text-gray-500 text-xs">{asset.os}</p>
      </div>

      {/* Category + Description */}
      {(asset.category || asset.description) && (
        <div className="space-y-1.5">
          {asset.category && (
            <div className="flex items-center gap-1.5">
              <Tag size={10} className="text-gray-600 shrink-0" />
              <span className="text-[10px] text-brand font-semibold bg-brand/10 px-1.5 py-0.5 rounded">
                {asset.category}
              </span>
            </div>
          )}
          {asset.description && (
            <p className="text-[10px] text-gray-500 leading-relaxed">{asset.description}</p>
          )}
        </div>
      )}

      {/* Network — IP only */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Wifi size={11} className="text-gray-600" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Network</p>
          {ipLoading && <Loader2 size={9} className="text-gray-600 animate-spin ml-auto" />}
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">IP</span>
          <span className="text-gray-300 font-mono font-medium text-[11px]">
            {ipLoading && !proxmoxIp
              ? <span className="text-gray-600 italic">loading…</span>
              : displayIp
            }
          </span>
        </div>
      </div>

      {/* Hardware */}
      {(asset.cpu || asset.ram || asset.disk) && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Cpu size={11} className="text-gray-600" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Hardware</p>
          </div>
          <div className="space-y-1.5">
            {asset.cpu  && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">CPU</span>
                <span className="text-gray-300 text-right text-[11px] max-w-27.5 leading-tight">{asset.cpu}</span>
              </div>
            )}
            {asset.ram  && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">RAM</span>
                <span className="text-gray-300 text-right text-[11px]">{asset.ram}</span>
              </div>
            )}
            {asset.disk && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Disk</span>
                <span className="text-gray-300 text-right text-[11px]">{asset.disk}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AdversaryPanel ───────────────────────────────────────────────────────────

function AdversaryPanel({ adversary, selectedTTPs }: { adversary: Adversary; selectedTTPs: TTP[] }) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-gray-800/70 rounded-xl p-3">
        <div className="mb-2">
          <p className="text-white font-bold text-sm leading-tight">{adversary.name}</p>
        </div>
        <p className="text-gray-500 text-[11px] leading-relaxed">{adversary.description}</p>
      </div>

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

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={11} className="text-gray-600" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            TTPs sélectionnés ({selectedTTPs.length}/{adversary.ttps.length})
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {adversary.ttps.map((ttp) => {
            const isActive = selectedTTPs.some((t) => t.id === ttp.id);
            const tc = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
            return (
              <div
                key={ttp.id}
                className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${
                  isActive ? "border-brand/30 bg-brand/5" : "border-gray-800/50 bg-gray-800/20 opacity-40"
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-brand shrink-0 mt-0.5">{ttp.id}</span>
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

// ─── TTPsOnlyPanel ────────────────────────────────────────────────────────────

function TTPsOnlyPanel({ selectedTTPs }: { selectedTTPs: TTP[] }) {
  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="bg-gray-800/70 rounded-xl p-3">
        <p className="text-white font-bold text-sm">
          {selectedTTPs.length} TTP{selectedTTPs.length !== 1 ? "s" : ""} sélectionné{selectedTTPs.length !== 1 ? "s" : ""}
        </p>
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
            {selectedTTPs.map((ttp) => {
              const tc = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
              return (
                <div key={ttp.id} className="flex items-start gap-2 p-2 rounded-lg border border-brand/30 bg-brand/5">
                  <span className="font-mono text-[10px] font-bold text-brand shrink-0 mt-0.5">{ttp.id}</span>
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

export default function DetailsPanel({ currentStep, assets, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;

  let title = "Asset Details";
  let content: React.ReactNode;

  if (currentStep === 1) {
    if (assets.length === 0) {
      title = "Asset Details";
      content = (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center">
            <Monitor size={20} className="text-gray-700" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">Sélectionnez un actif pour voir ses détails</p>
        </div>
      );
    } else if (assets.length === 1) {
      title = "Asset Details";
      content = <AssetPanel asset={assets[0]} />;
    } else {
      title = `${assets.length} Assets sélectionnés`;
      content = (
        <div className="flex flex-col gap-2 animate-in fade-in duration-200">
          {assets.map((a) => (
            <div key={a.id} className="flex items-start gap-2 bg-gray-800/60 rounded-xl p-2.5">
              <Monitor size={12} className="text-brand mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{a.name}</p>
                <p className="text-gray-500 text-[10px]">{a.os}</p>
                {a.category && (
                  <span className="text-[9px] text-brand bg-brand/10 px-1 py-0.5 rounded font-medium">{a.category}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  } else if (currentStep === 2) {
    if (adversary) {
      title = "Adversary Details";
      content = <AdversaryPanel adversary={adversary} selectedTTPs={selectedTTPs} />;
    } else {
      title = "TTP Details";
      content = <TTPsOnlyPanel selectedTTPs={selectedTTPs} />;
    }
  } else {
    title = "Résumé";
    content = (
      <div className="flex flex-col gap-3 animate-in fade-in duration-200">
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">
            Cible{assets.length > 1 ? "s" : ""} ({assets.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {assets.map((a) => (
              <div key={a.id}>
                <p className="text-white font-bold text-xs">{a.name}</p>
                <p className="text-gray-500 text-[10px]">{a.os}</p>
              </div>
            ))}
          </div>
        </div>
        {adversary && (
          <div className="bg-gray-800/50 rounded-xl p-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Adversaire</p>
            <p className="text-white font-bold text-sm">{adversary.name}</p>
          </div>
        )}
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">TTPs ({selectedTTPs.length})</p>
          <div className="flex flex-wrap gap-1">
            {selectedTTPs.map((t) => (
              <span key={t.id} className="font-mono text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                {t.id}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4 shrink-0 overflow-hidden">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0">{title}</p>
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
        {content}
      </div>
    </div>
  );
}
