const teacherService = require("../services/teacherService");
const auditService = require("../services/auditService");

const createTeacher = async (req, res, next) => {
  try {
    const { name, email, password, departmentId, courseIds, subjectIds } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const teacher = await teacherService.createTeacher({
      name,
      email,
      password,
      departmentId,
      courseIds,
      subjectIds,
    });

    await auditService.logAction({
      action: "Created Teacher",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Created teacher: ${name} (Email: ${email})`,
    });

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const getTeachers = async (req, res, next) => {
  try {
    const { page, limit, search, departmentId, courseId } = req.query;

    const result = await teacherService.getTeachers({
      page: page || 1,
      limit: limit || 10,
      search: search || "",
      departmentId,
      courseId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacher = await teacherService.getTeacherById(id);

    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, status, departmentId, courseIds, subjectIds } = req.body;

    const teacher = await teacherService.updateTeacher(id, {
      name,
      email,
      password,
      status,
      departmentId,
      courseIds,
      subjectIds,
    });

    await auditService.logAction({
      action: "Updated Teacher",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated teacher with database ID ${id}`,
    });

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await teacherService.deleteTeacher(id);

    await auditService.logAction({
      action: "Deleted Teacher",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted teacher with database ID ${id}`,
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
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
