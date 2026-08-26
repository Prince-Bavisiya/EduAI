const prisma = require("../config/prisma");

const getDepartments = async () => {
  return prisma.department.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          courses: true,
          teachers: true,
        },
      },
    },
  });
};

const getDepartmentById = async (id) => {
  return prisma.department.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      courses: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });
};

module.exports = {
  getDepartments,
  getDepartmentById,
};
