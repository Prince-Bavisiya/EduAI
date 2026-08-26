const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const createSubject = async ({ name, code, courseId, teacherId, sessions }) => {
  const existingSubject = await prisma.subject.findUnique({
    where: { code },
  });

  if (existingSubject) {
    throw new AppError(`A subject with this code already exists.`, 409);
  }

  return await prisma.subject.create({
    data: {
      name,
      code,
      sessions: sessions ? parseInt(sessions) : 0,
      courseId: courseId ? parseInt(courseId) : null,
      teacherId: teacherId ? parseInt(teacherId) : null,
    },
    include: {
      course: true,
      teacher: {
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
  });
};

const getSubjects = async ({ page = 1, limit = 10, search = "", courseId, teacherId }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (courseId) {
    where.courseId = parseInt(courseId);
  }

  if (teacherId) {
    where.teacherId = parseInt(teacherId);
  }

  const [subjects, total] = await prisma.$transaction([
    prisma.subject.findMany({
      where,
      skip,
      take,
      include: {
        course: true,
        teacher: {
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
      orderBy: { id: "asc" },
    }),
    prisma.subject.count({ where }),
  ]);

  return {
    subjects,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / take),
  };
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id: parseInt(id) },
    include: {
      course: true,
      teacher: {
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
  });

  if (!subject) {
    throw new AppError("Subject not found", 404);
  }

  return subject;
};

const updateSubject = async (id, { name, code, courseId, teacherId, sessions }) => {
  const subject = await prisma.subject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!subject) {
    throw new AppError("Subject not found", 404);
  }

  if (code && code !== subject.code) {
    const existingSubject = await prisma.subject.findUnique({
      where: { code },
    });
    if (existingSubject) {
      throw new AppError(`A subject with this code already exists.`, 409);
    }
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (code !== undefined) data.code = code;
  if (sessions !== undefined) {
    data.sessions = sessions ? parseInt(sessions) : 0;
  }
  
  if (courseId !== undefined) {
    data.courseId = courseId ? parseInt(courseId) : null;
  }
  if (teacherId !== undefined) {
    data.teacherId = teacherId ? parseInt(teacherId) : null;
  }

  return await prisma.subject.update({
    where: { id: parseInt(id) },
    data,
    include: {
      course: true,
      teacher: {
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
  });
};

const deleteSubject = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!subject) {
    throw new AppError("Subject not found", 404);
  }

  await prisma.subject.delete({
    where: { id: parseInt(id) },
  });

  return { success: true, message: "Subject deleted successfully" };
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
