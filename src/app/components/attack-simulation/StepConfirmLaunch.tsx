"use client";
 
import { useState, useEffect, useRef } from "react";
import { Asset } from "@/app/types/simulation";
import { Step2Selection } from "./StepSelectAdversary";
import { CheckCircle, Monitor, Shield, Zap, AlertTriangle, Terminal, FileText, Circle, Square } from "lucide-react";
 
// ─── Fake terminal lines ──────────────────────────────────────────────────────
 
const buildTerminalScript = (assetName: string, ttps: string[], adversaryName: string | null) => [
  { delay: 0,    type: "system",  text: "╔══════════════════════════════════════════════════╗" },
  { delay: 50,   type: "system",  text: "║      CALDERA — Autonomous Adversary Emulation    ║" },
  { delay: 100,  type: "system",  text: "╚══════════════════════════════════════════════════╝" },
  { delay: 300,  type: "info",    text: `[*] Initializing operation...` },
  { delay: 700,  type: "info",    text: `[*] Target: ${assetName}` },
  { delay: 900,  type: "info",    text: adversaryName ? `[*] Adversary profile: ${adversaryName}` : `[*] Mode: Manual TTP selection` },
  { delay: 1100, type: "info",    text: `[*] TTPs loaded: ${ttps.join(", ")}` },
  { delay: 1500, type: "success", text: `[+] Connection established to ${assetName}` },
  { delay: 1900, type: "info",    text: `[*] Starting ability execution pipeline...` },
  ...(ttps.flatMap((ttp, i) => [
    { delay: 2200 + i * 900, type: "run",     text: `[→] Executing ${ttp}...` },
    { delay: 2550 + i * 900, type: "success", text: `[✓] ${ttp} completed — artifacts collected` },
  ])),
  { delay: 2200 + ttps.length * 900 + 200,  type: "warn",    text: `[!] Detection event triggered on ${assetName}` },
  { delay: 2200 + ttps.length * 900 + 500,  type: "info",    text: `[*] Sending results to SIEM...` },
  { delay: 2200 + ttps.length * 900 + 900,  type: "success", text: `[+] Operation complete — ${ttps.length} abilities executed` },
  { delay: 2200 + ttps.length * 900 + 1100, type: "system",  text: `[=] Session closed. Generate a report to review findings.` },
];
 
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
 
// ─── Component ────────────────────────────────────────────────────────────────
export default function StepConfirmLaunch({ asset, step2 }: Props) {
  const { adversary, selectedTTPs } = step2;
  const [launched, setLaunched] = useState(false);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<{ type: string; text: string }[]>([]);
  const [running, setRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
 
  const ttpIds = selectedTTPs.map(t => t.id);
 
  const handleLaunch = () => {
    if (!asset || selectedTTPs.length === 0) return;
    localStorage.setItem("cyberlab_attack_launch", new Date().toISOString());
    setLaunched(true);
    setRunning(true);
    setLines([]);
    setDone(false);
 
    const script = buildTerminalScript(asset.name, ttpIds, adversary?.name ?? null);
    const totalDuration = script[script.length - 1].delay + 500;
 
    script.forEach(({ delay, type, text }) => {
      setTimeout(() => {
        setLines(prev => [...prev, { type, text }]);
      }, delay);
    });
 
    setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, totalDuration);
  };
 
  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);
 
  const checklist = [
    { label: "Target asset is reachable and online", ok: asset?.status === "Online" },
    { label: "At least one TTP selected",            ok: selectedTTPs.length > 0 },
    { label: "Monitoring / SIEM is active (Ludus)",  ok: true },
    { label: "Simulation authorized by administrator", ok: false },
  ];
 
  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white flex-shrink-0">Step 3: Confirm & Launch</h2>
 
      {!launched ? (
        <>
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Simulation Warning</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                This simulation will generate real attack traffic against the selected asset. Ensure the target
                is authorized for testing and monitoring is active.
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
                  <p className={`text-xs font-semibold mt-2 ${asset.status === "Online" ? "text-emerald-400" : "text-gray-500"}`}>
                    ● {asset.status}
                  </p>
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
              {adversary ? (
                <>
                  <p className="text-white font-bold">{adversary.name}</p>
                </>
              ) : null}
              {selectedTTPs.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTTPs.map(t => (
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
        </>
      ) : (
        /* ── TERMINAL ── */
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {/* Status bar */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Terminal size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Caldera Output</span>
              {running && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Running...
                </span>
              )}
              {done && (
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
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80 flex-shrink-0">
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
              {running && (
                <div className="text-gray-600 animate-pulse">▋</div>
              )}
            </div>
          </div>
        </div>
      )}
 
      {/* Launch button — shown in footer of AttackSimulationWorkspace, but we expose a handler */}
      {!launched && (
        <div className="flex justify-end flex-shrink-0">
          <button
            onClick={handleLaunch}
            disabled={!asset || selectedTTPs.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              asset && selectedTTPs.length > 0
                ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            <Zap size={14} />
            Launch Simulation
          </button>
        </div>
      )}
    </div>
  );
}