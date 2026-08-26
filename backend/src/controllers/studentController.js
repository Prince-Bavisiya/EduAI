const studentService = require("../services/studentService");
const prisma = require("../config/prisma");
const auditService = require("../services/auditService");

const getStudentIdFromUserId = async (userId) => {
  const student = await prisma.student.findUnique({
    where: { userId },
  });
  return student ? student.id : null;
};

const createStudent = async (req, res, next) => {
  try {
    const { name, email, password, studentId, phone, dateOfBirth, gender, address, semester, courseId, parentId } = req.body;

    if (!name || !email || !password || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and studentId are required",
      });
    }

    const student = await studentService.createStudent({
      name,
      email,
      password,
      studentId,
      phone,
      dateOfBirth,
      gender,
      address,
      semester,
      courseId,
      parentId,
    });

    await auditService.logAction({
      action: "Created Student",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Created student: ${name} (Email: ${email}, ID: ${studentId})`,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { page, limit, search, courseId, departmentId } = req.query;

    const result = await studentService.getStudents({
      page: page || 1,
      limit: limit || 10,
      search: search || "",
      courseId,
      departmentId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === "STUDENT") {
      const studentId = await getStudentIdFromUserId(req.user.userId);
      if (studentId !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Students can only access their own profiles",
        });
      }
    }

    const student = await studentService.getStudentById(id);

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, status, studentId, phone, dateOfBirth, gender, address, semester, courseId, parentId } = req.body;

    const student = await studentService.updateStudent(id, {
      name,
      email,
      password,
      status,
      studentId,
      phone,
      dateOfBirth,
      gender,
      address,
      semester,
      courseId,
      parentId,
    });

    await auditService.logAction({
      action: "Updated Student",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Updated student with database ID ${id}. New student ID: ${studentId || student.studentId}`,
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await studentService.deleteStudent(id);

    await auditService.logAction({
      action: "Deleted Student",
      performedBy: req.user.email,
      role: req.user.role,
      details: `Deleted student with database ID ${id}`,
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
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
