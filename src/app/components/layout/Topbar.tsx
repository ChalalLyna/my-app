"use client";

import { useRef, useState, useEffect } from "react";
import {
  Search, Bell, X, Loader2, LogOut, User,
  ShieldCheck, UserCog, GraduationCap, Eye, EyeOff,
} from "lucide-react";
import { useAuth, UserRole } from "@/app/context/AuthContext";

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size: number }> }> = {
  admin:      { label: "Admin",      color: "text-red-400",   bg: "bg-red-500/10",   Icon: ShieldCheck },
  consultant: { label: "Consultant", color: "text-blue-400",  bg: "bg-blue-500/10",  Icon: UserCog },
  apprenant:  { label: "Apprenant",  color: "text-green-400", bg: "bg-green-500/10", Icon: GraduationCap },
};

const EMPTY_FORM = {
  currentPassword: "",
  newPassword:     "",
  confirmPassword: "",
};

export default function Topbar() {
  const { user, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [showCurPwd,   setShowCurPwd]   = useState(false);
  const [showNewPwd,   setShowNewPwd]   = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openProfile() {
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
    setDropdownOpen(false);
    setProfileOpen(true);
  }

  async function handleSave() {
    if (!form.newPassword) {
      setError("Veuillez saisir un nouveau mot de passe.");
      return;
    }
    if (!form.currentPassword) {
      setError("Le mot de passe actuel est requis.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nom:             user!.nom,
          prenom:          user!.prenom,
          email:           user!.email,
          currentPassword: form.currentPassword,
          newPassword:     form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue.");
        return;
      }
      setSuccess("Mot de passe modifié avec succès.");
      setTimeout(() => setProfileOpen(false), 1200);
    } finally {
      setSaving(false);
    }
  }

  const roleMeta = user ? ROLE_META[user.role] : null;

  return (
    <>
    <header className="fixed top-0 left-60 right-0 h-14 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60 flex items-center px-6 gap-4 z-10">
      {/* Workspace label */}
      <span className="text-sm text-gray-500 font-medium border-r border-gray-800 pr-4 mr-1">
        Global Lab Workspace
      </span>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search assets, attacks, or users..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* User avatar + dropdown */}
        {user && roleMeta && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-3 border-l border-gray-800 hover:opacity-80 transition-opacity"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm text-white font-semibold -mt-0.5">{user.name}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-800">
                {user.avatar}
              </div>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-gray-900 border border-gray-800/60 rounded-2xl shadow-2xl overflow-hidden">
                {/* User card */}
                <div className="p-4 border-b border-gray-800/60">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${roleMeta.color} ${roleMeta.bg}`}>
                    <roleMeta.Icon size={10} />
                    {roleMeta.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={openProfile}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-xl transition-colors text-left"
                  >
                    <User size={14} className="text-gray-500" />
                    Mon profil
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                  >
                    <LogOut size={14} />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </header>

    {/* Profile modal — outside <header> so fixed positioning covers the full viewport */}
    {profileOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {user?.avatar}
                </div>
                <h2 className="text-lg font-bold text-white">Mon profil</h2>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Informations — lecture seule */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user?.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
                {roleMeta && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleMeta.color} ${roleMeta.bg}`}>
                    <roleMeta.Icon size={11} />
                    {roleMeta.label}
                  </span>
                )}
              </div>

              {/* Changer le mot de passe */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Changer le mot de passe
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showCurPwd ? "text" : "password"}
                        value={form.currentPassword}
                        onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showCurPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? "text" : "password"}
                        value={form.newPassword}
                        onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Minimum 8 caractères"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                    />
                  </div>
                </div>
              </div>

              {error   && <p className="text-red-400   text-xs bg-red-500/10   border border-red-500/20   rounded-xl px-3 py-2">{error}</p>}
              {success && <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">{success}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setProfileOpen(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-brand/20 hover:bg-brand/30 border border-brand/30 text-brand transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
