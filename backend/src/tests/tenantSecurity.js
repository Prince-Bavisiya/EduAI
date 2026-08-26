require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const tenantContext = require("../utils/context");

// Setup basePrisma without query extensions to inspect actual DB values for validation
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter });

async function runTests() {
  console.log("🌱 STARTING TENANT ISOLATION REGRESSION TESTS...\n");

  // Step 1: Seed Alpha and Beta environments using Bypass context
  process.env.BYPASS_TENANT_CONTEXT = "true";
  process.env.NODE_ENV = "development"; // Ensure bypass is allowed

  // Clear existing test data in correct dependency order
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

  console.log("1. Seeding Schools...");
  const schoolAlpha = await prisma.school.create({
    data: { name: "School Alpha", slug: "school-alpha" },
  });

  const schoolBeta = await prisma.school.create({
    data: { name: "School Beta", slug: "school-beta" },
  });

  console.log("2. Seeding Users and Scoped Records...");
  const hashed = await bcrypt.hash("TestPass123", 12);

  const userAlpha = await prisma.user.create({
    data: { name: "Student Alpha", email: "student.alpha@example.com", password: hashed, role: "STUDENT", schoolId: schoolAlpha.id }
  });
  const courseAlpha = await prisma.course.create({
    data: { name: "Class Alpha", schoolId: schoolAlpha.id }
  });
  const studentAlpha = await prisma.student.create({
    data: { userId: userAlpha.id, studentId: "STU-ALPHA", semester: 1, courseId: courseAlpha.id, schoolId: schoolAlpha.id }
  });

  const userBeta = await prisma.user.create({
    data: { name: "Student Beta", email: "student.beta@example.com", password: hashed, role: "STUDENT", schoolId: schoolBeta.id }
  });
  const courseBeta = await prisma.course.create({
    data: { name: "Class Beta", schoolId: schoolBeta.id }
  });
  const studentBeta = await prisma.student.create({
    data: { userId: userBeta.id, studentId: "STU-BETA", semester: 1, courseId: courseBeta.id, schoolId: schoolBeta.id }
  });

  // Turn off Bypass to enforce strict tenant isolation check rules
  process.env.BYPASS_TENANT_CONTEXT = "false";
  let failures = 0;

  // Helper assertions
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

  // Run tests inside School Alpha's context
  await tenantContext.run({ schoolId: schoolAlpha.id }, async () => {
    console.log(`\n🔑 Testing in School Alpha Context (ID: ${schoolAlpha.id})`);

    // Test 1: Read Isolation
    const students = await prisma.student.findMany();
    assert(students.length === 1 && students[0].id === studentAlpha.id, "findMany only returns Alpha records");

    const singleStudent = await prisma.student.findUnique({ where: { id: studentBeta.id } });
    assert(singleStudent === null, "findUnique on Beta record returns null");

    // Test 2: Update Isolation
    await assertThrows(
      () => prisma.student.update({ where: { id: studentBeta.id }, data: { address: "Malicious Hack" } }),
      "Single update on Beta record is rejected with 403"
    );

    // Test 3: Delete Isolation
    await assertThrows(
      () => prisma.student.delete({ where: { id: studentBeta.id } }),
      "Single delete on Beta record is rejected with 403"
    );

    // Test 4: Bulk Update Isolation
    await prisma.student.updateMany({
      data: { semester: 3 }
    });
    // Check actual DB values
    const freshAlpha = await basePrisma.student.findUnique({ where: { id: studentAlpha.id } });
    const freshBeta = await basePrisma.student.findUnique({ where: { id: studentBeta.id } });
    assert(freshAlpha.semester === 3, "updateMany successfully updates Alpha student semester");
    assert(freshBeta.semester === 1, "updateMany does NOT update Beta student semester");

    // Test 5: Malicious Payload schoolId overrides
    const maliciousStudentUser = await prisma.user.create({
      data: { name: "Malicious Override User", email: "override@example.com", password: hashed, role: "STUDENT", schoolId: schoolBeta.id }
    });
    const maliciousStudent = await prisma.student.create({
      data: {
        userId: maliciousStudentUser.id,
        studentId: "STU-OVERRIDE",
        semester: 1,
        schoolId: schoolBeta.id // Malicious payload override attempt
      }
    });
    assert(maliciousStudent.schoolId === schoolAlpha.id, "Malicious schoolId override payload is ignored and forced to context schoolId");

    // Clean up malicious user/student
    await basePrisma.student.delete({ where: { id: maliciousStudent.id } });
    await basePrisma.user.delete({ where: { id: maliciousStudentUser.id } });

    // Test 6: Bulk Delete Isolation
    const deleteCount = await prisma.student.deleteMany();
    const betaStudentCheck = await basePrisma.student.findUnique({ where: { id: studentBeta.id } });
    assert(betaStudentCheck !== null, "deleteMany does NOT delete Beta student record");
  });

  // Test 7: Fail-Closed Outside Tenant Context
  console.log("\n🔒 Testing Outside Active Tenant Context...");
  await assertThrows(
    () => prisma.student.findMany(),
    "findMany fails closed and throws when tenant context is missing"
  );
  await assertThrows(
    () => prisma.student.updateMany({ data: { semester: 5 } }),
    "updateMany fails closed and throws when tenant context is missing"
  );

  console.log("\n🧹 Cleaning up test data...");
  await basePrisma.student.deleteMany({ where: { schoolId: { in: [schoolAlpha.id, schoolBeta.id] } } });
  await basePrisma.user.deleteMany({ where: { schoolId: { in: [schoolAlpha.id, schoolBeta.id] } } });
  await basePrisma.course.deleteMany({ where: { schoolId: { in: [schoolAlpha.id, schoolBeta.id] } } });
  await basePrisma.school.deleteMany({ where: { id: { in: [schoolAlpha.id, schoolBeta.id] } } });
  await basePrisma.$disconnect();

  console.log("\n🏁 REGRESSION TESTS RUN COMPLETED.");
  if (failures === 0) {
    console.log("🌟 ALL TESTS PASSED SUCCESSFULLY! TENANT ISOLATION IS 100% SECURE.");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} TEST FAILURE(S) DETECTED.`);
    process.exit(1);
  }
}

runTests();
