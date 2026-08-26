const prisma = require("../config/prisma");

const getStudentReport = async ({ courseId }) => {
  const where = {};
  if (courseId) {
    where.courseId = parseInt(courseId);
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
      course: true,
      parent: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return students.map(s => ({
    id: s.id,
    studentId: s.studentId,
    name: s.user.name,
    email: s.user.email,
    status: s.user.status,
    phone: s.phone || "N/A",
    gender: s.gender || "N/A",
    semester: s.semester,
    class: s.course ? s.course.name : "Unassigned",
    parentName: s.parent ? s.parent.user.name : "N/A",
    createdAt: s.user.createdAt,
  }));
};

const getTeacherReport = async ({ departmentId }) => {
  const where = {};
  if (departmentId) {
    where.departmentId = parseInt(departmentId);
  }

  const teachers = await prisma.teacher.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      },
      department: true,
      courses: true,
      subjects: true,
    },
    orderBy: { id: "asc" },
  });

  return teachers.map(t => ({
    id: t.id,
    name: t.user.name,
    email: t.user.email,
    status: t.user.status,
    department: t.department ? t.department.name : "Unassigned",
    classesCount: t.courses.length,
    subjects: t.subjects.map(s => s.name).join(", ") || "None",
    createdAt: t.user.createdAt,
  }));
};

const getAttendanceReport = async ({ courseId, startDate, endDate }) => {
  const where = {};

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (courseId) {
    where.student = {
      courseId: parseInt(courseId),
    };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      student: {
        include: {
          user: {
            select: { name: true },
          },
          course: true,
        },
      },
      subject: true,
    },
    orderBy: { date: "desc" },
  });

  return attendances.map(a => ({
    id: a.id,
    studentName: a.student.user.name,
    class: a.student.course ? a.student.course.name : "N/A",
    subject: a.subject.name,
    date: a.date,
    status: a.status,
  }));
};

const getFeeReport = async ({ courseId, startDate, endDate }) => {
  const where = {};

  if (startDate || endDate) {
    where.dueDate = {};
    if (startDate) where.dueDate.gte = new Date(startDate);
    if (endDate) where.dueDate.lte = new Date(endDate);
  }

  if (courseId) {
    where.student = {
      courseId: parseInt(courseId),
    };
  }

  const fees = await prisma.fee.findMany({
    where,
    include: {
      student: {
        include: {
          user: {
            select: { name: true },
          },
          course: true,
        },
      },
      payments: true,
    },
    orderBy: { dueDate: "desc" },
  });

  return fees.map(f => {
    const totalPaid = f.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = f.amount - totalPaid;
    return {
      id: f.id,
      studentName: f.student.user.name,
      class: f.student.course ? f.student.course.name : "N/A",
      amount: f.amount,
      dueDate: f.dueDate,
      status: f.status,
      paid: totalPaid,
      outstanding: outstanding > 0 ? outstanding : 0,
    };
  });
};

const getExamReport = async ({ courseId, examId }) => {
  const where = {};
  if (courseId) {
    where.exam = {
      subject: {
        courseId: parseInt(courseId),
      },
    };
  }
  if (examId) {
    where.examId = parseInt(examId);
  }

  const marks = await prisma.mark.findMany({
    where,
    include: {
      student: {
        include: {
          user: {
            select: { name: true },
          },
          course: true,
        },
      },
      exam: true,
      subject: true,
    },
    orderBy: { examId: "asc" },
  });

  return marks.map(m => ({
    id: m.id,
    studentName: m.student.user.name,
    class: m.student.course ? m.student.course.name : "N/A",
    examName: m.exam.name,
    subject: m.subject.name,
    score: m.marks,
    totalMarks: m.exam.totalMarks,
    percentage: m.percentage,
    grade: m.grade || "F",
    result: m.percentage >= 40 ? "PASS" : "FAIL", // passing mark is calculated dynamically
  }));
};

const getAssignmentReport = async ({ courseId, subjectId }) => {
  const where = {};
  if (courseId) {
    where.subject = {
      courseId: parseInt(courseId),
    };
  }
  if (subjectId) {
    where.subjectId = parseInt(subjectId);
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      subject: {
        include: {
          course: true,
        },
      },
      submissions: true,
    },
    orderBy: { id: "desc" },
  });

  return assignments.map(a => {
    const totalSubmissions = a.submissions.length;
    const gradedCount = a.submissions.filter(s => s.status === "GRADED").length;
    const averageScore = gradedCount > 0
      ? a.submissions.reduce((sum, s) => sum + (s.marks || 0), 0) / gradedCount
      : 0;

    return {
      id: a.id,
      title: a.title,
      subject: a.subject.name,
      class: a.subject.course ? a.subject.course.name : "N/A",
      deadline: a.deadline,
      submissionsCount: totalSubmissions,
      gradedCount,
      averageScore: Math.round(averageScore * 100) / 100,
    };
  });
};

module.exports = {
  getStudentReport,
  getTeacherReport,
  getAttendanceReport,
  getFeeReport,
  getExamReport,
  getAssignmentReport,
};
