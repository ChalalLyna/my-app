"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Server, Network, Play, Square, RotateCcw, Wifi,
  Plus, Pencil, Trash2, X, Loader2, RefreshCw,
  HardDrive, Search, Filter,
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
  vlan: string;
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

const EMPTY_ADD_FORM = {
  vmName: "", hostname: "", ram: "", cpu: "", template: "",
};

interface LudusTemplate {
  id: string;
  label: string;
  os: string;
  defaultRam: string;
  defaultCpu: string;
  category: string;
}

const LUDUS_TEMPLATES: LudusTemplate[] = [
  { id: "owasp-juice-shop",        label: "OWASP Juice Shop",         os: "Ubuntu 22.04",        defaultRam: "2048", defaultCpu: "2", category: "lab" },
  { id: "windows-7",               label: "Windows 7",                os: "Windows 7",           defaultRam: "2048", defaultCpu: "2", category: "lab" },
  { id: "windows-10",              label: "Windows 10",               os: "Windows 10",          defaultRam: "4096", defaultCpu: "2", category: "lab" },
  { id: "windows-server-2019",     label: "Windows Server 2019",      os: "Windows Server 2019", defaultRam: "4096", defaultCpu: "4", category: "lab" },
  { id: "windows-server-2016",     label: "Windows Server 2016",      os: "Windows Server 2016", defaultRam: "4096", defaultCpu: "4", category: "lab" },
  { id: "malware-lab-xz-backdoor", label: "Malware Lab (xz backdoor)", os: "Debian 12",          defaultRam: "2048", defaultCpu: "2", category: "lab" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(s: number): string {
  if (s <= 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
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

function fmtCores(val: string): string {
  const n = parseInt(val);
  if (isNaN(n)) return val || "—";
  return `${n} core${n !== 1 ? "s" : ""}`;
}

function fmtRamMb(val: string): string {
  const mb = parseInt(val);
  if (isNaN(mb)) return val || "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(1).replace(/\.0$/, "")} GB` : `${mb} MB`;
}

function fmtDiskGb(val: string): string {
  const gb = parseInt(val);
  if (isNaN(gb)) return val || "—";
  return `${gb} GB`;
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
  const [criticalVms, setCriticalVms] = useState<{ name: string; vmid: number; os: string; ip: string; vlan: string; cpu: string; ram: string; disk: string }[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [refreshingLive, setRefreshingLive] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [networkData, setNetworkData] = useState<NetIface[] | null>(null);
  const [loadingNet, setLoadingNet] = useState(false);
  const [netError, setNetError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addFormError, setAddFormError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

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
      .catch(() => setNetError("Network error"))
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
        setActionMsg(`Error: ${data.error ?? "unknown"}`);
      } else {
        setActionMsg(
          action === "start" ? "Starting…" :
          action === "stop"  ? "Stopping…" : "Rebooting…"
        );
        setTimeout(() => fetchLive(), 1500);
      }
    } catch {
      setActionMsg("Connection error");
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
      nomMachine: a.nomMachine, os: a.os, ip: a.ip, vlan: a.vlan ?? "",
      vmidProxmox: a.vmidProxmox != null ? String(a.vmidProxmox) : "",
      cpu: a.cpu, ram: a.ram, disk: a.disk,
    });
    setFormError("");
    setEditTarget(a);
    setModal("edit");
  }

  async function handleSave() {
    const isSynthetic = editTarget?.id.startsWith("__cv_");
    if (isSynthetic) {
      if (!form.nomMachine || !form.vmidProxmox) {
        setFormError("Machine name and VMID are required.");
        return;
      }
    } else {
      if (!form.nom || !form.categorie || !form.typeActif || !form.nomMachine || !form.vmidProxmox) {
        setFormError("Name, category, machine name and VMID are required.");
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      const vmid = Number(form.vmidProxmox);

      // 1. Update database
      const url = isSynthetic
        ? `/api/machines/${editTarget!.vmidProxmox}`
        : `/api/assets/${editTarget!.id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, vmidProxmox: vmid }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Unknown error."); return; }

      // 2. Push relevant changes to Proxmox
      const proxmoxPayload: Record<string, string | number> = {};
      if (form.nomMachine && form.nomMachine !== editTarget!.nomMachine)
        proxmoxPayload.name = form.nomMachine;
      const cores = parseInt(form.cpu);
      if (!isNaN(cores) && cores > 0) proxmoxPayload.cores = cores;
      const memory = parseInt(form.ram);
      if (!isNaN(memory) && memory > 0) proxmoxPayload.memory = memory;

      if (Object.keys(proxmoxPayload).length > 0) {
        await fetch(`/api/proxmox/vm-config?vmid=${vmid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proxmoxPayload),
        });
      }

      setModal(null);
      fetchAssets();
      fetchCritical();
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(templateId: string) {
    const tpl = LUDUS_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) {
      setAddForm((f) => ({ ...f, template: templateId }));
      return;
    }
    setAddForm((f) => ({
      ...f,
      template: templateId,
      vmName:   f.vmName   || tpl.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      hostname: f.hostname || tpl.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ram:      f.ram      || tpl.defaultRam,
      cpu:      f.cpu      || tpl.defaultCpu,
    }));
  }

  async function handleAddAsset() {
    if (!addForm.vmName || !addForm.hostname) {
      setAddFormError("VM name and hostname are required.");
      return;
    }
    if (!addForm.template) {
      setAddFormError("Please select a template.");
      return;
    }
    const tpl = LUDUS_TEMPLATES.find((t) => t.id === addForm.template)!;
    setAddSaving(true);
    setAddFormError("");
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom:        addForm.vmName,
          nomMachine: addForm.hostname,
          cpu:        addForm.cpu || tpl.defaultCpu,
          ram:        addForm.ram || tpl.defaultRam,
          os:         tpl.os,
          categorie:  tpl.category,
          typeActif:  "lab",
          description: `Déployé depuis le template Ludus : ${tpl.label}`,
          ip: "", vlan: "", disk: "", vmidProxmox: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddFormError(data.error ?? "Failed to create asset.");
        return;
      }
      setShowAddModal(false);
      fetchAssets();
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/assets/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Delete failed."); return; }
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
                <span className="text-xs font-semibold uppercase tracking-widest text-brand">Administrator</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Infrastructure & Assets</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {assets.length} asset{assets.length !== 1 ? "s" : ""} — {liveMap.size} VM{liveMap.size !== 1 ? "s" : ""} Proxmox
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchLive(); fetchAssets(); fetchCritical(); }}
                title="Refresh"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={15} className={refreshingLive ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => { setAddForm(EMPTY_ADD_FORM); setAddFormError(""); setShowAddModal(true); }}
                className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={14} /> Add asset
              </button>
            </div>
          </div>

          {/* ── Critical VMs ───────────────────────────────────────────────── */}
          {criticalVms.length > 0 && (
            <section className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Platform VMs</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {criticalVms.map((cv) => {
                  const live = liveMap.get(cv.vmid);
                  const running = live?.status === "running";
                  const cPct = live ? cpuPct(live.cpu) : 0;
                  const mPct = live ? memPct(live.mem, live.maxmem) : 0;
                  const asset = assets.find((a) => a.vmidProxmox === cv.vmid);
                  const displayAsset: Asset = asset ?? {
                    id: `__cv_${cv.vmid}`,
                    name: cv.name,
                    description: "",
                    category: "infrastructure",
                    nomMachine: cv.name,
                    os:   cv.os,
                    ip:   cv.ip,
                    vlan: cv.vlan,
                    vmidProxmox: cv.vmid,
                    cpu:  cv.cpu,
                    ram:  cv.ram,
                    disk: cv.disk,
                  };
                  const isSelected = selectedAsset?.id === displayAsset.id;
                  return (
                    <div key={cv.vmid}
                      onClick={() => setSelectedAsset(isSelected ? null : displayAsset)}
                      className={`bg-gray-900 border rounded-2xl p-5 flex flex-col gap-4 transition-colors cursor-pointer
                        ${isSelected
                          ? "border-brand/40 bg-brand/5"
                          : "border-gray-800/60 hover:border-gray-700/60"}`}>
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
                        <div className="flex items-center gap-2">
                          <StatusBadge status={live?.status ?? "unknown"} />
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(displayAsset); }}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
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
                              <span className="text-gray-500">RAM used</span>
                              <span className="text-gray-300 text-right">{toGB(live.mem)} / {toGB(live.maxmem)}</span>
                            </>
                          )}
                          <span className="text-gray-500">Node</span>
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
                    {s === "all" ? "All" : s === "running" ? "Running" : "Stopped"}
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
                    <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, machine, IP…"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand/40"
                />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
              {loadingAssets ? (
                <div className="flex items-center justify-center py-14 text-gray-500">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-14 text-gray-600 text-sm">
                  No assets found.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {["Asset", "Machine / OS", "Category", "IP / VMID", "Status", "CPU", "RAM", ""].map((h) => (
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Live usage</p>
                  <div className="flex justify-around mb-4">
                    <CircularGauge pct={cpuPct(selectedLive.cpu)} size={88} label="CPU" />
                    <CircularGauge pct={memPct(selectedLive.mem, selectedLive.maxmem)} size={88} label="RAM" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs border-t border-gray-800/60 pt-3">
                    <span className="text-gray-500">RAM used</span>
                    <span className="text-right text-gray-300">{toGB(selectedLive.mem)} / {toGB(selectedLive.maxmem)}</span>
                    <span className="text-gray-500">Uptime</span>
                    <span className="text-right text-gray-300">{formatUptime(selectedLive.uptime)}</span>
                    <span className="text-gray-500">Proxmox node</span>
                    <span className="text-right text-gray-300 font-mono">{selectedLive.node}</span>
                  </div>
                </div>
              )}

              {/* Hardware from DB */}
              <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Configuration (DB)</p>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> CPU</span>
                  <span className="text-right text-gray-300">{fmtCores(selectedAsset.cpu)}</span>
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> RAM</span>
                  <span className="text-right text-gray-300">{fmtRamMb(selectedAsset.ram)}</span>
                  <span className="text-gray-500 flex items-center gap-1.5"><HardDrive size={11} /> Disk</span>
                  <span className="text-right text-gray-300">{fmtDiskGb(selectedAsset.disk)}</span>
                  <span className="text-gray-500">OS</span>
                  <span className="text-right text-gray-300">{selectedAsset.os || "—"}</span>
                  <span className="text-gray-500">Category</span>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Network interfaces</p>
                </div>

                {selectedLive?.status !== "running" ? (
                  <p className="text-xs text-gray-600">VM stopped — interfaces unavailable.</p>
                ) : loadingNet ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 size={12} className="animate-spin" /> Loading…
                  </div>
                ) : netError ? (
                  <p className="text-xs text-red-400/80">{netError}</p>
                ) : !networkData || networkData.length === 0 ? (
                  <p className="text-xs text-gray-600">No interfaces detected.</p>
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
                          <p className="text-xs text-gray-600">No address</p>
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

      {/* ── Add Asset Modal ──────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Plus size={16} className="text-brand" />
                </div>
                <h2 className="text-base font-bold text-white">Add asset</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Template selector */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  Ludus template *
                </label>
                <select
                  value={addForm.template}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                >
                  <option value="">— Select a template —</option>
                  {LUDUS_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                  ))}
                </select>
                {addForm.template && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    OS: <span className="text-gray-400">{LUDUS_TEMPLATES.find(t => t.id === addForm.template)?.os}</span>
                  </p>
                )}
              </div>

              <div className="border-t border-gray-800/60 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Server size={11} /> VM configuration
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="VM name *"
                    value={addForm.vmName}
                    onChange={(v) => setAddForm((f) => ({ ...f, vmName: v }))}
                    placeholder="juice-shop-01"
                  />
                  <Field
                    label="Hostname *"
                    value={addForm.hostname}
                    onChange={(v) => setAddForm((f) => ({ ...f, hostname: v }))}
                    placeholder="juice-shop-01"
                  />
                  <Field
                    label="CPU (cores)"
                    value={addForm.cpu}
                    type="number"
                    onChange={(v) => setAddForm((f) => ({ ...f, cpu: v }))}
                    placeholder="2"
                  />
                  <Field
                    label="RAM (MB)"
                    value={addForm.ram}
                    type="number"
                    onChange={(v) => setAddForm((f) => ({ ...f, ram: v }))}
                    placeholder="4096"
                  />
                </div>
              </div>
            </div>

            {addFormError && (
              <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {addFormError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                disabled={addSaving}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addSaving && <Loader2 size={13} className="animate-spin" />}
                Create asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {modal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Edit asset</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Server size={11} /> Asset information
                </p>
              </div>
              <Field label="Asset name *" value={form.nom}
                onChange={(v) => setForm((f) => ({ ...f, nom: v }))} placeholder="Web server" />
              <Field label="Category *" value={form.categorie}
                onChange={(v) => setForm((f) => ({ ...f, categorie: v }))} placeholder="server" />
              <div className="col-span-2">
                <Field label="Description" value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Optional description" />
              </div>
              {!editTarget?.id.startsWith("__cv_") && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Type *</label>
                  <select value={form.typeActif} onChange={(e) => setForm((f) => ({ ...f, typeActif: e.target.value as "lab" | "client" }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50">
                    <option value="lab">Lab</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              )}

              <div className="col-span-2 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Network size={11} /> Virtual machine (Proxmox)
                </p>
              </div>
              <Field label="Machine name *" value={form.nomMachine}
                onChange={(v) => setForm((f) => ({ ...f, nomMachine: v }))} placeholder="ubuntu-web-01" />
              <ReadOnly label="VMID Proxmox" value={form.vmidProxmox} />
              <ReadOnly label="OS"   value={form.os} />
              <ReadOnly label="IP"   value={form.ip} />
              <ReadOnly label="VLAN" value={form.vlan} />
              <Field label="CPU (cores)" value={form.cpu} type="number"
                onChange={(v) => setForm((f) => ({ ...f, cpu: v }))} placeholder="4" />
              <Field label="RAM (MB)" value={form.ram} type="number"
                onChange={(v) => setForm((f) => ({ ...f, ram: v }))} placeholder="8192" />
              <Field label="Disk (GB)" value={form.disk} type="number"
                onChange={(v) => setForm((f) => ({ ...f, disk: v }))} placeholder="50" />
            </div>

            {formError && (
              <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save
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

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <div className="w-full bg-gray-800/40 border border-gray-700/40 rounded-xl px-3 py-2 text-sm text-gray-500 select-none">
        {value || "—"}
      </div>
    </div>
  );
}
