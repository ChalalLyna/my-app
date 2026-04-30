"use client";

import { useState, useEffect, useRef } from "react";
import { Asset } from "@/app/types/simulation";
import { Step2Selection } from "./StepSelectAdversary";
import {
  CheckCircle, Monitor, Shield, Zap, AlertTriangle, Terminal,
  FileText, Loader2,
} from "lucide-react";

// ─── Terminal line colors ─────────────────────────────────────────────────────

const LINE_COLORS: Record<string, string> = {
  system:  "text-gray-500",
  info:    "text-cyan-400",
  success: "text-emerald-400",
  warn:    "text-amber-400",
  run:     "text-indigo-300",
  error:   "text-red-400",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  asset: Asset | null;
  step2: Step2Selection;
}

interface TerminalLine {
  type: string;
  text: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepConfirmLaunch({ asset, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;

  const [launched, setLaunched] = useState(false);
  const [done, setDone]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [lines, setLines]       = useState<TerminalLine[]>([]);

  const terminalRef  = useRef<HTMLDivElement>(null);
  const doneRef      = useRef(false);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleLaunch = async () => {
    if (!asset || selectedTTPs.length === 0) return;

    setLaunched(true);
    setRunning(true);
    setDone(false);
    doneRef.current = false;
    setLines([]);

    const log = (type: string, text: string) =>
      setLines((prev) => [...prev, { type, text }]);

    try {
      // ── Header ──
      log("system",  "╔══════════════════════════════════════════════════╗");
      log("system",  "║      CALDERA — Autonomous Adversary Emulation    ║");
      log("system",  "╚══════════════════════════════════════════════════╝");
      log("info",    `[*] Target asset  : ${asset.name} (VM ${asset.vmidProxmox ?? "?"})`);
      log("info",    adversary
        ? `[*] Adversary     : ${adversary.name}`
        : `[*] Mode          : Manual TTP selection (${selectedTTPs.length} TTPs)`
      );

      // ── Step 1: Resolve IP from Proxmox ──
      log("info", "[*] Fetching target IP from Proxmox...");
      let targetIp: string;

      if (asset.vmidProxmox) {
        const ipRes = await fetch(`/api/proxmox/vm-ip?vmid=${asset.vmidProxmox}`);
        const ipData = await ipRes.json();
        if (!ipRes.ok || !ipData.ip) {
          throw new Error(`Proxmox: ${ipData.error ?? "IP not available — ensure QEMU guest agent is running"}`);
        }
        targetIp = ipData.ip;
        log("success", `[+] IP resolved    : ${targetIp} (node: ${ipData.node})`);
      } else {
        throw new Error("Asset has no Proxmox VM ID configured");
      }

      // ── Step 2: Find alive Caldera agent ──
      log("info", "[*] Searching for an alive Caldera agent on target...");
      const agentsRes = await fetch("/api/caldera/agents");
      if (!agentsRes.ok) throw new Error("Could not reach Caldera agents endpoint");
      const agents: any[] = await agentsRes.json();

      const agent = agents.find(
        (a) => a.alive && (a.host_ip_addrs as string[]).includes(targetIp)
      );
      if (!agent) {
        throw new Error(
          `No alive Caldera agent found at ${targetIp}. ` +
          `Available alive agents: ${agents.filter(a => a.alive).map(a => a.host).join(", ") || "none"}`
        );
      }
      log("success", `[+] Agent found    : ${agent.host} | paw=${agent.paw} | group=${agent.group || "(default)"}`);

      // ── Step 3: Prepare adversary ID ──
      let adversaryId: string;

      if (adversary) {
        adversaryId = adversary.id;
        log("info", `[*] Using adversary: ${adversary.name} (${adversaryId})`);
      } else {
        // Create a temporary adversary with the selected ability IDs
        log("info", "[*] Building temporary adversary from selected TTPs...");
        const abilityIds = selectedTTPs.flatMap((t) => t.calderaAbilityIds ?? []);
        if (abilityIds.length === 0) {
          throw new Error("Selected TTPs have no mapped Caldera ability IDs");
        }
        const tmpAdvRes = await fetch("/api/caldera/adversaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:            `tmp-${Date.now()}`,
            description:     "Temporary adversary — manual TTP selection",
            atomic_ordering: abilityIds,
          }),
        });
        const tmpAdv = await tmpAdvRes.json();
        if (!tmpAdvRes.ok || !tmpAdv.adversary_id) {
          throw new Error(`Failed to create temporary adversary: ${tmpAdv.error ?? tmpAdvRes.status}`);
        }
        adversaryId = tmpAdv.adversary_id;
        log("success", `[+] Temp adversary : ${adversaryId} (${abilityIds.length} abilities)`);
      }

      // ── Step 4: Create Caldera operation ──
      log("info", "[*] Creating Caldera operation...");
      const opBody = {
        name:      `attack-${asset.name}-${Date.now()}`,
        adversary: { adversary_id: adversaryId },
        group:     agent.group || "",
        planner:   { id: "atomic" },
        state:     "running",
      };
      const opRes = await fetch("/api/caldera/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opBody),
      });
      const operation = await opRes.json();
      if (!opRes.ok || !operation.id) {
        throw new Error(`Operation creation failed: ${operation.error ?? opRes.status}`);
      }
      const opId: string = operation.id;
      log("success", `[+] Operation      : ${operation.name} (id=${opId})`);

