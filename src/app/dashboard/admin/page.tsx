"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Users, Server, Crosshair, Activity,
  TrendingUp, Shield, User, Cpu, HardDrive, Database,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  IdUtilisateur: number;
  nom:           string;
  prenom:        string;
  role:          string;
  email:         string;
  DateCreation:  string;
}

interface Attack {
  id:            number;
  dateExecution: string | null;
  statut:        string;
  tactique:      string;
  actifNom:      string;
  userNom:       string;
  userPrenom:    string;
  techniqueName: string;
}

interface PlatformVm {
  name: string;
  vmid: number;
}

interface LiveVm {
  vmid:    number;
  status:  string;
  cpu:     number;
  mem:     number;
  maxmem:  number;
  maxdisk: number;
}

// Physical host limits
const LAB_RAM_GB   = 32;
const LAB_DISK_GB  = 1000; // 1 TB

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUCCESS_SET = new Set(["success", "terminee", "terminé", "terminée"]);
const FAILED_SET  = new Set(["failed", "stoppé", "stoppée", "stopé", "arrêté"]);

function isSuccess(s: string) { return SUCCESS_SET.has(s.toLowerCase()); }
function isFailed(s: string)  { return FAILED_SET.has(s.toLowerCase());  }

function weekOf(dateStr: string): string {
  const d   = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function fmtWeek(w: string) {
  return new Date(w + "T12:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fullName(nom: string, prenom: string) {
  return [prenom, nom].filter(Boolean).join(" ") || "Unknown";
}

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777"];

const STATUT_DOT: Record<string, string> = {
  success: "bg-emerald-400", terminee: "bg-emerald-400", "terminé": "bg-emerald-400", "terminée": "bg-emerald-400",
  failed: "bg-red-500", "stoppé": "bg-red-500", "stoppée": "bg-red-500", "stopé": "bg-red-500", "arrêté": "bg-red-500",
  running: "bg-amber-400", "en cours": "bg-amber-400",
};

// ─── UI Primitives ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string; bg: string;
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

function Panel({
  title, icon: Icon, children, className = "",
}: {
  title: string;
  icon?: React.ComponentType<{ size: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-indigo-400" />}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ResourceBar({
  label, icon: Icon, usedLabel, maxLabel, pct, color,
}: {
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  usedLabel: string; maxLabel: string; pct: number; color: string;
}) {
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : color;
  const textColor = pct > 90 ? "text-red-400" : pct > 70 ? "text-amber-400" : "text-emerald-400";
  const clampedPct = Math.min(pct, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className="text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">{label}</span>
        </div>
        <span className={`text-xs font-bold ${textColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-600">
        <span>{usedLabel} used</span>
        <span>max {maxLabel}</span>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-10 text-xs text-gray-600">{text}</div>;
}

function Loading() {
  return <div className="flex items-center justify-center py-10 text-xs text-gray-600">Loading…</div>;
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

function AttackTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-indigo-400 font-semibold">{payload[0].value} attack{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ─── Platform VM Row ──────────────────────────────────────────────────────────

function VmStatusRow({ vm, live }: { vm: PlatformVm; live?: LiveVm }) {
  const running = live?.status === "running";
  const unknown = !live;
  const cpuPct  = live ? Math.round(live.cpu * 100) : null;
  const ramPct  = live && live.maxmem > 0 ? Math.round((live.mem / live.maxmem) * 100) : null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        unknown ? "bg-gray-600" : running ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-red-500"
      }`} />
      <span className="text-xs text-gray-300 flex-1 truncate">{vm.name}</span>
      {!unknown && cpuPct !== null && <span className="text-[10px] text-gray-600">CPU {cpuPct}%</span>}
      {!unknown && ramPct !== null && <span className="text-[10px] text-gray-600">RAM {ramPct}%</span>}
      <span className={`text-[10px] font-semibold ${
        unknown ? "text-gray-600" : running ? "text-emerald-400" : "text-red-400"
      }`}>
        {unknown ? "unknown" : live?.status}
      </span>
    </div>
  );
}

// ─── Recent Attack Row ────────────────────────────────────────────────────────

function RecentAttackRow({ a }: { a: Attack }) {
  const dot = STATUT_DOT[a.statut] ?? "bg-gray-600";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-800/40 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium truncate">{a.techniqueName}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {fullName(a.userNom, a.userPrenom)} · {a.actifNom}
        </p>
      </div>
      <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
        {a.dateExecution
          ? new Date(a.dateExecution).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
          : "—"}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();

  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [attacks,     setAttacks]     = useState<Attack[]>([]);
  const [assetCount,  setAssetCount]  = useState<number | null>(null);
  const [platformVms, setPlatformVms] = useState<PlatformVm[]>([]);
  const [liveVms,     setLiveVms]     = useState<LiveVm[]>([]);

  const [ldUsers,   setLdUsers]   = useState(true);
  const [ldAttacks, setLdAttacks] = useState(true);
  const [ldAssets,  setLdAssets]  = useState(true);
  const [ldInfra,   setLdInfra]   = useState(true);

  const fetchAll = useCallback(async () => {
    setLdUsers(true);
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLdUsers(false));

    setLdAttacks(true);
    fetch("/api/admin/attacks")
      .then(r => r.json())
      .then(d => setAttacks(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLdAttacks(false));

    setLdAssets(true);
    fetch("/api/assets")
      .then(r => r.json())
      .then(d => setAssetCount(Array.isArray(d) ? d.length : 0))
      .catch(() => setAssetCount(0))
      .finally(() => setLdAssets(false));

    setLdInfra(true);
    Promise.all([
      fetch("/api/infra/required-vms").then(r => r.json()).catch(() => []),
      fetch("/api/proxmox/cluster-vms").then(r => r.json()).catch(() => []),
    ]).then(([pvms, lvms]) => {
      setPlatformVms(Array.isArray(pvms) ? pvms : []);
      setLiveVms(Array.isArray(lvms) ? lvms : []);
    }).finally(() => setLdInfra(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const userStats = useMemo(() => {
    const byRole = users.reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total:       users.length,
      apprenants:  byRole["apprenant"]  ?? 0,
      consultants: byRole["consultant"] ?? 0,
    };
  }, [users]);

  const attackStats = useMemo(() => {
    const total   = attacks.length;
    const success = attacks.filter(a => isSuccess(a.statut)).length;
    const failed  = attacks.filter(a => isFailed(a.statut)).length;
    const running = total - success - failed;
    return { total, success, failed, running, rate: total > 0 ? Math.round((success / total) * 100) : 0 };
  }, [attacks]);

  const tacticData = useMemo(() => {
    const map = new Map<string, number>();
    attacks.forEach(a => { if (a.tactique) map.set(a.tactique, (map.get(a.tactique) ?? 0) + 1); });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [attacks]);

  const statusData = useMemo(() => [
    { name: "Success", value: attackStats.success, color: "#10b981" },
    { name: "Stopped", value: attackStats.failed,  color: "#ef4444" },
    { name: "Running", value: attackStats.running,  color: "#f59e0b" },
  ].filter(d => d.value > 0), [attackStats]);

  const weeklyData = useMemo(() => {
    const map = new Map<string, number>();
    attacks.forEach(a => {
      if (!a.dateExecution) return;
      const w = weekOf(a.dateExecution);
      map.set(w, (map.get(w) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([w, count]) => ({ week: fmtWeek(w), count }));
  }, [attacks]);

  const topUsers = useMemo(() => {
    const map = new Map<string, number>();
    attacks.forEach(a => {
      const key = fullName(a.userNom, a.userPrenom);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [attacks]);

  const topAssets = useMemo(() => {
    const map = new Map<string, number>();
    attacks.forEach(a => { if (a.actifNom) map.set(a.actifNom, (map.get(a.actifNom) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [attacks]);

  const recentAttacks = useMemo(() => attacks.slice(0, 5), [attacks]);

  const recentUsers = useMemo(() =>
    [...users]
      .filter(u => u.DateCreation)
      .sort((a, b) => b.DateCreation.localeCompare(a.DateCreation))
      .slice(0, 4),
    [users]
  );

  const liveMap = useMemo(() => new Map(liveVms.map(lv => [lv.vmid, lv])), [liveVms]);

  const labResources = useMemo(() => {
    const running = liveVms.filter(v => v.status === "running");
    const cpuPct   = running.reduce((s, v) => s + v.cpu, 0) * 100;
    const ramUsed  = running.reduce((s, v) => s + v.mem, 0) / (1024 ** 3);
    const diskAlloc = liveVms.reduce((s, v) => s + v.maxdisk, 0) / (1024 ** 3);
    return {
      cpuPct,
      ramUsedGb:   ramUsed,
      ramPct:      (ramUsed / LAB_RAM_GB) * 100,
      diskAllocGb: diskAlloc,
      diskPct:     (diskAlloc / LAB_DISK_GB) * 100,
    };
  }, [liveVms]);

  const vmOnlineCount = useMemo(() =>
    platformVms.filter(pv => liveMap.get(pv.vmid)?.status === "running").length,
    [platformVms, liveMap]
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Lab Resources */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" />
              <p className="text-sm font-semibold text-white">Lab Resources</p>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">
              Intel Core i5-1135G7 · 32 GB DDR4 · 1 TB NVMe
            </span>
          </div>
          {ldInfra ? (
            <div className="text-xs text-gray-600 text-center py-2">Loading…</div>
          ) : liveVms.length === 0 ? (
            <div className="text-xs text-gray-600 text-center py-2">Proxmox unavailable</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ResourceBar
                label="CPU"
                icon={Cpu}
                usedLabel={`${labResources.cpuPct.toFixed(1)}%`}
                maxLabel="100%"
                pct={labResources.cpuPct}
                color="bg-indigo-500"
              />
              <ResourceBar
                label="RAM"
                icon={Database}
                usedLabel={`${labResources.ramUsedGb.toFixed(1)} GB`}
                maxLabel={`${LAB_RAM_GB} GB`}
                pct={labResources.ramPct}
                color="bg-indigo-500"
              />
              <ResourceBar
                label="Disk (allocated)"
                icon={HardDrive}
                usedLabel={`${labResources.diskAllocGb.toFixed(0)} GB`}
                maxLabel="1 TB"
                pct={labResources.diskPct}
                color="bg-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Header */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full">
            Administrator
          </span>
          <p className="text-gray-500 text-sm mt-0.5">CyberLab platform overview</p>
        </div>

        {/* Row 1 — KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total users"
            value={ldUsers ? "—" : userStats.total}
            sub={ldUsers ? undefined : `${userStats.apprenants} apprentices · ${userStats.consultants} consultants`}
            icon={Users} color="text-indigo-400" bg="bg-indigo-500/10"
          />
          <KpiCard
            label="Attack simulations"
            value={ldAttacks ? "—" : attackStats.total}
            sub={ldAttacks ? undefined : `${attackStats.rate}% success rate`}
            icon={Crosshair} color="text-red-400" bg="bg-red-500/10"
          />
          <KpiCard
            label="Registered assets"
            value={ldAssets ? "—" : (assetCount ?? 0)}
            icon={Server} color="text-blue-400" bg="bg-blue-500/10"
          />
          <KpiCard
            label="Platform VMs online"
            value={ldInfra ? "—" : `${vmOnlineCount}/${platformVms.length}`}
            sub={ldInfra ? undefined : vmOnlineCount === platformVms.length ? "All systems operational" : "Some VMs offline"}
            icon={Activity}
            color={!ldInfra && vmOnlineCount < platformVms.length ? "text-amber-400" : "text-emerald-400"}
            bg={!ldInfra && vmOnlineCount < platformVms.length ? "bg-amber-500/10" : "bg-emerald-500/10"}
          />
        </div>

        {/* Row 1b — Most targeted assets */}
        {!ldAttacks && topAssets.length > 0 && (
          <Panel title="Most targeted assets" icon={Server}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {topAssets.map(({ name, count }, i) => (
                <div key={name} className="bg-gray-950/60 border border-gray-800/40 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-700 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium truncate">{name}</p>
                    <p className="text-[10px] text-gray-500">{count} attack{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Row 2 — Tactic bar + Status donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <Panel title="Attacks by tactic" icon={TrendingUp} className="lg:col-span-2">
            {ldAttacks ? <Loading /> : tacticData.length === 0 ? <Empty text="No data yet" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={tacticData} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<AttackTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {tacticData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Attack status" icon={Shield}>
            {ldAttacks ? <Loading /> : statusData.length === 0 ? <Empty text="No data yet" /> : (
              <div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={68}
                      paddingAngle={3} dataKey="value" strokeWidth={0}
                    >
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
                          <p className="text-white font-semibold">{payload[0].name}</p>
                          <p className="text-gray-400">{payload[0].value} attacks</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-gray-400">{d.name}</span>
                      </div>
                      <span className="text-white font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Row 3 — Attacks over time + Top users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <Panel title="Attacks over time" icon={Activity} className="lg:col-span-2">
            {ldAttacks ? <Loading /> : weeklyData.length === 0 ? <Empty text="No data yet" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weeklyData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-xl">
                        <p className="text-gray-400 mb-0.5">Week of {label}</p>
                        <p className="text-indigo-400 font-semibold">{payload[0].value} attack{payload[0].value !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Most active users" icon={User}>
            {ldAttacks ? <Loading /> : topUsers.length === 0 ? <Empty text="No data yet" /> : (
              <div className="space-y-3">
                {topUsers.map(({ name, count }, i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-600 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{name}</p>
                      <div className="h-1 bg-gray-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.round((count / (topUsers[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-white shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Row 4 — Platform VMs + Recent attacks + Recent signups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <Panel title="Platform VM status" icon={Activity}>
            {ldInfra ? <Loading /> : platformVms.length === 0 ? <Empty text="No platform VMs configured" /> : (
              <div>
                {platformVms.map(vm => <VmStatusRow key={vm.vmid} vm={vm} live={liveMap.get(vm.vmid)} />)}
              </div>
            )}
          </Panel>

          <Panel title="Recent attacks" icon={Crosshair}>
            {ldAttacks ? <Loading /> : recentAttacks.length === 0 ? <Empty text="No attacks yet" /> : (
              <div>{recentAttacks.map(a => <RecentAttackRow key={a.id} a={a} />)}</div>
            )}
          </Panel>

          <Panel title="Recent signups" icon={Users}>
            {ldUsers ? <Loading /> : recentUsers.length === 0 ? <Empty text="No users yet" /> : (
              <div>
                {recentUsers.map(u => (
                  <div key={u.IdUtilisateur} className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <User size={12} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">
                        {[u.prenom, u.nom].filter(Boolean).join(" ") || u.email}
                      </p>
                      <p className="text-[10px] text-gray-600">{u.role}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
                      {u.DateCreation
                        ? new Date(u.DateCreation).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>


      </div>
    </DashboardLayout>
  );
}
