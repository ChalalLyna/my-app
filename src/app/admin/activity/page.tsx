"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import {
  Crosshair, X, FileText, ChevronDown, ChevronUp,
  Shield, Monitor, Filter, Calendar, Search,
  ClipboardList, Flag, CheckCircle, Construction,
  User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attack {
  id:                  number;
  dateExecution:       string | null;
  statut:              string;
  type:                string;
  mitreID:             string;
  techniqueName:       string;
  tactique:            string;
  actifNom:            string;
  actifCategorie:      string;
  actifIP:             string;
  actifOS:             string;
  resultatDescription: string;
  rapport:             string | null;
  userNom:             string;
  userPrenom:          string;
  userRole:            string;
}

interface Filters {
  search:   string;
  role:     string;
  tactique: string;
  dateFrom: string;
  dateTo:   string;
}

type Tab = "all" | "attacks" | "rule-tuning" | "missions" | "validations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<string, string> = {
  success:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed:     "text-red-400    bg-red-500/10    border-red-500/20",
  running:    "text-amber-400  bg-amber-500/10  border-amber-500/20",
  terminee:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "terminé":  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "terminée": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "en cours": "text-amber-400  bg-amber-500/10  border-amber-500/20",
  "stoppé":   "text-red-400    bg-red-500/10    border-red-500/20",
  "stoppée":  "text-red-400    bg-red-500/10    border-red-500/20",
  "stopé":    "text-red-400    bg-red-500/10    border-red-500/20",
  "arrêté":   "text-red-400    bg-red-500/10    border-red-500/20",
};

