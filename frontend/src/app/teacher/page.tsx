"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTimetable } from "@/services/timetableService";
import { getStudents } from "@/services/studentService";
import { markAttendance } from "@/services/attendanceService";

interface Subject {
  id: number;
  name: string;
  code: string;
  courseId?: number;
}

interface Course {
  id: number;
  name: string;
}

interface TimetableSlot {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: number;
  subject: Subject;
  course: Course;
}

interface Student {
  id: number;
  studentId: string;
  user: {
    name: string;
    email: string;
  };
}

interface Exam {
  id: number;
  name: string;
  semester: number;
  examDate: string;
  totalMarks: number;
  subjectId: number;
  subject: {
    id: number;
    name: string;
    code: string;
  };
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
  subjectId: number;
  subject: {
    id: number;
    name: string;
    code: string;
  };
}

interface Submission {
  id: number;
  studentId: number;
  submittedAt: string | null;
  marks: number | null;
  feedback: string | null;
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
  student: {
    user: {
      name: string;
      email: string;
    };
  };
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const toMins = (t: string) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const getTodayDayOfWeekString = () => {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return days[new Date().getDay()];
};

type Tab = "dashboard" | "subjects" | "timetable" | "attendance" | "exams" | "assignments" | "profile";

export default function TeacherDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sub-states
  const [activeSlot, setActiveSlot] = useState<TimetableSlot | null>(null);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  
  // Tab 2: My Subjects View Students Modal
  const [viewStudentsSubject, setViewStudentsSubject] = useState<Subject | null>(null);
  const [studentsForSubject, setStudentsForSubject] = useState<Student[]>([]);
  const [loadingSubjectStudents, setLoadingSubjectStudents] = useState(false);

