const express = require("express");
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all payment routes
router.use(authMiddleware);

// GET all payment records - ADMIN, STUDENT
router.get("/", roleMiddleware("ADMIN", "STUDENT"), paymentController.getPayments);

// POST record payment - ADMIN only
router.post("/", roleMiddleware("ADMIN"), paymentController.recordPayment);

module.exports = router;
