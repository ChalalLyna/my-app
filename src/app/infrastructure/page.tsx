"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Server, Network, Play, Square, RotateCcw, Wifi,
  Plus, Pencil, Trash2, X, Loader2, RefreshCw,
  HardDrive, Search, Filter, Construction,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Asset {
  id: string;
  name: string;
  description: string;
  category: string;
  nomMachine: string;
  os: string;
  ip: string;
  vmidProxmox?: number;
  cpu: string;
  ram: string;
  disk: string;
}

interface VmLive {
  vmid: number;
  name: string;
  node: string;
  status: string;
  cpu: number;    // 0–1
  mem: number;    // bytes used
  maxmem: number; // bytes total
  uptime: number; // seconds
}

interface NetIface {
  name: string;
  mac: string | null;
  addresses: { ip: string; type: string; prefix: number }[];
}

type ActionKey = "start" | "stop" | "reboot";
type FilterStatus = "all" | "running" | "stopped";
type EditModal = "edit" | null;

const EMPTY_FORM = {
  nom: "", categorie: "", description: "", typeActif: "lab" as "lab" | "client",
  nomMachine: "", os: "", ip: "", vlan: "", vmidProxmox: "", cpu: "", ram: "", disk: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(s: number): string {
  if (s <= 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function toGB(bytes: number): string {
  if (!bytes) return "—";
  return (bytes / 1073741824).toFixed(1) + " GB";
}

function cpuPct(frac: number): number {
  return Math.min(100, Math.round(frac * 100));
}

function memPct(used: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function barColor(pct: number): string {
  if (pct > 85) return "#ef4444";
  if (pct > 60) return "#f59e0b";
  return "#22d3ee";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CircularGauge({ pct, size = 80, label }: { pct: number; size?: number; label: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = barColor(pct);
  const c = size / 2;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={`${offset}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const running = status === "running";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold
      ${running ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500 bg-gray-800"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
      {running ? "Running" : status === "stopped" ? "Stopped" : status}
    </span>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function InfrastructurePage() {
  const { user: me, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && me && me.role !== "admin") {
      router.replace(me.role === "consultant" ? "/dashboard/consultant" : "/dashboard/apprenant");
    }
  }, [me, authLoading, router]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liveMap, setLiveMap] = useState<Map<number, VmLive>>(new Map());
  const [criticalVms, setCriticalVms] = useState<{ name: string; vmid: number }[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [refreshingLive, setRefreshingLive] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [networkData, setNetworkData] = useState<NetIface[] | null>(null);
  const [loadingNet, setLoadingNet] = useState(false);
  const [netError, setNetError] = useState("");

  const [showAddTodo, setShowAddTodo] = useState(false);
  const [modal, setModal] = useState<EditModal>(null);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [actionLoading, setActionLoading] = useState<{ vmid: number; action: ActionKey } | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const fetchAssets = useCallback(() => {
    setLoadingAssets(true);
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data: Asset[]) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setAssets([]))
      .finally(() => setLoadingAssets(false));
  }, []);

  const fetchCritical = useCallback(() => {
    fetch("/api/infra/required-vms")
      .then((r) => r.json())
      .then((data) => setCriticalVms(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchLive = useCallback((silent = false) => {
    if (!silent) setRefreshingLive(true);
    fetch("/api/proxmox/cluster-vms")
      .then((r) => r.json())
      .then((data: VmLive[]) => {
        if (Array.isArray(data)) {
          setLiveMap(new Map(data.map((v) => [v.vmid, v])));
        }
      })
      .catch(() => {})
      .finally(() => { if (!silent) setRefreshingLive(false); });
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchCritical();
    fetchLive();
    pollRef.current = setInterval(() => fetchLive(true), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAssets, fetchCritical, fetchLive]);

  // ─── Network detail (lazy) ───────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedAsset?.vmidProxmox) { setNetworkData(null); return; }
    const live = liveMap.get(selectedAsset.vmidProxmox);
    if (!live || live.status !== "running") { setNetworkData(null); return; }

    setLoadingNet(true);
    setNetError("");
    fetch(`/api/proxmox/vm-network?vmid=${selectedAsset.vmidProxmox}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNetError(d.error); setNetworkData(null); }
        else setNetworkData(d.interfaces ?? []);
      })
      .catch(() => setNetError("Erreur réseau"))
      .finally(() => setLoadingNet(false));
  }, [selectedAsset, liveMap]);

  // ─── VM Actions ─────────────────────────────────────────────────────────────

  async function runAction(vmid: number, action: ActionKey) {
    setActionLoading({ vmid, action });
    setActionMsg("");
    const endpoint = action === "start" ? "vm-start" : action === "stop" ? "vm-stop" : "vm-reboot";
    const method = "POST";
    try {
      const res = await fetch(`/api/proxmox/${endpoint}?vmid=${vmid}`, { method });
      const data = await res.json();
      if (!res.ok) {
        setActionMsg(`Erreur: ${data.error ?? "inconnue"}`);
      } else {
        setActionMsg(
          action === "start" ? "Démarrage en cours…" :
          action === "stop"  ? "Arrêt en cours…"    : "Redémarrage en cours…"
        );
        setTimeout(() => fetchLive(), 1500);
      }
    } catch {
      setActionMsg("Erreur de connexion");
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(""), 3000);
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  function openEdit(a: Asset) {
    setForm({
      nom: a.name, categorie: a.category, description: a.description,
      typeActif: "lab",
      nomMachine: a.nomMachine, os: a.os, ip: a.ip, vlan: "",
      vmidProxmox: a.vmidProxmox != null ? String(a.vmidProxmox) : "",
      cpu: a.cpu, ram: a.ram, disk: a.disk,
    });
    setFormError("");
    setEditTarget(a);
    setModal("edit");
  }

  async function handleSave() {
    if (!form.nom || !form.categorie || !form.typeActif || !form.nomMachine || !form.vmidProxmox) {
      setFormError("Nom, catégorie, machine, VMID sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch(`/api/assets/${editTarget!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vmidProxmox: Number(form.vmidProxmox) }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Erreur inconnue."); return; }
      setModal(null);
      fetchAssets();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Erreur lors de la suppression."); return; }
      if (selectedAsset?.id === deleteTarget.id) setSelectedAsset(null);
      setDeleteTarget(null);
      fetchAssets();
    } finally {
      setDeleting(false);
    }
  }

  // ─── Derived data ────────────────────────────────────────────────────────────

  const categories = ["all", ...Array.from(new Set(assets.map((a) => a.category).filter(Boolean)))];

  const filtered = assets.filter((a) => {
    const live = a.vmidProxmox != null ? liveMap.get(a.vmidProxmox) : undefined;
    if (filterStatus === "running" && live?.status !== "running") return false;
    if (filterStatus === "stopped" && live?.status !== "stopped")  return false;
    if (filterCategory !== "all" && a.category !== filterCategory) return false;
    if (search && !`${a.name} ${a.nomMachine} ${a.os} ${a.ip}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedLive = selectedAsset?.vmidProxmox != null ? liveMap.get(selectedAsset.vmidProxmox) : undefined;

  // ─── Action button helper ─────────────────────────────────────────────────────

  function ActionBtn({ vmid, action, disabled: ext }: { vmid: number; action: ActionKey; disabled?: boolean }) {
    const loading = actionLoading?.vmid === vmid && actionLoading?.action === action;
    const icons: Record<ActionKey, React.ReactNode> = {
      start:  <Play size={12} />,
      stop:   <Square size={12} />,
      reboot: <RotateCcw size={12} />,
    };
    const colors: Record<ActionKey, string> = {
      start:  "text-emerald-400 hover:bg-emerald-500/10",
      stop:   "text-red-400 hover:bg-red-500/10",
      reboot: "text-amber-400 hover:bg-amber-500/10",
    };
    return (
      <button
        onClick={(e) => { e.stopPropagation(); runAction(vmid, action); }}
        disabled={!!ext || !!actionLoading}
        title={action}
        className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${colors[action]}`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : icons[action]}
      </button>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="flex h-full">

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className={`flex-1 p-6 overflow-y-auto transition-all duration-300 ${selectedAsset ? "mr-[400px]" : ""}`}>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Network size={15} className="text-brand" />
                <span className="text-xs font-semibold uppercase tracking-widest text-brand">Administrateur</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Infrastructure & Assets</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {assets.length} asset{assets.length !== 1 ? "s" : ""} — {liveMap.size} VM{liveMap.size !== 1 ? "s" : ""} Proxmox
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLive()}
                title="Rafraîchir"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={15} className={refreshingLive ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setShowAddTodo(true)}
                className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={14} /> Ajouter un asset
              </button>
            </div>
          </div>

          {/* ── Critical VMs ───────────────────────────────────────────────── */}
          {criticalVms.length > 0 && (
            <section className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">VMs critiques</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {criticalVms.map((cv) => {
                  const live = liveMap.get(cv.vmid);
                  const running = live?.status === "running";
                  const cPct = live ? cpuPct(live.cpu) : 0;
                  const mPct = live ? memPct(live.mem, live.maxmem) : 0;
                  return (
                    <div key={cv.vmid}
                      className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4">
                      {/* Card header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                            ${running ? "bg-emerald-500/10" : "bg-gray-800"}`}>
                            <Server size={16} className={running ? "text-emerald-400" : "text-gray-500"} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white capitalize">{cv.name}</p>
                            <p className="text-xs text-gray-500">VMID {cv.vmid}</p>
                          </div>
                        </div>
                        <StatusBadge status={live?.status ?? "unknown"} />
                      </div>

                      {/* Gauges */}
                      {running && live ? (
                        <div className="flex justify-around">
                          <CircularGauge pct={cPct} size={72} label="CPU" />
                          <CircularGauge pct={mPct} size={72} label="RAM" />
                        </div>
                      ) : (
                        <div className="flex justify-around py-2">
                          <div className="text-center">
                            <div className="w-[72px] h-[72px] rounded-full border-4 border-gray-800 flex items-center justify-center mx-auto">
                              <span className="text-xs text-gray-600">OFF</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Meta */}
                      {live && (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-gray-500">Uptime</span>
                          <span className="text-gray-300 text-right">{formatUptime(live.uptime)}</span>
                          {running && (
                            <>
                              <span className="text-gray-500">RAM utilisée</span>
                              <span className="text-gray-300 text-right">{toGB(live.mem)} / {toGB(live.maxmem)}</span>
                            </>
                          )}
                          <span className="text-gray-500">Nœud</span>
                          <span className="text-gray-300 text-right font-mono">{live.node}</span>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex items-center gap-1 border-t border-gray-800/60 pt-3">
                        <ActionBtn vmid={cv.vmid} action="start" disabled={running} />
                        <ActionBtn vmid={cv.vmid} action="stop"  disabled={!running} />
                        <ActionBtn vmid={cv.vmid} action="reboot" disabled={!running} />
                        <span className="ml-auto text-xs text-gray-600 font-mono">{live?.name ?? cv.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Action message ─────────────────────────────────────────────── */}
          {actionMsg && (
            <div className="mb-4 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl text-sm text-brand">
              {actionMsg}
            </div>
          )}

          {/* ── Assets table ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Status tabs */}
              <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-0.5 gap-0.5">
                {(["all", "running", "stopped"] as FilterStatus[]).map((s) => (
                  <button key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                      ${filterStatus === s ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                    {s === "all" ? "Tous" : s === "running" ? "Running" : "Stopped"}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5">
                <Filter size={12} className="text-gray-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c === "all" ? "Toutes catégories" : c}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, machine, IP…"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand/40"
                />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-14 text-gray-500">
                  <Loader2 size={18} className="animate-spin mr-2" /> Chargement…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-14 text-gray-600 text-sm">
                  Aucun asset trouvé.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {["Asset", "Machine / OS", "Catégorie", "IP / VMID", "Statut", "CPU", "RAM", ""].map((h) => (
                        <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3 first:pl-6 last:pr-6 last:text-right">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const live = a.vmidProxmox != null ? liveMap.get(a.vmidProxmox) : undefined;
                      const running = live?.status === "running";
                      const cPct = live && running ? cpuPct(live.cpu) : 0;
                      const mPct = live && running ? memPct(live.mem, live.maxmem) : 0;
                      const isSelected = selectedAsset?.id === a.id;
                      return (
                        <tr key={a.id}
                          onClick={() => setSelectedAsset(isSelected ? null : a)}
                          className={`border-b border-gray-800/30 last:border-0 cursor-pointer transition-colors
                            ${isSelected ? "bg-brand/5 border-l-2 border-l-brand" : "hover:bg-gray-800/20"}`}>
                          <td className="px-5 py-3.5 pl-6">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                                ${running ? "bg-emerald-500/10" : "bg-gray-800"}`}>
                                <Server size={13} className={running ? "text-emerald-400" : "text-gray-500"} />
                              </div>
                              <span className="text-white font-medium truncate max-w-[140px]">{a.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-gray-300 font-mono text-xs">{a.nomMachine}</p>
                            <p className="text-gray-600 text-xs mt-0.5">{a.os}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{a.category || "—"}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-gray-300 font-mono text-xs">{a.ip || "—"}</p>
                            {a.vmidProxmox != null && (
                              <p className="text-gray-600 text-xs mt-0.5">VMID {a.vmidProxmox}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={live?.status ?? "no vmid"} />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400">{running ? `${cPct}%` : "—"}</span>
                              {running && <MiniBar pct={cPct} />}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400">{running ? `${mPct}%` : "—"}</span>
                              {running && <MiniBar pct={mPct} />}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 pr-6">
                            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                              {a.vmidProxmox != null && (
                                <>
                                  <ActionBtn vmid={a.vmidProxmox} action="start"  disabled={running} />
                                  <ActionBtn vmid={a.vmidProxmox} action="stop"   disabled={!running} />
                                  <ActionBtn vmid={a.vmidProxmox} action="reboot" disabled={!running} />
                                  <span className="w-px h-4 bg-gray-800 mx-1" />
                                </>
                              )}
                              <button onClick={() => openEdit(a)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setDeleteTarget(a)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        {selectedAsset && (
          <aside className="fixed right-0 top-0 bottom-0 w-[400px] bg-gray-950 border-l border-gray-800/60 overflow-y-auto z-30 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 sticky top-0 bg-gray-950 z-10">
              <div className="flex items-center gap-2.5">
                <Server size={15} className={selectedLive?.status === "running" ? "text-emerald-400" : "text-gray-500"} />
                <div>
                  <p className="text-sm font-semibold text-white">{selectedAsset.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedAsset.nomMachine}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAsset(null)}
                className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5 flex-1">

              {/* Status + controls */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedLive?.status ?? "no vmid"} />
                {selectedAsset.vmidProxmox != null && (
                  <div className="flex items-center gap-1">
                    <ActionBtn vmid={selectedAsset.vmidProxmox} action="start"  disabled={selectedLive?.status === "running"} />
                    <ActionBtn vmid={selectedAsset.vmidProxmox} action="stop"   disabled={selectedLive?.status !== "running"} />
                    <ActionBtn vmid={selectedAsset.vmidProxmox} action="reboot" disabled={selectedLive?.status !== "running"} />
                  </div>
                )}
              </div>

              {/* Live metrics */}
              {selectedLive?.status === "running" && (
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Utilisation en direct</p>
                  <div className="flex justify-around mb-4">
                    <CircularGauge pct={cpuPct(selectedLive.cpu)} size={88} label="CPU" />
                    <CircularGauge pct={memPct(selectedLive.mem, selectedLive.maxmem)} size={88} label="RAM" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs border-t border-gray-800/60 pt-3">
                    <span className="text-gray-500">RAM utilisée</span>
                    <span className="text-right text-gray-300">{toGB(selectedLive.mem)} / {toGB(selectedLive.maxmem)}</span>
                    <span className="text-gray-500">Uptime</span>
                    <span className="text-right text-gray-300">{formatUptime(selectedLive.uptime)}</span>
                    <span className="text-gray-500">Nœud Proxmox</span>
                    <span className="text-right text-gray-300 font-mono">{selectedLive.node}</span>
                  </div>
                </div>
              )}

              {/* Hardware from DB */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Configuration (DB)</p>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> CPU max</span>
                  <span className="text-right text-gray-300">{selectedAsset.cpu || "—"}</span>
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> RAM max</span>
                  <span className="text-right text-gray-300">{selectedAsset.ram || "—"}</span>
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> Disque</span>
                  <span className="text-right text-gray-300">{selectedAsset.disk || "—"}</span>
                  <span className="text-gray-500">OS</span>
                  <span className="text-right text-gray-300">{selectedAsset.os || "—"}</span>
                  <span className="text-gray-500">Catégorie</span>
                  <span className="text-right text-gray-300">{selectedAsset.category || "—"}</span>
                  {selectedAsset.vmidProxmox != null && (
                    <>
                      <span className="text-gray-500">VMID Proxmox</span>
                      <span className="text-right text-gray-300 font-mono">{selectedAsset.vmidProxmox}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Network interfaces */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi size={12} className="text-gray-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Interfaces réseau</p>
                </div>

                {selectedLive?.status !== "running" ? (
                  <p className="text-xs text-gray-600">VM arrêtée — interfaces non disponibles.</p>
                ) : loadingNet ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 size={12} className="animate-spin" /> Chargement…
                  </div>
                ) : netError ? (
                  <p className="text-xs text-red-400/80">{netError}</p>
                ) : !networkData || networkData.length === 0 ? (
                  <p className="text-xs text-gray-600">Aucune interface détectée.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {networkData.map((iface, i) => (
                      <div key={i} className="border border-gray-800/60 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-semibold text-white">{iface.name}</span>
                          {iface.mac && (
                            <span className="text-xs font-mono text-gray-500">{iface.mac}</span>
                          )}
                        </div>
                        {iface.addresses.length === 0 ? (
                          <p className="text-xs text-gray-600">Pas d'adresse</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {iface.addresses.map((addr, j) => (
                              <div key={j} className="flex items-center justify-between">
                                <span className={`text-xs font-mono ${addr.type === "ipv4" ? "text-brand" : "text-gray-400"}`}>
                                  {addr.ip}/{addr.prefix}
                                </span>
                                <span className="text-xs text-gray-600 uppercase">{addr.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedAsset.description && (
                <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Description</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{selectedAsset.description}</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── Add — À implémenter ─────────────────────────────────────────────── */}
      {showAddTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Construction size={16} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-bold text-white">Fonctionnalité à venir</h2>
              </div>
              <button onClick={() => setShowAddTodo(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              La création d'un asset depuis l'interface n'est pas encore implémentée.
            </p>
            <button
              onClick={() => setShowAddTodo(false)}
              className="w-full py-2 rounded-xl text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {modal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Modifier l'asset</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Server size={11} /> Informations asset
                </p>
              </div>
              <Field label="Nom de l'asset *" value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))} placeholder="Serveur Web" />
              <Field label="Catégorie *" value={form.categorie}
                onChange={(v) => setForm((f) => ({ ...f, categorie: v }))} placeholder="server" />
              <div className="col-span-2">
                <Field label="Description" value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Description optionnelle" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Type *</label>
                <select value={form.typeActif} onChange={(e) => setForm((f) => ({ ...f, typeActif: e.target.value as "lab" | "client" }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50">
                  <option value="lab">Lab</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div className="col-span-2 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Network size={11} /> Machine virtuelle (Proxmox)
                </p>
              </div>
              <Field label="Nom machine *" value={form.nomMachine}
                onChange={(v) => setForm((f) => ({ ...f, nomMachine: v }))} placeholder="ubuntu-web-01" />
              <Field label="VMID Proxmox *" value={form.vmidProxmox} type="number"
                onChange={(v) => setForm((f) => ({ ...f, vmidProxmox: v }))} placeholder="101" />
              <Field label="OS" value={form.os}
                onChange={(v) => setForm((f) => ({ ...f, os: v }))} placeholder="Ubuntu 22.04" />
              <Field label="IP" value={form.ip}
                onChange={(v) => setForm((f) => ({ ...f, ip: v }))} placeholder="10.0.0.5" />
              <Field label="VLAN" value={form.vlan}
                onChange={(v) => setForm((f) => ({ ...f, vlan: v }))} placeholder="100" />
              <Field label="CPU max" value={form.cpu}
                onChange={(v) => setForm((f) => ({ ...f, cpu: v }))} placeholder="4 vCPU" />
              <Field label="RAM max" value={form.ram}
                onChange={(v) => setForm((f) => ({ ...f, ram: v }))} placeholder="8 GB" />
              <Field label="Disque" value={form.disk}
                onChange={(v) => setForm((f) => ({ ...f, disk: v }))} placeholder="50 GB" />
            </div>

            {formError && (
              <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={17} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Supprimer l'asset</h2>
                <p className="text-xs text-gray-400">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Cette action est irréversible. L'entrée en base de données sera supprimée (la VM Proxmox reste intacte).
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50"
      />
    </div>
  );
}
