const subjectService = require("../services/subjectService");
const auditService = require("../services/auditService");

const createSubject = async (req, res, next) => {
  try {
    const { name, code, courseId, teacherId, sessions } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    const subject = await subjectService.createSubject({
      name,
      code,
      courseId,
      teacherId,
      sessions,
    });

    await auditService.logAction({
      action: "Created Subject",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Created subject: ${name} (Code: ${code})`,
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const { page, limit, search, courseId, teacherId } = req.query;

    const result = await subjectService.getSubjects({
      page: page || 1,
      limit: limit || 10,
      search: search || "",
      courseId,
      teacherId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subject = await subjectService.getSubjectById(id);

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, courseId, teacherId, sessions } = req.body;

    const subject = await subjectService.updateSubject(id, {
      name,
      code,
      courseId,
      teacherId,
      sessions,
    });

    await auditService.logAction({
      action: "Updated Subject",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated subject with database ID ${id}. New Code: ${code || subject.code}`,
    });

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await subjectService.deleteSubject(id);

    await auditService.logAction({
      action: "Deleted Subject",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted subject with database ID ${id}`,
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
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
