"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Network,
  Server,
  Crosshair,
  Eye,
  Flag,
  BookOpen,
  Layers,
  Shield,
  Users,
  LucideIcon // <-- Ajout important pour TypeScript
} from "lucide-react";

// 1. On crée le "moule" pour dire à TypeScript à quoi ressemble un bouton de menu
interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean; // Le "?" veut dire "optionnel"
  badge?: number;   // Le "?" veut dire "optionnel"
}

// 2. On applique ce moule à notre liste
const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Infrastructure / Assets", icon: Network, href: "/infrastructure" },
  { label: "Assets", icon: Server, href: "/assets" },
  { label: "Attack Simulation", icon: Crosshair, href: "/attack-simulation", active: true },
  { label: "Detection", icon: Eye, href: "/detection" },
  { label: "Mission", icon: Flag, href: "/mission" },
  { label: "Cours", icon: BookOpen, href: "/cours" },
  { label: "Scenarios", icon: Layers, href: "/scenarios" },
  { label: "CTI", icon: Shield, href: "/cti" },
  { label: "Users", icon: Users, href: "/users" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-950 border-r border-gray-800/60 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800/60">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/30">
          <Shield size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">CyberLab</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600 [scrollbar-width:thin] [scrollbar-color:#374151_transparent]">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    item.active
                      ? "bg-brand text-white shadow-md shadow-brand/25"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/70"
                  }`}
                >
                  <Icon
                    size={17}
                    className={item.active ? "text-white" : "text-gray-500 group-hover:text-gray-300"}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      item.active ? "bg-white/20 text-white" : "bg-gray-700 text-gray-300"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.badge === 0 && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500">
                      0
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Status */}
      <div className="px-5 py-4 border-t border-gray-800/60">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">
          System Status
        </p>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-gray-400 font-medium">Ludus Active</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-800/40">
        <p className="text-[10px] text-gray-700">
          © 2022 CyberLab Simulation Platform. All rights reserved.
        </p>
      </div>
    </aside>
  );
}