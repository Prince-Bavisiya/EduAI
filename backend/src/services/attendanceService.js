const prisma = require("../config/prisma");

const normalizeDate = (dateVal) => {
  const d = new Date(dateVal);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const markAttendance = async ({ studentId, subjectId, date, status }) => {
  const cleanDate = normalizeDate(date);
  return prisma.attendance.upsert({
    where: {
      studentId_subjectId_date: {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        date: cleanDate,
      },
    },
    update: {
      status,
    },
    create: {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      date: cleanDate,
      status,
    },
  });
};

const getAttendance = async ({ subjectId, date, courseId }) => {
  const where = {};
  if (subjectId) {
    where.subjectId = Number(subjectId);
  }
  if (date) {
    where.date = normalizeDate(date);
  }
  if (courseId) {
    where.student = {
      courseId: Number(courseId),
    };
  }
  return prisma.attendance.findMany({
    where,
    include: {
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      subject: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

const getStudentAttendance = async (studentId) => {
  return prisma.attendance.findMany({
    where: {
      studentId: Number(studentId),
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
};

const updateAttendance = async (id, { status }) => {
  return prisma.attendance.update({
    where: {
      id: Number(id),
    },
    data: {
      status,
    },
  });
};

const calculateAttendancePercentage = async (studentId) => {
  const records = await prisma.attendance.findMany({
    where: {
      studentId: Number(studentId),
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (records.length === 0) {
    return {
      studentId: Number(studentId),
      overallAttendance: 0,
      subjects: [],
    };
  }

  const subjectStats = {};
  let presentOrLateCount = 0;

  records.forEach((record) => {
    const subId = record.subjectId;
    const subName = record.subject.name;
    const subCode = record.subject.code;

    if (!subjectStats[subId]) {
      subjectStats[subId] = {
        subjectId: subId,
        subjectName: subName,
        subjectCode: subCode,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      };
    }

    subjectStats[subId].total += 1;
    if (record.status === "PRESENT") {
      subjectStats[subId].present += 1;
      presentOrLateCount += 1;
    } else if (record.status === "LATE") {
      subjectStats[subId].late += 1;
      presentOrLateCount += 1;
    } else {
      subjectStats[subId].absent += 1;
    }
  });

  const subjects = Object.values(subjectStats).map((stat) => {
    const attended = stat.present + stat.late;
    const percentage = stat.total > 0 ? Math.round((attended / stat.total) * 100) : 0;
    return {
      subjectId: stat.subjectId,
      subjectName: stat.subjectName,
      subjectCode: stat.subjectCode,
      present: stat.present,
      absent: stat.absent,
      late: stat.late,
      total: stat.total,
      percentage,
    };
  });

  const overallAttendance = Math.round((presentOrLateCount / records.length) * 100);

  return {
    studentId: Number(studentId),
    overallAttendance,
    subjects,
  };
};

const markAttendanceBatch = async (records) => {
  return prisma.$transaction(
    records.map((item) => {
      const cleanDate = normalizeDate(item.date);
      return prisma.attendance.upsert({
        where: {
          studentId_subjectId_date: {
            studentId: Number(item.studentId),
            subjectId: Number(item.subjectId),
            date: cleanDate,
          },
        },
        update: {
          status: item.status,
        },
        create: {
          studentId: Number(item.studentId),
          subjectId: Number(item.subjectId),
          date: cleanDate,
          status: item.status,
        },
      });
    })
  );
};

module.exports = {
  markAttendance,
  markAttendanceBatch,
  getAttendance,
  getStudentAttendance,
  updateAttendance,
  calculateAttendancePercentage,
};
