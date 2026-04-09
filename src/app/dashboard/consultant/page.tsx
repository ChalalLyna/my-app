"use client";
 
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import { Crosshair, Eye, Flag, Server, Clock } from "lucide-react";
 
const STATS = [
  { label: "Simulations actives",  value: "3",  icon: Crosshair, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Assets assignés",      value: "18", icon: Server,    color: "text-blue-400",   bg: "bg-blue-500/10" },
  { label: "Alertes détectées",    value: "7",  icon: Eye,       color: "text-amber-400",  bg: "bg-amber-500/10" },
  { label: "Missions en cours",    value: "2",  icon: Flag,      color: "text-emerald-400",bg: "bg-emerald-500/10" },
];
 
export default function ConsultantDashboard() {
  const { user } = useAuth();
 
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
              Consultant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bonjour, {user?.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Tableau de bord — Workspace Global Lab</p>
        </div>
 
        <div className="grid grid-cols-4 gap-4 mb-8">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={18} className={s.color} />
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>
 
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-brand" />
            <p className="text-sm font-semibold text-white">Simulations récentes</p>
          </div>
          <div className="space-y-2">
            {[
              { name: "WS-CORP-042", adversary: "APT29", status: "Terminée", ok: true },
              { name: "SRV-DC-01", adversary: "FIN7", status: "En cours", ok: null },
              { name: "USER-LAPTOP-03", adversary: "Ransomware", status: "En attente", ok: false },
            ].map((sim, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-800/40 rounded-xl text-sm">
                <span className="text-white font-medium">{sim.name}</span>
                <span className="text-gray-500 text-xs">{sim.adversary}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  sim.ok === true  ? "text-emerald-400 bg-emerald-500/10" :
                  sim.ok === null  ? "text-amber-400 bg-amber-500/10" :
                                     "text-gray-500 bg-gray-800"
                }`}>
                  {sim.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
 