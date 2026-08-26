"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudents } from "@/services/studentService";
import { getExamById, enterMark, updateMark } from "@/services/examService";
import BackButton from "@/components/navigation/BackButton";

interface Student {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Mark {
  id: number;
  studentId: number;
  marks: number;
  percentage: number;
  grade: string | null;
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
    courseId: number | null;
  };
  marks: Mark[];
}

export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params.id);

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Grading form state
  const [gradingStudent, setGradingStudent] = useState<Student | null>(null);
  const [existingMarkId, setExistingMarkId] = useState<number | null>(null);
  const [marksInput, setMarksInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExamDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch Exam metadata & registered marks
      const examRes = await getExamById(examId);
      const examData = examRes.data as Exam;
      setExam(examData);

      // 2. Fetch all course students
      if (examData.subject.courseId) {
        const studentRes = await getStudents({
          courseId: String(examData.subject.courseId),
          limit: 100,
        });
        setStudents(studentRes.data?.students || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exam details");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      loadExamDetails();
    }
  }, [examId, loadExamDetails]);

  const handleOpenGradeForm = (student: Student, existingMark?: Mark) => {
    setGradingStudent(student);
    if (existingMark) {
      setExistingMarkId(existingMark.id);
      setMarksInput(String(existingMark.marks));
    } else {
      setExistingMarkId(null);
      setMarksInput("");
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingStudent || !exam) return;

    const numericMarks = Number(marksInput);
    if (numericMarks < 0 || numericMarks > exam.totalMarks) {
      alert(`Score must be between 0 and maximum marks (${exam.totalMarks})`);
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (existingMarkId) {
        // Update existing record
        await updateMark(existingMarkId, numericMarks);
      } else {
        // Create new record
        await enterMark({
          studentId: gradingStudent.id,
          subjectId: exam.subjectId,
          examId: exam.id,
          marks: numericMarks,
        });
      }

      setSuccessMsg(`Score saved successfully for ${gradingStudent.user.name}`);
      setGradingStudent(null);
      loadExamDetails(); // Refresh list to get new percentages/grades
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log score");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 font-medium animate-pulse">Loading exam configuration...</div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-slate-50 p-12">
        <div className="max-w-md mx-auto bg-white p-8 border border-slate-100 rounded-3xl text-center shadow-sm">
          <div className="text-rose-500 font-bold">Error Loading Exam</div>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => router.push("/admin/exams")}
            className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div>
            <BackButton fallbackRoute="/admin/exams" label="Back to Exams" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2">{exam.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Subject: {exam.subject.name} ({exam.subject.code}) • Semester {exam.semester}
            </p>
          </div>
          <div className="mt-4 md:mt-0 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Total Marks</span>
            <span className="text-2xl font-extrabold text-indigo-700 mt-0.5 block">{exam.totalMarks}</span>
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

        {/* Student Marks List */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900">Enrolled Student Results</h3>
          </div>

          {students.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              No students enrolled in this exam's course program.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-4 px-8">Student</th>
                    <th className="py-4 px-8">Marks Obtained</th>
                    <th className="py-4 px-8">Percentage</th>
                    <th className="py-4 px-8">Grade</th>
                    <th className="py-4 px-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const studentMark = exam.marks.find((m) => m.studentId === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-5 px-8">
                          <div className="font-bold text-slate-900 text-sm">{student.user.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{student.user.email}</div>
                        </td>
                        <td className="py-5 px-8 text-sm font-semibold text-slate-700">
                          {studentMark ? `${studentMark.marks} / ${exam.totalMarks}` : `-- / ${exam.totalMarks}`}
                        </td>
                        <td className="py-5 px-8 text-sm text-slate-650 font-bold">
                          {studentMark ? `${studentMark.percentage}%` : "--"}
                        </td>
                        <td className="py-5 px-8">
                          {studentMark ? (
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${
                              studentMark.grade === "F"
                                ? "bg-rose-50 border-rose-100 text-rose-700"
                                : "bg-emerald-50 border-emerald-100 text-emerald-700"
                            }`}>
                              Grade {studentMark.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Ungraded</span>
                          )}
                        </td>
                        <td className="py-5 px-8 text-right">
                          <button
                            onClick={() => handleOpenGradeForm(student, studentMark)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-indigo-100"
                          >
                            {studentMark ? "Update Marks" : "Log Marks"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enter Marks Dialog Modal */}
        {gradingStudent && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h4 className="font-extrabold text-slate-900 text-lg">
                  Log Score: {gradingStudent.user.name}
                </h4>
                <button
                  onClick={() => setGradingStudent(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Marks Obtained (Max: {exam.totalMarks})
                  </label>
                  <input
                    type="number"
                    value={marksInput}
                    onChange={(e) => setMarksInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter marks value..."
                    min={0}
                    max={exam.totalMarks}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setGradingStudent(null)}
                    className="px-5 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-indigo-700 active:scale-98 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Score"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
