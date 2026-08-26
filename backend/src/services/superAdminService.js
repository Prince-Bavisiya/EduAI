const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const getAnalytics = async () => {
  const [totalUsers, studentCount, teacherCount, adminCount, timetableCount, auditLogCount] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.admin.count(),
    prisma.timetable.count(),
    prisma.auditLog.count(),
  ]);

  return {
    totalUsers,
    studentCount,
    teacherCount,
    adminCount,
    timetableCount,
    auditLogCount,
  };
};

const getUsers = async () => {
  // Return all users except parent roles as requested
  return prisma.user.findMany({
    where: {
      role: {
        in: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getAdmins = async () => {
  return prisma.admin.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });
};

const createAdmin = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "ADMIN",
      },
    });

    return tx.admin.create({
      data: {
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });
};

const deleteAdmin = async (adminId) => {
  const admin = await prisma.admin.findUnique({
    where: { id: parseInt(adminId) },
    include: { user: true },
  });

  if (!admin) {
    throw new AppError("Administrator not found", 404);
  }

  // Count active Admins to enforce protection of the last admin account
  const adminCount = await prisma.admin.count();
  if (adminCount <= 1) {
    throw new AppError("Cannot delete the last administrator account.", 400);
  }

  // Deleting user cascades to Admin model
  await prisma.user.delete({
    where: { id: admin.userId },
  });

  return { success: true, message: "Admin deleted successfully" };
};

const getAuditLogs = async () => {
  return prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // retrieve latest 100 entries for stability
  });
};

const getSettings = async () => {
  const settings = await prisma.systemSetting.findMany();
  // Map settings array to key-value object
  const settingsObj = {};
  for (const s of settings) {
    settingsObj[s.key] = s.value;
  }
  return settingsObj;
};

const updateSetting = async (key, value) => {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

const getDashboardData = async (schoolId) => {
  if (!schoolId) {
    throw new AppError("School context not set", 400);
  }

  // 1. Fetch School Information
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logo: true,
      address: true,
      phone: true,
      email: true,
      academicYear: true,
      workingDays: true,
      attendanceRules: true,
      createdAt: true,
    }
  });

  if (!school) {
    throw new AppError("School not found", 404);
  }

  // 2. Fetch counts (using Prisma aggregations, auto-scoped via our query extension,
  // but to be absolutely explicit, we can pass where: { schoolId })
  const [
    studentCount,
    teacherCount,
    adminCount,
    courseCount,
    subjectCount,
    examCount,
    auditLogs
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.admin.count({ where: { schoolId } }),
    prisma.course.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    prisma.exam.count({ where: { schoolId } }),
    prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  ]);

  // 3. Fetch secondary stats:
  // Today's attendance percentage
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const [totalAttendance, presentAttendance] = await Promise.all([
    prisma.attendance.count({
      where: {
        schoolId,
        date: {
          gte: today,
        }
      }
    }),
    prisma.attendance.count({
      where: {
        schoolId,
        status: "PRESENT",
        date: {
          gte: today,
        }
      }
    })
  ]);

  const attendancePercentage = totalAttendance > 0 
    ? Math.round((presentAttendance / totalAttendance) * 100) 
    : 100; // Default to 100% or show message if no attendance taken today

  // Pending fees
  const feeStats = await prisma.fee.aggregate({
    where: {
      schoolId,
      status: "PENDING"
    },
    _sum: {
      amount: true
    }
  });
  const pendingFees = feeStats._sum.amount || 0;

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: {
      user: {
        select: {
          createdAt: true,
        },
      },
    },
  });
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const growthData = months.map(m => ({ month: m, count: 0 }));
  students.forEach(s => {
    if (s.user && s.user.createdAt) {
      const monthIndex = new Date(s.user.createdAt).getMonth();
      growthData[monthIndex].count += 1;
    }
  });
  let runningTotal = 0;
  const cumulativeGrowth = growthData.map(d => {
    runningTotal += d.count;
    return { month: d.month, count: runningTotal };
  });

  return {
    school,
    stats: {
      students: studentCount,
      teachers: teacherCount,
      administrators: adminCount,
      classes: courseCount,
      subjects: subjectCount,
      exams: examCount
    },
    attendance: {
      today: attendancePercentage,
      totalCount: totalAttendance,
      presentCount: presentAttendance
    },
    fees: {
      pending: pendingFees
    },
    growth: cumulativeGrowth,
    recentActivity: auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      performedBy: log.performedBy,
      role: log.role,
      details: log.details,
      createdAt: log.createdAt
    }))
  };
};

const updateSchool = async (schoolId, { name, logo, address, phone, email, academicYear, workingDays, attendanceRules }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (logo !== undefined) data.logo = logo;
  if (address !== undefined) data.address = address;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (academicYear !== undefined) data.academicYear = academicYear;
  if (workingDays !== undefined) data.workingDays = workingDays;
  if (attendanceRules !== undefined) data.attendanceRules = attendanceRules;

  return prisma.school.update({
    where: { id: Number(schoolId) },
    data,
  });
};

const updateOwner = async (userId, { name, email, password }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== Number(userId)) {
      throw new AppError("An account with this email address already exists.", 409);
    }
    data.email = email;
  }
  if (password) {
    data.password = await bcrypt.hash(password, 12);
  }

  return prisma.user.update({
    where: { id: Number(userId) },
    data,
  });
};

module.exports = {
  getAnalytics,
  getUsers,
  getAdmins,
  createAdmin,
  deleteAdmin,
  getAuditLogs,
  getSettings,
  updateSetting,
  getDashboardData,
  updateSchool,
  updateOwner,
};
