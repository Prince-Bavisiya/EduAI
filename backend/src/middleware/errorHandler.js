const AppError = require("../utils/AppError");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log unexpected errors for developers
  if (!err.isOperational && err.code !== "P2002" && err.code !== "P2025" && err.name !== "JsonWebTokenError" && err.name !== "TokenExpiredError") {
    console.error("💥 UNEXPECTED ERROR:", err);
  }

  // 1. Prisma Unique Constraint Violation (P2002) -> 409 Conflict
  if (err.code === "P2002") {
    const target = err.meta?.target || [];
    let message = "A record with these details already exists.";

    if (target.includes("email")) {
      message = "An account with this email address already exists.";
    } else if (target.includes("studentId")) {
      message = "A student with this ID already exists.";
    } else if (target.includes("code")) {
      message = "A subject with this code already exists.";
    } else if (target.includes("room") || target.includes("teacherId") || target.includes("courseId")) {
      message = "Schedule conflict: The room, teacher, or class is already booked for this time slot.";
    }

    error = new AppError(message, 409);
  }

  // 2. Prisma Record Not Found (P2025) -> 404 Not Found
  if (err.code === "P2025") {
    error = new AppError("The requested record was not found.", 404);
  }

  // 3. JWT Malformed Error -> 401 Unauthorized
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid or malformed authentication token.", 401);
  }

  // 4. JWT Expired Error -> 401 Unauthorized
  if (err.name === "TokenExpiredError") {
    error = new AppError("Your session has expired. Please log in again.", 401);
  }

  // Determine status code and message
  const statusCode = error.statusCode || 500;
  const message = error.message || "An unexpected server error occurred.";

  res.status(statusCode).json({
    success: false,
    message,
    detail: err.message,
    stack: err.stack,
  });
};

module.exports = errorHandler;
