"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import HelpPanel from "@/app/components/HelpPanel";
import { RULE_TUNING_HELP } from "@/app/config/helpContent";
import { useAuth } from "@/app/context/AuthContext";
import { WazuhRule, XML_TEMPLATE } from "@/app/data/rules";
import {
  ArrowLeft, Plus, Search, Sliders,
  CheckCircle, XCircle, Edit2, Trash2,
  Save, X, AlertTriangle,
  Code2, Info, Hash, Shield, BookOpen, Loader2, RefreshCw, RotateCcw,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50"    },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50"  },
};

// ─── XML syntax highlighting ──────────────────────────────────────────────────

function renderXml(code: string) {
  return code.split("\n").map((line, i) => {
    const trimmed = line.trim();
    let cls = "text-gray-300";
    if (trimmed.startsWith("<!--"))    cls = "text-gray-600 italic";
    else if (trimmed.startsWith("</")) cls = "text-indigo-400/70";
    else if (trimmed.startsWith("<"))  cls = "text-indigo-300";
    return (
      <div key={i} className="flex">
        <span className="select-none text-gray-700 mr-4 text-right w-7 shrink-0">{i + 1}</span>
        <span className={cls}>{line || " "}</span>
      </div>
    );
  });
}

// ─── Restart confirmation modal ───────────────────────────────────────────────

type PendingAction = {
  type: "create" | "modify" | "delete";
  filename: string;
  originalXml: string | null;
};

