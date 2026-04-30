"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Shield, Hash, Tag, FileCode, ChevronRight,
  Sliders, Loader2, AlertTriangle,
} from "lucide-react";
import { DetectionAlert } from "@/app/data/alerts";

interface WazuhRuleDetail {
  id: string;
  description: string;
  level: number;
  severity: string;
  status: string;
  groups: string[];
  filename: string;
  xml: string | null;
}

interface Props {
  alert: DetectionAlert;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50"    },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50"  },
};

export default function RuleModal({ alert, onClose }: Props) {
  const router = useRouter();
  // alert.ttp format: "R:1234"
  const ruleId = alert.ttp.replace(/^R:/, "");

  const [detail, setDetail]     = useState<WazuhRuleDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showXml, setShowXml]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`/api/wazuh/rules/${encodeURIComponent(ruleId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setDetail(data);
      } catch (err: any) {
        setApiError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [ruleId]);

  // Fallback to alert data when Manager API is unavailable
  const info: WazuhRuleDetail = detail ?? {
    id:          ruleId,
    description: alert.description,
    level:       alert.ruleLevel ?? 0,
    severity:    alert.severity,
    status:      "active",
    groups:      alert.ttpName ? alert.ttpName.split(", ").filter(Boolean) : [],
    filename:    "—",
    xml:         null,
  };

  const sev = SEVERITY_STYLES[info.severity] ?? SEVERITY_STYLES.Medium;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl mx-4 bg-gray-950 border border-gray-800/60 rounded-2xl shadow-2xl shadow-black/60 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand/15 rounded-xl flex items-center justify-center">
              <Shield size={16} className="text-brand" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Règle Wazuh</p>
              <p className="text-gray-500 text-xs font-mono mt-0.5">ID : {ruleId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {loading && (
            <div className="flex items-center gap-2 py-3 text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Chargement depuis Wazuh Manager...</span>
            </div>
          )}

          {!loading && apiError && (
            <div className="flex items-start gap-2 p-3 bg-amber-900/15 border border-amber-800/30 rounded-xl">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-500/80">
                Manager API indisponible — données partielles depuis l'alerte
              </p>
            </div>
          )}

          {/* Severity + status */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${sev.text} ${sev.bg} ${sev.border}`}>
              {info.severity}
            </span>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${
              info.status === "active"
                ? "text-emerald-400 bg-emerald-900/20 border-emerald-800/50"
                : "text-gray-500 bg-gray-800/30 border-gray-700/50"
            }`}>
              {info.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { icon: Hash,     label: "Rule ID",       value: info.id },
              { icon: Shield,   label: "Niveau Wazuh",  value: `Level ${info.level}` },
              { icon: Tag,      label: "Groupes",       value: info.groups.length > 0 ? info.groups.join(", ") : "—" },
              { icon: FileCode, label: "Fichier règle", value: info.filename || "—" },
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

          {/* Description */}
          <div className="bg-gray-900 border border-gray-800/50 rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">{info.description || "—"}</p>
          </div>

          {/* XML (expandable) */}
          {info.xml && (
            <div>
              <button
                onClick={() => setShowXml(v => !v)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
              >
                <FileCode size={12} />
                {showXml ? "Masquer" : "Voir"} le XML de la règle
                <ChevronRight size={12} className={`transition-transform ${showXml ? "rotate-90" : ""}`} />
              </button>
              {showXml && (
                <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4 font-mono text-[11px] text-emerald-400/80 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
                  {info.xml}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/60 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={() => {
              onClose();
              router.push(`/detection/rule-tuning?search=${encodeURIComponent(ruleId)}`);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
          >
            <Sliders size={14} />
            Rule Tuning
          </button>
        </div>
      </div>
    </div>
  );
}
