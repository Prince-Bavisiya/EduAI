"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudentById, updateStudent, deleteStudent } from "@/services/studentService";
import { getDepartments, getCourses } from "@/services/academicService";
import { getStudentAttendance, getStudentAttendanceStats } from "@/services/attendanceService";
import { getMarksByStudent } from "@/services/examService";
import { getStudentSubmissions } from "@/services/assignmentService";
import BackButton from "@/components/navigation/BackButton";

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
  studentId?: string;
  phone?: string;
  address?: string;
  semester?: number;
  dateOfBirth?: string;
  gender?: string;
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

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form state
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
    departmentId: 0,
    courseId: 0,
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingAcademicData, setLoadingAcademicData] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [academicLoading, setAcademicLoading] = useState(true);

  const loadStudent = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getStudentById(id);
      const studentData = response.data;
      setStudent(studentData);

      setForm({
        name: studentData.user.name,
        email: studentData.user.email,
        password: "",
        studentId: studentData.studentId || "",
        phone: studentData.phone || "",
        dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth.split("T")[0] : "",
        gender: studentData.gender || "",
        address: studentData.address || "",
        semester: studentData.semester || 1,
        departmentId: studentData.course?.departmentId || 0,
        courseId: studentData.courseId || 0,
      });

      // Load matching courses if department is already set
      if (studentData.course?.departmentId) {
        const coursesRes = await getCourses(studentData.course.departmentId);
        setCourses(coursesRes.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        getStudentAttendanceStats(id),
        getStudentAttendance(id),
      ]);
      setAttendanceStats(statsRes.data);
      setAttendanceLogs(logsRes.data || []);
    } catch (err) {
      console.error("Failed to load attendance", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, [id]);

  const loadAcademicPerformance = useCallback(async () => {
    try {
      setAcademicLoading(true);
      const [marksRes, submissionsRes] = await Promise.all([
        getMarksByStudent(id),
        getStudentSubmissions(id),
      ]);
      setExamMarks(marksRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (err) {
      console.error("Failed to load academic marks or submissions", err);
    } finally {
      setAcademicLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadStudent();
      loadAttendance();
      loadAcademicPerformance();
    }
  }, [id, loadStudent, loadAttendance, loadAcademicPerformance]);

  const loadAcademicDropdowns = async () => {
    try {
      setLoadingAcademicData(true);
      const response = await getDepartments();
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to load departments", err);
    } finally {
      setLoadingAcademicData(false);
    }
  };

  const handleEditClick = async () => {
    setEditing(true);
    await loadAcademicDropdowns();
  };

  const handleCancelEdit = () => {
    if (!student) {
      setEditing(false);
      return;
    }
    const hasChanges = 
      form.name !== student.user.name ||
      form.email !== student.user.email ||
      form.studentId !== (student.studentId || "") ||
      form.phone !== (student.phone || "") ||
      form.address !== (student.address || "") ||
      form.semester !== (student.semester || 1) ||
      form.courseId !== (student.courseId || 0);

    if (hasChanges) {
      if (window.confirm("Discard unsaved changes?")) {
        setEditing(false);
      }
    } else {
      setEditing(false);
    }
  };

  const handleDepartmentChange = async (deptId: number) => {
    setForm((current) => ({
      ...current,
      departmentId: deptId,
      courseId: 0,
    }));

    if (!deptId) {
      setCourses([]);
      return;
    }

    try {
      setLoadingCourses(true);
      const response = await getCourses(deptId);
      setCourses(response.data || []);
    } catch (error) {
      console.error("Failed to load courses", error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const payload: {
        name?: string;
        email?: string;
        password?: string;
        studentId?: string;
        phone?: string;
        dateOfBirth?: string;
        gender?: string;
        address?: string;
        semester?: number;
        courseId?: number;
      } = {
        name: form.name,
        email: form.email,
        studentId: form.studentId,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address,
        semester: Number(form.semester),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (form.courseId) {
        payload.courseId = form.courseId;
      }

      await updateStudent(id, payload);
      setEditing(false);
      await loadStudent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError("");
      await deleteStudent(id);
      setShowDeleteModal(false);
      router.push("/admin/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600/20 border-t-indigo-600 animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Loading profile details...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-100 p-8 rounded-3xl shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Error Loading Profile</h3>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => router.push("/admin/students")}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton fallbackRoute="/admin/students" label="Back to Students" />
        {/* Breadcrumb Header */}
        <div className="flex items-center space-x-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <button onClick={() => router.push("/admin/students")} className="hover:text-indigo-600 transition-colors">
            Students
          </button>
          <span>/</span>
          <span className="text-slate-500">Student Profile</span>
        </div>

        {/* Hero Card Panel */}
        <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-extrabold text-2xl flex items-center justify-center">
              {student.user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{student.user.name}</h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {student.user.role}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{student.user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleEditClick}
              className="px-5 py-3 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-3 bg-rose-50 text-rose-600 font-semibold text-sm rounded-xl hover:bg-rose-100 active:scale-95 transition-all"
            >
              Delete Student
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {attendanceLoading ? "..." : attendanceStats ? `${attendanceStats.overallAttendance}%` : "0%"}
            </div>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
              {attendanceLoading ? "Loading calculations..." : "Overall presence rate"}
            </span>
          </div>
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Results Avg</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {academicLoading ? "..." : examMarks.length > 0 ? `${Math.round(examMarks.reduce((sum, mark) => sum + mark.percentage, 0) / examMarks.length)}%` : "N/A"}
            </div>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
              {academicLoading ? "Loading marks..." : `${examMarks.length} graded exam entries`}
            </span>
          </div>
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Fees Balance</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">₹0.00</div>
            <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">Fully Paid</span>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Info */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Academic Information</h3>
            <div className="space-y-3.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Course Program</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                  {student.course?.name || "Not Enrolled"}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Department</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                  {student.course?.department?.name || "Not Associated"}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Database Student ID</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">#{student.id}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Account Configuration</h3>
            <div className="space-y-3.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Unique User ID</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">#{student.userId}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Authorized Role</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">{student.user.role}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Registration Date</span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                  {new Date(student.user.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subject-wise Attendance & History */}
        {!attendanceLoading && attendanceStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Attendance Percentages */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Subject Attendance</h3>
              <div className="space-y-4">
                {attendanceStats.subjects.length === 0 ? (
                  <p className="text-sm text-slate-500">No subject attendance records found.</p>
                ) : (
                  attendanceStats.subjects.map((sub: any) => (
                    <div key={sub.subjectId} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700">{sub.subjectName} ({sub.subjectCode})</span>
                        <span className="font-extrabold text-indigo-650">{sub.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            sub.percentage >= 75 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${sub.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                        <span>Attended: {sub.present + sub.late} / {sub.total}</span>
                        {sub.percentage < 75 && (
                          <span className="text-rose-600 font-bold uppercase tracking-wider">Needs Attention</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Attendance Logs History */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Attendance History</h3>
              <div className="max-h-72 overflow-y-auto space-y-3.5 pr-2">
                {attendanceLogs.length === 0 ? (
                  <p className="text-sm text-slate-500">No history logged.</p>
                ) : (
                  attendanceLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{log.subject.name}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {new Date(log.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div>
                        {log.status === "PRESENT" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            Present
                          </span>
                        )}
                        {log.status === "ABSENT" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                            Absent
                          </span>
                        )}
                        {log.status === "LATE" && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                            Late
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exams & Assignments Performance */}
        {!academicLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Exam Marks */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom duration-200">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Exam Marks</h3>
              <div className="max-h-72 overflow-y-auto space-y-3.5 pr-2">
                {examMarks.length === 0 ? (
                  <p className="text-sm text-slate-500">No exam results recorded.</p>
                ) : (
                  examMarks.map((mark) => (
                    <div key={mark.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{mark.exam.name}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {mark.subject.name} • {new Date(mark.exam.examDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-slate-900">{mark.marks} / {mark.exam.totalMarks}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 mt-1 uppercase">
                          Grade {mark.grade} ({mark.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assignments Submissions */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom duration-200">
              <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Assignments Submissions</h3>
              <div className="max-h-72 overflow-y-auto space-y-3.5 pr-2">
                {submissions.length === 0 ? (
                  <p className="text-sm text-slate-500">No assignment submissions recorded.</p>
                ) : (
                  submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-colors">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{sub.assignment.title}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {sub.assignment.subject.name} • Deadline: {new Date(sub.assignment.deadline).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        {sub.status === "GRADED" ? (
                          <>
                            <div className="text-sm font-extrabold text-slate-900">{sub.marks} / {sub.assignment.maxMarks}</div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1 uppercase">
                              Graded ({sub.percentage}%)
                            </span>
                          </>
                        ) : sub.status === "SUBMITTED" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Submitted
                          </span>
                        ) : sub.status === "LATE" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            Late Submission
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Student Modal Overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Edit Student Profile</h3>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Student name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Student email"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Update Password (Optional)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
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

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Student ID</label>
                <input
                  type="text"
                  required
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  placeholder="e.g. STU001"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700 text-slate-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-650"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Semester</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-600">Residential Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter full address details..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
              Are you sure you want to permanently delete the profile of <span className="font-bold text-slate-800">{student.user.name}</span>? 
              This action is permanent and will cascade to delete the corresponding authentication credentials and profile records.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
              <button
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
