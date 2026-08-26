const prisma = require("../config/prisma");

const logAction = async ({ action, performedBy, role, details }) => {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        performedBy,
        role,
        details: details && typeof details === "object" ? JSON.stringify(details) : details,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};

module.exports = { logAction };
