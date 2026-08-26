const assignmentService = require("../services/assignmentService");

const createAssignment = async (req, res, next) => {
  try {
    const { title, description, deadline, maxMarks, subjectId } = req.body;
    if (!title || !deadline || !maxMarks || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (title, deadline, maxMarks, subjectId)",
      });
    }

    const assignment = await assignmentService.createAssignment({
      title,
      description,
      deadline,
      maxMarks,
      subjectId,
    });

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const assignments = await assignmentService.getAssignments({ subjectId });

    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.updateAssignment(id, req.body);

    res.status(200).json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await assignmentService.deleteAssignment(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
};
