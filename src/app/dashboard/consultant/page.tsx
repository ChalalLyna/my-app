"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Flag, Crosshair, ClipboardCheck,
  ChevronRight, Loader2, AlertCircle,
  CheckCircle, Circle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  missions:       { total: number; enCours: number; terminees: number; planifiees: number };
  labAttacks:     number;
  pendingReviews: number;
  reviewedByMe:   number;
}

interface MissionRow {
  id: string; name: string; type: string; target: string;
  status: string; createdAt: string | null; completedAt: string | null;
  attackCount: number;
}

interface AttackRow {
  id: number; date: string | null; statut: string;
  mitreID: string; techniqueName: string; actifNom: string;
}

interface ReviewRow {
  id: number; ruleName: string; dateCreation: string;
  severite: string | null; submittedBy: string;
}

interface DashboardData {
  stats:          Stats;
  recentMissions: MissionRow[];
  recentAttacks:  AttackRow[];
  pendingReviews: ReviewRow[];
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const MISSION_STATUS_STYLE: Record<string, { text: string; bg: string; dot: string }> = {
  "Planned":     { text: "text-amber-400",   bg: "bg-amber-500/10",   dot: "bg-amber-400"   },
  "In Progress": { text: "text-blue-400",    bg: "bg-blue-500/10",    dot: "bg-blue-500"    },
  "Completed":   { text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
  "Failed":      { text: "text-red-400",     bg: "bg-red-500/10",     dot: "bg-red-500"     },
};

const MISSION_TYPE_COLOR: Record<string, string> = {
  "Red Team":    "text-red-400 bg-red-500/10 border-red-500/20",
  "Blue Team":   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Purple Team": "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const ATTACK_STATUS_STYLE: Record<string, string> = {
  success:    "text-emerald-400",
  failed:     "text-red-400",
  running:    "text-amber-400",
  terminee:   "text-emerald-400",
  "terminé":  "text-emerald-400",
  "en cours": "text-amber-400",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function MissionDonut({ missions }: { missions: Stats["missions"] }) {
  const segments = [
    { label: "In Progress", value: missions.enCours,   color: "#3b82f6" },
    { label: "Completed",   value: missions.terminees,  color: "#10b981" },
    { label: "Planned",     value: missions.planifiees, color: "#f59e0b" },
  ];

  const total = missions.total;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
        <Flag size={28} className="text-gray-700" />
        <p className="text-xs text-gray-600">No missions created</p>
      </div>
    );
  }

  const r = 38, cx = 56, cy = 56, strokeW = 16;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  const slices = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const dash = (s.value / total) * circumference;
      const slice = { ...s, dash, offset: cumulative };
      cumulative += dash;
      return slice;
    });

