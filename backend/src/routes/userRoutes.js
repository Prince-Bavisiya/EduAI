const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Authenticated user",
    user: req.user,
  });
});

router.get(
  "/admin-only",
  authMiddleware,
  roleMiddleware("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

router.get(
  "/teacher-area",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Teacher area accessed successfully",
      user: req.user,
    });
  }
);

module.exports = router;
