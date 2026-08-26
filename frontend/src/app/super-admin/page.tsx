"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/services/apiClient";

interface DashboardData {
  school: {
    id: number;
    name: string;
    slug: string;
    status: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    academicYear: string | null;
    workingDays: string | null;
    attendanceRules: string | null;
    createdAt: string;
  };
  stats: {
    students: number;
    teachers: number;
    administrators: number;
    classes: number;
    subjects: number;
    exams: number;
  };
  attendance: {
    today: number;
    totalCount: number;
    presentCount: number;
  };
  fees: {
    pending: number;
  };
  growth: Array<{ month: string; count: number }>;
  recentActivity: Array<{
    id: number;
    action: string;
    performedBy: string;
    role: string;
    details: string | null;
    createdAt: string;
  }>;
}

interface AdminProfile {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
    status: string;
    createdAt: string;
  };
}

export default function SuperAdminPage() {
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "admins"
    | "teachers"
    | "students"
    | "classes"
    | "subjects"
    | "timetable"
    | "assignments"
    | "attendance"
    | "exams"
    | "fees"
    | "reports"
    | "settings"
  >("overview");

  // Core Data States
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({
    systemName: "EduAI Institutional Control Center",
    maintenanceMode: "false",
    allowedDomains: "school.com,example.com",
  });

  // Selector reference data
  const [refData, setRefData] = useState<{
    courses: any[];
    teachers: any[];
    subjects: any[];
    departments: any[];
    exams: any[];
  }>({ courses: [], teachers: [], subjects: [], departments: [], exams: [] });

  // List Data States
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [feeStats, setFeeStats] = useState({ totalCollected: 0, totalOutstanding: 0, pendingStudentsCount: 0 });

  // Pagination & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active form toggles & payloads
  const [formMode, setFormMode] = useState<"list" | "create" | "edit" | "monitor" | "marks">("list");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form State Payloads
  const [adminPayload, setAdminPayload] = useState({ name: "", email: "", password: "" });
  
  const [teacherPayload, setTeacherPayload] = useState({
    name: "", email: "", password: "", status: "ACTIVE", departmentId: "", courseIds: [] as string[], subjectIds: [] as string[]
  });

  const [studentPayload, setStudentPayload] = useState({
    name: "", email: "", password: "", status: "ACTIVE", studentId: "", phone: "", dateOfBirth: "", gender: "MALE", address: "", semester: 1, courseId: "", parentName: "", parentEmail: ""
  });

  const [classPayload, setClassPayload] = useState({
    name: "", description: "", section: "A", capacity: 30, academicYear: "2026-2027", classTeacherId: "", departmentId: ""
  });

  const [subjectPayload, setSubjectPayload] = useState({
    name: "", code: "", sessions: 0, courseId: "", teacherId: "", departmentId: ""
  });

  const [timetablePayload, setTimetablePayload] = useState({
    day: "MONDAY", startTime: "09:00", endTime: "10:00", room: "", subjectId: "", teacherId: "", courseId: "", semester: 1
  });

  const [assignmentPayload, setAssignmentPayload] = useState({
    title: "", description: "", deadline: "", maxMarks: 100, subjectId: ""
  });

  const [examPayload, setExamPayload] = useState({
    name: "", semester: 1, examDate: "", totalMarks: 100, subjectId: ""
  });

  const [feePayload, setFeePayload] = useState({
    studentId: "", courseId: "", amount: 1000, dueDate: ""
  });

  // Attendance Sheet state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceSubject, setAttendanceSubject] = useState("");
  const [attendanceStudents, setAttendanceStudents] = useState<any[]>([]);
  const [attendanceMarked, setAttendanceMarked] = useState<Record<number, string>>({}); // studentId -> status

  // Exam Marks state
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examStudents, setExamStudents] = useState<any[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<number, number>>({}); // studentId -> mark

  // Assignment submissions monitor
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [gradingPayload, setGradingPayload] = useState({ marks: 0, feedback: "" });

  // Record Payment payload
  const [paymentFee, setPaymentFee] = useState<any>(null);
  const [paymentPayload, setPaymentPayload] = useState({ amount: 0, transactionId: "" });

  // Report tab states
  const [reportType, setReportType] = useState<"students" | "teachers" | "attendance" | "fees" | "exams" | "assignments">("students");
  const [reportClass, setReportClass] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportData, setReportData] = useState<any[]>([]);

  // School settings states
  const [schoolPayload, setSchoolPayload] = useState({
    name: "", logo: "", address: "", phone: "", email: "", academicYear: "2026-2027", workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday", attendanceRules: "85% Attendance Required"
  });
  const [ownerPayload, setOwnerPayload] = useState({
    name: "", email: "", password: "", confirmPassword: ""
  });

  // Functions to show Success/Error alerts
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };
  const flashError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  };

  // 1. Data loading helper
  const loadRefData = useCallback(async () => {
    try {
      const [coursesRes, teachersRes, subjectsRes, deptsRes, examsRes] = await Promise.all([
        request("/courses"),
        request("/teachers?limit=100"),
        request("/subjects"),
        request("/departments"),
        request("/exams"),
      ]);
      setRefData({
        courses: coursesRes.data || [],
        teachers: teachersRes.data.teachers || teachersRes.data || [],
        subjects: subjectsRes.data.subjects || subjectsRes.data || [],
        departments: deptsRes.data || [],
        exams: examsRes.data || [],
      });
    } catch (err) {
      console.error("Reference data loading failed", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // Primary dashboard stats
      const dashRes = await request("/superadmin/dashboard");
      setDashboard(dashRes.data);

      if (dashRes.data.school) {
        setSchoolPayload({
          name: dashRes.data.school.name || "",
          logo: dashRes.data.school.logo || "",
          address: dashRes.data.school.address || "",
          phone: dashRes.data.school.phone || "",
          email: dashRes.data.school.email || "",
          academicYear: dashRes.data.school.academicYear || "2026-2027",
          workingDays: dashRes.data.school.workingDays || "Monday,Tuesday,Wednesday,Thursday,Friday",
          attendanceRules: dashRes.data.school.attendanceRules || "85% Attendance Required",
        });
        setOwnerPayload({
          name: user?.name || "",
          email: user?.email || "",
          password: "",
          confirmPassword: ""
        });
      }

      // Tab specific views
      if (activeTab === "admins") {
        const adminsRes = await request("/superadmin/admins");
        setAdmins(adminsRes.data || []);
      } else if (activeTab === "teachers") {
        const res = await request(`/teachers?search=${searchQuery}&page=${currentPage}&limit=10`);
        setTeachers(res.data.teachers || []);
        setTotalPages(res.data.pages || 1);
      } else if (activeTab === "students") {
        const res = await request(`/students?search=${searchQuery}&courseId=${filterClass}&page=${currentPage}&limit=10`);
        setStudents(res.data.students || []);
        setTotalPages(res.data.pages || 1);
      } else if (activeTab === "classes") {
        const res = await request("/courses");
        setCourses(res.data || []);
      } else if (activeTab === "subjects") {
        const res = await request("/subjects");
        setSubjects(res.data.subjects || res.data || []);
      } else if (activeTab === "timetable") {
        const res = await request(`/timetable?courseId=${filterClass}`);
        setTimetables(res.data || []);
      } else if (activeTab === "assignments") {
        const res = await request("/assignments");
        setAssignments(res.data || []);
      } else if (activeTab === "exams") {
        const res = await request("/exams");
        setExams(res.data || []);
      } else if (activeTab === "fees") {
        const res = await request(`/fees?search=${searchQuery}&status=${filterStatus}&courseId=${filterClass}&page=${currentPage}&limit=10`);
        setFees(res.data.fees || []);
        setTotalPages(res.data.pages || 1);
        const statsRes = await request("/fees/stats");
        setFeeStats(statsRes.data);
      } else if (activeTab === "settings") {
        const settingsRes = await request("/superadmin/settings");
        setGlobalSettings(settingsRes.data || {});
      }
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Data fetch error occurred.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, filterClass, filterStatus, currentPage, user]);

  useEffect(() => {
    if (user && user.role === "SUPER_ADMIN") {
      loadData();
      if (activeTab !== "overview" && activeTab !== "admins") {
        loadRefData();
      }
    }
  }, [user, activeTab, loadData, loadRefData]);

  // Tab changes trigger reset of search queries & form states
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setFilterClass("");
    setFilterStatus("");
    setCurrentPage(1);
    setFormMode("list");
    setSelectedItem(null);
    setErrorMsg("");
    setSuccessMsg("");
    setIsSidebarOpen(false);
  };

  // CRUD Handler - Administrators
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request("/superadmin/admins", {
        method: "POST",
        body: JSON.stringify(adminPayload),
      });
      flashSuccess("Administrator account created!");
      setAdminPayload({ name: "", email: "", password: "" });
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to create administrator");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm("Are you sure you want to delete this administrator?")) return;
    try {
      setSubmitting(true);
      await request(`/superadmin/admins/${adminId}`, { method: "DELETE" });
      flashSuccess("Administrator deleted!");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to delete administrator");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Teachers
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (formMode === "create") {
        await request("/teachers", {
          method: "POST",
          body: JSON.stringify(teacherPayload),
        });
        flashSuccess("Teacher record added successfully!");
      } else {
        await request(`/teachers/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(teacherPayload),
        });
        flashSuccess("Teacher record updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Teacher action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeacherClick = (t: any) => {
    setSelectedItem(t);
    setTeacherPayload({
      name: t.user.name,
      email: t.user.email,
      password: "",
      status: t.user.status || "ACTIVE",
      departmentId: t.departmentId ? String(t.departmentId) : "",
      courseIds: t.courses.map((c: any) => String(c.id)),
      subjectIds: t.subjects.map((s: any) => String(s.id)),
    });
    setFormMode("edit");
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("Are you sure you want to delete this teacher? This will delete their login credentials.")) return;
    try {
      setSubmitting(true);
      await request(`/teachers/${id}`, { method: "DELETE" });
      flashSuccess("Teacher deleted.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Delete teacher failed");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Students
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (formMode === "create") {
        // Create student requires user details
        await request("/students", {
          method: "POST",
          body: JSON.stringify(studentPayload),
        });
        flashSuccess("Student record added successfully!");
      } else {
        await request(`/students/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(studentPayload),
        });
        flashSuccess("Student record updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Student action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudentClick = (s: any) => {
    setSelectedItem(s);
    setStudentPayload({
      name: s.user.name,
      email: s.user.email,
      password: "",
      status: s.user.status || "ACTIVE",
      studentId: s.studentId,
      phone: s.phone || "",
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split("T")[0] : "",
      gender: s.gender || "MALE",
      address: s.address || "",
      semester: s.semester || 1,
      courseId: s.courseId ? String(s.courseId) : "",
      parentName: s.parent?.user.name || "",
      parentEmail: s.parent?.user.email || "",
    });
    setFormMode("edit");
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      setSubmitting(true);
      await request(`/students/${id}`, { method: "DELETE" });
      flashSuccess("Student deleted successfully.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Delete student failed");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Classes (Courses)
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...classPayload,
        capacity: Number(classPayload.capacity),
        classTeacherId: classPayload.classTeacherId ? Number(classPayload.classTeacherId) : null,
        departmentId: classPayload.departmentId ? Number(classPayload.departmentId) : null,
      };

      if (formMode === "create") {
        await request("/courses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        flashSuccess("Class added successfully!");
      } else {
        await request(`/courses/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        flashSuccess("Class updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Class action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClassClick = (c: any) => {
    setSelectedItem(c);
    setClassPayload({
      name: c.name,
      description: c.description || "",
      section: c.section || "A",
      capacity: c.capacity || 30,
      academicYear: c.academicYear || "2026-2027",
      classTeacherId: c.classTeacherId ? String(c.classTeacherId) : "",
      departmentId: c.departmentId ? String(c.departmentId) : "",
    });
    setFormMode("edit");
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      setSubmitting(true);
      await request(`/courses/${id}`, { method: "DELETE" });
      flashSuccess("Class deleted.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Delete class failed");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Subjects
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...subjectPayload,
        sessions: Number(subjectPayload.sessions),
        courseId: subjectPayload.courseId ? Number(subjectPayload.courseId) : null,
        teacherId: subjectPayload.teacherId ? Number(subjectPayload.teacherId) : null,
      };

      if (formMode === "create") {
        await request("/subjects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        flashSuccess("Subject added successfully!");
      } else {
        await request(`/subjects/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        flashSuccess("Subject details updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Subject action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubjectClick = (s: any) => {
    setSelectedItem(s);
    setSubjectPayload({
      name: s.name,
      code: s.code,
      sessions: s.sessions || 0,
      courseId: s.courseId ? String(s.courseId) : "",
      teacherId: s.teacherId ? String(s.teacherId) : "",
      departmentId: s.course?.departmentId ? String(s.course.departmentId) : "",
    });
    setFormMode("edit");
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    try {
      setSubmitting(true);
      await request(`/subjects/${id}`, { method: "DELETE" });
      flashSuccess("Subject deleted.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Delete subject failed");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Timetable Slots
  const handleTimetableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...timetablePayload,
        subjectId: Number(timetablePayload.subjectId),
        teacherId: Number(timetablePayload.teacherId),
        courseId: Number(timetablePayload.courseId),
        semester: Number(timetablePayload.semester),
      };

      if (formMode === "create") {
        await request("/timetable", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        flashSuccess("Timetable slot scheduled successfully!");
      } else {
        await request(`/timetable/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        flashSuccess("Timetable entry scheduled!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Timetable assignment conflict");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTimetableClick = (slot: any) => {
    setSelectedItem(slot);
    setTimetablePayload({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      subjectId: String(slot.subjectId),
      teacherId: String(slot.teacherId),
      courseId: String(slot.courseId),
      semester: slot.semester || 1,
    });
    setFormMode("edit");
  };

  const handleDeleteTimetable = async (id: number) => {
    if (!confirm("Are you sure you want to delete this timetable entry?")) return;
    try {
      setSubmitting(true);
      await request(`/timetable/${id}`, { method: "DELETE" });
      flashSuccess("Timetable entry removed.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Timetable delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Handler - Assignments
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...assignmentPayload,
        maxMarks: Number(assignmentPayload.maxMarks),
        subjectId: Number(assignmentPayload.subjectId),
        deadline: new Date(assignmentPayload.deadline),
      };

      if (formMode === "create") {
        await request("/assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        flashSuccess("Assignment created and published successfully!");
      } else {
        await request(`/assignments/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        flashSuccess("Assignment details updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Assignment operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAssignmentClick = (a: any) => {
    setSelectedItem(a);
    setAssignmentPayload({
      title: a.title,
      description: a.description || "",
      deadline: a.deadline ? a.deadline.split(".")[0] : "", // datetime-local format support
      maxMarks: a.maxMarks || 100,
      subjectId: String(a.subjectId),
    });
    setFormMode("edit");
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      setSubmitting(true);
      await request(`/assignments/${id}`, { method: "DELETE" });
      flashSuccess("Assignment deleted successfully.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMonitorAssignment = async (a: any) => {
    setSelectedItem(a);
    setFormMode("monitor");
    setLoading(true);
    try {
      const res = await request(`/assignments/${a.id}/submissions`);
      setAssignmentSubmissions(res.data || []);
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradeModal = (sub: any) => {
    setGradingSubmission(sub);
    setGradingPayload({
      marks: sub.marks || 0,
      feedback: sub.feedback || ""
    });
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request(`/assignments/submissions/${gradingSubmission.id}`, {
        method: "PUT",
        body: JSON.stringify({
          marks: Number(gradingPayload.marks),
          feedback: gradingPayload.feedback
        })
      });
      flashSuccess("Submission graded successfully!");
      setGradingSubmission(null);
      // reload submissions
      const res = await request(`/assignments/${selectedItem.id}/submissions`);
      setAssignmentSubmissions(res.data || []);
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Grading failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Attendance marking functions
  const handleLoadAttendanceStudents = async () => {
    if (!attendanceClass || !attendanceSubject) {
      flashError("Please select Class and Subject first");
      return;
    }
    setLoading(true);
    try {
      const studRes = await request(`/students?courseId=${attendanceClass}&limit=100`);
      setAttendanceStudents(studRes.data.students || []);

      const recordsRes = await request(`/attendance?subjectId=${attendanceSubject}&date=${attendanceDate}&courseId=${attendanceClass}`);
      const mapping: Record<number, string> = {};
      
      // Default all loaded students to PRESENT
      (studRes.data.students || []).forEach((s: any) => {
        mapping[s.id] = "PRESENT";
      });
      
      // Override with recorded attendance statuses
      (recordsRes.data || []).forEach((r: any) => {
        mapping[r.studentId] = r.status;
      });

      setAttendanceMarked(mapping);
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId: number, status: string) => {
    setAttendanceMarked(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkAttendance = (status: "PRESENT" | "ABSENT" | "LATE") => {
    const updated = { ...attendanceMarked };
    attendanceStudents.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceMarked(updated);
  };

  const handleSaveAttendance = async () => {
    try {
      setSubmitting(true);
      const payload = Object.entries(attendanceMarked).map(([studentId, status]) => ({
        studentId: Number(studentId),
        subjectId: Number(attendanceSubject),
        date: attendanceDate,
        status,
      }));

      await request("/attendance", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      flashSuccess("Daily Attendance recorded successfully!");
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // Exam Marks management functions
  const handleLoadExamStudents = async (exam: any) => {
    setSelectedExam(exam);
    setFormMode("marks");
    setLoading(true);
    try {
      // Find subject of exam to get courseId (Class)
      const examDetails = await request(`/exams/${exam.id}`);
      const courseId = examDetails.data.subject.courseId;

      const [studRes, marksRes] = await Promise.all([
        request(`/students?courseId=${courseId}&limit=100`),
        request(`/marks/exam/${exam.id}`),
      ]);

      setExamStudents(studRes.data.students || []);

      const marksMap: Record<number, number> = {};
      (marksRes.data || []).forEach((m: any) => {
        marksMap[m.studentId] = m.marks;
      });
      setStudentMarks(marksMap);
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId: number, value: string) => {
    const val = parseFloat(value);
    setStudentMarks(prev => ({
      ...prev,
      [studentId]: isNaN(val) ? 0 : val
    }));
  };

  const handleSaveMarks = async () => {
    try {
      setSubmitting(true);
      // Loop over and upsert marks sequentially
      await Promise.all(
        Object.entries(studentMarks).map(([studentId, marks]) =>
          request("/marks", {
            method: "POST",
            body: JSON.stringify({
              studentId: Number(studentId),
              subjectId: selectedExam.subjectId,
              examId: selectedExam.id,
              marks,
            }),
          })
        )
      );

      flashSuccess("Exam Marks saved successfully!");
      setFormMode("list");
      setSelectedExam(null);
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to save marks");
    } finally {
      setSubmitting(false);
    }
  };

  // Fees CRUD
  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request("/fees", {
        method: "POST",
        body: JSON.stringify(feePayload),
      });
      flashSuccess("Fee structure allocated successfully!");
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to allocate fees");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFee = async (id: number) => {
    if (!confirm("Are you sure you want to delete this fee entry and payment records?")) return;
    try {
      setSubmitting(true);
      await request(`/fees/${id}`, { method: "DELETE" });
      flashSuccess("Fee entry deleted.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to delete fee");
    } finally {
      setSubmitting(false);
    }
  };

  // Recording single payment
  const handleOpenPaymentModal = (fee: any) => {
    setPaymentFee(fee);
    const alreadyPaid = fee.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const remaining = fee.amount - alreadyPaid;
    setPaymentPayload({
      amount: remaining > 0 ? remaining : 0,
      transactionId: `TX-${Date.now()}`
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request("/payments", {
        method: "POST",
        body: JSON.stringify({
          feeId: paymentFee.id,
          amount: Number(paymentPayload.amount),
          transactionId: paymentPayload.transactionId
        }),
      });
      flashSuccess("Payment recorded successfully!");
      setPaymentFee(null);
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Payment recording failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Exam CRUD
  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...examPayload,
        semester: Number(examPayload.semester),
        totalMarks: Number(examPayload.totalMarks),
        subjectId: Number(examPayload.subjectId),
        examDate: new Date(examPayload.examDate)
      };

      if (formMode === "create") {
        await request("/exams", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        flashSuccess("Examination entry created!");
      } else {
        await request(`/exams/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        flashSuccess("Examination details updated!");
      }
      setFormMode("list");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Exam operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExamClick = (ex: any) => {
    setSelectedItem(ex);
    setExamPayload({
      name: ex.name,
      semester: ex.semester || 1,
      examDate: ex.examDate ? ex.examDate.split("T")[0] : "",
      totalMarks: ex.totalMarks || 100,
      subjectId: String(ex.subjectId)
    });
    setFormMode("edit");
  };

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam entry?")) return;
    try {
      setSubmitting(true);
      await request(`/exams/${id}`, { method: "DELETE" });
      flashSuccess("Exam deleted.");
      loadData();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setSubmitting(false);
    }
  };

  // Reports fetching and CSV download
  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let endpoint = `/reports/${reportType}?`;
      if (reportClass) endpoint += `courseId=${reportClass}&`;
      if (reportStartDate) endpoint += `startDate=${reportStartDate}&`;
      if (reportEndDate) endpoint += `endDate=${reportEndDate}&`;
      const res = await request(endpoint);
      setReportData(res.data || []);
    } catch (err) {
      flashError("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = Object.keys(reportData[0]).join(",");
    const rows = reportData.map(row => 
      Object.values(row).map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${reportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Settings handles
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request("/superadmin/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: globalSettings }),
      });
      flashSuccess("System configuration settings updated!");
    } catch (err) {
      flashError("Failed to save global configurations");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await request("/superadmin/school", {
        method: "PUT",
        body: JSON.stringify(schoolPayload)
      });
      flashSuccess("School Profile details updated successfully!");
      loadData();
    } catch (err) {
      flashError("Failed to update school settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOwnerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPayload.password && ownerPayload.password !== ownerPayload.confirmPassword) {
      flashError("Passwords do not match");
      return;
    }
    try {
      setSubmitting(true);
      await request("/superadmin/owner", {
        method: "PUT",
        body: JSON.stringify({
          name: ownerPayload.name,
          email: ownerPayload.email,
          ...(ownerPayload.password ? { password: ownerPayload.password } : {})
        })
      });
      flashSuccess("Account profile updated successfully!");
      setOwnerPayload(prev => ({ ...prev, password: "", confirmPassword: "" }));
      loadData();
    } catch (err) {
      flashError("Failed to update account details");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && !dashboard)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading School Owner Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row print:bg-white print:text-black">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <span className="text-lg">🏫</span>
          </div>
          <div>
            <h1 className="font-extrabold text-xs text-white uppercase tracking-wider">
              {dashboard?.school.name || "School Owner"}
            </h1>
            <span className="text-[9px] font-bold text-indigo-400 block tracking-widest uppercase">
              Dashboard
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-205 ease-in-out print:hidden`}
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <span className="text-xl">🏫</span>
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wider uppercase truncate max-w-[130px]">
                {dashboard?.school.name || "SaaS Portal"}
              </h1>
              <span className="text-[10px] font-bold text-indigo-400 block tracking-widest uppercase">
                School Owner
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => handleTabChange("overview")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "overview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📊</span>
            <span>Overview</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            People
          </div>
          <button
            onClick={() => handleTabChange("admins")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "admins" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>🛡️</span>
            <span>Administrators</span>
          </button>
          <button
            onClick={() => handleTabChange("teachers")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "teachers" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>👥</span>
            <span>Teachers</span>
          </button>
          <button
            onClick={() => handleTabChange("students")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "students" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>🎓</span>
            <span>Students</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Academics
          </div>
          <button
            onClick={() => handleTabChange("classes")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "classes" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>🏫</span>
            <span>Classes</span>
          </button>
          <button
            onClick={() => handleTabChange("subjects")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "subjects" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📚</span>
            <span>Subjects</span>
          </button>
          <button
            onClick={() => handleTabChange("timetable")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "timetable" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📅</span>
            <span>Timetable</span>
          </button>
          <button
            onClick={() => handleTabChange("assignments")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "assignments" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📝</span>
            <span>Assignments</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Management
          </div>
          <button
            onClick={() => handleTabChange("attendance")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "attendance" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>✔</span>
            <span>Attendance</span>
          </button>
          <button
            onClick={() => handleTabChange("exams")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "exams" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📝</span>
            <span>Exams & Results</span>
          </button>
          <button
            onClick={() => handleTabChange("fees")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "fees" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>💳</span>
            <span>Fees & Payments</span>
          </button>

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            System
          </div>
          <button
            onClick={() => handleTabChange("reports")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "reports" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📈</span>
            <span>Reports</span>
          </button>
          <button
            onClick={() => handleTabChange("settings")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === "settings" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>⚙</span>
            <span>Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-2.5 bg-slate-950 border border-slate-800 hover:border-rose-500/30 hover:text-rose-400 text-xs font-bold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto print:p-0">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-900 print:hidden">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {dashboard?.school.name || "EduAI Institution"}
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-white capitalize mt-0.5">
                {activeTab === "overview" ? "Institution Overview" : activeTab === "exams" ? "Exams & Results" : activeTab === "fees" ? "Fees & Payments" : activeTab}
              </h2>
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase">
                  School Owner
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm">
                👤
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="p-4 bg-rose-900/30 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold print:hidden">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-semibold print:hidden">
              ✅ {successMsg}
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && dashboard && (
            <div className="space-y-6">
              
              {/* Welcome Alert */}
              <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Welcome back, {user.name}!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage system resources, configure settings, and inspect parameters for <strong>{dashboard.school.name}</strong>.
                  </p>
                </div>
                <span className="inline-flex px-3 py-1 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/30 uppercase">
                  {dashboard.school.status}
                </span>
              </div>

              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Students</span>
                    <span className="text-lg">🎓</span>
                  </div>
                  <div className="text-2xl font-extrabold text-white">{dashboard.stats.students}</div>
                  <p className="text-[10px] text-slate-500">Active enrollments</p>
                </div>
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teachers</span>
                    <span className="text-lg">👩‍🏫</span>
                  </div>
                  <div className="text-2xl font-extrabold text-white">{dashboard.stats.teachers}</div>
                  <p className="text-[10px] text-slate-500">Faculty members</p>
                </div>
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Admins</span>
                    <span className="text-lg">🛡️</span>
                  </div>
                  <div className="text-2xl font-extrabold text-white">{dashboard.stats.administrators}</div>
                  <p className="text-[10px] text-slate-500">Authorized control admins</p>
                </div>
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classes</span>
                    <span className="text-lg">🏫</span>
                  </div>
                  <div className="text-2xl font-extrabold text-white">{dashboard.stats.classes}</div>
                  <p className="text-[10px] text-slate-500">Academic classes</p>
                </div>
              </div>

              {/* Secondary KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Today&apos;s Attendance</span>
                  <div className="text-xl font-bold text-indigo-400">{dashboard.attendance.today}%</div>
                  <p className="text-[9px] text-slate-500">
                    {dashboard.attendance.presentCount} of {dashboard.attendance.totalCount} marked present
                  </p>
                </div>
                <div className="p-5 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Fees</span>
                  <div className="text-xl font-bold text-rose-400">
                    ${dashboard.fees.pending.toLocaleString()}
                  </div>
                  <p className="text-[9px] text-slate-500">Outstanding invoice sums</p>
                </div>
                <div className="p-5 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Upcoming Exams</span>
                  <div className="text-xl font-bold text-amber-400">{dashboard.stats.exams}</div>
                  <p className="text-[9px] text-slate-500">Exams scheduled this semester</p>
                </div>
                <div className="p-5 bg-slate-900/60 border border-slate-850 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Subjects</span>
                  <div className="text-xl font-bold text-emerald-400">{dashboard.stats.subjects}</div>
                  <p className="text-[9px] text-slate-500">Syllabus subject modules</p>
                </div>
              </div>

              {/* Graphs & Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Student Enrollment Growth
                  </h4>
                  <div className="h-48 w-full flex items-end justify-between pt-6 border-b border-l border-slate-800 px-2 relative">
                    <div className="absolute inset-0 pt-6 pl-2 pr-2">
                      <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,150 L50,140 L100,120 L150,110 L200,90 L250,80 L300,70 L350,60 L400,50 L450,40 L500,30 L500,150 Z"
                          fill="url(#chartGrad)"
                        />
                        <path
                          d="M0,150 L50,140 L100,120 L150,110 L200,90 L250,80 L300,70 L350,60 L400,50 L450,40 L500,30"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    {dashboard.growth.map((g, idx) => (
                      <div key={idx} className="flex flex-col items-center z-10">
                        <span className="text-[8px] text-slate-500">{g.count}</span>
                        <span className="text-[9px] text-slate-400 mt-2">{g.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile Summary Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    School Profile Summary
                  </h4>
                  <div className="divide-y divide-slate-800 text-xs">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">School Name</span>
                      <span className="font-semibold text-slate-200">{dashboard.school.name}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Slug ID</span>
                      <span className="font-mono text-slate-300">{dashboard.school.slug}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Current Status</span>
                      <span className="text-emerald-400 font-bold">{dashboard.school.status}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Total Users</span>
                      <span className="font-semibold text-slate-200">
                        {dashboard.stats.students + dashboard.stats.teachers + dashboard.stats.administrators}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Onboarded Date</span>
                      <span className="font-semibold text-slate-300">
                        {new Date(dashboard.school.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Recent School Activities
                </h4>
                <div className="space-y-3">
                  {dashboard.recentActivity.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-2"
                    >
                      <div>
                        <span className="inline-flex px-1.5 py-0.5 text-[8px] font-extrabold rounded bg-indigo-900/30 text-indigo-400 uppercase mr-2.5">
                          {log.role}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{log.action}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {dashboard.recentActivity.length === 0 && (
                    <p className="text-slate-500 text-xs italic text-center py-4">No recent activity logs.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRATORS */}
          {activeTab === "admins" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Create School Administrator Account</h3>
                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={adminPayload.name}
                    onChange={(e) => setAdminPayload({ ...adminPayload, name: e.target.value })}
                    placeholder="Full Name"
                    className="px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="email"
                    value={adminPayload.email}
                    onChange={(e) => setAdminPayload({ ...adminPayload, email: e.target.value })}
                    placeholder="Email Address"
                    className="px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="password"
                    value={adminPayload.password}
                    onChange={(e) => setAdminPayload({ ...adminPayload, password: e.target.value })}
                    placeholder="Security Password"
                    className="px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="md:col-span-3 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : "Add Administrator Account"}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Active Administrators</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Email Address</th>
                        <th className="pb-3">Registration Date</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {admins.map((admin) => (
                        <tr key={admin.id}>
                          <td className="py-3 font-bold text-slate-200">{admin.user.name}</td>
                          <td className="py-3 text-slate-450">{admin.user.email}</td>
                          <td className="py-3 text-slate-500">
                            {new Date(admin.user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              disabled={submitting}
                              className="px-3 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEACHERS */}
          {activeTab === "teachers" && (
            <div className="space-y-6">
              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="text-sm font-bold text-white">Faculty & Teachers</h3>
                    <button
                      onClick={() => {
                        setTeacherPayload({ name: "", email: "", password: "", status: "ACTIVE", departmentId: "", courseIds: [], subjectIds: [] });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Add New Teacher
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search teachers by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold"
                    >
                      Search
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Email Address</th>
                          <th className="pb-3">Department</th>
                          <th className="pb-3">Classes</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {teachers.map((t) => (
                          <tr key={t.id}>
                            <td className="py-3 font-bold text-slate-200">{t.user.name}</td>
                            <td className="py-3 text-slate-450">{t.user.email}</td>
                            <td className="py-3 text-slate-400">{t.department?.name || "Unassigned"}</td>
                            <td className="py-3 text-slate-400">
                              {t.courses.map((c: any) => c.name).join(", ") || "None"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                t.user.status === "ACTIVE" ? "bg-emerald-950 text-emerald-450 border border-emerald-900/30" : "bg-rose-950 text-rose-450 border border-rose-900/30"
                              }`}>
                                {t.user.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditTeacherClick(t)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {teachers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-6 italic">No teachers found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Add Teacher Profile" : "Edit Teacher Profile"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleTeacherSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Name</label>
                        <input
                          type="text"
                          value={teacherPayload.name}
                          onChange={(e) => setTeacherPayload({ ...teacherPayload, name: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                        <input
                          type="email"
                          value={teacherPayload.email}
                          onChange={(e) => setTeacherPayload({ ...teacherPayload, email: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      {formMode === "create" && (
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Login Password</label>
                          <input
                            type="password"
                            value={teacherPayload.password}
                            onChange={(e) => setTeacherPayload({ ...teacherPayload, password: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Status</label>
                        <select
                          value={teacherPayload.status}
                          onChange={(e) => setTeacherPayload({ ...teacherPayload, status: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Department</label>
                        <select
                          value={teacherPayload.departmentId}
                          onChange={(e) => setTeacherPayload({ ...teacherPayload, departmentId: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        >
                          <option value="">Select Department</option>
                          {refData.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Assign Classes</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850">
                        {refData.courses.map(c => {
                          const isChecked = teacherPayload.courseIds.includes(String(c.id));
                          return (
                            <label key={c.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTeacherPayload({
                                      ...teacherPayload,
                                      courseIds: [...teacherPayload.courseIds, String(c.id)]
                                    });
                                  } else {
                                    setTeacherPayload({
                                      ...teacherPayload,
                                      courseIds: teacherPayload.courseIds.filter(id => id !== String(c.id))
                                    });
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Assign Subjects</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850">
                        {refData.subjects.map(s => {
                          const isChecked = teacherPayload.subjectIds.includes(String(s.id));
                          return (
                            <label key={s.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTeacherPayload({
                                      ...teacherPayload,
                                      subjectIds: [...teacherPayload.subjectIds, String(s.id)]
                                    });
                                  } else {
                                    setTeacherPayload({
                                      ...teacherPayload,
                                      subjectIds: teacherPayload.subjectIds.filter(id => id !== String(s.id))
                                    });
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{s.name} ({s.code})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Save Teacher Profile"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STUDENTS */}
          {activeTab === "students" && (
            <div className="space-y-6">
              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="text-sm font-bold text-white">Student Body</h3>
                    <button
                      onClick={() => {
                        setStudentPayload({
                          name: "", email: "", password: "", status: "ACTIVE", studentId: `STU-${Date.now().toString().slice(-6)}`, phone: "", dateOfBirth: "", gender: "MALE", address: "", semester: 1, courseId: "", parentName: "", parentEmail: ""
                        });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Add New Student
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Search students by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                    />
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-400 focus:outline-none"
                    >
                      <option value="">All Classes</option>
                      {refData.courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold"
                    >
                      Search
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Student ID</th>
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Email Address</th>
                          <th className="pb-3">Class (Course)</th>
                          <th className="pb-3">Parent Info</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td className="py-3 font-mono font-bold text-slate-300">{s.studentId}</td>
                            <td className="py-3 font-bold text-slate-200">{s.user.name}</td>
                            <td className="py-3 text-slate-450">{s.user.email}</td>
                            <td className="py-3 text-slate-400">
                              {s.course ? `${s.course.name} (Sem ${s.semester})` : "Unassigned"}
                            </td>
                            <td className="py-3 text-slate-400">
                              {s.parent?.user.name ? `${s.parent.user.name} (${s.parent.user.email})` : "N/A"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                s.user.status === "ACTIVE" ? "bg-emerald-950 text-emerald-450 border border-emerald-900/30" : "bg-rose-950 text-rose-450 border border-rose-900/30"
                              }`}>
                                {s.user.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditStudentClick(s)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-500 py-6 italic">No students found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Add Student Record" : "Edit Student Profile"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Name</label>
                        <input
                          type="text"
                          value={studentPayload.name}
                          onChange={(e) => setStudentPayload({ ...studentPayload, name: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                        <input
                          type="email"
                          value={studentPayload.email}
                          onChange={(e) => setStudentPayload({ ...studentPayload, email: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      {formMode === "create" && (
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Security Password</label>
                          <input
                            type="password"
                            value={studentPayload.password}
                            onChange={(e) => setStudentPayload({ ...studentPayload, password: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Student ID (Unique per school)</label>
                        <input
                          type="text"
                          value={studentPayload.studentId}
                          onChange={(e) => setStudentPayload({ ...studentPayload, studentId: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Phone Number</label>
                        <input
                          type="text"
                          value={studentPayload.phone}
                          onChange={(e) => setStudentPayload({ ...studentPayload, phone: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Date of Birth</label>
                        <input
                          type="date"
                          value={studentPayload.dateOfBirth}
                          onChange={(e) => setStudentPayload({ ...studentPayload, dateOfBirth: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Gender</label>
                        <select
                          value={studentPayload.gender}
                          onChange={(e) => setStudentPayload({ ...studentPayload, gender: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Assign Class</label>
                        <select
                          value={studentPayload.courseId}
                          onChange={(e) => setStudentPayload({ ...studentPayload, courseId: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                          required
                        >
                          <option value="">Select Class</option>
                          {refData.courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name} (Section {c.section})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Semester</label>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={studentPayload.semester}
                          onChange={(e) => setStudentPayload({ ...studentPayload, semester: parseInt(e.target.value) || 1 })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Status</label>
                        <select
                          value={studentPayload.status}
                          onChange={(e) => setStudentPayload({ ...studentPayload, status: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Physical Address</label>
                      <textarea
                        value={studentPayload.address}
                        onChange={(e) => setStudentPayload({ ...studentPayload, address: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs h-16"
                      />
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Parent/Guardian Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Parent Full Name</label>
                          <input
                            type="text"
                            value={studentPayload.parentName}
                            onChange={(e) => setStudentPayload({ ...studentPayload, parentName: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Parent Email Address</label>
                          <input
                            type="email"
                            value={studentPayload.parentEmail}
                            onChange={(e) => setStudentPayload({ ...studentPayload, parentEmail: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Save Student Profile"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CLASSES */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Active Academic Classes</h3>
                    <button
                      onClick={() => {
                        setClassPayload({ name: "", description: "", section: "A", capacity: 30, academicYear: "2026-2027", classTeacherId: "", departmentId: "" });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Add New Class
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Class Name</th>
                          <th className="pb-3">Section</th>
                          <th className="pb-3">Class Teacher</th>
                          <th className="pb-3">Student Capacity</th>
                          <th className="pb-3">Academic Year</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {courses.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 font-bold text-slate-200">{c.name}</td>
                            <td className="py-3 text-slate-450">{c.section || "A"}</td>
                            <td className="py-3 text-slate-400">
                              {c.classTeacher ? c.classTeacher.user.name : "None assigned"}
                            </td>
                            <td className="py-3 text-slate-400">{c.capacity || 30}</td>
                            <td className="py-3 text-slate-450">{c.academicYear || "2026-2027"}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditClassClick(c)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteClass(c.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {courses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-6 italic">No classes found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Add Class" : "Edit Class"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleClassSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Class Name</label>
                      <input
                        type="text"
                        value={classPayload.name}
                        placeholder="e.g. Grade 10"
                        onChange={(e) => setClassPayload({ ...classPayload, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Section</label>
                      <input
                        type="text"
                        value={classPayload.section}
                        placeholder="e.g. A"
                        onChange={(e) => setClassPayload({ ...classPayload, section: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Student Capacity</label>
                      <input
                        type="number"
                        value={classPayload.capacity}
                        onChange={(e) => setClassPayload({ ...classPayload, capacity: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Academic Year</label>
                      <input
                        type="text"
                        value={classPayload.academicYear}
                        placeholder="e.g. 2026-2027"
                        onChange={(e) => setClassPayload({ ...classPayload, academicYear: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Department</label>
                      <select
                        value={classPayload.departmentId}
                        onChange={(e) => setClassPayload({ ...classPayload, departmentId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                      >
                        <option value="">Select Department (Optional)</option>
                        {refData.departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Class Teacher</label>
                      <select
                        value={classPayload.classTeacherId}
                        onChange={(e) => setClassPayload({ ...classPayload, classTeacherId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                      >
                        <option value="">Assign Class Teacher (Optional)</option>
                        {refData.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.user.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Description</label>
                      <input
                        type="text"
                        value={classPayload.description}
                        onChange={(e) => setClassPayload({ ...classPayload, description: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="md:col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Processing..." : "Save Class Details"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SUBJECTS */}
          {activeTab === "subjects" && (
            <div className="space-y-6">
              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Syllabus Subjects</h3>
                    <button
                      onClick={() => {
                        setSubjectPayload({ name: "", code: "", sessions: 0, courseId: "", teacherId: "", departmentId: "" });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Add New Subject
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Subject Name</th>
                          <th className="pb-3">Subject Code</th>
                          <th className="pb-3">Sessions (Weekly)</th>
                          <th className="pb-3">Class Assignment</th>
                          <th className="pb-3">Assigned Faculty</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {subjects.map((s) => (
                          <tr key={s.id}>
                            <td className="py-3 font-bold text-slate-200">{s.name}</td>
                            <td className="py-3 font-mono font-bold text-indigo-400">{s.code}</td>
                            <td className="py-3 text-slate-400">{s.sessions || 0}</td>
                            <td className="py-3 text-slate-400">{s.course?.name || "None"}</td>
                            <td className="py-3 text-slate-400">{s.teacher ? s.teacher.user.name : "None assigned"}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditSubjectClick(s)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(s.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {subjects.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-6 italic">No subjects found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Add Subject" : "Edit Subject Details"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleSubjectSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject Name</label>
                      <input
                        type="text"
                        value={subjectPayload.name}
                        placeholder="e.g. Mathematics"
                        onChange={(e) => setSubjectPayload({ ...subjectPayload, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject Code</label>
                      <input
                        type="text"
                        value={subjectPayload.code}
                        placeholder="e.g. MATH101"
                        onChange={(e) => setSubjectPayload({ ...subjectPayload, code: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Sessions Count</label>
                      <input
                        type="number"
                        value={subjectPayload.sessions}
                        onChange={(e) => setSubjectPayload({ ...subjectPayload, sessions: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Class Mapping</label>
                      <select
                        value={subjectPayload.courseId}
                        onChange={(e) => setSubjectPayload({ ...subjectPayload, courseId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                        required
                      >
                        <option value="">Select Class</option>
                        {refData.courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Faculty Member</label>
                      <select
                        value={subjectPayload.teacherId}
                        onChange={(e) => setSubjectPayload({ ...subjectPayload, teacherId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                      >
                        <option value="">Assign Teacher (Optional)</option>
                        {refData.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.user.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="md:col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Save Subject Details"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMETABLE */}
          {activeTab === "timetable" && (
            <div className="space-y-6">
              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="text-sm font-bold text-white">Class Timetables</h3>
                    <button
                      onClick={() => {
                        setTimetablePayload({ day: "MONDAY", startTime: "09:00", endTime: "10:00", room: "", subjectId: "", teacherId: "", courseId: "", semester: 1 });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Schedule New Slot
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400"
                    >
                      <option value="">Select Class / Course to View Timetable</option>
                      {refData.courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold"
                    >
                      Filter
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Day</th>
                          <th className="pb-3">Time Window</th>
                          <th className="pb-3">Subject</th>
                          <th className="pb-3">Classroom / Room</th>
                          <th className="pb-3">Teacher</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {timetables.map((slot) => (
                          <tr key={slot.id}>
                            <td className="py-3 font-bold text-indigo-400">{slot.day}</td>
                            <td className="py-3 text-slate-350">{slot.startTime} - {slot.endTime}</td>
                            <td className="py-3 font-bold text-slate-200">{slot.subject?.name}</td>
                            <td className="py-3 text-slate-400 font-mono">{slot.room}</td>
                            <td className="py-3 text-slate-400">{slot.teacher?.user.name}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleEditTimetableClick(slot)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTimetable(slot.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {timetables.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center text-slate-500 py-6 italic">No timetable entries. Please filter by class.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Schedule Class Time Slot" : "Edit Time Slot"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleTimetableSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Day of Week</label>
                      <select
                        value={timetablePayload.day}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, day: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        required
                      >
                        <option value="MONDAY">Monday</option>
                        <option value="TUESDAY">Tuesday</option>
                        <option value="WEDNESDAY">Wednesday</option>
                        <option value="THURSDAY">Thursday</option>
                        <option value="FRIDAY">Friday</option>
                        <option value="SATURDAY">Saturday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Classroom / Room Number</label>
                      <input
                        type="text"
                        value={timetablePayload.room}
                        placeholder="e.g. Lab 2"
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, room: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Start Time (HH:MM)</label>
                      <input
                        type="time"
                        value={timetablePayload.startTime}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, startTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">End Time (HH:MM)</label>
                      <input
                        type="time"
                        value={timetablePayload.endTime}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, endTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Course / Class Mapping</label>
                      <select
                        value={timetablePayload.courseId}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, courseId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                        required
                      >
                        <option value="">Select Class</option>
                        {refData.courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Semester</label>
                      <input
                        type="number"
                        min={1}
                        value={timetablePayload.semester}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, semester: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject</label>
                      <select
                        value={timetablePayload.subjectId}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, subjectId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                        required
                      >
                        <option value="">Select Subject</option>
                        {refData.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Teacher / Faculty</label>
                      <select
                        value={timetablePayload.teacherId}
                        onChange={(e) => setTimetablePayload({ ...timetablePayload, teacherId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                        required
                      >
                        <option value="">Select Teacher</option>
                        {refData.teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.user.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="md:col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Scheduling..." : "Schedule Time Slot"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ASSIGNMENTS */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {formMode === "list" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Active Assignments</h3>
                    <button
                      onClick={() => {
                        setAssignmentPayload({ title: "", description: "", deadline: "", maxMarks: 100, subjectId: "" });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Create Assignment
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Title</th>
                          <th className="pb-3">Subject / Class</th>
                          <th className="pb-3">Due Date</th>
                          <th className="pb-3">Max Marks</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {assignments.map((a) => (
                          <tr key={a.id}>
                            <td className="py-3 font-bold text-slate-200">{a.title}</td>
                            <td className="py-3 text-slate-400">
                              {a.subject?.name} ({a.subject?.course?.name || "N/A"})
                            </td>
                            <td className="py-3 text-slate-450">{new Date(a.deadline).toLocaleString()}</td>
                            <td className="py-3 text-slate-400 font-mono">{a.maxMarks}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleMonitorAssignment(a)}
                                className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900/30 text-indigo-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Monitor
                              </button>
                              <button
                                onClick={() => handleEditAssignmentClick(a)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {assignments.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-slate-500 py-6 italic">No assignments found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Create/Edit Assignment */}
              {(formMode === "create" || formMode === "edit") && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Create Academic Assignment" : "Edit Assignment Details"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Assignment Title</label>
                        <input
                          type="text"
                          value={assignmentPayload.title}
                          placeholder="e.g. Algebra Homework 3"
                          onChange={(e) => setAssignmentPayload({ ...assignmentPayload, title: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject Selection</label>
                        <select
                          value={assignmentPayload.subjectId}
                          onChange={(e) => setAssignmentPayload({ ...assignmentPayload, subjectId: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                          required
                        >
                          <option value="">Select Subject</option>
                          {refData.subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.course?.name})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Due Date & Time</label>
                        <input
                          type="datetime-local"
                          value={assignmentPayload.deadline}
                          onChange={(e) => setAssignmentPayload({ ...assignmentPayload, deadline: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Maximum Score Marks</label>
                        <input
                          type="number"
                          value={assignmentPayload.maxMarks}
                          onChange={(e) => setAssignmentPayload({ ...assignmentPayload, maxMarks: parseInt(e.target.value) || 100 })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Assignment Instructions / Description</label>
                      <textarea
                        value={assignmentPayload.description}
                        onChange={(e) => setAssignmentPayload({ ...assignmentPayload, description: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs h-24"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Publish Assignment"}
                    </button>
                  </form>
                </div>
              )}

              {/* Monitor Submissions */}
              {formMode === "monitor" && selectedItem && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white">Monitoring: {selectedItem.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Subject: {selectedItem.subject?.name}</p>
                    </div>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Back to Assignments List
                    </button>
                  </div>

                  {/* Submission Statistics Card */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-850 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Total Submissions</span>
                      <span className="text-lg font-bold text-indigo-400">{assignmentSubmissions.filter(s => s.status !== "PENDING").length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Graded Submissions</span>
                      <span className="text-lg font-bold text-emerald-450">{assignmentSubmissions.filter(s => s.status === "GRADED").length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Pending Evaluation</span>
                      <span className="text-lg font-bold text-amber-400">{assignmentSubmissions.filter(s => s.status === "SUBMITTED").length}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Submission Rate</span>
                      <span className="text-lg font-bold text-slate-200">
                        {assignmentSubmissions.length > 0 
                          ? `${Math.round((assignmentSubmissions.filter(s => s.status !== "PENDING").length / assignmentSubmissions.length) * 100)}%`
                          : "0%"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Grading Modal Overlay / Form */}
                  {gradingSubmission && (
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-white">Grading Submission for: {gradingSubmission.student?.user?.name}</h4>
                        <button onClick={() => setGradingSubmission(null)} className="text-[10px] text-rose-400">Close Form</button>
                      </div>
                      <form onSubmit={handleGradeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Marks Awarded (Max: {selectedItem.maxMarks})</label>
                          <input
                            type="number"
                            max={selectedItem.maxMarks}
                            value={gradingPayload.marks}
                            onChange={(e) => setGradingPayload({ ...gradingPayload, marks: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                            required
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Feedback / Remarks</label>
                            <input
                              type="text"
                              value={gradingPayload.feedback}
                              onChange={(e) => setGradingPayload({ ...gradingPayload, feedback: e.target.value })}
                              placeholder="Great work!"
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Submitted At</th>
                          <th className="pb-3">Score / Marks</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {assignmentSubmissions.map((sub) => (
                          <tr key={sub.id}>
                            <td className="py-3 font-bold text-slate-200">{sub.student?.user?.name}</td>
                            <td className="py-3 text-slate-450">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "Not Submitted"}
                            </td>
                            <td className="py-3 text-slate-350">
                              {sub.marks !== null ? `${sub.marks} / ${selectedItem.maxMarks}` : "N/A"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                sub.status === "GRADED" ? "bg-emerald-950 text-emerald-450 border border-emerald-900/30" : 
                                sub.status === "SUBMITTED" ? "bg-indigo-950 text-indigo-400 border border-indigo-900/30" : 
                                "bg-slate-950 text-slate-500 border border-slate-800"
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {sub.status !== "PENDING" && (
                                <button
                                  onClick={() => handleOpenGradeModal(sub)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Grade Submission
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {assignmentSubmissions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-slate-500 py-6 italic">No student submissions available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Daily Attendance Register</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Class / Course</label>
                    <select
                      value={attendanceClass}
                      onChange={(e) => setAttendanceClass(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                    >
                      <option value="">Select Class</option>
                      {refData.courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject</label>
                    <select
                      value={attendanceSubject}
                      onChange={(e) => setAttendanceSubject(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                    >
                      <option value="">Select Subject</option>
                      {refData.subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.course?.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleLoadAttendanceStudents}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Load Attendance Sheet
                    </button>
                  </div>
                </div>

                {attendanceStudents.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-900">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-white">Daily Attendance Record Table</h4>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleBulkAttendance("PRESENT")}
                          className="px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-900/30 text-emerald-400 text-[10px] font-bold rounded-lg"
                        >
                          Bulk Present
                        </button>
                        <button
                          onClick={() => handleBulkAttendance("ABSENT")}
                          className="px-3 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-900/30 text-rose-450 text-[10px] font-bold rounded-lg"
                        >
                          Bulk Absent
                        </button>
                        <button
                          onClick={() => handleBulkAttendance("LATE")}
                          className="px-3 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-900/30 text-amber-400 text-[10px] font-bold rounded-lg"
                        >
                          Bulk Late
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                            <th className="pb-3">Student Name</th>
                            <th className="pb-3">Student ID</th>
                            <th className="pb-3 text-right">Attendance Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {attendanceStudents.map((s) => {
                            const status = attendanceMarked[s.id] || "PRESENT";
                            return (
                              <tr key={s.id}>
                                <td className="py-3 font-bold text-slate-200">{s.user.name}</td>
                                <td className="py-3 font-mono text-slate-450">{s.studentId}</td>
                                <td className="py-3 text-right space-x-2">
                                  <button
                                    onClick={() => handleAttendanceChange(s.id, "PRESENT")}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                      status === "PRESENT" 
                                        ? "bg-emerald-600 border-emerald-500 text-white" 
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-200"
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleAttendanceChange(s.id, "ABSENT")}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                      status === "ABSENT" 
                                        ? "bg-rose-600 border-rose-500 text-white" 
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-200"
                                    }`}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    onClick={() => handleAttendanceChange(s.id, "LATE")}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                      status === "LATE" 
                                        ? "bg-amber-600 border-amber-550 text-white" 
                                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-200"
                                    }`}
                                  >
                                    Late
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleSaveAttendance}
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving Attendance Sheet..." : "Save Attendance Sheet"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 10: EXAMS & RESULTS */}
          {activeTab === "exams" && (
            <div className="space-y-6">
              {formMode === "list" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Examinations Schedule</h3>
                    <button
                      onClick={() => {
                        setExamPayload({ name: "", semester: 1, examDate: "", totalMarks: 100, subjectId: "" });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Create Exam Schedule
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Exam Name</th>
                          <th className="pb-3">Subject (Class)</th>
                          <th className="pb-3">Exam Date</th>
                          <th className="pb-3">Max Marks</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {exams.map((ex) => (
                          <tr key={ex.id}>
                            <td className="py-3 font-bold text-slate-200">{ex.name}</td>
                            <td className="py-3 text-slate-400">
                              {ex.subject?.name} ({ex.subject?.course?.name || "N/A"})
                            </td>
                            <td className="py-3 text-slate-450">{new Date(ex.examDate).toLocaleDateString()}</td>
                            <td className="py-3 text-slate-450 font-mono">{ex.totalMarks}</td>
                            <td className="py-3 text-right space-x-2">
                              <button
                                onClick={() => handleLoadExamStudents(ex)}
                                className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900/30 text-indigo-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Enter Marks
                              </button>
                              <button
                                onClick={() => handleEditExamClick(ex)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExam(ex.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {exams.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-slate-500 py-6 italic">No exams scheduled.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Create/Edit Exam */}
              {(formMode === "create" || formMode === "edit") && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {formMode === "create" ? "Add Exam Session" : "Edit Exam Session Details"}
                    </h3>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  <form onSubmit={handleExamSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Exam Name</label>
                      <input
                        type="text"
                        value={examPayload.name}
                        placeholder="e.g. Midterm Physics"
                        onChange={(e) => setExamPayload({ ...examPayload, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Subject Mapping</label>
                      <select
                        value={examPayload.subjectId}
                        onChange={(e) => setExamPayload({ ...examPayload, subjectId: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                        required
                      >
                        <option value="">Select Subject</option>
                        {refData.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.course?.name})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Exam Date</label>
                      <input
                        type="date"
                        value={examPayload.examDate}
                        onChange={(e) => setExamPayload({ ...examPayload, examDate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Maximum Marks Possible</label>
                      <input
                        type="number"
                        value={examPayload.totalMarks}
                        onChange={(e) => setExamPayload({ ...examPayload, totalMarks: parseInt(e.target.value) || 100 })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Semester</label>
                      <input
                        type="number"
                        min={1}
                        value={examPayload.semester}
                        onChange={(e) => setExamPayload({ ...examPayload, semester: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="md:col-span-2 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Save Exam Schedule"}
                    </button>
                  </form>
                </div>
              )}

              {/* Enter Marks panel */}
              {formMode === "marks" && selectedExam && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white">Record Marks: {selectedExam.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Maximum Marks: {selectedExam.totalMarks}</p>
                    </div>
                    <button
                      onClick={() => setFormMode("list")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Back to Exam List
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Student ID</th>
                          <th className="pb-3 text-right">Marks Input</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {examStudents.map((s) => (
                          <tr key={s.id}>
                            <td className="py-3 font-bold text-slate-200">{s.user.name}</td>
                            <td className="py-3 font-mono text-slate-450">{s.studentId}</td>
                            <td className="py-3 text-right">
                              <input
                                type="number"
                                max={selectedExam.totalMarks}
                                value={studentMarks[s.id] !== undefined ? studentMarks[s.id] : ""}
                                onChange={(e) => handleMarkChange(s.id, e.target.value)}
                                placeholder="0"
                                className="px-3 py-1.5 w-24 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleSaveMarks}
                    disabled={submitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving Marks..." : "Save Student Results"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 11: FEES & PAYMENTS */}
          {activeTab === "fees" && (
            <div className="space-y-6">
              
              {/* Fee stats widget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Collected</span>
                  <span className="text-2xl font-extrabold text-emerald-400">${feeStats.totalCollected.toLocaleString()}</span>
                </div>
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Outstanding Fees</span>
                  <span className="text-2xl font-extrabold text-rose-400">${feeStats.totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Students</span>
                  <span className="text-2xl font-extrabold text-amber-400">{feeStats.pendingStudentsCount}</span>
                </div>
              </div>

              {/* Record Payment overlay form */}
              {paymentFee && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Record Invoice Payment</h3>
                    <button onClick={() => setPaymentFee(null)} className="text-xs text-rose-400 hover:underline">Cancel</button>
                  </div>
                  <form onSubmit={handlePaymentSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Student Name</label>
                      <input
                        type="text"
                        value={paymentFee.student?.user?.name}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-400"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Transaction Reference ID</label>
                      <input
                        type="text"
                        value={paymentPayload.transactionId}
                        onChange={(e) => setPaymentPayload({ ...paymentPayload, transactionId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Amount to Pay</label>
                      <input
                        type="number"
                        value={paymentPayload.amount}
                        onChange={(e) => setPaymentPayload({ ...paymentPayload, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="md:col-span-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Recording..." : "Record Payment Transaction"}
                    </button>
                  </form>
                </div>
              )}

              {formMode === "list" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="text-sm font-bold text-white">Student Invoices & Fees</h3>
                    <button
                      onClick={() => {
                        setFeePayload({ studentId: "", courseId: "", amount: 1000, dueDate: "" });
                        setFormMode("create");
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + Assign Fee / Structure
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Search by student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-400"
                    >
                      <option value="">All Statuses</option>
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold"
                    >
                      Filter
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                          <th className="pb-3">Student</th>
                          <th className="pb-3">Class</th>
                          <th className="pb-3">Fee Amount</th>
                          <th className="pb-3">Unpaid Balance</th>
                          <th className="pb-3">Due Date</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {fees.map((f) => {
                          const totalPaid = f.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
                          const balance = f.amount - totalPaid;
                          return (
                            <tr key={f.id}>
                              <td className="py-3 font-bold text-slate-200">{f.student?.user?.name}</td>
                              <td className="py-3 text-slate-400">{f.student?.course?.name}</td>
                              <td className="py-3 text-slate-450 font-mono">${f.amount}</td>
                              <td className="py-3 text-rose-400 font-mono">${balance > 0 ? balance : 0}</td>
                              <td className="py-3 text-slate-500">{new Date(f.dueDate).toLocaleDateString()}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                  f.status === "PAID" ? "bg-emerald-950 text-emerald-450 border border-emerald-900/30" :
                                  f.status === "PARTIAL" ? "bg-amber-950 text-amber-450 border border-amber-900/30" :
                                  "bg-rose-950 text-rose-450 border border-rose-900/30"
                                }`}>
                                  {f.status}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-2">
                                {f.status !== "PAID" && (
                                  <button
                                    onClick={() => handleOpenPaymentModal(f)}
                                    className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/30 text-emerald-400 text-[10px] font-bold rounded-lg transition-colors"
                                  >
                                    Record Payment
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteFee(f.id)}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-900/20 text-rose-450 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {fees.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center text-slate-500 py-6 italic">No fees or invoices registered.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold rounded-xl"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Assign School Fee Structure</h3>
                    <button onClick={() => setFormMode("list")} className="text-xs text-indigo-400 hover:underline">Cancel</button>
                  </div>

                  <form onSubmit={handleFeeSubmit} className="space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <p className="text-[10px] text-slate-400 italic">Configure target. Assign fee structure to a single student OR bulk-assign to an entire class.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Option A: Assign to Class</label>
                          <select
                            value={feePayload.courseId}
                            onChange={(e) => setFeePayload({ ...feePayload, courseId: e.target.value, studentId: "" })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 animate-pulse"
                          >
                            <option value="">Select Class / Course</option>
                            {refData.courses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Option B: Assign to Student</label>
                          <select
                            value={feePayload.studentId}
                            onChange={(e) => setFeePayload({ ...feePayload, studentId: e.target.value, courseId: "" })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350"
                          >
                            <option value="">Select Individual Student</option>
                            {refData.teachers.length > 0 && (
                              // Use dynamically loaded student body for assignments. Let's fallback to student list 
                              students.map(s => (
                                <option key={s.id} value={s.id}>{s.user.name} ({s.studentId})</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Fee Amount ($)</label>
                        <input
                          type="number"
                          value={feePayload.amount}
                          onChange={(e) => setFeePayload({ ...feePayload, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Payment Due Date</label>
                        <input
                          type="date"
                          value={feePayload.dueDate}
                          onChange={(e) => setFeePayload({ ...feePayload, dueDate: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {submitting ? "Allocating..." : "Assign Fee Structure"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 12: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 print:hidden">
                <h3 className="text-sm font-bold text-white">Dynamic Reports Generator</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e: any) => setReportType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                    >
                      <option value="students">Student Report</option>
                      <option value="teachers">Teacher Report</option>
                      <option value="attendance">Attendance Report</option>
                      <option value="fees">Fee Report</option>
                      <option value="exams">Exam Report</option>
                      <option value="assignments">Assignment Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Class / Course</label>
                    <select
                      value={reportClass}
                      onChange={(e) => setReportClass(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-350"
                    >
                      <option value="">All Classes</option>
                      {refData.courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Start Date</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">End Date</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerateReport}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>

              {reportData.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 print:border-none print:bg-white">
                  <div className="flex justify-between items-center print:hidden">
                    <h3 className="text-sm font-bold text-white capitalize">{reportType} Report Output</h3>
                    <div className="space-x-2">
                      <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-xs font-bold rounded-xl"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl"
                      >
                        Print Report
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs print:text-black">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold print:border-black">
                          {Object.keys(reportData[0]).map((key, idx) => (
                            <th key={idx} className="pb-3 capitalize">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 print:divide-slate-300">
                        {reportData.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {Object.values(row).map((val: any, colIdx) => (
                              <td key={colIdx} className="py-3 text-slate-300 font-semibold print:text-black">
                                {typeof val === "string" && val.includes("T") && !isNaN(Date.parse(val))
                                  ? new Date(val).toLocaleDateString()
                                  : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 13: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              
              {/* School Profile Settings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">School Profile Configurations</h3>
                <form onSubmit={handleSaveSchoolSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        School Name
                      </label>
                      <input
                        type="text"
                        value={schoolPayload.name}
                        onChange={(e) => setSchoolPayload({ ...schoolPayload, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        School Logo URL
                      </label>
                      <input
                        type="text"
                        value={schoolPayload.logo}
                        onChange={(e) => setSchoolPayload({ ...schoolPayload, logo: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={schoolPayload.phone}
                        onChange={(e) => setSchoolPayload({ ...schoolPayload, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={schoolPayload.email}
                        onChange={(e) => setSchoolPayload({ ...schoolPayload, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      value={schoolPayload.address}
                      onChange={(e) => setSchoolPayload({ ...schoolPayload, address: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-slate-950 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Academic Term Configurations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Academic Year
                        </label>
                        <input
                          type="text"
                          value={schoolPayload.academicYear}
                          onChange={(e) => setSchoolPayload({ ...schoolPayload, academicYear: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Working Days
                        </label>
                        <input
                          type="text"
                          value={schoolPayload.workingDays}
                          onChange={(e) => setSchoolPayload({ ...schoolPayload, workingDays: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Attendance Rule / Threshold
                        </label>
                        <input
                          type="text"
                          value={schoolPayload.attendanceRules}
                          onChange={(e) => setSchoolPayload({ ...schoolPayload, attendanceRules: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save School Configurations"}
                  </button>
                </form>
              </div>

              {/* Owner account settings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Owner Account Settings</h3>
                <form onSubmit={handleSaveOwnerAccount} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Owner Name
                      </label>
                      <input
                        type="text"
                        value={ownerPayload.name}
                        onChange={(e) => setOwnerPayload({ ...ownerPayload, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Login Email Address
                      </label>
                      <input
                        type="email"
                        value={ownerPayload.email}
                        onChange={(e) => setOwnerPayload({ ...ownerPayload, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        New Password (Leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        value={ownerPayload.password}
                        onChange={(e) => setOwnerPayload({ ...ownerPayload, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={ownerPayload.confirmPassword}
                        onChange={(e) => setOwnerPayload({ ...ownerPayload, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving Account Profile..." : "Change Account Settings"}
                  </button>
                </form>
              </div>

              {/* Global configurations settings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Global Control Settings</h3>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Institution Portal Name
                    </label>
                    <input
                      type="text"
                      value={globalSettings.systemName || ""}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, systemName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Allowed Domains
                    </label>
                    <input
                      type="text"
                      value={globalSettings.allowedDomains || ""}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, allowedDomains: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
                      placeholder="e.g. school.com,example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      System Maintenance Mode
                    </label>
                    <select
                      value={globalSettings.maintenanceMode || "false"}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, maintenanceMode: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-300"
                    >
                      <option value="false">Active / Operational</option>
                      <option value="true">Under Maintenance</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Global Configurations"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
