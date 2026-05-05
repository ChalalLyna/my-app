"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScenarioForm from "@/app/scenarios/_components/ScenarioForm";
import DashboardLayout from "@/app/components/layout/DashboardLayout";

export default function EditScenarioPage() {
  const { id }  = useParams<{ id: string }>();
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/scenarios/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((d) => { if (d) { setData(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-32 text-gray-600 text-sm">Chargement…</div>
    </DashboardLayout>
  );

  if (notFound || !data) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-32 text-gray-600 text-sm">Scénario introuvable.</div>
    </DashboardLayout>
  );

  return (
    <ScenarioForm
      scenarioId={Number(id)}
      initialData={{
        titre:           data.titre,
        description:     data.description,
        objectif:        data.objectif,
        niveau:          data.niveau,
        bruitRecommande: data.bruitRecommande,
        contenu:         data.contenu,
      }}
    />
  );
}
