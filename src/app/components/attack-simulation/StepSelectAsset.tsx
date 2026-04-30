"use client";

import { useState, useEffect } from "react";
import { Search, Monitor, Server, Terminal, Laptop, Loader2, AlertCircle, Tag } from "lucide-react";
import { Asset } from "@/app/types/simulation";

function getOsIcon(os: string): React.ComponentType<{ size: number; className?: string }> {
  const lower = os.toLowerCase();
  if (lower.includes("windows server")) return Server;
  if (lower.includes("windows"))        return Monitor;
  if (lower.includes("ubuntu") || lower.includes("linux") || lower.includes("debian")) return Terminal;
  if (lower.includes("mac") || lower.includes("darwin")) return Laptop;
  return Monitor;
}

interface Props {
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset | null) => void;
}

export default function StepSelectAsset({ selectedAsset, onSelectAsset }: Props) {
  const [search, setSearch]   = useState("");
  const [assets, setAssets]   = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAssets(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.os.toLowerCase().includes(search.toLowerCase()) ||
      (a.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (asset: Asset) => {
    onSelectAsset(selectedAsset?.id === asset.id ? null : asset);
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
          placeholder="Search assets by name, OS, category..."
          className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 size={26} className="text-brand animate-spin" />
          <p className="text-sm text-gray-400">Chargement des actifs...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4">
          <AlertCircle size={26} className="text-red-400" />
          <p className="text-sm text-red-400 font-semibold text-center">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetch("/api/assets").then(r => r.json()).then(setAssets).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="text-xs text-brand hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Asset grid */}
      {!loading && !error && (
        <>
          {filtered.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">
              {assets.length === 0 ? "Aucun actif dans la base de données" : "Aucun actif trouvé"}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
            {filtered.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              const Icon       = getOsIcon(asset.os);
              const isOnline   = asset.status === "Online";

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
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                      isSelected ? "bg-brand border-brand" : "border-gray-600 bg-transparent"
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
                    <p className={`font-bold text-sm truncate ${isSelected ? "text-brand-dark" : "text-white"}`}>
                      {asset.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-500" : "text-gray-500"}`}>
                      {asset.os}
                    </p>

                    {/* Category badge */}
                    {asset.category && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Tag size={9} className={isSelected ? "text-brand" : "text-gray-600"} />
                        <span className={`text-[10px] font-medium ${isSelected ? "text-brand" : "text-gray-600"}`}>
                          {asset.category}
                        </span>
                      </div>
                    )}

                    {/* Description (truncated) */}
                    {asset.description && (
                      <p className={`text-[10px] mt-1 leading-snug line-clamp-2 ${isSelected ? "text-indigo-600" : "text-gray-600"}`}>
                        {asset.description}
                      </p>
                    )}

                    <p className={`text-xs font-semibold mt-1.5 ${isOnline ? "text-emerald-400" : "text-gray-600"}`}>
                      {isOnline ? "● " : "○ "}
                      {asset.status}
                    </p>
                  </div>

                  {/* OS icon */}
                  <Icon
                    size={20}
                    className={`mt-0.5 shrink-0 ${isSelected ? "text-brand" : "text-gray-600"}`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
