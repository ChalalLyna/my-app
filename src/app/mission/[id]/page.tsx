"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useMission } from "@/app/context/MissionContext";
import { useAuth } from "@/app/context/AuthContext";
import { MissionType, MissionStatus, MissionReport, MISSION_TASKS } from "@/app/data/missions";
import {
  ArrowLeft, Calendar, Monitor, User,
  CheckCircle, FileText, ShieldAlert,
  Lightbulb, BarChart2, Clock,
  LogIn, LogOut, Loader2, AlertCircle,
  Sparkles, X, Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionDetail {
  id:               string;
  name:             string;
  type:             MissionType;
  target:           string;
  status:           MissionStatus;
  tasks:            string[];
  description:      string;
  createdAt:        string | null;
  completedAt:      string | null;
  createdBy:        string;
  attacks:          { id: number; date: string; statut: string }[];
  ttpsUsed:         string[];
  alertsGenerated:  number;
  report:           MissionReport | null;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MissionStatus, string> = {
  "Completed":   "text-emerald-400 bg-emerald-900/20 border-emerald-800/40",
  "In Progress": "text-blue-400 bg-blue-900/20 border-blue-800/40",
  "Planned":     "text-amber-400 bg-amber-900/20 border-amber-800/40",
  "Failed":      "text-red-400 bg-red-900/20 border-red-800/40",
};

const TYPE_COLORS: Record<MissionType, string> = {
  "Red Team":    "text-red-400 bg-red-900/20 border-red-800/40",
  "Blue Team":   "text-blue-400 bg-blue-900/20 border-blue-800/40",
  "Purple Team": "text-purple-400 bg-purple-900/20 border-purple-800/40",
};

const VULN_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/20 border-red-800/40",
  High:     "text-orange-400 bg-orange-900/20 border-orange-800/40",
  Medium:   "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  Low:      "text-green-400 bg-green-900/20 border-green-800/40",
};

// ─── Score gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium">Coverage score</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MissionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { activeMission, enterMission, exitMission } = useMission();
  const { user } = useAuth();

  const [mission, setMission]           = useState<MissionDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState<string | null>(null);
  const [reportModal, setReportModal]   = useState<string | null>(null);
  const [exportedRules, setExportedRules] = useState<{ id: number; titre: string; severite: string; sourceType: string; dateExport: string }[]>([]);
  const [ending, setEnding]             = useState(false);

  const [clientRules, setClientRules] = useState<{ id: number; nom: string | null; description: string | null; severite: string | null; dateImport: string; xml: string | null }[]>([]);
  const [importing, setImporting]     = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const missionId = params.id as string;

  const refreshMission = async () => {
    const r = await fetch(`/api/missions/${missionId}`);
    const d = await r.json();
    if (!d.error) setMission(d);
  };

  const refreshExportedRules = async () => {
    const r = await fetch(`/api/missions/${missionId}/rules/export`);
    const d = await r.json();
    if (Array.isArray(d)) setExportedRules(d);
  };

  const refreshClientRules = async () => {
    const r = await fetch(`/api/missions/${missionId}/rules/client`);
    const d = await r.json();
    if (Array.isArray(d)) setClientRules(d);
  };

  const wazuhLevelToSeverity = (level: string | null): string => {
    const n = parseInt(level ?? "5", 10);
    if (n >= 14) return "Critical";
    if (n >= 10) return "High";
    if (n >= 5)  return "Medium";
    return "Low";
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("Invalid XML file");

      const ruleEls = Array.from(doc.querySelectorAll("rule"));
      if (!ruleEls.length) throw new Error("No <rule> elements found in file");

      const rules = ruleEls.map((el) => {
        const descText = el.querySelector("description")?.textContent?.trim();
        return {
          nom:         descText || `Rule #${el.getAttribute("id") ?? "?"}`,
          description: descText || undefined,
          severite:    wazuhLevelToSeverity(el.getAttribute("level")),
          xml:         el.outerHTML,
        };
      });

      const res = await fetch(`/api/missions/${missionId}/rules/client`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      await refreshClientRules();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import error");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetch(`/api/missions/${missionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMission(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    refreshExportedRules();
    refreshClientRules();
  }, [missionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnterMission = async () => {
    if (!mission) return;
    if (mission.status === "Planned") {
      await fetch(`/api/missions/${missionId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ statut: "In Progress" }),
      });
      setMission((prev) => prev ? { ...prev, status: "In Progress" } : prev);
    }
    enterMission({ id: mission.id, name: mission.name, type: mission.type, status: "In Progress", tasks: mission.tasks, createdAt: mission.createdAt ?? "", target: mission.target, createdBy: mission.createdBy });
  };

  const handleEndMission = async () => {
    if (!mission) return;
    setEnding(true);
    await fetch(`/api/missions/${missionId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ statut: "Completed" }),
    });
    setMission((prev) => prev ? { ...prev, status: "Completed" } : prev);
    if (activeMission?.id === mission.id) exitMission();
    setEnding(false);
  };

  const handleGenerateReport = async () => {
    if (!mission) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res  = await fetch(`/api/missions/${missionId}/report/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error ?? "Error"); return; }
      setReportModal(data.report as string);
      await refreshMission();
    } catch {
      setGenError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 size={28} className="text-brand animate-spin" />
          <p className="text-gray-500 text-sm">Loading mission…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !mission) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-white font-bold text-xl">{error ?? "Mission not found"}</p>
          <button onClick={() => router.push("/mission")} className="text-brand text-sm hover:underline">
            ← Back to missions
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const createdDate  = mission.createdAt
    ? new Date(mission.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const completedDate = mission.completedAt
    ? new Date(mission.completedAt).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const isActiveMission = activeMission?.id === mission.id;
  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push("/mission")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mt-0.5"
            >
              <ArrowLeft size={14} />
              Missions
            </button>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xs font-mono text-gray-600">{mission.id}</span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${TYPE_COLORS[mission.type]}`}>
                  {mission.type}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[mission.status]}`}>
                  {mission.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">{mission.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enter / Exit environment */}
            {mission.status !== "Completed" && (
              isActiveMission ? (
                <button
                  onClick={exitMission}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 text-sm font-semibold transition-all"
                >
                  <LogOut size={14} />
                  Quitter l&apos;environnement
                </button>
              ) : (
                <button
                  onClick={handleEnterMission}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-md shadow-brand/20 transition-all"
                >
                  <LogIn size={14} />
                  Entrer dans l&apos;environnement
                </button>
              )
            )}
            {/* End mission */}
            {mission.status === "In Progress" && (
              <button
                onClick={handleEndMission}
                disabled={ending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {ending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                End mission
              </button>
            )}
            {/* Generate report — not available when Planned */}
            {mission.status !== "Planned" && (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md transition-all"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? "Generating…" : mission.report ? "Regenerate" : "Generate report"}
              </button>
            )}
            {/* View saved report */}
            {mission.report && (
              <button
                onClick={() => setReportModal((mission.report as any).fullReport ?? JSON.stringify(mission.report, null, 2))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
              >
                <FileText size={14} />
                View report
              </button>
            )}
          </div>
        </div>

        {/* Gen error */}
        {genError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
            <AlertCircle size={14} />
            {genError}
          </div>
        )}

        {/* Meta cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Monitor,  label: "Target",     value: mission.target },
            { icon: User,     label: "Created by", value: mission.createdBy || "—" },
            { icon: Calendar, label: "Created on", value: createdDate },
            { icon: Clock,    label: completedDate ? "Completed on" : "Est. duration", value: completedDate ?? "In progress…" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800/60 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} className="text-gray-600" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{label}</p>
              </div>
              <p className="text-sm font-semibold text-white leading-snug">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">

          {/* Tasks */}
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-brand" />
              <p className="text-sm font-bold text-white">Mission tasks</p>
              <span className="ml-auto text-xs text-gray-500">{mission.tasks.length} tasks</span>
            </div>
            <div className="flex flex-col gap-2">
              {mission.tasks.map((taskId) => {
                const task = MISSION_TASKS.find((t) => t.id === taskId);
                return (
                  <div key={taskId} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-800/40 border border-gray-800/40">
                    <CheckCircle size={14} className={mission.status === "Completed" ? "text-emerald-400 mt-0.5 shrink-0" : "text-gray-700 mt-0.5 shrink-0"} />
                    <div>
                      <p className="text-xs font-semibold text-white">{task?.label ?? taskId}</p>
                      {task?.description && <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{task.description}</p>}
                    </div>
                  </div>
                );
              })}
              {mission.tasks.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">No tasks defined</p>
              )}
            </div>
          </div>

          {/* Report — col span 2 */}
          <div className="col-span-2 flex flex-col gap-4">
            {mission.report ? (
              <>
                {/* Score + stats */}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={15} className="text-brand" />
                    <p className="text-sm font-bold text-white">Results</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <ScoreGauge score={mission.report.score} />
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      {[
                        { label: "TTPs used",        value: mission.ttpsUsed.length,         color: "text-indigo-400" },
                        { label: "Alerts generated", value: mission.alertsGenerated,          color: "text-amber-400"  },
                        { label: "Vulnerabilities",  value: mission.report.vulnerabilities.length, color: "text-red-400" },
                      ].map((s) => (
                        <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {mission.ttpsUsed.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-800/40">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">Simulated TTPs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {mission.ttpsUsed.map((t) => (
                          <span key={t} className="font-mono text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={15} className="text-brand" />
                    <p className="text-sm font-bold text-white">Executive summary</p>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{mission.report.summary}</p>
                </div>

                {/* Vulnerabilities */}
                {mission.report.vulnerabilities.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert size={15} className="text-red-400" />
                      <p className="text-sm font-bold text-white">Identified vulnerabilities</p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {mission.report.vulnerabilities.map((v, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800/40">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${VULN_COLORS[v.severity]}`}>
                            {v.severity}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{v.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{v.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {mission.report.recommendations.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb size={15} className="text-amber-400" />
                      <p className="text-sm font-bold text-white">Recommendations</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {mission.report.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                          <span className="w-5 h-5 rounded-full bg-amber-900/30 border border-amber-800/40 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Live stats when no report yet */
              <>
                {(mission.ttpsUsed.length > 0 || mission.alertsGenerated > 0) && (
                  <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 size={15} className="text-brand" />
                      <p className="text-sm font-bold text-white">Live stats</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-indigo-400">{mission.ttpsUsed.length}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">TTPs executed</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400">{mission.alertsGenerated}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Alerts generated</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                    <FileText size={28} className="text-gray-700" />
                  </div>
                  <p className="text-white font-bold">Report not available</p>
                  <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                    {mission.status === "Planned"
                      ? "The mission has not started yet."
                      : "The mission is in progress. The report will be generated when the mission ends."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Client rules import ─────────────────────────────────────── */}
        {mission.tasks.includes("import-rules") && (
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={15} className="text-brand" />
              <p className="text-sm font-bold text-white">Client rules imported</p>
              <span className="ml-auto text-xs text-gray-500">
                {clientRules.length} rule{clientRules.length !== 1 ? "s" : ""}
              </span>
              {user?.role === "consultant" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <button
                    onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all ml-2"
                  >
                    {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {importing ? "Importing…" : "Import client rules"}
                  </button>
                </>
              )}
            </div>

            {importError && (
              <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-xs">
                <AlertCircle size={12} />
                {importError}
              </div>
            )}

            {clientRules.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {clientRules.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-800/40 border border-gray-800/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{r.nom ?? `Rule #${r.id}`}</p>
                      {r.description && (
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {r.severite && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${VULN_COLORS[r.severite] ?? "text-gray-400 bg-gray-800 border-gray-700"}`}>
                            {r.severite}
                          </span>
                        )}
                        {r.xml && <span className="text-[10px] text-gray-600 font-mono">XML</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
                      {r.dateImport ? new Date(r.dateImport).toLocaleDateString("en-US") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">No client rules imported yet.</p>
            )}
          </div>
        )}

        {/* ── Exported rules ──────────────────────────────────────────── */}
        {exportedRules.length > 0 && (
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} className="text-amber-400" />
              <p className="text-sm font-bold text-white">Rules exported to client</p>
              <span className="ml-auto text-xs text-gray-500">{exportedRules.length} rule{exportedRules.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {exportedRules.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800/40 border border-gray-800/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.titre ?? `Rule #${r.id}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.severite && (
                        <span className="text-[10px] font-semibold text-gray-500 capitalize">{r.severite}</span>
                      )}
                      <span className="text-[10px] text-gray-600 capitalize">{r.sourceType}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">{r.dateExport ? new Date(r.dateExport).toLocaleDateString("en-US") : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── AI Report Modal ─────────────────────────────────────────────── */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-violet-400" />
                <p className="text-white font-bold">AI Mission Report</p>
                <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                  Llama 4 Scout
                </span>
              </div>
              <button
                onClick={() => setReportModal(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body — markdown rendered as preformatted */}
            <div className="flex-1 overflow-y-auto px-6 py-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin]">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                {reportModal}
              </pre>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-800/60 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-600">Report saved to this mission</p>
              <button
                onClick={() => {
                  const blob = new Blob([reportModal], { type: "text/markdown" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href     = url;
                  a.download = `mission-report-${mission.id}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-colors"
              >
                <FileText size={13} />
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
