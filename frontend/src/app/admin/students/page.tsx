"use client";

import { useCallback, useEffect, useState } from "react";
import { getStudents, deleteStudent, createStudent } from "@/services/studentService";
import { useRouter } from "next/navigation";
import { getDepartments, getCourses } from "@/services/academicService";

interface Department {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  departmentId: number;
}

interface Student {
  id: number;
  userId: number;
  parentId: number | null;
  courseId: number | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  course?: {
    id: number;
    name: string;
    description: string | null;
    departmentId: number | null;
    department?: {
      id: number;
      name: string;
    };
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tokenPresent, setTokenPresent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    semester: 1,
    courseId: 0,
    departmentId: 0,
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingAcademicData, setLoadingAcademicData] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Helper auth state
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

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getStudents({
        page,
        limit: 10,
        search,
      });

      setStudents(response.data.students || []);
      setPagination({
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        totalPages: response.data.pages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (tokenPresent) {
      loadStudents();
    } else {
      setLoading(false);
    }
  }, [page, search, tokenPresent, loadStudents]);

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
      loadStudents();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("eduai_token");
    setTokenPresent(false);
    setStudents([]);
    setPagination(null);
  };

  const initiateDelete = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      setError("");
      await deleteStudent(studentToDelete.id);
      setShowDeleteModal(false);
      setStudentToDelete(null);
      // Refresh list
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setLoadingAcademicData(true);
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (error) {
      console.error("Failed to load departments", error);
    } finally {
      setLoadingAcademicData(false);
    }
  };

  const handleDepartmentChange = async (departmentId: number) => {
    setForm((current) => ({
      ...current,
      departmentId,
      courseId: 0,
    }));

    if (!departmentId) {
      setCourses([]);
      return;
    }

    try {
      setLoadingCourses(true);
      const response = await getCourses(departmentId);
      setCourses(response.data || []);
    } catch (error) {
      console.error("Failed to load courses", error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.departmentId || !form.courseId) {
      alert("Please select department and course");
      return;
    }

    try {
      setCreating(true);
      await createStudent(form);
      setShowAddModal(false);
      setForm({
        name: "",
        email: "",
        password: "",
        studentId: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        semester: 1,
        courseId: 0,
        departmentId: 0,
      });
      setCourses([]);
      await loadStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setCreating(false);
    }
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
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Admin Sign In Required</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            The database CRUD operations require a valid JWT admin token. Enter the Admin credentials to proceed.
          </p>

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Admin Email</label>
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Panel Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Students Directory</h1>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                  {pagination?.total || 0} Total
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Manage registered students, view academic profiles, and perform administrative operations.
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <button
                onClick={async () => {
                  setShowAddModal(true);
                  if (departments.length === 0) {
                    await loadDepartments();
                  }
                }}
                className="px-5 py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-50 hover:bg-indigo-700 active:scale-95 transition-all flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Student</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium flex items-center space-x-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Table Container Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            {/* Search and Filters Toolbar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex w-full md:w-auto items-center space-x-3">
                <select
                  disabled
                  className="w-full md:w-44 px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-400 focus:outline-none opacity-60"
                >
                  <option value="">All Departments</option>
                </select>
                <select
                  disabled
                  className="w-full md:w-44 px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-400 focus:outline-none opacity-60"
                >
                  <option value="">All Courses</option>
                </select>
              </div>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-6 animate-pulse flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-32"></div>
                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-28"></div>
                    <div className="h-4 bg-slate-100 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Students Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  {search ? `No results match the query "${search}". Try typing another name.` : "There are currently no students registered in the database."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Student details</th>
                      <th className="py-4 px-6">Course program</th>
                      <th className="py-4 px-6">Enrollment Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-semibold text-slate-400">
                          #{student.id}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center">
                              {student.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{student.user.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{student.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {student.course ? (
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{student.course.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{student.course.department?.name || "No Dept"}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                              No Course Enrolled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-500">
                          {new Date(student.user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/admin/students/${student.id}`)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                              title="View profile"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => alert(`Edit details for: ${student.user.name}`)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                              title="Edit profile"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => initiateDelete(student)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                              title="Delete profile"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <div className="inline-flex space-x-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold rounded-lg transition-colors focus:outline-none"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold rounded-lg transition-colors focus:outline-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && studentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Confirm Deletion</h3>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete the student profile for <span className="font-bold text-slate-800">{studentToDelete.user.name}</span>? 
              This action is permanent and will cascade to delete the corresponding authentication credentials and profile records.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setStudentToDelete(null);
                }}
                className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Add New Student</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Student ID</label>
                <input
                  type="text"
                  required
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  placeholder="e.g. STU12345"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +1 555-0199"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600"
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Semester</label>
                <select
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => handleDepartmentChange(Number(e.target.value))}
                  disabled={loadingAcademicData}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600"
                >
                  <option value={0}>
                    {loadingAcademicData ? "Loading departments..." : "Select department"}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      courseId: Number(e.target.value),
                    }))
                  }
                  disabled={!form.departmentId || loadingCourses}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600"
                >
                  <option value={0}>
                    {loadingCourses
                      ? "Loading courses..."
                      : !form.departmentId
                      ? "Select department first"
                      : courses.length === 0
                      ? "No courses available"
                      : "Select course"}
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-600">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
                  rows={3}
                  placeholder="Student address"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
