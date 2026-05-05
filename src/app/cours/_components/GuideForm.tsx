"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const CATEGORIES = [
  { value: "architecture",  label: "Architecture" },
  { value: "blue-team",     label: "Blue Team" },
  { value: "purple-team",   label: "Purple Team" },
  { value: "red-team",      label: "Red Team" },
];

interface GuideFormProps {
  guideId?: number;
  initialData?: {
    titre: string;
    description: string;
    contenu: string;
    categorie: string;
  };
}

export default function GuideForm({ guideId, initialData }: GuideFormProps) {
  const router = useRouter();
  const isEdit = guideId !== undefined;

  const [titre,       setTitre]       = useState(initialData?.titre       ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [contenu,     setContenu]     = useState(initialData?.contenu     ?? "");
  const [categorie,   setCategorie]   = useState(initialData?.categorie   ?? "architecture");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim() || !contenu.trim()) {
      setError("Le titre et le contenu sont requis.");
      return;
    }

    setSaving(true);
    setError(null);

    const url    = isEdit ? `/api/guides/${guideId}` : "/api/guides";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, description, contenu, categorie }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Une erreur est survenue.");
      return;
    }

    router.push("/cours");
    router.refresh();
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              {isEdit ? "Modifier" : "Nouveau"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? "Modifier le guide" : "Ajouter un guide"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Titre + Catégorie */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Titre du guide"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Courte description affichée sur la carte…"
              rows={2}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Markdown Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Contenu (Markdown) <span className="text-red-500">*</span>
            </label>
            <div data-color-mode="dark" className="rounded-xl overflow-hidden border border-gray-800">
              <MDEditor
                value={contenu}
                onChange={(val) => setContenu(val ?? "")}
                height={520}
                preview="live"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? "Enregistrer les modifications" : "Créer le guide"}
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