  return (
    <div className="flex items-center justify-between gap-4 mt-1">
      {/* SVG donut */}
      <div className="relative shrink-0">
        <svg viewBox="0 0 112 112" className="w-28 h-28 -rotate-90">
          {/* background ring */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeW}
          />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeW}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white leading-none">{total}</p>
          <p className="text-[9px] text-gray-500 mt-0.5">missions</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 flex-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-gray-400 flex-1">{s.label}</span>
            <span className="text-xs font-bold text-white tabular-nums">{s.value}</span>
            <span className="text-[10px] text-gray-600 tabular-nums w-8 text-right">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color, bg, sub,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string; value: number | string; color: string; bg: string;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function ConsultantDashboard() {
  const { user }   = useAuth();
  const router     = useRouter();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/consultant")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const prenom = user?.prenom || user?.name || "Consultant";

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full">
                Consultant
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Here is a summary of your activity on the platform</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={22} className="text-brand animate-spin" />
            <p className="text-gray-500 text-sm">Loading…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {data && (
          <>
            {/* ── KPI cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Flag}
                label="Missions"
                value={data.stats.missions.total}
                color="text-violet-400"
                bg="bg-violet-500/10"
                sub={`${data.stats.missions.enCours} in progress · ${data.stats.missions.terminees} completed`}
              />
              <StatCard
                icon={Crosshair}
                label="Lab Simulations"
                value={data.stats.labAttacks}
                color="text-indigo-400"
                bg="bg-indigo-500/10"
                sub="Out-of-mission attacks"
              />
              <StatCard
                icon={ClipboardCheck}
                label="Rules to Validate"
                value={data.stats.pendingReviews}
                color={data.stats.pendingReviews > 0 ? "text-amber-400" : "text-gray-500"}
                bg={data.stats.pendingReviews > 0 ? "bg-amber-500/10" : "bg-gray-800/60"}
                sub={`${data.stats.reviewedByMe} reviewed by me`}
              />
            </div>

            {/* ── Missions row ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-5">

              {/* Recent missions */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag size={14} className="text-violet-400" />
                    <p className="text-sm font-bold text-white">Recent Missions</p>
                  </div>
                  <button
                    onClick={() => router.push("/mission")}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-brand transition-colors"
                  >
                    View all <ChevronRight size={11} />
                  </button>
                </div>

                {data.recentMissions.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-6">No missions yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {data.recentMissions.map((m) => {
                      const st = MISSION_STATUS_STYLE[m.status] ?? { text: "text-gray-400", bg: "bg-gray-800", dot: "bg-gray-600" };
                      return (
                        <button
                          key={m.id}
                          onClick={() => router.push(`/mission/${m.id}`)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 hover:bg-gray-800/70 border border-gray-800/40 hover:border-gray-700/60 transition-all text-left group"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${MISSION_TYPE_COLOR[m.type] ?? "text-gray-400 bg-gray-800 border-gray-700"}`}>
                                {m.type}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {m.target || "—"} · {fmt(m.createdAt)}
                              {m.attackCount > 0 && ` · ${m.attackCount} attack${m.attackCount > 1 ? "s" : ""}`}
                            </p>
                          </div>
                          <span className={`text-[10px] font-semibold shrink-0 ${st.text}`}>{m.status}</span>
                          <ChevronRight size={12} className="text-gray-700 group-hover:text-gray-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mission distribution */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Flag size={14} className="text-violet-400" />
                  <p className="text-sm font-bold text-white">Mission Distribution</p>
                </div>
                <MissionDonut missions={data.stats.missions} />
              </div>

            </div>

            {/* ── Attacks & reviews row ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-5">

              {/* Recent lab simulations */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair size={14} className="text-indigo-400" />
                    <p className="text-sm font-bold text-white">Recent Lab Simulations</p>
                  </div>
                  <button
                    onClick={() => router.push("/attack-simulation")}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-brand transition-colors"
                  >
                    Launch <ChevronRight size={11} />
                  </button>
                </div>

                {data.recentAttacks.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-6">No simulations performed</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {data.recentAttacks.map((a) => {
                      const statutColor = ATTACK_STATUS_STYLE[a.statut.toLowerCase()] ?? "text-gray-400";
                      return (
                        <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800/40 border border-gray-800/40">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">
                            {a.mitreID || "—"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{a.techniqueName}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{a.actifNom} · {fmt(a.date)}</p>
                          </div>
                          <span className={`text-[10px] font-semibold shrink-0 ${statutColor}`}>{a.statut}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* To Validate */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={14} className="text-amber-400" />
                    <p className="text-sm font-bold text-white">To Validate</p>
                    {data.stats.pendingReviews > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        {data.stats.pendingReviews}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => router.push("/rule-review")}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-brand transition-colors"
                  >
                    View all <ChevronRight size={11} />
                  </button>
                </div>

                {data.pendingReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <CheckCircle size={20} className="text-emerald-500/40" />
                    <p className="text-xs text-gray-600 text-center">No pending rules</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {data.pendingReviews.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => router.push("/rule-review")}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/20 hover:border-amber-700/40 transition-all text-left"
                      >
                        <Circle size={10} className="text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{r.ruleName || `Rule #${r.id}`}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {r.submittedBy} · {fmt(r.dateCreation)}
                          </p>
                        </div>
                        {r.severite && (
                          <span className="text-[9px] font-semibold text-gray-500 capitalize shrink-0">{r.severite}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </>
        )}
      </div>
    </DashboardLayout>
  );
}
