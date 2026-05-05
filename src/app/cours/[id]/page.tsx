"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Shield,
  Swords,
  Crosshair,
} from "lucide-react";

interface Guide {
  id: number;
  titre: string;
  description: string;
  contenu: string;
  categorie: string;
  dateCreation: string | null;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size: number; className?: string }>; color: string; bg: string }
> = {
  architecture: { label: "Architecture", icon: Building2, color: "text-blue-400",   bg: "bg-blue-500/10" },
  "blue-team":  { label: "Blue Team",    icon: Shield,    color: "text-sky-400",    bg: "bg-sky-500/10" },
  "purple-team":{ label: "Purple Team",  icon: Swords,    color: "text-purple-400", bg: "bg-purple-500/10" },
  "red-team":   { label: "Red Team",     icon: Crosshair, color: "text-red-400",    bg: "bg-red-500/10" },
};

const DEFAULT_CATEGORY = { label: "Autre", icon: BookOpen, color: "text-gray-400", bg: "bg-gray-500/10" };

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? DEFAULT_CATEGORY;
}

export default function GuideReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/guides/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setGuide(data); setLoading(false); }
      })
      .catch(() => setLoading(false));
  }, [id]);

  const meta = guide ? getCategoryMeta(guide.categorie) : DEFAULT_CATEGORY;
  const Icon = meta.icon;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-8 py-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour aux guides
        </button>

        {loading && (
          <div className="flex items-center justify-center py-32 text-gray-600 text-sm">
            Chargement…
          </div>
        )}

        {notFound && (
          <div className="flex items-center justify-center py-32 text-gray-600 text-sm">
            Guide introuvable.
          </div>
        )}

        {guide && (
          <>
            {/* Guide Header */}
            <div className="mb-8 pb-8 border-b border-gray-800">
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${meta.bg} ${meta.color}`}>
                <Icon size={11} />
                {meta.label}
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight mb-3">
                {guide.titre}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                {guide.description}
              </p>
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
              prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
              prose-hr:border-gray-800
              prose-blockquote:border-l-emerald-500 prose-blockquote:text-gray-500
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {guide.contenu}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
