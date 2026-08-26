"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem("eduai_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_URL}/me/dashboard`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setDashboardData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user, fetchDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Initializing Session...</div>
      </div>
    );
  }

  // Guard against unauthenticated renders during redirect transitions
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-650 text-white rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4 1.253" />
              </svg>
            </div>
            <span className="font-extrabold text-lg text-white tracking-wider">EduAI System</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2.5">
          <button
            onClick={() => router.push("/admin")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold transition-all text-left"
          >
            <span className="text-lg">📊</span>
            <span>Dashboard Overview</span>
          </button>
          <button
            onClick={() => router.push("/admin/students")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">👨‍🎓</span>
            <span>Students Directory</span>
          </button>
          <button
            onClick={() => router.push("/admin/teachers")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">👨‍🏫</span>
            <span>Teachers Directory</span>
          </button>
          <button
            onClick={() => router.push("/admin/subjects")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">📚</span>
            <span>Subject Catalog</span>
          </button>
          <button
            onClick={() => router.push("/admin/timetable")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">🗓️</span>
            <span>Timetable Scheduler</span>
          </button>
          <button
            onClick={() => router.push("/admin/attendance")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">📅</span>
            <span>Attendance Tracker</span>
          </button>
          <button
            onClick={() => router.push("/admin/exams")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">📝</span>
            <span>Exams & Results</span>
          </button>
          <button
            onClick={() => router.push("/admin/assignments")}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white text-sm font-medium transition-all text-left text-slate-400"
          >
            <span className="text-lg">📚</span>
            <span>Assignments Panel</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-3 border border-slate-800 hover:bg-slate-800 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome Back, {user.name || "Admin"} 👋</h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Review classroom attendance averages, quiz results, and pending task submissions.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex md:hidden space-x-2">
              <button
                onClick={() => router.push("/admin/students")}
                className="px-3.5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              >
                Manage
              </button>
              <button
                onClick={logout}
                className="px-3.5 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Enrolled</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {loadingStats ? "..." : `${dashboardData?.studentsCount ?? 0} Students`}
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Active academic profiles</span>
            </div>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Attendance</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {loadingStats ? "..." : `${dashboardData?.attendancePercentage ?? 100}%`}
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">Excellent presence rate</span>
            </div>
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Exams</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {loadingStats ? "..." : `${dashboardData?.upcomingExamsCount ?? 0} Exams`}
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1 block">DBMS Mid-Term grading</span>
            </div>
          </div>

          {/* Visual Performance Trend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Attendance Metrics</h3>
              <div className="flex items-end justify-between h-40 pt-4 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-12 bg-indigo-200 h-10 rounded-t-lg text-center text-[10px] text-indigo-700 font-bold flex flex-col justify-end pb-1">July</div>
                <div className="w-12 bg-indigo-300 h-24 rounded-t-lg text-center text-[10px] text-indigo-700 font-bold flex flex-col justify-end pb-1">Aug</div>
                <div className="w-12 bg-indigo-500 h-32 rounded-t-lg text-center text-[10px] text-white font-bold flex flex-col justify-end pb-1">Sept</div>
                <div className="w-12 bg-indigo-650 h-36 rounded-t-lg text-center text-[10px] text-white font-bold flex flex-col justify-end pb-1">Oct</div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Academic Performance Average</h3>
              <div className="flex items-end justify-between h-40 pt-4 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="w-12 bg-emerald-200 h-20 rounded-t-lg text-center text-[10px] text-emerald-700 font-bold flex flex-col justify-end pb-1">Quiz 1</div>
                <div className="w-12 bg-emerald-300 h-28 rounded-t-lg text-center text-[10px] text-emerald-700 font-bold flex flex-col justify-end pb-1">Midterm</div>
                <div className="w-12 bg-emerald-500 h-36 rounded-t-lg text-center text-[10px] text-white font-bold flex flex-col justify-end pb-1">Final</div>
              </div>
            </div>
          </div>

          {/* AI Insight Card Section */}
          <div className="p-8 bg-slate-900 border border-slate-850 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-550/10 rounded-full blur-3xl"></div>
            <div className="flex items-center space-x-3.5 mb-4">
              <div className="p-2.5 bg-indigo-650/40 text-indigo-400 border border-indigo-550/30 rounded-2xl">
                <span className="text-xl">🤖</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white">AI Analytics Insights</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              The AI Insight engine evaluates student performance logs in real time. Once student attendance, exam records, and assignment grading details are completely filled, this section will automatically populate student-specific risk warnings and recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
