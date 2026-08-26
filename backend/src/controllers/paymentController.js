const paymentService = require("../services/paymentService");
const auditService = require("../services/auditService");

const getPayments = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await paymentService.getPayments({
      page,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const { feeId, amount, transactionId } = req.body;

    if (!feeId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Fee ID and Amount are required",
      });
    }

    // Financial amount validation: numeric, finite, positive
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be a positive number.",
      });
    }

    const payment = await paymentService.recordPayment({
      feeId,
      amount: parsedAmount,
      transactionId,
    });

    await auditService.logAction({
      action: "Recorded Payment",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Recorded payment of $${parsedAmount} for Fee ID ${feeId}. Transaction ID: ${payment.transactionId}`,
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  recordPayment,
};
