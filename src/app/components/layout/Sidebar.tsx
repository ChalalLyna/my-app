"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LogOut, Flag, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useMission } from "@/app/context/MissionContext";
import { NAV_ITEMS } from "@/app/config/navigation";


export default function Sidebar() {
  const { user, logout } = useAuth();
  const { activeMission, exitMission } = useMission();
  const pathname = usePathname();

  if (!user) return null;

  const items = NAV_ITEMS[user.role];

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-950 border-r border-gray-800/60 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800/60">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/30">
          <Shield size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">CyberLab</span>
      </div>

      {/* Mission active banner */}
      {activeMission && (
        <div className="mx-3 mt-3 rounded-xl border border-red-800/60 bg-red-950/40 p-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Mission Active</span>
            </div>
            <button
              onClick={exitMission}
              className="text-red-600 hover:text-red-400 transition-colors"
              title="Quitter la mission"
            >
              <X size={13} />
            </button>
          </div>
          <div className="flex items-start gap-1.5">
            <Flag size={11} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{activeMission.name}</p>
          </div>
          <p className="text-[10px] text-red-400/70 mt-1 font-mono">{activeMission.id} · {activeMission.type}</p>
        </div>
      )}

      {/* Nav */}
      
       <nav className="flex-1 px-3 py-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600 [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-brand text-white shadow-md shadow-brand/25"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/70"
                  }`}
                >
                  <Icon
                    size={17}
                    className={isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-700 text-gray-300"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.badge === 0 && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">0</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*  logout */}
      <div className="px-4 py-4 border-t border-gray-800/60">
        
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

    </aside>
  );
}
