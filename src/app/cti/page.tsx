"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Shield, Search, X, ChevronLeft, ChevronRight,
  RefreshCw, Plus, Loader2, AlertCircle, CheckCircle2,
  FileCode2, FileText, Tag, Calendar, User, Layers,
  Download, FolderOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CTIRule {
  IdRegle:              number;
  IdSigma:              string | null;
  Titre:                string | null;
  Description:          string | null;
  Auteur:               string | null;
  DateAjout:            string | null;
  DerniereModification: string | null;
  TechniquesMitre:      string | null; // JSON string
  Severite:             string | null;
  NiveauWazuh:          number | null;
  Produit:              string | null;
  Categorie:            string | null;
}

interface CTIRuleDetail extends CTIRule {
  YamlSigmaOriginal: string | null;
  XmlWazuh:          string | null;
}

interface CategoryInfo {
  name:  string;
  count: number;
}

interface CategoriesData {
  imported:  CategoryInfo[];
  available: string[];
  all:       string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const ALL_CATEGORIES = ["windows", "linux", "macos", "network", "cloud"] as const;

const SEVERITY_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: "Critique", color: "text-red-400",    bg: "bg-red-500/10",    dot: "bg-red-400"    },
  high:     { label: "Haute",    color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
  medium:   { label: "Moyenne",  color: "text-yellow-400", bg: "bg-yellow-500/10", dot: "bg-yellow-400" },
  low:      { label: "Faible",   color: "text-blue-400",   bg: "bg-blue-500/10",   dot: "bg-blue-400"   },
};

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  windows: { color: "text-sky-400",    bg: "bg-sky-500/10"    },
  linux:   { color: "text-green-400",  bg: "bg-green-500/10"  },
  macos:   { color: "text-purple-400", bg: "bg-purple-500/10" },
  network: { color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
  cloud:   { color: "text-orange-400", bg: "bg-orange-500/10" },
};

