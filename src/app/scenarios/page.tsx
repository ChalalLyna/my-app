"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Layers, ChevronRight, Search, Plus, Pencil, Trash2,
  Volume2, GraduationCap, Flame, Zap,
} from "lucide-react";

interface Scenario {
  id:              number;
  titre:           string;
  description:     string;
  objectif:        string;
  niveau:          string;
  bruitRecommande: boolean;
}

const NIVEAU_META: Record<string, {
  label: string;
  icon:  React.ComponentType<{ size: number; className?: string }>;
  color: string; bg: string; border: string; order: number;
}> = {
  beginner:     { label: "Débutant",      icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", order: 0 },
  intermediate: { label: "Intermédiaire", icon: Zap,           color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   order: 1 },
  advanced:     { label: "Avancé",        icon: Flame,         color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     order: 2 },
};

const DEFAULT_NIVEAU = { label: "Autre", icon: Layers, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20", order: 99 };

function getNiveauMeta(niveau: string) {
  return NIVEAU_META[niveau] ?? DEFAULT_NIVEAU;
}

export default function ScenariosPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const [scenarios,      setScenarios]      = useState<Scenario[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [activeNiveau,   setActiveNiveau]   = useState<string>("all");
  const [deleting,       setDeleting]       = useState<number | null>(null);

  const fetchScenarios = useCallback(() => {
    setLoading(true);
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => { setScenarios(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchScenarios(); }, [fetchScenarios]);

  async function handleDelete(s: Scenario) {
    if (!window.confirm(`Supprimer "${s.titre}" ?`)) return;
    setDeleting(s.id);
    await fetch(`/api/scenarios/${s.id}`, { method: "DELETE" });
    setDeleting(null);
    fetchScenarios();
  }

  const niveaux = Array.from(new Set(scenarios.map((s) => s.niveau)))
    .sort((a, b) => getNiveauMeta(a).order - getNiveauMeta(b).order);

  const filtered = scenarios.filter((s) => {
    const matchNiveau  = activeNiveau === "all" || s.niveau === activeNiveau;
    const matchSearch  = search === "" ||
      s.titre.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchNiveau && matchSearch;
  });

  const grouped = niveaux.reduce<Record<string, Scenario[]>>((acc, n) => {
    const items = filtered.filter((s) => s.niveau === n);
    if (items.length > 0) acc[n] = items;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                Scénarios
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Scénarios d'entraînement</h1>
            <p className="text-gray-500 text-sm mt-1">
              Exercices pratiques de cybersécurité offensive et défensive
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/scenarios/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} />
              Ajouter un scénario
            </Link>
          )}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un scénario…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveNiveau("all")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                activeNiveau === "all"
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              Tous
            </button>
            {niveaux.map((n) => {
              const meta = getNiveauMeta(n);
              const Icon = meta.icon;
              return (
                <button
                  key={n}
                  onClick={() => setActiveNiveau(n)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeNiveau === n
                      ? `${meta.bg} ${meta.border} ${meta.color}`
                      : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  <Icon size={12} className={activeNiveau === n ? meta.color : ""} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Chargement…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">Aucun scénario trouvé.</div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([niveau, items]) => {
              const meta = getNiveauMeta(niveau);
              const Icon = meta.icon;
              return (
                <section key={niveau}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">{meta.label}</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((scenario) => (
                      <div key={scenario.id} className="relative group">
                        <Link
                          href={`/scenarios/${scenario.id}`}
                          className="flex flex-col bg-gray-900 border border-gray-800/60 rounded-2xl p-5 hover:border-gray-700 transition-colors h-full"
                        >
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={15} className={meta.color} />
                              </div>
                              {scenario.bruitRecommande && (
                                <span className="flex items-center gap-1 text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                  <Volume2 size={10} />
                                  Bruit
                                </span>
                              )}
                            </div>
                            <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-500 transition-colors mt-1 flex-shrink-0" />
                          </div>

                          <h3 className="text-sm font-semibold text-white leading-snug mb-1.5">
                            {scenario.titre}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed flex-1">
                            {scenario.description}
                          </p>

                          <div className={`inline-flex items-center gap-1 mt-3 text-xs font-medium px-2 py-0.5 rounded-full self-start ${meta.bg} ${meta.color}`}>
                            <Icon size={10} />
                            {meta.label}
                          </div>
                        </Link>

                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/scenarios/${scenario.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white transition-colors"
                            >
                              <Pencil size={12} />
                            </Link>
                            <button
                              onClick={(e) => { e.preventDefault(); handleDelete(scenario); }}
                              disabled={deleting === scenario.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
