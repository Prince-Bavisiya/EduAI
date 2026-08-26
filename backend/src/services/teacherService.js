const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const createTeacher = async ({ name, email, password, departmentId, courseIds = [], subjectIds = [] }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const teacher = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "TEACHER",
      },
    });

    return await tx.teacher.create({
      data: {
        userId: user.id,
        departmentId: departmentId ? parseInt(departmentId) : null,
        courses: {
          connect: courseIds.map((id) => ({ id: parseInt(id) })),
        },
        subjects: {
          connect: subjectIds.map((id) => ({ id: parseInt(id) })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        department: true,
        courses: true,
        subjects: true,
      },
    });
  });

  return teacher;
};

const getTeachers = async ({ page = 1, limit = 10, search = "", departmentId, courseId }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  if (departmentId) {
    where.departmentId = parseInt(departmentId);
  }

  if (courseId) {
    where.courses = {
      some: {
        id: parseInt(courseId),
      },
    };
  }

  const [teachers, total] = await prisma.$transaction([
    prisma.teacher.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        department: true,
        courses: true,
        subjects: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.teacher.count({ where }),
  ]);

  return {
    teachers,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / take),
  };
};

const getTeacherById = async (id) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      },
      department: true,
      courses: true,
      subjects: true,
    },
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  return teacher;
};

const updateTeacher = async (id, { name, email, password, status, departmentId, courseIds, subjectIds }) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: parseInt(id) },
    include: { user: true, courses: true, subjects: true },
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  const userUpdate = {};
  if (name) userUpdate.name = name;
  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== teacher.userId) {
      throw new AppError("An account with this email address already exists.", 409);
    }
    userUpdate.email = email;
  }
  if (password) {
    userUpdate.password = await bcrypt.hash(password, 12);
  }
  if (status !== undefined) {
    userUpdate.status = status;
  }

  const teacherUpdate = {};
  if (departmentId !== undefined) {
    teacherUpdate.departmentId = departmentId ? parseInt(departmentId) : null;
  }

  // Handle courses updates
  if (courseIds !== undefined) {
    teacherUpdate.courses = {
      disconnect: teacher.courses.map((c) => ({ id: c.id })),
      connect: courseIds.map((cid) => ({ id: parseInt(cid) })),
    };
  }

  // Handle subjects updates
  if (subjectIds !== undefined) {
    teacherUpdate.subjects = {
      disconnect: teacher.subjects.map((s) => ({ id: s.id })),
      connect: subjectIds.map((sid) => ({ id: parseInt(sid) })),
    };
  }

  return await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: userUpdate,
      });
    }

    return await tx.teacher.update({
      where: { id: parseInt(id) },
      data: teacherUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        department: true,
        courses: true,
        subjects: true,
      },
    });
  });
};

const deleteTeacher = async (id) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: parseInt(id) },
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404);
  }

  // Deleting user cascades to Teacher profile deletion
  await prisma.user.delete({
    where: { id: teacher.userId },
  });

  return { success: true, message: "Teacher deleted successfully" };
};

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
