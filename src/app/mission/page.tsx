"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { MISSION_TASKS, Mission, MissionType, MissionStatus } from "@/app/data/missions";
import {
  Flag, Plus, X, ChevronRight, Calendar,
  Monitor, CheckCircle, Lock,
  Search, FileText,
  Crosshair, Shield, Eye,
  Loader2, AlertCircle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MissionStatus, { text: string; bg: string; border: string; dot: string }> = {
  "Completed":   { text: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/40", dot: "bg-emerald-500" },
  "In Progress": { text: "text-blue-400",    bg: "bg-blue-900/20",    border: "border-blue-800/40",    dot: "bg-blue-500"    },
  "Planned":     { text: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-800/40",   dot: "bg-amber-400"   },
  "Failed":      { text: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-800/40",     dot: "bg-red-500"     },
};

const TYPE_STYLES: Record<MissionType, { text: string; bg: string; border: string; icon: React.ComponentType<{ size: number; className?: string }> }> = {
  "Red Team":    { text: "text-red-400",    bg: "bg-red-900/20",    border: "border-red-800/40",    icon: Crosshair },
  "Blue Team":   { text: "text-blue-400",   bg: "bg-blue-900/20",   border: "border-blue-800/40",   icon: Shield    },
  "Purple Team": { text: "text-purple-400", bg: "bg-purple-900/20", border: "border-purple-800/40", icon: Eye       },
};

const MISSION_TYPES: MissionType[] = ["Red Team", "Blue Team", "Purple Team"];

// Tasks auto-included vs selectable per mission type
const TASK_CONFIG: Record<MissionType, { required: string[]; optional: string[] }> = {
  "Purple Team": {
    required: ["import-rules", "replicate-client"],
    optional: ["tune-rules", "review-alerts", "gap-analysis", "export-rules"],
  },
  "Blue Team": {
    required: [],
    optional: ["import-rules", "tune-rules", "export-rules"],
  },
  "Red Team": {
    required: ["replicate-client"],
    optional: ["export-rules"],
  },
};

// ─── Create Mission Drawer ────────────────────────────────────────────────────

interface CreateMissionDrawerProps {
  onClose:  () => void;
  onCreate: (mission: Mission) => void;
}

function CreateMissionDrawer({ onClose, onCreate }: CreateMissionDrawerProps) {
  const [name, setName]                       = useState("");
  const [description, setDescription]         = useState("");
  const [type, setType]                       = useState<MissionType>("Purple Team");
  const [target, setTarget]                   = useState("");
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const config     = TASK_CONFIG[type];
  const allTasks   = [...config.required, ...selectedOptional];
  const canCreate  = name.trim().length > 0 && !submitting;

  const toggleOptional = (id: string) =>
    setSelectedOptional((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const handleTypeChange = (t: MissionType) => {
    setType(t);
    setSelectedOptional([]);
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/missions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        name.trim(),
          type,
          target:      target.trim() || null,
          description: description.trim() || null,
          tasks:       allTasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); setSubmitting(false); return; }

      onCreate({
        id:          data.id,
        name:        name.trim(),
        type,
        status:      "Planned",
        tasks:       allTasks,
        createdAt:   new Date().toISOString(),
        target:      target.trim() || "Not defined",
        createdBy:   "",
        description: description.trim() || undefined,
      } as Mission);
      onClose();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  const getTask = (id: string) => MISSION_TASKS.find((t) => t.id === id);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-gray-950 border-l border-gray-800/60 z-40 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand/15 rounded-lg flex items-center justify-center">
              <Plus size={15} className="text-brand" />
            </div>
            <div>
              <p className="text-white font-bold">New mission</p>
              <p className="text-gray-500 text-xs">Configure the mission parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Mission name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Purple Team Q2 2025 — AcmeCorp"
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Mission type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {MISSION_TYPES.map((t) => {
                const st = TYPE_STYLES[t];
                const Icon = st.icon;
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-center transition-all ${
                      type === t ? `${st.border} ${st.bg} ${st.text}` : "border-gray-800 bg-gray-800/30 text-gray-500 hover:border-gray-700"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-semibold leading-tight">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Client / Target</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Ex: AcmeCorp"
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectives, scope, context…"
              rows={3}
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none"
            />
          </div>

          {/* Tasks */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">Tasks</label>

            {/* Required (auto-included) */}
            {config.required.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <Lock size={9} className="text-gray-600" />
                  Included
                  <span className="flex-1 h-px bg-gray-800" />
                </p>
                {config.required.map((id) => {
                  const task = getTask(id);
                  if (!task) return null;
                  return (
                    <div key={id} className="flex items-start gap-3 p-3 rounded-xl border border-brand/30 bg-brand/5">
                      <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 bg-brand border-2 border-brand">
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{task.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{task.description}</p>
                      </div>
                      <Lock size={11} className="text-gray-600 mt-1 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Optional */}
            {config.optional.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
                  <span className="w-4 h-px bg-gray-800" />
                  Optional
                  <span className="flex-1 h-px bg-gray-800" />
                </p>
                {config.optional.map((id) => {
                  const task = getTask(id);
                  if (!task) return null;
                  const isChecked = selectedOptional.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleOptional(id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                        isChecked ? "border-indigo-600/50 bg-indigo-950/30" : "border-gray-800/60 bg-gray-800/20 hover:border-gray-700"
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                        isChecked ? "bg-indigo-600 border-indigo-600" : "border-gray-600"
                      }`}>
                        {isChecked && (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isChecked ? "text-white" : "text-gray-300"}`}>{task.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{task.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {config.required.length === 0 && config.optional.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-2">No tasks available for this type.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800/60 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              canCreate ? "bg-brand hover:bg-brand-dark text-white shadow-md shadow-brand/20" : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
            {submitting ? "Creating…" : "Create mission"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Mission card ─────────────────────────────────────────────────────────────

function MissionCard({ mission, onClick }: { mission: Mission; onClick: () => void }) {
  const status   = STATUS_STYLES[mission.status];
  const type     = TYPE_STYLES[mission.type];
  const TypeIcon = type.icon;
  const date     = mission.createdAt
    ? new Date(mission.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const taskLabels = mission.tasks.slice(0, 3).map((id) => MISSION_TASKS.find((t) => t.id === id)?.label ?? id);

  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-900 border border-gray-800/60 rounded-2xl p-5 text-left hover:border-gray-700 hover:bg-gray-800/30 transition-all group"
    >
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
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.text} ${status.bg} ${status.border}`}>
            {mission.status}
          </span>
          <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>

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
          <CheckCircle size={11} className="text-gray-600" />
          <span>{mission.tasks.length} tasks</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {taskLabels.map((label) => (
          <span key={label} className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-500">
            {label}
          </span>
        ))}
        {mission.tasks.length > 3 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-gray-800/60 border border-gray-700/40 text-gray-600">
            +{mission.tasks.length - 3} more
          </span>
        )}
        {mission.report && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-900/30 border border-indigo-800/40 text-indigo-400 ml-auto">
            <FileText size={9} className="inline mr-1" />
            Report available
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MissionPage() {
  const router = useRouter();
  const [missions, setMissions]     = useState<Mission[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  useEffect(() => {
    fetch("/api/missions")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMissions(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = missions.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:      missions.length,
    enCours:    missions.filter((m) => m.status === "In Progress").length,
    terminees:  missions.filter((m) => m.status === "Completed").length,
    planifiees: missions.filter((m) => m.status === "Planned").length,
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
            <p className="text-gray-500 text-sm mt-0.5">Plan, execute and analyze your security missions</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
          >
            <Plus size={15} />
            New mission
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total",       value: stats.total,      color: "text-white",       border: "border-gray-800"       },
            { label: "In Progress", value: stats.enCours,    color: "text-blue-400",    border: "border-blue-800/30"    },
            { label: "Completed",   value: stats.terminees,  color: "text-emerald-400", border: "border-emerald-800/30" },
            { label: "Planned",     value: stats.planifiees, color: "text-amber-400",   border: "border-amber-800/30"   },
          ].map((s) => (
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search missions..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["All", "In Progress", "Completed", "Planned", "Failed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === s ? "bg-brand text-white shadow-sm" : "bg-gray-800/60 text-gray-500 hover:text-gray-300 border border-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 size={26} className="text-brand animate-spin" />
            <p className="text-gray-500 text-sm">Loading missions…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <AlertCircle size={26} className="text-red-400" />
            <p className="text-red-400 text-sm font-semibold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center">
              <Flag size={28} className="text-gray-700" />
            </div>
            <p className="text-white font-bold">No missions found</p>
            <p className="text-gray-500 text-sm">Create your first mission using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onClick={() => router.push(`/mission/${mission.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMissionDrawer
          onClose={() => setShowCreate(false)}
          onCreate={(m) => setMissions((prev) => [m, ...prev])}
        />
      )}
    </DashboardLayout>
  );
}
