"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "consultant" | "apprenant";

export interface User {
  id:     string;
  name:   string;
  email:  string;
  role:   UserRole;
  avatar: string;
}

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin:      "/dashboard/admin",
  consultant: "/dashboard/consultant",
  apprenant:  "/dashboard/apprenant",
};

interface AuthContextType {
  user:    User | null;
  loading: boolean;
  login:   (email: string, password: string, callbackUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logout:  () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true au démarrage = vérification du cookie
  const router = useRouter();

  // ── Au chargement : vérifier si un cookie de session existe ──────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setUser(data.user);
        }
      } catch {
        // Pas de session valide — on reste déconnecté
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // ── Login : appel API → cookie JWT posé par le serveur ───────────
  const login = async (email: string, password: string, callbackUrl?: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error ?? "Erreur inconnue." };
      }

      setUser(data.user);
      router.push(callbackUrl || ROLE_DASHBOARDS[data.user.role as UserRole]);
      return { success: true };

    } catch {
      return { success: false, error: "Impossible de contacter le serveur." };
    }
  };

  // ── Logout : appel API → cookie supprimé par le serveur ──────────
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