interface RestartModalProps {
  action: PendingAction;
  restarting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function RestartConfirmModal({ action, restarting, error, onConfirm, onCancel }: RestartModalProps) {
  const label =
    action.type === "create" ? "créée" :
    action.type === "modify" ? "modifiée" : "supprimée";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-950 border border-gray-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-600/15 flex items-center justify-center shrink-0">
            <RotateCcw size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Redémarrer Wazuh Manager ?</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              Règle {label} · <span className="font-mono">{action.filename}</span>
            </p>
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          La règle a été <span className="text-white font-semibold">{label}</span> dans Wazuh.
          Un <span className="text-white font-semibold">redémarrage du Manager</span> est nécessaire pour appliquer les changements.
        </p>
        <p className="text-amber-400/80 text-xs mb-5">
          Si vous refusez, la modification sera <span className="font-semibold">annulée et restaurée</span> à son état précédent.
        </p>

        {error && (
          <div className="flex items-start gap-2 p-2.5 bg-red-900/20 border border-red-800/40 rounded-xl mb-4">
            <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={restarting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            Non — Annuler les changements
          </button>
          <button
            onClick={onConfirm}
            disabled={restarting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all disabled:opacity-40"
          >
            {restarting
              ? <><Loader2 size={14} className="animate-spin" /> Redémarrage...</>
              : <><RotateCcw size={14} /> Oui — Redémarrer</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── XML Editor panel ─────────────────────────────────────────────────────────

interface EditorPanelProps {
  rule: WazuhRule | null;
  onSave: (xml: string, meta: { description: string; level: number; groups: string }) => void;
  onCancel: () => void;
  saving: boolean;
  saveError: string | null;
}

function EditorPanel({ rule, onSave, onCancel, saving, saveError }: EditorPanelProps) {
  const isNew    = rule === null;
  const isSystem = rule ? !rule.relativeDirname.includes("etc") : false;

  const [xml,         setXml]         = useState(rule?.xml ?? XML_TEMPLATE);
  const [description, setDescription] = useState(rule?.description ?? "");
  const [level,       setLevel]       = useState(rule?.level ?? 7);
  const [groups,      setGroups]      = useState(rule?.groups.join(", ") ?? "cyberlab");

  const preRef = useRef<HTMLPreElement>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand/15 rounded-lg flex items-center justify-center">
            <Code2 size={15} className="text-brand" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {isNew ? "Nouvelle règle" : `Modifier — ${rule.name}`}
            </p>
            <p className="text-gray-500 text-[11px]">Format XML · Wazuh</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <X size={15} />
        </button>
      </div>

      {isSystem && (
        <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-amber-900/15 border border-amber-800/30 rounded-xl shrink-0">
          <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-500/80">
            Règle système — la modification créera <span className="font-mono">cyberlab_override_{rule?.wazuhId}.xml</span> dans Wazuh.
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: metadata */}
        <div className="w-64 border-r border-gray-800/60 flex flex-col gap-4 p-5 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Métadonnées</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Description de la règle..."
              className="bg-gray-800/60 border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Niveau Wazuh (0–15)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={0} max={15}
                value={level}
                onChange={e => setLevel(Math.min(15, Math.max(0, Number(e.target.value))))}
                className="w-20 bg-gray-800/60 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand transition-all"
              />
              <span className={`text-xs font-bold ${
                level >= 12 ? "text-red-400" : level >= 8 ? "text-orange-400" : level >= 4 ? "text-yellow-400" : "text-green-400"
              }`}>
                {level >= 12 ? "Critical" : level >= 8 ? "High" : level >= 4 ? "Medium" : "Low"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Groupes (virgule)</label>
            <input
              value={groups}
              onChange={e => setGroups(e.target.value)}
              placeholder="cyberlab, custom"
              className="bg-gray-800/60 border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand transition-all"
            />
          </div>

          <div className="mt-auto p-3 bg-gray-800/30 border border-gray-800/40 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Référence XML</p>
            </div>
            <div className="space-y-1.5 text-[10px] text-gray-500 font-mono">
              {[
                ["<description>", "texte de la règle"],
                ["<if_sid>",      "règle parente"],
                ["<regex>",       "expression régulière"],
                ["<match>",       "correspondance texte"],
                ["<field>",       "champ du log"],
                ["<group>",       "catégorie"],
              ].map(([tag, desc]) => (
                <div key={tag} className="flex gap-2">
                  <span className="text-indigo-400 shrink-0">{tag}</span>
                  <span className="text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: XML editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800/40 bg-gray-900/60 shrink-0">
            <div className="px-3 py-1 rounded-md bg-gray-800 text-xs text-gray-300 font-mono">rule.xml</div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <pre
              ref={preRef}
              className="absolute inset-0 p-4 font-mono text-xs leading-relaxed overflow-hidden pointer-events-none select-none"
            >
              {renderXml(xml)}
            </pre>
            <textarea
              value={xml}
              onChange={e => setXml(e.target.value)}
              onScroll={e => {
                if (preRef.current) {
                  preRef.current.scrollTop  = e.currentTarget.scrollTop;
                  preRef.current.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-xs leading-relaxed p-4 resize-none focus:outline-none selection:bg-brand/30 overflow-auto"
              style={{ caretColor: "#a5b4fc" }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/60 shrink-0">
        <div className="flex flex-col gap-1">
          {isNew && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertTriangle size={12} className="text-amber-500" />
              Les nouvelles règles seront actives après le redémarrage.
            </div>
          )}
          {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(xml, { description, level, groups })}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              !saving ? "bg-brand hover:bg-brand-dark text-white shadow-md shadow-brand/20" : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? "Créer dans Wazuh" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rule card ────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: WazuhRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  loadingEdit: boolean;
}

function RuleCard({ rule, onEdit, onToggle, onDelete, loadingEdit }: RuleCardProps) {
  const sev = SEVERITY_STYLES[rule.severity];
  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group ${rule.status === "inactive" ? "opacity-50" : ""}`}>
      <button onClick={onToggle} title={rule.status === "active" ? "Désactiver" : "Activer"} className="shrink-0">
        {rule.status === "active"
          ? <CheckCircle size={17} className="text-emerald-400 hover:text-emerald-300 transition-colors" />
          : <XCircle    size={17} className="text-gray-600 hover:text-gray-400 transition-colors" />
        }
      </button>
      <span className="text-[10px] font-mono text-gray-600 shrink-0 w-14">{rule.wazuhId}</span>
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 w-16 text-center ${sev.text} ${sev.bg} ${sev.border}`}>
        {rule.severity}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{rule.name}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{rule.groups.join(", ") || "—"}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-16">
        <Hash size={11} className="text-gray-600" />
        <span className="text-xs font-mono text-brand">L{rule.level}</span>
      </div>
      <span className="text-xs text-gray-600 shrink-0 w-48 truncate font-mono">{rule.filename || "—"}</span>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          disabled={loadingEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
        >
          {loadingEdit ? <Loader2 size={12} className="animate-spin" /> : <Edit2 size={12} />}
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── CTI Modal ────────────────────────────────────────────────────────────────

function CtiModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-950 border border-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/15 flex items-center justify-center">
            <BookOpen size={16} className="text-amber-400" />
          </div>
          <h3 className="text-white font-bold">Règles CTI</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          Bibliothèque de règles CTI (Cyber Threat Intelligence) pour aider l'apprenant à écrire des règles de détection et s'inspirer d'exemples concrets.
          <span className="block mt-2 text-amber-400 font-semibold">À implémenter.</span>
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RuleTuningPage() {
  const { user } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isApprenant  = user?.role === "apprenant";

  const [rules,          setRules]          = useState<WazuhRule[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [apiError,       setApiError]       = useState<string | null>(null);
  const [total,          setTotal]          = useState(0);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState<"all" | "active" | "inactive">("all");
  const [editorTarget,   setEditorTarget]   = useState<WazuhRule | null | undefined>(undefined);
  const [loadingEdit,    setLoadingEdit]    = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [showCti,        setShowCti]        = useState(false);
  const [pendingRestart, setPendingRestart] = useState<PendingAction | null>(null);
  const [restarting,     setRestarting]     = useState(false);
  const [restartError,   setRestartError]   = useState<string | null>(null);

  const fetchRules = useCallback(async (q: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res  = await fetch(`/api/wazuh/rules?search=${encodeURIComponent(q)}&limit=100`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRules(data.rules ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      setApiError(err.message);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync search param from URL on mount
  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearch(s);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open editor when ?editRule=id is present — reactive so it works even if
  // the component stays mounted across navigations (Next.js App Router)
  const editId = searchParams.get("editRule");
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const res  = await fetch(`/api/wazuh/rules/${encodeURIComponent(editId)}`);
        const data = await res.json();
        if (res.ok) {
          setSaveError(null);
          setEditorTarget({
            id:              data.id,
            wazuhId:         data.wazuhId,
            name:            data.name,
            description:     data.description,
            level:           data.level,
            severity:        data.severity,
            status:          data.status,
            groups:          data.groups,
            filename:        data.filename,
            relativeDirname: data.relativeDirname,
            xml:             data.xml ?? XML_TEMPLATE,
          });
        }
      } catch { /* silently ignore */ }
    })();
  }, [editId]);

  // Debounced search → fetch
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRules(search), 500);
    return () => clearTimeout(debounceRef.current);
  }, [search, fetchRules]);

  const filtered = rules.filter(r =>
    filterStatus === "all" || r.status === filterStatus
  );

  const handleToggle = (id: string) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r
    ));
  };

  const handleDelete = async (rule: WazuhRule) => {
    const isCustom = rule.relativeDirname.includes("etc");
    if (!isCustom) {
      alert("Les règles système Wazuh ne peuvent pas être supprimées depuis cette interface.");
      return;
    }
    if (!confirm(`Supprimer "${rule.name}" (${rule.filename}) ?`)) return;

    // Fetch original XML for rollback before deleting
    let originalXml: string | null = null;
    try {
      const r = await fetch(`/api/wazuh/rules/${encodeURIComponent(rule.id)}`);
      const d = await r.json();
      if (r.ok) originalXml = d.xml ?? null;
    } catch { /* ignore */ }

    try {
      const res = await fetch(`/api/wazuh/rules?filename=${encodeURIComponent(rule.filename)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        alert(`Erreur : ${d.error}`);
        return;
      }
      setRules(prev => prev.filter(r => r.id !== rule.id));
      setPendingRestart({ type: "delete", filename: rule.filename, originalXml });
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleEdit = async (rule: WazuhRule) => {
    setLoadingEdit(rule.id);
    try {
      const res  = await fetch(`/api/wazuh/rules/${encodeURIComponent(rule.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setEditorTarget({ ...rule, xml: data.xml ?? XML_TEMPLATE });
    } catch {
      setEditorTarget({ ...rule, xml: XML_TEMPLATE });
    } finally {
      setLoadingEdit(null);
    }
  };

  const handleSave = async (
    xml: string,
    _meta: { description: string; level: number; groups: string }
  ) => {
    setSaving(true);
    setSaveError(null);

    const isNew      = editorTarget === null;
    const originalXml = (!isNew && editorTarget?.xml) ? editorTarget.xml : null;

    let filename: string;
    if (isNew) {
      filename = `cyberlab_${Date.now()}.xml`;
    } else if (editorTarget!.relativeDirname.includes("etc")) {
      filename = editorTarget!.filename;
    } else {
      filename = `cyberlab_override_${editorTarget!.wazuhId}.xml`;
    }

    try {
      const res = await fetch("/api/wazuh/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, xml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setEditorTarget(undefined);
      fetchRules(search);
      setPendingRestart({ type: isNew ? "create" : "modify", filename, originalXml });
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRestart = async () => {
    setRestarting(true);
    setRestartError(null);
    try {
      const res  = await fetch("/api/wazuh/restart", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPendingRestart(null);
      fetchRules(search);
    } catch (err: any) {
      setRestartError(err.message);
    } finally {
      setRestarting(false);
    }
  };

  const handleCancelRestart = async () => {
    if (!pendingRestart) return;
    const { type, filename, originalXml } = pendingRestart;

    try {
      if (type === "create") {
        // Delete the newly created file
        await fetch(`/api/wazuh/rules?filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      } else if ((type === "modify" || type === "delete") && originalXml) {
        // Restore original XML
        await fetch("/api/wazuh/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, xml: originalXml }),
        });
      }
    } catch { /* best effort */ }

    setPendingRestart(null);
    fetchRules(search);
  };

  const activeCount   = rules.filter(r => r.status === "active").length;
  const inactiveCount = rules.filter(r => r.status === "inactive").length;
  const isEditorOpen  = editorTarget !== undefined;

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col min-h-[calc(100vh-3.5rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/detection")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={14} />
              Detection
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <Sliders size={20} className="text-brand" />
                Rule Tuning
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {total > 0 ? `${total} règles Wazuh · ${activeCount} actives` : "Règles Wazuh"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCti(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/15 border border-amber-700/30 text-amber-400 hover:bg-amber-600/25 text-sm font-semibold transition-all"
            >
              <BookOpen size={15} />
              Règles CTI
            </button>
            <button
              onClick={() => { setSaveError(null); setEditorTarget(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
            >
              <Plus size={15} />
              Nouvelle règle
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",     value: total,        color: "text-white",       border: "border-gray-800"       },
            { label: "Actives",   value: activeCount,  color: "text-emerald-400", border: "border-emerald-800/30" },
            { label: "Inactives", value: inactiveCount,color: "text-gray-500",    border: "border-gray-800"       },
            { label: "Critical",  value: rules.filter(r => r.severity === "Critical").length, color: "text-red-400", border: "border-red-800/30" },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className={`bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col ${isEditorOpen ? "min-h-150" : ""}`}>
          {isEditorOpen ? (
            <EditorPanel
              rule={editorTarget}
              onSave={handleSave}
              onCancel={() => { setEditorTarget(undefined); setSaveError(null); }}
              saving={saving}
              saveError={saveError}
            />
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher une règle, ID, groupe..."
                    className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(["all", "active", "inactive"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        filterStatus === f
                          ? "bg-brand text-white shadow-sm"
                          : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                      }`}
                    >
                      {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Inactives"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fetchRules(search)}
                  disabled={loading}
                  className="p-2 rounded-xl bg-gray-800 border border-gray-700/60 text-gray-400 hover:text-white hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-800/40 bg-gray-900/60 shrink-0">
                <span className="w-5 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-14">ID</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16">Sévérité</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex-1">Règle / Groupes</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16">Niveau</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-48">Fichier</span>
                <span className="w-28 shrink-0" />
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-gray-600">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Chargement des règles Wazuh...</span>
                  </div>
                ) : apiError ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertTriangle size={28} className="text-red-500/60" />
                    <p className="text-sm text-red-400">Erreur Manager API : {apiError}</p>
                    <button onClick={() => fetchRules(search)} className="text-xs text-gray-400 hover:text-white underline">
                      Réessayer
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                    <Shield size={32} className="text-gray-700" />
                    <p className="text-sm">Aucune règle trouvée</p>
                  </div>
                ) : (
                  filtered.map(rule => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={() => handleEdit(rule)}
                      onToggle={() => handleToggle(rule.id)}
                      onDelete={() => handleDelete(rule)}
                      loadingEdit={loadingEdit === rule.id}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isApprenant && (
        <HelpPanel title="Guide — Rule Tuning" sections={RULE_TUNING_HELP} />
      )}

      {showCti && <CtiModal onClose={() => setShowCti(false)} />}

      {pendingRestart && (
        <RestartConfirmModal
          action={pendingRestart}
          restarting={restarting}
          error={restartError}
          onConfirm={handleConfirmRestart}
          onCancel={handleCancelRestart}
        />
      )}
    </DashboardLayout>
  );
}
