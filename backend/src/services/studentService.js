const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const createStudent = async ({ name, email, password, studentId, phone, dateOfBirth, gender, address, semester, courseId, parentId }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    return await tx.student.create({
      data: {
        userId: user.id,
        studentId,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        semester: semester ? parseInt(semester) : 1,
        courseId: courseId ? parseInt(courseId) : null,
        parentId: parentId ? parseInt(parentId) : null,
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
        course: true,
      },
    });
  });

  return student;
};

const getStudents = async ({ page = 1, limit = 10, search = "", courseId, departmentId }) => {
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

  if (courseId) {
    where.courseId = parseInt(courseId);
  }

  if (departmentId) {
    where.course = {
      departmentId: parseInt(departmentId),
    };
  }

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
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
        course: {
          include: {
            department: true,
          },
        },
        parent: {
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
    prisma.student.count({ where }),
  ]);

  return {
    students,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / take),
  };
};

const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
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
      course: {
        include: {
          department: true,
        },
      },
      parent: {
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

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return student;
};

const updateStudent = async (id, { name, email, password, status, studentId, phone, dateOfBirth, gender, address, semester, courseId, parentId }) => {
  const student = await prisma.student.findUnique({
    where: { id: parseInt(id) },
    include: { user: true },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const userUpdate = {};
  if (name) userUpdate.name = name;
  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== student.userId) {
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

  const studentUpdate = {};
  if (studentId) studentUpdate.studentId = studentId;
  if (phone !== undefined) studentUpdate.phone = phone;
  if (dateOfBirth !== undefined) studentUpdate.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  if (gender !== undefined) studentUpdate.gender = gender;
  if (address !== undefined) studentUpdate.address = address;
  if (semester !== undefined) studentUpdate.semester = semester ? parseInt(semester) : 1;
  if (courseId !== undefined) studentUpdate.courseId = courseId ? parseInt(courseId) : null;
  if (parentId !== undefined) studentUpdate.parentId = parentId ? parseInt(parentId) : null;

  return await prisma.$transaction(async (tx) => {
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: student.userId },
        data: userUpdate,
      });
    }

    return await tx.student.update({
      where: { id: parseInt(id) },
      data: studentUpdate,
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
        course: true,
      },
    });
  });
};

const deleteStudent = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id: parseInt(id) },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  // Deleting the User cascades and deletes the Student profile as configured in schema.prisma
  await prisma.user.delete({
    where: { id: student.userId },
  });

  return { success: true, message: "Student deleted successfully" };
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
