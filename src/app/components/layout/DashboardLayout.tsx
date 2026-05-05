"use client";

import { useAuth } from "@/app/context/AuthContext";
import Sidebar from "@/app/components/layout/Sidebar";
import Topbar from "@/app/components/layout/Topbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
}
