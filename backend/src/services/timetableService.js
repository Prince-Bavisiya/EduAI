const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const toMins = (t) => {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const checkOverlap = async ({ id, day, startTime, endTime, room, teacherId, courseId, semester }) => {
  const startMins = toMins(startTime);
  const endMins = toMins(endTime);

  if (startMins >= endMins) {
    throw new AppError("End time must be after start time", 400);
  }

  // Load all records for the same day
  const existing = await prisma.timetable.findMany({
    where: {
      day,
      NOT: id ? { id: parseInt(id) } : undefined,
    },
  });

  for (const item of existing) {
    const itemStart = toMins(item.startTime);
    const itemEnd = toMins(item.endTime);

    // Overlap condition: startMins < itemEnd && endMins > itemStart
    const overlaps = (startMins < itemEnd) && (endMins > itemStart);

    if (overlaps) {
      if (item.room === room) {
        throw new AppError(`Room conflict: Room ${room} is already booked on ${day} from ${item.startTime} to ${item.endTime}`, 409);
      }
      if (item.teacherId === parseInt(teacherId)) {
        throw new AppError(`Teacher conflict: Teacher is already scheduled on ${day} from ${item.startTime} to ${item.endTime}`, 409);
      }
      if (item.courseId === parseInt(courseId) && item.semester === parseInt(semester)) {
        throw new AppError(`Class conflict: Course/Semester class is already scheduled on ${day} from ${item.startTime} to ${item.endTime}`, 409);
      }
    }
  }
};

const createTimetable = async ({ day, startTime, endTime, room, subjectId, teacherId, courseId, semester }) => {
  // Validate overlap and fields
  await checkOverlap({
    day,
    startTime,
    endTime,
    room,
    teacherId,
    courseId,
    semester,
  });

  return await prisma.timetable.create({
    data: {
      day,
      startTime,
      endTime,
      room,
      subjectId: parseInt(subjectId),
      teacherId: parseInt(teacherId),
      courseId: parseInt(courseId),
      semester: parseInt(semester) || 1,
    },
    include: {
      course: true,
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });
};

const getTimetable = async ({ day, courseId, semester, teacherId, studentId }) => {
  const where = {};

  if (day) {
    where.day = day;
  }

  if (teacherId) {
    where.teacherId = parseInt(teacherId);
  }

  if (courseId) {
    where.courseId = parseInt(courseId);
  }

  if (semester) {
    where.semester = parseInt(semester);
  }

  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });
    if (!student) {
      return [];
    }
    // Filter to the student's exact course and semester
    where.courseId = student.courseId;
    where.semester = student.semester;
  }

  return await prisma.timetable.findMany({
    where,
    include: {
      course: true,
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: [
      { day: "asc" },
      { startTime: "asc" },
    ],
  });
};

const getTimetableById = async (id) => {
  const item = await prisma.timetable.findUnique({
    where: { id: parseInt(id) },
    include: {
      course: true,
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!item) {
    throw new Error("Timetable slot not found");
  }

  return item;
};

const updateTimetable = async (id, updates) => {
  const existing = await prisma.timetable.findUnique({
    where: { id: parseInt(id) },
  });

  if (!existing) {
    throw new Error("Timetable slot not found");
  }

  // Merge fields to perform check
  const day = updates.day || existing.day;
  const startTime = updates.startTime || existing.startTime;
  const endTime = updates.endTime || existing.endTime;
  const room = updates.room || existing.room;
  const teacherId = updates.teacherId !== undefined ? updates.teacherId : existing.teacherId;
  const courseId = updates.courseId !== undefined ? updates.courseId : existing.courseId;
  const semester = updates.semester !== undefined ? updates.semester : existing.semester;

  await checkOverlap({
    id,
    day,
    startTime,
    endTime,
    room,
    teacherId,
    courseId,
    semester,
  });

  const data = {};
  if (updates.day) data.day = updates.day;
  if (updates.startTime) data.startTime = updates.startTime;
  if (updates.endTime) data.endTime = updates.endTime;
  if (updates.room) data.room = updates.room;
  if (updates.subjectId !== undefined) data.subjectId = parseInt(updates.subjectId);
  if (updates.teacherId !== undefined) data.teacherId = parseInt(updates.teacherId);
  if (updates.courseId !== undefined) data.courseId = parseInt(updates.courseId);
  if (updates.semester !== undefined) data.semester = parseInt(updates.semester);

  return await prisma.timetable.update({
    where: { id: parseInt(id) },
    data,
    include: {
      course: true,
      subject: true,
      teacher: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });
};

const deleteTimetable = async (id) => {
  const existing = await prisma.timetable.findUnique({
    where: { id: parseInt(id) },
  });

  if (!existing) {
    throw new Error("Timetable slot not found");
  }

  await prisma.timetable.delete({
    where: { id: parseInt(id) },
  });

  return { success: true, message: "Timetable slot deleted successfully" };
};

module.exports = {
  createTimetable,
  getTimetable,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
};
