const markService = require("../services/markService");
const prisma = require("../config/prisma");
const auditService = require("../services/auditService");

const getStudentIdFromUserId = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { userId }
  });
  return student ? student.id : null;
};

const enterMark = async (req, res, next) => {
  try {
    const { studentId, subjectId, examId, marks } = req.body;
    if (!studentId || !subjectId || !examId || marks === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (studentId, subjectId, examId, marks)",
      });
    }

    const mark = await markService.enterMark({
      studentId,
      subjectId,
      examId,
      marks,
    });

    await auditService.logAction({
      action: "Entered Marks",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Graded Student ID ${studentId} for Exam ID ${examId} with marks: ${marks}`,
    });

    res.status(201).json({
      success: true,
      message: "Marks entered successfully",
      data: mark,
    });
  } catch (error) {
    next(error);
  }
};

const getMarksByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === "STUDENT") {
      const loggedInStudentId = await getStudentIdFromUserId(req.user.userId);
      if (loggedInStudentId !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Students can only view their own exam marks",
        });
      }
    }

    const marks = await markService.getMarksByStudent(studentId);

    res.status(200).json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
};

const getMarksByExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const marks = await markService.getMarksByExam(examId);

    res.status(200).json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
};

const updateMark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { marks } = req.body;

    if (marks === undefined) {
      return res.status(400).json({
        success: false,
        message: "marks field is required",
      });
    }

    const mark = await markService.updateMark(id, { marks });

    res.status(200).json({
      success: true,
      message: "Marks updated successfully",
      data: mark,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await markService.deleteMark(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enterMark,
  getMarksByStudent,
  getMarksByExam,
  updateMark,
  deleteMark,
};
