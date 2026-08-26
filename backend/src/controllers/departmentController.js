const departmentService = require("../services/departmentService");

const getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getDepartments();

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
    });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const department = await departmentService.getDepartmentById(
      req.params.id
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch department",
    });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
};
