const express = require("express");
const superAdminController = require("../controllers/superAdminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes here require JWT Authentication + SUPER_ADMIN authorization
router.use(authMiddleware);
router.use(roleMiddleware("SUPER_ADMIN"));

router.get("/analytics", superAdminController.getAnalytics);
router.get("/dashboard", superAdminController.getDashboard);
router.get("/users", superAdminController.getUsers);
router.get("/audit", superAdminController.getAuditLogs);
router.get("/settings", superAdminController.getSettings);
router.put("/settings", superAdminController.updateSettings);

router.get("/admins", superAdminController.getAdmins);
router.post("/admins", superAdminController.createAdmin);
router.delete("/admins/:id", superAdminController.deleteAdmin);

router.put("/school", superAdminController.updateSchool);
router.put("/owner", superAdminController.updateOwner);

module.exports = router;
