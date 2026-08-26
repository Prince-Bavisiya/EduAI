const jwt = require("jsonwebtoken");
const tenantContext = require("../utils/context");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
    };

    // Execute downstream controllers and Prisma calls inside tenantContext storage
    tenantContext.run({ schoolId: decoded.schoolId }, () => {
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
