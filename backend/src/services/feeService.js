const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const getFees = async ({ page = 1, limit = 10, search = "", status, courseId }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  if (status) {
    where.status = status;
  }

  if (courseId) {
    where.student = {
      courseId: parseInt(courseId),
    };
  }

  if (search) {
    where.student = {
      ...(where.student || {}),
      user: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    };
  }

  const [fees, total] = await prisma.$transaction([
    prisma.fee.findMany({
      where,
      skip,
      take,
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            course: true,
          },
        },
        payments: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.fee.count({ where }),
  ]);

  return {
    fees,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / take),
  };
};

const getFeeById = async (id) => {
  const fee = await prisma.fee.findUnique({
    where: { id: parseInt(id) },
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          course: true,
        },
      },
      payments: true,
    },
  });

  if (!fee) {
    throw new AppError("Fee record not found", 404);
  }

  return fee;
};

const createFee = async ({ studentId, courseId, amount, dueDate }) => {
  const numericAmount = Number(amount);
  const cleanDueDate = new Date(dueDate);

  if (courseId && !studentId) {
    // Bulk assign fees to all students in the class
    const students = await prisma.student.findMany({
      where: { courseId: parseInt(courseId) },
    });

    if (students.length === 0) {
      throw new AppError("No students found in the selected class", 404);
    }

    const createdFees = await prisma.$transaction(
      students.map((student) =>
        prisma.fee.create({
          data: {
            studentId: student.id,
            amount: numericAmount,
            dueDate: cleanDueDate,
            status: "PENDING",
          },
        })
      )
    );

    return { bulk: true, count: createdFees.length };
  }

  if (!studentId) {
    throw new AppError("Either Student ID or Class ID is required", 400);
  }

  return prisma.fee.create({
    data: {
      studentId: parseInt(studentId),
      amount: numericAmount,
      dueDate: cleanDueDate,
      status: "PENDING",
    },
    include: {
      student: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });
};

const updateFee = async (id, { amount, dueDate, status }) => {
  const fee = await prisma.fee.findUnique({
    where: { id: parseInt(id) },
  });

  if (!fee) {
    throw new AppError("Fee record not found", 404);
  }

  const data = {};
  if (amount !== undefined) data.amount = Number(amount);
  if (dueDate !== undefined) data.dueDate = new Date(dueDate);
  if (status !== undefined) data.status = status;

  return prisma.fee.update({
    where: { id: parseInt(id) },
    data,
    include: {
      student: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });
};

const deleteFee = async (id) => {
  const fee = await prisma.fee.findUnique({
    where: { id: parseInt(id) },
  });

  if (!fee) {
    throw new AppError("Fee record not found", 404);
  }

  // Delete related payments first
  await prisma.payment.deleteMany({
    where: { feeId: parseInt(id) },
  });

  await prisma.fee.delete({
    where: { id: parseInt(id) },
  });

  return { success: true, message: "Fee record and payment history deleted successfully" };
};

const getFeeStats = async (schoolId) => {
  const fees = await prisma.fee.findMany({
    where: { schoolId },
    include: { payments: true },
  });

  let totalCollected = 0;
  let totalOutstanding = 0;
  const pendingStudentIds = new Set();

  fees.forEach((fee) => {
    const feePaymentsSum = fee.payments.reduce((sum, payment) => sum + payment.amount, 0);
    totalCollected += feePaymentsSum;

    const remaining = fee.amount - feePaymentsSum;
    if (remaining > 0) {
      totalOutstanding += remaining;
    }

    if (fee.status !== "PAID") {
      pendingStudentIds.add(fee.studentId);
    }
  });

  return {
    totalCollected,
    totalOutstanding,
    pendingStudentsCount: pendingStudentIds.size,
  };
};

module.exports = {
  getFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getFeeStats,
};
