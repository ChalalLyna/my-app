"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { MOCK_MISSIONS, MISSION_TASKS, Mission, MissionType, MissionStatus } from "@/app/data/missions";
import {
  Flag, Plus, X, ChevronRight, Calendar,
  Monitor, CheckCircle, Circle, Clock,
  Search, Filter, ArrowRight, FileText,
  Crosshair, Shield, Eye, ClipboardList,
} from "lucide-react";
 
// ─── Constants ────────────────────────────────────────────────────────────────
 
const STATUS_STYLES: Record<MissionStatus, { text: string; bg: string; border: string; dot: string }> = {
  "Terminée":  { text: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/40", dot: "bg-emerald-500" },
  "En cours":  { text: "text-blue-400",    bg: "bg-blue-900/20",    border: "border-blue-800/40",    dot: "bg-blue-500"    },
  "Planifiée": { text: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-800/40",   dot: "bg-amber-400"   },
  "Échouée":   { text: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-800/40",     dot: "bg-red-500"     },
};
 
const TYPE_STYLES: Record<MissionType, { text: string; bg: string; border: string; icon: React.ComponentType<any> }> = {
  "Red Team":    { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/40",    icon: Crosshair  },
  "Blue Team":   { text: "text-blue-400",   bg: "bg-blue-900/20",   border: "border-blue-800/40",   icon: Shield     },
  "Purple Team": { text: "text-purple-400", bg: "bg-purple-900/20", border: "border-purple-800/40", icon: Eye        },
  "Audit":       { text: "text-amber-400",  bg: "bg-amber-900/20",  border: "border-amber-800/40",  icon: ClipboardList },
};
 
const MISSION_TYPES: MissionType[] = ["Red Team", "Blue Team", "Purple Team", "Audit"];
 
// Group tasks by category for the form
const TASK_CATEGORIES = Array.from(new Set(MISSION_TASKS.map(t => t.category)));
 
// ─── Create Mission Drawer ────────────────────────────────────────────────────
 
interface CreateMissionDrawerProps {
  onClose: () => void;
  onCreate: (mission: Mission) => void;
}
 
function CreateMissionDrawer({ onClose, onCreate }: CreateMissionDrawerProps) {
  const [name, setName]         = useState("");
  const [type, setType]         = useState<MissionType>("Purple Team");
  const [target, setTarget]     = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
 
  const toggleTask = (id: string) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };
 
  const canCreate = name.trim().length > 0 && selectedTasks.length > 0;
 
  const handleCreate = () => {
    if (!canCreate) return;
    const newMission: Mission = {
      id: `M${String(MOCK_MISSIONS.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      type,
      status: "Planifiée",
      tasks: selectedTasks,
      createdAt: new Date().toISOString(),
      target: target.trim() || "Non défini",
      createdBy: "John Doe",
    };
    onCreate(newMission);
    onClose();
  };
 
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={onClose} />
 
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-gray-950 border-l border-gray-800/60 z-40 flex flex-col shadow-2xl">
 
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand/15 rounded-lg flex items-center justify-center">
              <Plus size={15} className="text-brand" />
            </div>
            <div>
              <p className="text-white font-bold">Nouvelle mission</p>
              <p className="text-gray-500 text-xs">Définissez les paramètres et les tâches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>
 
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
 
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Nom de la mission <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Purple Team Q2 2025"
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>
 
          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Type de mission</label>
            <div className="grid grid-cols-2 gap-2">
              {MISSION_TYPES.map(t => {
                const st = TYPE_STYLES[t];
                const Icon = st.icon;
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? `${st.border} ${st.bg} ${st.text}`
                        : "border-gray-800 bg-gray-800/30 text-gray-500 hover:border-gray-700"
                    }`}
                  >
                    <Icon size={15} />
                    <span className="text-sm font-semibold">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>
 
          {/* Target */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Cible(s)</label>
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="Ex: WS-CORP-042, SRV-DC-01"
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>
 
          {/* Tasks */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Tâches <span className="text-red-400">*</span>
              </label>
              {selectedTasks.length > 0 && (
                <span className="text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                  {selectedTasks.length} sélectionnée{selectedTasks.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
 
            {TASK_CATEGORIES.map(category => (
              <div key={category}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 flex items-center gap-1.5">
                  <span className="w-4 h-px bg-gray-800" />
                  {category}
                  <span className="flex-1 h-px bg-gray-800" />
                </p>
                <div className="flex flex-col gap-1.5">
                  {MISSION_TASKS.filter(t => t.category === category).map(task => {
                    const isChecked = selectedTasks.includes(task.id);
                    return (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                          isChecked
                            ? "border-brand/50 bg-brand/5"
                            : "border-gray-800/60 bg-gray-800/20 hover:border-gray-700 hover:bg-gray-800/40"
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                          isChecked ? "bg-brand border-brand" : "border-gray-600"
                        }`}>
                          {isChecked && (
                            <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isChecked ? "text-white" : "text-gray-300"}`}>
                            {task.label}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{task.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
 
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canCreate
                ? "bg-brand hover:bg-brand-dark text-white shadow-md shadow-brand/20"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            <Flag size={14} />
            Créer la mission
          </button>
        </div>
      </div>
    </>
  );
}
 
// ─── Mission card ─────────────────────────────────────────────────────────────
 
function MissionCard({ mission, onClick }: { mission: Mission; onClick: () => void }) {
  const status = STATUS_STYLES[mission.status];
  const type   = TYPE_STYLES[mission.type];
  const TypeIcon = type.icon;
  const date = new Date(mission.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const taskLabels = mission.tasks.slice(0, 3).map(id => MISSION_TASKS.find(t => t.id === id)?.label ?? id);
 
  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-900 border border-gray-800/60 rounded-2xl p-5 text-left hover:border-gray-700 hover:bg-gray-800/30 transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type.bg} border ${type.border}`}>
            <TypeIcon size={15} className={type.text} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{mission.name}</p>
            <p className="text-[11px] text-gray-600 font-mono">{mission.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.text} ${status.bg} ${status.border}`}>
            {mission.status}
          </span>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>
 
      {/* Info row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1.5">
          <Monitor size={11} className="text-gray-600" />
          <span className="truncate max-w-[140px]">{mission.target}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="text-gray-600" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ClipboardList size={11} className="text-gray-600" />
          <span>{mission.tasks.length} tâches</span>
        </div>
      </div>
 
      {/* Task chips */}
      <div className="flex flex-wrap gap-1.5">
        {taskLabels.map(label => (
          <span key={label} className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-500">
            {label}
          </span>
        ))}
        {mission.tasks.length > 3 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-600">
            +{mission.tasks.length - 3} autres
          </span>
        )}
        {mission.report && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-900/30 border border-indigo-800/40 text-indigo-400 ml-auto">
            <FileText size={9} className="inline mr-1" />
            Rapport dispo
          </span>
        )}
      </div>
    </button>
  );
}
 
// ─── Main page ────────────────────────────────────────────────────────────────
 
export default function MissionPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<Mission[]>(MOCK_MISSIONS);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("Toutes");
 
  const filtered = missions.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                        m.type.toLowerCase().includes(search.toLowerCase()) ||
                        m.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Toutes" || m.status === filterStatus;
    return matchSearch && matchStatus;
  });
 
  const handleCreate = (mission: Mission) => {
    setMissions(prev => [mission, ...prev]);
  };
 
  const stats = {
    total:     missions.length,
    enCours:   missions.filter(m => m.status === "En cours").length,
    terminees: missions.filter(m => m.status === "Terminée").length,
    planifiees:missions.filter(m => m.status === "Planifiée").length,
  };
 
  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-6 min-h-[calc(100vh-3.5rem)]">
 
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Flag size={20} className="text-brand" />
              Missions
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Planifiez, exécutez et analysez vos missions de sécurité
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
          >
            <Plus size={15} />
            Nouvelle mission
          </button>
        </div>
 
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total",      value: stats.total,      color: "text-white",        border: "border-gray-800"         },
            { label: "En cours",   value: stats.enCours,    color: "text-blue-400",     border: "border-blue-800/30"      },
            { label: "Terminées",  value: stats.terminees,  color: "text-emerald-400",  border: "border-emerald-800/30"   },
            { label: "Planifiées", value: stats.planifiees, color: "text-amber-400",    border: "border-amber-800/30"     },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
 
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une mission..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["Toutes", "En cours", "Terminée", "Planifiée", "Échouée"].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === s
                    ? "bg-brand text-white shadow-sm"
                    : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
 
        {/* Mission list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center">
              <Flag size={28} className="text-gray-700" />
            </div>
            <p className="text-white font-bold">Aucune mission trouvée</p>
            <p className="text-gray-500 text-sm">Créez votre première mission avec le bouton ci-dessus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClick={() => router.push(`/mission/${mission.id}`)}
              />
            ))}
          </div>
        )}
      </div>
 
      {/* Create drawer */}
      {showCreate && (
        <CreateMissionDrawer
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </DashboardLayout>
  );
}