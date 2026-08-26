const express = require("express");
const studentController = require("../controllers/studentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateStudent } = require("../middleware/validationMiddleware");

const router = express.Router();

// GET all students - accessible by ADMIN and TEACHER
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  studentController.getStudents
);

// GET student by ID - accessible by ADMIN and TEACHER
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  studentController.getStudentById
);

// POST create student - ADMIN only
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validateStudent,
  studentController.createStudent
);

// PUT update student - ADMIN only
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  validateStudent,
  studentController.updateStudent
);

// DELETE student - ADMIN only
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  studentController.deleteStudent
);

module.exports = router;
