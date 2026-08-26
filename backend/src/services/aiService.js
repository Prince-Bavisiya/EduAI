const prisma = require("../config/prisma");

const calculateStudentAnalytics = async (studentId) => {
  const id = parseInt(studentId);

  // 1. Fetch attendance stats
  const attendances = await prisma.attendance.findMany({
    where: { studentId: id },
  });
  
  const totalAttendance = attendances.length;
  const presentAttendance = attendances.filter(a => a.status === "PRESENT" || a.status === "LATE").length;
  const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 100;

  // 2. Fetch exam marks
  const marks = await prisma.mark.findMany({
    where: { studentId: id },
  });
  const examAvg = marks.length > 0 ? marks.reduce((sum, m) => sum + m.percentage, 0) / marks.length : 80;

  // 3. Fetch assignment submissions
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: id },
    include: { assignment: true },
  });
  const gradedSubmissions = submissions.filter(s => s.status === "GRADED" && s.percentage !== null);
  const assignmentAvg = gradedSubmissions.length > 0 ? gradedSubmissions.reduce((sum, s) => sum + s.percentage, 0) / gradedSubmissions.length : 85;
  const lateSubmissions = submissions.filter(s => s.status === "LATE" || (s.status === "SUBMITTED" && s.submittedAt && s.submittedAt > s.assignment?.deadline)).length;

  // 4. Subject breakdown
  const student = await prisma.student.findUnique({
    where: { id },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const subjects = await prisma.subject.findMany({
    where: {
      courseId: student.courseId,
    },
  });

  const subjectStats = [];
  for (const sub of subjects) {
    const subAtt = attendances.filter(a => a.subjectId === sub.id);
    const subAttRate = subAtt.length > 0 ? (subAtt.filter(a => a.status === "PRESENT" || a.status === "LATE").length / subAtt.length) * 100 : 100;

    const subMarks = marks.filter(m => m.subjectId === sub.id);
    const subMarkAvg = subMarks.length > 0 ? subMarks.reduce((sum, m) => sum + m.percentage, 0) / subMarks.length : 80;

    subjectStats.push({
      subjectId: sub.id,
      name: sub.name,
      code: sub.code,
      attendanceRate: Math.round(subAttRate),
      marksAverage: Math.round(subMarkAvg),
    });
  }

  return {
    attendanceRate: Math.round(attendanceRate),
    examAverage: Math.round(examAvg),
    assignmentAverage: Math.round(assignmentAvg),
    lateSubmissions,
    subjectStats,
  };
};

const generateAIInsights = async (studentId) => {
  const id = parseInt(studentId);
  const metrics = await calculateStudentAnalytics(id);
  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!student) {
    throw new Error("Student profile not found");
  }

  // Calculate overall performance score
  const performanceScore = Math.round(
    (metrics.attendanceRate + metrics.examAverage + metrics.assignmentAverage) / 3
  );

  // Determine risk level
  let riskLevel = "LOW";
  if (performanceScore < 60 || metrics.attendanceRate < 70) {
    riskLevel = "HIGH";
  } else if (performanceScore < 75 || metrics.attendanceRate < 80 || metrics.lateSubmissions > 1) {
    riskLevel = "MODERATE";
  }

  // Rule-based insights (Fallback)
  let strengths = ["Consistent participation"];
  let weaknesses = [];
  let recommendations = ["Keep up the good work!"];

  if (metrics.examAverage >= 85) {
    strengths.push("Excellent exam performance");
  }
  if (metrics.assignmentAverage >= 85) {
    strengths.push("High quality coursework submissions");
  }
  if (metrics.attendanceRate >= 90) {
    strengths.push("Exceptional lecture attendance");
  }

  if (metrics.attendanceRate < 75) {
    weaknesses.push("Low lecture attendance");
    recommendations.push("Prioritize attending upcoming morning lectures to satisfy course validation requirements.");
  }
  if (metrics.examAverage < 65) {
    weaknesses.push("Weak exam performance");
    recommendations.push("Schedule revision sessions and practice mock test questionnaires.");
  }
  if (metrics.lateSubmissions > 1) {
    weaknesses.push("Late coursework submissions");
    recommendations.push("Submit assignments earlier to avoid scoring penalties.");
  }

  // Add subject-specific recommendations
  for (const sub of metrics.subjectStats) {
    if (sub.marksAverage < 65) {
      weaknesses.push(`Low grades in ${sub.name}`);
      recommendations.push(`Review core concepts and practice exercises for ${sub.name}.`);
    }
    if (sub.attendanceRate < 75) {
      weaknesses.push(`Poor attendance in ${sub.name}`);
      recommendations.push(`Attend all remaining classes for ${sub.name}.`);
    }
  }

  // If Gemini key exists, call Gemini for custom generation
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
You are the AI Academic Coach for EduAI.
Analyze the following student data and provide a highly personalized profile in JSON format.

Student Name: ${student.user.name}
Metrics:
- Attendance Rate: ${metrics.attendanceRate}%
- Exam Average: ${metrics.examAverage}%
- Assignment Average: ${metrics.assignmentAverage}%
- Late Submissions: ${metrics.lateSubmissions}
- Subject Performance: ${JSON.stringify(metrics.subjectStats)}

Performance Score: ${performanceScore}/100
Determined Risk Level: ${riskLevel}

Output exactly a JSON object (no markdown, no other text) with the following structure:
{
  "performanceScore": ${performanceScore},
  "riskLevel": "${riskLevel}",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"]
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text);
        if (parsed.strengths && parsed.weaknesses && parsed.recommendations) {
          strengths = parsed.strengths;
          weaknesses = parsed.weaknesses;
          recommendations = parsed.recommendations;
        }
      }
    } catch (err) {
      console.error("Gemini API call failed, falling back to rule-based insights:", err);
    }
  }

  // Create the database record
  return await prisma.aIAnalysis.create({
    data: {
      studentId: id,
      performanceScore: parseFloat(performanceScore),
      riskLevel,
      strengths,
      weaknesses,
      recommendations,
    },
  });
};

const getLatestAnalysis = async (studentId) => {
  const id = parseInt(studentId);
  const analysis = await prisma.aIAnalysis.findFirst({
    where: { studentId: id },
    orderBy: { createdAt: "desc" },
  });

  // If no analysis exists yet, generate one on the fly
  if (!analysis) {
    return await generateAIInsights(id);
  }

  return analysis;
};

module.exports = {
  calculateStudentAnalytics,
  generateAIInsights,
  getLatestAnalysis,
};
