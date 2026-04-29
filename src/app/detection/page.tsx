"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import InvestigateModal from "@/app/components/detection/InvestigateModal";
import { DetectionAlert } from "@/app/data/alerts";
import {
  Shield, AlertTriangle, Activity, RefreshCw, Sliders,
  Search, Monitor, Clock, Hash,
} from "lucide-react";

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50"    },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50"  },
};

export default function DetectionPage() {
  const router = useRouter();

  const [alerts, setAlerts] = useState<DetectionAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // undefined = localStorage not yet read, null = no timestamp, string = has timestamp
  const [launchTimestamp, setLaunchTimestamp] = useState<string | null | undefined>(undefined);
  const [selectedAlert, setSelectedAlert] = useState<DetectionAlert | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    const ts = localStorage.getItem("cyberlab_attack_launch");
    setLaunchTimestamp(ts ?? null);
  }, []);

  const fetchAlerts = useCallback(async (since: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/wazuh/alerts?since=${encodeURIComponent(since)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAlerts(data);
      setLastFetch(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (launchTimestamp) {
      fetchAlerts(launchTimestamp);
    }
  }, [launchTimestamp, fetchAlerts]);

  const filteredAlerts = alerts.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      a.title.toLowerCase().includes(q) ||
      a.asset.toLowerCase().includes(q) ||
      a.ttp.toLowerCase().includes(q);
    const matchSev = severityFilter === "all" || a.severity === severityFilter;
    return matchSearch && matchSev;
  });

  // Still reading localStorage
  if (launchTimestamp === undefined) return null;

  // No attack launched yet
  if (!launchTimestamp) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="flex flex-col items-center gap-5 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-800/60 flex items-center justify-center">
              <Shield size={28} className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Aucune alerte pour le moment</h2>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Aucune simulation d'attaque n'a encore été lancée. Les alertes Wazuh apparaîtront ici après une simulation.
              </p>
            </div>
            <button
              onClick={() => router.push("/detection/rule-tuning")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
            >
              <Sliders size={15} />
              Rule Tuning
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const critCount  = alerts.filter(a => a.severity === "Critical").length;
  const highCount  = alerts.filter(a => a.severity === "High").length;
  const agentCount = new Set(alerts.map(a => a.asset)).size;

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col min-h-[calc(100vh-3.5rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Activity size={20} className="text-brand" />
              Detection
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Alertes depuis le {new Date(launchTimestamp).toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-xs text-gray-600">
                Mis à jour : {lastFetch.toLocaleTimeString("fr-FR")}
              </span>
            )}
            <button
              onClick={() => fetchAlerts(launchTimestamp)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-700 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
            <button
              onClick={() => router.push("/detection/rule-tuning")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
            >
              <Sliders size={14} />
              Rule Tuning
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total alertes",  value: alerts.length, color: "text-white",       border: "border-gray-800"       },
            { label: "Critical",       value: critCount,     color: "text-red-400",     border: "border-red-900/40"     },
            { label: "High",           value: highCount,     color: "text-orange-400",  border: "border-orange-900/40"  },
            { label: "Agents touchés", value: agentCount,    color: "text-brand",       border: "border-brand/20"       },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col">

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-3 bg-red-900/20 border-b border-red-800/40 shrink-0">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">Erreur Wazuh : {error}</p>
              <button
                onClick={() => fetchAlerts(launchTimestamp)}
                className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Initial loading */}
          {loading && alerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center gap-3 text-gray-500">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Chargement des alertes Wazuh...</span>
            </div>

          /* Empty state — attack launched but no alerts yet */
          ) : !loading && alerts.length === 0 && !error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gray-800/60 border border-gray-800/60 flex items-center justify-center">
                <Shield size={24} className="text-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Aucune alerte pour le moment</p>
                <p className="text-gray-500 text-sm mt-1">
                  Aucune alerte Wazuh n'a été générée depuis le lancement de la simulation.
                </p>
              </div>
              <button
                onClick={() => router.push("/detection/rule-tuning")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
              >
                <Sliders size={15} />
                Rule Tuning
              </button>
            </div>

          /* Alert list */
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une alerte, asset, règle..."
                    className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(["all","Critical","High","Medium","Low"] as const).map(f => {
                    const sev = f !== "all" ? SEVERITY_STYLES[f] : null;
                    return (
                      <button
                        key={f}
                        onClick={() => setSeverityFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          severityFilter === f
                            ? f === "all"
                              ? "bg-brand text-white"
                              : `${sev!.text} ${sev!.bg} ${sev!.border} border`
                            : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                        }`}
                      >
                        {f === "all" ? "Toutes" : f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-800/40 bg-gray-900/60 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-20 shrink-0">Sévérité</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex-1">Alerte</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-32 shrink-0">Agent</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-24 shrink-0">Règle</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-36 shrink-0">Timestamp</span>
                <span className="w-24 shrink-0" />
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-600">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-sm">Actualisation...</span>
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                    <Shield size={28} className="text-gray-700" />
                    <p className="text-sm">Aucune alerte correspondant aux filtres</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => {
                    const sev = SEVERITY_STYLES[alert.severity];
                    const date = new Date(alert.timestamp).toLocaleString("fr-FR");
                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className="flex items-center gap-4 px-5 py-4 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group cursor-pointer"
                      >
                        <div className="w-20 shrink-0">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sev.text} ${sev.bg} ${sev.border}`}>
                            {alert.severity}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{alert.source}</p>
                        </div>

                        <div className="w-32 shrink-0 flex items-center gap-1.5">
                          <Monitor size={11} className="text-gray-600 shrink-0" />
                          <span className="text-xs text-gray-300 truncate">{alert.asset}</span>
                        </div>

                        <div className="w-24 shrink-0 flex items-center gap-1.5">
                          <Hash size={11} className="text-gray-600 shrink-0" />
                          <span className="text-xs font-mono text-brand truncate">{alert.ttp}</span>
                        </div>

                        <div className="w-36 shrink-0 flex items-center gap-1.5">
                          <Clock size={11} className="text-gray-600 shrink-0" />
                          <span className="text-xs text-gray-400">{date}</span>
                        </div>

                        <div className="w-24 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-all">
                            Investiguer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedAlert && (
        <InvestigateModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </DashboardLayout>
  );
}
