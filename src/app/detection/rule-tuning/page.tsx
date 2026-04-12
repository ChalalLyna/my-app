"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import HelpPanel from "@/app/components/HelpPanel";
import { RULE_TUNING_HELP } from "@/app/config/helpContent";
import { useAuth } from "@/app/context/AuthContext";
import { MOCK_RULES, YAML_TEMPLATE, DetectionRule, RuleSeverity } from "@/app/data/rules";
import {
  ArrowLeft, Plus, Search, Sliders,
  CheckCircle, XCircle, Edit2, Trash2,
  ChevronRight, Save, X, AlertTriangle,
  Code2, Info, Hash, Shield,
} from "lucide-react";
 
// ─── Constants ────────────────────────────────────────────────────────────────
 
const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  Critical: { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/50"    },
  High:     { text: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-800/50" },
  Medium:   { text: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/50" },
  Low:      { text: "text-green-400",  bg: "bg-green-900/20",  border: "border-green-800/50"  },
};
 
// ─── YAML Editor panel ────────────────────────────────────────────────────────
 
interface EditorPanelProps {
  rule: DetectionRule | null; // null = new rule
  onSave: (yaml: string, meta: Partial<DetectionRule>) => void;
  onCancel: () => void;
}
 
function EditorPanel({ rule, onSave, onCancel }: EditorPanelProps) {
  const isNew = rule === null;
  const [yaml, setYaml] = useState(rule?.yaml ?? YAML_TEMPLATE);
  const [name, setName] = useState(rule?.name ?? "");
  const [severity, setSeverity] = useState<RuleSeverity>(rule?.severity ?? "Medium");
  const [description, setDescription] = useState(rule?.description ?? "");
 
  // Very basic YAML syntax highlighting via line coloring
  const renderYaml = (code: string) =>
    code.split("\n").map((line, i) => {
      let cls = "text-gray-300";
      if (line.trim().startsWith("#"))        cls = "text-gray-600 italic";
      else if (line.match(/^[a-zA-Z_]+:/))   cls = "text-indigo-300";
      else if (line.includes(": "))           cls = "text-gray-300";
      else if (line.trim().startsWith("- "))  cls = "text-emerald-300/80";
      return (
        <div key={i} className="flex">
          <span className="select-none text-gray-700 mr-4 text-right w-7 flex-shrink-0">{i + 1}</span>
          <span className={cls}>{line || " "}</span>
        </div>
      );
    });
 
  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand/15 rounded-lg flex items-center justify-center">
            <Code2 size={15} className="text-brand" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {isNew ? "Nouvelle règle" : `Modifier — ${rule.name}`}
            </p>
            <p className="text-gray-500 text-[11px]">Format Sigma YAML</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <X size={15} />
        </button>
      </div>
 
      <div className="flex-1 flex overflow-hidden">
        {/* Left: metadata form */}
        <div className="w-64 border-r border-gray-800/60 flex flex-col gap-4 p-5 flex-shrink-0 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Métadonnées</p>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Nom</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom de la règle..."
              className="bg-gray-800/60 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Sévérité</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["Critical","High","Medium","Low"] as RuleSeverity[]).map(s => {
                const st = SEVERITY_STYLES[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      severity === s ? `${st.text} ${st.bg} ${st.border}` : "text-gray-600 bg-gray-800/40 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Description courte de la règle..."
              className="bg-gray-800/60 border border-gray-700/80 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>
 
          {/* Quick reference */}
          <div className="mt-2 p-3 bg-gray-800/30 border border-gray-800/40 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Référence rapide</p>
            </div>
            <div className="space-y-1.5 text-[10px] text-gray-500 font-mono">
              {[
                ["contains", "valeur dans le champ"],
                ["startswith", "commence par"],
                ["endswith", "se termine par"],
                ["re", "regex"],
                ["and not filter", "exclure"],
              ].map(([op, desc]) => (
                <div key={op} className="flex gap-2">
                  <span className="text-indigo-400 flex-shrink-0">|{op}</span>
                  <span className="text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
 
        {/* Right: YAML editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800/40 bg-gray-900/60 flex-shrink-0">
            <div className="px-3 py-1 rounded-md bg-gray-800 text-xs text-gray-300 font-mono">
              rule.yaml
            </div>
          </div>
 
          {/* Textarea over rendered view */}
          <div className="flex-1 relative overflow-hidden">
            {/* Rendered highlight (visual only) */}
            <pre className="absolute inset-0 p-4 font-mono text-xs leading-relaxed overflow-auto pointer-events-none select-none">
              {renderYaml(yaml)}
            </pre>
            {/* Actual textarea (transparent text so highlight shows through) */}
            <textarea
              value={yaml}
              onChange={e => setYaml(e.target.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-xs leading-relaxed p-4 resize-none focus:outline-none selection:bg-brand/30"
              style={{ caretColor: "#a5b4fc" }}
            />
          </div>
        </div>
      </div>
 
      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/60 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <AlertTriangle size={12} className="text-amber-500" />
          Les nouvelles règles sont créées en statut <span className="text-amber-400 font-semibold mx-1">inactive</span> — activez-les après test.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(yaml, { name, severity, description })}
            disabled={!name.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              name.trim()
                ? "bg-brand hover:bg-brand-dark text-white shadow-md shadow-brand/20"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            <Save size={14} />
            {isNew ? "Créer la règle" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Rule card ────────────────────────────────────────────────────────────────
 
interface RuleCardProps {
  rule: DetectionRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}
 
function RuleCard({ rule, onEdit, onToggle, onDelete }: RuleCardProps) {
  const sev = SEVERITY_STYLES[rule.severity];
  const date = new Date(rule.lastModified).toLocaleDateString("fr-FR");
 
  return (
    <div className={`flex items-center gap-4 px-5 py-4 border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group ${!rule.status || rule.status === "inactive" ? "opacity-50" : ""}`}>
      {/* Status toggle */}
      <button
        onClick={onToggle}
        title={rule.status === "active" ? "Désactiver" : "Activer"}
        className="flex-shrink-0"
      >
        {rule.status === "active"
          ? <CheckCircle size={17} className="text-emerald-400 hover:text-emerald-300 transition-colors" />
          : <XCircle    size={17} className="text-gray-600 hover:text-gray-400 transition-colors" />
        }
      </button>
 
      {/* ID */}
      <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-10">{rule.id}</span>
 
      {/* Severity badge */}
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex-shrink-0 w-16 text-center ${sev.text} ${sev.bg} ${sev.border}`}>
        {rule.severity}
      </span>
 
      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{rule.name}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{rule.description}</p>
      </div>
 
      {/* TTP */}
      <div className="flex items-center gap-1.5 flex-shrink-0 w-20">
        <Hash size={11} className="text-gray-600" />
        <span className="text-xs font-mono text-brand">{rule.ttp}</span>
      </div>
 
      {/* Source */}
      <span className="text-xs text-gray-600 flex-shrink-0 w-36 truncate">{rule.source}</span>
 
      {/* Date */}
      <span className="text-xs text-gray-600 flex-shrink-0 w-20">{date}</span>
 
      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-all"
        >
          <Edit2 size={12} />
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
 
// ─── Main page ────────────────────────────────────────────────────────────────
 
export default function RuleTuningPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isApprenant = user?.role === "apprenant";
 
  const [rules, setRules] = useState<DetectionRule[]>(MOCK_RULES);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editorTarget, setEditorTarget] = useState<DetectionRule | null | undefined>(undefined);
  // undefined = editor closed, null = new rule, DetectionRule = edit rule
 
  const filtered = rules.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                        r.ttp.toLowerCase().includes(search.toLowerCase()) ||
                        r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });
 
  const handleToggle = (id: string) => {
    setRules(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === "active" ? "inactive" : "active" } : r
    ));
  };
 
  const handleDelete = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };
 
  const handleSave = (yaml: string, meta: Partial<DetectionRule>) => {
    if (editorTarget === null) {
      // New rule
      const newRule: DetectionRule = {
        id: `R${String(rules.length + 1).padStart(3, "0")}`,
        name: meta.name ?? "Nouvelle règle",
        description: meta.description ?? "",
        severity: meta.severity ?? "Medium",
        status: "inactive",
        ttp: "T????",
        source: "Custom",
        lastModified: new Date().toISOString(),
        yaml,
      };
      setRules(prev => [...prev, newRule]);
    } else if (editorTarget) {
      // Edit existing
      setRules(prev => prev.map(r =>
        r.id === editorTarget.id
          ? { ...r, yaml, name: meta.name ?? r.name, severity: meta.severity ?? r.severity, description: meta.description ?? r.description, lastModified: new Date().toISOString() }
          : r
      ));
    }
    setEditorTarget(undefined);
  };
 
  const activeCount   = rules.filter(r => r.status === "active").length;
  const inactiveCount = rules.filter(r => r.status === "inactive").length;
 
  const isEditorOpen = editorTarget !== undefined;
 
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
                {activeCount} règle{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""} · {inactiveCount} inactive{inactiveCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
 
          <button
            onClick={() => setEditorTarget(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
          >
            <Plus size={15} />
            Nouvelle règle
          </button>
        </div>
 
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",    value: rules.length,   color: "text-white",         border: "border-gray-800" },
            { label: "Actives",  value: activeCount,    color: "text-emerald-400",   border: "border-emerald-800/30" },
            { label: "Inactives",value: inactiveCount,  color: "text-gray-500",      border: "border-gray-800" },
            { label: "Critical", value: rules.filter(r => r.severity === "Critical").length, color: "text-red-400", border: "border-red-800/30" },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
 
        {/* Main panel — list or editor */}
        <div className={`bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col ${isEditorOpen ? "min-h-[600px]" : ""}`}>
          {isEditorOpen ? (
            <EditorPanel
              rule={editorTarget}
              onSave={handleSave}
              onCancel={() => setEditorTarget(undefined)}
            />
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher une règle, TTP, ID..."
                    className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(["all","active","inactive"] as const).map(f => (
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
              </div>
 
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-800/40 bg-gray-900/60">
                <span className="w-5 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-10">ID</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-16">Sévérité</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex-1">Règle</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-20">TTP</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-36">Source</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 w-20">Modifiée</span>
                <span className="w-28 flex-shrink-0" />
              </div>
 
              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
                    <Shield size={32} className="text-gray-700" />
                    <p className="text-sm">Aucune règle trouvée</p>
                  </div>
                ) : (
                  filtered.map(rule => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={() => setEditorTarget(rule)}
                      onToggle={() => handleToggle(rule.id)}
                      onDelete={() => handleDelete(rule.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
 
      {/* HelpPanel — apprenant uniquement */}
      {isApprenant && (
        <HelpPanel
          title="Guide — Rule Tuning"
          sections={RULE_TUNING_HELP}
        />
      )}
    </DashboardLayout>
  );
}