// ─── Helper components ────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: string | null }) {
  const key  = (level ?? "").toLowerCase();
  const meta = SEVERITY_META[key] ?? { label: level ?? "—", color: "text-gray-400", bg: "bg-gray-500/10", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color} ${meta.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: string | null }) {
  const key  = (cat ?? "").toLowerCase();
  const meta = CATEGORY_META[key] ?? { color: "text-gray-400", bg: "bg-gray-500/10" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${meta.color} ${meta.bg}`}>
      {cat ?? "—"}
    </span>
  );
}

function MitreBadges({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-gray-600 text-xs">—</span>;
  let techniques: string[] = [];
  try { techniques = JSON.parse(raw); } catch { techniques = [raw]; }
  if (!techniques.length) return <span className="text-gray-600 text-xs">—</span>;
  const visible = techniques.slice(0, 3);
  const extra   = techniques.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t) => (
        <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono">
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">+{extra}</span>
      )}
    </div>
  );
}

function CodeBlock({ content }: { content: string | null }) {
  return (
    <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-auto max-h-80 whitespace-pre-wrap break-all">
      {content ?? "—"}
    </pre>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CTIPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";

  // Table state
  const [rules, setRules]     = useState<CTIRule[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");

  // Categories
  const [catData, setCatData]       = useState<CategoriesData>({ imported: [], available: [], all: [] });
  const [catLoading, setCatLoading] = useState(true);

  // Detail modal
  const [detail, setDetail]           = useState<CTIRuleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab]     = useState<"yaml" | "xml">("yaml");

  // Manage modal (admin)
  const [showManage, setShowManage]   = useState(false);
  const [importing, setImporting]     = useState<string | null>(null);
  const [importMsg, setImportMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch categories ──────────────────────────────────────────
  const fetchCategories = useCallback(() => {
    setCatLoading(true);
    fetch("/api/cti/categories")
      .then((r) => r.json())
      .then((d) => { setCatData(d); setCatLoading(false); })
      .catch(() => setCatLoading(false));
  }, []);

  // ── Fetch rules ───────────────────────────────────────────────
  const fetchRules = useCallback((
    pg: number, q: string, cat: string, sev: string
  ) => {
    setLoading(true);
    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String(pg * PAGE_SIZE),
    });
    if (q)   params.set("search",   q);
    if (cat) params.set("category", cat);
    if (sev) params.set("severity", sev);

    fetch(`/api/cti/rules?${params}`)
      .then((r) => r.json())
      .then((d) => { setRules(d.rules ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      fetchRules(0, search, category, severity);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, category, severity, fetchRules]);

  useEffect(() => {
    fetchRules(page, search, category, severity);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open detail ───────────────────────────────────────────────
  function openDetail(rule: CTIRule) {
    setDetail(null);
    setDetailTab("yaml");
    setDetailLoading(true);
    fetch(`/api/cti/rules/${rule.IdRegle}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }

  // ── Import / Refresh ──────────────────────────────────────────
  async function handleImport(cat: string) {
    setImporting(cat);
    setImportMsg(null);
    try {
      const res  = await fetch("/api/cti/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportMsg({ ok: false, text: data.error ?? "Erreur inconnue." });
      } else {
        setImportMsg({ ok: true, text: `${data.count} règles importées pour « ${cat} ».` });
        fetchCategories();
        setPage(0);
        fetchRules(0, search, category, severity);
      }
    } catch {
      setImportMsg({ ok: false, text: "Erreur réseau." });
    } finally {
      setImporting(null);
    }
  }

  // ── Pagination helpers ────────────────────────────────────────
  const totalPages  = Math.ceil(total / PAGE_SIZE);
  const pageStart   = page * PAGE_SIZE + 1;
  const pageEnd     = Math.min((page + 1) * PAGE_SIZE, total);

  // ── Format date ───────────────────────────────────────────────
  function fmtDate(d: string | null) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
  }

  // ── Parse MITRE techniques ────────────────────────────────────
  function parseMitre(raw: string | null): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return [raw]; }
  }

  if (authLoading) return null;

  return (
    <DashboardLayout>
      <div className="p-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">
                Cyber Threat Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Base CTI</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {total > 0
                ? `${total} règle${total !== 1 ? "s" : ""} · ${catData.imported.length} catégorie${catData.imported.length !== 1 ? "s" : ""} importée${catData.imported.length !== 1 ? "s" : ""}`
                : "Aucune règle importée"}
            </p>
          </div>

          {/* Admin: manage button */}
          {isAdmin && (
            <button
              onClick={() => { setShowManage(true); setImportMsg(null); }}
              className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <FolderOpen size={15} />
              Gérer les catégories
            </button>
          )}
        </div>

        {/* ── Stats row ──────────────────────────────────────── */}
        {catData.imported.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {catData.imported.map((c) => {
              const meta = CATEGORY_META[c.name] ?? { color: "text-gray-400", bg: "bg-gray-500/10" };
              return (
                <button
                  key={c.name}
                  onClick={() => { setCategory(category === c.name ? "" : c.name); setPage(0); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                    ${category === c.name
                      ? `${meta.color} ${meta.bg} border-current/30`
                      : "text-gray-400 bg-gray-800/50 border-gray-700/50 hover:border-gray-600"
                    }`}
                >
                  <Layers size={11} />
                  <span className="capitalize">{c.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${category === c.name ? meta.bg : "bg-gray-700"}`}>
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, auteur, technique…"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(0); }}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 min-w-[140px]"
          >
            <option value="">Toutes les catégories</option>
            {catData.imported.map((c) => (
              <option key={c.name} value={c.name} className="capitalize">{c.name}</option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(0); }}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 min-w-[140px]"
          >
            <option value="">Toutes les sévérités</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Faible</option>
          </select>
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader2 size={20} className="animate-spin mr-2" /> Chargement…
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
              <Shield size={32} className="opacity-20" />
              <p className="text-sm">
                {catData.imported.length === 0
                  ? "Aucune règle CTI — importez une catégorie via « Gérer les catégories »."
                  : "Aucune règle ne correspond à ces filtres."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">Titre</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Catégorie</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Sévérité</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Techniques MITRE</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Auteur</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Modifié</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr
                        key={rule.IdRegle}
                        onClick={() => openDetail(rule)}
                        className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-white font-medium truncate">{rule.Titre ?? "—"}</p>
                          {rule.IdSigma && (
                            <p className="text-gray-600 text-xs font-mono truncate mt-0.5">{rule.IdSigma}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <CategoryBadge cat={rule.Categorie} />
                        </td>
                        <td className="px-4 py-3.5">
                          <SeverityBadge level={rule.Severite} />
                        </td>
                        <td className="px-4 py-3.5">
                          <MitreBadges raw={rule.TechniquesMitre} />
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs max-w-[140px] truncate">
                          {rule.Auteur ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {fmtDate(rule.DerniereModification ?? rule.DateAjout)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800/60">
                  <p className="text-xs text-gray-500">
                    {pageStart}–{pageEnd} sur {total} règles
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="px-2 text-xs text-gray-400">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {detailLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" /> Chargement…
              </div>
            ) : detail && (
              <>
                {/* Modal header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-800/60">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CategoryBadge cat={detail.Categorie} />
                      <SeverityBadge level={detail.Severite} />
                      {detail.NiveauWazuh != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          Wazuh lv.{detail.NiveauWazuh}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">
                      {detail.Titre ?? "Sans titre"}
                    </h2>
                    {detail.IdSigma && (
                      <p className="text-xs text-gray-600 font-mono mt-0.5">{detail.IdSigma}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDetail(null)}
                    className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">

                  {/* Description */}
                  {detail.Description && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <FileText size={11} /> Description
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">{detail.Description}</p>
                    </div>
                  )}

                  {/* MITRE techniques */}
                  {detail.TechniquesMitre && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <Tag size={11} /> Techniques MITRE ATT&amp;CK
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {parseMitre(detail.TechniquesMitre).map((t) => (
                          <span key={t} className="text-xs px-2 py-1 rounded-lg bg-brand/10 text-brand font-mono border border-brand/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="grid grid-cols-2 gap-3">
                    {detail.Auteur && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                          <User size={11} /> Auteur
                        </p>
                        <p className="text-sm text-gray-300 truncate">{detail.Auteur}</p>
                      </div>
                    )}
                    {(detail.DateAjout || detail.DerniereModification) && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                          <Calendar size={11} /> Dates
                        </p>
                        <p className="text-xs text-gray-400">
                          Ajouté : {fmtDate(detail.DateAjout)}
                          {detail.DerniereModification && (
                            <> · Modifié : {fmtDate(detail.DerniereModification)}</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tabs: YAML / XML */}
                  {(detail.YamlSigmaOriginal || detail.XmlWazuh) && (
                    <div>
                      <div className="flex gap-1 mb-2">
                        {detail.YamlSigmaOriginal && (
                          <button
                            onClick={() => setDetailTab("yaml")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${detailTab === "yaml"
                                ? "bg-brand/15 text-brand border border-brand/30"
                                : "text-gray-400 hover:text-white bg-gray-800/50 border border-transparent"
                              }`}
                          >
                            <FileCode2 size={12} /> Sigma YAML
                          </button>
                        )}
                        {detail.XmlWazuh && (
                          <button
                            onClick={() => setDetailTab("xml")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${detailTab === "xml"
                                ? "bg-brand/15 text-brand border border-brand/30"
                                : "text-gray-400 hover:text-white bg-gray-800/50 border border-transparent"
                              }`}
                          >
                            <Download size={12} /> XML Wazuh
                          </button>
                        )}
                      </div>
                      {detailTab === "yaml" && <CodeBlock content={detail.YamlSigmaOriginal} />}
                      {detailTab === "xml"  && <CodeBlock content={detail.XmlWazuh} />}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Manage categories modal (admin only) ──────────────────── */}
      {isAdmin && showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800/60">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-brand" />
                <h2 className="text-base font-bold text-white">Gestion des catégories CTI</h2>
              </div>
              <button
                onClick={() => { setShowManage(false); setImportMsg(null); }}
                disabled={!!importing}
                className="text-gray-500 hover:text-white transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-2">
              {/* Import feedback */}
              {importMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm mb-3
                  ${importMsg.ok
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {importMsg.ok
                    ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                    : <AlertCircle  size={15} className="mt-0.5 flex-shrink-0" />
                  }
                  {importMsg.text}
                </div>
              )}

              {/* Loading warning */}
              {importing && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 mb-2">
                  <Loader2 size={13} className="animate-spin flex-shrink-0" />
                  Import en cours pour « {importing} » — peut prendre quelques minutes (clone Git + parsing YAML)…
                </div>
              )}

              {catLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 size={18} className="animate-spin mr-2" />
                </div>
              ) : (
                ALL_CATEGORIES.map((cat) => {
                  const imported  = catData.imported.find((i) => i.name === cat);
                  const isImporting = importing === cat;
                  const catMeta   = CATEGORY_META[cat] ?? { color: "text-gray-400", bg: "bg-gray-500/10" };

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${catMeta.color} ${catMeta.bg}`}>
                          {cat}
                        </span>
                        {imported ? (
                          <span className="text-xs text-gray-400">
                            {imported.count} règle{imported.count !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">Non importé</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleImport(cat)}
                        disabled={!!importing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                          ${imported
                            ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-700"
                            : "bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand"
                          }`}
                      >
                        {isImporting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : imported ? (
                          <RefreshCw size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                        {isImporting ? "En cours…" : imported ? "Actualiser" : "Importer"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
