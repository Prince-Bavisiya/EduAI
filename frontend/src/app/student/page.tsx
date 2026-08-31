"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  getMyProfile, 
  getMyAttendance, 
  getMyAttendanceStats, 
  getMyMarks, 
  getMyAssignments, 
  getMyFees,
  submitAssignment 
} from "@/services/studentPortalService";
import { getTimetable } from "@/services/timetableService";
import { getStudentAnalysis, sendChatMessage } from "@/services/aiService";
import { API_URL } from "@/services/apiClient";

interface ExamMark {
  id: number;
  marks: number;
  percentage: number;
  grade: string;
  exam: {
    id: number;
    name: string;
    totalMarks: number;
    examDate: string;
  };
  subject: {
    id: number;
    name: string;
    code: string;
  };
}

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  deadline: string;
  maxMarks: number;
  subject: {
    id: number;
    name: string;
    code: string;
  };
  submissions: {
    id: number;
    status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
    marks: number | null;
    percentage: number | null;
    feedback: string | null;
  }[];
}

interface AttendanceLog {
  id: number;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  subject: {
    name: string;
    code: string;
  };
}

interface SubjectStat {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

interface AttendanceStats {
  overallAttendance: number;
  subjects: SubjectStat[];
}

type Tab = "dashboard" | "profile" | "attendance" | "exams" | "assignments" | "timetable" | "fees";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stats / Dashboard data
  const [attendancePercent, setAttendancePercent] = useState<number>(0);
  const [examAvg, setExamAvg] = useState<number>(0);
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState<number>(0);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState<number>(0);

  // Raw data lists
  const [profileData, setProfileData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [examMarks, setExamMarks] = useState<ExamMark[]>([]);
  const [allExamsList, setAllExamsList] = useState<any[]>([]); // for listing upcoming exams
  const [assignmentsList, setAssignmentsList] = useState<Assignment[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am your EduAI Academic Coach. Ask me how to improve your performance." }
  ]);

