const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const meController = require("../controllers/meController");

const router = express.Router();

// All /me endpoints require active JWT authentication
router.use(authMiddleware);

router.get("/", meController.getProfile);
router.get("/dashboard", meController.getDashboard);
router.get("/attendance", meController.getAttendance);
router.get("/attendance/stats", meController.getAttendanceStats);
router.get("/marks", meController.getMarks);
router.get("/assignments", meController.getAssignments);
router.get("/fees", meController.getFees);

module.exports = router;
