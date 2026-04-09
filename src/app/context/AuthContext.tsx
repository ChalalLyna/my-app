"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "consultant" | "apprenant";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

// Mock users — remplacer par vraie API plus tard
export const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "admin@cyberlab.io": {
    password: "admin123",
    user: { id: "1", name: "Alice Martin", email: "admin@cyberlab.io", role: "admin", avatar: "AM" },
  },
  "consultant@cyberlab.io": {
    password: "consul123",
    user: { id: "2", name: "John Doe", email: "consultant@cyberlab.io", role: "consultant", avatar: "JD" },
  },
  "apprenant@cyberlab.io": {
    password: "learn123",
    user: { id: "3", name: "Sara Benali", email: "apprenant@cyberlab.io", role: "apprenant", avatar: "SB" },
  },
};

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  consultant: "/dashboard/consultant",
  apprenant: "/dashboard/apprenant",
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 400)); // simulate network
    const entry = MOCK_USERS[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      return { success: false, error: "Email ou mot de passe incorrect." };
    }
    setUser(entry.user);
    router.push(ROLE_DASHBOARDS[entry.user.role]);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
