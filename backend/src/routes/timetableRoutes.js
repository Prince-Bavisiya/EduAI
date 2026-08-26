const express = require("express");
const timetableController = require("../controllers/timetableController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateTimetable } = require("../middleware/validationMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all timetable routes
router.use(authMiddleware);

// GET timetable - accessible by ADMIN, TEACHER, and STUDENT
router.get("/", roleMiddleware("ADMIN", "TEACHER", "STUDENT"), timetableController.getTimetable);

// GET timetable slot by ID - accessible by ADMIN, TEACHER, and STUDENT
router.get("/:id", roleMiddleware("ADMIN", "TEACHER", "STUDENT"), timetableController.getTimetableById);

// POST create timetable slot - ADMIN only
router.post("/", roleMiddleware("ADMIN"), validateTimetable, timetableController.createTimetable);

// PUT update timetable slot - ADMIN only
router.put("/:id", roleMiddleware("ADMIN"), validateTimetable, timetableController.updateTimetable);

// DELETE timetable slot - ADMIN only
router.delete("/:id", roleMiddleware("ADMIN"), timetableController.deleteTimetable);

module.exports = router;
