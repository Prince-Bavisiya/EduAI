const express = require("express");
const markController = require("../controllers/markController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const subjectAccessMiddleware = require("../middleware/subjectAccessMiddleware");
const { validateMark } = require("../middleware/validationMiddleware");

const router = express.Router();

// POST enter mark - ADMIN, TEACHER
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateMark,
  subjectAccessMiddleware,
  markController.enterMark
);

// GET student marks history - ADMIN, TEACHER, STUDENT
router.get(
  "/student/:studentId",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  markController.getMarksByStudent
);

// GET all marks for a specific exam - ADMIN, TEACHER
router.get(
  "/exam/:examId",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  markController.getMarksByExam
);

// PUT update mark - ADMIN, TEACHER
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  validateMark,
  subjectAccessMiddleware,
  markController.updateMark
);

// DELETE mark record - ADMIN, TEACHER
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  markController.deleteMark
);

module.exports = router;
