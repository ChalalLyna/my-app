"use client";

import { useState, useEffect } from "react";
import { Search, Skull, Bug, UserX, Globe, Shield, ChevronRight, X, Loader2, AlertCircle } from "lucide-react";
import { Adversary, TTP } from "@/app/types/simulation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTactic(raw: string): string {
  if (!raw) return "Unknown";
  return raw.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function inferSeverityFromTactics(ttps: TTP[]): "Critical" | "High" | "Medium" | "Low" {
  const tactics = ttps.map(t => t.tactic.toLowerCase());
  if (tactics.some(t => t.includes("impact") || t.includes("exfiltration"))) return "Critical";
  if (tactics.some(t => t.includes("lateral") || t.includes("privilege"))) return "High";
  if (tactics.some(t => t.includes("execution") || t.includes("persistence") || t.includes("command"))) return "Medium";
  return "Low";
}

function deduplicateTTPs(ttps: TTP[]): TTP[] {
  const seen = new Set<string>();
  return ttps.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

// ─── Colors ───────────────────────────────────────────────────────────────────


const TACTIC_COLORS: Record<string, string> = {
  "Initial Access":       "text-red-400 bg-red-900/20",
  "Execution":            "text-orange-400 bg-orange-900/20",
  "Persistence":          "text-amber-400 bg-amber-900/20",
  "Privilege Escalation": "text-yellow-400 bg-yellow-900/20",
  "Defense Evasion":      "text-lime-400 bg-lime-900/20",
  "Lateral Movement":     "text-cyan-400 bg-cyan-900/20",
  "Collection":           "text-blue-400 bg-blue-900/20",
  "Command And Control":  "text-indigo-400 bg-indigo-900/20",
  "Exfiltration":         "text-purple-400 bg-purple-900/20",
  "Impact":               "text-pink-400 bg-pink-900/20",
  "Discovery":            "text-teal-400 bg-teal-900/20",
};

const ICONS = [Skull, Bug, UserX, Globe, Shield, Skull];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Step2Selection {
  adversary: Adversary | null;
  selectedTTPs: TTP[];
}

interface Props {
  selection: Step2Selection;
  onSelectionChange: (s: Step2Selection) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepSelectAdversary({ selection, onSelectionChange }: Props) {
  const [mode, setMode] = useState<"adversary" | "ttp">("adversary");
  const [search, setSearch] = useState("");
  const [tacticFilter, setTacticFilter] = useState<string | null>(null);
  const [adversaries, setAdversaries] = useState<Adversary[]>([]);
  const [allTtps, setAllTtps] = useState<TTP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { adversary: selectedAdversary, selectedTTPs } = selection;

  // ── Fetch from Caldera ──
  useEffect(() => {
    async function fetchCalderaData() {
      try {
        setLoading(true);
        setError(null);

        const [adversariesRes, abilitiesRes] = await Promise.all([
          fetch("/api/caldera/adversaries"),
          fetch("/api/caldera/abilities"),
        ]);

        if (!adversariesRes.ok || !abilitiesRes.ok) {
          throw new Error("Impossible de contacter Caldera. Vérifiez que le serveur est accessible.");
        }

        const calderaAdversaries: any[] = await adversariesRes.json();
        const calderaAbilities: any[] = await abilitiesRes.json();

        // Build technique_id → TTP map, collecting all ability_ids per technique
        const abilityMap = new Map<string, TTP>();
        for (const ab of calderaAbilities) {
          if (!ab.ability_id) continue;
          const key = ab.technique_id || ab.ability_id;
          const existing = abilityMap.get(key);
          if (existing) {
            existing.calderaAbilityIds = [...(existing.calderaAbilityIds ?? []), ab.ability_id];
          } else {
            abilityMap.set(key, {
              id:                key,
              name:              ab.technique_name || ab.name || "Unknown",
              tactic:            formatTactic(ab.tactic || ""),
              description:       ab.description || "",
              calderaAbilityIds: [ab.ability_id],
            });
          }
        }

        // Unique TTPs by technique_id (for TTP mode)
        const uniqueTtps = deduplicateTTPs([...abilityMap.values()]);
        setAllTtps(uniqueTtps);

        // Map adversaries
        const mapped: Adversary[] = calderaAdversaries
          .filter(adv => adv.atomic_ordering?.length > 0)
          .map(adv => {
            const ttps = deduplicateTTPs(
              (adv.atomic_ordering as string[])
                .map(aid => abilityMap.get(aid))
                .filter((t): t is TTP => !!t)
            );
            return {
              id:          adv.adversary_id,
              name:        adv.name || "Unknown",
              description: adv.description || "No description available.",
              severity:    inferSeverityFromTactics(ttps),
              ttps,
            };
          })
          .filter(adv => adv.ttps.length > 0);

        setAdversaries(mapped);
      } catch (err: any) {
        setError(err.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    fetchCalderaData();
  }, []);

  // ── Derived lists ──
  const ttpsToShow = selectedAdversary ? selectedAdversary.ttps : allTtps;

  const filteredAdversaries = adversaries.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.ttps.some(t => t.id.toLowerCase().includes(search.toLowerCase()))
  );

  const uniqueTactics = [...new Set(ttpsToShow.map(t => t.tactic))].sort();

  const filteredTTPs = ttpsToShow.filter(t => {
    const matchesSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tactic.toLowerCase().includes(search.toLowerCase());
    const matchesTactic = tacticFilter === null || t.tactic === tacticFilter;
    return matchesSearch && matchesTactic;
  });

  // ── Handlers ──
  const handleSelectAdversary = (adv: Adversary) => {
    if (selectedAdversary?.id === adv.id) {
      onSelectionChange({ adversary: null, selectedTTPs: [] });
    } else {
      onSelectionChange({ adversary: adv, selectedTTPs: adv.ttps });
    }
  };

  const handleToggleTTP = (ttp: TTP) => {
    const exists = selectedTTPs.find(t => t.id === ttp.id);
    const next = exists
      ? selectedTTPs.filter(t => t.id !== ttp.id)
      : [...selectedTTPs, ttp];
    onSelectionChange({ adversary: selectedAdversary, selectedTTPs: next });
  };

  const handleClearAdversary = () => {
    onSelectionChange({ adversary: null, selectedTTPs: [] });
    setMode("adversary");
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <Loader2 size={28} className="text-brand animate-spin" />
        <p className="text-sm text-gray-400">Chargement des données Caldera...</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-red-400 font-semibold text-center">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); }}
          className="text-xs text-brand hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <h2 className="text-lg font-bold text-white shrink-0">Step 2: Select Adversary / TTP</h2>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-800/60 rounded-xl shrink-0">
        <button
          onClick={() => { setMode("adversary"); setSearch(""); setTacticFilter(null); }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "adversary"
              ? "bg-gray-700 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Adversary Profile
          <span className="ml-1.5 text-[10px] text-gray-500">({adversaries.length})</span>
        </button>
        <button
          onClick={() => { setMode("ttp"); setSearch(""); setTacticFilter(null); }}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "ttp"
              ? "bg-gray-700 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {selectedAdversary ? `TTPs of ${selectedAdversary.name.split(" ")[0]}` : "TTPs directement"}
          {selectedTTPs.length > 0 && (
            <span className="ml-1.5 bg-brand/30 text-brand px-1.5 py-0.5 rounded-full text-[10px]">
              {selectedTTPs.length}
            </span>
          )}
        </button>
      </div>

      {/* Active adversary banner */}
      {selectedAdversary && mode === "ttp" && (
        <div className="flex items-center justify-between px-3 py-2 bg-brand/10 border border-brand/30 rounded-xl shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-brand" />
            <span className="text-xs font-semibold text-brand">{selectedAdversary.name}</span>
            <span className="text-[10px] text-gray-500">— sélectionnez les TTPs à inclure</span>
          </div>
          <button onClick={handleClearAdversary} className="text-gray-600 hover:text-red-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative shrink-0">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={mode === "adversary" ? "Search adversaries..." : "Search TTPs..."}
          className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
        />
      </div>

      {/* ── ADVERSARY MODE ── */}
      {mode === "adversary" && (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
          {filteredAdversaries.length === 0 && (
            <p className="col-span-2 text-sm text-gray-600 text-center py-8">Aucun adversaire trouvé</p>
          )}
          {filteredAdversaries.map((adv, i) => {
            const isSelected = selectedAdversary?.id === adv.id;
            const Icon = ICONS[i % ICONS.length];
            return (
              <button
                key={adv.id}
                onClick={() => handleSelectAdversary(adv)}
                className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-brand bg-brand-light shadow-md shadow-brand/10"
                    : "border-gray-800 bg-gray-800/30 hover:border-gray-700 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-brand/20" : "bg-gray-700/60"}`}>
                      <Icon size={15} className={isSelected ? "text-brand" : "text-gray-400"} />
                    </div>
                    <p className={`font-bold text-sm leading-tight ${isSelected ? "text-brand-dark" : "text-white"}`}>
                      {adv.name}
                    </p>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                  {adv.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {adv.ttps.slice(0, 5).map((t) => (
                    <span key={t.id} className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-brand/15 text-brand" : "bg-gray-700/60 text-gray-500"}`}>
                      {t.id}
                    </span>
                  ))}
                  {adv.ttps.length > 5 && (
                    <span className="text-[10px] text-gray-600">+{adv.ttps.length - 5}</span>
                  )}
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-brand font-semibold">
                    <ChevronRight size={11} />
                    Passer à la sélection des TTPs →
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── TTP MODE ── */}
      {mode === "ttp" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {/* Tactic filter */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => setTacticFilter(null)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                tacticFilter === null ? "bg-brand text-white" : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              Tous ({ttpsToShow.length})
            </button>
            {uniqueTactics.map(tactic => {
              const color = TACTIC_COLORS[tactic] ?? "text-gray-400 bg-gray-800/40";
              const count = ttpsToShow.filter(t => t.tactic === tactic).length;
              return (
                <button
                  key={tactic}
                  onClick={() => setTacticFilter(tacticFilter === tactic ? null : tactic)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                    tacticFilter === tactic ? color + " ring-1 ring-current" : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tactic} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
          {filteredTTPs.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">Aucun TTP trouvé</p>
          )}
          {filteredTTPs.map((ttp) => {
            const isSelected = selectedTTPs.some(t => t.id === ttp.id);
            const tacticColor = TACTIC_COLORS[ttp.tactic] ?? "text-gray-400 bg-gray-800/40";
            return (
              <button
                key={`${ttp.id}-${ttp.name}`}
                onClick={() => handleToggleTTP(ttp)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 ${
                  isSelected
                    ? "border-brand/60 bg-brand/5 shadow-sm"
                    : "border-gray-800 bg-gray-800/20 hover:border-gray-700 hover:bg-gray-800/40"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                  isSelected ? "bg-brand border-brand" : "border-gray-600"
                }`}>
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-brand">{ttp.id}</span>
                    <span className="text-white text-xs font-semibold">{ttp.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${tacticColor}`}>
                      {ttp.tactic}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{ttp.description}</p>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
