"use client";
 
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { MOCK_MISSIONS, MISSION_TASKS, MissionStatus } from "@/app/data/missions";
import {
  ArrowLeft, Flag, Calendar, Monitor, User,
  CheckCircle, Circle, FileText, ShieldAlert,
  Lightbulb, BarChart2, Hash, Clock, AlertTriangle,
  TrendingUp,
} from "lucide-react";
 
const STATUS_STYLES: Record<MissionStatus, string> = {
  "Terminée":  "text-emerald-400 bg-emerald-900/20 border-emerald-800/40",
  "En cours":  "text-blue-400 bg-blue-900/20 border-blue-800/40",
  "Planifiée": "text-amber-400 bg-amber-900/20 border-amber-800/40",
  "Échouée":   "text-red-400 bg-red-900/20 border-red-800/40",
};
 
const TYPE_COLORS: Record<string, string> = {
  "Red Team":    "text-red-400 bg-red-900/20 border-red-800/40",
  "Blue Team":   "text-blue-400 bg-blue-900/20 border-blue-800/40",
  "Purple Team": "text-purple-400 bg-purple-900/20 border-purple-800/40",
  "Audit":       "text-amber-400 bg-amber-900/20 border-amber-800/40",
};
 
const VULN_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/20 border-red-800/40",
  High:     "text-orange-400 bg-orange-900/20 border-orange-800/40",
  Medium:   "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
  Low:      "text-green-400 bg-green-900/20 border-green-800/40",
};
 
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
 
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 font-medium">Score de couverture</p>
    </div>
  );
}
 
export default function MissionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const mission = MOCK_MISSIONS.find(m => m.id === params.id);
 
  if (!mission) {
    return (
      <DashboardLayout>
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Flag size={40} className="text-gray-700" />
          <p className="text-white font-bold text-xl">Mission introuvable</p>
          <button onClick={() => router.push("/mission")} className="text-brand text-sm hover:underline">
            ← Retour aux missions
          </button>
        </div>
      </DashboardLayout>
    );
  }
 
  const taskObjects = mission.tasks.map(tid => MISSION_TASKS.find(t => t.id === tid)!).filter(Boolean);
  const createdDate = new Date(mission.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const completedDate = mission.completedAt
    ? new Date(mission.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
 
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
 
          {mission.status === "Terminée" && (
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all">
              <FileText size={14} />
              Exporter le rapport
            </button>
          )}
        </div>
 
        {/* Meta cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Monitor,  label: "Cible",        value: mission.target },
            { icon: User,     label: "Créée par",     value: mission.createdBy },
            { icon: Calendar, label: "Créée le",      value: createdDate },
            { icon: Clock,    label: completedDate ? "Terminée le" : "Durée estimée", value: completedDate ?? "En cours…" },
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
              <p className="text-sm font-bold text-white">Tâches de la mission</p>
              <span className="ml-auto text-xs text-gray-500">{taskObjects.length} tâches</span>
            </div>
            <div className="flex flex-col gap-2">
              {taskObjects.map(task => (
                <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-800/40 border border-gray-800/40">
                  <CheckCircle size={14} className={mission.status === "Terminée" ? "text-emerald-400 mt-0.5 flex-shrink-0" : "text-gray-700 mt-0.5 flex-shrink-0"} />
                  <div>
                    <p className="text-xs font-semibold text-white">{task.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{task.description}</p>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mt-1 inline-block">{task.category}</span>
                  </div>
                </div>
              ))}
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
                    <p className="text-sm font-bold text-white">Résultats</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <ScoreGauge score={mission.report.score} />
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      {[
                        { label: "TTPs utilisés",         value: mission.report.ttpsUsed.length,    color: "text-indigo-400" },
                        { label: "Alertes générées",      value: mission.report.alertsGenerated,    color: "text-amber-400"  },
                        { label: "Vulnérabilités",        value: mission.report.vulnerabilities.length, color: "text-red-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
 
                  {/* TTPs */}
                  <div className="mt-4 pt-4 border-t border-gray-800/40">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">TTPs simulés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mission.report.ttpsUsed.map(t => (
                        <span key={t} className="font-mono text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
 
                {/* Summary */}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={15} className="text-brand" />
                    <p className="text-sm font-bold text-white">Résumé exécutif</p>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{mission.report.summary}</p>
                </div>
 
                {/* Vulnerabilities */}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert size={15} className="text-red-400" />
                    <p className="text-sm font-bold text-white">Vulnérabilités identifiées</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {mission.report.vulnerabilities.map((v, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800/40">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5 ${VULN_COLORS[v.severity]}`}>
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
 
                {/* Recommendations */}
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={15} className="text-amber-400" />
                    <p className="text-sm font-bold text-white">Recommandations</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {mission.report.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-amber-900/30 border border-amber-800/40 text-amber-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-gray-800/60 flex items-center justify-center">
                  <FileText size={28} className="text-gray-700" />
                </div>
                <p className="text-white font-bold">Rapport non disponible</p>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                  {mission.status === "Planifiée"
                    ? "La mission n'a pas encore démarré. Le rapport sera disponible une fois la mission terminée."
                    : "La mission est en cours. Le rapport sera généré à la fin de la mission."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}