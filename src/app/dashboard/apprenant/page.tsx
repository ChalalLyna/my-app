"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Crosshair, Brain, X, FileText, ChevronDown, ChevronUp,
  Shield, Clock, Monitor, Filter, Calendar, Search,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell, CartesianGrid,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  attackCount:    number;
  techniqueCount: number;
}

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
}

interface TacticStat {
  tactique:       string;
  techniqueCount: number;
  attackCount:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<string, string> = {
  success:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed:     "text-red-400    bg-red-500/10    border-red-500/20",
  running:    "text-amber-400  bg-amber-500/10  border-amber-500/20",
  terminee:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "en cours": "text-amber-400  bg-amber-500/10  border-amber-500/20",
};

const BAR_COLORS = [
  "#6366f1","#8b5cf6","#a78bfa","#4f46e5","#7c3aed","#9333ea","#c026d3","#db2777",
];

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
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
            <p className="text-xs text-gray-500 mt-0.5">{fmt(attack.dateExecution)} · {attack.actifNom}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
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
            <p className="text-sm text-gray-600 text-center py-8">Aucun rapport disponible.</p>
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

        {/* Technique */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
              {attack.mitreID}
            </span>
            <span className="text-xs text-white font-medium line-clamp-1">{attack.techniqueName}</span>
          </div>
        </td>

        {/* Tactique */}
        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
          {attack.tactique}
        </td>

        {/* Actif */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="text-xs text-white">{attack.actifNom}</div>
          <div className="text-[10px] text-gray-600 font-mono">{attack.actifIP}</div>
        </td>

        {/* Résultat */}
        <td className="px-4 py-3 hidden xl:table-cell max-w-[220px]">
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {attack.resultatDescription || "—"}
          </p>
        </td>

        {/* Statut */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statutStyle}`}>
            {attack.statut}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {attack.rapport && (
              <button
                onClick={onReport}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg transition-colors"
              >
                <FileText size={11} />
                Rapport
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

      {/* Expanded details */}
      {expanded && (
        <tr className="border-b border-gray-800/50 bg-gray-900/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Monitor size={10} /> Système
                </p>
                <p className="text-xs text-gray-300">{attack.actifOS || "—"}</p>
                <p className="text-[10px] font-mono text-gray-500">{attack.actifIP}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                  Catégorie actif
                </p>
                <p className="text-xs text-gray-300">{attack.actifCategorie || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText size={10} /> Résultat complet
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {attack.resultatDescription || "—"}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-white mb-1">{label}</p>
      <p className="text-xs text-indigo-400">{payload[0].value} attaque{payload[0].value > 1 ? "s" : ""}</p>
    </div>
  );
}

// ─── Filters Bar ──────────────────────────────────────────────────────────────

interface Filters {
  search:  string;
  actif:   string;
  tactique: string;
  dateFrom: string;
  dateTo:   string;
}

function FiltersBar({
  attacks, filters, onChange,
}: {
  attacks: Attack[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const actifs   = useMemo(() => [...new Set(attacks.map((a) => a.actifNom))].sort(),   [attacks]);
  const tactiques = useMemo(() => [...new Set(attacks.map((a) => a.tactique))].sort(), [attacks]);

  const set = (key: keyof Filters, val: string) => onChange({ ...filters, [key]: val });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          type="text"
          placeholder="Rechercher une technique…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Actif */}
      <div className="relative">
        <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <select
          value={filters.actif}
          onChange={(e) => set("actif", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
        >
          <option value="">Tous les actifs</option>
          {actifs.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Tactique */}
      <div className="relative">
        <Shield size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <select
          value={filters.tactique}
          onChange={(e) => set("tactique", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
        >
          <option value="">Toutes les tactiques</option>
          {tactiques.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Date from */}
      <div className="relative">
        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
        />
      </div>

      {/* Date to */}
      <div className="relative">
        <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
        />
      </div>

      {/* Reset */}
      {(filters.search || filters.actif || filters.tactique || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onChange({ search: "", actif: "", tactique: "", dateFrom: "", dateTo: "" })}
          className="text-[10px] text-gray-500 hover:text-white transition-colors underline"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApprenantDashboard() {
  const { user } = useAuth();

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [tactics, setTactics] = useState<TacticStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportAttack, setReportAttack] = useState<Attack | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "", actif: "", tactique: "", dateFrom: "", dateTo: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/apprenant/stats").then((r) => r.json()),
      fetch("/api/apprenant/attacks").then((r) => r.json()),
      fetch("/api/apprenant/tactics").then((r) => r.json()),
    ]).then(([s, a, t]) => {
      setStats(s);
      setAttacks(Array.isArray(a) ? a : []);
      setTactics(Array.isArray(t) ? t : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Filtered attacks ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return attacks.filter((a) => {
      if (filters.search && !a.techniqueName.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.actif   && a.actifNom !== filters.actif)     return false;
      if (filters.tactique && a.tactique !== filters.tactique) return false;
      if (filters.dateFrom && a.dateExecution && a.dateExecution < filters.dateFrom) return false;
      if (filters.dateTo   && a.dateExecution && a.dateExecution > filters.dateTo)   return false;
      return true;
    });
  }, [attacks, filters]);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              Apprenant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bonjour, {user?.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Votre tableau de bord d'apprentissage en cybersécurité</p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-3">
              <Crosshair size={18} className="text-indigo-400" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-800 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-bold text-white">{stats?.attackCount ?? 0}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">Attaques réalisées</p>
          </div>

          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3">
              <Brain size={18} className="text-purple-400" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-800 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-bold text-white">{stats?.techniqueCount ?? 0}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">Techniques MITRE pratiquées</p>
          </div>
        </div>

        {/* ── Tactics chart ── */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={15} className="text-indigo-400" />
            <p className="text-sm font-semibold text-white">Tactiques MITRE ATT&CK pratiquées</p>
            {tactics.length > 0 && (
              <span className="text-xs text-gray-600 ml-auto">{tactics.length} tactique{tactics.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">Chargement…</div>
          ) : tactics.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              Aucune donnée — lancez votre première attaque pour voir apparaître le graphique.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, tactics.length * 46)}>
              <BarChart
                data={tactics}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="tactique"
                  width={160}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="attackCount" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {tactics.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Attack history ── */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800/60 space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-indigo-400" />
              <p className="text-sm font-semibold text-white">Historique des attaques</p>
              {!loading && (
                <span className="ml-auto text-xs text-gray-600">
                  {filtered.length}/{attacks.length} entrée{attacks.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Filters */}
            {!loading && attacks.length > 0 && (
              <FiltersBar attacks={attacks} filters={filters} onChange={setFilters} />
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-600 text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-600 text-sm">
              {attacks.length === 0 ? "Aucune attaque enregistrée." : "Aucun résultat pour ces filtres."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/60">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Technique</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Tactique</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Actif ciblé</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">Résultat</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((attack) => (
                    <AttackRow
                      key={attack.id}
                      attack={attack}
                      onReport={() => setReportAttack(attack)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {reportAttack && (
        <ReportModal attack={reportAttack} onClose={() => setReportAttack(null)} />
      )}
    </DashboardLayout>
  );
}