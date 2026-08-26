require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

async function seed() {
  process.env.BYPASS_TENANT_CONTEXT = "true";
  console.log("🌱 STARTING DATABASE SEEDING...");

  // 0. Create default School
  console.log("🏫 Seeding School...");
  let demoSchool = await prisma.school.findUnique({ where: { slug: "demo-school" } });
  if (!demoSchool) {
    demoSchool = await prisma.school.create({
      data: {
        name: "Demo School",
        slug: "demo-school",
      },
    });
    console.log(`✅ Created School: ${demoSchool.name}`);
  } else {
    console.log(`ℹ️ School already exists: ${demoSchool.name}`);
  }

  // 1. Create default Departments
  console.log("🏢 Seeding Departments...");
  let cseDept = await prisma.department.findFirst({ where: { name: "Computer Science & Engineering", schoolId: demoSchool.id } });
  if (!cseDept) {
    cseDept = await prisma.department.create({
      data: {
        name: "Computer Science & Engineering",
        schoolId: demoSchool.id,
      },
    });
    console.log(`✅ Created Department: ${cseDept.name}`);
  } else {
    console.log(`ℹ️ Department already exists: ${cseDept.name}`);
  }

  let itDept = await prisma.department.findFirst({ where: { name: "Information Technology", schoolId: demoSchool.id } });
  if (!itDept) {
    itDept = await prisma.department.create({
      data: {
        name: "Information Technology",
        schoolId: demoSchool.id,
      },
    });
    console.log(`✅ Created Department: ${itDept.name}`);
  }

  // 2. Create default Course
  console.log("🏫 Seeding Course...");
  let course = await prisma.course.findFirst({ where: { name: "Computer Science & Engineering", schoolId: demoSchool.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        name: "Computer Science & Engineering",
        departmentId: cseDept.id,
        schoolId: demoSchool.id,
      },
    });
    console.log(`✅ Created Course: ${course.name}`);
  } else {
    console.log(`ℹ️ Course already exists: ${course.name}`);
  }

  // 3. Create default Admin
  console.log("🛡️ Seeding Admin account...");
  const adminEmail = "admin@example.com";
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    const hashed = await bcrypt.hash("Admin123", 12);
    adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminEmail,
        password: hashed,
        role: "ADMIN",
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Admin user (admin@example.com / Admin123)");
  } else {
    console.log("ℹ️ Admin user already exists");
  }
  let adminProfile = await prisma.admin.findUnique({ where: { userId: adminUser.id } });
  if (!adminProfile) {
    await prisma.admin.create({
      data: {
        userId: adminUser.id,
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Admin profile");
  }

  // 4. Create default Student
  console.log("👨‍🎓 Seeding Student account...");
  const studentEmail = "rahul@example.com";
  let studentUser = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!studentUser) {
    const hashed = await bcrypt.hash("Rahul123", 12);
    studentUser = await prisma.user.create({
      data: {
        name: "Rahul Sharma",
        email: studentEmail,
        password: hashed,
        role: "STUDENT",
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Student user (rahul@example.com / Rahul123)");
  } else {
    console.log("ℹ️ Student user already exists");
  }
  let studentProfile = await prisma.student.findUnique({ where: { userId: studentUser.id } });
  if (!studentProfile) {
    studentProfile = await prisma.student.create({
      data: {
        userId: studentUser.id,
        studentId: "STU_001",
        semester: 1,
        courseId: course.id,
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Student profile (rahul@example.com)");
  }

  // 5. Create default Teacher
  console.log("👨‍🏫 Seeding Teacher account...");
  const teacherEmail = "teacher@example.com";
  let teacherUser = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacherUser) {
    const hashed = await bcrypt.hash("Password123", 12);
    teacherUser = await prisma.user.create({
      data: {
        name: "Faculty Teacher",
        email: teacherEmail,
        password: hashed,
        role: "TEACHER",
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Teacher user (teacher@example.com / Password123)");
  } else {
    console.log("ℹ️ Teacher user already exists");
  }
  let teacherProfile = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacherProfile) {
    teacherProfile = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        departmentId: cseDept.id,
        schoolId: demoSchool.id,
      },
    });
    console.log("✅ Created Teacher profile (teacher@example.com)");
  }

  // 6. Create default Subject
  console.log("📚 Seeding Subject...");
  let subject = await prisma.subject.findFirst({ where: { code: "CS101", schoolId: demoSchool.id } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: "Introduction to Computer Science",
        code: "CS101",
        courseId: course.id,
        teacherId: teacherProfile.id,
        schoolId: demoSchool.id,
      },
    });
    console.log(`✅ Created Subject: ${subject.name} (Code: ${subject.code})`);
  } else {
    console.log(`ℹ️ Subject already exists: ${subject.name}`);
  }

  // 7. Create default Super Admin
  console.log("👑 Seeding Super Admin account...");
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperPassword123";
  let superUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superUser) {
    const hashed = await bcrypt.hash(superAdminPassword, 12);
    superUser = await prisma.user.create({
      data: {
        name: "Super Administrator",
        email: superAdminEmail,
        password: hashed,
        role: "SUPER_ADMIN",
        schoolId: demoSchool.id,
      },
    });
    console.log(`✅ Created Super Admin user (${superAdminEmail} / [env password])`);
  } else {
    console.log(`ℹ️ Super Admin user already exists: ${superAdminEmail}`);
  }

  // 8. Link Super Admin to School Owner
  if (!demoSchool.ownerId) {
    demoSchool = await prisma.school.update({
      where: { id: demoSchool.id },
      data: {
        ownerId: superUser.id,
      },
    });
    console.log(`✅ Linked Super Admin (${superAdminEmail}) as owner of Demo School.`);
  }

  // 9. Seeding System Settings
  console.log("⚙️ Seeding System Settings...");
  const defaultSettings = [
    { key: "systemName", value: "EduAI Institutional Control Center" },
    { key: "maintenanceMode", value: "false" },
    { key: "allowedDomains", value: "school.com,example.com" },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("✅ System Settings initialized.");

  console.log("🎉 DATABASE SEEDING COMPLETED successfully!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
