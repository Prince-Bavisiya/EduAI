const prisma = require("../config/prisma");

const createExam = async ({ name, semester, examDate, totalMarks, subjectId }) => {
  return prisma.exam.create({
    data: {
      name,
      semester: Number(semester),
      examDate: new Date(examDate),
      totalMarks: Number(totalMarks),
      subjectId: Number(subjectId),
    },
    include: {
      subject: true,
    },
  });
};

const getExams = async ({ subjectId } = {}) => {
  const where = {};
  if (subjectId) {
    where.subjectId = Number(subjectId);
  }
  return prisma.exam.findMany({
    where,
    orderBy: {
      examDate: "desc",
    },
    include: {
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          marks: true,
        },
      },
    },
  });
};

const getExamById = async (id) => {
  return prisma.exam.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      subject: true,
      marks: {
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
        },
      },
    },
  });
};

const updateExam = async (id, { name, semester, examDate, totalMarks, subjectId }) => {
  const data = {};
  if (name) data.name = name;
  if (semester !== undefined) data.semester = Number(semester);
  if (examDate) data.examDate = new Date(examDate);
  if (totalMarks !== undefined) data.totalMarks = Number(totalMarks);
  if (subjectId !== undefined) data.subjectId = Number(subjectId);

  return prisma.exam.update({
    where: {
      id: Number(id),
    },
    data,
    include: {
      subject: true,
    },
  });
};

const deleteExam = async (id) => {
  await prisma.exam.delete({
    where: {
      id: Number(id),
    },
  });
  return { message: "Exam deleted successfully" };
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
};
