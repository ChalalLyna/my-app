"use client";

import { useState } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import HelpPanel from "@/app/components/HelpPanel";
import InvestigateModal from "@/app/components/detection/InvestigateModal";
import RuleTuningModal from "@/app/components/detection/RuleTuningModal";
import { MOCK_ALERTS, DetectionAlert } from "@/app/data/alerts";
import { DETECTION_HELP } from "@/app/config/helpContent";
import { useAuth } from "@/app/context/AuthContext";
import {
  ShieldOff, Sliders, Search, Filter,
  AlertTriangle, ChevronRight, Clock,
  Monitor, Hash, Eye, RefreshCw,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50",    dot: "bg-red-500"    },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50", dot: "bg-orange-500" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50", dot: "bg-yellow-500" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50",  dot: "bg-green-500"  },
};

const STATUS_STYLES: Record<string, string> = {
  New:           "text-blue-400 bg-blue-900/30 border border-blue-800/40",
  Investigating: "text-amber-400 bg-amber-900/30 border border-amber-800/40",
  Resolved:      "text-emerald-400 bg-emerald-900/30 border border-emerald-800/40",
};

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onRuleTuning }: { onRuleTuning: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
      <div className="w-20 h-20 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center">
        <ShieldOff size={36} className="text-gray-600" />
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-xl">Aucune alerte détectée</p>
        <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">
          Le SIEM n'a généré aucune alerte pour le moment. Lancez une simulation d'attaque
          pour voir des alertes apparaître ici.
        </p>
      </div>
      <button
        onClick={onRuleTuning}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-700 bg-gray-800/40 hover:bg-gray-800 text-sm font-semibold text-gray-300 hover:text-white transition-all"
      >
        <Sliders size={15} />
        Rule Tuning
      </button>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ alerts }: { alerts: DetectionAlert[] }) {
  const counts = {
    Critical: alerts.filter(a => a.severity === "Critical").length,
    High:     alerts.filter(a => a.severity === "High").length,
    Medium:   alerts.filter(a => a.severity === "Medium").length,
    Low:      alerts.filter(a => a.severity === "Low").length,
  };
  const newCount  = alerts.filter(a => a.status === "New").length;
  const invCount  = alerts.filter(a => a.status === "Investigating").length;

  return (
    <div className="grid grid-cols-6 gap-3 mb-6">
      {(["Critical","High","Medium","Low"] as const).map(sev => {
        const s = SEVERITY_STYLES[sev];
        return (
          <div key={sev} className={`bg-gray-900 border ${s.border} rounded-xl p-3`}>
            <p className={`text-xl font-bold ${s.text}`}>{counts[sev]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sev}</p>
          </div>
        );
      })}
      <div className="bg-gray-900 border border-blue-800/30 rounded-xl p-3">
        <p className="text-xl font-bold text-blue-400">{newCount}</p>
        <p className="text-xs text-gray-500 mt-0.5">New</p>
      </div>
      <div className="bg-gray-900 border border-amber-800/30 rounded-xl p-3">
        <p className="text-xl font-bold text-amber-400">{invCount}</p>
        <p className="text-xs text-gray-500 mt-0.5">Investigating</p>
      </div>
    </div>
  );
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({ alert, onInvestigate }: { alert: DetectionAlert; onInvestigate: () => void }) {
  const sev = SEVERITY_STYLES[alert.severity];
  const date = new Date(alert.timestamp).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group`}>
      {/* Severity dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />

      {/* Severity badge */}
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border w-16 text-center flex-shrink-0 ${sev.text} ${sev.bg} ${sev.border}`}>
        {alert.severity}
      </span>

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{alert.description}</p>
      </div>

      {/* TTP */}
      <div className="flex items-center gap-1.5 flex-shrink-0 w-28">
        <Hash size={11} className="text-gray-600" />
        <span className="text-xs font-mono text-brand">{alert.ttp}</span>
      </div>

      {/* Asset */}
      <div className="flex items-center gap-1.5 flex-shrink-0 w-32">
        <Monitor size={11} className="text-gray-600" />
        <span className="text-xs text-gray-400 truncate">{alert.asset}</span>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1.5 flex-shrink-0 w-28">
        <Clock size={11} className="text-gray-600" />
        <span className="text-xs text-gray-500">{date}</span>
      </div>

      {/* Status */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[alert.status]}`}>
        {alert.status}
      </span>

      {/* Investigate button */}
      <button
        onClick={onInvestigate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/30 text-brand text-xs font-semibold hover:bg-brand/20 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
      >
        <Eye size={12} />
        Investiguer
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Toggle this to test empty state vs alerts state
const HAS_ALERTS = false;

export default function DetectionPage() {
  const { user } = useAuth();
  const isApprenant = user?.role === "apprenant";

  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState<string>("All");
  const [investigateAlert, setInvestigateAlert] = useState<DetectionAlert | null>(null);
  const [showRuleTuning, setShowRuleTuning] = useState(false);

  const alerts = HAS_ALERTS ? MOCK_ALERTS : [];

  const filtered = alerts.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.asset.toLowerCase().includes(search.toLowerCase()) ||
                        a.ttp.toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSev === "All" || a.severity === filterSev;
    return matchSearch && matchSev;
  });

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col min-h-[calc(100vh-3.5rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Detection</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {alerts.length > 0
                ? `${alerts.length} alerte${alerts.length > 1 ? "s" : ""} générée${alerts.length > 1 ? "s" : ""} par vos simulations`
                : "Aucune alerte — lancez une simulation pour commencer"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <RefreshCw size={14} />
              Refresh
            </button>
            
          </div>
        </div>

        {alerts.length === 0 ? (
          <EmptyState onRuleTuning={() => setShowRuleTuning(true)} />
        ) : (
          <>
            {/* Stats */}
            <StatsBar alerts={alerts} />

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher une alerte, asset, TTP..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                />
              </div>

              {/* Severity filters */}
              <div className="flex items-center gap-1.5">
                {["All", "Critical", "High", "Medium", "Low"].map(sev => (
                  <button
                    key={sev}
                    onClick={() => setFilterSev(sev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterSev === sev
                        ? "bg-brand text-white shadow-sm shadow-brand/20"
                        : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Alerts table */}
            <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden flex-1">
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-800/60 bg-gray-900/80">
                <span className="w-2 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16">Sévérité</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex-1">Alerte</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-28">TTP</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-32">Asset</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-28">Heure</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-20">Statut</span>
                <span className="w-24 flex-shrink-0" />
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
                  Aucune alerte ne correspond à votre recherche.
                </div>
              ) : (
                filtered.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onInvestigate={() => setInvestigateAlert(alert)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {investigateAlert && (
        <InvestigateModal
          alert={investigateAlert}
          onClose={() => setInvestigateAlert(null)}
        />
      )}
      {showRuleTuning && (
        <RuleTuningModal onClose={() => setShowRuleTuning(false)} />
      )}

      {/* HelpPanel — apprenant uniquement */}
      {isApprenant && (
        <HelpPanel
          title="Guide — Détection & Alertes"
          sections={DETECTION_HELP}
        />
      )}
    </DashboardLayout>
  );
}
