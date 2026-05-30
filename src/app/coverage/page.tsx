"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { Shield, RefreshCw, CheckCircle2, Circle, MinusCircle, Search, X, Hash } from "lucide-react";

type TechniqueStatus = "tested" | "covered" | "not_covered";

interface TechniqueCoverage {
  idTechnique: number;
  mitreID:     string;
  nom:         string;
  tactique:    string;
  status:      TechniqueStatus;
}

interface CoverageData {
  techniques: TechniqueCoverage[];
  stats: {
    total:       number;
    tested:      number;
    covered:     number;
    not_covered: number;
  };
}

interface RuleDetail {
  wazuhRuleId: number;
  titre:       string | null;
  niveau:      number | null;
  severite:    string;
}

const SEVERITY_STYLE: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/20 border-red-800/40",
  High:     "text-orange-400 bg-orange-900/20 border-orange-800/40",
  Medium:   "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  Low:      "text-green-400 bg-green-900/20 border-green-800/40",
};

// ── Style par statut ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  tested: {
    label:  "Tested",
    bg:     "bg-emerald-900/40",
    border: "border-emerald-600/50",
    text:   "text-emerald-300",
    dot:    "bg-emerald-400",
    icon:   CheckCircle2,
    iconColor: "text-emerald-400",
  },
  covered: {
    label:  "Covered",
    bg:     "bg-amber-900/30",
    border: "border-amber-700/40",
    text:   "text-amber-300",
    dot:    "bg-amber-400",
    icon:   Circle,
    iconColor: "text-amber-400",
  },
  not_covered: {
    label:  "Not Covered",
    bg:     "bg-gray-800/30",
    border: "border-gray-700/30",
    text:   "text-gray-500",
    dot:    "bg-gray-600",
    icon:   MinusCircle,
    iconColor: "text-gray-600",
  },
} as const;

