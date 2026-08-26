"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register as apiRegister } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [schoolName, setSchoolName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError("");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordError("");
      return;
    }
    if (val.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Perform public registration (backend strictly creates School + SUPER_ADMIN)
      await apiRegister({ name, email, password, schoolName });
      
      // Redirect to login page on success with a registration indicator for super_admin
      router.push("/login?registered=true&role=super_admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated, block onboarding and prompt navigation or sign out
  if (user) {
    const dashboardLink = 
      user.role === "SUPER_ADMIN" ? "/super-admin" :
      user.role === "ADMIN" ? "/admin" :
      user.role === "TEACHER" ? "/teacher" : "/student";

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-955/40 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-md relative z-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-xl font-bold text-white tracking-wide uppercase">Already Signed In</h2>
          <p className="text-xs text-slate-400">
            You are currently signed in as <strong className="text-indigo-400">{user.email}</strong> with role <strong className="text-indigo-400">{user.role}</strong>.
          </p>
          <div className="flex flex-col space-y-3 pt-2">
            <Link
              href={dashboardLink}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-755 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition-all hover:scale-101 active:scale-99 text-center"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={logout}
              className="w-full py-3.5 bg-slate-950 border border-slate-800 text-slate-350 font-bold text-xs rounded-xl transition-all hover:bg-slate-850 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-955/40 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-md relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl mb-1">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wider uppercase">School Onboarding</h1>
          <p className="text-sm text-slate-350 mt-1">Register your organization & school owner</p>
        </div>

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* SECTION 1: School Information */}
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              School Information
            </span>
            <div>
              <label htmlFor="schoolName" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                School / Organization Name
              </label>
              <input
                id="schoolName"
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                autoComplete="organization"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="e.g. Greenfield Academy"
                required
              />
            </div>
          </div>

          {/* SECTION 2: Owner Information */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              Owner Information
            </span>
            <div>
              <label htmlFor="ownerName" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Owner&apos;s Full Name
              </label>
              <input
                id="ownerName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600 disabled:opacity-50"
                placeholder="Owner Name"
                required
              />
            </div>

            <div>
              <label htmlFor="ownerEmail" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Owner&apos;s Email Address
              </label>
              <input
                id="ownerEmail"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                autoComplete="email"
                disabled={loading}
                className={`w-full px-4 py-3 bg-slate-900 border ${
                  emailError ? "border-rose-500/50" : "border-slate-800"
                } focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600 disabled:opacity-50`}
                placeholder="owner@school.com"
                required
              />
              {emailError && (
                <p className="text-[10px] font-medium text-rose-400 mt-1">⚠️ {emailError}</p>
              )}
            </div>
          </div>

          {/* SECTION 3: Account Security */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
              Account Security
            </span>
            
            <div className="relative">
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  className={`w-full pl-4 pr-10 py-3 bg-slate-900 border ${
                    passwordError ? "border-rose-500/50" : "border-slate-800"
                  } focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600 disabled:opacity-50`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 focus:outline-none p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Password must be at least 8 characters.</p>
              {passwordError && (
                <p className="text-[10px] font-medium text-rose-400 mt-1">⚠️ {passwordError}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-4 pr-10 py-3 bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder-slate-600 disabled:opacity-50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 focus:outline-none p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/10 transition-all active:scale-98 disabled:opacity-50"
          >
            {loading ? "Creating your school..." : "Register Your School"}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-800/60 mt-4">
          <span className="text-xs text-slate-500">
            Already onboarded?{" "}
            <Link href="/login?role=super_admin" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
              Owner Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
