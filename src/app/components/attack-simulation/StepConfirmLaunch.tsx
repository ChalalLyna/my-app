"use client";

import { Asset, Adversary } from "@/types/simulation";
import { CheckCircle, Monitor, Shield, Zap, AlertTriangle } from "lucide-react";

interface Props {
  asset: Asset | null;
  adversary: Adversary | null;
}

export default function StepConfirmLaunch({ asset, adversary }: Props) {
  return (
    <div className="flex flex-col gap-6 flex-1">
      <h2 className="text-lg font-bold text-white">Step 3: Confirm & Launch</h2>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Simulation Warning</p>
          <p className="text-xs text-amber-500/80 mt-0.5">
            This simulation will generate real attack traffic against the selected asset. Ensure the target
            is authorized for testing and monitoring is active.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Target asset */}
        <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={14} className="text-brand" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Target Asset</p>
          </div>
          {asset ? (
            <div>
              <p className="text-white font-bold">{asset.name}</p>
              <p className="text-gray-400 text-sm">{asset.os}</p>
              <p className={`text-xs font-semibold mt-2 ${asset.status === "Online" ? "text-emerald-400" : "text-gray-500"}`}>
                ● {asset.status}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No asset selected</p>
          )}
        </div>

        {/* Adversary */}
        <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-red-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Adversary / TTP</p>
          </div>
          {adversary ? (
            <div>
              <p className="text-white font-bold">{adversary.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{adversary.severity} severity</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {adversary.ttps.map((ttp) => (
                  <span key={ttp} className="text-[10px] font-mono bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                    {ttp}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No adversary selected</p>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pre-launch Checklist</p>
        {[
          { label: "Target asset is reachable and online", ok: asset?.status === "Online" },
          { label: "Adversary TTP profile loaded", ok: !!adversary },
          { label: "Monitoring / SIEM is active (Ludus)", ok: true },
          { label: "Simulation authorized by administrator", ok: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm">
            <CheckCircle
              size={16}
              className={item.ok ? "text-emerald-400" : "text-gray-700"}
            />
            <span className={item.ok ? "text-gray-300" : "text-gray-600"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
