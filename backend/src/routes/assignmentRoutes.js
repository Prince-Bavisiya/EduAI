const express = require("express");
const assignmentController = require("../controllers/assignmentController");
const submissionController = require("../controllers/assignmentSubmissionController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const subjectAccessMiddleware = require("../middleware/subjectAccessMiddleware");
const { validateAssignment } = require("../middleware/validationMiddleware");

const router = express.Router();

// CRUD ASSIGNMENTS - ADMIN, TEACHER
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateAssignment,
  subjectAccessMiddleware,
  assignmentController.createAssignment
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  subjectAccessMiddleware,
  assignmentController.getAssignments
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  subjectAccessMiddleware,
  assignmentController.getAssignmentById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateAssignment,
  subjectAccessMiddleware,
  assignmentController.updateAssignment
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  assignmentController.deleteAssignment
);

// SUBMISSIONS MANAGEMENT - STUDENT, TEACHER, ADMIN
router.post(
  "/:id/submissions",
  authMiddleware,
  roleMiddleware("STUDENT", "ADMIN", "TEACHER"),
  submissionController.submitAssignment
);

router.get(
  "/:id/submissions",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  submissionController.getSubmissionsByAssignment
);

router.get(
  "/submissions/student/:studentId",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  submissionController.getSubmissionsByStudent
);

router.put(
  "/submissions/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  submissionController.gradeSubmission
);

module.exports = router;
