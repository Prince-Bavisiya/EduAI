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
  const ts = Date.now();
  console.log(`🧪 STARTING FULL API INTEGRATION TESTING SUITE (ID: api-test-${ts})...\n`);

  let failures = 0;
  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
    } else {
      console.log(`  ❌ FAILED: ${message}`);
      failures++;
    }
  };

  const assertThrows = async (fn, message) => {
    try {
      await fn();
      console.log(`  ❌ FAILED (Expected throw): ${message}`);
      failures++;
    } catch (err) {
      console.log(`  ✅ PASSED (Caught expected error): ${message} (${err.message})`);
    }
  };

  // Setup test account credentials
  const emailAlpha = `owner.alpha.${ts}@test.com`;
  const emailBeta = `owner.beta.${ts}@test.com`;
  const schoolAlphaName = `School Alpha ${ts}`;
  const schoolBetaName = `School Beta ${ts}`;
  const testPassword = `Pass12345`;

  let schoolAlphaId, schoolBetaId;
  let ownerAlphaUserId, ownerBetaUserId;
  let tokenAlpha, tokenBeta;

  // ==================================================
  // 1. SCHOOL ONBOARDING & TRANSITION TESTS
  // ==================================================
  console.log("\n🏫 --- 1. Testing School Onboarding ---");

  // A. Create School Alpha
  const resOnboardAlpha = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolName: schoolAlphaName,
      name: `Alpha Owner ${ts}`,
      email: emailAlpha,
      password: testPassword
    })
  });
  const dataOnboardAlpha = await resOnboardAlpha.json();
  assert(resOnboardAlpha.status === 201, "Register School Alpha returns HTTP 201 Created");
  if (dataOnboardAlpha.data) {
    schoolAlphaId = dataOnboardAlpha.data.school.id;
    ownerAlphaUserId = dataOnboardAlpha.data.user.id;
  }

  // B. Create School Beta
  const resOnboardBeta = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolName: schoolBetaName,
      name: `Beta Owner ${ts}`,
      email: emailBeta,
      password: testPassword
    })
  });
  const dataOnboardBeta = await resOnboardBeta.json();
  assert(resOnboardBeta.status === 201, "Register School Beta returns HTTP 201 Created");
  if (dataOnboardBeta.data) {
    schoolBetaId = dataOnboardBeta.data.school.id;
    ownerBetaUserId = dataOnboardBeta.data.user.id;
  }

  // C. Test Duplicate Onboarding
  const resDupOnboard = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolName: `Duplicate School ${ts}`,
      name: `Owner Duplicate ${ts}`,
      email: emailAlpha, // Duplicate email
      password: testPassword
    })
  });
  assert(resDupOnboard.status === 409, "Registering with duplicate email returns HTTP 409 Conflict");

  // D. Validation Checks
  const resShortPass = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schoolName: `Valid School ${ts}`,
      name: `Owner Valid ${ts}`,
      email: `valid.${ts}@test.com`,
      password: `123` // Password too short
    })
  });
  assert(resShortPass.status === 400, "Registering with short password returns HTTP 400 Bad Request");

  // ==================================================
  // 2. TRANSACTION ROLLBACK
  // ==================================================
  console.log("\n📦 --- 2. Testing Transaction Rollback ---");
  await assertThrows(async () => {
    await basePrisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name: `Rollback School ${ts}`, slug: `rollback-slug-${ts}` }
      });
      // Cause deliberate failure to trigger transaction rollback
      throw new Error("Deliberate rollback query failure");
    });
  }, "Database transaction fails deliberately");

  const rollbackCheck = await basePrisma.school.findUnique({
    where: { slug: `rollback-slug-${ts}` }
  });
  assert(rollbackCheck === null, "Transaction rollback successfully deletes partially-created school");

  // ==================================================
  // 3. AUTHENTICATION & PORTAL BOUNDARIES
  // ==================================================
  console.log("\n🔑 --- 3. Testing Authentication & Portals ---");

  // A. Valid Login
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  const loginResAlpha = await login(emailAlpha, testPassword);
  assert(loginResAlpha.status === 200, "Valid login returns HTTP 200 OK");
  tokenAlpha = loginResAlpha.data.data?.token;

  const loginResBeta = await login(emailBeta, testPassword);
  tokenBeta = loginResBeta.data.data?.token;

  // B. Invalid Logins
  const loginWrongPass = await login(emailAlpha, "wrong-pass");
  assert(loginWrongPass.status === 401, "Login with incorrect password returns HTTP 401 Unauthorized");

  const loginUnknownEmail = await login("unknown@test.com", testPassword);
  assert(loginUnknownEmail.status === 401, "Login with unknown email returns HTTP 401 Unauthorized");

  // C. Portal Access Check
  // Super Admin has access to all resources (architectural rule), so /users/admin-only should return 200
  const resSuperAdminOnAdmin = await fetch(`${API_BASE}/users/admin-only`, {
    headers: { Authorization: `Bearer ${tokenAlpha}` }
  });
  assert(resSuperAdminOnAdmin.status === 200, "Super Admin (Owner) has default access to Admin-only API route (returns HTTP 200)");

  // Try to access superadmin dashboard without token
  const resNoToken = await fetch(`${API_BASE}/superadmin/dashboard`);
  assert(resNoToken.status === 401, "Accessing Super Admin dashboard without JWT token returns HTTP 401 Unauthorized");

  // ==================================================
  // 4. STUDENTS & TEACHERS CRUD & ISOLATION
  // ==================================================
  console.log("\n👨‍🎓 --- 4. Testing Students & Teachers CRUD & Isolation ---");

  // Need to create classes and departments first inside School Alpha (using Alpha token)
  // Let's create Course (Class)
  const resCreateClassAlpha = await fetch(`${API_BASE}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({ name: `Class Alpha ${ts}`, capacity: 40 })
  });
  const dataClassAlpha = await resCreateClassAlpha.json();
  assert(resCreateClassAlpha.status === 201, "Create Class Alpha returns HTTP 201 Created");
  const classAlphaId = dataClassAlpha.data?.id;

  // Test capacity constraints
  const resClassNegativeCap = await fetch(`${API_BASE}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({ name: `Class Invalid ${ts}`, capacity: -10 })
  });
  assert(resClassNegativeCap.status === 400, "Creating class with negative capacity returns HTTP 400 Bad Request");

  // Query existing departments (seeded by system)
  const resGetDepts = await fetch(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${tokenAlpha}` }
  });
  const dataGetDepts = await resGetDepts.json();
  const deptAlphaId = dataGetDepts.data && dataGetDepts.data.length > 0 ? dataGetDepts.data[0].id : null;

  // Create Subject
  const resCreateSubjectAlpha = await fetch(`${API_BASE}/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({ name: `Subject Alpha ${ts}`, code: `SUB-${ts}`, courseId: classAlphaId })
  });
  const dataSubjectAlpha = await resCreateSubjectAlpha.json();
  assert(resCreateSubjectAlpha.status === 201, "Create Subject Alpha returns HTTP 201 Created");
  const subjectAlphaId = dataSubjectAlpha.data?.id;

  // Create Subject with duplicate code
  const resCreateDupSubject = await fetch(`${API_BASE}/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({ name: `Subject Duplicate ${ts}`, code: `SUB-${ts}`, courseId: classAlphaId })
  });
  assert(resCreateDupSubject.status === 409, "Creating subject with duplicate code returns HTTP 409 Conflict");

  // Create Teacher
  const resCreateTeacherAlpha = await fetch(`${API_BASE}/teachers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      name: `Teacher Alpha ${ts}`,
      email: `teacher.alpha.${ts}@test.com`,
      password: testPassword,
      departmentId: deptAlphaId,
      subjects: [subjectAlphaId]
    })
  });
  const dataTeacherAlpha = await resCreateTeacherAlpha.json();
  assert(resCreateTeacherAlpha.status === 201, "Create Teacher Alpha returns HTTP 201 Created");
  const teacherAlphaId = dataTeacherAlpha.data?.id;

  // Create Student Alpha
  const resCreateStudentAlpha = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      name: `Student Alpha ${ts}`,
      email: `student.alpha.${ts}@test.com`,
      password: testPassword,
      studentId: `STU-ALPHA-${ts}`,
      semester: 1,
      courseId: classAlphaId
    })
  });
  const dataStudentAlpha = await resCreateStudentAlpha.json();
  assert(resCreateStudentAlpha.status === 201, "Create Student Alpha returns HTTP 201 Created");
  const studentAlphaId = dataStudentAlpha.data?.id;
  const studentAlphaUserId = dataStudentAlpha.data?.userId;

  // Setup Beta Student
  const resCreateClassBeta = await fetch(`${API_BASE}/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenBeta}` },
    body: JSON.stringify({ name: `Class Beta ${ts}`, capacity: 40 })
  });
  const dataClassBeta = await resCreateClassBeta.json();
  const classBetaId = dataClassBeta.data?.id;

  const resCreateStudentBeta = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenBeta}` },
    body: JSON.stringify({
      name: `Student Beta ${ts}`,
      email: `student.beta.${ts}@test.com`,
      password: testPassword,
      studentId: `STU-BETA-${ts}`,
      semester: 1,
      courseId: classBetaId
    })
  });
  const dataStudentBeta = await resCreateStudentBeta.json();
  const studentBetaId = dataStudentBeta.data?.id;

  // Cross-School Student Query Checks
  const resBetaStudentFromAlphaToken = await fetch(`${API_BASE}/students/${studentBetaId}`, {
    headers: { Authorization: `Bearer ${tokenAlpha}` }
  });
  assert([403, 404].includes(resBetaStudentFromAlphaToken.status), "Cross-tenant access of School Beta student from School Alpha token is denied with 403 or 404");

  // ==================================================
  // 5. TIMETABLE, ATTENDANCE & ACADEMICS
  // ==================================================
  console.log("\n🗓️ --- 5. Testing Timetable, Attendance & Academics ---");

  // Create Timetable Slot
  const resCreateTimetable = await fetch(`${API_BASE}/timetable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      day: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Room 101",
      semester: 1,
      subjectId: subjectAlphaId,
      courseId: classAlphaId,
      teacherId: teacherAlphaId
    })
  });
  assert(resCreateTimetable.status === 201, "Create Timetable slot returns HTTP 201 Created");

  // Mark Attendance
  const resMarkAttendance = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      studentId: studentAlphaId,
      subjectId: subjectAlphaId,
      date: new Date().toISOString().split("T")[0],
      status: "PRESENT"
    })
  });
  const dataMarkAttendance = await resMarkAttendance.json();
  console.log("Mark Attendance status:", resMarkAttendance.status, "body:", dataMarkAttendance);
  assert(resMarkAttendance.status === 201, "Mark student attendance returns HTTP 201 Created");

  // Cross-tenant attendance marking attempt (Try to mark Beta student attendance from Alpha token)
  const resMarkBetaAttendanceFromAlpha = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      studentId: studentBetaId,
      subjectId: subjectAlphaId,
      date: new Date().toISOString().split("T")[0],
      status: "PRESENT"
    })
  });
  const dataMarkBetaAttendanceFromAlpha = await resMarkBetaAttendanceFromAlpha.json();
  console.log("Cross-tenant Attendance status:", resMarkBetaAttendanceFromAlpha.status, "body:", dataMarkBetaAttendanceFromAlpha);
  assert([403, 404].includes(resMarkBetaAttendanceFromAlpha.status), "Cross-tenant marking of attendance is blocked with 403/404");

  // ==================================================
  // 6. EXAMS & MARKS
  // ==================================================
  console.log("\n📝 --- 6. Testing Exams & Marks ---");

  // Create Exam
  const resCreateExam = await fetch(`${API_BASE}/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      name: `Exam Alpha ${ts}`,
      semester: 1,
      examDate: new Date(Date.now() + 86400000).toISOString(),
      totalMarks: 100,
      subjectId: subjectAlphaId
    })
  });
  const dataExam = await resCreateExam.json();
  assert(resCreateExam.status === 201, "Create Exam returns HTTP 201 Created");
  const examId = dataExam.data?.id;

  // Enter Marks
  const resEnterMark = await fetch(`${API_BASE}/marks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      studentId: studentAlphaId,
      subjectId: subjectAlphaId,
      examId: examId,
      marks: 85
    })
  });
  const dataEnterMark = await resEnterMark.json();
  console.log("Enter Mark status:", resEnterMark.status, "body:", dataEnterMark);
  assert(resEnterMark.status === 201, "Enter Exam Marks returns HTTP 201 Created");

  // ==================================================
  // 7. ASSIGNMENTS
  // ==================================================
  console.log("\n📚 --- 7. Testing Assignments ---");

  // Create Assignment
  const resCreateAssignment = await fetch(`${API_BASE}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      title: `Assignment Alpha ${ts}`,
      description: `Test homework description`,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      maxMarks: 100,
      subjectId: subjectAlphaId
    })
  });
  assert(resCreateAssignment.status === 201, "Create Assignment returns HTTP 201 Created");

  // ==================================================
  // 8. FEES & PAYMENTS VALIDATIONS
  // ==================================================
  console.log("\n💳 --- 8. Testing Fees & Payments Validations ---");

  // Create Fee
  const resCreateFee = await fetch(`${API_BASE}/fees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      studentId: studentAlphaId,
      amount: 1200,
      dueDate: new Date(Date.now() + 86400000).toISOString()
    })
  });
  const dataFee = await resCreateFee.json();
  assert(resCreateFee.status === 201, "Create Fee returns HTTP 201 Created");
  const feeId = dataFee.data?.id;

  // Test Negative Fee Amount
  const resCreateNegativeFee = await fetch(`${API_BASE}/fees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      studentId: studentAlphaId,
      amount: -500,
      dueDate: new Date().toISOString()
    })
  });
  assert(resCreateNegativeFee.status === 400, "Creating fee with negative amount returns HTTP 400 Bad Request");

  // Test Record Payment
  const resRecordPayment = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      feeId: feeId,
      amount: 500,
      transactionId: `TX-TEST-${ts}`
    })
  });
  assert(resRecordPayment.status === 201, "Record payment returns HTTP 201 Created");

  // Test Overpayment Block
  const resOverpayment = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      feeId: feeId,
      amount: 1000, // Remaining balance is 700. 1000 exceeds it
      transactionId: `TX-OVERPAY-${ts}`
    })
  });
  assert(resOverpayment.status === 400, "Overpayment exceeding outstanding balance is blocked with HTTP 400 Bad Request");

  // ==================================================
  // 9. SETTINGS & PROFILE UPDATES
  // ==================================================
  console.log("\n⚙️ --- 9. Testing Settings & Profile Updates ---");

  // Update School profile
  const resUpdateSchoolProfile = await fetch(`${API_BASE}/superadmin/school`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenAlpha}` },
    body: JSON.stringify({
      email: "invalid-email-format"
    })
  });
  assert(resUpdateSchoolProfile.status === 400, "Profile update with malformed email format returns HTTP 400 Bad Request");

  // ==================================================
  // 10. /api/me & IDOR CONTROLS
  // ==================================================
  console.log("\n👤 --- 10. Testing /api/me & IDOR Checks ---");

  // Log in as student
  const tokenStudentAlpha = (await login(`student.alpha.${ts}@test.com`, testPassword)).data?.data?.token;

  // Retrieve own fees
  const resStudentFees = await fetch(`${API_BASE}/me/fees`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  const dataStudentFees = await resStudentFees.json();
  assert(
    resStudentFees.status === 200 && dataStudentFees.data?.length === 1 && dataStudentFees.data[0].amount === 1200,
    "Student Alpha fetches own fees successfully"
  );

  // Student Alpha IDOR lookup block (try to access Beta student directly via /api/students/:id)
  const resStudentAlphaIdor = await fetch(`${API_BASE}/students/${studentBetaId}`, {
    headers: { Authorization: `Bearer ${tokenStudentAlpha}` }
  });
  assert(resStudentAlphaIdor.status === 403, "Student Alpha direct query for Student Beta details returns HTTP 403 Forbidden");

  // ==================================================
  // 11. BULK OPERATIONS & TENANT CONTEXT
  // ==================================================
  console.log("\n📦 --- 11. Testing Bulk Scoping Isolation ---");

  // Execute updateMany under School Alpha context. (Requires context simulation via HTTP context)
  // Let's verify that Beta records remain untouched in the basePrisma database
  await tenantContext.run({ schoolId: schoolAlphaId }, async () => {
    await prisma.student.updateMany({
      data: { semester: 5 }
    });
  });

  const checkStudentBeta = await basePrisma.student.findUnique({
    where: { id: studentBetaId }
  });
  assert(checkStudentBeta.semester === 1, "Prisma updateMany under School Alpha does NOT modify School Beta students");

  // ==================================================
  // 12. ERROR HANDLING PRIVACY AUDIT
  // ==================================================
  console.log("\n🔒 --- 12. Testing Error Handling Consistency & Privacy ---");

  const resErrorPrisma = await fetch(`${API_BASE}/courses/invalid-id-string`, {
    headers: { Authorization: `Bearer ${tokenAlpha}` }
  });
  const dataErrorPrisma = await resErrorPrisma.json();
  assert(
    [400, 404, 500].includes(resErrorPrisma.status) &&
    !JSON.stringify(dataErrorPrisma).includes("PrismaClientKnownRequestError") &&
    !JSON.stringify(dataErrorPrisma).includes("d:\\Student"),
    "Prisma database internal details and source paths are not leaked in error responses"
  );

  // ==================================================
  // CLEANUP TEST DATA
  // ==================================================
  console.log("\n🧹 Cleaning up API integration test allocations...");
  await basePrisma.payment.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.fee.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.mark.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.attendance.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.assignmentSubmission.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.assignment.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.timetable.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.student.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.teacher.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.user.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.subject.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.course.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.department.deleteMany({ where: { schoolId: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.school.deleteMany({ where: { id: { in: [schoolAlphaId, schoolBetaId] } } });
  await basePrisma.$disconnect();

  console.log("\n🏁 INTEGRATION TESTING COMPLETE.");
  if (failures === 0) {
    console.log("🌟 ALL EXECUTED INTEGRATION AND SECURITY REGRESSION TESTS PASSED!");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} INTEGRATION TEST FAILURE(S) DETECTED.`);
    process.exit(1);
  }
}

// Emulate simple mock context wrapper if not executed in server thread
const tenantContext = {
  run: (store, callback) => {
    const context = require("../utils/context");
    context.run(store, callback);
  }
};
const prisma = require("../config/prisma");

runTests().catch(err => {
  console.error("Integration testing crashed:", err);
  process.exit(1);
});
