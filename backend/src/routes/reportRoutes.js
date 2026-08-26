const express = require("express");
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all report routes
router.use(authMiddleware);

// Only ADMIN or SUPER_ADMIN roles can fetch reports
router.use(roleMiddleware("ADMIN"));

router.get("/students", reportController.getStudentReport);
router.get("/teachers", reportController.getTeacherReport);
router.get("/attendance", reportController.getAttendanceReport);
router.get("/fees", reportController.getFeeReport);
router.get("/exams", reportController.getExamReport);
router.get("/assignments", reportController.getAssignmentReport);

module.exports = router;
