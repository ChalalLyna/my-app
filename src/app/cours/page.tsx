"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/app/components/layout/DashboardLayout";
import {
  BookOpen,
  ChevronRight,
  Building2,
  Shield,
  Swords,
  Crosshair,
  Search,
} from "lucide-react";

interface Guide {
  id: number;
  titre: string;
  description: string;
  categorie: string;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ size: number; className?: string }>; color: string; bg: string; border: string }
> = {
  architecture: {
    label: "Architecture",
    icon: Building2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  "blue-team": {
    label: "Blue Team",
    icon: Shield,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  "purple-team": {
    label: "Purple Team",
    icon: Swords,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  "red-team": {
    label: "Red Team",
    icon: Crosshair,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

const DEFAULT_CATEGORY = {
  label: "Autre",
  icon: BookOpen,
  color: "text-gray-400",
  bg: "bg-gray-500/10",
  border: "border-gray-500/20",
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? DEFAULT_CATEGORY;
}

export default function HubFormationPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/guides")
      .then((r) => r.json())
      .then((data) => {
        setGuides(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(guides.map((g) => g.categorie))).sort();

  const filtered = guides.filter((g) => {
    const matchCat = activeCategory === "all" || g.categorie === activeCategory;
    const matchSearch =
      search === "" ||
      g.titre.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = categories.reduce<Record<string, Guide[]>>((acc, cat) => {
    const items = filtered.filter((g) => g.categorie === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              Formation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Hub Formation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Guides et ressources pour progresser en cybersécurité
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher un guide…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                activeCategory === "all"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeCategory === cat
                      ? `${meta.bg} ${meta.border} ${meta.color}`
                      : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  <Icon size={12} className={activeCategory === cat ? meta.color : ""} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">
            Chargement…
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">
            Aucun guide trouvé.
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      {meta.label}
                    </h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((guide) => (
                      <Link
                        key={guide.id}
                        href={`/cours/${guide.id}`}
                        className="block bg-gray-900 border border-gray-800/60 rounded-2xl p-5 hover:border-gray-700 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                            <BookOpen size={15} className={meta.color} />
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-gray-700 group-hover:text-gray-500 mt-1 transition-colors"
                          />
                        </div>
                        <h3 className="text-sm font-semibold text-white mt-3 leading-snug">
                          {guide.titre}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                          {guide.description}
                        </p>
                        <div className={`inline-flex items-center gap-1 mt-3 text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          <Icon size={10} />
                          {meta.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