      // Persist timestamps for the Detection page
      localStorage.setItem("cyberlab_attack_launch", new Date().toISOString());
      localStorage.setItem("cyberlab_operation_id", opId);

      log("info", "[*] Operation running — polling for results every 3 s...");

      // ── Step 5: Poll operation ──
      const shownLinks = new Set<string>();

      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/caldera/operations/${opId}`);
          if (!pollRes.ok) return;
          const op = await pollRes.json();

          // Show newly completed links
          for (const link of (op.chain ?? []) as any[]) {
            if (shownLinks.has(link.id)) continue;
            // Only show links that have a definitive status (-3, 0, 1)
            if (link.status === -2) continue; // still running
            shownLinks.add(link.id);

            const techId  = link.ability?.technique_id ?? "";
            const abilityName = link.ability?.name ?? "Unknown ability";
            const label   = techId ? `${techId} — ${abilityName}` : abilityName;

            if (link.status === 0) {
              setLines((prev) => [...prev, { type: "run",     text: `[→] ${label}` }]);
              const raw = link.output ? atob(link.output).trim() : "";
              setLines((prev) => [...prev, {
                type: "success",
                text: raw
                  ? `    [✓] ${raw.slice(0, 300)}${raw.length > 300 ? "…" : ""}`
                  : "    [✓] Completed",
              }]);
            } else if (link.status === -3) {
              setLines((prev) => [...prev, { type: "warn",  text: `    [~] ${label} — skipped (inapplicable)` }]);
            } else if (link.status === 1) {
              setLines((prev) => [...prev, { type: "error", text: `    [✗] ${label} — failed` }]);
            }
          }

          // Check completion
          if (["finished", "out_of_time", "cleanup"].includes(op.state)) {
            if (pollRef.current) clearInterval(pollRef.current);
            const ok  = (op.chain ?? []).filter((l: any) => l.status === 0).length;
            const all = (op.chain ?? []).length;
            setLines((prev) => [
              ...prev,
              { type: "success", text: `[+] Operation ${op.state} — ${ok}/${all} abilities succeeded` },
              { type: "system",  text: "[=] Session closed. Generate a report to review findings." },
            ]);
            doneRef.current = true;
            setRunning(false);
            setDone(true);
          }
        } catch {
          // ignore transient poll errors
        }
      }, 3000);

      // Safety timeout after 10 minutes
      setTimeout(() => {
        if (!doneRef.current) {
          if (pollRef.current) clearInterval(pollRef.current);
          setLines((prev) => [
            ...prev,
            { type: "warn", text: "[!] Timeout reached — check Caldera UI for full results" },
          ]);
          doneRef.current = true;
          setRunning(false);
          setDone(true);
        }
      }, 600_000);

    } catch (err: any) {
      setLines((prev) => [...prev, { type: "error", text: `[✗] ${err.message}` }]);
      doneRef.current = true;
      setRunning(false);
      setDone(true);
    }
  };

  // ── Pre-launch checklist ──
  const checklist = [
    { label: "Target asset is reachable and online",    ok: asset?.status === "Online" },
    { label: "At least one TTP selected",              ok: selectedTTPs.length > 0 },
    { label: "Proxmox VM ID configured",               ok: !!asset?.vmidProxmox },
    { label: "Monitoring / SIEM is active (Wazuh)",    ok: true },
  ];

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white shrink-0">Step 3: Confirm & Launch</h2>

      {!launched ? (
        <>
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Simulation Warning</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                This simulation will generate real attack traffic against the selected asset via Caldera.
                Ensure the target VM is authorised for testing and the QEMU guest agent is running.
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Monitor size={14} className="text-brand" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Target Asset</p>
              </div>
              {asset ? (
                <>
                  <p className="text-white font-bold">{asset.name}</p>
                  <p className="text-gray-400 text-sm">{asset.os}</p>
                  {asset.category && (
                    <p className="text-[10px] text-brand mt-1">{asset.category}</p>
                  )}
                  <p className={`text-xs font-semibold mt-2 ${asset.status === "Online" ? "text-emerald-400" : "text-gray-500"}`}>
                    ● {asset.status}
                  </p>
                  {asset.vmidProxmox && (
                    <p className="text-[10px] text-gray-600 mt-1 font-mono">VM ID: {asset.vmidProxmox}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-600 text-sm italic">No asset selected</p>
              )}
            </div>

            <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-red-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {adversary ? "Adversary" : "TTPs"}
                </p>
              </div>
              {adversary && (
                <p className="text-white font-bold mb-2">{adversary.name}</p>
              )}
              {selectedTTPs.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTTPs.map((t) => (
                    <span key={t.id} className="text-[10px] font-mono bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                      {t.id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">No TTP selected</p>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pre-launch Checklist</p>
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <CheckCircle size={16} className={item.ok ? "text-emerald-400" : "text-gray-700"} />
                <span className={item.ok ? "text-gray-300" : "text-gray-600"}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Launch button */}
          <div className="flex justify-end shrink-0">
            <button
              onClick={handleLaunch}
              disabled={!asset || selectedTTPs.length === 0 || !asset.vmidProxmox}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                asset && selectedTTPs.length > 0 && asset.vmidProxmox
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              <Zap size={14} />
              Launch Simulation
            </button>
          </div>
        </>
      ) : (
        /* ── TERMINAL ── */
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {/* Status bar */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Terminal size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Caldera Output</span>
              {running && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <Loader2 size={11} className="animate-spin" />
                  Running…
                </span>
              )}
              {done && !running && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Completed
                </span>
              )}
            </div>
            {done && (
              <button
                onClick={() => alert("Génération du rapport — à implémenter")}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-900/30"
              >
                <FileText size={13} />
                Générer un rapport
              </button>
            )}
          </div>

          {/* Terminal window */}
          <div className="flex-1 min-h-0 bg-gray-950 border border-gray-800/60 rounded-xl overflow-hidden flex flex-col">
            {/* Title bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs text-gray-600 font-mono">caldera — operation terminal</span>
            </div>
            {/* Output */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5"
            >
              {lines.map((line, i) => (
                <div key={i} className={`${LINE_COLORS[line.type] ?? "text-gray-400"} whitespace-pre-wrap`}>
                  {line.text}
                </div>
              ))}
              {running && <div className="text-gray-600 animate-pulse">▋</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
