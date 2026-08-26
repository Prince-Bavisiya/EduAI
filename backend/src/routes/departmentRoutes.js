const express = require("express");

const departmentController = require("../controllers/departmentController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  departmentController.getDepartments
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN", "TEACHER"),
  departmentController.getDepartmentById
);

module.exports = router;
