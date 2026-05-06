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
          onClick={() => router.push("/cours")}
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
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-white mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-white mt-7 mb-3 pb-2 border-b border-gray-800">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-bold text-white mt-5 mb-2">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold text-gray-200 mt-4 mb-1">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-400 leading-relaxed text-sm mb-4">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-gray-200 font-semibold">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside pl-5 space-y-1 text-gray-400 text-sm my-3">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside pl-5 space-y-1 text-gray-400 text-sm my-3">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-400 text-sm leading-relaxed">{children}</li>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-emerald-400 hover:underline">{children}</a>
                  ),
                  hr: () => <hr className="border-gray-800 my-6" />,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-emerald-500/60 pl-4 text-gray-500 italic my-4">{children}</blockquote>
                  ),
                  code: ({ className, children, ...props }: any) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <code className="block text-xs font-mono text-gray-300 leading-relaxed" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="text-emerald-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs overflow-x-auto my-4">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-5">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-800/60">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-700 px-4 py-2.5 text-left text-gray-200 text-xs font-semibold whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-700/60 px-4 py-2.5 text-gray-400 text-xs">{children}</td>
                  ),
                  tr: ({ children }) => (
                    <tr className="even:bg-gray-900/40">{children}</tr>
                  ),
                }}
              >
                {guide.contenu}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
