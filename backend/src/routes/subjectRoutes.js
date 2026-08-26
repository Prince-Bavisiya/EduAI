const express = require("express");
const subjectController = require("../controllers/subjectController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { validateSubject } = require("../middleware/validationMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all subject routes
router.use(authMiddleware);

// GET all subjects - accessible by ADMIN and TEACHER
router.get("/", roleMiddleware("ADMIN", "TEACHER"), subjectController.getSubjects);

// GET subject by ID - accessible by ADMIN and TEACHER
router.get("/:id", roleMiddleware("ADMIN", "TEACHER"), subjectController.getSubjectById);

// POST create subject - ADMIN only
router.post("/", roleMiddleware("ADMIN"), validateSubject, subjectController.createSubject);

// PUT update subject - ADMIN only
router.put("/:id", roleMiddleware("ADMIN"), validateSubject, subjectController.updateSubject);

// DELETE subject - ADMIN only
router.delete("/:id", roleMiddleware("ADMIN"), subjectController.deleteSubject);

module.exports = router;