const ROLE_STYLE: Record<string, string> = {
  apprenant:  "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  consultant: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  admin:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function userName(a: Attack) {
  return [a.userPrenom, a.userNom].filter(Boolean).join(" ") || "—";
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({ attack, onClose }: { attack: Attack; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                {attack.mitreID}
              </span>
              <span className="text-xs text-gray-500">{attack.tactique}</span>
            </div>
            <h2 className="text-sm font-bold text-white">{attack.techniqueName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmt(attack.dateExecution)} · {attack.actifNom} · {userName(attack)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {attack.resultatDescription && (
          <div className="px-6 py-3 border-b border-gray-800/60 bg-gray-900/40">
            <p className="text-xs text-gray-400 leading-relaxed">{attack.resultatDescription}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {attack.rapport ? (
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed bg-gray-900 border border-gray-800 rounded-xl p-4">
              {attack.rapport}
            </pre>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">No report available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attack Row ───────────────────────────────────────────────────────────────

function AttackRow({ attack, onReport }: { attack: Attack; onReport: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const statutStyle = STATUT_STYLE[attack.statut] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";
  const roleStyle   = ROLE_STYLE[attack.userRole]  ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";

  return (
    <>
      <tr
        className="border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Date */}
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {fmt(attack.dateExecution)}
        </td>

        {/* User */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
              <User size={10} className="text-gray-500" />
            </div>
            <div>
              <div className="text-xs text-white font-medium">{userName(attack)}</div>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${roleStyle}`}>
                {attack.userRole}
              </span>
            </div>
          </div>
        </td>

        {/* Technique */}
        <td className="px-4 py-3 max-w-xs">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
              {attack.mitreID}
            </span>
            <span className="text-xs text-white font-medium leading-relaxed">{attack.techniqueName}</span>
          </div>
        </td>

        {/* Tactic */}
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
          {attack.tactique}
        </td>

        {/* Asset */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="text-xs text-white">{attack.actifNom}</div>
          <div className="text-[10px] text-gray-600 font-mono">{attack.actifIP}</div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statutStyle}`}>
            {attack.statut}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {attack.rapport?.trim() && (
              <button
                onClick={onReport}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg transition-colors"
              >
                <FileText size={11} />
                Report
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-800/50 bg-gray-900/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Monitor size={10} /> System
                </p>
                <p className="text-xs text-gray-300">{attack.actifOS || "—"}</p>
                <p className="text-[10px] font-mono text-gray-500">{attack.actifIP}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Asset category</p>
                <p className="text-xs text-gray-300">{attack.actifCategorie || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Attack type</p>
                <p className="text-xs text-gray-300">{attack.type || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText size={10} /> Result
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{attack.resultatDescription || "—"}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Filters Bar ──────────────────────────────────────────────────────────────

function FiltersBar({
  attacks, filters, onChange,
}: {
  attacks: Attack[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const tactiques = useMemo(() => [...new Set(attacks.map((a) => a.tactique))].filter(Boolean).sort(), [attacks]);
  const roles     = useMemo(() => [...new Set(attacks.map((a) => a.userRole))].filter(Boolean).sort(),  [attacks]);
  const set = (key: keyof Filters, val: string) => onChange({ ...filters, [key]: val });
  const hasFilter = filters.search || filters.role || filters.tactique || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          type="text"
          placeholder="Search technique or user…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="relative">
        <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <select
          value={filters.role}
          onChange={(e) => set("role", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
        >
          <option value="">All roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="relative">
        <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <select
          value={filters.tactique}
          onChange={(e) => set("tactique", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
        >
          <option value="">All tactics</option>
          {tactiques.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="relative">
        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
        />
      </div>

      <div className="relative">
        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
        />
      </div>

      {hasFilter && (
        <button
          onClick={() => onChange({ search: "", role: "", tactique: "", dateFrom: "", dateTo: "" })}
          className="text-[10px] text-gray-500 hover:text-white transition-colors underline"
        >
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Attacks Table ────────────────────────────────────────────────────────────

function AttacksTable({ attacks, loading }: { attacks: Attack[]; loading: boolean }) {
  const [filters, setFilters] = useState<Filters>({ search: "", role: "", tactique: "", dateFrom: "", dateTo: "" });
  const [reportAttack, setReportAttack] = useState<Attack | null>(null);

  const filtered = useMemo(() => {
    return attacks.filter((a) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !a.techniqueName.toLowerCase().includes(q) &&
          !a.mitreID.toLowerCase().includes(q) &&
          !userName(a).toLowerCase().includes(q)
        ) return false;
      }
      if (filters.role     && a.userRole !== filters.role)       return false;
      if (filters.tactique && a.tactique  !== filters.tactique)  return false;
      if (filters.dateFrom && a.dateExecution && a.dateExecution < filters.dateFrom) return false;
      if (filters.dateTo   && a.dateExecution && a.dateExecution > filters.dateTo)   return false;
      return true;
    });
  }, [attacks, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FiltersBar attacks={attacks} filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Crosshair size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No attacks found</p>
        </div>
      ) : (
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Technique</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Tactic</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Asset</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <AttackRow key={a.id} attack={a} onReport={() => setReportAttack(a)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-800/60 text-[10px] text-gray-600">
            {filtered.length} attack{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== attacks.length && ` (${attacks.length} total)`}
          </div>
        </div>
      )}

      {reportAttack && (
        <ReportModal attack={reportAttack} onClose={() => setReportAttack(null)} />
      )}
    </div>
  );
}

// ─── Not Implemented Placeholder ──────────────────────────────────────────────

function NotImplemented({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-700">
      <Construction size={36} className="mb-4 opacity-40" />
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-xs text-gray-700 mt-1">This section is not implemented yet.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "all",          label: "All",          icon: <ClipboardList size={13} /> },
  { id: "attacks",      label: "Attacks",      icon: <Crosshair size={13} />    },
  { id: "rule-tuning",  label: "Rule Tuning",  icon: <Shield size={13} />       },
  { id: "missions",     label: "Missions",     icon: <Flag size={13} />         },
  { id: "validations",  label: "Validations",  icon: <CheckCircle size={13} />  },
];

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [attacks, setAttacks]     = useState<Attack[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const fetchAttacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attacks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAttacks(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttacks(); }, [fetchAttacks]);

  const showAttacks = activeTab === "all" || activeTab === "attacks";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Activity</h1>
          <p className="text-xs text-gray-500 mt-0.5">Full history of all actions performed on the platform</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/60 border border-gray-800/60 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {error ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            Error loading data: {error}
          </div>
        ) : showAttacks ? (
          <AttacksTable attacks={attacks} loading={loading} />
        ) : activeTab === "rule-tuning" ? (
          <NotImplemented label="Rule Tuning History" />
        ) : activeTab === "missions" ? (
          <NotImplemented label="Mission History" />
        ) : (
          <NotImplemented label="Validation History" />
        )}
      </div>
    </DashboardLayout>
  );
}
