"use client";

import { X, Sliders, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

const DEFAULT_RULES = [
  { id: "R001", name: "PowerShell Encoded Command", enabled: true,  threshold: 1  },
  { id: "R002", name: "SMB Lateral Movement",       enabled: true,  threshold: 3  },
  { id: "R003", name: "After-Hours Login",           enabled: true,  threshold: 1  },
  { id: "R004", name: "Phishing Link Click",         enabled: true,  threshold: 1  },
  { id: "R005", name: "Process Injection Detected",  enabled: false, threshold: 2  },
];

export default function RuleTuningModal({ onClose }: Props) {
  const [rules, setRules] = useState(DEFAULT_RULES);

  const toggleRule = (id: string) => {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  };

  const updateThreshold = (id: string, value: number) => {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, threshold: Math.max(1, value) } : rule));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-4 bg-gray-950 border border-gray-800/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Sliders size={15} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-bold">Rule Tuning</p>
              <p className="text-gray-500 text-xs">Gérer les règles de détection SIEM</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                rule.enabled
                  ? "bg-gray-900/60 border-gray-800/60"
                  : "bg-gray-900/20 border-gray-800/30 opacity-50"
              }`}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleRule(rule.id)}
                className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${
                  rule.enabled ? "bg-brand" : "bg-gray-700"
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  rule.enabled ? "left-4" : "left-0.5"
                }`} />
              </button>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{rule.name}</p>
                <p className="text-[10px] text-gray-600 font-mono">{rule.id}</p>
              </div>

              {/* Threshold */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">Seuil</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateThreshold(rule.id, rule.threshold - 1)}
                    className="w-5 h-5 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center text-xs transition-colors"
                  >−</button>
                  <span className="w-5 text-center text-sm font-bold text-white">{rule.threshold}</span>
                  <button
                    onClick={() => updateThreshold(rule.id, rule.threshold + 1)}
                    className="w-5 h-5 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center text-xs transition-colors"
                  >+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/60 flex-shrink-0">
          <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand transition-colors font-medium">
            <Plus size={14} />
            Nouvelle règle
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              Annuler
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
