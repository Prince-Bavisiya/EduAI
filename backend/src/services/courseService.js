const prisma = require("../config/prisma");

const getCourses = async (departmentId) => {
  const where = {};

  if (departmentId) {
    where.departmentId = Number(departmentId);
  }

  return prisma.course.findMany({
    where,
    orderBy: {
      name: "asc",
    },
    include: {
      department: true,
      classTeacher: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          students: true,
          subjects: true,
        },
      },
    },
  });
};

const getCourseById = async (id) => {
  return prisma.course.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      department: true,
      classTeacher: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      subjects: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });
};

const createCourse = async ({ name, description, section, capacity, academicYear, classTeacherId, departmentId }) => {
  return prisma.course.create({
    data: {
      name,
      description,
      section: section || "A",
      capacity: capacity ? Number(capacity) : 30,
      academicYear: academicYear || "2026-2027",
      classTeacherId: classTeacherId ? Number(classTeacherId) : null,
      departmentId: departmentId ? Number(departmentId) : null,
    },
    include: {
      department: true,
      classTeacher: {
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

const updateCourse = async (id, { name, description, section, capacity, academicYear, classTeacherId, departmentId }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (section !== undefined) data.section = section;
  if (capacity !== undefined) data.capacity = capacity ? Number(capacity) : null;
  if (academicYear !== undefined) data.academicYear = academicYear;
  if (classTeacherId !== undefined) data.classTeacherId = classTeacherId ? Number(classTeacherId) : null;
  if (departmentId !== undefined) data.departmentId = departmentId ? Number(departmentId) : null;

  return prisma.course.update({
    where: {
      id: Number(id),
    },
    data,
    include: {
      department: true,
      classTeacher: {
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

const deleteCourse = async (id) => {
  await prisma.course.delete({
    where: {
      id: Number(id),
    },
  });
  return { success: true, message: "Class deleted successfully" };
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
