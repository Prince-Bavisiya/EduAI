const jwt = require("jsonwebtoken");
const tenantContext = require("../utils/context");
const prisma = require("../config/prisma");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let schoolId = decoded.schoolId;

    // SUPER_ADMIN edge case: if the JWT was issued before schoolId was stored,
    // resolve the schoolId from the database to ensure tenant context is set correctly.
    if (decoded.role === "SUPER_ADMIN" && !schoolId) {
      const user = await prisma.user.findFirst({
        where: { id: decoded.userId },
        select: { schoolId: true },
      });
      if (user && user.schoolId) {
        schoolId = user.schoolId;
      }
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId,
    };

    // Execute downstream controllers and Prisma calls inside tenant-scoped AsyncLocalStorage context
    tenantContext.run({ schoolId }, () => {
      next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
