"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { useAuth } from "@/app/context/AuthContext";
import {
  Search, Plus, Pencil, Trash2, X, Loader2,
  ShieldCheck, GraduationCap, UserCog, Users,
} from "lucide-react";

interface UserRow {
  IdUtilisateur: number;
  nom: string;
  prenom: string;
  role: "admin" | "consultant" | "apprenant";
  IdCompte: number;
  email: string;
  DateCreation: string;
}

type Role = "admin" | "consultant" | "apprenant";

const ROLE_META: Record<Role, { label: string; color: string; bg: string; icon: React.ComponentType<{ size: number }> }> = {
  admin:      { label: "Admin",      color: "text-red-400",   bg: "bg-red-500/10",   icon: ShieldCheck },
  consultant: { label: "Consultant", color: "text-blue-400",  bg: "bg-blue-500/10",  icon: UserCog },
  apprenant:  { label: "Apprenant",  color: "text-green-400", bg: "bg-green-500/10", icon: GraduationCap },
};

const EMPTY_FORM = { nom: "", prenom: "", email: "", role: "apprenant" as Role, password: "" };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) =>
    `${u.prenom} ${u.nom} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm(EMPTY_FORM);
    setError("");
    setEditTarget(null);
    setModal("add");
  }

  function openEdit(u: UserRow) {
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, password: "" });
    setError("");
    setEditTarget(u);
    setModal("edit");
  }

  async function handleSave() {
    if (!form.nom || !form.prenom || !form.email || !form.role) {
      setError("Tous les champs sont requis.");
      return;
    }
    if (modal === "add" && !form.password) {
      setError("Le mot de passe est requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url    = modal === "add" ? "/api/admin/users" : `/api/admin/users/${editTarget!.IdUtilisateur}`;
      const method = modal === "add" ? "POST" : "PUT";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue."); return; }
      setModal(null);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/admin/users/${deleteTarget.IdUtilisateur}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Erreur lors de la suppression."); return; }
      setDeleteTarget(null);
      fetchUsers();
    } finally {
      setDeleting(false);
    }
  }

  function avatar(u: UserRow) {
    return `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}`.toUpperCase();
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand">Administrateur</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Gestion des utilisateurs</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {users.length} utilisateur{users.length !== 1 ? "s" : ""} enregistré{users.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Ajouter un utilisateur
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, rôle…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
          />
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 size={20} className="animate-spin mr-2" /> Chargement…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Utilisateur</th>
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Rôle</th>
                  <th className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Créé le</th>
                  <th className="text-right text-xs text-gray-500 font-semibold uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const role    = ROLE_META[u.role];
                  const RoleIcon = role.icon;
                  const isMe    = me?.id === String(u.IdUtilisateur);
                  return (
                    <tr
                      key={u.IdUtilisateur}
                      className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                            {avatar(u)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.prenom} {u.nom}</p>
                            {isMe && <span className="text-xs text-brand">Vous</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${role.color} ${role.bg}`}>
                          <RoleIcon size={11} />
                          {role.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(u.DateCreation).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            title="Modifier"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={isMe}
                            title={isMe ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {modal === "add" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Prénom</label>
                  <input
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    placeholder="Sophie"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Nom</label>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Martin"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="sophie@cyberlab.io"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                >
                  <option value="apprenant">Apprenant</option>
                  <option value="consultant">Consultant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                  Mot de passe{" "}
                  {modal === "edit" && (
                    <span className="text-gray-600">(laisser vide pour ne pas modifier)</span>
                  )}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={modal === "add" ? "Minimum 8 caractères" : "••••••••"}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand/50"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setModal(null)}
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
                  {modal === "add" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Supprimer l'utilisateur</h2>
                <p className="text-xs text-gray-400">{deleteTarget.prenom} {deleteTarget.nom}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Cette action supprimera définitivement le compte et toutes les données associées. Elle est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
