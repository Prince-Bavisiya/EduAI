const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const getPayments = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {};

  if (search) {
    where.fee = {
      student: {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    };
  }

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take,
      include: {
        fee: {
          include: {
            student: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
                course: true,
              },
            },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / take),
  };
};

const recordPayment = async ({ feeId, amount, transactionId }) => {
  const numericAmount = Number(amount);

  if (numericAmount <= 0) {
    throw new AppError("Payment amount must be greater than zero", 400);
  }

  const fee = await prisma.fee.findUnique({
    where: { id: parseInt(feeId) },
    include: { payments: true },
  });

  if (!fee) {
    throw new AppError("Fee record not found", 404);
  }

  const alreadyPaid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = fee.amount - alreadyPaid;

  if (numericAmount > remaining) {
    throw new AppError(`Payment amount ($${numericAmount}) exceeds outstanding balance ($${remaining})`, 400);
  }

  const isExactOrOver = numericAmount === remaining;
  const newStatus = isExactOrOver ? "PAID" : "PARTIAL";

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        feeId: parseInt(feeId),
        amount: numericAmount,
        transactionId: transactionId || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      },
    });

    await tx.fee.update({
      where: { id: parseInt(feeId) },
      data: {
        status: newStatus,
      },
    });

    return payment;
  });
};

module.exports = {
  getPayments,
  recordPayment,
};
