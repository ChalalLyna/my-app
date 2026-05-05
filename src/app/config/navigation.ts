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
  Settings,
  BarChart2,
  GraduationCap,
  ClipboardList,
  Activity,
  UserCog,
  Database,
} from "lucide-react";
import { UserRole } from "@/app/context/AuthContext";

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  href: string;
  badge?: number;
  section?: string; // optional section divider label
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  // ─── ADMIN ───────────────────────────────────────────────────
  admin: [
    { label: "Dashboard",               icon: LayoutDashboard, href: "/dashboard/admin" },
    { label: "Utilisateurs",            icon: Users,           href: "/admin/users" },
    { label: "Infrastructure / Assets", icon: Network,         href: "/infrastructure" },
    { label: "Mission",                 icon: Flag,            href: "/mission" },
    { label: "Scenarios",               icon: Layers,          href: "/scenarios" },
    { label: "CTI",                     icon: Shield,          href: "/cti" },
    { label: "Cours",                   icon: BookOpen,        href: "/cours" },
    { label: "Rapports",                icon: BarChart2,       href: "/admin/reports" },
    { label: "Paramètres",              icon: Settings,        href: "/admin/settings" },
  ],

  // ─── CONSULTANT ──────────────────────────────────────────────
  consultant: [
    { label: "Dashboard",               icon: LayoutDashboard, href: "/dashboard/consultant" },
    { label: "Infrastructure / Assets", icon: Network,         href: "/infrastructure"},
    { label: "Attack Simulation",       icon: Crosshair,       href: "/attack-simulation"},
    { label: "Detection",               icon: Eye,             href: "/detection" },
    { label: "Mission",                 icon: Flag,            href: "/mission" },
    { label: "Scenarios",               icon: Layers,         href: "/scenarios" },
    { label: "CTI",                     icon: Shield,          href: "/cti" },
    
  ],

  // ─── APPRENANT ───────────────────────────────────────────────
  apprenant: [
    { label: "Dashboard",               icon: LayoutDashboard,  href: "/dashboard/apprenant" },
    { label: "Attack Simulation",       icon: Crosshair,       href: "/attack-simulation"},
    { label: "Detection",               icon: Eye,             href: "/detection" },
    { label: "Hub Formation",           icon: GraduationCap,    href: "/cours" },
    { label: "Scenarios",               icon: Layers,           href: "/scenarios" },
    
  ],
};