// ── Modal règles ──────────────────────────────────────────────────────────────
function RulesModal({
  technique, onClose,
}: {
  technique: TechniqueCoverage;
  onClose: () => void;
}) {
  const [rules, setRules]     = useState<RuleDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const cfg = STATUS_CONFIG[technique.status];

  useEffect(() => {
    fetch(`/api/coverage/${technique.idTechnique}`)
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .finally(() => setLoading(false));
  }, [technique.idTechnique]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700/60 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-indigo-400">{technique.mitreID}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                {cfg.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">{technique.nom}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{technique.tactique}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Rules list */}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Wazuh Rules Covering This Technique
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
              <RefreshCw size={14} className="animate-spin" />
              Loading rules…
            </div>
          )}

          {!loading && rules.length === 0 && (
            <p className="text-gray-600 text-sm italic py-4">No rules found for this technique.</p>
          )}

          {!loading && rules.length > 0 && (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto
                            [&::-webkit-scrollbar]:w-1.5
                            [&::-webkit-scrollbar-thumb]:bg-gray-700
                            [&::-webkit-scrollbar-thumb]:rounded-full">
              {rules.map((r) => (
                <div
                  key={r.wazuhRuleId}
                  className="flex items-start justify-between gap-3 px-3 py-2.5
                             rounded-lg bg-gray-800/40 border border-gray-700/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Hash size={12} className="text-gray-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-400 shrink-0">Rule {r.wazuhRuleId}</p>
                      <p className="text-xs text-gray-300 truncate mt-0.5">
                        {r.titre ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.niveau !== null && (
                      <span className="text-[10px] text-gray-600 font-mono">lvl {r.niveau}</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium
                                     ${SEVERITY_STYLE[r.severite] ?? SEVERITY_STYLE.Low}`}>
                      {r.severite}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <p className="text-[10px] text-gray-600 mt-3">
              {rules.length} rule{rules.length !== 1 ? "s" : ""} covering this technique
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Carte technique ───────────────────────────────────────────────────────────
function TechniqueCard({ t, onClick }: { t: TechniqueCoverage; onClick: () => void }) {
  const cfg = STATUS_CONFIG[t.status];
  return (
    <div
      onClick={onClick}
      title={`${t.mitreID} — ${t.nom}`}
      className={`
        group relative rounded-lg border px-2.5 py-2 cursor-pointer
        transition-all duration-150 hover:scale-[1.03] hover:z-10 hover:ring-1 hover:ring-white/10
        ${cfg.bg} ${cfg.border}
      `}
    >
      <p className="font-mono text-[10px] text-gray-500 leading-none mb-0.5">{t.mitreID}</p>
      <p className={`text-[11px] font-medium leading-tight truncate ${cfg.text}`}>{t.nom}</p>
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
                      hidden group-hover:flex flex-col items-center">
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white
                        whitespace-nowrap shadow-xl max-w-64">
          <p className="font-mono text-indigo-300 mb-0.5">{t.mitreID}</p>
          <p className="text-gray-200 font-medium">{t.nom}</p>
          <p className={`mt-1 text-[10px] flex items-center gap-1 ${cfg.iconColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </p>
        </div>
        <div className="w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45 -mt-1" />
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function CoveragePage() {
  const [data, setData]       = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<TechniqueStatus | "all">("all");
  const [tacticFilter, setTactic]     = useState("all");
  const [selected, setSelected]       = useState<TechniqueCoverage | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coverage");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Grouper par tactique ──────────────────────────────────────────────────
  const allTactics = useMemo(
    () => data ? [...new Set(data.techniques.map((t) => t.tactique))].sort() : [],
    [data]
  );

  const grouped = useMemo(() => {
    if (!data) return {};
    const q = search.toLowerCase();
    const filtered = data.techniques.filter((t) => {
      const matchSearch = !q || t.mitreID.toLowerCase().includes(q) || t.nom.toLowerCase().includes(q);
      const matchFilter = filter === "all" || t.status === filter;
      const matchTactic = tacticFilter === "all" || t.tactique === tacticFilter;
      return matchSearch && matchFilter && matchTactic;
    });
    return filtered.reduce<Record<string, TechniqueCoverage[]>>((acc, t) => {
      const tactic = t.tactique || "Unknown";
      if (!acc[tactic]) acc[tactic] = [];
      acc[tactic].push(t);
      return acc;
    }, {});
  }, [data, search, filter]);

  const tactics = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 min-h-0">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-900/30 border border-indigo-700/40">
              <Shield size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Detection Coverage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                MITRE ATT&amp;CK techniques — coverage status across all simulations
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-700/60
                       border border-gray-700/50 text-gray-400 hover:text-white text-xs transition-all
                       disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Techniques", value: data.stats.total,       color: "text-white",         bg: "bg-gray-800/40",    border: "border-gray-700/50" },
              { label: "Tested",           value: data.stats.tested,      color: "text-emerald-400",   bg: "bg-emerald-900/20", border: "border-emerald-800/40" },
              { label: "Covered",          value: data.stats.covered,     color: "text-amber-400",     bg: "bg-amber-900/20",   border: "border-amber-800/40" },
              { label: "Not Covered",      value: data.stats.not_covered, color: "text-gray-500",      bg: "bg-gray-800/30",    border: "border-gray-700/30" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                {s.label !== "Total Techniques" && data.stats.total > 0 && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    {Math.round((s.value / data.stats.total) * 100)}% of total
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legend + Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-5">
            {(["tested", "covered", "not_covered"] as TechniqueStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-2.5 h-2.5 rounded-sm ${cfg.dot}`} />
                  {cfg.label}
                </div>
              );
            })}
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search technique…"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50
                           text-xs text-gray-300 placeholder-gray-600 focus:outline-none
                           focus:border-indigo-600/60 w-44"
              />
            </div>
            <select
              value={tacticFilter}
              onChange={(e) => setTactic(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50
                         text-xs text-gray-300 focus:outline-none focus:border-indigo-600/60"
            >
              <option value="all">All tactics</option>
              {allTactics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50
                         text-xs text-gray-300 focus:outline-none focus:border-indigo-600/60"
            >
              <option value="all">All statuses</option>
              <option value="tested">Tested</option>
              <option value="covered">Covered</option>
              <option value="not_covered">Not Covered</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Loading coverage data…
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && tactics.length === 0 && (
          <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
            No techniques match your filters.
          </div>
        )}

        {/* Matrix by tactic */}
        {!loading && !error && (
          <div className="flex flex-col gap-6 overflow-y-auto">
            {tactics.map((tactic) => {
              const techs = grouped[tactic];
              const testedCount  = techs.filter((t) => t.status === "tested").length;
              const coveredCount = techs.filter((t) => t.status === "covered").length;
              const pct = Math.round(((testedCount + coveredCount) / techs.length) * 100);

              return (
                <div key={tactic} className="rounded-xl border border-gray-700/40 bg-gray-800/20 overflow-hidden">
                  {/* Tactic header */}
                  <div className="flex items-center justify-between px-4 py-3
                                  bg-gray-800/50 border-b border-gray-700/40">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-semibold text-white">{tactic}</h2>
                      <span className="text-xs text-gray-500">{techs.length} technique{techs.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-400 font-semibold">{testedCount}</span>
                        <span className="text-gray-600">tested</span>
                        <span className="text-gray-700 mx-1">·</span>
                        <span className="text-amber-400 font-semibold">{coveredCount}</span>
                        <span className="text-gray-600">covered</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-24 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  </div>

                  {/* Techniques grid */}
                  <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                    {techs.map((t) => <TechniqueCard key={t.idTechnique} t={t} onClick={() => setSelected(t)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <RulesModal
          technique={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </DashboardLayout>
  );
}
