const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const { name, email, password, schoolName } = req.body;

    // Verify all required onboarding inputs are present
    if (!name || !email || !password || !schoolName) {
      return res.status(400).json({
        success: false,
        message: "School Name, Owner Name, Email, and Password are required.",
      });
    }

    // Normalizations
    const trimmedSchoolName = schoolName.trim();
    const trimmedOwnerName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Input Validation Enforcements
    if (trimmedSchoolName.length < 2 || trimmedSchoolName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "School name must be between 2 and 100 characters.",
      });
    }

    if (trimmedOwnerName.length < 2 || trimmedOwnerName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Owner name must be between 2 and 50 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Perform atomic transaction creation
    const result = await authService.registerSchoolAndOwner({
      schoolName: trimmedSchoolName,
      ownerName: trimmedOwnerName,
      email: normalizedEmail,
      password,
    });

    res.status(201).json({
      success: true,
      message: "School and Owner registered successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.loginUser({
      email,
      password,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};
