const aiService = require("../services/aiService");
const prisma = require("../config/prisma");

const getStudentFromUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
  });
};

const getAnalysis = async (req, res) => {
  try {
    let studentId = req.query.studentId;

    if (req.user.role === "STUDENT") {
      const student = await getStudentFromUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Student profile not found",
        });
      }
      studentId = student.id;
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId query parameter is required",
      });
    }

    const analysis = await aiService.getLatestAnalysis(studentId);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const generateNewAnalysis = async (req, res) => {
  try {
    let studentId = req.body.studentId;

    if (req.user.role === "STUDENT") {
      const student = await getStudentFromUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Student profile not found",
        });
      }
      studentId = student.id;
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const analysis = await aiService.generateAIInsights(studentId);

    res.status(200).json({
      success: true,
      message: "AI analysis regenerated successfully",
      data: analysis,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let studentId = req.body.studentId;

    if (req.user.role === "STUDENT") {
      const student = await getStudentFromUserId(req.user.userId);
      if (!student) {
        return res.status(403).json({ success: false, message: "Student profile not found" });
      }
      studentId = student.id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      include: { user: true },
    });

    const metrics = await aiService.calculateStudentAnalytics(studentId);

    // Rule-based fallback response
    let reply = "";
    const msgLower = message.toLowerCase();

    if (msgLower.includes("performance") || msgLower.includes("drop") || msgLower.includes("why") || msgLower.includes("decline") || msgLower.includes("marks") || msgLower.includes("grades")) {
      reply = `Hi ${student.user.name}. Based on my analysis, your current exam average is ${metrics.examAverage}%, and your assignment average is ${metrics.assignmentAverage}%. Your lecture attendance rate is ${metrics.attendanceRate}%. `;
      
      const lowSubjects = metrics.subjectStats.filter(s => s.marksAverage < 65 || s.attendanceRate < 75);
      if (lowSubjects.length > 0) {
        const issues = lowSubjects.map(s => `${s.name} (Grades: ${s.marksAverage}%, Attendance: ${s.attendanceRate}%)`).join(", ");
        reply += `The main area affecting your performance index is ${issues}. Improving scores and attending lectures here will boost your overall standing.`;
      } else {
        reply += "You maintain excellent ratios! Keep staying on top of coursework assignments.";
      }
    } else if (msgLower.includes("do") || msgLower.includes("should") || msgLower.includes("improve") || msgLower.includes("what") || msgLower.includes("action") || msgLower.includes("help") || msgLower.includes("advice")) {
      reply = "Here is what I recommend you focus on:\n";
      
      let recommendations = [];
      if (metrics.attendanceRate < 80) {
        recommendations.push("• Attend all remaining class sessions to cross the 85% attendance requirement.");
      }
      if (metrics.examAverage < 70) {
        recommendations.push("• Review lectures and book practical exercise sheets weekly.");
      }
      if (metrics.lateSubmissions > 0) {
        recommendations.push("• Complete course assignments at least 24 hours before deadlines.");
      }
      
      metrics.subjectStats.forEach(s => {
        if (s.marksAverage < 65) {
          recommendations.push(`• Practice additional programming or SQL exercises for ${s.name}.`);
        }
      });

      if (recommendations.length === 0) {
        recommendations.push("• Keep maintaining your current pace, and prepare early for final mid-terms.");
      }

      reply += recommendations.join("\n");
    } else {
      reply = `Hello ${student.user.name}! I am your EduAI Academic Coach. You can ask me questions like "Why is my performance dropping?" or "What should I do to improve?" and I will evaluate your grades and attendance to give you advice.`;
    }

    // Call Gemini API if key is present
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
You are the AI Academic Coach chatbot for EduAI.
The student is chatting with you. Here is their profile and clean analytics data:

Student Name: ${student.user.name}
Metrics:
- Attendance Rate: ${metrics.attendanceRate}%
- Exam Average: ${metrics.examAverage}%
- Assignment Average: ${metrics.assignmentAverage}%
- Subject Breakdown: ${JSON.stringify(metrics.subjectStats)}

Chat History:
${JSON.stringify(history)}

Student Message: "${message}"

Respond directly to the student in a concise, conversational, and encouraging tone. Keep your response under 3-4 sentences. Use the provided metrics to answer their questions.
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const json = await response.json();
          const geminiReply = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiReply) {
            reply = geminiReply.trim();
          }
        }
      } catch (err) {
        console.error("Gemini Chat API call failed, falling back:", err);
      }
    }

    res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAnalysis,
  generateNewAnalysis,
  chat,
};
