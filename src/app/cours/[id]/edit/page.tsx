"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GuideForm from "@/app/cours/_components/GuideForm";
import DashboardLayout from "@/app/components/layout/DashboardLayout";

export default function EditGuidePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/guides/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => { if (d) { setData(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32 text-gray-600 text-sm">
          Chargement…
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32 text-gray-600 text-sm">
          Guide introuvable.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <GuideForm
      guideId={Number(id)}
      initialData={{
        titre:       data.titre,
        description: data.description,
        contenu:     data.contenu,
        categorie:   data.categorie,
      }}
    />
  );
}
