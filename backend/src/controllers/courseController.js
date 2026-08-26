const courseService = require("../services/courseService");
const auditService = require("../services/auditService");

const getCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getCourses(
      req.query.departmentId
    );

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(
      req.params.id
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const { name, description, section, capacity, academicYear, classTeacherId, departmentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Class name is required",
      });
    }

    if (capacity !== undefined && capacity !== null && capacity !== "") {
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap <= 0) {
        return res.status(400).json({
          success: false,
          message: "Class capacity must be a positive integer.",
        });
      }
      req.body.capacity = cap;
    }

    const course = await courseService.createCourse({
      name,
      description,
      section,
      capacity: req.body.capacity,
      academicYear,
      classTeacherId,
      departmentId,
    });

    await auditService.logAction({
      action: "Created Class",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Created class: ${name} (Section: ${section || "A"})`,
    });

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { capacity } = req.body;

    if (capacity !== undefined && capacity !== null && capacity !== "") {
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap <= 0) {
        return res.status(400).json({
          success: false,
          message: "Class capacity must be a positive integer.",
        });
      }
      req.body.capacity = cap;
    }

    const course = await courseService.updateCourse(id, req.body);

    await auditService.logAction({
      action: "Updated Class",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated class ID ${id} details`,
    });

    res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await courseService.deleteCourse(id);

    await auditService.logAction({
      action: "Deleted Class",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted class ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
