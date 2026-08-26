-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- Add missing baseline columns from schema expansions
ALTER TABLE "Assignment" ADD COLUMN "maxMarks" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "AssignmentSubmission" ADD COLUMN "percentage" DOUBLE PRECISION;
ALTER TABLE "Attendance" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Attendance" ADD COLUMN "subjectId" INTEGER NOT NULL;
ALTER TABLE "Exam" ADD COLUMN "subjectId" INTEGER NOT NULL;
ALTER TABLE "Mark" ADD COLUMN "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "AIAnalysis" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Mark" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "schoolId" INTEGER,
ADD COLUMN     "semester" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "studentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "schoolId" INTEGER,
ADD COLUMN     "sessions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "schoolId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "schoolId" INTEGER;

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" SERIAL NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolId" INTEGER,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "School_ownerId_key" ON "School"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_day_startTime_room_key" ON "Timetable"("day", "startTime", "room");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_day_startTime_teacherId_key" ON "Timetable"("day", "startTime", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_day_startTime_courseId_semester_key" ON "Timetable"("day", "startTime", "courseId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_subjectId_date_key" ON "Attendance"("studentId", "subjectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_schoolId_key" ON "Department"("name", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_schoolId_key" ON "Student"("studentId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_schoolId_key" ON "Subject"("code", "schoolId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT IF EXISTS "Attendance_subjectId_fkey";
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_subjectId_fkey";
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" DROP CONSTRAINT IF EXISTS "Mark_examId_fkey";
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" DROP CONSTRAINT IF EXISTS "Mark_studentId_fkey";
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" DROP CONSTRAINT IF EXISTS "Mark_subjectId_fkey";
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mark" ADD CONSTRAINT "Mark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_subjectId_fkey";
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT IF EXISTS "AssignmentSubmission_assignmentId_fkey";
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" DROP CONSTRAINT IF EXISTS "AssignmentSubmission_studentId_fkey";
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" DROP CONSTRAINT IF EXISTS "Timetable_subjectId_fkey";
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" DROP CONSTRAINT IF EXISTS "Timetable_teacherId_fkey";
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" DROP CONSTRAINT IF EXISTS "Timetable_courseId_fkey";
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
