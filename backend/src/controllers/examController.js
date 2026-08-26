const examService = require("../services/examService");

const createExam = async (req, res) => {
  try {
    const { name, semester, examDate, totalMarks, subjectId } = req.body;
    if (!name || !semester || !examDate || !totalMarks || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (name, semester, examDate, totalMarks, subjectId)",
      });
    }

    const exam = await examService.createExam({
      name,
      semester,
      examDate,
      totalMarks,
      subjectId,
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create exam",
    });
  }
};

const getExams = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const exams = await examService.getExams({ subjectId });

    res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch exams",
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.getExamById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch exam",
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await examService.updateExam(id, req.body);

    res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update exam",
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await examService.deleteExam(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete exam",
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
};
