const timetableService = require("../services/timetableService");
const prisma = require("../config/prisma");
const auditService = require("../services/auditService");

const getStudentFromUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
  });
};

const getTeacherFromUserId = async (userId) => {
  return prisma.teacher.findUnique({
    where: { userId },
  });
};

const createTimetable = async (req, res, next) => {
  try {
    const { day, startTime, endTime, room, subjectId, teacherId, courseId, semester } = req.body;

    if (!day || !startTime || !endTime || !room || !subjectId || !teacherId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (day, startTime, endTime, room, subjectId, teacherId, courseId)",
      });
    }

    const slot = await timetableService.createTimetable({
      day,
      startTime,
      endTime,
      room,
      subjectId,
      teacherId,
      courseId,
      semester,
    });

    await auditService.logAction({
      action: "Created Timetable Slot",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Scheduled Subject ID ${subjectId} on ${day} at ${startTime}-${endTime} in Room ${room}`,
    });

    res.status(201).json({
      success: true,
      message: "Timetable slot created successfully",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

const getTimetable = async (req, res, next) => {
  try {
    const { day, courseId, semester, teacherId } = req.query;
    let queryStudentId = req.query.studentId;
    let queryTeacherId = teacherId;

    // Secure derivation for student role:
    if (req.user.role === "STUDENT") {
      const student = await getStudentFromUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Student profile not found",
        });
      }
      queryStudentId = student.id;
    }

    // Secure derivation for teacher role:
    if (req.user.role === "TEACHER") {
      const teacher = await getTeacherFromUserId(req.user.userId);
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: "Teacher profile not found",
        });
      }
      queryTeacherId = teacher.id;
    }

    const result = await timetableService.getTimetable({
      day,
      courseId,
      semester,
      teacherId: queryTeacherId,
      studentId: queryStudentId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTimetableById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slot = await timetableService.getTimetableById(id);

    res.status(200).json({
      success: true,
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

const updateTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slot = await timetableService.updateTimetable(id, req.body);

    await auditService.logAction({
      action: "Updated Timetable Slot",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated timetable slot database ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: "Timetable slot updated successfully",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await timetableService.deleteTimetable(id);

    await auditService.logAction({
      action: "Deleted Timetable Slot",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted timetable slot database ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTimetable,
  getTimetable,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
};
