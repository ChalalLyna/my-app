"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, Volume2, GraduationCap, Zap, Flame, Layers, Target,
} from "lucide-react";

interface Scenario {
  id:              number;
  titre:           string;
  description:     string;
  objectif:        string;
  niveau:          string;
  bruitRecommande: boolean;
  contenu:         string;
}

const NIVEAU_META: Record<string, {
  label: string; icon: React.ComponentType<{ size: number; className?: string }>;
  color: string; bg: string;
}> = {
  beginner:     { label: "Débutant",      icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  intermediate: { label: "Intermédiaire", icon: Zap,           color: "text-amber-400",   bg: "bg-amber-500/10" },
  advanced:     { label: "Avancé",        icon: Flame,         color: "text-red-400",     bg: "bg-red-500/10" },
};

const DEFAULT = { label: "Autre", icon: Layers, color: "text-gray-400", bg: "bg-gray-500/10" };

export default function ScenarioReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/scenarios/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((d)  => { if (d) { setScenario(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [id]);

  const meta = scenario ? (NIVEAU_META[scenario.niveau] ?? DEFAULT) : DEFAULT;
  const Icon = meta.icon;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-8 py-8">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour aux scénarios
        </button>

        {loading  && <div className="flex items-center justify-center py-32 text-gray-600 text-sm">Chargement…</div>}
        {notFound && <div className="flex items-center justify-center py-32 text-gray-600 text-sm">Scénario introuvable.</div>}

        {scenario && (
          <>
            {/* Header */}
            <div className="mb-8 pb-8 border-b border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                  <Icon size={11} />
                  {meta.label}
                </div>
                {scenario.bruitRecommande && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Volume2 size={11} />
                    Bruit ambiant recommandé
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-white leading-tight mb-3">
                {scenario.titre}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">{scenario.description}</p>

              {scenario.objectif && (
                <div className="mt-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={13} className="text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Objectif</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{scenario.objectif}</p>
                </div>
              )}
            </div>

            {/* Markdown Content */}
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-h1:text-xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-base prose-h2:mt-7 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-800
              prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-gray-400 prose-p:leading-relaxed prose-p:text-sm
              prose-li:text-gray-400 prose-li:text-sm
              prose-strong:text-gray-200
              prose-code:text-emerald-400 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
              prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-xl prose-pre:text-xs
              prose-table:w-full prose-table:border-collapse
              prose-th:border prose-th:border-gray-800 prose-th:bg-gray-900/80 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:text-gray-300 prose-th:text-xs prose-th:font-semibold
              prose-td:border prose-td:border-gray-800 prose-td:px-4 prose-td:py-2.5 prose-td:text-gray-400 prose-td:text-xs
              prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
              prose-hr:border-gray-800
              prose-blockquote:border-l-indigo-500 prose-blockquote:text-gray-500
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {scenario.contenu}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
