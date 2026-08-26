"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  
  // Get expected role from URL parameter (e.g. ?role=admin)
  const roleParam = searchParams.get("role");
  const isRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Pass the role parameter to AuthContext login to validate it
      await login(email, password, roleParam || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-955/40 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-md relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wider uppercase">
            {roleParam === "super_admin" ? "School Owner Sign In" : roleParam ? `${roleParam} Sign In` : "EduAI"}
          </h1>
          <p className="text-sm text-slate-400">
            {roleParam === "super_admin" ? "Access your institutional control center" : roleParam ? `Access your ${roleParam} dashboard portal` : "Intelligent Education Platform"}
          </p>
        </div>

        {/* Success/Registration Banner */}
        {isRegistered && !error && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold text-center">
            🎉 School Owner registered successfully! Please sign in.
          </div>
        )}

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600"
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/10 transition-all active:scale-98 disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-400 hover:underline">
            &larr; Back to home page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Loading Portal...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
