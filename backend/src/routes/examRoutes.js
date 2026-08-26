const express = require("express");
const examController = require("../controllers/examController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const subjectAccessMiddleware = require("../middleware/subjectAccessMiddleware");
const { validateExam } = require("../middleware/validationMiddleware");

const router = express.Router();

// POST create exam - ADMIN, TEACHER
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateExam,
  subjectAccessMiddleware,
  examController.createExam
);

// GET all exams - ADMIN, TEACHER
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  examController.getExams
);

// GET exam by ID - ADMIN, TEACHER, STUDENT
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  subjectAccessMiddleware,
  examController.getExamById
);

// PUT update exam - ADMIN, TEACHER
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateExam,
  subjectAccessMiddleware,
  examController.updateExam
);

// DELETE exam - ADMIN, TEACHER
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  examController.deleteExam
);

module.exports = router;
