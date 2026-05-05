"use client";
 
import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Shield, Eye, EyeOff, Loader2, Terminal } from "lucide-react";
 
// Hint credentials shown under form for demo
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@cyberlab.io", password: "Admin@1234", color: "text-red-400" },
  { role: "Consultant1", email: "consultant1@cyberlab.io", password: "Consult@1234", color: "text-indigo-400" },
  { role: "Apprenant1", email: "apprenant1@cyberlab.io", password: "Learn@1234", color: "text-emerald-400" },
];
 
function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password, callbackUrl);
    if (!result.success) {
      setError(result.error ?? "Erreur inconnue.");
      setLoading(false);
    }
  };
 
  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  };
 
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
 
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
 
      <div className="relative w-full max-w-md px-6">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/60 rounded-2xl p-8 shadow-2xl shadow-black/50">
 
          {/* Logo + title */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30 ring-4 ring-brand/10">
              <Shield size={26} className="text-white" strokeWidth={2} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">CyberLab</h1>
              <p className="text-sm text-gray-500 mt-0.5">Simulation Platform</p>
            </div>
          </div>
 
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Adresse Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@cyberlab.io"
                required
                autoComplete="email"
                className="bg-gray-800/70 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
              />
            </div>
 
            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-800/70 border border-gray-700/80 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
 
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-900/30 border border-red-800/50 rounded-xl">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
 
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-brand/20 hover:shadow-brand/35 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authentification...
                </>
              ) : (
                <>
                  <Shield size={15} />
                  Se connecter
                </>
              )}
            </button>
          </form>
 
          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-gray-800/60">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={12} className="text-gray-600" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                Comptes de démonstration
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-800 border border-gray-800/60 hover:border-gray-700 transition-all group"
                >
                  <span className={`text-xs font-bold ${acc.color}`}>{acc.role}</span>
                  <span className="text-[11px] text-gray-600 group-hover:text-gray-400 font-mono transition-colors">
                    {acc.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
 
        {/* Bottom note */}
        <p className="text-center text-[11px] text-gray-700 mt-4">
          © 2022 CyberLab Simulation Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}