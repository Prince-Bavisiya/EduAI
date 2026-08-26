const express = require("express");
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET latest student analysis - ADMIN, TEACHER, STUDENT
router.get("/analysis", roleMiddleware("ADMIN", "TEACHER", "STUDENT"), aiController.getAnalysis);

// POST regenerate student analysis - ADMIN, TEACHER, STUDENT
router.post("/analysis/regenerate", roleMiddleware("ADMIN", "TEACHER", "STUDENT"), aiController.generateNewAnalysis);

// POST chat with AI Coach - ADMIN, TEACHER, STUDENT
router.post("/chat", roleMiddleware("ADMIN", "TEACHER", "STUDENT"), aiController.chat);

module.exports = router;
