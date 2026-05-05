"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Asset } from "@/app/types/simulation";
import { Step2Selection } from "./StepSelectAdversary";
import {
  CheckCircle, Monitor, Shield, Zap, AlertTriangle,
  Terminal, FileText, Loader2, Power, Square, ChevronDown,
} from "lucide-react";

const LINE_COLORS: Record<string, string> = {
  system:  "text-gray-500",
  info:    "text-cyan-400",
  success: "text-emerald-400",
  warn:    "text-amber-400",
  run:     "text-indigo-300",
  error:   "text-red-400",
  boot:    "text-purple-400",
};

interface Props {
  assets: Asset[];
  step2: Step2Selection;
}

interface TerminalLine { type: string; text: string; }

interface AbilityResult {
  type:        "ability";
  id:          string;
  techniqueId: string;
  abilityName: string;
  assetName:   string;
  assetIp:     string;
  command:     string;
  output:      string;
  status:      "success" | "failed";
}

type LogEntry = TerminalLine | AbilityResult;

// ── Checklist live state ───────────────────────────────────────────────────
interface CheckState {
  assetsSelected: boolean;
  ttpsSelected:   boolean;
  vmidsOk:        boolean;
  agentsAlive:    boolean | null; // null = checking
}

// ── Boot helpers ───────────────────────────────────────────────────────────
async function startVm(vmid: number): Promise<"already_running" | "started" | "error"> {
  try {
    const r = await fetch(`/api/proxmox/vm-start?vmid=${vmid}`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) return "error";
    return d.status === "already_running" ? "already_running" : "started";
  } catch { return "error"; }
}

async function waitVmRunning(vmid: number, maxWaitMs = 150_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((res) => setTimeout(res, 8_000));
    try {
      const r = await fetch(`/api/proxmox/vm-status?vmid=${vmid}`);
      const d = await r.json();
      if (d.status === "running") return true;
    } catch { /* retry */ }
  }
  return false;
}

async function fetchAliveAgents(): Promise<any[]> {
  try {
    const r = await fetch("/api/caldera/agents");
    if (!r.ok) return [];
    const agents: any[] = await r.json();
    return agents.filter((a) => a.alive);
  } catch { return []; }
}

async function waitAgentAlive(ip: string, maxWaitMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const alive = await fetchAliveAgents();
    if (alive.some((a) => (a.host_ip_addrs as string[]).includes(ip))) return true;
    await new Promise((res) => setTimeout(res, 5_000));
  }
  return false;
}

