"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCourses, getCourseById } from "@/services/academicService";
import { getExams, createExam, deleteExam } from "@/services/examService";

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Exam {
  id: number;
  name: string;
  semester: number;
  examDate: string;
  totalMarks: number;
  subjectId: number;
  subject: {
    name: string;
    code: string;
  };
  _count?: {
    marks: number;
  };
}

export default function ExamsDashboardPage() {
  const router = useRouter();
  const [tokenPresent, setTokenPresent] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // Selection states
  const [selectedCourse, setSelectedCourse] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<number>(0);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExam, setNewExam] = useState({
    name: "",
    semester: 5,
    examDate: "",
    totalMarks: 100,
  });

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

  const handleCourseChange = async (courseId: number) => {
    setSelectedCourse(courseId);
    setSelectedSubject(0);
    setSubjects([]);
    setExams([]);
    if (!courseId) return;

    try {
      setLoading(true);
      setError("");
      const courseRes = await getCourseById(courseId);
      setSubjects(courseRes.data?.subjects || []);
    } catch (err) {
      setError("Failed to load subjects list.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = async (subjectId: number) => {
    setSelectedSubject(subjectId);
    setExams([]);
    if (!subjectId) return;

    try {
      setLoading(true);
      setError("");
      const res = await getExams({ subjectId });
      setExams(res.data || []);
    } catch (err) {
      setError("Failed to load exams list.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      alert("Please select a subject first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createExam({
        name: newExam.name,
        semester: Number(newExam.semester),
        examDate: newExam.examDate,
        totalMarks: Number(newExam.totalMarks),
        subjectId: selectedSubject,
      });

      setSuccessMsg("Exam created successfully!");
      setShowAddModal(false);
      setNewExam({
        name: "",
        semester: 5,
        examDate: "",
        totalMarks: 100,
      });

      // Reload list
      handleSubjectChange(selectedSubject);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam? All logged student marks will be cascade deleted!")) return;

    try {
      setError("");
      await deleteExam(id);
      setSuccessMsg("Exam deleted successfully.");
      handleSubjectChange(selectedSubject);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exam");
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
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
    setExams([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      {/* Dev Auth Assistant */}
      {!tokenPresent ? (
        <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-100 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Teacher Sign In Required</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Managing exam parameters and student marks requires an active Teacher session.
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
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-650 rounded-xl text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
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
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Exams & Results</h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Configure mid-term or quiz details and log student performance marks.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              {selectedSubject > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all"
                >
                  Create Exam
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-650 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Filter selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 border border-slate-100 rounded-3xl shadow-sm">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">2. Choose Subject Course</label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(Number(e.target.value))}
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
          </div>

          {/* Exams List */}
          {selectedCourse && selectedSubject && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Subject Timetable Exams</h3>
              </div>

              {loading ? (
                <div className="p-12 text-center animate-pulse text-slate-400 font-medium">
                  Loading subject exams...
                </div>
              ) : exams.length === 0 ? (
                <div className="p-16 text-center">
                  <h3 className="text-lg font-bold text-slate-900">No Exams Created</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Publish your first classroom exam schedule by clicking Create Exam above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-4 px-8">Exam Name</th>
                        <th className="py-4 px-8">Semester</th>
                        <th className="py-4 px-8">Exam Date</th>
                        <th className="py-4 px-8">Max Marks</th>
                        <th className="py-4 px-8">Logged Marks</th>
                        <th className="py-4 px-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exams.map((exam) => (
                        <tr key={exam.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-5 px-8 font-bold text-slate-900 text-sm">
                            {exam.name}
                          </td>
                          <td className="py-5 px-8 text-sm text-slate-600 font-semibold">
                            Sem {exam.semester}
                          </td>
                          <td className="py-5 px-8 text-sm text-slate-500">
                            {new Date(exam.examDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-5 px-8 text-sm font-semibold text-slate-700">
                            {exam.totalMarks}
                          </td>
                          <td className="py-5 px-8 text-sm text-indigo-650 font-bold">
                            {exam._count?.marks || 0} Graded
                          </td>
                          <td className="py-5 px-8 text-right">
                            <div className="inline-flex space-x-2">
                              <button
                                onClick={() => router.push(`/admin/exams/${exam.id}`)}
                                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all border border-indigo-100"
                              >
                                View / Edit Marks
                              </button>
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="px-3.5 py-2 border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-lg transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Create Exam Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Create Exam Entry</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Exam Name</label>
                    <input
                      type="text"
                      value={newExam.name}
                      onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. DBMS Term Assessment"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Exam Date</label>
                      <input
                        type="date"
                        value={newExam.examDate}
                        onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Semester</label>
                      <input
                        type="number"
                        value={newExam.semester}
                        onChange={(e) => setNewExam({ ...newExam, semester: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min={1}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={newExam.totalMarks}
                      onChange={(e) => setNewExam({ ...newExam, totalMarks: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min={1}
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-5 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {saving ? "Publishing..." : "Create Exam"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
