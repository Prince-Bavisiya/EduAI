"use client";

import { useEffect, useState, useCallback } from "react";
import { getCourses, getCourseById } from "@/services/academicService";
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
  getSubmissionsByAssignment,
  gradeSubmission,
} from "@/services/assignmentService";

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  deadline: string;
  maxMarks: number;
  subjectId: number;
  subject: {
    name: string;
    code: string;
  };
  _count?: {
    submissions: number;
  };
}

interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  submittedAt: string | null;
  marks: number | null;
  percentage: number | null;
  feedback: string | null;
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
  student: {
    id: number;
    user: {
      name: string;
      email: string;
    };
  };
}

export default function AssignmentDashboardPage() {
  const [tokenPresent, setTokenPresent] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Selection states
  const [selectedCourse, setSelectedCourse] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<number>(0);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    deadline: "",
    maxMarks: 20,
  });

  // Grading states
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState({
    marks: "",
    feedback: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grading, setGrading] = useState(false);
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
      setError("Failed to load courses.");
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
    setAssignments([]);
    if (!courseId) return;

    try {
      setLoading(true);
      setError("");
      const courseRes = await getCourseById(courseId);
      setSubjects(courseRes.data?.subjects || []);
    } catch (err) {
      setError("Failed to load subjects for selected course.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = async (subjectId: number) => {
    setSelectedSubject(subjectId);
    setAssignments([]);
    if (!subjectId) return;

    try {
      setLoading(true);
      setError("");
      const res = await getAssignments({ subjectId });
      setAssignments(res.data || []);
    } catch (err) {
      setError("Failed to load assignments list.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      alert("Please select a subject first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await createAssignment({
        title: newAssignment.title,
        description: newAssignment.description || undefined,
        deadline: newAssignment.deadline,
        maxMarks: Number(newAssignment.maxMarks),
        subjectId: selectedSubject,
      });

      setSuccessMsg("Assignment created successfully!");
      setShowAddModal(false);
      setNewAssignment({
        title: "",
        description: "",
        deadline: "",
        maxMarks: 20,
      });

      // Reload assignments list
      handleSubjectChange(selectedSubject);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this assignment and all submissions?")) return;

    try {
      setError("");
      await deleteAssignment(id);
      setSuccessMsg("Assignment deleted successfully.");
      handleSubjectChange(selectedSubject);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    }
  };

  const handleOpenGrading = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissions([]);
    setGradingSubmission(null);
    try {
      setLoadingSubmissions(true);
      const res = await getSubmissionsByAssignment(assignment.id);
      setSubmissions(res.data || []);
    } catch (err) {
      alert("Failed to load student submissions list.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleOpenGradeForm = (sub: Submission) => {
    setGradingSubmission(sub);
    setGradeInput({
      marks: sub.marks !== null ? String(sub.marks) : "",
      feedback: sub.feedback || "",
    });
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !selectedAssignment) return;

    try {
      setGrading(true);
      setError("");

      await gradeSubmission(gradingSubmission.id, {
        marks: Number(gradeInput.marks),
        feedback: gradeInput.feedback || undefined,
      });

      setSuccessMsg("Graded student submission successfully!");
      // Reload submissions list
      const res = await getSubmissionsByAssignment(selectedAssignment.id);
      setSubmissions(res.data || []);
      setGradingSubmission(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save grading");
    } finally {
      setGrading(false);
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
    setAssignments([]);
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
            Managing and grading class assignments requires an active Teacher session.
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
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Assignment Manager</h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Publish tasks, set deadlines, and grade student submissions.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              {selectedSubject > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all"
                >
                  Create Assignment
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

          {/* Selector Grid */}
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

          {/* Assignments List */}
          {selectedCourse && selectedSubject && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Subject Assignments</h3>
              </div>

              {loading ? (
                <div className="p-12 text-center animate-pulse text-slate-400 font-medium">
                  Loading subject assignments...
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-16 text-center">
                  <h3 className="text-lg font-bold text-slate-900">No Assignments Yet</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Publish your first classroom task or exam prep by clicking Create Assignment above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-4 px-8">Assignment Title</th>
                        <th className="py-4 px-8">Deadline</th>
                        <th className="py-4 px-8">Max Marks</th>
                        <th className="py-4 px-8">Submissions</th>
                        <th className="py-4 px-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.map((assignment) => (
                        <tr key={assignment.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-5 px-8">
                            <div className="font-bold text-slate-900 text-sm">{assignment.title}</div>
                            {assignment.description && (
                              <div className="text-xs text-slate-500 mt-0.5 max-w-md truncate">
                                {assignment.description}
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-8 text-sm text-slate-600 font-medium">
                            {new Date(assignment.deadline).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-5 px-8 text-sm font-semibold text-slate-700">
                            {assignment.maxMarks}
                          </td>
                          <td className="py-5 px-8 text-sm text-indigo-650 font-bold">
                            {assignment._count?.submissions || 0} Submitted
                          </td>
                          <td className="py-5 px-8 text-right">
                            <div className="inline-flex space-x-2">
                              <button
                                onClick={() => handleOpenGrading(assignment)}
                                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all border border-indigo-100"
                              >
                                Grade Submissions
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(assignment.id)}
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

          {/* Create Assignment Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Create Assignment</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Title</label>
                    <input
                      type="text"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. SQL JOIN Homework"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Description (Optional)</label>
                    <textarea
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                      placeholder="Describe instructions here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Deadline Date</label>
                      <input
                        type="date"
                        value={newAssignment.deadline}
                        onChange={(e) => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Max Marks</label>
                      <input
                        type="number"
                        value={newAssignment.maxMarks}
                        onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min={1}
                        required
                      />
                    </div>
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
                      {saving ? "Publishing..." : "Publish Assignment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Submissions & Grading Drawer Modal */}
          {selectedAssignment && (
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end">
              <div className="bg-white max-w-2xl w-full h-full border-l border-slate-100 p-8 shadow-2xl space-y-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">{selectedAssignment.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Grade Submissions (Max Score: {selectedAssignment.maxMarks})</p>
                  </div>
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm font-bold"
                  >
                    Close Drawer ✕
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="p-12 text-center animate-pulse text-slate-400 font-medium">
                    Loading student submission records...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No submissions recorded yet for this task.
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sub.student.user.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{sub.student.user.email}</div>
                          </div>
                          <div>
                            {sub.status === "GRADED" && (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md">
                                Graded: {sub.marks} / {selectedAssignment.maxMarks} ({sub.percentage}%)
                              </span>
                            )}
                            {sub.status === "SUBMITTED" && (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                                Submitted
                              </span>
                            )}
                            {sub.status === "LATE" && (
                              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-100 rounded-md">
                                Late Submission
                              </span>
                            )}
                          </div>
                        </div>

                        {sub.feedback && (
                          <div className="p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
                            <span className="font-semibold text-slate-700 block mb-0.5">Feedback:</span>
                            {sub.feedback}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleOpenGradeForm(sub)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-indigo-100"
                          >
                            {sub.status === "GRADED" ? "Change Grade" : "Grade Work"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grading Form Modal */}
                {gradingSubmission && (
                  <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="font-bold text-slate-900 text-base">
                          Grade {gradingSubmission.student.user.name}
                        </h4>
                        <button
                          onClick={() => setGradingSubmission(null)}
                          className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleGradeSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Marks Awarded (Max: {selectedAssignment.maxMarks})
                          </label>
                          <input
                            type="number"
                            value={gradeInput.marks}
                            onChange={(e) => setGradeInput({ ...gradeInput, marks: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            min={0}
                            max={selectedAssignment.maxMarks}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Grading Feedback (Optional)
                          </label>
                          <textarea
                            value={gradeInput.feedback}
                            onChange={(e) => setGradeInput({ ...gradeInput, feedback: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                            placeholder="Add guidance for student here..."
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setGradingSubmission(null)}
                            className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={grading}
                            className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {grading ? "Submitting score..." : "Submit Score"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
