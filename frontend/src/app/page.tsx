"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { user, loading, token } = useAuth();

  useEffect(() => {
    if (!loading && token && user) {
      // Automatically redirect to role dashboard if already authenticated
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (user.role === "TEACHER") {
        router.push("/teacher");
      } else if (user.role === "STUDENT") {
        router.push("/student");
      }
    }
  }, [user, loading, token, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative Radial Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Grid Content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12 xl:p-24 z-10">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Stunning Hero Illustration */}
          <div className="w-full h-full flex justify-center items-center relative group">
            {/* Soft decorative shadow/glow behind the image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative w-full aspect-square max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 flex justify-center items-center">
              <Image
                src="/images/homepage_hero.jpg"
                alt="EduAI School Management Hero"
                width={500}
                height={500}
                className="w-full h-full object-contain rounded-2xl group-hover:scale-102 transition-transform duration-500"
                priority
              />
            </div>
          </div>

          {/* Right Side: Copywriting and CTA Card */}
          <div className="space-y-8 lg:pl-6">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-full">
                🚀 Welcome to the Future of Education
              </span>
              
              {/* Premium Animated Gradient Title */}
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-300% bg-clip-text text-transparent animate-gradient-flow uppercase">
                EduAI Portal
              </h1>
              
              <p className="text-lg text-slate-400 font-medium">
                Intelligent Education Management Platform
              </p>
            </div>

            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
              Efficiently manage school administration, organize courses, and coordinate student & faculty groups seamlessly. Track real-time attendance, monitor exams, evaluate performances, and foster effortless institutional communication.
            </p>

            <div className="space-y-4 max-w-md">
              {/* Login Button navigating to Choose User role selector */}
              <Link href="/choose" className="block">
                <button className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-200% hover:bg-right text-white font-bold text-base rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 active:scale-98">
                  Get Started
                </button>
              </Link>
              
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-slate-400">
                  New School?{" "}
                  <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
                    Register Your School
                  </Link>
                </span>
                <span className="text-slate-500">|</span>
                <Link href="/login" className="text-slate-400 hover:text-slate-300 hover:underline">
                  Support Portal
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-slate-900 bg-slate-950/80 backdrop-blur-md text-xs text-slate-500 font-medium z-10">
        &copy; {new Date().getFullYear()} EduAI. All rights reserved. Made with ❤️ for educational excellence.
      </footer>
    </div>
  );
}
