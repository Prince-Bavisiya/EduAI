"use client";

import { useEffect, useState, useCallback } from "react";
import { getCourses, getCourseById } from "@/services/academicService";
import { getStudents } from "@/services/studentService";
import { getAttendance, markAttendance } from "@/services/attendanceService";
import { API_URL } from "@/services/apiClient";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Student {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function AttendanceDashboardPage() {
  const [tokenPresent, setTokenPresent] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Selection states
  const [selectedCourse, setSelectedCourse] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dev Auth Helper states
  const [authEmail, setAuthEmail] = useState(process.env.NODE_ENV === "production" ? "" : "admin@example.com");
  const [authPassword, setAuthPassword] = useState(process.env.NODE_ENV === "production" ? "" : "Admin123");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const checkToken = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("eduai_token");
      setTokenPresent(!!token);
      return !!token;
    }
    return false;
  };

  useEffect(() => {
    checkToken();
  }, []);

  // Fetch all courses on mount
  const loadCourses = useCallback(async () => {
    try {
      setError("");
      const res = await getCourses();
      setCourses(res.data || []);
    } catch (err) {
      setError("Failed to load courses database.");
    }
  }, []);

  useEffect(() => {
    if (tokenPresent) {
      loadCourses();
    }
  }, [tokenPresent, loadCourses]);

  // When course changes, load subjects & students
  const handleCourseChange = async (courseId: number) => {
    setSelectedCourse(courseId);
    setSelectedSubject(0);
    setSubjects([]);
    setStudents([]);
    setAttendance({});

    if (!courseId) return;

    try {
      setLoading(true);
      setError("");

      // 1. Fetch Subjects linked to this Course
      const courseRes = await getCourseById(courseId);
      setSubjects(courseRes.data?.subjects || []);

      // 2. Fetch Students enrolled in this Course
      const studentRes = await getStudents({ courseId: String(courseId), limit: 100 });
      const studentList = studentRes.data?.students || [];
      setStudents(studentList);

      // Default attendance to PRESENT for all
      const initialAttendance: Record<number, AttendanceStatus> = {};
      studentList.forEach((student: Student) => {
        initialAttendance[student.id] = "PRESENT";
      });
      setAttendance(initialAttendance);
    } catch (err) {
      setError("Failed to load class students or subjects list.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing attendance logs if Course, Subject, and Date are all selected
  const loadExistingAttendance = useCallback(async () => {
    if (!selectedCourse || !selectedSubject || !selectedDate) return;

    try {
      setLoading(true);
      setError("");

      // Fetch logs matching filters
      const response = await getAttendance({
        date: selectedDate,
        subjectId: selectedSubject,
        courseId: selectedCourse,
      });

      const logs = response.data || [];

      // Update state with existing statuses, keeping PRESENT defaults for any students not logged
      setAttendance((prev) => {
        const next = { ...prev };
        // Set all present first
        students.forEach((student) => {
          next[student.id] = "PRESENT";
        });
        // Override with database values
        logs.forEach((log: any) => {
          next[log.studentId] = log.status as AttendanceStatus;
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to load existing attendance logs", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedSubject, selectedDate, students]);

  useEffect(() => {
    if (selectedCourse && selectedSubject && selectedDate && students.length > 0) {
      loadExistingAttendance();
    }
  }, [selectedCourse, selectedSubject, selectedDate, students.length, loadExistingAttendance]);

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      alert("Please select a Course program");
      return;
    }
    if (!selectedSubject) {
      alert("Please select a Subject course");
      return;
    }
    if (!selectedDate) {
      alert("Please choose an attendance Date");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const records = students.map((student) => ({
        studentId: student.id,
        subjectId: selectedSubject,
        date: selectedDate,
        status: attendance[student.id] || "PRESENT",
      }));

      await markAttendance(records);
      setSuccessMsg("Attendance records saved successfully to database!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark class attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      localStorage.setItem("eduai_token", data.data.token);
      setTokenPresent(true);
      loadCourses();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eduai_token");
    setTokenPresent(false);
    setCourses([]);
    setSubjects([]);
    setStudents([]);
    setAttendance({});
  };

  // Filter students based on search query
  const filteredStudents = students.filter((s) =>
    s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute metrics
  const stats = {
    present: Object.values(attendance).filter((s) => s === "PRESENT").length,
    absent: Object.values(attendance).filter((s) => s === "ABSENT").length,
    late: Object.values(attendance).filter((s) => s === "LATE").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      {/* Dev Auth Assistant */}
      {!tokenPresent ? (
        <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-100 rounded-3xl shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Teacher Sign In Required</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Marking class attendance requires an active Teacher or Admin session. Log in to connect.
          </p>

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
            >
              {authLoading ? "Authenticating..." : "Connect Session"}
            </button>
          </form>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Panel Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Attendance Tracker</h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Configure course configurations, select subject timetables, and mark daily student logs.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Config Grid Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">1. Select Course Program</label>
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              >
                <option value={0}>Choose Course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">2. Choose Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(Number(e.target.value))}
                disabled={!selectedCourse}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50"
              >
                <option value={0}>
                  {!selectedCourse ? "Select course first" : "Choose Subject..."}
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">3. Timetable Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Student Listing & Stats */}
          {selectedCourse && selectedSubject && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              {/* Search bar inside list */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search student by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                  />
                </div>

                {/* Metrics Badges */}
                <div className="flex items-center space-x-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    Present: {stats.present}
                  </span>
                  <span className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg">
                    Absent: {stats.absent}
                  </span>
                  <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg">
                    Late: {stats.late}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center animate-pulse text-slate-400 font-medium">
                  Loading class student log directory...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-16 text-center">
                  <h3 className="text-lg font-bold text-slate-900">No Students Found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    No students found matching your course program details.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-4 px-8">ID</th>
                        <th className="py-4 px-8">Student details</th>
                        <th className="py-4 px-8 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const status = attendance[student.id] || "PRESENT";
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-5 px-8 text-sm font-semibold text-slate-400">
                              #{student.id}
                            </td>
                            <td className="py-5 px-8">
                              <div className="font-bold text-slate-900 text-sm">{student.user.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{student.user.email}</div>
                            </td>
                            <td className="py-5 px-8 text-right">
                              <div className="inline-flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, "PRESENT")}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                    status === "PRESENT"
                                      ? "bg-emerald-650 text-white border-emerald-650 shadow-md shadow-emerald-100"
                                      : "bg-white text-slate-400 hover:text-slate-600 border-slate-200"
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, "ABSENT")}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                    status === "ABSENT"
                                      ? "bg-rose-600 text-white border-rose-650 shadow-md shadow-rose-100"
                                      : "bg-white text-slate-400 hover:text-slate-600 border-slate-200"
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(student.id, "LATE")}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                                    status === "LATE"
                                      ? "bg-amber-500 text-white border-amber-550 shadow-md shadow-amber-100"
                                      : "bg-white text-slate-400 hover:text-slate-600 border-slate-200"
                                  }`}
                                >
                                  Late
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Save button panel */}
                  <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveAttendance}
                      className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 flex items-center space-x-2"
                    >
                      <span>{saving ? "Saving attendance..." : "Save Attendance"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
