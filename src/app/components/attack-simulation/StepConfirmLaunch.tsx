"use client";

import { useState, useEffect, useRef } from "react";
import { Asset } from "@/app/types/simulation";
import { Step2Selection } from "./StepSelectAdversary";
import {
  CheckCircle, Monitor, Shield, Zap, AlertTriangle,
  Terminal, FileText, Loader2,
} from "lucide-react";

const LINE_COLORS: Record<string, string> = {
  system:  "text-gray-500",
  info:    "text-cyan-400",
  success: "text-emerald-400",
  warn:    "text-amber-400",
  run:     "text-indigo-300",
  error:   "text-red-400",
};

interface Props {
  assets: Asset[];
  step2: Step2Selection;
}

interface TerminalLine { type: string; text: string; }

export default function StepConfirmLaunch({ assets, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;

  const [launched, setLaunched] = useState(false);
  const [done, setDone]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [lines, setLines]       = useState<TerminalLine[]>([]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const doneRef     = useRef(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (terminalRef.current)
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleLaunch = async () => {
    if (assets.length === 0 || selectedTTPs.length === 0) return;

    setLaunched(true);
    setRunning(true);
    setDone(false);
    doneRef.current = false;
    setLines([]);

    const log = (type: string, text: string) =>
      setLines((prev) => [...prev, { type, text }]);

    try {
      log("system",  "╔══════════════════════════════════════════════════╗");
      log("system",  "║      CALDERA — Autonomous Adversary Emulation    ║");
      log("system",  "╚══════════════════════════════════════════════════╝");
      log("info",    `[*] Targets   : ${assets.map((a) => a.name).join(", ")}`);
      log("info",    adversary
        ? `[*] Adversary : ${adversary.name}`
        : `[*] Mode      : Manual TTP selection (${selectedTTPs.length} TTPs)`
      );

      // ── Prepare adversary_id (once, shared across all targets) ──
      let adversaryId: string;
      if (adversary) {
        adversaryId = adversary.id;
      } else {
        log("info", "[*] Building temporary adversary from selected TTPs...");
        const abilityIds = selectedTTPs.flatMap((t) => t.calderaAbilityIds ?? []);
        if (abilityIds.length === 0)
          throw new Error("Selected TTPs have no mapped Caldera ability IDs");
        const r = await fetch("/api/caldera/adversaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:            `tmp-${Date.now()}`,
            description:     "Temporary adversary — manual TTP selection",
            atomic_ordering: abilityIds,
          }),
        });
        const d = await r.json();
        if (!r.ok || !d.adversary_id)
          throw new Error(`Failed to create temporary adversary: ${d.error ?? r.status}`);
        adversaryId = d.adversary_id;
        log("success", `[+] Temp adversary : ${adversaryId} (${abilityIds.length} abilities)`);
      }

      // ── Per-asset: IP → agent → operation ──
      const opIds: string[] = [];

      for (const asset of assets) {
        log("system", `─── ${asset.name} ${"─".repeat(Math.max(0, 42 - asset.name.length))}`);

        if (!asset.vmidProxmox) {
          log("error", `[✗] ${asset.name} has no Proxmox VM ID — skipped`);
          continue;
        }

        // 1. IP from Proxmox
        log("info", `[*] Fetching IP for VM ${asset.vmidProxmox}...`);
        const ipRes  = await fetch(`/api/proxmox/vm-ip?vmid=${asset.vmidProxmox}`);
        const ipData = await ipRes.json();
        if (!ipRes.ok || !ipData.ip) {
          log("error", `[✗] Proxmox: ${ipData.error ?? "IP unavailable — check QEMU guest agent"}`);
          continue;
        }
        const targetIp: string = ipData.ip;
        log("success", `[+] IP resolved    : ${targetIp} (node: ${ipData.node})`);

        // 2. Alive Caldera agent
        log("info", "[*] Searching for alive Caldera agent...");
        const agRes = await fetch("/api/caldera/agents");
        if (!agRes.ok) throw new Error("Could not reach Caldera agents endpoint");
        const agents: any[] = await agRes.json();
        const agent = agents.find(
          (a) => a.alive && (a.host_ip_addrs as string[]).includes(targetIp)
        );
        if (!agent) {
          const alive = agents.filter((a) => a.alive).map((a) => a.host).join(", ") || "none";
          log("error", `[✗] No alive agent at ${targetIp} — alive agents: ${alive}`);
          continue;
        }
        log("success", `[+] Agent          : ${agent.host} | paw=${agent.paw} | group=${agent.group || "(default)"}`);

        // 3. Create operation
        const opRes = await fetch("/api/caldera/operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:      `attack-${asset.name}-${Date.now()}`,
            adversary: { adversary_id: adversaryId },
            group:     agent.group || "",
            planner:   { id: "atomic" },
            state:     "running",
          }),
        });
        const op = await opRes.json();
        if (!opRes.ok || !op.id) {
          log("error", `[✗] Operation creation failed: ${op.error ?? opRes.status}`);
          continue;
        }
        log("success", `[+] Operation      : ${op.name} (id=${op.id})`);
        opIds.push(op.id);
      }

      if (opIds.length === 0)
        throw new Error("No operations were launched — check Proxmox/agent availability");

      localStorage.setItem("cyberlab_attack_launch", new Date().toISOString());
      localStorage.setItem("cyberlab_operation_ids", JSON.stringify(opIds));

      log("system", "──────────────────────────────────────────────────");
      log("info",   `[*] ${opIds.length} operation(s) running — polling every 3 s...`);

      // ── Poll all operations in parallel ──
      const shownLinks  = new Set<string>();
      const finishedOps = new Set<string>();

      pollRef.current = setInterval(async () => {
        try {
          for (const opId of opIds) {
            if (finishedOps.has(opId)) continue;
            const pollRes = await fetch(`/api/caldera/operations/${opId}`);
            if (!pollRes.ok) continue;
            const result = await pollRes.json();

            for (const link of (result.chain ?? []) as any[]) {
              const key = `${opId}:${link.id}`;
              if (shownLinks.has(key) || link.status === -2) continue;
              shownLinks.add(key);

              const techId = link.ability?.technique_id ?? "";
              const name   = link.ability?.name ?? "Unknown ability";
              const label  = techId ? `${techId} — ${name}` : name;

              if (link.status === 0) {
                setLines((prev) => [...prev, { type: "run",     text: `[→] ${label}` }]);
                const raw = link.output ? atob(link.output).trim() : "";
                setLines((prev) => [...prev, {
                  type: "success",
                  text: raw ? `    [✓] ${raw.slice(0, 300)}${raw.length > 300 ? "…" : ""}` : "    [✓] Completed",
                }]);
              } else if (link.status === -3) {
                setLines((prev) => [...prev, { type: "warn",  text: `    [~] ${label} — skipped` }]);
              } else if (link.status === 1) {
                setLines((prev) => [...prev, { type: "error", text: `    [✗] ${label} — failed` }]);
              }
            }

            if (["finished", "out_of_time", "cleanup"].includes(result.state)) {
              finishedOps.add(opId);
              const ok  = (result.chain ?? []).filter((l: any) => l.status === 0).length;
              const all = (result.chain ?? []).length;
              setLines((prev) => [...prev, {
                type: "success",
                text: `[+] Op ${opId.slice(0, 8)}… — ${result.state} — ${ok}/${all} abilities succeeded`,
              }]);
            }
          }

          if (finishedOps.size >= opIds.length) {
            if (pollRef.current) clearInterval(pollRef.current);
            setLines((prev) => [...prev,
              { type: "system", text: "[=] All operations complete. Generate a report to review findings." },
            ]);
            doneRef.current = true;
            setRunning(false);
            setDone(true);
          }
        } catch { /* ignore transient errors */ }
      }, 3000);

      setTimeout(() => {
        if (!doneRef.current) {
          if (pollRef.current) clearInterval(pollRef.current);
          setLines((prev) => [...prev, { type: "warn", text: "[!] Timeout — check Caldera UI for full results" }]);
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

  // ── Checklist ──
  const allOnline     = assets.length > 0 && assets.every((a) => a.status === "Online");
  const allHaveVmid   = assets.length > 0 && assets.every((a) => !!a.vmidProxmox);
  const canLaunch     = assets.length > 0 && selectedTTPs.length > 0 && allHaveVmid;

  const checklist = [
    { label: `${assets.length} actif(s) sélectionné(s)`,        ok: assets.length > 0 },
    { label: "Tous les actifs sont Online",                       ok: allOnline },
    { label: "Au moins un TTP sélectionné",                      ok: selectedTTPs.length > 0 },
    { label: "VM IDs Proxmox configurés",                        ok: allHaveVmid },
    { label: "Monitoring / SIEM actif (Wazuh)",                  ok: true },
  ];

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white shrink-0">Step 3: Confirm & Launch</h2>

      {!launched ? (
        <>
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl shrink-0">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Simulation Warning</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                Cette simulation génère du trafic d'attaque réel via Caldera contre les actifs sélectionnés.
                Assurez-vous que le QEMU guest agent est actif sur chaque VM cible.
              </p>
            </div>
          </div>

          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            {/* Targets */}
            <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-brand" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Cibles ({assets.length})
                </p>
              </div>
              {assets.length === 0 ? (
                <p className="text-gray-600 text-sm italic">Aucun actif sélectionné</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {assets.map((a) => (
                    <div key={a.id}>
                      <p className="text-white font-semibold text-xs">{a.name}</p>
                      <p className="text-gray-500 text-[10px]">{a.os}{a.vmidProxmox ? ` · VM ${a.vmidProxmox}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adversary / TTPs */}
            <div className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-red-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {adversary ? "Adversary" : "TTPs"}
                </p>
              </div>
              {adversary && <p className="text-white font-bold text-sm mb-1">{adversary.name}</p>}
              {selectedTTPs.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedTTPs.map((t) => (
                    <span key={t.id} className="text-[10px] font-mono bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded">
                      {t.id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm italic">Aucun TTP</p>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2.5 shrink-0">
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
              disabled={!canLaunch}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                canLaunch
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }`}
            >
              <Zap size={14} />
              Launch Simulation{assets.length > 1 ? ` (${assets.length} targets)` : ""}
            </button>
          </div>
        </>
      ) : (
        /* ── TERMINAL ── */
        <div className="flex flex-col flex-1 min-h-0 gap-3">
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

          <div className="flex-1 min-h-0 bg-gray-950 border border-gray-800/60 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs text-gray-600 font-mono">caldera — operation terminal</span>
            </div>
            <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5">
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
