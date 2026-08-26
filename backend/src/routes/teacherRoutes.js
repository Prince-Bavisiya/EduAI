const express = require("express");
const teacherController = require("../controllers/teacherController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateTeacher } = require("../middleware/validationMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all teacher routes
router.use(authMiddleware);

// GET all teachers - accessible by ADMIN and TEACHER
router.get("/", roleMiddleware("ADMIN", "TEACHER"), teacherController.getTeachers);

// GET teacher by ID - accessible by ADMIN and TEACHER
router.get("/:id", roleMiddleware("ADMIN", "TEACHER"), teacherController.getTeacherById);

// POST create teacher - ADMIN only
router.post("/", roleMiddleware("ADMIN"), validateTeacher, teacherController.createTeacher);

// PUT update teacher - ADMIN only
router.put("/:id", roleMiddleware("ADMIN"), validateTeacher, teacherController.updateTeacher);

// DELETE teacher - ADMIN only
router.delete("/:id", roleMiddleware("ADMIN"), teacherController.deleteTeacher);

module.exports = router;
