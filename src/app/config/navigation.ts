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
  Terminal,
  ClipboardCheck,
  History,
  Map,
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
    { label: "Guides",                  icon: BookOpen,        href: "/cours" },
    { label: "Detection Coverage",        icon: Map,             href: "/coverage" },
    { label: "Activity",               icon: History,         href: "/admin/activity" },
  ],

  // ─── CONSULTANT ──────────────────────────────────────────────
  consultant: [
    { label: "Dashboard",               icon: LayoutDashboard, href: "/dashboard/consultant" },
    { label: "Attack Simulation",       icon: Crosshair,       href: "/attack-simulation"},
    { label: "Detection",               icon: Eye,             href: "/detection" },
    { label: "Rule Review",             icon: ClipboardCheck,  href: "/rule-review" },
    { label: "Mission",                 icon: Flag,            href: "/mission" },
    { label: "CTI",                     icon: Shield,          href: "/cti" },
    { label: "Detection Coverage",       icon: Map,             href: "/coverage" },
    { label: "Manual Pentest",          icon: Terminal,        href: "/manual-pentest" },
  ],

  // ─── APPRENANT ───────────────────────────────────────────────
  apprenant: [
    { label: "Dashboard",         icon: LayoutDashboard, href: "/dashboard/apprenant" },
    { label: "Attack Simulation", icon: Crosshair,       href: "/attack-simulation" },
    { label: "Detection",         icon: Eye,             href: "/detection" },
    { label: "CTI",               icon: Shield,          href: "/cti" },
    { label: "Guides",            icon: GraduationCap,   href: "/cours" },
    { label: "Scenarios",         icon: Layers,          href: "/scenarios" },
    { label: "Detection Coverage", icon: Map,             href: "/coverage" },
    { label: "Manual Pentest",    icon: Terminal,        href: "/manual-pentest" },
  ],
};
