"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import {
  Crosshair, X, FileText, ChevronDown, ChevronUp,
  Shield, Monitor, Filter, Calendar, Search,
  ClipboardList, Flag, CheckCircle, Construction,
  User, GraduationCap, Download, MessageSquare,
  CheckCircle2, XCircle,
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

interface RuleTuningEntry {
  id:             number;
  ruleName:       string;
  filename:       string | null;
  action:         "create" | "modify";
  status:         "pending" | "approved" | "rejected";
  dateCreation:   string;
  dateRevision:   string | null;
  commentaire:    string | null;
  xml:            string | null;
  severite:       string | null;
  wazuhRuleId:    number | null;
  apprenantName:  string;
  consultantName: string | null;
}

interface ValidationEntry {
  id:             number;
  ruleName:       string;
  filename:       string | null;
  action:         "create" | "modify";
  status:         "approved" | "rejected";
  dateCreation:   string;
  dateRevision:   string;
  commentaire:    string | null;
  xml:            string | null;
  severite:       string | null;
  apprenantName:  string;
  consultantName: string;
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

const REVIEW_STATUS_STYLE: Record<string, string> = {
  pending:  "text-amber-400   bg-amber-500/10   border-amber-500/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-red-400     bg-red-500/10     border-red-500/20",
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending:  "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const ROLE_STYLE: Record<string, string> = {
  apprenant:  "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  consultant: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  admin:      "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function userName(a: Attack) {
  return [a.userPrenom, a.userNom].filter(Boolean).join(" ") || "—";
}

// ─── XML Preview Modal ────────────────────────────────────────────────────────

function XmlModal({ title, xml, onClose }: { title: string; xml: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-gray-500" />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed bg-gray-900 border border-gray-800 rounded-xl p-4">
            {xml || "—"}
          </pre>
        </div>
      </div>
    </div>
  );
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
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {fmt(attack.dateExecution)}
        </td>
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
        <td className="px-4 py-3 max-w-xs">
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
              {attack.mitreID}
            </span>
            <span className="text-xs text-white font-medium leading-relaxed">{attack.techniqueName}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
          {attack.tactique}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="text-xs text-white">{attack.actifNom}</div>
          <div className="text-[10px] text-gray-600 font-mono">{attack.actifIP}</div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statutStyle}`}>
            {attack.statut}
          </span>
        </td>
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
        <input type="date" value={filters.dateFrom} onChange={(e) => set("dateFrom", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer" />
      </div>
      <div className="relative">
        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input type="date" value={filters.dateTo} onChange={(e) => set("dateTo", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer" />
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

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Loading…</div>;

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
      {reportAttack && <ReportModal attack={reportAttack} onClose={() => setReportAttack(null)} />}
    </div>
  );
}

// ─── Rule Tuning Row ──────────────────────────────────────────────────────────

function RuleTuningRow({ entry, onXml }: { entry: RuleTuningEntry; onXml: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = REVIEW_STATUS_STYLE[entry.status] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";

  return (
    <>
      <tr
        className="border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {fmt(entry.dateCreation)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
              <GraduationCap size={10} className="text-indigo-400" />
            </div>
            <span className="text-xs text-white font-medium">{entry.apprenantName}</span>
          </div>
        </td>
        <td className="px-4 py-3 max-w-xs">
          <p className="text-xs text-white font-medium truncate">{entry.ruleName}</p>
          {entry.filename && (
            <p className="text-[10px] text-gray-600 font-mono truncate mt-0.5">{entry.filename}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            entry.action === "create"
              ? "text-green-400 bg-green-500/10 border-green-500/20"
              : "text-blue-400 bg-blue-500/10 border-blue-500/20"
          }`}>
            {entry.action === "create" ? "Création" : "Modification"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle}`}>
            {REVIEW_STATUS_LABEL[entry.status] ?? entry.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {entry.xml && (
              <button
                onClick={onXml}
                className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand/80 bg-brand/10 hover:bg-brand/20 px-2 py-1 rounded-lg transition-colors"
              >
                <Download size={11} />
                XML
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-800/50 bg-gray-900/20">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sévérité</p>
                <p className="text-xs text-gray-300 capitalize">{entry.severite || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Wazuh ID</p>
                <p className="text-xs font-mono text-gray-300">{entry.wazuhRuleId ? `#${entry.wazuhRuleId}` : "—"}</p>
              </div>
              {entry.status !== "pending" && (
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Révisé par</p>
                  <p className="text-xs text-gray-300">{entry.consultantName || "—"}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{fmt(entry.dateRevision)}</p>
                </div>
              )}
              {entry.commentaire && (
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MessageSquare size={9} /> Commentaire
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">{entry.commentaire}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Rule Tuning Table ────────────────────────────────────────────────────────

function RuleTuningTable({ entries, loading }: { entries: RuleTuningEntry[]; loading: boolean }) {
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [xmlEntry, setXmlEntry] = useState<RuleTuningEntry | null>(null);

  const filtered = useMemo(() => entries.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.ruleName.toLowerCase().includes(q) && !e.apprenantName.toLowerCase().includes(q)) return false;
    }
    if (status && e.status !== status) return false;
    return true;
  }), [entries, search, status]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Rechercher par règle ou apprenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <Shield size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune soumission trouvée</p>
        </div>
      ) : (
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date soumission</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Règle</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <RuleTuningRow key={e.id} entry={e} onXml={() => setXmlEntry(e)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-800/60 text-[10px] text-gray-600">
            {filtered.length} soumission{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== entries.length && ` (${entries.length} au total)`}
          </div>
        </div>
      )}

      {xmlEntry && (
        <XmlModal title={xmlEntry.ruleName} xml={xmlEntry.xml ?? ""} onClose={() => setXmlEntry(null)} />
      )}
    </div>
  );
}

