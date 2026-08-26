const express = require("express");
const feeController = require("../controllers/feeController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all fee routes
router.use(authMiddleware);

// GET fee stats - ADMIN, SUPER_ADMIN
router.get("/stats", roleMiddleware("ADMIN"), feeController.getFeeStats);

// GET all fee records - ADMIN, STUDENT
router.get("/", roleMiddleware("ADMIN", "STUDENT"), feeController.getFees);

// GET fee record by ID - ADMIN, STUDENT
router.get("/:id", roleMiddleware("ADMIN", "STUDENT"), feeController.getFeeById);

// POST create fee - ADMIN only
router.post("/", roleMiddleware("ADMIN"), feeController.createFee);

// PUT update fee - ADMIN only
router.put("/:id", roleMiddleware("ADMIN"), feeController.updateFee);

// DELETE fee record - ADMIN only
router.delete("/:id", roleMiddleware("ADMIN"), feeController.deleteFee);

module.exports = router;