  // Tab 4: Attendance State
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [attendanceStudents, setAttendanceStudents] = useState<Student[]>([]);
  const [loadingAttendanceStudents, setLoadingAttendanceStudents] = useState(false);
  const [attendanceStates, setAttendanceStates] = useState<Record<number, "PRESENT" | "ABSENT" | "LATE">>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Tab 5: Exams & Marks State
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examForm, setExamForm] = useState({ name: "", semester: 1, examDate: "", totalMarks: 100, subjectId: 0 });
  const [creatingExam, setCreatingExam] = useState(false);
  // Enter Marks states
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [gradingStudents, setGradingStudents] = useState<Student[]>([]);
  const [loadingGradingStudents, setLoadingGradingStudents] = useState(false);
  const [studentMarks, setStudentMarks] = useState<Record<number, string>>({}); // studentId -> marks string
  const [savingMarks, setSavingMarks] = useState(false);

  // Tab 6: Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", deadline: "", maxMarks: 100, subjectId: 0 });
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  // Grading Submissions states
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<number | null>(null);
  const [gradingMarks, setGradingMarks] = useState<string>("");
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [initialMarksCopy, setInitialMarksCopy] = useState<Record<number, string>>({});
  const [initialGradingMarks, setInitialGradingMarks] = useState<string>("");
  const [initialGradingFeedback, setInitialGradingFeedback] = useState<string>("");

  const handleCancelExamGrading = () => {
    const hasChanges = Object.keys(studentMarks).some(
      (key) => studentMarks[Number(key)] !== initialMarksCopy[Number(key)]
    );
    if (hasChanges) {
      if (window.confirm("Discard unsaved changes?")) {
        setGradingExam(null);
      }
    } else {
      setGradingExam(null);
    }
  };

  const handleCancelGradingSubmission = () => {
    const hasChanges = gradingMarks !== initialGradingMarks || gradingFeedback !== initialGradingFeedback;
    if (hasChanges) {
      if (window.confirm("Discard unsaved changes?")) {
        setGradingSubmissionId(null);
      }
    } else {
      setGradingSubmissionId(null);
    }
  };

  const handleCancelCreateExam = () => {
    const hasChanges = examForm.name !== "" || examForm.examDate !== "" || examForm.subjectId !== 0;
    if (hasChanges) {
      if (window.confirm("Discard unsaved changes?")) {
        setShowCreateExamModal(false);
      }
    } else {
      setShowCreateExamModal(false);
    }
  };

  const handleCancelCreateAssignment = () => {
    const hasChanges = assignmentForm.title !== "" || assignmentForm.description !== "" || assignmentForm.deadline !== "" || assignmentForm.subjectId !== 0;
    if (hasChanges) {
      if (window.confirm("Discard unsaved changes?")) {
        setShowCreateAssignmentModal(false);
      }
    } else {
      setShowCreateAssignmentModal(false);
    }
  };

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("eduai_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchProfileAndTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/me`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load teacher profile");
      }

      const profile = data.data;
      setTeacherProfile(profile);

      if (profile.teacher) {
        setSubjectsList(profile.teacher.subjects || []);
        setCoursesList(profile.teacher.courses || []);

        // Fetch timetable
        const ttRes = await getTimetable({ teacherId: profile.teacher.id });
        const slots = ttRes.data || [];
        setTimetableSlots(slots);

        // Determine active or upcoming class slot
        determineActiveSlot(slots);

        // Fetch teacher dashboard statistics
        const statsRes = await fetch(`${API_URL}/me/dashboard`, {
          headers: getHeaders(),
        });
        const statsData = await statsRes.json();
        if (statsRes.ok) {
          setDashboardStats(statsData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync error occurred");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (user) {
      fetchProfileAndTimetable();
    }
  }, [user, fetchProfileAndTimetable]);

  const determineActiveSlot = (slots: TimetableSlot[]) => {
    const today = getTodayDayOfWeekString();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const todaySlots = slots.filter((s) => s.day === today);

    // Find active slot
    const current = todaySlots.find((s) => {
      const start = toMins(s.startTime);
      const end = toMins(s.endTime);
      return nowMins >= start && nowMins <= end;
    });

    if (current) {
      setActiveSlot(current);
      return;
    }

    // Find next upcoming slot today
    const upcoming = todaySlots
      .filter((s) => toMins(s.startTime) > nowMins)
      .sort((a, b) => toMins(a.startTime) - toMins(b.startTime))[0];

    if (upcoming) {
      setActiveSlot(upcoming);
    } else {
      setActiveSlot(null);
    }
  };

  // --- Actions ---

  // Quick action from dashboard directly to attendance Tab prefilled
  const handleQuickAttendance = (slot: TimetableSlot) => {
    setSelectedSubjectId(slot.subject.id);
    setActiveTab("attendance");
    loadAttendanceStudentsForSubject(slot.subject.id);
  };

  // Load students for view modal
  const handleViewStudents = async (subject: Subject) => {
    if (!subject.courseId) return;
    try {
      setViewStudentsSubject(subject);
      setLoadingSubjectStudents(true);
      const res = await getStudents({ courseId: String(subject.courseId), limit: 100 });
      setStudentsForSubject(res.data.students || []);
    } catch (err) {
      alert("Failed to load students for this course");
    } finally {
      setLoadingSubjectStudents(false);
    }
  };

  // Tab 4: Fetch students for attendance marking
  const loadAttendanceStudentsForSubject = async (subjectId: number) => {
    const subject = subjectsList.find((s) => s.id === subjectId);
    if (!subject || !subject.courseId) {
      setAttendanceStudents([]);
      return;
    }

    try {
      setLoadingAttendanceStudents(true);
      const res = await getStudents({ courseId: String(subject.courseId), limit: 100 });
      const studentsList = res.data.students || [];
      setAttendanceStudents(studentsList);

      // Default state PRESENT
      const states: Record<number, "PRESENT" | "ABSENT" | "LATE"> = {};
      studentsList.forEach((s: Student) => {
        states[s.id] = "PRESENT";
      });
      setAttendanceStates(states);
    } catch (err) {
      alert("Failed to load student list for attendance");
    } finally {
      setLoadingAttendanceStudents(false);
    }
  };

  // Tab 4: Save Attendance Sheet
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || attendanceStudents.length === 0) return;

    try {
      setSavingAttendance(true);
      const records = attendanceStudents.map((s) => ({
        studentId: s.id,
        subjectId: selectedSubjectId,
        date: selectedDate,
        status: attendanceStates[s.id] || "PRESENT",
      }));

      await markAttendance(records);
      alert("Attendance saved successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Tab 5: Fetch Exams
  const fetchExams = useCallback(async () => {
    try {
      setLoadingExams(true);
      const res = await fetch(`${API_URL}/exams`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        // Teacher Security Check: Filter exams so the teacher only sees exams for the subjects they teach!
        const teacherSubjectIds = subjectsList.map((s) => s.id);
        const filtered = (data.data || []).filter((e: Exam) => teacherSubjectIds.includes(e.subjectId));
        setExams(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExams(false);
    }
  }, [getHeaders, subjectsList]);

  // Tab 6: Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      const res = await fetch(`${API_URL}/assignments`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        // Teacher Security Check: filter by assigned subjects
        const teacherSubjectIds = subjectsList.map((s) => s.id);
        const filtered = (data.data || []).filter((a: Assignment) => teacherSubjectIds.includes(a.subjectId));
        setAssignments(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssignments(false);
    }
  }, [getHeaders, subjectsList]);

  // Tab navigation trigger fetch calls
  useEffect(() => {
    if (activeTab === "exams") {
      fetchExams();
    } else if (activeTab === "assignments") {
      fetchAssignments();
    }
  }, [activeTab, fetchExams, fetchAssignments]);

  // Tab 5: Create Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.subjectId || !examForm.name || !examForm.examDate) {
      alert("Please fill all fields");
      return;
    }

    try {
      setCreatingExam(true);
      const res = await fetch(`${API_URL}/exams`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(examForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Exam created successfully!");
        setShowCreateExamModal(false);
        setExamForm({ name: "", semester: 1, examDate: "", totalMarks: 100, subjectId: 0 });
        fetchExams();
      } else {
        alert(data.message || "Failed to create exam");
      }
    } catch (err) {
      alert("Error occurred while creating exam");
    } finally {
      setCreatingExam(false);
    }
  };

  // Tab 5: Enter Marks triggers student list loading
  const handleOpenGradingExam = async (exam: Exam) => {
    const subject = subjectsList.find((s) => s.id === exam.subjectId);
    if (!subject || !subject.courseId) return;

    try {
      setGradingExam(exam);
      setLoadingGradingStudents(true);

      // Get enrolled students
      const studRes = await getStudents({ courseId: String(subject.courseId), limit: 100 });
      const students = studRes.data.students || [];
      setGradingStudents(students);

      // Get existing marks
      const marksRes = await fetch(`${API_URL}/marks/exam/${exam.id}`, {
        headers: getHeaders(),
      });
      const marksData = await marksRes.json();

      const initialMarks: Record<number, string> = {};
      if (marksRes.ok && marksData.data) {
        marksData.data.forEach((m: any) => {
          initialMarks[m.studentId] = String(m.marks);
        });
      }
      setStudentMarks(initialMarks);
      setInitialMarksCopy(initialMarks);
    } catch (err) {
      alert("Failed to load students/marks");
    } finally {
      setLoadingGradingStudents(false);
    }
  };

  // Tab 5: Save Student Marks batch loops
  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingExam) return;

    try {
      setSavingMarks(true);

      const promises = Object.entries(studentMarks)
        .filter(([_, value]) => value !== "")
        .map(([studentId, marksStr]) => {
          return fetch(`${API_URL}/marks`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              studentId: Number(studentId),
              subjectId: gradingExam.subjectId,
              examId: gradingExam.id,
              marks: Number(marksStr),
            }),
          });
        });

      await Promise.all(promises);
      alert("Marks saved successfully!");
      setGradingExam(null);
    } catch (err) {
      alert("Failed to save student marks");
    } finally {
      setSavingMarks(false);
    }
  };

  // Tab 6: Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.subjectId || !assignmentForm.title || !assignmentForm.deadline) {
      alert("Please fill all fields");
      return;
    }

    try {
      setCreatingAssignment(true);
      const res = await fetch(`${API_URL}/assignments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(assignmentForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Assignment created successfully!");
        setShowCreateAssignmentModal(false);
        setAssignmentForm({ title: "", description: "", deadline: "", maxMarks: 100, subjectId: 0 });
        fetchAssignments();
      } else {
        alert(data.message || "Failed to create assignment");
      }
    } catch (err) {
      alert("Error occurred while creating assignment");
    } finally {
      setCreatingAssignment(false);
    }
  };

  // Tab 6: View Submissions
  const handleOpenGradingAssignment = async (assignment: Assignment) => {
    try {
      setGradingAssignment(assignment);
      setLoadingSubmissions(true);

      const res = await fetch(`${API_URL}/assignments/${assignment.id}/submissions`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.data || []);
      }
    } catch (err) {
      alert("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Tab 6: Open grading input modal
  const handleStartGradingSubmission = (submission: Submission) => {
    setGradingSubmissionId(submission.id);
    const marksStr = submission.marks !== null ? String(submission.marks) : "";
    const feedbackStr = submission.feedback || "";
    setGradingMarks(marksStr);
    setGradingFeedback(feedbackStr);
    setInitialGradingMarks(marksStr);
    setInitialGradingFeedback(feedbackStr);
  };

  // Tab 6: Submit grading
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gradingSubmissionId === null || !gradingAssignment) return;

    try {
      setSavingGrade(true);
      const res = await fetch(`${API_URL}/assignments/submissions/${gradingSubmissionId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          marks: Number(gradingMarks),
          feedback: gradingFeedback,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Submission graded successfully!");
        setGradingSubmissionId(null);
        // Refresh submissions
        handleOpenGradingAssignment(gradingAssignment);
      } else {
        alert(data.message || "Failed to grade submission");
      }
    } catch (err) {
      alert("Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
  };

  // Main Loading
  if (authLoading || (loading && !teacherProfile)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Loading Faculty Portal...</div>
      </div>
    );
  }

  if (!user) return null;

  // Group timetable slots
  const groupedSlots = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = timetableSlots.filter((slot) => slot.day === day);
    return acc;
  }, {} as Record<string, TimetableSlot[]>);

  // Group classes count today
  const todayClassesCount = timetableSlots.filter((s) => s.day === getTodayDayOfWeekString()).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-350 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <span className="text-xl">👨‍🏫</span>
            </div>
            <span className="font-extrabold text-lg text-white tracking-wider">Teacher Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "subjects", label: "My Subjects", icon: "📚" },
            { id: "timetable", label: "My Timetable", icon: "🗓️" },
            { id: "attendance", label: "Attendance", icon: "👥" },
            { id: "exams", label: "Exams & Marks", icon: "📝" },
            { id: "assignments", label: "Assignments", icon: "📚" },
            { id: "profile", label: "My Profile", icon: "👤" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab);
                setGradingExam(null);
                setGradingAssignment(null);
              }}
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
            className="w-full py-3 border border-slate-855 hover:bg-slate-800 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {activeTab === "dashboard" ? `Good Morning, ${user.name} 👋` : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Department of {teacherProfile?.teacher?.department?.name || "General Studies"} • Faculty Operations Dashboard
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex md:hidden space-x-2">
              <button
                onClick={logout}
                className="px-3.5 py-2 border border-slate-200 text-slate-655 font-bold text-xs rounded-xl"
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

          {/* TAB CONTENT */}

          {/* 1. Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active slot Widget */}
                <div className="lg:col-span-2 p-8 bg-slate-900 border border-slate-855 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-550/10 rounded-full blur-3xl"></div>
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2.5 bg-indigo-650/40 text-indigo-400 border border-indigo-550/30 rounded-2xl">
                        <span className="text-xl">📅</span>
                      </div>
                      <h3 className="text-lg font-bold tracking-tight text-white">Active / Upcoming Class</h3>
                    </div>

                    {activeSlot ? (
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">{activeSlot.subject.name}</div>
                        <div className="text-sm text-slate-400 flex flex-wrap gap-x-4">
                          <span>🕒 {activeSlot.startTime} - {activeSlot.endTime}</span>
                          <span>📍 Room: {activeSlot.room}</span>
                          <span>🎓 Semester: {activeSlot.semester} • {activeSlot.course.name}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                        No classes are currently in session or scheduled for the remainder of today.
                      </p>
                    )}
                  </div>

                  {activeSlot && (
                    <div className="mt-6">
                      <button
                        onClick={() => handleQuickAttendance(activeSlot)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30"
                      >
                        📝 Mark Attendance
                      </button>
                    </div>
                  )}
                </div>

                {/* Metrics Stats Card */}
                <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Faculty Assignment Summary</h3>
                  <div className="divide-y divide-slate-100 text-sm">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">My Subjects</span>
                      <span className="font-extrabold text-slate-800">{subjectsList.length}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Today's Classes</span>
                      <span className="font-extrabold text-slate-800">{todayClassesCount}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Class Attendance Average</span>
                      <span className="font-extrabold text-indigo-650">{dashboardStats?.attendancePercentage ?? 100}%</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Pending Assignments</span>
                      <span className="font-extrabold text-slate-800">{dashboardStats?.pendingAssignmentsCount ?? 0}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-slate-500">Upcoming Exams</span>
                      <span className="font-extrabold text-slate-800">{dashboardStats?.upcomingExamsCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini timetable summary */}
              <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">My Timetable</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {DAYS_OF_WEEK.slice(0, 5).map((day) => {
                    const slots = groupedSlots[day] || [];
                    return (
                      <div key={day} className="space-y-2">
                        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">{day}</h4>
                        <div className="space-y-2 min-h-[140px] bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                          {slots.length === 0 ? (
                            <div className="text-[10px] text-slate-400 italic text-center pt-8">No classes</div>
                          ) : (
                            slots.map((s) => (
                              <div key={s.id} className="p-2.5 bg-white rounded-xl border border-slate-150 shadow-2xs space-y-1">
                                <div className="text-[9px] font-bold text-indigo-650">🕒 {s.startTime}</div>
                                <div className="text-xs font-bold text-slate-805 truncate" title={s.subject.name}>
                                  {s.subject.name}
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
            </div>
          )}

          {/* 2. My Subjects Tab */}
          {activeTab === "subjects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjectsList.length === 0 ? (
                <div className="col-span-full p-12 bg-white border border-slate-100 rounded-3xl text-center text-slate-400">
                  No subjects assigned to you in database.
                </div>
              ) : (
                subjectsList.map((subject) => (
                  <div key={subject.id} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase rounded-md">
                          {subject.code}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-805 mt-2">{subject.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Course Program ID: {subject.courseId || "N/A"}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                      <button
                        onClick={() => handleViewStudents(subject)}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        View Students
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. My Timetable Tab */}
          {activeTab === "timetable" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {DAYS_OF_WEEK.slice(0, 5).map((day) => {
                  const slots = groupedSlots[day] || [];
                  return (
                    <div key={day} className="space-y-4">
                      <h4 className="font-extrabold text-sm text-indigo-700 pb-2 border-b border-indigo-50 uppercase tracking-wider">
                        {day}
                      </h4>
                      <div className="space-y-3 min-h-[300px] bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        {slots.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center pt-24">No classes</div>
                        ) : (
                          slots.map((s) => (
                            <div key={s.id} className="p-4 bg-white rounded-xl border border-slate-155 shadow-2xs space-y-1.5">
                              <div className="text-[10px] font-bold text-indigo-600">🕒 {s.startTime} - {s.endTime}</div>
                              <div className="text-sm font-bold text-slate-800 truncate" title={s.subject.name}>
                                {s.subject.name}
                              </div>
                              <div className="text-[10px] text-slate-500">Room {s.room} • Sem {s.semester}</div>
                              <div className="text-[10px] text-slate-405 font-medium">{s.course.name}</div>
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

          {/* 4. Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Mark Attendance Sheet</h3>
              
              <form onSubmit={handleSaveAttendance} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSelectedSubjectId(val);
                        loadAttendanceStudentsForSubject(val);
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-650"
                      required
                    >
                      <option value={0}>-- Select Subject --</option>
                      {subjectsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-650"
                      required
                    />
                  </div>
                </div>

                {/* Students list */}
                {selectedSubjectId !== 0 && (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Enrolled Student List</h4>

                    {loadingAttendanceStudents ? (
                      <div className="text-center text-slate-400 py-12 animate-pulse">Loading students...</div>
                    ) : attendanceStudents.length === 0 ? (
                      <div className="text-center text-slate-400 py-12">No students registered in this course class.</div>
                    ) : (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              <th className="py-3 px-6">Roll / Student ID</th>
                              <th className="py-3 px-6">Name</th>
                              <th className="py-3 px-6 text-right">Status Toggle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {attendanceStudents.map((student) => (
                              <tr key={student.id} className="hover:bg-slate-50/50">
                                <td className="py-4 px-6 text-sm text-slate-700 font-bold">{student.studentId}</td>
                                <td className="py-4 px-6 text-sm">
                                  <div className="font-bold text-slate-850">{student.user.name}</div>
                                  <div className="text-[10px] text-slate-400">{student.user.email}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex justify-end space-x-2">
                                    {(["PRESENT", "ABSENT", "LATE"] as const).map((status) => (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                          setAttendanceStates((prev) => ({
                                            ...prev,
                                            [student.id]: status,
                                          }))
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          attendanceStates[student.id] === status
                                            ? status === "PRESENT"
                                              ? "bg-emerald-500 text-white"
                                              : status === "ABSENT"
                                              ? "bg-rose-500 text-white"
                                              : "bg-amber-500 text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                        }`}
                                      >
                                        {status === "PRESENT" ? "Present" : status === "ABSENT" ? "Absent" : "Late"}
                                      </button>
                                    ))}
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

                {selectedSubjectId !== 0 && attendanceStudents.length > 0 && (
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingAttendance}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {savingAttendance ? "Saving Sheet..." : "Save Attendance Sheet"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* 5. Exams & Marks Tab */}
          {activeTab === "exams" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {gradingExam === null ? (
                // Exams List
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <h3 className="text-lg font-bold text-slate-900">Exams Registry</h3>
                    <button
                      onClick={() => setShowCreateExamModal(true)}
                      className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      + Create Exam
                    </button>
                  </div>

                  {loadingExams ? (
                    <div className="text-center text-slate-400 py-12 animate-pulse">Syncing exams...</div>
                  ) : exams.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">No exams registered for your subjects.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {exams.map((exam) => (
                        <div key={exam.id} className="p-6 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{exam.subject.code}</span>
                              <span className="text-xs text-slate-450">Semester: {exam.semester}</span>
                            </div>
                            <h4 className="text-lg font-extrabold text-slate-805">{exam.name}</h4>
                            <p className="text-xs text-slate-500">Max Marks: {exam.totalMarks} • Date: {new Date(exam.examDate).toLocaleDateString()}</p>
                          </div>
                          <div className="pt-4 mt-4 border-t border-slate-200">
                            <button
                              onClick={() => handleOpenGradingExam(exam)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                            >
                              Enter Marks
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Grading Form Screen
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Grading Exam: {gradingExam.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Total Marks: {gradingExam.totalMarks}</p>
                    </div>
                    <button
                      onClick={handleCancelExamGrading}
                      className="px-3.5 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                    >
                      Back to list
                    </button>
                  </div>

                  <form onSubmit={handleSaveMarks} className="space-y-6">
                    {loadingGradingStudents ? (
                      <div className="text-center text-slate-400 py-12 animate-pulse">Syncing enrolled students...</div>
                    ) : gradingStudents.length === 0 ? (
                      <div className="text-center text-slate-400 py-12">No students enrolled in this course.</div>
                    ) : (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-450 border-b border-slate-100">
                              <th className="py-3 px-6">Roll ID</th>
                              <th className="py-3 px-6">Student Name</th>
                              <th className="py-3 px-6 text-right">Marks Input</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gradingStudents.map((student) => (
                              <tr key={student.id}>
                                <td className="py-4 px-6 text-sm text-slate-700 font-bold">{student.studentId}</td>
                                <td className="py-4 px-6 text-sm font-semibold text-slate-805">{student.user.name}</td>
                                <td className="py-4 px-6">
                                  <div className="flex justify-end items-center space-x-2">
                                    <input
                                      type="number"
                                      min={0}
                                      max={gradingExam.totalMarks}
                                      value={studentMarks[student.id] || ""}
                                      onChange={(e) =>
                                        setStudentMarks((prev) => ({
                                          ...prev,
                                          [student.id]: e.target.value,
                                        }))
                                      }
                                      className="px-3 py-1.5 bg-slate-50 border border-slate-250 focus:border-indigo-500 rounded-xl text-sm focus:outline-none w-28 text-center text-slate-805"
                                      placeholder={`/ ${gradingExam.totalMarks}`}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {gradingStudents.length > 0 && (
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          type="submit"
                          disabled={savingMarks}
                          className="px-6 py-3 bg-indigo-655 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {savingMarks ? "Saving grades..." : "Save Marks"}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          )}

          {/* 6. Assignments Tab */}
          {activeTab === "assignments" && (
            <div className="space-y-6">
              {gradingAssignment === null ? (
                // Assignments List
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <h3 className="text-lg font-bold text-slate-900">Assignments Registry</h3>
                    <button
                      onClick={() => setShowCreateAssignmentModal(true)}
                      className="px-4 py-2.5 bg-indigo-655 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      + Create Assignment
                    </button>
                  </div>

                  {loadingAssignments ? (
                    <div className="text-center text-slate-400 py-12 animate-pulse">Syncing assignments...</div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">No assignments registered for your subjects.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="p-6 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{assignment.subject.code}</span>
                              <span className="text-xs text-rose-600 font-semibold">Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-lg font-extrabold text-slate-805">{assignment.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">{assignment.description || "No description provided."}</p>
                            <p className="text-[11px] font-semibold text-slate-400">Max Score: {assignment.maxMarks} Marks</p>
                          </div>
                          <div className="pt-4 mt-4 border-t border-slate-200">
                            <button
                              onClick={() => handleOpenGradingAssignment(assignment)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                            >
                              View Submissions
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Submissions List Screen
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Submissions for: {gradingAssignment.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">Maximum Grade: {gradingAssignment.maxMarks} Marks</p>
                    </div>
                    <button
                      onClick={() => setGradingAssignment(null)}
                      className="px-3.5 py-2 border border-slate-250 text-slate-600 font-bold text-xs rounded-xl"
                    >
                      Back to list
                    </button>
                  </div>

                  {loadingSubmissions ? (
                    <div className="text-center text-slate-400 py-12 animate-pulse">Syncing submissions...</div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">No submissions recorded yet.</div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-450 border-b border-slate-100">
                            <th className="py-3 px-6">Student</th>
                            <th className="py-3 px-6">Submitted Date</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Marks</th>
                            <th className="py-3 px-6 text-right">Grade Submission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {submissions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50/20">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-805">{sub.student.user.name}</div>
                                <div className="text-[10px] text-slate-400">{sub.student.user.email}</div>
                              </td>
                              <td className="py-4 px-6 text-slate-500">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "N/A"}
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sub.status === "GRADED"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : sub.status === "SUBMITTED"
                                    ? "bg-indigo-50 text-indigo-705"
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-800">
                                {sub.marks !== null ? `${sub.marks} / ${gradingAssignment.maxMarks}` : `--- / ${gradingAssignment.maxMarks}`}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleStartGradingSubmission(sub)}
                                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Grade Work
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 7. My Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-6">
                <div className="p-5 bg-indigo-50 text-indigo-750 rounded-3xl text-3xl font-extrabold shadow-sm">
                  {teacherProfile.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">{teacherProfile.name}</h2>
                  <p className="text-sm text-slate-500 font-semibold mt-1">Faculty Account • Role: {teacherProfile.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Profile Info</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">{teacherProfile.email}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty ID</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">FAC_{teacherProfile.teacher?.id}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Department</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1 block">{teacherProfile.teacher?.department?.name || "General Studies"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-50">Assigned Subjects</h3>
                  <div className="space-y-3">
                    {subjectsList.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No assigned subjects.</p>
                    ) : (
                      subjectsList.map((s) => (
                        <div key={s.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-800">{s.name}</span>
                          <span className="text-xs text-indigo-705 bg-indigo-50 px-2 py-0.5 rounded">{s.code}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* --- View Students Modal --- */}
      {viewStudentsSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enrolled Students</h3>
                <p className="text-xs text-slate-500 mt-0.5">Subject: {viewStudentsSubject.name}</p>
              </div>
              <button onClick={() => setViewStudentsSubject(null)} className="text-slate-405 hover:text-slate-650 text-xl font-bold">✕</button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
              {loadingSubjectStudents ? (
                <div className="text-center text-slate-400 py-6 animate-pulse">Syncing student roster...</div>
              ) : studentsForSubject.length === 0 ? (
                <div className="text-center text-slate-450 py-6">No students enrolled in this course program.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {studentsForSubject.map((s) => (
                    <div key={s.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-805">{s.user.name}</div>
                        <div className="text-xs text-slate-400">{s.user.email}</div>
                      </div>
                      <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">{s.studentId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Create Exam Modal --- */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Create New Exam</h3>
              <button onClick={handleCancelCreateExam} className="text-slate-400 hover:text-slate-650 text-xl font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateExam} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Exam Title</label>
                <input
                  type="text"
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="e.g. Mid-Term Test, Final Exam"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={examForm.semester}
                    onChange={(e) => setExamForm({ ...examForm, semester: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Max Score</label>
                  <input
                    type="number"
                    min={1}
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Exam Date</label>
                <input
                  type="date"
                  value={examForm.examDate}
                  onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Course Subject</label>
                <select
                  value={examForm.subjectId}
                  onChange={(e) => setExamForm({ ...examForm, subjectId: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-700"
                  required
                >
                  <option value={0}>-- Select Subject --</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelCreateExam}
                  className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExam}
                  className="px-6 py-2.5 bg-indigo-655 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {creatingExam ? "Creating..." : "Create Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Create Assignment Modal --- */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Create New Assignment</h3>
              <button onClick={handleCancelCreateAssignment} className="text-slate-400 hover:text-slate-655 text-xl font-bold">✕</button>
            </div>
            
            <form onSubmit={handleCreateAssignment} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Assignment Title</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="e.g. Lab report 1, Homework sheet"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Description</label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  placeholder="Task instructions and guidelines..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Deadline</label>
                  <input
                    type="date"
                    value={assignmentForm.deadline}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Max Score</label>
                  <input
                    type="number"
                    min={1}
                    value={assignmentForm.maxMarks}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Course Subject</label>
                <select
                  value={assignmentForm.subjectId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700"
                  required
                >
                  <option value={0}>-- Select Subject --</option>
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelCreateAssignment}
                  className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssignment}
                  className="px-6 py-2.5 bg-indigo-655 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {creatingAssignment ? "Creating..." : "Create Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Grade Submission Modal --- */}
      {gradingSubmissionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Grade Assignment Submission</h3>
              <button onClick={handleCancelGradingSubmission} className="text-slate-400 hover:text-slate-655 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Score (Max: {gradingAssignment?.maxMarks})</label>
                <input
                  type="number"
                  min={0}
                  max={gradingAssignment?.maxMarks}
                  value={gradingMarks}
                  onChange={(e) => setGradingMarks(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-705"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-405 mb-1.5">Feedback</label>
                <textarea
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="e.g. Well researched work, good calculations..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-705"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelGradingSubmission}
                  className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {savingGrade ? "Submitting..." : "Save Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
