const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const getGrade = (pct) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
};

const enterMark = async ({ studentId, subjectId, examId, marks }) => {
  // Fetch exam details to get totalMarks
  const exam = await prisma.exam.findUnique({
    where: { id: Number(examId) },
  });

  if (!exam) {
    throw new AppError("Exam not found", 404);
  }

  const numericMarks = Number(marks);
  if (numericMarks < 0 || numericMarks > exam.totalMarks) {
    throw new AppError(`Marks must be between 0 and the exam max marks (${exam.totalMarks})`, 400);
  }

  const percentage = Math.round((numericMarks / exam.totalMarks) * 100);
  const grade = getGrade(percentage);

  return prisma.mark.upsert({
    where: {
      studentId_subjectId_examId: {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        examId: Number(examId),
      },
    },
    update: {
      marks: numericMarks,
      percentage,
      grade,
    },
    create: {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      examId: Number(examId),
      marks: numericMarks,
      percentage,
      grade,
    },
  });
};

const getMarksByStudent = async (studentId) => {
  return prisma.mark.findMany({
    where: {
      studentId: Number(studentId),
    },
    include: {
      exam: true,
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      exam: {
        examDate: "desc",
      },
    },
  });
};

const getMarksByExam = async (examId) => {
  return prisma.mark.findMany({
    where: {
      examId: Number(examId),
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
};

const updateMark = async (id, { marks }) => {
  // Fetch existing mark to get examId
  const existingMark = await prisma.mark.findUnique({
    where: { id: Number(id) },
    include: { exam: true },
  });

  if (!existingMark) {
    throw new AppError("Mark record not found", 404);
  }

  const numericMarks = Number(marks);
  if (numericMarks < 0 || numericMarks > existingMark.exam.totalMarks) {
    throw new AppError(`Marks must be between 0 and the exam max marks (${existingMark.exam.totalMarks})`, 400);
  }

  const percentage = Math.round((numericMarks / existingMark.exam.totalMarks) * 100);
  const grade = getGrade(percentage);

  return prisma.mark.update({
    where: {
      id: Number(id),
    },
    data: {
      marks: numericMarks,
      percentage,
      grade,
    },
  });
};

const deleteMark = async (id) => {
  await prisma.mark.delete({
    where: {
      id: Number(id),
    },
  });
  return { message: "Mark record deleted successfully" };
};

module.exports = {
  enterMark,
  getMarksByStudent,
  getMarksByExam,
  updateMark,
  deleteMark,
};
