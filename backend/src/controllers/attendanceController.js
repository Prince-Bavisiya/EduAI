const attendanceService = require("../services/attendanceService");
const prisma = require("../config/prisma");
const auditService = require("../services/auditService");

const getStudentIdFromUserId = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { userId }
  });
  return student ? student.id : null;
};

const markAttendance = async (req, res, next) => {
  try {
    const data = req.body;

    // Support single record or array batch mark via transaction
    if (Array.isArray(data)) {
      for (const item of data) {
        const { studentId, subjectId, date, status } = item;
        if (!studentId || !subjectId || !date || !status) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields in one or more records (studentId, subjectId, date, status)",
          });
        }
        const student = await prisma.student.findUnique({ where: { id: Number(studentId) } });
        if (!student) {
          return res.status(404).json({ success: false, message: `Student ID ${studentId} not found in this school context` });
        }
        const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
        if (!subject) {
          return res.status(404).json({ success: false, message: `Subject ID ${subjectId} not found in this school context` });
        }
      }
      const markedRecords = await attendanceService.markAttendanceBatch(data);

      await auditService.logAction({
        action: "Marked Attendance Batch",
        performedBy: req.user.email,
        role: req.user.role,
        details: `Marked batch attendance for ${markedRecords.length} student records.`,
      });

      return res.status(201).json({
        success: true,
        message: `${markedRecords.length} attendance records marked successfully`,
        data: markedRecords,
      });
    }

    const { studentId, subjectId, date, status } = data;
    if (!studentId || !subjectId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (studentId, subjectId, date, status)",
      });
    }

    const student = await prisma.student.findUnique({ where: { id: Number(studentId) } });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found in this school context" });
    }
    const subject = await prisma.subject.findUnique({ where: { id: Number(subjectId) } });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found in this school context" });
    }

    const record = await attendanceService.markAttendance({
      studentId,
      subjectId,
      date,
      status,
    });

    await auditService.logAction({
      action: "Marked Attendance",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Marked student ID ${studentId} for Subject ID ${subjectId} as ${status} on ${date}`,
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, courseId } = req.query;
    const records = await attendanceService.getAttendance({
      subjectId,
      date,
      courseId,
    });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId parameter is required",
      });
    }

    if (req.user.role === "STUDENT") {
      const loggedInStudentId = await getStudentIdFromUserId(req.user.userId);
      if (loggedInStudentId !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Students can only view their own attendance records",
        });
      }
    }

    const records = await attendanceService.getStudentAttendance(studentId);

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status field is required",
      });
    }

    const record = await attendanceService.updateAttendance(id, { status });

    await auditService.logAction({
      action: "Updated Attendance",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated attendance record ID ${id} status to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: "Attendance record updated successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentStats = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId parameter is required",
      });
    }

    if (req.user.role === "STUDENT") {
      const loggedInStudentId = await getStudentIdFromUserId(req.user.userId);
      if (loggedInStudentId !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Students can only view their own attendance statistics",
        });
      }
    }

    const stats = await attendanceService.calculateAttendancePercentage(studentId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  getStudentStats,
};
