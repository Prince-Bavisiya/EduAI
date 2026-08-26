require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}/api`;

async function runTests() {
  console.log("🧪 STARTING PORTAL ROLE-BASED ACCESS & TENANT ISOLATION TESTS...\n");

  // Step 1: Create test environment
  console.log("1. Seeding test accounts...");
  const hashed = await bcrypt.hash("Pass12345", 12);

  // Clear existing test entries in correct dependency order
  await basePrisma.payment.deleteMany({});
  await basePrisma.fee.deleteMany({});
  await basePrisma.mark.deleteMany({});
  await basePrisma.attendance.deleteMany({});
  await basePrisma.assignmentSubmission.deleteMany({});
  await basePrisma.assignment.deleteMany({});
  await basePrisma.aIAnalysis.deleteMany({});
  await basePrisma.timetable.deleteMany({});
  await basePrisma.student.deleteMany({});
  await basePrisma.teacher.deleteMany({});
  await basePrisma.admin.deleteMany({});
  await basePrisma.user.deleteMany({});
  await basePrisma.subject.deleteMany({});
  await basePrisma.course.deleteMany({});
  await basePrisma.department.deleteMany({});
  await basePrisma.school.deleteMany({});

  const schoolAlpha = await basePrisma.school.create({
    data: { name: "Security Test Alpha", slug: "sec-alpha-" + Date.now() }
  });

  const schoolBeta = await basePrisma.school.create({
    data: { name: "Security Test Beta", slug: "sec-beta-" + Date.now() }
  });

  // Seed Users for Alpha
  const userAdminAlpha = await basePrisma.user.create({
    data: { name: "Admin Alpha", email: "admin.alpha@example.com", password: hashed, role: "ADMIN", schoolId: schoolAlpha.id }
  });
  await basePrisma.admin.create({
    data: { userId: userAdminAlpha.id, schoolId: schoolAlpha.id }
  });

  const userTeacherAlpha = await basePrisma.user.create({
    data: { name: "Teacher Alpha", email: "teacher.alpha@example.com", password: hashed, role: "TEACHER", schoolId: schoolAlpha.id }
  });
  const teacherAlpha = await basePrisma.teacher.create({
    data: { userId: userTeacherAlpha.id, schoolId: schoolAlpha.id }
  });

  const userStudentAlpha = await basePrisma.user.create({
    data: { name: "Student Alpha", email: "student.alpha@example.com", password: hashed, role: "STUDENT", schoolId: schoolAlpha.id }
  });
  const studentAlpha = await basePrisma.student.create({
    data: { userId: userStudentAlpha.id, studentId: "STU-A-01", semester: 1, schoolId: schoolAlpha.id }
  });

  // Seed User for Beta
  const userStudentBeta = await basePrisma.user.create({
    data: { name: "Student Beta", email: "student.beta@example.com", password: hashed, role: "STUDENT", schoolId: schoolBeta.id }
  });
  const studentBeta = await basePrisma.student.create({
    data: { userId: userStudentBeta.id, studentId: "STU-B-01", semester: 1, schoolId: schoolBeta.id }
  });

  // Create Fee for Alpha Student
  const feeAlpha = await basePrisma.fee.create({
    data: { studentId: studentAlpha.id, amount: 600, dueDate: new Date(), schoolId: schoolAlpha.id }
  });

  // Create Fee for Beta Student
  const feeBeta = await basePrisma.fee.create({
    data: { studentId: studentBeta.id, amount: 900, dueDate: new Date(), schoolId: schoolBeta.id }
  });

  console.log("2. Performing logins to acquire JWTs...");
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Login failed for ${email}: ${data.message}`);
    return data.data.token;
  };

  const tokenAdminAlpha = await login("admin.alpha@example.com", "Pass12345");
  const tokenTeacherAlpha = await login("teacher.alpha@example.com", "Pass12345");
  const tokenStudentAlpha = await login("student.alpha@example.com", "Pass12345");
  const tokenStudentBeta = await login("student.beta@example.com", "Pass12345");

  let failures = 0;
  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
    } else {
      console.log(`  ❌ FAILED: ${message}`);
      failures++;
    }
  };

  console.log("\n🔑 1. Test Admin Dashboard Statistics Retrieval");
  const resAdminDash = await fetch(`${API_BASE}/me/dashboard`, {
    headers: { Authorization: `Bearer ${tokenAdminAlpha}` }
  });
  const dataAdminDash = await resAdminDash.json();
  console.log("Admin Dashboard status:", resAdminDash.status, "body:", dataAdminDash);
  assert(resAdminDash.status === 200 && dataAdminDash.data && dataAdminDash.data.studentsCount !== undefined, "Admin dashboard stats fetch returns status 200 and student count");

  console.log("\n🔑 2. Test Teacher Dashboard Statistics Retrieval");
  const resTeacherDash = await fetch(`${API_BASE}/me/dashboard`, {
    headers: { Authorization: `Bearer ${tokenTeacherAlpha}` }
  });
  const dataTeacherDash = await resTeacherDash.json();
  console.log("Teacher Dashboard status:", resTeacherDash.status, "body:", dataTeacherDash);
  assert(resTeacherDash.status === 200 && dataTeacherDash.data && dataTeacherDash.data.attendancePercentage !== undefined, "Teacher dashboard stats fetch returns status 200");

  console.log("\n🔑 3. Test Student Dashboard Statistics Retrieval");
  const resStudentDash = await fetch(`${API_BASE}/me/dashboard`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  const dataStudentDash = await resStudentDash.json();
  console.log("Student Dashboard status:", resStudentDash.status, "body:", dataStudentDash);
  assert(resStudentDash.status === 200 && dataStudentDash.data && dataStudentDash.data.attendancePercent !== undefined, "Student dashboard stats fetch returns status 200");

  console.log("\n🔑 4. Test Student Own Fees Access");
  const resOwnFees = await fetch(`${API_BASE}/me/fees`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  const dataOwnFees = await resOwnFees.json();
  assert(resOwnFees.status === 200 && dataOwnFees.data && dataOwnFees.data.length === 1 && dataOwnFees.data[0].amount === 600, "Student Alpha successfully retrieves their own fees (600)");

  // Assert Student Beta gets only their own fees
  const resOwnFeesBeta = await fetch(`${API_BASE}/me/fees`, {
    headers: { Authorization: `Bearer ${tokenStudentBeta}` }
  });
  const dataOwnFeesBeta = await resOwnFeesBeta.json();
  assert(resOwnFeesBeta.status === 200 && dataOwnFeesBeta.data && dataOwnFeesBeta.data.length === 1 && dataOwnFeesBeta.data[0].amount === 900, "Student Beta successfully retrieves their own fees (900)");

  console.log("\n🔒 5. Test Parameter/Payload Manipulation (studentId Override)");
  // Attempt to inject studentId=8 into query parameter while logged in as Student Alpha (studentId=7)
  const resInjectedQuery = await fetch(`${API_BASE}/me/fees?studentId=` + studentBeta.id, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  const dataInjectedQuery = await resInjectedQuery.json();
  assert(
    resInjectedQuery.status === 200 &&
    dataInjectedQuery.data &&
    dataInjectedQuery.data.length === 1 &&
    dataInjectedQuery.data[0].amount === 600,
    "GET /api/me/fees ignores client-supplied studentId query parameter override"
  );

  // Attempt to inject studentId=8 into custom header
  const resInjectedBodyGet = await fetch(`${API_BASE}/me/fees`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenStudentAlpha}`,
      "X-Student-Id": String(studentBeta.id)
    }
  });
  const dataInjectedBodyGet = await resInjectedBodyGet.json();
  assert(
    resInjectedBodyGet.status === 200 &&
    dataInjectedBodyGet.data &&
    dataInjectedBodyGet.data.length === 1 &&
    dataInjectedBodyGet.data[0].amount === 600,
    "GET /api/me/fees ignores client-supplied studentId header override"
  );

  console.log("\n🔒 6. Test Cross-Student Info/Resource Denial (IDOR Checks)");

  // A. Student cannot access another student's profile via direct API (/api/students/:id)
  const resCrossProfile = await fetch(`${API_BASE}/students/${studentBeta.id}`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resCrossProfile.status === 403, "Student Alpha cannot view Student Beta's profile via /api/students/:id (denied with 403)");

  // B. Student cannot access another student's attendance via /api/attendance/student/:id
  const resCrossAttendance = await fetch(`${API_BASE}/attendance/student/${studentBeta.id}`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resCrossAttendance.status === 403, "Student Alpha cannot view Student Beta's attendance stats via /api/attendance/student/:id (denied with 403)");

  // C. Student cannot access another student's assignment submissions via /api/assignments/submissions/student/:id
  const resCrossAssignments = await fetch(`${API_BASE}/assignments/submissions/student/${studentBeta.id}`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resCrossAssignments.status === 403, "Student Alpha cannot view Student Beta's submissions via /api/assignments/submissions/student/:id (denied with 403)");

  // D. Student cannot access another student's exams/marks via /api/marks/student/:id
  const resCrossMarks = await fetch(`${API_BASE}/marks/student/${studentBeta.id}`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resCrossMarks.status === 403, "Student Alpha cannot view Student Beta's marks via /api/marks/student/:id (denied with 403)");

  console.log("\n🔒 7. Test Cross-School Fee Access Scoping");
  // Student Beta (School Beta) tries to retrieve Alpha fee record directly
  const resAlphaFeeFromBeta = await fetch(`${API_BASE}/fees/${feeAlpha.id}`, {
    headers: { Authorization: `Bearer ${tokenStudentBeta}` }
  });
  assert([403, 404].includes(resAlphaFeeFromBeta.status), "Cross-school direct fee access is denied with 403 or 404");

  console.log("\n🔒 8. Test Unauthorized Role Access & Route Protection");
  const resSuperAdminDashFromStudent = await fetch(`${API_BASE}/superadmin/dashboard`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resSuperAdminDashFromStudent.status === 403, "Student access to Super Admin dashboard is rejected with 403 Forbidden");

  const resAdminDashFromStudent = await fetch(`${API_BASE}/users/admin-only`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resAdminDashFromStudent.status === 403, "Student access to Admin-only route is rejected with 403 Forbidden");

  console.log("\n🔒 9. Test Session Restoration with Invalid JWT");
  const resInvalidJwt = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: "Bearer invalid.token.value" }
  });
  assert(resInvalidJwt.status === 401, "Restoration attempt with invalid JWT returns 401 Unauthorized");

  console.log("\n🧹 Cleaning up test users...");
  await basePrisma.payment.deleteMany({});
  await basePrisma.fee.deleteMany({});
  await basePrisma.mark.deleteMany({});
  await basePrisma.attendance.deleteMany({});
  await basePrisma.assignmentSubmission.deleteMany({});
  await basePrisma.assignment.deleteMany({});
  await basePrisma.aIAnalysis.deleteMany({});
  await basePrisma.timetable.deleteMany({});
  await basePrisma.student.deleteMany({});
  await basePrisma.teacher.deleteMany({});
  await basePrisma.user.deleteMany({});
  await basePrisma.subject.deleteMany({});
  await basePrisma.course.deleteMany({});
  await basePrisma.department.deleteMany({});
  await basePrisma.school.deleteMany({});
  await basePrisma.$disconnect();

  console.log("\n🏁 TESTS COMPLETE.");
  if (failures === 0) {
    console.log("🌟 ALL ROLE-BASED ACCESS & TENANT ISOLATION TESTS PASSED!");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} TEST FAILURE(S) DETECTED.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