  const loadStudentData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        profileRes,
        attendanceStatsRes,
        attendanceLogsRes,
        marksRes,
        assignmentsRes,
        timetableRes,
        aiRes,
        feesRes
      ] = await Promise.all([
        getMyProfile(),
        getMyAttendanceStats(),
        getMyAttendance(),
        getMyMarks(),
        getMyAssignments(),
        getTimetable(),
        getStudentAnalysis().catch(() => ({ data: null })), // catch silently if no analysis yet
        getMyFees().catch(() => ({ data: [] }))
      ]);

      const prof = profileRes.data;
      setProfileData(prof);

      // Attendance
      const attStats = attendanceStatsRes.data;
      setAttendanceStats(attStats);
      setAttendancePercent(attStats?.overallAttendance ?? 0);
      setAttendanceLogs(attendanceLogsRes.data || []);

      // Exams / Marks
      const marksData = (marksRes.data || []) as ExamMark[];
      setExamMarks(marksData);

      if (marksData.length > 0) {
        const total = marksData.reduce((sum, item) => sum + item.percentage, 0);
        setExamAvg(Math.round(total / marksData.length));
      } else {
        setExamAvg(0);
      }

      // Assignments
      const assignmentsData = (assignmentsRes.data || []) as Assignment[];
      setAssignmentsList(assignmentsData);

      const pendingCount = assignmentsData.filter(a => a.submissions.length === 0).length;
      setPendingAssignmentsCount(pendingCount);

      // Timetable
      const ttSlots = timetableRes.data || [];
      setTimetableSlots(ttSlots);

      // Fees
      setStudentFees(feesRes?.data || []);

      // AI Analysis
      setAiAnalysis(aiRes.data);

      // Fetch all exams for upcoming count (filtered by student course)
      if (prof?.student?.courseId) {
        const token = localStorage.getItem("eduai_token");
        const examsRes = await fetch(`${API_URL}/exams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const examsData = await examsRes.json();
        if (examsRes.ok) {
          const allExams = examsData.data || [];
          setAllExamsList(allExams);
          
          // count upcoming
          const nowStr = new Date().toISOString();
          const upcomingCount = allExams.filter((e: any) => e.examDate > nowStr).length;
          setUpcomingExamsCount(upcomingCount);
        }
      }

    } catch (err) {
      setError("Failed to sync student dashboard files.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to tab query parameter safely client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveTab(tab as Tab);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadStudentData();
    }
  }, [user, loadStudentData]);

  // Submit assignment handler
  const handleSubmitAssignment = async (assignmentId: number) => {
    try {
      await submitAssignment(assignmentId);
      alert("Assignment submitted successfully!");
      loadStudentData(); // Refresh stats & list
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submission failed");
    }
  };

  // Chatbot send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || sendingChat) return;

    const newMsg = { sender: "user" as const, text };
    setMessages(prev => [...prev, newMsg]);
    if (!textToSend) setChatInput("");
    setSendingChat(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const res = await sendChatMessage(text, history);
      setMessages(prev => [...prev, { sender: "ai" as const, text: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: "ai" as const, text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setSendingChat(false);
    }
  };

  if (authLoading || (loading && !profileData)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Initializing Student Portal...</div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate overall performance index
  const overallPerf = Math.round((attendancePercent + examAvg) / 2);

  const getTodayDayOfWeekString = () => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[new Date().getDay()];
  };

  // Group classes today
  const todayClasses = timetableSlots.filter((slot) => slot.day === getTodayDayOfWeekString());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-350 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-650 text-white rounded-xl">
              <span className="text-xl">🎓</span>
            </div>
            <span className="font-extrabold text-lg text-white tracking-wider">Student Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "profile", label: "My Profile", icon: "👤" },
            { id: "attendance", label: "My Attendance", icon: "📅" },
            { id: "exams", label: "My Exams", icon: "📝" },
            { id: "assignments", label: "My Assignments", icon: "📚" },
            { id: "timetable", label: "My Timetable", icon: "🗓️" },
            { id: "fees", label: "My Fees", icon: "💳" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-3 border border-slate-850 hover:bg-slate-800 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {activeTab === "dashboard" ? `Welcome, ${user.name} 👋` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Semester {profileData?.student?.semester || 1} • {profileData?.student?.course?.name || "General Program"}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex md:hidden space-x-2">
              <button
                onClick={logout}
                className="px-3.5 py-2 border border-slate-200 text-slate-650 font-bold text-xs rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-650 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* TAB CONTENTS */}

          {/* 1. Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attendance</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-2">{attendancePercent}%</div>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Live presence</span>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Upcoming Exams</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-2">{upcomingExamsCount}</div>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Tests scheduled</span>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assignments</div>
                  <div className="text-2xl font-extrabold text-rose-600 mt-2">{pendingAssignmentsCount} Pending</div>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1 block">Requires action</span>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Overall Marks</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-2">{examAvg}%</div>
                  <span className="text-[9px] font-semibold text-slate-400 mt-1 block">GPA average</span>
                </div>
              </div>

              {/* Performance Indicator Banner */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl flex justify-between items-center shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Overall Performance Index</span>
                  <span className="text-sm text-slate-350 mt-1 block">Calculated cross-metric score: <strong className="text-white text-lg font-extrabold ml-1">{overallPerf}%</strong></span>
                </div>
                <div className="px-4 py-2 bg-indigo-650 border border-indigo-550/20 text-[10px] font-extrabold uppercase rounded-lg">
                  Status: {overallPerf >= 80 ? "Excellent" : overallPerf >= 60 ? "Average" : "Needs Review"}
                </div>
              </div>

              {/* Today's Classes */}
              <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Today's Class Schedule</h3>
                {todayClasses.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No classes scheduled for today.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todayClasses.map((s) => (
                      <div key={s.id} className="py-4 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-slate-805">{s.subject.name}</div>
                          <div className="text-xs text-slate-450 mt-0.5">Room: {s.room} • Faculty: {s.teacher.user.name}</div>
                        </div>
                        <div className="text-sm font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl">
                          {s.startTime} - {s.endTime}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. My Profile Tab */}
          {activeTab === "profile" && profileData && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.student?.studentId || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Course Program</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.student?.course?.name || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Department</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.student?.course?.department?.name || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Current Semester</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">Semester {profileData.student?.semester || 1}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block">{profileData.student?.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                    <span className="text-sm font-semibold text-slate-800 mt-1 block capitalize">{profileData.student?.gender?.toLowerCase() || "N/A"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Residential Address</span>
                    <span className="text-sm font-semibold text-slate-805 mt-1 block leading-relaxed">{profileData.student?.address || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. My Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <h3 className="text-lg font-bold text-slate-900">Coursewise Attendance Statistics</h3>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">Overall: {attendancePercent}%</span>
                </div>

                <div className="space-y-5">
                  {!attendanceStats?.subjects || attendanceStats.subjects.length === 0 ? (
                    <p className="text-sm text-slate-550 text-center py-4">No course attendance stats found.</p>
                  ) : (
                    attendanceStats.subjects.map((sub) => (
                      <div key={sub.subjectId} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-slate-800">{sub.subjectName} ({sub.subjectCode})</span>
                          <span className={`font-extrabold ${sub.percentage < 75 ? "text-rose-600" : "text-slate-850"}`}>{sub.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex border border-slate-200/50">
                          <div
                            style={{ width: `${sub.percentage}%` }}
                            className={`h-full transition-all ${sub.percentage < 75 ? "bg-rose-500" : "bg-indigo-650"}`}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Total lectures: {sub.total}</span>
                          <span>Present: {sub.present} • Absent: {sub.absent} • Late: {sub.late}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Logs */}
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900">Presence Logs</h3>
                </div>

                {attendanceLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">No classroom attendance logs recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="py-4 px-8">Date</th>
                          <th className="py-4 px-8">Course Subject</th>
                          <th className="py-4 px-8">Presence Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-5 px-8 text-sm text-slate-650 font-medium">
                              {new Date(log.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-5 px-8">
                              <div className="font-bold text-slate-900 text-sm">{log.subject.name}</div>
                              <div className="text-[10px] text-slate-450 mt-0.5">{log.subject.code}</div>
                            </td>
                            <td className="py-5 px-8">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                log.status === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : log.status === "LATE"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. My Exams Tab */}
          {activeTab === "exams" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Academic Exam Results</h3>
              
              <div className="space-y-4">
                {examMarks.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">No graded exams recorded yet.</p>
                ) : (
                  examMarks.map((m) => (
                    <div key={m.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-slate-50 border border-slate-100 rounded-2xl gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider">{m.subject.code}</div>
                        <h4 className="text-lg font-extrabold text-slate-805 mt-1">{m.exam.name}</h4>
                        <p className="text-xs text-slate-450 mt-1">Date: {new Date(m.exam.examDate).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-left md:text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                            {m.marks} / {m.exam.totalMarks}
                          </span>
                        </div>
                        <div className="text-left md:text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</span>
                          <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg uppercase bg-indigo-50 text-indigo-705 mt-1">
                            {m.grade} ({m.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. My Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Course Assignments</h3>
              
              <div className="space-y-6">
                {assignmentsList.length === 0 ? (
                  <p className="text-sm text-slate-500 py-6 text-center">No assignments configured for your subjects.</p>
                ) : (
                  assignmentsList.map((a) => {
                    const submission = a.submissions[0];
                    return (
                      <div key={a.id} className="p-6 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider">{a.subject.code}</span>
                            <span className="text-xs text-rose-600 font-semibold">Due: {new Date(a.deadline).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-lg font-extrabold text-slate-805">{a.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{a.description || "No description provided."}</p>
                          <span className="text-xs text-slate-400 font-semibold block">Max Score: {a.maxMarks} Marks</span>
                          
                          {submission?.feedback && (
                            <div className="p-3 bg-indigo-50/50 border border-indigo-50 rounded-xl mt-3 text-xs leading-relaxed">
                              <strong className="text-indigo-905 block">Teacher Feedback:</strong>
                              <span className="text-slate-650 mt-1 block">{submission.feedback}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-stretch md:items-end justify-between self-stretch gap-4 md:gap-0">
                          {/* Submission Status Badge */}
                          <div>
                            <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              !submission
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : submission.status === "GRADED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            }`}>
                              {!submission ? "Pending" : submission.status}
                            </span>
                          </div>

                          {/* Action / Grades */}
                          <div>
                            {!submission ? (
                              <button
                                onClick={() => handleSubmitAssignment(a.id)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/10"
                              >
                                Submit Assignment
                              </button>
                            ) : (
                              <div className="text-left md:text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Score Received</span>
                                <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                                  {submission.marks !== null ? `${submission.marks} / ${a.maxMarks}` : `--- / ${a.maxMarks}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 6. My Timetable Tab */}
          {activeTab === "timetable" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">My Weekly Timetable</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => {
                  const daySlots = timetableSlots.filter((slot) => slot.day === day);
                  return (
                    <div key={day} className="space-y-3">
                      <h4 className="font-extrabold text-xs text-indigo-700 uppercase tracking-wider pb-1 border-b border-indigo-50">{day}</h4>
                      <div className="space-y-2 min-h-[220px] bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                        {daySlots.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic text-center pt-16">No classes</div>
                        ) : (
                          daySlots.map((s) => (
                            <div key={s.id} className="p-3 bg-white rounded-xl border border-slate-150 shadow-2xs space-y-1.5">
                              <div className="text-[9px] font-bold text-indigo-600">🕒 {s.startTime} - {s.endTime}</div>
                              <div className="text-xs font-bold text-slate-805 truncate" title={s.subject.name}>
                                {s.subject.name}
                              </div>
                              <div className="text-[9px] text-slate-550">Room {s.room}</div>
                              <div className="text-[9px] text-slate-400">Teacher: {s.teacher.user.name}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. My Fees Tab */}
          {activeTab === "fees" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">My Fee Statements</h3>
              
              <div className="space-y-4">
                {studentFees.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 italic">No fee allocations found.</p>
                  </div>
                ) : (
                  studentFees.map((f: any) => {
                    const outstanding = f.amount - (f.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
                    return (
                      <div key={f.id} className="p-6 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider">Invoice ID: #{f.id}</span>
                            <span className="text-xs text-rose-600 font-semibold">Due Date: {new Date(f.dueDate).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-md font-bold text-slate-805">Class Fee Allocation</h4>
                          <span className="text-xs text-slate-450 block">Amount: ${f.amount} • Paid: ${f.amount - outstanding}</span>
                        </div>

                        <div className="flex flex-col items-stretch md:items-end justify-between self-stretch gap-4 md:gap-0">
                          <div>
                            <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                              outstanding === 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : outstanding < f.amount
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              {outstanding === 0 ? "PAID" : outstanding < f.amount ? "PARTIAL" : "UNPAID"}
                            </span>
                          </div>

                          <div className="text-left md:text-right mt-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Balance</span>
                            <span className="text-lg font-extrabold text-slate-900 block">
                              ${outstanding}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Floating AI Assistant Chat Bubble */}
          <div className="fixed bottom-6 right-6 z-50">
            {!chatOpen ? (
              <button
                onClick={() => setChatOpen(true)}
                className="w-14 h-14 bg-indigo-650 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all"
              >
                <span className="text-2xl">🤖</span>
              </button>
            ) : (
              <div className="w-80 md:w-96 h-[480px] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-200">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h4 className="font-bold text-sm">EduAI Coach</h4>
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1">
                        <span>●</span> <span>Online</span>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3 max-w-[80%] rounded-2xl ${
                        m.sender === "user" 
                          ? "bg-indigo-650 text-white rounded-tr-none" 
                          : "bg-white border border-slate-200 text-slate-805 rounded-tl-none"
                      } whitespace-pre-line`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-white border border-slate-250 text-slate-400 rounded-2xl rounded-tl-none animate-pulse">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 bg-white flex flex-wrap gap-1">
                  <button 
                    onClick={() => handleSendMessage("Why is my performance dropping?")}
                    className="px-2.5 py-1 border border-slate-200 hover:border-indigo-500 rounded-full text-[10px] text-slate-655 font-medium transition-colors"
                  >
                    Why is my performance dropping?
                  </button>
                  <button 
                    onClick={() => handleSendMessage("What should I do?")}
                    className="px-2.5 py-1 border border-slate-200 hover:border-indigo-500 rounded-full text-[10px] text-slate-655 font-medium transition-colors"
                  >
                    What should I do?
                  </button>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 border-t border-slate-100 bg-white flex space-x-2"
                >
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
