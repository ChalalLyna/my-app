"use client";

import React from "react";
import { X, Terminal, Shield, Clock, Monitor, Hash, Wifi, RefreshCw, Tag, Server } from "lucide-react";
import { DetectionAlert } from "@/app/data/alerts";

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50" },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50" },
};

interface Props {
  alert: DetectionAlert;
  onClose: () => void;
}

export default function InvestigateModal({ alert, onClose }: Props) {
  const sev = SEVERITY_STYLES[alert.severity];
  const date = new Date(alert.timestamp).toLocaleString("fr-FR");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-gray-950 border border-gray-800/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800/60 shrink-0">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${sev.text} ${sev.bg} ${sev.border}`}>
              {alert.severity}
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">{alert.title}</p>
              <p className="text-gray-500 text-xs mt-0.5 font-mono">{alert.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Meta grid — all available fields */}
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { icon: Monitor,   label: "Agent",          value: alert.asset },
              { icon: Wifi,      label: "Agent IP",        value: alert.agentIp ?? "—" },
              { icon: Hash,      label: "Rule ID",         value: alert.ttp },
              { icon: Tag,       label: "Catégories",      value: alert.ttpName || "—" },
              { icon: Shield,    label: "Niveau",          value: alert.ruleLevel != null ? `Level ${alert.ruleLevel}` : "—" },
              { icon: RefreshCw, label: "Déclenchements",  value: alert.ruleFiredTimes != null ? `${alert.ruleFiredTimes}×` : "—" },
              { icon: Clock,     label: "Timestamp",       value: date },
              { icon: Server,    label: "Décodeur",        value: alert.source },
            ] as { icon: React.ElementType; label: string; value: string }[]).map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className="text-gray-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{label}</p>
                </div>
                <p className="text-xs text-gray-300 font-medium leading-snug break-all">{value}</p>
              </div>
            ))}
          </div>

          {/* Agent ID if available */}
          {alert.agentId && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold uppercase tracking-widest">Agent ID</span>
              <span className="font-mono text-gray-400">{alert.agentId}</span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Statut</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              alert.status === "New"           ? "bg-blue-900/30 text-blue-400 border border-blue-800/40" :
              alert.status === "Investigating" ? "bg-amber-900/30 text-amber-400 border border-amber-800/40" :
                                                "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
            }`}>
              {alert.status}
            </span>
          </div>

          {/* Raw log */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={13} className="text-gray-600" />
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600">Raw Log</p>
            </div>
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 font-mono text-[11px] text-emerald-400/80 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {alert.rawLog}
            </div>
          </div>

          {/* Investigation note */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">Note d'investigation</p>
            <textarea
              rows={3}
              placeholder="Ajoutez vos observations ici..."
              className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/60 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Fermer
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-700/40 text-amber-400 hover:bg-amber-600/30 text-sm font-semibold transition-colors">
              Marquer "Investigating"
            </button>
            <button className="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-600/30 text-sm font-semibold transition-colors">
              Résoudre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
