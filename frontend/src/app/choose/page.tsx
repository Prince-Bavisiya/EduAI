"use client";

import Link from "next/link";

export default function ChooseUserPage() {
  const roles = [
    {
      name: "Admin",
      description: "Login as an administrator to access the dashboard and manage institutional data, courses, and accounts.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      colorClass: "hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:bg-indigo-950/20 text-indigo-400 border-indigo-500/10",
      accentBg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      name: "Student",
      description: "Login as a student to explore subjects, attendance logs, exam schedules, homeworks, and grades.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
      colorClass: "hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:bg-emerald-950/20 text-emerald-400 border-emerald-500/10",
      accentBg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      name: "Teacher",
      description: "Login as a teacher to create classes, assign homeworks, evaluate student performance, and schedule timetables.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      colorClass: "hover:border-violet-500/50 hover:shadow-violet-500/10 hover:bg-violet-950/20 text-violet-400 border-violet-500/10",
      accentBg: "bg-violet-500/10 border-violet-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Radial Lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl space-y-12 z-10 text-center">
        
        {/* Top Header */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-widest bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent animate-gradient-flow">
            Choose Your Login Portal
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            Select your portal type below to log into your account.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Link key={role.name} href={`/login?role=${role.name.toLowerCase()}`} className="block">
              <div className={`h-full text-center flex flex-col justify-between p-8 bg-slate-955/45 border rounded-3xl cursor-pointer shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-102 hover:-translate-y-1 ${role.colorClass}`}>
                <div className="space-y-6">
                  {/* Icon Wrapper */}
                  <div className={`inline-flex p-4 rounded-2xl border ${role.accentBg} mb-2`}>
                    {role.icon}
                  </div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-white">
                    {role.name}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {role.description}
                  </p>
                </div>
                
                {/* Visual Action Button */}
                <div className="mt-8 pt-4 border-t border-slate-900/60">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline">
                    Access Portal &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Back Link & School Owner Redirect */}
        <div className="pt-4 flex flex-col items-center space-y-3">
          <span className="text-sm text-slate-400">
            Are you a School Owner?{" "}
            <Link href="/login?role=super_admin" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
              Sign in as Owner
            </Link>
          </span>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 hover:underline inline-flex items-center gap-1 font-medium transition-all">
            &larr; Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
