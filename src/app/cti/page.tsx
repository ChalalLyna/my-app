"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import { useMission } from "@/app/context/MissionContext";
import {
  Shield, Search, X, ChevronLeft, ChevronRight,
  RefreshCw, Plus, Loader2, AlertCircle, CheckCircle2,
  FileCode2, FileText, Tag, Calendar, User, Layers,
  Download, FolderOpen, Users, GraduationCap, CheckCircle,
  Flag, PackageCheck,
} from "lucide-react";
import { RuleReview } from "@/app/data/ruleReviews";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CTIRule {
  IdRegle:              number;
  IdSigma:              string | null;
  Titre:                string | null;
  Description:          string | null;
  Auteur:               string | null;
  DateAjout:            string | null;
  DerniereModification: string | null;
  TechniquesMitre:      string | null;
  Severite:             string | null;
  NiveauWazuh:          number | null;
  Produit:              string | null;
  Categorie:            string | null;
  SousCategorie:        string | null;
}

interface CTIRuleDetail extends CTIRule {
  YamlSigmaOriginal: string | null;
  XmlWazuh:          string | null;
}

interface CategoryInfo    { name: string; count: number; }
interface SubCategoryInfo { name: string; count: number; }

interface CategoriesData {
  imported:      CategoryInfo[];
  available:     string[];
  all:           string[];
  subcategories: SubCategoryInfo[];
}

interface ConsultantRule {
  id:             string;
  nom:            string;
  description:    string | null;
  wazuhRuleId:    number | null;
  severite:       string | null;
  dateCreation:   string;
  consultantName: string;
  xml:            string;
}

interface XmlPreviewState {
  title:    string;
  xml:      string;
  severite?: string | null;
  rows:     { label: string; value: string }[];
}

type Tab = "cti" | "consultants" | "apprenants";


// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const ALL_CATEGORIES = ["windows", "linux", "macos", "network", "cloud", "web"] as const;