// ── Markdown → HTML (minimal, no dependency) ──────────────────────────────
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  let inCode = false;
  let codeBuf = "";

  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
     .replace(/\*(.+?)\*/g,     "<em>$1</em>")
     .replace(/`(.+?)`/g,       "<code>$1</code>");

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (!inCode) { inCode = true; codeBuf = ""; }
      else {
        inCode = false;
        html += `<pre><code>${codeBuf.replace(/</g, "&lt;")}</code></pre>`;
      }
      continue;
    }
    if (inCode) { codeBuf += raw + "\n"; continue; }

    const closeList = () => { if (inUl) { html += "</ul>"; inUl = false; } };

    if      (raw.startsWith("#### ")) { closeList(); html += `<h4>${inline(raw.slice(5))}</h4>`; }
    else if (raw.startsWith("### "))  { closeList(); html += `<h3>${inline(raw.slice(4))}</h3>`; }
    else if (raw.startsWith("## "))   { closeList(); html += `<h2>${inline(raw.slice(3))}</h2>`; }
    else if (raw.startsWith("# "))    { closeList(); html += `<h1>${inline(raw.slice(2))}</h1>`; }
    else if (raw.match(/^[-*] /))     {
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${inline(raw.slice(2))}</li>`;
    }
    else if (raw.trim() === "---")    { closeList(); html += "<hr>"; }
    else if (raw.trim() === "")       { closeList(); html += "<br>"; }
    else                              { closeList(); html += `<p>${inline(raw)}</p>`; }
  }
  if (inUl) html += "</ul>";
  return html;
}

function buildPrintHtml(markdown: string): string {
  const body = mdToHtml(markdown);
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Security Report — CyberLab</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;max-width:900px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;font-size:15px}
  .cover{border-bottom:4px solid #c0392b;padding-bottom:28px;margin-bottom:40px}
  .cover-label{font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:12px}
  .cover h1{font-size:2em;color:#c0392b;margin-bottom:8px}
  .cover-meta{font-size:13px;color:#555}
  h1{font-size:1.6em;color:#c0392b;border-bottom:2px solid #e8d0ce;padding-bottom:6px;margin:36px 0 14px}
  h2{font-size:1.25em;color:#2c3e50;border-bottom:1px solid #ddd;padding-bottom:4px;margin:28px 0 12px}
  h3{font-size:1.05em;color:#34495e;margin:20px 0 8px}
  h4{font-size:1em;color:#555;margin:16px 0 6px}
  p{margin-bottom:10px}
  ul{padding-left:22px;margin-bottom:12px}
  li{margin-bottom:4px}
  code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:13px}
  pre{background:#f7f7f7;border:1px solid #ddd;border-radius:4px;padding:14px;overflow-x:auto;margin:12px 0}
  pre code{background:none;padding:0}
  hr{border:none;border-top:1px solid #ddd;margin:24px 0}
  strong{color:#111}
  @media print{
    body{margin:15mm 20mm;max-width:none}
    h1,h2{page-break-after:avoid}
    pre,ul{page-break-inside:avoid}
    .cover{page-break-after:always}
  }
</style>
</head>
<body>
<div class="cover">
  <p class="cover-label">Confidential — Cybersecurity Assessment Report</p>
  <h1>Adversary Emulation Report</h1>
  <p class="cover-meta">Generated: ${date} &nbsp;|&nbsp; Platform: CyberLab &nbsp;|&nbsp; Engine: MITRE Caldera</p>
</div>
${body}
<script>window.onload=()=>{window.focus();window.print();}</script>
</body>
</html>`;
}

// ── Caldera base64 decode (UTF-8 aware) ───────────────────────────────────
function calderaB64(val: string | undefined | null): string {
  if (!val) return "";
  try {
    const bin   = atob(val);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
    } catch {
      return bin.trim();
    }
  } catch {
    return val.trim(); // not base64 — use as-is
  }
}

