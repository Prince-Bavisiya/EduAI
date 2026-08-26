"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "@/services/teacherService";
import { getDepartments, getCourses } from "@/services/academicService";
import { getSubjects } from "@/services/subjectService";

interface Department {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Course {
  id: number;
  name: string;
}

interface Teacher {
  id: number;
  userId: number;
  departmentId: number | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  department?: Department | null;
  courses: Course[];
  subjects: Subject[];
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
  
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    departmentId: 0,
    courseIds: [] as number[],
    subjectIds: [] as number[],
  });

  // Academic dropdown helpers
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

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

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getTeachers({
        page,
        limit: 10,
        search,
      });
      setTeachers(res.data.teachers || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (tokenPresent) {
      loadTeachers();
    } else {
      setLoading(false);
    }
  }, [page, search, tokenPresent, loadTeachers]);

  const loadMetadata = async () => {
    try {
      const [deptRes, subRes, courseRes] = await Promise.all([
        getDepartments(),
        getSubjects({ limit: 100 }),
        getCourses(),
      ]);
      setDepartments(deptRes.data || []);
      setSubjects(subRes.data.subjects || []);
      setCourses(courseRes.data || []);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    if (tokenPresent) {
      loadMetadata();
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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createTeacher({
        ...form,
        departmentId: form.departmentId || null,
      });
      setShowAddModal(false);
      resetForm();
      await loadTeachers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      setSubmitting(true);
      await updateTeacher(selectedTeacher.id, {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        departmentId: form.departmentId || null,
        courseIds: form.courseIds,
        subjectIds: form.subjectIds,
      });
      setShowEditModal(false);
      resetForm();
      await loadTeachers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      setSubmitting(true);
      await deleteTeacher(selectedTeacher.id);
      setShowDeleteModal(false);
      setSelectedTeacher(null);
      await loadTeachers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setForm({
      name: teacher.user.name,
      email: teacher.user.email,
      password: "",
      departmentId: teacher.departmentId || 0,
      courseIds: teacher.courses.map((c) => c.id),
      subjectIds: teacher.subjects.map((s) => s.id),
    });
    setShowEditModal(true);
  };

  const openDelete = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      departmentId: 0,
      courseIds: [],
      subjectIds: [],
    });
    setSelectedTeacher(null);
  };

  const handleCheckboxChange = (field: "courseIds" | "subjectIds", id: number) => {
    setForm((prev) => {
      const arr = prev[field];
      if (arr.includes(id)) {
        return { ...prev, [field]: arr.filter((x) => x !== id) };
      } else {
        return { ...prev, [field]: [...arr, id] };
      }
    });
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
                <h1 className="text-3xl font-extrabold text-slate-900">Teachers Directory</h1>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">Admin View</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Add, manage, and assign institutional departments, courses, and subjects to faculty teachers.
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
                <span>➕ Add Teacher</span>
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
                placeholder="Search teachers by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550 transition-all"
              />
            </div>
          </div>

          {/* Main Teachers Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Syncing teachers list...</div>
            ) : teachers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium">No teachers found in directory.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-6">Faculty Name</th>
                      <th className="p-6">Contact Email</th>
                      <th className="p-6">Department</th>
                      <th className="p-6">Assigned Subjects</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="p-6 font-semibold text-slate-900">{teacher.user.name}</td>
                        <td className="p-6 text-slate-500">{teacher.user.email}</td>
                        <td className="p-6">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                            {teacher.department?.name || "Unassigned"}
                          </span>
                        </td>
                        <td className="p-6 max-w-xs">
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.subjects.length === 0 ? (
                              <span className="text-slate-400 text-xs">None</span>
                            ) : (
                              teacher.subjects.map((sub) => (
                                <span key={sub.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs" title={sub.code}>
                                  {sub.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-6 text-right space-x-3">
                          <button
                            onClick={() => openEdit(teacher)}
                            className="text-indigo-600 hover:text-indigo-900 font-semibold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(teacher)}
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

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add New Teacher</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateTeacher} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Courses</label>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-32 overflow-y-auto space-y-2">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center space-x-2 text-sm text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.courseIds.includes(c.id)}
                        onChange={() => handleCheckboxChange("courseIds", c.id)}
                        className="rounded text-indigo-650"
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Subjects</label>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-32 overflow-y-auto space-y-2">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center space-x-2 text-sm text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.subjectIds.includes(s.id)}
                        onChange={() => handleCheckboxChange("subjectIds", s.id)}
                        className="rounded text-indigo-650"
                      />
                      <span>{s.name} ({s.code})</span>
                    </label>
                  ))}
                </div>
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
                  {submitting ? "Saving..." : "Add Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Teacher: {selectedTeacher?.user.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleEditTeacher} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value={0}>Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Courses</label>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-32 overflow-y-auto space-y-2">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center space-x-2 text-sm text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.courseIds.includes(c.id)}
                        onChange={() => handleCheckboxChange("courseIds", c.id)}
                        className="rounded text-indigo-650"
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Subjects</label>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-32 overflow-y-auto space-y-2">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center space-x-2 text-sm text-slate-650 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.subjectIds.includes(s.id)}
                        onChange={() => handleCheckboxChange("subjectIds", s.id)}
                        className="rounded text-indigo-650"
                      />
                      <span>{s.name} ({s.code})</span>
                    </label>
                  ))}
                </div>
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

      {/* Delete Teacher Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete the faculty account for <strong>{selectedTeacher?.user.name}</strong>? This action is permanent, and will delete their user profile and cascade deletion throughout subjects.
              </p>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeacher}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
