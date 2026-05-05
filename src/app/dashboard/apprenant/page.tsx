"use client";
 
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import { GraduationCap, Flag, ClipboardList, Star } from "lucide-react";
 
const STATS = [
  { label: "Cours suivis",        value: "5",  icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Missions complétées", value: "8",  icon: Flag,          color: "text-indigo-400",  bg: "bg-indigo-500/10" },
  { label: "Exercices réalisés",  value: "21", icon: ClipboardList, color: "text-blue-400",    bg: "bg-blue-500/10" },
  { label: "Score moyen",         value: "78%",icon: Star,          color: "text-amber-400",   bg: "bg-amber-500/10" },
];
 
const COURSES = [
  { title: "Introduction au Pentest", progress: 100, done: true },
  { title: "MITRE ATT&CK Framework",  progress: 65,  done: false },
  { title: "Forensics & Investigation",progress: 30,  done: false },
  { title: "Active Directory Attacks", progress: 0,   done: false },
];
 
export default function ApprenantDashboard() {
  const { user } = useAuth();
 
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              Apprenant
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bonjour, {user?.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Continuez votre apprentissage en cybersécurité</p>
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
          <div className="flex items-center gap-2 mb-5">
            <GraduationCap size={15} className="text-brand" />
            <p className="text-sm font-semibold text-white">Hub Formation</p>
          </div>
          <div className="space-y-4">
            {COURSES.map((course) => (
              <div key={course.title}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-medium ${course.done ? "text-emerald-400" : "text-white"}`}>
                    {course.done ? "✓ " : ""}{course.title}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{course.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${course.done ? "bg-emerald-500" : "bg-brand"}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
 