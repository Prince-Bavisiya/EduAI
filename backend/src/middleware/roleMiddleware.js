const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // SUPER_ADMIN has access to all resources; otherwise check specific role whitelist
    if (req.user.role === "SUPER_ADMIN" || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource",
    });
  };
};

module.exports = roleMiddleware;
