"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTimetable, createTimetable, deleteTimetable } from "@/services/timetableService";
import { getCourses } from "@/services/academicService";
import { getTeachers } from "@/services/teacherService";
import { getSubjects } from "@/services/subjectService";

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
}

interface TimetableSlot {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: number;
  subject: Subject;
  teacher: Teacher;
  course: Course;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function AdminTimetablePage() {
  const router = useRouter();
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tokenPresent, setTokenPresent] = useState(false);

  // Filters state
  const [filterCourseId, setFilterCourseId] = useState<number>(0);
  const [filterSemester, setFilterSemester] = useState<number>(1);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    day: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    subjectId: 0,
    teacherId: 0,
    courseId: 0,
    semester: 1,
  });

  // Metadata dropdowns
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

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

  const loadTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const queryParams: any = {};
      if (filterCourseId) queryParams.courseId = filterCourseId;
      if (filterSemester) queryParams.semester = filterSemester;

      const res = await getTimetable(queryParams);
      setTimetableSlots(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [filterCourseId, filterSemester]);

  useEffect(() => {
    if (tokenPresent) {
      loadTimetable();
    } else {
      setLoading(false);
    }
  }, [tokenPresent, loadTimetable]);

  const loadMetadata = async () => {
    try {
      const [courseRes, teacherRes, subjectRes] = await Promise.all([
        getCourses(),
        getTeachers({ limit: 100 }),
        getSubjects({ limit: 100 }),
      ]);
      setCourses(courseRes.data || []);
      setTeachers(teacherRes.data.teachers || []);
      setSubjects(subjectRes.data.subjects || []);
      
      // Auto-select first course to load initial grid
      if (courseRes.data && courseRes.data.length > 0) {
        setFilterCourseId(courseRes.data[0].id);
      }
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

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId || !form.teacherId || !form.courseId) {
      alert("Please select a subject, teacher, and course");
      return;
    }
    try {
      setSubmitting(true);
      await createTimetable(form);
      setShowAddModal(false);
      // Reset form keeping courseId/semester/day for convenience
      setForm((prev) => ({
        ...prev,
        startTime: "09:00",
        endTime: "10:00",
        room: "",
        subjectId: 0,
        teacherId: 0,
      }));
      await loadTimetable();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Scheduling conflict or error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!selectedSlot) return;
    try {
      setSubmitting(true);
      await deleteTimetable(selectedSlot.id);
      setShowDeleteModal(false);
      setSelectedSlot(null);
      await loadTimetable();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete slot");
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setShowDeleteModal(true);
  };

  // Group slots by day
  const slotsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = timetableSlots.filter((slot) => slot.day === day);
    return acc;
  }, {} as Record<string, TimetableSlot[]>);

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
                <h1 className="text-3xl font-extrabold text-slate-900">Timetable Scheduler</h1>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">Admin View</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Create and manage scheduling blocks for classes. Overlap detection is executed for teachers, rooms, and class semesters.
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
                  setForm((prev) => ({
                    ...prev,
                    courseId: filterCourseId,
                    semester: filterSemester,
                  }));
                  setShowAddModal(true);
                }}
                className="px-5 py-3 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center space-x-2"
              >
                <span>➕ Create Slot</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1">Select Course</label>
              <select
                value={filterCourseId}
                onChange={(e) => setFilterCourseId(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value={0}>Choose Course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-400 uppercase mb-1">Select Semester</label>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Weekly Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {DAYS_OF_WEEK.slice(0, 5).map((day) => {
              const daySlots = slotsByDay[day] || [];
              return (
                <div key={day} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-wider uppercase">{day}</h3>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-150 text-slate-500 rounded-full text-[10px] font-bold">
                      {daySlots.length} Classes
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 min-h-[300px]">
                    {daySlots.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-350 text-xs italic">
                        No classes
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div key={slot.id} className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 space-y-2.5 relative group transition-colors">
                          <button
                            onClick={() => openDelete(slot)}
                            className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            title="Delete Slot"
                          >
                            ✕
                          </button>
                          <div className="text-[11px] font-bold text-indigo-650">
                            🕒 {slot.startTime} - {slot.endTime}
                          </div>
                          <div className="font-bold text-slate-850 leading-tight">
                            {slot.subject.name}
                          </div>
                          <div className="text-xs text-slate-500 flex flex-col space-y-0.5">
                            <span>Room: {slot.room}</span>
                            <span className="truncate">Instructor: {slot.teacher.user.name}</span>
                          </div>
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

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Timetable Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateSlot} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Day of Week</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Room / Lab</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 301, Lab 2"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Course</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                >
                  <option value={0}>Select Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Semester</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assigned Subject</label>
                  <select
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value={0}>Select Subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assign Instructor</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                >
                  <option value={0}>Select Teacher...</option>
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
                  {submitting ? "Saving..." : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Slot Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Remove Class Entry</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Are you sure you want to delete the scheduled class for <strong>{selectedSlot?.subject.name}</strong> on {selectedSlot?.day} from {selectedSlot?.startTime} to {selectedSlot?.endTime}?
              </p>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSlot}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? "Removing..." : "Remove Entry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
