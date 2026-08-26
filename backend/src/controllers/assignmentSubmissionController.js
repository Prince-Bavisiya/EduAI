const submissionService = require("../services/assignmentSubmissionService");
const prisma = require("../config/prisma");

const getStudentIdFromUserId = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { userId }
  });
  return student ? student.id : null;
};

const submitAssignment = async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
    let { studentId } = req.body;

    if (req.user.role === "STUDENT") {
      const loggedInStudentId = await getStudentIdFromUserId(req.user.userId);
      if (!loggedInStudentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Logged-in user is not associated with a student record",
        });
      }
      studentId = loggedInStudentId;
    } else if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required in request body",
      });
    }

    const submission = await submissionService.submitAssignment(assignmentId, {
      studentId,
    });

    res.status(201).json({
      success: true,
      message: "Assignment submitted successfully",
      data: submission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit assignment",
    });
  }
};

const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { id: assignmentId } = req.params;
    const submissions = await submissionService.getSubmissionsByAssignment(assignmentId);

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch submissions",
    });
  }
};

const getSubmissionsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === "STUDENT") {
      const loggedInStudentId = await getStudentIdFromUserId(req.user.userId);
      if (loggedInStudentId !== parseInt(studentId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Students can only view their own assignment submissions",
        });
      }
    }

    const submissions = await submissionService.getSubmissionsByStudent(studentId);

    res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student submissions",
    });
  }
};

const gradeSubmission = async (req, res) => {
  try {
    const { id: submissionId } = req.params;
    const { marks, feedback } = req.body;

    if (marks === undefined) {
      return res.status(400).json({
        success: false,
        message: "marks parameter is required in request body",
      });
    }

    const submission = await submissionService.gradeSubmission(submissionId, {
      marks,
      feedback,
    });

    res.status(200).json({
      success: true,
      message: "Submission graded successfully",
      data: submission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to grade submission",
    });
  }
};

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  getSubmissionsByStudent,
  gradeSubmission,
};