// ── AbilityCard ────────────────────────────────────────────────────────────
function AbilityCard({
  entry, expanded, onToggle,
}: { entry: AbilityResult; expanded: boolean; onToggle: () => void }) {
  const ok = entry.status === "success";
  return (
    <div className="my-0.5 rounded-lg border border-gray-800/50 overflow-hidden text-xs">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-900/70 hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className={ok ? "text-emerald-400" : "text-red-400"}>{ok ? "✓" : "✗"}</span>
        {entry.techniqueId && (
          <span className="font-mono text-indigo-300 shrink-0">{entry.techniqueId}</span>
        )}
        <span className="text-gray-300 flex-1 truncate">{entry.abilityName}</span>
        <span className="text-gray-500 shrink-0 truncate max-w-40">
          {entry.assetName}{entry.assetIp ? ` · ${entry.assetIp}` : ""}
        </span>
        <ChevronDown
          size={12}
          className={`text-gray-600 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-3 py-2.5 bg-gray-950/80 space-y-3 border-t border-gray-800/40">
          {entry.command ? (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Command</p>
              <pre className="text-amber-300 whitespace-pre-wrap break-all font-mono leading-relaxed">
                {entry.command}
              </pre>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Output</p>
            {entry.output ? (
              <pre className={`whitespace-pre-wrap break-all font-mono leading-relaxed ${ok ? "text-emerald-300" : "text-red-300"}`}>
                {entry.output}
              </pre>
            ) : (
              <p className="text-gray-600 italic">No output captured</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
export default function StepConfirmLaunch({ assets, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;
  const { user } = useAuth();

  const [launched, setLaunched]     = useState(false);
  const [done, setDone]             = useState(false);
  const [running, setRunning]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lines, setLines]           = useState<LogEntry[]>([]);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const opIdsRef                = useRef<string[]>([]);
  const opToAssetRef            = useRef<Record<string, { name: string; ip: string }>>({});

  // Live checklist
  const [check, setCheck] = useState<CheckState>({
    assetsSelected: false,
    ttpsSelected:   false,
    vmidsOk:        false,
    agentsAlive:    null,
  });

  const terminalRef = useRef<HTMLDivElement>(null);
  const doneRef     = useRef(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current)
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Live checklist: re-run whenever assets/TTPs change ──
  useEffect(() => {
    const assetsSelected = assets.length > 0;
    const ttpsSelected   = selectedTTPs.length > 0;
    const vmidsOk        = assets.length > 0 && assets.every((a) => !!a.vmidProxmox);

    setCheck({ assetsSelected, ttpsSelected, vmidsOk, agentsAlive: null });

    if (!assetsSelected) return;

    // Check live agents for every selected asset IP
    let cancelled = false;
    (async () => {
      const aliveAgents = await fetchAliveAgents();
      if (cancelled) return;
      const allAlive = assets.every((a) =>
        a.ip && aliveAgents.some((ag) => (ag.host_ip_addrs as string[]).includes(a.ip!))
      );
      setCheck((prev) => ({ ...prev, agentsAlive: allAlive }));
    })();

    return () => { cancelled = true; };
  }, [assets, selectedTTPs]);

  // ── Log helper ──────────────────────────────────────────────────────────
  const log = (type: string, text: string) =>
    setLines((prev) => [...prev, { type, text }]);

  // ── Register attack result in DB ────────────────────────────────────────
  const registerAttack = async (status: "terminé" | "stoppé") => {
    try {
      const res = await fetch("/api/simulations/lab-attack", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:      user ? Number(user.id) : null,
          assetIds:    assets.map((a) => a.id),
          ttpMitreIds: selectedTTPs.map((t) => t.id),
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        log("error", `[✗] Enregistrement DB échoué : ${data.error ?? res.status}`);
      } else {
        log("system", `[DB] Attaque enregistrée (id=${data.idAttaque})`);
      }
    } catch (err: any) {
      log("error", `[✗] Enregistrement DB : ${err.message}`);
    }
  };

  // ── MAIN LAUNCH HANDLER ────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (assets.length === 0 || selectedTTPs.length === 0) return;

    setLaunched(true);
    setRunning(true);
    setDone(false);
    doneRef.current = false;
    setLines([]);

    try {
      log("system", "╔══════════════════════════════════════════════════╗");
      log("system", "║      CALDERA — Autonomous Adversary Emulation    ║");
      log("system", "╚══════════════════════════════════════════════════╝");
      log("info",   `[*] Targets   : ${assets.map((a) => `${a.name} : ${a.nomMachine}`).join(", ")}`);
      log("info",   adversary
        ? `[*] Adversary : ${adversary.name}`
        : `[*] Mode      : Manual TTP selection (${selectedTTPs.length} TTPs)`
      );

      // ═══════════════════════════════════════════════════
      // PHASE 1 — Boot required VMs (infra + targets)
      // ═══════════════════════════════════════════════════
      log("system", "──────────────────────────────────────────────────");
      log("boot",   "[⚡] Phase 1 — Boot infrastructure & targets");

      // 1a. Fetch infra VM IDs (Wazuh, Caldera, Router)
      const infraRes  = await fetch("/api/infra/required-vms");
      const infraVms: { name: string; vmid: number }[] = infraRes.ok ? await infraRes.json() : [];

      // 1b. Build full list of VMs to ensure running
      //     infra first, then selected asset VMs
      const assetVmEntries = assets
        .filter((a) => a.vmidProxmox)
        .map((a) => ({ name: a.nomMachine || a.name, vmid: a.vmidProxmox! }));

      // Deduplicate by vmid
      const seen = new Set<number>();
      const allVms: { name: string; vmid: number }[] = [];
      for (const v of [...infraVms, ...assetVmEntries]) {
        if (!seen.has(v.vmid)) { seen.add(v.vmid); allVms.push(v); }
      }

      const needBoot: { name: string; vmid: number }[] = [];

      // 1c. Start each VM if needed
      for (const vm of allVms) {
        log("boot", `[⚡] Starting VM ${vm.name} (vmid=${vm.vmid})...`);
        const result = await startVm(vm.vmid);
        if (result === "already_running") {
          log("success", `[✓] ${vm.name} already running`);
        } else if (result === "started") {
          log("boot", `[⚡] ${vm.name} start command sent — waiting for boot...`);
          needBoot.push(vm);
        } else {
          log("warn", `[!] Could not start ${vm.name} — will proceed anyway`);
        }
      }

      // 1d. Wait for VMs that needed to boot
      if (needBoot.length > 0) {
        log("boot", `[⚡] Waiting for ${needBoot.length} VM(s) to boot (up to 2.5 min)...`);
        const bootResults = await Promise.all(
          needBoot.map((vm) => waitVmRunning(vm.vmid).then((ok) => ({ ...vm, ok })))
        );
        for (const r of bootResults) {
          if (r.ok) log("success", `[✓] ${r.name} is now running`);
          else      log("warn",    `[!] ${r.name} did not reach 'running' in time — continuing`);
        }
      }

      log("success", "[✓] Infrastructure ready");

      // ═══════════════════════════════════════════════════
      // PHASE 2 — Build adversary
      // ═══════════════════════════════════════════════════
      log("system", "──────────────────────────────────────────────────");
      log("info",   "[*] Phase 2 — Preparing adversary");

      let adversaryId: string;
      if (adversary) {
        adversaryId = adversary.id;
        log("success", `[+] Using adversary : ${adversary.name} (${adversaryId})`);
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

      // ═══════════════════════════════════════════════════
      // PHASE 3 — Per-asset: find agent → launch operation
      // ═══════════════════════════════════════════════════
      log("system", "──────────────────────────────────────────────────");
      log("info",   "[*] Phase 3 — Matching agents & launching operations");

      const opIds: string[] = [];
      // VMs that had to boot → agent needs more time to appear
      const bootedVmids = new Set(needBoot.map((v) => v.vmid));

      for (const asset of assets) {
        log("system", `─── ${asset.name} : ${asset.nomMachine} ${"─".repeat(Math.max(0, 30 - asset.name.length))}`);

        // Use IP directly from DB — no Proxmox call needed
        const targetIp = asset.ip;
        if (!targetIp) {
          log("error", `[✗] ${asset.name} has no IP in database — skipped`);
          continue;
        }
        log("info", `[*] Target IP (from DB) : ${targetIp}`);

        // Bug 1 fix: if this VM had to boot, give the agent more time (150s vs 30s)
        const justBooted = asset.vmidProxmox && bootedVmids.has(asset.vmidProxmox);
        const agentWaitMs = justBooted ? 300_000 : 60_000;
        log("info", `[*] Searching for alive Caldera agent (timeout=${agentWaitMs / 1000}s)...`);

        const agentFound = await waitAgentAlive(targetIp, agentWaitMs);
        if (!agentFound) {
          const alive = (await fetchAliveAgents()).map((a) => a.host).join(", ") || "none";
          log("error", `[✗] No alive agent at ${targetIp} after ${agentWaitMs / 1000}s — alive agents: ${alive}`);
          continue;
        }

        // Re-fetch to get paw
        const aliveAgents = await fetchAliveAgents();
        const agent = aliveAgents.find((a) =>
          (a.host_ip_addrs as string[]).includes(targetIp)
        );
        log("success", `[+] Agent : ${agent!.host} | paw=${agent!.paw}`);

        // Bug 2 fix: use a unique per-paw group to avoid targeting all alive agents.
        // We assign the agent to a dedicated group, then target that group.
        const dedicatedGroup = `cyberlab-${asset.id}-${Date.now()}`;
        log("info", `[*] Assigning agent ${agent!.paw} to group '${dedicatedGroup}'...`);
        await fetch("/api/caldera/agents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paw: agent!.paw, group: dedicatedGroup }),
        });

        // Launch Caldera operation targeting the dedicated group
        const opRes = await fetch("/api/caldera/operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:      `attack-${asset.name}-${Date.now()}`,
            adversary: { adversary_id: adversaryId },
            group:     dedicatedGroup,
            planner:   { id: "atomic" },
            state:     "running",
          }),
        });
        const op = await opRes.json();
        if (!opRes.ok || !op.id) {
          log("error", `[✗] Operation creation failed: ${op.error ?? opRes.status}`);
          continue;
        }
        log("success", `[+] Operation : ${op.name} (id=${op.id})`);
        opIds.push(op.id);
        opToAssetRef.current[op.id] = { name: asset.name, ip: targetIp };
      }

      if (opIds.length === 0)
        throw new Error("No operations were launched — verify agents are reachable");

      opIdsRef.current = opIds;
      localStorage.setItem("cyberlab_attack_launch",   new Date().toISOString());
      localStorage.setItem("cyberlab_operation_ids",   JSON.stringify(opIds));

      // ═══════════════════════════════════════════════════
      // PHASE 4 — Poll operations
      // ═══════════════════════════════════════════════════
      log("system", "──────────────────────────────────────────────────");
      log("info",   `[*] Phase 4 — ${opIds.length} operation(s) running — polling every 3 s...`);

      const shownLinks  = new Set<string>();
      const finishedOps = new Set<string>();

      pollRef.current = setInterval(async () => {
        try {
          for (const opId of opIds) {
            if (finishedOps.has(opId)) continue;
            const pollRes = await fetch(`/api/caldera/operations/${opId}`);
            if (!pollRes.ok) continue;
            const result = await pollRes.json();

            console.log("[CyberLab] poll:", opId, "state:", result.state, "chain len:", result.chain?.length, "first link status:", result.chain?.[0]?.status);

            for (const link of (result.chain ?? []) as any[]) {
              const key = `${opId}:${link.id}`;
              const isFinal = link.status === 0 || link.status === -1;
              if (shownLinks.has(key) || !isFinal) continue;
              shownLinks.add(key);

              console.log("[CyberLab] raw link:", JSON.stringify(link));
              const assetInfo = opToAssetRef.current[opId] ?? { name: "Unknown", ip: "" };
              const cmd = calderaB64(link.command ?? link.executor?.command);
              const out = calderaB64(link.output);

              setLines((prev) => [...prev, {
                type:        "ability",
                id:          key,
                techniqueId: link.ability?.technique_id ?? "",
                abilityName: link.ability?.name ?? "Unknown ability",
                assetName:   assetInfo.name,
                assetIp:     assetInfo.ip,
                command:     cmd,
                output:      out,
                status:      link.status === 0 ? "success" : "failed",
              } as AbilityResult]);
            }

            const state: string = result.state ?? "";
            if (state === "finished" || state === "cleanup" || state === "out_of_time") {
              finishedOps.add(opId);
              setLines((prev) => [...prev, {
                type: "success",
                text: `[=] Operation ${opId} — ${state}`,
              }]);
            }
          }

          if (finishedOps.size === opIds.length) {
            if (pollRef.current) clearInterval(pollRef.current);
            setLines((prev) => [...prev, {
              type: "system",
              text: "[=] All operations complete. Generate a report to review findings.",
            }]);
            doneRef.current = true;
            setRunning(false);
            setDone(true);
            registerAttack("terminé");
          }
        } catch { /* ignore transient poll errors */ }
      }, 3_000);

      // Safety timeout: 10 min
      setTimeout(() => {
        if (!doneRef.current) {
          if (pollRef.current) clearInterval(pollRef.current);
          setLines((prev) => [...prev, { type: "warn", text: "[!] Timeout — check Caldera UI for full results" }]);
          doneRef.current = true;
          setRunning(false);
          setDone(true);
          registerAttack("stoppé");
        }
      }, 600_000);

    } catch (err: any) {
      setLines((prev) => [...prev, { type: "error", text: `[✗] ${err.message}` }]);
      doneRef.current = true;
      setRunning(false);
      setDone(true);
    }
  };

  // ── Operation controls ──────────────────────────────────────────────────
  const patchOpsState = (state: string) =>
    Promise.all(
      opIdsRef.current.map((id) =>
        fetch(`/api/caldera/operations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        })
      )
    );

  const handleStop = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    await patchOpsState("finished");
    doneRef.current = true;
    setRunning(false);
    setDone(true);
    log("warn", "[■] Attack stopped by user");
    registerAttack("stoppé");
  };

  // ── Report generation ───────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    if (!opIdsRef.current.length) return;
    setGenerating(true);
    log("info", "[*] Generating report via Gemini — this may take ~30 s...");
    try {
      const res  = await fetch("/api/report/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ operationIds: opIdsRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.status);

      const html     = buildPrintHtml(data.report);
      const blob     = new Blob([html], { type: "text/html" });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `cyberlab-report-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      log("success", "[✓] Report downloaded — open the file and print (Ctrl+P) to save as PDF");
    } catch (err: any) {
      log("error", `[✗] Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Checklist (pre-launch UI) ───────────────────────────────────────────
  const canLaunch = check.assetsSelected && check.ttpsSelected && check.vmidsOk;

  const checklist = [
    {
      label: `${assets.length} actif(s) sélectionné(s)`,
      ok: check.assetsSelected,
      checking: false,
    },
    {
      label: "Au moins un TTP sélectionné",
      ok: check.ttpsSelected,
      checking: false,
    },
    {
      label: "VM IDs Proxmox configurés",
      ok: check.vmidsOk,
      checking: false,
    },
    {
      label: "Agents Caldera vivants sur les cibles",
      ok: check.agentsAlive === true,
      checking: check.agentsAlive === null,
      // ⚠ Info only — does NOT block launch (VMs will be booted automatically)
      info: check.agentsAlive === false
        ? "Les VMs seront démarrées automatiquement au lancement"
        : undefined,
    },
  ];

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white shrink-0">Step 3 : Confirm &amp; Launch</h2>

      {!launched ? (
        <>
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl shrink-0">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Simulation Warning</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                Cette simulation génère du trafic d'attaque réel via Caldera.
                Les VMs nécessaires (Wazuh, Caldera, Router + cibles) seront démarrées
                automatiquement si elles ne sont pas déjà allumées.
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
                      <p className="text-gray-500 text-[10px]">
                        {a.os}{a.ip ? ` · ${a.ip}` : ""}{a.vmidProxmox ? ` · VM ${a.vmidProxmox}` : ""}
                      </p>
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

          {/* Pre-launch checklist */}
          <div className="flex flex-col gap-2.5 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pre-launch Checklist</p>
            {checklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 text-sm">
                {item.checking ? (
                  <Loader2 size={16} className="text-gray-500 animate-spin mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle
                    size={16}
                    className={`mt-0.5 shrink-0 ${item.ok ? "text-emerald-400" : "text-gray-700"}`}
                  />
                )}
                <div>
                  <span className={item.ok ? "text-gray-300" : item.checking ? "text-gray-500" : "text-gray-600"}>
                    {item.label}
                  </span>
                  {item.info && (
                    <p className="text-[10px] text-amber-500/80 mt-0.5 flex items-center gap-1">
                      <Power size={10} />
                      {item.info}
                    </p>
                  )}
                </div>
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
            <div className="flex items-center gap-2">
              {running && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-all"
                >
                  <Square size={12} />
                  Stop
                </button>
              )}
              {done && (
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait text-white text-xs font-semibold transition-all shadow-md shadow-indigo-900/30"
                >
                  {generating
                    ? <Loader2 size={13} className="animate-spin" />
                    : <FileText size={13} />}
                  {generating ? "Generating…" : "Generate Report"}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-gray-950 border border-gray-800/60 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs text-gray-600 font-mono">caldera — operation terminal</span>
            </div>
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5"
            >
              {lines.map((entry, i) => {
                if (entry.type === "ability") {
                  const ae = entry as AbilityResult;
                  return (
                    <AbilityCard
                      key={ae.id}
                      entry={ae}
                      expanded={expanded.has(ae.id)}
                      onToggle={() => setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(ae.id)) next.delete(ae.id); else next.add(ae.id);
                        return next;
                      })}
                    />
                  );
                }
                const line = entry as TerminalLine;
                return (
                  <div key={i} className={`${LINE_COLORS[line.type] ?? "text-gray-400"} whitespace-pre-wrap`}>
                    {line.text}
                  </div>
                );
              })}
              {running && <div className="text-gray-600 animate-pulse">▋</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}