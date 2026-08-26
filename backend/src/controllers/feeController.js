const feeService = require("../services/feeService");
const auditService = require("../services/auditService");

const getFees = async (req, res, next) => {
  try {
    const { page, limit, search, status, courseId } = req.query;
    const result = await feeService.getFees({
      page,
      limit,
      search,
      status,
      courseId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fee = await feeService.getFeeById(id);

    res.status(200).json({
      success: true,
      data: fee,
    });
  } catch (error) {
    next(error);
  }
};

const createFee = async (req, res, next) => {
  try {
    const { studentId, courseId, amount, dueDate } = req.body;

    if (!amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Amount and Due Date are required",
      });
    }

    // Financial amount validation: numeric, finite, positive
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fee amount must be a positive number.",
      });
    }

    // Due Date validation: valid date format and existence
    if (isNaN(Date.parse(dueDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    const result = await feeService.createFee({
      studentId,
      courseId,
      amount: parsedAmount,
      dueDate: new Date(dueDate).toISOString(),
    });

    await auditService.logAction({
      action: "Created Fee",
      performedBy: req.user.email,
      role: req.user.role,
      details: result.bulk
        ? `Bulk-assigned fees to class ID ${courseId} ($${parsedAmount} amount)`
        : `Assigned fee to Student ID ${studentId} ($${parsedAmount} amount)`,
    });

    res.status(201).json({
      success: true,
      message: "Fee assigned successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, dueDate } = req.body;

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fee amount must be a positive number.",
        });
      }
      req.body.amount = parsedAmount;
    }

    if (dueDate !== undefined) {
      if (isNaN(Date.parse(dueDate))) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date.",
        });
      }
      req.body.dueDate = new Date(dueDate).toISOString();
    }

    const fee = await feeService.updateFee(id, req.body);

    await auditService.logAction({
      action: "Updated Fee",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated details for Fee record ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: "Fee record updated successfully",
      data: fee,
    });
  } catch (error) {
    next(error);
  }
};

const deleteFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await feeService.deleteFee(id);

    await auditService.logAction({
      action: "Deleted Fee Record",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted Fee record ID ${id} and associated payments`,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const getFeeStats = async (req, res, next) => {
  try {
    const stats = await feeService.getFeeStats(req.user.schoolId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getFeeStats,
};
