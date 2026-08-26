const express = require("express");

const courseController = require("../controllers/courseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Apply authMiddleware globally to all course routes
router.use(authMiddleware);

router.get(
  "/",
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  courseController.getCourses
);

router.get(
  "/:id",
  roleMiddleware("ADMIN", "TEACHER", "STUDENT"),
  courseController.getCourseById
);

router.post(
  "/",
  roleMiddleware("ADMIN"),
  courseController.createCourse
);

router.put(
  "/:id",
  roleMiddleware("ADMIN"),
  courseController.updateCourse
);

router.delete(
  "/:id",
  roleMiddleware("ADMIN"),
  courseController.deleteCourse
);

module.exports = router;
