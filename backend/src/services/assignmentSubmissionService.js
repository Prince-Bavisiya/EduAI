const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const submitAssignment = async (assignmentId, { studentId }) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: Number(assignmentId) },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  const now = new Date();
  const status = now > new Date(assignment.deadline) ? "LATE" : "SUBMITTED";

  return prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: Number(assignmentId),
        studentId: Number(studentId),
      },
    },
    update: {
      submittedAt: now,
      status,
    },
    create: {
      assignmentId: Number(assignmentId),
      studentId: Number(studentId),
      submittedAt: now,
      status,
    },
  });
};

const getSubmissionsByAssignment = async (assignmentId) => {
  return prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: Number(assignmentId),
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
};

const getSubmissionsByStudent = async (studentId) => {
  return prisma.assignmentSubmission.findMany({
    where: {
      studentId: Number(studentId),
    },
    include: {
      assignment: {
        include: {
          subject: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
};

const gradeSubmission = async (submissionId, { marks, feedback }) => {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: Number(submissionId) },
    include: { assignment: true },
  });

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  const numericMarks = Number(marks);
  if (numericMarks < 0 || numericMarks > submission.assignment.maxMarks) {
    throw new AppError(`Marks must be between 0 and the assignment max marks (${submission.assignment.maxMarks})`, 400);
  }

  const percentage = Math.round((numericMarks / submission.assignment.maxMarks) * 100);

  return prisma.assignmentSubmission.update({
    where: {
      id: Number(submissionId),
    },
    data: {
      marks: numericMarks,
      percentage,
      feedback,
      status: "GRADED",
    },
  });
};

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  getSubmissionsByStudent,
  gradeSubmission,
};
