const superAdminService = require("../services/superAdminService");
const auditService = require("../services/auditService");

const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await superAdminService.getAnalytics();
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await superAdminService.getUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    const admins = await superAdminService.getAdmins();
    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (name, email, password)",
      });
    }

    const admin = await superAdminService.createAdmin({ name, email, password });

    await auditService.logAction({
      action: "Created Admin",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Created new admin account: ${name} (Email: ${email})`,
    });

    res.status(201).json({
      success: true,
      message: "Administrator created successfully",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user.userId === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: "Self-deletion is forbidden.",
      });
    }

    const result = await superAdminService.deleteAdmin(id);

    await auditService.logAction({
      action: "Deleted Admin",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted admin with database ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await superAdminService.getAuditLogs();
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const settings = await superAdminService.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({
        success: false,
        message: "Settings object is required",
      });
    }

    const updated = [];
    for (const [key, val] of Object.entries(settings)) {
      await superAdminService.updateSetting(key, String(val));
      updated.push(key);
    }

    await auditService.logAction({
      action: "Changed System Setting",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Modified system settings keys: ${updated.join(", ")}`,
    });

    res.status(200).json({
      success: true,
      message: "System settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await superAdminService.getDashboardData(req.user.schoolId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const updateSchool = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (email !== undefined && email !== "") {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid school email address format.",
        });
      }
      req.body.email = trimmedEmail;
    }

    const school = await superAdminService.updateSchool(req.user.schoolId, req.body);

    await auditService.logAction({
      action: "Updated School Settings",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Modified school profile/settings for ${school.name}`,
    });

    res.status(200).json({
      success: true,
      message: "School configuration saved successfully",
      data: school,
    });
  } catch (error) {
    next(error);
  }
};

const updateOwner = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address format.",
        });
      }
      req.body.email = trimmedEmail;
    }

    if (password !== undefined && password !== "") {
      const trimmedPassword = password.trim();
      if (trimmedPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters.",
        });
      }
    }

    const user = await superAdminService.updateOwner(req.user.userId, req.body);

    await auditService.logAction({
      action: "Updated Owner Account",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Modified user owner profile details (Name: ${user.name}, Email: ${user.email})`,
    });

    res.status(200).json({
      success: true,
      message: "Account settings updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getUsers,
  getAdmins,
  createAdmin,
  deleteAdmin,
  getAuditLogs,
  getSettings,
  updateSettings,
  getDashboard,
  updateSchool,
  updateOwner,
};
