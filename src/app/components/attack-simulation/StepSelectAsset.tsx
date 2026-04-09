"use client";

import { useState } from "react";
import { Search, Monitor, Server, Terminal, Laptop } from "lucide-react";
import { Asset } from "@/types/simulation";

const ASSETS: Asset[] = [
  { id: "ws-corp-042", name: "WS-CORP-042", os: "Windows 11", status: "Online" },
  { id: "srv-dc-01", name: "SRV-DC-01", os: "Windows Server 2022", status: "Online" },
  { id: "dev-linux-01", name: "DEV-LINUX-01", os: "Ubuntu", status: "Offline" },
  { id: "user-laptop-03", name: "USER-LAPTOP-03", os: "MacOS", status: "Online" },
];

const OS_ICONS: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  "Windows 11": Monitor,
  "Windows Server 2022": Server,
  "Ubuntu": Terminal,
  "MacOS": Laptop,
};

interface Props {
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset | null) => void;
}

export default function StepSelectAsset({ selectedAsset, onSelectAsset }: Props) {
  const [search, setSearch] = useState("");

  const filtered = ASSETS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.os.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (asset: Asset) => {
    if (selectedAsset?.id === asset.id) {
      onSelectAsset(null);
    } else {
      onSelectAsset(asset);
    }
  };

  return (
    <div className="flex flex-col gap-5 flex-1">
      <h2 className="text-lg font-bold text-white">Step 1: Select Target Asset</h2>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets, attacks, or users..."
          className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
        />
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((asset) => {
          const isSelected = selectedAsset?.id === asset.id;
          const Icon = OS_ICONS[asset.os] ?? Monitor;
          const isOnline = asset.status === "Online";

          return (
            <button
              key={asset.id}
              onClick={() => handleSelect(asset)}
              className={`relative flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "border-brand bg-brand-light shadow-md shadow-brand/10"
                  : "border-gray-800 bg-gray-800/30 hover:border-gray-700 hover:bg-gray-800/50"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  isSelected
                    ? "bg-brand border-brand"
                    : "border-gray-600 bg-transparent"
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 10 8" className="w-3 h-2.5 fill-white">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${isSelected ? "text-brand-dark" : "text-white"}`}>
                  {asset.name}
                </p>
                <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-500" : "text-gray-500"}`}>
                  ({asset.os})
                </p>
                <p
                  className={`text-xs font-semibold mt-1.5 ${
                    isOnline ? "text-emerald-400" : "text-gray-600"
                  }`}
                >
                  {isOnline ? "● " : "○ "}
                  {asset.status}
                </p>
              </div>

              {/* OS icon */}
              <Icon
                size={20}
                className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-brand" : "text-gray-600"}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
