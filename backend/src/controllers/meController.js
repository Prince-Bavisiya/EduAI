const prisma = require("../config/prisma");
const attendanceService = require("../services/attendanceService");

// Helper to resolve studentId from userId
const getStudentFromUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
  });
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User session not found" });
    }

    if (user.role === "STUDENT") {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: req.user.userId },
        include: {
          course: {
            include: {
              department: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          student: studentProfile,
        },
      });
    }

    if (user.role === "TEACHER") {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: req.user.userId },
        include: {
          department: true,
          courses: true,
          subjects: true,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          teacher: teacherProfile,
        },
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAttendance = async (req, res) => {
  try {
    const student = await getStudentFromUserId(req.user.userId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Only student accounts have attendance records" });
    }

    const logs = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAttendanceStats = async (req, res) => {
  try {
    const student = await getStudentFromUserId(req.user.userId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Only student accounts have attendance stats" });
    }

    const stats = await attendanceService.calculateAttendancePercentage(student.id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMarks = async (req, res) => {
  try {
    const student = await getStudentFromUserId(req.user.userId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Only student accounts have exam marks" });
    }

    const marks = await prisma.mark.findMany({
      where: { studentId: student.id },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examDate: true,
            totalMarks: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { examId: "asc" },
    });

    res.status(200).json({ success: true, data: marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAssignments = async (req, res) => {
  try {
    const student = await getStudentFromUserId(req.user.userId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Only student accounts have classroom assignments" });
    }

    if (!student.courseId) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Load all assignments configured for subjects inside student's course
    const assignments = await prisma.assignment.findMany({
      where: {
        subject: {
          courseId: student.courseId,
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        submissions: {
          where: {
            studentId: student.id,
          },
          select: {
            id: true,
            status: true,
            marks: true,
            percentage: true,
            feedback: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { deadline: "asc" },
    });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFees = async (req, res) => {
  try {
    const student = await getStudentFromUserId(req.user.userId);
    if (!student) {
      return res.status(403).json({ success: false, message: "Only student accounts have fee records" });
    }

    const fees = await prisma.fee.findMany({
      where: { studentId: student.id },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            transactionId: true,
            paymentDate: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    res.status(200).json({ success: true, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { role, userId } = req.user;

    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [studentsCount, teachersCount, classesCount, examsCount, attendanceLogs] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.course.count(),
        prisma.exam.count({ where: { examDate: { gte: new Date() } } }),
        prisma.attendance.findMany({
          where: {
            date: {
              gte: startOfToday,
              lte: endOfToday,
            }
          },
          select: { status: true },
        }),
      ]);

      const totalToday = attendanceLogs.length;
      const presentToday = attendanceLogs.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const attendancePercentage = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 100;

      return res.status(200).json({
        success: true,
        data: {
          studentsCount,
          teachersCount,
          classesCount,
          attendancePercentage,
          upcomingExamsCount: examsCount,
        },
      });
    }

    if (role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: { subjects: true },
      });

      if (!teacher) {
        return res.status(404).json({ success: false, message: "Teacher profile not found" });
      }

      const subjectIds = teacher.subjects.map(s => s.id);

      const [timetableSlots, examsCount, assignmentsCount] = await Promise.all([
        prisma.timetable.findMany({
          where: { teacherId: teacher.id },
          include: { subject: true, course: true },
        }),
        prisma.exam.count({
          where: { subjectId: { in: subjectIds }, examDate: { gte: new Date() } },
        }),
        prisma.assignment.count({
          where: { subjectId: { in: subjectIds }, deadline: { gte: new Date() } },
        }),
      ]);

      const attendanceLogs = await prisma.attendance.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { status: true },
      });
      const total = attendanceLogs.length;
      const present = attendanceLogs.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
      const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 100;

      return res.status(200).json({
        success: true,
        data: {
          timetableSlots,
          attendancePercentage,
          pendingAssignmentsCount: assignmentsCount,
          upcomingExamsCount: examsCount,
        },
      });
    }

    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (!student) {
        return res.status(404).json({ success: false, message: "Student profile not found" });
      }

      const [attStats, marks, assignmentsCount, examsCount] = await Promise.all([
        attendanceService.calculateAttendancePercentage(student.id),
        prisma.mark.findMany({ 
          where: { studentId: student.id },
          include: { exam: true }
        }),
        prisma.assignment.count({
          where: {
            subject: { courseId: student.courseId },
            deadline: { gte: new Date() },
            submissions: { none: { studentId: student.id } },
          },
        }),
        prisma.exam.count({
          where: {
            subject: { courseId: student.courseId },
            examDate: { gte: new Date() },
          },
        }),
      ]);

      const overallAttendance = attStats?.overallAttendance ?? 100;
      const totalPercentage = marks.reduce((sum, m) => sum + (m.marks / (m.exam?.totalMarks || 100)) * 100, 0);
      const examAvg = marks.length > 0 ? Math.round(totalPercentage / marks.length) : 0;

      return res.status(200).json({
        success: true,
        data: {
          attendancePercent: overallAttendance,
          examAvg,
          pendingAssignmentsCount: assignmentsCount,
          upcomingExamsCount: examsCount,
        },
      });
    }

    res.status(400).json({ success: false, message: "Invalid user role for dashboard retrieval" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  getAttendance,
  getAttendanceStats,
  getMarks,
  getAssignments,
  getFees,
  getDashboard,
};
