"use client";

import { useState } from "react";
import { Search, Skull, Bug, UserX, Globe } from "lucide-react";
import { Adversary } from "@/types/simulation";

const ADVERSARIES: Adversary[] = [
  {
    id: "apt29",
    name: "APT29 (Cozy Bear)",
    ttps: ["T1566", "T1078", "T1021"],
    severity: "Critical",
    description: "Russian state-sponsored APT known for supply chain attacks.",
  },
  {
    id: "lazarus",
    name: "Lazarus Group",
    ttps: ["T1059", "T1105", "T1083"],
    severity: "Critical",
    description: "North Korean threat actor targeting financial institutions.",
  },
  {
    id: "fin7",
    name: "FIN7",
    ttps: ["T1566.001", "T1204", "T1055"],
    severity: "High",
    description: "Financially motivated group targeting retail and hospitality.",
  },
  {
    id: "generic-ransomware",
    name: "Generic Ransomware",
    ttps: ["T1486", "T1489", "T1490"],
    severity: "High",
    description: "Common ransomware patterns for endpoint resilience testing.",
  },
  {
    id: "insider-threat",
    name: "Insider Threat Simulation",
    ttps: ["T1078", "T1048", "T1074"],
    severity: "Medium",
    description: "Simulates malicious insider data exfiltration behaviors.",
  },
  {
    id: "web-app-attacker",
    name: "Web Application Attacker",
    ttps: ["T1190", "T1059.007", "T1505"],
    severity: "Medium",
    description: "OWASP-based web attack simulation with common vulnerabilities.",
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-900/30 border-red-800/50",
  High: "text-orange-400 bg-orange-900/30 border-orange-800/50",
  Medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
  Low: "text-green-400 bg-green-900/30 border-green-800/50",
};

const ICONS = [Skull, Bug, UserX, Globe];

interface Props {
  selectedAdversary: Adversary | null;
  onSelectAdversary: (adversary: Adversary | null) => void;
}

export default function StepSelectAdversary({ selectedAdversary, onSelectAdversary }: Props) {
  const [search, setSearch] = useState("");

  const filtered = ADVERSARIES.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ttps.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-5 flex-1">
      <h2 className="text-lg font-bold text-white">Step 2: Select Adversary / TTP</h2>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search adversaries or TTPs..."
          className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {filtered.map((adversary, i) => {
          const isSelected = selectedAdversary?.id === adversary.id;
          const Icon = ICONS[i % ICONS.length];

          return (
            <button
              key={adversary.id}
              onClick={() =>
                onSelectAdversary(isSelected ? null : adversary)
              }
              className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "border-brand bg-brand-light shadow-md shadow-brand/10"
                  : "border-gray-800 bg-gray-800/30 hover:border-gray-700 hover:bg-gray-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-brand/20" : "bg-gray-700/60"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={isSelected ? "text-brand" : "text-gray-400"}
                    />
                  </div>
                  <p
                    className={`font-bold text-sm leading-tight ${
                      isSelected ? "text-brand-dark" : "text-white"
                    }`}
                  >
                    {adversary.name}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 ${
                    SEVERITY_COLORS[adversary.severity]
                  }`}
                >
                  {adversary.severity}
                </span>
              </div>

              <p className={`text-xs leading-relaxed ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                {adversary.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-1">
                {adversary.ttps.map((ttp) => (
                  <span
                    key={ttp}
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-brand/15 text-brand"
                        : "bg-gray-700/60 text-gray-500"
                    }`}
                  >
                    {ttp}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
