"use client";
 
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import { Users, Server, Crosshair, BarChart2, Shield, Activity } from "lucide-react";
 
const STATS = [
  { label: "Active users",       value: "24",  icon: Users,     color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Registered assets", value: "138", icon: Server,    color: "text-blue-400",   bg: "bg-blue-500/10" },
  { label: "Simulations run",   value: "57",  icon: Crosshair, color: "text-red-400",    bg: "bg-red-500/10" },
  { label: "Reports generated", value: "12",  icon: BarChart2,  color: "text-amber-400",  bg: "bg-amber-500/10" },
];
 
export default function AdminDashboard() {
  const { user } = useAuth();
 
  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full">
              Administrator
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Hello, {user?.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">CyberLab platform overview</p>
        </div>
 
        {/* Stats grid */}
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
 
        {/* Placeholder sections */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-brand" />
              <p className="text-sm font-semibold text-white">Recent activity</p>
            </div>
            <div className="space-y-2">
              {["Simulation launched on WS-CORP-042", "New user created: sara.b", "Asset SRV-DC-01 updated", "Monthly report generated"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-gray-500 py-1.5 border-b border-gray-800/40 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
 
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-brand" />
              <p className="text-sm font-semibold text-white">System status</p>
            </div>
            {[
              { label: "Ludus Core",        status: "Operational", ok: true },
              { label: "SIEM",              status: "Operational", ok: true },
              { label: "API Gateway",       status: "Operational", ok: true },
              { label: "Agent DEV-LINUX-01", status: "Offline",    ok: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/40 last:border-0">
                <span className="text-gray-400">{s.label}</span>
                <span className={s.ok ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}