// ─── Validation Row ───────────────────────────────────────────────────────────

function ValidationRow({ entry, onXml }: { entry: ValidationEntry; onXml: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-gray-800/50 hover:bg-gray-900/40 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
          {fmt(entry.dateRevision)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
              <User size={10} className="text-violet-400" />
            </div>
            <span className="text-xs text-white font-medium">{entry.consultantName}</span>
          </div>
        </td>
        <td className="px-4 py-3 max-w-xs">
          <p className="text-xs text-white font-medium truncate">{entry.ruleName}</p>
          {entry.filename && (
            <p className="text-[10px] text-gray-600 font-mono truncate mt-0.5">{entry.filename}</p>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <GraduationCap size={11} className="text-gray-600" />
            {entry.apprenantName}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {entry.status === "approved"
              ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              : <XCircle      size={13} className="text-red-400 shrink-0" />
            }
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${REVIEW_STATUS_STYLE[entry.status]}`}>
              {REVIEW_STATUS_LABEL[entry.status]}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
          {entry.commentaire
            ? <span className="truncate block max-w-[200px]">{entry.commentaire}</span>
            : <span className="text-gray-700">—</span>
          }
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {entry.xml && (
              <button
                onClick={onXml}
                className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:text-brand/80 bg-brand/10 hover:bg-brand/20 px-2 py-1 rounded-lg transition-colors"
              >
                <Download size={11} />
                XML
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && entry.commentaire && (
        <tr className="border-b border-gray-800/50 bg-gray-900/20">
          <td colSpan={7} className="px-4 py-4">
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${
              entry.status === "approved"
                ? "bg-emerald-900/10 border-emerald-800/30"
                : "bg-red-900/10 border-red-800/30"
            }`}>
              <MessageSquare size={13} className={entry.status === "approved" ? "text-emerald-400 shrink-0 mt-0.5" : "text-red-400 shrink-0 mt-0.5"} />
              <div>
                <p className={`text-xs font-semibold mb-1 ${entry.status === "approved" ? "text-emerald-400" : "text-red-400"}`}>
                  Commentaire de {entry.consultantName}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">{entry.commentaire}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Validations Table ────────────────────────────────────────────────────────

function ValidationsTable({ entries, loading }: { entries: ValidationEntry[]; loading: boolean }) {
  const [search, setSearch]   = useState("");
  const [decision, setDecision] = useState("");
  const [xmlEntry, setXmlEntry] = useState<ValidationEntry | null>(null);

  const filtered = useMemo(() => entries.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.ruleName.toLowerCase().includes(q) && !e.apprenantName.toLowerCase().includes(q) && !e.consultantName.toLowerCase().includes(q)) return false;
    }
    if (decision && e.status !== decision) return false;
    return true;
  }), [entries, search, decision]);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Loading…</div>;

  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const rejectedCount = entries.filter((e) => e.status === "rejected").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        {[
          { label: "Total", value: entries.length, color: "text-white", border: "border-gray-800" },
          { label: "Approuvées", value: approvedCount, color: "text-emerald-400", border: "border-emerald-900/40" },
          { label: "Rejetées",   value: rejectedCount, color: "text-red-400",     border: "border-red-900/40"     },
        ].map((s) => (
          <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl px-4 py-3 flex flex-col`}>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Rechercher par règle, apprenant ou consultant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="">Toutes les décisions</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <CheckCircle size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune validation trouvée</p>
        </div>
      ) : (
        <div className="bg-gray-950/60 border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date révision</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Consultant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Règle</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Apprenant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Décision</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Commentaire</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <ValidationRow key={e.id} entry={e} onXml={() => setXmlEntry(e)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-800/60 text-[10px] text-gray-600">
            {filtered.length} validation{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== entries.length && ` (${entries.length} au total)`}
          </div>
        </div>
      )}

      {xmlEntry && (
        <XmlModal title={xmlEntry.ruleName} xml={xmlEntry.xml ?? ""} onClose={() => setXmlEntry(null)} />
      )}
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

  const [attacks,        setAttacks]        = useState<Attack[]>([]);
  const [attacksLoading, setAttacksLoading] = useState(true);
  const [attacksError,   setAttacksError]   = useState<string | null>(null);

  const [ruleTuning,        setRuleTuning]        = useState<RuleTuningEntry[]>([]);
  const [ruleTuningLoading, setRuleTuningLoading] = useState(false);
  const [ruleTuningFetched, setRuleTuningFetched] = useState(false);

  const [validations,        setValidations]        = useState<ValidationEntry[]>([]);
  const [validationsLoading, setValidationsLoading] = useState(false);
  const [validationsFetched, setValidationsFetched] = useState(false);

  // Fetch attacks
  const fetchAttacks = useCallback(async () => {
    setAttacksLoading(true);
    setAttacksError(null);
    try {
      const res = await fetch("/api/admin/attacks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAttacks(await res.json());
    } catch (e: unknown) {
      setAttacksError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAttacksLoading(false);
    }
  }, []);

  // Fetch rule tuning on tab open
  useEffect(() => {
    if ((activeTab === "rule-tuning" || activeTab === "all") && !ruleTuningFetched) {
      setRuleTuningLoading(true);
      fetch("/api/admin/rule-tuning")
        .then((r) => r.json())
        .then((d) => { setRuleTuning(Array.isArray(d) ? d : []); setRuleTuningFetched(true); })
        .catch(console.error)
        .finally(() => setRuleTuningLoading(false));
    }
  }, [activeTab, ruleTuningFetched]);

  // Fetch validations on tab open
  useEffect(() => {
    if ((activeTab === "validations" || activeTab === "all") && !validationsFetched) {
      setValidationsLoading(true);
      fetch("/api/admin/validations")
        .then((r) => r.json())
        .then((d) => { setValidations(Array.isArray(d) ? d : []); setValidationsFetched(true); })
        .catch(console.error)
        .finally(() => setValidationsLoading(false));
    }
  }, [activeTab, validationsFetched]);

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
        {attacksError && showAttacks ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            Error loading attacks: {attacksError}
          </div>
        ) : showAttacks ? (
          <AttacksTable attacks={attacks} loading={attacksLoading} />
        ) : activeTab === "rule-tuning" ? (
          <RuleTuningTable entries={ruleTuning} loading={ruleTuningLoading} />
        ) : activeTab === "missions" ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-700">
            <Construction size={36} className="mb-4 opacity-40" />
            <p className="text-sm font-medium text-gray-500">Mission History</p>
            <p className="text-xs text-gray-700 mt-1">This section is not implemented yet.</p>
          </div>
        ) : (
          <ValidationsTable entries={validations} loading={validationsLoading} />
        )}
      </div>
    </DashboardLayout>
  );
}