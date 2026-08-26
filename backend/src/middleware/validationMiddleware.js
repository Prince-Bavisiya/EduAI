const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const toMins = (t) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateStudent = (req, res, next) => {
  const { name, email, password, semester, studentId } = req.body;

  // Create validations
  if (req.method === "POST") {
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Validation error: name is required" });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: "Validation error: email is required" });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: "Validation error: password must be at least 6 characters" });
    if (!studentId || !studentId.trim()) return res.status(400).json({ success: false, message: "Validation error: studentId is required" });
  }

  // Format and range validations
  if (email && !validateEmail(email)) {
    return res.status(400).json({ success: false, message: "Validation error: invalid email format" });
  }

  if (password !== undefined && password !== "" && password.length < 6) {
    return res.status(400).json({ success: false, message: "Validation error: password must be at least 6 characters" });
  }

  if (semester !== undefined) {
    const sem = parseInt(semester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: "Validation error: semester must be between 1 and 8" });
    }
  }

  next();
};

const validateTeacher = (req, res, next) => {
  const { name, email, password } = req.body;

  if (req.method === "POST") {
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Validation error: name is required" });
    if (!email || !email.trim()) return res.status(400).json({ success: false, message: "Validation error: email is required" });
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: "Validation error: password must be at least 6 characters" });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({ success: false, message: "Validation error: invalid email format" });
  }

  if (password !== undefined && password !== "" && password.length < 6) {
    return res.status(400).json({ success: false, message: "Validation error: password must be at least 6 characters" });
  }

  next();
};

const validateSubject = (req, res, next) => {
  const { name, code, sessions } = req.body;

  if (req.method === "POST") {
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Validation error: name is required" });
    if (!code || !code.trim()) return res.status(400).json({ success: false, message: "Validation error: code is required" });
  }

  if (sessions !== undefined && sessions !== null) {
    const s = parseInt(sessions);
    if (isNaN(s) || s < 0) {
      return res.status(400).json({ success: false, message: "Validation error: sessions must be a non-negative integer" });
    }
  }

  next();
};

const validateExam = (req, res, next) => {
  const { name, totalMarks, semester, examDate } = req.body;

  if (req.method === "POST") {
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Validation error: name is required" });
    if (totalMarks === undefined) return res.status(400).json({ success: false, message: "Validation error: totalMarks is required" });
    if (semester === undefined) return res.status(400).json({ success: false, message: "Validation error: semester is required" });
    if (!examDate) return res.status(400).json({ success: false, message: "Validation error: examDate is required" });
  }

  if (totalMarks !== undefined) {
    const marks = parseInt(totalMarks);
    if (isNaN(marks) || marks <= 0) {
      return res.status(400).json({ success: false, message: "Validation error: totalMarks must be greater than 0" });
    }
  }

  if (semester !== undefined) {
    const sem = parseInt(semester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: "Validation error: semester must be between 1 and 8" });
    }
  }

  if (examDate && isNaN(Date.parse(examDate))) {
    return res.status(400).json({ success: false, message: "Validation error: invalid examDate format" });
  }

  next();
};

const validateMark = (req, res, next) => {
  const { marks } = req.body;

  if (marks !== undefined) {
    const numMarks = parseFloat(marks);
    if (isNaN(numMarks) || numMarks < 0) {
      return res.status(400).json({ success: false, message: "Validation error: marks must be a non-negative number" });
    }
  }

  next();
};

const validateAssignment = (req, res, next) => {
  const { title, maxMarks, deadline } = req.body;

  if (req.method === "POST") {
    if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Validation error: title is required" });
    if (maxMarks === undefined) return res.status(400).json({ success: false, message: "Validation error: maxMarks is required" });
    if (!deadline) return res.status(400).json({ success: false, message: "Validation error: deadline is required" });
  }

  if (maxMarks !== undefined) {
    const marks = parseInt(maxMarks);
    if (isNaN(marks) || marks <= 0) {
      return res.status(400).json({ success: false, message: "Validation error: maxMarks must be greater than 0" });
    }
  }

  if (deadline && isNaN(Date.parse(deadline))) {
    return res.status(400).json({ success: false, message: "Validation error: invalid deadline format" });
  }

  next();
};

const validateTimetable = (req, res, next) => {
  const { day, startTime, endTime, semester } = req.body;

  if (req.method === "POST") {
    if (!day) return res.status(400).json({ success: false, message: "Validation error: day is required" });
    if (!startTime) return res.status(400).json({ success: false, message: "Validation error: startTime is required" });
    if (!endTime) return res.status(400).json({ success: false, message: "Validation error: endTime is required" });
  }

  if (day && !DAYS_OF_WEEK.includes(day)) {
    return res.status(400).json({ success: false, message: "Validation error: invalid day of week" });
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (startTime && !timeRegex.test(startTime)) {
    return res.status(400).json({ success: false, message: "Validation error: startTime must be in HH:MM format" });
  }
  if (endTime && !timeRegex.test(endTime)) {
    return res.status(400).json({ success: false, message: "Validation error: endTime must be in HH:MM format" });
  }

  if (startTime && endTime) {
    if (toMins(startTime) >= toMins(endTime)) {
      return res.status(400).json({ success: false, message: "Validation error: endTime must be after startTime" });
    }
  }

  if (semester !== undefined) {
    const sem = parseInt(semester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, message: "Validation error: semester must be between 1 and 8" });
    }
  }

  next();
};

module.exports = {
  validateStudent,
  validateTeacher,
  validateSubject,
  validateExam,
  validateMark,
  validateAssignment,
  validateTimetable,
};
