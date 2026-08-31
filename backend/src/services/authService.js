const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const registerUser = async ({ name, email, password, role }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

const registerSchoolAndOwner = async ({ schoolName, ownerName, email, password }) => {
  // Check if email already exists globally
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("An account with this email address already exists.", 409);
  }

  // Generate URL-friendly slug
  let slug = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) {
    slug = "school";
  }

  // Handle rare duplicate slugs
  const existingSchool = await prisma.school.findUnique({
    where: { slug },
  });

  if (existingSchool) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Execute database writes inside a strict transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the School record (without ownerId initially to prevent circular foreign key issues)
    const school = await tx.school.create({
      data: {
        name: schoolName,
        slug,
      },
    });

    // 2. Create the User record (strictly overridden to role SUPER_ADMIN)
    const user = await tx.user.create({
      data: {
        name: ownerName,
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        schoolId: school.id,
      },
    });

    // 3. Update the School record to link the ownerId back to the user's ID
    const updatedSchool = await tx.school.update({
      where: { id: school.id },
      data: {
        ownerId: user.id,
      },
    });

    return {
      school: {
        id: updatedSchool.id,
        name: updatedSchool.name,
        slug: updatedSchool.slug,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  });

  return result;
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId, // Propagate schoolId context in token
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    },
    token,
  };
};

module.exports = {
  registerUser,
  registerSchoolAndOwner,
  loginUser,
};
