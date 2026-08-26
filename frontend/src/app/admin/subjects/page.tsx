"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSubjects, createSubject, updateSubject, deleteSubject } from "@/services/subjectService";
import { getCourses } from "@/services/academicService";
import { getTeachers } from "@/services/teacherService";

interface Course {
  id: number;
  name: string;
}

interface Teacher {
  id: number;
  user: {
    name: string;
  };
}

interface Subject {
  id: number;
  name: string;
  code: string;
  sessions: number;
  courseId: number | null;
  teacherId: number | null;
  course?: Course | null;
  teacher?: Teacher | null;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tokenPresent, setTokenPresent] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    sessions: 0,
    courseId: 0,
    teacherId: 0,
  });

  // Dropdown lists
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Dev login helper
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

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getSubjects({
        page,
        limit: 10,
        search,
      });
      setSubjects(res.data.subjects || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (tokenPresent) {
      loadSubjects();
    } else {
      setLoading(false);
    }
  }, [page, search, tokenPresent, loadSubjects]);

  const loadDropdownData = async () => {
    try {
      const [courseRes, teacherRes] = await Promise.all([
        getCourses(),
        getTeachers({ limit: 100 }),
      ]);
      setCourses(courseRes.data || []);
      setTeachers(teacherRes.data.teachers || []);
    } catch (err) {
      console.error("Failed to load select options", err);
    }
  };

  useEffect(() => {
    if (tokenPresent) {
      loadDropdownData();
    }
  }, [tokenPresent]);

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
      localStorage.setItem("eduai_user", JSON.stringify(data.data.user));
      setTokenPresent(true);
      window.location.reload();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eduai_token");
    localStorage.removeItem("eduai_user");
    setTokenPresent(false);
    router.push("/login");
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createSubject({
        name: form.name,
        code: form.code,
        sessions: form.sessions,
        courseId: form.courseId || null,
        teacherId: form.teacherId || null,
      });
      setShowAddModal(false);
      resetForm();
      await loadSubjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      setSubmitting(true);
      await updateSubject(selectedSubject.id, {
        name: form.name,
        code: form.code,
        sessions: form.sessions,
        courseId: form.courseId || null,
        teacherId: form.teacherId || null,
      });
      setShowEditModal(false);
      resetForm();
      await loadSubjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;
    try {
      setSubmitting(true);
      await deleteSubject(selectedSubject.id);
      setShowDeleteModal(false);
      setSelectedSubject(null);
      await loadSubjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete subject");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      sessions: subject.sessions || 0,
      courseId: subject.courseId || 0,
      teacherId: subject.teacherId || 0,
    });
    setShowEditModal(true);
  };

  const openDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      sessions: 0,
      courseId: 0,
      teacherId: 0,
    });
    setSelectedSubject(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      {!tokenPresent ? (
        <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-100 rounded-3xl shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <span className="text-xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Admin Sign In Required</h2>
          </div>
          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Admin Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
            {authError && <div className="text-rose-500 text-xs font-medium">{authError}</div>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {authLoading ? "Connecting..." : "Connect Session"}
            </button>
          </form>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-extrabold text-slate-900">Subject Management</h1>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">Admin View</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Add, manage, and assign institutional subjects to courses and assign specific teachers to them.
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-5 py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center space-x-2"
              >
                <span>➕ Add Subject</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search subjects by name or code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550 transition-all"
              />
            </div>
          </div>

          {/* Main Subjects Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Syncing subjects list...</div>
            ) : subjects.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium">No subjects found in record.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-6">Subject Code</th>
                      <th className="p-6">Subject Name</th>
                      <th className="p-6">Sessions</th>
                      <th className="p-6">Course</th>
                      <th className="p-6">Assigned Instructor</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="p-6 font-semibold text-slate-900">{sub.code}</td>
                        <td className="p-6 text-slate-950 font-medium">{sub.name}</td>
                        <td className="p-6 text-slate-950 font-medium">{sub.sessions || 0}</td>
                        <td className="p-6">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                            {sub.course?.name || "Unassigned"}
                          </span>
                        </td>
                        <td className="p-6 text-indigo-750 font-medium">
                          {sub.teacher?.user.name || (
                            <span className="text-slate-400 font-normal">Unassigned</span>
                          )}
                        </td>
                        <td className="p-6 text-right space-x-3">
                          <button
                            onClick={() => openEdit(sub)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(sub)}
                            className="text-rose-600 hover:text-rose-900 font-semibold transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-white disabled:opacity-50 transition-all"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-white disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add New Subject</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateSubject} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE-501, DBMS-01"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sessions</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 5"
                  value={form.sessions}
                  onChange={(e) => setForm({ ...form, sessions: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Linked Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Unassigned (General Subject)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Teacher</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Unassigned (No Instructor)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Subject: {selectedSubject?.code}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleEditSubject} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sessions</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.sessions}
                  onChange={(e) => setForm({ ...form, sessions: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Linked Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Unassigned (General Subject)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Teacher</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Unassigned (No Instructor)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete subject <strong>{selectedSubject?.name} ({selectedSubject?.code})</strong>? This will cascade delete its homework assignments, exam logs, and grade registries!
              </p>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubject}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Delete Subject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
