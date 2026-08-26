const express = require("express");
const attendanceController = require("../controllers/attendanceController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const subjectAccessMiddleware = require("../middleware/subjectAccessMiddleware");

const router = express.Router();

// GET all attendance logs - ADMIN, TEACHER, STUDENT
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  subjectAccessMiddleware,
  attendanceController.getAttendance
);

// GET student stats (percentages per subject + overall) - ADMIN, TEACHER, STUDENT
router.get(
  "/student/:studentId/stats",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  attendanceController.getStudentStats
);

// GET student raw attendance logs - ADMIN, TEACHER, STUDENT
router.get(
  "/student/:studentId",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  attendanceController.getStudentAttendance
);

// POST mark attendance - ADMIN, TEACHER only
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  attendanceController.markAttendance
);

// PUT update attendance status - ADMIN, TEACHER only
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  subjectAccessMiddleware,
  attendanceController.updateAttendance
);

module.exports = router;
