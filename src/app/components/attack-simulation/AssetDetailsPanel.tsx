"use client";

import { Asset } from "@/types/simulation";
import { Monitor, Cpu, HardDrive, Wifi, Shield } from "lucide-react";

interface Props {
  asset: Asset | null;
}

const ASSET_DETAILS: Record<string, { ip: string; mac: string; cpu: string; ram: string; disk: string }> = {
  "ws-corp-042": { ip: "192.168.10.42", mac: "AA:BB:CC:DD:EE:FF", cpu: "Intel i7-12700", ram: "16 GB", disk: "512 GB SSD" },
  "srv-dc-01": { ip: "192.168.1.1", mac: "11:22:33:44:55:66", cpu: "Xeon E-2334", ram: "64 GB", disk: "2 TB NVMe" },
  "dev-linux-01": { ip: "192.168.10.55", mac: "AA:11:BB:22:CC:33", cpu: "AMD Ryzen 5", ram: "32 GB", disk: "1 TB SSD" },
  "user-laptop-03": { ip: "192.168.20.18", mac: "FF:EE:DD:CC:BB:AA", cpu: "Apple M2", ram: "8 GB", disk: "256 GB SSD" },
};

export default function AssetDetailsPanel({ asset }: Props) {
  const details = asset ? ASSET_DETAILS[asset.id] : null;

  return (
    <div className="w-56 bg-gray-900/60 border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-4 flex-shrink-0">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Asset Details</p>

      {asset && details ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Name badge */}
          <div className="bg-gray-800/70 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Monitor size={13} className="text-brand" />
              <p className="text-white font-bold text-sm truncate">{asset.name}</p>
            </div>
            <p className="text-gray-500 text-xs">{asset.os}</p>
            <p className={`text-xs font-semibold mt-1 ${asset.status === "Online" ? "text-emerald-400" : "text-gray-600"}`}>
              ● {asset.status}
            </p>
          </div>

          {/* Network */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Wifi size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Network</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">IP</span>
                <span className="text-gray-300 font-mono font-medium">{details.ip}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">MAC</span>
                <span className="text-gray-400 font-mono text-[10px]">{details.mac}</span>
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Hardware</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">CPU</span>
                <span className="text-gray-300 text-right text-[11px] max-w-[100px] leading-tight">{details.cpu}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">RAM</span>
                <span className="text-gray-300">{details.ram}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Disk</span>
                <span className="text-gray-300">{details.disk}</span>
              </div>
            </div>
          </div>

          {/* Security posture */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={11} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Posture</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-indigo-400 rounded-full"
                  style={{ width: asset.status === "Online" ? "72%" : "0%" }}
                />
              </div>
              <span className="text-xs text-gray-400 font-semibold">
                {asset.status === "Online" ? "72%" : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center">
            <Monitor size={20} className="text-gray-700" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Select an asset to view its details
          </p>
        </div>
      )}
    </div>
  );
}
