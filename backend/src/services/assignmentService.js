const prisma = require("../config/prisma");

const createAssignment = async ({ title, description, deadline, maxMarks, subjectId }) => {
  return prisma.assignment.create({
    data: {
      title,
      description,
      deadline: new Date(deadline),
      maxMarks: Number(maxMarks),
      subjectId: Number(subjectId),
    },
    include: {
      subject: true,
    },
  });
};

const getAssignments = async ({ subjectId } = {}) => {
  const where = {};
  if (subjectId) {
    where.subjectId = Number(subjectId);
  }
  return prisma.assignment.findMany({
    where,
    orderBy: {
      deadline: "asc",
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
          submissions: true,
        },
      },
    },
  });
};

const getAssignmentById = async (id) => {
  return prisma.assignment.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      subject: true,
      submissions: {
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

const updateAssignment = async (id, { title, description, deadline, maxMarks, subjectId }) => {
  const data = {};
  if (title) data.title = title;
  if (description !== undefined) data.description = description;
  if (deadline) data.deadline = new Date(deadline);
  if (maxMarks !== undefined) data.maxMarks = Number(maxMarks);
  if (subjectId !== undefined) data.subjectId = Number(subjectId);

  return prisma.assignment.update({
    where: {
      id: Number(id),
    },
    data,
    include: {
      subject: true,
    },
  });
};

const deleteAssignment = async (id) => {
  await prisma.assignment.delete({
    where: {
      id: Number(id),
    },
  });
  return { message: "Assignment deleted successfully" };
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
};
