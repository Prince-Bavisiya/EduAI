const prisma = require("../config/prisma");

const subjectAccessMiddleware = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    // Admins bypass resource checks
    if (role === "ADMIN" || role === "SUPER_ADMIN") {
      return next();
    }

    if (role !== "TEACHER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only teachers and administrators can perform this operation.",
      });
    }

    // Load teacher profile along with assigned subjects
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { subjects: true },
    });

    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: "Teacher profile not found.",
      });
    }

    const assignedSubjectIds = teacher.subjects.map((s) => s.id);

    // Resolve subjectId from request context
    let requestSubjectId = null;

    // 1. Direct body or query parameter check
    if (req.body.subjectId) {
      requestSubjectId = parseInt(req.body.subjectId);
    } else if (req.query.subjectId) {
      requestSubjectId = parseInt(req.query.subjectId);
    } 
    // 2. Batch attendance list marking check
    else if (Array.isArray(req.body) && req.body.length > 0 && req.body[0].subjectId) {
      const allAllowed = req.body.every((record) => 
        assignedSubjectIds.includes(parseInt(record.subjectId))
      );
      if (!allAllowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not assigned to teach one or more of the specified subjects.",
        });
      }
      return next();
    }
    // 3. ID parameter database lookups based on routing namespace
    else if (req.params.id) {
      const id = parseInt(req.params.id);
      const path = req.baseUrl; // e.g. "/api/attendance", "/api/exams", "/api/marks", "/api/assignments"

      if (path.includes("attendance")) {
        const record = await prisma.attendance.findUnique({ where: { id } });
        if (record) requestSubjectId = record.subjectId;
      } else if (path.includes("exams")) {
        const record = await prisma.exam.findUnique({ where: { id } });
        if (record) requestSubjectId = record.subjectId;
      } else if (path.includes("marks")) {
        const record = await prisma.mark.findUnique({ where: { id } });
        if (record) requestSubjectId = record.subjectId;
      } else if (path.includes("assignments")) {
        // If checking a submission ID:
        if (req.path.includes("submissions")) {
          const submission = await prisma.assignmentSubmission.findUnique({
            where: { id },
            include: { assignment: true },
          });
          if (submission && submission.assignment) {
            requestSubjectId = submission.assignment.subjectId;
          }
        } else {
          const record = await prisma.assignment.findUnique({ where: { id } });
          if (record) requestSubjectId = record.subjectId;
        }
      }
    }
    // 4. Custom parameter lookups like examId
    else if (req.params.examId) {
      const examId = parseInt(req.params.examId);
      const record = await prisma.exam.findUnique({ where: { id: examId } });
      if (record) requestSubjectId = record.subjectId;
    }

    // If a subject ID was resolved, verify assignment
    if (requestSubjectId !== null) {
      if (!assignedSubjectIds.includes(requestSubjectId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not assigned to teach this subject.",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Access middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while validating permissions.",
    });
  }
};

module.exports = subjectAccessMiddleware;
