const reportService = require("../services/reportService");

const getStudentReport = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const data = await reportService.getStudentReport({ courseId });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getTeacherReport = async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const data = await reportService.getTeacherReport({ departmentId });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAttendanceReport = async (req, res, next) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const data = await reportService.getAttendanceReport({ courseId, startDate, endDate });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getFeeReport = async (req, res, next) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const data = await reportService.getFeeReport({ courseId, startDate, endDate });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getExamReport = async (req, res, next) => {
  try {
    const { courseId, examId } = req.query;
    const data = await reportService.getExamReport({ courseId, examId });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAssignmentReport = async (req, res, next) => {
  try {
    const { courseId, subjectId } = req.query;
    const data = await reportService.getAssignmentReport({ courseId, subjectId });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentReport,
  getTeacherReport,
  getAttendanceReport,
  getFeeReport,
  getExamReport,
  getAssignmentReport,
};