const SEVERITY_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: "Critical", color: "text-red-400",    bg: "bg-red-500/10",    dot: "bg-red-400"    },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
  medium:   { label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10", dot: "bg-yellow-400" },
  low:      { label: "Low",      color: "text-blue-400",   bg: "bg-blue-500/10",   dot: "bg-blue-400"   },
};

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  windows: { color: "text-sky-400",    bg: "bg-sky-500/10"    },
  linux:   { color: "text-green-400",  bg: "bg-green-500/10"  },
  macos:   { color: "text-purple-400", bg: "bg-purple-500/10" },
  network: { color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
  cloud:   { color: "text-orange-400", bg: "bg-orange-500/10" },
  web:     { color: "text-pink-400",   bg: "bg-pink-500/10"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMitre(xml: string): string[] {
  const m = xml.match(/<group[^>]*>([^<]+)<\/group>/);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter((s) => /^T\d{4}/.test(s));
}

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

function SubCategoryBadge({ sub }: { sub: string | null }) {
  if (!sub) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-gray-400 bg-gray-800 border border-gray-700/50">
      {sub}
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

function MitreBadgesFromXml({ xml }: { xml: string }) {
  const techniques = extractMitre(xml);
  if (!techniques.length) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {techniques.map((t) => (
        <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono">{t}</span>
      ))}
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
  const { activeMission } = useMission();
  const isAdmin = user?.role === "admin";
  const isConsultant = user?.role === "consultant";

  const [activeTab, setActiveTab] = useState<Tab>("cti");
  const [exportMode, setExportMode]         = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<number>>(new Set());
  const [exportDone, setExportDone]         = useState(false);

  const toggleRuleSelection = (id: number) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportToMission = () => {
    setExportDone(true);
    setTimeout(() => { setExportDone(false); setExportMode(false); setSelectedRuleIds(new Set()); }, 2500);
  };

  // ── CTI state ────────────────────────────────────────────────
  const [rules, setRules]         = useState<CTIRule[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [severity, setSeverity]   = useState("");

  const [catData, setCatData]       = useState<CategoriesData>({
    imported: [], available: [], all: [], subcategories: [],
  });
  const [catLoading, setCatLoading] = useState(true);

  const [detail, setDetail]               = useState<CTIRuleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab]         = useState<"yaml" | "xml">("yaml");

  const [showManage, setShowManage] = useState(false);
  const [importing, setImporting]   = useState<string | null>(null);
  const [importMsg, setImportMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Consultant rules ─────────────────────────────────────────────
  const [consultantRules, setConsultantRules]     = useState<ConsultantRule[]>([]);
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantFetched, setConsultantFetched] = useState(false);

  // ── Apprenant approved rules ─────────────────────────────────────
  const [approvedRules, setApprovedRules]   = useState<RuleReview[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [approvedFetched, setApprovedFetched] = useState(false);

  // ── XML preview modal (consultants + apprenants) ─────────────────
  const [xmlPreview, setXmlPreview] = useState<XmlPreviewState | null>(null);

  // ── Fetch categories ─────────────────────────────────────────────
  const fetchCategories = useCallback((cat: string = "") => {
    setCatLoading(true);
    const url = cat ? `/api/cti/categories?category=${encodeURIComponent(cat)}` : "/api/cti/categories";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setCatData(d); setCatLoading(false); })
      .catch(() => setCatLoading(false));
  }, []);

  // ── Fetch CTI rules ──────────────────────────────────────────────
  const fetchRules = useCallback((
    pg: number, q: string, cat: string, sub: string, sev: string
  ) => {
    setLoading(true);
    const params = new URLSearchParams({
      limit:  String(PAGE_SIZE),
      offset: String(pg * PAGE_SIZE),
    });
    if (q)   params.set("search",      q);
    if (cat) params.set("category",    cat);
    if (sub) params.set("subcategory", sub);
    if (sev) params.set("severity",    sev);

    fetch(`/api/cti/rules?${params}`)
      .then((r) => r.json())
      .then((d) => { setRules(d.rules ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Fetch consultant rules when tab opens ────────────────────────
  useEffect(() => {
    if (activeTab === "consultants" && !consultantFetched) {
      setConsultantLoading(true);
      fetch("/api/consultant-rules")
        .then((r) => r.json())
        .then((d) => {
          setConsultantRules(Array.isArray(d) ? d : []);
          setConsultantLoading(false);
          setConsultantFetched(true);
        })
        .catch(() => setConsultantLoading(false));
    }
  }, [activeTab, consultantFetched]);

  // ── Fetch approved rules when apprenant tab opens ────────────────
  useEffect(() => {
    if (activeTab === "apprenants" && !approvedFetched) {
      setApprovedLoading(true);
      fetch("/api/rule-reviews?status=approved")
        .then((r) => r.json())
        .then((d) => {
          setApprovedRules(Array.isArray(d) ? d : []);
          setApprovedLoading(false);
          setApprovedFetched(true);
        })
        .catch(() => setApprovedLoading(false));
    }
  }, [activeTab, approvedFetched]);

  // Initial load
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Debounced re-fetch on filter change
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      fetchRules(0, search, category, subcategory, severity);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, category, subcategory, severity, fetchRules]);

  // Page change
  useEffect(() => {
    fetchRules(page, search, category, subcategory, severity);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCategoryChange(val: string) {
    setCategory(val);
    setSubcategory("");
    setPage(0);
    fetchCategories(val);
  }

  // ── Open CTI detail ──────────────────────────────────────────────
  function openDetail(rule: CTIRule) {
    setDetail(null);
    setDetailTab("yaml");
    setDetailLoading(true);
    fetch(`/api/cti/rules/${rule.IdRegle}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }

  // ── Import categories ────────────────────────────────────────────
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
        setImportMsg({ ok: false, text: data.error ?? "Unknown error." });
      } else {
        setImportMsg({ ok: true, text: `${data.count} rules imported for "${cat}".` });
        fetchCategories(category);
        setPage(0);
        fetchRules(0, search, category, subcategory, severity);
      }
    } catch {
      setImportMsg({ ok: false, text: "Network error." });
    } finally {
      setImporting(null);
    }
  }

  // ── Misc helpers ─────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageStart  = page * PAGE_SIZE + 1;
  const pageEnd    = Math.min((page + 1) * PAGE_SIZE, total);

  function fmtDate(d: string | null) {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US"); } catch { return d; }
  }

  function parseMitre(raw: string | null): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return [raw]; }
  }

  if (authLoading) return null;

  const TABS: { key: Tab; label: string; Icon: React.ElementType; count?: number }[] = [
    { key: "cti",         label: "Rule Base",         Icon: Shield,        count: total > 0 ? total : undefined },
    { key: "consultants", label: "Consultant Rules",   Icon: Users,         count: consultantFetched ? consultantRules.length : undefined },
    { key: "apprenants",  label: "Learner Rules",      Icon: GraduationCap, count: approvedFetched ? approvedRules.length : undefined },
  ];

  return (
    <DashboardLayout>
      <div className="p-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">
                Rule Base
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Detection Rules</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {activeTab === "cti" && (
                total > 0
                  ? `${total} rule${total !== 1 ? "s" : ""} · ${catData.imported.length} imported categor${catData.imported.length !== 1 ? "ies" : "y"}`
                  : "No CTI rules imported"
              )}
              {activeTab === "consultants" && (consultantFetched ? `${consultantRules.length} rule${consultantRules.length !== 1 ? "s" : ""} published by consultants` : "Rules published by consultants")}
              {activeTab === "apprenants" && (
                approvedFetched
                  ? `${approvedRules.length} approved learner rule${approvedRules.length !== 1 ? "s" : ""}`
                  : "Rules submitted by learners and approved"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && activeTab === "cti" && (
              <button
                onClick={() => { setShowManage(true); setImportMsg(null); }}
                className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <FolderOpen size={15} />
                Manage Categories
              </button>
            )}
          </div>
        </div>

        {/* ── Mission export banner ────────────────────────────────── */}
        {activeMission && isConsultant && activeTab === "cti" && (
          <div className="mb-5 flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-amber-800/50 bg-amber-950/30">
            <div className="flex items-center gap-2.5">
              <Flag size={14} className="text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300 font-medium">
                Mission active — <span className="font-bold">{activeMission.name}</span>
              </p>
              {exportDone && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 size={11} />
                  {selectedRuleIds.size} rule{selectedRuleIds.size !== 1 ? "s" : ""} exported
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {exportMode ? (
                <>
                  <button
                    onClick={() => { setExportMode(false); setSelectedRuleIds(new Set()); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    onClick={handleExportToMission}
                    disabled={selectedRuleIds.size === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <PackageCheck size={12} />
                    Export {selectedRuleIds.size > 0 ? `${selectedRuleIds.size} ` : ""}rule{selectedRuleIds.size !== 1 ? "s" : ""} to client
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setExportMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/40 border border-amber-600/40 text-amber-400 transition-colors"
                >
                  <PackageCheck size={12} />
                  Select rules to export
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Tab navigation ──────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800/60 rounded-2xl p-1 w-fit">
          {TABS.map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${activeTab === key
                  ? "bg-brand/15 text-brand border border-brand/25"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs
                  ${activeTab === key ? "bg-brand/20 text-brand" : "bg-gray-800 text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CTI TAB                                                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "cti" && (
          <>
            {/* Category chips */}
            {catData.imported.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {catData.imported.map((c) => {
                  const meta   = CATEGORY_META[c.name] ?? { color: "text-gray-400", bg: "bg-gray-500/10" };
                  const active = category === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => handleCategoryChange(active ? "" : c.name)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                        ${active
                          ? `${meta.color} ${meta.bg} border-current/30`
                          : "text-gray-400 bg-gray-800/50 border-gray-700/50 hover:border-gray-600"
                        }`}
                    >
                      <Layers size={11} />
                      <span className="capitalize">{c.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${active ? meta.bg : "bg-gray-700"}`}>
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="relative flex-1 min-w-55">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, author, technique…"
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

              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 min-w-35"
              >
                <option value="">All categories</option>
                {catData.imported.map((c) => (
                  <option key={c.name} value={c.name} className="capitalize">{c.name}</option>
                ))}
              </select>

              <select
                value={subcategory}
                onChange={(e) => { setSubcategory(e.target.value); setPage(0); }}
                disabled={catData.subcategories.length === 0}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 min-w-35 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">All subcategories</option>
                {catData.subcategories.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>

              <select
                value={severity}
                onChange={(e) => { setSeverity(e.target.value); setPage(0); }}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand/50 min-w-35"
              >
                <option value="">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-500">
                  <Loader2 size={20} className="animate-spin mr-2" /> Loading…
                </div>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                  <Shield size={32} className="opacity-20" />
                  <p className="text-sm">
                    {catData.imported.length === 0
                      ? "No CTI rules — import a category via \"Manage Categories\"."
                      : "No rules match the current filters."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800/60">
                          {exportMode && <th className="w-10 px-4 py-3" />}
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">Title</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Category</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Subcategory</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Severity</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">MITRE Techniques</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Author</th>
                          <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule) => {
                          const isSelected = selectedRuleIds.has(rule.IdRegle);
                          const rowBg = exportMode && isSelected
                            ? "bg-amber-950/30 hover:bg-amber-950/40"
                            : "hover:bg-gray-800/30";
                          return (
                            <tr
                              key={rule.IdRegle}
                              onClick={() => exportMode ? toggleRuleSelection(rule.IdRegle) : openDetail(rule)}
                              className={`border-b border-gray-800/30 last:border-0 cursor-pointer transition-colors ${rowBg}`}
                            >
                              {exportMode && (
                                <td className="px-4 py-3.5">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-amber-500 border-amber-500" : "border-gray-600"}`}>
                                    {isSelected && (
                                      <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                </td>
                              )}
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
                                <SubCategoryBadge sub={rule.SousCategorie} />
                              </td>
                              <td className="px-4 py-3.5">
                                <SeverityBadge level={rule.Severite} />
                              </td>
                              <td className="px-4 py-3.5">
                                <MitreBadges raw={rule.TechniquesMitre} />
                              </td>
                              <td className="px-4 py-3.5 text-gray-400 text-xs max-w-35 truncate">
                                {rule.Auteur ?? "—"}
                              </td>
                              <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                                {fmtDate(rule.DerniereModification ?? rule.DateAjout)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800/60">
                      <p className="text-xs text-gray-500">
                        {pageStart}–{pageEnd} of {total} rules
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
          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CONSULTANTS TAB                                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "consultants" && (
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
            {consultantLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading…
              </div>
            ) : consultantRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                <Users size={32} className="opacity-20" />
                <p className="text-sm">No consultant rules yet.</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800/60">
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">Name</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Severity</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">MITRE Techniques</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Consultant</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Wazuh ID</th>
                    <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Creation Date</th>
                  </tr>
                </thead>
                <tbody>
                  {consultantRules.map((rule: ConsultantRule) => (
                    <tr
                      key={rule.id}
                      onClick={() => setXmlPreview({
                        title:    rule.nom,
                        xml:      rule.xml,
                        severite: rule.severite,
                        rows: [
                          ...(rule.description ? [{ label: "Description", value: rule.description }] : []),
                          { label: "Consultant",     value: rule.consultantName },
                          { label: "Wazuh ID",       value: rule.wazuhRuleId ? `#${rule.wazuhRuleId}` : "—" },
                          { label: "Creation Date",  value: fmtDate(rule.dateCreation) },
                        ],
                      })}
                      className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-white font-medium">{rule.nom}</p>
                        {rule.description && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{rule.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <SeverityBadge level={rule.severite} />
                      </td>
                      <td className="px-4 py-3.5">
                        <MitreBadgesFromXml xml={rule.xml} />
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-gray-600" />
                          {rule.consultantName}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs font-mono">
                        {rule.wazuhRuleId ? `#${rule.wazuhRuleId}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(rule.dateCreation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* APPRENANTS TAB                                             */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "apprenants" && (
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
            {approvedLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading…
              </div>
            ) : approvedRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
                <GraduationCap size={32} className="opacity-20" />
                <p className="text-sm">No approved rules yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Action</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">MITRE Techniques</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Learner</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Approved by</th>
                      <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-4 py-3">Approval Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRules.map((rule) => (
                      <tr
                        key={rule.id}
                        onClick={() => setXmlPreview({
                          title: rule.ruleName,
                          xml:   rule.xml,
                          rows: [
                            { label: "File",         value: rule.filename },
                            { label: "Learner",      value: rule.submittedBy },
                            { label: "Submitted on", value: fmtDate(rule.submittedAt) },
                            { label: "Approved by",  value: rule.reviewedBy ?? "—" },
                            ...(rule.comment ? [{ label: "Comment", value: rule.comment }] : []),
                          ],
                        })}
                        className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-white font-medium">{rule.ruleName}</p>
                          <p className="text-gray-600 text-xs font-mono mt-0.5">{rule.filename}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${rule.action === "create"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-blue-500/10 text-blue-400"
                            }`}
                          >
                            {rule.action === "create" ? "Creation" : "Update"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <MitreBadgesFromXml xml={rule.xml} />
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap size={11} className="text-gray-600" />
                            {rule.submittedBy}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={11} className="text-green-600" />
                            {rule.reviewedBy ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {fmtDate(rule.reviewedAt ?? null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CTI detail modal ────────────────────────────────────────── */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {detailLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={20} className="animate-spin mr-2" /> Loading…
              </div>
            ) : detail && (
              <>
                <div className="flex items-start justify-between p-5 border-b border-gray-800/60">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CategoryBadge cat={detail.Categorie} />
                      {detail.SousCategorie && <SubCategoryBadge sub={detail.SousCategorie} />}
                      <SeverityBadge level={detail.Severite} />
                      {detail.NiveauWazuh != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                          Wazuh lv.{detail.NiveauWazuh}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white leading-snug">
                      {detail.Titre ?? "Untitled"}
                    </h2>
                    {detail.IdSigma && (
                      <p className="text-xs text-gray-600 font-mono mt-0.5">{detail.IdSigma}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDetail(null)}
                    className="text-gray-500 hover:text-white transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                  {detail.Description && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <FileText size={11} /> Description
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">{detail.Description}</p>
                    </div>
                  )}

                  {detail.TechniquesMitre && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                        <Tag size={11} /> MITRE ATT&amp;CK Techniques
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

                  <div className="grid grid-cols-2 gap-3">
                    {detail.Auteur && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                          <User size={11} /> Author
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
                          Added: {fmtDate(detail.DateAjout)}
                          {detail.DerniereModification && (
                            <> · Modified: {fmtDate(detail.DerniereModification)}</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {(detail.YamlSigmaOriginal || detail.XmlWazuh) && (
                    <div>
                      <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
                        ⚠️ The automatic translation to Wazuh XML may not be fully faithful to the original Sigma rule. Verify before any deployment.
                      </p>
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

      {/* ── XML preview modal (consultants + apprenants) ─────────────── */}
      {xmlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-start justify-between p-5 border-b border-gray-800/60">
              <div className="flex-1 pr-4">
                {xmlPreview.severite && (
                  <div className="mb-1.5">
                    <SeverityBadge level={xmlPreview.severite} />
                  </div>
                )}
                <h2 className="text-base font-bold text-white leading-snug">{xmlPreview.title}</h2>
              </div>
              <button
                onClick={() => setXmlPreview(null)}
                className="text-gray-500 hover:text-white transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {xmlPreview.rows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                    {row.label}
                  </p>
                  <p className="text-sm text-gray-300">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                  <Download size={11} /> XML Wazuh
                </p>
                <CodeBlock content={xmlPreview.xml} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage categories modal (admin) ─────────────────────────── */}
      {isAdmin && showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800/60">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-brand" />
                <h2 className="text-base font-bold text-white">CTI Category Management</h2>
              </div>
              <button
                onClick={() => { setShowManage(false); setImportMsg(null); }}
                disabled={!!importing}
                className="text-gray-500 hover:text-white transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-2">
              {importMsg && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-sm mb-3
                  ${importMsg.ok
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {importMsg.ok
                    ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                    : <AlertCircle  size={15} className="mt-0.5 shrink-0" />
                  }
                  {importMsg.text}
                </div>
              )}

              {importing && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 mb-2">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  Importing &quot;{importing}&quot; — this may take a few minutes…
                </div>
              )}

              {catLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 size={18} className="animate-spin mr-2" />
                </div>
              ) : (
                ALL_CATEGORIES.map((cat) => {
                  const imported    = catData.imported.find((i) => i.name === cat);
                  const isImporting = importing === cat;
                  const catMeta     = CATEGORY_META[cat] ?? { color: "text-gray-400", bg: "bg-gray-500/10" };

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
                            {imported.count} rule{imported.count !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">Not imported</span>
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
                        {isImporting ? "Importing…" : imported ? "Refresh" : "Import"}
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
